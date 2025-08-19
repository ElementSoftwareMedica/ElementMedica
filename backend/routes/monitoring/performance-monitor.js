/**
 * Performance Monitor - Tracks and analyzes API performance metrics
 * Monitors response times, error rates, memory usage, and provides analytics
 */

import { logger } from '../../utils/logger.js';

export class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      enableMetrics: true,
      metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
      slowRequestThreshold: 1000, // 1 second
      errorRateThreshold: 5, // 5%
      memoryThreshold: 80, // 80% of available memory
      ...options
    };
    
    this.metrics = new Map();
    this.routeMetrics = new Map();
    this.systemMetrics = {
      startTime: Date.now(),
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      memoryUsage: [],
      cpuUsage: []
    };
    
    this.alerts = [];
    this.isMonitoring = false;
    
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  initializeMonitoring() {
    try {
      if (this.options.enableMetrics) {
        this.startSystemMonitoring();
      }

      logger.info('Performance monitor initialized', {
        enableMetrics: this.options.enableMetrics,
        slowRequestThreshold: this.options.slowRequestThreshold,
        component: 'performance-monitor'
      });
    } catch (error) {
      logger.error('Failed to initialize performance monitor:', {
        error: error.message,
        component: 'performance-monitor'
      });
      throw error;
    }
  }

  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Monitor system metrics every 30 seconds
    this.systemMonitorInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Clean old metrics every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    logger.info('System monitoring started', {
      component: 'performance-monitor'
    });
  }

  /**
   * Stop system monitoring
   */
  stopSystemMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.systemMonitorInterval) {
      clearInterval(this.systemMonitorInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    logger.info('System monitoring stopped', {
      component: 'performance-monitor'
    });
  }

  /**
   * Create performance middleware
   * @returns {Function} Performance middleware
   */
  createPerformanceMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      // Override res.end to capture metrics
      const originalEnd = res.end;
      res.end = (...args) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const endMemory = process.memoryUsage();
        
        // Record metrics
        this.recordRequest(req, res, duration, startMemory, endMemory);
        
        // Call original end
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Record request metrics
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {number} duration - Request duration
   * @param {object} startMemory - Memory usage at start
   * @param {object} endMemory - Memory usage at end
   */
  recordRequest(req, res, duration, startMemory, endMemory) {
    try {
      const routePath = this.getRoutePath(req);
      const isError = res.statusCode >= 400;
      const isSlowRequest = duration > this.options.slowRequestThreshold;

      // Update system metrics
      this.systemMetrics.requests++;
      this.systemMetrics.totalResponseTime += duration;
      
      if (isError) {
        this.systemMetrics.errors++;
      }

      // Update route-specific metrics
      this.updateRouteMetrics(routePath, duration, res.statusCode, isError);

      // Record detailed metrics
      const metricEntry = {
        timestamp: Date.now(),
        route: routePath,
        method: req.method,
        statusCode: res.statusCode,
        duration,
        isError,
        isSlowRequest,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      };

      this.addMetricEntry(metricEntry);

      // Check for alerts
      if (isSlowRequest) {
        this.addAlert('slow_request', {
          route: routePath,
          duration,
          threshold: this.options.slowRequestThreshold
        });
      }

      logger.debug('Request metrics recorded', {
        route: routePath,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        component: 'performance-monitor'
      });
    } catch (error) {
      logger.error('Failed to record request metrics:', {
        error: error.message,
        component: 'performance-monitor'
      });
    }
  }

  /**
   * Get route path for metrics
   * @param {object} req - Express request
   * @returns {string} Route path
   */
  getRoutePath(req) {
    // Try to get the route pattern if available
    if (req.route && req.route.path) {
      return req.route.path;
    }
    
    // Fallback to original URL with parameters normalized
    return req.originalUrl.replace(/\/\d+/g, '/:id');
  }

  /**
   * Update route-specific metrics
   * @param {string} routePath - Route path
   * @param {number} duration - Request duration
   * @param {number} statusCode - HTTP status code
   * @param {boolean} isError - Whether request was an error
   */
  updateRouteMetrics(routePath, duration, statusCode, isError) {
    if (!this.routeMetrics.has(routePath)) {
      this.routeMetrics.set(routePath, {
        requests: 0,
        errors: 0,
        totalResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        statusCodes: new Map(),
        lastAccessed: null
      });
    }

    const metrics = this.routeMetrics.get(routePath);
    
    metrics.requests++;
    metrics.totalResponseTime += duration;
    metrics.lastAccessed = Date.now();
    
    if (duration < metrics.minResponseTime) {
      metrics.minResponseTime = duration;
    }
    
    if (duration > metrics.maxResponseTime) {
      metrics.maxResponseTime = duration;
    }
    
    if (isError) {
      metrics.errors++;
    }

    // Track status code distribution
    const statusCount = metrics.statusCodes.get(statusCode) || 0;
    metrics.statusCodes.set(statusCode, statusCount + 1);
  }

  /**
   * Add metric entry
   * @param {object} entry - Metric entry
   */
  addMetricEntry(entry) {
    const key = `${entry.timestamp}-${Math.random()}`;
    this.metrics.set(key, entry);
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Store memory metrics
      this.systemMetrics.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      });

      // Store CPU metrics
      this.systemMetrics.cpuUsage.push({
        timestamp: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system
      });

      // Keep only recent metrics
      const cutoff = Date.now() - this.options.metricsRetention;
      this.systemMetrics.memoryUsage = this.systemMetrics.memoryUsage
        .filter(m => m.timestamp > cutoff);
      this.systemMetrics.cpuUsage = this.systemMetrics.cpuUsage
        .filter(c => c.timestamp > cutoff);

      // Check memory threshold
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (memoryPercent > this.options.memoryThreshold) {
        this.addAlert('high_memory_usage', {
          current: memoryPercent,
          threshold: this.options.memoryThreshold
        });
      }
    } catch (error) {
      logger.error('Failed to collect system metrics:', {
        error: error.message,
        component: 'performance-monitor'
      });
    }
  }

  /**
   * Add performance alert
   * @param {string} type - Alert type
   * @param {object} data - Alert data
   */
  addAlert(type, data) {
    const alert = {
      id: `${type}-${Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
      severity: this.getAlertSeverity(type, data)
    };

    this.alerts.push(alert);

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn(`Performance alert: ${type}`, {
      alert,
      component: 'performance-monitor'
    });
  }

  /**
   * Get alert severity
   * @param {string} type - Alert type
   * @param {object} data - Alert data
   * @returns {string} Severity level
   */
  getAlertSeverity(type, data) {
    switch (type) {
      case 'slow_request':
        return data.duration > this.options.slowRequestThreshold * 2 ? 'high' : 'medium';
      case 'high_memory_usage':
        return data.current > 90 ? 'high' : 'medium';
      case 'high_error_rate':
        return data.rate > 10 ? 'high' : 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Get performance metrics
   * @param {object} options - Query options
   * @returns {object} Performance metrics
   */
  getMetrics(options = {}) {
    const {
      timeRange = this.options.metricsRetention,
      routePath = null,
      includeSystem = true
    } = options;

    const cutoff = Date.now() - timeRange;
    const metrics = {
      timeRange,
      generatedAt: Date.now()
    };

    // Filter metrics by time range
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => m.timestamp > cutoff);

    if (routePath) {
      // Route-specific metrics
      const routeMetrics = recentMetrics.filter(m => m.route === routePath);
      metrics.route = this.calculateRouteMetrics(routeMetrics, routePath);
    } else {
      // Overall metrics
      metrics.overall = this.calculateOverallMetrics(recentMetrics);
      metrics.routes = this.getTopRoutes();
    }

    if (includeSystem) {
      metrics.system = this.getSystemMetrics();
    }

    return metrics;
  }

  /**
   * Calculate route metrics
   * @param {Array} metrics - Route metrics
   * @param {string} routePath - Route path
   * @returns {object} Calculated metrics
   */
  calculateRouteMetrics(metrics, routePath) {
    const routeInfo = this.routeMetrics.get(routePath);
    
    if (!routeInfo || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const errors = metrics.filter(m => m.isError);

    return {
      path: routePath,
      requests: metrics.length,
      errors: errors.length,
      errorRate: (errors.length / metrics.length) * 100,
      averageResponseTime: routeInfo.totalResponseTime / routeInfo.requests,
      minResponseTime: routeInfo.minResponseTime,
      maxResponseTime: routeInfo.maxResponseTime,
      medianResponseTime: this.calculateMedian(durations),
      p95ResponseTime: this.calculatePercentile(durations, 95),
      statusCodeDistribution: Object.fromEntries(routeInfo.statusCodes),
      lastAccessed: routeInfo.lastAccessed
    };
  }

  /**
   * Calculate overall metrics
   * @param {Array} metrics - All metrics
   * @returns {object} Overall metrics
   */
  calculateOverallMetrics(metrics) {
    if (metrics.length === 0) {
      return {
        requests: 0,
        errors: 0,
        errorRate: 0,
        averageResponseTime: 0
      };
    }

    const errors = metrics.filter(m => m.isError);
    const durations = metrics.map(m => m.duration);
    const slowRequests = metrics.filter(m => m.isSlowRequest);

    return {
      requests: metrics.length,
      errors: errors.length,
      errorRate: (errors.length / metrics.length) * 100,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianResponseTime: this.calculateMedian(durations),
      p95ResponseTime: this.calculatePercentile(durations, 95),
      slowRequests: slowRequests.length,
      slowRequestRate: (slowRequests.length / metrics.length) * 100
    };
  }

  /**
   * Get top routes by various metrics
   * @returns {object} Top routes
   */
  getTopRoutes() {
    const routes = Array.from(this.routeMetrics.entries())
      .map(([path, metrics]) => ({
        path,
        requests: metrics.requests,
        errors: metrics.errors,
        errorRate: (metrics.errors / metrics.requests) * 100,
        averageResponseTime: metrics.totalResponseTime / metrics.requests
      }));

    return {
      mostRequested: routes
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10),
      slowest: routes
        .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
        .slice(0, 10),
      mostErrors: routes
        .filter(r => r.errors > 0)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 10)
    };
  }

  /**
   * Get system metrics
   * @returns {object} System metrics
   */
  getSystemMetrics() {
    const uptime = Date.now() - this.systemMetrics.startTime;
    const currentMemory = process.memoryUsage();

    return {
      uptime,
      totalRequests: this.systemMetrics.requests,
      totalErrors: this.systemMetrics.errors,
      overallErrorRate: this.systemMetrics.requests > 0 
        ? (this.systemMetrics.errors / this.systemMetrics.requests) * 100 
        : 0,
      averageResponseTime: this.systemMetrics.requests > 0
        ? this.systemMetrics.totalResponseTime / this.systemMetrics.requests
        : 0,
      currentMemory: {
        heapUsed: currentMemory.heapUsed,
        heapTotal: currentMemory.heapTotal,
        external: currentMemory.external,
        rss: currentMemory.rss,
        usage: (currentMemory.heapUsed / currentMemory.heapTotal) * 100
      },
      memoryHistory: this.systemMetrics.memoryUsage.slice(-20), // Last 20 samples
      alerts: this.alerts.slice(-10) // Last 10 alerts
    };
  }

  /**
   * Calculate median value
   * @param {Array} values - Array of numbers
   * @returns {number} Median value
   */
  calculateMedian(values) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Calculate percentile value
   * @param {Array} values - Array of numbers
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} Percentile value
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, index)];
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - this.options.metricsRetention;
    
    for (const [key, metric] of this.metrics) {
      if (metric.timestamp < cutoff) {
        this.metrics.delete(key);
      }
    }

    logger.debug('Old metrics cleaned up', {
      remaining: this.metrics.size,
      component: 'performance-monitor'
    });
  }

  /**
   * Get performance report
   * @returns {object} Performance report
   */
  getPerformanceReport() {
    return {
      summary: this.getMetrics({ includeSystem: true }),
      alerts: this.alerts.slice(-20),
      recommendations: this.generateRecommendations(),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate performance recommendations
   * @returns {Array} Performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const metrics = this.getMetrics();

    // Check error rate
    if (metrics.overall && metrics.overall.errorRate > this.options.errorRateThreshold) {
      recommendations.push({
        type: 'error_rate',
        severity: 'high',
        message: `Error rate is ${metrics.overall.errorRate.toFixed(2)}%, consider investigating failing endpoints`,
        action: 'Review error logs and fix failing endpoints'
      });
    }

    // Check slow requests
    if (metrics.overall && metrics.overall.slowRequestRate > 10) {
      recommendations.push({
        type: 'slow_requests',
        severity: 'medium',
        message: `${metrics.overall.slowRequestRate.toFixed(2)}% of requests are slow`,
        action: 'Optimize slow endpoints or increase server resources'
      });
    }

    // Check memory usage
    const systemMetrics = this.getSystemMetrics();
    if (systemMetrics.currentMemory.usage > this.options.memoryThreshold) {
      recommendations.push({
        type: 'memory_usage',
        severity: 'high',
        message: `Memory usage is ${systemMetrics.currentMemory.usage.toFixed(2)}%`,
        action: 'Investigate memory leaks or increase available memory'
      });
    }

    return recommendations;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    this.routeMetrics.clear();
    this.alerts.length = 0;
    
    this.systemMetrics = {
      startTime: Date.now(),
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      memoryUsage: [],
      cpuUsage: []
    };

    logger.info('Performance monitor cleared', {
      component: 'performance-monitor'
    });
  }

  /**
   * Shutdown performance monitor
   */
  shutdown() {
    this.stopSystemMonitoring();
    this.clear();
    
    logger.info('Performance monitor shutdown', {
      component: 'performance-monitor'
    });
  }
}

export default PerformanceMonitor;