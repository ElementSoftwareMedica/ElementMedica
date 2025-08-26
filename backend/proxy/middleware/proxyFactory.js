/**
 * Factory functions per proxy middleware
 * Centralizza la creazione e configurazione dei proxy con gestione errori unificata
 */

import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../../utils/logger.js';
import { createProxyLogger } from './logging.js';

/**
 * Configurazioni predefinite per diversi tipi di proxy
 */
const PROXY_DEFAULTS = {
  // Configurazione base per API
  api: {
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    timeout: 30000,
    proxyTimeout: 30000,
    headers: {
      'Connection': 'keep-alive'
    }
  },
  
  // Configurazione per servizi di documenti
  documents: {
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    timeout: 60000, // Timeout più lungo per documenti
    proxyTimeout: 60000,
    headers: {
      'Connection': 'keep-alive'
    }
  },
  
  // Configurazione per servizi di autenticazione
  auth: {
    changeOrigin: true,
    secure: false,
    followRedirects: false, // Non seguire redirect per auth
    timeout: 15000, // Timeout più breve per auth
    proxyTimeout: 15000,
    headers: {
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    }
  },
  
  // Configurazione per health checks
  health: {
    changeOrigin: true,
    secure: false,
    followRedirects: false,
    timeout: 5000, // Timeout molto breve per health
    proxyTimeout: 5000,
    headers: {
      'Connection': 'close' // Non mantenere connessione per health
    }
  }
};

/**
 * Crea gestori di errore standardizzati per proxy
 * @param {string} serviceName - Nome del servizio
 * @param {string} target - Target del proxy
 * @returns {Object} Oggetto con gestori di errore
 */
function createErrorHandlers(serviceName, target) {
  return {
    onError: (err, req, res) => {
      const errorInfo = {
        service: 'proxy-server',
        proxyService: serviceName,
        error: err.message,
        code: err.code,
        target,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };
      
      // Log strutturato sempre attivo
      logger.error(`Proxy error for ${serviceName}`, errorInfo);
      
      // Determina il tipo di errore e la risposta appropriata
      let statusCode = 502; // Bad Gateway default
      let errorMessage = 'Service temporarily unavailable';
      
      switch (err.code) {
        case 'ECONNREFUSED':
          statusCode = 503; // Service Unavailable
          errorMessage = `${serviceName} service is not available`;
          break;
        case 'ETIMEDOUT':
        case 'ESOCKETTIMEDOUT':
          statusCode = 504; // Gateway Timeout
          errorMessage = `${serviceName} service timeout`;
          break;
        case 'ENOTFOUND':
          statusCode = 502; // Bad Gateway
          errorMessage = `${serviceName} service not found`;
          break;
        case 'ECONNRESET':
          statusCode = 502; // Bad Gateway
          errorMessage = `Connection to ${serviceName} was reset`;
          break;
        default:
          statusCode = 502;
          errorMessage = `${serviceName} service error`;
      }
      
      // Evita doppia risposta
      if (!res.headersSent) {
        res.status(statusCode).json({
          error: errorMessage,
          service: serviceName,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        });
      }
    },
    
    onProxyReqError: (err, req, res) => {
      logger.error(`Proxy request error for ${serviceName}`, {
        service: 'proxy-server',
        proxyService: serviceName,
        error: err.message,
        target,
        path: req.path,
        method: req.method
      });
      
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Proxy request failed',
          service: serviceName,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    onProxyResError: (err, req, res) => {
      logger.error(`Proxy response error for ${serviceName}`, {
        service: 'proxy-server',
        proxyService: serviceName,
        error: err.message,
        target,
        path: req.path,
        method: req.method
      });
      
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Proxy response failed',
          service: serviceName,
          timestamp: new Date().toISOString()
        });
      }
    }
  };
}

/**
 * Crea middleware proxy con configurazione standardizzata
 * @param {string} serviceName - Nome del servizio
 * @param {string} target - URL target del proxy
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Function} Express middleware
 */
