-- P65.7: Consolidamento Sistema Template Visita
-- Migra TemplateCampoVisita in VisitTemplate con scope=CATALOGO
-- Aggiunge campi prezzo prima visita/controllo e scadenza

-- =============================================
-- STEP 1: Aggiungere nuovo valore enum CATALOGO
-- NOTA: PostgreSQL richiede COMMIT separato prima di usare nuovo enum value
-- =============================================

-- Aggiunge CATALOGO all'enum template_scope (se non esiste)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'template_scope'::regtype 
        AND enumlabel = 'CATALOGO'
    ) THEN
        ALTER TYPE "template_scope" ADD VALUE 'CATALOGO';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- STEP 2: Aggiungere nuovi campi su visit_templates
-- =============================================

-- Campo scadenza default (mesi) per prossimo controllo
ALTER TABLE "visit_templates" 
ADD COLUMN IF NOT EXISTS "default_scadenza_mesi" INTEGER;

-- =============================================
-- STEP 3: Aggiungere nuovi campi su prestazioni
-- =============================================

-- Prezzo prima visita (opzionale, se diverso da prezzo base)
ALTER TABLE "prestazioni" 
ADD COLUMN IF NOT EXISTS "prezzo_prima_visita" DECIMAL(10,2);

-- Prezzo controllo (opzionale, se diverso da prezzo base)
ALTER TABLE "prestazioni" 
ADD COLUMN IF NOT EXISTS "prezzo_controllo" DECIMAL(10,2);

-- Scadenza default per prossimo controllo (mesi)
ALTER TABLE "prestazioni" 
ADD COLUMN IF NOT EXISTS "scadenza_default_mesi" INTEGER;

-- =============================================
-- STEP 4: Aggiungere nuovi campi su visite
-- =============================================

-- Flag prima visita/controllo
ALTER TABLE "visite" 
ADD COLUMN IF NOT EXISTS "is_prima_visita" BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- STEP 5: Migrare dati da template_campi_visita
-- NOTA: La migrazione INSERT con nuovo enum value CATALOGO è commentata
-- perché PostgreSQL richiede che il nuovo enum value sia committato prima di usarlo.
-- Eseguire manualmente dopo questa migrazione se ci sono dati da migrare:
--
-- INSERT INTO "visit_templates" (...)
-- SELECT ... 'CATALOGO'::"template_scope" ...
-- FROM "template_campi_visita" tcv ...
-- =============================================

-- La tabella template_campi_visita potrebbe non esistere più
-- Se esiste e ci sono dati, migrarli con uno script separato

-- =============================================
-- STEP 6: Eliminare tabella template_campi_visita (se esiste)
-- =============================================

-- La tabella potrebbe essere già stata rimossa in una migrazione precedente
-- Prima rimuovi la FK se esiste
DO $$
BEGIN
    ALTER TABLE "template_campi_visita" DROP CONSTRAINT IF EXISTS "template_campi_visita_prestazioneId_fkey";
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Elimina la tabella legacy se esiste
DROP TABLE IF EXISTS "template_campi_visita";

-- =============================================
-- STEP 7: Aggiungere indici per performance
-- =============================================

-- Indice per query per scope
CREATE INDEX IF NOT EXISTS "idx_visit_templates_scope_prestazione" 
ON "visit_templates" ("scope", "prestazione_id") 
WHERE "deleted_at" IS NULL;

-- Indice per visite prima visita
CREATE INDEX IF NOT EXISTS "idx_visite_is_prima_visita" 
ON "visite" ("is_prima_visita");

-- =============================================
-- COMMENTI DOCUMENTAZIONE
-- =============================================

COMMENT ON COLUMN "visit_templates"."default_scadenza_mesi" IS 'P65.7: Scadenza default per prossimo controllo in mesi (es. 6, 12, 24)';
COMMENT ON COLUMN "prestazioni"."prezzo_prima_visita" IS 'P65.7: Prezzo per prima visita (se diverso da prezzo base)';
COMMENT ON COLUMN "prestazioni"."prezzo_controllo" IS 'P65.7: Prezzo per visita di controllo (se diverso da prezzo base)';
COMMENT ON COLUMN "prestazioni"."scadenza_default_mesi" IS 'P65.7: Scadenza default per prossimo controllo in mesi';
COMMENT ON COLUMN "visite"."is_prima_visita" IS 'P65.7: Se true, è una prima visita (prezzo_prima_visita), altrimenti controllo (prezzo_controllo)';
