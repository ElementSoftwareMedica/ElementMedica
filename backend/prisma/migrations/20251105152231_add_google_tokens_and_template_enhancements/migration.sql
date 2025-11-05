-- AlterTable
ALTER TABLE "TemplateLink" ADD COLUMN     "autoSync" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleDocsId" TEXT,
ADD COLUMN     "googleSlidesId" TEXT;

-- CreateTable
CREATE TABLE "GoogleTokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiryDate" BIGINT NOT NULL,
    "scope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleTokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoogleTokens_userId_idx" ON "GoogleTokens"("userId");

-- CreateIndex
CREATE INDEX "GoogleTokens_tenantId_idx" ON "GoogleTokens"("tenantId");

-- CreateIndex
CREATE INDEX "GoogleTokens_expiryDate_idx" ON "GoogleTokens"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleTokens_userId_tenantId_key" ON "GoogleTokens"("userId", "tenantId");

-- AddForeignKey
ALTER TABLE "GoogleTokens" ADD CONSTRAINT "GoogleTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleTokens" ADD CONSTRAINT "GoogleTokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