export function createCustomProxyMiddleware(serviceName, target, options = {}) {
  const {
    pathRewrite = {},
    type = 'api',
    customConfig = {},
    enableLogging = true,
    skipPaths = [],
    requireAuth = false
  } = options;
  
  // Ottieni configurazione base per il tipo
  const baseConfig = PROXY_DEFAULTS[type] || PROXY_DEFAULTS.api;
  
  // Crea logger per il proxy
  const proxyLogger = enableLogging ? createProxyLogger(target, serviceName) : {};
  
  // Crea gestori di errore
  const errorHandlers = createErrorHandlers(serviceName, target);
  
  // Configurazione finale del proxy
  const proxyConfig = {
    target,
    pathRewrite,
    ...baseConfig,
    ...customConfig,
    ...proxyLogger,
    ...errorHandlers,
    
    // Router function per controlli aggiuntivi
    router: (req) => {
      // Skip paths specificati
      if (skipPaths.some(path => req.path.includes(path))) {
        return false;
      }
      
      return target;
    },
    
    // Modifica headers della richiesta
    onProxyReq: (proxyReq, req, res) => {
      // Aggiungi headers di identificazione
      proxyReq.setHeader('X-Forwarded-By', 'proxy-server');
      proxyReq.setHeader('X-Proxy-Service', serviceName);
      
      // Mantieni IP originale
      if (req.ip) {
        proxyReq.setHeader('X-Forwarded-For', req.ip);
      }
      
      // Chiama logger se abilitato
      if (proxyLogger.onProxyReq) {
        proxyLogger.onProxyReq(proxyReq, req, res);
      }
      
      // Log per audit GDPR
      logger.info(`Proxying to ${serviceName}`, {
        service: 'proxy-server',
        targetService: serviceName,
        method: req.method,
        originalPath: req.path,
        targetPath: proxyReq.path,
        target,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    },
    
    // Modifica headers della risposta
    onProxyRes: (proxyRes, req, res) => {
      // Aggiungi headers di identificazione
      proxyRes.headers['X-Proxied-By'] = 'proxy-server';
      proxyRes.headers['X-Proxy-Service'] = serviceName;
      
      // Chiama logger se abilitato
      if (proxyLogger.onProxyRes) {
        proxyLogger.onProxyRes(proxyRes, req, res);
      }
    }
  };
  
  // Crea il middleware proxy
  const proxy = createProxyMiddleware(proxyConfig);
  
  // Wrapper per controlli aggiuntivi
  return (req, res, next) => {
    // Debug logging per autenticazione
    if (process.env.DEBUG_AUTH || process.env.DEBUG_ALL) {
      console.log(`🔍 [PROXY AUTH CHECK] Service: ${serviceName}`, {
        requireAuth,
        hasUser: !!req.user,
        hasAuthHeader: !!req.headers.authorization,
        path: req.path,
        method: req.method
      });
    }
    
    // Controllo autenticazione se richiesto
    if (requireAuth && !req.user && !req.headers.authorization) {
      console.log(`❌ [PROXY AUTH FAILED] Service: ${serviceName}`, {
        requireAuth,
        hasUser: !!req.user,
        hasAuthHeader: !!req.headers.authorization,
        path: req.path,
        method: req.method
      });
      
      return res.status(401).json({
        error: 'Authentication required',
        service: serviceName
      });
    }
    
    // Debug logging per proxy success
    if (process.env.DEBUG_AUTH || process.env.DEBUG_ALL) {
      console.log(`✅ [PROXY AUTH PASSED] Service: ${serviceName} - Forwarding to target`);
    }
    
    // Applica il proxy
    proxy(req, res, next);
  };
}

/**
 * Crea proxy per API server
 * @param {string} target - URL dell'API server
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Function} Express middleware
 */
export function createApiProxy(target, options = {}) {
  // Non usare pathRewrite di default - lascia che le opzioni specifiche abbiano precedenza
  const finalOptions = {
    type: 'api',
    ...options
  };
  
  return createCustomProxyMiddleware('api-server', target, finalOptions);
}

/**
 * Crea proxy per servizio documenti
 * @param {string} target - URL del servizio documenti
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Function} Express middleware
 */
export function createDocumentsProxy(target, options = {}) {
  return createCustomProxyMiddleware('documents-server', target, {
    type: 'documents',
    pathRewrite: {
      '^/generate': '/generate',
      '^/templates': '/templates',
      '^/attestati': '/attestati'
    },
    ...options
  });
}

/**
 * Crea proxy per autenticazione
 * @param {string} target - URL del servizio auth
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Function} Express middleware
 */
export function createAuthProxy(target, options = {}) {
  // Merge corretto dei pathRewrite: le opzioni passate hanno precedenza
  const defaultPathRewrite = {
    '^/api/auth': '/api/auth', // Mantieni il path completo per l'API server
    '^/api/v1/auth': '/api/v1/auth', // Aggiungi supporto per v1
    // Aggiungi regole per i percorsi senza prefisso (processati da Express)
    '^/login': '/api/auth/login',
    '^/register': '/api/auth/register',
    '^/forgot-password': '/api/auth/forgot-password',
    '^/reset-password': '/api/auth/reset-password',
    '^/verify': '/api/auth/verify',
    '^/logout': '/api/auth/logout',
    '^/refresh': '/api/auth/refresh'
  };
  
  const finalOptions = {
    type: 'auth',
    pathRewrite: {
      ...defaultPathRewrite,
      ...(options.pathRewrite || {})
    },
    ...options
  };
  
  return createCustomProxyMiddleware('auth-server', target, finalOptions);
}

/**
 * Crea proxy per health checks
 * @param {string} target - URL del servizio
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Function} Express middleware
 */
export function createHealthProxy(target, options = {}) {
  return createCustomProxyMiddleware('health-check', target, {
    type: 'health',
    enableLogging: false, // Disabilita logging per health
    pathRewrite: {
      '^/health': '/health',
      '^/healthz': '/health'
    },
    ...options
  });
}

/**
 * Crea proxy generico con load balancing
 * @param {string} serviceName - Nome del servizio
 * @param {Array} targets - Array di target per load balancing
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Function} Express middleware
 */
export function createLoadBalancedProxy(serviceName, targets, options = {}) {
  let currentIndex = 0;
  
  const getNextTarget = () => {
    const target = targets[currentIndex];
    currentIndex = (currentIndex + 1) % targets.length;
    return target;
  };
  
  return createCustomProxyMiddleware(serviceName, null, {
    ...options,
    router: (req) => {
      const target = getNextTarget();
      
      if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
        console.log(`🔄 [LOAD BALANCER] ${serviceName}: ${req.path} → ${target}`);
      }
      
      return target;
    }
  });
}

/**
 * Crea proxy con circuit breaker
 * @param {string} serviceName - Nome del servizio
 * @param {string} target - URL target
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Function} Express middleware
 */
export function createCircuitBreakerProxy(serviceName, target, options = {}) {
  const {
    failureThreshold = 5,
    resetTimeout = 60000,
    ...proxyOptions
  } = options;
  
  let failures = 0;
  let lastFailureTime = 0;
  let isOpen = false;
  
  const proxy = createCustomProxyMiddleware(serviceName, target, {
    ...proxyOptions,
    customConfig: {
      ...proxyOptions.customConfig,
      onError: (err, req, res) => {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= failureThreshold) {
          isOpen = true;
          logger.warn(`Circuit breaker opened for ${serviceName}`, {
            service: 'proxy-server',
            targetService: serviceName,
            failures,
            target
          });
        }
        
        // Chiama handler di errore originale
        const errorHandlers = createErrorHandlers(serviceName, target);
        errorHandlers.onError(err, req, res);
      }
    }
  });
  
  return (req, res, next) => {
    // Controlla se il circuit breaker è aperto
    if (isOpen) {
      const now = Date.now();
      
      // Prova a resettare dopo il timeout
      if (now - lastFailureTime > resetTimeout) {
        isOpen = false;
        failures = 0;
        logger.info(`Circuit breaker reset for ${serviceName}`, {
          service: 'proxy-server',
          targetService: serviceName,
          target
        });
      } else {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          service: serviceName,
          reason: 'Circuit breaker is open',
          retryAfter: Math.ceil((resetTimeout - (now - lastFailureTime)) / 1000)
        });
      }
    }
    
    proxy(req, res, next);
  };
}

/**
 * Ottieni statistiche dei proxy
 * @returns {Object} Statistiche correnti
 */
export function getProxyStats() {
  return {
    availableTypes: Object.keys(PROXY_DEFAULTS),
    defaultConfigs: PROXY_DEFAULTS,
    debugEnabled: !!(process.env.DEBUG_PROXY || process.env.DEBUG_ALL)
  };
}

export default {
  createCustomProxyMiddleware,
  createApiProxy,
  createDocumentsProxy,
  createAuthProxy,
  createHealthProxy,
  createLoadBalancedProxy,
  createCircuitBreakerProxy,
  getProxyStats
};