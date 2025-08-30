# 📋 Planning Dettagliato - Backend Optimization

**Data**: 13 Gennaio 2025  
**Progetto**: Backend Optimization & Restructure

## 🎯 Strategia di Implementazione

### 🔄 Metodologia
1. **Incrementale**: Modifiche graduali per mantenere stabilità
2. **Test-Driven**: Verifica login dopo ogni fase
3. **Backup-Safe**: Backup prima di modifiche critiche
4. **Documentation-First**: Aggiornamento docs in parallelo

## 📅 Fasi di Implementazione

### **FASE 1: Pulizia e Riorganizzazione** 🧹
**Durata**: 30 minuti  
**Rischio**: Basso

#### 1.1 Rimozione File Temporanei
```bash
# File da rimuovere dalla root backend/
❌ api_login_response.json
❌ cookies.txt
❌ debug_api_test.py
❌ direct_api_tenants_test.json
❌ final_test_tenants.json
❌ login_response.json
❌ login_test.json
❌ proxy_tenants_test.json
❌ test_endpoints.js
❌ test_login_debug.js
```

#### 1.2 Gestione File Dubbi
```bash
🔍 database.db          # Verificare se necessario
🔍 prisma.schema        # Verificare se duplicato
🔍 start-servers.sh     # Spostare in scripts/
```

#### 1.3 Spostamento Documentazione
```bash
# Da: backend/docs/
# A: docs/technical/backend/

📁 backend/docs/proxy-server/ → docs/technical/backend/proxy-server/
📄 backend/docs/*.md → docs/technical/backend/optimization-reports/
```

#### 1.4 Organizzazione Scripts
```bash
# Creare sottocartelle in backend/scripts/
📁 scripts/
├── migrations/          # Script SQL e migrazione
├── setup/              # Script setup e inizializzazione
├── testing/            # Script di test
├── maintenance/        # Script manutenzione
└── archived/           # Script obsoleti
```

#### 1.5 Pulizia Backup
```bash
# Mantenere solo backup recenti (ultimi 30 giorni)
📁 backups/
├── current/            # Backup attuali
└── archived/           # Backup vecchi (compressi)
```

**Test Fase 1**: ✅ Verifica login funzionante

---

### **FASE 2: Modularizzazione Configurazioni** ⚙️
**Durata**: 45 minuti  
**Rischio**: Medio

#### 2.1 Centralizzazione CORS
```javascript
// Nuovo file: config/cors.js
export const corsConfig = {
  development: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
  },
  production: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
  }
};
```

#### 2.2 Factory Body Parsers
```javascript
// Nuovo file: config/bodyParser.js
export const createBodyParsers = (options = {}) => {
  const defaultOptions = {
    jsonLimit: '50mb',
    urlencodedLimit: '50mb',
    extended: true
  };
  
  const config = { ...defaultOptions, ...options };
  
  return {
    json: bodyParser.json({ limit: config.jsonLimit }),
    urlencoded: bodyParser.urlencoded({ 
      extended: config.extended, 
      limit: config.urlencodedLimit 
    })
  };
};
```

#### 2.3 Centralizzazione Multer
```javascript
// Nuovo file: config/multer.js
export const createMulterConfig = (options = {}) => {
  const defaultOptions = {
    destination: 'uploads',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['image/*', 'application/pdf', 'text/*']
  };
  
  const config = { ...defaultOptions, ...options };
  
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), config.destination);
        mkdirp.sync(uploadPath);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: config.maxFileSize }
  });
};
```

**Test Fase 2**: ✅ Verifica login e upload funzionanti

---

### **FASE 3: Modularizzazione Middleware** 🔧
**Durata**: 60 minuti  
**Rischio**: Medio-Alto

#### 3.1 Middleware Manager
```javascript
// Nuovo file: middleware/index.js
export class MiddlewareManager {
  constructor(app) {
    this.app = app;
    this.middlewares = new Map();
  }
  
  register(name, middleware, options = {}) {
    this.middlewares.set(name, { middleware, options });
    return this;
  }
  
  apply(middlewareNames) {
    middlewareNames.forEach(name => {
      const { middleware, options } = this.middlewares.get(name);
      if (options.condition && !options.condition()) return;
      this.app.use(middleware);
    });
    return this;
  }
}
```

