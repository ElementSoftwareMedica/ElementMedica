import { type ClassValue, clsx } from "clsx"
/**
 * Utility generiche per il progetto
 * 
 * Questo file contiene funzioni di utilità generica utilizzate in tutta l'applicazione.
 * Quando aggiungi nuove funzioni, assicurati di documentarle adeguatamente con JSDoc.
 * 
 * NOTA: La funzione cn() è stata spostata in design-system/utils/index.ts
 * per centralizzare le utility del design system.
 */

// formatDate and capitalizeWords migrated to design-system/utils/index.ts
// Use: import { formatDate, capitalizeWords } from '../design-system/utils';

/**
 * Formatta un numero come valuta in Euro
 * @param value - Valore numerico da formattare
 * @param decimals - Numero di decimali da visualizzare
 * @returns Stringa formattata come valuta (es. "€ 1.234,56")
 */
export function formatCurrency(value: number, decimals = 2): string {
  if (value === undefined || value === null) return '';
  
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formatta un codice fiscale italiano in modo leggibile con spazi
 * (RSSMRA80A01H501Z -> RSS MRA 80A01 H501Z)
 * @param cf - Codice fiscale da formattare
 * @returns Codice fiscale formattato con spazi
 */
export function formatCodiceFiscale(cf: string): string {
  if (!cf || cf.length !== 16) return cf || '';
  
  return `${cf.substring(0, 3)} ${cf.substring(3, 6)} ${cf.substring(6, 8)}${cf.substring(8, 10)} ${cf.substring(10, 15)}${cf.substring(15)}`.toUpperCase();
}

/**
 * Verifica se un codice fiscale italiano è formalmente valido
 * @param cf - Codice fiscale da validare
 * @param checkChecksum - Se true, verifica anche il carattere di controllo (default: true)
 * @returns True se il formato è valido, false altrimenti
 */
export function isValidCodiceFiscale(cf: string, checkChecksum = true): boolean {
  if (!cf) return false;
  
  const normalizedCf = cf.toUpperCase().trim();
  
  // Verifica lunghezza
  if (normalizedCf.length !== 16) return false;
  
  // Regex corretto per il codice fiscale italiano
  // Considera i caratteri validi per il mese: A,B,C,D,E,H,L,M,P,R,S,T
  const regex = /^[A-Z]{6}[0-9]{2}[ABCDEHLMPRST][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  
  if (!regex.test(normalizedCf)) return false;
  
  // Verifica carattere di controllo se richiesto
  if (checkChecksum) {
    return isValidTaxCodeChecksum(normalizedCf);
  }
  
  return true;
}

/**
 * Verifica il carattere di controllo del codice fiscale
 * @param taxCode - Codice fiscale normalizzato (16 caratteri maiuscoli)
 * @returns True se il carattere di controllo è corretto
 */
function isValidTaxCodeChecksum(taxCode: string): boolean {
  const oddMap: { [key: string]: number } = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
  };

  const evenMap: { [key: string]: number } = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
    'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
  };

  const checkMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = taxCode[i];
    if (i % 2 === 0) {
      sum += oddMap[char] || 0;
    } else {
      sum += evenMap[char] || 0;
    }
  }

  const expectedCheck = checkMap[sum % 26];
  return taxCode[15] === expectedCheck;
}

/**
 * Genera un ID univoco
 * @returns Stringa con ID univoco
 */
export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Crea un insieme di classi CSS condizionali
 * @param classes - Oggetto con classi come chiavi e condizioni booleane come valori
 * @returns Stringa con le classi separate da spazio
 */
export function classNames(...classes: (string | Record<string, boolean> | undefined)[]): string {
  const result: string[] = [];
  
  classes.forEach(cls => {
    if (!cls) return;
    
    if (typeof cls === 'string') {
      result.push(cls);
    } else {
      Object.entries(cls).forEach(([className, condition]) => {
        if (condition) {
          result.push(className);
        }
      });
    }
  });
  
  return result.join(' ');
}

/**
 * Abbrevia un testo se supera la lunghezza massima
 * @param text - Testo da abbreviare
 * @param maxLength - Lunghezza massima
 * @param suffix - Suffisso da aggiungere (default: "...")
 * @returns Testo abbreviato
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (!text || text.length <= maxLength) return text || '';
  
  return text.substring(0, maxLength) + suffix;
}

/**
 * Genera un nome completo combinando nome e cognome
 * @param firstName - Nome
 * @param lastName - Cognome
 * @returns Nome completo formattato
 */
export function formatFullName(firstName: string, lastName: string): string {
  if (!firstName && !lastName) return '';
  
  return [firstName, lastName].filter(Boolean).join(' ');
}

/**
 * Formatta un numero di telefono italiano
 * @param phoneNumber - Numero di telefono da formattare
 * @returns Numero di telefono formattato
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Rimuove tutti i caratteri non numerici
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Formatta in base alla lunghezza
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  
  return phoneNumber;
}

/**
 * Calcola la differenza in giorni tra due date
 * @param startDate - Data di inizio
 * @param endDate - Data di fine
 * @returns Numero di giorni di differenza
 */
export function daysBetweenDates(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calcola la differenza in millisecondi e converte in giorni
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se un valore è vuoto (null, undefined, stringa vuota, array vuoto, oggetto vuoto)
 * @param value - Valore da verificare
 * @returns True se il valore è vuoto, false altrimenti
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  
  return false;
}

/**
 * Filtra un array di oggetti in base a una stringa di ricerca su proprietà specifiche
 * @param items - Array di oggetti da filtrare
 * @param searchTerm - Termine di ricerca
 * @param searchFields - Array di proprietà su cui cercare
 * @returns Array filtrato
 */
export function filterItemsBySearchTerm<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm || !searchFields.length) return items;
  
  const normalizedSearchTerm = searchTerm.toLowerCase().trim();
  
  return items.filter(item => {
    return searchFields.some(field => {
      const value = item[field];
      if (value === null || value === undefined) return false;
      
      return String(value).toLowerCase().includes(normalizedSearchTerm);
    });
  });
}

/**
 * Formatta una durata in ore e minuti
 * @param durationInMinutes - Durata in minuti
 * @returns Durata formattata (es. "2h 30m")
 */
export function formatDuration(durationInMinutes: number): string {
  if (!durationInMinutes && durationInMinutes !== 0) return '';
  
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
}

/**
 * Raggruppa un array di oggetti per una proprietà specifica
 * @param items - Array di oggetti da raggruppare
 * @param key - Chiave per il raggruppamento
 * @returns Oggetto con gli elementi raggruppati
 */
export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((result, item) => {
    const groupKey = String(item[key]);
    
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Esegue un deep clone di un oggetto
 * @param obj - Oggetto da clonare
 * @returns Clone profondo dell'oggetto
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  return JSON.parse(JSON.stringify(obj));
}

export default {
  // formatDate, capitalizeWords migrated to design-system/utils/index.ts
  formatCurrency,
  formatCodiceFiscale,
  isValidCodiceFiscale,
  generateUniqueId,
  classNames,
  truncateText,
  formatFullName,
  formatPhoneNumber,
  daysBetweenDates,
  isEmpty,
  filterItemsBySearchTerm,
  formatDuration,
  groupBy,
  deepClone
};