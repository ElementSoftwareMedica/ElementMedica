/**
 * Health Check Service
 * Monitors the health of all services and dependencies
 */

import axios from 'axios';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import { getCircuitBreakerHealth } from '../middleware/circuit-breaker.js';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import os from 'os';

// Health check configuration
const HEALTH_CHECK_CONFIG = {
  timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000,
  interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
  retries: 3,
  retryDelay: 1000
};

// Service endpoints
const SERVICES = {
  'documents-server': {
    url: 'http://localhost:4002/health',
    name: 'Documents Server',
    critical: true
  },
  'proxy-server': {
    url: 'http://localhost:4003/health',
    name: 'Proxy Server',
    critical: false
  }
};

// Don't check self when running from API server
if (process.env.API_PORT !== '4001') {
  SERVICES['api-server'] = {
    url: 'http://localhost:4001/health',
    name: 'API Server',
    critical: true
  };
}

// Health status storage
let healthStatus = {
  status: 'unknown',
  timestamp: new Date().toISOString(),
  services: {},
  dependencies: {},
  system: {},
  uptime: process.uptime()
};

// Health check history
const healthHistory = [];
const MAX_HISTORY_SIZE = 100;

/**
 * Check individual service health
 */
async function checkServiceHealth(serviceKey, config) {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(config.url, {
      timeout: HEALTH_CHECK_CONFIG.timeout,
      validateStatus: (status) => status < 500
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      name: config.name,
      status: response.status === 200 ? 'healthy' : 'degraded',
      url: config.url,
      response_time: responseTime,
      last_check: new Date().toISOString(),
      critical: config.critical,
      details: response.data || {},
      error: null
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: config.name,
      status: 'unhealthy',
      url: config.url,
      response_time: responseTime,
      last_check: new Date().toISOString(),
      critical: config.critical,
      details: {},
      error: {
        message: error.message,
        code: error.code,
        status: error.response?.status
      }
    };
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  try {
    const prisma = new PrismaClient();
    
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    
    await prisma.$disconnect();
    
    return {
      name: 'PostgreSQL Database',
      status: 'healthy',
      response_time: responseTime,
      last_check: new Date().toISOString(),
      critical: true,
      error: null
    };
  } catch (error) {
    return {
      name: 'PostgreSQL Database',
      status: 'unhealthy',
      response_time: null,
      last_check: new Date().toISOString(),
      critical: true,
      error: {
        message: error.message,
        code: error.code
      }
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedisHealth() {
  if (process.env.REDIS_ENABLED === 'false') {
    return {
      name: 'Redis Cache',
      status: 'disabled',
      message: 'Redis is disabled in configuration',
      response_time: 0,
      last_check: new Date().toISOString(),
      critical: false,
      error: null
    };
  }
  
  try {
    const redis = new Redis(process.env.REDIS_URL);
    
    const startTime = Date.now();
    await redis.ping();
    const responseTime = Date.now() - startTime;
    
    await redis.disconnect();
    
    return {
      name: 'Redis Cache',
      status: 'healthy',
      response_time: responseTime,
      last_check: new Date().toISOString(),
      critical: false,
      error: null
    };
  } catch (error) {
    return {
      name: 'Redis Cache',
      status: 'unhealthy',
      response_time: null,
      last_check: new Date().toISOString(),
      critical: false,
      error: {
        message: error.message,
        code: error.code
      }
    };
  }
}

/**
 * Check system resources
 */
function checkSystemHealth() {
 const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  const cpuUsage = os.loadavg();
  const cpuCount = os.cpus().length;
  
  return {
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      usage_percentage: Math.round((usedMemory / totalMemory) * 100),
      process: {
        rss: memoryUsage.rss,
        heap_total: memoryUsage.heapTotal,
        heap_used: memoryUsage.heapUsed,
        external: memoryUsage.external
      }
    },
    cpu: {
      count: cpuCount,
      load_average: {
        '1m': cpuUsage[0],
        '5m': cpuUsage[1],
        '15m': cpuUsage[2]
      },
      usage_percentage: Math.round((cpuUsage[0] / cpuCount) * 100)
    },
    uptime: {
      process: process.uptime(),
      system: os.uptime()
    },
    platform: os.platform(),
    arch: os.arch(),
    node_version: process.version
  };
}

/**
 * Perform comprehensive health check
 */
async function performHealthCheck() {
  const startTime = Date.now();
  
  try {
    logger.debug('Starting health check');
    
    // Check all services in parallel
    const serviceChecks = Object.entries(SERVICES).map(async ([key, config]) => {
      const result = await checkServiceHealth(key, config);
      return [key, result];
    });
    
    // Check dependencies
    const dependencyChecks = [
      ['database', checkDatabaseHealth()],
      ['redis', checkRedisHealth()]
    ];
    
    // Wait for all checks to complete
    const [serviceResults, dependencyResults] = await Promise.all([
      Promise.all(serviceChecks),
      Promise.all(dependencyChecks.map(([key, promise]) => 
        promise.then(result => [key, result])
      ))
    ]);
    
    // Build health status
    const newHealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      check_duration: Date.now() - startTime,
      services: Object.fromEntries(serviceResults),
      dependencies: Object.fromEntries(dependencyResults),
      system: checkSystemHealth(),
      circuit_breakers: getCircuitBreakerHealth(),
      uptime: process.uptime()
    };
    
    // Determine overall status
    const allChecks = [...serviceResults, ...dependencyResults];
    const criticalFailures = allChecks.filter(([key, result]) => 
      result.critical && result.status === 'unhealthy'
    );
    
    const anyDegraded = allChecks.some(([key, result]) => 
      result.status === 'degraded'
    );
    
    if (criticalFailures.length > 0) {
      newHealthStatus.status = 'unhealthy';
    } else if (anyDegraded) {
      newHealthStatus.status = 'degraded';
    }
    
    // Update global health status
    healthStatus = newHealthStatus;
    
    // Add to history
    healthHistory.push({
      timestamp: newHealthStatus.timestamp,
      status: newHealthStatus.status,
      check_duration: newHealthStatus.check_duration,
      critical_failures: criticalFailures.length
    });
    
    // Trim history
    if (healthHistory.length > MAX_HISTORY_SIZE) {
      healthHistory.splice(0, healthHistory.length - MAX_HISTORY_SIZE);
    }
    
    logger.debug('Health check completed', {
      status: newHealthStatus.status,
      duration: newHealthStatus.check_duration,
      critical_failures: criticalFailures.length
    });
    
    return newHealthStatus;
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack
    });
    
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      check_duration: Date.now() - startTime,
      error: {
        message: error.message,
        stack: error.stack
      },
      uptime: process.uptime()
    };
    
    healthStatus = errorStatus;
    return errorStatus;
  }
}

/**
 * Get current health status
 */
function getHealthStatus() {
  return healthStatus;
}

/**
 * Get health history
 */
function getHealthHistory(limit = 50) {
  return healthHistory.slice(-limit);
}

/**
 * Start periodic health checks
 */
function startHealthChecks() {
  logger.info('Starting periodic health checks', {
    interval: HEALTH_CHECK_CONFIG.interval
  });
  
  // Delay initial check to allow server to fully start
  setTimeout(() => {
    performHealthCheck();
  }, 5000); // Wait 5 seconds before first check
  
  // Schedule periodic checks
  const interval = setInterval(performHealthCheck, HEALTH_CHECK_CONFIG.interval);
  
  // Cleanup on process exit
  process.on('SIGTERM', () => {
    clearInterval(interval);
  });
  
  process.on('SIGINT', () => {
    clearInterval(interval);
  });
  
  return interval;
}

/**
 * Express middleware for health endpoint
 */
function healthEndpoint(req, res) {
  const status = getHealthStatus();
  const httpStatus = status.status === 'healthy' ? 200 : 
                    status.status === 'degraded' ? 200 : 503;
  
  res.status(httpStatus).json(status);
}

/**
 * Express middleware for health history endpoint
 */
function healthHistoryEndpoint(req, res) {
  const limit = parseInt(req.query.limit) || 50;
  const history = getHealthHistory(limit);
  
  res.json({
    history,
    total_checks: healthHistory.length,
    limit
  });
}

export {
  performHealthCheck,
  getHealthStatus,
  getHealthHistory,
  startHealthChecks,
  healthEndpoint,
  healthHistoryEndpoint,
  checkServiceHealth,
  checkDatabaseHealth,
  checkRedisHealth,
  checkSystemHealth
};