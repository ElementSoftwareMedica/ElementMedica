/**
 * Disponibilità Medico Routes
 * API endpoints for weekly schedule patterns
 * 
 * Base path: /api/v1/clinica/disponibilita
 * 
 * @module routes/clinica/disponibilita
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import DisponibilitaMedicoService from '../../services/clinical/DisponibilitaMedicoService.js';
import SlotDisponibilitaService from '../../services/clinical/SlotDisponibilitaService.js';
import Joi from 'joi';
import { validateParamId } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const schemas = {
    create: Joi.object({
        medicoId: Joi.string().uuid().required(),
        ambulatorioId: Joi.string().uuid().allow(null, ''),
        prestazioneId: Joi.string().uuid().allow(null, ''),
        giorno: Joi.number().integer().min(0).max(6).required(),
        oraInizio: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        oraFine: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        durataSlot: Joi.number().integer().min(5).max(480).default(30),
        intervalloSlot: Joi.number().integer().min(0).max(60).default(0),
        maxAppuntamenti: Joi.number().integer().min(1).allow(null),
        attivo: Joi.boolean().default(true),
        validoDal: Joi.date().iso().allow(null),
        validoAl: Joi.date().iso().allow(null),
        note: Joi.string().max(1000).allow(null, ''),
        branchType: Joi.string().valid('MEDICA', 'SICUREZZA', 'FORMAZIONE', 'HACCP', 'HR', 'SHARED').default('MEDICA')
    }),

    update: Joi.object({
        medicoId: Joi.string().uuid(),
        ambulatorioId: Joi.string().uuid().allow(null, ''),
        prestazioneId: Joi.string().uuid().allow(null, ''),
        giorno: Joi.number().integer().min(0).max(6),
        oraInizio: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        oraFine: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        durataSlot: Joi.number().integer().min(5).max(480),
        intervalloSlot: Joi.number().integer().min(0).max(60),
        maxAppuntamenti: Joi.number().integer().min(1).allow(null),
        attivo: Joi.boolean(),
        validoDal: Joi.date().iso().allow(null),
        validoAl: Joi.date().iso().allow(null),
        note: Joi.string().max(1000).allow(null, '')
    }),

    copyWeek: Joi.object({
        medicoId: Joi.string().uuid().required(),
        fromDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
        toDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
    }),

    generateSlots: Joi.object({
        medicoId: Joi.string().uuid().required(),
        dataInizio: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
        dataFine: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
    })
};

// ============================================
// GET /api/v1/clinica/disponibilita
// Get all disponibilità with pagination
// ============================================

router.get('/',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const options = {
                page: req.query.page || 1,
                limit: req.query.limit || 100,
                medicoId: req.query.medicoId,
                ambulatorioId: req.query.ambulatorioId,
                giorno: req.query.giorno,
                attivo: req.query.attivo
            };

            const result = await DisponibilitaMedicoService.getAll(options, tenantId);

            res.json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });
        } catch (error) {
            logger.error('Failed to get disponibilità', {
                component: 'disponibilita-routes',
                action: 'getAll',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// GET /api/v1/clinica/disponibilita/medico/:medicoId
// Get disponibilità by medico
// ============================================

router.get('/medico/:medicoId',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.params;

            const data = await DisponibilitaMedicoService.getByMedico(medicoId, tenantId);

            res.json({
                success: true,
                data
            });
        } catch (error) {
            logger.error('Failed to get disponibilità by medico', {
                component: 'disponibilita-routes',
                action: 'getByMedico',
                medicoId: req.params.medicoId,
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// GET /api/v1/clinica/disponibilita/:id
// Get single disponibilità by ID
// ============================================

router.get('/:id',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const data = await DisponibilitaMedicoService.getById(id, tenantId);

            res.json({
                success: true,
                data
            });
        } catch (error) {
            const status = error.message === 'Disponibilità non trovata' ? 404 : 500;
            logger.error('Failed to get disponibilità by ID', {
                component: 'disponibilita-routes',
                action: 'getById',
                id: req.params.id,
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(status).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// POST /api/v1/clinica/disponibilita
// Create new disponibilità
// ============================================

router.post('/',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            // Validate input
            const { error, value } = schemas.create.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: error.details[0].message
                });
            }

            const data = await DisponibilitaMedicoService.create({
                ...value,
                createdBy: req.person.id
            }, tenantId);

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            logger.error('Failed to create disponibilità', {
                component: 'disponibilita-routes',
                action: 'create',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// POST /api/v1/clinica/disponibilita/copy-week
// Copy week pattern
// ============================================

router.post('/copy-week',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            // Validate input
            const { error, value } = schemas.copyWeek.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: error.details[0].message
                });
            }

            const result = await DisponibilitaMedicoService.copyWeek(
                value.medicoId,
                value.fromDate,
                value.toDate,
                tenantId
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to copy week', {
                component: 'disponibilita-routes',
                action: 'copyWeek',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// POST /api/v1/clinica/disponibilita/generate-slots
// Generate SlotDisponibilita from weekly patterns
// ============================================

router.post('/generate-slots',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            // Validate input
            const { error, value } = schemas.generateSlots.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: error.details[0].message
                });
            }

            // Validate date range (max 365 days)
            const startDate = new Date(value.dataInizio);
            const endDate = new Date(value.dataFine);
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            if (daysDiff < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Data fine deve essere successiva a data inizio'
                });
            }
            if (daysDiff > 365) {
                return res.status(400).json({
                    success: false,
                    error: 'Range massimo 365 giorni'
                });
            }

            const result = await SlotDisponibilitaService.generateFromDisponibilita(
                value.medicoId,
                value.dataInizio,
                value.dataFine,
                tenantId
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to generate slots from patterns', {
                component: 'disponibilita-routes',
                action: 'generateSlots',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// PUT /api/v1/clinica/disponibilita/:id
// Update disponibilità
// ============================================

router.put('/:id',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            // Validate input
            const { error, value } = schemas.update.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: error.details[0].message
                });
            }

            const data = await DisponibilitaMedicoService.update(id, value, tenantId);

            res.json({
                success: true,
                data
            });
        } catch (error) {
            const status = error.message === 'Disponibilità non trovata' ? 404 : 400;
            logger.error('Failed to update disponibilità', {
                component: 'disponibilita-routes',
                action: 'update',
                id: req.params.id,
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(status).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// DELETE /api/v1/clinica/disponibilita/:id
// Soft delete disponibilità
// ============================================

router.delete('/:id',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            await DisponibilitaMedicoService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Disponibilità eliminata'
            });
        } catch (error) {
            const status = error.message === 'Disponibilità non trovata' ? 404 : 500;
            logger.error('Failed to delete disponibilità', {
                component: 'disponibilita-routes',
                action: 'delete',
                id: req.params.id,
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(status).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// DELETE /api/v1/clinica/disponibilita/:id/cascade
// P68: Soft delete disponibilità AND all future generated slots
// ============================================

router.delete('/:id/cascade',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            // First count how many slots will be affected
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const affectedCount = await SlotDisponibilitaService.countFutureSlotsByPattern(id, today, tenantId);

            // Delete all future free slots generated from this pattern
            const deleteResult = await SlotDisponibilitaService.deleteFutureSlotsByPattern(id, today, tenantId, true);

            // Delete the pattern itself
            await DisponibilitaMedicoService.delete(id, tenantId);

            logger.info('Disponibilità and future slots cascade deleted', {
                component: 'disponibilita-routes',
                action: 'cascadeDelete',
                disponibilitaId: id,
                deletedSlots: deleteResult.deleted,
                tenantId
            });

            res.json({
                success: true,
                message: `Disponibilità eliminata insieme a ${deleteResult.deleted} slot futuri`,
                deletedSlots: deleteResult.deleted
            });
        } catch (error) {
            const status = error.message === 'Disponibilità non trovata' ? 404 : 500;
            logger.error('Failed to cascade delete disponibilità', {
                component: 'disponibilita-routes',
                action: 'cascadeDelete',
                id: req.params.id,
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(status).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// GET /api/v1/clinica/disponibilita/:id/future-slots-count
// P68: Count future slots generated from this pattern
// ============================================

router.get('/:id/future-slots-count',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const count = await SlotDisponibilitaService.countFutureSlotsByPattern(id, today, tenantId);

            res.json({
                success: true,
                data: { count }
            });
        } catch (error) {
            logger.error('Failed to count future slots', {
                component: 'disponibilita-routes',
                action: 'countFutureSlots',
                id: req.params.id,
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

export default router;
