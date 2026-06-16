/**
 * GiudizioIdoneitaService - Gestione Giudizi di Idoneità P56
 * 
 * Gestisce i giudizi di idoneità secondo Art. 41 c.6 D.Lgs 81/08:
 * - IDONEO
 * - IDONEO_CON_PRESCRIZIONI
 * - IDONEO_CON_LIMITAZIONI
 * - NON_IDONEO_TEMPORANEO
 * - NON_IDONEO_PERMANENTE
 * 
 * Include gestione ricorsi (Art. 41 c.9) e tracking scadenze
 * 
 * @module services/clinical/GiudizioIdoneitaService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

const VISITA_MDL_PRESTAZIONE_TIPO = 'VISITA_MEDICINA_LAVORO';

const VISIT_TO_GIUDIZIO_MAP = {
    idoneo: 'IDONEO',
    idoneo_prescrizioni: 'IDONEO_CON_PRESCRIZIONI',
    idoneo_limitazioni: 'IDONEO_CON_LIMITAZIONI',
    idoneo_limitazioni_prescrizioni: 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI',
    temporaneamente_non_idoneo: 'NON_IDONEO_TEMPORANEO',
    non_idoneo: 'NON_IDONEO_PERMANENTE'
};

const GIUDIZIO_TO_VISIT_MAP = {
    IDONEO: 'idoneo',
    IDONEO_CON_PRESCRIZIONI: 'idoneo_prescrizioni',
    IDONEO_CON_LIMITAZIONI: 'idoneo_limitazioni',
    IDONEO_CON_LIMITAZIONI_PRESCRIZIONI: 'idoneo_limitazioni_prescrizioni',
    NON_IDONEO_TEMPORANEO: 'temporaneamente_non_idoneo',
    NON_IDONEO_PERMANENTE: 'non_idoneo'
};

const createHttpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const mdlVisitWhere = (tenantId) => ({
    tenantId,
    deletedAt: null,
    OR: [
        { tipoVisitaMDL: { not: null } },
        { prestazione: { tipo: VISITA_MDL_PRESTAZIONE_TIPO } }
    ]
});

const asTextList = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).map(String).join('\n');
    return value ? String(value) : '';
};

const parseTextList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    return String(value)
        .split(/[\n;,]+/)
        .map(item => item.trim())
        .filter(Boolean);
};

const normalizeDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const mapVisitPrefill = (visita, visitaMdlPrestazioneIds) => {
    const dati = visita?.datiStrutturati || {};
    const giudizio = visita?.giudizioIdoneita;
    const scadenzaVisitaMdl = visita?.scadenzePrestazioni
        ?.filter(scadenza => scadenza.prestazioneId && visitaMdlPrestazioneIds.has(scadenza.prestazioneId))
        .sort((a, b) => new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime())[0];

    return {
        tipoGiudizio: giudizio?.tipoGiudizio || VISIT_TO_GIUDIZIO_MAP[dati.giudizioIdoneitaMdl] || 'IDONEO',
        dataScadenza: giudizio?.dataScadenza || scadenzaVisitaMdl?.dataScadenza || null,
        prescrizioniIdoneita: giudizio?.prescrizioniIdoneita || asTextList(dati.prescrizioniNormativaMdl),
        limitazioni: giudizio?.limitazioni || asTextList(dati.limitazioniMansioneMdl),
        motivazioni: giudizio?.motivazioni || asTextList(dati.tempisticaGiudizioIdoneitaMdl)
    };
};

const mapVisitForForm = (visita, visitaMdlPrestazioneIds) => ({
    id: visita.id,
    dataOra: visita.dataOra,
    stato: visita.stato,
    tipoVisitaMDL: visita.tipoVisitaMDL,
    medicoId: visita.medicoId,
    prestazione: visita.prestazione,
    giudizioIdoneita: visita.giudizioIdoneita,
    isDraft: visita.stato !== 'COMPLETATA',
    prefill: mapVisitPrefill(visita, visitaMdlPrestazioneIds)
});

const buildVisitUpdateFromGiudizio = (data) => ({
    giudizioIdoneitaMdl: GIUDIZIO_TO_VISIT_MAP[data.tipoGiudizio],
    prescrizioniNormativaMdl: parseTextList(data.prescrizioniIdoneita),
    limitazioniMansioneMdl: parseTextList(data.limitazioni),
    tempisticaGiudizioIdoneitaMdl: data.motivazioni || ''
});

/**
 * Service per gestione giudizi di idoneità MDL
 */
