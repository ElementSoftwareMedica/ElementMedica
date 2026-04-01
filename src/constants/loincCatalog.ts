/**
 * P65 - Catalogo Codici LOINC per Template Visita
 * 
 * Codici LOINC standard per mappatura campi visita → export CDA/FSE 2.0
 * I medici possono selezionare questi codici per i loro campi personalizzati
 * per garantire compatibilità con il Fascicolo Sanitario Elettronico.
 * 
 * @module constants/loincCatalog
 * @project P65 - FSE Integration Predisposition
 */

/**
 * Sezione CDA di appartenenza per raggruppamento visivo
 */
export type CDASection =
    | 'ANAMNESI'
    | 'ESAME_OBIETTIVO'
    | 'DIAGNOSI'
    | 'TERAPIA'
    | 'PRESCRIZIONI'
    | 'ALLERGIE'
    | 'CONCLUSIONI'
    | 'ESAMI_LABORATORIO'
    | 'ESAMI_RADIOLOGIA';

/**
 * Sistema di codifica
 */
export type CodeSystem = 'LOINC' | 'ICD10' | 'ICD9_CM' | 'SNOMED_CT' | 'ATC';

/**
 * Entry del catalogo LOINC
 */
export interface LOINCEntry {
    /** Codice LOINC */
    code: string;
    /** Nome visualizzato (italiano) */
    displayName: string;
    /** Descrizione estesa (tooltip) */
    description?: string;
    /** Sezione CDA di appartenenza */
    section: CDASection;
    /** Sistema di codifica (default LOINC) */
    codeSystem?: CodeSystem;
    /** Unità di misura tipica (opzionale) */
    unit?: string;
    /** Categoria per raggruppamento UI */
    category: string;
    /** Parole chiave per ricerca */
    keywords?: string[];
}

// ============================================
// SEZIONI CDA - Metadati
// ============================================

