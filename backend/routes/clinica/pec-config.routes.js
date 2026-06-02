/**
 * Routes per Configurazione PEC Tenant
 * 
 * Permette ai tenant di configurare le proprie credenziali PEC per:
 * - Invio giudizi di idoneità
 * - Comunicazioni obbligatorie MDL
 * 
 * @module routes/clinica/pec-config.routes
 * @project P56 - Medicina del Lavoro - FASE 4 PEC Integration
 */

import express from 'express';
import TenantPecConfigService from '../../services/clinical/TenantPecConfigService.js';
import { authenticate, requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { requireFeature } from '../../middleware/featureFlags.js';
import logger from '../../utils/logger.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = express.Router();

// Tutti gli endpoint richiedono autenticazione + feature PEC_INTEGRATION
router.use(authenticate);
router.use(requireFeature('PEC_INTEGRATION'));

// ============================================
// GET /api/v1/clinica/pec-config/providers
// Lista provider PEC supportati
// ============================================
router.get('/providers',
    async (req, res) => {
        try {
            const providers = TenantPecConfigService.getAvailableProviders();
            res.json({
                success: true,
                data: providers
            });
        } catch (error) {
            logger.error({ error: error.message }, 'Errore recupero providers PEC');
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// GET /api/v1/clinica/pec-config
// Recupera configurazione PEC del tenant corrente
// ============================================
router.get('/',
    requirePermission('settings:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const config = await TenantPecConfigService.getConfig(tenantId);

            res.json({
                success: true,
                data: config,
                configured: !!config
            });
        } catch (error) {
            logger.error({
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            }, 'Errore recupero config PEC');
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// GET /api/v1/clinica/pec-config/status
// Verifica stato configurazione PEC
// ============================================
router.get('/status',
    requirePermission('settings:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const status = await TenantPecConfigService.checkConfigStatus(tenantId);

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            logger.error({
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            }, 'Errore verifica status PEC');
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// POST /api/v1/clinica/pec-config
// Salva/aggiorna configurazione PEC
// ============================================
router.post('/',
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person.id;
            const data = req.body;

            // Aggiungi info chi ha fatto la modifica
            data.updatedBy = personId;

            const config = await TenantPecConfigService.saveConfig(tenantId, data);

            logger.info({
                tenantId,
                personId,
                provider: config.provider,
                pecAddress: config.pecAddress
            }, 'Configurazione PEC salvata');

            res.json({
                success: true,
                data: config,
                message: 'Configurazione PEC salvata con successo'
            });
        } catch (error) {
            logger.error({
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            }, 'Errore salvataggio config PEC');
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// DELETE /api/v1/clinica/pec-config
// Elimina configurazione PEC
// ============================================
router.delete('/',
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person.id;

            const deleted = await TenantPecConfigService.deleteConfig(tenantId);

            logger.info({
                tenantId,
                personId,
                deleted
            }, 'Configurazione PEC eliminata');

            res.json({
                success: true,
                deleted,
                message: deleted
                    ? 'Configurazione PEC eliminata'
                    : 'Nessuna configurazione da eliminare'
            });
        } catch (error) {
            logger.error({
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            }, 'Errore eliminazione config PEC');
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// POST /api/v1/clinica/pec-config/test
// Testa configurazione PEC inviando email di test
// ============================================
router.post('/test',
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person.id;
            const { testRecipient } = req.body;

            if (!testRecipient) {
                return res.status(400).json({
                    success: false,
                    error: 'Indirizzo destinatario test obbligatorio'
                });
            }

            const result = await TenantPecConfigService.testConfig(tenantId, testRecipient);

            logger.info({
                tenantId,
                personId,
                testRecipient,
                messageId: result.messageId
            }, 'Test PEC eseguito');

            res.json({
                success: true,
                data: result,
                message: `Email di test inviata a ${testRecipient}`
            });
        } catch (error) {
            logger.error({
                tenantId: req.person?.tenantId,
                testRecipient: req.body?.testRecipient,
                error: 'Operazione non riuscita'
            }, 'Errore test PEC');
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

export default router;
