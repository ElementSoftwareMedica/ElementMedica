/**
 * Validazioni Modulo TESTING
 * Sistema test e valutazioni
 */

import { z } from 'zod';

// === VALIDAZIONI MODELLO ===

// TestDocument Validation
export const TestDocumentSchema = z.object({
  // TODO: Implementare validazioni specifiche per TestDocument
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateTestDocumentSchema = TestDocumentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateTestDocumentSchema = CreateTestDocumentSchema.partial();

// TestPartecipante Validation
export const TestPartecipanteSchema = z.object({
  // TODO: Implementare validazioni specifiche per TestPartecipante
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateTestPartecipanteSchema = TestPartecipanteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateTestPartecipanteSchema = CreateTestPartecipanteSchema.partial();

// === EXPORT MODULO ===

export default {
  TestDocumentSchema,
  CreateTestDocumentSchema,
  UpdateTestDocumentSchema,
  TestPartecipanteSchema,
  CreateTestPartecipanteSchema,
  UpdateTestPartecipanteSchema
};
