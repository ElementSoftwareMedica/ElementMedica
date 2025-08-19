-- Migration: Course Enhancement for Public Frontend
-- Date: 2025-01-27
-- Description: Aggiunta campi per varianti rischio, tipologie corso, contenuti pubblici e SEO

-- Creazione nuovi enum
CREATE TYPE "RiskLevel" AS ENUM ('ALTO', 'MEDIO', 'BASSO', 'A', 'B', 'C');
CREATE TYPE "CourseType" AS ENUM ('PRIMO_CORSO', 'AGGIORNAMENTO');

-- Aggiunta nuovi campi alla tabella Course
ALTER TABLE "Course" ADD COLUMN "riskLevel" "RiskLevel";
ALTER TABLE "Course" ADD COLUMN "courseType" "CourseType";
ALTER TABLE "Course" ADD COLUMN "subcategory" TEXT;
ALTER TABLE "Course" ADD COLUMN "shortDescription" TEXT;
ALTER TABLE "Course" ADD COLUMN "fullDescription" TEXT;
ALTER TABLE "Course" ADD COLUMN "image1Url" TEXT;
ALTER TABLE "Course" ADD COLUMN "image2Url" TEXT;
ALTER TABLE "Course" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Course" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Course" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "Course" ADD COLUMN "slug" TEXT;

-- Aggiunta constraint unique per slug
ALTER TABLE "Course" ADD CONSTRAINT "Course_slug_key" UNIQUE ("slug");

-- Creazione nuovi indici per performance
CREATE INDEX "Course_isPublic_idx" ON "Course"("isPublic");
CREATE INDEX "Course_slug_idx" ON "Course"("slug");
CREATE INDEX "Course_riskLevel_idx" ON "Course"("riskLevel");
CREATE INDEX "Course_courseType_idx" ON "Course"("courseType");
CREATE INDEX "Course_category_riskLevel_idx" ON "Course"("category", "riskLevel");
CREATE INDEX "Course_isPublic_status_idx" ON "Course"("isPublic", "status");

-- Aggiunta nuovi permessi per CMS
ALTER TYPE "PersonPermission" ADD VALUE 'VIEW_CMS';
ALTER TYPE "PersonPermission" ADD VALUE 'CREATE_CMS';
ALTER TYPE "PersonPermission" ADD VALUE 'EDIT_CMS';
ALTER TYPE "PersonPermission" ADD VALUE 'DELETE_CMS';
ALTER TYPE "PersonPermission" ADD VALUE 'MANAGE_PUBLIC_CONTENT';

-- Commenti per documentazione
COMMENT ON COLUMN "Course"."riskLevel" IS 'Livello di rischio del corso: Alto/Medio/Basso o A/B/C';
COMMENT ON COLUMN "Course"."courseType" IS 'Tipologia corso: Primo corso o Aggiornamento';
COMMENT ON COLUMN "Course"."subcategory" IS 'Sottocategoria per classificazioni future';
COMMENT ON COLUMN "Course"."shortDescription" IS 'Descrizione breve per card corso nel frontend pubblico';
COMMENT ON COLUMN "Course"."fullDescription" IS 'Descrizione completa per pagina dettaglio corso';
COMMENT ON COLUMN "Course"."image1Url" IS 'URL prima immagine del corso';
COMMENT ON COLUMN "Course"."image2Url" IS 'URL seconda immagine del corso';
COMMENT ON COLUMN "Course"."isPublic" IS 'Indica se il corso è visibile nel frontend pubblico';
COMMENT ON COLUMN "Course"."seoTitle" IS 'Titolo SEO personalizzato per il corso';
COMMENT ON COLUMN "Course"."seoDescription" IS 'Meta description SEO per il corso';
COMMENT ON COLUMN "Course"."slug" IS 'Identificatore URL-friendly per il corso';