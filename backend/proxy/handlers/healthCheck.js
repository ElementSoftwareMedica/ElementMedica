/**
 * Health Check avanzato per il proxy server
 * Verifica stato di API, DB, servizi esterni e metriche di sistema
 */

import axios from 'axios';
// Rimosso import statico di PrismaClient: uso import dinamico dentro checkDatabase
import { logger } from '../../utils/logger.js';
import { createDebugLogger } from '../middleware/logging.js';

const debugHealth = createDebugLogger('health');
// Rimosso import/istanza Prisma a livello modulo per evitare crash

/**
 * Configurazione dei servizi da monitorare
 */
const SERVICES_CONFIG = {
  apiServer: {
    name: 'API Server',
    url: process.env.API_SERVER_URL || 'http://localhost:4001',
    healthEndpoint: '/health',
    timeout: 5000,
    critical: true
  },
  
  documentsServer: {
    name: 'Documents Server',
    url: process.env.DOCUMENTS_SERVER_URL || 'http://localhost:4002',
    healthEndpoint: '/health',
    timeout: 5000,
    critical: false
  },
  
  frontend: {
    name: 'Frontend',
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    healthEndpoint: '/',
    timeout: 3000,
    critical: false
  }
};

/**
 * Verifica connessione al database
 * - Import dinamico di @prisma/client
 * - In assenza di client generato o modulo non trovato, lo stato è "skipped"
 * @returns {Promise<Object>} Risultato del check
 */
