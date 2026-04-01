-- P65 Enhancement: Add signature feature flags
-- Aggiunge feature keys per firme digitali premium

-- Add new feature keys to enum (PostgreSQL ALTER TYPE)
ALTER TYPE feature_keys ADD VALUE IF NOT EXISTS 'FIRMA_GRAFOMETRICA';
ALTER TYPE feature_keys ADD VALUE IF NOT EXISTS 'FIRMA_FEQ';
ALTER TYPE feature_keys ADD VALUE IF NOT EXISTS 'FIRMA_FEA';
ALTER TYPE feature_keys ADD VALUE IF NOT EXISTS 'FIRMA_REMOTA';
ALTER TYPE feature_keys ADD VALUE IF NOT EXISTS 'FIRMA_BIOMETRICA';
ALTER TYPE feature_keys ADD VALUE IF NOT EXISTS 'FSE_EXPORT_CDA';
ALTER TYPE feature_keys ADD VALUE IF NOT EXISTS 'FSE_CONSENSI_AVANZATI';

-- Comment
COMMENT ON TYPE feature_keys IS 'Feature keys per commercializzazione subscription-based. Include P65 premium signature features.';
