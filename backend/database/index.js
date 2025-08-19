/**
 * Database Module Index
 * Centralized exports for all database-related functionality
 */

import { DatabaseManager } from './manager.js';
import { DatabaseBackupManager } from './backup.js';
import { DatabaseMonitor, createDatabaseMonitor } from './monitoring.js';
import { QueryOptimizer, createQueryOptimizer } from './query-optimizer.js';
import { getDatabaseConfig, validateDatabaseConfig, createPrismaConfig } from '../config/database-config.js';
import { logger } from '../utils/logger.js';

/**
 * Database Service Class
 * Orchestrates all database-related services
 */
export class DatabaseService {
  constructor(environment = null) {
    this.environment = environment || process.env.NODE_ENV || 'development';
    this.config = getDatabaseConfig(this.environment);
    
    // Initialize components
    this.manager = null;
    this.backupManager = null;
    this.monitor = null;
    this.optimizer = null;
    
    this.isInitialized = false;
    this.isShuttingDown = false;
  }

  /**
   * Initialize database service
   * @returns {Promise<DatabaseService>} Service instance
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Database service already initialized', {
        component: 'database-service'
      });
      return this;
    }

    try {
      logger.info('Initializing database service...', {
        environment: this.environment,
        component: 'database-service'
      });

      // Validate configuration
      const configValidation = validateDatabaseConfig(this.config);
      if (!configValidation.isValid) {
        throw new Error(`Invalid database configuration: ${configValidation.errors.join(', ')}`);
      }

      // Initialize database manager
      this.manager = new DatabaseManager(this.environment);
      await this.manager.initialize();
      logger.info('Database manager initialized', {
        component: 'database-service'
      });

      // Initialize backup manager if enabled
      if (this.config.backup?.enabled) {
        this.backupManager = new DatabaseBackupManager(this.environment);
        await this.backupManager.initialize();
        logger.info('Database backup manager initialized', {
          component: 'database-service'
        });
      }

      // Initialize monitoring if enabled
      if (this.config.monitoring?.enabled) {
        this.monitor = createDatabaseMonitor(this.environment);
        this.monitor.start(this.manager);
        logger.info('Database monitoring initialized', {
          component: 'database-service'
        });
      }

      // Initialize query optimizer if enabled
      if (this.config.optimization?.enabled) {
        this.optimizer = createQueryOptimizer(this.environment);
        
        // Connect optimizer to manager events
        this.manager.on('queryCompleted', (queryInfo) => {
          this.optimizer.analyzeQuery(queryInfo);
        });
        
        logger.info('Query optimizer initialized', {
          component: 'database-service'
        });
      }

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      this.isInitialized = true;
      
      logger.info('Database service fully initialized', {
        environment: this.environment,
        features: {
          manager: true,
          backup: !!this.backupManager,
          monitoring: !!this.monitor,
          optimization: !!this.optimizer
        },
        component: 'database-service'
      });

      return this;
    } catch (error) {
      logger.error('Failed to initialize database service:', {
        error: error.message,
        stack: error.stack,
        component: 'database-service'
      });
      throw error;
    }
  }

  /**
   * Get database client (primary)
   * @returns {PrismaClient} Primary database client
   */
  getClient() {
    this.ensureInitialized();
    return this.manager.getPrimaryClient();
  }

  /**
   * Get readonly database client
   * @returns {PrismaClient} Readonly database client
   */
  getReadonlyClient() {
    this.ensureInitialized();
    return this.manager.getReadonlyClient();
  }

  /**
   * Get analytics database client
   * @returns {PrismaClient} Analytics database client
   */
  getAnalyticsClient() {
    this.ensureInitialized();
    return this.manager.getAnalyticsClient();
  }

  /**
   * Perform health check
   * @returns {Promise<object>} Health check results
   */
  async healthCheck() {
    this.ensureInitialized();
    return await this.manager.healthCheck();
  }

  /**
   * Get connection information
   * @returns {Promise<object>} Connection information
   */
  async getConnectionInfo() {
    this.ensureInitialized();
    return await this.manager.getConnectionInfo();
  }

  /**
   * Get query statistics
   * @returns {object} Query statistics
   */
  getQueryStats() {
    this.ensureInitialized();
    return this.manager.getQueryStats();
  }

  /**
   * Create database backup
   * @param {object} options - Backup options
   * @returns {Promise<string>} Backup file path
   */
  async createBackup(options = {}) {
    this.ensureInitialized();
    
    if (!this.backupManager) {
      throw new Error('Backup manager not initialized - backup feature disabled');
    }
    
    return await this.backupManager.createBackup(options);
  }

  /**
   * Restore from backup
   * @param {string} backupPath - Path to backup file
   * @param {object} options - Restore options
   * @returns {Promise<void>}
   */
  async restoreBackup(backupPath, options = {}) {
    this.ensureInitialized();
    
    if (!this.backupManager) {
      throw new Error('Backup manager not initialized - backup feature disabled');
    }
    
    return await this.backupManager.restoreBackup(backupPath, options);
  }

  /**
   * List available backups
   * @returns {Promise<Array>} List of backups
   */
  async listBackups() {
    this.ensureInitialized();
    
    if (!this.backupManager) {
      throw new Error('Backup manager not initialized - backup feature disabled');
    }
    
    return await this.backupManager.listBackups();
  }

