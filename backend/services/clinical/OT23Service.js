/**
 * OT23Service - Gestione Modello OT23 INAIL
 * 
 * Gestione della domanda per riduzione tasso medio tariffa INAIL
 * https://www.inail.it/cs/internet/attivita/prevenzione-e-sicurezza/agevolazioni-e-finanziamenti/incentivi-per-la-prevenzione/modello-ot23.html
 * 
 * @module services/clinical/OT23Service
 * @project P44 - ElementSicurezza OT23 Management
 * 
 * NOTE: Il modello Prisma si chiama "ot23_domande" (tabella), non "oT23"
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';


/**
 * Struttura OT23 secondo INAIL:
 * 
 * SEZIONE A - Interventi di prevenzione (partecipazione INAIL)
 * - A1: Convenzioni INAIL
 * - A2: Corsi di formazione finanziati INAIL
 * 
 * SEZIONE B - Interventi prevenzione aziendali (suddivisi in aree)
 * - B1: Misure organizzative
 * - B2: Misure tecniche e procedurali
 * - B3: Formazione e informazione
 * - B4: Sorveglianza sanitaria
 * - B5: Gestione emergenze
 * - B6: Altro
 * 
 * Per ottenere la riduzione: punteggio totale >= 100 punti
 */

// =====================================================
// CATALOGO INTERVENTI OT23 (aggiornato 2024)
// =====================================================

/**
 * Interventi Sezione A - Partecipazione attiva a iniziative INAIL
 * Punteggi pre-definiti da INAIL
 */
export const INTERVENTI_SEZIONE_A = [
    {
        codice: 'A-1.1',
        descrizione: 'Partecipazione a bando ISI INAIL con progetto finanziato',
        punteggio: 100,
        note: 'Sufficiente da solo per accedere al beneficio'
    },
    {
        codice: 'A-1.2',
        descrizione: 'Partecipazione attiva a progetto prevenzionale INAIL',
        punteggio: 50,
        note: 'Richiede documentazione da INAIL'
    },
    {
        codice: 'A-2.1',
        descrizione: 'Formazione specifica finanziata da INAIL (SAFE WORK)',
        punteggio: 30,
        note: 'Con attestato finale'
    }
];

/**
 * Interventi Sezione B - Interventi prevenzione aziendali
 * I punteggi variano in base alla tipologia e documentazione
 */
