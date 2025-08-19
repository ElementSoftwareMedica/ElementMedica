/**
 * Routes Index - Centralized Route Management
 * Provides unified route registration, versioning, and middleware application
 */

import express from 'express';
import { logger } from '../utils/logger.js';
import { MiddlewareManager } from '../middleware/index.js';
import { getMiddlewareConfig } from '../config/middleware.js';
import { performance } from 'perf_hooks';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { middlewareStacks } from './middleware.js';
import { ResponseFormatter, globalErrorHandler, notFoundHandler, correlationMiddleware } from './response-handler.js';
import { validationSchemas } from './validators.js';
import { queryOptimizationMiddleware, SmartQueryBuilder, QueryCacheManager } from './query-optimizer.js';
import { ApiVersionManager, VersionDetectionStrategy, ApiVersionRouter, VersionedRouteDiscovery } from './api-versioning.js';
import { OpenApiSchemaGenerator, DocumentationMiddleware, RouteDocumentationExtractor } from './api-documentation.js';
import { getConfig, MIDDLEWARE_STACKS, VALIDATION_SCHEMAS, ERROR_TEMPLATES } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Route Manager Class
 * Manages route registration, versioning, and middleware application
 */
export class RouteManager {
  constructor(app, options = {}) {
    this.app = app;
    
    // Merge default config with environment-specific config and user options
    const defaultConfig = getConfig();
    this.options = {
      ...defaultConfig,
      ...options,
      // Ensure nested objects are properly merged
      cache: { ...defaultConfig.cache, ...options.cache },
      rateLimit: { ...defaultConfig.rateLimit, ...options.rateLimit },
      cors: { ...defaultConfig.cors, ...options.cors },
      versioning: { ...defaultConfig.versioning, ...options.versioning },
      queryOptimization: { ...defaultConfig.queryOptimization, ...options.queryOptimization },
      documentation: { ...defaultConfig.documentation, ...options.documentation }
    };
    
    this.environment = this.options.environment || process.env.NODE_ENV || 'development';
     
     // Initialize middleware stacks from configuration
    this.middlewareStacks = { ...MIDDLEWARE_STACKS };
    this.validationSchemas = { ...VALIDATION_SCHEMAS };
    this.errorTemplates = { ...ERROR_TEMPLATES };
    
    // Initialize middleware manager
    this.middlewareManager = new MiddlewareManager(this.options);
    this.middlewareConfig = getMiddlewareConfig(this.environment);
    
    this.routes = new Map();
    this.versions = new Map();
    this.validationSchemas = new Map();
    this.middlewareStacks = new Map();
    this.routeStats = {
      registered: 0,
      versions: 0,
      middleware: 0,
      errors: 0,
      slowRequestCount: 0
    };
    
    this.routeMetrics = new Map();
    this.isInitialized = false;
    
    // Initialize advanced systems
    this.queryBuilder = new SmartQueryBuilder();
    this.versionManager = new ApiVersionManager();
    this.versionRouter = null;
    this.schemaGenerator = new OpenApiSchemaGenerator();
    this.documentationMiddleware = new DocumentationMiddleware(this.schemaGenerator);
    this.routeDiscovery = new VersionedRouteDiscovery('./routes');
    this.docExtractor = new RouteDocumentationExtractor();
    
    // Initialize default middleware stacks
    this.initializeMiddlewareStacks();
    this.initializeVersioning();
    this.initializeDocumentation();
  }

  /**
   * Initialize default middleware stacks
   */
  initializeMiddlewareStacks() {
    this.middlewareStacks.set('basic', middlewareStacks.basic());
    this.middlewareStacks.set('public', middlewareStacks.public());
    this.middlewareStacks.set('authenticated', middlewareStacks.authenticated());
    this.middlewareStacks.set('admin', middlewareStacks.admin());
    
    logger.debug('Middleware stacks initialized', {
      stacks: Array.from(this.middlewareStacks.keys()),
      component: 'route-manager'
    });
  }
  
  /**
   * Initialize API versioning system
   */
  initializeVersioning() {
    // Setup version detection strategy
    const detectionStrategy = new VersionDetectionStrategy(
      VersionDetectionStrategy.HEADER,
      { headerName: 'X-API-Version' }
    );
    
    this.versionRouter = new ApiVersionRouter(this.versionManager, detectionStrategy);
    
    // Register default versions
    this.versionManager.registerVersion('v1', {
      description: 'API Version 1.0 - Initial release',
      isDefault: true
    });
    
    logger.debug('API versioning initialized', {
      defaultVersion: 'v1',
      detectionStrategy: 'header',
      component: 'route-manager'
    });
  }
  
