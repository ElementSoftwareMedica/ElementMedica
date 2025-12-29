-- Progetto 44: Campi aggiuntivi per medici
-- Aggiunge pec, secondo numero albo, descrizioni

-- PEC (email certificata)
ALTER TABLE "persons" ADD COLUMN IF NOT EXISTS "pec" VARCHAR(255);

-- Secondo numero iscrizione albo (medici del lavoro/sport con doppia iscrizione)
ALTER TABLE "persons" ADD COLUMN IF NOT EXISTS "registerCode2" VARCHAR(50);

-- Descrizione breve (es. per card medico)
ALTER TABLE "persons" ADD COLUMN IF NOT EXISTS "shortDescription" VARCHAR(500);

-- Descrizione completa (es. per pagina dettaglio medico)
ALTER TABLE "persons" ADD COLUMN IF NOT EXISTS "fullDescription" TEXT;

-- Indice per PEC
CREATE INDEX IF NOT EXISTS "persons_pec_idx" ON "persons"("pec");
