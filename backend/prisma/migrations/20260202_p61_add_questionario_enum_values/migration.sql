-- P61: Add missing enum values for TipoDocumentoTemplate
-- These values are needed for MDL medical questionnaires

-- Add new enum values to tipi_documento_template
-- PostgreSQL allows adding values to enums but not removing them

ALTER TYPE "tipi_documento_template" ADD VALUE IF NOT EXISTS 'QUESTIONARIO_ANAMNESI_MDL';
ALTER TYPE "tipi_documento_template" ADD VALUE IF NOT EXISTS 'QUESTIONARIO_RISCHIO';
ALTER TYPE "tipi_documento_template" ADD VALUE IF NOT EXISTS 'QUESTIONARIO_SINTOMI';
ALTER TYPE "tipi_documento_template" ADD VALUE IF NOT EXISTS 'SCHEDA_SORVEGLIANZA';
ALTER TYPE "tipi_documento_template" ADD VALUE IF NOT EXISTS 'ALCOL_SCREENING';
