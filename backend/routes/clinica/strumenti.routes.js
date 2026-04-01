/**
 * Strumenti Routes
 * CRUD operations for medical equipment/instruments
 * 
 * Base path: /api/v1/clinica/strumenti
 * 
 * @module routes/clinica/strumenti
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import middleware from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { CLINICAL_ENUMS, clinicalValidators } from '../../config/validation-clinical.js';
import { StrumentoService } from '../../services/clinical/StrumentoService.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { auditClinico } from './utils/clinica-utils.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// STATIC ROUTES (must be before :id params)
// ============================================

/**
 * @route GET /strumenti/tipologie
 * @desc Lista tutte le tipologie strumenti disponibili
 * @access Authenticated
 */
router.get('/tipologie',
    authenticateToken,
    async (req, res) => {
        try {
            const tipologie = StrumentoService.getTipologieDisponibili();
            res.json({ success: true, data: tipologie });
        } catch (error) {
            logger.error('Failed to get tipologie', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle tipologie',
            });
        }
    }
);

/**
 * @route GET /strumenti/tipologie/count
 * @desc Conteggio strumenti per tipologia
 * @access Authenticated
 */
router.get('/tipologie/count',
    authenticateToken,
    auditClinico('strumenti_tipologie_count'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const counts = await StrumentoService.countByTipologia(tenantId);
            res.json({ success: true, data: counts });
        } catch (error) {
            logger.error('Failed to count strumenti by tipologia', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel conteggio per tipologia',
            });
        }
    }
);

/**
 * @route GET /strumenti/by-tipologia/:tipologia
 * @desc Strumenti filtrati per tipologia
 * @access Authenticated
 */
router.get('/by-tipologia/:tipologia',
    authenticateToken,
    auditClinico('strumenti_by_tipologia'),
    async (req, res) => {
        try {
            const { tipologia } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { statoAttivo, ambulatorioId } = req.query;

            const strumenti = await StrumentoService.getByTipologia(tipologia, tenantId, {
                statoAttivo: statoAttivo !== 'false',
                ambulatorioId
            });

            res.json({ success: true, data: strumenti });
        } catch (error) {
            logger.error('Failed to get strumenti by tipologia', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                tipologia: req.params.tipologia,
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero strumenti per tipologia',
            });
        }
    }
);

/**
 * @route GET /strumenti/roi/report
 * @desc Report ROI strumenti
 * @access Authenticated
 */
router.get('/roi/report',
    authenticateToken,
    auditClinico('strumenti_roi_report'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { strumentoId, dateFrom, dateTo } = req.query;

            const report = await StrumentoService.getROIReport(
                strumentoId || null,
                tenantId,
                { dateFrom, dateTo }
            );

            res.json({ success: true, data: report });
        } catch (error) {
            logger.error('Failed to generate ROI report', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella generazione del report ROI',
            });
        }
    }
);

/**
 * @route POST /strumenti/roi/compare
 * @desc Confronto ROI tra strumenti
 * @access Authenticated
 */
router.post('/roi/compare',
    authenticateToken,
    auditClinico('strumenti_roi_compare'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { strumentoIds, dateFrom, dateTo } = req.body;

            if (!strumentoIds || !Array.isArray(strumentoIds) || strumentoIds.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'Devono essere forniti almeno 2 ID strumento per il confronto'
                });
            }

            const comparison = await StrumentoService.getROIComparison(
                strumentoIds,
                tenantId,
                { dateFrom, dateTo }
            );

            res.json({ success: true, data: comparison });
        } catch (error) {
            logger.error('Failed to compare strumenti ROI', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel confronto ROI strumenti',
            });
        }
    }
);

// ============================================
// LIST & CREATE
// ============================================

/**
 * @route GET /strumenti
 * @desc Lista strumenti con filtri e paginazione
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'read'),
    clinicalValidators.strumento.query,
    auditClinico('list_strumenti'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, stato, tipologia, ambulatorioId } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit)
            };
            if (search) options.search = search;
            if (stato) options.stato = stato;
            if (tipologia) options.tipologia = tipologia;
            if (ambulatorioId) options.ambulatorioId = ambulatorioId;

            const strumenti = await StrumentoService.getAll(tenantId, options);

            res.json({
                success: true,
                data: strumenti.data,
                pagination: strumenti.pagination
            });
        } catch (error) {
            logger.error('Failed to list strumenti', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli strumenti',
            });
        }
    }
);

/**
 * @route POST /strumenti
 * @desc Crea nuovo strumento
 * @access Authenticated + CREATE_STRUMENTI
 */
router.post('/',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'create'),
    clinicalValidators.strumento.create,
    auditClinico('create_strumento'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const strumento = await StrumentoService.create({
                ...req.body,
                createdBy
            }, tenantId);

            res.status(201).json({
                success: true,
                data: strumento,
                message: 'Strumento creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create strumento', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    error: 'Strumento già esistente',
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione dello strumento',
            });
        }
    }
);

// ============================================
// GET BY ID
// ============================================

