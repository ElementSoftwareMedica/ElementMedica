/**
 * Person Data Share Consent Routes
 * 
 * Progetto 48: API endpoints per gestione consensi condivisione dati cross-tenant (GDPR)
 * 
 * Endpoints:
 * - POST   /api/v1/person-consents                                      - Crea consenso
 * - GET    /api/v1/person-consents/:personId/active                     - Consensi attivi persona
 * - GET    /api/v1/person-consents/:personId/source/:sourceId/target/:targetId - Consenso specifico
 * - GET    /api/v1/person-consents/:personId/check-access               - Verifica accesso
 * - POST   /api/v1/person-consents/:personId/source/:sourceId/target/:targetId/revoke - Revoca
 * - PUT    /api/v1/person-consents/:personId/source/:sourceId/target/:targetId - Aggiorna
 * - DELETE /api/v1/person-consents/:personId/all                        - Elimina tutti (GDPR)
 * - GET    /api/v1/tenants/:tenantId/consents/as-source                 - Consensi come source
 * - GET    /api/v1/tenants/:tenantId/consents/as-target                 - Consensi come target
 * - GET    /api/v1/tenants/:tenantId/consents/stats                     - Statistiche
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import PersonDataShareConsentService from '../services/person/PersonDataShareConsentService.js';
import logger from '../utils/logger.js';
import { validateParam } from '../middleware/validateUUID.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();
router.param('personId', validateParam('personId'));
router.param('tenantId', validateParam('tenantId'));
router.param('sourceTenantId', validateParam('sourceTenantId'));
router.param('targetTenantId', validateParam('targetTenantId'));

// ============================================
// CONSENT CRUD
// ============================================

/**
 * POST /api/v1/person-consents
 * Crea un nuovo consenso per condivisione dati
 */
router.post('/', requireAuth, requirePermissions('gdpr:write'), async (req, res) => {
    try {
        const consent = await PersonDataShareConsentService.createConsent(req.body);

        res.status(201).json(consent);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', body: req.body }, 'Error creating consent');
        res.status(500).json({ error: 'Errore durante la creazione del consenso' });
    }
});

/**
 * GET /api/v1/person-consents/:personId/active
 * Ottiene tutti i consensi attivi per una persona
 */
router.get('/:personId/active', requireAuth, requirePermissions('gdpr:read'), async (req, res) => {
    try {
        const { personId } = req.params;

        const consents = await PersonDataShareConsentService.getActiveConsentsForPerson(personId);

        res.json({ consents });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', personId: req.params.personId }, 'Error getting active consents');
        res.status(500).json({ error: 'Errore durante il recupero dei consensi' });
    }
});

/**
 * GET /api/v1/person-consents/:personId/source/:sourceTenantId/target/:targetTenantId
 * Ottiene un consenso specifico
 */
router.get('/:personId/source/:sourceTenantId/target/:targetTenantId', requireAuth, async (req, res) => {
    try {
        const { personId, sourceTenantId, targetTenantId } = req.params;

        const consent = await PersonDataShareConsentService.getConsent(personId, sourceTenantId, targetTenantId);

        if (!consent) {
            return res.status(404).json({ error: 'Consenso non trovato' });
        }

        res.json(consent);
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId: req.params.personId,
            sourceTenantId: req.params.sourceTenantId,
            targetTenantId: req.params.targetTenantId
        }, 'Error getting consent');
        res.status(500).json({ error: 'Errore durante il recupero del consenso' });
    }
});

/**
 * GET /api/v1/person-consents/:personId/check-access
 * Verifica se un tenant può accedere a dati di un altro tenant
 */
router.get('/:personId/check-access', requireAuth, async (req, res) => {
    try {
        const { personId } = req.params;
        const { source, target, dataType } = req.query;

        if (!source || !target || !dataType) {
            return res.status(400).json({ error: 'source, target e dataType sono obbligatori' });
        }

        const result = await PersonDataShareConsentService.canAccessData(personId, source, target, dataType);

        res.json(result);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', personId: req.params.personId, query: req.query }, 'Error checking access');
        res.status(500).json({ error: 'Errore durante la verifica dell\'accesso' });
    }
});

/**
 * POST /api/v1/person-consents/:personId/source/:sourceTenantId/target/:targetTenantId/revoke
 * Revoca un consenso
 */
router.post('/:personId/source/:sourceTenantId/target/:targetTenantId/revoke', requireAuth, async (req, res) => {
    try {
        const { personId, sourceTenantId, targetTenantId } = req.params;
        const { reason } = req.body;
        const revokedBy = req.person.id;

        // F208: Only the person themselves or a user from the source tenant can revoke
        const effectiveTenantId = getEffectiveTenantId(req);
        if (personId !== req.person.id && effectiveTenantId !== sourceTenantId) {
            return res.status(403).json({ error: 'Non autorizzato a revocare questo consenso' });
        }

        const consent = await PersonDataShareConsentService.revokeConsent(
            personId,
            sourceTenantId,
            targetTenantId,
            revokedBy,
            reason
        );

        res.json(consent);
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId: req.params.personId,
            sourceTenantId: req.params.sourceTenantId,
            targetTenantId: req.params.targetTenantId
        }, 'Error revoking consent');
        res.status(500).json({ error: 'Errore durante la revoca del consenso' });
    }
});

