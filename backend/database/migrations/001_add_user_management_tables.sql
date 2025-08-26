-- Migration: Add User Management Tables
-- Date: 2024-12-19
-- Description: Add new tables for enhanced user management, RBAC, and GDPR compliance
-- Phase: 1 - Foundation Tables

-- =====================================================
-- PHASE 1: USER MANAGEMENT FOUNDATION
-- =====================================================

-- Enhanced Users table (replacing basic User table)
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "avatar_url" TEXT,
    "language" VARCHAR(10) DEFAULT 'it',
    "timezone" VARCHAR(50) DEFAULT 'Europe/Rome',
    "company_id" UUID REFERENCES "Company"("id") ON DELETE CASCADE,
    "employee_id" UUID REFERENCES "Employee"("id") ON DELETE SET NULL,
    "is_active" BOOLEAN DEFAULT true,
    "is_verified" BOOLEAN DEFAULT false,
    "email_verified_at" TIMESTAMP,
    "last_login_at" TIMESTAMP,
    "failed_login_attempts" INTEGER DEFAULT 0,
    "locked_until" TIMESTAMP,
    "password_changed_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID REFERENCES "users"("id"),
    "updated_by" UUID REFERENCES "users"("id")
);

-- Enhanced Roles table
CREATE TABLE IF NOT EXISTS "roles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) UNIQUE NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL, -- Hierarchy level (1=highest, 6=lowest)
    "is_system_role" BOOLEAN DEFAULT false,
    "company_id" UUID REFERENCES "Company"("id") ON DELETE CASCADE,
    "permissions" JSONB DEFAULT '[]'::jsonb,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID REFERENCES "users"("id"),
    "updated_by" UUID REFERENCES "users"("id")
);

-- User-Role assignments (many-to-many)
CREATE TABLE IF NOT EXISTS "user_roles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "role_id" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
    "company_id" UUID REFERENCES "Company"("id") ON DELETE CASCADE,
    "assigned_by" UUID REFERENCES "users"("id"),
    "assigned_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("user_id", "role_id", "company_id")
);

-- User Sessions for JWT management
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "session_token" VARCHAR(255) UNIQUE NOT NULL,
    "refresh_token" VARCHAR(255) UNIQUE NOT NULL,
    "device_info" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP NOT NULL,
    "last_activity" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PHASE 2: GDPR COMPLIANCE TABLES
-- =====================================================

-- User Consents for GDPR
CREATE TABLE IF NOT EXISTS "user_consents" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "consent_type" VARCHAR(50) NOT NULL, -- 'privacy_policy', 'marketing', 'analytics', etc.
    "consent_version" VARCHAR(20) NOT NULL,
    "consented" BOOLEAN NOT NULL,
    "consent_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "ip_address" INET,
    "user_agent" TEXT,
    "withdrawal_date" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs for compliance
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id"),
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "company_id" UUID REFERENCES "Company"("id"),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Export Requests for GDPR
CREATE TABLE IF NOT EXISTS "data_export_requests" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "request_type" VARCHAR(50) NOT NULL, -- 'export', 'delete'
    "status" VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    "requested_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP,
    "file_path" TEXT,
    "file_size" BIGINT,
    "expires_at" TIMESTAMP,
    "notes" TEXT
);

-- =====================================================
-- PHASE 3: USER PREFERENCES & SETTINGS
-- =====================================================

-- User Preferences
CREATE TABLE IF NOT EXISTS "user_preferences" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "preference_key" VARCHAR(100) NOT NULL,
    "preference_value" JSONB,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("user_id", "preference_key")
);

-- Company Settings
CREATE TABLE IF NOT EXISTS "company_settings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" JSONB,
    "is_system_setting" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID REFERENCES "users"("id"),
    "updated_by" UUID REFERENCES "users"("id"),
    UNIQUE("company_id", "setting_key")
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_company_id" ON "users"("company_id");
CREATE INDEX IF NOT EXISTS "idx_users_employee_id" ON "users"("employee_id");
CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users"("is_active");
CREATE INDEX IF NOT EXISTS "idx_users_last_login" ON "users"("last_login_at");
CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "users"("created_at");

