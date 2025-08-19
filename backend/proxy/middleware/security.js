/**
 * Middleware di sicurezza centralizzati per il proxy server
 * Include helmet, CSP estese, HTTPS/HSTS e altre configurazioni di sicurezza
 */

import helmet from 'helmet';
import { logger } from '../../utils/logger.js';
import { createDebugLogger } from './logging.js';

const debugSecurity = createDebugLogger('security');

/**
 * Configurazione CSP (Content Security Policy) estesa
 */
const CSP_CONFIG = {
  // Configurazione per sviluppo
  development: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Necessario per Vite in dev
        "'unsafe-eval'",   // Necessario per Vite in dev
        "http://localhost:*",
        "ws://localhost:*"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Necessario per CSS inline
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "http://localhost:*"
      ],
      connectSrc: [
        "'self'",
        "http://localhost:*",
        "ws://localhost:*",
        "wss://localhost:*"
      ],
      mediaSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  
  // Configurazione per produzione
  production: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Solo per CSS critici
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:"
      ],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
};

/**
 * Configurazione HSTS (HTTP Strict Transport Security)
 */
const HSTS_CONFIG = {
  development: {
    maxAge: 0, // Disabilitato in sviluppo
    includeSubDomains: false,
    preload: false
  },
  
  production: {
    maxAge: 31536000, // 1 anno
    includeSubDomains: true,
    preload: true
  }
};

/**
 * Crea middleware helmet con configurazione personalizzata
 * @param {Object} options - Opzioni per helmet
 * @returns {Function} Express middleware
 */
export function createHelmetMiddleware(options = {}) {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  
  const helmetConfig = {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: CSP_CONFIG[env]?.directives || CSP_CONFIG.development.directives,
      reportOnly: !isProduction // Solo report in sviluppo
    },
    
    // HTTP Strict Transport Security
    hsts: isProduction ? HSTS_CONFIG.production : HSTS_CONFIG.development,
    
    // X-Frame-Options
    frameguard: {
      action: 'deny'
    },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // X-XSS-Protection
    xssFilter: true,
    
    // Referrer Policy
    referrerPolicy: {
      policy: ['no-referrer', 'strict-origin-when-cross-origin']
    },
    
    // Hide X-Powered-By
    hidePoweredBy: true,
    
    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },
    
    // IE No Open
    ieNoOpen: true,
    
    // Permissions Policy (ex Feature Policy)
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: []
    },
    
    ...options
  };
  
  const helmetMiddleware = helmet(helmetConfig);
  
  return (req, res, next) => {
    if (process.env.DEBUG_SECURITY || process.env.DEBUG_ALL) {
      debugSecurity('Applying security headers:', {
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin'),
        environment: env,
        isProduction
      });
    }
    
    helmetMiddleware(req, res, next);
  };
}

/**
 * Middleware per CORS sicuro con validazione origin
 * @param {Array} allowedOrigins - Origins permessi
 * @returns {Function} Express middleware
 */
export function createSecureCorsMiddleware(allowedOrigins = []) {
  return (req, res, next) => {
    const origin = req.get('Origin');
    const env = process.env.NODE_ENV || 'development';
    
    // In sviluppo, permetti localhost
    if (env === 'development') {
      const localhostPattern = /^https?:\/\/localhost(:\d+)?$/;
      if (origin && localhostPattern.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } else {
      // In produzione, verifica origins esatti
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    }
    
    // Headers di sicurezza aggiuntivi per CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 ore
    res.setHeader('Vary', 'Origin');
    
    if (process.env.DEBUG_SECURITY || process.env.DEBUG_ALL) {
      debugSecurity('Secure CORS applied:', {
        origin,
        allowed: allowedOrigins.includes(origin) || env === 'development',
        environment: env
      });
    }
    
    next();
  };
}

/**
 * Middleware per rate limiting di sicurezza
 * @param {Object} options - Opzioni per il rate limiting
 * @returns {Function} Express middleware
 */
export function createSecurityRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minuti
    max = 100,
    message = 'Too many requests from this IP',
    standardHeaders = true,
    legacyHeaders = false
  } = options;
  
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Pulisci richieste vecchie
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const ipRequests = requests.get(ip).filter(time => time > windowStart);
    
    if (ipRequests.length >= max) {
      logger.warn('Rate limit exceeded', {
        service: 'proxy-server',
        ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        requestCount: ipRequests.length
      });
      
      if (standardHeaders) {
        res.setHeader('RateLimit-Limit', max);
        res.setHeader('RateLimit-Remaining', 0);
        res.setHeader('RateLimit-Reset', new Date(now + windowMs));
      }
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Aggiungi richiesta corrente
    ipRequests.push(now);
    requests.set(ip, ipRequests);
    
    if (standardHeaders) {
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', max - ipRequests.length);
      res.setHeader('RateLimit-Reset', new Date(now + windowMs));
    }
    
    next();
  };
}

