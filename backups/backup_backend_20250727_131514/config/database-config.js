/**
 * Database Configuration Module
 * Centralizes all database-related configurations and optimizations
 */

import { logger } from '../utils/logger.js';

/**
 * Environment-specific database configurations
 */
export const databaseConfigs = {
  development: {
    // Prisma Client Configuration
    prisma: {
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' }
      ],
      errorFormat: 'pretty'
    },
    
    // Connection Pool Settings
    connectionPool: {
      maxConnections: 10,
      minConnections: 2,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    
    // Query Optimization
    queryOptimization: {
      slowQueryThreshold: 1000, // ms
      enableQueryLogging: true,
      enablePerformanceMonitoring: true,
      maxQueryComplexity: 100
    },
    
    // Middleware Settings
    middleware: {
      enableSoftDelete: true,
      enablePerformanceTracking: true,
      enableTypeConversion: true,
      enableAuditLogging: false
    },
    
    // Health Check Settings
    healthCheck: {
      enabled: true,
      interval: 30000, // 30 seconds
      timeout: 5000,
      retries: 3
    }
  },

  production: {
    // Prisma Client Configuration
    prisma: {
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
      ],
      errorFormat: 'minimal'
    },
    
    // Connection Pool Settings
    connectionPool: {
      maxConnections: 50,
      minConnections: 5,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 300000, // 5 minutes
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    
    // Query Optimization
    queryOptimization: {
      slowQueryThreshold: 2000, // ms
      enableQueryLogging: false,
      enablePerformanceMonitoring: true,
      maxQueryComplexity: 200
    },
    
    // Middleware Settings
    middleware: {
      enableSoftDelete: true,
      enablePerformanceTracking: true,
      enableTypeConversion: true,
      enableAuditLogging: true
    },
    
    // Health Check Settings
    healthCheck: {
      enabled: true,
      interval: 60000, // 1 minute
      timeout: 10000,
      retries: 5
    }
  },

  test: {
    // Prisma Client Configuration
    prisma: {
      log: [
        { emit: 'event', level: 'error' }
      ],
      errorFormat: 'minimal'
    },
    
    // Connection Pool Settings
    connectionPool: {
      maxConnections: 5,
      minConnections: 1,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 10000,
      destroyTimeoutMillis: 1000,
      idleTimeoutMillis: 10000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
    },
    
    // Query Optimization
    queryOptimization: {
      slowQueryThreshold: 500, // ms
      enableQueryLogging: false,
      enablePerformanceMonitoring: false,
      maxQueryComplexity: 50
    },
    
    // Middleware Settings
    middleware: {
      enableSoftDelete: true,
      enablePerformanceTracking: false,
      enableTypeConversion: true,
      enableAuditLogging: false
    },
    
    // Health Check Settings
    healthCheck: {
      enabled: false,
      interval: 0,
      timeout: 5000,
      retries: 1
    }
  }
};

/**
 * Database URL configurations for different environments
 */
export const databaseUrls = {
  development: {
    primary: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dev_db',
    readonly: process.env.DATABASE_READONLY_URL || null,
    analytics: process.env.ANALYTICS_DATABASE_URL || null
  },
  
  production: {
    primary: process.env.DATABASE_URL,
    readonly: process.env.DATABASE_READONLY_URL || null,
    analytics: process.env.ANALYTICS_DATABASE_URL || null
  },
  
  test: {
    primary: process.env.TEST_DATABASE_URL || 'postgresql://user:password@localhost:5432/test_db',
    readonly: null,
    analytics: null
  }
};

/**
 * Migration configurations
 */
export const migrationConfigs = {
  development: {
    autoMigrate: true,
    seedOnMigrate: true,
    backupBeforeMigrate: true,
    validateSchema: true
  },
  
  production: {
    autoMigrate: false,
    seedOnMigrate: false,
    backupBeforeMigrate: true,
    validateSchema: true
  },
  
  test: {
    autoMigrate: true,
    seedOnMigrate: false,
    backupBeforeMigrate: false,
    validateSchema: false
  }
};

/**
 * Backup and Recovery configurations
 */
export const backupConfigs = {
  development: {
    enabled: false,
    schedule: null,
    retention: 7, // days
    compression: false
  },
  
  production: {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    retention: 30, // days
    compression: true,
    remoteStorage: {
      enabled: true,
      provider: 's3',
      bucket: process.env.BACKUP_S3_BUCKET,
      region: process.env.BACKUP_S3_REGION
    }
  },
  
  test: {
    enabled: false,
    schedule: null,
    retention: 1,
    compression: false
  }
};

/**
 * Monitoring and Alerting configurations
 */
