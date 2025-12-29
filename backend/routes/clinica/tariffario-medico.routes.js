/**
 * @file tariffario-medico.routes.js
 * @description Routes per la gestione dei tariffari medico
 * @module routes/clinica/tariffario-medico
 *
 * @requires express
 * @requires ../auth/authenticateToken
 * @requires ../middleware/checkAdvancedPermission
 * @requires ../services/clinical/TariffarioMedicoService
 *
 * Routes:
 * - GET /tariffario-medico - Lista tariffari medico con filtri
 * - GET /tariffario-medico/by-medico/:medicoId - Tariffari per medico
 * - POST /tariffario-medico - Crea nuovo tariffario medico
 * - POST /tariffario-medico/effective - Ottiene tariffario effettivo
 * - PUT /tariffario-medico/:id - Aggiorna tariffario medico
 * - DELETE /tariffario-medico/:id - Elimina tariffario medico (soft delete)
 */

import express from 'express';
import middleware from '../../auth/middleware.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import logger from '../../utils/logger.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';

const { authenticate: authenticateToken } = middleware;

// Services
import TariffarioMedicoService from '../../services/clinical/TariffarioMedicoService.js';

const router = express.Router();

// ============================================
// TARIFFARIO MEDICO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/tariffario-medico
 * @desc Lista tariffari medico con filtri
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await TariffarioMedicoService.getAll(tenantId, req.query);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list tariffari medico', {
                component: 'tariffario-medico-routes',
                action: 'list_tariffari_medico',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore lista tariffari medico',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/tariffario-medico/by-medico/:medicoId
 * @desc Ottiene tutti i tariffari per un medico
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/by-medico/:medicoId',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    async (req, res) => {
        try {
            const { medicoId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const tariffari = await TariffarioMedicoService.getByMedico(medicoId, tenantId);

            res.json({
                success: true,
                data: tariffari
            });
        } catch (error) {
            logger.error('Failed to get tariffari by medico', {
                component: 'tariffario-medico-routes',
                action: 'tariffari_by_medico',
                error: error.message,
                medicoId: req.params.medicoId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore recupero tariffari medico',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/tariffario-medico/effective
 * @desc Ottiene il tariffario effettivo per una combinazione medico/branca/convenzione
 * @access Authenticated + VIEW_LISTINI
 */
router.post('/effective',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    async (req, res) => {
        try {
            const { medicoId, brancaSpecialistica, convenzioneId } = req.body;
            const tenantId = getEffectiveTenantId(req);

            if (!medicoId) {
                return res.status(400).json({
                    success: false,
                    error: 'medicoId obbligatorio'
                });
            }

            const tariffario = await TariffarioMedicoService.getEffective({
                medicoId,
                tenantId,
                brancaSpecialistica,
                convenzioneId
            });

            res.json({
                success: true,
                data: tariffario,
                found: tariffario !== null
            });
        } catch (error) {
            logger.error('Failed to get effective tariffario', {
                component: 'tariffario-medico-routes',
                action: 'effective_tariffario',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore recupero tariffario effettivo',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/tariffario-medico
 * @desc Crea un nuovo tariffario medico
 * @access Authenticated + CREATE_LISTINI
 */
router.post('/',
    authenticateToken(),
    checkAdvancedPermission('listini', 'create'),
    auditClinico('create_tariffario_medico'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person?.id;

            const tariffario = await TariffarioMedicoService.create({
                ...req.body,
                tenantId,
                createdBy
            });

            res.status(201).json({
                success: true,
                data: tariffario,
                message: 'Tariffario medico creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create tariffario medico', {
                component: 'tariffario-medico-routes',
                action: 'create_tariffario_medico',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(error.message.includes('già') ? 409 : 500).json({
                success: false,
                error: 'Errore creazione tariffario medico',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/tariffario-medico/:id
 * @desc Aggiorna un tariffario medico
 * @access Authenticated + UPDATE_LISTINI
 */
router.put('/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'update'),
    auditClinico('update_tariffario_medico'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const tariffario = await TariffarioMedicoService.update(id, tenantId, req.body);

            res.json({
                success: true,
                data: tariffario,
                message: 'Tariffario medico aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update tariffario medico', {
                component: 'tariffario-medico-routes',
                action: 'update_tariffario_medico',
                error: error.message,
                tariffarioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(error.message.includes('non trovato') ? 404 : 500).json({
                success: false,
                error: 'Errore aggiornamento tariffario medico',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/tariffario-medico/:id
 * @desc Elimina un tariffario medico (soft delete)
 * @access Authenticated + DELETE_LISTINI
 */
router.delete('/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'delete'),
    auditClinico('delete_tariffario_medico'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await TariffarioMedicoService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Tariffario medico eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete tariffario medico', {
                component: 'tariffario-medico-routes',
                action: 'delete_tariffario_medico',
                error: error.message,
                tariffarioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(error.message.includes('non trovato') ? 404 : 500).json({
                success: false,
                error: 'Errore eliminazione tariffario medico',
                message: error.message
            });
        }
    }
);

export default router;
