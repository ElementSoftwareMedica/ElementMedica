/**
 * P68 - Mansioni Interne Routes
 * CRUD per mansioni/ruoli interni del personale
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
 * GET /api/v1/hr/mansioni-interne
 * Lista tutte le mansioni interne del tenant
 * P69 Session 5.9: Support tenantIds query param for multi-tenant filtering
 */
router.get('/',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const userTenantId = getEffectiveTenantId(req);
            const { areaAziendale, isActive, tenantIds, allTenants } = req.query;

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

            if (areaAziendale) {
                where.areaAziendale = areaAziendale;
            }

            if (isActive !== undefined) {
                where.isActive = isActive === 'true';
            }

            const mansioni = await prisma.mansioneInterna.findMany({
                where,
                include: {
                    defaultRole: {
                        select: { id: true, name: true, displayName: true }
                    },
                    _count: {
                        select: {
                            profiliHR: true
                        }
                    }
                },
                orderBy: [
                    { areaAziendale: 'asc' },
                    { livelloGerarchico: 'desc' },
                    { nome: 'asc' }
                ]
            });

            res.json({
                success: true,
                data: mansioni,
                count: mansioni.length
            });
        } catch (error) {
            logger.error('Failed to fetch mansioni interne', {
                component: 'hr-mansioni-routes',
                action: 'list',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nel recupero delle mansioni'
            });
        }
    }
);

/**
 * GET /api/v1/hr/mansioni-interne/:id
 * Dettaglio singola mansione
 */
router.get('/:id',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const mansione = await prisma.mansioneInterna.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    profiliHR: {
                        where: { deletedAt: null },
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
                }
            });

            if (!mansione) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Mansione non trovata'
                });
            }

            res.json({
                success: true,
                data: mansione
            });
        } catch (error) {
            logger.error('Failed to fetch mansione interna', {
                component: 'hr-mansioni-routes',
                action: 'get',
                error: 'Operazione non riuscita',
                id: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nel recupero della mansione'
            });
        }
    }
);

/**
 * POST /api/v1/hr/mansioni-interne
 * Crea nuova mansione
 */
router.post('/',
    authenticate,
    requirePermission('hr.mansioni:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                nome,
                descrizione,
                areaAziendale,
                livelloGerarchico,
                requisitiMinimi,
                competenzeRichieste,
                responsabilita,
                oreMinimeSettimanali,
                oreMassimeSettimanali,
                sigla,
                colore,
                defaultRoleId,
                defaultPermissions
            } = req.body;

            // Validazione campi obbligatori
            if (!nome || !areaAziendale) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Nome e area aziendale sono obbligatori'
                });
            }

            // Verifica che il ruolo esista nel tenant (CustomRole)
            if (defaultRoleId) {
                const role = await prisma.customRole.findFirst({
                    where: { id: defaultRoleId, tenantId, deletedAt: null }
                });
                if (!role) {
                    logger.warn('defaultRoleId non trovato in customRole (create)', {
                        component: 'hr-mansioni-routes',
                        defaultRoleId,
                        tenantId
                    });
                    return res.status(400).json({
                        success: false,
                        error: 'Errore di validazione',
                        message: 'Ruolo selezionato non valido. Selezionare un ruolo personalizzato del tenant.'
                    });
                }
            }

            // Verifica unicità nome nel tenant
            const existing = await prisma.mansioneInterna.findFirst({
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
                    message: `Mansione con nome "${nome}" già esistente`
                });
            }

            const mansione = await prisma.mansioneInterna.create({
                data: {
                    tenantId,
                    nome,
                    descrizione,
                    areaAziendale,
                    livelloGerarchico: livelloGerarchico || 1,
                    requisitiMinimi: requisitiMinimi || {},
                    competenzeRichieste: competenzeRichieste || {},
                    responsabilita: responsabilita || {},
                    oreMinimeSettimanali,
                    oreMassimeSettimanali,
                    sigla: sigla ? sigla.toUpperCase().substring(0, 5) : null,
                    colore,
                    defaultRoleId,
                    defaultPermissions: defaultPermissions || null,
                    isActive: true
                },
                include: {
                    defaultRole: {
                        select: { id: true, name: true, displayName: true }
                    }
                }
            });

            logger.info('Mansione interna creata', {
                component: 'hr-mansioni-routes',
                action: 'create',
                mansioneId: mansione.id,
                nome,
                tenantId
            });

            res.status(201).json({
                success: true,
                data: mansione
            });
        } catch (error) {
            logger.error('Failed to create mansione interna', {
                component: 'hr-mansioni-routes',
                action: 'create',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nella creazione della mansione'
            });
        }
    }
);

/**
 * PUT /api/v1/hr/mansioni-interne/:id
 * Modifica mansione
 */
