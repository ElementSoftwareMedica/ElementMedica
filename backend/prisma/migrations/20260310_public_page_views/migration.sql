-- CreateTable: Public Page Views (analytics per tutte le pagine pubbliche)
CREATE TABLE "public_page_views" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "pageType" VARCHAR(50) NOT NULL,
    "sessionId" TEXT,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "referer" TEXT,
    "device" VARCHAR(20),
    "browser" VARCHAR(50),
    "os" VARCHAR(50),
    "duration" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_page_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "public_page_views_tenantId_idx" ON "public_page_views"("tenantId");
CREATE INDEX "public_page_views_tenantId_pageType_idx" ON "public_page_views"("tenantId", "pageType");
CREATE INDEX "public_page_views_tenantId_createdAt_idx" ON "public_page_views"("tenantId", "createdAt");
CREATE INDEX "public_page_views_path_idx" ON "public_page_views"("path");
CREATE INDEX "public_page_views_sessionId_idx" ON "public_page_views"("sessionId");
