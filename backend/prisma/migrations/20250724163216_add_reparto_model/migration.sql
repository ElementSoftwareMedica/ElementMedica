/*
  Warnings:

  - You are about to drop the column `reparti` on the `CompanySite` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CompanySite" DROP COLUMN "reparti";

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "scope" TEXT DEFAULT 'all',
ADD COLUMN     "siteId" TEXT;

-- AlterTable
ALTER TABLE "advanced_permissions" ADD COLUMN     "siteAccess" TEXT DEFAULT 'ALL_COMPANY_SITES',
ADD COLUMN     "siteId" TEXT;

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "reparto" VARCHAR(100),
ADD COLUMN     "repartoId" TEXT;

-- CreateTable
CREATE TABLE "DVR" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "siteId" TEXT NOT NULL,
    "effettuatoDa" TEXT NOT NULL,
    "dataEsecuzione" TIMESTAMP(3) NOT NULL,
    "dataScadenza" TIMESTAMP(3) NOT NULL,
    "rischiRilevati" TEXT,
    "note" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "DVR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sopralluogo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "siteId" TEXT NOT NULL,
    "esecutoreId" TEXT,
    "dataEsecuzione" TIMESTAMP(3) NOT NULL,
    "dataProssimoSopralluogo" TIMESTAMP(3),
    "valutazione" TEXT,
    "esito" TEXT,
    "note" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "Sopralluogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reparto" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "siteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "codice" TEXT,
    "responsabileId" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "Reparto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DVR_siteId_idx" ON "DVR"("siteId");

-- CreateIndex
CREATE INDEX "DVR_tenantId_idx" ON "DVR"("tenantId");

-- CreateIndex
CREATE INDEX "DVR_dataScadenza_idx" ON "DVR"("dataScadenza");

-- CreateIndex
CREATE INDEX "Sopralluogo_siteId_idx" ON "Sopralluogo"("siteId");

-- CreateIndex
CREATE INDEX "Sopralluogo_esecutoreId_idx" ON "Sopralluogo"("esecutoreId");

-- CreateIndex
CREATE INDEX "Sopralluogo_tenantId_idx" ON "Sopralluogo"("tenantId");

-- CreateIndex
CREATE INDEX "Sopralluogo_dataEsecuzione_idx" ON "Sopralluogo"("dataEsecuzione");

-- CreateIndex
CREATE INDEX "Sopralluogo_dataProssimoSopralluogo_idx" ON "Sopralluogo"("dataProssimoSopralluogo");

-- CreateIndex
CREATE INDEX "Reparto_siteId_idx" ON "Reparto"("siteId");

-- CreateIndex
CREATE INDEX "Reparto_responsabileId_idx" ON "Reparto"("responsabileId");

-- CreateIndex
CREATE INDEX "Reparto_tenantId_idx" ON "Reparto"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Reparto_siteId_nome_key" ON "Reparto"("siteId", "nome");

-- CreateIndex
CREATE INDEX "Permission_resource_action_idx" ON "Permission"("resource", "action");

-- CreateIndex
CREATE INDEX "Permission_scope_idx" ON "Permission"("scope");

-- CreateIndex
CREATE INDEX "Permission_siteId_idx" ON "Permission"("siteId");

-- CreateIndex
CREATE INDEX "advanced_permissions_siteId_idx" ON "advanced_permissions"("siteId");

-- CreateIndex
CREATE INDEX "persons_repartoId_idx" ON "persons"("repartoId");

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CompanySite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_repartoId_fkey" FOREIGN KEY ("repartoId") REFERENCES "Reparto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advanced_permissions" ADD CONSTRAINT "advanced_permissions_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CompanySite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DVR" ADD CONSTRAINT "DVR_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CompanySite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DVR" ADD CONSTRAINT "DVR_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sopralluogo" ADD CONSTRAINT "Sopralluogo_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CompanySite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sopralluogo" ADD CONSTRAINT "Sopralluogo_esecutoreId_fkey" FOREIGN KEY ("esecutoreId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sopralluogo" ADD CONSTRAINT "Sopralluogo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparto" ADD CONSTRAINT "Reparto_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CompanySite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparto" ADD CONSTRAINT "Reparto_responsabileId_fkey" FOREIGN KEY ("responsabileId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparto" ADD CONSTRAINT "Reparto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
