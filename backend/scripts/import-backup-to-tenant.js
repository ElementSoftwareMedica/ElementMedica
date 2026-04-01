/**
 * Script: Import Backup to Tenant
 * 
 * Importa dati da un backup esterno su un tenant specifico.
 * Converte automaticamente campi legacy (P48/P49):
 * - companyId → companyTenantProfileId
 * - Corregge model names (form_templates → formTemplate)
 * 
 * Usage:
 *   node scripts/import-backup-to-tenant.js <backup-path> <target-tenant-id> [--entities=entity1,entity2] [--overwrite]
 * 
 * Example:
 *   node scripts/import-backup-to-tenant.js /path/to/backup 7a467b91-4983-4256-b13c-217792e05a64 --entities=TemplateLink,FormTemplate,cms_pages
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// P48/P49: Mapping campi legacy → nuovi campi schema
const LEGACY_FIELD_MAPPING = {
    'companyId': 'companyTenantProfileId',
    // CMS Media snake_case → camelCase
    'folder_id': 'folderId',
    'created_by': 'createdBy',
    'updated_at': 'updatedAt'
};

// Mapping model names: backup entity name → Prisma model name
const MODEL_MAPPING = {
    'form_templates': 'formTemplate',
    'cms_pages': 'cMSPage',
    'cms_media': 'cMSMedia',
    'TemplateLink': 'templateLink',
    'FormTemplate': 'formTemplate'
};

/**
 * Prepara record per import
 * - Converti campi legacy
 * - Nullifica foreign keys a Person (createdBy, createdById) se non esistono nel target tenant
 */
function prepareRecord(record, targetTenantId) {
    const cleaned = {};

    // Foreign keys da Person che possono non esistere nel target tenant
    const NULLABLE_FK_FIELDS = ['createdBy', 'createdById', 'created_by'];

    for (const [key, value] of Object.entries(record)) {
        // Skip campi redacted
        if (value === '[REDACTED]') continue;

        // P48/P49: Converti campi legacy
        const mappedKey = LEGACY_FIELD_MAPPING[key] || key;

        // Nullifica FK a Person per evitare constraint violations
        if (NULLABLE_FK_FIELDS.includes(key) && value) {
            cleaned[mappedKey] = null; // Set to null, person may not exist in target tenant
            continue;
        }

        // Skip null values → set to null
        if (value === null) {
            cleaned[mappedKey] = null;
            continue;
        }

        // Skip relazioni nested (array e oggetti non-date)
        if (typeof value === 'object') {
            // Mantieni Date strings
            if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('T')) {
                cleaned[mappedKey] = value;
                continue;
            }
            // Skip array e oggetti (relazioni nested)
            if (Array.isArray(value) || Object.prototype.toString.call(value) === '[object Object]') {
                // Eccezione: mantieni campi JSON come schema, settings, content, etc.
                if (['schema', 'settings', 'content', 'validationRules', 'conditionalFields',
                    'layout', 'markers', 'markerSchema', 'styles', 'variants', 'metadata'].includes(mappedKey)) {
                    cleaned[mappedKey] = value;
                }
                continue;
            }
        }

        // Mantieni campi scalari
        cleaned[mappedKey] = value;
    }

    // Forza tenantId sul target
    if ('tenantId' in record) {
        cleaned.tenantId = targetTenantId;
    }

    return cleaned;
}

/**
 * Import singola entità
 */
async function importEntity(entityName, modelName, data, targetTenantId, overwrite) {
    console.log(`\n📦 Importando ${entityName} (${data.length} records)...`);

    if (!prisma[modelName]) {
        console.error(`  ❌ Model "${modelName}" non trovato in Prisma!`);
        return { imported: 0, updated: 0, skipped: 0, errors: [] };
    }

    const results = { imported: 0, updated: 0, skipped: 0, errors: [] };

    for (const record of data) {
        try {
            const cleanRecord = prepareRecord(record, targetTenantId);

            if (!cleanRecord.id) {
                console.warn(`  ⚠️ Record senza ID, skip`);
                results.skipped++;
                continue;
            }

            // Check se esiste
            const existing = await prisma[modelName].findUnique({
                where: { id: cleanRecord.id }
            });

            if (existing) {
                if (overwrite) {
                    const { id, ...updateData } = cleanRecord;
                    await prisma[modelName].update({
                        where: { id },
                        data: updateData
                    });
                    results.updated++;
                    console.log(`  ✏️  Updated: ${record.name || record.title || record.id}`);
                } else {
                    results.skipped++;
                }
            } else {
                await prisma[modelName].create({
                    data: cleanRecord
                });
                results.imported++;
                console.log(`  ✅ Created: ${record.name || record.title || record.id}`);
            }
        } catch (error) {
            console.error(`  ❌ Error: ${record?.id} - ${error.message}`);
            results.errors.push({ id: record?.id, error: error.message });
            results.skipped++;
        }
    }

    return results;
}

