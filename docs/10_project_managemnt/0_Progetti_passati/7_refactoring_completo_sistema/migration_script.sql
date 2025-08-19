-- =====================================================
-- SCRIPT MIGRAZIONE COMPLETA: USER/EMPLOYEE → PERSON
-- Data: 19 Dicembre 2024
-- Versione: 1.0
-- =====================================================

-- IMPORTANTE: Eseguire questo script in una transazione
-- per poter fare rollback in caso di errori

BEGIN;

-- =====================================================
-- FASE 1: VERIFICA PRE-MIGRAZIONE
-- =====================================================

-- Verifica stato attuale
SELECT 'STATO PRE-MIGRAZIONE' as fase;
SELECT 'User' as tabella, COUNT(*) as totale, COUNT(*) FILTER (WHERE eliminato = false) as attivi FROM "User";
SELECT 'Employee' as tabella, COUNT(*) as totale, COUNT(*) FILTER (WHERE eliminato = false) as attivi FROM "Employee";
SELECT 'Person' as tabella, COUNT(*) as totale, COUNT(*) FILTER (WHERE "isDeleted" = false) as attivi FROM "persons";
SELECT 'UserRole' as tabella, COUNT(*) as totale FROM "UserRole";
SELECT 'PersonRole' as tabella, COUNT(*) as totale FROM "person_roles";

-- Verifica conflitti email
SELECT 'VERIFICA CONFLITTI EMAIL' as controllo;
SELECT 
  email,
  COUNT(*) as occorrenze,
  STRING_AGG(DISTINCT 'User', ', ') as in_user,
  STRING_AGG(DISTINCT 'Employee', ', ') as in_employee,
  STRING_AGG(DISTINCT 'Person', ', ') as in_person
FROM (
  SELECT email, 'User' as source FROM "User" WHERE eliminato = false AND email IS NOT NULL
  UNION ALL
  SELECT email, 'Employee' as source FROM "Employee" WHERE eliminato = false AND email IS NOT NULL
  UNION ALL
  SELECT email, 'Person' as source FROM "persons" WHERE "isDeleted" = false AND email IS NOT NULL
) combined
GROUP BY email
HAVING COUNT(*) > 1;

-- =====================================================
-- FASE 2: BACKUP TABELLE ESISTENTI
-- =====================================================

SELECT 'CREAZIONE BACKUP TABELLE' as fase;

-- Backup User
CREATE TABLE backup_user AS SELECT * FROM "User";
SELECT 'Backup User creato:' as info, COUNT(*) as records FROM backup_user;

-- Backup Employee
CREATE TABLE backup_employee AS SELECT * FROM "Employee";
SELECT 'Backup Employee creato:' as info, COUNT(*) as records FROM backup_employee;

-- Backup UserRole
CREATE TABLE backup_user_role AS SELECT * FROM "UserRole";
SELECT 'Backup UserRole creato:' as info, COUNT(*) as records FROM backup_user_role;

-- Backup Person (stato pre-migrazione)
CREATE TABLE backup_person_pre AS SELECT * FROM "persons";
SELECT 'Backup Person pre-migrazione:' as info, COUNT(*) as records FROM backup_person_pre;

-- =====================================================
-- FASE 3: MIGRAZIONE USER → PERSON
-- =====================================================

SELECT 'MIGRAZIONE USER → PERSON' as fase;

-- 3.1: Inserire User attivi in Person
INSERT INTO "persons" (
  id, "firstName", "lastName", email, username, password,
  "isActive", "lastLogin", "profileImage", "failedAttempts",
  "lockedUntil", "globalRole", "companyId", "tenantId",
  "createdAt", "updatedAt", "isDeleted",
  -- Campi specifici Person con valori di default
  status, "gdprConsentDate", "gdprConsentVersion"
)
SELECT 
  id, 
  COALESCE("firstName", 'N/A') as "firstName",
  COALESCE("lastName", 'N/A') as "lastName",
  email, 
  username, 
  password,
  "isActive", 
  "lastLogin", 
  "profileImage", 
  "failedAttempts",
  "lockedUntil", 
  "globalRole", 
  "companyId", 
  "tenantId",
  "createdAt", 
  "updatedAt", 
  eliminato as "isDeleted",
  -- Valori di default per campi Person
  'ACTIVE'::"person_status" as status,
  "createdAt" as "gdprConsentDate",
  '1.0' as "gdprConsentVersion"
FROM "User"
WHERE eliminato = false
  AND email NOT IN (SELECT email FROM "persons" WHERE email IS NOT NULL);

