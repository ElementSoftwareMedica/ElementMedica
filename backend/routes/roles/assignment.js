/**
 * Assignment Routes - Gestione dell'assegnazione e rimozione ruoli
 * 
 * Questo modulo gestisce tutte le operazioni di assegnazione e rimozione
 * dei ruoli agli utenti, inclusi controlli di permessi e validazioni.
 */

import express from 'express';
import prisma from '../../config/prisma-optimization.js';
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
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = express.Router();

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
      const tenantId = getEffectiveTenantId(req);

      // Valida i dati di assegnazione
      const validation = validateAssignmentData({ personId, roleType, customRoleId });
      if (!validation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Dati di assegnazione non validi',
          validation.errors.join(', ')
        ));
      }

      // Verifica che l'utente target esista e appartenga al tenant
      const targetProfile = await prisma.personTenantProfile.findFirst({
        where: {
          personId,
          tenantId,
          deletedAt: null
        },
        include: {
          person: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      if (!targetProfile) {
        return res.status(404).json(createErrorResponse(
          'Utente non trovato',
          'L\'utente specificato non esiste o non appartiene al tuo tenant'
        ));
      }

      let assignmentResult;

      if (roleType) {
        // Assegnazione di un ruolo di sistema

        // Verifica se l'utente ha già questo ruolo
        const existingAssignment = await prisma.personRole.findFirst({
          where: {
            personId,
            roleType,
            tenantId,
            deletedAt: null
          }
        });

        if (existingAssignment) {
          return res.status(409).json(createErrorResponse(
            'Ruolo già assegnato',
            `User already has the role '${roleType}'`
          ));
        }

        // Assegna il ruolo
        assignmentResult = await prisma.personRole.create({
          data: {
            personId,
            roleType,
            tenantId,
            assignedBy: req.person.id
          },
          include: {
            person: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        });

        logger.info('System role assigned', {
          assignerId: req.person.id,
          targetUserId: personId,
          roleType,
          tenantId
        });

      } else if (customRoleId) {
        // Assegnazione di un ruolo personalizzato

        // Verifica che il ruolo personalizzato esista
        const customRole = await prisma.customRole.findFirst({
          where: {
            id: customRoleId,
            tenantId,
            isActive: true,
            deletedAt: null
          }
        });

        if (!customRole) {
          return res.status(404).json(createErrorResponse(
            'Ruolo personalizzato non trovato',
            `Custom role with ID '${customRoleId}' not found or inactive`
          ));
        }

        // Verifica se l'utente ha già questo ruolo personalizzato
        const existingAssignment = await prisma.personRole.findFirst({
          where: {
            personId,
            customRoleId,
            tenantId,
            deletedAt: null
          }
        });

        if (existingAssignment) {
          return res.status(409).json(createErrorResponse(
            'Custom role already assigned',
            `User already has the custom role '${customRole.name}'`
          ));
        }

        // Assegna il ruolo personalizzato
        assignmentResult = await prisma.personRole.create({
          data: {
            personId,
            customRoleId,
            tenantId,
            assignedBy: req.person.id
          },
          include: {
            customRole: true,
            person: {
              select: { id: true, firstName: true, lastName: true }
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
            roleType: assignmentResult.roleType
          } : {
            type: 'custom',
            id: assignmentResult.customRole.id,
            name: assignmentResult.customRole.name,
            description: assignmentResult.customRole.description
          },
          assignedAt: assignmentResult.createdAt,
          assignedBy: req.person.id
        }
      }, 'Ruolo assegnato con successo'));

    } catch (error) {
      logger.error('Error assigning role', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        assignerId: req.person?.id,
        requestData: req.body,
        tenantId: getEffectiveTenantId(req)
      });

      res.status(500).json(createErrorResponse('Errore nell\'assegnazione del ruolo'));
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
      const tenantId = getEffectiveTenantId(req);

      if (!personId || (!roleType && !customRoleId)) {
        return res.status(400).json(createErrorResponse(
          'Dati non validi',
          'personId and either roleType or customRoleId are required'
        ));
      }

      // Verifica che l'utente target esista e appartenga al tenant
      const targetProfile = await prisma.personTenantProfile.findFirst({
        where: {
          personId,
          tenantId,
          deletedAt: null
        },
        include: {
          person: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      if (!targetProfile) {
        return res.status(404).json(createErrorResponse(
          'Utente non trovato',
          'L\'utente specificato non esiste o non appartiene al tuo tenant'
        ));
      }

      let removalResult;

      if (roleType) {
        // Rimozione di un ruolo di sistema

        // Trova l'assegnazione
        const assignment = await prisma.personRole.findFirst({
          where: {
            personId,
            roleType,
            tenantId,
            deletedAt: null
          },
          include: {
            person: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        });

        if (!assignment) {
          return res.status(404).json(createErrorResponse(
            'Assegnazione ruolo non trovata',
            `User does not have the role '${roleType}'`
          ));
        }

        // Soft delete dell'assegnazione
        await prisma.personRole.update({
          where: { id: assignment.id },
          data: { deletedAt: new Date(), isActive: false }
        });

        // GDPR audit log
        await prisma.gdprAuditLog.create({
          data: {
            tenantId,
            personId: req.person.id,
            action: 'DELETE',
            resourceType: 'PersonRole',
            resourceId: assignment.id,
            dataAccessed: {
              targetPersonId: personId,
              roleType
            }
          }
        });

        removalResult = {
          user: filterUserData(assignment.person),
          role: {
            type: 'system',
            roleType: assignment.roleType
          },
          removedAt: new Date().toISOString(),
          removedBy: req.person.id
        };

        logger.info('System role removed', {
          removerId: req.person.id,
          targetUserId: personId,
          roleType,
          tenantId
        });

      } else if (customRoleId) {
        // Rimozione di un ruolo personalizzato

        // Trova il ruolo personalizzato
        const customRole = await prisma.customRole.findFirst({
          where: {
            id: customRoleId,
            tenantId,
            deletedAt: null
          }
        });

        if (!customRole) {
          return res.status(404).json(createErrorResponse(
            'Ruolo personalizzato non trovato',
            `Custom role with ID '${customRoleId}' not found`
          ));
        }

        // Trova l'assegnazione
        const assignment = await prisma.personRole.findFirst({
          where: {
            personId,
            customRoleId,
            tenantId,
            deletedAt: null
          },
          include: {
            customRole: true,
            person: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        });

        if (!assignment) {
          return res.status(404).json(createErrorResponse(
            'Assegnazione ruolo personalizzato non trovata',
            `User does not have the custom role '${customRole.name}'`
          ));
        }

        // Soft delete dell'assegnazione
        await prisma.personRole.update({
          where: { id: assignment.id },
          data: { deletedAt: new Date(), isActive: false }
        });

        // GDPR audit log
        await prisma.gdprAuditLog.create({
          data: {
            tenantId,
            personId: req.person.id,
            action: 'DELETE',
            resourceType: 'PersonRole',
            resourceId: assignment.id,
            dataAccessed: {
              targetPersonId: personId,
              customRoleId,
              customRoleName: customRole.name
            }
          }
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
      }, 'Ruolo rimosso con successo'));

    } catch (error) {
      logger.error('Error removing role', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        removerId: req.person?.id,
        requestData: req.body,
        tenantId: getEffectiveTenantId(req)
      });

      res.status(500).json(createErrorResponse('Errore nella rimozione del ruolo'));
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
      const tenantId = getEffectiveTenantId(req);

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json(createErrorResponse(
          'Dati non validi',
          'userIds must be a non-empty array'
        ));
      }

      if (!roleType && !customRoleId) {
        return res.status(400).json(createErrorResponse(
          'Dati non validi',
          'Either roleType or customRoleId is required'
        ));
      }

      // Verifica che tutti gli utenti esistano e appartengano al tenant
      const profiles = await prisma.personTenantProfile.findMany({
        where: {
          personId: { in: userIds },
          tenantId,
          deletedAt: null
        },
        select: { personId: true }
      });

      const foundIds = profiles.map(p => p.personId);
      if (foundIds.length !== userIds.length) {
        const missingIds = userIds.filter(id => !foundIds.includes(id));
        return res.status(404).json(createErrorResponse(
          'Alcuni utenti non trovati',
          `Users with IDs ${missingIds.join(', ')} not found or do not belong to your tenant`
        ));
      }

      let assignments = [];

      if (roleType) {
        // Assegnazione bulk di un ruolo di sistema

        // Trova gli utenti che non hanno già questo ruolo
        const existingAssignments = await prisma.personRole.findMany({
          where: {
            personId: { in: userIds },
            roleType,
            tenantId,
            deletedAt: null
          }
        });

        const existingUserIds = existingAssignments.map(a => a.personId);
        const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

        if (newUserIds.length > 0) {
          // Crea le nuove assegnazioni
          await prisma.personRole.createMany({
            data: newUserIds.map(userId => ({
              personId: userId,
              roleType,
              tenantId,
              assignedBy: req.person.id
            }))
          });

          assignments = newUserIds.map(userId => ({
            userId,
            roleType,
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
            isActive: true,
            deletedAt: null
          }
        });

        if (!customRole) {
          return res.status(404).json(createErrorResponse(
            'Ruolo personalizzato non trovato',
            `Custom role with ID '${customRoleId}' not found or inactive`
          ));
        }

        // Trova gli utenti che non hanno già questo ruolo personalizzato
        const existingAssignments = await prisma.personRole.findMany({
          where: {
            personId: { in: userIds },
            customRoleId,
            tenantId,
            deletedAt: null
          }
        });

        const existingUserIds = existingAssignments.map(a => a.personId);
        const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

        if (newUserIds.length > 0) {
          // Crea le nuove assegnazioni
          await prisma.personRole.createMany({
            data: newUserIds.map(userId => ({
              personId: userId,
              customRoleId,
              tenantId,
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
        error: 'Operazione non riuscita',
        stack: error.stack,
        assignerId: req.person?.id,
        requestData: req.body,
        tenantId: getEffectiveTenantId(req)
      });

      res.status(500).json(createErrorResponse('Errore nell\'assegnazione multipla dei ruoli'));
    }
  }
);

export default router;