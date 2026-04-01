/**
 * Referti Routes
 * CRUD operations for medical reports
 * 
 * Base path: /api/v1/clinica/referti
 * 
 * @module routes/clinica/referti
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import middleware from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { clinicalValidators } from '../../config/validation-clinical.js';
import { RefertoService } from '../../services/clinical/RefertoService.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { auditClinico } from './utils/clinica-utils.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// STATIC ROUTES (before :id params)
// ============================================

/**
 * @route GET /referti/pending
 * @desc Lista referti in attesa di firma
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/pending',
    authenticateToken,
    checkAdvancedPermission('referti', 'read'),
    auditClinico('list_referti_pending'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.query;

            const referti = await RefertoService.getPending(tenantId, medicoId);

            res.json({
                success: true,
                data: referti,
                count: referti.length
            });
        } catch (error) {
            logger.error('Failed to get pending referti', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei referti',
            });
        }
    }
);

/**
 * @route GET /referti/da-firmare
 * @desc Lista referti in attesa di firma (alias di /pending)
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/da-firmare',
    authenticateToken,
    checkAdvancedPermission('referti', 'read'),
    auditClinico('list_referti_da_firmare'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.query;

            const referti = await RefertoService.getPending(tenantId, medicoId);

            res.json({
                success: true,
                data: referti,
                count: referti.length
            });
        } catch (error) {
            logger.error('Failed to get referti da firmare', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei referti',
            });
        }
    }
);

/**
 * @route GET /referti/stati
 * @desc Lista stati referto disponibili
 * @access Authenticated
 */
router.get('/stati',
    authenticateToken,
    async (req, res) => {
        try {
            const stati = RefertoService.getStati();
            const transizioni = RefertoService.getTransizioni();

            res.json({
                success: true,
                data: { stati, transizioni }
            });
        } catch (error) {
            logger.error('Failed to get referti stati', {
                component: 'referti-routes',
                error: 'Operazione non riuscita'
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli stati',
            });
        }
    }
);

/**
 * @route GET /referti/visita/:visitaId
 * @desc Lista referti di una visita
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/visita/:visitaId',
    authenticateToken,
    checkAdvancedPermission('referti', 'read'),
    auditClinico('list_referti_visita'),
    async (req, res) => {
        try {
            const { visitaId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const referti = await RefertoService.getByVisita(visitaId, tenantId);

            res.json({ success: true, data: referti, visitaId });
        } catch (error) {
            logger.error('Failed to list referti by visita', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                visitaId: req.params.visitaId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei referti',
            });
        }
    }
);

/**
 * @route GET /referti/paziente/:pazienteId
 * @desc Lista referti di un paziente
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/paziente/:pazienteId',
    authenticateToken,
    checkAdvancedPermission('referti', 'read'),
    auditClinico('list_referti_paziente'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const referti = await RefertoService.getByPaziente(pazienteId, tenantId);

            res.json({ success: true, data: referti, pazienteId });
        } catch (error) {
            logger.error('Failed to list referti by paziente', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                pazienteId: req.params.pazienteId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei referti',
            });
        }
    }
);

// ============================================
// LIST & CREATE
// ============================================

/**
 * @route GET /referti
 * @desc Lista referti con filtri e paginazione
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/',
    authenticateToken,
    checkAdvancedPermission('referti', 'read'),
    clinicalValidators.referto.query,
    auditClinico('list_referti'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, stato, tipo, visitaId, dataInizio, dataFine } = req.query;

            const filters = {};
            if (search) filters.search = search;
            if (stato) filters.stato = stato;
            if (tipo) filters.tipo = tipo;
            if (visitaId) filters.visitaId = visitaId;
            if (dataInizio) filters.dataInizio = dataInizio;
            if (dataFine) filters.dataFine = dataFine;

            const referti = await RefertoService.getAll(tenantId, filters, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: referti.data,
                pagination: referti.pagination
            });
        } catch (error) {
            logger.error('Failed to list referti', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei referti',
            });
        }
    }
);

/**
 * @route POST /referti
 * @desc Crea nuovo referto
 * @access Authenticated + CREATE_REFERTI
 */
router.post('/',
    authenticateToken,
    checkAdvancedPermission('referti', 'create'),
    clinicalValidators.referto.create,
    auditClinico('create_referto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const referto = await RefertoService.create({
                ...req.body,
                tenantId,
                createdBy
            });

            res.status(201).json({
                success: true,
                data: referto,
                message: 'Referto creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create referto', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
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
                error: 'Errore nella creazione del referto',
            });
        }
    }
);

