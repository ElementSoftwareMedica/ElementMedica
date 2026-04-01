/**
 * Advanced Validations - Fase 7
 * Validazioni Zod per enum e tipi standardizzati
 */

import { z } from 'zod';

// === ENUM VALIDATIONS ===

export const CourseStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED']);

export const EnrollmentStatusSchema = z.enum(['PREVENTIVO', 'ACCETTATO', 'COMPLETATO', 'FATTURATO']);

// === NUMERIC VALIDATIONS ===

// Validazioni monetarie
export const MoneySchema = z.number()
  .min(0, 'L\'importo deve essere positivo')
  .max(99999999.99, 'Importo troppo grande')
  .multipleOf(0.01, 'L\'importo deve avere massimo 2 decimali');

// Validazioni percentuali
export const PercentageSchema = z.number()
  .min(0, 'La percentuale deve essere positiva')
  .max(100, 'La percentuale non può superare 100')
  .multipleOf(0.01, 'La percentuale deve avere massimo 2 decimali');

// Validazioni ore
export const HoursSchema = z.number()
  .min(0, 'Le ore devono essere positive')
  .max(999999.99, 'Valore ore troppo grande')
  .multipleOf(0.01, 'Le ore devono avere massimo 2 decimali');

// === MODEL VALIDATIONS ===

// Person validation
export const PersonValidationSchema = z.object({
  email: z.string().email('Formato email non valido'),
  firstName: z.string().min(1, 'Nome obbligatorio').max(100, 'Nome troppo lungo'),
  lastName: z.string().min(1, 'Cognome obbligatorio').max(100, 'Cognome troppo lungo'),
  taxCode: z.string().regex(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/, 'Codice fiscale non valido').optional(),
  status: PersonStatusSchema.optional(),
  gender: GenderSchema.optional()
});

// Company validation
export const CompanyValidationSchema = z.object({
  ragioneSociale: z.string().min(1, 'Nome azienda obbligatorio').max(255, 'Nome azienda troppo lungo'),
  piva: z.string().regex(/^[0-9]{11}$/, 'Numero IVA non valido').optional(),
  codiceFiscale: z.string().regex(/^[0-9]{11}$/, 'Codice fiscale aziendale non valido').optional(),
  status: CompanyStatusSchema.optional(),
  type: CompanyTypeSchema.optional()
});

// Course validation
export const CourseValidationSchema = z.object({
  title: z.string().min(1, 'Titolo corso obbligatorio').max(255, 'Titolo troppo lungo'),
  description: z.string().max(2000, 'Descrizione troppo lunga').optional(),
  status: CourseStatusSchema.optional(),
  level: CourseLevelSchema.optional(),
  type: CourseTypeSchema.optional(),
  price: MoneySchema.optional(),
  duration: HoursSchema.optional()
});

// === UTILITY FUNCTIONS ===

/**
 * Valida un oggetto con schema Zod
 * @param {import('zod').ZodSchema} schema
 * @param {unknown} data
 * @returns {{ success: boolean; data?: unknown; errors?: string[] }}
 */
export function validateWithSchema(schema, data) {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => e.path.join('.') + ': ' + e.message)
      };
    }
    return {
      success: false,
      errors: ['Validazione non riuscita']
    };
  }
}

/**
 * Middleware per validazione automatica
 * @param {import('zod').ZodSchema} schema
 */
export function createValidationMiddleware(schema) {
  return (req, res, next) => {
    const validation = validateWithSchema(schema, req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validazione non riuscita',
        details: validation.errors
      });
    }

    req.validatedData = validation.data;
    next();
  };
}

export default {
  PersonValidationSchema,
  CompanyValidationSchema,
  CourseValidationSchema,
  MoneySchema,
  PercentageSchema,
  HoursSchema,
  validateWithSchema,
  createValidationMiddleware
};
