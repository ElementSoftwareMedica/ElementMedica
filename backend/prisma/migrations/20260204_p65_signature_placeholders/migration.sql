-- P65: Signature Placeholders Migration
-- Estende il supporto firma per tutti i tipi di documento

-- ========================================
-- ENUM UPDATES
-- ========================================

-- Aggiungi nuovi tipi di firmatario
ALTER TYPE "tipo_firmatario" ADD VALUE IF NOT EXISTS 'DIPENDENTE';
ALTER TYPE "tipo_firmatario" ADD VALUE IF NOT EXISTS 'FORMATORE';
ALTER TYPE "tipo_firmatario" ADD VALUE IF NOT EXISTS 'DATORE_LAVORO';

-- Aggiungi nuovi tipi di documento firmato
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'ATTESTATO';
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'TEST_CORSO';
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'LETTERA_INCARICO';
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'PRIVACY';
ALTER TYPE "tipo_documento_firmato" ADD VALUE IF NOT EXISTS 'SCHEDA_SORVEGLIANZA';

-- ========================================
-- ATTESTATO - CAMPI FIRMA
-- ========================================

ALTER TABLE "attestati" ADD COLUMN IF NOT EXISTS "firma_formatore" TEXT;
ALTER TABLE "attestati" ADD COLUMN IF NOT EXISTS "firma_formatore_at" TIMESTAMP(3);
ALTER TABLE "attestati" ADD COLUMN IF NOT EXISTS "firma_formatore_id" TEXT;
ALTER TABLE "attestati" ADD COLUMN IF NOT EXISTS "firma_partecipante" TEXT;
ALTER TABLE "attestati" ADD COLUMN IF NOT EXISTS "firma_partecipante_at" TIMESTAMP(3);

-- FK formatore firmante
ALTER TABLE "attestati" 
ADD CONSTRAINT "attestati_firma_formatore_id_fkey" 
FOREIGN KEY ("firma_formatore_id") REFERENCES "persons"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- ========================================
-- LETTERA INCARICO - CAMPI FIRMA
-- ========================================

ALTER TABLE "lettere_incarico" ADD COLUMN IF NOT EXISTS "firma_formatore" TEXT;
ALTER TABLE "lettere_incarico" ADD COLUMN IF NOT EXISTS "firma_formatore_at" TIMESTAMP(3);
ALTER TABLE "lettere_incarico" ADD COLUMN IF NOT EXISTS "firma_datore_lavoro" TEXT;
ALTER TABLE "lettere_incarico" ADD COLUMN IF NOT EXISTS "firma_datore_lavoro_at" TIMESTAMP(3);
ALTER TABLE "lettere_incarico" ADD COLUMN IF NOT EXISTS "firma_datore_lavoro_id" TEXT;

-- FK datore lavoro firmante
ALTER TABLE "lettere_incarico" 
ADD CONSTRAINT "lettere_incarico_firma_datore_lavoro_id_fkey" 
FOREIGN KEY ("firma_datore_lavoro_id") REFERENCES "persons"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- ========================================
-- DOCUMENTO TEMPLATE - FLAGS FIRMA AGGIUNTIVE
-- ========================================

ALTER TABLE "documenti_template" ADD COLUMN IF NOT EXISTS "richiede_firma_dipendente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documenti_template" ADD COLUMN IF NOT EXISTS "richiede_firma_formatore" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documenti_template" ADD COLUMN IF NOT EXISTS "richiede_firma_datore" BOOLEAN NOT NULL DEFAULT false;

-- ========================================
-- DOCUMENTO COMPILATO - CAMPI FIRMA AGGIUNTIVE
-- ========================================

-- Firma Dipendente
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_dipendente" TEXT;
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_dipendente_at" TIMESTAMP(3);
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_dipendente_id" TEXT;
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_dipendente_ip" VARCHAR(45);

-- Firma Formatore
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_formatore" TEXT;
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_formatore_at" TIMESTAMP(3);
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_formatore_id" TEXT;
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_formatore_ip" VARCHAR(45);

-- Firma Datore Lavoro
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_datore" TEXT;
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_datore_at" TIMESTAMP(3);
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_datore_id" TEXT;
ALTER TABLE "documenti_compilati" ADD COLUMN IF NOT EXISTS "firma_datore_ip" VARCHAR(45);

-- FK dipendente firmante
ALTER TABLE "documenti_compilati" 
ADD CONSTRAINT "documenti_compilati_firma_dipendente_id_fkey" 
FOREIGN KEY ("firma_dipendente_id") REFERENCES "persons"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- FK formatore firmante
ALTER TABLE "documenti_compilati" 
ADD CONSTRAINT "documenti_compilati_firma_formatore_id_fkey" 
FOREIGN KEY ("firma_formatore_id") REFERENCES "persons"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- FK datore firmante
ALTER TABLE "documenti_compilati" 
ADD CONSTRAINT "documenti_compilati_firma_datore_id_fkey" 
FOREIGN KEY ("firma_datore_id") REFERENCES "persons"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- ========================================
-- INDICI
-- ========================================

CREATE INDEX IF NOT EXISTS "attestati_firma_formatore_id_idx" ON "attestati"("firma_formatore_id");
CREATE INDEX IF NOT EXISTS "lettere_incarico_firma_datore_lavoro_id_idx" ON "lettere_incarico"("firma_datore_lavoro_id");
CREATE INDEX IF NOT EXISTS "documenti_compilati_firma_dipendente_id_idx" ON "documenti_compilati"("firma_dipendente_id");
CREATE INDEX IF NOT EXISTS "documenti_compilati_firma_formatore_id_idx" ON "documenti_compilati"("firma_formatore_id");
CREATE INDEX IF NOT EXISTS "documenti_compilati_firma_datore_id_idx" ON "documenti_compilati"("firma_datore_id");
