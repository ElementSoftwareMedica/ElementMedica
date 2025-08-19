/**
 * Logging condizionale con debug flags
 * Elimina console.log fissi e implementa logging strutturato
 */

import debug from 'debug';
import { logger } from '../../utils/logger.js';

// Debug namespaces per diverse aree del sistema
const debugProxy = debug('proxy:middleware');
const debugCors = debug('proxy:cors');
const debugAuth = debug('proxy:auth');
const debugRateLimit = debug('proxy:ratelimit');
const debugPath = debug('proxy:path');
const debugHeaders = debug('proxy:headers');
const debugPerformance = debug('proxy:performance');

/**
 * Crea logger debug per namespace specifico
 * @param {string} namespace - Namespace per il debug
 * @returns {Function} Debug logger function
 */
export function createDebugLogger(namespace) {
  return debug(`proxy:${namespace}`);
}

/**
 * Middleware per logging condizionale delle richieste
 * @param {string} namespace - Namespace per il logging
 * @returns {Function} Express middleware
 */
export function logProxyRequest(namespace = 'general') {
  const debugLog = createDebugLogger(namespace);
  
  return (req, res, next) => {
    // Logging solo se debug attivo
    if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
      debugLog('Request:', {
        method: req.method,
        url: req.url,
        path: req.path,
        originalUrl: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        headers: process.env.DEBUG_HEADERS ? req.headers : undefined
      });
    }
    
    // Console.log condizionale per debug specifici
    if (process.env.DEBUG_PROXY && namespace !== 'general') {
      console.log(`🔍 [${namespace.toUpperCase()}] ${req.method} ${req.originalUrl}`);
    }
    
    next();
  };
}

/**
 * Middleware per logging delle risposte
 * @param {string} namespace - Namespace per il logging
 * @returns {Function} Express middleware
 */
export function logProxyResponse(namespace = 'general') {
  const debugLog = createDebugLogger(namespace);
  
  return (req, res, next) => {
    if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Override res.send
      res.send = function(data) {
        debugLog('Response:', {
          statusCode: res.statusCode,
          path: req.path,
          dataLength: data ? data.length : 0,
          contentType: res.get('Content-Type')
        });
        return originalSend.call(this, data);
      };
      
      // Override res.json
      res.json = function(data) {
        debugLog('JSON Response:', {
          statusCode: res.statusCode,
          path: req.path,
          dataSize: JSON.stringify(data).length
        });
        return originalJson.call(this, data);
      };
    }
    
    next();
  };
}

/**
 * Middleware per tracciamento path (solo se DEBUG_PATH attivo)
 * @returns {Function} Express middleware
 */
export function createPathTracker() {
  return (req, res, next) => {
    if (process.env.DEBUG_PATH) {
      console.log('🔍 [PATH TRACE]:', {
        method: req.method,
        url: req.url,
        path: req.path,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        params: req.params,
        query: Object.keys(req.query).length > 0 ? req.query : undefined
      });
    }
    next();
  };
}

/**
 * Middleware per tracciamento performance
 * @param {string} operation - Nome dell'operazione
 * @returns {Function} Express middleware
 */
export function createPerformanceTracker(operation = 'request') {
  return (req, res, next) => {
    if (process.env.DEBUG_PERFORMANCE || process.env.DEBUG_ALL) {
      const startTime = Date.now();
      
      // Override res.end per catturare il tempo di risposta
      const originalEnd = res.end;
      res.end = function(...args) {
        const duration = Date.now() - startTime;
        
        debugPerformance(`${operation} completed:`, {
          path: req.path,
          method: req.method,
          duration: `${duration}ms`,
          statusCode: res.statusCode
        });
        
        // Log performance warnings
        if (duration > 1000) {
          logger.warn('Slow request detected', {
            service: 'proxy-server',
            path: req.path,
            method: req.method,
            duration,
            operation
          });
        }
        
        return originalEnd.apply(this, args);
      };
    }
    
    next();
  };
}

/**
 * Logger specifico per middleware di autenticazione
 * @param {string} action - Azione di auth (login, verify, etc.)
 * @returns {Function} Express middleware
 */
export function createAuthLogger(action = 'auth') {
  return (req, res, next) => {
    if (process.env.DEBUG_AUTH || process.env.DEBUG_ALL) {
      debugAuth(`${action} request:`, {
        path: req.path,
        method: req.method,
        hasAuth: !!req.headers.authorization,
        hasTenantId: !!(req.headers['x-tenant-id'] || req.headers['X-Tenant-ID']),
        ip: req.ip
      });
      
      console.log(`🔐 [AUTH ${action.toUpperCase()}] ${req.method} ${req.originalUrl}`);
    }
    
    next();
  };
}

/**
 * Logger per middleware CORS
 * @param {string} endpoint - Nome dell'endpoint
 * @returns {Function} Express middleware
 */
