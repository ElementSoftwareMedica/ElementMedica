/**
 * Extended Health Check Configuration
 * Health check esteso per database, Redis, servizi esterni e sistema
 */

import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';
import os from 'os';
import fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Stati di salute
 */
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown'
};

/**
 * Livelli di criticità
 */
export const CRITICALITY = {
  CRITICAL: 'critical',    // Servizio non funziona senza
  HIGH: 'high',          // Funzionalità limitate
  MEDIUM: 'medium',      // Performance degradate
  LOW: 'low'             // Funzionalità opzionali
};

/**
 * Configurazioni health check
 */
export const HEALTH_CHECK_CONFIG = {
  timeout: 5000,           // Timeout per singolo check
  interval: 30000,         // Intervallo check automatici
  retries: 3,              // Tentativi per check falliti
  thresholds: {
    responseTime: 1000,    // Soglia response time (ms)
    memoryUsage: 0.95,     // Soglia utilizzo memoria (95%) - Aumentata per sviluppo
    diskUsage: 0.95,       // Soglia utilizzo disco (95%) - Aumentata per sviluppo
    cpuUsage: 0.90         // Soglia utilizzo CPU (90%) - Aumentata per sviluppo
  }
};

/**
 * Classe per gestire health checks
 */
export class HealthCheckManager {
  constructor(options = {}) {
    this.config = { ...HEALTH_CHECK_CONFIG, ...options };
    this.checks = new Map();
    this.results = new Map();
    this.intervalId = null;
    this.isRunning = false;
    
    // Registra check di sistema di default
    this.registerDefaultChecks();
    
    logger.info('Health Check Manager initialized', {
      service: 'health',
      config: this.config
    });
  }
  
  /**
   * Registra un health check
   */
  registerCheck(name, checkFunction, options = {}) {
    const checkConfig = {
      name,
      check: checkFunction,
      criticality: options.criticality || CRITICALITY.MEDIUM,
      timeout: options.timeout || this.config.timeout,
      retries: options.retries || this.config.retries,
      enabled: options.enabled !== false,
      tags: options.tags || [],
      description: options.description || `Health check for ${name}`
    };
    
    this.checks.set(name, checkConfig);
    
    logger.info('Health check registered', {
      service: 'health',
      checkName: name,
      criticality: checkConfig.criticality,
      enabled: checkConfig.enabled
    });
    
    return this;
  }
  
  /**
   * Registra check di sistema di default
   */
  registerDefaultChecks() {
    // Check memoria - Disabilitato temporaneamente per sviluppo
    this.registerCheck('memory', this.checkMemory.bind(this), {
      criticality: CRITICALITY.HIGH,
      description: 'System memory usage',
      enabled: false // Disabilitato per ambiente di sviluppo
    });
    
    // Check CPU
    this.registerCheck('cpu', this.checkCPU.bind(this), {
      criticality: CRITICALITY.MEDIUM,
      description: 'System CPU usage'
    });
    
    // Check disco
    this.registerCheck('disk', this.checkDisk.bind(this), {
      criticality: CRITICALITY.HIGH,
      description: 'System disk usage'
    });
    
    // Check uptime
    this.registerCheck('uptime', this.checkUptime.bind(this), {
      criticality: CRITICALITY.LOW,
      description: 'System uptime'
    });
  }
  
  /**
   * Esegue un singolo health check
   */
  async runCheck(name) {
    const checkConfig = this.checks.get(name);
    
    if (!checkConfig) {
      throw new Error(`Health check '${name}' not found`);
    }
    
    if (!checkConfig.enabled) {
      return {
        name,
        status: HEALTH_STATUS.UNKNOWN,
        message: 'Check disabled',
        timestamp: new Date().toISOString()
      };
    }
    
    const startTime = performance.now();
    let attempt = 0;
    
    while (attempt < checkConfig.retries) {
      try {
        const result = await Promise.race([
          checkConfig.check(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), checkConfig.timeout)
          )
        ]);
        
        const responseTime = performance.now() - startTime;
        
        const healthResult = {
          name,
          status: result.status || HEALTH_STATUS.HEALTHY,
          message: result.message || 'OK',
          responseTime: Math.round(responseTime),
          timestamp: new Date().toISOString(),
          attempt: attempt + 1,
          criticality: checkConfig.criticality,
          tags: checkConfig.tags,
          details: result.details || {}
        };
        
        // Verifica soglie
        if (responseTime > this.config.thresholds.responseTime) {
          healthResult.status = HEALTH_STATUS.DEGRADED;
          healthResult.message += ` (slow response: ${Math.round(responseTime)}ms)`;
        }
        
        this.results.set(name, healthResult);
        
        logger.debug('Health check completed', {
          service: 'health',
          checkName: name,
          status: healthResult.status,
          responseTime: healthResult.responseTime,
          attempt: attempt + 1
        });
        
        return healthResult;
        
      } catch (error) {
        attempt++;
        
        if (attempt >= checkConfig.retries) {
          const responseTime = performance.now() - startTime;
          
          const healthResult = {
            name,
            status: HEALTH_STATUS.UNHEALTHY,
            message: error.message,
            responseTime: Math.round(responseTime),
            timestamp: new Date().toISOString(),
            attempt,
            criticality: checkConfig.criticality,
            tags: checkConfig.tags,
            error: {
              message: error.message,
              stack: error.stack
            }
          };
          
          this.results.set(name, healthResult);
          
          logger.warn('Health check failed', {
            service: 'health',
            checkName: name,
            error: error.message,
            attempts: attempt
          });
          
          return healthResult;
        }
        
        // Attesa prima del retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  /**
   * Esegue tutti gli health checks
   */
  async runAllChecks() {
    const startTime = performance.now();
    const checkNames = Array.from(this.checks.keys());
    
    logger.info('Running all health checks', {
      service: 'health',
      totalChecks: checkNames.length
    });
    
    // Esegue i check in parallelo
    const results = await Promise.allSettled(
      checkNames.map(name => this.runCheck(name))
    );
    
    const healthResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: checkNames[index],
          status: HEALTH_STATUS.UNHEALTHY,
          message: result.reason.message,
          timestamp: new Date().toISOString(),
          error: result.reason
        };
      }
    });
    
    const totalTime = performance.now() - startTime;
    
    // Calcola stato generale
    const overallStatus = this.calculateOverallStatus(healthResults);
    
    const summary = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Math.round(totalTime),
      checks: healthResults,
      summary: this.generateSummary(healthResults)
    };
    
    logger.info('Health checks completed', {
      service: 'health',
      overallStatus,
      totalTime: Math.round(totalTime),
      totalChecks: healthResults.length,
      healthy: healthResults.filter(r => r.status === HEALTH_STATUS.HEALTHY).length,
      degraded: healthResults.filter(r => r.status === HEALTH_STATUS.DEGRADED).length,
      unhealthy: healthResults.filter(r => r.status === HEALTH_STATUS.UNHEALTHY).length
    });
    
    return summary;
  }
  
  /**
   * Calcola lo stato generale
   */
  calculateOverallStatus(results) {
    const criticalUnhealthy = results.some(r => 
      r.status === HEALTH_STATUS.UNHEALTHY && r.criticality === CRITICALITY.CRITICAL
    );
    
    if (criticalUnhealthy) {
      return HEALTH_STATUS.UNHEALTHY;
    }
    
    const hasUnhealthy = results.some(r => r.status === HEALTH_STATUS.UNHEALTHY);
    const hasDegraded = results.some(r => r.status === HEALTH_STATUS.DEGRADED);
    
    if (hasUnhealthy || hasDegraded) {
      return HEALTH_STATUS.DEGRADED;
    }
    
    return HEALTH_STATUS.HEALTHY;
  }
  
  /**
   * Genera summary dei risultati
   */
  generateSummary(results) {
    const summary = {
      total: results.length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
      byCategory: {},
      criticalIssues: []
    };
    
    results.forEach(result => {
      summary[result.status]++;
      
      // Raggruppa per criticità
      if (!summary.byCategory[result.criticality]) {
        summary.byCategory[result.criticality] = {
          total: 0,
          healthy: 0,
          degraded: 0,
          unhealthy: 0,
          unknown: 0
        };
      }
      
      summary.byCategory[result.criticality].total++;
      summary.byCategory[result.criticality][result.status]++;
      
      // Identifica problemi critici
      if (result.status === HEALTH_STATUS.UNHEALTHY && result.criticality === CRITICALITY.CRITICAL) {
        summary.criticalIssues.push({
          name: result.name,
          message: result.message,
          timestamp: result.timestamp
        });
      }
    });
    
    return summary;
  }
  
  /**
   * Check memoria sistema
   */
  async checkMemory() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercentage = usedMemory / totalMemory;
    
    const details = {
      total: Math.round(totalMemory / 1024 / 1024), // MB
      used: Math.round(usedMemory / 1024 / 1024),   // MB
      free: Math.round(freeMemory / 1024 / 1024),   // MB
      usagePercentage: Math.round(usagePercentage * 100)
    };
    
    let status = HEALTH_STATUS.HEALTHY;
    let message = `Memory usage: ${details.usagePercentage}%`;
    
    if (usagePercentage > this.config.thresholds.memoryUsage) {
      status = HEALTH_STATUS.UNHEALTHY;
      message = `High memory usage: ${details.usagePercentage}%`;
    } else if (usagePercentage > this.config.thresholds.memoryUsage * 0.8) {
      status = HEALTH_STATUS.DEGRADED;
      message = `Elevated memory usage: ${details.usagePercentage}%`;
    }
    
    return { status, message, details };
  }
  
  /**
   * Check CPU sistema
   */
  async checkCPU() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Calcola utilizzo CPU medio
    const cpuUsage = loadAvg[0] / cpus.length;
    
    const details = {
      cores: cpus.length,
      loadAverage: {
        '1min': Math.round(loadAvg[0] * 100) / 100,
        '5min': Math.round(loadAvg[1] * 100) / 100,
        '15min': Math.round(loadAvg[2] * 100) / 100
      },
      usagePercentage: Math.round(cpuUsage * 100)
    };
    
    let status = HEALTH_STATUS.HEALTHY;
    let message = `CPU usage: ${details.usagePercentage}%`;
    
    if (cpuUsage > this.config.thresholds.cpuUsage) {
      status = HEALTH_STATUS.UNHEALTHY;
      message = `High CPU usage: ${details.usagePercentage}%`;
    } else if (cpuUsage > this.config.thresholds.cpuUsage * 0.8) {
      status = HEALTH_STATUS.DEGRADED;
      message = `Elevated CPU usage: ${details.usagePercentage}%`;
    }
    
    return { status, message, details };
  }
  
  /**
   * Check spazio disco
   */
  async checkDisk() {
    try {
      const { stdout } = await execAsync('df -h /');
      const lines = stdout.trim().split('\n');
      const diskInfo = lines[1].split(/\s+/);
      
      const usageStr = diskInfo[4];
      const usagePercentage = parseInt(usageStr.replace('%', '')) / 100;
      
      const details = {
        filesystem: diskInfo[0],
        size: diskInfo[1],
        used: diskInfo[2],
        available: diskInfo[3],
        usagePercentage: Math.round(usagePercentage * 100),
        mountPoint: diskInfo[5]
      };
      
      let status = HEALTH_STATUS.HEALTHY;
      let message = `Disk usage: ${details.usagePercentage}%`;
      
      if (usagePercentage > this.config.thresholds.diskUsage) {
        status = HEALTH_STATUS.UNHEALTHY;
        message = `High disk usage: ${details.usagePercentage}%`;
      } else if (usagePercentage > this.config.thresholds.diskUsage * 0.9) {
        status = HEALTH_STATUS.DEGRADED;
        message = `Elevated disk usage: ${details.usagePercentage}%`;
      }
      
      return { status, message, details };
      
    } catch (error) {
      return {
        status: HEALTH_STATUS.UNKNOWN,
        message: `Cannot check disk usage: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
  
  /**
   * Check uptime sistema
   */
  async checkUptime() {
    const uptime = os.uptime();
    const processUptime = process.uptime();
    
    const details = {
      system: {
        seconds: Math.round(uptime),
        formatted: this.formatUptime(uptime)
      },
      process: {
        seconds: Math.round(processUptime),
        formatted: this.formatUptime(processUptime)
      }
    };
    
    return {
      status: HEALTH_STATUS.HEALTHY,
      message: `System uptime: ${details.system.formatted}, Process uptime: ${details.process.formatted}`,
      details
    };
  }
  
  /**
   * Formatta uptime in formato leggibile
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.length > 0 ? parts.join(' ') : '< 1m';
  }
  
  /**
   * Avvia monitoring automatico
   */
  startMonitoring() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    this.intervalId = setInterval(async () => {
      try {
        await this.runAllChecks();
      } catch (error) {
        logger.error('Health check monitoring error', {
          service: 'health',
          error: error.message
        });
      }
    }, this.config.interval);
    
    logger.info('Health check monitoring started', {
      service: 'health',
      interval: this.config.interval
    });
  }
  
  /**
   * Ferma monitoring automatico
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    
    logger.info('Health check monitoring stopped', {
      service: 'health'
    });
  }
  
  /**
   * Ottieni risultati cached
   */
  getCachedResults() {
    return Array.from(this.results.values());
  }
  
  /**
   * Ottieni configurazione
   */
  getConfig() {
    return { ...this.config };
  }
}

/**
 * Factory per creare health check per database
 */
export const createDatabaseHealthCheck = (dbClient, name = 'database') => {
  return async () => {
    const startTime = performance.now();
    
    try {
      // Test connessione con query semplice
      await dbClient.$queryRaw`SELECT 1`;
      
      const responseTime = performance.now() - startTime;
      
      return {
        status: HEALTH_STATUS.HEALTHY,
        message: 'Database connection OK',
        details: {
          responseTime: Math.round(responseTime),
          connection: 'active'
        }
      };
    } catch (error) {
      return {
        status: HEALTH_STATUS.UNHEALTHY,
        message: `Database connection failed: ${error.message}`,
        details: {
          error: error.message,
          connection: 'failed'
        }
      };
    }
  };
};

/**
 * Factory per creare health check per Redis
 */
export const createRedisHealthCheck = (redisClient, name = 'redis') => {
  return async () => {
    const startTime = performance.now();
    
    try {
      // Test connessione con ping
      const result = await redisClient.ping();
      
      const responseTime = performance.now() - startTime;
      
      return {
        status: result === 'PONG' ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNHEALTHY,
        message: result === 'PONG' ? 'Redis connection OK' : 'Redis ping failed',
        details: {
          responseTime: Math.round(responseTime),
          ping: result
        }
      };
    } catch (error) {
      return {
        status: HEALTH_STATUS.UNHEALTHY,
        message: `Redis connection failed: ${error.message}`,
        details: {
          error: error.message,
          connection: 'failed'
        }
      };
    }
  };
};

/**
 * Factory per creare health check per servizi esterni
 */
export const createExternalServiceHealthCheck = (url, name, options = {}) => {
  return async () => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        timeout: options.timeout || 5000,
        headers: options.headers || {}
      });
      
      const responseTime = performance.now() - startTime;
      
      const isHealthy = response.ok || (options.expectedStatus && response.status === options.expectedStatus);
      
      return {
        status: isHealthy ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNHEALTHY,
        message: isHealthy ? `${name} service OK` : `${name} service returned ${response.status}`,
        details: {
          responseTime: Math.round(responseTime),
          status: response.status,
          statusText: response.statusText,
          url
        }
      };
    } catch (error) {
      return {
        status: HEALTH_STATUS.UNHEALTHY,
        message: `${name} service failed: ${error.message}`,
        details: {
          error: error.message,
          url
        }
      };
    }
  };
};

/**
 * Istanza singleton del health check manager
 */
export const healthCheckManager = new HealthCheckManager();

export default {
  HealthCheckManager,
  healthCheckManager,
  createDatabaseHealthCheck,
  createRedisHealthCheck,
  createExternalServiceHealthCheck,
  HEALTH_STATUS,
  CRITICALITY,
  HEALTH_CHECK_CONFIG
};