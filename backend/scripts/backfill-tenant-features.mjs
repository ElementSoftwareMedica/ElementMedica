/**
 * Backfill TenantFeature records for all existing tenants.
 *
 * Per ogni tenant attivo senza feature flags standard assegna le feature di default:
 *   BRANCH_MEDICA, BRANCH_FORMAZIONE, MDL_BASE
 *
 * Già esistenti vengono saltati (skipDuplicates: true).
 *
 * Eseguire una sola volta: node backend/scripts/backfill-tenant-features.mjs
 */

import prisma from '../config/prisma-optimization.js';

const DEFAULT_FEATURES = ['BRANCH_MEDICA', 'BRANCH_FORMAZIONE', 'MDL_BASE'];

async function main() {
    const tenants = await prisma.tenant.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true }
    });

    console.log(`Trovati ${tenants.length} tenant attivi.`);

    let totalCreated = 0;

    for (const tenant of tenants) {
        const existing = await prisma.tenantFeature.findMany({
            where: { tenantId: tenant.id, deletedAt: null, featureKey: { in: DEFAULT_FEATURES } },
            select: { featureKey: true }
        });

        const existingKeys = new Set(existing.map(f => f.featureKey));
        const toCreate = DEFAULT_FEATURES.filter(k => !existingKeys.has(k));

        if (toCreate.length === 0) {
            console.log(`  [SKIP] ${tenant.name} — feature standard già presenti`);
            continue;
        }

        const result = await prisma.tenantFeature.createMany({
            data: toCreate.map(featureKey => ({
                tenantId: tenant.id,
                featureKey,
                isEnabled: true,
                enabledAt: new Date()
            })),
            skipDuplicates: true
        });

        totalCreated += result.count;
        console.log(`  [OK]   ${tenant.name} — create ${result.count} feature: ${toCreate.join(', ')}`);
    }

    console.log(`\nBackfill completato. ${totalCreated} record TenantFeature creati.`);
}

main()
    .catch(err => {
        console.error('Errore durante il backfill:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
