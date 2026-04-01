-- P61: Questionari Medici con Tariffazione
-- Migration per sistema questionari con scoring e fatturazione automatica

-- CreateEnum per compilatore questionario
CREATE TYPE "compilatore_questionario" AS ENUM ('PAZIENTE', 'OPERATORE', 'MEDICO', 'FAMILIARE');

-- Aggiungi campi scoring a documenti_compilati
ALTER TABLE "documenti_compilati"
ADD COLUMN IF NOT EXISTS "punteggio_totale" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "punteggio_percentuale" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "esito_critico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "note_algoritmo" TEXT;

-- CreateTable questionari_medici_config
CREATE TABLE IF NOT EXISTS "questionari_medici_config" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "documento_template_id" TEXT NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "descrizione" TEXT,
    "categoria" VARCHAR(100),
    "versione" VARCHAR(50) DEFAULT '1.0',
    "codice" VARCHAR(50),
    "compilato_da" "compilatore_questionario" NOT NULL DEFAULT 'PAZIENTE',
    "tempo_compilazione_stimato" INTEGER,
    "scoring_enabled" BOOLEAN NOT NULL DEFAULT true,
    "scoring_config" JSONB,
    "soglia_critica" DOUBLE PRECISION,
    "soglia_attenzione" DOUBLE PRECISION,
    "azioni_automatiche" JSONB,
    "protocollo_sanitario_id" TEXT,
    "is_obbligatorio_protocollo" BOOLEAN NOT NULL DEFAULT false,
    "ordine_in_protocollo" INTEGER,
    "dipendenze_protocollo" JSONB,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "note_mediche" TEXT,
    "istruzioni_compilazione" TEXT,
    "voce_tariffario_id" TEXT,
    "is_pagamento" BOOLEAN NOT NULL DEFAULT false,
    "prezzo_default" DECIMAL(10,2),
    "fatturabile" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "questionari_medici_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable questionari_risposte
CREATE TABLE IF NOT EXISTS "questionari_risposte" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "documento_compilato_id" TEXT NOT NULL,
    "campo_id" TEXT NOT NULL,
    "valore" JSONB NOT NULL,
    "punteggio" DOUBLE PRECISION,
    "peso" DOUBLE PRECISION DEFAULT 1.0,
    "is_critico" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionari_risposte_pkey" PRIMARY KEY ("id")
);

-- Aggiungi campo documentoCompilatoId a movimenti_contabili per tracciare fatturazione questionari
ALTER TABLE "movimenti_contabili"
ADD COLUMN IF NOT EXISTS "documentoCompilatoId" TEXT;

-- CreateIndex per questionari_medici_config
CREATE INDEX IF NOT EXISTS "questionari_medici_config_tenant_id_idx" ON "questionari_medici_config"("tenant_id");
CREATE INDEX IF NOT EXISTS "questionari_medici_config_tenant_id_deleted_at_idx" ON "questionari_medici_config"("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "questionari_medici_config_documento_template_id_idx" ON "questionari_medici_config"("documento_template_id");
CREATE INDEX IF NOT EXISTS "questionari_medici_config_protocollo_sanitario_id_idx" ON "questionari_medici_config"("protocollo_sanitario_id");
CREATE INDEX IF NOT EXISTS "questionari_medici_config_voce_tariffario_id_idx" ON "questionari_medici_config"("voce_tariffario_id");
CREATE UNIQUE INDEX IF NOT EXISTS "questionari_medici_config_documento_template_id_key" ON "questionari_medici_config"("documento_template_id");
CREATE UNIQUE INDEX IF NOT EXISTS "questionari_medici_config_tenant_id_codice_key" ON "questionari_medici_config"("tenant_id", "codice");

-- CreateIndex per questionari_risposte
CREATE INDEX IF NOT EXISTS "questionari_risposte_tenant_id_idx" ON "questionari_risposte"("tenant_id");
CREATE INDEX IF NOT EXISTS "questionari_risposte_documento_compilato_id_idx" ON "questionari_risposte"("documento_compilato_id");

-- CreateIndex per movimenti_contabili (documentoCompilatoId)
CREATE INDEX IF NOT EXISTS "movimenti_contabili_documentoCompilatoId_idx" ON "movimenti_contabili"("documentoCompilatoId");

-- AddForeignKey questionari_medici_config
ALTER TABLE "questionari_medici_config" 
ADD CONSTRAINT "questionari_medici_config_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "questionari_medici_config" 
ADD CONSTRAINT "questionari_medici_config_documento_template_id_fkey" 
FOREIGN KEY ("documento_template_id") REFERENCES "documenti_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "questionari_medici_config" 
ADD CONSTRAINT "questionari_medici_config_protocollo_sanitario_id_fkey" 
FOREIGN KEY ("protocollo_sanitario_id") REFERENCES "protocolli_sanitari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "questionari_medici_config" 
ADD CONSTRAINT "questionari_medici_config_voce_tariffario_id_fkey" 
FOREIGN KEY ("voce_tariffario_id") REFERENCES "voci_tariffario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey questionari_risposte
ALTER TABLE "questionari_risposte" 
ADD CONSTRAINT "questionari_risposte_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "questionari_risposte" 
ADD CONSTRAINT "questionari_risposte_documento_compilato_id_fkey" 
FOREIGN KEY ("documento_compilato_id") REFERENCES "documenti_compilati"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey movimenti_contabili -> documenti_compilati
ALTER TABLE "movimenti_contabili" 
ADD CONSTRAINT "movimenti_contabili_documentoCompilatoId_fkey" 
FOREIGN KEY ("documentoCompilatoId") REFERENCES "documenti_compilati"("id") ON DELETE SET NULL ON UPDATE CASCADE;
