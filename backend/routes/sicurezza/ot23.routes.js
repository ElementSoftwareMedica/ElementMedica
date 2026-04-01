/**
 * OT23 Routes - Gestione Modello OT23 INAIL
 * 
 * API per gestione domanda riduzione tasso medio tariffa INAIL
 * 
 * @module routes/sicurezza/ot23.routes
 * @project P44 - ElementSicurezza OT23 Management
 */

import express from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import OT23Service from '../../services/clinical/OT23Service.js';
import logger from '../../utils/logger.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { validateParamId } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

/**
 * @route GET /api/v1/sicurezza/ot23/catalogo
 * @desc Ottiene catalogo interventi OT23 con punteggi
 * @access Private - VIEW_COMPANIES
 */
router.get('/catalogo', requireAuth, requirePermission('companies:read'), async (req, res) => {
    try {
        const catalogo = OT23Service.getCatalogoInterventi();
        res.json({
            success: true,
            data: catalogo
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore recupero catalogo OT23');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero del catalogo',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/sicurezza/ot23/calcola-risparmio
 * @desc Calcola risparmio stimato in base a premio e dipendenti
 * @access Private - VIEW_COMPANIES
 */
router.get('/calcola-risparmio', requireAuth, requirePermission('companies:read'), async (req, res) => {
    try {
        const { premioAnnuale, numeroDipendenti } = req.query;

        if (!premioAnnuale || !numeroDipendenti) {
            return res.status(400).json({
                success: false,
                error: 'Parametri mancanti',
                message: 'Fornire premioAnnuale e numeroDipendenti'
            });
        }

        const result = OT23Service.calcolaRisparmioStimato(
            parseFloat(premioAnnuale),
            parseInt(numeroDipendenti)
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore calcolo risparmio OT23');
        res.status(500).json({
            success: false,
            error: 'Errore nel calcolo del risparmio',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/sicurezza/ot23/dashboard/:anno
 * @desc Dashboard aggregata OT23 per anno
 * @access Private - VIEW_COMPANIES
 */
router.get('/dashboard/:anno', requireAuth, requirePermission('companies:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const anno = parseInt(req.params.anno);

        if (!anno || isNaN(anno) || anno < 2000 || anno > 2100) {
            return res.status(400).json({
                success: false,
                error: 'Anno non valido'
            });
        }

        const dashboard = await OT23Service.getDashboard(anno, tenantId);

        res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', anno: req.params.anno }, 'Errore dashboard OT23');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero della dashboard',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/sicurezza/ot23
 * @desc Lista domande OT23 con filtri e paginazione
 * @access Private - VIEW_COMPANIES
 */
router.get('/', requireAuth, requirePermission('companies:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const {
            page = 1,
            limit = 20,
            companyTenantProfileId,
            anno,
            stato
        } = req.query;

        const result = await OT23Service.findAll(tenantId, {
            page: parseInt(page),
            limit: parseInt(limit),
            companyTenantProfileId,
            anno,
            stato
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore lista OT23');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero delle domande OT23',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/sicurezza/ot23/:id
 * @desc Dettaglio singola domanda OT23
 * @access Private - VIEW_COMPANIES
 */
router.get('/:id', requireAuth, requirePermission('companies:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const domanda = await OT23Service.findById(id, tenantId);

        if (!domanda) {
            return res.status(404).json({
                success: false,
                error: 'Domanda OT23 non trovata'
            });
        }

        res.json({
            success: true,
            data: domanda
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore dettaglio OT23');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero della domanda',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route POST /api/v1/sicurezza/ot23
 * @desc Crea nuova domanda OT23
 * @access Private - EDIT_COMPANIES
 */
router.post('/', requireAuth, requirePermission('companies:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const data = req.body;

        if (!data.companyTenantProfileId || !data.anno) {
            return res.status(400).json({
                success: false,
                error: 'Dati mancanti',
                message: 'companyTenantProfileId e anno sono obbligatori'
            });
        }

        const domanda = await OT23Service.create(data, tenantId);

        logger.info({ id: domanda.id, anno: data.anno, tenantId }, 'Domanda OT23 creata');

        res.status(201).json({
            success: true,
            data: domanda,
            message: 'Domanda OT23 creata con successo'
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore creazione OT23');
        res.status(error.message.includes('già esistente') ? 409 : 500).json({
            success: false,
            error: 'Errore nella creazione della domanda',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route PUT /api/v1/sicurezza/ot23/:id
 * @desc Aggiorna domanda OT23
 * @access Private - EDIT_COMPANIES
 */
router.put('/:id', requireAuth, requirePermission('companies:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const data = req.body;

        const domanda = await OT23Service.update(id, data, tenantId);

        logger.info({ id, tenantId }, 'Domanda OT23 aggiornata');

        res.json({
            success: true,
            data: domanda,
            message: 'Domanda aggiornata con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore aggiornamento OT23');
        res.status(error.message.includes('non trovata') ? 404 : 500).json({
            success: false,
            error: 'Errore nell\'aggiornamento della domanda',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route POST /api/v1/sicurezza/ot23/:id/interventi
 * @desc Aggiunge un intervento alla domanda
 * @access Private - EDIT_COMPANIES
 */
router.post('/:id/interventi', requireAuth, requirePermission('companies:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const { sezione, intervento } = req.body;

        if (!sezione || !intervento) {
            return res.status(400).json({
                success: false,
                error: 'Dati mancanti',
                message: 'sezione e intervento sono obbligatori'
            });
        }

        if (!['A', 'B'].includes(sezione)) {
            return res.status(400).json({
                success: false,
                error: 'Sezione non valida',
                message: 'sezione deve essere A o B'
            });
        }

        const domanda = await OT23Service.addIntervento(id, sezione, intervento, tenantId);

        res.json({
            success: true,
            data: domanda,
            message: 'Intervento aggiunto con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore aggiunta intervento OT23');
        res.status(500).json({
            success: false,
            error: 'Errore nell\'aggiunta dell\'intervento',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route DELETE /api/v1/sicurezza/ot23/:id/interventi/:codice
 * @desc Rimuove un intervento dalla domanda
 * @access Private - EDIT_COMPANIES
 */
router.delete('/:id/interventi/:codice', requireAuth, requirePermission('companies:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id, codice } = req.params;
        const { sezione } = req.query;

        if (!sezione || !['A', 'B'].includes(sezione)) {
            return res.status(400).json({
                success: false,
                error: 'Sezione non valida',
                message: 'Fornire sezione=A o sezione=B come query param'
            });
        }

        const domanda = await OT23Service.removeIntervento(id, sezione, codice, tenantId);

        res.json({
            success: true,
            data: domanda,
            message: 'Intervento rimosso con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore rimozione intervento OT23');
        res.status(500).json({
            success: false,
            error: 'Errore nella rimozione dell\'intervento',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route PUT /api/v1/sicurezza/ot23/:id/stato
 * @desc Aggiorna stato domanda OT23
 * @access Private - EDIT_COMPANIES
 */
router.put('/:id/stato', requireAuth, requirePermission('companies:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const { stato, ...metadata } = req.body;

        if (!stato) {
            return res.status(400).json({
                success: false,
                error: 'Stato mancante'
            });
        }

        const domanda = await OT23Service.updateStato(id, stato, metadata, tenantId);

        logger.info({ id, stato, tenantId }, 'Stato OT23 aggiornato');

        res.json({
            success: true,
            data: domanda,
            message: `Stato aggiornato a ${stato}`
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore aggiornamento stato OT23');
        res.status(error.message.includes('non permessa') ? 400 : 500).json({
            success: false,
            error: 'Errore nell\'aggiornamento dello stato',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route GET /api/v1/sicurezza/ot23/:id/xml
 * @desc Genera anteprima XML per INAIL
 * @access Private - VIEW_COMPANIES
 */
router.get('/:id/xml', requireAuth, requirePermission('companies:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const xml = await OT23Service.generateXmlPreview(id, tenantId);

        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore generazione XML OT23');
        res.status(500).json({
            success: false,
            error: 'Errore nella generazione dell\'XML',
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route DELETE /api/v1/sicurezza/ot23/:id
 * @desc Elimina domanda OT23 (soft delete)
 * @access Private - DELETE_COMPANIES
 */
router.delete('/:id', requireAuth, requirePermission('companies:delete'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        await OT23Service.delete(id, tenantId);

        logger.info({ id, tenantId }, 'Domanda OT23 eliminata');

        res.json({
            success: true,
            message: 'Domanda eliminata con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore eliminazione OT23');
        res.status(error.message.includes('non trovata') ? 404 : 500).json({
            success: false,
            error: 'Errore nell\'eliminazione della domanda',
            message: 'Errore interno del server'
        });
    }
});

export default router;
