/**
 * @fileoverview Service per la gestione dei Template Visita
 * Gestisce template personalizzabili per medico/prestazione/bundle
 * 
 * @module services/clinical/VisitTemplateService
 * @requires @prisma/client
 * @requires ../../utils/logger
 * 
 * @description
 * Questo service implementa:
 * - CRUD template visita per medico
 * - Template default per medico
 * - Template specifici per prestazione/bundle
 * - Clonazione template
 * - Gestione campi dinamici con layout
 * - Configurazione sidebar e stampa
 * 
 * @gdpr
 * - Soft delete obbligatorio (deletedAt)
 * - Audit trail per modifiche template
 * - Multi-tenancy con filtro tenantId
 * 
 * @author ElementMedica Team
 * @version 1.0.0
 * @since 2026-01-10
 * @project P52 - Clinical Visit Template System
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// ============================================
// TIPI DI CAMPO SUPPORTATI
// ============================================
const FIELD_TYPES = {
    TEXT: 'TEXT',           // Testo breve
    TEXTAREA: 'TEXTAREA',   // Testo multilinea
    RICHTEXT: 'RICHTEXT',   // Editor ricco
    NUMBER: 'NUMBER',       // Numerico
    DROPDOWN: 'DROPDOWN',   // Menu a tendina
    MULTI_CHOICE: 'MULTI_CHOICE', // Scelta multipla
    DATE: 'DATE',           // Data
    DATETIME: 'DATETIME',   // Data e ora
    BOOLEAN: 'BOOLEAN',     // Sì/No
    FILE: 'FILE',           // Allegato
    VITALS: 'VITALS',       // Gruppo parametri vitali
    STRUMENTARIO_IMPORT: 'STRUMENTARIO_IMPORT' // Auto-import da esame strumentale bridge (ECG, audiometria, spirometria)
};

// ============================================
// CAMPI PREDEFINITI - DEFAULT TEMPLATE
// ============================================
const DEFAULT_VISIT_FIELDS = [
    // === SEZIONE: ANAMNESI ===
    {
        id: 'anamnesi_familiare',
        name: 'anamnesiFamiliare',
        label: 'Anamnesi Familiare',
        type: 'RICHTEXT',
        section: 'anamnesi',
        position: { row: 0, col: 0 },
        size: { width: 10, height: 4 },
        carryOverFromPrevious: true,
        showChart: false,
        required: false,
        defaultValue: '',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Anamnesi'
        }
    },
    {
        id: 'anamnesi_patologica_remota',
        name: 'anamnesiPatologicaRemota',
        label: 'Anamnesi Patologica Remota',
        type: 'RICHTEXT',
        section: 'anamnesi',
        position: { row: 1, col: 0 },
        size: { width: 10, height: 4 },
        carryOverFromPrevious: true,
        showChart: false,
        required: false,
        defaultValue: '',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Anamnesi'
        }
    },
    {
        id: 'anamnesi_patologica_prossima',
        name: 'anamnesiPatologicaProssima',
        label: 'Anamnesi Patologica Prossima',
        type: 'RICHTEXT',
        section: 'anamnesi',
        position: { row: 2, col: 0 },
        size: { width: 10, height: 4 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        mappedField: 'anamnesi',
        defaultValue: '',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Anamnesi'
        }
    },
    {
        id: 'anamnesi_lavorativa',
        name: 'anamnesiLavorativa',
        label: 'Anamnesi Lavorativa',
        type: 'RICHTEXT',
        section: 'anamnesi',
        position: { row: 3, col: 0 },
        size: { width: 10, height: 3 },
        carryOverFromPrevious: true,
        showChart: false,
        required: false,
        defaultValue: '',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Anamnesi'
        }
    },

    // === SEZIONE: PARAMETRI VITALI ===
    // NOTA P72: allergieText e farmaciInUso NON sono campi di template.
    // Sono gestiti dalla card AllergieMedications nel ProfiloDiSalutePersona del paziente.
    {
        id: 'peso',
        name: 'peso',
        label: 'Peso (kg)',
        type: 'NUMBER',
        section: 'vitali',
        position: { row: 0, col: 0 },
        size: { width: 3, height: 1 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        validation: { min: 0, max: 500 },
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Parametri Vitali'
        }
    },
    {
        id: 'altezza',
        name: 'altezza',
        label: 'Altezza (cm)',
        type: 'NUMBER',
        section: 'vitali',
        position: { row: 0, col: 3 },
        size: { width: 3, height: 1 },
        carryOverFromPrevious: true,
        showChart: true,
        required: false,
        validation: { min: 0, max: 300 },
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Parametri Vitali'
        }
    },
    {
        id: 'bmi',
        name: 'bmi',
        label: 'BMI',
        type: 'NUMBER',
        section: 'vitali',
        position: { row: 0, col: 6 },
        size: { width: 3, height: 1 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        computed: true,
        computeFormula: 'peso / ((altezza/100) * (altezza/100))',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Parametri Vitali'
        }
    },
    {
        id: 'pressione_sistolica',
        name: 'pressioneSistolica',
        label: 'Pressione Sistolica',
        type: 'NUMBER',
        section: 'vitali',
        position: { row: 1, col: 0 },
        size: { width: 3, height: 1 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        validation: { min: 40, max: 300 },
        normalRange: { min: 90, max: 140 },
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Parametri Vitali'
        }
    },
    {
        id: 'pressione_diastolica',
        name: 'pressioneDiastolica',
        label: 'Pressione Diastolica',
        type: 'NUMBER',
        section: 'vitali',
        position: { row: 1, col: 3 },
        size: { width: 3, height: 1 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        validation: { min: 20, max: 200 },
        normalRange: { min: 60, max: 85 },
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Parametri Vitali'
        }
    },
    {
        id: 'frequenza_cardiaca',
        name: 'frequenzaCardiaca',
        label: 'FC (bpm)',
        type: 'NUMBER',
        section: 'vitali',
        position: { row: 1, col: 6 },
        size: { width: 3, height: 1 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        validation: { min: 20, max: 300 },
        normalRange: { min: 60, max: 100 },
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Parametri Vitali'
        }
    },
    {
        id: 'saturazione_o2',
        name: 'saturazioneO2',
        label: 'SpO2 (%)',
        type: 'NUMBER',
        section: 'vitali',
        position: { row: 1, col: 9 },
        size: { width: 3, height: 1 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        validation: { min: 0, max: 100 },
        normalRange: { min: 95, max: 100 },
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Parametri Vitali'
        }
    },
    {
        id: 'temperatura',
        name: 'temperatura',
        label: 'Temperatura (°C)',
        type: 'NUMBER',
        section: 'vitali',
        position: { row: 2, col: 0 },
        size: { width: 3, height: 1 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        validation: { min: 30, max: 45 },
        normalRange: { min: 36, max: 37.5 },
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Parametri Vitali'
        }
    },

    // === SEZIONE: ESAME OBIETTIVO ===
    {
        id: 'esame_obiettivo',
        name: 'esameObiettivo',
        label: 'Esame Obiettivo',
        type: 'RICHTEXT',
        section: 'esame',
        position: { row: 0, col: 0 },
        size: { width: 10, height: 6 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        mappedField: 'esamiObiettivo',
        defaultValue: '',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Esame Obiettivo'
        }
    },

    // === SEZIONE: DIAGNOSI ===
    {
        id: 'diagnosi_principale',
        name: 'diagnosiPrincipale',
        label: 'Diagnosi Principale',
        type: 'TEXT',
        section: 'diagnosi',
        position: { row: 0, col: 0 },
        size: { width: 10, height: 1 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        mappedField: 'diagnosiPrincipale',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Diagnosi'
        }
    },
    {
        id: 'diagnosi_secondarie',
        name: 'diagnosiSecondarie',
        label: 'Diagnosi Secondarie',
        type: 'TEXTAREA',
        section: 'diagnosi',
        position: { row: 1, col: 0 },
        size: { width: 10, height: 3 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Diagnosi'
        }
    },

    // === SEZIONE: TERAPIA ===
    {
        id: 'terapia',
        name: 'terapia',
        label: 'Terapia',
        type: 'RICHTEXT',
        section: 'terapia',
        position: { row: 0, col: 0 },
        size: { width: 10, height: 4 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        mappedField: 'terapia',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Terapia'
        }
    },
    {
        id: 'prescrizioni',
        name: 'prescrizioni',
        label: 'Prescrizioni Farmacologiche',
        helpText: 'Prescrizioni farmacologiche / ricette mediche emesse al paziente. NON usare per limitazioni o prescrizioni MDL (D.Lgs 81/08 art.41): usare i campi dedicati nella sezione Follow-Up Medicina del Lavoro.',
        type: 'RICHTEXT',
        section: 'terapia',
        position: { row: 1, col: 0 },
        size: { width: 10, height: 3 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        mappedField: 'prescrizioni',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Terapia'
        }
    },

    // === SEZIONE: FOLLOW-UP ===
    {
        id: 'prossimo_controllo',
        name: 'prossimoControllo',
        label: 'Prossimo Controllo',
        type: 'DATE',
        section: 'followup',
        position: { row: 0, col: 0 },
        size: { width: 4, height: 1 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Conclusione e Follow-Up'
        }
    },
    {
        id: 'note_followup',
        name: 'noteFollowup',
        label: 'Note Follow-up',
        type: 'TEXTAREA',
        section: 'followup',
        position: { row: 0, col: 4 },
        size: { width: 8, height: 2 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Conclusione e Follow-Up'
        }
    },
    // === Esami programmati per la prossima visita MDL ===
    // Struttura dedicata agli accertamenti periodici obbligatori da pianificare.
    // Es: spirometria, audiometria, visita oculistica, emocromo, ecc.
    {
        id: 'esami_prossima_visita',
        name: 'esamiProssimaVisita',
        label: 'Esami da eseguire alla prossima visita',
        type: 'TEXTAREA',
        section: 'followup',
        position: { row: 2, col: 0 },
        size: { width: 12, height: 2 },
        carryOverFromPrevious: true,   // gli esami programmati si portano avanti se non eseguiti
        showChart: false,
        required: false,
        enabled: false,      // disabilitato nei template generali; abilitare per MDL
        placeholder: 'Es. Spirometria, Audiometria tonale, Visita oculistica, Emocromo + formula, Esame urine...',
        hint: 'Accertamenti biologici e strumentali da pianificare per la sorveglianza sanitaria periodica (D.Lgs 81/08 Allegato I).',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Conclusione e Follow-Up'
        }
    },

    // === P65 MDL: Giudizio di Idoneità (D.Lgs 81/08 art. 41 c.6) ===
    {
        id: 'giudizio_idoneita_mdl',
        name: 'giudizioIdoneitaMdl',
        label: 'Giudizio di Idoneità alla Mansione',
        type: 'DROPDOWN',
        section: 'followup',
        position: { row: 3, col: 0 },
        size: { width: 6, height: 1 },
        carryOverFromPrevious: false,
        showChart: false,
        required: true,
        enabled: false,      // abilitare nei template MDL
        options: [
            { value: 'idoneo', label: 'Idoneo' },
            { value: 'idoneo_prescrizioni', label: 'Idoneo parziale con prescrizioni' },
            { value: 'idoneo_limitazioni', label: 'Idoneo parziale con limitazioni' },
            { value: 'idoneo_limitazioni_prescrizioni', label: 'Idoneo parziale con limitazioni e prescrizioni' },
            { value: 'temporaneamente_non_idoneo', label: 'Temporaneamente non idoneo' },
            { value: 'non_idoneo', label: 'Non idoneo alla mansione specifica' }
        ],
        hint: 'Giudizio formulato ai sensi del D.Lgs 81/08 art. 41 comma 6. Comunicare al datore di lavoro e al lavoratore.',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Conclusione e Follow-Up'
        }
    },
    {
        id: 'tempistica_giudizio_idoneita_mdl',
        name: 'tempisticaGiudizioIdoneitaMdl',
        label: 'Tempistica giudizio parziale / non idoneità temporanea',
        type: 'DROPDOWN',
        section: 'followup',
        position: { row: 3, col: 6 },
        size: { width: 6, height: 1 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        enabled: false,
        options: [
            { value: '30_giorni', label: '30 giorni' },
            { value: '60_giorni', label: '60 giorni' },
            { value: '90_giorni', label: '90 giorni' },
            { value: '6_mesi', label: '6 mesi' },
            { value: '12_mesi', label: '12 mesi' },
            { value: 'permanente', label: 'Permanente' }
        ],
        metadata: {
            showWhen: {
                field: 'giudizioIdoneitaMdl',
                in: ['idoneo_prescrizioni', 'idoneo_limitazioni', 'idoneo_limitazioni_prescrizioni', 'temporaneamente_non_idoneo']
            },
            excludeOptionsWhen: [
                { field: 'giudizioIdoneitaMdl', equals: 'temporaneamente_non_idoneo', values: ['permanente'] }
            ]
        },
        hint: 'Obbligatoria per giudizi parziali o temporaneamente non idonei. Per prescrizioni/limitazioni è disponibile anche “Permanente”.',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Conclusione e Follow-Up'
        }
    },
    // === P65/P66 MDL: Prescrizioni dalla Normativa (MULTI_CHOICE — D.Lgs 81/08 art. 41) ===
    {
        id: 'prescrizioni_normativa_mdl',
        name: 'prescrizioniNormativaMdl',
        label: 'Prescrizioni ai sensi della Normativa',
        type: 'MULTI_CHOICE',
        section: 'followup',
        position: { row: 4, col: 0 },
        size: { width: 12, height: 4 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        enabled: false,
        hint: 'Prescrizioni obbligatorie da comunicare al datore di lavoro (D.Lgs 81/08 art. 41 c.5-6). Seleziona tutte le prescrizioni applicabili.',
        options: [
            { value: 'uso_dpi_specifici', label: 'Uso obbligatorio dei DPI specifici previsti dal DVR', description: 'D.Lgs. 81/08 artt. 18, 41, 74-79' },
            { value: 'pause_vdt', label: 'Pause/alternanza attività per videoterminale', description: 'D.Lgs. 81/08 artt. 173-176 e Allegato XXXIV' },
            { value: 'mmc_carichi_limitati', label: 'Movimentazione manuale carichi entro limiti indicati', description: 'D.Lgs. 81/08 artt. 167-171 e Allegato XXXIII' },
            { value: 'evitare_sforzi_incongrui', label: 'Evitare sforzi incongrui, posture forzate o movimenti ripetitivi prolungati', description: 'D.Lgs. 81/08 artt. 15, 41, Titolo VI' },
            { value: 'protezione_rumore', label: 'Protezione uditiva e rispetto del programma aziendale rumore', description: 'D.Lgs. 81/08 artt. 187-198' },
            { value: 'protezione_vibrazioni', label: 'Limitare esposizione a vibrazioni secondo valutazione del rischio', description: 'D.Lgs. 81/08 artt. 199-205' },
            { value: 'protezione_chimici', label: 'Evitare o ridurre esposizione ad agenti chimici sensibilizzanti/irritanti', description: 'D.Lgs. 81/08 artt. 221-232' },
            { value: 'protezione_biologici', label: 'Applicare misure di prevenzione per rischio biologico', description: 'D.Lgs. 81/08 artt. 266-286' },
            { value: 'no_alcol_stupefacenti_rischio', label: 'Rispetto dei divieti/controlli per alcol e sostanze nelle mansioni a rischio', description: 'D.Lgs. 81/08 art. 41; L. 125/2001; DPR 309/1990' },
            { value: 'sorveglianza_ravvicinata', label: 'Sorveglianza sanitaria ravvicinata secondo indicazione del medico competente', description: 'D.Lgs. 81/08 art. 41' }
        ],
        allowCustom: true,
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Conclusione e Follow-Up'
        }
    },
    // === P65/P66 MDL: Limitazioni alla Mansione (MULTI_CHOICE) ===
    {
        id: 'limitazioni_mansione_mdl',
        name: 'limitazioniMansioneMdl',
        label: 'Limitazioni alla Mansione Specifica',
        type: 'MULTI_CHOICE',
        section: 'followup',
        position: { row: 5, col: 0 },
        size: { width: 12, height: 4 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        enabled: false,
        hint: 'Limitazioni operative specifiche per la mansione svolta, da riportare nel giudizio di idoneità.',
        options: [
            { value: 'no_lavoro_quota', label: 'Non adibire a lavori in quota se non compatibili con il giudizio', description: 'D.Lgs. 81/08 artt. 41, 111-115' },
            { value: 'no_piattaforme_elevabili', label: 'Non adibire a PLE/cestelli se non compatibili con il giudizio', description: 'D.Lgs. 81/08 artt. 41, 71, 73' },
            { value: 'no_guida_mezzi', label: 'Limitare conduzione di mezzi/attrezzature ove non compatibile', description: 'D.Lgs. 81/08 artt. 41, 71, 73' },
            { value: 'no_spazi_confinati', label: 'Non adibire a spazi confinati o sospetti di inquinamento', description: 'D.Lgs. 81/08 art. 66; DPR 177/2011' },
            { value: 'limitazione_notturno_mansione', label: 'Limitazione o esclusione dal lavoro notturno', description: 'D.Lgs. 81/08 art. 41; D.Lgs. 66/2003' },
            { value: 'limitazione_mmc', label: 'Limitazione movimentazione manuale dei carichi', description: 'D.Lgs. 81/08 Titolo VI e Allegato XXXIII' },
            { value: 'no_vibrazioni', label: 'Limitazione esposizione a vibrazioni mano-braccio/corpo intero', description: 'D.Lgs. 81/08 Titolo VIII Capo III' },
            { value: 'no_rumore_85db', label: 'Limitazione esposizione a rumore elevato', description: 'D.Lgs. 81/08 Titolo VIII Capo II' },
            { value: 'limitazione_chimici', label: 'Limitazione esposizione ad agenti chimici pericolosi', description: 'D.Lgs. 81/08 Titolo IX Capo I' },
            { value: 'no_cancerogeni', label: 'Esclusione/limitazione esposizione ad agenti cancerogeni o mutageni', description: 'D.Lgs. 81/08 Titolo IX Capo II' },
            { value: 'no_stress_termico', label: 'Limitazione attività con stress termico severo', description: 'D.Lgs. 81/08 artt. 15, 28, 41' },
            { value: 'no_vdt_prolungato', label: 'Limitazione uso continuativo del videoterminale', description: 'D.Lgs. 81/08 Titolo VII' }
        ],
        allowCustom: true,
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Conclusione e Follow-Up'
        }
    },
    // === P66 MDL: Prescrizioni per l'Azienda (MULTI_CHOICE) ===
    {
        id: 'prescrizioni_azienda_mdl',
        name: 'prescrizioniAziendaMdl',
        label: 'Prescrizioni per l\'Azienda',
        type: 'MULTI_CHOICE',
        section: 'followup',
        position: { row: 6, col: 0 },
        size: { width: 12, height: 3 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        enabled: false,
        hint: 'Indicazioni operative per il datore di lavoro, da concordare con il RSPP.',
        options: [
            { value: 'adeguamento_postazione', label: 'Adeguare ergonomia/postazione secondo DVR e indicazioni del medico competente', description: 'D.Lgs. 81/08 artt. 18, 28, 41' },
            { value: 'fornitura_dpi', label: 'Fornire e verificare uso dei DPI prescritti', description: 'D.Lgs. 81/08 artt. 18, 74-79' },
            { value: 'aggiornamento_dvr', label: 'Valutare aggiornamento DVR e misure di prevenzione', description: 'D.Lgs. 81/08 artt. 28-29' },
            { value: 'revisione_mansione', label: 'Valutare revisione mansione/compiti compatibili con il giudizio', description: 'D.Lgs. 81/08 artt. 18, 41, 42' },
            { value: 'formazione_addestramento', label: 'Integrare formazione, informazione o addestramento specifico', description: 'D.Lgs. 81/08 artt. 36-37, 73' },
            { value: 'sorveglianza_raccordo_rspp', label: 'Condividere le misure con RSPP/RLS nei limiti della riservatezza sanitaria', description: 'D.Lgs. 81/08 artt. 25, 29, 41' },
            { value: 'monitoraggio_misure', label: 'Monitorare l’efficacia delle misure adottate e riferire al medico competente', description: 'D.Lgs. 81/08 artt. 18, 25, 41' }
        ],
        allowCustom: true,
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Conclusione e Follow-Up'
        }
    },
    // === R17: Esami Strumentali MDL — ECG ===
    // Campo speciale STRUMENTARIO_IMPORT: legge automaticamente dal bridge (device ECG)
    // se disponibile; altrimenti permette inserimento manuale del referto.
    {
        id: 'ecg_strumentario',
        name: 'ecgStrumentario',
        label: 'ECG (Elettrocardiogramma)',
        type: 'STRUMENTARIO_IMPORT',
        section: 'esame',
        position: { row: 10, col: 0 },
        size: { width: 6, height: 4 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        enabled: false,   // abilitare nei template MDL con rischio cardiovascolare
        defaultValue: 'normale',
        metadata: { tipoEsame: 'ECG', normalPreset: 'normale' },
        options: [
            { value: 'normale', label: 'Normale' },
            { value: 'borderline', label: 'Borderline / Dubbio' },
            { value: 'alterato', label: 'Alterato — richiede approfondimento' },
            { value: 'non_eseguito', label: 'Non eseguito' }
        ],
        hint: 'Risultato ECG a riposo (D.Lgs 81/08). Se importato dal dispositivo, i dati sono pre-compilati.',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Esame Obiettivo'
        }
    },
    // === R17: Esami Strumentali MDL — Audiometria ===
    {
        id: 'audiometria_strumentario',
        name: 'audiometriaStrumentario',
        label: 'Audiometria Tonale',
        type: 'STRUMENTARIO_IMPORT',
        section: 'esame',
        position: { row: 10, col: 6 },
        size: { width: 6, height: 4 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        enabled: false,   // abilitare nei template MDL con rischio rumore
        defaultValue: 'normale',
        metadata: { tipoEsame: 'AUDIOMETRIA', normalPreset: 'normale' },
        options: [
            { value: 'normale', label: 'Normale (soglie < 20 dB HL)' },
            { value: 'lieve_ipoacusia', label: 'Lieve ipoacusia (20–40 dB HL)' },
            { value: 'moderata_ipoacusia', label: 'Moderata ipoacusia (40–70 dB HL)' },
            { value: 'grave_ipoacusia', label: 'Grave ipoacusia (> 70 dB HL)' },
            { value: 'non_eseguita', label: 'Non eseguita' }
        ],
        hint: 'Audiometria tonale liminare (dB HL). Valori soglia secondo ISO 7029. Normativa: D.Lgs 81/08 Allegato VI.',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Esame Obiettivo'
        }
    },
    // === R17: Esami Strumentali MDL — Spirometria ===
    {
        id: 'spirometria_strumentario',
        name: 'spirometriaStrumentario',
        label: 'Spirometria',
        type: 'STRUMENTARIO_IMPORT',
        section: 'esame',
        position: { row: 14, col: 0 },
        size: { width: 6, height: 4 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        enabled: false,   // abilitare nei template MDL con rischio polveri/fumi
        defaultValue: 'normale',
        metadata: { tipoEsame: 'SPIROMETRIA', normalPreset: 'normale' },
        options: [
            { value: 'normale', label: 'Normale (FVC ≥ 80%, FEV1/FVC ≥ 70%)' },
            { value: 'ostruzione_lieve', label: 'Ostruzione lieve (FEV1/FVC < 70%, FEV1 ≥ 80%)' },
            { value: 'ostruzione_moderata', label: 'Ostruzione moderata (FEV1 50–80%)' },
            { value: 'ostruzione_grave', label: 'Ostruzione grave (FEV1 < 50%)' },
            { value: 'restrizione', label: 'Pattern restrittivo (FVC < 80%)' },
            { value: 'non_eseguita', label: 'Non eseguita' }
        ],
        hint: 'Spirometria basale (FVC, FEV1, Tiffeneau). Classificazione GOLD / ATS-ERS. Applicabile a rischio polveri, fumi, agenti chimici (D.Lgs 81/08 Allegato III).',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Esame Obiettivo'
        }
    },
    // === R17: Esami Strumentali MDL — Visiotest ===
    {
        id: 'visiotest_strumentario',
        name: 'visiotestStrumentario',
        label: 'Visiotest',
        type: 'STRUMENTARIO_IMPORT',
        section: 'esame',
        position: { row: 14, col: 6 },
        size: { width: 6, height: 4 },
        carryOverFromPrevious: false,
        showChart: true,
        required: false,
        enabled: false,
        defaultValue: 'normale',
        metadata: { tipoEsame: 'VISIOTEST', normalPreset: 'normale' },
        options: [
            { value: 'normale', label: 'Normale' },
            { value: 'alterato', label: 'Alterato — richiede approfondimento' },
            { value: 'non_eseguito', label: 'Non eseguito' }
        ],
        hint: 'Acuità visiva, stereopsi e visione cromatica. Può essere importato dal dispositivo o compilato manualmente.',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Esame Obiettivo'
        }
    },
    {
        id: 'valutazione_rachide_funzione',
        name: 'valutazioneRachideFunzionale',
        label: 'Valutazione funzionale del rachide',
        type: 'MULTI_CHOICE',
        section: 'esame',
        position: { row: 18, col: 0 },
        size: { width: 6, height: 3 },
        carryOverFromPrevious: false,
        required: false,
        enabled: false,
        options: [
            { value: 'dolore_assente', label: 'Dolore assente' },
            { value: 'dolore_lieve', label: 'Dolore lieve' },
            { value: 'dolore_moderato', label: 'Dolore moderato' },
            { value: 'limitazione_flessione', label: 'Limitazione flessione' },
            { value: 'limitazione_estensione', label: 'Limitazione estensione' },
            { value: 'test_lasegue_positivo', label: 'Lasègue positivo' },
            { value: 'contrattura_paravertebrale', label: 'Contrattura paravertebrale' },
            { value: 'necessita_approfondimento', label: 'Necessita approfondimento' }
        ],
        hint: 'Screening funzionale rachide per MMC, posture incongrue e vibrazioni corpo intero.',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Esame Obiettivo'
        }
    },
    {
        id: 'valutazione_rachide_note',
        name: 'valutazioneRachideNote',
        label: 'Note rachide',
        type: 'TEXTAREA',
        section: 'esame',
        position: { row: 21, col: 0 },
        size: { width: 6, height: 2 },
        carryOverFromPrevious: false,
        required: false,
        enabled: false,
        hint: 'Annotazioni cliniche libere sulla valutazione funzionale del rachide.',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Esame Obiettivo'
        }
    },
    {
        id: 'valutazione_arti_superiori_funzione',
        name: 'valutazioneArtiSuperioriFunzionale',
        label: 'Valutazione funzionale arti superiori',
        type: 'MULTI_CHOICE',
        section: 'esame',
        position: { row: 18, col: 6 },
        size: { width: 6, height: 3 },
        carryOverFromPrevious: false,
        required: false,
        enabled: false,
        options: [
            { value: 'motilita_conservata', label: 'Motilità conservata' },
            { value: 'dolore_spalla', label: 'Dolore spalla' },
            { value: 'dolore_gomito', label: 'Dolore gomito' },
            { value: 'dolore_polso_mano', label: 'Dolore polso/mano' },
            { value: 'parestesie', label: 'Parestesie' },
            { value: 'forza_ridotta', label: 'Forza ridotta' },
            { value: 'tinel_phalen_positivo', label: 'Tinel/Phalen positivo' },
            { value: 'necessita_approfondimento', label: 'Necessita approfondimento' }
        ],
        hint: 'Screening per movimenti ripetitivi, sovraccarico biomeccanico e vibrazioni mano-braccio.',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
            section: 'Esame Obiettivo'
        }
    },
    {
        id: 'valutazione_arti_superiori_note',
        name: 'valutazioneArtiSuperioriNote',
        label: 'Note arti superiori',
        type: 'TEXTAREA',
        section: 'esame',
        position: { row: 21, col: 6 },
        size: { width: 6, height: 2 },
        carryOverFromPrevious: false,
        required: false,
        enabled: false,
        hint: 'Annotazioni cliniche libere sulla valutazione funzionale degli arti superiori.',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: false,
            section: 'Esame Obiettivo'
        }
    }
];

// ============================================
// CONFIGURAZIONE SIDEBAR DEFAULT
// ============================================
const DEFAULT_SIDEBAR_CONFIG = {
    collapsible: true,
    defaultTab: 'anamnesi',
    sections: [
        {
            id: 'anamnesi',
            title: 'Anamnesi',
            label: 'Anamnesi',
            icon: 'ClipboardList',
            order: 0,
            visible: true,
            expandedByDefault: true
        },
        {
            id: 'vitali',
            title: 'Parametri Vitali',
            label: 'Parametri Vitali',
            icon: 'Activity',
            order: 1,
            visible: true,
            expandedByDefault: true
        },
        {
            id: 'esame',
            title: 'Esame Obiettivo',
            label: 'Esame Obiettivo',
            icon: 'Stethoscope',
            order: 2,
            visible: true,
            expandedByDefault: false
        },
        {
            id: 'diagnosi',
            title: 'Diagnosi',
            label: 'Diagnosi',
            icon: 'FileText',
            order: 3,
            visible: true,
            expandedByDefault: false
        },
        {
            id: 'terapia',
            title: 'Terapia',
            label: 'Terapia',
            icon: 'Pill',
            order: 4,
            visible: true,
            expandedByDefault: false
        },
        {
            id: 'followup',
            title: 'Conclusione e Follow-Up',
            label: 'Conclusione e Follow-Up',
            icon: 'Calendar',
            order: 5,
            visible: true,
            expandedByDefault: false
        }
    ]
};

// ============================================
// CONFIGURAZIONE STAMPA DEFAULT
// ============================================
const DEFAULT_PRINT_CONFIG = {
    showLogo: true,
    showHeader: true,
    showFooter: true,
    headerContent: '',
    footerContent: 'Documento generato elettronicamente',
    signaturePosition: 'bottom-right',
    includeTimestamp: true,
    includePageNumbers: true,
    sections: [
        { id: 'anamnesi', label: 'Anamnesi', order: 0, include: true },
        { id: 'vitali', label: 'Parametri Vitali', order: 1, include: true },
        { id: 'esame', label: 'Esame Obiettivo', order: 2, include: true },
        { id: 'diagnosi', label: 'Diagnosi', order: 3, include: true },
        { id: 'terapia', label: 'Terapia e Prescrizioni', order: 4, include: true },
        { id: 'followup', label: 'Conclusione e Follow-Up', order: 5, include: true }
    ]
};

// ============================================
// P52 Session #8: HELPER FUNCTIONS
// ============================================

/**
 * Default width based on field type (for 12-column grid)
 */
