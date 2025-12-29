/**
 * Tariffario Aziendale Routes
 * 
 * API endpoints per la gestione dei Tariffari Aziende - Medicina del Lavoro
 * 
 * @module routes/tariffario-aziendale-routes
 */

import express from 'express';
import TariffarioAziendaleService from '../services/management/TariffarioAziendaleService.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Middleware di autenticazione per tutte le routes
router.use(authenticate);

// =============================================
// TARIFFARI CRUD
// =============================================

/**
 * GET /api/v1/tariffari-aziendali
 * Lista tutti i tariffari con filtri
 */
router.get('/', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const { tipo, companyId, convenzioneId, attivo, search, page, limit } = req.query;

        const result = await TariffarioAziendaleService.getAll(req.user.tenantId, {
            tipo,
            companyId,
            convenzioneId,
            attivo: attivo !== undefined ? attivo === 'true' : undefined,
            search,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore lista tariffari');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/tariffari-aziendali/base
 * Lista solo i tariffari base (per dropdown clonazione)
 */
router.get('/base', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const tariffari = await TariffarioAziendaleService.getTariffariBase(req.user.tenantId);
        res.json({
            success: true,
            data: tariffari
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore lista tariffari base');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/tariffari-aziendali/prestazioni-mdl
 * Lista prestazioni Medicina del Lavoro disponibili
 */
router.get('/prestazioni-mdl', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const prestazioni = await TariffarioAziendaleService.getPrestazioniMDL(req.user.tenantId);
        res.json({
            success: true,
            data: prestazioni
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore lista prestazioni MDL');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/tariffari-aziendali/:id
 * Dettaglio tariffario con tutte le voci
 */
router.get('/:id', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const tariffario = await TariffarioAziendaleService.getById(
            req.params.id,
            req.user.tenantId
        );
        res.json({
            success: true,
            data: tariffario
        });
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore dettaglio tariffario');
        res.status(error.message.includes('non trovato') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v1/tariffari-aziendali
 * Crea nuovo tariffario
 */
router.post('/', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const tariffario = await TariffarioAziendaleService.create(
            req.body,
            req.user.tenantId,
            req.user.personId
        );
        res.status(201).json({
            success: true,
            data: tariffario
        });
    } catch (error) {
        logger.error({ error: error.message, body: req.body }, 'Errore creazione tariffario');
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/v1/tariffari-aziendali/:id
 * Aggiorna tariffario
 */
router.put('/:id', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const tariffario = await TariffarioAziendaleService.update(
            req.params.id,
            req.body,
            req.user.tenantId
        );
        res.json({
            success: true,
            data: tariffario
        });
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore aggiornamento tariffario');
        res.status(error.message.includes('non trovato') ? 404 : 400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/v1/tariffari-aziendali/:id
 * Elimina tariffario (soft delete)
 */
router.delete('/:id', requirePermission('tariffari:write'), async (req, res) => {
    try {
        await TariffarioAziendaleService.delete(req.params.id, req.user.tenantId);
        res.json({
            success: true,
            message: 'Tariffario eliminato con successo'
        });
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore eliminazione tariffario');
        res.status(error.message.includes('non trovato') ? 404 : 400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v1/tariffari-aziendali/:id/clone
 * Clona un tariffario per un'azienda
 */
router.post('/:id/clone', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const clone = await TariffarioAziendaleService.clone(
            req.params.id,
            req.body,
            req.user.tenantId,
            req.user.personId
        );
        res.status(201).json({
            success: true,
            data: clone
        });
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore clonazione tariffario');
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// VOCI TARIFFARIO
// =============================================

/**
 * POST /api/v1/tariffari-aziendali/:id/voci
 * Aggiunge una voce al tariffario
 */
router.post('/:id/voci', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const voce = await TariffarioAziendaleService.addVoce(
            req.params.id,
            req.body,
            req.user.tenantId
        );
        res.status(201).json({
            success: true,
            data: voce
        });
    } catch (error) {
        logger.error({ error: error.message, tariffarioId: req.params.id }, 'Errore aggiunta voce');
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/v1/tariffari-aziendali/:id/voci/:voceId
 * Aggiorna una voce del tariffario
 */
router.put('/:id/voci/:voceId', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const voce = await TariffarioAziendaleService.updateVoce(
            req.params.voceId,
            req.body,
            req.user.tenantId
        );
        res.json({
            success: true,
            data: voce
        });
    } catch (error) {
        logger.error({ error: error.message, voceId: req.params.voceId }, 'Errore aggiornamento voce');
        res.status(error.message.includes('non trovata') ? 404 : 400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/v1/tariffari-aziendali/:id/voci/:voceId
 * Elimina una voce del tariffario
 */
router.delete('/:id/voci/:voceId', requirePermission('tariffari:write'), async (req, res) => {
    try {
        await TariffarioAziendaleService.deleteVoce(req.params.voceId, req.user.tenantId);
        res.json({
            success: true,
            message: 'Voce eliminata con successo'
        });
    } catch (error) {
        logger.error({ error: error.message, voceId: req.params.voceId }, 'Errore eliminazione voce');
        res.status(error.message.includes('non trovata') ? 404 : 400).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// FASCE DIPENDENTI
// =============================================

/**
 * POST /api/v1/voci-tariffario/:voceId/fasce
 * Aggiunge una fascia dipendenti a una voce
 */
router.post('/voci/:voceId/fasce', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const fascia = await TariffarioAziendaleService.addFascia(
            req.params.voceId,
            req.body,
            req.user.tenantId
        );
        res.status(201).json({
            success: true,
            data: fascia
        });
    } catch (error) {
        logger.error({ error: error.message, voceId: req.params.voceId }, 'Errore aggiunta fascia');
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/v1/voci-tariffario/:voceId/fasce/:fasciaId
 * Aggiorna una fascia dipendenti
 */
router.put('/voci/:voceId/fasce/:fasciaId', requirePermission('tariffari:write'), async (req, res) => {
    try {
        const fascia = await TariffarioAziendaleService.updateFascia(
            req.params.fasciaId,
            req.body,
            req.user.tenantId
        );
        res.json({
            success: true,
            data: fascia
        });
    } catch (error) {
        logger.error({ error: error.message, fasciaId: req.params.fasciaId }, 'Errore aggiornamento fascia');
        res.status(error.message.includes('non trovata') ? 404 : 400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/v1/voci-tariffario/:voceId/fasce/:fasciaId
 * Elimina una fascia dipendenti
 */
router.delete('/voci/:voceId/fasce/:fasciaId', requirePermission('tariffari:write'), async (req, res) => {
    try {
        await TariffarioAziendaleService.deleteFascia(req.params.fasciaId, req.user.tenantId);
        res.json({
            success: true,
            message: 'Fascia eliminata con successo'
        });
    } catch (error) {
        logger.error({ error: error.message, fasciaId: req.params.fasciaId }, 'Errore eliminazione fascia');
        res.status(error.message.includes('non trovata') ? 404 : 400).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// UTILITY
// =============================================

/**
 * POST /api/v1/voci-tariffario/:voceId/calcola-prezzo
 * Calcola il prezzo per una voce in base al numero dipendenti
 */
router.post('/voci/:voceId/calcola-prezzo', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const { numeroDipendenti } = req.body;

        if (numeroDipendenti === undefined || numeroDipendenti < 0) {
            return res.status(400).json({
                success: false,
                error: 'Numero dipendenti non valido'
            });
        }

        const result = await TariffarioAziendaleService.calcolaPrezzo(
            req.params.voceId,
            numeroDipendenti,
            req.user.tenantId
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error({ error: error.message, voceId: req.params.voceId }, 'Errore calcolo prezzo');
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
