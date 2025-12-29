import express from 'express';
const router = express.Router();
import logger from '../utils/logger.js';
import tenantService from '../services/tenantService.js';
import enhancedRoleService from '../services/enhancedRoleService.js';
import { tenantMiddleware, validateUserTenant, requireSuperAdmin } from '../middleware/tenant.js';
import middleware from '../auth/middleware.js';
const { authenticate: authenticateToken } = middleware;

/**
 * Routes per la gestione dei tenant
 * Week 12: Sistema Utenti Avanzato
 */

// Middleware di autenticazione per tutte le routes
router.use(authenticateToken());

/**
 * @route GET /api/tenants
 * @desc Lista tutti i tenant (solo super admin)
 * @access Super Admin
 */
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isActive, billingPlan } = req.query;

    const filters = {};
    if (search) filters.search = search;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (billingPlan) filters.billingPlan = billingPlan;

    const result = await tenantService.listAllTenants(
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.json({
      success: true,
      data: result.tenants,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error({ component: 'tenants', error: error.message }, 'Error listing tenants');
    res.status(500).json({
      success: false,
      error: 'Failed to list tenants',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/tenants
 * @desc Crea un nuovo tenant (solo super admin)
 * @access Super Admin
 */
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const { name, slug, domain, settings, billingPlan, enabledFeatures } = req.body;

    // Validazione input
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        error: 'Name and slug are required'
      });
    }

    // Validazione slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({
        success: false,
        error: 'Slug must contain only lowercase letters, numbers, and hyphens'
      });
    }

    const tenant = await tenantService.createTenant({
      name,
      slug,
      domain,
      settings,
      billingPlan,
      enabledFeatures
    });

    res.status(201).json({
      success: true,
      data: tenant,
      message: 'Tenant created successfully'
    });
  } catch (error) {
    logger.error({ component: 'tenants', error: error.message }, 'Error creating tenant');

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create tenant',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/tenants/current
 * @desc Ottiene informazioni sul tenant corrente
 * @access Authenticated
 */
router.get('/current', tenantMiddleware, validateUserTenant, async (req, res) => {
  try {
    logger.info({ component: 'tenants', userId: req.person?.id }, 'Getting current tenant for user');
    logger.info({ component: 'tenants', tenantId: req.person?.tenantId }, 'User tenant ID');
    logger.info({ component: 'tenants', tenantId: req.tenant?.id }, 'Tenant from middleware');

    const tenant = req.tenant;

    if (!tenant) {
      logger.error({ component: 'tenants' }, 'No tenant found in request');
      return res.status(400).json({
        success: false,
        error: 'No tenant information available'
      });
    }

    logger.info({ component: 'tenants', tenantId: tenant.id }, 'Getting stats for tenant');
    // Ottieni statistiche del tenant
    const stats = await tenantService.getTenantStats(tenant.id);

    logger.info({ component: 'tenants', tenantId: tenant.id }, 'Getting billing info for tenant');
    // Ottieni limiti del piano
    const billingInfo = await tenantService.checkBillingLimits(tenant.id);

    logger.info({ component: 'tenants' }, 'Successfully retrieved tenant information');
    res.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
          settings: tenant.settings,
          subscriptionPlan: tenant.subscriptionPlan,
          isActive: tenant.isActive,
          createdAt: tenant.createdAt
        },
        statistics: stats,
        billing: billingInfo
      }
    });
  } catch (error) {
    logger.error({ component: 'tenants', error: error.message, stack: error.stack }, 'Error getting current tenant');
    res.status(500).json({
      success: false,
      error: 'Failed to get tenant information'
    });
  }
});

/**
 * @route GET /api/tenants/:id
 * @desc Ottiene un tenant specifico
 * @access Super Admin or Tenant Admin
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.person;

    // Verifica permessi
    if (user.globalRole !== 'SUPER_ADMIN' && user.companyId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const tenant = await tenantService.getTenantById(id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // Ottieni statistiche se autorizzato
    let stats = null;
    if (user.globalRole === 'SUPER_ADMIN' || user.companyId === id) {
      stats = await tenantService.getTenantStats(id);
    }

    res.json({
      success: true,
      data: {
        tenant,
        statistics: stats
      }
    });
  } catch (error) {
    logger.error({ component: 'tenants', error: error.message }, 'Error getting tenant');
    res.status(500).json({
      success: false,
      error: 'Failed to get tenant'
    });
  }
});

/**
 * @route PUT /api/tenants/:id
 * @desc Aggiorna un tenant
 * @access Super Admin or Tenant Admin
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.person;
    const updateData = req.body;

    // Verifica permessi
    const isSuperAdmin = user.globalRole === 'SUPER_ADMIN';
    const isTenantAdmin = user.companyId === id &&
      await enhancedRoleService.hasPermission(user.id, 'companies.update', { tenantId: id });

    if (!isSuperAdmin && !isTenantAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Limita i campi che possono essere modificati da tenant admin
    if (!isSuperAdmin) {
      const allowedFields = ['name', 'settings'];
      const filteredData = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });
      updateData = filteredData;
    }

    const updatedTenant = await tenantService.updateTenant(id, updateData);

    res.json({
      success: true,
      data: updatedTenant,
      message: 'Tenant updated successfully'
    });
  } catch (error) {
    logger.error({ component: 'tenants', error: error.message }, 'Error updating tenant');

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update tenant'
    });
  }
});

/**
 * @route DELETE /api/tenants/:id
 * @desc Elimina un tenant (solo super admin)
 * @access Super Admin
 */
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await tenantService.deleteTenant(id);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error({ component: 'tenants', error: error.message }, 'Error deleting tenant');
    res.status(500).json({
      success: false,
      error: 'Failed to delete tenant'
    });
  }
});

