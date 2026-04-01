/**
 * Riferimenti Normativi D.Lgs 81/08 e normative correlate
 * 
 * Mappatura completa dei codici rischio con riferimenti normativi,
 * articoli e periodicità sorveglianza sanitaria.
 * 
 * Utilizzato da:
 * - MansioneFormModal (form rischi)
 * - ProtocolloFormModal (protocolli sanitari)
 * - GiudizioIdoneita (giudizi MC)
 * - RischioPrestazioniPage (catalogo rischi)
 * - Allegato3A/3B (documentazione)
 * 
 * @module utils/riferimentiNormativi
 * @project P56 - Medicina del Lavoro Sistema Completo
 * @compliance D.Lgs 81/08, D.Lgs 101/2020, DPR 177/2011
 */

/**
 * Categorie rischio secondo D.Lgs 81/08
 */
export type CategoriaRischio =
    | 'FISICI'
    | 'CHIMICI'
    | 'BIOLOGICI'
    | 'ERGONOMICI'
    | 'ORGANIZZATIVI'
    | 'SPECIFICI'
    | 'SETTORIALI';

/**
 * Codici rischio riconosciuti dal sistema
 */
export type CodiceRischio =
    // FISICI
    | 'RUM' | 'VIB_MB' | 'VIB_WBV' | 'RAD_ION' | 'RAD_NIR' | 'CEM' | 'MIC'
    // CHIMICI
    | 'CHI' | 'CAN' | 'AMI' | 'PIO'
    // BIOLOGICI
    | 'BIO'
    // ERGONOMICI
    | 'MMC' | 'MMC_SOL' | 'MMC_TRA' | 'MOV_RIP' | 'POS'
    // ORGANIZZATIVI
    | 'NOT' | 'VDT' | 'SLC'
    // SPECIFICI
    | 'QUO' | 'SPA_CON' | 'GUI_MEZ'
    // SETTORIALI
    | 'CAR_ELE' | 'ELE' | 'INC' | 'ISO' | 'IPE' | 'POL' | 'ALC';

/**
 * Interfaccia per riferimento normativo
 */
export interface RiferimentoNormativo {
    /** Normativa principale (D.Lgs, DM, DPR, etc.) */
    normativa: string;
    /** Articoli/titoli specifici */
    articoli: string;
    /** Periodicità sorveglianza sanitaria consigliata */
    periodicita: string;
    /** Periodicità in mesi (per calcoli automatici) */
    periodicitaMesi: number;
    /** Descrizione sintetica */
    descrizione?: string;
}

/**
 * Interfaccia per categoria rischio con metadata
 */
export interface CategoriaRischioInfo {
    value: CategoriaRischio;
    label: string;
    icon: string;
    order: number;
    colore: string;
}

/**
 * Categorie rischio con metadata per UI
 */
export const CATEGORIE_RISCHIO: CategoriaRischioInfo[] = [
    { value: 'FISICI', label: 'Fisici', icon: '🔊', order: 1, colore: 'blue' },
    { value: 'CHIMICI', label: 'Chimici', icon: '🧪', order: 2, colore: 'purple' },
    { value: 'BIOLOGICI', label: 'Biologici', icon: '🦠', order: 3, colore: 'green' },
    { value: 'ERGONOMICI', label: 'Ergonomici', icon: '🏋️', order: 4, colore: 'orange' },
    { value: 'ORGANIZZATIVI', label: 'Organizzativi', icon: '📋', order: 5, colore: 'teal' },
    { value: 'SPECIFICI', label: 'Specifici', icon: '⚠️', order: 6, colore: 'yellow' },
    { value: 'SETTORIALI', label: 'Settoriali', icon: '🏭', order: 7, colore: 'gray' }
];

/**
 * Mappatura completa riferimenti normativi D.Lgs 81/08 e normative correlate
 * 
 * Per ogni codice rischio sono specificati:
 * - Normativa di riferimento principale
 * - Articoli specifici
 * - Periodicità raccomandata della sorveglianza sanitaria
 */
