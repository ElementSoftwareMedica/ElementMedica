/*
  Warnings:

  - You are about to drop the column `codice_ateco` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `codice_fiscale` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `persona_riferimento` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `sede_azienda` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_plan` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Company` table. All the data in the column will be lost.
  - The `status` column on the `Course` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `delivery_mode` on the `CourseSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `CourseSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `max_participants` on the `CourseSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `CourseSchedule` table. All the data in the column will be lost.
  - The `status` column on the `CourseSchedule` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `deleted_at` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `TemplateLink` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TemplateLink` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `allowed_fields` on the `advanced_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `advanced_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `advanced_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `person_role_id` on the `advanced_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `advanced_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `anno_progressivo` on the `attestati` table. All the data in the column will be lost.
  - You are about to drop the column `numero_progressivo` on the `attestati` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_course_id` on the `attestati` table. All the data in the column will be lost.
  - The `status` column on the `course_enrollments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `assigned_at` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `assigned_by` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `department_id` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `role_scope` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `role_type` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `tenant_id` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `enhanced_user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `fattura_aziende` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `fattura_aziende` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `fattura_aziende` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `fatture` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `fatture` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `fatture` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `preventivi` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `preventivi` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `preventivi` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `preventivo_aziende` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `preventivo_aziende` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `preventivo_aziende` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `preventivo_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `preventivo_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `preventivo_id` on the `preventivo_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `preventivo_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `registro_presenze_id` on the `registro_presenze_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `config_key` on the `tenant_configurations` table. All the data in the column will be lost.
  - You are about to drop the column `config_type` on the `tenant_configurations` table. All the data in the column will be lost.
  - You are about to drop the column `config_value` on the `tenant_configurations` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `tenant_configurations` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `tenant_configurations` table. All the data in the column will be lost.
  - You are about to drop the column `is_encrypted` on the `tenant_configurations` table. All the data in the column will be lost.
  - You are about to drop the column `tenant_id` on the `tenant_configurations` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `tenant_configurations` table. All the data in the column will be lost.
  - You are about to drop the column `billing_period` on the `tenant_usage` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `tenant_usage` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `tenant_usage` table. All the data in the column will be lost.
  - You are about to drop the column `tenant_id` on the `tenant_usage` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `tenant_usage` table. All the data in the column will be lost.
  - You are about to drop the column `usage_limit` on the `tenant_usage` table. All the data in the column will be lost.
  - You are about to drop the column `usage_type` on the `tenant_usage` table. All the data in the column will be lost.
  - You are about to drop the column `usage_value` on the `tenant_usage` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `test_documents` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `test_documents` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `test_documents` table. All the data in the column will be lost.
  - The `stato` column on the `test_documents` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tipologia` column on the `test_documents` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `punteggio` on the `test_documents` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to alter the column `sogliaSuperamento` on the `test_documents` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to drop the column `created_at` on the `test_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `data_consegna` on the `test_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `test_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `tempo_impiegato` on the `test_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `test_id` on the `test_partecipanti` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `test_partecipanti` table. All the data in the column will be lost.
  - You are about to alter the column `punteggio` on the `test_partecipanti` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - The `stato` column on the `test_partecipanti` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[user_id,tenantId,roleType,companyId]` on the table `enhanced_user_roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[personId,roleType,customRoleId,companyId,tenantId]` on the table `person_roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[preventivoId,partecipante_id]` on the table `preventivo_partecipanti` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[registroPresenzeId,partecipante_id]` on the table `registro_presenze_partecipanti` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,configKey]` on the table `tenant_configurations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,usageType,billingPeriod]` on the table `tenant_usage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[testId,partecipante_id]` on the table `test_partecipanti` will be added. If there are existing duplicate values, this will fail.
  - Made the column `tenantId` on table `Company` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Course` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `endDate` to the `CourseSchedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `CourseSchedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `TemplateLink` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `activity_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personRoleId` to the `advanced_permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `advanced_permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `annoProgressivo` to the `attestati` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numeroProgressivo` to the `attestati` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledCourseId` to the `attestati` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleType` to the `enhanced_user_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `enhanced_user_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `enhanced_user_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `fattura_aziende` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `fatture` table without a default value. This is not possible if the table is not empty.
  - Made the column `tenantId` on table `persons` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `preventivi` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `preventivo_aziende` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preventivoId` to the `preventivo_partecipanti` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `preventivo_partecipanti` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registroPresenzeId` to the `registro_presenze_partecipanti` table without a default value. This is not possible if the table is not empty.
  - Added the required column `configKey` to the `tenant_configurations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `tenant_configurations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `tenant_configurations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billingPeriod` to the `tenant_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `tenant_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `tenant_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usageType` to the `tenant_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `test_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `testId` to the `test_partecipanti` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `test_partecipanti` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('IN_PERSON', 'ONLINE', 'HYBRID', 'SELF_PACED');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('GENERATED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('INITIAL', 'FINAL', 'INTERMEDIATE', 'ASSESSMENT', 'CERTIFICATION');

-- CreateEnum
CREATE TYPE "ParticipantTestStatus" AS ENUM ('TO_COMPLETE', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CourseSchedule" DROP CONSTRAINT "CourseSchedule_courseId_fkey";

-- DropForeignKey
ALTER TABLE "CourseSession" DROP CONSTRAINT "CourseSession_coTrainerId_fkey";

-- DropForeignKey
ALTER TABLE "CourseSession" DROP CONSTRAINT "CourseSession_trainerId_fkey";

-- DropForeignKey
ALTER TABLE "GdprAuditLog" DROP CONSTRAINT "GdprAuditLog_personId_fkey";

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "advanced_permissions" DROP CONSTRAINT "advanced_permissions_person_role_id_fkey";

-- DropForeignKey
ALTER TABLE "attestati" DROP CONSTRAINT "attestati_partecipante_id_fkey";

-- DropForeignKey
ALTER TABLE "attestati" DROP CONSTRAINT "attestati_scheduled_course_id_fkey";

-- DropForeignKey
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "enhanced_user_roles" DROP CONSTRAINT "enhanced_user_roles_assigned_by_fkey";

-- DropForeignKey
ALTER TABLE "enhanced_user_roles" DROP CONSTRAINT "enhanced_user_roles_company_id_fkey";

-- DropForeignKey
ALTER TABLE "enhanced_user_roles" DROP CONSTRAINT "enhanced_user_roles_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "fattura_aziende" DROP CONSTRAINT "fattura_aziende_aziendaId_fkey";

-- DropForeignKey
ALTER TABLE "lettere_incarico" DROP CONSTRAINT "lettere_incarico_trainerId_fkey";

-- DropForeignKey
ALTER TABLE "person_roles" DROP CONSTRAINT "person_roles_assignedBy_fkey";

-- DropForeignKey
ALTER TABLE "person_roles" DROP CONSTRAINT "person_roles_companyId_fkey";

-- DropForeignKey
ALTER TABLE "person_roles" DROP CONSTRAINT "person_roles_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "persons" DROP CONSTRAINT "persons_companyId_fkey";

-- DropForeignKey
ALTER TABLE "persons" DROP CONSTRAINT "persons_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "preventivo_aziende" DROP CONSTRAINT "preventivo_aziende_aziendaId_fkey";

-- DropForeignKey
ALTER TABLE "preventivo_partecipanti" DROP CONSTRAINT "preventivo_partecipanti_partecipante_id_fkey";

-- DropForeignKey
ALTER TABLE "preventivo_partecipanti" DROP CONSTRAINT "preventivo_partecipanti_preventivo_id_fkey";

-- DropForeignKey
ALTER TABLE "registri_presenze" DROP CONSTRAINT "registri_presenze_formatoreId_fkey";

-- DropForeignKey
ALTER TABLE "registro_presenze_partecipanti" DROP CONSTRAINT "registro_presenze_partecipanti_partecipante_id_fkey";

-- DropForeignKey
ALTER TABLE "registro_presenze_partecipanti" DROP CONSTRAINT "registro_presenze_partecipanti_registro_presenze_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_grantedBy_fkey";

-- DropForeignKey
ALTER TABLE "tenant_configurations" DROP CONSTRAINT "tenant_configurations_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_usage" DROP CONSTRAINT "tenant_usage_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "test_documents" DROP CONSTRAINT "test_documents_trainerId_fkey";

-- DropForeignKey
ALTER TABLE "test_partecipanti" DROP CONSTRAINT "test_partecipanti_partecipante_id_fkey";

-- DropForeignKey
ALTER TABLE "test_partecipanti" DROP CONSTRAINT "test_partecipanti_test_id_fkey";

-- DropIndex
DROP INDEX "advanced_permissions_person_role_id_idx";

-- DropIndex
DROP INDEX "enhanced_user_roles_user_id_tenant_id_role_type_company_id_key";

-- DropIndex
DROP INDEX "person_roles_personId_roleType_companyId_tenantId_key";

-- DropIndex
DROP INDEX "preventivo_partecipanti_preventivo_id_partecipante_id_key";

-- DropIndex
DROP INDEX "registro_presenze_partecipanti_registro_presenze_id_parteci_key";

-- DropIndex
DROP INDEX "tenant_configurations_tenant_id_config_key_key";

-- DropIndex
DROP INDEX "tenant_usage_tenant_id_usage_type_billing_period_key";

-- DropIndex
DROP INDEX "test_partecipanti_test_id_partecipante_id_key";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "codice_ateco",
DROP COLUMN "codice_fiscale",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "is_active",
DROP COLUMN "persona_riferimento",
DROP COLUMN "sede_azienda",
DROP COLUMN "subscription_plan",
DROP COLUMN "updated_at",
ADD COLUMN     "codiceAteco" TEXT,
ADD COLUMN     "codiceFiscale" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "personaRiferimento" TEXT,
ADD COLUMN     "sedeAzienda" TEXT,
ADD COLUMN     "subscriptionPlan" TEXT NOT NULL DEFAULT 'basic',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "status",
ADD COLUMN     "status" "CourseStatus" DEFAULT 'DRAFT',
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CourseSchedule" DROP COLUMN "delivery_mode",
DROP COLUMN "end_date",
DROP COLUMN "max_participants",
DROP COLUMN "start_date",
ADD COLUMN     "deliveryMode" "DeliveryMode",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "maxParticipants" INTEGER,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "EnrollmentStatus" DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "deleted_at",
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TemplateLink" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "advanced_permissions" DROP COLUMN "allowed_fields",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "person_role_id",
DROP COLUMN "updated_at",
ADD COLUMN     "allowedFields" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "personRoleId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "attestati" DROP COLUMN "anno_progressivo",
DROP COLUMN "numero_progressivo",
DROP COLUMN "scheduled_course_id",
ADD COLUMN     "annoProgressivo" INTEGER NOT NULL,
ADD COLUMN     "numeroProgressivo" INTEGER NOT NULL,
ADD COLUMN     "scheduledCourseId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "course_enrollments" DROP COLUMN "status",
ADD COLUMN     "status" "EnrollmentStatus" DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "enhanced_user_roles" DROP COLUMN "assigned_at",
DROP COLUMN "assigned_by",
DROP COLUMN "company_id",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "department_id",
DROP COLUMN "expires_at",
DROP COLUMN "is_active",
DROP COLUMN "role_scope",
DROP COLUMN "role_type",
DROP COLUMN "tenant_id",
DROP COLUMN "updated_at",
ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "assignedBy" TEXT,
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "roleScope" TEXT NOT NULL DEFAULT 'tenant',
ADD COLUMN     "roleType" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "fattura_aziende" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "fatture" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "person_roles" ADD COLUMN     "customRoleId" TEXT,
ALTER COLUMN "roleType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "persons" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "preventivi" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "preventivo_aziende" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "preventivo_partecipanti" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "preventivo_id",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "preventivoId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "registro_presenze_partecipanti" DROP COLUMN "registro_presenze_id",
ADD COLUMN     "registroPresenzeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "role_permissions" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_configurations" DROP COLUMN "config_key",
DROP COLUMN "config_type",
DROP COLUMN "config_value",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "is_encrypted",
DROP COLUMN "tenant_id",
DROP COLUMN "updated_at",
ADD COLUMN     "configKey" TEXT NOT NULL,
ADD COLUMN     "configType" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "configValue" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "tenant_usage" DROP COLUMN "billing_period",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "tenant_id",
DROP COLUMN "updated_at",
DROP COLUMN "usage_limit",
DROP COLUMN "usage_type",
DROP COLUMN "usage_value",
ADD COLUMN     "billingPeriod" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usageLimit" INTEGER,
ADD COLUMN     "usageType" TEXT NOT NULL,
ADD COLUMN     "usageValue" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "test_documents" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "stato",
ADD COLUMN     "stato" "TestStatus" NOT NULL DEFAULT 'GENERATED',
DROP COLUMN "tipologia",
ADD COLUMN     "tipologia" "TestType" NOT NULL DEFAULT 'INITIAL',
ALTER COLUMN "punteggio" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "sogliaSuperamento" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "test_partecipanti" DROP COLUMN "created_at",
DROP COLUMN "data_consegna",
DROP COLUMN "deleted_at",
DROP COLUMN "tempo_impiegato",
DROP COLUMN "test_id",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dataConsegna" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tempoImpiegato" INTEGER,
ADD COLUMN     "testId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "punteggio" SET DATA TYPE DECIMAL(5,2),
DROP COLUMN "stato",
ADD COLUMN     "stato" "ParticipantTestStatus" NOT NULL DEFAULT 'TO_COMPLETE';

-- CreateTable
CREATE TABLE "custom_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tenantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantAccess" TEXT NOT NULL DEFAULT 'SPECIFIC',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_role_permissions" (
    "id" TEXT NOT NULL,
    "customRoleId" TEXT NOT NULL,
    "permission" "person_permissions" NOT NULL,
    "resource" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "conditions" JSONB,
    "allowedFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "custom_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_roles_tenantId_idx" ON "custom_roles"("tenantId");

-- CreateIndex
CREATE INDEX "custom_roles_createdBy_idx" ON "custom_roles"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "custom_roles_tenantId_name_key" ON "custom_roles"("tenantId", "name");

-- CreateIndex
CREATE INDEX "custom_role_permissions_customRoleId_idx" ON "custom_role_permissions"("customRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_role_permissions_customRoleId_permission_resource_sc_key" ON "custom_role_permissions"("customRoleId", "permission", "resource", "scope");

-- CreateIndex
CREATE INDEX "Company_tenantId_idx" ON "Company"("tenantId");

-- CreateIndex
CREATE INDEX "ConsentRecord_personId_idx" ON "ConsentRecord"("personId");

-- CreateIndex
CREATE INDEX "Course_tenantId_idx" ON "Course"("tenantId");

-- CreateIndex
CREATE INDEX "CourseSchedule_companyId_idx" ON "CourseSchedule"("companyId");

-- CreateIndex
CREATE INDEX "CourseSchedule_courseId_idx" ON "CourseSchedule"("courseId");

-- CreateIndex
CREATE INDEX "CourseSchedule_trainerId_idx" ON "CourseSchedule"("trainerId");

-- CreateIndex
CREATE INDEX "CourseSchedule_status_idx" ON "CourseSchedule"("status");

-- CreateIndex
CREATE INDEX "CourseSchedule_startDate_idx" ON "CourseSchedule"("startDate");

-- CreateIndex
CREATE INDEX "CourseSchedule_endDate_idx" ON "CourseSchedule"("endDate");

-- CreateIndex
CREATE INDEX "CourseSession_coTrainerId_idx" ON "CourseSession"("coTrainerId");

-- CreateIndex
CREATE INDEX "CourseSession_scheduleId_idx" ON "CourseSession"("scheduleId");

-- CreateIndex
CREATE INDEX "CourseSession_trainerId_idx" ON "CourseSession"("trainerId");

-- CreateIndex
CREATE INDEX "GdprAuditLog_personId_idx" ON "GdprAuditLog"("personId");

-- CreateIndex
CREATE INDEX "ScheduleCompany_companyId_idx" ON "ScheduleCompany"("companyId");

-- CreateIndex
CREATE INDEX "ScheduleCompany_scheduleId_idx" ON "ScheduleCompany"("scheduleId");

-- CreateIndex
CREATE INDEX "TemplateLink_companyId_idx" ON "TemplateLink"("companyId");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "advanced_permissions_personRoleId_idx" ON "advanced_permissions"("personRoleId");

-- CreateIndex
CREATE INDEX "attestati_partecipante_id_idx" ON "attestati"("partecipante_id");

-- CreateIndex
CREATE INDEX "attestati_scheduledCourseId_idx" ON "attestati"("scheduledCourseId");

-- CreateIndex
CREATE INDEX "course_enrollments_employee_id_idx" ON "course_enrollments"("employee_id");

-- CreateIndex
CREATE INDEX "course_enrollments_scheduleId_idx" ON "course_enrollments"("scheduleId");

-- CreateIndex
CREATE INDEX "enhanced_user_roles_assignedBy_idx" ON "enhanced_user_roles"("assignedBy");

-- CreateIndex
CREATE INDEX "enhanced_user_roles_companyId_idx" ON "enhanced_user_roles"("companyId");

-- CreateIndex
CREATE INDEX "enhanced_user_roles_tenantId_idx" ON "enhanced_user_roles"("tenantId");

-- CreateIndex
CREATE INDEX "enhanced_user_roles_user_id_idx" ON "enhanced_user_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "enhanced_user_roles_user_id_tenantId_roleType_companyId_key" ON "enhanced_user_roles"("user_id", "tenantId", "roleType", "companyId");

-- CreateIndex
CREATE INDEX "fattura_aziende_aziendaId_idx" ON "fattura_aziende"("aziendaId");

-- CreateIndex
CREATE INDEX "fattura_aziende_fatturaId_idx" ON "fattura_aziende"("fatturaId");

-- CreateIndex
CREATE INDEX "fatture_scheduledCourseId_idx" ON "fatture"("scheduledCourseId");

-- CreateIndex
CREATE INDEX "lettere_incarico_scheduledCourseId_idx" ON "lettere_incarico"("scheduledCourseId");

-- CreateIndex
CREATE INDEX "lettere_incarico_trainerId_idx" ON "lettere_incarico"("trainerId");

-- CreateIndex
CREATE INDEX "person_roles_customRoleId_idx" ON "person_roles"("customRoleId");

-- CreateIndex
CREATE INDEX "person_roles_assignedBy_idx" ON "person_roles"("assignedBy");

-- CreateIndex
CREATE INDEX "person_roles_personId_idx" ON "person_roles"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "person_roles_personId_roleType_customRoleId_companyId_tenan_key" ON "person_roles"("personId", "roleType", "customRoleId", "companyId", "tenantId");

-- CreateIndex
CREATE INDEX "person_sessions_personId_idx" ON "person_sessions"("personId");

-- CreateIndex
CREATE INDEX "persons_taxCode_idx" ON "persons"("taxCode");

-- CreateIndex
CREATE INDEX "persons_globalRole_idx" ON "persons"("globalRole");

-- CreateIndex
CREATE INDEX "preventivi_scheduledCourseId_idx" ON "preventivi"("scheduledCourseId");

-- CreateIndex
CREATE INDEX "preventivo_aziende_aziendaId_idx" ON "preventivo_aziende"("aziendaId");

-- CreateIndex
CREATE INDEX "preventivo_aziende_preventivoId_idx" ON "preventivo_aziende"("preventivoId");

-- CreateIndex
CREATE INDEX "preventivo_partecipanti_partecipante_id_idx" ON "preventivo_partecipanti"("partecipante_id");

-- CreateIndex
CREATE INDEX "preventivo_partecipanti_preventivoId_idx" ON "preventivo_partecipanti"("preventivoId");

-- CreateIndex
CREATE UNIQUE INDEX "preventivo_partecipanti_preventivoId_partecipante_id_key" ON "preventivo_partecipanti"("preventivoId", "partecipante_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_personId_idx" ON "refresh_tokens"("personId");

-- CreateIndex
CREATE INDEX "registri_presenze_formatoreId_idx" ON "registri_presenze"("formatoreId");

-- CreateIndex
CREATE INDEX "registri_presenze_scheduledCourseId_idx" ON "registri_presenze"("scheduledCourseId");

-- CreateIndex
CREATE INDEX "registri_presenze_sessionId_idx" ON "registri_presenze"("sessionId");

-- CreateIndex
CREATE INDEX "registro_presenze_partecipanti_partecipante_id_idx" ON "registro_presenze_partecipanti"("partecipante_id");

-- CreateIndex
CREATE INDEX "registro_presenze_partecipanti_registroPresenzeId_idx" ON "registro_presenze_partecipanti"("registroPresenzeId");

-- CreateIndex
CREATE UNIQUE INDEX "registro_presenze_partecipanti_registroPresenzeId_partecipa_key" ON "registro_presenze_partecipanti"("registroPresenzeId", "partecipante_id");

-- CreateIndex
CREATE INDEX "role_permissions_grantedBy_idx" ON "role_permissions"("grantedBy");

-- CreateIndex
CREATE INDEX "role_permissions_personRoleId_idx" ON "role_permissions"("personRoleId");

-- CreateIndex
CREATE INDEX "tenant_configurations_tenantId_idx" ON "tenant_configurations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_configurations_tenantId_configKey_key" ON "tenant_configurations"("tenantId", "configKey");

-- CreateIndex
CREATE INDEX "tenant_usage_tenantId_idx" ON "tenant_usage"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_usage_tenantId_usageType_billingPeriod_key" ON "tenant_usage"("tenantId", "usageType", "billingPeriod");

-- CreateIndex
CREATE INDEX "test_documents_scheduledCourseId_idx" ON "test_documents"("scheduledCourseId");

-- CreateIndex
CREATE INDEX "test_documents_trainerId_idx" ON "test_documents"("trainerId");

-- CreateIndex
CREATE INDEX "test_partecipanti_partecipante_id_idx" ON "test_partecipanti"("partecipante_id");

-- CreateIndex
CREATE INDEX "test_partecipanti_testId_idx" ON "test_partecipanti"("testId");

-- CreateIndex
CREATE INDEX "test_partecipanti_stato_idx" ON "test_partecipanti"("stato");

-- CreateIndex
CREATE UNIQUE INDEX "test_partecipanti_testId_partecipante_id_key" ON "test_partecipanti"("testId", "partecipante_id");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSchedule" ADD CONSTRAINT "CourseSchedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_coTrainerId_fkey" FOREIGN KEY ("coTrainerId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestati" ADD CONSTRAINT "attestati_partecipante_id_fkey" FOREIGN KEY ("partecipante_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestati" ADD CONSTRAINT "attestati_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lettere_incarico" ADD CONSTRAINT "lettere_incarico_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registri_presenze" ADD CONSTRAINT "registri_presenze_formatoreId_fkey" FOREIGN KEY ("formatoreId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_presenze_partecipanti" ADD CONSTRAINT "registro_presenze_partecipanti_partecipante_id_fkey" FOREIGN KEY ("partecipante_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_presenze_partecipanti" ADD CONSTRAINT "registro_presenze_partecipanti_registroPresenzeId_fkey" FOREIGN KEY ("registroPresenzeId") REFERENCES "registri_presenze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivo_partecipanti" ADD CONSTRAINT "preventivo_partecipanti_partecipante_id_fkey" FOREIGN KEY ("partecipante_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivo_partecipanti" ADD CONSTRAINT "preventivo_partecipanti_preventivoId_fkey" FOREIGN KEY ("preventivoId") REFERENCES "preventivi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivo_aziende" ADD CONSTRAINT "preventivo_aziende_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fattura_aziende" ADD CONSTRAINT "fattura_aziende_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_documents" ADD CONSTRAINT "test_documents_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_partecipanti" ADD CONSTRAINT "test_partecipanti_partecipante_id_fkey" FOREIGN KEY ("partecipante_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_partecipanti" ADD CONSTRAINT "test_partecipanti_testId_fkey" FOREIGN KEY ("testId") REFERENCES "test_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GdprAuditLog" ADD CONSTRAINT "GdprAuditLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advanced_permissions" ADD CONSTRAINT "advanced_permissions_personRoleId_fkey" FOREIGN KEY ("personRoleId") REFERENCES "person_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_configurations" ADD CONSTRAINT "tenant_configurations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enhanced_user_roles" ADD CONSTRAINT "enhanced_user_roles_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enhanced_user_roles" ADD CONSTRAINT "enhanced_user_roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enhanced_user_roles" ADD CONSTRAINT "enhanced_user_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_usage" ADD CONSTRAINT "tenant_usage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_role_permissions" ADD CONSTRAINT "custom_role_permissions_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