export const CDA_SECTIONS: Record<CDASection, { label: string; icon: string; color: string }> = {
    ANAMNESI: {
        label: 'Anamnesi',
        icon: '📋',
        color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    ESAME_OBIETTIVO: {
        label: 'Esame Obiettivo',
        icon: '🩺',
        color: 'bg-green-50 text-green-700 border-green-200'
    },
    DIAGNOSI: {
        label: 'Diagnosi',
        icon: '🔬',
        color: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    TERAPIA: {
        label: 'Terapia',
        icon: '💊',
        color: 'bg-orange-50 text-orange-700 border-orange-200'
    },
    PRESCRIZIONI: {
        label: 'Prescrizioni',
        icon: '📝',
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    },
    ALLERGIE: {
        label: 'Allergie',
        icon: '⚠️',
        color: 'bg-red-50 text-red-700 border-red-200'
    },
    CONCLUSIONI: {
        label: 'Conclusioni',
        icon: '✅',
        color: 'bg-teal-50 text-teal-700 border-teal-200'
    },
    ESAMI_LABORATORIO: {
        label: 'Esami di Laboratorio',
        icon: '🧪',
        color: 'bg-cyan-50 text-cyan-700 border-cyan-200'
    },
    ESAMI_RADIOLOGIA: {
        label: 'Esami Radiologici',
        icon: '📷',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    }
};

// ============================================
// CATALOGO LOINC - MEDICINA DEL LAVORO
// ============================================

export const LOINC_CATALOG: LOINCEntry[] = [
    // ========== ANAMNESI ==========
    {
        code: '10164-2',
        displayName: 'Anamnesi Patologica Prossima',
        description: 'Storia della malattia attuale - History of Present Illness',
        section: 'ANAMNESI',
        category: 'Anamnesi Generale',
        keywords: ['storia', 'malattia', 'attuale', 'presente']
    },
    {
        code: '11348-0',
        displayName: 'Anamnesi Patologica Remota',
        description: 'Storia medica pregressa - Past Medical History',
        section: 'ANAMNESI',
        category: 'Anamnesi Generale',
        keywords: ['storia', 'passato', 'pregressa', 'remota']
    },
    {
        code: '10157-6',
        displayName: 'Anamnesi Familiare',
        description: 'Storia familiare - Family History',
        section: 'ANAMNESI',
        category: 'Anamnesi Generale',
        keywords: ['famiglia', 'familiare', 'ereditarietà']
    },
    {
        code: '29762-2',
        displayName: 'Anamnesi Sociale/Lavorativa',
        description: 'Storia sociale e occupazionale - Social History',
        section: 'ANAMNESI',
        category: 'Anamnesi Lavorativa',
        keywords: ['lavoro', 'occupazione', 'sociale', 'professionale']
    },
    {
        code: '67796-3',
        displayName: 'Esposizione Professionale',
        description: 'Storia di esposizioni lavorative a rischi',
        section: 'ANAMNESI',
        category: 'Anamnesi Lavorativa',
        keywords: ['esposizione', 'rischio', 'lavorativo', 'agenti']
    },
    {
        code: '11369-6',
        displayName: 'Vaccinazioni',
        description: 'Stato vaccinale - Immunization History',
        section: 'ANAMNESI',
        category: 'Anamnesi Generale',
        keywords: ['vaccino', 'vaccinazione', 'immunizzazione']
    },
    {
        code: '72166-2',
        displayName: 'Abitudine al Fumo',
        description: 'Stato tabagismo - Tobacco smoking status',
        section: 'ANAMNESI',
        category: 'Stili di Vita',
        keywords: ['fumo', 'tabacco', 'sigarette', 'tabagismo']
    },
    {
        code: '74013-4',
        displayName: 'Consumo di Alcol',
        description: 'Pattern consumo alcolici - Alcoholic drinks per day',
        section: 'ANAMNESI',
        category: 'Stili di Vita',
        keywords: ['alcol', 'alcolici', 'bevande']
    },

    // ========== ESAME OBIETTIVO ==========
    {
        code: '29545-1',
        displayName: 'Esame Obiettivo Generale',
        description: 'Riscontri fisici generali - Physical Findings',
        section: 'ESAME_OBIETTIVO',
        category: 'Esame Generale',
        keywords: ['generale', 'fisico', 'obiettivo']
    },
    {
        code: '10195-3',
        displayName: 'Condizioni Generali',
        description: 'Stato generale del paziente',
        section: 'ESAME_OBIETTIVO',
        category: 'Esame Generale',
        keywords: ['condizioni', 'stato', 'generale']
    },
    {
        code: '8302-2',
        displayName: 'Altezza',
        description: 'Altezza corporea in cm',
        section: 'ESAME_OBIETTIVO',
        category: 'Parametri Antropometrici',
        unit: 'cm',
        keywords: ['altezza', 'statura', 'height']
    },
    {
        code: '29463-7',
        displayName: 'Peso Corporeo',
        description: 'Peso in kg',
        section: 'ESAME_OBIETTIVO',
        category: 'Parametri Antropometrici',
        unit: 'kg',
        keywords: ['peso', 'weight', 'massa']
    },
    {
        code: '39156-5',
        displayName: 'Indice di Massa Corporea (BMI)',
        description: 'Body Mass Index',
        section: 'ESAME_OBIETTIVO',
        category: 'Parametri Antropometrici',
        unit: 'kg/m2',
        keywords: ['bmi', 'indice', 'massa', 'corporea']
    },
    {
        code: '8480-6',
        displayName: 'Pressione Sistolica',
        description: 'Pressione arteriosa sistolica',
        section: 'ESAME_OBIETTIVO',
        category: 'Parametri Vitali',
        unit: 'mmHg',
        keywords: ['pressione', 'sistolica', 'massima']
    },
    {
        code: '8462-4',
        displayName: 'Pressione Diastolica',
        description: 'Pressione arteriosa diastolica',
        section: 'ESAME_OBIETTIVO',
        category: 'Parametri Vitali',
        unit: 'mmHg',
        keywords: ['pressione', 'diastolica', 'minima']
    },
    {
        code: '8867-4',
        displayName: 'Frequenza Cardiaca',
        description: 'Battiti al minuto',
        section: 'ESAME_OBIETTIVO',
        category: 'Parametri Vitali',
        unit: 'bpm',
        keywords: ['frequenza', 'cardiaca', 'polso', 'battiti']
    },
    {
        code: '9279-1',
        displayName: 'Frequenza Respiratoria',
        description: 'Atti respiratori al minuto',
        section: 'ESAME_OBIETTIVO',
        category: 'Parametri Vitali',
        unit: '/min',
        keywords: ['frequenza', 'respiratoria', 'respiro']
    },
    {
        code: '8310-5',
        displayName: 'Temperatura Corporea',
        description: 'Temperatura in °C',
        section: 'ESAME_OBIETTIVO',
        category: 'Parametri Vitali',
        unit: '°C',
        keywords: ['temperatura', 'febbre']
    },
    {
        code: '2708-6',
        displayName: 'Saturazione O2',
        description: 'Saturazione ossigeno arterioso',
        section: 'ESAME_OBIETTIVO',
        category: 'Parametri Vitali',
        unit: '%',
        keywords: ['saturazione', 'ossigeno', 'spo2']
    },

    // === Esami Obiettivi Specifici ===
    {
        code: '10223-6',
        displayName: 'Esame Obiettivo Cardiologico',
        description: 'Esame del cuore e apparato cardiovascolare',
        section: 'ESAME_OBIETTIVO',
        category: 'Esami Specialistici',
        keywords: ['cuore', 'cardiaco', 'cardiovascolare']
    },
    {
        code: '10210-3',
        displayName: 'Esame Obiettivo Toracico',
        description: 'Esame del torace e apparato respiratorio',
        section: 'ESAME_OBIETTIVO',
        category: 'Esami Specialistici',
        keywords: ['torace', 'polmoni', 'respiratorio', 'toracico']
    },
    {
        code: '10199-8',
        displayName: 'Esame Obiettivo Addominale',
        description: 'Esame dell\'addome',
        section: 'ESAME_OBIETTIVO',
        category: 'Esami Specialistici',
        keywords: ['addome', 'addominale', 'pancia']
    },
    {
        code: '10205-3',
        displayName: 'Esame Obiettivo Neurologico',
        description: 'Esame sistema nervoso',
        section: 'ESAME_OBIETTIVO',
        category: 'Esami Specialistici',
        keywords: ['neuro', 'neurologico', 'nervoso']
    },
    {
        code: '32434-0',
        displayName: 'Esame Obiettivo Muscolo-scheletrico',
        description: 'Esame apparato locomotore',
        section: 'ESAME_OBIETTIVO',
        category: 'Esami Specialistici',
        keywords: ['muscolo', 'scheletrico', 'articolazioni', 'ossa']
    },
    {
        code: '10217-8',
        displayName: 'Esame Obiettivo Cutaneo',
        description: 'Esame della cute',
        section: 'ESAME_OBIETTIVO',
        category: 'Esami Specialistici',
        keywords: ['cute', 'pelle', 'dermatologico']
    },
    {
        code: '10222-8',
        displayName: 'Esame Obiettivo Oculistico',
        description: 'Esame degli occhi',
        section: 'ESAME_OBIETTIVO',
        category: 'Esami Specialistici',
        keywords: ['occhi', 'vista', 'oculistico', 'visivo']
    },
    {
        code: '32437-3',
        displayName: 'Esame Obiettivo ORL',
        description: 'Esame orecchio-naso-gola',
        section: 'ESAME_OBIETTIVO',
        category: 'Esami Specialistici',
        keywords: ['orecchio', 'naso', 'gola', 'orl', 'otorinolaringoiatrico']
    },

    // ========== DIAGNOSI ==========
    {
        code: '29548-5',
        displayName: 'Diagnosi',
        description: 'Diagnosi principale',
        section: 'DIAGNOSI',
        category: 'Diagnosi',
        keywords: ['diagnosi', 'diagnosi principale']
    },
    {
        code: '29308-4',
        displayName: 'Diagnosi Differenziale',
        description: 'Possibili diagnosi alternative',
        section: 'DIAGNOSI',
        category: 'Diagnosi',
        keywords: ['diagnosi', 'differenziale', 'alternative']
    },
    {
        code: '46240-8',
        displayName: 'Diagnosi Lavorativa',
        description: 'Diagnosi correlata all\'attività lavorativa',
        section: 'DIAGNOSI',
        category: 'Diagnosi MDL',
        keywords: ['diagnosi', 'lavoro', 'professionale', 'occupazionale']
    },

    // ========== TERAPIA ==========
    {
        code: '10160-0',
        displayName: 'Terapia in Corso',
        description: 'Farmaci attualmente assunti',
        section: 'TERAPIA',
        category: 'Terapia Farmacologica',
        keywords: ['terapia', 'farmaci', 'medicinali']
    },
    {
        code: '18776-5',
        displayName: 'Piano Terapeutico',
        description: 'Piano di trattamento',
        section: 'TERAPIA',
        category: 'Piano di Cura',
        keywords: ['piano', 'trattamento', 'cura']
    },
    {
        code: '69730-0',
        displayName: 'Raccomandazioni Terapeutiche',
        description: 'Indicazioni e raccomandazioni per il paziente',
        section: 'TERAPIA',
        category: 'Piano di Cura',
        keywords: ['raccomandazioni', 'indicazioni', 'consigli']
    },

    // ========== PRESCRIZIONI ==========
    {
        code: '57828-6',
        displayName: 'Prescrizioni',
        description: 'Prescrizioni mediche',
        section: 'PRESCRIZIONI',
        category: 'Prescrizioni',
        keywords: ['prescrizioni', 'ricetta']
    },
    {
        code: '77599-9',
        displayName: 'Esami Richiesti',
        description: 'Esami di laboratorio/strumentali richiesti',
        section: 'PRESCRIZIONI',
        category: 'Richieste Esami',
        keywords: ['esami', 'richiesti', 'laboratorio']
    },

    // ========== ALLERGIE ==========
    {
        code: '48765-2',
        displayName: 'Allergie e Reazioni Avverse',
        description: 'Allergie note e reazioni avverse ai farmaci',
        section: 'ALLERGIE',
        category: 'Allergie',
        keywords: ['allergie', 'reazioni', 'avverse', 'intolleranze']
    },
    {
        code: '52473-6',
        displayName: 'Allergie Farmacologiche',
        description: 'Allergie specifiche ai farmaci',
        section: 'ALLERGIE',
        category: 'Allergie',
        keywords: ['allergie', 'farmaci', 'medicinali']
    },

    // ========== CONCLUSIONI ==========
    {
        code: '55110-1',
        displayName: 'Conclusioni',
        description: 'Conclusioni della visita',
        section: 'CONCLUSIONI',
        category: 'Conclusioni',
        keywords: ['conclusioni', 'referto', 'esito']
    },
    {
        code: '51848-0',
        displayName: 'Note Cliniche',
        description: 'Note e osservazioni cliniche',
        section: 'CONCLUSIONI',
        category: 'Note',
        keywords: ['note', 'osservazioni', 'cliniche']
    },

    // ========== MDL SPECIFICI ==========
    {
        code: '11323-3',
        displayName: 'Giudizio di Idoneità',
        description: 'Esito valutazione idoneità alla mansione',
        section: 'CONCLUSIONI',
        category: 'Medicina del Lavoro',
        keywords: ['idoneità', 'mansione', 'giudizio', 'mdl']
    },
    {
        code: '73985-4',
        displayName: 'Prescrizioni Idoneità',
        description: 'Prescrizioni associate al giudizio di idoneità',
        section: 'CONCLUSIONI',
        category: 'Medicina del Lavoro',
        keywords: ['prescrizioni', 'idoneità', 'limitazioni']
    },
    {
        code: '73986-2',
        displayName: 'Limitazioni Idoneità',
        description: 'Limitazioni alla mansione',
        section: 'CONCLUSIONI',
        category: 'Medicina del Lavoro',
        keywords: ['limitazioni', 'restrizioni', 'mansione']
    },
    {
        code: '82590-1',
        displayName: 'Prossimo Controllo',
        description: 'Data prossima visita di controllo',
        section: 'CONCLUSIONI',
        category: 'Follow-up',
        keywords: ['controllo', 'follow-up', 'prossima', 'visita']
    },

    // ========== ESAMI LABORATORIO ==========
    {
        code: '26436-6',
        displayName: 'Esami di Laboratorio',
        description: 'Risultati esami di laboratorio',
        section: 'ESAMI_LABORATORIO',
        category: 'Laboratorio',
        keywords: ['laboratorio', 'esami', 'analisi']
    },
    {
        code: '58410-2',
        displayName: 'Emocromo',
        description: 'Esame emocromocitometrico completo',
        section: 'ESAMI_LABORATORIO',
        category: 'Laboratorio',
        keywords: ['emocromo', 'sangue', 'cbc']
    },
    {
        code: '24323-8',
        displayName: 'Esame Urine',
        description: 'Esame delle urine',
        section: 'ESAMI_LABORATORIO',
        category: 'Laboratorio',
        keywords: ['urine', 'urina', 'esame']
    },

    // ========== ESAMI RADIOLOGIA ==========
    {
        code: '18726-0',
        displayName: 'Esami Radiologici',
        description: 'Risultati esami radiologici',
        section: 'ESAMI_RADIOLOGIA',
        category: 'Radiologia',
        keywords: ['radiologia', 'raggi', 'imaging']
    },
    {
        code: '30954-2',
        displayName: 'Referto ECG',
        description: 'Referto elettrocardiogramma',
        section: 'ESAMI_RADIOLOGIA',
        category: 'Esami Strumentali',
        keywords: ['ecg', 'elettrocardiogramma', 'cuore']
    },
    {
        code: '11524-6',
        displayName: 'Referto Spirometria',
        description: 'Referto esame spirometrico',
        section: 'ESAMI_RADIOLOGIA',
        category: 'Esami Strumentali',
        keywords: ['spirometria', 'polmoni', 'respiratorio']
    },
    {
        code: '28568-4',
        displayName: 'Audiometria',
        description: 'Referto esame audiometrico',
        section: 'ESAMI_RADIOLOGIA',
        category: 'Esami Strumentali',
        keywords: ['audiometria', 'udito', 'orecchio']
    },
    {
        code: '79066-7',
        displayName: 'Visiotest',
        description: 'Esame della vista (screening)',
        section: 'ESAMI_RADIOLOGIA',
        category: 'Esami Strumentali',
        keywords: ['vista', 'visiotest', 'occhi', 'visivo']
    }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Ottieni entries LOINC per sezione
 */
export const getLoincBySection = (section: CDASection): LOINCEntry[] => {
    return LOINC_CATALOG.filter(entry => entry.section === section);
};

/**
 * Ottieni entries LOINC per categoria
 */
export const getLoincByCategory = (category: string): LOINCEntry[] => {
    return LOINC_CATALOG.filter(entry => entry.category === category);
};

/**
 * Cerca nel catalogo LOINC
 */
export const searchLoinc = (query: string): LOINCEntry[] => {
    const lowerQuery = query.toLowerCase();
    return LOINC_CATALOG.filter(entry =>
        entry.displayName.toLowerCase().includes(lowerQuery) ||
        entry.code.includes(lowerQuery) ||
        entry.description?.toLowerCase().includes(lowerQuery) ||
        entry.keywords?.some(kw => kw.includes(lowerQuery))
    );
};

/**
 * Ottieni entry LOINC per codice
 */
export const getLoincByCode = (code: string): LOINCEntry | undefined => {
    return LOINC_CATALOG.find(entry => entry.code === code);
};

/**
 * Raggruppa entries per sezione
 */
export const getLoincGroupedBySection = (): Record<CDASection, LOINCEntry[]> => {
    const grouped: Record<CDASection, LOINCEntry[]> = {
        ANAMNESI: [],
        ESAME_OBIETTIVO: [],
        DIAGNOSI: [],
        TERAPIA: [],
        PRESCRIZIONI: [],
        ALLERGIE: [],
        CONCLUSIONI: [],
        ESAMI_LABORATORIO: [],
        ESAMI_RADIOLOGIA: []
    };

    LOINC_CATALOG.forEach(entry => {
        grouped[entry.section].push(entry);
    });

    return grouped;
};

/**
 * Raggruppa entries per categoria all'interno di una sezione
 */
export const getLoincGroupedByCategory = (section: CDASection): Record<string, LOINCEntry[]> => {
    const sectionEntries = getLoincBySection(section);
    const grouped: Record<string, LOINCEntry[]> = {};

    sectionEntries.forEach(entry => {
        if (!grouped[entry.category]) {
            grouped[entry.category] = [];
        }
        grouped[entry.category].push(entry);
    });

    return grouped;
};

export default LOINC_CATALOG;
