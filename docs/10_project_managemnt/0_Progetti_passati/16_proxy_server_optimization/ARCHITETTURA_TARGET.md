# 🏗️ Architettura Target - Proxy Server Modularizzato

**Data**: 2025-01-27  
**Progetto**: Ottimizzazione e Modularizzazione Proxy Server  
**Versione**: 1.0  

## 🎯 Visione Architetturale

### Principi Guida
- **Modularità**: Ogni responsabilità in un modulo separato
- **Riusabilità**: Componenti condivisi e configurabili
- **Manutenibilità**: Codice pulito e ben documentato
- **Performance**: Ottimizzazioni per ridurre overhead
- **Sicurezza**: Best practices integrate
- **Testabilità**: Architettura test-friendly

## 📁 Struttura Target

```
backend/
├── proxy-server.js                 # Entry point principale (< 200 righe)
├── proxy/                          # Moduli proxy
│   ├── config/
│   │   ├── cors.js                 # Configurazione CORS centralizzata
│   │   ├── targets.js              # Target servers configuration
│   │   └── routes.js               # Route mapping configuration
│   ├── middleware/
│   │   ├── security.js             # Helmet + CSP configuration
│   │   ├── rateLimiting.js         # Rate limiting centralizzato
│   │   ├── logging.js              # Logging condizionale
│   │   ├── bodyParser.js           # JSON parser riutilizzabile
│   │   ├── authentication.js      # Auth middleware wrapper
│   │   └── errorHandling.js        # Error handling factory
│   ├── handlers/
│   │   ├── proxyFactory.js         # Factory per proxy middleware
│   │   ├── optionsHandler.js       # CORS preflight handler
│   │   └── healthCheck.js          # Health check avanzato
│   ├── routes/
│   │   ├── localRoutes.js          # Endpoint locali (courses, etc.)
│   │   ├── proxyRoutes.js          # Configurazione route proxy
│   │   └── testRoutes.js           # Endpoint di test
│   └── utils/
│       ├── gracefulShutdown.js     # Shutdown handler DRY
│       ├── debugLogger.js          # Debug logging condizionale
│       └── validators.js           # Input validation helpers
└── config/
    └── environment.js              # Environment configuration
```

## 🔧 Moduli Dettagliati

### 1. **proxy/config/cors.js**
```javascript
/**
 * Configurazione CORS centralizzata
 * Elimina duplicazione di 6+ handler OPTIONS
 */
export const corsConfig = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'x-tenant-id',
    'X-Tenant-ID',
    'cache-control',
    'pragma',
    'expires'
  ]
};

export function configureCorsOptions(customOptions = {}) {
  return { ...corsConfig, ...customOptions };
}

export function createOptionsHandler(path) {
  return (req, res) => {
    if (process.env.DEBUG_CORS) {
      console.log(`🚨 [CORS OPTIONS] ${path}:`, req.originalUrl);
    }
    
    Object.entries(corsConfig).forEach(([key, value]) => {
      if (key === 'origin') res.header('Access-Control-Allow-Origin', value);
      if (key === 'methods') res.header('Access-Control-Allow-Methods', value.join(','));
      if (key === 'allowedHeaders') res.header('Access-Control-Allow-Headers', value.join(','));
      if (key === 'credentials') res.header('Access-Control-Allow-Credentials', 'true');
    });
    
    res.status(200).end();
  };
}
```