export const monitoringConfigs = {
  development: {
    enabled: true,
    metrics: {
      queryPerformance: true,
      connectionPool: true,
      errorRates: true,
      slowQueries: true
    },
    alerting: {
      enabled: false
    }
  },
  
  production: {
    enabled: true,
    metrics: {
      queryPerformance: true,
      connectionPool: true,
      errorRates: true,
      slowQueries: true,
      diskUsage: true,
      replicationLag: true
    },
    alerting: {
      enabled: true,
      channels: ['email', 'slack'],
      thresholds: {
        slowQueryMs: 5000,
        errorRate: 0.05, // 5%
        connectionPoolUtilization: 0.8, // 80%
        diskUsage: 0.85 // 85%
      }
    }
  },
  
  test: {
    enabled: false,
    metrics: {
      queryPerformance: false,
      connectionPool: false,
      errorRates: false,
      slowQueries: false
    },
    alerting: {
      enabled: false
    }
  }
};

/**
 * Security configurations
 */
export const securityConfigs = {
  development: {
    ssl: {
      enabled: false,
      rejectUnauthorized: false
    },
    encryption: {
      enabled: false
    },
    accessControl: {
      enabled: true,
      maxConnections: 100,
      allowedHosts: ['localhost', '127.0.0.1']
    }
  },
  
  production: {
    ssl: {
      enabled: true,
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA,
      cert: process.env.DATABASE_SSL_CERT,
      key: process.env.DATABASE_SSL_KEY
    },
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      keyRotation: true
    },
    accessControl: {
      enabled: true,
      maxConnections: 1000,
      allowedHosts: process.env.ALLOWED_DB_HOSTS?.split(',') || [],
      ipWhitelist: process.env.DB_IP_WHITELIST?.split(',') || []
    }
  },
  
  test: {
    ssl: {
      enabled: false,
      rejectUnauthorized: false
    },
    encryption: {
      enabled: false
    },
    accessControl: {
      enabled: false,
      maxConnections: 10,
      allowedHosts: ['localhost']
    }
  }
};

/**
 * Get configuration for specific environment
 * @param {string} environment - Target environment
 * @returns {object} Complete database configuration
 */
export const getDatabaseConfig = (environment = process.env.NODE_ENV || 'development') => {
  const config = {
    database: databaseConfigs[environment] || databaseConfigs.development,
    urls: databaseUrls[environment] || databaseUrls.development,
    migration: migrationConfigs[environment] || migrationConfigs.development,
    backup: backupConfigs[environment] || backupConfigs.development,
    monitoring: monitoringConfigs[environment] || monitoringConfigs.development,
    security: securityConfigs[environment] || securityConfigs.development
  };

  // Validate required configurations
  if (!config.urls.primary) {
    throw new Error(`Database URL not configured for environment: ${environment}`);
  }

  return config;
};

/**
 * Validate database configuration
 * @param {object} config - Database configuration
 * @returns {object} Validation result
 */
export const validateDatabaseConfig = (config) => {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!config.database) {
    errors.push('Database configuration is required');
  }

  if (!config.urls || !config.urls.primary) {
    errors.push('Primary database URL is required');
  }

  // Validate connection pool settings
  if (config.database?.connectionPool) {
    const pool = config.database.connectionPool;
    
    if (pool.maxConnections < pool.minConnections) {
      errors.push('maxConnections must be greater than minConnections');
    }
    
    if (pool.maxConnections > 1000) {
      warnings.push('Very high maxConnections value may impact performance');
    }
  }

  // Validate query optimization settings
  if (config.database?.queryOptimization) {
    const query = config.database.queryOptimization;
    
    if (query.slowQueryThreshold < 100) {
      warnings.push('Very low slowQueryThreshold may generate excessive logs');
    }
  }

  // Security validations for production
  if (process.env.NODE_ENV === 'production') {
    if (!config.security?.ssl?.enabled) {
      warnings.push('SSL should be enabled in production');
    }
    
    if (!config.backup?.enabled) {
      warnings.push('Backups should be enabled in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Create Prisma client configuration from database config
 * @param {object} databaseConfig - Database configuration
 * @returns {object} Prisma client configuration
 */
export const createPrismaConfig = (databaseConfig) => {
  const config = {
    datasources: {
      db: {
        url: databaseConfig.urls.primary
      }
    },
    ...databaseConfig.database.prisma
  };

  // Add SSL configuration if enabled
  if (databaseConfig.security?.ssl?.enabled) {
    config.datasources.db.ssl = {
      rejectUnauthorized: databaseConfig.security.ssl.rejectUnauthorized
    };
    
    if (databaseConfig.security.ssl.ca) {
      config.datasources.db.ssl.ca = databaseConfig.security.ssl.ca;
    }
  }

  return config;
};

export default {
  databaseConfigs,
  databaseUrls,
  migrationConfigs,
  backupConfigs,
  monitoringConfigs,
  securityConfigs,
  getDatabaseConfig,
  validateDatabaseConfig,
  createPrismaConfig
};