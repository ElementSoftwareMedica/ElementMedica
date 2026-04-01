-- P65: Aggiunta campi firma digitale per attestati, registri presenze, lettere incarico
-- Questa migrazione aggiunge i campi per la firma formatore e partecipante

-- =============================================
-- STEP 1: Aggiungere campi firma su attestati
-- =============================================

-- Firma formatore (base64 o URL)
ALTER TABLE "attestati" 
ADD COLUMN IF NOT EXISTS "firma_formatore" TEXT;

-- Data/ora firma formatore
ALTER TABLE "attestati" 
ADD COLUMN IF NOT EXISTS "firma_formatore_at" TIMESTAMP(3);

-- ID Person formatore che ha firmato
ALTER TABLE "attestati" 
ADD COLUMN IF NOT EXISTS "firma_formatore_id" TEXT;

-- Firma partecipante (base64 o URL)
ALTER TABLE "attestati" 
ADD COLUMN IF NOT EXISTS "firma_partecipante" TEXT;

-- Data/ora firma partecipante
ALTER TABLE "attestati" 
ADD COLUMN IF NOT EXISTS "firma_partecipante_at" TIMESTAMP(3);

-- FK per formatore firmante
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attestati_firma_formatore_id_fkey'
    ) THEN
        ALTER TABLE "attestati" 
        ADD CONSTRAINT "attestati_firma_formatore_id_fkey" 
        FOREIGN KEY ("firma_formatore_id") 
        REFERENCES "persons"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Indice per query su attestati firmati
CREATE INDEX IF NOT EXISTS "idx_attestati_firma_formatore_id" 
ON "attestati" ("firma_formatore_id") 
WHERE "firma_formatore_id" IS NOT NULL;

-- =============================================
-- STEP 2: Aggiungere campi firma su registri_presenze
-- =============================================

-- Firma formatore (base64 o URL)
ALTER TABLE "registri_presenze" 
ADD COLUMN IF NOT EXISTS "firmaFormatore" TEXT;

-- Data/ora firma formatore
ALTER TABLE "registri_presenze" 
ADD COLUMN IF NOT EXISTS "firmaFormatoreAt" TIMESTAMP(3);

-- ID Person formatore che ha firmato
ALTER TABLE "registri_presenze" 
ADD COLUMN IF NOT EXISTS "firmaFormatoreId" TEXT;

-- IP del firmatario
ALTER TABLE "registri_presenze" 
ADD COLUMN IF NOT EXISTS "firmaFormatoreIp" VARCHAR(45);

-- FK per formatore firmante registro
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'registri_presenze_firmaFormatoreId_fkey'
    ) THEN
        ALTER TABLE "registri_presenze" 
        ADD CONSTRAINT "registri_presenze_firmaFormatoreId_fkey" 
        FOREIGN KEY ("firmaFormatoreId") 
        REFERENCES "persons"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Indice per query su registri firmati
CREATE INDEX IF NOT EXISTS "idx_registri_presenze_firmaFormatoreId" 
ON "registri_presenze" ("firmaFormatoreId") 
WHERE "firmaFormatoreId" IS NOT NULL;

-- =============================================
-- STEP 3: Aggiungere campi firma su lettere_incarico
-- =============================================

