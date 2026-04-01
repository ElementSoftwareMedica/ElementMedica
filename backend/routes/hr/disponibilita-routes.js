/**
 * P68 - Disponibilità Calendario Routes
 * Gestione preferenze disponibilità lavorativa del personale
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
 * GET /api/v1/hr/disponibilita
 * Lista disponibilità con filtri (manager view)
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
                preferenza,
                stato,
                fasciaPreferita,
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
            if (preferenza) where.preferenza = preferenza;
            if (stato) where.stato = stato;
            if (fasciaPreferita) where.fasciaPreferita = fasciaPreferita;

            if (dataInizio || dataFine) {
                if (dataInizio && dataFine) {
                    where.data = {
                        gte: new Date(dataInizio),
                        lte: new Date(dataFine)
                    };
                } else if (dataInizio) {
                    where.data = { gte: new Date(dataInizio) };
                } else if (dataFine) {
                    where.data = { lte: new Date(dataFine) };
                }
            }

            const disponibilita = await prisma.disponibilitaCalendario.findMany({
                where,
                include: {
                    profiloHR: {
                        include: {
                            personTenantProfile: {
                                include: {
                                    person: {
                                        select: { id: true, firstName: true, lastName: true, gender: true }
                                    }
                                }
                            },
                            mansioneInterna: {
                                select: { id: true, nome: true, areaAziendale: true }
                            }
                        }
                    }
                },
                orderBy: [
                    { data: 'asc' },
                    { profiloHRId: 'asc' }
                ]
            });

            res.json({ data: disponibilita });

        } catch (error) {
            logger.error('Failed to get disponibilità', {
                component: 'disponibilita-routes',
                action: 'list',
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                error: 'Errore nel recupero delle disponibilità',
                details: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /api/v1/hr/disponibilita/mie
 * Le mie disponibilità (employee view)
 */
