/**
 * Validazioni Modulo CORE
 * Modelli core del sistema (Tenant, Permission, etc.)
 */

import { z } from 'zod';

// === VALIDAZIONI MODELLO ===

// Tenant Validation
export const TenantSchema = z.object({
  // TODO: Implementare validazioni specifiche per Tenant
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateTenantSchema = TenantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateTenantSchema = CreateTenantSchema.partial();

// TenantConfiguration Validation
export const TenantConfigurationSchema = z.object({
  // TODO: Implementare validazioni specifiche per TenantConfiguration
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateTenantConfigurationSchema = TenantConfigurationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateTenantConfigurationSchema = CreateTenantConfigurationSchema.partial();

// Permission Validation
export const PermissionSchema = z.object({
  // TODO: Implementare validazioni specifiche per Permission
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreatePermissionSchema = PermissionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdatePermissionSchema = CreatePermissionSchema.partial();

// RefreshToken Validation
export const RefreshTokenSchema = z.object({
  // TODO: Implementare validazioni specifiche per RefreshToken
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateRefreshTokenSchema = RefreshTokenSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateRefreshTokenSchema = CreateRefreshTokenSchema.partial();

// === EXPORT MODULO ===

export default {
  TenantSchema,
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantConfigurationSchema,
  CreateTenantConfigurationSchema,
  UpdateTenantConfigurationSchema,
  PermissionSchema,
  CreatePermissionSchema,
  UpdatePermissionSchema,
  RefreshTokenSchema,
  CreateRefreshTokenSchema,
  UpdateRefreshTokenSchema
};
