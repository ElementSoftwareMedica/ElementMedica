/**
 * Validazioni Modulo MONITORING
 * Monitoraggio e metriche
 */

import { z } from 'zod';

// === VALIDAZIONI MODELLO ===

// TenantUsage Validation
export const TenantUsageSchema = z.object({
  // TODO: Implementare validazioni specifiche per TenantUsage
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateTenantUsageSchema = TenantUsageSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateTenantUsageSchema = CreateTenantUsageSchema.partial();

// === EXPORT MODULO ===

export default {
  TenantUsageSchema,
  CreateTenantUsageSchema,
  UpdateTenantUsageSchema
};
