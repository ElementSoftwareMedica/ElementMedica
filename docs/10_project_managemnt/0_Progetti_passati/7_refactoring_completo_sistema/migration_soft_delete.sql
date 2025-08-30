-- 🔧 MIGRAZIONE STANDARDIZZAZIONE SOFT DELETE
-- Data: 29 Dicembre 2024
-- Obiettivo: Rimuovere campi isDeleted duplicati, mantenere solo deletedAt

-- ⚠️ IMPORTANTE: Eseguire BACKUP completo prima di questa migrazione!
-- ⚠️ Testare su ambiente di sviluppo prima di produzione!

BEGIN;

-- =============================================================================
-- FASE 1: SINCRONIZZAZIONE isDeleted → deletedAt
-- =============================================================================

-- 1. Company: Sincronizzare eliminato con deleted_at
UPDATE companies 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

PRINT 'Company: Sincronizzati record eliminati con deleted_at';

-- 2. Course: Sincronizzare eliminato con deleted_at
UPDATE courses 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

PRINT 'Course: Sincronizzati record eliminati con deleted_at';

-- 3. CourseSchedule: Sincronizzare eliminato con deleted_at
UPDATE course_schedules 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

PRINT 'CourseSchedule: Sincronizzati record eliminati con deleted_at';

-- 4. CourseEnrollment: Sincronizzare eliminato con deleted_at
UPDATE course_enrollments 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

PRINT 'CourseEnrollment: Sincronizzati record eliminati con deleted_at';

-- 5. CourseSession: Sincronizzare eliminato con deleted_at
UPDATE course_sessions 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

PRINT 'CourseSession: Sincronizzati record eliminati con deleted_at';

-- 6. ScheduleCompany: Sincronizzare eliminato con deleted_at
UPDATE schedule_companies 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

PRINT 'ScheduleCompany: Sincronizzati record eliminati con deleted_at';

-- 7. Attestato: Sincronizzare eliminato con deleted_at
UPDATE attestati 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

PRINT 'Attestato: Sincronizzati record eliminati con deleted_at';

-- 8. TemplateLink: Sincronizzare eliminato con deleted_at
UPDATE template_links 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

PRINT 'TemplateLink: Sincronizzati record eliminati con deleted_at';

-- 9. LetteraIncarico: Sincronizzare eliminato con deleted_at
UPDATE lettera_incaricos 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

PRINT 'LetteraIncarico: Sincronizzati record eliminati con deleted_at';

-- =============================================================================
-- FASE 2: VERIFICA SINCRONIZZAZIONE
-- =============================================================================

-- Verifica che non ci siano record con isDeleted=true ma deletedAt=null
SELECT 'Company' as tabella, COUNT(*) as record_inconsistenti
FROM companies 
WHERE eliminato = true AND deleted_at IS NULL

UNION ALL

SELECT 'Course' as tabella, COUNT(*) as record_inconsistenti
FROM courses 
WHERE eliminato = true AND deleted_at IS NULL

UNION ALL

SELECT 'CourseSchedule' as tabella, COUNT(*) as record_inconsistenti
FROM course_schedules 
WHERE eliminato = true AND deleted_at IS NULL

UNION ALL

SELECT 'CourseEnrollment' as tabella, COUNT(*) as record_inconsistenti
FROM course_enrollments 
WHERE eliminato = true AND deleted_at IS NULL

UNION ALL

SELECT 'CourseSession' as tabella, COUNT(*) as record_inconsistenti
FROM course_sessions 
WHERE eliminato = true AND deleted_at IS NULL

UNION ALL

SELECT 'ScheduleCompany' as tabella, COUNT(*) as record_inconsistenti
FROM schedule_companies 
WHERE eliminato = true AND deleted_at IS NULL

UNION ALL

SELECT 'Attestato' as tabella, COUNT(*) as record_inconsistenti
FROM attestati 
WHERE eliminato = true AND deleted_at IS NULL

UNION ALL

