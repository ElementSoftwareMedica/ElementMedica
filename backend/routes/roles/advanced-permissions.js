/**
 * Advanced Permissions Routes - Gestione dei permessi avanzati
 * 
 * Questo modulo gestisce i permessi avanzati per i ruoli,
 * inclusa la visualizzazione raggruppata per risorsa e la rimozione.
 */

import express from 'express';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// Import dei middleware
import { requireRoleManagement } from './middleware/auth.js';
import { logRoleOperation, auditRoleChanges } from './middleware/logging.js';
import { validateAdvancedPermissions } from './middleware/validation.js';

// Import delle utilità
import {
  createSuccessResponse,
  createErrorResponse,
  groupPermissionsByResource
} from './utils/helpers.js';
import { validateAdvancedPermission } from './utils/validators.js';

const router = express.Router();

// ========================================
// ROUTES STATICHE (PRIMA delle routes con :roleType)
// ========================================

/**
 * GET /api/roles/relation-definitions
 * Ottiene tutte le definizioni di relazione per scope "relational"
 */
router.get('/relation-definitions',
  requireRoleManagement,
  logRoleOperation('GET_RELATION_DEFINITIONS'),
  async (req, res) => {
    try {
      const tenantId = req.tenant?.id || req.person?.tenantId;

      const definitions = await prisma.relationDefinition.findMany({
        where: {
          OR: [
            { tenantId },
            { tenantId: null, isSystem: true }
          ],
          deletedAt: null
        },
        orderBy: [
          { isSystem: 'desc' },
          { name: 'asc' }
        ]
      });

      res.json(createSuccessResponse({
        definitions,
        count: definitions.length
      }, 'Relation definitions retrieved successfully'));

    } catch (error) {
      logger.error('Error getting relation definitions', {
        error: 'Operazione non riuscita',
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse('Errore nel recupero delle definizioni di relazione'));
    }
  }
);

/**
 * POST /api/roles/test-data-filter
 * Testa il filtro dati per un utente e risorsa specifici (SOLO DEVELOPMENT)
 */
router.post('/test-data-filter',
  requireRoleManagement,
  logRoleOperation('TEST_DATA_FILTER'),
  async (req, res) => {
    // Solo in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json(createErrorResponse(
        'Non trovato',
        'Endpoint disponibile solo in modalità sviluppo'
      ));
    }

    try {
      const { resource, action = 'read' } = req.body;
      const tenantId = req.tenant?.id || req.person?.tenantId;
      const personId = req.person?.id;

      if (!resource) {
        return res.status(400).json(createErrorResponse(
          'Errore di validazione',
          'Il campo resource è obbligatorio'
        ));
      }

      // Import dinamico per evitare dipendenze circolari
      const { permissionInheritanceService } = await import('../../services/permission-inheritance.js');
      const { relationResolver } = await import('../../services/relation-resolver.js');

      // Verifica accesso
      const accessCheck = await permissionInheritanceService.canAccessResource(
        personId,
        tenantId,
        resource,
        action
      );

      if (!accessCheck.allowed) {
        return res.json(createSuccessResponse({
          allowed: false,
          reason: accessCheck.reason,
          resource,
          action
        }, 'Accesso negato'));
      }

      // Costruisci filtro relazionale se applicabile
      let dataFilter = null;
      if (accessCheck.permission.scope === 'relational') {
        dataFilter = await relationResolver.buildRelationalFilter(
          personId,
          tenantId,
          accessCheck.permission
        );
      }

      res.json(createSuccessResponse({
        allowed: true,
        permission: {
          resource: accessCheck.permission.resource,
          action: accessCheck.permission.action,
          scope: accessCheck.permission.scope,
          relationType: accessCheck.permission.relationType,
          allowedFields: accessCheck.permission.allowedFields,
          deniedFields: accessCheck.permission.deniedFields
        },
        dataFilter,
        effectiveRoles: accessCheck.roles
      }, 'Data filter test successful'));

    } catch (error) {
      logger.error('Error testing data filter', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        requestData: req.body
      });

      res.status(500).json(createErrorResponse('Errore nel test del filtro dati'));
    }
  }
);

// ========================================
// ROUTES DINAMICHE (con :roleType)
// ========================================

/**
 * GET /api/roles/:roleType/advanced-permissions
 * Ottiene i permessi avanzati per un tipo di ruolo specifico, raggruppati per risorsa
 */
