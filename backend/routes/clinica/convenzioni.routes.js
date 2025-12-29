/**
 * @file convenzioni.routes.js
 * @description Routes per la gestione delle convenzioni
 * @module routes/clinica/convenzioni
 *
 * @requires express
 * @requires ../auth/authenticateToken
 * @requires ../middleware/checkAdvancedPermission
 * @requires ../services/clinical/ConvenzioneService
 * @requires ../services/clinical/RiconoscimentoConvenzioneService
 *
 * Routes:
 * - GET /convenzioni - Lista convenzioni con paginazione e filtri
 * - GET /convenzioni/statistics - Statistiche convenzioni
 * - GET /convenzioni/expiring - Convenzioni in scadenza
 * - GET /convenzioni/available - Convenzioni disponibili per prenotazione
 * - GET /convenzioni/:id - Dettaglio convenzione
 * - GET /convenzioni/:id/validity - Verifica validità convenzione
 * - GET /convenzioni/:id/listini - Lista listini associati
 * - GET /convenzioni/:id/aziende - Lista aziende associate
 * - POST /convenzioni - Crea nuova convenzione
 * - POST /convenzioni/:id/listini - Associa listino
 * - POST /convenzioni/:id/aziende - Associa azienda
 * - POST /riconoscimenti - Crea riconoscimento
 * - PUT /convenzioni/:id - Aggiorna convenzione
 * - PUT /convenzioni/:id/aziende/:aziendaAssociazioneId - Aggiorna associazione azienda
 * - DELETE /convenzioni/:id - Elimina convenzione (soft delete)
 * - DELETE /convenzioni/:id/listini/:listinoId - Rimuove listino
 * - DELETE /convenzioni/:id/aziende/:aziendaAssociazioneId - Rimuove azienda
 */

import express from 'express';
import middleware from '../../auth/middleware.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import logger from '../../utils/logger.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';

const { authenticate: authenticateToken } = middleware;

// Services
import ConvenzioneService from '../../services/clinical/ConvenzioneService.js';
import RiconoscimentoConvenzioneService from '../../services/clinical/RiconoscimentoConvenzioneService.js';

// Validators
import { clinicalValidators } from '../../config/validation-clinical.js';

const router = express.Router();

