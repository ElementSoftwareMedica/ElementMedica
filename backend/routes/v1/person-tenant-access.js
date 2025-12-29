/**
 * PersonTenantAccess API Routes
 * 
 * Gestione accessi multi-tenant per utenti
 * 
 * @module routes/v1/person-tenant-access
 * @project 43 - Tenant Roles Management System
 */

import express from 'express';
import { personTenantAccessService, AVAILABLE_FEATURES, FEATURE_PRESETS } from '../../services/PersonTenantAccessService.js';
import { authMiddleware, requirePermission } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

const router = express.Router();

// ================================================
// PERSON TENANT ACCESS ROUTES
// ================================================

/**
 * GET /api/v1/person-tenant-access/features
 * Ottiene la lista delle features disponibili
 */
router.get('/features',
  authMiddleware,
  async (req, res) => {
    try {
      const features = AVAILABLE_FEATURES.map(id => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        description: getFeatureDescription(id)
      }));

      res.json({
        success: true,
        data: features
      });
    } catch (error) {
      logger.error('Error fetching features', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch features' });
    }
  }
);

/**
 * GET /api/v1/person-tenant-access/presets
 * Ottiene i preset di features per i diversi tipi di tenant
 */
router.get('/presets',
  authMiddleware,
  async (req, res) => {
    try {
      const presets = Object.values(FEATURE_PRESETS);

      res.json({
        success: true,
        data: presets,
        meta: {
          total: presets.length,
          availableFeatures: AVAILABLE_FEATURES
        }
      });
    } catch (error) {
      logger.error('Error fetching feature presets', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch feature presets' });
    }
  }
);

/**
 * Helper: Ottiene la descrizione di una feature
 */
function getFeatureDescription(featureId) {
  const descriptions = {
    formazione: 'Gestione corsi, attestati e formazione aziendale',
    medica: 'Gestione visite mediche, poliambulatori e pazienti',
    fatturazione: 'Sistema di fatturazione e gestione finanziaria',
    cms: 'Gestione contenuti e pagine pubbliche',
    gdpr: 'Conformità GDPR e gestione privacy',
    reports: 'Report e analytics avanzati',
    hr: 'Gestione risorse umane e dipendenti',
    documents: 'Gestione documenti e templates',
  };
  return descriptions[featureId] || `Feature: ${featureId}`;
}

/**
 * GET /api/v1/person-tenant-access
 * Ottiene tutti gli accessi tenant (admin only)
 */
router.get('/',
  authMiddleware,
  requirePermission('USER_MANAGEMENT'),
  async (req, res) => {
    try {
      const { tenantId, personId, page = 1, limit = 100 } = req.query;

      const where = {
        deletedAt: null
      };

      if (tenantId) where.tenantId = tenantId;
      if (personId) where.personId = personId;

      const [accesses, total] = await Promise.all([
        prisma.personTenantAccess.findMany({
          where,
          include: {
            person: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            tenant: {
              select: { id: true, name: true, slug: true }
            }
          },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.personTenantAccess.count({ where })
      ]);

      return res.json({
        success: true,
        data: accesses,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'getAllAccesses',
        error: error.message
      }, 'Error getting all tenant accesses');

      return res.status(500).json({
        success: false,
        error: 'Failed to get tenant accesses'
      });
    }
  }
);

/**
 * GET /api/v1/person-tenant-access/features
 * Restituisce la lista delle features disponibili
 * NOTE: Questa route DEVE essere prima delle route con parametri (:accessId)
 */
// NOTA: L'endpoint /features è già definito sopra, rimuovo questa duplicazione
// router.get('/features', authMiddleware, (req, res) => { ... });

/**
 * GET /api/v1/person-tenant-access/my-tenants
 * Ottiene i tenant accessibili dall'utente corrente
 */
router.get('/my-tenants', authMiddleware, async (req, res) => {
  try {
    const personId = req.person.id;
    const globalRole = req.person.globalRole;

    const tenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);

    return res.json({
      success: true,
      data: tenants,
      meta: {
        total: tenants.length,
        features: AVAILABLE_FEATURES
      }
    });

  } catch (error) {
    logger.error({
      component: 'person-tenant-access-routes',
      action: 'getMyTenants',
      personId: req.person?.id,
      error: error.message
    }, 'Error getting accessible tenants');

    return res.status(500).json({
      success: false,
      error: 'Failed to get accessible tenants'
    });
  }
});

/**
 * POST /api/v1/person-tenant-access/switch-tenant
 * Cambia il tenant corrente per l'utente
 * 
 * Nota: Non genera un nuovo token per semplicità.
 * Il frontend salva il tenantId nel localStorage e lo invia negli header successivi.
 */
router.post('/switch-tenant', authMiddleware, async (req, res) => {
  try {
    const personId = req.person.id;
    const globalRole = req.person.globalRole;
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    // Verifica che l'utente abbia accesso al tenant richiesto
    const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);
    const targetTenant = accessibleTenants.find(t => t.id === tenantId);

    if (!targetTenant) {
      logger.warn({
        component: 'person-tenant-access-routes',
        action: 'switchTenant',
        personId,
        tenantId,
        reason: 'Tenant not accessible'
      }, 'Unauthorized tenant switch attempt');

      return res.status(403).json({
        success: false,
        error: 'Non hai accesso a questo tenant'
      });
    }

    // Log dell'operazione di switch
    logger.info({
      component: 'person-tenant-access-routes',
      action: 'switchTenant',
      personId,
      fromTenantId: req.tenantId,
      toTenantId: tenantId,
      tenantName: targetTenant.name
    }, 'Tenant switch successful');

    return res.json({
      success: true,
      data: {
        tenant: targetTenant,
        // Non generiamo un nuovo token per semplicità
        // Il frontend salva tenantId nel localStorage
      },
      message: `Passato a ${targetTenant.name}`
    });

  } catch (error) {
    logger.error({
      component: 'person-tenant-access-routes',
      action: 'switchTenant',
      personId: req.person?.id,
      error: error.message
    }, 'Error switching tenant');

    return res.status(500).json({
      success: false,
      error: 'Errore nel cambio tenant'
    });
  }
});

/**
 * GET /api/v1/person-tenant-access/persons/:personId/tenants
 * Ottiene i tenant accessibili da un utente specifico (admin only)
 */
router.get('/persons/:personId/tenants',
  authMiddleware,
  requirePermission('USER_MANAGEMENT'),
  async (req, res) => {
    try {
      const { personId } = req.params;

      // Recupera il globalRole della persona target
      const person = await prisma.person.findUnique({
        where: { id: personId },
        select: { globalRole: true }
      });

      if (!person) {
        return res.status(404).json({
          success: false,
          error: 'Person not found'
        });
      }

      const tenants = await personTenantAccessService.getAccessibleTenants(personId, person.globalRole);

      return res.json({
        success: true,
        data: tenants,
        meta: {
          total: tenants.length,
          personId
        }
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'getPersonTenants',
        targetPersonId: req.params.personId,
        error: error.message
      }, 'Error getting person tenants');

      return res.status(500).json({
        success: false,
        error: 'Failed to get person tenants'
      });
    }
  }
);

/**
 * POST /api/v1/person-tenant-access/persons/:personId/tenants
 * Concede accesso a un tenant per un utente
 */
router.post('/persons/:personId/tenants',
  authMiddleware,
  requirePermission('TENANT_MANAGEMENT'),
  async (req, res) => {
    try {
      const { personId } = req.params;
      const {
        tenantId,
        accessLevel = 'READ',
        enabledFeatures = [],
        defaultRoleType = null,
        isPrimary = false,
        validUntil = null
      } = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'tenantId is required'
        });
      }

      // Valida accessLevel
      const validLevels = ['READ', 'WRITE', 'ADMIN', 'FULL'];
      if (!validLevels.includes(accessLevel)) {
        return res.status(400).json({
          success: false,
          error: `Invalid accessLevel. Must be one of: ${validLevels.join(', ')}`
        });
      }

      // Valida features
      const invalidFeatures = enabledFeatures.filter(f => !AVAILABLE_FEATURES.includes(f));
      if (invalidFeatures.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid features: ${invalidFeatures.join(', ')}. Valid features: ${AVAILABLE_FEATURES.join(', ')}`
        });
      }

      const access = await personTenantAccessService.grantTenantAccess({
        personId,
        tenantId,
        accessLevel,
        enabledFeatures,
        defaultRoleType,
        isPrimary,
        validUntil: validUntil ? new Date(validUntil) : null,
        grantedBy: req.person.id
      });

      return res.status(201).json({
        success: true,
        data: access,
        message: 'Tenant access granted successfully'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'grantTenantAccess',
        targetPersonId: req.params.personId,
        error: error.message
      }, 'Error granting tenant access');

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to grant tenant access'
      });
    }
  }
);

/**
 * PUT /api/v1/person-tenant-access/persons/:personId/tenants/:tenantId
 * Aggiorna l'accesso a un tenant per un utente
 */
router.put('/persons/:personId/tenants/:tenantId',
  authMiddleware,
  requirePermission('TENANT_MANAGEMENT'),
  async (req, res) => {
    try {
      const { personId, tenantId } = req.params;
      const {
        accessLevel,
        enabledFeatures,
        defaultRoleType,
        isPrimary,
        validUntil
      } = req.body;

      // Se si aggiornano le features
      if (enabledFeatures !== undefined) {
        const invalidFeatures = enabledFeatures.filter(f => !AVAILABLE_FEATURES.includes(f));
        if (invalidFeatures.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid features: ${invalidFeatures.join(', ')}`
          });
        }
      }

      // Re-grant con i nuovi parametri
      const access = await personTenantAccessService.grantTenantAccess({
        personId,
        tenantId,
        accessLevel,
        enabledFeatures,
        defaultRoleType,
        isPrimary,
        validUntil: validUntil ? new Date(validUntil) : null,
        grantedBy: req.person.id
      });

      return res.json({
        success: true,
        data: access,
        message: 'Tenant access updated successfully'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'updateTenantAccess',
        targetPersonId: req.params.personId,
        tenantId: req.params.tenantId,
        error: error.message
      }, 'Error updating tenant access');

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update tenant access'
      });
    }
  }
);