/**
 * @route GET /api/tenants/:id/stats
 * @desc Ottiene statistiche dettagliate di un tenant
 * @access Super Admin or Tenant Admin
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.person;

    // Verifica permessi
    if (user.globalRole !== 'SUPER_ADMIN' && user.companyId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const [stats, billingInfo, roleStats] = await Promise.all([
      tenantService.getTenantStats(id),
      tenantService.checkBillingLimits(id),
      enhancedRoleService.getRoleStatistics(id)
    ]);

    res.json({
      success: true,
      data: {
        usage: stats,
        billing: billingInfo,
        roles: roleStats
      }
    });
  } catch (error) {
    logger.error({ component: 'tenants', error: error.message }, 'Error getting tenant stats');
    res.status(500).json({
      success: false,
      error: 'Failed to get tenant statistics'
    });
  }
});

/**
 * @route POST /api/tenants/:id/users/:personId/roles
 * @desc Assegna un ruolo a una persona nel tenant
 * @access Tenant Admin with user management permissions
 */
router.post('/:id/users/:personId/roles',
  enhancedRoleService.requirePermission('roles:manage'),
  async (req, res) => {
    try {
      const { id: tenantId, personId } = req.params;
      const { roleType, companyId, departmentId, expiresAt, customPermissions } = req.body;

      if (!roleType) {
        return res.status(400).json({
          success: false,
          error: 'Role type is required'
        });
      }

      const role = await enhancedRoleService.assignRole(personId, tenantId, roleType, {
        companyId,
        departmentId,
        assignedBy: req.person.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        customPermissions
      });

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role assigned successfully'
      });
    } catch (error) {
      logger.error({ component: 'tenants', error: error.message }, 'Error assigning role');
      res.status(500).json({
        success: false,
        error: 'Failed to assign role'
      });
    }
  }
);

/**
 * @route DELETE /api/tenants/:id/users/:personId/roles/:roleType
 * @desc Rimuove un ruolo da una persona
 * @access Tenant Admin with user management permissions
 */
router.delete('/:id/users/:personId/roles/:roleType',
  enhancedRoleService.requirePermission('roles:manage'),
  async (req, res) => {
    try {
      const { id: tenantId, personId, roleType } = req.params;
      const { companyId } = req.query;

      const success = await enhancedRoleService.removeRole(
        personId,
        tenantId,
        roleType,
        companyId || null
      );

      if (success) {
        res.json({
          success: true,
          message: 'Role removed successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }
    } catch (error) {
      logger.error({ component: 'tenants', error: error.message }, 'Error removing role');
      res.status(500).json({
        success: false,
        error: 'Failed to remove role'
      });
    }
  }
);

/**
 * @route GET /api/tenants/:id/users/:personId/roles
 * @desc Ottiene tutti i ruoli di una persona
 * @access Tenant Admin or Self
 */
router.get('/:id/users/:personId/roles', async (req, res) => {
  try {
    const { id: tenantId, personId } = req.params;
    const user = req.person;

    // Verifica permessi: può vedere i propri ruoli o essere admin
    const canView = user.id === personId ||
      await enhancedRoleService.hasPermission(user.id, 'users.read', { tenantId });

    if (!canView) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const roles = await enhancedRoleService.getUserRoles(personId, tenantId);
    const permissions = await enhancedRoleService.getUserPermissions(personId, tenantId);

    res.json({
      success: true,
      data: {
        roles,
        permissions
      }
    });
  } catch (error) {
    logger.error({ component: 'tenants', error: error.message }, 'Error getting user roles');
    res.status(500).json({
      success: false,
      error: 'Failed to get user roles'
    });
  }
});

export default router;