router.get('/:roleType/advanced-permissions',
  requireRoleManagement,
  logRoleOperation('GET_ADVANCED_PERMISSIONS'),
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const { includeInactive = 'false' } = req.query;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      // Trova il ruolo
      const role = await prisma.role.findFirst({
        where: {
          roleType,
          tenantId,
          ...(includeInactive !== 'true' && { isActive: true })
        }
      });

      if (!role) {
        return res.status(404).json(createErrorResponse(
          'Ruolo non trovato',
          `Role with type '${roleType}' not found or inactive`
        ));
      }

      // Ottieni tutti i permessi del ruolo con dettagli completi
      const rolePermissions = await prisma.rolePermission.findMany({
        where: {
          roleId: role.id
        },
        include: {
          permission: {
            include: {
              site: true
            }
          }
        },
        orderBy: [
          { permission: { resource: 'asc' } },
          { permission: { action: 'asc' } }
        ]
      });

      // Raggruppa i permessi per risorsa
      const groupedPermissions = groupPermissionsByResource(
        rolePermissions.map(rp => ({
          id: rp.permission.id,
          name: rp.permission.name,
          action: rp.permission.action,
          description: rp.permission.description,
          resource: rp.permission.resource || 'unknown',
          resourceId: rp.permission.resourceId,
          assignedAt: rp.createdAt,
          assignedBy: rp.assignedBy,
          isActive: !rp.permission.deletedAt,
          siteId: rp.permission.siteId,
          site: rp.permission.site
        }))
      );

      // Calcola statistiche
      const stats = {
        totalPermissions: rolePermissions.length,
        activePermissions: rolePermissions.filter(rp => !rp.permission.deletedAt).length,
        resourcesCount: Object.keys(groupedPermissions).length,
        lastUpdated: rolePermissions.length > 0
          ? Math.max(...rolePermissions.map(rp => new Date(rp.updatedAt || rp.createdAt).getTime()))
          : null
      };

      logger.info('Permessi avanzati recuperati', {
        roleType,
        roleId: role.id,
        tenantId,
        userId: req.person?.id,
        totalPermissions: stats.totalPermissions,
        resourcesCount: stats.resourcesCount
      });

      res.json(createSuccessResponse({
        role: {
          id: role.id,
          roleType: role.roleType,
          name: role.name,
          description: role.description,
          isActive: role.isActive
        },
        permissions: groupedPermissions,
        stats
      }, 'Advanced permissions retrieved successfully'));

    } catch (error) {
      logger.error('Error retrieving advanced permissions', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        roleType: req.params.roleType,
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id
      });

      res.status(500).json(createErrorResponse('Errore nel recupero dei permessi avanzati'));
    }
  }
);

/**
 * POST /api/roles/:roleType/advanced-permissions
 * Aggiunge permessi avanzati a un ruolo
 */
