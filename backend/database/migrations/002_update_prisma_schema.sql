-- Migration: Update Prisma Schema for New User Management
-- Date: 2024-12-19
-- Description: Update existing schema to integrate with new user management system
-- Phase: 2 - Schema Integration

-- =====================================================
-- UPDATE EXISTING TABLES FOR INTEGRATION
-- =====================================================

-- Add user tracking to existing tables
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "created_by" UUID REFERENCES "users"("id");
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "updated_by" UUID REFERENCES "users"("id");
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "created_by" UUID REFERENCES "users"("id");
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "updated_by" UUID REFERENCES "users"("id");
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "created_by" UUID REFERENCES "users"("id");
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "updated_by" UUID REFERENCES "users"("id");
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "CourseSchedule" ADD COLUMN IF NOT EXISTS "created_by" UUID REFERENCES "users"("id");
ALTER TABLE "CourseSchedule" ADD COLUMN IF NOT EXISTS "updated_by" UUID REFERENCES "users"("id");
ALTER TABLE "CourseSchedule" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Trainer" ADD COLUMN IF NOT EXISTS "created_by" UUID REFERENCES "users"("id");
ALTER TABLE "Trainer" ADD COLUMN IF NOT EXISTS "updated_by" UUID REFERENCES "users"("id");
ALTER TABLE "Trainer" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- ADD SOFT DELETE SUPPORT FOR GDPR
-- =====================================================

-- Add soft delete columns to main entities
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "deleted_by" UUID REFERENCES "users"("id");

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "deleted_by" UUID REFERENCES "users"("id");

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "deleted_by" UUID REFERENCES "users"("id");

ALTER TABLE "CourseSchedule" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP;
ALTER TABLE "CourseSchedule" ADD COLUMN IF NOT EXISTS "deleted_by" UUID REFERENCES "users"("id");

ALTER TABLE "Trainer" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP;
ALTER TABLE "Trainer" ADD COLUMN IF NOT EXISTS "deleted_by" UUID REFERENCES "users"("id");

-- =====================================================
-- ADD COMPANY ISOLATION CONSTRAINTS
-- =====================================================

-- Ensure employees belong to the same company as their user
CREATE OR REPLACE FUNCTION check_employee_company_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user's company matches employee's company
    IF EXISTS (
        SELECT 1 FROM users u 
        WHERE u.employee_id = NEW.id 
        AND u.company_id != NEW.companyId
    ) THEN
        RAISE EXCEPTION 'Employee company must match user company';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_employee_company_consistency
    BEFORE INSERT OR UPDATE ON "Employee"
    FOR EACH ROW EXECUTE FUNCTION check_employee_company_consistency();

-- =====================================================
-- ADD PERFORMANCE INDEXES FOR EXISTING TABLES
-- =====================================================

