/**
 * Database Backup and Recovery Module
 * Handles automated backups, restoration, and data retention
 */

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { getDatabaseConfig } from '../config/database-config.js';
import { logger } from '../utils/logger.js';
import cron from 'node-cron';

/**
 * Database Backup Manager Class
 * Handles backup creation, restoration, and management
 */
export class DatabaseBackupManager {
  constructor(environment = null) {
    this.environment = environment || process.env.NODE_ENV || 'development';
    this.config = getDatabaseConfig(this.environment).backup;
    this.backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    this.scheduledJobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize backup manager
   * @returns {Promise<DatabaseBackupManager>} Manager instance
   */
  async initialize() {
    try {
      // Create backup directory if it doesn't exist
      await this.ensureBackupDirectory();

      // Schedule automatic backups if enabled
      if (this.config.enabled && this.config.schedule) {
        this.scheduleBackups();
      }

      // Setup cleanup job for old backups
      this.scheduleCleanup();

      this.isInitialized = true;
      
      logger.info('Database backup manager initialized', {
        environment: this.environment,
        enabled: this.config.enabled,
        schedule: this.config.schedule,
        retention: this.config.retention,
        component: 'backup-manager'
      });

      return this;
    } catch (error) {
      logger.error('Failed to initialize backup manager:', {
        error: error.message,
        component: 'backup-manager'
      });
      throw error;
    }
  }

  /**
   * Ensure backup directory exists
   * @returns {Promise<void>}
   */
  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info(`Created backup directory: ${this.backupDir}`, {
        component: 'backup-manager'
      });
    }
  }

  /**
   * Create database backup
   * @param {object} options - Backup options
   * @returns {Promise<object>} Backup result
   */
  async createBackup(options = {}) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = options.name || `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, `${backupName}.sql`);
    const compressedPath = `${backupPath}.gz`;

    try {
      logger.info('Starting database backup', {
        name: backupName,
        path: backupPath,
        compression: this.config.compression,
        component: 'backup-manager'
      });

      // Create database dump
      await this.createDatabaseDump(backupPath, options);

      let finalPath = backupPath;
      let size = (await fs.stat(backupPath)).size;

      // Compress backup if enabled
      if (this.config.compression) {
        await this.compressBackup(backupPath, compressedPath);
        await fs.unlink(backupPath); // Remove uncompressed file
        finalPath = compressedPath;
        size = (await fs.stat(compressedPath)).size;
      }

      const duration = Date.now() - startTime;
      const result = {
        name: backupName,
        path: finalPath,
        size,
        compressed: this.config.compression,
        duration,
        timestamp: new Date().toISOString(),
        environment: this.environment
      };

      // Upload to remote storage if configured
      if (this.config.remoteStorage?.enabled) {
        try {
          await this.uploadToRemoteStorage(finalPath, backupName);
          result.remoteStorage = true;
        } catch (error) {
          logger.error('Failed to upload backup to remote storage:', {
            error: error.message,
            backup: backupName,
            component: 'backup-manager'
          });
          result.remoteStorage = false;
        }
      }

      logger.info('Database backup completed successfully', {
        ...result,
        sizeFormatted: this.formatBytes(size),
        durationFormatted: `${duration}ms`,
        component: 'backup-manager'
      });

      return result;
    } catch (error) {
      logger.error('Database backup failed:', {
        error: error.message,
        name: backupName,
        component: 'backup-manager'
      });
      
      // Cleanup failed backup files
      try {
        await fs.unlink(backupPath).catch(() => {});
        await fs.unlink(compressedPath).catch(() => {});
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw error;
    }
  }

  /**
   * Create database dump using pg_dump
   * @param {string} outputPath - Output file path
   * @param {object} options - Dump options
   * @returns {Promise<void>}
   */
  async createDatabaseDump(outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        reject(new Error('DATABASE_URL not configured'));
        return;
      }

      // Parse database URL
      const url = new URL(databaseUrl);
      const args = [
        '--host', url.hostname,
        '--port', url.port || '5432',
        '--username', url.username,
        '--dbname', url.pathname.slice(1),
        '--no-password',
        '--verbose',
        '--clean',
        '--no-acl',
        '--no-owner'
      ];

      // Add custom options
      if (options.schemaOnly) {
        args.push('--schema-only');
      }
      if (options.dataOnly) {
        args.push('--data-only');
      }
      if (options.excludeTable) {
        options.excludeTable.forEach(table => {
          args.push('--exclude-table', table);
        });
      }

      args.push('--file', outputPath);

      const pgDump = spawn('pg_dump', args, {
        env: {
          ...process.env,
          PGPASSWORD: url.password
        }
      });

      let stderr = '';

      pgDump.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
        }
      });

      pgDump.on('error', (error) => {
        reject(new Error(`pg_dump process error: ${error.message}`));
      });
    });
  }

  /**
   * Compress backup file
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @returns {Promise<void>}
   */
  async compressBackup(inputPath, outputPath) {
    const readStream = await fs.open(inputPath, 'r');
    const writeStream = await fs.open(outputPath, 'w');
    const gzip = createGzip({ level: 9 });

    try {
      await pipeline(
        readStream.createReadStream(),
        gzip,
        writeStream.createWriteStream()
      );
    } finally {
      await readStream.close();
      await writeStream.close();
    }
  }

  /**
   * Restore database from backup
   * @param {string} backupPath - Backup file path
   * @param {object} options - Restore options
   * @returns {Promise<object>} Restore result
   */
  async restoreBackup(backupPath, options = {}) {
    const startTime = Date.now();
    let tempPath = backupPath;

    try {
      logger.info('Starting database restore', {
        backup: backupPath,
        component: 'backup-manager'
      });

      // Check if backup file exists
      await fs.access(backupPath);

      // Decompress if needed
      if (backupPath.endsWith('.gz')) {
        tempPath = backupPath.replace('.gz', '');
        await this.decompressBackup(backupPath, tempPath);
      }

      // Restore database
      await this.restoreDatabase(tempPath, options);

      const duration = Date.now() - startTime;
      const result = {
        backup: backupPath,
        duration,
        timestamp: new Date().toISOString(),
        success: true
      };

      logger.info('Database restore completed successfully', {
        ...result,
        durationFormatted: `${duration}ms`,
        component: 'backup-manager'
      });

      return result;
    } catch (error) {
      logger.error('Database restore failed:', {
        error: error.message,
        backup: backupPath,
        component: 'backup-manager'
      });
      throw error;
    } finally {
      // Cleanup temporary decompressed file
      if (tempPath !== backupPath) {
        try {
          await fs.unlink(tempPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Decompress backup file
   * @param {string} inputPath - Compressed file path
   * @param {string} outputPath - Output file path
   * @returns {Promise<void>}
   */
  async decompressBackup(inputPath, outputPath) {
    const readStream = await fs.open(inputPath, 'r');
    const writeStream = await fs.open(outputPath, 'w');
    const gunzip = createGunzip();

    try {
      await pipeline(
        readStream.createReadStream(),
        gunzip,
        writeStream.createWriteStream()
      );
    } finally {
      await readStream.close();
      await writeStream.close();
    }
  }

  /**
   * Restore database using psql
   * @param {string} backupPath - Backup file path
   * @param {object} options - Restore options
   * @returns {Promise<void>}
   */
  async restoreDatabase(backupPath, options = {}) {
    return new Promise((resolve, reject) => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        reject(new Error('DATABASE_URL not configured'));
        return;
      }

      // Parse database URL
      const url = new URL(databaseUrl);
      const args = [
        '--host', url.hostname,
        '--port', url.port || '5432',
        '--username', url.username,
        '--dbname', url.pathname.slice(1),
        '--no-password',
        '--verbose'
      ];

      // Add restore options
      if (options.clean) {
        args.push('--clean');
      }
      if (options.noOwner) {
        args.push('--no-owner');
      }
      if (options.noAcl) {
        args.push('--no-acl');
      }

      args.push('--file', backupPath);

      const psql = spawn('psql', args, {
        env: {
          ...process.env,
          PGPASSWORD: url.password
        }
      });

      let stderr = '';

      psql.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      psql.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql failed with code ${code}: ${stderr}`));
        }
      });

      psql.on('error', (error) => {
        reject(new Error(`psql process error: ${error.message}`));
      });
    });
  }

  /**
   * List available backups
   * @returns {Promise<Array>} List of backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.sql') || file.endsWith('.sql.gz')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            name: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
            compressed: file.endsWith('.gz')
          });
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => b.created - a.created);

      return backups;
    } catch (error) {
      logger.error('Failed to list backups:', {
        error: error.message,
        component: 'backup-manager'
      });
      throw error;
    }
  }

  /**
   * Delete backup file
   * @param {string} backupName - Backup file name
   * @returns {Promise<boolean>} Success status
   */
  async deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      await fs.unlink(backupPath);
      
      logger.info('Backup deleted successfully', {
        backup: backupName,
        component: 'backup-manager'
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to delete backup:', {
        error: error.message,
        backup: backupName,
        component: 'backup-manager'
      });
      return false;
    }
  }

  /**
   * Schedule automatic backups
   */
  scheduleBackups() {
    if (!this.config.schedule) {
      return;
    }

    const job = cron.schedule(this.config.schedule, async () => {
      try {
        await this.createBackup({
          name: `scheduled-${Date.now()}`
        });
      } catch (error) {
        logger.error('Scheduled backup failed:', {
          error: error.message,
          component: 'backup-manager'
        });
      }
    }, {
      scheduled: false
    });

    job.start();
    this.scheduledJobs.set('backup', job);

    logger.info('Automatic backups scheduled', {
      schedule: this.config.schedule,
      component: 'backup-manager'
    });
  }

  /**
   * Schedule cleanup of old backups
   */
  scheduleCleanup() {
    // Run cleanup daily at 3 AM
    const job = cron.schedule('0 3 * * *', async () => {
      try {
        await this.cleanupOldBackups();
      } catch (error) {
        logger.error('Backup cleanup failed:', {
          error: error.message,
          component: 'backup-manager'
        });
      }
    }, {
      scheduled: false
    });

    job.start();
    this.scheduledJobs.set('cleanup', job);

    logger.info('Backup cleanup scheduled', {
      retention: `${this.config.retention} days`,
      component: 'backup-manager'
    });
  }

  /**
   * Cleanup old backups based on retention policy
   * @returns {Promise<number>} Number of deleted backups
   */
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      const retentionMs = this.config.retention * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - retentionMs);
      
      let deletedCount = 0;
      
      for (const backup of backups) {
        if (backup.created < cutoffDate) {
          const deleted = await this.deleteBackup(backup.name);
          if (deleted) {
            deletedCount++;
          }
        }
      }
      
      logger.info('Backup cleanup completed', {
        deleted: deletedCount,
        retention: `${this.config.retention} days`,
        component: 'backup-manager'
      });
      
      return deletedCount;
    } catch (error) {
      logger.error('Backup cleanup failed:', {
        error: error.message,
        component: 'backup-manager'
      });
      throw error;
    }
  }

  /**
   * Upload backup to remote storage
   * @param {string} backupPath - Local backup path
   * @param {string} backupName - Backup name
   * @returns {Promise<void>}
   */
  async uploadToRemoteStorage(backupPath, backupName) {
    // This is a placeholder for remote storage implementation
    // You would implement specific logic for S3, Google Cloud, etc.
    logger.info('Remote storage upload not implemented', {
      backup: backupName,
      component: 'backup-manager'
    });
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get backup manager status
   * @returns {object} Manager status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      environment: this.environment,
      enabled: this.config.enabled,
      schedule: this.config.schedule,
      retention: this.config.retention,
      compression: this.config.compression,
      backupDir: this.backupDir,
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
      remoteStorage: this.config.remoteStorage?.enabled || false
    };
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    for (const [name, job] of this.scheduledJobs) {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`, {
        component: 'backup-manager'
      });
    }
    this.scheduledJobs.clear();
  }
}

/**
 * Create backup manager instance
 * @param {string} environment - Target environment
 * @returns {Promise<DatabaseBackupManager>} Backup manager instance
 */
export const createBackupManager = async (environment = null) => {
  const manager = new DatabaseBackupManager(environment);
  await manager.initialize();
  return manager;
};

export default {
  DatabaseBackupManager,
  createBackupManager
};