import { performance } from 'perf_hooks';
import logger from '../utils/logger.js';
import cache from '../config/cache.js';

/**
 * Performance monitoring middleware for tracking request metrics
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      totalResponseTime: 0,
      slowQueries: [],
      errorCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // Start metrics collection interval
    this.startMetricsCollection();
  }

  /**
   * Express middleware for performance monitoring
   */
  middleware() {
    const self = this;
    return (req, res, next) => {
      const startTime = performance.now();
      const originalSend = res.send;
      
      // Track request start
      req.startTime = startTime;
      req.requestId = self.generateRequestId();
      
      // Override res.send to capture response time
      res.send = function(data) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Update metrics
        self.updateMetrics(req, res, responseTime);
        
        // Log slow requests
        if (responseTime > 1000) { // > 1 second
          self.logSlowRequest(req, responseTime);
        }
        
        // Call original send
        originalSend.call(res, data);
      };
      
      next();
    };
  }

  /**
   * Update performance metrics
   */
  updateMetrics(req, res, responseTime) {
    this.metrics.requests++;
    this.metrics.totalResponseTime += responseTime;
    
    if (res.statusCode >= 400) {
      this.metrics.errorCount++;
    }
    
    // Log request details
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime.toFixed(2)}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }

  /**
   * Log slow requests for analysis
   */
  logSlowRequest(req, responseTime) {
    const slowQuery = {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      responseTime: responseTime,
      query: req.query,
      body: req.body,
      headers: req.headers
    };
    
    this.metrics.slowQueries.push(slowQuery);
    
    // Keep only last 100 slow queries
    if (this.metrics.slowQueries.length > 100) {
      this.metrics.slowQueries.shift();
    }
    
    logger.warn('Slow request detected', slowQuery);
  }

  /**
   * Database query performance monitoring
   */
  monitorQuery(queryName, queryFn) {
    return async (...args) => {
      const startTime = performance.now();
      
      try {
        const result = await queryFn(...args);
        const endTime = performance.now();
        const queryTime = endTime - startTime;
        
        // Log query performance
        logger.info('Database query completed', {
          queryName,
          queryTime: `${queryTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString()
        });
        
        // Log slow queries
        if (queryTime > 500) { // > 500ms
          logger.warn('Slow database query', {
            queryName,
            queryTime: `${queryTime.toFixed(2)}ms`,
            args: JSON.stringify(args)
          });
        }
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        const queryTime = endTime - startTime;
        
        logger.error('Database query failed', {
          queryName,
          queryTime: `${queryTime.toFixed(2)}ms`,
          error: error.message,
          stack: error.stack
        });
        
        throw error;
      }
    };
  }

  /**
   * Cache performance tracking
   */
  trackCacheHit() {
    this.metrics.cacheHits++;
  }

  trackCacheMiss() {
    this.metrics.cacheMisses++;
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    const avgResponseTime = this.metrics.requests > 0 
      ? this.metrics.totalResponseTime / this.metrics.requests 
      : 0;
    
    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
      : 0;
    
    return {
      ...this.metrics,
      averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
      cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      requests: 0,
      totalResponseTime: 0,
      slowQueries: [],
      errorCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start periodic metrics collection
   */
  startMetricsCollection() {
    // Log metrics every 5 minutes
    setInterval(() => {
      const metrics = this.getMetrics();
      logger.info('Performance metrics', metrics);
      
      // Store metrics in cache for monitoring dashboard
      cache.set('performance_metrics', JSON.stringify(metrics), 300); // 5 minutes TTL
    }, 5 * 60 * 1000);
  }

  /**
   * Health check endpoint data
   */
  getHealthCheck() {
    const metrics = this.getMetrics();
    
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      performance: {
        totalRequests: metrics.requests,
        averageResponseTime: metrics.averageResponseTime,
        errorRate: metrics.requests > 0 ? (metrics.errorCount / metrics.requests) * 100 : 0,
        cacheHitRate: metrics.cacheHitRate
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;