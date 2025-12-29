-- Migration: add_person_tenant_access
-- Date: 15 December 2025
-- Project: 43 - Tenant Roles Management System
-- Description: Add PersonTenantAccess model for multi-tenant user access management

-- Create TenantAccessLevel enum
CREATE TYPE "tenant_access_levels" AS ENUM (
  'READ',
  'WRITE', 
  'ADMIN',
  'FULL'
);

-- Create PersonTenantAccess table
CREATE TABLE "person_tenant_accesses" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "accessLevel" "tenant_access_levels" NOT NULL DEFAULT 'READ',
  "enabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "defaultRoleType" "role_types",
  "customPermissions" JSONB DEFAULT '{}',
  "restrictions" JSONB DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "grantedBy" TEXT,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "lastAccessAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "person_tenant_accesses_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on person-tenant combination
ALTER TABLE "person_tenant_accesses" ADD CONSTRAINT "person_tenant_accesses_personId_tenantId_key" UNIQUE ("personId", "tenantId");

-- Create indexes for performance
CREATE INDEX "person_tenant_accesses_personId_idx" ON "person_tenant_accesses"("personId");
CREATE INDEX "person_tenant_accesses_tenantId_idx" ON "person_tenant_accesses"("tenantId");
CREATE INDEX "person_tenant_accesses_personId_isActive_idx" ON "person_tenant_accesses"("personId", "isActive");
CREATE INDEX "person_tenant_accesses_tenantId_isActive_idx" ON "person_tenant_accesses"("tenantId", "isActive");
CREATE INDEX "person_tenant_accesses_accessLevel_idx" ON "person_tenant_accesses"("accessLevel");
CREATE INDEX "person_tenant_accesses_grantedBy_idx" ON "person_tenant_accesses"("grantedBy");
CREATE INDEX "person_tenant_accesses_deletedAt_idx" ON "person_tenant_accesses"("deletedAt");

-- Add foreign keys
ALTER TABLE "person_tenant_accesses" ADD CONSTRAINT "person_tenant_accesses_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "person_tenant_accesses" ADD CONSTRAINT "person_tenant_accesses_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "person_tenant_accesses" ADD CONSTRAINT "person_tenant_accesses_grantedBy_fkey" 
  FOREIGN KEY ("grantedBy") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Comments for documentation
COMMENT ON TABLE "person_tenant_accesses" IS 'Multi-tenant access management for users - Project 43';
COMMENT ON COLUMN "person_tenant_accesses"."accessLevel" IS 'Level of access: READ (view only), WRITE (edit), ADMIN (manage tenant), FULL (owner-like access)';
COMMENT ON COLUMN "person_tenant_accesses"."enabledFeatures" IS 'Array of enabled features for this user in this tenant: formazione, medica, fatturazione, etc.';
COMMENT ON COLUMN "person_tenant_accesses"."defaultRoleType" IS 'Default role for this user in this tenant (optional override)';
COMMENT ON COLUMN "person_tenant_accesses"."isPrimary" IS 'Whether this is the primary tenant for the user';
COMMENT ON COLUMN "person_tenant_accesses"."validUntil" IS 'Optional expiration date for temporary access';
