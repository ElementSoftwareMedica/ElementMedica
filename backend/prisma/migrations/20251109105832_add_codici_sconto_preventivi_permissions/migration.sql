-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "person_permissions" ADD VALUE 'VIEW_CODICI_SCONTO';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_CODICI_SCONTO';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_CODICI_SCONTO';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_CODICI_SCONTO';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_CODICI_SCONTO';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_PREVENTIVI';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_PREVENTIVI';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_PREVENTIVI';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_PREVENTIVI';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_PREVENTIVI';
ALTER TYPE "person_permissions" ADD VALUE 'GENERATE_PREVENTIVI_PDF';
ALTER TYPE "person_permissions" ADD VALUE 'SEND_PREVENTIVI';
