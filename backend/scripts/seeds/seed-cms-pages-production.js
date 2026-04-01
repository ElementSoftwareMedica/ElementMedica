/**
 * Seed CMS Pages - Production
 * 
 * Seeds all CMS pages for both tenants using dynamic tenant lookup.
 * Uses cms-pages-data.json as source data.
 * 
 * Run: cd backend && node scripts/seeds/seed-cms-pages-production.js
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Slug prefix mapping for tenants
const MEDICA_SLUGS = [
    'medica-homepage',
    'medica-medicina-del-lavoro',
    'medica-visite-specialistiche',
    'medica-diagnostica',
    'medica-contatti',
    'medica-prenota',
    'medica-chi-siamo'
];

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║   SEED CMS PAGES - PRODUCTION                               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // 1. Lookup tenants dynamically
    const tenants = await prisma.tenant.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, name: true, slug: true }
    });

    const sicurezzaTenant = tenants.find(t => t.slug === 'element-sicurezza');
    const medicaTenant = tenants.find(t => t.slug === 'element-medica');

    if (!sicurezzaTenant) {
        console.error('❌ Tenant element-sicurezza non trovato!');
        process.exit(1);
    }
    if (!medicaTenant) {
        console.error('❌ Tenant element-medica non trovato!');
        process.exit(1);
    }

    console.log(`📌 Element Sicurezza tenant: ${sicurezzaTenant.id}`);
    console.log(`📌 Element Medica tenant: ${medicaTenant.id}`);
    console.log('');

    // 2. Load pages data
    const dataPath = join(__dirname, 'cms-pages-data.json');
    const pagesData = JSON.parse(readFileSync(dataPath, 'utf-8'));
    console.log(`📄 Loaded ${pagesData.length} pages from cms-pages-data.json\n`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const pageData of pagesData) {
        // Determine tenant based on slug prefix
        const isMedicaPage = MEDICA_SLUGS.includes(pageData.slug) || pageData.slug.startsWith('medica-');
        const tenantId = isMedicaPage ? medicaTenant.id : sicurezzaTenant.id;
        const tenantName = isMedicaPage ? 'Medica' : 'Sicurezza';

        try {
            // Check if page exists
            const existing = await prisma.cMSPage.findFirst({
                where: { slug: pageData.slug, tenantId }
            });

            if (existing) {
                // Update existing
                await prisma.cMSPage.update({
                    where: { id: existing.id },
                    data: {
                        title: pageData.title,
                        content: pageData.content,
                        seoTitle: pageData.seoTitle || null,
                        seoDescription: pageData.seoDescription || null,
                        status: 'published',
                        isPublished: true,
                        publishedAt: existing.publishedAt || new Date(),
                        layout: pageData.layout || 'full-width',
                        blocks: pageData.blocks || [],
                        updatedAt: new Date()
                    }
                });
                console.log(`🔄 [${tenantName}] Aggiornata: ${pageData.slug}`);
                updated++;
            } else {
                // Create new
                await prisma.cMSPage.create({
                    data: {
                        id: crypto.randomUUID(),
                        slug: pageData.slug,
                        title: pageData.title,
                        content: pageData.content,
                        seoTitle: pageData.seoTitle || null,
                        seoDescription: pageData.seoDescription || null,
                        status: 'published',
                        isPublished: true,
                        publishedAt: new Date(),
                        layout: pageData.layout || 'full-width',
                        blocks: pageData.blocks || [],
                        tenantId
                    }
                });
                console.log(`✅ [${tenantName}] Creata: ${pageData.slug}`);
                created++;
            }
        } catch (error) {
            console.error(`❌ [${tenantName}] Errore per ${pageData.slug}: ${error.message}`);
            errors++;
        }
    }

    // 3. Summary
    console.log('\n📊 RIEPILOGO');
    console.log('===========');
    console.log(`  Pagine create: ${created}`);
    console.log(`  Pagine aggiornate: ${updated}`);
    console.log(`  Errori: ${errors}`);

    // Verify
    const sicurezzaCount = await prisma.cMSPage.count({ where: { tenantId: sicurezzaTenant.id, deletedAt: null } });
    const medicaCount = await prisma.cMSPage.count({ where: { tenantId: medicaTenant.id, deletedAt: null } });
    console.log(`\n  Element Sicurezza: ${sicurezzaCount} pagine totali`);
    console.log(`  Element Medica: ${medicaCount} pagine totali`);
    console.log('\n✅ SEED COMPLETATO!\n');

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('❌ Fatal error:', e);
    await prisma.$disconnect();
    process.exit(1);
});
