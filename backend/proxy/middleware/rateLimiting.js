/**
 * Rate limiting centralizzato con esenzioni configurabili
 * Unifica tutta la logica di rate limiting del proxy server
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../../utils/logger.js';

/**
 * Path esenti dal rate limiting
 */
const EXEMPT_PATHS = [
  '/api/tenants',
  '/api/roles',
  '/api/persons',
  '/health',
  '/healthz',
  '/proxy-test-updated',
  '/test-roles-middleware'
];

/**
 * Metodi HTTP esenti dal rate limiting
 */
const EXEMPT_METHODS = ['OPTIONS'];

/**
 * Verifica se una richiesta è esente dal rate limiting
 * @param {Object} req - Express request object
 * @returns {boolean} True se esente
 */
function isExemptFromRateLimit(req) {
  // Skip per metodi esenti (principalmente OPTIONS per CORS)
  if (EXEMPT_METHODS.includes(req.method)) {
    if (process.env.DEBUG_RATE_LIMIT) {
      console.log(`🔍 [RATE LIMITER] Skipping ${req.method}:`, req.originalUrl);
    }
    return true;
  }
  
  // Skip per path esenti (endpoint critici)
  const isPathExempt = EXEMPT_PATHS.some(path => 
    req.originalUrl.includes(path) || req.path.includes(path)
  );
  
  if (isPathExempt && process.env.DEBUG_RATE_LIMIT) {
    console.log(`🔍 [RATE LIMITER] Skipping exempt path:`, req.originalUrl);
  }
  
  return isPathExempt;
}

/**
 * Handler per rate limit exceeded
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string} type - Tipo di rate limiter
 */
function rateLimitHandler(req, res, type = 'general') {
  logger.warn(`${type} rate limit exceeded`, {
    service: 'proxy-server',
    ip: req.ip,
    path: req.path,
    userAgent: req.get('User-Agent'),
    type
  });
  
  const errorMessages = {
    general: 'Too many requests from this IP',
    api: 'Too many API requests from this IP',
    login: 'Too many login attempts from this IP'
  };
  
  const errorCodes = {
    general: 'RATE_LIMIT_EXCEEDED',
    api: 'API_RATE_LIMIT_EXCEEDED',
    login: 'LOGIN_RATE_LIMIT_EXCEEDED'
  };
  
  res.status(429).json({
    error: errorMessages[type] || errorMessages.general,
    code: errorCodes[type] || errorCodes.general,
    retryAfter: '15 minutes',
    timestamp: new Date().toISOString()
  });
}

/**
 * Crea rate limiter configurabile
 * @param {Object} options - Opzioni del rate limiter
 * @returns {Function} Express middleware
 */
export function createRateLimiter(options = {}) {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isExemptFromRateLimit,
    handler: (req, res) => rateLimitHandler(req, res, options.type || 'general')
  };
  
  return rateLimit({ ...defaultOptions, ...options });
}

// Crea i rate limiter una sola volta all'inizializzazione
const GENERAL_RATE_LIMITER = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  type: 'general'
});

const API_RATE_LIMITER = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 200,
  type: 'api'
});

const LOGIN_RATE_LIMITER = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 50, // Aumentato a 50 per produzione, 100 per sviluppo
  type: 'login',
  skip: (req) => req.method === 'OPTIONS',
  // RESET STORE per risolvere il problema del rate limiting immediato
  store: new (require('express-rate-limit').MemoryStore)(),
  onLimitReached: (req, res, options) => {
    console.log('🚫 [RATE LIMITER] Login limit reached:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      max: options.max,
      windowMs: options.windowMs
    });
  },
  onHit: (req, res, options) => {
    console.log('📊 [RATE LIMITER] Login attempt:', {
      ip: req.ip,
      path: req.path,
      remaining: res.getHeader('X-RateLimit-Remaining'),
      limit: res.getHeader('X-RateLimit-Limit')
    });
  }
});

const UPLOAD_RATE_LIMITER = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 20,
  type: 'upload'
});

/**
 * Rate limiter generale per tutte le richieste
 */