/**
 * DELETE /api/v1/person-tenant-access/persons/:personId/tenants/:tenantId
 * Revoca l'accesso a un tenant per un utente
 */
router.delete('/persons/:personId/tenants/:tenantId',
  authMiddleware,
  requirePermission('TENANT_MANAGEMENT'),
  async (req, res) => {
    try {
      const { personId, tenantId } = req.params;

      const access = await personTenantAccessService.revokeTenantAccess(
        personId,
        tenantId,
        req.person.id
      );

      return res.json({
        success: true,
        data: access,
        message: 'Tenant access revoked successfully'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'revokeTenantAccess',
        targetPersonId: req.params.personId,
        tenantId: req.params.tenantId,
        error: error.message
      }, 'Error revoking tenant access');

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to revoke tenant access'
      });
    }
  }
);

/**
 * PUT /api/v1/person-tenant-access/persons/:personId/primary-tenant
 * Imposta il tenant primario per un utente
 */
router.put('/persons/:personId/primary-tenant',
  authMiddleware,
  requirePermission('TENANT_MANAGEMENT'),
  async (req, res) => {
    try {
      const { personId } = req.params;
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'tenantId is required'
        });
      }

      const access = await personTenantAccessService.setPrimaryTenant(personId, tenantId);

      return res.json({
        success: true,
        data: access,
        message: 'Primary tenant set successfully'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'setPrimaryTenant',
        targetPersonId: req.params.personId,
        error: error.message
      }, 'Error setting primary tenant');

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to set primary tenant'
      });
    }
  }
);

