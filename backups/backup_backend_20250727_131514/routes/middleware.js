/**
 * API Middleware Module
 * Centralized middleware for API optimization and security
 */

import rateLimit from 'express-rate-limit';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';
import { redisClient } from '../config/redis.js';

/**
 * Rate Limiting Configurations
 */
export const rateLimiters = {
  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 attempts per window (aumentato per GDPR compliance)
    message: {
      error: 'Too many authentication attempts',
      message: 'Please try again later',
      code: 'RATE_LIMIT_AUTH',
      retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP + User-Agent for more specific rate limiting
      const identifier = req.ip + (req.get('User-Agent') || '');
      return createHash('sha256').update(identifier).digest('hex');
    },
    skip: (req) => {
      // Skip rate limiting for internal requests
      return req.ip === '127.0.0.1' && req.get('X-Internal-Request') === 'true';
    },
    onLimitReached: (req, res, options) => {
      logger.warn('Rate limit exceeded for auth endpoint', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        component: 'rate-limiter'
      });
    }
  }),
  
  // Moderate rate limiting for API endpoints
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'Too many requests',
      message: 'API rate limit exceeded',
      code: 'RATE_LIMIT_API',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id?.toString() || req.ip;
    }
  }),
  
  // Lenient rate limiting for public endpoints
  public: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    message: {
      error: 'Too many requests',
      message: 'Public API rate limit exceeded',
      code: 'RATE_LIMIT_PUBLIC',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
  }),
  
  // Strict rate limiting for file uploads
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: {
      error: 'Too many file uploads',
      message: 'Upload rate limit exceeded',
      code: 'RATE_LIMIT_UPLOAD',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
  })
};

/**
 * Response Caching Middleware
 */
export const cacheMiddleware = {
  /**
   * Create cache middleware with custom TTL
   * @param {number} ttl - Time to live in seconds
   * @param {Function} keyGenerator - Function to generate cache key
   * @returns {Function} Express middleware
   */
  create: (ttl = 300, keyGenerator = null) => {
    return async (req, res, next) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }
      
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : `api:${req.originalUrl}:${JSON.stringify(req.query)}`;
      
      try {
        // Check if response is cached
        const cached = await redisClient.get(cacheKey);
        
        if (cached) {
          const data = JSON.parse(cached);
          
          // Set cache headers
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-Key': createHash('md5').update(cacheKey).digest('hex').substring(0, 8),
            'Cache-Control': `public, max-age=${ttl}`
          });
          
          logger.debug('Cache hit', {
            key: cacheKey,
            path: req.path,
            component: 'cache-middleware'
          });
          
          return res.json(data);
        }
        
        // Store original json method
        const originalJson = res.json;
        
        // Override json method to cache response
        res.json = function(data) {
          // Cache the response
          redisClient.setex(cacheKey, ttl, JSON.stringify(data)).catch(err => {
            logger.error('Failed to cache response', {
              error: err.message,
              key: cacheKey,
              component: 'cache-middleware'
            });
          });
          
          // Set cache headers
          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': createHash('md5').update(cacheKey).digest('hex').substring(0, 8),
            'Cache-Control': `public, max-age=${ttl}`
          });
          
          logger.debug('Cache miss - storing response', {
            key: cacheKey,
            path: req.path,
            component: 'cache-middleware'
          });
          
          // Call original json method
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        logger.error('Cache middleware error', {
          error: error.message,
          key: cacheKey,
          component: 'cache-middleware'
        });
        
        // Continue without caching on error
        next();
      }
    };
  },
  
  // Pre-configured cache middleware
  short: () => cacheMiddleware.create(60), // 1 minute
  medium: () => cacheMiddleware.create(300), // 5 minutes
  long: () => cacheMiddleware.create(3600), // 1 hour
  
  /**
   * Cache invalidation middleware
   * @param {string|Function} pattern - Cache key pattern or function
   * @returns {Function} Express middleware
   */
  invalidate: (pattern) => {
    return async (req, res, next) => {
      const originalJson = res.json;
      
      res.json = async function(data) {
        try {
          let keys;
          
          if (typeof pattern === 'function') {
            keys = pattern(req, data);
          } else {
            keys = [pattern];
          }
          
          if (Array.isArray(keys)) {
            for (const key of keys) {
              if (key.includes('*')) {
                // Pattern-based deletion
                const matchingKeys = await redisClient.keys(key);
                if (matchingKeys.length > 0) {
                  await redisClient.del(...matchingKeys);
                }
              } else {
                // Direct key deletion
                await redisClient.del(key);
              }
            }
            
            logger.debug('Cache invalidated', {
              keys,
              path: req.path,
              method: req.method,
              component: 'cache-middleware'
            });
          }
        } catch (error) {
          logger.error('Cache invalidation error', {
            error: error.message,
            pattern,
            component: 'cache-middleware'
          });
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    };
  }
};

/**
 * Request/Response Logging Middleware
 */
export const requestLogger = (options = {}) => {
  const {
    logBody = false,
    logHeaders = false,
    excludePaths = ['/health', '/metrics'],
    excludeHeaders = ['authorization', 'cookie', 'x-api-key']
  } = options;
  
  return (req, res, next) => {
    // Skip logging for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    const startTime = Date.now();
    const requestId = req.id || createHash('md5').update(`${Date.now()}-${Math.random()}`).digest('hex').substring(0, 8);
    
    // Add request ID to request object
    req.requestId = requestId;
    
    // Prepare log data
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      component: 'request-logger'
    };
    
    // Add headers if enabled
    if (logHeaders) {
      const headers = { ...req.headers };
      excludeHeaders.forEach(header => delete headers[header]);
      logData.headers = headers;
    }
    
    // Add body if enabled (for non-GET requests)
    if (logBody && req.method !== 'GET' && req.body) {
      logData.body = req.body;
    }
    
    logger.info('Request started', logData);
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        responseSize: JSON.stringify(data).length,
        component: 'request-logger'
      });
      
      return originalJson.call(this, data);
    };
    
    // Log errors
    const originalStatus = res.status;
    res.status = function(code) {
      if (code >= 400) {
        const duration = Date.now() - startTime;
        
        logger.warn('Request failed', {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: code,
          duration,
          component: 'request-logger'
        });
      }
      
      return originalStatus.call(this, code);
    };
    
    next();
  };
};

/**
 * Performance Monitoring Middleware
 */
export const performanceMonitor = () => {
  return (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    // Override res.json to measure performance
    const originalJson = res.json;
    res.json = function(data) {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      
      // Set performance headers
      res.set({
        'X-Response-Time': `${duration.toFixed(2)}ms`,
        'X-Memory-Usage': `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
      });
      
      // Log slow requests
      if (duration > 1000) { // Log requests slower than 1 second
        logger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          duration: `${duration.toFixed(2)}ms`,
          memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
          component: 'performance-monitor'
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Security Headers Middleware
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS Configuration
 */
export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://app.example.com',
      'https://admin.example.com'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', {
        origin,
        component: 'cors-middleware'
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Response-Time',
    'X-Cache',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ]
});

/**
 * Compression Middleware
 */
export const compressionConfig = compression({
  filter: (req, res) => {
    // Don't compress if the request includes a cache-control: no-transform directive
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }
    
    // Use compression filter function
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses larger than 1KB
  memLevel: 8 // Memory level (1-9)
});

/**
 * Request Size Limiter
 */
export const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxBytes = typeof maxSize === 'string' 
      ? parseInt(maxSize) * (maxSize.includes('mb') ? 1024 * 1024 : 1024)
      : maxSize;
    
    if (contentLength > maxBytes) {
      logger.warn('Request size limit exceeded', {
        contentLength,
        maxSize: maxBytes,
        path: req.path,
        component: 'size-limiter'
      });
      
      return res.status(413).json({
        error: 'Request entity too large',
        message: `Request size exceeds limit of ${maxSize}`,
        code: 'REQUEST_TOO_LARGE'
      });
    }
    
    next();
  };
};

/**
 * API Version Middleware
 */
export const apiVersioning = (defaultVersion = 'v1') => {
  return (req, res, next) => {
    // Extract version from header, query param, or URL
    const headerVersion = req.get('API-Version');
    const queryVersion = req.query.version;
    const urlVersion = req.path.match(/^\/v(\d+)\//)?.[1];
    
    const version = headerVersion || queryVersion || (urlVersion ? `v${urlVersion}` : defaultVersion);
    
    // Validate version format
    if (!/^v\d+$/.test(version)) {
      return res.status(400).json({
        error: 'Invalid API version',
        message: 'API version must be in format v1, v2, etc.',
        code: 'INVALID_API_VERSION'
      });
    }
    
    // Add version to request object
    req.apiVersion = version;
    
    // Set response header
    res.set('API-Version', version);
    
    next();
  };
};

/**
 * Health Check Middleware
 */
export const healthCheck = () => {
  return (req, res, next) => {
    if (req.path === '/health' || req.path === '/health/') {
      return res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      });
    }
    
    next();
  };
};

/**
 * Middleware Stack Builder
 */
export class MiddlewareStack {
  constructor() {
    this.middlewares = [];
  }
  
  /**
   * Add middleware to stack
   * @param {Function} middleware - Express middleware function
   * @param {object} options - Middleware options
   * @returns {MiddlewareStack} Builder instance
   */
  use(middleware, options = {}) {
    if (typeof middleware === 'function') {
      this.middlewares.push(middleware);
    } else if (typeof middleware === 'object' && middleware.create) {
      this.middlewares.push(middleware.create(options));
    }
    return this;
  }
  
  /**
   * Add conditional middleware
   * @param {Function} condition - Condition function
   * @param {Function} middleware - Middleware function
   * @returns {MiddlewareStack} Builder instance
   */
  useIf(condition, middleware) {
    this.middlewares.push((req, res, next) => {
      if (condition(req)) {
        return middleware(req, res, next);
      }
      next();
    });
    return this;
  }
  
  /**
   * Build middleware array
   * @returns {Array} Array of middleware functions
   */
  build() {
    return this.middlewares;
  }
}

/**
 * Pre-configured middleware stacks
 */
export const middlewareStacks = {
  // Basic API stack
  basic: () => new MiddlewareStack()
    .use(healthCheck())
    .use(securityHeaders)
    .use(corsConfig)
    .use(compressionConfig)
    .use(requestSizeLimiter())
    .use(apiVersioning())
    .use(requestLogger())
    .use(performanceMonitor())
    .build(),
  
  // Public API stack (with rate limiting)
  public: () => new MiddlewareStack()
    .use(healthCheck())
    .use(securityHeaders)
    .use(corsConfig)
    .use(compressionConfig)
    .use(requestSizeLimiter())
    .use(rateLimiters.public)
    .use(apiVersioning())
    .use(requestLogger())
    .use(performanceMonitor())
    .build(),
  
  // Authenticated API stack
  authenticated: () => new MiddlewareStack()
    .use(healthCheck())
    .use(securityHeaders)
    .use(corsConfig)
    .use(compressionConfig)
    .use(requestSizeLimiter())
    .use(rateLimiters.api)
    .use(apiVersioning())
    .use(requestLogger({ logBody: true }))
    .use(performanceMonitor())
    .build(),
  
  // Admin API stack (with enhanced logging)
  admin: () => new MiddlewareStack()
    .use(healthCheck())
    .use(securityHeaders)
    .use(corsConfig)
    .use(compressionConfig)
    .use(requestSizeLimiter('50mb'))
    .use(rateLimiters.api)
    .use(apiVersioning())
    .use(requestLogger({ logBody: true, logHeaders: true }))
    .use(performanceMonitor())
    .build()
};

export default {
  rateLimiters,
  cacheMiddleware,
  requestLogger,
  performanceMonitor,
  securityHeaders,
  corsConfig,
  compressionConfig,
  requestSizeLimiter,
  apiVersioning,
  healthCheck,
  MiddlewareStack,
  middlewareStacks
};