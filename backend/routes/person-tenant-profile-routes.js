/**
 * Person Tenant Profile Routes
 * 
 * Progetto 48: API endpoints per gestione profili persona per tenant
 * 
 * Endpoints:
 * - GET    /api/v1/person-profiles/:personId                      - Tutti i profili di una persona
 * - GET    /api/v1/person-profiles/:personId/primary               - Profilo primario
 * - GET    /api/v1/person-profiles/:personId/tenant/:tenantId      - Profilo specifico
 * - POST   /api/v1/person-profiles                                 - Crea profilo
 * - POST   /api/v1/person-profiles/get-or-create                   - Ottiene o crea profilo
 * - PUT    /api/v1/person-profiles/:personId/tenant/:tenantId      - Aggiorna profilo
 * - DELETE /api/v1/person-profiles/:personId/tenant/:tenantId      - Elimina profilo
 * - POST   /api/v1/person-profiles/:personId/tenant/:tenantId/set-primary - Imposta primario
 * - GET    /api/v1/tenants/:tenantId/person-profiles               - Profili per tenant
 * - GET    /api/v1/tenants/:tenantId/person-profiles/search        - Cerca profili
 * - GET    /api/v1/tenants/:tenantId/person-profiles/by-role       - Profili per ruolo
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import PersonTenantProfileService from '../services/person/PersonTenantProfileService.js';
import logger from '../utils/logger.js';
import { validateParam } from '../middleware/validateUUID.js';

const router = express.Router();
router.param('personId', validateParam('personId'));
router.param('tenantId', validateParam('tenantId'));

// ============================================
// PROFILE CRUD
// ============================================

/**
 * GET /api/v1/person-profiles/:personId
 * Ottiene tutti i profili di una persona
 */
router.get('/:personId', requireAuth, async (req, res) => {
    try {
        const { personId } = req.params;

        const profiles = await PersonTenantProfileService.getAllProfilesForPerson(personId);

        res.json({ profiles });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', personId: req.params.personId }, 'Error getting person profiles');
        res.status(500).json({ error: 'Errore durante il recupero dei profili' });
    }
});

/**
 * GET /api/v1/person-profiles/:personId/primary
 * Ottiene il profilo primario di una persona
 */
router.get('/:personId/primary', requireAuth, async (req, res) => {
    try {
        const { personId } = req.params;

        const profile = await PersonTenantProfileService.getPrimaryProfile(personId);

        if (!profile) {
            return res.status(404).json({ error: 'Profilo primario non trovato' });
        }

        res.json(profile);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', personId: req.params.personId }, 'Error getting primary profile');
        res.status(500).json({ error: 'Errore durante il recupero del profilo primario' });
    }
});

/**
 * GET /api/v1/person-profiles/:personId/tenant/:tenantId
 * Ottiene il profilo di una persona per un tenant specifico
 */
router.get('/:personId/tenant/:tenantId', requireAuth, async (req, res) => {
    try {
        const { personId, tenantId } = req.params;

        const profile = await PersonTenantProfileService.getProfile(personId, tenantId);

        if (!profile) {
            return res.status(404).json({ error: 'Profilo non trovato' });
        }

        res.json(profile);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', personId: req.params.personId, tenantId: req.params.tenantId }, 'Error getting profile');
        res.status(500).json({ error: 'Errore durante il recupero del profilo' });
    }
});

/**
 * POST /api/v1/person-profiles
 * Crea un nuovo profilo per una persona in un tenant
 */
router.post('/', requireAuth, requirePermissions('persons:write'), async (req, res) => {
    try {
        const { personId, tenantId, ...profileData } = req.body;

        if (!personId || !tenantId) {
            return res.status(400).json({ error: 'personId e tenantId sono obbligatori' });
        }

        const profile = await PersonTenantProfileService.createProfile(personId, tenantId, profileData);

        res.status(201).json(profile);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', body: req.body }, 'Error creating profile');
        res.status(500).json({ error: 'Errore durante la creazione del profilo' });
    }
});

/**
 * POST /api/v1/person-profiles/get-or-create
 * Ottiene un profilo esistente o ne crea uno nuovo
 */
