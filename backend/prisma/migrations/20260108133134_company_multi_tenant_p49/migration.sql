-- ============================================
-- PROGETTO 49 - COMPANY MULTI-TENANT
-- ============================================
-- Questa migrazione implementa il pattern multi-tenant per Company
-- seguendo lo stesso approccio del Progetto 48 per Person
-- ============================================

-- ============================================
-- STEP 1: CREARE NUOVI ENUM
-- ============================================

-- Enum CompanySize
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_size') THEN
    CREATE TYPE "company_size" AS ENUM ('MICRO', 'PICCOLA', 'MEDIA', 'GRANDE');
  END IF;
END
$$;

-- Enum CompanyProfileStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_profile_status') THEN
    CREATE TYPE "company_profile_status" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'CHURNED');
  END IF;
END
$$;

-- Enum ConsentMethod
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_method') THEN
    CREATE TYPE "consent_method" AS ENUM ('EXPLICIT', 'WRITTEN', 'CONTRACTUAL', 'LEGAL_OBLIGATION');
  END IF;
END
$$;

-- ============================================
-- STEP 2: MODIFICARE LA TABELLA COMPANIES
-- ============================================

-- Rimuovere colonne che ora vanno in CompanyTenantProfile
ALTER TABLE "companies" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "mail";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "telefono";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "note";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "isActive";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "slug";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "domain";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "settings";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "subscriptionPlan";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "personaRiferimento";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "sedeAzienda";

-- Aggiungere nuove colonne per sede legale
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "sedeLegaleIndirizzo" VARCHAR(255);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "sedeLegaleCitta" VARCHAR(100);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "sedeLegaleCap" VARCHAR(10);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "sedeLegaleProvincia" VARCHAR(2);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "sedeLegaleNazione" VARCHAR(2) DEFAULT 'IT';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "formaGiuridica" VARCHAR(50);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "settore" VARCHAR(100);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "dimensione" "company_size";
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "pecFatturazione" VARCHAR(255);

-- Indici
CREATE INDEX IF NOT EXISTS idx_companies_codice_ateco ON companies("codiceAteco");
CREATE INDEX IF NOT EXISTS idx_companies_settore ON companies("settore");

-- ============================================
-- STEP 3: CREARE TABELLA CompanyTenantProfile
-- ============================================

CREATE TABLE IF NOT EXISTS "company_tenant_profiles" (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL,
    
    -- Referente aziendale (FK a Person)
    "referenteId" VARCHAR(36),
    "referenteRuolo" VARCHAR(100),
    
    -- Contatti tenant-specific
    "emailGenerale" VARCHAR(255),
    "telefonoGenerale" VARCHAR(20),
    "pec" VARCHAR(255),
    
    -- Dati contrattuali
    "dataInizioRapporto" DATE,
    "dataFineRapporto" DATE,
    "tipoContratto" VARCHAR(100),
    "numeroContratto" VARCHAR(50),
    "valoreContrattoAnnuo" DECIMAL(12, 2),
    
    -- Condizioni commerciali
    "listinoPrezzi" VARCHAR(50),
    "scontoPercentuale" DECIMAL(5, 2),
    "terminiPagamento" VARCHAR(50),
    "modalitaPagamento" VARCHAR(50),
    "iban" VARCHAR(34),
    
    -- Note
    "noteCommerciali" TEXT,
    "noteOperative" TEXT,
    "noteInterne" TEXT,
    
    -- Status
    "status" "company_profile_status" DEFAULT 'ACTIVE',
    "isActive" BOOLEAN DEFAULT true,
    "isPrimary" BOOLEAN DEFAULT false,
    
    -- Consenso condivisione GDPR
    "dataShareConsent" BOOLEAN DEFAULT false,
    "dataShareConsentDate" TIMESTAMP(6),
    "dataShareConsentBy" VARCHAR(36),
    
    -- Metadata
    "createdAt" TIMESTAMP(6) DEFAULT NOW(),
    "updatedAt" TIMESTAMP(6) DEFAULT NOW(),
    "deletedAt" TIMESTAMP(6),
    
    CONSTRAINT fk_ctp_company FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_ctp_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ctp_referente FOREIGN KEY ("referenteId") REFERENCES persons(id) ON DELETE SET NULL,
    CONSTRAINT uq_company_tenant UNIQUE ("companyId", "tenantId")
);

