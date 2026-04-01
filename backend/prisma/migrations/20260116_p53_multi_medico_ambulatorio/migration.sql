-- P53 Phase 2.2: Multi-medico, Multi-ambulatorio, Indicazioni paziente
-- =========================================================================

-- 1. Aggiungi campo indicazioniPaziente su Ambulatorio
-- Usato per dare indicazioni ai pazienti su come raggiungere l'ambulatorio esterno
ALTER TABLE "ambulatori" ADD COLUMN IF NOT EXISTS "indicazioni_paziente" TEXT;
ALTER TABLE "ambulatori" ADD COLUMN IF NOT EXISTS "is_esterno" BOOLEAN DEFAULT false;

-- 2. Tabella join per multi-medico nella sessione
CREATE TABLE IF NOT EXISTS "queue_session_medici" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "medico_id" UUID NOT NULL,
    "ordine" INTEGER DEFAULT 0,
    "is_primary" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_session_medici_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "queue_session_medici_session_fkey" FOREIGN KEY ("session_id") 
        REFERENCES "queue_sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "queue_session_medici_medico_fkey" FOREIGN KEY ("medico_id") 
        REFERENCES "person_tenant_profiles"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "queue_session_medici_unique" 
ON "queue_session_medici" ("session_id", "medico_id");

CREATE INDEX IF NOT EXISTS "queue_session_medici_session_idx" 
ON "queue_session_medici" ("session_id");

CREATE INDEX IF NOT EXISTS "queue_session_medici_medico_idx" 
ON "queue_session_medici" ("medico_id");

-- 3. Tabella join per multi-ambulatorio nella sessione
CREATE TABLE IF NOT EXISTS "queue_session_ambulatori" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "ambulatorio_id" UUID NOT NULL,
    "ordine" INTEGER DEFAULT 0,
    "is_primary" BOOLEAN DEFAULT false,
    "indicazioni_override" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_session_ambulatori_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "queue_session_ambulatori_session_fkey" FOREIGN KEY ("session_id") 
        REFERENCES "queue_sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "queue_session_ambulatori_ambulatorio_fkey" FOREIGN KEY ("ambulatorio_id") 
        REFERENCES "ambulatori"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "queue_session_ambulatori_unique" 
ON "queue_session_ambulatori" ("session_id", "ambulatorio_id");

CREATE INDEX IF NOT EXISTS "queue_session_ambulatori_session_idx" 
ON "queue_session_ambulatori" ("session_id");

CREATE INDEX IF NOT EXISTS "queue_session_ambulatori_ambulatorio_idx" 
ON "queue_session_ambulatori" ("ambulatorio_id");

-- 4. Aggiungi prestazioneId alla NumeroChiamata per tracciare la prestazione scelta
ALTER TABLE "numeri_chiamata" ADD COLUMN IF NOT EXISTS "prestazione_id" UUID;
ALTER TABLE "numeri_chiamata" ADD CONSTRAINT "numeri_chiamata_prestazione_fkey" 
    FOREIGN KEY ("prestazione_id") REFERENCES "prestazioni"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "numeri_chiamata_prestazione_idx" 
ON "numeri_chiamata" ("prestazione_id");

-- 5. Aggiungi campo per la durata stimata della visita
ALTER TABLE "numeri_chiamata" ADD COLUMN IF NOT EXISTS "durata_stimata_minuti" INTEGER;

-- Comments per documentazione
COMMENT ON COLUMN "ambulatori"."indicazioni_paziente" IS 'Indicazioni testuali per il paziente su come raggiungere l ambulatorio (es. "Piano 2, Scala B, seguire cartelli blu")';
COMMENT ON COLUMN "ambulatori"."is_esterno" IS 'Indica se l ambulatorio è esterno alla sede principale (es. evento, screening)';
COMMENT ON TABLE "queue_session_medici" IS 'Relazione N:M tra sessioni coda e medici - supporta code con più medici';
COMMENT ON TABLE "queue_session_ambulatori" IS 'Relazione N:M tra sessioni coda e ambulatori - supporta code multi-ambulatorio';
