/**
 * Script: Import templates from TemplateLink.json backup into Element srl tenant
 * 
 * Usage: node backend/scripts/import-templates-element-srl.js <backup-json-file>
 * Target tenant: Element srl (55afca4f-1d59-4f5c-8285-538dcbec10da)
 * 
 * Run: node backend/scripts/import-templates-element-srl.js /path/to/TemplateLink.json
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

const ELEMENT_SRL_TENANT_ID = '55afca4f-1d59-4f5c-8285-538dcbec10da';
const BACKUP_FILE = process.argv[2];
if (!BACKUP_FILE) {
    console.error('Usage: node backend/scripts/import-templates-element-srl.js <backup-json-file>');
    process.exit(1);
}

async function main() {
    console.log('🚀 Importing templates for Element srl tenant...');
    console.log(`📁 Source: ${BACKUP_FILE}`);
    console.log(`🏢 Target tenant: ${ELEMENT_SRL_TENANT_ID}`);
    console.log('');

    // Read backup JSON
    const backupTemplates = JSON.parse(readFileSync(BACKUP_FILE, 'utf8'));
    console.log(`📋 Found ${backupTemplates.length} templates in backup:`);
    backupTemplates.forEach(t => console.log(`   - ${t.name} [${t.type}]`));
    console.log('');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const template of backupTemplates) {
        // Check if template already exists with same name for this tenant
        const existing = await prisma.templateLink.findFirst({
            where: {
                tenantId: ELEMENT_SRL_TENANT_ID,
                name: template.name,
                type: template.type,
                deletedAt: null
            }
        });

        if (existing) {
            // Update content to latest from backup
            await prisma.templateLink.update({
                where: { id: existing.id },
                data: {
                    content: template.content,
                    footer: template.footer,
                    header: template.header,
                    isDefault: template.isDefault,
                    isActive: template.isActive ?? true,
                    fileFormat: template.fileFormat,
                    version: (existing.version ?? 0) + 1,
                    updatedAt: new Date()
                }
            });
            console.log(`✅ Updated: "${template.name}" [${template.type}] → version ${(existing.version ?? 0) + 1}`);
            updated++;
        } else {
            // Create new template for this tenant
            // eslint-disable-next-line no-unused-vars
            const { id, tenantId, createdAt, updatedAt, companyId, ...templateData } = template;

            await prisma.templateLink.create({
                data: {
                    ...templateData,
                    tenantId: ELEMENT_SRL_TENANT_ID,
                    isActive: template.isActive ?? true,
                    version: template.version ?? 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                    // Override with correct values
                    createdBy: null
                }
            });
            console.log(`✅ Created: "${template.name}" [${template.type}]`);
            created++;
        }
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);

    // Verify
    const result = await prisma.templateLink.findMany({
        where: { tenantId: ELEMENT_SRL_TENANT_ID, deletedAt: null },
        select: { id: true, name: true, type: true, version: true }
    });
    console.log('');
    console.log('📋 All templates for Element srl:');
    result.forEach(t => console.log(`   ${t.id.substring(0, 8)}... | ${t.name} [${t.type}] v${t.version}`));

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
});
