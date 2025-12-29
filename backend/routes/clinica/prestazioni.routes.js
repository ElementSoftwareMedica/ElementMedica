/**
 * Prestazioni Routes
 * CRUD operations for medical services/procedures
 * 
 * Base path: /api/v1/clinica/prestazioni
 * 
 * @module routes/clinica/prestazioni
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import middleware from '../../auth/middleware.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { CLINICAL_ENUMS, clinicalValidators } from '../../config/validation-clinical.js';
import { PrestazioneService } from '../../services/clinical/PrestazioneService.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { getBranchType, auditClinico } from './utils/clinica-utils.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// ============================================
// STATS
// ============================================

/**
 * @route GET /prestazioni/stats
 * @desc Statistiche prestazioni (conteggi per tipo)
 * @access Authenticated + VIEW_PRESTAZIONI
 */
router.get('/stats',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'read'),
    auditClinico('stats_prestazioni'),
    async (req, res) => {
        const prisma = (await import('@prisma/client')).PrismaClient ?
            new (await import('@prisma/client')).PrismaClient() :
            (await import('../../config/prisma.js')).default;

        try {
            const tenantId = getEffectiveTenantId(req);

            const [total, active, byTipoRaw] = await Promise.all([
                prisma.prestazione.count({
                    where: { tenantId, deletedAt: null }
                }),
                prisma.prestazione.count({
                    where: { tenantId, deletedAt: null, attivo: true }
                }),
                prisma.prestazione.groupBy({
                    by: ['tipo'],
                    where: { tenantId, deletedAt: null },
                    _count: { id: true }
                })
            ]);

            const byTipo = {};
            for (const item of byTipoRaw) {
                byTipo[item.tipo] = item._count.id;
            }

            res.json({
                success: true,
                data: { total, active, byTipo }
            });
        } catch (error) {
            logger.error('Failed to get prestazioni stats', {
                component: 'prestazioni-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle statistiche prestazioni',
                message: error.message
            });
        }
    }
);

// ============================================
// TIPI
// ============================================

/**
 * @route GET /prestazioni/tipi
 * @desc Lista tipi prestazione disponibili
 * @access Authenticated
 */
router.get('/tipi',
    authenticateToken(),
    async (req, res) => {
        try {
            const tipi = await PrestazioneService.getTipi();

            res.json({
                success: true,
                data: tipi
            });
        } catch (error) {
            logger.error('Failed to get prestazioni tipi', {
                component: 'prestazioni-routes',
                error: error.message
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei tipi prestazione',
                message: error.message
            });
        }
    }
);

// ============================================
// CRUD
// ============================================

/**
 * @route GET /prestazioni
 * @desc Lista prestazioni con filtri e paginazione
 * @access Authenticated + VIEW_PRESTAZIONI
 */
router.get('/',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'read'),
    clinicalValidators.prestazione.query,
    auditClinico('list_prestazioni'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, tipo, attivo } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit)
            };
            if (search) options.search = search;
            if (tipo) options.tipo = tipo;
            if (attivo !== undefined) {
                options.attivo = typeof attivo === 'boolean' ? attivo : attivo === 'true';
            }

            const prestazioni = await PrestazioneService.getAll(tenantId, options, getBranchType(req));

            res.json({
                success: true,
                data: prestazioni.data,
                pagination: prestazioni.pagination
            });
        } catch (error) {
            logger.error('Failed to list prestazioni', {
                component: 'prestazioni-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle prestazioni',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /prestazioni
 * @desc Crea nuova prestazione
 * @access Authenticated + CREATE_PRESTAZIONI
 */
router.post('/',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'create'),
    clinicalValidators.prestazione.create,
    auditClinico('create_prestazione'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const prestazione = await PrestazioneService.create({
                ...req.body,
                createdBy
            }, tenantId, getBranchType(req));

            res.status(201).json({
                success: true,
                data: prestazione,
                message: 'Prestazione creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create prestazione', {
                component: 'prestazioni-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    error: 'Prestazione già esistente',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della prestazione',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /prestazioni/:id
 * @desc Dettaglio prestazione
 * @access Authenticated + VIEW_PRESTAZIONI
 */
router.get('/:id',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'read'),
    clinicalValidators.prestazione.id,
    auditClinico('view_prestazione'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const prestazione = await PrestazioneService.getById(id, tenantId);

            res.json({
                success: true,
                data: prestazione
            });
        } catch (error) {
            logger.error('Failed to get prestazione', {
                component: 'prestazioni-routes',
                error: error.message,
                prestazioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Prestazione not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Prestazione non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della prestazione',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /prestazioni/:id
 * @desc Aggiorna prestazione
 * @access Authenticated + UPDATE_PRESTAZIONI
 */
router.put('/:id',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'update'),
    clinicalValidators.prestazione.id,
    clinicalValidators.prestazione.update,
    auditClinico('update_prestazione'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const prestazione = await PrestazioneService.update(id, req.body, tenantId);

            res.json({
                success: true,
                data: prestazione,
                message: 'Prestazione aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update prestazione', {
                component: 'prestazioni-routes',
                error: error.message,
                prestazioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Prestazione not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Prestazione non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento della prestazione',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /prestazioni/:id
 * @desc Elimina prestazione (soft delete)
 * @access Authenticated + DELETE_PRESTAZIONI
 */
router.delete('/:id',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'delete'),
    clinicalValidators.prestazione.id,
    auditClinico('delete_prestazione'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await PrestazioneService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Prestazione eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete prestazione', {
                component: 'prestazioni-routes',
                error: error.message,
                prestazioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Prestazione not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Prestazione non trovata'
                });
            }

            if (error.message.includes('in use')) {
                return res.status(409).json({
                    success: false,
                    error: 'Impossibile eliminare la prestazione',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione della prestazione',
                message: error.message
            });
        }
    }
);

// ============================================
// TIPO FILTER
// ============================================

/**
 * @route GET /prestazioni/tipo/:tipo
 * @desc Lista prestazioni per tipo
 * @access Authenticated + VIEW_PRESTAZIONI
 */
router.get('/tipo/:tipo',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'read'),
    auditClinico('list_prestazioni_by_tipo'),
    async (req, res) => {
        try {
            const { tipo } = req.params;
            const tenantId = getEffectiveTenantId(req);

            if (!CLINICAL_ENUMS.TipoPrestazione.includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    error: 'Tipo prestazione non valido',
                    validTypes: CLINICAL_ENUMS.TipoPrestazione
                });
            }

            const prestazioni = await PrestazioneService.getByTipo(tenantId, tipo);

            res.json({
                success: true,
                data: prestazioni,
                tipo
            });
        } catch (error) {
            logger.error('Failed to list prestazioni by tipo', {
                component: 'prestazioni-routes',
                error: error.message,
                tipo: req.params.tipo,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle prestazioni',
                message: error.message
            });
        }
    }
);

// ============================================
// MEDICI RELATIONS
// ============================================

/**
 * @route GET /prestazioni/:id/medici
 * @desc Lista medici abilitati per una prestazione
 * @access Authenticated + VIEW_PRESTAZIONI
 */
router.get('/:id/medici',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_medici_prestazione'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const medici = await PrestazioneService.getMediciAbilitati(id, tenantId);

            res.json({
                success: true,
                data: medici,
                count: medici.length,
                prestazioneId: id
            });
        } catch (error) {
            logger.error('Failed to get medici for prestazione', {
                component: 'prestazioni-routes',
                error: error.message,
                prestazioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei medici',
                message: error.message
            });
        }
    }
);

export default router;
