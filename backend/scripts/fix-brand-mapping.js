/**
 * Fix Brand-to-Tenant Mapping
 * 
 * Rimuove il mapping dal tenant DNA e assicura che sia solo su Element srl
 */
import prisma from '../config/prisma-optimization.js';

async function main() {
    console.log('🔧 Fix Brand-to-Tenant Mapping\n');

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true, settings: true }
    });

    console.log(`Tenants trovati: ${tenants.length}`);

    for (const tenant of tenants) {
        const settings = tenant.settings || {};
        if (settings.publicBrandTenantMapping) {
            console.log(`\nTenant ${tenant.name} (${tenant.slug}):`);
            console.log(`  Mapping: ${JSON.stringify(settings.publicBrandTenantMapping)}`);
            
            // Remove mapping from DNA tenant
            if (tenant.slug === 'DNA') {
                delete settings.publicBrandTenantMapping;
                await prisma.tenant.update({
                    where: { id: tenant.id },
                    data: { settings }
                });
                console.log(`  ✅ Mapping rimosso dal tenant DNA`);
            }
        }
    }

    // Ensure Element srl has the correct mapping
    const elementSrl = tenants.find(t => t.slug === 'element-srl' || t.name === 'Element srl');
    if (elementSrl) {
        const settings = elementSrl.settings || {};
        const mapping = {
            'element-sicurezza': elementSrl.id,
            'element-medica': elementSrl.id
        };
        settings.publicBrandTenantMapping = mapping;
        await prisma.tenant.update({
            where: { id: elementSrl.id },
            data: { settings }
        });
        console.log(`\n✅ Mapping configurato su Element srl (${elementSrl.id}):`);
        console.log(JSON.stringify(mapping, null, 2));
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Errore:', e);
    process.exit(1);
});
