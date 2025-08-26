/**
 * Analytics Routes - Statistiche e analytics per il sistema di gestione ruoli
 * 
 * Questo modulo fornisce endpoint per ottenere statistiche dettagliate
 * sui ruoli, utenti, permessi e utilizzo del sistema.
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

// Import dei middleware
import { requireAnalyticsAccess } from './middleware/auth.js';
import { logRoleOperation } from './middleware/logging.js';
import { validatePagination } from './middleware/validation.js';

// Import delle utilità
import { 
  createSuccessResponse, 
  createErrorResponse,
  createPaginationResponse,
  calculateOffset 
} from './utils/helpers.js';
import { filterUserData } from './utils/filters.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/roles/analytics/overview
 * Ottiene una panoramica generale delle statistiche del sistema
 */
router.get('/overview',
  requireAnalyticsAccess,
  logRoleOperation('GET_ANALYTICS_OVERVIEW'),
  async (req, res) => {
    try {
      const tenantId = req.tenant?.id || req.person?.tenantId;
      const { timeframe = '30d' } = req.query;

      // Calcola la data di inizio basata sul timeframe
      const now = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Statistiche generali
      const [
        totalUsers,
        activeUsers,
        totalSystemRoles,
        activeSystemRoles,
        totalCustomRoles,
        activeCustomRoles,
        totalPermissions,
        activePermissions,
        recentRoleAssignments,
        recentCustomRoleCreations
      ] = await Promise.all([
        // Utenti totali
        prisma.person.count({
          where: { tenantId }
        }),
        // Utenti attivi
        prisma.person.count({
          where: { 
            tenantId,
            isActive: true
          }
        }),
        // Ruoli di sistema totali
        prisma.role.count({
          where: { tenantId }
        }),
        // Ruoli di sistema attivi
        prisma.role.count({
          where: { 
            tenantId,
            isActive: true
          }
        }),
        // Ruoli personalizzati totali
        prisma.customRole.count({
          where: { tenantId }
        }),
        // Ruoli personalizzati attivi
        prisma.customRole.count({
          where: { 
            tenantId,
            isActive: true
          }
        }),
        // Permessi totali
        prisma.permission.count(),
        // Permessi attivi
        prisma.permission.count({
          where: { isActive: true }
        }),
        // Assegnazioni ruoli recenti
        prisma.personRole.count({
          where: {
            role: { tenantId },
            createdAt: { gte: startDate }
          }
        }),
        // Creazioni ruoli personalizzati recenti
        prisma.customRole.count({
          where: {
            tenantId,
            createdAt: { gte: startDate }
          }
        })
      ]);

      // Distribuzione utenti per ruolo di sistema
      const systemRoleDistribution = await prisma.role.findMany({
        where: { 
          tenantId,
          isActive: true
        },
        include: {
          _count: {
            select: {
              personRoles: {
                where: {
                  person: { isActive: true }
                }
              }
            }
          }
        },
        orderBy: {
          personRoles: {
            _count: 'desc'
          }
        }
      });

      // Top 5 ruoli personalizzati più utilizzati
      const topCustomRoles = await prisma.customRole.findMany({
        where: { 
          tenantId,
          isActive: true
        },
        include: {
          _count: {
            select: {
              personRoles: {
                where: {
                  person: { isActive: true }
                }
              }
            }
          }
        },
        orderBy: {
          personRoles: {
            _count: 'desc'
          }
        },
        take: 5
      });

      // Statistiche sui permessi personalizzati
      const customPermissionsStats = await prisma.personPermission.groupBy({
        by: ['permissionId'],
        where: {
          person: { 
            tenantId,
            isActive: true
          }
        },
        _count: {
          personId: true
        },
        orderBy: {
          _count: {
            personId: 'desc'
          }
        },
        take: 10
      });

      // Ottieni i dettagli dei permessi più utilizzati
      const topPermissionIds = customPermissionsStats.map(stat => stat.permissionId);
      const topPermissions = await prisma.permission.findMany({
        where: {
          id: { in: topPermissionIds },
          isActive: true
        }
      });

      const topPermissionsWithStats = customPermissionsStats.map(stat => {
        const permission = topPermissions.find(p => p.id === stat.permissionId);
        return {
          permission: permission ? {
            id: permission.id,
            name: permission.name,
            resource: permission.resource,
            action: permission.action
          } : null,
          userCount: stat._count.personId
        };
      }).filter(item => item.permission !== null);

      // Trend delle assegnazioni negli ultimi giorni
      const trendDays = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const dailyAssignments = [];
      
      for (let i = trendDays - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const [systemRoleAssignments, customRoleAssignments] = await Promise.all([
          prisma.personRole.count({
            where: {
              role: { tenantId },
              createdAt: {
                gte: startOfDay,
                lte: endOfDay
              }
            }
          }),
          prisma.personRole.count({
            where: {
              customRole: { tenantId },
              createdAt: {
                gte: startOfDay,
                lte: endOfDay
              }
            }
          })
        ]);

        dailyAssignments.push({
          date: startOfDay.toISOString().split('T')[0],
          systemRoleAssignments,
          customRoleAssignments,
          total: systemRoleAssignments + customRoleAssignments
        });
      }

      const overview = {
        summary: {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers
          },
          systemRoles: {
            total: totalSystemRoles,
            active: activeSystemRoles,
            inactive: totalSystemRoles - activeSystemRoles
          },
          customRoles: {
            total: totalCustomRoles,
            active: activeCustomRoles,
            inactive: totalCustomRoles - activeCustomRoles
          },
          permissions: {
            total: totalPermissions,
            active: activePermissions,
            inactive: totalPermissions - activePermissions
          }
        },
        recentActivity: {
          timeframe,
          roleAssignments: recentRoleAssignments,
          customRoleCreations: recentCustomRoleCreations
        },
        distribution: {
          systemRoles: systemRoleDistribution.map(role => ({
            roleType: role.roleType,
            name: role.name,
            userCount: role._count.personRoles
          })),
          topCustomRoles: topCustomRoles.map(role => ({
            id: role.id,
            name: role.name,
            userCount: role._count.personRoles
          })),
          topCustomPermissions: topPermissionsWithStats
        },
        trends: {
          dailyAssignments,
          timeframe
        }
      };

      logger.info('Analytics overview retrieved', {
        tenantId,
        requesterId: req.person?.id,
        timeframe,
        totalUsers,
        totalSystemRoles,
        totalCustomRoles
      });

      res.json(createSuccessResponse(overview, 'Analytics overview retrieved successfully'));

    } catch (error) {
      logger.error('Error retrieving analytics overview', {
        error: error.message,
        stack: error.stack,
        tenantId: req.tenant?.id || req.person?.tenantId,
        requesterId: req.person?.id,
        query: req.query
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve analytics overview',
        error.message
      ));
    }
  }
);

