/**
 * @file bundle.routes.js
 * @description Routes per la gestione delle offerte bundle
 * @module routes/clinica/bundle
 *
 * @requires express
 * @requires ../auth/authenticateToken
 * @requires ../middleware/checkAdvancedPermission
 * @requires ../services/clinical/OffertaBundleService
 * @requires ../services/PersonTenantAccessService
 *
 * Routes:
 * - GET /bundle - Lista bundle/offerte con paginazione
 * - GET /bundle/by-prestazione/:prestazioneId - Bundle per prestazione
 * - GET /bundle/:id - Dettaglio bundle
 * - POST /bundle - Crea nuovo bundle
 * - POST /bundle/check-applicability - Verifica applicabilità bundle
 * - POST /bundle/for-patient - Bundle applicabili a paziente
 * - POST /bundle/:id/increment-usage - Incrementa utilizzi
 * - PUT /bundle/:id - Aggiorna bundle
 * - PATCH /bundle/:id/toggle - Toggle stato attivo
 * - DELETE /bundle/:id - Elimina bundle (soft delete)
 */

import express from 'express';
import middleware from '../../auth/middleware.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import logger from '../../utils/logger.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';

const { authenticate: authenticateToken } = middleware;

// Services
import OffertaBundleService from '../../services/clinical/OffertaBundleService.js';
import { personTenantAccessService } from '../../services/PersonTenantAccessService.js';

const router = express.Router();

// ============================================
// OFFERTE BUNDLE ROUTES (Progetto 44)
// ============================================

/**
 * @route GET /api/v1/clinica/bundle
 * @desc Lista bundle/offerte con paginazione (supporta multi-tenant per admin)
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('list_bundle'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person?.id;
            const globalRole = req.person?.globalRole;
            const { page = 1, limit = 20, attivo, search, includeExpired, allTenants, tenantIds } = req.query;

            // Get accessible tenants for multi-tenant admin users
            const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);
            const accessibleTenantIds = accessibleTenants.map(t => t.id);

            const result = await OffertaBundleService.findAll({
                page: parseInt(page),
                limit: parseInt(limit),
                attivo: attivo !== undefined ? attivo === 'true' : undefined,
                search,
                includeExpired: includeExpired === 'true',
                showAllTenants: allTenants === 'true',
                accessibleTenantIds,
                queryTenantIds: tenantIds ? tenantIds.split(',') : undefined
            }, tenantId);

            res.json({
                success: true,
                data: result.data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: result.total,
                    totalPages: Math.ceil(result.total / parseInt(limit))
                }
            });
        } catch (error) {
            logger.error('Failed to list bundles', {
                component: 'bundle-routes',
                action: 'list_bundle',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/bundle/by-prestazione/:prestazioneId
 * @desc Trova bundle che contengono una specifica prestazione
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/by-prestazione/:prestazioneId',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('bundle_by_prestazione'),
    async (req, res) => {
        try {
            const { prestazioneId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const bundles = await OffertaBundleService.findByPrestazione(prestazioneId, tenantId);

            res.json({
                success: true,
                data: bundles
            });
        } catch (error) {
            logger.error('Failed to find bundles by prestazione', {
                component: 'bundle-routes',
                action: 'bundle_by_prestazione',
                error: error.message,
                prestazioneId: req.params.prestazioneId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella ricerca bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/bundle/:id
 * @desc Dettaglio bundle/offerta
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('view_bundle'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person?.id;
            const globalRole = req.person?.globalRole;

            // Get accessible tenants for multi-tenant admin users
            const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);
            const accessibleTenantIds = accessibleTenants.map(t => t.id);

            const bundle = await OffertaBundleService.findById(id, tenantId, { accessibleTenantIds });

            if (!bundle) {
                return res.status(404).json({
                    success: false,
                    error: 'Bundle non trovato'
                });
            }

            res.json({
                success: true,
                data: bundle
            });
        } catch (error) {
            logger.error('Failed to get bundle', {
                component: 'bundle-routes',
                action: 'view_bundle',
                error: error.message,
                bundleId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/bundle
 * @desc Crea nuovo bundle/offerta
 * @access Authenticated + CREATE_LISTINI
 */
