/**
 * Validazioni Modulo ATTENDANCE
 * Sistema presenze e registrazioni
 */

import { z } from 'zod';

// === VALIDAZIONI MODELLO ===

// RegistroPresenze Validation
export const RegistroPresenzeSchema = z.object({
  // TODO: Implementare validazioni specifiche per RegistroPresenze
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateRegistroPresenzeSchema = RegistroPresenzeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateRegistroPresenzeSchema = CreateRegistroPresenzeSchema.partial();

// RegistroPresenzePartecipante Validation
export const RegistroPresenzePartecipanteSchema = z.object({
  // TODO: Implementare validazioni specifiche per RegistroPresenzePartecipante
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateRegistroPresenzePartecipanteSchema = RegistroPresenzePartecipanteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateRegistroPresenzePartecipanteSchema = CreateRegistroPresenzePartecipanteSchema.partial();

// === EXPORT MODULO ===

export default {
  RegistroPresenzeSchema,
  CreateRegistroPresenzeSchema,
  UpdateRegistroPresenzeSchema,
  RegistroPresenzePartecipanteSchema,
  CreateRegistroPresenzePartecipanteSchema,
  UpdateRegistroPresenzePartecipanteSchema
};
