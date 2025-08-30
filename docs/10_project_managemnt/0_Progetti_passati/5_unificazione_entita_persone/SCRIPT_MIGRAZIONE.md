# Script di Migrazione: Unificazione Entità Persone

## 🎯 Obiettivo

Fornire script SQL e procedure dettagliate per la migrazione sicura dei dati dalle entità `Employee`, `Trainer` e `User` all'entità `Person` unificata, garantendo integrità dei dati e conformità GDPR.

## 📋 Prerequisiti

### Ambiente
- [ ] **Database backup** completo creato
- [ ] **Ambiente di test** configurato
- [ ] **Prisma CLI** aggiornato all'ultima versione
- [ ] **Node.js** versione compatibile
- [ ] **Spazio disco** sufficiente (almeno 2x dimensione DB)

### Verifiche Pre-Migrazione
```sql
-- Verifica integrità dati esistenti
SELECT 
  'Employee' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(*) - COUNT(email) as null_emails
FROM "Employee"
UNION ALL
SELECT 
  'Trainer' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(*) - COUNT(email) as null_emails
FROM "Trainer"
UNION ALL
SELECT 
  'User' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(*) - COUNT(email) as null_emails
FROM "User";

-- Verifica duplicati email cross-table
WITH all_emails AS (
  SELECT email, 'Employee' as source FROM "Employee" WHERE email IS NOT NULL
  UNION ALL
  SELECT email, 'Trainer' as source FROM "Trainer" WHERE email IS NOT NULL
  UNION ALL
  SELECT email, 'User' as source FROM "User" WHERE email IS NOT NULL
)
SELECT 
  email,
  COUNT(*) as occurrences,
  STRING_AGG(source, ', ') as sources
FROM all_emails
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;
```

## 🗂️ Struttura Migrazione

### Fasi di Migrazione
1. **Preparazione** - Backup e validazione
2. **Schema Update** - Creazione nuove tabelle
3. **Data Migration** - Migrazione dati con deduplicazione
4. **Relationship Update** - Aggiornamento relazioni
5. **Validation** - Verifica integrità
6. **Cleanup** - Rimozione tabelle obsolete

## 📝 Script Prisma Schema

### 1. Nuovo Schema Person

