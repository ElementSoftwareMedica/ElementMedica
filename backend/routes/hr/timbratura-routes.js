/**
 * P68 - Timbratura Routes
 * Gestione timbrature entrata/uscita personale
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
 * GET /api/v1/hr/timbratura/stato-oggi
 * Stato timbratura corrente dell'utente (IN/OUT)
 */
router.get('/stato-oggi',
    authenticate,
    async (req, res) => {
        try {
            const personId = req.person.id;
            const tenantId = getEffectiveTenantId(req);

            // Trova il profilo HR dell'utente corrente
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
                    data: {
                        hasHRProfile: false,
                        message: 'Profilo HR non configurato'
                    }
                });
            }

            // Se non ha timbratura obbligatoria, segnala
            if (!profiloHR.isTimbraturaPbligatoria) {
                return res.json({
                    success: true,
                    data: {
                        hasHRProfile: true,
                        timbraturaObbligatoria: false,
                        message: 'Timbratura non richiesta per questo profilo'
                    }
                });
            }

            // Trova timbrature di oggi
            const oggi = new Date();
            oggi.setHours(0, 0, 0, 0);
            const domani = new Date(oggi);
            domani.setDate(domani.getDate() + 1);

            const timbraturaOggi = await prisma.timbratura.findMany({
                where: {
                    profiloHRId: profiloHR.id,
                    deletedAt: null, // F254: exclude soft-deleted time entries
                    dataOra: {
                        gte: oggi,
                        lt: domani
                    }
                },
                orderBy: { dataOra: 'asc' }
            });

            // Determina stato attuale
            let statoAttuale = 'FUORI_SEDE';
            let ultimaTimbratura = null;
            let oreLavorate = 0;
            let inPausa = false;

            if (timbraturaOggi.length > 0) {
                ultimaTimbratura = timbraturaOggi[timbraturaOggi.length - 1];

                // Calcola stato
                for (const t of timbraturaOggi) {
                    if (t.tipo === 'ENTRATA' || t.tipo === 'FINE_PAUSA') {
                        statoAttuale = 'IN_SEDE';
                        inPausa = false;
                    } else if (t.tipo === 'USCITA') {
                        statoAttuale = 'FUORI_SEDE';
                        inPausa = false;
                    } else if (t.tipo === 'INIZIO_PAUSA') {
                        statoAttuale = 'IN_PAUSA';
                        inPausa = true;
                    }
                }

                // Calcola ore lavorate
                let entrata = null;
                for (const t of timbraturaOggi) {
                    if (t.tipo === 'ENTRATA' || t.tipo === 'FINE_PAUSA') {
                        entrata = new Date(t.dataOra);
                    } else if ((t.tipo === 'USCITA' || t.tipo === 'INIZIO_PAUSA') && entrata) {
                        const uscita = new Date(t.dataOra);
                        oreLavorate += (uscita - entrata) / (1000 * 60 * 60);
                        entrata = null;
                    }
                }

                // Se ancora in sede, aggiungi tempo da ultima entrata
                if (statoAttuale === 'IN_SEDE' && entrata) {
                    oreLavorate += (new Date() - entrata) / (1000 * 60 * 60);
                }
            }

            res.json({
                success: true,
                data: {
                    hasHRProfile: true,
                    timbraturaObbligatoria: true,
                    statoAttuale,
                    inPausa,
                    ultimaTimbratura: ultimaTimbratura ? {
                        tipo: ultimaTimbratura.tipo,
                        dataOra: ultimaTimbratura.dataOra
                    } : null,
                    oreLavorateOggi: Math.round(oreLavorate * 100) / 100,
                    timbratureOggi: timbraturaOggi.map(t => ({
                        id: t.id,
                        tipo: t.tipo,
                        dataOra: t.dataOra
                    }))
                }
            });
        } catch (error) {
            logger.error('Failed to get stato timbratura', {
                component: 'hr-timbratura-routes',
                action: 'getStatoOggi',
                error: 'Operazione non riuscita',
                personId: req.person?.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nel recupero dello stato timbratura'
            });
        }
    }
);

/**
 * POST /api/v1/hr/timbratura
 * Registra nuova timbratura (entrata/uscita/pausa)
 */
