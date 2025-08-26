-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "siteId" TEXT;

-- CreateTable
CREATE TABLE "CompanySite" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "citta" TEXT,
    "indirizzo" TEXT,
    "cap" TEXT,
    "provincia" TEXT,
    "personaRiferimento" TEXT,
    "telefono" TEXT,
    "mail" TEXT,
    "dvr" TEXT,
    "reparti" JSONB,
    "rsppId" TEXT,
    "medicoCompetenteId" TEXT,
    "ultimoSopralluogo" TIMESTAMP(3),
    "prossimoSopralluogo" TIMESTAMP(3),
    "valutazioneSopralluogo" TEXT,
    "sopralluogoEseguitoDa" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "CompanySite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanySite_companyId_idx" ON "CompanySite"("companyId");

-- CreateIndex
CREATE INDEX "CompanySite_tenantId_idx" ON "CompanySite"("tenantId");

-- CreateIndex
CREATE INDEX "CompanySite_rsppId_idx" ON "CompanySite"("rsppId");

-- CreateIndex
CREATE INDEX "CompanySite_medicoCompetenteId_idx" ON "CompanySite"("medicoCompetenteId");

-- CreateIndex
CREATE INDEX "persons_siteId_idx" ON "persons"("siteId");

-- AddForeignKey
ALTER TABLE "CompanySite" ADD CONSTRAINT "CompanySite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySite" ADD CONSTRAINT "CompanySite_rsppId_fkey" FOREIGN KEY ("rsppId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySite" ADD CONSTRAINT "CompanySite_medicoCompetenteId_fkey" FOREIGN KEY ("medicoCompetenteId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySite" ADD CONSTRAINT "CompanySite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CompanySite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
