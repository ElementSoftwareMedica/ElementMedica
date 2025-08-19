-- Script di Migrazione Dati - Fase 7: Enum & Validazione
-- ATTENZIONE: Eseguire solo dopo backup completo del database

-- 1. Backup delle tabelle prima della migrazione
CREATE TABLE "Course_backup" AS SELECT * FROM "Course";
CREATE TABLE "CourseEnrollment_backup" AS SELECT * FROM "CourseEnrollment";

-- 2. Conversione valori esistenti per enum

-- Conversione Course.status → CourseStatus
UPDATE "Course" SET "status" = 'DRAFT' WHERE LOWER("status") = 'draft';
UPDATE "Course" SET "status" = 'PUBLISHED' WHERE LOWER("status") = 'published';
UPDATE "Course" SET "status" = 'ACTIVE' WHERE LOWER("status") = 'active';
UPDATE "Course" SET "status" = 'ACTIVE' WHERE LOWER("status") = 'attivo';
UPDATE "Course" SET "status" = 'ACTIVE' WHERE LOWER("status") = '1';
UPDATE "Course" SET "status" = 'ACTIVE' WHERE LOWER("status") = 'true';
UPDATE "Course" SET "status" = 'COMPLETED' WHERE LOWER("status") = 'completed';
UPDATE "Course" SET "status" = 'COMPLETED' WHERE LOWER("status") = 'completato';
UPDATE "Course" SET "status" = 'COMPLETED' WHERE LOWER("status") = 'finished';
UPDATE "Course" SET "status" = 'CANCELLED' WHERE LOWER("status") = 'cancelled';
UPDATE "Course" SET "status" = 'CANCELLED' WHERE LOWER("status") = 'annullato';
UPDATE "Course" SET "status" = 'CANCELLED' WHERE LOWER("status") = 'canceled';
UPDATE "Course" SET "status" = 'SUSPENDED' WHERE LOWER("status") = 'suspended';

-- Conversione CourseEnrollment.status → EnrollmentStatus
UPDATE "CourseEnrollment" SET "status" = 'PENDING' WHERE LOWER("status") = 'pending';
UPDATE "CourseEnrollment" SET "status" = 'PENDING' WHERE LOWER("status") = 'in_attesa';
UPDATE "CourseEnrollment" SET "status" = 'PENDING' WHERE LOWER("status") = 'waiting';
UPDATE "CourseEnrollment" SET "status" = 'CONFIRMED' WHERE LOWER("status") = 'confirmed';
UPDATE "CourseEnrollment" SET "status" = 'ACTIVE' WHERE LOWER("status") = 'active';
UPDATE "CourseEnrollment" SET "status" = 'ACTIVE' WHERE LOWER("status") = 'attivo';
UPDATE "CourseEnrollment" SET "status" = 'ACTIVE' WHERE LOWER("status") = '1';
UPDATE "CourseEnrollment" SET "status" = 'ACTIVE' WHERE LOWER("status") = 'true';
UPDATE "CourseEnrollment" SET "status" = 'COMPLETED' WHERE LOWER("status") = 'completed';
UPDATE "CourseEnrollment" SET "status" = 'COMPLETED' WHERE LOWER("status") = 'completato';
UPDATE "CourseEnrollment" SET "status" = 'COMPLETED' WHERE LOWER("status") = 'finished';
UPDATE "CourseEnrollment" SET "status" = 'CANCELLED' WHERE LOWER("status") = 'cancelled';
UPDATE "CourseEnrollment" SET "status" = 'CANCELLED' WHERE LOWER("status") = 'annullato';
UPDATE "CourseEnrollment" SET "status" = 'CANCELLED' WHERE LOWER("status") = 'canceled';
UPDATE "CourseEnrollment" SET "status" = 'SUSPENDED' WHERE LOWER("status") = 'suspended';

-- 3. Validazione dati dopo conversione
SELECT 'Course.status' as field, "status", COUNT(*) as count 
FROM "Course" 
WHERE "status" NOT IN ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED') 
GROUP BY "status";

SELECT 'CourseEnrollment.status' as field, "status", COUNT(*) as count 
FROM "CourseEnrollment" 
WHERE "status" NOT IN ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED') 
GROUP BY "status";

-- 4. Cleanup valori non validi (ATTENZIONE: Verificare prima!)
-- UPDATE "Course" SET "status" = 'ACTIVE' WHERE "status" NOT IN ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');
-- UPDATE "CourseEnrollment" SET "status" = 'ACTIVE' WHERE "status" NOT IN ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');

-- 5. Verifica finale
SELECT 'Course' as table_name, 'status' as field_name, "status", COUNT(*) as count FROM "Course" GROUP BY "status";

SELECT 'CourseEnrollment' as table_name, 'status' as field_name, "status", COUNT(*) as count FROM "CourseEnrollment" GROUP BY "status";

-- 6. Cleanup backup tables (eseguire solo dopo verifica)
-- DROP TABLE "Course_backup";
-- DROP TABLE "CourseEnrollment_backup";
