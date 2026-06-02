-- Storico occupazionale per ricostruire assegnazioni azienda/sede/reparto/mansione/protocollo
-- e snapshot sanitario MDL per lavoratore.

ALTER TABLE "profili_salute_persone"
  ADD COLUMN IF NOT EXISTS "sorveglianzaSanitaria" JSONB,
  ADD COLUMN IF NOT EXISTS "storicoOccupazionale" JSONB;

CREATE TABLE IF NOT EXISTS "stati_occupazionali_storici" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "personTenantProfileId" TEXT,
  "companyTenantProfileId" TEXT,
  "siteId" TEXT,
  "repartoId" TEXT,
  "mansioneId" TEXT,
  "protocolloSanitarioId" TEXT,
  "titolo" VARCHAR(100),
  "status" "person_status",
  "tipoContratto" "tipo_contratto",
  "oreSettimanali" INTEGER,
  "dataInizio" DATE NOT NULL,
  "dataFine" DATE,
  "isCorrente" BOOLEAN NOT NULL DEFAULT true,
  "fonte" VARCHAR(80) NOT NULL DEFAULT 'PERSON_TENANT_PROFILE',
  "motivo" VARCHAR(255),
  "snapshot" JSONB,
  "note" TEXT,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(6),
  CONSTRAINT "stati_occupazionali_storici_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stati_occupazionali_storici_personId_fkey'
  ) THEN
    ALTER TABLE "stati_occupazionali_storici"
      ADD CONSTRAINT "stati_occupazionali_storici_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stati_occupazionali_storici_tenantId_fkey'
  ) THEN
    ALTER TABLE "stati_occupazionali_storici"
      ADD CONSTRAINT "stati_occupazionali_storici_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stati_occupazionali_storici_personTenantProfileId_fkey'
  ) THEN
    ALTER TABLE "stati_occupazionali_storici"
      ADD CONSTRAINT "stati_occupazionali_storici_personTenantProfileId_fkey"
      FOREIGN KEY ("personTenantProfileId") REFERENCES "person_tenant_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stati_occupazionali_storici_companyTenantProfileId_fkey'
  ) THEN
    ALTER TABLE "stati_occupazionali_storici"
      ADD CONSTRAINT "stati_occupazionali_storici_companyTenantProfileId_fkey"
      FOREIGN KEY ("companyTenantProfileId") REFERENCES "company_tenant_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stati_occupazionali_storici_siteId_fkey'
  ) THEN
    ALTER TABLE "stati_occupazionali_storici"
      ADD CONSTRAINT "stati_occupazionali_storici_siteId_fkey"
      FOREIGN KEY ("siteId") REFERENCES "company_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stati_occupazionali_storici_repartoId_fkey'
  ) THEN
    ALTER TABLE "stati_occupazionali_storici"
      ADD CONSTRAINT "stati_occupazionali_storici_repartoId_fkey"
      FOREIGN KEY ("repartoId") REFERENCES "Reparto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stati_occupazionali_storici_mansioneId_fkey'
  ) THEN
    ALTER TABLE "stati_occupazionali_storici"
      ADD CONSTRAINT "stati_occupazionali_storici_mansioneId_fkey"
      FOREIGN KEY ("mansioneId") REFERENCES "mansioni"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stati_occupazionali_storici_protocolloSanitarioId_fkey'
  ) THEN
    ALTER TABLE "stati_occupazionali_storici"
      ADD CONSTRAINT "stati_occupazionali_storici_protocolloSanitarioId_fkey"
      FOREIGN KEY ("protocolloSanitarioId") REFERENCES "protocolli_sanitari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_personId_idx" ON "stati_occupazionali_storici"("personId");
CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_tenantId_idx" ON "stati_occupazionali_storici"("tenantId");
CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_personId_tenantId_isCorrente_idx" ON "stati_occupazionali_storici"("personId", "tenantId", "isCorrente");
CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_companyTenantProfileId_idx" ON "stati_occupazionali_storici"("companyTenantProfileId");
CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_siteId_idx" ON "stati_occupazionali_storici"("siteId");
CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_repartoId_idx" ON "stati_occupazionali_storici"("repartoId");
CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_mansioneId_idx" ON "stati_occupazionali_storici"("mansioneId");
CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_protocolloSanitarioId_idx" ON "stati_occupazionali_storici"("protocolloSanitarioId");
CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_dataInizio_idx" ON "stati_occupazionali_storici"("dataInizio");
CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_dataFine_idx" ON "stati_occupazionali_storici"("dataFine");
CREATE INDEX IF NOT EXISTS "stati_occupazionali_storici_deletedAt_idx" ON "stati_occupazionali_storici"("deletedAt");
