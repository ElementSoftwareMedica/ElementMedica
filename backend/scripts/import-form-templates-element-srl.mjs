/**
 * Script: Clone form templates from Element Sicurezza to Element srl
 * Run: node backend/scripts/import-form-templates-element-srl.mjs
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const p = new PrismaClient();

const ELEMENT_SRL_ID = '55afca4f-1d59-4f5c-8285-538dcbec10da';
const ELEMENT_SIC_ID = '3b534ec0-95ed-487f-9763-d660ecfdf45d';

async function main() {
    console.log('🚀 Importing form templates for Element srl...');

    const templates = await p.formTemplate.findMany({
        where: { tenantId: ELEMENT_SIC_ID, deletedAt: null }
    });
    console.log(`Found ${templates.length} templates in Element Sicurezza`);

    let created = 0;
    let skipped = 0;

    for (const t of templates) {
        const exists = await p.formTemplate.findFirst({
            where: { tenantId: ELEMENT_SRL_ID, name: t.name, deletedAt: null }
        });

        if (exists) {
            console.log(`  SKIP: "${t.name}" already exists`);
            skipped++;
            continue;
        }

        const { id, tenantId, createdAt, updatedAt, ...rest } = t;
        await p.formTemplate.create({
            data: { ...rest, id: randomUUID(), tenantId: ELEMENT_SRL_ID }
        });
        console.log(`  CREATE: "${t.name}" [${t.type}] isPublic=${t.isPublic}`);
        created++;
    }

    console.log(`\n✅ Done: ${created} created, ${skipped} skipped`);
    await p.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await p.$disconnect();
    process.exit(1);
});
