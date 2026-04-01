/**
 * P68 - Profili HR Routes
 * CRUD per profili HR del personale interno
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
 * GET /api/v1/hr/profili
 * Lista tutti i profili HR del tenant
 * P69: Supports tenantIds param for admin multi-tenant view
 */
router.get('/',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const userTenantId = getEffectiveTenantId(req);
            const {
                mansioneInternaId,
                supervisoreId,
                tipoContratto,
                tipoCollaboratore,
                isTimbraturaPbligatoria,
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

            if (mansioneInternaId) where.mansioneInternaId = mansioneInternaId;
            if (supervisoreId) where.supervisoreId = supervisoreId;
            if (isTimbraturaPbligatoria !== undefined) where.isTimbraturaPbligatoria = isTimbraturaPbligatoria === 'true';

            // Filtri su PersonTenantProfile
            const personTenantProfileWhere = {};
            if (tipoContratto) personTenantProfileWhere.tipoContratto = tipoContratto;
            if (tipoCollaboratore) personTenantProfileWhere.tipoCollaboratore = tipoCollaboratore;

            const profili = await prisma.profiloHR.findMany({
                where,
                include: {
                    personTenantProfile: {
                        where: Object.keys(personTenantProfileWhere).length > 0
                            ? personTenantProfileWhere
                            : undefined,
                        include: {
                            person: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    taxCode: true,
                                    birthDate: true,
                                    gender: true,
                                    profileImage: true
                                }
                            }
                        }
                    },
                    mansioneInterna: {
                        select: {
                            id: true,
                            nome: true,
                            areaAziendale: true,
                            livelloGerarchico: true
                        }
                    },
                    supervisore: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: {
                    personTenantProfile: {
                        person: {
                            lastName: 'asc'
                        }
                    }
                }
            });

            // Filtra per tipoContratto/tipoCollaboratore se richiesto
            let filteredProfili = profili;
            if (Object.keys(personTenantProfileWhere).length > 0) {
                filteredProfili = profili.filter(p => {
                    if (tipoContratto && p.personTenantProfile.tipoContratto !== tipoContratto) return false;
                    if (tipoCollaboratore && p.personTenantProfile.tipoCollaboratore !== tipoCollaboratore) return false;
                    return true;
                });
            }

            res.json({
                success: true,
                data: filteredProfili,
                count: filteredProfili.length
            });
        } catch (error) {
            logger.error('Failed to fetch profili HR', {
                component: 'hr-profili-routes',
                action: 'list',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nel recupero dei profili HR'
            });
        }
    }
);

/**
 * GET /api/v1/hr/profili/:id
 * Dettaglio singolo profilo HR
 */
router.get('/:id',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const profilo = await prisma.profiloHR.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    personTenantProfile: {
                        include: {
                            person: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    taxCode: true,
                                    birthDate: true,
                                    birthPlace: true,
                                    birthProvince: true,
                                    gender: true,
                                    profileImage: true
                                }
                            }
                        }
                    },
                    mansioneInterna: true,
                    supervisore: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    // Statistiche
                    _count: {
                        select: {
                            turniAssegnati: true,
                            timbrature: true,
                            assenze: true,
                            cartellini: true
                        }
                    }
                }
            });

            if (!profilo) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Profilo HR non trovato'
                });
            }

            // Calcola saldo ferie/permessi
            const saldoFerie = Number(profilo.saldoFerie) || 0;
            const saldoPermessi = Number(profilo.saldoPermessi) || 0;
            const saldoROL = Number(profilo.saldoROL) || 0;

            res.json({
                success: true,
                data: {
                    ...profilo,
                    saldoFerie,
                    saldoPermessi,
                    saldoROL
                }
            });
        } catch (error) {
            logger.error('Failed to fetch profilo HR', {
                component: 'hr-profili-routes',
                action: 'get',
                error: 'Operazione non riuscita',
                id: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nel recupero del profilo HR'
            });
        }
    }
);

/**
 * POST /api/v1/hr/profili
 * Crea nuovo profilo HR per una PersonTenantProfile esistente
 */