// ============================================
// CONVENZIONI ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/convenzioni
 * @desc Lista convenzioni con paginazione e filtri
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'read'),
    clinicalValidators.convenzione.query,
    auditClinico('list_convenzioni'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await ConvenzioneService.getAll(tenantId, req.query);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list convenzioni', {
                component: 'convenzioni-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle convenzioni',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/convenzioni/statistics
 * @desc Statistiche convenzioni
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/statistics',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'read'),
    auditClinico('get_convenzioni_statistics'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const stats = await ConvenzioneService.getStatistics(tenantId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get convenzioni statistics', {
                component: 'convenzioni-routes',
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

/**
 * @route GET /api/v1/clinica/convenzioni/expiring
 * @desc Lista convenzioni in scadenza
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/expiring',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'read'),
    auditClinico('list_convenzioni_expiring'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { daysAhead = 30 } = req.query;

            const convenzioni = await ConvenzioneService.getExpiringSoon(tenantId, parseInt(daysAhead));

            res.json({
                success: true,
                data: convenzioni,
                count: convenzioni.length
            });
        } catch (error) {
            logger.error('Failed to get expiring convenzioni', {
                component: 'convenzioni-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle convenzioni',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/convenzioni/available
 * @desc Lista convenzioni disponibili per prenotazione
 * @access Authenticated
 */
router.get('/available',
    authenticateToken(),
    auditClinico('list_convenzioni_available'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const convenzioni = await ConvenzioneService.getAvailableForBooking(tenantId);

            res.json({
                success: true,
                data: convenzioni,
                count: convenzioni.length
            });
        } catch (error) {
            logger.error('Failed to get available convenzioni', {
                component: 'convenzioni-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle convenzioni',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/convenzioni/:id
 * @desc Dettaglio convenzione
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/:id',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_convenzione'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const convenzione = await ConvenzioneService.getById(req.params.id, tenantId);

            if (!convenzione) {
                return res.status(404).json({
                    success: false,
                    error: 'Convenzione non trovata'
                });
            }

            res.json({
                success: true,
                data: convenzione
            });
        } catch (error) {
            logger.error('Failed to get convenzione', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della convenzione',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/convenzioni/:id/validity
 * @desc Verifica validità convenzione
 * @access Authenticated
 */
router.get('/:id/validity',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('check_convenzione_validity'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await ConvenzioneService.checkValidity(req.params.id, tenantId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to check convenzione validity', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella verifica della convenzione',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/convenzioni/:id/listini
 * @desc Lista listini associati alla convenzione
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/:id/listini',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_convenzione_listini'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const listini = await ConvenzioneService.getListini(req.params.id, tenantId);

            res.json({
                success: true,
                data: listini,
                count: listini.length
            });
        } catch (error) {
            logger.error('Failed to get convenzione listini', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nel recupero dei listini',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/convenzioni/:id/aziende
 * @desc Lista aziende associate alla convenzione
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/:id/aziende',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_convenzione_aziende'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const aziende = await RiconoscimentoConvenzioneService.getAziendeByConvenzione(req.params.id, tenantId);

            res.json({
                success: true,
                data: aziende,
                count: aziende.length
            });
        } catch (error) {
            logger.error('Failed to get convenzione aziende', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle aziende',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/convenzioni/:id/aziende/:aziendaAssociazioneId/riconoscimenti
 * @desc Lista riconoscimenti per un'associazione azienda-convenzione
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/:id/aziende/:aziendaAssociazioneId/riconoscimenti',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'read'),
    auditClinico('get_riconoscimenti'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const riconoscimenti = await RiconoscimentoConvenzioneService.getRiconoscimentiByConvenzioneAzienda(
                req.params.aziendaAssociazioneId,
                tenantId
            );

            res.json({
                success: true,
                data: riconoscimenti,
                count: riconoscimenti.length
            });
        } catch (error) {
            logger.error('Failed to get riconoscimenti', {
                component: 'convenzioni-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei riconoscimenti',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/convenzioni
 * @desc Crea nuova convenzione
 * @access Authenticated + CREATE_CONVENZIONI
 */
router.post('/',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'create'),
    clinicalValidators.convenzione.create,
    auditClinico('create_convenzione'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const convenzione = await ConvenzioneService.create(req.body, tenantId);

            res.status(201).json({
                success: true,
                data: convenzione,
                message: 'Convenzione creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create convenzione', {
                component: 'convenzioni-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('già esistente') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione della convenzione',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/convenzioni/:id/listini
 * @desc Associa listino alla convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.post('/:id/listini',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.convenzione.associateListino,
    auditClinico('associate_convenzione_listino'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await ConvenzioneService.associateListino(
                req.params.id,
                req.body.listinoId,
                tenantId
            );

            res.status(201).json({
                success: true,
                data: result,
                message: 'Listino associato alla convenzione'
            });
        } catch (error) {
            logger.error('Failed to associate listino to convenzione', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 :
                error.message.includes('già associato') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'associazione del listino',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/convenzioni/:id/aziende
 * @desc Associa un'azienda alla convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.post('/:id/aziende',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    clinicalValidators.params.id,
    auditClinico('associate_convenzione_azienda'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.user?.id;

            const result = await RiconoscimentoConvenzioneService.associateAzienda(
                req.params.id,
                req.body.aziendaId,
                {
                    referenteAziendale: req.body.referenteAziendale,
                    emailReferente: req.body.emailReferente,
                    telefonoReferente: req.body.telefonoReferente,
                    note: req.body.note,
                    dataAdesione: req.body.dataAdesione,
                    dataFineAdesione: req.body.dataFineAdesione,
                    attiva: req.body.attiva
                },
                tenantId,
                userId
            );

            res.status(201).json({
                success: true,
                data: result,
                message: 'Azienda associata alla convenzione'
            });
        } catch (error) {
            logger.error('Failed to associate azienda to convenzione', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 :
                error.message.includes('già associata') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'associazione dell\'azienda',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/convenzioni/:id
 * @desc Aggiorna convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.put('/:id',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.convenzione.update,
    auditClinico('update_convenzione'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const convenzione = await ConvenzioneService.update(req.params.id, req.body, tenantId);

            res.json({
                success: true,
                data: convenzione,
                message: 'Convenzione aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update convenzione', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 :
                error.message.includes('già esistente') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento della convenzione',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/convenzioni/:id/aziende/:aziendaAssociazioneId
 * @desc Aggiorna l'associazione azienda-convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.put('/:id/aziende/:aziendaAssociazioneId',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    auditClinico('update_convenzione_azienda'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const result = await RiconoscimentoConvenzioneService.updateAziendaAssociation(
                req.params.aziendaAssociazioneId,
                req.body,
                tenantId
            );

            res.json({
                success: true,
                data: result,
                message: 'Associazione azienda aggiornata'
            });
        } catch (error) {
            logger.error('Failed to update convenzione-azienda association', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento dell\'associazione',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/convenzioni/:id
 * @desc Elimina convenzione (soft delete)
 * @access Authenticated + DELETE_CONVENZIONI
 */
router.delete('/:id',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_convenzione'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            await ConvenzioneService.delete(req.params.id, tenantId);

            res.json({
                success: true,
                message: 'Convenzione eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete convenzione', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione della convenzione',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/convenzioni/:id/listini/:listinoId
 * @desc Rimuove listino dalla convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.delete('/:id/listini/:listinoId',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    auditClinico('remove_convenzione_listino'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            await ConvenzioneService.removeListino(req.params.id, req.params.listinoId, tenantId);

            res.json({
                success: true,
                message: 'Listino rimosso dalla convenzione'
            });
        } catch (error) {
            logger.error('Failed to remove listino from convenzione', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella rimozione del listino',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/convenzioni/:id/aziende/:aziendaAssociazioneId
 * @desc Rimuove un'azienda dalla convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.delete('/:id/aziende/:aziendaAssociazioneId',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    auditClinico('remove_convenzione_azienda'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            await RiconoscimentoConvenzioneService.removeAzienda(req.params.aziendaAssociazioneId, tenantId);

            res.json({
                success: true,
                message: 'Azienda rimossa dalla convenzione'
            });
        } catch (error) {
            logger.error('Failed to remove azienda from convenzione', {
                component: 'convenzioni-routes',
                error: error.message,
                convenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella rimozione dell\'azienda',
                message: error.message
            });
        }
    }
);

export default router;
