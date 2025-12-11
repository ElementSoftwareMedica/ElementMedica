/**
 * @file importValidation.js
 * @description Utilità condivise per validazione import CSV
 * Centralizza la logica di validazione usata da Company/Employee/Trainer import
 */

import logger from '../logger.js';

/**
 * Normalizza e valida Codice Fiscale italiano
 * @param {string} cf - Codice Fiscale da validare
 * @returns {{ valid: boolean, normalized: string, error?: string }}
 */
function validateTaxCode(cf) {
  if (!cf) {
    return { valid: false, normalized: '', error: 'Codice fiscale mancante' };
  }

  const normalized = cf.toString().trim().toUpperCase();

  // Verifica lunghezza (16 caratteri per CF persone fisiche)
  if (normalized.length !== 16) {
    return { 
      valid: false, 
      normalized, 
      error: `Codice fiscale deve essere di 16 caratteri (fornito: ${normalized.length})` 
    };
  }

  // Verifica formato: 6 lettere, 2 numeri, 1 lettera, 2 numeri, 1 lettera, 3 numeri, 1 lettera
  const cfRegex = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
  if (!cfRegex.test(normalized)) {
    return { 
      valid: false, 
      normalized, 
      error: 'Formato codice fiscale non valido' 
    };
  }

  return { valid: true, normalized };
}

/**
 * Normalizza e valida Partita IVA italiana
 * @param {string} piva - Partita IVA da validare
 * @returns {{ valid: boolean, normalized: string, error?: string }}
 */
function validateVATNumber(piva) {
  if (!piva) {
    return { valid: false, normalized: '', error: 'Partita IVA mancante' };
  }

  const normalized = piva.toString().trim();

  // Rimuovi eventuali prefissi IT
  const cleanPiva = normalized.replace(/^IT/i, '');

  // Verifica lunghezza (11 cifre)
  if (cleanPiva.length !== 11) {
    return { 
      valid: false, 
      normalized: cleanPiva, 
      error: `Partita IVA deve essere di 11 cifre (fornito: ${cleanPiva.length})` 
    };
  }

  // Verifica che siano solo numeri
  if (!/^\d{11}$/.test(cleanPiva)) {
    return { 
      valid: false, 
      normalized: cleanPiva, 
      error: 'Partita IVA deve contenere solo numeri' 
    };
  }

  // Validazione checksum P.IVA (algoritmo Luhn modificato)
  const digits = cleanPiva.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 10; i++) {
    let digit = digits[i];
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  
  if (checkDigit !== digits[10]) {
    return { 
      valid: false, 
      normalized: cleanPiva, 
      error: 'Partita IVA non valida (checksum errato)' 
    };
  }

  return { valid: true, normalized: cleanPiva };
}

/**
 * Normalizza email (lowercase + trim)
 * @param {string} email - Email da normalizzare
 * @returns {string}
 */
function normalizeEmail(email) {
  if (!email) return '';
  return email.toString().trim().toLowerCase();
}

/**
 * Valida formato email
 * @param {string} email - Email da validare
 * @returns {{ valid: boolean, error?: string }}
 */
function validateEmail(email) {
  if (!email) {
    return { valid: false, error: 'Email mancante' };
  }

  const normalized = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalized)) {
    return { valid: false, error: 'Formato email non valido' };
  }

  return { valid: true };
}

/**
 * Rileva duplicati in un array basato su una chiave
 * @param {Array} items - Array di oggetti
 * @param {string} key - Chiave per rilevare duplicati
 * @returns {Array<{item: any, duplicateIndexes: number[]}>}
 */
function detectDuplicates(items, key) {
  const seen = new Map();
  const duplicates = [];

  items.forEach((item, index) => {
    const value = item[key];
    if (!value) return;

    const normalized = typeof value === 'string' 
      ? value.toString().trim().toUpperCase() 
      : value;

    if (seen.has(normalized)) {
      const firstIndex = seen.get(normalized);
      duplicates.push({
        item,
        index,
        duplicateOf: firstIndex,
        key,
        value: normalized
      });
    } else {
      seen.set(normalized, index);
    }
  });

  return duplicates;
}

/**
 * Trova conflitti con entità esistenti
 * @param {Array} newItems - Nuovi item da importare
 * @param {Array} existingItems - Item esistenti nel database
 * @param {string} uniqueKey - Chiave univoca per confronto
 * @returns {Map<number, object>} - Map di conflitti (index -> existing item)
 */
function findConflicts(newItems, existingItems, uniqueKey, existingKey = null) {
  const conflicts = new Map();
  
  // Se existingKey non specificato, usa uniqueKey
  const lookupKey = existingKey || uniqueKey;

  // Crea mappa degli item esistenti per lookup veloce
  const existingMap = new Map();
  existingItems.forEach(item => {
    const value = item[lookupKey];
    if (!value) return;
    
    const normalized = typeof value === 'string'
      ? value.toString().trim().toUpperCase()
      : value;
    
    existingMap.set(normalized, item);
  });

  // Trova conflitti
  newItems.forEach((newItem, index) => {
    const value = newItem[uniqueKey];
    if (!value) return;

    const normalized = typeof value === 'string'
      ? value.toString().trim().toUpperCase()
      : value;

    if (existingMap.has(normalized)) {
      conflicts.set(index, {
        existingItem: existingMap.get(normalized),
        newItem,
        conflictKey: uniqueKey,
        conflictValue: normalized
      });
    }
  });

  return conflicts;
}

/**
 * Formatta errori di validazione per risposta API
 * @param {Array<{row: number, field: string, error: string}>} errors
 * @returns {Object}
 */
function formatValidationErrors(errors) {
  return {
    success: false,
    message: `Trovati ${errors.length} errori di validazione`,
    errors: errors.map(e => ({
      row: e.row + 1, // +1 per numero riga user-friendly
      field: e.field,
      message: e.error
    }))
  };
}

/**
 * Valida row generica con campi required
 * @param {Object} row - Riga da validare
 * @param {Array<string>} requiredFields - Campi obbligatori
 * @param {number} rowIndex - Indice riga (per error reporting)
 * @returns {Array<{row: number, field: string, error: string}>}
 */
function validateRequiredFields(row, requiredFields, rowIndex) {
  const errors = [];

  requiredFields.forEach(field => {
    if (!row[field] || row[field].toString().trim() === '') {
      errors.push({
        row: rowIndex,
        field,
        error: `Campo obbligatorio mancante: ${field}`
      });
    }
  });

  return errors;
}

export {
  validateTaxCode,
  validateVATNumber,
  normalizeEmail,
  validateEmail,
  detectDuplicates,
  findConflicts,
  formatValidationErrors,
  validateRequiredFields
};