#### 3.2 Rate Limiting Configurabile
```javascript
// Nuovo file: middleware/rateLimiting.js
import rateLimit from 'express-rate-limit';

export const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 1000, // Alto per sviluppo
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false
  };
  
  return rateLimit({ ...defaultOptions, ...options });
};

// Rate limiter specifici
export const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 tentativi login per 15 min
  message: 'Too many login attempts'
});

export const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000 // Generale alto per sviluppo
});
```

#### 3.3 Error Handler Unificato
```javascript
// Aggiornamento: middleware/errorHandler.js
export class ErrorHandlerFactory {
  static createAsyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
  
  static createGlobalHandler(options = {}) {
    return (err, req, res, next) => {
      logger.error('Global error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      
      if (res.headersSent) {
        return next(err);
      }
      
      const statusCode = err.statusCode || err.status || 500;
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;
      
      res.status(statusCode).json({
        error: true,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      });
    };
  }
}
```

**Test Fase 3**: ✅ Verifica login, rate limiting e error handling

---

### **FASE 4: Versioning API e Route Organization** 🗂️
**Durata**: 45 minuti  
**Rischio**: Alto

#### 4.1 API Version Manager
```javascript
// Nuovo file: routes/versionManager.js
export class APIVersionManager {
  constructor(app) {
    this.app = app;
    this.versions = new Map();
  }
  
  registerVersion(version, routes, options = {}) {
    const prefix = options.prefix || `/api/${version}`;
    this.versions.set(version, { routes, prefix, options });
    return this;
  }
  
  mountRoutes() {
    this.versions.forEach(({ routes, prefix, options }) => {
      if (options.deprecated) {
        this.app.use(prefix, this.deprecationWarning);
      }
      this.app.use(prefix, routes);
    });
  }
  
  deprecationWarning(req, res, next) {
    res.set('X-API-Deprecated', 'true');
    res.set('X-API-Sunset', '2025-12-31');
    next();
  }
}
```

#### 4.2 Route Consolidation
```javascript
// Aggiornamento api-server.js - sezione route mounting
const versionManager = new APIVersionManager(app);

// V1 Routes (legacy, deprecated)
versionManager.registerVersion('v1', {
  '/auth': authV1Routes,
  '/permissions': permissionsV1Routes
}, { deprecated: true });

// V2 Routes (current)
versionManager.registerVersion('v2', {
  '/auth': authRoutes,
  '/persons': personRoutes,
  '/companies': companiesRoutes,
  '/roles': rolesRoutes,
  '/tenants': tenantsRoutes
});

// Legacy routes (backward compatibility)
app.use('/api/auth', authV1Routes); // Redirect to v1
app.use('/courses', coursesRoutes);
app.use('/employees', employeesRoutes);
app.use('/schedules', schedulesRoutes);

versionManager.mountRoutes();
```

**Test Fase 4**: ✅ Verifica tutte le route funzionanti

---

### **FASE 5: Health Check Esteso e Monitoring** 📊
**Durata**: 30 minuti  
**Rischio**: Basso

#### 5.1 Health Check Esteso
```javascript
// Nuovo file: handlers/healthCheck.js
export class HealthCheckManager {
  constructor() {
    this.checks = new Map();
  }
  
  addCheck(name, checkFunction, options = {}) {
    this.checks.set(name, { checkFunction, options });
  }
  
  async runChecks() {
    const results = {};
    let overallStatus = 'healthy';
    
    for (const [name, { checkFunction, options }] of this.checks) {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          checkFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), options.timeout || 5000)
          )
        ]);
        
        results[name] = {
          status: 'healthy',
          responseTime: Date.now() - startTime,
          details: result
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message
        };
        overallStatus = 'unhealthy';
      }
    }
    
    return { status: overallStatus, checks: results };
  }
}

// Implementazione /healthz
export const createHealthzEndpoint = (healthManager) => {
  return async (req, res) => {
    const health = await healthManager.runChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      ...health,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  };
};
```

#### 5.2 Lifecycle Manager
```javascript
// Nuovo file: services/lifecycleManager.js
export class LifecycleManager {
  constructor() {
    this.services = new Map();
    this.shutdownHandlers = [];
  }
  
  registerService(name, service) {
    this.services.set(name, service);
  }
  
  async initializeServices() {
    for (const [name, service] of this.services) {
      try {
        if (service.initialize) {
          await service.initialize();
          logger.info(`✅ ${name} initialized`);
        }
      } catch (error) {
        logger.error(`❌ Failed to initialize ${name}:`, error);
        throw error;
      }
    }
  }
  
  async shutdown() {
    for (const handler of this.shutdownHandlers) {
      try {
        await handler();
      } catch (error) {
        logger.error('Shutdown handler error:', error);
      }
    }
    
    for (const [name, service] of this.services) {
      try {
        if (service.shutdown) {
          await service.shutdown();
          logger.info(`✅ ${name} shut down`);
        }
      } catch (error) {
        logger.error(`❌ Error shutting down ${name}:`, error);
      }
    }
  }
  
  onShutdown(handler) {
    this.shutdownHandlers.push(handler);
  }
}
```

