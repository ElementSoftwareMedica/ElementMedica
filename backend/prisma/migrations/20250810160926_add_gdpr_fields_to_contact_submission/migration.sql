-- AlterTable
ALTER TABLE "contact_submissions" ADD COLUMN     "marketingAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "privacyAccepted" BOOLEAN NOT NULL DEFAULT false;
