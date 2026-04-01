/**
 * fix-cms-tenant-ids.js
 * 
 * Fix CMS pages che sono state seeded con tenantId hardcoded sbagliato.
 * 
 * Problema: script precedenti usavano IDs fissi ('tenant-element-medica-001', 
 * 'tenant-id-medica') invece del TenantId reale del DB.
 * 
 * Soluzione: Trova i tenant reali per slug, poi riassegna le pagine.
 * 
 * Run (su server):
 *   cd backend && node scripts/seeds/fix-cms-tenant-ids.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs hardcoded usati dai vecchi script di seeding
const LEGACY_MEDICA_IDS = ['tenant-element-medica-001', 'tenant-id-medica'];

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║   FIX CMS TENANT IDs                                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // 1. Risolvi i tenant reali per slug
    const tenants = await prisma.tenant.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, slug: true, name: true }
    });

    const medicaTenant = tenants.find(t => t.slug === 'element-medica');
    const sicurezzaTenant = tenants.find(t => t.slug === 'element-sicurezza');

    if (!medicaTenant) {
        console.warn('⚠️  Tenant element-medica non trovato - skip fix medica pages');
    } else {
        console.log(`📌 Element Medica tenant: ${medicaTenant.id} (slug: ${medicaTenant.slug})`);
    }
    if (sicurezzaTenant) {
        console.log(`📌 Element Sicurezza tenant: ${sicurezzaTenant.id} (slug: ${sicurezzaTenant.slug})`);
    }
    console.log('');

    // Lista tutti i tenantId presenti per debug
    const allTenantIds = await prisma.cMSPage.groupBy({
        by: ['tenantId'],
        _count: { id: true },
        where: { deletedAt: null }
    });
    console.log('📋 TenantId attualmente in uso nelle CMS pages:');
    for (const row of allTenantIds) {
        const known = tenants.find(t => t.id === row.tenantId);
        const label = known ? `[${known.slug}]` : LEGACY_MEDICA_IDS.includes(row.tenantId) ? '[LEGACY]' : '[UNKNOWN]';
        console.log(`   ${label} ${row.tenantId}: ${row._count.id} pagine`);
    }
    console.log('');

    let totalFixed = 0;

    // 2. Fix pagine medica (slug prefisso 'medica-') con tenantId legacy sbagliato
    if (medicaTenant) {
        for (const legacyId of LEGACY_MEDICA_IDS) {
            if (legacyId === medicaTenant.id) continue; // già corretto

            const pages = await prisma.cMSPage.findMany({
                where: { tenantId: legacyId, deletedAt: null },
                select: { id: true, slug: true, tenantId: true }
            });

            if (pages.length === 0) {
                console.log(`✓ Nessuna pagina con legacyId=${legacyId}`);
                continue;
            }

            console.log(`🔄 Trovate ${pages.length} pagine con tenantId legacy (${legacyId})`);

            for (const page of pages) {
                // Verifica se esiste già una pagina con stesso slug nel tenant corretto
                const existing = await prisma.cMSPage.findFirst({
                    where: { slug: page.slug, tenantId: medicaTenant.id, deletedAt: null }
                });

                if (existing) {
                    console.log(`   ⏩ Skip ${page.slug} - già presente nel tenant corretto (${medicaTenant.id})`);
                    continue;
                }

                await prisma.cMSPage.update({
                    where: { id: page.id },
                    data: { tenantId: medicaTenant.id }
                });
                console.log(`   ✅ Fixed: ${page.slug} → tenantId=${medicaTenant.id}`);
                totalFixed++;
            }
        }
    }

    // 3. Report finale
    console.log('\n📊 RIEPILOGO');
    console.log('===========');
    console.log(`  Pagine riassegnate: ${totalFixed}`);

    if (medicaTenant) {
        const medicaCount = await prisma.cMSPage.count({
            where: { tenantId: medicaTenant.id, deletedAt: null }
        });
        console.log(`  Element Medica pages totali: ${medicaCount}`);
    }
    if (sicurezzaTenant) {
        const sicurezzaCount = await prisma.cMSPage.count({
            where: { tenantId: sicurezzaTenant.id, deletedAt: null }
        });
        console.log(`  Element Sicurezza pages totali: ${sicurezzaCount}`);
    }

    // Pagine ancora con IDs legacy
    const orphaned = await prisma.cMSPage.count({
        where: { tenantId: { in: LEGACY_MEDICA_IDS }, deletedAt: null }
    });
    if (orphaned > 0) {
        console.log(`\n⚠️  Ancora ${orphaned} pagine con tenantId legacy (slug duplicati nel tenant corretto?)`);
    } else {
        console.log('\n✅ Tutti i tenantId medica sono stati corretti!');
    }

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('❌ Fatal error:', e);
    await prisma.$disconnect();
    process.exit(1);
});
