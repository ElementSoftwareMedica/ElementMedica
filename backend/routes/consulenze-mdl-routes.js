/**
 * Consulenze MDL Routes
 *
 * CRUD + azioni per le consulenze di Medicina del Lavoro per azienda.
 *
 * Base: /api/v1/consulenze-mdl
 */

import express from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import ConsulenzaMDLService from '../services/management/ConsulenzaMDLService.js';
import MovimentoContabileGenerator from '../services/management/MovimentoContabileGenerator.js';
import { logger } from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { validateParamId } from '../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

// Tutte le route richiedono autenticazione
router.use(authenticate);

/**
 * GET /api/v1/consulenze-mdl
 * Lista consulenze (filtrate per azienda e/o stato)
 */
router.get('/', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { companyTenantProfileId, stato, page, limit } = req.query;

        const result = await ConsulenzaMDLService.getAll(tenantId, {
            companyTenantProfileId,
            stato,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 50
        });

        res.json({ success: true, ...result });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore GET consulenze-mdl');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /api/v1/consulenze-mdl/:id
 * Dettaglio singola consulenza
 */
router.get('/:id', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const data = await ConsulenzaMDLService.getById(req.params.id, tenantId);
        res.json({ success: true, data });
    } catch (error) {
        const status = error.message === 'Consulenza non trovata' ? 404 : 500;
        res.status(status).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /api/v1/consulenze-mdl
 * Crea una nuova consulenza
 */
router.post('/', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const data = await ConsulenzaMDLService.create(req.body, tenantId);

        // Genera automaticamente MovimentoContabile ENTRATA (idempotente, non blocca)
        setImmediate(() =>
            MovimentoContabileGenerator.generaPerConsulenza(data, tenantId, req.person?.id || null)
        );

        res.status(201).json({ success: true, data });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', body: req.body }, 'Errore POST consulenze-mdl');
        const status = error.message.includes('obbligatorio') || error.message.includes('deve essere') ? 400 : 500;
        res.status(status).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PUT /api/v1/consulenze-mdl/:id
 * Aggiorna una consulenza (solo DA_RENDICONTARE)
 */
router.put('/:id', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const data = await ConsulenzaMDLService.update(req.params.id, req.body, tenantId);

        // P-MDL: Aggiorna (o rigenera) MovimentiContabili BOZZA con i dati aggiornati
        setImmediate(() =>
            MovimentoContabileGenerator.aggiornaPerConsulenza(data, tenantId, req.person?.id || null)
        );

        res.json({ success: true, data });
    } catch (error) {
        const status = error.message === 'Consulenza non trovata' ? 404
            : error.message.includes('possibile modificare') ? 422 : 500;
        res.status(status).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PATCH /api/v1/consulenze-mdl/:id/rendiconta
 * Segna come RENDICONTATA
 */
router.patch('/:id/rendiconta', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const data = await ConsulenzaMDLService.rendiconta(req.params.id, tenantId);
        res.json({ success: true, data, message: 'Consulenza rendicontata con successo' });
    } catch (error) {
        const status = error.message === 'Consulenza non trovata' ? 404
            : error.message.includes('possono essere') ? 422 : 500;
        res.status(status).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PATCH /api/v1/consulenze-mdl/:id/annulla
 * Annulla una consulenza
 */
router.patch('/:id/annulla', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const data = await ConsulenzaMDLService.annulla(req.params.id, tenantId);
        res.json({ success: true, data, message: 'Consulenza annullata' });
    } catch (error) {
        const status = error.message === 'Consulenza non trovata' ? 404
            : error.message.includes('impossibile annullare') ? 422 : 500;
        res.status(status).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * DELETE /api/v1/consulenze-mdl/:id
 * Soft delete (GDPR compliant) — richiede deletionReason nel body
 */
router.delete('/:id', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { deletionReason } = req.body;
        const consulenzaId = req.params.id;

        await ConsulenzaMDLService.delete(consulenzaId, tenantId, deletionReason);

        // P-MDL: Annulla movimenti BOZZA/CONFERMATO collegati alla consulenza eliminata
        setImmediate(() =>
            MovimentoContabileGenerator.annullaMovimentiSorgente(
                { consulenzaId },
                tenantId,
                req.person?.id || null
            )
        );

        res.json({ success: true, message: 'Consulenza eliminata' });
    } catch (error) {
        const status = error.message === 'Consulenza non trovata' ? 404
            : error.message.includes('motivo') ? 400 : 500;
        res.status(status).json({ success: false, error: 'Errore interno del server' });
    }
});

export default router;