router.post('/',
    authenticate,
    async (req, res) => {
        try {
            const personId = req.person.id;
            const tenantId = getEffectiveTenantId(req);
            const { tipo, note, latitudine, longitudine } = req.body;

            // Validazione tipo
            const tipiConsentiti = ['ENTRATA', 'USCITA', 'INIZIO_PAUSA', 'FINE_PAUSA'];
            if (!tipo || !tipiConsentiti.includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: `Tipo timbratura non valido. Valori consentiti: ${tipiConsentiti.join(', ')}`
                });
            }

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
                return res.status(403).json({
                    success: false,
                    error: 'Accesso negato',
                    message: 'Profilo HR non configurato. Contattare l\'amministratore.'
                });
            }

            // Verifica coerenza timbratura (non puoi uscire se non sei entrato)
            const oggi = new Date();
            oggi.setHours(0, 0, 0, 0);
            const domani = new Date(oggi);
            domani.setDate(domani.getDate() + 1);

            const ultimaTimbratura = await prisma.timbratura.findFirst({
                where: {
                    profiloHRId: profiloHR.id,
                    deletedAt: null, // F254: exclude soft-deleted time entries
                    dataOra: { gte: oggi, lt: domani }
                },
                orderBy: { dataOra: 'desc' }
            });

            // Validazione sequenza
            if (tipo === 'ENTRATA') {
                if (ultimaTimbratura && ['ENTRATA', 'FINE_PAUSA'].includes(ultimaTimbratura.tipo)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Errore di validazione',
                        message: 'Devi registrare l\'uscita prima di una nuova entrata'
                    });
                }
            } else if (tipo === 'USCITA') {
                if (!ultimaTimbratura || ['USCITA', 'INIZIO_PAUSA'].includes(ultimaTimbratura.tipo)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Errore di validazione',
                        message: 'Devi prima registrare l\'entrata'
                    });
                }
            } else if (tipo === 'INIZIO_PAUSA') {
                if (!ultimaTimbratura || ultimaTimbratura.tipo !== 'ENTRATA' && ultimaTimbratura.tipo !== 'FINE_PAUSA') {
                    return res.status(400).json({
                        success: false,
                        error: 'Errore di validazione',
                        message: 'Devi essere in sede per iniziare la pausa'
                    });
                }
            } else if (tipo === 'FINE_PAUSA') {
                if (!ultimaTimbratura || ultimaTimbratura.tipo !== 'INIZIO_PAUSA') {
                    return res.status(400).json({
                        success: false,
                        error: 'Errore di validazione',
                        message: 'Devi prima iniziare la pausa'
                    });
                }
            }

            // Crea timbratura
            const timbratura = await prisma.timbratura.create({
                data: {
                    profiloHRId: profiloHR.id,
                    tenantId,
                    dataOra: new Date(),
                    tipo,
                    origine: 'WEB',
                    ipAddress: req.ip?.substring(0, 45),
                    deviceInfo: {
                        userAgent: req.get('User-Agent')?.substring(0, 500)
                    },
                    posizioneGPS: (latitudine || longitudine) ? { latitudine, longitudine } : undefined,
                    note,
                    isManuale: false,
                    isValidata: true
                }
            });

            logger.info('Timbratura registrata', {
                component: 'hr-timbratura-routes',
                action: 'create',
                timbraturaId: timbratura.id,
                tipo,
                profiloHRId: profiloHR.id,
                tenantId
            });

            res.status(201).json({
                success: true,
                data: timbratura,
                message: `${tipo === 'ENTRATA' ? 'Entrata' : tipo === 'USCITA' ? 'Uscita' : tipo === 'INIZIO_PAUSA' ? 'Inizio pausa' : 'Fine pausa'} registrata con successo`
            });
        } catch (error) {
            logger.error('Failed to create timbratura', {
                component: 'hr-timbratura-routes',
                action: 'create',
                error: 'Operazione non riuscita',
                personId: req.person?.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nella registrazione della timbratura'
            });
        }
    }
);

/**
 * GET /api/v1/hr/timbratura
 * Lista timbrature (con filtri)
 */
