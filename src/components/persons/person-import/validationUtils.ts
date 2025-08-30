/**
 * Utility per la validazione dei dati delle persone nell'importazione
 */

import { isValidCodiceFiscale } from '../../../lib/utils';
import { isValidDate, extractBirthDateFromTaxCode, formatDateForDisplay } from './dateUtils';
import { VALID_PERSON_STATUSES } from './constants';
import { PersonData } from '../../../types/import/personImportTypes';

/**
 * Valida una singola persona
 */
export const validatePerson = (person: PersonData): string[] => {
  const errors: string[] = [];

  if (!person.firstName?.trim()) {
    errors.push('Nome è obbligatorio');
  }

  if (!person.lastName?.trim()) {
    errors.push('Cognome è obbligatorio');
  }

  if (!person.taxCode?.trim()) {
    errors.push('Codice fiscale è obbligatorio');
  } else if (!isValidCodiceFiscale(person.taxCode)) {
    errors.push('Codice fiscale non valido (formato non corretto)');
  }

  // Email opzionale ma se presente deve essere valida
  if (person.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) {
    errors.push('Email non valida');
  }

  if (person.birthDate && !isValidDate(person.birthDate)) {
    errors.push('Data di nascita non valida');
  }

  return errors;
};

/**
 * Validazione personalizzata che include l'estrazione della data di nascita
 */
export const validatePersons = (persons: PersonData[]): { [rowIdx: number]: string[] } => {
  const errors: { [rowIdx: number]: string[] } = {};
  
  persons.forEach((person, index) => {
    // Controlla se è un template vuoto (tutti i campi obbligatori sono vuoti)
    const isEmptyTemplate = !person.firstName?.trim() && 
                           !person.lastName?.trim() && 
                           !person.taxCode?.trim();
    
    // Se è un template vuoto, salta la validazione
    if (isEmptyTemplate) {
      return;
    }
    
    // Se c'è un codice fiscale ma non una data di nascita, prova a estrarla
    if (person.taxCode && !person.birthDate) {
      const extractedDate = extractBirthDateFromTaxCode(person.taxCode);
      if (extractedDate) {
        person.birthDate = extractedDate;
      }
    }
    
    // Formatta la data di nascita per la visualizzazione
    if (person.birthDate) {
      person.birthDate = formatDateForDisplay(person.birthDate);
    }
    
    const personErrors = validatePerson(person);
    if (personErrors.length > 0) {
      errors[index] = personErrors;
    }
  });
  
  return errors;
};

/**
 * Normalizza e valida lo status di una persona
 */
export const normalizePersonStatus = (status: string | undefined): string => {
  if (status !== undefined) {
    const statusValue = status?.toString().trim();
    if (!statusValue || statusValue === '') {
      return 'ACTIVE';
    } else {
      // Verifica che il valore sia uno dei valori validi dell'enum PersonStatus
      const upperStatusValue = statusValue.toUpperCase();
      if (VALID_PERSON_STATUSES.includes(upperStatusValue)) {
        return upperStatusValue;
      } else {
        return 'ACTIVE';
      }
    }
  } else {
    // Se il campo status non è presente nel CSV, imposta il default
    return 'ACTIVE';
  }
};