/**
 * GET /api/roles/analytics/users
 * Ottiene statistiche dettagliate sugli utenti
 */
router.get('/users',
  validatePagination,
  requireAnalyticsAccess,
  logRoleOperation('GET_USER_ANALYTICS'),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50,
        sortBy = 'totalRoles',
        sortOrder = 'desc',
        minRoles,
        maxRoles,
        hasCustomPermissions
      } = req.query;
      
      const offset = calculateOffset(page, limit);
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Query per ottenere utenti con statistiche sui ruoli
      const users = await prisma.person.findMany({
        where: {
          tenantId,
          isActive: true
        },
        include: {
          personRoles: {
            include: {
              role: true,
              customRole: true
            }
          },
          personPermissions: {
            include: {
              permission: true
            }
          }
        },
        skip: offset,
        take: parseInt(limit)
      });

      const totalCount = await prisma.person.count({
        where: {
          tenantId,
          isActive: true
        }
      });

      // Trasforma e filtra i dati
      let userStats = users.map(user => {
        const systemRoles = user.personRoles.filter(pr => !pr.customRoleId).length;
        const customRoles = user.personRoles.filter(pr => pr.customRoleId).length;
        const totalRoles = systemRoles + customRoles;
        const customPermissions = user.personPermissions.length;

        return {
          user: filterUserData(user),
          stats: {
            systemRoles,
            customRoles,
            totalRoles,
            customPermissions,
            lastRoleAssignment: Math.max(
              ...user.personRoles.map(pr => new Date(pr.createdAt).getTime()),
              0
            )
          },
          roles: {
            system: user.personRoles.filter(pr => !pr.customRoleId).map(pr => ({
              roleType: pr.role.roleType,
              name: pr.role.name,
              assignedAt: pr.createdAt
            })),
            custom: user.personRoles.filter(pr => pr.customRoleId).map(pr => ({
              id: pr.customRole.id,
              name: pr.customRole.name,
              assignedAt: pr.createdAt
            }))
          },
          permissions: user.personPermissions.map(pp => ({
            name: pp.permission.name,
            resource: pp.permission.resource,
            action: pp.permission.action,
            assignedAt: pp.createdAt
          }))
        };
      });

      // Applica filtri
      if (minRoles !== undefined) {
        userStats = userStats.filter(u => u.stats.totalRoles >= parseInt(minRoles));
      }
      if (maxRoles !== undefined) {
        userStats = userStats.filter(u => u.stats.totalRoles <= parseInt(maxRoles));
      }
      if (hasCustomPermissions !== undefined) {
        const hasCustomPerms = hasCustomPermissions === 'true';
        userStats = userStats.filter(u => (u.stats.customPermissions > 0) === hasCustomPerms);
      }

      // Ordina i risultati
      userStats.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'totalRoles':
            aValue = a.stats.totalRoles;
            bValue = b.stats.totalRoles;
            break;
          case 'systemRoles':
            aValue = a.stats.systemRoles;
            bValue = b.stats.systemRoles;
            break;
          case 'customRoles':
            aValue = a.stats.customRoles;
            bValue = b.stats.customRoles;
            break;
          case 'customPermissions':
            aValue = a.stats.customPermissions;
            bValue = b.stats.customPermissions;
            break;
          case 'name':
            aValue = a.user.name || '';
            bValue = b.user.name || '';
            break;
          default:
            aValue = a.stats.totalRoles;
            bValue = b.stats.totalRoles;
        }

        if (typeof aValue === 'string') {
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });

      // Calcola statistiche aggregate
      const aggregateStats = {
        totalUsers: userStats.length,
        averageRolesPerUser: userStats.length > 0 
          ? userStats.reduce((sum, u) => sum + u.stats.totalRoles, 0) / userStats.length 
          : 0,
        usersWithCustomPermissions: userStats.filter(u => u.stats.customPermissions > 0).length,
        usersWithMultipleRoles: userStats.filter(u => u.stats.totalRoles > 1).length,
        usersWithOnlySystemRoles: userStats.filter(u => u.stats.systemRoles > 0 && u.stats.customRoles === 0).length,
        usersWithOnlyCustomRoles: userStats.filter(u => u.stats.customRoles > 0 && u.stats.systemRoles === 0).length,
        usersWithBothRoleTypes: userStats.filter(u => u.stats.systemRoles > 0 && u.stats.customRoles > 0).length
      };

      logger.info('User analytics retrieved', {
        tenantId,
        requesterId: req.person?.id,
        totalUsers: userStats.length,
        filters: { minRoles, maxRoles, hasCustomPermissions },
        pagination: { page, limit }
      });

      const paginationResponse = createPaginationResponse(
        userStats,
        totalCount,
        page,
        limit
      );

      res.json(createSuccessResponse({
        ...paginationResponse,
        aggregateStats,
        filters: {
          minRoles,
          maxRoles,
          hasCustomPermissions,
          sortBy,
          sortOrder
        }
      }, 'User analytics retrieved successfully'));

    } catch (error) {
      logger.error('Error retrieving user analytics', {
        error: error.message,
        stack: error.stack,
        tenantId: req.tenant?.id || req.person?.tenantId,
        requesterId: req.person?.id,
        query: req.query
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve user analytics',
        error.message
      ));
    }
  }
);