export const INTERVENTI_SEZIONE_B = {
    B1_ORGANIZZATIVE: [
        {
            codice: 'B-1.1',
            descrizione: 'Sistema di gestione UNI EN ISO 45001 certificato',
            punteggio: 100,
            categoria: 'ORGANIZZATIVE',
            documentazione: ['Certificato ISO 45001 in corso di validità']
        },
        {
            codice: 'B-1.2',
            descrizione: 'Adozione modello organizzativo D.Lgs 231/01 - parte SSL',
            punteggio: 100,
            categoria: 'ORGANIZZATIVE',
            documentazione: ['Modello 231 con parte sicurezza sul lavoro', 'Delibera ODV']
        },
        {
            codice: 'B-1.3',
            descrizione: 'Sistema SGSL (UNI-INAIL) senza certificazione terza',
            punteggio: 50,
            categoria: 'ORGANIZZATIVE',
            documentazione: ['Documento SGSL', 'Audit interno']
        },
        {
            codice: 'B-1.4',
            descrizione: 'Audit di sicurezza periodici (almeno 2/anno)',
            punteggio: 25,
            categoria: 'ORGANIZZATIVE',
            documentazione: ['Report audit con date', 'Piano miglioramento']
        }
    ],
    B2_TECNICHE: [
        {
            codice: 'B-2.1',
            descrizione: 'Sistemi di protezione collettiva oltre gli obblighi',
            punteggio: 40,
            categoria: 'TECNICHE',
            documentazione: ['Elenco protezioni installate', 'Foto installazioni']
        },
        {
            codice: 'B-2.2',
            descrizione: 'DPI di categoria superiore a quanto richiesto dalla VdR',
            punteggio: 25,
            categoria: 'TECNICHE',
            documentazione: ['Elenco DPI con categorie', 'Confronto con VdR']
        },
        {
            codice: 'B-2.3',
            descrizione: 'Acquisto macchinari con standard sicurezza superiori',
            punteggio: 30,
            categoria: 'TECNICHE',
            documentazione: ['Documentazione tecnica macchinari', 'Dichiarazione CE']
        },
        {
            codice: 'B-2.4',
            descrizione: 'Sistemi di monitoraggio ambientale continuo',
            punteggio: 30,
            categoria: 'TECNICHE',
            documentazione: ['Certificati sensori', 'Report monitoraggio']
        }
    ],
    B3_FORMAZIONE: [
        {
            codice: 'B-3.1',
            descrizione: 'Formazione eccedente gli obblighi ASR 21/12/2011',
            punteggio: 40,
            categoria: 'FORMAZIONE',
            documentazione: ['Piano formazione', 'Attestati', 'Registro presenze']
        },
        {
            codice: 'B-3.2',
            descrizione: 'Formazione RLS superiore a 32/4 ore',
            punteggio: 20,
            categoria: 'FORMAZIONE',
            documentazione: ['Attestato formazione RLS']
        },
        {
            codice: 'B-3.3',
            descrizione: 'Formazione preposti oltre gli obblighi',
            punteggio: 20,
            categoria: 'FORMAZIONE',
            documentazione: ['Attestati preposti', 'Ore eccedenti documentate']
        },
        {
            codice: 'B-3.4',
            descrizione: 'Percorsi formativi con realtà virtuale/aumentata',
            punteggio: 25,
            categoria: 'FORMAZIONE',
            documentazione: ['Descrizione sistema VR/AR', 'Report utilizzo']
        }
    ],
    B4_SORVEGLIANZA: [
        {
            codice: 'B-4.1',
            descrizione: 'Protocollo sanitario eccedente gli obblighi',
            punteggio: 30,
            categoria: 'SORVEGLIANZA',
            documentazione: ['Protocollo sanitario', 'Evidenze visite aggiuntive']
        },
        {
            codice: 'B-4.2',
            descrizione: 'Screening tumori professionali oltre protocollo minimo',
            punteggio: 25,
            categoria: 'SORVEGLIANZA',
            documentazione: ['Piano screening', 'Elenco esami effettuati']
        },
        {
            codice: 'B-4.3',
            descrizione: 'Campagna promozione stili di vita sani',
            punteggio: 20,
            categoria: 'SORVEGLIANZA',
            documentazione: ['Piano campagna', 'Materiali distribuiti']
        },
        {
            codice: 'B-4.4',
            descrizione: 'Defibrillatore DAE oltre gli obblighi con formazione BLSD',
            punteggio: 25,
            categoria: 'SORVEGLIANZA',
            documentazione: ['Registro DAE', 'Attestati BLSD dipendenti']
        }
    ],
    B5_EMERGENZE: [
        {
            codice: 'B-5.1',
            descrizione: 'Piano emergenza superiore a obblighi con esercitazioni trimestrali',
            punteggio: 25,
            categoria: 'EMERGENZE',
            documentazione: ['Piano emergenza', 'Verbali esercitazioni']
        },
        {
            codice: 'B-5.2',
            descrizione: 'Squadra emergenze con ore formazione superiori',
            punteggio: 20,
            categoria: 'EMERGENZE',
            documentazione: ['Attestati squadra emergenze', 'Ore formazione']
        }
    ],
    B6_ALTRO: [
        {
            codice: 'B-6.1',
            descrizione: 'Near miss reporting system attivo',
            punteggio: 30,
            categoria: 'ALTRO',
            documentazione: ['Procedura near miss', 'Registro segnalazioni']
        },
        {
            codice: 'B-6.2',
            descrizione: 'Incentivazione economica comportamenti sicuri',
            punteggio: 20,
            categoria: 'ALTRO',
            documentazione: ['Policy incentivi', 'Evidenze erogazioni']
        },
        {
            codice: 'B-6.3',
            descrizione: 'Coinvolgimento attivo RLS in progetti miglioramento',
            punteggio: 15,
            categoria: 'ALTRO',
            documentazione: ['Verbali riunioni', 'Progetti con RLS']
        }
    ]
};

