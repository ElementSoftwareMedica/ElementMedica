/**
 * Setup Brand-to-Tenant Mapping
 * 
 * Configura il mapping brand → tenant per il frontend pubblico
 * Entrambi i brand (element-sicurezza e element-medica) puntano allo stesso tenant
 * perché condividono lo stesso database.
 */
import prisma from '../config/prisma-optimization.js';

async function main() {
    console.log('🔧 Setup Brand-to-Tenant Mapping\n');

    // Get the only tenant
    const tenants = await prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true, settings: true }
    });

    console.log(`Tenants trovati: ${tenants.length}`);
    
    if (tenants.length === 0) {
        console.error('❌ Nessun tenant trovato!');
        process.exit(1);
    }

    const tenant = tenants[0];
    console.log(`Tenant: ${tenant.name} (${tenant.id})`);

    // Configure brand mapping
    const mapping = {
        'element-sicurezza': tenant.id,
        'element-medica': tenant.id
    };

    // Update tenant settings
    const settings = tenant.settings || {};
    settings.publicBrandTenantMapping = mapping;

    await prisma.tenant.update({
        where: { id: tenant.id },
        data: { settings }
    });

    console.log('\n✅ Brand-to-tenant mapping configurato:');
    console.log(JSON.stringify(mapping, null, 2));

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Errore:', e);
    process.exit(1);
});
