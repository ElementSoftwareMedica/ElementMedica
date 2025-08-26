/**
 * Database Monitoring Module
 * Provides comprehensive database performance monitoring and analytics
 */

import { getDatabaseConfig } from '../config/database-config.js';
import { logger } from '../utils/logger.js';
import EventEmitter from 'events';

/**
 * Database Performance Monitor Class
 * Tracks and analyzes database performance metrics
 */
export class DatabaseMonitor extends EventEmitter {
  constructor(environment = null) {
    super();
    
    this.environment = environment || process.env.NODE_ENV || 'development';
    this.config = getDatabaseConfig(this.environment).monitoring;
    this.metrics = {
      queries: {
        total: 0,
        slow: 0,
        failed: 0,
        byModel: new Map(),
        byAction: new Map(),
        averageDuration: 0,
        totalDuration: 0
      },
      connections: {
        active: 0,
        idle: 0,
        total: 0,
        peak: 0
      },
      performance: {
        slowQueries: [],
        errorRates: [],
        throughput: [],
        responseTime: []
      },
      system: {
        cpuUsage: [],
        memoryUsage: [],
        diskUsage: null,
        lastUpdated: null
      }
    };
    this.intervals = new Map();
    this.isMonitoring = false;
    this.alertThresholds = this.config.alerting?.thresholds || {};
  }

  /**
   * Start monitoring
   * @param {object} databaseManager - Database manager instance
   * @returns {DatabaseMonitor} Monitor instance
   */
  start(databaseManager) {
    if (!this.config.enabled) {
      logger.info('Database monitoring disabled', {
        component: 'database-monitor'
      });
      return this;
    }

    this.databaseManager = databaseManager;
    this.isMonitoring = true;

    // Setup event listeners for database manager
    this.setupEventListeners();

    // Start metric collection intervals
    this.startMetricCollection();

    // Start alerting if enabled
    if (this.config.alerting?.enabled) {
      this.startAlerting();
    }

    logger.info('Database monitoring started', {
      environment: this.environment,
      metrics: Object.keys(this.config.metrics).filter(key => this.config.metrics[key]),
      alerting: this.config.alerting?.enabled || false,
      component: 'database-monitor'
    });

    return this;
  }

  /**
   * Setup event listeners for database events
   */
  setupEventListeners() {
    if (!this.databaseManager) return;

    // Listen to slow queries
    this.databaseManager.on('slowQuery', (data) => {
      this.recordSlowQuery(data);
    });

    // Listen to operation completions
    this.databaseManager.on('operationCompleted', (data) => {
      this.recordOperation(data);
    });

    // Listen to errors
    this.databaseManager.on('error', (data) => {
      this.recordError(data);
    });

    // Listen to health check results
    this.databaseManager.on('healthCheckCompleted', (results) => {
      this.recordHealthCheck(results);
    });
  }

  /**
   * Start metric collection intervals
   */
  startMetricCollection() {
    // Collect connection metrics every 30 seconds
    if (this.config.metrics.connectionPool) {
      const connectionInterval = setInterval(async () => {
        await this.collectConnectionMetrics();
      }, 30000);
      this.intervals.set('connections', connectionInterval);
    }

    // Collect system metrics every minute
    if (this.config.metrics.diskUsage || this.config.metrics.replicationLag) {
      const systemInterval = setInterval(async () => {
        await this.collectSystemMetrics();
      }, 60000);
      this.intervals.set('system', systemInterval);
    }

    // Calculate performance metrics every 5 minutes
    const performanceInterval = setInterval(() => {
      this.calculatePerformanceMetrics();
    }, 300000);
    this.intervals.set('performance', performanceInterval);
  }

  /**
   * Record slow query
   * @param {object} data - Slow query data
   */
  recordSlowQuery(data) {
    if (!this.config.metrics.slowQueries) return;

    this.metrics.queries.slow++;
    
    const slowQuery = {
      ...data,
      timestamp: new Date().toISOString()
    };

    this.metrics.performance.slowQueries.push(slowQuery);
    
    // Keep only last 100 slow queries
    if (this.metrics.performance.slowQueries.length > 100) {
      this.metrics.performance.slowQueries.shift();
    }

    // Check alert thresholds
    if (this.alertThresholds.slowQueryMs && data.duration > this.alertThresholds.slowQueryMs) {
      this.emit('alert', {
        type: 'slow_query',
        severity: 'warning',
        message: `Very slow query detected: ${data.duration}ms`,
        data: slowQuery
      });
    }

    logger.debug('Slow query recorded', {
      client: data.client,
      duration: data.duration,
      component: 'database-monitor'
    });
  }