/**
 * Tabella percentuali riduzione per dimensione azienda
 * Fonte: INAIL - Tabella riduzione OT23
 */
export const TABELLA_RIDUZIONI = [
    { da: 1, a: 10, percentuale: 28, label: 'Micro (1-10)' },
    { da: 11, a: 50, percentuale: 18, label: 'Piccola (11-50)' },
    { da: 51, a: 200, percentuale: 10, label: 'Media (51-200)' },
    { da: 201, a: Infinity, percentuale: 5, label: 'Grande (201+)' }
];

export const SEZIONI_OT23_2026 = [
    {
        codice: 'A',
        titolo: 'Prevenzione degli infortuni mortali',
        requisito: 'Un intervento di sezione A è sufficiente per il requisito OT23 2026.',
        interventi: [
            { codice: 'A-1.1', descrizione: 'Interventi per la prevenzione del rischio di caduta dall’alto', categoria: 'INFORTUNI_MORTALI', documentazione: ['Relazione tecnica', 'Evidenze fotografiche', 'Fatture o verbali di installazione'] },
            { codice: 'A-2.1', descrizione: 'Interventi per la prevenzione del rischio di seppellimento/sprofondamento', categoria: 'INFORTUNI_MORTALI', documentazione: ['DVR aggiornato', 'Procedure operative', 'Documentazione tecnica'] },
            { codice: 'A-3.1', descrizione: 'Interventi per la prevenzione del rischio elettrico', categoria: 'INFORTUNI_MORTALI', documentazione: ['Dichiarazioni di conformità', 'Verbali verifiche', 'Registro manutenzioni'] },
            { codice: 'A-4.1', descrizione: 'Interventi per la prevenzione di incendi/esplosioni', categoria: 'INFORTUNI_MORTALI', documentazione: ['Valutazione rischio incendio/esplosione', 'Certificazioni impianti', 'Verbali prove'] }
        ]
    },
    {
        codice: 'B',
        titolo: 'Prevenzione del rischio stradale',
        requisito: 'Concorre al requisito se combinato con almeno un altro intervento B-F.',
        interventi: [
            { codice: 'B-1.1', descrizione: 'Corso di guida sicura per lavoratori che usano veicoli aziendali', categoria: 'RISCHIO_STRADALE', documentazione: ['Programma corso', 'Registro presenze', 'Attestati'] },
            { codice: 'B-2.1', descrizione: 'Sistemi di monitoraggio e assistenza alla guida sui mezzi aziendali', categoria: 'RISCHIO_STRADALE', documentazione: ['Schede tecniche', 'Contratti/installazioni', 'Report uso'] },
            { codice: 'B-3.1', descrizione: 'Piano di mobilità sicura casa-lavoro e lavoro-lavoro', categoria: 'RISCHIO_STRADALE', documentazione: ['Piano mobilità', 'Comunicazioni ai lavoratori', 'Monitoraggio attuazione'] }
        ]
    },
    {
        codice: 'C',
        titolo: 'Prevenzione delle malattie professionali',
        requisito: 'Concorre al requisito se combinato con almeno un altro intervento B-F.',
        interventi: [
            { codice: 'C-1.1', descrizione: 'Riduzione dell’esposizione ad agenti chimici, cancerogeni o mutageni', categoria: 'MALATTIE_PROFESSIONALI', documentazione: ['Valutazione esposizione', 'Misure ambientali', 'Procedure aggiornate'] },
            { codice: 'C-2.1', descrizione: 'Riduzione del rischio da sovraccarico biomeccanico', categoria: 'MALATTIE_PROFESSIONALI', documentazione: ['Valutazione ergonomica', 'Evidenze attrezzature', 'Formazione/addestramento'] },
            { codice: 'C-3.1', descrizione: 'Riduzione esposizione a rumore o vibrazioni', categoria: 'MALATTIE_PROFESSIONALI', documentazione: ['Misurazioni strumentali', 'Schede DPI/attrezzature', 'Piano miglioramento'] },
            { codice: 'C-4.1', descrizione: 'Programmi di promozione della salute e prevenzione cardiovascolare/metabolica', categoria: 'MALATTIE_PROFESSIONALI', documentazione: ['Programma sanitario', 'Materiali informativi', 'Report aggregati anonimi'] }
        ]
    },
    {
        codice: 'D',
        titolo: 'Formazione, addestramento, informazione',
        requisito: 'Concorre al requisito se combinato con almeno un altro intervento B-F.',
        interventi: [
            { codice: 'D-1.1', descrizione: 'Formazione aggiuntiva rispetto agli obblighi normativi', categoria: 'FORMAZIONE', documentazione: ['Piano formativo', 'Registri presenze', 'Attestati'] },
            { codice: 'D-2.1', descrizione: 'Addestramento pratico documentato su attrezzature e procedure critiche', categoria: 'FORMAZIONE', documentazione: ['Procedure', 'Verbali addestramento', 'Valutazioni apprendimento'] },
            { codice: 'D-3.1', descrizione: 'Campagne informative strutturate su salute e sicurezza', categoria: 'FORMAZIONE', documentazione: ['Materiali campagna', 'Calendario attività', 'Evidenze diffusione'] }
        ]
    },
    {
        codice: 'E',
        titolo: 'Misure organizzative per la gestione della salute e sicurezza',
        requisito: 'Concorre al requisito se combinato con almeno un altro intervento B-F.',
        interventi: [
            { codice: 'E-1.1', descrizione: 'Sistema di gestione UNI EN ISO 45001 certificato o mantenuto', categoria: 'ORGANIZZATIVE', documentazione: ['Certificato in corso di validità', 'Audit', 'Riesame direzione'] },
            { codice: 'E-2.1', descrizione: 'Modello organizzativo ex art. 30 D.Lgs 81/08', categoria: 'ORGANIZZATIVE', documentazione: ['Modello adottato', 'Verbale approvazione', 'Sistema disciplinare'] },
            { codice: 'E-3.1', descrizione: 'Sistema strutturato di segnalazione near miss e miglioramenti', categoria: 'ORGANIZZATIVE', documentazione: ['Procedura', 'Registro segnalazioni', 'Azioni correttive'] },
            { codice: 'E-4.1', descrizione: 'Audit periodici interni con piano di miglioramento verificato', categoria: 'ORGANIZZATIVE', documentazione: ['Report audit', 'Piano azioni', 'Verifica chiusura'] }
        ]
    },
    {
        codice: 'F',
        titolo: 'Gestione emergenze e DPI',
        requisito: 'Concorre al requisito se combinato con almeno un altro intervento B-F.',
        interventi: [
            { codice: 'F-1.1', descrizione: 'Piano emergenze con esercitazioni aggiuntive documentate', categoria: 'EMERGENZE_DPI', documentazione: ['Piano emergenza', 'Verbali prove', 'Azioni migliorative'] },
            { codice: 'F-2.1', descrizione: 'DPI o dispositivi collettivi superiori agli obblighi minimi', categoria: 'EMERGENZE_DPI', documentazione: ['Schede tecniche', 'Consegna DPI', 'Valutazione efficacia'] },
            { codice: 'F-3.1', descrizione: 'DAE con formazione BLSD e manutenzione documentata', categoria: 'EMERGENZE_DPI', documentazione: ['Registro DAE', 'Attestati BLSD', 'Contratto manutenzione'] }
        ]
    }
].map(section => ({
    ...section,
    interventi: section.interventi.map(intervento => ({
        ...intervento,
        sezione: section.codice,
        punteggio: section.codice === 'A' ? 100 : 50
    }))
}));

