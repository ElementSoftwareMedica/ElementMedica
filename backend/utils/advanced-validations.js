/**
 * Advanced Validations - Fase 7
 * Validazioni Zod per enum e tipi standardizzati
 */

import { z } from 'zod';

// === ENUM VALIDATIONS ===

export const CourseStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED']);

export const EnrollmentStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED']);

// === NUMERIC VALIDATIONS ===

// Validazioni monetarie
export const MoneySchema = z.number()
  .min(0, 'Amount must be positive')
  .max(99999999.99, 'Amount too large')
  .multipleOf(0.01, 'Amount must have max 2 decimal places');

// Validazioni percentuali
export const PercentageSchema = z.number()
  .min(0, 'Percentage must be positive')
  .max(100, 'Percentage cannot exceed 100')
  .multipleOf(0.01, 'Percentage must have max 2 decimal places');

// Validazioni ore
export const HoursSchema = z.number()
  .min(0, 'Hours must be positive')
  .max(999999.99, 'Hours value too large')
  .multipleOf(0.01, 'Hours must have max 2 decimal places');

// === MODEL VALIDATIONS ===

// Person validation
export const PersonValidationSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name required').max(100, 'Last name too long'),
  taxCode: z.string().regex(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/, 'Invalid tax code').optional(),
  status: PersonStatusSchema.optional(),
  gender: GenderSchema.optional()
});

// Company validation
export const CompanyValidationSchema = z.object({
  ragioneSociale: z.string().min(1, 'Company name required').max(255, 'Company name too long'),
  piva: z.string().regex(/^[0-9]{11}$/, 'Invalid VAT number').optional(),
  codiceFiscale: z.string().regex(/^[0-9]{11}$/, 'Invalid fiscal code').optional(),
  status: CompanyStatusSchema.optional(),
  type: CompanyTypeSchema.optional()
});

// Course validation
export const CourseValidationSchema = z.object({
  title: z.string().min(1, 'Course title required').max(255, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  status: CourseStatusSchema.optional(),
  level: CourseLevelSchema.optional(),
  type: CourseTypeSchema.optional(),
  price: MoneySchema.optional(),
  duration: HoursSchema.optional()
});

// === UTILITY FUNCTIONS ===

/**
 * Valida un oggetto con schema Zod
 */
export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
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
      errors: ['Validation failed']
    };
  }
}

/**
 * Middleware per validazione automatica
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const validation = validateWithSchema(schema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
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
