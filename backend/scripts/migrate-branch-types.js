/**
 * Script di Migrazione Branch Types - Progetto 45
 * 
 * Questo script migra i dati esistenti per impostare branchType
 * su tutte le entità che lo richiedono.
 * 
 * Logica:
 * - Tutte le entità cliniche (MEDICA) → branchType: MEDICA
 * - Tutte le entità formazione (FORMAZIONE) → branchType: FORMAZIONE
 * - Tenant → enabledBranches in base al tipo
 * - PersonTenantAccess → enabledBranches da enabledFeatures
 * 
 * @module scripts/migrate-branch-types
 * @version 1.0.0
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

// ============================================
// CONFIGURAZIONE
// ============================================

// Tenant IDs noti (da aggiornare se necessario)
const KNOWN_TENANTS = {
    DEFAULT: 'bca8dc20-6111-4a2b-83f1-6f84e0c86b11',
    FORMAZIONE: 'da59b77a-9564-45ce-bf83-8f15a56ceb22',
    MEDICA: '21ec594c-efc3-4300-bfa8-b43307a80c9b',
};

// Entità MEDICA che richiedono branchType
const MEDICA_ENTITIES = [
    'prestazione',
    'poliambulatorio',
    'offertaBundle',
    'strumento',
    'convenzione',
    'listinoPrezzo',
    'tariffarioMedico',
    'templateCampoVisita',
    'disponibilitaMedico',
    'ferieAssenza',
];

// Entità FORMAZIONE che richiedono branchType
const FORMAZIONE_ENTITIES = [
    'course',
    'courseSchedule',
];

// ============================================
// FUNZIONI DI MIGRAZIONE
// ============================================

/**
 * Migra le entità MEDICA impostando branchType = MEDICA
 */
async function migrateMedicaEntities() {
    logger.info('🏥 Migrating MEDICA entities...');

    const results = {};

    for (const entityName of MEDICA_ENTITIES) {
        try {
            const result = await prisma[entityName].updateMany({
                where: {
                    branchType: null,
                    deletedAt: null,
                },
                data: {
                    branchType: 'MEDICA',
                },
            });

            results[entityName] = result.count;

            if (result.count > 0) {
                logger.info(`   ✅ ${entityName}: ${result.count} records migrated to MEDICA`);
            } else {
                logger.debug(`   ⏭️  ${entityName}: no records to migrate`);
            }
        } catch (error) {
            logger.error({ error: error.message, entityName }, `   ❌ Failed to migrate ${entityName}`);
            results[entityName] = `ERROR: ${error.message}`;
        }
    }

    return results;
}

/**
 * Migra le entità FORMAZIONE impostando branchType = FORMAZIONE
 */
async function migrateFormazioneEntities() {
    logger.info('📚 Migrating FORMAZIONE entities...');

    const results = {};

    for (const entityName of FORMAZIONE_ENTITIES) {
        try {
            const result = await prisma[entityName].updateMany({
                where: {
                    branchType: null,
                    deletedAt: null,
                },
                data: {
                    branchType: 'FORMAZIONE',
                },
            });

            results[entityName] = result.count;

            if (result.count > 0) {
                logger.info(`   ✅ ${entityName}: ${result.count} records migrated to FORMAZIONE`);
            } else {
                logger.debug(`   ⏭️  ${entityName}: no records to migrate`);
            }
        } catch (error) {
            logger.error({ error: error.message, entityName }, `   ❌ Failed to migrate ${entityName}`);
            results[entityName] = `ERROR: ${error.message}`;
        }
    }

    return results;
}

/**
 * Configura i Tenant con enabledBranches appropriati
 */