### 2. **proxy/middleware/rateLimiting.js**
```javascript
/**
 * Rate limiting centralizzato con esenzioni configurabili
 */
import rateLimit from 'express-rate-limit';
import { logger } from '../../utils/logger.js';

const EXEMPT_PATHS = [
  '/api/tenants',
  '/api/roles',
  '/health',
  '/healthz'
];

const EXEMPT_METHODS = ['OPTIONS'];

export function createRateLimiter(options = {}) {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 100,
    message: {
      error: 'Too many requests from this IP',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip per metodi esenti
      if (EXEMPT_METHODS.includes(req.method)) {
        if (process.env.DEBUG_RATE_LIMIT) {
          console.log(`🔍 [RATE LIMITER] Skipping ${req.method}:`, req.originalUrl);
        }
        return true;
      }
      
      // Skip per path esenti
      const isExempt = EXEMPT_PATHS.some(path => 
        req.originalUrl.includes(path) || req.path.includes(path)
      );
      
      if (isExempt && process.env.DEBUG_RATE_LIMIT) {
        console.log(`🔍 [RATE LIMITER] Skipping exempt path:`, req.originalUrl);
      }
      
      return isExempt;
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        service: 'proxy-server',
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
      });
    }
  };
  
  return rateLimit({ ...defaultOptions, ...options });
}

// Rate limiter specifico per login
export function createLoginRateLimiter() {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Solo 5 tentativi di login per IP
    message: {
      error: 'Too many login attempts',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    }
  });
}

// Rate limiter per API
export function createApiRateLimiter() {
  return createRateLimiter({
    max: process.env.NODE_ENV === 'development' ? 1000 : 200,
    message: {
      error: 'Too many API requests from this IP',
      code: 'API_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    }
  });
}
```

### 3. **proxy/middleware/logging.js**
```javascript
/**
 * Logging condizionale con debug flags
 */
import debug from 'debug';
import { logger } from '../../utils/logger.js';

// Debug namespaces
const debugProxy = debug('proxy:middleware');
const debugCors = debug('proxy:cors');
const debugAuth = debug('proxy:auth');
const debugRateLimit = debug('proxy:ratelimit');

export function createDebugLogger(namespace) {
  return debug(`proxy:${namespace}`);
}

export function logProxyRequest(namespace = 'general') {
  const debugLog = createDebugLogger(namespace);
  
  return (req, res, next) => {
    if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
      debugLog('Request:', {
        method: req.method,
        url: req.url,
        path: req.path,
        originalUrl: req.originalUrl,
        headers: process.env.DEBUG_HEADERS ? req.headers : undefined
      });
    }
    
    next();
  };
}

export function logProxyResponse(namespace = 'general') {
  const debugLog = createDebugLogger(namespace);
  
  return (req, res, next) => {
    if (process.env.DEBUG_PROXY || process.env.DEBUG_ALL) {
      const originalSend = res.send;
      res.send = function(data) {
        debugLog('Response:', {
          statusCode: res.statusCode,
          path: req.path,
          dataLength: data ? data.length : 0
        });
        return originalSend.call(this, data);
      };
    }
    
    next();
  };
}

// Middleware per tracciamento path (solo se DEBUG_PATH attivo)
export function createPathTracker() {
  return (req, res, next) => {
    if (process.env.DEBUG_PATH) {
      console.log('🔍 [PATH TRACE]:', {
        method: req.method,
        url: req.url,
        path: req.path,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl
      });
    }
    next();
  };
}
```

### 4. **proxy/middleware/bodyParser.js**
```javascript
/**
 * Body parser riutilizzabile
 */
import bodyParser from 'body-parser';

const DEFAULT_LIMIT = '50mb';

export function createJsonParser(options = {}) {
  return bodyParser.json({ 
    limit: DEFAULT_LIMIT,
    ...options 
  });
}

export function createUrlEncodedParser(options = {}) {
  return bodyParser.urlencoded({ 
    extended: true,
    limit: DEFAULT_LIMIT,
    ...options 
  });
}

// Middleware combinato per endpoint che necessitano entrambi
export function createBodyParsers(options = {}) {
  return [
    createJsonParser(options),
    createUrlEncodedParser(options)
  ];
}

// Parser specifico per upload di grandi dimensioni
export function createLargeBodyParser(limit = '100mb') {
  return createBodyParsers({ limit });
}
```