/**
 * Main import function
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log(`
Usage: node scripts/import-backup-to-tenant.js <backup-path> <target-tenant-id> [options]

Options:
  --entities=entity1,entity2   Importa solo entità specifiche (default: tutte)
  --overwrite                  Sovrascrivi record esistenti (default: skip)

Examples:
  # Import all entities from backup to ElementMedica tenant
  node scripts/import-backup-to-tenant.js /path/to/backup 7a467b91-4983-4256-b13c-217792e05a64
  
  # Import only templates
  node scripts/import-backup-to-tenant.js /path/to/backup 7a467b91-4983-4256-b13c-217792e05a64 --entities=TemplateLink,cms_pages --overwrite
`);
        process.exit(1);
    }

    const backupPath = args[0];
    const targetTenantId = args[1];

    // Parse options
    let selectedEntities = null;
    let overwrite = false;

    for (const arg of args.slice(2)) {
        if (arg.startsWith('--entities=')) {
            selectedEntities = arg.replace('--entities=', '').split(',');
        }
        if (arg === '--overwrite') {
            overwrite = true;
        }
    }

    console.log('\n🚀 Import Backup to Tenant');
    console.log('━'.repeat(50));
    console.log(`📁 Backup path: ${backupPath}`);
    console.log(`🏢 Target tenant: ${targetTenantId}`);
    console.log(`📋 Entities: ${selectedEntities?.join(', ') || 'ALL'}`);
    console.log(`🔄 Overwrite: ${overwrite}`);
    console.log('━'.repeat(50));

    // Verifica tenant esiste
    const tenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
    if (!tenant) {
        console.error(`❌ Tenant ${targetTenantId} non trovato!`);
        process.exit(1);
    }
    console.log(`✅ Tenant found: ${tenant.name}`);

    // Leggi manifest
    const manifestPath = path.join(backupPath, 'manifest.json');
    let manifest;
    try {
        const manifestContent = await fs.readFile(manifestPath, 'utf8');
        manifest = JSON.parse(manifestContent);
    } catch (error) {
        console.error(`❌ Impossibile leggere manifest: ${error.message}`);
        process.exit(1);
    }

    console.log(`📄 Backup ID: ${manifest.id}`);
    console.log(`📅 Created: ${manifest.createdAt}`);
    console.log(`📊 Total records: ${manifest.totalRecords}`);

    // Filtra entità
    const entitiesToImport = selectedEntities
        ? manifest.entities.filter(e => selectedEntities.includes(e.name))
        : manifest.entities;

    if (entitiesToImport.length === 0) {
        console.error('❌ Nessuna entità da importare!');
        process.exit(1);
    }

    console.log(`\n📋 Entità da importare: ${entitiesToImport.map(e => e.name).join(', ')}`);

    // Import ogni entità
    const totalResults = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: []
    };

    for (const entity of entitiesToImport) {
        const dataPath = path.join(backupPath, 'data', entity.filename);

        try {
            const dataContent = await fs.readFile(dataPath, 'utf8');
            const data = JSON.parse(dataContent);

            // Get correct model name
            const modelName = MODEL_MAPPING[entity.name] || entity.model;

            const results = await importEntity(entity.name, modelName, data, targetTenantId, overwrite);

            totalResults.imported += results.imported;
            totalResults.updated += results.updated;
            totalResults.skipped += results.skipped;
            totalResults.errors.push(...results.errors);

        } catch (error) {
            console.error(`❌ Errore lettura ${entity.name}: ${error.message}`);
        }
    }

    // Summary
    console.log('\n' + '━'.repeat(50));
    console.log('📊 RISULTATI IMPORT');
    console.log('━'.repeat(50));
    console.log(`✅ Imported: ${totalResults.imported}`);
    console.log(`✏️  Updated: ${totalResults.updated}`);
    console.log(`⏭️  Skipped: ${totalResults.skipped}`);
    console.log(`❌ Errors: ${totalResults.errors.length}`);

    if (totalResults.errors.length > 0) {
        console.log('\n❌ Errori dettagliati:');
        totalResults.errors.forEach(err => {
            console.log(`  - ${err.id}: ${err.error}`);
        });
    }

    console.log('\n✅ Import completato!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
