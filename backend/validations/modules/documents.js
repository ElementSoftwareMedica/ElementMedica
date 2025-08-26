/**
 * Validazioni Modulo DOCUMENTS
 * Gestione documenti e attestati
 */

import { z } from 'zod';

// === VALIDAZIONI MODELLO ===

// Attestato Validation
export const AttestatoSchema = z.object({
  // TODO: Implementare validazioni specifiche per Attestato
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateAttestatoSchema = AttestatoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateAttestatoSchema = CreateAttestatoSchema.partial();

// LetteraIncarico Validation
export const LetteraIncaricoSchema = z.object({
  // TODO: Implementare validazioni specifiche per LetteraIncarico
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateLetteraIncaricoSchema = LetteraIncaricoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateLetteraIncaricoSchema = CreateLetteraIncaricoSchema.partial();

// TemplateLink Validation
export const TemplateLinkSchema = z.object({
  // TODO: Implementare validazioni specifiche per TemplateLink
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateTemplateLinkSchema = TemplateLinkSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateTemplateLinkSchema = CreateTemplateLinkSchema.partial();

// === EXPORT MODULO ===

export default {
  AttestatoSchema,
  CreateAttestatoSchema,
  UpdateAttestatoSchema,
  LetteraIncaricoSchema,
  CreateLetteraIncaricoSchema,
  UpdateLetteraIncaricoSchema,
  TemplateLinkSchema,
  CreateTemplateLinkSchema,
  UpdateTemplateLinkSchema
};
