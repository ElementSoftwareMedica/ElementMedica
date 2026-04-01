/**
 * @file slots.routes.js
 * @description Routes per la gestione degli slot disponibilità
 * @module routes/clinica/slots
 *
 * @requires express
 * @requires ../auth/authenticateToken
 * @requires ../middleware/checkAdvancedPermission
 * @requires ../services/clinical/SlotDisponibilitaService
 *
 * Routes:
 * - GET /slots/available - Lista slot disponibili per prenotazione
 * - GET /slots/grouped - Lista slot raggruppati per data
 * - GET /slots/first-available - Primo slot disponibile per prestazione
 * - GET /slots/medico/:medicoId - Lista slot per medico e range date
 * - GET /slots/medico/:medicoId/availability - Calcola disponibilità medico
 * - GET /slots/:id - Dettaglio slot
 * - POST /slots - Crea nuovo slot
 * - POST /slots/bulk - Crea multipli slot in blocco
 * - POST /slots/generate - Genera slot da orari ambulatorio
 * - POST /slots/:id/book - Prenota slot
 * - POST /slots/:id/release - Libera slot prenotato
 * - POST /slots/:id/block - Blocca slot
 * - PUT /slots/:id - Aggiorna slot
 * - DELETE /slots/:id - Elimina slot (soft delete)
 * - DELETE /slots/medico/:medicoId/range - Elimina slot per range date
 */

import express from 'express';
import middleware from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import logger from '../../utils/logger.js';
import { auditClinico, getEffectiveTenantId } from './utils/clinica-utils.js';

const { authenticate: authenticateToken } = middleware;

// Services
import SlotDisponibilitaService from '../../services/clinical/SlotDisponibilitaService.js';

// Validators
import { clinicalValidators } from '../../config/validation-clinical.js';

const router = express.Router();

// ============================================
// SLOT DISPONIBILITA ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/slots
 * @desc Lista slot (con filtri, paginazione)
 * @access Authenticated
 */