router.post('/:roleType/advanced-permissions',
  validateAdvancedPermissions,
  requireRoleManagement,
  logRoleOperation('ADD_ADVANCED_PERMISSIONS'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const { permissions } = req.body;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json(createErrorResponse(
          'Dati non validi',
          'permissions must be a non-empty array'
        ));
      }

      // Valida ogni permesso
      for (const permission of permissions) {
        const validation = validateAdvancedPermission(permission);
        if (!validation.isValid) {
          return res.status(400).json(createErrorResponse(
            'Dati dei permessi non validi',
            validation.errors.join(', ')
          ));
        }
      }

      // Trova il ruolo
      const role = await prisma.role.findFirst({
        where: {
          roleType,
          tenantId,
          isActive: true
        }
      });

      if (!role) {
        return res.status(404).json(createErrorResponse(
          'Ruolo non trovato',
          `Role with type '${roleType}' not found or inactive`
        ));
      }

      // Verifica che tutti i permessi esistano
      const permissionIds = permissions.map(p => p.permissionId);
      const existingPermissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds },
          deletedAt: null
        }
      });

      if (existingPermissions.length !== permissionIds.length) {
        const foundIds = existingPermissions.map(p => p.id);
        const missingIds = permissionIds.filter(id => !foundIds.includes(id));
        return res.status(404).json(createErrorResponse(
          'Alcuni permessi non trovati',
          `Permissions with IDs ${missingIds.join(', ')} not found or inactive`
        ));
      }

      // Verifica quali permessi non sono già assegnati
      const existingAssignments = await prisma.rolePermission.findMany({
        where: {
          roleId: role.id,
          permissionId: { in: permissionIds }
        }
      });

      const existingPermissionIds = existingAssignments.map(a => a.permissionId);
      const newPermissionIds = permissionIds.filter(id => !existingPermissionIds.includes(id));

      if (newPermissionIds.length === 0) {
        return res.status(409).json(createErrorResponse(
          'Permissions already assigned',
          'All specified permissions are already assigned to this role'
        ));
      }

      // Aggiungi i nuovi permessi
      const newAssignments = await prisma.rolePermission.createMany({
        data: newPermissionIds.map(permissionId => ({
          roleId: role.id,
          permissionId,
          assignedBy: req.person.id
        }))
      });

      // Ottieni i dettagli dei permessi aggiunti
      const addedPermissions = await prisma.permission.findMany({
        where: {
          id: { in: newPermissionIds }
        },
        include: {
          site: true
        }
      });

      logger.info('Permessi avanzati aggiunti', {
        roleType,
        roleId: role.id,
        tenantId,
        userId: req.person?.id,
        addedCount: newAssignments.count,
        skippedExisting: existingPermissionIds.length,
        totalRequested: permissionIds.length
      });

      res.json(createSuccessResponse({
        role: {
          id: role.id,
          roleType: role.roleType,
          name: role.name
        },
        addedPermissions: addedPermissions.map(p => ({
          id: p.id,
          name: p.name,
          action: p.action,
          resource: p.resource || 'unknown',
          description: p.description,
          siteId: p.siteId,
          site: p.site
        })),
        stats: {
          totalRequested: permissionIds.length,
          added: newAssignments.count,
          skippedExisting: existingPermissionIds.length
        }
      }, 'Advanced permissions added successfully'));

    } catch (error) {
      logger.error('Error adding advanced permissions', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        roleType: req.params.roleType,
        requestData: req.body,
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id
      });

      res.status(500).json(createErrorResponse('Errore nell\'aggiunta dei permessi avanzati'));
    }
  }
);

/**
 * DELETE /api/roles/:roleType/advanced-permissions
 * Rimuove permessi avanzati da un ruolo (soft delete)
 */
router.delete('/:roleType/advanced-permissions',
  requireRoleManagement,
  logRoleOperation('REMOVE_ADVANCED_PERMISSIONS'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const { permissionIds } = req.body;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
        return res.status(400).json(createErrorResponse(
          'Dati non validi',
          'permissionIds must be a non-empty array'
        ));
      }

      // Trova il ruolo
      const role = await prisma.role.findFirst({
        where: {
          roleType,
          tenantId
        }
      });

      if (!role) {
        return res.status(404).json(createErrorResponse(
          'Ruolo non trovato',
          `Role with type '${roleType}' not found`
        ));
      }

      // Trova le assegnazioni esistenti
      const existingAssignments = await prisma.rolePermission.findMany({
        where: {
          roleId: role.id,
          permissionId: { in: permissionIds }
        },
        include: {
          permission: {
            include: {
              site: true
            }
          }
        }
      });

      if (existingAssignments.length === 0) {
        return res.status(404).json(createErrorResponse(
          'No permissions found',
          'None of the specified permissions are assigned to this role'
        ));
      }

      // Rimuovi le assegnazioni (soft delete)
      const removedAssignments = await prisma.rolePermission.updateMany({
        where: {
          roleId: role.id,
          permissionId: { in: permissionIds }
        },
        data: {
          isActive: false,
          deletedAt: new Date()
        }
      });

      // Dettagli dei permessi rimossi
      const removedPermissions = existingAssignments.map(assignment => ({
        id: assignment.permission.id,
        name: assignment.permission.name,
        action: assignment.permission.action,
        resource: assignment.permission.resource?.name || 'unknown',
        description: assignment.permission.description,
        removedAt: new Date().toISOString()
      }));

      logger.info('Permessi avanzati rimossi', {
        roleType,
        roleId: role.id,
        tenantId,
        userId: req.person?.id,
        removedCount: removedAssignments.count,
        requestedCount: permissionIds.length
      });

      res.json(createSuccessResponse({
        role: {
          id: role.id,
          roleType: role.roleType,
          name: role.name
        },
        removedPermissions,
        stats: {
          totalRequested: permissionIds.length,
          removed: removedAssignments.count,
          notFound: permissionIds.length - existingAssignments.length
        },
        removedAt: new Date().toISOString(),
        removedBy: req.person.id
      }, 'Advanced permissions removed successfully'));

    } catch (error) {
      logger.error('Error removing advanced permissions', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        roleType: req.params.roleType,
        requestData: req.body,
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id
      });

      res.status(500).json(createErrorResponse('Errore nella rimozione dei permessi avanzati'));
    }
  }
);

