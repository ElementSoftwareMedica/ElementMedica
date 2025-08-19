-- Migration 005: Multi-Tenant Implementation
-- Week 12: Sistema Utenti Avanzato
-- Data: 18 Gennaio 2025

-- =====================================================
-- STEP 1: Creazione tabella Tenants
-- =====================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    billing_plan VARCHAR(50) DEFAULT 'basic',
    max_users INTEGER DEFAULT 50,
    max_companies INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    eliminato BOOLEAN DEFAULT false
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active) WHERE is_active = true;

-- =====================================================
-- STEP 2: Creazione tabella Tenant Configurations
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB,
    config_type VARCHAR(50) DEFAULT 'general', -- general, ui, billing, security
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    eliminato BOOLEAN DEFAULT false,
    UNIQUE(tenant_id, config_key)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_tenant_config_tenant ON tenant_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_config_key ON tenant_configurations(config_key);

-- =====================================================
-- STEP 3: Creazione tabella Enhanced User Roles
-- =====================================================

CREATE TABLE IF NOT EXISTS enhanced_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_type VARCHAR(50) NOT NULL, -- global_admin, company_admin, manager, trainer, employee
    role_scope VARCHAR(50) DEFAULT 'tenant', -- global, tenant, company, department
    permissions JSONB DEFAULT '{}',
    company_id UUID, -- Per ruoli company-scoped
    department_id UUID, -- Per ruoli department-scoped
    is_active BOOLEAN DEFAULT true,
    assigned_by UUID,
    assigned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    eliminato BOOLEAN DEFAULT false,
    UNIQUE(user_id, tenant_id, role_type, company_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_enhanced_roles_user ON enhanced_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_roles_tenant ON enhanced_user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_roles_type ON enhanced_user_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_enhanced_roles_company ON enhanced_user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_roles_active ON enhanced_user_roles(is_active) WHERE is_active = true;

-- =====================================================
-- STEP 4: Creazione tabella Billing Usage
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    usage_type VARCHAR(50) NOT NULL, -- users, companies, courses, storage, api_calls
    usage_value INTEGER NOT NULL DEFAULT 0,
    usage_limit INTEGER,
    billing_period DATE NOT NULL, -- YYYY-MM-01 format
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    eliminato BOOLEAN DEFAULT false,
    UNIQUE(tenant_id, usage_type, billing_period)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_usage_tenant ON tenant_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_period ON tenant_usage(billing_period);
CREATE INDEX IF NOT EXISTS idx_usage_type ON tenant_usage(usage_type);

-- =====================================================
-- STEP 5: Aggiunta colonna tenant_id alle tabelle esistenti
-- =====================================================

-- Aggiunta tenant_id a Users (se non esiste già)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON "User"(tenant_id);

-- Aggiunta tenant_id a Companies
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON "Company"(tenant_id);

-- Aggiunta tenant_id a Roles
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON "Role"(tenant_id);

-- Aggiunta tenant_id a Courses
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_courses_tenant ON "Course"(tenant_id);

-- Aggiunta tenant_id a Trainers
ALTER TABLE "Trainer" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_trainers_tenant ON "Trainer"(tenant_id);

-- =====================================================
-- STEP 6: Creazione tenant di default
-- =====================================================

-- Inserimento tenant di default per dati esistenti
INSERT INTO tenants (id, name, slug, settings, billing_plan, max_users, max_companies)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Tenant',
    'default',
    '{"theme": "default", "locale": "it-IT", "timezone": "Europe/Rome"}',
    'enterprise',
    1000,
    100
) ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- STEP 7: Aggiornamento dati esistenti con tenant di default
-- =====================================================

-- Aggiorna Users esistenti
UPDATE "User" 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Aggiorna Companies esistenti
UPDATE "Company" 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Aggiorna Roles esistenti
UPDATE "Role" 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Aggiorna Courses esistenti
UPDATE "Course" 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Aggiorna Trainers esistenti
UPDATE "Trainer" 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- =====================================================
-- STEP 8: Creazione ruoli di default per il sistema
-- =====================================================

-- Inserimento ruoli di sistema di default
INSERT INTO enhanced_user_roles (user_id, tenant_id, role_type, role_scope, permissions)
SELECT 
    u.id,
    '00000000-0000-0000-0000-000000000001',
    CASE 
        WHEN ur."roleId" IN (SELECT id FROM "Role" WHERE name = 'admin') THEN 'company_admin'
        WHEN ur."roleId" IN (SELECT id FROM "Role" WHERE name = 'manager') THEN 'manager'
        WHEN ur."roleId" IN (SELECT id FROM "Role" WHERE name = 'trainer') THEN 'trainer'
        ELSE 'employee'
    END,
    'tenant',
    '{}'
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
WHERE ur."isActive" = true
ON CONFLICT (user_id, tenant_id, role_type, company_id) DO NOTHING;

