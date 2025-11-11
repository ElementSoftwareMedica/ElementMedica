/**
 * Validazioni Modulo BILLING
 * Sistema fatturazione e preventivi
 */

import { z } from 'zod';

// === VALIDAZIONI MODELLO ===

// Preventivo Validation
export const PreventivoSchema = z.object({
  // TODO: Implementare validazioni specifiche per Preventivo
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreatePreventivoSchema = PreventivoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdatePreventivoSchema = CreatePreventivoSchema.partial();

// Fattura Validation
export const FatturaSchema = z.object({
  // TODO: Implementare validazioni specifiche per Fattura
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateFatturaSchema = FatturaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateFatturaSchema = CreateFatturaSchema.partial();

// === EXPORT MODULO ===

export default {
  PreventivoSchema,
  CreatePreventivoSchema,
  UpdatePreventivoSchema,
  FatturaSchema,
  CreateFatturaSchema,
  UpdateFatturaSchema
};