/**
 * PUT /api/v1/person-consents/:personId/source/:sourceTenantId/target/:targetTenantId
 * Aggiorna i tipi di dati condivisi in un consenso
 */
router.put('/:personId/source/:sourceTenantId/target/:targetTenantId', requireAuth, requirePermissions('gdpr:write'), async (req, res) => {
    try {
        const { personId, sourceTenantId, targetTenantId } = req.params;
        const { sharedDataTypes, excludedFields } = req.body;

        if (!sharedDataTypes || !Array.isArray(sharedDataTypes)) {
            return res.status(400).json({ error: 'sharedDataTypes è obbligatorio e deve essere un array' });
        }

        const consent = await PersonDataShareConsentService.updateSharedDataTypes(
            personId,
            sourceTenantId,
            targetTenantId,
            sharedDataTypes,
            excludedFields
        );

        res.json(consent);
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId: req.params.personId,
            sourceTenantId: req.params.sourceTenantId,
            targetTenantId: req.params.targetTenantId
        }, 'Error updating consent');
        res.status(500).json({ error: 'Errore durante l\'aggiornamento del consenso' });
    }
});

/**
 * DELETE /api/v1/person-consents/:personId/all
 * Elimina tutti i consensi per una persona (diritto all'oblio GDPR)
 */
router.delete('/:personId/all', requireAuth, requirePermissions('gdpr:admin'), async (req, res) => {
    try {
        const { personId } = req.params;

        const result = await PersonDataShareConsentService.deleteAllConsentsForPerson(personId);

        logger.info({ personId, deletedCount: result.deletedCount }, 'All consents deleted for person (GDPR right to be forgotten)');

        res.json(result);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', personId: req.params.personId }, 'Error deleting all consents');
        res.status(500).json({ error: 'Errore durante l\'eliminazione dei consensi' });
    }
});

// ============================================
// TENANT-SCOPED QUERIES
// ============================================

/**
 * GET /api/v1/tenants/:tenantId/consents/as-source
 * Ottiene tutti i consensi dove il tenant è l'origine dei dati
 */
router.get('/tenants/:tenantId/as-source', requireAuth, requirePermissions('gdpr:read'), async (req, res) => {
    try {
        const { tenantId } = req.params;

        // F208: Tenant isolation — only access your own tenant's consents
        const effectiveTenantId = getEffectiveTenantId(req);
        if (effectiveTenantId !== tenantId) {
            return res.status(403).json({ error: 'Accesso ai consensi di un altro tenant non consentito' });
        }

        const consents = await PersonDataShareConsentService.getConsentsBySourceTenant(tenantId);

        res.json({ consents });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', tenantId: req.params.tenantId }, 'Error getting consents as source');
        res.status(500).json({ error: 'Errore durante il recupero dei consensi' });
    }
});

/**
 * GET /api/v1/tenants/:tenantId/consents/as-target
 * Ottiene tutti i consensi dove il tenant è destinatario dei dati
 */
router.get('/tenants/:tenantId/as-target', requireAuth, requirePermissions('gdpr:read'), async (req, res) => {
    try {
        const { tenantId } = req.params;

        // F208: Tenant isolation
        const effectiveTenantId = getEffectiveTenantId(req);
        if (effectiveTenantId !== tenantId) {
            return res.status(403).json({ error: 'Accesso ai consensi di un altro tenant non consentito' });
        }

        const consents = await PersonDataShareConsentService.getConsentsByTargetTenant(tenantId);

        res.json({ consents });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', tenantId: req.params.tenantId }, 'Error getting consents as target');
        res.status(500).json({ error: 'Errore durante il recupero dei consensi' });
    }
});

/**
 * GET /api/v1/tenants/:tenantId/consents/stats
 * Ottiene statistiche sui consensi per un tenant
 */
router.get('/tenants/:tenantId/stats', requireAuth, requirePermissions('gdpr:read'), async (req, res) => {
    try {
        const { tenantId } = req.params;

        // F208: Tenant isolation
        const effectiveTenantId = getEffectiveTenantId(req);
        if (effectiveTenantId !== tenantId) {
            return res.status(403).json({ error: 'Accesso alle statistiche di un altro tenant non consentito' });
        }

        const stats = await PersonDataShareConsentService.getConsentStats(tenantId);

        res.json(stats);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', tenantId: req.params.tenantId }, 'Error getting consent stats');
        res.status(500).json({ error: 'Errore durante il recupero delle statistiche' });
    }
});

export default router;
