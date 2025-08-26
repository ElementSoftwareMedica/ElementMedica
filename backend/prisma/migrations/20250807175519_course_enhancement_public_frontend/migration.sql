/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Course` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('ALTO', 'MEDIO', 'BASSO', 'A', 'B', 'C');

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('PRIMO_CORSO', 'AGGIORNAMENTO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "person_permissions" ADD VALUE 'VIEW_CMS';
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_CMS';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_CMS';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_CMS';
ALTER TYPE "person_permissions" ADD VALUE 'MANAGE_PUBLIC_CONTENT';

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "courseType" "CourseType",
ADD COLUMN     "fullDescription" TEXT,
ADD COLUMN     "image1Url" TEXT,
ADD COLUMN     "image2Url" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "riskLevel" "RiskLevel",
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "subcategory" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_isPublic_idx" ON "Course"("isPublic");

-- CreateIndex
CREATE INDEX "Course_slug_idx" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_riskLevel_idx" ON "Course"("riskLevel");

-- CreateIndex
CREATE INDEX "Course_courseType_idx" ON "Course"("courseType");

-- CreateIndex
CREATE INDEX "Course_category_riskLevel_idx" ON "Course"("category", "riskLevel");

-- CreateIndex
CREATE INDEX "Course_isPublic_status_idx" ON "Course"("isPublic", "status");
