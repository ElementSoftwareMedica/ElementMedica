-- AlterTable: Add numeroPAT (Posizione Assicurativa Territoriale INAIL) to CompanySite
ALTER TABLE "company_sites" ADD COLUMN IF NOT EXISTS "numeroPAT" VARCHAR(20);
