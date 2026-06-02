/**
 * Allegato3AService - Generazione Cartella Sanitaria e di Rischio
 * 
 * Genera la Cartella Sanitaria e di Rischio (Allegato 3A) secondo Art. 41 c.5 D.Lgs 81/08
 * Raccoglie dati da Person, Company, Mansione, GiudizioIdoneita, Visita
 * 
 * @module services/clinical/Allegato3AService
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 5
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';


/**
 * Struttura Allegato 3A secondo D.Lgs 81/08:
 * 
 * SEZIONE 1: Dati anagrafici lavoratore
 * SEZIONE 2: Dati azienda
 * SEZIONE 3: Dati lavorativi (mansione, reparto, date)
 * SEZIONE 4: Rischi lavorativi (da DVR)
 * SEZIONE 5: Accertamenti sanitari (visite ed esami)
 * SEZIONE 6: Giudizio di idoneità attuale
 * SEZIONE 7: Firma Medico Competente
 */

class Allegato3AService {
    static async resolveCompanyTenantProfileId(companyTenantProfileId, tenantId) {
        const profile = await prisma.companyTenantProfile.findFirst({
            where: {
                id: companyTenantProfileId,
                tenantId,
                deletedAt: null
            },
            select: { id: true }
        });
        if (profile) return profile.id;

        const byCompany = await prisma.companyTenantProfile.findFirst({
            where: {
                companyId: companyTenantProfileId,
                tenantId,
                deletedAt: null
            },
            select: { id: true }
        });
        return byCompany?.id || companyTenantProfileId;
    }

    /**
     * Genera i dati per l'Allegato 3A di un lavoratore
     * 
     * @param {string} personId - ID del lavoratore (Person)
     * @param {string} companyTenantProfileId - ID del profilo aziendale
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Dati strutturati per Allegato 3A
     */
    static async generateData(personId, companyTenantProfileId, tenantId) {
        companyTenantProfileId = await this.resolveCompanyTenantProfileId(companyTenantProfileId, tenantId);
        logger.info({ personId, companyTenantProfileId, tenantId }, 'Generazione dati Allegato 3A');

        // 1. Dati lavoratore
        const lavoratore = await this.getLavoratoreData(personId, tenantId);
        if (!lavoratore) {
            throw new Error(`Lavoratore non trovato: ${personId}`);
        }

        // 2. Dati azienda
        const azienda = await this.getAziendaData(companyTenantProfileId, tenantId);
        if (!azienda) {
            throw new Error(`Azienda non trovata: ${companyTenantProfileId}`);
        }

        // 3. Mansione e rischi
        const datiLavorativi = await this.getDatiLavorativi(personId, companyTenantProfileId, tenantId);

        // 4. Storico accertamenti sanitari
        const accertamenti = await this.getAccertamentiSanitari(personId, tenantId);

        // 5. Giudizio idoneità attuale
        const giudizio = await this.getGiudizioAttuale(personId, tenantId);

        // 6. Dati Medico Competente
        const medicoCompetente = await this.getMedicoCompetente(companyTenantProfileId, tenantId);

        // Map to Allegato3AData shape expected by frontend/clinicaApi
        return {
            generatedAt: new Date().toISOString(),
            riferimentoNormativo: 'Art. 41 c.5 D.Lgs 81/08',

            // Sezione 1: Dati Anagrafici Lavoratore
            lavoratore: {
                id: lavoratore.id,
                taxCode: lavoratore.taxCode,
                firstName: lavoratore.firstName,
                lastName: lavoratore.lastName,
                gender: lavoratore.gender,
                birthDate: lavoratore.birthDate,
                birthPlace: lavoratore.birthPlace,
                residenza: {
                    indirizzo: lavoratore.profile?.residenceAddress,
                    citta: lavoratore.profile?.residenceCity,
                    cap: lavoratore.profile?.postalCode,
                    provincia: lavoratore.profile?.province
                },
                contatti: {
                    email: lavoratore.profile?.email,
                    phone: lavoratore.profile?.phone
                }
            },

            // Sezione 2: Dati Azienda
            azienda: {
                id: azienda.id,
                ragioneSociale: azienda.company?.ragioneSociale,
                piva: azienda.company?.piva,
                codiceFiscale: azienda.company?.codiceFiscale,
                sedeLegale: {
                    indirizzo: azienda.company?.sedeLegaleIndirizzo,
                    citta: azienda.company?.sedeLegaleCitta,
                    cap: azienda.company?.sedeLegaleCap,
                    provincia: azienda.company?.sedeLegaleProvincia
                },
                codiceAteco: azienda.company?.codiceAteco,
                settore: azienda.company?.settore
            },

            // Sezione 3: Dati Lavorativi
            datiLavorativi: {
                dataAssunzione: lavoratore.profile?.hiredDate || null,
                mansioneAttuale: datiLavorativi.mansione,
                mansioneCodice: datiLavorativi.codiceManisone,
                reparto: datiLavorativi.reparto,
                unitaProduttiva: datiLavorativi.unitaProduttiva,
                dataInizioMansione: datiLavorativi.dataInizioMansione,
                storicoMansioni: []
            },

            // Sezione 4: Rischi Professionali
            rischiProfessionali: (datiLavorativi.rischi || []).map(r => ({
                tipo: r.codice || 'N/D',
                livello: r.livello || 'N/D',
                descrizione: r.descrizione,
                dpiRichiesti: r.dpiRichiesti,
                misurePrevenzione: r.misurePrevenzione
            })),

            // Sezione 5: Accertamenti Sanitari
            accertamentiSanitari: accertamenti,

            // Sezione 6: Giudizio Idoneità
            giudizioAttuale: giudizio,

            // Sezione 7: Medico Competente
            medicoCompetente: medicoCompetente
        };
    }

