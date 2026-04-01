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
    // === P65 MEDICINA DEL LAVORO: Prescrizioni Follow-up ===
    // Campo disabilitato per default; abilitare nel template MDL per sorveglianza sanitaria.
    // Documenta: limitazioni lavorative, DPI prescritti, esami da eseguire alla prossima visita,
    // indicazioni per il datore di lavoro (D.Lgs 81/08 art. 41 c.5-6).
    {
        id: 'prescrizioni_followup',
        name: 'prescrizioniFollowup',
        label: 'Prescrizioni e Indicazioni Follow-up',
        type: 'RICHTEXT',
        section: 'followup',
        position: { row: 1, col: 0 },
        size: { width: 12, height: 4 },
        carryOverFromPrevious: false,
        showChart: false,
        required: false,
        enabled: false,      // disabilitato nei template generali; abilitare per MDL
        hint: 'Limitazioni lavorative, DPI prescritti, esami programmati per la prossima visita, indicazioni per il datore di lavoro (D.Lgs 81/08 art. 41).',
        printOptions: {
            include: 'IF_VALUED',
            showLabel: true,
            showTitle: true,
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
        required: false,
        enabled: false,      // abilitare nei template MDL
        options: [
            { value: 'idoneo', label: 'Idoneo' },
            { value: 'idoneo_prescrizioni', label: 'Idoneo con prescrizioni' },
            { value: 'idoneo_limitazioni', label: 'Idoneo con limitazioni' },
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
            { value: 'uso_dpi_guanti', label: 'Uso obbligatorio DPI: guanti protettivi' },
            { value: 'uso_dpi_scarpe', label: 'Uso obbligatorio DPI: scarpe antinfortunistiche' },
            { value: 'uso_dpi_cuffie', label: 'Uso obbligatorio DPI: cuffie / tappi antirumore' },
            { value: 'uso_dpi_mascherina', label: 'Uso obbligatorio DPI: mascherina FFP2/FFP3' },
            { value: 'uso_dpi_visiera', label: 'Uso obbligatorio DPI: visiera / occhiali protettivi' },
            { value: 'uso_dpi_imbracatura', label: 'Uso obbligatorio DPI: imbracatura di sicurezza' },
            { value: 'divieto_mmc_20', label: 'Divieto movimentazione manuale carichi > 20 kg' },
            { value: 'divieto_mmc_10', label: 'Divieto movimentazione manuale carichi > 10 kg' },
            { value: 'pause_vdt', label: 'Pause obbligatorie VDT: 15 minuti ogni 2 ore' },
            { value: 'limitazione_notturno', label: 'Limitazione turni notturni (max 2 notti/settimana)' },
            { value: 'controllo_oft_annuale', label: 'Controllo oftalmologico annuale (videoterminali)' },
            { value: 'sorveg_rafforzata_semestrale', label: 'Sorveglianza sanitaria rafforzata semestrale' },
            { value: 'formazione_rischio_chimico', label: 'Obbligo formazione specifica rischio chimico' },
            { value: 'formazione_rischio_biologico', label: 'Obbligo formazione specifica rischio biologico' },
            { value: 'evitare_cancerogeni', label: 'Evitare esposizione a sostanze cancerogene / mutagene' },
            { value: 'esposizione_rumore_limitata', label: 'Limitazione esposizione a rumore (< 80 dB)' }
        ],
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
            { value: 'no_lavoro_quota', label: 'Non idoneo a lavori in quota (> 2 m)' },
            { value: 'no_piattaforme_elevabili', label: 'Non idoneo a lavori su piattaforme elevabili / cestelli' },
            { value: 'no_guida_mezzi', label: 'Non idoneo alla conduzione di automezzi / mezzi operativi' },
            { value: 'no_spazi_confinati', label: 'Non idoneo a lavori in spazi confinati' },
            { value: 'limitazione_notturno_mansione', label: 'Limitata idoneità ai turni notturni' },
            { value: 'no_vibrazioni', label: 'Non idoneo a mansioni con esposizione a vibrazioni mano-braccio' },
            { value: 'no_rumore_85db', label: 'Non idoneo a mansioni con esposizione a rumore > 85 dB' },
            { value: 'limitazione_mmc', label: 'Limitata movimentazione manuale di carichi (< 10 kg)' },
            { value: 'no_cancerogeni', label: 'Non idoneo a mansioni con esposizione a cancerogeni / mutageni' },
            { value: 'limitazione_chimici', label: 'Limitata esposizione a sostanze chimiche pericolose' },
            { value: 'no_stress_termico', label: 'Non idoneo a lavori con stress termico (ambiente caldo / freddo)' },
            { value: 'no_vdt_prolungato', label: 'Uso VDT limitato (max 2 ore continuative senza pausa)' }
        ],
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
            { value: 'formazione_entro_30gg', label: 'Formazione obbligatoria per il lavoratore entro 30 giorni' },
            { value: 'adeguamento_postazione', label: 'Adeguamento ergonomico della postazione di lavoro' },
            { value: 'fornitura_dpi', label: 'Fornitura DPI specifici entro 15 giorni' },
            { value: 'aggiornamento_dvr', label: 'Aggiornamento DVR (Documento di Valutazione dei Rischi)' },
            { value: 'notifica_datore_24h', label: 'Notifica al datore di lavoro entro 24 ore' },
            { value: 'visita_controllo_6m', label: 'Visita medica di controllo entro 6 mesi' },
            { value: 'invio_asl', label: 'Comunicazione all\'ASL / organo di vigilanza competente' },
            { value: 'revisione_mansione', label: 'Revisione della mansione / possibile cambio mansione' }
        ],
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
        showChart: false,
        required: false,
        enabled: false,   // abilitare nei template MDL con rischio cardiovascolare
        metadata: { tipoEsame: 'ECG' },
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
        showChart: false,
        required: false,
        enabled: false,   // abilitare nei template MDL con rischio rumore
        metadata: { tipoEsame: 'AUDIOMETRIA' },
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
        showChart: false,
        required: false,
        enabled: false,   // abilitare nei template MDL con rischio polveri/fumi
        metadata: { tipoEsame: 'SPIROMETRIA' },
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

    // Group by section to calculate positions
    const sectionOrder = ['anamnesi', 'vitali', 'esame', 'diagnosi', 'terapia', 'followup'];
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
        sectionFields.sort((a, b) => (a.order || 0) - (b.order || 0));

        let currentRow = 0;

        sectionFields.forEach(field => {
            const width = field.size?.width || getDefaultWidth(field.type);
            const height = field.size?.height || 1;

            // Use existing position or calculate default
            const position = field.position || { row: currentRow, col: 0 };

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
                position,
                size: { width, height },
                ...(normalRange && { normalRange })
            });

            // Only increment row if position was not set (sequential layout)
            if (!field.position) {
                currentRow += height;
            }
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
            // - PERSONAL: medicoId OBBLIGATORIO (template personale del medico)
            // - PRESTAZIONE: medicoId OPZIONALE (null = condiviso per tutti i medici, con id = specifico per medico)
            // - CATALOGO/GLOBAL: medicoId deve essere null
            if (scope === 'PERSONAL' && !medicoId) {
                throw new Error('medicoId obbligatorio per template personali');
            }
            if (scope === 'PRESTAZIONE' && !prestazioneId) {
                throw new Error('prestazioneId obbligatorio per template di tipo PRESTAZIONE');
            }
            if (scope === 'GLOBAL' && medicoId) {
                // Forza medicoId a null per template globali
                data.medicoId = null;
            }

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
            if (medicoId) {
                const medico = await prisma.person.findFirst({
                    where: { id: medicoId, deletedAt: null },
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
            const effectiveMedicoId = medicoId || null;

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
            if (isDefault && medicoId) {
                await prisma.visitTemplate.updateMany({
                    where: {
                        medicoId,
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
                            medicoId: medicoId || null,
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
                        medicoId: medicoId || null,
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

            return template;
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

            return templates;
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
                items: templates,
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
            // STEP 2: Cerca template scope PRESTAZIONE (senza medicoId specifico)
            // ===================================================
            if (prestazioneId) {
                const templatePrestazione = await prisma.visitTemplate.findFirst({
                    where: {
                        prestazioneId,
                        tenantId: effectiveTenantId,
                        scope: 'PRESTAZIONE',
                        isActive: true,
                        deletedAt: null
                    }
                });
                if (templatePrestazione) {
                    logger.debug({ templateId: templatePrestazione.id, scope: 'PRESTAZIONE' }, 'Template prestazione trovato');
                    return templatePrestazione;
                }
            }

            // ===================================================
            // STEP 3: Cerca template specifico per bundle+medico
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
            // STEP 4: Cerca template scope BUNDLE (senza medicoId specifico)
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
            // STEP 5: Cerca template default PERSONALE del medico
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
            // STEP 6: Cerca template GLOBAL del tenant
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
            // STEP 7: Restituisci template sistema (virtuale)
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

            const template = await prisma.visitTemplate.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(description !== undefined && { description }),
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

            // 2. PRESTAZIONE: Template default per questa prestazione (senza medico specifico)
            if (prestazioneId) {
                const prestazioneTemplate = await prisma.visitTemplate.findFirst({
                    where: {
                        tenantId: effectiveTenantId,
                        scope: 'PRESTAZIONE',
                        prestazioneId,
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

            // 3. GLOBAL: Template globale di sistema
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

            // 4. Fallback: Template default del medico (backward compatibility)
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
