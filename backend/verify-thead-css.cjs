const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        const t = await prisma.templateLink.findFirst({
            where: { type: 'PREVENTIVO', isActive: true },
            select: { id: true, name: true, version: true, content: true }
        });

        if (!t) {
            console.log('NO ACTIVE TEMPLATE');
            await prisma.$disconnect();
            return;
        }

        console.log('\n=== TEMPLATE ATTIVO ===');
        console.log('Nome:', t.name);
        console.log('Version:', t.version);
        console.log('ID:', t.id);

        // Cerca thead background
        const theadMatch = t.content.match(/\.price-table thead \{[^}]*\}/s);
        if (theadMatch) {
            console.log('\n=== THEAD STYLE ===');
            console.log(theadMatch[0]);
        }

        // Cerca th style completo
        const lines = t.content.split('\n');
        let inTh = false;
        let thStyle = '';

        console.log('\n=== TH STYLE COMPLETO ===');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('.price-table th {')) {
                inTh = true;
            }
            if (inTh) {
                thStyle += lines[i] + '\n';
                if (lines[i].includes('}')) {
                    console.log(thStyle);
                    break;
                }
            }
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('ERROR:', error.message);
        await prisma.$disconnect();
    }
})();
