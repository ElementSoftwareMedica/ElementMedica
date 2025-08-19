-- SCRIPT MIGRAZIONE: Standardizzazione Soft Delete
-- Data: 29 Dicembre 2024
-- Obiettivo: Sincronizzare isDeleted con deletedAt e rimuovere duplicazioni

-- =============================================================================
-- FASE 1: SINCRONIZZAZIONE DATI
-- =============================================================================

-- Company: Sincronizzare isDeleted con deletedAt
UPDATE companies 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

-- Course: Sincronizzare isDeleted con deletedAt  
UPDATE courses 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

-- CourseSchedule: Sincronizzare isDeleted con deletedAt
UPDATE course_schedules 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

-- Permission: Sincronizzare isDeleted con deletedAt
UPDATE permissions 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

-- =============================================================================
-- FASE 2: VERIFICA CONSISTENZA
-- =============================================================================

-- Verifica Company
SELECT 
    COUNT(*) as total_companies,
    COUNT(CASE WHEN eliminato = true THEN 1 END) as marked_deleted,
    COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as soft_deleted,
    COUNT(CASE WHEN eliminato = true AND deleted_at IS NULL THEN 1 END) as inconsistent
FROM companies;

-- Verifica Course
SELECT 
    COUNT(*) as total_courses,
    COUNT(CASE WHEN eliminato = true THEN 1 END) as marked_deleted,
    COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as soft_deleted,
    COUNT(CASE WHEN eliminato = true AND deleted_at IS NULL THEN 1 END) as inconsistent
FROM courses;

-- =============================================================================
-- FASE 3: BACKUP DATI PRIMA DELLA RIMOZIONE COLONNE
-- =============================================================================

-- Backup Company con campi eliminato
CREATE TABLE IF NOT EXISTS companies_backup_eliminato AS
SELECT id, eliminato, deleted_at, updated_at
FROM companies
WHERE eliminato = true;

-- Backup Course con campi eliminato
CREATE TABLE IF NOT EXISTS courses_backup_eliminato AS
SELECT id, eliminato, deleted_at, updated_at
FROM courses
WHERE eliminato = true;

-- =============================================================================
-- FASE 4: REPORT FINALE
-- =============================================================================

SELECT 'MIGRAZIONE COMPLETATA' as status;
SELECT 'Prossimo step: Aggiornare schema Prisma rimuovendo campi isDeleted/eliminato' as next_action;