export const RIFERIMENTI_NORMATIVI: Record<CodiceRischio, RiferimentoNormativo> = {
    // ==================== RISCHI FISICI ====================
    'RUM': {
        normativa: 'D.Lgs 81/08 Titolo VIII Capo II',
        articoli: 'Art. 187-198 - Protezione dei lavoratori dal rumore',
        periodicita: 'Annuale (>85 dB), Biennale (80-85 dB), Triennale (<80 dB)',
        periodicitaMesi: 12,
        descrizione: 'Esposizione a livelli di pressione sonora superiori ai valori limite'
    },
    'VIB_MB': {
        normativa: 'D.Lgs 81/08 Titolo VIII Capo III',
        articoli: 'Art. 199-205 - Vibrazioni meccaniche (HAV)',
        periodicita: 'Annuale (>5 m/s²), Triennale (2.5-5 m/s²)',
        periodicitaMesi: 12,
        descrizione: 'Vibrazioni trasmesse al sistema mano-braccio'
    },
    'VIB_WBV': {
        normativa: 'D.Lgs 81/08 Titolo VIII Capo III',
        articoli: 'Art. 199-205 - Vibrazioni meccaniche (WBV)',
        periodicita: 'Annuale (>1 m/s²), Triennale (0.5-1 m/s²)',
        periodicitaMesi: 12,
        descrizione: 'Vibrazioni trasmesse al corpo intero'
    },
    'RAD_ION': {
        normativa: 'D.Lgs 101/2020 (ex D.Lgs 230/95)',
        articoli: 'Radiazioni ionizzanti - Categorie A e B',
        periodicita: 'Semestrale (Cat. A), Annuale (Cat. B)',
        periodicitaMesi: 6,
        descrizione: 'Esposizione a raggi X, gamma, particelle'
    },
    'RAD_NIR': {
        normativa: 'D.Lgs 81/08 Titolo VIII Capo V',
        articoli: 'Art. 213-218 - Radiazioni Ottiche Artificiali (ROA)',
        periodicita: 'Annuale (alto), Biennale (medio)',
        periodicitaMesi: 12,
        descrizione: 'Radiazioni UV, visibili, infrarosse (laser, saldatura)'
    },
    'CEM': {
        normativa: 'D.Lgs 81/08 Titolo VIII Capo IV',
        articoli: 'Art. 206-212 - Campi elettromagnetici (0 Hz - 300 GHz)',
        periodicita: 'Annuale (sopra LA), Triennale (sotto LA)',
        periodicitaMesi: 12,
        descrizione: 'Campi elettrici, magnetici, elettromagnetici'
    },
    'MIC': {
        normativa: 'D.Lgs 81/08 Allegato IV',
        articoli: 'Requisiti luoghi di lavoro - Microclima',
        periodicita: 'Annuale',
        periodicitaMesi: 12,
        descrizione: 'Ambienti severi caldo/freddo, microclima moderato'
    },

    // ==================== RISCHI CHIMICI ====================
    'CHI': {
        normativa: 'D.Lgs 81/08 Titolo IX Capo I',
        articoli: 'Art. 221-232 - Agenti chimici pericolosi',
        periodicita: 'Annuale (non basso), Biennale (basso)',
        periodicitaMesi: 12,
        descrizione: 'Solventi, acidi, basi, sostanze pericolose'
    },
    'CAN': {
        normativa: 'D.Lgs 81/08 Titolo IX Capo II',
        articoli: 'Art. 233-245 - Cancerogeni e mutageni',
        periodicita: 'Almeno annuale + follow-up post-esposizione',
        periodicitaMesi: 12,
        descrizione: 'Benzene, formaldeide, IPA, amianto, silice'
    },
    'AMI': {
        normativa: 'D.Lgs 81/08 Titolo IX Capo III',
        articoli: 'Art. 246-261 - Amianto',
        periodicita: 'Almeno annuale + follow-up post-esposizione',
        periodicitaMesi: 12,
        descrizione: 'Rimozione, bonifica, manutenzione materiali contenenti amianto'
    },
    'PIO': {
        normativa: 'D.Lgs 81/08 Allegato XXXIX',
        articoli: 'Piombo e composti - VLB 60 μg/100ml (M), 40 μg/100ml (F)',
        periodicita: 'Semestrale (alto), Annuale (basso)',
        periodicitaMesi: 6,
        descrizione: 'Piombo metallico e composti inorganici'
    },

    // ==================== RISCHI BIOLOGICI ====================
    'BIO': {
        normativa: 'D.Lgs 81/08 Titolo X',
        articoli: 'Art. 266-286 - Agenti biologici (Gruppi 1-4)',
        periodicita: 'Annuale o più frequente per gruppi 3-4',
        periodicitaMesi: 12,
        descrizione: 'Batteri, virus, funghi, parassiti'
    },

    // ==================== RISCHI ERGONOMICI ====================
    'MMC': {
        normativa: 'D.Lgs 81/08 Titolo VI + ISO 11228',
        articoli: 'Art. 167-171 - Movimentazione manuale carichi',
        periodicita: 'Annuale (LI>1), Biennale (LI<1)',
        periodicitaMesi: 12,
        descrizione: 'Sollevamento, trasporto, traino, spinta'
    },
    'MMC_SOL': {
        normativa: 'D.Lgs 81/08 Titolo VI + ISO 11228-1',
        articoli: 'Art. 167-171 - MMC Sollevamento (metodo NIOSH)',
        periodicita: 'Annuale (LI>1), Biennale (LI<1)',
        periodicitaMesi: 12,
        descrizione: 'Sollevamento e trasporto manuale'
    },
    'MMC_TRA': {
        normativa: 'D.Lgs 81/08 Titolo VI + ISO 11228-2',
        articoli: 'Art. 167-171 - MMC Traino/Spinta (Snook & Ciriello)',
        periodicita: 'Annuale (alto), Biennale (medio)',
        periodicitaMesi: 12,
        descrizione: 'Operazioni di traino e spinta'
    },
    'MOV_RIP': {
        normativa: 'D.Lgs 81/08 Titolo VI + ISO 11228-3',
        articoli: 'Art. 167-171 - Movimenti ripetitivi (metodo OCRA)',
        periodicita: 'Annuale (OCRA>4.5), Biennale (2.1-4.5)',
        periodicitaMesi: 12,
        descrizione: 'Movimenti ripetitivi arti superiori'
    },
    'POS': {
        normativa: 'D.Lgs 81/08 Allegato XXXIII',
        articoli: 'Posture incongrue (RULA, REBA, OWAS)',
        periodicita: 'Annuale (alto), Biennale (medio)',
        periodicitaMesi: 12,
        descrizione: 'Mantenimento prolungato posture non fisiologiche'
    },

    // ==================== RISCHI ORGANIZZATIVI ====================
    'NOT': {
        normativa: 'D.Lgs 81/08 Art. 14 + D.Lgs 66/2003 Art. 11',
        articoli: 'Lavoro notturno (≥80 notti/anno o ≥3h/notte 22-05)',
        periodicita: 'Biennale',
        periodicitaMesi: 24,
        descrizione: 'Lavoro nel periodo 24:00-05:00'
    },
    'VDT': {
        normativa: 'D.Lgs 81/08 Titolo VII',
        articoli: 'Art. 172-179 - Attrezzature munite di videoterminale',
        periodicita: 'Quinquennale (<50 anni), Biennale (≥50 anni)',
        periodicitaMesi: 60, // Default quinquennale
        descrizione: 'Utilizzo sistematico VDT ≥20 ore/settimana'
    },
    'SLC': {
        normativa: 'D.Lgs 81/08 Art. 28 + Accordo Europeo 2004',
        articoli: 'Stress lavoro-correlato (indicatori INAIL)',
        periodicita: 'Su richiesta o indicazione MC',
        periodicitaMesi: 0, // Non periodico
        descrizione: 'Fattori organizzativi e psicosociali'
    },

    // ==================== RISCHI SPECIFICI ====================
    'QUO': {
        normativa: 'D.Lgs 81/08 Titolo IV Capo II',
        articoli: 'Art. 105-156 - Lavoro in quota (>2m)',
        periodicita: 'Annuale',
        periodicitaMesi: 12,
        descrizione: 'Attività a quota superiore a 2 metri'
    },
    'SPA_CON': {
        normativa: 'D.Lgs 81/08 Art. 66 + DPR 177/2011',
        articoli: 'Spazi confinati o sospetti di inquinamento',
        periodicita: 'Annuale',
        periodicitaMesi: 12,
        descrizione: 'Cisterne, silos, cunicoli, pozzi, camere'
    },
    'GUI_MEZ': {
        normativa: 'D.Lgs 81/08 Art. 18 c.1 lett. bb-bis',
        articoli: 'Guida mezzi aziendali (conduzione abituale)',
        periodicita: 'Biennale (<50 anni), Annuale (≥50 anni)',
        periodicitaMesi: 24,
        descrizione: 'Conduzione abituale veicoli aziendali'
    },

    // ==================== RISCHI SETTORIALI ====================
    'CAR_ELE': {
        normativa: 'D.Lgs 81/08 Art. 73 + Accordo SR 22/02/2012',
        articoli: 'Carrelli elevatori semoventi con conducente a bordo',
        periodicita: 'Annuale',
        periodicitaMesi: 12,
        descrizione: 'Muletti, transpallet uomo a bordo (patentino)'
    },
    'ELE': {
        normativa: 'D.Lgs 81/08 Titolo III Capo III + CEI 11-27',
        articoli: 'Art. 80-87 - Rischio elettrico (PES, PAV, PEI)',
        periodicita: 'Annuale',
        periodicitaMesi: 12,
        descrizione: 'Lavori elettrici sotto tensione o in prossimità'
    },
    'INC': {
        normativa: 'D.Lgs 81/08 Art. 18 + DM 02/09/2021',
        articoli: 'Addetti antincendio ed emergenze (Liv. 1-2-3)',
        periodicita: 'Annuale',
        periodicitaMesi: 12,
        descrizione: 'Squadra antincendio ed emergenze'
    },
    'ISO': {
        normativa: 'D.Lgs 81/08 Art. 15, 18',
        articoli: 'Lavoro isolato (assenza comunicazione immediata)',
        periodicita: 'Annuale',
        periodicitaMesi: 12,
        descrizione: 'Lavoro svolto da solo senza altri lavoratori'
    },
    'IPE': {
        normativa: 'DM 13/01/1979 + D.Lgs 81/08 Art. 116-121',
        articoli: 'Lavori subacquei, camere iperbariche, funi',
        periodicita: 'Semestrale',
        periodicitaMesi: 6,
        descrizione: 'Ambiente iperbarico, lavori con funi'
    },
    'POL': {
        normativa: 'D.Lgs 81/08 Titolo IX',
        articoli: 'Art. 225 - Polveri inalabili (silice, legno, farine)',
        periodicita: 'Annuale',
        periodicitaMesi: 12,
        descrizione: 'Silice cristallina, polveri di legno duro, farine'
    },
    'ALC': {
        normativa: 'Provv. 16/03/2006 + Accordo SR 18/09/2008',
        articoli: 'Mansioni a rischio - Allegato I (alcol e sostanze)',
        periodicita: 'Annuale + controlli random',
        periodicitaMesi: 12,
        descrizione: 'Guida, movimentazione, sanità, sicurezza'
    }
};