SELECT 'User migrati in Person:' as info, COUNT(*) as migrati 
FROM "persons" p 
JOIN backup_user u ON p.id = u.id;

-- 3.2: Migrazione UserRole → PersonRole
-- Prima creiamo una mappatura dei ruoli
CREATE TEMP TABLE role_mapping AS
SELECT 
  r.id as role_id,
  r.name as role_name,
  CASE 
    WHEN LOWER(r.name) LIKE '%admin%' AND LOWER(r.name) LIKE '%super%' THEN 'SUPER_ADMIN'
    WHEN LOWER(r.name) LIKE '%admin%' AND LOWER(r.name) LIKE '%company%' THEN 'COMPANY_ADMIN'
    WHEN LOWER(r.name) LIKE '%admin%' AND LOWER(r.name) LIKE '%tenant%' THEN 'TENANT_ADMIN'
    WHEN LOWER(r.name) LIKE '%admin%' THEN 'ADMIN'
    WHEN LOWER(r.name) LIKE '%manager%' AND LOWER(r.name) LIKE '%hr%' THEN 'HR_MANAGER'
    WHEN LOWER(r.name) LIKE '%manager%' THEN 'MANAGER'
    WHEN LOWER(r.name) LIKE '%trainer%' AND LOWER(r.name) LIKE '%senior%' THEN 'SENIOR_TRAINER'
    WHEN LOWER(r.name) LIKE '%trainer%' AND LOWER(r.name) LIKE '%external%' THEN 'EXTERNAL_TRAINER'
    WHEN LOWER(r.name) LIKE '%trainer%' AND LOWER(r.name) LIKE '%coordinator%' THEN 'TRAINER_COORDINATOR'
    WHEN LOWER(r.name) LIKE '%trainer%' THEN 'TRAINER'
    WHEN LOWER(r.name) LIKE '%supervisor%' THEN 'SUPERVISOR'
    WHEN LOWER(r.name) LIKE '%coordinator%' THEN 'COORDINATOR'
    WHEN LOWER(r.name) LIKE '%operator%' THEN 'OPERATOR'
    WHEN LOWER(r.name) LIKE '%viewer%' THEN 'VIEWER'
    WHEN LOWER(r.name) LIKE '%guest%' THEN 'GUEST'
    WHEN LOWER(r.name) LIKE '%consultant%' THEN 'CONSULTANT'
    WHEN LOWER(r.name) LIKE '%auditor%' THEN 'AUDITOR'
    WHEN LOWER(r.name) LIKE '%employee%' THEN 'EMPLOYEE'
    ELSE 'EMPLOYEE'  -- Default fallback
  END as role_type_enum
FROM "Role" r;

SELECT 'Mappatura ruoli creata:' as info, COUNT(*) as ruoli_mappati FROM role_mapping;

-- Inserire UserRole come PersonRole
INSERT INTO "person_roles" (
  id, "personId", "roleType", "isActive", "assignedAt",
  "assignedBy", "companyId", "tenantId", "createdAt", "updatedAt",
  "isPrimary", "validFrom"
)
SELECT 
  gen_random_uuid() as id,  -- Nuovo ID per evitare conflitti
  ur."userId" as "personId",
  rm.role_type_enum::"role_types" as "roleType",
  ur."isActive",
  ur."assignedAt",
  ur."assignedBy",
  u."companyId",
  u."tenantId",
  ur."assignedAt" as "createdAt",
  ur."assignedAt" as "updatedAt",  -- UserRole non ha updatedAt
  false as "isPrimary",  -- Default
  ur."assignedAt"::date as "validFrom"
FROM "UserRole" ur
JOIN "Role" r ON ur."roleId" = r.id
JOIN role_mapping rm ON r.id = rm.role_id
JOIN "User" u ON ur."userId" = u.id
JOIN "persons" p ON ur."userId" = p.id  -- Solo per User già migrati
WHERE ur.eliminato = false AND u.eliminato = false;

SELECT 'UserRole migrati in PersonRole:' as info, COUNT(*) as migrati 
FROM "person_roles" pr 
JOIN backup_user_role ur ON pr."personId" = ur."userId";

-- =====================================================
-- FASE 4: AGGIORNAMENTO FK DA USER A PERSON
-- =====================================================

SELECT 'AGGIORNAMENTO FK USER → PERSON' as fase;

