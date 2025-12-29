/**
 * Template Campi Visita Routes
 * Gestione campi dinamici per form visite
 * 
 * Endpoints:
 * - GET /    Lista template campi con paginazione
 * - GET /prestazione/:prestazioneId    Lista campi per prestazione
 * - GET /stats    Statistiche template campi
 * - GET /:id    Dettaglio singolo campo
 * - POST /    Crea nuovo campo
 * - POST /bulk    Crea campi in bulk
 * - POST /reorder    Riordina campi
 * - POST /duplicate    Duplica template tra prestazioni
 * - POST /validate    Valida valore campo
 * - PUT /:id    Aggiorna campo
 * - DELETE /:id    Elimina campo
 * 
 * @module routes/clinica/template-campi
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { TemplateCampoVisitaService } from '../../services/clinica/TemplateCampoVisitaService.js';
import middleware from '../../auth/middleware.js';
import { clinicalValidators } from '../../validation/clinical-validators.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// LIST ROUTES (static paths first)
// ============================================

/**
 * @route GET /api/v1/clinica/template-campi
 * @desc Lista tutti i template campi visita del tenant
 * @access Authenticated
 */
router.get('/',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.query,
    auditClinico('list_template_campi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const filters = {
                tipo: req.query.tipo,
                obbligatorio: req.query.obbligatorio === 'true' ? true : req.query.obbligatorio === 'false' ? false : undefined,
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                search: req.query.search,
                prestazioneId: req.query.prestazioneId
            };
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };

            const result = await TemplateCampoVisitaService.getAll(tenantId, filters, pagination);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list template campi', {
                component: 'template-campi-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei template campi',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/template-campi/prestazione/:prestazioneId
 * @desc Lista campi per una prestazione specifica
 * @access Authenticated
 */
router.get('/prestazione/:prestazioneId',
    authenticateToken(),
    auditClinico('get_template_campi_by_prestazione'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { prestazioneId } = req.params;
            const onlyActive = req.query.onlyActive !== 'false';

            const campi = await TemplateCampoVisitaService.getByPrestazione(prestazioneId, tenantId, { onlyActive });

            res.json({
                success: true,
                data: campi
            });
        } catch (error) {
            logger.error('Failed to get template campi by prestazione', {
                component: 'template-campi-routes',
                error: error.message,
                prestazioneId: req.params.prestazioneId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei campi',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/template-campi/stats
 * @desc Statistiche sui template campi
 * @access Authenticated
 */
router.get('/stats',
    authenticateToken(),
    auditClinico('get_template_campi_stats'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const stats = await TemplateCampoVisitaService.getStats(tenantId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get template campi stats', {
                component: 'template-campi-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle statistiche',
                message: error.message
            });
        }
    }
);

// ============================================
// CREATE ROUTES
// ============================================

/**
 * @route POST /api/v1/clinica/template-campi
 * @desc Crea nuovo campo
 * @access Authenticated + Permission
 */
router.post('/',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.create,
    auditClinico('create_template_campo'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;

            const campo = await TemplateCampoVisitaService.create(
                { ...req.body, tenantId },
                userId
            );

            res.status(201).json({
                success: true,
                data: campo,
                message: 'Campo creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create template campo', {
                component: 'template-campi-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 :
                error.message.includes('già esistente') || error.message.includes('richiedono') ? 400 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione del campo',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/template-campi/bulk
 * @desc Crea campi in bulk
 * @access Authenticated + Permission
 */
router.post('/bulk',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.bulkCreate,
    auditClinico('bulk_create_template_campi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { prestazioneId, campi } = req.body;

            const createdCampi = await TemplateCampoVisitaService.bulkCreate(prestazioneId, campi, tenantId, userId);

            res.status(201).json({
                success: true,
                data: createdCampi,
                message: `${campi.length} campi creati con successo`
            });
        } catch (error) {
            logger.error('Failed to bulk create template campi', {
                component: 'template-campi-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione bulk dei campi',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/template-campi/reorder
 * @desc Riordina campi di una prestazione
 * @access Authenticated + Permission
 */
router.post('/reorder',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.reorder,
    auditClinico('reorder_template_campi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { prestazioneId, ordini } = req.body;

            const campi = await TemplateCampoVisitaService.reorder(prestazioneId, ordini, tenantId, userId);

            res.json({
                success: true,
                data: campi,
                message: 'Campi riordinati con successo'
            });
        } catch (error) {
            logger.error('Failed to reorder template campi', {
                component: 'template-campi-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel riordinamento dei campi',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/template-campi/duplicate
 * @desc Duplica template da una prestazione all'altra
 * @access Authenticated + Permission
 */
router.post('/duplicate',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.duplicate,
    auditClinico('duplicate_template_campi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { sourcePrestazioneId, targetPrestazioneId } = req.body;

            const campi = await TemplateCampoVisitaService.duplicateTemplate(
                sourcePrestazioneId,
                targetPrestazioneId,
                tenantId,
                userId
            );

            res.status(201).json({
                success: true,
                data: campi,
                message: 'Template duplicato con successo'
            });
        } catch (error) {
            logger.error('Failed to duplicate template', {
                component: 'template-campi-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') ? 404 :
                error.message.includes('non ha campi') ? 400 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nella duplicazione del template',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/template-campi/validate
 * @desc Valida un valore per un campo
 * @access Authenticated
 */
router.post('/validate',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.validateValue,
    auditClinico('validate_campo_value'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { campoId, valore } = req.body;

            const result = await TemplateCampoVisitaService.validateValue(campoId, valore, tenantId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to validate campo value', {
                component: 'template-campi-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella validazione',
                message: error.message
            });
        }
    }
);

// ============================================
// SINGLE RESOURCE ROUTES (with :id param - MUST BE LAST)
// ============================================

/**
 * @route GET /api/v1/clinica/template-campi/:id
 * @desc Dettaglio singolo campo
 * @access Authenticated
 */
router.get('/:id',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('get_template_campo'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const campo = await TemplateCampoVisitaService.getById(id, tenantId);

            if (!campo) {
                return res.status(404).json({
                    success: false,
                    error: 'Campo non trovato'
                });
            }

            res.json({
                success: true,
                data: campo
            });
        } catch (error) {
            logger.error('Failed to get template campo', {
                component: 'template-campi-routes',
                error: error.message,
                campoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del campo',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/template-campi/:id
 * @desc Aggiorna campo
 * @access Authenticated + Permission
 */
router.put('/:id',
    authenticateToken(),
    clinicalValidators.params.id,
    clinicalValidators.templateCampoVisita.update,
    auditClinico('update_template_campo'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { id } = req.params;

            const campo = await TemplateCampoVisitaService.update(id, req.body, tenantId, userId);

            res.json({
                success: true,
                data: campo,
                message: 'Campo aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update template campo', {
                component: 'template-campi-routes',
                error: error.message,
                campoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 :
                error.message.includes('già esistente') ? 400 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento del campo',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/template-campi/:id
 * @desc Elimina campo (soft delete)
 * @access Authenticated + Permission
 */
router.delete('/:id',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('delete_template_campo'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { id } = req.params;

            await TemplateCampoVisitaService.delete(id, tenantId, userId);

            res.json({
                success: true,
                message: 'Campo eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete template campo', {
                component: 'template-campi-routes',
                error: error.message,
                campoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione del campo',
                message: error.message
            });
        }
    }
);

export default router;