-- Verifica se la tabella esiste prima di modificarla
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lettere_incarico') THEN
        -- Firma formatore
        ALTER TABLE "lettere_incarico" 
        ADD COLUMN IF NOT EXISTS "firma_formatore" TEXT;
        
        ALTER TABLE "lettere_incarico" 
        ADD COLUMN IF NOT EXISTS "firma_formatore_at" TIMESTAMP(3);
        
        -- Firma datore lavoro (chi conferisce l'incarico)
        ALTER TABLE "lettere_incarico" 
        ADD COLUMN IF NOT EXISTS "firma_datore_lavoro" TEXT;
        
        ALTER TABLE "lettere_incarico" 
        ADD COLUMN IF NOT EXISTS "firma_datore_lavoro_at" TIMESTAMP(3);
        
        ALTER TABLE "lettere_incarico" 
        ADD COLUMN IF NOT EXISTS "firma_datore_lavoro_id" TEXT;
    END IF;
END $$;

-- FK per datore lavoro firmante (fuori dal DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lettere_incarico_firma_datore_lavoro_id_fkey'
    ) THEN
        ALTER TABLE "lettere_incarico" 
        ADD CONSTRAINT "lettere_incarico_firma_datore_lavoro_id_fkey" 
        FOREIGN KEY ("firma_datore_lavoro_id") 
        REFERENCES "persons"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Indice per query su lettere firmate dal datore
CREATE INDEX IF NOT EXISTS "idx_lettere_incarico_firma_datore_lavoro_id" 
ON "lettere_incarico" ("firma_datore_lavoro_id") 
WHERE "firma_datore_lavoro_id" IS NOT NULL;

-- =============================================
-- STEP 4: Aggiungere campi firma su preventivi
-- =============================================

-- Firma Operatore (chi emette il preventivo)
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaOperatore" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaOperatoreAt" TIMESTAMP(3);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaOperatoreId" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaOperatoreIp" VARCHAR(45);

-- Firma Cliente (chi accetta)
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaCliente" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaClienteAt" TIMESTAMP(3);
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaClienteId" TEXT;
ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "firmaClienteIp" VARCHAR(45);

-- FK per firmatari
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'preventivi_firmaOperatoreId_fkey'
    ) THEN
        ALTER TABLE "preventivi" 
        ADD CONSTRAINT "preventivi_firmaOperatoreId_fkey" 
        FOREIGN KEY ("firmaOperatoreId") 
        REFERENCES "persons"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'preventivi_firmaClienteId_fkey'
    ) THEN
        ALTER TABLE "preventivi" 
        ADD CONSTRAINT "preventivi_firmaClienteId_fkey" 
        FOREIGN KEY ("firmaClienteId") 
        REFERENCES "persons"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Indici per query su preventivi firmati
CREATE INDEX IF NOT EXISTS "idx_preventivi_firmaOperatoreId" 
ON "preventivi" ("firmaOperatoreId") 
WHERE "firmaOperatoreId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_preventivi_firmaClienteId" 
ON "preventivi" ("firmaClienteId") 
WHERE "firmaClienteId" IS NOT NULL;

-- =============================================
-- COMMENTI DOCUMENTAZIONE
-- =============================================

COMMENT ON COLUMN "attestati"."firma_formatore" IS 'P65: Base64 o URL della firma digitale/grafometrica del formatore';
COMMENT ON COLUMN "attestati"."firma_formatore_at" IS 'P65: Data/ora della firma del formatore';
COMMENT ON COLUMN "attestati"."firma_formatore_id" IS 'P65: ID Person del formatore che ha firmato';
COMMENT ON COLUMN "attestati"."firma_partecipante" IS 'P65: Base64 o URL della firma digitale/grafometrica del partecipante';
COMMENT ON COLUMN "attestati"."firma_partecipante_at" IS 'P65: Data/ora della firma del partecipante';

COMMENT ON COLUMN "registri_presenze"."firmaFormatore" IS 'P65: Base64 o URL della firma digitale/grafometrica del formatore';
COMMENT ON COLUMN "registri_presenze"."firmaFormatoreAt" IS 'P65: Data/ora della firma del formatore';
COMMENT ON COLUMN "registri_presenze"."firmaFormatoreId" IS 'P65: ID Person del formatore che ha firmato';
COMMENT ON COLUMN "registri_presenze"."firmaFormatoreIp" IS 'P65: IP del client al momento della firma';

-- =============================================
-- STEP 5: Aggiungere campi firma su DVR
-- =============================================

-- Firma RSPP (obbligatoria)
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRspp" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRsppAt" TIMESTAMP(3);
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRsppId" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRsppIp" VARCHAR(45);

-- Firma Medico Competente (obbligatoria)
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaMc" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaMcAt" TIMESTAMP(3);
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaMcId" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaMcIp" VARCHAR(45);

-- Firma Datore Lavoro (obbligatoria)
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaDatore" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaDatoreAt" TIMESTAMP(3);
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaDatoreId" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaDatoreIp" VARCHAR(45);

-- Firma RLS (opzionale)
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRls" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRlsAt" TIMESTAMP(3);
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRlsId" TEXT;
ALTER TABLE "DVR" ADD COLUMN IF NOT EXISTS "firmaRlsIp" VARCHAR(45);

