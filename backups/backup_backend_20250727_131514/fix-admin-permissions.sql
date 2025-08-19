-- Script SQL per correggere i permessi dell'utente admin
-- Eseguire questo script direttamente nel database PostgreSQL

-- 1. Trova l'ID dell'utente admin
SELECT id, email, "firstName", "lastName" FROM "Person" WHERE email = 'admin@example.com';

-- 2. Verifica i ruoli attuali dell'admin
SELECT pr.id, pr."roleType", pr."isActive", pr."isPrimary", pr."companyId", pr."tenantId"
FROM "PersonRole" pr
JOIN "Person" p ON pr."personId" = p.id
WHERE p.email = 'admin@example.com' AND pr."isActive" = true;

-- 3. Verifica i permessi attuali
SELECT rp.permission, rp."isGranted"
FROM "RolePermission" rp
JOIN "PersonRole" pr ON rp."personRoleId" = pr.id
JOIN "Person" p ON pr."personId" = p.id
WHERE p.email = 'admin@example.com' AND pr."isActive" = true;

-- 4. Se l'admin non ha un ruolo SUPER_ADMIN, crealo
-- (Sostituire ADMIN_PERSON_ID con l'ID effettivo dell'admin ottenuto dal punto 1)
-- (Sostituire COMPANY_ID e TENANT_ID con i valori corretti dell'admin)

/*
INSERT INTO "PersonRole" ("personId", "roleType", "isActive", "isPrimary", "companyId", "tenantId", "createdAt", "updatedAt")
VALUES (ADMIN_PERSON_ID, 'SUPER_ADMIN', true, true, COMPANY_ID, TENANT_ID, NOW(), NOW())
ON CONFLICT DO NOTHING;
*/

-- 5. Ottieni l'ID del ruolo SUPER_ADMIN dell'admin
-- (Sostituire ADMIN_PERSON_ID con l'ID effettivo dell'admin)
/*
SELECT pr.id as role_id
FROM "PersonRole" pr
JOIN "Person" p ON pr."personId" = p.id
WHERE p.email = 'admin@example.com' AND pr."roleType" = 'SUPER_ADMIN' AND pr."isActive" = true;
*/

-- 6. Aggiungi tutti i permessi necessari al ruolo SUPER_ADMIN
-- (Sostituire SUPER_ADMIN_ROLE_ID con l'ID del ruolo ottenuto dal punto 5)

/*
INSERT INTO "RolePermission" ("personRoleId", "permission", "isGranted", "createdAt", "updatedAt")
VALUES 
    (SUPER_ADMIN_ROLE_ID, 'VIEW_EMPLOYEES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'CREATE_EMPLOYEES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'EDIT_EMPLOYEES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'DELETE_EMPLOYEES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'VIEW_COMPANIES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'CREATE_COMPANIES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'EDIT_COMPANIES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'DELETE_COMPANIES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'VIEW_TRAINERS', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'CREATE_TRAINERS', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'EDIT_TRAINERS', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'DELETE_TRAINERS', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'VIEW_COURSES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'CREATE_COURSES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'EDIT_COURSES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'DELETE_COURSES', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'VIEW_USERS', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'CREATE_USERS', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'EDIT_USERS', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'DELETE_USERS', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'ADMIN_PANEL', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'SYSTEM_SETTINGS', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'USER_MANAGEMENT', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'ROLE_MANAGEMENT', true, NOW(), NOW()),
    (SUPER_ADMIN_ROLE_ID, 'TENANT_MANAGEMENT', true, NOW(), NOW())
ON CONFLICT ("personRoleId", "permission") DO UPDATE SET
    "isGranted" = EXCLUDED."isGranted",
    "updatedAt" = NOW();
*/

-- 7. Verifica che i permessi siano stati aggiunti correttamente
SELECT rp.permission, rp."isGranted"
FROM "RolePermission" rp
JOIN "PersonRole" pr ON rp."personRoleId" = pr.id
JOIN "Person" p ON pr."personId" = p.id
WHERE p.email = 'admin@example.com' AND pr."isActive" = true AND rp."isGranted" = true
ORDER BY rp.permission;