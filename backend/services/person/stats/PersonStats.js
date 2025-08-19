import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';

/**
 * Gestisce le statistiche delle persone
 */
class PersonStats {
  /**
   * Ottiene le statistiche generali delle persone
   * @param {Object} filters - Filtri opzionali
   * @returns {Promise<Object>} Statistiche delle persone
   */
  static async getGeneralStats(filters = {}) {
    try {
      const baseWhere = {
        deletedAt: null,
        ...filters
      };

      const [total, active, inactive, roleStats, recentLogins] = await Promise.all([
        prisma.person.count({ where: baseWhere }),
        prisma.person.count({ 
          where: { 
            ...baseWhere, 
            status: 'ACTIVE' 
          } 
        }),
        prisma.person.count({ 
          where: { 
            ...baseWhere, 
            status: 'INACTIVE' 
          } 
        }),
        this.getRoleStats(baseWhere),
        this.getRecentLoginsCount(baseWhere)
      ]);

      return {
        total,
        active,
        inactive,
        byRole: roleStats,
        recentLogins,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error getting general person stats:', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Ottiene le statistiche per ruolo
   * @param {Object} baseWhere - Filtri base
   * @returns {Promise<Object>} Statistiche per ruolo
   */
  static async getRoleStats(baseWhere = {}) {
    try {
      const roleStats = await prisma.personRole.groupBy({
        by: ['roleType'],
        where: {
          isActive: true,
          person: baseWhere
        },
        _count: { roleType: true }
      });

      const byRole = {};
      roleStats.forEach(stat => {
        byRole[stat.roleType] = stat._count.roleType;
      });

      return byRole;
    } catch (error) {
      logger.error('Error getting role stats:', { error: error.message });
      throw error;
    }
  }

  /**
   * Ottiene il conteggio dei login recenti
   * @param {Object} baseWhere - Filtri base
   * @param {number} days - Giorni da considerare (default: 30)
   * @returns {Promise<number>} Numero di login recenti
   */
  static async getRecentLoginsCount(baseWhere = {}, days = 30) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      return await prisma.person.count({
        where: {
          ...baseWhere,
          lastLogin: {
            gte: cutoffDate
          }
        }
      });
    } catch (error) {
      logger.error('Error getting recent logins count:', { error: error.message });
      throw error;
    }
  }

  /**
   * Ottiene le statistiche di attività per periodo
   * @param {Object} options - Opzioni per il periodo
   * @returns {Promise<Object>} Statistiche di attività
   */
  static async getActivityStats(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        groupBy = 'day' // day, week, month
      } = options;

      // Ottieni persone attive nel periodo
      const activePersons = await prisma.person.findMany({
        where: {
          deletedAt: null,
          lastLogin: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          id: true,
          lastLogin: true,
          personRoles: {
            where: { isActive: true },
            select: { roleType: true }
          }
        }
      });

      // Raggruppa per periodo
      const activityByPeriod = this.groupActivityByPeriod(activePersons, groupBy);
      
      // Calcola statistiche per ruolo nel periodo
      const roleActivity = this.calculateRoleActivity(activePersons);

      return {
        period: { startDate, endDate, groupBy },
        totalActiveUsers: activePersons.length,
        activityByPeriod,
        roleActivity,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting activity stats:', { error: error.message, options });
      throw error;
    }
  }

  /**
   * Raggruppa l'attività per periodo
   * @param {Array} persons - Array di persone
   * @param {string} groupBy - Tipo di raggruppamento
   * @returns {Object} Attività raggruppata
   */
  static groupActivityByPeriod(persons, groupBy) {
    const grouped = {};

    persons.forEach(person => {
      if (!person.lastLogin) return;

      const date = new Date(person.lastLogin);
      let key;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = 0;
      }
      grouped[key]++;
    });

    return grouped;
  }

  /**
   * Calcola l'attività per ruolo
   * @param {Array} persons - Array di persone
   * @returns {Object} Attività per ruolo
   */
  static calculateRoleActivity(persons) {
    const roleActivity = {};

    persons.forEach(person => {
      person.personRoles.forEach(role => {
        if (!roleActivity[role.roleType]) {
          roleActivity[role.roleType] = 0;
        }
        roleActivity[role.roleType]++;
      });
    });

    return roleActivity;
  }

  /**
   * Ottiene le statistiche delle sessioni attive
   * @returns {Promise<Object>} Statistiche delle sessioni
   */
  static async getSessionStats() {
    try {
      const now = new Date();
      
      const [totalSessions, activeSessions, expiredSessions] = await Promise.all([
        prisma.personSession.count(),
        prisma.personSession.count({
          where: {
            isActive: true,
            expiresAt: { gt: now }
          }
        }),
        prisma.personSession.count({
          where: {
            OR: [
              { isActive: false },
              { expiresAt: { lte: now } }
            ]
          }
        })
      ]);

      // Ottieni persone online
      const onlinePersons = await prisma.person.findMany({
        where: {
          deletedAt: null,
          personSessions: {
            some: {
              isActive: true,
              expiresAt: { gt: now }
            }
          }
        },
        include: {
          personRoles: {
            where: { isActive: true },
            select: { roleType: true }
          }
        }
      });

      // Raggruppa persone online per ruolo
      const onlineByRole = {};
      onlinePersons.forEach(person => {
        person.personRoles.forEach(role => {
          if (!onlineByRole[role.roleType]) {
            onlineByRole[role.roleType] = 0;
          }
          onlineByRole[role.roleType]++;
        });
      });

      return {
        sessions: {
          total: totalSessions,
          active: activeSessions,
          expired: expiredSessions
        },
        onlineUsers: {
          total: onlinePersons.length,
          byRole: onlineByRole
        },
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting session stats:', { error: error.message });
      throw error;
    }
  }

  /**
   * Ottiene le statistiche di crescita
   * @param {number} days - Giorni da considerare
   * @returns {Promise<Object>} Statistiche di crescita
   */
  static async getGrowthStats(days = 30) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const [newUsers, newUsersByRole] = await Promise.all([
        prisma.person.count({
          where: {
            createdAt: { gte: cutoffDate },
            deletedAt: null
          }
        }),
        prisma.person.findMany({
          where: {
            createdAt: { gte: cutoffDate },
            deletedAt: null
          },
          include: {
            personRoles: {
              where: { isActive: true },
              select: { roleType: true }
            }
          }
        })
      ]);

      // Raggruppa nuovi utenti per ruolo
      const newByRole = {};
      newUsersByRole.forEach(person => {
        person.personRoles.forEach(role => {
          if (!newByRole[role.roleType]) {
            newByRole[role.roleType] = 0;
          }
          newByRole[role.roleType]++;
        });
      });

      return {
        period: `${days} giorni`,
        newUsers,
        newByRole,
        averagePerDay: Math.round(newUsers / days * 100) / 100,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting growth stats:', { error: error.message });
      throw error;
    }
  }
}

export default PersonStats;