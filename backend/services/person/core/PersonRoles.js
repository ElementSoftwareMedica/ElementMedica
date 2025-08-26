import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';
import PersonRoleMapping from '../utils/PersonRoleMapping.js';

/**
 * Gestisce i ruoli delle persone
 */
class PersonRoles {
  /**
   * Aggiunge un ruolo a una persona
   * @param {string} personId - ID della persona
   * @param {string} roleType - Tipo di ruolo
   * @param {string} companyId - ID dell'azienda (opzionale)
   * @param {string} tenantId - ID del tenant (opzionale)
   * @returns {Promise<Object>} Ruolo creato
   */
  static async addRole(personId, roleType, companyId = null, tenantId = null) {
    try {
      // Mappa il ruolo se necessario
      const mappedRoleType = PersonRoleMapping.mapRoleType(roleType);

      // Verifica se il ruolo esiste già
      const existingRole = await prisma.personRole.findFirst({
        where: {
          personId,
          roleType: mappedRoleType,
          companyId,
          tenantId,
          isActive: true
        }
      });
      
      if (existingRole) {
        throw new Error('Role already exists for this person');
      }
      
      return await prisma.personRole.create({
        data: {
          personId,
          roleType: mappedRoleType,
          isActive: true,
          companyId,
          tenantId
        },
        include: {
          person: true,
          company: true,
          tenant: true
        }
      });
    } catch (error) {
      logger.error('Error adding role:', { error: error.message, personId, roleType });
      throw error;
    }
  }

