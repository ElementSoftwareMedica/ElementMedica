-- Migration: Add consenso_moduli table for configurable consent modules per tenant

CREATE TABLE "consenso_moduli" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codice" VARCHAR(50) NOT NULL,
    "titolo" VARCHAR(255) NOT NULL,
    "sottotitolo" VARCHAR(255),
    "testo" TEXT NOT NULL,
    "obbligatorio" BOOLEAN NOT NULL DEFAULT false,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "validitaGiorni" INTEGER,
    "prestazioniIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "consenso_moduli_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consenso_moduli_tenantId_codice_key" ON "consenso_moduli"("tenantId", "codice");
CREATE INDEX "consenso_moduli_tenantId_deletedAt_idx" ON "consenso_moduli"("tenantId", "deletedAt");