-- 4.1: ActivityLog
SELECT 'Aggiornamento ActivityLog...' as step;
ALTER TABLE "ActivityLog" RENAME COLUMN "userId" TO "personId";
ALTER TABLE "ActivityLog" DROP CONSTRAINT IF EXISTS "ActivityLog_userId_fkey";
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- 4.2: GdprAuditLog
SELECT 'Aggiornamento GdprAuditLog...' as step;
ALTER TABLE "GdprAuditLog" RENAME COLUMN "userId" TO "personId";
ALTER TABLE "GdprAuditLog" DROP CONSTRAINT IF EXISTS "GdprAuditLog_userId_fkey";
ALTER TABLE "GdprAuditLog" ADD CONSTRAINT "GdprAuditLog_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE SET NULL;

-- 4.3: ConsentRecord
SELECT 'Aggiornamento ConsentRecord...' as step;
ALTER TABLE "ConsentRecord" RENAME COLUMN "userId" TO "personId";
ALTER TABLE "ConsentRecord" DROP CONSTRAINT IF EXISTS "ConsentRecord_userId_fkey";
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE CASCADE;

-- 4.4: UserSession
SELECT 'Aggiornamento UserSession...' as step;
ALTER TABLE "UserSession" RENAME COLUMN "userId" TO "personId";
ALTER TABLE "UserSession" DROP CONSTRAINT IF EXISTS "UserSession_userId_fkey";
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE CASCADE;

