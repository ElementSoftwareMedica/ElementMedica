import express from 'express';
const router = express.Router();
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import tenantService from '../services/tenantService.js';
import enhancedRoleService from '../services/enhancedRoleService.js';
import { tenantMiddleware, validateUserTenant, requireSuperAdmin, isAdminOrSuperAdmin } from '../middleware/tenant.js';
import { authenticate } from '../middleware/auth.js';
const authenticateToken = authenticate;

/**
 * Routes per la gestione dei tenant
 * Week 12: Sistema Utenti Avanzato
 */

// Middleware di autenticazione per tutte le routes
router.use(authenticateToken);

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
      error: 'Errore nel recupero dei tenant',

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
    const { name, slug, domain, settings, billingPlan, enabledFeatures, companyData, adminData, secretaryAccounts } = req.body;

    // Validazione input
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        error: 'Nome e slug sono obbligatori'
      });
    }

    // Validazione slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({
        success: false,
        error: 'Lo slug può contenere solo lettere minuscole, numeri e trattini'
      });
    }

    // Validazione adminData se fornito
    if (adminData) {
      if (!adminData.firstName || !adminData.lastName || !adminData.email || !adminData.password) {
        return res.status(400).json({
          success: false,
          error: 'I dati amministratore richiedono: firstName, lastName, email, password'
        });
      }
      // Password complexity: min 8 chars, almeno 1 maiuscola, 1 minuscola, 1 numero
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(adminData.password)) {
        return res.status(400).json({
          success: false,
          error: 'La password deve avere almeno 8 caratteri, una maiuscola, una minuscola e un numero'
        });
      }
      // Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminData.email)) {
        return res.status(400).json({
          success: false,
          error: 'Formato email amministratore non valido'
        });
      }
      // TaxCode validation if provided
      if (adminData.taxCode && !/^[A-Z0-9]{16}$/i.test(adminData.taxCode)) {
        return res.status(400).json({
          success: false,
          error: 'Formato Codice Fiscale amministratore non valido'
        });
      }
    }

    // Validazione secretaryAccounts se forniti
    if (secretaryAccounts && Array.isArray(secretaryAccounts)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      for (const secretary of secretaryAccounts) {
        if (!secretary.firstName || !secretary.lastName || !secretary.email || !secretary.password) {
          return res.status(400).json({
            success: false,
            error: 'Ogni account segreteria richiede: firstName, lastName, email, password'
          });
        }
        if (!emailRegex.test(secretary.email)) {
          return res.status(400).json({
            success: false,
            error: 'Formato email account segreteria non valido'
          });
        }
        if (!passwordRegex.test(secretary.password)) {
          return res.status(400).json({
            success: false,
            error: 'La password segreteria deve avere almeno 8 caratteri, una maiuscola, una minuscola e un numero'
          });
        }
      }
    }

    // Validazione companyData se fornito
    if (companyData) {
      if (companyData.piva && !/^[0-9]{11}$/.test(companyData.piva)) {
        return res.status(400).json({ success: false, error: 'La Partita IVA deve essere di 11 cifre' });
      }
      if (companyData.codiceFiscale && !/^[A-Z0-9]{11,16}$/i.test(companyData.codiceFiscale)) {
        return res.status(400).json({ success: false, error: 'Formato Codice Fiscale azienda non valido' });
      }
      if (companyData.sedeLegaleCap && !/^[0-9]{5}$/.test(companyData.sedeLegaleCap)) {
        return res.status(400).json({ success: false, error: 'Il CAP deve essere di 5 cifre' });
      }
      if (companyData.sdi && !/^[A-Z0-9]{7}$/i.test(companyData.sdi)) {
        return res.status(400).json({ success: false, error: 'Il codice SDI deve essere di 7 caratteri' });
      }
    }

    const tenant = await tenantService.createTenant({
      name,
      slug,
      domain,
      settings,
      billingPlan,
      enabledFeatures,
      companyData,
      adminData,
      secretaryAccounts: secretaryAccounts || []
    });

    res.status(201).json({
      success: true,
      data: tenant,
      message: 'Tenant created successfully'
    });
  } catch (error) {
    logger.error({ component: 'tenants', action: 'createTenant', userId: req.person?.id, error: error.message }, 'Error creating tenant');

    res.status(500).json({
      success: false,
      error: 'Errore nella creazione del tenant'
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
    logger.error({ component: 'tenants', error: 'Operazione non riuscita', stack: error.stack }, 'Error getting current tenant');
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle informazioni tenant'
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

    // Verifica permessi — ADMIN e SUPER_ADMIN possono accedere a tutti i tenant
    if (!isAdminOrSuperAdmin(user) && user.tenantId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato'
      });
    }

    const tenant = await tenantService.getTenantById(id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant non trovato'
      });
    }

    // Ottieni statistiche se autorizzato
    let stats = null;
    if (isAdminOrSuperAdmin(user) || user.tenantId === id) {
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
      error: 'Errore nel recupero del tenant'
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
    let updateData = req.body;

    // Verifica permessi
    const isAdmin = isAdminOrSuperAdmin(user);
    // Short-circuit: skip hasPermission call when user is already a global admin
    const isTenantAdmin = !isAdmin && user.tenantId === id &&
      await enhancedRoleService.hasPermission(user.id, 'tenants:update', { tenantId: id });

    if (!isAdmin && !isTenantAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato'
      });
    }

    // Limita i campi che possono essere modificati da tenant admin
    if (!isAdmin) {
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
      message: 'Tenant aggiornato con successo'
    });
  } catch (error) {
    logger.error({ component: 'tenants', action: 'updateTenant', tenantId: req.params.id, userId: req.person?.id, error: error.message, stack: error.stack }, 'Error updating tenant');

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Errore interno del server'
      });
    }

    // Prisma P2025: record non trovato
    if (error.code === 'P2025' || error.message?.includes('Record to update not found')) {
      return res.status(404).json({
        success: false,
        error: 'Tenant non trovato'
      });
    }

    if (error.message === 'Nessun campo da aggiornare fornito') {
      return res.status(400).json({
        success: false,
        error: 'Nessun campo da aggiornare'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore nell\'aggiornamento del tenant'
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
      error: 'Errore nell\'eliminazione del tenant'
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
    if (!isAdminOrSuperAdmin(user) && user.tenantId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato'
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
      error: 'Errore nel recupero delle statistiche del tenant'
    });
  }
});

