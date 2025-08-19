/**
 * Modular Route Manager - Main Entry Point
 * Coordinates all route management modules in a clean, maintainable architecture
 */

import { logger } from '../utils/logger.js';
import CoreRouteManager from './core/route-manager.js';
import MiddlewareManager from './core/middleware-manager.js';
import ApiVersionManager from './versioning/api-version-manager.js';
import DocumentationManager from './documentation/documentation-manager.js';
import PerformanceMonitor from './monitoring/performance-monitor.js';

export class ModularRouteManager {
  constructor(app, options = {}) {
    this.app = app;
    this.options = {
      environment: process.env.NODE_ENV || 'development',
      enableVersioning: true,
      enableDocumentation: true,
      enableMonitoring: true,
      enableMiddleware: true,
      ...options
    };
    
    this.isInitialized = false;
    this.modules = {};
    
    this.initializeModules();
  }

  /**
   * Initialize all modules
   */
  initializeModules() {
    try {
      logger.info('Initializing modular route manager...', {
        environment: this.options.environment,
        component: 'modular-route-manager'
      });

      // Initialize core route manager
      this.modules.core = new CoreRouteManager(this.app, {
        environment: this.options.environment,
        enableMetrics: this.options.enableMonitoring
      });

      // Initialize middleware manager
      if (this.options.enableMiddleware) {
        this.modules.middleware = new MiddlewareManager({
          environment: this.options.environment
        });
      }

      // Initialize version manager
      if (this.options.enableVersioning) {
        this.modules.versioning = new ApiVersionManager({
          defaultVersion: this.options.defaultVersion || 'v1',
          supportedVersions: this.options.supportedVersions || ['v1', 'v2']
        });
      }

      // Initialize documentation manager
      if (this.options.enableDocumentation) {
        this.modules.documentation = new DocumentationManager({
          title: this.options.apiTitle || 'API Documentation',
          version: this.options.apiVersion || '1.0.0',
          description: this.options.apiDescription || 'Auto-generated API documentation'
        });
      }

      // Initialize performance monitor
      if (this.options.enableMonitoring) {
        this.modules.performance = new PerformanceMonitor({
          enableMetrics: true,
          slowRequestThreshold: this.options.slowRequestThreshold || 1000
        });
      }

      logger.info('All modules initialized successfully', {
        modules: Object.keys(this.modules),
        component: 'modular-route-manager'
      });
    } catch (error) {
      logger.error('Failed to initialize modules:', {
        error: error.message,
        component: 'modular-route-manager'
      });
      throw error;
    }
  }

