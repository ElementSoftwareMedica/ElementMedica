/**
 * @file manutenzioni.routes.js
 * @description Routes per la gestione delle manutenzioni strumenti
 * @module routes/clinica/manutenzioni
 *
 * @requires express
 * @requires ../auth/authenticateToken
 * @requires ../middleware/checkAdvancedPermission
 * @requires ../services/clinical/ManutenzioneStrumentoService
 *
 * Routes:
 * - GET /manutenzioni - Lista tutte le manutenzioni
 * - GET /manutenzioni/scadenza - Manutenzioni in scadenza
 * - GET /manutenzioni/stats - Statistiche manutenzioni
 * - GET /manutenzioni/:id - Ottiene una manutenzione per ID
 * - POST /manutenzioni - Crea una nuova manutenzione
 * - POST /manutenzioni/ricorrente - Crea manutenzioni ricorrenti
 * - PUT /manutenzioni/:id - Aggiorna una manutenzione
 * - PUT /manutenzioni/:id/completa - Completa una manutenzione
 * - PUT /manutenzioni/:id/annulla - Annulla una manutenzione
 * - DELETE /manutenzioni/:id - Elimina una manutenzione (soft delete)
 */

import express from 'express';
import middleware from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import logger from '../../utils/logger.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';

const { authenticate: authenticateToken } = middleware;

// Services
import ManutenzioneStrumentoService from '../../services/clinical/ManutenzioneStrumentoService.js';

const router = express.Router();

// ============================================
// MANUTENZIONI STRUMENTI ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/manutenzioni
 * @desc Lista tutte le manutenzioni
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'read'),
    auditClinico('list_manutenzioni'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await ManutenzioneStrumentoService.findAll(tenantId, req.query);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list manutenzioni', {
                component: 'manutenzioni-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle manutenzioni',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/manutenzioni/scadenza
 * @desc Manutenzioni in scadenza
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/scadenza',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'read'),
    auditClinico('list_manutenzioni_scadenza'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { giorni = 30 } = req.query;

            const manutenzioni = await ManutenzioneStrumentoService.getManutenzioniInScadenza(
                tenantId,
                parseInt(giorni)
            );

            res.json({
                success: true,
                data: manutenzioni
            });
        } catch (error) {
            logger.error('Failed to get manutenzioni in scadenza', {
                component: 'manutenzioni-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle manutenzioni in scadenza',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/manutenzioni/stats
 * @desc Statistiche manutenzioni
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/stats',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'read'),
    auditClinico('get_manutenzioni_stats'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { strumentoId, anno } = req.query;

            const stats = await ManutenzioneStrumentoService.getStats(tenantId, { strumentoId, anno });

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get manutenzioni stats', {
                component: 'manutenzioni-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle statistiche manutenzioni',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/manutenzioni/:id
 * @desc Ottiene una manutenzione per ID
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/:id',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'read'),
    auditClinico('get_manutenzione'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const manutenzione = await ManutenzioneStrumentoService.findById(id, tenantId);

            if (!manutenzione) {
                return res.status(404).json({
                    success: false,
                    error: 'Manutenzione non trovata'
                });
            }

            res.json({
                success: true,
                data: manutenzione
            });
        } catch (error) {
            logger.error('Failed to get manutenzione', {
                component: 'manutenzioni-routes',
                error: 'Operazione non riuscita',
                manutenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della manutenzione',
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/manutenzioni
 * @desc Crea una nuova manutenzione
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.post('/',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    auditClinico('create_manutenzione'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const manutenzione = await ManutenzioneStrumentoService.create(
                { ...req.body, createdBy },
                tenantId
            );

            res.status(201).json({
                success: true,
                data: manutenzione,
                message: 'Manutenzione programmata con successo'
            });
        } catch (error) {
            logger.error('Failed to create manutenzione', {
                component: 'manutenzioni-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della manutenzione',
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/manutenzioni/ricorrente
 * @desc Crea manutenzioni ricorrenti
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.post('/ricorrente',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    auditClinico('create_manutenzioni_ricorrenti'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { strumentoId, descrizione, intervallo, dataInizio, numeroOccorrenze, esecutore } = req.body;
            const createdBy = req.person.id;

            const manutenzioni = await ManutenzioneStrumentoService.creaManutenzioneRicorrente(
                strumentoId,
                { descrizione, intervallo, dataInizio, numeroOccorrenze, esecutore, createdBy },
                tenantId
            );

            res.status(201).json({
                success: true,
                data: manutenzioni,
                message: `Create ${manutenzioni.length} manutenzioni ricorrenti`
            });
        } catch (error) {
            logger.error('Failed to create manutenzioni ricorrenti', {
                component: 'manutenzioni-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione delle manutenzioni ricorrenti',
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/manutenzioni/:id
 * @desc Aggiorna una manutenzione
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.put('/:id',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    auditClinico('update_manutenzione'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const manutenzione = await ManutenzioneStrumentoService.update(id, req.body, tenantId);

            res.json({
                success: true,
                data: manutenzione,
                message: 'Manutenzione aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update manutenzione', {
                component: 'manutenzioni-routes',
                error: 'Operazione non riuscita',
                manutenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Manutenzione non trovata') {
                return res.status(404).json({
                    success: false,
                    error: 'Manutenzione non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento della manutenzione',
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/manutenzioni/:id/completa
 * @desc Completa una manutenzione
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.put('/:id/completa',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    auditClinico('complete_manutenzione'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const manutenzione = await ManutenzioneStrumentoService.completaManutenzione(
                id,
                req.body,
                tenantId
            );

            res.json({
                success: true,
                data: manutenzione,
                message: 'Manutenzione completata con successo'
            });
        } catch (error) {
            logger.error('Failed to complete manutenzione', {
                component: 'manutenzioni-routes',
                error: 'Operazione non riuscita',
                manutenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Manutenzione non trovata') {
                return res.status(404).json({
                    success: false,
                    error: 'Manutenzione non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel completamento della manutenzione',
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/manutenzioni/:id/annulla
 * @desc Annulla una manutenzione
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.put('/:id/annulla',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    auditClinico('cancel_manutenzione'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { motivo } = req.body;
            const tenantId = getEffectiveTenantId(req);

            const manutenzione = await ManutenzioneStrumentoService.annullaManutenzione(
                id,
                motivo || 'Non specificato',
                tenantId
            );

            res.json({
                success: true,
                data: manutenzione,
                message: 'Manutenzione annullata'
            });
        } catch (error) {
            logger.error('Failed to cancel manutenzione', {
                component: 'manutenzioni-routes',
                error: 'Operazione non riuscita',
                manutenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Manutenzione non trovata') {
                return res.status(404).json({
                    success: false,
                    error: 'Manutenzione non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'annullamento della manutenzione',
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/manutenzioni/:id
 * @desc Elimina una manutenzione (soft delete)
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.delete('/:id',
    authenticateToken,
    checkAdvancedPermission('strumenti', 'update'),
    auditClinico('delete_manutenzione'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await ManutenzioneStrumentoService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Manutenzione eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete manutenzione', {
                component: 'manutenzioni-routes',
                error: 'Operazione non riuscita',
                manutenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Manutenzione non trovata') {
                return res.status(404).json({
                    success: false,
                    error: 'Manutenzione non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione della manutenzione',
            });
        }
    }
);

export default router;