router.post('/get-or-create', requireAuth, async (req, res) => {
    try {
        const { personId, tenantId, ...defaultData } = req.body;

        if (!personId || !tenantId) {
            return res.status(400).json({ error: 'personId e tenantId sono obbligatori' });
        }

        const profile = await PersonTenantProfileService.getOrCreateProfile(personId, tenantId, defaultData);

        res.json(profile);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', body: req.body }, 'Error in get-or-create profile');
        res.status(500).json({ error: 'Errore durante l\'operazione' });
    }
});

/**
 * PUT /api/v1/person-profiles/:personId/tenant/:tenantId
 * Aggiorna un profilo esistente
 */
router.put('/:personId/tenant/:tenantId', requireAuth, requirePermissions('persons:write'), async (req, res) => {
    try {
        const { personId, tenantId } = req.params;

        const profile = await PersonTenantProfileService.updateProfile(personId, tenantId, req.body);

        res.json(profile);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', personId: req.params.personId, tenantId: req.params.tenantId }, 'Error updating profile');
        res.status(500).json({ error: 'Errore durante l\'aggiornamento del profilo' });
    }
});

/**
 * DELETE /api/v1/person-profiles/:personId/tenant/:tenantId
 * Elimina un profilo (soft delete)
 */
router.delete('/:personId/tenant/:tenantId', requireAuth, requirePermissions('persons:delete'), async (req, res) => {
    try {
        const { personId, tenantId } = req.params;

        const result = await PersonTenantProfileService.deleteProfile(personId, tenantId);

        res.json(result);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', personId: req.params.personId, tenantId: req.params.tenantId }, 'Error deleting profile');
        res.status(500).json({ error: 'Errore durante l\'eliminazione del profilo' });
    }
});

/**
 * POST /api/v1/person-profiles/:personId/tenant/:tenantId/set-primary
 * Imposta un profilo come primario
 */
router.post('/:personId/tenant/:tenantId/set-primary', requireAuth, async (req, res) => {
    try {
        const { personId, tenantId } = req.params;

        const profile = await PersonTenantProfileService.setPrimaryProfile(personId, tenantId);

        res.json(profile);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', personId: req.params.personId, tenantId: req.params.tenantId }, 'Error setting primary profile');
        res.status(500).json({ error: 'Errore durante l\'impostazione del profilo primario' });
    }
});

// ============================================
// TENANT-SCOPED QUERIES
// ============================================

/**
 * GET /api/v1/tenants/:tenantId/person-profiles
 * Ottiene tutti i profili in un tenant
 */
router.get('/tenants/:tenantId', requireAuth, async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { status, companyId, siteId, repartoId, isActive, page, limit } = req.query;

        const result = await PersonTenantProfileService.getProfilesByTenant(tenantId, {
            status,
            companyId,
            siteId,
            repartoId,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined
        });

        res.json(result);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', tenantId: req.params.tenantId }, 'Error getting profiles by tenant');
        res.status(500).json({ error: 'Errore durante il recupero dei profili' });
    }
});

/**
 * GET /api/v1/tenants/:tenantId/person-profiles/search
 * Cerca profili con criteri vari
 */
router.get('/tenants/:tenantId/search', requireAuth, async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { query, status, companyId, specialties, certifications } = req.query;

        const profiles = await PersonTenantProfileService.searchProfiles(tenantId, {
            query,
            status,
            companyId,
            specialties: specialties ? specialties.split(',') : undefined,
            certifications: certifications ? certifications.split(',') : undefined
        });

        res.json({ profiles });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', tenantId: req.params.tenantId }, 'Error searching profiles');
        res.status(500).json({ error: 'Errore durante la ricerca' });
    }
});

/**
 * GET /api/v1/tenants/:tenantId/person-profiles/by-role
 * Ottiene profili per ruolo
 */
router.get('/tenants/:tenantId/by-role', requireAuth, async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { roleType } = req.query;

        if (!roleType) {
            return res.status(400).json({ error: 'roleType è obbligatorio' });
        }

        const roleTypes = roleType.includes(',') ? roleType.split(',') : roleType;

        const profiles = await PersonTenantProfileService.getProfilesByRole(tenantId, roleTypes);

        res.json({ profiles });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', tenantId: req.params.tenantId, roleType: req.query.roleType }, 'Error getting profiles by role');
        res.status(500).json({ error: 'Errore durante il recupero dei profili per ruolo' });
    }
});

export default router;
