/**
 * Rate Limiting Configuration
 * Configurazioni per limitazione delle richieste per endpoint specifici e globali
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

/**
 * Get clean IP address from request (handles proxy headers)
 */
const getClientIp = (req) => {
  // Check X-Forwarded-For header first (set by nginx proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Get first IP from comma-separated list
    const ip = forwarded.split(',')[0].trim();
    // Clean any escape characters
    return ip.replace(/\\/g, '');
  }
  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp.replace(/\\/g, '');
  }
  // Fallback to req.ip with cleaning
  return (req.ip || '127.0.0.1').replace(/\\/g, '').replace('::ffff:', '');
};

/**
 * Configurazioni predefinite per diversi tipi di rate limiting
 */
export const RATE_LIMIT_CONFIGS = {
  // Rate limiting globale (alto per sviluppo)
  global: {
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 1000, // 1000 richieste per IP
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false }, // Disable IP validation for proxy compatibility
    keyGenerator: getClientIp,
    skip: (req) => {
      // Skip rate limiting per health checks e test endpoints
      return req.path === '/health' || req.path === '/test' || req.path.startsWith('/test-');
    }
  },

  // Rate limiting per login (restrittivo per sicurezza)
  // SECURITY: Max 10 tentativi in 15 minuti per prevenire brute-force
  login: {
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 10, // 10 tentativi di login per IP - protezione brute-force
    message: {
      error: 'Troppi tentativi di accesso. Riprova tra 15 minuti.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false }, // Disable IP validation for proxy compatibility
    keyGenerator: getClientIp,
    skipSuccessfulRequests: true, // Non contare login riusciti
    skipFailedRequests: false // Conta login falliti
  },

  // Rate limiting per API di upload
  upload: {
    windowMs: 10 * 60 * 1000, // 10 minuti
    max: 20, // 20 upload per IP
    message: {
      error: 'Too many upload requests from this IP, please try again later.',
      retryAfter: '10 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false }, // Disable IP validation for proxy compatibility
    keyGenerator: getClientIp
  },

  // Rate limiting per API di ricerca
  search: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 60, // 60 ricerche per minuto
    message: {
      error: 'Too many search requests from this IP, please try again later.',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false }, // Disable IP validation for proxy compatibility
    keyGenerator: getClientIp
  },

  // Rate limiting per API di creazione/modifica
  mutation: {
    windowMs: 5 * 60 * 1000, // 5 minuti
    max: 100, // 100 operazioni di modifica per IP
    message: {
      error: 'Too many modification requests from this IP, please try again later.',
      retryAfter: '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false }, // Disable IP validation for proxy compatibility
    keyGenerator: getClientIp
  },

  // Rate limiting per API pubbliche
  public: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 richieste per minuto
    message: {
      error: 'Too many requests to public API, please try again later.',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false }, // Disable IP validation for proxy compatibility
    keyGenerator: getClientIp
  },

  // Rate limiting per liste pubbliche di form
  'public-forms-list': {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 richieste per minuto
    message: {
      error: 'Too many requests to public forms list, please try again later.',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false },
    keyGenerator: getClientIp
  },

  // Rate limiting per recupero singolo form pubblico
  'public-form-get': {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 60, // 60 richieste per minuto
    message: {
      error: 'Too many requests to get public form, please try again later.',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false },
    keyGenerator: getClientIp
  },

  // Rate limiting per submit form pubblico
  'public-form-submit': {
    windowMs: 5 * 60 * 1000, // 5 minuti
    max: 10, // 10 submit per 5 minuti
    message: {
      error: 'Too many form submissions, please try again later.',
      retryAfter: '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false },
    keyGenerator: getClientIp
  },

  // Rate limiting per submit contatto pubblico
  'public-contact-submit': {
    windowMs: 5 * 60 * 1000, // 5 minuti
    max: 5, // 5 submit per 5 minuti
    message: {
      error: 'Too many contact form submissions, please try again later.',
      retryAfter: '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false },
    keyGenerator: getClientIp
  }
};

/**
 * Configurazioni per ambiente
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    // Limiti alti ma ragionevoli per sviluppo
    global: { ...RATE_LIMIT_CONFIGS.global, max: 10000 },
    login: { ...RATE_LIMIT_CONFIGS.login, max: 300 }, // 300 tentativi per sviluppo (allineato con proxy)
    upload: { ...RATE_LIMIT_CONFIGS.upload, max: 200 },
    search: { ...RATE_LIMIT_CONFIGS.search, max: 600 },
    mutation: { ...RATE_LIMIT_CONFIGS.mutation, max: 1000 },
    public: { ...RATE_LIMIT_CONFIGS.public, max: 300 },
    'public-forms-list': { ...RATE_LIMIT_CONFIGS['public-forms-list'], max: 300 },
    'public-form-get': { ...RATE_LIMIT_CONFIGS['public-form-get'], max: 600 },
    'public-form-submit': { ...RATE_LIMIT_CONFIGS['public-form-submit'], max: 100 },
    'public-contact-submit': { ...RATE_LIMIT_CONFIGS['public-contact-submit'], max: 50 }
  },

  test: {
    // Limiti molto alti per test
    global: { ...RATE_LIMIT_CONFIGS.global, max: 50000 },
    login: { ...RATE_LIMIT_CONFIGS.login, max: 1000 },
    upload: { ...RATE_LIMIT_CONFIGS.upload, max: 1000 },
    search: { ...RATE_LIMIT_CONFIGS.search, max: 3000 },
    mutation: { ...RATE_LIMIT_CONFIGS.mutation, max: 5000 },
    public: { ...RATE_LIMIT_CONFIGS.public, max: 1500 },
    'public-forms-list': { ...RATE_LIMIT_CONFIGS['public-forms-list'], max: 1500 },
    'public-form-get': { ...RATE_LIMIT_CONFIGS['public-form-get'], max: 3000 },
    'public-form-submit': { ...RATE_LIMIT_CONFIGS['public-form-submit'], max: 500 },
    'public-contact-submit': { ...RATE_LIMIT_CONFIGS['public-contact-submit'], max: 250 }
  },

  production: {
    // Limiti standard per produzione
    global: RATE_LIMIT_CONFIGS.global,
    login: RATE_LIMIT_CONFIGS.login,
    upload: RATE_LIMIT_CONFIGS.upload,
    search: RATE_LIMIT_CONFIGS.search,
    mutation: RATE_LIMIT_CONFIGS.mutation,
    public: RATE_LIMIT_CONFIGS.public,
    'public-forms-list': RATE_LIMIT_CONFIGS['public-forms-list'],
    'public-form-get': RATE_LIMIT_CONFIGS['public-form-get'],
    'public-form-submit': RATE_LIMIT_CONFIGS['public-form-submit'],
    'public-contact-submit': RATE_LIMIT_CONFIGS['public-contact-submit']
  }
};

/**
 * Factory per creare rate limiter personalizzati
 */
export const createRateLimiter = (type = 'global', customOptions = {}) => {
  const environment = process.env.NODE_ENV || 'development';
  const baseConfig = ENVIRONMENT_CONFIGS[environment]?.[type] || RATE_LIMIT_CONFIGS[type];

  if (!baseConfig) {
    logger.warn(`Rate limit type '${type}' not found, using global config`, {
      service: 'rate-limiting',
      type,
      environment
    });
    return createRateLimiter('global', customOptions);
  }

  const config = {
    ...baseConfig,
    ...customOptions,
    handler: (req, res) => {
      const message = config.message || baseConfig.message;
      logger.warn('Rate limit exceeded', {
        service: 'rate-limiting',
        ip: req.ip,
        path: req.path,
        type,
        userAgent: req.get('User-Agent')
      });

      res.status(429).json({
        error: 'Rate limit exceeded',
        message: message.error || 'Too many requests',
        retryAfter: message.retryAfter || 'later',
        timestamp: new Date().toISOString()
      });
    }
  };

  return rateLimit(config);
};

/**
 * Rate limiters predefiniti pronti all'uso
 */
export const rateLimiters = {
  global: () => createRateLimiter('global'),
  login: () => createRateLimiter('login'),
  upload: () => createRateLimiter('upload'),
  search: () => createRateLimiter('search'),
  mutation: () => createRateLimiter('mutation'),
  public: () => createRateLimiter('public')
};

/**
 * Middleware per applicare rate limiting condizionale
 */
export const conditionalRateLimit = (type, condition) => {
  const limiter = createRateLimiter(type);

  return (req, res, next) => {
    if (condition && !condition(req)) {
      return next();
    }
    return limiter(req, res, next);
  };
};

/**
 * Configurazione rate limiting per route specifiche
 */
export const ROUTE_RATE_LIMITS = {
  '/api/auth/login': 'login',
  '/api/auth/register': 'login',
  '/api/upload': 'upload',
  '/api/search': 'search',
  '/api/persons': 'mutation',
  '/api/companies': 'mutation',
  '/api/courses': 'mutation',
  '/api/public': 'public'
};

/**
 * Applica rate limiting automatico basato su pattern di route
 */
export const autoRateLimit = (req, res, next) => {
  const path = req.path;

  // Trova il tipo di rate limit appropriato
  let limitType = 'global';

  for (const [pattern, type] of Object.entries(ROUTE_RATE_LIMITS)) {
    if (path.startsWith(pattern)) {
      limitType = type;
      break;
    }
  }

  // Applica il rate limiter appropriato
  const limiter = createRateLimiter(limitType);
  return limiter(req, res, next);
};

/**
 * Validazione configurazione rate limiting
 */
export const validateRateLimitConfig = (config) => {
  const errors = [];

  if (!config.windowMs || config.windowMs < 1000) {
    errors.push('windowMs must be at least 1000ms');
  }

  if (!config.max || config.max < 1) {
    errors.push('max must be at least 1');
  }

  if (config.message && typeof config.message !== 'object') {
    errors.push('message must be an object');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Ottieni configurazione rate limiting per ambiente
 */
export const getRateLimitConfig = (environment = process.env.NODE_ENV || 'development') => {
  const config = ENVIRONMENT_CONFIGS[environment];

  if (!config) {
    logger.warn(`Environment '${environment}' not found, using development config`, {
      service: 'rate-limiting',
      environment
    });
    return ENVIRONMENT_CONFIGS.development;
  }

  return config;
};

export default {
  createRateLimiter,
  rateLimiters,
  conditionalRateLimit,
  autoRateLimit,
  validateRateLimitConfig,
  getRateLimitConfig,
  RATE_LIMIT_CONFIGS,
  ENVIRONMENT_CONFIGS,
  ROUTE_RATE_LIMITS
};