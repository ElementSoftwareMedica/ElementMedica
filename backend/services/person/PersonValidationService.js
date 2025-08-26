import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

/**
 * Servizio per la validazione dei dati delle persone
 * Estratto da personService.js per migliorare la modularità
 */
class PersonValidationService {
  
  /**
   * Valida i dati di una persona
   * @param {Object} personData - Dati della persona da validare
   * @returns {Object} - Risultato della validazione con errori se presenti
   */
  static validatePersonData(personData) {
    const errors = [];
    
    // Validazione campi obbligatori
    if (!personData.firstName || personData.firstName.trim() === '') {
      errors.push('Nome è obbligatorio');
    }
    
    if (!personData.lastName || personData.lastName.trim() === '') {
      errors.push('Cognome è obbligatorio');
    }
    
    // Validazione email se presente
    if (personData.email && !this.isValidEmail(personData.email)) {
      errors.push('Email non valida');
    }
    
    // Validazione codice fiscale se presente
    if (personData.codiceFiscale && !this.isValidCodiceFiscale(personData.codiceFiscale)) {
      errors.push('Codice fiscale non valido');
    }
    
    // Validazione data di nascita se presente
    if (personData.dateOfBirth && !this.isValidDate(personData.dateOfBirth)) {
      errors.push('Data di nascita non valida');
    }
    
    // Validazione username se presente
    if (personData.username && !this.isValidUsername(personData.username)) {
      errors.push('Username non valido (solo lettere, numeri, punti e underscore)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Valida formato email
   * @param {string} email - Email da validare
   * @returns {boolean} - True se valida
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Valida codice fiscale italiano
   * @param {string} codiceFiscale - Codice fiscale da validare
   * @returns {boolean} - True se valido
   */
  static isValidCodiceFiscale(codiceFiscale) {
    if (!codiceFiscale || typeof codiceFiscale !== 'string') {
      return false;
    }
    
    // Rimuovi spazi e converti in maiuscolo
    const cf = codiceFiscale.replace(/\s/g, '').toUpperCase();
    
    // Verifica lunghezza
    if (cf.length !== 16) {
      return false;
    }
    
    // Verifica formato base (15 caratteri alfanumerici + 1 carattere di controllo)
    const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    if (!cfRegex.test(cf)) {
      return false;
    }
    
    // Calcolo carattere di controllo
    const oddChars = 'BAFHJNPRTVCESULDGIMOQKWZYX';
    const evenChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const controlChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    let sum = 0;
    
    // Somma caratteri in posizione dispari (1, 3, 5, ...)
    for (let i = 0; i < 15; i += 2) {
      const char = cf[i];
      if (char >= '0' && char <= '9') {
        sum += oddChars.indexOf(String.fromCharCode(65 + parseInt(char)));
      } else {
        sum += oddChars.indexOf(char);
      }
    }
    
    // Somma caratteri in posizione pari (2, 4, 6, ...)
    for (let i = 1; i < 15; i += 2) {
      const char = cf[i];
      if (char >= '0' && char <= '9') {
        sum += parseInt(char);
      } else {
        sum += evenChars.indexOf(char);
      }
    }
    
    const expectedControl = controlChars[sum % 26];
    return cf[15] === expectedControl;
  }
  
  /**
   * Valida formato data
   * @param {string|Date} date - Data da validare
   * @returns {boolean} - True se valida
   */
  static isValidDate(date) {
    if (!date) return false;
    
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  }
  
  /**
   * Valida formato username
   * @param {string} username - Username da validare
   * @returns {boolean} - True se valido
   */
  static isValidUsername(username) {
    if (!username || typeof username !== 'string') {
      return false;
    }
    
    // Username deve essere lungo almeno 3 caratteri e contenere solo lettere, numeri, punti e underscore
    const usernameRegex = /^[a-zA-Z0-9._]{3,}$/;
    return usernameRegex.test(username);
  }
  
  /**
   * Verifica disponibilità username
   * @param {string} username - Username da verificare
   * @param {string} excludePersonId - ID persona da escludere dal controllo
   * @returns {Promise<boolean>} - True se disponibile
   */
  static async isUsernameAvailable(username, excludePersonId = null) {
    try {
      const where = { username };
      if (excludePersonId) {
        where.id = { not: excludePersonId };
      }
      
      const existingPerson = await prisma.person.findFirst({ where });
      return !existingPerson;
    } catch (error) {
      logger.error('Error checking username availability:', { error: error.message, username });
      throw error;
    }
  }
  
  /**
   * Verifica disponibilità email
   * @param {string} email - Email da verificare
   * @param {string} excludePersonId - ID persona da escludere dal controllo
   * @returns {Promise<boolean>} - True se disponibile
   */
  static async isEmailAvailable(email, excludePersonId = null) {
    try {
      if (!email) return true; // Email opzionale
      
      const where = { email };
      if (excludePersonId) {
        where.id = { not: excludePersonId };
      }
      
      const existingPerson = await prisma.person.findFirst({ where });
      return !existingPerson;
    } catch (error) {
      logger.error('Error checking email availability:', { error: error.message, email });
      throw error;
    }
  }
  
  /**
   * Valida e normalizza i dati di una persona prima del salvataggio
   * @param {Object} personData - Dati della persona
   * @returns {Object} - Dati normalizzati
   */
  static normalizePersonData(personData) {
    const normalized = { ...personData };
    
    // Normalizza nomi (prima lettera maiuscola)
    if (normalized.firstName) {
      normalized.firstName = this.capitalizeFirstLetter(normalized.firstName.trim());
    }
    
    if (normalized.lastName) {
      normalized.lastName = this.capitalizeFirstLetter(normalized.lastName.trim());
    }
    
    // Normalizza email (minuscolo)
    if (normalized.email) {
      normalized.email = normalized.email.toLowerCase().trim();
    }
    
    // Normalizza codice fiscale (maiuscolo, senza spazi)
    if (normalized.codiceFiscale) {
      normalized.codiceFiscale = normalized.codiceFiscale.replace(/\s/g, '').toUpperCase();
    }
    
    // Normalizza username (minuscolo)
    if (normalized.username) {
      normalized.username = normalized.username.toLowerCase().trim();
    }
    
    // Mappa il campo address a residenceAddress per compatibilità con il database schema
    if (normalized.address !== undefined) {
      normalized.residenceAddress = normalized.address;
      delete normalized.address;
    }
    
    return normalized;
  }
  
  /**
   * Capitalizza la prima lettera di una stringa
   * @param {string} str - Stringa da capitalizzare
   * @returns {string} - Stringa capitalizzata
   */
  static capitalizeFirstLetter(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

export default PersonValidationService;