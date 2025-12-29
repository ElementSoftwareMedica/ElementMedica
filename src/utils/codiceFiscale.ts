/**
 * Utility per la gestione del Codice Fiscale italiano
 * 
 * @module utils/codiceFiscale
 */

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
        const date = new Date(year, month, day);
        // Validare che la data sia valida
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
        }
        return null;
    } catch {
        return null;
    }
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
    isValidTaxCode,
    getDoctorTitle,
    formatDoctorName,
    formatPatientName
};
