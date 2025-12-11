-- ========================================
-- SEO SYSTEM MIGRATION - FASE 1
-- Date: 15 November 2025
-- Description: Add SEO models (SEOConfig, Sitemap) and permissions
-- ========================================

-- Step 1: Create SEOConfig table
CREATE TABLE "seo_configs" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canonicalUrl" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "nofollow" BOOLEAN NOT NULL DEFAULT false,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "ogType" TEXT DEFAULT 'website',
    "twitterCard" TEXT DEFAULT 'summary_large_image',
    "twitterSite" TEXT,
    "twitterCreator" TEXT,
    "twitterImage" TEXT,
    "structuredData" JSONB,
    "hreflang" JSONB,
    "preloadImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_configs_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create Sitemap table
CREATE TABLE "sitemaps" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "changefreq" TEXT NOT NULL,
    "priority" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastmod" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sitemaps_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create unique constraints
CREATE UNIQUE INDEX "seo_configs_pageId_key" ON "seo_configs"("pageId");
CREATE UNIQUE INDEX "seo_configs_courseId_key" ON "seo_configs"("courseId");
CREATE UNIQUE INDEX "sitemaps_url_tenantId_key" ON "sitemaps"("url", "tenantId");

-- Step 4: Create indexes for performance
CREATE INDEX "seo_configs_tenantId_idx" ON "seo_configs"("tenantId");
CREATE INDEX "seo_configs_pageId_idx" ON "seo_configs"("pageId");
CREATE INDEX "seo_configs_courseId_idx" ON "seo_configs"("courseId");

CREATE INDEX "sitemaps_tenantId_isPublic_idx" ON "sitemaps"("tenantId", "isPublic");
CREATE INDEX "sitemaps_entityType_entityId_idx" ON "sitemaps"("entityType", "entityId");
CREATE INDEX "sitemaps_lastmod_idx" ON "sitemaps"("lastmod");

-- Step 5: Add foreign key constraints
ALTER TABLE "seo_configs" ADD CONSTRAINT "seo_configs_pageId_fkey" 
    FOREIGN KEY ("pageId") REFERENCES "cms_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_configs" ADD CONSTRAINT "seo_configs_courseId_fkey" 
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seo_configs" ADD CONSTRAINT "seo_configs_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sitemaps" ADD CONSTRAINT "sitemaps_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add new permissions to PersonPermission enum
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'VIEW_SEO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'CREATE_SEO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'EDIT_SEO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'DELETE_SEO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'MANAGE_SEO';
ALTER TYPE "person_permissions" ADD VALUE IF NOT EXISTS 'GENERATE_SITEMAP';

-- Migration complete
-- Next steps:
-- 1. Run SEO service implementation
-- 2. Add API routes for SEO management
-- 3. Create frontend components for SEO editing
