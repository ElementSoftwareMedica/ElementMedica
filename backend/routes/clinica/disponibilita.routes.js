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
import AvailabilityNotificationService from '../../services/clinical/AvailabilityNotificationService.js';
import Joi from 'joi';
import { validateParamId } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

const PRIVILEGED_CLINIC_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN', 'COMPANY_ADMIN', 'CLINIC_ADMIN', 'SEGRETERIA_CLINICA']);

function getRoleTypes(req) {
    return (req.person?.roles || []).map(role => typeof role === 'string' ? role : role?.roleType).filter(Boolean);
}

function isBaseMedico(req) {
    const roles = getRoleTypes(req);
    return roles.includes('MEDICO') &&
        !roles.includes('MEDICO_COMPETENTE') &&
        !roles.some(role => PRIVILEGED_CLINIC_ROLES.has(role));
}

function assertOwnMedico(req, medicoId) {
    if (isBaseMedico(req) && medicoId && medicoId !== req.person?.id) {
        const error = new Error('Non autorizzato a gestire disponibilita di altri medici');
        error.statusCode = 403;
        throw error;
    }
}

async function assertOwnDisponibilita(req, tenantId, id) {
    if (!isBaseMedico(req)) return null;
    const disponibilita = await DisponibilitaMedicoService.getById(id, tenantId);
    assertOwnMedico(req, disponibilita.medicoId);
    return disponibilita;
}

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
                medicoId: isBaseMedico(req) ? req.person.id : req.query.medicoId,
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
            assertOwnMedico(req, medicoId);

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
            assertOwnMedico(req, data.medicoId);

            res.json({
                success: true,
                data
            });
        } catch (error) {
            const status = error.statusCode || (error.message === 'Disponibilità non trovata' ? 404 : 500);
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

            assertOwnMedico(req, value.medicoId);

            const data = await DisponibilitaMedicoService.create({
                ...value,
                createdBy: req.person.id
            }, tenantId);

            if (isBaseMedico(req)) {
                await AvailabilityNotificationService.notifySecretaries({
                    tenantId,
                    actorId: req.person.id,
                    medicoId: data.medicoId,
                    action: 'created',
                    entityId: data.id,
                    actionUrl: '/poliambulatorio/disponibilita'
                });
            }

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
            res.status(error.statusCode || 400).json({
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

            assertOwnMedico(req, value.medicoId);

            const result = await DisponibilitaMedicoService.copyWeek(
                value.medicoId,
                value.fromDate,
                value.toDate,
                tenantId
            );

            if (isBaseMedico(req)) {
                await AvailabilityNotificationService.notifySecretaries({
                    tenantId,
                    actorId: req.person.id,
                    medicoId: value.medicoId,
                    action: 'copied',
                    actionUrl: '/poliambulatorio/disponibilita'
                });
            }

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
            res.status(error.statusCode || 400).json({
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

            assertOwnMedico(req, value.medicoId);

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

            const createdCount = Array.isArray(result.created) ? result.created.length : Number(result.created || 0);
            if (isBaseMedico(req) && createdCount > 0) {
                await AvailabilityNotificationService.notifySecretaries({
                    tenantId,
                    actorId: req.person.id,
                    medicoId: value.medicoId,
                    action: 'generated',
                    entityId: Array.isArray(result.created) ? result.created[0]?.id : undefined,
                    count: createdCount,
                    actionUrl: '/poliambulatorio/disponibilita'
                });
            }

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
            res.status(error.statusCode || 400).json({
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

            const previous = await assertOwnDisponibilita(req, tenantId, id);
            if (value.medicoId) assertOwnMedico(req, value.medicoId);

            const data = await DisponibilitaMedicoService.update(id, value, tenantId);

            if (isBaseMedico(req)) {
                await AvailabilityNotificationService.notifySecretaries({
                    tenantId,
                    actorId: req.person.id,
                    medicoId: data.medicoId || previous?.medicoId,
                    action: 'updated',
                    entityId: data.id,
                    actionUrl: '/poliambulatorio/disponibilita'
                });
            }

            res.json({
                success: true,
                data
            });
        } catch (error) {
            const status = error.statusCode || (error.message === 'Disponibilità non trovata' ? 404 : 400);
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
            const previous = await assertOwnDisponibilita(req, tenantId, id);

            await DisponibilitaMedicoService.delete(id, tenantId);

            if (isBaseMedico(req)) {
                await AvailabilityNotificationService.notifySecretaries({
                    tenantId,
                    actorId: req.person.id,
                    medicoId: previous.medicoId,
                    action: 'deleted',
                    entityId: id,
                    count: 1,
                    actionUrl: '/poliambulatorio/disponibilita'
                });
            }

            res.json({
                success: true,
                message: 'Disponibilità eliminata'
            });
        } catch (error) {
            const status = error.statusCode || (error.message === 'Disponibilità non trovata' ? 404 : 500);
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
            const previous = await assertOwnDisponibilita(req, tenantId, id);

            // First count how many slots will be affected
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const affectedCount = await SlotDisponibilitaService.countFutureSlotsByPattern(id, today, tenantId);

            // Delete all future free slots generated from this pattern
            const deleteResult = await SlotDisponibilitaService.deleteFutureSlotsByPattern(id, today, tenantId, true);

            // Delete the pattern itself
            await DisponibilitaMedicoService.delete(id, tenantId);

            if (isBaseMedico(req)) {
                await AvailabilityNotificationService.notifySecretaries({
                    tenantId,
                    actorId: req.person.id,
                    medicoId: previous.medicoId,
                    action: 'deleted',
                    entityId: id,
                    count: Math.max(Number(affectedCount || 0), Number(deleteResult.deleted || 0), 1),
                    actionUrl: '/poliambulatorio/disponibilita'
                });
            }

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
            const status = error.statusCode || (error.message === 'Disponibilità non trovata' ? 404 : 500);
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
            await assertOwnDisponibilita(req, tenantId, id);

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
