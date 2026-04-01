-- ============================================
-- PROGETTO 49 - DATA MIGRATION SCRIPT
-- ============================================
-- Eseguire DOPO migration.sql
-- Questo script migra i dati dalle vecchie strutture alle nuove
-- ============================================

-- ============================================
-- STEP 1: Creare CompanyTenantProfile per ogni Company esistente
-- ============================================

INSERT INTO company_tenant_profiles (
    id,
    "companyId",
    "tenantId",
    "emailGenerale",
    "telefonoGenerale",
    "status",
    "isActive",
    "isPrimary",
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid()::text,
    c.id,
    c."tenantId",
    c.mail,
    c.telefono,
    'ACTIVE'::"company_profile_status",
    COALESCE(c."isActive", true),
    true,
    COALESCE(c."createdAt", NOW()),
    NOW()
FROM companies c
WHERE c."tenantId" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM company_tenant_profiles ctp 
      WHERE ctp."companyId" = c.id AND ctp."tenantId" = c."tenantId"
  );

-- ============================================
-- STEP 2: Aggiornare CompanySites
-- ============================================

UPDATE company_sites cs
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE cs."companyId" = ctp."companyId"
  AND cs."tenantId" = ctp."tenantId"
  AND cs."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 3: Aggiornare PersonTenantProfile
-- ============================================

UPDATE person_tenant_profiles ptp
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE ptp."companyId" = ctp."companyId"
  AND ptp."tenantId" = ctp."tenantId"
  AND ptp."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 4: Aggiornare CourseSchedule
-- ============================================

UPDATE course_schedules sch
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE sch."companyId" = ctp."companyId"
  AND sch."tenantId" = ctp."tenantId"
  AND sch."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 5: Aggiornare ScheduleCompany
-- ============================================

UPDATE schedule_companies sc
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE sc."companyId" = ctp."companyId"
  AND sc."tenantId" = ctp."tenantId"
  AND sc."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 6: Aggiornare TemplateLink
-- ============================================

UPDATE template_links tl
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE tl."companyId" = ctp."companyId"
  AND tl."tenantId" = ctp."tenantId"
  AND tl."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 7: Aggiornare Preventivo
-- ============================================

UPDATE preventivi p
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE p."aziendaId" = ctp."companyId"
  AND p."tenantId" = ctp."tenantId"
  AND p."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 8: Aggiornare FatturaAzienda
-- ============================================

UPDATE fattura_aziende fa
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE fa."aziendaId" = ctp."companyId"
  AND fa."tenantId" = ctp."tenantId"
  AND fa."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 9: Aggiornare CodiceAzienda
-- ============================================

UPDATE codici_aziende ca
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE ca."aziendaId" = ctp."companyId"
  AND ca."tenantId" = ctp."tenantId"
  AND ca."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 10: Aggiornare PersonRole
-- ============================================

UPDATE person_roles pr
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE pr."companyId" = ctp."companyId"
  AND pr."tenantId" = ctp."tenantId"
  AND pr."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 11: Aggiornare TariffarioAziendale
-- ============================================

UPDATE tariffari_aziendali ta
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE ta."companyId" = ctp."companyId"
  AND ta."tenantId" = ctp."tenantId"
  AND ta."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 12: Aggiornare ConvenzioneAzienda
-- ============================================

UPDATE convenzione_aziende conv
SET "companyTenantProfileId" = ctp.id
FROM company_tenant_profiles ctp
WHERE conv."aziendaId" = ctp."companyId"
  AND conv."tenantId" = ctp."tenantId"
  AND conv."companyTenantProfileId" IS NULL;

-- ============================================
-- STEP 13: Aggiungere FK Constraints
-- ============================================

-- CompanySites
ALTER TABLE "company_sites" 
DROP CONSTRAINT IF EXISTS fk_cs_ctp;
ALTER TABLE "company_sites" 
ADD CONSTRAINT fk_cs_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE CASCADE;

ALTER TABLE "company_sites" 
DROP CONSTRAINT IF EXISTS fk_cs_referente;
ALTER TABLE "company_sites" 
ADD CONSTRAINT fk_cs_referente FOREIGN KEY ("referenteId") 
REFERENCES persons(id) ON DELETE SET NULL;

