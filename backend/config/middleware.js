/**
 * Middleware Configuration Module
 * Defines standard middleware configurations and presets
 */

import { MIDDLEWARE_PRIORITIES, COMMON_CONFIGS } from '../middleware/index.js';

/**
 * Default middleware configurations
 */
export const middlewareConfigs = {
  // Security middlewares
  helmet: {
    enabled: true,
    environment: ['production', 'development'],
    priority: MIDDLEWARE_PRIORITIES.SECURITY,
    description: 'Security headers middleware'
  },

  cors: {
    enabled: true,
    environment: ['development', 'production', 'test'],
    priority: MIDDLEWARE_PRIORITIES.CORS,
    description: 'Cross-Origin Resource Sharing middleware'
  },

  // Body parsing middlewares
  bodyParser: {
    enabled: true,
    environment: ['development', 'production', 'test'],
    priority: MIDDLEWARE_PRIORITIES.BODY_PARSER,
    description: 'Request body parsing middleware'
  },

  // Authentication & Authorization
  auth: {
    enabled: true,
    environment: ['development', 'production'],
    priority: MIDDLEWARE_PRIORITIES.AUTHENTICATION,
    description: 'Authentication middleware',
    condition: () => process.env.ENABLE_AUTH !== 'false'
  },

  'auth-advanced': {
    enabled: true,
    environment: ['production'],
    priority: MIDDLEWARE_PRIORITIES.AUTHENTICATION + 1,
    description: 'Advanced authentication middleware'
  },

  rbac: {
    enabled: true,
    environment: ['development', 'production'],
    priority: MIDDLEWARE_PRIORITIES.AUTHORIZATION,
    description: 'Role-based access control middleware'
  },

  'advanced-permissions': {
    enabled: true,
    environment: ['production'],
    priority: MIDDLEWARE_PRIORITIES.AUTHORIZATION + 1,
    description: 'Advanced permissions middleware'
  },

  // Tenant management
  tenant: {
    enabled: true,
    environment: ['development', 'production'],
    priority: MIDDLEWARE_PRIORITIES.TENANT,
    description: 'Multi-tenant middleware'
  },

  'tenant-security': {
    enabled: true,
    environment: ['production'],
    priority: MIDDLEWARE_PRIORITIES.TENANT + 1,
    description: 'Tenant security middleware'
  },

  // Performance & Monitoring
  'rate-limiting': {
    enabled: true,
    environment: ['production'],
    priority: MIDDLEWARE_PRIORITIES.RATE_LIMITING,
    description: 'Rate limiting middleware',
    condition: () => process.env.ENABLE_RATE_LIMITING !== 'false'
  },

  cache: {
    enabled: true,
    environment: ['production'],
    priority: MIDDLEWARE_PRIORITIES.CACHING,
    description: 'Caching middleware'
  },

  performance: {
    enabled: true,
    environment: ['development', 'production'],
    priority: MIDDLEWARE_PRIORITIES.LOGGING - 10,
    description: 'Performance monitoring middleware'
  },

  'performance-monitor': {
    enabled: true,
    environment: ['production'],
    priority: MIDDLEWARE_PRIORITIES.LOGGING - 5,
    description: 'Advanced performance monitoring middleware'
  },

  'circuit-breaker': {
    enabled: true,
    environment: ['production'],
    priority: MIDDLEWARE_PRIORITIES.LOGGING - 15,
    description: 'Circuit breaker middleware'
  },

  // API Features
  'api-versioning': {
    enabled: true,
    environment: ['development', 'production'],
    priority: MIDDLEWARE_PRIORITIES.LOGGING - 20,
    description: 'API versioning middleware'
  },

  'soft-delete-advanced': {
    enabled: true,
    environment: ['development', 'production'],
    priority: MIDDLEWARE_PRIORITIES.LOGGING - 25,
    description: 'Advanced soft delete middleware'
  },

  // Error handling (should be last)
  errorHandler: {
    enabled: true,
    environment: ['development', 'production', 'test'],
    priority: MIDDLEWARE_PRIORITIES.ERROR_HANDLING,
    description: 'Global error handling middleware'
  }
};

/**
 * Environment-specific middleware presets
 */
