/**
 * Validazioni Modulo AUDIT
 * Sistema audit e GDPR
 */

import { z } from 'zod';

// === VALIDAZIONI MODELLO ===

// ActivityLog Validation
export const ActivityLogSchema = z.object({
  // TODO: Implementare validazioni specifiche per ActivityLog
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateActivityLogSchema = ActivityLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateActivityLogSchema = CreateActivityLogSchema.partial();

// GdprAuditLog Validation
export const GdprAuditLogSchema = z.object({
  // TODO: Implementare validazioni specifiche per GdprAuditLog
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateGdprAuditLogSchema = GdprAuditLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateGdprAuditLogSchema = CreateGdprAuditLogSchema.partial();

// ConsentRecord Validation
export const ConsentRecordSchema = z.object({
  // TODO: Implementare validazioni specifiche per ConsentRecord
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateConsentRecordSchema = ConsentRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateConsentRecordSchema = CreateConsentRecordSchema.partial();

// === EXPORT MODULO ===

export default {
  ActivityLogSchema,
  CreateActivityLogSchema,
  UpdateActivityLogSchema,
  GdprAuditLogSchema,
  CreateGdprAuditLogSchema,
  UpdateGdprAuditLogSchema,
  ConsentRecordSchema,
  CreateConsentRecordSchema,
  UpdateConsentRecordSchema
};
