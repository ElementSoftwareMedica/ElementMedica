/**
 * Hierarchy Routes - Gestione della gerarchia dei ruoli
 * 
 * Questo modulo gestisce tutte le operazioni relative alla gerarchia dei ruoli,
 * inclusi controlli gerarchici, assegnazioni e visualizzazione della struttura.
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

// Import del servizio (STATICO per evitare timeout)
import roleHierarchyService from '../../services/roleHierarchyService.js';

// Import dei middleware
import { 
  requireHierarchyManagement, 
  requireRoleAssignmentPermission 
} from './middleware/auth.js';
import { logRoleOperation, auditRoleChanges } from './middleware/logging.js';
import { 
  validateRoleAssignmentData, 
  validateRouteId, 
  validatePagination 
} from './middleware/validation.js';

// Import delle utilità
import { 
  createSuccessResponse, 
  createErrorResponse,
  createPaginationResponse,
  calculateOffset 
} from './utils/helpers.js';
import { filterRoleData, filterUserData } from './utils/filters.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/roles/hierarchy
 * Ottiene la gerarchia completa dei ruoli
 */
router.get('/', 
  requireHierarchyManagement,
  logRoleOperation('GET_ROLE_HIERARCHY'),
  async (req, res) => {
    try {
      const hierarchy = await roleHierarchyService.getRoleHierarchy(
        req.tenant?.id || req.person?.tenantId
      );

      logger.info('Role hierarchy retrieved', {
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id,
        hierarchySize: hierarchy?.length || 0
      });

      res.json(createSuccessResponse(hierarchy, 'Role hierarchy retrieved successfully'));
    } catch (error) {
      logger.error('Error retrieving role hierarchy', {
        error: error.message,
        stack: error.stack,
        tenantId: req.tenant?.id || req.person?.tenantId,
        userId: req.person?.id
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve role hierarchy',
        error.message
      ));
    }
  }
);

/**
 * GET /api/roles/hierarchy/user/:userId
 * Ottiene la gerarchia dei ruoli per un utente specifico
 */
router.get('/user/:userId',
  validateRouteId('userId'),
  requireHierarchyManagement,
  logRoleOperation('GET_USER_ROLE_HIERARCHY'),
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Verifica che l'utente esista e appartenga al tenant
      const user = await prisma.person.findFirst({
        where: {
          id: userId,
          tenantId: req.tenant?.id || req.person?.tenantId
        }
      });

      if (!user) {
        return res.status(404).json(createErrorResponse(
          'User not found',
          'The specified user does not exist or does not belong to your tenant'
        ));
      }

      const hierarchy = await roleHierarchyService.getUserRoleHierarchy(
        userId,
        req.tenant?.id || req.person?.tenantId
      );

      const assignableRoles = await roleHierarchyService.getAssignableRoles(
        req.person.id,
        req.tenant?.id || req.person?.tenantId
      );

      const assignablePermissions = await roleHierarchyService.getAssignablePermissions(
        req.person.id,
        req.tenant?.id || req.person?.tenantId
      );

      logger.info('User role hierarchy retrieved', {
        targetUserId: userId,
        requesterId: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId,
        hierarchySize: hierarchy?.length || 0,
        assignableRolesCount: assignableRoles?.length || 0
      });

      res.json(createSuccessResponse({
        user: filterUserData(user),
        hierarchy,
        assignableRoles,
        assignablePermissions
      }, 'User role hierarchy retrieved successfully'));
    } catch (error) {
      logger.error('Error retrieving user role hierarchy', {
        error: error.message,
        stack: error.stack,
        userId: req.params.userId,
        requesterId: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve user role hierarchy',
        error.message
      ));
    }
  }
);

/**
 * GET /api/roles/hierarchy/current-user
 * Ottiene la gerarchia dei ruoli per l'utente corrente
 */