    /**
     * Recupera dati anagrafici lavoratore
     */
    static async getLavoratoreData(personId, tenantId) {
        return await prisma.person.findFirst({
            where: {
                id: personId,
                deletedAt: null
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                taxCode: true,
                birthDate: true,
                birthPlace: true,
                gender: true,
                tenantProfiles: {
                    where: {
                        tenantId,
                        deletedAt: null
                    },
                    select: {
                        residenceAddress: true,
                        residenceCity: true,
                        postalCode: true,
                        province: true,
                        email: true,
                        phone: true,
                        hiredDate: true,
                        endDate: true,
                        status: true
                    },
                    take: 1
                }
            }
        }).then(person => {
            if (!person) return null;
            return {
                ...person,
                profile: person.tenantProfiles?.[0] || null
            };
        });
    }

    /**
     * Recupera dati azienda dal profilo tenant
     */
    static async getAziendaData(companyTenantProfileId, tenantId) {
        return await prisma.companyTenantProfile.findFirst({
            where: {
                id: companyTenantProfileId,
                tenantId,
                deletedAt: null
            },
            select: {
                id: true,
                company: {
                    select: {
                        id: true,
                        ragioneSociale: true,
                        piva: true,
                        codiceFiscale: true,
                        sedeLegaleIndirizzo: true,
                        sedeLegaleCitta: true,
                        sedeLegaleCap: true,
                        sedeLegaleProvincia: true,
                        codiceAteco: true,
                        settore: true
                    }
                },
                sites: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        siteName: true,
                        indirizzo: true,
                        citta: true,
                        cap: true,
                        provincia: true,
                        medicoCompetenteId: true,
                        rsppId: true
                    }
                }
            }
        });
    }

    /**
     * Recupera dati lavorativi: mansione, reparto, rischi.
     * Tentativo 1: mansione con site collegato all'azienda (dati completi).
     * Tentativo 2 (fallback): qualsiasi mansione attiva per il lavoratore nel tenant
     *   (caso worker linkato via PersonTenantProfile senza site assegnato al sito aziendale).
     */
    static async getDatiLavorativi(personId, companyTenantProfileId, tenantId) {
        const mansioneInclude = {
            mansione: {
                include: {
                    site: {
                        select: {
                            id: true,
                            siteName: true,
                            citta: true
                        }
                    },
                    rischiAssociati: {
                        where: { deletedAt: null },
                        select: {
                            codiceRischio: true,
                            livello: true,
                            descrizioneEsposizione: true,
                            misurePrevenzioneDPI: true
                        }
                    }
                }
            }
        };

        // Tentativo 1: mansione con site appartenente all'azienda
        let assegnazione = await prisma.lavoratoreMansione.findFirst({
            where: {
                personId,
                tenantId,
                isAttiva: true,
                deletedAt: null,
                mansione: {
                    deletedAt: null,
                    site: { companyTenantProfileId }
                }
            },
            include: mansioneInclude
        });

        // Tentativo 2: qualsiasi mansione attiva (worker senza site collegato all'azienda)
        if (!assegnazione) {
            assegnazione = await prisma.lavoratoreMansione.findFirst({
                where: {
                    personId,
                    tenantId,
                    isAttiva: true,
                    deletedAt: null,
                    mansione: { deletedAt: null }
                },
                include: mansioneInclude
            });
        }

        if (!assegnazione) {
            return {
                mansione: null,
                reparto: null,
                dataInizioMansione: null,
                unitaProduttiva: null,
                rischi: []
            };
        }

        return {
            mansione: assegnazione.mansione?.denominazione,
            codiceManisone: assegnazione.mansione?.codice,
            descrizioneManisone: assegnazione.mansione?.descrizione,
            reparto: assegnazione.mansione?.site?.siteName,
            unitaProduttiva: assegnazione.mansione?.site?.citta,
            dataInizioMansione: assegnazione.dataInizio,
            dataFineManisone: assegnazione.dataFine,
            rischi: assegnazione.mansione?.rischiAssociati?.map(r => ({
                codice: r.codiceRischio,
                livello: r.livello,
                descrizione: this.getDescrizioneRischio(r.codiceRischio),
                noteSpecifiche: r.descrizioneEsposizione,
                misurePrevenzione: r.misurePrevenzioneDPI,
                dpiRichiesti: []
            })) || []
        };
    }

    /**
     * Recupera storico accertamenti sanitari (visite ed esami)
     */
    static async getAccertamentiSanitari(personId, tenantId) {
        const visite = await prisma.visita.findMany({
            where: {
                pazienteId: personId,
                tenantId,
                deletedAt: null,
                tipoVisitaMDL: { not: null }
            },
            orderBy: { dataOra: 'desc' },
            select: {
                id: true,
                dataOra: true,
                tipoVisitaMDL: true,
                noteClinico: true,
                medico: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            take: 500
        });

        const esami = await prisma.esameStrumentale.findMany({
            where: {
                pazienteId: personId,
                tenantId,
                deletedAt: null
            },
            orderBy: { dataEsame: 'desc' },
            select: {
                id: true,
                dataEsame: true,
                tipoDispositivo: true,
                tipoEsame: true,
                stato: true,
                risultati: true,
                findings: true,
                metadata: true
            },
            take: 500
        });

        const visiteAccertamenti = visite.map(v => ({
            id: v.id,
            tipo: this.getTipoVisitaLabel(v.tipoVisitaMDL),
            data: v.dataOra,
            note: v.noteClinico,
            medicoEsecutore: v.medico ? `${v.medico.lastName} ${v.medico.firstName}` : null,
            prestazioniEseguite: []
        }));

        const esamiAccertamenti = esami.map(e => ({
            id: e.id,
            tipo: e.tipoDispositivo || e.tipoEsame || 'ACCERTAMENTO_INTEGRATIVO',
            data: e.dataEsame,
            note: (e.findings || []).join('; '),
            medicoEsecutore: null,
            stato: e.stato,
            valori: e.risultati,
            metadata: e.metadata,
            prestazioniEseguite: []
        }));

        return [...visiteAccertamenti, ...esamiAccertamenti]
            .sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());
    }

    /**
     * Recupera giudizio idoneità attuale
     */
    static async getGiudizioAttuale(personId, tenantId) {
        const giudizio = await prisma.giudizioIdoneita.findFirst({
            where: {
                personId,
                tenantId,
                deletedAt: null,
                stato: 'VALIDO'
            },
            orderBy: { dataEmissione: 'desc' },
            include: {
                medicoCompetente: {
                    select: {
                        firstName: true,
                        lastName: true,
                        taxCode: true
                    }
                },
                mansioni: {
                    include: {
                        mansione: {
                            select: {
                                codice: true,
                                denominazione: true
                            }
                        }
                    }
                }
            }
        });

        if (!giudizio) {
            return null;
        }

        return {
            id: giudizio.id,
            data: giudizio.dataEmissione,
            esito: giudizio.tipoGiudizio,
            esitoLabel: this.getTipoGiudizioLabel(giudizio.tipoGiudizio),
            limitazioni: giudizio.limitazioni,
            prescrizioniIdoneita: giudizio.prescrizioniIdoneita,
            motivazioni: giudizio.motivazioni,
            validoFino: giudizio.dataScadenza,
            dataDecorrenza: giudizio.dataDecorrenza,
            prossimaVisita: giudizio.dataScadenza,
            mansione: giudizio.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || null,
            medicoCompetente: giudizio.medicoCompetente ?
                `${giudizio.medicoCompetente.lastName} ${giudizio.medicoCompetente.firstName}` : null,
            medicoCompetenteCF: giudizio.medicoCompetente?.taxCode,
            ricorsoEntro: giudizio.ricorsoEntro
        };
    }

    /**
     * Recupera dati Medico Competente della sede
     */
    static async getMedicoCompetente(companyTenantProfileId, tenantId) {
        // Cerca la nomina MC attiva per questa azienda
        const nomina = await prisma.nominaRuolo.findFirst({
            where: {
                companyTenantProfileId,
                tenantId,
                tipoRuolo: 'MEDICO_COMPETENTE',
                stato: 'ATTIVA',
                deletedAt: null
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
                            select: {
                                email: true,
                                phone: true
                            },
                            take: 1
                        }
                    }
                }
            }
        });

        if (!nomina?.person) {
            return null;
        }

        const profile = nomina.person.tenantProfiles?.[0];

        return {
            id: nomina.person.id,
            nome: nomina.person.firstName,
            cognome: nomina.person.lastName,
            nomeCompleto: `${nomina.person.lastName} ${nomina.person.firstName}`,
            codiceFiscale: nomina.person.taxCode,
            email: profile?.email,
            telefono: profile?.phone,
            dataInizioNomina: nomina.dataInizio,
            dataScadenzaNomina: nomina.dataScadenza
        };
    }

    /**
     * Genera Allegato 3A per tutti i lavoratori di un'azienda
     */
    static async generateBulkData(companyTenantProfileId, tenantId) {
        companyTenantProfileId = await this.resolveCompanyTenantProfileId(companyTenantProfileId, tenantId);
        // Trova tutti i lavoratori assegnati a mansioni di questa azienda (mansione attiva)
        const lavoratori = await prisma.lavoratoreMansione.findMany({
            where: {
                tenantId,
                isAttiva: true,
                deletedAt: null,
                mansione: {
                    site: {
                        companyTenantProfileId,
                        deletedAt: null
                    },
                    deletedAt: null
                }
            },
            select: { personId: true },
            distinct: ['personId']
        });

        // Includi anche lavoratori con giudizio valido per questa azienda
        // (coprono casi con mansione non più attiva ma giudizio ancora in corso)
        const giudizioPersonIds = await prisma.giudizioIdoneita.findMany({
            where: {
                tenantId,
                stato: 'VALIDO',
                deletedAt: null,
                mansioni: {
                    some: {
                        mansione: {
                            site: { companyTenantProfileId, deletedAt: null },
                            deletedAt: null
                        }
                    }
                }
            },
            select: { personId: true },
            distinct: ['personId']
        });

        // Includi anche lavoratori collegati direttamente all'azienda via PersonTenantProfile
        // (coprono casi con mansione senza siteId oppure lavoratori senza mansione attiva)
        const directPersonIds = await prisma.personTenantProfile.findMany({
            where: {
                tenantId,
                companyTenantProfileId,
                deletedAt: null
            },
            select: { personId: true },
            distinct: ['personId']
        });

        const allPersonIds = [...new Set([
            ...lavoratori.map(l => l.personId),
            ...giudizioPersonIds.map(g => g.personId),
            ...directPersonIds.map(d => d.personId)
        ])];

        const results = [];
        for (const personId of allPersonIds) {
            try {
                const data = await this.generateData(personId, companyTenantProfileId, tenantId);
                results.push({ personId, success: true, data });
            } catch (error) {
                logger.error({ personId, error: error.message }, 'Errore generazione Allegato 3A');
                results.push({ personId, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Restituisce statistiche per l'azienda
     */
    static async getStats(companyTenantProfileId, tenantId) {
        companyTenantProfileId = await this.resolveCompanyTenantProfileId(companyTenantProfileId, tenantId);
        // Pre-fetch mansione IDs for this company to use stable FK filters
        // (avoids unsupported nested-relation filters on some Prisma versions)
        const mansioneIds = (await prisma.mansione.findMany({
            where: {
                tenantId,
                deletedAt: null,
                site: { companyTenantProfileId, deletedAt: null }
            },
            select: { id: true }
        })).map(m => m.id);

        const stats = await prisma.$transaction([
            // Totale lavoratori con mansione attiva per questa azienda
            prisma.lavoratoreMansione.count({
                where: {
                    tenantId,
                    isAttiva: true,
                    deletedAt: null,
                    mansioneId: { in: mansioneIds }
                }
            }),
            // Lavoratori con giudizio valido per questa azienda
            prisma.giudizioIdoneita.count({
                where: {
                    tenantId,
                    stato: 'VALIDO',
                    deletedAt: null,
                    mansioni: { some: { mansioneId: { in: mansioneIds } } }
                }
            }),
            // Giudizi scaduti per questa azienda
            prisma.giudizioIdoneita.count({
                where: {
                    tenantId,
                    stato: 'SCADUTO',
                    deletedAt: null,
                    mansioni: { some: { mansioneId: { in: mansioneIds } } }
                }
            }),
            // Mansioni per questa azienda
            prisma.mansione.count({
                where: {
                    tenantId,
                    deletedAt: null,
                    site: { companyTenantProfileId, deletedAt: null }
                }
            })
        ]);

        const totaleWorkers = stats[0];
        const withActiveGiudizio = stats[1];
        const withExpiredGiudizio = stats[2];

        return {
            totaleWorkers,
            withActiveGiudizio,
            withExpiredGiudizio,
            pendingVisits: Math.max(0, totaleWorkers - withActiveGiudizio),
            byMansione: {},
            byEsitoGiudizio: {}
        };
    }

    // ==================== HELPER METHODS ====================

    /**
     * Descrizione rischio da codice
     */
    static getDescrizioneRischio(codice) {
        const RISCHI = {
            'RUM': 'Rumore',
            'VIB_MB': 'Vibrazioni meccaniche mano-braccio',
            'VIB_WB': 'Vibrazioni meccaniche corpo intero',
            'CEM': 'Campi elettromagnetici',
            'ROA': 'Radiazioni ottiche artificiali',
            'RAD_ION': 'Radiazioni ionizzanti',
            'MIC': 'Microclima',
            'CHI': 'Agenti chimici',
            'CMR': 'Agenti cancerogeni/mutageni',
            'AMI': 'Amianto',
            'BIO': 'Agenti biologici',
            'MMC_SOL': 'Movimentazione manuale carichi - sollevamento',
            'MMC_TRA': 'Movimentazione manuale carichi - traino/spinta',
            'MOV_RIP': 'Movimenti ripetitivi arti superiori',
            'POST': 'Posture incongrue',
            'VDT': 'Videoterminali',
            'LAV_NOT': 'Lavoro notturno',
            'STR_LAV': 'Stress lavoro-correlato',
            'ELE': 'Rischio elettrico',
            'ATM_ESP': 'Atmosfere esplosive (ATEX)',
            'SPA_CON': 'Spazi confinati',
            'ALT': 'Lavori in quota',
            'GRU': 'Conduzione gru/carroponte',
            'CAR': 'Conduzione carrelli elevatori',
            'PLE': 'Piattaforme lavoro elevabili',
            'ASB': 'Addetto antincendio',
            'PS': 'Addetto primo soccorso',
            'AUT': 'Autisti professionisti'
        };
        return RISCHI[codice] || codice;
    }

    /**
     * Label tipo visita MDL — allineate all'enum TipoVisitaMDL (Prisma schema)
     */
    static getTipoVisitaLabel(tipo) {
        const TIPI = {
            'PREVENTIVA': 'Visita preventiva (Art. 41 c.2a – include prima visita nuovo lavoratore)',
            'PREVENTIVA_PREASSUNTIVA': 'Visita preventiva preassuntiva (Art. 41 c.2a-bis)',
            'PERIODICA': 'Visita periodica',
            'CAMBIO_MANSIONE': 'Visita per cambio mansione',
            'CESSAZIONE_RAPPORTO': 'Visita di cessazione rapporto',
            'PRECEDENTE_ASSENZA': 'Visita per rientro da assenza >60gg',
            'SU_RICHIESTA_LAVORATORE': 'Visita su richiesta del lavoratore',
            'STRAORDINARIA': 'Visita straordinaria',
            'VERIFICA_IDONEITA': 'Verifica idoneità',
            'RIENTRO_MATERNITA': 'Visita di rientro da maternità/congedo',
        };
        return TIPI[tipo] || tipo;
    }

    /**
     * Label tipo giudizio
     */
    static getTipoGiudizioLabel(tipo) {
        const TIPI = {
            'IDONEO': 'Idoneo alla mansione specifica',
            'IDONEO_CON_PRESCRIZIONI': 'Idoneo con prescrizioni',
            'IDONEO_CON_LIMITAZIONI': 'Idoneo con limitazioni',
            'NON_IDONEO_TEMPORANEO': 'Non idoneo temporaneo',
            'NON_IDONEO_PERMANENTE': 'Non idoneo permanente',
            'IN_ATTESA_ACCERTAMENTI': 'In attesa di accertamenti integrativi'
        };
        return TIPI[tipo] || tipo;
    }
}

export default Allegato3AService;
