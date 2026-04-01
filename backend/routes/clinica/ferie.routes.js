/**
 * Ferie/Assenze Routes
 * API endpoints for managing doctor holidays and absences
 * 
 * @module routes/clinica/ferie.routes
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { FerieAssenzaService } from '../../services/clinical/FerieAssenzaService.js';
import logger from '../../utils/logger.js';
import { validateParamId } from '../../middleware/validateUUID.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = Router();
router.param('id', validateParamId);

// ============================================
// MIDDLEWARE COMUNI
// ============================================

/** Middleware di autenticazione e permessi lettura */
const readAccess = [
    authenticate,
    requirePermission(PERMISSIONS.FERIE_READ)
];

/** Middleware di autenticazione e permessi creazione */
const createAccess = [
    authenticate,
    requirePermission(PERMISSIONS.FERIE_CREATE)
];

/** Middleware di autenticazione e permessi modifica */
const updateAccess = [
    authenticate,
    requirePermission(PERMISSIONS.FERIE_UPDATE)
];

/** Middleware di autenticazione e permessi eliminazione */
const deleteAccess = [
    authenticate,
    requirePermission(PERMISSIONS.FERIE_DELETE)
];

/** Middleware di autenticazione e permessi approvazione */
const approveAccess = [
    authenticate,
    requirePermission(PERMISSIONS.FERIE_APPROVE)
];

/**
 * GET /api/v1/clinica/ferie
 * Get all ferie/assenze with pagination and filters
 */
router.get('/', ...readAccess, async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const options = {
            page: req.query.page || 1,
            limit: req.query.limit || 100,
            medicoId: req.query.medicoId,
            tipo: req.query.tipo,
            stato: req.query.stato,
            dataInizio: req.query.dataInizio,
            dataFine: req.query.dataFine
        };

        const result = await FerieAssenzaService.getAll(options, tenantId);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('GET /ferie error', {
            error: 'Operazione non riuscita',
            tenantId: req.person?.tenantId
        });
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero ferie'
        });
    }
});

/**
 * GET /api/v1/clinica/ferie/medico/:medicoId
 * Get ferie/assenze by medico
 * IMPORTANT: This route MUST be defined BEFORE /:id to avoid route conflicts
 */
router.get('/medico/:medicoId', ...readAccess, async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { medicoId } = req.params;

        const data = await FerieAssenzaService.getByMedico(medicoId, tenantId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('GET /ferie/medico/:medicoId error', {
            medicoId: req.params.medicoId,
            error: 'Operazione non riuscita',
            tenantId: req.person?.tenantId
        });
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero ferie'
        });
    }
});

/**
 * GET /api/v1/clinica/ferie/:id
 * Get single ferie/assenza by ID
 */
router.get('/:id', ...readAccess, async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const ferieAssenza = await FerieAssenzaService.getById(id, tenantId);

        res.json({
            success: true,
            data: ferieAssenza
        });
    } catch (error) {
        logger.error('GET /ferie/:id error', {
            id: req.params.id,
            error: 'Operazione non riuscita',
            tenantId: req.person?.tenantId
        });
        res.status(error.message.includes('non trovata') ? 404 : 500).json({
            success: false,
            message: 'Errore nel recupero ferie'
        });
    }
});

/**
 * POST /api/v1/clinica/ferie
 * Create new ferie/assenza
 */
router.post('/', ...createAccess, async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const userId = req.person.id;
        const data = req.body;

        const ferieAssenza = await FerieAssenzaService.create(data, tenantId, userId);

        res.status(201).json({
            success: true,
            data: ferieAssenza
        });
    } catch (error) {
        logger.error('POST /ferie error', {
            error: 'Operazione non riuscita',
            tenantId: req.person?.tenantId
        });
        res.status(400).json({
            success: false,
            message: 'Errore nella creazione ferie'
        });
    }
});

/**
 * PUT /api/v1/clinica/ferie/:id
 * Update ferie/assenza
 */
router.put('/:id', ...updateAccess, async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const data = req.body;

        const ferieAssenza = await FerieAssenzaService.update(id, data, tenantId);

        res.json({
            success: true,
            data: ferieAssenza
        });
    } catch (error) {
        logger.error('PUT /ferie/:id error', {
            id: req.params.id,
            error: 'Operazione non riuscita',
            tenantId: req.person?.tenantId
        });
        res.status(error.message.includes('non trovata') ? 404 : 400).json({
            success: false,
            message: 'Errore nell\'aggiornamento ferie'
        });
    }
});

/**
 * DELETE /api/v1/clinica/ferie/:id
 * Soft delete ferie/assenza
 */
router.delete('/:id', ...deleteAccess, async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        await FerieAssenzaService.delete(id, tenantId);

        res.json({
            success: true,
            message: 'Ferie/Assenza eliminata'
        });
    } catch (error) {
        logger.error('DELETE /ferie/:id error', {
            id: req.params.id,
            error: 'Operazione non riuscita',
            tenantId: req.person?.tenantId
        });
        res.status(error.message.includes('non trovata') ? 404 : 500).json({
            success: false,
            message: 'Errore nell\'eliminazione ferie'
        });
    }
});

/**
 * POST /api/v1/clinica/ferie/check-conflicts
 * Check for conflicts with existing ferie/assenze
 */
router.post('/check-conflicts', ...readAccess, async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { medicoId, dataInizio, dataFine, excludeId } = req.body;

        const conflicts = await FerieAssenzaService.checkConflicts({
            medicoId,
            dataInizio: new Date(dataInizio),
            dataFine: new Date(dataFine),
            tenantId,
            excludeId
        });

        res.json({
            success: true,
            hasConflicts: conflicts.length > 0,
            conflicts
        });
    } catch (error) {
        logger.error('POST /ferie/check-conflicts error', {
            error: 'Operazione non riuscita',
            tenantId: req.person?.tenantId
        });
        res.status(500).json({
            success: false,
            message: 'Errore nella verifica conflitti'
        });
    }
});

/**
 * POST /api/v1/clinica/ferie/:id/approve
 * Approve ferie/assenza request
 */
router.post('/:id/approve', ...approveAccess, async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const userId = req.person.id;
        const { id } = req.params;

        const ferieAssenza = await FerieAssenzaService.approve(id, userId, tenantId);

        res.json({
            success: true,
            data: ferieAssenza
        });
    } catch (error) {
        logger.error('POST /ferie/:id/approve error', {
            id: req.params.id,
            error: 'Operazione non riuscita',
            tenantId: req.person?.tenantId
        });
        res.status(500).json({
            success: false,
            message: 'Errore nell\'approvazione ferie'
        });
    }
});

/**
 * POST /api/v1/clinica/ferie/:id/reject
 * Reject ferie/assenza request
 */
router.post('/:id/reject', ...approveAccess, async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const userId = req.person.id;
        const { id } = req.params;
        const { note } = req.body;

        const ferieAssenza = await FerieAssenzaService.reject(id, userId, note, tenantId);

        res.json({
            success: true,
            data: ferieAssenza
        });
    } catch (error) {
        logger.error('POST /ferie/:id/reject error', {
            id: req.params.id,
            error: 'Operazione non riuscita',
            tenantId: req.person?.tenantId
        });
        res.status(500).json({
            success: false,
            message: 'Errore nel rifiuto ferie'
        });
    }
});

export default router;