class OT23Service {
    static getAllInterventi(interventiA = [], interventiB = []) {
        return [
            ...(Array.isArray(interventiA) ? interventiA.map(i => ({ ...i, sezione: i.sezione || 'A' })) : []),
            ...(Array.isArray(interventiB) ? interventiB.map(i => ({ ...i, sezione: i.sezione || 'B' })) : [])
        ];
    }

    static hasRequisitiBeneficio(interventiA = [], interventiB = []) {
        const all = this.getAllInterventi(interventiA, interventiB);
        const hasA = all.some(i => String(i.sezione || i.codice?.charAt(0)).toUpperCase() === 'A');
        const countBF = all.filter(i => ['B', 'C', 'D', 'E', 'F'].includes(String(i.sezione || i.codice?.charAt(0)).toUpperCase())).length;
        return hasA || countBF >= 2;
    }

    /**
     * Lista tutte le domande OT23 con filtri
     */
    static async findAll(tenantId, options = {}) {
        const {
            page = 1,
            limit = 20,
            companyTenantProfileId,
            anno,
            stato
        } = options;

        const where = {
            tenantId,
            deletedAt: null,
            ...(companyTenantProfileId && { companyTenantProfileId }),
            ...(anno && { anno: parseInt(anno) }),
            ...(stato && { stato })
        };

        const [data, total] = await Promise.all([
            prisma.oT23.findMany({
                where,
                include: {
                    companyTenantProfile: {
                        include: {
                            company: {
                                select: {
                                    id: true,
                                    ragioneSociale: true,
                                    piva: true
                                }
                            }
                        }
                    }
                },
                orderBy: [{ anno: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.oT23.count({ where })
        ]);

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Ottiene una domanda OT23 per ID
     */
    static async findById(id, tenantId) {
        return await prisma.oT23.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                companyTenantProfile: {
                    include: {
                        company: true,
                        sites: {
                            where: { deletedAt: null },
                            select: { id: true, siteName: true }
                        }
                    }
                }
            }
        });
    }

    /**
     * Crea una nuova domanda OT23
     */
    static async create(data, tenantId) {
        const { companyTenantProfileId, anno, pat, ...otherData } = data;

        logger.info({ companyTenantProfileId, anno, tenantId }, 'Creazione domanda OT23');

        // Verifica esistenza per anno/azienda
        const existing = await prisma.oT23.findFirst({
            where: {
                companyTenantProfileId,
                anno,
                tenantId,
                deletedAt: null
            }
        });

        if (existing) {
            throw new Error(`Domanda OT23 già esistente per anno ${anno}`);
        }

        // Ottieni dati azienda per calcolare riduzione
        const profile = await prisma.companyTenantProfile.findFirst({
            where: { id: companyTenantProfileId, tenantId, deletedAt: null },
            include: {
                company: true,
                // Conta dipendenti per dimensione azienda
                personProfiles: {
                    where: { deletedAt: null, status: 'ACTIVE' }
                }
            }
        });

        if (!profile) {
            throw new Error('Profilo aziendale non trovato');
        }

        const numeroDipendenti = profile.personProfiles?.length || 0;
        const percentualeRiduzione = this.getPercentualeRiduzione(numeroDipendenti);

        return await prisma.oT23.create({
            data: {
                companyTenantProfileId,
                anno,
                pat: pat || '',
                tenantId,
                percentualeRiduzione,
                classificazioneRischio: profile.company?.settore || null,
                ...otherData
            },
            include: {
                companyTenantProfile: {
                    include: { company: true }
                }
            }
        });
    }

    /**
     * Aggiorna una domanda OT23
     */
    static async update(id, data, tenantId) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            throw new Error('Domanda OT23 non trovata');
        }

        // Non permettere modifiche se già inviata
        if (['INVIATO', 'APPROVATO', 'IN_VALUTAZIONE'].includes(existing.stato)) {
            throw new Error('Impossibile modificare una domanda già inviata');
        }

        // Ricalcola punteggi se aggiornati gli interventi
        let updateData = { ...data };

        if (data.interventiA || data.interventiB) {
            const interventiA = data.interventiA || existing.interventiA || [];
            const interventiB = data.interventiB || existing.interventiB || [];

            updateData.punteggioSezioneA = this.calcolaPunteggioSezione(interventiA);
            updateData.punteggioSezioneB = this.calcolaPunteggioSezione(interventiB);
            updateData.punteggioTotale = updateData.punteggioSezioneA + updateData.punteggioSezioneB;
            updateData.haRequisitiBeneficio = this.hasRequisitiBeneficio(interventiA, interventiB);
        }

        // Calcola risparmio se aggiornato premio
        if (data.premioAnnuale) {
            const percentuale = existing.percentualeRiduzione || 10;
            updateData.risparmioStimato = parseFloat(data.premioAnnuale) * (percentuale / 100);
        }

        return await prisma.oT23.update({
            where: { id },
            data: updateData,
            include: {
                companyTenantProfile: {
                    include: { company: true }
                }
            }
        });
    }

