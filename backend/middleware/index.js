/**
 * Middleware Manager Module
 * Centralizes middleware registration, configuration and application
 */

import { logger } from '../utils/logger.js';

/**
 * Middleware Manager Class
 * Provides centralized middleware management with conditional application
 */
export class MiddlewareManager {
  constructor(app) {
    console.log('🚀 [MIDDLEWARE MANAGER] Constructor called');
    console.log('🚀 [MIDDLEWARE MANAGER] App instance:', !!app);
    console.log('🚀 [MIDDLEWARE MANAGER] Environment:', process.env.NODE_ENV || 'development');
    
    this.app = app;
    this.middlewares = new Map();
    this.appliedMiddlewares = new Set();
    this.environment = process.env.NODE_ENV || 'development';
    
    console.log('🚀 [MIDDLEWARE MANAGER] Constructor completed');
  }

  /**
   * Register a middleware with configuration options
   * @param {string} name - Middleware name
   * @param {function} middleware - Middleware function
   * @param {object} options - Configuration options
   * @returns {MiddlewareManager} Chainable instance
   */
  register(name, middleware, options = {}) {
    console.log(`📝 [MIDDLEWARE MANAGER] Registering middleware '${name}'`);
    console.log(`📝 [MIDDLEWARE MANAGER] Options:`, options);
    
    const defaultOptions = {
      enabled: true,
      environment: ['development', 'production', 'test'],
      priority: 100,
      condition: null,
      errorHandler: null,
      description: ''
    };

    const config = { ...defaultOptions, ...options };
    
    // Validate middleware function
    if (typeof middleware !== 'function') {
      throw new Error(`Middleware '${name}' must be a function`);
    }

    // Validate environment array
    if (!Array.isArray(config.environment)) {
      config.environment = [config.environment];
    }

    this.middlewares.set(name, {
      middleware,
      config,
      registered: new Date().toISOString()
    });

    console.log(`✅ [MIDDLEWARE MANAGER] Middleware '${name}' registered successfully`);
    console.log(`📝 [MIDDLEWARE MANAGER] Total registered middlewares:`, this.middlewares.size);

    logger.info(`Middleware '${name}' registered`, {
      priority: config.priority,
      environments: config.environment,
      enabled: config.enabled
    });

    return this;
  }

  /**
   * Apply middlewares in priority order
   * @param {array} middlewareNames - Array of middleware names to apply
   * @param {object} globalOptions - Global options to override individual configs
   * @returns {MiddlewareManager} Chainable instance
   */
  apply(middlewareNames = [], globalOptions = {}) {
    console.log('🔧 [MIDDLEWARE MANAGER] Starting apply() method');
    console.log('🔧 [MIDDLEWARE MANAGER] Environment:', this.environment);
    console.log('🔧 [MIDDLEWARE MANAGER] Registered middlewares:', Array.from(this.middlewares.keys()));
    
    // If no names provided, apply all registered middlewares
    if (middlewareNames.length === 0) {
      middlewareNames = Array.from(this.middlewares.keys());
    }
    
    console.log('🔧 [MIDDLEWARE MANAGER] Middlewares to apply:', middlewareNames);

    // Get middlewares and sort by priority
    const middlewaresToApply = middlewareNames
      .map(name => {
        const entry = this.middlewares.get(name);
        if (!entry) {
          logger.warn(`Middleware '${name}' not found`);
          return null;
        }
        return { name, ...entry };
      })
      .filter(Boolean)
      .sort((a, b) => a.config.priority - b.config.priority);

    console.log('🔧 [MIDDLEWARE MANAGER] Middlewares after sorting:', middlewaresToApply.map(m => ({ name: m.name, priority: m.config.priority, enabled: m.config.enabled })));

    // Apply middlewares
    middlewaresToApply.forEach(({ name, middleware, config }) => {
      const finalConfig = { ...config, ...globalOptions };
      
      console.log(`🔧 [MIDDLEWARE MANAGER] Checking middleware '${name}':`, {
        enabled: finalConfig.enabled,
        environment: finalConfig.environment,
        currentEnv: this.environment,
        alreadyApplied: this.appliedMiddlewares.has(name)
      });
      
      if (this.shouldApplyMiddleware(name, finalConfig)) {
        try {
          this.app.use(middleware);
          this.appliedMiddlewares.add(name);
          
          console.log(`✅ [MIDDLEWARE MANAGER] Middleware '${name}' applied successfully`);
          logger.info(`Middleware '${name}' applied`, {
            priority: finalConfig.priority,
            environment: this.environment
          });
        } catch (error) {
          console.error(`❌ [MIDDLEWARE MANAGER] Failed to apply middleware '${name}':`, error);
          logger.error(`Failed to apply middleware '${name}':`, error);
          
          if (finalConfig.errorHandler) {
            finalConfig.errorHandler(error, name);
          } else {
            throw error;
          }
        }
      } else {
        console.log(`⏭️ [MIDDLEWARE MANAGER] Middleware '${name}' skipped`);
      }
    });

    console.log('🔧 [MIDDLEWARE MANAGER] Apply() method completed');
    console.log('🔧 [MIDDLEWARE MANAGER] Applied middlewares:', Array.from(this.appliedMiddlewares));
    return this;
  }

