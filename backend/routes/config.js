/**
 * Configuration for Advanced Route Management System
 * Centralizes all routing-related configurations
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Default configuration for RouteManager
 */
export const DEFAULT_CONFIG = {
  // Basic routing configuration
  routesDirectory: path.join(__dirname, '../routes'),
  autoLoadRoutes: true,
  routeFilePattern: '**/*.js',
  excludePatterns: ['**/test-*.js', '**/spec-*.js', '**/config.js', '**/index.js'],
  
  // Feature toggles
  enableMetrics: true,
  enableCaching: false,
  enableQueryOptimization: false,
  enableVersioning: false,
  enableDocumentation: false,
  enableRateLimiting: true,
  enableCompression: true,
  enableCors: true,
  
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || 'info',
  logRequests: true,
  logResponses: false,
  logErrors: true,
  logSlowRequests: true,
  slowRequestThreshold: 1000, // milliseconds
  
  // Performance configuration
  requestTimeout: 30000, // 30 seconds
  maxRequestSize: '10mb',
  compressionThreshold: 1024, // bytes
  
  // Metrics configuration
  metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  metricsAggregationInterval: 60 * 1000, // 1 minute
  trackDetailedMetrics: true,
  
  // Cache configuration
  cache: {
    enabled: false,
    type: 'memory', // 'memory' | 'redis'
    ttl: 300, // 5 minutes
    maxSize: 100, // max number of cached items
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0
    }
  },
  
  // Rate limiting configuration
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // CORS configuration
  cors: {
    enabled: true,
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Version',
      'X-Correlation-ID',
      'X-Request-ID'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page',
      'X-Per-Page'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  }
};

/**
 * API Versioning configuration
 */
export const VERSIONING_CONFIG = {
  enabled: false,
  defaultVersion: 'v1',
  supportedVersions: ['v1'],
  
  // Version detection strategies
  detection: {
    header: {
      enabled: true,
      name: 'X-API-Version'
    },
    url: {
      enabled: true,
      pattern: '/api/:version/*'
    },
    query: {
      enabled: false,
      parameter: 'version'
    },
    accept: {
      enabled: false,
      mediaType: 'application/vnd.api+json'
    }
  },
  
  // Version lifecycle management
  lifecycle: {
    deprecationWarningPeriod: 90, // days
    sunsetGracePeriod: 180, // days
    notifyDeprecation: true,
    blockSunsetVersions: true
  },
  
  // Version-specific configurations
  versions: {
    v1: {
      description: 'API Version 1.0 - Initial release',
      isDefault: true,
      deprecated: false,
      sunset: false,
      changelog: [
        'Initial API release',
        'Basic CRUD operations',
        'Authentication and authorization'
      ]
    }
  }
};

/**
 * Query Optimization configuration
 */
export const QUERY_OPTIMIZATION_CONFIG = {
  enabled: false,
  
  // Performance analysis
  analysis: {
    enabled: true,
    slowQueryThreshold: 100, // milliseconds
    trackQueryPlans: true,
    suggestOptimizations: true
  },
  
  // Smart query building
  queryBuilder: {
    defaultPageSize: 10,
    maxPageSize: 100,
    enableSearch: true,
    enableFiltering: true,
    enableSorting: true,
    enableFieldSelection: true
  },
  
  // Query caching
  queryCache: {
    enabled: false,
    ttl: 300, // 5 minutes
    maxSize: 1000,
    keyGenerator: 'hash', // 'hash' | 'custom'
    invalidationStrategy: 'ttl' // 'ttl' | 'manual' | 'smart'
  },
  
  // Database-specific optimizations
  database: {
    type: 'postgresql', // 'postgresql' | 'mysql' | 'sqlite'
    connectionPool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    }
  }
};

/**
 * API Documentation configuration
 */
export const DOCUMENTATION_CONFIG = {
  enabled: false,
  
  // OpenAPI/Swagger configuration
  openapi: {
    version: '3.0.0',
    info: {
      title: 'Advanced API',
      version: '1.0.0',
      description: 'Advanced API with routing management system',
      contact: {
        name: 'API Support',
        email: 'api-support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'Authentication', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Companies', description: 'Company management' },
      { name: 'System', description: 'System and health endpoints' },
      { name: 'Testing', description: 'Testing and debugging endpoints' }
    ]
  },
  
  // Swagger UI configuration
  swaggerUI: {
    enabled: true,
    path: '/docs',
    customCss: '',
    customSiteTitle: 'API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  },
  
  // Auto-generation settings
  autoGeneration: {
    enabled: true,
    includeExamples: true,
    includeSchemas: true,
    extractFromJSDoc: true,
    generateCrudEndpoints: true,
    includeErrorResponses: true
  },
  
  // Security schemes
  security: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    },
    apiKey: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key'
    }
  }
};

/**
 * Middleware stack configurations
 */
