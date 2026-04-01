/**
 * Dataset completo dei comuni italiani con codici catastali
 * 
 * Ogni comune ha:
 * - code: Codice catastale (belfiore) usato nel codice fiscale
 * - nome: Nome del comune
 * - provincia: Sigla provincia (2 lettere)
 * - regione: Nome regione
 * 
 * Dataset: 7904 comuni italiani + 58 stati esteri
 * Fonte: https://github.com/matteocontrini/comuni-json
 * 
 * @module data/comuniItaliani
 */

export interface ComuneItaliano {
    code: string;    // Codice catastale (es: "H501" per Roma)
    nome: string;    // Nome comune
    provincia: string; // Sigla provincia (es: "RM")
    regione: string;  // Nome regione
}

/**
 * Mappa province -> regione
 */
export const PROVINCE_REGIONI: Record<string, string> = {
    // Piemonte
    'AL': 'Piemonte', 'AT': 'Piemonte', 'BI': 'Piemonte', 'CN': 'Piemonte',
    'NO': 'Piemonte', 'TO': 'Piemonte', 'VB': 'Piemonte', 'VC': 'Piemonte',
    // Valle d'Aosta
    'AO': "Valle d'Aosta",
    // Lombardia
    'BG': 'Lombardia', 'BS': 'Lombardia', 'CO': 'Lombardia', 'CR': 'Lombardia',
    'LC': 'Lombardia', 'LO': 'Lombardia', 'MB': 'Lombardia', 'MI': 'Lombardia',
    'MN': 'Lombardia', 'PV': 'Lombardia', 'SO': 'Lombardia', 'VA': 'Lombardia',
    // Trentino-Alto Adige
    'BZ': 'Trentino-Alto Adige', 'TN': 'Trentino-Alto Adige',
    // Veneto
    'BL': 'Veneto', 'PD': 'Veneto', 'RO': 'Veneto', 'TV': 'Veneto',
    'VE': 'Veneto', 'VI': 'Veneto', 'VR': 'Veneto',
    // Friuli-Venezia Giulia
    'GO': 'Friuli-Venezia Giulia', 'PN': 'Friuli-Venezia Giulia',
    'TS': 'Friuli-Venezia Giulia', 'UD': 'Friuli-Venezia Giulia',
    // Liguria
    'GE': 'Liguria', 'IM': 'Liguria', 'SP': 'Liguria', 'SV': 'Liguria',
    // Emilia-Romagna
    'BO': 'Emilia-Romagna', 'FE': 'Emilia-Romagna', 'FC': 'Emilia-Romagna',
    'MO': 'Emilia-Romagna', 'PC': 'Emilia-Romagna', 'PR': 'Emilia-Romagna',
    'RA': 'Emilia-Romagna', 'RE': 'Emilia-Romagna', 'RN': 'Emilia-Romagna',
    // Toscana
    'AR': 'Toscana', 'FI': 'Toscana', 'GR': 'Toscana', 'LI': 'Toscana',
    'LU': 'Toscana', 'MS': 'Toscana', 'PI': 'Toscana', 'PO': 'Toscana',
    'PT': 'Toscana', 'SI': 'Toscana',
    // Umbria
    'PG': 'Umbria', 'TR': 'Umbria',
    // Marche
    'AN': 'Marche', 'AP': 'Marche', 'FM': 'Marche', 'MC': 'Marche', 'PU': 'Marche',
    // Lazio
    'FR': 'Lazio', 'LT': 'Lazio', 'RI': 'Lazio', 'RM': 'Lazio', 'VT': 'Lazio',
    // Abruzzo
    'AQ': 'Abruzzo', 'CH': 'Abruzzo', 'PE': 'Abruzzo', 'TE': 'Abruzzo',
    // Molise
    'CB': 'Molise', 'IS': 'Molise',
    // Campania
    'AV': 'Campania', 'BN': 'Campania', 'CE': 'Campania', 'NA': 'Campania', 'SA': 'Campania',
    // Puglia
    'BA': 'Puglia', 'BT': 'Puglia', 'BR': 'Puglia', 'FG': 'Puglia', 'LE': 'Puglia', 'TA': 'Puglia',
    // Basilicata
    'MT': 'Basilicata', 'PZ': 'Basilicata',
    // Calabria
    'CS': 'Calabria', 'CZ': 'Calabria', 'KR': 'Calabria', 'RC': 'Calabria', 'VV': 'Calabria',
    // Sicilia
    'AG': 'Sicilia', 'CL': 'Sicilia', 'CT': 'Sicilia', 'EN': 'Sicilia',
    'ME': 'Sicilia', 'PA': 'Sicilia', 'RG': 'Sicilia', 'SR': 'Sicilia', 'TP': 'Sicilia',
    // Sardegna
    'CA': 'Sardegna', 'NU': 'Sardegna', 'OR': 'Sardegna', 'SS': 'Sardegna', 'SU': 'Sardegna',
    // Estero
    'EE': 'Estero'
};

