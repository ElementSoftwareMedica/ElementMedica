const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        const t = await prisma.templateLink.findFirst({
            where: { type: 'PREVENTIVO', isActive: true, deletedAt: null },
            orderBy: { version: 'desc' }
        });

        if (!t) {
            console.log('NO TEMPLATE');
            await prisma.$disconnect();
            return;
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEMPLATE ATTIVO: ' + t.id);
        console.log('Created: ' + t.createdAt);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Cerca ESATTAMENTE il CSS tbody
        const lines = t.content.split('\n');
        let foundTbody = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('.price-table') && line.includes('tbody') && line.includes('tr') && line.includes('{')) {
                console.log('TROVATO CSS TBODY alla linea ' + (i + 1) + '\n');

                // Stampa 5 linee prima e 10 dopo
                for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 12); j++) {
                    const prefix = j === i ? '>>> ' : '    ';
                    console.log(prefix + (j + 1) + ': ' + lines[j]);
                }
                console.log('\n');
                foundTbody = true;
            }
        }

        if (!foundTbody) {
            console.log('❌ NESSUN CSS TBODY TROVATO!');
        }

        // Cerca anche righe con background
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TUTTE LE RIGHE CON "background:":\n');
        lines.forEach((line, idx) => {
            if (line.toLowerCase().includes('background:') && line.includes('price-table')) {
                console.log((idx + 1) + ': ' + line.trim());
            }
        });

        await prisma.$disconnect();
    } catch (error) {
        console.error('Errore:', error);
        process.exit(1);
    }
})();
