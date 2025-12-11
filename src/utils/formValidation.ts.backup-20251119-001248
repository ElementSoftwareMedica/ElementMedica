/**
 * Form Validation Utility
 * 
 * Valida i campi del form in base alle regole definite nel template
 * Supporta validazioni: required, minLength, maxLength, pattern, minValue, maxValue, etc
 */

import type { FieldValidation } from '../types/forms';

export interface ValidationError {
  field: string;
  message: string;
  rule: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Valida un singolo campo
 */
export function validateField(
  fieldName: string,
  fieldLabel: string,
  fieldType: string,
  value: any,
  validation: FieldValidation | undefined,
  isRequired: boolean
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required validation
  if (isRequired && isValueEmpty(value)) {
    errors.push({
      field: fieldName,
      message: `${fieldLabel} è obbligatorio`,
      rule: 'required'
    });
    return errors; // Se campo required è vuoto, non fare altre validazioni
  }

  // Se il campo è vuoto ma non required, skip altre validazioni
  if (isValueEmpty(value)) {
    return errors;
  }

  if (!validation) {
    return errors;
  }

  // String validations
  if (typeof value === 'string') {
    // Min length
    if (validation.minLength !== undefined && value.length < validation.minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} deve contenere almeno ${validation.minLength} caratteri`,
        rule: 'minLength'
      });
    }

    // Max length
    if (validation.maxLength !== undefined && value.length > validation.maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} non può superare ${validation.maxLength} caratteri`,
        rule: 'maxLength'
      });
    }

    // Pattern (regex)
    if (validation.pattern) {
      try {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          const message = validation.patternMessage || `${fieldLabel} non ha un formato valido`;
          errors.push({
            field: fieldName,
            message,
            rule: 'pattern'
          });
        }
      } catch (e) {
        console.error('Invalid regex pattern:', validation.pattern);
      }
    }
  }

  // Numeric validations
  if (fieldType === 'number' || fieldType === 'NUMBER') {
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} deve essere un numero valido`,
        rule: 'type'
      });
    } else {
      // Min value
      if (validation.minValue !== undefined && numValue < validation.minValue) {
        errors.push({
          field: fieldName,
          message: `${fieldLabel} deve essere almeno ${validation.minValue}`,
          rule: 'minValue'
        });
      }

      // Max value
      if (validation.maxValue !== undefined && numValue > validation.maxValue) {
        errors.push({
          field: fieldName,
          message: `${fieldLabel} non può superare ${validation.maxValue}`,
          rule: 'maxValue'
        });
      }
    }
  }

  // Date validations
  if (fieldType === 'date' || fieldType === 'DATE') {
    const dateValue = new Date(value);
    
    if (isNaN(dateValue.getTime())) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} deve essere una data valida`,
        rule: 'type'
      });
    } else {
      // Min date
      if (validation.minDate) {
        const minDate = new Date(validation.minDate);
        if (dateValue < minDate) {
          errors.push({
            field: fieldName,
            message: `${fieldLabel} deve essere dopo ${minDate.toLocaleDateString()}`,
            rule: 'minDate'
          });
        }
      }

      // Max date
      if (validation.maxDate) {
        const maxDate = new Date(validation.maxDate);
        if (dateValue > maxDate) {
          errors.push({
            field: fieldName,
            message: `${fieldLabel} deve essere prima ${maxDate.toLocaleDateString()}`,
            rule: 'maxDate'
          });
        }
      }
    }
  }

  // Email validation
  if (fieldType === 'email' || fieldType === 'EMAIL') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof value === 'string' && !emailRegex.test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} deve essere un'email valida`,
        rule: 'email'
      });
    }
  }

  // Phone validation
  if (fieldType === 'tel' || fieldType === 'phone') {
    // Basic phone validation (può essere personalizzato)
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (typeof value === 'string' && !phoneRegex.test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} deve essere un numero di telefono valido`,
        rule: 'phone'
      });
    }
  }

  // Array validations (for checkboxes, multi-select)
  if (Array.isArray(value)) {
    // Min selections
    if (validation.minSelections !== undefined && value.length < validation.minSelections) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel}: seleziona almeno ${validation.minSelections} opzioni`,
        rule: 'minSelections'
      });
    }

    // Max selections
    if (validation.maxSelections !== undefined && value.length > validation.maxSelections) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel}: seleziona al massimo ${validation.maxSelections} opzioni`,
        rule: 'maxSelections'
      });
    }
  }

  // File validations
  if (fieldType === 'file') {
    if (validation.maxFileSize && typeof value === 'object' && value.size) {
      if (value.size > validation.maxFileSize) {
        const maxSizeMB = (validation.maxFileSize / (1024 * 1024)).toFixed(1);
        errors.push({
          field: fieldName,
          message: `${fieldLabel}: il file non può superare ${maxSizeMB} MB`,
          rule: 'maxFileSize'
        });
      }
    }

    if (validation.acceptedFileTypes && typeof value === 'object' && value.type) {
      const acceptedTypes = validation.acceptedFileTypes.split(',').map((t: string) => t.trim());
      if (!acceptedTypes.some((type: string) => value.type.match(type))) {
        errors.push({
          field: fieldName,
          message: `${fieldLabel}: tipo di file non accettato. Accettati: ${validation.acceptedFileTypes}`,
          rule: 'fileType'
        });
      }
    }
  }

  // Custom validation function (if provided)
  if (validation.customValidation) {
    try {
      const customFn = new Function('value', validation.customValidation);
      const result = customFn(value);
      if (result !== true && typeof result === 'string') {
        errors.push({
          field: fieldName,
          message: result,
          rule: 'custom'
        });
      }
    } catch (e) {
      console.error('Custom validation error:', e);
    }
  }

  return errors;
}

/**
 * Valida tutti i campi visibili del form
 */
export function validateForm(
  formData: Record<string, any>,
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    validation?: FieldValidation;
  }>
): ValidationResult {
  const allErrors: ValidationError[] = [];

  for (const field of fields) {
    const value = formData[field.name];
    const fieldErrors = validateField(
      field.name,
      field.label,
      field.type,
      value,
      field.validation,
      field.required
    );
    allErrors.push(...fieldErrors);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Helper: controlla se un valore è vuoto
 */
function isValueEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Ottiene il messaggio di errore per un campo specifico
 */
export function getFieldError(
  fieldName: string,
  errors: ValidationError[]
): string | null {
  const fieldError = errors.find(e => e.field === fieldName);
  return fieldError ? fieldError.message : null;
}

/**
 * Controlla se un campo ha errori
 */
export function hasFieldError(
  fieldName: string,
  errors: ValidationError[]
): boolean {
  return errors.some(e => e.field === fieldName);
}
