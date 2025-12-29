const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const v5 = await prisma.templateLink.findUnique({
        where: { id: '3d7dd126-7507-483c-bb26-51122628ea6e' },
        select: { id: true, name: true, tenantId: true, isActive: true }
    });

    console.log('Template V5 tenantId:', v5.tenantId);
    console.log('isActive:', v5.isActive);

    // Tenant count
    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true }
    });

    console.log('\nTenants in database:');
    tenants.forEach(t => console.log(`- ${t.id}: ${t.name}`));

    await prisma.$disconnect();
}

main();
