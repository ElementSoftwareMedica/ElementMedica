-- P65 - Firma Digitale Avanzata
-- Migration: p65_firma_digitale_avanzata
-- Date: 2026-02-03
-- Description: Extends FirmaDigitale model with graphometric and FEQ support

-- ============================================
-- PREREQUISITE: Create stato_firma if not exists
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stato_firma') THEN
        CREATE TYPE "stato_firma" AS ENUM (
            'IN_ATTESA',
            'FIRMATO',
            'RIFIUTATO',
            'SCADUTO',
            'ANNULLATO'
        );
    ELSE
        -- Add ANNULLATO to stato_firma if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ANNULLATO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'stato_firma')) THEN
            ALTER TYPE "stato_firma" ADD VALUE 'ANNULLATO';
        END IF;
    END IF;
END$$;

-- ============================================
-- NEW ENUMS
-- ============================================

-- Tipo firma digitale
CREATE TYPE "tipo_firma_digitale" AS ENUM (
    'SEMPLICE',
    'GRAFOMETRICA',
    'FEQ',
    'FEA',
    'REMOTA'
);

-- Tipo documento firmato
CREATE TYPE "tipo_documento_firmato" AS ENUM (
    'REFERTO',
    'CONSENSO',
    'QUESTIONARIO',
    'CERTIFICATO',
    'GIUDIZIO_IDONEITA',
    'ALLEGATO_3B',
    'ALTRO'
);

-- Tipo firmatario
CREATE TYPE "tipo_firmatario" AS ENUM (
    'MEDICO',
    'PAZIENTE',
    'OPERATORE',
    'RAPPRESENTANTE_LEGALE'
);

-- Provider firma
CREATE TYPE "provider_firma" AS ENUM (
    'ARUBA',
    'INFOCERT',
    'NAMIRIAL',
    'POSTE_ITALIANE',
    'INTESI_GROUP',
    'INTERNAL'
);

-- Tipo dati biometrici
CREATE TYPE "tipo_dati_biometrici" AS ENUM (
    'IMMAGINE',
    'BIOMETRICO_BASE',
    'BIOMETRICO_FULL'
);

-- ============================================
-- NEW TABLE: firma_vault
-- ============================================

CREATE TABLE IF NOT EXISTS "firma_vault" (
    "id" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "dataType" "tipo_dati_biometrici" NOT NULL DEFAULT 'IMMAGINE',
    "expiresAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firma_vault_pkey" PRIMARY KEY ("id")
);

-- Indexes for firma_vault
CREATE INDEX IF NOT EXISTS "firma_vault_expiresAt_idx" ON "firma_vault"("expiresAt");
CREATE INDEX IF NOT EXISTS "firma_vault_dataType_idx" ON "firma_vault"("dataType");

-- ============================================
-- ALTER TABLE: firme_digitali
-- ============================================

-- Add new columns
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "documentType" "tipo_documento_firmato" NOT NULL DEFAULT 'REFERTO';
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "firmatarioRole" "tipo_firmatario" NOT NULL DEFAULT 'MEDICO';
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "tipoFirma" "tipo_firma_digitale" NOT NULL DEFAULT 'SEMPLICE';
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "algoritmo" TEXT NOT NULL DEFAULT 'SHA-256';
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "firmaVaultId" TEXT;
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "firmaImageUrl" TEXT;
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "timestampTSA" TIMESTAMP(3);
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "pkcs7Data" TEXT;
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "validatoDa" TEXT;
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "validatoAt" TIMESTAMP(3);
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "motivoRifiuto" TEXT;
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "dispositivo" TEXT;
ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Convert existing provider column to enum
-- First, save existing values and update column
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'firme_digitali' AND column_name = 'provider' AND data_type = 'text'
    ) INTO col_exists;
    
    IF col_exists THEN
        -- Create temporary column
        ALTER TABLE "firme_digitali" ADD COLUMN IF NOT EXISTS "provider_new" "provider_firma";
        
        -- Migrate data
        UPDATE "firme_digitali" SET "provider_new" = 
            CASE 
                WHEN UPPER(provider) = 'ARUBA' THEN 'ARUBA'::"provider_firma"
                WHEN UPPER(provider) = 'INFOCERT' THEN 'INFOCERT'::"provider_firma"
                WHEN UPPER(provider) = 'NAMIRIAL' THEN 'NAMIRIAL'::"provider_firma"
                WHEN UPPER(provider) LIKE '%POSTE%' THEN 'POSTE_ITALIANE'::"provider_firma"
                WHEN UPPER(provider) = 'INTESI_GROUP' THEN 'INTESI_GROUP'::"provider_firma"
                ELSE 'INTERNAL'::"provider_firma"
            END
        WHERE provider IS NOT NULL;
        
        -- Drop old column and rename new
        ALTER TABLE "firme_digitali" DROP COLUMN "provider";
        ALTER TABLE "firme_digitali" RENAME COLUMN "provider_new" TO "provider";
    END IF;