  /**
   * Record database operation
   * @param {object} data - Operation data
   */
  recordOperation(data) {
    if (!this.config.metrics.queryPerformance) return;

    this.metrics.queries.total++;
    this.metrics.queries.totalDuration += data.duration;
    this.metrics.queries.averageDuration = this.metrics.queries.totalDuration / this.metrics.queries.total;

    // Track by model
    if (data.model) {
      const modelCount = this.metrics.queries.byModel.get(data.model) || 0;
      this.metrics.queries.byModel.set(data.model, modelCount + 1);
    }

    // Track by action
    if (data.action) {
      const actionCount = this.metrics.queries.byAction.get(data.action) || 0;
      this.metrics.queries.byAction.set(data.action, actionCount + 1);
    }

    // Record response time for throughput calculation
    this.metrics.performance.responseTime.push({
      duration: data.duration,
      timestamp: Date.now()
    });

    // Keep only last 1000 response times
    if (this.metrics.performance.responseTime.length > 1000) {
      this.metrics.performance.responseTime.shift();
    }
  }

  /**
   * Record database error
   * @param {object} data - Error data
   */
  recordError(data) {
    if (!this.config.metrics.errorRates) return;

    this.metrics.queries.failed++;
    
    const errorRecord = {
      ...data,
      timestamp: new Date().toISOString()
    };

    this.metrics.performance.errorRates.push(errorRecord);
    
    // Keep only last 100 errors
    if (this.metrics.performance.errorRates.length > 100) {
      this.metrics.performance.errorRates.shift();
    }

    // Check error rate threshold
    const errorRate = this.calculateErrorRate();
    if (this.alertThresholds.errorRate && errorRate > this.alertThresholds.errorRate) {
      this.emit('alert', {
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
        data: { errorRate, recentErrors: this.metrics.performance.errorRates.slice(-10) }
      });
    }

    logger.debug('Database error recorded', {
      client: data.client,
      error: data.error?.message,
      component: 'database-monitor'
    });
  }

  /**
   * Record health check results
   * @param {object} results - Health check results
   */
  recordHealthCheck(results) {
    const healthyClients = Object.values(results).filter(r => r.status === 'healthy').length;
    const totalClients = Object.keys(results).length;
    
    if (healthyClients < totalClients) {
      this.emit('alert', {
        type: 'health_check_failed',
        severity: 'critical',
        message: `${totalClients - healthyClients} database client(s) unhealthy`,
        data: results
      });
    }

    logger.debug('Health check results recorded', {
      healthy: healthyClients,
      total: totalClients,
      component: 'database-monitor'
    });
  }

  /**
   * Collect connection pool metrics
   * @returns {Promise<void>}
   */
  async collectConnectionMetrics() {
    try {
      const client = this.databaseManager?.getPrimaryClient();
      if (!client) return;

      // Get connection info from database
      const connectionInfo = await client.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      if (connectionInfo && connectionInfo[0]) {
        const info = connectionInfo[0];
        this.metrics.connections = {
          active: parseInt(info.active_connections) || 0,
          idle: parseInt(info.idle_connections) || 0,
          total: parseInt(info.total_connections) || 0,
          peak: Math.max(this.metrics.connections.peak, parseInt(info.total_connections) || 0)
        };

        // Check connection pool utilization
        const utilization = this.metrics.connections.total / (this.alertThresholds.maxConnections || 100);
        if (this.alertThresholds.connectionPoolUtilization && utilization > this.alertThresholds.connectionPoolUtilization) {
          this.emit('alert', {
            type: 'high_connection_usage',
            severity: 'warning',
            message: `High connection pool utilization: ${(utilization * 100).toFixed(1)}%`,
            data: this.metrics.connections
          });
        }
      }
    } catch (error) {
      logger.error('Failed to collect connection metrics:', {
        error: error.message,
        component: 'database-monitor'
      });
    }
  }