router.get('/',
    authenticateToken,
    auditClinico('list_slots'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { limit, tenantIds, allTenants, filters = {} } = req.query;

            const queryFilters = {
                ...(typeof filters === 'object' ? filters : {}),
                ...(limit && { limit: parseInt(limit) })
            };

            const options = {
                tenantIds,
                allTenants: allTenants === 'true',
                accessibleTenantIds: req.accessibleTenantIds || []
            };

            const slots = await SlotDisponibilitaService.getAvailable(queryFilters, tenantId, options);

            res.json({
                success: true,
                data: slots,
                total: slots.length,
                count: slots.length
            });
        } catch (error) {
            logger.error('Failed to list slots', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli slot',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/available
 * @desc Lista slot disponibili per prenotazione
 * @access Authenticated
 */
router.get('/available',
    authenticateToken,
    clinicalValidators.slotDisponibilita.query,
    auditClinico('list_slots_available'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const slots = await SlotDisponibilitaService.getAvailable(req.query, tenantId);

            res.json({
                success: true,
                data: slots,
                count: slots.length
            });
        } catch (error) {
            logger.error('Failed to get available slots', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli slot',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/grouped
 * @desc Lista slot raggruppati per data (vista calendario)
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/grouped',
    authenticateToken,
    checkAdvancedPermission('agenda', 'read'),
    clinicalValidators.slotDisponibilita.query,
    auditClinico('list_slots_grouped'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const grouped = await SlotDisponibilitaService.getGroupedByDate(req.query, tenantId);

            res.json({
                success: true,
                data: grouped,
                count: grouped.length
            });
        } catch (error) {
            logger.error('Failed to get grouped slots', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli slot',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/first-available
 * @desc Primo slot disponibile per prestazione
 * @access Authenticated
 */
router.get('/first-available',
    authenticateToken,
    auditClinico('get_first_available_slot'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { prestazioneId, medicoId, ambulatorioId, afterDate } = req.query;

            if (!prestazioneId) {
                return res.status(400).json({
                    success: false,
                    error: 'prestazioneId è obbligatorio'
                });
            }

            const slot = await SlotDisponibilitaService.getFirstAvailable(
                prestazioneId,
                tenantId,
                { medicoId, ambulatorioId, afterDate }
            );

            res.json({
                success: true,
                data: slot
            });
        } catch (error) {
            logger.error('Failed to get first available slot', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dello slot',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/medico/:medicoId
 * @desc Lista slot per medico e range date
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/medico/:medicoId',
    authenticateToken,
    checkAdvancedPermission('agenda', 'read'),
    auditClinico('list_medico_slots'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.params;
            const { dataInizio, dataFine } = req.query;

            if (!dataInizio || !dataFine) {
                return res.status(400).json({
                    success: false,
                    error: 'dataInizio e dataFine sono obbligatori'
                });
            }

            const slots = await SlotDisponibilitaService.getByMedicoDateRange(
                medicoId,
                dataInizio,
                dataFine,
                tenantId
            );

            res.json({
                success: true,
                data: slots,
                count: slots.length
            });
        } catch (error) {
            logger.error('Failed to get medico slots', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                medicoId: req.params.medicoId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli slot',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/medico/:medicoId/availability
 * @desc Calcola disponibilità medico
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/medico/:medicoId/availability',
    authenticateToken,
    checkAdvancedPermission('agenda', 'read'),
    auditClinico('get_medico_availability'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.params;
            const { dataInizio, dataFine } = req.query;

            if (!dataInizio || !dataFine) {
                return res.status(400).json({
                    success: false,
                    error: 'dataInizio e dataFine sono obbligatori'
                });
            }

            const availability = await SlotDisponibilitaService.calculateAvailability(
                medicoId,
                dataInizio,
                dataFine,
                tenantId
            );

            res.json({
                success: true,
                data: availability
            });
        } catch (error) {
            logger.error('Failed to calculate medico availability', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                medicoId: req.params.medicoId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo della disponibilità',
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/:id
 * @desc Dettaglio slot
 * @access Authenticated
 */
router.get('/:id',
    authenticateToken,
    clinicalValidators.params.id,
    auditClinico('get_slot'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const slot = await SlotDisponibilitaService.getById(req.params.id, tenantId);

            if (!slot) {
                return res.status(404).json({
                    success: false,
                    error: 'Slot non trovato'
                });
            }

            res.json({
                success: true,
                data: slot
            });
        } catch (error) {
            logger.error('Failed to get slot', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dello slot',
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots
 * @desc Crea nuovo slot
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/',
    authenticateToken,
    checkAdvancedPermission('agenda', 'create'),
    clinicalValidators.slotDisponibilita.create,
    auditClinico('create_slot'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const slot = await SlotDisponibilitaService.create(req.body, tenantId);

            res.status(201).json({
                success: true,
                data: slot,
                message: 'Slot creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create slot', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('sovrapposto') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione dello slot',
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots/bulk
 * @desc Crea multipli slot in blocco
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/bulk',
    authenticateToken,
    checkAdvancedPermission('agenda', 'create'),
    auditClinico('create_slots_bulk'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { slots } = req.body;

            if (!Array.isArray(slots) || slots.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Array slots è obbligatorio'
                });
            }

            const result = await SlotDisponibilitaService.createBulk(slots, tenantId);

            res.status(201).json({
                success: true,
                data: result,
                message: `Creati ${result.created.length} slot, ${result.failed.length} falliti`
            });
        } catch (error) {
            logger.error('Failed to create slots bulk', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione degli slot',
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots/generate
 * @desc Genera slot da orari ambulatorio
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/generate',
    authenticateToken,
    checkAdvancedPermission('agenda', 'create'),
    clinicalValidators.slotDisponibilita.generate,
    auditClinico('generate_slots'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId, dataInizio, dataFine, durataMinuti, ambulatorioId, prestazioneId, skipExisting } = req.body;

            const result = await SlotDisponibilitaService.generateFromOrario(
                medicoId,
                dataInizio,
                dataFine,
                durataMinuti,
                tenantId,
                { ambulatorioId, prestazioneId, skipExisting }
            );

            res.status(201).json({
                success: true,
                data: result,
                message: `Generati ${result.created.length} slot, ${result.skipped} saltati`
            });
        } catch (error) {
            logger.error('Failed to generate slots', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella generazione degli slot',
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/slots/:id
 * @desc Aggiorna slot
 * @access Authenticated + MANAGE_AGENDA
 */
router.put('/:id',
    authenticateToken,
    checkAdvancedPermission('agenda', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.slotDisponibilita.update,
    auditClinico('update_slot'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const slot = await SlotDisponibilitaService.update(req.params.id, req.body, tenantId);

            res.json({
                success: true,
                data: slot,
                message: 'Slot aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update slot', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('sovrapposto') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento dello slot',
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots/:id/book
 * @desc Prenota slot
 * @access Authenticated
 */
router.post('/:id/book',
    authenticateToken,
    clinicalValidators.params.id,
    clinicalValidators.slotDisponibilita.book,
    auditClinico('book_slot'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const slot = await SlotDisponibilitaService.book(req.params.id, req.body.appuntamentoId, tenantId);

            res.json({
                success: true,
                data: slot,
                message: 'Slot prenotato con successo'
            });
        } catch (error) {
            logger.error('Failed to book slot', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('non disponibile') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella prenotazione dello slot',
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots/:id/release
 * @desc Libera slot prenotato
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/:id/release',
    authenticateToken,
    checkAdvancedPermission('agenda', 'update'),
    clinicalValidators.params.id,
    auditClinico('release_slot'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const slot = await SlotDisponibilitaService.release(req.params.id, tenantId);

            res.json({
                success: true,
                data: slot,
                message: 'Slot liberato con successo'
            });
        } catch (error) {
            logger.error('Failed to release slot', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella liberazione dello slot',
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots/:id/block
 * @desc Blocca slot
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/:id/block',
    authenticateToken,
    checkAdvancedPermission('agenda', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.slotDisponibilita.block,
    auditClinico('block_slot'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const slot = await SlotDisponibilitaService.block(req.params.id, req.body.note, tenantId);

            res.json({
                success: true,
                data: slot,
                message: 'Slot bloccato con successo'
            });
        } catch (error) {
            logger.error('Failed to block slot', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('prenotato') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nel blocco dello slot',
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/slots/:id
 * @desc Elimina slot (soft delete)
 * @access Authenticated + MANAGE_AGENDA
 */
router.delete('/:id',
    authenticateToken,
    checkAdvancedPermission('agenda', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_slot'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            await SlotDisponibilitaService.delete(req.params.id, tenantId);

            res.json({
                success: true,
                message: 'Slot eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete slot', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('prenotato') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione dello slot',
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/slots/medico/:medicoId/range
 * @desc Elimina slot per range date
 * @access Authenticated + MANAGE_AGENDA
 */
router.delete('/medico/:medicoId/range',
    authenticateToken,
    checkAdvancedPermission('agenda', 'delete'),
    auditClinico('delete_slots_range'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.params;
            const { dataInizio, dataFine, soloLiberi = true } = req.query;

            if (!dataInizio || !dataFine) {
                return res.status(400).json({
                    success: false,
                    error: 'dataInizio e dataFine sono obbligatori'
                });
            }

            const result = await SlotDisponibilitaService.deleteByDateRange(
                medicoId,
                dataInizio,
                dataFine,
                tenantId,
                soloLiberi === 'true' || soloLiberi === true
            );

            res.json({
                success: true,
                data: result,
                message: `Eliminati ${result.deleted} slot`
            });
        } catch (error) {
            logger.error('Failed to delete slots by range', {
                component: 'slots-routes',
                error: 'Operazione non riuscita',
                medicoId: req.params.medicoId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione degli slot',
            });
        }
    }
);

export default router;
