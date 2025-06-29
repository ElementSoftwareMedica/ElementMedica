/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Role_name_companyId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
