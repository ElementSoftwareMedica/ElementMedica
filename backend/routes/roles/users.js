/**
 * Users Routes - Gestione degli utenti per ruolo
 * 
 * Questo modulo gestisce le operazioni relative agli utenti e ai loro ruoli,
 * inclusa la visualizzazione degli utenti per ruolo e la gestione dei permessi personalizzati.
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

// Import dei middleware
import { requireUserAccess, requireRoleManagement } from './middleware/auth.js';
import { logRoleOperation, auditRoleChanges } from './middleware/logging.js';
import { 
  validatePagination,
  validateRouteId,
  validateUserPermissions 
} from './middleware/validation.js';

// Import delle utilità
import { 
  createSuccessResponse, 
  createErrorResponse,
  createPaginationResponse,
  calculateOffset 
} from './utils/helpers.js';
import { filterUserData } from './utils/filters.js';
import { validateAndFilterPermissions, validateUserFilters } from './utils/validators.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/roles/users
 * Ottiene utenti per ruolo con filtri per tipo di ruolo, azienda e dipartimento
 */
router.get('/',
  validatePagination,
  validateUserFilters,
  requireUserAccess,
  logRoleOperation('GET_USERS_BY_ROLE'),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        roleType, 
        customRoleId,
        company, 
        department,
        search,
        isActive,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;
      
      const offset = calculateOffset(page, limit);
      const tenantId = req.tenant?.id || req.person?.tenantId;
      const filters = validateUserFilters(req.query);

      // Costruisci la clausola WHERE base per gli utenti
      const baseUserWhere = {
        tenantId,
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(company && { company: { contains: company, mode: 'insensitive' } }),
        ...(department && { department: { contains: department, mode: 'insensitive' } }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

      let users = [];
      let totalCount = 0;

      if (roleType) {
        // Filtra per ruolo di sistema
        const role = await prisma.role.findFirst({
          where: {
            roleType,
            tenantId
          }
        });

        if (!role) {
          return res.status(404).json(createErrorResponse(
            'Role not found',
            `Role with type '${roleType}' not found`
          ));
        }

        [users, totalCount] = await Promise.all([
          prisma.person.findMany({
            where: {
              ...baseUserWhere,
              personRoles: {
                some: {
                  roleId: role.id
                }
              }
            },
            include: {
              personRoles: {
                where: { roleId: role.id },
                include: {
                  role: true
                }
              },
              personRoles: {
                where: { customRoleId: { not: null } },
                include: {
                  customRole: true
                }
              },
              grantedPermissions: {
                include: {
                  personRole: true
                }
              }
            },
            orderBy: {
              [sortBy]: sortOrder
            },
            skip: offset,
            take: parseInt(limit)
          }),
          prisma.person.count({
            where: {
              ...baseUserWhere,
              personRoles: {
                some: {
                  roleId: role.id
                }
              }
            }
          })
        ]);

      } else if (customRoleId) {
        // Filtra per ruolo personalizzato
        const customRole = await prisma.customRole.findFirst({
          where: {
            id: customRoleId,
            tenantId
          }
        });

        if (!customRole) {
          return res.status(404).json(createErrorResponse(
            'Custom role not found',
            `Custom role with ID '${customRoleId}' not found`
          ));
        }

        [users, totalCount] = await Promise.all([
          prisma.person.findMany({
            where: {
              ...baseUserWhere,
              personRoles: {
                some: {
                  customRoleId
                }
              }
            },
            include: {
              personRoles: {
                include: {
                  role: true
                }
              },
              personRoles: {
                where: { customRoleId },
                include: {
                  customRole: true
                }
              },
              grantedPermissions: {
                include: {
                  personRole: true
                }
              }
            },
            orderBy: {
              [sortBy]: sortOrder
            },
            skip: offset,
            take: parseInt(limit)
          }),
          prisma.person.count({
            where: {
              ...baseUserWhere,
              personRoles: {
                some: {
                  customRoleId
                }
              }
            }
          })
        ]);

      } else {
        // Ottieni tutti gli utenti con i loro ruoli
        [users, totalCount] = await Promise.all([
          prisma.person.findMany({
            where: baseUserWhere,
            include: {
              personRoles: {
                include: {
                  role: true
                }
              },
              personRoles: {
                where: { customRoleId: { not: null } },
                include: {
                  customRole: true
                }
              },
              grantedPermissions: {
                include: {
                  personRole: true
                }
              }
            },
            orderBy: {
              [sortBy]: sortOrder
            },
            skip: offset,
            take: parseInt(limit)
          }),
          prisma.person.count({ where: baseUserWhere })
        ]);
      }

      // Trasforma gli utenti per la risposta
      const transformedUsers = users.map(user => ({
        ...filterUserData(user),
        roles: {
          system: user.personRoles.map(pr => ({
            roleType: pr.role.roleType,
            name: pr.role.name,
            description: pr.role.description,
            assignedAt: pr.createdAt,
            assignedBy: pr.assignedBy
          })),
          custom: user.personRoles.filter(pr => pr.customRoleId).map(pr => ({
            id: pr.customRole.id,
            name: pr.customRole.name,
            description: pr.customRole.description,
            assignedAt: pr.createdAt,
            assignedBy: pr.assignedBy
          }))
        },
        customPermissions: user.grantedPermissions.map(gp => ({
          id: gp.id,
          name: gp.permission,
          resource: gp.resource,
          action: gp.action,
          assignedAt: gp.grantedAt,
          assignedBy: gp.grantedBy
        })),
        totalRoles: user.personRoles.length,
        totalCustomPermissions: user.grantedPermissions.length
      }));

      logger.info('Users by role retrieved', {
        tenantId,
        userId: req.person?.id,
        filters: { roleType, customRoleId, company, department, search },
        totalCount,
        returnedCount: transformedUsers.length,
        pagination: { page, limit }
      });

      const paginationResponse = createPaginationResponse(
        transformedUsers,
        totalCount,
        page,
        limit
      );

      res.json(createSuccessResponse({
        ...paginationResponse,
        filters: {
          roleType,
          customRoleId,
          company,
          department,
          search,
          isActive
        }
      }, 'Users retrieved successfully'));

    } catch (error) {
      logger.error('Error retrieving users by role', {
        error: error.message,
        stack: error.stack,
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id,
        query: req.query
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve users',
        error.message
      ));
    }
  }
);

