/**
 * RischioPrestazioneService - Mapping Rischi → Prestazioni P56
 * 
 * Gestisce l'associazione tra rischi lavorativi e prestazioni sanitarie
 * obbligatorie secondo D.Lgs 81/08. Permette di:
 * - Configurare quali prestazioni sono richieste per ogni rischio
 * - Calcolare automaticamente le prestazioni per un lavoratore
 * - Generare protocolli sanitari basati sui rischi
 * 
 * @module services/clinical/RischioPrestazioneService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';


/**
 * Catalogo prestazioni MDL standard da normativa D.Lgs 81/08
 * Usato per il seed iniziale delle prestazioni sanitarie
 * NOTA: tipo deve essere uno dei valori TipoPrestazione enum:
 *       VISITA_SPECIALISTICA, VISITA_MEDICINA_LAVORO, ESAME_STRUMENTALE, 
 *       ESAME_LABORATORIO, INTERVENTO_AMBULATORIALE, VACCINAZIONE, CERTIFICAZIONE, CONSULENZA
 */
export const CATALOGO_PRESTAZIONI_MDL = {
    // VISITE MEDICHE
    VIS_MDL: { nome: 'Visita Medica del Lavoro', tipo: 'VISITA_MEDICINA_LAVORO', prezzoBase: 50.00, durata: 30, descrizione: 'Visita medica specialistica del lavoro ai sensi D.Lgs 81/08', brancheSpecialistiche: ['Medicina del Lavoro'] },

    // AUDIOMETRIA
    AUD_TON: { nome: 'Audiometria Tonale Liminare', tipo: 'ESAME_STRUMENTALE', prezzoBase: 25.00, durata: 15, descrizione: 'Audiometria tonale liminare per esposizione a rumore', brancheSpecialistiche: ['Medicina del Lavoro', 'Otorinolaringoiatria'] },
    AUD_IMP: { nome: 'Audiometria Impedenzometrica', tipo: 'ESAME_STRUMENTALE', prezzoBase: 30.00, durata: 15, descrizione: 'Audiometria impedenzometrica', brancheSpecialistiche: ['Medicina del Lavoro', 'Otorinolaringoiatria'] },

    // SPIROMETRIA
    SPIRO: { nome: 'Spirometria', tipo: 'ESAME_STRUMENTALE', prezzoBase: 25.00, durata: 15, descrizione: 'Spirometria semplice per valutazione funzionalità respiratoria', brancheSpecialistiche: ['Medicina del Lavoro', 'Pneumologia'] },

    // CARDIOLOGIA
    ECG: { nome: 'Elettrocardiogramma', tipo: 'ESAME_STRUMENTALE', prezzoBase: 25.00, durata: 15, descrizione: 'ECG a riposo a 12 derivazioni', brancheSpecialistiche: ['Medicina del Lavoro', 'Cardiologia'] },

    // ESAMI EMATOCHIMICI
    EMO: { nome: 'Emocromo Completo', tipo: 'ESAME_LABORATORIO', prezzoBase: 8.00, durata: 5, descrizione: 'Emocromo con formula leucocitaria e piastrine', brancheSpecialistiche: ['Medicina del Lavoro', 'Laboratorio Analisi'] },
    FEP: { nome: 'Formula Emocromo e Piastrine', tipo: 'ESAME_LABORATORIO', prezzoBase: 10.00, durata: 5, descrizione: 'Formula leucocitaria estesa con piastrine', brancheSpecialistiche: ['Medicina del Lavoro', 'Laboratorio Analisi'] },
    EPATICI: { nome: 'Pannello Epatico', tipo: 'ESAME_LABORATORIO', prezzoBase: 20.00, durata: 5, descrizione: 'AST, ALT, GGT, bilirubina, fosfatasi alcalina', brancheSpecialistiche: ['Medicina del Lavoro', 'Laboratorio Analisi'] },
    RENALI: { nome: 'Pannello Renale', tipo: 'ESAME_LABORATORIO', prezzoBase: 15.00, durata: 5, descrizione: 'Creatinina, azotemia, acido urico', brancheSpecialistiche: ['Medicina del Lavoro', 'Laboratorio Analisi'] },
    GLUC: { nome: 'Glicemia', tipo: 'ESAME_LABORATORIO', prezzoBase: 5.00, durata: 5, descrizione: 'Dosaggio glicemia', brancheSpecialistiche: ['Medicina del Lavoro', 'Laboratorio Analisi'] },

    // ESAMI SPECIFICI TOSSICOLOGICI
    PIOMB: { nome: 'Piombemia', tipo: 'ESAME_LABORATORIO', prezzoBase: 25.00, durata: 5, descrizione: 'Dosaggio piombo ematico', brancheSpecialistiche: ['Medicina del Lavoro', 'Laboratorio Analisi', 'Tossicologia'] },
    ALA_U: { nome: 'ALA Urinario', tipo: 'ESAME_LABORATORIO', prezzoBase: 20.00, durata: 5, descrizione: 'Acido delta-aminolevulinico urinario per esposizione piombo', brancheSpecialistiche: ['Medicina del Lavoro', 'Laboratorio Analisi', 'Tossicologia'] },
    BIOMAR: { nome: 'Biomarker Tumorali', tipo: 'ESAME_LABORATORIO', prezzoBase: 40.00, durata: 5, descrizione: 'Marcatori tumorali specifici per esposizione cancerogeni', brancheSpecialistiche: ['Medicina del Lavoro', 'Laboratorio Analisi', 'Oncologia'] },

    // ALCOL E DROGHE
    ALCOL: { nome: 'Test Alcol', tipo: 'ESAME_LABORATORIO', prezzoBase: 15.00, durata: 5, descrizione: 'Test per assunzione alcol (GGT, CDT, alcolemia)', brancheSpecialistiche: ['Medicina del Lavoro', 'Tossicologia'] },
    DRUG: { nome: 'Test Sostanze Stupefacenti', tipo: 'ESAME_LABORATORIO', prezzoBase: 35.00, durata: 5, descrizione: 'Screening urinario sostanze psicotrope', brancheSpecialistiche: ['Medicina del Lavoro', 'Tossicologia'] },

    // SIEROLOGIA E VACCINAZIONI
    SIERO: { nome: 'Sierologia Infettiva', tipo: 'ESAME_LABORATORIO', prezzoBase: 30.00, durata: 5, descrizione: 'Marker HBV, HCV, HIV (se consenso)', brancheSpecialistiche: ['Medicina del Lavoro', 'Laboratorio Analisi', 'Infettivologia'] },
    VAX_HBV: { nome: 'Vaccinazione Anti-Epatite B', tipo: 'VACCINAZIONE', prezzoBase: 40.00, durata: 15, descrizione: 'Vaccinazione anti-HBV ciclo completo', brancheSpecialistiche: ['Medicina del Lavoro', 'Vaccinazioni'] },
    VAX_TETANO: { nome: 'Vaccinazione Antitetanica', tipo: 'VACCINAZIONE', prezzoBase: 25.00, durata: 10, descrizione: 'Richiamo vaccinazione antitetanica', brancheSpecialistiche: ['Medicina del Lavoro', 'Vaccinazioni'] },

    // OCULISTICA
    VISIO: { nome: 'Visiotest', tipo: 'ESAME_STRUMENTALE', prezzoBase: 20.00, durata: 10, descrizione: 'Valutazione acuità visiva con visiotest', brancheSpecialistiche: ['Medicina del Lavoro', 'Oculistica'] },

    // NEUROLOGIA/ELETTROMIOGRAFIA
    EMG: { nome: 'Elettromiografia', tipo: 'ESAME_STRUMENTALE', prezzoBase: 80.00, durata: 30, descrizione: 'EMG arti superiori per sindrome tunnel carpale/vibrazioni', brancheSpecialistiche: ['Medicina del Lavoro', 'Neurologia'] },
    ECO_ART: { nome: 'Ecocolordoppler Arti Superiori', tipo: 'ESAME_STRUMENTALE', prezzoBase: 70.00, durata: 30, descrizione: 'Ecocolordoppler arterioso arti superiori', brancheSpecialistiche: ['Medicina del Lavoro', 'Angiologia'] },

    // RADIOLOGIA (usare ESAME_STRUMENTALE dato che ESAME_RADIOLOGICO non esiste nell'enum)
    RX_RACH: { nome: 'Rx Rachide Lombosacrale', tipo: 'ESAME_STRUMENTALE', prezzoBase: 45.00, durata: 15, descrizione: 'Radiografia colonna lombo-sacrale 2 proiezioni', brancheSpecialistiche: ['Medicina del Lavoro', 'Radiologia'] },
    RX_TOR: { nome: 'Rx Torace', tipo: 'ESAME_STRUMENTALE', prezzoBase: 35.00, durata: 15, descrizione: 'Radiografia torace 2 proiezioni', brancheSpecialistiche: ['Medicina del Lavoro', 'Radiologia'] },
    TAC_TOR: { nome: 'TAC Torace HRCT', tipo: 'ESAME_STRUMENTALE', prezzoBase: 150.00, durata: 30, descrizione: 'TAC torace alta risoluzione per patologie interstiziali', brancheSpecialistiche: ['Medicina del Lavoro', 'Radiologia'] },

    // ERGONOMIA
    RACH_CLI: { nome: 'Valutazione Clinica Rachide', tipo: 'VISITA_SPECIALISTICA', prezzoBase: 30.00, durata: 15, descrizione: 'Esame obiettivo rachide per MMC/posture', brancheSpecialistiche: ['Medicina del Lavoro', 'Ortopedia'] },
    OCRA: { nome: 'Valutazione OCRA Check-list', tipo: 'VISITA_SPECIALISTICA', prezzoBase: 35.00, durata: 20, descrizione: 'Valutazione movimenti ripetitivi arti superiori', brancheSpecialistiche: ['Medicina del Lavoro', 'Ergonomia'] },

    // VESTIBOLOGIA
    VEST: { nome: 'Esame Vestibolare', tipo: 'ESAME_STRUMENTALE', prezzoBase: 50.00, durata: 20, descrizione: 'Esame funzione vestibolare per lavori in quota', brancheSpecialistiche: ['Medicina del Lavoro', 'Otorinolaringoiatria'] },

    // TERMOMETRIA
    TERMO: { nome: 'Valutazione Termoregolazione', tipo: 'VISITA_SPECIALISTICA', prezzoBase: 25.00, durata: 15, descrizione: 'Valutazione adattamento microclima severo', brancheSpecialistiche: ['Medicina del Lavoro'] },

    // PSICOLOGIA
    PSICO: { nome: 'Colloquio Psicologico', tipo: 'CONSULENZA', prezzoBase: 60.00, durata: 45, descrizione: 'Valutazione psicologica per stress/idoneità', brancheSpecialistiche: ['Medicina del Lavoro', 'Psicologia'] }
};

