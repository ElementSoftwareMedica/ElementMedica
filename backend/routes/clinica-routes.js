/**
 * Clinical Routes - Poliambulatorio API
 * RESTful API endpoints for ElementMedica clinical module
 * 
 * Base path: /api/v1/clinica
 * 
 * @module routes/clinica-routes
 * @version 1.0.0
 * @updated Project 45 - Added branch-aware support
 */

import express from 'express';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import middleware from '../auth/middleware.js';
import { checkAdvancedPermission } from '../middleware/advanced-permissions.js';
import { clinicalValidators, CLINICAL_ENUMS } from '../config/validation-clinical.js';
import { createUploadConfig, multerErrorHandler, getFileInfo } from '../config/multer.js';
import fs from 'fs/promises';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { BRANCH_TYPES } from '../utils/branchHelper.js';
import PersonTenantAccessService from '../services/PersonTenantAccessService.js';
import {
    PoliambulatorioService,
    AmbulatorioService,
    OrarioAmbulatorioService,
    AppuntamentoService,
    PrestazioneService,
    StrumentoService,
    ListinoPrezzoService,
    ConvenzioneService,
    ScontoClinicoService,
    SlotDisponibilitaService,
    VisitaService,
    RefertoService,
    TemplateCampoVisitaService,
    DocumentoClinicoService,
    FatturaSanitariaService,
    SedePoliambulatorioService,
    ManutenzioneStrumentoService,
    TariffarioService,
    OffertaBundleService,
    TariffarioMedicoService
} from '../services/clinical/index.js';
import RiconoscimentoConvenzioneService from '../services/clinical/RiconoscimentoConvenzioneService.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;
const personTenantAccessService = new PersonTenantAccessService();

// ============================================
// PROJECT 45: Branch Type Helper
// ============================================

/**
 * Estrae branchType dalla request
 * Le route cliniche sono tutte MEDICA per default
 * 
 * @param {Object} req - Express request
 * @returns {string} Branch type (default: MEDICA)
 */
const getBranchType = (req) => {
    // Le route cliniche sono sempre MEDICA
    return req.branchType || BRANCH_TYPES.MEDICA;
};

// ============================================
// MIDDLEWARE: Clinical Audit Logger
// ============================================

/**
 * Middleware per audit logging delle operazioni cliniche
 * Log strutturato per compliance GDPR e tracciabilità
 */
