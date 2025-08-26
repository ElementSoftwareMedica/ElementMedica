/*
  Warnings:

  - You are about to drop the column `ragione_sociale` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `CourseSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `CourseSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `CourseSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `CourseSession` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `ScheduleCompany` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `TemplateLink` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `TemplateLink` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `TemplateLink` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `attestati` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `attestati` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `attestati` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `course_enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `course_enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `course_enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `lettere_incarico` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `lettere_incarico` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `lettere_incarico` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `registri_presenze` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `registri_presenze` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `registri_presenze` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `registro_presenze_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `registro_presenze_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `registro_presenze_partecipanti` table. All the data in the column will be lost.
  - Added the required column `ragioneSociale` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ConsentRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `CourseSchedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CourseSchedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `CourseSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `GdprAuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ScheduleCompany` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `TemplateLink` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TemplateLink` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `activity_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `attestati` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `attestati` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `course_enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `course_enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `fattura_aziende` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `fatture` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `lettere_incarico` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `lettere_incarico` table without a default value. This is not possible if the table is not empty.
  - Made the column `tenantId` on table `person_roles` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `tenantId` to the `person_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `preventivi` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `preventivo_aziende` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `preventivo_partecipanti` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `registri_presenze` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `registri_presenze` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `registro_presenze_partecipanti` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `registro_presenze_partecipanti` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `test_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `test_partecipanti` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Company" DROP COLUMN "ragione_sociale",
ADD COLUMN     "ragioneSociale" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ConsentRecord" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CourseSchedule" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CourseSession" DROP COLUMN "deleted_at",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GdprAuditLog" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleCompany" DROP COLUMN "deleted_at",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TemplateLink" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "attestati" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "course_enrollments" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "fattura_aziende" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "fatture" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "lettere_incarico" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "person_roles" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "person_sessions" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "preventivi" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "preventivo_aziende" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "preventivo_partecipanti" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "registri_presenze" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "registro_presenze_partecipanti" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "test_documents" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "test_partecipanti" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRetentionPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityAuditLog_tenantId_action_idx" ON "SecurityAuditLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_tenantId_createdAt_idx" ON "SecurityAuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_userId_action_idx" ON "SecurityAuditLog"("userId", "action");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_tenantId_isActive_idx" ON "DataRetentionPolicy"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DataRetentionPolicy_tenantId_resourceType_key" ON "DataRetentionPolicy"("tenantId", "resourceType");

-- CreateIndex
CREATE INDEX "ConsentRecord_tenantId_idx" ON "ConsentRecord"("tenantId");

-- CreateIndex
CREATE INDEX "ConsentRecord_personId_consentType_idx" ON "ConsentRecord"("personId", "consentType");

-- CreateIndex
CREATE INDEX "ConsentRecord_consentType_consentGiven_idx" ON "ConsentRecord"("consentType", "consentGiven");

-- CreateIndex
CREATE INDEX "ConsentRecord_givenAt_idx" ON "ConsentRecord"("givenAt");

-- CreateIndex
CREATE INDEX "Course_tenantId_status_idx" ON "Course"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Course_status_createdAt_idx" ON "Course"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CourseSchedule_startDate_endDate_idx" ON "CourseSchedule"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "CourseSchedule_companyId_startDate_idx" ON "CourseSchedule"("companyId", "startDate");

-- CreateIndex
CREATE INDEX "CourseSchedule_tenantId_idx" ON "CourseSchedule"("tenantId");

-- CreateIndex
CREATE INDEX "CourseSchedule_tenantId_status_idx" ON "CourseSchedule"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CourseSession_tenantId_idx" ON "CourseSession"("tenantId");

-- CreateIndex
CREATE INDEX "GdprAuditLog_tenantId_idx" ON "GdprAuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "GdprAuditLog_personId_action_createdAt_idx" ON "GdprAuditLog"("personId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "GdprAuditLog_resourceType_createdAt_idx" ON "GdprAuditLog"("resourceType", "createdAt");

-- CreateIndex
CREATE INDEX "GdprAuditLog_action_idx" ON "GdprAuditLog"("action");

-- CreateIndex
CREATE INDEX "ScheduleCompany_tenantId_idx" ON "ScheduleCompany"("tenantId");

-- CreateIndex
CREATE INDEX "TemplateLink_tenantId_idx" ON "TemplateLink"("tenantId");

-- CreateIndex
CREATE INDEX "activity_logs_tenantId_idx" ON "activity_logs"("tenantId");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_timestamp_idx" ON "activity_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "activity_logs_action_timestamp_idx" ON "activity_logs"("action", "timestamp");

-- CreateIndex
CREATE INDEX "activity_logs_timestamp_idx" ON "activity_logs"("timestamp");

-- CreateIndex
CREATE INDEX "attestati_tenantId_idx" ON "attestati"("tenantId");

-- CreateIndex
CREATE INDEX "course_enrollments_tenantId_idx" ON "course_enrollments"("tenantId");

-- CreateIndex
CREATE INDEX "course_enrollments_employee_id_status_idx" ON "course_enrollments"("employee_id", "status");

-- CreateIndex
CREATE INDEX "course_enrollments_scheduleId_status_idx" ON "course_enrollments"("scheduleId", "status");

-- CreateIndex
CREATE INDEX "fattura_aziende_tenantId_idx" ON "fattura_aziende"("tenantId");

-- CreateIndex
CREATE INDEX "fatture_tenantId_idx" ON "fatture"("tenantId");

-- CreateIndex
CREATE INDEX "lettere_incarico_tenantId_idx" ON "lettere_incarico"("tenantId");

-- CreateIndex
CREATE INDEX "person_roles_tenantId_roleType_idx" ON "person_roles"("tenantId", "roleType");

-- CreateIndex
CREATE INDEX "person_roles_companyId_roleType_isActive_idx" ON "person_roles"("companyId", "roleType", "isActive");

-- CreateIndex
CREATE INDEX "person_sessions_tenantId_idx" ON "person_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "persons_tenantId_status_idx" ON "persons"("tenantId", "status");

-- CreateIndex
CREATE INDEX "persons_companyId_tenantId_idx" ON "persons"("companyId", "tenantId");

-- CreateIndex
CREATE INDEX "persons_email_tenantId_idx" ON "persons"("email", "tenantId");

-- CreateIndex
CREATE INDEX "preventivi_tenantId_idx" ON "preventivi"("tenantId");

-- CreateIndex
CREATE INDEX "preventivo_aziende_tenantId_idx" ON "preventivo_aziende"("tenantId");

-- CreateIndex
CREATE INDEX "preventivo_partecipanti_tenantId_idx" ON "preventivo_partecipanti"("tenantId");

-- CreateIndex
CREATE INDEX "refresh_tokens_tenantId_idx" ON "refresh_tokens"("tenantId");

-- CreateIndex
CREATE INDEX "refresh_tokens_personId_expiresAt_idx" ON "refresh_tokens"("personId", "expiresAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "registri_presenze_tenantId_idx" ON "registri_presenze"("tenantId");

-- CreateIndex
CREATE INDEX "registro_presenze_partecipanti_tenantId_idx" ON "registro_presenze_partecipanti"("tenantId");

-- CreateIndex
CREATE INDEX "test_documents_tenantId_idx" ON "test_documents"("tenantId");

-- CreateIndex
CREATE INDEX "test_partecipanti_tenantId_idx" ON "test_partecipanti"("tenantId");

-- AddForeignKey
ALTER TABLE "CourseSchedule" ADD CONSTRAINT "CourseSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleCompany" ADD CONSTRAINT "ScheduleCompany_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestati" ADD CONSTRAINT "attestati_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateLink" ADD CONSTRAINT "TemplateLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lettere_incarico" ADD CONSTRAINT "lettere_incarico_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registri_presenze" ADD CONSTRAINT "registri_presenze_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_presenze_partecipanti" ADD CONSTRAINT "registro_presenze_partecipanti_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivo_partecipanti" ADD CONSTRAINT "preventivo_partecipanti_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivo_aziende" ADD CONSTRAINT "preventivo_aziende_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatture" ADD CONSTRAINT "fatture_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fattura_aziende" ADD CONSTRAINT "fattura_aziende_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_documents" ADD CONSTRAINT "test_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_partecipanti" ADD CONSTRAINT "test_partecipanti_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GdprAuditLog" ADD CONSTRAINT "GdprAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_sessions" ADD CONSTRAINT "person_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAuditLog" ADD CONSTRAINT "SecurityAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRetentionPolicy" ADD CONSTRAINT "DataRetentionPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
