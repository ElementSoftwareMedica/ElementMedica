-- =====================================================
-- MIGRAZIONE FASE 2: STANDARDIZZAZIONE SOFT DELETE
-- Data: 30 Dicembre 2024
-- Obiettivo: Sincronizzare isDeleted con deletedAt
-- =====================================================

-- IMPORTANTE: Eseguire questo script PRIMA di modificare lo schema Prisma
-- per evitare perdita di dati durante la rimozione dei campi isDeleted

BEGIN;

-- =====================================================
-- STEP 1: BACKUP DATI PRIMA DELLA MIGRAZIONE
-- =====================================================

-- Creare tabelle di backup per verificare la migrazione
CREATE TABLE IF NOT EXISTS backup_soft_delete_migration (
    table_name VARCHAR(100),
    record_id VARCHAR(100),
    is_deleted_value BOOLEAN,
    deleted_at_value TIMESTAMP,
    migration_date TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- STEP 2: SINCRONIZZAZIONE COMPANIES
-- =====================================================

-- Backup stato attuale Company (nome tabella corretto)
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'Company', id, eliminato, deleted_at FROM "Company";

-- Sincronizzare deleted_at con eliminato per Company
UPDATE "Company" 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

-- Verificare che non ci siano inconsistenze
UPDATE "Company" 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

SELECT 'COMPANIES SYNC COMPLETED' as status, 
       COUNT(*) as total_records,
       SUM(CASE WHEN "isDeleted" = true THEN 1 ELSE 0 END) as deleted_records,
       SUM(CASE WHEN "deletedAt" IS NOT NULL THEN 1 ELSE 0 END) as soft_deleted_records
FROM "Company";

-- =====================================================
-- STEP 3: SINCRONIZZAZIONE COURSES
-- =====================================================

-- Backup stato attuale Course (nome tabella corretto)
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'Course', id, eliminato, deleted_at FROM "Course";

-- Sincronizzare deleted_at con eliminato per Course
UPDATE "Course" 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

-- Verificare che non ci siano inconsistenze
UPDATE "Course" 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

SELECT 'COURSES SYNC COMPLETED' as status, 
       COUNT(*) as total_records,
       SUM(CASE WHEN "isDeleted" = true THEN 1 ELSE 0 END) as deleted_records,
       SUM(CASE WHEN "deletedAt" IS NOT NULL THEN 1 ELSE 0 END) as soft_deleted_records
FROM "Course";

-- =====================================================
-- STEP 4: SINCRONIZZAZIONE COURSE_SCHEDULES
-- =====================================================

-- Backup stato attuale CourseSchedule (nome tabella corretto)
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'CourseSchedule', id, eliminato, deleted_at FROM "CourseSchedule";

-- Sincronizzare deleted_at con eliminato per CourseSchedule
UPDATE "CourseSchedule" 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

-- Verificare che non ci siano inconsistenze
UPDATE "CourseSchedule" 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

SELECT 'COURSE_SCHEDULES SYNC COMPLETED' as status, 
       COUNT(*) as total_records,
       SUM(CASE WHEN "isDeleted" = true THEN 1 ELSE 0 END) as deleted_records,
       SUM(CASE WHEN "deletedAt" IS NOT NULL THEN 1 ELSE 0 END) as soft_deleted_records
FROM "CourseSchedule";

-- =====================================================
-- STEP 5: SINCRONIZZAZIONE ALTRE ENTITÀ
-- =====================================================

-- Elenco di tutte le tabelle con campo eliminato da sincronizzare:
-- course_sessions, course_enrollments, attestati, fatture, 
-- fattura_azienda, preventivi, preventivo_azienda, 
-- lettere_incarico, registro_presenze, test_documents,
-- template_links, permissions, role_permissions,
-- enhanced_user_roles, gdpr_audit_logs, consent_records

-- COURSE_SESSIONS (CourseSession)
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'CourseSession', id, eliminato, deleted_at FROM "CourseSession";

UPDATE "CourseSession" 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

UPDATE "CourseSession" 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

-- COURSE_ENROLLMENTS (course_enrollments - snake_case)
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'course_enrollments', id, eliminato, deleted_at FROM course_enrollments;

UPDATE course_enrollments 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

UPDATE course_enrollments 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

-- ATTESTATI (attestati - snake_case)
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'attestati', id, eliminato, deleted_at FROM attestati;

UPDATE attestati 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

UPDATE attestati 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

-- PERMISSIONS (Permission - PascalCase)
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'Permission', id, eliminato, deleted_at FROM "Permission";

UPDATE "Permission" 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

UPDATE "Permission" 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

-- =====================================================
-- STEP 6: VERIFICA FINALE CONSISTENZA DATI
-- =====================================================

-- Report finale di verifica
SELECT 
    'MIGRATION VERIFICATION REPORT' as report_type,
    table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN is_deleted_value = true THEN 1 ELSE 0 END) as originally_deleted,
    SUM(CASE WHEN deleted_at_value IS NOT NULL THEN 1 ELSE 0 END) as soft_deleted_records
FROM backup_soft_delete_migration 
GROUP BY table_name
ORDER BY table_name;

-- Verificare che non ci siano inconsistenze rimaste
SELECT 'COMPANIES INCONSISTENCIES' as check_type, COUNT(*) as count
FROM companies 
WHERE (eliminato = true AND deleted_at IS NULL) OR (eliminato = false AND deleted_at IS NOT NULL);

SELECT 'COURSES INCONSISTENCIES' as check_type, COUNT(*) as count
FROM courses 
WHERE (eliminato = true AND deleted_at IS NULL) OR (eliminato = false AND deleted_at IS NOT NULL);

SELECT 'COURSE_SCHEDULES INCONSISTENCIES' as check_type, COUNT(*) as count
FROM course_schedules 
WHERE (eliminato = true AND deleted_at IS NULL) OR (eliminato = false AND deleted_at IS NOT NULL);

-- =====================================================
-- STEP 7: LOG MIGRAZIONE COMPLETATA
-- =====================================================

INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
VALUES ('MIGRATION_COMPLETED', 'PHASE_2', true, NOW());

SELECT 'SOFT DELETE MIGRATION PHASE 2 COMPLETED SUCCESSFULLY' as final_status;

COMMIT;

-- =====================================================
-- ISTRUZIONI POST-MIGRAZIONE
-- =====================================================

-- DOPO aver eseguito questo script con successo:
-- 1. Aggiornare schema.prisma rimuovendo tutti i campi isDeleted/eliminato
-- 2. Eseguire: npx prisma db push
-- 3. Aggiornare il codice backend per usare solo deletedAt
-- 4. Testare tutte le funzionalità GDPR
-- 5. Aggiornare IMPLEMENTAZIONE.md con progresso

-- Per rollback in caso di problemi:
-- Usare la tabella backup_soft_delete_migration per ripristinare i valori originali