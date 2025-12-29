/**
 * Script per verificare quale template viene usato per un preventivo
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPreventivoTemplate() {
    // Prendo il preventivo che l'utente sta usando
    const preventivoId = '2fc18369-97ce-4080-a04f-9ce40b046cc5';

    const preventivo = await prisma.preventivo.findUnique({
        where: { id: preventivoId },
        select: { id: true, tenantId: true, numero: true }
    });

    if (!preventivo) {
        console.log('❌ Preventivo non trovato');
        process.exit(1);
    }

    console.log('📄 Preventivo:', preventivo.numero, '- TenantId:', preventivo.tenantId);

    // Cerco il template PREVENTIVO per questo tenant (query identica a preventivi-service.js)
    const template = await prisma.templateLink.findFirst({
        where: {
            tenantId: preventivo.tenantId,
            type: 'PREVENTIVO',
            isActive: true,
            deletedAt: null
        },
        orderBy: {
            version: 'desc'
        }
    });

    if (!template) {
        console.log('❌ Nessun template PREVENTIVO attivo per tenant', preventivo.tenantId);

        // Verifica tutti i template per questo tenant
        const allTemplates = await prisma.templateLink.findMany({
            where: { tenantId: preventivo.tenantId, deletedAt: null },
            select: { id: true, name: true, type: true, version: true, isActive: true, isDefault: true }
        });
        console.log('\nTutti i template per tenant:', JSON.stringify(allTemplates, null, 2));
    } else {
        console.log('\n✅ Template PREVENTIVO trovato:');
        console.log('   ID:', template.id);
        console.log('   Nome:', template.name);
        console.log('   Version:', template.version);
        console.log('   isActive:', template.isActive);
        console.log('   isDefault:', template.isDefault);

        // Estrai CSS thead
        const theadMatch = template.content?.match(/\.price-table thead\s*\{([^}]+)\}/);
        if (theadMatch) {
            console.log('\n🎨 CSS thead attuale:');
            console.log(theadMatch[0]);
        } else {
            console.log('\n⚠️  CSS thead non trovato nel template');
        }
    }

    await prisma.$disconnect();
}

checkPreventivoTemplate().catch(e => { console.error(e); process.exit(1); });
