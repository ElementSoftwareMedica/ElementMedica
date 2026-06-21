-- Add categoriaEsito field to esami_strumentali
-- Stores the clinician-assigned outcome category for each completed exam:
-- ECG: ECG_NORMALE | ECG_DUBBIO | ECG_ALTERAZIONI_MINORI | ECG_ALTERAZIONI_SIGNIFICATIVE
-- Audiometria (Scala Merluzzi): AUDIO_G0..G5
-- Spirometria: SPIRO_NORMALE | SPIRO_OSTRUTTIVO_LIEVE | SPIRO_OSTRUTTIVO_MODERATO | SPIRO_OSTRUTTIVO_GRAVE | SPIRO_RESTRITTIVO | SPIRO_MISTO | SPIRO_NON_CLASSIFICABILE
-- Drug Test: DRUG_TUTTI_NEGATIVI | DRUG_POSITIVO

ALTER TABLE "esami_strumentali" ADD COLUMN "categoriaEsito" TEXT;
CREATE INDEX "esami_strumentali_categoriaEsito_idx" ON "esami_strumentali"("categoriaEsito");
