import express from 'express';
import prisma from '../../config/prisma-optimization.js';
import authMiddleware from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import logger from '../../utils/logger.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const { authenticate } = authMiddleware;
const router = express.Router();

const SUPPLEMENTAL_RESOURCE_ACTION_PERMISSIONS = [
  'clinica.agenda:read',
  'clinica.agenda:create',
  'clinica.agenda:update',
  'clinica.agenda:delete',
  'clinica.agenda:manage',
  'clinica.medici:read',
  'clinica.medici:create',
  'clinica.medici:update',
  'clinica.medici:delete',
  'clinica.medici:manage',
  'clinica.listini:read',
  'clinica.listini:create',
  'clinica.listini:update',
  'clinica.listini:delete',
  'clinica.listini:manage',
  'clinica.poliambulatorio:read',
  'clinica.poliambulatorio:create',
  'clinica.poliambulatorio:update',
  'clinica.poliambulatorio:delete',
  'clinica.poliambulatorio:write',
  'clinica.poliambulatorio:manage',
];

const VALID_ADVANCED_SCOPES = new Set(['none', 'all', 'tenant', 'own', 'relational']);

function buildPermissionRegistry() {
  const registry = new Map();
  for (const permission of [...Object.values(PERMISSIONS), ...SUPPLEMENTAL_RESOURCE_ACTION_PERMISSIONS]) {
    if (typeof permission !== 'string' || !permission.includes(':')) continue;
    const [resource, action] = permission.split(':');
    if (!resource || !action) continue;
    if (!registry.has(resource)) registry.set(resource, new Set());
    registry.get(resource).add(action);
  }
  return registry;
}

const PERMISSION_REGISTRY = buildPermissionRegistry();

function validateResourceActionPermission(resource, action, scope) {
  if (!resource || !action) {
    return 'Risorsa e azione sono obbligatori';
  }
  if (!PERMISSION_REGISTRY.has(resource)) {
    return 'Risorsa permesso non supportata';
  }
  if (!PERMISSION_REGISTRY.get(resource).has(action)) {
    return 'Azione non supportata per questa risorsa';
  }
  if (scope && !VALID_ADVANCED_SCOPES.has(scope)) {
    return 'Ambito permesso non supportato';
  }
  return null;
}

/**
 * @route GET /api/v1/users
 * @desc Get all users with their roles and permissions
 * @access Admin only
 */
