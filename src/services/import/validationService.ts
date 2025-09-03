import { PersonData, ImportValidationResult } from '../../types/import/personImportTypes';
import { DateFormattingService } from './dateFormattingService';
import { CsvMappingService } from './csvMappingService';
import { isValidCodiceFiscale } from '../../lib/utils';

/**
 * Servizio per la validazione dei dati delle persone durante l'importazione
 */
export class ValidationService {

  /**
   * Valida una singola persona
   */
  static validatePerson(person: PersonData): string[] {
    const errors: string[] = [];

    // Controlla se è un template vuoto
    if (CsvMappingService.isEmptyTemplate(person)) {
      return errors; // Non validare template vuoti
    }

    // Validazione campi obbligatori
    if (!person.firstName?.trim()) {
      errors.push('Nome è obbligatorio');
    }

    if (!person.lastName?.trim()) {
      errors.push('Cognome è obbligatorio');
    }

    if (!person.taxCode?.trim()) {
      errors.push('Codice fiscale è obbligatorio');
    } else if (!isValidCodiceFiscale(person.taxCode)) {
      errors.push('Formato codice fiscale non valido');
    }

    // Validazione email se presente
    if (person.email && !this.isValidEmail(person.email)) {
      errors.push('Formato email non valido');
    }

    // Validazione data di nascita se presente
    if (person.birthDate && !DateFormattingService.isValidDate(person.birthDate)) {
      errors.push('Formato data di nascita non valido');
    }

    // Validazione telefono se presente
    if (person.phone && !this.isValidPhone(person.phone)) {
      errors.push('Formato telefono non valido');
    }

    // Validazione CAP se presente
    if (person.postalCode && !this.isValidPostalCode(person.postalCode)) {
      errors.push('Formato CAP non valido');
    }

    return errors;
  }

  /**
   * Valida un array di persone
   */
  static validatePersons(persons: PersonData[]): ImportValidationResult {
    const errors: ImportValidationResult = {};
    
    persons.forEach((person, index) => {
      // Estrae la data di nascita dal codice fiscale se non presente
      if (person.taxCode && !person.birthDate) {
        const extractedDate = DateFormattingService.extractBirthDateFromTaxCode(person.taxCode);
        if (extractedDate) {
          person.birthDate = extractedDate;
        }
      }
      
      // Formatta la data di nascita per la visualizzazione
      if (person.birthDate) {
        person.birthDate = DateFormattingService.formatDateForDisplay(person.birthDate);
      }
      
      const personErrors = this.validatePerson(person);
      if (personErrors.length > 0) {
        errors[index] = personErrors;
      }
    });
    
    return errors;
  }



  /**
   * Valida il formato email
   */
  static isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Valida il formato telefono
   */
  static isValidPhone(phone: string): boolean {
    if (!phone) return false;
    // Accetta numeri con o senza prefisso internazionale, spazi, trattini, parentesi
    const phoneRegex = /^[+]?[\d\s()-]{6,20}$/;
    return phoneRegex.test(phone.trim());
  }

  /**
   * Valida il formato CAP italiano
   */
  static isValidPostalCode(postalCode: string): boolean {
    if (!postalCode) return false;
    const capRegex = /^[0-9]{5}$/;
    return capRegex.test(postalCode.trim());
  }

  /**
   * Verifica se ci sono errori critici che impediscono l'importazione
   */
  static hasCriticalErrors(validationResult: ImportValidationResult): boolean {
    return Object.keys(validationResult).length > 0;
  }

  /**
   * Ottiene un riassunto degli errori di validazione
   */
  static getValidationSummary(validationResult: ImportValidationResult): {
    totalErrors: number;
    affectedRows: number;
    errorTypes: { [errorType: string]: number };
  } {
    const totalErrors = Object.values(validationResult).reduce((sum, errors) => sum + errors.length, 0);
    const affectedRows = Object.keys(validationResult).length;
    const errorTypes: { [errorType: string]: number } = {};

    Object.values(validationResult).forEach(errors => {
      errors.forEach((error: string) => {
        errorTypes[error] = (errorTypes[error] || 0) + 1;
      });
    });

    return {
      totalErrors,
      affectedRows,
      errorTypes
    };
  }

  /**
   * Filtra le righe valide da quelle con errori
   */
  static filterValidRows(persons: PersonData[], validationResult: ImportValidationResult): {
    validRows: PersonData[];
    invalidRows: PersonData[];
    validIndices: number[];
    invalidIndices: number[];
  } {
    const validRows: PersonData[] = [];
    const invalidRows: PersonData[] = [];
    const validIndices: number[] = [];
    const invalidIndices: number[] = [];

    persons.forEach((person, index) => {
      if (validationResult[index]) {
        invalidRows.push(person);
        invalidIndices.push(index);
      } else {
        validRows.push(person);
        validIndices.push(index);
      }
    });

    return {
      validRows,
      invalidRows,
      validIndices,
      invalidIndices
    };
  }
}