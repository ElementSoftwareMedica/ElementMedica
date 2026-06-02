/**
 * Route per Multi-Prestazioni Appuntamento
 * Progetto 55: Medicina del Lavoro - Multi-Prestazioni
 * 
 * Endpoints:
 * - POST   /appuntamenti/:id/prestazioni/from-bundle - Crea da bundle
 * - POST   /appuntamenti/:id/prestazioni - Crea prestazioni singole
 * - GET    /appuntamenti/:id/prestazioni - Lista prestazioni appuntamento
 * - GET    /prestazioni-da-refertare - Lista per medico refertante
 * - PATCH  /prestazioni/:id/stato - Aggiorna stato
 * - POST   /prestazioni/:id/link-referto - Collega referto
 * - POST   /prestazioni/:id/medico-refertante - Assegna medico
 * - DELETE /prestazioni/:id - Elimina prestazione
 * 
 * @module routes/clinica/appuntamentoPrestazioni.routes
 */

import express from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import AppuntamentoPrestazioneService from '../../services/clinical/AppuntamentoPrestazioneService.js';
import VisitaSecondariaService from '../../services/clinical/VisitaSecondariaService.js';
import { VisitTemplateService } from '../../services/clinical/VisitTemplateService.js';
import { logger } from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';
import MovimentoContabileGenerator from '../../services/management/MovimentoContabileGenerator.js';
import { validateParamId } from '../../middleware/validateUUID.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = express.Router();
router.param('id', validateParamId);

function buildNormalValuesFromTemplate(template) {
    const values = {};
    const fields = Array.isArray(template?.fields) ? template.fields : [];
    for (const field of fields) {
        if (!field?.name || field.visible === false) continue;
        const hasNormalPreset = field.metadata && Object.prototype.hasOwnProperty.call(field.metadata, 'normalPreset');
        const value = hasNormalPreset ? field.metadata.normalPreset : field.defaultValue;
        if (value !== undefined) values[field.name] = value;
    }
    return values;
}

async function ensureSecondaryVisitWithNormalPreset({ appPrestazioneId, visitaParentId, tenantId, personId }) {
    const appPrestazione = await prisma.appuntamentoPrestazione.findFirst({
        where: { id: appPrestazioneId, tenantId, deletedAt: null },
        select: {
            id: true,
            prestazioneId: true,
            appuntamentoId: true,
            medicoRefertanteId: true,
            visitaSecundaria: {
                select: { id: true, datiStrutturati: true }
            },
            appuntamento: {
                select: { id: true, medicoId: true }
            }
        }
    });

    if (!appPrestazione) return null;
    const medicoReferenteId = appPrestazione.medicoRefertanteId || appPrestazione.appuntamento?.medicoId;
    if (!medicoReferenteId) return null;

    const visitaSecondaria = await VisitaSecondariaService.creaVisitaSecondaria({
        appPrestazioneId: appPrestazione.id,
        prestazioneId: appPrestazione.prestazioneId,
        medicoReferenteId,
        appuntamentoId: appPrestazione.appuntamentoId,
        visitaParentId: visitaParentId || null,
        tenantId,
        createdBy: personId,
        forceCreateForSameMedico: true
    });

    if (!visitaSecondaria?.id) return null;

    const template = await VisitTemplateService.ensureSpecialistTemplateForPrestazione(
        appPrestazione.prestazioneId,
        tenantId,
        personId || null
    );
    const normalValues = buildNormalValuesFromTemplate(template);
    if (Object.keys(normalValues).length === 0) return visitaSecondaria;

    const currentValues = (visitaSecondaria.datiStrutturati && typeof visitaSecondaria.datiStrutturati === 'object')
        ? visitaSecondaria.datiStrutturati
        : {};

    return prisma.visita.update({
        where: { id: visitaSecondaria.id },
        data: {
            visitTemplateId: template?.id || visitaSecondaria.visitTemplateId || undefined,
            datiStrutturati: {
                ...currentValues,
                ...normalValues
            },
            stato: 'COMPLETATA',
            updatedAt: new Date()
        }
    });
}

