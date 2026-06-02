/**
 * Appuntamento Service
 * Business logic for appointment management with queue system
 * 
 * @module services/clinical/AppuntamentoService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { EventBus, AppointmentEvents } from '../events/index.js';
import { parseToStartOfDay, parseToEndOfDay } from '../../utils/dateUtils.js';
import MovimentoContabileGenerator from '../management/MovimentoContabileGenerator.js';

const APPOINTMENT_MEDICO_ROLE_TYPES = ['MEDICO', 'MEDICO_COMPETENTE'];
const APPOINTMENT_COMPANY_MEDICO_NOMINE_TYPES = ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'];

function formatRiskLabel(risk) {
    if (!risk) return null;
    return [
        risk.descrizioneEsposizione,
        risk.codiceRischio,
        risk.livello ? `Lv. ${risk.livello}` : null,
    ].filter(Boolean).join(' - ');
}

function flattenWorkerMansioni(workerMansioni = []) {
    const risks = [];
    const seen = new Set();
    for (const wm of workerMansioni) {
        for (const rischio of wm.mansione?.rischiAssociati || []) {
            const key = `${rischio.codiceRischio}-${rischio.livello}-${rischio.descrizioneEsposizione || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            risks.push({
                ...rischio,
                label: formatRiskLabel(rischio),
                mansione: wm.mansione?.denominazione || wm.mansione?.codice || null,
            });
        }
    }
    return risks;
}

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function matchVoceTariffario(voci = [], prestazioneId = null, tipoVisitaMDL = null) {
    const prestazioneVoci = voci.filter(v => !v.tipo || v.tipo === 'PRESTAZIONE');
    return (
        (tipoVisitaMDL && prestazioneId
            ? prestazioneVoci.find(v => v.prestazioneId === prestazioneId && v.categoriaVisita === tipoVisitaMDL)
            : null)
        || (tipoVisitaMDL
            ? prestazioneVoci.find(v => !v.prestazioneId && v.categoriaVisita === tipoVisitaMDL)
            : null)
        || (prestazioneId
            ? prestazioneVoci.find(v => v.prestazioneId === prestazioneId && !v.categoriaVisita)
            : null)
        || (prestazioneId
            ? prestazioneVoci.find(v => v.prestazioneId === prestazioneId)
            : null)
        || prestazioneVoci.find(v => !v.prestazioneId && !v.categoriaVisita)
        || null
    );
}

async function findTariffarioAssociation(companyTenantProfileId, tenantId, referenceDate = new Date(), include = {}) {
    const baseWhere = {
        companyTenantProfileId,
        tenantId,
        attivo: true,
        deletedAt: null,
    };
    const datedWhere = {
        ...baseWhere,
        validoDa: { lte: referenceDate },
        OR: [{ validoA: null }, { validoA: { gte: referenceDate } }],
    };

    return await prisma.tariffarioCompanyAssociation.findFirst({
        where: datedWhere,
        include,
        orderBy: { validoDa: 'desc' },
    }) || await prisma.tariffarioCompanyAssociation.findFirst({
        where: baseWhere,
        include,
        orderBy: { validoDa: 'desc' },
    });
}

function getDiscountValues(condizioni = {}) {
    const scontoInfo = condizioni?.scontoInfo || null;
    const tipoSconto = String(scontoInfo?.tipo || '').toUpperCase();
    const percentuale = Number(
        condizioni?.scontoPercentuale
        ?? condizioni?.percentualeSconto
        ?? (tipoSconto.includes('PERCENT') ? scontoInfo?.valore : 0)
        ?? 0
    );
    const fisso = Number(
        condizioni?.scontoFisso
        ?? (tipoSconto.includes('VALORE') || tipoSconto.includes('FISSO') ? scontoInfo?.valore : 0)
        ?? 0
    );
    return {
        percentuale: Number.isFinite(percentuale) && percentuale > 0 ? percentuale : 0,
        fisso: Number.isFinite(fisso) && fisso > 0 ? fisso : 0,
    };
}

function applyConvenzioneDiscount(importo, convenzione) {
    const base = roundMoney(importo);
    if (!convenzione?.condizioni || base <= 0) return base;
    const { percentuale, fisso } = getDiscountValues(convenzione.condizioni);
    let totale = base;
    if (percentuale > 0) totale *= (1 - percentuale / 100);
    if (fisso > 0) totale = Math.max(0, totale - fisso);
    return roundMoney(totale);
}

async function enrichConvenzioneWithCodiceSconto(convenzione, tenantId) {
    const codice = convenzione?.condizioni?.codiceSconto;
    if (!codice || convenzione.condizioni?.scontoInfo) return convenzione;
    const codiceSconto = await prisma.codiceSconto.findFirst({
        where: { codice, tenantId, attivo: true, deletedAt: null },
        select: { tipoSconto: true, valore: true }
    });
    if (!codiceSconto) return convenzione;
    convenzione.condizioni = {
        ...convenzione.condizioni,
        scontoInfo: {
            tipo: codiceSconto.tipoSconto,
            valore: Number(codiceSconto.valore)
        }
    };
    return convenzione;
}

async function findActiveCompanyMedicoCompetente(companyTenantProfileId, tenantId) {
    if (!companyTenantProfileId) return null;
    const now = new Date();
    const nomina = await prisma.nominaRuolo.findFirst({
        where: {
            companyTenantProfileId,
            tenantId,
            deletedAt: null,
            stato: 'ATTIVA',
            tipoRuolo: { in: APPOINTMENT_COMPANY_MEDICO_NOMINE_TYPES },
            OR: [{ dataFine: null }, { dataFine: { gte: now } }],
            person: {
                deletedAt: null,
                tenantProfiles: { some: { tenantId, deletedAt: null } },
                personRoles: {
                    some: {
                        tenantId,
                        isActive: true,
                        deletedAt: null,
                        roleType: { in: APPOINTMENT_MEDICO_ROLE_TYPES },
                    },
                },
            },
        },
        include: {
            person: {
                include: {
                    tenantProfiles: {
                        where: { tenantId, deletedAt: null },
                        take: 1,
                    },
                },
            },
        },
        orderBy: [
            { tipoRuolo: 'asc' },
            { dataInizio: 'desc' },
        ],
    });
    return nomina?.person || null;
}

function computeAppointmentPriceSummary(appuntamento, { tariffarioTotal = null } = {}) {
    const tariffarioAmount = Number(tariffarioTotal || 0);
    let base = 0;

    const mainPrice = Number(
        appuntamento?.prestazione?._prezzoTariffario
        ?? appuntamento?.prestazione?.prezzoBase
        ?? 0
    );
    base += Number.isFinite(mainPrice) ? mainPrice : 0;

    for (const row of appuntamento?.prestazioni || []) {
        if (!row || row.deletedAt || row.prestazioneId === appuntamento.prestazioneId) continue;
        const movementPrice = Number(row.movimentiContabili?.find?.(m => m?.direzione !== 'USCITA')?.importoNetto ?? 0);
        const rowPrice = movementPrice > 0
            ? movementPrice
            : Number(row.prestazione?._prezzoTariffario ?? row.prestazione?.prezzoBase ?? row.prezzo ?? 0);
        if (Number.isFinite(rowPrice) && rowPrice > 0) base += rowPrice;
    }

    if (base <= 0) {
        base = tariffarioAmount || Number(appuntamento?._prezzoTotaleMovimenti ?? appuntamento?.prezzoBase ?? appuntamento?.prezzo ?? 0) || 0;
    }

    base = roundMoney(base);
    const finale = applyConvenzioneDiscount(base, appuntamento?.convenzione);
    appuntamento._prezzoPrestazioniBase = base;
    appuntamento._prezzoFinale = finale;
    appuntamento.prezzoBase = base;
    appuntamento.prezzo = finale;
    appuntamento.prezzoFinale = finale;
    appuntamento.prezzoScontato = finale < base ? finale : null;
    appuntamento.prezzoConvenzionato = finale < base ? finale : null;
    return { base, finale };
}

async function resolveMedicoForAppointment(data, tenantId, createdBy, medicoLookupOr) {
    const medico = await prisma.person.findFirst({
        where: {
            OR: medicoLookupOr,
            deletedAt: null,
            tenantProfiles: {
                some: { tenantId, deletedAt: null }
            },
            personRoles: {
                some: {
                    tenantId,
                    isActive: true,
                    deletedAt: null,
                    roleType: { in: APPOINTMENT_MEDICO_ROLE_TYPES }
                }
            }
        },
        include: {
            tenantProfiles: {
                where: { tenantId, deletedAt: null },
                take: 1
            }
        }
    });

    if (medico) return medico;

    const allowDirectMdlFallback = data.createdFromSorveglianzaSanitaria === true &&
        data.tipoVisitaMDL &&
        data.companyTenantProfileId &&
        createdBy;

    if (!allowDirectMdlFallback) return null;

    const activeCompanyMedico = await findActiveCompanyMedicoCompetente(data.companyTenantProfileId, tenantId);
    if (activeCompanyMedico) return activeCompanyMedico;

    const authorizedActor = await prisma.person.findFirst({
        where: {
            id: createdBy,
            deletedAt: null,
            tenantProfiles: {
                some: { tenantId, deletedAt: null, isActive: true }
            },
            personRoles: {
                some: {
                    tenantId,
                    isActive: true,
                    deletedAt: null,
                    roleType: { in: APPOINTMENT_MEDICO_ROLE_TYPES }
                }
            }
        },
        include: {
            tenantProfiles: {
                where: { tenantId, deletedAt: null },
                take: 1
            }
        }
    });

    return authorizedActor;
}

export class AppuntamentoService {
    /**
     * Create a new appointment
     */
    static async create(data, tenantId, createdBy) {
        try {
            // Generate progressive number for the day
            const dataOra = new Date(data.dataOra);

            // CRITICAL FIX: Use UTC methods to avoid timezone shift bug
            // Previous bug: setHours(0,0,0,0) on UTC date shifts to previous day in UTC+1
            const year = dataOra.getUTCFullYear();
            const month = dataOra.getUTCMonth();
            const day = dataOra.getUTCDate();
            const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

            const countToday = await prisma.appuntamento.count({
                where: {
                    tenantId,
                    dataOra: { gte: startOfDay, lte: endOfDay }
                }
            });

            const numeroPrenotazione = `${startOfDay.toISOString().split('T')[0]}-${String(countToday + 1).padStart(4, '0')}`;

            const requestedMedicoId = data.medicoId || createdBy;
            const medicoLookupOr = [{ id: requestedMedicoId }];
            const allowCreatedByFallback = data.createdFromSorveglianzaSanitaria === true &&
                data.tipoVisitaMDL &&
                data.companyTenantProfileId;
            if (allowCreatedByFallback && createdBy && createdBy !== requestedMedicoId) {
                medicoLookupOr.push({ id: createdBy });
            }
            medicoLookupOr.push({
                tenantProfiles: {
                    some: { id: requestedMedicoId, tenantId, deletedAt: null }
                }
            });

            // P48: Verify all references exist - Person non ha tenantId, usa tenantProfiles
            const [paziente, medico, ambulatorio] = await Promise.all([
                prisma.person.findFirst({
                    where: {
                        id: data.pazienteId,
                        deletedAt: null,
                        tenantProfiles: {
                            some: { tenantId, deletedAt: null }
                        }
                    },
                    include: {
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null },
                            take: 1
                        }
                    }
                }),
                resolveMedicoForAppointment(data, tenantId, createdBy, medicoLookupOr),
                data.ambulatorioId
                    ? prisma.ambulatorio.findFirst({
                        where: { id: data.ambulatorioId, tenantId, deletedAt: null }
                    })
                    : prisma.ambulatorio.findFirst({
                        where: { tenantId, deletedAt: null, stato: 'ATTIVO' },
                        orderBy: { createdAt: 'asc' }
                    })
            ]);

            if (!paziente) throw new Error('Paziente not found');
            if (!medico) throw new Error('Medico not found');
            if (!ambulatorio) {
                throw new Error(data.ambulatorioId
                    ? 'Ambulatorio not found'
                    : 'Nessun ambulatorio attivo disponibile per creare l\'appuntamento senza slot disponibilità');
            }

            // Se non arriva uno slot disponibilità, il DB richiede comunque un ambulatorio:
            // usiamo il primo ambulatorio attivo del tenant come fallback esplicito.
            const resolvedAmbulatorioId = data.ambulatorioId || ambulatorio.id;
            const resolvedMedicoId = medico.id;

            // Project 51: Validate tenant isolation for all tenant-specific entities
            // This prevents mixing entities from different tenants in an appointment
            const tenantValidationPromises = [];

            // Validate prestazione belongs to same tenant
            if (data.prestazioneId) {
                tenantValidationPromises.push(
                    prisma.prestazione.findFirst({
                        where: { id: data.prestazioneId, tenantId, deletedAt: null },
                        select: { id: true, tenantId: true }
                    }).then(p => {
                        if (!p) {
                            throw new Error('TENANT_MISMATCH: La prestazione selezionata appartiene a un altro tenant');
                        }
                        return p;
                    })
                );
            }

            // Validate convenzione belongs to same tenant
            if (data.convenzioneId) {
                tenantValidationPromises.push(
                    prisma.convenzione.findFirst({
                        where: { id: data.convenzioneId, tenantId, deletedAt: null },
                        select: { id: true, tenantId: true }
                    }).then(c => {
                        if (!c) {
                            throw new Error('TENANT_MISMATCH: La convenzione selezionata appartiene a un altro tenant');
                        }
                        return c;
                    })
                );
            }

            // Wait for all validations
            if (tenantValidationPromises.length > 0) {
                await Promise.all(tenantValidationPromises);
            }

            logger.info('Tenant isolation validated for appointment', {
                component: 'appuntamento-service',
                action: 'create',
                tenantId,
                prestazioneId: data.prestazioneId,
                convenzioneId: data.convenzioneId,
                ambulatorioId: resolvedAmbulatorioId,
                ambulatorioFallback: !data.ambulatorioId
            });

            // Check for conflicts (skip if overbooking is explicitly allowed)
            if (!data.isOverbooking) {
                const conflicts = await this.checkConflicts(
                    resolvedMedicoId,
                    resolvedAmbulatorioId,
                    dataOra,
                    data.durataMinuti || 30,
                    tenantId
                );

                if (conflicts.length > 0) {
                    throw new Error(`Appointment conflicts with existing appointments: ${conflicts.map(c => c.numeroPrenotazione).join(', ')}`);
                }
            }

            // Prepara i dati per la creazione
            // NOTA: ambulatorio.id è già trovato sopra come fallback se data.ambulatorioId non è fornito
            const resolvedPrestazioneId = data.prestazioneId || null;

            const createData = {
                numeroPrenotazione,
                ambulatorioId: resolvedAmbulatorioId,
                ...(resolvedPrestazioneId !== null && { prestazioneId: resolvedPrestazioneId }),
                pazienteId: data.pazienteId,
                medicoId: resolvedMedicoId,
                // Ensure proper Date object — Prisma requires ISO 8601 DateTime (rejects bare "T09:00:00" strings)
                dataOra: data.dataOra instanceof Date ? data.dataOra : new Date(data.dataOra),
                durataMinuti: data.durataMinuti || 30,
                stato: data.stato || 'PRENOTATO',
                isOverbooking: data.isOverbooking || false,
                ...(data.note !== undefined && { note: data.note }),
                ...(data.noteInterne !== undefined && { noteInterne: data.noteInterne }),
                ...(data.convenzioneId !== undefined && { convenzioneId: data.convenzioneId }),
                promemoriaSms: data.promemoriaSms || false,
                promemoriaEmail: data.promemoriaEmail !== undefined ? data.promemoriaEmail : true,
                // === PROGETTO 56: MEDICINA DEL LAVORO ===
                ...(data.companyTenantProfileId && { companyTenantProfileId: data.companyTenantProfileId }),
                ...(data.tipoVisitaMDL && { tipoVisitaMDL: data.tipoVisitaMDL }),
                tenantId,
                createdBy
            };

            const appuntamento = await prisma.appuntamento.create({
                data: createData,
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            specializzazione: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            durataPrevista: true
                        }
                    }
                }
            });

            // P48: Aggiungi dati paziente e medico - email/phone sono in tenantProfiles
            const pazienteProfile = paziente.tenantProfiles?.[0] || {};
            const medicoProfile = medico.tenantProfiles?.[0] || {};

            appuntamento.paziente = {
                id: paziente.id,
                firstName: paziente.firstName,
                lastName: paziente.lastName,
                email: pazienteProfile.email || null,
                phone: pazienteProfile.phone || null,
                taxCode: paziente.taxCode || null,
                birthDate: paziente.birthDate || null,
                birthPlace: paziente.birthPlace || null,
                birthProvince: paziente.birthProvince || null,
                gender: paziente.gender || null,
                residenceAddress: pazienteProfile.residenceAddress || null,
                residenceCity: pazienteProfile.residenceCity || null,
                postalCode: pazienteProfile.postalCode || null,
                province: pazienteProfile.province || null
            };
            appuntamento.medico = {
                id: medico.id,
                firstName: medico.firstName,
                lastName: medico.lastName,
                specialties: medicoProfile.specialties || [],
                registerCode: medicoProfile.registerCode || null
            };

            logger.info('Appuntamento created', {
                component: 'appuntamento-service',
                action: 'create',
                appuntamentoId: appuntamento.id,
                numeroPrenotazione: appuntamento.numeroPrenotazione,
                pazienteId: data.pazienteId,
                medicoId: resolvedMedicoId,
                tenantId
            });

            // Project 47 - Emit domain event for notification system
            await EventBus.publish(AppointmentEvents.CREATED, {
                appuntamentoId: appuntamento.id,
                numeroPrenotazione: appuntamento.numeroPrenotazione,
                pazienteId: data.pazienteId,
                pazienteNome: `${paziente.firstName} ${paziente.lastName}`,
                pazienteEmail: paziente.email,
                medicoId: resolvedMedicoId,
                medicoNome: `${medico.firstName} ${medico.lastName}`,
                dataOra: appuntamento.dataOra,
                ambulatorioNome: appuntamento.ambulatorio?.nome,
                prestazioneNome: appuntamento.prestazione?.nome,
                tenantId
            });

            // P56: MDL Reconciliation — quando si prenota una VML di tipo PREVENTIVA o PERIODICA,
            // collega le ScadenzaPrestazioneProtocollo aperte del lavoratore a questo appuntamento,
            // così spariscono dalla lista scadenze pending finché l'appuntamento è attivo.
            const TIPI_VISITA_RECONCILE = ['PREVENTIVA', 'PREVENTIVA_PREASSUNTIVA', 'PERIODICA'];
            if (TIPI_VISITA_RECONCILE.includes(data.tipoVisitaMDL) && data.pazienteId) {
                try {
                    // P70: limita alle scadenze nei ±60 giorni dalla data appuntamento
                    const dataApp = new Date(appuntamento.dataOra);
                    const minus60 = new Date(dataApp);
                    minus60.setDate(minus60.getDate() - 60);
                    const plus60 = new Date(dataApp);
                    plus60.setDate(plus60.getDate() + 60);

                    const whereScadenze = {
                        personId: data.pazienteId,
                        tenantId,
                        eseguita: false,
                        deletedAt: null,
                        appuntamentoId: null, // ancora non coperte
                        dataScadenza: { gte: minus60, lte: plus60 }, // P70: ±60 giorni
                    };

                    // Se c'è un'azienda specifica, filtra per mansione attiva di quell'azienda
                    if (data.companyTenantProfileId) {
                        const mansioneAttiva = await prisma.lavoratoreMansione.findFirst({
                            where: {
                                personId: data.pazienteId,
                                tenantId,
                                isAttiva: true,
                                deletedAt: null,
                                mansione: {
                                    deletedAt: null,
                                    // tenta prima con site collegato all'azienda
                                }
                            },
                            select: { mansioneId: true }
                        });

                        if (mansioneAttiva?.mansioneId) {
                            whereScadenze.mansioneId = mansioneAttiva.mansioneId;
                        }
                    }

                    const updateResult = await prisma.scadenzaPrestazioneProtocollo.updateMany({
                        where: whereScadenze,
                        data: {
                            appuntamentoId: appuntamento.id,
                            // Pre-compila la data esecuzione prevista con la data dell'appuntamento
                            // Viene sovrascritta con la data effettiva al completamento della visita
                            // Viene azzerata se l'appuntamento viene annullato
                            dataEsecuzione: appuntamento.dataOra
                        }
                    });

                    if (updateResult.count > 0) {
                        logger.info('MDL reconciliation: scadenze collegate all\'appuntamento', {
                            component: 'appuntamento-service',
                            action: 'mdl-reconcile',
                            appuntamentoId: appuntamento.id,
                            scadenzeCollegate: updateResult.count,
                            pazienteId: data.pazienteId,
                            tipoVisitaMDL: data.tipoVisitaMDL
                        });
                    }
                } catch (reconcileError) {
                    // Non fatale: logga ma non blocca la creazione dell'appuntamento
                    logger.error('MDL reconciliation failed (non-fatal)', {
                        component: 'appuntamento-service',
                        action: 'mdl-reconcile',
                        appuntamentoId: appuntamento.id,
                        pazienteId: data.pazienteId,
                        error: reconcileError.message
                    });
                }
            }

            // P70: genera BOZZA MovimentoContabile per appuntamento MDL.
            // La creazione diretta da Sorveglianza Sanitaria apre subito la visita:
            // in quel caso attendiamo il calcolo prezzi per mostrare importi corretti.
            if (data.tipoVisitaMDL && data.companyTenantProfileId) {
                const generateMdlDraftMovements = async () => {
                    try {
                        const mResult = await MovimentoContabileGenerator.generaPerAppuntamentoMDL(
                            {
                                id: appuntamento.id,
                                pazienteId: data.pazienteId,
                                medicoId: resolvedMedicoId,
                                prestazioneId: data.prestazioneId || null,
                                tipoVisitaMDL: data.tipoVisitaMDL,
                                dataOra: appuntamento.dataOra,
                                companyTenantProfileId: data.companyTenantProfileId,
                            },
                            tenantId,
                            createdBy
                        );
                        if (mResult.warnings.length > 0) {
                            logger.warn('MDL BOZZA movimento warnings', {
                                component: 'appuntamento-service',
                                action: 'genera-bozza-mdl',
                                appuntamentoId: appuntamento.id,
                                warnings: mResult.warnings,
                            });
                        }
                    } catch (billingErr) {
                        logger.error('MDL BOZZA movimento generation failed (non-blocking)', {
                            component: 'appuntamento-service',
                            action: 'genera-bozza-mdl',
                            appuntamentoId: appuntamento.id,
                            error: billingErr.message,
                        });
                    }
                };

                if (data.createdFromSorveglianzaSanitaria) {
                    await generateMdlDraftMovements();
                } else {
                    setImmediate(generateMdlDraftMovements);
                }
            }

            return appuntamento;
        } catch (error) {
            logger.error('Failed to create appuntamento', {
                component: 'appuntamento-service',
                action: 'create',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get appointment by ID
     */
    static async getById(id, tenantId) {
        try {
            const appuntamento = await prisma.appuntamento.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    ambulatorio: {
                        include: {
                            poliambulatorio: {
                                select: { id: true, nome: true }
                            }
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            tipo: true,
                            durataPrevista: true,
                            prezzoBase: true
                        }
                    },
                    // P59: Prestazioni aggiuntive collegate (da sorveglianza sanitaria o aggiunte manualmente)
                    prestazioni: {
                        where: { deletedAt: null },
                        orderBy: { ordine: 'asc' },
                        include: {
                            prestazione: {
                                select: {
                                    id: true,
                                    nome: true,
                                    codice: true,
                                    prezzoBase: true,
                                    durataPrevista: true,
                                }
                            },
                            // Include MovimentoContabile collegato per recuperare il prezzo da tariffario aziendale
                            // Escludi ANNULLATO/STORNATO per mostrare solo importi validi (attivi o in bozza)
                            // P72_10: filtra solo ENTRATA (costo azienda), non USCITA (compenso medico)
                            movimentiContabili: {
                                where: {
                                    deletedAt: null,
                                    direzione: 'ENTRATA',
                                    stato: { notIn: ['ANNULLATO', 'STORNATO'] },
                                },
                                select: {
                                    id: true,
                                    importoNetto: true,
                                    importoLordo: true,
                                    stato: true,
                                    voceTariffarioId: true,
                                },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            }
                        }
                    },
                    convenzione: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            condizioni: true
                        }
                    },
                    visita: {
                        where: { deletedAt: null }
                    }
                }
            });

            if (!appuntamento) return null;

            // P48: Carica paziente e medico - email/phone sono in tenantProfiles
            const [paziente, medico] = await Promise.all([
                prisma.person.findFirst({
                    where: {
                        id: appuntamento.pazienteId,
                        deletedAt: null,
                        tenantProfiles: {
                            some: { tenantId, deletedAt: null }
                        }
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true,
                        birthDate: true,
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null },
                            select: {
                                email: true,
                                phone: true,
                                companyTenantProfileId: true,
                                siteId: true,
                                repartoId: true,
                                title: true,
                                protocolloSanitario: {
                                    select: { id: true, denominazione: true, descrizione: true }
                                },
                                site: {
                                    select: { id: true, siteName: true, indirizzo: true, citta: true, provincia: true }
                                },
                                reparto: {
                                    select: { id: true, nome: true }
                                }
                            },
                            take: 1
                        }
                    }
                }),
                prisma.person.findFirst({
                    where: {
                        id: appuntamento.medicoId,
                        deletedAt: null,
                        tenantProfiles: {
                            some: { tenantId, deletedAt: null }
                        }
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null },
                            select: { specialties: true, registerCode: true },
                            take: 1
                        }
                    }
                })
            ]);

            // P48: Flatten tenantProfiles
            if (paziente) {
                const profile = paziente.tenantProfiles?.[0] || {};
                appuntamento.paziente = {
                    ...paziente,
                    email: profile.email || null,
                    phone: profile.phone || null,
                    companyTenantProfileId: profile.companyTenantProfileId || null,
                    _mdlProfile: {
                        title: profile.title || null,
                        protocolloSanitario: profile.protocolloSanitario || null,
                        site: profile.site || null,
                        reparto: profile.reparto || null,
                    },
                    tenantProfiles: undefined
                };
            }
            if (medico) {
                const profile = medico.tenantProfiles?.[0] || {};
                appuntamento.medico = {
                    ...medico,
                    specialties: profile.specialties || [],
                    registerCode: profile.registerCode || null,
                    tenantProfiles: undefined
                };
            }

            // P61: Carica informazioni coda per questo appuntamento
            const queueEntry = await prisma.numeroChiamata.findFirst({
                where: {
                    appuntamentoId: id,
                    deletedAt: null
                },
                select: {
                    id: true,
                    numero: true,
                    displayNumber: true,
                    stato: true,
                    sessionId: true
                },
                orderBy: { createdAt: 'desc' }
            });
            if (queueEntry) {
                appuntamento.numeroCoda = queueEntry.numero;
                appuntamento.displayNumberCoda = queueEntry.displayNumber;
                appuntamento.queueEntryId = queueEntry.id;
                appuntamento.queueEntryStato = queueEntry.stato;
                appuntamento.queueSessionId = queueEntry.sessionId;
            }

            // P59: Lookup tariffario aziendale per la prestazione principale e tutte le voci
            // → arricchisce prestazione._prezzoTariffario e appuntamento._vociTariffario per PrestazioniCard
            const effectiveCompanyTenantProfileId = appuntamento.companyTenantProfileId
                || appuntamento.paziente?.companyTenantProfileId
                || null;
            let tariffarioVociAppuntamento = [];
            if (effectiveCompanyTenantProfileId) {
                // Run tariffario + company profile lookup in parallel
                const [tariffarioAssoc, companyProfile] = await Promise.all([
                    findTariffarioAssociation(
                        effectiveCompanyTenantProfileId,
                        tenantId,
                        appuntamento.dataOra || new Date(),
                        {
                            tariffario: {
                                include: {
                                    voci: {
                                        where: { attivo: true, deletedAt: null },
                                        select: {
                                            tipo: true,
                                            prestazioneId: true,
                                            prezzoBase: true,
                                            categoriaVisita: true,
                                        },
                                    },
                                },
                            }
                        }
                    ),
                    prisma.companyTenantProfile.findFirst({
                        where: {
                            id: effectiveCompanyTenantProfileId,
                            tenantId,
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            emailGenerale: true,
                            telefonoGenerale: true,
                            company: {
                                select: {
                                    id: true,
                                    ragioneSociale: true,
                                    piva: true,
                                    codiceFiscale: true,
                                    sedeLegaleCitta: true,
                                    sedeLegaleProvincia: true,
                                    sedeLegaleIndirizzo: true,
                                }
                            }
                        }
                    })
                ]);

                // Inject company info into appuntamento
                if (companyProfile) {
                    appuntamento._companyProfile = {
                        id: companyProfile.id,
                        ragioneSociale: companyProfile.company?.ragioneSociale || '',
                        piva: companyProfile.company?.piva || '',
                        citta: companyProfile.company?.sedeLegaleCitta || '',
                        provincia: companyProfile.company?.sedeLegaleProvincia || '',
                        indirizzo: companyProfile.company?.sedeLegaleIndirizzo || '',
                        email: companyProfile.emailGenerale || '',
                        telefono: companyProfile.telefonoGenerale || '',
                        companyId: companyProfile.company?.id,
                    };
                }

                const allVoci = tariffarioAssoc?.tariffario?.voci ?? [];
                tariffarioVociAppuntamento = allVoci;
                // Espone tutte le voci al frontend per il selettore tipo visita
                appuntamento._vociTariffario = allVoci;
                // Arricchisce il prezzo della prestazione principale con quello del tariffario
                if (appuntamento.prestazioneId && appuntamento.prestazione && allVoci.length > 0) {
                    const tipoVisita = appuntamento.tipoVisitaMDL;
                    const voceMain = matchVoceTariffario(allVoci, appuntamento.prestazioneId, tipoVisita);
                    if (voceMain) {
                        appuntamento.prestazione._prezzoTariffario = Number(voceMain.prezzoBase);
                    }
                }
            }

            const movimentiTotale = await prisma.movimentoContabile.aggregate({
                where: {
                    tenantId,
                    appuntamentoId: id,
                    direzione: 'ENTRATA',
                    stato: { notIn: ['ANNULLATO', 'STORNATO'] },
                    deletedAt: null,
                },
                _sum: { importoNetto: true },
            });
            const totaleMovimenti = Number(movimentiTotale._sum.importoNetto || 0);
            if (totaleMovimenti > 0) {
                appuntamento._prezzoTotaleMovimenti = totaleMovimenti;
            }

            if (tariffarioVociAppuntamento.length > 0) {
                let totaleTariffario = 0;
                if (appuntamento.prestazioneId) {
                    const voceMain = matchVoceTariffario(tariffarioVociAppuntamento, appuntamento.prestazioneId, appuntamento.tipoVisitaMDL);
                    if (voceMain) totaleTariffario += Number(voceMain.prezzoBase || 0);
                }
                const accertamentiIds = (appuntamento.prestazioni || [])
                    .filter(p => p?.deletedAt == null)
                    .map(p => p.prestazioneId)
                    .filter(pId => pId && pId !== appuntamento.prestazioneId);
                for (const prestazioneId of accertamentiIds) {
                    const voce = matchVoceTariffario(tariffarioVociAppuntamento, prestazioneId, null);
                    if (voce) totaleTariffario += Number(voce.prezzoBase || 0);
                }
                if (totaleTariffario > 0) {
                    appuntamento._prezzoTariffarioPrestazione = totaleTariffario;
                }
            }

            // Load worker mansione + rischi for MDL patients
            if (appuntamento.pazienteId && effectiveCompanyTenantProfileId) {
                const workerMansioni = await prisma.lavoratoreMansione.findMany({
                    where: {
                        personId: appuntamento.pazienteId,
                        tenantId,
                        isAttiva: true,
                        deletedAt: null,
                        OR: [{ dataFine: null }, { dataFine: { gte: new Date() } }],
                    },
                    include: {
                        mansione: {
                            select: {
                                id: true,
                                denominazione: true,
                                codice: true,
                                areaLavoro: true,
                                rischiAssociati: {
                                    where: { deletedAt: null },
                                    select: {
                                        id: true,
                                        codiceRischio: true,
                                        livello: true,
                                        categoria: true,
                                        periodicitaMesi: true,
                                        descrizioneEsposizione: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: [{ isPrimaria: 'desc' }, { dataInizio: 'desc' }],
                });

                if (workerMansioni.length > 0) {
                    appuntamento._workerMansioni = workerMansioni.map(wm => ({
                        id: wm.id,
                        isPrimaria: wm.isPrimaria,
                        dataInizio: wm.dataInizio,
                        dataFine: wm.dataFine,
                        mansione: {
                            id: wm.mansione.id,
                            denominazione: wm.mansione.denominazione,
                            codice: wm.mansione.codice,
                            areaLavoro: wm.mansione.areaLavoro,
                            rischi: wm.mansione.rischiAssociati,
                        },
                    }));
                    appuntamento._rischiLavorativi = flattenWorkerMansioni(workerMansioni);
                }
            }

            if (appuntamento.pazienteId && appuntamento.tipoVisitaMDL) {
                const currentVisitaId = appuntamento.visita?.id || null;
                const [ultimaVisitaMdl, scadenze] = await Promise.all([
                    prisma.visita.findFirst({
                        where: {
                            tenantId,
                            pazienteId: appuntamento.pazienteId,
                            tipoVisitaMDL: { not: null },
                            deletedAt: null,
                            ...(currentVisitaId ? { id: { not: currentVisitaId } } : {}),
                        },
                        select: {
                            id: true,
                            dataOra: true,
                            tipoVisitaMDL: true,
                            prestazione: { select: { id: true, nome: true, codice: true } },
                            medico: { select: { id: true, firstName: true, lastName: true } },
                        },
                        orderBy: { dataOra: 'desc' },
                    }),
                    prisma.scadenzaPrestazioneProtocollo.findMany({
                        where: {
                            tenantId,
                            personId: appuntamento.pazienteId,
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            prestazioneId: true,
                            dataScadenza: true,
                            dataEsecuzione: true,
                            periodicitaMesi: true,
                            eseguita: true,
                        },
                        orderBy: [{ dataScadenza: 'asc' }],
                        take: 50,
                    }),
                ]);
                appuntamento._ultimaVisitaMdl = ultimaVisitaMdl || null;
                if (scadenze.length > 0) {
                    const prestazioneIds = [...new Set(scadenze.map(s => s.prestazioneId).filter(Boolean))];
                    const prestazioni = prestazioneIds.length > 0
                        ? await prisma.prestazione.findMany({
                            where: { id: { in: prestazioneIds }, tenantId, deletedAt: null },
                            select: { id: true, nome: true, codice: true },
                        })
                        : [];
                    const prestazioniMap = new Map(prestazioni.map(p => [p.id, p]));
                    appuntamento._accertamentiMdl = scadenze.map(s => ({
                        ...s,
                        prestazione: s.prestazioneId ? prestazioniMap.get(s.prestazioneId) || null : null,
                    }));
                } else {
                    appuntamento._accertamentiMdl = [];
                }
            }

            if (appuntamento.convenzione?.condizioni?.codiceSconto) {
                await enrichConvenzioneWithCodiceSconto(appuntamento.convenzione, tenantId);
            }
            computeAppointmentPriceSummary(appuntamento, {
                tariffarioTotal: appuntamento._prezzoTariffarioPrestazione || null,
            });

            const fattureElettroniche = await prisma.fatturaElettronica.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    OR: [
                        ...(appuntamento.visita?.id ? [{ visitaId: appuntamento.visita.id }] : []),
                        { note: { contains: `AUTO_ACCETTAZIONE:${id}` } },
                        {
                            movimentiContabili: {
                                some: {
                                    tenantId,
                                    deletedAt: null,
                                    appuntamentoId: id,
                                },
                            },
                        },
                    ],
                },
                include: {
                    linee: { orderBy: { numeroLinea: 'asc' } },
                },
                orderBy: { dataEmissione: 'desc' },
            });
            appuntamento._fattureElettroniche = fattureElettroniche;
            if (
                appuntamento.stato === 'COMPLETATO' &&
                fattureElettroniche.some(f => ['EMESSA', 'PAGATA'].includes(f.stato))
            ) {
                appuntamento.stato = 'FATTURATO';
            }

            return appuntamento;
        } catch (error) {
            logger.error('Failed to get appuntamento', {
                component: 'appuntamento-service',
                action: 'getById',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all appointments with filters (supports multi-tenant)
     * @param {string} tenantId - Primary tenant ID (fallback)
     * @param {Object} options - Query options
     * @param {string} options.tenantIds - Comma-separated list of tenant IDs (multi-tenant support)
     * @param {boolean} options.allTenants - If true and accessibleTenantIds provided, show all
     * @param {string[]} options.accessibleTenantIds - Array of tenant IDs the user can access
     */
    static async getAll(tenantId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                dateFrom = null,
                dateTo = null,
                oraInizio = null,
                oraFine = null,
                medicoId = null,
                medicoIds: filterMedicoIds = null,
                pazienteId = null,
                ambulatorioId = null,
                sedeId = null,
                poliambulatorioId = null,
                stato = null,
                search = '',
                orderBy = 'dataOra',
                orderDir = 'asc',
                tenantIds = null,
                allTenants = false,
                accessibleTenantIds = []
            } = options;

            const skip = (page - 1) * limit;

            // Determine tenant filter based on user's access (multi-tenant support)
            let tenantFilter = {};
            let effectiveTenantIds = [tenantId]; // Default to single tenant

            if (tenantIds) {
                // tenantIds can be string (comma-separated) or array
                const requestedIds = typeof tenantIds === 'string'
                    ? tenantIds.split(',').map(id => id.trim())
                    : tenantIds;
                const allowedIds = accessibleTenantIds.length > 0
                    ? requestedIds.filter(id => accessibleTenantIds.includes(id))
                    : requestedIds;

                if (allowedIds.length > 0) {
                    effectiveTenantIds = allowedIds;
                    tenantFilter = allowedIds.length === 1
                        ? { tenantId: allowedIds[0] }
                        : { tenantId: { in: allowedIds } };
                } else {
                    tenantFilter = tenantId ? { tenantId } : {};
                }
            } else if (allTenants && accessibleTenantIds.length > 0) {
                effectiveTenantIds = accessibleTenantIds;
                tenantFilter = { tenantId: { in: accessibleTenantIds } };
            } else if (tenantId) {
                tenantFilter = { tenantId };
            }

            // Costruisci where con supporto multi-tenant
            const where = {
                deletedAt: null,
                ...tenantFilter
            };

            // Date filtering with proper timezone handling
            // parseToStartOfDay and parseToEndOfDay correctly handle YYYY-MM-DD format
            // interpreting them as local dates, avoiding timezone shift bugs
            if (dateFrom) {
                const startDate = parseToStartOfDay(dateFrom);
                if (startDate) {
                    where.dataOra = { gte: startDate };
                }
            }
            if (dateTo) {
                const endDate = parseToEndOfDay(dateTo);
                if (endDate) {
                    where.dataOra = { ...where.dataOra, lte: endDate };
                }
            }
            if (medicoId) {
                where.medicoId = medicoId;
            } else if (Array.isArray(filterMedicoIds) && filterMedicoIds.length > 0) {
                where.medicoId = { in: filterMedicoIds };
            }
            if (pazienteId) where.pazienteId = pazienteId;
            if (ambulatorioId) where.ambulatorioId = ambulatorioId;
            // Cascading filters: sede → ambulatorio.sedeId, poliambulatorio → ambulatorio.sede.poliambulatorioId
            if (sedeId) {
                where.ambulatorio = { ...where.ambulatorio, sedeId };
            }
            if (poliambulatorioId) {
                where.ambulatorio = {
                    ...where.ambulatorio,
                    sede: { poliambulatorioId }
                };
            }
            if (stato) {
                if (stato.includes(',')) {
                    where.stato = { in: stato.split(',').map(s => s.trim()) };
                } else {
                    where.stato = stato;
                }
            } else {
                where.stato = { not: 'ANNULLATO' };
            }
            if (search) {
                where.OR = [
                    { numeroPrenotazione: { contains: search, mode: 'insensitive' } }
                ];
            }

            // When time-of-day filter is active, fetch all results (no pagination)
            // and apply time filtering + pagination in memory.
            // This is efficient because time filters are always used with a date range.
            const hasTimeFilter = oraInizio || oraFine;

            const includeBlock = {
                ambulatorio: {
                    select: {
                        id: true,
                        nome: true,
                        codice: true
                    }
                },
                prestazione: {
                    select: {
                        id: true,
                        nome: true,
                        codice: true,
                        prezzoBase: true,
                        durataPrevista: true
                    }
                },
                convenzione: {
                    select: {
                        id: true,
                        nome: true,
                        codice: true,
                        condizioni: true
                    }
                },
                prestazioni: {
                    where: { deletedAt: null },
                    orderBy: { ordine: 'asc' },
                    include: {
                        prestazione: {
                            select: {
                                id: true,
                                nome: true,
                                codice: true,
                                prezzoBase: true,
                                durataPrevista: true
                            }
                        },
                        movimentiContabili: {
                            where: {
                                deletedAt: null,
                                direzione: 'ENTRATA',
                                stato: { notIn: ['ANNULLATO', 'STORNATO'] },
                            },
                            select: {
                                id: true,
                                importoNetto: true,
                                importoLordo: true,
                                stato: true,
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        }
                    }
                }
            };

            let appuntamenti, total;

            if (hasTimeFilter) {
                // Fetch all matching records, then filter by time in JS
                const allAppuntamenti = await prisma.appuntamento.findMany({
                    where,
                    include: includeBlock,
                    orderBy: { [orderBy]: orderDir }
                });

                const filtered = allAppuntamenti.filter(a => {
                    if (!a.dataOra) return false;
                    const d = new Date(a.dataOra);
                    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    if (oraInizio && hhmm < oraInizio) return false;
                    if (oraFine && hhmm > oraFine) return false;
                    return true;
                });

                total = filtered.length;
                appuntamenti = filtered.slice(skip, skip + limit);
            } else {
                [appuntamenti, total] = await Promise.all([
                    prisma.appuntamento.findMany({
                        where,
                        include: includeBlock,
                        orderBy: { [orderBy]: orderDir },
                        skip,
                        take: limit
                    }),
                    prisma.appuntamento.count({ where })
                ]);
            }

            // P48 FIX: Carica paziente e medico per ogni appuntamento
            // Person non ha più tenantId, usa tenantProfiles per filtrare
            const pazienteIds = [...new Set(appuntamenti.map(a => a.pazienteId).filter(Boolean))];
            const medicoIds = [...new Set(appuntamenti.map(a => a.medicoId).filter(Boolean))];

            const [pazienti, medici] = await Promise.all([
                pazienteIds.length > 0 ? prisma.person.findMany({
                    where: {
                        id: { in: pazienteIds },
                        deletedAt: null,
                        tenantProfiles: {
                            some: {
                                tenantId: effectiveTenantIds.length === 1
                                    ? effectiveTenantIds[0]
                                    : { in: effectiveTenantIds },
                                deletedAt: null
                            }
                        }
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true,
                        birthDate: true,
                        birthPlace: true,
                        birthProvince: true,
                        gender: true,
                        tenantProfiles: {
                            where: {
                                tenantId: effectiveTenantIds.length === 1
                                    ? effectiveTenantIds[0]
                                    : { in: effectiveTenantIds },
                                deletedAt: null
                            },
                            select: {
                                phone: true,
                                email: true,
                                companyTenantProfileId: true,
                                title: true,
                                protocolloSanitarioId: true,
                                siteId: true,
                                repartoId: true,
                                residenceAddress: true,
                                residenceCity: true,
                                postalCode: true,
                                province: true,
                                protocolloSanitario: {
                                    select: { id: true, denominazione: true, descrizione: true }
                                },
                                site: {
                                    select: { id: true, siteName: true, citta: true, provincia: true }
                                },
                                reparto: {
                                    select: { id: true, nome: true }
                                }
                            },
                            take: 1
                        }
                    }
                }) : [],
                medicoIds.length > 0 ? prisma.person.findMany({
                    where: {
                        id: { in: medicoIds },
                        deletedAt: null,
                        tenantProfiles: {
                            some: {
                                tenantId: effectiveTenantIds.length === 1
                                    ? effectiveTenantIds[0]
                                    : { in: effectiveTenantIds },
                                deletedAt: null
                            }
                        }
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }) : []
            ]);

            // P48: Flatten tenantProfiles per i pazienti
            const pazientiMap = new Map((pazienti || []).map(p => {
                const profile = p.tenantProfiles?.[0] || {};
                return [p.id, {
                    id: p.id,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    taxCode: p.taxCode || null,
                    birthDate: p.birthDate || null,
                    birthPlace: p.birthPlace || null,
                    birthProvince: p.birthProvince || null,
                    gender: p.gender || null,
                    phone: profile.phone || null,
                    email: profile.email || null,
                    companyTenantProfileId: profile.companyTenantProfileId || null,
                    _mdlProfile: {
                        title: profile.title || null,
                        protocolloSanitarioId: profile.protocolloSanitarioId || null,
                        protocolloSanitario: profile.protocolloSanitario || null,
                        siteId: profile.siteId || null,
                        site: profile.site || null,
                        repartoId: profile.repartoId || null,
                        reparto: profile.reparto || null,
                    },
                    residenceAddress: profile.residenceAddress || null,
                    residenceCity: profile.residenceCity || null,
                    postalCode: profile.postalCode || null,
                    province: profile.province || null
                }];
            }));
            const mediciMap = new Map((medici || []).map(m => [m.id, m]));

            const validConsensiByPaziente = new Map();
            if (pazienteIds.length > 0) {
                const validitaGiorni = {
                    gdpr: 365,
                    sanitari: 365,
                    mdl_sorveglianza: 365,
                };
                const tokens = await prisma.consensoFirmaToken.findMany({
                    where: {
                        tenantId: effectiveTenantIds.length === 1 ? effectiveTenantIds[0] : { in: effectiveTenantIds },
                        firmatoAt: { not: null },
                        appuntamento: { pazienteId: { in: pazienteIds } },
                    },
                    select: {
                        firmatoAt: true,
                        firmatoConsensi: true,
                        appuntamento: { select: { pazienteId: true } },
                    },
                    orderBy: { firmatoAt: 'desc' },
                    take: 1000,
                });
                const now = Date.now();
                for (const token of tokens) {
                    const pazienteId = token.appuntamento?.pazienteId;
                    if (!pazienteId) continue;
                    if (!validConsensiByPaziente.has(pazienteId)) {
                        validConsensiByPaziente.set(pazienteId, new Set());
                    }
                    const set = validConsensiByPaziente.get(pazienteId);
                    for (const codice of (token.firmatoConsensi || [])) {
                        const giorni = validitaGiorni[codice];
                        if (!giorni || !token.firmatoAt) continue;
                        const expiryMs = new Date(token.firmatoAt).getTime() + giorni * 24 * 60 * 60 * 1000;
                        if (now < expiryMs) set.add(codice);
                    }
                }
            }

            // Raccogli tutti i codici sconto referenziati dalle convenzioni
            const codiciScontoRefs = appuntamenti
                .filter(a => a.convenzione?.condizioni?.codiceSconto)
                .map(a => a.convenzione.condizioni.codiceSconto);

            // Carica i codici sconto se ce ne sono (multi-tenant)
            let codiciScontoMap = new Map();
            if (codiciScontoRefs.length > 0) {
                const uniqueCodici = [...new Set(codiciScontoRefs)];
                const codiciSconto = await prisma.codiceSconto.findMany({
                    where: {
                        codice: { in: uniqueCodici },
                        tenantId: effectiveTenantIds.length === 1
                            ? effectiveTenantIds[0]
                            : { in: effectiveTenantIds },
                        attivo: true,
                        deletedAt: null
                    },
                    select: {
                        codice: true,
                        tipoSconto: true,
                        valore: true
                    }
                });
                codiciScontoMap = new Map(codiciSconto.map(cs => [cs.codice, cs]));
            }

            // P61: Carica numeri coda (queue entries) per gli appuntamenti
            const appuntamentoIds = appuntamenti.map(a => a.id);
            let queueEntriesMap = new Map();
            if (appuntamentoIds.length > 0) {
                const queueEntries = await prisma.numeroChiamata.findMany({
                    where: {
                        appuntamentoId: { in: appuntamentoIds },
                        deletedAt: null
                    },
                    select: {
                        id: true, // P61: Serve per chiamare il paziente (queueApi.callSpecific)
                        appuntamentoId: true,
                        sessionId: true, // P61: Per identificare la sessione coda attiva
                        numero: true,
                        displayNumber: true,
                        stato: true
                    },
                    orderBy: { createdAt: 'desc' } // Prendi il più recente se ce ne sono più di uno
                });
                // Mappa per appuntamentoId -> entry più recente
                for (const entry of queueEntries) {
                    if (entry.appuntamentoId && !queueEntriesMap.has(entry.appuntamentoId)) {
                        queueEntriesMap.set(entry.appuntamentoId, entry);
                    }
                }
            }

            // Carica visita (id + stato) per ogni appuntamento
            let visitaMap = new Map();
            if (appuntamentoIds.length > 0) {
                const visite = await prisma.visita.findMany({
                    where: {
                        appuntamentoId: { in: appuntamentoIds },
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        stato: true,
                        appuntamentoId: true
                    }
                });
                for (const v of visite) {
                    if (v.appuntamentoId) visitaMap.set(v.appuntamentoId, v);
                }
            }

            // Fallback: per appuntamenti COMPLETATO/FATTURATO senza visita linkata,
            // cerca visite orfane (appuntamentoId null) per stesso paziente nello stesso giorno.
            // Necessario per dati storici creati prima del collegamento appuntamento↔visita.
            const unmatchedCompletato = appuntamenti.filter(a =>
                ['COMPLETATO', 'FATTURATO'].includes(a.stato) && !visitaMap.has(a.id) && a.pazienteId
            );
            if (unmatchedCompletato.length > 0) {
                const orphanPazienteIds = [...new Set(unmatchedCompletato.map(a => a.pazienteId))];
                const orphanVisite = await prisma.visita.findMany({
                    where: {
                        tenantId,
                        deletedAt: null,
                        appuntamentoId: null,
                        pazienteId: { in: orphanPazienteIds },
                    },
                    select: { id: true, stato: true, pazienteId: true, dataOra: true }
                });
                for (const app of unmatchedCompletato) {
                    const appDate = app.dataOra ? new Date(app.dataOra).toDateString() : null;
                    if (!appDate) continue;
                    const matched = orphanVisite.find(v => {
                        if (v.pazienteId !== app.pazienteId) return false;
                        const vDate = v.dataOra ? new Date(v.dataOra).toDateString() : null;
                        return vDate === appDate;
                    });
                    if (matched) visitaMap.set(app.id, matched);
                }
            }

            // P59: Aggiungi totale movimentiContabili per ciascun appuntamento
            // Usa importoNetto (IVA esclusa) — coerente con i prezzi tariffario visualizzati nel calendario.
            // Prestazioni mediche hanno IVA 0% per legge (Art.10 DPR 633/72) quindi netto = lordo per la maggioranza,
            // ma usiamo netto per robustezza in presenza di dati storici con IVA 22%.
            let movimentiTotali = new Map();
            if (appuntamentoIds.length > 0) {
                const movimentiSums = await prisma.movimentoContabile.groupBy({
                    by: ['appuntamentoId'],
                    where: {
                        appuntamentoId: { in: appuntamentoIds },
                        stato: { notIn: ['ANNULLATO', 'STORNATO'] },
                        direzione: 'ENTRATA',
                        deletedAt: null,
                    },
                    _sum: { importoNetto: true },
                });
                movimentiSums.forEach(m => {
                    if (m.appuntamentoId && m._sum.importoNetto != null) {
                        movimentiTotali.set(m.appuntamentoId, Number(m._sum.importoNetto));
                    }
                });
            }

            // P59: Il prezzo tariffario aziendale è sempre calcolato per tutti gli appuntamenti
            // con un'azienda associata — è la fonte di verità contrattuale per la visualizzazione nel calendario.
            // _prezzoTotaleMovimenti (movimenti effettivi) viene usato come riferimento billing,
            // ma _prezzoTariffarioPrestazione (calcolato da contratto) ha priorità nella UI.
            let tariffarioFallbackMap = new Map(); // appuntamentoId -> prezzo totale da tariffario
            const getEffectiveCompanyId = (app) => app.companyTenantProfileId
                || pazientiMap.get(app.pazienteId)?.companyTenantProfileId
                || null;
            const appsNeedingTariffario = appuntamenti.filter(a => getEffectiveCompanyId(a));
            if (appsNeedingTariffario.length > 0) {
                const companyIds = [...new Set(appsNeedingTariffario.map(a => getEffectiveCompanyId(a)).filter(Boolean))];
                const tariffTenantIds = effectiveTenantIds.length > 0 ? effectiveTenantIds : [tenantId];
                // Batch lookup tariffari aziendali
                const tariffAssocInclude = {
                    tariffario: {
                        include: {
                            voci: {
                                where: { attivo: true, deletedAt: null },
                                // categoriaVisita necessario per match tipoVisitaMDL (es. PERIODICA)
                                select: { tipo: true, prestazioneId: true, prezzoBase: true, categoriaVisita: true },
                            },
                        },
                    },
                };
                const now = new Date();
                const tariffAssocsCurrent = await prisma.tariffarioCompanyAssociation.findMany({
                    where: {
                        companyTenantProfileId: { in: companyIds },
                        tenantId: { in: tariffTenantIds },
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
                            tenantId: { in: tariffTenantIds },
                            attivo: true,
                            deletedAt: null,
                        },
                        include: tariffAssocInclude,
                        orderBy: { validoDa: 'desc' },
                    })
                    : [];
                const tariffAssocs = [...tariffAssocsCurrent, ...tariffAssocsFallback];
                // Map: companyTenantProfileId -> voci tariffario (primo tariffario attivo trovato)
                const companyVociMap = new Map();
                for (const assoc of tariffAssocs) {
                    if (!companyVociMap.has(assoc.companyTenantProfileId)) {
                        companyVociMap.set(assoc.companyTenantProfileId, assoc.tariffario?.voci ?? []);
                    }
                }
                // Batch fetch AppuntamentoPrestazione per calcolare anche i prezzi accertamenti
                const appsNeedingIds = appsNeedingTariffario.map(a => a.id);
                const appPrestazioniAll = await prisma.appuntamentoPrestazione.findMany({
                    where: { appuntamentoId: { in: appsNeedingIds }, deletedAt: null },
                    select: { appuntamentoId: true, prestazioneId: true },
                });
                const appPrestazioniMap = new Map();
                for (const ap of appPrestazioniAll) {
                    if (!appPrestazioniMap.has(ap.appuntamentoId)) appPrestazioniMap.set(ap.appuntamentoId, []);
                    appPrestazioniMap.get(ap.appuntamentoId).push(ap.prestazioneId);
                }
                // Calcola prezzo tariffario per ogni appuntamento che ne ha bisogno
                for (const app of appsNeedingTariffario) {
                    const effectiveCompanyId = getEffectiveCompanyId(app);
                    const voci = companyVociMap.get(effectiveCompanyId);
                    if (!voci || voci.length === 0) continue;
                    let total = 0;
                    // Prestazione principale: matcha per tipoVisitaMDL (es. PREVENTIVA, PERIODICA) per prezzi differenziati
                    if (app.prestazioneId) {
                        const voce = matchVoceTariffario(voci, app.prestazioneId, app.tipoVisitaMDL);
                        if (voce) total += Number(voce.prezzoBase);
                    }
                    // Accertamenti (AppuntamentoPrestazione) — nessun tipoVisitaMDL per accertamenti.
                    // Filtra la prestazione principale (app.prestazioneId) per evitare doppio conteggio:
                    // quella viene già sommata nel blocco precedente come prestazione principale.
                    const accertamentiIds = (appPrestazioniMap.get(app.id) ?? [])
                        .filter(pId => pId !== app.prestazioneId);
                    for (const pId of accertamentiIds) {
                        const voce = matchVoceTariffario(voci, pId, null);
                        if (voce) total += Number(voce.prezzoBase);
                    }
                    if (total > 0) tariffarioFallbackMap.set(app.id, total);
                }
            }

            const mdlAppuntamenti = appuntamenti.filter(a => a.tipoVisitaMDL || getEffectiveCompanyId(a));
            const mdlPersonIds = [...new Set(mdlAppuntamenti.map(a => a.pazienteId).filter(Boolean))];
            let companyProfilesMap = new Map();
            let workerMansioniMap = new Map();
            let ultimaVisitaMdlMap = new Map();
            let accertamentiMdlMap = new Map();

            if (mdlAppuntamenti.length > 0) {
                const companyIdsForMdl = [...new Set(mdlAppuntamenti.map(a => getEffectiveCompanyId(a)).filter(Boolean))];
                const [companyProfiles, workerMansioni, ultimeVisite, scadenze] = await Promise.all([
                    companyIdsForMdl.length > 0 ? prisma.companyTenantProfile.findMany({
                        where: {
                            id: { in: companyIdsForMdl },
                            tenantId: effectiveTenantIds.length === 1 ? effectiveTenantIds[0] : { in: effectiveTenantIds },
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            emailGenerale: true,
                            telefonoGenerale: true,
                            company: {
                                select: {
                                    id: true,
                                    ragioneSociale: true,
                                    piva: true,
                                    codiceFiscale: true,
                                    sedeLegaleCitta: true,
                                    sedeLegaleProvincia: true,
                                    sedeLegaleIndirizzo: true,
                                }
                            }
                        }
                    }) : [],
                    mdlPersonIds.length > 0 ? prisma.lavoratoreMansione.findMany({
                        where: {
                            personId: { in: mdlPersonIds },
                            tenantId: effectiveTenantIds.length === 1 ? effectiveTenantIds[0] : { in: effectiveTenantIds },
                            isAttiva: true,
                            deletedAt: null,
                            OR: [{ dataFine: null }, { dataFine: { gte: new Date() } }],
                        },
                        include: {
                            mansione: {
                                select: {
                                    id: true,
                                    denominazione: true,
                                    codice: true,
                                    areaLavoro: true,
                                    rischiAssociati: {
                                        where: { deletedAt: null },
                                        select: {
                                            id: true,
                                            codiceRischio: true,
                                            livello: true,
                                            categoria: true,
                                            periodicitaMesi: true,
                                            descrizioneEsposizione: true,
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: [{ isPrimaria: 'desc' }, { dataInizio: 'desc' }],
                    }) : [],
                    mdlPersonIds.length > 0 ? prisma.visita.findMany({
                        where: {
                            tenantId: effectiveTenantIds.length === 1 ? effectiveTenantIds[0] : { in: effectiveTenantIds },
                            pazienteId: { in: mdlPersonIds },
                            tipoVisitaMDL: { not: null },
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            pazienteId: true,
                            dataOra: true,
                            tipoVisitaMDL: true,
                            prestazione: { select: { id: true, nome: true, codice: true } },
                        },
                        orderBy: { dataOra: 'desc' },
                    }) : [],
                    mdlPersonIds.length > 0 ? prisma.scadenzaPrestazioneProtocollo.findMany({
                        where: {
                            tenantId: effectiveTenantIds.length === 1 ? effectiveTenantIds[0] : { in: effectiveTenantIds },
                            personId: { in: mdlPersonIds },
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            personId: true,
                            prestazioneId: true,
                            dataScadenza: true,
                            dataEsecuzione: true,
                            periodicitaMesi: true,
                            eseguita: true,
                        },
                        orderBy: [{ dataScadenza: 'asc' }],
                        take: 500,
                    }) : [],
                ]);

                companyProfilesMap = new Map((companyProfiles || []).map(profile => [profile.id, {
                    id: profile.id,
                    ragioneSociale: profile.company?.ragioneSociale || '',
                    piva: profile.company?.piva || '',
                    codiceFiscale: profile.company?.codiceFiscale || '',
                    citta: profile.company?.sedeLegaleCitta || '',
                    provincia: profile.company?.sedeLegaleProvincia || '',
                    indirizzo: profile.company?.sedeLegaleIndirizzo || '',
                    email: profile.emailGenerale || '',
                    telefono: profile.telefonoGenerale || '',
                    companyId: profile.company?.id,
                }]));

                for (const wm of workerMansioni || []) {
                    if (!workerMansioniMap.has(wm.personId)) workerMansioniMap.set(wm.personId, []);
                    workerMansioniMap.get(wm.personId).push({
                        id: wm.id,
                        isPrimaria: wm.isPrimaria,
                        dataInizio: wm.dataInizio,
                        dataFine: wm.dataFine,
                        mansione: {
                            id: wm.mansione.id,
                            denominazione: wm.mansione.denominazione,
                            codice: wm.mansione.codice,
                            areaLavoro: wm.mansione.areaLavoro,
                            rischi: wm.mansione.rischiAssociati,
                        },
                    });
                }

                for (const visita of ultimeVisite || []) {
                    if (!ultimaVisitaMdlMap.has(visita.pazienteId)) {
                        ultimaVisitaMdlMap.set(visita.pazienteId, visita);
                    }
                }

                const scadenzePrestazioneIds = [...new Set((scadenze || []).map(s => s.prestazioneId).filter(Boolean))];
                const scadenzePrestazioni = scadenzePrestazioneIds.length > 0
                    ? await prisma.prestazione.findMany({
                        where: {
                            id: { in: scadenzePrestazioneIds },
                            tenantId: effectiveTenantIds.length === 1 ? effectiveTenantIds[0] : { in: effectiveTenantIds },
                            deletedAt: null,
                        },
                        select: { id: true, nome: true, codice: true },
                    })
                    : [];
                const scadenzePrestazioniMap = new Map(scadenzePrestazioni.map(p => [p.id, p]));
                for (const scadenza of scadenze || []) {
                    if (!accertamentiMdlMap.has(scadenza.personId)) accertamentiMdlMap.set(scadenza.personId, []);
                    accertamentiMdlMap.get(scadenza.personId).push({
                        ...scadenza,
                        prestazione: scadenza.prestazioneId ? scadenzePrestazioniMap.get(scadenza.prestazioneId) || null : null,
                    });
                }
            }

            // Aggiungi dati a ciascun appuntamento
            for (const app of appuntamenti) {
                app.paziente = pazientiMap.get(app.pazienteId) || null;
                app.medico = mediciMap.get(app.medicoId) || null;
                app.companyTenantProfileId = app.companyTenantProfileId || getEffectiveCompanyId(app);
                app._companyProfile = app.companyTenantProfileId ? companyProfilesMap.get(app.companyTenantProfileId) || null : null;
                app._workerMansioni = workerMansioniMap.get(app.pazienteId) || [];
                app._rischiLavorativi = flattenWorkerMansioni((workerMansioniMap.get(app.pazienteId) || []).map(wm => ({
                    ...wm,
                    mansione: {
                        ...wm.mansione,
                        rischiAssociati: wm.mansione.rischi || [],
                    }
                })));
                app._ultimaVisitaMdl = ultimaVisitaMdlMap.get(app.pazienteId) || null;
                app._accertamentiMdl = accertamentiMdlMap.get(app.pazienteId) || [];

                // P59: Prezzo tariffario contrattuale (fonte di verità per la visualizzazione nel calendario)
                // Ha priorità su _prezzoTotaleMovimenti perché riflette l'accordo tariffario corretto
                const tariffFallback = tariffarioFallbackMap.get(app.id);
                if (tariffFallback != null && tariffFallback > 0) {
                    app._prezzoTariffarioPrestazione = tariffFallback;
                }
                // Prezzo totale movimenti contabili (riferimento billing/fatturazione)
                const totMovimenti = movimentiTotali.get(app.id);
                if (totMovimenti != null && totMovimenti > 0) {
                    app._prezzoTotaleMovimenti = totMovimenti;
                }

                const consensi = app.pazienteId ? validConsensiByPaziente.get(app.pazienteId) : null;
                app._consensiMdlValidi = !!(app.tipoVisitaMDL && consensi?.has('gdpr') && consensi?.has('sanitari'));

                // P61: Aggiungi numero coda se presente
                const queueEntry = queueEntriesMap.get(app.id);
                if (queueEntry) {
                    app.numeroCoda = queueEntry.numero;
                    app.displayNumberCoda = queueEntry.displayNumber;
                    app.queueEntryId = queueEntry.id; // Per chiamare il paziente (queueApi.callSpecific)
                    app.queueEntryStato = queueEntry.stato;
                    app.queueSessionId = queueEntry.sessionId; // Per mostrare pulsanti coda nel tooltip
                }

                // Aggiungi visita (id + stato) se presente
                const visita = visitaMap.get(app.id);
                if (visita) {
                    app.visita = { id: visita.id, stato: visita.stato };
                }

                // Arricchisci le condizioni della convenzione con i dati del codice sconto
                if (app.convenzione?.condizioni?.codiceSconto) {
                    const codiceSconto = codiciScontoMap.get(app.convenzione.condizioni.codiceSconto);
                    if (codiceSconto) {
                        // Aggiungi i dati dello sconto alle condizioni
                        app.convenzione.condizioni = {
                            ...app.convenzione.condizioni,
                            scontoInfo: {
                                tipo: codiceSconto.tipoSconto,
                                valore: Number(codiceSconto.valore)
                            }
                        };
                    }
                }

                computeAppointmentPriceSummary(app, {
                    tariffarioTotal: app._prezzoTariffarioPrestazione || null,
                });
            }

            return {
                data: appuntamenti,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get appuntamenti', {
                component: 'appuntamento-service',
                action: 'getAll',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get today's appointments (agenda view)
     */
    static async getAgendaGiornaliera(tenantId, date = new Date(), options = {}) {
        try {
            const { medicoId, ambulatorioId } = options;

            // CRITICAL FIX: Use UTC methods to avoid timezone shift bug
            const inputDate = new Date(date);
            const year = inputDate.getUTCFullYear();
            const month = inputDate.getUTCMonth();
            const day = inputDate.getUTCDate();
            const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

            const where = {
                tenantId,
                deletedAt: null,
                dataOra: { gte: startOfDay, lte: endOfDay },
                ...(medicoId && { medicoId }),
                ...(ambulatorioId && { ambulatorioId })
            };

            const appuntamenti = await prisma.appuntamento.findMany({
                where,
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            piano: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            prezzoBase: true,
                            durataPrevista: true
                        }
                    },
                    convenzione: {
                        select: {
                            id: true,
                            nome: true,
                            codice: true,
                            condizioni: true
                        }
                    }
                },
                orderBy: { dataOra: 'asc' }
            });

            // Carica paziente e medico
            const pazienteIds = [...new Set(appuntamenti.map(a => a.pazienteId))];
            const medicoIds = [...new Set(appuntamenti.map(a => a.medicoId))];

            // P63: Person non ha tenantId — filtra via tenantProfiles.some
            // P48: phone/email sono in PersonTenantProfile, non su Person
            const [pazienti, medici] = await Promise.all([
                prisma.person.findMany({
                    where: { id: { in: pazienteIds }, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } },
                    select: {
                        id: true, firstName: true, lastName: true,
                        tenantProfiles: { where: { tenantId }, select: { phone: true, email: true }, take: 1 }
                    }
                }),
                prisma.person.findMany({
                    where: { id: { in: medicoIds }, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } },
                    select: { id: true, firstName: true, lastName: true }
                })
            ]);
            const pazientiMap = new Map(pazienti.map(p => {
                const profile = p.tenantProfiles?.[0] || {};
                return [p.id, { id: p.id, firstName: p.firstName, lastName: p.lastName, phone: profile.phone || null, email: profile.email || null }];
            }));
            const mediciMap = new Map(medici.map(m => [m.id, m]));

            for (const app of appuntamenti) {
                app.paziente = pazientiMap.get(app.pazienteId) || null;
                app.medico = mediciMap.get(app.medicoId) || null;
            }

            // Group by hour for agenda view
            const agendaByHour = {};
            appuntamenti.forEach(app => {
                const hour = app.dataOra.getHours();
                if (!agendaByHour[hour]) {
                    agendaByHour[hour] = [];
                }
                agendaByHour[hour].push(app);
            });

            return {
                date: startOfDay.toISOString().split('T')[0],
                totalAppuntamenti: appuntamenti.length,
                appuntamenti,
                agendaByHour
            };
        } catch (error) {
            logger.error('Failed to get agenda giornaliera', {
                component: 'appuntamento-service',
                action: 'getAgendaGiornaliera',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update appointment status
     */
    static async updateStato(id, stato, tenantId, additionalData = {}) {
        try {
            const existing = await prisma.appuntamento.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Appuntamento not found');
            }

            if (stato === 'ANNULLATO') {
                const error = new Error('Per annullare una prenotazione usare eliminazione appuntamento con motivo. NO_SHOW resta uno stato visibile distinto.');
                error.statusCode = 400;
                throw error;
            }

            const updateData = {
                stato,
                updatedAt: new Date()
            };
            const statusReason = (
                additionalData.motivoAnnullamento ||
                additionalData.motivo ||
                (stato === 'NO_SHOW' ? 'Paziente non presentato senza preavviso' : null)
            );

            // Handle specific state transitions (solo campi esistenti nello schema)
            switch (stato) {
                case 'ARRIVATO':
                case 'IN_ATTESA':
                    updateData.oraArrivo = new Date();
                    break;
                case 'CHIAMATO':
                    updateData.oraChiamata = new Date();
                    break;
                case 'IN_CORSO':
                    updateData.oraInizio = new Date();
                    break;
                case 'COMPLETATO':
                    updateData.oraFine = new Date();
                    // Se c'era pagamento anticipato, passa direttamente a FATTURATO
                    if (existing.pagamentoAnticipato) {
                        updateData.stato = 'FATTURATO';
                        stato = 'FATTURATO'; // Aggiorna la variabile per il log
                    }
                    break;
                case 'FATTURATO':
                    // Stato finale: appuntamento pagato
                    if (!updateData.oraFine) {
                        updateData.oraFine = new Date();
                    }
                    break;
                case 'NO_SHOW':
                    updateData.motivoAnnullamento = statusReason;
                    break;
            }

            const updated = await prisma.appuntamento.update({
                where: { id },
                data: updateData,
                include: {
                    ambulatorio: {
                        select: { id: true, nome: true }
                    },
                    prestazione: {
                        select: { id: true, nome: true }
                    },
                    // P54: Include slots per trovare disponibilitaMedicoId
                    slots: {
                        where: { deletedAt: null },
                        select: { id: true },
                        take: 1
                    }
                }
            });

            // P48: Carica paziente e medico - Person non ha tenantId diretto
            const [paziente, medico] = await Promise.all([
                prisma.person.findFirst({
                    where: {
                        id: updated.pazienteId,
                        deletedAt: null,
                        tenantProfiles: { some: { tenantId, deletedAt: null } }
                    },
                    select: { id: true, firstName: true, lastName: true }
                }),
                prisma.person.findFirst({
                    where: {
                        id: updated.medicoId,
                        deletedAt: null,
                        tenantProfiles: { some: { tenantId, deletedAt: null } }
                    },
                    select: { id: true, firstName: true, lastName: true }
                })
            ]);

            updated.paziente = paziente;
            updated.medico = medico;

            // P59: quando l'appuntamento viene annullato, annulla anche tutti i MovimentoContabile
            // in stato BOZZA o DA_FATTURARE collegati (importo non ancora fatturato)
            if (stato === 'ANNULLATO') {
                await prisma.movimentoContabile.updateMany({
                    where: {
                        appuntamentoId: id,
                        tenantId,
                        stato: { in: ['BOZZA', 'PREVENTIVO', 'DA_FATTURARE'] },
                        deletedAt: null,
                    },
                    data: {
                        stato: 'ANNULLATO',
                        deletedAt: new Date(),
                        note: 'Annullato automaticamente per annullamento appuntamento',
                    },
                });

                // P56: MDL - libera le ScadenzaPrestazioneProtocollo collegate all'appuntamento
                // così tornano visibili come scadenze aperte da riprogrammare
                await prisma.scadenzaPrestazioneProtocollo.updateMany({
                    where: { appuntamentoId: id, tenantId, deletedAt: null },
                    data: { appuntamentoId: null, dataEsecuzione: null },
                });
            }

            // P70: NO_SHOW / RINVIATO — cancella BOZZA movimenti contabili e libera scadenze MDL
            // (il paziente non si è presentato o la visita è rinviata — le BOZZA non devono rimanere)
            if (stato === 'NO_SHOW' || stato === 'RINVIATO') {
                await prisma.movimentoContabile.updateMany({
                    where: {
                        appuntamentoId: id,
                        tenantId,
                        stato: { in: ['BOZZA', 'PREVENTIVO', 'DA_FATTURARE'] },
                        deletedAt: null,
                    },
                    data: {
                        stato: 'ANNULLATO',
                        deletedAt: new Date(),
                        note: `Annullato automaticamente per stato ${stato}`,
                    },
                });

                // MDL: libera le ScadenzaPrestazioneProtocollo collegate così tornano come aperte
                await prisma.scadenzaPrestazioneProtocollo.updateMany({
                    where: { appuntamentoId: id, tenantId, deletedAt: null },
                    data: { appuntamentoId: null, dataEsecuzione: null },
                });

                logger.info('P70: movimenti BOZZA annullati e scadenze liberate per stato ' + stato, {
                    component: 'appuntamento-service',
                    action: 'no-show-rinviato-billing',
                    appuntamentoId: id,
                    stato,
                    tenantId,
                });
            }

            // P70: accettazione paziente NON-MDL → BOZZA movimenti contabili
            if ((stato === 'IN_ATTESA' || stato === 'ARRIVATO') && !existing.tipoVisitaMDL) {
                setImmediate(async () => {
                    try {
                        await MovimentoContabileGenerator.generaPerAccettazionePaziente(
                            {
                                id: existing.id,
                                pazienteId: existing.pazienteId,
                                medicoId: existing.medicoId,
                                prestazioneId: existing.prestazioneId || null,
                                dataOra: existing.dataOra,
                                companyTenantProfileId: existing.companyTenantProfileId || null,
                            },
                            tenantId,
                            id
                        );
                    } catch (billingErr) {
                        logger.error('generaPerAccettazionePaziente failed (non-blocking)', {
                            component: 'appuntamento-service',
                            action: 'accettazione-bozza',
                            appuntamentoId: id,
                            error: billingErr.message,
                        });
                    }
                });
            }

            logger.info('Appuntamento stato updated', {
                component: 'appuntamento-service',
                action: 'updateStato',
                appuntamentoId: id,
                oldStato: existing.stato,
                newStato: stato,
                updatedBy: additionalData.updatedBy || null,
                tenantId
            });

            await prisma.gdprAuditLog.create({
                data: {
                    tenantId,
                    personId: additionalData.updatedBy || null,
                    resourceType: 'Appuntamento',
                    resourceId: id,
                    action: 'UPDATE',
                    dataAccessed: {
                        operation: 'STATUS_CHANGE',
                        oldStato: existing.stato,
                        newStato: stato,
                        reason: statusReason,
                        visibleRecord: stato === 'NO_SHOW',
                        pazienteId: existing.pazienteId,
                        medicoId: existing.medicoId
                    },
                    ipAddress: additionalData.ipAddress || null,
                    userAgent: additionalData.userAgent || null
                }
            }).catch(err => logger.warn('GdprAuditLog appuntamento status failed', {
                component: 'appuntamento-service',
                action: 'status_audit',
                error: err.message,
                appuntamentoId: id,
                tenantId
            }));

            // Project 47 - Emit domain event for notification system
            const eventType = AppointmentEvents.STATUS_CHANGED;

            await EventBus.publish({
                type: eventType,
                payload: {
                    appuntamentoId: id,
                    numeroPrenotazione: updated.numeroPrenotazione,
                    pazienteId: updated.pazienteId,
                    pazienteNome: paziente ? `${paziente.firstName} ${paziente.lastName}` : null,
                    medicoId: updated.medicoId,
                    medicoNome: medico ? `${medico.firstName} ${medico.lastName}` : null,
                    oldStato: existing.stato,
                    newStato: stato,
                    dataOra: updated.dataOra,
                    tenantId
                },
                aggregateType: 'Appuntamento',
                aggregateId: id,
                metadata: { tenantId }
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update appuntamento stato', {
                component: 'appuntamento-service',
                action: 'updateStato',
                error: error.message,
                id,
                stato,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Registra il pagamento per un appuntamento
     * Gestisce sia il pagamento anticipato che quello post-visita
     * 
     * @param {string} id - ID dell'appuntamento
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object>} Appuntamento aggiornato
     */
    static async registraPagamento(id, tenantId) {
        try {
            const existing = await prisma.appuntamento.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Appuntamento not found');
            }

            const updateData = {
                pagamentoDataOra: new Date(),
                updatedAt: new Date()
            };

            // Logica del pagamento in base allo stato corrente
            switch (existing.stato) {
                case 'PRENOTATO':
                case 'CONFERMATO':
                case 'IN_ATTESA':
                case 'IN_CORSO':
                    // Pagamento anticipato - non cambia lo stato, solo flag
                    updateData.pagamentoAnticipato = true;
                    break;
                case 'COMPLETATO':
                    // Pagamento post-visita - cambia in FATTURATO
                    updateData.stato = 'FATTURATO';
                    break;
                case 'FATTURATO':
                    // Già fatturato, niente da fare
                    throw new Error('Appuntamento già fatturato');
                default:
                    throw new Error(`Impossibile registrare pagamento in stato ${existing.stato}`);
            }

            const updated = await prisma.appuntamento.update({
                where: { id },
                data: updateData,
                include: {
                    ambulatorio: { select: { id: true, nome: true } },
                    prestazione: { select: { id: true, nome: true } }
                }
            });

            // Log del pagamento
            logger.info('Pagamento registrato', {
                component: 'appuntamento-service',
                action: 'registraPagamento',
                appuntamentoId: id,
                statoOriginale: existing.stato,
                nuovoStato: updated.stato,
                pagamentoAnticipato: updateData.pagamentoAnticipato || false,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to register payment', {
                component: 'appuntamento-service',
                action: 'registraPagamento',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update appointment
     */
    static async update(id, data, tenantId) {
        try {
            const existing = await prisma.appuntamento.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Appuntamento not found');
            }

            // If rescheduling, check for conflicts
            if (data.dataOra && data.dataOra !== existing.dataOra) {
                const conflicts = await this.checkConflicts(
                    data.medicoId || existing.medicoId,
                    data.ambulatorioId || existing.ambulatorioId,
                    new Date(data.dataOra),
                    data.durataMinuti || existing.durataMinuti,
                    tenantId,
                    id // Exclude self
                );

                if (conflicts.length > 0) {
                    throw new Error(`Rescheduling conflicts with existing appointments`);
                }
            }

            // Filter only valid database fields to avoid Prisma errors
            const validFields = [
                'ambulatorioId', 'prestazioneId', 'pazienteId', 'medicoId',
                'dataOra', 'durataMinuti', 'stato', 'isOverbooking',
                'note', 'noteInterne', 'convenzioneId',
                'companyTenantProfileId', 'tipoVisitaMDL',
                'promemoriaSms', 'promemoriaEmail', 'promemoriaInviato',
                'oraArrivo', 'oraChiamata', 'oraInizio', 'oraFine'
            ];
            const filteredData = {};
            for (const key of validFields) {
                if (data[key] !== undefined) {
                    filteredData[key] = data[key];
                }
            }

            const updated = await prisma.appuntamento.update({
                where: { id },
                data: {
                    ...filteredData,
                    updatedAt: new Date()
                },
                include: {
                    ambulatorio: {
                        select: { id: true, nome: true }
                    },
                    prestazione: {
                        select: { id: true, nome: true }
                    }
                }
            });

            // P48: Carica paziente e medico - Person non ha tenantId diretto
            const [paziente, medico] = await Promise.all([
                prisma.person.findFirst({
                    where: {
                        id: updated.pazienteId,
                        deletedAt: null,
                        tenantProfiles: { some: { tenantId, deletedAt: null } }
                    },
                    select: { id: true, firstName: true, lastName: true }
                }),
                prisma.person.findFirst({
                    where: {
                        id: updated.medicoId,
                        deletedAt: null,
                        tenantProfiles: { some: { tenantId, deletedAt: null } }
                    },
                    select: { id: true, firstName: true, lastName: true }
                })
            ]);

            updated.paziente = paziente;
            updated.medico = medico;

            logger.info('Appuntamento updated', {
                component: 'appuntamento-service',
                action: 'update',
                appuntamentoId: id,
                tenantId
            });

            // Project 47 - Emit domain event for notification system
            // Check if it's a reschedule (date changed)
            const isRescheduled = data.dataOra && new Date(data.dataOra).getTime() !== new Date(existing.dataOra).getTime();
            const eventType = isRescheduled ? AppointmentEvents.RESCHEDULED : AppointmentEvents.UPDATED;

            // P70: Trigger modifiche per appuntamenti MDL (reschedule, cambio prestazione, cambio medico)
            if (updated.tipoVisitaMDL && updated.companyTenantProfileId) {
                const isPrestazioneChanged = data.prestazioneId && data.prestazioneId !== existing.prestazioneId;
                const isMedicoChanged = data.medicoId && data.medicoId !== existing.medicoId;
                const isCompanyChanged = data.companyTenantProfileId && data.companyTenantProfileId !== existing.companyTenantProfileId;
                const isTipoMdlChanged = data.tipoVisitaMDL && data.tipoVisitaMDL !== existing.tipoVisitaMDL;
                const isMdlActivated = !existing.tipoVisitaMDL || !existing.companyTenantProfileId;
                const needsBillingUpdate = isRescheduled || isPrestazioneChanged || isMedicoChanged || isCompanyChanged || isTipoMdlChanged || isMdlActivated;

                if (isRescheduled) {
                    // Re-linka le ScadenzaPrestazioneProtocollo alla nuova data ±60 giorni
                    setImmediate(async () => {
                        try {
                            const TIPI_RECONCILE = ['PREVENTIVA', 'PREVENTIVA_PREASSUNTIVA', 'PERIODICA'];
                            if (TIPI_RECONCILE.includes(existing.tipoVisitaMDL)) {
                                // 1. Rilascia il vecchio collegamento
                                await prisma.scadenzaPrestazioneProtocollo.updateMany({
                                    where: { appuntamentoId: id, tenantId, deletedAt: null },
                                    data: { appuntamentoId: null, dataEsecuzione: null },
                                });

                                // 2. Cerca e collega scadenze nel nuovo range ±60 giorni
                                const newDataOra = new Date(data.dataOra);
                                const minus60 = new Date(newDataOra);
                                minus60.setDate(minus60.getDate() - 60);
                                const plus60 = new Date(newDataOra);
                                plus60.setDate(plus60.getDate() + 60);

                                await prisma.scadenzaPrestazioneProtocollo.updateMany({
                                    where: {
                                        personId: existing.pazienteId,
                                        tenantId,
                                        eseguita: false,
                                        deletedAt: null,
                                        appuntamentoId: null,
                                        dataScadenza: { gte: minus60, lte: plus60 },
                                    },
                                    data: { appuntamentoId: id, dataEsecuzione: newDataOra },
                                });

                                logger.info('P70: ScadenzaPrestazioneProtocollo re-linked after reschedule', {
                                    component: 'appuntamento-service',
                                    action: 'reschedule-scadenze',
                                    appuntamentoId: id,
                                    tenantId,
                                });
                            }
                        } catch (err) {
                            logger.error('P70 reschedule scadenze re-link failed (non-blocking)', {
                                component: 'appuntamento-service',
                                action: 'reschedule-scadenze',
                                error: err.message,
                                appuntamentoId: id,
                            });
                        }
                    });
                }

                if (needsBillingUpdate) {
                    // Invalida BOZZA correnti e rigenera movimenti contabili MDL
                    setImmediate(async () => {
                        try {
                            // Invalida BOZZA esistenti collegati all'appuntamento (soft-delete)
                            await prisma.movimentoContabile.updateMany({
                                where: {
                                    appuntamentoId: id,
                                    tenantId,
                                    stato: 'BOZZA',
                                    deletedAt: null,
                                },
                                data: {
                                    stato: 'ANNULLATO',
                                    deletedAt: new Date(),
                                    note: 'Annullato automaticamente per modifica appuntamento MDL',
                                },
                            });

                            // Rigenera con i dati aggiornati
                            await MovimentoContabileGenerator.generaPerAppuntamentoMDL(
                                {
                                    id,
                                    pazienteId: existing.pazienteId,
                                    medicoId: data.medicoId || existing.medicoId,
                                    prestazioneId: data.prestazioneId || existing.prestazioneId,
                                    tipoVisitaMDL: updated.tipoVisitaMDL,
                                    dataOra: data.dataOra || existing.dataOra,
                                    companyTenantProfileId: updated.companyTenantProfileId,
                                },
                                tenantId,
                                id
                            );

                            logger.info('P70: BOZZA movimenti MDL rigenerati dopo modifica appuntamento', {
                                component: 'appuntamento-service',
                                action: 'update-bozza-mdl',
                                appuntamentoId: id,
                                isRescheduled,
                                isPrestazioneChanged,
                                isMedicoChanged,
                                tenantId,
                            });
                        } catch (err) {
                            logger.error('P70 update MDL movimenti failed (non-blocking)', {
                                component: 'appuntamento-service',
                                action: 'update-bozza-mdl',
                                error: err.message,
                                appuntamentoId: id,
                            });
                        }
                    });
                }
            }

            await EventBus.publish(eventType, {
                appuntamentoId: id,
                numeroPrenotazione: updated.numeroPrenotazione,
                pazienteId: updated.pazienteId,
                pazienteNome: paziente ? `${paziente.firstName} ${paziente.lastName}` : null,
                medicoId: updated.medicoId,
                medicoNome: medico ? `${medico.firstName} ${medico.lastName}` : null,
                oldDataOra: existing.dataOra,
                newDataOra: updated.dataOra,
                isRescheduled,
                tenantId
            });

            return updated;
        } catch (error) {
            logger.error('Failed to update appuntamento', {
                component: 'appuntamento-service',
                action: 'update',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Soft delete appointment
     */
    static async delete(id, tenantId, { deletionReason, deletedBy, ipAddress = null, userAgent = null } = {}) {
        try {
            const normalizedDeletionReason = typeof deletionReason === 'string' ? deletionReason.trim() : '';
            if (normalizedDeletionReason.length < 10) {
                const error = new Error('deletionReason obbligatorio (minimo 10 caratteri)');
                error.statusCode = 400;
                throw error;
            }

            const existing = await prisma.appuntamento.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Appuntamento not found');
            }

            // P48: Carica paziente per notifica - email in tenantProfiles
            const paziente = await prisma.person.findFirst({
                where: {
                    id: existing.pazienteId,
                    deletedAt: null,
                    tenantProfiles: { some: { tenantId, deletedAt: null } }
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    tenantProfiles: {
                        where: { tenantId, deletedAt: null },
                        select: { email: true },
                        take: 1
                    }
                }
            });

            // P48: Flatten email
            const pazienteFlattened = paziente ? {
                ...paziente,
                email: paziente.tenantProfiles?.[0]?.email || null,
                tenantProfiles: undefined
            } : null;

            await prisma.appuntamento.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            // Annulla tutti i movimenti contabili associati (BOZZA/PREVENTIVO/DA_FATTURARE → ANNULLATO + soft-delete)
            await prisma.movimentoContabile.updateMany({
                where: {
                    appuntamentoId: id,
                    tenantId,
                    stato: { in: ['BOZZA', 'PREVENTIVO', 'DA_FATTURARE'] },
                    deletedAt: null,
                },
                data: {
                    stato: 'ANNULLATO',
                    deletedAt: new Date(),
                    note: 'Annullato automaticamente per eliminazione appuntamento',
                },
            });

            // P56: MDL - libera le ScadenzaPrestazioneProtocollo collegate (appuntamento eliminato)
            await prisma.scadenzaPrestazioneProtocollo.updateMany({
                where: { appuntamentoId: id, tenantId, deletedAt: null },
                data: { appuntamentoId: null, dataEsecuzione: null },
            });

            // P70: Coda Pazienti — segna NumeroChiamata come NON_PRESENTATO (numero rimane occupato)
            await prisma.numeroChiamata.updateMany({
                where: {
                    appuntamentoId: id,
                    tenantId,
                    deletedAt: null,
                    stato: { notIn: ['COMPLETATO'] },
                },
                data: {
                    stato: 'NON_PRESENTATO',
                    note: 'Appuntamento eliminato',
                },
            });

            await prisma.gdprAuditLog.create({
                data: {
                    tenantId,
                    personId: deletedBy || null,
                    resourceType: 'Appuntamento',
                    resourceId: id,
                    action: 'DELETE',
                    dataAccessed: {
                        deletionReason: normalizedDeletionReason,
                        deletedBy: deletedBy || null,
                        pazienteId: existing.pazienteId,
                        medicoId: existing.medicoId,
                        dataOra: existing.dataOra,
                        operation: 'SOFT_DELETE'
                    },
                    ipAddress,
                    userAgent
                }
            }).catch(err => logger.warn('GdprAuditLog appuntamento delete failed', {
                component: 'appuntamento-service',
                action: 'delete_audit',
                error: err.message,
                appuntamentoId: id,
                tenantId
            }));

            logger.info('Appuntamento deleted', {
                component: 'appuntamento-service',
                action: 'delete',
                appuntamentoId: id,
                deletedBy,
                tenantId
            });

            // Project 47 - Emit domain event for notification system (cancelled)
            await EventBus.publish(AppointmentEvents.CANCELLED, {
                appuntamentoId: id,
                numeroPrenotazione: existing.numeroPrenotazione,
                pazienteId: existing.pazienteId,
                pazienteNome: pazienteFlattened ? `${pazienteFlattened.firstName} ${pazienteFlattened.lastName}` : null,
                pazienteEmail: pazienteFlattened?.email,
                medicoId: existing.medicoId,
                dataOra: existing.dataOra,
                reason: normalizedDeletionReason,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete appuntamento', {
                component: 'appuntamento-service',
                action: 'delete',
                error: error.message,
                id,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check for scheduling conflicts
     * Conflicts are only detected for the same ambulatorio (physical space)
     * A doctor can have appointments in different ambulatori at the same time
     */
    static async checkConflicts(medicoId, ambulatorioId, dataOra, durata, tenantId, excludeId = null) {
        try {
            const startTime = new Date(dataOra);
            const endTime = new Date(startTime.getTime() + durata * 60000);

            // CRITICAL FIX: Use UTC methods to avoid timezone shift bug
            // Previous bug: setHours(0,0,0,0) on UTC date shifts to previous day in UTC+1
            const year = startTime.getUTCFullYear();
            const month = startTime.getUTCMonth();
            const day = startTime.getUTCDate();
            const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

            // Log input parameters for debugging
            logger.debug('checkConflicts called', {
                component: 'appuntamento-service',
                action: 'checkConflicts',
                input: {
                    medicoId,
                    ambulatorioId,
                    dataOra: startTime.toISOString(),
                    durata,
                    tenantId,
                    excludeId
                },
                range: {
                    newStart: startTime.toISOString(),
                    newEnd: endTime.toISOString(),
                    dayStart: dayStart.toISOString(),
                    dayEnd: dayEnd.toISOString()
                }
            });

            // Find overlapping appointments for same medico AND same ambulatorio on same day
            // Overbooking is defined as same doctor in same room at same time
            const whereClause = {
                tenantId,
                deletedAt: null,
                stato: { notIn: ['ANNULLATO', 'COMPLETATO', 'NO_SHOW', 'FATTURATO'] },
                medicoId, // Same medico
                ambulatorioId, // AND same ambulatorio
                dataOra: {
                    gte: dayStart, // Same day lower bound
                    lte: dayEnd    // Same day upper bound
                }
            };

            if (excludeId) {
                whereClause.id = { not: excludeId };
            }

            const conflicts = await prisma.appuntamento.findMany({
                where: whereClause,
                select: {
                    id: true,
                    numeroPrenotazione: true,
                    dataOra: true,
                    durataMinuti: true,
                    medicoId: true,
                    ambulatorioId: true,
                    stato: true,
                    oraInizio: true,
                    oraFine: true
                }
            });

            // Log ALL appointments found in the day for this medico+ambulatorio
            logger.debug('checkConflicts - appointments found on same day', {
                component: 'appuntamento-service',
                action: 'checkConflicts',
                totalFound: conflicts.length,
                appointments: conflicts.map(app => ({
                    id: app.id,
                    numeroPrenotazione: app.numeroPrenotazione,
                    dataOra: app.dataOra,
                    durataMinuti: app.durataMinuti,
                    stato: app.stato
                }))
            });

            // Filter actual conflicts (overlapping time ranges)
            // If the appointment has already started (oraInizio set), use actual visit times
            // instead of booking time to avoid false overbooking on rescheduled visits
            const actualConflicts = conflicts.filter(app => {
                const appStart = app.oraInizio ? new Date(app.oraInizio) : new Date(app.dataOra);
                const appEnd = app.oraFine
                    ? new Date(app.oraFine)
                    : new Date(appStart.getTime() + (app.durataMinuti || 30) * 60000);
                const isOverlapping = (startTime < appEnd && endTime > appStart);

                logger.debug('checkConflicts - checking appointment overlap', {
                    component: 'appuntamento-service',
                    action: 'checkConflicts',
                    existing: {
                        id: app.id,
                        numeroPrenotazione: app.numeroPrenotazione,
                        usingActualTime: !!app.oraInizio,
                        start: appStart.toISOString(),
                        end: appEnd.toISOString(),
                        durataMinuti: app.durataMinuti
                    },
                    new: {
                        start: startTime.toISOString(),
                        end: endTime.toISOString()
                    },
                    isOverlapping
                });

                return isOverlapping;
            });

            logger.debug('checkConflicts - result', {
                component: 'appuntamento-service',
                action: 'checkConflicts',
                totalConflicts: actualConflicts.length,
                conflictIds: actualConflicts.map(c => c.id)
            });

            return actualConflicts;
        } catch (error) {
            logger.error('Failed to check conflicts', {
                component: 'appuntamento-service',
                action: 'checkConflicts',
                error: error.message,
                medicoId,
                ambulatorioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get waiting queue
     */
    static async getWaitingQueue(tenantId, ambulatorioId = null) {
        try {
            // CRITICAL FIX: Use UTC methods for date boundaries
            const now = new Date();
            const year = now.getUTCFullYear();
            const month = now.getUTCMonth();
            const day = now.getUTCDate();
            const today = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

            // Lo schema non ha numeroCoda, usiamo stato e oraArrivo per ordinare
            const where = {
                tenantId,
                deletedAt: null,
                dataOra: { gte: today },
                stato: { in: ['ARRIVATO', 'IN_ATTESA'] },
                oraArrivo: { not: null }
            };

            if (ambulatorioId) {
                where.ambulatorioId = ambulatorioId;
            }

            const queue = await prisma.appuntamento.findMany({
                where,
                include: {
                    ambulatorio: {
                        select: {
                            id: true,
                            nome: true,
                            piano: true
                        }
                    },
                    prestazione: {
                        select: {
                            id: true,
                            nome: true
                        }
                    }
                },
                orderBy: { oraArrivo: 'asc' }
            });

            // Carica paziente e medico
            const pazienteIds = [...new Set(queue.map(a => a.pazienteId))];
            const medicoIds = [...new Set(queue.map(a => a.medicoId))];

            // P63: Person non ha tenantId — filtra via tenantProfiles.some
            const [pazienti, medici] = await Promise.all([
                prisma.person.findMany({
                    where: { id: { in: pazienteIds }, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } },
                    select: { id: true, firstName: true, lastName: true }
                }),
                prisma.person.findMany({
                    where: { id: { in: medicoIds }, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } },
                    select: { id: true, firstName: true, lastName: true }
                })
            ]);

            const pazientiMap = new Map(pazienti.map(p => [p.id, p]));
            const mediciMap = new Map(medici.map(m => [m.id, m]));

            for (const app of queue) {
                app.paziente = pazientiMap.get(app.pazienteId) || null;
                app.medico = mediciMap.get(app.medicoId) || null;
            }

            return {
                totalInQueue: queue.length,
                queue
            };
        } catch (error) {
            logger.error('Failed to get waiting queue', {
                component: 'appuntamento-service',
                action: 'getWaitingQueue',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Call next patient (update stato to IN_CORSO)
     */
    static async callNextPatient(tenantId, ambulatorioId = null) {
        try {
            // CRITICAL FIX: Use UTC methods for date boundaries
            const now = new Date();
            const year = now.getUTCFullYear();
            const month = now.getUTCMonth();
            const day = now.getUTCDate();
            const today = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

            const where = {
                tenantId,
                deletedAt: null,
                dataOra: { gte: today },
                stato: { in: ['ARRIVATO', 'IN_ATTESA'] },
                oraArrivo: { not: null }
            };

            if (ambulatorioId) {
                where.ambulatorioId = ambulatorioId;
            }

            const nextInQueue = await prisma.appuntamento.findFirst({
                where,
                orderBy: { oraArrivo: 'asc' }
            });

            if (!nextInQueue) {
                return { message: 'No patients in queue' };
            }

            return this.updateStato(nextInQueue.id, 'IN_CORSO', tenantId);
        } catch (error) {
            logger.error('Failed to call next patient', {
                component: 'appuntamento-service',
                action: 'callNextPatient',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Check if patient already has an appointment with the same doctor on the same day
     * Used to warn users before creating potential duplicate bookings
     * @param {string} pazienteId - Patient ID
     * @param {string} medicoId - Doctor ID
     * @param {Date|string} dataOra - Appointment date/time
     * @param {string} tenantId - Tenant ID
     * @param {string} excludeAppuntamentoId - Optional: exclude this appointment ID (for updates)
     * @returns {Promise<{hasDuplicate: boolean, existingAppointments: Array}>}
     */
    static async checkDuplicateBooking(pazienteId, medicoId, dataOra, tenantId, excludeAppuntamentoId = null) {
        try {
            const appointmentDate = new Date(dataOra);

            // CRITICAL FIX: Use UTC methods to avoid timezone shift
            const year = appointmentDate.getUTCFullYear();
            const month = appointmentDate.getUTCMonth();
            const day = appointmentDate.getUTCDate();
            const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

            const where = {
                tenantId,
                pazienteId,
                medicoId,
                deletedAt: null,
                stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
                dataOra: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            };

            // Exclude current appointment when checking for updates
            if (excludeAppuntamentoId) {
                where.id = { not: excludeAppuntamentoId };
            }

            const existingAppointments = await prisma.appuntamento.findMany({
                where,
                select: {
                    id: true,
                    numeroPrenotazione: true,
                    dataOra: true,
                    stato: true,
                    durataMinuti: true,
                    ambulatorio: {
                        select: { nome: true }
                    },
                    prestazione: {
                        select: { nome: true }
                    }
                },
                orderBy: { dataOra: 'asc' }
            });

            const hasDuplicate = existingAppointments.length > 0;

            logger.debug('Duplicate booking check', {
                component: 'appuntamento-service',
                action: 'checkDuplicateBooking',
                pazienteId,
                medicoId,
                date: startOfDay.toISOString().split('T')[0],
                hasDuplicate,
                existingCount: existingAppointments.length
            });

            return {
                hasDuplicate,
                existingAppointments
            };
        } catch (error) {
            logger.error('Failed to check duplicate booking', {
                component: 'appuntamento-service',
                action: 'checkDuplicateBooking',
                error: error.message,
                pazienteId,
                medicoId,
                tenantId
            });
            throw error;
        }
    }
}

export default AppuntamentoService;
