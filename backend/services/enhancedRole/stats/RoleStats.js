import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Gestione delle statistiche sui ruoli
 * Modulo estratto da EnhancedRoleService per migliorare la manutenibilità
 */

/**
 * Ottiene statistiche sui ruoli per un tenant
 */
export async function getRoleStatistics(tenantId) {
  try {
    const stats = await prisma.personRole.groupBy({
      by: ['roleType'],
      where: {
        tenantId,
        isActive: true
      },
      _count: {
        personId: true
      }
    });

    const result = {};
    stats.forEach(stat => {
      result[stat.roleType] = stat._count.personId;
    });

    return result;
  } catch (error) {
    logger.error('[ROLE_STATS] Error getting role statistics:', error);
    throw error;
  }
}

/**
 * Ottiene statistiche dettagliate sui ruoli per un tenant
 */
export async function getDetailedRoleStatistics(tenantId) {
  try {
    // Statistiche base per ruolo
    const roleStats = await getRoleStatistics(tenantId);

    // Statistiche sui ruoli attivi vs scaduti
    const activeRoles = await prisma.personRole.count({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } }
        ]
      }
    });

    const expiredRoles = await prisma.personRole.count({
      where: {
        tenantId,
        isActive: true,
        validUntil: { lt: new Date() }
      }
    });

    const inactiveRoles = await prisma.personRole.count({
      where: {
        tenantId,
        isActive: false
      }
    });

    // Statistiche sui ruoli per azienda
    const companyRoleStats = await prisma.personRole.groupBy({
      by: ['companyId', 'roleType'],
      where: {
        tenantId,
        isActive: true,
        companyId: { not: null }
      },
      _count: {
        personId: true
      }
    });

    // Organizza le statistiche per azienda
    const companiesStats = {};
    companyRoleStats.forEach(stat => {
      if (!companiesStats[stat.companyId]) {
        companiesStats[stat.companyId] = {};
      }
      companiesStats[stat.companyId][stat.roleType] = stat._count.personId;
    });

    // Ruoli assegnati di recente (ultimi 30 giorni)
    const recentRoles = await prisma.personRole.count({
      where: {
        tenantId,
        isActive: true,
        assignedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    return {
      roleDistribution: roleStats,
      summary: {
        totalActiveRoles: activeRoles,
        expiredRoles,
        inactiveRoles,
        recentAssignments: recentRoles
      },
      companiesBreakdown: companiesStats
    };
  } catch (error) {
    logger.error('[ROLE_STATS] Error getting detailed role statistics:', error);
    throw error;
  }
}

/**
 * Ottiene statistiche sui permessi più utilizzati
 */
export async function getPermissionUsageStats(tenantId) {
  try {
    // Conta i permessi dalle RolePermission
    const rolePermissionStats = await prisma.rolePermission.groupBy({
      by: ['permission'],
      where: {
        personRole: {
          tenantId,
          isActive: true
        },
        isGranted: true
      },
      _count: {
        permission: true
      },
      orderBy: {
        _count: {
          permission: 'desc'
        }
      }
    });

    // Conta i permessi dalle AdvancedPermission
    const advancedPermissionStats = await prisma.advancedPermission.groupBy({
      by: ['resource', 'action'],
      where: {
        personRole: {
          tenantId,
          isActive: true
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    return {
      rolePermissions: rolePermissionStats,
      advancedPermissions: advancedPermissionStats
    };
  } catch (error) {
    logger.error('[ROLE_STATS] Error getting permission usage stats:', error);
    throw error;
  }
}

/**
 * Ottiene statistiche sui ruoli scaduti o in scadenza
 */
export async function getExpirationStats(tenantId, daysAhead = 30) {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Ruoli già scaduti
    const expiredRoles = await prisma.personRole.findMany({
      where: {
        tenantId,
        isActive: true,
        validUntil: { lt: now }
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Ruoli in scadenza nei prossimi giorni
    const expiringRoles = await prisma.personRole.findMany({
      where: {
        tenantId,
        isActive: true,
        validUntil: {
          gte: now,
          lte: futureDate
        }
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        validUntil: 'asc'
      }
    });

    return {
      expired: expiredRoles,
      expiring: expiringRoles,
      summary: {
        expiredCount: expiredRoles.length,
        expiringCount: expiringRoles.length
      }
    };
  } catch (error) {
    logger.error('[ROLE_STATS] Error getting expiration stats:', error);
    throw error;
  }
}

/**
 * Ottiene statistiche sui ruoli per periodo temporale
 */
export async function getRoleStatsOverTime(tenantId, startDate, endDate) {
  try {
    // Ruoli assegnati nel periodo
    const assignedRoles = await prisma.personRole.groupBy({
      by: ['roleType'],
      where: {
        tenantId,
        assignedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    });

    // Ruoli rimossi nel periodo
    const removedRoles = await prisma.personRole.groupBy({
      by: ['roleType'],
      where: {
        tenantId,
        updatedAt: {
          gte: startDate,
          lte: endDate
        },
        isActive: false
      },
      _count: {
        id: true
      }
    });

    return {
      assigned: assignedRoles,
      removed: removedRoles,
      period: {
        start: startDate,
        end: endDate
      }
    };
  } catch (error) {
    logger.error('[ROLE_STATS] Error getting role stats over time:', error);
    throw error;
  }
}

/**
 * Ottiene un report completo sui ruoli per un tenant
 */
export async function getCompleteRoleReport(tenantId) {
  try {
    const [
      detailedStats,
      permissionStats,
      expirationStats,
      monthlyStats
    ] = await Promise.all([
      getDetailedRoleStatistics(tenantId),
      getPermissionUsageStats(tenantId),
      getExpirationStats(tenantId),
      getRoleStatsOverTime(
        tenantId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      )
    ]);

    return {
      overview: detailedStats,
      permissions: permissionStats,
      expirations: expirationStats,
      monthlyActivity: monthlyStats,
      generatedAt: new Date()
    };
  } catch (error) {
    logger.error('[ROLE_STATS] Error generating complete role report:', error);
    throw error;
  }
}

export default {
  getRoleStatistics,
  getDetailedRoleStatistics,
  getPermissionUsageStats,
  getExpirationStats,
  getRoleStatsOverTime,
  getCompleteRoleReport
};