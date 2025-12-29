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

      // Converti birthDate da stringa a Date se necessario
      if (personData.birthDate && typeof personData.birthDate === 'string') {
        try {
          // Supporta formati YYYY-MM-DD e ISO string
          const dateStr = personData.birthDate.trim();
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Formato YYYY-MM-DD: aggiungi orario per evitare problemi timezone
            personData.birthDate = new Date(dateStr + 'T00:00:00.000Z');
          } else {
            // Altri formati: usa costruttore Date standard
            personData.birthDate = new Date(dateStr);
          }

          // Verifica che la data sia valida
          if (isNaN(personData.birthDate.getTime())) {
            logger.warn('Invalid birthDate provided, setting to null', { birthDate: data.birthDate });
            personData.birthDate = null;
          }
        } catch (error) {
          logger.warn('Error parsing birthDate, setting to null', { birthDate: data.birthDate, error: error.message });
          personData.birthDate = null;
        }
      }

      // Converti hiredDate da stringa a Date se necessario
      if (personData.hiredDate && typeof personData.hiredDate === 'string') {
        try {
          const dateStr = personData.hiredDate.trim();
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            personData.hiredDate = new Date(dateStr + 'T00:00:00.000Z');
          } else {
            personData.hiredDate = new Date(dateStr);
          }

          if (isNaN(personData.hiredDate.getTime())) {
            logger.warn('Invalid hiredDate provided, setting to null', { hiredDate: data.hiredDate });
            personData.hiredDate = null;
          }
        } catch (error) {
          logger.warn('Error parsing hiredDate, setting to null', { hiredDate: data.hiredDate, error: error.message });
          personData.hiredDate = null;
        }
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

      // Lista dei campi validi nel modello Person (Prisma)
      const validPersonFields = [
        'firstName', 'lastName', 'email', 'phone', 'birthDate', 'taxCode',
        'vatNumber', 'residenceAddress', 'residenceCity', 'postalCode', 'province',
        'username', 'password', 'status', 'title', 'hiredDate', 'hourlyRate',
        'iban', 'registerCode', 'certifications', 'specialties', 'profileImage',
        'notes', 'lastLogin', 'failedAttempts', 'lockedUntil', 'globalRole',
        'tenantId', 'companyId', 'gdprConsentDate', 'gdprConsentVersion',
        'dataRetentionUntil', 'preferences', 'siteId', 'reparto', 'repartoId'
      ];

      // Filtra solo i campi validi per evitare errori Prisma
      const filteredData = {};
      for (const key of Object.keys(personData)) {
        if (validPersonFields.includes(key) && personData[key] !== undefined) {
          filteredData[key] = personData[key];
        }
      }

      // Converti campi data se sono stringhe
      if (filteredData.birthDate && typeof filteredData.birthDate === 'string') {
        filteredData.birthDate = new Date(filteredData.birthDate);
      }
      if (filteredData.hiredDate && typeof filteredData.hiredDate === 'string') {
        filteredData.hiredDate = new Date(filteredData.hiredDate);
      }
      if (filteredData.hourlyRate !== undefined) {
        filteredData.hourlyRate = parseFloat(filteredData.hourlyRate) || null;
      }

      return await prisma.person.update({
        where: { id },
        data: {
          ...filteredData,
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
      // Normalizza input: rimuovi falsy, deduplica
      const uniqueIds = Array.from(new Set((personIds || []).filter(Boolean)));

      const results = {
        deleted: 0,
        errors: []
      };

      if (uniqueIds.length === 0) {
        return results;
      }

      // Recupera gli ID effettivamente esistenti per evitare errori Prisma
      const existing = await prisma.person.findMany({
        where: {
          id: { in: uniqueIds },
          deletedAt: null // ✅ FIX: Exclude soft-deleted persons (GDPR compliance)
        },
        select: { id: true }
      });
      const existingIds = existing.map(p => p.id);

      // Esegui soft delete in blocco sugli ID trovati
      const updateResult = await prisma.person.updateMany({
        where: { id: { in: existingIds } },
        data: {
          deletedAt: new Date(),
          status: 'INACTIVE'
        }
      });

      results.deleted = updateResult.count || 0;

      // Segnala come errore gli ID non trovati
      const missingIds = uniqueIds.filter(id => !existingIds.includes(id));
      for (const missingId of missingIds) {
        results.errors.push({ personId: missingId, error: 'Person not found' });
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
        email,
        deletedAt: null // ✅ FIX: Exclude soft-deleted persons (GDPR compliance - allow email reuse)
      };
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
      site: true, // ✅ Include sede aziendale
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
    // Allinea alla famiglia di ruoli trainer usata nella paginazione
    const trainerRoleTypes = ['TRAINER', 'SENIOR_TRAINER', 'TRAINER_COORDINATOR', 'EXTERNAL_TRAINER'];
    return this.getPersonsByRole(trainerRoleTypes, filters);
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
        tenantId, // Multi-tenancy filter
        search,
        sortBy = 'lastLogin',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = options;

      const where = {
        deletedAt: null // Escludi i record eliminati (soft delete)
      };

      // Multi-tenancy: filter by tenantId when provided
      if (tenantId) {
        where.tenantId = tenantId;
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
        let roleCondition;
        if (Array.isArray(roleType)) {
          roleCondition = { in: roleType };
        } else if (roleType === 'TRAINER') {
          // Interpreta 'TRAINER' come famiglia dei ruoli trainer per la vista formatori
          roleCondition = { in: trainerFamily };
        } else if (roleType === 'EMPLOYEE') {
          // Interpreta 'EMPLOYEE' come famiglia dei ruoli dipendenti per la vista employees
          roleCondition = { in: employeeFamily };
        } else {
          roleCondition = roleType;
        }

        where.personRoles = {
          some: {
            roleType: roleCondition,
            // Se isActive è specificato, applicalo al ruolo; altrimenti default true
            isActive: (typeof isActive !== 'undefined') ? !!isActive : true
          }
        };
      }

      // Filtro per stato attivo
      if (typeof isActive !== 'undefined' && !roleType) {
        // Applica il filtro sullo status della persona SOLO quando non filtriamo per ruolo
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