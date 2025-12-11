/**
 * Zod Validation Schemas - Forms System
 * Centralizza tutti gli schemi di validazione per evitare duplicazioni
 */

import { z } from 'zod';
import { 
  FORM_TEMPLATE_TYPES_ARRAY, 
  FORM_FIELD_TYPES_ARRAY,
  SUBMISSION_STATUS_ARRAY,
  SUBMISSION_SOURCES_ARRAY,
  CONDITIONAL_OPERATORS_ARRAY,
  VALIDATION_LIMITS
} from '../constants/formEnums.js';

/**
 * Schema per opzioni select/radio/checkbox
 */
const fieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  linkedSectionId: z.string().optional(),
  maxCapacity: z.number().optional(),
  isCorrect: z.boolean().optional(),
  points: z.number().optional()
});

/**
 * Schema per validazione campo
 */
const fieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().optional()
}).optional();

/**
 * Schema per conditional logic (Avanzato con AND/OR/NOT)
 */
const simpleConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(CONDITIONAL_OPERATORS_ARRAY),
  value: z.any(),
  value2: z.any().optional()
});

const complexConditionSchema = z.lazy(() => z.object({
  and: z.array(z.union([simpleConditionSchema, complexConditionSchema])).optional(),
  or: z.array(z.union([simpleConditionSchema, complexConditionSchema])).optional(),
  not: z.union([simpleConditionSchema, complexConditionSchema]).optional(),
  simple: simpleConditionSchema.optional()
}));

const fieldConditionalSchema = z.union([
  simpleConditionSchema,
  complexConditionSchema
]).optional();

/**
 * Schema per sezione form
 */
const sectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Titolo sezione richiesto'),
  description: z.string().optional(),
  order: z.number().default(0),
  collapsible: z.boolean().default(false),
  defaultCollapsed: z.boolean().default(false),
  conditional: fieldConditionalSchema.optional()
});

/**
 * Schema per settings del template (include sections)
 */
const templateSettingsSchema = z.object({
  sections: z.array(sectionSchema).optional(),
  enableWizard: z.boolean().optional(),
  showProgress: z.boolean().optional(),
  allowSaveDraft: z.boolean().optional()
}).optional();

/**
 * Schema per entity mapping
 */
const fieldEntityMappingSchema = z.object({
  entity: z.enum(['Person', 'Company', 'CourseSchedule']),
  field: z.string()
}).optional();

/**
 * Schema per singolo campo form
 */
export const formFieldSchema = z.object({
  id: z.string().optional(), // Optional per creazione (non forza UUID)
  name: z.string()
    .min(VALIDATION_LIMITS.FIELD_NAME_MIN_LENGTH, 'Nome campo richiesto')
    .max(VALIDATION_LIMITS.FIELD_NAME_MAX_LENGTH),
  label: z.string()
    .min(VALIDATION_LIMITS.FIELD_LABEL_MIN_LENGTH, 'Label campo richiesta')
    .max(VALIDATION_LIMITS.FIELD_LABEL_MAX_LENGTH),
  type: z.string(), // Accetta tutti i tipi (più flessibile)
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(fieldOptionSchema).optional(),
  validation: z.any().optional(), // Più flessibile per validation rules
  conditional: fieldConditionalSchema.nullable(),
  entityMapping: fieldEntityMappingSchema.nullable(),
  sectionId: z.string().optional(), // Collegamento sezione
  order: z.number().default(0),
  isActive: z.boolean().default(true),
  enableCapacityLimit: z.boolean().optional(),
  enableQuizMode: z.boolean().optional()
});

/**
 * Schema per email notifications config
 */
const emailNotificationsSchema = z.object({
  enabled: z.boolean().default(false),
  recipients: z.array(z.string().email()).optional(),
  subject: z.string().optional(),
  includeSubmissionData: z.boolean().default(true)
}).optional();

/**
 * Schema per form template (creazione/update)
 */
export const formTemplateSchema = z.object({
  name: z.string()
    .min(VALIDATION_LIMITS.TEMPLATE_NAME_MIN_LENGTH, 'Nome template richiesto')
    .max(VALIDATION_LIMITS.TEMPLATE_NAME_MAX_LENGTH),
  description: z.string().optional(),
  type: z.enum(FORM_TEMPLATE_TYPES_ARRAY),
  schema: z.object({}).passthrough().optional(), // JSON schema flessibile
  settings: templateSettingsSchema.optional(), // Nuovo: supporta sections
  validationRules: z.object({}).passthrough().optional(),
  conditionalFields: z.object({}).passthrough().optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(false),
  allowAnonymous: z.boolean().default(false),
  successMessage: z.string().optional(),
  redirectUrl: z.string().url().optional().or(z.literal('')),
  emailNotifications: emailNotificationsSchema.optional(),
  conditionalRules: z.array(z.any()).optional()
});

