-- P73: Visite Secondarie - Prestazioni Esternalizzate a Specialisti
-- 
-- Aggiunge il supporto per assegnare prestazioni aggiuntive (es. ECG) a medici
-- specialisti durante una visita principale. Il sistema:
--   1. Crea una visita secondaria assegnata allo specialista
--   2. Genera movimenti contabili ENTRATA+USCITA UNA SOLA VOLTA (al momento
--      dell'assegnazione, non al completamento della visita secondaria)
--   3. Collega le due visite tramite visitaParentId per navigazione reciproca

-- Aggiunta campi a Visita
ALTER TABLE "visite" ADD COLUMN IF NOT EXISTS "visita_parent_id" TEXT;
ALTER TABLE "visite" ADD COLUMN IF NOT EXISTS "is_visita_secundaria" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "visite" ADD COLUMN IF NOT EXISTS "app_prestazione_id" TEXT;

-- Unique constraint su app_prestazione_id (una visita secondaria per AppuntamentoPrestazione)
ALTER TABLE "visite" ADD CONSTRAINT "visite_app_prestazione_id_key" UNIQUE ("app_prestazione_id");

-- Foreign key: visita_parent_id → visite.id
ALTER TABLE "visite" ADD CONSTRAINT "visite_visita_parent_id_fkey" 
    FOREIGN KEY ("visita_parent_id") REFERENCES "visite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign key: app_prestazione_id → appuntamenti_prestazioni.id
ALTER TABLE "visite" ADD CONSTRAINT "visite_app_prestazione_id_fkey" 
    FOREIGN KEY ("app_prestazione_id") REFERENCES "appuntamenti_prestazioni"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indici di performance
CREATE INDEX IF NOT EXISTS "visite_visita_parent_id_idx" ON "visite"("visita_parent_id");
CREATE INDEX IF NOT EXISTS "visite_is_visita_secundaria_idx" ON "visite"("is_visita_secundaria");