/**
 * Middleware per validazione input di sicurezza
 * @param {Object} options - Opzioni per la validazione
 * @returns {Function} Express middleware
 */
export function createInputValidationMiddleware(options = {}) {
  const {
    maxBodySize = '10mb',
    allowedContentTypes = ['application/json', 'application/x-www-form-urlencoded'],
    sanitizeInput = true
  } = options;
  
  return (req, res, next) => {
    const contentType = req.get('Content-Type');
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    // Verifica content type
    if (contentType && !allowedContentTypes.some(type => contentType.includes(type))) {
      logger.warn('Invalid content type', {
        service: 'proxy-server',
        contentType,
        path: req.path,
        ip: req.ip
      });
      
      return res.status(415).json({
        error: 'Unsupported Media Type',
        allowedTypes: allowedContentTypes
      });
    }
    
    // Verifica dimensione body
    const maxBytes = parseInt(maxBodySize.replace(/\D/g, '')) * (maxBodySize.includes('mb') ? 1024 * 1024 : 1024);
    if (contentLength > maxBytes) {
      logger.warn('Request body too large', {
        service: 'proxy-server',
        contentLength,
        maxBytes,
        path: req.path,
        ip: req.ip
      });
      
      return res.status(413).json({
        error: 'Request Entity Too Large',
        maxSize: maxBodySize
      });
    }
    
    if (process.env.DEBUG_SECURITY || process.env.DEBUG_ALL) {
      debugSecurity('Input validation passed:', {
        contentType,
        contentLength,
        path: req.path
      });
    }
    
    next();
  };
}

/**
 * Middleware per logging di sicurezza
 * @returns {Function} Express middleware
 */
export function createSecurityLogger() {
  return (req, res, next) => {
    const securityHeaders = {
      'x-forwarded-for': req.get('X-Forwarded-For'),
      'x-real-ip': req.get('X-Real-IP'),
      'user-agent': req.get('User-Agent'),
      'origin': req.get('Origin'),
      'referer': req.get('Referer')
    };
    
    // Log richieste sospette
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /<script/i, // XSS
      /union.*select/i, // SQL injection
      /javascript:/i, // JavaScript injection
      /vbscript:/i, // VBScript injection
      /onload=/i, // Event handler injection
      /onerror=/i // Event handler injection
    ];
    
    const url = req.originalUrl || req.url;
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));
    
    if (isSuspicious) {
      logger.warn('Suspicious request detected', {
        service: 'proxy-server',
        type: 'security_alert',
        url,
        method: req.method,
        ip: req.ip,
        headers: securityHeaders,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log per audit trail GDPR - log removed to reduce verbosity
    // API request logging disabled to prevent excessive log generation
    
    next();
  };
}

/**
 * Setup completo della sicurezza per il proxy server
 * @param {Object} app - Express app instance
 * @param {Object} options - Opzioni di configurazione
 */
export function setupSecurity(app, options = {}) {
  const {
    enableHelmet = true,
    enableSecurityLogger = true,
    enableInputValidation = true,
    allowedOrigins = [],
    customCSP = {},
    customHSTS = {}
  } = options;
  
  // Security logger
  if (enableSecurityLogger) {
    app.use(createSecurityLogger());
  }
  
  // Helmet con configurazione personalizzata
  if (enableHelmet) {
    const helmetOptions = {
      contentSecurityPolicy: {
        directives: {
          ...CSP_CONFIG[process.env.NODE_ENV || 'development'].directives,
          ...customCSP
        }
      },
      hsts: {
        ...HSTS_CONFIG[process.env.NODE_ENV || 'development'],
        ...customHSTS
      }
    };
    
    app.use(createHelmetMiddleware(helmetOptions));
  }
  
  // CORS sicuro
  if (allowedOrigins.length > 0) {
    app.use(createSecureCorsMiddleware(allowedOrigins));
  }
  
  // Input validation
  if (enableInputValidation) {
    app.use(createInputValidationMiddleware());
  }
  
  if (process.env.DEBUG_SECURITY || process.env.DEBUG_ALL) {
    console.log('✅ Security middleware configured:');
    console.log('   - Helmet enabled:', enableHelmet);
    console.log('   - Security logger enabled:', enableSecurityLogger);
    console.log('   - Input validation enabled:', enableInputValidation);
    console.log('   - Environment:', process.env.NODE_ENV || 'development');
    console.log('   - Allowed origins:', allowedOrigins.length);
  }
}

/**
 * Ottieni configurazione di sicurezza corrente
 * @returns {Object} Configurazione corrente
 */
export function getSecurityConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  return {
    environment: env,
    csp: CSP_CONFIG[env],
    hsts: HSTS_CONFIG[env],
    debugEnabled: !!(process.env.DEBUG_SECURITY || process.env.DEBUG_ALL)
  };
}

export default {
  createHelmetMiddleware,
  createSecureCorsMiddleware,
  createSecurityRateLimiter,
  createInputValidationMiddleware,
  createSecurityLogger,
  setupSecurity,
  getSecurityConfig
};