router.put('/:id',
    authenticate,
    requirePermission('hr.mansioni:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const {
                nome,
                descrizione,
                areaAziendale,
                livelloGerarchico,
                requisitiMinimi,
                competenzeRichieste,
                responsabilita,
                oreMinimeSettimanali,
                oreMassimeSettimanali,
                sigla,
                colore,
                defaultRoleId,
                defaultPermissions,
                isActive
            } = req.body;

            // Verifica esistenza
            const existing = await prisma.mansioneInterna.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Mansione non trovata'
                });
            }

            // Verifica che il ruolo esista nel tenant (CustomRole)
            if (defaultRoleId) {
                const role = await prisma.customRole.findFirst({
                    where: { id: defaultRoleId, tenantId, deletedAt: null }
                });
                if (!role) {
                    logger.warn('defaultRoleId non trovato in customRole', {
                        component: 'hr-mansioni-routes',
                        defaultRoleId,
                        tenantId
                    });
                    return res.status(400).json({
                        success: false,
                        error: 'Errore di validazione',
                        message: 'Ruolo selezionato non valido. Selezionare un ruolo personalizzato del tenant.'
                    });
                }
            }

            // Se cambio nome, verifica unicità
            if (nome && nome !== existing.nome) {
                const duplicate = await prisma.mansioneInterna.findFirst({
                    where: {
                        tenantId,
                        nome,
                        id: { not: id },
                        deletedAt: null
                    }
                });

                if (duplicate) {
                    return res.status(409).json({
                        success: false,
                        error: 'Conflitto',
                        message: `Mansione con nome "${nome}" già esistente`
                    });
                }
            }

            const mansione = await prisma.mansioneInterna.update({
                where: { id },
                data: {
                    ...(nome && { nome }),
                    ...(descrizione !== undefined && { descrizione }),
                    ...(areaAziendale && { areaAziendale }),
                    ...(livelloGerarchico !== undefined && { livelloGerarchico }),
                    ...(requisitiMinimi && { requisitiMinimi }),
                    ...(competenzeRichieste && { competenzeRichieste }),
                    ...(responsabilita && { responsabilita }),
                    ...(oreMinimeSettimanali !== undefined && { oreMinimeSettimanali }),
                    ...(oreMassimeSettimanali !== undefined && { oreMassimeSettimanali }),
                    ...(sigla !== undefined && { sigla: sigla ? sigla.toUpperCase().substring(0, 5) : null }),
                    ...(colore !== undefined && { colore }),
                    ...(defaultRoleId !== undefined && { defaultRoleId: defaultRoleId || null }),
                    ...(defaultPermissions !== undefined && { defaultPermissions }),
                    ...(isActive !== undefined && { isActive })
                },
                include: {
                    defaultRole: {
                        select: { id: true, name: true, displayName: true }
                    }
                }
            });

            logger.info('Mansione interna aggiornata', {
                component: 'hr-mansioni-routes',
                action: 'update',
                mansioneId: id,
                tenantId
            });

            res.json({
                success: true,
                data: mansione
            });
        } catch (error) {
            logger.error('Failed to update mansione interna', {
                component: 'hr-mansioni-routes',
                action: 'update',
                error: 'Operazione non riuscita',
                id: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nella modifica della mansione'
            });
        }
    }
);

/**
 * DELETE /api/v1/hr/mansioni-interne/:id
 * Soft delete mansione
 */
router.delete('/:id',
    authenticate,
    requirePermission('hr.mansioni:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { deletionReason } = req.body;

            // Validazione GDPR: motivo obbligatorio
            if (!deletionReason || deletionReason.length < 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Motivo eliminazione obbligatorio (min 10 caratteri)'
                });
            }

            // Verifica esistenza
            const existing = await prisma.mansioneInterna.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    _count: {
                        select: {
                            profiliHR: { where: { deletedAt: null } }
                        }
                    }
                }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Mansione non trovata'
                });
            }

            // Verifica che non ci siano profili attivi collegati
            if (existing._count.profiliHR > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Conflitto',
                    message: `Impossibile eliminare: ${existing._count.profiliHR} profili HR collegati`
                });
            }

            // Soft delete
            await prisma.mansioneInterna.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    isActive: false
                }
            });

            // Audit log GDPR
            await prisma.gdprAuditLog.create({
                data: {
                    tenantId,
                    resourceType: 'MansioneInterna',
                    resourceId: id,
                    action: 'SOFT_DELETE',
                    personId: req.person.id,
                    dataAccessed: { nome: existing.nome, deletionReason }
                }
            });

            logger.info('Mansione interna eliminata', {
                component: 'hr-mansioni-routes',
                action: 'delete',
                mansioneId: id,
                tenantId
            });

            res.json({
                success: true,
                message: 'Mansione eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete mansione interna', {
                component: 'hr-mansioni-routes',
                action: 'delete',
                error: 'Operazione non riuscita',
                id: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nella eliminazione della mansione'
            });
        }
    }
);

export default router;
