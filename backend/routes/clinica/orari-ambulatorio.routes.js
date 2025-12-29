/**
 * Orari Ambulatorio Routes
 * CRUD completo per gli orari di apertura ambulatori
 * 
 * Endpoints:
 * - GET /    Lista orari con paginazione
 * - GET /ambulatorio/:ambulatorioId    Lista orari per ambulatorio
 * - GET /ambulatorio/:ambulatorioId/weekly    Vista settimanale
 * - GET /ambulatorio/:ambulatorioId/hours    Ore settimanali
 * - GET /ambulatorio/:ambulatorioId/next-open    Prossima apertura
 * - POST /    Crea nuovo orario
 * - POST /bulk    Crea multipli orari
 * - POST /copy    Copia orari tra ambulatori
 * - POST /check-hours    Verifica orario in apertura
 * - GET /:id    Dettaglio orario
 * - PUT /:id    Aggiorna orario
 * - POST /:id/toggle    Attiva/Disattiva orario
 * - DELETE /:id    Elimina orario
 * - DELETE /ambulatorio/:ambulatorioId    Elimina tutti gli orari
 * 
 * @module routes/clinica/orari-ambulatorio
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { OrarioAmbulatorioService } from '../../services/clinical/OrarioAmbulatorioService.js';
import middleware from '../../auth/middleware.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { clinicalValidators } from '../../config/validation-clinical.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// LIST ROUTES (static paths first)
// ============================================

/**
 * @route GET /api/v1/clinica/orari-ambulatorio
 * @desc Lista orari ambulatorio con paginazione
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.orarioAmbulatorio.query,
    auditClinico('list_orari_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await OrarioAmbulatorioService.getAll(tenantId, req.query);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list orari ambulatorio', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli orari',
                message: error.message
            });
        }
    }
);

// ============================================
// AMBULATORIO-SPECIFIC ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/orari-ambulatorio/ambulatorio/:ambulatorioId
 * @desc Lista orari per ambulatorio
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/ambulatorio/:ambulatorioId',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    auditClinico('get_orari_by_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const orari = await OrarioAmbulatorioService.getByAmbulatorio(req.params.ambulatorioId, tenantId);

            res.json({
                success: true,
                data: orari,
                count: orari.length
            });
        } catch (error) {
            logger.error('Failed to get orari by ambulatorio', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli orari',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/orari-ambulatorio/ambulatorio/:ambulatorioId/weekly
 * @desc Vista settimanale orari ambulatorio
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/ambulatorio/:ambulatorioId/weekly',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    auditClinico('get_weekly_schedule'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const schedule = await OrarioAmbulatorioService.getWeeklySchedule(req.params.ambulatorioId, tenantId);

            res.json({
                success: true,
                data: schedule
            });
        } catch (error) {
            logger.error('Failed to get weekly schedule', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli orari',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/orari-ambulatorio/ambulatorio/:ambulatorioId/hours
 * @desc Ore settimanali ambulatorio
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/ambulatorio/:ambulatorioId/hours',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    auditClinico('get_weekly_hours'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const hours = await OrarioAmbulatorioService.getWeeklyHours(req.params.ambulatorioId, tenantId);

            res.json({
                success: true,
                data: hours
            });
        } catch (error) {
            logger.error('Failed to get weekly hours', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo delle ore',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/orari-ambulatorio/ambulatorio/:ambulatorioId/next-open
 * @desc Prossima apertura ambulatorio
 * @access Authenticated
 */