    /**
     * Aggiunge un intervento alla domanda
     */
    static async addIntervento(id, sezione, intervento, tenantId) {
        const domanda = await this.findById(id, tenantId);
        if (!domanda) {
            throw new Error('Domanda OT23 non trovata');
        }

        const normalizedSection = String(sezione || intervento.sezione || '').toUpperCase();
        const field = normalizedSection === 'A' ? 'interventiA' : 'interventiB';
        const interventi = domanda[field] || [];

        // Verifica non duplicato
        if (interventi.some(i => i.codice === intervento.codice)) {
            throw new Error(`Intervento ${intervento.codice} già presente`);
        }

        interventi.push({
            ...intervento,
            sezione: normalizedSection || intervento.sezione || (field === 'interventiA' ? 'A' : 'B'),
            dataAggiunta: new Date().toISOString(),
            documentiCaricati: []
        });

        // Ricalcola punteggi
        const punteggioSezioneA = field === 'interventiA'
            ? this.calcolaPunteggioSezione(interventi)
            : domanda.punteggioSezioneA;
        const punteggioSezioneB = field === 'interventiB'
            ? this.calcolaPunteggioSezione(interventi)
            : domanda.punteggioSezioneB;
        const punteggioTotale = punteggioSezioneA + punteggioSezioneB;

        return await prisma.oT23.update({
            where: { id },
            data: {
                [field]: interventi,
                punteggioSezioneA,
                punteggioSezioneB,
                punteggioTotale,
                haRequisitiBeneficio: this.hasRequisitiBeneficio(
                    field === 'interventiA' ? interventi : domanda.interventiA,
                    field === 'interventiB' ? interventi : domanda.interventiB
                )
            }
        });
    }

