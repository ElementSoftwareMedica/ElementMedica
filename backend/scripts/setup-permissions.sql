-- Script per creare i permessi e assegnarli al ruolo ADMIN
-- Eseguire questo script direttamente nel database

-- Inserisci i permessi se non esistono già
INSERT INTO "Permission" (id, name, description, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'companies:read', 'Read companies', NOW(), NOW()),
  (gen_random_uuid(), 'companies:write', 'Write companies', NOW(), NOW()),
  (gen_random_uuid(), 'companies:create', 'Create companies', NOW(), NOW()),
  (gen_random_uuid(), 'companies:update', 'Update companies', NOW(), NOW()),
  (gen_random_uuid(), 'companies:delete', 'Delete companies', NOW(), NOW()),
  (gen_random_uuid(), 'users:read', 'Read users', NOW(), NOW()),
  (gen_random_uuid(), 'users:write', 'Write users', NOW(), NOW()),
  (gen_random_uuid(), 'users:create', 'Create users', NOW(), NOW()),
  (gen_random_uuid(), 'users:update', 'Update users', NOW(), NOW()),
  (gen_random_uuid(), 'users:delete', 'Delete users', NOW(), NOW()),
  (gen_random_uuid(), 'employees:read', 'Read employees', NOW(), NOW()),
  (gen_random_uuid(), 'employees:write', 'Write employees', NOW(), NOW()),
  (gen_random_uuid(), 'employees:create', 'Create employees', NOW(), NOW()),
  (gen_random_uuid(), 'employees:update', 'Update employees', NOW(), NOW()),
  (gen_random_uuid(), 'employees:delete', 'Delete employees', NOW(), NOW()),
  (gen_random_uuid(), 'courses:read', 'Read courses', NOW(), NOW()),
  (gen_random_uuid(), 'courses:write', 'Write courses', NOW(), NOW()),
  (gen_random_uuid(), 'courses:create', 'Create courses', NOW(), NOW()),
  (gen_random_uuid(), 'courses:update', 'Update courses', NOW(), NOW()),
  (gen_random_uuid(), 'courses:delete', 'Delete courses', NOW(), NOW()),
  (gen_random_uuid(), 'system:admin', 'System administration', NOW(), NOW()),
  (gen_random_uuid(), 'system:read', 'System read access', NOW(), NOW()),
  (gen_random_uuid(), 'system:write', 'System write access', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Assegna tutti i permessi al ruolo ADMIN
INSERT INTO "RolePermission" (id, "roleType", "permissionId", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'ADMIN',
  p.id,
  NOW(),
  NOW()
FROM "Permission" p
WHERE p.name IN (
  'companies:read', 'companies:write', 'companies:create', 'companies:update', 'companies:delete',
  'users:read', 'users:write', 'users:create', 'users:update', 'users:delete',
  'employees:read', 'employees:write', 'employees:create', 'employees:update', 'employees:delete',
  'courses:read', 'courses:write', 'courses:create', 'courses:update', 'courses:delete',
  'system:admin', 'system:read', 'system:write'
)
ON CONFLICT ("roleType", "permissionId") DO NOTHING;

-- Assegna tutti i permessi anche al ruolo SUPER_ADMIN
INSERT INTO "RolePermission" (id, "roleType", "permissionId", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'SUPER_ADMIN',
  p.id,
  NOW(),
  NOW()
FROM "Permission" p
WHERE p.name IN (
  'companies:read', 'companies:write', 'companies:create', 'companies:update', 'companies:delete',
  'users:read', 'users:write', 'users:create', 'users:update', 'users:delete',
  'employees:read', 'employees:write', 'employees:create', 'employees:update', 'employees:delete',
  'courses:read', 'courses:write', 'courses:create', 'courses:update', 'courses:delete',
  'system:admin', 'system:read', 'system:write'
)
ON CONFLICT ("roleType", "permissionId") DO NOTHING;

-- Verifica i permessi assegnati
SELECT 
  rp."roleType",
  p.name as permission_name,
  p.description
FROM "RolePermission" rp
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE rp."roleType" IN ('ADMIN', 'SUPER_ADMIN')
ORDER BY rp."roleType", p.name;