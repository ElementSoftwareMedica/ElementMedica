const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

(async () => {
    try {
        const template = await prisma.templateLink.findFirst({
            where: { type: 'PREVENTIVO', isActive: true, deletedAt: null },
            orderBy: { version: 'desc' }
        });

        if (!template) {
            console.log('NO TEMPLATE');
            await prisma.$disconnect();
            return;
        }

        // Salva template completo in file per analisi
        fs.writeFileSync('/Users/matteo.michielon/project 2.0/backend/template-export.html', template.content);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Template esportato in: backend/template-export.html');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`Template ID: ${template.id}`);
        console.log(`Dimensione: ${template.content.length} chars`);

        // Cerca style inline
        const inlineStyles = template.content.match(/style="[^"]*"/g) || [];
        console.log(`\nStyle inline trovati: ${inlineStyles.length}`);

        if (inlineStyles.length > 0) {
            console.log('\nPRIMI 10 STYLE INLINE:\n');
            inlineStyles.slice(0, 10).forEach((s, i) => {
                console.log(`${i + 1}. ${s}`);
            });
        }

        // Cerca nth-child FUORI da <style>
        const bodyContent = template.content.replace(/<style>[\s\S]*?<\/style>/, '');
        const nthInBody = bodyContent.match(/nth-child/g) || [];
        console.log(`\nnth-child FUORI da <style>: ${nthInBody.length}`);

        await prisma.$disconnect();
    } catch (error) {
        console.error('Errore:', error);
        process.exit(1);
    }
})();
