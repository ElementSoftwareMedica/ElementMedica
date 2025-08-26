-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_FORM_SUBMISSIONS';
ALTER TYPE "person_permissions" ADD VALUE 'EXPORT_FORM_SUBMISSIONS';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_NOTIFICATIONS';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_NOTIFICATIONS';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_NOTIFICATIONS';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_NOTIFICATIONS';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_NOTIFICATIONS';
ALTER TYPE "person_permissions" ADD VALUE 'SEND_NOTIFICATIONS';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_AUDIT_LOGS';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_AUDIT_LOGS';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_AUDIT_LOGS';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_AUDIT_LOGS';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_AUDIT_LOGS';
ALTER TYPE "person_permissions" ADD VALUE 'EXPORT_AUDIT_LOGS';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_API_KEYS';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_API_KEYS';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_API_KEYS';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_API_KEYS';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_API_KEYS';
ALTER TYPE "person_permissions" ADD VALUE 'REGENERATE_API_KEYS';