    /**
     * Rimuove un intervento dalla domanda
     */
    static async removeIntervento(id, sezione, codiceIntervento, tenantId) {
        const domanda = await this.findById(id, tenantId);
        if (!domanda) {
            throw new Error('Domanda OT23 non trovata');
        }

        const field = sezione === 'A' ? 'interventiA' : 'interventiB';
        const interventi = (domanda[field] || []).filter(i => i.codice !== codiceIntervento);

        // Ricalcola punteggi
        const punteggioSezioneA = sezione === 'A'
            ? this.calcolaPunteggioSezione(interventi)
            : domanda.punteggioSezioneA;
        const punteggioSezioneB = sezione === 'B'
            ? this.calcolaPunteggioSezione(interventi)
            : domanda.punteggioSezioneB;
        const punteggioTotale = punteggioSezioneA + punteggioSezioneB;

        return await prisma.oT23.update({
            where: { id },
            data: {
                [field]: interventi,
                punteggioSezioneA,
                punteggioSezioneB,
                punteggioTotale,
                haRequisitiBeneficio: this.hasRequisitiBeneficio(
                    sezione === 'A' ? interventi : domanda.interventiA,
                    sezione === 'B' ? interventi : domanda.interventiB
                )
            }
        });
    }

    /**
     * Calcola punteggio totale di una sezione
     */
    static calcolaPunteggioSezione(interventi) {
        if (!Array.isArray(interventi)) return 0;
        return interventi.reduce((sum, i) => sum + (i.punteggio || 0), 0);
    }

