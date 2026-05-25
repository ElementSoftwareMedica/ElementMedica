-- CreateEnum
CREATE TYPE "StatoDesktopLicense" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "desktop_licenses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "licenseKey" VARCHAR(19) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "status" "StatoDesktopLicense" NOT NULL DEFAULT 'PENDING',
    "machineId" TEXT,
    "machineName" TEXT,
    "appVersion" VARCHAR(20),
    "activatedAt" TIMESTAMP(6),
    "lastSeenAt" TIMESTAMP(6),
    "expiresAt" TIMESTAMP(6),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "desktop_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "desktop_licenses_licenseKey_key" ON "desktop_licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "desktop_licenses_tenantId_idx" ON "desktop_licenses"("tenantId");

-- CreateIndex
CREATE INDEX "desktop_licenses_status_idx" ON "desktop_licenses"("status");

-- CreateIndex
CREATE INDEX "desktop_licenses_tenantId_status_idx" ON "desktop_licenses"("tenantId", "status");

-- CreateIndex
CREATE INDEX "desktop_licenses_licenseKey_idx" ON "desktop_licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "desktop_licenses_machineId_idx" ON "desktop_licenses"("machineId");

-- AddForeignKey
ALTER TABLE "desktop_licenses" ADD CONSTRAINT "desktop_licenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