export const MIDDLEWARE_STACKS = {
  // Basic middleware stack for all routes
  basic: [
    'correlation',
    'requestLogging',
    'compression',
    'cors',
    'bodyParser',
    'cookieParser'
  ],
  
  // Authentication required
  auth: [
    'correlation',
    'requestLogging',
    'compression',
    'cors',
    'bodyParser',
    'cookieParser',
    'authentication',
    'userContext'
  ],
  
  // Admin-only endpoints
  admin: [
    'correlation',
    'requestLogging',
    'compression',
    'cors',
    'bodyParser',
    'cookieParser',
    'authentication',
    'userContext',
    'adminAuthorization',
    'adminRateLimit',
    'adminAuditLog'
  ],
  
  // Public API endpoints
  public: [
    'correlation',
    'requestLogging',
    'compression',
    'cors',
    'publicRateLimit',
    'bodyParser'
  ],
  
  // High-performance endpoints (minimal middleware)
  minimal: [
    'correlation',
    'compression',
    'cors'
  ]
};

/**
 * Validation schemas for common entities
 */
export const VALIDATION_SCHEMAS = {
  person: {
    create: {
      body: {
        firstName: { required: true, type: 'string', minLength: 2, maxLength: 50 },
        lastName: { required: true, type: 'string', minLength: 2, maxLength: 50 },
        email: { required: true, type: 'email' },
        phone: { type: 'string', pattern: /^\+?[1-9]\d{1,14}$/ },
        dateOfBirth: { type: 'date', before: new Date() },
        address: { type: 'string', maxLength: 200 }
      }
    },
    update: {
      body: {
        firstName: { type: 'string', minLength: 2, maxLength: 50 },
        lastName: { type: 'string', minLength: 2, maxLength: 50 },
        email: { type: 'email' },
        phone: { type: 'string', pattern: /^\+?[1-9]\d{1,14}$/ },
        dateOfBirth: { type: 'date', before: new Date() },
        address: { type: 'string', maxLength: 200 }
      }
    }
  },
  
  company: {
    create: {
      body: {
        name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
        vatNumber: { required: true, type: 'string', pattern: /^[A-Z]{2}\d{11}$/ },
        address: { type: 'string', maxLength: 200 },
        website: { type: 'url' },
        industry: { type: 'string', maxLength: 50 },
        employeeCount: { type: 'integer', minimum: 1 }
      }
    },
    update: {
      body: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        vatNumber: { type: 'string', pattern: /^[A-Z]{2}\d{11}$/ },
        address: { type: 'string', maxLength: 200 },
        website: { type: 'url' },
        industry: { type: 'string', maxLength: 50 },
        employeeCount: { type: 'integer', minimum: 1 }
      }
    }
  },
  
  // Common query parameters validation
  pagination: {
    query: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      sort: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
      orderBy: { type: 'string' }
    }
  },
  
  search: {
    query: {
      q: { type: 'string', minLength: 1, maxLength: 100 },
      fields: { type: 'string' }, // comma-separated list
      filters: { type: 'string' } // JSON string
    }
  }
};

/**
 * Error response templates
 */
export const ERROR_TEMPLATES = {
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Input validation failed',
    statusCode: 400
  },
  AUTHENTICATION_ERROR: {
    code: 'AUTHENTICATION_ERROR',
    message: 'Authentication required',
    statusCode: 401
  },
  AUTHORIZATION_ERROR: {
    code: 'AUTHORIZATION_ERROR',
    message: 'Insufficient permissions',
    statusCode: 403
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    statusCode: 404
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests',
    statusCode: 429
  },
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    statusCode: 500
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
    statusCode: 503
  }
};

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    logLevel: 'debug',
    enableDocumentation: true,
    enableMetrics: true,
    cors: {
      origin: '*'
    },
    rateLimit: {
      max: 1000 // Higher limit for development
    }
  },
  
  test: {
    logLevel: 'error',
    enableDocumentation: false,
    enableMetrics: false,
    enableCaching: false,
    cors: {
      origin: 'http://localhost:3000'
    }
  },
  
  staging: {
    logLevel: 'info',
    enableDocumentation: true,
    enableMetrics: true,
    enableCaching: true,
    cors: {
      origin: process.env.STAGING_CORS_ORIGIN
    }
  },
  
  production: {
    logLevel: 'warn',
    enableDocumentation: false,
    enableMetrics: true,
    enableCaching: true,
    enableQueryOptimization: true,
    cors: {
      origin: process.env.PRODUCTION_CORS_ORIGIN
    },
    rateLimit: {
      max: 100 // Stricter limit for production
    }
  }
};

/**
 * Merge configurations based on environment
 */
export function getConfig(environment = process.env.NODE_ENV || 'development') {
  const envConfig = ENVIRONMENT_CONFIGS[environment] || ENVIRONMENT_CONFIGS.development;
  
  return {
    ...DEFAULT_CONFIG,
    ...envConfig,
    versioning: {
      ...VERSIONING_CONFIG,
      ...envConfig.versioning
    },
    queryOptimization: {
      ...QUERY_OPTIMIZATION_CONFIG,
      ...envConfig.queryOptimization
    },
    documentation: {
      ...DOCUMENTATION_CONFIG,
      ...envConfig.documentation
    }
  };
}

export default {
  DEFAULT_CONFIG,
  VERSIONING_CONFIG,
  QUERY_OPTIMIZATION_CONFIG,
  DOCUMENTATION_CONFIG,
  MIDDLEWARE_STACKS,
  VALIDATION_SCHEMAS,
  ERROR_TEMPLATES,
  ENVIRONMENT_CONFIGS,
  getConfig
};