const getDefaultWidth = (type) => {
    switch (type) {
        case 'TEXT':
        case 'NUMBER':
        case 'DATE':
        case 'DATETIME':
        case 'BOOLEAN':
        case 'DROPDOWN':
            return 4;
        case 'TEXTAREA':
        case 'MULTI_CHOICE':
        case 'STRUMENTARIO_IMPORT':
            return 6;
        case 'RICHTEXT':
        case 'VITALS':
        case 'FILE':
            return 12;
        default:
            return 6;
    }
};

/**
 * Normalizes template fields to ensure all have position and size
 * This is used when reading templates from database to handle legacy data
 * @param {Array} fields - Array of field objects
 * @returns {Array} Fields with position and size guaranteed
 */
const normalizeTemplateFields = (fields) => {
    if (!Array.isArray(fields)) return fields;

    // Group by section to calculate positions. Specialist templates use custom
    // sections (spalla/gomito/polso_mano): keep every present section, otherwise
    // the API returns an apparently empty layout even when fields exist in DB.
    const baseSectionOrder = ['anamnesi', 'vitali', 'esame', 'spalla', 'gomito', 'polso_mano', 'diagnosi', 'terapia', 'followup'];
    const presentSections = new Set(fields.map(f => f?.section || 'anamnesi'));
    const sectionOrder = [
        ...baseSectionOrder.filter(section => presentSections.has(section)),
        ...Array.from(presentSections).filter(section => !baseSectionOrder.includes(section))
    ];
    const fieldsBySection = new Map();

    fields.forEach(f => {
        const section = f.section || 'anamnesi';
        if (!fieldsBySection.has(section)) {
            fieldsBySection.set(section, []);
        }
        fieldsBySection.get(section).push(f);
    });

    const normalizedFields = [];

    sectionOrder.forEach(section => {
        const sectionFields = fieldsBySection.get(section) || [];
        sectionFields.sort((a, b) =>
            (a.position?.row ?? 0) - (b.position?.row ?? 0)
            || (a.position?.col ?? 0) - (b.position?.col ?? 0)
            || (a.order || 0) - (b.order || 0)
            || String(a.label || a.name || '').localeCompare(String(b.label || b.name || ''))
        );

        const occupied = new Set();
        const canPlace = (row, col, width, height) => {
            if (col + width > 12) return false;
            for (let r = row; r < row + height; r += 1) {
                for (let c = col; c < col + width; c += 1) {
                    if (occupied.has(`${r}:${c}`)) return false;
                }
            }
            return true;
        };
        const markOccupied = (row, col, width, height) => {
            for (let r = row; r < row + height; r += 1) {
                for (let c = col; c < col + width; c += 1) {
                    occupied.add(`${r}:${c}`);
                }
            }
        };
        const firstFreePosition = (width, height) => {
            for (let row = 0; row < 80; row += 1) {
                for (let col = 0; col <= 12 - width; col += 1) {
                    if (canPlace(row, col, width, height)) return { row, col };
                }
            }
            return { row: 0, col: 0 };
        };

        sectionFields.forEach(field => {
            const width = Math.max(1, Math.min(12, field.size?.width || getDefaultWidth(field.type)));
            const height = Math.max(1, Math.min(6, field.size?.height || 1));

            const existingPosition = field.position
                ? {
                    row: Math.max(0, Number(field.position.row || 0)),
                    col: Math.max(0, Math.min(12 - width, Number(field.position.col || 0)))
                }
                : null;
            const position = existingPosition && canPlace(existingPosition.row, existingPosition.col, width, height)
                ? existingPosition
                : firstFreePosition(width, height);
            markOccupied(position.row, position.col, width, height);

            // P52 Session #10: Normalizza normalRange per pressione_diastolica
            // Il valore corretto è 60-85, non 60-90
            // P52 Session #11: Fix - usare field.id invece di field.key
            let normalRange = field.normalRange;
            if ((field.id === 'pressione_diastolica' || field.name === 'pressioneDiastolica') && normalRange) {
                if (normalRange.min === 60 && normalRange.max === 90) {
                    normalRange = { min: 60, max: 85 };
                }
            }

            normalizedFields.push({
                ...field,
                section,
                position,
                size: { width, height },
                visible: field.visible !== false,
                ...(normalRange && { normalRange })
            });
        });
    });

    return normalizedFields;
};