export function createCorsLogger(endpoint = 'cors') {
  return (req, res, next) => {
    if (process.env.DEBUG_CORS || process.env.DEBUG_ALL) {
      if (req.method === 'OPTIONS') {
        debugCors(`CORS preflight for ${endpoint}:`, {
          origin: req.headers.origin,
          method: req.headers['access-control-request-method'],
          headers: req.headers['access-control-request-headers']
        });
        
        console.log(`🚨 [CORS ${endpoint.toUpperCase()}] OPTIONS ${req.originalUrl}`);
      }
    }
    
    next();
  };
}

/**
 * Logger per proxy middleware
 * @param {string} target - Target del proxy
 * @param {string} namespace - Namespace per il logging
 * @returns {Object} Oggetto con funzioni di logging per proxy
 */
export function createProxyLogger(target, namespace = 'proxy') {
  const debugLog = createDebugLogger(namespace);
  
  return {
    onProxyReq: (proxyReq, req, res) => {
      if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
        debugLog('Proxying request:', {
          originalPath: req.path,
          originalUrl: req.url,
          targetPath: proxyReq.path,
          fullTarget: `${target}${proxyReq.path}`,
          method: req.method
        });
        
        console.log(`🔄 [PROXY ${namespace.toUpperCase()}] ${req.method} ${req.originalUrl} → ${target}${proxyReq.path}`);
      }
      
      // Structured logging sempre attivo
      logger.info(`Proxying ${namespace} request`, {
        service: 'proxy-server',
        method: req.method,
        originalPath: req.path,
        originalUrl: req.url,
        targetPath: proxyReq.path,
        target
      });
    },
    
    onProxyRes: (proxyRes, req, res) => {
      if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
        debugLog('Proxy response:', {
          statusCode: proxyRes.statusCode,
          path: req.path,
          contentType: proxyRes.headers['content-type'],
          contentLength: proxyRes.headers['content-length']
        });
        
        console.log(`✅ [PROXY ${namespace.toUpperCase()}] ${proxyRes.statusCode} ${req.originalUrl}`);
      }
    },
    
    onError: (err, req, res) => {
      // Error logging sempre attivo
      logger.error(`Proxy error for ${namespace}`, {
        service: 'proxy-server',
        error: err.message,
        path: req.path,
        target,
        stack: err.stack
      });
      
      if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
        console.log(`❌ [PROXY ${namespace.toUpperCase()}] ERROR ${req.originalUrl}:`, err.message);
      }
    }
  };
}

/**
 * Middleware per logging condizionale generale
 * Sostituisce tutti i console.log fissi
 * @returns {Function} Express middleware
 */
export function createConditionalLogger() {
  return (req, res, next) => {
    // Solo logging se debug generale attivo
    if (process.env.DEBUG_ALL) {
      console.log(`📝 [REQUEST] ${req.method} ${req.originalUrl}`);
    }
    
    next();
  };
}

/**
 * Setup completo del logging per il proxy server
 * @param {Object} app - Express app instance
 */
export function setupLogging(app) {
  // Performance tracking globale
  if (process.env.DEBUG_PERFORMANCE || process.env.DEBUG_ALL) {
    app.use(createPerformanceTracker('global'));
  }
  
  // Path tracking se richiesto
  if (process.env.DEBUG_PATH) {
    app.use(createPathTracker());
  }
  
  // Logging condizionale generale
  app.use(createConditionalLogger());
  
  if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
    console.log('✅ Conditional logging configured:');
    console.log('   - DEBUG_PROXY:', !!process.env.DEBUG_PROXY);
    console.log('   - DEBUG_CORS:', !!process.env.DEBUG_CORS);
    console.log('   - DEBUG_AUTH:', !!process.env.DEBUG_AUTH);
    console.log('   - DEBUG_PATH:', !!process.env.DEBUG_PATH);
    console.log('   - DEBUG_PERFORMANCE:', !!process.env.DEBUG_PERFORMANCE);
    console.log('   - DEBUG_ALL:', !!process.env.DEBUG_ALL);
  }
}

/**
 * Ottieni stato del logging
 * @returns {Object} Stato corrente del logging
 */
export function getLoggingStatus() {
  return {
    debugFlags: {
      DEBUG_PROXY: !!process.env.DEBUG_PROXY,
      DEBUG_CORS: !!process.env.DEBUG_CORS,
      DEBUG_AUTH: !!process.env.DEBUG_AUTH,
      DEBUG_PATH: !!process.env.DEBUG_PATH,
      DEBUG_HEADERS: !!process.env.DEBUG_HEADERS,
      DEBUG_PERFORMANCE: !!process.env.DEBUG_PERFORMANCE,
      DEBUG_RATE_LIMIT: !!process.env.DEBUG_RATE_LIMIT,
      DEBUG_ALL: !!process.env.DEBUG_ALL
    },
    environment: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL || 'info'
  };
}

export default {
  createDebugLogger,
  logProxyRequest,
  logProxyResponse,
  createPathTracker,
  createPerformanceTracker,
  createAuthLogger,
  createCorsLogger,
  createProxyLogger,
  createConditionalLogger,
  setupLogging,
  getLoggingStatus
};