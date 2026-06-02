/**
 * Poliambulatori Routes - Clinical Module
 * RESTful API endpoints for Poliambulatori management
 * 
 * Base path: /api/v1/clinica/poliambulatori
 * 
 * @module routes/clinica/poliambulatori
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import middleware from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { clinicalValidators } from '../../config/validation-clinical.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import PersonTenantAccessService from '../../services/PersonTenantAccessService.js';
import { PoliambulatorioService } from '../../services/clinical/index.js';
import SedePoliambulatorioService from '../../services/clinical/SedePoliambulatorioService.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;
const personTenantAccessService = new PersonTenantAccessService();

// ============================================
// MIDDLEWARE: Clinical Audit Logger
// ============================================

/**
 * Middleware per audit logging delle operazioni cliniche
 */
const auditClinico = (azione) => {
    return (req, res, next) => {
        const startTime = Date.now();
        const originalJson = res.json.bind(res);

        res.json = (data) => {
            const duration = Date.now() - startTime;
            const success = res.statusCode >= 200 && res.statusCode < 300;

            logger.info('Audit Clinico', {
                component: 'poliambulatori-routes',
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
// POLIAMBULATORIO ROUTES
// ============================================

/**
 * @route GET /
 * @desc Lista tutti i poliambulatori del tenant
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'read'),
    clinicalValidators.poliambulatorio.query,
    auditClinico('list_poliambulatori'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person?.id;
            const globalRole = req.person?.globalRole;

            const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);
            const accessibleTenantIds = accessibleTenants.map(t => t.id);

            logger.info('Poliambulatori query debug', {
                component: 'poliambulatori-routes',
                action: 'list_poliambulatori_debug',
                personId,
                personTenantId: req.person?.tenantId,
                effectiveTenantId: tenantId,
                globalRole,
                accessibleTenantIds,
                queryTenantIds: req.query.tenantIds,
                allTenantsQuery: req.query.allTenants,
                frontendId: req.frontendId || req.headers['x-frontend-id']
            });

            const result = await PoliambulatorioService.getAll(tenantId, {
                ...req.query,
                showAllTenants: req.query.allTenants === 'true',
                accessibleTenantIds
            });

            logger.info('Poliambulatori query result', {
                component: 'poliambulatori-routes',
                action: 'list_poliambulatori_result',
                count: result.data?.length || 0,
                total: result.pagination?.total || 0,
                tenantId,
                accessibleTenantIds
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list poliambulatori', {
                component: 'poliambulatori-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei poliambulatori',
            });
        }
    }
);

/**
 * @route GET /:id/sedi
 * @desc Lista sedi associate a un poliambulatorio
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/:id/sedi',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'read'),
    auditClinico('list_sedi_by_poliambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await SedePoliambulatorioService.findAll(tenantId, {
                ...req.query,
                poliambulatorioId: req.params.id
            });

            res.json({
                success: true,
                data: result.data,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages
                }
            });
        } catch (error) {
            logger.error('Failed to list sedi by poliambulatorio', {
                component: 'poliambulatori-routes',
                error: error.message,
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle sedi del poliambulatorio'
            });
        }
    }
);

/**
 * @route POST /:id/sedi
 * @desc Crea una sede associata al poliambulatorio
 * @access Authenticated + CREATE_POLIAMBULATORIO
 */
router.post('/:id/sedi',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'create'),
    auditClinico('create_sede_by_poliambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const sede = await SedePoliambulatorioService.create(
                {
                    ...req.body,
                    poliambulatorioId: req.params.id,
                    createdBy: req.person.id
                },
                tenantId
            );

            res.status(201).json({
                success: true,
                data: sede,
                message: 'Sede creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create sede by poliambulatorio', {
                component: 'poliambulatori-routes',
                error: error.message,
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della sede del poliambulatorio'
            });
        }
    }
);

/**
 * @route GET /:id
 * @desc Ottiene un poliambulatorio per ID
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/:id',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_poliambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const poliambulatorio = await PoliambulatorioService.getById(id, tenantId);

            if (!poliambulatorio) {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
                });
            }

            res.json({
                success: true,
                data: poliambulatorio
            });
        } catch (error) {
            logger.error('Failed to get poliambulatorio', {
                component: 'poliambulatori-routes',
                error: 'Operazione non riuscita',
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del poliambulatorio',
            });
        }
    }
);

/**
 * @route POST /
 * @desc Crea un nuovo poliambulatorio
 * @access Authenticated + CREATE_POLIAMBULATORIO
 */
router.post('/',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'write'),
    clinicalValidators.poliambulatorio.create,
    auditClinico('create_poliambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const poliambulatorio = await PoliambulatorioService.create(req.body, tenantId);

            res.status(201).json({
                success: true,
                data: poliambulatorio,
                message: 'Poliambulatorio creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create poliambulatorio', {
                component: 'poliambulatori-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'Codice poliambulatorio già esistente',
                    message: 'Un poliambulatorio con questo codice esiste già per il tenant'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del poliambulatorio',
            });
        }
    }
);

/**
 * @route PUT /:id
 * @desc Aggiorna un poliambulatorio
 * @access Authenticated + EDIT_POLIAMBULATORIO
 */
router.put('/:id',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'write'),
    clinicalValidators.params.id,
    clinicalValidators.poliambulatorio.update,
    auditClinico('update_poliambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const poliambulatorio = await PoliambulatorioService.update(id, req.body, tenantId);

            res.json({
                success: true,
                data: poliambulatorio,
                message: 'Poliambulatorio aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update poliambulatorio', {
                component: 'poliambulatori-routes',
                error: 'Operazione non riuscita',
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Poliambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del poliambulatorio',
            });
        }
    }
);

/**
 * @route DELETE /:id
 * @desc Elimina (soft delete) un poliambulatorio
 * @access Authenticated + DELETE_POLIAMBULATORIO
 */
router.delete('/:id',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_poliambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await PoliambulatorioService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Poliambulatorio eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete poliambulatorio', {
                component: 'poliambulatori-routes',
                error: 'Operazione non riuscita',
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Poliambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del poliambulatorio',
            });
        }
    }
);

/**
 * @route POST /:id/direttore
 * @desc Assegna un direttore sanitario al poliambulatorio
 * @access Authenticated + MANAGE_POLIAMBULATORIO
 */
router.post('/:id/direttore',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'write'),
    clinicalValidators.params.id,
    clinicalValidators.poliambulatorio.assignDirettore,
    auditClinico('assign_direttore_sanitario'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { direttoreSanitarioId } = req.body;
            const tenantId = getEffectiveTenantId(req);

            const poliambulatorio = await PoliambulatorioService.assignDirettoreSanitario(id, direttoreSanitarioId, tenantId);

            res.json({
                success: true,
                data: poliambulatorio,
                message: 'Direttore sanitario assegnato con successo'
            });
        } catch (error) {
            logger.error('Failed to assign direttore sanitario', {
                component: 'poliambulatori-routes',
                error: 'Operazione non riuscita',
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Poliambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
                });
            }

            if (error.message === 'Direttore sanitario not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Direttore sanitario non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'assegnazione del direttore sanitario',
            });
        }
    }
);

/**
 * @route GET /:id/statistics
 * @desc Ottiene statistiche del poliambulatorio
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/:id/statistics',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_poliambulatorio_statistics'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const statistics = await PoliambulatorioService.getStatistics(id, tenantId);

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Failed to get poliambulatorio statistics', {
                component: 'poliambulatori-routes',
                error: 'Operazione non riuscita',
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle statistiche',
            });
        }
    }
);

export default router;