  /**
   * Initialize the complete route management system
   * @returns {Promise<ModularRouteManager>} Initialized route manager
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Modular route manager already initialized', {
        component: 'modular-route-manager'
      });
      return this;
    }

    const startTime = Date.now();

    try {
      // Apply global middleware first
      if (this.modules.middleware) {
        this.modules.middleware.applyGlobalMiddleware(this.app);
      }

      // Apply version middleware
      if (this.modules.versioning) {
        this.app.use(this.modules.versioning.createVersionMiddleware());
      }

      // Apply performance monitoring middleware
      if (this.modules.performance) {
        this.app.use(this.modules.performance.createPerformanceMiddleware());
      }

      // Initialize core route manager (loads and registers routes)
      await this.modules.core.initialize();

      // Setup documentation routes
      if (this.modules.documentation) {
        this.modules.documentation.setupDocumentationRoutes(this.app);
      }

      // Setup monitoring endpoints
      this.setupMonitoringEndpoints();

      // Setup error handling
      this.setupErrorHandling();

      this.isInitialized = true;
      const initializationTime = Date.now() - startTime;

      logger.info('Modular route manager fully initialized', {
        initializationTime: `${initializationTime}ms`,
        totalRoutes: this.modules.core.getStats().routes,
        component: 'modular-route-manager'
      });

      return this;
    } catch (error) {
      logger.error('Failed to initialize modular route manager:', {
        error: error.message,
        component: 'modular-route-manager'
      });
      throw error;
    }
  }

  /**
   * Setup monitoring endpoints
   */
  setupMonitoringEndpoints() {
    if (!this.modules.performance) return;

    // Performance metrics endpoint
    this.app.get('/api/performance', (req, res) => {
      try {
        const metrics = this.modules.performance.getMetrics({
          timeRange: req.query.timeRange ? parseInt(req.query.timeRange) : undefined,
          routePath: req.query.route || null
        });

        res.json({
          success: true,
          data: metrics,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Failed to get performance metrics:', {
          error: error.message,
          component: 'modular-route-manager'
        });
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve performance metrics'
        });
      }
    });

    // Performance report endpoint
    this.app.get('/api/performance/report', (req, res) => {
      try {
        const report = this.modules.performance.getPerformanceReport();
        res.json({
          success: true,
          data: report,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Failed to get performance report:', {
          error: error.message,
          component: 'modular-route-manager'
        });
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve performance report'
        });
      }
    });

    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      try {
        const health = this.getHealthStatus();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Failed to get health status:', {
          error: error.message,
          component: 'modular-route-manager'
        });
        res.status(500).json({
          status: 'error',
          error: 'Failed to retrieve health status'
        });
      }
    });

    logger.info('Monitoring endpoints setup complete', {
      component: 'modular-route-manager'
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      const error = {
        status: 404,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      };

      logger.warn('Route not found', {
        path: req.originalUrl,
        method: req.method,
        component: 'modular-route-manager'
      });

      res.status(404).json(error);
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      const statusCode = error.status || error.statusCode || 500;
      const isProduction = this.options.environment === 'production';

      const errorResponse = {
        status: statusCode,
        message: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
      };

      // Add stack trace in development
      if (!isProduction) {
        errorResponse.stack = error.stack;
      }

      // Log error
      logger.error('Global error handler:', {
        error: error.message,
        stack: error.stack,
        path: req.originalUrl,
        method: req.method,
        statusCode,
        component: 'modular-route-manager'
      });

      // Record error metrics
      if (this.modules.performance) {
        const routePath = this.modules.performance.getRoutePath(req);
        this.modules.performance.recordRequest(req, { statusCode }, 0, {}, {});
      }

      res.status(statusCode).json(errorResponse);
    });

    logger.info('Error handling setup complete', {
      component: 'modular-route-manager'
    });
  }

  /**
   * Register a custom route
   * @param {string} path - Route path
   * @param {object} router - Express router
   * @param {object} options - Registration options
   * @returns {boolean} Success status
   */
  registerRoute(path, router, options = {}) {
    try {
      // Apply route-specific middleware
      if (options.middleware && this.modules.middleware) {
        const middlewareFunctions = this.modules.middleware.applyRouteMiddleware(path, options.middleware);
        middlewareFunctions.forEach(mw => router.use(mw));
      }

      // Register with core manager
      const registered = this.modules.core.registerCustomRoute(path, router, options);

      // Register with version manager
      if (options.version && this.modules.versioning) {
        this.modules.versioning.registerVersionRoute(options.version, path);
      }

      // Register documentation
      if (options.documentation && this.modules.documentation) {
        this.modules.documentation.registerRouteDocumentation(path, options.documentation);
      }

      return registered;
    } catch (error) {
      logger.error(`Failed to register route ${path}:`, {
        error: error.message,
        component: 'modular-route-manager'
      });
      return false;
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {object} Complete statistics
   */
  getStats() {
    const stats = {
      initialized: this.isInitialized,
      environment: this.options.environment,
      modules: {}
    };

    // Collect stats from each module
    Object.keys(this.modules).forEach(moduleName => {
      const module = this.modules[moduleName];
      if (module && typeof module.getStats === 'function') {
        stats.modules[moduleName] = module.getStats();
      }
    });

    return stats;
  }

  /**
   * Get health status
   * @returns {object} Health status
   */
  getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      modules: {}
    };

    // Check each module health
    Object.keys(this.modules).forEach(moduleName => {
      const module = this.modules[moduleName];
      if (module) {
        if (typeof module.getStatus === 'function') {
          health.modules[moduleName] = module.getStatus();
        } else {
          health.modules[moduleName] = { status: 'active' };
        }
      }
    });

    // Determine overall health
    const moduleStatuses = Object.values(health.modules);
    const hasUnhealthyModule = moduleStatuses.some(status => 
      status.status === 'error' || status.status === 'unhealthy'
    );

    if (hasUnhealthyModule) {
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * Get performance metrics
   * @param {object} options - Query options
   * @returns {object} Performance metrics
   */
  getMetrics(options = {}) {
    if (this.modules.performance) {
      return this.modules.performance.getMetrics(options);
    }
    return null;
  }

  /**
   * Shutdown the route manager
   */
  shutdown() {
    logger.info('Shutting down modular route manager...', {
      component: 'modular-route-manager'
    });

    // Shutdown each module
    Object.keys(this.modules).forEach(moduleName => {
      const module = this.modules[moduleName];
      if (module && typeof module.shutdown === 'function') {
        try {
          module.shutdown();
          logger.info(`Module ${moduleName} shutdown complete`, {
            component: 'modular-route-manager'
          });
        } catch (error) {
          logger.error(`Failed to shutdown module ${moduleName}:`, {
            error: error.message,
            component: 'modular-route-manager'
          });
        }
      }
    });

    this.isInitialized = false;
    
    logger.info('Modular route manager shutdown complete', {
      component: 'modular-route-manager'
    });
  }
}

/**
 * Initialize and return the route manager
 * @param {object} app - Express app
 * @param {object} options - Configuration options
 * @returns {Promise<ModularRouteManager>} Initialized route manager
 */
export async function initializeRoutes(app, options = {}) {
  const routeManager = new ModularRouteManager(app, options);
  return await routeManager.initialize();
}

export default ModularRouteManager;