-- FK per firmatari DVR
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'DVR_firmaRsppId_fkey') THEN
        ALTER TABLE "DVR" ADD CONSTRAINT "DVR_firmaRsppId_fkey" FOREIGN KEY ("firmaRsppId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'DVR_firmaMcId_fkey') THEN
        ALTER TABLE "DVR" ADD CONSTRAINT "DVR_firmaMcId_fkey" FOREIGN KEY ("firmaMcId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'DVR_firmaDatoreId_fkey') THEN
        ALTER TABLE "DVR" ADD CONSTRAINT "DVR_firmaDatoreId_fkey" FOREIGN KEY ("firmaDatoreId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'DVR_firmaRlsId_fkey') THEN
        ALTER TABLE "DVR" ADD CONSTRAINT "DVR_firmaRlsId_fkey" FOREIGN KEY ("firmaRlsId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Indici DVR
CREATE INDEX IF NOT EXISTS "idx_DVR_firmaRsppId" ON "DVR" ("firmaRsppId") WHERE "firmaRsppId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_DVR_firmaMcId" ON "DVR" ("firmaMcId") WHERE "firmaMcId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_DVR_firmaDatoreId" ON "DVR" ("firmaDatoreId") WHERE "firmaDatoreId" IS NOT NULL;

-- =============================================
-- STEP 6: Aggiungere campi firma su Sopralluogo
-- =============================================

-- Firma Medico Competente (esecutore)
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaMc" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaMcAt" TIMESTAMP(3);
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaMcId" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaMcIp" VARCHAR(45);

-- Firma RSPP (accompagnatore)
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaRspp" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaRsppAt" TIMESTAMP(3);
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaRsppId" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaRsppIp" VARCHAR(45);

-- Firma Datore Lavoro/Referente aziendale
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaDatore" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaDatoreAt" TIMESTAMP(3);
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaDatoreId" TEXT;
ALTER TABLE "Sopralluogo" ADD COLUMN IF NOT EXISTS "firmaDatoreIp" VARCHAR(45);

-- FK per firmatari Sopralluogo
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Sopralluogo_firmaMcId_fkey') THEN
        ALTER TABLE "Sopralluogo" ADD CONSTRAINT "Sopralluogo_firmaMcId_fkey" FOREIGN KEY ("firmaMcId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Sopralluogo_firmaRsppId_fkey') THEN
        ALTER TABLE "Sopralluogo" ADD CONSTRAINT "Sopralluogo_firmaRsppId_fkey" FOREIGN KEY ("firmaRsppId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Sopralluogo_firmaDatoreId_fkey') THEN
        ALTER TABLE "Sopralluogo" ADD CONSTRAINT "Sopralluogo_firmaDatoreId_fkey" FOREIGN KEY ("firmaDatoreId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Indici Sopralluogo
CREATE INDEX IF NOT EXISTS "idx_Sopralluogo_firmaMcId" ON "Sopralluogo" ("firmaMcId") WHERE "firmaMcId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_Sopralluogo_firmaRsppId" ON "Sopralluogo" ("firmaRsppId") WHERE "firmaRsppId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_Sopralluogo_firmaDatoreId" ON "Sopralluogo" ("firmaDatoreId") WHERE "firmaDatoreId" IS NOT NULL;

-- Commenti DVR e Sopralluogo
COMMENT ON COLUMN "DVR"."firmaRspp" IS 'P65: Base64 o URL firma RSPP';
COMMENT ON COLUMN "DVR"."firmaMc" IS 'P65: Base64 o URL firma Medico Competente';
COMMENT ON COLUMN "DVR"."firmaDatore" IS 'P65: Base64 o URL firma Datore di Lavoro';
COMMENT ON COLUMN "DVR"."firmaRls" IS 'P65: Base64 o URL firma RLS (opzionale)';

COMMENT ON COLUMN "Sopralluogo"."firmaMc" IS 'P65: Base64 o URL firma Medico Competente';
COMMENT ON COLUMN "Sopralluogo"."firmaRspp" IS 'P65: Base64 o URL firma RSPP';
COMMENT ON COLUMN "Sopralluogo"."firmaDatore" IS 'P65: Base64 o URL firma Datore/Referente';
