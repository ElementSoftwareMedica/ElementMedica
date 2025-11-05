/*
  Warnings:

  - The `fileFormat` column on the `TemplateLink` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `TemplateLink` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/

-- CreateEnum (if not exists)
DO $$ BEGIN
  CREATE TYPE "TemplateType" AS ENUM ('LETTER_OF_ENGAGEMENT', 'ATTENDANCE_REGISTER', 'CERTIFICATE', 'INVOICE', 'COURSE_PROGRAM', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TemplateFormat" AS ENUM ('HTML', 'DOCX', 'GOOGLE_DOCS', 'GOOGLE_SLIDES');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "TemplateLink" ADD COLUMN     "category" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "layout" JSONB,
ADD COLUMN     "markerSchema" JSONB,
ADD COLUMN     "markers" JSONB,
ADD COLUMN     "styles" JSONB,
ADD COLUMN     "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "type",
ADD COLUMN     "type" "TemplateType" NOT NULL,
DROP COLUMN "fileFormat",
ADD COLUMN     "fileFormat" "TemplateFormat" NOT NULL DEFAULT 'HTML';

-- AlterTable
ALTER TABLE "attestati" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "generatedBy" TEXT,
ADD COLUMN     "markers" JSONB,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "templateVersion" INTEGER;

-- AlterTable
ALTER TABLE "lettere_incarico" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "generatedBy" TEXT,
ADD COLUMN     "markers" JSONB,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "templateVersion" INTEGER;

-- AlterTable
ALTER TABLE "registri_presenze" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "generatedBy" TEXT,
ADD COLUMN     "markers" JSONB,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "templateVersion" INTEGER;

-- CreateTable
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "header" TEXT,
    "footer" TEXT,
    "styles" JSONB,
    "layout" JSONB,
    "markers" JSONB,
    "changesSummary" TEXT,
    "changeDetails" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "type" "TemplateType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "markers" JSONB NOT NULL,
    "metadata" JSONB,
    "status" "DocumentStatus" NOT NULL DEFAULT 'GENERATED',
    "batchId" TEXT,
    "batchSize" INTEGER,
    "batchIndex" INTEGER,
    "sentAt" TIMESTAMP(3),
    "sentTo" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadAt" TIMESTAMP(3),
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateVersion_templateId_createdAt_idx" ON "TemplateVersion"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "TemplateVersion_tenantId_idx" ON "TemplateVersion"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateVersion_templateId_version_key" ON "TemplateVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "GeneratedDocument_templateId_idx" ON "GeneratedDocument"("templateId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_entityType_entityId_idx" ON "GeneratedDocument"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_tenantId_generatedAt_idx" ON "GeneratedDocument"("tenantId", "generatedAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_generatedBy_idx" ON "GeneratedDocument"("generatedBy");

-- CreateIndex
CREATE INDEX "GeneratedDocument_batchId_idx" ON "GeneratedDocument"("batchId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_status_idx" ON "GeneratedDocument"("status");

-- CreateIndex
CREATE INDEX "GeneratedDocument_type_status_idx" ON "GeneratedDocument"("type", "status");

-- CreateIndex
CREATE INDEX "TemplateLink_tenantId_type_idx" ON "TemplateLink"("tenantId", "type");

-- CreateIndex
CREATE INDEX "TemplateLink_tenantId_type_isActive_idx" ON "TemplateLink"("tenantId", "type", "isActive");

-- CreateIndex
CREATE INDEX "TemplateLink_isDefault_type_idx" ON "TemplateLink"("isDefault", "type");

-- CreateIndex
CREATE INDEX "TemplateLink_deletedAt_idx" ON "TemplateLink"("deletedAt");

-- CreateIndex
CREATE INDEX "TemplateLink_createdBy_idx" ON "TemplateLink"("createdBy");

-- CreateIndex
CREATE INDEX "attestati_templateId_idx" ON "attestati"("templateId");

-- CreateIndex
CREATE INDEX "lettere_incarico_templateId_idx" ON "lettere_incarico"("templateId");

-- CreateIndex
CREATE INDEX "registri_presenze_templateId_idx" ON "registri_presenze"("templateId");

-- AddForeignKey
ALTER TABLE "attestati" ADD CONSTRAINT "attestati_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TemplateLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateLink" ADD CONSTRAINT "TemplateLink_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TemplateLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TemplateLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lettere_incarico" ADD CONSTRAINT "lettere_incarico_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TemplateLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registri_presenze" ADD CONSTRAINT "registri_presenze_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TemplateLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