/**
 * PUT /api/roles/:roleType/advanced-permissions/sync
 * Sincronizza i permessi avanzati di un ruolo (sostituisce tutti i permessi)
 */
router.put('/:roleType/advanced-permissions/sync',
  validateAdvancedPermissions,
  requireRoleManagement,
  logRoleOperation('SYNC_ADVANCED_PERMISSIONS'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { roleType } = req.params;
      const { permissions } = req.body;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      if (!Array.isArray(permissions)) {
        return res.status(400).json(createErrorResponse(
          'Dati non validi',
          'permissions must be an array'
        ));
      }

      // Trova il ruolo
      const role = await prisma.role.findFirst({
        where: {
          roleType,
          tenantId,
          isActive: true
        }
      });

      if (!role) {
        return res.status(404).json(createErrorResponse(
          'Ruolo non trovato',
          `Role with type '${roleType}' not found or inactive`
        ));
      }

      // Se l\'array è vuoto, rimuovi tutti i permessi
      if (permissions.length === 0) {
        const removedCount = await prisma.rolePermission.updateMany({
          where: { roleId: role.id },
          data: {
            isActive: false,
            deletedAt: new Date()
          }
        });

        logger.info('All advanced permissions removed via sync', {
          roleType,
          roleId: role.id,
          tenantId,
          userId: req.person?.id,
          removedCount: removedCount.count
        });

        return res.json(createSuccessResponse({
          role: {
            id: role.id,
            roleType: role.roleType,
            name: role.name
          },
          operation: 'clear_all',
          removedCount: removedCount.count,
          syncedAt: new Date().toISOString()
        }, 'All advanced permissions removed successfully'));
      }

      // Verifica che tutti i permessi esistano
      const permissionIds = permissions.map(p => p.permissionId || p);
      const existingPermissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds },
          isActive: true
        }
      });

      if (existingPermissions.length !== permissionIds.length) {
        const foundIds = existingPermissions.map(p => p.id);
        const missingIds = permissionIds.filter(id => !foundIds.includes(id));
        return res.status(404).json(createErrorResponse(
          'Alcuni permessi non trovati',
          `Permissions with IDs ${missingIds.join(', ')} not found or inactive`
        ));
      }

      // Esegui la sincronizzazione in una transazione
      const syncResult = await prisma.$transaction(async (tx) => {
        // Rimuovi tutti i permessi esistenti
        const removedCount = await tx.rolePermission.updateMany({
          where: { roleId: role.id },
          data: {
            isActive: false,
            deletedAt: new Date()
          }
        });

        // Aggiungi i nuovi permessi
        const addedCount = await tx.rolePermission.createMany({
          data: permissionIds.map(permissionId => ({
            roleId: role.id,
            permissionId,
            assignedBy: req.person.id
          }))
        });

        return { removedCount: removedCount.count, addedCount: addedCount.count };
      });

      logger.info('Permessi avanzati sincronizzati', {
        roleType,
        roleId: role.id,
        tenantId,
        userId: req.person?.id,
        removedCount: syncResult.removedCount,
        addedCount: syncResult.addedCount,
        finalCount: permissionIds.length
      });

      res.json(createSuccessResponse({
        role: {
          id: role.id,
          roleType: role.roleType,
          name: role.name
        },
        operation: 'sync',
        stats: {
          removed: syncResult.removedCount,
          added: syncResult.addedCount,
          final: permissionIds.length
        },
        syncedAt: new Date().toISOString(),
        syncedBy: req.person.id
      }, 'Advanced permissions synchronized successfully'));

    } catch (error) {
      logger.error('Error syncing advanced permissions', {
        error: 'Operazione non riuscita',
        stack: error.stack,
        roleType: req.params.roleType,
        requestData: req.body,
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id
      });

      res.status(500).json(createErrorResponse('Errore nella sincronizzazione dei permessi avanzati'));
    }
  }
);

export default router;