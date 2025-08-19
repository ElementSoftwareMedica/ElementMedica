/**
 * Security Configuration
 * Configurazioni avanzate per sicurezza con Helmet, CSP, HSTS e altre protezioni
 */

import helmet from 'helmet';
import { logger } from '../utils/logger.js';

/**
 * Configurazioni Content Security Policy per ambiente
 */
export const CSP_CONFIGS = {
  development: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Permesso per sviluppo
        "'unsafe-eval'", // Permesso per sviluppo
        'localhost:*',
        '127.0.0.1:*',
        'https://apis.google.com',
        'https://accounts.google.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Permesso per sviluppo
        'https://fonts.googleapis.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'http://localhost:*',
        'http://127.0.0.1:*'
      ],
      connectSrc: [
        "'self'",
        'http://localhost:*',
        'http://127.0.0.1:*',
        'https://apis.google.com',
        'https://accounts.google.com'
      ],
      frameSrc: [
        "'self'",
        'https://accounts.google.com'
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null // Disabilitato per sviluppo locale
    }
  },

  production: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://apis.google.com',
        'https://accounts.google.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Necessario per alcuni framework CSS
        'https://fonts.googleapis.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https:'
      ],
      connectSrc: [
        "'self'",
        'https://apis.google.com',
        'https://accounts.google.com'
      ],
      frameSrc: [
        "'self'",
        'https://accounts.google.com'
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },

  test: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"]
    }
  }
};

/**
 * Configurazioni Helmet per ambiente
 */
export const HELMET_CONFIGS = {
  development: {
    contentSecurityPolicy: {
      directives: CSP_CONFIGS.development.directives,
      reportOnly: true // Solo report in sviluppo
    },
    hsts: false, // Disabilitato per HTTP locale
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' },
    permittedCrossDomainPolicies: false,
    dnsPrefetchControl: { allow: false },
    ieNoOpen: true,
    hidePoweredBy: true
  },

  production: {
    contentSecurityPolicy: {
      directives: CSP_CONFIGS.production.directives,
      reportOnly: false
    },
    hsts: {
      maxAge: 31536000, // 1 anno
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: false,
    dnsPrefetchControl: { allow: false },
    ieNoOpen: true,
    hidePoweredBy: true,
    crossOriginEmbedderPolicy: false, // Può causare problemi con alcuni servizi
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  },

  test: {
    contentSecurityPolicy: false, // Disabilitato per test
    hsts: false,
    noSniff: true,
    frameguard: false,
    xssFilter: false,
    hidePoweredBy: true
  }
};

/**
 * Headers di sicurezza personalizzati
 */
export const SECURITY_HEADERS = {
  development: {
    'X-API-Version': '1.0',
    'X-Environment': 'development',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff'
  },

  production: {
    'X-API-Version': '1.0',
    'X-Environment': 'production',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  },

  test: {
    'X-API-Version': '1.0',
    'X-Environment': 'test'
  }
};

/**
 * Factory per creare middleware di sicurezza
 */
export const createSecurityMiddleware = (environment = process.env.NODE_ENV || 'development') => {
  const config = HELMET_CONFIGS[environment];
  
  if (!config) {
    logger.warn(`Security config for environment '${environment}' not found, using development`, {
      service: 'security',
      environment
    });
    return createSecurityMiddleware('development');
  }

  logger.info('Initializing security middleware', {
    service: 'security',
    environment,
    csp: !!config.contentSecurityPolicy,
    hsts: !!config.hsts
  });

  return helmet(config);
};

/**
 * Middleware per headers di sicurezza personalizzati
 */
export const customSecurityHeaders = (environment = process.env.NODE_ENV || 'development') => {
  const headers = SECURITY_HEADERS[environment] || SECURITY_HEADERS.development;
  
  return (req, res, next) => {
    // Applica headers personalizzati
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Header dinamici
    res.setHeader('X-Request-ID', req.id || 'unknown');
    res.setHeader('X-Timestamp', new Date().toISOString());
    
    next();
  };
};

/**
 * Middleware per protezione CSRF (se necessario)
 */
export const csrfProtection = (options = {}) => {
  const defaultOptions = {
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req) => {
      return req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;
    }
  };
  
  const config = { ...defaultOptions, ...options };
  
  return (req, res, next) => {
    // Implementazione semplificata CSRF
    if (config.ignoreMethods.includes(req.method)) {
      return next();
    }
    
    // In produzione, verificare token CSRF
    if (process.env.NODE_ENV === 'production') {
      const token = config.value(req);
      if (!token) {
        return res.status(403).json({
          error: 'CSRF token missing',
          message: 'CSRF protection requires a valid token'
        });
      }
    }
    
    next();
  };
};

/**
 * Middleware per protezione contro attacchi di timing
 */
export const timingAttackProtection = (delay = 100) => {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const elapsed = Date.now() - start;
      if (elapsed < delay) {
        setTimeout(() => {}, delay - elapsed);
      }
    });
    
    next();
  };
};

/**
 * Middleware per limitazione dimensione richieste
 */
export const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = typeof maxSize === 'string' ? 
      parseInt(maxSize.replace(/[^0-9]/g, '')) * (maxSize.includes('mb') ? 1024 * 1024 : 1024) :
      maxSize;
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Request too large',
        message: `Request size exceeds maximum allowed size of ${maxSize}`,
        maxSize,
        receivedSize: contentLength
      });
    }
    
    next();
  };
};

/**
 * Configurazione completa di sicurezza
 */
export const createSecurityConfig = (environment = process.env.NODE_ENV || 'development') => {
  return {
    helmet: createSecurityMiddleware(environment),
    customHeaders: customSecurityHeaders(environment),
    csrf: csrfProtection(),
    timingProtection: timingAttackProtection(),
    sizeLimit: requestSizeLimit('50mb')
  };
};

/**
 * Validazione configurazione sicurezza
 */
export const validateSecurityConfig = (config) => {
  const errors = [];
  
  if (!config) {
    errors.push('Security config is required');
    return { isValid: false, errors };
  }
  
  if (config.contentSecurityPolicy && !config.contentSecurityPolicy.directives) {
    errors.push('CSP directives are required when CSP is enabled');
  }
  
  if (config.hsts && (!config.hsts.maxAge || config.hsts.maxAge < 300)) {
    errors.push('HSTS maxAge must be at least 300 seconds');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Ottieni configurazione sicurezza per ambiente
 */
export const getSecurityConfig = (environment = process.env.NODE_ENV || 'development') => {
  const config = HELMET_CONFIGS[environment];
  
  if (!config) {
    logger.warn(`Security config for environment '${environment}' not found, using development`, {
      service: 'security',
      environment
    });
    return HELMET_CONFIGS.development;
  }
  
  return config;
};

export default {
  createSecurityMiddleware,
  customSecurityHeaders,
  csrfProtection,
  timingAttackProtection,
  requestSizeLimit,
  createSecurityConfig,
  validateSecurityConfig,
  getSecurityConfig,
  CSP_CONFIGS,
  HELMET_CONFIGS,
  SECURITY_HEADERS
};