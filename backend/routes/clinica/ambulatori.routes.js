/**
 * Ambulatori Routes - Clinical Module
 * RESTful API endpoints for Ambulatori management
 * 
 * Base path: /api/v1/clinica/ambulatori
 * 
 * @module routes/clinica/ambulatori
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import middleware from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { clinicalValidators } from '../../config/validation-clinical.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { AmbulatorioService } from '../../services/clinical/index.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// MIDDLEWARE: Clinical Audit Logger
// ============================================

const auditClinico = (azione) => {
    return (req, res, next) => {
        const startTime = Date.now();
        const originalJson = res.json.bind(res);

        res.json = (data) => {
            const duration = Date.now() - startTime;
            const success = res.statusCode >= 200 && res.statusCode < 300;

            logger.info('Audit Clinico', {
                component: 'ambulatori-routes',
                action: azione,
                method: req.method,
                path: req.originalUrl,
                userId: req.person?.id,
                tenantId: getEffectiveTenantId(req),
                resourceId: req.params.id || data?.data?.id,
                statusCode: res.statusCode,
                success,
                duration: `${duration}ms`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return originalJson(data);
        };

        next();
    };
};

// ============================================
// AMBULATORIO ROUTES
// ============================================

/**
 * @route GET /specializations
 * @desc Ottiene lista distinta delle specializzazioni
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/specializations',
    authenticateToken,
    checkAdvancedPermission('ambulatori', 'read'),
    auditClinico('get_specializations'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const specializations = await AmbulatorioService.getSpecializations(tenantId);

            res.json({
                success: true,
                data: specializations
            });
        } catch (error) {
            logger.error('Failed to get specializations', {
                component: 'ambulatori-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle specializzazioni',
            });
        }
    }
);

/**
 * @route GET /
 * @desc Lista tutti gli ambulatori del tenant
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/',
    authenticateToken,
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.ambulatorio.query,
    auditClinico('list_ambulatori'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await AmbulatorioService.getAll(tenantId, req.query);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list ambulatori', {
                component: 'ambulatori-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli ambulatori',
            });
        }
    }
);

/**
 * @route GET /:id
 * @desc Ottiene un ambulatorio per ID
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/:id',
    authenticateToken,
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_ambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const ambulatorio = await AmbulatorioService.getById(id, tenantId);

            if (!ambulatorio) {
                return res.status(404).json({
                    success: false,
                    error: 'Ambulatorio non trovato'
                });
            }

            res.json({
                success: true,
                data: ambulatorio
            });
        } catch (error) {
            logger.error('Failed to get ambulatorio', {
                component: 'ambulatori-routes',
                error: 'Operazione non riuscita',
                ambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dell\'ambulatorio',
            });
        }
    }
);

/**
 * @route POST /
 * @desc Crea un nuovo ambulatorio
 * @access Authenticated + CREATE_AMBULATORI
 */
router.post('/',
    authenticateToken,
    checkAdvancedPermission('ambulatori', 'write'),
    clinicalValidators.ambulatorio.create,
    auditClinico('create_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const ambulatorio = await AmbulatorioService.create(req.body, tenantId);

            res.status(201).json({
                success: true,
                data: ambulatorio,
                message: 'Ambulatorio creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create ambulatorio', {
                component: 'ambulatori-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Poliambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
                });
            }

            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'Codice ambulatorio già esistente',
                    message: 'Un ambulatorio con questo codice esiste già per il poliambulatorio'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione dell\'ambulatorio',
            });
        }
    }
);

/**
 * @route PUT /:id
 * @desc Aggiorna un ambulatorio
 * @access Authenticated + EDIT_AMBULATORI
 */
router.put('/:id',
    authenticateToken,
    checkAdvancedPermission('ambulatori', 'write'),
    clinicalValidators.params.id,
    clinicalValidators.ambulatorio.update,
    auditClinico('update_ambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const ambulatorio = await AmbulatorioService.update(id, req.body, tenantId);

            res.json({
                success: true,
                data: ambulatorio,
                message: 'Ambulatorio aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update ambulatorio', {
                component: 'ambulatori-routes',
                error: 'Operazione non riuscita',
                ambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Ambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Ambulatorio non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento dell\'ambulatorio',
            });
        }
    }
);

/**
 * @route DELETE /:id
 * @desc Elimina (soft delete) un ambulatorio
 * @access Authenticated + DELETE_AMBULATORI
 */
router.delete('/:id',
    authenticateToken,
    checkAdvancedPermission('ambulatori', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_ambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await AmbulatorioService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Ambulatorio eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete ambulatorio', {
                component: 'ambulatori-routes',
                error: 'Operazione non riuscita',
                ambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Ambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Ambulatorio non trovato'
                });
            }

            if (error.message.includes('pending appointments')) {
                return res.status(409).json({
                    success: false,
                    error: 'Impossibile eliminare l\'ambulatorio',
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione dell\'ambulatorio',
            });
        }
    }
);

/**
 * @route POST /:id/prestazioni
 * @desc Assegna una prestazione all'ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.post('/:id/prestazioni',
    authenticateToken,
    checkAdvancedPermission('ambulatori', 'write'),
    clinicalValidators.params.id,
    clinicalValidators.ambulatorio.assignPrestazione,
    auditClinico('assign_prestazione_to_ambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { prestazioneId } = req.body;
            const tenantId = getEffectiveTenantId(req);

            const assignment = await AmbulatorioService.assignPrestazione(id, prestazioneId, tenantId);

            res.json({
                success: true,
                data: assignment,
                message: 'Prestazione assegnata con successo'
            });
        } catch (error) {
            logger.error('Failed to assign prestazione', {
                component: 'ambulatori-routes',
                error: 'Operazione non riuscita',
                ambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Errore interno del server'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'assegnazione della prestazione',
            });
        }
    }
);

/**
 * @route DELETE /:id/prestazioni/:prestazioneId
 * @desc Rimuove una prestazione dall'ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.delete('/:id/prestazioni/:prestazioneId',
    authenticateToken,
    checkAdvancedPermission('ambulatori', 'write'),
    auditClinico('remove_prestazione_from_ambulatorio'),
    async (req, res) => {
        try {
            const { id, prestazioneId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await AmbulatorioService.removePrestazione(id, prestazioneId, tenantId);

            res.json({
                success: true,
                message: 'Prestazione rimossa con successo'
            });
        } catch (error) {
            logger.error('Failed to remove prestazione', {
                component: 'ambulatori-routes',
                error: 'Operazione non riuscita',
                ambulatorioId: req.params.id,
                prestazioneId: req.params.prestazioneId,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Assignment not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Associazione non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella rimozione della prestazione',
            });
        }
    }
);

/**
 * @route GET /:id/availability/:date
 * @desc Ottiene disponibilità dell'ambulatorio per una data
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/:id/availability/:date',
    authenticateToken,
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_ambulatorio_availability'),
    async (req, res) => {
        try {
            const { id, date } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const availability = await AmbulatorioService.getAvailability(id, date, tenantId);

            res.json({
                success: true,
                data: availability
            });
        } catch (error) {
            logger.error('Failed to get ambulatorio availability', {
                component: 'ambulatori-routes',
                error: 'Operazione non riuscita',
                ambulatorioId: req.params.id,
                date: req.params.date,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della disponibilità',
            });
        }
    }
);

export default router;
