-- AddMedicoRefertante: Adds medicoRefertanteId to Visita for signing doctor override
-- This allows choosing a different doctor for the referto than the one who performed the visit

ALTER TABLE "visite" ADD COLUMN "medico_refertante_id" TEXT;

-- FK constraint
ALTER TABLE "visite" ADD CONSTRAINT "visite_medico_refertante_id_fkey"
    FOREIGN KEY ("medico_refertante_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for querying visits by refertante
CREATE INDEX "visite_medico_refertante_id_idx" ON "visite"("medico_refertante_id");
