/**
 * Visita Service
 * Business logic for clinical visit management
 * 
 * @module services/clinical/VisitaService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { EventBus, VisitaEvents } from '../events/index.js';
import { VisitTemplateService } from './VisitTemplateService.js';
import MovimentoContabileGenerator from '../management/MovimentoContabileGenerator.js';
import crypto from 'crypto';

// Stati visita validi
const STATI_VISITA = ['INIZIATA', 'IN_CORSO', 'SOSPESA', 'COMPLETATA', 'ANNULLATA'];

// Transizioni stato consentite
const TRANSIZIONI_STATO = {
    'INIZIATA': ['IN_CORSO', 'SOSPESA', 'COMPLETATA', 'ANNULLATA'], // COMPLETATA added for quick visits
    'IN_CORSO': ['SOSPESA', 'COMPLETATA', 'ANNULLATA'],
    'SOSPESA': ['IN_CORSO', 'COMPLETATA', 'ANNULLATA'],
    'COMPLETATA': [], // Stato finale
    'ANNULLATA': [] // Stato finale
};

function applicaConvenzione(importo, condizioni) {
    if (importo == null || !condizioni) return importo;
    const scontoInfo = condizioni.scontoInfo || null;
    const scontoPercentuale = Number(
        condizioni.scontoPercentuale
        ?? condizioni.percentualeSconto
        ?? (scontoInfo?.tipo === 'PERCENTUALE' ? scontoInfo.valore : 0)
        ?? 0
    );
    const scontoFisso = Number(
        condizioni.scontoFisso
        ?? (scontoInfo?.tipo === 'VALORE_ASSOLUTO' ? scontoInfo.valore : 0)
        ?? 0
    );
    let totale = Number(importo);
    if (scontoPercentuale > 0) totale *= (1 - scontoPercentuale / 100);
    if (scontoFisso > 0) totale = Math.max(0, totale - scontoFisso);
    return Math.round(totale * 100) / 100;
}

async function findTariffarioAssociation(companyTenantProfileId, tenantId, referenceDate = new Date(), include = {}) {
    const baseWhere = {
        companyTenantProfileId,
        tenantId,
        attivo: true,
        deletedAt: null,
    };
    return await prisma.tariffarioCompanyAssociation.findFirst({
        where: {
            ...baseWhere,
            validoDa: { lte: referenceDate },
            OR: [{ validoA: null }, { validoA: { gte: referenceDate } }],
        },
        include,
        orderBy: { validoDa: 'desc' },
    }) || await prisma.tariffarioCompanyAssociation.findFirst({
        where: baseWhere,
        include,
        orderBy: { validoDa: 'desc' },
    });
}

async function getCompletedAppointmentStatus(appuntamentoId, tenantId) {
    const [appuntamento, paidMovement] = await Promise.all([
        prisma.appuntamento.findFirst({
            where: { id: appuntamentoId, tenantId, deletedAt: null },
            select: { pagamentoAnticipato: true }
        }),
        prisma.movimentoContabile.findFirst({
            where: {
                tenantId,
                appuntamentoId,
                deletedAt: null,
                direzione: 'ENTRATA',
                OR: [
                    { stato: 'PAGATO' },
                    { fatturaElettronica: { deletedAt: null, stato: 'PAGATA' } }
                ]
            },
            select: { id: true }
        })
    ]);
    return appuntamento?.pagamentoAnticipato || paidMovement ? 'FATTURATO' : 'COMPLETATO';
}

export class VisitaService {
    /**
     * Create a new clinical visit
     * @param {Object} data - Visit data
     * @returns {Promise<Object>} Created visit
     */
    static async create(data) {
        try {
            const { tenantId, createdBy, appuntamentoId, pazienteId, medicoId, prestazioneId } = data;

            // P48: Verify paziente exists using PersonTenantProfile for multi-tenant
            let paziente = await prisma.person.findFirst({
                where: {
                    id: pazienteId,
                    deletedAt: null,
                    tenantProfiles: {
                        some: { tenantId, deletedAt: null }
                    }
                }
            });

            // Auto-create PersonTenantProfile per pazienti arrivati dalla coda senza profilo
            if (!paziente) {
                const personExists = await prisma.person.findFirst({
                    where: { id: pazienteId, deletedAt: null }
                });
                if (!personExists) throw new Error('Paziente not found');

                await prisma.personTenantProfile.create({
                    data: {
                        personId: pazienteId,
                        tenantId,
                        status: 'ACTIVE',
                        isActive: true
                    }
                });

                const existingRole = await prisma.personRole.findFirst({
                    where: { personId: pazienteId, tenantId, roleType: 'PAZIENTE', deletedAt: null }
                });
                if (!existingRole) {
                    await prisma.personRole.create({
                        data: { personId: pazienteId, tenantId, roleType: 'PAZIENTE' }
                    });
                }

                paziente = personExists;
                logger.info('Auto-created tenant profile for queue patient during visit creation', {
                    component: 'VisitaService',
                    pazienteId,
                    tenantId
                });
            }

            // P48: Verify medico exists using PersonTenantProfile for multi-tenant
            const medico = await prisma.person.findFirst({
                where: {
                    id: medicoId,
                    deletedAt: null,
                    OR: [
                        { tenantProfiles: { some: { tenantId, deletedAt: null } } },
                        { tenantAccesses: { some: { tenantId, isActive: true, deletedAt: null } } },
                        { personRoles: { some: { tenantId, isActive: true, deletedAt: null, roleType: { in: ['MEDICO', 'TENANT_ADMIN', 'ADMIN', 'SUPER_ADMIN'] } } } },
                        {
                            nomine: {
                                some: {
                                    tenantId,
                                    deletedAt: null,
                                    stato: 'ATTIVA',
                                    tipoRuolo: { in: ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'] }
                                }
                            }
                        }
                    ]
                }
            });
            if (!medico) throw new Error('Medico not found');

            // Verify prestazione if provided
            if (prestazioneId) {
                const prestazione = await prisma.prestazione.findFirst({
                    where: { id: prestazioneId, tenantId, deletedAt: null }
                });
                if (!prestazione) throw new Error('Prestazione not found');
            }

            // If from appointment, verify and update appointment status
            if (appuntamentoId) {
                const appuntamento = await prisma.appuntamento.findFirst({
                    where: { id: appuntamentoId, tenantId, deletedAt: null }
                });
                if (!appuntamento) throw new Error('Appuntamento not found');

                // Update appuntamento status to IN_CORSO and set oraInizio
                await prisma.appuntamento.update({
                    where: { id: appuntamentoId },
                    data: { stato: 'IN_CORSO', oraInizio: new Date() }
                });
            }

            // Find appropriate template for this visit (P52 - Clinical Visit Template System)
            let visitTemplateId = data.visitTemplateId || null;
            if (!visitTemplateId && medicoId) {
                try {
                    // P61: Fix - firma corretta è (medicoId, tenantId, prestazioneId, bundleId)
                    const template = await VisitTemplateService.findTemplateForVisit(
                        medicoId,
                        tenantId,
                        prestazioneId || undefined,
                        data.bundleId || undefined
                    );
                    if (template) {
                        visitTemplateId = template.id;
                        logger.debug('Template auto-selected for visit', {
                            component: 'VisitaService',
                            templateId: template.id,
                            templateName: template.name,
                            medicoId
                        });
                    }
                } catch (templateError) {
                    // Non-blocking: continue without template
                    logger.warn('Failed to auto-select template', {
                        component: 'VisitaService',
                        error: templateError.message,
                        medicoId,
                        prestazioneId
                    });
                }
            }

            // P52: Get ambulatorioId from data or fallback to default
            const ambulatorioId = data.ambulatorioId;
            if (!ambulatorioId) {
                throw new Error('ambulatorioId is required to create a visit');
            }

            const visita = await prisma.visita.create({
                data: {
                    tenantId,
                    appuntamentoId: appuntamentoId || null,
                    pazienteId,
                    medicoId,
                    ambulatorioId,  // P52: Required field
                    prestazioneId: prestazioneId || null,
                    visitTemplateId: visitTemplateId,  // P52 template support
                    dataOra: data.dataOra || new Date(),
                    stato: 'IN_CORSO',
                    tipoVisitaMDL: data.tipoVisitaMDL || null,
                    anamnesi: data.anamnesi || null,
                    esamiObiettivo: data.esamiObiettivo || null,
                    diagnosiPrincipale: data.diagnosiPrincipale || data.diagnosi || null,
                    terapia: data.terapia || null,
                    prescrizioni: data.prescrizioni || null,
                    noteClinico: data.noteClinico || null,
                    prossimoControllo: data.followUpData || null,
                    noteFollowup: data.followUpNote || null,
                    createdBy
                },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            birthDate: true,
                            taxCode: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { specialties: true, registerCode: true, isPrimary: true },
                                take: 1
                            }
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true
                        }
                    },
                    appuntamento: {
                        select: {
                            id: true,
                            numeroPrenotazione: true,
                            dataOra: true
                        }
                    },
                    // P52 - Include template configuration
                    visitTemplate: {
                        select: {
                            id: true,
                            name: true,
                            fields: true,
                            sidebarConfig: true,
                            printConfig: true
                        }
                    }
                }
            });

            logger.info('Visita created', {
                component: 'VisitaService',
                visitaId: visita.id,
                numero: visita.numero,
                pazienteId,
                medicoId,
                tenantId
            });

            // Link orphaned DocumentoCompilato records (es. questionari compilati in coda)
            if (appuntamentoId) {
                try {
                    const linked = await prisma.documentoCompilato.updateMany({
                        where: {
                            appuntamentoId,
                            tenantId,
                            visitaId: null,
                            deletedAt: null
                        },
                        data: { visitaId: visita.id }
                    });

                    if (linked.count > 0) {
                        logger.info('Linked orphaned documents to new visit', {
                            component: 'VisitaService',
                            visitaId: visita.id,
                            appuntamentoId,
                            linkedCount: linked.count
                        });
                    }
                } catch (linkError) {
                    // Non-blocking: documents will still be found by appuntamentoId
                    logger.warn('Failed to link orphaned documents', {
                        component: 'VisitaService',
                        error: linkError.message,
                        visitaId: visita.id,
                        appuntamentoId
                    });
                }
            }

            return visita;
        } catch (error) {
            logger.error('Failed to create visita', {
                component: 'VisitaService',
                error: error.message,
                tenantId: data.tenantId
            });
            throw error;
        }
    }

    /**
     * Get visit by ID
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Visit details
     */
    static async getById(id, tenantId) {
        try {
            const visita = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            birthDate: true,
                            taxCode: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { email: true, phone: true, isPrimary: true, companyTenantProfileId: true },
                                take: 1
                            }
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            gender: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { specialties: true, registerCode: true, email: true, isPrimary: true },
                                take: 1
                            }
                        }
                    },
                    medicoRefertante: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            gender: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { specialties: true, registerCode: true, email: true, isPrimary: true },
                                take: 1
                            }
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true,
                            prezzoBase: true,
                            prezzoPrimaVisita: true,
                            prezzoControllo: true,
                            durataPrevista: true
                        }
                    },
                    appuntamento: {
                        select: {
                            id: true,
                            numeroPrenotazione: true,
                            dataOra: true,
                            stato: true,
                            convenzioneId: true,
                            companyTenantProfileId: true,
                            tipoVisitaMDL: true,
                            convenzione: {
                                select: {
                                    id: true,
                                    nome: true,
                                    condizioni: true
                                }
                            },
                            prestazioni: {
                                where: { deletedAt: null },
                                select: {
                                    id: true,
                                    prestazioneId: true,
                                    prestazione: {
                                        select: { id: true, codice: true, nome: true, tipo: true, prezzoBase: true }
                                    },
                                    movimentiContabili: {
                                        where: { deletedAt: null },
                                        select: { importoLordo: true, direzione: true }
                                    }
                                }
                            }
                        }
                    },
                    movimentiContabili: {
                        where: { deletedAt: null },
                        select: { importoLordo: true, direzione: true }
                    },
                    giudizioIdoneita: {
                        select: {
                            id: true,
                            tipoGiudizio: true,
                            stato: true,
                            dataEmissione: true,
                            dataScadenza: true,
                            prescrizioniIdoneita: true,
                            limitazioni: true,
                            motivazioni: true,
                            mansioni: {
                                select: {
                                    mansione: {
                                        select: { id: true, denominazione: true }
                                    }
                                }
                            }
                        }
                    },
                    referti: {
                        where: { deletedAt: null },
                        select: {
                            id: true,
                            numeroReferto: true,
                            titolo: true,
                            stato: true,
                            dataFirma: true
                        }
                    },
                    revisions: {
                        orderBy: { revisionNumber: 'desc' },
                        select: {
                            id: true,
                            revisionNumber: true,
                            changeType: true,
                            changeReason: true,
                            changedFields: true,
                            previousData: true,
                            newData: true,
                            changedAt: true,
                            changedBy: true,
                            changer: {
                                select: { id: true, firstName: true, lastName: true }
                            }
                        }
                    }
                }
            });

            if (!visita) {
                throw new Error('Visita not found');
            }

            // Fetch fatture separately (FatturaElettronica has no formal @relation to Visita)
            const fatture = await prisma.fatturaElettronica.findMany({
                where: { visitaId: visita.id, deletedAt: null },
                select: {
                    id: true,
                    numero: true,
                    stato: true,
                    totale: true,
                    dataEmissione: true,
                    dataScadenza: true
                }
            });

            // Calculate totaleCosto — aligned with frontend PrestazioniCard logic
            // Uses tariffario aziendale prices when available (MDL company-specific pricing)
            const primaryPrestazioneId = visita.prestazioneId;
            const tipoVisitaMDL = visita.tipoVisitaMDL || visita.appuntamento?.tipoVisitaMDL;
            const isMDL = !!tipoVisitaMDL;

            // Lookup tariffario voce prices for company-specific pricing (MDL)
            let tariffarioVoci = [];
            const companyProfileId = visita.appuntamento?.companyTenantProfileId
                || visita.paziente?.tenantProfiles?.find(p => p.companyTenantProfileId)?.companyTenantProfileId
                || null;
            if (companyProfileId && isMDL) {
                try {
                    const tariffAssoc = await findTariffarioAssociation(
                        companyProfileId,
                        tenantId,
                        visita.dataOra || new Date(),
                        {
                            tariffario: {
                                include: {
                                    voci: {
                                        where: { attivo: true, deletedAt: null },
                                        select: { prestazioneId: true, prezzoBase: true, categoriaVisita: true },
                                    },
                                },
                            }
                        }
                    );
                    tariffarioVoci = tariffAssoc?.tariffario?.voci ?? [];
                } catch (e) {
                    logger.warn('Failed to lookup tariffario for totaleCosto', { error: e.message, visitaId: id });
                }
            }

            // Helper: find tariffario price for a prestazione
            const getTariffarioPrice = (prestazioneId) => {
                if (!tariffarioVoci.length || !prestazioneId) return null;
                const voce = tariffarioVoci.find(v => v.prestazioneId === prestazioneId && v.categoriaVisita === tipoVisitaMDL)
                    ?? tariffarioVoci.find(v => v.prestazioneId === prestazioneId && !v.categoriaVisita)
                    ?? tariffarioVoci.find(v => v.prestazioneId === prestazioneId);
                return voce ? Number(voce.prezzoBase) : null;
            };

            // 1. Primary price: tariffario > prezzoPrimaVisita/prezzoControllo > prezzoBase
            let primaryPrice = 0;
            if (visita.prestazione) {
                const tariffPrice = getTariffarioPrice(primaryPrestazioneId);
                if (tariffPrice != null) {
                    primaryPrice = tariffPrice;
                } else if (visita.isPrimaVisita && visita.prestazione.prezzoPrimaVisita != null) {
                    primaryPrice = Number(visita.prestazione.prezzoPrimaVisita);
                } else if (!visita.isPrimaVisita && visita.prestazione.prezzoControllo != null) {
                    primaryPrice = Number(visita.prestazione.prezzoControllo);
                } else {
                    primaryPrice = visita.prestazione.prezzoBase ? Number(visita.prestazione.prezzoBase) : 0;
                }
            }

            // 2. Additional prestazioni prices: movimenti ENTRATA > tariffario > prezzoBase
            const additionalPrices = (visita.appuntamento?.prestazioni ?? [])
                .filter(ap => ap.prestazioneId !== primaryPrestazioneId)
                .reduce((sum, ap) => {
                    // Priority: movimenti contabili ENTRATA > tariffario > prezzoBase
                    const movEntrata = (ap.movimentiContabili ?? []).find(m => m.direzione === 'ENTRATA');
                    if (movEntrata) return sum + Number(movEntrata.importoLordo);
                    const tariffPrice = getTariffarioPrice(ap.prestazioneId);
                    if (tariffPrice != null) return sum + tariffPrice;
                    return sum + (ap.prestazione?.prezzoBase ? Number(ap.prestazione.prezzoBase) : 0);
                }, 0);

            let totaleDaPrestazioni = (primaryPrice > 0 || additionalPrices > 0)
                ? primaryPrice + additionalPrices
                : null;

            // 3. Apply convention discount (if appuntamento has convenzione)
            if (totaleDaPrestazioni != null && visita.appuntamento?.convenzione?.condizioni) {
                totaleDaPrestazioni = applicaConvenzione(totaleDaPrestazioni, visita.appuntamento.convenzione.condizioni);
            }

            // 4. Fallback: movimenti contabili
            const movimentiVisita = visita.movimentiContabili?.filter(m => m.direzione === 'ENTRATA') ?? [];
            const movimentiPrestazioni = (visita.appuntamento?.prestazioni ?? []).flatMap(
                ap => (ap.movimentiContabili ?? []).filter(m => m.direzione === 'ENTRATA')
            );
            const tuttiMovimenti = [...movimentiVisita, ...movimentiPrestazioni];
            const totaleDaMovimenti = tuttiMovimenti.length
                ? tuttiMovimenti.reduce((sum, m) => sum + Number(m.importoLordo), 0)
                : null;

            const totaleCosto = totaleDaPrestazioni != null
                ? Math.round(totaleDaPrestazioni * 100) / 100
                : totaleDaMovimenti;

            return { ...visita, fatture, totaleCosto };
        } catch (error) {
            logger.error('Failed to get visita', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all visits with filters and pagination
     * @param {string} tenantId - Tenant ID
     * @param {Object} filters - Filter options
     * @param {Object} options - Pagination options
     * @returns {Promise<Object>} Paginated visits
     */
    static async getAll(tenantId, filters = {}, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                tenantIds = null,
                allTenants = false,
                accessibleTenantIds = []
            } = options;
            const skip = (page - 1) * limit;

            // Determine tenant filter based on user's access (multi-tenant support)
            let tenantFilter = {};

            if (tenantIds) {
                const requestedIds = Array.isArray(tenantIds)
                    ? tenantIds
                    : (typeof tenantIds === 'string' ? tenantIds.split(',').map(id => id.trim()) : []);
                const allowedIds = accessibleTenantIds.length > 0
                    ? requestedIds.filter(id => accessibleTenantIds.includes(id))
                    : requestedIds;

                if (allowedIds.length > 0) {
                    tenantFilter = allowedIds.length === 1
                        ? { tenantId: allowedIds[0] }
                        : { tenantId: { in: allowedIds } };
                } else {
                    tenantFilter = tenantId ? { tenantId } : {};
                }
            } else if (allTenants && accessibleTenantIds.length > 0) {
                tenantFilter = { tenantId: { in: accessibleTenantIds } };
            } else if (tenantId) {
                tenantFilter = { tenantId };
            }

            const where = {
                ...tenantFilter,
                deletedAt: null
            };
            const andConditions = [];

            // Apply filters
            if (filters.pazienteId) where.pazienteId = filters.pazienteId;
            if (filters.medicoId) where.medicoId = filters.medicoId;
            if (filters.prestazioneId) where.prestazioneId = filters.prestazioneId;
            if (filters.stato) where.stato = filters.stato;

            // P73: filtro per visite secondarie (specialista)
            if (filters.isVisitaSecundaria !== undefined) {
                where.isVisitaSecundaria = filters.isVisitaSecundaria === 'true' || filters.isVisitaSecundaria === true;
            }
            // P73: mostra solo visite secondarie NON completate (da refertare dallo specialista)
            if (filters.soloSecundarieDaRefertare === 'true' || filters.soloSecundarieDaRefertare === true) {
                where.isVisitaSecundaria = true;
                where.stato = { notIn: ['COMPLETATA', 'ANNULLATA'] };
            }

            // Default lista visite:
            // - mostra le visite primarie;
            // - per un medico, mostra anche le secondarie solo se la primaria è di un altro medico;
            // - le secondarie dello stesso medico restano dentro la visita primaria per evitare duplicati.
            if (
                filters.isVisitaSecundaria === undefined
                && !(filters.soloSecundarieDaRefertare === 'true' || filters.soloSecundarieDaRefertare === true)
            ) {
                if (filters.medicoId) {
                    andConditions.push({
                        OR: [
                            { isVisitaSecundaria: false },
                            {
                                AND: [
                                    { isVisitaSecundaria: true },
                                    {
                                        visitaParent: {
                                            is: {
                                                deletedAt: null,
                                                medicoId: { not: filters.medicoId }
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    });
                } else {
                    where.isVisitaSecundaria = false;
                }
            }

            // Filter by company (via paziente's companyTenantProfileId in PersonTenantProfile)
            if (filters.companyTenantProfileId) {
                where.paziente = {
                    tenantProfiles: {
                        some: {
                            companyTenantProfileId: filters.companyTenantProfileId,
                            deletedAt: null,
                            isActive: true
                        }
                    }
                };
            }

            // Date range filter
            if (filters.dataInizio || filters.dataFine) {
                where.dataOra = {};
                if (filters.dataInizio) where.dataOra.gte = new Date(filters.dataInizio);
                if (filters.dataFine) {
                    const endDate = new Date(filters.dataFine);
                    endDate.setHours(23, 59, 59, 999);
                    where.dataOra.lte = endDate;
                }
            }

            // Filter by ambulatorio / sede / poliambulatorio
            if (filters.ambulatorioId) {
                where.ambulatorioId = filters.ambulatorioId;
            }
            if (filters.sedeId || filters.poliambulatorioId) {
                where.ambulatorio = { ...(where.ambulatorio || {}) };
                if (filters.sedeId) where.ambulatorio.sedeId = filters.sedeId;
                if (filters.poliambulatorioId) where.ambulatorio.poliambulatorioId = filters.poliambulatorioId;
            }

            // Filtri post-query (per campi non direttamente filtrabili via Prisma)
            const needsPostFilter = !!(filters.oraInizio || filters.oraFine || filters.fatturazione);
            const timeFilterOraInizio = filters.oraInizio; // HH:mm
            const timeFilterOraFine = filters.oraFine;     // HH:mm
            const fatturazioneFilter = filters.fatturazione; // 'fatturate' | 'non_fatturate'

            // Search in diagnosi principale, anamnesi e nome paziente
            if (filters.search) {
                andConditions.push({
                    OR: [
                        { diagnosiPrincipale: { contains: filters.search, mode: 'insensitive' } },
                        { anamnesi: { contains: filters.search, mode: 'insensitive' } },
                        { paziente: { firstName: { contains: filters.search, mode: 'insensitive' } } },
                        { paziente: { lastName: { contains: filters.search, mode: 'insensitive' } } },
                    ]
                });
            }

            if (andConditions.length > 0) {
                where.AND = andConditions;
            }

            // When post-filters are active, fetch all records within the base filter
            // and paginate after filtering (time-of-day / fatturazione need post-query processing)
            const querySkip = needsPostFilter ? 0 : skip;
            const queryTake = needsPostFilter ? 10000 : limit;

            const [visiteRaw, totalRaw] = await Promise.all([
                prisma.visita.findMany({
                    where,
                    skip: querySkip,
                    take: queryTake,
                    orderBy: { dataOra: 'desc' },
                    include: {
                        paziente: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                taxCode: true,
                                tenantProfiles: {
                                    where: { deletedAt: null, isActive: true },
                                    select: { companyTenantProfileId: true },
                                    take: 1
                                }
                            }
                        },
                        medico: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                gender: true,
                                taxCode: true,
                                tenantProfiles: {
                                    where: { deletedAt: null, isActive: true },
                                    select: { specialties: true, isPrimary: true },
                                    take: 1
                                }
                            }
                        },
                        prestazione: {
                            select: {
                                id: true,
                                codice: true,
                                nome: true,
                                tipo: true,
                                prezzoBase: true,
                                prezzoPrimaVisita: true,
                                prezzoControllo: true,
                                durataPrevista: true
                            }
                        },
                        movimentiContabili: {
                            where: { deletedAt: null },
                            select: { importoLordo: true, direzione: true }
                        },
                        appuntamento: {
                            select: {
                                convenzioneId: true,
                                companyTenantProfileId: true,
                                tipoVisitaMDL: true,
                                convenzione: {
                                    select: { id: true, condizioni: true }
                                },
                                prestazioni: {
                                    where: { deletedAt: null },
                                    select: {
                                        prestazioneId: true,
                                        prestazione: {
                                            select: { prezzoBase: true }
                                        },
                                        movimentiContabili: {
                                            where: { deletedAt: null },
                                            select: { importoLordo: true, direzione: true }
                                        }
                                    }
                                }
                            }
                        },
                        visiteSecundarie: {
                            where: { deletedAt: null, stato: { not: 'ANNULLATA' } },
                            select: { id: true, stato: true, medicoId: true, prestazione: { select: { nome: true } } }
                        }
                    }
                }),
                prisma.visita.count({ where })
            ]);

            // Batch lookup fatturaId: FatturaElettronica.visitaId non ha una Prisma @relation
            // su Visita, quindi lo recuperiamo con una query separata efficiente.
            const visitaIdsRaw = visiteRaw.map(v => v.id).filter(Boolean);
            const fattureMap = {};
            if (visitaIdsRaw.length > 0) {
                const fattureRows = await prisma.fatturaElettronica.findMany({
                    where: { visitaId: { in: visitaIdsRaw }, deletedAt: null },
                    select: { id: true, visitaId: true },
                });
                for (const f of fattureRows) {
                    if (f.visitaId && !fattureMap[f.visitaId]) {
                        fattureMap[f.visitaId] = f.id;
                    }
                }
            }

            // Post-query filtering: time-of-day & fatturazione
            let filteredVisite = visiteRaw;
            if (timeFilterOraInizio || timeFilterOraFine) {
                filteredVisite = filteredVisite.filter(v => {
                    const d = new Date(v.dataOra);
                    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    if (timeFilterOraInizio && hhmm < timeFilterOraInizio) return false;
                    if (timeFilterOraFine && hhmm > timeFilterOraFine) return false;
                    return true;
                });
            }
            if (fatturazioneFilter) {
                filteredVisite = filteredVisite.filter(v => {
                    const hasFattura = !!fattureMap[v.id];
                    return fatturazioneFilter === 'fatturate' ? hasFattura : !hasFattura;
                });
            }

            // Recalculate pagination after post-filtering
            const total = needsPostFilter ? filteredVisite.length : totalRaw;
            const visite = needsPostFilter ? filteredVisite.slice(skip, skip + limit) : filteredVisite;

            // Batch tariffario lookup for MDL visits with company associations
            const getVisitaCompanyProfileId = (v) => v.appuntamento?.companyTenantProfileId
                || v.paziente?.tenantProfiles?.find(p => p.companyTenantProfileId)?.companyTenantProfileId
                || null;
            const companyIds = [...new Set(visite
                .filter(v => v.tipoVisitaMDL && getVisitaCompanyProfileId(v))
                .map(v => getVisitaCompanyProfileId(v))
            )];
            const tariffarioMap = new Map(); // companyProfileId → voci[]
            if (companyIds.length > 0) {
                try {
                    const tariffAssocInclude = {
                        tariffario: {
                            include: {
                                voci: {
                                    where: { attivo: true, deletedAt: null },
                                    select: { prestazioneId: true, prezzoBase: true, categoriaVisita: true },
                                },
                            },
                        },
                    };
                    const now = new Date();
                    const tariffAssocsCurrent = await prisma.tariffarioCompanyAssociation.findMany({
                        where: {
                            companyTenantProfileId: { in: companyIds },
                            tenantId,
                            attivo: true,
                            deletedAt: null,
                            validoDa: { lte: now },
                            OR: [{ validoA: null }, { validoA: { gte: now } }],
                        },
                        include: tariffAssocInclude,
                        orderBy: { validoDa: 'desc' },
                    });
                    const coveredCompanies = new Set(tariffAssocsCurrent.map(a => a.companyTenantProfileId));
                    const missingCompanyIds = companyIds.filter(id => !coveredCompanies.has(id));
                    const tariffAssocsFallback = missingCompanyIds.length > 0
                        ? await prisma.tariffarioCompanyAssociation.findMany({
                            where: {
                                companyTenantProfileId: { in: missingCompanyIds },
                                tenantId,
                                attivo: true,
                                deletedAt: null,
                            },
                            include: tariffAssocInclude,
                            orderBy: { validoDa: 'desc' },
                        })
                        : [];
                    const tariffAssocs = [...tariffAssocsCurrent, ...tariffAssocsFallback];
                    for (const ta of tariffAssocs) {
                        tariffarioMap.set(ta.companyTenantProfileId, ta.tariffario?.voci ?? []);
                    }
                } catch (e) {
                    logger.warn('Failed to batch lookup tariffario for getAll', { error: e.message });
                }
            }

            return {
                data: visite.map(v => {
                    const primaryPrestazioneId = v.prestazioneId;
                    const tipoVisitaMDL = v.tipoVisitaMDL || v.appuntamento?.tipoVisitaMDL;
                    const companyProfileId = getVisitaCompanyProfileId(v);
                    const voci = tariffarioMap.get(companyProfileId) || [];

                    // Helper: find tariffario price for a prestazione
                    const getTariffarioPrice = (prestazioneId) => {
                        if (!voci.length || !prestazioneId) return null;
                        const voce = voci.find(vc => vc.prestazioneId === prestazioneId && vc.categoriaVisita === tipoVisitaMDL)
                            ?? voci.find(vc => vc.prestazioneId === prestazioneId && !vc.categoriaVisita)
                            ?? voci.find(vc => vc.prestazioneId === prestazioneId);
                        return voce ? Number(voce.prezzoBase) : null;
                    };

                    // 1. Primary price: tariffario > prezzoPrimaVisita/prezzoControllo > prezzoBase
                    let primaryPrice = 0;
                    if (v.prestazione) {
                        const tariffPrice = getTariffarioPrice(primaryPrestazioneId);
                        if (tariffPrice != null) {
                            primaryPrice = tariffPrice;
                        } else if (v.isPrimaVisita && v.prestazione.prezzoPrimaVisita != null) {
                            primaryPrice = Number(v.prestazione.prezzoPrimaVisita);
                        } else if (!v.isPrimaVisita && v.prestazione.prezzoControllo != null) {
                            primaryPrice = Number(v.prestazione.prezzoControllo);
                        } else {
                            primaryPrice = v.prestazione.prezzoBase ? Number(v.prestazione.prezzoBase) : 0;
                        }
                    }

                    // 2. Additional prestazioni prices: movimenti ENTRATA > tariffario > prezzoBase
                    const additionalPrices = (v.appuntamento?.prestazioni ?? [])
                        .filter(ap => ap.prestazioneId !== primaryPrestazioneId)
                        .reduce((sum, ap) => {
                            const movEntrata = (ap.movimentiContabili ?? []).find(m => m.direzione === 'ENTRATA');
                            if (movEntrata) return sum + Number(movEntrata.importoLordo);
                            const tariffPrice = getTariffarioPrice(ap.prestazioneId);
                            if (tariffPrice != null) return sum + tariffPrice;
                            return sum + (ap.prestazione?.prezzoBase ? Number(ap.prestazione.prezzoBase) : 0);
                        }, 0);

                    let totaleDaPrestazioni = (primaryPrice > 0 || additionalPrices > 0)
                        ? primaryPrice + additionalPrices
                        : null;

                    // 3. Apply convention discount
                    if (totaleDaPrestazioni != null && v.appuntamento?.convenzione?.condizioni) {
                        totaleDaPrestazioni = applicaConvenzione(totaleDaPrestazioni, v.appuntamento.convenzione.condizioni);
                    }

                    // 4. Fallback: movimenti contabili
                    const movimentiVisita = v.movimentiContabili?.filter(m => m.direzione === 'ENTRATA') ?? [];
                    const movimentiPrestazioni = (v.appuntamento?.prestazioni ?? []).flatMap(
                        ap => (ap.movimentiContabili ?? []).filter(m => m.direzione === 'ENTRATA')
                    );
                    const tuttiMovimenti = [...movimentiVisita, ...movimentiPrestazioni];
                    const totaleDaMovimenti = tuttiMovimenti.length
                        ? tuttiMovimenti.reduce((sum, m) => sum + Number(m.importoLordo), 0)
                        : null;

                    const totaleCosto = totaleDaPrestazioni != null
                        ? Math.round(totaleDaPrestazioni * 100) / 100
                        : totaleDaMovimenti;

                    return {
                        ...v,
                        totaleCosto,
                        movimentiContabili: undefined,
                        appuntamento: undefined,
                        // Extra fields for list actions
                        fatturaId: fattureMap[v.id] ?? null,
                        isMDL: !!v.tipoVisitaMDL,
                        companyTenantProfileId: companyProfileId,
                        visiteSecondarieCount: v.visiteSecundarie?.length ?? 0,
                        visiteSecondarieSummary: (v.visiteSecundarie ?? []).map(sec => ({
                            id: sec.id,
                            stato: sec.stato,
                            medicoId: sec.medicoId,
                            prestazioneNome: sec.prestazione?.nome ?? null
                        })),
                        visiteSecundarie: undefined,
                        // Flatten paziente back to expected shape (without tenantProfiles)
                        paziente: v.paziente ? {
                            id: v.paziente.id,
                            firstName: v.paziente.firstName,
                            lastName: v.paziente.lastName,
                            taxCode: v.paziente.taxCode
                        } : null
                    };
                }),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get visite', {
                component: 'VisitaService',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Aggiorna il medico refertante per una visita
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @param {string|null} medicoRefertanteId - ID del medico refertante o null per rimuovere
     * @returns {Promise<Object>} Updated visit
     */
    static async updateMedicoRefertante(id, tenantId, medicoRefertanteId, options = {}) {
        try {
            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null },
                select: { id: true, medicoId: true, medicoRefertanteId: true }
            });
            if (!existing) {
                throw new Error('Visita not found');
            }

            if (options.changedBy && existing.medicoRefertanteId !== medicoRefertanteId) {
                const lastRevision = await prisma.visitRevision.findFirst({
                    where: { visitaId: id },
                    orderBy: { revisionNumber: 'desc' },
                    select: { revisionNumber: true }
                });
                await prisma.visitRevision.create({
                    data: {
                        visitaId: id,
                        revisionNumber: (lastRevision?.revisionNumber || 0) + 1,
                        previousData: {
                            medicoRefertanteId: existing.medicoRefertanteId,
                            medicoId: existing.medicoId
                        },
                        newData: { medicoRefertanteId },
                        changedFields: ['medicoRefertanteId'],
                        changeType: 'MEDICO_REFERTANTE_CHANGED',
                        changeReason: options.changeReason || 'Cambio medico refertante',
                        changedBy: options.changedBy,
                        ipAddress: options.ipAddress || 'system',
                        userAgent: options.userAgent || null
                    }
                });
            }

            const updated = await prisma.visita.update({
                where: { id },
                data: { medicoRefertanteId },
                include: {
                    medicoRefertante: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            gender: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { specialties: true, registerCode: true },
                                take: 1
                            }
                        }
                    }
                }
            });

            logger.info('Medico refertante updated', {
                component: 'VisitaService',
                visitaId: id,
                medicoRefertanteId,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update medico refertante', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update visit with revision tracking (P52 - Clinical Visit Template System)
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} data - Update data
     * @param {Object} options - Update options
     * @param {string} options.updatedBy - User performing the update
     * @param {string} options.changeReason - Reason for the change
     * @returns {Promise<Object>} Updated visit
     */
    static async update(id, tenantId, data, options = {}) {
        try {
            const { updatedBy, changeReason } = options;

            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Visita not found');
            }

            // Cannot update completed or cancelled visits (clinical data)
            if (['COMPLETATA', 'ANNULLATA'].includes(existing.stato)) {
                throw new Error(`Cannot update visit in status ${existing.stato}`);
            }

            // P52 - Create revision before updating (audit trail)
            // Track all clinical fields including datiStrutturati
            const clinicalFields = [
                'anamnesi', 'esamiObiettivo', 'diagnosiPrincipale', 'diagnosiSecondarie',
                'terapia', 'prescrizioni', 'noteClinico', 'datiStrutturati',
                'prossimoControllo', 'noteFollowup'
            ];

            // Deep compare for JSON fields
            const hasFieldChanged = (field) => {
                if (data[field] === undefined) return false;
                const oldVal = existing[field];
                const newVal = data[field];
                if (typeof oldVal === 'object' || typeof newVal === 'object') {
                    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
                }
                return oldVal !== newVal;
            };

            const hasClinicalChanges = clinicalFields.some(hasFieldChanged);

            if (hasClinicalChanges && updatedBy) {
                try {
                    // Get current revision number
                    const lastRevision = await prisma.visitRevision.findFirst({
                        where: { visitaId: id },
                        orderBy: { revisionNumber: 'desc' },
                        select: { revisionNumber: true }
                    });
                    const revisionNumber = (lastRevision?.revisionNumber || 0) + 1;

                    // Build changedFields list and newData object
                    const changedFields = [];
                    const newData = {};
                    clinicalFields.forEach(field => {
                        if (hasFieldChanged(field)) {
                            changedFields.push(field);
                            newData[field] = data[field];
                        }
                    });

                    // Create revision record with correct schema field names
                    await prisma.visitRevision.create({
                        data: {
                            visitaId: id,
                            revisionNumber,
                            previousData: {
                                anamnesi: existing.anamnesi,
                                esamiObiettivo: existing.esamiObiettivo,
                                diagnosiPrincipale: existing.diagnosiPrincipale,
                                diagnosiSecondarie: existing.diagnosiSecondarie,
                                terapia: existing.terapia,
                                prescrizioni: existing.prescrizioni,
                                noteClinico: existing.noteClinico,
                                datiStrutturati: existing.datiStrutturati,
                                prossimoControllo: existing.prossimoControllo,
                                noteFollowup: existing.noteFollowup
                            },
                            newData,
                            changedFields,
                            changeType: 'UPDATE',
                            changeReason: changeReason || 'Modifica dati clinici',
                            changedBy: updatedBy,
                            ipAddress: options.ipAddress || '0.0.0.0',
                            userAgent: options.userAgent || null
                        }
                    });

                    logger.debug('Visit revision created', {
                        component: 'VisitaService',
                        visitaId: id,
                        revisionNumber,
                        changedFields: changedFields
                    });
                } catch (revisionError) {
                    // Non-blocking: continue with update even if revision fails
                    logger.warn('Failed to create visit revision', {
                        component: 'VisitaService',
                        error: revisionError.message,
                        visitaId: id
                    });
                }
            }

            // P52: Exclude fields not in Prisma Visita model
            const { tenantId: _, createdBy: __, updatedBy: ___, ...updateData } = data;

            // P72 Fase 3: Sync datiStrutturati → flat columns via mappedField
            // Se il template definisce mappedField su un campo, il suo valore in
            // datiStrutturati viene copiato anche sulla colonna flat corrispondente
            // (anamnesi, esamiObiettivo, diagnosiPrincipale, terapia, prescrizioni).
            if (updateData.datiStrutturati && existing.visitTemplateId) {
                try {
                    const template = await VisitTemplateService.getById(existing.visitTemplateId, tenantId);
                    if (template?.fields && Array.isArray(template.fields)) {
                        for (const field of template.fields) {
                            if (
                                field.mappedField &&
                                field.name &&
                                updateData.datiStrutturati[field.name] !== undefined
                            ) {
                                const value = updateData.datiStrutturati[field.name];
                                updateData[field.mappedField] = value !== '' ? (value || null) : null;
                            }
                        }
                    }
                } catch (syncError) {
                    // Non-blocking: log e continua senza sync
                    logger.warn('P72: Sync datiStrutturati → flat columns fallito', {
                        component: 'VisitaService',
                        error: syncError.message,
                        visitaId: id,
                        visitTemplateId: existing.visitTemplateId
                    });
                }
            }

            const visita = await prisma.visita.update({
                where: { id },
                data: {
                    ...updateData,
                    updatedAt: new Date()
                },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true
                        }
                    }
                }
            });

            logger.info('Visita updated', {
                component: 'VisitaService',
                visitaId: id,
                tenantId
            });

            return visita;
        } catch (error) {
            logger.error('Failed to update visita', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Change visit status
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @param {string} nuovoStato - New status
     * @param {string} updatedBy - User performing the change
     * @returns {Promise<Object>} Updated visit
     */
    static async changeStatus(id, tenantId, nuovoStato, updatedBy) {
        try {
            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Visita not found');
            }

            // Validate state transition
            if (!STATI_VISITA.includes(nuovoStato)) {
                throw new Error(`Invalid status: ${nuovoStato}`);
            }

            const transizioniConsentite = TRANSIZIONI_STATO[existing.stato];
            if (!transizioniConsentite.includes(nuovoStato)) {
                throw new Error(`Cannot transition from ${existing.stato} to ${nuovoStato}`);
            }

            const updateData = {
                stato: nuovoStato,
                updatedAt: new Date()
            };

            const visita = await prisma.visita.update({
                where: { id },
                data: updateData,
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            // Update related appuntamento if exists
            if (existing.appuntamentoId) {
                let appuntamentoStato = null;
                if (nuovoStato === 'COMPLETATA') appuntamentoStato = await getCompletedAppointmentStatus(existing.appuntamentoId, tenantId);
                else if (nuovoStato === 'ANNULLATA') appuntamentoStato = 'ANNULLATO';

                if (appuntamentoStato) {
                    const appUpdateData = { stato: appuntamentoStato };
                    // Set oraFine when visit is completed, but only if not already preserved
                    // (10-minute rule: reopened visits may have preserved original oraFine)
                    if (['COMPLETATO', 'FATTURATO'].includes(appuntamentoStato)) {
                        const currentApp = await prisma.appuntamento.findFirst({
                            where: { id: existing.appuntamentoId, deletedAt: null },
                            select: { oraFine: true }
                        });
                        if (!currentApp?.oraFine) {
                            appUpdateData.oraFine = new Date();
                        }
                    }
                    await prisma.appuntamento.update({
                        where: { id: existing.appuntamentoId },
                        data: appUpdateData
                    });
                }
            }

            logger.info('Visita status changed', {
                component: 'VisitaService',
                visitaId: id,
                oldStatus: existing.stato,
                newStatus: nuovoStato,
                updatedBy,
                tenantId
            });

            return visita;
        } catch (error) {
            logger.error('Failed to change visita status', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Sign/close visit (medico signature)
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @param {string} firmaMedico - Doctor signature
     * @param {string} medicoId - Doctor ID
     * @returns {Promise<Object>} Signed visit
     */
    static async sign(id, tenantId, firmaMedico, medicoId) {
        try {
            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Visita not found');
            }

            const effectiveMedicoId = existing.medicoRefertanteId || existing.medicoId;
            // Verify the medico is the assigned refertante
            if (effectiveMedicoId !== medicoId) {
                throw new Error('Only the assigned doctor can sign the visit');
            }

            // Can only sign IN_CORSO visits
            if (existing.stato !== 'IN_CORSO') {
                throw new Error(`Cannot sign visit in status ${existing.stato}. Must be IN_CORSO`);
            }

            const visita = await prisma.visita.update({
                where: { id },
                data: {
                    stato: 'COMPLETATA',
                    updatedAt: new Date()
                },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { registerCode: true, isPrimary: true },
                                take: 1
                            }
                        }
                    }
                }
            });

            // Update appuntamento if exists — set oraFine on completion
            // Only set oraFine if not already preserved (10-minute rule for reopened visits)
            if (existing.appuntamentoId) {
                const currentApp = await prisma.appuntamento.findFirst({
                    where: { id: existing.appuntamentoId, deletedAt: null },
                    select: { oraFine: true }
                });
                const completedStato = await getCompletedAppointmentStatus(existing.appuntamentoId, tenantId);
                const appUpdateData = { stato: completedStato };
                if (!currentApp?.oraFine) {
                    appUpdateData.oraFine = new Date();
                }
                await prisma.appuntamento.update({
                    where: { id: existing.appuntamentoId },
                    data: appUpdateData
                });
            }

            logger.info('Visita signed', {
                component: 'VisitaService',
                visitaId: id,
                medicoId,
                tenantId
            });

            // Save medico signature to FirmaDigitale if provided
            if (firmaMedico) {
                try {
                    const firmaImageUrl = firmaMedico.startsWith('data:')
                        ? firmaMedico
                        : `data:image/png;base64,${firmaMedico}`;
                    const hashDocumento = crypto.createHash('sha256').update(id + tenantId).digest('hex');
                    const hashFirma = crypto.createHash('sha256').update(firmaImageUrl.substring(0, 100) + medicoId + Date.now()).digest('hex');

                    // Soft-delete previous visit-linked signatures for this medico
                    await prisma.firmaDigitale.updateMany({
                        where: {
                            firmatarioId: medicoId,
                            tenantId,
                            refertoId: null,
                            documentoId: null,
                            firmatarioRole: 'MEDICO',
                            deletedAt: null
                        },
                        data: { deletedAt: new Date() }
                    });

                    await prisma.firmaDigitale.create({
                        data: {
                            tenantId,
                            firmatarioId: medicoId,
                            documentType: 'REFERTO',
                            firmatarioRole: 'MEDICO',
                            tipoFirma: 'GRAFOMETRICA',
                            hashDocumento,
                            hashFirma,
                            firmaImageUrl,
                            stato: 'FIRMATO',
                            note: `Firma visita ${visita.numero || id}`
                        }
                    });

                    logger.info('Medico signature saved to FirmaDigitale', {
                        component: 'VisitaService',
                        visitaId: id,
                        medicoId,
                        tenantId
                    });
                } catch (sigError) {
                    logger.error('Failed to save medico signature (non-blocking)', {
                        component: 'VisitaService',
                        error: sigError.message,
                        visitaId: id,
                        medicoId
                    });
                    // Non-blocking: visit is already completed, signature save failure shouldn't roll back
                }
            }

            // Project 47 - Emit domain event for notification system (visit completed)
            await EventBus.publish(VisitaEvents.COMPLETED, {
                visitaId: id,
                visitaNumero: visita.numero,
                pazienteId: visita.pazienteId,
                pazienteNome: visita.paziente ? `${visita.paziente.firstName} ${visita.paziente.lastName}` : null,
                medicoId: visita.medicoId,
                medicoNome: visita.medico ? `${visita.medico.firstName} ${visita.medico.lastName}` : null,
                dataOra: visita.dataOra,
                diagnosi: visita.diagnosiPrincipale,
                tenantId
            });

            // Check if results are available and emit event
            if (visita.diagnosi || visita.terapia || visita.prescrizioni) {
                await EventBus.publish(VisitaEvents.RESULT_AVAILABLE, {
                    visitaId: id,
                    visitaNumero: visita.numero,
                    pazienteId: visita.pazienteId,
                    pazienteNome: visita.paziente ? `${visita.paziente.firstName} ${visita.paziente.lastName}` : null,
                    medicoNome: visita.medico ? `${visita.medico.firstName} ${visita.medico.lastName}` : null,
                    hasResults: true,
                    tenantId
                });
            }

            return visita;
        } catch (error) {
            logger.error('Failed to sign visita', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create a new version of a completed visit
     * Saves current state as revision, then reopens the visit for editing
     * 
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @param {string} changedBy - Person creating the new version
     * @param {string} reason - Reason for creating new version
     * @param {string} ipAddress - IP address for audit
     * @param {string} userAgent - User agent for audit
     * @returns {Promise<Object>} Updated visit with new version
     */
    static async creaNuovaVersione(id, tenantId, changedBy, reason, ipAddress, userAgent) {
        try {
            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    revisions: {
                        orderBy: { revisionNumber: 'desc' },
                        take: 1
                    },
                    appuntamento: {
                        select: { id: true, oraInizio: true, oraFine: true }
                    }
                }
            });

            if (!existing) {
                throw new Error('Visita not found');
            }

            if (existing.stato !== 'COMPLETATA') {
                throw new Error('Only completed visits can have a new version created');
            }

            // Get next revision number
            const lastRevision = existing.revisions[0];
            const nextRevisionNumber = lastRevision ? lastRevision.revisionNumber + 1 : 1;

            // Create revision with current data
            await prisma.visitRevision.create({
                data: {
                    visitaId: id,
                    revisionNumber: nextRevisionNumber,
                    previousData: {
                        anamnesi: existing.anamnesi,
                        esamiObiettivo: existing.esamiObiettivo,
                        diagnosiPrincipale: existing.diagnosiPrincipale,
                        diagnosiSecondarie: existing.diagnosiSecondarie,
                        terapia: existing.terapia,
                        noteClinico: existing.noteClinico,
                        datiStrutturati: existing.datiStrutturati,
                        prescrizioni: existing.prescrizioni,
                        prossimoControllo: existing.prossimoControllo,
                        noteFollowup: existing.noteFollowup
                    },
                    newData: {}, // Will be filled when the new version is saved
                    changedFields: [],
                    changeType: 'NEW_VERSION',
                    changeReason: reason || 'Creazione nuova versione',
                    changedBy,
                    ipAddress: ipAddress || '0.0.0.0',
                    userAgent: userAgent || null
                }
            });

            // Reopen the visit
            const visita = await prisma.visita.update({
                where: { id },
                data: {
                    stato: 'IN_CORSO',
                    updatedAt: new Date()
                },
                include: {
                    paziente: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            // Update appuntamento if exists
            // 10-minute rule: if oraFine was set more than 10 minutes ago,
            // preserve original actual times (they represent the first real visit).
            // If within 10 minutes, reset oraFine so the visit tracks the new actual end.
            if (existing.appuntamentoId) {
                const appuntamentoData = { stato: 'IN_CORSO' };
                const oraFine = existing.appuntamento?.oraFine;
                if (oraFine) {
                    const minutesSinceEnd = (Date.now() - new Date(oraFine).getTime()) / 60000;
                    if (minutesSinceEnd <= 10) {
                        // Within 10 min — reset oraFine so it will be updated on completion
                        appuntamentoData.oraFine = null;
                    }
                    // If > 10 min, preserve oraInizio/oraFine from the first visit
                }
                await prisma.appuntamento.update({
                    where: { id: existing.appuntamentoId },
                    data: appuntamentoData
                });
            }

            logger.info('New version created for visita', {
                component: 'VisitaService',
                visitaId: id,
                revisionNumber: nextRevisionNumber,
                changedBy,
                reason,
                tenantId
            });

            return {
                ...visita,
                revisionNumber: nextRevisionNumber
            };
        } catch (error) {
            logger.error('Failed to create new version of visita', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Annulla le modifiche di una Nuova Versione, ripristinando lo stato COMPLETATA
     * Restaura i datiStrutturati dalla revisione NEW_VERSION più recente
     * e riporta la visita allo stato COMPLETATA.
     * 
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @param {string} changedBy - Person cancelling the changes
     * @returns {Promise<Object>} Updated visit restored to COMPLETATA
     */
    static async annullaModifiche(id, tenantId, changedBy) {
        try {
            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    revisions: {
                        where: { changeType: 'NEW_VERSION' },
                        orderBy: { revisionNumber: 'desc' },
                        take: 1
                    },
                    appuntamento: {
                        select: { id: true }
                    }
                }
            });

            if (!existing) {
                throw new Error('Visita not found');
            }

            if (existing.stato !== 'IN_CORSO') {
                throw new Error('Solo le visite IN_CORSO possono essere annullate');
            }

            const lastNewVersionRevision = existing.revisions[0];
            if (!lastNewVersionRevision) {
                throw new Error('Nessuna revisione NEW_VERSION trovata — impossibile annullare');
            }

            // Restore data from the revision snapshot
            const previousData = lastNewVersionRevision.previousData || {};
            const restoreData = {
                stato: 'COMPLETATA',
                updatedAt: new Date()
            };

            // Restore all clinical fields that were snapshotted
            const clinicalFields = [
                'anamnesi', 'esamiObiettivo', 'diagnosiPrincipale',
                'diagnosiSecondarie', 'terapia', 'noteClinico',
                'datiStrutturati', 'prescrizioni', 'prossimoControllo', 'noteFollowup'
            ];
            for (const field of clinicalFields) {
                if (field in previousData) {
                    restoreData[field] = previousData[field];
                }
            }

            const visita = await prisma.visita.update({
                where: { id },
                data: restoreData,
                include: {
                    paziente: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            // Mark the NEW_VERSION revision as CANCELLED (keep for audit trail — no deletedAt on VisitRevision)
            await prisma.visitRevision.update({
                where: { id: lastNewVersionRevision.id },
                data: { changeType: 'CANCELLED', changeReason: 'Annullamento modifiche dalla visita' }
            });

            // Restore appuntamento to COMPLETATO if exists
            if (existing.appuntamentoId) {
                await prisma.appuntamento.update({
                    where: { id: existing.appuntamentoId },
                    data: { stato: 'COMPLETATO' }
                });
            }

            logger.info('Modifiche annullate, visita ripristinata a COMPLETATA', {
                component: 'VisitaService',
                visitaId: id,
                restoredFromRevision: lastNewVersionRevision.id,
                changedBy,
                tenantId
            });

            return visita;
        } catch (error) {
            logger.error('Failed to annulla modifiche visita', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get visits by patient
     * @param {string} pazienteId - Patient ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Patient visits
     */
    static async getByPaziente(pazienteId, tenantId) {
        try {
            const visite = await prisma.visita.findMany({
                where: {
                    pazienteId,
                    tenantId,
                    deletedAt: null
                },
                orderBy: { dataOra: 'desc' },
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { specialties: true, isPrimary: true },
                                take: 1
                            }
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            tipo: true
                        }
                    },
                    referti: {
                        where: { deletedAt: null },
                        select: {
                            id: true,
                            numeroReferto: true,
                            titolo: true,
                            stato: true,
                            dataFirma: true
                        }
                    },
                    appuntamento: {
                        select: {
                            id: true,
                            prestazioni: {
                                select: {
                                    id: true,
                                    stato: true,
                                    dataEsecuzione: true,
                                    prestazione: {
                                        select: {
                                            id: true,
                                            nome: true,
                                            codice: true,
                                            tipo: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    giudizioIdoneita: {
                        select: {
                            id: true,
                            tipoGiudizio: true
                        }
                    },
                    documentiModulistica: {
                        where: { deletedAt: null },
                        select: {
                            id: true,
                            stato: true,
                            documentoTemplate: {
                                select: {
                                    id: true,
                                    nome: true,
                                    tipo: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            return visite;
        } catch (error) {
            logger.error('Failed to get visite by paziente', {
                component: 'VisitaService',
                error: error.message,
                pazienteId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get visits by doctor
     * @param {string} medicoId - Doctor ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} filters - Additional filters
     * @returns {Promise<Array>} Doctor visits
     */
    static async getByMedico(medicoId, tenantId, filters = {}) {
        try {
            const where = {
                medicoId,
                tenantId,
                deletedAt: null
            };

            if (filters.stato) where.stato = filters.stato;
            if (filters.dataInizio || filters.dataFine) {
                where.dataOra = {};
                if (filters.dataInizio) where.dataOra.gte = new Date(filters.dataInizio);
                if (filters.dataFine) where.dataOra.lte = new Date(filters.dataFine);
            }

            const visite = await prisma.visita.findMany({
                where,
                orderBy: { dataOra: 'desc' },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true
                        }
                    }
                }
            });

            return visite;
        } catch (error) {
            logger.error('Failed to get visite by medico', {
                component: 'VisitaService',
                error: error.message,
                medicoId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete visit with mandatory deletion reason (GDPR compliance)
     * @param {string} id - Visit ID
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Delete options
     * @param {string} options.deletionReason - Mandatory reason for deletion
     * @param {string} options.deletedBy - Person ID who is deleting
     * @returns {Promise<Object>} - Deleted visit info
     */
    static async delete(id, tenantId, options = {}) {
        const { deletionReason, deletedBy } = options;

        // P58: Motivazione obbligatoria per eliminazione (GDPR compliance)
        if (!deletionReason || deletionReason.trim().length < 10) {
            throw new Error('Deletion reason is required and must be at least 10 characters');
        }

        try {
            const existing = await prisma.visita.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    paziente: { select: { id: true, firstName: true, lastName: true } },
                    medico: { select: { id: true, firstName: true, lastName: true } }
                }
            });

            if (!existing) {
                throw new Error('Visita not found');
            }

            // P58: Verifica ownership - solo il tenant owner può eliminare
            if (existing.tenantId !== tenantId) {
                throw new Error('Only the owning tenant can delete this visit. Delegated access is read-only.');
            }

            const now = new Date();
            const secondaryVisits = existing.isVisitaSecundaria
                ? []
                : await prisma.visita.findMany({
                    where: {
                        visitaParentId: id,
                        tenantId,
                        deletedAt: null,
                        isVisitaSecundaria: true
                    },
                    select: { id: true, appPrestazioneId: true }
                });

            const visiteIdsToDelete = [id, ...secondaryVisits.map(v => v.id)];
            const datiStrutturati = existing.datiStrutturati && typeof existing.datiStrutturati === 'object'
                ? existing.datiStrutturati
                : {};
            const prestazioniAggiunteInVisita = Array.isArray(datiStrutturati._prestazioniAggiuntive)
                ? datiStrutturati._prestazioniAggiuntive
                : [];
            const appPrestazioniCreateDuranteVisitaIds = prestazioniAggiunteInVisita
                .filter(p => p && p.createdDuringVisit === true && p.appPrestazioneId)
                .map(p => p.appPrestazioneId);
            const appointmentPrestazioniCreateDuranteVisita = existing.appuntamentoId
                ? await prisma.appuntamentoPrestazione.findMany({
                    where: {
                        appuntamentoId: existing.appuntamentoId,
                        tenantId,
                        deletedAt: null,
                        stato: { not: 'REFERTATA' },
                        createdAt: { gte: existing.createdAt }
                    },
                    select: { id: true }
                })
                : [];

            const appPrestazioneIdsToClose = [
                ...(existing.isVisitaSecundaria && existing.appPrestazioneId ? [existing.appPrestazioneId] : []),
                ...appPrestazioniCreateDuranteVisitaIds,
                ...appointmentPrestazioniCreateDuranteVisita.map(p => p.id)
            ].filter((value, index, arr) => value && arr.indexOf(value) === index);

            const documentiCompilatiDaAnnullare = await prisma.documentoCompilato.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    visitaId: { in: visiteIdsToDelete },
                    documentoTemplate: {
                        tipo: {
                            in: [
                                'ANAMNESI',
                                'QUESTIONARIO_ANAMNESI_MDL',
                                'QUESTIONARIO_RISCHIO',
                                'QUESTIONARIO_SINTOMI',
                                'SCHEDA_SORVEGLIANZA',
                                'ALCOL_SCREENING'
                            ]
                        }
                    }
                },
                select: { id: true }
            });
            const documentoCompilatoIds = documentiCompilatiDaAnnullare.map(d => d.id);

            await prisma.$transaction(async (tx) => {
                // P72_16: Cascade soft-delete referti (allow deleting even COMPLETATA visits with records)
                await tx.referto.updateMany({
                    where: { visitaId: { in: visiteIdsToDelete }, deletedAt: null },
                    data: { deletedAt: now }
                });

                if (secondaryVisits.length > 0) {
                    await tx.visita.updateMany({
                        where: { id: { in: secondaryVisits.map(v => v.id) }, tenantId, deletedAt: null },
                        data: { stato: 'ANNULLATA', deletedAt: now }
                    });
                }

                if (appPrestazioneIdsToClose.length > 0) {
                    await tx.appuntamentoPrestazione.updateMany({
                        where: { id: { in: appPrestazioneIdsToClose }, tenantId, deletedAt: null },
                        data: { stato: 'ANNULLATA', deletedAt: now }
                    });
                }

                if (documentoCompilatoIds.length > 0) {
                    await tx.documentoCompilato.updateMany({
                        where: { id: { in: documentoCompilatoIds }, tenantId, deletedAt: null },
                        data: {
                            stato: 'ANNULLATO',
                            motivoAnnullamento: deletionReason.trim(),
                            deletedAt: now
                        }
                    });
                    await tx.movimentoContabile.updateMany({
                        where: {
                            documentoCompilatoId: { in: documentoCompilatoIds },
                            tenantId,
                            deletedAt: null,
                            stato: { in: ['BOZZA', 'DA_FATTURARE'] }
                        },
                        data: {
                            stato: 'ANNULLATO',
                            deletedAt: now,
                            updatedBy: deletedBy || null,
                            note: 'Annullato automaticamente per annullamento visita'
                        }
                    });
                }

                await tx.movimentoContabile.updateMany({
                    where: {
                        visitaId: { in: visiteIdsToDelete },
                        tenantId,
                        deletedAt: null,
                        stato: { in: ['BOZZA', 'DA_FATTURARE'] },
                        OR: [
                            { appPrestazioneId: null },
                            ...(appPrestazioneIdsToClose.length > 0
                                ? [{ appPrestazioneId: { in: appPrestazioneIdsToClose } }]
                                : [])
                        ]
                    },
                    data: {
                        stato: 'ANNULLATO',
                        deletedAt: now,
                        updatedBy: deletedBy || null,
                        note: 'Annullato automaticamente per annullamento visita'
                    }
                });

                // Soft delete with reason stored in audit
                await tx.visita.update({
                    where: { id },
                    data: { stato: 'ANNULLATA', deletedAt: now }
                });
            });

            // P58: Log deletion in GdprAuditLog with reason
            await prisma.gdprAuditLog.create({
                data: {
                    personId: existing.pazienteId,
                    action: 'DELETE',
                    resourceType: 'Visita',
                    resourceId: id,
                    tenantId,
                    dataAccessed: {
                        visitaId: id,
                        deletionReason: deletionReason.trim(),
                        deletedBy: deletedBy || 'system',
                        medicoId: existing.medicoId,
                        medicoName: `${existing.medico.firstName} ${existing.medico.lastName}`,
                        pazienteName: `${existing.paziente.firstName} ${existing.paziente.lastName}`,
                        dataOra: existing.dataOra,
                        stato: existing.stato,
                        operation: 'SOFT_DELETE'
                    }
                }
            });

            logger.info('Visita deleted with reason', {
                component: 'VisitaService',
                visitaId: id,
                tenantId,
                deletionReason: deletionReason.trim(),
                deletedBy
            });

            // P72_16: Cascade soft-delete ScadenzaPrestazioneProtocollo linked to this visit
            await prisma.scadenzaPrestazioneProtocollo.updateMany({
                where: { visitaId: { in: visiteIdsToDelete }, tenantId, deletedAt: null },
                data: { deletedAt: now }
            });

            // P70: Free scadenze linked via appointment (unlink, don't delete)
            if (existing.appuntamentoId) {
                await prisma.scadenzaPrestazioneProtocollo.updateMany({
                    where: { appuntamentoId: existing.appuntamentoId, tenantId, deletedAt: null },
                    data: { appuntamentoId: null, dataEsecuzione: null },
                });
            }

            for (const appPrestazioneId of appPrestazioneIdsToClose) {
                await MovimentoContabileGenerator.annullaPerAppuntamentoPrestazione(
                    appPrestazioneId,
                    tenantId,
                    deletedBy || 'system'
                ).catch(err => {
                    logger.warn('Movimenti contabili non annullati per visita secondaria eliminata', {
                        component: 'VisitaService',
                        appPrestazioneId,
                        error: err.message
                    });
                });
            }

            return {
                id,
                appuntamentoId: existing.appuntamentoId || null,
                deletedAt: new Date(),
                deletionReason: deletionReason.trim()
            };
        } catch (error) {
            logger.error('Failed to delete visita', {
                component: 'VisitaService',
                error: error.message,
                visitaId: id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get today's visits for dashboard
     * @param {string} tenantId - Tenant ID
     * @param {string} medicoId - Optional doctor filter
     * @returns {Promise<Object>} Today's visits summary
     */
    static async getTodaySummary(tenantId, medicoId = null) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const where = {
                tenantId,
                deletedAt: null,
                dataOra: { gte: today, lt: tomorrow }
            };

            if (medicoId) where.medicoId = medicoId;

            const [visite, counts] = await Promise.all([
                prisma.visita.findMany({
                    where,
                    orderBy: { dataOra: 'asc' },
                    include: {
                        paziente: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        medico: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        prestazione: {
                            select: {
                                id: true,
                                nome: true,
                                tipo: true
                            }
                        }
                    }
                }),
                prisma.visita.groupBy({
                    by: ['stato'],
                    where,
                    _count: { id: true }
                })
            ]);

            const summary = {
                total: visite.length,
                byStatus: {},
                visite
            };

            counts.forEach(c => {
                summary.byStatus[c.stato] = c._count.id;
            });

            return summary;
        } catch (error) {
            logger.error('Failed to get today summary', {
                component: 'VisitaService',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get available visit states
     * @returns {Array} Valid states
     */
    static getStati() {
        return STATI_VISITA;
    }

    /**
     * Get allowed state transitions
     * @returns {Object} State transition map
     */
    static getTransizioni() {
        return TRANSIZIONI_STATO;
    }

    /**
     * Get or create visita from appuntamento
     * If visita exists for appuntamento, returns it.
     * If not, creates a new visita with data from appuntamento.
     * 
     * @param {string} appuntamentoId - Appointment ID
     * @param {string} tenantId - Tenant ID
     * @param {string} currentPersonId - Current logged-in person ID
     * @returns {Promise<{visita: Object, created: boolean, medicoAssegnato: Object|null, medicoCorrente: Object|null}>}
     */
    static async getOrCreateByAppuntamento(appuntamentoId, tenantId, currentPersonId) {
        try {
            // Check if visita already exists for this appuntamento
            const existingVisita = await prisma.visita.findFirst({
                where: {
                    appuntamentoId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    paziente: {
                        select: { id: true, firstName: true, lastName: true, taxCode: true, gender: true }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true, taxCode: true, gender: true }
                    },
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    },
                    appuntamento: {
                        select: { id: true, dataOra: true, stato: true }
                    }
                }
            });

            if (existingVisita) {
                // Get current person info
                const currentPerson = await prisma.person.findFirst({ // F246: findFirst+deletedAt
                    where: { id: currentPersonId, deletedAt: null },
                    select: { id: true, firstName: true, lastName: true }
                });

                // Link orphaned DocumentoCompilato records from queue check-in to this existing visita
                // (queue check-in creates documents with appuntamentoId but without visitaId)
                try {
                    const linkedDocs = await prisma.documentoCompilato.updateMany({
                        where: {
                            appuntamentoId,
                            tenantId,
                            visitaId: null,
                            deletedAt: null
                        },
                        data: { visitaId: existingVisita.id }
                    });
                    if (linkedDocs.count > 0) {
                        logger.info('Linked orphaned questionnaire documents to existing visita', {
                            component: 'VisitaService',
                            visitaId: existingVisita.id,
                            appuntamentoId,
                            documentsLinked: linkedDocs.count
                        });
                    }
                } catch (docErr) {
                    logger.warn('Failed to link questionnaire documents to existing visita', {
                        component: 'VisitaService',
                        error: docErr.message,
                        visitaId: existingVisita.id,
                        appuntamentoId
                    });
                }

                logger.debug('Existing visita found for appuntamento', {
                    component: 'VisitaService',
                    visitaId: existingVisita.id,
                    appuntamentoId
                });

                return {
                    visita: existingVisita,
                    created: false,
                    medicoAssegnato: existingVisita.medico,
                    medicoCorrente: currentPerson
                };
            }

            // Get appuntamento data to create visita
            const appuntamento = await prisma.appuntamento.findFirst({
                where: {
                    id: appuntamentoId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    paziente: {
                        select: { id: true, firstName: true, lastName: true, taxCode: true, gender: true }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true, taxCode: true, gender: true }
                    },
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    },
                    slots: {
                        select: { ambulatorioId: true },
                        take: 1
                    }
                }
            });

            if (!appuntamento) {
                throw new Error('Appuntamento not found');
            }

            // Get current person info
            const currentPerson = await prisma.person.findFirst({ // F246: findFirst+deletedAt
                where: { id: currentPersonId, deletedAt: null },
                select: { id: true, firstName: true, lastName: true }
            });

            // Determine ambulatorioId (use first slot or ambulatorioId directly)
            const ambulatorioId = appuntamento.slots?.[0]?.ambulatorioId || appuntamento.ambulatorioId || await this._getDefaultAmbulatorio(tenantId);

            if (!ambulatorioId) {
                throw new Error('No ambulatorio available');
            }

            // Resolve prestazione: use appointment's prestazione or find a default MDL one
            let prestazioneId = appuntamento.prestazioneId;
            if (!prestazioneId) {
                // MDL appointments may not have a specific prestazione — find the default
                const defaultPrestazione = await prisma.prestazione.findFirst({
                    where: {
                        tenantId,
                        tipo: 'VISITA_MEDICINA_LAVORO',
                        deletedAt: null
                    },
                    select: { id: true }
                });
                if (defaultPrestazione) {
                    prestazioneId = defaultPrestazione.id;
                    logger.info('Using default MDL prestazione for appointment without prestazione', {
                        component: 'VisitaService',
                        prestazioneId: defaultPrestazione.id,
                        appuntamentoId
                    });
                } else {
                    // Fallback: find any active prestazione for this tenant
                    const anyPrestazione = await prisma.prestazione.findFirst({
                        where: { tenantId, deletedAt: null },
                        select: { id: true }
                    });
                    if (anyPrestazione) {
                        prestazioneId = anyPrestazione.id;
                    } else {
                        throw new Error('No prestazione available for this tenant');
                    }
                }
            }

            // Backfill: se appuntamento.prestazioneId era null, aggiornalo ora
            // Questo garantisce coerenza tra Appuntamento e Visita per filtro duplicati frontend
            if (!appuntamento.prestazioneId && prestazioneId) {
                await prisma.appuntamento.update({
                    where: { id: appuntamentoId },
                    data: { prestazioneId }
                });
            }

            // Create the visita (handle unique constraint: may have soft-deleted visita for same appuntamento)
            let newVisita;
            try {
                newVisita = await this.create({
                    tenantId,
                    createdBy: currentPersonId,
                    appuntamentoId,
                    pazienteId: appuntamento.pazienteId,
                    medicoId: appuntamento.medicoId || currentPersonId,
                    prestazioneId,
                    ambulatorioId,
                    tipoVisitaMDL: appuntamento.tipoVisitaMDL || null,
                    dataOra: appuntamento.dataOra || new Date()
                });
            } catch (createError) {
                // P2002: Unique constraint failed on appuntamentoId
                // This means a soft-deleted visita exists — recover it
                if (createError.code === 'P2002' || createError.message?.includes('Unique constraint')) {
                    const softDeletedVisita = await prisma.visita.findFirst({
                        where: { appuntamentoId, tenantId }
                    });
                    if (softDeletedVisita) {
                        newVisita = await prisma.visita.update({
                            where: { id: softDeletedVisita.id },
                            data: {
                                deletedAt: null,
                                stato: 'IN_CORSO',
                                medicoId: appuntamento.medicoId || currentPersonId,
                                ambulatorioId,
                                tipoVisitaMDL: appuntamento.tipoVisitaMDL || null,
                                updatedAt: new Date()
                            }
                        });
                        logger.info('Recovered soft-deleted visita for appuntamento', {
                            component: 'VisitaService',
                            visitaId: newVisita.id,
                            appuntamentoId
                        });
                    } else {
                        throw createError;
                    }
                } else {
                    throw createError;
                }
            }

            // Fetch the created visita with includes
            const visitaWithIncludes = await prisma.visita.findFirst({
                where: { id: newVisita.id, deletedAt: null },
                include: {
                    paziente: {
                        select: { id: true, firstName: true, lastName: true, taxCode: true, gender: true }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true, taxCode: true, gender: true }
                    },
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    },
                    appuntamento: {
                        select: { id: true, dataOra: true, stato: true }
                    }
                }
            });

            // Ensure paziente has PAZIENTE role for this tenant (prevents 404 on getPazienteById)
            if (appuntamento.pazienteId) {
                try {
                    const existingRole = await prisma.personRole.findFirst({
                        where: {
                            personId: appuntamento.pazienteId,
                            roleType: 'PAZIENTE',
                            tenantId,
                            isActive: true,
                            deletedAt: null
                        }
                    });
                    if (!existingRole) {
                        await prisma.personRole.create({
                            data: {
                                personId: appuntamento.pazienteId,
                                roleType: 'PAZIENTE',
                                tenantId,
                                isActive: true,
                                isPrimary: false
                            }
                        });
                        logger.info('Auto-assigned PAZIENTE role for patient from appointment', {
                            component: 'VisitaService',
                            personId: appuntamento.pazienteId,
                            tenantId
                        });
                    }
                } catch (roleErr) {
                    // P2002 unique constraint = role already exists, safe to ignore
                    if (roleErr.code !== 'P2002') {
                        logger.warn('Failed to auto-assign PAZIENTE role', {
                            component: 'VisitaService',
                            error: roleErr.message,
                            personId: appuntamento.pazienteId,
                            tenantId
                        });
                    }
                }
            }

            // Link existing DocumentoCompilato (questionnaire) records from check-in to this Visita
            // The queue check-in creates DocumentoCompilato with appuntamentoId but without visitaId
            try {
                const linkedDocs = await prisma.documentoCompilato.updateMany({
                    where: {
                        appuntamentoId,
                        tenantId,
                        visitaId: null,
                        deletedAt: null
                    },
                    data: { visitaId: newVisita.id }
                });
                if (linkedDocs.count > 0) {
                    logger.info('Linked questionnaire documents from check-in to visita', {
                        component: 'VisitaService',
                        visitaId: newVisita.id,
                        appuntamentoId,
                        documentsLinked: linkedDocs.count
                    });
                }
            } catch (docErr) {
                logger.warn('Failed to link questionnaire documents to visita', {
                    component: 'VisitaService',
                    error: docErr.message,
                    visitaId: newVisita.id,
                    appuntamentoId
                });
            }

            logger.info('Created new visita from appuntamento', {
                component: 'VisitaService',
                visitaId: newVisita.id,
                appuntamentoId,
                medicoId: visitaWithIncludes.medicoId
            });

            return {
                visita: visitaWithIncludes,
                created: true,
                medicoAssegnato: visitaWithIncludes.medico,
                medicoCorrente: currentPerson
            };

        } catch (error) {
            logger.error('Failed to get/create visita by appuntamento', {
                component: 'VisitaService',
                error: error.message,
                appuntamentoId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get default ambulatorio for tenant
     * @private
     */
    static async _getDefaultAmbulatorio(tenantId) {
        const ambulatorio = await prisma.ambulatorio.findFirst({
            where: {
                tenantId,
                deletedAt: null,
                stato: 'ATTIVO'
            },
            select: { id: true }
        });
        return ambulatorio?.id || null;
    }
}

export default VisitaService;
