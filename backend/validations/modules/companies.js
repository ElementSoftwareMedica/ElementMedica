/**
 * Validazioni Modulo COMPANIES
 * Gestione aziende e organizzazioni
 */

import { z } from 'zod';

// === VALIDAZIONI MODELLO ===

// Company Validation
export const CompanySchema = z.object({
  // TODO: Implementare validazioni specifiche per Company
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateCompanySchema = CompanySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateCompanySchema = CreateCompanySchema.partial();

// ScheduleCompany Validation
export const ScheduleCompanySchema = z.object({
  // TODO: Implementare validazioni specifiche per ScheduleCompany
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateScheduleCompanySchema = ScheduleCompanySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateScheduleCompanySchema = CreateScheduleCompanySchema.partial();

// === EXPORT MODULO ===

export default {
  CompanySchema,
  CreateCompanySchema,
  UpdateCompanySchema,
  ScheduleCompanySchema,
  CreateScheduleCompanySchema,
  UpdateScheduleCompanySchema
};
