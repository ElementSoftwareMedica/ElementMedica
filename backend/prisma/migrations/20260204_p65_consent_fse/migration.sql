-- P65 - Consensi FSE (Fase 3)
-- Migration: p65_consent_fse
-- Date: 2026-02-04
-- Description: Creates ConsentFSE model with FSE-specific consent management

-- ============================================
-- NEW ENUMS FOR CONSENT FSE
-- ============================================

-- Tipo consenso FSE (Art. 12 D.L. 179/2012)
CREATE TYPE "tipo_consenso_fse" AS ENUM (
    'ALIMENTAZIONE',
    'CONSULTAZIONE',
    'CONSULTAZIONE_EMERGENZA',
    'PREGRESSO',
    'DOSSIER_FARMACEUTICO',
    'CONDIVISIONE_MC',
    'CONDIVISIONE_RSPP',
    'CONDIVISIONE_DL'
);

-- Modalità raccolta consenso
CREATE TYPE "modalita_raccolta_consenso" AS ENUM (
    'CARTACEO_FIRMA_AUTOGRAFA',
    'DIGITALE_FIRMA_GRAFOMETRICA',
    'DIGITALE_FEQ',
    'DIGITALE_SPID',
    'DIGITALE_CIE',
    'VERBALE_CON_TESTIMONE'
);

-- Tipo dato clinico (per oscuramento)
CREATE TYPE "tipo_dato_clinico" AS ENUM (
    'REFERTI_LABORATORIO',
    'REFERTI_RADIOLOGIA',
    'REFERTI_SPECIALISTICA',
    'PRESCRIZIONI_FARMACI',
    'VACCINAZIONI',
    'DIAGNOSI_SENSIBILI',
    'CERTIFICATI_IDONEITA',
    'GIUDIZI_MDL'
);

-- Tipo delega
CREATE TYPE "tipo_delega" AS ENUM (
    'TUTORE_LEGALE',
    'GENITORE_MINORE',
    'AMMINISTRATORE_SOSTEGNO',
    'DELEGA_VOLONTARIA'
);

-- ============================================
-- NEW TABLE: consent_fse
-- ============================================

CREATE TABLE "consent_fse" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "tipoConsenso" "tipo_consenso_fse" NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "modalitaRaccolta" "modalita_raccolta_consenso" NOT NULL,
    "documentoRiferimento" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "oscuramentoAttivo" BOOLEAN NOT NULL DEFAULT false,
    "tipiDatiOscurati" "tipo_dato_clinico"[],
    "delegatoId" TEXT,
    "tipoDelega" "tipo_delega",
    "documentoDelega" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "consent_fse_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one consent type per person per tenant
CREATE UNIQUE INDEX "consent_fse_personId_tipoConsenso_tenantId_key" 
    ON "consent_fse"("personId", "tipoConsenso", "tenantId");

-- Performance indexes
CREATE INDEX "consent_fse_tenantId_idx" ON "consent_fse"("tenantId");
CREATE INDEX "consent_fse_personId_idx" ON "consent_fse"("personId");
CREATE INDEX "consent_fse_tipoConsenso_idx" ON "consent_fse"("tipoConsenso");
CREATE INDEX "consent_fse_consentGiven_idx" ON "consent_fse"("consentGiven");
CREATE INDEX "consent_fse_tenantId_deletedAt_idx" ON "consent_fse"("tenantId", "deletedAt");
CREATE INDEX "consent_fse_tenantId_personId_idx" ON "consent_fse"("tenantId", "personId");

-- Foreign keys
ALTER TABLE "consent_fse" ADD CONSTRAINT "consent_fse_personId_fkey" 
    FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "consent_fse" ADD CONSTRAINT "consent_fse_delegatoId_fkey" 
    FOREIGN KEY ("delegatoId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "consent_fse" ADD CONSTRAINT "consent_fse_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
