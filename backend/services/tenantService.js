import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcrypt';
import DefaultTemplateService from './templates/DefaultTemplateService.js';
import { seedDefaultPermissions } from './enhancedRole/utils/PermissionSeeder.js';

class TenantService {
  /**
   * Crea un nuovo tenant
   * Crea prima il record Tenant, poi la Company associata con CompanyTenantProfile
   * P68: Usa architettura multi-tenant corretta (Company → CompanyTenantProfile → Tenant)
   * P69: Accetta companyData per creare Company con tutti i dati anagrafici
   * P70: Crea Person TENANT_ADMIN + opzionali account segreteria
   */
  async createTenant(tenantData) {
    try {
      const {
        name,
        slug,
        domain,
        settings = {},
        billingPlan = 'basic',
        enabledFeatures,
        companyData = {},
        adminData,
        secretaryAccounts = []
      } = tenantData;

      // Supporta enabledFeatures sia come parametro diretto che dentro settings
      const finalFeatures = enabledFeatures || settings.enabledFeatures || ['cms', 'documents'];

      // Verifica che lo slug sia unico su Tenant (escludi soft-deleted)
      const existingTenant = await prisma.tenant.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { slug: slug },
            domain ? { domain: domain } : undefined
          ].filter(Boolean)
        }
      });

      if (existingTenant) {
        throw new Error('Tenant with this slug or domain already exists');
      }

      // Crea il tenant usando una transaction per garantire consistenza
      const result = await prisma.$transaction(async (tx) => {
        // 1. Crea il Tenant
        const tenant = await tx.tenant.create({
          data: {
            name,
            slug,
            domain: domain || null,
            settings: {
              ...settings,
              enabledFeatures: finalFeatures
            },
            billingPlan: billingPlan,
            isActive: true
          }
        });

        // 2. Crea la Company globale con tutti i dati anagrafici
        const company = await tx.company.create({
          data: {
            ragioneSociale: companyData.ragioneSociale || name,
            piva: companyData.piva || null,
            codiceFiscale: companyData.codiceFiscale || null,
            formaGiuridica: companyData.formaGiuridica || null,
            sedeLegaleIndirizzo: companyData.sedeLegaleIndirizzo || null,
            sedeLegaleCitta: companyData.sedeLegaleCitta || null,
            sedeLegaleCap: companyData.sedeLegaleCap || null,
            sedeLegaleProvincia: companyData.sedeLegaleProvincia || null,
            sdi: companyData.sdi || null,
            pecFatturazione: companyData.pecFatturazione || null
          }
        });

        // 3. Crea il CompanyTenantProfile per collegare Company ↔ Tenant
        const companyProfile = await tx.companyTenantProfile.create({
          data: {
            companyId: company.id,
            tenantId: tenant.id,
            status: 'ACTIVE',
            isActive: true,
            isPrimary: true // Questa è l'azienda principale del tenant
          }
        });

        // 4. Imposta selfCompanyProfileId sul Tenant per marcarla come "azienda propria"
        await tx.tenant.update({
          where: { id: tenant.id, deletedAt: null },
          data: { selfCompanyProfileId: companyProfile.id }
        });

        // 5. Crea Person TENANT_ADMIN (se adminData fornito)
        let adminPerson = null;
        if (adminData) {
          adminPerson = await this._createPersonForTenant(tx, tenant.id, companyProfile.id, {
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            taxCode: adminData.taxCode || null,
            email: adminData.email,
            password: adminData.password,
            username: adminData.username || adminData.email
          }, 'TENANT_ADMIN');
        }

        // 6. Crea account segreteria (opzionali)
        const secretaryPersons = [];
        for (const secretary of secretaryAccounts) {
          const secretaryPerson = await this._createPersonForTenant(tx, tenant.id, companyProfile.id, {
            firstName: secretary.firstName,
            lastName: secretary.lastName,
            taxCode: secretary.taxCode || null,
            email: secretary.email,
            password: secretary.password,
            username: secretary.username || secretary.email
          }, 'OPERATOR');
          secretaryPersons.push(secretaryPerson);
        }

        return { tenant, company, companyProfile, adminPerson, secretaryPersons };
      });

      // Crea configurazioni di default
      await this.createDefaultConfigurations(result.tenant.id);

      // Crea ruoli di default
      await this.createDefaultRoles(result.tenant.id);

      // Crea feature flags di default
      await this.createDefaultTenantFeatures(result.tenant.id, finalFeatures);

      // Crea template predefiniti (documenti, lettere, attestati, etc.)
      try {
        await DefaultTemplateService.createDefaultTemplates(result.tenant.id);
      } catch (templateError) {
        // Non bloccare la creazione del tenant se i template falliscono
        logger.error({ tenantId: result.tenant.id, error: templateError.message }, 'Template predefiniti non creati (non bloccante)');
      }

      // Ritorna il tenant con i dati della company e admin
      return {
        ...result.tenant,
        companyId: result.company.id,
        companyProfileId: result.companyProfile.id,
        selfCompanyProfileId: result.companyProfile.id,
        adminPerson: result.adminPerson ? {
          id: result.adminPerson.personId,
          email: result.adminPerson.email,
          isExisting: result.adminPerson.isExisting
        } : null,
        secretaryPersons: result.secretaryPersons.map(s => ({
          id: s.personId,
          email: s.email,
          isExisting: s.isExisting
        }))
      };
    } catch (error) {
      logger.error('Failed to create tenant', { component: 'tenantService', action: 'createTenant', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Crea o collega una Person a un tenant con un ruolo specifico.
   * P48/P49: Se la persona esiste già (per taxCode), crea solo PersonTenantProfile + PersonRole.
   * Se non esiste, crea Person + PersonTenantProfile + PersonRole.
   * @returns {{ personId, email, isExisting }} info sulla persona creata/collegata
   */
  async _createPersonForTenant(tx, tenantId, companyProfileId, personData, roleType) {
    const { firstName, lastName, taxCode, email, password, username } = personData;

    // Cerca persona esistente per taxCode (identificatore globale univoco)
    let existingPerson = null;
    if (taxCode) {
      existingPerson = await tx.person.findFirst({
        where: { taxCode, deletedAt: null }
      });
    }

    // Cerca anche per username se non trovata per taxCode
    if (!existingPerson && username) {
      existingPerson = await tx.person.findFirst({
        where: { username, deletedAt: null }
      });
    }

    let personId;
    const isExisting = !!existingPerson;

    if (existingPerson) {
      personId = existingPerson.id;

      // Verifica che non abbia già un profilo per questo tenant
      const existingProfile = await tx.personTenantProfile.findFirst({
        where: { personId, tenantId, deletedAt: null }
      });

      if (existingProfile) {
        logger.info({ personId, tenantId, roleType }, 'Person already has profile for this tenant, adding role only');

        // Aggiungi solo il ruolo se mancante
        const existingRole = await tx.personRole.findFirst({
          where: { personId, tenantId, roleType, deletedAt: null }
        });
        if (!existingRole) {
          const newRole = await tx.personRole.create({
            data: {
              personId,
              tenantId,
              roleType,
              isActive: true,
              isPrimary: roleType === 'TENANT_ADMIN'
            }
          });
          await seedDefaultPermissions(newRole.id, roleType, tx);
        }

        return { personId, email: existingProfile.email, isExisting: true };
      }
    } else {
      // Crea nuova Person
      const hashedPassword = await bcrypt.hash(password, 12);
      const newPerson = await tx.person.create({
        data: {
          firstName,
          lastName,
          taxCode: taxCode || null,
          username,
          password: hashedPassword,
          mustChangePassword: true,
          gdprConsentDate: new Date(),
          gdprConsentVersion: '1.0'
        }
      });
      personId = newPerson.id;
    }

    // Crea PersonTenantProfile per collegare Person ↔ Tenant
    await tx.personTenantProfile.create({
      data: {
        personId,
        tenantId,
        email,
        status: 'ACTIVE',
        isActive: true,
        isPrimary: true,
        companyTenantProfileId: companyProfileId
      }
    });

    // Crea PersonRole con il ruolo specificato
    const createdRole = await tx.personRole.create({
      data: {
        personId,
        tenantId,
        roleType,
        isActive: true,
        isPrimary: roleType === 'TENANT_ADMIN'
      }
    });
    await seedDefaultPermissions(createdRole.id, roleType, tx);

    logger.info({
      personId, tenantId, roleType,
      isExisting,
      action: isExisting ? 'linked_existing_person' : 'created_new_person'
    }, 'Person created/linked for tenant');

    return { personId, email, isExisting };
  }

  /**
   * Ottiene un tenant per ID
   * P63: Tenant.persons rimosso - usa personProfiles (PersonTenantProfile)
   */
  async getTenantById(tenantId) {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
        include: {
          // P63: Tenant.persons RIMOSSO - usa personProfiles invece
          personProfiles: {
            where: {
              deletedAt: null,
              isActive: true
            },
            select: {
              id: true,
              email: true,
              status: true,
              person: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          personRoles: {
            where: { isActive: true }
          }
        }
      });

      // P63: Flatten personProfiles data for backward compatibility (persons array)
      if (tenant?.personProfiles) {
        tenant.persons = tenant.personProfiles.map(profile => ({
          id: profile.person?.id,
          username: profile.person?.username,
          firstName: profile.person?.firstName,
          lastName: profile.person?.lastName,
          email: profile.email,
          status: profile.status || 'PENDING'
        }));
        delete tenant.personProfiles; // Remove nested structure, keep only persons
      }

      return tenant;
    } catch (error) {
      logger.error('Failed to get tenant', { component: 'tenantService', action: 'getTenant', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Ottiene un tenant per slug
   */
  async getTenantBySlug(slug) {
    try {
      return await prisma.tenant.findFirst({
        where: { slug, deletedAt: null }
      });
    } catch (error) {
      logger.error('Failed to get tenant by slug', { component: 'tenantService', action: 'getTenantBySlug', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Ottiene un tenant per dominio
   */
  async getTenantByDomain(domain) {
    try {
      return await prisma.tenant.findFirst({
        where: {
          domain,
          isActive: true,
          deletedAt: null
        }
      });
    } catch (error) {
      logger.error('Failed to get tenant by domain', { component: 'tenantService', action: 'getTenantByDomain', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Aggiorna un tenant
   * P69: Sincronizza anche i dati aziendali con la Company collegata
   */
  async updateTenant(tenantId, updateData) {
    try {
      const { name, slug, domain, settings, billingPlan, isActive, companyData } = updateData;

      // Verifica che slug e domain siano unici (se modificati)
      if (slug || domain) {
        const existingTenant = await prisma.tenant.findFirst({
          where: {
            deletedAt: null,
            AND: [
              { id: { not: tenantId } },
              {
                OR: [
                  slug ? { slug } : {},
                  domain ? { domain } : {}
                ].filter(condition => Object.keys(condition).length > 0)
              }
            ]
          }
        });

        if (existingTenant) {
          throw new Error('Another tenant with this slug or domain already exists');
        }
      }

      const updatePayload = {};
      if (name) updatePayload.name = name;
      if (slug) updatePayload.slug = slug;
      if (domain) updatePayload.domain = domain;
      if (billingPlan) updatePayload.billingPlan = billingPlan;
      if (typeof isActive === 'boolean') updatePayload.isActive = isActive;
      // Se si riattiva un tenant, ripristina anche deletedAt a null
      if (isActive === true) updatePayload.deletedAt = null;

      if (settings) {
        // Merge settings: le nuove settings si sovrappongono alle esistenti senza cancellare campi non inclusi
        const current = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
        updatePayload.settings = {
          ...(current?.settings || {}),
          ...settings
        };
      }

      if (Object.keys(updatePayload).length === 0) {
        throw new Error('Nessun campo da aggiornare fornito');
      }

      // P69: Use transaction to sync Tenant and Company data
      return await prisma.$transaction(async (tx) => {
        // 1. Update the Tenant (senza filtro deletedAt: gli admin possono ripristinare tenant soft-deleted)
        const updatedTenant = await tx.tenant.update({
          where: { id: tenantId },
          data: updatePayload
        });

        // 2. Sync company data if settings contain company-related fields
        if (settings || companyData) {
          // Find the primary company linked to this tenant
          const companyProfile = await tx.companyTenantProfile.findFirst({
            where: { tenantId, deletedAt: null, isPrimary: true },
            select: { companyId: true }
          });

          if (companyProfile?.companyId) {
            // Build company update payload from settings
            const companyUpdatePayload = {};
            const src = companyData || settings || {};

            // Map settings fields to company fields
            if (name && !companyData?.ragioneSociale) companyUpdatePayload.ragioneSociale = name;
            if (src.ragioneSociale) companyUpdatePayload.ragioneSociale = src.ragioneSociale;
            if (src.vatNumber || src.piva) companyUpdatePayload.piva = src.vatNumber || src.piva;
            if (src.fiscalCode || src.codiceFiscale) companyUpdatePayload.codiceFiscale = src.fiscalCode || src.codiceFiscale;
            if (src.formaGiuridica) companyUpdatePayload.formaGiuridica = src.formaGiuridica;
            if (src.address || src.sedeLegaleIndirizzo) companyUpdatePayload.sedeLegaleIndirizzo = src.address || src.sedeLegaleIndirizzo;
            if (src.city || src.sedeLegaleCitta) companyUpdatePayload.sedeLegaleCitta = src.city || src.sedeLegaleCitta;
            if (src.cap || src.sedeLegaleCap) companyUpdatePayload.sedeLegaleCap = src.cap || src.sedeLegaleCap;
            if (src.provincia || src.sedeLegaleProvincia) companyUpdatePayload.sedeLegaleProvincia = src.provincia || src.sedeLegaleProvincia;
            if (src.sdi) companyUpdatePayload.sdi = src.sdi;
            if (src.pec || src.pecFatturazione) companyUpdatePayload.pecFatturazione = src.pec || src.pecFatturazione;

            // Only update if there are fields to update
            if (Object.keys(companyUpdatePayload).length > 0) {
              // Guard: verify company still exists and is not deleted
              const companyExists = await tx.company.findFirst({
                where: { id: companyProfile.companyId, deletedAt: null },
                select: { id: true }
              });
              if (companyExists) {
                await tx.company.update({
                  where: { id: companyProfile.companyId },
                  data: companyUpdatePayload
                });

                logger.info('Synced company data with tenant settings', {
                  component: 'tenantService',
                  action: 'updateTenant',
                  tenantId,
                  companyId: companyProfile.companyId,
                  fields: Object.keys(companyUpdatePayload)
                });
              }
            }
          }
        }

        return updatedTenant;
      });
    } catch (error) {
      logger.error('Failed to update tenant', { component: 'tenantService', action: 'updateTenant', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Elimina un tenant (soft delete)
   * @param {string} tenantId - ID del tenant da eliminare
   * @param {string} deletedBy - ID della persona che esegue l'eliminazione
   */
  async deleteTenant(tenantId, deletedBy) {
    try {
      // Disattiva prima il tenant
      await prisma.tenant.update({
        where: { id: tenantId, deletedAt: null },
        data: {
          isActive: false,
          deletedAt: new Date()
        }
      });

      // P48: Disattiva i profili tenant delle persone (status è in PersonTenantProfile)
      await prisma.personTenantProfile.updateMany({
        where: { tenantId: tenantId, deletedAt: null },
        data: {
          status: 'INACTIVE',
          isActive: false,
          deletedAt: new Date()
        }
      });

      // P63: Soft delete persone che appartengono SOLO a questo tenant
      // Person.tenantId è stato RIMOSSO - usa PersonTenantProfile
      const personProfiles = await prisma.personTenantProfile.findMany({
        where: {
          tenantId: tenantId,
          deletedAt: null
        },
        select: {
          personId: true,
          person: {
            select: {
              id: true,
              deletedAt: true,
              tenantProfiles: {
                where: { deletedAt: null },
                select: { tenantId: true }
              }
            }
          }
        }
      });

      // Soft delete solo persone senza altri profili attivi
      for (const profile of personProfiles) {
        const person = profile.person;
        if (person.deletedAt) continue; // già eliminata

        const otherActiveProfiles = person.tenantProfiles.filter(p => p.tenantId !== tenantId);
        if (otherActiveProfiles.length === 0) {
          await prisma.person.update({
            where: { id: person.id, deletedAt: null },
            data: { deletedAt: new Date() }
          });

          // GDPR audit log: persona eliminata in cascata con il tenant
          await prisma.gdprAuditLog.create({
            data: {
              personId: person.id,
              tenantId,
              action: 'PERSON_DELETED_CASCADE_TENANT',
              resourceType: 'Person',
              resourceId: person.id,
              dataAccessed: {
                reason: 'Tenant deleted — person had no other active tenant profiles',
                deletedBy: deletedBy || 'system',
                tenantId
              }
            }
          });
        }
      }

      return { success: true, message: 'Tenant deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete tenant', { component: 'tenantService', action: 'deleteTenant', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Ottiene le statistiche di un tenant
   */
  async getTenantStats(tenantId) {
    try {
      // P63: Person.tenantId RIMOSSO - conta tramite PersonTenantProfile
      const [personCount, courseCount, trainerCount] = await Promise.all([
        prisma.personTenantProfile.count({
          where: { tenantId: tenantId, deletedAt: null, isActive: true }
        }),
        prisma.course.count({
          where: { tenantId: tenantId }
        }),
        prisma.personRole.count({
          where: { tenantId: tenantId, roleType: 'TRAINER', isActive: true }
        })
      ]);

      return {
        persons: personCount,
        courses: courseCount,
        trainers: trainerCount
      };
    } catch (error) {
      logger.error('Failed to get tenant stats', { component: 'tenantService', action: 'getTenantStats', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Crea configurazioni di default per un nuovo tenant
   */
  async createDefaultConfigurations(tenantId) {
    try {
      const defaultConfigs = [
        {
          tenantId: tenantId,
          config_key: 'theme',
          config_value: { theme: 'default' },
          config_type: 'ui'
        },
        {
          tenantId: tenantId,
          config_key: 'locale',
          config_value: { locale: 'it-IT' },
          config_type: 'general'
        },
        {
          tenantId: tenantId,
          config_key: 'timezone',
          config_value: { timezone: 'Europe/Rome' },
          config_type: 'general'
        },
        {
          tenantId: tenantId,
          config_key: 'max_file_size',
          config_value: { size: 10485760 }, // 10MB
          config_type: 'general'
        },
        {
          tenantId: tenantId,
          config_key: 'session_timeout',
          config_value: { timeout: 3600 }, // 1 hour
          config_type: 'security'
        }
      ];

      // Merge delle configurazioni default nelle settings esistenti
      // SENZA sovrascrivere enabledFeatures, logoUrl, branches o altri campi già configurati
      const defaultConfigMap = defaultConfigs.reduce((acc, config) => {
        acc[config.config_key] = config.config_value;
        return acc;
      }, {});

      const currentTenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const mergedSettings = {
        ...defaultConfigMap,
        ...(currentTenant?.settings || {}) // i valori esistenti vincono sui default
      };

      await prisma.tenant.update({
        where: { id: tenantId, deletedAt: null },
        data: { settings: mergedSettings }
      });

      return defaultConfigs;
    } catch (error) {
      logger.error('Failed to create default configurations', { component: 'tenantService', action: 'createDefaultConfigurations', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Crea configurazioni di ruolo di default per un nuovo tenant
   * Nota: I ruoli sono ora gestiti tramite PersonRole con RoleType enum
   */
  async createDefaultRoles(tenantId) {
    try {
      // I ruoli sono ora definiti nell'enum RoleType: ADMIN, MANAGER, EMPLOYEE, TRAINER
      // Non è più necessario creare record separati per i ruoli
      // Questa funzione ora restituisce solo la configurazione dei ruoli disponibili

      const availableRoles = [
        {
          roleType: 'ADMIN',
          description: 'Amministratore della company',
          companyId: tenantId
        },
        {
          roleType: 'MANAGER',
          description: 'Manager aziendale',
          companyId: tenantId
        },
        {
          roleType: 'TRAINER',
          description: 'Formatore',
          companyId: tenantId
        },
        {
          roleType: 'EMPLOYEE',
          description: 'Dipendente',
          companyId: tenantId
        }
      ];

      return availableRoles;
    } catch (error) {
      logger.error('Failed to create default roles', { component: 'tenantService', action: 'createDefaultRoles', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Crea i record TenantFeature di default per un nuovo tenant.
   * Mappa le feature keys richieste (o legacy) nei valori standard di FEATURE_KEYS.
   * Assegna di default BRANCH_MEDICA, BRANCH_FORMAZIONE e MDL_BASE se non specificate.
   */
  async createDefaultTenantFeatures(tenantId, requestedFeatures = []) {
    try {
      // Keys valide secondo FEATURE_KEYS enum
      const VALID_KEYS = new Set([
        'BRANCH_MEDICA', 'BRANCH_FORMAZIONE', 'BRANCH_LABORATORIO', 'BRANCH_CONSULENZA',
        'FATTURAZIONE_ELETTRONICA', 'FATTURAZIONE_PA', 'FATTURAZIONE_SPLIT_PAYMENT',
        'PEC_INTEGRATION', 'SMS_NOTIFICATIONS', 'WHATSAPP_INTEGRATION',
        'MDL_BASE', 'MDL_SORVEGLIANZA', 'MDL_ALLEGATO_3B', 'MDL_PROTOCOLLI',
        'MULTI_SEDE', 'API_ACCESS', 'WHITE_LABEL', 'SSO_INTEGRATION',
        'CUSTOM_REPORTS', 'DATA_EXPORT_ADVANCED',
        'FIRMA_GRAFOMETRICA', 'FIRMA_FEQ', 'FIRMA_FEA', 'FIRMA_REMOTA', 'FIRMA_BIOMETRICA',
        'FSE_EXPORT_CDA', 'FSE_CONSENSI_AVANZATI'
      ]);

      // Filtra solo le chiavi valide (ignora legacy come 'cms', 'documents')
      const validRequested = requestedFeatures.filter(k => VALID_KEYS.has(k));

      // Se nessuna chiave valida è stata fornita, usa le feature di default
      const featureKeys = validRequested.length > 0
        ? validRequested
        : ['BRANCH_MEDICA', 'BRANCH_FORMAZIONE', 'MDL_BASE'];

      await prisma.tenantFeature.createMany({
        data: featureKeys.map(featureKey => ({
          tenantId,
          featureKey,
          isEnabled: true,
          enabledAt: new Date()
        })),
        skipDuplicates: true
      });

      logger.info({ tenantId, featureKeys }, 'Feature flags di default create per il nuovo tenant');
    } catch (error) {
      logger.error('Failed to create default tenant features', { component: 'tenantService', action: 'createDefaultTenantFeatures', error: error.message });
      // Non bloccare la creazione del tenant se le feature flags falliscono
    }
  }

  /**
   * Verifica i limiti del piano di billing
   */
  async checkBillingLimits(tenantId) {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const stats = await this.getTenantStats(tenantId);

      const limits = {
        basic: { persons: 10, companies: 1, courses: 50 },
        professional: { persons: 50, companies: 5, courses: 200 },
        enterprise: { persons: 500, companies: 50, courses: 1000 }
      };

      const planLimits = limits[tenant.billingPlan] || limits.basic;

      return {
        plan: tenant.billingPlan,
        limits: planLimits,
        usage: stats,
        withinLimits: {
          persons: stats.persons <= planLimits.persons,
          courses: stats.courses <= planLimits.courses
        }
      };
    } catch (error) {
      logger.error('Failed to check billing limits', { component: 'tenantService', action: 'checkBillingLimits', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Lista tutti i tenant (filtrati per tenantIds se specificato)
   * @param {number} page - Numero pagina
   * @param {number} limit - Elementi per pagina
   * @param {object} filters - Filtri (tenantIds, isActive, billingPlan, search)
   */
  async listAllTenants(page = 1, limit = 20, filters = {}) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        // Multi-tenancy: filter by tenantIds if provided
        ...(filters.tenantIds && { id: { in: filters.tenantIds } }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.billingPlan && { billingPlan: filters.billingPlan }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { slug: { contains: filters.search, mode: 'insensitive' } }
          ]
        })
      };

      const [tenants, total] = await Promise.all([
        prisma.tenant.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
            billingPlan: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                personRoles: true
              }
            }
          }
        }),
        prisma.tenant.count({ where })
      ]);

      return {
        tenants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to list tenants', { component: 'tenantService', action: 'listTenants', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Verifica abbonamenti scaduti e sospende tenant senza pagamento.
   * Chiamato dal cron job giornaliero.
   */
  async checkExpiredSubscriptions() {
    const now = new Date();

    try {
      // 1. Trova tenant con abbonamento scaduto E grace period scaduto
      const expiredTenants = await prisma.tenant.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          subscriptionStatus: { in: ['active', 'past_due', 'trial'] },
          OR: [
            // Abbonamento scaduto oltre il grace period
            {
              subscriptionExpiresAt: { lt: now },
              gracePeriodUntil: { lt: now }
            },
            // Abbonamento scaduto senza grace period
            {
              subscriptionExpiresAt: { lt: now },
              gracePeriodUntil: null
            },
            // Trial scaduto
            {
              subscriptionStatus: 'trial',
              trialEndsAt: { lt: now }
            }
          ]
        },
        select: { id: true, name: true, subscriptionStatus: true, subscriptionExpiresAt: true, trialEndsAt: true }
      });

      let suspendedCount = 0;
      for (const tenant of expiredTenants) {
        const newStatus = tenant.subscriptionStatus === 'trial' ? 'cancelled' : 'suspended';
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            subscriptionStatus: newStatus,
            isActive: false
          }
        });

        logger.warn('Tenant subscription expired — suspended', {
          component: 'subscriptionCheck',
          tenantId: tenant.id,
          tenantName: tenant.name,
          previousStatus: tenant.subscriptionStatus,
          newStatus
        });
        suspendedCount++;
      }

      // 2. Trova tenant con abbonamento scaduto ma ancora in grace period → past_due
      const pastDueTenants = await prisma.tenant.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          subscriptionStatus: 'active',
          subscriptionExpiresAt: { lt: now },
          gracePeriodUntil: { gte: now }
        },
        select: { id: true, name: true, gracePeriodUntil: true }
      });

      for (const tenant of pastDueTenants) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { subscriptionStatus: 'past_due' }
        });

        logger.info('Tenant subscription past due (grace period active)', {
          component: 'subscriptionCheck',
          tenantId: tenant.id,
          tenantName: tenant.name,
          gracePeriodUntil: tenant.gracePeriodUntil
        });
      }

      // 3. Disabilita feature scadute
      const expiredFeatures = await prisma.tenantFeature.updateMany({
        where: {
          isEnabled: true,
          deletedAt: null,
          validUntil: { lt: now }
        },
        data: { isEnabled: false }
      });

      logger.info('Subscription check completed', {
        component: 'subscriptionCheck',
        suspendedTenants: suspendedCount,
        pastDueTenants: pastDueTenants.length,
        disabledFeatures: expiredFeatures.count
      });

      return { suspendedCount, pastDueTenants: pastDueTenants.length, disabledFeatures: expiredFeatures.count };
    } catch (error) {
      logger.error('Subscription check failed', { component: 'subscriptionCheck', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Rinnova l'abbonamento di un tenant.
   */
  async renewSubscription(tenantId, { billingPlan, durationMonths = 12, gracePeriodDays = 15 } = {}) {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null }
      });

      if (!tenant) throw new Error('Tenant non trovato');

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
      const gracePeriodUntil = new Date(expiresAt);
      gracePeriodUntil.setDate(gracePeriodUntil.getDate() + gracePeriodDays);

      // Aggiorna limiti in base al piano
      const planLimits = {
        basic: { maxUsers: 10, maxCompanies: 1 },
        professional: { maxUsers: 50, maxCompanies: 5 },
        enterprise: { maxUsers: 500, maxCompanies: 50 }
      };
      const limits = planLimits[billingPlan || tenant.billingPlan] || planLimits.basic;

      const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          isActive: true,
          subscriptionStatus: 'active',
          billingPlan: billingPlan || tenant.billingPlan,
          subscriptionStartDate: now,
          subscriptionExpiresAt: expiresAt,
          subscriptionRenewedAt: now,
          gracePeriodUntil,
          lastPaymentAt: now,
          maxUsers: limits.maxUsers,
          maxCompanies: limits.maxCompanies
        }
      });

      logger.info('Tenant subscription renewed', {
        component: 'subscriptionRenewal',
        tenantId,
        billingPlan: updated.billingPlan,
        expiresAt,
        gracePeriodUntil
      });

      return updated;
    } catch (error) {
      logger.error('Subscription renewal failed', { component: 'subscriptionRenewal', tenantId, error: error.message });
      throw error;
    }
  }
}

export default new TenantService();