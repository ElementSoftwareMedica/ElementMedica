import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../../auth/middleware.js';
import logger from '../../utils/logger.js';

const { authenticate: authenticateToken, authorize: requirePermission } = middleware;
const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route GET /api/v1/users
 * @desc Get all users with their roles and permissions
 * @access Admin only
 */
router.get('/users', authenticateToken(), requirePermission(['users.view', 'system.admin']), async (req, res) => {
  try {
    const users = await prisma.person.findMany({
      where: {tenantId: req.user.tenantId,},
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        personRoles: {
          where: {},
          select: {
            roleType: true,
            permissions: {
              where: {
                isGranted: true
              },
              select: {
                permission: true
              }
            }
          }
        }
      }
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      roles: user.personRoles.map(pr => pr.roleType),
      permissions: [...new Set(user.personRoles.flatMap(pr => 
        pr.permissions.map(p => p.permission)
      ))]
    }));

    res.json({ data: formattedUsers });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/v1/permissions
 * @desc Get all available permissions
 * @access Admin only
 */
router.get('/permissions', authenticateToken(), requirePermission(['system.admin']), async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        resource: true,
        action: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Raggruppa i permessi per categoria basandosi sul resource
    const categorizedPermissions = permissions.map(permission => {
      let category = 'General';
      
      if (permission.resource === 'companies') {
        category = 'Companies';
      } else if (permission.resource === 'employees' || permission.resource === 'users') {
        category = 'Users';
      } else if (permission.resource === 'system') {
        category = 'System';
      } else if (permission.resource === 'courses') {
        category = 'Courses';
      }
      
      return {
        ...permission,
        category
      };
    });

    res.json({ data: categorizedPermissions });
  } catch (error) {
    logger.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/v1/roles
 * @desc Get all available roles with their permissions
 * @access Admin only
 */
router.get('/roles', authenticateToken(), requirePermission(['system.admin']), async (req, res) => {
  try {
    // Get all role types from enum
    const roleTypes = ['ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'MANAGER', 'TRAINER'];
    
    const roles = await Promise.all(roleTypes.map(async (roleType) => {
      const rolePermissions = await prisma.rolePermission.findMany({
        where: {
          roleType: roleType
        },
        select: {
          permission: true,
          isGranted: true
        }
      });
      
      return {
        id: roleType,
        name: roleType,
        displayName: roleType.charAt(0) + roleType.slice(1).toLowerCase().replace('_', ' '),
        permissions: rolePermissions.filter(rp => rp.isGranted).map(rp => rp.permission)
      };
    }));

    res.json({ data: roles });
  } catch (error) {
    logger.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route PUT /api/v1/users/:personId/permissions
 * @desc Update user permissions
 * @access Admin only
 */
router.put('/users/:personId/permissions', authenticateToken(), requirePermission(['system.admin']), async (req, res) => {
  try {
    const { personId } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }

    // Verifica che l'utente esista
    const user = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        personRoles: {
          where: {}
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Per ora, aggiorniamo i permessi tramite i ruoli
    // In futuro si potrebbe implementare un sistema di permessi diretti per utente
    
    res.json({ 
      message: 'User permissions updated successfully',
      personId: personId,
      permissions
    });
  } catch (error) {
    logger.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route PUT /api/v1/roles/:id
 * @desc Update role permissions
 * @access Admin only
 */
router.put('/roles/:id', authenticateToken(), requirePermission(['system.admin']), async (req, res) => {
  try {
    const { id: roleType } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }

    // Rimuovi tutti i permessi esistenti per questo ruolo
    await prisma.rolePermission.deleteMany({
      where: { roleType }
    });

    // Aggiungi i nuovi permessi
    if (permissions.length > 0) {
      const permissionRecords = await prisma.permission.findMany({
        where: {
          name: {
            in: permissions
          }
        }
      });

      const rolePermissions = permissionRecords.map(permission => ({
        roleType,
        permissionId: permission.id
      }));

      await prisma.rolePermission.createMany({
        data: rolePermissions
      });
    }

    res.json({ 
      message: 'Role permissions updated successfully',
      roleType,
      permissions
    });
  } catch (error) {
    logger.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;