-- Indici CompanyTenantProfile
CREATE INDEX IF NOT EXISTS idx_ctp_company ON company_tenant_profiles("companyId");
CREATE INDEX IF NOT EXISTS idx_ctp_tenant ON company_tenant_profiles("tenantId");
CREATE INDEX IF NOT EXISTS idx_ctp_referente ON company_tenant_profiles("referenteId");
CREATE INDEX IF NOT EXISTS idx_ctp_status ON company_tenant_profiles("status");
CREATE INDEX IF NOT EXISTS idx_ctp_tenant_status ON company_tenant_profiles("tenantId", "status");
CREATE INDEX IF NOT EXISTS idx_ctp_deleted ON company_tenant_profiles("deletedAt");

-- ============================================
-- STEP 4: CREARE TABELLA CompanyDataShareConsent
-- ============================================

CREATE TABLE IF NOT EXISTS "company_data_share_consents" (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" VARCHAR(36) NOT NULL,
    
    -- Tenant coinvolti
    "sourceTenantId" VARCHAR(36) NOT NULL,
    "targetTenantId" VARCHAR(36) NOT NULL,
    
    -- Cosa è condiviso
    "sharedDataTypes" TEXT[] DEFAULT '{}',
    "excludedFields" TEXT[] DEFAULT '{}',
    
    -- Consenso
    "consentGiven" BOOLEAN DEFAULT false,
    "consentDate" TIMESTAMP(6),
    "consentGivenBy" VARCHAR(100),
    "consentMethod" "consent_method",
    "consentProof" VARCHAR(500),
    "legalBasis" VARCHAR(100),
    
    -- Validità
    "validFrom" TIMESTAMP(6) DEFAULT NOW(),
    "validUntil" TIMESTAMP(6),
    
    -- Revoca
    "isRevoked" BOOLEAN DEFAULT false,
    "revokedAt" TIMESTAMP(6),
    "revokedBy" VARCHAR(36),
    "revokedReason" VARCHAR(500),
    
    -- Audit
    "lastAccessedAt" TIMESTAMP(6),
    "accessCount" INT DEFAULT 0,
    
    -- Metadata
    "createdAt" TIMESTAMP(6) DEFAULT NOW(),
    "updatedAt" TIMESTAMP(6) DEFAULT NOW(),
    
    CONSTRAINT fk_cdsc_company FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_cdsc_source FOREIGN KEY ("sourceTenantId") REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_cdsc_target FOREIGN KEY ("targetTenantId") REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT uq_cdsc_consent UNIQUE ("companyId", "sourceTenantId", "targetTenantId")
);

-- Indici CompanyDataShareConsent
CREATE INDEX IF NOT EXISTS idx_cdsc_company ON company_data_share_consents("companyId");
CREATE INDEX IF NOT EXISTS idx_cdsc_source ON company_data_share_consents("sourceTenantId");
CREATE INDEX IF NOT EXISTS idx_cdsc_target ON company_data_share_consents("targetTenantId");
CREATE INDEX IF NOT EXISTS idx_cdsc_revoked ON company_data_share_consents("isRevoked");
CREATE INDEX IF NOT EXISTS idx_cdsc_valid ON company_data_share_consents("validUntil");

-- ============================================
-- STEP 5: MODIFICARE LA TABELLA CompanySites
-- ============================================

-- Aggiungere nuova FK a CompanyTenantProfile
ALTER TABLE "company_sites" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);

-- Aggiungere referenteId per sede
ALTER TABLE "company_sites" ADD COLUMN IF NOT EXISTS "referenteId" VARCHAR(36);

-- Aggiungere dvrDataAggiornamento
ALTER TABLE "company_sites" ADD COLUMN IF NOT EXISTS "dvrDataAggiornamento" DATE;

