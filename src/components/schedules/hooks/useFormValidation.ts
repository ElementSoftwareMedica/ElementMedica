import { useMemo, useCallback } from 'react';
import type { FormData } from '../types';
import type { Training } from '../types';
import { validateScheduleForm } from '../utils';

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, string>;
}

interface UseFormValidationProps {
  formData: FormData;
  dynamicRiskOptions: Array<{ value: string; label: string }>;
  dynamicCourseTypeOptions: Array<{ value: string; label: string }>;
  currentStep: number;
  selectedCourse?: Training;
  courseDuration: number;
  totalSelectedHours: number;
  timeStringToMinutes: (time: string) => number;
  selectedCompanies: Array<string | number>;
  selectedPersons: Array<string | number>;
}

interface UseFormValidationReturn {
  // Validation results
  isValid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, string>;

  // Step-specific validation
  isStep0Valid: boolean;
  isStep1Valid: boolean;
  isStep2Valid: boolean;
  isStep3Valid: boolean;
  isStep4Valid: boolean;

  // Validation functions
  validateCurrentStep: () => ValidationResult;
  validateAllSteps: () => ValidationResult;
  validateField: (field: string, value: unknown) => ValidationError | null;
  clearErrors: () => void;
}

/**
 * Hook centralizzato per la gestione della validazione del form
 * Consolida tutta la logica di validazione precedentemente dispersa
 */
