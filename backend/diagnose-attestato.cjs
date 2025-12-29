const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 ANALISI COMPLETA TEMPLATE USATO PER PDF');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 1. QUALE template viene usato REALMENTE?
        const template = await prisma.templateLink.findFirst({
            where: {
                type: 'PREVENTIVO',
                isActive: true,
                deletedAt: null
            },
            orderBy: {
                version: 'desc'
            }
        });

        if (!template) {
            console.log('❌ NESSUN TEMPLATE PREVENTIVO ATTIVO!\n');
            await prisma.$disconnect();
            return;
        }

        console.log('📋 TEMPLATE ATTIVO:\n');
        console.log(`ID: ${template.id}`);
        console.log(`Nome: ${template.name}`);
        console.log(`Versione: ${template.version}`);
        console.log(`Created: ${template.createdAt}`);
        console.log(`Updated: ${template.updatedAt}`);
        console.log(`Content length: ${template.content.length} chars\n`);

        // 2. ESTRAI CSS COMPLETO TBODY
        const content = template.content;

        // Cerca TUTTE le regole tbody
        const tbodyRules = content.match(/\.price-table\s+tbody\s+tr[^}]*\{[^}]*\}/g) || [];

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 CSS TBODY (TUTTE LE REGOLE):\n');
        tbodyRules.forEach((rule, i) => {
            console.log(`Regola #${i + 1}:`);
            console.log(rule.replace(/\s+/g, ' ').trim());
            console.log();
        });

        // 3. CERCA nth-child OVUNQUE
        const nthChildMatches = content.match(/nth-child\([^)]*\)/g) || [];
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 RICERCA nth-child:\n');
        console.log(`Trovati: ${nthChildMatches.length} match\n`);
        if (nthChildMatches.length > 0) {
            console.log('MATCH:\n');
            nthChildMatches.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
            console.log();

            // Trova contesto
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.includes('nth-child')) {
                    console.log(`Linea ${idx + 1}: ${line.trim()}`);
                }
            });
        } else {
            console.log('✅ NESSUN nth-child trovato\n');
        }

        // 4. CERCA #f1f5f9 (grigio)
        const grayMatches = content.match(/#f1f5f9/gi) || [];
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 RICERCA COLORE GRIGIO #f1f5f9:\n');
        console.log(`Trovati: ${grayMatches.length} match\n`);
        if (grayMatches.length > 0) {
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.toLowerCase().includes('f1f5f9')) {
                    console.log(`Linea ${idx + 1}: ${line.trim()}`);
                }
            });
            console.log();
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('Errore:', error);
        process.exit(1);
    }
})();
