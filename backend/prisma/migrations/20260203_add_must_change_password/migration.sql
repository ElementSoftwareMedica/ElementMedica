-- AlterTable
ALTER TABLE "Person" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Comment
COMMENT ON COLUMN "Person"."mustChangePassword" IS 'Forza cambio password al primo accesso (true per utenti con password generata automaticamente)';