  /**
   * Initialize documentation system
   */
  initializeDocumentation() {
    // Generate schemas for common models
    this.schemaGenerator.generateSchemaFromPrismaModel('Person', {});
    this.schemaGenerator.generateSchemaFromPrismaModel('Company', {});
    
    // Generate CRUD paths for main entities
    this.schemaGenerator.generateCrudPaths('Person', '/api/v1');
    this.schemaGenerator.generateCrudPaths('Company', '/api/v1');
    
    logger.debug('API documentation initialized', {
      schemas: ['Person', 'Company'],
      component: 'route-manager'
    });
  }
  
  /**
   * Register validation schema for a route
   * @param {string} routeKey - Route identifier
   * @param {string} method - HTTP method
   * @param {Function|Array} schema - Validation schema
   */
  registerValidation(routeKey, method, schema) {
    if (!routeKey || typeof routeKey !== 'string') {
      throw new Error('Route key must be a non-empty string');
    }
    
    if (!method || typeof method !== 'string') {
      throw new Error('Method must be a non-empty string');
    }
    
    if (!schema) {
      throw new Error('Schema must be provided');
    }
    
    const key = `${method.toUpperCase()}:${routeKey}`;
    this.validationSchemas.set(key, schema);
    
    logger.debug('Validation schema registered', {
      route: key,
      schemaType: Array.isArray(schema) ? 'array' : typeof schema,
      component: 'route-manager'
    });
  }
  
  /**
   * Register custom middleware stack
   * @param {string} name - Stack name
   * @param {Array} middleware - Array of middleware functions
   */
  registerMiddlewareStack(name, middleware) {
    if (!Array.isArray(middleware)) {
      throw new Error('Middleware must be an array');
    }
    
    this.middlewareStacks.set(name, middleware);
    
    logger.debug('Custom middleware stack registered', {
      name,
      middlewareCount: middleware.length,
      component: 'route-manager'
    });
  }

  /**
   * Initialize route manager
   * @returns {Promise<RouteManager>} Route manager instance
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Route manager already initialized', {
        component: 'route-manager'
      });
      return this;
    }

    try {
      logger.info('Initializing route manager...', {
        environment: this.environment,
        component: 'route-manager'
      });

      // Initialize middleware manager if available
    if (this.middlewareManager) {
      await this.middlewareManager.initialize();
    }

      // Setup global middleware
      this.setupGlobalMiddleware();

      // Auto-discover and register routes
      await this.discoverRoutes();

      // Setup route metrics collection
      this.setupMetricsCollection();

      // Setup error handling
    this.setupErrorHandling();

    // Setup performance monitoring endpoint
    this.setupPerformanceEndpoint();

    this.isInitialized = true;
      
      logger.info('Route manager initialized successfully', {
        stats: this.routeStats,
        middlewareStacks: Array.from(this.middlewareStacks.keys()),
        validationSchemas: this.validationSchemas.size,
        component: 'route-manager'
      });

      return this;
    } catch (error) {
      logger.error('Failed to initialize route manager:', {
        error: error.message,
        stack: error.stack,
        component: 'route-manager'
      });
      throw error;
    }
  }

  /**
   * Setup global middleware
   */
  setupGlobalMiddleware() {
    // Apply correlation middleware first
    this.app.use(correlationMiddleware());
    
    // Apply CORS if enabled
    if (this.options.cors?.enabled) {
      this.app.use(this.createCorsMiddleware());
    }
    
    // Apply compression if enabled
    if (this.options.enableCompression) {
      this.app.use(this.createCompressionMiddleware());
    }
    
    // Apply rate limiting if enabled
    if (this.options.rateLimit?.enabled) {
      this.app.use(this.createRateLimitMiddleware());
    }
    
    // Apply versioning middleware if enabled
    if (this.options.enableVersioning && this.versionRouter) {
      this.app.use(this.versionRouter.createMiddleware());
    }
    
    // Apply query optimization middleware if enabled
    if (this.options.enableQueryOptimization) {
      this.app.use(queryOptimizationMiddleware({
        enableCaching: this.options.queryOptimization?.enableCaching || true,
        enableAnalytics: this.options.queryOptimization?.enableAnalytics || true
      }));
    }
    
    // Apply basic middleware stack from configuration
    const basicStack = this.middlewareStacks.basic || [];
    basicStack.forEach(middlewareName => {
      const middleware = this.getMiddlewareByName(middlewareName);
      if (middleware) {
        this.app.use(middleware);
        this.routeStats.middleware++;
      }
    });
    
    // Basic Express middleware
    this.app.use(express.json({ limit: this.options.requestSizeLimit || '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: this.options.requestSizeLimit || '10mb' }));
    
    // Setup documentation endpoints if enabled
    if (this.options.enableDocumentation) {
      this.setupDocumentationEndpoints();
    }
    
    // Enhanced request logging with version and user info
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      if (this.options.logRequests) {
        logger.info('Request received', {
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          correlationId: req.correlationId,
          userId: req.user?.id,
          apiVersion: req.apiVersion?.resolved,
          component: 'route-manager'
        });
      }
      
      // Track version usage statistics
      if (req.apiVersion?.resolved && this.versionManager) {
        this.versionManager.trackUsage(req.apiVersion.resolved, req.method, req.path);
      }
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.updateMetrics(req, res, duration);
        
        // Log slow requests if enabled
        if (this.options.logSlowRequests && duration > this.options.slowRequestThreshold) {
          logger.warn('Slow request detected', {
            method: req.method,
            url: req.url,
            duration,
            threshold: this.options.slowRequestThreshold,
            component: 'route-manager'
          });
        }
      });
      
      next();
    });
    
