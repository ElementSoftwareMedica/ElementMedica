/**
 * Core Route Manager - Simplified Route Management
 * Coordinates route loading, registration, and basic management
 */

import { logger } from '../../utils/logger.js';
import RouteLoader from './route-loader.js';
import RouteRegistry from './route-registry.js';

export class CoreRouteManager {
  constructor(app, options = {}) {
    this.app = app;
    this.options = {
      environment: process.env.NODE_ENV || 'development',
      autoLoad: true,
      enableMetrics: true,
      ...options
    };
    
    this.routeLoader = new RouteLoader(options.loader);
    this.routeRegistry = new RouteRegistry();
    
    this.isInitialized = false;
    this.initializationTime = null;
  }

  /**
   * Initialize the route manager
   * @returns {Promise<CoreRouteManager>} Initialized route manager
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Core route manager already initialized', {
        component: 'core-route-manager'
      });
      return this;
    }
    
    const startTime = Date.now();
    
    try {
      logger.info('Initializing core route manager...', {
        environment: this.options.environment,
        component: 'core-route-manager'
      });
      
      if (this.options.autoLoad) {
        await this.loadAndRegisterRoutes();
      }
      
      this.isInitialized = true;
      this.initializationTime = Date.now() - startTime;
      
      logger.info('Core route manager initialized successfully', {
        initializationTime: `${this.initializationTime}ms`,
        totalRoutes: this.routeRegistry.getStats().routes,
        component: 'core-route-manager'
      });
      
      return this;
    } catch (error) {
      logger.error('Failed to initialize core route manager:', {
        error: error.message,
        component: 'core-route-manager'
      });
      throw error;
    }
  }

  /**
   * Load and register all routes
   * @returns {Promise<void>}
   */
  async loadAndRegisterRoutes() {
    try {
      // Load all routes
      const loadedRoutes = await this.routeLoader.loadAllRoutes();
      
      // Register each route
      for (const [routePath, routeInfo] of loadedRoutes) {
        await this.registerLoadedRoute(routePath, routeInfo);
      }
      
      logger.info('All routes loaded and registered', {
        totalRoutes: loadedRoutes.size,
        component: 'core-route-manager'
      });
    } catch (error) {
      logger.error('Failed to load and register routes:', {
        error: error.message,
        component: 'core-route-manager'
      });
      throw error;
    }
  }

  /**
   * Register a loaded route with the Express app
   * @param {string} routePath - Route path
   * @param {object} routeInfo - Route information
   * @returns {Promise<boolean>} Success status
   */
  async registerLoadedRoute(routePath, routeInfo) {
    try {
      const { router, version } = routeInfo;
      
      // Register with Express app
      this.app.use(routePath, router);
      
      // Register in registry
      const registered = this.routeRegistry.registerRoute(routePath, routeInfo, {
        version,
        middleware: [],
        validation: null
      });
      
      if (registered && this.options.enableMetrics) {
        this.setupRouteMetrics(routePath);
      }
      
      logger.debug(`Route registered with Express: ${routePath}`, {
        version,
        component: 'core-route-manager'
      });
      
      return registered;
    } catch (error) {
      logger.error(`Failed to register route ${routePath}:`, {
        error: error.message,
        component: 'core-route-manager'
      });
      return false;
    }
  }

