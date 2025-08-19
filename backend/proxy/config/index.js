/**
 * Configurazione principale del proxy server
 * Centralizza tutte le configurazioni e variabili d'ambiente
 */

import dotenv from 'dotenv';
import { logger } from '../../utils/logger.js';

// Carica variabili d'ambiente
dotenv.config();

/**
 * Configurazione del server
 */
export const serverConfig = {
  port: parseInt(process.env.PROXY_PORT || '4003', 10),
  host: process.env.PROXY_HOST || 'localhost',
  environment: process.env.NODE_ENV || 'development',
  
  // Timeout configurazioni
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
  keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '5000', 10),
  headersTimeout: parseInt(process.env.HEADERS_TIMEOUT || '60000', 10),
  
  // Graceful shutdown
  gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '10000', 10),
  forceShutdownTimeout: parseInt(process.env.FORCE_SHUTDOWN_TIMEOUT || '5000', 10)
};

/**
 * Configurazione dei servizi esterni
 */
export const servicesConfig = {
  api: {
    url: process.env.API_SERVER_URL || 'http://localhost:4001',
    timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.API_RETRIES || '3', 10)
  },
  documents: {
    url: process.env.DOCUMENTS_SERVER_URL || 'http://localhost:4002',
    timeout: parseInt(process.env.DOCUMENTS_TIMEOUT || '60000', 10), // Più alto per generazione documenti
    retries: parseInt(process.env.DOCUMENTS_RETRIES || '2', 10)
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173'
  }
};

/**
 * Configurazione del database
 */
export const databaseConfig = {
  url: process.env.DATABASE_URL,
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
  queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '5000', 10)
};

/**
 * Configurazione CORS
 */
export const corsConfig = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Tenant-ID',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10), // 24 ore
  optionsSuccessStatus: 200
};

/**
 * Configurazione Rate Limiting
 */
export const rateLimitConfig = {
  // Rate limit generale
  general: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minuti
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Rate limit per API
  api: {
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW || '900000', 10), // 15 minuti
    max: parseInt(process.env.API_RATE_LIMIT_MAX || '500', 10),
    message: 'Too many API requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Rate limit per login
  login: {
    windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW || '900000', 10), // 15 minuti
    max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  },
  
  // Rate limit per upload
  upload: {
    windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW || '3600000', 10), // 1 ora
    max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '50', 10),
    message: 'Too many upload requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Rate limit di sicurezza
  security: {
    windowMs: parseInt(process.env.SECURITY_RATE_LIMIT_WINDOW || '300000', 10), // 5 minuti
    max: parseInt(process.env.SECURITY_RATE_LIMIT_MAX || '100', 10),
    message: 'Security rate limit exceeded.',
    standardHeaders: true,
    legacyHeaders: false
  }
};

/**
 * Configurazione Body Parser
 */
export const bodyParserConfig = {
  json: {
    limit: process.env.JSON_BODY_LIMIT || '10mb',
    strict: true,
    type: 'application/json'
  },
  urlencoded: {
    limit: process.env.URLENCODED_BODY_LIMIT || '10mb',
    extended: true,
    parameterLimit: parseInt(process.env.PARAMETER_LIMIT || '1000', 10)
  },
  raw: {
    limit: process.env.RAW_BODY_LIMIT || '50mb',
    type: 'application/octet-stream'
  },
  text: {
    limit: process.env.TEXT_BODY_LIMIT || '1mb',
    type: 'text/plain'
  },
  
  // Configurazioni specifiche
  bulkUpload: {
    limit: process.env.BULK_UPLOAD_LIMIT || '100mb'
  },
  lightweight: {
    limit: process.env.LIGHTWEIGHT_LIMIT || '1mb'
  }
};

/**
 * Configurazione Security
 */