export function useFormValidation({
  formData,
  dynamicRiskOptions = [],
  dynamicCourseTypeOptions = [],
  currentStep,
  selectedCourse,
  courseDuration,
  totalSelectedHours,
  timeStringToMinutes,
  selectedCompanies = [],
  selectedPersons = []
}: UseFormValidationProps): UseFormValidationReturn {

  // Validazione Step 0: Dettagli corso
  const step0Validation = useMemo(() => {
    const errors: ValidationError[] = [];

    // Validazione corso selezionato
    if (!selectedCourse) {
      errors.push({ field: 'course', message: 'Seleziona un corso' });
    }

    // Validazione livello di rischio (richiesto solo se esistono varianti > 1)
    if ((dynamicRiskOptions.length > 1) && !formData.risk_level) {
      errors.push({ field: 'risk_level', message: 'Seleziona il livello di rischio' });
    }

    // Validazione tipo corso (richiesto solo se esistono varianti > 1)
    if ((dynamicCourseTypeOptions.length > 1) && !formData.course_type) {
      errors.push({ field: 'course_type', message: 'Seleziona il tipo di corso' });
    }

    // Validazione modalità di erogazione
    if (!formData.delivery_mode) {
      errors.push({ field: 'delivery_mode', message: 'Seleziona la modalità di erogazione' });
    }

    // Validazione date, orari e formatori per data
    if (!formData.dates || formData.dates.length === 0) {
      errors.push({ field: 'dates', message: 'Aggiungi almeno una data' });
    } else {
      formData.dates.forEach((date, index) => {
        if (!date.date) {
          errors.push({ field: `dates.${index}.date`, message: `Data ${index + 1} è obbligatoria` });
        }
        if (!date.start) {
          errors.push({ field: `dates.${index}.start`, message: `Orario inizio ${index + 1} è obbligatorio` });
        }
        if (!date.end) {
          errors.push({ field: `dates.${index}.end`, message: `Orario fine ${index + 1} è obbligatorio` });
        }

        // Validazione logica orari
        if (date.start && date.end) {
          const startMinutes = timeStringToMinutes(date.start);
          const endMinutes = timeStringToMinutes(date.end);
          if (startMinutes >= endMinutes) {
            errors.push({
              field: `dates.${index}.time`,
              message: `L'orario di fine deve essere successivo all'orario di inizio per la data ${index + 1}`
            });
          }
        }

        // Validazione trainer per data (accesso tipizzato)
        const trainerId = (date as { trainerId?: string | number }).trainerId;
        if (!trainerId || String(trainerId).trim() === '') {
          errors.push({ field: `dates.${index}.trainerId`, message: `Seleziona un formatore per la sessione ${index + 1}` });
        }
        const coTrainerId = (date as { coTrainerId?: string | number }).coTrainerId;
        if (trainerId && coTrainerId && String(trainerId) === String(coTrainerId)) {
          errors.push({ field: `dates.${index}.coTrainerId`, message: `Il co-formatore non può coincidere con il formatore nella sessione ${index + 1}` });
        }
      });
    }

    // Validazione ore selezionate vs durata del corso
    // Blocca SOLO se le ore sono MENO della durata prevista.
    // Se le ore sono uguali o SUPERIORI, è consentito (warning visivo in DateTimeManager).
    const durationNum = Number(courseDuration ?? 0);
    const totalHoursNum = Number(totalSelectedHours ?? 0);
    const hasDuration = Number.isFinite(durationNum) && durationNum > 0;
    const hasTotalHours = Number.isFinite(totalHoursNum) && totalHoursNum >= 0;
    if (hasDuration && hasTotalHours) {
      const isUnder = totalHoursNum < durationNum - 1e-6;
      if (isUnder) {
        errors.push({ field: 'totalSelectedHours', message: 'Le ore selezionate sono inferiori alla durata del corso' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors: errors.reduce((acc, error) => ({ ...acc, [error.field]: error.message }), {})
    };
  }, [formData, selectedCourse, dynamicRiskOptions, dynamicCourseTypeOptions, timeStringToMinutes, courseDuration, totalSelectedHours]);

  // Validazione Step 1: Partecipanti
  const step1Validation = useMemo(() => {
    const errors: ValidationError[] = [];

    if (!selectedCompanies || selectedCompanies.length === 0) {
      errors.push({ field: 'companies', message: 'Seleziona almeno un\'azienda' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors: errors.reduce((acc, error) => ({ ...acc, [error.field]: error.message }), {})
    };
  }, [selectedCompanies]);

  // Validazione Step 2: Presenze
  const step2Validation = useMemo(() => {
    const errors: ValidationError[] = [];

    if (!selectedPersons || selectedPersons.length === 0) {
      errors.push({ field: 'persons', message: 'Seleziona almeno un partecipante' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors: errors.reduce((acc, error) => ({ ...acc, [error.field]: error.message }), {})
    };
  }, [selectedPersons]);

  // Validazione Step 3: Documenti (opzionale)
  const step3Validation = useMemo(() => {
    return {
      isValid: true,
      errors: [],
      fieldErrors: {}
    };
  }, []);

  // Validazione Step 4: Riepilogo (sempre valido se si arriva qui)
  const step4Validation = useMemo(() => {
    return {
      isValid: true,
      errors: [],
      fieldErrors: {}
    };
  }, []);

  // Validazione step corrente
  const currentStepValidation = useMemo(() => {
    switch (currentStep) {
      case 0: return step0Validation;
      case 1: return step1Validation;
      case 2: return step2Validation;
      case 3: return step3Validation;
      case 4: return step4Validation;
      default: return { isValid: false, errors: [], fieldErrors: {} };
    }
  }, [currentStep, step0Validation, step1Validation, step2Validation, step3Validation, step4Validation]);

  // Validazione completa di tutti gli step
  const allStepsValidation = useMemo(() => {
    const allErrors = [
      ...step0Validation.errors,
      ...step1Validation.errors,
      ...step2Validation.errors,
      ...step3Validation.errors,
      ...step4Validation.errors
    ];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      fieldErrors: allErrors.reduce((acc, error) => ({ ...acc, [error.field]: error.message }), {})
    };
  }, [step0Validation, step1Validation, step2Validation, step3Validation, step4Validation]);

  // Funzioni di validazione
  const validateCurrentStep = useCallback(() => currentStepValidation, [currentStepValidation]);
  const validateAllSteps = useCallback(() => allStepsValidation, [allStepsValidation]);

  const validateField = useCallback((field: string, value: unknown): ValidationError | null => {
    // Implementazione validazione singolo campo
    switch (field) {
      case 'course':
        return !value ? { field, message: 'Seleziona un corso' } : null;
      case 'risk_level':
        return (dynamicRiskOptions.length > 1) && !value ? { field, message: 'Seleziona il livello di rischio' } : null;
      case 'course_type':
        return (dynamicCourseTypeOptions.length > 1) && !value ? { field, message: 'Seleziona il tipo di corso' } : null;
      case 'delivery_mode':
        return !value ? { field, message: 'Seleziona la modalità di erogazione' } : null;
      // La validazione del formatore è gestita per-data (dates[i].trainerId)
      case 'trainer_id':
        return null;
      default:
        return null;
    }
  }, [dynamicRiskOptions, dynamicCourseTypeOptions]);

  const clearErrors = useCallback(() => {
    // Questa funzione può essere utilizzata per pulire gli errori
    // L'implementazione dipende da come si vuole gestire lo stato degli errori
  }, []);

  return {
    // Validation results
    isValid: currentStepValidation.isValid,
    errors: currentStepValidation.errors,
    fieldErrors: currentStepValidation.fieldErrors,

    // Step-specific validation
    isStep0Valid: step0Validation.isValid,
    isStep1Valid: step1Validation.isValid,
    isStep2Valid: step2Validation.isValid,
    isStep3Valid: step3Validation.isValid,
    isStep4Valid: step4Validation.isValid,

    // Validation functions
    validateCurrentStep,
    validateAllSteps,
    validateField,
    clearErrors
  };
}

export default useFormValidation;