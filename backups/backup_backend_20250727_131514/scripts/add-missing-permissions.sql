-- Aggiungi i permessi mancanti all'enum person_permissions
ALTER TYPE "person_permissions" ADD VALUE 'CREATE_ROLES';
ALTER TYPE "person_permissions" ADD VALUE 'EDIT_ROLES';
ALTER TYPE "person_permissions" ADD VALUE 'DELETE_ROLES';