/**
 * Ottiene il riferimento normativo per un codice rischio
 * @param codice Codice rischio
 * @returns Riferimento normativo o null se non trovato
 */
export function getRiferimentoNormativo(codice: string): RiferimentoNormativo | null {
    return RIFERIMENTI_NORMATIVI[codice as CodiceRischio] || null;
}

/**
 * Ottiene la categoria di un codice rischio
 * @param codice Codice rischio
 * @returns Categoria rischio o null
 */
export function getCategoriaRischio(codice: string): CategoriaRischio | null {
    const mapping: Record<string, CategoriaRischio> = {
        // FISICI
        'RUM': 'FISICI', 'VIB_MB': 'FISICI', 'VIB_WBV': 'FISICI',
        'RAD_ION': 'FISICI', 'RAD_NIR': 'FISICI', 'CEM': 'FISICI', 'MIC': 'FISICI',
        // CHIMICI
        'CHI': 'CHIMICI', 'CAN': 'CHIMICI', 'AMI': 'CHIMICI', 'PIO': 'CHIMICI',
        // BIOLOGICI
        'BIO': 'BIOLOGICI',
        // ERGONOMICI
        'MMC': 'ERGONOMICI', 'MMC_SOL': 'ERGONOMICI', 'MMC_TRA': 'ERGONOMICI',
        'MOV_RIP': 'ERGONOMICI', 'POS': 'ERGONOMICI',
        // ORGANIZZATIVI
        'NOT': 'ORGANIZZATIVI', 'VDT': 'ORGANIZZATIVI', 'SLC': 'ORGANIZZATIVI',
        // SPECIFICI
        'QUO': 'SPECIFICI', 'SPA_CON': 'SPECIFICI', 'GUI_MEZ': 'SPECIFICI',
        // SETTORIALI
        'CAR_ELE': 'SETTORIALI', 'ELE': 'SETTORIALI', 'INC': 'SETTORIALI',
        'ISO': 'SETTORIALI', 'IPE': 'SETTORIALI', 'POL': 'SETTORIALI', 'ALC': 'SETTORIALI'
    };
    return mapping[codice] || null;
}

