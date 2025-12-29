const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Query template PREVENTIVO attivi
        const templates = await prisma.templateLink.findMany({
            where: {
                type: 'PREVENTIVO',
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                version: true,
                isActive: true,
                isDefault: true,
                createdAt: true
            },
            orderBy: {
                version: 'desc'
            }
        });

        console.log('\n=== TEMPLATE PREVENTIVO TROVATI ===');
        console.log(`Total: ${templates.length}\n`);

        templates.forEach(t => {
            console.log(`ID: ${t.id}`);
            console.log(`Name: ${t.name}`);
            console.log(`Version: ${t.version}`);
            console.log(`isActive: ${t.isActive}`);
            console.log(`isDefault: ${t.isDefault}`);
            console.log(`Created: ${t.createdAt}`);
            console.log('---');
        });

        // Template V5 specifico
        const v5 = await prisma.templateLink.findUnique({
            where: { id: '3d7dd126-7507-483c-bb26-51122628ea6e' },
            select: {
                id: true,
                name: true,
                version: true,
                isActive: true,
                isDefault: true,
                content: true
            }
        });

        console.log('\n=== TEMPLATE V5 (ID: 3d7dd126...) ===');
        if (v5) {
            console.log(`Name: ${v5.name}`);
            console.log(`Version: ${v5.version}`);
            console.log(`isActive: ${v5.isActive}`);
            console.log(`isDefault: ${v5.isDefault}`);
            console.log(`Content length: ${v5.content.length} chars`);

            // Estrai thead CSS
            const theadMatch = v5.content.match(/\.price-table thead\s*\{[^}]+\}/);
            if (theadMatch) {
                console.log(`\nthead CSS:\n${theadMatch[0]}`);
            }
        } else {
            console.log('❌ NON TROVATO!');
        }

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
