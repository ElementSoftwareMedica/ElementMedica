/**
 * Form System - Enumerations and Constants
 * Centralizza tutti gli enum del sistema forms per evitare duplicazioni
 */

/**
 * Tipi di form template disponibili
 */
export const FORM_TEMPLATE_TYPES = {
  CONTACT: 'CONTACT',
  JOB_APPLICATION: 'JOB_APPLICATION',
  QUOTE_REQUEST: 'QUOTE_REQUEST',
  CONSULTATION: 'CONSULTATION',
  COURSE_TEST: 'COURSE_TEST',
  COURSE_EVALUATION: 'COURSE_EVALUATION',
  PERSON_DATA_COLLECTION: 'PERSON_DATA_COLLECTION',
  COURSE_ENROLLMENT: 'COURSE_ENROLLMENT',
  CUSTOM_FORM: 'CUSTOM_FORM'
};

/**
 * Array dei tipi validi per validazione Zod
 */
export const FORM_TEMPLATE_TYPES_ARRAY = Object.values(FORM_TEMPLATE_TYPES);

/**
 * Tipi di campi form supportati
 */
export const FORM_FIELD_TYPES = {
  // Text inputs
  TEXT: 'text',
  EMAIL: 'email',
  TEL: 'tel',
  TEXTAREA: 'textarea',
  
  // Selection inputs
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  
  // Date/Time inputs
  DATE: 'date',
  
  // Number inputs
  NUMBER: 'number',
  
  // File inputs
  FILE: 'file',
  
  // TODO: Fase 2 - Nuovi tipi per scoring
  // MULTIPLE_CHOICE: 'multiple_choice',
  // SINGLE_CHOICE: 'single_choice',
  // TRUE_FALSE: 'true_false',
  // RATING: 'rating',
  // SLIDER: 'slider'
};

/**
 * Array dei tipi campi validi per validazione Zod
 */
export const FORM_FIELD_TYPES_ARRAY = Object.values(FORM_FIELD_TYPES);

/**
 * Stati submission (devono corrispondere all'enum Prisma SubmissionStatus)
 */
export const SUBMISSION_STATUS = {
  NEW: 'NEW',
  READ: 'READ',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED',
  // Aliases per backward compatibility
  PENDING: 'NEW'
};

export const SUBMISSION_STATUS_ARRAY = ['NEW', 'READ', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'];

/**
 * Sorgenti submission
 */
export const SUBMISSION_SOURCES = {
  PUBLIC_WEBSITE: 'public_website',
  BACKOFFICE: 'backoffice',
  MOBILE_APP: 'mobile_app',
  API: 'api',
  IMPORT: 'import'
};

export const SUBMISSION_SOURCES_ARRAY = Object.values(SUBMISSION_SOURCES);

/**
 * Operatori conditional logic (Fase 1 - Base)
 */
export const CONDITIONAL_OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  CONTAINS: 'contains',
  IN: 'in'
  // TODO: Fase 2 - Aggiungere 26 operatori avanzati
};

export const CONDITIONAL_OPERATORS_ARRAY = Object.values(CONDITIONAL_OPERATORS);

/**
 * Rate limiting configuration per public endpoints
 */
export const RATE_LIMITS = {
  PUBLIC_SUBMISSION: {
    windowMs: 60 * 60 * 1000, // 1 ora
    max: 10 // 10 richieste per IP
  }
};

/**
 * Validation constraints
 */
export const VALIDATION_LIMITS = {
  TEMPLATE_NAME_MIN_LENGTH: 1,
  TEMPLATE_NAME_MAX_LENGTH: 255,
  FIELD_NAME_MIN_LENGTH: 1,
  FIELD_NAME_MAX_LENGTH: 100,
  FIELD_LABEL_MIN_LENGTH: 1,
  FIELD_LABEL_MAX_LENGTH: 255,
  MAX_FIELDS_PER_TEMPLATE: 100,
  MAX_FILE_SIZE_MB: 10
};