/**
 * Ottiene info categoria da valore
 * @param categoria Valore categoria
 * @returns Info categoria o undefined
 */
export function getCategoriaInfo(categoria: CategoriaRischio): CategoriaRischioInfo | undefined {
    return CATEGORIE_RISCHIO.find(c => c.value === categoria);
}

/**
 * Formatta il riferimento normativo in stringa
 * @param codice Codice rischio
 * @returns Stringa formattata o empty string
 */
export function formatRiferimentoNormativo(codice: string): string {
    const rif = getRiferimentoNormativo(codice);
    if (!rif) return '';
    return `${rif.normativa} - ${rif.articoli}`;
}

/**
 * Lista tutti i codici rischio per categoria
 * @param categoria Categoria rischio
 * @returns Array di codici rischio
 */
export function getCodiciRischioByCategoria(categoria: CategoriaRischio): CodiceRischio[] {
    const result: CodiceRischio[] = [];
    for (const [codice, rif] of Object.entries(RIFERIMENTI_NORMATIVI)) {
        const cat = getCategoriaRischio(codice);
        if (cat === categoria) {
            result.push(codice as CodiceRischio);
        }
    }
    return result;
}

/**
 * Esporta tutti i codici rischio come array
 */
export const CODICI_RISCHIO = Object.keys(RIFERIMENTI_NORMATIVI) as CodiceRischio[];

export default {
    RIFERIMENTI_NORMATIVI,
    CATEGORIE_RISCHIO,
    CODICI_RISCHIO,
    getRiferimentoNormativo,
    getCategoriaRischio,
    getCategoriaInfo,
    formatRiferimentoNormativo,
    getCodiciRischioByCategoria
};
