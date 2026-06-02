CREATE TABLE IF NOT EXISTS "patient_guardians" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pazienteId" TEXT NOT NULL,
    "tutelanteId" TEXT NOT NULL,
    "relazione" VARCHAR(50) NOT NULL,
    "isLegalGuardian" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "validFrom" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(6),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "patient_guardians_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "patient_guardians_tenantId_pazienteId_tutelanteId_relazione_key"
    ON "patient_guardians"("tenantId", "pazienteId", "tutelanteId", "relazione");

CREATE INDEX IF NOT EXISTS "patient_guardians_tenantId_pazienteId_idx"
    ON "patient_guardians"("tenantId", "pazienteId");

CREATE INDEX IF NOT EXISTS "patient_guardians_tenantId_tutelanteId_idx"
    ON "patient_guardians"("tenantId", "tutelanteId");

CREATE INDEX IF NOT EXISTS "patient_guardians_deletedAt_idx"
    ON "patient_guardians"("deletedAt");

ALTER TABLE "patient_guardians"
    ADD CONSTRAINT "patient_guardians_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "patient_guardians"
    ADD CONSTRAINT "patient_guardians_pazienteId_fkey"
    FOREIGN KEY ("pazienteId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "patient_guardians"
    ADD CONSTRAINT "patient_guardians_tutelanteId_fkey"
    FOREIGN KEY ("tutelanteId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