export const securityConfig = {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", servicesConfig.api.url, servicesConfig.documents.url],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    },
    hsts: {
      maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000', 10), // 1 anno
      includeSubDomains: true,
      preload: true
    },
    crossOriginEmbedderPolicy: false, // Disabilitato per compatibilità
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  },
  
  // Validazione input
  inputValidation: {
    maxBodySize: process.env.MAX_BODY_SIZE || '100mb',
    allowedContentTypes: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
      'application/octet-stream'
    ]
  }
};

/**
 * Configurazione Logging
 */
export const loggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.LOG_FORMAT || 'combined',
  
  // Debug namespaces
  debug: {
    enabled: !!(process.env.DEBUG || process.env.DEBUG_ALL),
    namespaces: {
      middleware: 'proxy:middleware',
      cors: 'proxy:cors',
      auth: 'proxy:auth',
      rateLimit: 'proxy:rate-limit',
      bodyParser: 'proxy:body-parser',
      security: 'proxy:security',
      proxy: 'proxy:proxy',
      routes: 'proxy:routes',
      health: 'proxy:health',
      shutdown: 'proxy:shutdown'
    }
  },
  
  // Configurazione file di log
  file: {
    enabled: process.env.LOG_TO_FILE === 'true',
    path: process.env.LOG_FILE_PATH || './logs/proxy-server.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10)
  },
  
  // Configurazione audit
  audit: {
    enabled: process.env.AUDIT_ENABLED === 'true',
    path: process.env.AUDIT_LOG_PATH || './logs/audit.log',
    includeBody: process.env.AUDIT_INCLUDE_BODY === 'true'
  }
};

/**
 * Configurazione Health Check
 */
export const healthConfig = {
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
  retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3', 10),
  interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
  
  // Servizi da controllare
  services: {
    database: {
      enabled: true,
      timeout: parseInt(process.env.DB_HEALTH_TIMEOUT || '3000', 10)
    },
    apiServer: {
      enabled: true,
      url: `${servicesConfig.api.url}/health`,
      timeout: parseInt(process.env.API_HEALTH_TIMEOUT || '5000', 10)
    },
    documentsServer: {
      enabled: true,
      url: `${servicesConfig.documents.url}/health`,
      timeout: parseInt(process.env.DOCS_HEALTH_TIMEOUT || '5000', 10)
    },
    frontend: {
      enabled: process.env.CHECK_FRONTEND_HEALTH === 'true',
      url: servicesConfig.frontend.url,
      timeout: parseInt(process.env.FRONTEND_HEALTH_TIMEOUT || '3000', 10)
    }
  },
  
  // Soglie per le metriche di sistema
  thresholds: {
    memoryUsage: parseFloat(process.env.MEMORY_THRESHOLD || '0.9'), // 90%
    cpuUsage: parseFloat(process.env.CPU_THRESHOLD || '0.8'), // 80%
    responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '1000', 10) // 1 secondo
  }
};

/**
 * Configurazione GDPR
 */
export const gdprConfig = {
  enabled: process.env.GDPR_ENABLED !== 'false',
  
  // Audit trail
  auditTrail: {
    enabled: process.env.GDPR_AUDIT_ENABLED !== 'false',
    retentionDays: parseInt(process.env.GDPR_AUDIT_RETENTION || '2555', 10), // 7 anni
    includePersonalData: process.env.GDPR_AUDIT_INCLUDE_PII === 'true'
  },
  
  // Data retention
  dataRetention: {
    logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '90', 10),
    sessionRetentionDays: parseInt(process.env.SESSION_RETENTION_DAYS || '30', 10)
  },
  
  // Privacy
  privacy: {
    anonymizeIPs: process.env.ANONYMIZE_IPS === 'true',
    maskSensitiveData: process.env.MASK_SENSITIVE_DATA !== 'false'
  }
};

/**
 * Path esenti da vari middleware
 */