  /**
   * Apply middleware to specific routes
   * @param {string} path - Route path
   * @param {array} middlewareNames - Array of middleware names
   * @param {object} options - Application options
   * @returns {MiddlewareManager} Chainable instance
   */
  applyToRoute(path, middlewareNames, options = {}) {
    middlewareNames.forEach(name => {
      const entry = this.middlewares.get(name);
      if (!entry) {
        logger.warn(`Middleware '${name}' not found for route '${path}'`);
        return;
      }

      const { middleware, config } = entry;
      const finalConfig = { ...config, ...options };

      if (this.shouldApplyMiddleware(name, finalConfig)) {
        try {
          this.app.use(path, middleware);
          
          logger.info(`Middleware '${name}' applied to route '${path}'`, {
            priority: finalConfig.priority
          });
        } catch (error) {
          logger.error(`Failed to apply middleware '${name}' to route '${path}':`, error);
          throw error;
        }
      }
    });

    return this;
  }

  /**
   * Check if middleware should be applied based on conditions
   * @param {string} name - Middleware name
   * @param {object} config - Middleware configuration
   * @returns {boolean} True if middleware should be applied
   */
  shouldApplyMiddleware(name, config) {
    // Check if already applied
    if (this.appliedMiddlewares.has(name)) {
      logger.debug(`Middleware '${name}' already applied`);
      return false;
    }

    // Check if enabled
    if (!config.enabled) {
      logger.debug(`Middleware '${name}' disabled`);
      return false;
    }

    // Check environment
    if (!config.environment.includes(this.environment)) {
      logger.debug(`Middleware '${name}' not enabled for environment '${this.environment}'`);
      return false;
    }

    // Check custom condition
    if (config.condition && typeof config.condition === 'function') {
      try {
        const conditionResult = config.condition();
        if (!conditionResult) {
          logger.debug(`Middleware '${name}' condition not met`);
          return false;
        }
      } catch (error) {
        logger.error(`Middleware '${name}' condition check failed:`, error);
        return false;
      }
    }

    return true;
  }

  /**
   * Get middleware information
   * @param {string} name - Middleware name
   * @returns {object|null} Middleware information
   */
  getMiddleware(name) {
    return this.middlewares.get(name) || null;
  }

  /**
   * List all registered middlewares
   * @returns {array} Array of middleware information
   */
  listMiddlewares() {
    return Array.from(this.middlewares.entries()).map(([name, entry]) => ({
      name,
      ...entry,
      applied: this.appliedMiddlewares.has(name)
    }));
  }

  /**
   * Remove middleware registration
   * @param {string} name - Middleware name
   * @returns {boolean} True if middleware was removed
   */
  unregister(name) {
    const removed = this.middlewares.delete(name);
    this.appliedMiddlewares.delete(name);
    
    if (removed) {
      logger.info(`Middleware '${name}' unregistered`);
    }
    
    return removed;
  }

  /**
   * Enable or disable middleware
   * @param {string} name - Middleware name
   * @param {boolean} enabled - Enable/disable state
   * @returns {boolean} True if middleware state was changed
   */
  setEnabled(name, enabled) {
    const entry = this.middlewares.get(name);
    if (!entry) {
      return false;
    }

    entry.config.enabled = enabled;
    logger.info(`Middleware '${name}' ${enabled ? 'enabled' : 'disabled'}`);
    
    return true;
  }

  /**
   * Get applied middlewares count
   * @returns {number} Number of applied middlewares
   */
  getAppliedCount() {
    return this.appliedMiddlewares.size;
  }

  /**
   * Get registered middlewares count
   * @returns {number} Number of registered middlewares
   */
  getRegisteredCount() {
    return this.middlewares.size;
  }

  /**
   * Clear all middlewares
   */
  clear() {
    this.middlewares.clear();
    this.appliedMiddlewares.clear();
    logger.info('All middlewares cleared');
  }

  /**
   * Get middleware manager status
   * @returns {object} Status information
   */
  getStatus() {
    return {
      environment: this.environment,
      registered: this.getRegisteredCount(),
      applied: this.getAppliedCount(),
      middlewares: this.listMiddlewares().map(m => ({
        name: m.name,
        enabled: m.config.enabled,
        applied: m.applied,
        priority: m.config.priority,
        environments: m.config.environment
      }))
    };
  }
}

/**
 * Create middleware manager instance
 * @param {object} app - Express app instance
 * @returns {MiddlewareManager} Middleware manager instance
 */
export const createMiddlewareManager = (app) => {
  return new MiddlewareManager(app);
};

/**
 * Middleware priorities constants
 */
export const MIDDLEWARE_PRIORITIES = {
  SECURITY: 10,
  CORS: 20,
  BODY_PARSER: 30,
  AUTHENTICATION: 40,
  AUTHORIZATION: 50,
  TENANT: 60,
  RATE_LIMITING: 70,
  CACHING: 80,
  LOGGING: 90,
  ERROR_HANDLING: 1000
};

/**
 * Common middleware configurations
 */
export const COMMON_CONFIGS = {
  development: {
    enabled: true,
    environment: ['development']
  },
  production: {
    enabled: true,
    environment: ['production']
  },
  allEnvironments: {
    enabled: true,
    environment: ['development', 'production', 'test']
  },
  conditionalDev: {
    enabled: true,
    environment: ['development'],
    condition: () => process.env.ENABLE_DEV_MIDDLEWARE === 'true'
  }
};

export default {
  MiddlewareManager,
  createMiddlewareManager,
  MIDDLEWARE_PRIORITIES,
  COMMON_CONFIGS
};