router.post('/',
    authenticateToken(),
    checkAdvancedPermission('listini', 'create'),
    auditClinico('create_bundle'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const bundle = await OffertaBundleService.create(req.body, tenantId, createdBy);

            res.status(201).json({
                success: true,
                data: bundle,
                message: 'Bundle creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create bundle', {
                component: 'bundle-routes',
                action: 'create_bundle',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    error: 'Bundle con questo codice già esistente'
                });
            }

            if (error.message.includes('not found')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/bundle/check-applicability
 * @desc Verifica se un bundle è applicabile a un paziente
 * @access Authenticated + VIEW_LISTINI
 */
router.post('/check-applicability',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    async (req, res) => {
        try {
            const { bundleId, paziente } = req.body;
            const tenantId = getEffectiveTenantId(req);

            if (!bundleId) {
                return res.status(400).json({
                    success: false,
                    error: 'bundleId obbligatorio'
                });
            }

            const result = await OffertaBundleService.checkApplicability(bundleId, paziente || {}, tenantId);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to check bundle applicability', {
                component: 'bundle-routes',
                action: 'check_bundle_applicability',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore verifica applicabilità bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/bundle/for-patient
 * @desc Ottiene tutti i bundle applicabili a un paziente
 * @access Authenticated + VIEW_LISTINI
 */
router.post('/for-patient',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    async (req, res) => {
        try {
            const { paziente } = req.body;
            const tenantId = getEffectiveTenantId(req);

            const bundles = await OffertaBundleService.getApplicableForPatient(paziente || {}, tenantId);

            res.json({
                success: true,
                data: bundles,
                count: bundles.length
            });
        } catch (error) {
            logger.error('Failed to get applicable bundles for patient', {
                component: 'bundle-routes',
                action: 'bundles_for_patient',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore recupero bundle per paziente',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/bundle/:id/increment-usage
 * @desc Incrementa il contatore utilizzi di un bundle
 * @access Authenticated + UPDATE_LISTINI
 */
router.post('/:id/increment-usage',
    authenticateToken(),
    checkAdvancedPermission('listini', 'update'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const result = await OffertaBundleService.incrementUtilizzi(id, tenantId);

            res.json({
                success: true,
                ...result,
                message: 'Utilizzo bundle registrato'
            });
        } catch (error) {
            logger.error('Failed to increment bundle usage', {
                component: 'bundle-routes',
                action: 'increment_bundle_usage',
                error: error.message,
                bundleId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore incremento utilizzo bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/bundle/:id
 * @desc Aggiorna bundle/offerta
 * @access Authenticated + UPDATE_LISTINI
 */
router.put('/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'update'),
    auditClinico('update_bundle'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person?.id;
            const globalRole = req.person?.globalRole;

            // Get accessible tenants for multi-tenant admin users
            const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);
            const accessibleTenantIds = accessibleTenants.map(t => t.id);

            const bundle = await OffertaBundleService.update(id, req.body, tenantId, { accessibleTenantIds });

            res.json({
                success: true,
                data: bundle,
                message: 'Bundle aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update bundle', {
                component: 'bundle-routes',
                action: 'update_bundle',
                error: error.message,
                bundleId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Bundle not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Bundle non trovato'
                });
            }

            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route PATCH /api/v1/clinica/bundle/:id/toggle
 * @desc Toggle stato attivo/disattivo bundle
 * @access Authenticated + UPDATE_LISTINI
 */
router.patch('/:id/toggle',
    authenticateToken(),
    checkAdvancedPermission('listini', 'update'),
    auditClinico('toggle_bundle'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { attivo } = req.body;
            const tenantId = getEffectiveTenantId(req);

            if (attivo === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'Campo attivo obbligatorio'
                });
            }

            const bundle = await OffertaBundleService.toggleActive(id, attivo, tenantId);

            res.json({
                success: true,
                data: bundle,
                message: `Bundle ${attivo ? 'attivato' : 'disattivato'} con successo`
            });
        } catch (error) {
            logger.error('Failed to toggle bundle', {
                component: 'bundle-routes',
                action: 'toggle_bundle',
                error: error.message,
                bundleId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel cambio stato bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/bundle/:id
 * @desc Elimina bundle/offerta (soft delete)
 * @access Authenticated + DELETE_LISTINI
 */
router.delete('/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'delete'),
    auditClinico('delete_bundle'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person?.id;
            const globalRole = req.person?.globalRole;

            // Get accessible tenants for multi-tenant admin users
            const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);
            const accessibleTenantIds = accessibleTenants.map(t => t.id);

            await OffertaBundleService.delete(id, tenantId, { accessibleTenantIds });

            res.json({
                success: true,
                message: 'Bundle eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete bundle', {
                component: 'bundle-routes',
                action: 'delete_bundle',
                error: error.message,
                bundleId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Bundle not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Bundle non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del bundle',
                message: error.message
            });
        }
    }
);

export default router;