router.get('/ambulatorio/:ambulatorioId/next-open',
    authenticateToken(),
    auditClinico('get_next_open_time'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { fromDate } = req.query;

            const nextOpen = await OrarioAmbulatorioService.getNextOpenTime(
                req.params.ambulatorioId,
                tenantId,
                fromDate ? new Date(fromDate) : new Date()
            );

            res.json({
                success: true,
                data: nextOpen
            });
        } catch (error) {
            logger.error('Failed to get next open time', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo della prossima apertura',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/orari-ambulatorio/ambulatorio/:ambulatorioId
 * @desc Elimina tutti gli orari di un ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.delete('/ambulatorio/:ambulatorioId',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    auditClinico('delete_all_orari_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await OrarioAmbulatorioService.deleteByAmbulatorio(req.params.ambulatorioId, tenantId);

            res.json({
                success: true,
                data: result,
                message: `Eliminati ${result.deleted} orari`
            });
        } catch (error) {
            logger.error('Failed to delete orari by ambulatorio', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione degli orari',
                message: error.message
            });
        }
    }
);

// ============================================
// CREATE ROUTES
// ============================================

/**
 * @route POST /api/v1/clinica/orari-ambulatorio
 * @desc Crea nuovo orario ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.post('/',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    clinicalValidators.orarioAmbulatorio.create,
    auditClinico('create_orario_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const orario = await OrarioAmbulatorioService.create(req.body, tenantId);

            res.status(201).json({
                success: true,
                data: orario,
                message: 'Orario creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create orario ambulatorio', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('sovrapposto') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione dell\'orario',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/orari-ambulatorio/bulk
 * @desc Crea multipli orari in blocco
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.post('/bulk',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    auditClinico('create_orari_bulk'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { orari } = req.body;

            if (!Array.isArray(orari) || orari.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Array orari è obbligatorio'
                });
            }

            const result = await OrarioAmbulatorioService.createBulk(orari, tenantId);

            res.status(201).json({
                success: true,
                data: result,
                message: `Creati ${result.created.length} orari, ${result.failed.length} falliti`
            });
        } catch (error) {
            logger.error('Failed to create orari bulk', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione degli orari',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/orari-ambulatorio/copy
 * @desc Copia orari da un ambulatorio all'altro
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.post('/copy',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    clinicalValidators.orarioAmbulatorio.copySchedule,
    auditClinico('copy_schedule'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { fromAmbulatorioId, toAmbulatorioId } = req.body;

            const result = await OrarioAmbulatorioService.copySchedule(
                fromAmbulatorioId,
                toAmbulatorioId,
                tenantId
            );

            res.status(201).json({
                success: true,
                data: result,
                message: `Copiati ${result.created.length} orari, ${result.skipped.length} saltati`
            });
        } catch (error) {
            logger.error('Failed to copy schedule', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella copia degli orari',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/orari-ambulatorio/check-hours
 * @desc Verifica se un orario è negli orari di apertura
 * @access Authenticated
 */
router.post('/check-hours',
    authenticateToken(),
    auditClinico('check_within_hours'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { ambulatorioId, datetime } = req.body;

            if (!ambulatorioId || !datetime) {
                return res.status(400).json({
                    success: false,
                    error: 'ambulatorioId e datetime sono obbligatori'
                });
            }

            const result = await OrarioAmbulatorioService.isWithinHours(ambulatorioId, datetime, tenantId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to check within hours', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella verifica degli orari',
                message: error.message
            });
        }
    }
);

// ============================================
// SINGLE RESOURCE ROUTES (with :id param - MUST BE LAST)
// ============================================

/**
 * @route GET /api/v1/clinica/orari-ambulatorio/:id
 * @desc Dettaglio orario ambulatorio
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/:id',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_orario_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const orario = await OrarioAmbulatorioService.getById(req.params.id, tenantId);

            if (!orario) {
                return res.status(404).json({
                    success: false,
                    error: 'Orario non trovato'
                });
            }

            res.json({
                success: true,
                data: orario
            });
        } catch (error) {
            logger.error('Failed to get orario ambulatorio', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                orarioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dell\'orario',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/orari-ambulatorio/:id
 * @desc Aggiorna orario ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.put('/:id',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.orarioAmbulatorio.update,
    auditClinico('update_orario_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const orario = await OrarioAmbulatorioService.update(req.params.id, req.body, tenantId);

            res.json({
                success: true,
                data: orario,
                message: 'Orario aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update orario ambulatorio', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                orarioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('sovrapposto') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento dell\'orario',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/orari-ambulatorio/:id/toggle
 * @desc Attiva/Disattiva orario ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.post('/:id/toggle',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    clinicalValidators.params.id,
    auditClinico('toggle_orario_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const orario = await OrarioAmbulatorioService.toggleActive(req.params.id, tenantId);

            res.json({
                success: true,
                data: orario,
                message: `Orario ${orario.isActive ? 'attivato' : 'disattivato'} con successo`
            });
        } catch (error) {
            logger.error('Failed to toggle orario ambulatorio', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                orarioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nel cambio stato dell\'orario',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/orari-ambulatorio/:id
 * @desc Elimina orario ambulatorio (soft delete)
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.delete('/:id',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    clinicalValidators.params.id,
    auditClinico('delete_orario_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            await OrarioAmbulatorioService.delete(req.params.id, tenantId);

            res.json({
                success: true,
                message: 'Orario eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete orario ambulatorio', {
                component: 'orari-ambulatorio-routes',
                error: error.message,
                orarioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione dell\'orario',
                message: error.message
            });
        }
    }
);

export default router;
