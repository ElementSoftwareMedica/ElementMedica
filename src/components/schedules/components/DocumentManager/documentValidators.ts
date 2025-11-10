/**
 * Document validation utilities
 * 
 * Validation functions for checking if document generation operations
 * can be performed based on current state.
 */

import { DocumentType } from './types';
import type { DateEntry, Person, Company, Training } from './types';

/**
 * Validate if lettere di incarico can be generated
 */
export const canGenerateLettere = (
  scheduleId: string | number | null | undefined,
  trainers: any[]
): boolean => {
  return Boolean(scheduleId) && trainers.length > 0;
};

/**
 * Validate if registri presenze can be generated
 */
export const canGenerateRegistri = (
  scheduleId: string | number | null | undefined,
  dates: DateEntry[]
): boolean => {
  return Boolean(scheduleId) && dates.length > 0;
};

/**
 * Validate if attestati can be generated
 */
export const canGenerateAttestati = (
  scheduleId: string | number | null | undefined,
  hasAttendance: boolean,
  selectedPersons: (string | number)[]
): boolean => {
  return Boolean(scheduleId) && hasAttendance && selectedPersons.length > 0;
};

/**
 * Validate if preventivi can be generated
 */
export const canGeneratePreventivi = (
  scheduleId: string | number | null | undefined,
  selectedCompanies: (string | number)[]
): boolean => {
  return Boolean(scheduleId) && selectedCompanies.length > 0;
};

/**
 * Get validation warning message for document type
 */
export const getValidationWarning = (
  type: DocumentType,
  context: {
    scheduleId?: string | number | null;
    trainers?: any[];
    dates?: DateEntry[];
    hasAttendance?: boolean;
    selectedPersons?: (string | number)[];
    selectedCompanies?: (string | number)[];
  }
): string | null => {
  switch (type) {
    case DocumentType.LETTERA_INCARICO:
      if (!context.scheduleId) return '⚠️ Salva prima il calendario per generare le lettere';
      if (!context.trainers || context.trainers.length === 0) return '⚠️ Aggiungi almeno un formatore';
      return null;

    case DocumentType.REGISTRO_PRESENZE:
      if (!context.scheduleId) return '⚠️ Salva prima il calendario per generare i registri';
      if (!context.dates || context.dates.length === 0) return '⚠️ Aggiungi almeno una sessione';
      return null;

    case DocumentType.ATTESTATO:
      if (!context.scheduleId) return '⚠️ Salva prima il calendario per generare gli attestati';
      if (!context.hasAttendance) return '⚠️ Completa prima le presenze per tutte le sessioni';
      if (!context.selectedPersons || context.selectedPersons.length === 0) return '⚠️ Seleziona almeno un partecipante';
      return null;

    case DocumentType.PREVENTIVO:
      if (!context.scheduleId) return '⚠️ Salva prima il calendario per generare preventivi';
      if (!context.selectedCompanies || context.selectedCompanies.length === 0) return '⚠️ Seleziona almeno un\'azienda';
      return null;

    default:
      return null;
  }
};

/**
 * Check if schedule has required data for any document generation
 */
export const hasRequiredData = (
  scheduleId: string | number | null | undefined,
  trainers: any[],
  dates: DateEntry[],
  selectedPersons: (string | number)[],
  selectedCompanies: (string | number)[]
): boolean => {
  return Boolean(scheduleId) && (
    trainers.length > 0 ||
    dates.length > 0 ||
    selectedPersons.length > 0 ||
    selectedCompanies.length > 0
  );
};

/**
 * Validate trainer data
 */
export const isValidTrainer = (trainer: any): boolean => {
  return Boolean(
    trainer &&
    trainer.id &&
    trainer.firstName &&
    trainer.lastName
  );
};

/**
 * Validate person data
 */
export const isValidPerson = (person: any): boolean => {
  return Boolean(
    person &&
    person.id &&
    person.firstName &&
    person.lastName
  );
};

/**
 * Validate company data
 */
export const isValidCompany = (company: any): boolean => {
  return Boolean(
    company &&
    company.id &&
    (company.ragioneSociale || company.businessName)
  );
};

/**
 * Validate training/course data
 */
export const isValidTraining = (training: any): boolean => {
  return Boolean(
    training &&
    training.id &&
    (training.name || training.nome || training.title)
  );
};
