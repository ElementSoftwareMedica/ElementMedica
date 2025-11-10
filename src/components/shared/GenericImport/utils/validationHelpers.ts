/**
 * @file validationHelpers.ts
 * @description Entity validation utilities for GenericImport
 */

/**
 * Validate employee (dipendente) fields
 */
export const validateEmployee = (row: any): string[] => {
  const errors: string[] = [];
  
  if (!row.firstName && !row.nome) {
    errors.push('Nome obbligatorio');
  }
  
  if (!row.lastName && !row.cognome) {
    errors.push('Cognome obbligatorio');
  }
  
  if (!row.codiceFiscale && !row.codice_fiscale) {
    errors.push('Codice Fiscale obbligatorio');
  } else if (
    (row.codiceFiscale && row.codiceFiscale.length !== 16) || 
    (row.codice_fiscale && row.codice_fiscale.length !== 16)
  ) {
    errors.push('Codice Fiscale deve essere di 16 caratteri');
  }
  
  return errors;
};

/**
 * Validate company (azienda) fields
 */
export const validateCompany = (row: any): string[] => {
  const errors: string[] = [];
  
  if (!row.ragione_sociale) {
    errors.push('Ragione Sociale obbligatoria');
  }
  
  if (!row.piva && !row.codiceFiscale && !row.codice_fiscale) {
    errors.push('P.IVA o Codice Fiscale obbligatori');
  }
  
  if (row.piva && (row.piva.length < 8 || row.piva.length > 13)) {
    errors.push('P.IVA non valida');
  }
  
  return errors;
};

/**
 * Validate trainer (formatore) fields
 */
export const validateTrainer = (row: any): string[] => {
  const errors: string[] = [];
  
  if (!row.firstName && !row.nome) {
    errors.push('Nome obbligatorio');
  }
  
  if (!row.lastName && !row.cognome) {
    errors.push('Cognome obbligatorio');
  }
  
  if (!row.codiceFiscale && !row.codice_fiscale) {
    errors.push('Codice Fiscale obbligatorio');
  } else if (
    (row.codiceFiscale && row.codiceFiscale.length !== 16) || 
    (row.codice_fiscale && row.codice_fiscale.length !== 16)
  ) {
    errors.push('Codice Fiscale deve essere di 16 caratteri');
  }
  
  return errors;
};

/**
 * Validate course (corso) fields
 */
export const validateCourse = (row: any): string[] => {
  const errors: string[] = [];
  
  if (!row.title) {
    errors.push('Titolo obbligatorio');
  }
  
  if (!row.code) {
    errors.push('Codice corso obbligatorio');
  }
  
  return errors;
};

/**
 * Validate rows based on entity type
 */
export const validateRowsByEntityType = (
  rows: any[],
  entityType: string,
  customValidation?: (row: any, index: number) => string[]
): { [rowIdx: number]: string[] } => {
  const errors: { [rowIdx: number]: string[] } = {};
  
  rows.forEach((row, idx) => {
    const rowErrors: string[] = [];
    
    // Custom validation takes precedence
    if (customValidation) {
      const customErrors = customValidation(row, idx);
      if (customErrors.length > 0) {
        rowErrors.push(...customErrors);
      }
    } else {
      // Default entity-specific validation
      let validationErrors: string[] = [];
      
      switch (entityType) {
        case 'aziende':
          validationErrors = validateCompany(row);
          break;
        case 'dipendenti':
          validationErrors = validateEmployee(row);
          break;
        case 'formatori':
          validationErrors = validateTrainer(row);
          break;
        case 'corsi':
          validationErrors = validateCourse(row);
          break;
        default:
          // No default validation for unknown entity types
          break;
      }
      
      rowErrors.push(...validationErrors);
    }
    
    if (rowErrors.length > 0) {
      errors[idx] = rowErrors;
    }
  });
  
  return errors;
};

/**
 * Normalize course numeric fields
 * Ensures numeric fields are properly typed
 */
export const normalizeCourseFields = (data: Record<string, any>): Record<string, any> => {
  const cleanData = { ...data };
  
  // Force numeric fields to be numbers
  ['duration', 'validityYears', 'price', 'pricePerPerson', 'maxPeople'].forEach(field => {
    if (cleanData[field] !== undefined && cleanData[field] !== null && cleanData[field] !== '') {
      const numValue = parseInt(String(cleanData[field]).replace(/[^\d]/g, ''), 10);
      if (!isNaN(numValue)) {
        cleanData[field] = numValue;
      } else if (field === 'duration' || field === 'validityYears') {
        // Required fields default to 0
        cleanData[field] = 0;
      } else {
        // Optional fields removed if invalid
        delete cleanData[field];
      }
    }
  });
  
  // Ensure renewalDuration is a string
  if (cleanData.renewalDuration !== undefined) {
    cleanData.renewalDuration = String(cleanData.renewalDuration || '');
  }
  
  return cleanData;
};