async function resolveAppPrestazioneForAction({ id, tenantId, visitaParentId }) {
    const select = {
        id: true,
        prestazioneId: true,
        appuntamentoId: true,
        medicoRefertanteId: true,
        deletedAt: true,
        appuntamento: {
            select: { id: true, medicoId: true }
        }
    };

    const byAppPrestazioneId = await prisma.appuntamentoPrestazione.findFirst({
        where: { id, tenantId },
        select
    });
    if (byAppPrestazioneId) {
        if (!byAppPrestazioneId.deletedAt) return byAppPrestazioneId;
        return prisma.appuntamentoPrestazione.update({
            where: { id: byAppPrestazioneId.id },
            data: { deletedAt: null },
            select
        });
    }

    const bySecondaryVisit = await prisma.visita.findFirst({
        where: {
            id,
            tenantId,
            deletedAt: null,
            appPrestazioneId: { not: null }
        },
        select: { appPrestazioneId: true }
    });
    if (bySecondaryVisit?.appPrestazioneId) {
        const appPrestazione = await prisma.appuntamentoPrestazione.findFirst({
            where: { id: bySecondaryVisit.appPrestazioneId, tenantId },
            select
        });
        if (appPrestazione) {
            if (!appPrestazione.deletedAt) return appPrestazione;
            return prisma.appuntamentoPrestazione.update({
                where: { id: appPrestazione.id },
                data: { deletedAt: null },
                select
            });
        }
    }

    if (!visitaParentId) return null;

    const parentVisit = await prisma.visita.findFirst({
        where: { id: visitaParentId, tenantId, deletedAt: null },
        select: { id: true, appuntamentoId: true, medicoId: true }
    });
    if (!parentVisit?.appuntamentoId) return null;

    const catalogPrestazione = await prisma.prestazione.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { id: true }
    });
    if (!catalogPrestazione) return null;

    const existingByCatalogPrestazione = await prisma.appuntamentoPrestazione.findUnique({
        where: {
            appuntamentoId_prestazioneId: {
                appuntamentoId: parentVisit.appuntamentoId,
                prestazioneId: id
            }
        },
        select
    });
    if (existingByCatalogPrestazione && !existingByCatalogPrestazione.deletedAt) {
        return existingByCatalogPrestazione;
    }
    if (existingByCatalogPrestazione?.deletedAt) {
        return prisma.appuntamentoPrestazione.update({
            where: { id: existingByCatalogPrestazione.id },
            data: { deletedAt: null },
            select
        });
    }

    const created = await AppuntamentoPrestazioneService.create({
        appuntamentoId: parentVisit.appuntamentoId,
        prestazioni: [{ prestazioneId: id, medicoRefertanteId: parentVisit.medicoId || undefined }],
        tenantId
    });

    return Array.isArray(created) && created.length > 0
        ? await prisma.appuntamentoPrestazione.findFirst({
            where: { id: created[0].id, tenantId, deletedAt: null },
            select
        })
        : null;
}

/**
 * POST /appuntamenti/:id/prestazioni/from-bundle
 * Crea prestazioni da bundle
 */