/**
 * Mapping di default rischi → prestazioni (D.Lgs 81/08)
 * Questo viene usato per il seed iniziale
 */
export const DEFAULT_RISCHIO_PRESTAZIONI = {
    // RISCHI FISICI
    RUM: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 196' },
        { codice: 'AUD_TON', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 196' },
        { codice: 'AUD_IMP', periodicita: 'MESI_24', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 196' }
    ],
    VIB_MB: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 204' },
        { codice: 'EMG', periodicita: 'MESI_24', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 204' },
        { codice: 'ECO_ART', periodicita: 'MESI_24', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 204' }
    ],
    VIB_WBV: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 204' },
        { codice: 'RX_RACH', periodicita: 'MESI_36', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 204' }
    ],
    RAD_ION: [
        { codice: 'VIS_MDL', periodicita: 'MESI_6', obbligatoria: true, riferimentoNormativo: 'D.Lgs 101/2020' },
        { codice: 'EMO', periodicita: 'MESI_6', obbligatoria: true, riferimentoNormativo: 'D.Lgs 101/2020' },
        { codice: 'FEP', periodicita: 'MESI_6', obbligatoria: true, riferimentoNormativo: 'D.Lgs 101/2020' }
    ],
    RAD_NIR: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 216' },
        { codice: 'VISIO', periodicita: 'MESI_24', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 216' }
    ],
    CEM: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 211' },
        { codice: 'ECG', periodicita: 'MESI_24', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 211' }
    ],
    MIC: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 180-185' },
        { codice: 'TERMO', periodicita: 'MESI_12', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 180-185' }
    ],

    // RISCHI CHIMICI
    CHI: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 229' },
        { codice: 'SPIRO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 229' },
        { codice: 'EMO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 229' },
        { codice: 'EPATICI', periodicita: 'MESI_12', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 229' },
        { codice: 'RENALI', periodicita: 'MESI_12', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 229' }
    ],
    CAN: [
        { codice: 'VIS_MDL', periodicita: 'MESI_6', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 242' },
        { codice: 'EMO', periodicita: 'MESI_6', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 242' },
        { codice: 'FEP', periodicita: 'MESI_6', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 242' },
        { codice: 'RX_TOR', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 242' },
        { codice: 'BIOMAR', periodicita: 'MESI_6', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 242' }
    ],
    AMI: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 254' },
        { codice: 'SPIRO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 254' },
        { codice: 'RX_TOR', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 254' },
        { codice: 'TAC_TOR', periodicita: 'MESI_36', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 254' }
    ],
    PIO: [
        { codice: 'VIS_MDL', periodicita: 'MESI_6', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Allegato XXXVIII' },
        { codice: 'EMO', periodicita: 'MESI_6', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Allegato XXXVIII' },
        { codice: 'PIOMB', periodicita: 'MESI_6', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Allegato XXXVIII' },
        { codice: 'ALA_U', periodicita: 'MESI_6', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Allegato XXXVIII' }
    ],

    // RISCHI BIOLOGICI
    BIO: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 279' },
        { codice: 'EMO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 279' },
        { codice: 'SIERO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 279' },
        { codice: 'VAX_HBV', periodicita: 'UNA_TANTUM', obbligatoria: true, soloPreventiva: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 279' },
        { codice: 'VAX_TETANO', periodicita: 'MESI_60', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 279' }
    ],

    // RISCHI ERGONOMICI
    MMC: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 168' },
        { codice: 'RACH_CLI', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 168' },
        { codice: 'RX_RACH', periodicita: 'MESI_36', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 168' }
    ],
    MOV_RIP: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 168' },
        { codice: 'OCRA', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 168' },
        { codice: 'EMG', periodicita: 'MESI_24', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 168' }
    ],
    POS: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 168' },
        { codice: 'RACH_CLI', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 168' }
    ],

    // RISCHI ORGANIZZATIVI
    NOT: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 66/2003' },
        { codice: 'ECG', periodicita: 'MESI_24', obbligatoria: true, riferimentoNormativo: 'D.Lgs 66/2003' },
        { codice: 'EMO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 66/2003' },
        { codice: 'GLUC', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 66/2003' },
        { codice: 'PSICO', periodicita: 'MESI_24', obbligatoria: false, riferimentoNormativo: 'D.Lgs 66/2003' }
    ],
    VDT: [
        { codice: 'VIS_MDL', periodicita: 'MESI_24', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 176' },
        { codice: 'VISIO', periodicita: 'MESI_24', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 176' }
    ],
    SLC: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 28' },
        { codice: 'PSICO', periodicita: 'MESI_12', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 28' }
    ],

    // RISCHI SPECIFICI
    QUO: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 111' },
        { codice: 'ECG', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 111' },
        { codice: 'VISIO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 111' },
        { codice: 'VEST', periodicita: 'MESI_24', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 111' }
    ],
    SPA_CON: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'DPR 177/2011' },
        { codice: 'ECG', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'DPR 177/2011' },
        { codice: 'SPIRO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'DPR 177/2011' },
        { codice: 'PSICO', periodicita: 'MESI_24', obbligatoria: false, riferimentoNormativo: 'DPR 177/2011' }
    ],
    GUI_MEZ: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' },
        { codice: 'VISIO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' },
        { codice: 'AUD_TON', periodicita: 'MESI_24', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' },
        { codice: 'ALCOL', periodicita: 'SU_INDICAZIONE', obbligatoria: false, riferimentoNormativo: 'Provv. 16/03/2006' },
        { codice: 'DRUG', periodicita: 'SU_INDICAZIONE', obbligatoria: false, riferimentoNormativo: 'Provv. 30/10/2007' }
    ],

    // RISCHI SETTORIALI
    CAR_ELE: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' },
        { codice: 'VISIO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' },
        { codice: 'AUD_TON', periodicita: 'MESI_24', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 196' }
    ],
    ELE: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 82' },
        { codice: 'ECG', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 82' }
    ],
    INC: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'DM 10/03/1998' },
        { codice: 'ECG', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'DM 10/03/1998' },
        { codice: 'SPIRO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'DM 10/03/1998' }
    ],
    ISO: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' },
        { codice: 'ECG', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' },
        { codice: 'PSICO', periodicita: 'MESI_24', obbligatoria: false, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' }
    ],
    IPE: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' },
        { codice: 'ECG', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' },
        { codice: 'SPIRO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' },
        { codice: 'VISIO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 41' }
    ],
    POL: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 229' },
        { codice: 'SPIRO', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 229' },
        { codice: 'RX_TOR', periodicita: 'MESI_24', obbligatoria: true, riferimentoNormativo: 'D.Lgs 81/08 Art. 229' }
    ],
    ALC: [
        { codice: 'VIS_MDL', periodicita: 'MESI_12', obbligatoria: true, riferimentoNormativo: 'Provv. 16/03/2006' },
        { codice: 'ALCOL', periodicita: 'SU_INDICAZIONE', obbligatoria: true, riferimentoNormativo: 'Provv. 16/03/2006' },
        { codice: 'DRUG', periodicita: 'SU_INDICAZIONE', obbligatoria: false, riferimentoNormativo: 'Provv. 30/10/2007' }
    ]
};

/**
 * Service per gestione mapping rischio → prestazioni
 */
const RischioPrestazioneService = {
    /**
     * Crea un mapping rischio → prestazione
     * @param {Object} data - Dati mapping
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Mapping creato
     */
    async create(data, tenantId) {
        const mapping = await prisma.rischioPrestazione.create({
            data: {
                ...data,
                tenantId
            },
            include: {
                prestazione: { select: { id: true, codice: true, nome: true } }
            }
        });

        logger.info({
            codiceRischio: data.codiceRischio,
            prestazioneId: data.prestazioneId,
            tenantId
        }, 'Mapping rischio-prestazione creato');

        return mapping;
    },

    /**
     * Trova tutti i mapping per un tenant
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni filtro
     * @returns {Promise<Array>} Lista mapping
     */
    async findAll(tenantId, options = {}) {
        const { codiceRischio, categoria } = options;

        // Se ci sono filtri per categoria, dobbiamo filtrare manualmente
        const where = {
            tenantId,
            deletedAt: null,
            ...(codiceRischio && { codiceRischio })
        };

        const mappings = await prisma.rischioPrestazione.findMany({
            where,
            orderBy: [
                { codiceRischio: 'asc' },
                { priorita: 'asc' }
            ],
            include: {
                prestazione: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true,
                        tipo: true,
                        durataPrevista: true
                    }
                }
            }
        });

        return mappings;
    },

    /**
     * Trova mapping per un rischio specifico
     * @param {string} codiceRischio - Codice rischio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Lista prestazioni per il rischio
     */
    async findByRischio(codiceRischio, tenantId) {
        return prisma.rischioPrestazione.findMany({
            where: {
                codiceRischio,
                tenantId,
                deletedAt: null
            },
            orderBy: { priorita: 'asc' },
            include: {
                prestazione: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true,
                        tipo: true,
                        durataPrevista: true,
                        prezzoBase: true
                    }
                }
            }
        });
    },

    /**
     * Aggiorna un mapping
     * @param {string} id - ID mapping
     * @param {Object} data - Dati da aggiornare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Mapping aggiornato
     */
    async update(id, data, tenantId) {
        return prisma.rischioPrestazione.update({
            where: { id },
            data,
            include: {
                prestazione: { select: { id: true, codice: true, nome: true } }
            }
        });
    },

    /**
     * Elimina un mapping (soft delete)
     * @param {string} id - ID mapping
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Mapping eliminato
     */
    async delete(id, tenantId) {
        return prisma.rischioPrestazione.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    },

    /**
     * Calcola le prestazioni necessarie per un lavoratore basandosi sui suoi rischi
     * @param {string} personId - ID lavoratore
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni { tipoVisita: 'PREVENTIVA'|'PERIODICA' }
     * @returns {Promise<Array>} Lista prestazioni richieste
     */
    async calculateRequiredPrestazioni(personId, tenantId, options = {}) {
        const { tipoVisita = 'PERIODICA' } = options;
        const isPreventiva = tipoVisita === 'PREVENTIVA' || tipoVisita === 'PREVENTIVA_PREASSUNTIVA';

        // 1. Ottieni tutti i rischi del lavoratore dalle sue mansioni
        const workerAssignments = await prisma.lavoratoreMansione.findMany({
            where: {
                personId,
                tenantId,
                isAttiva: true,
                deletedAt: null
            },
            include: {
                mansione: {
                    include: {
                        rischiAssociati: { where: { deletedAt: null } }
                    }
                }
            }
        });

        // 2. Raccogli tutti i codici rischio unici
        const rischiCodici = new Set();
        for (const assignment of workerAssignments) {
            for (const rischio of assignment.mansione.rischiAssociati) {
                rischiCodici.add(rischio.codiceRischio);
            }
        }

        if (rischiCodici.size === 0) {
            // Se non ci sono rischi, solo visita base
            return [];
        }

        // 3. Ottieni tutti i mapping per questi rischi
        const mappings = await prisma.rischioPrestazione.findMany({
            where: {
                tenantId,
                codiceRischio: { in: Array.from(rischiCodici) },
                deletedAt: null,
                // Filtra in base al tipo di visita
                ...(isPreventiva ? {} : { soloVisitaPreventiva: false }),
                ...(!isPreventiva ? {} : { soloVisitaPeriodica: false })
            },
            include: {
                prestazione: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true,
                        tipo: true,
                        durataPrevista: true,
                        prezzoBase: true
                    }
                }
            }
        });

        // 4. Raggruppa prestazioni uniche con periodicità minima
        const prestazioniMap = new Map();
        const periodicitaOrder = {
            'MESI_6': 6,
            'MESI_12': 12,
            'MESI_24': 24,
            'MESI_36': 36,
            'MESI_60': 60,
            'SU_INDICAZIONE': 999,
            'UNA_TANTUM': 0
        };

        for (const mapping of mappings) {
            const prestazioneId = mapping.prestazioneId;
            const existing = prestazioniMap.get(prestazioneId);

            const currentPeriod = mapping.periodicitaCustomMesi ||
                (periodicitaOrder[mapping.periodicita] || 12);

            if (!existing || currentPeriod < existing.periodicitaMesi) {
                prestazioniMap.set(prestazioneId, {
                    prestazione: mapping.prestazione,
                    periodicita: mapping.periodicita,
                    periodicitaMesi: currentPeriod,
                    rischiAssociati: [mapping.codiceRischio],
                    obbligatoria: existing?.obbligatoria || !mapping.soloVisitaPeriodica
                });
            } else {
                // Aggiungi il rischio alla lista se la prestazione è già presente
                if (!existing.rischiAssociati.includes(mapping.codiceRischio)) {
                    existing.rischiAssociati.push(mapping.codiceRischio);
                }
            }
        }

        // 5. Converti in array e ordina
        return Array.from(prestazioniMap.values())
            .sort((a, b) => {
                // Prima le obbligatorie, poi per priorità periodicità
                if (a.obbligatoria !== b.obbligatoria) {
                    return a.obbligatoria ? -1 : 1;
                }
                return a.periodicitaMesi - b.periodicitaMesi;
            });
    },

    /**
     * Seed dei mapping di default da normativa
     * STEP 1: Crea le prestazioni dal catalogo se non esistono
     * STEP 2: Crea i mapping rischio-prestazione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Risultato seed
     */
    async seedDefaults(tenantId) {
        const results = {
            prestazioni: { created: 0, skipped: 0 },
            mappings: { created: 0, skipped: 0 },
            errors: []
        };

        // STEP 1: Crea le prestazioni dal catalogo
        logger.info({ tenantId }, 'Seed STEP 1: Creazione prestazioni MDL da catalogo');

        for (const [codice, info] of Object.entries(CATALOGO_PRESTAZIONI_MDL)) {
            try {
                // Verifica se esiste già
                const existing = await prisma.prestazione.findFirst({
                    where: { codice, tenantId, deletedAt: null }
                });

                if (existing) {
                    results.prestazioni.skipped++;
                    continue;
                }

                // Crea la prestazione con brancheSpecialistiche per MDL
                await prisma.prestazione.create({
                    data: {
                        codice,
                        nome: info.nome,
                        tipo: info.tipo,
                        prezzoBase: info.prezzoBase,
                        durataPrevista: info.durata,
                        descrizione: info.descrizione,
                        brancheSpecialistiche: info.brancheSpecialistiche || ['Medicina del Lavoro'],
                        attivo: true,
                        tenantId
                    }
                });
                results.prestazioni.created++;
            } catch (error) {
                results.errors.push(`Errore creazione prestazione ${codice}`);
            }
        }

        logger.info({
            tenantId,
            prestazioniCreate: results.prestazioni.created,
            prestazioniSkipped: results.prestazioni.skipped
        }, 'Seed STEP 1 completato: prestazioni create');

        // STEP 2: Crea i mapping rischio-prestazione
        logger.info({ tenantId }, 'Seed STEP 2: Creazione mapping rischio-prestazioni');

        for (const [codiceRischio, prestazioni] of Object.entries(DEFAULT_RISCHIO_PRESTAZIONI)) {
            for (const p of prestazioni) {
                try {
                    // Trova la prestazione per codice
                    const prestazione = await prisma.prestazione.findFirst({
                        where: { codice: p.codice, tenantId, deletedAt: null }
                    });

                    if (!prestazione) {
                        results.mappings.skipped++;
                        results.errors.push(`Prestazione ${p.codice} non trovata per rischio ${codiceRischio}`);
                        continue;
                    }

                    // Verifica se esiste già il mapping
                    const existingMapping = await prisma.rischioPrestazione.findFirst({
                        where: {
                            tenantId,
                            codiceRischio,
                            prestazioneId: prestazione.id,
                            deletedAt: null
                        }
                    });

                    if (existingMapping) {
                        results.mappings.skipped++;
                        continue;
                    }

                    // Crea il mapping
                    await prisma.rischioPrestazione.create({
                        data: {
                            codiceRischio,
                            prestazioneId: prestazione.id,
                            tenantId,
                            periodicita: p.periodicita,
                            obbligatoria: p.obbligatoria ?? true,
                            riferimentoNormativo: p.riferimentoNormativo || null,
                            soloVisitaPreventiva: p.soloPreventiva || false,
                            soloVisitaPeriodica: p.soloPeriodica || false,
                            priorita: p.obbligatoria ? 10 : 50
                        }
                    });
                    results.mappings.created++;
                } catch (error) {
                    results.errors.push(`Errore mapping ${codiceRischio}-${p.codice}`);
                }
            }
        }

        logger.info({
            tenantId,
            prestazioniCreate: results.prestazioni.created,
            mappingsCreati: results.mappings.created,
            errorsCount: results.errors.length
        }, 'Seed mapping rischio-prestazioni completato');

        return {
            success: true,
            prestazioni: results.prestazioni,
            mappings: results.mappings,
            errors: results.errors.length > 0 ? results.errors : undefined,
            summary: `Create ${results.prestazioni.created} prestazioni e ${results.mappings.created} mapping`
        };
    },

    /**
     * Ottiene statistiche sui mapping configurati
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Statistiche
     */
    async getStats(tenantId) {
        const mappings = await prisma.rischioPrestazione.groupBy({
            by: ['codiceRischio'],
            where: { tenantId, deletedAt: null },
            _count: { id: true }
        });

        const totalMappings = await prisma.rischioPrestazione.count({
            where: { tenantId, deletedAt: null }
        });

        const rischiConfigurati = mappings.length;
        const rischiTotali = Object.keys(DEFAULT_RISCHIO_PRESTAZIONI).length;

        return {
            totalMappings,
            rischiConfigurati,
            rischiTotali,
            completezza: ((rischiConfigurati / rischiTotali) * 100).toFixed(1),
            dettaglioPerRischio: mappings.reduce((acc, m) => {
                acc[m.codiceRischio] = m._count.id;
                return acc;
            }, {})
        };
    }
};

export default RischioPrestazioneService;