const auditClinico = (azione) => {
    return (req, res, next) => {
        const startTime = Date.now();

        // Cattura risposta per logging
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            const duration = Date.now() - startTime;
            const success = res.statusCode >= 200 && res.statusCode < 300;

            logger.info('Audit Clinico', {
                component: 'clinica-routes',
                action: azione,
                method: req.method,
                path: req.originalUrl,
                userId: req.person?.id,
                tenantId: getEffectiveTenantId(req),
                resourceId: req.params.id || data?.data?.id,
                statusCode: res.statusCode,
                success,
                duration: `${duration}ms`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return originalJson(data);
        };

        next();
    };
};

// ============================================
// HEALTH CHECK
// ============================================

/**
 * @route GET /api/v1/clinica/health
 * @desc Health check per il modulo clinico
 * @access Public
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        module: 'clinica',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        enums: Object.keys(CLINICAL_ENUMS)
    });
});

// ============================================
// ENUMS & CONFIG
// ============================================

/**
 * @route GET /api/v1/clinica/enums
 * @desc Restituisce tutti gli enum del modulo clinico
 * @access Authenticated
 */
router.get('/enums', authenticateToken(), (req, res) => {
    res.json({
        success: true,
        data: CLINICAL_ENUMS
    });
});

// ============================================
// POLIAMBULATORIO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/poliambulatori
 * @desc Lista tutti i poliambulatori del tenant
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/poliambulatori',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'read'),
    clinicalValidators.poliambulatorio.query,
    auditClinico('list_poliambulatori'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person?.id;
            const globalRole = req.person?.globalRole;

            // Get accessible tenants for this user (no bypass - respects PersonTenantAccess)
            const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);
            const accessibleTenantIds = accessibleTenants.map(t => t.id);

            // Debug logging
            logger.info('Poliambulatori query debug', {
                component: 'clinica-routes',
                action: 'list_poliambulatori_debug',
                personId,
                personTenantId: req.person?.tenantId,
                brandTenantId: req.brandTenantId,
                effectiveTenantId: tenantId,
                globalRole,
                accessibleTenantIds,
                queryTenantIds: req.query.tenantIds,
                allTenantsQuery: req.query.allTenants,
                frontendId: req.frontendId || req.headers['x-frontend-id']
            });

            const result = await PoliambulatorioService.getAll(tenantId, {
                ...req.query,
                showAllTenants: req.query.allTenants === 'true',
                accessibleTenantIds // Pass accessible tenant IDs to service
            });

            // Log result summary
            logger.info('Poliambulatori query result', {
                component: 'clinica-routes',
                action: 'list_poliambulatori_result',
                count: result.data?.length || 0,
                total: result.pagination?.total || 0,
                tenantId,
                accessibleTenantIds
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list poliambulatori', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei poliambulatori',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/poliambulatori/:id
 * @desc Ottiene un poliambulatorio per ID
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/poliambulatori/:id',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_poliambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const poliambulatorio = await PoliambulatorioService.getById(id, tenantId);

            if (!poliambulatorio) {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
                });
            }

            res.json({
                success: true,
                data: poliambulatorio
            });
        } catch (error) {
            logger.error('Failed to get poliambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del poliambulatorio',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/poliambulatori
 * @desc Crea un nuovo poliambulatorio
 * @access Authenticated + CREATE_POLIAMBULATORIO
 */
router.post('/poliambulatori',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'write'),
    clinicalValidators.poliambulatorio.create,
    auditClinico('create_poliambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const poliambulatorio = await PoliambulatorioService.create(req.body, tenantId);

            res.status(201).json({
                success: true,
                data: poliambulatorio,
                message: 'Poliambulatorio creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create poliambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            // Handle unique constraint violation
            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'Codice poliambulatorio già esistente',
                    message: 'Un poliambulatorio con questo codice esiste già per il tenant'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del poliambulatorio',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/poliambulatori/:id
 * @desc Aggiorna un poliambulatorio
 * @access Authenticated + EDIT_POLIAMBULATORIO
 */
router.put('/poliambulatori/:id',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'write'),
    clinicalValidators.params.id,
    clinicalValidators.poliambulatorio.update,
    auditClinico('update_poliambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const poliambulatorio = await PoliambulatorioService.update(id, req.body, tenantId);

            res.json({
                success: true,
                data: poliambulatorio,
                message: 'Poliambulatorio aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update poliambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Poliambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del poliambulatorio',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/poliambulatori/:id
 * @desc Elimina (soft delete) un poliambulatorio
 * @access Authenticated + DELETE_POLIAMBULATORIO
 */
router.delete('/poliambulatori/:id',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_poliambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await PoliambulatorioService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Poliambulatorio eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete poliambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Poliambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del poliambulatorio',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/poliambulatori/:id/direttore
 * @desc Assegna un direttore sanitario al poliambulatorio
 * @access Authenticated + MANAGE_POLIAMBULATORIO
 */
router.post('/poliambulatori/:id/direttore',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'write'),
    clinicalValidators.params.id,
    clinicalValidators.poliambulatorio.assignDirettore,
    auditClinico('assign_direttore_sanitario'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { direttoreSanitarioId } = req.body;
            const tenantId = getEffectiveTenantId(req);

            const poliambulatorio = await PoliambulatorioService.assignDirettoreSanitario(id, direttoreSanitarioId, tenantId);

            res.json({
                success: true,
                data: poliambulatorio,
                message: 'Direttore sanitario assegnato con successo'
            });
        } catch (error) {
            logger.error('Failed to assign direttore sanitario', {
                component: 'clinica-routes',
                error: error.message,
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Poliambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
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
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/poliambulatori/:id/statistics
 * @desc Ottiene statistiche del poliambulatorio
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/poliambulatori/:id/statistics',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_poliambulatorio_statistics'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const statistics = await PoliambulatorioService.getStatistics(id, tenantId);

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Failed to get poliambulatorio statistics', {
                component: 'clinica-routes',
                error: error.message,
                poliambulatorioId: req.params.id,
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

// ============================================
// SEDI POLIAMBULATORIO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/sedi
 * @desc Lista tutte le sedi del tenant
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/sedi',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'read'),
    auditClinico('list_all_sedi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { search, isAttiva, poliambulatorioId } = req.query;

            const sedi = await prisma.sedePoliambulatorio.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    ...(isAttiva !== undefined && { isAttiva: isAttiva === 'true' }),
                    ...(poliambulatorioId && { poliambulatorioId }),
                    ...(search && {
                        OR: [
                            { nome: { contains: search, mode: 'insensitive' } },
                            { codice: { contains: search, mode: 'insensitive' } },
                            { citta: { contains: search, mode: 'insensitive' } },
                            { indirizzo: { contains: search, mode: 'insensitive' } }
                        ]
                    })
                },
                include: {
                    poliambulatorio: {
                        select: { id: true, nome: true, codice: true }
                    },
                    direttoreSanitario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            registerCode: true,
                            specialties: true
                        }
                    },
                    _count: {
                        select: { ambulatori: true }
                    }
                },
                orderBy: [
                    { isPrincipale: 'desc' },
                    { nome: 'asc' }
                ]
            });

            res.json({
                success: true,
                data: sedi
            });
        } catch (error) {
            logger.error('Failed to get all sedi', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle sedi',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/sedi/:sedeId
 * @desc Ottieni una sede specifica
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/sedi/:sedeId',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'read'),
    auditClinico('get_sede'),
    async (req, res) => {
        try {
            const { sedeId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const sede = await prisma.sedePoliambulatorio.findFirst({
                where: {
                    id: sedeId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    poliambulatorio: {
                        select: { id: true, nome: true, codice: true }
                    },
                    direttoreSanitario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            registerCode: true,
                            specialties: true
                        }
                    },
                    ambulatori: {
                        where: { deletedAt: null },
                        orderBy: { nome: 'asc' }
                    },
                    _count: {
                        select: { ambulatori: true }
                    }
                }
            });

            if (!sede) {
                return res.status(404).json({
                    success: false,
                    error: 'Sede not found'
                });
            }

            res.json({
                success: true,
                data: sede
            });
        } catch (error) {
            logger.error('Failed to get sede', {
                component: 'clinica-routes',
                error: error.message,
                sedeId: req.params.sedeId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della sede',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/poliambulatori/:id/sedi
 * @desc Lista tutte le sedi di un poliambulatorio
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/poliambulatori/:id/sedi',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'read'),
    clinicalValidators.params.id,
    auditClinico('list_sedi_poliambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const sedi = await PoliambulatorioService.getSedi(id, tenantId);

            res.json({
                success: true,
                data: sedi
            });
        } catch (error) {
            logger.error('Failed to get sedi', {
                component: 'clinica-routes',
                error: error.message,
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle sedi',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/poliambulatori/:id/sedi
 * @desc Crea una nuova sede per un poliambulatorio
 * @access Authenticated + CREATE_POLIAMBULATORIO
 */
router.post('/poliambulatori/:id/sedi',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'write'),
    clinicalValidators.params.id,
    auditClinico('create_sede_poliambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const sede = await PoliambulatorioService.createSede(id, req.body, tenantId);

            res.status(201).json({
                success: true,
                data: sede,
                message: 'Sede creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create sede', {
                component: 'clinica-routes',
                error: error.message,
                poliambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Poliambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
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
                error: 'Errore nella creazione della sede',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/sedi/:sedeId
 * @desc Aggiorna una sede
 * @access Authenticated + EDIT_POLIAMBULATORIO
 */
router.put('/sedi/:sedeId',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'write'),
    auditClinico('update_sede_poliambulatorio'),
    async (req, res) => {
        try {
            const { sedeId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const sede = await PoliambulatorioService.updateSede(sedeId, req.body, tenantId);

            res.json({
                success: true,
                data: sede,
                message: 'Sede aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update sede', {
                component: 'clinica-routes',
                error: error.message,
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
                error: 'Errore nell\'aggiornamento della sede',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/sedi/:sedeId
 * @desc Elimina (soft delete) una sede
 * @access Authenticated + DELETE_POLIAMBULATORIO
 */
router.delete('/sedi/:sedeId',
    authenticateToken(),
    checkAdvancedPermission('poliambulatorio', 'delete'),
    auditClinico('delete_sede_poliambulatorio'),
    async (req, res) => {
        try {
            const { sedeId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await PoliambulatorioService.deleteSede(sedeId, tenantId);

            res.json({
                success: true,
                message: 'Sede eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete sede', {
                component: 'clinica-routes',
                error: error.message,
                sedeId: req.params.sedeId,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Sede not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Sede non trovata'
                });
            }

            if (error.message.includes('ambulatori')) {
                return res.status(409).json({
                    success: false,
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione della sede',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/sedi/:sedeId/direttore
 * @desc Assegna un direttore sanitario a una sede
 * @access Authenticated + MANAGE_POLIAMBULATORIO
 */
router.post('/sedi/:sedeId/direttore',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
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
                message: error.message
            });
        }
    }
);

// ============================================
// AMBULATORIO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/ambulatori
 * @desc Lista tutti gli ambulatori del tenant
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/ambulatori',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.ambulatorio.query,
    auditClinico('list_ambulatori'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await AmbulatorioService.getAll(tenantId, req.query);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list ambulatori', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli ambulatori',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/ambulatori/:id
 * @desc Ottiene un ambulatorio per ID
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/ambulatori/:id',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_ambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const ambulatorio = await AmbulatorioService.getById(id, tenantId);

            if (!ambulatorio) {
                return res.status(404).json({
                    success: false,
                    error: 'Ambulatorio non trovato'
                });
            }

            res.json({
                success: true,
                data: ambulatorio
            });
        } catch (error) {
            logger.error('Failed to get ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dell\'ambulatorio',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/ambulatori
 * @desc Crea un nuovo ambulatorio
 * @access Authenticated + CREATE_AMBULATORI
 */
router.post('/ambulatori',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'write'),
    clinicalValidators.ambulatorio.create,
    auditClinico('create_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const ambulatorio = await AmbulatorioService.create(req.body, tenantId);

            res.status(201).json({
                success: true,
                data: ambulatorio,
                message: 'Ambulatorio creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Poliambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Poliambulatorio non trovato'
                });
            }

            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'Codice ambulatorio già esistente',
                    message: 'Un ambulatorio con questo codice esiste già per il poliambulatorio'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione dell\'ambulatorio',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/ambulatori/:id
 * @desc Aggiorna un ambulatorio
 * @access Authenticated + EDIT_AMBULATORI
 */
router.put('/ambulatori/:id',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'write'),
    clinicalValidators.params.id,
    clinicalValidators.ambulatorio.update,
    auditClinico('update_ambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const ambulatorio = await AmbulatorioService.update(id, req.body, tenantId);

            res.json({
                success: true,
                data: ambulatorio,
                message: 'Ambulatorio aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Ambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Ambulatorio non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento dell\'ambulatorio',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/ambulatori/:id
 * @desc Elimina (soft delete) un ambulatorio
 * @access Authenticated + DELETE_AMBULATORI
 */
router.delete('/ambulatori/:id',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_ambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await AmbulatorioService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Ambulatorio eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Ambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Ambulatorio non trovato'
                });
            }

            if (error.message.includes('pending appointments')) {
                return res.status(409).json({
                    success: false,
                    error: 'Impossibile eliminare l\'ambulatorio',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione dell\'ambulatorio',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/poliambulatori/:poliambulatorioId/ambulatori
 * @desc Lista ambulatori di un poliambulatorio
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/poliambulatori/:poliambulatorioId/ambulatori',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.params.poliambulatorioId,
    auditClinico('list_ambulatori_by_poliambulatorio'),
    async (req, res) => {
        try {
            const { poliambulatorioId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const ambulatori = await AmbulatorioService.getByPoliambulatorio(poliambulatorioId, tenantId);

            res.json({
                success: true,
                data: ambulatori
            });
        } catch (error) {
            logger.error('Failed to list ambulatori by poliambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                poliambulatorioId: req.params.poliambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli ambulatori',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/ambulatori/:id/prestazioni
 * @desc Assegna una prestazione all'ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.post('/ambulatori/:id/prestazioni',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'write'),
    clinicalValidators.params.id,
    clinicalValidators.ambulatorio.assignPrestazione,
    auditClinico('assign_prestazione_to_ambulatorio'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { prestazioneId } = req.body;
            const tenantId = getEffectiveTenantId(req);

            const assignment = await AmbulatorioService.assignPrestazione(id, prestazioneId, tenantId);

            res.json({
                success: true,
                data: assignment,
                message: 'Prestazione assegnata con successo'
            });
        } catch (error) {
            logger.error('Failed to assign prestazione', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'assegnazione della prestazione',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/ambulatori/:id/prestazioni/:prestazioneId
 * @desc Rimuove una prestazione dall'ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.delete('/ambulatori/:id/prestazioni/:prestazioneId',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'write'),
    auditClinico('remove_prestazione_from_ambulatorio'),
    async (req, res) => {
        try {
            const { id, prestazioneId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await AmbulatorioService.removePrestazione(id, prestazioneId, tenantId);

            res.json({
                success: true,
                message: 'Prestazione rimossa con successo'
            });
        } catch (error) {
            logger.error('Failed to remove prestazione', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.id,
                prestazioneId: req.params.prestazioneId,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Assignment not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Associazione non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella rimozione della prestazione',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/ambulatori/:id/availability/:date
 * @desc Ottiene disponibilità dell'ambulatorio per una data
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/ambulatori/:id/availability/:date',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_ambulatorio_availability'),
    async (req, res) => {
        try {
            const { id, date } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const availability = await AmbulatorioService.getAvailability(id, date, tenantId);

            res.json({
                success: true,
                data: availability
            });
        } catch (error) {
            logger.error('Failed to get ambulatorio availability', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.id,
                date: req.params.date,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della disponibilità',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/ambulatori/specializations
 * @desc Ottiene lista distinta delle specializzazioni
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/ambulatori/specializations',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    auditClinico('get_specializations'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const specializations = await AmbulatorioService.getSpecializations(tenantId);

            res.json({
                success: true,
                data: specializations
            });
        } catch (error) {
            logger.error('Failed to get specializations', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle specializzazioni',
                message: error.message
            });
        }
    }
);

// ============================================
// APPUNTAMENTO ROUTES (Basic - Future expansion)
// ============================================

/**
 * @route GET /api/v1/clinica/appuntamenti/today
 * @desc Lista appuntamenti di oggi
 * @access Authenticated + VIEW_APPOINTMENTS
 */
router.get('/appuntamenti/today',
    authenticateToken(),
    checkAdvancedPermission('appuntamenti', 'read'),
    auditClinico('list_appuntamenti_today'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // TODO: Implementare con AppuntamentoService quando disponibile
            // Per ora restituiamo array vuoto con struttura corretta
            res.json({
                success: true,
                data: [],
                date: today.toISOString().split('T')[0],
                count: 0
            });
        } catch (error) {
            logger.error('Failed to list today appuntamenti', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli appuntamenti di oggi',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/appuntamenti
 * @desc Lista appuntamenti
 * @access Authenticated + VIEW_APPOINTMENTS
 * @note Implementazione base - espandere con AppuntamentoService
 */
router.get('/appuntamenti',
    authenticateToken(),
    checkAdvancedPermission('appuntamenti', 'read'),
    clinicalValidators.appuntamento.query,
    auditClinico('list_appuntamenti'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            // TODO: Implementare con AppuntamentoService.getAll()
            res.json({
                success: true,
                data: [],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0
                },
                message: 'Endpoint pronto - implementazione completa in corso'
            });
        } catch (error) {
            logger.error('Failed to list appuntamenti', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli appuntamenti',
                message: error.message
            });
        }
    }
);

// ============================================
// PRESTAZIONI ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/prestazioni/stats
 * @desc Statistiche prestazioni (conteggi per tipo)
 * @access Authenticated + VIEW_PRESTAZIONI
 */
router.get('/prestazioni/stats',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'read'),
    auditClinico('stats_prestazioni'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            // Get total count and active count
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

            // Convert groupBy result to object
            const byTipo = {};
            for (const item of byTipoRaw) {
                byTipo[item.tipo] = item._count.id;
            }

            res.json({
                success: true,
                data: {
                    total,
                    active,
                    byTipo
                }
            });
        } catch (error) {
            logger.error('Failed to get prestazioni stats', {
                component: 'clinica-routes',
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

/**
 * @route GET /api/v1/clinica/prestazioni
 * @desc Lista prestazioni con filtri e paginazione
 * @access Authenticated + VIEW_PRESTAZIONI
 */
router.get('/prestazioni',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'read'),
    clinicalValidators.prestazione.query,
    auditClinico('list_prestazioni'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, tipo, ambulatorioId, attivo } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit)
            };
            if (search) options.search = search;
            if (tipo) options.tipo = tipo;
            // Joi con convert:true già converte "true"/"false" in boolean
            // quindi attivo può essere già un boolean o ancora una stringa (in caso di test diretti)
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
                component: 'clinica-routes',
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
 * @route POST /api/v1/clinica/prestazioni
 * @desc Crea nuova prestazione
 * @access Authenticated + CREATE_PRESTAZIONI
 */
router.post('/prestazioni',
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
                component: 'clinica-routes',
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
 * @route GET /api/v1/clinica/prestazioni/:id
 * @desc Dettaglio prestazione
 * @access Authenticated + VIEW_PRESTAZIONI
 */
router.get('/prestazioni/:id',
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
                component: 'clinica-routes',
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
 * @route PUT /api/v1/clinica/prestazioni/:id
 * @desc Aggiorna prestazione
 * @access Authenticated + UPDATE_PRESTAZIONI
 */
router.put('/prestazioni/:id',
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
                component: 'clinica-routes',
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
 * @route DELETE /api/v1/clinica/prestazioni/:id
 * @desc Elimina prestazione (soft delete)
 * @access Authenticated + DELETE_PRESTAZIONI
 */
router.delete('/prestazioni/:id',
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
                component: 'clinica-routes',
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

/**
 * @route GET /api/v1/clinica/prestazioni/tipo/:tipo
 * @desc Lista prestazioni per tipo
 * @access Authenticated + VIEW_PRESTAZIONI
 */
router.get('/prestazioni/tipo/:tipo',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'read'),
    auditClinico('list_prestazioni_by_tipo'),
    async (req, res) => {
        try {
            const { tipo } = req.params;
            const tenantId = getEffectiveTenantId(req);

            // Valida il tipo
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
                component: 'clinica-routes',
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

/**
 * @route GET /api/v1/clinica/prestazioni/tipi
 * @desc Lista tipi prestazione disponibili
 * @access Authenticated
 */
router.get('/prestazioni/tipi',
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
                component: 'clinica-routes',
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

/**
 * @route GET /api/v1/clinica/prestazioni/:id/medici
 * @desc Lista medici abilitati per una prestazione
 * @access Authenticated + VIEW_PRESTAZIONI
 */
router.get('/prestazioni/:id/medici',
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
                component: 'clinica-routes',
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

/**
 * @route GET /api/v1/clinica/medici/:medicoId/prestazioni
 * @desc Lista prestazioni che un medico può eseguire
 * @access Authenticated
 */
router.get('/medici/:medicoId/prestazioni',
    authenticateToken(),
    auditClinico('get_prestazioni_medico'),
    async (req, res) => {
        try {
            const { medicoId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { tipo, attivo } = req.query;

            const options = {};
            if (tipo) options.tipo = tipo;
            if (attivo !== undefined) options.attivo = attivo === 'true';

            const prestazioni = await PrestazioneService.getPrestazioniPerMedico(medicoId, tenantId, options);

            res.json({
                success: true,
                data: prestazioni,
                count: prestazioni.length,
                medicoId
            });
        } catch (error) {
            logger.error('Failed to get prestazioni for medico', {
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.medicoId,
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
 * @route GET /api/v1/clinica/medici/:medicoId/prestazioni/:prestazioneId/check
 * @desc Verifica se un medico può eseguire una prestazione
 * @access Authenticated
 */
router.get('/medici/:medicoId/prestazioni/:prestazioneId/check',
    authenticateToken(),
    auditClinico('check_medico_prestazione'),
    async (req, res) => {
        try {
            const { medicoId, prestazioneId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const result = await PrestazioneService.canMedicoPerformPrestazione(medicoId, prestazioneId, tenantId);

            res.json({
                success: true,
                data: result,
                medicoId,
                prestazioneId
            });
        } catch (error) {
            logger.error('Failed to check medico can perform prestazione', {
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.medicoId,
                prestazioneId: req.params.prestazioneId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella verifica',
                message: error.message
            });
        }
    }
);

// ============================================
// MEDICI ROUTES (CRUD Completo)
// ============================================

/**
 * @route GET /api/v1/clinica/medici
 * @desc Lista medici con filtri e paginazione
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/medici',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    auditClinico('list_medici'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, specializzazione, attivo } = req.query;

            // Query medici (Person con ruolo MEDICO)
            const where = {
                tenantId,
                deletedAt: null,
                personRoles: {
                    some: {
                        roleType: 'MEDICO',
                        isActive: true,
                        deletedAt: null
                    }
                }
            };

            if (search) {
                where.OR = [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { taxCode: { contains: search, mode: 'insensitive' } }
                ];
            }

            if (attivo !== undefined) {
                where.status = attivo === 'true' ? 'ACTIVE' : 'INACTIVE';
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const [medici, total] = await Promise.all([
                prisma.person.findMany({
                    where,
                    skip: offset,
                    take: parseInt(limit),
                    include: {
                        personRoles: {
                            where: { deletedAt: null }
                        }
                    },
                    orderBy: { lastName: 'asc' }
                }),
                prisma.person.count({ where })
            ]);

            res.json({
                success: true,
                data: medici,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            logger.error('Failed to list medici', {
                component: 'clinica-routes',
                error: error.message,
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

/**
 * @route GET /api/v1/clinica/medici/stats
 * @desc Statistiche medici
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/medici/stats',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    auditClinico('stats_medici'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const [total, active, inactive] = await Promise.all([
                prisma.person.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        personRoles: { some: { roleType: 'MEDICO', deletedAt: null } }
                    }
                }),
                prisma.person.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        status: 'ACTIVE',
                        personRoles: { some: { roleType: 'MEDICO', isActive: true, deletedAt: null } }
                    }
                }),
                prisma.person.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        OR: [
                            { status: 'INACTIVE' },
                            { personRoles: { some: { roleType: 'MEDICO', isActive: false, deletedAt: null } } }
                        ]
                    }
                })
            ]);

            res.json({
                success: true,
                data: {
                    total,
                    active,
                    inactive,
                    bySpecializzazione: {}
                }
            });
        } catch (error) {
            logger.error('Failed to get medici stats', {
                component: 'clinica-routes',
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
 * @route GET /api/v1/clinica/medici/:id
 * @desc Dettaglio medico
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/medici/:id',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_medico'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const medico = await prisma.person.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                    personRoles: {
                        some: {
                            roleType: 'MEDICO',
                            deletedAt: null
                        }
                    }
                },
                include: {
                    personRoles: { where: { deletedAt: null } },
                    abilitazioni: {
                        where: { deletedAt: null, attivo: true },
                        include: { prestazione: true }
                    }
                }
            });

            if (!medico) {
                return res.status(404).json({
                    success: false,
                    error: 'Medico non trovato'
                });
            }

            res.json({
                success: true,
                data: medico
            });
        } catch (error) {
            logger.error('Failed to get medico', {
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del medico',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/medici
 * @desc Crea nuovo medico con account utente
 * @access Authenticated + CREATE_MEDICI
 */
router.post('/medici',
    authenticateToken(),
    checkAdvancedPermission('medici', 'create'),
    auditClinico('create_medico'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                firstName, lastName, email, phone, taxCode,
                // New fields
                birthDate, pec, residenceAddress, residenceCity, province, postalCode,
                iban, profileImage, notes, specialties,
                alboRegione, registerCode, registerCode2,
                shortDescription, fullDescription,
                // Legacy fields (backward compatibility)
                specializzazione, numeroIscrizione,
                createAccount = true,
                password = 'Password1!',
                // Prestazioni abilitate
                prestazioniIds
            } = req.body;

            // Validazione campi obbligatori
            if (!firstName || !lastName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome e cognome sono obbligatori'
                });
            }

            // Validazione codice fiscale
            if (!taxCode || taxCode.length !== 16) {
                return res.status(400).json({
                    success: false,
                    error: 'Il codice fiscale è obbligatorio e deve essere di 16 caratteri'
                });
            }

            // Check for existing person with same taxCode (the only unique identifier)
            const existingPerson = await prisma.person.findFirst({
                where: {
                    taxCode: taxCode.toUpperCase(),
                    deletedAt: null
                },
                include: {
                    personRoles: { where: { deletedAt: null } }
                }
            });

            if (existingPerson) {
                // Person exists - check if same tenant or cross-tenant
                const isSameTenant = existingPerson.tenantId === tenantId;
                const hasMedicoRoleThisTenant = existingPerson.personRoles.some(
                    r => r.roleType === 'MEDICO' && r.isActive && r.tenantId === tenantId
                );

                // Se già medico nello stesso tenant, errore
                if (hasMedicoRoleThisTenant) {
                    return res.status(409).json({
                        success: false,
                        error: 'Questo medico è già registrato per questa organizzazione',
                        existingPersonId: existingPerson.id,
                        existingPersonName: `${existingPerson.firstName} ${existingPerson.lastName}`,
                        isSameTenant: true,
                        hasMedicoRoleThisTenant: true,
                        canEnable: false
                    });
                }

                // Person exists but NOT medico in this tenant - AUTO-ENABLE as medico
                // Update person fields (only if provided, keep existing if empty)
                const updateData = {};
                if (firstName) updateData.firstName = firstName;
                if (lastName) updateData.lastName = lastName;
                if (email) updateData.email = email;
                if (phone) updateData.phone = phone;
                if (birthDate) updateData.birthDate = new Date(birthDate);
                if (pec) updateData.pec = pec;
                if (residenceAddress) updateData.residenceAddress = residenceAddress;
                if (residenceCity) updateData.residenceCity = residenceCity;
                if (province) updateData.province = province;
                if (postalCode) updateData.postalCode = postalCode;
                if (iban) updateData.iban = iban?.toUpperCase();
                if (profileImage) updateData.profileImage = profileImage;
                if (notes) updateData.notes = notes;
                if (specialties && specialties.length > 0) updateData.specialties = specialties;
                if (registerCode) updateData.registerCode = registerCode;
                if (registerCode2) updateData.registerCode2 = registerCode2;
                if (shortDescription) updateData.shortDescription = shortDescription;
                if (fullDescription) updateData.fullDescription = fullDescription;
                if (alboRegione) {
                    updateData.preferences = {
                        ...(existingPerson.preferences || {}),
                        alboRegione
                    };
                }

                // Update person if there are fields to update
                if (Object.keys(updateData).length > 0) {
                    await prisma.person.update({
                        where: { id: existingPerson.id },
                        data: updateData
                    });
                }

                // Create MEDICO role for this tenant
                await prisma.personRole.create({
                    data: {
                        personId: existingPerson.id,
                        roleType: 'MEDICO',
                        isActive: true,
                        isPrimary: false,
                        tenantId
                    }
                });

                // Create account if requested and person doesn't have one
                if (createAccount && !existingPerson.password) {
                    const bcrypt = await import('bcryptjs');
                    const hashedPassword = await bcrypt.default.hash(password, 12);

                    // Generate username if not exists
                    if (!existingPerson.username) {
                        let baseUsername = `${existingPerson.firstName.toLowerCase()}.${existingPerson.lastName.toLowerCase()}`
                            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                            .replace(/\s+/g, '');
                        let username = baseUsername;
                        let counter = 0;

                        while (true) {
                            const existingUsername = await prisma.person.findUnique({ where: { username } });
                            if (!existingUsername) break;
                            counter++;
                            username = `${baseUsername}${counter}`;
                        }

                        await prisma.person.update({
                            where: { id: existingPerson.id },
                            data: { username, password: hashedPassword }
                        });
                    }
                }

                // Fetch updated person
                const updatedMedico = await prisma.person.findUnique({
                    where: { id: existingPerson.id },
                    include: {
                        personRoles: { where: { deletedAt: null } }
                    }
                });

                // Audit GDPR
                await prisma.gdprAuditLog.create({
                    data: {
                        personId: req.person?.id || existingPerson.id,
                        action: 'CREATE',
                        resourceType: 'PERSON_ROLE_MEDICO',
                        resourceId: existingPerson.id,
                        dataAccessed: {
                            roleType: 'MEDICO',
                            tenantId,
                            updatedFields: Object.keys(updateData),
                            crossTenantEnable: true
                        },
                        ipAddress: req.ip || req.connection?.remoteAddress,
                        tenantId
                    }
                });

                return res.status(201).json({
                    success: true,
                    data: updatedMedico,
                    message: `${existingPerson.firstName} ${existingPerson.lastName} è stato abilitato come medico per questa organizzazione`,
                    crossTenantEnabled: true,
                    credentials: (createAccount && !existingPerson.password) ? {
                        username: updatedMedico.username,
                        temporaryPassword: password,
                        note: 'La password deve essere cambiata al primo accesso'
                    } : null
                });
            }

            // Hash password
            const bcrypt = await import('bcryptjs');
            const hashedPassword = await bcrypt.default.hash(password, 12);

            // Genera username (nome.cognome con incremento per duplicati)
            let baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/\s+/g, '');
            let username = baseUsername;
            let counter = 0;

            while (true) {
                const existingUsername = await prisma.person.findUnique({ where: { username } });
                if (!existingUsername) break;
                counter++;
                username = `${baseUsername}${counter}`;
            }

            // Build notes JSON (for alboRegione legacy storage if not using direct fields)
            const notesData = notes || '';

            // Crea persona con ruolo MEDICO
            const medico = await prisma.person.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    taxCode: taxCode?.toUpperCase(),
                    birthDate: birthDate ? new Date(birthDate) : null,
                    pec,
                    residenceAddress,
                    residenceCity,
                    province,
                    postalCode,
                    iban: iban?.toUpperCase(),
                    profileImage,
                    notes: notesData,
                    // Professional fields
                    specialties: specialties || (specializzazione ? [specializzazione] : []),
                    registerCode: registerCode || numeroIscrizione,
                    registerCode2,
                    shortDescription,
                    fullDescription,
                    // Account
                    username: createAccount ? username : null,
                    password: createAccount ? hashedPassword : null,
                    status: 'ACTIVE',
                    tenantId,
                    // Store alboRegione in preferences
                    preferences: alboRegione ? { alboRegione } : {},
                    personRoles: {
                        create: {
                            roleType: 'MEDICO',
                            isActive: true,
                            isPrimary: true,
                            tenantId
                        }
                    }
                },
                include: {
                    personRoles: { where: { deletedAt: null } }
                }
            });

            // Audit GDPR
            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || medico.id,
                    action: 'CREATE',
                    resourceType: 'PERSON_MEDICO',
                    resourceId: medico.id,
                    dataAccessed: { firstName, lastName, email, roleType: 'MEDICO' },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            // Create abilitazioni (prestazioni abilitate) if provided
            if (prestazioniIds && prestazioniIds.length > 0) {
                await prisma.medicoAbilitato.createMany({
                    data: prestazioniIds.map(prestazioneId => ({
                        medicoId: medico.id,
                        prestazioneId,
                        tenantId,
                        attivo: true,
                        dataAbilitazione: new Date()
                    })),
                    skipDuplicates: true
                });
            }

            res.status(201).json({
                success: true,
                data: medico,
                message: 'Medico creato con successo',
                credentials: createAccount ? {
                    username,
                    temporaryPassword: password,
                    note: 'La password deve essere cambiata al primo accesso'
                } : null
            });
        } catch (error) {
            logger.error('Failed to create medico', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'Codice fiscale già esistente'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del medico',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/medici/enable
 * @desc Abilita una persona esistente come medico per questo tenant
 * @access Authenticated + CREATE_MEDICI
 */
router.post('/medici/enable',
    authenticateToken(),
    checkAdvancedPermission('medici', 'create'),
    auditClinico('enable_medico'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { personId, specialties, registerCode, registerCode2 } = req.body;

            if (!personId) {
                return res.status(400).json({
                    success: false,
                    error: 'personId è obbligatorio'
                });
            }

            // Verify person exists
            const person = await prisma.person.findFirst({
                where: { id: personId, deletedAt: null },
                include: {
                    personRoles: { where: { deletedAt: null } }
                }
            });

            if (!person) {
                return res.status(404).json({
                    success: false,
                    error: 'Persona non trovata'
                });
            }

            // Check if already has MEDICO role for this tenant
            const existingMedicoRole = person.personRoles.find(
                r => r.roleType === 'MEDICO' && r.tenantId === tenantId && r.isActive
            );

            if (existingMedicoRole) {
                return res.status(409).json({
                    success: false,
                    error: 'Questa persona è già abilitata come medico per questa organizzazione'
                });
            }

            // Create MEDICO role for this tenant
            const newRole = await prisma.personRole.create({
                data: {
                    personId: person.id,
                    roleType: 'MEDICO',
                    isActive: true,
                    isPrimary: false,
                    tenantId
                }
            });

            // Update person fields if provided
            const updateData = {};
            if (specialties && specialties.length > 0) {
                updateData.specialties = specialties;
            }
            if (registerCode) updateData.registerCode = registerCode;
            if (registerCode2) updateData.registerCode2 = registerCode2;

            if (Object.keys(updateData).length > 0) {
                await prisma.person.update({
                    where: { id: person.id },
                    data: updateData
                });
            }

            // Audit
            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || person.id,
                    action: 'CREATE',
                    resourceType: 'PERSON_ROLE_MEDICO',
                    resourceId: person.id,
                    dataAccessed: { roleType: 'MEDICO', tenantId },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            // Fetch updated person
            const updatedPerson = await prisma.person.findUnique({
                where: { id: person.id },
                include: {
                    personRoles: { where: { deletedAt: null } }
                }
            });

            res.status(201).json({
                success: true,
                data: updatedPerson,
                message: `${person.firstName} ${person.lastName} è stato abilitato come medico`
            });
        } catch (error) {
            logger.error('Failed to enable person as medico', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'abilitazione del medico',
                message: error.message
            });
        }
    }
);

// =====================================================
// PERSON DOCUMENTS (Progetto 44)
// =====================================================

/**
 * @route GET /api/v1/clinica/medici/:id/documents
 * @desc Ottiene tutti i documenti di un medico
 * @access Authenticated
 */
router.get('/medici/:id/documents',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { tipo, includeExpired } = req.query;

            // Build where clause
            const where = {
                personId: id,
                tenantId,
                deletedAt: null,
                isCurrentVersion: true
            };

            if (tipo) where.tipo = tipo;
            if (!includeExpired || includeExpired === 'false') {
                where.isExpired = false;
            }

            const documents = await prisma.personDocument.findMany({
                where,
                orderBy: [
                    { tipo: 'asc' },
                    { createdAt: 'desc' }
                ],
                include: {
                    uploader: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            res.json({
                success: true,
                data: documents
            });
        } catch (error) {
            logger.error('Failed to fetch person documents', {
                component: 'clinica-routes',
                error: error.message,
                personId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei documenti'
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/medici/:id/documents
 * @desc Carica un nuovo documento per un medico
 * @access Authenticated + UPDATE_MEDICI
 */
router.post('/medici/:id/documents',
    authenticateToken(),
    checkAdvancedPermission('medici', 'update'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const {
                tipo,
                titolo,
                descrizione,
                fileName,
                fileUrl,
                fileSize,
                mimeType,
                hashFile,
                dataDocumento,
                dataScadenza
            } = req.body;

            // Validate required fields
            if (!tipo || !titolo || !fileName || !fileUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Campi obbligatori mancanti: tipo, titolo, fileName, fileUrl'
                });
            }

            // Check if document of same type exists (for versioning)
            const existingDoc = await prisma.personDocument.findFirst({
                where: {
                    personId: id,
                    tenantId,
                    tipo,
                    isCurrentVersion: true,
                    deletedAt: null
                },
                orderBy: { version: 'desc' }
            });

            let newVersion = 1;
            let previousVersionId = null;

            if (existingDoc) {
                // Mark existing as not current
                await prisma.personDocument.update({
                    where: { id: existingDoc.id },
                    data: { isCurrentVersion: false }
                });
                newVersion = existingDoc.version + 1;
                previousVersionId = existingDoc.id;
            }

            // Create new document
            const document = await prisma.personDocument.create({
                data: {
                    personId: id,
                    tipo,
                    titolo,
                    descrizione,
                    fileName,
                    fileUrl,
                    fileSize: fileSize || null,
                    mimeType: mimeType || 'application/pdf',
                    hashFile,
                    version: newVersion,
                    isCurrentVersion: true,
                    previousVersionId,
                    dataDocumento: dataDocumento ? new Date(dataDocumento) : new Date(),
                    dataScadenza: dataScadenza ? new Date(dataScadenza) : null,
                    isExpired: dataScadenza ? new Date(dataScadenza) < new Date() : false,
                    uploadedBy: req.person.id,
                    tenantId
                },
                include: {
                    uploader: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            // Audit log
            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || id,
                    action: 'CREATE',
                    resourceType: 'PERSON_DOCUMENT',
                    resourceId: document.id,
                    dataAccessed: { documentId: document.id, tipo, fileName, version: newVersion },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            res.status(201).json({
                success: true,
                data: document,
                message: previousVersionId
                    ? `Documento aggiornato (versione ${newVersion})`
                    : 'Documento caricato con successo'
            });
        } catch (error) {
            logger.error('Failed to upload person document', {
                component: 'clinica-routes',
                error: error.message,
                personId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel caricamento del documento',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/medici/:id/documents/:docId/versions
 * @desc Ottiene lo storico versioni di un documento
 * @access Authenticated
 */
router.get('/medici/:id/documents/:docId/versions',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    async (req, res) => {
        try {
            const { id, docId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            // Get the document to find its type
            const document = await prisma.personDocument.findFirst({
                where: {
                    id: docId,
                    personId: id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    error: 'Documento non trovato'
                });
            }

            // Get all versions of this document type
            const versions = await prisma.personDocument.findMany({
                where: {
                    personId: id,
                    tenantId,
                    tipo: document.tipo,
                    deletedAt: null
                },
                orderBy: { version: 'desc' },
                include: {
                    uploader: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            res.json({
                success: true,
                data: versions
            });
        } catch (error) {
            logger.error('Failed to fetch document versions', {
                component: 'clinica-routes',
                error: error.message,
                docId: req.params.docId
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle versioni'
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/medici/:id/documents/:docId
 * @desc Elimina un documento (soft delete)
 * @access Authenticated + UPDATE_MEDICI
 */
router.delete('/medici/:id/documents/:docId',
    authenticateToken(),
    checkAdvancedPermission('medici', 'update'),
    async (req, res) => {
        try {
            const { id, docId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const document = await prisma.personDocument.findFirst({
                where: {
                    id: docId,
                    personId: id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    error: 'Documento non trovato'
                });
            }

            // Soft delete
            await prisma.personDocument.update({
                where: { id: docId },
                data: { deletedAt: new Date() }
            });

            // If this was current version, make previous version current
            if (document.isCurrentVersion && document.previousVersionId) {
                await prisma.personDocument.update({
                    where: { id: document.previousVersionId },
                    data: { isCurrentVersion: true }
                });
            }

            // Audit log
            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || id,
                    action: 'DELETE',
                    resourceType: 'PERSON_DOCUMENT',
                    resourceId: document.id,
                    dataAccessed: { documentId: document.id, tipo: document.tipo, fileName: document.fileName },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            res.json({
                success: true,
                message: 'Documento eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete person document', {
                component: 'clinica-routes',
                error: error.message,
                docId: req.params.docId
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del documento'
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/medici/:id
 * @desc Aggiorna medico
 * @access Authenticated + UPDATE_MEDICI
 */
router.put('/medici/:id',
    authenticateToken(),
    checkAdvancedPermission('medici', 'update'),
    clinicalValidators.params.id,
    auditClinico('update_medico'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const {
                firstName, lastName, email, phone, taxCode,
                // New fields
                birthDate, pec, residenceAddress, residenceCity, province, postalCode,
                iban, profileImage, notes, specialties,
                alboRegione, registerCode, registerCode2,
                shortDescription, fullDescription,
                // Legacy fields
                specializzazione, numeroIscrizione,
                status,
                // Prestazioni abilitate
                prestazioniIds
            } = req.body;

            // Verifica esistenza
            const existing = await prisma.person.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                    personRoles: { some: { roleType: 'MEDICO', deletedAt: null } }
                }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Medico non trovato'
                });
            }

            // Prepara dati update
            const updateData = {};
            if (firstName) updateData.firstName = firstName;
            if (lastName) updateData.lastName = lastName;
            if (email) updateData.email = email;
            if (phone !== undefined) updateData.phone = phone;
            if (taxCode) updateData.taxCode = taxCode.toUpperCase();
            if (status) updateData.status = status;

            // New fields
            if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
            if (pec !== undefined) updateData.pec = pec || null;
            if (residenceAddress !== undefined) updateData.residenceAddress = residenceAddress || null;
            if (residenceCity !== undefined) updateData.residenceCity = residenceCity || null;
            if (province !== undefined) updateData.province = province || null;
            if (postalCode !== undefined) updateData.postalCode = postalCode || null;
            if (iban !== undefined) updateData.iban = iban?.toUpperCase() || null;
            if (profileImage !== undefined) updateData.profileImage = profileImage || null;
            if (notes !== undefined) updateData.notes = notes || null;
            if (shortDescription !== undefined) updateData.shortDescription = shortDescription || null;
            if (fullDescription !== undefined) updateData.fullDescription = fullDescription || null;

            // Specialties (array)
            if (specialties !== undefined) {
                updateData.specialties = specialties || [];
            } else if (specializzazione) {
                // Legacy: single specializzazione to array
                updateData.specialties = [specializzazione];
            }

            // Register codes
            if (registerCode !== undefined) updateData.registerCode = registerCode || null;
            if (numeroIscrizione !== undefined && registerCode === undefined) updateData.registerCode = numeroIscrizione || null;
            if (registerCode2 !== undefined) updateData.registerCode2 = registerCode2 || null;

            // AlboRegione in preferences
            if (alboRegione !== undefined) {
                const existingPrefs = existing.preferences || {};
                updateData.preferences = { ...existingPrefs, alboRegione };
            }

            const medico = await prisma.person.update({
                where: { id },
                data: updateData,
                include: {
                    personRoles: { where: { deletedAt: null } },
                    abilitazioni: { where: { deletedAt: null } }
                }
            });

            // Gestione prestazioni abilitate (MedicoAbilitato)
            if (prestazioniIds !== undefined) {
                // Get current abilitazioni
                const currentAbilitazioni = await prisma.medicoAbilitato.findMany({
                    where: { medicoId: id, tenantId, deletedAt: null }
                });
                const currentPrestazioniIds = currentAbilitazioni.map(a => a.prestazioneId);

                // Prestazioni to add (new ones)
                const toAdd = prestazioniIds.filter(pId => !currentPrestazioniIds.includes(pId));

                // Prestazioni to remove (no longer selected)
                const toRemove = currentPrestazioniIds.filter(pId => !prestazioniIds.includes(pId));

                // Create new abilitazioni
                if (toAdd.length > 0) {
                    await prisma.medicoAbilitato.createMany({
                        data: toAdd.map(prestazioneId => ({
                            medicoId: id,
                            prestazioneId,
                            tenantId,
                            attivo: true,
                            dataAbilitazione: new Date()
                        })),
                        skipDuplicates: true
                    });
                }

                // Soft delete removed abilitazioni
                if (toRemove.length > 0) {
                    await prisma.medicoAbilitato.updateMany({
                        where: {
                            medicoId: id,
                            prestazioneId: { in: toRemove },
                            tenantId
                        },
                        data: { deletedAt: new Date(), attivo: false }
                    });
                }
            }

            // Re-fetch medico with updated abilitazioni
            const updatedMedico = await prisma.person.findUnique({
                where: { id },
                include: {
                    personRoles: { where: { deletedAt: null } },
                    abilitazioni: {
                        where: { deletedAt: null, attivo: true },
                        include: { prestazione: true }
                    }
                }
            });

            // Audit GDPR
            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || id,
                    action: 'UPDATE',
                    resourceType: 'PERSON_MEDICO',
                    resourceId: id,
                    dataAccessed: { previousData: existing, newData: updateData },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            res.json({
                success: true,
                data: updatedMedico,
                message: 'Medico aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update medico', {
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'Email o codice fiscale già esistente'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del medico',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/medici/:id
 * @desc Elimina medico (soft delete)
 * @access Authenticated + DELETE_MEDICI
 */
router.delete('/medici/:id',
    authenticateToken(),
    checkAdvancedPermission('medici', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_medico'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            // Verifica esistenza
            const existing = await prisma.person.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                    personRoles: { some: { roleType: 'MEDICO', deletedAt: null } }
                }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Medico non trovato'
                });
            }

            // Soft delete person e ruolo
            await prisma.$transaction([
                prisma.person.update({
                    where: { id },
                    data: { deletedAt: new Date() }
                }),
                prisma.personRole.updateMany({
                    where: { personId: id, roleType: 'MEDICO' },
                    data: { deletedAt: new Date(), isActive: false }
                })
            ]);

            // Audit GDPR
            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || id,
                    action: 'DELETE',
                    resourceType: 'PERSON_MEDICO',
                    resourceId: id,
                    dataAccessed: { deletedPerson: existing },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            res.json({
                success: true,
                message: 'Medico eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete medico', {
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del medico',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/medici/:id/ambulatori
 * @desc Lista ambulatori assegnati a un medico
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/medici/:id/ambulatori',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_medico_ambulatori'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            // Recupera ambulatori associati tramite MedicoAmbulatorio (se esiste)
            // Per ora ritorna array vuoto - da implementare con modello dedicato
            const ambulatori = [];

            res.json({
                success: true,
                data: ambulatori
            });
        } catch (error) {
            logger.error('Failed to get medico ambulatori', {
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli ambulatori',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/medici/:id/disponibilita
 * @desc Lista disponibilità medico
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/medici/:id/disponibilita',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_medico_disponibilita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            // Per ora ritorna array vuoto - da implementare con modello dedicato
            const disponibilita = [];

            res.json({
                success: true,
                data: disponibilita
            });
        } catch (error) {
            logger.error('Failed to get medico disponibilita', {
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della disponibilità',
                message: error.message
            });
        }
    }
);

// ============================================
// STRUMENTI ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/strumenti
 * @desc Lista strumenti con filtri e paginazione
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/strumenti',
    authenticateToken(),
    checkAdvancedPermission('strumenti', 'read'),
    clinicalValidators.strumento.query,
    auditClinico('list_strumenti'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, stato, tipologia, ambulatorioId } = req.query;

            // Unifica filtri e opzioni di paginazione in un unico oggetto
            const options = {
                page: parseInt(page),
                limit: parseInt(limit)
            };
            if (search) options.search = search;
            if (stato) options.stato = stato;
            if (tipologia) options.tipologia = tipologia;
            if (ambulatorioId) options.ambulatorioId = ambulatorioId;

            const strumenti = await StrumentoService.getAll(tenantId, options);

            res.json({
                success: true,
                data: strumenti.data,
                pagination: strumenti.pagination
            });
        } catch (error) {
            logger.error('Failed to list strumenti', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli strumenti',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/strumenti
 * @desc Crea nuovo strumento
 * @access Authenticated + CREATE_STRUMENTI
 */
router.post('/strumenti',
    authenticateToken(),
    checkAdvancedPermission('strumenti', 'create'),
    clinicalValidators.strumento.create,
    auditClinico('create_strumento'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const strumento = await StrumentoService.create({
                ...req.body,
                createdBy
            }, tenantId);

            res.status(201).json({
                success: true,
                data: strumento,
                message: 'Strumento creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create strumento', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    error: 'Strumento già esistente',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione dello strumento',
                message: error.message
            });
        }
    }
);

// ============================================
// STATIC STRUMENTI ROUTES (before :id params)
// Must be declared BEFORE /strumenti/:id to avoid param capture
// ============================================

/**
 * @route GET /api/v1/clinica/strumenti/tipologie
 * @desc Lista tutte le tipologie strumenti disponibili (enum)
 * @access Authenticated
 */
router.get('/strumenti/tipologie',
    authenticateToken(),
    async (req, res) => {
        try {
            const tipologie = StrumentoService.getTipologieDisponibili();

            res.json({
                success: true,
                data: tipologie
            });
        } catch (error) {
            logger.error('Failed to get tipologie', {
                component: 'clinica-routes',
                error: error.message
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle tipologie',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/strumenti/tipologie/count
 * @desc Conteggio strumenti per tipologia
 * @access Authenticated
 */
router.get('/strumenti/tipologie/count',
    authenticateToken(),
    auditClinico('strumenti_tipologie_count'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const counts = await StrumentoService.countByTipologia(tenantId);

            res.json({
                success: true,
                data: counts
            });
        } catch (error) {
            logger.error('Failed to count strumenti by tipologia', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel conteggio per tipologia',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/strumenti/by-tipologia/:tipologia
 * @desc Strumenti filtrati per tipologia
 * @access Authenticated
 */
router.get('/strumenti/by-tipologia/:tipologia',
    authenticateToken(),
    auditClinico('strumenti_by_tipologia'),
    async (req, res) => {
        try {
            const { tipologia } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { statoAttivo, ambulatorioId } = req.query;

            const strumenti = await StrumentoService.getByTipologia(tipologia, tenantId, {
                statoAttivo: statoAttivo !== 'false',
                ambulatorioId
            });

            res.json({
                success: true,
                data: strumenti
            });
        } catch (error) {
            logger.error('Failed to get strumenti by tipologia', {
                component: 'clinica-routes',
                error: error.message,
                tipologia: req.params.tipologia,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero strumenti per tipologia',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/ambulatori/:ambulatorioId/tipologie
 * @desc Tipologie disponibili in un ambulatorio
 * @access Authenticated
 */
router.get('/ambulatori/:ambulatorioId/tipologie',
    authenticateToken(),
    auditClinico('ambulatorio_tipologie'),
    async (req, res) => {
        try {
            const { ambulatorioId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const tipologie = await StrumentoService.getTipologieByAmbulatorio(ambulatorioId, tenantId);

            res.json({
                success: true,
                data: tipologie
            });
        } catch (error) {
            logger.error('Failed to get tipologie by ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero tipologie ambulatorio',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/strumenti/:id
 * @desc Dettaglio strumento
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/strumenti/:id',
    authenticateToken(),
    checkAdvancedPermission('strumenti', 'read'),
    clinicalValidators.strumento.id,
    auditClinico('view_strumento'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const strumento = await StrumentoService.getById(id, tenantId);

            res.json({
                success: true,
                data: strumento
            });
        } catch (error) {
            logger.error('Failed to get strumento', {
                component: 'clinica-routes',
                error: error.message,
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dello strumento',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/strumenti/:id
 * @desc Aggiorna strumento
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.put('/strumenti/:id',
    authenticateToken(),
    checkAdvancedPermission('strumenti', 'update'),
    clinicalValidators.strumento.id,
    clinicalValidators.strumento.update,
    auditClinico('update_strumento'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const strumento = await StrumentoService.update(id, req.body, tenantId);

            res.json({
                success: true,
                data: strumento,
                message: 'Strumento aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update strumento', {
                component: 'clinica-routes',
                error: error.message,
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento dello strumento',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/strumenti/:id
 * @desc Elimina strumento (soft delete)
 * @access Authenticated + DELETE_STRUMENTI
 */
router.delete('/strumenti/:id',
    authenticateToken(),
    checkAdvancedPermission('strumenti', 'delete'),
    clinicalValidators.strumento.id,
    auditClinico('delete_strumento'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await StrumentoService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Strumento eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete strumento', {
                component: 'clinica-routes',
                error: error.message,
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione dello strumento',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/strumenti/:id/stato
 * @desc Aggiorna stato strumento
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.put('/strumenti/:id/stato',
    authenticateToken(),
    checkAdvancedPermission('strumenti', 'update'),
    clinicalValidators.strumento.id,
    auditClinico('update_strumento_stato'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { stato } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            // Valida stato
            if (!CLINICAL_ENUMS.StatoStrumento.includes(stato)) {
                return res.status(400).json({
                    success: false,
                    error: 'Stato strumento non valido',
                    validStates: CLINICAL_ENUMS.StatoStrumento
                });
            }

            const strumento = await StrumentoService.updateStato(id, tenantId, stato, updatedBy);

            res.json({
                success: true,
                data: strumento,
                message: 'Stato strumento aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update strumento stato', {
                component: 'clinica-routes',
                error: error.message,
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento dello stato',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/strumenti/:id/assign
 * @desc Assegna strumento a ambulatorio
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.post('/strumenti/:id/assign',
    authenticateToken(),
    checkAdvancedPermission('strumenti', 'update'),
    clinicalValidators.strumento.id,
    auditClinico('assign_strumento'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { ambulatorioId } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            if (!ambulatorioId) {
                return res.status(400).json({
                    success: false,
                    error: 'ambulatorioId è richiesto'
                });
            }

            const strumento = await StrumentoService.assignToAmbulatorio(id, tenantId, ambulatorioId, updatedBy);

            res.json({
                success: true,
                data: strumento,
                message: 'Strumento assegnato con successo'
            });
        } catch (error) {
            logger.error('Failed to assign strumento', {
                component: 'clinica-routes',
                error: error.message,
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            if (error.message === 'Ambulatorio not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Ambulatorio non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'assegnazione dello strumento',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/strumenti/:id/assign
 * @desc Rimuovi strumento da ambulatorio
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.delete('/strumenti/:id/assign',
    authenticateToken(),
    checkAdvancedPermission('strumenti', 'update'),
    clinicalValidators.strumento.id,
    auditClinico('unassign_strumento'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const strumento = await StrumentoService.removeFromAmbulatorio(id, tenantId, updatedBy);

            res.json({
                success: true,
                data: strumento,
                message: 'Strumento rimosso dall\'ambulatorio con successo'
            });
        } catch (error) {
            logger.error('Failed to unassign strumento', {
                component: 'clinica-routes',
                error: error.message,
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella rimozione dello strumento',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/strumenti/:id/maintenance
 * @desc Ottiene schedule manutenzione strumento
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/strumenti/:id/maintenance',
    authenticateToken(),
    checkAdvancedPermission('strumenti', 'read'),
    clinicalValidators.strumento.id,
    auditClinico('view_strumento_maintenance'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const maintenance = await StrumentoService.getMaintenanceSchedule(id, tenantId);

            res.json({
                success: true,
                data: maintenance
            });
        } catch (error) {
            logger.error('Failed to get strumento maintenance', {
                component: 'clinica-routes',
                error: error.message,
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dello schedule manutenzione',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/strumenti/:id/maintenance
 * @desc Registra manutenzione strumento
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.post('/strumenti/:id/maintenance',
    authenticateToken(),
    checkAdvancedPermission('strumenti', 'update'),
    clinicalValidators.strumento.id,
    auditClinico('record_strumento_maintenance'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { dataMantenimento, note, prossimaMantenimento } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const performedBy = req.person.id;

            const strumento = await StrumentoService.recordMaintenance(id, tenantId, {
                dataMantenimento: dataMantenimento || new Date(),
                note,
                prossimaMantenimento,
                performedBy
            });

            res.json({
                success: true,
                data: strumento,
                message: 'Manutenzione registrata con successo'
            });
        } catch (error) {
            logger.error('Failed to record strumento maintenance', {
                component: 'clinica-routes',
                error: error.message,
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Strumento not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Strumento non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella registrazione della manutenzione',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/strumenti/roi/report
 * @desc Report ROI strumenti
 * @access Authenticated
 */
router.get('/strumenti/roi/report',
    authenticateToken(),
    auditClinico('strumenti_roi_report'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { strumentoId, dateFrom, dateTo } = req.query;

            const report = await StrumentoService.getROIReport(
                strumentoId || null,
                tenantId,
                { dateFrom, dateTo }
            );

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            logger.error('Failed to generate ROI report', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella generazione del report ROI',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/strumenti/:id/roi
 * @desc Report ROI singolo strumento
 * @access Authenticated
 */
router.get('/strumenti/:id/roi',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('strumento_roi'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { dateFrom, dateTo } = req.query;

            const report = await StrumentoService.getROIReport(id, tenantId, { dateFrom, dateTo });

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            logger.error('Failed to get strumento ROI', {
                component: 'clinica-routes',
                error: error.message,
                strumentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo ROI strumento',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/strumenti/roi/compare
 * @desc Confronto ROI tra strumenti
 * @access Authenticated
 */
router.post('/strumenti/roi/compare',
    authenticateToken(),
    auditClinico('strumenti_roi_compare'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { strumentoIds, dateFrom, dateTo } = req.body;

            if (!strumentoIds || !Array.isArray(strumentoIds) || strumentoIds.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'Devono essere forniti almeno 2 ID strumento per il confronto'
                });
            }

            const comparison = await StrumentoService.getROIComparison(
                strumentoIds,
                tenantId,
                { dateFrom, dateTo }
            );

            res.json({
                success: true,
                data: comparison
            });
        } catch (error) {
            logger.error('Failed to compare strumenti ROI', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel confronto ROI strumenti',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/prestazioni/:id/tipologie-richieste
 * @desc Tipologie strumenti richieste per una prestazione
 * @access Authenticated
 */
router.get('/prestazioni/:id/tipologie-richieste',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('prestazione_tipologie'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const tipologie = await PrestazioneService.getTipologieRichieste(id, tenantId);

            res.json({
                success: true,
                data: tipologie
            });
        } catch (error) {
            logger.error('Failed to get tipologie richieste', {
                component: 'clinica-routes',
                error: error.message,
                prestazioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero tipologie richieste',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/prestazioni/:id/tipologie-richieste
 * @desc Aggiungi tipologia richiesta a una prestazione
 * @access Authenticated + EDIT_PRESTAZIONI
 */
router.post('/prestazioni/:id/tipologie-richieste',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'update'),
    clinicalValidators.params.id,
    auditClinico('add_tipologia_richiesta'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const tipologia = await PrestazioneService.addTipologiaRichiesta(id, req.body, tenantId);

            res.status(201).json({
                success: true,
                data: tipologia
            });
        } catch (error) {
            logger.error('Failed to add tipologia richiesta', {
                component: 'clinica-routes',
                error: error.message,
                prestazioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(error.message.includes('già presente') ? 400 : 500).json({
                success: false,
                error: 'Errore nell\'aggiunta tipologia richiesta',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/prestazioni/:id/tipologie-richieste/:tipologia
 * @desc Rimuovi tipologia richiesta da una prestazione
 * @access Authenticated + EDIT_PRESTAZIONI
 */
router.delete('/prestazioni/:id/tipologie-richieste/:tipologia',
    authenticateToken(),
    checkAdvancedPermission('prestazioni', 'update'),
    clinicalValidators.params.id,
    auditClinico('remove_tipologia_richiesta'),
    async (req, res) => {
        try {
            const { id, tipologia } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const result = await PrestazioneService.removeTipologiaRichiesta(id, tipologia, tenantId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to remove tipologia richiesta', {
                component: 'clinica-routes',
                error: error.message,
                prestazioneId: req.params.id,
                tipologia: req.params.tipologia,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella rimozione tipologia richiesta',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/prestazioni/:id/check-tipologie/:ambulatorioId
 * @desc Verifica disponibilità tipologie per prestazione in un ambulatorio
 * @access Authenticated
 */
router.get('/prestazioni/:id/check-tipologie/:ambulatorioId',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('check_tipologie_disponibili'),
    async (req, res) => {
        try {
            const { id, ambulatorioId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const result = await PrestazioneService.checkTipologieDisponibili(id, ambulatorioId, tenantId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to check tipologie disponibili', {
                component: 'clinica-routes',
                error: error.message,
                prestazioneId: req.params.id,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella verifica tipologie',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/prestazioni/by-tipologia/:tipologia
 * @desc Prestazioni che richiedono una specifica tipologia di strumento
 * @access Authenticated
 */
router.get('/prestazioni/by-tipologia/:tipologia',
    authenticateToken(),
    auditClinico('prestazioni_by_tipologia'),
    async (req, res) => {
        try {
            const { tipologia } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const prestazioni = await PrestazioneService.getByTipologiaRichiesta(tipologia, tenantId);

            res.json({
                success: true,
                data: prestazioni
            });
        } catch (error) {
            logger.error('Failed to get prestazioni by tipologia richiesta', {
                component: 'clinica-routes',
                error: error.message,
                tipologia: req.params.tipologia,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero prestazioni per tipologia',
                message: error.message
            });
        }
    }
);

// ============================================
// LISTINI PREZZO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/listini
 * @desc Lista listini prezzo con filtri e paginazione
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/listini',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    clinicalValidators.listinoPrezzo.query,
    auditClinico('list_listini'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, tipo, prestazioneId, attivo } = req.query;

            const filters = {};
            if (search) filters.search = search;
            if (tipo) filters.tipo = tipo;
            if (prestazioneId) filters.prestazioneId = prestazioneId;
            if (attivo !== undefined) filters.attivo = attivo === 'true';

            const listini = await ListinoPrezzoService.getAll(tenantId, filters, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: listini.data,
                pagination: listini.pagination
            });
        } catch (error) {
            logger.error('Failed to list listini', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei listini',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/listini
 * @desc Crea nuovo listino prezzo
 * @access Authenticated + CREATE_LISTINI
 */
router.post('/listini',
    authenticateToken(),
    checkAdvancedPermission('listini', 'create'),
    clinicalValidators.listinoPrezzo.create,
    auditClinico('create_listino'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const listino = await ListinoPrezzoService.create({
                ...req.body,
                tenantId,
                createdBy
            });

            res.status(201).json({
                success: true,
                data: listino,
                message: 'Listino prezzo creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create listino', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    error: 'Listino già esistente',
                    message: error.message
                });
            }

            if (error.message.includes('Overlapping validity period')) {
                return res.status(400).json({
                    success: false,
                    error: 'Periodo di validità sovrapposto',
                    message: 'Esiste già un prezzo attivo per questa combinazione prestazione/medico/convenzione nel periodo indicato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del listino',
                message: error.message
            });
        }
    }
);

// ============================================
// LISTINI - ROUTE SPECIFICHE (devono precedere :id)
// ============================================

/**
 * @route GET /api/v1/clinica/listini/tipi
 * @desc Lista tipi listino disponibili
 * @access Authenticated
 */
router.get('/listini/tipi',
    authenticateToken(),
    async (req, res) => {
        try {
            const tipi = await ListinoPrezzoService.getTipi();

            res.json({
                success: true,
                data: tipi
            });
        } catch (error) {
            logger.error('Failed to get listini tipi', {
                component: 'clinica-routes',
                error: error.message
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei tipi listino',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/listini/calculate
 * @desc Calcola prezzo per prestazione
 * @access Authenticated + VIEW_LISTINI
 */
router.post('/listini/calculate',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('calculate_price'),
    async (req, res) => {
        try {
            const { prestazioneId, tipoListino, quantita } = req.body;
            const tenantId = getEffectiveTenantId(req);

            if (!prestazioneId || !tipoListino) {
                return res.status(400).json({
                    success: false,
                    error: 'prestazioneId e tipoListino sono richiesti'
                });
            }

            const result = await ListinoPrezzoService.calculatePrice(
                prestazioneId,
                tenantId,
                tipoListino,
                quantita || 1
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to calculate price', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Prestazione not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Prestazione non trovata'
                });
            }

            if (error.message === 'Listino not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Listino non trovato per questo tipo'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo del prezzo',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/listini/prestazione/:prestazioneId
 * @desc Lista listini per prestazione
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/listini/prestazione/:prestazioneId',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('list_listini_by_prestazione'),
    async (req, res) => {
        try {
            const { prestazioneId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const listini = await ListinoPrezzoService.getByPrestazione(prestazioneId, tenantId);

            res.json({
                success: true,
                data: listini,
                prestazioneId
            });
        } catch (error) {
            logger.error('Failed to list listini by prestazione', {
                component: 'clinica-routes',
                error: error.message,
                prestazioneId: req.params.prestazioneId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei listini',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/listini/bundle/:bundleId
 * @desc Lista listini per bundle
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/listini/bundle/:bundleId',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('list_listini_by_bundle'),
    async (req, res) => {
        try {
            const { bundleId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const listini = await ListinoPrezzoService.getByBundle(bundleId, tenantId);

            res.json({
                success: true,
                data: listini,
                bundleId
            });
        } catch (error) {
            logger.error('Failed to list listini by bundle', {
                component: 'clinica-routes',
                error: error.message,
                bundleId: req.params.bundleId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei listini bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/listini/bundle
 * @desc Crea listino per bundle (tariffario medico bundle)
 * @access Authenticated + CREATE_LISTINI
 */
router.post('/listini/bundle',
    authenticateToken(),
    checkAdvancedPermission('listini', 'create'),
    auditClinico('create_listino_bundle'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person.personId;

            const listino = await ListinoPrezzoService.createForBundle({
                ...req.body,
                tenantId,
                createdBy: personId
            });

            res.status(201).json({
                success: true,
                data: listino,
                message: 'Listino bundle creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create listino for bundle', {
                component: 'clinica-routes',
                error: error.message,
                bundleId: req.body.bundleId,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('Esiste già un listino') || error.message.includes('not found')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del listino bundle',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/listini/tipo/:tipo
 * @desc Lista listini per tipo
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/listini/tipo/:tipo',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('list_listini_by_tipo'),
    async (req, res) => {
        try {
            const { tipo } = req.params;
            const tenantId = getEffectiveTenantId(req);

            // Valida il tipo
            if (!CLINICAL_ENUMS.TipoListino.includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    error: 'Tipo listino non valido',
                    validTypes: CLINICAL_ENUMS.TipoListino
                });
            }

            const listini = await ListinoPrezzoService.getByTipo(tenantId, tipo);

            res.json({
                success: true,
                data: listini,
                tipo
            });
        } catch (error) {
            logger.error('Failed to list listini by tipo', {
                component: 'clinica-routes',
                error: error.message,
                tipo: req.params.tipo,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei listini',
                message: error.message
            });
        }
    }
);

// ============================================
// LISTINI - ROUTE CON :id (devono essere DOPO le route specifiche)
// ============================================

/**
 * @route GET /api/v1/clinica/listini/:id
 * @desc Dettaglio listino prezzo
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/listini/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    clinicalValidators.listinoPrezzo.id,
    auditClinico('view_listino'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const listino = await ListinoPrezzoService.getById(id, tenantId);

            res.json({
                success: true,
                data: listino
            });
        } catch (error) {
            logger.error('Failed to get listino', {
                component: 'clinica-routes',
                error: error.message,
                listinoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Listino not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Listino non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del listino',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/listini/:id
 * @desc Aggiorna listino prezzo
 * @access Authenticated + UPDATE_LISTINI
 */
router.put('/listini/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'update'),
    clinicalValidators.listinoPrezzo.id,
    clinicalValidators.listinoPrezzo.update,
    auditClinico('update_listino'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const listino = await ListinoPrezzoService.update(id, tenantId, {
                ...req.body,
                updatedBy
            });

            res.json({
                success: true,
                data: listino,
                message: 'Listino aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update listino', {
                component: 'clinica-routes',
                error: error.message,
                listinoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Listino not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Listino non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del listino',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/listini/:id
 * @desc Elimina listino prezzo (soft delete)
 * @access Authenticated + DELETE_LISTINI
 */
router.delete('/listini/:id',
    authenticateToken(),
    checkAdvancedPermission('listini', 'delete'),
    clinicalValidators.listinoPrezzo.id,
    auditClinico('delete_listino'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await ListinoPrezzoService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Listino eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete listino', {
                component: 'clinica-routes',
                error: error.message,
                listinoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Listino not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Listino non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del listino',
                message: error.message
            });
        }
    }
);

// ============================================
// VISITE ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/visite
 * @desc Lista visite con filtri e paginazione
 * @access Authenticated + VIEW_VISITE
 */
router.get('/visite',
    authenticateToken(),
    checkAdvancedPermission('visite', 'read'),
    clinicalValidators.visita.query,
    auditClinico('list_visite'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, stato, pazienteId, medicoId, dataInizio, dataFine } = req.query;

            const filters = {};
            if (search) filters.search = search;
            if (stato) filters.stato = stato;
            if (pazienteId) filters.pazienteId = pazienteId;
            if (medicoId) filters.medicoId = medicoId;
            if (dataInizio) filters.dataInizio = dataInizio;
            if (dataFine) filters.dataFine = dataFine;

            const visite = await VisitaService.getAll(tenantId, filters, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: visite.data,
                pagination: visite.pagination
            });
        } catch (error) {
            logger.error('Failed to list visite', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle visite',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/visite
 * @desc Crea nuova visita
 * @access Authenticated + CREATE_VISITE
 */
router.post('/visite',
    authenticateToken(),
    checkAdvancedPermission('visite', 'create'),
    clinicalValidators.visita.create,
    auditClinico('create_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const visita = await VisitaService.create({
                ...req.body,
                tenantId,
                createdBy
            });

            res.status(201).json({
                success: true,
                data: visita,
                message: 'Visita creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create visita', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Risorsa non trovata',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della visita',
                message: error.message
            });
        }
    }
);

// ============================================
// VISITE - ROUTE SPECIFICHE (PRIMA DI :id)
// ============================================

/**
 * @route GET /api/v1/clinica/visite/today
 * @desc Riepilogo visite di oggi
 * @access Authenticated + VIEW_VISITE
 */
router.get('/visite/today',
    authenticateToken(),
    checkAdvancedPermission('visite', 'read'),
    auditClinico('today_visite_summary'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.query;

            const summary = await VisitaService.getTodaySummary(tenantId, medicoId);

            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            logger.error('Failed to get today visite summary', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del riepilogo',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/visite/stati
 * @desc Lista stati visita disponibili
 * @access Authenticated
 */
router.get('/visite/stati',
    authenticateToken(),
    async (req, res) => {
        try {
            const stati = VisitaService.getStati();
            const transizioni = VisitaService.getTransizioni();

            res.json({
                success: true,
                data: {
                    stati,
                    transizioni
                }
            });
        } catch (error) {
            logger.error('Failed to get visite stati', {
                component: 'clinica-routes',
                error: error.message
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli stati',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/visite/:id
 * @desc Dettaglio visita
 * @access Authenticated + VIEW_VISITE
 */
router.get('/visite/:id',
    authenticateToken(),
    checkAdvancedPermission('visite', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const visita = await VisitaService.getById(id, tenantId);

            res.json({
                success: true,
                data: visita
            });
        } catch (error) {
            logger.error('Failed to get visita', {
                component: 'clinica-routes',
                error: error.message,
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della visita',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/visite/:id
 * @desc Aggiorna visita
 * @access Authenticated + UPDATE_VISITE
 */
router.put('/visite/:id',
    authenticateToken(),
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.visita.update,
    auditClinico('update_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const visita = await VisitaService.update(id, tenantId, {
                ...req.body,
                updatedBy
            });

            res.json({
                success: true,
                data: visita,
                message: 'Visita aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update visita', {
                component: 'clinica-routes',
                error: error.message,
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Cannot update')) {
                return res.status(409).json({
                    success: false,
                    error: 'Operazione non consentita',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento della visita',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/visite/:id
 * @desc Elimina visita (soft delete)
 * @access Authenticated + DELETE_VISITE
 */
router.delete('/visite/:id',
    authenticateToken(),
    checkAdvancedPermission('visite', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await VisitaService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Visita eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete visita', {
                component: 'clinica-routes',
                error: error.message,
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Cannot delete')) {
                return res.status(409).json({
                    success: false,
                    error: 'Impossibile eliminare la visita',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione della visita',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/visite/:id/status
 * @desc Cambia stato visita
 * @access Authenticated + UPDATE_VISITE
 */
router.put('/visite/:id/status',
    authenticateToken(),
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.visita.changeStatus,
    auditClinico('change_visita_status'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { stato } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const visita = await VisitaService.changeStatus(id, tenantId, stato, updatedBy);

            res.json({
                success: true,
                data: visita,
                message: 'Stato visita aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to change visita status', {
                component: 'clinica-routes',
                error: error.message,
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Cannot transition') || error.message.includes('Invalid status')) {
                return res.status(400).json({
                    success: false,
                    error: 'Transizione stato non valida',
                    message: error.message,
                    validStates: VisitaService.getStati(),
                    transitions: VisitaService.getTransizioni()
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel cambio stato',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/visite/:id/sign
 * @desc Firma visita (medico)
 * @access Authenticated + UPDATE_VISITE (solo medico assegnato)
 */
router.post('/visite/:id/sign',
    authenticateToken(),
    checkAdvancedPermission('visite', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.visita.sign,
    auditClinico('sign_visita'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { firmaMedico } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const medicoId = req.person.id;

            const visita = await VisitaService.sign(id, tenantId, firmaMedico, medicoId);

            res.json({
                success: true,
                data: visita,
                message: 'Visita firmata con successo'
            });
        } catch (error) {
            logger.error('Failed to sign visita', {
                component: 'clinica-routes',
                error: error.message,
                visitaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            if (error.message.includes('Only the assigned doctor')) {
                return res.status(403).json({
                    success: false,
                    error: 'Non autorizzato',
                    message: error.message
                });
            }

            if (error.message.includes('Cannot sign')) {
                return res.status(400).json({
                    success: false,
                    error: 'Impossibile firmare la visita',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella firma della visita',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/visite/paziente/:pazienteId
 * @desc Lista visite di un paziente
 * @access Authenticated + VIEW_VISITE
 */
router.get('/visite/paziente/:pazienteId',
    authenticateToken(),
    checkAdvancedPermission('visite', 'read'),
    auditClinico('list_visite_paziente'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const visite = await VisitaService.getByPaziente(pazienteId, tenantId);

            res.json({
                success: true,
                data: visite,
                pazienteId
            });
        } catch (error) {
            logger.error('Failed to list visite by paziente', {
                component: 'clinica-routes',
                error: error.message,
                pazienteId: req.params.pazienteId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle visite',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/visite/medico/:medicoId
 * @desc Lista visite di un medico
 * @access Authenticated + VIEW_VISITE
 */
router.get('/visite/medico/:medicoId',
    authenticateToken(),
    checkAdvancedPermission('visite', 'read'),
    auditClinico('list_visite_medico'),
    async (req, res) => {
        try {
            const { medicoId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { stato, dataInizio, dataFine } = req.query;

            const filters = {};
            if (stato) filters.stato = stato;
            if (dataInizio) filters.dataInizio = dataInizio;
            if (dataFine) filters.dataFine = dataFine;

            const visite = await VisitaService.getByMedico(medicoId, tenantId, filters);

            res.json({
                success: true,
                data: visite,
                medicoId
            });
        } catch (error) {
            logger.error('Failed to list visite by medico', {
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.medicoId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle visite',
                message: error.message
            });
        }
    }
);

// ============================================
// REFERTI ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/referti
 * @desc Lista referti con filtri e paginazione
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/referti',
    authenticateToken(),
    checkAdvancedPermission('referti', 'read'),
    clinicalValidators.referto.query,
    auditClinico('list_referti'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, stato, tipo, visitaId, dataInizio, dataFine } = req.query;

            const filters = {};
            if (search) filters.search = search;
            if (stato) filters.stato = stato;
            if (tipo) filters.tipo = tipo;
            if (visitaId) filters.visitaId = visitaId;
            if (dataInizio) filters.dataInizio = dataInizio;
            if (dataFine) filters.dataFine = dataFine;

            const referti = await RefertoService.getAll(tenantId, filters, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: referti.data,
                pagination: referti.pagination
            });
        } catch (error) {
            logger.error('Failed to list referti', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei referti',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/referti
 * @desc Crea nuovo referto
 * @access Authenticated + CREATE_REFERTI
 */
router.post('/referti',
    authenticateToken(),
    checkAdvancedPermission('referti', 'create'),
    clinicalValidators.referto.create,
    auditClinico('create_referto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const referto = await RefertoService.create({
                ...req.body,
                tenantId,
                createdBy
            });

            res.status(201).json({
                success: true,
                data: referto,
                message: 'Referto creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create referto', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Visita not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del referto',
                message: error.message
            });
        }
    }
);

// ============================================
// REFERTI - ROUTE SPECIFICHE (PRIMA DI :id)
// ============================================

/**
 * @route GET /api/v1/clinica/referti/pending
 * @desc Lista referti in attesa di firma
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/referti/pending',
    authenticateToken(),
    checkAdvancedPermission('referti', 'read'),
    auditClinico('list_referti_pending'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.query;

            const referti = await RefertoService.getPending(tenantId, medicoId);

            res.json({
                success: true,
                data: referti,
                count: referti.length
            });
        } catch (error) {
            logger.error('Failed to get pending referti', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei referti',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/referti/da-firmare
 * @desc Lista referti in attesa di firma (alias di /pending)
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/referti/da-firmare',
    authenticateToken(),
    checkAdvancedPermission('referti', 'read'),
    auditClinico('list_referti_da_firmare'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { medicoId } = req.query;

            const referti = await RefertoService.getPending(tenantId, medicoId);

            res.json({
                success: true,
                data: referti,
                count: referti.length
            });
        } catch (error) {
            logger.error('Failed to get referti da firmare', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei referti',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/referti/stati
 * @desc Lista stati referto disponibili
 * @access Authenticated
 */
router.get('/referti/stati',
    authenticateToken(),
    async (req, res) => {
        try {
            const stati = RefertoService.getStati();
            const transizioni = RefertoService.getTransizioni();

            res.json({
                success: true,
                data: {
                    stati,
                    transizioni
                }
            });
        } catch (error) {
            logger.error('Failed to get referti stati', {
                component: 'clinica-routes',
                error: error.message
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli stati',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/referti/:id
 * @desc Dettaglio referto
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/referti/:id',
    authenticateToken(),
    checkAdvancedPermission('referti', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_referto'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const referto = await RefertoService.getById(id, tenantId);

            res.json({
                success: true,
                data: referto
            });
        } catch (error) {
            logger.error('Failed to get referto', {
                component: 'clinica-routes',
                error: error.message,
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del referto',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/referti/:id
 * @desc Aggiorna referto
 * @access Authenticated + UPDATE_REFERTI
 */
router.put('/referti/:id',
    authenticateToken(),
    checkAdvancedPermission('referti', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.referto.update,
    auditClinico('update_referto'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const referto = await RefertoService.update(id, tenantId, {
                ...req.body,
                updatedBy
            });

            res.json({
                success: true,
                data: referto,
                message: 'Referto aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update referto', {
                component: 'clinica-routes',
                error: error.message,
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            if (error.message.includes('Cannot update')) {
                return res.status(409).json({
                    success: false,
                    error: 'Operazione non consentita',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del referto',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/referti/:id
 * @desc Elimina referto (soft delete)
 * @access Authenticated + DELETE_REFERTI
 */
router.delete('/referti/:id',
    authenticateToken(),
    checkAdvancedPermission('referti', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_referto'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            await RefertoService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Referto eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete referto', {
                component: 'clinica-routes',
                error: error.message,
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            if (error.message.includes('Cannot delete')) {
                return res.status(409).json({
                    success: false,
                    error: 'Impossibile eliminare il referto',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del referto',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/referti/:id/status
 * @desc Cambia stato referto
 * @access Authenticated + UPDATE_REFERTI
 */
router.put('/referti/:id/status',
    authenticateToken(),
    checkAdvancedPermission('referti', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.referto.changeStatus,
    auditClinico('change_referto_status'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { stato } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const updatedBy = req.person.id;

            const referto = await RefertoService.changeStatus(id, tenantId, stato, updatedBy);

            res.json({
                success: true,
                data: referto,
                message: 'Stato referto aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to change referto status', {
                component: 'clinica-routes',
                error: error.message,
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            if (error.message.includes('Cannot transition') || error.message.includes('Invalid status')) {
                return res.status(400).json({
                    success: false,
                    error: 'Transizione stato non valida',
                    message: error.message,
                    validStates: RefertoService.getStati(),
                    transitions: RefertoService.getTransizioni()
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel cambio stato',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/referti/:id/sign
 * @desc Firma referto (medico)
 * @access Authenticated + UPDATE_REFERTI (solo medico della visita)
 */
router.post('/referti/:id/sign',
    authenticateToken(),
    checkAdvancedPermission('referti', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.referto.sign,
    auditClinico('sign_referto'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { firmaMedico } = req.body;
            const tenantId = getEffectiveTenantId(req);
            const medicoId = req.person.id;

            const referto = await RefertoService.sign(id, tenantId, firmaMedico, medicoId);

            res.json({
                success: true,
                data: referto,
                message: 'Referto firmato con successo'
            });
        } catch (error) {
            logger.error('Failed to sign referto', {
                component: 'clinica-routes',
                error: error.message,
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            if (error.message.includes('Only the visit doctor')) {
                return res.status(403).json({
                    success: false,
                    error: 'Non autorizzato',
                    message: error.message
                });
            }

            if (error.message.includes('Cannot sign')) {
                return res.status(400).json({
                    success: false,
                    error: 'Impossibile firmare il referto',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella firma del referto',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/referti/:id/deliver
 * @desc Segna referto come consegnato
 * @access Authenticated + UPDATE_REFERTI
 */
router.post('/referti/:id/deliver',
    authenticateToken(),
    checkAdvancedPermission('referti', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.referto.deliver,
    auditClinico('deliver_referto'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { consegnatoA, metodiConsegna } = req.body;
            const tenantId = getEffectiveTenantId(req);

            const referto = await RefertoService.deliver(id, tenantId, {
                consegnatoA,
                metodiConsegna
            });

            res.json({
                success: true,
                data: referto,
                message: 'Referto consegnato con successo'
            });
        } catch (error) {
            logger.error('Failed to deliver referto', {
                component: 'clinica-routes',
                error: error.message,
                refertoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Referto not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Referto non trovato'
                });
            }

            if (error.message.includes('Cannot deliver')) {
                return res.status(400).json({
                    success: false,
                    error: 'Impossibile consegnare il referto',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella consegna del referto',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/referti/visita/:visitaId
 * @desc Lista referti di una visita
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/referti/visita/:visitaId',
    authenticateToken(),
    checkAdvancedPermission('referti', 'read'),
    auditClinico('list_referti_visita'),
    async (req, res) => {
        try {
            const { visitaId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const referti = await RefertoService.getByVisita(visitaId, tenantId);

            res.json({
                success: true,
                data: referti,
                visitaId
            });
        } catch (error) {
            logger.error('Failed to list referti by visita', {
                component: 'clinica-routes',
                error: error.message,
                visitaId: req.params.visitaId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei referti',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/referti/paziente/:pazienteId
 * @desc Lista referti di un paziente
 * @access Authenticated + VIEW_REFERTI
 */
router.get('/referti/paziente/:pazienteId',
    authenticateToken(),
    checkAdvancedPermission('referti', 'read'),
    auditClinico('list_referti_paziente'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const referti = await RefertoService.getByPaziente(pazienteId, tenantId);

            res.json({
                success: true,
                data: referti,
                pazienteId
            });
        } catch (error) {
            logger.error('Failed to list referti by paziente', {
                component: 'clinica-routes',
                error: error.message,
                pazienteId: req.params.pazienteId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei referti',
                message: error.message
            });
        }
    }
);

// ============================================
// TARIFFARIO AVANZATO ROUTES (Progetto 44)
// ============================================

/**
 * @route POST /api/v1/clinica/tariffario/calcola-prezzo
 * @desc Calcola prezzo prestazione con cascata priorità
 * @access Authenticated + VIEW_LISTINI
 */
router.post('/tariffario/calcola-prezzo',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('calcola_prezzo'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { prestazioneId, medicoId, pazienteId, convenzioneId, codiceSconto, bundleId } = req.body;

            if (!prestazioneId) {
                return res.status(400).json({
                    success: false,
                    error: 'prestazioneId è obbligatorio'
                });
            }

            const result = await TariffarioService.calcolaPrezzo({
                prestazioneId,
                medicoId,
                pazienteId,
                convenzioneId,
                codiceSconto,
                bundleId,
                tenantId
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to calculate price', {
                component: 'clinica-routes',
                action: 'calcola_prezzo',
                error: error.message,
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
                error: 'Errore nel calcolo del prezzo',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/tariffario/breakdown/:prestazioneId
 * @desc Ottieni breakdown completo prezzi per una prestazione
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/tariffario/breakdown/:prestazioneId',
    authenticateToken(),
    checkAdvancedPermission('listini', 'read'),
    auditClinico('breakdown_prezzo'),
    async (req, res) => {
        try {
            const { prestazioneId } = req.params;
            const { medicoId, convenzioneId } = req.query;
            const tenantId = getEffectiveTenantId(req);

            const breakdown = await TariffarioService.getBreakdownPrezzo({
                prestazioneId,
                medicoId,
                convenzioneId,
                tenantId
            });

            res.json({
                success: true,
                data: breakdown
            });
        } catch (error) {
            logger.error('Failed to get price breakdown', {
                component: 'clinica-routes',
                action: 'breakdown_prezzo',
                error: error.message,
                prestazioneId: req.params.prestazioneId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero breakdown prezzi',
                message: error.message
            });
        }
    }
);

// ============================================
// OFFERTE BUNDLE ROUTES (Progetto 44)
// ============================================

/**
 * @route GET /api/v1/clinica/bundle
 * @desc Lista bundle/offerte con paginazione (supporta multi-tenant per admin)
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/bundle',
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
                component: 'clinica-routes',
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
 * @route POST /api/v1/clinica/bundle
 * @desc Crea nuovo bundle/offerta
 * @access Authenticated + CREATE_LISTINI
 */
router.post('/bundle',
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
                component: 'clinica-routes',
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
 * @route GET /api/v1/clinica/bundle/:id
 * @desc Dettaglio bundle/offerta
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/bundle/:id',
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
                component: 'clinica-routes',
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
 * @route PUT /api/v1/clinica/bundle/:id
 * @desc Aggiorna bundle/offerta
 * @access Authenticated + UPDATE_LISTINI
 */
router.put('/bundle/:id',
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
                component: 'clinica-routes',
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
 * @route DELETE /api/v1/clinica/bundle/:id
 * @desc Elimina bundle/offerta (soft delete)
 * @access Authenticated + DELETE_LISTINI
 */
router.delete('/bundle/:id',
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
                component: 'clinica-routes',
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

/**
 * @route PATCH /api/v1/clinica/bundle/:id/toggle
 * @desc Toggle stato attivo/disattivo bundle
 * @access Authenticated + UPDATE_LISTINI
 */
router.patch('/bundle/:id/toggle',
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
                component: 'clinica-routes',
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
 * @route GET /api/v1/clinica/bundle/by-prestazione/:prestazioneId
 * @desc Trova bundle che contengono una specifica prestazione
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/bundle/by-prestazione/:prestazioneId',
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
                component: 'clinica-routes',
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
 * @route POST /api/v1/clinica/bundle/check-applicability
 * @desc Verifica se un bundle è applicabile a un paziente
 * @access Authenticated + VIEW_LISTINI
 */
router.post('/bundle/check-applicability',
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
                component: 'clinica-routes',
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
router.post('/bundle/for-patient',
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
                component: 'clinica-routes',
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
router.post('/bundle/:id/increment-usage',
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
                component: 'clinica-routes',
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

// ============================================
// TARIFFARIO MEDICO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/tariffario-medico
 * @desc Lista tariffari medico con filtri
 * @access Authenticated + VIEW_LISTINI
 */
router.get('/tariffario-medico',
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
                component: 'clinica-routes',
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
router.get('/tariffario-medico/by-medico/:medicoId',
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
                component: 'clinica-routes',
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
router.post('/tariffario-medico/effective',
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
                component: 'clinica-routes',
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
router.post('/tariffario-medico',
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
                component: 'clinica-routes',
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
router.put('/tariffario-medico/:id',
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
                component: 'clinica-routes',
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
router.delete('/tariffario-medico/:id',
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
                component: 'clinica-routes',
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

// ============================================
// CONVENZIONI ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/convenzioni
 * @desc Lista convenzioni con paginazione e filtri
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/convenzioni',
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
                component: 'clinica-routes',
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
router.get('/convenzioni/statistics',
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
                component: 'clinica-routes',
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
router.get('/convenzioni/expiring',
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
                component: 'clinica-routes',
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
router.get('/convenzioni/available',
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
                component: 'clinica-routes',
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
 * @route POST /api/v1/clinica/convenzioni
 * @desc Crea nuova convenzione
 * @access Authenticated + CREATE_CONVENZIONI
 */
router.post('/convenzioni',
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
                component: 'clinica-routes',
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
 * @route GET /api/v1/clinica/convenzioni/:id
 * @desc Dettaglio convenzione
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/convenzioni/:id',
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
                component: 'clinica-routes',
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
 * @route PUT /api/v1/clinica/convenzioni/:id
 * @desc Aggiorna convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.put('/convenzioni/:id',
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
                component: 'clinica-routes',
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
 * @route DELETE /api/v1/clinica/convenzioni/:id
 * @desc Elimina convenzione (soft delete)
 * @access Authenticated + DELETE_CONVENZIONI
 */
router.delete('/convenzioni/:id',
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
                component: 'clinica-routes',
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
 * @route GET /api/v1/clinica/convenzioni/:id/validity
 * @desc Verifica validità convenzione
 * @access Authenticated
 */
router.get('/convenzioni/:id/validity',
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
                component: 'clinica-routes',
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
router.get('/convenzioni/:id/listini',
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
                component: 'clinica-routes',
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
 * @route POST /api/v1/clinica/convenzioni/:id/listini
 * @desc Associa listino alla convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.post('/convenzioni/:id/listini',
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
                component: 'clinica-routes',
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
 * @route DELETE /api/v1/clinica/convenzioni/:id/listini/:listinoId
 * @desc Rimuove listino dalla convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.delete('/convenzioni/:id/listini/:listinoId',
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
                component: 'clinica-routes',
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

// ============================================
// CONVENZIONI - AZIENDE ASSOCIATE ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/convenzioni/:id/aziende
 * @desc Lista aziende associate alla convenzione
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/convenzioni/:id/aziende',
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
                component: 'clinica-routes',
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
 * @route POST /api/v1/clinica/convenzioni/:id/aziende
 * @desc Associa un'azienda alla convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.post('/convenzioni/:id/aziende',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    clinicalValidators.params.id,
    auditClinico('associate_convenzione_azienda'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person?.id;

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
                component: 'clinica-routes',
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
 * @route PUT /api/v1/clinica/convenzioni/:id/aziende/:aziendaAssociazioneId
 * @desc Aggiorna l'associazione azienda-convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.put('/convenzioni/:id/aziende/:aziendaAssociazioneId',
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
                component: 'clinica-routes',
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
 * @route DELETE /api/v1/clinica/convenzioni/:id/aziende/:aziendaAssociazioneId
 * @desc Rimuove un'azienda dalla convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.delete('/convenzioni/:id/aziende/:aziendaAssociazioneId',
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
                component: 'clinica-routes',
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

// ============================================
// RICONOSCIMENTI CONVENZIONE ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/convenzioni/:id/aziende/:aziendaAssociazioneId/riconoscimenti
 * @desc Lista riconoscimenti per un'associazione azienda-convenzione
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/convenzioni/:id/aziende/:aziendaAssociazioneId/riconoscimenti',
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
                component: 'clinica-routes',
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
 * @route POST /api/v1/clinica/riconoscimenti
 * @desc Crea un nuovo riconoscimento convenzione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.post('/riconoscimenti',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    auditClinico('create_riconoscimento'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person?.id;

            const riconoscimento = await RiconoscimentoConvenzioneService.createRiconoscimento(
                req.body,
                tenantId,
                userId
            );

            res.status(201).json({
                success: true,
                data: riconoscimento,
                message: 'Riconoscimento creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create riconoscimento', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 :
                error.message.includes('Specificare') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione del riconoscimento',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/riconoscimenti/:id
 * @desc Aggiorna un riconoscimento
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.put('/riconoscimenti/:id',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    clinicalValidators.params.id,
    auditClinico('update_riconoscimento'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const riconoscimento = await RiconoscimentoConvenzioneService.updateRiconoscimento(
                req.params.id,
                req.body,
                tenantId
            );

            res.json({
                success: true,
                data: riconoscimento,
                message: 'Riconoscimento aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update riconoscimento', {
                component: 'clinica-routes',
                error: error.message,
                riconoscimentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento del riconoscimento',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/riconoscimenti/:id
 * @desc Elimina un riconoscimento (soft delete)
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.delete('/riconoscimenti/:id',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    clinicalValidators.params.id,
    auditClinico('delete_riconoscimento'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            await RiconoscimentoConvenzioneService.deleteRiconoscimento(req.params.id, tenantId);

            res.json({
                success: true,
                message: 'Riconoscimento eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete riconoscimento', {
                component: 'clinica-routes',
                error: error.message,
                riconoscimentoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione del riconoscimento',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/riconoscimenti/eroga
 * @desc Eroga un riconoscimento per un paziente
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.post('/riconoscimenti/eroga',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    auditClinico('eroga_riconoscimento'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const erogazione = await RiconoscimentoConvenzioneService.erogaRiconoscimento(
                req.body,
                tenantId
            );

            res.status(201).json({
                success: true,
                data: erogazione,
                message: 'Riconoscimento erogato con successo'
            });
        } catch (error) {
            logger.error('Failed to eroga riconoscimento', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'erogazione del riconoscimento',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/riconoscimenti/erogazione/:id/stato
 * @desc Aggiorna lo stato di un'erogazione
 * @access Authenticated + UPDATE_CONVENZIONI
 */
router.put('/riconoscimenti/erogazione/:id/stato',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'update'),
    clinicalValidators.params.id,
    auditClinico('update_erogazione_stato'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const erogazione = await RiconoscimentoConvenzioneService.updateStatoErogazione(
                req.params.id,
                req.body.stato,
                tenantId
            );

            res.json({
                success: true,
                data: erogazione,
                message: 'Stato erogazione aggiornato'
            });
        } catch (error) {
            logger.error('Failed to update erogazione stato', {
                component: 'clinica-routes',
                error: error.message,
                erogazioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovata') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento dello stato',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/riconoscimenti/azienda/:aziendaId/erogazioni
 * @desc Lista erogazioni per un'azienda
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/riconoscimenti/azienda/:aziendaId/erogazioni',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'read'),
    auditClinico('get_erogazioni_azienda'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const result = await RiconoscimentoConvenzioneService.getErogazioniByAzienda(
                req.params.aziendaId,
                req.query,
                tenantId
            );

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to get erogazioni by azienda', {
                component: 'clinica-routes',
                error: error.message,
                aziendaId: req.params.aziendaId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle erogazioni',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/riconoscimenti/statistiche
 * @desc Statistiche riconoscimenti
 * @access Authenticated + VIEW_CONVENZIONI
 */
router.get('/riconoscimenti/statistiche',
    authenticateToken(),
    checkAdvancedPermission('convenzioni', 'read'),
    auditClinico('get_riconoscimenti_statistiche'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const stats = await RiconoscimentoConvenzioneService.getStatistiche(
                req.query,
                tenantId
            );

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get riconoscimenti statistiche', {
                component: 'clinica-routes',
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
 * @route GET /api/v1/clinica/riconoscimenti/applicabili
 * @desc Trova riconoscimenti applicabili per un paziente/bundle/prestazione
 * @access Authenticated
 */
router.get('/riconoscimenti/applicabili',
    authenticateToken(),
    auditClinico('find_riconoscimenti_applicabili'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const riconoscimenti = await RiconoscimentoConvenzioneService.findApplicableRiconoscimenti(
                {
                    pazienteId: req.query.pazienteId,
                    bundleId: req.query.bundleId,
                    prestazioneId: req.query.prestazioneId
                },
                tenantId
            );

            res.json({
                success: true,
                data: riconoscimenti,
                count: riconoscimenti.length
            });
        } catch (error) {
            logger.error('Failed to find applicable riconoscimenti', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella ricerca dei riconoscimenti',
                message: error.message
            });
        }
    }
);

// ============================================
// SCONTO CLINICO ROUTES (Codici Sconto)
// ============================================

/**
 * @route GET /api/v1/clinica/sconti
 * @desc Lista codici sconto
 * @access Authenticated
 */
router.get('/sconti',
    authenticateToken(),
    clinicalValidators.scontoClinico.query,
    auditClinico('list_sconti_clinici'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await ScontoClinicoService.list(tenantId, req.query);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list sconti clinici', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei codici sconto',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/sconti/statistics
 * @desc Statistiche codici sconto
 * @access Authenticated
 */
router.get('/sconti/statistics',
    authenticateToken(),
    auditClinico('sconti_statistics'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const stats = await ScontoClinicoService.getStatistics(tenantId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get sconti statistics', {
                component: 'clinica-routes',
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
 * @route POST /api/v1/clinica/sconti/validate
 * @desc Valida un codice sconto
 * @access Authenticated
 */
router.post('/sconti/validate',
    authenticateToken(),
    clinicalValidators.scontoClinico.validate,
    auditClinico('validate_sconto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { codice, prestazioneId, prezzoBase } = req.body;

            const result = await ScontoClinicoService.validateCode(codice, prestazioneId, prezzoBase || 0, tenantId);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to validate sconto', {
                component: 'clinica-routes',
                error: error.message,
                codice: req.body?.codice,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella validazione del codice sconto',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/sconti/apply
 * @desc Applica un codice sconto a un prezzo
 * @access Authenticated
 */
router.post('/sconti/apply',
    authenticateToken(),
    clinicalValidators.scontoClinico.apply,
    auditClinico('apply_sconto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { codice, prezzoBase, prestazioneId } = req.body;

            const result = await ScontoClinicoService.applyCode(codice, prestazioneId, prezzoBase, tenantId);

            res.json({
                success: result.success,
                data: result
            });
        } catch (error) {
            logger.error('Failed to apply sconto', {
                component: 'clinica-routes',
                error: error.message,
                codice: req.body?.codice,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'applicazione del codice sconto',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/sconti/prestazione/:prestazioneId
 * @desc Codici sconto validi per una prestazione
 * @access Authenticated
 */
router.get('/sconti/prestazione/:prestazioneId',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('sconti_for_prestazione'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const sconti = await ScontoClinicoService.getApplicableCodes(req.params.prestazioneId, tenantId);

            res.json({
                success: true,
                data: sconti,
                count: sconti.length
            });
        } catch (error) {
            logger.error('Failed to get sconti for prestazione', {
                component: 'clinica-routes',
                error: error.message,
                prestazioneId: req.params.prestazioneId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei codici sconto',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/sconti/codice/:codice
 * @desc Dettaglio sconto per codice
 * @access Authenticated
 */
router.get('/sconti/codice/:codice',
    authenticateToken(),
    auditClinico('get_sconto_by_codice'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const sconto = await ScontoClinicoService.getByCode(req.params.codice, tenantId);

            if (!sconto) {
                return res.status(404).json({
                    success: false,
                    error: 'Codice sconto non trovato'
                });
            }

            res.json({
                success: true,
                data: sconto
            });
        } catch (error) {
            logger.error('Failed to get sconto by codice', {
                component: 'clinica-routes',
                error: error.message,
                codice: req.params.codice,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del codice sconto',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/sconti
 * @desc Crea nuovo codice sconto
 * @access Authenticated
 */
router.post('/sconti',
    authenticateToken(),
    clinicalValidators.scontoClinico.create,
    auditClinico('create_sconto_clinico'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const sconto = await ScontoClinicoService.create(req.body, tenantId);

            res.status(201).json({
                success: true,
                data: sconto,
                message: 'Codice sconto creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create sconto clinico', {
                component: 'clinica-routes',
                error: error.message,
                codice: req.body?.codice,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('already exists') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione del codice sconto',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/sconti/bulk
 * @desc Creazione bulk codici sconto
 * @access Authenticated
 */
router.post('/sconti/bulk',
    authenticateToken(),
    clinicalValidators.scontoClinico.bulkCreate,
    auditClinico('bulk_create_sconti'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await ScontoClinicoService.bulkCreate(req.body.codes, tenantId);

            res.status(201).json({
                success: true,
                data: result,
                message: `Creati ${result.created.length} codici sconto, ${result.failed.length} falliti`
            });
        } catch (error) {
            logger.error('Failed to bulk create sconti', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione bulk dei codici sconto',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/sconti/:id
 * @desc Dettaglio codice sconto
 * @access Authenticated
 */
router.get('/sconti/:id',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('get_sconto_clinico'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const sconto = await ScontoClinicoService.getById(req.params.id, tenantId);

            if (!sconto) {
                return res.status(404).json({
                    success: false,
                    error: 'Codice sconto non trovato'
                });
            }

            res.json({
                success: true,
                data: sconto
            });
        } catch (error) {
            logger.error('Failed to get sconto clinico', {
                component: 'clinica-routes',
                error: error.message,
                id: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del codice sconto',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/sconti/:id
 * @desc Aggiorna codice sconto
 * @access Authenticated
 */
router.put('/sconti/:id',
    authenticateToken(),
    clinicalValidators.params.id,
    clinicalValidators.scontoClinico.update,
    auditClinico('update_sconto_clinico'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const sconto = await ScontoClinicoService.update(req.params.id, req.body, tenantId);

            res.json({
                success: true,
                data: sconto,
                message: 'Codice sconto aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update sconto clinico', {
                component: 'clinica-routes',
                error: error.message,
                id: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento del codice sconto',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/sconti/:id
 * @desc Elimina codice sconto (soft delete)
 * @access Authenticated
 */
router.delete('/sconti/:id',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('delete_sconto_clinico'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            await ScontoClinicoService.delete(req.params.id, tenantId);

            res.json({
                success: true,
                message: 'Codice sconto eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete sconto clinico', {
                component: 'clinica-routes',
                error: error.message,
                id: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione del codice sconto',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/sconti/:id/increment-usage
 * @desc Incrementa il contatore utilizzi di un codice sconto
 * @access Authenticated
 */
router.post('/sconti/:id/increment-usage',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('increment_sconto_usage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            // Get sconto to retrieve codice
            const sconto = await ScontoClinicoService.getById(req.params.id, tenantId);
            if (!sconto) {
                return res.status(404).json({
                    success: false,
                    error: 'Codice sconto non trovato'
                });
            }

            const result = await ScontoClinicoService.incrementUsage(sconto.codice, tenantId);

            res.json({
                success: true,
                data: result,
                message: 'Utilizzo registrato con successo'
            });
        } catch (error) {
            logger.error('Failed to increment sconto usage', {
                component: 'clinica-routes',
                error: error.message,
                id: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella registrazione dell\'utilizzo',
                message: error.message
            });
        }
    }
);

// ============================================
// SLOT DISPONIBILITA ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/slots/available
 * @desc Lista slot disponibili per prenotazione
 * @access Authenticated
 */
router.get('/slots/available',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli slot',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/grouped
 * @desc Lista slot raggruppati per data (vista calendario)
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/slots/grouped',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli slot',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/first-available
 * @desc Primo slot disponibile per prestazione
 * @access Authenticated
 */
router.get('/slots/first-available',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dello slot',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots
 * @desc Crea nuovo slot
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/slots',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('sovrapposto') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione dello slot',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots/bulk
 * @desc Crea multipli slot in blocco
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/slots/bulk',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione degli slot',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots/generate
 * @desc Genera slot da orari ambulatorio
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/slots/generate',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella generazione degli slot',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/medico/:medicoId
 * @desc Lista slot per medico e range date
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/slots/medico/:medicoId',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.medicoId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli slot',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/medico/:medicoId/availability
 * @desc Calcola disponibilità medico
 * @access Authenticated + VIEW_AGENDA
 */
router.get('/slots/medico/:medicoId/availability',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.medicoId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo della disponibilità',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/slots/:id
 * @desc Dettaglio slot
 * @access Authenticated
 */
router.get('/slots/:id',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dello slot',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/slots/:id
 * @desc Aggiorna slot
 * @access Authenticated + MANAGE_AGENDA
 */
router.put('/slots/:id',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('sovrapposto') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento dello slot',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots/:id/book
 * @desc Prenota slot
 * @access Authenticated
 */
router.post('/slots/:id/book',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('non disponibile') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella prenotazione dello slot',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots/:id/release
 * @desc Libera slot prenotato
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/slots/:id/release',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella liberazione dello slot',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/slots/:id/block
 * @desc Blocca slot
 * @access Authenticated + MANAGE_AGENDA
 */
router.post('/slots/:id/block',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('prenotato') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nel blocco dello slot',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/slots/:id
 * @desc Elimina slot (soft delete)
 * @access Authenticated + MANAGE_AGENDA
 */
router.delete('/slots/:id',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                slotId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('prenotato') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione dello slot',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/slots/medico/:medicoId/range
 * @desc Elimina slot per range date
 * @access Authenticated + MANAGE_AGENDA
 */
router.delete('/slots/medico/:medicoId/range',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                medicoId: req.params.medicoId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione degli slot',
                message: error.message
            });
        }
    }
);

// ============================================
// ORARIO AMBULATORIO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/orari-ambulatorio
 * @desc Lista orari ambulatorio con paginazione
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/orari-ambulatorio',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.orarioAmbulatorio.query,
    auditClinico('list_orari_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await OrarioAmbulatorioService.getAll(tenantId, req.query);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list orari ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli orari',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/orari-ambulatorio/ambulatorio/:ambulatorioId
 * @desc Lista orari per ambulatorio
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/orari-ambulatorio/ambulatorio/:ambulatorioId',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    auditClinico('get_orari_by_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const orari = await OrarioAmbulatorioService.getByAmbulatorio(req.params.ambulatorioId, tenantId);

            res.json({
                success: true,
                data: orari,
                count: orari.length
            });
        } catch (error) {
            logger.error('Failed to get orari by ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli orari',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/orari-ambulatorio/ambulatorio/:ambulatorioId/weekly
 * @desc Vista settimanale orari ambulatorio
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/orari-ambulatorio/ambulatorio/:ambulatorioId/weekly',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    auditClinico('get_weekly_schedule'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const schedule = await OrarioAmbulatorioService.getWeeklySchedule(req.params.ambulatorioId, tenantId);

            res.json({
                success: true,
                data: schedule
            });
        } catch (error) {
            logger.error('Failed to get weekly schedule', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli orari',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/orari-ambulatorio/ambulatorio/:ambulatorioId/hours
 * @desc Ore settimanali ambulatorio
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/orari-ambulatorio/ambulatorio/:ambulatorioId/hours',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    auditClinico('get_weekly_hours'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const hours = await OrarioAmbulatorioService.getWeeklyHours(req.params.ambulatorioId, tenantId);

            res.json({
                success: true,
                data: hours
            });
        } catch (error) {
            logger.error('Failed to get weekly hours', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo delle ore',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/orari-ambulatorio/ambulatorio/:ambulatorioId/next-open
 * @desc Prossima apertura ambulatorio
 * @access Authenticated
 */
router.get('/orari-ambulatorio/ambulatorio/:ambulatorioId/next-open',
    authenticateToken(),
    auditClinico('get_next_open_time'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { fromDate } = req.query;

            const nextOpen = await OrarioAmbulatorioService.getNextOpenTime(
                req.params.ambulatorioId,
                tenantId,
                fromDate ? new Date(fromDate) : new Date()
            );

            res.json({
                success: true,
                data: nextOpen
            });
        } catch (error) {
            logger.error('Failed to get next open time', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel calcolo della prossima apertura',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/orari-ambulatorio
 * @desc Crea nuovo orario ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.post('/orari-ambulatorio',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    clinicalValidators.orarioAmbulatorio.create,
    auditClinico('create_orario_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const orario = await OrarioAmbulatorioService.create(req.body, tenantId);

            res.status(201).json({
                success: true,
                data: orario,
                message: 'Orario creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create orario ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('sovrapposto') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione dell\'orario',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/orari-ambulatorio/bulk
 * @desc Crea multipli orari in blocco
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.post('/orari-ambulatorio/bulk',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    auditClinico('create_orari_bulk'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { orari } = req.body;

            if (!Array.isArray(orari) || orari.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Array orari è obbligatorio'
                });
            }

            const result = await OrarioAmbulatorioService.createBulk(orari, tenantId);

            res.status(201).json({
                success: true,
                data: result,
                message: `Creati ${result.created.length} orari, ${result.failed.length} falliti`
            });
        } catch (error) {
            logger.error('Failed to create orari bulk', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione degli orari',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/orari-ambulatorio/copy
 * @desc Copia orari da un ambulatorio all'altro
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.post('/orari-ambulatorio/copy',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    clinicalValidators.orarioAmbulatorio.copySchedule,
    auditClinico('copy_schedule'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { fromAmbulatorioId, toAmbulatorioId } = req.body;

            const result = await OrarioAmbulatorioService.copySchedule(
                fromAmbulatorioId,
                toAmbulatorioId,
                tenantId
            );

            res.status(201).json({
                success: true,
                data: result,
                message: `Copiati ${result.created.length} orari, ${result.skipped.length} saltati`
            });
        } catch (error) {
            logger.error('Failed to copy schedule', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella copia degli orari',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/orari-ambulatorio/:id
 * @desc Dettaglio orario ambulatorio
 * @access Authenticated + VIEW_AMBULATORI
 */
router.get('/orari-ambulatorio/:id',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'read'),
    clinicalValidators.params.id,
    auditClinico('get_orario_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const orario = await OrarioAmbulatorioService.getById(req.params.id, tenantId);

            if (!orario) {
                return res.status(404).json({
                    success: false,
                    error: 'Orario non trovato'
                });
            }

            res.json({
                success: true,
                data: orario
            });
        } catch (error) {
            logger.error('Failed to get orario ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                orarioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dell\'orario',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/orari-ambulatorio/:id
 * @desc Aggiorna orario ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.put('/orari-ambulatorio/:id',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    clinicalValidators.params.id,
    clinicalValidators.orarioAmbulatorio.update,
    auditClinico('update_orario_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const orario = await OrarioAmbulatorioService.update(req.params.id, req.body, tenantId);

            res.json({
                success: true,
                data: orario,
                message: 'Orario aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update orario ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                orarioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 :
                error.message.includes('sovrapposto') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento dell\'orario',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/orari-ambulatorio/:id/toggle
 * @desc Attiva/Disattiva orario ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.post('/orari-ambulatorio/:id/toggle',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    clinicalValidators.params.id,
    auditClinico('toggle_orario_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const orario = await OrarioAmbulatorioService.toggleActive(req.params.id, tenantId);

            res.json({
                success: true,
                data: orario,
                message: `Orario ${orario.isActive ? 'attivato' : 'disattivato'} con successo`
            });
        } catch (error) {
            logger.error('Failed to toggle orario ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                orarioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nel cambio stato dell\'orario',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/orari-ambulatorio/:id
 * @desc Elimina orario ambulatorio (soft delete)
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.delete('/orari-ambulatorio/:id',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    clinicalValidators.params.id,
    auditClinico('delete_orario_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            await OrarioAmbulatorioService.delete(req.params.id, tenantId);

            res.json({
                success: true,
                message: 'Orario eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete orario ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                orarioId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovato') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione dell\'orario',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/orari-ambulatorio/ambulatorio/:ambulatorioId
 * @desc Elimina tutti gli orari di un ambulatorio
 * @access Authenticated + MANAGE_AMBULATORI
 */
router.delete('/orari-ambulatorio/ambulatorio/:ambulatorioId',
    authenticateToken(),
    checkAdvancedPermission('ambulatori', 'update'),
    auditClinico('delete_all_orari_ambulatorio'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await OrarioAmbulatorioService.deleteByAmbulatorio(req.params.ambulatorioId, tenantId);

            res.json({
                success: true,
                data: result,
                message: `Eliminati ${result.deleted} orari`
            });
        } catch (error) {
            logger.error('Failed to delete orari by ambulatorio', {
                component: 'clinica-routes',
                error: error.message,
                ambulatorioId: req.params.ambulatorioId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione degli orari',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/orari-ambulatorio/check-hours
 * @desc Verifica se un orario è negli orari di apertura
 * @access Authenticated
 */
router.post('/orari-ambulatorio/check-hours',
    authenticateToken(),
    auditClinico('check_within_hours'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { ambulatorioId, datetime } = req.body;

            if (!ambulatorioId || !datetime) {
                return res.status(400).json({
                    success: false,
                    error: 'ambulatorioId e datetime sono obbligatori'
                });
            }

            const result = await OrarioAmbulatorioService.isWithinHours(ambulatorioId, datetime, tenantId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to check within hours', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella verifica degli orari',
                message: error.message
            });
        }
    }
);

// ============================================
// TEMPLATE CAMPI VISITA ROUTES
// Gestione campi dinamici per form visite
// ============================================

/**
 * @route GET /api/v1/clinica/template-campi
 * @desc Lista tutti i template campi visita del tenant
 * @access Authenticated
 */
router.get('/template-campi',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.query,
    auditClinico('list_template_campi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const filters = {
                tipo: req.query.tipo,
                obbligatorio: req.query.obbligatorio === 'true' ? true : req.query.obbligatorio === 'false' ? false : undefined,
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                search: req.query.search,
                prestazioneId: req.query.prestazioneId
            };
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };

            const result = await TemplateCampoVisitaService.getAll(tenantId, filters, pagination);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list template campi', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei template campi',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/template-campi/prestazione/:prestazioneId
 * @desc Lista campi per una prestazione specifica
 * @access Authenticated
 */
router.get('/template-campi/prestazione/:prestazioneId',
    authenticateToken(),
    auditClinico('get_template_campi_by_prestazione'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { prestazioneId } = req.params;
            const onlyActive = req.query.onlyActive !== 'false';

            const campi = await TemplateCampoVisitaService.getByPrestazione(prestazioneId, tenantId, { onlyActive });

            res.json({
                success: true,
                data: campi
            });
        } catch (error) {
            logger.error('Failed to get template campi by prestazione', {
                component: 'clinica-routes',
                error: error.message,
                prestazioneId: req.params.prestazioneId,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei campi',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/template-campi/stats
 * @desc Statistiche sui template campi
 * @access Authenticated
 */
router.get('/template-campi/stats',
    authenticateToken(),
    auditClinico('get_template_campi_stats'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const stats = await TemplateCampoVisitaService.getStats(tenantId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get template campi stats', {
                component: 'clinica-routes',
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
 * @route GET /api/v1/clinica/template-campi/:id
 * @desc Dettaglio singolo campo
 * @access Authenticated
 */
router.get('/template-campi/:id',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('get_template_campo'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const campo = await TemplateCampoVisitaService.getById(id, tenantId);

            if (!campo) {
                return res.status(404).json({
                    success: false,
                    error: 'Campo non trovato'
                });
            }

            res.json({
                success: true,
                data: campo
            });
        } catch (error) {
            logger.error('Failed to get template campo', {
                component: 'clinica-routes',
                error: error.message,
                campoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del campo',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/template-campi
 * @desc Crea nuovo campo
 * @access Authenticated + Permission
 */
router.post('/template-campi',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.create,
    auditClinico('create_template_campo'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;

            const campo = await TemplateCampoVisitaService.create(
                { ...req.body, tenantId },
                userId
            );

            res.status(201).json({
                success: true,
                data: campo,
                message: 'Campo creato con successo'
            });
        } catch (error) {
            logger.error('Failed to create template campo', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 :
                error.message.includes('già esistente') || error.message.includes('richiedono') ? 400 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione del campo',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/template-campi/bulk
 * @desc Crea campi in bulk
 * @access Authenticated + Permission
 */
router.post('/template-campi/bulk',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.bulkCreate,
    auditClinico('bulk_create_template_campi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { prestazioneId, campi } = req.body;

            const createdCampi = await TemplateCampoVisitaService.bulkCreate(prestazioneId, campi, tenantId, userId);

            res.status(201).json({
                success: true,
                data: createdCampi,
                message: `${campi.length} campi creati con successo`
            });
        } catch (error) {
            logger.error('Failed to bulk create template campi', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione bulk dei campi',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/template-campi/:id
 * @desc Aggiorna campo
 * @access Authenticated + Permission
 */
router.put('/template-campi/:id',
    authenticateToken(),
    clinicalValidators.params.id,
    clinicalValidators.templateCampoVisita.update,
    auditClinico('update_template_campo'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { id } = req.params;

            const campo = await TemplateCampoVisitaService.update(id, req.body, tenantId, userId);

            res.json({
                success: true,
                data: campo,
                message: 'Campo aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update template campo', {
                component: 'clinica-routes',
                error: error.message,
                campoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 :
                error.message.includes('già esistente') ? 400 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento del campo',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/template-campi/:id
 * @desc Elimina campo (soft delete)
 * @access Authenticated + Permission
 */
router.delete('/template-campi/:id',
    authenticateToken(),
    clinicalValidators.params.id,
    auditClinico('delete_template_campo'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { id } = req.params;

            await TemplateCampoVisitaService.delete(id, tenantId, userId);

            res.json({
                success: true,
                message: 'Campo eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete template campo', {
                component: 'clinica-routes',
                error: error.message,
                campoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione del campo',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/template-campi/reorder
 * @desc Riordina campi di una prestazione
 * @access Authenticated + Permission
 */
router.post('/template-campi/reorder',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.reorder,
    auditClinico('reorder_template_campi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { prestazioneId, ordini } = req.body;

            const campi = await TemplateCampoVisitaService.reorder(prestazioneId, ordini, tenantId, userId);

            res.json({
                success: true,
                data: campi,
                message: 'Campi riordinati con successo'
            });
        } catch (error) {
            logger.error('Failed to reorder template campi', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel riordinamento dei campi',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/template-campi/duplicate
 * @desc Duplica template da una prestazione all'altra
 * @access Authenticated + Permission
 */
router.post('/template-campi/duplicate',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.duplicate,
    auditClinico('duplicate_template_campi'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { sourcePrestazioneId, targetPrestazioneId } = req.body;

            const campi = await TemplateCampoVisitaService.duplicateTemplate(
                sourcePrestazioneId,
                targetPrestazioneId,
                tenantId,
                userId
            );

            res.status(201).json({
                success: true,
                data: campi,
                message: 'Template duplicato con successo'
            });
        } catch (error) {
            logger.error('Failed to duplicate template', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') ? 404 :
                error.message.includes('non ha campi') ? 400 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nella duplicazione del template',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/template-campi/validate
 * @desc Valida un valore per un campo
 * @access Authenticated
 */
router.post('/template-campi/validate',
    authenticateToken(),
    clinicalValidators.templateCampoVisita.validateValue,
    auditClinico('validate_campo_value'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { campoId, valore } = req.body;

            const result = await TemplateCampoVisitaService.validateValue(campoId, valore, tenantId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to validate campo value', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella validazione',
                message: error.message
            });
        }
    }
);

// ============================================
// DOCUMENTI CLINICI ROUTES
// Gestione allegati visite e referti
// ============================================

/**
 * @route GET /api/v1/clinica/documenti/storage-stats
 * @desc Statistiche storage documenti
 * @access Authenticated
 */
router.get('/documenti/storage-stats',
    authenticateToken(),
    auditClinico('get_storage_stats'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const stats = await DocumentoClinicoService.getStorageStats(tenantId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Failed to get storage stats', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle statistiche storage',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/documenti/visita/:visitaId
 * @desc Lista allegati per visita
 * @access Authenticated
 */
router.get('/documenti/visita/:visitaId',
    authenticateToken(),
    auditClinico('list_allegati_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { visitaId } = req.params;

            const allegati = await DocumentoClinicoService.getAllegatiVisita(visitaId, tenantId);

            res.json({
                success: true,
                data: allegati
            });
        } catch (error) {
            logger.error('Failed to list allegati visita', {
                component: 'clinica-routes',
                error: error.message,
                visitaId: req.params.visitaId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nel recupero degli allegati',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/documenti/referto/:refertoId
 * @desc Lista allegati per referto
 * @access Authenticated
 */
router.get('/documenti/referto/:refertoId',
    authenticateToken(),
    auditClinico('list_allegati_referto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { refertoId } = req.params;

            const allegati = await DocumentoClinicoService.getAllegatiReferto(refertoId, tenantId);

            res.json({
                success: true,
                data: allegati
            });
        } catch (error) {
            logger.error('Failed to list allegati referto', {
                component: 'clinica-routes',
                error: error.message,
                refertoId: req.params.refertoId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nel recupero degli allegati',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/documenti/visita/upload
 * @desc Upload allegato visita (multipart/form-data)
 * @access Authenticated + Permission
 * @body file - File da caricare (campo 'file')
 * @body visitaId - ID della visita
 * @body tipo - Tipo allegato (document, image, dicom, lab_result, trace, other)
 * @body descrizione - Descrizione opzionale
 */
router.post('/documenti/visita/upload',
    authenticateToken(),
    createUploadConfig('clinical').single('file'),
    multerErrorHandler,
    auditClinico('upload_allegato_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { visitaId, tipo, descrizione } = req.body;
            const file = req.file;

            // Validazione input
            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: 'File obbligatorio',
                    message: 'Nessun file caricato. Inviare file nel campo "file".'
                });
            }

            if (!visitaId) {
                // Rimuovi file se validazione fallisce
                await fs.unlink(file.path).catch(() => { });
                return res.status(400).json({
                    success: false,
                    error: 'visitaId obbligatorio',
                    message: 'Specificare l\'ID della visita.'
                });
            }

            if (!tipo || !['document', 'image', 'dicom', 'lab_result', 'trace', 'other'].includes(tipo)) {
                await fs.unlink(file.path).catch(() => { });
                return res.status(400).json({
                    success: false,
                    error: 'tipo non valido',
                    message: 'Tipo deve essere: document, image, dicom, lab_result, trace, other'
                });
            }

            // Leggi file dal disco
            const fileBuffer = await fs.readFile(file.path);

            // Upload tramite service
            const allegato = await DocumentoClinicoService.uploadAllegatoVisita({
                visitaId,
                tipo,
                nome: file.originalname,
                descrizione: descrizione || null,
                buffer: fileBuffer,
                mimeType: file.mimetype
            }, tenantId, userId);

            // Rimuovi file temporaneo dopo upload
            await fs.unlink(file.path).catch(() => { });

            res.status(201).json({
                success: true,
                data: allegato,
                message: 'Allegato caricato con successo'
            });
        } catch (error) {
            // Rimuovi file temporaneo in caso di errore
            if (req.file) {
                await fs.unlink(req.file.path).catch(() => { });
            }

            logger.error('Failed to upload allegato visita', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'upload del file',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/documenti/referto/upload
 * @desc Upload allegato referto (multipart/form-data)
 * @access Authenticated + Permission
 * @body file - File da caricare (campo 'file')
 * @body refertoId - ID del referto
 * @body tipo - Tipo allegato (document, image, dicom, lab_result, trace, other)
 * @body descrizione - Descrizione opzionale
 */
router.post('/documenti/referto/upload',
    authenticateToken(),
    createUploadConfig('clinical').single('file'),
    multerErrorHandler,
    auditClinico('upload_allegato_referto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { refertoId, tipo, descrizione } = req.body;
            const file = req.file;

            // Validazione input
            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: 'File obbligatorio',
                    message: 'Nessun file caricato. Inviare file nel campo "file".'
                });
            }

            if (!refertoId) {
                await fs.unlink(file.path).catch(() => { });
                return res.status(400).json({
                    success: false,
                    error: 'refertoId obbligatorio',
                    message: 'Specificare l\'ID del referto.'
                });
            }

            if (!tipo || !['document', 'image', 'dicom', 'lab_result', 'trace', 'other'].includes(tipo)) {
                await fs.unlink(file.path).catch(() => { });
                return res.status(400).json({
                    success: false,
                    error: 'tipo non valido',
                    message: 'Tipo deve essere: document, image, dicom, lab_result, trace, other'
                });
            }

            // Leggi file dal disco
            const fileBuffer = await fs.readFile(file.path);

            // Upload tramite service
            const allegato = await DocumentoClinicoService.uploadAllegatoReferto({
                refertoId,
                tipo,
                nome: file.originalname,
                descrizione: descrizione || null,
                buffer: fileBuffer,
                mimeType: file.mimetype
            }, tenantId, userId);

            // Rimuovi file temporaneo dopo upload
            await fs.unlink(file.path).catch(() => { });

            res.status(201).json({
                success: true,
                data: allegato,
                message: 'Allegato caricato con successo'
            });
        } catch (error) {
            // Rimuovi file temporaneo in caso di errore
            if (req.file) {
                await fs.unlink(req.file.path).catch(() => { });
            }

            logger.error('Failed to upload allegato referto', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 :
                error.message.includes('firmato') ? 403 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'upload del file',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/documenti/visita/download/:allegatoId
 * @desc Download allegato visita
 * @access Authenticated
 */
router.get('/documenti/visita/download/:allegatoId',
    authenticateToken(),
    auditClinico('download_allegato_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { allegatoId } = req.params;

            const result = await DocumentoClinicoService.downloadAllegatoVisita(allegatoId, tenantId, userId);

            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
            res.setHeader('Content-Length', result.size);

            res.send(result.buffer);
        } catch (error) {
            logger.error('Failed to download allegato visita', {
                component: 'clinica-routes',
                error: error.message,
                allegatoId: req.params.allegatoId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nel download del file',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/documenti/referto/download/:allegatoId
 * @desc Download allegato referto
 * @access Authenticated
 */
router.get('/documenti/referto/download/:allegatoId',
    authenticateToken(),
    auditClinico('download_allegato_referto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { allegatoId } = req.params;

            const result = await DocumentoClinicoService.downloadAllegatoReferto(allegatoId, tenantId, userId);

            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
            res.setHeader('Content-Length', result.size);

            res.send(result.buffer);
        } catch (error) {
            logger.error('Failed to download allegato referto', {
                component: 'clinica-routes',
                error: error.message,
                allegatoId: req.params.allegatoId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nel download del file',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/documenti/visita/:allegatoId
 * @desc Elimina allegato visita (soft delete)
 * @access Authenticated + Permission
 */
router.delete('/documenti/visita/:allegatoId',
    authenticateToken(),
    auditClinico('delete_allegato_visita'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { allegatoId } = req.params;

            await DocumentoClinicoService.deleteAllegatoVisita(allegatoId, tenantId, userId);

            res.json({
                success: true,
                message: 'Allegato eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete allegato visita', {
                component: 'clinica-routes',
                error: error.message,
                allegatoId: req.params.allegatoId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione dell\'allegato',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/documenti/referto/:allegatoId
 * @desc Elimina allegato referto (soft delete)
 * @access Authenticated + Permission
 */
router.delete('/documenti/referto/:allegatoId',
    authenticateToken(),
    auditClinico('delete_allegato_referto'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const userId = req.person.id;
            const { allegatoId } = req.params;

            await DocumentoClinicoService.deleteAllegatoReferto(allegatoId, tenantId, userId);

            res.json({
                success: true,
                message: 'Allegato eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete allegato referto', {
                component: 'clinica-routes',
                error: error.message,
                allegatoId: req.params.allegatoId,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') || error.message.includes('non autorizzat') ? 404 :
                error.message.includes('firmato') ? 403 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione dell\'allegato',
                message: error.message
            });
        }
    }
);

// ============================================
// FATTURE SANITARIE ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/fatture
 * @desc Lista tutte le fatture sanitarie del tenant
 * @access Authenticated + VIEW_FATTURE
 */
router.get('/fatture',
    authenticateToken(),
    checkAdvancedPermission('fatture', 'read'),
    auditClinico('list_fatture'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, stato, dataInizio, dataFine } = req.query;

            const result = await FatturaSanitariaService.getAll(tenantId, {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                stato,
                dataInizio,
                dataFine
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Failed to list fatture', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle fatture',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fatture/:id
 * @desc Dettaglio fattura sanitaria
 * @access Authenticated + VIEW_FATTURE
 */
router.get('/fatture/:id',
    authenticateToken(),
    checkAdvancedPermission('fatture', 'read'),
    auditClinico('get_fattura'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const fattura = await FatturaSanitariaService.getById(id, tenantId);

            if (!fattura) {
                return res.status(404).json({
                    success: false,
                    error: 'Fattura non trovata'
                });
            }

            res.json({
                success: true,
                data: fattura
            });
        } catch (error) {
            logger.error('Failed to get fattura', {
                component: 'clinica-routes',
                error: error.message,
                fatturaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della fattura',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/fatture
 * @desc Crea nuova fattura sanitaria
 * @access Authenticated + CREATE_FATTURE
 */
router.post('/fatture',
    authenticateToken(),
    checkAdvancedPermission('fatture', 'create'),
    auditClinico('create_fattura'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person.id;

            const fattura = await FatturaSanitariaService.create({
                ...req.body,
                tenantId,
                createdBy
            });

            res.status(201).json({
                success: true,
                data: fattura,
                message: 'Fattura creata con successo'
            });
        } catch (error) {
            logger.error('Failed to create fattura', {
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('già esistente') ? 409 :
                error.message.includes('non trovat') ? 404 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione della fattura',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/fatture/:id
 * @desc Aggiorna fattura sanitaria
 * @access Authenticated + UPDATE_FATTURE
 */
router.put('/fatture/:id',
    authenticateToken(),
    checkAdvancedPermission('fatture', 'update'),
    auditClinico('update_fattura'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const fattura = await FatturaSanitariaService.update(id, tenantId, req.body);

            res.json({
                success: true,
                data: fattura,
                message: 'Fattura aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update fattura', {
                component: 'clinica-routes',
                error: error.message,
                fatturaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') ? 404 :
                error.message.includes('Cannot update') ? 403 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'aggiornamento della fattura',
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/fatture/:id
 * @desc Elimina fattura sanitaria (soft delete)
 * @access Authenticated + DELETE_FATTURE
 */
router.delete('/fatture/:id',
    authenticateToken(),
    checkAdvancedPermission('fatture', 'delete'),
    auditClinico('delete_fattura'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            await FatturaSanitariaService.delete(id, tenantId);

            res.json({
                success: true,
                message: 'Fattura eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete fattura', {
                component: 'clinica-routes',
                error: error.message,
                fatturaId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            const statusCode = error.message.includes('non trovat') ? 404 :
                error.message.includes('Cannot delete') ? 403 : 500;

            res.status(statusCode).json({
                success: false,
                error: 'Errore nell\'eliminazione della fattura',
                message: error.message
            });
        }
    }
);

// ============================================
// PAZIENTI ROUTES
// Import routes pazienti per integrazione Person/CF
// ============================================
import pazienteRoutes from './paziente-routes.js';
router.use('/pazienti', pazienteRoutes);

// ============================================
// SEDI POLIAMBULATORIO ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/sedi
 * @desc Lista tutte le sedi del tenant
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/sedi',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle sedi',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/sedi/:id
 * @desc Ottiene una sede per ID
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/sedi/:id',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                sedeId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della sede',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/sedi
 * @desc Crea una nuova sede
 * @access Authenticated + CREATE_POLIAMBULATORIO
 */
router.post('/sedi',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della sede',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/sedi/:id
 * @desc Aggiorna una sede
 * @access Authenticated + UPDATE_POLIAMBULATORIO
 */
router.put('/sedi/:id',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
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
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/sedi/:id
 * @desc Elimina una sede (soft delete)
 * @access Authenticated + DELETE_POLIAMBULATORIO
 */
router.delete('/sedi/:id',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
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
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/sedi/:id/principale
 * @desc Imposta una sede come principale
 * @access Authenticated + UPDATE_POLIAMBULATORIO
 */
router.put('/sedi/:id/principale',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                sedeId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'impostazione della sede principale',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/sedi/:id/stats
 * @desc Statistiche di una sede
 * @access Authenticated + VIEW_POLIAMBULATORIO
 */
router.get('/sedi/:id/stats',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                sedeId: req.params.id,
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

// ============================================
// MANUTENZIONI STRUMENTI ROUTES
// ============================================

/**
 * @route GET /api/v1/clinica/manutenzioni
 * @desc Lista tutte le manutenzioni
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/manutenzioni',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle manutenzioni',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/manutenzioni/scadenza
 * @desc Manutenzioni in scadenza
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/manutenzioni/scadenza',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle manutenzioni in scadenza',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/manutenzioni/stats
 * @desc Statistiche manutenzioni
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/manutenzioni/stats',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle statistiche manutenzioni',
                message: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/clinica/manutenzioni/:id
 * @desc Ottiene una manutenzione per ID
 * @access Authenticated + VIEW_STRUMENTI
 */
router.get('/manutenzioni/:id',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                manutenzioneId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della manutenzione',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/manutenzioni
 * @desc Crea una nuova manutenzione
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.post('/manutenzioni',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della manutenzione',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/v1/clinica/manutenzioni/ricorrente
 * @desc Crea manutenzioni ricorrenti
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.post('/manutenzioni/ricorrente',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione delle manutenzioni ricorrenti',
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/manutenzioni/:id
 * @desc Aggiorna una manutenzione
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.put('/manutenzioni/:id',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
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
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/manutenzioni/:id/completa
 * @desc Completa una manutenzione
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.put('/manutenzioni/:id/completa',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
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
                message: error.message
            });
        }
    }
);

/**
 * @route PUT /api/v1/clinica/manutenzioni/:id/annulla
 * @desc Annulla una manutenzione
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.put('/manutenzioni/:id/annulla',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
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
                message: error.message
            });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/manutenzioni/:id
 * @desc Elimina una manutenzione (soft delete)
 * @access Authenticated + UPDATE_STRUMENTI
 */
router.delete('/manutenzioni/:id',
    authenticateToken(),
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
                component: 'clinica-routes',
                error: error.message,
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
                message: error.message
            });
        }
    }
);

// ============================================
// ERROR HANDLER
// ============================================

router.use((error, req, res, next) => {
    logger.error('Unhandled error in clinica routes', {
        component: 'clinica-routes',
        error: error.message,
        stack: error.stack,
        path: req.originalUrl,
        method: req.method,
        userId: req.person?.id,
        tenantId: getEffectiveTenantId(req)
    });

    res.status(500).json({
        success: false,
        error: 'Errore interno del server',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Si è verificato un errore'
    });
});

export default router;
