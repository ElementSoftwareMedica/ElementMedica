/**
 * Fatture Sanitarie Routes
 * CRUD per fatture sanitarie
 * 
 * Endpoints:
 * - GET /    Lista fatture con paginazione
 * - GET /:id    Dettaglio fattura
 * - POST /    Crea nuova fattura
 * - PUT /:id    Aggiorna fattura
 * - DELETE /:id    Elimina fattura
 * 
 * @module routes/clinica/fatture
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { FatturaSanitariaService } from '../../services/clinica/FatturaSanitariaService.js';
import middleware from '../../auth/middleware.js';
import { checkAdvancedPermission } from '../../middleware/permissionMiddleware.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// LIST ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/fatture
 * @desc Lista tutte le fatture sanitarie del tenant
 * @access Authenticated + VIEW_FATTURE
 */
router.get('/',
    authenticateToken(),
    checkAdvancedPermission('fatture', 'read'),
    auditClinico('list_fatture'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, stato, dataInizio, dataFine } = req.query;

            const result = await FatturaSanitariaService.getAll(tenantId, {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                stato,
                dataInizio,
                dataFine
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list fatture', {
                component: 'fatture-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle fatture',
                message: error.message
            });
        }
    }
);

// ============================================
// CREATE ROUTES
// ============================================

/**
 * @route POST /api/v1/clinica/fatture
 * @desc Crea nuova fattura sanitaria
 * @access Authenticated + CREATE_FATTURE
 */
router.post('/',
    authenticateToken(),
    checkAdvancedPermission('fatture', 'create'),
    auditClinico('create_fattura'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const fattura = await FatturaSanitariaService.create({
                ...req.body,
                tenantId,
                createdBy
            });

            res.status(201).json({
                success: true,
                data: fattura,
                message: 'Fattura creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create fattura', {
                component: 'fatture-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('già esistente') ? 409 :
                error.message.includes('non trovat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione della fattura',
                message: error.message
            });
        }
    }
);

// ============================================
// SINGLE RESOURCE ROUTES (with :id param - MUST BE LAST)
// ============================================

/**
 * @route GET /api/v1/clinica/fatture/:id
 * @desc Dettaglio fattura sanitaria
 * @access Authenticated + VIEW_FATTURE
 */
router.get('/:id',
    authenticateToken(),
    checkAdvancedPermission('fatture', 'read'),
    auditClinico('get_fattura'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const fattura = await FatturaSanitariaService.getById(id, tenantId);

            if (!fattura) {
                return res.status(404).json({
                    success: false,
                    error: 'Fattura non trovata'
                });
            }

            res.json({
                success: true,
                data: fattura
            });
        } catch (error) {
            logger.error('Failed to get fattura', {
                component: 'fatture-routes',
                error: error.message,
                fatturaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della fattura',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/fatture/:id
 * @desc Aggiorna fattura sanitaria
 * @access Authenticated + UPDATE_FATTURE
 */
router.put('/:id',
    authenticateToken(),
    checkAdvancedPermission('fatture', 'update'),
    auditClinico('update_fattura'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const fattura = await FatturaSanitariaService.update(id, tenantId, req.body);

            res.json({
                success: true,
                data: fattura,
                message: 'Fattura aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update fattura', {
                component: 'fatture-routes',
                error: error.message,
                fatturaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') ? 404 :
                error.message.includes('Cannot update') ? 403 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento della fattura',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/fatture/:id
 * @desc Elimina fattura sanitaria (soft delete)
 * @access Authenticated + DELETE_FATTURE
 */
router.delete('/:id',
    authenticateToken(),
    checkAdvancedPermission('fatture', 'delete'),
    auditClinico('delete_fattura'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            await FatturaSanitariaService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Fattura eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete fattura', {
                component: 'fatture-routes',
                error: error.message,
                fatturaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') ? 404 :
                error.message.includes('Cannot delete') ? 403 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione della fattura',
                message: error.message
            });
        }
    }
);

export default router;
