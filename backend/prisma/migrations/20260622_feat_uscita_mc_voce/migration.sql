-- Migration: feat_uscita_mc_voce
-- Aggiunge voceTariffarioId a uscite_mc per registrare voci "Una tantum" diverse da USCITA_MC

ALTER TABLE "uscite_mc" ADD COLUMN "voceTariffarioId" TEXT;

CREATE INDEX "uscite_mc_voceTariffarioId_idx" ON "uscite_mc"("voceTariffarioId");

ALTER TABLE "uscite_mc" ADD CONSTRAINT "uscite_mc_voceTariffarioId_fkey"
    FOREIGN KEY ("voceTariffarioId") REFERENCES "voci_tariffario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
