/**
 * P68 - Assenze Routes
 * Gestione richieste ferie, malattie, permessi
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import prisma from '../../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { validateParamId } from '../../middleware/validateUUID.js';


const router = express.Router();
router.param('id', validateParamId);

/**
 * Calcola i giorni lavorativi tra due date (esclusi weekend)
 */
function calcolaGiorniTotali(dataInizio, dataFine) {
    const inizio = new Date(dataInizio);
    const fine = new Date(dataFine);
    let giorni = 0;

    for (let d = new Date(inizio); d <= fine; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            giorni++;
        }
    }

    return giorni;
}

/**
 * GET /api/v1/hr/assenze
 * Lista assenze con filtri
 */
router.get('/',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const userTenantId = getEffectiveTenantId(req);
            const {
                profiloHRId,
                tipo,
                stato,
                dataInizio,
                dataFine,
                page = 1,
                limit = 50,
                tenantIds,
                allTenants
            } = req.query;

            // P69: Determine which tenants to query
            let targetTenantIds = [userTenantId];

            // Admin can see other tenants via tenantIds param
            const isAdmin = req.person.roles?.some(r => ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(r));

            if (isAdmin && tenantIds) {
                // Parse comma-separated tenantIds
                targetTenantIds = tenantIds.split(',').filter(Boolean);
            } else if (isAdmin && allTenants === 'true') {
                // Get all accessible tenants for this admin
                const accessibleTenants = await prisma.personTenantAccess.findMany({
                    where: { personId: req.person.id, deletedAt: null },
                    select: { tenantId: true }
                });
                targetTenantIds = accessibleTenants.map(t => t.tenantId);
                // Always include user's own tenant
                if (!targetTenantIds.includes(userTenantId)) {
                    targetTenantIds.push(userTenantId);
                }
            }

            const where = {
                tenantId: { in: targetTenantIds },
                deletedAt: null
            };

            if (profiloHRId) where.profiloHRId = profiloHRId;
            if (tipo) where.tipo = tipo;
            if (stato) where.stato = stato;

            if (dataInizio || dataFine) {
                where.OR = [];
                if (dataInizio) {
                    where.OR.push({ dataFine: { gte: new Date(dataInizio) } });
                }
                if (dataFine) {
                    where.OR.push({ dataInizio: { lte: new Date(dataFine) } });
                }
            }

            const [assenze, total] = await Promise.all([
                prisma.assenza.findMany({
                    where,
                    include: {
                        profiloHR: {
                            include: {
                                personTenantProfile: {
                                    include: {
                                        person: {
                                            select: {
                                                id: true,
                                                firstName: true,
                                                lastName: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { dataInizio: 'desc' },
                    skip: (parseInt(page) - 1) * parseInt(limit),
                    take: parseInt(limit)
                }),
                prisma.assenza.count({ where })
            ]);

            res.json({
                success: true,
                data: assenze,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            logger.error('Failed to list assenze', {
                component: 'hr-assenze-routes',
                action: 'list',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /api/v1/hr/assenze/mie
 * Le mie richieste di assenza
 */
router.get('/mie',
    authenticate,
    async (req, res) => {
        try {
            const personId = req.person.id;
            const tenantId = getEffectiveTenantId(req);
            const { anno } = req.query;

            // Trova profilo HR
            const profiloHR = await prisma.profiloHR.findFirst({
                where: {
                    tenantId,
                    deletedAt: null,
                    personTenantProfile: {
                        personId,
                        tenantId,
                        deletedAt: null
                    }
                }
            });

            if (!profiloHR) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'Nessun profilo HR configurato'
                });
            }

            const where = {
                profiloHRId: profiloHR.id,
                deletedAt: null
            };

            if (anno) {
                const annoInt = parseInt(anno);
                where.dataInizio = {
                    gte: new Date(annoInt, 0, 1),
                    lte: new Date(annoInt, 11, 31)
                };
            }

            const assenze = await prisma.assenza.findMany({
                where,
                orderBy: { dataInizio: 'desc' }
            });

            res.json({
                success: true,
                data: assenze,
                count: assenze.length
            });
        } catch (error) {
            logger.error('Failed to get mie assenze', {
                component: 'hr-assenze-routes',
                action: 'getMie',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /api/v1/hr/assenze/calendario
 * Calendario assenze team (per supervisori)
 */
router.get('/calendario',
    authenticate,
    requirePermission('hr.assenze:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { anno, mese } = req.query;

            const annoInt = anno ? parseInt(anno) : new Date().getFullYear();
            const meseInt = mese ? parseInt(mese) : new Date().getMonth() + 1;

            const dataInizio = new Date(annoInt, meseInt - 1, 1);
            const dataFine = new Date(annoInt, meseInt, 0);

            const assenze = await prisma.assenza.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    stato: 'APPROVATA',
                    OR: [
                        {
                            dataInizio: { lte: dataFine },
                            dataFine: { gte: dataInizio }
                        }
                    ]
                },
                include: {
                    profiloHR: {
                        include: {
                            personTenantProfile: {
                                include: {
                                    person: {
                                        select: {
                                            id: true,
                                            firstName: true,
                                            lastName: true,
                                            profileImage: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { dataInizio: 'asc' }
            });

            res.json({
                success: true,
                data: {
                    anno: annoInt,
                    mese: meseInt,
                    assenze
                }
            });
        } catch (error) {
            logger.error('Failed to get calendario assenze', {
                component: 'hr-assenze-routes',
                action: 'getCalendario',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /api/v1/hr/assenze
 * Richiedi assenza (ferie, permesso, etc.)
 */
router.post('/',
    authenticate,
    async (req, res) => {
        try {
            const personId = req.person.id;
            const tenantId = getEffectiveTenantId(req);
            const {
                profiloHRId: requestedProfiloHRId,
                tipo,
                dataInizio,
                dataFine,
                isGiornataIntera,
                oraInizio,
                oraFine,
                motivazione,
                certificatoMedico
            } = req.body;

            if (!tipo || !dataInizio || !dataFine) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'tipo, dataInizio e dataFine sono obbligatori'
                });
            }

            let profiloHR;

            if (requestedProfiloHRId) {
                // Admin/Manager crea assenza per un dipendente specifico
                const isAdmin = req.person.roles?.some(r => ['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'].includes(r));
                const hasPermission = req.person.permissions?.includes('hr.assenze:manage');
                if (!isAdmin && !hasPermission) {
                    return res.status(403).json({
                        success: false,
                        error: 'Accesso negato',
                        message: 'Non autorizzato a creare assenze per altri dipendenti'
                    });
                }
                profiloHR = await prisma.profiloHR.findFirst({
                    where: {
                        id: requestedProfiloHRId,
                        tenantId,
                        deletedAt: null
                    }
                });
            } else {
                // Self-service: dipendente richiede per sé
                profiloHR = await prisma.profiloHR.findFirst({
                    where: {
                        tenantId,
                        deletedAt: null,
                        personTenantProfile: {
                            personId,
                            tenantId,
                            deletedAt: null
                        }
                    }
                });
            }

            if (!profiloHR) {
                return res.status(403).json({
                    success: false,
                    error: 'Accesso negato',
                    message: 'Profilo HR non configurato'
                });
            }

            // Calcola giorni totali
            const giornataIntera = isGiornataIntera !== false;
            let giorniTotali = calcolaGiorniTotali(dataInizio, dataFine);

            // Se mezza giornata, dimezza
            if (!giornataIntera) {
                giorniTotali = giorniTotali * 0.5;
            }

            // Verifica disponibilità ferie/permessi
            if (['FERIE', 'PERMESSO_ROL', 'PERMESSO_EX_FESTIVITA'].includes(tipo)) {
                const saldoFerie = Number(profiloHR.giorniFerieMaturati) - Number(profiloHR.giorniFerieUsufruiti);
                const saldoPermessi = Number(profiloHR.giorniPermessoMaturati) - Number(profiloHR.giorniPermessoUsufruiti);

                if (tipo === 'FERIE' && giorniTotali > saldoFerie) {
                    return res.status(400).json({
                        success: false,
                        error: 'Errore di validazione',
                        message: `Ferie insufficienti: richiesti ${giorniTotali}, disponibili ${saldoFerie}`
                    });
                }

                if (['PERMESSO_ROL', 'PERMESSO_EX_FESTIVITA'].includes(tipo) && giorniTotali > saldoPermessi) {
                    return res.status(400).json({
                        success: false,
                        error: 'Errore di validazione',
                        message: `Permessi insufficienti: richiesti ${giorniTotali}, disponibili ${saldoPermessi}`
                    });
                }
            }

            // Verifica sovrapposizione con altre assenze
            const sovrapposizione = await prisma.assenza.findFirst({
                where: {
                    profiloHRId: profiloHR.id,
                    deletedAt: null,
                    stato: { in: ['IN_ATTESA', 'APPROVATA'] },
                    OR: [
                        {
                            dataInizio: { lte: new Date(dataFine) },
                            dataFine: { gte: new Date(dataInizio) }
                        }
                    ]
                }
            });

            if (sovrapposizione) {
                return res.status(409).json({
                    success: false,
                    error: 'Conflitto',
                    message: 'Esiste già un\'assenza sovrapposta per questo periodo'
                });
            }

            const assenza = await prisma.assenza.create({
                data: {
                    profiloHRId: profiloHR.id,
                    tenantId,
                    tipo,
                    dataInizio: new Date(dataInizio),
                    dataFine: new Date(dataFine),
                    isGiornataIntera: giornataIntera,
                    oraInizio: !giornataIntera ? oraInizio : null,
                    oraFine: !giornataIntera ? oraFine : null,
                    giorniTotali,
                    motivazione,
                    certificatoMedico,
                    stato: 'IN_ATTESA'
                }
            });

            logger.info('Assenza richiesta', {
                component: 'hr-assenze-routes',
                action: 'create',
                assenzaId: assenza.id,
                tipo,
                giorniTotali,
                profiloHRId: profiloHR.id,
                tenantId
            });

            res.status(201).json({
                success: true,
                data: assenza,
                message: 'Richiesta di assenza inviata, in attesa di approvazione'
            });
        } catch (error) {
            logger.error('Failed to create assenza', {
                component: 'hr-assenze-routes',
                action: 'create',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /api/v1/hr/assenze/:id/approva
 * Approva richiesta assenza
 */
router.post('/:id/approva',
    authenticate,
    requirePermission('hr.assenze:approve'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const assenza = await prisma.assenza.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    profiloHR: true
                }
            });

            if (!assenza) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            if (assenza.stato !== 'IN_ATTESA') {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'L\'assenza non è in attesa di approvazione'
                });
            }

            // Aggiorna assenza
            const updated = await prisma.assenza.update({
                where: { id },
                data: {
                    stato: 'APPROVATA',
                    approvatoDa: req.person.id,
                    approvatoAt: new Date()
                }
            });

            // Aggiorna saldo ferie/permessi se applicabile
            if (['FERIE', 'PERMESSO_ROL', 'PERMESSO_EX_FESTIVITA'].includes(assenza.tipo)) {
                const updateField = assenza.tipo === 'FERIE'
                    ? 'giorniFerieUsufruiti'
                    : 'giorniPermessoUsufruiti';

                await prisma.profiloHR.update({
                    where: { id: assenza.profiloHRId },
                    data: {
                        [updateField]: {
                            increment: assenza.giorniTotali
                        }
                    }
                });
            }

            logger.info('Assenza approvata', {
                component: 'hr-assenze-routes',
                action: 'approve',
                assenzaId: id,
                approvatoDa: req.person.id,
                tenantId
            });

            res.json({
                success: true,
                data: updated,
                message: 'Assenza approvata con successo'
            });
        } catch (error) {
            logger.error('Failed to approve assenza', {
                component: 'hr-assenze-routes',
                action: 'approve',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /api/v1/hr/assenze/:id/rifiuta
 * Rifiuta richiesta assenza
 */
router.post('/:id/rifiuta',
    authenticate,
    requirePermission('hr.assenze:approve'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { motivoRifiuto } = req.body;

            if (!motivoRifiuto || motivoRifiuto.length < 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Motivo rifiuto obbligatorio (min 10 caratteri)'
                });
            }

            const assenza = await prisma.assenza.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!assenza) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            if (assenza.stato !== 'IN_ATTESA') {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'L\'assenza non è in attesa di approvazione'
                });
            }

            const updated = await prisma.assenza.update({
                where: { id },
                data: {
                    stato: 'RIFIUTATA',
                    rifiutatoDa: req.person.id,
                    rifiutatoAt: new Date(),
                    motivoRifiuto
                }
            });

            logger.info('Assenza rifiutata', {
                component: 'hr-assenze-routes',
                action: 'reject',
                assenzaId: id,
                rifiutatoDa: req.person.id,
                tenantId
            });

            res.json({
                success: true,
                data: updated,
                message: 'Assenza rifiutata'
            });
        } catch (error) {
            logger.error('Failed to reject assenza', {
                component: 'hr-assenze-routes',
                action: 'reject',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * DELETE /api/v1/hr/assenze/:id
 * Annulla richiesta assenza (solo se in attesa)
 */
router.delete('/:id',
    authenticate,
    async (req, res) => {
        try {
            const personId = req.person.id;
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const assenza = await prisma.assenza.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    profiloHR: {
                        include: {
                            personTenantProfile: true
                        }
                    }
                }
            });

            if (!assenza) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            // Verifica che sia il proprietario, admin o HR manager
            const isOwner = assenza.profiloHR.personTenantProfile.personId === personId;
            const isAdmin = req.person.roles?.some(r =>
                ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(r)
            );
            const isHRManager = req.person.roles?.some(r => r === 'HR_MANAGER');

            if (!isOwner && !isAdmin && !isHRManager) {
                return res.status(403).json({
                    success: false,
                    error: 'Accesso negato',
                    message: 'Non puoi eliminare questa richiesta'
                });
            }

            if (assenza.stato !== 'IN_ATTESA' && !isAdmin && !isHRManager) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Solo le richieste in attesa possono essere annullate'
                });
            }

            await prisma.assenza.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            res.json({
                success: true,
                message: 'Richiesta annullata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete assenza', {
                component: 'hr-assenze-routes',
                action: 'delete',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

export default router;