    logger.debug('Global middleware applied', {
      cors: this.options.cors?.enabled,
      compression: this.options.enableCompression,
      rateLimit: this.options.rateLimit?.enabled,
      versioning: this.options.enableVersioning,
      queryOptimization: this.options.enableQueryOptimization,
      documentation: this.options.enableDocumentation,
      component: 'route-manager'
    });
  }

  /**
   * Auto-discover routes from filesystem
   * @returns {Promise<void>}
   */
  async discoverRoutes() {
    const routesDir = __dirname;
    
    try {
      const entries = await fs.readdir(routesDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'index.js') {
          await this.loadRouteFile(path.join(routesDir, entry.name));
        } else if (entry.isDirectory()) {
          // Handle versioned routes (e.g., v1/, v2/)
          if (entry.name.match(/^v\d+$/)) {
            await this.loadVersionedRoutes(entry.name, path.join(routesDir, entry.name));
          }
        }
      }
    } catch (error) {
      logger.error('Failed to discover routes:', {
        error: error.message,
        component: 'route-manager'
      });
      throw error;
    }
  }

  /**
   * Load individual route file
   * @param {string} filePath - Path to route file
   * @returns {Promise<void>}
   */
  async loadRouteFile(filePath) {
    try {
      const routeName = path.basename(filePath, '.js');
      const routePath = this.getRoutePathFromFilename(routeName);
      
      // Dynamic import of route module
      const routeModule = await import(filePath);
      const router = routeModule.default || routeModule.router;
      
      if (!router) {
        logger.warn(`No router exported from ${filePath}`, {
          component: 'route-manager'
        });
        return;
      }

      // Apply route-specific middleware
      const routeMiddleware = this.getRouteMiddleware(routePath);
      if (routeMiddleware.length > 0) {
        routeMiddleware.forEach(middleware => {
          router.use(middleware);
        });
      }

      // Register route
      this.app.use(routePath, router);
      this.routes.set(routePath, {
        name: routeName,
        router,
        filePath,
        middleware: routeMiddleware.length,
        registeredAt: new Date().toISOString()
      });
      
      this.routeStats.registered++;
      
      logger.debug(`Registered route: ${routePath}`, {
        file: filePath,
        middleware: routeMiddleware.length,
        component: 'route-manager'
      });
    } catch (error) {
      logger.error(`Failed to load route file ${filePath}:`, {
        error: error.message,
        component: 'route-manager'
      });
      this.routeStats.errors++;
    }
  }

  /**
   * Load versioned routes
   * @param {string} version - Version string (e.g., 'v1')
   * @param {string} versionDir - Path to version directory
   * @returns {Promise<void>}
   */
  async loadVersionedRoutes(version, versionDir) {
    try {
      const entries = await fs.readdir(versionDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.js')) {
          const routeName = path.basename(entry.name, '.js');
          const routePath = `/api/${version}/${this.getRoutePathFromFilename(routeName)}`;
          const filePath = path.join(versionDir, entry.name);
          
          // Dynamic import of versioned route module
          const routeModule = await import(filePath);
          const router = routeModule.default || routeModule.router;
          
          if (!router) {
            logger.warn(`No router exported from ${filePath}`, {
              component: 'route-manager'
            });
            continue;
          }

          // Apply version-specific middleware
          const versionMiddleware = this.getVersionMiddleware(version);
          const routeMiddleware = this.getRouteMiddleware(routePath);
          const allMiddleware = [...versionMiddleware, ...routeMiddleware];
          
          if (allMiddleware.length > 0) {
            allMiddleware.forEach(middleware => {
              router.use(middleware);
            });
          }

          // Register versioned route
          this.app.use(routePath, router);
          
          if (!this.versions.has(version)) {
            this.versions.set(version, new Map());
            this.routeStats.versions++;
          }
          
          this.versions.get(version).set(routePath, {
            name: routeName,
            router,
            filePath,
            middleware: allMiddleware.length,
            registeredAt: new Date().toISOString()
          });
          
          this.routeStats.registered++;
          
          logger.debug(`Registered versioned route: ${routePath}`, {
            version,
            file: filePath,
            middleware: allMiddleware.length,
            component: 'route-manager'
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to load versioned routes for ${version}:`, {
        error: error.message,
        component: 'route-manager'
      });
      this.routeStats.errors++;
    }
  }

  /**
   * Get route path from filename
   * @param {string} filename - Route filename
   * @returns {string} Route path
   */
  getRoutePathFromFilename(filename) {
    // Convert filename to route path
    // e.g., 'users-routes' -> '/users', 'auth-advanced' -> '/auth'
    let routePath = filename
      .replace(/-routes$/, '')
      .replace(/-advanced$/, '')
      .replace(/_/g, '-');
    
    // Special cases
    const specialRoutes = {
      'auth': '/auth',
      'users': '/users',
      'companies': '/companies',
      'courses': '/courses',
      'employees': '/employees',
      'schedules': '/schedules',
      'settings': '/settings',
      'tenants': '/tenants',
      'roles': '/roles',
      'permissions': '/permissions',
      'gdpr': '/gdpr',
      'person': '/persons'
    };
    
    return specialRoutes[routePath] || `/${routePath}`;
  }

  /**
   * Get middleware for specific route
   * @param {string} routePath - Route path
   * @returns {Array} Array of middleware functions
   */
  getRouteMiddleware(routePath) {
    const routeMiddleware = [];
    const routeConfig = this.middlewareConfig?.routes?.[routePath];
    
    if (routeConfig) {
      routeConfig.forEach(middlewareName => {
        try {
          const middleware = this.getMiddlewareByName(middlewareName);
          if (middleware) {
            routeMiddleware.push(middleware);
          }
        } catch (error) {
          logger.error(`Failed to get middleware ${middlewareName} for route ${routePath}:`, {
            error: error.message,
            component: 'route-manager'
          });
        }
      });
    }
    
    return routeMiddleware;
  }
  
  /**
   * Get middleware by name from configuration
   * @param {string} middlewareName - Middleware name
   * @returns {Function|null} Middleware function
   */
  getMiddlewareByName(middlewareName) {
    if (this.middlewareManager) {
      return this.middlewareManager.getMiddleware(middlewareName);
    }
    
    // Fallback to basic middleware lookup
    const basicMiddleware = {
      'cors': this.createCorsMiddleware(),
      'compression': this.createCompressionMiddleware(),
      'rateLimit': this.createRateLimitMiddleware()
    };
    
    return basicMiddleware[middlewareName] || null;
  }
  
  /**
   * Create CORS middleware
   * @returns {Function} CORS middleware
   */
  createCorsMiddleware() {
    const corsOptions = this.options.cors || {};
    return (req, res, next) => {
      res.header('Access-Control-Allow-Origin', corsOptions.origin || '*');
      res.header('Access-Control-Allow-Methods', corsOptions.methods || 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders || 'Content-Type, Authorization, Content-Length, X-Requested-With');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    };
  }
  
  /**
   * Create compression middleware
   * @returns {Function} Compression middleware
   */
  createCompressionMiddleware() {
    return (req, res, next) => {
      // Basic compression logic
      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (acceptEncoding.includes('gzip')) {
        res.setHeader('Content-Encoding', 'gzip');
      }
      next();
    };
  }
  
  /**
   * Create rate limit middleware
   * @returns {Function} Rate limit middleware
   */
  createRateLimitMiddleware() {
    const rateLimitOptions = this.options.rateLimit || {};
    const windowMs = rateLimitOptions.windowMs || 15 * 60 * 1000; // 15 minutes
    const max = rateLimitOptions.max || 100; // limit each IP to 100 requests per windowMs
    
    const requests = new Map();
    
    return (req, res, next) => {
      const ip = req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requests.has(ip)) {
        requests.set(ip, []);
      }
      
      const ipRequests = requests.get(ip);
      // Remove old requests outside the window
      const validRequests = ipRequests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length >= max) {
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)} seconds.`
        });
      }
      
      validRequests.push(now);
      requests.set(ip, validRequests);
      
      next();
    };
  }

  /**
   * Get middleware for specific version
   * @param {string} version - Version string
   * @returns {Array} Array of middleware functions
   */
  getVersionMiddleware(version) {
    const versionMiddleware = [];
    const versionConfig = this.middlewareConfig?.versions?.[version];
    
    if (versionConfig) {
      versionConfig.forEach(middlewareName => {
        try {
          const middleware = this.getMiddlewareByName(middlewareName);
          if (middleware) {
            versionMiddleware.push(middleware);
          }
        } catch (error) {
          logger.error(`Failed to get middleware ${middlewareName} for version ${version}:`, {
            error: error.message,
            component: 'route-manager'
          });
        }
      });
    }
    
    return versionMiddleware;
  }

  /**
   * Setup metrics collection for routes
   */
  setupMetricsCollection() {
    // Middleware to collect route metrics
    this.app.use((req, res, next) => {
      const startTime = performance.now();
      const originalSend = res.send;
      
      res.send = function(data) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Update metrics using the new method
        this.updateMetrics(req, res, duration);
        
        // Log slow requests
        if (duration > 1000) { // > 1 second
          this.routeStats.slowRequestCount++;
          logger.warn('Slow route detected', {
            route: `${req.method} ${req.route?.path || req.path}`,
            duration: `${duration.toFixed(2)}ms`,
            statusCode: res.statusCode,
            component: 'route-manager'
          });
        }
        
        return originalSend.call(this, data);
      }.bind(this);
      
      next();
    });
  }

  /**
   * Update route metrics
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {number} duration - Request duration in milliseconds
   */
  updateMetrics(req, res, duration) {
    // Record metrics
    const routeKey = `${req.method} ${req.route?.path || req.path}`;
    if (!this.routeMetrics.has(routeKey)) {
      this.routeMetrics.set(routeKey, {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        statusCodes: new Map(),
        errors: 0,
        slowRequestCount: 0,
        lastAccessed: null
      });
    }
    
    const metrics = this.routeMetrics.get(routeKey);
    metrics.count++;
    metrics.totalDuration += duration;
    metrics.averageDuration = metrics.totalDuration / metrics.count;
    metrics.lastAccessed = new Date();
    
    const statusCode = res.statusCode;
    const statusCount = metrics.statusCodes.get(statusCode) || 0;
    metrics.statusCodes.set(statusCode, statusCount + 1);
    
    if (statusCode >= 400) {
      metrics.errors++;
    }
    
    if (duration > 1000) {
      metrics.slowRequestCount++;
    }
  }

  /**
   * Setup documentation endpoints
   */
  setupDocumentationEndpoints() {
    // Swagger UI documentation
    const swaggerMiddleware = this.documentationMiddleware.generateSwaggerMiddleware({
      routePrefix: '/docs',
      title: 'API Documentation',
      version: '1.0.0',
      description: 'Comprehensive API documentation with examples'
    });
    
    this.app.use('/docs', ...swaggerMiddleware);
    
    // API documentation endpoint
    this.app.get('/api/documentation', 
      this.documentationMiddleware.generateDocumentationEndpoint({
        includeMetrics: true,
        includeVersions: true,
        includeHealth: true
      })
    );
    
    // API versions endpoint
    this.app.get('/api/versions', (req, res) => {
      const versions = this.versionManager.getAllVersions();
      const usageStats = this.versionManager.getUsageStats();
      
      res.json({
        success: true,
        data: {
          versions,
          statistics: usageStats
        }
      });
    });
    
    logger.debug('Documentation endpoints configured', {
      swaggerUI: '/docs',
      apiDocs: '/api/documentation',
      versions: '/api/versions',
      component: 'route-manager'
    });
  }
  
  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // 404 handler - must be registered after all routes
    this.app.use('*', notFoundHandler);
    
    // Global error handler - must be last middleware
    this.app.use((err, req, res, next) => {
      this.routeStats.errors++;
      
      // Use the centralized error handler
      return globalErrorHandler(err, req, res, next);
    });
    
    logger.debug('Error handling middleware setup completed', {
      component: 'route-manager'
    });
  }

  /**
   * Register custom route
   * @param {string} path - Route path
   * @param {object} router - Express router
   * @param {object} options - Registration options
   * @returns {RouteManager} Route manager instance
   */
  registerRoute(path, router, options = {}) {
    try {
      const { middleware = [], version = null } = options;
      
      // Apply middleware
      middleware.forEach(middlewareName => {
        const middlewareFunc = this.middlewareManager.getMiddleware(middlewareName);
        if (middlewareFunc) {
          router.use(middlewareFunc);
        }
      });
      
      // Register route
      const fullPath = version ? `/api/${version}${path}` : path;
      this.app.use(fullPath, router);
      
      // Store route info
      const routeInfo = {
        name: path.replace(/^\//g, ''),
        router,
        middleware: middleware.length,
        version,
        registeredAt: new Date().toISOString(),
        custom: true
      };
      
      if (version) {
        if (!this.versions.has(version)) {
          this.versions.set(version, new Map());
        }
        this.versions.get(version).set(fullPath, routeInfo);
      } else {
        this.routes.set(fullPath, routeInfo);
      }
      
      this.routeStats.registered++;
      
      logger.info(`Custom route registered: ${fullPath}`, {
        middleware: middleware.length,
        version,
        component: 'route-manager'
      });
      
      return this;
    } catch (error) {
      logger.error(`Failed to register custom route ${path}:`, {
        error: error.message,
        component: 'route-manager'
      });
      this.routeStats.errors++;
      throw error;
    }
  }

  /**
   * Get route statistics
   * @returns {object} Route statistics
   */
  getStats() {
    return {
      ...this.routeStats,
      routes: Array.from(this.routes.keys()),
      versions: Array.from(this.versions.keys()),
      metrics: Object.fromEntries(
        Array.from(this.routeMetrics.entries()).map(([route, metrics]) => [
          route,
          {
            ...metrics,
            statusCodes: Object.fromEntries(metrics.statusCodes)
          }
        ])
      )
    };
  }

  /**
   * Get route performance metrics
   * @returns {object} Performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {};
    
    for (const [route, data] of this.routeMetrics) {
      metrics[route] = {
        requests: data.count,
        averageResponseTime: `${data.averageDuration.toFixed(2)}ms`,
        errorRate: data.errors / data.count,
        statusDistribution: Object.fromEntries(data.statusCodes)
      };
    }
    
    return metrics;
  }

  /**
   * Get comprehensive route metrics and statistics
   * @returns {object} Detailed route metrics
   */
  getMetrics() {
    const routeMetrics = {};
    
    for (const [route, metrics] of this.routeMetrics) {
      routeMetrics[route] = {
        requestCount: metrics.count,
        averageResponseTime: parseFloat(metrics.averageDuration.toFixed(2)),
        errorRate: metrics.errors > 0 ? parseFloat((metrics.errors / metrics.count * 100).toFixed(2)) : 0,
        slowRequestRate: metrics.slowRequestCount > 0 ? parseFloat((metrics.slowRequestCount / metrics.count * 100).toFixed(2)) : 0,
        statusCodes: Object.fromEntries(metrics.statusCodes),
        lastAccessed: metrics.lastAccessed,
        totalErrors: metrics.errors,
        slowRequests: metrics.slowRequestCount
      };
    }
    
    // Get query optimization analytics
    const queryAnalytics = this.queryBuilder ? this.queryBuilder.getAnalytics() : null;
    
    // Get version usage statistics
    const versionUsageStats = this.versionManager ? this.versionManager.getUsageStats() : null;
    
    return {
      overview: {
        ...this.routeStats,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      },
      routes: routeMetrics,
      middlewareStacks: Array.from(this.middlewareStacks.keys()),
      validationSchemas: this.validationSchemas.size,
      queryOptimization: queryAnalytics ? {
        enabled: true,
        analytics: queryAnalytics,
        slowQueries: queryAnalytics.slowQueries || [],
        optimizationSuggestions: queryAnalytics.optimizationSuggestions || []
      } : { enabled: false },
      versioning: versionUsageStats ? {
        enabled: true,
        statistics: versionUsageStats,
        supportedVersions: this.versionManager.getSupportedVersions ? this.versionManager.getSupportedVersions().map(v => v.version) : [],
        deprecatedVersions: this.versionManager.getDeprecatedVersions ? this.versionManager.getDeprecatedVersions().map(v => v.version) : []
      } : { enabled: false },
      documentation: {
        enabled: !!this.schemaGenerator,
        endpoints: {
          swagger: '/docs',
          openapi: '/docs/openapi.json',
          apiDocs: '/api/documentation',
          versions: '/api/versions'
        },
        schemas: this.schemaGenerator && this.schemaGenerator.components ? 
          Object.keys(this.schemaGenerator.components.schemas || {}) : [],
        generatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Get validation schema for a specific route
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @returns {Function|Array|null} Validation schema
   */
  getValidationSchema(method, path) {
    const key = `${method.toUpperCase()}:${path}`;
    return this.validationSchemas.get(key) || null;
  }
  
  /**
   * Get middleware stack by name
   * @param {string} name - Stack name
   * @returns {Array|null} Middleware array
   */
  getMiddlewareStack(name) {
    return this.middlewareStacks.get(name) || null;
  }
  
  /**
   * Get health status of the route manager
   * @returns {object} Health status
   */
  getHealthStatus() {
    const totalRequests = Array.from(this.routeMetrics.values())
      .reduce((sum, metrics) => sum + metrics.count, 0);
    
    const totalErrors = Array.from(this.routeMetrics.values())
      .reduce((sum, metrics) => sum + metrics.errors, 0);
    
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests * 100) : 0;
    
    const averageResponseTime = Array.from(this.routeMetrics.values())
      .reduce((sum, metrics, index, array) => {
        return sum + (metrics.averageDuration / array.length);
      }, 0);
    
    return {
      status: errorRate < 5 && averageResponseTime < 1000 ? 'healthy' : 'degraded',
      metrics: {
        totalRequests,
        totalErrors,
        errorRate: parseFloat(errorRate.toFixed(2)),
        averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
        registeredRoutes: this.routeStats.registered,
        activeVersions: this.routeStats.versions
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Reset metrics (useful for testing or periodic cleanup)
   */
  resetMetrics() {
    this.routeMetrics.clear();
    this.routeStats = {
      registered: this.routeStats.registered, // Keep registered count
      versions: this.routeStats.versions, // Keep versions count
      middleware: this.routeStats.middleware, // Keep middleware count
      errors: 0,
      slowRequestCount: 0
    };
    
    logger.info('Route metrics reset', {
      component: 'route-manager'
    });
  }
  
  /**
   * Get top performing routes
   * @param {number} limit - Number of routes to return
   * @returns {Array} Top performing routes
   */
  getTopPerformingRoutes(limit = 10) {
    return Array.from(this.routeMetrics.entries())
      .map(([route, metrics]) => ({
        route,
        requestCount: metrics.count,
        averageResponseTime: metrics.averageDuration,
        errorRate: metrics.errors / metrics.count * 100
      }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, limit);
  }
  
  /**
   * Get slowest routes
   * @param {number} limit - Number of routes to return
   * @returns {Array} Slowest routes
   */
  getSlowestRoutes(limit = 10) {
    return Array.from(this.routeMetrics.entries())
      .map(([route, metrics]) => ({
        route,
        averageResponseTime: metrics.averageDuration,
        requestCount: metrics.count,
        slowRequestCount: metrics.slowRequestCount
      }))
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit);
  }
  
  /**
   * Get routes with highest error rates
   * @param {number} limit - Number of routes to return
   * @returns {Array} Routes with highest error rates
   */
  getHighestErrorRoutes(limit = 10) {
    return Array.from(this.routeMetrics.entries())
      .map(([route, metrics]) => ({
        route,
        errorRate: metrics.errors / metrics.count * 100,
        totalErrors: metrics.errors,
        requestCount: metrics.count
      }))
      .filter(route => route.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);
  }

  /**
   * Register a new API version
   * @param {string} version - Version identifier
   * @param {object} config - Version configuration
   */
  registerApiVersion(version, config = {}) {
    if (!this.versionManager) {
      logger.warn('API versioning is disabled', { component: 'route-manager' });
      return;
    }
    
    this.versionManager.registerVersion(version, config);
    
    logger.info('API version registered', {
      version,
      deprecated: config.deprecated || false,
      component: 'route-manager'
    });
  }
  
  /**
   * Deprecate an API version
   * @param {string} version - Version to deprecate
   * @param {object} options - Deprecation options
   */
  deprecateApiVersion(version, options = {}) {
    if (!this.versionManager) {
      logger.warn('API versioning is disabled', { component: 'route-manager' });
      return;
    }
    
    this.versionManager.deprecateVersion(version, options);
    
    logger.info('API version deprecated', {
      version,
      options,
      component: 'route-manager'
    });
  }
  
  /**
   * Add custom API documentation
   * @param {string} path - API path
   * @param {string} method - HTTP method
   * @param {object} spec - OpenAPI specification
   */
  addApiDocumentation(path, method, spec) {
    if (!this.schemaGenerator) {
      logger.warn('API documentation is disabled', { component: 'route-manager' });
      return;
    }
    
    this.schemaGenerator.addCustomEndpoint(path, method, spec);
    
    logger.debug('Custom API documentation added', {
      path,
      method,
      component: 'route-manager'
    });
  }
  
  /**
   * Get query optimization report
   * @returns {object} Query optimization analytics
   */
  getQueryOptimizationReport() {
    if (!this.queryBuilder) {
      return { enabled: false };
    }
    
    return {
      enabled: true,
      analytics: this.queryBuilder.getAnalytics()
    };
  }
  
  /**
   * Get API versioning report
   * @returns {object} API versioning statistics
   */
  getVersioningReport() {
    if (!this.versionManager) {
      return { enabled: false };
    }
    
    return {
      enabled: true,
      statistics: this.versionManager.getUsageStats(),
      versions: this.versionManager.getAllVersions()
    };
  }
  
  /**
   * Setup performance monitoring endpoint
   */
  setupPerformanceEndpoint() {
    this.app.get('/api/performance', (req, res) => {
      const metrics = this.getMetrics();
      const queryReport = this.getQueryOptimizationReport();
      const versioningReport = this.getVersioningReport();
      
      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          overview: metrics.overview,
          performance: {
            routes: metrics.routes,
            topRoutes: this.getTopPerformingRoutes(10),
            slowestRoutes: this.getSlowestRoutes(10),
            errorRoutes: this.getHighestErrorRoutes(10)
          },
          queryOptimization: queryReport,
          versioning: versioningReport,
          recommendations: this.generatePerformanceRecommendations()
        }
      });
    });
    
    logger.info('Performance monitoring endpoint configured', {
      endpoint: '/api/performance',
      component: 'route-manager'
    });
  }
  
  /**
   * Generate performance recommendations
   * @returns {Array} Array of performance recommendations
   */
  generatePerformanceRecommendations() {
    const recommendations = [];
    
    // Check for slow routes
    const slowRoutes = this.getSlowestRoutes(5);
    if (slowRoutes.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Slow Routes Detected',
        description: `${slowRoutes.length} routes have average response times > 1000ms`,
        action: 'Consider implementing caching, query optimization, or pagination',
        routes: slowRoutes.map(r => r.route)
      });
    }
    
    // Check for high error rates
    const errorRoutes = this.getHighestErrorRoutes(3);
    if (errorRoutes.length > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'High Error Rates',
        description: `${errorRoutes.length} routes have error rates > 5%`,
        action: 'Review error handling and input validation',
        routes: errorRoutes.map(r => r.route)
      });
    }
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 80) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        title: 'High Memory Usage',
        description: `Memory usage is at ${memoryUsagePercent.toFixed(1)}%`,
        action: 'Consider implementing memory optimization strategies'
      });
    }
    
    // Check for deprecated API versions usage
    if (this.versionManager && this.versionManager.getDeprecatedVersions) {
      const deprecatedVersions = this.versionManager.getDeprecatedVersions();
      const activeDeprecated = deprecatedVersions.filter(v => v.requestCount > 0);
      
      if (activeDeprecated.length > 0) {
        recommendations.push({
          type: 'versioning',
          priority: 'medium',
          title: 'Deprecated API Versions in Use',
          description: `${activeDeprecated.length} deprecated versions are still receiving requests`,
          action: 'Notify clients to migrate to supported versions',
          versions: activeDeprecated.map(v => v.version)
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Get manager status
   * @returns {object} Manager status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      environment: this.environment,
      stats: this.routeStats,
      routes: this.routes.size,
      versions: this.versions.size,
      middleware: this.middlewareManager.getStatus()
    };
  }
}

/**
 * Initialize routes for Express app
 * @param {object} app - Express app instance
 * @param {string} environment - Target environment
 * @returns {Promise<RouteManager>} Initialized route manager
 */
export const initializeRoutes = async (app, environment = null) => {
  const routeManager = new RouteManager(app, environment);
  await routeManager.initialize();
  return routeManager;
};

export default {
  RouteManager,
  initializeRoutes
};