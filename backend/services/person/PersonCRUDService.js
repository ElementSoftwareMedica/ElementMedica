import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';
import bcrypt from 'bcrypt';

/**
 * Servizio per la gestione delle operazioni CRUD delle persone
 * Estratto da personService.js per migliorare la modularità
 */
class PersonCRUDService {

  /**
   * Ottiene una persona per ID con relazioni opzionali
   * @param {string} personId - ID della persona
   * @param {Object} options - Opzioni per includere relazioni
   * @returns {Promise<Object|null>} - Persona trovata o null
   */
  static async getPersonById(personId, options = {}) {
    try {
      const {
        includeRoles = true,
        includeCompany = true,
        includeTenant = true,
        includeSessions = false,
        includeDeleted = false
      } = options;

      const where = { id: personId };
      if (!includeDeleted) {
        where.deletedAt = null;
      }

      const include = {};
      if (includeRoles) {
        include.personRoles = {
          include: {
            customRole: true,
            assignedByPerson: true,
            companyTenantProfile: true, // P49: company -> companyTenantProfile
            tenant: true
          }
        };
      }
      // P49: Person non ha più relazione company diretta
      // Usare tenantProfiles con companyTenantProfile
      if (includeCompany) {
        include.tenantProfiles = {
          where: { deletedAt: null, isActive: true },
          include: {
            companyTenantProfile: true,
            site: true,
            tenant: true
          }
        };
      }
      if (includeTenant) {
        include.Tenant = true;
      }
      if (includeSessions) {
        include.personSessions = {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' }
        };
      }

      // F225: findFirst instead of findUnique — where may include deletedAt which is non-unique
      const person = await prisma.person.findFirst({
        where,
        include
      });

      if (!person) {
        logger.warn('Person not found:', { personId });
        return null;
      }

      return person;
    } catch (error) {
      logger.error('Error getting person by ID:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Crea una nuova persona
   * @param {Object} personData - Dati della persona da creare
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} - Persona creata
   */
  static async createPerson(personData, options = {}) {
    try {
      const { hashPassword = true, generateUsername = true } = options;

      const data = { ...personData };

      // Hash della password se presente
      if (data.password && hashPassword) {
        data.password = await bcrypt.hash(data.password, 12);
      }

      // Genera username se richiesto e non presente
      if (generateUsername && !data.username) {
        data.username = await this.generateUniqueUsername(data.firstName, data.lastName);
      }

      // Imposta valori di default
      data.isActive = data.isActive !== undefined ? data.isActive : true;
      data.createdAt = new Date();
      data.updatedAt = new Date();

      const person = await prisma.person.create({
        data,
        include: {
          personRoles: {
            include: {
              customRole: true,
              assignedByPerson: true,
              companyTenantProfile: true, // P49: company -> companyTenantProfile
              tenant: true
            }
          },
          // P63: Person.Tenant RIMOSSO - usare tenantProfiles.tenant
          tenantProfiles: {
            where: { deletedAt: null, isActive: true },
            include: {
              companyTenantProfile: true,
              site: true,
              tenant: true
            }
          }
        }
      });

      // P48: Extract email from tenantProfiles for logging
      const primaryProfile = person.tenantProfiles?.find(p => p.isPrimary) || person.tenantProfiles?.[0] || {};

      logger.info('Person created successfully:', {
        personId: person.id,
        username: person.username,
        email: primaryProfile.email || null
      });

      return person;
    } catch (error) {
      logger.error('Error creating person:', { error: error.message, personData: { ...personData, password: '[HIDDEN]' } });
      throw error;
    }
  }

  /**
   * Aggiorna una persona esistente
   * @param {string} personId - ID della persona da aggiornare
   * @param {Object} updateData - Dati da aggiornare
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} - Persona aggiornata
   */
  static async updatePerson(personId, updateData, options = {}) {
    try {
      const { hashPassword = true } = options;

      const data = { ...updateData };

      // Hash della password se presente
      if (data.password && hashPassword) {
        data.password = await bcrypt.hash(data.password, 12);
      }

      // Aggiorna timestamp
      data.updatedAt = new Date();

      const person = await prisma.person.update({
        where: { id: personId },
        data,
        include: {
          personRoles: {
            include: {
              customRole: true,
              assignedByPerson: true,
              companyTenantProfile: true, // P49: company -> companyTenantProfile
              tenant: true
            }
          },
          // P63: Person.Tenant RIMOSSO - usare tenantProfiles.tenant
          tenantProfiles: {
            where: { deletedAt: null, isActive: true },
            include: {
              companyTenantProfile: true,
              site: true,
              tenant: true
            }
          }
        }
      });

      logger.info('Person updated successfully:', {
        personId: person.id,
        updatedFields: Object.keys(updateData)
      });

      return person;
    } catch (error) {
      logger.error('Error updating person:', { error: error.message, personId, updateData: { ...updateData, password: '[HIDDEN]' } });
      throw error;
    }
  }

  /**
   * Soft delete di una persona
   * @param {string} personId - ID della persona da eliminare
   * @returns {Promise<Object>} - Persona eliminata
   */
  static async softDeletePerson(personId) {
    try {
      const person = await prisma.person.update({
        where: { id: personId },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
          isActive: false
        }
      });

      logger.info('Person soft deleted successfully:', { personId });
      return person;
    } catch (error) {
      logger.error('Error soft deleting person:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Ripristina una persona eliminata (soft delete)
   * @param {string} personId - ID della persona da ripristinare
   * @returns {Promise<Object>} - Persona ripristinata
   */
  static async restorePerson(personId) {
    try {
      const person = await prisma.person.update({
        where: { id: personId },
        data: {
          deletedAt: null,
          updatedAt: new Date(),
          isActive: true
        }
      });

      logger.info('Person restored successfully:', { personId });
      return person;
    } catch (error) {
      logger.error('Error restoring person:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * DEPRECATED: Hard delete non è GDPR compliant per PII.
   * Usare softDeletePerson() invece.
   * 
   * Questo metodo è mantenuto solo per cleanup di test data o casi eccezionali
   * dove è richiesto GdprAuditLog con deletionReason.
   * 
   * @deprecated Usare softDeletePerson() per conformità GDPR
   * @param {string} personId - ID della persona da eliminare definitivamente
   * @param {string} tenantId - ID del tenant (obbligatorio per GDPR audit)
   * @param {string} deletionReason - Motivo eliminazione (min 10 char, obbligatorio)
   * @param {string} requesterId - ID della persona che richiede la cancellazione
   * @returns {Promise<Object>} - Persona eliminata
   * @throws {Error} Se deletionReason mancante o troppo corto
   */
  static async hardDeletePerson(personId, tenantId, deletionReason, requesterId) {
    // GDPR: Validazione parametri obbligatori
    if (!tenantId) {
      throw new Error('GDPR: tenantId obbligatorio per hard delete');
    }
    if (!deletionReason || deletionReason.length < 10) {
      throw new Error('GDPR: deletionReason obbligatorio (minimo 10 caratteri)');
    }
    if (!requesterId) {
      throw new Error('GDPR: requesterId obbligatorio per audit trail');
    }

    try {
      // Prima recupera i dati PII per l'audit log
      // F225: findFirst with deletedAt:null — person exists until we soft-delete it
      const personData = await prisma.person.findFirst({
        where: { id: personId, deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tenantProfiles: {
            where: { tenantId },
            select: { email: true, phone: true }
          }
        }
      });

      if (!personData) {
        throw new Error('Person non trovata');
      }

      // GDPR: Audit log PRIMA della cancellazione
      await prisma.gdprAuditLog.create({
        data: {
          personId: requesterId,
          action: 'HARD_DELETE_PII',
          resourceType: 'Person',
          resourceId: personId,
          dataAccessed: {
            deletionReason,
            piiFields: ['firstName', 'lastName', 'email', 'phone'],
            snapshotAt: new Date().toISOString(),
            targetPersonName: `${personData.firstName} ${personData.lastName}`
          },
          tenantId
        }
      });

      // Prima elimina le relazioni
      await prisma.personRole.deleteMany({
        where: { personId }
      });

      await prisma.personSession.deleteMany({
        where: { personId }
      });

      // Poi elimina la persona
      const person = await prisma.person.delete({
        where: { id: personId }
      });

      logger.warn('Person hard deleted (GDPR audit logged):', {
        personId,
        requesterId,
        reason: deletionReason.substring(0, 50) // Non loggare tutto il motivo per sicurezza
      });
      return person;
    } catch (error) {
      logger.error('Error hard deleting person:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Genera un username unico basato su nome e cognome
   * @param {string} firstName - Nome
   * @param {string} lastName - Cognome
   * @returns {Promise<string>} - Username unico generato
   */
  static async generateUniqueUsername(firstName, lastName) {
    try {
      if (!firstName || !lastName) {
        throw new Error('Nome e cognome sono richiesti per generare username');
      }

      // Normalizza nome e cognome
      const normalizedFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
      const normalizedLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');

      // Base username: nome.cognome — VarChar(50), riserva 3 chars per suffisso ".N"
      const MAX_BASE = 47;
      const rawBase = `${normalizedFirstName}.${normalizedLastName}`;
      const baseUsername = rawBase.length > MAX_BASE ? rawBase.substring(0, MAX_BASE) : rawBase;
      let username = baseUsername;
      let counter = 1;

      // Verifica unicità e aggiungi numero se necessario
      while (true) {
        const existingPerson = await prisma.person.findFirst({
          where: { username }
        });

        if (!existingPerson) {
          break;
        }

        const suffix = String(counter);
        username = `${baseUsername.substring(0, MAX_BASE - suffix.length)}${suffix}`;
        counter++;
      }

      logger.info('Generated unique username:', { username, firstName, lastName });
      return username;
    } catch (error) {
      logger.error('Error generating unique username:', { error: error.message, firstName, lastName });
      throw error;
    }
  }

  /**
   * Ottiene persone con paginazione e filtri
   * @param {Object} filters - Filtri di ricerca
   * @param {Object} pagination - Opzioni di paginazione
   * @returns {Promise<Object>} - Risultato con persone e metadati
   */
  static async getPersonsWithPagination(filters = {}, pagination = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = pagination;

      const {
        search,
        roleType,
        companyId,
        tenantId,
        isActive,
        includeDeleted = false
      } = filters;

      const where = {};

      // Filtro soft delete
      if (!includeDeleted) {
        where.deletedAt = null;
      }

      // P48: Filtro ricerca testuale - email è in tenantProfiles
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { taxCode: { contains: search, mode: 'insensitive' } },
          // P48: Cerca email in tenantProfiles
          {
            tenantProfiles: {
              some: {
                email: { contains: search, mode: 'insensitive' },
                deletedAt: null
              }
            }
          }
        ];
      }

      // Filtro per ruolo
      if (roleType) {
        where.personRoles = {
          some: {
            roleType: roleType
          }
        };
      }

      // Filtro per azienda - P48: companyId è in tenantProfiles
      if (companyId) {
        where.tenantProfiles = {
          ...(where.tenantProfiles || {}),
          some: {
            companyId,
            deletedAt: null
          }
        };
      }

      // Filtro per tenant - P48: tenant è in tenantProfiles
      if (tenantId) {
        where.tenantProfiles = {
          ...(where.tenantProfiles || {}),
          some: {
            tenantId,
            deletedAt: null
          }
        };
      }

      // P48: Filtro per stato attivo è in tenantProfiles
      if (isActive !== undefined) {
        where.tenantProfiles = {
          ...(where.tenantProfiles || {}),
          some: {
            status: isActive ? 'ACTIVE' : 'INACTIVE',
            deletedAt: null
          }
        };
      }

      const skip = (page - 1) * limit;

      // P48: Include tenantProfiles per ottenere email/phone/status
      const [personsRaw, total] = await Promise.all([
        prisma.person.findMany({
          where,
          include: {
            personRoles: {
              include: {
                customRole: true,
                assignedByPerson: true,
                companyTenantProfile: true, // P49: company -> companyTenantProfile
                tenant: true
              }
            },
            tenantProfiles: {
              where: {
                deletedAt: null,
                ...(tenantId ? { tenantId } : {})
              },
              include: {
                companyTenantProfile: true,
                site: true,
                tenant: true
              },
              take: 1
            }
            // P63: Person.Tenant RIMOSSO
          },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder }
        }),
        prisma.person.count({ where })
      ]);

      // P48: Flatten tenantProfiles per backward compatibility
      const persons = personsRaw.map(p => {
        const profile = p.tenantProfiles?.[0] || {};
        return {
          ...p,
          email: profile.email || null,
          phone: profile.phone || null,
          status: profile.status || 'PENDING',
          title: profile.title || null,
          companyId: profile.companyId || null,
          siteId: profile.siteId || null,
          hiredDate: profile.hiredDate || null,
          hourlyRate: profile.hourlyRate || null,
          specialties: profile.specialties || [],
          certifications: profile.certifications || [],
          residenceCity: profile.residenceCity || null
        };
      });

      const totalPages = Math.ceil(total / limit);

      return {
        persons,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting persons with pagination:', { error: error.message, filters, pagination });
      throw error;
    }
  }
}

export default PersonCRUDService;