/**
 * Lista completa delle province italiane
 */
export const PROVINCE_ITALIANE = Object.keys(PROVINCE_REGIONI).filter(p => p !== 'EE').sort();

// Cache per i comuni caricati
let comuniCache: ComuneItaliano[] | null = null;
let comuniByCodeCache: Map<string, ComuneItaliano> | null = null;
let comuniByNameCache: Map<string, ComuneItaliano> | null = null;

/**
 * Carica i comuni dal file JSON
 * Usa lazy loading per evitare di caricare 800KB al primo caricamento
 */
export async function loadComuni(): Promise<ComuneItaliano[]> {
    if (comuniCache) {
        return comuniCache;
    }

    try {
        const response = await fetch('/data/comuni.json');
        if (!response.ok) {
            throw new Error(`Errore nel caricamento dei comuni: ${response.status}`);
        }
        comuniCache = await response.json();

        // Costruisci le mappe di lookup
        comuniByCodeCache = new Map(
            comuniCache!.map(c => [c.code.toUpperCase(), c])
        );
        comuniByNameCache = new Map(
            comuniCache!.map(c => [c.nome.toUpperCase(), c])
        );

        return comuniCache!;
    } catch (error) {
        return [];
    }
}

/**
 * Ottieni i comuni caricati (sincrono, ritorna cache o array vuoto)
 */
export function getComuni(): ComuneItaliano[] {
    return comuniCache || [];
}

/**
 * Alias per compatibilità con codice esistente
 */
export const COMUNI_ITALIANI: ComuneItaliano[] = [];

// Inizializza la cache al caricamento del modulo (async)
if (typeof window !== 'undefined') {
    loadComuni().then(comuni => {
        // Popola l'array per compatibilità
        COMUNI_ITALIANI.length = 0;
        COMUNI_ITALIANI.push(...comuni);
    }).catch(() => {
        // Silently fail - verrà gestito nelle funzioni di ricerca
    });
}

/**
 * Mappa codice catastale -> comune (per lookup veloce)
 */
export function getComuniByCodeMap(): Map<string, ComuneItaliano> {
    return comuniByCodeCache || new Map();
}

/**
 * Mappa nome comune (normalizzato) -> comune
 */
export function getComuniByNameMap(): Map<string, ComuneItaliano> {
    return comuniByNameCache || new Map();
}

/**
 * Cerca un comune per codice catastale
 */
export function getComuneByCode(code: string): ComuneItaliano | undefined {
    if (!code) return undefined;
    const map = getComuniByCodeMap();
    return map.get(code.toUpperCase());
}

/**
 * Cerca un comune per nome esatto
 */
export function getComuneByName(name: string): ComuneItaliano | undefined {
    if (!name) return undefined;
    const map = getComuniByNameMap();
    return map.get(name.toUpperCase());
}

/**
 * Cerca comuni con autocomplete (ricerca parziale)
 * @param query - Stringa di ricerca (min 2 caratteri)
 * @param limit - Numero massimo risultati
 */
export function searchComuni(query: string, limit = 20): ComuneItaliano[] {
    if (!query || query.length < 2) return [];

    const comuni = getComuni();
    if (comuni.length === 0) return [];

    const normalizedQuery = query.toUpperCase().trim();

    // Prima cerca match esatti all'inizio
    const startsWithMatches = comuni.filter(c =>
        c.nome.toUpperCase().startsWith(normalizedQuery)
    );

    // Poi cerca match parziali
    const containsMatches = comuni.filter(c =>
        c.nome.toUpperCase().includes(normalizedQuery) &&
        !c.nome.toUpperCase().startsWith(normalizedQuery)
    );

    return [...startsWithMatches, ...containsMatches].slice(0, limit);
}

/**
 * Cerca comuni con autocomplete (versione async per garantire caricamento)
 * @param query - Stringa di ricerca (min 2 caratteri)
 * @param limit - Numero massimo risultati
 */
export async function searchComuniAsync(query: string, limit = 20): Promise<ComuneItaliano[]> {
    if (!query || query.length < 2) return [];

    const comuni = await loadComuni();
    if (comuni.length === 0) return [];

    const normalizedQuery = query.toUpperCase().trim();

    // Prima cerca match esatti all'inizio
    const startsWithMatches = comuni.filter(c =>
        c.nome.toUpperCase().startsWith(normalizedQuery)
    );

    // Poi cerca match parziali
    const containsMatches = comuni.filter(c =>
        c.nome.toUpperCase().includes(normalizedQuery) &&
        !c.nome.toUpperCase().startsWith(normalizedQuery)
    );

    return [...startsWithMatches, ...containsMatches].slice(0, limit);
}

/**
 * Ottieni tutti i comuni di una provincia
 */
