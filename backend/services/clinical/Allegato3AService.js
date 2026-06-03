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

const MC_NOMINA_TYPES = ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'];
const PRIVILEGED_ALLEGATO_3A_ROLES = new Set([
    'SUPER_ADMIN',
    'ADMIN',
    'TENANT_ADMIN',
    'CLINIC_ADMIN',
    'SEGRETERIA_CLINICA'
]);
const ITALIAN_PROVINCES = new Set([
    'AG', 'AL', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AT', 'AV', 'BA', 'BG', 'BI', 'BL', 'BN', 'BO', 'BR', 'BS', 'BT',
    'BZ', 'CA', 'CB', 'CE', 'CH', 'CI', 'CL', 'CN', 'CO', 'CR', 'CS', 'CT', 'CZ', 'EN', 'FC', 'FE', 'FG', 'FI',
    'FM', 'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'KR', 'LC', 'LE', 'LI', 'LO', 'LT', 'LU', 'MB', 'MC', 'ME', 'MI',
    'MN', 'MO', 'MS', 'MT', 'NA', 'NO', 'NU', 'OG', 'OR', 'OT', 'PA', 'PC', 'PD', 'PE', 'PG', 'PI', 'PN', 'PO',
    'PR', 'PT', 'PU', 'PV', 'PZ', 'RA', 'RC', 'RE', 'RG', 'RI', 'RM', 'RN', 'RO', 'SA', 'SI', 'SO', 'SP', 'SR',
    'SS', 'SU', 'SV', 'TA', 'TE', 'TN', 'TO', 'TP', 'TR', 'TS', 'TV', 'UD', 'VA', 'VB', 'VC', 'VE', 'VI', 'VR',
    'VS', 'VT', 'VV'
]);

function isActiveNominaWindow() {
    const now = new Date();
    return {
        OR: [
            { dataFine: null },
            { dataFine: { gte: now } }
        ],
        AND: [
            {
                OR: [
                    { dataScadenza: null },
                    { dataScadenza: { gte: now } }
                ]
            }
        ]
    };
}

function firstValue(source, keys) {
    if (!source || typeof source !== 'object') return null;
    for (const key of keys) {
        const value = source[key];
        if (value !== null && value !== undefined && String(value).trim() !== '') return value;
    }
    return null;
}

