#!/usr/bin/env node

/**
 * Seed Questionari Obbligatori Medicina del Lavoro
 * 
 * D.Lgs 81/08 — Crea i questionari obbligatori per la sorveglianza sanitaria.
 * Idempotente: inserisce solo i questionari mancanti (per codice).
 * 
 * Questionari inclusi:
 *   1. Questionario Anamnestico Lavorativo
 *   2. Questionario Alcol e Sostanze Psicoattive (Art. 41)
 *   3. Questionario Rischio VDT / Videoterminali (Allegato XXXIV)
 *   4. Questionario MMC / Movimentazione Manuale Carichi (Titolo VI)
 *   5. Questionario Rischio Rumore (Titolo VIII)
 *   6. Questionario Stress Lavoro-Correlato (Art. 28)
 * 
 * Uso:
 *   node backend/scripts/seed-questionari-mdl.js
 * 
 * NOTA: Dopo il seed, eseguire update-questionari-defaults.mjs per aggiungere
 *       i defaultValue ai campi (necessari per il preset "Da template").
 * 
 * @session S59, S65 (defaultValues)
 */

import prisma from '../config/prisma-optimization.js';

// ============================================================================
// QUESTIONARIO DEFINITIONS
// ============================================================================

const QUESTIONARI = [
    // ========================================================================
    // 1. QUESTIONARIO ANAMNESTICO LAVORATIVO
    // ========================================================================
    {
        codice: 'MDL-ANAMNESI-01',
        nome: 'Questionario Anamnestico Lavorativo',
        descrizione: 'Raccolta anamnestica completa per la sorveglianza sanitaria dei lavoratori ai sensi del D.Lgs 81/08. Include anamnesi familiare, patologica remota, patologica prossima e lavorativa.',
        tipo: 'QUESTIONARIO_ANAMNESI_MDL',
        richiedeFirma: true,
        richiedeFirmaMedico: true,
        obbligatorio: true,
        ordine: 1,
        campi: [
            // Dati anagrafici supplementari
            { name: 'mansione_attuale', type: 'text', label: 'Mansione attuale', required: true, placeholder: 'es. Operaio addetto al montaggio' },
            { name: 'reparto', type: 'text', label: 'Reparto / Settore', required: false },
            { name: 'anzianita_lavorativa', type: 'number', label: 'Anzianità lavorativa (anni)', required: true, min: 0, max: 60 },
            { name: 'azienda_precedente', type: 'textarea', label: 'Aziende / mansioni precedenti con rischi specifici', required: false, placeholder: 'Descrivere brevemente le mansioni precedenti e i relativi rischi' },
            // Anamnesi familiare
            { name: 'anamnesi_familiare_header', type: 'text', label: '--- ANAMNESI FAMILIARE ---', helpText: 'Patologie rilevanti nei familiari di primo grado' },
            { name: 'fam_malattie_cardiovascolari', type: 'boolean', label: 'Malattie cardiovascolari in famiglia', required: false },
            { name: 'fam_diabete', type: 'boolean', label: 'Diabete mellito in famiglia', required: false },
            { name: 'fam_tumori', type: 'boolean', label: 'Patologie tumorali in famiglia', required: false },
            { name: 'fam_allergopatie', type: 'boolean', label: 'Allergopatie in famiglia', required: false },
            { name: 'fam_altro', type: 'textarea', label: 'Altre patologie familiari rilevanti', required: false },
            // Anamnesi patologica remota
            { name: 'anamnesi_pat_remota_header', type: 'text', label: '--- ANAMNESI PATOLOGICA REMOTA ---' },
            { name: 'malattie_infanzia', type: 'textarea', label: 'Malattie dell\'infanzia significative', required: false },
            { name: 'interventi_chirurgici', type: 'boolean', label: 'Ha subito interventi chirurgici?', required: true },
            { name: 'interventi_dettaglio', type: 'textarea', label: 'Descrivere gli interventi chirurgici', required: false, condition: { fieldName: 'interventi_chirurgici', operator: 'equals', value: 'true' } },
            { name: 'ricoveri', type: 'boolean', label: 'Ha avuto ricoveri ospedalieri?', required: true },
            { name: 'ricoveri_dettaglio', type: 'textarea', label: 'Descrivere i ricoveri', required: false, condition: { fieldName: 'ricoveri', operator: 'equals', value: 'true' } },
            { name: 'allergie', type: 'boolean', label: 'Presenta allergie note?', required: true },
            { name: 'allergie_dettaglio', type: 'text', label: 'Specificare allergie', required: false, condition: { fieldName: 'allergie', operator: 'equals', value: 'true' } },
            { name: 'farmaci_uso', type: 'boolean', label: 'Assume farmaci regolarmente?', required: true },
            { name: 'farmaci_dettaglio', type: 'textarea', label: 'Elenco farmaci assunti', required: false, condition: { fieldName: 'farmaci_uso', operator: 'equals', value: 'true' } },
            // Anamnesi patologica prossima
            { name: 'anamnesi_pat_prossima_header', type: 'text', label: '--- ANAMNESI PATOLOGICA PROSSIMA ---' },
            { name: 'patologie_attuali', type: 'boolean', label: 'Ha patologie in atto?', required: true },
            { name: 'patologie_dettaglio', type: 'textarea', label: 'Descrivere le patologie attuali', required: false, condition: { fieldName: 'patologie_attuali', operator: 'equals', value: 'true' } },
            { name: 'disturbi_vista', type: 'boolean', label: 'Disturbi della vista', required: true },
            { name: 'disturbi_udito', type: 'boolean', label: 'Disturbi dell\'udito', required: true },
            { name: 'disturbi_muscolo_scheletrici', type: 'boolean', label: 'Disturbi muscolo-scheletrici (dolori, rigidità articolare)', required: true },
            { name: 'disturbi_respiratori', type: 'boolean', label: 'Disturbi respiratori', required: true },
            { name: 'disturbi_cutanei', type: 'boolean', label: 'Disturbi cutanei (dermatiti, eczemi)', required: true },
            { name: 'disturbi_neurologici', type: 'boolean', label: 'Disturbi neurologici (cefalea, vertigini, formicolii)', required: true },
            // Stile di vita
            { name: 'stile_vita_header', type: 'text', label: '--- STILE DI VITA ---' },
            { name: 'fumo', type: 'select', label: 'Abitudine al fumo', required: true, options: [{ value: 'non_fumatore', label: 'Non fumatore' }, { value: 'ex_fumatore', label: 'Ex fumatore' }, { value: 'fumatore', label: 'Fumatore attivo' }] },
            { name: 'fumo_sigarette_die', type: 'number', label: 'Numero sigarette/die', required: false, min: 0, max: 100, condition: { fieldName: 'fumo', operator: 'equals', value: 'fumatore' } },
            { name: 'attivita_fisica', type: 'select', label: 'Attività fisica', required: false, options: [{ value: 'sedentario', label: 'Sedentario' }, { value: 'moderata', label: 'Attività moderata (2-3 volte/settimana)' }, { value: 'regolare', label: 'Attività regolare (4+ volte/settimana)' }] },
            // Note
            { name: 'note_aggiuntive', type: 'textarea', label: 'Note aggiuntive del lavoratore', required: false },
            { name: 'dichiarazione_veridica', type: 'boolean', label: 'Dichiaro che le informazioni fornite sono veritiere e complete', required: true }
        ],
        questionarioConfig: {
            codiciRischio: [],
            tipiVisitaMDL: ['PREVENTIVA', 'PREVENTIVA_PREASSUNTIVA', 'PERIODICA', 'STRAORDINARIA', 'CAMBIO_MANSIONE', 'CESSAZIONE_RAPPORTO'],
            compilabileDa: 'PAZIENTE',
            tempoStimato: 15,
            istruzioniPaziente: 'Compilare il questionario in tutte le sue parti. Le informazioni sono protette dal segreto professionale medico.',
            haScoring: false,
            richiedeRevisione: true
        }
    },

    // ========================================================================
    // 2. QUESTIONARIO ALCOL E SOSTANZE PSICOATTIVE
    // ========================================================================
    {
        codice: 'MDL-ALCOL-01',
        nome: 'Questionario Alcol e Sostanze Psicoattive',
        descrizione: 'Screening per uso di alcol e sostanze psicoattive ai sensi dell\'Art. 41, comma 4, D.Lgs 81/08 e dell\'Intesa Stato-Regioni del 16/03/2006. Basato sul questionario AUDIT-C.',
        tipo: 'ALCOL_SCREENING',
        richiedeFirma: true,
        richiedeFirmaMedico: true,
        obbligatorio: true,
        ordine: 2,
        campi: [
            { name: 'frequenza_bevande', type: 'select', label: 'Con quale frequenza consuma bevande alcoliche?', required: true, helpText: 'Birra, vino, aperitivi, superalcolici', options: [{ value: '0', label: 'Mai' }, { value: '1', label: 'Meno di una volta al mese' }, { value: '2', label: '2-4 volte al mese' }, { value: '3', label: '2-3 volte a settimana' }, { value: '4', label: '4 o più volte a settimana' }] },
            { name: 'unita_giorno', type: 'select', label: 'Nei giorni in cui beve, quante unità alcoliche assume?', required: true, helpText: '1 unità = 1 bicchiere di vino (125ml) o 1 birra (330ml) o 1 bicchierino di superalcolico (40ml)', options: [{ value: '0', label: '1 o 2' }, { value: '1', label: '3 o 4' }, { value: '2', label: '5 o 6' }, { value: '3', label: '7 o 9' }, { value: '4', label: '10 o più' }] },
            { name: 'binge_drinking', type: 'select', label: 'Con quale frequenza Le capita di bere 6 o più unità in una singola occasione?', required: true, options: [{ value: '0', label: 'Mai' }, { value: '1', label: 'Meno di una volta al mese' }, { value: '2', label: 'Una volta al mese' }, { value: '3', label: 'Una volta a settimana' }, { value: '4', label: 'Tutti i giorni o quasi' }] },
            { name: 'sostanze_psicoattive', type: 'boolean', label: 'Ha mai fatto uso di sostanze psicoattive (stupefacenti)?', required: true },
            { name: 'sostanze_dettaglio', type: 'textarea', label: 'Specificare tipo e frequenza', required: false, condition: { fieldName: 'sostanze_psicoattive', operator: 'equals', value: 'true' } },
            { name: 'terapie_farmacologiche', type: 'boolean', label: 'Assume terapie farmacologiche che possano alterare lo stato psicofisico?', required: true },
            { name: 'terapie_dettaglio', type: 'text', label: 'Specificare farmaci', required: false, condition: { fieldName: 'terapie_farmacologiche', operator: 'equals', value: 'true' } },
            { name: 'dichiarazione', type: 'boolean', label: 'Dichiaro che le informazioni fornite sono veritiere', required: true }
        ],
        questionarioConfig: {
            codiciRischio: ['ALC', 'GUI_MEZ', 'QUO'],
            tipiVisitaMDL: ['PREVENTIVA', 'PERIODICA', 'STRAORDINARIA'],
            compilabileDa: 'PAZIENTE',
            tempoStimato: 5,
            istruzioniPaziente: 'Rispondere con sincerità. Le risposte sono protette dal segreto professionale. Non verranno comunicate al datore di lavoro.',
            haScoring: true,
            scoringConfig: {
                maxScore: 12,
                passingScore: 4,
                weights: {
                    frequenza_bevande: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 }, '4': { score: 4 } } },
                    unita_giorno: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 }, '4': { score: 4 } } },
                    binge_drinking: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 }, '4': { score: 4, critical: true } } }
                }
            },
            sogliaCritica: 5,
            richiedeRevisione: true
        }
    },

    // ========================================================================
    // 3. QUESTIONARIO RISCHIO VDT (VIDEOTERMINALI)
    // ========================================================================
    {
        codice: 'MDL-VDT-01',
        nome: 'Questionario Rischio Videoterminali (VDT)',
        descrizione: 'Valutazione dei disturbi visivi e muscolo-scheletrici per lavoratori addetti ai videoterminali ai sensi dell\'Allegato XXXIV D.Lgs 81/08.',
        tipo: 'QUESTIONARIO_RISCHIO',
        richiedeFirma: true,
        richiedeFirmaMedico: false,
        obbligatorio: true,
        ordine: 3,
        campi: [
            // Esposizione
            { name: 'ore_vdt_die', type: 'number', label: 'Ore giornaliere al videoterminale', required: true, min: 0, max: 12 },
            { name: 'pause_regolari', type: 'boolean', label: 'Effettua pause regolari (15 min ogni 2 ore)?', required: true },
            { name: 'tipo_lavoro_vdt', type: 'select', label: 'Tipo di attività prevalente al VDT', required: true, options: [{ value: 'data_entry', label: 'Data entry / Inserimento dati' }, { value: 'programmazione', label: 'Programmazione / Sviluppo software' }, { value: 'grafica', label: 'Grafica / CAD' }, { value: 'ufficio_generico', label: 'Lavoro d\'ufficio generico' }, { value: 'altro', label: 'Altro' }] },
            // Disturbi visivi
            { name: 'disturbi_visivi_header', type: 'text', label: '--- DISTURBI VISIVI ---' },
            { name: 'bruciore_occhi', type: 'select', label: 'Bruciore o fastidio agli occhi', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'lacrimazione', type: 'select', label: 'Lacrimazione eccessiva', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'secchezza_oculare', type: 'select', label: 'Secchezza oculare', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'visione_offuscata', type: 'select', label: 'Visione offuscata o sdoppiata', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'cefalea_visiva', type: 'select', label: 'Cefalea correlata all\'uso del VDT', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'occhiali_lenti', type: 'boolean', label: 'Utilizza occhiali o lenti a contatto?', required: true },
            { name: 'occhiali_tipo', type: 'select', label: 'Tipo di correzione visiva', required: false, condition: { fieldName: 'occhiali_lenti', operator: 'equals', value: 'true' }, options: [{ value: 'occhiali_vista', label: 'Occhiali da vista' }, { value: 'lenti_contatto', label: 'Lenti a contatto' }, { value: 'entrambi', label: 'Entrambi' }, { value: 'occhiali_riposo', label: 'Occhiali da riposo per VDT' }] },
            // Disturbi muscolo-scheletrici
            { name: 'disturbi_msk_header', type: 'text', label: '--- DISTURBI MUSCOLO-SCHELETRICI ---' },
            { name: 'dolore_collo', type: 'select', label: 'Dolore / rigidità al collo', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'dolore_spalle', type: 'select', label: 'Dolore alle spalle', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'dolore_schiena', type: 'select', label: 'Mal di schiena (zona lombare)', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'dolore_polsi_mani', type: 'select', label: 'Dolore / formicolio a polsi e mani', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            // Postazione di lavoro
            { name: 'postazione_header', type: 'text', label: '--- POSTAZIONE DI LAVORO ---' },
            { name: 'sedia_regolabile', type: 'boolean', label: 'La sedia è regolabile in altezza e schienale?', required: true },
            { name: 'monitor_altezza', type: 'boolean', label: 'Il monitor è posizionato all\'altezza degli occhi?', required: true },
            { name: 'illuminazione_adeguata', type: 'boolean', label: 'L\'illuminazione è adeguata (assenza riflessi sullo schermo)?', required: true },
            { name: 'note_vdt', type: 'textarea', label: 'Note aggiuntive', required: false },
            { name: 'dichiarazione', type: 'boolean', label: 'Dichiaro che le informazioni fornite sono veritiere', required: true }
        ],
        questionarioConfig: {
            codiciRischio: ['VDT'],
            tipiVisitaMDL: ['PREVENTIVA', 'PERIODICA'],
            compilabileDa: 'PAZIENTE',
            tempoStimato: 8,
            istruzioniPaziente: 'Compilare il questionario facendo riferimento agli ultimi 12 mesi di lavoro.',
            haScoring: true,
            scoringConfig: {
                maxScore: 24,
                passingScore: 8,
                weights: {
                    bruciore_occhi: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    lacrimazione: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    secchezza_oculare: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    visione_offuscata: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    cefalea_visiva: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3 } } },
                    dolore_collo: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    dolore_spalle: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3 } } },
                    dolore_polsi_mani: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } }
                }
            },
            sogliaCritica: 12,
            richiedeRevisione: false
        }
    },

    // ========================================================================
    // 4. QUESTIONARIO MMC (MOVIMENTAZIONE MANUALE CARICHI)
    // ========================================================================
    {
        codice: 'MDL-MMC-01',
        nome: 'Questionario Movimentazione Manuale dei Carichi',
        descrizione: 'Valutazione dei disturbi muscolo-scheletrici per lavoratori esposti a movimentazione manuale dei carichi ai sensi del Titolo VI D.Lgs 81/08.',
        tipo: 'QUESTIONARIO_RISCHIO',
        richiedeFirma: true,
        richiedeFirmaMedico: false,
        obbligatorio: true,
        ordine: 4,
        campi: [
            // Esposizione
            { name: 'ore_mmc_die', type: 'number', label: 'Ore giornaliere dedicate alla movimentazione manuale', required: true, min: 0, max: 12 },
            { name: 'peso_max_sollevato', type: 'select', label: 'Peso massimo abitualmente sollevato', required: true, options: [{ value: 'fino_5', label: 'Fino a 5 kg' }, { value: '5_15', label: '5-15 kg' }, { value: '15_25', label: '15-25 kg' }, { value: 'oltre_25', label: 'Oltre 25 kg' }] },
            { name: 'frequenza_sollevamento', type: 'select', label: 'Frequenza di sollevamento', required: true, options: [{ value: 'occasionale', label: 'Occasionale (poche volte al giorno)' }, { value: 'frequente', label: 'Frequente (più volte all\'ora)' }, { value: 'continuo', label: 'Continuo (ripetitivo)' }] },
            { name: 'posture_incongrue', type: 'boolean', label: 'Il lavoro richiede posture incongrue (torsione, flessione)?', required: true },
            // Disturbi
            { name: 'disturbi_header', type: 'text', label: '--- DISTURBI RIFERITI (ultimi 12 mesi) ---' },
            { name: 'dolore_lombare', type: 'select', label: 'Dolore alla zona lombare (lombalgia)', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre / Cronico' }] },
            { name: 'dolore_dorso', type: 'select', label: 'Dolore alla zona dorsale', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'dolore_cervicale', type: 'select', label: 'Dolore cervicale', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'dolore_spalla', type: 'select', label: 'Dolore alla spalla (dx/sx/entrambe)', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'dolore_gomito', type: 'select', label: 'Dolore al gomito (epicondilite)', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'dolore_polso_mano', type: 'select', label: 'Dolore al polso / mano (tunnel carpale)', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'dolore_ginocchio', type: 'select', label: 'Dolore al ginocchio', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'assenze_msk', type: 'boolean', label: 'Ha avuto assenze per malattia legate a disturbi muscolo-scheletrici?', required: true },
            { name: 'assenze_giorni', type: 'number', label: 'Giorni di assenza negli ultimi 12 mesi', required: false, min: 0, max: 365, condition: { fieldName: 'assenze_msk', operator: 'equals', value: 'true' } },
            { name: 'note_mmc', type: 'textarea', label: 'Note aggiuntive', required: false },
            { name: 'dichiarazione', type: 'boolean', label: 'Dichiaro che le informazioni fornite sono veritiere', required: true }
        ],
        questionarioConfig: {
            codiciRischio: ['MMC', 'MOV_RIP', 'POS'],
            tipiVisitaMDL: ['PREVENTIVA', 'PERIODICA'],
            compilabileDa: 'PAZIENTE',
            tempoStimato: 8,
            istruzioniPaziente: 'Compilare il questionario facendo riferimento agli ultimi 12 mesi di lavoro al momento della visita.',
            haScoring: true,
            scoringConfig: {
                maxScore: 21,
                passingScore: 7,
                weights: {
                    dolore_lombare: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    dolore_dorso: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3 } } },
                    dolore_cervicale: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3 } } },
                    dolore_spalla: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    dolore_gomito: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    dolore_polso_mano: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    dolore_ginocchio: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } }
                }
            },
            sogliaCritica: 10,
            richiedeRevisione: false
        }
    },

    // ========================================================================
    // 5. QUESTIONARIO RISCHIO RUMORE
    // ========================================================================
    {
        codice: 'MDL-RUMORE-01',
        nome: 'Questionario Rischio Rumore',
        descrizione: 'Valutazione dei disturbi uditivi e degli effetti extra-uditivi per lavoratori esposti a rumore ai sensi del Titolo VIII, Capo II, D.Lgs 81/08.',
        tipo: 'QUESTIONARIO_RISCHIO',
        richiedeFirma: true,
        richiedeFirmaMedico: false,
        obbligatorio: true,
        ordine: 5,
        campi: [
            // Esposizione lavorativa
            { name: 'esposizione_rumore_anni', type: 'number', label: 'Anni di esposizione a rumore lavorativo', required: true, min: 0, max: 50 },
            { name: 'livello_rumore', type: 'select', label: 'Livello di esposizione quotidiana stimato', required: true, options: [{ value: 'sotto_80', label: 'Sotto 80 dB(A)' }, { value: '80_85', label: '80-85 dB(A) - Azione inferiore' }, { value: '85_87', label: '85-87 dB(A) - Azione superiore' }, { value: 'oltre_87', label: 'Oltre 87 dB(A) - Limite di esposizione' }] },
            { name: 'uso_dpi_uditivi', type: 'select', label: 'Utilizzo DPI uditivi (cuffie/tappi)', required: true, options: [{ value: 'sempre', label: 'Sempre' }, { value: 'spesso', label: 'Spesso' }, { value: 'raramente', label: 'Raramente' }, { value: 'mai', label: 'Mai' }] },
            // Disturbi uditivi
            { name: 'disturbi_uditivi_header', type: 'text', label: '--- DISTURBI UDITIVI ---' },
            { name: 'difficolta_ascolto', type: 'select', label: 'Difficoltà nell\'ascolto della conversazione', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'acufeni', type: 'select', label: 'Acufeni (fischi, ronzii alle orecchie)', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre / Costante' }] },
            { name: 'ipoacusia_percepita', type: 'boolean', label: 'Sente di aver perso capacità uditiva negli ultimi anni?', required: true },
            { name: 'volume_tv_alto', type: 'boolean', label: 'Le dicono che tiene il volume TV/radio troppo alto?', required: true },
            // Effetti extra-uditivi
            { name: 'effetti_extra_header', type: 'text', label: '--- EFFETTI EXTRA-UDITIVI ---' },
            { name: 'cefalea_rumore', type: 'select', label: 'Cefalea a fine turno', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'irritabilita', type: 'select', label: 'Irritabilità / difficoltà di concentrazione', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'disturbi_sonno', type: 'boolean', label: 'Disturbi del sonno', required: true },
            // Esposizione extra-lavorativa
            { name: 'extra_lav_header', type: 'text', label: '--- ESPOSIZIONE EXTRA-LAVORATIVA ---' },
            { name: 'hobby_rumorosi', type: 'boolean', label: 'Pratica hobby rumorosi (caccia, musica, motori)?', required: true },
            { name: 'hobby_dettaglio', type: 'text', label: 'Specificare', required: false, condition: { fieldName: 'hobby_rumorosi', operator: 'equals', value: 'true' } },
            { name: 'note_rumore', type: 'textarea', label: 'Note aggiuntive', required: false },
            { name: 'dichiarazione', type: 'boolean', label: 'Dichiaro che le informazioni fornite sono veritiere', required: true }
        ],
        questionarioConfig: {
            codiciRischio: ['RUM'],
            tipiVisitaMDL: ['PREVENTIVA', 'PERIODICA'],
            compilabileDa: 'PAZIENTE',
            tempoStimato: 7,
            istruzioniPaziente: 'Compilare il questionario tenendo presente la propria esperienza lavorativa complessiva.',
            haScoring: true,
            scoringConfig: {
                maxScore: 15,
                passingScore: 5,
                weights: {
                    difficolta_ascolto: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    acufeni: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3, critical: true } } },
                    ipoacusia_percepita: { trueScore: 3, falseScore: 0, trueCritical: true },
                    cefalea_rumore: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3 } } },
                    irritabilita: { options: { 'mai': { score: 0 }, 'raramente': { score: 1 }, 'spesso': { score: 2 }, 'sempre': { score: 3 } } }
                }
            },
            sogliaCritica: 8,
            richiedeRevisione: false
        }
    },

    // ========================================================================
    // 6. QUESTIONARIO STRESS LAVORO-CORRELATO
    // ========================================================================
    {
        codice: 'MDL-STRESS-01',
        nome: 'Questionario Stress Lavoro-Correlato',
        descrizione: 'Valutazione dello stress lavoro-correlato ai sensi dell\'Art. 28, comma 1, D.Lgs 81/08. Basato sulla metodologia INAIL per la rilevazione dei fattori di rischio psicosociale.',
        tipo: 'QUESTIONARIO_RISCHIO',
        richiedeFirma: true,
        richiedeFirmaMedico: false,
        obbligatorio: true,
        ordine: 6,
        campi: [
            // Carico di lavoro
            { name: 'carico_lavoro_header', type: 'text', label: '--- CARICO DI LAVORO ---' },
            { name: 'carico_eccessivo', type: 'select', label: 'Il carico di lavoro è eccessivo?', required: true, options: [{ value: '0', label: 'Mai / Quasi mai' }, { value: '1', label: 'A volte' }, { value: '2', label: 'Spesso' }, { value: '3', label: 'Sempre' }] },
            { name: 'ritmi_elevati', type: 'select', label: 'I ritmi di lavoro sono troppo elevati?', required: true, options: [{ value: '0', label: 'Mai / Quasi mai' }, { value: '1', label: 'A volte' }, { value: '2', label: 'Spesso' }, { value: '3', label: 'Sempre' }] },
            { name: 'scadenze_irrealistiche', type: 'select', label: 'Le scadenze sono irrealistiche?', required: true, options: [{ value: '0', label: 'Mai / Quasi mai' }, { value: '1', label: 'A volte' }, { value: '2', label: 'Spesso' }, { value: '3', label: 'Sempre' }] },
            // Controllo e autonomia
            { name: 'controllo_header', type: 'text', label: '--- CONTROLLO E AUTONOMIA ---' },
            { name: 'autonomia_decisionale', type: 'select', label: 'Ha sufficiente autonomia decisionale nel lavoro?', required: true, options: [{ value: '0', label: 'Sempre' }, { value: '1', label: 'Spesso' }, { value: '2', label: 'A volte' }, { value: '3', label: 'Mai / Quasi mai' }] },
            { name: 'competenze_adeguate', type: 'select', label: 'Le sue competenze sono adeguate al lavoro?', required: true, options: [{ value: '0', label: 'Sempre' }, { value: '1', label: 'Spesso' }, { value: '2', label: 'A volte' }, { value: '3', label: 'Mai / Quasi mai' }] },
            // Relazioni e supporto
            { name: 'relazioni_header', type: 'text', label: '--- RELAZIONI E SUPPORTO ---' },
            { name: 'rapporto_colleghi', type: 'select', label: 'Il rapporto con i colleghi è positivo?', required: true, options: [{ value: '0', label: 'Sempre' }, { value: '1', label: 'Spesso' }, { value: '2', label: 'A volte' }, { value: '3', label: 'Mai / Quasi mai' }] },
            { name: 'rapporto_superiori', type: 'select', label: 'Il rapporto con i superiori è positivo?', required: true, options: [{ value: '0', label: 'Sempre' }, { value: '1', label: 'Spesso' }, { value: '2', label: 'A volte' }, { value: '3', label: 'Mai / Quasi mai' }] },
            { name: 'supporto_errori', type: 'select', label: 'Riceve supporto quando commette un errore?', required: true, options: [{ value: '0', label: 'Sempre' }, { value: '1', label: 'Spesso' }, { value: '2', label: 'A volte' }, { value: '3', label: 'Mai / Quasi mai' }] },
            { name: 'molestie_discriminazioni', type: 'boolean', label: 'Ha subito molestie, mobbing o discriminazioni?', required: true },
            { name: 'molestie_dettaglio', type: 'textarea', label: 'Descrivere brevemente', required: false, condition: { fieldName: 'molestie_discriminazioni', operator: 'equals', value: 'true' } },
            // Ruolo
            { name: 'ruolo_header', type: 'text', label: '--- RUOLO E COMUNICAZIONE ---' },
            { name: 'ruolo_chiaro', type: 'select', label: 'Il suo ruolo è chiaro e ben definito?', required: true, options: [{ value: '0', label: 'Sempre' }, { value: '1', label: 'Spesso' }, { value: '2', label: 'A volte' }, { value: '3', label: 'Mai / Quasi mai' }] },
            { name: 'comunicazione_interna', type: 'select', label: 'La comunicazione interna è adeguata?', required: true, options: [{ value: '0', label: 'Sempre' }, { value: '1', label: 'Spesso' }, { value: '2', label: 'A volte' }, { value: '3', label: 'Mai / Quasi mai' }] },
            // Effetti sulla salute
            { name: 'effetti_header', type: 'text', label: '--- EFFETTI SULLA SALUTE ---' },
            { name: 'ansia_lavoro', type: 'select', label: 'Prova ansia legata al lavoro?', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'insonnia_lavoro', type: 'select', label: 'Ha disturbi del sonno legati al lavoro?', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'stanchezza_cronica', type: 'select', label: 'Avverte stanchezza cronica?', required: true, options: [{ value: 'mai', label: 'Mai' }, { value: 'raramente', label: 'Raramente' }, { value: 'spesso', label: 'Spesso' }, { value: 'sempre', label: 'Sempre' }] },
            { name: 'soddisfazione_lavoro', type: 'select', label: 'Complessivamente, è soddisfatto del suo lavoro?', required: true, options: [{ value: '0', label: 'Molto soddisfatto' }, { value: '1', label: 'Abbastanza soddisfatto' }, { value: '2', label: 'Poco soddisfatto' }, { value: '3', label: 'Per niente soddisfatto' }] },
            { name: 'note_stress', type: 'textarea', label: 'Osservazioni aggiuntive', required: false },
            { name: 'dichiarazione', type: 'boolean', label: 'Dichiaro che le informazioni fornite sono veritiere', required: true }
        ],
        questionarioConfig: {
            codiciRischio: ['SLC'],
            tipiVisitaMDL: ['PREVENTIVA', 'PERIODICA', 'STRAORDINARIA'],
            compilabileDa: 'PAZIENTE',
            tempoStimato: 10,
            istruzioniPaziente: 'Le risposte sono anonime a fini statistici e protette dal segreto professionale nel contesto della sorveglianza sanitaria individuale.',
            haScoring: true,
            scoringConfig: {
                maxScore: 33,
                passingScore: 11,
                weights: {
                    carico_eccessivo: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } },
                    ritmi_elevati: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } },
                    scadenze_irrealistiche: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } },
                    autonomia_decisionale: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } },
                    competenze_adeguate: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } },
                    rapporto_colleghi: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } },
                    rapporto_superiori: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } },
                    supporto_errori: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } },
                    ruolo_chiaro: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } },
                    comunicazione_interna: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } },
                    soddisfazione_lavoro: { options: { '0': { score: 0 }, '1': { score: 1 }, '2': { score: 2 }, '3': { score: 3 } } }
                }
            },
            sogliaCritica: 20,
            richiedeRevisione: true
        }
    }
];

