-- CreateEnum
CREATE TYPE "StatoBridgeLicense" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "bridge_licenses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "licenseKey" VARCHAR(19) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "status" "StatoBridgeLicense" NOT NULL DEFAULT 'PENDING',
    "apiKey" TEXT,
    "machineId" TEXT,
    "machineName" TEXT,
    "bridgeVersion" VARCHAR(20),
    "deviceConfig" JSONB DEFAULT '[]',
    "activatedAt" TIMESTAMP(6),
    "lastSeenAt" TIMESTAMP(6),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "bridge_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bridge_licenses_licenseKey_key" ON "bridge_licenses"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "bridge_licenses_apiKey_key" ON "bridge_licenses"("apiKey");

-- CreateIndex
CREATE INDEX "bridge_licenses_tenantId_idx" ON "bridge_licenses"("tenantId");

-- CreateIndex
CREATE INDEX "bridge_licenses_status_idx" ON "bridge_licenses"("status");

-- CreateIndex
CREATE INDEX "bridge_licenses_tenantId_status_idx" ON "bridge_licenses"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bridge_licenses_licenseKey_idx" ON "bridge_licenses"("licenseKey");

-- AddForeignKey
ALTER TABLE "bridge_licenses" ADD CONSTRAINT "bridge_licenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
