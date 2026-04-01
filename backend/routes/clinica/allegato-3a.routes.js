/**
 * Allegato 3A Routes - Cartella Sanitaria e di Rischio
 * 
 * API per generazione Cartella Sanitaria (Allegato 3A) secondo Art. 41 c.5 D.Lgs 81/08
 * 
 * @module routes/clinica/allegato-3a.routes
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 5
 */

import express from 'express';
import archiver from 'archiver';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import Allegato3AService from '../../services/clinical/Allegato3AService.js';
import Allegato3APdfService from '../../services/clinical/Allegato3APdfService.js';
import logger from '../../utils/logger.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = express.Router();
// NOTE: validateParam for personId/companyTenantProfileId applied inline per route
// to avoid conflicting with static segments like /bulk, /stats, /worker

/**
 * @route GET /api/v1/clinica/allegato-3a/bulk/:companyTenantProfileId
 * @desc Genera dati Allegato 3A per tutti i lavoratori di un'azienda
 * @access Private - VIEW_VISITA
 * NOTE: must be BEFORE /:personId/:companyTenantProfileId to avoid route collision
 */
router.get('/bulk/:companyTenantProfileId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { companyTenantProfileId } = req.params;

        const [results, stats] = await Promise.all([
            Allegato3AService.generateBulkData(companyTenantProfileId, tenantId),
            Allegato3AService.getStats(companyTenantProfileId, tenantId)
        ]);

        // Map to { workers: Allegato3AData[], stats: Allegato3AStats } wrapped in data
        const workers = results.filter(r => r.success).map(r => r.data);

        res.json({
            success: true,
            data: {
                workers,
                stats
            }
        });
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            companyTenantProfileId: req.params.companyTenantProfileId
        }, 'Errore generazione bulk Allegato 3A');
        res.status(500).json({
            success: false,
            error: 'Errore nella generazione bulk degli Allegati 3A',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/clinica/allegato-3a/stats/:companyTenantProfileId
 * @desc Statistiche per generazione Allegato 3A di un'azienda
 * @access Private - VIEW_VISITA
 */
router.get('/stats/:companyTenantProfileId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { companyTenantProfileId } = req.params;

        const stats = await Allegato3AService.getStats(companyTenantProfileId, tenantId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            companyTenantProfileId: req.params.companyTenantProfileId
        }, 'Errore statistiche Allegato 3A');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero delle statistiche',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/clinica/allegato-3a/worker/:personId/history
 * @desc Storico accertamenti sanitari di un lavoratore
 * @access Private - VIEW_VISITA
 */
router.get('/worker/:personId/history', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId } = req.params;

        const accertamenti = await Allegato3AService.getAccertamentiSanitari(personId, tenantId);

        res.json({
            success: true,
            data: accertamenti
        });
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId: req.params.personId
        }, 'Errore storico accertamenti');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero dello storico accertamenti',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/clinica/allegato-3a/worker/:personId/giudizio
 * @desc Giudizio idoneità attuale di un lavoratore
 * @access Private - VIEW_VISITA
 */
router.get('/worker/:personId/giudizio', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId } = req.params;

        const giudizio = await Allegato3AService.getGiudizioAttuale(personId, tenantId);

        res.json({
            success: true,
            data: giudizio
        });
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId: req.params.personId
        }, 'Errore giudizio attuale');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero del giudizio attuale',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/clinica/allegato-3a/bulk/:companyTenantProfileId/zip
 * @desc Genera un archivio ZIP con i PDF di tutti i lavoratori di un'azienda
 * @access Private - VIEW_VISITA
 * NOTE: must be BEFORE /:personId/:companyTenantProfileId
 */
router.get('/bulk/:companyTenantProfileId/zip', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    const { companyTenantProfileId } = req.params;
    try {
        const tenantId = getEffectiveTenantId(req);

        const results = await Allegato3AService.generateBulkData(companyTenantProfileId, tenantId);
        const workers = results.filter(r => r.success && r.data);

        if (workers.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nessun lavoratore trovato per questa azienda'
            });
        }

        const date = new Date().toISOString().slice(0, 10);
        const zipFilename = `allegati3a_${date}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

        const archive = archiver('zip', { zlib: { level: 6 } });
        archive.on('error', err => {
            logger.error({ error: err.message }, 'Errore creazione ZIP Allegato 3A');
            // Response headers already sent, can only destroy
            res.destroy();
        });
        archive.pipe(res);

        for (const worker of workers) {
            try {
                const pdfBuffer = await Allegato3APdfService.generate(worker.data);
                const filename = Allegato3APdfService.filename(worker.data);
                archive.append(pdfBuffer, { name: filename });
            } catch (pdfErr) {
                logger.error({
                    personId: worker.data?.lavoratore?.id,
                    error: pdfErr.message
                }, 'Errore generazione PDF singolo nel ZIP Allegato 3A');
                // Skip this worker's PDF but continue the zip
            }
        }

        await archive.finalize();
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            companyTenantProfileId
        }, 'Errore generazione ZIP Allegato 3A');
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Errore nella generazione dello ZIP degli Allegati 3A'
            });
        }
    }
});

/**
 * @route GET /api/v1/clinica/allegato-3a/:personId/:companyTenantProfileId/pdf
 * @desc Genera il PDF Allegato 3A per un lavoratore specifico
 * @access Private - VIEW_VISITA
 * NOTE: must be BEFORE the bare /:personId/:companyTenantProfileId wildcard
 */
router.get('/:personId/:companyTenantProfileId/pdf', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    const { personId, companyTenantProfileId } = req.params;
    try {
        const tenantId = getEffectiveTenantId(req);

        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRe.test(personId) || !uuidRe.test(companyTenantProfileId)) {
            return res.status(400).json({ success: false, error: 'Parametri non validi' });
        }

        const data = await Allegato3AService.generateData(personId, companyTenantProfileId, tenantId);
        const pdfBuffer = await Allegato3APdfService.generate(data);
        const filename = Allegato3APdfService.filename(data);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.byteLength);
        res.end(pdfBuffer);
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId,
            companyTenantProfileId
        }, 'Errore generazione PDF Allegato 3A');
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Errore nella generazione del PDF Allegato 3A'
            });
        }
    }
});

/**
 * @route GET /api/v1/clinica/allegato-3a/:personId/:companyTenantProfileId
 * @desc Genera dati Allegato 3A per un lavoratore specifico
 * @access Private - VIEW_VISITA
 * NOTE: wildcard route — must be LAST to avoid shadowing /bulk, /stats, /worker/*
 */
router.get('/:personId/:companyTenantProfileId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId, companyTenantProfileId } = req.params;

        // Validate UUIDs inline (router.param was removed to avoid wildcard conflict)
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRe.test(personId) || !uuidRe.test(companyTenantProfileId)) {
            return res.status(400).json({ success: false, error: 'Parametri non validi' });
        }

        const data = await Allegato3AService.generateData(personId, companyTenantProfileId, tenantId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error({
            error: 'Operazione non riuscita',
            personId: req.params.personId,
            companyTenantProfileId: req.params.companyTenantProfileId
        }, 'Errore generazione Allegato 3A');
        res.status(500).json({
            success: false,
            error: 'Errore nella generazione dell\'Allegato 3A',
            message: 'Errore interno del server'
        });
    }
});

export default router;
