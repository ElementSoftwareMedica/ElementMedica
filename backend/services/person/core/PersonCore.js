import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';
import PersonUtils from '../utils/PersonUtils.js';
import PersonRoleMapping from '../utils/PersonRoleMapping.js';
import { EventBus, PersonEvents } from '../../events/index.js';
import { generateNameVariants } from '../../../utils/nameNormalization.js';
import { JWTService } from '../../../auth/jwt.js';
import { seedDefaultPermissions } from '../../enhancedRole/utils/PermissionSeeder.js';

/**
 * Operazioni CRUD principali per le persone
 */
class PersonCore {
  /**
   * Ottiene persone per ruolo
   * P48: Filtra per tenant attraverso PersonRole.tenantId (non più su Person)
   * @param {string|Array} roleType - Tipo/i di ruolo
   * @param {Object} filters - Filtri aggiuntivi (tenantId, companyTenantProfileId)
   * @returns {Promise<Array>} Array di persone
   */
  static async getPersonsByRole(roleType, filters = {}) {
    try {
      // Estrai tenantId dai filtri per applicarlo correttamente su personRoles
      const { tenantId, companyTenantProfileId, ...otherFilters } = filters;

      // P48: Costruisci il filtro per personRoles includendo tenantId
      const personRolesFilter = {
        roleType: Array.isArray(roleType) ? { in: roleType } : roleType,
        isActive: true,
        deletedAt: null
      };

      // Se c'è un tenantId, filtra per ruoli di quel tenant specifico
      if (tenantId) {
        personRolesFilter.tenantId = tenantId;
      }

      // Se c'è un companyTenantProfileId, filtra anche per quello
      if (companyTenantProfileId) {
        personRolesFilter.companyTenantProfileId = companyTenantProfileId;
      }

      const where = {
        deletedAt: null, // Escludi i record eliminati (soft delete)
        personRoles: {
          some: personRolesFilter
        },
        ...otherFilters
      };

      logger.debug('getPersonsByRole query', { roleType, tenantId, where: JSON.stringify(where) });

      // Determina l'ordinamento in base al tipo di ruolo
      let orderBy = { lastName: 'asc' };
      if (Array.isArray(roleType) && roleType.some(role => ['ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(role))) {
        orderBy = { lastLogin: 'desc' };
      }

      const persons = await prisma.person.findMany({
        where,
        include: this.getDefaultInclude(),
        orderBy
      });

      return this.addOnlineStatus(persons);
    } catch (error) {
      logger.error('Error getting persons by role:', { error: error.message, roleType });
      throw error;
    }
  }

  /**
   * Ottiene una persona per ID
   * @param {string} id - ID della persona
   * @returns {Promise<Object|null>} Persona o null se non trovata
   */
  static async getPersonById(id) {
    try {
      const person = await prisma.person.findFirst({
        where: {
          id,
          deletedAt: null // Escludi i record eliminati (soft delete)
        },
        include: this.getDefaultInclude()
      });

      if (!person) {
        return null;
      }

      // P48/P63: Trova il miglior profile da usare per il flatten
      // Priorità: 1) Profile con companyTenantProfileId, 2) Profile con isPrimary, 3) Primo profile
      const profiles = person.tenantProfiles || [];
      const profileWithCompany = profiles.find(p => p.companyTenantProfileId);
      const primaryProfile = profiles.find(p => p.isPrimary);
      const profile = profileWithCompany || primaryProfile || profiles[0] || {};

      const activeRole = person.personRoles?.find(r => r.isActive);
      const companyId = profile.companyTenantProfileId
        || activeRole?.companyTenantProfileId
        || null;

      const flattenedPerson = {
        ...person,
        email: profile.email || null,
        phone: profile.phone || null,
        pec: profile.pec || null,
        status: profile.status || 'PENDING',
        title: profile.title || null,
        companyId: companyId,
        companyTenantProfileId: companyId,
        siteId: profile.siteId || null,
        repartoId: profile.repartoId || null,
        protocolloSanitarioId: profile.protocolloSanitarioId || null,
        hiredDate: profile.hiredDate || null,
        endDate: profile.endDate || null,
        hourlyRate: profile.hourlyRate || null,
        monthlyRate: profile.monthlyRate || null,
        iban: profile.iban || null,
        registerCode: profile.registerCode || null,
        registerCode2: profile.registerCode2 || null,
        specialties: profile.specialties || [],
        certifications: profile.certifications || [],
        shortDescription: profile.shortDescription || null,
        fullDescription: profile.fullDescription || null,
        notes: profile.notes || null,
        preferences: profile.preferences || null,
        residenceAddress: profile.residenceAddress || null,
        residenceCity: profile.residenceCity || null,
        postalCode: profile.postalCode || null,
        province: profile.province || null
      };

      return this.addOnlineStatus([flattenedPerson])[0];
    } catch (error) {
      logger.error('Error getting person by ID:', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Crea una nuova persona con ruolo
   * P48: Separa Person (dati globali) da PersonTenantProfile (dati tenant-specific)
   * @param {Object} data - Dati della persona
   * @param {string} roleType - Tipo di ruolo
   * @param {string} companyId - ID dell'azienda (opzionale)
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Persona creata
   */
  static async createPerson(data, roleType, companyId = null, tenantId = null) {
    try {
      // Validazione: tenantId è obbligatorio
      if (!tenantId) {
        throw new Error('TenantId is required for person creation');
      }

      const { roles, ...inputData } = data;

      // P48: Campi globali su Person
      const PERSON_GLOBAL_FIELDS = [
        'firstName', 'lastName', 'birthDate', 'birthPlace', 'birthProvince',
        'gender', 'etnia', 'taxCode', 'vatNumber', 'username', 'password',
        'gdprConsentDate', 'gdprConsentVersion', 'dataRetentionUntil', 'profileImage'
      ];

      // P48: Campi tenant-specific su PersonTenantProfile
      const PROFILE_FIELDS = [
        'email', 'phone', 'pec', 'residenceAddress', 'residenceCity',
        'postalCode', 'province', 'status', 'title', 'hiredDate', 'endDate',
        'hourlyRate', 'monthlyRate', 'iban', 'registerCode', 'registerCode2',
        'specialties', 'certifications', 'shortDescription', 'fullDescription',
        'notes', 'preferences', 'siteId', 'repartoId', 'protocolloSanitarioId'
      ];

      // Separa i dati
      const personData = {};
      const profileData = {};

      for (const key of Object.keys(inputData)) {
        if (inputData[key] === undefined) continue;
        if (PERSON_GLOBAL_FIELDS.includes(key)) {
          personData[key] = inputData[key];
        } else if (PROFILE_FIELDS.includes(key)) {
          profileData[key] = inputData[key];
        }
      }

      // Normalizza taxCode
      if (personData.taxCode) {
        personData.taxCode = personData.taxCode.toUpperCase().trim();
      }

      // Sanitize VarChar(2) field: birthProvince deve essere max 2 chars
      if (personData.birthProvince && personData.birthProvince.length > 2) {
        logger.warn('birthProvince value exceeds VarChar(2), truncating', { original: personData.birthProvince });
        personData.birthProvince = personData.birthProvince.substring(0, 2).toUpperCase();
      }

      // Normalizza email nel profile
      if (profileData.email) {
        profileData.email = profileData.email.toLowerCase().trim();
      }

      // Sanitize VarChar(2) field: province (residenza) deve essere max 2 chars
      if (profileData.province && profileData.province.length > 2) {
        logger.warn('province (residence) value exceeds VarChar(2), truncating', { original: profileData.province });
        profileData.province = profileData.province.substring(0, 2).toUpperCase();
      }

      // ===== P57: AUTO-IMPORT EXISTING PERSON =====
      // Se taxCode o vatNumber sono forniti, verifica se la Person esiste già globalmente
      // Se esiste ma NON ha profilo nel tenant corrente, auto-importa con consenso GDPR automatico per ANAGRAFICA
      if (personData.taxCode || personData.vatNumber) {
        const existingWhere = {
          deletedAt: null,
          OR: []
        };
        if (personData.taxCode) {
          existingWhere.OR.push({ taxCode: personData.taxCode });
        }
        if (personData.vatNumber) {
          existingWhere.OR.push({ vatNumber: personData.vatNumber });
        }

        const existingPerson = await prisma.person.findFirst({
          where: existingWhere,
          include: {
            tenantProfiles: {
              where: { tenantId, deletedAt: null }
            }
          }
        });

        if (existingPerson) {
          // Person esiste già - verifica se ha profilo nel tenant corrente
          if (existingPerson.tenantProfiles.length > 0) {
            // Persona esiste già nel tenant corrente - non duplicare
            throw new Error(`La persona con codice fiscale ${personData.taxCode || personData.vatNumber} esiste già in questo tenant`);
          }

          // AUTO-IMPORT: Crea profilo nel nuovo tenant senza richiedere consenso esplicito per ANAGRAFICA
          logger.info('P57 Auto-import: Person exists globally, creating profile in new tenant', {
            existingPersonId: existingPerson.id,
            taxCode: personData.taxCode,
            targetTenantId: tenantId
          });

          const mappedRoleType = PersonRoleMapping.mapRoleType(roleType);

          // Converti hiredDate nel profile da stringa a Date se necessario
          if (profileData.hiredDate && typeof profileData.hiredDate === 'string') {
            try {
              const dateStr = profileData.hiredDate.trim();
              if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                profileData.hiredDate = new Date(dateStr + 'T00:00:00.000Z');
              } else {
                profileData.hiredDate = new Date(dateStr);
              }
              if (isNaN(profileData.hiredDate.getTime())) {
                logger.warn('Invalid hiredDate provided, setting to null', { hiredDate: data.hiredDate });
                profileData.hiredDate = null;
              }
            } catch (error) {
              logger.warn('Error parsing hiredDate, setting to null', { hiredDate: data.hiredDate, error: error.message });
              profileData.hiredDate = null;
            }
          }

          // Transazione per auto-import GDPR-compliant
          const result = await prisma.$transaction(async (tx) => {
            // 1. Crea consenso GDPR automatico per ANAGRAFICA (dati pubblici/fiscali)
            // NOTA: Solo ANAGRAFICA è auto-consentita (taxCode, nome, cognome, nascita)
            await tx.personDataShareConsent.create({
              data: {
                personId: existingPerson.id,
                sourceTenantId: existingPerson.tenantProfiles?.[0]?.tenantId || tenantId,
                targetTenantId: tenantId,
                sharedDataTypes: ['ANAGRAFICA'], // Solo dati anagrafici core auto-condivisi
                consentGiven: true,
                consentDate: new Date(),
                consentMethod: 'AUTO_IMPORT_ANAGRAFICA',
                legalBasis: 'GDPR Art.6.1.b - Esecuzione contratto / Art.6.1.c - Obbligo legale (codice fiscale)'
              }
            });

            // 2. Crea PersonTenantProfile nel nuovo tenant
            const newProfile = await tx.personTenantProfile.create({
              data: {
                personId: existingPerson.id,
                tenantId,
                companyTenantProfileId: companyId,
                status: profileData.status || 'ACTIVE',
                isActive: true,
                isPrimary: false, // Profilo importato non è primario
                ...profileData
              }
            });

            // 3. Crea ruolo nel tenant
            const importedRole = await tx.personRole.create({
              data: {
                personId: existingPerson.id,
                roleType: mappedRoleType,
                isActive: true,
                isPrimary: false, // Ruolo importato non è primario
                companyTenantProfileId: companyId,
                tenantId
              }
            });
            await seedDefaultPermissions(importedRole.id, mappedRoleType, tx);

            // 4. Audit log GDPR
            await tx.gdprAuditLog.create({
              data: {
                personId: existingPerson.id,
                action: 'AUTO_IMPORT_CROSS_TENANT',
                resourceType: 'PERSON_PROFILE',
                resourceId: newProfile.id,
                dataAccessed: {
                  profileId: newProfile.id,
                  sharedDataTypes: ['ANAGRAFICA'],
                  targetTenantId: tenantId,
                  autoImport: true,
                  reason: 'Person already exists globally, auto-imported for ANAGRAFICA data'
                },
                tenantId
              }
            });

            return newProfile;
          });

          // Recupera la persona completa con il nuovo profilo
          const importedPerson = await prisma.person.findFirst({
            where: { id: existingPerson.id, deletedAt: null },
            include: this.getDefaultInclude()
          });

          // Emit event
          await EventBus.publish(PersonEvents.CREATED, {
            personId: existingPerson.id,
            firstName: existingPerson.firstName,
            lastName: existingPerson.lastName,
            email: profileData.email || null,
            roleType: mappedRoleType,
            tenantId,
            autoImported: true
          });

          logger.info('P57 Auto-import completed successfully', {
            personId: existingPerson.id,
            newProfileId: result.id,
            tenantId
          });

          return importedPerson;
        }
      }
      // ===== END P57: AUTO-IMPORT EXISTING PERSON =====

      // Converti birthDate da stringa a Date se necessario
      if (personData.birthDate && typeof personData.birthDate === 'string') {
        try {
          const dateStr = personData.birthDate.trim();
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            personData.birthDate = new Date(dateStr + 'T00:00:00.000Z');
          } else {
            personData.birthDate = new Date(dateStr);
          }
          if (isNaN(personData.birthDate.getTime())) {
            logger.warn('Invalid birthDate provided, setting to null', { birthDate: data.birthDate });
            personData.birthDate = null;
          }
        } catch (error) {
          logger.warn('Error parsing birthDate, setting to null', { birthDate: data.birthDate, error: error.message });
          personData.birthDate = null;
        }
      }

      // Converti hiredDate nel profile da stringa a Date se necessario
      if (profileData.hiredDate && typeof profileData.hiredDate === 'string') {
        try {
          const dateStr = profileData.hiredDate.trim();
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            profileData.hiredDate = new Date(dateStr + 'T00:00:00.000Z');
          } else {
            profileData.hiredDate = new Date(dateStr);
          }
          if (isNaN(profileData.hiredDate.getTime())) {
            logger.warn('Invalid hiredDate provided, setting to null', { hiredDate: data.hiredDate });
            profileData.hiredDate = null;
          }
        } catch (error) {
          logger.warn('Error parsing hiredDate, setting to null', { hiredDate: data.hiredDate, error: error.message });
          profileData.hiredDate = null;
        }
      }

      // Genera username automatico se non fornito
      if (!personData.username && personData.firstName && personData.lastName) {
        personData.username = await PersonUtils.generateUniqueUsername(
          personData.firstName,
          personData.lastName,
          async (username) => {
            const existing = await prisma.person.findFirst({ where: { username, deletedAt: null } }); // F246: findFirst+deletedAt
            return !!existing;
          }
        );
      }

      // Imposta password di default se non fornita e hash della password
      // IMPORTANTE: Salviamo la password in chiaro per poterla comunicare all'utente
      let plainTextPassword = null;
      if (!personData.password) {
        plainTextPassword = PersonUtils.generateTemporaryPassword();
        personData.password = plainTextPassword;
      } else {
        // Se la password è stata fornita, la consideriamo temporanea solo se non è già hashata
        if (!personData.password.startsWith('$2')) {
          plainTextPassword = personData.password;
        }
      }

      // Hash della password se presente e non già hashata
      if (personData.password && !personData.password.startsWith('$2')) {
        const bcrypt = await import('bcrypt');
        personData.password = await bcrypt.default.hash(personData.password, 12);
      }

      // Mappa il ruolo se necessario
      const mappedRoleType = PersonRoleMapping.mapRoleType(roleType);

      // P48: Crea Person con PersonTenantProfile nested
      // P63: Person.tenantId RIMOSSO - tenantId va SOLO su personRoles e tenantProfiles
      const createData = {
        ...personData,
        // Flag per forzare cambio password al primo accesso
        mustChangePassword: plainTextPassword !== null,
        personRoles: {
          create: {
            roleType: mappedRoleType,
            isActive: true,
            isPrimary: true,
            companyTenantProfileId: companyId, // P49: companyId è ora companyTenantProfileId
            tenantId
          }
        },
        // P48: Crea PersonTenantProfile con dati tenant-specific
        tenantProfiles: {
          create: {
            tenantId,
            companyTenantProfileId: companyId, // P49: companyId è ora companyTenantProfileId
            status: profileData.status || 'ACTIVE',
            isActive: true,
            isPrimary: true,
            ...profileData
          }
        }
      };

      const createdPerson = await prisma.person.create({
        data: createData,
        include: this.getDefaultInclude()
      });

      // P48: Email viene da tenantProfiles per evento
      const primaryProfile = createdPerson.tenantProfiles?.[0] || {};

      // Project 47 - Emit domain event for notification system
      await EventBus.publish(PersonEvents.CREATED, {
        personId: createdPerson.id,
        firstName: createdPerson.firstName,
        lastName: createdPerson.lastName,
        email: primaryProfile.email || null,
        roleType: mappedRoleType,
        tenantId
      });

      // Restituisce la persona creata con la password temporanea in chiaro (se generata)
      // La password in chiaro serve per comunicarla all'utente (email o scheda stampabile)
      // NON viene mai salvata in chiaro nel database
      return {
        ...createdPerson,
        _temporaryPassword: plainTextPassword // Prefisso _ indica campo non persistente
      };
    } catch (error) {
      logger.error('Error creating person:', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Aggiorna una persona
   * P48: Separa Person (dati globali) da PersonTenantProfile (dati tenant-specific)
   * @param {string} id - ID della persona
   * @param {Object} data - Dati da aggiornare
   * @param {string} tenantId - ID del tenant per aggiornare il profilo corretto (opzionale)
   * @returns {Promise<Object>} Persona aggiornata
   */
  static async updatePerson(id, data, tenantId = null) {
    try {
      const { roles, ...inputData } = data;

      // P48: Campi globali su Person
      const PERSON_GLOBAL_FIELDS = [
        'firstName', 'lastName', 'birthDate', 'birthPlace', 'birthProvince',
        'gender', 'taxCode', 'vatNumber', 'username', 'password',
        'gdprConsentDate', 'gdprConsentVersion', 'dataRetentionUntil', 'profileImage',
        'lastLogin', 'failedAttempts', 'lockedUntil'
      ];

      // P48/P49: Campi tenant-specific su PersonTenantProfile
      // NOTA: companyTenantProfileId (P49) sostituisce companyId deprecato
      const PROFILE_FIELDS = [
        'email', 'phone', 'pec', 'residenceAddress', 'residenceCity',
        'postalCode', 'province', 'status', 'title', 'hiredDate', 'endDate',
        'hourlyRate', 'monthlyRate', 'iban', 'registerCode', 'registerCode2',
        'specialties', 'certifications', 'companyTenantProfileId', 'siteId', 'repartoId',
        'shortDescription', 'fullDescription', 'notes', 'preferences', 'protocolloSanitarioId'
      ];

      // P49: Mappa companyId legacy a companyTenantProfileId
      if (inputData.companyId && !inputData.companyTenantProfileId) {
        inputData.companyTenantProfileId = inputData.companyId;
        delete inputData.companyId;
      }

      // Separa i dati
      const personUpdateData = {};
      const profileUpdateData = {};

      for (const key of Object.keys(inputData)) {
        if (inputData[key] === undefined) continue;
        if (PERSON_GLOBAL_FIELDS.includes(key)) {
          personUpdateData[key] = inputData[key];
        } else if (PROFILE_FIELDS.includes(key)) {
          profileUpdateData[key] = inputData[key];
        }
      }

      // Hash della password se presente e non è già hashata
      if (personUpdateData.password && !personUpdateData.password.startsWith('$2')) {
        const bcrypt = await import('bcrypt');
        personUpdateData.password = await bcrypt.default.hash(personUpdateData.password, 12);
      }

      // Normalizza email
      if (profileUpdateData.email) {
        profileUpdateData.email = profileUpdateData.email.toLowerCase().trim();
      }

      // Normalizza taxCode
      if (personUpdateData.taxCode) {
        personUpdateData.taxCode = personUpdateData.taxCode.toUpperCase().trim();
      }

      // Converti campi data se sono stringhe
      if (personUpdateData.birthDate && typeof personUpdateData.birthDate === 'string') {
        personUpdateData.birthDate = new Date(personUpdateData.birthDate);
      }
      if (profileUpdateData.hiredDate && typeof profileUpdateData.hiredDate === 'string') {
        profileUpdateData.hiredDate = new Date(profileUpdateData.hiredDate);
      }
      if (profileUpdateData.hourlyRate !== undefined) {
        profileUpdateData.hourlyRate = parseFloat(profileUpdateData.hourlyRate) || null;
      }

      // Converti stringhe vuote in null per campi FK opzionali
      const NULLABLE_FK_FIELDS = ['protocolloSanitarioId', 'companyTenantProfileId', 'siteId', 'repartoId'];
      for (const fk of NULLABLE_FK_FIELDS) {
        if (profileUpdateData[fk] === '' || profileUpdateData[fk] === null) {
          profileUpdateData[fk] = null;
        }
      }

      // Valida FK references prima della transazione
      if (profileUpdateData.companyTenantProfileId) {
        const company = await prisma.companyTenantProfile.findFirst({
          where: { id: profileUpdateData.companyTenantProfileId, deletedAt: null },
          select: { id: true }
        });
        if (!company) {
          const err = new Error('Azienda non trovata o non appartiene al tenant corrente');
          err.code = 'FK_VALIDATION';
          err.field = 'companyTenantProfileId';
          throw err;
        }
      }
      if (profileUpdateData.protocolloSanitarioId) {
        const protocollo = await prisma.protocolloSanitario.findUnique({
          where: { id: profileUpdateData.protocolloSanitarioId },
          select: { id: true }
        });
        if (!protocollo) {
          const err = new Error('Protocollo sanitario non trovato');
          err.code = 'FK_VALIDATION';
          err.field = 'protocolloSanitarioId';
          throw err;
        }
      }
      if (profileUpdateData.siteId) {
        const site = await prisma.companySite.findUnique({
          where: { id: profileUpdateData.siteId },
          select: { id: true }
        });
        if (!site) {
          const err = new Error('Sede non trovata');
          err.code = 'FK_VALIDATION';
          err.field = 'siteId';
          throw err;
        }
      }
      if (profileUpdateData.repartoId) {
        const reparto = await prisma.reparto.findUnique({
          where: { id: profileUpdateData.repartoId },
          select: { id: true }
        });
        if (!reparto) {
          const err = new Error('Reparto non trovato');
          err.code = 'FK_VALIDATION';
          err.field = 'repartoId';
          throw err;
        }
      }

      // Track if password is being changed
      const passwordChanged = !!inputData.password;

      // P48: Transazione per aggiornare Person e PersonTenantProfile
      const result = await prisma.$transaction(async (tx) => {
        // Aggiorna Person se ci sono campi globali
        let updatedPerson;
        if (Object.keys(personUpdateData).length > 0) {
          updatedPerson = await tx.person.update({
            where: { id },
            data: {
              ...personUpdateData,
              updatedAt: new Date()
            }
          });
        }

        // Aggiorna PersonTenantProfile se ci sono campi tenant-specific
        if (Object.keys(profileUpdateData).length > 0) {
          // Trova il profilo per questo tenant o il profilo primario
          const existingProfile = await tx.personTenantProfile.findFirst({
            where: {
              personId: id,
              deletedAt: null,
              ...(tenantId ? { tenantId } : { isPrimary: true })
            }
          });

          if (existingProfile) {
            await tx.personTenantProfile.update({
              where: { id: existingProfile.id },
              data: {
                ...profileUpdateData,
                updatedAt: new Date()
              }
            });
          } else if (tenantId) {
            // Crea nuovo profilo per questo tenant se non esiste
            await tx.personTenantProfile.create({
              data: {
                personId: id,
                tenantId,
                status: 'ACTIVE',
                isActive: true,
                isPrimary: false,
                ...profileUpdateData
              }
            });
          }
        }

        // Ritorna la persona aggiornata con tutti gli include
        return await tx.person.findFirst({ // F246: findFirst+deletedAt
          where: { id, deletedAt: null },
          include: PersonCore.getDefaultInclude()
        });
      });

      // Project 47 - Emit domain event if password was changed
      if (passwordChanged) {
        const primaryProfile = result.tenantProfiles?.[0] || {};
        await EventBus.publish(PersonEvents.PASSWORD_CHANGED, {
          personId: result.id,
          email: primaryProfile.email || null,
          firstName: result.firstName,
          lastName: result.lastName,
          tenantId: primaryProfile.tenantId || null
        });
      }

      return result;
    } catch (error) {
      logger.error('Error updating person:', { error: error.message, id, data });
      throw error;
    }
  }

  /**
   * Soft delete di una persona
   * P48: status è ora su PersonTenantProfile
   * P58: con ownership check e GDPR logging
   * @param {string} id - ID della persona
   * @param {Object} options - Opzioni eliminazione
   * @param {string} options.tenantId - Tenant ID per ownership check
   * @param {string} options.deletedBy - Person ID che sta eliminando
   * @param {string} options.deletionReason - Motivo eliminazione (GDPR)
   * @returns {Promise<Object>} Persona eliminata
   */
  static async deletePerson(id, options = {}) {
    const { tenantId, deletedBy, deletionReason } = options;

    try {
      // P58: Verifica esistenza e ownership
      const existing = await prisma.person.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tenantProfiles: {
            where: { deletedAt: null },
            select: { tenantId: true }
          }
        }
      });

      if (!existing) {
        throw new Error('Person not found');
      }

      // P58: Verifica ownership - la persona deve avere un profilo nel tenant del richiedente
      if (tenantId) {
        const hasProfileInTenant = existing.tenantProfiles.some(p => p.tenantId === tenantId);
        if (!hasProfileInTenant) {
          throw new Error('NOT_OWNER: Non sei il proprietario di questa persona. Solo il tenant owner può eliminarla.');
        }
      }

      // P58+P73: Transazione per soft delete SOLO il profilo del tenant richiedente.
      // La Person globale viene eliminata SOLO se non restano profili attivi in altri tenant.
      return await prisma.$transaction(async (tx) => {
        // 1. Soft delete SOLO il profilo del tenant richiedente
        if (tenantId) {
          await tx.personTenantProfile.updateMany({
            where: {
              personId: id,
              tenantId: tenantId,
              deletedAt: null
            },
            data: {
              status: 'INACTIVE',
              isActive: false,
              deletedAt: new Date()
            }
          });
        }

        // 2. Controlla se restano profili attivi in altri tenant
        const remainingActiveProfiles = await tx.personTenantProfile.count({
          where: {
            personId: id,
            deletedAt: null,
            isActive: true
          }
        });

        // 3. Soft delete la Person globale SOLO se nessun profilo attivo rimane
        let deletedPerson;
        if (remainingActiveProfiles === 0) {
          deletedPerson = await tx.person.update({
            where: { id },
            data: { deletedAt: new Date() }
          });

          // Revoca TUTTI i consent cross-tenant solo quando eliminiamo globalmente
          await tx.personDataShareConsent.updateMany({
            where: {
              personId: id,
              isRevoked: false
            },
            data: {
              isRevoked: true,
              revokedAt: new Date(),
              revokedBy: deletedBy || 'system',
              revokedReason: deletionReason || 'Tutti i profili tenant eliminati'
            }
          });
        } else {
          // La persona rimane attiva globalmente, revoca solo i consent dove questo tenant è source
          deletedPerson = await tx.person.findUnique({ where: { id } });
          if (tenantId) {
            await tx.personDataShareConsent.updateMany({
              where: {
                personId: id,
                sourceTenantId: tenantId,
                isRevoked: false
              },
              data: {
                isRevoked: true,
                revokedAt: new Date(),
                revokedBy: deletedBy || 'system',
                revokedReason: deletionReason || 'Profilo tenant eliminato'
              }
            });
          }
        }

        // 4. GDPR Audit Log
        if (tenantId && deletedBy) {
          await tx.gdprAuditLog.create({
            data: {
              personId: id,
              action: 'DELETE',
              resourceType: 'PersonTenantProfile',
              resourceId: id,
              tenantId: tenantId,
              dataAccessed: {
                personName: `${existing.firstName || ''} ${existing.lastName || ''}`.trim(),
                deletionReason: deletionReason || 'Eliminazione persona dal tenant',
                deletedAt: new Date().toISOString(),
                deletedBy: deletedBy,
                operation: 'TENANT_PROFILE_SOFT_DELETE',
                globalPersonDeleted: remainingActiveProfiles === 0,
                remainingActiveProfiles
              }
            }
          });
        }

        return deletedPerson;
      });
    } catch (error) {
      logger.error('Error deleting person:', { error: error.message, id, tenantId });
      throw error;
    }
  }

  /**
   * Ripristina una persona eliminata (soft delete)
   * P48: status è ora su PersonTenantProfile
   * @param {string} id - ID della persona da ripristinare
   * @returns {Promise<Object>} Persona ripristinata
   */
  static async restorePerson(id) {
    try {
      // P48: Transazione per ripristinare Person e profili
      return await prisma.$transaction(async (tx) => {
        // Ripristina la persona
        const restoredPerson = await tx.person.update({
          where: { id },
          data: {
            deletedAt: null,
            updatedAt: new Date()
          }
        });

        // P48: Ripristina tutti i profili tenant con status ACTIVE
        await tx.personTenantProfile.updateMany({
          where: {
            personId: id
          },
          data: {
            status: 'ACTIVE',
            isActive: true,
            deletedAt: null,
            updatedAt: new Date()
          }
        });

        return restoredPerson;
      });
    } catch (error) {
      logger.error('Error restoring person:', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Elimina più persone con ownership check e GDPR logging
   * P58: Solo il tenant owner può eliminare, delegati possono solo revocare consent
   * 
   * @param {Array} personIds - Array di ID delle persone
   * @param {Object} options - Opzioni eliminazione
   * @param {string} options.tenantId - Tenant ID per ownership check
   * @param {string} options.deletedBy - Person ID che sta eliminando
   * @param {string} options.deletionReason - Motivo eliminazione (GDPR)
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  static async deleteMultiplePersons(personIds, options = {}) {
    const { tenantId, deletedBy, deletionReason } = options;

    try {
      // Normalizza input: rimuovi falsy, deduplica
      const uniqueIds = Array.from(new Set((personIds || []).filter(Boolean)));

      const results = {
        deleted: 0,
        skipped: 0,
        errors: []
      };

      if (uniqueIds.length === 0) {
        return results;
      }

      // P58: Recupera persone con i loro profili tenant per ownership check
      const existing = await prisma.person.findMany({
        where: {
          id: { in: uniqueIds },
          deletedAt: null
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tenantProfiles: {
            where: { deletedAt: null },
            select: { tenantId: true }
          }
        }
      });

      if (existing.length === 0) {
        for (const missingId of uniqueIds) {
          results.errors.push({ personId: missingId, error: 'Person not found or already deleted' });
        }
        return results;
      }

      // P58: Separa persone che l'utente può eliminare (owner) da quelle che non può (delegato)
      const canDelete = [];
      const cannotDelete = [];

      for (const person of existing) {
        // Una persona può essere eliminata se ha un profilo nel tenant del richiedente
        const hasProfileInTenant = person.tenantProfiles.some(p => p.tenantId === tenantId);

        if (hasProfileInTenant) {
          canDelete.push(person);
        } else {
          cannotDelete.push(person);
          results.errors.push({
            personId: person.id,
            error: 'Non sei il proprietario di questa persona. Solo il tenant owner può eliminarla.',
            code: 'NOT_OWNER'
          });
        }
      }

      results.skipped = cannotDelete.length;

      if (canDelete.length === 0) {
        return results;
      }

      const idsToDelete = canDelete.map(p => p.id);

      // P58: Transazione per soft delete Person, profiles, revoca consent e GDPR audit log
      await prisma.$transaction(async (tx) => {
        // 1. Soft delete Person
        await tx.person.updateMany({
          where: { id: { in: idsToDelete } },
          data: { deletedAt: new Date() }
        });

        // 2. Soft delete e disattiva tutti i profili tenant associati
        await tx.personTenantProfile.updateMany({
          where: {
            personId: { in: idsToDelete },
            deletedAt: null
          },
          data: {
            status: 'INACTIVE',
            isActive: false,
            deletedAt: new Date()
          }
        });

        // 3. P58: Revoca automatica di TUTTI i consent cross-tenant dove questa person è condivisa
        // Quando l'owner elimina, tutti i tenant che avevano accesso perdono l'accesso
        await tx.personDataShareConsent.updateMany({
          where: {
            personId: { in: idsToDelete },
            isRevoked: false
          },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedBy: deletedBy,
            revokedReason: deletionReason || 'Owner ha eliminato i dati'
          }
        });

        // 4. P58: GDPR Audit Log per ogni persona eliminata
        const auditLogs = canDelete.map(person => ({
          personId: person.id,
          action: 'DELETE',
          resourceType: 'Person',
          resourceId: person.id,
          tenantId: tenantId,
          dataAccessed: {
            personName: `${person.firstName || ''} ${person.lastName || ''}`.trim(),
            deletionReason: deletionReason || 'Eliminazione massiva',
            deletedAt: new Date().toISOString(),
            deletedBy: deletedBy,
            bulkOperation: true,
            totalInBatch: idsToDelete.length,
            operation: 'SOFT_DELETE',
            crossTenantConsentsRevoked: true
          }
        }));

        await tx.gdprAuditLog.createMany({ data: auditLogs });
      });

      results.deleted = idsToDelete.length;

      // Segnala come errore gli ID non trovati
      const existingIds = existing.map(p => p.id);
      const missingIds = uniqueIds.filter(id => !existingIds.includes(id));
      for (const missingId of missingIds) {
        results.errors.push({ personId: missingId, error: 'Person not found' });
      }

      logger.info('Bulk person deletion completed', {
        deleted: results.deleted,
        skipped: results.skipped,
        errors: results.errors.length,
        tenantId,
        deletedBy
      });

      return results;
    } catch (error) {
      logger.error('Error deleting multiple persons:', { error: error.message, personIds, tenantId });
      throw error;
    }
  }

  /**
   * Cerca persone
   * @param {string} query - Query di ricerca
   * @param {string|Array} roleType - Tipo/i di ruolo (opzionale)
   * @param {Object} filters - Filtri aggiuntivi
   * @returns {Promise<Array>} Array di persone trovate
   */
  static async searchPersons(query, roleType = null, filters = {}) {
    try {
      const where = {
        deletedAt: null,
        OR: [
          // P53-S23: Fuzzy name matching — search all name variants (accents, apostrophes, hyphens, spaces)
          ...generateNameVariants(query).flatMap(v => [
            { firstName: { contains: v, mode: 'insensitive' } },
            { lastName: { contains: v, mode: 'insensitive' } }
          ]),
          // P48: email is on PersonTenantProfile, not Person
          { tenantProfiles: { some: { email: { contains: query, mode: 'insensitive' }, deletedAt: null } } },
          { username: { contains: query, mode: 'insensitive' } }
        ],
        ...filters
      };

      if (roleType) {
        where.personRoles = {
          some: {
            roleType: Array.isArray(roleType) ? { in: roleType } : roleType,
            isActive: true
          }
        };
      }

      const persons = await prisma.person.findMany({
        where,
        include: this.getDefaultInclude(),
        orderBy: {
          lastName: 'asc'
        }
      });

      return this.addOnlineStatus(persons);
    } catch (error) {
      logger.error('Error searching persons:', { error: error.message, query });
      throw error;
    }
  }

  /**
   * Reset password di una persona
   * @param {string} id - ID della persona
   * @returns {Promise<Object>} Password temporanea
   */
  static async resetPersonPassword(id) {
    try {
      const temporaryPassword = PersonUtils.generateTemporaryPassword();
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.default.hash(temporaryPassword, 12);

      await prisma.person.update({
        where: { id },
        data: {
          password: hashedPassword,
          mustChangePassword: true,
          updatedAt: new Date()
        }
      });

      // F309: Revoke all active refresh tokens on password reset to force re-authentication.
      // Prevents continued session access after a password change by an admin.
      try {
        await JWTService.revokeAllPersonSessions(id);
        logger.info('Revoked all sessions after password reset', { personId: id });
      } catch (revokeError) {
        // Log but don't fail the password reset if revocation fails
        logger.warn('Failed to revoke sessions after password reset', { personId: id, error: revokeError.message });
      }

      return { temporaryPassword };
    } catch (error) {
      logger.error('Error resetting person password:', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Verifica disponibilità username
   * @param {string} username - Username da verificare
   * @param {string} excludePersonId - ID persona da escludere (opzionale)
   * @returns {Promise<boolean>} True se disponibile
   */
  static async isUsernameAvailable(username, excludePersonId = null) {
    try {
      const where = {
        username,
        deletedAt: null // ✅ FIX: Exclude soft-deleted persons (GDPR compliance - allow username reuse)
      };
      if (excludePersonId) {
        where.id = { not: excludePersonId };
      }

      const existingPerson = await prisma.person.findFirst({ where });

      return !existingPerson;
    } catch (error) {
      logger.error('Error checking username availability:', { error: error.message, username });
      throw error;
    }
  }

  /**
   * Verifica disponibilità email
   * @param {string} email - Email da verificare
   * @param {string} excludePersonId - ID persona da escludere (opzionale)
   * @returns {Promise<boolean>} True se disponibile
   */
  static async isEmailAvailable(email, excludePersonId = null) {
    try {
      const where = {
        email: email.toLowerCase().trim(),
        deletedAt: null // ✅ P48: email è su PersonTenantProfile, non su Person
      };
      if (excludePersonId) {
        where.personId = { not: excludePersonId };
      }

      const existingProfile = await prisma.personTenantProfile.findFirst({ where });

      return !existingProfile;
    } catch (error) {
      logger.error('Error checking email availability:', { error: error.message, email: email?.replace(/(.{2}).*@/, '$1***@') });
      throw error;
    }
  }

  /**
   * Include di default per le query
   * P48/P49: company, site, status, email sono ora in PersonTenantProfile
   * @returns {Object} Oggetto include
   */
  static getDefaultInclude() {
    return {
      personRoles: {
        where: { isActive: true },
        include: {
          companyTenantProfile: {
            include: {
              company: { select: { id: true, ragioneSociale: true } }
            }
          },
          tenant: true
        }
      },
      // P48/P49: Include tenant profiles per dati tenant-specific
      tenantProfiles: {
        where: { deletedAt: null, isActive: true },
        include: {
          companyTenantProfile: {
            include: {
              company: { select: { id: true, ragioneSociale: true } }
            }
          },
          site: true,
          tenant: true
        }
      },
      // P63: Person.Tenant RIMOSSO - usare tenantProfiles.tenant
      personSessions: {
        where: {
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        },
        select: {
          id: true,
          lastActivityAt: true
        }
      },
      // Mansioni attive del lavoratore per la lista
      mansioni: {
        where: { isAttiva: true, deletedAt: null },
        include: {
          mansione: { select: { id: true, denominazione: true, codice: true } }
        },
        orderBy: [{ isPrimaria: 'desc' }, { dataInizio: 'desc' }],
        take: 3
      }
    };
  }

  /**
   * Aggiunge lo status online alle persone e fa il flatten dei tenantProfiles
   * P48: Estrae email, phone, companyTenantProfileId etc. dal primo tenantProfile
   * P63: Fallback su personRoles per companyTenantProfileId (dati legacy)
   * @param {Array} persons - Array di persone
   * @returns {Array} Array di persone con status online e campi flattened
   */
  static addOnlineStatus(persons) {
    return persons.map(person => {
      // P48/P63: Trova il miglior profile da usare per il flatten
      // Priorità: 1) Profile con companyTenantProfileId, 2) Profile con isPrimary, 3) Primo profile
      const profiles = person.tenantProfiles || [];
      const profileWithCompany = profiles.find(p => p.companyTenantProfileId);
      const primaryProfile = profiles.find(p => p.isPrimary);
      const profile = profileWithCompany || primaryProfile || profiles[0] || {};

      // P63: companyTenantProfileId può essere in tenantProfiles O in personRoles
      // Fallback su personRoles per dati legacy pre-P48/P49
      const activeRole = person.personRoles?.find(r => r.isActive);
      const companyId = profile.companyTenantProfileId
        || activeRole?.companyTenantProfileId
        || null;

      return {
        ...person,
        isOnline: person.personSessions && person.personSessions.length > 0,
        // P48: Campi da PersonTenantProfile al livello top per compatibilità frontend
        email: profile.email || null,
        phone: profile.phone || null,
        pec: profile.pec || null,
        status: profile.status || 'PENDING',
        title: profile.title || null,
        companyId: companyId,
        companyTenantProfileId: companyId,
        siteId: profile.siteId || null,
        repartoId: profile.repartoId || null,
        hiredDate: profile.hiredDate || null,
        endDate: profile.endDate || null,
        hourlyRate: profile.hourlyRate || null,
        monthlyRate: profile.monthlyRate || null,
        iban: profile.iban || null,
        registerCode: profile.registerCode || null,
        registerCode2: profile.registerCode2 || null,
        specialties: profile.specialties || [],
        certifications: profile.certifications || [],
        shortDescription: profile.shortDescription || null,
        fullDescription: profile.fullDescription || null,
        notes: profile.notes || null,
        preferences: profile.preferences || null,
        residenceAddress: profile.residenceAddress || null,
        residenceCity: profile.residenceCity || null,
        postalCode: profile.postalCode || null,
        province: profile.province || null
      };
    });
  }

  /**
   * Ottiene persone con paginazione e filtri (multi-tenant support)
   * @param {Object} options - Opzioni di paginazione e filtri
   * @param {string} options.tenantId - Single tenant ID filter
   * @param {string[]} options.tenantIds - Array of tenant IDs filter (multi-tenant)
   * @returns {Promise<Object>} Risultato paginato
   */
  static async getPersonsWithPagination(options = {}) {
    try {
      const {
        roleType,
        specialty,
        isActive,
        companyId,
        tenantId, // Single tenant filter
        tenantIds, // Multi-tenant filter (array)
        includeWithoutRoles, // P69: Include persons with tenant profile but no roles (permissions page)
        search,
        sortBy = 'lastLogin',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = options;

      const where = {
        deletedAt: null // Escludi i record eliminati (soft delete)
      };

      // P48: Build personRoles filter conditions
      // In P48 model, tenantId is on PersonRole, not on Person directly
      const personRolesFilter = {
        isActive: true,
        deletedAt: null
      };

      // Multi-tenancy: filter through personRoles.tenantId
      if (tenantIds && tenantIds.length > 0) {
        personRolesFilter.tenantId = { in: tenantIds };
      } else if (tenantId) {
        personRolesFilter.tenantId = tenantId;
      }

      // Filtro per ruolo
      if (roleType) {
        const trainerFamily = ['TRAINER', 'SENIOR_TRAINER', 'TRAINER_COORDINATOR', 'EXTERNAL_TRAINER'];
        // Famiglia dei ruoli "employee" (coerente con getEmployees)
        const employeeFamily = [
          'COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'DEPARTMENT_HEAD',
          'TRAINER_COORDINATOR', 'SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER',
          'EMPLOYEE', 'COMPANY_MANAGER', 'TRAINING_ADMIN', 'CLINIC_ADMIN',
          'VIEWER', 'OPERATOR', 'COORDINATOR', 'SUPERVISOR', 'GUEST',
          'CONSULTANT', 'AUDITOR'
        ];

        // P59 Fix: Supporta stringhe separate da virgola (es. "RSPP,CONSULENTE_SICUREZZA")
        let parsedRoleType = roleType;
        if (typeof roleType === 'string' && roleType.includes(',')) {
          parsedRoleType = roleType.split(',').map(r => r.trim()).filter(Boolean);
        }

        if (Array.isArray(parsedRoleType)) {
          personRolesFilter.roleType = { in: parsedRoleType };
        } else if (parsedRoleType === 'TRAINER') {
          // Interpreta 'TRAINER' come famiglia dei ruoli trainer per la vista formatori
          personRolesFilter.roleType = { in: trainerFamily };
        } else if (parsedRoleType === 'EMPLOYEE') {
          // Interpreta 'EMPLOYEE' come famiglia dei ruoli dipendenti per la vista employees
          personRolesFilter.roleType = { in: employeeFamily };
        } else {
          personRolesFilter.roleType = parsedRoleType;
        }

        // Se isActive è specificato, applicalo al ruolo
        if (typeof isActive !== 'undefined') {
          personRolesFilter.isActive = !!isActive;
        }
      }

      // P48: Apply personRoles filter if we have tenant or role conditions
      // P69: When includeWithoutRoles is true, filter by tenantProfiles instead of personRoles
      // This ensures persons without any PersonRole (e.g., doctors not yet assigned) still appear
      if (includeWithoutRoles && (personRolesFilter.tenantId) && !personRolesFilter.roleType) {
        // Filter by PersonTenantProfile OR PersonRole in this tenant
        // This ensures persons without a TenantProfile but with a role still appear
        const tenantFilter = personRolesFilter.tenantId;
        where.OR = [
          {
            tenantProfiles: {
              some: {
                tenantId: tenantFilter,
                deletedAt: null,
                isActive: true
              }
            }
          },
          {
            personRoles: {
              some: {
                tenantId: tenantFilter,
                isActive: true,
                deletedAt: null
              }
            }
          }
        ];
      } else if (personRolesFilter.tenantId || personRolesFilter.roleType) {
        where.personRoles = {
          some: personRolesFilter
        };
      }

      // Filtro per stato attivo
      if (typeof isActive !== 'undefined' && !roleType) {
        // Applica il filtro sullo status della persona SOLO quando non filtriamo per ruolo
        where.status = isActive ? 'ACTIVE' : 'INACTIVE';
      }

      // P59: Per ruoli specializzati (RSPP, MC, etc.), cerca anche nelle specialties
      // Questo permette di trovare formatori che hanno RSPP come specializzazione
      const specialtyRoleTypes = ['RSPP', 'MEDICO_COMPETENTE', 'CONSULENTE_SICUREZZA', 'TECNICO_SICUREZZA', 'ASPP', 'RLS'];
      // P59 Fix: Mapping tra roleType e possibili varianti nelle specialties
      const specialtyVariants = {
        'RSPP': ['RSPP', 'Responsabile Servizio Prevenzione', 'responsabile sicurezza'],
        'MEDICO_COMPETENTE': ['Medico del Lavoro', 'Medicina del Lavoro', 'Medico Competente'],
        'CONSULENTE_SICUREZZA': ['Consulente Sicurezza', 'consulente sicurezza'],
        'TECNICO_SICUREZZA': ['Tecnico Sicurezza', 'tecnico sicurezza'],
        'ASPP': ['ASPP', 'Addetto Servizio Prevenzione'],
        'RLS': ['RLS', 'Rappresentante Lavoratori']
      };

      // P59 Fix: Gestisce anche stringhe separate da virgola per requestedRoleTypes
      let parsedRoleTypeForSpecialty = roleType;
      if (typeof roleType === 'string' && roleType.includes(',')) {
        parsedRoleTypeForSpecialty = roleType.split(',').map(r => r.trim()).filter(Boolean);
      }
      const requestedRoleTypes = Array.isArray(parsedRoleTypeForSpecialty) ? parsedRoleTypeForSpecialty : (parsedRoleTypeForSpecialty ? [parsedRoleTypeForSpecialty] : []);
      const specialtyMatches = requestedRoleTypes.filter(r => specialtyRoleTypes.includes(r));

      // P59 Fix: Determina il tenantId effettivo per filtrare anche le specialità
      const effectiveTenantIdForSpecialty = tenantIds?.length > 0 ? tenantIds : (tenantId ? [tenantId] : null);

      if (specialtyMatches.length > 0 && where.personRoles) {
        // Build OR condition: match by roleType OR by specialties containing one of the role names
        // P59 Fix: Cerca tutte le possibili varianti delle specialties
        const specialtyConditions = [];
        for (const specialty of specialtyMatches) {
          const variants = specialtyVariants[specialty] || [specialty];
          for (const variant of variants) {
            specialtyConditions.push({
              tenantProfiles: {
                some: {
                  deletedAt: null,
                  specialties: { has: variant },
                  // P59 Fix: Filtra per tenant anche nelle specialità
                  ...(effectiveTenantIdForSpecialty && effectiveTenantIdForSpecialty.length === 1
                    ? { tenantId: effectiveTenantIdForSpecialty[0] }
                    : effectiveTenantIdForSpecialty?.length > 1
                      ? { tenantId: { in: effectiveTenantIdForSpecialty } }
                      : {})
                }
              }
            });
          }
        }

        // Create OR between roleType match and specialty match
        where.OR = [
          { personRoles: where.personRoles },
          ...specialtyConditions
        ];
        delete where.personRoles;
      }

      // Filtro per specialità specifica (AND condition)
      if (specialty) {
        const specialtyTenantFilter = {};
        if (tenantIds && tenantIds.length > 0) {
          specialtyTenantFilter.tenantId = { in: tenantIds };
        } else if (tenantId) {
          specialtyTenantFilter.tenantId = tenantId;
        }
        const specialtyFilter = {
          tenantProfiles: {
            some: {
              deletedAt: null,
              specialties: { has: specialty },
              ...specialtyTenantFilter
            }
          }
        };
        // Combina con l'OR esistente se presente, altrimenti aggiungi come AND
        if (where.OR) {
          // Aggiungi il filtro specialty come condizione AND sopra all'OR
          where.AND = [
            { OR: where.OR },
            specialtyFilter
          ];
          delete where.OR;
        } else {
          Object.assign(where, specialtyFilter);
        }
      }

      // P48/P49: Filtro per azienda tramite tenantProfiles.companyTenantProfileId
      // companyId può essere sia un CompanyTenantProfile.id che un global Company.id
      if (companyId) {
        // Risolvi: se companyId è un global Company.id, trova il CTP corrispondente
        let resolvedCtpId = companyId;
        const effectiveTenantId = tenantId || (tenantIds && tenantIds[0]);
        if (effectiveTenantId) {
          const ctp = await prisma.companyTenantProfile.findFirst({
            where: { companyId: companyId, tenantId: effectiveTenantId, deletedAt: null },
            select: { id: true }
          });
          if (ctp) {
            resolvedCtpId = ctp.id;
          }
        }
        where.tenantProfiles = {
          ...where.tenantProfiles,
          some: {
            ...(where.tenantProfiles?.some || {}),
            companyTenantProfileId: resolvedCtpId,
            deletedAt: null
          }
        };
      }

      // Filtro ricerca testuale
      // P48/P63: email ora è su tenantProfiles, non su Person
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          // P48: cerca email in tenantProfiles
          { tenantProfiles: { some: { email: { contains: search, mode: 'insensitive' }, deletedAt: null } } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Gestione speciale per ordinamento lastLogin
      let orderBy;
      if (sortBy === 'lastLogin') {
        // Prisma non supporta nulls: 'last' direttamente, usiamo un approccio diverso
        orderBy = { lastLogin: sortOrder };
      } else {
        orderBy = { [sortBy]: sortOrder };
      }

      const [persons, total] = await Promise.all([
        prisma.person.findMany({
          where,
          include: {
            ...this.getDefaultInclude(),
            // Include tutti i campi del Person model, inclusi certifications e specialties
          },
          orderBy,
          skip,
          take: parseInt(limit)
        }),
        prisma.person.count({ where })
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      return {
        persons: this.addOnlineStatus(persons),
        total,
        page: parseInt(page),
        totalPages
      };
    } catch (error) {
      logger.error('Error getting persons with pagination:', { error: error.message, options });
      throw error;
    }
  }
}

export default PersonCore;
