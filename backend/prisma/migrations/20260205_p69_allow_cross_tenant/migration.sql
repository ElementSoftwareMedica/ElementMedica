-- P69: Add allowCrossTenant field to AdvancedPermission
-- This enables cross-tenant relational permissions for users like "formatore" working across multiple tenants

-- Add the allowCrossTenant column with default false
ALTER TABLE "advanced_permissions" ADD COLUMN IF NOT EXISTS "allowCrossTenant" BOOLEAN NOT NULL DEFAULT false;

-- Add index for cross-tenant permission queries
CREATE INDEX IF NOT EXISTS "advanced_permissions_allowCrossTenant_idx" ON "advanced_permissions"("allowCrossTenant") WHERE "allowCrossTenant" = true;

-- Comment for documentation
COMMENT ON COLUMN "advanced_permissions"."allowCrossTenant" IS 'P69: When true, allows users with this permission to access data across all their accessible tenants (PersonTenantAccess)';
