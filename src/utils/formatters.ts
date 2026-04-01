/**
 * Utility di formattazione per valori comuni
 * 
 * @module utils/formatters
 */

/**
 * Formatta un valore numerico come valuta EUR
 * @param value - Il valore da formattare
 * @returns Stringa formattata in EUR (es. "1.234,56 €")
 */
export const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
        return '€ 0,00';
    }
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
};

/**
 * Formatta una data in formato italiano
 * @param date - Data come stringa o Date object
 * @returns Stringa formattata (es. "31/12/2024")
 */
export const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '-';

    return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(dateObj);
};

/**
 * Formatta una data e ora in formato italiano
 * @param date - Data come stringa o Date object
 * @returns Stringa formattata (es. "31/12/2024 14:30")
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '-';

    return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(dateObj);
};

/**
 * Formatta un numero con separatori delle migliaia
 * @param value - Il valore da formattare
 * @param decimals - Numero di decimali (default 0)
 * @returns Stringa formattata (es. "1.234.567")
 */
export const formatNumber = (value: number | null | undefined, decimals: number = 0): string => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }
    return new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
};

/**
 * Formatta una percentuale
 * @param value - Il valore da formattare (0-100)
 * @param decimals - Numero di decimali (default 1)
 * @returns Stringa formattata (es. "25,5%")
 */
export const formatPercentage = (value: number | null | undefined, decimals: number = 1): string => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0%';
    }
    return `${formatNumber(value, decimals)}%`;
};

/**
 * Formatta il codice fiscale in formato standard (uppercase, senza spazi)
 * @param cf - Codice fiscale
 * @returns Codice fiscale formattato
 */
export const formatCodiceFiscale = (cf: string | null | undefined): string => {
    if (!cf) return '';
    return cf.toUpperCase().replace(/\s/g, '');
};

/**
 * Formatta la partita IVA in formato standard
 * @param piva - Partita IVA
 * @returns Partita IVA formattata
 */
export const formatPartitaIVA = (piva: string | null | undefined): string => {
    if (!piva) return '';
    // Rimuovi spazi e formatta
    return piva.replace(/\s/g, '');
};