// ================================================
// TENANT-CENTRIC ROUTES
// ================================================

/**
 * GET /api/v1/person-tenant-access/tenants/:tenantId/persons
 * Ottiene tutte le persone con accesso a un tenant
 */
router.get('/tenants/:tenantId/persons',
  authMiddleware,
  requirePermission('USER_MANAGEMENT'),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { accessLevel, feature, isActive } = req.query;

      const persons = await personTenantAccessService.getPersonsWithTenantAccess(tenantId, {
        accessLevel,
        feature,
        isActive: isActive !== 'false'
      });

      return res.json({
        success: true,
        data: persons,
        meta: {
          total: persons.length,
          tenantId
        }
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'getTenantPersons',
        tenantId: req.params.tenantId,
        error: error.message
      }, 'Error getting tenant persons');

      return res.status(500).json({
        success: false,
        error: 'Failed to get tenant persons'
      });
    }
  }
);

// ================================================
// DIRECT ACCESS MANAGEMENT ROUTES
// ================================================

/**
 * GET /api/v1/person-tenant-access/:accessId
 * Ottiene un accesso specifico per ID
 */
router.get('/:accessId',
  authMiddleware,
  requirePermission('USER_MANAGEMENT'),
  async (req, res) => {
    try {
      const { accessId } = req.params;

      const access = await prisma.personTenantAccess.findUnique({
        where: { id: accessId },
        include: {
          person: {
            select: { id: true, email: true, firstName: true, lastName: true }
          },
          tenant: {
            select: { id: true, name: true, slug: true }
          }
        }
      });

      if (!access || access.deletedAt) {
        return res.status(404).json({
          success: false,
          error: 'Access not found'
        });
      }

      return res.json({
        success: true,
        data: access
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'getAccess',
        accessId: req.params.accessId,
        error: error.message
      }, 'Error getting access');

      return res.status(500).json({
        success: false,
        error: 'Failed to get access'
      });
    }
  }
);