export const exemptPaths = {
  cors: [
    '/health',
    '/healthz',
    '/ready',
    '/metrics'
  ],
  
  rateLimit: [
    '/health',
    '/healthz',
    '/ready',
    '/metrics',
    '/favicon.ico'
  ],
  
  bodyParser: [
    '/health',
    '/healthz',
    '/ready',
    '/metrics'
  ],
  
  auth: [
    '/health',
    '/healthz',
    '/ready',
    '/metrics',
    '/api/auth/login',
    '/api/auth/refresh',
    '/favicon.ico'
  ],
  
  logging: [
    '/favicon.ico'
  ]
};

/**
 * Validazione della configurazione
 * @returns {Object} Risultato della validazione
 */
export function validateConfig() {
  const validation = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  // Validazione porte
  if (serverConfig.port < 1 || serverConfig.port > 65535) {
    validation.valid = false;
    validation.errors.push(`Invalid server port: ${serverConfig.port}`);
  }
  
  // Validazione URL servizi
  Object.entries(servicesConfig).forEach(([service, config]) => {
    if (config.url) {
      try {
        new URL(config.url);
      } catch (error) {
        validation.valid = false;
        validation.errors.push(`Invalid ${service} URL: ${config.url}`);
      }
    }
  });
  
  // Validazione DATABASE_URL
  if (!databaseConfig.url) {
    validation.valid = false;
    validation.errors.push('DATABASE_URL is required');
  }
  
  // Validazione CORS origin
  if (!corsConfig.origin) {
    validation.warnings.push('CORS origin not configured, using default');
  }
  
  // Validazione rate limiting
  Object.entries(rateLimitConfig).forEach(([type, config]) => {
    if (config.max <= 0) {
      validation.warnings.push(`Rate limit max for ${type} should be > 0`);
    }
    if (config.windowMs <= 0) {
      validation.warnings.push(`Rate limit window for ${type} should be > 0`);
    }
  });
  
  return validation;
}

/**
 * Ottieni configurazione per l'ambiente corrente
 * @returns {Object} Configurazione completa
 */
export function getConfig() {
  const validation = validateConfig();
  
  if (!validation.valid) {
    logger.error('Invalid configuration', {
      service: 'proxy-server',
      component: 'config',
      errors: validation.errors,
      warnings: validation.warnings
    });
    
    throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
  }
  
  if (validation.warnings.length > 0) {
    logger.warn('Configuration warnings', {
      service: 'proxy-server',
      component: 'config',
      warnings: validation.warnings
    });
  }
  
  return {
    server: serverConfig,
    services: servicesConfig,
    database: databaseConfig,
    cors: corsConfig,
    rateLimit: rateLimitConfig,
    bodyParser: bodyParserConfig,
    security: securityConfig,
    logging: loggingConfig,
    health: healthConfig,
    gdpr: gdprConfig,
    exemptPaths,
    validation
  };
}

/**
 * Stampa configurazione per debug
 */
export function printConfig() {
  if (process.env.DEBUG_CONFIG || process.env.DEBUG_ALL) {
    console.log('\n🔧 [CONFIG] Proxy Server Configuration:');
    console.log('   - Environment:', serverConfig.environment);
    console.log('   - Server:', `${serverConfig.host}:${serverConfig.port}`);
    console.log('   - API Server:', servicesConfig.api.url);
    console.log('   - Documents Server:', servicesConfig.documents.url);
    console.log('   - Frontend:', servicesConfig.frontend.url);
    console.log('   - Database:', databaseConfig.url ? '✅ Configured' : '❌ Missing');
    console.log('   - CORS Origin:', corsConfig.origin);
    console.log('   - Debug Enabled:', loggingConfig.debug.enabled);
    console.log('   - GDPR Enabled:', gdprConfig.enabled);
    console.log('');
  }
}

export default {
  serverConfig,
  servicesConfig,
  databaseConfig,
  corsConfig,
  rateLimitConfig,
  bodyParserConfig,
  securityConfig,
  loggingConfig,
  healthConfig,
  gdprConfig,
  exemptPaths,
  validateConfig,
  getConfig,
  printConfig
};