    /**
     * Ottiene la percentuale riduzione in base al numero dipendenti
     */
    static getPercentualeRiduzione(numeroDipendenti) {
        const fascia = TABELLA_RIDUZIONI.find(
            f => numeroDipendenti >= f.da && numeroDipendenti <= f.a
        );
        return fascia ? fascia.percentuale : 5; // Default grande impresa
    }

    /**
     * Calcola risparmio stimato
     */
    static calcolaRisparmioStimato(premioAnnuale, numeroDipendenti) {
        const percentuale = this.getPercentualeRiduzione(numeroDipendenti);
        const risparmio = premioAnnuale * (percentuale / 100);
        return {
            percentualeRiduzione: percentuale,
            risparmioAnnuale: risparmio,
            fasciaAzienda: TABELLA_RIDUZIONI.find(
                f => numeroDipendenti >= f.da && numeroDipendenti <= f.a
            )?.label || 'Non classificata'
        };
    }

    /**
     * Imposta stato domanda (per workflow)
     */
    static async updateStato(id, stato, metadata = {}, tenantId) {
        const domanda = await this.findById(id, tenantId);
        if (!domanda) {
            throw new Error('Domanda OT23 non trovata');
        }

        // Validazioni transizione stato
        const transizioniValide = {
            'BOZZA': ['PRONTO', 'SCADUTO'],
            'PRONTO': ['INVIATO', 'BOZZA'],
            'INVIATO': ['IN_VALUTAZIONE', 'APPROVATO', 'RESPINTO', 'INTEGRAZIONI_RICHIESTE'],
            'IN_VALUTAZIONE': ['APPROVATO', 'RESPINTO', 'INTEGRAZIONI_RICHIESTE'],
            'INTEGRAZIONI_RICHIESTE': ['INVIATO'],
            'APPROVATO': [],
            'RESPINTO': [],
            'SCADUTO': []
        };

        if (!transizioniValide[domanda.stato]?.includes(stato)) {
            throw new Error(`Transizione da ${domanda.stato} a ${stato} non permessa`);
        }

        const updateData = { stato };

        if (stato === 'INVIATO') {
            updateData.dataInvio = new Date();
        } else if (stato === 'APPROVATO' || stato === 'RESPINTO') {
            updateData.dataEsito = new Date();
            if (metadata.esito) {
                updateData.esito = metadata.esito;
            }
        }

        if (metadata.protocolloInail) {
            updateData.protocolloInail = metadata.protocolloInail;
        }

        return await prisma.oT23.update({
            where: { id },
            data: updateData
        });
    }

    /**
     * Soft delete domanda
     */
    static async delete(id, tenantId) {
        const domanda = await this.findById(id, tenantId);
        if (!domanda) {
            throw new Error('Domanda OT23 non trovata');
        }

        if (['INVIATO', 'APPROVATO', 'IN_VALUTAZIONE'].includes(domanda.stato)) {
            throw new Error('Impossibile eliminare una domanda già inviata');
        }

        return await prisma.oT23.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }

    /**
     * Genera anteprima XML per INAIL (simulato)
     */
    static async generateXmlPreview(id, tenantId) {
        const domanda = await this.findById(id, tenantId);
        if (!domanda) {
            throw new Error('Domanda OT23 non trovata');
        }

        const company = domanda.companyTenantProfile?.company;

        const interventi = this.getAllInterventi(domanda.interventiA, domanda.interventiB);
        const interventiXml = interventi.map(i => `
            <Intervento sezione="${escapeXml(i.sezione || '')}" codice="${escapeXml(i.codice)}" categoria="${escapeXml(i.categoria || '')}">
                <Descrizione>${escapeXml(i.descrizione)}</Descrizione>
                <Documentazione>${(i.documentazione || []).map(d => `<Documento>${escapeXml(d)}</Documento>`).join('')}</Documentazione>
            </Intervento>`).join('');

        // XML strutturato per precompilazione interna; l'invio resta tramite servizio telematico INAIL.
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DomandaOT23 xmlns="http://inail.it/ot23">
    <Intestazione>
        <Anno>${domanda.anno}</Anno>
        <PAT>${domanda.pat || ''}</PAT>
        <CodiceVoce>${domanda.codiceVoce || ''}</CodiceVoce>
    </Intestazione>
    <DatiAzienda>
        <RagioneSociale>${company?.ragioneSociale || ''}</RagioneSociale>
        <PIVA>${company?.piva || ''}</PIVA>
        <CodiceFiscale>${company?.codiceFiscale || ''}</CodiceFiscale>
    </DatiAzienda>
    <Interventi>
        ${interventiXml}
    </Interventi>
    <Riepilogo>
        <RegolaAmmissibilita>Almeno un intervento sezione A oppure almeno due interventi sezioni B-F</RegolaAmmissibilita>
        <InterventiSezioneA>${(domanda.interventiA || []).length}</InterventiSezioneA>
        <InterventiSezioniBF>${(domanda.interventiB || []).length}</InterventiSezioniBF>
        <RequisitiBeneficio>${domanda.haRequisitiBeneficio ? 'SI' : 'NO'}</RequisitiBeneficio>
        <PercentualeRiduzione>${domanda.percentualeRiduzione}%</PercentualeRiduzione>
        <RisparmioStimato>${domanda.risparmioStimato || 0} EUR</RisparmioStimato>
    </Riepilogo>
</DomandaOT23>`;

        return xml;
    }

    /**
     * Dashboard OT23 per un anno
     */
    static async getDashboard(anno, tenantId) {
        const domande = await prisma.oT23.findMany({
            where: { anno, tenantId, deletedAt: null },
            include: {
                companyTenantProfile: {
                    include: { company: true }
                }
            }
        });

        const totaleRisparmioStimato = domande.reduce(
            (sum, d) => sum + parseFloat(d.risparmioStimato || 0),
            0
        );

        const perStato = domande.reduce((acc, d) => {
            acc[d.stato] = (acc[d.stato] || 0) + 1;
            return acc;
        }, {});

        const conRequisiti = domande.filter(d => d.haRequisitiBeneficio).length;

        return {
            anno,
            totale: domande.length,
            conRequisitiBeneficio: conRequisiti,
            senzaRequisiti: domande.length - conRequisiti,
            perStato,
            totaleRisparmioStimato,
            domandeRecenti: domande.slice(0, 5)
        };
    }

    /**
     * Ottiene catalogo interventi disponibili
     */
    static getCatalogoInterventi() {
        const byCode = Object.fromEntries(SEZIONI_OT23_2026.map(section => [section.codice, section.interventi]));
        return {
            annoModello: 2026,
            regolaAmmissibilita: 'Almeno un intervento sezione A oppure almeno due interventi sezioni B-F.',
            sezioni: SEZIONI_OT23_2026,
            sezioneA: byCode.A || [],
            sezioneB: {
                rischioStradale: byCode.B || [],
                malattieProfessionali: byCode.C || [],
                formazioneInformazione: byCode.D || [],
                organizzative: byCode.E || [],
                emergenzeDpi: byCode.F || [],
                tecniche: [],
                formazione: byCode.D || [],
                sorveglianza: byCode.C || [],
                emergenze: byCode.F || [],
                altro: []
            },
            tabellaRiduzioni: TABELLA_RIDUZIONI,
            puntiMinimiBeneficio: null
        };
    }
}

function escapeXml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export default OT23Service;