/**
 * PUT /api/v1/person-tenant-access/:accessId
 * Aggiorna un accesso esistente
 */
router.put('/:accessId',
  authMiddleware,
  requirePermission('USER_MANAGEMENT'),
  async (req, res) => {
    try {
      const { accessId } = req.params;
      const { accessLevel, enabledFeatures, isActive, validUntil } = req.body;

      // Verifica che l'accesso esista
      const existing = await prisma.personTenantAccess.findUnique({
        where: { id: accessId }
      });

      if (!existing || existing.deletedAt) {
        return res.status(404).json({
          success: false,
          error: 'Access not found'
        });
      }

      // Prepara i dati da aggiornare
      const updateData = {};
      if (accessLevel !== undefined) updateData.accessLevel = accessLevel;
      if (enabledFeatures !== undefined) updateData.enabledFeatures = enabledFeatures;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
      updateData.updatedAt = new Date();

      const access = await prisma.personTenantAccess.update({
        where: { id: accessId },
        data: updateData,
        include: {
          person: {
            select: { id: true, email: true, firstName: true, lastName: true }
          },
          tenant: {
            select: { id: true, name: true, slug: true }
          }
        }
      });

      logger.info({
        component: 'person-tenant-access-routes',
        action: 'updateAccess',
        accessId,
        updatedBy: req.person.id
      }, 'Access updated successfully');

      return res.json({
        success: true,
        data: access,
        message: 'Access updated successfully'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'updateAccess',
        accessId: req.params.accessId,
        error: error.message
      }, 'Error updating access');

      return res.status(500).json({
        success: false,
        error: 'Failed to update access'
      });
    }
  }
);

/**
 * DELETE /api/v1/person-tenant-access/:accessId
 * Rimuove un accesso (soft delete)
 */