// ============================================
// GET BY ID
// ============================================

/**
 * @route GET /referti/:id
 * @desc Dettaglio referto
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/:id',
    authenticateToken,
    checkAdvancedPermission('referti', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_referto'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const referto = await RefertoService.getById(id, tenantId);

            res.json({ success: true, data: referto });
        } catch (error) {
            logger.error('Failed to get referto', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del referto',
            });
        }
    }
);

// ============================================
// UPDATE
// ============================================

/**
 * @route PUT /referti/:id
 * @desc Aggiorna referto
 * @access Authenticated + UPDATE_REFERTI
 */
router.put('/:id',
    authenticateToken,
    checkAdvancedPermission('referti', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.referto.update,
    auditClinico('update_referto'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const referto = await RefertoService.update(id, tenantId, {
                ...req.body,
                updatedBy
            });

            res.json({
                success: true,
                data: referto,
                message: 'Referto aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update referto', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            if (error.message.includes('Cannot update')) {
                return res.status(409).json({
                    success: false,
                    error: 'Operazione non consentita',
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del referto',
            });
        }
    }
);

// ============================================
// DELETE
// ============================================

/**
 * @route DELETE /referti/:id
 * @desc Elimina referto (soft delete)
 * @access Authenticated + DELETE_REFERTI
 */
router.delete('/:id',
    authenticateToken,
    checkAdvancedPermission('referti', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_referto'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await RefertoService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Referto eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete referto', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            if (error.message.includes('Cannot delete')) {
                return res.status(409).json({
                    success: false,
                    error: 'Impossibile eliminare il referto',
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del referto',
            });
        }
    }
);

// ============================================
// STATUS UPDATE
// ============================================

/**
 * @route PUT /referti/:id/status
 * @desc Cambia stato referto
 * @access Authenticated + UPDATE_REFERTI
 */
router.put('/:id/status',
    authenticateToken,
    checkAdvancedPermission('referti', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.referto.changeStatus,
    auditClinico('change_referto_status'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { stato } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const referto = await RefertoService.changeStatus(id, tenantId, stato, updatedBy);

            res.json({
                success: true,
                data: referto,
                message: 'Stato referto aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to change referto status', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            if (error.message.includes('Cannot transition') || error.message.includes('Invalid status')) {
                return res.status(400).json({
                    success: false,
                    error: 'Transizione stato non valida',
                    validStates: RefertoService.getStati(),
                    transitions: RefertoService.getTransizioni()
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel cambio stato',
            });
        }
    }
);

// ============================================
// SIGN
// ============================================

/**
 * @route POST /referti/:id/sign
 * @desc Firma referto (medico)
 * @access Authenticated + UPDATE_REFERTI
 */
router.post('/:id/sign',
    authenticateToken,
    checkAdvancedPermission('referti', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.referto.sign,
    auditClinico('sign_referto'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { firmaMedico } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const medicoId = req.person.id;

            const referto = await RefertoService.sign(id, tenantId, firmaMedico, medicoId);

            res.json({
                success: true,
                data: referto,
                message: 'Referto firmato con successo'
            });
        } catch (error) {
            logger.error('Failed to sign referto', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            if (error.message.includes('Only the visit doctor')) {
                return res.status(403).json({
                    success: false,
                    error: 'Non autorizzato',
                });
            }

            if (error.message.includes('Cannot sign')) {
                return res.status(400).json({
                    success: false,
                    error: 'Impossibile firmare il referto',
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella firma del referto',
            });
        }
    }
);

// ============================================
// DELIVER
// ============================================

/**
 * @route POST /referti/:id/deliver
 * @desc Segna referto come consegnato
 * @access Authenticated + UPDATE_REFERTI
 */
router.post('/:id/deliver',
    authenticateToken,
    checkAdvancedPermission('referti', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.referto.deliver,
    auditClinico('deliver_referto'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { consegnatoA, metodiConsegna } = req.body;
            const tenantId = getEffectiveTenantId(req);

            const referto = await RefertoService.deliver(id, tenantId, {
                consegnatoA,
                metodiConsegna
            });

            res.json({
                success: true,
                data: referto,
                message: 'Referto consegnato con successo'
            });
        } catch (error) {
            logger.error('Failed to deliver referto', {
                component: 'referti-routes',
                error: 'Operazione non riuscita',
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            if (error.message.includes('Cannot deliver')) {
                return res.status(400).json({
                    success: false,
                    error: 'Impossibile consegnare il referto',
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella consegna del referto',
            });
        }
    }
);

export default router;
