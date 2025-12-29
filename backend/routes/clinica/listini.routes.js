/**
 * @file listini.routes.js
 * @description Routes per la gestione dei listini prezzo
 * @module routes/clinica/listini
 *
 * @requires express
 * @requires ../auth/authenticateToken
 * @requires ../middleware/checkAdvancedPermission
 * @requires ../services/clinical/ListinoPrezzoService
 *
 * Routes:
 * - GET /listini - Lista listini prezzo con filtri e paginazione
 * - GET /listini/tipi - Lista tipi listino disponibili
 * - GET /listini/prestazione/:prestazioneId - Lista listini per prestazione
 * - GET /listini/bundle/:bundleId - Lista listini per bundle
 * - GET /listini/tipo/:tipo - Lista listini per tipo
 * - GET /listini/:id - Dettaglio listino prezzo
 * - POST /listini - Crea nuovo listino prezzo
 * - POST /listini/calculate - Calcola prezzo per prestazione
 * - POST /listini/bundle - Crea listino per bundle
 * - PUT /listini/:id - Aggiorna listino prezzo
 * - DELETE /listini/:id - Elimina listino prezzo (soft delete)
 */

import express from 'express';
import middleware from '../../auth/middleware.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import logger from '../../utils/logger.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';
import { CLINICAL_ENUMS } from '../../config/validation-clinical.js';

const { authenticate: authenticateToken } = middleware;

// Services
import ListinoPrezzoService from '../../services/clinical/ListinoPrezzoService.js';

// Validators
import { clinicalValidators } from '../../config/validation-clinical.js';

const router = express.Router();

// ============================================
// LISTINI PREZZO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/listini
 * @desc Lista listini prezzo con filtri e paginazione
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    clinicalValidators.listinoPrezzo.query,
    auditClinico('list_listini'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, tipo, prestazioneId, attivo } = req.query;

            const filters = {};
            if (search) filters.search = search;
            if (tipo) filters.tipo = tipo;
            if (prestazioneId) filters.prestazioneId = prestazioneId;
            if (attivo !== undefined) filters.attivo = attivo === 'true';

            const listini = await ListinoPrezzoService.getAll(tenantId, filters, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: listini.data,
                pagination: listini.pagination
            });
        } catch (error) {
            logger.error('Failed to list listini', {
                component: 'listini-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei listini',
                message: error.message
            });
        }
    }
);

// ============================================
// LISTINI - ROUTE SPECIFICHE (devono precedere :id)
// ============================================

/**
 * @route GET /api/v1/clinica/listini/tipi
 * @desc Lista tipi listino disponibili
 * @access Authenticated
 */
