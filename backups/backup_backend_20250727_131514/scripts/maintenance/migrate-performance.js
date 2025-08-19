import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Performance Migration Runner
 * Executes database performance optimization migrations
 */
class PerformanceMigrationRunner {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  /**
   * Run performance optimization migration
   */
  async runPerformanceMigration() {
    try {
      logger.info('Starting performance optimization migration...');
      
      // Create migration log table if it doesn't exist
      await this.createMigrationLogTable();
      
      // Check if migration already executed
      const migrationExists = await this.checkMigrationExists('003_performance_optimization');
      if (migrationExists) {
        logger.info('Performance optimization migration already executed');
        return;
      }
      
      // Read and execute migration SQL
      const migrationPath = path.join(__dirname, '../migrations/003_performance_optimization.sql');
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      
      // Split SQL into individual statements
      const statements = this.splitSQLStatements(migrationSQL);
      
      // Execute migration in transaction
      await this.prisma.$transaction(async (tx) => {
        for (const statement of statements) {
          if (statement.trim()) {
            logger.info(`Executing: ${statement.substring(0, 100)}...`);
            await tx.$executeRawUnsafe(statement);
          }
        }
      });
      
      logger.info('Performance optimization migration completed successfully');
      
      // Verify migration results
      await this.verifyMigration();
      
    } catch (error) {
      logger.error('Performance migration failed:', error);
      throw error;
    }
  }

  /**
   * Create migration log table
   */
  async createMigrationLogTable() {
    try {
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS migration_log (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          description TEXT,
          status VARCHAR(50) DEFAULT 'completed'
        )
      `;
    } catch (error) {
      logger.warn('Migration log table might already exist:', error.message);
    }
  }

  /**
   * Check if migration already exists
   */
  async checkMigrationExists(migrationName) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM migration_log 
        WHERE migration_name = ${migrationName}
      `;
      return result[0].count > 0;
    } catch (error) {
      logger.warn('Could not check migration existence:', error.message);
      return false;
    }
  }

  /**
   * Split SQL file into individual statements
   */
  splitSQLStatements(sql) {
    // Remove comments and split by semicolon
    const cleanSQL = sql
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\n\s*\n/g, '\n'); // Remove empty lines
    
    return cleanSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.match(/^\s*$/));
  }

  /**
   * Verify migration results
   */
  async verifyMigration() {
    try {
      logger.info('Verifying migration results...');
      
      // Check if indexes were created
      const indexes = await this.prisma.$queryRaw`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE indexname LIKE 'idx_%'
        ORDER BY tablename, indexname
      `;
      
      logger.info(`Created ${indexes.length} performance indexes`);
      
      // Check if dashboard view was created
      const views = await this.prisma.$queryRaw`
        SELECT viewname 
        FROM pg_views 
        WHERE viewname = 'dashboard_stats'
      `;
      
      if (views.length > 0) {
        logger.info('Dashboard stats view created successfully');
      }
      
      // Test dashboard view
      const dashboardStats = await this.prisma.$queryRaw`
        SELECT * FROM dashboard_stats
      `;
      
      logger.info('Dashboard stats:', dashboardStats[0]);
      
      // Check if performance log table was created
      const perfTable = await this.prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'query_performance_log'
      `;
      
      if (perfTable.length > 0) {
        logger.info('Query performance log table created successfully');
      }
      
      logger.info('Migration verification completed');
      
    } catch (error) {
      logger.error('Migration verification failed:', error);
    }
  }

  /**
   * Rollback performance migration (if needed)
   */
  async rollbackPerformanceMigration() {
    try {
      logger.info('Rolling back performance optimization migration...');
      
      // Drop indexes
      const dropIndexes = [
        'DROP INDEX IF EXISTS idx_companies_name',
        'DROP INDEX IF EXISTS idx_companies_created_at',
        'DROP INDEX IF EXISTS idx_companies_active',
        'DROP INDEX IF EXISTS idx_employees_company_id',
        'DROP INDEX IF EXISTS idx_employees_email',
        'DROP INDEX IF EXISTS idx_employees_name',
        'DROP INDEX IF EXISTS idx_courses_name',
        'DROP INDEX IF EXISTS idx_course_schedules_course_id',
        'DROP INDEX IF EXISTS idx_course_schedules_company_id',
        'DROP INDEX IF EXISTS idx_course_schedules_date_range',
        // Add more as needed
      ];
      
      for (const dropSQL of dropIndexes) {
        await this.prisma.$executeRawUnsafe(dropSQL);
      }
      
      // Drop views and functions
      await this.prisma.$executeRaw`DROP VIEW IF EXISTS dashboard_stats`;
      await this.prisma.$executeRaw`DROP FUNCTION IF EXISTS notify_cache_invalidation()`;
      await this.prisma.$executeRaw`DROP TABLE IF EXISTS query_performance_log`;
      
      // Remove from migration log
      await this.prisma.$executeRaw`
        DELETE FROM migration_log WHERE migration_name = '003_performance_optimization'
      `;
      
      logger.info('Performance migration rollback completed');
      
    } catch (error) {
      logger.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus() {
    try {
      const migrations = await this.prisma.$queryRaw`
        SELECT migration_name, executed_at, description, status 
        FROM migration_log 
        ORDER BY executed_at DESC
      `;
      
      return migrations;
    } catch (error) {
      logger.error('Could not get migration status:', error);
      return [];
    }
  }

  /**
   * Close database connection
   */
  async close() {
    await this.prisma.$disconnect();
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new PerformanceMigrationRunner();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      runner.runPerformanceMigration()
        .then(() => {
          console.log('Migration completed successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Migration failed:', error);
          process.exit(1);
        })
        .finally(() => runner.close());
      break;
      
    case 'rollback':
      runner.rollbackPerformanceMigration()
        .then(() => {
          console.log('Rollback completed successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Rollback failed:', error);
          process.exit(1);
        })
        .finally(() => runner.close());
      break;
      
    case 'status':
      runner.getMigrationStatus()
        .then((migrations) => {
          console.log('Migration Status:');
          console.table(migrations);
          process.exit(0);
        })
        .catch((error) => {
          console.error('Could not get status:', error);
          process.exit(1);
        })
        .finally(() => runner.close());
      break;
      
    default:
      console.log('Usage: node migrate-performance.js [migrate|rollback|status]');
      process.exit(1);
  }
}

export default PerformanceMigrationRunner;