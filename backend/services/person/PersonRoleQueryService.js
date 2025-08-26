import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

/**
 * Mappatura dei ruoli per retrocompatibilità
 */
const ROLE_MAPPING = {
  'EMPLOYEE': 'EMPLOYEE',
  'TRAINER': 'TRAINER', 
  'SYSTEM_USER': 'SYSTEM_USER',
  'ADMIN': 'ADMIN',
  'SUPER_ADMIN': 'SUPER_ADMIN',
  'MANAGER': 'MANAGER',
  'HR': 'HR',
  'VIEWER': 'VIEWER'
};

/**
 * Servizio per la gestione delle query delle persone basate sui ruoli
 * Estratto da personService.js per migliorare la modularità
 */
class PersonRoleQueryService {
  
  /**
   * Mappa il tipo di ruolo per retrocompatibilità
   * @param {string} roleType - Tipo di ruolo da mappare
   * @returns {string} - Tipo di ruolo mappato
   */
  static mapRoleType(roleType) {
    return ROLE_MAPPING[roleType] || roleType;
  }

  /**
   * Ottiene persone basandosi sul ruolo
   * @param {string} roleType - Tipo di ruolo
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di persone con il ruolo specificato
   */
  static async getPersonsByRole(roleType, options = {}) {
    try {
      const {
        includeDeleted = false,
        includeInactive = false,
        companyId = null,
        tenantId = null,
        limit = null,
        offset = 0
      } = options;

      const mappedRoleType = this.mapRoleType(roleType);
      
      const where = {
        personRoles: {
          some: {
            roleType: mappedRoleType
          }
        }
      };

      // Filtro soft delete
      if (!includeDeleted) {
        where.deletedAt = null;
      }

      // Filtro persone attive
      if (!includeInactive) {
        where.isActive = true;
      }

      // Filtro per azienda
      if (companyId) {
        where.companyId = companyId;
      }

      // Filtro per tenant
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const queryOptions = {
        where,
        include: {
          personRoles: {
            include: {
              customRole: true,
              assignedByPerson: true,
              company: true,
              tenant: true
            }
          },
          company: true,
          tenant: true,
          personSessions: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      };

      // Paginazione se specificata
      if (limit) {
        queryOptions.take = limit;
        queryOptions.skip = offset;
      }

      const persons = await prisma.person.findMany(queryOptions);

      logger.info('Retrieved persons by role:', { 
        roleType: mappedRoleType, 
        count: persons.length,
        options 
      });

      return persons;
    } catch (error) {
      logger.error('Error getting persons by role:', { 
        error: error.message, 
        roleType, 
        options 
      });
      throw error;
    }
  }

  /**
   * Ottiene dipendenti (EMPLOYEE) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di dipendenti
   */
  static async getEmployees(options = {}) {
    // Secondo la gerarchia dei ruoli, gli "employees" includono tutti i ruoli
    // da COMPANY_ADMIN (Responsabile Aziendale) in giù, escludendo solo ADMIN, SUPER_ADMIN, TENANT_ADMIN
    const employeeRoleTypes = [
      'COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'DEPARTMENT_HEAD',
      'TRAINER_COORDINATOR', 'SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER',
      'EMPLOYEE', 'COMPANY_MANAGER', 'TRAINING_ADMIN', 'CLINIC_ADMIN',
      'VIEWER', 'OPERATOR', 'COORDINATOR', 'SUPERVISOR', 'GUEST', 
      'CONSULTANT', 'AUDITOR'
    ];
    return this.getPersonsByMultipleRoles(employeeRoleTypes, options);
  }

  /**
   * Ottiene formatori (TRAINER) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di formatori
   */
  static async getTrainers(options = {}) {
    return this.getPersonsByRole('TRAINER', options);
  }

  /**
   * Ottiene utenti di sistema (SYSTEM_USER) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di utenti di sistema
   */
  static async getSystemUsers(options = {}) {
    return this.getPersonsByRole('SYSTEM_USER', options);
  }

  /**
   * Ottiene amministratori (ADMIN) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di amministratori
   */
  static async getAdmins(options = {}) {
    return this.getPersonsByRole('ADMIN', options);
  }

  /**
   * Ottiene super amministratori (SUPER_ADMIN) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di super amministratori
   */
  static async getSuperAdmins(options = {}) {
    return this.getPersonsByRole('SUPER_ADMIN', options);
  }

  /**
   * Ottiene manager (MANAGER) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di manager
   */
  static async getManagers(options = {}) {
    return this.getPersonsByRole('MANAGER', options);
  }

  /**
   * Ottiene persone HR (HR) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di persone HR
   */
  static async getHRPersons(options = {}) {
    return this.getPersonsByRole('HR', options);
  }

  /**
   * Ottiene visualizzatori (VIEWER) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di visualizzatori
   */
  static async getViewers(options = {}) {
    return this.getPersonsByRole('VIEWER', options);
  }

  /**
   * Ottiene persone con ruoli multipli
   * @param {Array<string>} roleTypes - Array di tipi di ruolo
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di persone con almeno uno dei ruoli specificati
   */
  static async getPersonsByMultipleRoles(roleTypes, options = {}) {
    try {
      const {
        includeDeleted = false,
        includeInactive = false,
        companyId = null,
        tenantId = null,
        limit = null,
        offset = 0
      } = options;

      const mappedRoleTypes = roleTypes.map(roleType => this.mapRoleType(roleType));
      
      const where = {
        personRoles: {
          some: {
            roleType: {
              in: mappedRoleTypes
            }
          }
        }
      };

      // Filtro soft delete
      if (!includeDeleted) {
        where.deletedAt = null;
      }

      // Filtro persone attive
      if (!includeInactive) {
        where.isActive = true;
      }

      // Filtro per azienda
      if (companyId) {
        where.companyId = companyId;
      }

      // Filtro per tenant
      if (tenantId) {
        where.tenantId = tenantId;
      }

      // BYPASS TEMPORANEO: Query semplificata per evitare timeout
      const queryOptions = {
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          taxCode: true,
          globalRole: true,
          companyId: true,
          tenantId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      };

      // Paginazione se specificata
      if (limit) {
        queryOptions.take = limit;
        queryOptions.skip = offset;
      }

      const persons = await prisma.person.findMany(queryOptions);

      logger.info('Retrieved persons by multiple roles:', { 
        roleTypes: mappedRoleTypes, 
        count: persons.length,
        options 
      });

      return persons;
    } catch (error) {
      logger.error('Error getting persons by multiple roles:', { 
        error: error.message, 
        roleTypes, 
        options 
      });
      throw error;
    }
  }

  /**
   * Conta persone per ruolo
   * @param {string} roleType - Tipo di ruolo
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<number>} - Numero di persone con il ruolo specificato
   */
  static async countPersonsByRole(roleType, options = {}) {
    try {
      const {
        includeDeleted = false,
        includeInactive = false,
        companyId = null,
        tenantId = null
      } = options;

      const mappedRoleType = this.mapRoleType(roleType);
      
      const where = {
        personRoles: {
          some: {
            role: {
              type: mappedRoleType
            }
          }
        }
      };

      // Filtro soft delete
      if (!includeDeleted) {
        where.deletedAt = null;
      }

      // Filtro persone attive
      if (!includeInactive) {
        where.isActive = true;
      }

      // Filtro per azienda
      if (companyId) {
        where.companyId = companyId;
      }

      // Filtro per tenant
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const count = await prisma.person.count({ where });

      logger.info('Counted persons by role:', { 
        roleType: mappedRoleType, 
        count,
        options 
      });

      return count;
    } catch (error) {
      logger.error('Error counting persons by role:', { 
        error: error.message, 
        roleType, 
        options 
      });
      throw error;
    }
  }

  /**
   * Ottiene statistiche dei ruoli
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} - Statistiche dei ruoli
   */
  static async getRoleStatistics(options = {}) {
    try {
      const {
        includeDeleted = false,
        includeInactive = false,
        companyId = null,
        tenantId = null
      } = options;

      const roleTypes = Object.values(ROLE_MAPPING);
      const statistics = {};

      for (const roleType of roleTypes) {
        statistics[roleType] = await this.countPersonsByRole(roleType, options);
      }

      // Totale persone
      const where = {};
      if (!includeDeleted) {
        where.deletedAt = null;
      }
      if (!includeInactive) {
        where.isActive = true;
      }
      if (companyId) {
        where.companyId = companyId;
      }
      if (tenantId) {
        where.tenantId = tenantId;
      }

      statistics.total = await prisma.person.count({ where });

      logger.info('Generated role statistics:', { statistics, options });

      return statistics;
    } catch (error) {
      logger.error('Error getting role statistics:', { error: error.message, options });
      throw error;
    }
  }
}

export default PersonRoleQueryService;