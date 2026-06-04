/**
 * Allegato3BService - Generazione Relazione Annuale INAIL
 * 
 * Genera la Relazione Annuale (Allegato 3B) secondo Art. 40 D.Lgs 81/08
 * Produce statistiche aggregate anonimizzate per invio telematico INAIL
 * 
 * @module services/clinical/Allegato3BService
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 6
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

const MC_NOMINA_TYPES = ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'];
const PRIVILEGED_ALLEGATO_3B_ROLES = new Set(['ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN', 'SEGRETERIA']);
const STAT_FIELDS = [
    'totLavoratoriSorvegliati', 'totVisiteEffettuate', 'totGiudiziIdoneita',
    'totGiudiziConLimitazioni', 'totGiudiziConPrescrizioni', 'totInidoneita',
    'statistichePerRischio', 'malattieProf', 'lavoratoriPerGenere',
    'lavoratoriPerFasciaEta', 'visitePerTipologia', 'giudiziPerTipologia',
    'giudiziPerRischio', 'accertamentiIntegrativi'
];

const getRoleTypesForPerson = (person) => {
    const roles = new Set();
    (person?.roles || []).forEach(role => roles.add(typeof role === 'string' ? role : role?.roleType || role?.name));
    return [...roles].filter(Boolean);
};

const normalizeNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
};


/**
 * Struttura Allegato 3B secondo D.Lgs 81/08 Art. 40:
 * 
 * - Dati identificativi azienda
 * - Numero lavoratori sorvegliati
 * - Visite effettuate per tipologia
 * - Giudizi di idoneità emessi (aggregati)
 * - Malattie professionali segnalate
 * - Statistiche per rischio lavorativo
 * 
 * NOTA: Dati ANONIMIZZATI - no dati personali identificabili
 */

class Allegato3BService {
    static toPersistableStatistics(stats = {}) {
        const data = {};
        for (const field of STAT_FIELDS) {
            if (stats[field] !== undefined) data[field] = stats[field];
        }
        return {
            ...data,
            totLavoratoriSorvegliati: normalizeNumber(stats.totLavoratoriSorvegliati),
            totVisiteEffettuate: normalizeNumber(stats.totVisiteEffettuate),
            totGiudiziIdoneita: normalizeNumber(stats.totGiudiziIdoneita),
            totGiudiziConLimitazioni: normalizeNumber(stats.totGiudiziConLimitazioni),
            totGiudiziConPrescrizioni: normalizeNumber(stats.totGiudiziConPrescrizioni),
            totInidoneita: normalizeNumber(stats.totInidoneita),
        };
    }

    static applyStatisticOverrides(stats = {}, overrides = {}) {
        if (!overrides || typeof overrides !== 'object') return stats;
        const merged = { ...stats };
        for (const field of STAT_FIELDS) {
            if (overrides[field] !== undefined) {
                merged[field] = typeof stats[field] === 'number'
                    ? normalizeNumber(overrides[field])
                    : overrides[field];
            }
        }
        return merged;
    }