/**
 * @route GET /api/tenants/:id/features
 * @desc Ottiene le feature flags di un tenant
 * @access Super Admin or Tenant Admin
 */
router.get('/:id/features', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.person;

    if (!isAdminOrSuperAdmin(user) && user.tenantId !== id) {
      return res.status(403).json({ success: false, error: 'Accesso negato' });
    }

    const features = await prisma.tenantFeature.findMany({
      where: { tenantId: id, deletedAt: null },
      orderBy: { featureKey: 'asc' }
    });

    res.json({ success: true, data: features });
  } catch (error) {
    logger.error({ component: 'tenants', error: error.message }, 'Errore recupero features tenant');
    res.status(500).json({ success: false, error: 'Errore nel recupero delle features' });
  }
});

/**
 * @route PUT /api/tenants/:id/features/:featureKey
 * @desc Abilita/disabilita una feature per un tenant
 * @access Super Admin only
 */
router.put('/:id/features/:featureKey', requireSuperAdmin, async (req, res) => {
  try {
    const { id, featureKey } = req.params;
    const { isEnabled, config, validUntil, usageLimit, notes } = req.body;

    const feature = await prisma.tenantFeature.upsert({
      where: { tenantId_featureKey: { tenantId: id, featureKey } },
      update: {
        isEnabled: isEnabled ?? true,
        ...(config !== undefined && { config }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(usageLimit !== undefined && { usageLimit }),
        ...(notes !== undefined && { notes }),
        enabledBy: req.person.id,
        enabledAt: new Date(),
      },
      create: {
        tenantId: id,
        featureKey,
        isEnabled: isEnabled ?? true,
        config: config || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        usageLimit: usageLimit || null,
        notes: notes || null,
        enabledBy: req.person.id,
        enabledAt: new Date(),
      }
    });

    res.json({ success: true, data: feature });
  } catch (error) {
    logger.error({ component: 'tenants', error: error.message }, 'Errore aggiornamento feature tenant');
    res.status(500).json({ success: false, error: 'Errore nell\'aggiornamento della feature' });
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
        error: 'Errore nell\'assegnazione del ruolo'
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
        error: 'Errore nell\'eliminazione del ruolo'
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
        error: 'Accesso negato'
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
      error: 'Errore nel recupero dei ruoli utente'
    });
  }
});

export default router;