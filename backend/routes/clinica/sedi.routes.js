/**
 * @file sedi.routes.js
 * @description Routes per la gestione delle sedi poliambulatorio
 * @module routes/clinica/sedi
 *
 * @requires express
 * @requires ../auth/authenticateToken
 * @requires ../middleware/checkAdvancedPermission
 * @requires ../services/clinical/SedePoliambulatorioService
 * @requires ../services/clinical/PoliambulatorioService
 *
 * Routes:
 * - GET /sedi - Lista tutte le sedi del tenant
 * - GET /sedi/:id - Ottiene una sede per ID
 * - GET /sedi/:id/stats - Statistiche di una sede
 * - POST /sedi - Crea una nuova sede
 * - PUT /sedi/:id - Aggiorna una sede
 * - PUT /sedi/:id/principale - Imposta una sede come principale
 * - DELETE /sedi/:id - Elimina una sede (soft delete)
 *
 * Additional routes via poliambulatorio:
 * - GET /poliambulatori/:id/sedi - Lista sedi di un poliambulatorio
 * - POST /poliambulatori/:id/sedi - Crea sede per un poliambulatorio
 * - POST /sedi/:sedeId/direttore - Assegna direttore sanitario a sede
 */

import express from 'express';
import middleware from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';

const { authenticate: authenticateToken } = middleware;

// Services
import SedePoliambulatorioService from '../../services/clinical/SedePoliambulatorioService.js';
import PoliambulatorioService from '../../services/clinical/PoliambulatorioService.js';

// Validators
import { clinicalValidators } from '../../config/validation-clinical.js';

const router = express.Router();

// ============================================
// SEDI POLIAMBULATORIO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/sedi
 * @desc Lista tutte le sedi del tenant
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'read'),
    auditClinico('list_sedi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await SedePoliambulatorioService.findAll(tenantId, req.query);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list sedi', {
                component: 'sedi-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle sedi',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/sedi/:id
 * @desc Ottiene una sede per ID
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/:id',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'read'),
    auditClinico('get_sede'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const sede = await SedePoliambulatorioService.findById(id, tenantId);

            if (!sede) {
                return res.status(404).json({
                    success: false,
                    error: 'Sede non trovata'
                });
            }

            res.json({
                success: true,
                data: sede
            });
        } catch (error) {
            logger.error('Failed to get sede', {
                component: 'sedi-routes',
                error: 'Operazione non riuscita',
                sedeId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della sede',
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/sedi
 * @desc Crea una nuova sede
 * @access Authenticated + CREATE_POLIAMBULATORIO
 */
router.post('/',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'create'),
    auditClinico('create_sede'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const sede = await SedePoliambulatorioService.create(
                { ...req.body, createdBy },
                tenantId
            );

            res.status(201).json({
                success: true,
                data: sede,
                message: 'Sede creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create sede', {
                component: 'sedi-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della sede',
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/sedi/:id
 * @desc Aggiorna una sede
 * @access Authenticated + UPDATE_POLIAMBULATORIO
 */
router.put('/:id',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'update'),
    auditClinico('update_sede'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const sede = await SedePoliambulatorioService.update(id, req.body, tenantId);

            res.json({
                success: true,
                data: sede,
                message: 'Sede aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update sede', {
                component: 'sedi-routes',
                error: 'Operazione non riuscita',
                sedeId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Sede non trovata') {
                return res.status(404).json({
                    success: false,
                    error: 'Sede non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento della sede',
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/sedi/:id
 * @desc Elimina una sede (soft delete)
 * @access Authenticated + DELETE_POLIAMBULATORIO
 */
router.delete('/:id',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'delete'),
    auditClinico('delete_sede'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await SedePoliambulatorioService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Sede eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete sede', {
                component: 'sedi-routes',
                error: 'Operazione non riuscita',
                sedeId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Sede non trovata') {
                return res.status(404).json({
                    success: false,
                    error: 'Sede non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione della sede',
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/sedi/:id/principale
 * @desc Imposta una sede come principale
 * @access Authenticated + UPDATE_POLIAMBULATORIO
 */
router.put('/:id/principale',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'update'),
    auditClinico('set_sede_principale'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const sede = await SedePoliambulatorioService.setPrincipale(id, tenantId);

            res.json({
                success: true,
                data: sede,
                message: 'Sede impostata come principale'
            });
        } catch (error) {
            logger.error('Failed to set sede principale', {
                component: 'sedi-routes',
                error: 'Operazione non riuscita',
                sedeId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'impostazione della sede principale',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/sedi/:id/stats
 * @desc Statistiche di una sede
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/:id/stats',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'read'),
    auditClinico('get_sede_stats'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const stats = await SedePoliambulatorioService.getStats(id, tenantId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get sede stats', {
                component: 'sedi-routes',
                error: 'Operazione non riuscita',
                sedeId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle statistiche',
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/sedi/:sedeId/direttore
 * @desc Assegna un direttore sanitario a una sede
 * @access Authenticated + MANAGE_POLIAMBULATORIO
 */
router.post('/:sedeId/direttore',
    authenticateToken,
    checkAdvancedPermission('poliambulatorio', 'write'),
    auditClinico('assign_direttore_sede'),
    async (req, res) => {
        try {
            const { sedeId } = req.params;
            const { direttoreSanitarioId } = req.body;
            const tenantId = getEffectiveTenantId(req);

            const sede = await PoliambulatorioService.assignDirettoreSanitarioToSede(sedeId, direttoreSanitarioId, tenantId);

            res.json({
                success: true,
                data: sede,
                message: 'Direttore sanitario assegnato alla sede con successo'
            });
        } catch (error) {
            logger.error('Failed to assign direttore sanitario to sede', {
                component: 'sedi-routes',
                error: 'Operazione non riuscita',
                sedeId: req.params.sedeId,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Sede not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Sede non trovata'
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

export default router;
