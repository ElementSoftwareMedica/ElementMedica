/**
 * Uscite MC Routes
 *
 * CRUD per le uscite del Medico Competente presso sedi aziendali.
 * Genera automaticamente movimenti contabili ENTRATA + USCITA.
 *
 * Base: /api/v1/uscite-mc
 */

import express from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import UscitaMCService from '../services/management/UscitaMCService.js';
import MovimentoContabileGenerator from '../services/management/MovimentoContabileGenerator.js';
import { logger } from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { validateParamId } from '../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

router.use(authenticate);

/**
 * GET /api/v1/uscite-mc
 * Lista uscite MC (filtrate per azienda e/o stato)
 */
router.get('/', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { companyTenantProfileId, stato, page, limit } = req.query;

        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 50;
        if (isNaN(pageNum) || isNaN(limitNum)) {
            return res.status(400).json({ success: false, error: 'page e limit devono essere numeri interi' });
        }

        const result = await UscitaMCService.getAll(tenantId, {
            companyTenantProfileId,
            stato,
            page: pageNum,
            limit: limitNum
        });

        res.json({ success: true, ...result });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore GET uscite-mc');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /api/v1/uscite-mc/medici-disponibili
 * Lista medici disponibili per una company (MC nominato + coordinati)
 */
router.get('/medici-disponibili', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { companyTenantProfileId } = req.query;

        if (!companyTenantProfileId) {
            return res.status(400).json({ success: false, error: 'companyTenantProfileId è obbligatorio' });
        }

        const medici = await UscitaMCService.getMediciDisponibili(companyTenantProfileId, tenantId);
        res.json({ success: true, data: medici });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore GET medici-disponibili uscite-mc');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * GET /api/v1/uscite-mc/:id
 * Dettaglio singola uscita MC
 */
router.get('/:id', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const data = await UscitaMCService.getById(req.params.id, tenantId);
        res.json({ success: true, data });
    } catch (error) {
        const status = error.message === 'Uscita MC non trovata' ? 404 : 500;
        res.status(status).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * POST /api/v1/uscite-mc
 * Registra una nuova uscita MC e genera movimenti contabili automaticamente
 */
router.post('/', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const data = await UscitaMCService.create(req.body, tenantId);

        setImmediate(() =>
            MovimentoContabileGenerator.generaPerUscitaMC(data, tenantId, req.person?.id || null)
                .catch(err => logger.warn({ uscitaMCId: data.id, error: err.message }, 'Billing per uscita MC fallito'))
        );

        res.status(201).json({ success: true, data });
    } catch (error) {
        logger.error({ error: error.message, body: req.body }, 'Errore POST uscite-mc');
        const status = error.message.includes('obbligatorio') || error.message.includes('non trovato') ? 400 : 500;
        res.status(status).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PATCH /api/v1/uscite-mc/:id/annulla
 * Annulla un'uscita MC
 */
router.patch('/:id/annulla', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const data = await UscitaMCService.annulla(req.params.id, tenantId);

        setImmediate(() =>
            MovimentoContabileGenerator.annullaMovimentiSorgente(
                { uscitaMCId: req.params.id },
                tenantId,
                req.person?.id || null
            ).catch(err => logger.warn({ uscitaMCId: req.params.id, error: err.message }, 'Annullamento movimenti uscita MC fallito'))
        );

        res.json({ success: true, data, message: 'Uscita MC annullata' });
    } catch (error) {
        const status = error.message === 'Uscita MC non trovata' ? 404
            : error.message.toLowerCase().includes('impossibile') ? 422 : 500;
        res.status(status).json({ success: false, error: error.message || 'Errore interno del server' });
    }
});

/**
 * DELETE /api/v1/uscite-mc/:id
 * Soft delete (GDPR compliant) — richiede deletionReason nel body
 */
router.delete('/:id', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { deletionReason } = req.body;
        const uscitaMCId = req.params.id;

        await UscitaMCService.delete(uscitaMCId, tenantId, deletionReason, req.person?.id || null);

        setImmediate(() =>
            MovimentoContabileGenerator.annullaMovimentiSorgente(
                { uscitaMCId },
                tenantId,
                req.person?.id || null
            ).catch(err => logger.warn({ uscitaMCId, error: err.message }, 'Annullamento movimenti uscita MC (delete) fallito'))
        );

        res.json({ success: true, message: 'Uscita MC eliminata' });
    } catch (error) {
        const status = error.message === 'Uscita MC non trovata' ? 404
            : error.message.includes('motivo') ? 400 : 500;
        res.status(status).json({ success: false, error: 'Errore interno del server' });
    }
});

export default router;