router.post('/',
    authenticate,
    requirePermission('hr:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                personTenantProfileId,
                mansioneInternaId,
                dataAssunzione,
                dataFineContratto,
                matricola,
                oreSettimanaliContrattuali,
                oreGiornaliereStandard,
                pausaPranzoMinuti,
                flexibilityMinuti,
                isTimbraturaPbligatoria,
                canAccessTimbratura,
                saldoFerie,
                saldoPermessi,
                saldoROL,
                noteContrattuali,
                configurazioneOrario,
                supervisoreId
            } = req.body;

            // Validazione
            if (!personTenantProfileId) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'personTenantProfileId è obbligatorio'
                });
            }

            // Verifica che PersonTenantProfile esista e appartenga al tenant
            const ptp = await prisma.personTenantProfile.findFirst({
                where: {
                    id: personTenantProfileId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!ptp) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'PersonTenantProfile non trovato'
                });
            }

            // Verifica che non esista già un profilo HR
            const existingHR = await prisma.profiloHR.findFirst({
                where: {
                    personTenantProfileId,
                    deletedAt: null
                }
            });

            if (existingHR) {
                return res.status(409).json({
                    success: false,
                    error: 'Conflitto',
                    message: 'Profilo HR già esistente per questa persona'
                });
            }

            // Verifica matricola univoca
            if (matricola) {
                const matricolaExists = await prisma.profiloHR.findFirst({
                    where: {
                        tenantId,
                        matricola,
                        deletedAt: null
                    }
                });

                if (matricolaExists) {
                    return res.status(409).json({
                        success: false,
                        error: 'Conflitto',
                        message: 'Matricola già in uso'
                    });
                }
            }

            // Verifica mansione esista
            if (mansioneInternaId) {
                const mansione = await prisma.mansioneInterna.findFirst({
                    where: {
                        id: mansioneInternaId,
                        tenantId,
                        deletedAt: null
                    }
                });

                if (!mansione) {
                    return res.status(404).json({
                        success: false,
                        error: 'Non trovato',
                        message: 'Mansione interna non trovata'
                    });
                }
            }

            // P68: Se il tenant ha una self-company, assegna la persona automaticamente
            // Questo sincronizza employees con profili HR
            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { selfCompanyProfileId: true }
            });

            // Usa una transaction per garantire consistenza
            const profilo = await prisma.$transaction(async (tx) => {
                // Se la persona non è già associata alla self-company, associala
                if (tenant?.selfCompanyProfileId && !ptp.companyTenantProfileId) {
                    await tx.personTenantProfile.update({
                        where: { id: personTenantProfileId },
                        data: { companyTenantProfileId: tenant.selfCompanyProfileId }
                    });
                }

                // Crea il profilo HR
                return tx.profiloHR.create({
                    data: {
                        tenantId,
                        personTenantProfileId,
                        mansioneInternaId,
                        dataAssunzione,
                        dataFineContratto,
                        matricola,
                        oreSettimanaliContrattuali: oreSettimanaliContrattuali || 40,
                        oreGiornaliereStandard: oreGiornaliereStandard || 8,
                        pausaPranzoMinuti: pausaPranzoMinuti || 60,
                        flexibilityMinuti: flexibilityMinuti || 15,
                        isTimbraturaPbligatoria: isTimbraturaPbligatoria !== false,
                        canAccessTimbratura: canAccessTimbratura !== false,
                        saldoFerie: saldoFerie || 0,
                        saldoPermessi: saldoPermessi || 0,
                        saldoROL: saldoROL || 0,
                        noteContrattuali,
                        configurazioneOrario: configurazioneOrario || {},
                        supervisoreId,
                        isActive: true
                    },
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
                });
            });

            logger.info('Profilo HR creato', {
                component: 'hr-profili-routes',
                action: 'create',
                profiloId: profilo.id,
                personTenantProfileId,
                tenantId
            });

            res.status(201).json({
                success: true,
                data: profilo
            });
        } catch (error) {
            logger.error('Failed to create profilo HR', {
                component: 'hr-profili-routes',
                action: 'create',
                error: 'Operazione non riuscita',
                tenantId: req.person?.tenantId
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nella creazione del profilo HR'
            });
        }
    }
);

/**
 * PUT /api/v1/hr/profili/:id
 * Modifica profilo HR
 */
router.put('/:id',
    authenticate,
    requirePermission('hr:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const updateData = req.body;

            // Verifica esistenza
            const existing = await prisma.profiloHR.findFirst({
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
                    message: 'Profilo HR non trovato'
                });
            }

            // Verifica matricola univoca se cambiata
            if (updateData.matricola && updateData.matricola !== existing.matricola) {
                const matricolaExists = await prisma.profiloHR.findFirst({
                    where: {
                        tenantId,
                        matricola: updateData.matricola,
                        id: { not: id },
                        deletedAt: null
                    }
                });

                if (matricolaExists) {
                    return res.status(409).json({
                        success: false,
                        error: 'Conflitto',
                        message: 'Matricola già in uso'
                    });
                }
            }

            // Prepara dati aggiornamento (solo campi consentiti)
            const allowedFields = [
                'mansioneInternaId', 'dataAssunzione', 'dataFineContratto', 'matricola',
                'oreSettimanaliContrattuali', 'oreGiornaliereStandard', 'pausaPranzoMinuti',
                'flexibilityMinuti', 'isActive', 'isTimbraturaPbligatoria', 'canAccessTimbratura',
                'saldoFerie', 'saldoPermessi', 'saldoROL', 'noteContrattuali',
                'configurazioneOrario', 'supervisoreId'
            ];

            const data = {};
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    data[field] = updateData[field];
                }
            }

            const profilo = await prisma.profiloHR.update({
                where: { id },
                data,
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
                    mansioneInterna: true,
                    supervisore: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            logger.info('Profilo HR aggiornato', {
                component: 'hr-profili-routes',
                action: 'update',
                profiloId: id,
                tenantId
            });

            res.json({
                success: true,
                data: profilo
            });
        } catch (error) {
            logger.error('Failed to update profilo HR', {
                component: 'hr-profili-routes',
                action: 'update',
                error: 'Operazione non riuscita',
                id: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nella modifica del profilo HR'
            });
        }
    }
);