-- =====================================================
-- STEP 9: Creazione configurazioni di default
-- =====================================================

-- Configurazioni di default per il tenant
INSERT INTO tenant_configurations (tenant_id, config_key, config_value, config_type)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'theme', '"default"', 'ui'),
    ('00000000-0000-0000-0000-000000000001', 'locale', '"it-IT"', 'general'),
    ('00000000-0000-0000-0000-000000000001', 'timezone', '"Europe/Rome"', 'general'),
    ('00000000-0000-0000-0000-000000000001', 'max_file_size', '10485760', 'general'),
    ('00000000-0000-0000-0000-000000000001', 'allowed_file_types', '["pdf", "doc", "docx", "xls", "xlsx"]', 'general'),
    ('00000000-0000-0000-0000-000000000001', 'session_timeout', '3600', 'security'),
    ('00000000-0000-0000-0000-000000000001', 'password_policy', '{"minLength": 8, "requireUppercase": true, "requireNumbers": true}', 'security')
ON CONFLICT (tenant_id, config_key) DO NOTHING;

-- =====================================================
-- STEP 10: Creazione funzioni di utilità
-- =====================================================

-- Funzione per ottenere il tenant context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Questa funzione sarà utilizzata per ottenere il tenant ID dal context
    -- Per ora ritorna il tenant di default
    RETURN '00000000-0000-0000-0000-000000000001';
END;
$$ LANGUAGE plpgsql;

-- Funzione per validare l'accesso tenant-scoped
CREATE OR REPLACE FUNCTION validate_tenant_access(user_id UUID, resource_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_tenant_id UUID;
    has_global_access BOOLEAN;
BEGIN
    -- Ottieni il tenant dell'utente
    SELECT tenant_id INTO user_tenant_id FROM "User" WHERE id = user_id;
    
    -- Controlla se l'utente ha accesso globale
    SELECT EXISTS(
        SELECT 1 FROM enhanced_user_roles 
        WHERE user_id = user_id 
        AND role_type = 'global_admin' 
        AND is_active = true
    ) INTO has_global_access;
    
    -- Ritorna true se ha accesso globale o se i tenant coincidono
    RETURN has_global_access OR (user_tenant_id = resource_tenant_id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 11: Trigger per aggiornamento automatico
-- =====================================================

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica trigger alle nuove tabelle
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_configurations_updated_at
    BEFORE UPDATE ON tenant_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_user_roles_updated_at
    BEFORE UPDATE ON enhanced_user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_usage_updated_at
    BEFORE UPDATE ON tenant_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 12: Creazione viste per semplificare le query
-- =====================================================

-- Vista per utenti con informazioni tenant e ruoli
CREATE OR REPLACE VIEW user_tenant_roles AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u."firstName",
    u."lastName",
    u."isActive" as user_active,
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    eur.role_type,
    eur.role_scope,
    eur.permissions,
    eur.company_id,
    eur.is_active as role_active,
    c.ragione_sociale as company_name
FROM "User" u
JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN enhanced_user_roles eur ON u.id = eur.user_id AND eur.tenant_id = t.id
LEFT JOIN "Company" c ON eur.company_id = c.id
WHERE u.eliminato = false 
    AND t.eliminato = false 
    AND (eur.eliminato = false OR eur.eliminato IS NULL);

-- Vista per statistiche tenant
CREATE OR REPLACE VIEW tenant_statistics AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug,
    t.billing_plan,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT c.id) as total_companies,
    COUNT(DISTINCT co.id) as total_courses,
    COUNT(DISTINCT tr.id) as total_trainers,
    t.max_users,
    t.max_companies,
    t.created_at,
    t.is_active
FROM tenants t
LEFT JOIN "User" u ON t.id = u.tenant_id AND u.eliminato = false
LEFT JOIN "Company" c ON t.id = c.tenant_id AND c.eliminato = false
LEFT JOIN "Course" co ON t.id = co.tenant_id AND co.eliminato = false
LEFT JOIN "Trainer" tr ON t.id = tr.tenant_id AND tr.eliminato = false
WHERE t.eliminato = false
GROUP BY t.id, t.name, t.slug, t.billing_plan, t.max_users, t.max_companies, t.created_at, t.is_active;

-- =====================================================
-- MIGRATION COMPLETED
-- =====================================================

-- Log della migrazione
INSERT INTO migration_log (version, description, executed_at)
VALUES ('005', 'Multi-Tenant Implementation - Week 12', NOW())
ON CONFLICT (version) DO UPDATE SET 
    executed_at = NOW(),
    description = EXCLUDED.description;

COMMIT;