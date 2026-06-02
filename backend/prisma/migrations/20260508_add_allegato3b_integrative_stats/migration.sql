ALTER TABLE "allegati_3b"
ADD COLUMN IF NOT EXISTS "giudiziPerRischio" JSONB,
ADD COLUMN IF NOT EXISTS "accertamentiIntegrativi" JSONB;
