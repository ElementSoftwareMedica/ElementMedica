const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Template global (tenantId NULL)
    const globalTemplates = await prisma.templateLink.findMany({
        where: {
            tenantId: null,
            type: 'PREVENTIVO',
            deletedAt: null
        },
        select: { id: true, name: true, version: true, isActive: true }
    });

    console.log('Template PREVENTIVO global (tenantId NULL):', globalTemplates.length);
    globalTemplates.forEach(t => console.log(`- v${t.version}: ${t.name} (active: ${t.isActive})`));

    // Template per ogni tenant
    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true }
    });

    for (const tenant of tenants) {
        const templates = await prisma.templateLink.findMany({
            where: {
                tenantId: tenant.id,
                type: 'PREVENTIVO',
                isActive: true,
                deletedAt: null
            },
            select: { id: true, name: true, version: true }
        });

        console.log(`\nTenant "${tenant.name}" (${tenant.id}):`);
        console.log(`  Template attivi: ${templates.length}`);
        templates.forEach(t => console.log(`  - v${t.version}: ${t.name}`));
    }

    await prisma.$disconnect();
}

main();
