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
      res.status(500).json({ success: false, error: 'Errore nel recupero delle funzionalità' });
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
      res.status(500).json({ success: false, error: 'Errore nel recupero dei preset funzionalità' });
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
 * Ottiene tutti gli accessi tenant.
 * Global admin: vede tutti (con filtri opzionali).
 * TENANT_ADMIN: vede solo gli accessi del proprio tenant.
 */
router.get('/',
  authMiddleware,
  async (req, res) => {
    try {
      const person = req.person;
      const isGlobalAdmin = person.roles?.includes('ADMIN') || person.roles?.includes('SUPER_ADMIN') ||
        person.globalRole === 'ADMIN' || person.globalRole === 'SUPER_ADMIN';
      const isTenantAdmin = person.roles?.includes('TENANT_ADMIN') || person.globalRole === 'TENANT_ADMIN';

      if (!isGlobalAdmin && !isTenantAdmin) {
        return res.status(403).json({ success: false, error: 'Permessi insufficienti' });
      }

      const { tenantId, personId, page = 1, limit = 100 } = req.query;

      const where = {
        deletedAt: null
      };

      // TENANT_ADMIN: filtra sempre per il proprio tenant
      if (!isGlobalAdmin && isTenantAdmin) {
        where.tenantId = person.tenantId;
      } else {
        if (tenantId) where.tenantId = tenantId;
      }
      if (personId) where.personId = personId;

      const [accesses, total] = await Promise.all([
        prisma.personTenantAccess.findMany({
          where,
          include: {
            person: {
              select: { id: true, firstName: true, lastName: true, tenantProfiles: { where: { deletedAt: null }, take: 1, select: { email: true } } }
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
        error: 'Operazione non riuscita'
      }, 'Error getting all tenant accesses');

      return res.status(500).json({
        success: false,
        error: 'Errore nel recupero degli accessi tenant'
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
      error: 'Operazione non riuscita'
    }, 'Error getting accessible tenants');

    return res.status(500).json({
      success: false,
      error: 'Errore nel recupero dei tenant accessibili'
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
        error: 'tenantId è obbligatorio'
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
      fromTenantId: req.person.tenantId,
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
      error: 'Operazione non riuscita'
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
  requirePermission('users:manage'),
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
          error: 'Persona non trovata'
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
        error: 'Operazione non riuscita'
      }, 'Error getting person tenants');

      return res.status(500).json({
        success: false,
        error: 'Errore nel recupero dei tenant della persona'
      });
    }
  }
);

/**
 * POST /api/v1/person-tenant-access/persons/:personId/tenants
 * Concede accesso a un tenant per un utente.
 * TENANT_ADMIN: può concedere accesso solo per il proprio tenant.
 */
router.post('/persons/:personId/tenants',
  authMiddleware,
  async (req, res) => {
    try {
      const person = req.person;
      const isGlobalAdmin = person.roles?.includes('ADMIN') || person.roles?.includes('SUPER_ADMIN') ||
        person.globalRole === 'ADMIN' || person.globalRole === 'SUPER_ADMIN';
      const isTenantAdmin = person.roles?.includes('TENANT_ADMIN') || person.globalRole === 'TENANT_ADMIN';

      if (!isGlobalAdmin && !isTenantAdmin) {
        return res.status(403).json({ success: false, error: 'Permessi insufficienti' });
      }

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
          error: 'tenantId è obbligatorio'
        });
      }

      // TENANT_ADMIN: può gestire solo il proprio tenant
      if (isTenantAdmin && !isGlobalAdmin && tenantId !== person.tenantId) {
        return res.status(403).json({ success: false, error: 'Non puoi gestire accessi per altri tenant' });
      }

      // Valida accessLevel
      const validLevels = ['READ', 'WRITE', 'ADMIN', 'FULL'];
      if (!validLevels.includes(accessLevel)) {
        return res.status(400).json({
          success: false,
          error: `Livello di accesso non valido. Deve essere uno tra: ${validLevels.join(', ')}`
        });
      }

      // Valida features
      const invalidFeatures = enabledFeatures.filter(f => !AVAILABLE_FEATURES.includes(f));
      if (invalidFeatures.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Funzionalità non valide: ${invalidFeatures.join(', ')}. Funzionalità disponibili: ${AVAILABLE_FEATURES.join(', ')}`
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
        message: 'Accesso tenant concesso con successo'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'grantTenantAccess',
        targetPersonId: req.params.personId,
        error: 'Operazione non riuscita'
      }, 'Error granting tenant access');

      return res.status(500).json({
        success: false,
        error: 'Errore nella concessione dell\'accesso tenant'
      });
    }
  }
);

/**
 * PUT /api/v1/person-tenant-access/persons/:personId/tenants/:tenantId
 * Aggiorna l'accesso a un tenant per un utente.
 * TENANT_ADMIN: può aggiornare solo accessi del proprio tenant.
 */
router.put('/persons/:personId/tenants/:tenantId',
  authMiddleware,
  async (req, res) => {
    try {
      const person = req.person;
      const isGlobalAdmin = person.roles?.includes('ADMIN') || person.roles?.includes('SUPER_ADMIN') ||
        person.globalRole === 'ADMIN' || person.globalRole === 'SUPER_ADMIN';
      const isTenantAdmin = person.roles?.includes('TENANT_ADMIN') || person.globalRole === 'TENANT_ADMIN';

      if (!isGlobalAdmin && !isTenantAdmin) {
        return res.status(403).json({ success: false, error: 'Permessi insufficienti' });
      }

      const { personId, tenantId } = req.params;

      // TENANT_ADMIN: può gestire solo il proprio tenant
      if (isTenantAdmin && !isGlobalAdmin && tenantId !== person.tenantId) {
        return res.status(403).json({ success: false, error: 'Non puoi gestire accessi per altri tenant' });
      }

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
            error: `Funzionalità non valide: ${invalidFeatures.join(', ')}`
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
        message: 'Accesso tenant aggiornato con successo'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'updateTenantAccess',
        targetPersonId: req.params.personId,
        tenantId: req.params.tenantId,
        error: 'Operazione non riuscita'
      }, 'Error updating tenant access');

      return res.status(500).json({
        success: false,
        error: 'Errore nell\'aggiornamento dell\'accesso tenant'
      });
    }
  }
);

/**
 * DELETE /api/v1/person-tenant-access/persons/:personId/tenants/:tenantId
 * Revoca l'accesso a un tenant per un utente.
 * TENANT_ADMIN: può revocare solo accessi del proprio tenant.
 */
router.delete('/persons/:personId/tenants/:tenantId',
  authMiddleware,
  async (req, res) => {
    try {
      const person = req.person;
      const isGlobalAdmin = person.roles?.includes('ADMIN') || person.roles?.includes('SUPER_ADMIN') ||
        person.globalRole === 'ADMIN' || person.globalRole === 'SUPER_ADMIN';
      const isTenantAdmin = person.roles?.includes('TENANT_ADMIN') || person.globalRole === 'TENANT_ADMIN';

      if (!isGlobalAdmin && !isTenantAdmin) {
        return res.status(403).json({ success: false, error: 'Permessi insufficienti' });
      }

      const { personId, tenantId } = req.params;

      // TENANT_ADMIN: può gestire solo il proprio tenant
      if (isTenantAdmin && !isGlobalAdmin && tenantId !== person.tenantId) {
        return res.status(403).json({ success: false, error: 'Non puoi gestire accessi per altri tenant' });
      }

      const access = await personTenantAccessService.revokeTenantAccess(
        personId,
        tenantId,
        req.person.id
      );

      return res.json({
        success: true,
        data: access,
        message: 'Accesso tenant revocato con successo'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'revokeTenantAccess',
        targetPersonId: req.params.personId,
        tenantId: req.params.tenantId,
        error: 'Operazione non riuscita'
      }, 'Error revoking tenant access');

      return res.status(500).json({
        success: false,
        error: 'Errore nella revoca dell\'accesso tenant'
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
  requirePermission('tenants:manage'),
  async (req, res) => {
    try {
      const { personId } = req.params;
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'tenantId è obbligatorio'
        });
      }

      const access = await personTenantAccessService.setPrimaryTenant(personId, tenantId);

      return res.json({
        success: true,
        data: access,
        message: 'Tenant principale impostato con successo'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'setPrimaryTenant',
        targetPersonId: req.params.personId,
        error: 'Operazione non riuscita'
      }, 'Error setting primary tenant');

      return res.status(500).json({
        success: false,
        error: 'Errore nell\'impostazione del tenant principale'
      });
    }
  }
);

// ================================================
// TENANT-CENTRIC ROUTES
// ================================================

/**
 * GET /api/v1/person-tenant-access/tenants/:tenantId/persons
 * Ottiene tutte le persone con accesso a un tenant.
 * TENANT_ADMIN: può vedere solo le persone del proprio tenant.
 */
router.get('/tenants/:tenantId/persons',
  authMiddleware,
  async (req, res) => {
    try {
      const person = req.person;
      const isGlobalAdmin = person.roles?.includes('ADMIN') || person.roles?.includes('SUPER_ADMIN') ||
        person.globalRole === 'ADMIN' || person.globalRole === 'SUPER_ADMIN';
      const isTenantAdmin = person.roles?.includes('TENANT_ADMIN') || person.globalRole === 'TENANT_ADMIN';

      if (!isGlobalAdmin && !isTenantAdmin) {
        return res.status(403).json({ success: false, error: 'Permessi insufficienti' });
      }

      const { tenantId } = req.params;

      // TENANT_ADMIN: può accedere solo al proprio tenant
      if (isTenantAdmin && !isGlobalAdmin && tenantId !== person.tenantId) {
        return res.status(403).json({ success: false, error: 'Non puoi vedere i dati di altri tenant' });
      }

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
        error: 'Operazione non riuscita'
      }, 'Error getting tenant persons');

      return res.status(500).json({
        success: false,
        error: 'Errore nel recupero delle persone del tenant'
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
  requirePermission('users:manage'),
  async (req, res) => {
    try {
      const { accessId } = req.params;

      const access = await prisma.personTenantAccess.findUnique({
        where: { id: accessId },
        include: {
          person: {
            select: { id: true, firstName: true, lastName: true, tenantProfiles: { where: { deletedAt: null }, take: 1, select: { email: true } } }
          },
          tenant: {
            select: { id: true, name: true, slug: true }
          }
        }
      });

      if (!access || access.deletedAt) {
        return res.status(404).json({
          success: false,
          error: 'Accesso non trovato'
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
        error: 'Operazione non riuscita'
      }, 'Error getting access');

      return res.status(500).json({
        success: false,
        error: 'Errore nel recupero dell\'accesso'
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
  requirePermission('users:manage'),
  async (req, res) => {
    try {
      const { accessId } = req.params;
      const { accessLevel, enabledFeatures, isActive, validUntil, defaultRoleType } = req.body;

      // Verifica che l'accesso esista
      const existing = await prisma.personTenantAccess.findUnique({
        where: { id: accessId }
      });

      if (!existing || existing.deletedAt) {
        return res.status(404).json({
          success: false,
          error: 'Accesso non trovato'
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
            select: { id: true, firstName: true, lastName: true, tenantProfiles: { where: { deletedAt: null }, take: 1, select: { email: true } } }
          },
          tenant: {
            select: { id: true, name: true, slug: true }
          }
        }
      });

      // Se viene promosso ad admin tenant (o viene passato esplicitamente un defaultRoleType),
      // assicuriamo la presenza di PersonTenantProfile e PersonRole tenant-scoped.
      const requestedRoleType = defaultRoleType || (access.accessLevel === 'ADMIN' ? 'TENANT_ADMIN' : null);
      if (access.isActive && requestedRoleType) {
        await personTenantAccessService.grantTenantAccess({
          personId: access.personId,
          tenantId: access.tenantId,
          accessLevel: access.accessLevel,
          enabledFeatures: access.enabledFeatures || [],
          defaultRoleType: requestedRoleType,
          isPrimary: access.isPrimary,
          validUntil: access.validUntil,
          grantedBy: req.person.id,
        });
      }

      logger.info({
        component: 'person-tenant-access-routes',
        action: 'updateAccess',
        accessId,
        updatedBy: req.person.id
      }, 'Access updated successfully');

      return res.json({
        success: true,
        data: access,
        message: 'Accesso aggiornato con successo'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'updateAccess',
        accessId: req.params.accessId,
        error: 'Operazione non riuscita'
      }, 'Error updating access');

      return res.status(500).json({
        success: false,
        error: 'Errore nell\'aggiornamento dell\'accesso'
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
  requirePermission('users:manage'),
  async (req, res) => {
    try {
      const { accessId } = req.params;

      // Verifica che l'accesso esista
      const existing = await prisma.personTenantAccess.findUnique({
        where: { id: accessId },
        include: {
          person: { select: { firstName: true, lastName: true, tenantProfiles: { where: { deletedAt: null }, take: 1, select: { email: true } } } },
          tenant: { select: { name: true } }
        }
      });

      if (!existing || existing.deletedAt) {
        return res.status(404).json({
          success: false,
          error: 'Accesso non trovato'
        });
      }

      // Non permettere di rimuovere l'accesso al proprio tenant primario
      if (existing.isPrimary && existing.personId === req.person.id) {
        return res.status(400).json({
          success: false,
          error: 'Impossibile rimuovere l\'accesso al tenant primario'
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
        personName: `${existing.person.firstName} ${existing.person.lastName}`,
        tenantName: existing.tenant.name,
        deletedBy: req.person.id
      }, 'Access deleted successfully');

      return res.json({
        success: true,
        message: 'Accesso rimosso con successo'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'deleteAccess',
        accessId: req.params.accessId,
        error: 'Operazione non riuscita'
      }, 'Error deleting access');

      return res.status(500).json({
        success: false,
        error: 'Errore nell\'eliminazione dell\'accesso'
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
  requirePermission('users:manage'),
  async (req, res) => {
    try {
      const {
        personId,
        tenantId,
        accessLevel = 'READ',
        enabledFeatures = [],
        defaultRoleType,
        isPrimary = false,
        validUntil = null,
      } = req.body;

      if (!personId || !tenantId) {
        return res.status(400).json({
          success: false,
          error: 'personId e tenantId sono obbligatori'
        });
      }

      // Valida accessLevel
      const validLevels = ['READ', 'WRITE', 'ADMIN', 'FULL'];
      if (!validLevels.includes(accessLevel)) {
        return res.status(400).json({
          success: false,
          error: `Livello di accesso non valido. Deve essere uno tra: ${validLevels.join(', ')}`
        });
      }

      // Valida features
      const invalidFeatures = enabledFeatures.filter(f => !AVAILABLE_FEATURES.includes(f));
      if (invalidFeatures.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Funzionalità non valide: ${invalidFeatures.join(', ')}`
        });
      }

      // Se accessLevel=ADMIN e non è specificato un ruolo, default a TENANT_ADMIN.
      const resolvedDefaultRoleType = defaultRoleType || (accessLevel === 'ADMIN' ? 'TENANT_ADMIN' : null);

      const access = await personTenantAccessService.grantTenantAccess({
        personId,
        tenantId,
        accessLevel,
        enabledFeatures,
        defaultRoleType: resolvedDefaultRoleType,
        isPrimary,
        validUntil: validUntil ? new Date(validUntil) : null,
        grantedBy: req.person.id,
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
        message: 'Accesso creato con successo'
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'createAccess',
        error: 'Operazione non riuscita'
      }, 'Error creating access');

      return res.status(500).json({
        success: false,
        error: 'Errore nella creazione dell\'accesso'
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
  requirePermission('system:settings'),
  async (req, res) => {
    try {
      const result = await personTenantAccessService.migrateExistingUsers(req.person.id);

      return res.json({
        success: true,
        data: result,
        message: `Migrazione completata: ${result.migrated} utenti migrati, ${result.skipped} saltati`
      });

    } catch (error) {
      logger.error({
        component: 'person-tenant-access-routes',
        action: 'migrate',
        error: 'Operazione non riuscita'
      }, 'Error during migration');

      return res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

export default router;
