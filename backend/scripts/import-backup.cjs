/**
 * Import backup data from a backup directory into the current database.
 * Adapts old backup schema to current Prisma schema.
 * 
 * Usage: node scripts/import-backup.js [backup-dir]
 * 
 * Maps old tenant IDs to current ones based on user-configurable mapping.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================
const BACKUP_DIR = process.argv[2];
if (!BACKUP_DIR) {
  console.error('Usage: node scripts/import-backup.cjs <backup-dir>');
  process.exit(1);
}

// Step 1: Detect tenants
async function detectAndMap() {
  // Read all backup files
  const files = {
    templateLinks: JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'TemplateLink.json'), 'utf-8')),
    cmsPages: JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'cms_pages.json'), 'utf-8')),
    cmsMedia: JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'cms_media.json'), 'utf-8')),
    formTemplates: JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'form_templates.json'), 'utf-8')),
  };

  // Collect unique tenant IDs from backup
  const backupTenantIds = new Set();
  Object.values(files).forEach(arr => {
    arr.forEach(item => backupTenantIds.add(item.tenantId));
  });
  console.log('\n📦 Backup tenant IDs found:');
  backupTenantIds.forEach(id => {
    const count = Object.values(files).flat().filter(x => x.tenantId === id).length;
    console.log(`  ${id} (${count} records)`);
  });

  // Get current tenants from DB
  const dbTenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log('\n🏢 Current DB tenants:');
  dbTenants.forEach(t => console.log(`  ${t.id} - ${t.name}`));

  return { files, backupTenantIds: [...backupTenantIds], dbTenants };
}

// Build tenant mapping
function buildTenantMapping(backupTenantIds, dbTenants) {
  // Map backup tenants to current DB tenants
  // The main backup tenant (most records) maps to "Element Sicurezza"
  const mapping = {};

  // Find "Element Sicurezza" and "Element Medica" in DB
  const formazione = dbTenants.find(t => t.name.includes('Formazione'));
  const medica = dbTenants.find(t => t.name.includes('Medica'));

  // The primary backup tenant is the one with most data
  // In our case: 8abacb72-e5b5-448a-965d-e6d6d0c5213c -> Element Sicurezza
  // Map all backup tenants to Element Sicurezza by default
  for (const tid of backupTenantIds) {
    mapping[tid] = formazione ? formazione.id : dbTenants[0].id;
  }

  console.log('\n🗺️  Tenant mapping:');
  for (const [old, newId] of Object.entries(mapping)) {
    const newTenant = dbTenants.find(t => t.id === newId);
    console.log(`  ${old} → ${newId} (${newTenant?.name || 'unknown'})`);
  }

  return mapping;
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

async function importTemplateLinks(data, tenantMapping) {
  console.log(`\n📄 Importing ${data.length} TemplateLinks...`);
  let imported = 0, skipped = 0, errors = 0;

  for (const item of data) {
    try {
      const newTenantId = tenantMapping[item.tenantId];

      // Check if already exists
      const existing = await prisma.templateLink.findUnique({ where: { id: item.id } });
      if (existing) {
        console.log(`  ⏭️  Skip (exists): ${item.name}`);
        skipped++;
        continue;
      }

      // Adapt fields: companyId -> companyTenantProfileId (set null, old FK won't exist)
      await prisma.templateLink.create({
        data: {
          id: item.id,
          name: item.name,
          url: item.url || '',
          content: item.content || null,
          footer: item.footer || null,
          header: item.header || null,
          isDefault: item.isDefault || false,
          logoPosition: item.logoPosition || null,
          googleDocsUrl: item.googleDocsUrl || null,
          logoImage: item.logoImage || null,
          companyTenantProfileId: null, // old backup had "companyId" which doesn't exist anymore
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
          tenantId: newTenantId,
          // updatedAt is auto-managed by @updatedAt
          category: item.category || null,
          createdBy: null, // old createdBy FK may not exist in new DB
          description: item.description || null,
          isActive: item.isActive !== undefined ? item.isActive : true,
          lastSyncedAt: item.lastSyncedAt ? new Date(item.lastSyncedAt) : null,
          layout: item.layout || null,
          markerSchema: item.markerSchema || null,
          markers: item.markers || null,
          styles: item.styles || null,
          syncEnabled: item.syncEnabled || false,
          tags: item.tags || [],
          version: item.version || 1,
          type: item.type, // Must be valid TemplateType enum
          fileFormat: item.fileFormat || 'HTML',
          autoSync: item.autoSync || false,
          googleDocsId: item.googleDocsId || null,
          googleSlidesId: item.googleSlidesId || null,
        }
      });
      console.log(`  ✅ Imported: ${item.name} (${item.type})`);
      imported++;
    } catch (err) {
      console.error(`  ❌ Error importing "${item.name}": ${err.message}`);
      errors++;
    }
  }
  console.log(`  📊 TemplateLinks: ${imported} imported, ${skipped} skipped, ${errors} errors`);
}

async function importCmsPages(data, tenantMapping) {
  console.log(`\n📰 Importing ${data.length} CMS Pages...`);
  let imported = 0, skipped = 0, errors = 0;

  for (const item of data) {
    try {
      const newTenantId = tenantMapping[item.tenantId];

      // Check if already exists
      const existing = await prisma.cMSPage.findUnique({ where: { id: item.id } });
      if (existing) {
        console.log(`  ⏭️  Skip (exists): ${item.title}`);
        skipped++;
        continue;
      }

      // Check unique constraint: tenantId + slug
      const existingSlug = await prisma.cMSPage.findUnique({
        where: { tenantId_slug: { tenantId: newTenantId, slug: item.slug } }
      });
      if (existingSlug) {
        console.log(`  ⏭️  Skip (slug exists): ${item.slug}`);
        skipped++;
        continue;
      }

      await prisma.cMSPage.create({
        data: {
          id: item.id,
          slug: item.slug,
          title: item.title,
          content: item.content || {},
          seoTitle: item.seoTitle || null,
          seoDescription: item.seoDescription || null,
          isPublished: item.isPublished || false,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          // updatedAt is auto-managed
          deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
          tenantId: newTenantId,
          blocks: item.blocks || null,
          layout: item.layout || 'full-width',
          status: item.status || 'draft',
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          scheduledAt: item.scheduledAt ? new Date(item.scheduledAt) : null,
          seoId: item.seoId || null,
          createdBy: null, // FK may not exist
        }
      });
      console.log(`  ✅ Imported: ${item.title} (/${item.slug})`);
      imported++;
    } catch (err) {
      console.error(`  ❌ Error importing "${item.title}": ${err.message}`);
      errors++;
    }
  }
  console.log(`  📊 CMS Pages: ${imported} imported, ${skipped} skipped, ${errors} errors`);
}

async function importCmsMedia(data, tenantMapping) {
  console.log(`\n🖼️  Importing ${data.length} CMS Media...`);
  let imported = 0, skipped = 0, errors = 0;

  for (const item of data) {
    try {
      const newTenantId = tenantMapping[item.tenantId];

      // Check if already exists
      const existing = await prisma.cMSMedia.findUnique({ where: { id: item.id } });
      if (existing) {
        console.log(`  ⏭️  Skip (exists): ${item.originalName}`);
        skipped++;
        continue;
      }

      await prisma.cMSMedia.create({
        data: {
          id: item.id,
          filename: item.filename,
          originalName: item.originalName,
          mimeType: item.mimeType,
          size: item.size,
          url: item.url,
          alt: item.alt || null,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
          tenantId: newTenantId,
          path: item.path || null,
          variants: item.variants || null,
          title: item.title || null,
          description: item.description || null,
          folderId: item.folder_id || item.folderId || null, // backup uses snake_case
          tags: item.tags || [],
          metadata: item.metadata || null,
          createdBy: null, // FK may not exist
          updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
        }
      });
      console.log(`  ✅ Imported: ${item.originalName}`);
      imported++;
    } catch (err) {
      console.error(`  ❌ Error importing "${item.originalName}": ${err.message}`);
      errors++;
    }
  }
  console.log(`  📊 CMS Media: ${imported} imported, ${skipped} skipped, ${errors} errors`);
}

async function importFormTemplates(data, tenantMapping) {
  console.log(`\n📋 Importing ${data.length} Form Templates...`);
  let imported = 0, skipped = 0, errors = 0;

  // Valid SubmissionType values
  const validTypes = [
    'CONTACT', 'JOB_APPLICATION', 'QUOTE_REQUEST', 'CONSULTATION',
    'COURSE_TEST', 'COURSE_EVALUATION', 'PERSON_DATA_COLLECTION',
    'COURSE_ENROLLMENT', 'CUSTOM_FORM'
  ];

  for (const item of data) {
    try {
      const newTenantId = tenantMapping[item.tenantId];

      // Check if already exists
      const existing = await prisma.formTemplate.findUnique({ where: { id: item.id } });
      if (existing) {
        console.log(`  ⏭️  Skip (exists): ${item.name}`);
        skipped++;
        continue;
      }

      // Check unique constraint: tenantId + name + version
      const existingNameVer = await prisma.formTemplate.findUnique({
        where: {
          tenantId_name_version: {
            tenantId: newTenantId,
            name: item.name,
            version: item.version || 1
          }
        }
      });
      if (existingNameVer) {
        console.log(`  ⏭️  Skip (name+version exists): ${item.name} v${item.version}`);
        skipped++;
        continue;
      }

      // Validate type
      const type = validTypes.includes(item.type) ? item.type : 'CUSTOM_FORM';
      if (type !== item.type) {
        console.log(`  ⚠️  Type ${item.type} → ${type} for "${item.name}"`);
      }

      await prisma.formTemplate.create({
        data: {
          id: item.id,
          name: item.name,
          description: item.description || null,
          type: type,
          schema: item.schema || {},
          validationRules: item.validationRules || null,
          conditionalFields: item.conditionalFields || null,
          isActive: item.isActive !== undefined ? item.isActive : true,
          version: item.version || 1,
          tenantId: newTenantId,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
          createdById: null, // FK may not exist in new DB
          allowAnonymous: item.allowAnonymous || false,
          isPublic: item.isPublic || false,
          settings: item.settings || null,
        }
      });
      console.log(`  ✅ Imported: ${item.name} (${type})`);
      imported++;
    } catch (err) {
      console.error(`  ❌ Error importing "${item.name}": ${err.message}`);
      errors++;
    }
  }
  console.log(`  📊 Form Templates: ${imported} imported, ${skipped} skipped, ${errors} errors`);
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log('🚀 Backup Import Script');
  console.log(`📂 Backup dir: ${BACKUP_DIR}`);

  try {
    const { files, backupTenantIds, dbTenants } = await detectAndMap();
    const tenantMapping = buildTenantMapping(backupTenantIds, dbTenants);

    // Import in order (no FK dependencies between these entities)
    await importCmsMedia(files.cmsMedia, tenantMapping);
    await importTemplateLinks(files.templateLinks, tenantMapping);
    await importCmsPages(files.cmsPages, tenantMapping);
    await importFormTemplates(files.formTemplates, tenantMapping);

    console.log('\n✅ Import completed!');
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
