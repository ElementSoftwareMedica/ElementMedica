/**
 * PEC Routes - Invio PEC per Giudizi di Idoneità
 * 
 * Routes per gestione invio comunicazioni PEC:
 * - Invio giudizio al lavoratore
 * - Invio giudizio al datore di lavoro
 * - Tracking stato consegna
 * - Log invii
 * 
 * @module routes/clinica/pec.routes
 * @project P56 - Medicina del Lavoro - FASE 4 PEC Integration
 * @compliance D.Lgs 81/08 Art. 41
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { requireFeature } from '../../middleware/featureFlags.js';
import PECService from '../../services/clinical/PECService.js';
import IdoneityNotificationService from '../../services/clinical/IdoneityNotificationService.js';
import logger from '../../utils/logger.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { validateParamId } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

// ============================================
// MIDDLEWARE
// ============================================

// Tutte le routes richiedono autenticazione + feature PEC_INTEGRATION
router.use(authenticate);
router.use(requireFeature('PEC_INTEGRATION'));

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/v1/clinica/pec/giudizio/:id/lavoratore
 * Invia giudizio di idoneità al lavoratore via PEC
 */
router.post('/giudizio/:id/lavoratore', requirePermission('giudizi:write'), async (req, res) => {
    try {
        const { id } = req.params;
        const { pecDestinatario, ccDatoreLavoro } = req.body;
        const tenantId = getEffectiveTenantId(req);

        const result = await PECService.sendGiudizioToWorker(id, tenantId, {
            pecDestinatario,
            ccDatoreLavoro
        });

        logger.info({
            giudizioId: id,
            messageId: result.messageId,
            performedBy: req.person.id,
            tenantId
        }, 'PEC giudizio inviata al lavoratore');

        res.json({
            success: true,
            data: result,
            message: 'PEC inviata con successo al lavoratore'
        });

    } catch (error) {
        logger.error({
            giudizioId: req.params.id,
            error: 'Operazione non riuscita',
            tenantId: getEffectiveTenantId(req)
        }, 'Errore invio PEC al lavoratore');

        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * POST /api/v1/clinica/pec/giudizio/:id/datore
 * Invia giudizio di idoneità al datore di lavoro via PEC
 */
router.post('/giudizio/:id/datore', requirePermission('giudizi:write'), async (req, res) => {
    try {
        const { id } = req.params;
        const { pecDestinatario } = req.body;
        const tenantId = getEffectiveTenantId(req);

        const result = await PECService.sendGiudizioToEmployer(id, tenantId, {
            pecDestinatario
        });

        logger.info({
            giudizioId: id,
            messageId: result.messageId,
            performedBy: req.person.id,
            tenantId
        }, 'PEC giudizio inviata al datore di lavoro');

        res.json({
            success: true,
            data: result,
            message: 'PEC inviata con successo al datore di lavoro'
        });

    } catch (error) {
        logger.error({
            giudizioId: req.params.id,
            error: 'Operazione non riuscita',
            tenantId: getEffectiveTenantId(req)
        }, 'Errore invio PEC al datore');

        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * POST /api/v1/clinica/pec/giudizio/:id/both
 * Invia giudizio a entrambi (lavoratore e datore)
 */
router.post('/giudizio/:id/both', requirePermission('giudizi:write'), async (req, res) => {
    try {
        const { id } = req.params;
        const { pecLavoratore, pecDatoreLavoro } = req.body;
        const tenantId = getEffectiveTenantId(req);

        const results = {
            lavoratore: null,
            datore: null,
            errors: []
        };

        // Invio al lavoratore
        try {
            results.lavoratore = await PECService.sendGiudizioToWorker(id, tenantId, {
                pecDestinatario: pecLavoratore
            });
        } catch (error) {
            results.errors.push({ recipient: 'lavoratore', error: 'Errore interno del server' });
        }

        // Invio al datore
        try {
            results.datore = await PECService.sendGiudizioToEmployer(id, tenantId, {
                pecDestinatario: pecDatoreLavoro
            });
        } catch (error) {
            results.errors.push({ recipient: 'datore', error: 'Errore interno del server' });
        }

        const success = results.lavoratore !== null || results.datore !== null;

        logger.info({
            giudizioId: id,
            lavoratoreSuccess: !!results.lavoratore,
            datoreSuccess: !!results.datore,
            performedBy: req.person.id,
            tenantId
        }, 'PEC giudizio inviate');

        res.json({
            success,
            data: results,
            message: success
                ? `PEC inviate: ${results.lavoratore ? 'lavoratore ✓' : ''} ${results.datore ? 'datore ✓' : ''}`
                : 'Errore invio PEC'
        });

    } catch (error) {
        logger.error({
            giudizioId: req.params.id,
            error: 'Operazione non riuscita',
            tenantId: getEffectiveTenantId(req)
        }, 'Errore invio PEC');

        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * GET /api/v1/clinica/pec/giudizio/:id/logs
 * Recupera log PEC per un giudizio
 */
router.get('/giudizio/:id/logs', requirePermission('giudizi:read'), async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getEffectiveTenantId(req);

        const logs = await PECService.getLogsForGiudizio(id, tenantId);

        res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        logger.error({
            giudizioId: req.params.id,
            error: 'Operazione non riuscita',
            tenantId: getEffectiveTenantId(req)
        }, 'Errore recupero log PEC');

        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * GET /api/v1/clinica/pec/status/:messageId
 * Verifica stato consegna PEC
 */
router.get('/status/:messageId', requirePermission('giudizi:read'), async (req, res) => {
    try {
        const { messageId } = req.params;
        const tenantId = getEffectiveTenantId(req);

        const status = await PECService.checkDeliveryStatus(messageId, tenantId);

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        logger.error({
            messageId: req.params.messageId,
            error: 'Operazione non riuscita',
            tenantId: getEffectiveTenantId(req)
        }, 'Errore verifica stato PEC');

        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * POST /api/v1/clinica/pec/receipt
 * Webhook per ricezione ricevute PEC (da provider)
 */
router.post('/receipt', async (req, res) => {
    try {
        const { messageId, tipo, ricevuta, tenantId } = req.body;

        if (!messageId || !tipo || !tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Parametri mancanti: messageId, tipo, tenantId'
            });
        }

        await PECService.registerReceipt(messageId, tipo, ricevuta, tenantId);

        logger.info({
            messageId,
            tipo
        }, 'Ricevuta PEC registrata');

        res.json({
            success: true,
            message: 'Ricevuta registrata'
        });

    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita'
        }, 'Errore registrazione ricevuta PEC');

        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * GET /api/v1/clinica/pec/stats
 * Statistiche invii PEC
 */
router.get('/stats', requirePermission('giudizi:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { from, to } = req.query;

        const period = {};
        if (from) period.from = new Date(from);
        if (to) period.to = new Date(to);

        const stats = await PECService.getStats(tenantId, period);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            tenantId: getEffectiveTenantId(req)
        }, 'Errore recupero statistiche PEC');

        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// ============================================
// INVIO SICURO CON PASSWORD SEPARATA
// ============================================

/**
 * POST /api/v1/clinica/pec/giudizio/:id/secure-send
 * Invia giudizio con ZIP protetto e password via canale separato
 * 
 * @body {Object} recipients - Destinatari
 * @body {Object} [recipients.worker] - Destinatario lavoratore
 * @body {string} [recipients.worker.email] - Email lavoratore
 * @body {string} [recipients.worker.phone] - Telefono per password
 * @body {Object} [recipients.employer] - Destinatario datore
 * @body {string} [recipients.employer.email] - Email datore
 * @body {string} [recipients.employer.phone] - Telefono per password
 * @body {string} [passwordChannel='sms'] - Canale password (sms/whatsapp)
 */
router.post('/giudizio/:id/secure-send', requirePermission('giudizi:write'), async (req, res) => {
    try {
        const { id } = req.params;
        const { recipients, passwordChannel = 'sms' } = req.body;
        const tenantId = getEffectiveTenantId(req);
        const personId = req.person.id;

        if (!recipients?.worker?.email && !recipients?.employer?.email) {
            return res.status(400).json({
                success: false,
                error: 'Almeno un destinatario email è richiesto'
            });
        }

        const result = await IdoneityNotificationService.sendSecureGiudizio({
            giudizioId: id,
            tenantId,
            performedBy: personId,
            recipients,
            passwordChannel
        });

        logger.info({
            giudizioId: id,
            workerSent: !!result.worker,
            employerSent: !!result.employer,
            passwordsSent: result.passwordsSent.length,
            performedBy: personId,
            tenantId
        }, 'Invio sicuro giudizio idoneità completato');

        res.json({
            success: true,
            data: result,
            message: 'Giudizio inviato con successo. Le password sono state inviate separatamente.'
        });

    } catch (error) {
        logger.error({
            giudizioId: req.params.id,
            error: 'Operazione non riuscita',
            tenantId: getEffectiveTenantId(req)
        }, 'Errore invio sicuro giudizio');

        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

export default router;
