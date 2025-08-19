-- Indici ottimizzati per Multi-Tenancy
-- Generato automaticamente dalla Fase 6

-- Indici compositi per performance multi-tenant

-- Person: tenantId + email per login veloce
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Person_tenantId_email_idx" 
ON "Person"("tenantId", "email") WHERE "deletedAt" IS NULL;

-- Company: tenantId + name per ricerche
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Company_tenantId_name_idx" 
ON "Company"("tenantId", "ragioneSociale") WHERE "deletedAt" IS NULL;

-- Course: tenantId + status per dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Course_tenantId_status_idx" 
ON "Course"("tenantId", "status") WHERE "deletedAt" IS NULL;

-- CourseSchedule: tenantId + date range per calendario
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CourseSchedule_tenantId_dates_idx" 
ON "CourseSchedule"("tenantId", "startDate", "endDate") WHERE "deletedAt" IS NULL;

-- CourseEnrollment: tenantId + personId per iscrizioni utente
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CourseEnrollment_tenantId_personId_idx" 
ON "CourseEnrollment"("tenantId", "personId") WHERE "deletedAt" IS NULL;

-- ActivityLog: tenantId + createdAt per audit trail
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ActivityLog_tenantId_createdAt_idx" 
ON "ActivityLog"("tenantId", "createdAt") WHERE "deletedAt" IS NULL;

-- GdprAuditLog: tenantId + personId per compliance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "GdprAuditLog_tenantId_personId_idx" 
ON "GdprAuditLog"("tenantId", "personId") WHERE "deletedAt" IS NULL;

-- Indici per unique constraints multi-tenant

-- Email unica per tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Person_email_tenantId_unique" 
ON "Person"("email", "tenantId") WHERE "deletedAt" IS NULL;

-- VAT Number unico per tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Company_piva_tenantId_unique" 
ON "Company"("piva", "tenantId") WHERE "deletedAt" IS NULL AND "piva" IS NOT NULL;

-- Course code unico per tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Course_code_tenantId_unique" 
ON "Course"("code", "tenantId") WHERE "deletedAt" IS NULL AND "code" IS NOT NULL;
