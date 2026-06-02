-- Add sourceMansioneId to lavoratore_rischi_aggiuntivi
-- Tracks which mansione the risk was originally copied from (NULL = manually added)
ALTER TABLE "lavoratore_rischi_aggiuntivi" ADD COLUMN "sourceMansioneId" TEXT;

-- Index for fast lookup by source mansione
CREATE INDEX "lavoratore_rischi_aggiuntivi_sourceMansioneId_idx" ON "lavoratore_rischi_aggiuntivi"("sourceMansioneId");
