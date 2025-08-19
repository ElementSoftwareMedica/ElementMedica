#!/usr/bin/env node

/**
 * Database Migration Script
 * Executes SQL migrations for the new user management system
 * 
 * Usage:
 *   node migrate.js [--dry-run] [--rollback] [--force]
 * 
 * Options:
 *   --dry-run    Show what would be executed without running
 *   --rollback   Rollback the last migration
 *   --force      Force execution even if migrations exist
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Migration configuration
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATION_FILES = [
    '001_add_user_management_tables.sql',
    '002_update_prisma_schema.sql'
];

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRollback = args.includes('--rollback');
const isForce = args.includes('--force');

/**
 * Logger utility
 */
class MigrationLogger {
    static info(message) {
        logger.info(message, { component: 'migration' });
    }
    
    static success(message) {
        logger.info(message, { component: 'migration', status: 'success' });
    }
    
    static warning(message) {
        logger.warn(message, { component: 'migration' });
    }
    
    static error(message) {
        logger.error(message, { component: 'migration' });
    }
    
    static step(step, total, message) {
        logger.info(`[${step}/${total}] ${message}`, { component: 'migration', step, total });
    }
}

/**
 * Check if migration tables exist
 */
async function checkMigrationTables() {
    try {
        await prisma.$queryRaw`SELECT 1 FROM "_prisma_migrations" LIMIT 1`;
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Check if new user management tables exist
 */
async function checkUserManagementTables() {
    try {
        const result = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'roles', 'user_roles', 'user_sessions')
        `;
        return result.length > 0;
    } catch (error) {
        MigrationLogger.error(`Error checking tables: ${error.message}`);
        return false;
    }
}

/**
 * Create database backup
 */
async function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_before_migration_${timestamp}`;
    
    MigrationLogger.info(`Creating database backup: ${backupName}`);
    
    try {
        // Note: This would need to be implemented based on your database setup
        // For now, we'll just log the intention
        MigrationLogger.warning('Backup creation not implemented - ensure you have a recent backup!');
        return backupName;
    } catch (error) {
        MigrationLogger.error(`Backup failed: ${error.message}`);
        throw error;
    }
}

/**
 * Execute SQL file
 */
async function executeSqlFile(filePath) {
    try {
        const sql = await fs.readFile(filePath, 'utf-8');
        
        if (isDryRun) {
            MigrationLogger.info(`Would execute SQL from ${path.basename(filePath)}:`);
            logger.info('--- SQL PREVIEW ---', { component: 'migration' });
            logger.info(sql.substring(0, 500) + '...', { component: 'migration' });
            logger.info('--- END PREVIEW ---', { component: 'migration' });
            return;
        }
        
        // Split SQL into individual statements and execute
        const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
            if (statement.trim()) {
                await prisma.$executeRawUnsafe(statement + ';');
            }
        }
        
        MigrationLogger.success(`Executed ${path.basename(filePath)}`);
    } catch (error) {
        MigrationLogger.error(`Failed to execute ${path.basename(filePath)}: ${error.message}`);
        throw error;
    }
}

/**
 * Run migrations
 */
async function runMigrations() {
    MigrationLogger.info('Starting database migration process...');
    
    // Check prerequisites
    const hasMigrationTables = await checkMigrationTables();
    if (!hasMigrationTables) {
        MigrationLogger.error('Prisma migration tables not found. Run "npx prisma migrate dev" first.');
        process.exit(1);
    }
    
    // Check if already migrated
    const hasUserTables = await checkUserManagementTables();
    if (hasUserTables && !isForce) {
        MigrationLogger.warning('User management tables already exist. Use --force to override.');
        return;
    }
    
    // Create backup
    if (!isDryRun) {
        await createBackup();
    }
    
    // Execute migrations
    for (let i = 0; i < MIGRATION_FILES.length; i++) {
        const fileName = MIGRATION_FILES[i];
        const filePath = path.join(MIGRATIONS_DIR, fileName);
        
        MigrationLogger.step(i + 1, MIGRATION_FILES.length, `Executing ${fileName}`);
        
        try {
            await executeSqlFile(filePath);
        } catch (error) {
            MigrationLogger.error(`Migration failed at step ${i + 1}`);
            throw error;
        }
    }
    
    if (!isDryRun) {
        MigrationLogger.success('All migrations completed successfully!');
    } else {
        MigrationLogger.info('Dry run completed - no changes made to database');
    }
}

/**
 * Rollback migrations
 */
async function rollbackMigrations() {
    MigrationLogger.warning('Rolling back user management migrations...');
    
    if (isDryRun) {
        MigrationLogger.info('Would execute rollback (dropping new tables)');
        return;
    }
    
    try {
        // Drop new tables in reverse order
        const dropTables = [
            'company_settings',
            'user_preferences', 
            'data_export_requests',
            'audit_logs',
            'user_consents',
            'user_sessions',
            'user_roles',
            'roles',
            'users'
        ];
        
        for (const table of dropTables) {
            await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
            MigrationLogger.info(`Dropped table: ${table}`);
        }
        
        // Remove added columns from existing tables
        const removeColumns = [
            'ALTER TABLE "Company" DROP COLUMN IF EXISTS "created_by", DROP COLUMN IF EXISTS "updated_by", DROP COLUMN IF EXISTS "updated_at", DROP COLUMN IF EXISTS "deleted_at", DROP COLUMN IF EXISTS "deleted_by";',
            'ALTER TABLE "Employee" DROP COLUMN IF EXISTS "created_by", DROP COLUMN IF EXISTS "updated_by", DROP COLUMN IF EXISTS "updated_at", DROP COLUMN IF EXISTS "deleted_at", DROP COLUMN IF EXISTS "deleted_by";',
            'ALTER TABLE "Course" DROP COLUMN IF EXISTS "created_by", DROP COLUMN IF EXISTS "updated_by", DROP COLUMN IF EXISTS "updated_at", DROP COLUMN IF EXISTS "deleted_at", DROP COLUMN IF EXISTS "deleted_by";',
            'ALTER TABLE "CourseSchedule" DROP COLUMN IF EXISTS "created_by", DROP COLUMN IF EXISTS "updated_by", DROP COLUMN IF EXISTS "updated_at", DROP COLUMN IF EXISTS "deleted_at", DROP COLUMN IF EXISTS "deleted_by";',
            'ALTER TABLE "Trainer" DROP COLUMN IF EXISTS "created_by", DROP COLUMN IF EXISTS "updated_by", DROP COLUMN IF EXISTS "updated_at", DROP COLUMN IF EXISTS "deleted_at", DROP COLUMN IF EXISTS "deleted_by";'
        ];
        
        for (const sql of removeColumns) {
            await prisma.$executeRawUnsafe(sql);
        }
        
        // Drop functions and triggers
        await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;');
        await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;');
        await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS check_employee_company_consistency() CASCADE;');
        
        MigrationLogger.success('Rollback completed successfully!');
    } catch (error) {
        MigrationLogger.error(`Rollback failed: ${error.message}`);
        throw error;
    }
}

/**
 * Validate migration files exist
 */
async function validateMigrationFiles() {
    for (const fileName of MIGRATION_FILES) {
        const filePath = path.join(MIGRATIONS_DIR, fileName);
        try {
            await fs.access(filePath);
        } catch (error) {
            MigrationLogger.error(`Migration file not found: ${fileName}`);
            process.exit(1);
        }
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        MigrationLogger.info('Database Migration Tool v1.0');
        MigrationLogger.info('================================');
        
        if (isDryRun) {
            MigrationLogger.info('DRY RUN MODE - No changes will be made');
        }
        
        // Validate migration files
        await validateMigrationFiles();
        
        // Execute based on mode
        if (isRollback) {
            await rollbackMigrations();
        } else {
            await runMigrations();
        }
        
        MigrationLogger.info('Migration process completed.');
        
    } catch (error) {
        MigrationLogger.error(`Migration failed: ${error.message}`);
        logger.error('Migration stack trace', { component: 'migration', stack: error.stack });
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    MigrationLogger.warning('Migration interrupted by user');
    await prisma.$disconnect();
    process.exit(1);
});

process.on('SIGTERM', async () => {
    MigrationLogger.warning('Migration terminated');
    await prisma.$disconnect();
    process.exit(1);
});

// Run the migration
main().catch(error => {
    logger.error('Unhandled migration error', { component: 'migration', error: error.message, stack: error.stack });
});