router.get('/mie',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person.id;

            const { dataInizio, dataFine, anno, mese } = req.query;

            // Trova il profilo HR dell'utente
            const profiloHR = await prisma.profiloHR.findFirst({
                where: {
                    personTenantProfile: { personId, tenantId },
                    tenantId,
                    isActive: true,
                    deletedAt: null
                }
            });

            if (!profiloHR) {
                return res.json({
                    data: [],
                    message: 'Nessun profilo HR configurato per l\'utente corrente'
                });
            }

            const where = {
                profiloHRId: profiloHR.id,
                tenantId
            };

            // Se anno e mese sono forniti, usa quelli
            if (anno && mese) {
                const inizioMese = new Date(parseInt(anno), parseInt(mese) - 1, 1);
                const fineMese = new Date(parseInt(anno), parseInt(mese), 0); // Ultimo giorno del mese
                where.data = {
                    gte: inizioMese,
                    lte: fineMese
                };
            } else if (dataInizio || dataFine) {
                if (dataInizio && dataFine) {
                    where.data = {
                        gte: new Date(dataInizio),
                        lte: new Date(dataFine)
                    };
                } else if (dataInizio) {
                    where.data = { gte: new Date(dataInizio) };
                } else if (dataFine) {
                    where.data = { lte: new Date(dataFine) };
                }
            }

            const disponibilita = await prisma.disponibilitaCalendario.findMany({
                where,
                orderBy: { data: 'asc' }
            });

            res.json({ data: disponibilita });

        } catch (error) {
            logger.error('Failed to get mie disponibilità', {
                component: 'disponibilita-routes',
                action: 'getMie',
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                error: 'Errore nel recupero delle disponibilità',
                details: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /api/v1/hr/disponibilita/calendario
 * Vista calendario aggregata (manager)
 */
router.get('/calendario',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { dataInizio, dataFine, anno, mese, mansioneInternaId, profiloHRIds } = req.query;

            let inizioMese, fineMese;

            if (anno && mese) {
                inizioMese = new Date(parseInt(anno), parseInt(mese) - 1, 1);
                fineMese = new Date(parseInt(anno), parseInt(mese), 0);
            } else if (dataInizio && dataFine) {
                inizioMese = new Date(dataInizio);
                fineMese = new Date(dataFine);
            } else {
                // Default: mese corrente
                const oggi = new Date();
                inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
                fineMese = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0);
            }

            // Filtro profili HR
            const whereProfiloHR = {
                tenantId,
                isActive: true,
                deletedAt: null // F254: exclude soft-deleted HR profiles
            };

            if (mansioneInternaId) {
                whereProfiloHR.mansioneInternaId = mansioneInternaId;
            }

            if (profiloHRIds) {
                const ids = Array.isArray(profiloHRIds) ? profiloHRIds : profiloHRIds.split(',');
                whereProfiloHR.id = { in: ids };
            }

            // Recupera tutti i profili HR attivi con le loro disponibilità
            const profili = await prisma.profiloHR.findMany({
                where: whereProfiloHR,
                include: {
                    personTenantProfile: {
                        include: {
                            person: {
                                select: { id: true, firstName: true, lastName: true, gender: true }
                            }
                        }
                    },
                    mansioneInterna: {
                        select: { id: true, nome: true, areaAziendale: true }
                    },
                    disponibilita: {
                        where: {
                            data: {
                                gte: inizioMese,
                                lte: fineMese
                            }
                        }
                    }
                },
                orderBy: [
                    { mansioneInterna: { nome: 'asc' } },
                    { personTenantProfile: { person: { lastName: 'asc' } } }
                ]
            });

            // Struttura dati calendario
            const calendario = {
                dataInizio: inizioMese.toISOString().split('T')[0],
                dataFine: fineMese.toISOString().split('T')[0],
                profili: profili.map(p => ({
                    profiloHRId: p.id,
                    nome: `${p.personTenantProfile?.person?.firstName || ''} ${p.personTenantProfile?.person?.lastName || ''}`.trim(),
                    gender: p.personTenantProfile?.person?.gender,
                    mansione: p.mansioneInterna?.nome || 'Non assegnata',
                    areaAziendale: p.mansioneInterna?.areaAziendale,
                    disponibilita: p.disponibilita.reduce((acc, d) => {
                        acc[d.data.toISOString().split('T')[0]] = {
                            preferenza: d.preferenza,
                            fasciaPreferita: d.fasciaPreferita,
                            stato: d.stato,
                            note: d.note
                        };
                        return acc;
                    }, {})
                }))
            };

            res.json({ data: calendario });

        } catch (error) {
            logger.error('Failed to get calendario disponibilità', {
                component: 'disponibilita-routes',
                action: 'getCalendario',
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                error: 'Errore nel recupero del calendario',
                details: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /api/v1/hr/disponibilita
 * Crea/aggiorna disponibilità per una data
 */
router.post('/',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person.id;
            const { data, preferenza, fasciaPreferita, note, profiloHRId: inputProfiloHRId } = req.body;

            if (!data || !preferenza) {
                return res.status(400).json({
                    error: 'Data e preferenza sono obbligatori'
                });
            }

            // Validazione preferenza
            const preferenzeValide = ['DISPONIBILE', 'PREFERISCO_NO', 'NON_DISPONIBILE', 'SMART_WORKING', 'MEZZA_GIORNATA_MATTINA', 'MEZZA_GIORNATA_POMERIGGIO'];
            if (!preferenzeValide.includes(preferenza)) {
                return res.status(400).json({
                    error: `Preferenza non valida. Valori ammessi: ${preferenzeValide.join(', ')}`
                });
            }

            // Validazione fasciaPreferita se fornita
            if (fasciaPreferita) {
                const fasceValide = ['MATTINA', 'POMERIGGIO', 'GIORNATA_INTERA', 'FLESSIBILE'];
                if (!fasceValide.includes(fasciaPreferita)) {
                    return res.status(400).json({
                        error: `Fascia oraria non valida. Valori ammessi: ${fasceValide.join(', ')}`
                    });
                }
            }

            // Determina profiloHRId
            let profiloHRId = inputProfiloHRId;

            // Se non fornito, cerca il profilo HR dell'utente corrente
            if (!profiloHRId) {
                const profiloHR = await prisma.profiloHR.findFirst({
                    where: {
                        personTenantProfile: { personId, tenantId },
                        tenantId,
                        isActive: true,
                        deletedAt: null
                    }
                });

                if (!profiloHR) {
                    return res.status(404).json({
                        error: 'Profilo HR non trovato per l\'utente corrente'
                    });
                }

                profiloHRId = profiloHR.id;
            } else {
                // Verifica che l'utente possa modificare questo profilo (o è il proprio o ha permessi hr:write)
                const profiloHR = await prisma.profiloHR.findFirst({
                    where: {
                        personTenantProfile: { personId, tenantId },
                        tenantId,
                        isActive: true,
                        deletedAt: null
                    }
                });

                const isOwnProfile = profiloHR?.id === profiloHRId;

                if (!isOwnProfile) {
                    // Solo utenti con hr:write possono modificare la disponibilità altrui
                    return res.status(403).json({
                        error: 'Non autorizzato a modificare la disponibilità di altri profili'
                    });
                }
            }

            const dataDate = new Date(data);
            const resolvedFascia = fasciaPreferita || 'GIORNATA_INTERA';

            // Upsert: crea o aggiorna (composite key: profiloHRId + data + fasciaPreferita)
            const disponibilita = await prisma.disponibilitaCalendario.upsert({
                where: {
                    profiloHRId_data_fasciaPreferita: {
                        profiloHRId,
                        data: dataDate,
                        fasciaPreferita: resolvedFascia
                    }
                },
                update: {
                    preferenza,
                    note: note || null,
                    stato: 'IN_ATTESA' // Reset stato quando modificato
                },
                create: {
                    profiloHRId,
                    tenantId,
                    data: dataDate,
                    preferenza,
                    fasciaPreferita: resolvedFascia,
                    note: note || null,
                    stato: 'IN_ATTESA'
                }
            });

            logger.info('Disponibilità salvata', {
                component: 'disponibilita-routes',
                action: 'upsert',
                tenantId,
                profiloHRId,
                data: data
            });

            res.status(201).json({ data: disponibilita });

        } catch (error) {
            logger.error('Failed to save disponibilità', {
                component: 'disponibilita-routes',
                action: 'upsert',
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                error: 'Errore nel salvataggio della disponibilità',
                details: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /api/v1/hr/disponibilita/bulk
 * Crea/aggiorna disponibilità multiple (per un range di date)
 */
router.post('/bulk',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person.id;
            const { disponibilita: inputDisponibilita, profiloHRId: inputProfiloHRId } = req.body;

            if (!inputDisponibilita || !Array.isArray(inputDisponibilita) || inputDisponibilita.length === 0) {
                return res.status(400).json({
                    error: 'Array di disponibilità richiesto'
                });
            }

            // Determina profiloHRId
            let profiloHRId = inputProfiloHRId;

            if (!profiloHRId) {
                const profiloHR = await prisma.profiloHR.findFirst({
                    where: {
                        personTenantProfile: { personId, tenantId },
                        tenantId,
                        isActive: true,
                        deletedAt: null
                    }
                });

                if (!profiloHR) {
                    return res.status(404).json({
                        error: 'Profilo HR non trovato'
                    });
                }

                profiloHRId = profiloHR.id;
            }

            // Salva tutte le disponibilità in una transaction
            // Composite key: profiloHRId + data + fasciaPreferita
            const results = await prisma.$transaction(
                inputDisponibilita.map(d => {
                    const resolvedFascia = d.fasciaPreferita || 'GIORNATA_INTERA';
                    return prisma.disponibilitaCalendario.upsert({
                        where: {
                            profiloHRId_data_fasciaPreferita: {
                                profiloHRId,
                                data: new Date(d.data),
                                fasciaPreferita: resolvedFascia
                            }
                        },
                        update: {
                            preferenza: d.preferenza,
                            note: d.note || null,
                            stato: 'IN_ATTESA'
                        },
                        create: {
                            profiloHRId,
                            tenantId,
                            data: new Date(d.data),
                            preferenza: d.preferenza,
                            fasciaPreferita: resolvedFascia,
                            note: d.note || null,
                            stato: 'IN_ATTESA'
                        }
                    });
                })
            );

            logger.info('Bulk disponibilità salvate', {
                component: 'disponibilita-routes',
                action: 'bulkUpsert',
                tenantId,
                profiloHRId,
                count: results.length
            });

            res.status(201).json({
                data: results,
                count: results.length
            });

        } catch (error) {
            logger.error('Failed to bulk save disponibilità', {
                component: 'disponibilita-routes',
                action: 'bulkUpsert',
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                error: 'Errore nel salvataggio delle disponibilità',
                details: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /api/v1/hr/disponibilita/bulk-multi
 * Salva disponibilità per più profili in una sola richiesta (manager)
 * Body: { entries: [{ profiloHRId, data, preferenza, fasciaPreferita, note }] }
 */
router.post('/bulk-multi',
    authenticate,
    requirePermission('hr:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { entries } = req.body;

            if (!entries || !Array.isArray(entries) || entries.length === 0) {
                return res.status(400).json({
                    error: 'Array di entries richiesto'
                });
            }

            // Validate all entries
            const preferenzeValide = ['DISPONIBILE', 'PREFERISCO_NO', 'NON_DISPONIBILE', 'SMART_WORKING', 'MEZZA_GIORNATA_MATTINA', 'MEZZA_GIORNATA_POMERIGGIO'];
            for (const e of entries) {
                if (!e.profiloHRId || !e.data || !e.preferenza) {
                    return res.status(400).json({
                        error: 'Ogni entry richiede profiloHRId, data e preferenza'
                    });
                }
                if (!preferenzeValide.includes(e.preferenza)) {
                    return res.status(400).json({
                        error: `Preferenza non valida: ${e.preferenza}`
                    });
                }
            }

            // Process in transaction
            const results = await prisma.$transaction(
                entries.map(e => {
                    const resolvedFascia = e.fasciaPreferita || 'GIORNATA_INTERA';
                    return prisma.disponibilitaCalendario.upsert({
                        where: {
                            profiloHRId_data_fasciaPreferita: {
                                profiloHRId: e.profiloHRId,
                                data: new Date(e.data),
                                fasciaPreferita: resolvedFascia
                            }
                        },
                        update: {
                            preferenza: e.preferenza,
                            note: e.note || null,
                            stato: 'IN_ATTESA'
                        },
                        create: {
                            profiloHRId: e.profiloHRId,
                            tenantId,
                            data: new Date(e.data),
                            preferenza: e.preferenza,
                            fasciaPreferita: resolvedFascia,
                            note: e.note || null,
                            stato: 'IN_ATTESA'
                        }
                    });
                })
            );

            logger.info('Bulk multi-profilo disponibilità salvate', {
                component: 'disponibilita-routes',
                action: 'bulkMulti',
                tenantId,
                count: results.length
            });

            res.status(201).json({
                data: results,
                count: results.length
            });

        } catch (error) {
            logger.error('Failed to bulk-multi save disponibilità', {
                component: 'disponibilita-routes',
                action: 'bulkMulti',
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                error: 'Errore nel salvataggio delle disponibilità',
                details: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /api/v1/hr/disponibilita/:id/approva
 * Approva una disponibilità (manager)
 */
router.post('/:id/approva',
    authenticate,
    requirePermission('hr:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const disponibilita = await prisma.disponibilitaCalendario.findFirst({
                where: { id, tenantId }
            });

            if (!disponibilita) {
                return res.status(404).json({
                    error: 'Disponibilità non trovata'
                });
            }

            const updated = await prisma.disponibilitaCalendario.update({
                where: { id },
                data: {
                    stato: 'APPROVATA',
                    approvatoDa: req.person.id,
                    approvatoAt: new Date()
                }
            });

            logger.info('Disponibilità approvata', {
                component: 'disponibilita-routes',
                action: 'approva',
                tenantId,
                id,
                approvatoDa: req.person.id
            });

            res.json({ data: updated });

        } catch (error) {
            logger.error('Failed to approve disponibilità', {
                component: 'disponibilita-routes',
                action: 'approva',
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                error: 'Errore nell\'approvazione della disponibilità',
                details: 'Errore interno del server'
            });
        }
    }
);

/**
 * DELETE /api/v1/hr/disponibilita/:id
 * Elimina una disponibilità
 */
router.delete('/:id',
    authenticate,
    requirePermission('hr:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person.id;
            const { id } = req.params;

            const disponibilita = await prisma.disponibilitaCalendario.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    profiloHR: {
                        select: { personTenantProfile: { select: { personId: true } } }
                    }
                }
            });

            if (!disponibilita) {
                return res.status(404).json({
                    error: 'Disponibilità non trovata'
                });
            }

            // Verifica che sia la propria disponibilità o abbia permessi
            const isOwnDisponibilita = disponibilita.profiloHR?.personTenantProfile?.personId === personId;

            if (!isOwnDisponibilita) {
                // Solo il proprietario può eliminare la propria disponibilità
                return res.status(403).json({
                    error: 'Non autorizzato a eliminare la disponibilità di altri profili'
                });
            }

            // Soft delete
            await prisma.disponibilitaCalendario.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            // GDPR audit log
            await prisma.gdprAuditLog.create({
                data: {
                    tenantId,
                    personId: req.person.id,
                    action: 'DELETE',
                    resourceType: 'DisponibilitaCalendario',
                    resourceId: id,
                    dataAccessed: {
                        profiloHRId: disponibilita.profiloHRId,
                        data: disponibilita.data,
                        preferenza: disponibilita.preferenza
                    }
                }
            });

            logger.info('Disponibilità eliminata', {
                component: 'disponibilita-routes',
                action: 'delete',
                tenantId,
                id
            });

            res.json({ message: 'Disponibilità eliminata' });

        } catch (error) {
            logger.error('Failed to delete disponibilità', {
                component: 'disponibilita-routes',
                action: 'delete',
                tenantId: req.person?.tenantId,
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                error: 'Errore nell\'eliminazione della disponibilità'
            });
        }
    }
);

export default router;
