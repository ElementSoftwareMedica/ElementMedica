-- P65 Fase 2: Signature Placeholders Expansion
-- Migration: Add signature fields to DVR, Sopralluogo, Preventivo, RegistroPresenze
-- Date: 2026-02-04

-- ============================================
-- 1. EXTEND ENUMS
-- ============================================

-- Add new document types
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'SOPRALLUOGO';
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'DVR';
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'PREVENTIVO';
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'REGISTRO_PRESENZE';
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'QUESTIONARIO_RISPOSTA';
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'VERBALE_RIUNIONE';
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'NOMINA';

-- Add new signatory roles
ALTER TYPE "tipo_firmatario" ADD VALUE IF NOT EXISTS 'RSPP';
ALTER TYPE "tipo_firmatario" ADD VALUE IF NOT EXISTS 'MEDICO_COMPETENTE';
ALTER TYPE "tipo_firmatario" ADD VALUE IF NOT EXISTS 'RLS';
ALTER TYPE "tipo_firmatario" ADD VALUE IF NOT EXISTS 'PREPOSTO';
ALTER TYPE "tipo_firmatario" ADD VALUE IF NOT EXISTS 'PARTECIPANTE';

-- ============================================
-- 2. DVR - SIGNATURE FIELDS
-- ============================================

-- RSPP signature
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRspp" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRsppAt" TIMESTAMP(3);
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRsppId" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRsppIp" VARCHAR(45);

-- Medico Competente signature
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaMc" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaMcAt" TIMESTAMP(3);
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaMcId" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaMcIp" VARCHAR(45);

-- Datore Lavoro signature
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaDatore" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaDatoreAt" TIMESTAMP(3);
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaDatoreId" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaDatoreIp" VARCHAR(45);

-- RLS signature
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRls" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRlsAt" TIMESTAMP(3);
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRlsId" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRlsIp" VARCHAR(45);

-- Foreign keys
ALTER TABLE "DVR" ADD CONSTRAINT "DVR_firmaRsppId_fkey" FOREIGN KEY ("firmaRsppId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DVR" ADD CONSTRAINT "DVR_firmaMcId_fkey" FOREIGN KEY ("firmaMcId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DVR" ADD CONSTRAINT "DVR_firmaDatoreId_fkey" FOREIGN KEY ("firmaDatoreId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DVR" ADD CONSTRAINT "DVR_firmaRlsId_fkey" FOREIGN KEY ("firmaRlsId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "DVR_firmaRsppId_idx" ON "DVR"("firmaRsppId");
CREATE INDEX IF NOT EXISTS "DVR_firmaMcId_idx" ON "DVR"("firmaMcId");
CREATE INDEX IF NOT EXISTS "DVR_firmaDatoreId_idx" ON "DVR"("firmaDatoreId");

-- ============================================
-- 3. SOPRALLUOGO - SIGNATURE FIELDS
-- ============================================

-- MC signature
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaMc" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaMcAt" TIMESTAMP(3);
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaMcId" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaMcIp" VARCHAR(45);

-- RSPP signature
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaRspp" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaRsppAt" TIMESTAMP(3);
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaRsppId" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaRsppIp" VARCHAR(45);

-- Datore signature
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaDatore" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaDatoreAt" TIMESTAMP(3);
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaDatoreId" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaDatoreIp" VARCHAR(45);

-- Foreign keys
ALTER TABLE "Sopralluogo" ADD CONSTRAINT "Sopralluogo_firmaMcId_fkey" FOREIGN KEY ("firmaMcId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sopralluogo" ADD CONSTRAINT "Sopralluogo_firmaRsppId_fkey" FOREIGN KEY ("firmaRsppId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sopralluogo" ADD CONSTRAINT "Sopralluogo_firmaDatoreId_fkey" FOREIGN KEY ("firmaDatoreId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "Sopralluogo_firmaMcId_idx" ON "Sopralluogo"("firmaMcId");
CREATE INDEX IF NOT EXISTS "Sopralluogo_firmaRsppId_idx" ON "Sopralluogo"("firmaRsppId");
CREATE INDEX IF NOT EXISTS "Sopralluogo_firmaDatoreId_idx" ON "Sopralluogo"("firmaDatoreId");

-- ============================================
-- 4. PREVENTIVO - SIGNATURE FIELDS
-- ============================================

-- Operatore signature
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaOperatore" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaOperatoreAt" TIMESTAMP(3);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaOperatoreId" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaOperatoreIp" VARCHAR(45);

-- Cliente signature
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaCliente" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaClienteAt" TIMESTAMP(3);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaClienteId" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaClienteIp" VARCHAR(45);

-- Foreign keys
ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_firmaOperatoreId_fkey" FOREIGN KEY ("firmaOperatoreId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_firmaClienteId_fkey" FOREIGN KEY ("firmaClienteId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "preventivi_firmaOperatoreId_idx" ON "preventivi"("firmaOperatoreId");
CREATE INDEX IF NOT EXISTS "preventivi_firmaClienteId_idx" ON "preventivi"("firmaClienteId");

-- ============================================
-- 5. REGISTRO PRESENZE - SIGNATURE FIELDS
-- ============================================

-- Formatore signature
ALTER TABLE "registri_presenze" ADD COLUMN IF NOT EXISTS "firmaFormatore" TEXT;
ALTER TABLE "registri_presenze" ADD COLUMN IF NOT EXISTS "firmaFormatoreAt" TIMESTAMP(3);
ALTER TABLE "registri_presenze" ADD COLUMN IF NOT EXISTS "firmaFormatoreId" TEXT;
ALTER TABLE "registri_presenze" ADD COLUMN IF NOT EXISTS "firmaFormatoreIp" VARCHAR(45);

-- Foreign key
ALTER TABLE "registri_presenze" ADD CONSTRAINT "registri_presenze_firmaFormatoreId_fkey" FOREIGN KEY ("firmaFormatoreId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index
CREATE INDEX IF NOT EXISTS "registri_presenze_firmaFormatoreId_idx" ON "registri_presenze"("firmaFormatoreId");
