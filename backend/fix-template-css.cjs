/**
 * Script per aggiornare il CSS del template V5 con selettori più specifici
 * per evitare che il CSS di default sovrascriva gli stili
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTemplateCss() {
    try {
        const template = await prisma.templateLink.findUnique({
            where: { id: '3d7dd126-7507-483c-bb26-51122628ea6e' },
            select: { content: true, name: true, version: true }
        });

        if (!template || !template.content) {
            console.error('Template non trovato!');
            return;
        }

        console.log('Template trovato:', template.name, 'V', template.version);

        // Cerca il CSS thead attuale
        const theadRegex = /thead\s*\{\s*\n\s*background:\s*linear-gradient\([^)]+\);\s*\n\s*color:\s*white;\s*\n\s*\}/;
        const theadMatch = template.content.match(theadRegex);

        if (!theadMatch) {
            console.log('CSS thead non trovato nel formato atteso, cerco variante...');
            // Prova formato diverso
            const altRegex = /thead\s*\{[^}]*background[^}]*\}/;
            const altMatch = template.content.match(altRegex);
            if (altMatch) {
                console.log('Trovato CSS thead:', altMatch[0].substring(0, 100));
            }
        }

        // Aggiorna il content con CSS più specifico
        let updatedContent = template.content;

        // Aggiungi !important al thead esistente e aggiungi regole per th specifici
        updatedContent = updatedContent.replace(
            /(thead\s*\{[^}]*background:\s*)(linear-gradient\([^)]+\))(\s*;)/gi,
            '$1$2 !important$3'
        );

        updatedContent = updatedContent.replace(
            /(thead\s*\{[^}]*color:\s*)(white)(\s*;)/gi,
            '$1$2 !important$3'
        );

        // Aggiungi regole specifiche per thead th se non esistono già
        if (!updatedContent.includes('thead th')) {
            const styleEndPos = updatedContent.indexOf('</style>');
            if (styleEndPos > 0) {
                const newCss = `
    /* Fix per garantire stili header tabella */
    thead th,
    .price-table thead th {
      background: linear-gradient(to bottom, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
    }
    `;
                updatedContent = updatedContent.slice(0, styleEndPos) + newCss + updatedContent.slice(styleEndPos);
            }
        }

        // Aggiorna nel database
        await prisma.templateLink.update({
            where: { id: '3d7dd126-7507-483c-bb26-51122628ea6e' },
            data: {
                content: updatedContent,
                version: 6  // Incrementa versione
            }
        });

        console.log('\n✅ Template CSS aggiornato con successo!');
        console.log('Versione incrementata a V6');

        // Verifica
        const verify = await prisma.templateLink.findUnique({
            where: { id: '3d7dd126-7507-483c-bb26-51122628ea6e' },
            select: { content: true }
        });

        const newTheadMatch = verify.content.match(/thead\s*th[^{]*\{[^}]+\}/);
        if (newTheadMatch) {
            console.log('\nNuovo CSS thead th:', newTheadMatch[0]);
        }

    } catch (error) {
        console.error('Errore:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixTemplateCss();
