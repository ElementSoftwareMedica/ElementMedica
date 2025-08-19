import { DATE_FORMATS, DateFormatConfig } from '../../types/import/personImportTypes';

/**
 * Servizio per la gestione e formattazione delle date nell'importazione
 */
export class DateFormattingService {
  
  /**
   * Formatta una data per la visualizzazione (dd/mm/yyyy)
   */
  static formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const cleanDateStr = dateString.toString().trim();
      
      // Se è già in formato dd/mm/yyyy, verifica che sia valido
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDateStr)) {
        const parts = cleanDateStr.split('/');
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        // Verifica che sia una data valida
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          const date = new Date(year, month - 1, day);
          if (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year) {
            return cleanDateStr; // È già nel formato corretto
          }
        }
      }
      
      // Prova i diversi formati supportati
      for (const format of DATE_FORMATS) {
        if (format.inputFormat.test(cleanDateStr)) {
          const date = format.parser(cleanDateStr);
          if (date && !isNaN(date.getTime())) {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          }
        }
      }
      
      // Fallback: prova a parsare come Date
      const date = new Date(cleanDateStr);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      
      return cleanDateStr; // Se non riesce a parsare, restituisce l'originale
    } catch (error) {
      console.warn(`Errore nella formattazione della data: ${dateString}`, error);
      return dateString;
    }
  }

  /**
   * Valida una data con supporto per più formati
   */
  static isValidDate(dateString: string): boolean {
    if (!dateString) return false;
    
    try {
      const cleanDateStr = dateString.toString().trim();
      
      // Prova tutti i formati supportati
      for (const format of DATE_FORMATS) {
        if (format.inputFormat.test(cleanDateStr) && format.validator(cleanDateStr)) {
          return true;
        }
      }
      
      // Fallback: prova a parsare direttamente
      const date = new Date(cleanDateStr);
      return !isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100;
    } catch (error) {
      return false;
    }
  }

  /**
   * Formatta una data per l'API (YYYY-MM-DD)
   */
  static formatDateForAPI(dateString: string): string {
    if (!dateString) return '';
    
    const cleanDateStr = dateString.toString().trim();
    
    // Se è già nel formato YYYY-MM-DD, verifica che sia valido
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
      const date = new Date(cleanDateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
        return cleanDateStr;
      }
    }

    // Prova i diversi formati supportati
    for (const format of DATE_FORMATS) {
      if (format.inputFormat.test(cleanDateStr) && format.validator(cleanDateStr)) {
        const date = format.parser(cleanDateStr);
        if (date && !isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]; // Ritorna YYYY-MM-DD
        }
      }
    }

    // Fallback: prova a parsare direttamente
    try {
      const date = new Date(cleanDateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn(`Impossibile formattare la data per l'API: ${dateString}`, error);
    }

    return cleanDateStr; // Se non riesce a convertire, restituisce l'originale
  }

  /**
   * Estrae la data di nascita dal codice fiscale italiano
   */
  static extractBirthDateFromTaxCode(taxCode: string): string | null {
    if (!taxCode || taxCode.length !== 16) {
      return null;
    }

    try {
      const normalizedTaxCode = taxCode.toUpperCase().trim();
      
      // Estrai anno, mese e giorno dal codice fiscale
      const yearPart = normalizedTaxCode.substring(6, 8);
      const monthChar = normalizedTaxCode.substring(8, 9);
      const dayPart = normalizedTaxCode.substring(9, 11);

      // Mappa dei mesi
      const monthMap: { [key: string]: number } = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'H': 6,
        'L': 7, 'M': 8, 'P': 9, 'R': 10, 'S': 11, 'T': 12
      };

      const month = monthMap[monthChar];
      if (!month) {
        return null;
      }

      // Calcola l'anno (assumendo che le persone siano nate tra 1920 e 2020)
      let year = parseInt(yearPart);
      const currentYear = new Date().getFullYear();
      const currentYearLastTwoDigits = currentYear % 100;
      
      if (year <= currentYearLastTwoDigits) {
        year += 2000;
      } else {
        year += 1900;
      }

      // Calcola il giorno (per le donne si aggiunge 40)
      let day = parseInt(dayPart);
      if (day > 31) {
        day -= 40; // È una donna
      }

      // Verifica che la data sia valida
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > currentYear) {
        return null;
      }

      const date = new Date(year, month - 1, day);
      if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
        return null;
      }

      // Ritorna nel formato dd/mm/yyyy
      const dayStr = day.toString().padStart(2, '0');
      const monthStr = month.toString().padStart(2, '0');
      return `${dayStr}/${monthStr}/${year}`;
    } catch (error) {
      console.warn(`Errore nell'estrazione della data dal codice fiscale: ${taxCode}`, error);
      return null;
    }
  }

  /**
   * Normalizza una data in un formato standard
   */
  static normalizeDate(dateString: string): string {
    const formatted = this.formatDateForDisplay(dateString);
    return formatted || dateString;
  }

  /**
   * Verifica se due date sono uguali (indipendentemente dal formato)
   */
  static areDatesEqual(date1: string, date2: string): boolean {
    if (!date1 || !date2) return false;
    
    const normalized1 = this.formatDateForAPI(date1);
    const normalized2 = this.formatDateForAPI(date2);
    
    return normalized1 === normalized2;
  }
}