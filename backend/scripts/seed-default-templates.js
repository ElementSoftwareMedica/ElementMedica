#!/usr/bin/env node

/**
 * Seed / Update Default Templates
 * 
 * Crea o aggiorna template predefiniti per tutti i tenant attivi.
 * - Senza flag: crea solo mancanti (idempotente)
 * - Con --update: aggiorna anche template esistenti con nuova versione
 * 
 * Uso: 
 *   node backend/scripts/seed-default-templates.js          # solo crea mancanti
 *   node backend/scripts/seed-default-templates.js --update  # aggiorna tutti
 */

import DefaultTemplateService from '../services/templates/DefaultTemplateService.js';
import prisma from '../config/prisma-optimization.js';

const isUpdate = process.argv.includes('--update');

async function main() {
    if (isUpdate) {
        console.log('📄 Aggiornamento template predefiniti per tutti i tenant...\n');
    } else {
        console.log('📄 Seed template predefiniti per tutti i tenant...\n');
    }

    try {
        if (isUpdate) {
            const results = await DefaultTemplateService.updateAllTenants();

            console.log(`\n✅ Completato!`);
            console.log(`   Tenant processati: ${results.tenants}`);
            console.log(`   Template aggiornati: ${results.totalUpdated}`);
            console.log(`   Template invariati (skippati): ${results.totalSkipped}`);

            if (results.errors.length > 0) {
                console.log(`\n⚠️  Errori:`);
                for (const err of results.errors) {
                    console.log(`   - Tenant ${err.tenantName || err.tenantId}: ${err.error || JSON.stringify(err.errors)}`);
                }
            }
        } else {
            const results = await DefaultTemplateService.seedAllTenants();

            console.log(`\n✅ Completato!`);
            console.log(`   Tenant processati: ${results.tenants}`);
            console.log(`   Template creati: ${results.totalCreated}`);
            console.log(`   Template già esistenti (skippati): ${results.totalSkipped}`);

            if (results.errors.length > 0) {
                console.log(`\n⚠️  Errori:`);
                for (const err of results.errors) {
                    console.log(`   - Tenant ${err.tenantName || err.tenantId}: ${err.error || JSON.stringify(err.errors)}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Errore:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
