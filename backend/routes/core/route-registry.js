/**
 * Route Registry - Centralized Route Registration and Management
 * Maintains a registry of all registered routes with metadata
 */

import { logger } from '../../utils/logger.js';

export class RouteRegistry {
  constructor() {
    this.routes = new Map();
    this.versions = new Map();
    this.middlewareStacks = new Map();
    this.validationSchemas = new Map();
    this.routeMetrics = new Map();
    
    this.stats = {
      registered: 0,
      versions: 0,
      middleware: 0,
      errors: 0,
      slowRequestCount: 0
    };
  }

  /**
   * Register a route in the registry
   * @param {string} routePath - Route path
   * @param {object} routeInfo - Route information
   * @param {object} options - Registration options
   * @returns {boolean} Success status
   */
  registerRoute(routePath, routeInfo, options = {}) {
    try {
      const { version, middleware = [], validation = null } = options;
      
      const registryEntry = {
        ...routeInfo,
        routePath,
        middleware: middleware.length,
        validation: !!validation,
        registeredAt: new Date().toISOString(),
        lastAccessed: null,
        accessCount: 0,
        ...options
      };
      
      if (version) {
        // Register versioned route
        if (!this.versions.has(version)) {
          this.versions.set(version, new Map());
          this.stats.versions++;
        }
        this.versions.get(version).set(routePath, registryEntry);
      } else {
        // Register regular route
        this.routes.set(routePath, registryEntry);
      }
      
      // Initialize metrics for this route
      this.initializeRouteMetrics(routePath);
      
      this.stats.registered++;
      
      logger.debug(`Route registered: ${routePath}`, {
        version,
        middleware: middleware.length,
        hasValidation: !!validation,
        component: 'route-registry'
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to register route ${routePath}:`, {
        error: error.message,
        component: 'route-registry'
      });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get route information
   * @param {string} routePath - Route path
   * @param {string} version - Optional version
   * @returns {object|null} Route information
   */
  getRoute(routePath, version = null) {
    if (version && this.versions.has(version)) {
      return this.versions.get(version).get(routePath) || null;
    }
    
    return this.routes.get(routePath) || null;
  }

  /**
   * Get all routes for a specific version
   * @param {string} version - Version string
   * @returns {Map} Routes for the version
   */
  getVersionRoutes(version) {
    return this.versions.get(version) || new Map();
  }

  /**
   * Get all registered routes
   * @returns {Array} Array of all routes
   */
  getAllRoutes() {
    const allRoutes = [];
    
    // Add regular routes
    for (const [path, info] of this.routes) {
      allRoutes.push({ path, ...info, version: null });
    }
    
    // Add versioned routes
    for (const [version, versionRoutes] of this.versions) {
      for (const [path, info] of versionRoutes) {
        allRoutes.push({ path, ...info, version });
      }
    }
    
    return allRoutes;
  }

  /**
   * Check if a route exists
   * @param {string} routePath - Route path
   * @param {string} version - Optional version
   * @returns {boolean} True if route exists
   */
  hasRoute(routePath, version = null) {
    if (version && this.versions.has(version)) {
      return this.versions.get(version).has(routePath);
    }
    
    return this.routes.has(routePath);
  }

  /**
   * Remove a route from the registry
   * @param {string} routePath - Route path
   * @param {string} version - Optional version
   * @returns {boolean} Success status
   */
  unregisterRoute(routePath, version = null) {
    try {
      let removed = false;
      
      if (version && this.versions.has(version)) {
        removed = this.versions.get(version).delete(routePath);
        
        // Remove version map if empty
        if (this.versions.get(version).size === 0) {
          this.versions.delete(version);
          this.stats.versions--;
        }
      } else {
        removed = this.routes.delete(routePath);
      }
      
      if (removed) {
        // Remove metrics for this route
        this.routeMetrics.delete(routePath);
        this.stats.registered--;
        
        logger.debug(`Route unregistered: ${routePath}`, {
          version,
          component: 'route-registry'
        });
      }
      
      return removed;
    } catch (error) {
      logger.error(`Failed to unregister route ${routePath}:`, {
        error: error.message,
        component: 'route-registry'
      });
      return false;
    }
  }

  /**
   * Register middleware stack
   * @param {string} name - Stack name
   * @param {Array} middleware - Middleware array
   * @returns {boolean} Success status
   */
  registerMiddlewareStack(name, middleware) {
    try {
      if (!Array.isArray(middleware)) {
        throw new Error('Middleware must be an array');
      }
      
      this.middlewareStacks.set(name, {
        middleware,
        registeredAt: new Date().toISOString(),
        usageCount: 0
      });
      
      this.stats.middleware++;
      
      logger.debug(`Middleware stack registered: ${name}`, {
        middlewareCount: middleware.length,
        component: 'route-registry'
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to register middleware stack ${name}:`, {
        error: error.message,
        component: 'route-registry'
      });
      return false;
    }
  }

  /**
   * Get middleware stack
   * @param {string} name - Stack name
   * @returns {Array|null} Middleware array
   */
  getMiddlewareStack(name) {
    const stack = this.middlewareStacks.get(name);
    if (stack) {
      stack.usageCount++;
      return stack.middleware;
    }
    return null;
  }

  /**
   * Register validation schema
   * @param {string} routeKey - Route key
   * @param {string} method - HTTP method
   * @param {Function|Array} schema - Validation schema
   * @returns {boolean} Success status
   */
  registerValidationSchema(routeKey, method, schema) {
    try {
      const key = `${method.toUpperCase()}:${routeKey}`;
      
      this.validationSchemas.set(key, {
        schema,
        registeredAt: new Date().toISOString(),
        usageCount: 0
      });
      
      logger.debug(`Validation schema registered: ${key}`, {
        schemaType: Array.isArray(schema) ? 'array' : typeof schema,
        component: 'route-registry'
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to register validation schema ${routeKey}:`, {
        error: error.message,
        component: 'route-registry'
      });
      return false;
    }
  }

  /**
   * Get validation schema
   * @param {string} routeKey - Route key
   * @param {string} method - HTTP method
   * @returns {Function|Array|null} Validation schema
   */
  getValidationSchema(routeKey, method) {
    const key = `${method.toUpperCase()}:${routeKey}`;
    const schemaInfo = this.validationSchemas.get(key);
    
    if (schemaInfo) {
      schemaInfo.usageCount++;
      return schemaInfo.schema;
    }
    
    return null;
  }

  /**
   * Initialize metrics for a route
   * @param {string} routePath - Route path
   */
  initializeRouteMetrics(routePath) {
    if (!this.routeMetrics.has(routePath)) {
      this.routeMetrics.set(routePath, {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        errors: 0,
        slowRequestCount: 0,
        statusCodes: new Map(),
        lastAccessed: null,
        createdAt: new Date().toISOString()
      });
    }
  }

  /**
   * Record route access metrics
   * @param {string} routePath - Route path
   * @param {number} duration - Request duration in ms
   * @param {number} statusCode - HTTP status code
   * @param {boolean} isError - Whether request was an error
   */
  recordRouteMetrics(routePath, duration, statusCode, isError = false) {
    const metrics = this.routeMetrics.get(routePath);
    if (!metrics) {
      this.initializeRouteMetrics(routePath);
      return this.recordRouteMetrics(routePath, duration, statusCode, isError);
    }
    
    metrics.count++;
    metrics.totalDuration += duration;
    metrics.averageDuration = metrics.totalDuration / metrics.count;
    metrics.lastAccessed = new Date().toISOString();
    
    if (isError) {
      metrics.errors++;
    }
    
    if (duration > 1000) {
      metrics.slowRequestCount++;
      this.stats.slowRequestCount++;
    }
    
    // Record status code
    const currentCount = metrics.statusCodes.get(statusCode) || 0;
    metrics.statusCodes.set(statusCode, currentCount + 1);
    
    // Update route access count
    const routeInfo = this.getRoute(routePath);
    if (routeInfo) {
      routeInfo.accessCount++;
      routeInfo.lastAccessed = metrics.lastAccessed;
    }
  }

  /**
   * Get route metrics
   * @param {string} routePath - Route path
   * @returns {object|null} Route metrics
   */
  getRouteMetrics(routePath) {
    const metrics = this.routeMetrics.get(routePath);
    if (!metrics) {
      return null;
    }
    
    return {
      ...metrics,
      statusCodes: Object.fromEntries(metrics.statusCodes),
      errorRate: metrics.count > 0 ? (metrics.errors / metrics.count * 100).toFixed(2) : 0,
      slowRequestRate: metrics.count > 0 ? (metrics.slowRequestCount / metrics.count * 100).toFixed(2) : 0
    };
  }

  /**
   * Get all metrics
   * @returns {object} All metrics
   */
  getAllMetrics() {
    const routeMetrics = {};
    
    for (const [routePath, metrics] of this.routeMetrics) {
      routeMetrics[routePath] = this.getRouteMetrics(routePath);
    }
    
    return {
      overview: { ...this.stats },
      routes: routeMetrics,
      middlewareStacks: Array.from(this.middlewareStacks.keys()),
      validationSchemas: this.validationSchemas.size,
      totalRoutes: this.routes.size + Array.from(this.versions.values()).reduce((sum, versionRoutes) => sum + versionRoutes.size, 0)
    };
  }

  /**
   * Get registry statistics
   * @returns {object} Registry statistics
   */
  getStats() {
    return {
      ...this.stats,
      routes: this.routes.size,
      versions: this.versions.size,
      middlewareStacks: this.middlewareStacks.size,
      validationSchemas: this.validationSchemas.size,
      routeMetrics: this.routeMetrics.size
    };
  }

  /**
   * Clear all registry data
   */
  clear() {
    this.routes.clear();
    this.versions.clear();
    this.middlewareStacks.clear();
    this.validationSchemas.clear();
    this.routeMetrics.clear();
    
    this.stats = {
      registered: 0,
      versions: 0,
      middleware: 0,
      errors: 0,
      slowRequestCount: 0
    };
    
    logger.debug('Route registry cleared', {
      component: 'route-registry'
    });
  }

  /**
   * Export registry data for backup
   * @returns {object} Registry data
   */
  export() {
    return {
      routes: Object.fromEntries(this.routes),
      versions: Object.fromEntries(
        Array.from(this.versions.entries()).map(([version, routes]) => [
          version,
          Object.fromEntries(routes)
        ])
      ),
      middlewareStacks: Object.fromEntries(this.middlewareStacks),
      validationSchemas: Object.fromEntries(this.validationSchemas),
      routeMetrics: Object.fromEntries(this.routeMetrics),
      stats: this.stats,
      exportedAt: new Date().toISOString()
    };
  }
}

export default RouteRegistry;