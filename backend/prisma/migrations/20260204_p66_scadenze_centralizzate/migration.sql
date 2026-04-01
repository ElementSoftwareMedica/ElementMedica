-- P66: Sistema Scadenze Centralizzato
-- Migration: Creazione enum e tabelle per scadenzario unificato e gestione farmaci

-- ============================================
-- STEP 1: ENUM TYPES
-- ============================================

-- DeadlineCategory
DO $$ BEGIN
    CREATE TYPE "DeadlineCategory" AS ENUM (
        'VISITA_MEDICA', 'FORMAZIONE', 'FARMACO', 'MANUTENZIONE', 
        'DOCUMENTO', 'PROTOCOLLO_MDL', 'SOPRALLUOGO', 'TARIFFARIO', 'ALTRO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- DeadlinePriority
DO $$ BEGIN
    CREATE TYPE "DeadlinePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- DeadlineStatus
DO $$ BEGIN
    CREATE TYPE "DeadlineStatus" AS ENUM ('ATTIVA', 'IN_PREAVVISO', 'SCADUTA', 'COMPLETATA', 'ANNULLATA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- FormaFarmaceutica
DO $$ BEGIN
    CREATE TYPE "FormaFarmaceutica" AS ENUM (
        'COMPRESSE', 'CAPSULE', 'FIALE', 'SOLUZIONE_ORALE', 'SCIROPPO',
        'CREMA', 'POMATA', 'GEL', 'COLLIRIO', 'SPRAY', 'SUPPOSTE', 
        'AEROSOL', 'CEROTTO', 'ALTRO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- STEP 2: TABELLA FARMACI
-- ============================================

CREATE TABLE IF NOT EXISTS "farmaci" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenant_id" TEXT NOT NULL,
    "codice" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "principio_attivo" VARCHAR(255),
    "forma_farmaceutica" "FormaFarmaceutica",
    "dosaggio" VARCHAR(100),
    "ubicazione" VARCHAR(255) NOT NULL,
    "ambulatorio_id" TEXT,
    "quantita_disponibile" INT NOT NULL,
    "unita_misura" VARCHAR(50) NOT NULL DEFAULT 'pz',
    "quantita_minima" INT,
    "data_scadenza" TIMESTAMP(3) NOT NULL,
    "lotto_numero" VARCHAR(100),
    "fornitore" VARCHAR(255),
    "data_acquisto" TIMESTAMP(3),
    "prezzo_acquisto" DOUBLE PRECISION,
    "note" TEXT,
    "immagine_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    
    CONSTRAINT "farmaci_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id"),
    CONSTRAINT "farmaci_ambulatorio_id_fkey" FOREIGN KEY ("ambulatorio_id") REFERENCES "ambulatori"("id") ON DELETE SET NULL
);

-- Unique per tenant + codice
CREATE UNIQUE INDEX IF NOT EXISTS "farmaci_tenant_id_codice_key" ON "farmaci"("tenant_id", "codice");

-- Indici farmaci
CREATE INDEX IF NOT EXISTS "idx_farmaci_tenant" ON "farmaci"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_farmaci_tenant_scadenza" ON "farmaci"("tenant_id", "data_scadenza");
CREATE INDEX IF NOT EXISTS "idx_farmaci_tenant_ubicazione" ON "farmaci"("tenant_id", "ubicazione");
CREATE INDEX IF NOT EXISTS "idx_farmaci_ambulatorio" ON "farmaci"("ambulatorio_id") WHERE "ambulatorio_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_farmaci_deleted" ON "farmaci"("deleted_at");

-- ============================================
-- STEP 3: TABELLA DEADLINE_ITEMS (Scadenzario)
-- ============================================

CREATE TABLE IF NOT EXISTS "deadline_items" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenant_id" TEXT NOT NULL,
    
    -- Categorizzazione
    "categoria" "DeadlineCategory" NOT NULL,
    "priorita" "DeadlinePriority" NOT NULL DEFAULT 'NORMAL',
    "status" "DeadlineStatus" NOT NULL DEFAULT 'ATTIVA',
    
    -- Riferimento polimorfico
    "entity_type" TEXT,
    "entity_id" TEXT,
    
    -- Scadenza
    "data_scadenza" TIMESTAMP(3) NOT NULL,
    "data_preavviso_1" TIMESTAMP(3),
    "data_preavviso_2" TIMESTAMP(3),
    
    -- Destinatari
    "responsabile_id" TEXT,
    "person_id" TEXT,
    "company_profile_id" TEXT,
    "site_id" TEXT,
    
    -- Contenuto
    "titolo" VARCHAR(255) NOT NULL,
    "descrizione" TEXT,
    "note" TEXT,
    
    -- Estensioni per farmaci
    "ubicazione" VARCHAR(255),
    "quantita" INT,
    "unita_misura" VARCHAR(50),
    "lotto_numero" VARCHAR(100),
    "farmaco_id" TEXT,
    
    -- Ricorrenza
    "is_ricorrente" BOOLEAN NOT NULL DEFAULT FALSE,
    "periodicita_mesi" INT,
    "prossima_scadenza" TIMESTAMP(3),
    
    -- Notifiche inviate
    "notifica_inviata_1" BOOLEAN NOT NULL DEFAULT FALSE,
    "notifica_inviata_2" BOOLEAN NOT NULL DEFAULT FALSE,
    "notifica_scadenza" BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Completamento
    "completato_at" TIMESTAMP(3),
    "completato_da" TEXT,
    "note_completamento" TEXT,
    
    -- Audit
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    
    -- Foreign keys
    CONSTRAINT "deadline_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id"),
    CONSTRAINT "deadline_items_responsabile_id_fkey" FOREIGN KEY ("responsabile_id") REFERENCES "persons"("id") ON DELETE SET NULL,
    CONSTRAINT "deadline_items_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL,
    CONSTRAINT "deadline_items_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "company_tenant_profiles"("id") ON DELETE SET NULL,
    CONSTRAINT "deadline_items_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "company_sites"("id") ON DELETE SET NULL,
    CONSTRAINT "deadline_items_farmaco_id_fkey" FOREIGN KEY ("farmaco_id") REFERENCES "farmaci"("id") ON DELETE SET NULL
);

-- Indici deadline_items
CREATE INDEX IF NOT EXISTS "idx_deadline_items_tenant" ON "deadline_items"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_deadline_items_tenant_categoria" ON "deadline_items"("tenant_id", "categoria");
CREATE INDEX IF NOT EXISTS "idx_deadline_items_tenant_status" ON "deadline_items"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_deadline_items_tenant_scadenza" ON "deadline_items"("tenant_id", "data_scadenza");
CREATE INDEX IF NOT EXISTS "idx_deadline_items_tenant_status_scadenza" ON "deadline_items"("tenant_id", "status", "data_scadenza");
CREATE INDEX IF NOT EXISTS "idx_deadline_items_responsabile" ON "deadline_items"("responsabile_id") WHERE "responsabile_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_deadline_items_person" ON "deadline_items"("person_id") WHERE "person_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_deadline_items_company_profile" ON "deadline_items"("company_profile_id") WHERE "company_profile_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_deadline_items_site" ON "deadline_items"("site_id") WHERE "site_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_deadline_items_entity" ON "deadline_items"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_deadline_items_farmaco" ON "deadline_items"("farmaco_id") WHERE "farmaco_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_deadline_items_deleted" ON "deadline_items"("deleted_at");
