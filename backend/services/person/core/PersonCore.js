import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';
import PersonUtils from '../utils/PersonUtils.js';
import PersonRoleMapping from '../utils/PersonRoleMapping.js';

/**
 * Operazioni CRUD principali per le persone
 */
class PersonCore {
  /**
   * Ottiene persone per ruolo
   * @param {string|Array} roleType - Tipo/i di ruolo
   * @param {Object} filters - Filtri aggiuntivi
   * @returns {Promise<Array>} Array di persone
   */
  static async getPersonsByRole(roleType, filters = {}) {
    try {
      const where = {
        deletedAt: null, // Escludi i record eliminati (soft delete)
        personRoles: {
          some: {
            roleType: Array.isArray(roleType) ? { in: roleType } : roleType,
            isActive: true
          }
        },
        ...filters
      };
      
      // DEBUG LOG TEMPORANEO
      // Debug: getPersonsByRole chiamato
      
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

      return this.addOnlineStatus([person])[0];
    } catch (error) {
      logger.error('Error getting person by ID:', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Crea una nuova persona con ruolo
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
      
      const { roles, ...personData } = data;
      
      // Normalizza taxCode e email per consistenza
      if (personData.taxCode) {
        personData.taxCode = personData.taxCode.toUpperCase().trim();
      }
      if (personData.email) {
        personData.email = personData.email.toLowerCase().trim();
      }
      
      // Genera username automatico se non fornito
      if (!personData.username && personData.firstName && personData.lastName) {
        personData.username = await PersonUtils.generateUniqueUsername(
          personData.firstName, 
          personData.lastName,
          async (username) => {
            const existing = await prisma.person.findUnique({ where: { username } });
            return !!existing;
          }
        );
      }
      
      // Imposta password di default se non fornita e hash della password
      if (!personData.password) {
        personData.password = PersonUtils.generateTemporaryPassword();
      }
      
      // Hash della password se presente
      if (personData.password) {
        const bcrypt = await import('bcryptjs');
        personData.password = await bcrypt.default.hash(personData.password, 12);
      }
      
      // Rimuovi campi undefined per evitare errori Prisma
      Object.keys(personData).forEach(key => {
        if (personData[key] === undefined) {
          delete personData[key];
        }
      });

      // Mappa il ruolo se necessario
      const mappedRoleType = PersonRoleMapping.mapRoleType(roleType);
      
      const createData = {
        ...personData,
        tenantId, // Aggiungi tenantId direttamente ai dati della persona
        companyId, // Aggiungi companyId direttamente ai dati della persona
        personRoles: {
          create: {
            roleType: mappedRoleType,
            isActive: true,
            isPrimary: true,
            companyId,
            tenantId
          }
        }
      };

      return await prisma.person.create({
        data: createData,
        include: this.getDefaultInclude()
      });
    } catch (error) {
      logger.error('Error creating person:', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Aggiorna una persona
   * @param {string} id - ID della persona
   * @param {Object} data - Dati da aggiornare
   * @returns {Promise<Object>} Persona aggiornata
   */
  static async updatePerson(id, data) {
    try {
      const { roles, ...personData } = data;
      
      // Hash della password se presente e non è già hashata
      if (personData.password && !personData.password.startsWith('$2')) {
        const bcrypt = await import('bcryptjs');
        personData.password = await bcrypt.default.hash(personData.password, 12);
      }
      
      return await prisma.person.update({
        where: { id },
        data: {
          ...personData,
          updatedAt: new Date()
        },
        include: this.getDefaultInclude()
      });
    } catch (error) {
      logger.error('Error updating person:', { error: error.message, id, data });
      throw error;
    }
  }

  /**
   * Soft delete di una persona
   * @param {string} id - ID della persona
   * @returns {Promise<Object>} Persona aggiornata
   */
  static async deletePerson(id) {
    try {
      return await prisma.person.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'INACTIVE'
        }
      });
    } catch (error) {
      logger.error('Error deleting person:', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Ripristina una persona eliminata (soft delete)
   * @param {string} id - ID della persona da ripristinare
   * @returns {Promise<Object>} Persona ripristinata
   */
  static async restorePerson(id) {
    try {
      return await prisma.person.update({
        where: { id },
        data: {
          deletedAt: null,
          status: 'ACTIVE',
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error restoring person:', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Elimina più persone
   * @param {Array} personIds - Array di ID delle persone
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  static async deleteMultiplePersons(personIds) {
    try {
      const results = {
        deleted: 0,
        errors: []
      };
      
      for (const personId of personIds) {
        try {
          await this.deletePerson(personId);
          results.deleted++;
        } catch (error) {
          results.errors.push({
            personId,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error deleting multiple persons:', { error: error.message, personIds });
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
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
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
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash(temporaryPassword, 12);
      
      await prisma.person.update({
        where: { id },
        data: {
          password: hashedPassword,
          passwordResetRequired: true,
          updatedAt: new Date()
        }
      });

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
  static async checkUsernameAvailability(username, excludePersonId = null) {
    try {
      const where = { username };
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
  static async checkEmailAvailability(email, excludePersonId = null) {
    try {
      const where = { email };
      if (excludePersonId) {
        where.id = { not: excludePersonId };
      }
      
      const existingPerson = await prisma.person.findFirst({ where });
      
      return !existingPerson;
    } catch (error) {
      logger.error('Error checking email availability:', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Include di default per le query
   * @returns {Object} Oggetto include
   */
  static getDefaultInclude() {
    return {
      personRoles: {
        where: { isActive: true },
        include: {
          company: true,
          tenant: true
        }
      },
      company: true,
      tenant: true,
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
      }
    };
  }

  /**
   * Aggiunge lo status online alle persone
   * @param {Array} persons - Array di persone
   * @returns {Array} Array di persone con status online
   */
  static addOnlineStatus(persons) {
    return persons.map(person => ({
      ...person,
      isOnline: person.personSessions && person.personSessions.length > 0
    }));
  }

  /**
   * Ottiene dipendenti (backward compatibility)
   * @param {Object} filters - Filtri
   * @returns {Promise<Array>} Array di dipendenti
   */
  static async getEmployees(filters = {}) {
    // Secondo la gerarchia dei ruoli, gli "employees" includono tutti i ruoli
    // da COMPANY_ADMIN (Responsabile Aziendale) in giù, escludendo solo ADMIN, SUPER_ADMIN, TENANT_ADMIN
    const employeeRoleTypes = [
      'COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'DEPARTMENT_HEAD',
      'TRAINER_COORDINATOR', 'SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER',
      'EMPLOYEE', 'COMPANY_MANAGER', 'TRAINING_ADMIN', 'CLINIC_ADMIN',
      'VIEWER', 'OPERATOR', 'COORDINATOR', 'SUPERVISOR', 'GUEST', 
      'CONSULTANT', 'AUDITOR'
    ];
    return this.getPersonsByRole(employeeRoleTypes, filters);
  }

  /**
   * Ottiene formatori (backward compatibility)
   * @param {Object} filters - Filtri
   * @returns {Promise<Array>} Array di formatori
   */
  static async getTrainers(filters = {}) {
    return this.getPersonsByRole('TRAINER', filters);
  }

  /**
   * Ottiene utenti sistema (backward compatibility)
   * @param {Object} filters - Filtri
   * @returns {Promise<Array>} Array di utenti sistema
   */
  static async getSystemUsers(filters = {}) {
    try {
      const where = {
        deletedAt: null, // Escludi i record eliminati (soft delete)
        personRoles: {
          some: {
            roleType: { in: ['ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'TENANT_ADMIN'] },
            isActive: true
          }
        },
        ...filters
      };
      
      const users = await prisma.person.findMany({
        where,
        include: this.getDefaultInclude(),
        orderBy: {
          lastLogin: 'desc' // Ordina per login più recente
        }
      });

      return this.addOnlineStatus(users);
    } catch (error) {
      logger.error('Error getting system persons:', { error: error.message });
      throw error;
    }
  }

  /**
   * Ottiene persone con paginazione e filtri
   * @param {Object} options - Opzioni di paginazione e filtri
   * @returns {Promise<Object>} Risultato paginato
   */
  static async getPersonsWithPagination(options = {}) {
    try {
      const {
        roleType,
        isActive,
        companyId,
        search,
        sortBy = 'lastLogin',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = options;

      const where = {
        deletedAt: null // Escludi i record eliminati (soft delete)
      };

      // Filtro per ruolo
      if (roleType) {
        where.personRoles = {
          some: {
            roleType,
            isActive: true
          }
        };
      }

      // Filtro per stato attivo
      if (isActive !== undefined) {
        where.status = isActive ? 'ACTIVE' : 'INACTIVE';
      }

      // Filtro per azienda
      if (companyId) {
        where.companyId = companyId;
      }

      // Filtro ricerca testuale
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } }
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
          include: this.getDefaultInclude(),
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