/**
 * Normalizes a template object by ensuring fields have position/size
 * @param {Object} template - Template object from database
 * @returns {Object} Template with normalized fields
 */
const normalizeTemplate = (template) => {
    if (!template) return template;
    return {
        ...template,
        fields: normalizeTemplateFields(template.fields)
    };
};

/**
 * Service per la gestione dei Template Visita
 */
export class VisitTemplateService {
    /**
     * Normalizes template fields to ensure all have position and size
     * @param {Object} template - Template object
     * @returns {Object} Template with normalized fields
     */
    static normalizeTemplate(template) {
        return normalizeTemplate(template);
    }

    static getSpecialistTemplateDefinition(prestazione) {
        const search = `${prestazione?.codice || ''} ${prestazione?.nome || ''}`.toLowerCase();
        const definitions = [
            {
                tokens: ['visio', 'vista'],
                name: 'Template Visiotest',
                description: 'Template dedicato alla compilazione del visiotest con import da strumento e classificazione rapida.',
                enabledFieldNames: ['visiotestStrumentario'],
            },
            {
                tokens: ['rachide', 'colonna'],
                name: 'Template Valutazione funzionale del rachide',
                description: 'Template dedicato alla valutazione funzionale del rachide.',
                customFields: this.buildRachideFunctionalFields(),
            },
            {
                tokens: ['arti superiori', 'arto superiore', 'superiori'],
                name: 'Template Valutazione funzionale arti superiori',
                description: 'Template dedicato alla valutazione funzionale degli arti superiori.',
                customFields: this.buildUpperLimbFunctionalFields(),
            },
            {
                tokens: ['spiro'],
                name: 'Template Spirometria',
                description: 'Template dedicato alla spirometria con import dati da strumento.',
                enabledFieldNames: ['spirometriaStrumentario'],
            },
            {
                tokens: ['audio'],
                name: 'Template Audiometria',
                description: 'Template dedicato all’audiometria con import dati da strumento.',
                enabledFieldNames: ['audiometriaStrumentario'],
            },
            {
                tokens: ['ecg', 'elettro'],
                name: 'Template ECG',
                description: 'Template dedicato all’elettrocardiogramma con import dati da strumento.',
                enabledFieldNames: ['ecgStrumentario'],
            },
            {
                tokens: ['alcol', 'alcool', 'alcohol'],
                name: 'Template Alcol test',
                description: 'Template compatto per test alcolemico con esito rapido.',
                customFields: this.buildAlcolTestFields(),
            },
            {
                tokens: ['drug', 'droga', 'droghe', 'tossicologico', 'sostanze'],
                name: 'Template Drug test',
                description: 'Template compatto per drug test con sostanze ricercate ed esito rapido.',
                customFields: this.buildDrugTestFields(),
            },
        ];
        return definitions.find(def => def.tokens.some(token => search.includes(token)));
    }