END$$;

-- Add foreign key constraint to firma_vault
ALTER TABLE "firme_digitali" 
    ADD CONSTRAINT "firme_digitali_firmaVaultId_fkey" 
    FOREIGN KEY ("firmaVaultId") REFERENCES "firma_vault"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique constraint for firmaVaultId
CREATE UNIQUE INDEX IF NOT EXISTS "firme_digitali_firmaVaultId_key" ON "firme_digitali"("firmaVaultId");

-- Add new indexes
CREATE INDEX IF NOT EXISTS "firme_digitali_tipoFirma_idx" ON "firme_digitali"("tipoFirma");
CREATE INDEX IF NOT EXISTS "firme_digitali_tenantId_stato_idx" ON "firme_digitali"("tenantId", "stato");
CREATE INDEX IF NOT EXISTS "firme_digitali_tenantId_firmatarioId_idx" ON "firme_digitali"("tenantId", "firmatarioId");
CREATE INDEX IF NOT EXISTS "firme_digitali_tenantId_deletedAt_idx" ON "firme_digitali"("tenantId", "deletedAt");

-- ============================================
-- ADD FK CONSTRAINTS
-- ============================================

-- Add FK to Person (firmatarioId) if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'firme_digitali_firmatarioId_fkey'
    ) THEN
        ALTER TABLE "firme_digitali" 
            ADD CONSTRAINT "firme_digitali_firmatarioId_fkey" 
            FOREIGN KEY ("firmatarioId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- Add FK to Tenant if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'firme_digitali_tenantId_fkey'
    ) THEN
        ALTER TABLE "firme_digitali" 
            ADD CONSTRAINT "firme_digitali_tenantId_fkey" 
            FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE "firma_vault" IS 'P65: Vault sicuro per dati biometrici firma grafometrica - AES-256-GCM encrypted';
COMMENT ON COLUMN "firma_vault"."encryptedData" IS 'Dati biometrici criptati AES-256-GCM';
COMMENT ON COLUMN "firma_vault"."iv" IS 'Initialization vector per AES-GCM';
COMMENT ON COLUMN "firma_vault"."authTag" IS 'Authentication tag GCM per verifica integrità';
COMMENT ON COLUMN "firma_vault"."keyVersion" IS 'Versione chiave usata (per key rotation)';
COMMENT ON COLUMN "firma_vault"."expiresAt" IS 'GDPR data retention - scadenza dati';

COMMENT ON COLUMN "firme_digitali"."tipoFirma" IS 'P65: Tipo di firma (SEMPLICE, GRAFOMETRICA, FEQ, FEA, REMOTA)';
COMMENT ON COLUMN "firme_digitali"."firmaVaultId" IS 'P65: FK a vault per dati biometrici criptati';
COMMENT ON COLUMN "firme_digitali"."firmaImageUrl" IS 'P65: URL immagine firma (solo visuale, no biometrico)';
COMMENT ON COLUMN "firme_digitali"."pkcs7Data" IS 'P65: Firma PKCS#7 per FEQ';
COMMENT ON COLUMN "firme_digitali"."timestampTSA" IS 'P65: Timestamp da Timestamp Authority';
