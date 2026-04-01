/**
 * Preventivi MDL Routes
 * 
 * Route specifiche per la generazione automatica di preventivi
 * Medicina del Lavoro basati su protocolli sanitari.
 * 
 * @project P58 - Feature Completion
 * @module routes/preventivi/mdl.routes
 */

import express from 'express';
import { body, query } from 'express-validator';
import prisma from '../../config/prisma-optimization.js';
import authMiddleware from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { auditLog } from '../../middleware/audit.js';
import logger from '../../utils/logger.js';
import PreventivoMDLService from '../../services/preventivo-mdl-service.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const { authenticate } = authMiddleware;
const router = express.Router();

/**
 * POST /api/v1/preventivi/generate-mdl
 * 
 * Genera preventivo MDL automatico per azienda basato su:
 * - Sedi selezionate
 * - Mansioni con rischi associati
 * - Protocolli sanitari attivi
 * - Numero lavoratori per mansione
 * 
 * @body {string} companyTenantProfileId - ID profilo azienda
 * @body {string[]} [siteIds] - Sedi da includere (tutte se vuoto)
 * @body {number} [numLavoratori] - Override numero lavoratori
 * @body {string} [tariffarioAziendaId] - ID tariffario convenzione (opzionale)
 * @body {boolean} [includeOnlyObbligatorie=true] - Solo prestazioni obbligatorie
 * @body {number} [validitaGiorni=30] - Giorni validità preventivo
 */
router.post('/generate',
    authenticate,
    requirePermissions(['preventivi:write']),
    [
        body('companyTenantProfileId').isUUID().withMessage('ID azienda richiesto'),
        body('siteIds').optional().isArray(),
        body('siteIds.*').optional().isUUID(),
        body('numLavoratori').optional().isInt({ min: 1 }),
        body('tariffarioAziendaId').optional().isUUID(),
        body('includeOnlyObbligatorie').optional().isBoolean(),
        body('validitaGiorni').optional().isInt({ min: 1, max: 365 }),
    ],
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person.id;
            const {
                companyTenantProfileId,
                siteIds,
                numLavoratori,
                tariffarioAziendaId,
                includeOnlyObbligatorie = true,
                validitaGiorni = 30
            } = req.body;

            // Verifica che l'azienda appartenga al tenant
            const companyProfile = await prisma.companyTenantProfile.findFirst({
                where: {
                    id: companyTenantProfileId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    company: true,
                    sites: {
                        where: { deletedAt: null }
                    }
                }
            });

            if (!companyProfile) {
                return res.status(404).json({
                    success: false,
                    error: 'Azienda non trovata'
                });
            }

            // Genera preventivo
            const result = await PreventivoMDLService.generateFromProtocolli({
                tenantId,
                companyTenantProfileId,
                companyProfile,
                siteIds: siteIds || companyProfile.sites.map(s => s.id),
                numLavoratori,
                tariffarioAziendaId,
                includeOnlyObbligatorie,
                validitaGiorni,
                createdBy: personId
            });

            // Audit log
            await auditLog({
                action: 'PREVENTIVO_MDL_GENERATED',
                entityType: 'Preventivo',
                entityId: result.preventivo.id,
                personId,
                tenantId,
                details: {
                    companyId: companyProfile.company.id,
                    numLavoratori: result.dettaglio.numLavoratori,
                    numPrestazioni: result.dettaglio.prestazioniAggregate.length,
                    importoFinale: result.preventivo.importoFinale
                }
            })(req, res, () => { });

            logger.info({
                component: 'preventivi-mdl',
                action: 'generate',
                preventivoId: result.preventivo.id,
                companyId: companyProfile.company.id,
                tenantId
            }, 'Preventivo MDL generato');

            res.status(201).json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error({
                component: 'preventivi-mdl',
                action: 'generate',
                error: 'Operazione non riuscita',
                stack: error.stack,
                body: req.body
            }, 'Errore generazione preventivo MDL');

            res.status(500).json({
                success: false,
                error: 'Errore durante la generazione del preventivo'
            });
        }
    }
);

/**
 * GET /api/v1/preventivi/mdl/preview
 * 
 * Anteprima preventivo MDL senza salvare.
 * Calcola prestazioni e costi per verifica.
 */
