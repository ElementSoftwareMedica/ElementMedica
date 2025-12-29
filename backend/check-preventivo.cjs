const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPreventivo() {
    try {
        const preventivo = await prisma.preventivo.findUnique({
            where: { id: '4f7657af-4e11-485e-bcab-80ce23b9ab28' },
            include: {
                tenant: { select: { id: true, name: true } }
            }
        });

        console.log('\n📋 PREVENTIVO:');
        console.log(JSON.stringify({
            id: preventivo?.id,
            tenantId: preventivo?.tenantId,
            tenantName: preventivo?.tenant?.name
        }, null, 2));

        const templates = await prisma.templateLink.findMany({
            where: {
                type: 'PREVENTIVO',
                deletedAt: null
            },
            select: {
                id: true,
                tenantId: true,
                name: true,
                isActive: true
            }
        });

        console.log('\n📝 TEMPLATE PREVENTIVO:');
        console.log(JSON.stringify(templates, null, 2));

        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Errore:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

checkPreventivo();
