/**
 * ScadenzeMDLService - Servizio per aggregazione scadenze Medicina del Lavoro
 * 
 * Gestisce l'aggregazione di tutte le scadenze MDL:
 * - Nomine MC/RSPP in scadenza
 * - Giudizi idoneità in scadenza
 * - Visite periodiche da programmare
 * - Sopralluoghi in scadenza
 * - Protocolli sanitari da rinnovare
 * 
 * @version 1.0.0
 * @since P56 - Medicina del Lavoro
 * @author GitHub Copilot
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

/**
 * Converte la periodicità di una ProtocolloPrestazione in mesi.
 * Usa periodicitaCustomMesi se impostato, altrimenti converte l'enum.
 * @param {Object} pp - ProtocolloPrestazione
 * @returns {number} mesi (0 = UNA_TANTUM)
 */
function periodicitaMesiFromProtocolloPrestazione(pp) {
    if (pp.periodicitaCustomMesi) return pp.periodicitaCustomMesi;
    switch (pp.periodicita) {
        case 'MESI_6': return 6;
        case 'MESI_12': return 12;
        case 'MESI_24': return 24;
        case 'MESI_36': return 36;
        case 'MESI_60': return 60;
        case 'UNA_TANTUM': return 0;
        default: return null; // usa il default del protocollo
    }
}


/**
 * Categorie di scadenza per la dashboard
 */
const CATEGORIE_SCADENZA = {
    NOMINA_MC: 'nomina_mc',
    NOMINA_RSPP: 'nomina_rspp',
    GIUDIZIO_IDONEITA: 'giudizio_idoneita',
    VISITA_PERIODICA: 'visita_periodica',
    SOPRALLUOGO: 'sopralluogo',
    PROTOCOLLO_SANITARIO: 'protocollo_sanitario',
    DVR: 'dvr'
};

/**
 * Livelli di urgenza
 */
const LIVELLI_URGENZA = {
    SCADUTO: 'scaduto',        // Già scaduto
    CRITICO: 'critico',        // < 7 giorni
    URGENTE: 'urgente',        // 7-30 giorni
    ATTENZIONE: 'attenzione',  // 30-60 giorni
    PROGRAMMATO: 'programmato' // > 60 giorni
};

