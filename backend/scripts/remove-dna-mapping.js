/**
 * Remove brand mapping from DNA tenant
 */
import prisma from '../config/prisma-optimization.js';

async function main() {
    console.log('🔧 Remove DNA Brand Mapping\n');

    const dnaTenant = await prisma.tenant.findFirst({
        where: { id: 'b29d7eb1-1569-4705-8ddb-d65067142058' },
        select: { id: true, name: true, slug: true, settings: true }
    });

    if (!dnaTenant) {
        console.log('❌ Tenant DNA non trovato');
        process.exit(1);
    }

    console.log(`Tenant DNA: ${dnaTenant.name} (${dnaTenant.id})`);
    console.log(`Settings correnti:`, JSON.stringify(dnaTenant.settings, null, 2));

    const settings = dnaTenant.settings || {};
    if (settings.publicBrandTenantMapping) {
        delete settings.publicBrandTenantMapping;
        await prisma.tenant.update({
            where: { id: dnaTenant.id },
            data: { settings }
        });
        console.log('✅ Mapping rimosso dal tenant DNA');
    } else {
        console.log('⚠️ Nessun mapping trovato su tenant DNA');
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Errore:', e);
    process.exit(1);
});
