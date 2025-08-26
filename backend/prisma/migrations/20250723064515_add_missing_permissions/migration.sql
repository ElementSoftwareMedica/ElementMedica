/*
  Warnings:

  - You are about to drop the `enhanced_user_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "person_permissions" ADD VALUE 'VIEW_DOCUMENTS';
ALTER TYPE "person_permissions" ADD VALUE 'ROLE_CREATE';
ALTER TYPE "person_permissions" ADD VALUE 'ROLE_EDIT';
ALTER TYPE "person_permissions" ADD VALUE 'ROLE_DELETE';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_ROLES';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_ROLES';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_ROLES';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_ROLES';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_USERS';
ALTER TYPE "person_permissions" ADD VALUE 'ASSIGN_ROLES';
ALTER TYPE "person_permissions" ADD VALUE 'REVOKE_ROLES';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_TENANTS';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_TENANTS';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_TENANTS';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_TENANTS';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_ADMINISTRATION';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_ADMINISTRATION';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_ADMINISTRATION';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_ADMINISTRATION';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_GDPR';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_GDPR';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_GDPR';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_GDPR';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_REPORTS';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_REPORTS';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_HIERARCHY';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_HIERARCHY';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_HIERARCHY';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_HIERARCHY';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_HIERARCHY';
ALTER TYPE "person_permissions" ADD VALUE 'HIERARCHY_MANAGEMENT';

-- DropForeignKey
ALTER TABLE "enhanced_user_roles" DROP CONSTRAINT "enhanced_user_roles_assignedBy_fkey";

-- DropForeignKey
ALTER TABLE "enhanced_user_roles" DROP CONSTRAINT "enhanced_user_roles_companyId_fkey";

-- DropForeignKey
ALTER TABLE "enhanced_user_roles" DROP CONSTRAINT "enhanced_user_roles_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "enhanced_user_roles" DROP CONSTRAINT "enhanced_user_roles_user_id_fkey";

-- AlterTable
ALTER TABLE "person_roles" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentRoleId" TEXT,
ADD COLUMN     "path" TEXT;

-- DropTable
DROP TABLE "enhanced_user_roles";

-- CreateIndex
CREATE INDEX "person_roles_parentRoleId_idx" ON "person_roles"("parentRoleId");

-- CreateIndex
CREATE INDEX "person_roles_level_idx" ON "person_roles"("level");

-- CreateIndex
CREATE INDEX "person_roles_path_idx" ON "person_roles"("path");

-- CreateIndex
CREATE INDEX "person_roles_tenantId_parentRoleId_idx" ON "person_roles"("tenantId", "parentRoleId");

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "person_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