```prisma
// File: prisma/migrations/001_create_person_unified/migration.sql

-- CreateEnum per PersonType
CREATE TYPE "PersonType" AS ENUM ('EMPLOYEE', 'TRAINER', 'USER', 'HYBRID');

-- CreateEnum per RoleType
CREATE TYPE "RoleType" AS ENUM (
  'ADMIN',
  'HR_MANAGER', 
  'EMPLOYEE',
  'TRAINER_INTERNAL',
  'TRAINER_EXTERNAL',
  'COURSE_MANAGER',
  'STUDENT',
  'VIEWER'
);

-- CreateTable Person
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    
    -- Campi Base
    "personType" "PersonType" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    
    -- Dati Anagrafici
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "taxCode" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "gender" TEXT,
    
    -- Indirizzo Residenza
    "residenceAddress" TEXT,
    "residenceCity" TEXT,
    "postalCode" TEXT,
    "province" TEXT,
    "country" TEXT DEFAULT 'IT',
    
    -- Indirizzo Domicilio (se diverso)
    "domicileAddress" TEXT,
    "domicileCity" TEXT,
    "domicilePostalCode" TEXT,
    "domicileProvince" TEXT,
    "domicileCountry" TEXT,
    
    -- Dati Professionali
    "jobTitle" TEXT,
    "department" TEXT,
    "employeeCode" TEXT,
    "hireDate" TIMESTAMP(3),
    "contractType" TEXT,
    "workLocation" TEXT,
    "manager" TEXT,
    "salary" DECIMAL(10,2),
    "hourlyRate" DECIMAL(8,2),
    
    -- Dati Formatore
    "trainerType" TEXT, -- 'INTERNAL', 'EXTERNAL', 'CONSULTANT'
    "specializations" TEXT[], -- Array di specializzazioni
    "certifications" TEXT[], -- Array di certificazioni
    "experience" TEXT,
    "iban" TEXT, -- Per pagamenti formatori esterni
    "vatNumber" TEXT,
    "invoiceAddress" TEXT,
    "invoiceCity" TEXT,
    "invoicePostalCode" TEXT,
    "invoiceProvince" TEXT,
    
    -- Dati Autenticazione
    "username" TEXT,
    "password" TEXT,
    "emailVerified" BOOLEAN DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "loginAttempts" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    
    -- Preferenze e Configurazione
    "language" TEXT DEFAULT 'it',
    "timezone" TEXT DEFAULT 'Europe/Rome',
    "profileImage" TEXT,
    "preferences" JSONB,
    "notes" TEXT,
    
    -- Campi Sistema
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    
    -- Campi GDPR
    "gdprConsent" BOOLEAN DEFAULT false,
    "gdprConsentDate" TIMESTAMP(3),
    "marketingConsent" BOOLEAN DEFAULT false,
    "dataRetentionDate" TIMESTAMP(3),
    
    -- Campi Migrazione
    "migratedFrom" TEXT, -- 'EMPLOYEE', 'TRAINER', 'USER'
    "originalId" TEXT, -- ID originale per tracciabilità
    "migrationDate" TIMESTAMP(3),
    "migrationNotes" TEXT,
    
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable PersonRole
CREATE TABLE "PersonRole" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "roleType" "RoleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "notes" TEXT,
    
    -- Configurazione ruolo specifica
    "roleConfig" JSONB, -- Configurazioni specifiche per ruolo
    "permissions" TEXT[], -- Permessi aggiuntivi
    "restrictions" TEXT[], -- Restrizioni specifiche
    
    CONSTRAINT "PersonRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable MigrationLog
CREATE TABLE "MigrationLog" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "sourceTable" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetTable" TEXT NOT NULL,
    "targetId" TEXT,
    "status" TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'SKIPPED'
    "errorMessage" TEXT,
    "dataSnapshot" JSONB,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedBy" TEXT,
    
    CONSTRAINT "MigrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_tenantId_key" ON "Person"("email", "tenantId");
CREATE UNIQUE INDEX "Person_username_tenantId_key" ON "Person"("username", "tenantId");
CREATE UNIQUE INDEX "Person_taxCode_tenantId_key" ON "Person"("taxCode", "tenantId");
CREATE UNIQUE INDEX "Person_employeeCode_tenantId_key" ON "Person"("employeeCode", "tenantId");
CREATE INDEX "Person_tenantId_idx" ON "Person"("tenantId");
CREATE INDEX "Person_personType_idx" ON "Person"("personType");
CREATE INDEX "Person_isActive_idx" ON "Person"("isActive");
CREATE INDEX "Person_isDeleted_idx" ON "Person"("isDeleted");
CREATE INDEX "Person_migratedFrom_idx" ON "Person"("migratedFrom");
CREATE INDEX "Person_originalId_idx" ON "Person"("originalId");

CREATE INDEX "PersonRole_personId_idx" ON "PersonRole"("personId");
CREATE INDEX "PersonRole_roleType_idx" ON "PersonRole"("roleType");
CREATE INDEX "PersonRole_isActive_idx" ON "PersonRole"("isActive");
CREATE UNIQUE INDEX "PersonRole_personId_roleType_key" ON "PersonRole"("personId", "roleType");

CREATE INDEX "MigrationLog_sourceTable_sourceId_idx" ON "MigrationLog"("sourceTable", "sourceId");
CREATE INDEX "MigrationLog_targetTable_targetId_idx" ON "MigrationLog"("targetTable", "targetId");
CREATE INDEX "MigrationLog_status_idx" ON "MigrationLog"("status");
CREATE INDEX "MigrationLog_executedAt_idx" ON "MigrationLog"("executedAt");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonRole" ADD CONSTRAINT "PersonRole_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## 🔄 Script di Migrazione Dati

### 2. Funzioni di Supporto

```sql
-- Funzione per generare ID univoci
CREATE OR REPLACE FUNCTION generate_person_id()
RETURNS TEXT AS $$
BEGIN
    RETURN 'person_' || LOWER(REPLACE(gen_random_uuid()::text, '-', ''));
END;
$$ LANGUAGE plpgsql;