/**
 * GET /api/roles/user/:personId
 * Ottiene tutti i ruoli e permessi di una persona specifica
 */
router.get('/user/:personId',
  validateRouteId('personId'),
  requireUserAccess,
  logRoleOperation('GET_USER_ROLES_PERMISSIONS'),
  async (req, res) => {
    try {
      const { personId } = req.params;
      const { includeInactive = 'false' } = req.query;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Verifica che l'utente esista e appartenga al tenant
      const user = await prisma.person.findFirst({
        where: {
          id: personId,
          tenantId
        },
        include: {
          personRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              },
              customRole: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            },
            ...(includeInactive !== 'true' && {
              where: {
                OR: [
                  { role: { isActive: true } },
                  { customRole: { isActive: true } }
                ]
              }
            })
          },
          grantedPermissions: {
            include: {
              personRole: true
            },
            ...(includeInactive !== 'true' && {
              where: {
                isActive: true
              }
            })
          }
        }
      });

      if (!user) {
        return res.status(404).json(createErrorResponse(
          'User not found',
          'The specified user does not exist or does not belong to your tenant'
        ));
      }

      // Calcola tutti i permessi effettivi dell'utente
      const allPermissions = new Map();

      // Permessi dai ruoli di sistema
      user.personRoles.forEach(pr => {
        pr.role.permissions.forEach(rp => {
          const key = `${rp.permission.resource}_${rp.permission.action}`;
          if (!allPermissions.has(key)) {
            allPermissions.set(key, {
              ...rp.permission,
              source: 'system_role',
              sourceDetails: {
                roleType: pr.role.roleType,
                roleName: pr.role.name
              }
            });
          }
        });
      });

      // Permessi dai ruoli personalizzati
      user.personRoles.filter(pr => pr.customRoleId).forEach(pr => {
        pr.customRole.permissions.forEach(crp => {
          const key = `${crp.permission.resource}_${crp.permission.action}`;
          if (!allPermissions.has(key)) {
            allPermissions.set(key, {
              ...crp.permission,
              source: 'custom_role',
              sourceDetails: {
                customRoleId: pr.customRole.id,
                customRoleName: pr.customRole.name
              }
            });
          }
        });
      });

      // Permessi personalizzati diretti
      user.grantedPermissions.forEach(gp => {
        const key = `${gp.resource}_${gp.action}`;
        allPermissions.set(key, {
          id: gp.id,
          name: gp.permission,
          resource: gp.resource,
          action: gp.action,
          source: 'direct_assignment',
          sourceDetails: {
            assignedAt: gp.grantedAt,
            assignedBy: gp.grantedBy
          }
        });
      });

      // Trasforma i dati per la risposta
      const userRolesAndPermissions = {
        user: filterUserData(user),
        systemRoles: user.personRoles.map(pr => ({
          roleType: pr.role.roleType,
          name: pr.role.name,
          description: pr.role.description,
          isActive: pr.role.isActive,
          assignedAt: pr.createdAt,
          assignedBy: pr.assignedBy,
          permissions: pr.role.permissions.map(rp => ({
            id: rp.permission.id,
            name: rp.permission.name,
            resource: rp.permission.resource,
            action: rp.permission.action,
            description: rp.permission.description
          }))
        })),
        customRoles: user.personRoles.filter(pr => pr.customRoleId).map(pr => ({
          id: pr.customRole.id,
          name: pr.customRole.name,
          description: pr.customRole.description,
          isActive: pr.customRole.isActive,
          assignedAt: pr.createdAt,
          assignedBy: pr.assignedBy,
          permissions: pr.customRole.permissions.map(crp => ({
            id: crp.permission.id,
            name: crp.permission.name,
            resource: crp.permission.resource,
            action: crp.permission.action,
            description: crp.permission.description
          }))
        })),
        directPermissions: user.grantedPermissions.map(gp => ({
          id: gp.id,
          name: gp.permission,
          resource: gp.resource,
          action: gp.action,
          description: gp.description,
          assignedAt: gp.grantedAt,
          assignedBy: gp.grantedBy
        })),
        effectivePermissions: Array.from(allPermissions.values()),
        summary: {
          totalSystemRoles: user.personRoles.filter(pr => !pr.customRoleId).length,
          totalCustomRoles: user.personRoles.filter(pr => pr.customRoleId).length,
          totalDirectPermissions: user.grantedPermissions.length,
          totalEffectivePermissions: allPermissions.size
        }
      };

      logger.info('User roles and permissions retrieved', {
        targetUserId: personId,
        requesterId: req.person?.id,
        tenantId,
        systemRoles: user.personRoles.filter(pr => !pr.customRoleId).length,
        customRoles: user.personRoles.filter(pr => pr.customRoleId).length,
        directPermissions: user.grantedPermissions.length,
        effectivePermissions: allPermissions.size
      });

      res.json(createSuccessResponse(userRolesAndPermissions, 'User roles and permissions retrieved successfully'));

    } catch (error) {
      logger.error('Error retrieving user roles and permissions', {
        error: error.message,
        stack: error.stack,
        personId: req.params.personId,
        requesterId: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve user roles and permissions',
        error.message
      ));
    }
  }
);