-- Aggiungere FK constraint (dopo la migrazione dei dati)
-- ALTER TABLE "company_sites" ADD CONSTRAINT fk_cs_ctp FOREIGN KEY ("companyTenantProfileId") REFERENCES company_tenant_profiles(id) ON DELETE CASCADE;
-- ALTER TABLE "company_sites" ADD CONSTRAINT fk_cs_referente FOREIGN KEY ("referenteId") REFERENCES persons(id) ON DELETE SET NULL;

-- Indici
CREATE INDEX IF NOT EXISTS idx_cs_ctp ON company_sites("companyTenantProfileId");
CREATE INDEX IF NOT EXISTS idx_cs_referente ON company_sites("referenteId");

-- ============================================
-- STEP 6: MODIFICARE PersonTenantProfile
-- ============================================

-- Cambiare companyId in companyTenantProfileId
ALTER TABLE "person_tenant_profiles" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);

-- Indice
CREATE INDEX IF NOT EXISTS idx_ptp_ctp ON person_tenant_profiles("companyTenantProfileId");
CREATE INDEX IF NOT EXISTS idx_ptp_tenant_ctp ON person_tenant_profiles("tenantId", "companyTenantProfileId");

-- ============================================
-- STEP 7: MODIFICARE CourseSchedule
-- ============================================

ALTER TABLE "course_schedules" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_schedule_ctp ON course_schedules("companyTenantProfileId");
CREATE INDEX IF NOT EXISTS idx_schedule_ctp_start ON course_schedules("companyTenantProfileId", "startDate");

-- ============================================
-- STEP 8: MODIFICARE ScheduleCompany
-- ============================================

ALTER TABLE "schedule_companies" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_sc_ctp ON schedule_companies("companyTenantProfileId");

-- ============================================
-- STEP 9: MODIFICARE TemplateLink
-- ============================================

ALTER TABLE "template_links" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_tl_ctp ON template_links("companyTenantProfileId");

-- ============================================
-- STEP 10: MODIFICARE Preventivo
-- ============================================

ALTER TABLE "preventivi" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_prev_ctp ON preventivi("companyTenantProfileId");

-- ============================================
-- STEP 11: MODIFICARE FatturaAzienda
-- ============================================

ALTER TABLE "fattura_aziende" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_fa_ctp ON fattura_aziende("companyTenantProfileId");

-- ============================================
-- STEP 12: MODIFICARE CodiceAzienda
-- ============================================

ALTER TABLE "codici_aziende" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_ca_ctp ON codici_aziende("companyTenantProfileId");

-- ============================================
-- STEP 13: MODIFICARE PersonRole
-- ============================================

ALTER TABLE "person_roles" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_pr_ctp ON person_roles("companyTenantProfileId");
CREATE INDEX IF NOT EXISTS idx_pr_ctp_role_active ON person_roles("companyTenantProfileId", "roleType", "isActive");

-- ============================================
-- STEP 14: MODIFICARE TariffarioAziendale
-- ============================================

ALTER TABLE "tariffari_aziendali" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_ta_ctp ON tariffari_aziendali("companyTenantProfileId");
CREATE INDEX IF NOT EXISTS idx_ta_tenant_ctp_attivo ON tariffari_aziendali("tenantId", "companyTenantProfileId", "attivo");

-- ============================================
-- STEP 15: MODIFICARE ConvenzioneAzienda
-- ============================================

ALTER TABLE "convenzione_aziende" ADD COLUMN IF NOT EXISTS "companyTenantProfileId" VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_conv_ctp ON convenzione_aziende("companyTenantProfileId");

-- ============================================
-- DATA MIGRATION - Eseguire DOPO le modifiche strutturali
-- ============================================
-- La data migration sarà in uno script separato per:
-- 1. Creare CompanyTenantProfile per ogni Company esistente
-- 2. Popolare companyTenantProfileId nelle tabelle modificate
-- 3. Rimuovere le vecchie colonne companyId/aziendaId

-- ============================================
-- NOTA: Le FK constraint verranno aggiunte DOPO la data migration
-- tramite script separato per garantire l'integrità referenziale
-- ============================================
