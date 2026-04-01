/**
 * P68 - Cartellini Routes
 * Gestione cartellini mensili del personale
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
 * GET /api/v1/hr/cartellini
 * Lista cartellini con filtri
 */
router.get('/',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const userTenantId = getEffectiveTenantId(req);
            const {
                profiloHRId,
                anno,
                mese,
                stato,
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
                tenantId: { in: targetTenantIds }
            };

            if (profiloHRId) where.profiloHRId = profiloHRId;
            if (anno) where.anno = parseInt(anno);
            if (mese) where.mese = parseInt(mese);
            if (stato) where.stato = stato;

            const [cartellini, total] = await Promise.all([
                prisma.cartellino.findMany({
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
                                },
                                mansioneInterna: {
                                    select: {
                                        id: true,
                                        nome: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: [
                        { anno: 'desc' },
                        { mese: 'desc' }
                    ],
                    skip: (parseInt(page) - 1) * parseInt(limit),
                    take: parseInt(limit)
                }),
                prisma.cartellino.count({ where })
            ]);

            res.json({
                success: true,
                data: cartellini,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            logger.error('Failed to list cartellini', {
                component: 'hr-cartellini-routes',
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
 * GET /api/v1/hr/cartellini/mio
 * Il mio cartellino del mese corrente
 */
router.get('/mio',
    authenticate,
    async (req, res) => {
        try {
            const personId = req.person.id;
            const tenantId = getEffectiveTenantId(req);
            const { anno, mese } = req.query;

            const annoInt = anno ? parseInt(anno) : new Date().getFullYear();
            const meseInt = mese ? parseInt(mese) : new Date().getMonth() + 1;

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
                    data: null,
                    message: 'Nessun profilo HR configurato'
                });
            }

            const cartellino = await prisma.cartellino.findUnique({
                where: {
                    profiloHRId_anno_mese: {
                        profiloHRId: profiloHR.id,
                        anno: annoInt,
                        mese: meseInt
                    }
                }
            });

            res.json({
                success: true,
                data: cartellino
            });
        } catch (error) {
            logger.error('Failed to get mio cartellino', {
                component: 'hr-cartellini-routes',
                action: 'getMio',
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
 * GET /api/v1/hr/cartellini/:id
 * Dettaglio cartellino
 */
router.get('/:id',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const cartellino = await prisma.cartellino.findFirst({
                where: {
                    id,
                    tenantId
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
                                            lastName: true
                                        }
                                    }
                                }
                            },
                            mansioneInterna: true
                        }
                    }
                }
            });

            if (!cartellino) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            res.json({
                success: true,
                data: cartellino
            });
        } catch (error) {
            logger.error('Failed to get cartellino', {
                component: 'hr-cartellini-routes',
                action: 'get',
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
 * POST /api/v1/hr/cartellini/genera
 * Genera/rigenera cartellino per un mese
 */
router.post('/genera',
    authenticate,
    requirePermission('hr.cartellino:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { profiloHRId, anno, mese } = req.body;

            if (!profiloHRId || !anno || !mese) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'profiloHRId, anno e mese sono obbligatori'
                });
            }

            const annoInt = parseInt(anno);
            const meseInt = parseInt(mese);

            // Verifica profilo HR
            const profiloHR = await prisma.profiloHR.findFirst({
                where: {
                    id: profiloHRId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!profiloHR) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Profilo HR non trovato'
                });
            }

            // Date del mese
            const primoGiorno = new Date(annoInt, meseInt - 1, 1);
            const ultimoGiorno = new Date(annoInt, meseInt, 0);
            const giorniMese = ultimoGiorno.getDate();

            // Conta giorni lavorativi nel mese (esclusi weekend)
            let giorniLavorativiMese = 0;
            for (let g = 1; g <= giorniMese; g++) {
                const d = new Date(annoInt, meseInt - 1, g);
                if (d.getDay() !== 0 && d.getDay() !== 6) {
                    giorniLavorativiMese++;
                }
            }

            // Calcola ore previste
            const orePreviste = giorniLavorativiMese * Number(profiloHR.oreGiornaliereStandard);

            // Recupera timbrature del mese
            const timbrature = await prisma.timbratura.findMany({
                where: {
                    profiloHRId,
                    deletedAt: null,
                    dataOra: {
                        gte: primoGiorno,
                        lt: new Date(annoInt, meseInt, 1)
                    },
                    isValidata: true
                },
                orderBy: { dataOra: 'asc' }
            });

            // Calcola ore lavorate
            let oreLavorate = 0;
            let entrata = null;

            for (const t of timbrature) {
                if (t.tipo === 'ENTRATA' || t.tipo === 'FINE_PAUSA') {
                    entrata = new Date(t.dataOra);
                } else if ((t.tipo === 'USCITA' || t.tipo === 'INIZIO_PAUSA') && entrata) {
                    const uscita = new Date(t.dataOra);
                    oreLavorate += (uscita - entrata) / (1000 * 60 * 60);
                    entrata = null;
                }
            }

            // Recupera turni assegnati
            const turni = await prisma.turnoAssegnato.findMany({
                where: {
                    profiloHRId,
                    data: {
                        gte: primoGiorno,
                        lte: ultimoGiorno
                    },
                    deletedAt: null
                }
            });

            // Recupera assenze approvate
            const assenze = await prisma.assenza.findMany({
                where: {
                    profiloHRId,
                    stato: 'APPROVATA',
                    deletedAt: null,
                    OR: [
                        {
                            dataInizio: { lte: ultimoGiorno },
                            dataFine: { gte: primoGiorno }
                        }
                    ]
                }
            });

            // Calcola giorni assenze per tipo
            let giorniFerie = 0;
            let giorniPermesso = 0;
            let giorniMalattia = 0;
            let giorniAltreAssenze = 0;
            let giorniSmartWorking = 0;

            for (const a of assenze) {
                const inizio = new Date(Math.max(a.dataInizio.getTime(), primoGiorno.getTime()));
                const fine = new Date(Math.min(a.dataFine.getTime(), ultimoGiorno.getTime()));

                // Calcola giorni lavorativi nell'intersezione
                let giorni = 0;
                for (let d = new Date(inizio); d <= fine; d.setDate(d.getDate() + 1)) {
                    if (d.getDay() !== 0 && d.getDay() !== 6) {
                        giorni++;
                    }
                }

                if (!a.isGiornataIntera) giorni *= 0.5;

                switch (a.tipo) {
                    case 'FERIE':
                        giorniFerie += giorni;
                        break;
                    case 'PERMESSO_ROL':
                    case 'PERMESSO_EX_FESTIVITA':
                        giorniPermesso += giorni;
                        break;
                    case 'MALATTIA':
                    case 'INFORTUNIO':
                        giorniMalattia += giorni;
                        break;
                    default:
                        giorniAltreAssenze += giorni;
                }
            }

            // Conta giorni smart working
            giorniSmartWorking = turni.filter(t => t.isSmartWorking).length;

            // Calcola straordinari
            const oreStraordinario = Math.max(0, oreLavorate - orePreviste);

            // Calcola differenza ore
            const differenzaOre = oreLavorate - orePreviste;

            // Calcola anomalie (semplificato)
            const timbratureMancanti = Math.max(0, giorniLavorativiMese - Math.floor(timbrature.length / 2));

            // Calcola percentuali
            const percentualePresenza = giorniLavorativiMese > 0
                ? ((giorniLavorativiMese - giorniFerie - giorniPermesso - giorniMalattia - giorniAltreAssenze) / giorniLavorativiMese) * 100
                : 100;

            // Genera dettaglio giornaliero (semplificato)
            const dettaglioGiorni = [];
            for (let g = 1; g <= giorniMese; g++) {
                const data = new Date(annoInt, meseInt - 1, g);
                const dayOfWeek = data.getDay();

                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    continue; // Salta weekend
                }

                const turnoGiorno = turni.find(t =>
                    new Date(t.data).getDate() === g
                );

                const timbratureGiorno = timbrature.filter(t =>
                    new Date(t.dataOra).getDate() === g
                );

                dettaglioGiorni.push({
                    giorno: g,
                    data: data.toISOString().split('T')[0],
                    orePreviste: Number(profiloHR.oreGiornaliereStandard),
                    turno: turnoGiorno ? {
                        oraInizio: turnoGiorno.oraInizio,
                        oraFine: turnoGiorno.oraFine,
                        isSmartWorking: turnoGiorno.isSmartWorking
                    } : null,
                    timbrature: timbratureGiorno.length,
                    anomalie: timbratureGiorno.length < 2 ? ['TIMBRATURE_MANCANTI'] : []
                });
            }

            // Crea o aggiorna cartellino
            const cartellino = await prisma.cartellino.upsert({
                where: {
                    profiloHRId_anno_mese: {
                        profiloHRId,
                        anno: annoInt,
                        mese: meseInt
                    }
                },
                create: {
                    profiloHRId,
                    tenantId,
                    anno: annoInt,
                    mese: meseInt,
                    oreLavoratePreviste: orePreviste,
                    oreLavorateEffettive: oreLavorate,
                    oreStraordinario,
                    oreStraordinarioNotturno: 0,
                    oreStraordinarioFestivo: 0,
                    differenzaOre,
                    giorniFerie,
                    giorniPermesso,
                    giorniMalattia,
                    giorniAltreAssenze,
                    giorniSmartWorking,
                    numeroRitardi: 0,
                    minutiRitardoTotali: 0,
                    numeroUsciteAnticipate: 0,
                    timbratureMancanti,
                    percentualePresenza,
                    percentualeRispettoTurni: 100,
                    stato: 'BOZZA',
                    dettaglioGiorni
                },
                update: {
                    oreLavoratePreviste: orePreviste,
                    oreLavorateEffettive: oreLavorate,
                    oreStraordinario,
                    differenzaOre,
                    giorniFerie,
                    giorniPermesso,
                    giorniMalattia,
                    giorniAltreAssenze,
                    giorniSmartWorking,
                    timbratureMancanti,
                    percentualePresenza,
                    dettaglioGiorni,
                    stato: 'BOZZA'
                }
            });

            logger.info('Cartellino generato', {
                component: 'hr-cartellini-routes',
                action: 'genera',
                cartellinoId: cartellino.id,
                profiloHRId,
                anno: annoInt,
                mese: meseInt,
                tenantId
            });

            res.json({
                success: true,
                data: cartellino,
                message: 'Cartellino generato con successo'
            });
        } catch (error) {
            logger.error('Failed to generate cartellino', {
                component: 'hr-cartellini-routes',
                action: 'genera',
                error: 'Operazione non riuscita',
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nella generazione del cartellino'
            });
        }
    }
);