router.get('/current-user',
  logRoleOperation('GET_CURRENT_USER_HIERARCHY'),
  async (req, res) => {
    try {
      const hierarchy = await roleHierarchyService.getUserRoleHierarchy(
        req.person.id,
        req.tenant?.id || req.person?.tenantId
      );

      const assignablePermissions = await roleHierarchyService.getAssignablePermissions(
        req.person.id,
        req.tenant?.id || req.person?.tenantId
      );

      logger.debug('Current user assignable permissions', {
        userId: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId,
        assignablePermissions: assignablePermissions?.length || 0
      });

      res.json(createSuccessResponse({
        hierarchy,
        assignablePermissions
      }, 'Current user role hierarchy retrieved successfully'));
    } catch (error) {
      logger.error('Error retrieving current user role hierarchy', {
        error: error.message,
        stack: error.stack,
        userId: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve current user role hierarchy',
        error.message
      ));
    }
  }
);

/**
 * POST /api/roles/hierarchy/assign
 * Assegna un ruolo con controllo gerarchico
 */
router.post('/assign',
  validateRoleAssignmentData,
  requireRoleAssignmentPermission,
  logRoleOperation('HIERARCHY_ROLE_ASSIGNMENT'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { personId, roleType, customRoleId } = req.body;

      // Verifica i permessi gerarchici
      const canAssign = await roleHierarchyService.canAssignRole(
        req.person.id,
        personId,
        roleType || customRoleId,
        req.tenant?.id || req.person?.tenantId
      );

      if (!canAssign) {
        return res.status(403).json(createErrorResponse(
          'Insufficient permissions',
          'You do not have permission to assign this role to this user'
        ));
      }

      // Esegui l'assegnazione
      const result = await roleHierarchyService.assignRoleWithHierarchy(
        personId,
        roleType,
        customRoleId,
        req.person.id,
        req.tenant?.id || req.person?.tenantId
      );

      logger.info('Role assigned with hierarchy control', {
        assignerId: req.person?.id,
        targetUserId: personId,
        roleType,
        customRoleId,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.json(createSuccessResponse(result, 'Role assigned successfully'));
    } catch (error) {
      logger.error('Error assigning role with hierarchy control', {
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
 * POST /api/roles/hierarchy/assign-permissions
 * Assegna permessi con controllo gerarchico
 */
router.post('/assign-permissions',
  requireRoleAssignmentPermission,
  logRoleOperation('HIERARCHY_PERMISSION_ASSIGNMENT'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { personId, permissions } = req.body;

      if (!personId || !Array.isArray(permissions)) {
        return res.status(400).json(createErrorResponse(
          'Invalid input',
          'personId and permissions array are required'
        ));
      }

      // Verifica i permessi gerarchici per ogni permesso
      const canAssignPermissions = await roleHierarchyService.canAssignPermissions(
        req.person.id,
        personId,
        permissions,
        req.tenant?.id || req.person?.tenantId
      );

      if (!canAssignPermissions) {
        return res.status(403).json(createErrorResponse(
          'Insufficient permissions',
          'You do not have permission to assign these permissions to this user'
        ));
      }

      // Esegui l'assegnazione dei permessi
      const result = await roleHierarchyService.assignPermissionsWithHierarchy(
        personId,
        permissions,
        req.person.id,
        req.tenant?.id || req.person?.tenantId
      );

      logger.info('Permissions assigned with hierarchy control', {
        assignerId: req.person?.id,
        targetUserId: personId,
        permissionsCount: permissions.length,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.json(createSuccessResponse(result, 'Permissions assigned successfully'));
    } catch (error) {
      logger.error('Error assigning permissions with hierarchy control', {
        error: error.message,
        stack: error.stack,
        assignerId: req.person?.id,
        requestData: req.body,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to assign permissions',
        error.message
      ));
    }
  }
);

/**
 * GET /api/roles/hierarchy/assignable/:roleType
 * Ottiene ruoli e permessi assegnabili per un tipo di ruolo specifico
 */
router.get('/assignable/:roleType',
  requireHierarchyManagement,
  logRoleOperation('GET_ASSIGNABLE_ROLES_PERMISSIONS'),
  async (req, res) => {
    try {
      const { roleType } = req.params;

      const assignableRoles = await roleHierarchyService.getAssignableRolesForType(
        req.person.id,
        roleType,
        req.tenant?.id || req.person?.tenantId
      );

      const assignablePermissions = await roleHierarchyService.getAssignablePermissionsForType(
        req.person.id,
        roleType,
        req.tenant?.id || req.person?.tenantId
      );

      logger.info('Assignable roles and permissions retrieved', {
        requesterId: req.person?.id,
        roleType,
        assignableRolesCount: assignableRoles?.length || 0,
        assignablePermissionsCount: assignablePermissions?.length || 0,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.json(createSuccessResponse({
        roleType,
        assignableRoles,
        assignablePermissions
      }, 'Assignable roles and permissions retrieved successfully'));
    } catch (error) {
      logger.error('Error retrieving assignable roles and permissions', {
        error: error.message,
        stack: error.stack,
        roleType: req.params.roleType,
        requesterId: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve assignable roles and permissions',
        error.message
      ));
    }
  }
);

/**
 * GET /api/roles/hierarchy/visible
 * Ottiene i ruoli visibili per l'utente corrente basati sulla sua gerarchia
 */
router.get('/visible',
  validatePagination,
  logRoleOperation('GET_VISIBLE_ROLES'),
  async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = calculateOffset(page, limit);

      // Calcola il livello dell'utente corrente
      const userLevel = await roleHierarchyService.getUserLevel(
        req.person.id,
        req.tenant?.id || req.person?.tenantId
      );

      // Ottieni i ruoli visibili basati sulla gerarchia
      const visibleRoles = await roleHierarchyService.getVisibleRoles(
        req.person.id,
        req.tenant?.id || req.person?.tenantId,
        { offset, limit: parseInt(limit) }
      );

      const totalCount = await roleHierarchyService.getVisibleRolesCount(
        req.person.id,
        req.tenant?.id || req.person?.tenantId
      );

      logger.info('Visible roles retrieved', {
        userId: req.person?.id,
        userLevel,
        visibleRolesCount: visibleRoles?.length || 0,
        totalCount,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      const paginationResponse = createPaginationResponse(
        visibleRoles,
        totalCount,
        page,
        limit
      );

      res.json(createSuccessResponse({
        userLevel,
        ...paginationResponse
      }, 'Visible roles retrieved successfully'));
    } catch (error) {
      logger.error('Error retrieving visible roles', {
        error: error.message,
        stack: error.stack,
        userId: req.person?.id,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to retrieve visible roles',
        error.message
      ));
    }
  }
);

/**
 * PUT /api/roles/hierarchy/move
 * Sposta un ruolo nella gerarchia
 */
router.put('/move',
  requireHierarchyManagement,
  logRoleOperation('MOVE_ROLE_HIERARCHY'),
  auditRoleChanges,
  async (req, res) => {
    try {
      const { roleId, newLevel, newParentId } = req.body;

      if (!roleId) {
        return res.status(400).json(createErrorResponse(
          'Invalid input',
          'roleId is required'
        ));
      }

      // Verifica i permessi per spostare il ruolo
      const canMove = await roleHierarchyService.canMoveRole(
        req.person.id,
        roleId,
        newLevel,
        newParentId,
        req.tenant?.id || req.person?.tenantId
      );

      if (!canMove) {
        return res.status(403).json(createErrorResponse(
          'Insufficient permissions',
          'You do not have permission to move this role in the hierarchy'
        ));
      }

      // Esegui lo spostamento
      const result = await roleHierarchyService.moveRoleInHierarchy(
        roleId,
        newLevel,
        newParentId,
        req.person.id,
        req.tenant?.id || req.person?.tenantId
      );

      logger.info('Role moved in hierarchy', {
        moverId: req.person?.id,
        roleId,
        newLevel,
        newParentId,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.json(createSuccessResponse(result, 'Role moved successfully in hierarchy'));
    } catch (error) {
      logger.error('Error moving role in hierarchy', {
        error: error.message,
        stack: error.stack,
        moverId: req.person?.id,
        requestData: req.body,
        tenantId: req.tenant?.id || req.person?.tenantId
      });

      res.status(500).json(createErrorResponse(
        'Failed to move role in hierarchy',
        error.message
      ));
    }
  }
);

export default router;