-- PersonTenantProfile -> CompanyTenantProfile
ALTER TABLE "person_tenant_profiles" 
DROP CONSTRAINT IF EXISTS fk_ptp_ctp;
ALTER TABLE "person_tenant_profiles" 
ADD CONSTRAINT fk_ptp_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE SET NULL;

-- CourseSchedule -> CompanyTenantProfile
ALTER TABLE "course_schedules" 
DROP CONSTRAINT IF EXISTS fk_sch_ctp;
ALTER TABLE "course_schedules" 
ADD CONSTRAINT fk_sch_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE SET NULL;

-- ScheduleCompany -> CompanyTenantProfile
ALTER TABLE "schedule_companies" 
DROP CONSTRAINT IF EXISTS fk_sc_ctp;
ALTER TABLE "schedule_companies" 
ADD CONSTRAINT fk_sc_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE CASCADE;

-- TemplateLink -> CompanyTenantProfile
ALTER TABLE "template_links" 
DROP CONSTRAINT IF EXISTS fk_tl_ctp;
ALTER TABLE "template_links" 
ADD CONSTRAINT fk_tl_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE SET NULL;

-- Preventivo -> CompanyTenantProfile
ALTER TABLE "preventivi" 
DROP CONSTRAINT IF EXISTS fk_prev_ctp;
ALTER TABLE "preventivi" 
ADD CONSTRAINT fk_prev_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE SET NULL;

-- FatturaAzienda -> CompanyTenantProfile
ALTER TABLE "fattura_aziende" 
DROP CONSTRAINT IF EXISTS fk_fa_ctp;
ALTER TABLE "fattura_aziende" 
ADD CONSTRAINT fk_fa_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE CASCADE;

-- CodiceAzienda -> CompanyTenantProfile
ALTER TABLE "codici_aziende" 
DROP CONSTRAINT IF EXISTS fk_ca_ctp;
ALTER TABLE "codici_aziende" 
ADD CONSTRAINT fk_ca_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE CASCADE;

-- PersonRole -> CompanyTenantProfile
ALTER TABLE "person_roles" 
DROP CONSTRAINT IF EXISTS fk_pr_ctp;
ALTER TABLE "person_roles" 
ADD CONSTRAINT fk_pr_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE SET NULL;

-- TariffarioAziendale -> CompanyTenantProfile
ALTER TABLE "tariffari_aziendali" 
DROP CONSTRAINT IF EXISTS fk_ta_ctp;
ALTER TABLE "tariffari_aziendali" 
ADD CONSTRAINT fk_ta_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE CASCADE;

-- ConvenzioneAzienda -> CompanyTenantProfile
ALTER TABLE "convenzione_aziende" 
DROP CONSTRAINT IF EXISTS fk_conv_ctp;
ALTER TABLE "convenzione_aziende" 
ADD CONSTRAINT fk_conv_ctp FOREIGN KEY ("companyTenantProfileId") 
REFERENCES company_tenant_profiles(id) ON DELETE CASCADE;

-- ============================================
-- STEP 14: Verifiche
-- ============================================

-- Conteggio record migrati
SELECT 'company_tenant_profiles' as table_name, COUNT(*) as count FROM company_tenant_profiles
UNION ALL
SELECT 'company_sites con CTP', COUNT(*) FROM company_sites WHERE "companyTenantProfileId" IS NOT NULL
UNION ALL
SELECT 'person_tenant_profiles con CTP', COUNT(*) FROM person_tenant_profiles WHERE "companyTenantProfileId" IS NOT NULL
UNION ALL
SELECT 'course_schedules con CTP', COUNT(*) FROM course_schedules WHERE "companyTenantProfileId" IS NOT NULL
UNION ALL
SELECT 'preventivi con CTP', COUNT(*) FROM preventivi WHERE "companyTenantProfileId" IS NOT NULL;

-- ============================================
-- NOTA: Le vecchie colonne (companyId, aziendaId) verranno rimosse
-- in una migrazione successiva dopo aver verificato che tutto funziona
-- ============================================
