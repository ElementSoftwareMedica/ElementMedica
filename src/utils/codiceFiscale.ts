/**
 * Utility per la gestione del Codice Fiscale italiano
 * 
 * Include funzioni per:
 * - Estrazione dati dal CF (genere, data nascita, luogo nascita)
 * - Generazione CF da dati anagrafici
 * - Validazione CF
 * - Compatibilità nome/cognome con CF
 * 
 * @module utils/codiceFiscale
 */

import { getComuneByCode, getComuneByName, type ComuneItaliano } from '../data/comuniItaliani';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';

/**
 * Estrae il genere dal codice fiscale italiano
 * Il giorno di nascita è nelle posizioni 9-10 (1-indexed: 10-11)
 * Per le femmine, al giorno viene sommato 40
 * 
 * @param taxCode - Codice fiscale italiano (16 caratteri)
 * @returns Genere estratto o null se non valido
 */
export function extractGenderFromTaxCode(taxCode: string | null | undefined): Gender | null {
    if (!taxCode || taxCode.length !== 16) {
        return null;
    }

    // Il giorno è nelle posizioni 9-10 (0-indexed)
    const dayPart = taxCode.substring(9, 11);
    const day = parseInt(dayPart, 10);

    if (isNaN(day)) {
        return null;
    }

    // Per le femmine, al giorno viene sommato 40
    // Quindi: 1-31 = maschi, 41-71 = femmine
    return day > 40 ? 'FEMALE' : 'MALE';
}

/**
 * Estrae la data di nascita dal codice fiscale italiano
 * 
 * @param taxCode - Codice fiscale italiano (16 caratteri)
 * @returns Data di nascita o null se non valida
 */