/**
 * Schema per creazione template (con campi)
 */
export const createTemplateSchema = z.object({
  ...formTemplateSchema.shape,
  fields: z.array(formFieldSchema)
    .max(VALIDATION_LIMITS.MAX_FIELDS_PER_TEMPLATE, `Massimo ${VALIDATION_LIMITS.MAX_FIELDS_PER_TEMPLATE} campi per template`)
    .optional()
});

/**
 * Schema per update template
 */
export const updateTemplateSchema = formTemplateSchema.partial().extend({
  fields: z.array(formFieldSchema)
    .max(VALIDATION_LIMITS.MAX_FIELDS_PER_TEMPLATE)
    .optional()
});

/**
 * Schema per duplicazione template
 */
export const duplicateTemplateSchema = z.object({
  name: z.string()
    .min(VALIDATION_LIMITS.TEMPLATE_NAME_MIN_LENGTH, 'Nome richiesto')
    .max(VALIDATION_LIMITS.TEMPLATE_NAME_MAX_LENGTH)
});

/**
 * Schema per submission (creazione)
 */
/**
 * Schema unificato che supporta:
 * - Submission legacy (contact form diretto) con type, name, email, subject, message
 * - Submission template-based con templateId e data dinamici
 */
export const createSubmissionSchema = z.object({
  // Campo discriminante: se presente templateId, è template-based
  templateId: z.string().optional(),
  
  // Template-based fields
  data: z.record(z.any()).optional(), // Dati dinamici basati sui campi del template
  userId: z.string().uuid().optional(), // ID utente se autenticato
  
  // Legacy fields (opzionali se templateId è presente)
  type: z.enum(FORM_TEMPLATE_TYPES_ARRAY).optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
  
  // Common fields
  courseScheduleId: z.string().uuid().optional(),
  relatedPersonId: z.string().uuid().optional(),
  formSchema: z.object({}).passthrough().optional(),
  formData: z.object({}).passthrough().optional(),
  validationRules: z.object({}).passthrough().optional(),
  conditionalFields: z.object({}).passthrough().optional(),
  autoCreatePerson: z.boolean().default(false),
  formVersion: z.number().default(1),
  templateName: z.string().optional(),
  source: z.enum(SUBMISSION_SOURCES_ARRAY).default('public_website'),
  metadata: z.object({}).passthrough().optional()
}).refine(
  (data) => {
    // Se templateId presente → deve avere data
    if (data.templateId) {
      return data.data !== undefined && Object.keys(data.data).length > 0;
    }
    // Se templateId assente → deve avere campi legacy
    return data.type && data.name && data.email && data.subject && data.message;
  },
  {
    message: 'Fornire templateId + data oppure type + name + email + subject + message'
  }
);

/**
 * Schema per update submission
 */
export const updateSubmissionSchema = z.object({
  status: z.enum(SUBMISSION_STATUS_ARRAY).optional(),
  notes: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  processedById: z.string().uuid().optional(),
  processedAt: z.date().optional()
}).strict();

/**
 * Schema per bulk action
 */
export const bulkActionSchema = z.object({
  submissionIds: z.array(z.string().uuid()).min(1, 'Almeno una submission richiesta'),
  action: z.enum(['update_status', 'assign', 'delete']),
  data: z.object({
    status: z.enum(SUBMISSION_STATUS_ARRAY).optional(),
    assignedToId: z.string().uuid().optional()
  }).optional()
});

/**
 * Schema per query filtri templates
 */
export const templateFiltersSchema = z.object({
  type: z.enum(FORM_TEMPLATE_TYPES_ARRAY).optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20')
});

/**
 * Schema per query filtri submissions
 */
export const submissionFiltersSchema = z.object({
  type: z.enum(FORM_TEMPLATE_TYPES_ARRAY).optional(),
  status: z.enum(SUBMISSION_STATUS_ARRAY).optional(),
  source: z.enum(SUBMISSION_SOURCES_ARRAY).optional(),
  courseScheduleId: z.string().uuid().optional(),
  relatedPersonId: z.string().uuid().optional(),
  formTemplateId: z.string().uuid().optional(),
  templateName: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20')
});

export default {
  formFieldSchema,
  formTemplateSchema,
  createTemplateSchema,
  updateTemplateSchema,
  duplicateTemplateSchema,
  createSubmissionSchema,
  updateSubmissionSchema,
  bulkActionSchema,
  templateFiltersSchema,
  submissionFiltersSchema
};
