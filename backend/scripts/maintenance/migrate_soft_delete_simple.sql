-- Script di migrazione semplificato per sincronizzare soft delete
-- Fase 2: Standardizzazione Soft Delete

-- COMPANIES
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'Company', id, eliminato, deleted_at FROM "Company";

UPDATE "Company" 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

UPDATE "Company" 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

-- COURSES
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'Course', id, eliminato, deleted_at FROM "Course";

UPDATE "Course" 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

UPDATE "Course" 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

-- COURSE_SCHEDULES
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'CourseSchedule', id, eliminato, deleted_at FROM "CourseSchedule";

UPDATE "CourseSchedule" 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

UPDATE "CourseSchedule" 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

-- PERMISSIONS
INSERT INTO backup_soft_delete_migration (table_name, record_id, is_deleted_value, deleted_at_value)
SELECT 'Permission', id, eliminato, deleted_at FROM "Permission";

UPDATE "Permission" 
SET deleted_at = updated_at 
WHERE eliminato = true AND deleted_at IS NULL;

UPDATE "Permission" 
SET eliminato = true 
WHERE deleted_at IS NOT NULL AND eliminato = false;

-- Verifica finale
SELECT 'MIGRATION COMPLETED' as status;