router.get('/tipi',
    authenticateToken(),
    async (req, res) => {
        try {
            const tipi = await ListinoPrezzoService.getTipi();

            res.json({
                success: true,
                data: tipi
            });
        } catch (error) {
            logger.error('Failed to get listini tipi', {
                component: 'listini-routes',
                error: error.message
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei tipi listino',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/listini/calculate
 * @desc Calcola prezzo per prestazione
 * @access Authenticated + VIEW_LISTINI
 */
router.post('/calculate',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('calculate_price'),
    async (req, res) => {
        try {
            const { prestazioneId, tipoListino, quantita } = req.body;
            const tenantId = getEffectiveTenantId(req);

            if (!prestazioneId || !tipoListino) {
                return res.status(400).json({
                    success: false,
                    error: 'prestazioneId e tipoListino sono richiesti'
                });
            }

            const result = await ListinoPrezzoService.calculatePrice(
                prestazioneId,
                tenantId,
                tipoListino,
                quantita || 1
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to calculate price', {
                component: 'listini-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Prestazione not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Prestazione non trovata'
                });
            }

            if (error.message === 'Listino not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Listino non trovato per questo tipo'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo del prezzo',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/listini/prestazione/:prestazioneId
 * @desc Lista listini per prestazione
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/prestazione/:prestazioneId',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('list_listini_by_prestazione'),
    async (req, res) => {
        try {
            const { prestazioneId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const listini = await ListinoPrezzoService.getByPrestazione(prestazioneId, tenantId);

            res.json({
                success: true,
                data: listini,
                prestazioneId
            });
        } catch (error) {
            logger.error('Failed to list listini by prestazione', {
                component: 'listini-routes',
                error: error.message,
                prestazioneId: req.params.prestazioneId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei listini',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/listini/bundle/:bundleId
 * @desc Lista listini per bundle
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/bundle/:bundleId',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('list_listini_by_bundle'),
    async (req, res) => {
        try {
            const { bundleId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const listini = await ListinoPrezzoService.getByBundle(bundleId, tenantId);

            res.json({
                success: true,
                data: listini,
                bundleId
            });
        } catch (error) {
            logger.error('Failed to list listini by bundle', {
                component: 'listini-routes',
                error: error.message,
                bundleId: req.params.bundleId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei listini bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/listini/bundle
 * @desc Crea listino per bundle (tariffario medico bundle)
 * @access Authenticated + CREATE_LISTINI
 */
router.post('/bundle',
    authenticateToken(),
    checkAdvancedPermission('listini', 'create'),
    auditClinico('create_listino_bundle'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person.personId;

            const listino = await ListinoPrezzoService.createForBundle({
                ...req.body,
                tenantId,
                createdBy: personId
            });

            res.status(201).json({
                success: true,
                data: listino,
                message: 'Listino bundle creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create listino for bundle', {
                component: 'listini-routes',
                error: error.message,
                bundleId: req.body.bundleId,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('Esiste già un listino') || error.message.includes('not found')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del listino bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/listini/tipo/:tipo
 * @desc Lista listini per tipo
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/tipo/:tipo',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('list_listini_by_tipo'),
    async (req, res) => {
        try {
            const { tipo } = req.params;
            const tenantId = getEffectiveTenantId(req);

            // Valida il tipo
            if (!CLINICAL_ENUMS.TipoListino.includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    error: 'Tipo listino non valido',
                    validTypes: CLINICAL_ENUMS.TipoListino
                });
            }

            const listini = await ListinoPrezzoService.getByTipo(tenantId, tipo);

            res.json({
                success: true,
                data: listini,
                tipo
            });
        } catch (error) {
            logger.error('Failed to list listini by tipo', {
                component: 'listini-routes',
                error: error.message,
                tipo: req.params.tipo,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei listini',
                message: error.message
            });
        }
    }
);

// ============================================
// LISTINI - ROUTE CON :id (devono essere DOPO le route specifiche)
// ============================================

/**
 * @route GET /api/v1/clinica/listini/:id
 * @desc Dettaglio listino prezzo
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    clinicalValidators.listinoPrezzo.id,
    auditClinico('view_listino'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const listino = await ListinoPrezzoService.getById(id, tenantId);

            res.json({
                success: true,
                data: listino
            });
        } catch (error) {
            logger.error('Failed to get listino', {
                component: 'listini-routes',
                error: error.message,
                listinoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Listino not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Listino non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del listino',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/listini
 * @desc Crea nuovo listino prezzo
 * @access Authenticated + CREATE_LISTINI
 */
router.post('/',
    authenticateToken(),
    checkAdvancedPermission('listini', 'create'),
    clinicalValidators.listinoPrezzo.create,
    auditClinico('create_listino'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const listino = await ListinoPrezzoService.create({
                ...req.body,
                tenantId,
                createdBy
            });

            res.status(201).json({
                success: true,
                data: listino,
                message: 'Listino prezzo creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create listino', {
                component: 'listini-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    error: 'Listino già esistente',
                    message: error.message
                });
            }

            if (error.message.includes('Overlapping validity period')) {
                return res.status(400).json({
                    success: false,
                    error: 'Periodo di validità sovrapposto',
                    message: 'Esiste già un prezzo attivo per questa combinazione prestazione/medico/convenzione nel periodo indicato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del listino',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/listini/:id
 * @desc Aggiorna listino prezzo
 * @access Authenticated + UPDATE_LISTINI
 */
router.put('/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'update'),
    clinicalValidators.listinoPrezzo.id,
    clinicalValidators.listinoPrezzo.update,
    auditClinico('update_listino'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const listino = await ListinoPrezzoService.update(id, tenantId, {
                ...req.body,
                updatedBy
            });

            res.json({
                success: true,
                data: listino,
                message: 'Listino aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update listino', {
                component: 'listini-routes',
                error: error.message,
                listinoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Listino not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Listino non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del listino',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/listini/:id
 * @desc Elimina listino prezzo (soft delete)
 * @access Authenticated + DELETE_LISTINI
 */
router.delete('/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'delete'),
    clinicalValidators.listinoPrezzo.id,
    auditClinico('delete_listino'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await ListinoPrezzoService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Listino eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete listino', {
                component: 'listini-routes',
                error: error.message,
                listinoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Listino not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Listino non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del listino',
                message: error.message
            });
        }
    }
);

export default router;
