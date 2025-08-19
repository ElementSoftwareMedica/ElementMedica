-- AlterTable
ALTER TABLE "custom_roles" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "parentRole" TEXT;

-- AlterTable
ALTER TABLE "persons" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "custom_roles_level_idx" ON "custom_roles"("level");

-- CreateIndex
CREATE INDEX "custom_roles_parentRole_idx" ON "custom_roles"("parentRole");