export function extractBirthDateFromTaxCode(taxCode: string | null | undefined): Date | null {
    if (!taxCode || taxCode.length !== 16) {
        return null;
    }

    // Anno: posizioni 6-7 (0-indexed)
    // Mese: posizione 8 (lettera)
    // Giorno: posizioni 9-10

    const yearPart = taxCode.substring(6, 8);
    const monthLetter = taxCode.charAt(8).toUpperCase();
    const dayPart = taxCode.substring(9, 11);

    // Mapping lettere -> mesi
    const monthMap: Record<string, number> = {
        'A': 0,  // Gennaio
        'B': 1,  // Febbraio
        'C': 2,  // Marzo
        'D': 3,  // Aprile
        'E': 4,  // Maggio
        'H': 5,  // Giugno
        'L': 6,  // Luglio
        'M': 7,  // Agosto
        'P': 8,  // Settembre
        'R': 9,  // Ottobre
        'S': 10, // Novembre
        'T': 11  // Dicembre
    };

    const month = monthMap[monthLetter];
    if (month === undefined) {
        return null;
    }

    let day = parseInt(dayPart, 10);
    if (isNaN(day)) {
        return null;
    }

    // Per le femmine, sottrarre 40
    if (day > 40) {
        day -= 40;
    }

    // Calcolare l'anno completo
    // Assumiamo che anni > 30 siano 19xx, altrimenti 20xx
    let year = parseInt(yearPart, 10);
    if (isNaN(year)) {
        return null;
    }

    const currentYear = new Date().getFullYear() % 100;
    year = year > currentYear + 5 ? 1900 + year : 2000 + year;

    try {
        // CRITICAL: Use UTC to avoid timezone issues
        // Creating Date with new Date(year, month, day) uses local timezone
        // which can shift the date by 1 day when serialized to ISO string
        const date = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
        // Validare che la data sia valida
        if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
            return date;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Estrae il codice catastale (codice comune/stato estero) dal codice fiscale
 * Posizioni 11-14 (0-indexed: 11-15)
 * 
 * @param taxCode - Codice fiscale italiano (16 caratteri)
 * @returns Codice catastale (es: "H501" per Roma) o null se non valido
 */
export function extractBirthPlaceCodeFromTaxCode(taxCode: string | null | undefined): string | null {
    if (!taxCode || taxCode.length !== 16) {
        return null;
    }

    // Codice catastale: posizioni 11-14 (4 caratteri: 1 lettera + 3 numeri)
    const birthPlaceCode = taxCode.substring(11, 15).toUpperCase();

    // Validazione formato: 1 lettera + 3 numeri
    if (!/^[A-Z][0-9]{3}$/.test(birthPlaceCode)) {
        return null;
    }

    return birthPlaceCode;
}

/**
 * Interfaccia per i dati del luogo di nascita
 */
export interface BirthPlaceInfo {
    code: string;
    comune: string;
    provincia: string;
    regione?: string;
    isEstero: boolean;
}

/**
 * Cerca il comune di nascita dato il codice catastale usando il dataset interno
 * 
 * @param birthPlaceCode - Codice catastale (es: "H501")
 * @returns Informazioni sul luogo di nascita o null
 */
export function lookupBirthPlaceFromCode(birthPlaceCode: string | null): BirthPlaceInfo | null {
    if (!birthPlaceCode) return null;

    // Codici esteri iniziano con Z
    const isEstero = birthPlaceCode.startsWith('Z');

    const found = getComuneByCode(birthPlaceCode);
    if (found) {
        return {
            code: birthPlaceCode,
            comune: found.nome,
            provincia: found.provincia,
            regione: found.regione,
            isEstero
        };
    }

    return null;
}

/**
 * Estrae il comune di nascita completo dal codice fiscale
 * 
 * @param taxCode - Codice fiscale italiano (16 caratteri)
 * @returns Informazioni sul luogo di nascita o null
 */
export function extractBirthPlaceFromTaxCode(taxCode: string | null | undefined): BirthPlaceInfo | null {
    const code = extractBirthPlaceCodeFromTaxCode(taxCode);
    return lookupBirthPlaceFromCode(code);
}

/**
 * Cerca il comune di nascita dato il codice catastale
 * @deprecated Usa lookupBirthPlaceFromCode() invece
 * 
 * @param birthPlaceCode - Codice catastale (es: "H501")
 * @param comuniList - Lista dei comuni con codici catastali
 * @returns Informazioni sul luogo di nascita o null
 */
export function lookupBirthPlace(
    birthPlaceCode: string | null,
    comuniList: Array<{ code: string; nome: string; provincia: string; regione?: string }>
): BirthPlaceInfo | null {
    if (!birthPlaceCode) return null;

    // Codici esteri iniziano con Z
    const isEstero = birthPlaceCode.startsWith('Z');

    const found = comuniList.find(c => c.code.toUpperCase() === birthPlaceCode.toUpperCase());
    if (found) {
        return {
            code: birthPlaceCode,
            comune: found.nome,
            provincia: found.provincia,
            regione: found.regione,
            isEstero
        };
    }

    return null;
}

// ============================================
// GENERAZIONE CODICE FISCALE
// ============================================

/**
 * Mappatura mese -> lettera per il CF
 */
const MONTH_LETTERS = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T'];

/**
 * Tabella carattere dispari per calcolo CIN
 */
const ODD_CHAR_VALUES: Record<string, number> = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
};

/**
 * Tabella carattere pari per calcolo CIN
 */
const EVEN_CHAR_VALUES: Record<string, number> = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
    'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

/**
 * Calcola il carattere di controllo (CIN) del codice fiscale
 * @param partialCF - Primi 15 caratteri del CF
 * @returns Carattere di controllo (A-Z)
 */
function calculateControlChar(partialCF: string): string {
    let sum = 0;

    for (let i = 0; i < 15; i++) {
        const char = partialCF.charAt(i).toUpperCase();
        // Posizioni dispari (1, 3, 5...) -> indici pari (0, 2, 4...)
        // Posizioni pari (2, 4, 6...) -> indici dispari (1, 3, 5...)
        if (i % 2 === 0) {
            // Posizione dispari nel CF (1, 3, 5...)
            sum += ODD_CHAR_VALUES[char] || 0;
        } else {
            // Posizione pari nel CF (2, 4, 6...)
            sum += EVEN_CHAR_VALUES[char] || 0;
        }
    }

    return String.fromCharCode(65 + (sum % 26)); // A=65
}

/**
 * Genera il codice fiscale completo
 * 
 * @param cognome - Cognome
 * @param nome - Nome
 * @param dataNascita - Data di nascita (stringa YYYY-MM-DD o oggetto Date)
 * @param sesso - Sesso ('MALE' o 'FEMALE')
 * @param comuneNascita - Nome del comune di nascita (o codice catastale)
 * @returns Codice fiscale completo o null se dati insufficienti
 */
export function generateTaxCode(
    cognome: string | null | undefined,
    nome: string | null | undefined,
    dataNascita: string | Date | null | undefined,
    sesso: 'MALE' | 'FEMALE' | string | null | undefined,
    comuneNascita: string | null | undefined
): string | null {
    // Validazione input
    if (!cognome || !nome || !dataNascita || !sesso || !comuneNascita) {
        return null;
    }

    // Normalizza sesso
    const gender = sesso.toUpperCase();
    if (gender !== 'MALE' && gender !== 'FEMALE') {
        return null;
    }

    // Parse data di nascita
    let birthDate: Date;
    if (typeof dataNascita === 'string') {
        birthDate = new Date(dataNascita);
    } else {
        birthDate = dataNascita;
    }

    if (isNaN(birthDate.getTime())) {
        return null;
    }

    // Trova il codice catastale del comune
    let comuneCode: string | null = null;

    // Se è già un codice catastale (formato: 1 lettera + 3 numeri)
    if (/^[A-Z][0-9]{3}$/i.test(comuneNascita)) {
        comuneCode = comuneNascita.toUpperCase();
    } else {
        // Cerca per nome comune
        const comune = getComuneByName(comuneNascita);
        if (comune) {
            comuneCode = comune.code;
        }
    }

    if (!comuneCode) {
        return null;
    }

    // Genera codice cognome (3 caratteri)
    const cognomeCode = generateSurnameCode(cognome);

    // Genera codice nome (3 caratteri)
    const nomeCode = generateNameCode(nome);

    // Genera codice data/sesso
    const year = birthDate.getFullYear().toString().slice(-2);
    const monthLetter = MONTH_LETTERS[birthDate.getMonth()];
    let day = birthDate.getDate();
    if (gender === 'FEMALE') {
        day += 40;
    }
    const dayStr = day.toString().padStart(2, '0');

    // Componi i primi 15 caratteri
    const partialCF = cognomeCode + nomeCode + year + monthLetter + dayStr + comuneCode;

    // Calcola carattere di controllo
    const controlChar = calculateControlChar(partialCF);

    return partialCF + controlChar;
}

/**
 * Interfaccia per i dati di generazione CF
 */
export interface TaxCodeGenerationData {
    cognome: string;
    nome: string;
    dataNascita: string | Date;
    sesso: 'MALE' | 'FEMALE';
    comuneNascita: string;
    provinciaNascita?: string;
}

/**
 * Genera il codice fiscale e restituisce anche informazioni di validazione
 * 
 * @param data - Dati per la generazione
 * @returns Oggetto con CF generato e dettagli
 */
export function generateTaxCodeWithDetails(data: TaxCodeGenerationData): {
    taxCode: string | null;
    isComplete: boolean;
    missingFields: string[];
    comuneFound: boolean;
    comuneInfo: ComuneItaliano | null;
} {
    const missingFields: string[] = [];

    if (!data.cognome?.trim()) missingFields.push('cognome');
    if (!data.nome?.trim()) missingFields.push('nome');
    if (!data.dataNascita) missingFields.push('dataNascita');
    if (!data.sesso) missingFields.push('sesso');
    if (!data.comuneNascita?.trim()) missingFields.push('comuneNascita');

    // Cerca il comune
    let comuneInfo: ComuneItaliano | null = null;
    if (data.comuneNascita) {
        if (/^[A-Z][0-9]{3}$/i.test(data.comuneNascita)) {
            const found = getComuneByCode(data.comuneNascita);
            if (found) comuneInfo = found;
        } else {
            const found = getComuneByName(data.comuneNascita);
            if (found) comuneInfo = found;
        }
    }

    const taxCode = generateTaxCode(
        data.cognome,
        data.nome,
        data.dataNascita,
        data.sesso,
        data.comuneNascita
    );

    return {
        taxCode,
        isComplete: missingFields.length === 0,
        missingFields,
        comuneFound: comuneInfo !== null,
        comuneInfo
    };
}

/**
 * Genera il codice fiscale per cognome (prime 3 consonanti, poi vocali, poi X)
 * @param surname - Cognome
 * @returns Codice cognome (3 caratteri)
 */
function generateSurnameCode(surname: string): string {
    const clean = surname.toUpperCase().replace(/[^A-Z]/g, '');
    const consonants = clean.replace(/[AEIOU]/g, '');
    const vowels = clean.replace(/[^AEIOU]/g, '');

    const code = consonants + vowels + 'XXX';
    return code.substring(0, 3);
}

/**
 * Genera il codice fiscale per nome (consonanti 1,3,4, poi vocali, poi X)
 * @param name - Nome
 * @returns Codice nome (3 caratteri)
 */
function generateNameCode(name: string): string {
    const clean = name.toUpperCase().replace(/[^A-Z]/g, '');
    const consonants = clean.replace(/[AEIOU]/g, '');
    const vowels = clean.replace(/[^AEIOU]/g, '');

    // Se ci sono 4+ consonanti, prendi 1a, 3a, 4a
    if (consonants.length >= 4) {
        return consonants[0] + consonants[2] + consonants[3];
    }

    // Altrimenti, stesso algoritmo del cognome
    const code = consonants + vowels + 'XXX';
    return code.substring(0, 3);
}

/**
 * Verifica la compatibilità tra nome/cognome e codice fiscale
 * 
 * @param firstName - Nome
 * @param lastName - Cognome
 * @param taxCode - Codice fiscale
 * @returns Oggetto con risultato e dettagli
 */
export function checkTaxCodeCompatibility(
    firstName: string | null | undefined,
    lastName: string | null | undefined,
    taxCode: string | null | undefined
): { isCompatible: boolean; surnameMatch: boolean; nameMatch: boolean; expectedSurnameCode: string; expectedNameCode: string; actualSurnameCode: string; actualNameCode: string } {
    const defaultResult = {
        isCompatible: false,
        surnameMatch: false,
        nameMatch: false,
        expectedSurnameCode: '',
        expectedNameCode: '',
        actualSurnameCode: '',
        actualNameCode: ''
    };

    if (!firstName || !lastName || !taxCode || taxCode.length !== 16) {
        return defaultResult;
    }

    const expectedSurnameCode = generateSurnameCode(lastName);
    const expectedNameCode = generateNameCode(firstName);

    const actualSurnameCode = taxCode.substring(0, 3).toUpperCase();
    const actualNameCode = taxCode.substring(3, 6).toUpperCase();

    const surnameMatch = expectedSurnameCode === actualSurnameCode;
    const nameMatch = expectedNameCode === actualNameCode;

    return {
        isCompatible: surnameMatch && nameMatch,
        surnameMatch,
        nameMatch,
        expectedSurnameCode,
        expectedNameCode,
        actualSurnameCode,
        actualNameCode
    };
}

/**
 * Valida un codice fiscale italiano
 * 
 * @param taxCode - Codice fiscale da validare
 * @returns true se valido
 */
export function isValidTaxCode(taxCode: string | null | undefined): boolean {
    if (!taxCode || typeof taxCode !== 'string') {
        return false;
    }

    // Deve essere 16 caratteri alfanumerici
    if (!/^[A-Z0-9]{16}$/i.test(taxCode)) {
        return false;
    }

    // Verifica formato base: 6 lettere cognome/nome + 2 cifre anno + 1 lettera mese + 2 cifre giorno + 4 caratteri codice comune + 1 carattere di controllo
    const pattern = /^[A-Z]{6}[0-9]{2}[A-EHLMPRST][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;
    if (!pattern.test(taxCode)) {
        return false;
    }

    return true;
}

/**
 * Ottiene il titolo appropriato (Dott./Dott.ssa) in base al genere
 * 
 * @param taxCodeOrGender - Codice fiscale o genere diretto
 * @param explicitGender - Genere esplicito (ha precedenza sul taxCode)
 * @returns Titolo appropriato
 */
export function getDoctorTitle(taxCodeOrGender?: string | Gender | null, explicitGender?: Gender | null): string {
    // Se è passato un genere esplicito, usalo
    if (explicitGender === 'MALE' || explicitGender === 'FEMALE') {
        return explicitGender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
    }

    // Se il primo argomento è un genere
    if (taxCodeOrGender === 'MALE') return 'Dott.';
    if (taxCodeOrGender === 'FEMALE') return 'Dott.ssa';

    // Altrimenti, prova a estrarre il genere dal taxCode
    if (typeof taxCodeOrGender === 'string' && taxCodeOrGender.length === 16) {
        const gender = extractGenderFromTaxCode(taxCodeOrGender);
        return gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
    }

    return 'Dott.'; // Default
}

interface PersonFormatting {
    firstName?: string;
    lastName?: string;
    taxCode?: string | null;
    gender?: Gender | null;
}

/**
 * Formatta nome completo con titolo appropriato
 * 
 * @param person - Oggetto persona
 * @param includeTitle - Se includere il titolo
 * @returns Nome formattato con titolo
 */
export function formatDoctorName(person: PersonFormatting | null | undefined, includeTitle = true): string {
    if (!person) return '';

    const { firstName = '', lastName = '', taxCode, gender } = person;

    if (!includeTitle) {
        return `${firstName} ${lastName}`.trim();
    }

    // Usa gender se disponibile, altrimenti estrailo dal taxCode
    const effectiveGender = gender || extractGenderFromTaxCode(taxCode);
    const title = getDoctorTitle(effectiveGender);

    return `${title} ${firstName} ${lastName}`.trim();
}

/**
 * Formatta nome paziente con titolo Sig./Sig.ra
 * 
 * @param person - Oggetto persona
 * @param includeTitle - Se includere il titolo
 * @returns Nome formattato con titolo
 */
export function formatPatientName(person: PersonFormatting | null | undefined, includeTitle = true): string {
    if (!person) return '';

    const { firstName = '', lastName = '', taxCode, gender } = person;

    if (!includeTitle) {
        return `${firstName} ${lastName}`.trim();
    }

    const effectiveGender = gender || extractGenderFromTaxCode(taxCode);
    const title = effectiveGender === 'FEMALE' ? 'Sig.ra' : 'Sig.';

    return `${title} ${firstName} ${lastName}`.trim();
}

export default {
    extractGenderFromTaxCode,
    extractBirthDateFromTaxCode,
    extractBirthPlaceCodeFromTaxCode,
    extractBirthPlaceFromTaxCode,
    lookupBirthPlaceFromCode,
    lookupBirthPlace,
    generateTaxCode,
    generateTaxCodeWithDetails,
    checkTaxCodeCompatibility,
    isValidTaxCode,
    getDoctorTitle,
    formatDoctorName,
    formatPatientName
};