  /**
   * Register a custom route
   * @param {string} path - Route path
   * @param {object} router - Express router
   * @param {object} options - Registration options
   * @returns {boolean} Success status
   */
  registerCustomRoute(path, router, options = {}) {
    try {
      const { middleware = [], version = null } = options;
      
      // Apply middleware if provided
      middleware.forEach(middlewareFunc => {
        if (typeof middlewareFunc === 'function') {
          router.use(middlewareFunc);
        }
      });
      
      // Determine full path
      const fullPath = version ? `/api/${version}${path}` : path;
      
      // Register with Express
      this.app.use(fullPath, router);
      
      // Create route info
      const routeInfo = {
        name: path.replace(/^\//g, ''),
        router,
        filePath: 'custom',
        routePath: fullPath,
        version,
        loadedAt: new Date().toISOString(),
        custom: true
      };
      
      // Register in registry
      const registered = this.routeRegistry.registerRoute(fullPath, routeInfo, {
        version,
        middleware,
        validation: options.validation || null
      });
      
      if (registered && this.options.enableMetrics) {
        this.setupRouteMetrics(fullPath);
      }
      
      logger.info(`Custom route registered: ${fullPath}`, {
        middleware: middleware.length,
        version,
        component: 'core-route-manager'
      });
      
      return registered;
    } catch (error) {
      logger.error(`Failed to register custom route ${path}:`, {
        error: error.message,
        component: 'core-route-manager'
      });
      return false;
    }
  }

  /**
   * Setup metrics collection for a route
   * @param {string} routePath - Route path
   */
  setupRouteMetrics(routePath) {
    // This will be enhanced by the monitoring module
    // For now, just initialize the metrics in the registry
    this.routeRegistry.initializeRouteMetrics(routePath);
  }

  /**
   * Load versioned routes
   * @param {string} version - Version string
   * @returns {Promise<Map>} Loaded versioned routes
   */
  async loadVersionedRoutes(version) {
    try {
      const versionedRoutes = await this.routeLoader.loadVersionedRoutes(version);
      
      // Register each versioned route
      for (const [routePath, routeInfo] of versionedRoutes) {
        await this.registerLoadedRoute(routePath, routeInfo);
      }
      
      logger.info(`Versioned routes loaded: ${version}`, {
        count: versionedRoutes.size,
        component: 'core-route-manager'
      });
      
      return versionedRoutes;
    } catch (error) {
      logger.error(`Failed to load versioned routes for ${version}:`, {
        error: error.message,
        component: 'core-route-manager'
      });
      return new Map();
    }
  }

  /**
   * Reload a specific route
   * @param {string} routePath - Route path to reload
   * @returns {Promise<boolean>} Success status
   */
  async reloadRoute(routePath) {
    try {
      // Unregister current route
      this.routeRegistry.unregisterRoute(routePath);
      
      // Reload from file
      const reloadedRoute = await this.routeLoader.reloadRoute(routePath);
      
      if (reloadedRoute) {
        // Re-register with Express and registry
        return await this.registerLoadedRoute(routePath, reloadedRoute);
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to reload route ${routePath}:`, {
        error: error.message,
        component: 'core-route-manager'
      });
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
    return this.routeRegistry.getRoute(routePath, version);
  }

  /**
   * Get all routes
   * @returns {Array} All registered routes
   */
  getAllRoutes() {
    return this.routeRegistry.getAllRoutes();
  }

  /**
   * Get route statistics
   * @returns {object} Route statistics
   */
  getStats() {
    const registryStats = this.routeRegistry.getStats();
    const loaderStats = this.routeLoader.getStats();
    
    return {
      ...registryStats,
      loader: loaderStats,
      initialized: this.isInitialized,
      initializationTime: this.initializationTime,
      environment: this.options.environment
    };
  }

  /**
   * Get route metrics
   * @param {string} routePath - Optional specific route path
   * @returns {object} Route metrics
   */
  getMetrics(routePath = null) {
    if (routePath) {
      return this.routeRegistry.getRouteMetrics(routePath);
    }
    
    return this.routeRegistry.getAllMetrics();
  }

  /**
   * Record route access for metrics
   * @param {string} routePath - Route path
   * @param {number} duration - Request duration
   * @param {number} statusCode - HTTP status code
   * @param {boolean} isError - Whether request was an error
   */
  recordRouteAccess(routePath, duration, statusCode, isError = false) {
    if (this.options.enableMetrics) {
      this.routeRegistry.recordRouteMetrics(routePath, duration, statusCode, isError);
    }
  }

  /**
   * Check if route manager is ready
   * @returns {boolean} Ready status
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Get manager status
   * @returns {object} Manager status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      environment: this.options.environment,
      stats: this.getStats(),
      ready: this.isReady(),
      uptime: this.initializationTime ? Date.now() - this.initializationTime : 0
    };
  }

  /**
   * Shutdown the route manager
   */
  shutdown() {
    logger.info('Shutting down core route manager...', {
      component: 'core-route-manager'
    });
    
    this.routeRegistry.clear();
    this.routeLoader.clear();
    this.isInitialized = false;
    
    logger.info('Core route manager shutdown complete', {
      component: 'core-route-manager'
    });
  }
}

export default CoreRouteManager;