/**
 * @route GET /strumenti/:id
 * @desc Dettaglio strumento
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/:id',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'read'),
    clinicalValidators.strumento.id,
    auditClinico('view_strumento'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const strumento = await StrumentoService.getById(id, tenantId);

            res.json({ success: true, data: strumento });
        } catch (error) {
            logger.error('Failed to get strumento', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dello strumento',
            });
        }
    }
);

// ============================================
// UPDATE
// ============================================

/**
 * @route PUT /strumenti/:id
 * @desc Aggiorna strumento
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.put('/:id',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    clinicalValidators.strumento.id,
    clinicalValidators.strumento.update,
    auditClinico('update_strumento'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const strumento = await StrumentoService.update(id, req.body, tenantId);

            res.json({
                success: true,
                data: strumento,
                message: 'Strumento aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update strumento', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento dello strumento',
            });
        }
    }
);

// ============================================
// DELETE
// ============================================

/**
 * @route DELETE /strumenti/:id
 * @desc Elimina strumento (soft delete)
 * @access Authenticated + DELETE_STRUMENTI
 */
router.delete('/:id',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'delete'),
    clinicalValidators.strumento.id,
    auditClinico('delete_strumento'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await StrumentoService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Strumento eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete strumento', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione dello strumento',
            });
        }
    }
);

// ============================================
// STATO UPDATE
// ============================================

/**
 * @route PUT /strumenti/:id/stato
 * @desc Aggiorna stato strumento
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.put('/:id/stato',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    clinicalValidators.strumento.id,
    auditClinico('update_strumento_stato'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { stato } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            if (!CLINICAL_ENUMS.StatoStrumento.includes(stato)) {
                return res.status(400).json({
                    success: false,
                    error: 'Stato strumento non valido',
                    validStates: CLINICAL_ENUMS.StatoStrumento
                });
            }

            const strumento = await StrumentoService.updateStato(id, tenantId, stato, updatedBy);

            res.json({
                success: true,
                data: strumento,
                message: 'Stato strumento aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update strumento stato', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento dello stato',
            });
        }
    }
);

// ============================================
// AMBULATORIO ASSIGNMENT
// ============================================

/**
 * @route POST /strumenti/:id/assign
 * @desc Assegna strumento a ambulatorio
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.post('/:id/assign',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    clinicalValidators.strumento.id,
    auditClinico('assign_strumento'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { ambulatorioId } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            if (!ambulatorioId) {
                return res.status(400).json({
                    success: false,
                    error: 'ambulatorioId è richiesto'
                });
            }

            const strumento = await StrumentoService.assignToAmbulatorio(id, tenantId, ambulatorioId, updatedBy);

            res.json({
                success: true,
                data: strumento,
                message: 'Strumento assegnato con successo'
            });
        } catch (error) {
            logger.error('Failed to assign strumento', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            if (error.message === 'Ambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Ambulatorio non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'assegnazione dello strumento',
            });
        }
    }
);

/**
 * @route DELETE /strumenti/:id/assign
 * @desc Rimuovi strumento da ambulatorio
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.delete('/:id/assign',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    clinicalValidators.strumento.id,
    auditClinico('unassign_strumento'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const strumento = await StrumentoService.removeFromAmbulatorio(id, tenantId, updatedBy);

            res.json({
                success: true,
                data: strumento,
                message: 'Strumento rimosso dall\'ambulatorio con successo'
            });
        } catch (error) {
            logger.error('Failed to unassign strumento', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella rimozione dello strumento',
            });
        }
    }
);

// ============================================
// MAINTENANCE
// ============================================

/**
 * @route GET /strumenti/:id/maintenance
 * @desc Ottiene schedule manutenzione strumento
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/:id/maintenance',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'read'),
    clinicalValidators.strumento.id,
    auditClinico('view_strumento_maintenance'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const maintenance = await StrumentoService.getMaintenanceSchedule(id, tenantId);

            res.json({ success: true, data: maintenance });
        } catch (error) {
            logger.error('Failed to get strumento maintenance', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dello schedule manutenzione',
            });
        }
    }
);

/**
 * @route POST /strumenti/:id/maintenance
 * @desc Registra manutenzione strumento
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.post('/:id/maintenance',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    clinicalValidators.strumento.id,
    auditClinico('record_strumento_maintenance'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { dataMantenimento, note, prossimaMantenimento } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const performedBy = req.person.id;

            const strumento = await StrumentoService.recordMaintenance(id, tenantId, {
                dataMantenimento: dataMantenimento || new Date(),
                note,
                prossimaMantenimento,
                performedBy
            });

            res.json({
                success: true,
                data: strumento,
                message: 'Manutenzione registrata con successo'
            });
        } catch (error) {
            logger.error('Failed to record strumento maintenance', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella registrazione della manutenzione',
            });
        }
    }
);

// ============================================
// ROI
// ============================================

/**
 * @route GET /strumenti/:id/roi
 * @desc Report ROI singolo strumento
 * @access Authenticated
 */
router.get('/:id/roi',
    authenticateToken,
    clinicalValidators.params.id,
    auditClinico('strumento_roi'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { dateFrom, dateTo } = req.query;

            const report = await StrumentoService.getROIReport(id, tenantId, { dateFrom, dateTo });

            res.json({ success: true, data: report });
        } catch (error) {
            logger.error('Failed to get strumento ROI', {
                component: 'strumenti-routes',
                error: 'Operazione non riuscita',
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo ROI strumento',
            });
        }
    }
);

export default router;
