/**
 * Database Manager Module
 * Centralizes database operations, connection management, and monitoring
 */

import { getDatabaseConfig, createPrismaConfig, validateDatabaseConfig } from '../config/database-config.js';
import { logger } from '../utils/logger.js';
import EventEmitter from 'events';
import { PrismaClient } from '@prisma/client';

/**
 * Database Manager Class
 * Provides centralized database management with advanced features
 */
export class DatabaseManager extends EventEmitter {
  constructor(environment = null) {
    super();
    
    this.environment = environment || process.env.NODE_ENV || 'development';
    this.config = getDatabaseConfig(this.environment);
    this.clients = new Map();
    this.healthCheckInterval = null;
    this.metrics = {
      queries: 0,
      slowQueries: 0,
      errors: 0,
      connections: 0,
      lastHealthCheck: null
    };
    this.middlewares = [];
    this.isInitialized = false;
  }

  /**
   * Initialize database manager
   * @returns {Promise<DatabaseManager>} Manager instance
   */
  async initialize() {
    try {
      // Validate configuration
      const validation = validateDatabaseConfig(this.config);
      if (!validation.isValid) {
        throw new Error(`Database configuration invalid: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        logger.warn('Database configuration warnings:', {
          warnings: validation.warnings,
          component: 'database-manager'
        });
      }

      // Create primary client
      await this.createPrimaryClient();

      // Create readonly client if configured
      if (this.config.urls.readonly) {
        await this.createReadonlyClient();
      }

      // Create analytics client if configured
      if (this.config.urls.analytics) {
        await this.createAnalyticsClient();
      }

      // Setup middleware
      await this.setupMiddleware();

      // Start health checks
      this.startHealthChecks();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      this.isInitialized = true;
      
      logger.info('Database manager initialized successfully', {
        environment: this.environment,
        clients: Array.from(this.clients.keys()),
        component: 'database-manager'
      });

      this.emit('initialized');
      return this;
    } catch (error) {
      logger.error('Failed to initialize database manager:', {
        error: error.message,
        environment: this.environment,
        component: 'database-manager'
      });
      throw error;
    }
  }

  /**
   * Create primary database client
   * @returns {Promise<void>}
   */
  async createPrimaryClient() {
    const prismaConfig = createPrismaConfig(this.config);
    const client = new PrismaClient(prismaConfig);
    
    // Setup event listeners
    this.setupClientEventListeners(client, 'primary');
    
    // Test connection
    await this.testConnection(client, 'primary');
    
    this.clients.set('primary', client);
    this.metrics.connections++;
    
    logger.info('Primary database client created', {
      component: 'database-manager'
    });
  }

  /**
   * Create readonly database client
   * @returns {Promise<void>}
   */
  async createReadonlyClient() {
    const readonlyConfig = {
      ...createPrismaConfig(this.config),
      datasources: {
        db: {
          url: this.config.urls.readonly
        }
      }
    };
    
    const client = new PrismaClient(readonlyConfig);
    
    // Setup event listeners
    this.setupClientEventListeners(client, 'readonly');
    
    // Test connection
    await this.testConnection(client, 'readonly');
    
    this.clients.set('readonly', client);
    this.metrics.connections++;
    
    logger.info('Readonly database client created', {
      component: 'database-manager'
    });
  }

  /**
   * Create analytics database client
   * @returns {Promise<void>}
   */
  async createAnalyticsClient() {
    const analyticsConfig = {
      ...createPrismaConfig(this.config),
      datasources: {
        db: {
          url: this.config.urls.analytics
        }
      }
    };
    
    const client = new PrismaClient(analyticsConfig);
    
    // Setup event listeners
    this.setupClientEventListeners(client, 'analytics');
    
    // Test connection
    await this.testConnection(client, 'analytics');
    
    this.clients.set('analytics', client);
    this.metrics.connections++;
    
    logger.info('Analytics database client created', {
      component: 'database-manager'
    });
  }

  /**
   * Setup event listeners for a client
   * @param {PrismaClient} client - Prisma client
   * @param {string} clientName - Client identifier
   */
  setupClientEventListeners(client, clientName) {
    // Query event listener
    client.$on('query', (event) => {
      this.metrics.queries++;
      
      const duration = event.duration;
      const slowThreshold = this.config.database.queryOptimization.slowQueryThreshold;
      
      if (duration > slowThreshold) {
        this.metrics.slowQueries++;
        
        logger.warn('Slow query detected', {
          client: clientName,
          query: event.query,
          duration: `${duration}ms`,
          params: event.params,
          component: 'database-performance'
        });
        
        this.emit('slowQuery', {
          client: clientName,
          query: event.query,
          duration,
          params: event.params
        });
      } else if (this.config.database.queryOptimization.enableQueryLogging) {
        logger.debug('Database query executed', {
          client: clientName,
          duration: `${duration}ms`,
          component: 'database-query'
        });
      }
    });

    // Error event listener
    client.$on('error', (event) => {
      this.metrics.errors++;
      
      logger.error('Database error', {
        client: clientName,
        error: event.message,
        target: event.target,
        component: 'database-error'
      });
      
      this.emit('error', {
        client: clientName,
        error: event
      });
    });

    // Info event listener
    client.$on('info', (event) => {
      logger.info('Database info', {
        client: clientName,
        message: event.message,
        component: 'database-info'
      });
    });

    // Warning event listener
    client.$on('warn', (event) => {
      logger.warn('Database warning', {
        client: clientName,
        message: event.message,
        component: 'database-warning'
      });
    });
  }

  /**
   * Test database connection
   * @param {PrismaClient} client - Prisma client
   * @param {string} clientName - Client identifier
   * @returns {Promise<void>}
   */
  async testConnection(client, clientName) {
    try {
      await client.$queryRaw`SELECT 1`;
      logger.info(`Database connection test successful for ${clientName}`, {
        component: 'database-manager'
      });
    } catch (error) {
      logger.error(`Database connection test failed for ${clientName}:`, {
        error: error.message,
        component: 'database-manager'
      });
      throw error;
    }
  }

  /**
   * Setup database middleware
   * @returns {Promise<void>}
   */
  async setupMiddleware() {
    const primaryClient = this.clients.get('primary');
    if (!primaryClient) return;

    // Performance monitoring middleware
    if (this.config.database.middleware.enablePerformanceTracking) {
      const performanceMiddleware = this.createPerformanceMiddleware();
      primaryClient.$use(performanceMiddleware);
      this.middlewares.push('performance');
    }

    // Soft delete middleware
    if (this.config.database.middleware.enableSoftDelete) {
      try {
        const { createAdvancedSoftDeleteMiddleware } = await import('../middleware/soft-delete-advanced.js');
        const softDeleteMiddleware = createAdvancedSoftDeleteMiddleware();
        primaryClient.$use(softDeleteMiddleware);
        this.middlewares.push('soft-delete');
      } catch (error) {
        logger.warn('Soft delete middleware not available:', {
          error: error.message,
          component: 'database-middleware'
        });
      }
    }

    // Type conversion middleware
    if (this.config.database.middleware.enableTypeConversion) {
      const typeConversionMiddleware = this.createTypeConversionMiddleware();
      primaryClient.$use(typeConversionMiddleware);
      this.middlewares.push('type-conversion');
    }

    // Audit logging middleware
    if (this.config.database.middleware.enableAuditLogging) {
      const auditMiddleware = this.createAuditMiddleware();
      primaryClient.$use(auditMiddleware);
      this.middlewares.push('audit');
    }

    logger.info('Database middleware setup completed', {
      middlewares: this.middlewares,
      component: 'database-manager'
    });
  }

  /**
   * Create performance monitoring middleware
   * @returns {function} Middleware function
   */
  createPerformanceMiddleware() {
    return async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;

      if (this.config.database.queryOptimization.enablePerformanceMonitoring) {
        logger.debug('Database operation completed', {
          model: params.model,
          action: params.action,
          duration: `${duration}ms`,
          component: 'database-performance'
        });

        this.emit('operationCompleted', {
          model: params.model,
          action: params.action,
          duration
        });
      }

      return result;
    };
  }

  /**
   * Create type conversion middleware
   * @returns {function} Middleware function
   */
  createTypeConversionMiddleware() {
    return async (params, next) => {
      // Type conversion logic for specific models
      if (params.model === 'Course') {
        if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
          const data = params.args.data;
          
          if (data) {
            const convertNumericField = (value, isInteger = false) => {
              if (value === null || value === '' || value === undefined) return null;
              const num = Number(value);
              if (isNaN(num)) return null;
              return isInteger ? Math.round(num) : num;
            };
            
            // Convert numeric fields
            if ('validityYears' in data) {
              data.validityYears = convertNumericField(data.validityYears, true);
            }
            if ('maxPeople' in data) {
              data.maxPeople = convertNumericField(data.maxPeople, true);
            }
            if ('pricePerPerson' in data) {
              data.pricePerPerson = convertNumericField(data.pricePerPerson);
            }
          }
        }
      }

      return next(params);
    };
  }

  /**
   * Create audit logging middleware
   * @returns {function} Middleware function
   */
  createAuditMiddleware() {
    return async (params, next) => {
      const start = Date.now();
      const userId = params.args?.userId || 'system';
      
      try {
        const result = await next(params);
        
        // Log successful operations
        if (['create', 'update', 'delete', 'upsert'].includes(params.action)) {
          logger.info('Database audit log', {
            userId,
            model: params.model,
            action: params.action,
            duration: Date.now() - start,
            success: true,
            component: 'database-audit'
          });
        }
        
        return result;
      } catch (error) {
        // Log failed operations
        logger.error('Database audit log - operation failed', {
          userId,
          model: params.model,
          action: params.action,
          duration: Date.now() - start,
          success: false,
          error: error.message,
          component: 'database-audit'
        });
        
        throw error;
      }
    };
  }

  /**
   * Start health checks
   */
  startHealthChecks() {
    if (!this.config.database.healthCheck.enabled) {
      return;
    }

    const interval = this.config.database.healthCheck.interval;
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);

    logger.info('Health checks started', {
      interval: `${interval}ms`,
      component: 'database-manager'
    });
  }

  /**
   * Perform health check on all clients
   * @returns {Promise<object>} Health check results
   */
  async performHealthCheck() {
    const results = {};
    const timeout = this.config.database.healthCheck.timeout;
    
    for (const [name, client] of this.clients) {
      try {
        const start = Date.now();
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), timeout);
        });
        
        // Race between health check and timeout
        await Promise.race([
          client.$queryRaw`SELECT 1`,
          timeoutPromise
        ]);
        
        const duration = Date.now() - start;
        
        results[name] = {
          status: 'healthy',
          duration,
          timestamp: new Date().toISOString()
        };
        
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        logger.error(`Health check failed for ${name}:`, {
          error: error.message,
          component: 'database-health'
        });
        
        this.emit('healthCheckFailed', { client: name, error });
      }
    }
    
    this.metrics.lastHealthCheck = new Date().toISOString();
    this.emit('healthCheckCompleted', results);
    
    return results;
  }

  /**
   * Get database client
   * @param {string} type - Client type (primary, readonly, analytics)
   * @returns {PrismaClient|null} Database client
   */
  getClient(type = 'primary') {
    return this.clients.get(type) || null;
  }

  /**
   * Get primary database client
   * @returns {PrismaClient|null} Primary database client
   */
  getPrimaryClient() {
    return this.getClient('primary');
  }

  /**
   * Get readonly database client
   * @returns {PrismaClient|null} Readonly database client
   */
  getReadonlyClient() {
    return this.getClient('readonly');
  }

  /**
   * Get analytics database client
   * @returns {PrismaClient|null} Analytics database client
   */
  getAnalyticsClient() {
    return this.getClient('analytics');
  }

  /**
   * Get database metrics
   * @returns {object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: this.isInitialized ? Date.now() - this.initTime : 0,
      clients: Array.from(this.clients.keys()),
      middlewares: this.middlewares
    };
  }

  /**
   * Get manager status
   * @returns {object} Manager status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      environment: this.environment,
      clients: Array.from(this.clients.keys()),
      middlewares: this.middlewares,
      metrics: this.getMetrics(),
      healthCheck: {
        enabled: this.config.database.healthCheck.enabled,
        lastCheck: this.metrics.lastHealthCheck
      }
    };
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async () => {
      logger.info('Shutting down database manager...', {
        component: 'database-manager'
      });
      
      await this.disconnect();
    };

    // Don't add multiple listeners
    if (!process.listenerCount('SIGTERM')) {
      process.on('SIGTERM', shutdown);
    }
    if (!process.listenerCount('SIGINT')) {
      process.on('SIGINT', shutdown);
    }
  }

  /**
   * Disconnect all database clients
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Disconnect all clients
      const disconnectPromises = Array.from(this.clients.entries()).map(
        async ([name, client]) => {
          try {
            await client.$disconnect();
            logger.info(`Database client '${name}' disconnected`, {
              component: 'database-manager'
            });
          } catch (error) {
            logger.error(`Error disconnecting client '${name}':`, {
              error: error.message,
              component: 'database-manager'
            });
          }
        }
      );

      await Promise.all(disconnectPromises);
      
      this.clients.clear();
      this.isInitialized = false;
      
      logger.info('Database manager shutdown completed', {
        component: 'database-manager'
      });
      
      this.emit('disconnected');
    } catch (error) {
      logger.error('Error during database manager shutdown:', {
        error: error.message,
        component: 'database-manager'
      });
      throw error;
    }
  }
}

/**
 * Create and initialize database manager
 * @param {string} environment - Target environment
 * @returns {Promise<DatabaseManager>} Initialized database manager
 */
export const createDatabaseManager = async (environment = null) => {
  const manager = new DatabaseManager(environment);
  await manager.initialize();
  return manager;
};

/**
 * Singleton database manager instance
 */
let databaseManagerInstance = null;

/**
 * Get singleton database manager instance
 * @param {string} environment - Target environment
 * @returns {Promise<DatabaseManager>} Database manager instance
 */
export const getDatabaseManager = async (environment = null) => {
  if (!databaseManagerInstance) {
    databaseManagerInstance = await createDatabaseManager(environment);
  }
  return databaseManagerInstance;
};

export default {
  DatabaseManager,
  createDatabaseManager,
  getDatabaseManager
};