/**
 * DELETE /api/v1/hr/profili/:id
 * Soft delete profilo HR
 * P69 Session 5.9: Accept deletionReason from query param or body
 */
router.delete('/:id',
    authenticate,
    requirePermission('hr:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            // P69: Accept deletionReason from query param (frontend) or body
            const deletionReason = req.query.deletionReason || req.body.deletionReason;

            // Validazione GDPR
            if (!deletionReason || deletionReason.length < 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Motivo eliminazione obbligatorio (min 10 caratteri)'
                });
            }

            const existing = await prisma.profiloHR.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
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
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Profilo HR non trovato'
                });
            }

            // Soft delete
            await prisma.profiloHR.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            // Audit log GDPR
            const personName = `${existing.personTenantProfile.person.firstName} ${existing.personTenantProfile.person.lastName}`;
            await prisma.gdprAuditLog.create({
                data: {
                    tenantId,
                    resourceType: 'ProfiloHR',
                    resourceId: id,
                    action: 'SOFT_DELETE',
                    personId: req.person.id,
                    dataAccessed: {
                        personName,
                        personTenantProfileId: existing.personTenantProfileId,
                        deletionReason
                    }
                }
            });

            logger.info('Profilo HR eliminato', {
                component: 'hr-profili-routes',
                action: 'delete',
                profiloId: id,
                tenantId
            });

            res.json({
                success: true,
                message: 'Profilo HR eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete profilo HR', {
                component: 'hr-profili-routes',
                action: 'delete',
                error: 'Operazione non riuscita',
                id: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nella eliminazione del profilo HR'
            });
        }
    }
);

/**
 * GET /api/v1/hr/profili/:id/saldo-ferie
 * Ottieni saldo ferie e permessi
 */
router.get('/:id/saldo-ferie',
    authenticate,
    requirePermission('hr:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { anno } = req.query;

            const profilo = await prisma.profiloHR.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                select: {
                    id: true,
                    saldoFerie: true,
                    saldoPermessi: true,
                    saldoROL: true
                }
            });

            if (!profilo) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Profilo HR non trovato'
                });
            }

            // Calcola assenze approvate nell'anno
            const annoCorrente = anno ? parseInt(anno) : new Date().getFullYear();
            const inizioAnno = new Date(annoCorrente, 0, 1);
            const fineAnno = new Date(annoCorrente, 11, 31);

            const assenzeAnno = await prisma.assenza.groupBy({
                by: ['tipo'],
                where: {
                    profiloHRId: id,
                    stato: 'APPROVATA',
                    dataInizio: { gte: inizioAnno },
                    dataFine: { lte: fineAnno },
                    deletedAt: null
                },
                _sum: {
                    giorniTotali: true
                }
            });

            const assenzeMap = {};
            for (const a of assenzeAnno) {
                assenzeMap[a.tipo] = Number(a._sum.giorniTotali) || 0;
            }

            res.json({
                success: true,
                data: {
                    anno: annoCorrente,
                    ferie: {
                        saldo: Number(profilo.saldoFerie) || 0,
                        usateAnnoCorrente: assenzeMap['FERIE'] || 0
                    },
                    permessi: {
                        saldo: Number(profilo.saldoPermessi) || 0,
                        usatiAnnoCorrente: (assenzeMap['PERMESSO_ROL'] || 0) + (assenzeMap['PERMESSO_EX_FESTIVITA'] || 0)
                    },
                    rol: {
                        saldo: Number(profilo.saldoROL) || 0
                    },
                    altreAssenze: {
                        malattia: assenzeMap['MALATTIA'] || 0,
                        infortunio: assenzeMap['INFORTUNIO'] || 0,
                        maternita: assenzeMap['MATERNITA'] || 0,
                        paternita: assenzeMap['PATERNITA'] || 0,
                        altro: assenzeMap['ALTRO'] || 0
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to get saldo ferie', {
                component: 'hr-profili-routes',
                action: 'getSaldoFerie',
                error: 'Operazione non riuscita',
                id: req.params.id
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nel calcolo del saldo ferie'
            });
        }
    }
);

export default router;
