-- Script per aggiungere i permessi per le submission
-- Eseguire questo script direttamente nel database

-- Inserisci i nuovi permessi per le submission
INSERT INTO "Permission" (id, name, description, resource, action, "createdAt", "updatedAt", scope)
VALUES 
  (gen_random_uuid(), 'VIEW_SUBMISSIONS', 'View contact submissions', 'submissions', 'read', NOW(), NOW(), 'all'),
  (gen_random_uuid(), 'MANAGE_SUBMISSIONS', 'Manage contact submissions', 'submissions', 'write', NOW(), NOW(), 'all'),
  (gen_random_uuid(), 'EXPORT_SUBMISSIONS', 'Export submission data', 'submissions', 'export', NOW(), NOW(), 'all')
ON CONFLICT (name) DO NOTHING;

-- Assegna i permessi submission al ruolo ADMIN
INSERT INTO "RolePermission" (id, "roleType", "permissionId", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'ADMIN',
  p.id,
  NOW(),
  NOW()
FROM "Permission" p
WHERE p.name IN (
  'VIEW_SUBMISSIONS', 
  'MANAGE_SUBMISSIONS', 
  'EXPORT_SUBMISSIONS'
)
ON CONFLICT ("roleType", "permissionId") DO NOTHING;

-- Assegna i permessi submission anche al ruolo SUPER_ADMIN
INSERT INTO "RolePermission" (id, "roleType", "permissionId", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'SUPER_ADMIN',
  p.id,
  NOW(),
  NOW()
FROM "Permission" p
WHERE p.name IN (
  'VIEW_SUBMISSIONS', 
  'MANAGE_SUBMISSIONS', 
  'EXPORT_SUBMISSIONS'
)
ON CONFLICT ("roleType", "permissionId") DO NOTHING;

-- Verifica i nuovi permessi assegnati
SELECT 
  rp."roleType",
  p.name as permission_name,
  p.description
FROM "RolePermission" rp
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE p.name IN ('VIEW_SUBMISSIONS', 'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS')
ORDER BY rp."roleType", p.name;