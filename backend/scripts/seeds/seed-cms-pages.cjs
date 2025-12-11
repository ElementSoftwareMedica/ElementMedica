/**
 * SEED CMS PAGES - Element Formazione & Element Medica
 * 
 * Questo script ripristina tutte le pagine CMS pubbliche nel database.
 * Usa questo script dopo un reset del database o per sincronizzare
 * le pagine tra ambienti (dev, staging, production).
 * 
 * USAGE:
 *   cd backend
 *   node scripts/seeds/seed-cms-pages.js
 * 
 * OPTIONS:
 *   --dry-run    Mostra cosa verrebbe fatto senza modificare il DB
 *   --force      Sovrascrive le pagine esistenti
 *   --tenant=X   Seed solo per un tenant specifico
 * 
 * TENANT IDs:
 *   Element Formazione: d2bbc5b0-344c-47c7-8ef5-f57755293372
 *   Element Medica:     tenant-element-medica-001
 * 
 * Last updated: 2025-11-29
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const tenantArg = args.find(a => a.startsWith('--tenant='));
const filterTenant = tenantArg ? tenantArg.split('=')[1] : null;

// Tenant configurations
const TENANTS = {
  'formazione': {
    id: 'd2bbc5b0-344c-47c7-8ef5-f57755293372',
    name: 'Element Formazione',
    slugPrefix: ''
  },
  'medica': {
    id: 'tenant-element-medica-001',
    name: 'Element Medica', 
    slugPrefix: 'medica-'
  }
};

async function loadPagesData() {
  const dataPath = path.join(__dirname, 'cms-pages-data.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ File cms-pages-data.json non trovato!');
    console.error('   Percorso atteso:', dataPath);
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`📄 Caricate ${data.length} pagine dal file di seed\n`);
  return data;
}

async function seedPages() {
  console.log('🌱 CMS Pages Seed Script');
  console.log('========================\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - Nessuna modifica verrà effettuata\n');
  }
  
  if (isForce) {
    console.log('⚠️  FORCE MODE - Le pagine esistenti verranno sovrascritte\n');
  }
  
  if (filterTenant) {
    console.log(`🎯 Filtrando per tenant: ${filterTenant}\n`);
  }
  
  const pages = await loadPagesData();
  
  // Filter by tenant if specified
  const filteredPages = filterTenant 
    ? pages.filter(p => p.tenantId === filterTenant || p.tenantId.includes(filterTenant))
    : pages;
  
  const stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };
  
  for (const page of filteredPages) {
    try {
      // Check if page exists
      const existing = await prisma.cMSPage.findFirst({
        where: { slug: page.slug }
      });
      
      if (existing && !isForce) {
        console.log(`⏭️  Skipping: ${page.slug} (exists, use --force to overwrite)`);
        stats.skipped++;
        continue;
      }
      
      if (isDryRun) {
        console.log(`📝 Would ${existing ? 'update' : 'create'}: ${page.slug}`);
        continue;
      }
      
      if (existing) {
        // Update existing page
        await prisma.cMSPage.update({
          where: { id: existing.id },
          data: {
            title: page.title,
            content: page.content,
            status: page.status,
            updatedAt: new Date()
          }
        });
        console.log(`✏️  Updated: ${page.slug}`);
        stats.updated++;
      } else {
        // Create new page
        await prisma.cMSPage.create({
          data: {
            slug: page.slug,
            title: page.title,
            tenantId: page.tenantId,
            status: page.status,
            content: page.content
          }
        });
        console.log(`✅ Created: ${page.slug}`);
        stats.created++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${page.slug}:`, error.message);
      stats.errors++;
    }
  }
  
  // Print summary
  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`  Created: ${stats.created}`);
  console.log(`  Updated: ${stats.updated}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Errors:  ${stats.errors}`);
  console.log(`  Total:   ${filteredPages.length}`);
  
  return stats;
}

async function verifyPages() {
  console.log('\n🔍 Verification');
  console.log('===============');
  
  for (const [key, tenant] of Object.entries(TENANTS)) {
    const count = await prisma.cMSPage.count({
      where: { tenantId: tenant.id }
    });
    console.log(`  ${tenant.name}: ${count} pages`);
  }
}

async function main() {
  try {
    await seedPages();
    
    if (!isDryRun) {
      await verifyPages();
    }
    
    console.log('\n✨ Done!');
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