export function getComuniByProvincia(provincia: string): ComuneItaliano[] {
    const comuni = getComuni();
    return comuni.filter(c => c.provincia.toUpperCase() === provincia.toUpperCase());
}

/**
 * Ottieni tutti i comuni di una regione
 */
export function getComuniByRegione(regione: string): ComuneItaliano[] {
    const comuni = getComuni();
    return comuni.filter(c => c.regione.toUpperCase() === regione.toUpperCase());
}

/**
 * Ottieni tutti gli stati esteri
 */
export function getStatiEsteri(): ComuneItaliano[] {
    const comuni = getComuni();
    return comuni.filter(c => c.provincia === 'EE');
}

/**
 * Verifica se un comune è uno stato estero
 */
export function isStatoEstero(comuneOrCode: string | ComuneItaliano): boolean {
    if (typeof comuneOrCode === 'string') {
        return comuneOrCode.startsWith('Z');
    }
    return comuneOrCode.provincia === 'EE' || comuneOrCode.code.startsWith('Z');
}

/**
 * Mappa Province → CAP generico del capoluogo
 * Per città con più CAP (es. Roma, Milano, Padova), usa il CAP generico (terminante in "00")
 * che può poi essere corretto manualmente dall'utente.
 * Fonte: Poste Italiane - Codici di Avviamento Postale
 */
export const PROVINCE_CAP: Record<string, string> = {
    // Piemonte
    'AL': '15121', 'AT': '14100', 'BI': '13900', 'CN': '12100',
    'NO': '28100', 'TO': '10100', 'VB': '28921', 'VC': '13100',
    // Valle d'Aosta
    'AO': '11100',
    // Lombardia
    'BG': '24100', 'BS': '25100', 'CO': '22100', 'CR': '26100',
    'LC': '23900', 'LO': '26900', 'MB': '20900', 'MI': '20100',
    'MN': '46100', 'PV': '27100', 'SO': '23100', 'VA': '21100',
    // Trentino-Alto Adige
    'BZ': '39100', 'TN': '38122',
    // Veneto
    'BL': '32100', 'PD': '35100', 'RO': '45100', 'TV': '31100',
    'VE': '30100', 'VI': '36100', 'VR': '37100',
    // Friuli-Venezia Giulia
    'GO': '34170', 'PN': '33170', 'TS': '34100', 'UD': '33100',
    // Liguria
    'GE': '16100', 'IM': '18100', 'SP': '19121', 'SV': '17100',
    // Emilia-Romagna
    'BO': '40100', 'FE': '44121', 'FC': '47121', 'MO': '41121',
    'PC': '29121', 'PR': '43121', 'RA': '48121', 'RE': '42121', 'RN': '47921',
    // Toscana
    'AR': '52100', 'FI': '50100', 'GR': '58100', 'LI': '57100',
    'LU': '55100', 'MS': '54100', 'PI': '56100', 'PO': '59100',
    'PT': '51100', 'SI': '53100',
    // Umbria
    'PG': '06100', 'TR': '05100',
    // Marche
    'AN': '60121', 'AP': '63100', 'FM': '63900', 'MC': '62100', 'PU': '61121',
    // Lazio
    'FR': '03100', 'LT': '04100', 'RI': '02100', 'RM': '00100', 'VT': '01100',
    // Abruzzo
    'AQ': '67100', 'CH': '66100', 'PE': '65100', 'TE': '64100',
    // Molise
    'CB': '86100', 'IS': '86170',
    // Campania
    'AV': '83100', 'BN': '82100', 'CE': '81100', 'NA': '80100', 'SA': '84100',
    // Puglia
    'BA': '70100', 'BT': '76121', 'BR': '72100', 'FG': '71121', 'LE': '73100', 'TA': '74121',
    // Basilicata
    'MT': '75100', 'PZ': '85100',
    // Calabria
    'CS': '87100', 'CZ': '88100', 'KR': '88900', 'RC': '89100', 'VV': '89900',
    // Sicilia
    'AG': '92100', 'CL': '93100', 'CT': '95100', 'EN': '94100',
    'ME': '98121', 'PA': '90100', 'RG': '97100', 'SR': '96100', 'TP': '91100',
    // Sardegna
    'CA': '09100', 'NU': '08100', 'OR': '09170', 'SS': '07100', 'SU': '09049',
};

/**
 * Ottieni il CAP generico per un comune basandosi sulla provincia.
 * Per le grandi città che hanno più CAP, restituisce quello generico (es. 35100 per Padova).
 * L'utente può poi modificarlo manualmente.
 * 
 * @param provincia - Sigla provincia (es: "PD", "RM", "MI")
 * @returns CAP generico o stringa vuota se provincia non trovata/estero
 */
export function getCapByProvincia(provincia: string): string {
    if (!provincia || provincia === 'EE') return '';
    return PROVINCE_CAP[provincia.toUpperCase()] || '';
}
