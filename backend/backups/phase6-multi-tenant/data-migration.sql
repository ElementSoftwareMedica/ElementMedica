-- Script di Migrazione Dati - Fase 6: Multi-Tenant
-- ATTENZIONE: Eseguire solo dopo backup completo del database

-- 1. Backup delle tabelle prima della migrazione
CREATE TABLE "Person_backup" AS SELECT * FROM "Person";
CREATE TABLE "Company_backup" AS SELECT * FROM "Company";
CREATE TABLE "Course_backup" AS SELECT * FROM "Course";

-- 2. Aggiungere colonne tenantId ai modelli mancanti
ALTER TABLE "CourseEnrollment" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CourseSession" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Attestato" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "LetteraIncarico" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RegistroPresenze" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RegistroPresenzePartecipante" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Preventivo" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PreventivoPartecipante" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Fattura" ADD COLUMN "tenantId" TEXT;

-- 3. Popolare tenantId basandosi su relazioni esistenti

-- CourseEnrollment: da Person
UPDATE "CourseEnrollment" 
SET "tenantId" = (
  SELECT p."tenantId" 
  FROM "Person" p 
  WHERE p.id = "CourseEnrollment"."personId"
)
WHERE "tenantId" IS NULL;

-- CourseSession: da CourseSchedule
UPDATE "CourseSession" 
SET "tenantId" = (
  SELECT cs."tenantId" 
  FROM "CourseSchedule" cs 
  WHERE cs.id = "CourseSession"."scheduleId"
)
WHERE "tenantId" IS NULL;

-- Attestato: da Person
UPDATE "Attestato" 
SET "tenantId" = (
  SELECT p."tenantId" 
  FROM "Person" p 
  WHERE p.id = "Attestato"."personId"
)
WHERE "tenantId" IS NULL;

-- 4. Rendere tenantId NOT NULL
ALTER TABLE "Person" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Company" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Course" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CourseSchedule" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ActivityLog" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "GdprAuditLog" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ConsentRecord" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CourseEnrollment" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CourseSession" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Attestato" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "LetteraIncarico" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "RegistroPresenze" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "RegistroPresenzePartecipante" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Preventivo" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PreventivoPartecipante" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Fattura" ALTER COLUMN "tenantId" SET NOT NULL;

-- 5. Aggiungere foreign key constraints
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "Attestato" ADD CONSTRAINT "Attestato_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "LetteraIncarico" ADD CONSTRAINT "LetteraIncarico_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "RegistroPresenze" ADD CONSTRAINT "RegistroPresenze_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "RegistroPresenzePartecipante" ADD CONSTRAINT "RegistroPresenzePartecipante_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "Preventivo" ADD CONSTRAINT "Preventivo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "PreventivoPartecipante" ADD CONSTRAINT "PreventivoPartecipante_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "Fattura" ADD CONSTRAINT "Fattura_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

-- 6. Creare indici per performance
CREATE INDEX "Person_tenantId_idx" ON "Person"("tenantId");
CREATE INDEX "Company_tenantId_idx" ON "Company"("tenantId");
CREATE INDEX "Course_tenantId_idx" ON "Course"("tenantId");
CREATE INDEX "CourseSchedule_tenantId_idx" ON "CourseSchedule"("tenantId");
CREATE INDEX "ActivityLog_tenantId_idx" ON "ActivityLog"("tenantId");
CREATE INDEX "GdprAuditLog_tenantId_idx" ON "GdprAuditLog"("tenantId");
CREATE INDEX "ConsentRecord_tenantId_idx" ON "ConsentRecord"("tenantId");
CREATE INDEX "CourseEnrollment_tenantId_idx" ON "CourseEnrollment"("tenantId");
CREATE INDEX "CourseSession_tenantId_idx" ON "CourseSession"("tenantId");
CREATE INDEX "Attestato_tenantId_idx" ON "Attestato"("tenantId");
CREATE INDEX "LetteraIncarico_tenantId_idx" ON "LetteraIncarico"("tenantId");
CREATE INDEX "RegistroPresenze_tenantId_idx" ON "RegistroPresenze"("tenantId");
CREATE INDEX "RegistroPresenzePartecipante_tenantId_idx" ON "RegistroPresenzePartecipante"("tenantId");
CREATE INDEX "Preventivo_tenantId_idx" ON "Preventivo"("tenantId");
CREATE INDEX "PreventivoPartecipante_tenantId_idx" ON "PreventivoPartecipante"("tenantId");
CREATE INDEX "Fattura_tenantId_idx" ON "Fattura"("tenantId");

-- 7. Verifiche finali
SELECT 'Person' as table_name, COUNT(*) as total_records, COUNT("tenantId") as with_tenant_id FROM "Person"
UNION ALL
SELECT 'Company', COUNT(*), COUNT("tenantId") FROM "Company"
UNION ALL
SELECT 'Course', COUNT(*), COUNT("tenantId") FROM "Course";

-- 8. Cleanup backup tables (eseguire solo dopo verifica)
-- DROP TABLE "Person_backup";
-- DROP TABLE "Company_backup";
-- DROP TABLE "Course_backup";
