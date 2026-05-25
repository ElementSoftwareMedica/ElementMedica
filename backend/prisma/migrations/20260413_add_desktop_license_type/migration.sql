-- CreateEnum (new license type enum)
CREATE TYPE "TipoDesktopLicense" AS ENUM ('APP_ONLY', 'BRIDGE_ONLY', 'APP_AND_BRIDGE');

-- AddColumn licenseType to desktop_licenses
ALTER TABLE "desktop_licenses" ADD COLUMN "licenseType" "TipoDesktopLicense" NOT NULL DEFAULT 'APP_ONLY';
