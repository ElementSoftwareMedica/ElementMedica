/**
 * Utility per la gestione e formattazione delle date nell'importazione persone
 */

import { MONTH_MAP } from './constants';

/**
 * Formatta una data per la visualizzazione (dd/mm/yyyy)
 */
export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    let date: Date;
    
    // Se è già in formato dd/mm/yyyy, restituiscilo così com'è
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const parts = dateString.split('/');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      // Verifica che sia una data valida
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        date = new Date(year, month - 1, day);
        if (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year) {
          return dateString; // È già nel formato corretto
        }
      }
    }
    
    // Se è in formato YYYY-MM-DD, convertilo
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }
    
    // Se è in formato dd-mm-yyyy, convertilo
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
      const parts = dateString.split('-');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        date = new Date(year, month - 1, day);
        if (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year) {
          const dayStr = day.toString().padStart(2, '0');
          const monthStr = month.toString().padStart(2, '0');
          return `${dayStr}/${monthStr}/${year}`;
        }
      }
    }
    
    // Fallback: prova a parsare come Date
    date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    return dateString; // Se non riesce a parsare, restituisce l'originale
  } catch (error) {
    console.warn(`Errore nella formattazione della data: ${dateString}`, error);
    return dateString;
  }
};

/**
 * Valida una data con supporto per più formati
 */
export const isValidDate = (dateString: string): boolean => {
  if (!dateString) return false;
  
  try {
    // Se è in formato dd/mm/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const parts = dateString.split('/');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      // Verifica che i valori siano validi
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        const date = new Date(year, month - 1, day);
        // Verifica che la data creata corrisponda ai valori inseriti
        return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
      }
      return false;
    }
    
    // Se è in formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    }
    
    // Se è in formato dd-mm-yyyy
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
      const parts = dateString.split('-');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
      }
      return false;
    }
    
    // Fallback: prova a parsare direttamente
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

/**
 * Formatta una data per l'API (YYYY-MM-DD)
 */
export const formatDateForAPI = (dateString: string): string => {
  if (!dateString) return '';
  
  // Normalizza la stringa rimuovendo spazi extra
  const cleanDateStr = dateString.toString().trim();
  
  // Prova diversi formati di data
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD (già nel formato corretto)
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // D/M/YYYY o DD/M/YYYY
    /^\d{1,2}-\d{1,2}-\d{4}$/, // D-M-YYYY o DD-M-YYYY
  ];

  // Se è già nel formato YYYY-MM-DD, verifica che sia valido
  if (formats[0].test(cleanDateStr)) {
    const date = new Date(cleanDateStr);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
      return cleanDateStr;
    }
  }

  // Prova gli altri formati
  for (let i = 1; i < formats.length; i++) {
    const format = formats[i];
    if (format.test(cleanDateStr)) {
      let date: Date;
      
      if (cleanDateStr.includes('/')) {
        const parts = cleanDateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          
          // Verifica che i valori siano validi
          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
            date = new Date(year, month - 1, day);
            // Verifica che la data creata corrisponda ai valori inseriti
            if (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year) {
              return date.toISOString().split('T')[0]; // Ritorna YYYY-MM-DD
            }
          }
        }
      } else if (cleanDateStr.includes('-')) {
        // DD-MM-YYYY
        const parts = cleanDateStr.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          
          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
            date = new Date(year, month - 1, day);
            if (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year) {
              return date.toISOString().split('T')[0]; // Ritorna YYYY-MM-DD
            }
          }
        }
      }
    }
  }

  // Fallback: prova a parsare direttamente
  try {
    const date = new Date(cleanDateStr);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
      return date.toISOString().split('T')[0]; // Ritorna YYYY-MM-DD
    }
  } catch {
    console.warn(`Impossibile formattare la data: ${cleanDateStr}`);
  }

  return cleanDateStr; // Ritorna il valore originale se non può essere formattato
};

/**
 * Estrae la data di nascita dal codice fiscale
 */
export const extractBirthDateFromTaxCode = (taxCode: string): string | null => {
  if (!taxCode || taxCode.length !== 16) return null;
  
  try {
    const yearPart = taxCode.substring(6, 8);
    const monthPart = taxCode.substring(8, 9);
    const dayPart = taxCode.substring(9, 11);
    
    const month = MONTH_MAP[monthPart];
    if (!month) return null;
    
    // Determina l'anno (assumendo che anni 00-30 siano 2000-2030, 31-99 siano 1931-1999)
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const year = parseInt(yearPart) <= 30 ? currentCentury + parseInt(yearPart) : currentCentury - 100 + parseInt(yearPart);
    
    // Per le donne, il giorno è aumentato di 40
    let day = parseInt(dayPart);
    if (day > 31) {
      day -= 40;
    }
    
    const dayStr = day.toString().padStart(2, '0');
    
    return `${year}-${month}-${dayStr}`;
  } catch {
    return null;
  }
};