router.get('/users', authenticate, requirePermission(['users:read', 'system:manage']), async (req, res) => {
  try {
    const users = await prisma.person.findMany({
      where: {
        tenantProfiles: {
          some: { tenantId: getEffectiveTenantId(req), deletedAt: null }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tenantProfiles: {
          where: { tenantId: getEffectiveTenantId(req), deletedAt: null },
          select: { email: true, status: true },
          take: 1
        },
        personRoles: {
          where: { tenantId: getEffectiveTenantId(req) },
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
      email: user.tenantProfiles?.[0]?.email || '',
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.tenantProfiles?.[0]?.status === 'ACTIVE',
      roles: user.personRoles.map(pr => pr.roleType),
      permissions: [...new Set(user.personRoles.flatMap(pr =>
        pr.permissions.map(p => p.permission)
      ))]
    }));

    res.json({ data: formattedUsers });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * @route GET /api/v1/permissions
 * @desc Get all available permissions
 * @access Admin only
 */
router.get('/permissions', authenticate, requirePermission(['system:manage']), async (req, res) => {
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
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * @route GET /api/v1/roles
 * @desc Get all available roles with their permissions
 * @access Admin only
 */
router.get('/roles', authenticate, requirePermission(['system:manage']), async (req, res) => {
  try {
    // Get all role types from enum
    const roleTypes = ['ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'MANAGER', 'TRAINER'];

    const roles = await Promise.all(roleTypes.map(async (roleType) => {
      // Get PersonRoles of this type with their permissions
      const personRoles = await prisma.personRole.findMany({
        where: {
          roleType: roleType,
          tenantId: getEffectiveTenantId(req)
        },
        include: {
          permissions: {
            where: {
              isGranted: true,
              deletedAt: null
            },
            select: {
              permission: true
            }
          }
        },
        take: 1 // We just need one example to get the permissions structure
      });

      // Get unique permissions for this role type
      const allPermissions = new Set();
      personRoles.forEach(role => {
        role.permissions.forEach(p => {
          allPermissions.add(p.permission);
        });
      });

      return {
        id: roleType,
        name: roleType,
        displayName: roleType.charAt(0) + roleType.slice(1).toLowerCase().replace('_', ' '),
        permissions: Array.from(allPermissions)
      };
    }));

    res.json({ data: roles });
  } catch (error) {
    logger.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * @route PUT /api/v1/users/:personId/permissions
 * @desc Update user permissions
 * @access Admin only
 */
router.put('/users/:personId/permissions', authenticate, requirePermission(['system:manage']), async (req, res) => {
  try {
    const { personId } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'I permessi devono essere un array' });
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
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Per ora, aggiorniamo i permessi tramite i ruoli
    // In futuro si potrebbe implementare un sistema di permessi diretti per utente

    res.json({
      message: 'Permessi utente aggiornati con successo',
      personId: personId,
      permissions
    });
  } catch (error) {
    logger.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * @route PUT /api/v1/roles/:id
 * @desc Update role permissions
 * @access Admin only
 */
router.put('/roles/:id', authenticate, requirePermission(['system:manage']), async (req, res) => {
  try {
    const { id: roleType } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'I permessi devono essere un array' });
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
      message: 'Permessi del ruolo aggiornati con successo',
      roleType,
      permissions
    });
  } catch (error) {
    logger.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * @route GET /api/v1/permissions/person/:personId
 * @desc Get custom/advanced permissions for a specific person
 * @access Admin only
 */
router.get('/permissions/person/:personId', authenticate, requirePermission(['system:manage', 'persons:manage']), async (req, res) => {
  try {
    const { personId } = req.params;
    const tenantId = getEffectiveTenantId(req);

    // Get person's roles for this tenant
    const personRoles = await prisma.personRole.findMany({
      where: { personId, tenantId },
      select: { id: true }
    });

    if (personRoles.length === 0) {
      return res.json({ data: [] });
    }

    const personRoleIds = personRoles.map(pr => pr.id);

    // Get advanced permissions for all of this person's roles
    const advancedPerms = await prisma.advancedPermission.findMany({
      where: {
        personRoleId: { in: personRoleIds },
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map to frontend format
    const data = advancedPerms.map(p => ({
      id: p.id,
      personId,
      resource: p.resource,
      action: p.action,
      scope: p.scope,
      granted: p.conditions?.granted !== false,
      reason: p.conditions ? JSON.stringify(p.conditions) : undefined,
      createdAt: p.createdAt.toISOString(),
    }));

    res.json({ data });
  } catch (error) {
    logger.error('Error fetching person permissions:', error);
    res.status(500).json({ error: 'Errore nel recupero dei permessi' });
  }
});

/**
 * @route POST /api/v1/permissions/person/:personId
 * @desc Add a custom permission for a specific person
 * @access Admin only
 */
router.post('/permissions/person/:personId', authenticate, requirePermission(['system:manage', 'persons:manage']), async (req, res) => {
  try {
    const { personId } = req.params;
    const tenantId = getEffectiveTenantId(req);
    const { resource, action, scope, granted, reason } = req.body;

    if (!resource || !action) {
      return res.status(400).json({ error: 'Risorsa e azione sono obbligatori' });
    }

    const validationError = validateResourceActionPermission(resource, action, scope || 'tenant');
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Find or get first PersonRole for this person + tenant
    let personRole = await prisma.personRole.findFirst({
      where: { personId, tenantId }
    });

    if (!personRole) {
      return res.status(404).json({ error: 'Nessun ruolo trovato per questa persona nel tenant' });
    }

    // Create advanced permission
    const permission = await prisma.advancedPermission.create({
      data: {
        personRoleId: personRole.id,
        resource,
        action,
        scope: scope || 'tenant',
        conditions: { ...(reason ? { reason } : {}), granted: granted !== false },
      }
    });

    res.status(201).json({
      data: {
        id: permission.id,
        personId,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope,
        granted: granted !== false,
        reason,
        createdAt: permission.createdAt.toISOString(),
      }
    });
  } catch (error) {
    logger.error('Error adding person permission:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta del permesso' });
  }
});

/**
 * @route DELETE /api/v1/permissions/person/:personId/:permissionId
 * @desc Remove a custom permission for a specific person
 * @access Admin only
 */
router.delete('/permissions/person/:personId/:permissionId', authenticate, requirePermission(['system:manage', 'persons:manage']), async (req, res) => {
  try {
    const { permissionId } = req.params;
    const tenantId = getEffectiveTenantId(req);

    // Verify permission exists and belongs to a role in this tenant
    const permission = await prisma.advancedPermission.findUnique({
      where: { id: permissionId },
      include: { personRole: { select: { tenantId: true } } }
    });

    if (!permission || permission.personRole.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Permesso non trovato' });
    }

    // Soft delete
    await prisma.advancedPermission.update({
      where: { id: permissionId },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Permesso rimosso con successo' });
  } catch (error) {
    logger.error('Error removing person permission:', error);
    res.status(500).json({ error: 'Errore nella rimozione del permesso' });
  }
});

export default router;