/**
 * GET /api/roles/analytics/permissions
 * Ottiene statistiche sui permessi e il loro utilizzo
 */
router.get('/permissions',
  requireAnalyticsAccess,
  logRoleOperation('GET_PERMISSION_ANALYTICS'),
  async (req, res) => {
    try {
      const tenantId = req.tenant?.id || req.person?.tenantId;
      const { resource, includeInactive = 'false' } = req.query;

      // Filtri base
      const permissionWhere = {
        ...(includeInactive !== 'true' && { isActive: true }),
        ...(resource && { resource })
      };

      // Ottieni tutti i permessi con statistiche di utilizzo
      const permissions = await prisma.permission.findMany({
        where: permissionWhere,
        include: {
          _count: {
            select: {
              rolePermissions: {
                where: {
                  role: { tenantId }
                }
              },
              permissions: {
                where: {
                  customRole: { tenantId }
                }
              },
              personPermissions: {
                where: {
                  person: { tenantId }
                }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      // Trasforma i dati per includere statistiche di utilizzo
      const permissionStats = permissions.map(permission => {
        const systemRoleUsage = permission._count.rolePermissions;
        const customRoleUsage = permission._count.permissions;
        const directAssignments = permission._count.personPermissions;
        const totalUsage = systemRoleUsage + customRoleUsage + directAssignments;

        return {
          permission: {
            id: permission.id,
            name: permission.name,
            resource: permission.resource,
            action: permission.action,
            description: permission.description,
            isActive: permission.isActive
          },
          usage: {
            systemRoles: systemRoleUsage,
            customRoles: customRoleUsage,
            directAssignments,
            total: totalUsage
          }
        };
      });

      // Raggruppa per risorsa
      const resourceGroups = permissionStats.reduce((groups, permStat) => {
        const resource = permStat.permission.resource;
        if (!groups[resource]) {
          groups[resource] = {
            resource,
            permissions: [],
            totalPermissions: 0,
            totalUsage: 0,
            averageUsage: 0
          };
        }
        
        groups[resource].permissions.push(permStat);
        groups[resource].totalPermissions++;
        groups[resource].totalUsage += permStat.usage.total;
        
        return groups;
      }, {});

      // Calcola medie per gruppo
      Object.values(resourceGroups).forEach(group => {
        group.averageUsage = group.totalPermissions > 0 
          ? group.totalUsage / group.totalPermissions 
          : 0;
      });

      // Statistiche generali
      const totalPermissions = permissionStats.length;
      const usedPermissions = permissionStats.filter(p => p.usage.total > 0).length;
      const unusedPermissions = totalPermissions - usedPermissions;
      const mostUsedPermissions = permissionStats
        .filter(p => p.usage.total > 0)
        .sort((a, b) => b.usage.total - a.usage.total)
        .slice(0, 10);

      const leastUsedPermissions = permissionStats
        .filter(p => p.usage.total > 0)
        .sort((a, b) => a.usage.total - b.usage.total)
        .slice(0, 10);

      const analytics = {
        summary: {
          totalPermissions,
          usedPermissions,
          unusedPermissions,
          usageRate: totalPermissions > 0 ? (usedPermissions / totalPermissions) * 100 : 0
        },
        resourceBreakdown: Object.values(resourceGroups).sort((a, b) => b.totalUsage - a.totalUsage),
        topPermissions: {
          mostUsed: mostUsedPermissions,
          leastUsed: leastUsedPermissions
        },
        unusedPermissions: permissionStats
          .filter(p => p.usage.total === 0)
          .map(p => p.permission),
        filters: {
          resource,
          includeInactive: includeInactive === 'true'
        }
      };

      logger.info('Permission analytics retrieved', {
        tenantId,
        requesterId: req.person?.id,
        totalPermissions,
        usedPermissions,
        resource
      });

      res.json(createSuccessResponse(analytics, 'Permission analytics retrieved successfully'));

    } catch (error) {
      logger.error('Error retrieving permission analytics', {
        error: error.message,
        stack: error.stack,
        tenantId: req.tenant?.id || req.person?.tenantId,
        requesterId: req.person?.id,
        query: req.query
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve permission analytics',
        error.message
      ));
    }
  }
);

export default router;