async function checkDatabase() {
  const startTime = Date.now();
  let prisma = null;
  
  try {
    // Import dinamico per evitare crash se @prisma/client non è disponibile/generato
    const prismaModule = await import('@prisma/client');
    const { PrismaClient } = prismaModule;
    prisma = new PrismaClient();
    await prisma.$connect();
    
    // Test connessione con query semplice
    await prisma.$queryRaw`SELECT 1 as test`;
    
    // Test performance con conteggio tabelle (compatibile PostgreSQL)
    const tableCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    `;
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      details: {
        connected: true,
        tablesCount: parseInt(tableCount[0]?.count || 0),
        performance: responseTime < 1000 ? 'good' : responseTime < 3000 ? 'fair' : 'poor'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Se il modulo Prisma non è disponibile o non è stato generato, non fallire l'intero health
    const msg = String(error?.message || 'Unknown error');
    const isPrismaMissing = msg.includes('Cannot find module') || msg.includes('@prisma/client did not initialize') || msg.includes('PrismaClientInitializationError');
    if (isPrismaMissing) {
      if (process.env.DEBUG_HEALTH || process.env.DEBUG_ALL) {
        debugHealth('Database check skipped: Prisma unavailable', { message: msg });
      }
      return {
        status: 'skipped',
        responseTime,
        details: {
          connected: false,
          reason: 'prisma-unavailable'
        }
      };
    }
    
    logger.error('Database health check failed', {
      service: 'proxy-server',
      component: 'health-check',
      error: error.message,
      responseTime
    });
    
    return {
      status: 'unhealthy',
      responseTime,
      error: error.message,
      details: {
        connected: false,
        errorCode: error.code
      }
    };
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch (_) {}
    }
  }
}

/**
 * Verifica stato di un servizio esterno
 * @param {string} serviceKey - Chiave del servizio
 * @param {Object} config - Configurazione del servizio
 * @returns {Promise<Object>} Risultato del check
 */
async function checkExternalService(serviceKey, config) {
  const startTime = Date.now();
  const url = `${config.url}${config.healthEndpoint}`;
  
  try {
    const response = await axios.get(url, {
      timeout: config.timeout,
      validateStatus: (status) => status < 500 // Accetta anche 4xx
    });
    
    const responseTime = Date.now() - startTime;
    const isHealthy = response.status >= 200 && response.status < 400;
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      responseTime,
      details: {
        url,
        statusCode: response.status,
        headers: {
          'content-type': response.headers['content-type'],
          'content-length': response.headers['content-length']
        },
        performance: responseTime < 1000 ? 'good' : responseTime < 3000 ? 'fair' : 'poor'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.warn(`External service ${config.name} health check failed`, {
      service: 'proxy-server',
      component: 'health-check',
      targetService: serviceKey,
      url,
      error: error.message,
      responseTime
    });
    
    return {
      status: 'unhealthy',
      responseTime,
      error: error.message,
      details: {
        url,
        errorCode: error.code,
        timeout: error.code === 'ECONNABORTED'
      }
    };
  }
}

/**
 * Verifica metriche di sistema
 * @returns {Object} Metriche di sistema
 */
function checkSystemMetrics() {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  const cpuUsage = process.cpuUsage();
  
  // Converti bytes in MB
  const memoryMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  // Calcola percentuale heap utilizzato
  const heapUsagePercent = Math.round((memoryMB.heapUsed / memoryMB.heapTotal) * 100);
  
  // Determina stato della memoria
  const memoryStatus = heapUsagePercent < 70 ? 'good' : heapUsagePercent < 85 ? 'warning' : 'critical';
  
  return {
    status: memoryStatus === 'critical' ? 'degraded' : 'healthy',
    details: {
      uptime: {
        seconds: Math.round(uptime),
        human: formatUptime(uptime)
      },
      memory: {
        ...memoryMB,
        heapUsagePercent,
        status: memoryStatus
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000), // Converti in ms
        system: Math.round(cpuUsage.system / 1000)
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
}

/**
 * Formatta uptime in formato leggibile
 * @param {number} seconds - Secondi di uptime
 * @returns {string} Uptime formattato
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Verifica configurazione dell'ambiente
 * @returns {Object} Stato della configurazione
 */
function checkEnvironmentConfig() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY'
  ];
  
  const optionalEnvVars = [
    'API_SERVER_URL',
    'DOCUMENTS_SERVER_URL',
    'FRONTEND_URL',
    'PROXY_PORT',
    'NODE_ENV'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  const present = requiredEnvVars.filter(varName => !!process.env[varName]);
  const optional = optionalEnvVars.filter(varName => !!process.env[varName]);
  
  return {
    status: missing.length === 0 ? 'healthy' : 'unhealthy',
    details: {
      required: {
        present: present.length,
        missing: missing.length,
        missingVars: missing
      },
      optional: {
        present: optional.length,
        total: optionalEnvVars.length,
        presentVars: optional
      },
      environment: process.env.NODE_ENV || 'development'
    }
  };
}

/**
 * Esegue health check completo
 * @param {Object} options - Opzioni per il check
 * @returns {Promise<Object>} Risultato completo del health check
 */
export async function performHealthCheck(options = {}) {
  const {
    includeServices = true,
    includeDatabase = true,
    includeSystem = true,
    includeEnvironment = true,
    timeout = 10000
  } = options;
  
  const startTime = Date.now();
  const results = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };
  
  try {
    // Promise per timeout globale
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeout);
    });
    
    // Array di check da eseguire
    const checks = [];
    
    // Check database
    if (includeDatabase) {
      checks.push(
        checkDatabase().then(result => ({ key: 'database', result }))
      );
    }
    
    // Check servizi esterni
    if (includeServices) {
      Object.entries(SERVICES_CONFIG).forEach(([key, config]) => {
        checks.push(
          checkExternalService(key, config).then(result => ({ key, result }))
        );
      });
    }
    
    // Esegui tutti i check asincroni
    const asyncResults = await Promise.race([
      Promise.allSettled(checks),
      timeoutPromise
    ]);
    
    // Processa risultati asincroni
    asyncResults.forEach(({ status, value, reason }) => {
      if (status === 'fulfilled' && value) {
        results.checks[value.key] = value.result;
        
        // Aggiorna stato globale
        if (value.result.status === 'unhealthy') {
          const config = SERVICES_CONFIG[value.key];
          if (config?.critical || value.key === 'database') {
            results.status = 'unhealthy';
          } else if (results.status === 'healthy') {
            results.status = 'degraded';
          }
        } else if (value.result.status === 'degraded' && results.status === 'healthy') {
          results.status = 'degraded';
        } else if (value.result.status === 'skipped') {
          // Non modifica lo stato globale; utile per ambienti senza Prisma
        }
      } else if (status === 'rejected') {
        logger.error('Health check failed', {
          service: 'proxy-server',
          component: 'health-check',
          error: reason?.message || 'Unknown error'
        });
      }
    });
    
    // Check sincroni
    if (includeSystem) {
      results.checks.system = checkSystemMetrics();
      if (results.checks.system.status === 'degraded' && results.status === 'healthy') {
        results.status = 'degraded';
      }
    }
    
    if (includeEnvironment) {
      results.checks.environment = checkEnvironmentConfig();
      if (results.checks.environment.status === 'unhealthy') {
        results.status = 'unhealthy';
      }
    }
    
  } catch (error) {
    logger.error('Health check error', {
      service: 'proxy-server',
      component: 'health-check',
      error: error.message
    });
    
    results.status = 'unhealthy';
    results.error = error.message;
  }
  
  // Aggiungi metriche di performance
  results.responseTime = Date.now() - startTime;
  results.summary = {
    total: Object.keys(results.checks).length,
    healthy: Object.values(results.checks).filter(c => c.status === 'healthy').length,
    degraded: Object.values(results.checks).filter(c => c.status === 'degraded').length,
    unhealthy: Object.values(results.checks).filter(c => c.status === 'unhealthy').length,
    skipped: Object.values(results.checks).filter(c => c.status === 'skipped').length
  };
  
  // Log risultato
  if (process.env.DEBUG_HEALTH || process.env.DEBUG_ALL) {
    debugHealth('Health check completed:', {
      status: results.status,
      responseTime: results.responseTime,
      summary: results.summary
    });
  }
  
  return results;
}

/**
 * Handler Express per endpoint /health
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function healthHandler(req, res) {
  try {
    const options = {
      includeServices: req.query.services !== 'false',
      includeDatabase: req.query.database !== 'false',
      includeSystem: req.query.system !== 'false',
      includeEnvironment: req.query.environment !== 'false',
      timeout: parseInt(req.query.timeout) || 10000
    };
    
    const healthResult = await performHealthCheck(options);
    
    // Determina status code HTTP
    let statusCode = 200;
    switch (healthResult.status) {
      case 'healthy':
        statusCode = 200;
        break;
      case 'degraded':
        statusCode = 200; // Ancora funzionante ma con problemi
        break;
      case 'unhealthy':
        statusCode = 503; // Service Unavailable
        break;
    }
    
    res.status(statusCode).json(healthResult);
    
  } catch (error) {
    logger.error('Health endpoint error', {
      service: 'proxy-server',
      component: 'health-endpoint',
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handler Express per endpoint /healthz (Kubernetes style)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function healthzHandler(req, res) {
  try {
    // Liveness probe puro: se il processo risponde, è vivo
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Healthz endpoint error', {
      service: 'proxy-server',
      component: 'healthz-endpoint',
      error: error.message
    });
    
    res.status(503).send('Error');
  }
}

/**
 * Handler Express per endpoint /ready (readiness probe)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function readinessHandler(req, res) {
  try {
    // Verifica solo servizi critici per readiness
    const result = await performHealthCheck({
      includeServices: true,
      includeDatabase: true,
      includeSystem: false,
      includeEnvironment: true,
      timeout: 5000
    });
    
    // Ready solo se tutti i servizi critici sono healthy
    const criticalServices = ['database', 'apiServer'];
    const criticalHealthy = criticalServices.every(service => 
      result.checks[service]?.status === 'healthy'
    );
    
    if (!criticalHealthy) {
      return res.status(503).json({
        ready: false,
        reason: 'Critical services not ready',
        checks: result.checks
      });
    }
    
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Readiness endpoint error', {
      service: 'proxy-server',
      component: 'readiness-endpoint',
      error: error.message
    });
    
    res.status(503).json({
      ready: false,
      error: error.message
    });
  }
}

export default {
  performHealthCheck,
  healthHandler,
  healthzHandler,
  readinessHandler
};