**Test Fase 5**: ✅ Verifica /health e /healthz funzionanti

---

### **FASE 6: Sicurezza e Validazione** 🔒
**Durata**: 45 minuti  
**Rischio**: Medio

#### 6.1 Helmet e CSP
```javascript
// Nuovo file: middleware/security.js
import helmet from 'helmet';

export const createSecurityMiddleware = (options = {}) => {
  const defaultOptions = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false // Per compatibilità sviluppo
  };
  
  return helmet({ ...defaultOptions, ...options });
};
```

#### 6.2 Validazione Input con Zod
```javascript
// Nuovo file: middleware/validation.js
import { z } from 'zod';

export const createValidationMiddleware = (schema, target = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[target];
      const validated = schema.parse(data);
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
};

// Schema comuni
export const schemas = {
  login: z.object({
    identifier: z.string().email().or(z.string().min(3)),
    password: z.string().min(6)
  }),
  
  person: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional()
  })
};
```

**Test Fase 6**: ✅ Verifica sicurezza e validazione

---

### **FASE 7: Refactoring API Server** 🏗️
**Durata**: 60 minuti  
**Rischio**: Alto

#### 7.1 Nuovo api-server.js Modulare
```javascript
// api-server.js refactored (< 200 righe)
import express from 'express';
import { LifecycleManager } from './services/lifecycleManager.js';
import { MiddlewareManager } from './middleware/index.js';
import { APIVersionManager } from './routes/versionManager.js';
import { HealthCheckManager, createHealthzEndpoint } from './handlers/healthCheck.js';
import { createGracefulShutdown } from './handlers/gracefulShutdown.js';
import { setupMiddlewares } from './config/middlewares.js';
import { setupRoutes } from './config/routes.js';
import { setupServices } from './config/services.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 4001;

// Initialize managers
const lifecycleManager = new LifecycleManager();
const middlewareManager = new MiddlewareManager(app);
const versionManager = new APIVersionManager(app);
const healthManager = new HealthCheckManager();

// Setup application
setupServices(lifecycleManager, healthManager);
setupMiddlewares(middlewareManager);
setupRoutes(versionManager);

// Health endpoints
app.get('/health', createHealthzEndpoint(healthManager));
app.get('/healthz', createHealthzEndpoint(healthManager));

// Start server
const startServer = async () => {
  try {
    await lifecycleManager.initializeServices();
    
    const server = app.listen(PORT, '127.0.0.1', () => {
      logger.info('🚀 API Server running', { port: PORT });
    });
    
    // Setup graceful shutdown
    createGracefulShutdown(server, lifecycleManager);
    
    return server;
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
export default app;
```

**Test Fase 7**: ✅ Verifica completa funzionalità

---

### **FASE 8: Aggiornamento Documentazione** 📚
**Durata**: 30 minuti  
**Rischio**: Basso

#### 8.1 Aggiornamento Project Rules
#### 8.2 Documentazione Architettura
#### 8.3 Guide Sviluppatore

---

### **FASE 9: Test Finale e Validazione** ✅
**Durata**: 30 minuti  
**Rischio**: Basso

#### 9.1 Test Login Completo
#### 9.2 Test API Endpoints
#### 9.3 Test Performance
#### 9.4 Verifica GDPR Compliance

---

## 🚨 Piano di Rollback

### Backup Pre-Implementazione
```bash
# Backup completo prima di iniziare
cp -r backend/ backend-backup-$(date +%Y%m%d-%H%M%S)/
```

### Rollback per Fase
- **Fase 1-2**: Ripristino file
- **Fase 3-4**: Ripristino api-server.js
- **Fase 5-7**: Ripristino completo

## ⏱️ Timeline Totale

**Durata Stimata**: 5-6 ore  
**Durata con Test**: 7-8 ore  
**Buffer Sicurezza**: +2 ore  

**Timeline Consigliata**: 2 giorni lavorativi

---

**Prossimo Step**: Implementazione Fase 1