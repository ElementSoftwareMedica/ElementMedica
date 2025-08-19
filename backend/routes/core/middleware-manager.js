/**
 * Middleware Manager - Centralized Middleware Management
 * Handles middleware registration, application, and configuration
 */

import { logger } from '../../utils/logger.js';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export class MiddlewareManager {
  constructor(options = {}) {
    this.options = {
      environment: process.env.NODE_ENV || 'development',
      enableCors: true,
      enableCompression: true,
      enableRateLimit: true,
      enableSecurity: true,
      ...options
    };
    
    this.middlewareStack = new Map();
    this.globalMiddleware = [];
    this.routeMiddleware = new Map();
    this.versionMiddleware = new Map();
    
    this.initializeDefaultMiddleware();
  }

  /**
   * Initialize default middleware
   */
  initializeDefaultMiddleware() {
    try {
      // CORS middleware
      if (this.options.enableCors) {
        this.registerMiddleware('cors', cors({
          origin: this.options.corsOrigin || true,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));
      }

      // Compression middleware
      if (this.options.enableCompression) {
        this.registerMiddleware('compression', compression({
          level: 6,
          threshold: 1024,
          filter: (req, res) => {
            if (req.headers['x-no-compression']) {
              return false;
            }
            return compression.filter(req, res);
          }
        }));
      }

      // Rate limiting middleware
      if (this.options.enableRateLimit) {
        this.registerMiddleware('rateLimit', rateLimit({
          windowMs: this.options.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
          max: this.options.rateLimitMax || 100, // limit each IP to 100 requests per windowMs
          message: 'Too many requests from this IP, please try again later.',
          standardHeaders: true,
          legacyHeaders: false
        }));
      }

      // Security middleware
      if (this.options.enableSecurity) {
        this.registerMiddleware('helmet', helmet({
          contentSecurityPolicy: this.options.environment === 'production',
          crossOriginEmbedderPolicy: false
        }));
      }

      // Request logging middleware
      this.registerMiddleware('requestLogger', this.createRequestLogger());

      // Response time middleware
      this.registerMiddleware('responseTime', this.createResponseTimeMiddleware());

      logger.info('Default middleware initialized', {
        count: this.middlewareStack.size,
        component: 'middleware-manager'
      });
    } catch (error) {
      logger.error('Failed to initialize default middleware:', {
        error: error.message,
        component: 'middleware-manager'
      });
      throw error;
    }
  }

  /**
   * Register a middleware
   * @param {string} name - Middleware name
   * @param {Function} middleware - Middleware function
   * @param {object} options - Middleware options
   * @returns {boolean} Success status
   */
  registerMiddleware(name, middleware, options = {}) {
    try {
      if (typeof middleware !== 'function') {
        throw new Error(`Middleware ${name} must be a function`);
      }

      this.middlewareStack.set(name, {
        middleware,
        options,
        registeredAt: new Date().toISOString(),
        usageCount: 0
      });

      logger.debug(`Middleware registered: ${name}`, {
        component: 'middleware-manager'
      });

      return true;
    } catch (error) {
      logger.error(`Failed to register middleware ${name}:`, {
        error: error.message,
        component: 'middleware-manager'
      });
      return false;
    }
  }

  /**
   * Get middleware by name
   * @param {string} name - Middleware name
   * @returns {Function|null} Middleware function
   */
  getMiddleware(name) {
    const middlewareInfo = this.middlewareStack.get(name);
    if (middlewareInfo) {
      middlewareInfo.usageCount++;
      return middlewareInfo.middleware;
    }
    return null;
  }

  /**
   * Apply global middleware to app
   * @param {object} app - Express app
   * @param {Array} middlewareNames - Array of middleware names to apply
   */
  applyGlobalMiddleware(app, middlewareNames = []) {
    try {
      const defaultGlobalMiddleware = [
        'helmet',
        'cors',
        'compression',
        'requestLogger',
        'responseTime'
      ];

      const middlewaresToApply = middlewareNames.length > 0 
        ? middlewareNames 
        : defaultGlobalMiddleware;

      middlewaresToApply.forEach(name => {
        const middleware = this.getMiddleware(name);
        if (middleware) {
          app.use(middleware);
          this.globalMiddleware.push(name);
          logger.debug(`Global middleware applied: ${name}`, {
            component: 'middleware-manager'
          });
        } else {
          logger.warn(`Global middleware not found: ${name}`, {
            component: 'middleware-manager'
          });
        }
      });

      logger.info('Global middleware applied', {
        count: this.globalMiddleware.length,
        middleware: this.globalMiddleware,
        component: 'middleware-manager'
      });
    } catch (error) {
      logger.error('Failed to apply global middleware:', {
        error: error.message,
        component: 'middleware-manager'
      });
      throw error;
    }
  }

  /**
   * Apply middleware to specific route
   * @param {string} routePath - Route path
   * @param {Array} middlewareNames - Array of middleware names
   * @returns {Array} Array of middleware functions
   */
  applyRouteMiddleware(routePath, middlewareNames = []) {
    try {
      const middlewareFunctions = [];

      middlewareNames.forEach(name => {
        const middleware = this.getMiddleware(name);
        if (middleware) {
          middlewareFunctions.push(middleware);
        } else {
          logger.warn(`Route middleware not found: ${name} for route ${routePath}`, {
            component: 'middleware-manager'
          });
        }
      });

      if (middlewareFunctions.length > 0) {
        this.routeMiddleware.set(routePath, middlewareNames);
        logger.debug(`Route middleware applied: ${routePath}`, {
          middleware: middlewareNames,
          component: 'middleware-manager'
        });
      }

      return middlewareFunctions;
    } catch (error) {
      logger.error(`Failed to apply route middleware for ${routePath}:`, {
        error: error.message,
        component: 'middleware-manager'
      });
      return [];
    }
  }

  /**
   * Apply middleware to specific API version
   * @param {string} version - API version
   * @param {Array} middlewareNames - Array of middleware names
   * @returns {Array} Array of middleware functions
   */
  applyVersionMiddleware(version, middlewareNames = []) {
    try {
      const middlewareFunctions = [];

      middlewareNames.forEach(name => {
        const middleware = this.getMiddleware(name);
        if (middleware) {
          middlewareFunctions.push(middleware);
        } else {
          logger.warn(`Version middleware not found: ${name} for version ${version}`, {
            component: 'middleware-manager'
          });
        }
      });

      if (middlewareFunctions.length > 0) {
        this.versionMiddleware.set(version, middlewareNames);
        logger.debug(`Version middleware applied: ${version}`, {
          middleware: middlewareNames,
          component: 'middleware-manager'
        });
      }

      return middlewareFunctions;
    } catch (error) {
      logger.error(`Failed to apply version middleware for ${version}:`, {
        error: error.message,
        component: 'middleware-manager'
      });
      return [];
    }
  }

  /**
   * Create request logger middleware
   * @returns {Function} Request logger middleware
   */
  createRequestLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        
        logger[logLevel]('HTTP Request', {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          component: 'request-logger'
        });
      });
      
      next();
    };
  }

  /**
   * Create response time middleware
   * @returns {Function} Response time middleware
   */
  createResponseTimeMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        res.set('X-Response-Time', `${duration}ms`);
      });
      
      next();
    };
  }

  /**
   * Create authentication middleware
   * @param {object} options - Auth options
   * @returns {Function} Authentication middleware
   */
  createAuthMiddleware(options = {}) {
    return (req, res, next) => {
      // Basic auth middleware implementation
      // This would be enhanced with actual auth logic
      const token = req.headers.authorization;
      
      if (!token && options.required !== false) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'No authorization token provided'
        });
      }
      
      // Add user info to request (mock implementation)
      req.user = { id: 'user123', role: 'user' };
      next();
    };
  }

  /**
   * Create validation middleware
   * @param {object} schema - Validation schema
   * @returns {Function} Validation middleware
   */
  createValidationMiddleware(schema) {
    return (req, res, next) => {
      // Basic validation middleware implementation
      // This would be enhanced with actual validation logic
      try {
        if (schema && typeof schema.validate === 'function') {
          const { error } = schema.validate(req.body);
          if (error) {
            return res.status(400).json({
              error: 'Validation failed',
              details: error.details
            });
          }
        }
        next();
      } catch (error) {
        logger.error('Validation middleware error:', {
          error: error.message,
          component: 'middleware-manager'
        });
        res.status(500).json({
          error: 'Internal validation error'
        });
      }
    };
  }

  /**
   * Get middleware statistics
   * @returns {object} Middleware statistics
   */
  getStats() {
    const stats = {
      total: this.middlewareStack.size,
      global: this.globalMiddleware.length,
      routes: this.routeMiddleware.size,
      versions: this.versionMiddleware.size,
      usage: {}
    };

    // Calculate usage statistics
    for (const [name, info] of this.middlewareStack) {
      stats.usage[name] = info.usageCount;
    }

    return stats;
  }

  /**
   * Get all registered middleware
   * @returns {Array} Array of middleware names
   */
  getAllMiddleware() {
    return Array.from(this.middlewareStack.keys());
  }

  /**
   * Remove middleware
   * @param {string} name - Middleware name
   * @returns {boolean} Success status
   */
  removeMiddleware(name) {
    const removed = this.middlewareStack.delete(name);
    if (removed) {
      logger.info(`Middleware removed: ${name}`, {
        component: 'middleware-manager'
      });
    }
    return removed;
  }

  /**
   * Clear all middleware
   */
  clear() {
    this.middlewareStack.clear();
    this.globalMiddleware.length = 0;
    this.routeMiddleware.clear();
    this.versionMiddleware.clear();
    
    logger.info('All middleware cleared', {
      component: 'middleware-manager'
    });
  }
}

export default MiddlewareManager;