export function createGeneralRateLimiter() {
  return GENERAL_RATE_LIMITER;
}

/**
 * Rate limiter specifico per API endpoints
 */
export function createApiRateLimiter() {
  return API_RATE_LIMITER;
}

/**
 * Rate limiter specifico per login (più restrittivo)
 */
export function createLoginRateLimiter() {
  return LOGIN_RATE_LIMITER;
}

/**
 * Rate limiter per upload di file (più permissivo)
 */
export function createUploadRateLimiter() {
  return UPLOAD_RATE_LIMITER;
}

/**
 * Middleware intelligente che applica rate limiting condizionale
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export function smartRateLimitMiddleware(req, res, next) {
  // Skip completamente se la richiesta è esente
  if (isExemptFromRateLimit(req)) {
    return next();
  }
  
  // Applica rate limiting generale per tutte le altre richieste
  GENERAL_RATE_LIMITER(req, res, next);
}

/**
 * Configura rate limiting per path specifici
 * @param {Object} app - Express app instance
 */
export function setupRateLimiting(app) {
  // Rate limiting specifico per login (riattivato con limiti aggiornati)
  app.use('/api/auth/login', createLoginRateLimiter());
  
  // Rate limiting per upload
  app.use('/api/upload', createUploadRateLimiter());
  app.use('/generate', createUploadRateLimiter());
  
  // Rate limiting generale (con skip intelligente)
  app.use(smartRateLimitMiddleware);
  
  if (process.env.DEBUG_RATE_LIMIT) {
    console.log('✅ Rate limiting configured:');
    console.log('   - Login: 50 requests/15min (production), 100 requests/15min (development)');
    console.log('   - Upload: 20 requests/15min (production)');
    console.log('   - General: 100 requests/15min (production)');
    console.log('   - Exempt paths:', EXEMPT_PATHS);
    console.log('   - Exempt methods:', EXEMPT_METHODS);
  }
}

/**
 * Aggiunge path alle esenzioni (per configurazione dinamica)
 * @param {string|Array} paths - Path da aggiungere alle esenzioni
 */
export function addExemptPaths(paths) {
  const pathsArray = Array.isArray(paths) ? paths : [paths];
  EXEMPT_PATHS.push(...pathsArray);
  
  if (process.env.DEBUG_RATE_LIMIT) {
    console.log('🔍 [RATE LIMITER] Added exempt paths:', pathsArray);
  }
}

/**
 * Rimuove path dalle esenzioni
 * @param {string|Array} paths - Path da rimuovere dalle esenzioni
 */
export function removeExemptPaths(paths) {
  const pathsArray = Array.isArray(paths) ? paths : [paths];
  
  pathsArray.forEach(path => {
    const index = EXEMPT_PATHS.indexOf(path);
    if (index > -1) {
      EXEMPT_PATHS.splice(index, 1);
    }
  });
  
  if (process.env.DEBUG_RATE_LIMIT) {
    console.log('🔍 [RATE LIMITER] Removed exempt paths:', pathsArray);
  }
}

/**
 * Ottieni statistiche rate limiting
 * @returns {Object} Statistiche correnti
 */
export function getRateLimitStats() {
  return {
    exemptPaths: [...EXEMPT_PATHS],
    exemptMethods: [...EXEMPT_METHODS],
    environment: process.env.NODE_ENV,
    limits: {
      general: process.env.NODE_ENV === 'development' ? 1000 : 100,
      api: process.env.NODE_ENV === 'development' ? 1000 : 200,
      login: process.env.NODE_ENV === 'development' ? 100 : 50, // Aggiornato: 50 per produzione, 100 per sviluppo
      upload: process.env.NODE_ENV === 'development' ? 100 : 20
    }
  };
}

export default {
  createRateLimiter,
  createGeneralRateLimiter,
  createApiRateLimiter,
  createLoginRateLimiter,
  createUploadRateLimiter,
  smartRateLimitMiddleware,
  setupRateLimiting,
  addExemptPaths,
  removeExemptPaths,
  getRateLimitStats,
  isExemptFromRateLimit
};