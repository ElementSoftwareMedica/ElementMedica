/**
 * Validation Utilities - Utility per validazione entità
 * 
 * Collezione di utility per la validazione delle entità,
 * inclusi validatori comuni, regole personalizzate e messaggi di errore.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import { BaseEntity, EntityValidationConfig } from '../types/entity.types';

/**
 * Risultato validazione
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Errore di validazione
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Warning di validazione
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Regola di validazione
 */
export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'phone' | 'custom';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown, entity: unknown) => string | null;
  dependsOn?: string[];
  conditional?: (entity: unknown) => boolean;
}

/**
 * Configurazione validatore
 */
export interface ValidatorConfig {
  rules: ValidationRule[];
  strictMode?: boolean;
  allowUnknownFields?: boolean;
  sanitizeInput?: boolean;
}

/**
 * Classe per gestione validazione
 */
export class ValidationUtils {
  
  /**
   * Valida entità secondo regole specificate
   */
  static validateEntity<T extends BaseEntity>(
    entity: Partial<T>,
    config: ValidatorConfig
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Sanitizza input se richiesto
    let processedEntity = entity;
    if (config.sanitizeInput) {
      processedEntity = this.sanitizeEntity(entity);
    }
    
    // Valida ogni regola
    for (const rule of config.rules) {
      // Verifica condizione se presente
      if (rule.conditional && !rule.conditional(processedEntity)) {
        continue;
      }
      
      const fieldValue = this.getNestedValue(processedEntity, rule.field);
      const fieldErrors = this.validateField(rule.field, fieldValue, rule, processedEntity);
      errors.push(...fieldErrors);
    }
    
    // Verifica campi sconosciuti in strict mode
    if (config.strictMode && !config.allowUnknownFields) {
      const knownFields = new Set(config.rules.map(r => r.field));
      const unknownFields = this.findUnknownFields(processedEntity, knownFields);
      
      for (const field of unknownFields) {
        warnings.push({
          field,
          message: 'Campo non riconosciuto',
          code: 'UNKNOWN_FIELD',
          value: this.getNestedValue(processedEntity, field)
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Valida singolo campo
   */
  private static validateField(
    fieldName: string,
    value: unknown,
    rule: ValidationRule,
    entity: unknown
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Verifica required
    if (rule.required && this.isEmpty(value)) {
      errors.push({
        field: fieldName,
        message: 'Campo obbligatorio',
        code: 'REQUIRED',
        value
      });
      return errors; // Se required e vuoto, non fare altre validazioni
    }
    
    // Se il valore è vuoto e non required, skip altre validazioni
    if (this.isEmpty(value) && !rule.required) {
      return errors;
    }
    
    // Validazione tipo
    if (rule.type) {
      const typeError = this.validateType(fieldName, value, rule.type);
      if (typeError) {
        errors.push(typeError);
        return errors; // Se tipo sbagliato, non fare altre validazioni
      }
    }
    
    // Validazione lunghezza (per stringhe)
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push({
          field: fieldName,
          message: `Lunghezza minima: ${rule.minLength} caratteri`,
          code: 'MIN_LENGTH',
          value
        });
      }
      
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push({
          field: fieldName,
          message: `Lunghezza massima: ${rule.maxLength} caratteri`,
          code: 'MAX_LENGTH',
          value
        });
      }
    }
    
    // Validazione range (per numeri)
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field: fieldName,
          message: `Valore minimo: ${rule.min}`,
          code: 'MIN_VALUE',
          value
        });
      }
      
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field: fieldName,
          message: `Valore massimo: ${rule.max}`,
          code: 'MAX_VALUE',
          value
        });
      }
    }
    
    // Validazione pattern
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push({
          field: fieldName,
          message: 'Formato non valido',
          code: 'INVALID_FORMAT',
          value
        });
      }
    }
    
    // Validazione personalizzata
    if (rule.customValidator) {
      const customError = rule.customValidator(value, entity);
      if (customError) {
        errors.push({
          field: fieldName,
          message: customError,
          code: 'CUSTOM_VALIDATION',
          value
        });
      }
    }
    
    // Verifica dipendenze
    if (rule.dependsOn) {
      for (const dependency of rule.dependsOn) {
        const depValue = this.getNestedValue(entity, dependency);
        if (this.isEmpty(depValue)) {
          errors.push({
            field: fieldName,
            message: `Dipende dal campo: ${dependency}`,
            code: 'DEPENDENCY_MISSING',
            value
          });
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Valida tipo di dato
   */
  private static validateType(
    fieldName: string,
    value: unknown,
    expectedType: ValidationRule['type']
  ): ValidationError | null {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field: fieldName,
            message: 'Deve essere una stringa',
            code: 'INVALID_TYPE',
            value
          };
        }
        break;
        
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field: fieldName,
            message: 'Deve essere un numero',
            code: 'INVALID_TYPE',
            value
          };
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field: fieldName,
            message: 'Deve essere un booleano',
            code: 'INVALID_TYPE',
            value
          };
        }
        break;
        
      case 'date':
        if (!(value instanceof Date) && !this.isValidDateString(value)) {
          return {
            field: fieldName,
            message: 'Deve essere una data valida',
            code: 'INVALID_TYPE',
            value
          };
        }
        break;
        
      case 'email':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          return {
            field: fieldName,
            message: 'Deve essere un email valido',
            code: 'INVALID_EMAIL',
            value
          };
        }
        break;
        
      case 'url':
        if (typeof value !== 'string' || !this.isValidUrl(value)) {
          return {
            field: fieldName,
            message: 'Deve essere un URL valido',
            code: 'INVALID_URL',
            value
          };
        }
        break;
        
      case 'phone':
        if (typeof value !== 'string' || !this.isValidPhone(value)) {
          return {
            field: fieldName,
            message: 'Deve essere un numero di telefono valido',
            code: 'INVALID_PHONE',
            value
          };
        }
        break;
    }
    
    return null;
  }
  
  /**
   * Verifica se un valore è vuoto
   */
  private static isEmpty(value: unknown): boolean {
    return value === null || 
           value === undefined || 
           value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
  }
  
  /**
   * Verifica se una stringa è una data valida
   */
  private static isValidDateString(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  
  /**
   * Verifica se una stringa è un email valido
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Verifica se una stringa è un URL valido
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Verifica se una stringa è un numero di telefono valido
   */
  private static isValidPhone(phone: string): boolean {
    // Pattern semplificato per numeri di telefono internazionali
    const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    return phoneRegex.test(cleanPhone);
  }
  
  /**
   * Ottieni valore nested da oggetto
   */
  private static getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && current !== null) {
        const objCurrent = current as Record<string, unknown>;
        return objCurrent[key] !== undefined ? objCurrent[key] : undefined;
      }
      return undefined;
    }, obj);
  }
  
  /**
   * Trova campi sconosciuti
   */
  private static findUnknownFields(obj: unknown, knownFields: Set<string>): string[] {
    const unknownFields: string[] = [];
    
    const traverse = (current: unknown, prefix: string = '') => {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        const objCurrent = current as Record<string, unknown>;
        Object.keys(objCurrent).forEach(key => {
          const fullPath = prefix ? `${prefix}.${key}` : key;
          
          if (!knownFields.has(fullPath)) {
            unknownFields.push(fullPath);
          }
          
          // Ricorsione per oggetti nested
          if (typeof objCurrent[key] === 'object' && objCurrent[key] !== null) {
            traverse(objCurrent[key], fullPath);
          }
        });
      }
    };
    
    traverse(obj);
    return unknownFields;
  }
  
  /**
   * Sanitizza entità rimuovendo caratteri pericolosi
   */
  private static sanitizeEntity<T>(entity: T): T {
    const sanitized = JSON.parse(JSON.stringify(entity));
    
    const sanitizeValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        return value
          .replace(/<script[^>]*>.*?<\/script>/gi, '') // Rimuovi script tags
          .replace(/<[^>]*>/g, '') // Rimuovi HTML tags
          .replace(/javascript:/gi, '') // Rimuovi javascript: URLs
          .replace(/on\w+\s*=/gi, '') // Rimuovi event handlers
          .trim();
      }
      
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      
      if (value && typeof value === 'object') {
        const sanitizedObj: Record<string, unknown> = {};
        Object.keys(value as Record<string, unknown>).forEach(key => {
          sanitizedObj[key] = sanitizeValue((value as Record<string, unknown>)[key]);
        });
        return sanitizedObj;
      }
      
      return value;
    };
    
    return sanitizeValue(sanitized) as T;
  }
  
  /**
   * Crea validatore per entità specifica
   */
  static createEntityValidator<T extends BaseEntity>(
    config: EntityValidationConfig
  ): (entity: Partial<T>) => ValidationResult {
    const validatorConfig: ValidatorConfig = {
      rules: Array.isArray(config.rules) ? config.rules : [],
      strictMode: config.strictMode || false,
      allowUnknownFields: true, // Default value
      sanitizeInput: false // Default value
    };
    
    return (entity: Partial<T>) => {
      return this.validateEntity(entity, validatorConfig);
    };
  }
  
  /**
   * Validatori predefiniti comuni
   */
  static getCommonValidators(): { [key: string]: ValidationRule } {
    return {
      // ID
      id: {
        field: 'id',
        type: 'string',
        required: false,
        pattern: /^[a-zA-Z0-9_-]+$/
      },
      
      // Nome
      name: {
        field: 'name',
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-ZÀ-ÿ\s\-']+$/
      },
      
      // Email
      email: {
        field: 'email',
        type: 'email',
        required: true,
        maxLength: 255
      },
      
      // Telefono
      phone: {
        field: 'phone',
        type: 'phone',
        required: false
      },
      
      // Data di nascita
      birthDate: {
        field: 'birthDate',
        type: 'date',
        required: false,
        customValidator: (value) => {
          if (!value) return null;
          const date = new Date(value as string | number | Date);
          const now = new Date();
          const age = now.getFullYear() - date.getFullYear();
          
          if (age < 0 || age > 150) {
            return 'Data di nascita non valida';
          }
          
          return null;
        }
      },
      
      // Codice fiscale italiano
      codiceFiscale: {
        field: 'codiceFiscale',
        type: 'string',
        required: false,
        pattern: /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/,
        customValidator: (value) => {
          if (!value) return null;
          const strValue = String(value);
          // Qui si potrebbe implementare la validazione completa del codice fiscale
          return strValue.length === 16 ? null : 'Codice fiscale deve essere di 16 caratteri';
        }
      },
      
      // Partita IVA italiana
      partitaIva: {
        field: 'partitaIva',
        type: 'string',
        required: false,
        pattern: /^[0-9]{11}$/,
        customValidator: (value) => {
          if (!value) return null;
          const strValue = String(value);
          // Implementazione semplificata controllo P.IVA
          if (strValue.length !== 11) return 'Partita IVA deve essere di 11 cifre';
          
          // Algoritmo di controllo P.IVA
          let sum = 0;
          for (let i = 0; i < 10; i++) {
            let digit = parseInt(strValue[i]);
            if (i % 2 === 1) {
              digit *= 2;
              if (digit > 9) digit -= 9;
            }
            sum += digit;
          }
          
          const checkDigit = (10 - (sum % 10)) % 10;
          return checkDigit === parseInt(strValue[10]) ? null : 'Partita IVA non valida';
        }
      },
      
      // URL
      website: {
        field: 'website',
        type: 'url',
        required: false
      },
      
      // Descrizione
      description: {
        field: 'description',
        type: 'string',
        required: false,
        maxLength: 1000
      },
      
      // Status
      status: {
        field: 'status',
        type: 'string',
        required: true,
        customValidator: (value) => {
          const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
          const strValue = String(value);
          return validStatuses.includes(strValue) ? null : `Status deve essere uno di: ${validStatuses.join(', ')}`;
        }
      },
      
      // Date di sistema
      createdAt: {
        field: 'createdAt',
        type: 'date',
        required: false
      },
      
      updatedAt: {
        field: 'updatedAt',
        type: 'date',
        required: false
      }
    };
  }
  
  /**
   * Formatta errori per display
   */
  static formatErrors(errors: ValidationError[]): string[] {
    return errors.map(error => {
      const fieldName = error.field.split('.').pop() || error.field;
      return `${fieldName}: ${error.message}`;
    });
  }
  
  /**
   * Raggruppa errori per campo
   */
  static groupErrorsByField(errors: ValidationError[]): { [field: string]: ValidationError[] } {
    return errors.reduce((groups, error) => {
      const field = error.field;
      if (!groups[field]) {
        groups[field] = [];
      }
      groups[field].push(error);
      return groups;
    }, {} as { [field: string]: ValidationError[] });
  }
}

