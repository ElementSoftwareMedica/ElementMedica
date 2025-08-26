/*
  Warnings:

  - A unique constraint covering the columns `[piva]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "person_permissions" ADD VALUE 'VIEW_PERSONS';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_PERSONS';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_PERSONS';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_PERSONS';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_SCHEDULES';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_SCHEDULES';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_SCHEDULES';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_SCHEDULES';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_QUOTES';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_QUOTES';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_QUOTES';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_QUOTES';
ALTER TYPE "person_permissions" ADD VALUE 'VIEW_INVOICES';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_INVOICES';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_INVOICES';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_INVOICES';

-- AlterTable
ALTER TABLE "CompanySite" ADD COLUMN     "noteSopralluogoMedico" TEXT,
ADD COLUMN     "noteSopralluogoRSPP" TEXT,
ADD COLUMN     "prossimoSopralluogoMedico" TIMESTAMP(3),
ADD COLUMN     "prossimoSopralluogoRSPP" TIMESTAMP(3),
ADD COLUMN     "ultimoSopralluogoMedico" TIMESTAMP(3),
ADD COLUMN     "ultimoSopralluogoRSPP" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Company_piva_key" ON "Company"("piva");
