ALTER TABLE "documenti_template"
ADD COLUMN IF NOT EXISTS "consenso_codici" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