export const middlewarePresets = {
  development: {
    middlewares: [
      'cors',
      'bodyParser',
      'auth',
      'rbac',
      'tenant',
      'performance',
      'api-versioning',
      'soft-delete-advanced',
      'errorHandler'
    ],
    globalOptions: {
      errorHandler: (error, name) => {
        console.warn(`Development: Middleware '${name}' failed:`, error.message);
      }
    }
  },

  production: {
    middlewares: [
      'helmet',
      'cors',
      'bodyParser',
      'auth',
      'auth-advanced',
      'rbac',
      'advanced-permissions',
      'tenant',
      'tenant-security',
      'rate-limiting',
      'cache',
      'performance',
      'performance-monitor',
      'circuit-breaker',
      'api-versioning',
      'soft-delete-advanced',
      'errorHandler'
    ],
    globalOptions: {
      errorHandler: (error, name) => {
        console.error(`Production: Critical middleware '${name}' failed:`, error);
        // In production, you might want to send alerts or notifications
      }
    }
  },

  test: {
    middlewares: [
      'cors',
      'bodyParser',
      'errorHandler'
    ],
    globalOptions: {
      enabled: true,
      errorHandler: (error, name) => {
        // In test environment, we might want to be more strict
        throw new Error(`Test: Middleware '${name}' failed: ${error.message}`);
      }
    }
  },

  minimal: {
    middlewares: [
      'cors',
      'bodyParser',
      'errorHandler'
    ],
    globalOptions: {
      enabled: true
    }
  },

  api_only: {
    middlewares: [
      'cors',
      'bodyParser',
      'auth',
      'rbac',
      'api-versioning',
      'rate-limiting',
      'errorHandler'
    ],
    globalOptions: {
      enabled: true
    }
  }
};

/**
 * Route-specific middleware configurations
 */
export const routeMiddlewares = {
  '/api/auth': {
    middlewares: ['rate-limiting'],
    options: {
      priority: MIDDLEWARE_PRIORITIES.RATE_LIMITING - 5
    }
  },

  '/api/admin': {
    middlewares: ['auth', 'rbac', 'advanced-permissions'],
    options: {
      condition: () => process.env.ENABLE_ADMIN_SECURITY !== 'false'
    }
  },

  '/api/public': {
    middlewares: ['rate-limiting', 'cache'],
    options: {
      enabled: true
    }
  },

  '/api/upload': {
    middlewares: ['auth', 'rbac'],
    options: {
      priority: MIDDLEWARE_PRIORITIES.AUTHENTICATION
    }
  }
};

/**
 * Conditional middleware configurations
 */
export const conditionalMiddlewares = {
  // Enable only if Redis is available
  cache: {
    condition: () => {
      return process.env.REDIS_URL || process.env.REDIS_HOST;
    }
  },

  // Enable only if rate limiting is configured
  'rate-limiting': {
    condition: () => {
      return process.env.ENABLE_RATE_LIMITING !== 'false' && 
             (process.env.REDIS_URL || process.env.REDIS_HOST);
    }
  },

  // Enable only in multi-tenant mode
  tenant: {
    condition: () => {
      return process.env.MULTI_TENANT_MODE === 'true';
    }
  },

  // Enable advanced features only with proper configuration
  'performance-monitor': {
    condition: () => {
      return process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
    }
  },

  'circuit-breaker': {
    condition: () => {
      return process.env.ENABLE_CIRCUIT_BREAKER === 'true';
    }
  }
};

/**
 * Get middleware configuration for environment
 * @param {string} environment - Target environment
 * @returns {object} Middleware configuration
 */
export const getMiddlewareConfig = (environment = process.env.NODE_ENV || 'development') => {
  const preset = middlewarePresets[environment] || middlewarePresets.development;
  const configs = { ...middlewareConfigs };

  // Apply conditional configurations
  Object.keys(conditionalMiddlewares).forEach(name => {
    if (configs[name] && conditionalMiddlewares[name].condition) {
      configs[name] = {
        ...configs[name],
        condition: conditionalMiddlewares[name].condition
      };
    }
  });

  return {
    configs,
    preset,
    routeMiddlewares
  };
};

/**
 * Validate middleware configuration
 * @param {object} config - Middleware configuration
 * @returns {object} Validation result
 */
export const validateMiddlewareConfig = (config) => {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors, warnings };
  }

  // Check required fields
  const requiredFields = ['enabled', 'environment', 'priority'];
  requiredFields.forEach(field => {
    if (config[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate environment array
  if (config.environment && !Array.isArray(config.environment)) {
    errors.push('Environment must be an array');
  }

  // Validate priority
  if (config.priority !== undefined && typeof config.priority !== 'number') {
    errors.push('Priority must be a number');
  }

  // Validate condition function
  if (config.condition && typeof config.condition !== 'function') {
    errors.push('Condition must be a function');
  }

  // Check for potential issues
  if (config.priority && config.priority > 1000) {
    warnings.push('High priority value might affect middleware order');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

export default {
  middlewareConfigs,
  middlewarePresets,
  routeMiddlewares,
  conditionalMiddlewares,
  getMiddlewareConfig,
  validateMiddlewareConfig
};