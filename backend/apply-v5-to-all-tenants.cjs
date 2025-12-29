/**
 * Script per applicare template V5 a TUTTI i tenant
 * Risolve problema: template V5 creato solo per tenant Element Medica Default
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

// Leggi template V5 content
const v5Path = './insert-preventivo-template-v5-ultra-elegante.cjs';
const v5ScriptContent = fs.readFileSync(v5Path, 'utf-8');

// Estrai templateHTML (linee 16-379)
const templateHTMLMatch = v5ScriptContent.match(/const templateHTML = `([^`]+)`/s);
if (!templateHTMLMatch) {
    console.error('❌ Template HTML non trovato nello script V5');
    process.exit(1);
}

const templateHTML = templateHTMLMatch[1];
console.log(`✅ Template HTML estratto (${templateHTML.length} chars)`);

async function main() {
    // 1. Get all tenants
    const tenants = await prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true }
    });

    console.log(`\n=== APPLICAZIONE TEMPLATE V5 A ${tenants.length} TENANT ===\n`);

    for (const tenant of tenants) {
        console.log(`\n--- Tenant: ${tenant.name} (${tenant.id}) ---`);

        // 2. Verifica template PREVENTIVO esistente per questo tenant
        const existing = await prisma.templateLink.findFirst({
            where: {
                tenantId: tenant.id,
                type: 'PREVENTIVO',
                isActive: true,
                deletedAt: null
            },
            select: { id: true, name: true, version: true }
        });

        if (existing) {
            console.log(`  Template attivo: v${existing.version} - ${existing.name}`);

            // Se V5 già esiste, skip
            if (existing.version >= 5) {
                console.log(`  ✅ Template V5 già presente, skip`);
                continue;
            }
        } else {
            console.log(`  ⚠️  Nessun template PREVENTIVO attivo trovato`);
        }

        // 3. Disattiva template precedenti
        const updated = await prisma.templateLink.updateMany({
            where: {
                tenantId: tenant.id,
                type: 'PREVENTIVO',
                isActive: true,
                deletedAt: null
            },
            data: {
                isActive: false,
                isDefault: false
            }
        });

        console.log(`  Disattivati ${updated.count} template precedenti`);

        // 4. Crea template V5 per questo tenant
        const newTemplate = await prisma.templateLink.create({
            data: {
                tenantId: tenant.id,
                name: 'Preventivo Ultra Elegante V5',
                type: 'PREVENTIVO',
                version: 5,
                content: templateHTML,
                header: '',
                footer: '',
                isActive: true,
                isDefault: true,
                logoPosition: 'top-center',
                fileFormat: 'HTML',
                url: '' // Empty string for inline HTML templates
            }
        });

        console.log(`  ✅ Template V5 creato: ${newTemplate.id}`);
    }

    console.log('\n\n=== VERIFICA FINALE ===\n');

    // Verifica finale
    for (const tenant of tenants) {
        const activeTemplate = await prisma.templateLink.findFirst({
            where: {
                tenantId: tenant.id,
                type: 'PREVENTIVO',
                isActive: true,
                deletedAt: null
            },
            select: { name: true, version: true }
        });

        console.log(`${tenant.name}: ${activeTemplate ? `v${activeTemplate.version} - ${activeTemplate.name}` : '❌ NESSUNO'}`);
    }

    console.log('\n✅ Template V5 applicato a tutti i tenant!');
}

main()
    .catch(error => {
        console.error('❌ ERRORE:', error.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