/**
 * PUT /api/roles/user/:personId/permissions
 * Aggiorna i permessi personalizzati di una persona
 */
router.put('/user/:personId/permissions',
  validateRouteId('personId'),
  validateUserPermissions,
  requireRoleManagement,
  logRoleOperation('UPDATE_USER_PERMISSIONS'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { personId } = req.params;
      const { permissions } = req.body;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Verifica che l'utente esista e appartenga al tenant
      const user = await prisma.person.findFirst({
        where: {
          id: personId,
          tenantId
        }
      });

      if (!user) {
        return res.status(404).json(createErrorResponse(
          'User not found',
          'The specified user does not exist or does not belong to your tenant'
        ));
      }

      // Valida e filtra i permessi
      const validationResult = validateAndFilterPermissions(permissions);
      if (!validationResult.isValid) {
        return res.status(400).json(createErrorResponse(
          'Invalid permissions',
          validationResult.errors.join(', ')
        ));
      }

      const validPermissions = validationResult.validPermissions;

      // Verifica che tutti i permessi esistano
      if (validPermissions.length > 0) {
        const existingPermissions = await prisma.permission.findMany({
          where: {
            name: { in: validPermissions },
            isActive: true
          }
        });

        if (existingPermissions.length !== validPermissions.length) {
          const foundNames = existingPermissions.map(p => p.name);
          const missingNames = validPermissions.filter(name => !foundNames.includes(name));
          return res.status(404).json(createErrorResponse(
            'Some permissions not found',
            `Permissions ${missingNames.join(', ')} not found or inactive`
          ));
        }
      }

      // Aggiorna i permessi in una transazione
      const updateResult = await prisma.$transaction(async (tx) => {
        // Rimuovi tutti i permessi personalizzati esistenti
        const removedCount = await tx.personPermission.deleteMany({
          where: { personId }
        });

        // Aggiungi i nuovi permessi
        let addedCount = 0;
        if (validPermissions.length > 0) {
          const permissionRecords = await tx.permission.findMany({
            where: {
              name: { in: validPermissions },
              isActive: true
            }
          });

          await tx.personPermission.createMany({
            data: permissionRecords.map(permission => ({
              personId,
              permissionId: permission.id,
              assignedBy: req.person.id
            }))
          });

          addedCount = permissionRecords.length;
        }

        return { removedCount: removedCount.count, addedCount };
      });

      logger.info('User permissions updated', {
        targetUserId: personId,
        updatedBy: req.person.id,
        tenantId,
        removedCount: updateResult.removedCount,
        addedCount: updateResult.addedCount,
        finalCount: validPermissions.length
      });

      res.json(createSuccessResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        permissions: validPermissions,
        stats: {
          removed: updateResult.removedCount,
          added: updateResult.addedCount,
          final: validPermissions.length
        },
        updatedAt: new Date().toISOString(),
        updatedBy: req.person.id
      }, 'User permissions updated successfully'));

    } catch (error) {
      logger.error('Error updating user permissions', {
        error: error.message,
        stack: error.stack,
        personId: req.params.personId,
        updatedBy: req.person?.id,
        requestData: req.body,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to update user permissions',
        error.message
      ));
    }
  }
);

export default router;