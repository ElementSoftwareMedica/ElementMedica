-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubmissionType" ADD VALUE 'COURSE_TEST';
ALTER TYPE "SubmissionType" ADD VALUE 'COURSE_EVALUATION';
ALTER TYPE "SubmissionType" ADD VALUE 'PERSON_DATA_COLLECTION';
ALTER TYPE "SubmissionType" ADD VALUE 'COURSE_ENROLLMENT';
ALTER TYPE "SubmissionType" ADD VALUE 'CUSTOM_FORM';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "person_permissions" ADD VALUE 'READ_PUBLIC_CONTENT';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_SUBMISSIONS';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_SUBMISSIONS';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_SUBMISSIONS';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_FORM_TEMPLATES';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_FORM_TEMPLATES';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_FORM_TEMPLATES';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_FORM_TEMPLATES';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_FORM_TEMPLATES';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_PUBLIC_CMS';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_PUBLIC_CMS';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_PUBLIC_CMS';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_PUBLIC_CMS';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_PUBLIC_CMS';

-- AlterTable
ALTER TABLE "contact_submissions" ADD COLUMN     "autoCreatePerson" BOOLEAN DEFAULT false,
ADD COLUMN     "conditionalFields" JSONB,
ADD COLUMN     "courseScheduleId" TEXT,
ADD COLUMN     "createdPersonId" TEXT,
ADD COLUMN     "formData" JSONB,
ADD COLUMN     "formSchema" JSONB,
ADD COLUMN     "formVersion" INTEGER DEFAULT 1,
ADD COLUMN     "isTemplate" BOOLEAN DEFAULT false,
ADD COLUMN     "relatedPersonId" TEXT,
ADD COLUMN     "templateName" TEXT,
ADD COLUMN     "validationRules" JSONB;

-- CreateTable
CREATE TABLE "form_fields" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "helpText" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "conditional" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "SubmissionType" NOT NULL,
    "schema" JSONB NOT NULL,
    "validationRules" JSONB,
    "conditionalFields" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_fields_isActive_idx" ON "form_fields"("isActive");

-- CreateIndex
CREATE INDEX "form_fields_order_idx" ON "form_fields"("order");

-- CreateIndex
CREATE INDEX "form_fields_templateId_idx" ON "form_fields"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_templateId_name_key" ON "form_fields"("templateId", "name");

-- CreateIndex
CREATE INDEX "form_templates_isActive_idx" ON "form_templates"("isActive");

-- CreateIndex
CREATE INDEX "form_templates_name_idx" ON "form_templates"("name");

-- CreateIndex
CREATE INDEX "form_templates_tenantId_idx" ON "form_templates"("tenantId");

-- CreateIndex
CREATE INDEX "form_templates_type_idx" ON "form_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "form_templates_tenantId_name_version_key" ON "form_templates"("tenantId", "name", "version");

-- CreateIndex
CREATE INDEX "contact_submissions_courseScheduleId_idx" ON "contact_submissions"("courseScheduleId");

-- CreateIndex
CREATE INDEX "contact_submissions_createdPersonId_idx" ON "contact_submissions"("createdPersonId");

-- CreateIndex
CREATE INDEX "contact_submissions_formVersion_idx" ON "contact_submissions"("formVersion");

-- CreateIndex
CREATE INDEX "contact_submissions_isTemplate_idx" ON "contact_submissions"("isTemplate");

-- CreateIndex
CREATE INDEX "contact_submissions_relatedPersonId_idx" ON "contact_submissions"("relatedPersonId");

-- CreateIndex
CREATE INDEX "contact_submissions_templateName_idx" ON "contact_submissions"("templateName");

-- AddForeignKey
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_courseScheduleId_fkey" FOREIGN KEY ("courseScheduleId") REFERENCES "CourseSchedule"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_createdPersonId_fkey" FOREIGN KEY ("createdPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_relatedPersonId_fkey" FOREIGN KEY ("relatedPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
