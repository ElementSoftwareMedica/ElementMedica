/*
  Warnings:

  - You are about to drop the column `renewalDuration` on the `Course` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Course" DROP COLUMN "renewalDuration",
ADD COLUMN     "practicalHours" INTEGER;