SELECT 'TemplateLink' as tabella, COUNT(*) as record_inconsistenti
FROM template_links 
WHERE eliminato = true AND deleted_at IS NULL

UNION ALL

SELECT 'LetteraIncarico' as tabella, COUNT(*) as record_inconsistenti
FROM lettera_incaricos 
WHERE eliminato = true AND deleted_at IS NULL;

-- Se tutti i conteggi sono 0, la sincronizzazione è riuscita
PRINT 'Verifica completata. Se tutti i conteggi sono 0, procedere con FASE 3';

-- =============================================================================
-- FASE 3: RIMOZIONE COLONNE isDeleted (SOLO DOPO VERIFICA FASE 2)
-- =============================================================================

-- ⚠️ ATTENZIONE: Decommentare solo dopo aver verificato che FASE 2 sia OK!
-- ⚠️ Questa operazione è IRREVERSIBILE!

/*
-- 1. Rimuovere colonna eliminato da companies
ALTER TABLE companies DROP COLUMN eliminato;
PRINT 'Company: Rimossa colonna eliminato';

-- 2. Rimuovere colonna eliminato da courses
ALTER TABLE courses DROP COLUMN eliminato;
PRINT 'Course: Rimossa colonna eliminato';

-- 3. Rimuovere colonna eliminato da course_schedules
ALTER TABLE course_schedules DROP COLUMN eliminato;
PRINT 'CourseSchedule: Rimossa colonna eliminato';

-- 4. Rimuovere colonna eliminato da course_enrollments
ALTER TABLE course_enrollments DROP COLUMN eliminato;
PRINT 'CourseEnrollment: Rimossa colonna eliminato';

-- 5. Rimuovere colonna eliminato da course_sessions
ALTER TABLE course_sessions DROP COLUMN eliminato;
PRINT 'CourseSession: Rimossa colonna eliminato';

-- 6. Rimuovere colonna eliminato da schedule_companies
ALTER TABLE schedule_companies DROP COLUMN eliminato;
PRINT 'ScheduleCompany: Rimossa colonna eliminato';

-- 7. Rimuovere colonna eliminato da attestati
ALTER TABLE attestati DROP COLUMN eliminato;
PRINT 'Attestato: Rimossa colonna eliminato';

-- 8. Rimuovere colonna eliminato da template_links
ALTER TABLE template_links DROP COLUMN eliminato;
PRINT 'TemplateLink: Rimossa colonna eliminato';

-- 9. Rimuovere colonna eliminato da lettera_incaricos
ALTER TABLE lettera_incaricos DROP COLUMN eliminato;
PRINT 'LetteraIncarico: Rimossa colonna eliminato';

PRINT 'FASE 3 completata: Tutte le colonne eliminato sono state rimosse';
*/

-- =============================================================================
-- FASE 4: VERIFICA FINALE
-- =============================================================================

-- Conteggio record soft-deleted per tabella (usando solo deleted_at)
SELECT 'Company' as tabella, 
       COUNT(*) as totale_record,
       COUNT(deleted_at) as record_eliminati,
       COUNT(*) - COUNT(deleted_at) as record_attivi
FROM companies

UNION ALL

SELECT 'Course' as tabella, 
       COUNT(*) as totale_record,
       COUNT(deleted_at) as record_eliminati,
       COUNT(*) - COUNT(deleted_at) as record_attivi
FROM courses

UNION ALL

SELECT 'CourseSchedule' as tabella, 
       COUNT(*) as totale_record,
       COUNT(deleted_at) as record_eliminati,
       COUNT(*) - COUNT(deleted_at) as record_attivi
FROM course_schedules

UNION ALL

SELECT 'Person' as tabella, 
       COUNT(*) as totale_record,
       COUNT(deleted_at) as record_eliminati,
       COUNT(*) - COUNT(deleted_at) as record_attivi
FROM persons;

PRINT 'Migrazione completata con successo!';
PRINT 'Ora aggiornare schema.prisma rimuovendo i campi isDeleted';

COMMIT;