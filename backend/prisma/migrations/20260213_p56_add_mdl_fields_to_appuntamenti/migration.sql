-- Migration: P56 MEDICINA DEL LAVORO - Add companyTenantProfileId and tipoVisitaMDL to appuntamenti
-- Rationale: These fields were written in AppuntamentoService.js and companies-routes.js but were
--            never added to the Prisma schema or migrated to the DB. Without them Prisma silently
--            ignored the values on create(), causing all tariffario-based pricing to fall back to
--            prezzoBase. The tipo_visita_mdl enum already exists (used by visite.tipoVisitaMDL).

-- Add companyTenantProfileId (FK to company_tenant_profiles)
ALTER TABLE "appuntamenti" ADD COLUMN "companyTenantProfileId" TEXT;

-- Add tipoVisitaMDL using the existing PostgreSQL enum
ALTER TABLE "appuntamenti" ADD COLUMN "tipoVisitaMDL" "tipo_visita_mdl";

-- Performance indexes
CREATE INDEX "appuntamenti_companyTenantProfileId_idx" ON "appuntamenti"("companyTenantProfileId");
CREATE INDEX "appuntamenti_tipoVisitaMDL_idx" ON "appuntamenti"("tipoVisitaMDL");

-- Foreign key constraint (DEFERRABLE so bulk inserts work)
ALTER TABLE "appuntamenti"
  ADD CONSTRAINT "appuntamenti_companyTenantProfileId_fkey"
  FOREIGN KEY ("companyTenantProfileId")
  REFERENCES "company_tenant_profiles"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