-- Roles table indexes
CREATE INDEX IF NOT EXISTS "idx_roles_name" ON "roles"("name");
CREATE INDEX IF NOT EXISTS "idx_roles_company_id" ON "roles"("company_id");
CREATE INDEX IF NOT EXISTS "idx_roles_level" ON "roles"("level");
CREATE INDEX IF NOT EXISTS "idx_roles_is_active" ON "roles"("is_active");

-- User roles indexes
CREATE INDEX IF NOT EXISTS "idx_user_roles_user_id" ON "user_roles"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_role_id" ON "user_roles"("role_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_company_id" ON "user_roles"("company_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_is_active" ON "user_roles"("is_active");

-- Sessions indexes
CREATE INDEX IF NOT EXISTS "idx_user_sessions_user_id" ON "user_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_token" ON "user_sessions"("session_token");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_refresh_token" ON "user_sessions"("refresh_token");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_expires_at" ON "user_sessions"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_is_active" ON "user_sessions"("is_active");

-- Audit logs indexes (partitioned by date for performance)
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource" ON "audit_logs"("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_company_id" ON "audit_logs"("company_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- Consents indexes
CREATE INDEX IF NOT EXISTS "idx_user_consents_user_id" ON "user_consents"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_consents_type" ON "user_consents"("consent_type");
CREATE INDEX IF NOT EXISTS "idx_user_consents_date" ON "user_consents"("consent_date");

-- Export requests indexes
CREATE INDEX IF NOT EXISTS "idx_data_export_user_id" ON "data_export_requests"("user_id");
CREATE INDEX IF NOT EXISTS "idx_data_export_status" ON "data_export_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_data_export_requested_at" ON "data_export_requests"("requested_at");

-- Preferences indexes
CREATE INDEX IF NOT EXISTS "idx_user_preferences_user_id" ON "user_preferences"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_preferences_key" ON "user_preferences"("preference_key");

-- Company settings indexes
CREATE INDEX IF NOT EXISTS "idx_company_settings_company_id" ON "company_settings"("company_id");
CREATE INDEX IF NOT EXISTS "idx_company_settings_key" ON "company_settings"("setting_key");

-- =====================================================
-- SEED DEFAULT ROLES
-- =====================================================

-- Insert system roles
INSERT INTO "roles" ("id", "name", "display_name", "description", "level", "is_system_role", "permissions") VALUES
('00000000-0000-0000-0000-000000000001', 'global_admin', 'Global Administrator', 'Full system access across all companies', 1, true, '["*"]'::jsonb),
('00000000-0000-0000-0000-000000000002', 'company_admin', 'Company Administrator', 'Full access within company scope', 2, true, '["company.*", "users.*", "employees.*", "courses.*", "trainers.*"]'::jsonb),
('00000000-0000-0000-0000-000000000003', 'hr_manager', 'HR Manager', 'Human resources management', 3, true, '["employees.*", "users.read", "users.create", "courses.read"]'::jsonb),
('00000000-0000-0000-0000-000000000004', 'training_manager', 'Training Manager', 'Training and course management', 3, true, '["courses.*", "trainers.*", "schedules.*", "employees.read"]'::jsonb),
('00000000-0000-0000-0000-000000000005', 'trainer', 'Trainer', 'Course delivery and student management', 4, true, '["courses.read", "schedules.read", "attendances.*", "certificates.create"]'::jsonb),
('00000000-0000-0000-0000-000000000006', 'employee', 'Employee', 'Basic employee access', 5, true, '["profile.*", "courses.read", "schedules.read", "certificates.read"]'::jsonb)
ON CONFLICT ("name") DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add migration tracking
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (
    '001_add_user_management_tables_' || extract(epoch from now())::text,
    'user_management_tables_v1',
    now(),
    '001_add_user_management_tables',
    'Added user management, RBAC, GDPR compliance tables with indexes and default roles',
    null,
    now(),
    1
) ON CONFLICT DO NOTHING;

COMMIT;