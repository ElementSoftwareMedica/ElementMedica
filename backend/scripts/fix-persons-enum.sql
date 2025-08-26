-- Script SQL per aggiungere i permessi persons all'enum PersonPermission
-- Risolve il problema di "Accesso Negato" per le pagine persons, employees e trainers

BEGIN;

-- Aggiungi i permessi persons all'enum person_permissions
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_PERSONS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_PERSONS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_PERSONS';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_PERSONS';

-- Verifica che i valori siano stati aggiunti
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'person_permissions'
)
ORDER BY enumlabel;

COMMIT;