/**
 * Validazioni Modulo USERS
 * Gestione utenti e ruoli
 */

import { z } from 'zod';

// === VALIDAZIONI MODELLO ===

// Person Validation
export const PersonSchema = z.object({
  // TODO: Implementare validazioni specifiche per Person
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreatePersonSchema = PersonSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdatePersonSchema = CreatePersonSchema.partial();

// PersonRole Validation
export const PersonRoleSchema = z.object({
  // TODO: Implementare validazioni specifiche per PersonRole
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreatePersonRoleSchema = PersonRoleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdatePersonRoleSchema = CreatePersonRoleSchema.partial();

// PersonSession Validation
export const PersonSessionSchema = z.object({
  // TODO: Implementare validazioni specifiche per PersonSession
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreatePersonSessionSchema = PersonSessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdatePersonSessionSchema = CreatePersonSessionSchema.partial();

// CustomRole Validation
export const CustomRoleSchema = z.object({
  // TODO: Implementare validazioni specifiche per CustomRole
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateCustomRoleSchema = CustomRoleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateCustomRoleSchema = CreateCustomRoleSchema.partial();

// === EXPORT MODULO ===

export default {
  PersonSchema,
  CreatePersonSchema,
  UpdatePersonSchema,
  PersonRoleSchema,
  CreatePersonRoleSchema,
  UpdatePersonRoleSchema,
  PersonSessionSchema,
  CreatePersonSessionSchema,
  UpdatePersonSessionSchema,
  CustomRoleSchema,
  CreateCustomRoleSchema,
  UpdateCustomRoleSchema
};