  /**
   * Collect system metrics
   * @returns {Promise<void>}
   */
  async collectSystemMetrics() {
    try {
      const client = this.databaseManager?.getPrimaryClient();
      if (!client) return;

      // Collect disk usage if enabled
      if (this.config.metrics.diskUsage) {
        const diskInfo = await client.$queryRaw`
          SELECT 
            pg_size_pretty(pg_database_size(current_database())) as database_size,
            pg_database_size(current_database()) as database_size_bytes
        `;

        if (diskInfo && diskInfo[0]) {
          this.metrics.system.diskUsage = {
            size: diskInfo[0].database_size,
            sizeBytes: parseInt(diskInfo[0].database_size_bytes),
            timestamp: new Date().toISOString()
          };
        }
      }

      // Collect replication lag if enabled
      if (this.config.metrics.replicationLag) {
        try {
          const replicationInfo = await client.$queryRaw`
            SELECT 
              client_addr,
              state,
              pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) as lag_bytes
            FROM pg_stat_replication
          `;

          this.metrics.system.replicationLag = replicationInfo;
        } catch (error) {
          // Replication info might not be available in all setups
          logger.debug('Replication info not available:', {
            error: error.message,
            component: 'database-monitor'
          });
        }
      }

      this.metrics.system.lastUpdated = new Date().toISOString();
    } catch (error) {
      logger.error('Failed to collect system metrics:', {
        error: error.message,
        component: 'database-monitor'
      });
    }
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics() {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    // Calculate throughput (queries per minute)
    const recentResponses = this.metrics.performance.responseTime.filter(
      r => r.timestamp > fiveMinutesAgo
    );
    
    const throughput = recentResponses.length / 5; // queries per minute
    this.metrics.performance.throughput.push({
      value: throughput,
      timestamp: now
    });

    // Keep only last 24 hours of throughput data
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    this.metrics.performance.throughput = this.metrics.performance.throughput.filter(
      t => t.timestamp > oneDayAgo
    );

    logger.debug('Performance metrics calculated', {
      throughput: throughput.toFixed(2),
      recentQueries: recentResponses.length,
      component: 'database-monitor'
    });
  }

  /**
   * Calculate current error rate
   * @returns {number} Error rate (0-1)
   */
  calculateErrorRate() {
    const totalQueries = this.metrics.queries.total;
    const failedQueries = this.metrics.queries.failed;
    
    if (totalQueries === 0) return 0;
    return failedQueries / totalQueries;
  }

  /**
   * Start alerting system
   */
  startAlerting() {
    this.on('alert', (alert) => {
      this.handleAlert(alert);
    });

    logger.info('Database alerting system started', {
      thresholds: this.alertThresholds,
      component: 'database-monitor'
    });
  }

  /**
   * Handle alert
   * @param {object} alert - Alert data
   */
  handleAlert(alert) {
    logger.warn('Database alert triggered', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      component: 'database-alert'
    });

    // Here you would implement actual alerting mechanisms
    // such as sending emails, Slack notifications, etc.
    
    // For now, just emit the alert for external handling
    this.emit('alertTriggered', alert);
  }

  /**
   * Get current metrics
   * @returns {object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      calculated: {
        errorRate: this.calculateErrorRate(),
        queriesPerSecond: this.metrics.queries.total / (Date.now() / 1000),
        averageResponseTime: this.metrics.queries.averageDuration,
        connectionUtilization: this.metrics.connections.total / (this.alertThresholds.maxConnections || 100)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get performance summary
   * @returns {object} Performance summary
   */
  getPerformanceSummary() {
    const metrics = this.getMetrics();
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Recent throughput (last hour)
    const recentThroughput = this.metrics.performance.throughput.filter(
      t => t.timestamp > oneHourAgo
    );
    
    const avgThroughput = recentThroughput.length > 0 
      ? recentThroughput.reduce((sum, t) => sum + t.value, 0) / recentThroughput.length
      : 0;

    // Recent slow queries (last hour)
    const recentSlowQueries = this.metrics.performance.slowQueries.filter(
      q => new Date(q.timestamp).getTime() > oneHourAgo
    );

    return {
      overview: {
        totalQueries: metrics.queries.total,
        slowQueries: metrics.queries.slow,
        failedQueries: metrics.queries.failed,
        errorRate: metrics.calculated.errorRate,
        averageResponseTime: metrics.calculated.averageResponseTime
      },
      connections: metrics.connections,
      performance: {
        averageThroughput: avgThroughput,
        recentSlowQueries: recentSlowQueries.length,
        peakConnections: metrics.connections.peak
      },
      topModels: Array.from(metrics.queries.byModel.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      topActions: Array.from(metrics.queries.byAction.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      system: metrics.system,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      queries: {
        total: 0,
        slow: 0,
        failed: 0,
        byModel: new Map(),
        byAction: new Map(),
        averageDuration: 0,
        totalDuration: 0
      },
      connections: {
        active: 0,
        idle: 0,
        total: 0,
        peak: 0
      },
      performance: {
        slowQueries: [],
        errorRates: [],
        throughput: [],
        responseTime: []
      },
      system: {
        cpuUsage: [],
        memoryUsage: [],
        diskUsage: null,
        lastUpdated: null
      }
    };

    logger.info('Database metrics reset', {
      component: 'database-monitor'
    });
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isMonitoring = false;

    // Clear all intervals
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      logger.debug(`Stopped monitoring interval: ${name}`, {
        component: 'database-monitor'
      });
    }
    this.intervals.clear();

    // Remove event listeners
    this.removeAllListeners();

    logger.info('Database monitoring stopped', {
      component: 'database-monitor'
    });
  }

  /**
   * Get monitor status
   * @returns {object} Monitor status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      environment: this.environment,
      enabled: this.config.enabled,
      metrics: Object.keys(this.config.metrics).filter(key => this.config.metrics[key]),
      alerting: this.config.alerting?.enabled || false,
      intervals: Array.from(this.intervals.keys()),
      alertThresholds: this.alertThresholds
    };
  }
}

/**
 * Create database monitor instance
 * @param {string} environment - Target environment
 * @returns {DatabaseMonitor} Monitor instance
 */
export const createDatabaseMonitor = (environment = null) => {
  return new DatabaseMonitor(environment);
};

export default {
  DatabaseMonitor,
  createDatabaseMonitor
};