### 5. **proxy/handlers/proxyFactory.js**
```javascript
/**
 * Factory per creare proxy middleware standardizzati
 */
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../../utils/logger.js';
import { createDebugLogger } from '../middleware/logging.js';

export function createStandardProxy(config) {
  const {
    target,
    pathRewrite = {},
    timeout = 30000,
    namespace = 'general',
    skipRateLimit = false
  } = config;
  
  const debugLog = createDebugLogger(namespace);
  
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    timeout,
    proxyTimeout: timeout,
    pathRewrite,
    
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${namespace}`, {
        service: 'proxy-server',
        error: err.message,
        path: req.path,
        target
      });
      
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Proxy error',
          message: err.message,
          code: 'PROXY_ERROR'
        });
      }
    },
    
    onProxyReq: (proxyReq, req, res) => {
      if (process.env.DEBUG_PROXY) {
        debugLog('Proxying request:', {
          originalPath: req.path,
          originalUrl: req.url,
          targetPath: proxyReq.path,
          fullTarget: `${target}${proxyReq.path}`
        });
      }
      
      logger.info(`Proxying ${namespace} request`, {
        service: 'proxy-server',
        method: req.method,
        originalPath: req.path,
        originalUrl: req.url,
        targetPath: proxyReq.path
      });
    },
    
    onProxyRes: (proxyRes, req, res) => {
      if (process.env.DEBUG_PROXY) {
        debugLog('Proxy response:', {
          statusCode: proxyRes.statusCode,
          path: req.path
        });
      }
    }
  });
}

// Factory per proxy API standard
export function createApiProxy(path, pathRewrite = {}) {
  return createStandardProxy({
    target: process.env.API_SERVER_URL || 'http://127.0.0.1:4001',
    pathRewrite,
    namespace: path.replace(/[^a-zA-Z0-9]/g, '_'),
    timeout: 30000
  });
}

// Factory per proxy Documents
export function createDocumentsProxy() {
  return createStandardProxy({
    target: process.env.DOCUMENTS_SERVER_URL || 'http://127.0.0.1:4002',
    namespace: 'documents',
    timeout: 60000 // Timeout più lungo per documenti
  });
}
```

### 6. **proxy/handlers/healthCheck.js**
```javascript
/**
 * Health check avanzato con controlli multipli
 */
import axios from 'axios';
import { logger } from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

const HEALTH_TIMEOUT = 5000;