async function migrateTenants() {
    logger.info('🏢 Configuring Tenant enabledBranches...');

    const results = {};

    // Ottieni tutti i tenant
    const tenants = await prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true, enabledBranches: true },
    });

    for (const tenant of tenants) {
        try {
            let enabledBranches = [];
            let primaryBranch = null;

            // Determina i branch in base al nome/slug o dati esistenti
            const slugLower = tenant.slug?.toLowerCase() || '';
            const nameLower = tenant.name?.toLowerCase() || '';

            if (slugLower.includes('medica') || nameLower.includes('medica')) {
                enabledBranches = ['MEDICA'];
                primaryBranch = 'MEDICA';
            } else if (slugLower.includes('formazione') || nameLower.includes('formazione')) {
                enabledBranches = ['FORMAZIONE'];
                primaryBranch = 'FORMAZIONE';
            } else {
                // Default: tutti i branch abilitati (per admin/default tenant)
                enabledBranches = ['MEDICA', 'FORMAZIONE'];
                primaryBranch = null; // Nessun branch primario per tenant multi-branch
            }

            // Skip se già configurato correttamente
            if (tenant.enabledBranches?.length > 0) {
                logger.debug(`   ⏭️  Tenant "${tenant.name}" already configured: ${tenant.enabledBranches.join(', ')}`);
                results[tenant.id] = 'already_configured';
                continue;
            }

            // Aggiorna tenant
            await prisma.tenant.update({
                where: { id: tenant.id },
                data: {
                    enabledBranches,
                    primaryBranch,
                },
            });

            logger.info(`   ✅ Tenant "${tenant.name}": enabledBranches = [${enabledBranches.join(', ')}], primaryBranch = ${primaryBranch || 'null'}`);
            results[tenant.id] = { enabledBranches, primaryBranch };
        } catch (error) {
            logger.error({ error: error.message, tenantId: tenant.id }, `   ❌ Failed to configure tenant ${tenant.name}`);
            results[tenant.id] = `ERROR: ${error.message}`;
        }
    }

    return results;
}

/**
 * Migra PersonTenantAccess enabledFeatures → enabledBranches
 */
async function migratePersonTenantAccess() {
    logger.info('👤 Migrating PersonTenantAccess enabledBranches...');

    const accesses = await prisma.personTenantAccess.findMany({
        where: {
            deletedAt: null,
            // Solo quelli con enabledFeatures popolato ma enabledBranches vuoto
            enabledBranches: { isEmpty: true },
        },
        select: {
            id: true,
            personId: true,
            tenantId: true,
            enabledFeatures: true,
            enabledBranches: true,
        },
    });

    let migratedCount = 0;
    let skippedCount = 0;

    for (const access of accesses) {
        try {
            // Converti enabledFeatures string array → BranchType array
            const branches = [];

            for (const feature of access.enabledFeatures || []) {
                const featureLower = feature.toLowerCase();
                if (featureLower.includes('medica') || featureLower.includes('clinica')) {
                    if (!branches.includes('MEDICA')) branches.push('MEDICA');
                }
                if (featureLower.includes('formazione') || featureLower.includes('corsi')) {
                    if (!branches.includes('FORMAZIONE')) branches.push('FORMAZIONE');
                }
            }

            // Se nessun branch trovato, imposta entrambi (default full access)
            if (branches.length === 0 && access.enabledFeatures?.length > 0) {
                branches.push('MEDICA', 'FORMAZIONE');
            }

            if (branches.length > 0) {
                await prisma.personTenantAccess.update({
                    where: { id: access.id },
                    data: { enabledBranches: branches },
                });
                migratedCount++;
            } else {
                skippedCount++;
            }
        } catch (error) {
            logger.error({ error: error.message, accessId: access.id }, 'Failed to migrate PersonTenantAccess');
        }
    }

    logger.info(`   ✅ PersonTenantAccess: ${migratedCount} migrated, ${skippedCount} skipped`);

    return { migrated: migratedCount, skipped: skippedCount };
}

/**
 * Configura Admin globale con accesso a tutti i branch su tutti i tenant
 */
