const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCSS() {
    try {
        const template = await prisma.templateLink.findUnique({
            where: { id: 'c749fbc8-7f37-43f0-9eff-9db59f736357' },
            select: { content: true }
        });

        if (!template) {
            console.log('Template non trovato!');
            return;
        }

        const content = template.content;

        console.log('\n=== CSS PRICE-TABLE ===\n');

        // Estrai <style>
        const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
        if (!styleMatch) {
            console.log('Nessun <style> trovato!');
            return;
        }

        const css = styleMatch[1];
        const lines = css.split('\n');

        // Trova .price-table tbody
        let inTbody = false;
        lines.forEach((line, idx) => {
            if (line.includes('.price-table tbody')) {
                inTbody = true;
            }

            if (inTbody) {
                console.log(`${idx + 1}: ${line}`);

                if (line.includes('}') && !line.includes('{')) {
                    inTbody = false;
                }
            }
        });

        // Cerca grigio #f1f5f9
        console.log('\n=== RICERCA GRIGIO #f1f5f9 ===\n');
        const grayLines = [];
        lines.forEach((line, idx) => {
            if (line.toLowerCase().includes('f1f5f9')) {
                grayLines.push(`Linea ${idx + 1}: ${line.trim()}`);
            }
        });

        console.log(`Trovate: ${grayLines.length} linee`);
        grayLines.forEach(l => console.log(l));

        await prisma.$disconnect();
    } catch (error) {
        console.error('Errore:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

checkCSS();

