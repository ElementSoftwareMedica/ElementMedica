-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "person_permissions" ADD VALUE 'VIEW_FORM_SUBMISSIONS';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_FORM_SUBMISSIONS';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_FORM_SUBMISSIONS';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_FORM_SUBMISSIONS';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_TEMPLATES';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_TEMPLATES';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_TEMPLATES';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_TEMPLATES';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_TEMPLATES';
