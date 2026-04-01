-- =====================================================
-- P53.3: Multi-Display Monitors per Ambulatori
-- Data: 16 Gennaio 2026
-- Descrizione: Aggiunge supporto per configurazione di monitor multipli
--              dove ogni monitor mostra solo gli ambulatori assegnati
-- =====================================================

-- Tabella principale QueueDisplayMonitor
-- Rappresenta una configurazione monitor fisica/logica
CREATE TABLE IF NOT EXISTS "queue_display_monitors" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" VARCHAR(255) NOT NULL,
    
    -- Identificativo monitor
    "nome" VARCHAR(100) NOT NULL,
    "codice" VARCHAR(20) NOT NULL,  -- Es. "MON1", "MON2"
    "descrizione" TEXT,
    
    -- Poliambulatorio di appartenenza (opzionale)
    "poliambulatorioId" UUID,
    
    -- Configurazione display
    "config" JSONB DEFAULT '{}',
    
    -- Attivo/Inattivo
    "isActive" BOOLEAN DEFAULT true,
    
    -- URL univoco per accesso diretto (token sicuro)
    "accessToken" VARCHAR(100) UNIQUE,
    
    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP WITH TIME ZONE,
    
    -- Foreign Key
    CONSTRAINT "fk_display_monitor_poliambulatorio" 
        FOREIGN KEY ("poliambulatorioId") 
        REFERENCES "poliambulatori"("id") 
        ON DELETE SET NULL
);

-- Indici per query frequenti
CREATE INDEX IF NOT EXISTS "idx_queue_display_monitors_tenant" 
    ON "queue_display_monitors"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_queue_display_monitors_poliambulatorio" 
    ON "queue_display_monitors"("poliambulatorioId");
CREATE INDEX IF NOT EXISTS "idx_queue_display_monitors_active" 
    ON "queue_display_monitors"("isActive");
CREATE INDEX IF NOT EXISTS "idx_queue_display_monitors_access_token" 
    ON "queue_display_monitors"("accessToken");
CREATE INDEX IF NOT EXISTS "idx_queue_display_monitors_deleted" 
    ON "queue_display_monitors"("tenantId", "deletedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_queue_display_monitors_tenant_codice" 
    ON "queue_display_monitors"("tenantId", "codice") 
    WHERE "deletedAt" IS NULL;

-- Tabella join N:M Monitor - Ambulatori
-- Definisce quali ambulatori sono visualizzati su ciascun monitor
CREATE TABLE IF NOT EXISTS "queue_display_monitor_ambulatori" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "monitorId" UUID NOT NULL,
    "ambulatorioId" UUID NOT NULL,
    "ordine" INT DEFAULT 0,  -- Ordine di visualizzazione
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT "fk_monitor_ambulatorio_monitor" 
        FOREIGN KEY ("monitorId") 
        REFERENCES "queue_display_monitors"("id") 
        ON DELETE CASCADE,
    CONSTRAINT "fk_monitor_ambulatorio_ambulatorio" 
        FOREIGN KEY ("ambulatorioId") 
        REFERENCES "ambulatori"("id") 
        ON DELETE CASCADE,
    
    -- Unique constraint per evitare duplicati
    CONSTRAINT "uq_monitor_ambulatorio" UNIQUE ("monitorId", "ambulatorioId")
);

-- Indici per la tabella join
CREATE INDEX IF NOT EXISTS "idx_monitor_ambulatori_monitor" 
    ON "queue_display_monitor_ambulatori"("monitorId");
CREATE INDEX IF NOT EXISTS "idx_monitor_ambulatori_ambulatorio" 
    ON "queue_display_monitor_ambulatori"("ambulatorioId");

-- Commento per documentazione
COMMENT ON TABLE "queue_display_monitors" IS 'P53.3: Configurazione monitor display per sistema code. Ogni monitor può mostrare un subset di ambulatori.';
COMMENT ON TABLE "queue_display_monitor_ambulatori" IS 'P53.3: Tabella join N:M per associare ambulatori ai monitor display.';
COMMENT ON COLUMN "queue_display_monitors"."config" IS 'Configurazione JSON: { theme, fontSize, showRecentCalls, enableAudio, etc. }';
COMMENT ON COLUMN "queue_display_monitors"."accessToken" IS 'Token per accesso diretto al monitor senza autenticazione (uso in TV/totem)';