  /**
   * Get monitoring metrics
   * @returns {object} Current metrics
   */
  getMetrics() {
    this.ensureInitialized();
    
    if (!this.monitor) {
      throw new Error('Monitor not initialized - monitoring feature disabled');
    }
    
    return this.monitor.getMetrics();
  }

  /**
   * Get performance summary
   * @returns {object} Performance summary
   */
  getPerformanceSummary() {
    this.ensureInitialized();
    
    if (!this.monitor) {
      throw new Error('Monitor not initialized - monitoring feature disabled');
    }
    
    return this.monitor.getPerformanceSummary();
  }

  /**
   * Get optimization report
   * @returns {object} Optimization report
   */
  getOptimizationReport() {
    this.ensureInitialized();
    
    if (!this.optimizer) {
      throw new Error('Optimizer not initialized - optimization feature disabled');
    }
    
    return this.optimizer.getOptimizationReport();
  }

  /**
   * Get model optimizations
   * @param {string} modelName - Model name
   * @returns {object} Model optimization suggestions
   */
  getModelOptimizations(modelName) {
    this.ensureInitialized();
    
    if (!this.optimizer) {
      throw new Error('Optimizer not initialized - optimization feature disabled');
    }
    
    return this.optimizer.getModelOptimizations(modelName);
  }

  /**
   * Get service status
   * @returns {object} Service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      environment: this.environment,
      features: {
        manager: !!this.manager,
        backup: !!this.backupManager,
        monitoring: !!this.monitor,
        optimization: !!this.optimizer
      },
      config: {
        backup: this.config.backup?.enabled || false,
        monitoring: this.config.monitoring?.enabled || false,
        optimization: this.config.optimization?.enabled || false
      },
      components: {
        manager: this.manager?.getStatus() || null,
        monitor: this.monitor?.getStatus() || null,
        optimizer: this.optimizer?.getStatus() || null
      }
    };
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdownHandler = async (signal) => {
      if (this.isShuttingDown) return;
      
      logger.info(`Received ${signal}, initiating graceful shutdown...`, {
        component: 'database-service'
      });
      
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
    process.on('SIGUSR2', shutdownHandler); // For nodemon
  }

  /**
   * Graceful shutdown
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress', {
        component: 'database-service'
      });
      return;
    }

    this.isShuttingDown = true;

    try {
      logger.info('Shutting down database service...', {
        component: 'database-service'
      });

      // Stop monitoring
      if (this.monitor) {
        this.monitor.stop();
        logger.debug('Database monitor stopped', {
          component: 'database-service'
        });
      }

      // Clear optimizer cache
      if (this.optimizer) {
        this.optimizer.clearCache();
        logger.debug('Query optimizer cache cleared', {
          component: 'database-service'
        });
      }

      // Stop backup manager
      if (this.backupManager) {
        await this.backupManager.stop();
        logger.debug('Backup manager stopped', {
          component: 'database-service'
        });
      }

      // Disconnect database manager
      if (this.manager) {
        await this.manager.disconnect();
        logger.debug('Database manager disconnected', {
          component: 'database-service'
        });
      }

      this.isInitialized = false;
      
      logger.info('Database service shutdown completed', {
        component: 'database-service'
      });
    } catch (error) {
      logger.error('Error during database service shutdown:', {
        error: error.message,
        component: 'database-service'
      });
      throw error;
    }
  }

  /**
   * Ensure service is initialized
   * @throws {Error} If service not initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
  }
}

// Global database service instance
let globalDatabaseService = null;

/**
 * Get or create global database service instance
 * @param {string} environment - Target environment
 * @returns {DatabaseService} Database service instance
 */
export const getDatabaseService = (environment = null) => {
  if (!globalDatabaseService) {
    globalDatabaseService = new DatabaseService(environment);
  }
  return globalDatabaseService;
};

/**
 * Initialize global database service
 * @param {string} environment - Target environment
 * @returns {Promise<DatabaseService>} Initialized database service
 */
export const initializeDatabaseService = async (environment = null) => {
  const service = getDatabaseService(environment);
  await service.initialize();
  return service;
};

/**
 * Get database client (convenience function)
 * @returns {PrismaClient} Primary database client
 */
export const getClient = () => {
  return getDatabaseService().getClient();
};

/**
 * Get readonly database client (convenience function)
 * @returns {PrismaClient} Readonly database client
 */
export const getReadonlyClient = () => {
  return getDatabaseService().getReadonlyClient();
};

/**
 * Get analytics database client (convenience function)
 * @returns {PrismaClient} Analytics database client
 */
export const getAnalyticsClient = () => {
  return getDatabaseService().getAnalyticsClient();
};

// Export all classes and functions
export {
  DatabaseManager,
  DatabaseBackupManager,
  DatabaseMonitor,
  QueryOptimizer,
  createDatabaseMonitor,
  createQueryOptimizer,
  getDatabaseConfig,
  validateDatabaseConfig,
  createPrismaConfig
};

// Default export
export default {
  DatabaseService,
  DatabaseManager,
  DatabaseBackupManager,
  DatabaseMonitor,
  QueryOptimizer,
  getDatabaseService,
  initializeDatabaseService,
  getClient,
  getReadonlyClient,
  getAnalyticsClient,
  createDatabaseMonitor,
  createQueryOptimizer,
  getDatabaseConfig,
  validateDatabaseConfig,
  createPrismaConfig
};