function deriveNationalityFromBirthPlace(lavoratore) {
    const explicitProvince = String(lavoratore?.birthProvince || '').trim().toUpperCase();
    const provinceFromPlace = String(lavoratore?.birthPlace || '').match(/\(([A-Z]{2})\)/)?.[1];
    const province = explicitProvince || provinceFromPlace || '';
    if (ITALIAN_PROVINCES.has(province)) return 'Italia';

    const fiscalBirthCode = String(lavoratore?.taxCode || '').trim().toUpperCase().slice(11, 15);
    if (/^Z\d{3}$/.test(fiscalBirthCode)) return 'Estero';
    if (/^[A-Z]\d{3}$/.test(fiscalBirthCode)) return 'Italia';

    return null;
}

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
    static async getRoleTypesForPerson(person, tenantId) {
        const roles = new Set();
        if (person?.roleType) roles.add(String(person.roleType));
        if (person?.globalRole) roles.add(String(person.globalRole));
        if (Array.isArray(person?.roles)) {
            person.roles.forEach(role => {
                if (typeof role === 'string') roles.add(role);
                if (role?.roleType) roles.add(String(role.roleType));
            });
        }

        if (person?.id) {
            const dbRoles = await prisma.personRole.findMany({
                where: {
                    personId: person.id,
                    tenantId,
                    isActive: true,
                    deletedAt: null,
                    OR: [
                        { validUntil: null },
                        { validUntil: { gte: new Date() } }
                    ]
                },
                select: { roleType: true }
            });
            dbRoles.forEach(role => {
                if (role.roleType) roles.add(String(role.roleType));
            });
        }

        return [...roles];
    }

    static async getVisibleCompanies(tenantId, person) {
        const roleTypes = await this.getRoleTypesForPerson(person, tenantId);
        const canViewAll = roleTypes.some(role => PRIVILEGED_ALLEGATO_3A_ROLES.has(role));
        const nominaWindow = isActiveNominaWindow();

        const profiles = await prisma.companyTenantProfile.findMany({
            where: {
                tenantId,
                deletedAt: null,
                isActive: true,
                OR: [
                    {
                        nomine: {
                            some: {
                                tenantId,
                                deletedAt: null,
                                stato: 'ATTIVA',
                                tipoRuolo: { in: MC_NOMINA_TYPES },
                                ...nominaWindow,
                                ...(canViewAll ? {} : { personId: person.id })
                            }
                        }
                    },
                    {
                        sites: {
                            some: {
                                tenantId,
                                deletedAt: null,
                                medicoCompetenteId: canViewAll ? { not: null } : person.id
                            }
                        }
                    }
                ]
            },
            select: {
                id: true,
                company: {
                    select: {
                        ragioneSociale: true,
                        piva: true,
                        codiceFiscale: true,
                        sedeLegaleCitta: true,
                        sedeLegaleProvincia: true
                    }
                },
                sites: {
                    where: {
                        tenantId,
                        deletedAt: null,
                        ...(canViewAll ? { medicoCompetenteId: { not: null } } : { medicoCompetenteId: person.id })
                    },
                    select: {
                        id: true,
                        siteName: true,
                        citta: true,
                        provincia: true,
                        medicoCompetente: {
                            select: { id: true, firstName: true, lastName: true }
                        }
                    }
                },
                nomine: {
                    where: {
                        tenantId,
                        deletedAt: null,
                        stato: 'ATTIVA',
                        tipoRuolo: { in: MC_NOMINA_TYPES },
                        ...nominaWindow,
                        ...(canViewAll ? {} : { personId: person.id })
                    },
                    select: {
                        id: true,
                        tipoRuolo: true,
                        dataInizio: true,
                        dataScadenza: true,
                        person: {
                            select: { id: true, firstName: true, lastName: true }
                        }
                    },
                    orderBy: [{ tipoRuolo: 'asc' }, { dataInizio: 'desc' }]
                }
            },
            take: 1000
        });

        return profiles
            .map(profile => {
                const nomine = profile.nomine || [];
                const mcNomina = nomine.find(n => n.tipoRuolo === 'MEDICO_COMPETENTE');
                const coordinated = nomine.filter(n => n.tipoRuolo === 'MEDICO_COMPETENTE_COORDINATO');
                const siteMc = profile.sites?.find(site => site.medicoCompetente)?.medicoCompetente;
                const medicoCompetente = mcNomina?.person || siteMc || null;

                return {
                    id: profile.id,
                    ragioneSociale: profile.company?.ragioneSociale || 'Azienda senza denominazione',
                    piva: profile.company?.piva,
                    codiceFiscale: profile.company?.codiceFiscale,
                    sede: [profile.company?.sedeLegaleCitta, profile.company?.sedeLegaleProvincia].filter(Boolean).join(' · ') || null,
                    medicoCompetente: medicoCompetente
                        ? `${medicoCompetente.lastName || ''} ${medicoCompetente.firstName || ''}`.trim()
                        : null,
                    mediciCoordinati: coordinated
                        .map(n => `${n.person?.lastName || ''} ${n.person?.firstName || ''}`.trim())
                        .filter(Boolean),
                    nomineCount: nomine.length + (siteMc && !mcNomina ? 1 : 0),
                    canViewAll
                };
            })
            .sort((a, b) => a.ragioneSociale.localeCompare(b.ragioneSociale, 'it'));
    }

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
        const accertamenti = await this.getAccertamentiSanitari(personId, tenantId, companyTenantProfileId);

        // 5. Giudizio idoneità attuale
        const giudizio = await this.getGiudizioAttuale(personId, tenantId);

        // 6. Dati Medico Competente
        const medicoCompetente = await this.getMedicoCompetente(companyTenantProfileId, tenantId);
        const visiteMediche = await this.getVisiteMediche(personId, companyTenantProfileId, tenantId);
        const allegatiCartella = await this.getAllegatiCartella(personId, companyTenantProfileId, tenantId);
        const ultimaVisita = visiteMediche[0] || null;
        const datiStrutturati = ultimaVisita?.datiStrutturati || {};
        const anamnesi = {
            lavorativa: firstValue(datiStrutturati, ['anamnesi_lavorativa', 'anamnesiLavorativa', 'anamnesi.lavorativa']) || ultimaVisita?.anamnesi || null,
            familiare: firstValue(datiStrutturati, ['anamnesi_familiare', 'anamnesiFamiliare', 'anamnesi.familiare']),
            fisiologica: firstValue(datiStrutturati, ['anamnesi_fisiologica', 'anamnesiFisiologica', 'anamnesi.fisiologica']),
            patologicaRemota: firstValue(datiStrutturati, ['anamnesi_patologica_remota', 'anamnesiPatologicaRemota', 'anamnesi.patologica_remota']),
            patologicaProssima: firstValue(datiStrutturati, ['anamnesi_patologica_prossima', 'anamnesiPatologicaProssima', 'anamnesi.patologica_prossima'])
        };
        const istituzione = {
            motivo: visiteMediche.length <= 1
                ? 'Prima istituzione della cartella sanitaria e di rischio'
                : 'Aggiornamento cartella sanitaria e di rischio',
            data: visiteMediche.at(-1)?.dataOra || lavoratore.profile?.hiredDate || new Date(),
            numeroProgressivoPagine: null,
            firmaMedicoCompetente: medicoCompetente?.nomeCompleto || null
        };

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
                birthProvince: lavoratore.birthProvince,
                nationality: deriveNationalityFromBirthPlace(lavoratore),
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
                settore: azienda.company?.settore,
                attivitaSvolta: azienda.company?.settore || azienda.company?.codiceAteco,
                unitaProduttive: (azienda.sites || []).map(site => ({
                    id: site.id,
                    nome: site.siteName,
                    indirizzo: site.indirizzo,
                    citta: site.citta,
                    cap: site.cap,
                    provincia: site.provincia
                })),
                sedeLavoro: datiLavorativi.sedeLavoro
            },

            istituzione,

            // Sezione 3: Dati Lavorativi
            datiLavorativi: {
                dataAssunzione: lavoratore.profile?.hiredDate || null,
                mansioneAttuale: datiLavorativi.mansione,
                mansioneCodice: datiLavorativi.codiceMansione,
                profiloProfessionale: lavoratore.profile?.title || datiLavorativi.profiloProfessionale,
                reparto: datiLavorativi.reparto,
                unitaProduttiva: datiLavorativi.unitaProduttiva,
                dataInizioMansione: datiLavorativi.dataInizioMansione,
                protocolloSanitario: datiLavorativi.protocolloSanitario,
                storicoMansioni: datiLavorativi.storicoMansioni || []
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
            visiteMediche,
            anamnesi,
            programmaSorveglianzaSanitaria: {
                protocollo: datiLavorativi.protocolloSanitario,
                accertamentiPrevisti: datiLavorativi.accertamentiPrevisti || []
            },
            esameObiettivo: ultimaVisita?.esamiObiettivo || firstValue(datiStrutturati, ['esame_obiettivo', 'esameObiettivo']) || null,
            provvedimentiMedicoCompetente: firstValue(datiStrutturati, ['provvedimenti_mc', 'provvedimentiMedicoCompetente']) || ultimaVisita?.prescrizioni || null,

            // Sezione 6: Giudizio Idoneità
            giudizioAttuale: giudizio,
            comunicazioneGiudizio: giudizio ? {
                destinatari: 'Datore di lavoro e lavoratore',
                contenutoMinimo: 'Generalità, ragione sociale azienda, mansione/rischi, esito del giudizio, scadenza e termini di ricorso all’organo di vigilanza entro 30 giorni.',
                dataNotificaLavoratore: giudizio.dataNotificaLavoratore,
                dataNotificaDatoreLavoro: giudizio.dataNotificaDatoreLavoro
            } : null,

            // Sezione 7: Medico Competente
            medicoCompetente: medicoCompetente,
            allegatiCartella
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
                birthProvince: true,
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
                        status: true,
                        title: true,
                        companyTenantProfileId: true,
                        siteId: true,
                        repartoId: true,
                        protocolloSanitarioId: true
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

        const profile = await prisma.personTenantProfile.findFirst({
            where: { personId, tenantId, companyTenantProfileId, deletedAt: null },
            include: {
                reparto: { select: { nome: true, codice: true } },
                site: {
                    select: {
                        id: true,
                        siteName: true,
                        indirizzo: true,
                        citta: true,
                        cap: true,
                        provincia: true
                    }
                },
                protocolloSanitario: {
                    select: {
                        id: true,
                        codice: true,
                        denominazione: true,
                        periodicitaVisiteMesi: true,
                        prestazioni: {
                            where: { deletedAt: null },
                            select: {
                                isObbligatoria: true,
                                periodicita: true,
                                periodicitaCustomMesi: true,
                                prestazione: {
                                    select: { id: true, nome: true, codice: true }
                                }
                            }
                        }
                    }
                }
            }
        });

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

        const storico = await prisma.lavoratoreMansione.findMany({
            where: {
                personId,
                tenantId,
                deletedAt: null,
                mansione: {
                    deletedAt: null,
                    OR: [
                        { site: { companyTenantProfileId } },
                        { siteId: null }
                    ]
                }
            },
            include: mansioneInclude,
            orderBy: [{ isAttiva: 'desc' }, { dataInizio: 'desc' }],
            take: 100
        });

        const protocolloSanitario = profile?.protocolloSanitario ? {
            id: profile.protocolloSanitario.id,
            codice: profile.protocolloSanitario.codice,
            denominazione: profile.protocolloSanitario.denominazione,
            periodicitaVisiteMesi: profile.protocolloSanitario.periodicitaVisiteMesi
        } : null;
        const accertamentiPrevisti = profile?.protocolloSanitario?.prestazioni?.map(p => ({
            id: p.prestazione?.id,
            nome: p.prestazione?.nome,
            codice: p.prestazione?.codice,
            obbligatoria: p.isObbligatoria,
            periodicita: p.periodicita,
            periodicitaCustomMesi: p.periodicitaCustomMesi
        })) || [];
        const sedeLavoro = profile?.site ? {
            id: profile.site.id,
            nome: profile.site.siteName,
            indirizzo: profile.site.indirizzo,
            citta: profile.site.citta,
            cap: profile.site.cap,
            provincia: profile.site.provincia
        } : null;
        const storicoMansioni = storico.map(item => ({
            mansioneNome: item.mansione?.denominazione,
            mansioneCodice: item.mansione?.codice,
            reparto: item.mansione?.site?.siteName,
            dataInizio: item.dataInizio,
            dataFine: item.dataFine,
            isAttiva: item.isAttiva,
            isPrimaria: item.isPrimaria
        }));

        if (!assegnazione) {
            return {
                mansione: null,
                codiceMansione: null,
                reparto: null,
                dataInizioMansione: null,
                unitaProduttiva: null,
                sedeLavoro,
                profiloProfessionale: profile?.title,
                protocolloSanitario,
                accertamentiPrevisti,
                storicoMansioni,
                rischi: []
            };
        }

        return {
            mansione: assegnazione.mansione?.denominazione,
            codiceMansione: assegnazione.mansione?.codice,
            descrizioneMansione: assegnazione.mansione?.descrizione,
            reparto: profile?.reparto?.nome || assegnazione.mansione?.site?.siteName,
            unitaProduttiva: profile?.site?.siteName || assegnazione.mansione?.site?.siteName || assegnazione.mansione?.site?.citta,
            sedeLavoro: sedeLavoro || {
                id: assegnazione.mansione?.site?.id,
                nome: assegnazione.mansione?.site?.siteName,
                citta: assegnazione.mansione?.site?.citta
            },
            dataInizioMansione: assegnazione.dataInizio,
            dataFineMansione: assegnazione.dataFine,
            profiloProfessionale: profile?.title,
            protocolloSanitario,
            accertamentiPrevisti,
            storicoMansioni,
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
    static async getAccertamentiSanitari(personId, tenantId, companyTenantProfileId = null) {
        const visite = await prisma.visita.findMany({
            where: {
                pazienteId: personId,
                tenantId,
                deletedAt: null,
                tipoVisitaMDL: { not: null },
                ...(companyTenantProfileId ? {
                    OR: [
                        { appuntamento: { companyTenantProfileId } },
                        { scadenzePrestazioni: { some: { personId, tenantId, deletedAt: null } } }
                    ]
                } : {})
            },
            orderBy: { dataOra: 'desc' },
            select: {
                id: true,
                dataOra: true,
                tipoVisitaMDL: true,
                noteClinico: true,
                diagnosiPrincipale: true,
                prestazione: {
                    select: { id: true, nome: true, codice: true }
                },
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
            note: v.noteClinico || v.diagnosiPrincipale,
            medicoEsecutore: v.medico ? `${v.medico.lastName} ${v.medico.firstName}` : null,
            prestazioniEseguite: v.prestazione ? [{
                id: v.prestazione.id,
                nome: v.prestazione.nome,
                codice: v.prestazione.codice
            }] : []
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
            dataEmissione: giudizio.dataEmissione,
            dataScadenza: giudizio.dataScadenza,
            dataDecorrenza: giudizio.dataDecorrenza,
            prossimaVisita: giudizio.dataScadenza,
            dataNotificaLavoratore: giudizio.dataNotificaLavoratore,
            dataNotificaDatoreLavoro: giudizio.dataNotificaDatoreLavoro,
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
                                phone: true,
                                registerCode: true
                            },
                            take: 1
                        }
                    }
                }
            }
        });

        let person = nomina?.person;
        let dataInizioNomina = nomina?.dataInizio;
        let dataScadenzaNomina = nomina?.dataScadenza;

        if (!person) {
            const site = await prisma.companySite.findFirst({
                where: {
                    companyTenantProfileId,
                    tenantId,
                    deletedAt: null,
                    medicoCompetenteId: { not: null }
                },
                include: {
                    medicoCompetente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true,
                            tenantProfiles: {
                                where: { tenantId, deletedAt: null },
                                select: { email: true, phone: true, registerCode: true },
                                take: 1
                            }
                        }
                    }
                }
            });
            person = site?.medicoCompetente;
        }

        if (!person) {
            return null;
        }

        const profile = person.tenantProfiles?.[0];

        return {
            id: person.id,
            nome: person.firstName,
            cognome: person.lastName,
            nomeCompleto: `${person.lastName} ${person.firstName}`,
            codiceFiscale: person.taxCode,
            alboMedici: profile?.registerCode,
            email: profile?.email,
            telefono: profile?.phone,
            dataInizioNomina,
            dataScadenzaNomina
        };
    }

    static async getVisiteMediche(personId, companyTenantProfileId, tenantId) {
        const visite = await prisma.visita.findMany({
            where: {
                pazienteId: personId,
                tenantId,
                deletedAt: null,
                tipoVisitaMDL: { not: null },
                ...(companyTenantProfileId ? {
                    OR: [
                        { appuntamento: { companyTenantProfileId } },
                        { giudizioIdoneita: { mansioni: { some: { mansione: { site: { companyTenantProfileId } } } } } }
                    ]
                } : {})
            },
            orderBy: { dataOra: 'desc' },
            select: {
                id: true,
                dataOra: true,
                stato: true,
                tipoVisitaMDL: true,
                anamnesi: true,
                esamiObiettivo: true,
                diagnosiPrincipale: true,
                noteClinico: true,
                datiStrutturati: true,
                prescrizioni: true,
                noteFollowup: true,
                prestazione: { select: { id: true, nome: true, codice: true } },
                medico: { select: { firstName: true, lastName: true } },
                scadenzePrestazioni: {
                    where: { tenantId, deletedAt: null },
                    select: {
                        dataScadenza: true,
                        periodicitaMesi: true,
                        prestazioneId: true,
                        eseguita: true
                    }
                },
                giudizioIdoneita: {
                    select: {
                        tipoGiudizio: true,
                        dataEmissione: true,
                        dataScadenza: true,
                        prescrizioniIdoneita: true,
                        limitazioni: true,
                        motivazioni: true
                    }
                }
            },
            take: 500
        });

        return visite.map(v => ({
            id: v.id,
            data: v.dataOra,
            dataOra: v.dataOra,
            stato: v.stato,
            tipoVisitaMDL: v.tipoVisitaMDL,
            tipoVisitaLabel: this.getTipoVisitaLabel(v.tipoVisitaMDL),
            anamnesi: v.anamnesi,
            esameObiettivo: v.esamiObiettivo,
            diagnosi: v.diagnosiPrincipale,
            note: v.noteClinico,
            datiStrutturati: v.datiStrutturati || {},
            prescrizioni: v.prescrizioni,
            followUp: v.noteFollowup,
            prestazione: v.prestazione,
            medicoEsecutore: v.medico ? `${v.medico.lastName} ${v.medico.firstName}` : null,
            scadenzePrestazioni: v.scadenzePrestazioni || [],
            giudizio: v.giudizioIdoneita ? {
                esito: v.giudizioIdoneita.tipoGiudizio,
                dataEmissione: v.giudizioIdoneita.dataEmissione,
                dataScadenza: v.giudizioIdoneita.dataScadenza,
                prescrizioni: v.giudizioIdoneita.prescrizioniIdoneita,
                limitazioni: v.giudizioIdoneita.limitazioni,
                motivazioni: v.giudizioIdoneita.motivazioni
            } : null
        }));
    }

    static async getAllegatiCartella(personId, companyTenantProfileId, tenantId) {
        const visite = await prisma.visita.findMany({
            where: {
                pazienteId: personId,
                tenantId,
                deletedAt: null,
                tipoVisitaMDL: { not: null },
                ...(companyTenantProfileId ? {
                    OR: [
                        { appuntamento: { companyTenantProfileId } },
                        { giudizioIdoneita: { mansioni: { some: { mansione: { site: { companyTenantProfileId } } } } } }
                    ]
                } : {})
            },
            select: {
                id: true,
                dataOra: true,
                allegatiVisite: {
                    where: { tenantId, deletedAt: null },
                    select: { id: true, tipo: true, nome: true, fileName: true, fileUrl: true, mimeType: true, dataCaricamento: true, tipologiaClinica: true }
                },
                documenti: {
                    where: { tenantId, deletedAt: null },
                    select: { id: true, tipo: true, titolo: true, fileName: true, fileUrl: true, mimeType: true, dataDocumento: true }
                },
                esamiStrumentali: {
                    where: { tenantId, deletedAt: null },
                    select: { id: true, tipoDispositivo: true, tipoEsame: true, pdfPath: true, pdfFilename: true, dataEsame: true }
                }
            },
            orderBy: { dataOra: 'desc' },
            take: 500
        });

        return visite.flatMap(v => [
            ...(v.allegatiVisite || []).map(a => ({
                id: a.id,
                visitaId: v.id,
                visitaData: v.dataOra,
                origine: 'allegato_visita',
                tipo: a.tipologiaClinica || a.tipo,
                titolo: a.nome || a.fileName,
                fileName: a.fileName,
                fileUrl: a.fileUrl,
                mimeType: a.mimeType,
                data: a.dataCaricamento
            })),
            ...(v.documenti || []).map(d => ({
                id: d.id,
                visitaId: v.id,
                visitaData: v.dataOra,
                origine: 'documento_clinico',
                tipo: d.tipo,
                titolo: d.titolo || d.fileName,
                fileName: d.fileName,
                fileUrl: d.fileUrl,
                mimeType: d.mimeType,
                data: d.dataDocumento
            })),
            ...(v.esamiStrumentali || []).filter(e => e.pdfPath).map(e => ({
                id: e.id,
                visitaId: v.id,
                visitaData: v.dataOra,
                origine: 'esame_strumentale',
                tipo: e.tipoDispositivo || e.tipoEsame,
                titolo: e.pdfFilename || e.tipoEsame,
                fileName: e.pdfFilename,
                fileUrl: e.pdfPath,
                mimeType: 'application/pdf',
                data: e.dataEsame
            }))
        ]);
    }

    static async refreshFromCompletedVisit(visita, tenantId) {
        if (!visita?.tipoVisitaMDL || !visita?.pazienteId) return null;
        const companyTenantProfileId = visita.appuntamento?.companyTenantProfileId
            || (await this.findCompanyForWorker(visita.pazienteId, tenantId));
        if (!companyTenantProfileId) return null;
        return this.generateData(visita.pazienteId, companyTenantProfileId, tenantId);
    }

    static async findCompanyForWorker(personId, tenantId) {
        const profile = await prisma.personTenantProfile.findFirst({
            where: { personId, tenantId, deletedAt: null, companyTenantProfileId: { not: null } },
            select: { companyTenantProfileId: true }
        });
        return profile?.companyTenantProfileId || null;
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