router.get('/preview',
    authenticate,
    requirePermissions(['preventivi:read']),
    [
        query('companyTenantProfileId').isUUID().withMessage('ID azienda richiesto'),
        query('siteIds').optional(),
        query('numLavoratori').optional().isInt({ min: 1 }).toInt(),
        query('tariffarioAziendaId').optional().isUUID(),
    ],
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                companyTenantProfileId,
                numLavoratori,
                tariffarioAziendaId
            } = req.query;

            // Parse siteIds (può essere stringa CSV o array)
            let siteIds = req.query.siteIds;
            if (typeof siteIds === 'string') {
                siteIds = siteIds.split(',').filter(id => id.trim());
            }

            // Verifica azienda
            const companyProfile = await prisma.companyTenantProfile.findFirst({
                where: {
                    id: companyTenantProfileId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    company: true,
                    sites: {
                        where: { deletedAt: null }
                    }
                }
            });

            if (!companyProfile) {
                return res.status(404).json({
                    success: false,
                    error: 'Azienda non trovata'
                });
            }

            // Genera preview (senza salvare)
            const preview = await PreventivoMDLService.calculatePreview({
                tenantId,
                companyTenantProfileId,
                companyProfile,
                siteIds: siteIds?.length ? siteIds : companyProfile.sites.map(s => s.id),
                numLavoratori: numLavoratori ? parseInt(numLavoratori) : undefined,
                tariffarioAziendaId
            });

            res.json({
                success: true,
                data: preview
            });

        } catch (error) {
            logger.error({
                component: 'preventivi-mdl',
                action: 'preview',
                error: 'Operazione non riuscita',
                query: req.query
            }, 'Errore preview preventivo MDL');

            res.status(500).json({
                success: false,
                error: 'Errore durante il calcolo del preview'
            });
        }
    }
);

/**
 * GET /api/v1/preventivi/mdl/aziende
 * 
 * Lista aziende con dati MDL per selezione rapida.
 * Include: sedi, mansioni, numero lavoratori.
 */
router.get('/aziende',
    authenticate,
    requirePermissions(['preventivi:read']),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { search, page = 1, limit = 20 } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const where = {
                tenantId,
                deletedAt: null
            };

            if (search) {
                where.company = {
                    OR: [
                        { ragioneSociale: { contains: search, mode: 'insensitive' } },
                        { piva: { contains: search, mode: 'insensitive' } }
                    ]
                };
            }

            const [aziende, total] = await Promise.all([
                prisma.companyTenantProfile.findMany({
                    where,
                    skip,
                    take: parseInt(limit),
                    include: {
                        company: {
                            select: {
                                id: true,
                                ragioneSociale: true,
                                piva: true
                            }
                        },
                        sites: {
                            where: { deletedAt: null },
                            select: {
                                id: true,
                                siteName: true,
                                citta: true
                            }
                        }
                    },
                    orderBy: {
                        company: { ragioneSociale: 'asc' }
                    }
                }),
                prisma.companyTenantProfile.count({ where })
            ]);

            // Aggrega conteggio mansioni/lavoratori per sede
            const aziendeWithStats = await Promise.all(
                aziende.map(async (azienda) => {
                    const siteStats = await Promise.all(
                        azienda.sites.map(async (site) => {
                            const [mansioniCount, lavoratoriCount] = await Promise.all([
                                prisma.mansione.count({
                                    where: { siteId: site.id, deletedAt: null }
                                }),
                                prisma.personTenantProfile.count({
                                    where: { siteId: site.id, deletedAt: null, isActive: true }
                                })
                            ]);
                            return {
                                ...site,
                                mansioniCount,
                                lavoratoriCount
                            };
                        })
                    );

                    return {
                        ...azienda,
                        sites: siteStats,
                        totaleManzioni: siteStats.reduce((sum, s) => sum + s.mansioniCount, 0),
                        totaleLavoratori: siteStats.reduce((sum, s) => sum + s.lavoratoriCount, 0)
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    aziende: aziendeWithStats,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    total
                }
            });

        } catch (error) {
            logger.error({
                component: 'preventivi-mdl',
                action: 'list-aziende',
                error: 'Operazione non riuscita'
            }, 'Errore lista aziende MDL');

            res.status(500).json({
                success: false,
                error: 'Errore durante il recupero delle aziende'
            });
        }
    }
);

export default router;