router.get('/',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const userTenantId = getEffectiveTenantId(req);
            const {
                profiloHRId,
                dataInizio,
                dataFine,
                tipo,
                isValidata,
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
            if (isValidata !== undefined) where.isValidata = isValidata === 'true';

            if (dataInizio || dataFine) {
                where.dataOra = {};
                if (dataInizio) where.dataOra.gte = new Date(dataInizio);
                if (dataFine) where.dataOra.lte = new Date(dataFine);
            }

            const [timbrature, total] = await Promise.all([
                prisma.timbratura.findMany({
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
                    orderBy: { dataOra: 'desc' },
                    skip: (parseInt(page) - 1) * parseInt(limit),
                    take: parseInt(limit)
                }),
                prisma.timbratura.count({ where })
            ]);

            res.json({
                success: true,
                data: timbrature,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            logger.error('Failed to list timbrature', {
                component: 'hr-timbratura-routes',
                action: 'list',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nel recupero delle timbrature'
            });
        }
    }
);

/**
 * POST /api/v1/hr/timbratura/manuale
 * Inserimento timbratura manuale (solo HR/admin)
 */
router.post('/manuale',
    authenticate,
    requirePermission('hr.timbrature:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                profiloHRId,
                dataOra,
                tipo,
                note,
                giustificativo
            } = req.body;

            if (!profiloHRId || !dataOra || !tipo) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'profiloHRId, dataOra e tipo sono obbligatori'
                });
            }

            // Verifica profilo esiste
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

            const timbratura = await prisma.timbratura.create({
                data: {
                    profiloHRId,
                    tenantId,
                    dataOra: new Date(dataOra),
                    tipo,
                    origine: 'MANUALE',
                    note,
                    giustificativo,
                    isManuale: true,
                    isValidata: false // Richiede validazione
                }
            });

            logger.info('Timbratura manuale inserita', {
                component: 'hr-timbratura-routes',
                action: 'createManuale',
                timbraturaId: timbratura.id,
                profiloHRId,
                insertedBy: req.person.id,
                tenantId
            });

            res.status(201).json({
                success: true,
                data: timbratura,
                message: 'Timbratura manuale inserita (in attesa di validazione)'
            });
        } catch (error) {
            logger.error('Failed to create timbratura manuale', {
                component: 'hr-timbratura-routes',
                action: 'createManuale',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nell\'inserimento della timbratura manuale'
            });
        }
    }
);

/**
 * POST /api/v1/hr/timbratura/:id/valida
 * Valida timbratura manuale
 */
router.post('/:id/valida',
    authenticate,
    requirePermission('hr.timbrature:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const timbratura = await prisma.timbratura.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null // F254: exclude soft-deleted (cannot modify a deleted entry)
                }
            });

            if (!timbratura) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Timbratura non trovata'
                });
            }

            const updated = await prisma.timbratura.update({
                where: { id },
                data: {
                    isValidata: true,
                    validataDa: req.person.id,
                    validataAt: new Date()
                }
            });

            logger.info('Timbratura validata', {
                component: 'hr-timbratura-routes',
                action: 'validate',
                timbraturaId: id,
                validataDa: req.person.id,
                tenantId
            });

            res.json({
                success: true,
                data: updated,
                message: 'Timbratura validata con successo'
            });
        } catch (error) {
            logger.error('Failed to validate timbratura', {
                component: 'hr-timbratura-routes',
                action: 'validate',
                error: 'Operazione non riuscita',
                id: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nella validazione della timbratura'
            });
        }
    }
);

/**
 * DELETE /api/v1/hr/timbratura/:id
 * Elimina timbratura (solo HR/admin)
 */
router.delete('/:id',
    authenticate,
    requirePermission('hr.timbrature:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { deletionReason } = req.body;

            if (!deletionReason || deletionReason.length < 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Motivo eliminazione obbligatorio (min 10 caratteri)'
                });
            }

            const timbratura = await prisma.timbratura.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null // F254: cannot delete an already soft-deleted entry
                }
            });

            if (!timbratura) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Timbratura non trovata'
                });
            }

            // Soft delete (GDPR - contiene IP e dati dispositivo)
            await prisma.timbratura.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            // Audit log
            await prisma.gdprAuditLog.create({
                data: {
                    tenantId,
                    resourceType: 'Timbratura',
                    resourceId: id,
                    action: 'DELETE',
                    personId: req.person.id,
                    dataAccessed: {
                        profiloHRId: timbratura.profiloHRId,
                        tipo: timbratura.tipo,
                        dataOra: timbratura.dataOra,
                        deletionReason
                    }
                }
            });

            logger.info('Timbratura eliminata', {
                component: 'hr-timbratura-routes',
                action: 'delete',
                timbraturaId: id,
                deletedBy: req.person.id,
                tenantId
            });

            res.json({
                success: true,
                message: 'Timbratura eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete timbratura', {
                component: 'hr-timbratura-routes',
                action: 'delete',
                error: 'Operazione non riuscita',
                id: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nell\'eliminazione della timbratura'
            });
        }
    }
);

export default router;
