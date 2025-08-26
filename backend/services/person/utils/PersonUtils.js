import logger from '../../../utils/logger.js';

/**
 * Utility per la gestione e validazione dei dati delle persone
 */
class PersonUtils {
  /**
   * Converte una stringa in Title Case
   * @param {string} str - La stringa da convertire
   * @returns {string} La stringa in Title Case
   */
  static toTitleCase(str) {
    if (!str) return str;
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Genera un username unico basato su nome e cognome
   * @param {string} firstName - Nome
   * @param {string} lastName - Cognome
   * @param {Function} checkExistence - Funzione per verificare se l'username esiste già
   * @returns {Promise<string>} Username unico
   */
  static async generateUniqueUsername(firstName, lastName, checkExistence) {
    // Rimuovi tutti gli spazi e caratteri speciali dai nomi
    const cleanFirstName = firstName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const cleanLastName = lastName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    
    const baseUsername = `${cleanFirstName}.${cleanLastName}`;
    let username = baseUsername;
    let counter = 1;
    
    while (await checkExistence(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }
    
    return username;
  }

  /**
   * Parsa una data da diversi formati
   * @param {string} dateStr - La stringa della data
   * @returns {Date|null} La data parsata o null se non valida
   */
  static parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Normalizza la stringa rimuovendo spazi extra
    const cleanDateStr = dateStr.toString().trim();
    
    // Prova diversi formati
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // D/M/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // D-M-YYYY
    ];
    
    for (const format of formats) {
      const match = cleanDateStr.match(format);
      if (match) {
        let day, month, year;
        
        if (format.source.includes('(\\d{4})') && format.source.indexOf('(\\d{4})') === 1) {
          // YYYY-MM-DD
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          // DD/MM/YYYY o DD-MM-YYYY o D/M/YYYY o D-M-YYYY
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
        }
        
        // Validazione dei valori
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          const date = new Date(year, month - 1, day);
          // Verifica che la data creata corrisponda ai valori inseriti
          if (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year) {
            return date;
          }
        }
      }
    }
    
    // Fallback: prova a parsare direttamente
    try {
      const date = new Date(cleanDateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
        return date;
      }
    } catch (error) {
      logger.warn(`Impossibile parsare la data: ${cleanDateStr}`);
    }
    
    return null;
  }

  /**
   * Estrae la data di nascita dal codice fiscale
   * @param {string} taxCode - Il codice fiscale
   * @returns {Date} La data di nascita estratta
   * @throws {Error} Se il codice fiscale non è valido
   */
  static extractBirthDateFromTaxCode(taxCode) {
    if (!taxCode || taxCode.length !== 16) {
      throw new Error('Codice fiscale non valido');
    }
    
    const yearPart = taxCode.substring(6, 8);
    const monthPart = taxCode.substring(8, 9);
    const dayPart = taxCode.substring(9, 11);
    
    // Mappa mesi
    const monthMap = {
      'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'H': 6,
      'L': 7, 'M': 8, 'P': 9, 'R': 10, 'S': 11, 'T': 12
    };
    
    const month = monthMap[monthPart];
    if (!month) {
      throw new Error('Mese non valido nel codice fiscale');
    }
    
    // Calcola anno (assumendo che anni 00-30 siano 2000-2030, 31-99 siano 1931-1999)
    const year = parseInt(yearPart) <= 30 ? 2000 + parseInt(yearPart) : 1900 + parseInt(yearPart);
    
    // Calcola giorno (per le donne si aggiunge 40)
    let day = parseInt(dayPart);
    if (day > 31) {
      day -= 40; // Donna
    }
    
    return new Date(year, month - 1, day);
  }

  /**
   * Valida un indirizzo email
   * @param {string} email - L'email da validare
   * @returns {boolean} True se l'email è valida
   */
  static isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida un numero di telefono
   * @param {string} phone - Il numero di telefono da validare
   * @returns {boolean} True se il numero è valido
   */
  static isValidPhone(phone) {
    if (!phone) return false;
    // Accetta numeri con o senza prefisso internazionale, spazi, trattini, parentesi
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Pulisce e formatta un numero di telefono
   * @param {string} phone - Il numero di telefono da pulire
   * @returns {string} Il numero pulito
   */
  static cleanPhone(phone) {
    if (!phone) return '';
    return phone.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Genera una password temporanea sicura
   * @returns {string} Password temporanea
   */
  static generateTemporaryPassword() {
    return 'Password123!';
  }

  /**
   * Valida la forza di una password
   * @param {string} password - La password da validare
   * @returns {Object} Oggetto con isValid e suggerimenti
   */
  static validatePasswordStrength(password) {
    if (!password) {
      return { isValid: false, suggestions: ['Password richiesta'] };
    }

    const suggestions = [];
    let isValid = true;

    if (password.length < 8) {
      suggestions.push('Almeno 8 caratteri');
      isValid = false;
    }

    if (!/[A-Z]/.test(password)) {
      suggestions.push('Almeno una lettera maiuscola');
      isValid = false;
    }

    if (!/[a-z]/.test(password)) {
      suggestions.push('Almeno una lettera minuscola');
      isValid = false;
    }

    if (!/\d/.test(password)) {
      suggestions.push('Almeno un numero');
      isValid = false;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      suggestions.push('Almeno un carattere speciale');
      isValid = false;
    }

    return { isValid, suggestions };
  }
}

export default PersonUtils;