-- Funzione per normalizzare email
CREATE OR REPLACE FUNCTION normalize_email(email_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF email_input IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN LOWER(TRIM(email_input));
END;
$$ LANGUAGE plpgsql;

-- Funzione per determinare PersonType
CREATE OR REPLACE FUNCTION determine_person_type(
    is_employee BOOLEAN,
    is_trainer BOOLEAN,
    is_user BOOLEAN
)
RETURNS "PersonType" AS $$
BEGIN
    IF (is_employee::int + is_trainer::int + is_user::int) > 1 THEN
        RETURN 'HYBRID';
    ELSIF is_employee THEN
        RETURN 'EMPLOYEE';
    ELSIF is_trainer THEN
        RETURN 'TRAINER';
    ELSE
        RETURN 'USER';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Funzione per logging migrazione
CREATE OR REPLACE FUNCTION log_migration(
    p_operation TEXT,
    p_source_table TEXT,
    p_source_id TEXT,
    p_target_table TEXT,
    p_target_id TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'SUCCESS',
    p_error_message TEXT DEFAULT NULL,
    p_data_snapshot JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO "MigrationLog" (
        "id",
        "operation",
        "sourceTable",
        "sourceId",
        "targetTable",
        "targetId",
        "status",
        "errorMessage",
        "dataSnapshot",
        "executedBy"
    ) VALUES (
        'log_' || LOWER(REPLACE(gen_random_uuid()::text, '-', '')),
        p_operation,
        p_source_table,
        p_source_id,
        p_target_table,
        p_target_id,
        p_status,
        p_error_message,
        p_data_snapshot,
        'migration_script'
    );
END;
$$ LANGUAGE plpgsql;
```

### 3. Migrazione Dati - Fase 1: Preparazione

```sql
-- Creazione tabella temporanea per mapping email
CREATE TEMP TABLE email_mapping AS
WITH all_emails AS (
    SELECT 
        normalize_email(email) as email,
        'Employee' as source_type,
        id as source_id,
        "tenantId",
        ROW_NUMBER() OVER (PARTITION BY normalize_email(email), "tenantId" ORDER BY "createdAt") as rn
    FROM "Employee" 
    WHERE email IS NOT NULL
    
    UNION ALL
    
    SELECT 
        normalize_email(email) as email,
        'Trainer' as source_type,
        id as source_id,
        "tenantId",
        ROW_NUMBER() OVER (PARTITION BY normalize_email(email), "tenantId" ORDER BY "createdAt") as rn
    FROM "Trainer" 
    WHERE email IS NOT NULL
    
    UNION ALL
    
    SELECT 
        normalize_email(email) as email,
        'User' as source_type,
        id as source_id,
        "tenantId",
        ROW_NUMBER() OVER (PARTITION BY normalize_email(email), "tenantId" ORDER BY "createdAt") as rn
    FROM "User" 
    WHERE email IS NOT NULL
),
email_groups AS (
    SELECT 
        email,
        "tenantId",
        generate_person_id() as person_id,
        ARRAY_AGG(source_type ORDER BY rn) as source_types,
        ARRAY_AGG(source_id ORDER BY rn) as source_ids
    FROM all_emails
    GROUP BY email, "tenantId"
)
SELECT 
    email,
    "tenantId",
    person_id,
    source_types,
    source_ids,
    determine_person_type(
        'Employee' = ANY(source_types),
        'Trainer' = ANY(source_types),
        'User' = ANY(source_types)
    ) as person_type
FROM email_groups;

-- Verifica mapping
SELECT 
    person_type,
    COUNT(*) as count,
    COUNT(CASE WHEN array_length(source_types, 1) > 1 THEN 1 END) as duplicates
FROM email_mapping
GROUP BY person_type;
```

### 4. Migrazione Dati - Fase 2: Inserimento Person

```sql
-- Migrazione Employee -> Person
INSERT INTO "Person" (
    "id",
    "tenantId",
    "personType",
    "firstName",
    "lastName",
    "email",
    "phone",
    "taxCode",
    "birthDate",
    "birthPlace",
    "residenceAddress",
    "residenceCity",
    "postalCode",
    "province",
    "jobTitle",
    "department",
    "employeeCode",
    "hireDate",
    "contractType",
    "workLocation",
    "manager",
    "salary",
    "notes",
    "createdAt",
    "updatedAt",
    "migratedFrom",
    "originalId",
    "migrationDate",
    "migrationNotes"
)
SELECT 
    em.person_id,
    e."tenantId",
    em.person_type,
    e."firstName",
    e."lastName",
    normalize_email(e.email),
    e.phone,
    e."taxCode",
    e."birthDate",
    e."birthPlace",
    e.address,
    e.city,
    e."postalCode",
    e.province,
    e."jobTitle",
    e.department,
    e."employeeCode",
    e."hireDate",
    e."contractType",
    e."workLocation",
    e.manager,
    e.salary,
    e.notes,
    e."createdAt",
    e."updatedAt",
    'EMPLOYEE',
    e.id,
    CURRENT_TIMESTAMP,
    'Migrated from Employee table'
FROM "Employee" e
JOIN email_mapping em ON normalize_email(e.email) = em.email 
    AND e."tenantId" = em."tenantId"
    AND e.id = em.source_ids[1] -- Solo il primo record per email
ON CONFLICT ("email", "tenantId") DO NOTHING;

-- Log migrazione Employee
INSERT INTO "MigrationLog" (
    "id",
    "operation",
    "sourceTable",
    "sourceId",
    "targetTable",
    "targetId",
    "status",
    "dataSnapshot"
)
SELECT 
    'log_' || LOWER(REPLACE(gen_random_uuid()::text, '-', '')),
    'MIGRATE_EMPLOYEE',
    'Employee',
    e.id,
    'Person',
    em.person_id,
    'SUCCESS',
    jsonb_build_object(
        'originalData', row_to_json(e),
        'personType', em.person_type,
        'isDuplicate', array_length(em.source_types, 1) > 1
    )
FROM "Employee" e
JOIN email_mapping em ON normalize_email(e.email) = em.email 
    AND e."tenantId" = em."tenantId"
    AND e.id = em.source_ids[1];

-- Aggiornamento dati Trainer per Person esistenti
UPDATE "Person" p
SET 
    "trainerType" = CASE 
        WHEN t."isInternal" THEN 'INTERNAL'
        ELSE 'EXTERNAL'
    END,
    "specializations" = CASE 
        WHEN t.specializations IS NOT NULL THEN 
            string_to_array(t.specializations, ',')
        ELSE NULL
    END,
    "certifications" = CASE 
        WHEN t.certifications IS NOT NULL THEN 
            string_to_array(t.certifications, ',')
        ELSE NULL
    END,
    "experience" = t.experience,
    "iban" = t.iban,
    "vatNumber" = t."vatNumber",
    "hourlyRate" = t."hourlyRate",
    "updatedAt" = CURRENT_TIMESTAMP,
    "migrationNotes" = COALESCE(p."migrationNotes", '') || '; Updated with Trainer data'
FROM "Trainer" t
JOIN email_mapping em ON normalize_email(t.email) = em.email 
    AND t."tenantId" = em."tenantId"
    AND t.id = ANY(em.source_ids)
WHERE p.id = em.person_id;

-- Inserimento nuovi Trainer (non già migrati come Employee)
INSERT INTO "Person" (
    "id",
    "tenantId",
    "personType",
    "firstName",
    "lastName",
    "email",
    "phone",
    "taxCode",
    "trainerType",
    "specializations",
    "certifications",
    "experience",
    "iban",
    "vatNumber",
    "hourlyRate",
    "notes",
    "createdAt",
    "updatedAt",
    "migratedFrom",
    "originalId",
    "migrationDate",
    "migrationNotes"
)
SELECT 
    em.person_id,
    t."tenantId",
    em.person_type,
    t."firstName",
    t."lastName",
    normalize_email(t.email),
    t.phone,
    t."taxCode",
    CASE WHEN t."isInternal" THEN 'INTERNAL' ELSE 'EXTERNAL' END,
    CASE 
        WHEN t.specializations IS NOT NULL THEN 
            string_to_array(t.specializations, ',')
        ELSE NULL
    END,
    CASE 
        WHEN t.certifications IS NOT NULL THEN 
            string_to_array(t.certifications, ',')
        ELSE NULL
    END,
    t.experience,
    t.iban,
    t."vatNumber",
    t."hourlyRate",
    t.notes,
    t."createdAt",
    t."updatedAt",
    'TRAINER',
    t.id,
    CURRENT_TIMESTAMP,
    'Migrated from Trainer table'
FROM "Trainer" t
JOIN email_mapping em ON normalize_email(t.email) = em.email 
    AND t."tenantId" = em."tenantId"
    AND t.id = em.source_ids[1]
WHERE NOT EXISTS (
    SELECT 1 FROM "Person" p 
    WHERE p."email" = normalize_email(t.email) 
    AND p."tenantId" = t."tenantId"
)
ON CONFLICT ("email", "tenantId") DO NOTHING;

-- Aggiornamento dati User per Person esistenti
UPDATE "Person" p
SET 
    "username" = u.username,
    "password" = u.password,
    "emailVerified" = u."emailVerified",
    "lastLogin" = u."lastLogin",
    "language" = u.language,
    "profileImage" = u."profileImage",
    "preferences" = u.preferences,
    "gdprConsent" = u."gdprConsent",
    "gdprConsentDate" = u."gdprConsentDate",
    "updatedAt" = CURRENT_TIMESTAMP,
    "migrationNotes" = COALESCE(p."migrationNotes", '') || '; Updated with User data'
FROM "User" u
JOIN email_mapping em ON normalize_email(u.email) = em.email 
    AND u."tenantId" = em."tenantId"
    AND u.id = ANY(em.source_ids)
WHERE p.id = em.person_id;

-- Inserimento nuovi User (non già migrati)
INSERT INTO "Person" (
    "id",
    "tenantId",
    "personType",
    "firstName",
    "lastName",
    "email",
    "phone",
    "username",
    "password",
    "emailVerified",
    "lastLogin",
    "language",
    "profileImage",
    "preferences",
    "gdprConsent",
    "gdprConsentDate",
    "notes",
    "createdAt",
    "updatedAt",
    "migratedFrom",
    "originalId",
    "migrationDate",
    "migrationNotes"
)
SELECT 
    em.person_id,
    u."tenantId",
    em.person_type,
    COALESCE(u."firstName", 'Unknown'),
    COALESCE(u."lastName", 'User'),
    normalize_email(u.email),
    u.phone,
    u.username,
    u.password,
    u."emailVerified",
    u."lastLogin",
    u.language,
    u."profileImage",
    u.preferences,
    u."gdprConsent",
    u."gdprConsentDate",
    u.notes,
    u."createdAt",
    u."updatedAt",
    'USER',
    u.id,
    CURRENT_TIMESTAMP,
    'Migrated from User table'
FROM "User" u
JOIN email_mapping em ON normalize_email(u.email) = em.email 
    AND u."tenantId" = em."tenantId"
    AND u.id = em.source_ids[1]
WHERE NOT EXISTS (
    SELECT 1 FROM "Person" p 
    WHERE p."email" = normalize_email(u.email) 
    AND p."tenantId" = u."tenantId"
)
ON CONFLICT ("email", "tenantId") DO NOTHING;
```

### 5. Migrazione Ruoli

```sql
-- Creazione ruoli base per Employee
INSERT INTO "PersonRole" (
    "id",
    "personId",
    "roleType",
    "isActive",
    "assignedAt",
    "assignedBy",
    "notes",
    "roleConfig"
)
SELECT 
    'role_' || LOWER(REPLACE(gen_random_uuid()::text, '-', '')),
    p.id,
    'EMPLOYEE',
    p."isActive",
    p."createdAt",
    'migration_script',
    'Auto-assigned during migration from Employee',
    jsonb_build_object(
        'department', p.department,
        'jobTitle', p."jobTitle",
        'employeeCode', p."employeeCode",
        'manager', p.manager
    )
FROM "Person" p
WHERE p."migratedFrom" = 'EMPLOYEE' OR p."personType" IN ('EMPLOYEE', 'HYBRID');

-- Creazione ruoli per Trainer
INSERT INTO "PersonRole" (
    "id",
    "personId",
    "roleType",
    "isActive",
    "assignedAt",
    "assignedBy",
    "notes",
    "roleConfig"
)
SELECT 
    'role_' || LOWER(REPLACE(gen_random_uuid()::text, '-', '')),
    p.id,
    CASE 
        WHEN p."trainerType" = 'INTERNAL' THEN 'TRAINER_INTERNAL'
        ELSE 'TRAINER_EXTERNAL'
    END,
    p."isActive",
    p."createdAt",
    'migration_script',
    'Auto-assigned during migration from Trainer',
    jsonb_build_object(
        'trainerType', p."trainerType",
        'specializations', p.specializations,
        'certifications', p.certifications,
        'hourlyRate', p."hourlyRate"
    )
FROM "Person" p
WHERE (p."migratedFrom" = 'TRAINER' OR p."personType" IN ('TRAINER', 'HYBRID'))
AND p."trainerType" IS NOT NULL;

-- Migrazione ruoli User esistenti
INSERT INTO "PersonRole" (
    "id",
    "personId",
    "roleType",
    "isActive",
    "assignedAt",
    "assignedBy",
    "notes",
    "roleConfig"
)
SELECT 
    'role_' || LOWER(REPLACE(gen_random_uuid()::text, '-', '')),
    p.id,
    CASE 
        WHEN ur."roleId" IN (SELECT id FROM "Role" WHERE name = 'admin') THEN 'ADMIN'
        WHEN ur."roleId" IN (SELECT id FROM "Role" WHERE name ILIKE '%hr%') THEN 'HR_MANAGER'
        WHEN ur."roleId" IN (SELECT id FROM "Role" WHERE name ILIKE '%course%') THEN 'COURSE_MANAGER'
        ELSE 'VIEWER'
    END,
    ur."isActive",
    ur."assignedAt",
    'migration_script',
    'Migrated from UserRole',
    jsonb_build_object(
        'originalRoleId', ur."roleId",
        'originalRoleName', r.name
    )
FROM "Person" p
JOIN "User" u ON u.email = p.email AND u."tenantId" = p."tenantId"
JOIN "UserRole" ur ON ur."userId" = u.id
JOIN "Role" r ON r.id = ur."roleId"
WHERE p."migratedFrom" IN ('USER', 'HYBRID')
ON CONFLICT ("personId", "roleType") DO NOTHING;
```

### 6. Aggiornamento Relazioni

```sql
-- Aggiornamento CourseEnrollment
ALTER TABLE "CourseEnrollment" ADD COLUMN "personId" TEXT;

-- Migrazione relazioni Employee -> Person
UPDATE "CourseEnrollment" ce
SET "personId" = p.id
FROM "Person" p
WHERE p."originalId" = ce."employeeId"
AND p."migratedFrom" = 'EMPLOYEE';

-- Aggiornamento Course (trainer)
ALTER TABLE "Course" ADD COLUMN "trainerPersonId" TEXT;

UPDATE "Course" c
SET "trainerPersonId" = p.id
FROM "Person" p
WHERE p."originalId" = c."trainerId"
AND p."migratedFrom" IN ('TRAINER', 'HYBRID');

-- Aggiornamento Attestato
ALTER TABLE "Attestato" ADD COLUMN "personId" TEXT;

UPDATE "Attestato" a
SET "personId" = p.id
FROM "Person" p
WHERE p."originalId" = a."employeeId"
AND p."migratedFrom" IN ('EMPLOYEE', 'HYBRID');

-- Aggiornamento RegistroPresenze
ALTER TABLE "RegistroPresenzePartecipante" ADD COLUMN "personId" TEXT;

UPDATE "RegistroPresenzePartecipante" rpp
SET "personId" = p.id
FROM "Person" p
WHERE p."originalId" = rpp."employeeId"
AND p."migratedFrom" IN ('EMPLOYEE', 'HYBRID');

-- Aggiornamento ActivityLog
ALTER TABLE "ActivityLog" ADD COLUMN "performedByPersonId" TEXT;

UPDATE "ActivityLog" al
SET "performedByPersonId" = p.id
FROM "Person" p
WHERE p."originalId" = al."performedBy"
AND p."migratedFrom" = 'USER';

-- Aggiornamento RefreshToken
ALTER TABLE "RefreshToken" ADD COLUMN "personId" TEXT;

UPDATE "RefreshToken" rt
SET "personId" = p.id
FROM "Person" p
WHERE p."originalId" = rt."userId"
AND p."migratedFrom" = 'USER';

-- Aggiornamento UserSession
ALTER TABLE "UserSession" ADD COLUMN "personId" TEXT;

UPDATE "UserSession" us
SET "personId" = p.id
FROM "Person" p
WHERE p."originalId" = us."userId"
AND p."migratedFrom" = 'USER';
```

## ✅ Script di Validazione

### 7. Verifica Integrità Post-Migrazione

```sql
-- Verifica conteggi
SELECT 
    'Migration Summary' as check_type,
    (
        SELECT COUNT(*) FROM "Employee"
    ) as original_employees,
    (
        SELECT COUNT(*) FROM "Trainer"
    ) as original_trainers,
    (
        SELECT COUNT(*) FROM "User"
    ) as original_users,
    (
        SELECT COUNT(*) FROM "Person"
    ) as migrated_persons,
    (
        SELECT COUNT(*) FROM "PersonRole"
    ) as total_roles;

-- Verifica duplicati email
SELECT 
    'Email Duplicates' as check_type,
    email,
    "tenantId",
    COUNT(*) as occurrences
FROM "Person"
GROUP BY email, "tenantId"
HAVING COUNT(*) > 1;

-- Verifica relazioni orfane
SELECT 
    'Orphaned Relations' as check_type,
    'CourseEnrollment' as table_name,
    COUNT(*) as orphaned_records
FROM "CourseEnrollment" ce
WHERE ce."personId" IS NULL
AND ce."employeeId" IS NOT NULL

UNION ALL

SELECT 
    'Orphaned Relations',
    'Course',
    COUNT(*)
FROM "Course" c
WHERE c."trainerPersonId" IS NULL
AND c."trainerId" IS NOT NULL

UNION ALL

SELECT 
    'Orphaned Relations',
    'Attestato',
    COUNT(*)
FROM "Attestato" a
WHERE a."personId" IS NULL
AND a."employeeId" IS NOT NULL;

-- Verifica integrità dati critici
SELECT 
    'Data Integrity' as check_type,
    'Missing Email' as issue,
    COUNT(*) as count
FROM "Person"
WHERE email IS NULL OR email = ''

UNION ALL

SELECT 
    'Data Integrity',
    'Missing Names',
    COUNT(*)
FROM "Person"
WHERE "firstName" IS NULL OR "firstName" = '' 
OR "lastName" IS NULL OR "lastName" = ''

UNION ALL

SELECT 
    'Data Integrity',
    'Invalid PersonType',
    COUNT(*)
FROM "Person"
WHERE "personType" NOT IN ('EMPLOYEE', 'TRAINER', 'USER', 'HYBRID');

-- Verifica migrazione log
SELECT 
    'Migration Status' as check_type,
    "sourceTable",
    status,
    COUNT(*) as count
FROM "MigrationLog"
GROUP BY "sourceTable", status
ORDER BY "sourceTable", status;

-- Verifica ruoli assegnati
SELECT 
    'Role Assignment' as check_type,
    p."personType",
    pr."roleType",
    COUNT(*) as count
FROM "Person" p
LEFT JOIN "PersonRole" pr ON pr."personId" = p.id AND pr."isActive" = true
GROUP BY p."personType", pr."roleType"
ORDER BY p."personType", pr."roleType";
```

## 🧹 Script di Cleanup

### 8. Rimozione Tabelle Obsolete (SOLO DOPO VALIDAZIONE)

```sql
-- ATTENZIONE: Eseguire SOLO dopo completa validazione
-- e backup di sicurezza

-- Rimozione foreign key constraints
ALTER TABLE "CourseEnrollment" DROP CONSTRAINT IF EXISTS "CourseEnrollment_employeeId_fkey";
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_trainerId_fkey";
ALTER TABLE "Attestato" DROP CONSTRAINT IF EXISTS "Attestato_employeeId_fkey";
ALTER TABLE "RegistroPresenzePartecipante" DROP CONSTRAINT IF EXISTS "RegistroPresenzePartecipante_employeeId_fkey";
ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_fkey";
ALTER TABLE "RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";
ALTER TABLE "UserSession" DROP CONSTRAINT IF EXISTS "UserSession_userId_fkey";

-- Backup tabelle prima della rimozione
CREATE TABLE "Employee_backup" AS SELECT * FROM "Employee";
CREATE TABLE "Trainer_backup" AS SELECT * FROM "Trainer";
CREATE TABLE "User_backup" AS SELECT * FROM "User";
CREATE TABLE "UserRole_backup" AS SELECT * FROM "UserRole";

-- Rimozione colonne obsolete (graduale)
-- Fase 1: Rimozione colonne Employee
ALTER TABLE "CourseEnrollment" DROP COLUMN IF EXISTS "employeeId";
ALTER TABLE "Attestato" DROP COLUMN IF EXISTS "employeeId";
ALTER TABLE "RegistroPresenzePartecipante" DROP COLUMN IF EXISTS "employeeId";

-- Fase 2: Rimozione colonne Trainer
ALTER TABLE "Course" DROP COLUMN IF EXISTS "trainerId";

-- Fase 3: Rimozione colonne User
ALTER TABLE "ActivityLog" DROP COLUMN IF EXISTS "performedBy";
ALTER TABLE "RefreshToken" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "userId";

-- Fase 4: Rimozione tabelle (SOLO SE SICURI)
-- DROP TABLE IF EXISTS "Employee";
-- DROP TABLE IF EXISTS "Trainer";
-- DROP TABLE IF EXISTS "User";
-- DROP TABLE IF EXISTS "UserRole";

-- Rimozione funzioni temporanee
DROP FUNCTION IF EXISTS generate_person_id();
DROP FUNCTION IF EXISTS normalize_email(TEXT);
DROP FUNCTION IF EXISTS determine_person_type(BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS log_migration(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);
```

## 🔄 Script di Rollback

### 9. Procedura di Rollback Completo

```sql
-- SCRIPT DI EMERGENZA - ROLLBACK COMPLETO
-- Utilizzare SOLO in caso di problemi critici

BEGIN;

-- 1. Ripristino foreign key constraints originali
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_employeeId_fkey" 
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Course" ADD CONSTRAINT "Course_trainerId_fkey" 
    FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Attestato" ADD CONSTRAINT "Attestato_employeeId_fkey" 
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Rimozione colonne aggiunte
ALTER TABLE "CourseEnrollment" DROP COLUMN IF EXISTS "personId";
ALTER TABLE "Course" DROP COLUMN IF EXISTS "trainerPersonId";
ALTER TABLE "Attestato" DROP COLUMN IF EXISTS "personId";
ALTER TABLE "RegistroPresenzePartecipante" DROP COLUMN IF EXISTS "personId";
ALTER TABLE "ActivityLog" DROP COLUMN IF EXISTS "performedByPersonId";
ALTER TABLE "RefreshToken" DROP COLUMN IF EXISTS "personId";
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "personId";

-- 3. Rimozione tabelle Person
DROP TABLE IF EXISTS "PersonRole";
DROP TABLE IF EXISTS "Person";
DROP TABLE IF EXISTS "MigrationLog";

-- 4. Rimozione enum
DROP TYPE IF EXISTS "PersonType";
DROP TYPE IF EXISTS "RoleType";

-- 5. Ripristino da backup se necessario
-- INSERT INTO "Employee" SELECT * FROM "Employee_backup";
-- INSERT INTO "Trainer" SELECT * FROM "Trainer_backup";
-- INSERT INTO "User" SELECT * FROM "User_backup";
-- INSERT INTO "UserRole" SELECT * FROM "UserRole_backup";

COMMIT;

-- Verifica rollback
SELECT 
    'Rollback Verification' as check_type,
    'Employee' as table_name,
    COUNT(*) as record_count
FROM "Employee"
UNION ALL
SELECT 'Rollback Verification', 'Trainer', COUNT(*) FROM "Trainer"
UNION ALL
SELECT 'Rollback Verification', 'User', COUNT(*) FROM "User"
UNION ALL
SELECT 'Rollback Verification', 'Person', COUNT(*) FROM "Person";
```

## 📊 Monitoraggio Performance

### 10. Query di Monitoraggio

```sql
-- Monitoraggio performance migrazione
SELECT 
    'Migration Performance' as metric_type,
    "sourceTable",
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
    AVG(EXTRACT(EPOCH FROM ("executedAt" - LAG("executedAt") OVER (ORDER BY "executedAt")))) as avg_time_between_ops
FROM "MigrationLog"
GROUP BY "sourceTable";

-- Analisi dimensioni tabelle
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('Person', 'PersonRole', 'Employee', 'Trainer', 'User')
ORDER BY tablename, attname;

-- Verifica indici utilizzati
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('Person', 'PersonRole')
ORDER BY idx_scan DESC;
```

## 📝 Checklist Esecuzione

### Pre-Migrazione
- [ ] Backup completo database
- [ ] Ambiente di test configurato
- [ ] Script validati in test
- [ ] Team notificato
- [ ] Finestra di manutenzione programmata

### Durante Migrazione
- [ ] Monitoraggio spazio disco
- [ ] Verifica log errori
- [ ] Controllo performance
- [ ] Comunicazione stato avanzamento

### Post-Migrazione
- [ ] Verifica integrità dati
- [ ] Test funzionalità critiche
- [ ] Validazione performance
- [ ] Aggiornamento documentazione
- [ ] Formazione team

---

**Versione**: 1.0
**Data**: $(date +%Y-%m-%d)
**Responsabile**: Database Administrator
**Tempo Stimato**: 4-6 ore
**Downtime Previsto**: 2-3 ore