-- Company indexes
CREATE INDEX IF NOT EXISTS "idx_company_created_by" ON "Company"("created_by");
CREATE INDEX IF NOT EXISTS "idx_company_updated_at" ON "Company"("updated_at");
CREATE INDEX IF NOT EXISTS "idx_company_deleted_at" ON "Company"("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_company_active" ON "Company"("deleted_at") WHERE "deleted_at" IS NULL;

-- Employee indexes
CREATE INDEX IF NOT EXISTS "idx_employee_company_id" ON "Employee"("companyId");
CREATE INDEX IF NOT EXISTS "idx_employee_created_by" ON "Employee"("created_by");
CREATE INDEX IF NOT EXISTS "idx_employee_updated_at" ON "Employee"("updated_at");
CREATE INDEX IF NOT EXISTS "idx_employee_deleted_at" ON "Employee"("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_employee_active" ON "Employee"("deleted_at") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_employee_email" ON "Employee"("email");
CREATE INDEX IF NOT EXISTS "idx_employee_codice_fiscale" ON "Employee"("codiceFiscale");

-- Course indexes
CREATE INDEX IF NOT EXISTS "idx_course_created_by" ON "Course"("created_by");
CREATE INDEX IF NOT EXISTS "idx_course_updated_at" ON "Course"("updated_at");
CREATE INDEX IF NOT EXISTS "idx_course_deleted_at" ON "Course"("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_course_active" ON "Course"("deleted_at") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_course_category" ON "Course"("categoria");
CREATE INDEX IF NOT EXISTS "idx_course_duration" ON "Course"("durata");

-- Course Schedule indexes
CREATE INDEX IF NOT EXISTS "idx_schedule_course_id" ON "CourseSchedule"("courseId");
CREATE INDEX IF NOT EXISTS "idx_schedule_company_id" ON "CourseSchedule"("companyId");
CREATE INDEX IF NOT EXISTS "idx_schedule_created_by" ON "CourseSchedule"("created_by");
CREATE INDEX IF NOT EXISTS "idx_schedule_updated_at" ON "CourseSchedule"("updated_at");
CREATE INDEX IF NOT EXISTS "idx_schedule_deleted_at" ON "CourseSchedule"("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_schedule_active" ON "CourseSchedule"("deleted_at") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_schedule_date_range" ON "CourseSchedule"("dataInizio", "dataFine");
CREATE INDEX IF NOT EXISTS "idx_schedule_status" ON "CourseSchedule"("stato");

-- Trainer indexes
CREATE INDEX IF NOT EXISTS "idx_trainer_created_by" ON "Trainer"("created_by");
CREATE INDEX IF NOT EXISTS "idx_trainer_updated_at" ON "Trainer"("updated_at");
CREATE INDEX IF NOT EXISTS "idx_trainer_deleted_at" ON "Trainer"("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_trainer_active" ON "Trainer"("deleted_at") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_trainer_email" ON "Trainer"("email");
CREATE INDEX IF NOT EXISTS "idx_trainer_codice_fiscale" ON "Trainer"("codiceFiscale");
CREATE INDEX IF NOT EXISTS "idx_trainer_specialties" ON "Trainer" USING GIN("specialties");

-- =====================================================
-- ADD FULL-TEXT SEARCH INDEXES
-- =====================================================

-- Add full-text search for Italian content
CREATE INDEX IF NOT EXISTS "idx_company_search" ON "Company" USING GIN(
    to_tsvector('italian', 
        COALESCE("ragioneSociale", '') || ' ' ||
        COALESCE("partitaIva", '') || ' ' ||
        COALESCE("codiceFiscale", '') || ' ' ||
        COALESCE("indirizzo", '') || ' ' ||
        COALESCE("citta", '')
    )
);

CREATE INDEX IF NOT EXISTS "idx_employee_search" ON "Employee" USING GIN(
    to_tsvector('italian', 
        COALESCE("nome", '') || ' ' ||
        COALESCE("cognome", '') || ' ' ||
        COALESCE("email", '') || ' ' ||
        COALESCE("telefono", '') || ' ' ||
        COALESCE("codiceFiscale", '') || ' ' ||
        COALESCE("mansione", '') || ' ' ||
        COALESCE("dipartimento", '')
    )
);

CREATE INDEX IF NOT EXISTS "idx_course_search" ON "Course" USING GIN(
    to_tsvector('italian', 
        COALESCE("titolo", '') || ' ' ||
        COALESCE("descrizione", '') || ' ' ||
        COALESCE("categoria", '') || ' ' ||
        COALESCE("obiettivi", '')
    )
);

CREATE INDEX IF NOT EXISTS "idx_trainer_search" ON "Trainer" USING GIN(
    to_tsvector('italian', 
        COALESCE("nome", '') || ' ' ||
        COALESCE("cognome", '') || ' ' ||
        COALESCE("email", '') || ' ' ||
        COALESCE("telefono", '') || ' ' ||
        COALESCE("codiceFiscale", '') || ' ' ||
        COALESCE("qualifiche", '') || ' ' ||
        COALESCE("esperienze", '')
    )
);

-- =====================================================
-- CREATE UPDATED_AT TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER trigger_company_updated_at
    BEFORE UPDATE ON "Company"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_employee_updated_at
    BEFORE UPDATE ON "Employee"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_course_updated_at
    BEFORE UPDATE ON "Course"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_schedule_updated_at
    BEFORE UPDATE ON "CourseSchedule"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_trainer_updated_at
    BEFORE UPDATE ON "Trainer"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON "roles"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON "user_preferences"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_company_settings_updated_at
    BEFORE UPDATE ON "company_settings"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREATE AUDIT TRIGGER FUNCTION
-- =====================================================

-- Function to log changes to audit_logs
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_values JSONB;
    new_values JSONB;
    current_user_id UUID;
BEGIN
    -- Get current user from session (will be set by application)
    current_user_id := current_setting('app.current_user_id', true)::UUID;
    
    -- Prepare old and new values
    IF TG_OP = 'DELETE' THEN
        old_values := to_jsonb(OLD);
        new_values := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_values := NULL;
        new_values := to_jsonb(NEW);
    ELSE -- UPDATE
        old_values := to_jsonb(OLD);
        new_values := to_jsonb(NEW);
    END IF;
    
    -- Insert audit log
    INSERT INTO "audit_logs" (
        "user_id",
        "action",
        "resource_type",
        "resource_id",
        "old_values",
        "new_values",
        "ip_address",
        "company_id"
    ) VALUES (
        current_user_id,
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN (OLD.id)::UUID
            ELSE (NEW.id)::UUID
        END,
        old_values,
        new_values,
        inet_client_addr(),
        CASE 
            WHEN TG_TABLE_NAME = 'Company' THEN 
                CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
            WHEN TG_TABLE_NAME = 'Employee' THEN 
                CASE WHEN TG_OP = 'DELETE' THEN OLD."companyId" ELSE NEW."companyId" END
            WHEN TG_TABLE_NAME = 'CourseSchedule' THEN 
                CASE WHEN TG_OP = 'DELETE' THEN OLD."companyId" ELSE NEW."companyId" END
            ELSE NULL
        END
    );
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to main tables
CREATE TRIGGER audit_company_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "Company"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_employee_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "Employee"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_course_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "Course"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_schedule_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "CourseSchedule"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_trainer_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "Trainer"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "users"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMIT;