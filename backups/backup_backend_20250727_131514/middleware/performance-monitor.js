/**
 * Performance Monitoring Middleware
 * Week 5 - Database and Performance Optimization
 * 
 * This middleware tracks:
 * - API response times
 * - Database query performance
 * - Memory usage
 * - Cache hit/miss ratios
 * - Error rates
 */

import logger from '../utils/logger.js';
import { cacheService } from '../utils/cache.js';

// Performance metrics storage
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        responseTimes: []
      },
      database: {
        queries: 0,
        slowQueries: 0,
        queryTimes: []
      },
      cache: {
        hits: 0,
        misses: 0,
        operations: 0
      },
      memory: {
        usage: [],
        peak: 0
      }
    };
    
    // Start memory monitoring
    this.startMemoryMonitoring();
  }
  
  // Record API request metrics
  recordRequest(duration, success = true) {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }
    
    this.metrics.requests.responseTimes.push(duration);
    
    // Keep only last 1000 response times
    if (this.metrics.requests.responseTimes.length > 1000) {
      this.metrics.requests.responseTimes.shift();
    }
    
    // Record in cache for persistence
    cacheService.recordMetric('api_response_time', duration);
    
    // Log slow requests
    if (duration > 2000) {
      logger.warn('Slow API request detected', {
        duration: `${duration}ms`,
        threshold: '2000ms'
      });
    }
  }
  
  // Record database query metrics
  recordDatabaseQuery(duration, query = '') {
    this.metrics.database.queries++;
    this.metrics.database.queryTimes.push(duration);
    
    // Keep only last 1000 query times
    if (this.metrics.database.queryTimes.length > 1000) {
      this.metrics.database.queryTimes.shift();
    }
    
    // Track slow queries
    if (duration > 1000) {
      this.metrics.database.slowQueries++;
      logger.warn('Slow database query detected', {
        duration: `${duration}ms`,
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        threshold: '1000ms'
      });
    }
    
    // Record in cache for persistence
    cacheService.recordMetric('db_query_time', duration);
  }
  
  // Record cache metrics
  recordCacheOperation(type, hit = false) {
    this.metrics.cache.operations++;
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }
    
    // Record in cache for persistence
    cacheService.recordMetric('cache_hit_rate', hit ? 1 : 0);
  }
  
  // Start memory monitoring
  startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsed = memUsage.heapUsed / 1024 / 1024; // MB
      
      this.metrics.memory.usage.push({
        timestamp: Date.now(),
        heapUsed,
        heapTotal: memUsage.heapTotal / 1024 / 1024,
        external: memUsage.external / 1024 / 1024,
        rss: memUsage.rss / 1024 / 1024
      });
      
      // Update peak memory usage
      if (heapUsed > this.metrics.memory.peak) {
        this.metrics.memory.peak = heapUsed;
      }
      
      // Keep only last 100 memory readings
      if (this.metrics.memory.usage.length > 100) {
        this.metrics.memory.usage.shift();
      }
      
      // Record in cache for persistence
      cacheService.recordMetric('memory_usage', heapUsed);
      
      // Alert on high memory usage
      if (heapUsed > 500) { // 500MB threshold
        logger.warn('High memory usage detected', {
          heapUsed: `${heapUsed.toFixed(2)}MB`,
          threshold: '500MB'
        });
      }
    }, 30000); // Every 30 seconds
  }
  
  // Get performance summary
  getSummary() {
    const now = Date.now();
    const responseTimes = this.metrics.requests.responseTimes;
    const queryTimes = this.metrics.database.queryTimes;
    
    // Calculate averages
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
      
    const avgQueryTime = queryTimes.length > 0
      ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length
      : 0;
    
    // Calculate percentiles
    const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
    const p95ResponseTime = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)] || 0;
    const p99ResponseTime = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)] || 0;
    
    // Calculate cache hit rate
    const cacheHitRate = this.metrics.cache.operations > 0
      ? (this.metrics.cache.hits / this.metrics.cache.operations * 100).toFixed(2)
      : 0;
    
    // Calculate error rate
    const errorRate = this.metrics.requests.total > 0
      ? (this.metrics.requests.errors / this.metrics.requests.total * 100).toFixed(2)
      : 0;
    
    // Get current memory usage
    const currentMemory = this.metrics.memory.usage[this.metrics.memory.usage.length - 1] || {};
    
    return {
      timestamp: now,
      requests: {
        total: this.metrics.requests.total,
        success: this.metrics.requests.success,
        errors: this.metrics.requests.errors,
        errorRate: `${errorRate}%`,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        p95ResponseTime: `${p95ResponseTime.toFixed(2)}ms`,
        p99ResponseTime: `${p99ResponseTime.toFixed(2)}ms`
      },
      database: {
        totalQueries: this.metrics.database.queries,
        slowQueries: this.metrics.database.slowQueries,
        avgQueryTime: `${avgQueryTime.toFixed(2)}ms`,
        slowQueryRate: this.metrics.database.queries > 0 
          ? `${(this.metrics.database.slowQueries / this.metrics.database.queries * 100).toFixed(2)}%`
          : '0%'
      },
      cache: {
        operations: this.metrics.cache.operations,
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        hitRate: `${cacheHitRate}%`
      },
      memory: {
        current: currentMemory.heapUsed ? `${currentMemory.heapUsed.toFixed(2)}MB` : 'N/A',
        peak: `${this.metrics.memory.peak.toFixed(2)}MB`,
        rss: currentMemory.rss ? `${currentMemory.rss.toFixed(2)}MB` : 'N/A'
      }
    };
  }
  
  // Reset metrics
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        responseTimes: []
      },
      database: {
        queries: 0,
        slowQueries: 0,
        queryTimes: []
      },
      cache: {
        hits: 0,
        misses: 0,
        operations: 0
      },
      memory: {
        usage: [],
        peak: 0
      }
    };
  }
}

// Create singleton instance
const performanceMetrics = new PerformanceMetrics();

// Express middleware for request performance monitoring
const requestPerformanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    // Record metrics
    performanceMetrics.recordRequest(duration, success);
    
    // Log request details
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  next();
};

// Database query performance middleware for Prisma
const databasePerformanceMiddleware = {
  query: async (params, next) => {
    const startTime = Date.now();
    
    try {
      const result = await next(params);
      const duration = Date.now() - startTime;
      
      // Record metrics
      performanceMetrics.recordDatabaseQuery(duration, `${params.model}.${params.action}`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failed query
      performanceMetrics.recordDatabaseQuery(duration, `${params.model}.${params.action} (ERROR)`);
      
      // Log error
      logger.error('Database query failed', {
        model: params.model,
        action: params.action,
        duration: `${duration}ms`,
        error: error.message
      });
      
      throw error;
    }
  }
};

// Cache performance tracking
const trackCacheOperation = (operation, hit = false) => {
  performanceMetrics.recordCacheOperation(operation, hit);
};

// Performance dashboard endpoint handler
const getPerformanceDashboard = async (req, res) => {
  try {
    const summary = performanceMetrics.getSummary();
    const cacheStatus = await cacheService.healthCheck();
    
    const dashboard = {
      ...summary,
      cache: {
        ...summary.cache,
        status: cacheStatus
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };
    
    res.json(dashboard);
  } catch (error) {
    logger.error('Failed to generate performance dashboard', { error: error.message });
    res.status(500).json({ error: 'Failed to generate performance dashboard' });
  }
};

// Performance alerts
const checkPerformanceAlerts = () => {
  const summary = performanceMetrics.getSummary();
  
  // Check error rate
  const errorRate = parseFloat(summary.requests.errorRate);
  if (errorRate > 5) { // 5% threshold
    logger.warn('High error rate detected', {
      errorRate: summary.requests.errorRate,
      threshold: '5%'
    });
  }
  
  // Check response time
  const avgResponseTime = parseFloat(summary.requests.avgResponseTime);
  if (avgResponseTime > 1000) { // 1 second threshold
    logger.warn('High average response time detected', {
      avgResponseTime: summary.requests.avgResponseTime,
      threshold: '1000ms'
    });
  }
  
  // Check cache hit rate
  const cacheHitRate = parseFloat(summary.cache.hitRate);
  if (cacheHitRate < 70 && summary.cache.operations > 100) { // 70% threshold with minimum operations
    logger.warn('Low cache hit rate detected', {
      hitRate: summary.cache.hitRate,
      threshold: '70%',
      operations: summary.cache.operations
    });
  }
};

// Start performance monitoring
const startPerformanceMonitoring = () => {
  // Check alerts every 5 minutes
  setInterval(checkPerformanceAlerts, 5 * 60 * 1000);
  
  // Log performance summary every 10 minutes
  setInterval(() => {
    const summary = performanceMetrics.getSummary();
    logger.info('Performance summary', summary);
  }, 10 * 60 * 1000);
  
  logger.info('Performance monitoring started');
};

export {
  performanceMetrics,
  requestPerformanceMiddleware,
  databasePerformanceMiddleware,
  trackCacheOperation,
  getPerformanceDashboard,
  startPerformanceMonitoring
};

// Export requestPerformanceMiddleware as default
export default requestPerformanceMiddleware;