    static async getEligibleCompanies(tenantId, person) {
        const roles = getRoleTypesForPerson(person);
        const canViewAll = roles.some(role => PRIVILEGED_ALLEGATO_3B_ROLES.has(role));

        const nomine = await prisma.nominaRuolo.findMany({
            where: {
                tenantId,
                deletedAt: null,
                stato: 'ATTIVA',
                tipoRuolo: { in: MC_NOMINA_TYPES },
                OR: [
                    { dataScadenza: null },
                    { dataScadenza: { gte: new Date() } }
                ],
                ...(canViewAll ? {} : { personId: person.id })
            },
            select: {
                personId: true,
                tipoRuolo: true,
                dataInizio: true,
                dataScadenza: true,
                person: { select: { id: true, firstName: true, lastName: true } },
                companyTenantProfileId: true,
                companyTenantProfile: {
                    select: {
                        id: true,
                        company: {
                            select: {
                                ragioneSociale: true,
                                piva: true,
                                codiceFiscale: true,
                                codiceAteco: true
                            }
                        }
                    }
                },
                site: {
                    select: {
                        companyTenantProfileId: true,
                        companyTenantProfile: {
                            select: {
                                id: true,
                                company: {
                                    select: {
                                        ragioneSociale: true,
                                        piva: true,
                                        codiceFiscale: true,
                                        codiceAteco: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [{ tipoRuolo: 'asc' }, { dataInizio: 'desc' }]
        });

        const companies = new Map();
        for (const nomina of nomine) {
            const profile = nomina.companyTenantProfile || nomina.site?.companyTenantProfile;
            const companyTenantProfileId = nomina.companyTenantProfileId || nomina.site?.companyTenantProfileId;
            if (!profile || !companyTenantProfileId) continue;
            const existing = companies.get(companyTenantProfileId);
            const doctor = nomina.person
                ? `${nomina.person.lastName || ''} ${nomina.person.firstName || ''}`.trim()
                : null;
            if (!existing) {
                companies.set(companyTenantProfileId, {
                    id: companyTenantProfileId,
                    companyTenantProfileId,
                    ragioneSociale: profile.company?.ragioneSociale || 'Azienda senza denominazione',
                    piva: profile.company?.piva,
                    codiceFiscale: profile.company?.codiceFiscale,
                    codiceAteco: profile.company?.codiceAteco,
                    medicoCompetenteId: nomina.personId,
                    medicoCompetente: doctor,
                    nomineCount: 1,
                    canViewAll
                });
            } else {
                existing.nomineCount += 1;
                if (nomina.tipoRuolo === 'MEDICO_COMPETENTE') {
                    existing.medicoCompetenteId = nomina.personId;
                    existing.medicoCompetente = doctor;
                }
            }
        }

        return [...companies.values()].sort((a, b) => a.ragioneSociale.localeCompare(b.ragioneSociale, 'it'));
    }

    /**
     * Crea o aggiorna un Allegato 3B per un'azienda/anno
     * 
     * @param {Object} data - Dati per creazione/aggiornamento
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Allegato 3B creato/aggiornato
     */
    static async createOrUpdate(data, tenantId) {
        const {
            medicoCompetenteId,
            companyTenantProfileId,
            anno,
        } = data;

        // Whitelist dei campi statistici mutabili (OWASP A04 — prevent mass assignment)
        const safeData = {};
        const allowedFields = [
            'totLavoratoriSorvegliati', 'totVisiteEffettuate', 'totGiudiziIdoneita',
            'totGiudiziConLimitazioni', 'totGiudiziConPrescrizioni', 'totInidoneita',
            'statistichePerRischio', 'malattieProf', 'lavoratoriPerGenere',
            'lavoratoriPerFasciaEta', 'visitePerTipologia', 'giudiziPerTipologia',
            'giudiziPerRischio', 'accertamentiIntegrativi',
            'dataCompilazione', 'dataInvio', 'dataConferma', 'protocolloInvio',
            'ricevutaInvio', 'stato', 'note'
        ];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                safeData[field] = data[field];
            }
        }

        logger.info({ companyTenantProfileId, anno, tenantId }, 'Creazione/aggiornamento Allegato 3B');

        // Verifica esistenza
        const existing = await prisma.allegato3B.findFirst({
            where: {
                companyTenantProfileId,
                anno,
                tenantId,
                deletedAt: null
            }
        });

        if (existing) {
            // Aggiorna esistente
            return await prisma.allegato3B.update({
                where: { id: existing.id },
                data: {
                    medicoCompetenteId,
                    ...safeData,
                    updatedAt: new Date()
                }
            });
        }

        // Crea nuovo
        return await prisma.allegato3B.create({
            data: {
                medicoCompetenteId,
                companyTenantProfileId,
                anno,
                tenantId,
                ...safeData
            }
        });
    }

    /**
     * Compila automaticamente i dati statistici per un Allegato 3B
     * 
     * @param {string} companyTenantProfileId - ID profilo aziendale
     * @param {number} anno - Anno di riferimento
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Dati statistici calcolati
     */
    static async compileStatistics(companyTenantProfileId, anno, tenantId) {
        logger.info({ companyTenantProfileId, anno, tenantId }, 'Compilazione statistiche Allegato 3B');

        const inizioAnno = new Date(anno, 0, 1);
        const fineAnno = new Date(anno, 11, 31, 23, 59, 59);

        // 1. Lavoratori soggetti a sorveglianza sanitaria e lavoratori visitati nell'anno
        const [lavoratoriSoggettiSorveglianza, occupatiDateRiferimento] = await Promise.all([
            this.getLavoratoriSoggettiSorveglianza(companyTenantProfileId, anno, tenantId),
            this.getOccupatiDateRiferimento(companyTenantProfileId, anno, tenantId)
        ]);
        const lavoratoriVisitati = await this.getLavoratoriSorvegliati(companyTenantProfileId, anno, tenantId);

        // 2. Visite effettuate nell'anno
        const visiteStats = await this.getVisiteStatistics(companyTenantProfileId, anno, tenantId);

        // 3. Giudizi emessi nell'anno
        const giudiziStats = await this.getGiudiziStatistics(companyTenantProfileId, anno, tenantId);

        // 4. Statistiche per rischio
        const statistichePerRischio = await this.getStatistichePerRischio(companyTenantProfileId, anno, tenantId);

        // 5. Malattie professionali segnalate
        const malattieProf = await this.getMalattieProfessionali(companyTenantProfileId, anno, tenantId);

        // 6. Giudizi disaggregati per rischio lavorativo
        const giudiziPerRischio = await this.getGiudiziPerRischio(companyTenantProfileId, anno, tenantId);

        // 7. Accertamenti sanitari integrativi
        const accertamentiIntegrativi = await this.getAccertamentiIntegrativi(companyTenantProfileId, anno, tenantId);

        return {
            totLavoratoriSorvegliati: lavoratoriSoggettiSorveglianza.count,
            lavoratoriPerGenere: lavoratoriSoggettiSorveglianza.perGenere,
            lavoratoriPerFasciaEta: lavoratoriSoggettiSorveglianza.perFasciaEta,

            totVisiteEffettuate: visiteStats.totale,
            visitePerTipologia: visiteStats.perTipologia,

            totGiudiziIdoneita: giudiziStats.totale,
            totGiudiziConLimitazioni: giudiziStats.conLimitazioni,
            totGiudiziConPrescrizioni: giudiziStats.conPrescrizioni,
            totInidoneita: giudiziStats.inidoneita,
            giudiziPerTipologia: giudiziStats.perTipologia,

            statistichePerRischio: {
                ...statistichePerRischio,
                _totali: {
                    occupatiAl30Giugno: occupatiDateRiferimento.al30Giugno.count,
                    occupatiAl31Dicembre: occupatiDateRiferimento.al31Dicembre.count,
                    lavoratoriSoggettiSorveglianza: lavoratoriSoggettiSorveglianza.count,
                    lavoratoriVisitati: lavoratoriVisitati.count
                },
                _occupatiDateRiferimento: occupatiDateRiferimento
            },
            malattieProf,
            giudiziPerRischio,
            accertamentiIntegrativi,

            annoRiferimento: anno,
            dataCompilazione: new Date().toISOString()
        };
    }

    static aggregateWorkers(workers, referenceDate = new Date()) {
        const perGenere = {
            maschi: workers.filter(l => l.person?.gender === 'MALE' || l.paziente?.gender === 'MALE').length,
            femmine: workers.filter(l => l.person?.gender === 'FEMALE' || l.paziente?.gender === 'FEMALE').length,
            altro: workers.filter(l => {
                const gender = l.person?.gender || l.paziente?.gender;
                return !['MALE', 'FEMALE'].includes(gender);
            }).length
        };

        const perFasciaEta = {
            'sotto18': 0,
            '18-25': 0,
            '26-35': 0,
            '36-45': 0,
            '46-55': 0,
            'oltre55': 0
        };

        workers.forEach(l => {
            const birthDate = l.person?.birthDate || l.paziente?.birthDate;
            if (!birthDate) return;
            const eta = Math.floor((referenceDate.getTime() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (eta < 18) perFasciaEta['sotto18']++;
            else if (eta <= 25) perFasciaEta['18-25']++;
            else if (eta <= 35) perFasciaEta['26-35']++;
            else if (eta <= 45) perFasciaEta['36-45']++;
            else if (eta <= 55) perFasciaEta['46-55']++;
            else perFasciaEta['oltre55']++;
        });

        return {
            count: workers.length,
            perGenere,
            perFasciaEta
        };
    }

    static mergeWorkerGroups(...groups) {
        const byPersonId = new Map();
        for (const group of groups) {
            for (const worker of group || []) {
                const personId = worker.personId || worker.pazienteId || worker.person?.id || worker.paziente?.id;
                if (!personId || byPersonId.has(personId)) continue;
                byPersonId.set(personId, {
                    personId,
                    person: worker.person || worker.paziente || null,
                    paziente: worker.paziente || worker.person || null
                });
            }
        }
        return [...byPersonId.values()];
    }

    static companyVisitWhere(companyTenantProfileId) {
        return {
            OR: [
                { appuntamento: { companyTenantProfileId } },
                {
                    paziente: {
                        tenantProfiles: {
                            some: {
                                companyTenantProfileId,
                                deletedAt: null
                            }
                        }
                    }
                }
            ]
        };
    }

    static async getOccupatiAtDate(companyTenantProfileId, tenantId, referenceDate) {
        const workers = await prisma.personTenantProfile.findMany({
            where: {
                tenantId,
                companyTenantProfileId,
                deletedAt: null,
                isActive: true,
                status: { not: 'TERMINATED' },
                OR: [
                    { hiredDate: null },
                    { hiredDate: { lte: referenceDate } }
                ],
                AND: [
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: referenceDate } }
                        ]
                    }
                ]
            },
            select: {
                personId: true,
                person: {
                    select: {
                        gender: true,
                        birthDate: true
                    }
                }
            },
            distinct: ['personId']
        });

        return this.aggregateWorkers(workers, referenceDate);
    }

    static async getOccupatiDateRiferimento(companyTenantProfileId, anno, tenantId) {
        const giugno = new Date(Date.UTC(anno, 5, 30, 23, 59, 59, 999));
        const dicembre = new Date(Date.UTC(anno, 11, 31, 23, 59, 59, 999));

        const [al30Giugno, al31Dicembre] = await Promise.all([
            this.getOccupatiAtDate(companyTenantProfileId, tenantId, giugno),
            this.getOccupatiAtDate(companyTenantProfileId, tenantId, dicembre)
        ]);

        return {
            al30Giugno,
            al31Dicembre,
            fonte: 'person_tenant_profiles',
            logica: 'hiredDate <= data riferimento e endDate assente o >= data riferimento; esclusi deletedAt, isActive=false e TERMINATED'
        };
    }

    /**
     * Lavoratori soggetti a sorveglianza sanitaria: include gli attivi su mansioni con rischi
     * valutati, anche se nell'anno non è stata eseguita alcuna visita.
     */
    static async getLavoratoriSoggettiSorveglianza(companyTenantProfileId, anno, tenantId) {
        const inizioAnno = new Date(anno, 0, 1);
        const fineAnno = new Date(anno, 11, 31, 23, 59, 59);

        const [assegnazioni, profiliConProtocollo, visitati] = await Promise.all([
            prisma.lavoratoreMansione.findMany({
                where: {
                    tenantId,
                    isAttiva: true,
                    deletedAt: null,
                    dataInizio: { lte: fineAnno },
                    OR: [
                        { dataFine: null },
                        { dataFine: { gte: inizioAnno } }
                    ],
                    mansione: {
                        deletedAt: null,
                        site: {
                            companyTenantProfileId,
                            deletedAt: null
                        }
                    }
                },
                select: {
                    personId: true,
                    person: {
                        select: {
                            id: true,
                            gender: true,
                            birthDate: true
                        }
                    }
                },
                distinct: ['personId']
            }),
            prisma.personTenantProfile.findMany({
                where: {
                    tenantId,
                    companyTenantProfileId,
                    deletedAt: null,
                    isActive: true,
                    protocolloSanitarioId: { not: null },
                    OR: [
                        { hiredDate: null },
                        { hiredDate: { lte: fineAnno } }
                    ],
                    AND: {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: inizioAnno } }
                        ]
                    },
                },
                select: {
                    personId: true,
                    person: {
                        select: {
                            id: true,
                            gender: true,
                            birthDate: true
                        }
                    }
                },
                distinct: ['personId']
            }),
            prisma.visita.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    tipoVisitaMDL: { not: null },
                    dataOra: { gte: inizioAnno, lte: fineAnno },
                    ...this.companyVisitWhere(companyTenantProfileId)
                },
                select: {
                    pazienteId: true,
                    paziente: {
                        select: {
                            id: true,
                            gender: true,
                            birthDate: true
                        }
                    }
                },
                distinct: ['pazienteId']
            })
        ]);

        return this.aggregateWorkers(this.mergeWorkerGroups(assegnazioni, profiliConProtocollo, visitati), fineAnno);
    }

    /**
     * Conta lavoratori sorvegliati nell'anno
     */
    static async getLavoratoriSorvegliati(companyTenantProfileId, anno, tenantId) {
        const inizioAnno = new Date(anno, 0, 1);
        const fineAnno = new Date(anno, 11, 31, 23, 59, 59);

        // Lavoratori con visita MDL nell'anno
        const lavoratori = await prisma.visita.findMany({
            where: {
                tenantId,
                deletedAt: null,
                tipoVisitaMDL: { not: null },
                dataOra: {
                    gte: inizioAnno,
                    lte: fineAnno
                },
                ...this.companyVisitWhere(companyTenantProfileId)
            },
            select: {
                pazienteId: true,
                paziente: {
                    select: {
                        gender: true,
                        birthDate: true
                    }
                }
            },
            distinct: ['pazienteId']
        });

        return this.aggregateWorkers(lavoratori, fineAnno);
    }

    /**
     * Statistiche visite MDL nell'anno
     */
    static async getVisiteStatistics(companyTenantProfileId, anno, tenantId) {
        const inizioAnno = new Date(anno, 0, 1);
        const fineAnno = new Date(anno, 11, 31, 23, 59, 59);

        const visite = await prisma.visita.groupBy({
            by: ['tipoVisitaMDL'],
            where: {
                tenantId,
                deletedAt: null,
                tipoVisitaMDL: { not: null },
                dataOra: {
                    gte: inizioAnno,
                    lte: fineAnno
                },
                ...this.companyVisitWhere(companyTenantProfileId)
            },
            _count: { id: true }
        });

        const perTipologia = {};
        let totale = 0;

        visite.forEach(v => {
            if (v.tipoVisitaMDL) {
                perTipologia[v.tipoVisitaMDL] = v._count.id;
                totale += v._count.id;
            }
        });

        return {
            totale,
            perTipologia
        };
    }

    /**
     * Statistiche giudizi idoneità nell'anno
     */
    static async getGiudiziStatistics(companyTenantProfileId, anno, tenantId) {
        const inizioAnno = new Date(anno, 0, 1);
        const fineAnno = new Date(anno, 11, 31, 23, 59, 59);

        const giudizi = await prisma.giudizioIdoneita.groupBy({
            by: ['tipoGiudizio'],
            where: {
                tenantId,
                deletedAt: null,
                dataEmissione: {
                    gte: inizioAnno,
                    lte: fineAnno
                },
                OR: [
                    {
                        person: {
                            tenantProfiles: {
                                some: {
                                    companyTenantProfileId,
                                    deletedAt: null
                                }
                            }
                        }
                    },
                    {
                        visita: {
                            appuntamento: { companyTenantProfileId }
                        }
                    },
                    {
                        mansioni: {
                            some: {
                                mansione: {
                                    site: {
                                        companyTenantProfileId,
                                        deletedAt: null
                                    },
                                    deletedAt: null
                                }
                            }
                        }
                    }
                ]
            },
            _count: { id: true }
        });

        const perTipologia = {};
        let totale = 0;
        let conLimitazioni = 0;
        let conPrescrizioni = 0;
        let inidoneita = 0;

        giudizi.forEach(g => {
            perTipologia[g.tipoGiudizio] = g._count.id;
            totale += g._count.id;

            switch (g.tipoGiudizio) {
                case 'IDONEO_CON_LIMITAZIONI':
                    conLimitazioni += g._count.id;
                    break;
                case 'IDONEO_CON_PRESCRIZIONI':
                    conPrescrizioni += g._count.id;
                    break;
                case 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI':
                    conLimitazioni += g._count.id;
                    conPrescrizioni += g._count.id;
                    break;
                case 'NON_IDONEO_TEMPORANEO':
                case 'NON_IDONEO_PERMANENTE':
                    inidoneita += g._count.id;
                    break;
            }
        });

        return {
            totale,
            conLimitazioni,
            conPrescrizioni,
            inidoneita,
            perTipologia
        };
    }

    /**
     * Statistiche per rischio lavorativo
     */
    static async getStatistichePerRischio(companyTenantProfileId, anno, tenantId) {
        const inizioAnno = new Date(anno, 0, 1);
        const fineAnno = new Date(anno, 11, 31, 23, 59, 59);

        const statPerRischio = {};

        const addRiskCount = (codice, livello, count = 1) => {
            if (!codice || count <= 0) return;
            if (!statPerRischio[codice]) {
                statPerRischio[codice] = {
                    lavoratoriEsposti: 0,
                    perLivello: { BASSO: 0, MEDIO: 0, ALTO: 0, MOLTO_ALTO: 0 }
                };
            }
            statPerRischio[codice].lavoratoriEsposti += count;
            if (livello && statPerRischio[codice].perLivello[livello] !== undefined) {
                statPerRischio[codice].perLivello[livello] += count;
            }
        };

        // I rischi personalizzati del lavoratore sono la fonte primaria quando presenti:
        // rappresentano le variazioni fatte in visita senza cambiare protocollo sanitario.
        const rischiPersonalizzati = await prisma.lavoratoreRischioAggiuntivo.findMany({
            where: {
                tenantId,
                deletedAt: null,
                person: {
                    tenantProfiles: {
                        some: {
                            tenantId,
                            companyTenantProfileId,
                            deletedAt: null,
                            isActive: true,
                            OR: [
                                { hiredDate: null },
                                { hiredDate: { lte: fineAnno } }
                            ],
                            AND: [
                                {
                                    OR: [
                                        { endDate: null },
                                        { endDate: { gte: inizioAnno } }
                                    ]
                                }
                            ]
                        }
                    }
                }
            },
            select: {
                personId: true,
                codiceRischio: true,
                livello: true
            }
        });

        const personeConRischiPersonalizzati = new Set();
        for (const rischio of rischiPersonalizzati) {
            personeConRischiPersonalizzati.add(rischio.personId);
            addRiskCount(rischio.codiceRischio, rischio.livello, 1);
        }

        // Recupera tutti i rischi delle mansioni aziendali, usati come fallback
        // per i lavoratori che non hanno rischi personalizzati.
        const rischi = await prisma.mansioneRischio.findMany({
            where: {
                tenantId,
                deletedAt: null,
                mansione: {
                    site: {
                        companyTenantProfileId,
                        deletedAt: null
                    },
                    deletedAt: null
                }
            },
            select: {
                codiceRischio: true,
                livello: true,
                mansione: {
                    select: {
                        _count: {
                            select: {
                                lavoratori: {
                                    where: {
                                        isAttiva: true,
                                        deletedAt: null,
                                        personId: { notIn: Array.from(personeConRischiPersonalizzati) },
                                        dataInizio: { lte: fineAnno },
                                        OR: [
                                            { dataFine: null },
                                            { dataFine: { gte: inizioAnno } }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        rischi.forEach(r => {
            const numLavoratori = r.mansione?._count?.lavoratori || 0;
            addRiskCount(r.codiceRischio, r.livello, numLavoratori);
        });

        return statPerRischio;
    }

    /**
     * Malattie professionali segnalate nel periodo
     */
    static async getMalattieProfessionali(companyTenantProfileId, anno, tenantId) {
        const malattie = await prisma.malattiaProfessionale.findMany({
            where: {
                companyTenantProfileId,
                tenantId,
                deletedAt: null,
                dataDiagnosi: {
                    gte: new Date(`${anno}-01-01`),
                    lte: new Date(`${anno}-12-31`),
                },
            },
            select: {
                codiceNosologico: true,
                denominazione: true,
                tipologia: true,
                esito: true,
            },
        });

        const perPatologia = {};
        malattie.forEach(m => {
            const key = m.codiceNosologico || m.denominazione;
            if (!perPatologia[key]) {
                perPatologia[key] = {
                    codice: m.codiceNosologico,
                    denominazione: m.denominazione,
                    totale: 0,
                    sospette: 0,
                    accertate: 0,
                };
            }
            perPatologia[key].totale++;
            if (m.tipologia === 'SOSPETTA') perPatologia[key].sospette++;
            if (m.tipologia === 'ACCERTATA') perPatologia[key].accertate++;
        });

        return {
            totale: malattie.length,
            perPatologia,
        };
    }

    /**
     * Giudizi di idoneità disaggregati per rischio lavorativo
     * Cross-reference: GiudizioIdoneita → GiudizioIdoneitaMansione → Mansione → MansioneRischio
     * 
     * @param {string} companyTenantProfileId - ID profilo aziendale
     * @param {number} anno - Anno di riferimento
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Giudizi per rischio: { codiceRischio: { idonei, conLimitazioni, conPrescrizioni, nonIdonei } }
     */
    static async getGiudiziPerRischio(companyTenantProfileId, anno, tenantId) {
        const inizioAnno = new Date(anno, 0, 1);
        const fineAnno = new Date(anno, 11, 31, 23, 59, 59);

        // Recupera giudizi con mansioni e rischi associati
        const giudizi = await prisma.giudizioIdoneita.findMany({
            where: {
                tenantId,
                deletedAt: null,
                dataEmissione: {
                    gte: inizioAnno,
                    lte: fineAnno
                },
                mansioni: {
                    some: {
                        mansione: {
                            site: {
                                companyTenantProfileId,
                                deletedAt: null
                            },
                            deletedAt: null
                        }
                    }
                }
            },
            select: {
                tipoGiudizio: true,
                mansioni: {
                    select: {
                        mansione: {
                            select: {
                                rischiAssociati: {
                                    select: {
                                        codiceRischio: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Aggrega per codice rischio
        const perRischio = {};

        for (const giudizio of giudizi) {
            // Raccogli tutti i codici rischio unici per questo giudizio
            const codiciRischio = new Set();
            for (const gm of giudizio.mansioni || []) {
                for (const r of gm.mansione?.rischiAssociati || []) {
                    if (r.codiceRischio) codiciRischio.add(r.codiceRischio);
                }
            }

            // Incrementa contatori per ciascun rischio
            for (const codice of codiciRischio) {
                if (!perRischio[codice]) {
                    perRischio[codice] = {
                        idonei: 0,
                        conLimitazioni: 0,
                        conPrescrizioni: 0,
                        nonIdonei: 0,
                        totale: 0
                    };
                }

                perRischio[codice].totale++;

                switch (giudizio.tipoGiudizio) {
                    case 'IDONEO':
                        perRischio[codice].idonei++;
                        break;
                    case 'IDONEO_CON_LIMITAZIONI':
                        perRischio[codice].conLimitazioni++;
                        break;
                    case 'IDONEO_CON_PRESCRIZIONI':
                        perRischio[codice].conPrescrizioni++;
                        break;
                    case 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI':
                        perRischio[codice].conLimitazioni++;
                        perRischio[codice].conPrescrizioni++;
                        break;
                    case 'NON_IDONEO_TEMPORANEO':
                    case 'NON_IDONEO_PERMANENTE':
                        perRischio[codice].nonIdonei++;
                        break;
                }
            }
        }

        return perRischio;
    }

    /**
     * Accertamenti sanitari integrativi (audiometria, spirometria, ECG, ecc.)
     * Aggregati da EsameStrumentale → Visita → Appuntamento → CompanyTenantProfile
     * 
     * @param {string} companyTenantProfileId - ID profilo aziendale
     * @param {number} anno - Anno di riferimento
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} { totale, perTipo: { [tipo]: { eseguiti, completati } } }
     */
    static async getAccertamentiIntegrativi(companyTenantProfileId, anno, tenantId) {
        const inizioAnno = new Date(anno, 0, 1);
        const fineAnno = new Date(anno, 11, 31, 23, 59, 59);

        const esami = await prisma.esameStrumentale.findMany({
            where: {
                tenantId,
                deletedAt: null,
                dataEsame: {
                    gte: inizioAnno,
                    lte: fineAnno
                },
                OR: [
                    {
                        visita: {
                            appuntamento: { companyTenantProfileId }
                        }
                    },
                    {
                        paziente: {
                            tenantProfiles: {
                                some: {
                                    companyTenantProfileId,
                                    deletedAt: null
                                }
                            }
                        }
                    }
                ]
            },
            select: {
                tipoDispositivo: true,
                tipoEsame: true,
                stato: true
            }
        });

        // Mappa tipoDispositivo → denominazione normativa
        const DENOMINAZIONI = {
            ECG: 'Elettrocardiogramma',
            SPIROMETRO: 'Spirometria',
            AUDIOMETRO: 'Audiometria'
        };

        const perTipo = {};
        for (const esame of esami) {
            const tipo = esame.tipoDispositivo || esame.tipoEsame || 'ALTRO';
            if (!perTipo[tipo]) {
                perTipo[tipo] = {
                    denominazione: DENOMINAZIONI[tipo] || tipo,
                    eseguiti: 0,
                    completati: 0
                };
            }
            perTipo[tipo].eseguiti++;
            if (esame.stato === 'COMPLETATO') {
                perTipo[tipo].completati++;
            }
        }

        return {
            totale: esami.length,
            perTipo
        };
    }

    /**
     * Genera XML in formato INAIL
     * 
     * @param {string} allegato3bId - ID dell'Allegato 3B
     * @param {string} tenantId - ID tenant
     * @returns {Promise<string>} XML conforme allo schema INAIL
     */
    static async generateXML(allegato3bId, tenantId) {
        const allegato = await prisma.allegato3B.findFirst({
            where: {
                id: allegato3bId,
                tenantId,
                deletedAt: null
            },
            include: {
                medicoCompetente: {
                    select: {
                        firstName: true,
                        lastName: true,
                        taxCode: true,
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null },
                            select: { registerCode: true, specialties: true }
                        }
                    }
                },
                companyTenantProfile: {
                    include: {
                        company: {
                            select: {
                                ragioneSociale: true,
                                piva: true,
                                codiceFiscale: true,
                                codiceAteco: true,
                                sedeLegaleIndirizzo: true,
                                sedeLegaleCitta: true,
                                sedeLegaleCap: true,
                                sedeLegaleProvincia: true,
                                settore: true,
                                dimensione: true
                            }
                        },
                        sites: {
                            where: { deletedAt: null },
                            select: {
                                id: true,
                                siteName: true,
                                numeroPAT: true,
                                indirizzo: true,
                                citta: true,
                                cap: true,
                                provincia: true
                            }
                        }
                    }
                }
            }
        });

        if (!allegato) {
            throw new Error(`Allegato 3B non trovato: ${allegato3bId}`);
        }

        const freshStats = await this.compileStatistics(allegato.companyTenantProfileId, allegato.anno, tenantId);
        const freshData = this.toPersistableStatistics(freshStats);
        const allegatoForXml = { ...allegato, ...freshData };

        const diagnostics = this.buildXmlDiagnostics(allegatoForXml);
        if (diagnostics.errors.length > 0) {
            const error = new Error(`Allegato 3B incompleto: ${diagnostics.errors.join('; ')}`);
            error.code = 'ALLEGATO_3B_XML_INVALID';
            error.details = diagnostics.errors;
            throw error;
        }

        // Genera XML strutturato utilizzando i dati pre-compilati
        const xml = this.buildXML(allegatoForXml);

        // Salva XML nel record
        await prisma.allegato3B.update({
            where: { id: allegato3bId },
            data: {
                ...freshData,
                dataCompilazione: allegato.dataCompilazione || new Date(),
                stato: 'PRONTO'
            }
        });

        return xml;
    }

    static buildXmlPreviewFromStats({ company, medicoCompetente, anno, stats }) {
        const allegato = {
            anno,
            medicoCompetente,
            companyTenantProfile: {
                company,
                sites: company?.sites || []
            },
            ...this.toPersistableStatistics(stats),
            dataCompilazione: new Date(),
            note: ''
        };
        return this.buildXmlDiagnostics(allegato);
    }

    static buildXmlDiagnostics(allegato) {
        const mc = allegato.medicoCompetente;
        const mcProfile = mc?.tenantProfiles?.[0] || mc?.tenantProfile || {};
        const company = allegato.companyTenantProfile?.company;
        const stats = allegato.statistichePerRischio || {};
        const totaliSorveglianza = stats._totali || {};
        const lavoratoriPerGenere = allegato.lavoratoriPerGenere || {};
        const lavoratoriPerFasciaEta = allegato.lavoratoriPerFasciaEta || {};
        const visitePerTipologia = allegato.visitePerTipologia || {};
        const giudiziPerTipologia = allegato.giudiziPerTipologia || {};
        const malattieProf = allegato.malattieProf || {};
        const errors = [];
        const warnings = [];

        const requireField = (value, label) => {
            if (value === null || value === undefined || String(value).trim() === '') {
                errors.push(label);
            }
        };

        requireField(allegato.anno, 'Anno di riferimento mancante');
        requireField(mc?.taxCode, 'Codice fiscale medico competente mancante');
        requireField(mc?.lastName, 'Cognome medico competente mancante');
        requireField(mc?.firstName, 'Nome medico competente mancante');
        if (!mcProfile?.registerCode) {
            warnings.push('Numero iscrizione albo medico competente mancante');
        }
        requireField(company?.ragioneSociale, 'Ragione sociale azienda mancante');
        if (!company?.piva && !company?.codiceFiscale) errors.push('P.IVA o codice fiscale azienda mancante');
        if (!company?.codiceAteco) {
            warnings.push('Codice ATECO azienda mancante');
        }
        if (!company?.sedeLegaleIndirizzo || !company?.sedeLegaleCitta || !company?.sedeLegaleProvincia) {
            warnings.push('Sede legale azienda incompleta');
        }

        const fieldGroups = [
            {
                title: 'Intestazione',
                fields: [
                    { label: 'Anno riferimento', value: allegato.anno, required: true },
                    { label: 'Data compilazione', value: allegato.dataCompilazione || new Date(), type: 'date', required: true }
                ]
            },
            {
                title: 'Medico competente',
                fields: [
                    { label: 'Codice fiscale', value: mc?.taxCode, required: true },
                    { label: 'Cognome', value: mc?.lastName, required: true },
                    { label: 'Nome', value: mc?.firstName, required: true },
                    { label: 'Numero albo', value: mcProfile?.registerCode },
                    { label: 'Specializzazione', value: Array.isArray(mcProfile?.specialties) ? mcProfile.specialties.join(', ') : mcProfile?.specialties }
                ]
            },
            {
                title: 'Azienda',
                fields: [
                    { label: 'Ragione sociale', value: company?.ragioneSociale, required: true },
                    { label: 'Partita IVA', value: company?.piva },
                    { label: 'Codice fiscale', value: company?.codiceFiscale },
                    { label: 'Codice ATECO', value: company?.codiceAteco },
                    { label: 'Sede legale', value: [company?.sedeLegaleIndirizzo, company?.sedeLegaleCitta, company?.sedeLegaleCap, company?.sedeLegaleProvincia].filter(Boolean).join(', ') }
                ]
            },
            {
                title: 'Dati statistici',
                fields: [
                    { key: 'totLavoratoriSorvegliati', label: 'Lavoratori soggetti a sorveglianza', value: allegato.totLavoratoriSorvegliati || 0, editable: true },
                    { key: 'lavoratoriVisitati', label: 'Lavoratori visitati', value: totaliSorveglianza.lavoratoriVisitati || 0 },
                    { key: 'totVisiteEffettuate', label: 'Visite effettuate', value: allegato.totVisiteEffettuate || 0, editable: true },
                    { key: 'totGiudiziIdoneita', label: 'Giudizi di idoneità', value: allegato.totGiudiziIdoneita || 0, editable: true },
                    { key: 'totGiudiziConLimitazioni', label: 'Giudizi con limitazioni', value: allegato.totGiudiziConLimitazioni || 0, editable: true },
                    { key: 'totGiudiziConPrescrizioni', label: 'Giudizi con prescrizioni', value: allegato.totGiudiziConPrescrizioni || 0, editable: true },
                    { key: 'totInidoneita', label: 'Inidoneità', value: allegato.totInidoneita || 0, editable: true }
                ]
            },
            {
                title: 'Disaggregazioni XML',
                fields: [
                    { label: 'Lavoratori per genere', value: lavoratoriPerGenere, type: 'json' },
                    { label: 'Lavoratori per fascia età', value: lavoratoriPerFasciaEta, type: 'json' },
                    { label: 'Visite per tipologia', value: visitePerTipologia, type: 'json' },
                    { label: 'Giudizi per tipologia', value: giudiziPerTipologia, type: 'json' },
                    { label: 'Rischi lavorativi', value: Object.fromEntries(Object.entries(stats).filter(([key]) => !key.startsWith('_'))), type: 'json' },
                    { label: 'Malattie professionali', value: malattieProf, type: 'json' },
                    { label: 'Giudizi per rischio', value: allegato.giudiziPerRischio || {}, type: 'json' },
                    { label: 'Accertamenti integrativi', value: allegato.accertamentiIntegrativi || {}, type: 'json' }
                ]
            }
        ];

        return { valid: errors.length === 0, errors, warnings, fieldGroups };
    }

    /**
     * Costruisce XML conforme allo schema INAIL per la Relazione Annuale (D.Lgs 81/08 Art. 40)
     * 
     * Sezioni normativa:
     * - Intestazione con anno e data compilazione
     * - MedicoCompetente: CF, nome, cognome, albo, specializzazione
     * - Azienda: ragione sociale, PIVA, CF, ATECO, sede legale, settore
     * - DatiStatistici: lavoratori sorvegliati, visite, giudizi idoneità
     * - LavoratoriPerGenere: disaggregazione M/F/Altro
     * - LavoratoriPerFasciaEta: disaggregazione per fasce età
     * - VisitePerTipologia: preventive, periodiche, straordinarie, etc.
     * - GiudiziPerTipologia: dettaglio per tipo giudizio
     * - RischiLavorativi: codice, lavoratori esposti, livello esposizione
     * - MalattieProfessionali: segnalazioni nell'anno
     * - GiudiziPerRischio: giudizi di idoneità disaggregati per codice rischio
     * - AccertamentiIntegrativi: esami strumentali (audiometria, spirometria, ECG)
     * 
     * @param {Object} allegato - Record Allegato3B con include
     */
    static buildXML(allegato) {
        const mc = allegato.medicoCompetente;
        const mcProfile = mc?.tenantProfiles?.[0];
        const company = allegato.companyTenantProfile?.company;
        const sites = allegato.companyTenantProfile?.sites || [];
        const stats = allegato.statistichePerRischio || {};
        const totaliSorveglianza = stats._totali || {};
        const occupatiDateRiferimento = stats._occupatiDateRiferimento || {};
        const lavoratoriPerGenere = allegato.lavoratoriPerGenere || {};
        const lavoratoriPerFasciaEta = allegato.lavoratoriPerFasciaEta || {};
        const visitePerTipologia = allegato.visitePerTipologia || {};
        const giudiziPerTipologia = allegato.giudiziPerTipologia || {};
        const malattieProf = allegato.malattieProf || {};
        const dataCompilazione = allegato.dataCompilazione
            ? new Date(allegato.dataCompilazione).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        // Header XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<RelazioneAnnualeMC xmlns="http://www.inail.it/relazione-annuale" version="2.0" anno="${allegato.anno}">
  <!-- Relazione annuale del Medico Competente - D.Lgs 81/08 Art. 40 -->
  <!-- Dati anonimizzati e aggregati per conformità GDPR -->
  
  <Intestazione>
    <AnnoRiferimento>${allegato.anno}</AnnoRiferimento>
    <DataCompilazione>${dataCompilazione}</DataCompilazione>
  </Intestazione>
  
  <MedicoCompetente>
    <CodiceFiscale>${this.escapeXml(mc?.taxCode || '')}</CodiceFiscale>
    <Cognome>${this.escapeXml(mc?.lastName || '')}</Cognome>
    <Nome>${this.escapeXml(mc?.firstName || '')}</Nome>
    <NumeroAlbo>${this.escapeXml(mcProfile?.registerCode || '')}</NumeroAlbo>
    <Specializzazione>${this.escapeXml((mcProfile?.specialties || []).join(', '))}</Specializzazione>
  </MedicoCompetente>
  
  <Azienda>
    <RagioneSociale>${this.escapeXml(company?.ragioneSociale || '')}</RagioneSociale>
    <PartitaIVA>${this.escapeXml(company?.piva || '')}</PartitaIVA>
    <CodiceFiscale>${this.escapeXml(company?.codiceFiscale || '')}</CodiceFiscale>
    <CodiceATECO>${this.escapeXml(company?.codiceAteco || '')}</CodiceATECO>
    <SedeLegale>
      <Indirizzo>${this.escapeXml(company?.sedeLegaleIndirizzo || '')}</Indirizzo>
      <Citta>${this.escapeXml(company?.sedeLegaleCitta || '')}</Citta>
      <CAP>${this.escapeXml(company?.sedeLegaleCap || '')}</CAP>
      <Provincia>${this.escapeXml(company?.sedeLegaleProvincia || '')}</Provincia>
    </SedeLegale>
    <Settore>${this.escapeXml(company?.settore || '')}</Settore>
    <Dimensione>${this.escapeXml(company?.dimensione || '')}</Dimensione>${sites.length > 0 ? `
    <UnitaProduttive>${sites.map(s => `
      <UnitaProduttiva>
        <Denominazione>${this.escapeXml(s.siteName || '')}</Denominazione>
        <NumeroPAT>${this.escapeXml(s.numeroPAT || '')}</NumeroPAT>
        <Indirizzo>${this.escapeXml(s.indirizzo || '')}</Indirizzo>
        <Citta>${this.escapeXml(s.citta || '')}</Citta>
        <CAP>${this.escapeXml(s.cap || '')}</CAP>
        <Provincia>${this.escapeXml(s.provincia || '')}</Provincia>
      </UnitaProduttiva>`).join('')}
    </UnitaProduttive>` : ''}
  </Azienda>
  
  <DatiStatistici>
    <OccupatiAl30Giugno>
      <Totale>${totaliSorveglianza.occupatiAl30Giugno || 0}</Totale>
      <Maschi>${occupatiDateRiferimento.al30Giugno?.perGenere?.maschi || 0}</Maschi>
      <Femmine>${occupatiDateRiferimento.al30Giugno?.perGenere?.femmine || 0}</Femmine>
    </OccupatiAl30Giugno>
    <OccupatiAl31Dicembre>
      <Totale>${totaliSorveglianza.occupatiAl31Dicembre || 0}</Totale>
      <Maschi>${occupatiDateRiferimento.al31Dicembre?.perGenere?.maschi || 0}</Maschi>
      <Femmine>${occupatiDateRiferimento.al31Dicembre?.perGenere?.femmine || 0}</Femmine>
    </OccupatiAl31Dicembre>
    <LavoratoriSorvegliati>${allegato.totLavoratoriSorvegliati || 0}</LavoratoriSorvegliati>
    <LavoratoriVisitati>${totaliSorveglianza.lavoratoriVisitati || 0}</LavoratoriVisitati>
    <VisiteEffettuate>${allegato.totVisiteEffettuate || 0}</VisiteEffettuate>
    <GiudiziIdoneita>
      <Totale>${allegato.totGiudiziIdoneita || 0}</Totale>
      <ConLimitazioni>${allegato.totGiudiziConLimitazioni || 0}</ConLimitazioni>
      <ConPrescrizioni>${allegato.totGiudiziConPrescrizioni || 0}</ConPrescrizioni>
      <Inidoneita>${allegato.totInidoneita || 0}</Inidoneita>
    </GiudiziIdoneita>
  </DatiStatistici>
  
  <LavoratoriPerGenere>
    <Maschi>${lavoratoriPerGenere.maschi || 0}</Maschi>
    <Femmine>${lavoratoriPerGenere.femmine || 0}</Femmine>
    <Altro>${lavoratoriPerGenere.altro || 0}</Altro>
  </LavoratoriPerGenere>
  
  <LavoratoriPerFasciaEta>
    <Sotto18>${lavoratoriPerFasciaEta['sotto18'] || 0}</Sotto18>
    <Fascia18_25>${lavoratoriPerFasciaEta['18-25'] || 0}</Fascia18_25>
    <Fascia26_35>${lavoratoriPerFasciaEta['26-35'] || 0}</Fascia26_35>
    <Fascia36_45>${lavoratoriPerFasciaEta['36-45'] || 0}</Fascia36_45>
    <Fascia46_55>${lavoratoriPerFasciaEta['46-55'] || 0}</Fascia46_55>
    <Oltre55>${lavoratoriPerFasciaEta['oltre55'] || 0}</Oltre55>
  </LavoratoriPerFasciaEta>`;

        // Visite per tipologia (D.Lgs 81/08 Art. 41)
        const tipiVisita = Object.entries(visitePerTipologia);
        if (tipiVisita.length > 0) {
            xml += `
  
  <VisitePerTipologia>`;
            tipiVisita.forEach(([tipo, count]) => {
                xml += `
    <Visita>
      <Tipo>${this.escapeXml(tipo)}</Tipo>
      <Quantita>${count}</Quantita>
    </Visita>`;
            });
            xml += `
  </VisitePerTipologia>`;
        }

        // Giudizi per tipologia (dettaglio D.Lgs 81/08 Art. 41)
        const tipiGiudizio = Object.entries(giudiziPerTipologia);
        if (tipiGiudizio.length > 0) {
            xml += `
  
  <GiudiziPerTipologia>`;
            tipiGiudizio.forEach(([tipo, count]) => {
                xml += `
    <Giudizio>
      <TipoGiudizio>${this.escapeXml(tipo)}</TipoGiudizio>
      <Quantita>${count}</Quantita>
    </Giudizio>`;
            });
            xml += `
  </GiudiziPerTipologia>`;
        }

        // Rischi lavorativi
        xml += `
  
  <RischiLavorativi>`;
        Object.entries(stats).forEach(([codice, data]) => {
            if (codice.startsWith('_')) return;
            xml += `
    <Rischio>
      <Codice>${this.escapeXml(codice)}</Codice>
      <LavoratoriEsposti>${data.lavoratoriEsposti || 0}</LavoratoriEsposti>
      <LivelloEsposizione>
        <Basso>${data.perLivello?.BASSO || 0}</Basso>
        <Medio>${data.perLivello?.MEDIO || 0}</Medio>
        <Alto>${data.perLivello?.ALTO || 0}</Alto>
        <MoltoAlto>${data.perLivello?.MOLTO_ALTO || 0}</MoltoAlto>
      </LivelloEsposizione>
    </Rischio>`;
        });
        xml += `
  </RischiLavorativi>
  
  <MalattieProfessionali>
    <Totale>${malattieProf.totale || 0}</Totale>${Object.values(malattieProf.perPatologia || {}).map(p => `
    <Patologia>
      <CodiceICD10>${this.escapeXml(p.codice || '')}</CodiceICD10>
      <Denominazione>${this.escapeXml(p.denominazione || '')}</Denominazione>
      <Sospette>${p.sospette || 0}</Sospette>
      <Accertate>${p.accertate || 0}</Accertate>
    </Patologia>`).join('')}
  </MalattieProfessionali>
  
  <GiudiziPerRischio>${Object.entries(allegato.giudiziPerRischio || {}).map(([codice, data]) => `
    <Rischio>
      <CodiceRischio>${this.escapeXml(codice)}</CodiceRischio>
      <Idonei>${data.idonei || 0}</Idonei>
      <IdoneiConLimitazioni>${data.conLimitazioni || 0}</IdoneiConLimitazioni>
      <IdoneiConPrescrizioni>${data.conPrescrizioni || 0}</IdoneiConPrescrizioni>
      <NonIdonei>${data.nonIdonei || 0}</NonIdonei>
      <Totale>${data.totale || 0}</Totale>
    </Rischio>`).join('')}
  </GiudiziPerRischio>
  
  <AccertamentiIntegrativi>
    <Totale>${allegato.accertamentiIntegrativi?.totale || 0}</Totale>${Object.entries(allegato.accertamentiIntegrativi?.perTipo || {}).map(([tipo, data]) => `
    <Accertamento>
      <TipoDispositivo>${this.escapeXml(tipo)}</TipoDispositivo>
      <Denominazione>${this.escapeXml(data.denominazione || tipo)}</Denominazione>
      <Eseguiti>${data.eseguiti || 0}</Eseguiti>
      <Completati>${data.completati || 0}</Completati>
    </Accertamento>`).join('')}
  </AccertamentiIntegrativi>
  
  <Note>${this.escapeXml(allegato.note || '')}</Note>
</RelazioneAnnualeMC>`;

        return xml;
    }

    /**
     * Escape caratteri speciali per XML
     */
    static escapeXml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Lista Allegati 3B per tenant con filtri
     */
    static async findAll(tenantId, options = {}) {
        const {
            page = 1,
            limit = 20,
            medicoCompetenteId,
            companyTenantProfileId,
            anno,
            stato
        } = options;

        const where = {
            tenantId,
            deletedAt: null,
            ...(medicoCompetenteId && { medicoCompetenteId }),
            ...(companyTenantProfileId && { companyTenantProfileId }),
            ...(anno && { anno: parseInt(anno) }),
            ...(stato && { stato })
        };

        const [data, total] = await prisma.$transaction([
            prisma.allegato3B.findMany({
                where,
                include: {
                    medicoCompetente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    companyTenantProfile: {
                        include: {
                            company: {
                                select: {
                                    ragioneSociale: true,
                                    piva: true,
                                    codiceFiscale: true
                                }
                            }
                        }
                    }
                },
                orderBy: [{ anno: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.allegato3B.count({ where })
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Trova singolo Allegato 3B
     */
    static async findById(id, tenantId) {
        return await prisma.allegato3B.findFirst({
            where: {
                id,
                tenantId,
                deletedAt: null
            },
            include: {
                medicoCompetente: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true
                    }
                },
                companyTenantProfile: {
                    include: {
                        company: true
                    }
                }
            }
        });
    }

    /**
     * Aggiorna stato invio
     */
    static async updateStatoInvio(id, stato, datiInvio, tenantId) {
        return await prisma.allegato3B.update({
            where: { id },
            data: {
                stato,
                ...(stato === 'INVIATO' && {
                    dataInvio: new Date(),
                    protocolloInvio: datiInvio?.protocollo,
                    ricevutaInvio: datiInvio?.ricevuta
                }),
                ...(stato === 'CONFERMATO' && {
                    dataConferma: new Date()
                })
            }
        });
    }

    /**
     * Elimina (soft delete) Allegato 3B
     */
    static async delete(id, tenantId) {
        const allegato = await prisma.allegato3B.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!allegato) {
            throw new Error(`Allegato 3B non trovato: ${id}`);
        }

        if (allegato.stato === 'INVIATO' || allegato.stato === 'CONFERMATO') {
            throw new Error('Non è possibile eliminare un Allegato 3B già inviato');
        }

        return await prisma.allegato3B.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }

    /**
     * Dashboard aggregata multi-azienda - Relazione Sanitaria Annuale
     * 
     * Aggrega statistiche di TUTTE le aziende del tenant per un dato anno.
     * Usata per report dirigenziali e panoramica globale MDL.
     * 
     * @param {number} anno - Anno di riferimento
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Statistiche aggregate
     */
    static async getAnnualDashboard(anno, tenantId) {
        logger.info({ anno, tenantId }, 'Generazione dashboard annuale aggregata MDL');

        const inizioAnno = new Date(anno, 0, 1);
        const fineAnno = new Date(anno, 11, 31, 23, 59, 59);

        // 1. Conteggio aziende con sorveglianza sanitaria attiva
        const aziendeAttive = await prisma.companyTenantProfile.count({
            where: {
                tenantId,
                deletedAt: null,
                isActive: true,
                sites: {
                    some: {
                        deletedAt: null,
                        mansioni: {
                            some: {
                                deletedAt: null,
                                protocolloSanitarioId: { not: null }
                            }
                        }
                    }
                }
            }
        });

        // 2. Statistiche lavoratori aggregati per tutto il tenant
        const lavoratoriAggregate = await prisma.visita.findMany({
            where: {
                tenantId,
                deletedAt: null,
                tipoVisitaMDL: { not: null },
                dataOra: { gte: inizioAnno, lte: fineAnno }
            },
            select: {
                pazienteId: true,
                paziente: { select: { gender: true, birthDate: true } }
            },
            distinct: ['pazienteId']
        });

        const oggi = new Date();
        const lavoratoriStats = {
            totale: lavoratoriAggregate.length,
            perGenere: {
                maschi: lavoratoriAggregate.filter(l => l.paziente?.gender === 'MALE').length,
                femmine: lavoratoriAggregate.filter(l => l.paziente?.gender === 'FEMALE').length,
                altro: lavoratoriAggregate.filter(l => !['MALE', 'FEMALE'].includes(l.paziente?.gender)).length
            },
            perFasciaEta: { 'sotto18': 0, '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, 'oltre55': 0 }
        };

        lavoratoriAggregate.forEach(l => {
            if (!l.paziente?.birthDate) return;
            const eta = Math.floor((oggi.getTime() - new Date(l.paziente.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (eta < 18) lavoratoriStats.perFasciaEta['sotto18']++;
            else if (eta <= 25) lavoratoriStats.perFasciaEta['18-25']++;
            else if (eta <= 35) lavoratoriStats.perFasciaEta['26-35']++;
            else if (eta <= 45) lavoratoriStats.perFasciaEta['36-45']++;
            else if (eta <= 55) lavoratoriStats.perFasciaEta['46-55']++;
            else lavoratoriStats.perFasciaEta['oltre55']++;
        });

        // 3. Visite aggregate per tutto il tenant
        const visiteGrouped = await prisma.visita.groupBy({
            by: ['tipoVisitaMDL'],
            where: {
                tenantId,
                deletedAt: null,
                tipoVisitaMDL: { not: null },
                dataOra: { gte: inizioAnno, lte: fineAnno }
            },
            _count: { id: true }
        });

        const visiteStats = {
            totale: visiteGrouped.reduce((sum, v) => sum + v._count.id, 0),
            perTipologia: Object.fromEntries(visiteGrouped.map(v => [v.tipoVisitaMDL, v._count.id]))
        };

        // 4. Giudizi aggregati
        const giudiziGrouped = await prisma.giudizioIdoneita.groupBy({
            by: ['tipoGiudizio'],
            where: {
                tenantId,
                deletedAt: null,
                dataEmissione: { gte: inizioAnno, lte: fineAnno }
            },
            _count: { id: true }
        });

        const giudiziStats = {
            totale: giudiziGrouped.reduce((sum, g) => sum + g._count.id, 0),
            idonei: giudiziGrouped.find(g => g.tipoGiudizio === 'IDONEO')?._count.id || 0,
            conLimitazioni: giudiziGrouped.find(g => g.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI')?._count.id || 0,
            conPrescrizioni: giudiziGrouped.find(g => g.tipoGiudizio === 'IDONEO_CON_PRESCRIZIONI')?._count.id || 0,
            inidoneiTemporanei: giudiziGrouped.find(g => g.tipoGiudizio === 'NON_IDONEO_TEMPORANEO')?._count.id || 0,
            inidoneiPermanenti: giudiziGrouped.find(g => g.tipoGiudizio === 'NON_IDONEO_PERMANENTE')?._count.id || 0,
            perTipologia: Object.fromEntries(giudiziGrouped.map(g => [g.tipoGiudizio, g._count.id]))
        };

        // 5. Trend mensile visite
        const visiteMensili = await prisma.$queryRaw`
            SELECT 
                EXTRACT(MONTH FROM "dataOra") as mese,
                COUNT(*)::int as count
            FROM visite
            WHERE "tenantId" = ${tenantId}
            AND "deletedAt" IS NULL
            AND "tipoVisitaMDL" IS NOT NULL
            AND "dataOra" >= ${inizioAnno}
            AND "dataOra" <= ${fineAnno}
            GROUP BY mese
            ORDER BY mese
        `;

        const trendMensile = Array.from({ length: 12 }, (_, i) => {
            const mese = i + 1;
            const dato = visiteMensili.find(v => Number(v.mese) === mese);
            return { mese, count: dato?.count || 0 };
        });

        // 6. Allegati 3B status
        const allegatiStatus = await prisma.allegato3B.groupBy({
            by: ['stato'],
            where: { tenantId, anno, deletedAt: null },
            _count: { id: true }
        });

        const allegatiStats = {
            totaleAziende: aziendeAttive,
            allegatiCreati: allegatiStatus.reduce((sum, a) => sum + a._count.id, 0),
            perStato: Object.fromEntries(allegatiStatus.map(a => [a.stato || 'DA_COMPILARE', a._count.id]))
        };

        // 7. Top rischi per lavoratori esposti
        const rischiAggregate = await prisma.mansioneRischio.groupBy({
            by: ['codiceRischio'],
            where: { tenantId, deletedAt: null },
            _count: { id: true }
        });

        const topRischi = rischiAggregate
            .sort((a, b) => b._count.id - a._count.id)
            .slice(0, 10)
            .map(r => ({ codice: r.codiceRischio, count: r._count.id }));

        return {
            anno,
            dataGenerazione: new Date().toISOString(),
            aziende: { attive: aziendeAttive },
            lavoratori: lavoratoriStats,
            visite: visiteStats,
            giudizi: giudiziStats,
            trendMensile,
            allegati3B: allegatiStats,
            topRischi,
            kpi: {
                tassoIdoneita: giudiziStats.totale > 0
                    ? Math.round((giudiziStats.idonei / giudiziStats.totale) * 100)
                    : 0,
                tassoLimitazioni: giudiziStats.totale > 0
                    ? Math.round(((giudiziStats.conLimitazioni + giudiziStats.conPrescrizioni) / giudiziStats.totale) * 100)
                    : 0,
                visitePerLavoratore: lavoratoriStats.totale > 0
                    ? Math.round((visiteStats.totale / lavoratoriStats.totale) * 100) / 100
                    : 0
            }
        };
    }
}

export default Allegato3BService;