async function configureAdminAccess() {
    logger.info('🔑 Configuring Admin global access...');

    // Trova l'admin globale
    const admins = await prisma.person.findMany({
        where: {
            globalRole: { in: ['ADMIN', 'SUPER_ADMIN'] },
            deletedAt: null,
        },
        select: { id: true, email: true, globalRole: true },
    });

    if (admins.length === 0) {
        logger.warn('   ⚠️ No admin users found');
        return { admins: 0 };
    }

    const tenants = await prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, enabledBranches: true },
    });

    let accessesCreated = 0;

    for (const admin of admins) {
        for (const tenant of tenants) {
            // Verifica se l'accesso esiste già
            const existingAccess = await prisma.personTenantAccess.findUnique({
                where: {
                    personId_tenantId: {
                        personId: admin.id,
                        tenantId: tenant.id,
                    },
                },
            });

            if (existingAccess) {
                // Aggiorna enabledBranches se necessario
                if (existingAccess.enabledBranches?.length !== tenant.enabledBranches?.length) {
                    await prisma.personTenantAccess.update({
                        where: { id: existingAccess.id },
                        data: {
                            enabledBranches: tenant.enabledBranches || ['MEDICA', 'FORMAZIONE'],
                            accessLevel: 'ADMIN',
                        },
                    });
                    logger.debug(`   📝 Updated access for ${admin.email} on tenant ${tenant.name}`);
                }
            } else {
                // Crea nuovo accesso
                await prisma.personTenantAccess.create({
                    data: {
                        personId: admin.id,
                        tenantId: tenant.id,
                        accessLevel: 'ADMIN',
                        enabledBranches: tenant.enabledBranches || ['MEDICA', 'FORMAZIONE'],
                        isActive: true,
                        isPrimary: admin.tenantId === tenant.id,
                    },
                });
                accessesCreated++;
                logger.debug(`   ✅ Created access for ${admin.email} on tenant ${tenant.name}`);
            }
        }
    }

    logger.info(`   ✅ Admin access configured: ${admins.length} admins, ${accessesCreated} new accesses`);

    return { admins: admins.length, accessesCreated };
}

// ============================================
// VALIDAZIONE
// ============================================

/**
 * Valida la migrazione verificando che non ci siano record senza branchType
 */
async function validateMigration() {
    logger.info('🔍 Validating migration...');

    const issues = [];

    // Verifica entità MEDICA
    for (const entityName of MEDICA_ENTITIES) {
        try {
            const count = await prisma[entityName].count({
                where: {
                    branchType: null,
                    deletedAt: null,
                },
            });

            if (count > 0) {
                issues.push(`${entityName}: ${count} records without branchType`);
                logger.warn(`   ⚠️ ${entityName}: ${count} records still without branchType`);
            }
        } catch (error) {
            logger.error({ error: error.message, entityName }, `Failed to validate ${entityName}`);
        }
    }

    // Verifica entità FORMAZIONE
    for (const entityName of FORMAZIONE_ENTITIES) {
        try {
            const count = await prisma[entityName].count({
                where: {
                    branchType: null,
                    deletedAt: null,
                },
            });

            if (count > 0) {
                issues.push(`${entityName}: ${count} records without branchType`);
                logger.warn(`   ⚠️ ${entityName}: ${count} records still without branchType`);
            }
        } catch (error) {
            logger.error({ error: error.message, entityName }, `Failed to validate ${entityName}`);
        }
    }

    // Verifica tenant
    const tenantsWithoutBranches = await prisma.tenant.count({
        where: {
            enabledBranches: { isEmpty: true },
            deletedAt: null,
        },
    });

    if (tenantsWithoutBranches > 0) {
        issues.push(`tenants: ${tenantsWithoutBranches} without enabledBranches`);
        logger.warn(`   ⚠️ ${tenantsWithoutBranches} tenants without enabledBranches`);
    }

    if (issues.length === 0) {
        logger.info('   ✅ Migration validation PASSED - all records have branchType');
        return { valid: true, issues: [] };
    } else {
        logger.error(`   ❌ Migration validation FAILED - ${issues.length} issues found`);
        return { valid: false, issues };
    }
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   PROGETTO 45 - BRANCH TYPE MIGRATION');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n');

    const startTime = Date.now();

    try {
        // 1. Migra entità MEDICA
        const medicaResults = await migrateMedicaEntities();

        // 2. Migra entità FORMAZIONE
        const formazioneResults = await migrateFormazioneEntities();

        // 3. Configura Tenant
        const tenantResults = await migrateTenants();

        // 4. Migra PersonTenantAccess
        const accessResults = await migratePersonTenantAccess();

        // 5. Configura Admin
        const adminResults = await configureAdminAccess();

        // 6. Valida migrazione
        const validation = await validateMigration();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\n');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('   MIGRATION SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`   Duration: ${duration}s`);
        console.log(`   Validation: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`);
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('\n');

        process.exit(validation.valid ? 0 : 1);
    } catch (error) {
        logger.error({ error: error.message, stack: error.stack }, 'Migration failed with error');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
main();