    static buildSpecialistTemplateName(definition, prestazione) {
        const prestazioneName = String(prestazione?.nome || '').trim();
        if (!prestazioneName) return definition.name;
        const baseName = definition.name.replace(/^Template\s+/i, '').trim().toLowerCase();
        if (prestazioneName.toLowerCase() === baseName) return definition.name;
        return `${definition.name} - ${prestazioneName}`;
    }

    static choiceField({ id, name, label, row, col = 0, width = 4, options, defaultValue, section = 'esame' }) {
        return {
            id,
            name,
            label,
            type: FIELD_TYPES.DROPDOWN,
            section,
            position: { row, col },
            size: { width, height: 1 },
            required: false,
            enabled: true,
            defaultValue,
            metadata: { normalPreset: defaultValue },
            options: options.map(value => ({ value, label: value })),
            printOptions: { include: 'IF_VALUED', showLabel: true, showTitle: false, section: 'Esame Obiettivo' }
        };
    }

    static multiField({ id, name, label, row, col = 0, width = 6, options, normalPreset = [], section = 'esame' }) {
        return {
            id,
            name,
            label,
            type: FIELD_TYPES.MULTI_CHOICE,
            section,
            position: { row, col },
            size: { width, height: 2 },
            required: false,
            enabled: true,
            defaultValue: normalPreset,
            metadata: { normalPreset },
            options: options.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt),
            printOptions: { include: 'IF_VALUED', showLabel: true, showTitle: false, section: 'Esame Obiettivo' }
        };
    }

    static noteField({ id, name, label, row, col = 0, width = 12, defaultValue = 'Nella norma.', section = 'esame' }) {
        return {
            id,
            name,
            label,
            type: FIELD_TYPES.TEXTAREA,
            section,
            position: { row, col },
            size: { width, height: 3 },
            required: false,
            enabled: true,
            defaultValue,
            metadata: { normalPreset: defaultValue },
            printOptions: { include: 'IF_VALUED', showLabel: true, showTitle: false, section: 'Esame Obiettivo' }
        };
    }

    static buildRachideFunctionalFields() {
        const noDxSx = ['NO', 'DX', 'SX', 'BILATERALE'];
        const normale = ['NORMALE', 'RIDOTTA', 'AUMENTATA', 'RETTILINEIZZATA'];
        const negative = ['NEGATIVO', 'POSITIVO DX', 'POSITIVO SX', 'BILATERALE'];
        const assente = ['ASSENTE', 'PRESENTE DX', 'PRESENTE SX', 'BILATERALE'];
        return [
            this.choiceField({ id: 'rachide_lordosi_cervicale', name: 'rachideLordosiCervicale', label: 'Lordosi cervicale', row: 0, col: 0, options: normale, defaultValue: 'NORMALE' }),
            this.choiceField({ id: 'rachide_cifosi_dorsale', name: 'rachideCifosiDorsale', label: 'Cifosi dorsale', row: 0, col: 6, options: normale, defaultValue: 'NORMALE' }),
            this.choiceField({ id: 'rachide_scoliosi_dorsale', name: 'rachideScoliosiDorsale', label: 'Scoliosi dorsale', row: 1, col: 0, options: noDxSx, defaultValue: 'NO' }),
            this.choiceField({ id: 'rachide_scoliosi_lombare', name: 'rachideScoliosiLombare', label: 'Scoliosi lombare', row: 1, col: 6, options: noDxSx, defaultValue: 'NO' }),
            this.choiceField({ id: 'rachide_lordosi_lombare', name: 'rachideLordosiLombare', label: 'Lordosi lombare', row: 2, col: 0, options: normale, defaultValue: 'NORMALE' }),
            this.choiceField({ id: 'rachide_lasegue', name: 'rachideLasegue', label: 'Lasègue', row: 3, col: 0, options: negative, defaultValue: 'NEGATIVO' }),
            this.choiceField({ id: 'rachide_ischio', name: 'rachideIschioCrurali', label: 'Retrazione ischiocrurali', row: 3, col: 6, options: assente, defaultValue: 'ASSENTE' }),
            this.choiceField({ id: 'rachide_psoas', name: 'rachidePsoas', label: 'Psoas', row: 4, col: 0, options: assente, defaultValue: 'ASSENTE' }),
            this.choiceField({ id: 'rachide_wasserman', name: 'rachideWasserman', label: 'Wasserman', row: 4, col: 6, options: negative, defaultValue: 'NEGATIVO' }),
            this.choiceField({ id: 'rachide_dorso_curvo', name: 'rachideDorsoCurvo', label: 'Dorso curvo', row: 5, col: 0, options: assente, defaultValue: 'ASSENTE' }),
            this.choiceField({ id: 'rachide_ritmo_lombo_pelvico', name: 'rachideRitmoLomboPelvico', label: 'Ritmo lombo pelvico', row: 5, col: 6, options: ['NORMALE', 'ALTERATO'], defaultValue: 'NORMALE' }),
            this.multiField({ id: 'rachide_motilita_dolente_cervicale', name: 'rachideMotilitaDolenteCervicale', label: 'Motilità dolente cervicale', row: 6, options: ['fless', 'est', 'incl DX', 'incl SX', 'rot DX', 'rot SX'], normalPreset: [] }),
            this.multiField({ id: 'rachide_motilita_ridotta_cervicale', name: 'rachideMotilitaRidottaCervicale', label: 'Motilità ridotta cervicale', row: 6, col: 6, options: ['fless', 'est', 'incl DX', 'incl SX', 'rot DX', 'rot SX'], normalPreset: [] }),
            this.multiField({ id: 'rachide_motilita_dolente_dorsolombare', name: 'rachideMotilitaDolenteDorsolombare', label: 'Motilità dolente dorsolombare', row: 8, options: ['fless', 'est', 'incl DX', 'incl SX', 'rot DX', 'rot SX'], normalPreset: [] }),
            this.multiField({ id: 'rachide_motilita_ridotta_dorsolombare', name: 'rachideMotilitaRidottaDorsolombare', label: 'Motilità ridotta dorsolombare', row: 8, col: 6, options: ['fless', 'est', 'incl DX', 'incl SX', 'rot DX', 'rot SX'], normalPreset: [] }),
            this.multiField({ id: 'rachide_riflessi', name: 'rachideRiflessi', label: 'Riflessi alterati', row: 10, options: ['addominali DX', 'addominali SX', 'achilleo DX', 'achilleo SX', 'rotuleo DX', 'rotuleo SX', 'medio plantare DX', 'medio plantare SX'], normalPreset: [] }),
            this.multiField({ id: 'rachide_prova_dinamica', name: 'rachideProvaDinamica', label: 'Prova dinamica 15 kg x 125 cm x 30”', row: 10, col: 6, options: ['non eseguita', 'corretta', 'tremori', 'cedimento', 'dolori', 'posizione compensatoria'], normalPreset: ['corretta'] }),
            this.noteField({ id: 'rachide_annotazioni', name: 'rachideAnnotazioni', label: 'Annotazioni', row: 12 })
        ];
    }

    static buildUpperLimbFunctionalFields() {
        const esito = ['NELLA NORMA', 'ALTERAZIONI LIEVI', 'ALTERAZIONI DA APPROFONDIRE'];
        return [
            { id: 'arti_valutazione_eseguita', name: 'artiValutazioneEseguita', label: 'Valutazione eseguita', type: FIELD_TYPES.BOOLEAN, section: 'spalla', position: { row: 0, col: 0 }, size: { width: 3, height: 1 }, enabled: true, defaultValue: true, metadata: { normalPreset: true } },
            this.multiField({ id: 'arti_spalla_palpazione', name: 'artiSpallaPalpazione', label: 'Palpazione spalla', row: 1, section: 'spalla', options: ['negativa', 'dolore anteriore DX', 'dolore anteriore SX', 'dolore posteriore DX', 'dolore posteriore SX', 'dolore laterale DX', 'dolore laterale SX'], normalPreset: ['negativa'] }),
            this.multiField({ id: 'arti_spalla_arco_doloroso', name: 'artiSpallaArcoDoloroso', label: 'Arco doloroso', row: 1, col: 6, section: 'spalla', options: ['negativa', 'presente DX', 'presente SX'], normalPreset: ['negativa'] }),
            this.choiceField({ id: 'arti_spalla_fless', name: 'artiSpallaFlessione', label: 'Flessione spalla', row: 3, col: 0, section: 'spalla', options: ['NORMALE', 'RIDOTTA DX', 'RIDOTTA SX', 'RIDOTTA BILATERALE'], defaultValue: 'NORMALE' }),
            this.choiceField({ id: 'arti_spalla_abduzione', name: 'artiSpallaAbduzione', label: 'Max abduzione', row: 3, col: 4, section: 'spalla', options: ['NORMALE', 'RIDOTTA DX', 'RIDOTTA SX', 'RIDOTTA BILATERALE'], defaultValue: 'NORMALE' }),
            this.choiceField({ id: 'arti_spalla_rotazione', name: 'artiSpallaRotazione', label: 'Rotazioni spalla', row: 3, col: 8, section: 'spalla', options: ['NORMALE', 'RIDOTTA INTERNA', 'RIDOTTA ESTERNA'], defaultValue: 'NORMALE' }),
            this.multiField({ id: 'arti_gomito_ispezione', name: 'artiGomitoIspezione', label: 'Ispezione gomito', row: 0, section: 'gomito', options: ['negativa', 'edema DX', 'edema SX'], normalPreset: ['negativa'] }),
            this.multiField({ id: 'arti_gomito_palpazione', name: 'artiGomitoPalpazione', label: 'Palpazione osteoarticolare', row: 0, col: 6, section: 'gomito', options: ['negativa', 'dolore epicondilo DX', 'dolore epicondilo SX', 'dolore epitroclea DX', 'dolore epitroclea SX', 'dolore olecrano DX', 'dolore olecrano SX'], normalPreset: ['negativa'] }),
            this.multiField({ id: 'arti_gomito_muscoli', name: 'artiGomitoMuscoli', label: 'Palpazione muscoli', row: 2, section: 'gomito', options: ['negativa', 'dolore epicondilei DX', 'dolore epicondilei SX', 'dolore epitrocleari DX', 'dolore epitrocleari SX'], normalPreset: ['negativa'] }),
            this.multiField({ id: 'arti_gomito_test', name: 'artiGomitoTest', label: 'Test gomito', row: 2, col: 6, section: 'gomito', options: ['test epicondilite negativo', 'dolore laterale gomito DX', 'dolore laterale gomito SX', 'test intrappolamento negativo', 'parestesie avambraccio 4/5 dito DX', 'parestesie avambraccio 4/5 dito SX'], normalPreset: ['test epicondilite negativo', 'test intrappolamento negativo'] }),
            this.multiField({ id: 'arti_polso_osservazione', name: 'artiPolsoOsservazione', label: 'Osservazione polso/mano', row: 0, section: 'polso_mano', options: ['negativa', 'cisti polso DX', 'cisti polso SX', 'edema DX', 'edema SX', 'ipotrofia DX', 'ipotrofia SX'], normalPreset: ['negativa'] }),
            this.multiField({ id: 'arti_polso_test', name: 'artiPolsoTest', label: 'Test polso/mano', row: 0, col: 6, section: 'polso_mano', options: ['test dito a scatto negativo', 'Finkelstein negativo', 'Phalen negativo', 'test pressione negativo', 'parestesie n. mediano DX', 'parestesie n. mediano SX', 'parestesie n. ulnare DX', 'parestesie n. ulnare SX'], normalPreset: ['test dito a scatto negativo', 'Finkelstein negativo', 'Phalen negativo', 'test pressione negativo'] }),
            this.choiceField({ id: 'arti_valutazione_finale', name: 'artiValutazioneFinale', label: 'Valutazione finale', row: 2, col: 0, width: 5, section: 'polso_mano', options: esito, defaultValue: 'NELLA NORMA' }),
            this.noteField({ id: 'arti_note', name: 'artiNote', label: 'Annotazioni', row: 2, col: 5, width: 7, section: 'polso_mano', defaultValue: '' })
        ];
    }

    static buildAlcolTestFields() {
        return [
            this.choiceField({
                id: 'alcol_test_esito',
                name: 'alcolTestEsito',
                label: 'Esito alcol test',
                row: 0,
                col: 0,
                width: 4,
                options: ['NEGATIVO', 'POSITIVO', 'NON ESEGUITO'],
                defaultValue: 'NEGATIVO'
            }),
            {
                id: 'alcol_test_valore',
                name: 'alcolTestValore',
                label: 'Valore rilevato (g/L)',
                type: FIELD_TYPES.NUMBER,
                section: 'esame',
                position: { row: 0, col: 4 },
                size: { width: 4, height: 1 },
                required: false,
                enabled: true,
                defaultValue: 0,
                metadata: { normalPreset: 0 },
                validation: { min: 0, max: 5 },
                printOptions: { include: 'IF_VALUED', showLabel: true, showTitle: false, section: 'Esame Obiettivo' }
            },
            this.choiceField({
                id: 'alcol_test_metodo',
                name: 'alcolTestMetodo',
                label: 'Metodo',
                row: 0,
                col: 8,
                width: 4,
                options: ['ETILOMETRO', 'TEST SALIVARE', 'ALTRO'],
                defaultValue: 'ETILOMETRO'
            }),
            this.noteField({
                id: 'alcol_test_note',
                name: 'alcolTestNote',
                label: 'Annotazioni',
                row: 1,
                defaultValue: 'Test negativo. Nessun segno clinico di alterazione.'
            })
        ];
    }

    static buildDrugTestFields() {
        return [
            this.choiceField({
                id: 'drug_test_esito',
                name: 'drugTestEsito',
                label: 'Esito drug test',
                row: 0,
                col: 0,
                width: 4,
                options: ['NEGATIVO', 'POSITIVO', 'NON ESEGUITO'],
                defaultValue: 'NEGATIVO'
            }),
            this.multiField({
                id: 'drug_test_sostanze',
                name: 'drugTestSostanze',
                label: 'Sostanze ricercate',
                row: 0,
                col: 4,
                width: 8,
                options: ['OPPIACEI', 'COCAINA', 'CANNABINOIDI', 'AMFETAMINE', 'METAMFETAMINE', 'BENZODIAZEPINE', 'METADONE', 'BARBITURICI'],
                normalPreset: ['OPPIACEI', 'COCAINA', 'CANNABINOIDI', 'AMFETAMINE', 'METAMFETAMINE', 'BENZODIAZEPINE']
            }),
            this.choiceField({
                id: 'drug_test_matrice',
                name: 'drugTestMatrice',
                label: 'Matrice',
                row: 2,
                col: 0,
                width: 4,
                options: ['URINE', 'SALIVA', 'ALTRO'],
                defaultValue: 'URINE'
            }),
            this.noteField({
                id: 'drug_test_note',
                name: 'drugTestNote',
                label: 'Annotazioni',
                row: 3,
                defaultValue: 'Test negativo per le sostanze ricercate.'
            })
        ];
    }

    static compactSpecialistFields(fields) {
        if (!Array.isArray(fields)) return [];
        const clonedFields = JSON.parse(JSON.stringify(fields))
            .filter(field => field && field.visible !== false)
            .map(field => ({
                ...field,
                visible: true,
                enabled: field.enabled !== false,
                required: false,
                section: field.section || 'esame',
                size: {
                    width: Math.max(1, Math.min(field.size?.width || getDefaultWidth(field.type), 12)),
                    height: Math.max(1, field.size?.height || 1)
                }
            }));

        const occupancyBySection = new Map();
        const canPlace = (occupied, row, col, width, height) => {
            if (col + width > 12) return false;
            for (let r = row; r < row + height; r += 1) {
                for (let c = col; c < col + width; c += 1) {
                    if (occupied.get(`${r}:${c}`)) return false;
                }
            }
            return true;
        };
        const markOccupied = (occupied, row, col, width, height) => {
            for (let r = row; r < row + height; r += 1) {
                for (let c = col; c < col + width; c += 1) {
                    occupied.set(`${r}:${c}`, true);
                }
            }
        };
        const findSlot = (occupied, width, height) => {
            for (let row = 0; row < 80; row += 1) {
                for (let col = 0; col <= 12 - width; col += 1) {
                    if (canPlace(occupied, row, col, width, height)) return { row, col };
                }
            }
            return { row: 0, col: 0 };
        };

        const sorted = clonedFields.sort((a, b) => {
            const sectionA = String(a.section || 'esame');
            const sectionB = String(b.section || 'esame');
            if (sectionA !== sectionB) return sectionA.localeCompare(sectionB);
            return (a.position?.row ?? 0) - (b.position?.row ?? 0)
                || (a.position?.col ?? 0) - (b.position?.col ?? 0)
                || String(a.label || a.name || '').localeCompare(String(b.label || b.name || ''));
        });

        return sorted.map(field => {
            const section = field.section || 'esame';
            const occupied = occupancyBySection.get(section) || new Map();
            occupancyBySection.set(section, occupied);
            const isFullWidth = ['TEXTAREA', 'RICHTEXT', 'STRUMENTARIO_IMPORT', 'CHART', 'FILE', 'DOCUMENT_UPLOAD'].includes(String(field.type));
            const width = isFullWidth ? 12 : Math.max(3, Math.min(field.size.width || 6, 6));
            const height = isFullWidth ? Math.max(2, field.size.height || 2) : Math.max(1, field.size.height || 1);
            const { row, col } = findSlot(occupied, width, height);
            markOccupied(occupied, row, col, width, height);

            return {
                ...field,
                position: { row, col },
                size: { width, height }
            };
        });
    }

    static buildSpecialistSidebarConfig(fields) {
        const sectionMeta = {
            vitali: { title: 'Parametri', label: 'Parametri', icon: 'Activity', order: 0 },
            esame: { title: 'Accertamento', label: 'Accertamento', icon: 'Stethoscope', order: 1 },
            spalla: { title: 'Spalla', label: 'Spalla', icon: 'Activity', order: 2 },
            gomito: { title: 'Gomito', label: 'Gomito', icon: 'Activity', order: 3 },
            polso_mano: { title: 'Polso / mano', label: 'Polso / mano', icon: 'Activity', order: 4 },
            diagnosi: { title: 'Esito', label: 'Esito', icon: 'FileText', order: 5 },
            followup: { title: 'Note', label: 'Note', icon: 'Calendar', order: 6 },
            anamnesi: { title: 'Anamnesi', label: 'Anamnesi', icon: 'ClipboardList', order: 7 },
            terapia: { title: 'Terapia', label: 'Terapia', icon: 'Pill', order: 8 }
        };
        const usedSections = Array.from(new Set(
            (Array.isArray(fields) ? fields : [])
                .filter(field => field?.visible !== false)
                .map(field => field.section || 'esame')
        )).sort((a, b) => (sectionMeta[a]?.order ?? 99) - (sectionMeta[b]?.order ?? 99));

        const sections = usedSections.length > 0 ? usedSections : ['esame'];
        return {
            collapsible: false,
            sectionLayout: 'tabs',
            defaultTab: sections.includes('esame') ? 'esame' : sections[0],
            compact: true,
            specialist: true,
            sections: sections.map((sectionId, index) => {
                const meta = sectionMeta[sectionId] || {
                    title: sectionId,
                    label: sectionId,
                    icon: 'FileText',
                    order: index
                };
                return {
                    id: sectionId,
                    title: meta.title,
                    label: meta.label,
                    icon: meta.icon,
                    order: index,
                    visible: true,
                    expandedByDefault: true
                };
            })
        };
    }

    static buildSpecialistTemplateFields(definitionOrEnabledFieldNames) {
        if (definitionOrEnabledFieldNames?.customFields) {
            return this.compactSpecialistFields(
                JSON.parse(JSON.stringify(definitionOrEnabledFieldNames.customFields))
                    .map(field => ({ ...field, visible: field.visible !== false }))
            );
        }
        const enabled = new Set(Array.isArray(definitionOrEnabledFieldNames) ? definitionOrEnabledFieldNames : definitionOrEnabledFieldNames?.enabledFieldNames || []);
        const baseNames = ['peso', 'altezza', 'bmi', 'noteMedico'];
        const fields = DEFAULT_VISIT_FIELDS
            .filter(field => enabled.has(field.name) || baseNames.includes(field.name))
            .map(field => ({
                ...JSON.parse(JSON.stringify(field)),
                visible: field.visible !== false,
                enabled: enabled.has(field.name) ? true : field.enabled,
                required: false,
                metadata: {
                    ...(field.metadata || {}),
                    normalPreset: field.metadata?.normalPreset ?? field.defaultValue ?? undefined
                }
            }));
        return this.compactSpecialistFields(fields);
    }

    static async ensureSpecialistTemplateForPrestazione(prestazioneId, tenantId, createdBy = null) {
        if (!prestazioneId) return null;
        const prestazione = await prisma.prestazione.findFirst({
            where: { id: prestazioneId, tenantId, deletedAt: null },
            select: { id: true, nome: true, codice: true, tenantId: true }
        });
        const definition = this.getSpecialistTemplateDefinition(prestazione);
        if (!prestazione || !definition) return null;
        const templateName = this.buildSpecialistTemplateName(definition, prestazione);

        const existing = await prisma.visitTemplate.findFirst({
            where: {
                prestazioneId,
                tenantId,
                medicoId: null,
                scope: 'PRESTAZIONE',
                isActive: true,
                deletedAt: null
            }
        });
        const fields = this.buildSpecialistTemplateFields(definition);
        const sidebarConfig = this.buildSpecialistSidebarConfig(fields);
        if (existing) {
            const existingFields = Array.isArray(existing.fields) ? existing.fields : [];
            const fieldNames = new Set(existingFields.map(field => field?.name).filter(Boolean));
            const desiredFieldNames = new Set(fields.map(field => field?.name).filter(Boolean));
            const missingFields = fields.some(field => !fieldNames.has(field.name));
            const extraFields = existingFields.some(field => field?.name && !desiredFieldNames.has(field.name));
            const missingNormalPreset = fields.some(field => {
                if (field.metadata?.normalPreset === undefined) return false;
                const current = existingFields.find(existingField => existingField?.name === field.name);
                return current && current.metadata?.normalPreset === undefined;
            });
            const layoutMismatch = fields.some(field => {
                const current = existingFields.find(existingField => existingField?.name === field.name);
                return !current
                    || current.section !== field.section
                    || current.position?.row !== field.position?.row
                    || current.position?.col !== field.position?.col
                    || current.size?.width !== field.size?.width
                    || current.size?.height !== field.size?.height;
            });
            const hasCompactLayout = existing.sidebarConfig?.sectionLayout === 'tabs'
                && existing.sidebarConfig?.specialist === true;
            const shouldRefresh = existing.name !== templateName
                || missingFields
                || extraFields
                || missingNormalPreset
                || layoutMismatch
                || existingFields.length !== fields.length
                || !hasCompactLayout;
            if (!shouldRefresh) return existing;
            return prisma.visitTemplate.update({
                where: { id: existing.id },
                data: {
                    name: templateName,
                    description: definition.description,
                    fields,
                    sidebarConfig,
                    scope: 'PRESTAZIONE',
                    medicoId: null,
                    version: { increment: 1 },
                    updatedBy: createdBy || undefined
                }
            });
        }

        return prisma.visitTemplate.create({
            data: {
                medicoId: null,
                tenantId,
                scope: 'PRESTAZIONE',
                prestazioneId,
                name: templateName,
                description: definition.description,
                fields,
                sidebarConfig,
                printConfig: DEFAULT_PRINT_CONFIG,
                isDefault: false,
                isActive: true,
                version: 1,
                createdBy
            }
        });
    }

    /**
     * Crea un nuovo template visita
     * @param {Object} data - Dati del template
     * @param {string} data.medicoId - ID del medico proprietario
     * @param {string} data.tenantId - ID tenant
     * @param {string} data.name - Nome template
     * @param {string} [data.description] - Descrizione
     * @param {string} [data.prestazioneId] - ID prestazione (opzionale)
     * @param {string} [data.bundleId] - ID bundle (opzionale)
     * @param {Array} [data.fields] - Configurazione campi
     * @param {Object} [data.sidebarConfig] - Configurazione sidebar
     * @param {Object} [data.printConfig] - Configurazione stampa
     * @param {boolean} [data.isDefault] - Se template default
     * @param {string} createdBy - ID utente che crea
     * @returns {Promise<Object>} Template creato
     */
    static async create(data, createdBy) {
        try {
            const {
                medicoId,
                tenantId,
                name,
                description,
                prestazioneId,
                bundleId,
                fields,
                sidebarConfig,
                printConfig,
                isDefault = false,
                isActive = true,
                defaultScadenzaMesi,
                scope = 'PERSONAL' // GLOBAL, PRESTAZIONE, PERSONAL
            } = data;

            // Validazione scope:
            // - PERSONAL: medicoId OBBLIGATORIO; prestazioneId opzionale (se nullo vale per tutte le prestazioni del medico)
            // - PRESTAZIONE: prestazioneId OBBLIGATORIO e medicoId nullo (condiviso per tutti i medici)
            // - CATALOGO/GLOBAL: medicoId nullo
            if (scope === 'PERSONAL' && !medicoId) {
                throw new Error('medicoId obbligatorio per template personali');
            }
            if (scope === 'PRESTAZIONE' && !prestazioneId) {
                throw new Error('prestazioneId obbligatorio per template di tipo PRESTAZIONE');
            }
            const effectiveMedicoId = scope === 'PERSONAL' ? (medicoId || null) : null;

            // ===================================================
            // STEP 1: Usa SEMPRE il tenantId della richiesta (req.person.tenantId)
            // La prestazione/bundle DEVE appartenere allo stesso tenant
            // ===================================================
            const effectiveTenantId = tenantId;

            // Se prestazioneId specificato, verifica che appartenga al tenant corrente
            if (prestazioneId) {
                const prestazione = await prisma.prestazione.findFirst({
                    where: { id: prestazioneId, tenantId: effectiveTenantId, deletedAt: null }
                });
                if (!prestazione) {
                    throw new Error('Prestazione non trovata nel tenant corrente');
                }
            }

            // Se bundleId specificato, verifica che appartenga al tenant corrente
            if (bundleId) {
                const bundle = await prisma.offertaBundle.findFirst({
                    where: { id: bundleId, tenantId: effectiveTenantId, deletedAt: null }
                });
                if (!bundle) {
                    throw new Error('Bundle non trovato nel tenant corrente');
                }
            }

            // ===================================================
            // STEP 2: Verifica medico (ora con effectiveTenantId)
            // ===================================================
            if (effectiveMedicoId) {
                const medico = await prisma.person.findFirst({
                    where: { id: effectiveMedicoId, deletedAt: null },
                    include: {
                        tenantProfiles: {
                            where: { tenantId: effectiveTenantId, deletedAt: null, isActive: true },
                            take: 1
                        }
                    }
                });

                if (!medico) {
                    throw new Error('Medico non trovato');
                }

                // Verifica che medico abbia accesso al tenant effettivo
                if (medico.tenantProfiles.length === 0) {
                    throw new Error(`Medico non ha accesso al tenant richiesto`);
                }
            }

            // ===================================================
            // STEP 3: Verifica unicità (usa null esplicito per medicoId, non undefined)
            // Prisma tratta undefined come "ometti dal filtro" - pericoloso per uniqueness
            // ===================================================
            if (prestazioneId) {
                const existing = await prisma.visitTemplate.findFirst({
                    where: {
                        medicoId: effectiveMedicoId,
                        prestazioneId,
                        tenantId: effectiveTenantId,
                        deletedAt: null
                    }
                });
                if (existing) {
                    throw new Error('Template già esistente per questa prestazione');
                }
            }

            if (bundleId) {
                const existing = await prisma.visitTemplate.findFirst({
                    where: {
                        medicoId: effectiveMedicoId,
                        bundleId,
                        tenantId: effectiveTenantId,
                        deletedAt: null
                    }
                });
                if (existing) {
                    throw new Error('Template già esistente per questo bundle');
                }
            }

            // Se isDefault, rimuovi default precedente
            if (isDefault && effectiveMedicoId) {
                await prisma.visitTemplate.updateMany({
                    where: {
                        medicoId: effectiveMedicoId,
                        tenantId: effectiveTenantId,
                        isDefault: true,
                        deletedAt: null
                    },
                    data: { isDefault: false }
                });
            }

            // Crea template (con gestione conflitto soft-delete su unique constraint)
            let template;
            try {
                // Prima: controlla se esiste un template soft-deleted con la stessa combinazione
                // Le unique constraints DB includono anche i record soft-deleted
                if (prestazioneId || bundleId) {
                    const softDeletedConflict = await prisma.visitTemplate.findFirst({
                        where: {
                            medicoId: effectiveMedicoId,
                            tenantId: effectiveTenantId,
                            deletedAt: { not: null },
                            ...(prestazioneId ? { prestazioneId } : {}),
                            ...(bundleId ? { bundleId } : {})
                        }
                    });
                    if (softDeletedConflict) {
                        // Hard-delete il record soft-deleted per liberare lo slot unique
                        await prisma.visitTemplate.delete({
                            where: { id: softDeletedConflict.id }
                        });
                    }
                }

                template = await prisma.visitTemplate.create({
                    data: {
                        medicoId: effectiveMedicoId,
                        tenantId: effectiveTenantId,
                        name,
                        description,
                        scope,
                        prestazioneId,
                        bundleId,
                        fields: fields || DEFAULT_VISIT_FIELDS,
                        sidebarConfig: sidebarConfig || DEFAULT_SIDEBAR_CONFIG,
                        printConfig: printConfig || DEFAULT_PRINT_CONFIG,
                        isDefault,
                        defaultScadenzaMesi: defaultScadenzaMesi != null ? defaultScadenzaMesi : null,
                        isActive,
                        version: 1,
                        createdBy
                    },
                    include: {
                        medico: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        prestazione: {
                            select: { id: true, nome: true, codice: true }
                        },
                        bundle: {
                            select: { id: true, nome: true, codice: true }
                        }
                    }
                });
            } catch (prismaError) {
                // Gestione P2002: unique constraint violation (soft-deleted row conflict non catturato sopra)
                if (prismaError.code === 'P2002') {
                    throw new Error('Template già esistente per questa combinazione medico/prestazione/bundle');
                }
                throw prismaError;
            }

            logger.info({
                templateId: template.id,
                medicoId,
                prestazioneId,
                bundleId,
                tenantId,
                createdBy
            }, 'Visit template creato');

            return normalizeTemplate(template);
        } catch (error) {
            logger.error({ error: error.message, data }, 'Errore creazione visit template');
            throw error;
        }
    }

    /**
     * Recupera template per ID
     * @param {string} id - ID template
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Template trovato
     */
    static async getById(id, tenantId) {
        try {
            const template = await prisma.visitTemplate.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { tenantId, deletedAt: null, isActive: true },
                                select: { specialties: true, title: true },
                                take: 1
                            }
                        }
                    },
                    prestazione: {
                        select: { id: true, nome: true, codice: true, tipo: true }
                    },
                    bundle: {
                        select: { id: true, nome: true, codice: true }
                    }
                }
            });

            return template;
        } catch (error) {
            logger.error({ error: error.message, id }, 'Errore recupero visit template');
            throw error;
        }
    }

    /**
     * Recupera tutti i template di un medico
     * @param {string} medicoId - ID medico
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni query
     * @returns {Promise<Array>} Lista template
     */
    static async getByMedico(medicoId, tenantId, options = {}) {
        try {
            const { includeInactive = false } = options;

            // Recupera template personali del medico + template GLOBAL/PRESTAZIONE condivisi
            const templates = await prisma.visitTemplate.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    ...(includeInactive ? {} : { isActive: true }),
                    OR: [
                        { medicoId },                         // Template personali
                        { medicoId: null, scope: 'GLOBAL' },  // Template globali condivisi
                        { medicoId: null, scope: 'PRESTAZIONE' }, // Template per prestazione
                        { medicoId: null, scope: 'CATALOGO' }  // Template catalogo
                    ]
                },
                include: {
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    },
                    bundle: {
                        select: { id: true, nome: true, codice: true }
                    }
                },
                orderBy: [
                    { isDefault: 'desc' },
                    { name: 'asc' }
                ]
            });

            return templates.map(normalizeTemplate);
        } catch (error) {
            logger.error({ error: error.message, medicoId }, 'Errore recupero template medico');
            throw error;
        }
    }

    /**
     * Recupera tutti i template (per admin)
     * @param {string} tenantId - ID tenant (opzionale per super admin)
     * @param {Object} options - Opzioni query
     * @returns {Promise<Object>} Lista paginata template
     */
    static async getAll(tenantId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search,
                medicoId,
                prestazioneId,
                bundleId,
                scope, // P65.7: Supporto filtro per scope (PERSONAL, PRESTAZIONE, GLOBAL, CATALOGO)
                isDefault,
                isActive,
                allTenants = false,
                tenantIds
            } = options;

            const skip = (page - 1) * limit;

            // Costruisci where clause
            const where = {
                deletedAt: null
            };

            // Multi-tenancy
            if (!allTenants) {
                if (tenantIds && tenantIds.length > 0) {
                    where.tenantId = { in: tenantIds };
                } else if (tenantId) {
                    where.tenantId = tenantId;
                }
            }

            // Filtri opzionali
            if (medicoId) where.medicoId = medicoId;
            if (prestazioneId) where.prestazioneId = prestazioneId;
            if (bundleId) where.bundleId = bundleId;
            if (scope) where.scope = scope; // P65.7: Filtro scope
            if (typeof isDefault === 'boolean') where.isDefault = isDefault;
            if (typeof isActive === 'boolean') where.isActive = isActive;

            // Ricerca testuale
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { medico: { firstName: { contains: search, mode: 'insensitive' } } },
                    { medico: { lastName: { contains: search, mode: 'insensitive' } } }
                ];
            }

            const [templates, total] = await Promise.all([
                prisma.visitTemplate.findMany({
                    where,
                    include: {
                        medico: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                tenantProfiles: {
                                    where: { deletedAt: null, isActive: true },
                                    select: { specialties: true, title: true, tenantId: true },
                                    take: 1
                                }
                            }
                        },
                        prestazione: {
                            select: { id: true, nome: true, codice: true }
                        },
                        bundle: {
                            select: { id: true, nome: true, codice: true }
                        }
                    },
                    orderBy: [
                        { medico: { lastName: 'asc' } },
                        { isDefault: 'desc' },
                        { name: 'asc' }
                    ],
                    skip,
                    take: limit
                }),
                prisma.visitTemplate.count({ where })
            ]);

            return {
                items: templates.map(normalizeTemplate),
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            logger.error({ error: error.message, options }, 'Errore recupero tutti i template');
            throw error;
        }
    }

    /**
     * Trova il template da usare per una visita
     * Ordine di priorità: prestazione specifica > bundle specifico > default medico > campi default sistema
     * @param {string} medicoId - ID medico
     * @param {string} tenantId - ID tenant
     * @param {string} [prestazioneId] - ID prestazione
     * @param {string} [bundleId] - ID bundle
     * @returns {Promise<Object>} Template da usare
     */
    static async findTemplateForVisit(medicoId, tenantId, prestazioneId, bundleId) {
        try {
            // ===================================================
            // STEP 0: Determina effectiveTenantId dalla prestazione/bundle
            // Per garantire la ricerca nel tenant corretto
            // ===================================================
            let effectiveTenantId = tenantId;

            if (prestazioneId) {
                // Cerca la prestazione nel tenant corrente prima di tutto
                const prestazione = await prisma.prestazione.findFirst({
                    where: { id: prestazioneId, tenantId, deletedAt: null }
                });
                if (prestazione) {
                    effectiveTenantId = prestazione.tenantId;
                }
                // Se non trovata nel tenant corrente, mantieni il tenantId del JWT
            } else if (bundleId) {
                const bundle = await prisma.offertaBundle.findFirst({
                    where: { id: bundleId, tenantId, deletedAt: null }
                });
                if (bundle) {
                    effectiveTenantId = bundle.tenantId;
                }
            }

            logger.debug({
                medicoId,
                prestazioneId,
                bundleId,
                originalTenantId: tenantId,
                effectiveTenantId
            }, 'findTemplateForVisit - ricerca template');

            // ===================================================
            // STEP 1: Cerca template PERSONALE specifico per prestazione+medico
            // ===================================================
            if (prestazioneId && medicoId) {
                const templatePrestazioneMedico = await prisma.visitTemplate.findFirst({
                    where: {
                        medicoId,
                        prestazioneId,
                        tenantId: effectiveTenantId,
                        isActive: true,
                        deletedAt: null
                    }
                });
                if (templatePrestazioneMedico) {
                    logger.debug({ templateId: templatePrestazioneMedico.id, scope: 'PERSONAL+PRESTAZIONE' }, 'Template trovato');
                    return templatePrestazioneMedico;
                }
            }

            // ===================================================
            // STEP 2: Cerca template PERSONALE generico del medico.
            // Prevale sul template di prestazione condiviso quando il medico
            // ha scelto un proprio layout per tutte le prestazioni.
            // ===================================================
            if (medicoId) {
                const templatePersonaleGenerico = await prisma.visitTemplate.findFirst({
                    where: {
                        medicoId,
                        tenantId: effectiveTenantId,
                        scope: 'PERSONAL',
                        prestazioneId: null,
                        bundleId: null,
                        isActive: true,
                        deletedAt: null
                    }
                });
                if (templatePersonaleGenerico) {
                    logger.debug({ templateId: templatePersonaleGenerico.id, scope: 'PERSONAL' }, 'Template personale generico trovato');
                    return templatePersonaleGenerico;
                }
            }

            // ===================================================
            // STEP 3: Cerca template scope PRESTAZIONE (senza medicoId specifico)
            // ===================================================
            if (prestazioneId) {
                const templatePrestazione = await prisma.visitTemplate.findFirst({
                    where: {
                        prestazioneId,
                        tenantId: effectiveTenantId,
                        scope: 'PRESTAZIONE',
                        medicoId: null,
                        isActive: true,
                        deletedAt: null
                    }
                });
                if (templatePrestazione) {
                    logger.debug({ templateId: templatePrestazione.id, scope: 'PRESTAZIONE' }, 'Template prestazione trovato');
                    return templatePrestazione;
                }

                const specialistTemplate = await this.ensureSpecialistTemplateForPrestazione(prestazioneId, effectiveTenantId);
                if (specialistTemplate) {
                    logger.debug({ templateId: specialistTemplate.id, scope: 'PRESTAZIONE_AUTO_SPECIALISTICA' }, 'Template prestazione specialistica creato/trovato');
                    return specialistTemplate;
                }
            }

            // ===================================================
            // STEP 4: Cerca template specifico per bundle+medico
            // ===================================================
            if (bundleId && medicoId) {
                const templateBundleMedico = await prisma.visitTemplate.findFirst({
                    where: {
                        medicoId,
                        bundleId,
                        tenantId: effectiveTenantId,
                        isActive: true,
                        deletedAt: null
                    }
                });
                if (templateBundleMedico) {
                    logger.debug({ templateId: templateBundleMedico.id, scope: 'PERSONAL+BUNDLE' }, 'Template bundle trovato');
                    return templateBundleMedico;
                }
            }

            // ===================================================
            // STEP 5: Cerca template scope BUNDLE (senza medicoId specifico)
            // ===================================================
            if (bundleId) {
                const templateBundle = await prisma.visitTemplate.findFirst({
                    where: {
                        bundleId,
                        tenantId: effectiveTenantId,
                        scope: 'BUNDLE',
                        isActive: true,
                        deletedAt: null
                    }
                });
                if (templateBundle) {
                    logger.debug({ templateId: templateBundle.id, scope: 'BUNDLE' }, 'Template bundle trovato');
                    return templateBundle;
                }
            }

            // ===================================================
            // STEP 6: Cerca template default PERSONALE del medico
            // ===================================================
            if (medicoId) {
                const templateDefault = await prisma.visitTemplate.findFirst({
                    where: {
                        medicoId,
                        tenantId: effectiveTenantId,
                        isDefault: true,
                        isActive: true,
                        deletedAt: null
                    }
                });
                if (templateDefault) {
                    logger.debug({ templateId: templateDefault.id, scope: 'PERSONAL_DEFAULT' }, 'Template default medico trovato');
                    return templateDefault;
                }
            }

            // ===================================================
            // STEP 7: Cerca template GLOBAL del tenant
            // ===================================================
            const templateGlobal = await prisma.visitTemplate.findFirst({
                where: {
                    tenantId: effectiveTenantId,
                    scope: 'GLOBAL',
                    isDefault: true,
                    isActive: true,
                    deletedAt: null
                }
            });
            if (templateGlobal) {
                logger.debug({ templateId: templateGlobal.id, scope: 'GLOBAL' }, 'Template global trovato');
                return templateGlobal;
            }

            // ===================================================
            // STEP 8: Restituisci template sistema (virtuale)
            // ===================================================
            logger.debug({ medicoId, effectiveTenantId }, 'Uso template sistema default');
            return {
                id: null,
                name: 'Template Sistema',
                fields: DEFAULT_VISIT_FIELDS,
                sidebarConfig: DEFAULT_SIDEBAR_CONFIG,
                printConfig: DEFAULT_PRINT_CONFIG,
                isSystem: true
            };
        } catch (error) {
            logger.error({ error: error.message, medicoId }, 'Errore ricerca template visita');
            throw error;
        }
    }

    /**
     * Aggiorna un template
     * @param {string} id - ID template
     * @param {Object} data - Dati da aggiornare
     * @param {string} updatedBy - ID utente che modifica
     * @returns {Promise<Object>} Template aggiornato
     */
    static async update(id, data, updatedBy, tenantId = null) {
        try {
            const existing = await prisma.visitTemplate.findFirst({
                where: { id, deletedAt: null, ...(tenantId ? { tenantId } : {}) }
            });

            if (!existing) {
                throw new Error('Template non trovato');
            }

            const {
                name,
                description,
                scope,
                medicoId,
                prestazioneId,
                bundleId,
                fields,
                sidebarConfig,
                printConfig,
                isDefault,
                isActive
            } = data;

            // Se diventa default, rimuovi default precedente
            if (isDefault && !existing.isDefault) {
                await prisma.visitTemplate.updateMany({
                    where: {
                        medicoId: existing.medicoId,
                        tenantId: existing.tenantId,
                        isDefault: true,
                        deletedAt: null,
                        id: { not: id }
                    },
                    data: { isDefault: false }
                });
            }

            // Incrementa versione se campi modificati
            const newVersion = fields ? existing.version + 1 : existing.version;
            const nextScope = scope || existing.scope || 'PERSONAL';
            const nextMedicoId = nextScope === 'PERSONAL'
                ? (medicoId !== undefined ? (medicoId || null) : existing.medicoId)
                : null;
            const nextPrestazioneId = prestazioneId !== undefined ? (prestazioneId || null) : existing.prestazioneId;
            const nextBundleId = bundleId !== undefined ? (bundleId || null) : existing.bundleId;

            if (nextScope === 'PERSONAL' && !nextMedicoId) {
                throw new Error('medicoId obbligatorio per template personali');
            }
            if (nextScope === 'PRESTAZIONE' && !nextPrestazioneId) {
                throw new Error('prestazioneId obbligatorio per template di tipo PRESTAZIONE');
            }

            const template = await prisma.visitTemplate.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(description !== undefined && { description }),
                    ...(scope !== undefined && { scope: nextScope }),
                    ...(scope !== undefined || medicoId !== undefined ? { medicoId: nextMedicoId } : {}),
                    ...(prestazioneId !== undefined && { prestazioneId: nextPrestazioneId }),
                    ...(bundleId !== undefined && { bundleId: nextBundleId }),
                    ...(fields !== undefined && { fields }),
                    ...(sidebarConfig !== undefined && { sidebarConfig }),
                    ...(printConfig !== undefined && { printConfig }),
                    ...(isDefault !== undefined && { isDefault }),
                    ...(isActive !== undefined && { isActive }),
                    version: newVersion
                },
                include: {
                    medico: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    },
                    bundle: {
                        select: { id: true, nome: true, codice: true }
                    }
                }
            });

            logger.info({
                templateId: id,
                updatedBy,
                version: newVersion
            }, 'Visit template aggiornato');

            return template;
        } catch (error) {
            logger.error({ error: error.message, id }, 'Errore aggiornamento visit template');
            throw error;
        }
    }

    /**
     * Clona un template
     * @param {string} id - ID template da clonare
     * @param {Object} options - Opzioni clonazione
     * @param {string} options.newName - Nome nuovo template
     * @param {string} [options.newMedicoId] - ID medico destinazione (stesso se non specificato)
     * @param {string} [options.newPrestazioneId] - ID prestazione destinazione
     * @param {string} [options.newBundleId] - ID bundle destinazione
     * @param {string} createdBy - ID utente che clona
     * @returns {Promise<Object>} Nuovo template clonato
     */
    static async clone(id, options, createdBy) {
        try {
            // SICUREZZA: il source DEVE essere filtrato per tenant per impedire lettura cross-tenant
            const sourceTenantId = options.targetTenantId;
            const source = await prisma.visitTemplate.findFirst({
                where: { id, deletedAt: null, ...(sourceTenantId ? { tenantId: sourceTenantId } : {}) }
            });

            if (!source) {
                throw new Error('Template sorgente non trovato');
            }

            const {
                newName,
                newMedicoId,
                newPrestazioneId,
                newBundleId,
                targetTenantId
            } = options;

            const cloned = await this.create({
                medicoId: newMedicoId || source.medicoId,
                tenantId: targetTenantId || source.tenantId,
                name: newName || `${source.name} (copia)`,
                description: source.description,
                prestazioneId: newPrestazioneId,
                bundleId: newBundleId,
                fields: source.fields,
                sidebarConfig: source.sidebarConfig,
                printConfig: source.printConfig,
                isDefault: false
            }, createdBy);

            logger.info({
                sourceTemplateId: id,
                clonedTemplateId: cloned.id,
                createdBy
            }, 'Visit template clonato');

            return cloned;
        } catch (error) {
            logger.error({ error: error.message, id }, 'Errore clonazione visit template');
            throw error;
        }
    }

    /**
     * Elimina un template (soft delete)
     * @param {string} id - ID template
     * @param {string} deletedBy - ID utente che elimina
     * @returns {Promise<Object>} Template eliminato
     */
    static async delete(id, deletedBy, tenantId = null) {
        try {
            const existing = await prisma.visitTemplate.findFirst({
                where: { id, deletedAt: null, ...(tenantId ? { tenantId } : {}) }
            });

            if (!existing) {
                throw new Error('Template non trovato');
            }

            const template = await prisma.visitTemplate.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info({
                templateId: id,
                deletedBy
            }, 'Visit template eliminato');

            return template;
        } catch (error) {
            logger.error({ error: error.message, id }, 'Errore eliminazione visit template');
            throw error;
        }
    }

    /**
     * Risolve gerarchicamente il template applicabile per una visita
     * Ordine di priorità: PERSONAL > PRESTAZIONE > GLOBAL
     * 
     * @param {Object} params - Parametri di ricerca
     * @param {string} params.medicoId - ID del medico
     * @param {string} params.tenantId - ID del tenant
     * @param {string} [params.prestazioneId] - ID della prestazione
     * @param {string} [params.bundleId] - ID del bundle
     * @returns {Promise<Object|null>} Template risolto o null
     */
    static async resolveTemplate({ medicoId, tenantId, prestazioneId, bundleId }) {
        try {
            // Deduce effectiveTenantId dalla prestazione/bundle per multi-tenant corretto
            let effectiveTenantId = tenantId;
            if (prestazioneId) {
                const prestazione = await prisma.prestazione.findFirst({
                    where: { id: prestazioneId, tenantId, deletedAt: null }
                });
                if (prestazione) {
                    effectiveTenantId = prestazione.tenantId;
                }
            } else if (bundleId) {
                const bundle = await prisma.offertaBundle.findFirst({
                    where: { id: bundleId, tenantId, deletedAt: null }
                });
                if (bundle) {
                    effectiveTenantId = bundle.tenantId;
                }
            }

            const include = {
                medico: {
                    select: { id: true, firstName: true, lastName: true }
                },
                prestazione: {
                    select: { id: true, nome: true, codice: true }
                },
                bundle: {
                    select: { id: true, nome: true, codice: true }
                }
            };

            // 1. PERSONAL: Template specifico del medico per questa prestazione/bundle
            if (prestazioneId || bundleId) {
                const personalTemplate = await prisma.visitTemplate.findFirst({
                    where: {
                        medicoId,
                        tenantId: effectiveTenantId,
                        scope: 'PERSONAL',
                        ...(prestazioneId && { prestazioneId }),
                        ...(bundleId && { bundleId }),
                        isActive: true,
                        deletedAt: null
                    },
                    include
                });
                if (personalTemplate) {
                    logger.debug({ templateId: personalTemplate.id, scope: 'PERSONAL' }, 'Template PERSONAL risolto');
                    return { ...personalTemplate, resolvedScope: 'PERSONAL' };
                }
            }

            // 2. PERSONAL generico: template del medico valido per tutte le sue prestazioni
            if (medicoId) {
                const personalGenericTemplate = await prisma.visitTemplate.findFirst({
                    where: {
                        medicoId,
                        tenantId: effectiveTenantId,
                        scope: 'PERSONAL',
                        prestazioneId: null,
                        bundleId: null,
                        isActive: true,
                        deletedAt: null
                    },
                    include
                });
                if (personalGenericTemplate) {
                    logger.debug({ templateId: personalGenericTemplate.id, scope: 'PERSONAL' }, 'Template PERSONAL generico risolto');
                    return { ...personalGenericTemplate, resolvedScope: 'PERSONAL' };
                }
            }

            // 3. PRESTAZIONE: Template default per questa prestazione (senza medico specifico)
            if (prestazioneId) {
                const prestazioneTemplate = await prisma.visitTemplate.findFirst({
                    where: {
                        tenantId: effectiveTenantId,
                        scope: 'PRESTAZIONE',
                        prestazioneId,
                        medicoId: null,
                        isActive: true,
                        deletedAt: null
                    },
                    include
                });
                if (prestazioneTemplate) {
                    logger.debug({ templateId: prestazioneTemplate.id, scope: 'PRESTAZIONE' }, 'Template PRESTAZIONE risolto');
                    return { ...prestazioneTemplate, resolvedScope: 'PRESTAZIONE' };
                }
            }

            // 4. Fallback storico: Template default del medico
            const defaultTemplate = await prisma.visitTemplate.findFirst({
                where: {
                    medicoId,
                    tenantId: effectiveTenantId,
                    isDefault: true,
                    isActive: true,
                    deletedAt: null
                },
                include
            });
            if (defaultTemplate) {
                logger.debug({ templateId: defaultTemplate.id, scope: 'DEFAULT' }, 'Template DEFAULT medico risolto');
                return { ...defaultTemplate, resolvedScope: 'DEFAULT' };
            }

            // 5. GLOBAL: ultimo fallback tenant-wide
            const globalTemplate = await prisma.visitTemplate.findFirst({
                where: {
                    tenantId: effectiveTenantId,
                    scope: 'GLOBAL',
                    isActive: true,
                    deletedAt: null
                },
                include
            });
            if (globalTemplate) {
                logger.debug({ templateId: globalTemplate.id, scope: 'GLOBAL' }, 'Template GLOBAL risolto');
                return { ...globalTemplate, resolvedScope: 'GLOBAL' };
            }

            // Nessun template trovato
            logger.warn({ medicoId, tenantId: effectiveTenantId, prestazioneId, bundleId }, 'Nessun template risolto');
            return null;
        } catch (error) {
            logger.error({ error: error.message, medicoId, tenantId, prestazioneId, bundleId }, 'Errore risoluzione template');
            throw error;
        }
    }

    /**
     * Restituisce i campi predefiniti del sistema
     * @returns {Array} Campi predefiniti
     */
    static getDefaultFields() {
        return DEFAULT_VISIT_FIELDS;
    }

    /**
     * Restituisce la configurazione sidebar predefinita
     * @returns {Object} Configurazione sidebar
     */
    static getDefaultSidebarConfig() {
        return DEFAULT_SIDEBAR_CONFIG;
    }

    /**
     * Restituisce la configurazione stampa predefinita
     * @returns {Object} Configurazione stampa
     */
    static getDefaultPrintConfig() {
        return DEFAULT_PRINT_CONFIG;
    }

    /**
     * Restituisce i tipi di campo supportati
     * @returns {Object} Tipi di campo
     */
    static getFieldTypes() {
        return FIELD_TYPES;
    }
}

export default VisitTemplateService;
