/**
 * Assignment Routes - Gestione dell'assegnazione e rimozione ruoli
 * 
 * Questo modulo gestisce tutte le operazioni di assegnazione e rimozione
 * dei ruoli agli utenti, inclusi controlli di permessi e validazioni.
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

// Import dei middleware
import { requireRoleAssignmentPermission } from './middleware/auth.js';
import { logRoleOperation, auditRoleChanges } from './middleware/logging.js';
import { 
  validateRoleAssignmentData,
  validateRoleRemoval 
} from './middleware/validation.js';

// Import delle utilità
import { 
  createSuccessResponse, 
  createErrorResponse 
} from './utils/helpers.js';
import { filterUserData } from './utils/filters.js';
import { validateRoleAssignment as validateAssignmentData } from './utils/validators.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/roles/assign
 * Assegna un ruolo a un utente
 */
router.post('/assign',
  validateRoleAssignmentData,
  requireRoleAssignmentPermission,
  logRoleOperation('ASSIGN_ROLE'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { personId, roleType, customRoleId } = req.body;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Valida i dati di assegnazione
      const validation = validateAssignmentData({ personId, roleType, customRoleId });
      if (!validation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Invalid assignment data',
          validation.errors.join(', ')
        ));
      }

      // Verifica che l'utente target esista e appartenga al tenant
      const targetUser = await prisma.person.findFirst({
        where: {
          id: personId,
          tenantId
        }
      });

      if (!targetUser) {
        return res.status(404).json(createErrorResponse(
          'User not found',
          'The specified user does not exist or does not belong to your tenant'
        ));
      }

      let assignmentResult;

      if (roleType) {
        // Assegnazione di un ruolo di sistema
        
        // Verifica che il ruolo esista
        const role = await prisma.role.findFirst({
          where: {
            roleType,
            tenantId,
            isActive: true
          }
        });

        if (!role) {
          return res.status(404).json(createErrorResponse(
            'Role not found',
            `Role with type '${roleType}' not found or inactive`
          ));
        }

        // Verifica se l'utente ha già questo ruolo
        const existingAssignment = await prisma.personRole.findFirst({
          where: {
            personId,
            roleId: role.id
          }
        });

        if (existingAssignment) {
          return res.status(409).json(createErrorResponse(
            'Role already assigned',
            `User already has the role '${roleType}'`
          ));
        }

        // Assegna il ruolo
        assignmentResult = await prisma.personRole.create({
          data: {
            personId,
            roleId: role.id,
            assignedBy: req.person.id
          },
          include: {
            role: true,
            person: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        });

        logger.info('System role assigned', {
          assignerId: req.person.id,
          targetUserId: personId,
          roleType,
          roleId: role.id,
          tenantId
        });

      } else if (customRoleId) {
        // Assegnazione di un ruolo personalizzato
        
        // Verifica che il ruolo personalizzato esista
        const customRole = await prisma.customRole.findFirst({
          where: {
            id: customRoleId,
            tenantId,
            isActive: true
          }
        });

        if (!customRole) {
          return res.status(404).json(createErrorResponse(
            'Custom role not found',
            `Custom role with ID '${customRoleId}' not found or inactive`
          ));
        }

        // Verifica se l'utente ha già questo ruolo personalizzato
        const existingAssignment = await prisma.personCustomRole.findFirst({
          where: {
            personId,
            customRoleId
          }
        });

        if (existingAssignment) {
          return res.status(409).json(createErrorResponse(
            'Custom role already assigned',
            `User already has the custom role '${customRole.name}'`
          ));
        }

        // Assegna il ruolo personalizzato
        assignmentResult = await prisma.personCustomRole.create({
          data: {
            personId,
            customRoleId,
            assignedBy: req.person.id
          },
          include: {
            customRole: true,
            person: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        });

        logger.info('Custom role assigned', {
          assignerId: req.person.id,
          targetUserId: personId,
          customRoleId,
          customRoleName: customRole.name,
          tenantId
        });
      }

      res.json(createSuccessResponse({
        assignment: {
          id: assignmentResult.id,
          user: filterUserData(assignmentResult.person),
          role: roleType ? {
            type: 'system',
            roleType: assignmentResult.role.roleType,
            name: assignmentResult.role.name,
            description: assignmentResult.role.description
          } : {
            type: 'custom',
            id: assignmentResult.customRole.id,
            name: assignmentResult.customRole.name,
            description: assignmentResult.customRole.description
          },
          assignedAt: assignmentResult.createdAt,
          assignedBy: req.person.id
        }
      }, 'Role assigned successfully'));

    } catch (error) {
      logger.error('Error assigning role', {
        error: error.message,
        stack: error.stack,
        assignerId: req.person?.id,
        requestData: req.body,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to assign role',
        error.message
      ));
    }
  }
);