// ============================================================================
// SEED LOGIC
// ============================================================================

async function main() {
    console.log('📋 Seed Questionari Obbligatori Medicina del Lavoro\n');
    console.log('   D.Lgs 81/08 — Sorveglianza Sanitaria\n');

    try {
        // Get all active tenants
        const tenants = await prisma.tenant.findMany({
            where: { isActive: true },
            select: { id: true, name: true }
        });

        if (tenants.length === 0) {
            console.log('⚠️  Nessun tenant attivo trovato');
            return;
        }

        let totalCreated = 0;
        let totalSkipped = 0;

        for (const tenant of tenants) {
            console.log(`\n🏢 Tenant: ${tenant.name} (${tenant.id})`);

            for (const q of QUESTIONARI) {
                // Check if already exists by codice
                const existing = await prisma.documentoTemplate.findFirst({
                    where: {
                        tenantId: tenant.id,
                        codice: q.codice,
                        deletedAt: null
                    }
                });

                if (existing) {
                    console.log(`   ⏭️  ${q.codice} — già presente (skip)`);
                    totalSkipped++;
                    continue;
                }

                // Create the template
                const template = await prisma.documentoTemplate.create({
                    data: {
                        tenantId: tenant.id,
                        codice: q.codice,
                        nome: q.nome,
                        descrizione: q.descrizione,
                        tipo: q.tipo,
                        fase: 'DURANTE_VISITA',
                        versione: 1,
                        campi: q.campi,
                        branchTypes: ['MEDICA'],
                        richiedeFirma: q.richiedeFirma,
                        richiedeFirmaMedico: q.richiedeFirmaMedico || false,
                        obbligatorio: q.obbligatorio,
                        ordine: q.ordine,
                        isActive: true
                    }
                });

                // Create QuestionarioMedicoConfig
                await prisma.questionarioMedicoConfig.create({
                    data: {
                        documentoTemplateId: template.id,
                        tenantId: tenant.id,
                        codiciRischio: q.questionarioConfig.codiciRischio,
                        tipiVisitaMDL: q.questionarioConfig.tipiVisitaMDL,
                        compilabileDa: q.questionarioConfig.compilabileDa,
                        tempoStimato: q.questionarioConfig.tempoStimato,
                        istruzioniPaziente: q.questionarioConfig.istruzioniPaziente || null,
                        istruzioniMedico: q.questionarioConfig.istruzioniMedico || null,
                        haScoring: q.questionarioConfig.haScoring,
                        scoringConfig: q.questionarioConfig.scoringConfig || null,
                        sogliaCritica: q.questionarioConfig.sogliaCritica || null,
                        richiedeRevisione: q.questionarioConfig.richiedeRevisione,
                        promemoria: false,
                        isPagamento: false,
                        fatturabile: false
                    }
                });

                console.log(`   ✅ ${q.codice} — "${q.nome}" creato (${q.campi.length} campi)`);
                totalCreated++;
            }
        }

        console.log(`\n✅ Completato!`);
        console.log(`   Tenant processati: ${tenants.length}`);
        console.log(`   Questionari creati: ${totalCreated}`);
        console.log(`   Questionari già esistenti (skip): ${totalSkipped}`);

    } catch (error) {
        console.error('❌ Errore:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
