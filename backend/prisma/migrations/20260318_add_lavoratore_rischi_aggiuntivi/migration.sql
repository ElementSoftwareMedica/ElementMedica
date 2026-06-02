-- CreateTable: Rischi aggiuntivi per singolo lavoratore (NON condivisi con altri sulla stessa mansione)
CREATE TABLE "lavoratore_rischi_aggiuntivi" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "personId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codiceRischio" "codice_rischio" NOT NULL,
    "livello" "livello_rischio" NOT NULL DEFAULT 'MEDIO',
    "categoria" "categoria_rischio" NOT NULL,
    "descrizioneEsposizione" TEXT,
    "fonteRischio" VARCHAR(200),
    "periodicitaMesi" INTEGER,
    "note" TEXT,

    CONSTRAINT "lavoratore_rischi_aggiuntivi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lavoratore_rischi_aggiuntivi_tenantId_idx" ON "lavoratore_rischi_aggiuntivi"("tenantId");

-- CreateIndex
CREATE INDEX "lavoratore_rischi_aggiuntivi_personId_idx" ON "lavoratore_rischi_aggiuntivi"("personId");

-- CreateIndex
CREATE INDEX "lavoratore_rischi_aggiuntivi_deletedAt_idx" ON "lavoratore_rischi_aggiuntivi"("deletedAt");

-- CreateIndex (unique constraint: one risk code per worker)
CREATE UNIQUE INDEX "lavoratore_rischi_aggiuntivi_personId_codiceRischio_key" ON "lavoratore_rischi_aggiuntivi"("personId", "codiceRischio");

-- AddForeignKey
ALTER TABLE "lavoratore_rischi_aggiuntivi" ADD CONSTRAINT "lavoratore_rischi_aggiuntivi_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lavoratore_rischi_aggiuntivi" ADD CONSTRAINT "lavoratore_rischi_aggiuntivi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
