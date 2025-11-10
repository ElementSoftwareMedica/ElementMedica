-- Phase 1.1: Database Enums Creation
-- Template Management System
-- Date: 4 November 2025

-- Create TemplateType enum (6 values)
CREATE TYPE "TemplateType" AS ENUM (
  'LETTER_OF_ENGAGEMENT',    -- Lettera di Incarico
  'ATTENDANCE_REGISTER',     -- Registro Presenze
  'CERTIFICATE',             -- Attestato
  'INVOICE',                 -- Fattura (future)
  'COURSE_PROGRAM',          -- Programma Corso (future)
  'CUSTOM'                   -- Custom documents
);

-- Create TemplateFormat enum (4 values)
CREATE TYPE "TemplateFormat" AS ENUM (
  'HTML',                    -- HTML template (default)
  'DOCX',                    -- Microsoft Word
  'GOOGLE_DOCS',             -- Google Docs
  'GOOGLE_SLIDES'            -- Google Slides (for certificates)
);

-- Create DocumentStatus enum (4 values)
CREATE TYPE "DocumentStatus" AS ENUM (
  'DRAFT',                   -- Document in draft
  'GENERATED',               -- Document generated
  'SENT',                    -- Document sent via email
  'ARCHIVED'                 -- Document archived
);

-- Migration notes:
-- 1. These enums will be used to enhance TemplateLink model
-- 2. String fields 'type' and 'fileFormat' will be converted to these enums in next migration
-- 3. DocumentStatus will be used in GeneratedDocument model (to be created)