const GiudizioIdoneitaService = {
    async getFormData(tenantId, options = {}) {
        const { companyTenantProfileId, personId, search } = options;
        const searchTerm = typeof search === 'string' ? search.trim() : '';
        const baseProfileWhere = {
            tenantId,
            deletedAt: null,
            isActive: true,
            companyTenantProfileId: { not: null },
            person: {
                deletedAt: null,
                visiteComePaziente: { some: mdlVisitWhere(tenantId) }
            },
            ...(searchTerm && {
                OR: [
                    { person: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
                    { person: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
                    { person: { taxCode: { contains: searchTerm, mode: 'insensitive' } } },
                    { companyTenantProfile: { company: { ragioneSociale: { contains: searchTerm, mode: 'insensitive' } } } }
                ]
            })
        };

        const profiles = await prisma.personTenantProfile.findMany({
            where: baseProfileWhere,
            select: {
                personId: true,
                companyTenantProfileId: true,
                title: true,
                reparto: { select: { id: true, nome: true } },
                protocolloSanitario: {
                    select: {
                        id: true,
                        denominazione: true,
                        mansioneId: true,
                        mansioniAssociate: { select: { mansioneId: true } }
                    }
                },
                companyTenantProfile: {
                    select: {
                        id: true,
                        company: { select: { ragioneSociale: true } }
                    }
                },
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true
                    }
                }
            },
            take: 600
        });

        const companyMap = new Map();
        for (const profile of profiles) {
            const companyId = profile.companyTenantProfileId;
            if (!companyId) continue;
            if (!companyMap.has(companyId)) {
                companyMap.set(companyId, {
                    id: companyId,
                    ragioneSociale: profile.companyTenantProfile?.company?.ragioneSociale || 'Azienda senza nome',
                    workerCount: 0
                });
            }
            companyMap.get(companyId).workerCount += 1;
        }

        const employees = profiles
            .filter(profile => !companyTenantProfileId || profile.companyTenantProfileId === companyTenantProfileId)
            .slice(0, 250)
            .map(profile => {
                const mansioneIds = new Set();
                if (profile.protocolloSanitario?.mansioneId) mansioneIds.add(profile.protocolloSanitario.mansioneId);
                profile.protocolloSanitario?.mansioniAssociate?.forEach(item => {
                    if (item.mansioneId) mansioneIds.add(item.mansioneId);
                });
                return {
                    id: profile.person.id,
                    firstName: profile.person.firstName,
                    lastName: profile.person.lastName,
                    taxCode: profile.person.taxCode,
                    companyTenantProfileId: profile.companyTenantProfileId,
                    title: profile.title,
                    reparto: profile.reparto,
                    protocolloSanitario: profile.protocolloSanitario
                        ? {
                            id: profile.protocolloSanitario.id,
                            denominazione: profile.protocolloSanitario.denominazione
                        }
                        : null,
                    mansioneIds: [...mansioneIds]
                };
            })
            .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'it'));

        let visits = [];
        if (personId) {
            const visitaMdlPrestazioni = await prisma.prestazione.findMany({
                where: { tenantId, deletedAt: null, tipo: VISITA_MDL_PRESTAZIONE_TIPO },
                select: { id: true }
            });
            const visitaMdlPrestazioneIds = new Set(visitaMdlPrestazioni.map(item => item.id));

            const personVisits = await prisma.visita.findMany({
                where: {
                    ...mdlVisitWhere(tenantId),
                    pazienteId: personId
                },
                orderBy: { dataOra: 'desc' },
                take: 80,
                select: {
                    id: true,
                    dataOra: true,
                    stato: true,
                    tipoVisitaMDL: true,
                    medicoId: true,
                    datiStrutturati: true,
                    prestazione: { select: { id: true, nome: true, tipo: true } },
                    giudizioIdoneita: {
                        select: {
                            id: true,
                            tipoGiudizio: true,
                            dataScadenza: true,
                            prescrizioniIdoneita: true,
                            limitazioni: true,
                            motivazioni: true
                        }
                    },
                    scadenzePrestazioni: {
                        where: { tenantId, deletedAt: null },
                        select: {
                            id: true,
                            prestazioneId: true,
                            dataScadenza: true
                        }
                    }
                }
            });
            visits = personVisits.map(visita => mapVisitForForm(visita, visitaMdlPrestazioneIds));
        }

        return {
            companies: [...companyMap.values()].sort((a, b) => a.ragioneSociale.localeCompare(b.ragioneSociale, 'it')),
            employees,
            visits
        };
    },

    async validateLinkedMdlVisit(tx, tenantId, personId, visitaId) {
        if (!visitaId) {
            throw createHttpError(400, 'Il giudizio deve essere collegato a una visita medica del lavoro');
        }

        const visita = await tx.visita.findFirst({
            where: {
                ...mdlVisitWhere(tenantId),
                id: visitaId,
                pazienteId: personId
            },
            select: {
                id: true,
                pazienteId: true,
                stato: true,
                datiStrutturati: true
            }
        });

        if (!visita) {
            throw createHttpError(400, 'La visita collegata non è una visita medica del lavoro valida per il lavoratore selezionato');
        }

        return visita;
    },

    async syncLinkedVisitFromGiudizio(tx, tenantId, visit, data, statoFinale) {
        const structuredUpdate = buildVisitUpdateFromGiudizio(data);
        const previousStructured = visit.datiStrutturati && typeof visit.datiStrutturati === 'object'
            ? visit.datiStrutturati
            : {};
        const dataScadenza = normalizeDate(data.dataScadenza);

        await tx.visita.update({
            where: { id: visit.id },
            data: {
                datiStrutturati: {
                    ...previousStructured,
                    ...structuredUpdate
                },
                ...(statoFinale === 'VALIDO' && visit.stato !== 'COMPLETATA' ? { stato: 'COMPLETATA' } : {})
            }
        });

        if (dataScadenza) {
            const visitaMdlPrestazioni = await tx.prestazione.findMany({
                where: { tenantId, deletedAt: null, tipo: VISITA_MDL_PRESTAZIONE_TIPO },
                select: { id: true }
            });
            const ids = visitaMdlPrestazioni.map(item => item.id);
            if (ids.length > 0) {
                await tx.scadenzaPrestazioneProtocollo.updateMany({
                    where: {
                        tenantId,
                        deletedAt: null,
                        visitaId: visit.id,
                        prestazioneId: { in: ids }
                    },
                    data: { dataScadenza }
                });
            }
        }
    },

    /**
     * Crea un nuovo giudizio di idoneità
     * @param {Object} data - Dati giudizio
     * @param {string} medicoCompetenteId - ID medico che emette il giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio creato
     */
    async create(data, medicoCompetenteId, tenantId) {
        const {
            personId,
            visitaId,
            mansioneIds = [],
            tipoGiudizio,
            dataScadenza,
            prescrizioniIdoneita,
            limitazioni,
            motivazioni,
            stato: requestedStato
        } = data;

        const isBozza = requestedStato === 'BOZZA';
        const statoFinale = isBozza ? 'BOZZA' : 'VALIDO';

        // Calcola data scadenza se non specificata (default 12 mesi)
        const scadenza = dataScadenza || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        // Calcola termine ricorso (30 giorni dalla notifica)
        const ricorsoEntro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const giudizio = await prisma.$transaction(async (tx) => {
            const visita = await GiudizioIdoneitaService.validateLinkedMdlVisit(tx, tenantId, personId, visitaId);

            // Invalida eventuali giudizi precedenti attivi per la stessa persona
            // (solo se non è una bozza — le bozze non invalidano giudizi validi)
            if (!isBozza) {
                await tx.giudizioIdoneita.updateMany({
                    where: {
                        personId,
                        tenantId,
                        stato: 'VALIDO'
                    },
                    data: { stato: 'SOSTITUITO' }
                });
            }

            await GiudizioIdoneitaService.syncLinkedVisitFromGiudizio(tx, tenantId, visita, data, statoFinale);

            return tx.giudizioIdoneita.create({
                data: {
                    personId,
                    visitaId,
                    medicoCompetenteId,
                    tipoGiudizio,
                    stato: statoFinale,
                    dataEmissione: new Date(),
                    dataScadenza: scadenza,
                    prescrizioniIdoneita,
                    limitazioni,
                    motivazioni,
                    ricorsoEntro,
                    tenantId,
                    ...(mansioneIds.length > 0 && {
                        mansioni: {
                            create: mansioneIds.map(mansioneId => ({ mansioneId }))
                        }
                    })
                },
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    },
                    medicoCompetente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    mansioni: {
                        include: {
                            mansione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    denominazione: true
                                }
                            }
                        }
                    },
                    visita: {
                        select: {
                            id: true,
                            dataOra: true,
                            tipoVisitaMDL: true
                        }
                    }
                }
            });
        });

        logger.info({
            giudizioId: giudizio.id,
            personId,
            tipoGiudizio,
            medicoCompetenteId,
            tenantId
        }, 'Giudizio di idoneità emesso');

        return giudizio;
    },

    /**
     * Trova tutti i giudizi per un tenant
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni di filtro
     * @returns {Promise<Object>} Lista giudizi con paginazione
     */
    async findAll(tenantId, options = {}) {
        const {
            personId,
            medicoCompetenteId,
            tipoGiudizio,
            stato,
            inScadenza, // Giudizi in scadenza nei prossimi N giorni
            dateFrom,   // P66: Data emissione da
            dateTo,     // P66: Data emissione a
            mansione,   // P66: Cerca per mansione (testo libero)
            page = 1,
            limit = 50
        } = options;
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            deletedAt: null,
            ...(personId && { personId }),
            ...(medicoCompetenteId && { medicoCompetenteId }),
            ...(tipoGiudizio && { tipoGiudizio }),
            ...(stato && { stato }),
            ...(inScadenza && {
                stato: 'VALIDO',
                dataScadenza: {
                    lte: new Date(Date.now() + inScadenza * 24 * 60 * 60 * 1000)
                }
            }),
            ...(dateFrom || dateTo ? {
                dataEmissione: {
                    ...(dateFrom && { gte: new Date(dateFrom) }),
                    ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') })
                }
            } : {}),
            ...(mansione && {
                mansioni: {
                    some: {
                        mansione: {
                            denominazione: { contains: mansione, mode: 'insensitive' }
                        }
                    }
                }
            })
        };

        const [giudizi, total] = await Promise.all([
            prisma.giudizioIdoneita.findMany({
                where,
                skip,
                take: limit,
                orderBy: { dataEmissione: 'desc' },
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    },
                    medicoCompetente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    mansioni: {
                        include: {
                            mansione: {
                                select: {
                                    id: true,
                                    codice: true,
                                    denominazione: true,
                                    site: {
                                        select: {
                                            companyTenantProfile: {
                                                select: {
                                                    company: { select: { ragioneSociale: true } }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    visita: {
                        select: {
                            id: true,
                            dataOra: true,
                            tipoVisitaMDL: true,
                            appuntamento: {
                                select: {
                                    id: true,
                                    companyTenantProfile: {
                                        select: {
                                            company: { select: { ragioneSociale: true } }
                                        }
                                    },
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
                            }
                        }
                    }
                }
            }),
            prisma.giudizioIdoneita.count({ where })
        ]);

        return {
            data: giudizi,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Trova giudizio per ID
     * @param {string} id - ID giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Giudizio con tutti i dettagli
     */
    async findById(id, tenantId) {
        return prisma.giudizioIdoneita.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true,
                        birthDate: true
                    }
                },
                medicoCompetente: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                mansioni: {
                    include: {
                        mansione: {
                            include: {
                                rischiAssociati: { where: { deletedAt: null } }
                            }
                        }
                    }
                },
                visita: {
                    select: {
                        id: true,
                        dataOra: true,
                        tipoVisitaMDL: true,
                        anamnesi: true,
                        esamiObiettivo: true
                    }
                }
            }
        });
    },

    /**
     * Trova giudizio attivo per un lavoratore
     * @param {string} personId - ID lavoratore
     * @param {string} tenantId - ID tenant
     * @param {string|null} mansioneId - ID mansione (opzionale)
     * @returns {Promise<Object|null>} Giudizio attivo
     */
    async findActiveForWorker(personId, tenantId, mansioneId = null) {
        return prisma.giudizioIdoneita.findFirst({
            where: {
                personId,
                tenantId,
                stato: 'VALIDO',
                deletedAt: null,
                ...(mansioneId && {
                    mansioni: { some: { mansioneId } }
                })
            },
            include: {
                medicoCompetente: {
                    select: { id: true, firstName: true, lastName: true }
                },
                mansioni: {
                    include: {
                        mansione: {
                            select: { id: true, codice: true, denominazione: true }
                        }
                    }
                }
            }
        });
    },

    /**
     * Aggiorna giudizio (es. per aggiungere notifiche)
     * @param {string} id - ID giudizio
     * @param {Object} data - Dati da aggiornare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio aggiornato
     */
    async update(id, data, tenantId) {
        const giudizio = await prisma.$transaction(async (tx) => {
            const existing = await tx.giudizioIdoneita.findFirst({
                where: { id, tenantId, deletedAt: null },
                select: {
                    id: true,
                    personId: true,
                    visitaId: true,
                    stato: true,
                    tipoGiudizio: true,
                    dataScadenza: true,
                    prescrizioniIdoneita: true,
                    limitazioni: true,
                    motivazioni: true
                }
            });

            if (!existing) {
                throw createHttpError(404, 'Giudizio non trovato');
            }

            const nextData = {
                ...existing,
                ...data,
                personId: existing.personId,
                visitaId: existing.visitaId
            };
            const visit = await GiudizioIdoneitaService.validateLinkedMdlVisit(tx, tenantId, existing.personId, existing.visitaId);
            await GiudizioIdoneitaService.syncLinkedVisitFromGiudizio(tx, tenantId, visit, nextData, nextData.stato || 'VALIDO');

            return tx.giudizioIdoneita.update({
                where: { id, tenantId, deletedAt: null },
                data: {
                    ...data,
                    personId: undefined,
                    visitaId: undefined,
                    medicoCompetenteId: undefined
                },
                include: {
                    person: { select: { id: true, firstName: true, lastName: true } },
                    medicoCompetente: { select: { id: true, firstName: true, lastName: true } }
                }
            });
        });

        logger.info({ giudizioId: id, tenantId }, 'Giudizio aggiornato');
        return giudizio;
    },

    /**
     * Registra notifica al lavoratore
     * @param {string} id - ID giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio aggiornato
     */
    async notifyWorker(id, tenantId) {
        return prisma.giudizioIdoneita.update({
            where: { id, tenantId, deletedAt: null },
            data: {
                dataNotificaLavoratore: new Date(),
                // Ricalcola termine ricorso dalla data di notifica effettiva
                ricorsoEntro: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });
    },

    /**
     * Registra notifica al datore di lavoro
     * @param {string} id - ID giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio aggiornato
     */
    async notifyEmployer(id, tenantId) {
        return prisma.giudizioIdoneita.update({
            where: { id, tenantId, deletedAt: null },
            data: { dataNotificaDatoreLavoro: new Date() }
        });
    },

    /**
     * Registra presentazione ricorso (Art. 41 c.9)
     * @param {string} id - ID giudizio
     * @param {Object} ricorsoData - Dati ricorso
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio aggiornato
     */
    async registerAppeal(id, ricorsoData, tenantId) {
        const giudizio = await prisma.giudizioIdoneita.update({
            where: { id, tenantId, deletedAt: null },
            data: {
                stato: 'RICORSO_IN_CORSO',
                ricorsoDataPresentazione: new Date()
            }
        });

        logger.info({
            giudizioId: id,
            tenantId
        }, 'Ricorso presentato contro giudizio idoneità');

        return giudizio;
    },

    /**
     * Registra esito ricorso
     * @param {string} id - ID giudizio
     * @param {string} esito - Esito del ricorso
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio aggiornato
     */
    async resolveAppeal(id, esito, tenantId) {
        const giudizio = await prisma.giudizioIdoneita.update({
            where: { id, tenantId, deletedAt: null },
            data: {
                stato: 'VALIDO', // O stato diverso basato sull'esito
                ricorsoEsito: esito
            }
        });

        logger.info({
            giudizioId: id,
            esito,
            tenantId
        }, 'Ricorso risolto');

        return giudizio;
    },

    /**
     * Ottiene statistiche giudizi per un medico
     * @param {string} medicoCompetenteId - ID medico
     * @param {string} tenantId - ID tenant
     * @param {Object} period - Periodo { from, to }
     * @returns {Promise<Object>} Statistiche
     */
    async getStatsByMedico(medicoCompetenteId, tenantId, period = {}) {
        const where = {
            medicoCompetenteId,
            tenantId,
            deletedAt: null,
            ...(period.from && {
                dataEmissione: {
                    gte: period.from,
                    ...(period.to && { lte: period.to })
                }
            })
        };

        const [
            totale,
            idonei,
            idoneiConPrescrizioni,
            idoneiConLimitazioni,
            nonIdoneiTemp,
            nonIdoneiPerm
        ] = await Promise.all([
            prisma.giudizioIdoneita.count({ where }),
            prisma.giudizioIdoneita.count({ where: { ...where, tipoGiudizio: 'IDONEO' } }),
            prisma.giudizioIdoneita.count({ where: { ...where, tipoGiudizio: 'IDONEO_CON_PRESCRIZIONI' } }),
            prisma.giudizioIdoneita.count({ where: { ...where, tipoGiudizio: 'IDONEO_CON_LIMITAZIONI' } }),
            prisma.giudizioIdoneita.count({ where: { ...where, tipoGiudizio: 'NON_IDONEO_TEMPORANEO' } }),
            prisma.giudizioIdoneita.count({ where: { ...where, tipoGiudizio: 'NON_IDONEO_PERMANENTE' } })
        ]);

        return {
            totale,
            perTipo: {
                idonei,
                idoneiConPrescrizioni,
                idoneiConLimitazioni,
                nonIdoneiTemporanei: nonIdoneiTemp,
                nonIdoneiPermanenti: nonIdoneiPerm
            },
            percentualiIdoneita: totale > 0 ? {
                idonei: ((idonei / totale) * 100).toFixed(1),
                conLimitazioni: (((idoneiConPrescrizioni + idoneiConLimitazioni) / totale) * 100).toFixed(1),
                nonIdonei: (((nonIdoneiTemp + nonIdoneiPerm) / totale) * 100).toFixed(1)
            } : null
        };
    },

    /**
     * Ottiene giudizi in scadenza per un tenant
     * @param {string} tenantId - ID tenant
     * @param {number} giorni - Giorni entro cui scade
     * @returns {Promise<Array>} Lista giudizi in scadenza
     */
    async getExpiring(tenantId, giorni = 30) {
        return prisma.giudizioIdoneita.findMany({
            where: {
                tenantId,
                stato: 'VALIDO',
                deletedAt: null,
                dataScadenza: {
                    lte: new Date(Date.now() + giorni * 24 * 60 * 60 * 1000),
                    gte: new Date()
                }
            },
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true,
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null },
                            select: { email: true, phone: true, companyTenantProfileId: true }
                        }
                    }
                },
                mansioni: {
                    include: {
                        mansione: {
                            select: { id: true, codice: true, denominazione: true }
                        }
                    }
                }
            },
            orderBy: { dataScadenza: 'asc' }
        });
    },

    /**
     * Elimina giudizio (soft delete)
     * @param {string} id - ID giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizio eliminato
     */
    async delete(id, tenantId, deletionReason) {
        const giudizio = await prisma.$transaction(async (tx) => {
            const record = await tx.giudizioIdoneita.update({
                where: { id, tenantId, deletedAt: null },
                data: { deletedAt: new Date() }
            });

            await tx.gdprAuditLog.create({
                data: {
                    tenantId,
                    action: 'DELETE',
                    resourceType: 'GiudizioIdoneita',
                    resourceId: id,
                    dataAccessed: ['giudizio_idoneita'],
                    performedBy: null,
                    deletionReason: deletionReason || 'Eliminazione giudizio di idoneità',
                }
            });

            return record;
        });

        logger.info({ giudizioId: id, tenantId }, 'Giudizio eliminato con audit GDPR');
        return giudizio;
    }
};

export default GiudizioIdoneitaService;