router.post(
    '/appuntamenti/:id/prestazioni/from-bundle',
    authenticate,
    requirePermission('appuntamenti:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id: appuntamentoId } = req.params;
            const { bundleId, medicoRefertanteOverrides } = req.body;

            if (!bundleId) {
                return res.status(400).json({
                    success: false,
                    error: 'bundleId è obbligatorio'
                });
            }

            const prestazioni = await AppuntamentoPrestazioneService.createFromBundle({
                appuntamentoId,
                bundleId,
                tenantId,
                medicoRefertanteOverrides
            });

            res.status(201).json({
                success: true,
                data: prestazioni,
                message: `Create ${prestazioni.length} prestazioni da bundle`
            });

            // P72_14: Genera movimenti contabili (ENTRATA + USCITA) per ogni prestazione creata da bundle
            setImmediate(async () => {
                try {
                    for (const ap of prestazioni) {
                        const appPrestazione = await prisma.appuntamentoPrestazione.findFirst({
                            where: { id: ap.id, tenantId, deletedAt: null },
                            include: {
                                appuntamento: {
                                    select: { id: true, pazienteId: true, medicoId: true, dataOra: true, companyTenantProfileId: true, tipoVisitaMDL: true },
                                },
                                prestazione: {
                                    select: { id: true, nome: true, tipo: true, prezzoBase: true },
                                },
                            },
                        });
                        if (appPrestazione) {
                            const mResult = await MovimentoContabileGenerator.generaPerAppuntamentoPrestazione(
                                appPrestazione, tenantId, req.person?.id
                            );
                            if (mResult.warnings.length > 0) {
                                logger.warn({
                                    component: 'appuntamentoPrestazioni.routes',
                                    action: 'genera-movimenti-from-bundle',
                                    appPrestazioneId: ap.id,
                                    warnings: mResult.warnings,
                                }, 'Warning nella generazione movimenti contabili da bundle');
                            }
                        }
                    }
                } catch (err) {
                    logger.error({
                        component: 'appuntamentoPrestazioni.routes',
                        action: 'genera-movimenti-from-bundle',
                        error: 'Operazione non riuscita',
                        appuntamentoId,
                    }, 'Errore nella generazione movimenti contabili per prestazioni da bundle');
                }
            });
        } catch (error) {
            logger.error('Errore creazione prestazioni da bundle', {
                error: 'Operazione non riuscita',
                appuntamentoId: req.params.id
            });
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /appuntamenti/:id/prestazioni
 * Crea prestazioni singole.
 * P73: Se medicoRefertanteId è diverso dal medico dell'appuntamento, crea anche una
 *      Visita secondaria per lo specialista (collegata tramite visitaParentId).
 *      I movimenti contabili sono generati UNA SOLA VOLTA in questo endpoint.
 */
router.post(
    '/appuntamenti/:id/prestazioni',
    authenticate,
    requirePermission('appuntamenti:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id: appuntamentoId } = req.params;
            const { prestazioni, visitaId: visitaParentId } = req.body; // visitaId = ID visita principale (opzionale)

            if (!prestazioni || !Array.isArray(prestazioni) || prestazioni.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'prestazioni è obbligatorio (array non vuoto)'
                });
            }

            // Carica l'appuntamento per confrontare medicoId
            const appuntamento = await prisma.appuntamento.findFirst({
                where: { id: appuntamentoId, tenantId, deletedAt: null },
                select: { medicoId: true }
            });

            const created = await AppuntamentoPrestazioneService.create({
                appuntamentoId,
                prestazioni,
                tenantId
            });

            // P73: Crea visite secondarie per specialisti (medicoRefertanteId ≠ medico appuntamento)
            const resultWithVisite = await Promise.all(
                created.map(async (ap) => {
                    const isEsternalizzata = ap.medicoRefertanteId &&
                        appuntamento &&
                        ap.medicoRefertanteId !== appuntamento.medicoId;

                    if (!isEsternalizzata) {
                        return { ...ap, visitaSecondariaId: null };
                    }

                    try {
                        const visitaSecundaria = await VisitaSecondariaService.creaVisitaSecondaria({
                            appPrestazioneId: ap.id,
                            prestazioneId: ap.prestazioneId,
                            medicoReferenteId: ap.medicoRefertanteId,
                            appuntamentoId,
                            visitaParentId: visitaParentId || null,
                            tenantId,
                            createdBy: req.person?.id
                        });
                        return {
                            ...ap,
                            visitaSecondariaId: visitaSecundaria?.id || null
                        };
                    } catch (err) {
                        logger.error({
                            component: 'appuntamentoPrestazioni.routes',
                            action: 'crea-visita-secondaria',
                            appPrestazioneId: ap.id,
                            error: 'Operazione non riuscita'
                        }, 'Errore creazione visita secondaria — prestazione registrata ma specialista non notificato');
                        return { ...ap, visitaSecondariaId: null };
                    }
                })
            );

            res.status(201).json({
                success: true,
                data: resultWithVisite,
                message: `Create ${created.length} prestazioni`
            });

            // Genera movimenti contabili per ogni nuova prestazione (async, non blocca la risposta)
            setImmediate(async () => {
                try {
                    for (const ap of created) {
                        const appPrestazione = await prisma.appuntamentoPrestazione.findFirst({
                            where: { id: ap.id, tenantId, deletedAt: null },
                            include: {
                                appuntamento: {
                                    select: { id: true, pazienteId: true, medicoId: true, dataOra: true, companyTenantProfileId: true, tipoVisitaMDL: true },
                                },
                                prestazione: {
                                    select: { id: true, nome: true, tipo: true, prezzoBase: true },
                                },
                            },
                        });
                        if (appPrestazione) {
                            const mResult = await MovimentoContabileGenerator.generaPerAppuntamentoPrestazione(
                                appPrestazione, tenantId, req.person?.id
                            );
                            if (mResult.warnings.length > 0) {
                                logger.warn({
                                    component: 'appuntamentoPrestazioni.routes',
                                    action: 'genera-movimento-prestazione-create',
                                    appPrestazioneId: ap.id,
                                    warnings: mResult.warnings,
                                }, 'Warning nella generazione movimento contabile nuova prestazione');
                            }
                        }
                    }
                } catch (err) {
                    logger.error({
                        component: 'appuntamentoPrestazioni.routes',
                        action: 'genera-movimento-prestazione-create',
                        error: 'Operazione non riuscita',
                        appuntamentoId,
                    }, 'Errore nella generazione movimenti contabili per nuove prestazioni');
                }
            });
        } catch (error) {
            logger.error('Errore creazione prestazioni', {
                component: 'appuntamentoPrestazioni.routes',
                error: 'Operazione non riuscita',
                appuntamentoId: req.params.id
            });
            const statusCode = (error.message && error.message.includes('non trovat')) ? 404
                : (error.message && error.message.includes('non autorizzat')) ? 403
                    : 400;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nella creazione delle prestazioni',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /appuntamenti/:id/prestazioni
 * Lista prestazioni di un appuntamento
 */
router.get(
    '/appuntamenti/:id/prestazioni',
    authenticate,
    requirePermission('appuntamenti:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id: appuntamentoId } = req.params;

            const prestazioni = await AppuntamentoPrestazioneService.listByAppuntamento(
                appuntamentoId,
                tenantId
            );

            res.json({
                success: true,
                data: prestazioni
            });
        } catch (error) {
            logger.error('Errore lista prestazioni appuntamento', {
                component: 'appuntamentoPrestazioni.routes',
                error: 'Operazione non riuscita',
                appuntamentoId: req.params.id
            });
            const statusCode = (error.message && (error.message.includes('non trovat') || error.message.includes('non autorizzat'))) ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                error: 'Errore nel recupero delle prestazioni',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /prestazioni-da-refertare
 * Lista prestazioni da refertare per il medico corrente
 */
router.get(
    '/prestazioni-da-refertare',
    authenticate,
    requirePermission('visite:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            // Solo i Medici vedono le proprie prestazioni; admin/altri vedono tutto (medicoId=null)
            const isMedico = req.person.roles?.includes('MEDICO');
            const medicoId = isMedico ? req.person.id : null;
            const { page = 1, limit = 20, stati } = req.query;

            // Permetti filtro per stati specifici
            const statiArray = stati ? stati.split(',') : undefined;

            const result = await AppuntamentoPrestazioneService.listDaRefertare({
                medicoId,
                tenantId,
                stati: statiArray,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10)
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Errore lista prestazioni da refertare', {
                component: 'appuntamentoPrestazioni.routes',
                error: 'Operazione non riuscita',
                medicoId: req.person?.id
            });
            res.status(400).json({
                success: false,
                error: 'Errore nel recupero delle prestazioni da refertare',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /prestazioni-da-refertare/cleanup-orfane
 * Soft-delete delle prestazioni da refertare senza visita collegata (dati orfani/test).
 * Richiede permesso admin.
 */
router.post(
    '/prestazioni-da-refertare/cleanup-orfane',
    authenticate,
    requirePermission('visite:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await AppuntamentoPrestazioneService.cleanupOrfane({ tenantId });
            res.json({ success: true, ...result });
        } catch (error) {
            logger.error('Errore cleanup orfane da refertare', {
                component: 'appuntamentoPrestazioni.routes',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({ success: false, error: 'Errore durante la pulizia dei dati orfani' });
        }
    }
);

/**
 * POST /prestazioni-da-refertare/cleanup-stale-completate
 * Soft-delete delle prestazioni da refertare il cui appuntamento ha visita COMPLETATA
 * ma nessun referto è mai stato emesso (record in pending obsoleto).
 */
router.post(
    '/prestazioni-da-refertare/cleanup-stale-completate',
    authenticate,
    requirePermission('visite:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const result = await AppuntamentoPrestazioneService.cleanupStaleCompletate({ tenantId });
            res.json({ success: true, ...result });
        } catch (error) {
            logger.error('Errore cleanup stale completate da refertare', {
                component: 'appuntamentoPrestazioni.routes',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({ success: false, error: 'Errore durante la pulizia dei record in pending obsoleti' });
        }
    }
);

/**
 * GET /prestazioni-da-refertare/stats
 * Statistiche prestazioni per medico refertante
 */
router.get(
    '/prestazioni-da-refertare/stats',
    authenticate,
    requirePermission('visite:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            // Solo i Medici vedono le proprie statistiche; admin/altri vedono tutto (medicoId=null)
            const isMedico = req.person.roles?.includes('MEDICO');
            const medicoId = isMedico ? req.person.id : null;
            const { from, to } = req.query;

            const stats = await AppuntamentoPrestazioneService.getStatisticheRefertante(
                medicoId,
                tenantId,
                { from, to }
            );

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Errore statistiche refertante', {
                component: 'appuntamentoPrestazioni.routes',
                error: 'Operazione non riuscita',
                medicoId: req.person?.id
            });
            res.status(400).json({
                success: false,
                error: 'Errore nelle statistiche prestazioni',
                message: 'Errore interno del server'
            });
        }
    }
);

/**
 * PATCH /prestazioni/:id/stato
 * Aggiorna stato prestazione
 */
router.patch(
    '/prestazioni/:id/stato',
    authenticate,
    requirePermission('visite:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { stato, note, dataEsecuzione, applyNormalPreset, visitaParentId } = req.body;

            if (!stato) {
                return res.status(400).json({
                    success: false,
                    error: 'stato è obbligatorio'
                });
            }

            const appPrestazione = await resolveAppPrestazioneForAction({
                id,
                tenantId,
                visitaParentId
            });

            if (!appPrestazione) {
                return res.status(404).json({
                    success: false,
                    error: 'Prestazione appuntamento non trovata'
                });
            }

            const updated = await AppuntamentoPrestazioneService.updateStato({
                id: appPrestazione.id,
                stato,
                tenantId,
                updatedBy: req.person?.id,
                updates: { note, dataEsecuzione }
            });

            let visitaSecondaria = null;
            if (stato === 'ESEGUITA' && applyNormalPreset) {
                try {
                    visitaSecondaria = await ensureSecondaryVisitWithNormalPreset({
                        appPrestazioneId: appPrestazione.id,
                        visitaParentId,
                        tenantId,
                        personId: req.person?.id
                    });
                } catch (presetError) {
                    logger.warn({
                        component: 'appuntamentoPrestazioni.routes',
                        action: 'apply-normal-preset',
                        appPrestazioneId: id,
                        error: presetError.message
                    }, 'Preset normalità visita secondaria non applicato');
                }
            }

            // Genera movimenti contabili quando la prestazione viene refertata (non-MDL)
            if (stato === 'REFERTATA') {
                const resolvedAppPrestazioneId = appPrestazione.id;
                setImmediate(async () => {
                    try {
                        const appPrestazioneForMovimento = await prisma.appuntamentoPrestazione.findFirst({
                            where: { id: resolvedAppPrestazioneId, tenantId, deletedAt: null },
                            include: {
                                appuntamento: {
                                    select: {
                                        id: true,
                                        pazienteId: true,
                                        medicoId: true,
                                        dataOra: true,
                                        companyTenantProfileId: true,
                                    },
                                },
                                prestazione: {
                                    select: { id: true, nome: true, tipo: true, prezzoBase: true },
                                },
                            },
                        });
                        if (appPrestazioneForMovimento) {
                            const result = await MovimentoContabileGenerator.generaPerAppuntamentoPrestazione(
                                appPrestazioneForMovimento, tenantId, req.person?.id
                            );
                            if (result.warnings.length > 0) {
                                logger.warn({
                                    component: 'appuntamentoPrestazioni.routes',
                                    action: 'genera-movimento-prestazione',
                                    appPrestazioneId: resolvedAppPrestazioneId,
                                    warnings: result.warnings,
                                }, 'Warning nella generazione movimento contabile prestazione');
                            }
                        }
                    } catch (err) {
                        logger.error({
                            component: 'appuntamentoPrestazioni.routes',
                            action: 'genera-movimento-prestazione',
                            error: 'Operazione non riuscita',
                            appPrestazioneId: resolvedAppPrestazioneId,
                        }, 'Errore nella generazione movimento contabile prestazione');
                    }
                });
            }

            res.json({
                success: true,
                data: visitaSecondaria?.id
                    ? { ...updated, visitaSecondariaId: visitaSecondaria.id }
                    : updated
            });
        } catch (error) {
            logger.error('Errore aggiornamento stato prestazione', {
                error: 'Operazione non riuscita',
                prestazioneId: req.params.id
            });
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /prestazioni/:id/link-referto
 * Collega referto a prestazione
 */
router.post(
    '/prestazioni/:id/link-referto',
    authenticate,
    requirePermission('visite:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { refertoId } = req.body;

            if (!refertoId) {
                return res.status(400).json({
                    success: false,
                    error: 'refertoId è obbligatorio'
                });
            }

            const updated = await AppuntamentoPrestazioneService.linkReferto({
                id,
                refertoId,
                tenantId
            });

            res.json({
                success: true,
                data: updated
            });
        } catch (error) {
            logger.error('Errore collegamento referto', {
                error: 'Operazione non riuscita',
                prestazioneId: req.params.id
            });
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /prestazioni/:id/medico-refertante
 * Assegna medico refertante.
 * P73: Gestisce anche la creazione/aggiornamento/annullamento della visita secondaria
 * quando il medico cambia rispetto al medico dell'appuntamento principale.
 */
router.post(
    '/prestazioni/:id/medico-refertante',
    authenticate,
    requirePermission('appuntamenti:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { medicoRefertanteId } = req.body;

            if (!medicoRefertanteId) {
                return res.status(400).json({
                    success: false,
                    error: 'medicoRefertanteId è obbligatorio'
                });
            }

            const updated = await AppuntamentoPrestazioneService.assignMedicoRefertante({
                id,
                medicoRefertanteId,
                tenantId
            });

            // P73: Gestione visita secondaria dopo aggiornamento medico refertante
            // Eseguito in modo asincrono per non bloccare la risposta
            setImmediate(async () => {
                try {
                    // Carica l'appPrestazione con l'appuntamento principale
                    const appPrestazione = await prisma.appuntamentoPrestazione.findFirst({
                        where: { id, tenantId, deletedAt: null },
                        select: {
                            id: true,
                            prestazioneId: true,
                            appuntamentoId: true,
                            medicoRefertanteId: true,
                            appuntamento: {
                                select: { id: true, medicoId: true }
                            }
                        }
                    });

                    if (!appPrestazione) return;

                    const appuntamento = appPrestazione.appuntamento;
                    const isEsternalizzata = medicoRefertanteId !== appuntamento.medicoId;

                    // Cerca visita secondaria esistente per questo appPrestazioneId
                    const existingSecondaria = await prisma.visita.findUnique({
                        where: { appPrestazioneId: id }
                    });

                    if (isEsternalizzata) {
                        if (existingSecondaria) {
                            // Aggiorna il medico sulla visita secondaria esistente
                            if (existingSecondaria.medicoId !== medicoRefertanteId) {
                                const visitaAggiornata = await prisma.visita.update({
                                    where: { id: existingSecondaria.id },
                                    data: {
                                        medicoId: medicoRefertanteId,
                                        medicoRefertanteId,
                                        prestazioneId: appPrestazione.prestazioneId,
                                        stato: 'IN_CORSO'
                                    },
                                    include: {
                                        prestazione: { select: { id: true, nome: true } }
                                    }
                                });
                                await VisitaSecondariaService.notifyMedicoVisitaSecondaria(visitaAggiornata, tenantId, req.person?.id).catch(() => null);
                                logger.info({
                                    component: 'appuntamentoPrestazioni.routes',
                                    action: 'assignMedicoRefertante',
                                    visitaSecondariaId: existingSecondaria.id,
                                    newMedicoId: medicoRefertanteId
                                }, 'Visita secondaria: medico aggiornato');
                            }
                        } else {
                            // Trova la visita principale tramite appuntamento
                            const visitaPrincipale = await prisma.visita.findFirst({
                                where: { appuntamentoId: appPrestazione.appuntamentoId, tenantId, deletedAt: null, isVisitaSecundaria: false },
                                select: { id: true }
                            });
                            await VisitaSecondariaService.creaVisitaSecondaria({
                                appPrestazioneId: id,
                                prestazioneId: appPrestazione.prestazioneId,
                                medicoReferenteId: medicoRefertanteId,
                                appuntamentoId: appPrestazione.appuntamentoId,
                                visitaParentId: visitaPrincipale?.id || null,
                                tenantId,
                                createdBy: req.person?.id
                            });
                        }
                    } else if (existingSecondaria && existingSecondaria.stato !== 'COMPLETATA') {
                        // Medico uguale all'appuntamento → specialista rimosso, annulla visita secondaria
                        await prisma.visita.update({
                            where: { id: existingSecondaria.id },
                            data: { stato: 'ANNULLATA', deletedAt: new Date() }
                        });
                        logger.info({
                            component: 'appuntamentoPrestazioni.routes',
                            action: 'assignMedicoRefertante',
                            visitaSecondariaId: existingSecondaria.id
                        }, 'Visita secondaria annullata (medico tornato a quello principale)');
                    }

                    // P74: Aggiorna personId del movimento USCITA al nuovo medicoRefertante
                    const uscitaEsistente = await prisma.movimentoContabile.findFirst({
                        where: {
                            appPrestazioneId: id,
                            direzione: 'USCITA',
                            tenantId,
                            deletedAt: null,
                        },
                        select: { id: true, personId: true },
                    });
                    if (uscitaEsistente && uscitaEsistente.personId !== medicoRefertanteId) {
                        await prisma.movimentoContabile.update({
                            where: { id: uscitaEsistente.id },
                            data: { personId: medicoRefertanteId },
                        });
                        logger.info({
                            component: 'appuntamentoPrestazioni.routes',
                            action: 'assignMedicoRefertante',
                            movimentoId: uscitaEsistente.id,
                            oldPersonId: uscitaEsistente.personId,
                            newPersonId: medicoRefertanteId,
                        }, 'MovimentoContabile USCITA aggiornato per cambio medico refertante');
                    }
                } catch (asyncErr) {
                    logger.error({
                        component: 'appuntamentoPrestazioni.routes',
                        action: 'assignMedicoRefertante-secondaria',
                        appPrestazioneId: id,
                        error: asyncErr.message
                    }, 'Errore gestione visita secondaria dopo cambio medico');
                }
            });

            res.json({
                success: true,
                data: updated
            });
        } catch (error) {
            logger.error({
                component: 'appuntamentoPrestazioni.routes',
                action: 'assignMedicoRefertante',
                prestazioneId: req.params.id,
                error: 'Operazione non riuscita'
            }, 'Errore assegnazione medico refertante');
            res.status(400).json({
                success: false,
                error: 'Assegnazione medico non riuscita'
            });
        }
    }
);

/**
 * POST /prestazioni/:id/visita-secondaria
 * Crea o recupera la scheda accertamento collegata a una prestazione.
 * Diversamente dall'assegnazione specialista automatica, qui la scheda viene
 * creata anche se il medico refertante coincide con il medico principale: serve
 * al modal compatto in visita per compilare ECG, spirometria, audiometria, ecc.
 */
router.post(
    '/prestazioni/:id/visita-secondaria',
    authenticate,
    requirePermission('visite:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { visitaParentId } = req.body || {};

            const appPrestazione = await resolveAppPrestazioneForAction({
                id,
                tenantId,
                visitaParentId
            });

            if (!appPrestazione) {
                return res.status(404).json({
                    success: false,
                    error: 'Prestazione appuntamento non trovata'
                });
            }

            const medicoReferenteId = appPrestazione.medicoRefertanteId || appPrestazione.appuntamento?.medicoId;
            if (!medicoReferenteId) {
                return res.status(400).json({
                    success: false,
                    error: 'Medico refertante non disponibile'
                });
            }

            const visitaSecondaria = await VisitaSecondariaService.creaVisitaSecondaria({
                appPrestazioneId: appPrestazione.id,
                prestazioneId: appPrestazione.prestazioneId,
                medicoReferenteId,
                appuntamentoId: appPrestazione.appuntamentoId,
                visitaParentId: visitaParentId || null,
                tenantId,
                createdBy: req.person?.id,
                forceCreateForSameMedico: true
            });

            res.json({
                success: true,
                data: {
                    appPrestazioneId: appPrestazione.id,
                    visitaSecondariaId: visitaSecondaria?.id || null,
                    visita: visitaSecondaria
                }
            });
        } catch (error) {
            logger.error({
                component: 'appuntamentoPrestazioni.routes',
                action: 'ensure-visita-secondaria',
                prestazioneId: req.params.id,
                error: error.message
            }, 'Errore creazione/apertura visita secondaria');
            res.status(400).json({
                success: false,
                error: 'Errore nella creazione della scheda accertamento'
            });
        }
    }
);

/**
 * POST /prestazioni/:id/calcola-compenso
 * Calcola compenso per medico refertante
 */
router.post(
    '/prestazioni/:id/calcola-compenso',
    authenticate,
    requirePermission('fatture:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { importoPrestazione } = req.body;

            if (!importoPrestazione) {
                return res.status(400).json({
                    success: false,
                    error: 'importoPrestazione è obbligatorio'
                });
            }

            const result = await AppuntamentoPrestazioneService.calcolaCompenso({
                id,
                importoPrestazione,
                tenantId
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Errore calcolo compenso', {
                error: 'Operazione non riuscita',
                prestazioneId: req.params.id
            });
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /prestazioni/:id/compenso-pagato
 * Marca compenso come pagato
 */
router.post(
    '/prestazioni/:id/compenso-pagato',
    authenticate,
    requirePermission('fatture:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const updated = await AppuntamentoPrestazioneService.marcaCompensoPagato({
                id,
                tenantId
            });

            res.json({
                success: true,
                data: updated
            });
        } catch (error) {
            logger.error('Errore marcatura compenso pagato', {
                error: 'Operazione non riuscita',
                prestazioneId: req.params.id
            });
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * DELETE /prestazioni/:id
 * Elimina prestazione (soft delete) e annulla i movimenti contabili collegati
 */
router.delete(
    '/prestazioni/:id',
    authenticate,
    requirePermission('appuntamenti:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            await AppuntamentoPrestazioneService.delete(id, tenantId);

            // Annulla movimenti contabili collegati (BOZZA o DA_FATTURARE)
            // Sincrono: attendiamo l'annullamento PRIMA di rispondere al client
            // così la lista visite mostra subito il totale aggiornato
            try {
                const result = await MovimentoContabileGenerator.annullaPerAppuntamentoPrestazione(
                    id, tenantId, req.person?.id
                );
                if (result.annullati > 0) {
                    logger.info({
                        component: 'appuntamentoPrestazioni.routes',
                        action: 'annulla-movimenti-prestazione',
                        appPrestazioneId: id,
                        annullati: result.annullati,
                    }, 'Movimenti contabili annullati per prestazione eliminata');
                }
            } catch (err) {
                logger.error({
                    component: 'appuntamentoPrestazioni.routes',
                    action: 'annulla-movimenti-prestazione',
                    error: 'Operazione non riuscita',
                    appPrestazioneId: id,
                }, 'Errore annullamento movimenti contabili prestazione eliminata');
            }

            res.json({
                success: true,
                message: 'Prestazione eliminata'
            });
        } catch (error) {
            logger.error('Errore eliminazione prestazione', {
                error: 'Operazione non riuscita',
                prestazioneId: req.params.id
            });
            res.status(400).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

export default router;