-- 4.5: EnhancedUserRole (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enhanced_user_roles') THEN
    EXECUTE 'ALTER TABLE "enhanced_user_roles" RENAME COLUMN "user_id" TO "person_id"';
    EXECUTE 'ALTER TABLE "enhanced_user_roles" DROP CONSTRAINT IF EXISTS "enhanced_user_roles_user_id_fkey"';
    EXECUTE 'ALTER TABLE "enhanced_user_roles" ADD CONSTRAINT "enhanced_user_roles_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"(id) ON DELETE CASCADE';
    
    EXECUTE 'ALTER TABLE "enhanced_user_roles" RENAME COLUMN "assigned_by" TO "assigned_by_person_id"';
    EXECUTE 'ALTER TABLE "enhanced_user_roles" DROP CONSTRAINT IF EXISTS "enhanced_user_roles_assigned_by_fkey"';
    EXECUTE 'ALTER TABLE "enhanced_user_roles" ADD CONSTRAINT "enhanced_user_roles_assigned_by_person_fkey" FOREIGN KEY ("assigned_by_person_id") REFERENCES "persons"(id) ON DELETE SET NULL';
    
    RAISE NOTICE 'EnhancedUserRole aggiornato';
  ELSE
    RAISE NOTICE 'EnhancedUserRole non trovato, skip';
  END IF;
END $$;

-- =====================================================
-- FASE 5: MIGRAZIONE EMPLOYEE → PERSON
-- =====================================================

SELECT 'MIGRAZIONE EMPLOYEE → PERSON' as fase;

-- 5.1: Inserire Employee attivi in Person
INSERT INTO "persons" (
  id, "firstName", "lastName", email, phone, "birthDate",
  "taxCode", "residenceAddress", "residenceCity", "postalCode",
  "province", title, "hiredDate", "profileImage", notes,
  "companyId", "createdAt", "updatedAt", "isDeleted",
  -- Campi specifici Person con valori di default
  status, "isActive", "gdprConsentDate", "gdprConsentVersion"
)
SELECT 
  id, 
  first_name as "firstName", 
  last_name as "lastName", 
  email, 
  phone, 
  birth_date as "birthDate",
  codice_fiscale as "taxCode", 
  residence_address as "residenceAddress", 
  residence_city as "residenceCity", 
  postal_code as "postalCode",
  province, 
  title, 
  hired_date as "hiredDate", 
  photo_url as "profileImage", 
  notes,
  "companyId", 
  created_at as "createdAt", 
  updated_at as "updatedAt", 
  eliminato as "isDeleted",
  -- Valori di default per campi Person
  CASE 
    WHEN status = 'active' THEN 'ACTIVE'::"person_status"
    WHEN status = 'inactive' THEN 'INACTIVE'::"person_status"
    WHEN status = 'suspended' THEN 'SUSPENDED'::"person_status"
    WHEN status = 'terminated' THEN 'TERMINATED'::"person_status"
    ELSE 'ACTIVE'::"person_status"
  END as status,
  true as "isActive",
  created_at as "gdprConsentDate",
  '1.0' as "gdprConsentVersion"
FROM "Employee"
WHERE eliminato = false
  AND (email IS NULL OR email NOT IN (SELECT email FROM "persons" WHERE email IS NOT NULL));

SELECT 'Employee migrati in Person:' as info, COUNT(*) as migrati 
FROM "persons" p 
JOIN backup_employee e ON p.id = e.id;

-- 5.2: Assegnare ruolo EMPLOYEE ai nuovi Person da Employee
INSERT INTO "person_roles" (
  id, "personId", "roleType", "isActive", "assignedAt",
  "companyId", "tenantId", "createdAt", "updatedAt",
  "isPrimary", "validFrom"
)
SELECT 
  gen_random_uuid() as id,
  p.id as "personId",
  'EMPLOYEE'::"role_types" as "roleType",
  true as "isActive",
  p."createdAt" as "assignedAt",
  p."companyId",
  p."tenantId",
  p."createdAt",
  p."updatedAt",
  true as "isPrimary",  -- Ruolo primario per ex-Employee
  p."createdAt"::date as "validFrom"
FROM "persons" p 
JOIN backup_employee e ON p.id = e.id
WHERE NOT EXISTS (
  SELECT 1 FROM "person_roles" pr WHERE pr."personId" = p.id
);

-- =====================================================
-- FASE 6: AGGIORNAMENTO FK DA EMPLOYEE A PERSON
-- =====================================================

SELECT 'AGGIORNAMENTO FK EMPLOYEE → PERSON' as fase;

-- 6.1: CourseEnrollment
SELECT 'Aggiornamento CourseEnrollment...' as step;
ALTER TABLE "CourseEnrollment" RENAME COLUMN "employeeId" TO "personId";
ALTER TABLE "CourseEnrollment" DROP CONSTRAINT IF EXISTS "CourseEnrollment_employeeId_fkey";
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- 6.2: Attestato
SELECT 'Aggiornamento Attestato...' as step;
ALTER TABLE "Attestato" RENAME COLUMN "partecipanteId" TO "personId";
ALTER TABLE "Attestato" DROP CONSTRAINT IF EXISTS "Attestato_partecipanteId_fkey";
ALTER TABLE "Attestato" ADD CONSTRAINT "Attestato_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- 6.3: RegistroPresenzePartecipante
SELECT 'Aggiornamento RegistroPresenzePartecipante...' as step;
ALTER TABLE "RegistroPresenzePartecipante" RENAME COLUMN "partecipanteId" TO "personId";
ALTER TABLE "RegistroPresenzePartecipante" DROP CONSTRAINT IF EXISTS "RegistroPresenzePartecipante_partecipanteId_fkey";
ALTER TABLE "RegistroPresenzePartecipante" ADD CONSTRAINT "RegistroPresenzePartecipante_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- 6.4: PreventivoPartecipante
SELECT 'Aggiornamento PreventivoPartecipante...' as step;
ALTER TABLE "PreventivoPartecipante" RENAME COLUMN "partecipanteId" TO "personId";
ALTER TABLE "PreventivoPartecipante" DROP CONSTRAINT IF EXISTS "PreventivoPartecipante_partecipanteId_fkey";
ALTER TABLE "PreventivoPartecipante" ADD CONSTRAINT "PreventivoPartecipante_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- 6.5: TestPartecipante
SELECT 'Aggiornamento TestPartecipante...' as step;
ALTER TABLE "TestPartecipante" RENAME COLUMN "partecipanteId" TO "personId";
ALTER TABLE "TestPartecipante" DROP CONSTRAINT IF EXISTS "TestPartecipante_partecipanteId_fkey";
ALTER TABLE "TestPartecipante" ADD CONSTRAINT "TestPartecipante_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- =====================================================
-- FASE 7: VERIFICA INTEGRITÀ POST-MIGRAZIONE
-- =====================================================

SELECT 'VERIFICA INTEGRITÀ POST-MIGRAZIONE' as fase;

-- Verifica conteggi
SELECT 'CONTEGGI POST-MIGRAZIONE' as controllo;
SELECT 'persons' as tabella, COUNT(*) as totale, COUNT(*) FILTER (WHERE "isDeleted" = false) as attivi FROM "persons";
SELECT 'person_roles' as tabella, COUNT(*) as totale FROM "person_roles";
SELECT 'ActivityLog' as tabella, COUNT(*) as totale FROM "ActivityLog";
SELECT 'CourseEnrollment' as tabella, COUNT(*) as totale FROM "CourseEnrollment";

-- Verifica integrità referenziale
SELECT 'VERIFICA INTEGRITÀ REFERENZIALE' as controllo;

-- ActivityLog
SELECT 
  'ActivityLog' as tabella,
  COUNT(*) as totale_record,
  COUNT(DISTINCT "personId") as persone_uniche,
  COUNT(*) - COUNT(p.id) as record_orfani
FROM "ActivityLog" al
LEFT JOIN "persons" p ON al."personId" = p.id;

-- CourseEnrollment
SELECT 
  'CourseEnrollment' as tabella,
  COUNT(*) as totale_record,
  COUNT(DISTINCT "personId") as persone_uniche,
  COUNT(*) - COUNT(p.id) as record_orfani
FROM "CourseEnrollment" ce
LEFT JOIN "persons" p ON ce."personId" = p.id;

-- PersonRole
SELECT 
  'PersonRole' as tabella,
  COUNT(*) as totale_record,
  COUNT(DISTINCT "personId") as persone_uniche,
  COUNT(*) - COUNT(p.id) as record_orfani
FROM "person_roles" pr
LEFT JOIN "persons" p ON pr."personId" = p.id;

-- Verifica email duplicate
SELECT 'VERIFICA EMAIL DUPLICATE POST-MIGRAZIONE' as controllo;
SELECT 
  email,
  COUNT(*) as occorrenze
FROM "persons" 
WHERE email IS NOT NULL AND "isDeleted" = false
GROUP BY email
HAVING COUNT(*) > 1;

-- =====================================================
-- FASE 8: CLEANUP CONDIZIONALE
-- =====================================================

-- ATTENZIONE: Questa sezione elimina le tabelle User, Employee e UserRole
-- Decommentare solo se la verifica è andata a buon fine

/*
SELECT 'CLEANUP - ELIMINAZIONE TABELLE OBSOLETE' as fase;

-- Eliminare UserRole
DROP TABLE IF EXISTS "UserRole" CASCADE;
SELECT 'UserRole eliminata' as info;

-- Eliminare User
DROP TABLE IF EXISTS "User" CASCADE;
SELECT 'User eliminata' as info;

-- Eliminare Employee
DROP TABLE IF EXISTS "Employee" CASCADE;
SELECT 'Employee eliminata' as info;

-- Eliminare enhanced_user_roles se esiste
DROP TABLE IF EXISTS "enhanced_user_roles" CASCADE;
SELECT 'enhanced_user_roles eliminata' as info;

-- Eliminare Role se non più utilizzata
-- VERIFICARE PRIMA SE CI SONO ALTRE DIPENDENZE!
-- DROP TABLE IF EXISTS "Role" CASCADE;
*/

-- =====================================================
-- FASE 9: REPORT FINALE
-- =====================================================

SELECT 'REPORT FINALE MIGRAZIONE' as fase;
SELECT 
  'MIGRAZIONE COMPLETATA' as status,
  NOW() as timestamp,
  (
    SELECT COUNT(*) FROM backup_user WHERE eliminato = false
  ) as user_originali,
  (
    SELECT COUNT(*) FROM backup_employee WHERE eliminato = false
  ) as employee_originali,
  (
    SELECT COUNT(*) FROM "persons" WHERE "isDeleted" = false
  ) as person_finali,
  (
    SELECT COUNT(*) FROM backup_user_role WHERE eliminato = false
  ) as user_role_originali,
  (
    SELECT COUNT(*) FROM "person_roles"
  ) as person_role_finali;

-- Cleanup tabelle temporanee
DROP TABLE IF EXISTS role_mapping;

SELECT 'MIGRAZIONE COMPLETATA CON SUCCESSO!' as risultato;
SELECT 'Le tabelle di backup sono disponibili per rollback se necessario' as nota;
SELECT 'Ricordarsi di aggiornare il codice applicativo per usare Person invece di User/Employee' as todo;

-- COMMIT della transazione
COMMIT;

-- =====================================================
-- SCRIPT DI ROLLBACK (da eseguire separatamente se necessario)
-- =====================================================

/*
-- ROLLBACK SCRIPT - ESEGUIRE SOLO IN CASO DI PROBLEMI

BEGIN;

-- Ripristinare User
DROP TABLE IF EXISTS "User" CASCADE;
CREATE TABLE "User" AS SELECT * FROM backup_user;

-- Ripristinare Employee
DROP TABLE IF EXISTS "Employee" CASCADE;
CREATE TABLE "Employee" AS SELECT * FROM backup_employee;

-- Ripristinare UserRole
DROP TABLE IF EXISTS "UserRole" CASCADE;
CREATE TABLE "UserRole" AS SELECT * FROM backup_user_role;

-- Ripristinare Person
DELETE FROM "persons" WHERE id IN (
  SELECT id FROM backup_user 
  UNION 
  SELECT id FROM backup_employee
);

INSERT INTO "persons" SELECT * FROM backup_person_pre;

-- Ripristinare FK originali
-- [Aggiungere qui i comandi per ripristinare le FK originali]

SELECT 'ROLLBACK COMPLETATO' as status;

COMMIT;
*/