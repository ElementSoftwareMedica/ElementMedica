-- P65 Fase 4: CDA Documents e HL7 Mapping
-- Migration manuale per evitare problemi con shadow database

-- ============================================
-- ENUMS PER CDA/HL7
-- ============================================

-- Tipo sorgente documento CDA
DO $$ BEGIN
    CREATE TYPE cda_source_type AS ENUM (
        'REFERTO',
        'GIUDIZIO_IDONEITA',
        'CERTIFICATO',
        'LETTERA_DIMISSIONE',
        'PRESCRIZIONE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Stato invio CDA a FSE
DO $$ BEGIN
    CREATE TYPE stato_invio_cda AS ENUM (
        'NON_INVIATO',
        'IN_CODA',
        'INVIATO',
        'ACCETTATO',
        'RIFIUTATO',
        'ERRORE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tipo sistema di codifica
DO $$ BEGIN
    CREATE TYPE tipo_codice_cda AS ENUM (
        'LOINC',
        'ICD9_CM',
        'ICD10',
        'SNOMED_CT',
        'ATC',
        'AIC',
        'ATECO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABELLA CDA_DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS cda_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Sorgente
    source_type cda_source_type NOT NULL,
    source_id TEXT NOT NULL,
    
    -- CDA Content
    cda_xml TEXT NOT NULL,
    cda_version TEXT NOT NULL DEFAULT 'R2',
    template_id TEXT,
    
    -- Hashing
    hash_xml TEXT NOT NULL,
    algoritmo TEXT NOT NULL DEFAULT 'SHA-256',
    
    -- Stato invio FSE
    stato_invio stato_invio_cda NOT NULL DEFAULT 'NON_INVIATO',
    inviato_at TIMESTAMP,
    esito_invio TEXT,
    errore_invio TEXT,
    
    -- Metadata documento
    titolo_documento TEXT,
    data_documento TIMESTAMP,
    autore_id TEXT,
    paziente_id TEXT,
    organization_oid TEXT,
    
    -- Validazione
    validato BOOLEAN NOT NULL DEFAULT false,
    validato_at TIMESTAMP,
    errori_validazione TEXT[] DEFAULT '{}',
    warnings_validazione TEXT[] DEFAULT '{}',
    
    -- Audit
    tenant_id TEXT NOT NULL,
    created_by TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT fk_cda_documents_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) ON DELETE CASCADE
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS cda_documents_source_tenant_unique 
    ON cda_documents(source_type, source_id, tenant_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cda_documents_tenant ON cda_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cda_documents_source_type ON cda_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_cda_documents_source_id ON cda_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_cda_documents_stato_invio ON cda_documents(stato_invio);
CREATE INDEX IF NOT EXISTS idx_cda_documents_paziente_id ON cda_documents(paziente_id);
CREATE INDEX IF NOT EXISTS idx_cda_documents_tenant_stato ON cda_documents(tenant_id, stato_invio);
CREATE INDEX IF NOT EXISTS idx_cda_documents_tenant_deleted ON cda_documents(tenant_id, deleted_at);

-- ============================================
-- TABELLA HL7_MAPPINGS
-- ============================================

CREATE TABLE IF NOT EXISTS hl7_mappings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Campo interno
    entity_type TEXT NOT NULL,
    field_path TEXT NOT NULL,
    
    -- Codifica HL7
    code_system tipo_codice_cda NOT NULL,
    code_system_oid TEXT NOT NULL,
    code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    code_system_name TEXT,
    
    -- Mapping alternativo
    alternative_code TEXT,
    alternative_code_system tipo_codice_cda,
    alternative_oid TEXT,
    
    -- Contesto
    context TEXT,
    description TEXT,
    
    -- Validità
    attivo BOOLEAN NOT NULL DEFAULT true,
    valido_da TIMESTAMP NOT NULL DEFAULT now(),
    valido_a TIMESTAMP,
    
    -- Audit
    tenant_id TEXT, -- null = mapping globale
    created_by TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS hl7_mappings_entity_field_system_tenant_unique 
    ON hl7_mappings(entity_type, field_path, code_system, tenant_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hl7_mappings_entity_type ON hl7_mappings(entity_type);
CREATE INDEX IF NOT EXISTS idx_hl7_mappings_code_system ON hl7_mappings(code_system);
CREATE INDEX IF NOT EXISTS idx_hl7_mappings_code ON hl7_mappings(code);
CREATE INDEX IF NOT EXISTS idx_hl7_mappings_tenant ON hl7_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hl7_mappings_attivo ON hl7_mappings(attivo);

-- ============================================
-- SEED MAPPING LOINC BASE PER REFERTI
-- ============================================

-- Mapping base per tipi di documento
INSERT INTO hl7_mappings (id, entity_type, field_path, code_system, code_system_oid, code, display_name, code_system_name, context, description, attivo)
VALUES 
    -- Tipi documento
    (gen_random_uuid()::text, 'Referto', 'documentType', 'LOINC', '2.16.840.1.113883.6.1', '11502-2', 'Laboratory report', 'LOINC', 'LABORATORIO', 'Referto di laboratorio', true),
    (gen_random_uuid()::text, 'Referto', 'documentType', 'LOINC', '2.16.840.1.113883.6.1', '18748-4', 'Diagnostic imaging study', 'LOINC', 'RADIOLOGIA', 'Referto radiologico', true),
    (gen_random_uuid()::text, 'Referto', 'documentType', 'LOINC', '2.16.840.1.113883.6.1', '11488-4', 'Consultation note', 'LOINC', 'SPECIALISTICA', 'Referto visita specialistica', true),
    (gen_random_uuid()::text, 'Referto', 'documentType', 'LOINC', '2.16.840.1.113883.6.1', '28653-4', 'Social worker evaluation note', 'LOINC', 'MDL', 'Referto medicina del lavoro', true),
    
    -- Sezioni CDA standard
    (gen_random_uuid()::text, 'CDASection', 'anamnesi', 'LOINC', '2.16.840.1.113883.6.1', '10164-2', 'History of present illness', 'LOINC', NULL, 'Sezione anamnesi', true),
    (gen_random_uuid()::text, 'CDASection', 'esameObiettivo', 'LOINC', '2.16.840.1.113883.6.1', '29545-1', 'Physical findings', 'LOINC', NULL, 'Sezione esame obiettivo', true),
    (gen_random_uuid()::text, 'CDASection', 'diagnosi', 'LOINC', '2.16.840.1.113883.6.1', '29548-5', 'Diagnosis', 'LOINC', NULL, 'Sezione diagnosi', true),
    (gen_random_uuid()::text, 'CDASection', 'conclusioni', 'LOINC', '2.16.840.1.113883.6.1', '55110-1', 'Conclusions', 'LOINC', NULL, 'Sezione conclusioni', true),
    (gen_random_uuid()::text, 'CDASection', 'prescrizioni', 'LOINC', '2.16.840.1.113883.6.1', '57828-6', 'Prescriptions', 'LOINC', NULL, 'Sezione prescrizioni', true),
    (gen_random_uuid()::text, 'CDASection', 'allergie', 'LOINC', '2.16.840.1.113883.6.1', '48765-2', 'Allergies and adverse reactions', 'LOINC', NULL, 'Sezione allergie', true),
    
    -- GiudizioIdoneita MDL
    (gen_random_uuid()::text, 'GiudizioIdoneita', 'documentType', 'LOINC', '2.16.840.1.113883.6.1', '11502-2', 'Occupational medicine evaluation', 'LOINC', 'MDL', 'Giudizio idoneità lavorativa', true),
    (gen_random_uuid()::text, 'GiudizioIdoneita', 'esito', 'LOINC', '2.16.840.1.113883.6.1', '11323-3', 'Health status', 'LOINC', 'MDL', 'Esito idoneità', true),
    (gen_random_uuid()::text, 'GiudizioIdoneita', 'limitazioni', 'LOINC', '2.16.840.1.113883.6.1', '30954-2', 'Relevant diagnostic tests and laboratory data', 'LOINC', 'MDL', 'Limitazioni/prescrizioni', true)
ON CONFLICT DO NOTHING;

-- Record migration
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid()::text,
    'p65_fase4_cda_hl7_manual',
    now(),
    '20260204_p65_fase4_cda_hl7',
    NULL,
    NULL,
    now(),
    1
) ON CONFLICT DO NOTHING;