const ScadenzeMDLService = {
    /**
     * Ottiene tutte le scadenze MDL per un tenant
     * @param {string} tenantId - ID tenant
     * @param {Object} filters - Filtri opzionali
     * @returns {Promise<Object>} Scadenze aggregate
     */
    async getAllScadenze(tenantId, filters = {}) {
        const {
            companyTenantProfileId,
            siteId,
            categoria,
            livelloUrgenza,
            dataInizio,
            dataFine,
            limit = 100,
            includePrenotate = false
        } = filters;

        logger.info({ tenantId, filters }, 'ScadenzeMDLService.getAllScadenze');

        const today = new Date();
        const dataFineDefault = dataFine || new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 giorni default

        // Esegui tutte le query in parallelo
        const [
            nomineMC,
            nomineRSPP,
            giudizi,
            visitePeriodiche,
            sopralluoghi,
            dvrs,
            scadenzePrestazioni
        ] = await Promise.all([
            this.getScadenzeNomineMC(tenantId, { companyTenantProfileId, siteId, dataFine: dataFineDefault }),
            this.getScadenzeNomineRSPP(tenantId, { companyTenantProfileId, siteId, dataFine: dataFineDefault }),
            this.getScadenzeGiudizi(tenantId, { companyTenantProfileId, dataFine: dataFineDefault }),
            this.getVisitePeriodicheDaProgrammare(tenantId, { companyTenantProfileId, dataFine: dataFineDefault }),
            this.getScadenzeSopralluoghi(tenantId, { companyTenantProfileId, siteId, dataFine: dataFineDefault }),
            this.getScadenzeDVR(tenantId, { siteId, dataFine: dataFineDefault }),
            this.getScadenzePrestazioni(tenantId, { companyTenantProfileId, dataFine: dataFineDefault, includePrenotate })
        ]);

        // Combina tutte le scadenze
        let scadenze = [
            ...nomineMC,
            ...nomineRSPP,
            ...giudizi,
            ...visitePeriodiche,
            ...sopralluoghi,
            ...dvrs,
            ...scadenzePrestazioni
        ];

        // Applica filtri categoria
        if (categoria) {
            scadenze = scadenze.filter(s => s.categoria === categoria);
        }

        // Applica filtri urgenza
        if (livelloUrgenza) {
            scadenze = scadenze.filter(s => s.livelloUrgenza === livelloUrgenza);
        }

        // Ordina per urgenza (scaduti prima, poi per data)
        scadenze.sort((a, b) => {
            const urgenzaOrdine = {
                [LIVELLI_URGENZA.SCADUTO]: 0,
                [LIVELLI_URGENZA.CRITICO]: 1,
                [LIVELLI_URGENZA.URGENTE]: 2,
                [LIVELLI_URGENZA.ATTENZIONE]: 3,
                [LIVELLI_URGENZA.PROGRAMMATO]: 4
            };

            const ordineA = urgenzaOrdine[a.livelloUrgenza] ?? 5;
            const ordineB = urgenzaOrdine[b.livelloUrgenza] ?? 5;

            if (ordineA !== ordineB) return ordineA - ordineB;
            return new Date(a.dataScadenza) - new Date(b.dataScadenza);
        });

        // Applica limit
        scadenze = scadenze.slice(0, limit);

        // Calcola statistiche
        const statistiche = this.calcolaStatistiche(scadenze);

        return {
            scadenze,
            statistiche,
            filtri: {
                dataInizio: dataInizio || today.toISOString(),
                dataFine: dataFineDefault.toISOString(),
                totale: scadenze.length
            }
        };
    },

    /**
     * Ottiene le scadenze delle nomine Medico Competente
     */
    async getScadenzeNomineMC(tenantId, filters = {}) {
        const { companyTenantProfileId, siteId, dataFine } = filters;
        const today = new Date();

        const where = {
            tenantId,
            deletedAt: null,
            tipoRuolo: 'MEDICO_COMPETENTE',
            stato: { in: ['ATTIVA', 'SCADUTA'] }
        };

        if (companyTenantProfileId) {
            where.companyTenantProfileId = companyTenantProfileId;
        }

        if (siteId) {
            where.siteId = siteId;
        }

        // Include nomine scadute o in scadenza entro dataFine
        where.OR = [
            { dataScadenza: { lte: today } }, // Già scadute
            {
                dataScadenza: {
                    gt: today,
                    lte: dataFine
                }
            }
        ];

        const nomine = await prisma.nominaRuolo.findMany({
            where,
            include: {
                companyTenantProfile: {
                    include: {
                        company: {
                            select: { ragioneSociale: true, piva: true }
                        }
                    }
                },
                site: {
                    select: { siteName: true, citta: true }
                },
                person: {
                    select: { firstName: true, lastName: true, id: true }
                }
            }
        });

        return nomine.map(nomina => ({
            id: nomina.id,
            categoria: CATEGORIE_SCADENZA.NOMINA_MC,
            tipo: 'Nomina Medico Competente',
            descrizione: this.buildDescrizioneNomina(nomina),
            dataScadenza: nomina.dataScadenza,
            livelloUrgenza: this.calcolaLivelloUrgenza(nomina.dataScadenza),
            giorniAllaScadenza: this.calcolaGiorniAllaScadenza(nomina.dataScadenza),
            entita: {
                tipo: 'NominaRuolo',
                id: nomina.id,
                persona: nomina.person ? `${nomina.person.lastName} ${nomina.person.firstName}` : null,
                personaId: nomina.person?.id,
                azienda: nomina.companyTenantProfile?.company?.ragioneSociale,
                companyTenantProfileId: nomina.companyTenantProfileId,
                sede: nomina.site?.siteName,
                siteId: nomina.siteId
            },
            azioni: [
                { tipo: 'rinnova', label: 'Rinnova nomina', url: `/clinica/nomine/${nomina.id}/rinnova` },
                { tipo: 'visualizza', label: 'Visualizza', url: `/clinica/nomine/${nomina.id}` }
            ]
        }));
    },

    /**
     * Ottiene le scadenze delle nomine RSPP
     */
    async getScadenzeNomineRSPP(tenantId, filters = {}) {
        const { companyTenantProfileId, siteId, dataFine } = filters;
        const today = new Date();

        const where = {
            tenantId,
            deletedAt: null,
            tipoRuolo: 'RSPP',
            stato: { in: ['ATTIVA', 'SCADUTA'] }
        };

        if (companyTenantProfileId) {
            where.companyTenantProfileId = companyTenantProfileId;
        }

        if (siteId) {
            where.siteId = siteId;
        }

        where.OR = [
            { dataScadenza: { lte: today } },
            { dataScadenza: { gt: today, lte: dataFine } }
        ];

        const nomine = await prisma.nominaRuolo.findMany({
            where,
            include: {
                companyTenantProfile: {
                    include: {
                        company: { select: { ragioneSociale: true } }
                    }
                },
                site: { select: { siteName: true, citta: true } },
                person: { select: { firstName: true, lastName: true, id: true } }
            }
        });

        return nomine.map(nomina => ({
            id: nomina.id,
            categoria: CATEGORIE_SCADENZA.NOMINA_RSPP,
            tipo: 'Nomina RSPP',
            descrizione: this.buildDescrizioneNomina(nomina),
            dataScadenza: nomina.dataScadenza,
            livelloUrgenza: this.calcolaLivelloUrgenza(nomina.dataScadenza),
            giorniAllaScadenza: this.calcolaGiorniAllaScadenza(nomina.dataScadenza),
            entita: {
                tipo: 'NominaRuolo',
                id: nomina.id,
                persona: nomina.person ? `${nomina.person.lastName} ${nomina.person.firstName}` : null,
                personaId: nomina.person?.id,
                azienda: nomina.companyTenantProfile?.company?.ragioneSociale,
                companyTenantProfileId: nomina.companyTenantProfileId,
                sede: nomina.site?.siteName,
                siteId: nomina.siteId
            },
            azioni: [
                { tipo: 'rinnova', label: 'Rinnova nomina', url: `/clinica/nomine/${nomina.id}/rinnova` }
            ]
        }));
    },

    /**
     * Ottiene le scadenze dei giudizi di idoneità
     */
    async getScadenzeGiudizi(tenantId, filters = {}) {
        const { companyTenantProfileId, dataFine } = filters;
        const today = new Date();

        const where = {
            tenantId,
            deletedAt: null
        };

        // P59 FIX: Il modello GiudizioIdoneita non ha companyTenantProfileId direttamente
        // Deve filtrare attraverso person -> tenantProfiles -> companyTenantProfileId
        if (companyTenantProfileId) {
            where.person = {
                tenantProfiles: {
                    some: {
                        tenantId,
                        deletedAt: null,
                        companyTenantProfileId: companyTenantProfileId
                    }
                }
            };
        }

        // Giudizi scaduti o in scadenza
        where.OR = [
            { dataScadenza: { lte: today } },
            { dataScadenza: { gt: today, lte: dataFine } }
        ];

        const giudizi = await prisma.giudizioIdoneita.findMany({
            where,
            include: {
                visita: {
                    include: {
                        paziente: {
                            include: {
                                tenantProfiles: {
                                    where: { tenantId, deletedAt: null },
                                    select: {
                                        email: true,
                                        companyTenantProfileId: true,
                                        companyTenantProfile: {
                                            include: {
                                                company: { select: { ragioneSociale: true } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                mansioni: {
                    include: {
                        mansione: {
                            select: { denominazione: true, codice: true }
                        }
                    }
                }
            }
        });

        // Deduplication: escludi giudizi già coperti da ScadenzaPrestazioneProtocollo attiva.
        // Quando programmaPrestazioniDopoVisita crea ScadenzaPrestazioneProtocollo per la prossima visita,
        // la data scadenza del giudizio e quella della scadenza protocollo sono le stesse → evitare duplicati.
        const pairsGiudizi = giudizi.flatMap(g =>
            (g.mansioni || []).map(m => ({ personId: g.personId, mansioneId: m.mansioneId }))
        ).filter(p => p.personId && p.mansioneId);

        const giaCopertiByProtocollo = new Set();
        if (pairsGiudizi.length > 0) {
            const scadenzeEsistenti = await prisma.scadenzaPrestazioneProtocollo.findMany({
                where: {
                    tenantId,
                    eseguita: false,
                    deletedAt: null,
                    OR: pairsGiudizi
                },
                select: { personId: true, mansioneId: true }
            });
            for (const s of scadenzeEsistenti) {
                giaCopertiByProtocollo.add(`${s.personId}::${s.mansioneId}`);
            }
        }

        return giudizi
            .filter(giudizio => {
                const mansioni = giudizio.mansioni || [];
                if (mansioni.length === 0) return true;
                // Giudizio coperto solo se TUTTE le mansioni hanno scadenza protocollo
                return !mansioni.every(m => giaCopertiByProtocollo.has(`${giudizio.personId}::${m.mansioneId}`));
            })
            .map(giudizio => {
                const paziente = giudizio.visita?.paziente;
                const tenantProfile = paziente?.tenantProfiles?.[0];
                const companyProfile = tenantProfile?.companyTenantProfile;
                const mansioniNomi = giudizio.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || 'N/A';
                return {
                    id: giudizio.id,
                    categoria: CATEGORIE_SCADENZA.GIUDIZIO_IDONEITA,
                    tipo: 'Giudizio Idoneità',
                    descrizione: `${paziente?.lastName || ''} ${paziente?.firstName || ''} - ${mansioniNomi}`,
                    dataScadenza: giudizio.dataScadenza,
                    livelloUrgenza: this.calcolaLivelloUrgenza(giudizio.dataScadenza),
                    giorniAllaScadenza: this.calcolaGiorniAllaScadenza(giudizio.dataScadenza),
                    entita: {
                        tipo: 'GiudizioIdoneita',
                        id: giudizio.id,
                        persona: paziente ? `${paziente.lastName} ${paziente.firstName}` : null,
                        personaId: paziente?.id,
                        azienda: companyProfile?.company?.ragioneSociale,
                        companyTenantProfileId: tenantProfile?.companyTenantProfileId,
                        mansione: mansioniNomi,
                        mansioneIds: giudizio.mansioni?.map(m => m.mansioneId) || [],
                        esito: giudizio.tipoGiudizio
                    },
                    azioni: [
                        { tipo: 'programma_visita', label: 'Programma visita', url: `/clinica/visite/nuova?pazienteId=${paziente?.id}&tipo=MDL` },
                        { tipo: 'visualizza', label: 'Visualizza', url: `/clinica/giudizi/${giudizio.id}` }
                    ]
                };
            });
    },

    /**
     * Ottiene i lavoratori con visite periodiche da programmare
     */
    async getVisitePeriodicheDaProgrammare(tenantId, filters = {}) {
        const { companyTenantProfileId, dataFine } = filters;
        const today = new Date();

        // Query per trovare lavoratori con giudizio valido
        const giudiziAttivi = await prisma.giudizioIdoneita.findMany({
            where: {
                tenantId,
                deletedAt: null,
                dataScadenza: { gte: today, lte: dataFine }
            },
            include: {
                visita: {
                    include: {
                        paziente: {
                            include: {
                                tenantProfiles: {
                                    where: { tenantId, deletedAt: null },
                                    select: {
                                        companyTenantProfileId: true,
                                        companyTenantProfile: {
                                            include: {
                                                company: { select: { ragioneSociale: true } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                mansioni: {
                    include: {
                        mansione: {
                            select: {
                                denominazione: true,
                                protocolli: {
                                    take: 1,
                                    select: { denominazione: true, periodicitaVisiteMesi: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Filtra per companyTenantProfileId se specificato
        const filteredGiudizi = companyTenantProfileId
            ? giudiziAttivi.filter(g => g.visita?.paziente?.tenantProfiles?.[0]?.companyTenantProfileId === companyTenantProfileId)
            : giudiziAttivi;

        // Deduplication: escludi giudizi già coperti da ScadenzaPrestazioneProtocollo attiva.
        // Quando la visita è completata, programmaPrestazioniDopoVisita crea ScadenzaPrestazioneProtocollo
        // con la stessa data scadenza → evitare di mostrare entrambi come "visita_periodica".
        const personaMansioneKeys = new Set();
        for (const g of filteredGiudizi) {
            const personaId = g.visita?.paziente?.id;
            for (const m of (g.mansioni || [])) {
                if (personaId && m.mansioneId) {
                    personaMansioneKeys.add(`${personaId}::${m.mansioneId}`);
                }
            }
        }

        // Carica ScadenzaPrestazioneProtocollo attive per le stesse coppie persona+mansione
        const giaCopertiSet = new Set();
        if (personaMansioneKeys.size > 0) {
            const pairsArray = [...personaMansioneKeys].map(k => {
                const [personId, mansioneId] = k.split('::');
                return { personId, mansioneId };
            });
            // Batch query: cerca se esiste almeno una scadenza non eseguita per queste coppie
            const scadenzeEsistenti = await prisma.scadenzaPrestazioneProtocollo.findMany({
                where: {
                    tenantId,
                    eseguita: false,
                    deletedAt: null,
                    OR: pairsArray
                },
                select: { personId: true, mansioneId: true }
            });
            for (const s of scadenzeEsistenti) {
                giaCopertiSet.add(`${s.personId}::${s.mansioneId}`);
            }
        }

        // Filtra escludendo i giudizi già coperti da scadenze protocollo
        const giudiziDaMostrare = filteredGiudizi.filter(g => {
            const personaId = g.visita?.paziente?.id;
            const mansioni = g.mansioni || [];
            if (!personaId || mansioni.length === 0) return true;
            // Coperto solo se TUTTE le mansioni hanno scadenza protocollo
            return !mansioni.every(m => giaCopertiSet.has(`${personaId}::${m.mansioneId}`));
        });

        return giudiziDaMostrare.map(giudizio => {
            const paziente = giudizio.visita?.paziente;
            const tenantProfile = paziente?.tenantProfiles?.[0];
            const companyProfile = tenantProfile?.companyTenantProfile;
            const mansioniNomi = giudizio.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || 'N/A';
            const primoProtocollo = giudizio.mansioni?.find(m => m.mansione?.protocolli?.[0])?.mansione?.protocolli?.[0];
            return {
                id: `visita-${giudizio.id}`,
                categoria: CATEGORIE_SCADENZA.VISITA_PERIODICA,
                tipo: 'Visita Periodica',
                descrizione: `${paziente?.lastName || ''} ${paziente?.firstName || ''} - ${mansioniNomi}`,
                dataScadenza: giudizio.dataScadenza,
                livelloUrgenza: this.calcolaLivelloUrgenza(giudizio.dataScadenza),
                giorniAllaScadenza: this.calcolaGiorniAllaScadenza(giudizio.dataScadenza),
                entita: {
                    tipo: 'VisitaPeriodica',
                    giudizioId: giudizio.id,
                    persona: paziente ? `${paziente.lastName} ${paziente.firstName}` : null,
                    personaId: paziente?.id,
                    azienda: companyProfile?.company?.ragioneSociale,
                    companyTenantProfileId: tenantProfile?.companyTenantProfileId,
                    mansione: mansioniNomi,
                    protocollo: primoProtocollo?.denominazione,
                    periodicitaMesi: primoProtocollo?.periodicitaVisiteMesi
                },
                azioni: [
                    { tipo: 'programma_visita', label: 'Prenota visita', url: `/clinica/visite/nuova?pazienteId=${paziente?.id}&tipo=PERIODICA` },
                    { tipo: 'visualizza_giudizio', label: 'Ultimo giudizio', url: `/clinica/giudizi/${giudizio.id}` }
                ]
            };
        });
    },

    /**
     * Ottiene le scadenze per prestazioni di protocollo (per-prestazione scheduling)
     * Include prima visita (isPrimaVisita=true) e rinnovi periodici non ancora eseguiti.
     */
    async getScadenzePrestazioni(tenantId, filters = {}) {
        const { companyTenantProfileId, dataFine, includePrenotate = false } = filters;

        const where = {
            tenantId,
            eseguita: false,
            deletedAt: null,
            dataScadenza: { lte: dataFine }
        };
        if (!includePrenotate) {
            where.appuntamentoId = null; // Escludi scadenze già coperte da un appuntamento programmato
        }

        const scadenze = await prisma.scadenzaPrestazioneProtocollo.findMany({
            where,
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null },
                            select: {
                                companyTenantProfileId: true,
                                companyTenantProfile: {
                                    include: {
                                        company: { select: { ragioneSociale: true } }
                                    }
                                }
                            }
                        }
                    }
                },
                // P72_21: includi dati questionario per scadenze di tipo documentoTemplate
                documentoTemplate: { select: { id: true, nome: true } }
            },
            orderBy: { dataScadenza: 'asc' }
        });

        if (!scadenze.length) return [];

        // Filtro per companyTenantProfileId
        const filtered = companyTenantProfileId
            ? scadenze.filter(s => s.person?.tenantProfiles?.[0]?.companyTenantProfileId === companyTenantProfileId)
            : scadenze;

        if (!filtered.length) return [];

        // Carica mansioni e prestazioni in batch
        const mansioneIds = [...new Set(filtered.map(s => s.mansioneId))];
        const prestazioneIds = [...new Set(filtered.map(s => s.prestazioneId).filter(Boolean))]; // P72_21: filtra null (questionari)
        const protocolloIds = [...new Set(filtered.map(s => s.protocolloId))];

        const [mansioni, prestazioni, protocolloPrestazioni] = await Promise.all([
            prisma.mansione.findMany({ where: { id: { in: mansioneIds }, tenantId, deletedAt: null }, select: { id: true, denominazione: true } }),
            prisma.prestazione.findMany({ where: { id: { in: prestazioneIds }, tenantId, deletedAt: null }, select: { id: true, nome: true, codice: true } }),
            prisma.protocolloPrestazione.findMany({
                where: {
                    protocolloId: { in: protocolloIds },
                    prestazioneId: { in: prestazioneIds },
                    deletedAt: null,
                },
                select: { protocolloId: true, prestazioneId: true, isObbligatoria: true }
            })
        ]);

        const mansioniMap = new Map(mansioni.map(m => [m.id, m]));
        const prestazioniMap = new Map(prestazioni.map(p => [p.id, p]));
        // Mappa composita protocolloId::prestazioneId → isObbligatoria
        const protPresMap = new Map(
            protocolloPrestazioni.map(pp => [`${pp.protocolloId}::${pp.prestazioneId}`, pp.isObbligatoria])
        );

        // -------------------------------------------------------
        // RICONGIUNZIONE: raggruppa accertamenti per persona+mansione
        // con date entro 60 giorni nello stesso "slot visita".
        // Esempio: audiometria biennale (mese 24) + visita annuale (mese 24)
        // → un solo slot "Visita Protocollo (2 acc.)" invece di due voci separate.
        // Solo scadenze PERIODICA / PREVENTIVA (tutte le scadenze in questa tabella
        // derivano da protocollo e sono per natura periodiche o di prima assegnazione).
        // -------------------------------------------------------
        const FINESTRA_GIORNI = 60;
        const MS_PER_GIORNO = 24 * 60 * 60 * 1000;

        // Raggruppa per persona+mansione
        const gruppiMap = new Map(); // key = `${personId}::${mansioneId}`
        for (const s of filtered) {
            const key = `${s.personId}::${s.mansioneId}`;
            if (!gruppiMap.has(key)) gruppiMap.set(key, []);
            gruppiMap.get(key).push(s);
        }

        const risultati = [];

        for (const [, scadenzeGruppo] of gruppiMap) {
            // scadenzeGruppo già ordinate per dataScadenza (dalla query)
            // Sub-raggruppa in cluster: nuovo cluster se gap > FINESTRA_GIORNI
            const clusters = [];
            let clusterCorrente = null;

            for (const s of scadenzeGruppo) {
                const dataS = new Date(s.dataScadenza).getTime();
                if (!clusterCorrente || (dataS - clusterCorrente.dataFine) > FINESTRA_GIORNI * MS_PER_GIORNO) {
                    clusterCorrente = { dataInizio: dataS, dataFine: dataS, scadenze: [s] };
                    clusters.push(clusterCorrente);
                } else {
                    clusterCorrente.scadenze.push(s);
                    clusterCorrente.dataFine = Math.max(clusterCorrente.dataFine, dataS);
                }
            }

            for (const cluster of clusters) {
                const primaria = cluster.scadenze[0];
                const persona = primaria.person;
                const tenantProfile = persona?.tenantProfiles?.[0];
                const companyProfile = tenantProfile?.companyTenantProfile;
                const mansione = mansioniMap.get(primaria.mansioneId);
                const isPrimaVisita = cluster.scadenze.every(s => s.isPrimaVisita);
                const isRaggruppata = cluster.scadenze.length > 1;
                const isPrenotata = cluster.scadenze.some(s => s.appuntamentoId != null);
                const nomeLavoratore = persona ? `${persona.lastName} ${persona.firstName}` : '';
                const nomiPrestazioni = cluster.scadenze.map(s =>
                    s.prestazioneId
                        ? (prestazioniMap.get(s.prestazioneId)?.nome || 'Prestazione')
                        : (s.documentoTemplate?.nome || 'Questionario') // P72_21
                );

                const descrizione = isRaggruppata
                    ? `${nomeLavoratore} — ${cluster.scadenze.length} accertamenti (${mansione?.denominazione || 'N/A'})`
                    : `${nomeLavoratore} — ${nomiPrestazioni[0]} (${mansione?.denominazione || 'N/A'})`;

                // Data rappresentativa = la più urgente del cluster (min dataScadenza)
                const dataScadenzaRappresentativa = new Date(cluster.dataInizio);

                // Dettaglio prestazioni per frontend (uso opzionale espansione)
                const prestazioniDettaglio = cluster.scadenze.map(s => ({
                    scadenzaPrestazioneId: s.id,
                    prestazione: s.prestazioneId
                        ? (prestazioniMap.get(s.prestazioneId)?.nome || null)
                        : (s.documentoTemplate?.nome || 'Questionario'), // P72_21
                    prestazioneId: s.prestazioneId,
                    documentoTemplateId: s.documentoTemplateId, // P72_21
                    dataScadenza: s.dataScadenza,
                    periodicitaMesi: s.periodicitaMesi,
                    isObbligatoria: protPresMap.get(`${s.protocolloId}::${s.prestazioneId}`) ?? true
                }));

                risultati.push({
                    id: isRaggruppata
                        ? `visita-cluster-${primaria.personId}-${primaria.mansioneId}-${cluster.dataInizio}`
                        : `prestazione-${primaria.id}`,
                    categoria: CATEGORIE_SCADENZA.VISITA_PERIODICA,
                    tipo: isPrimaVisita ? 'Prima Visita' : (isRaggruppata ? `Visita Protocollo (${cluster.scadenze.length} acc.)` : 'Visita Periodica'),
                    descrizione,
                    dataScadenza: dataScadenzaRappresentativa,
                    livelloUrgenza: this.calcolaLivelloUrgenza(dataScadenzaRappresentativa),
                    giorniAllaScadenza: this.calcolaGiorniAllaScadenza(dataScadenzaRappresentativa),
                    isPrenotata,
                    entita: {
                        tipo: isPrimaVisita ? 'PrimaVisitaMDL' : 'VisitaPeriodicaPrestazione',
                        scadenzaPrestazioneId: primaria.id,
                        personaId: persona?.id,
                        persona: nomeLavoratore || null,
                        azienda: companyProfile?.company?.ragioneSociale,
                        companyTenantProfileId: tenantProfile?.companyTenantProfileId,
                        mansione: mansione?.denominazione,
                        prestazione: nomiPrestazioni[0],
                        prestazioneId: primaria.prestazioneId,
                        mansioneId: primaria.mansioneId,
                        protocolloId: primaria.protocolloId,
                        periodicitaMesi: primaria.periodicitaMesi,
                        isPrimaVisita,
                        isRaggruppata,
                        isPrenotata,
                        isObbligatoria: protPresMap.get(`${primaria.protocolloId}::${primaria.prestazioneId}`) ?? true,
                        prestazioni: isRaggruppata ? prestazioniDettaglio : undefined
                    },
                    azioni: [
                        {
                            tipo: 'programma_visita',
                            label: isPrimaVisita ? 'Prenota Prima Visita' : (isRaggruppata ? `Prenota visita (${cluster.scadenze.length} acc.)` : 'Prenota visita'),
                            url: `/clinica/visite/nuova?pazienteId=${persona?.id}&tipo=${isPrimaVisita ? 'PREVENTIVA' : 'PERIODICA'}`
                        }
                    ]
                });
            }
        }

        return risultati;
    },

    /**
     * Ottiene le scadenze dei sopralluoghi
     */
    async getScadenzeSopralluoghi(tenantId, filters = {}) {
        const { companyTenantProfileId, siteId, dataFine } = filters;
        const today = new Date();

        // Trova siti con sopralluogo scaduto o in scadenza
        const whereCondition = {
            tenantId,
            deletedAt: null
        };

        if (siteId) {
            whereCondition.id = siteId;
        }

        if (companyTenantProfileId) {
            whereCondition.companyTenantProfile = {
                id: companyTenantProfileId
            };
        }

        const sites = await prisma.companySite.findMany({
            where: {
                ...whereCondition,
                OR: [
                    { prossimoSopralluogo: { lte: today } },
                    { prossimoSopralluogo: { gt: today, lte: dataFine } }
                ]
            },
            include: {
                companyTenantProfile: {
                    include: {
                        company: { select: { ragioneSociale: true } }
                    }
                }
            }
        });

        return sites.map(site => ({
            id: `sopralluogo-${site.id}`,
            categoria: CATEGORIE_SCADENZA.SOPRALLUOGO,
            tipo: 'Sopralluogo',
            descrizione: `${site.siteName} - ${site.companyTenantProfile?.company?.ragioneSociale || 'N/A'}`,
            dataScadenza: site.prossimoSopralluogo,
            livelloUrgenza: this.calcolaLivelloUrgenza(site.prossimoSopralluogo),
            giorniAllaScadenza: this.calcolaGiorniAllaScadenza(site.prossimoSopralluogo),
            entita: {
                tipo: 'Sopralluogo',
                siteId: site.id,
                sede: site.siteName,
                indirizzo: `${site.indirizzo}, ${site.citta}`,
                azienda: site.companyTenantProfile?.company?.ragioneSociale,
                companyTenantProfileId: site.companyTenantProfileId,
                ultimoSopralluogo: site.ultimoSopralluogo
            },
            azioni: [
                { tipo: 'programma', label: 'Programma sopralluogo', url: `/clinica/sopralluoghi/nuovo?siteId=${site.id}` },
                { tipo: 'visualizza_sede', label: 'Dettagli sede', url: `/clinica/sedi/${site.id}` }
            ]
        }));
    },

    /**
     * Ottiene le scadenze DVR
     */
    async getScadenzeDVR(tenantId, filters = {}) {
        const { siteId, dataFine } = filters;
        const today = new Date();

        const where = {
            tenantId,
            deletedAt: null
        };

        if (siteId) {
            where.siteId = siteId;
        }

        where.OR = [
            { dataScadenza: { lte: today } },
            { dataScadenza: { gt: today, lte: dataFine } }
        ];

        const dvrs = await prisma.dVR.findMany({
            where,
            include: {
                site: {
                    include: {
                        companyTenantProfile: {
                            include: {
                                company: { select: { ragioneSociale: true } }
                            }
                        }
                    }
                }
            }
        });

        return dvrs.map(dvr => ({
            id: dvr.id,
            categoria: CATEGORIE_SCADENZA.DVR,
            tipo: 'DVR',
            descrizione: `DVR ${dvr.site?.siteName || 'N/A'} - ${dvr.site?.companyTenantProfile?.company?.ragioneSociale || 'N/A'}`,
            dataScadenza: dvr.dataScadenza,
            livelloUrgenza: this.calcolaLivelloUrgenza(dvr.dataScadenza),
            giorniAllaScadenza: this.calcolaGiorniAllaScadenza(dvr.dataScadenza),
            entita: {
                tipo: 'DVR',
                id: dvr.id,
                siteId: dvr.siteId,
                sede: dvr.site?.siteName,
                azienda: dvr.site?.companyTenantProfile?.company?.ragioneSociale,
                companyTenantProfileId: dvr.site?.companyTenantProfileId,
                dataEsecuzione: dvr.dataEsecuzione,
                effettuatoDa: dvr.effettuatoDa
            },
            azioni: [
                { tipo: 'aggiorna', label: 'Aggiorna DVR', url: `/clinica/dvr/${dvr.id}/aggiorna` },
                { tipo: 'visualizza', label: 'Visualizza', url: `/clinica/dvr/${dvr.id}` }
            ]
        }));
    },

    /**
     * Calcola il livello di urgenza basato sulla data di scadenza
     */
    calcolaLivelloUrgenza(dataScadenza) {
        if (!dataScadenza) return LIVELLI_URGENZA.PROGRAMMATO;

        const oggi = new Date();
        const scadenza = new Date(dataScadenza);
        const giorniDiff = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));

        if (giorniDiff < 0) return LIVELLI_URGENZA.SCADUTO;
        if (giorniDiff <= 7) return LIVELLI_URGENZA.CRITICO;
        if (giorniDiff <= 30) return LIVELLI_URGENZA.URGENTE;
        if (giorniDiff <= 60) return LIVELLI_URGENZA.ATTENZIONE;
        return LIVELLI_URGENZA.PROGRAMMATO;
    },

    /**
     * Calcola i giorni alla scadenza
     */
    calcolaGiorniAllaScadenza(dataScadenza) {
        if (!dataScadenza) return null;

        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        const scadenza = new Date(dataScadenza);
        scadenza.setHours(0, 0, 0, 0);

        return Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    },

    /**
     * Costruisce la descrizione per una nomina
     */
    buildDescrizioneNomina(nomina) {
        const persona = nomina.person
            ? `${nomina.person.lastName} ${nomina.person.firstName}`
            : 'N/A';

        const azienda = nomina.companyTenantProfile?.company?.ragioneSociale || 'N/A';
        const sede = nomina.site?.siteName ? ` - ${nomina.site.siteName}` : '';

        return `${persona} per ${azienda}${sede}`;
    },

    /**
     * Calcola statistiche aggregate sulle scadenze
     */
    calcolaStatistiche(scadenze) {
        const stats = {
            totale: scadenze.length,
            perLivelloUrgenza: {
                scaduto: 0,
                critico: 0,
                urgente: 0,
                attenzione: 0,
                programmato: 0
            },
            perCategoria: {
                nomina_mc: 0,
                nomina_rspp: 0,
                giudizio_idoneita: 0,
                visita_periodica: 0,
                sopralluogo: 0,
                dvr: 0
            }
        };

        scadenze.forEach(s => {
            stats.perLivelloUrgenza[s.livelloUrgenza] = (stats.perLivelloUrgenza[s.livelloUrgenza] || 0) + 1;
            stats.perCategoria[s.categoria] = (stats.perCategoria[s.categoria] || 0) + 1;
        });

        // Calcola priorità pesata
        stats.indicePriorita =
            stats.perLivelloUrgenza.scaduto * 100 +
            stats.perLivelloUrgenza.critico * 50 +
            stats.perLivelloUrgenza.urgente * 20 +
            stats.perLivelloUrgenza.attenzione * 5;

        return stats;
    },

    /**
     * Ottiene riepilogo scadenze per azienda
     * @param {string} tenantId - ID tenant
     * @param {string} companyTenantProfileId - ID profilo azienda
     */
    async getRiepilogoAzienda(tenantId, companyTenantProfileId) {
        logger.info({ tenantId, companyTenantProfileId }, 'ScadenzeMDLService.getRiepilogoAzienda');

        const result = await this.getAllScadenze(tenantId, { companyTenantProfileId });

        // Raggruppa per sede
        const perSede = {};
        result.scadenze.forEach(s => {
            const sedeId = s.entita?.siteId || 'generale';
            const sedeNome = s.entita?.sede || 'Generale';

            if (!perSede[sedeId]) {
                perSede[sedeId] = {
                    siteId: sedeId,
                    sede: sedeNome,
                    scadenze: [],
                    statistiche: {
                        totale: 0,
                        scaduti: 0,
                        critici: 0,
                        urgenti: 0
                    }
                };
            }

            perSede[sedeId].scadenze.push(s);
            perSede[sedeId].statistiche.totale++;

            if (s.livelloUrgenza === 'scaduto') perSede[sedeId].statistiche.scaduti++;
            if (s.livelloUrgenza === 'critico') perSede[sedeId].statistiche.critici++;
            if (s.livelloUrgenza === 'urgente') perSede[sedeId].statistiche.urgenti++;
        });

        return {
            companyTenantProfileId,
            statisticheGenerali: result.statistiche,
            perSede: Object.values(perSede)
        };
    },

    /**
     * Ottiene notifiche per scadenze urgenti
     * @param {string} tenantId - ID tenant
     * @param {number} giorniAvviso - Giorni di anticipo per avviso (default 30)
     */
    async getNotificheScadenze(tenantId, giorniAvviso = 30, giorniPre = null) {
        const dataFine = new Date();
        dataFine.setDate(dataFine.getDate() + giorniAvviso);

        const result = await this.getAllScadenze(tenantId, { dataFine });
        const dataInizio = Number.isFinite(giorniPre)
            ? new Date(Date.now() - giorniPre * 24 * 60 * 60 * 1000)
            : null;

        // Filtra solo scadute, critiche e urgenti
        const notifiche = result.scadenze.filter(s =>
            ['scaduto', 'critico', 'urgente'].includes(s.livelloUrgenza) &&
            (!dataInizio || new Date(s.dataScadenza) >= dataInizio)
        );

        return {
            notifiche,
            conteggio: {
                scadute: notifiche.filter(n => n.livelloUrgenza === 'scaduto').length,
                critiche: notifiche.filter(n => n.livelloUrgenza === 'critico').length,
                urgenti: notifiche.filter(n => n.livelloUrgenza === 'urgente').length
            }
        };
    },

    /**
     * Programma le prossime scadenze per-prestazione dopo una visita MDL.
     * Segna le scadenze pendenti come eseguite e crea nuove scadenze in base al protocollo sanitario.
     * Aggiorna il pregresso: se una prestazione del protocollo non ha scadenze, la crea ex-novo.
     *
     * @param {string} tenantId
     * @param {string} personId - ID lavoratore
     * @param {string} mansioneId - ID mansione
     * @param {string} visitaId - ID visita completata
     * @param {Date|string|null} dataVisita - Data della visita (base per il calcolo della prossima scadenza)
     * @returns {Promise<{updated: number, created: number}>}
     */
    async programmaPrestazioniDopoVisita(tenantId, personId, mansioneId, visitaId, dataVisita, excludePrestazioniIds = [], dateOverrides = {}, prestazioniAggiuntive = [], questionariAggiuntivi = []) {
        const profile = await prisma.personTenantProfile.findFirst({
            where: { personId, tenantId, deletedAt: null, isActive: true },
            select: { protocolloSanitarioId: true }
        });

        const scadenzaScopeWhere = {
            tenantId,
            personId,
            deletedAt: null,
            ...(profile?.protocolloSanitarioId ? { protocolloId: profile.protocolloSanitarioId } : { mansioneId })
        };

        // Guardia idempotenza: se questa visita ha già eseguito la programmazione,
        // non avanzare le scadenze una seconda volta (prevenzione bug nuova-versione).
        if (visitaId) {
            const alreadyExecuted = await prisma.scadenzaPrestazioneProtocollo.findFirst({
                where: { ...scadenzaScopeWhere, visitaId, eseguita: true }
            });
            if (alreadyExecuted) {
                // P72_23: se ci sono dateOverrides espliciti, applica le nuove date alle scadenze
                // future già create (eseguita=false) per questa persona+mansione.
                // Questo permette di modificare la data di una prestazione DOPO aver già salvato la visita.
                const overrideKeys = Object.keys(dateOverrides);
                if (overrideKeys.length > 0) {
                    const futureScadenze = await prisma.scadenzaPrestazioneProtocollo.findMany({
                        where: { ...scadenzaScopeWhere, eseguita: false }
                    });
                    let overridesApplied = 0;
                    for (const s of futureScadenze) {
                        const key = s.prestazioneId || s.documentoTemplateId;
                        const overrideDate = key ? dateOverrides[key] : null;
                        if (overrideDate) {
                            await prisma.scadenzaPrestazioneProtocollo.update({
                                where: { id: s.id },
                                data: { dataScadenza: new Date(overrideDate) }
                            });
                            overridesApplied++;
                        }
                    }
                    logger.info(
                        { tenantId, personId, mansioneId, visitaId, overridesApplied },
                        'programmaPrestazioniDopoVisita: idempotenza — dateOverrides applicati su scadenze future'
                    );
                    return { updated: overridesApplied, created: 0 };
                }
                logger.info(
                    { tenantId, personId, mansioneId, visitaId },
                    'programmaPrestazioniDopoVisita: già eseguita per questa visita — skip idempotenza'
                );
                return { updated: 0, created: 0 };
            }
        }

        const dataEsecuzione = dataVisita ? new Date(dataVisita) : new Date();

        // Trova tutte le scadenze pendenti per questa persona+mansione
        const pendingScadenze = await prisma.scadenzaPrestazioneProtocollo.findMany({
            where: { ...scadenzaScopeWhere, eseguita: false }
        });

        // Segna tutte le scadenze pendenti come eseguite
        if (pendingScadenze.length) {
            await prisma.scadenzaPrestazioneProtocollo.updateMany({
                where: { ...scadenzaScopeWhere, eseguita: false },
                data: { eseguita: true, dataEsecuzione, visitaId }
            });
        }

        const protocolloWhere = profile?.protocolloSanitarioId
            ? { id: profile.protocolloSanitarioId, tenantId, isAttivo: true, deletedAt: null }
            : {
                mansioniAssociate: { some: { mansioneId } },
                tenantId,
                isAttivo: true,
                deletedAt: null
            };

        // Recupera il protocollo sanitario assegnato al lavoratore; fallback alla mansione.
        const protocollo = await prisma.protocolloSanitario.findFirst({
            where: protocolloWhere,
            orderBy: { dataInizioValidita: 'desc' },
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    include: { prestazione: { select: { id: true, nome: true } } }
                },
                // P72_21: Includi questionari del protocollo per scheduling periodico
                questionari: {
                    where: { deletedAt: null },
                    include: {
                        documentoTemplate: { select: { id: true, nome: true } }
                    }
                }
            }
        });
        const prestazioniProtocollo = protocollo?.prestazioni ?? [];

        // Set degli ID prestazione già gestiti dalle scadenze pendenti (ora marchiate eseguite)
        const prestazioniGiaAggiornate = new Set(pendingScadenze.map(s => s.prestazioneId));

        // Set delle prestazioni da non programmare (scelta operatore in VisitaPage)
        const excludeSet = new Set(excludePrestazioniIds);

        // Crea nuove scadenze:
        //  1. Rinnova le scadenze che erano pendenti (con periodicità > 0)
        //  2. Aggiorna il pregresso: crea scadenze per le prestazioni del protocollo senza record
        const scadenzeToCreate = [];

        // Rinnova le pendenti — usa la data di scadenza originale (t0) come ancoraggio
        // Esempio corretto: visita annuale programmata mese 12, eseguita mese 13 → prossima al mese 24 (non 25)
        for (const s of pendingScadenze.filter(s => s.periodicitaMesi > 0 && s.prestazioneId)) {
            // Non programmare se l'operatore ha escluso questa prestazione
            if (excludeSet.has(s.prestazioneId)) continue;
            const anchorDate = s.dataScadenza ? new Date(s.dataScadenza) : new Date(dataEsecuzione);
            const nextDate = new Date(anchorDate);
            nextDate.setMonth(nextDate.getMonth() + s.periodicitaMesi);
            // P72_18: applica override manuale se presente
            const overrideDate = dateOverrides[s.prestazioneId];
            const finalDate = overrideDate ? new Date(overrideDate) : nextDate;
            scadenzeToCreate.push({
                personId: s.personId,
                mansioneId: s.mansioneId,
                prestazioneId: s.prestazioneId,
                protocolloId: s.protocolloId,
                tenantId: s.tenantId,
                dataScadenza: finalDate,
                periodicitaMesi: s.periodicitaMesi,
                isPrimaVisita: false,
                eseguita: false
            });
        }

        // P72_21: Rinnova scadenze pendenti per QUESTIONARI
        for (const s of pendingScadenze.filter(s => s.periodicitaMesi > 0 && s.documentoTemplateId && !s.prestazioneId)) {
            if (excludeSet.has(s.documentoTemplateId)) continue;
            const anchorDate = s.dataScadenza ? new Date(s.dataScadenza) : new Date(dataEsecuzione);
            const nextDate = new Date(anchorDate);
            nextDate.setMonth(nextDate.getMonth() + s.periodicitaMesi);
            const overrideDate = dateOverrides[s.documentoTemplateId];
            const finalDate = overrideDate ? new Date(overrideDate) : nextDate;
            scadenzeToCreate.push({
                personId: s.personId,
                mansioneId: s.mansioneId,
                prestazioneId: null,
                documentoTemplateId: s.documentoTemplateId,
                protocolloId: s.protocolloId,
                tenantId: s.tenantId,
                dataScadenza: finalDate,
                periodicitaMesi: s.periodicitaMesi,
                isPrimaVisita: false,
                eseguita: false
            });
        }

        // Aggiorna pregresso: prestazioni del protocollo senza scadenze pendenti → crea ora
        if (protocollo) {
            for (const pp of prestazioniProtocollo) {
                if (!pp.prestazione?.id || prestazioniGiaAggiornate.has(pp.prestazione.id)) continue;
                // Non programmare se l'operatore ha escluso questa prestazione
                if (excludeSet.has(pp.prestazione.id)) continue;

                // Verifica se non esiste già una scadenza futura pendente per questa prestazione
                const existingFutura = await prisma.scadenzaPrestazioneProtocollo.findFirst({
                    where: { ...scadenzaScopeWhere, prestazioneId: pp.prestazione.id, eseguita: false }
                });
                if (existingFutura) continue;

                const periodicitaMesi = periodicitaMesiFromProtocolloPrestazione(pp) ?? protocollo.periodicitaVisiteMesi ?? 12;
                if (periodicitaMesi > 0) {
                    const nextDate = new Date(dataEsecuzione);
                    nextDate.setMonth(nextDate.getMonth() + periodicitaMesi);
                    // P72_18: applica override manuale se presente
                    const overrideDate = dateOverrides[pp.prestazione.id];
                    const finalDate = overrideDate ? new Date(overrideDate) : nextDate;
                    scadenzeToCreate.push({
                        personId,
                        mansioneId,
                        prestazioneId: pp.prestazione.id,
                        protocolloId: protocollo.id,
                        tenantId,
                        dataScadenza: finalDate,
                        periodicitaMesi,
                        isPrimaVisita: false,
                        eseguita: false
                    });
                }
            }
        }

        // P72_21: Aggiunta pregresso questionari del protocollo senza scadenze pendenti → crea ora
        if (protocollo?.questionari?.length > 0) {
            const questionariGiaAggiornati = new Set(
                pendingScadenze.map(s => s.documentoTemplateId).filter(Boolean)
            );

            for (const qConfig of protocollo.questionari) {
                const templateId = qConfig.documentoTemplate?.id;
                if (!templateId) continue;
                if (!qConfig.periodicitaMesi || qConfig.periodicitaMesi <= 0) continue;
                if (questionariGiaAggiornati.has(templateId)) continue;
                if (excludeSet.has(templateId)) continue;

                // Verifica se non esiste già una scadenza futura pendente per questo questionario
                const existingQFuturo = await prisma.scadenzaPrestazioneProtocollo.findFirst({
                    where: { ...scadenzaScopeWhere, documentoTemplateId: templateId, eseguita: false }
                });
                if (existingQFuturo) continue;

                const nextDate = new Date(dataEsecuzione);
                nextDate.setMonth(nextDate.getMonth() + qConfig.periodicitaMesi);
                const overrideDate = dateOverrides[templateId];
                const finalDate = overrideDate ? new Date(overrideDate) : nextDate;

                scadenzeToCreate.push({
                    personId,
                    mansioneId,
                    prestazioneId: null,
                    documentoTemplateId: templateId,
                    protocolloId: protocollo.id,
                    tenantId,
                    dataScadenza: finalDate,
                    periodicitaMesi: qConfig.periodicitaMesi,
                    isPrimaVisita: false,
                    eseguita: false
                });
            }
        }

        // P72_20: Crea scadenze anche per le prestazioni aggiuntive (non del protocollo)
        // aggiunte dall'operatore durante la visita. Usa il protocollo della mansione come riferimento.
        // P72_22: se non c'è un override manuale, calcola la data automaticamente (dataVisita + periodicitaMesi).
        // NOTA: le aggiuntive NON rispettano excludeSet — sono accertamenti extra scelti per questo
        // specifico paziente: se hanno una periodicità, vanno sempre pianificate.
        if (prestazioniAggiuntive.length > 0 && protocollo) {
            const aggiuntiveProtocolloId = protocollo.id;
            for (const pa of prestazioniAggiuntive) {
                if (!pa.id) continue;

                // Evita duplicati: verifica che non esista già una scadenza futura pendente per questa prestazione
                const existingAggiuntiva = await prisma.scadenzaPrestazioneProtocollo.findFirst({
                    where: { ...scadenzaScopeWhere, prestazioneId: pa.id, eseguita: false }
                });
                if (existingAggiuntiva) continue;

                const periodicitaMesi = (typeof pa.periodicitaMesi === 'number' && pa.periodicitaMesi > 0)
                    ? pa.periodicitaMesi
                    : (protocollo.periodicitaVisiteMesi ?? 12);

                // Usa override manuale se presente, altrimenti calcola da dataVisita + periodicitaMesi
                const overrideDateAggiuntiva = dateOverrides[pa.id];
                let finalDateAggiuntiva;
                if (overrideDateAggiuntiva) {
                    finalDateAggiuntiva = new Date(overrideDateAggiuntiva);
                } else {
                    finalDateAggiuntiva = new Date(dataEsecuzione);
                    finalDateAggiuntiva.setMonth(finalDateAggiuntiva.getMonth() + periodicitaMesi);
                }

                scadenzeToCreate.push({
                    personId,
                    mansioneId,
                    prestazioneId: pa.id,
                    protocolloId: aggiuntiveProtocolloId,
                    tenantId,
                    dataScadenza: finalDateAggiuntiva,
                    periodicitaMesi,
                    isPrimaVisita: false,
                    eseguita: false
                });
            }
        }

        // P72_23: Crea scadenze per questionari periodici aggiunti durante la visita.
        // Usa documentoTemplateId al posto di prestazioneId.
        if (questionariAggiuntivi.length > 0 && protocollo) {
            const qaProtocolloId = protocollo.id;
            for (const qa of questionariAggiuntivi) {
                if (!qa.documentoTemplateId || !qa.periodicitaMesi || qa.periodicitaMesi <= 0) continue;

                // Idempotenza: non creare se esiste già una scadenza aperta per questo template
                const existingQa = await prisma.scadenzaPrestazioneProtocollo.findFirst({
                    where: { ...scadenzaScopeWhere, documentoTemplateId: qa.documentoTemplateId, eseguita: false }
                });
                if (existingQa) continue;

                // Usa override manuale se presente, altrimenti calcola da dataEsecuzione + periodicità
                const overrideDateQa = dateOverrides[qa.documentoTemplateId];
                let finalDateQa;
                if (overrideDateQa) {
                    finalDateQa = new Date(overrideDateQa);
                } else {
                    finalDateQa = new Date(dataEsecuzione);
                    finalDateQa.setMonth(finalDateQa.getMonth() + qa.periodicitaMesi);
                }

                scadenzeToCreate.push({
                    personId,
                    mansioneId,
                    prestazioneId: null,
                    documentoTemplateId: qa.documentoTemplateId,
                    protocolloId: qaProtocolloId,
                    tenantId,
                    dataScadenza: finalDateQa,
                    periodicitaMesi: qa.periodicitaMesi,
                    isPrimaVisita: false,
                    eseguita: false
                });
            }
        }

        if (scadenzeToCreate.length) {
            await prisma.scadenzaPrestazioneProtocollo.createMany({ data: scadenzeToCreate });
        }

        logger.info(
            { tenantId, personId, mansioneId, visitaId, updated: pendingScadenze.length, created: scadenzeToCreate.length },
            'Scadenze prestazioni MDL programmate dopo visita (con aggiornamento pregresso)'
        );
        return { updated: pendingScadenze.length, created: scadenzeToCreate.length };
    }
};

export default ScadenzeMDLService;
export { CATEGORIE_SCADENZA, LIVELLI_URGENZA };