/**
 * POST /api/v1/hr/cartellini/:id/valida
 * Valida cartellino
 */
router.post('/:id/valida',
    authenticate,
    requirePermission('hr.cartellino:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const cartellino = await prisma.cartellino.findFirst({
                where: { id, tenantId }
            });

            if (!cartellino) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            if (cartellino.stato === 'CHIUSO') {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Il cartellino è già chiuso'
                });
            }

            const updated = await prisma.cartellino.update({
                where: { id },
                data: {
                    stato: 'VALIDATO',
                    validatoDa: req.person.id,
                    validatoAt: new Date()
                }
            });

            logger.info('Cartellino validato', {
                component: 'hr-cartellini-routes',
                action: 'valida',
                cartellinoId: id,
                tenantId
            });

            res.json({
                success: true,
                data: updated,
                message: 'Cartellino validato con successo'
            });
        } catch (error) {
            logger.error('Failed to validate cartellino', {
                component: 'hr-cartellini-routes',
                action: 'valida',
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
 * POST /api/v1/hr/cartellini/:id/chiudi
 * Chiudi cartellino (blocca modifiche)
 */
router.post('/:id/chiudi',
    authenticate,
    requirePermission('hr.cartellino:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const cartellino = await prisma.cartellino.findFirst({
                where: { id, tenantId }
            });

            if (!cartellino) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            if (cartellino.stato === 'CHIUSO') {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Il cartellino è già chiuso'
                });
            }

            const updated = await prisma.cartellino.update({
                where: { id },
                data: {
                    stato: 'CHIUSO'
                }
            });

            logger.info('Cartellino chiuso', {
                component: 'hr-cartellini-routes',
                action: 'chiudi',
                cartellinoId: id,
                tenantId
            });

            res.json({
                success: true,
                data: updated,
                message: 'Cartellino chiuso con successo'
            });
        } catch (error) {
            logger.error('Failed to close cartellino', {
                component: 'hr-cartellini-routes',
                action: 'chiudi',
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