export async function createAdvancedHealthCheck() {
  return async (req, res) => {
    const startTime = Date.now();
    const checks = {
      api: false,
      database: false,
      documents: false,
      auth: false
    };
    
    const errors = [];
    
    try {
      // Check API Server
      try {
        const apiResponse = await axios.get(
          `${process.env.API_SERVER_URL || 'http://127.0.0.1:4001'}/health`,
          { timeout: HEALTH_TIMEOUT }
        );
        checks.api = apiResponse.status === 200;
      } catch (error) {
        errors.push(`API Server: ${error.message}`);
      }
      
      // Check Database
      try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = true;
      } catch (error) {
        errors.push(`Database: ${error.message}`);
      }
      
      // Check Documents Server (optional)
      try {
        const docsResponse = await axios.get(
          `${process.env.DOCUMENTS_SERVER_URL || 'http://127.0.0.1:4002'}/health`,
          { timeout: HEALTH_TIMEOUT }
        );
        checks.documents = docsResponse.status === 200;
      } catch (error) {
        // Documents server è opzionale
        checks.documents = false;
      }
      
      // Check Auth System
      try {
        // Verifica che il sistema di auth sia inizializzato
        checks.auth = true; // Placeholder - implementare check specifico
      } catch (error) {
        errors.push(`Auth System: ${error.message}`);
      }
      
      const responseTime = Date.now() - startTime;
      const isHealthy = checks.api && checks.database && checks.auth;
      
      const healthData = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        checks,
        errors: errors.length > 0 ? errors : undefined,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
      
      if (isHealthy) {
        res.json(healthData);
      } else {
        logger.error('Health check failed', {
          service: 'proxy-server',
          checks,
          errors
        });
        res.status(503).json(healthData);
      }
      
    } catch (error) {
      logger.error('Health check error', {
        service: 'proxy-server',
        error: error.message
      });
      
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Health check semplice per compatibilità
export async function createSimpleHealthCheck() {
  return async (req, res) => {
    try {
      const apiResponse = await axios.get(
        `${process.env.API_SERVER_URL || 'http://127.0.0.1:4001'}/health`,
        { timeout: HEALTH_TIMEOUT }
      );
      res.json(apiResponse.data);
    } catch (error) {
      logger.error('Health check failed', {
        service: 'proxy-server',
        error: error.message
      });
      res.status(503).json({
        status: 'unhealthy',
        error: 'API server not responding',
        timestamp: new Date().toISOString()
      });
    }
  };
}
```

### 7. **proxy/utils/gracefulShutdown.js**
```javascript
/**
 * Graceful shutdown DRY implementation
 */
import { logger } from '../../utils/logger.js';
import { shutdownAuth } from '../../auth/index.js';
import loadBalancer from '../../utils/loadBalancer.js';

export function createGracefulShutdown(server) {
  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`, {
      service: 'proxy-server'
    });
    
    try {
      // Chiudi il server HTTP
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Cleanup risorse
      await Promise.all([
        loadBalancer.stopHealthChecks(),
        shutdownAuth()
      ]);
      
      logger.info('Proxy Server shutdown complete', {
        service: 'proxy-server'
      });
      
      process.exit(0);
      
    } catch (error) {
      logger.error('Error during shutdown', {
        service: 'proxy-server',
        error: error.message,
        stack: error.stack
      });
      
      process.exit(1);
    }
  };
  
  return shutdown;
}

export function setupGracefulShutdown(server) {
  const shutdown = createGracefulShutdown(server);
  
  if (process.env.NODE_ENV === 'production') {
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    logger.info('Graceful shutdown handlers registered for production', {
      service: 'proxy-server'
    });
  } else {
    // Development mode: Log ma non fare shutdown
    process.on('SIGTERM', () => {
      logger.info('🔧 SIGTERM ignored in development mode', {
        service: 'proxy-server'
      });
    });
    
    process.on('SIGINT', () => {
      logger.info('🔧 SIGINT ignored in development mode', {
        service: 'proxy-server'
      });
    });
    
    logger.info('🔧 Development mode: SIGINT/SIGTERM signals will be ignored', {
      service: 'proxy-server'
    });
  }
}
```

## 🔒 Security Enhancements

### CSP Esteso
```javascript
// proxy/middleware/security.js
export const enhancedCSP = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};
```

## 📊 Metriche Target

| Metrica | Valore Attuale | Target | Miglioramento |
|---------|----------------|--------|---------------|
| Righe di codice | 1392 | <800 | -42% |
| File modulari | 1 | 15+ | +1400% |
| Middleware duplicati | 15+ | 0 | -100% |
| Console.log fissi | 50+ | 0 | -100% |
| Configurazioni hardcoded | 20+ | 0 | -100% |
| Test coverage | 0% | 80%+ | +80% |
| Startup time | ~2s | <1s | -50% |
| Memory usage | ~150MB | <120MB | -20% |

## 🚀 Benefici Architetturali

### Manutenibilità
- **Separazione responsabilità**: Ogni modulo ha una funzione specifica
- **Configurazione centralizzata**: Modifiche in un solo punto
- **Codice riutilizzabile**: Factory e helper condivisi

### Performance
- **Lazy loading**: Moduli caricati solo quando necessari
- **Caching intelligente**: Configurazioni cachate
- **Logging condizionale**: Overhead ridotto in produzione

### Sicurezza
- **CSP avanzato**: Protezione XSS migliorata
- **Rate limiting intelligente**: Protezione DDoS
- **HTTPS/HSTS**: Comunicazioni sicure

### Testabilità
- **Moduli isolati**: Test unitari semplificati
- **Dependency injection**: Mock e stub facili
- **Factory pattern**: Test di integrazione

---

**Prossimo Step**: Implementazione graduale con roadmap dettagliata