router.delete('/:accessId',
  authMiddleware,
  requirePermission('USER_MANAGEMENT'),
  async (req, res) => {
    try {
      const { accessId } = req.params;

      // Verifica che l'accesso esista
      const existing = await prisma.personTenantAccess.findUnique({
        where: { id: accessId },
        include: {
          person: { select: { email: true } },
          tenant: { select: { name: true } }
        }
      });

      if (!existing || existing.deletedAt) {
        return res.status(404).json({
          success: false,
          error: 'Access not found'
        });
      }

      // Non permettere di rimuovere l'accesso al proprio tenant primario
      if (existing.isPrimary && existing.personId === req.person.id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove access to your primary tenant'
        });
      }

      // Soft delete
      await prisma.personTenantAccess.update({
        where: { id: accessId },
        data: {
          deletedAt: new Date(),
          isActive: false
        }
      });

      logger.info({
        component: 'person-tenant-access-routes',
        action: 'deleteAccess',
        accessId,
        personEmail: existing.person.email,
        tenantName: existing.tenant.name,
        deletedBy: req.person.id
      }, 'Access deleted successfully');

      return res.json({
        success: true,
        message: 'Access removed successfully'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'deleteAccess',
        accessId: req.params.accessId,
        error: error.message
      }, 'Error deleting access');

      return res.status(500).json({
        success: false,
        error: 'Failed to delete access'
      });
    }
  }
);

/**
 * POST /api/v1/person-tenant-access
 * Crea un nuovo accesso tenant (per creare dal form frontend)
 */
router.post('/',
  authMiddleware,
  requirePermission('USER_MANAGEMENT'),
  async (req, res) => {
    try {
      const { personId, tenantId, accessLevel = 'READ', enabledFeatures = [] } = req.body;

      if (!personId || !tenantId) {
        return res.status(400).json({
          success: false,
          error: 'personId and tenantId are required'
        });
      }

      // Verifica che persona e tenant esistano
      const [person, tenant] = await Promise.all([
        prisma.person.findUnique({ where: { id: personId } }),
        prisma.tenant.findUnique({ where: { id: tenantId } })
      ]);

      if (!person) {
        return res.status(404).json({
          success: false,
          error: 'Person not found'
        });
      }

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Verifica che non esista già un accesso
      const existingAccess = await prisma.personTenantAccess.findFirst({
        where: {
          personId,
          tenantId,
          deletedAt: null
        }
      });

      if (existingAccess) {
        return res.status(409).json({
          success: false,
          error: 'Access already exists for this person and tenant'
        });
      }

      const access = await prisma.personTenantAccess.create({
        data: {
          personId,
          tenantId,
          accessLevel,
          enabledFeatures,
          isActive: true,
          grantedBy: req.person.id
        },
        include: {
          person: {
            select: { id: true, email: true, firstName: true, lastName: true }
          },
          tenant: {
            select: { id: true, name: true, slug: true }
          }
        }
      });

      logger.info({
        component: 'person-tenant-access-routes',
        action: 'createAccess',
        personId,
        tenantId,
        createdBy: req.person.id
      }, 'Access created successfully');

      return res.status(201).json({
        success: true,
        data: access,
        message: 'Access created successfully'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'createAccess',
        error: error.message
      }, 'Error creating access');

      return res.status(500).json({
        success: false,
        error: 'Failed to create access'
      });
    }
  }
);

// ================================================
// MIGRATION ROUTES (Admin only)
// ================================================

/**
 * POST /api/v1/person-tenant-access/migrate
 * Migra gli utenti esistenti al nuovo sistema PersonTenantAccess
 */
router.post('/migrate',
  authMiddleware,
  requirePermission('SYSTEM_SETTINGS'),
  async (req, res) => {
    try {
      const result = await personTenantAccessService.migrateExistingUsers(req.person.id);

      return res.json({
        success: true,
        data: result,
        message: `Migration completed: ${result.migrated} users migrated, ${result.skipped} skipped`
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'migrate',
        error: error.message
      }, 'Error during migration');

      return res.status(500).json({
        success: false,
        error: error.message || 'Migration failed'
      });
    }
  }
);

export default router;