/**
 * Costanti per validazione
 */
export const VALIDATION_CONSTANTS = {
  // Lunghezze comuni
  LENGTHS: {
    SHORT_TEXT: { min: 1, max: 50 },
    MEDIUM_TEXT: { min: 1, max: 255 },
    LONG_TEXT: { min: 1, max: 1000 },
    DESCRIPTION: { min: 0, max: 2000 },
    NAME: { min: 2, max: 100 },
    EMAIL: { min: 5, max: 255 },
    PHONE: { min: 8, max: 20 }
  },
  
  // Pattern comuni
  PATTERNS: {
    ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
    ALPHANUMERIC_SPACES: /^[a-zA-Z0-9\s]+$/,
    LETTERS_ONLY: /^[a-zA-ZÀ-ÿ]+$/,
    LETTERS_SPACES: /^[a-zA-ZÀ-ÿ\s\-']+$/,
    NUMBERS_ONLY: /^[0-9]+$/,
    DECIMAL: /^\d+(\.\d{1,2})?$/,
    ITALIAN_POSTAL_CODE: /^[0-9]{5}$/,
    ITALIAN_PHONE: /^[+]?39[\s]?[0-9]{2,3}[\s]?[0-9]{6,7}$/
  },
  
  // Messaggi di errore
  MESSAGES: {
    REQUIRED: 'Campo obbligatorio',
    INVALID_EMAIL: 'Email non valido',
    INVALID_PHONE: 'Numero di telefono non valido',
    INVALID_URL: 'URL non valido',
    INVALID_DATE: 'Data non valida',
    MIN_LENGTH: 'Lunghezza minima non rispettata',
    MAX_LENGTH: 'Lunghezza massima superata',
    MIN_VALUE: 'Valore minimo non rispettato',
    MAX_VALUE: 'Valore massimo superato',
    INVALID_FORMAT: 'Formato non valido'
  }
};

export default ValidationUtils;