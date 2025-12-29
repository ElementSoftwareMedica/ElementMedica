/**
 * Visite Routes
 * CRUD operations for medical visits
 * 
 * Base path: /api/v1/clinica/visite
 * 
 * @module routes/clinica/visite
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import middleware from '../../auth/middleware.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { clinicalValidators } from '../../config/validation-clinical.js';
import { VisitaService } from '../../services/clinical/VisitaService.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { auditClinico } from './utils/clinica-utils.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// STATIC ROUTES (before :id params)
// ============================================

/**
 * @route GET /visite/today
 * @desc Riepilogo visite di oggi
 * @access Authenticated + VIEW_VISITE
 */
router.get('/today',
    authenticateToken(),
    checkAdvancedPermission('visite', 'read'),
    auditClinico('today_visite_summary'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.query;

            const summary = await VisitaService.getTodaySummary(tenantId, medicoId);

            res.json({ success: true, data: summary });
        } catch (error) {
            logger.error('Failed to get today visite summary', {
                component: 'visite-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del riepilogo',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /visite/stati
 * @desc Lista stati visita disponibili
 * @access Authenticated
 */
router.get('/stati',
    authenticateToken(),
    async (req, res) => {
        try {
            const stati = VisitaService.getStati();
            const transizioni = VisitaService.getTransizioni();

            res.json({
                success: true,
                data: { stati, transizioni }
            });
        } catch (error) {
            logger.error('Failed to get visite stati', {
                component: 'visite-routes',
                error: error.message
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli stati',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /visite/paziente/:pazienteId
 * @desc Lista visite di un paziente
 * @access Authenticated + VIEW_VISITE
 */
router.get('/paziente/:pazienteId',
    authenticateToken(),
    checkAdvancedPermission('visite', 'read'),
    auditClinico('list_visite_paziente'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const visite = await VisitaService.getByPaziente(pazienteId, tenantId);

            res.json({ success: true, data: visite, pazienteId });
        } catch (error) {
            logger.error('Failed to list visite by paziente', {
                component: 'visite-routes',
                error: error.message,
                pazienteId: req.params.pazienteId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle visite',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /visite/medico/:medicoId
 * @desc Lista visite di un medico
 * @access Authenticated + VIEW_VISITE
 */
router.get('/medico/:medicoId',
    authenticateToken(),
    checkAdvancedPermission('visite', 'read'),
    auditClinico('list_visite_medico'),
    async (req, res) => {
        try {
            const { medicoId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { stato, dataInizio, dataFine } = req.query;

            const filters = {};
            if (stato) filters.stato = stato;
            if (dataInizio) filters.dataInizio = dataInizio;
            if (dataFine) filters.dataFine = dataFine;

            const visite = await VisitaService.getByMedico(medicoId, tenantId, filters);

            res.json({ success: true, data: visite, medicoId });
        } catch (error) {
            logger.error('Failed to list visite by medico', {
                component: 'visite-routes',
                error: error.message,
                medicoId: req.params.medicoId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle visite',
                message: error.message
            });
        }
    }
);

// ============================================
// LIST & CREATE
// ============================================

/**
 * @route GET /visite
 * @desc Lista visite con filtri e paginazione
 * @access Authenticated + VIEW_VISITE
 */
router.get('/',
    authenticateToken(),
    checkAdvancedPermission('visite', 'read'),
    clinicalValidators.visita.query,
    auditClinico('list_visite'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, stato, pazienteId, medicoId, dataInizio, dataFine } = req.query;

            const filters = {};
            if (search) filters.search = search;
            if (stato) filters.stato = stato;
            if (pazienteId) filters.pazienteId = pazienteId;
            if (medicoId) filters.medicoId = medicoId;
            if (dataInizio) filters.dataInizio = dataInizio;
            if (dataFine) filters.dataFine = dataFine;

            const visite = await VisitaService.getAll(tenantId, filters, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: visite.data,
                pagination: visite.pagination
            });
        } catch (error) {
            logger.error('Failed to list visite', {
                component: 'visite-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle visite',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /visite
 * @desc Crea nuova visita
 * @access Authenticated + CREATE_VISITE
 */
router.post('/',
    authenticateToken(),
    checkAdvancedPermission('visite', 'create'),
    clinicalValidators.visita.create,
    auditClinico('create_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const visita = await VisitaService.create({
                ...req.body,
                tenantId,
                createdBy
            });

            res.status(201).json({
                success: true,
                data: visita,
                message: 'Visita creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create visita', {
                component: 'visite-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Risorsa non trovata',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della visita',
                message: error.message
            });
        }
    }
);

// ============================================
// GET BY ID
// ============================================

/**
 * @route GET /visite/:id
 * @desc Dettaglio visita
 * @access Authenticated + VIEW_VISITE
 */
router.get('/:id',
    authenticateToken(),
    checkAdvancedPermission('visite', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const visita = await VisitaService.getById(id, tenantId);

            res.json({ success: true, data: visita });
        } catch (error) {
            logger.error('Failed to get visita', {
                component: 'visite-routes',
                error: error.message,
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della visita',
                message: error.message
            });
        }
    }
);

// ============================================
// UPDATE
// ============================================

/**
 * @route PUT /visite/:id
 * @desc Aggiorna visita
 * @access Authenticated + UPDATE_VISITE
 */
router.put('/:id',
    authenticateToken(),
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.visita.update,
    auditClinico('update_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const visita = await VisitaService.update(id, tenantId, {
                ...req.body,
                updatedBy
            });

            res.json({
                success: true,
                data: visita,
                message: 'Visita aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update visita', {
                component: 'visite-routes',
                error: error.message,
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Cannot update')) {
                return res.status(409).json({
                    success: false,
                    error: 'Operazione non consentita',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento della visita',
                message: error.message
            });
        }
    }
);

// ============================================
// DELETE
// ============================================

/**
 * @route DELETE /visite/:id
 * @desc Elimina visita (soft delete)
 * @access Authenticated + DELETE_VISITE
 */
router.delete('/:id',
    authenticateToken(),
    checkAdvancedPermission('visite', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await VisitaService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Visita eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete visita', {
                component: 'visite-routes',
                error: error.message,
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Cannot delete')) {
                return res.status(409).json({
                    success: false,
                    error: 'Impossibile eliminare la visita',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione della visita',
                message: error.message
            });
        }
    }
);

// ============================================
// STATUS UPDATE
// ============================================

/**
 * @route PUT /visite/:id/status
 * @desc Cambia stato visita
 * @access Authenticated + UPDATE_VISITE
 */
router.put('/:id/status',
    authenticateToken(),
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.visita.changeStatus,
    auditClinico('change_visita_status'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { stato } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const visita = await VisitaService.changeStatus(id, tenantId, stato, updatedBy);

            res.json({
                success: true,
                data: visita,
                message: 'Stato visita aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to change visita status', {
                component: 'visite-routes',
                error: error.message,
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Cannot transition') || error.message.includes('Invalid status')) {
                return res.status(400).json({
                    success: false,
                    error: 'Transizione stato non valida',
                    message: error.message,
                    validStates: VisitaService.getStati(),
                    transitions: VisitaService.getTransizioni()
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel cambio stato',
                message: error.message
            });
        }
    }
);

// ============================================
// SIGN
// ============================================

/**
 * @route POST /visite/:id/sign
 * @desc Firma visita (medico)
 * @access Authenticated + UPDATE_VISITE (solo medico assegnato)
 */
router.post('/:id/sign',
    authenticateToken(),
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.visita.sign,
    auditClinico('sign_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { firmaMedico } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const medicoId = req.person.id;

            const visita = await VisitaService.sign(id, tenantId, firmaMedico, medicoId);

            res.json({
                success: true,
                data: visita,
                message: 'Visita firmata con successo'
            });
        } catch (error) {
            logger.error('Failed to sign visita', {
                component: 'visite-routes',
                error: error.message,
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Only the assigned doctor')) {
                return res.status(403).json({
                    success: false,
                    error: 'Non autorizzato',
                    message: error.message
                });
            }

            if (error.message.includes('Cannot sign')) {
                return res.status(400).json({
                    success: false,
                    error: 'Impossibile firmare la visita',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella firma della visita',
                message: error.message
            });
        }
    }
);

export default router;