/**
 * DELETE /api/roles/remove
 * Rimuove un ruolo da un utente
 */
router.delete('/remove',
  validateRoleRemoval,
  requireRoleAssignmentPermission,
  logRoleOperation('REMOVE_ROLE'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { personId, roleType, customRoleId } = req.body;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      if (!personId || (!roleType && !customRoleId)) {
        return res.status(400).json(createErrorResponse(
          'Invalid input',
          'personId and either roleType or customRoleId are required'
        ));
      }

      // Verifica che l'utente target esista e appartenga al tenant
      const targetUser = await prisma.person.findFirst({
        where: {
          id: personId,
          tenantId
        }
      });

      if (!targetUser) {
        return res.status(404).json(createErrorResponse(
          'User not found',
          'The specified user does not exist or does not belong to your tenant'
        ));
      }

      let removalResult;

      if (roleType) {
        // Rimozione di un ruolo di sistema
        
        // Trova il ruolo
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

        // Trova l'assegnazione
        const assignment = await prisma.personRole.findFirst({
          where: {
            personId,
            roleId: role.id
          },
          include: {
            role: true,
            person: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        });

        if (!assignment) {
          return res.status(404).json(createErrorResponse(
            'Role assignment not found',
            `User does not have the role '${roleType}'`
          ));
        }

        // Rimuovi l'assegnazione
        await prisma.personRole.delete({
          where: { id: assignment.id }
        });

        removalResult = {
          user: filterUserData(assignment.person),
          role: {
            type: 'system',
            roleType: assignment.role.roleType,
            name: assignment.role.name
          },
          removedAt: new Date().toISOString(),
          removedBy: req.person.id
        };

        logger.info('System role removed', {
          removerId: req.person.id,
          targetUserId: personId,
          roleType,
          roleId: role.id,
          tenantId
        });

      } else if (customRoleId) {
        // Rimozione di un ruolo personalizzato
        
        // Trova il ruolo personalizzato
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

        // Trova l'assegnazione
        const assignment = await prisma.personCustomRole.findFirst({
          where: {
            personId,
            customRoleId
          },
          include: {
            customRole: true,
            person: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        });

        if (!assignment) {
          return res.status(404).json(createErrorResponse(
            'Custom role assignment not found',
            `User does not have the custom role '${customRole.name}'`
          ));
        }

        // Rimuovi l'assegnazione
        await prisma.personCustomRole.delete({
          where: { id: assignment.id }
        });

        removalResult = {
          user: filterUserData(assignment.person),
          role: {
            type: 'custom',
            id: assignment.customRole.id,
            name: assignment.customRole.name
          },
          removedAt: new Date().toISOString(),
          removedBy: req.person.id
        };

        logger.info('Custom role removed', {
          removerId: req.person.id,
          targetUserId: personId,
          customRoleId,
          customRoleName: customRole.name,
          tenantId
        });
      }

      res.json(createSuccessResponse({
        removal: removalResult
      }, 'Role removed successfully'));

    } catch (error) {
      logger.error('Error removing role', {
        error: error.message,
        stack: error.stack,
        removerId: req.person?.id,
        requestData: req.body,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to remove role',
        error.message
      ));
    }
  }
);

/**
 * POST /api/roles/bulk-assign
 * Assegna ruoli a più utenti contemporaneamente
 */
router.post('/bulk-assign',
  requireRoleAssignmentPermission,
  logRoleOperation('BULK_ASSIGN_ROLES'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { userIds, roleType, customRoleId } = req.body;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json(createErrorResponse(
          'Invalid input',
          'userIds must be a non-empty array'
        ));
      }

      if (!roleType && !customRoleId) {
        return res.status(400).json(createErrorResponse(
          'Invalid input',
          'Either roleType or customRoleId is required'
        ));
      }

      // Verifica che tutti gli utenti esistano e appartengano al tenant
      const users = await prisma.person.findMany({
        where: {
          id: { in: userIds },
          tenantId
        }
      });

      if (users.length !== userIds.length) {
        const foundIds = users.map(u => u.id);
        const missingIds = userIds.filter(id => !foundIds.includes(id));
        return res.status(404).json(createErrorResponse(
          'Some users not found',
          `Users with IDs ${missingIds.join(', ')} not found or do not belong to your tenant`
        ));
      }

      let assignments = [];

      if (roleType) {
        // Assegnazione bulk di un ruolo di sistema
        const role = await prisma.role.findFirst({
          where: {
            roleType,
            tenantId,
            isActive: true
          }
        });

        if (!role) {
          return res.status(404).json(createErrorResponse(
            'Role not found',
            `Role with type '${roleType}' not found or inactive`
          ));
        }

        // Trova gli utenti che non hanno già questo ruolo
        const existingAssignments = await prisma.personRole.findMany({
          where: {
            personId: { in: userIds },
            roleId: role.id
          }
        });

        const existingUserIds = existingAssignments.map(a => a.personId);
        const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

        if (newUserIds.length > 0) {
          // Crea le nuove assegnazioni
          await prisma.personRole.createMany({
            data: newUserIds.map(userId => ({
              personId: userId,
              roleId: role.id,
              assignedBy: req.person.id
            }))
          });

          assignments = newUserIds.map(userId => ({
            userId,
            roleType,
            roleName: role.name,
            type: 'system'
          }));
        }

        logger.info('Bulk system role assignment', {
          assignerId: req.person.id,
          roleType,
          totalUsers: userIds.length,
          newAssignments: newUserIds.length,
          skippedExisting: existingUserIds.length,
          tenantId
        });

      } else if (customRoleId) {
        // Assegnazione bulk di un ruolo personalizzato
        const customRole = await prisma.customRole.findFirst({
          where: {
            id: customRoleId,
            tenantId,
            isActive: true
          }
        });

        if (!customRole) {
          return res.status(404).json(createErrorResponse(
            'Custom role not found',
            `Custom role with ID '${customRoleId}' not found or inactive`
          ));
        }

        // Trova gli utenti che non hanno già questo ruolo personalizzato
        const existingAssignments = await prisma.personCustomRole.findMany({
          where: {
            personId: { in: userIds },
            customRoleId
          }
        });

        const existingUserIds = existingAssignments.map(a => a.personId);
        const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

        if (newUserIds.length > 0) {
          // Crea le nuove assegnazioni
          await prisma.personCustomRole.createMany({
            data: newUserIds.map(userId => ({
              personId: userId,
              customRoleId,
              assignedBy: req.person.id
            }))
          });

          assignments = newUserIds.map(userId => ({
            userId,
            customRoleId,
            roleName: customRole.name,
            type: 'custom'
          }));
        }

        logger.info('Bulk custom role assignment', {
          assignerId: req.person.id,
          customRoleId,
          customRoleName: customRole.name,
          totalUsers: userIds.length,
          newAssignments: newUserIds.length,
          skippedExisting: existingUserIds.length,
          tenantId
        });
      }

      res.json(createSuccessResponse({
        totalUsers: userIds.length,
        newAssignments: assignments.length,
        skippedExisting: userIds.length - assignments.length,
        assignments,
        assignedAt: new Date().toISOString(),
        assignedBy: req.person.id
      }, 'Bulk role assignment completed successfully'));

    } catch (error) {
      logger.error('Error in bulk role assignment', {
        error: error.message,
        stack: error.stack,
        assignerId: req.person?.id,
        requestData: req.body,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to perform bulk role assignment',
        error.message
      ));
    }
  }
);

export default router;