  /**
   * Rimuove un ruolo da una persona (soft delete)
   * @param {string} personId - ID della persona
   * @param {string} roleType - Tipo di ruolo
   * @param {string} companyId - ID dell'azienda (opzionale)
   * @param {string} tenantId - ID del tenant (opzionale)
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  static async removeRole(personId, roleType, companyId = null, tenantId = null) {
    try {
      const mappedRoleType = PersonRoleMapping.mapRoleType(roleType);

      return await prisma.personRole.updateMany({
        where: {
          personId,
          roleType: mappedRoleType,
          companyId,
          tenantId,
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error removing role:', { error: error.message, personId, roleType });
      throw error;
    }
  }

  /**
   * Ottiene tutti i ruoli di una persona
   * @param {string} personId - ID della persona
   * @param {boolean} activeOnly - Solo ruoli attivi (default: true)
   * @returns {Promise<Array>} Array di ruoli
   */
  static async getPersonRoles(personId, activeOnly = true) {
    try {
      const where = { personId };
      if (activeOnly) {
        where.isActive = true;
      }

      return await prisma.personRole.findMany({
        where,
        include: {
          company: true,
          tenant: true
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'asc' }
        ]
      });
    } catch (error) {
      logger.error('Error getting person roles:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Imposta un ruolo come primario
   * @param {string} personId - ID della persona
   * @param {string} roleId - ID del ruolo
   * @returns {Promise<Object>} Ruolo aggiornato
   */
  static async setPrimaryRole(personId, roleId) {
    try {
      // Prima rimuovi il flag primario da tutti gli altri ruoli
      await prisma.personRole.updateMany({
        where: {
          personId,
          isActive: true
        },
        data: {
          isPrimary: false
        }
      });

      // Poi imposta il ruolo specificato come primario
      return await prisma.personRole.update({
        where: { id: roleId },
        data: {
          isPrimary: true,
          updatedAt: new Date()
        },
        include: {
          person: true,
          company: true,
          tenant: true
        }
      });
    } catch (error) {
      logger.error('Error setting primary role:', { error: error.message, personId, roleId });
      throw error;
    }
  }

  /**
   * Ottiene il ruolo primario di una persona
   * @param {string} personId - ID della persona
   * @returns {Promise<Object|null>} Ruolo primario o null
   */
  static async getPrimaryRole(personId) {
    try {
      return await prisma.personRole.findFirst({
        where: {
          personId,
          isActive: true,
          isPrimary: true
        },
        include: {
          company: true,
          tenant: true
        }
      });
    } catch (error) {
      logger.error('Error getting primary role:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Verifica se una persona ha un ruolo specifico
   * @param {string} personId - ID della persona
   * @param {string|Array} roleType - Tipo/i di ruolo
   * @param {string} companyId - ID dell'azienda (opzionale)
   * @param {string} tenantId - ID del tenant (opzionale)
   * @returns {Promise<boolean>} True se ha il ruolo
   */
  static async hasRole(personId, roleType, companyId = null, tenantId = null) {
    try {
      const roleTypes = Array.isArray(roleType) ? roleType : [roleType];
      const mappedRoleTypes = roleTypes.map(rt => PersonRoleMapping.mapRoleType(rt));

      const where = {
        personId,
        roleType: { in: mappedRoleTypes },
        isActive: true
      };

      if (companyId) {
        where.companyId = companyId;
      }

      if (tenantId) {
        where.tenantId = tenantId;
      }

      const role = await prisma.personRole.findFirst({ where });
      return !!role;
    } catch (error) {
      logger.error('Error checking if person has role:', { 
        error: error.message, 
        personId, 
        roleType 
      });
      throw error;
    }
  }

  /**
   * Ottiene persone con un ruolo specifico
   * @param {string|Array} roleType - Tipo/i di ruolo
   * @param {Object} filters - Filtri aggiuntivi
   * @returns {Promise<Array>} Array di persone
   */
  static async getPersonsWithRole(roleType, filters = {}) {
    try {
      const roleTypes = Array.isArray(roleType) ? roleType : [roleType];
      const mappedRoleTypes = roleTypes.map(rt => PersonRoleMapping.mapRoleType(rt));

      const where = {
        roleType: { in: mappedRoleTypes },
        isActive: true,
        ...filters
      };

      return await prisma.personRole.findMany({
        where,
        include: {
          person: {
            include: {
              company: true,
              tenant: true
            }
          },
          company: true,
          tenant: true
        },
        orderBy: {
          person: {
            lastName: 'asc'
          }
        }
      });
    } catch (error) {
      logger.error('Error getting persons with role:', { error: error.message, roleType });
      throw error;
    }
  }

  /**
   * Aggiorna un ruolo esistente
   * @param {string} roleId - ID del ruolo
   * @param {Object} data - Dati da aggiornare
   * @returns {Promise<Object>} Ruolo aggiornato
   */
  static async updateRole(roleId, data) {
    try {
      return await prisma.personRole.update({
        where: { id: roleId },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          person: true,
          company: true,
          tenant: true
        }
      });
    } catch (error) {
      logger.error('Error updating role:', { error: error.message, roleId, data });
      throw error;
    }
  }

  /**
   * Ottiene statistiche dei ruoli
   * @param {Object} filters - Filtri opzionali
   * @returns {Promise<Object>} Statistiche dei ruoli
   */
  static async getRoleStats(filters = {}) {
    try {
      const where = {
        isActive: true,
        ...filters
      };

      const roleStats = await prisma.personRole.groupBy({
        by: ['roleType'],
        where,
        _count: { roleType: true }
      });

      const stats = {};
      roleStats.forEach(stat => {
        stats[stat.roleType] = stat._count.roleType;
      });

      // Aggiungi informazioni sui ruoli disponibili
      const availableRoles = PersonRoleMapping.getAllRoles();
      availableRoles.forEach(role => {
        if (!stats[role]) {
          stats[role] = 0;
        }
      });

      return {
        byRole: stats,
        totalActiveRoles: roleStats.reduce((sum, stat) => sum + stat._count.roleType, 0),
        availableRoles,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting role stats:', { error: error.message });
      throw error;
    }
  }

  /**
   * Trasferisce tutti i ruoli da una persona a un'altra
   * @param {string} fromPersonId - ID persona sorgente
   * @param {string} toPersonId - ID persona destinazione
   * @returns {Promise<Object>} Risultato del trasferimento
   */
  static async transferRoles(fromPersonId, toPersonId) {
    try {
      const rolesToTransfer = await this.getPersonRoles(fromPersonId, true);
      
      const results = {
        transferred: 0,
        errors: []
      };

      for (const role of rolesToTransfer) {
        try {
          // Disattiva il ruolo dalla persona sorgente
          await this.removeRole(fromPersonId, role.roleType, role.companyId, role.tenantId);
          
          // Aggiungi il ruolo alla persona destinazione
          await this.addRole(toPersonId, role.roleType, role.companyId, role.tenantId);
          
          results.transferred++;
        } catch (error) {
          results.errors.push({
            roleType: role.roleType,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error transferring roles:', { 
        error: error.message, 
        fromPersonId, 
        toPersonId 
      });
      throw error;
    }
  }

  /**
   * Valida un tipo di ruolo
   * @param {string} roleType - Tipo di ruolo da validare
   * @returns {Object} Risultato della validazione
   */
  static validateRoleType(roleType) {
    const mappedRole = PersonRoleMapping.mapRoleType(roleType);
    const isValid = PersonRoleMapping.isValidRole(mappedRole);
    
    return {
      isValid,
      originalRole: roleType,
      mappedRole,
      availableRoles: PersonRoleMapping.getAllRoles()
    };
  }
}

export default PersonRoles;