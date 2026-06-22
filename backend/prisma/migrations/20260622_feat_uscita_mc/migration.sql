-- Migration: feat_uscita_mc
-- Aggiunge entità UscitaMC (uscita medico competente) con movimentazione contabile automatica

-- Enum: StatoUscitaMC
CREATE TYPE "stato_uscita_mc" AS ENUM ('DA_FATTURARE', 'FATTURATA', 'ANNULLATA');

-- Enum: aggiunge USCITA_MC a TipoVoceTariffario
ALTER TYPE "TipoVoceTariffario" ADD VALUE 'USCITA_MC';

-- Enum: aggiunge USCITA_MC a tipo_attivita_movimento
ALTER TYPE "tipo_attivita_movimento" ADD VALUE 'USCITA_MC';

-- Tabella uscite_mc
CREATE TABLE "uscite_mc" (
    "id" TEXT NOT NULL,
    "companyTenantProfileId" TEXT NOT NULL,
    "siteId" TEXT,
    "medicoId" TEXT,
    "data" DATE NOT NULL,
    "note" TEXT,
    "stato" "stato_uscita_mc" NOT NULL DEFAULT 'DA_FATTURARE',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "uscite_mc_pkey" PRIMARY KEY ("id")
);

-- Indici uscite_mc
CREATE INDEX "uscite_mc_companyTenantProfileId_idx" ON "uscite_mc"("companyTenantProfileId");
CREATE INDEX "uscite_mc_tenantId_idx" ON "uscite_mc"("tenantId");
CREATE INDEX "uscite_mc_data_idx" ON "uscite_mc"("data");
CREATE INDEX "uscite_mc_tenantId_deletedAt_idx" ON "uscite_mc"("tenantId", "deletedAt");

-- FK uscite_mc
ALTER TABLE "uscite_mc" ADD CONSTRAINT "uscite_mc_companyTenantProfileId_fkey"
    FOREIGN KEY ("companyTenantProfileId") REFERENCES "company_tenant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "uscite_mc" ADD CONSTRAINT "uscite_mc_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "company_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "uscite_mc" ADD CONSTRAINT "uscite_mc_medicoId_fkey"
    FOREIGN KEY ("medicoId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Colonna uscitaMCId in movimenti_contabili
ALTER TABLE "movimenti_contabili" ADD COLUMN "uscitaMCId" TEXT;

CREATE INDEX "movimenti_contabili_uscitaMCId_idx" ON "movimenti_contabili"("uscitaMCId");

ALTER TABLE "movimenti_contabili" ADD CONSTRAINT "movimenti_contabili_uscitaMCId_fkey"
    FOREIGN KEY ("uscitaMCId") REFERENCES "uscite_mc"("id") ON DELETE SET NULL ON UPDATE CASCADE;
