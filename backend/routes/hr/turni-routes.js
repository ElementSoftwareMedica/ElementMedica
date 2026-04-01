/**
 * P68 - Turni Routes
 * Gestione turni template e assegnati
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

// ============================================
// TURNI TEMPLATE
// ============================================

/**
 * GET /api/v1/hr/turni/templates
 * Lista template turni
 */
router.get('/templates',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { isActive } = req.query;

            const where = {
                tenantId,
                deletedAt: null
            };

            if (isActive !== undefined) {
                where.isActive = isActive === 'true';
            }

            const templates = await prisma.turnoTemplate.findMany({
                where,
                orderBy: { nome: 'asc' }
            });

            res.json({
                success: true,
                data: templates,
                count: templates.length
            });
        } catch (error) {
            logger.error('Failed to list turni templates', {
                component: 'hr-turni-routes',
                action: 'listTemplates',
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
 * GET /api/v1/hr/turni/templates/:id
 * Dettaglio singolo template turno
 */
router.get('/templates/:id',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const template = await prisma.turnoTemplate.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template non trovato'
                });
            }

            res.json({ success: true, data: template });
        } catch (error) {
            logger.error('Failed to get turno template', {
                component: 'hr-turni-routes',
                action: 'getTemplate',
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
 * POST /api/v1/hr/turni/templates
 * Crea template turno
 */
router.post('/templates',
    authenticate,
    requirePermission('hr.turni:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                nome,
                descrizione,
                oraInizio,
                oraFine,
                inclPausaPranzo,
                pausaPranzoInizio,
                pausaPranzoFine,
                giorniApplicabili,
                colore
            } = req.body;

            if (!nome || !oraInizio || !oraFine) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'nome, oraInizio e oraFine sono obbligatori'
                });
            }

            // Verifica unicità nome
            const existing = await prisma.turnoTemplate.findFirst({
                where: {
                    tenantId,
                    nome,
                    deletedAt: null
                }
            });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'Conflitto',
                    message: `Template turno "${nome}" già esistente`
                });
            }

            const template = await prisma.turnoTemplate.create({
                data: {
                    tenantId,
                    nome,
                    descrizione,
                    oraInizio,
                    oraFine,
                    inclPausaPranzo: inclPausaPranzo || false,
                    pausaPranzoInizio,
                    pausaPranzoFine,
                    giorniApplicabili: giorniApplicabili || 31, // Lun-Ven
                    colore,
                    isActive: true
                }
            });

            logger.info('Template turno creato', {
                component: 'hr-turni-routes',
                action: 'createTemplate',
                templateId: template.id,
                nome,
                tenantId
            });

            res.status(201).json({
                success: true,
                data: template
            });
        } catch (error) {
            logger.error('Failed to create turno template', {
                component: 'hr-turni-routes',
                action: 'createTemplate',
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
 * PUT /api/v1/hr/turni/templates/:id
 * Modifica template turno
 */
router.put('/templates/:id',
    authenticate,
    requirePermission('hr.turni:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const updateData = req.body;

            const existing = await prisma.turnoTemplate.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            const template = await prisma.turnoTemplate.update({
                where: { id },
                data: updateData
            });

            res.json({
                success: true,
                data: template
            });
        } catch (error) {
            logger.error('Failed to update turno template', {
                component: 'hr-turni-routes',
                action: 'updateTemplate',
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
 * DELETE /api/v1/hr/turni/templates/:id
 * Elimina template turno
 */
router.delete('/templates/:id',
    authenticate,
    requirePermission('hr.turni:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const existing = await prisma.turnoTemplate.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            await prisma.turnoTemplate.update({
                where: { id },
                data: { deletedAt: new Date(), isActive: false }
            });

            res.json({
                success: true,
                message: 'Template eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete turno template', {
                component: 'hr-turni-routes',
                action: 'deleteTemplate',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// TURNI ASSEGNATI
// ============================================

/**
 * GET /api/v1/hr/turni
 * Lista turni assegnati (con filtri data/persona)
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
                stato,
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
                where.data = {};
                if (dataInizio) where.data.gte = new Date(dataInizio);
                if (dataFine) where.data.lte = new Date(dataFine);
            }

            const turni = await prisma.turnoAssegnato.findMany({
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
                    },
                    turnoTemplate: true,
                    mansioneInterna: {
                        select: { id: true, nome: true, sigla: true, colore: true }
                    }
                },
                orderBy: [
                    { data: 'asc' },
                    { oraInizio: 'asc' }
                ]
            });

            res.json({
                success: true,
                data: turni,
                count: turni.length
            });
        } catch (error) {
            logger.error('Failed to list turni', {
                component: 'hr-turni-routes',
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
 * GET /api/v1/hr/turni/calendario
 * Vista calendario turni per settimana/mese
 */
router.get('/calendario',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const userTenantId = getEffectiveTenantId(req);
            const {
                anno,
                mese,
                settimana, // numero settimana ISO
                dataInizio: dataInizioParam,
                dataFine: dataFineParam,
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

            let dataInizio, dataFine;

            // Prima controlla se sono passati dataInizio e dataFine direttamente
            if (dataInizioParam && dataFineParam) {
                dataInizio = new Date(dataInizioParam);
                dataFine = new Date(dataFineParam);
            } else if (settimana && anno) {
                // Calcola date della settimana ISO
                const firstDayOfYear = new Date(parseInt(anno), 0, 1);
                const daysOffset = (parseInt(settimana) - 1) * 7;
                dataInizio = new Date(firstDayOfYear);
                dataInizio.setDate(dataInizio.getDate() + daysOffset - dataInizio.getDay() + 1);
                dataFine = new Date(dataInizio);
                dataFine.setDate(dataFine.getDate() + 6);
            } else if (mese && anno) {
                dataInizio = new Date(parseInt(anno), parseInt(mese) - 1, 1);
                dataFine = new Date(parseInt(anno), parseInt(mese), 0);
            } else {
                // Default: settimana corrente
                const oggi = new Date();
                const dayOfWeek = oggi.getDay();
                dataInizio = new Date(oggi);
                dataInizio.setDate(oggi.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                dataFine = new Date(dataInizio);
                dataFine.setDate(dataFine.getDate() + 6);
            }

            const turni = await prisma.turnoAssegnato.findMany({
                where: {
                    tenantId: { in: targetTenantIds },
                    deletedAt: null,
                    data: {
                        gte: dataInizio,
                        lte: dataFine
                    }
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
                            },
                            mansioneInterna: {
                                select: {
                                    id: true,
                                    nome: true,
                                    colore: true
                                }
                            }
                        }
                    },
                    turnoTemplate: {
                        select: {
                            id: true,
                            nome: true,
                            colore: true
                        }
                    }
                },
                orderBy: [
                    { data: 'asc' },
                    { oraInizio: 'asc' }
                ]
            });

            // Raggruppa per giorno
            const calendario = {};
            for (const turno of turni) {
                const dataKey = turno.data.toISOString().split('T')[0];
                if (!calendario[dataKey]) {
                    calendario[dataKey] = [];
                }
                calendario[dataKey].push(turno);
            }

            res.json({
                success: true,
                data: {
                    dataInizio: dataInizio.toISOString().split('T')[0],
                    dataFine: dataFine.toISOString().split('T')[0],
                    calendario,
                    totale: turni.length
                }
            });
        } catch (error) {
            logger.error('Failed to get calendario turni', {
                component: 'hr-turni-routes',
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
 * POST /api/v1/hr/turni
 * Assegna turno a persona
 */
router.post('/',
    authenticate,
    requirePermission('hr.turni:assign'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                profiloHRId,
                data,
                turnoTemplateId,
                mansioneInternaId,
                oraInizio,
                oraFine,
                pausaPranzoInizio,
                pausaPranzoFine,
                isSmartWorking,
                note
            } = req.body;

            if (!profiloHRId || !data) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'profiloHRId e data sono obbligatori'
                });
            }

            // Verifica profilo HR
            const profiloHR = await prisma.profiloHR.findFirst({
                where: { id: profiloHRId, tenantId, deletedAt: null }
            });

            if (!profiloHR) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Profilo HR non trovato'
                });
            }

            // Se c'è template, prendi orari da lì
            let turnoData = {
                profiloHRId,
                tenantId,
                data: new Date(data),
                stato: 'PIANIFICATO',
                isSmartWorking: isSmartWorking || false,
                note,
                assegnatoDa: req.person.id,
                mansioneInternaId: mansioneInternaId || null
            };

            if (turnoTemplateId) {
                const template = await prisma.turnoTemplate.findFirst({
                    where: { id: turnoTemplateId, tenantId, deletedAt: null }
                });

                if (!template) {
                    return res.status(404).json({
                        success: false,
                        error: 'Non trovato',
                        message: 'Template turno non trovato'
                    });
                }

                turnoData.turnoTemplateId = turnoTemplateId;
                turnoData.oraInizio = template.oraInizio;
                turnoData.oraFine = template.oraFine;
                turnoData.pausaPranzoInizio = template.pausaPranzoInizio;
                turnoData.pausaPranzoFine = template.pausaPranzoFine;
            } else {
                if (!oraInizio || !oraFine) {
                    return res.status(400).json({
                        success: false,
                        error: 'Errore di validazione',
                        message: 'oraInizio e oraFine obbligatori se non si usa un template'
                    });
                }
                turnoData.oraInizio = oraInizio;
                turnoData.oraFine = oraFine;
                turnoData.pausaPranzoInizio = pausaPranzoInizio;
                turnoData.pausaPranzoFine = pausaPranzoFine;
            }

            // Calcola ore previste
            const [hInizio, mInizio] = turnoData.oraInizio.split(':').map(Number);
            const [hFine, mFine] = turnoData.oraFine.split(':').map(Number);
            let orePreviste = (hFine + mFine / 60) - (hInizio + mInizio / 60);

            // Sottrai pausa se presente
            if (turnoData.pausaPranzoInizio && turnoData.pausaPranzoFine) {
                const [hPausaI, mPausaI] = turnoData.pausaPranzoInizio.split(':').map(Number);
                const [hPausaF, mPausaF] = turnoData.pausaPranzoFine.split(':').map(Number);
                orePreviste -= (hPausaF + mPausaF / 60) - (hPausaI + mPausaI / 60);
            }

            turnoData.orePreviste = Math.max(0, orePreviste);

            // Verifica non ci sia già un turno attivo con stessa persona/data/oraInizio
            const existing = await prisma.turnoAssegnato.findFirst({
                where: {
                    profiloHRId,
                    data: new Date(data),
                    oraInizio: turnoData.oraInizio,
                    deletedAt: null
                }
            });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'Conflitto',
                    message: 'Turno già assegnato per questa fascia oraria'
                });
            }

            // Rimuovi turni soft-deleted con stessa chiave unica (vincolo DB)
            await prisma.turnoAssegnato.deleteMany({
                where: {
                    profiloHRId,
                    data: new Date(data),
                    oraInizio: turnoData.oraInizio,
                    deletedAt: { not: null }
                }
            });

            const turno = await prisma.turnoAssegnato.create({
                data: turnoData,
                include: {
                    profiloHR: {
                        include: {
                            personTenantProfile: {
                                include: {
                                    person: {
                                        select: { firstName: true, lastName: true }
                                    }
                                }
                            }
                        }
                    },
                    turnoTemplate: true,
                    mansioneInterna: true
                }
            });

            logger.info('Turno assegnato', {
                component: 'hr-turni-routes',
                action: 'create',
                turnoId: turno.id,
                profiloHRId,
                data,
                tenantId
            });

            res.status(201).json({
                success: true,
                data: turno
            });
        } catch (error) {
            logger.error('Failed to create turno', {
                component: 'hr-turni-routes',
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
 * PUT /api/v1/hr/turni/:id
 * Modifica turno assegnato
 */
router.put('/:id',
    authenticate,
    requirePermission('hr.turni:assign'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const existing = await prisma.turnoAssegnato.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            const allowedFields = [
                'oraInizio', 'oraFine', 'pausaPranzoInizio', 'pausaPranzoFine',
                'tipo', 'stato', 'isSmartWorking', 'note'
            ];

            const data = {};
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    data[field] = req.body[field];
                }
            }

            // Ricalcola ore se cambiano orari
            if (data.oraInizio || data.oraFine) {
                const oraInizio = data.oraInizio || existing.oraInizio;
                const oraFine = data.oraFine || existing.oraFine;
                const pausaPranzoInizio = data.pausaPranzoInizio !== undefined ? data.pausaPranzoInizio : existing.pausaPranzoInizio;
                const pausaPranzoFine = data.pausaPranzoFine !== undefined ? data.pausaPranzoFine : existing.pausaPranzoFine;

                const [hI, mI] = oraInizio.split(':').map(Number);
                const [hF, mF] = oraFine.split(':').map(Number);
                let orePreviste = (hF + mF / 60) - (hI + mI / 60);

                if (pausaPranzoInizio && pausaPranzoFine) {
                    const [hPI, mPI] = pausaPranzoInizio.split(':').map(Number);
                    const [hPF, mPF] = pausaPranzoFine.split(':').map(Number);
                    orePreviste -= (hPF + mPF / 60) - (hPI + mPI / 60);
                }

                data.orePreviste = Math.max(0, orePreviste);
            }

            const turno = await prisma.turnoAssegnato.update({
                where: { id },
                data,
                include: {
                    profiloHR: {
                        include: {
                            personTenantProfile: {
                                include: {
                                    person: { select: { firstName: true, lastName: true } }
                                }
                            }
                        }
                    }
                }
            });

            res.json({
                success: true,
                data: turno
            });
        } catch (error) {
            logger.error('Failed to update turno', {
                component: 'hr-turni-routes',
                action: 'update',
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
 * DELETE /api/v1/hr/turni/:id
 * Elimina turno assegnato
 */
router.delete('/:id',
    authenticate,
    requirePermission('hr.turni:assign'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const existing = await prisma.turnoAssegnato.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            await prisma.turnoAssegnato.update({
                where: { id },
                data: { deletedAt: new Date(), stato: 'ANNULLATO' }
            });

            res.json({
                success: true,
                message: 'Turno eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete turno', {
                component: 'hr-turni-routes',
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
