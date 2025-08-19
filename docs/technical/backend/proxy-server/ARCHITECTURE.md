# Architettura del Proxy Server - Sistema Routing Avanzato

## Panoramica Architetturale

Il proxy server ottimizzato implementa un **Sistema di Routing Avanzato** con architettura modulare basata su middleware componibili, versioning API centralizzato e diagnostica real-time.

## Principi di Design

### 1. Routing Centralizzato
- **RouterMap unificata** per configurazione dichiarativa
- **Versioning API automatico** (`/api/v1`, `/api/v2`)
- **Legacy redirects** trasparenti (`/login` → `/api/v1/auth/login`)
- **Path rewrite intelligente** con prevenzione duplicazioni

### 2. Modularità Avanzata
- Ogni funzionalità è isolata in moduli specifici
- **AdvancedRoutingSystem** come orchestratore centrale
- Interfacce chiare tra i componenti
- Riutilizzabilità dei middleware
- Configurazione centralizzata in RouterMap

### 3. Sicurezza by Design
- Security headers di default
- **Rate limiting dinamico** per tipo endpoint
- **CORS dinamico** basato su pattern
- Validazione dell'input
- Logging di sicurezza con Request ID

### 4. Osservabilità Avanzata
- **Logging unificato** con Request ID tracking
- **Endpoint diagnostici** (`/routes`, `/routes/health`, `/routes/stats`)
- Metriche di performance real-time
- Health checks completi
- Debug condizionale per componente

### 5. Resilienza
- Graceful shutdown
- Error handling robusto
- Circuit breaker pattern
- Retry logic per proxy

## Architettura Sistema Routing

### Flusso delle Richieste
```
Frontend (5173) → Proxy Server (4003) → API Server (4001)
                                     → Documents Server (4002)
```

### Middleware Stack Ottimizzato
1. **Raw Body Preservation** - Preserva body per proxy
2. **Request Logger** - Logging con Request ID
3. **Route Validation** - Validazione path e sicurezza
4. **Dynamic CORS** - CORS basato su pattern RouterMap
5. **Body Parsing** - Parsing intelligente per tipo richiesta
6. **Body Debug** - Debug condizionale body
7. **Dynamic Rate Limiting** - Rate limiting per tipo endpoint
8. **Version Resolution** - Risoluzione automatica versione API
9. **Legacy Redirects** - Redirect automatici route legacy
10. **Diagnostic Routes** - Endpoint diagnostici
11. **Static Routes** - Route statiche (health, metrics)
12. **Dynamic Proxy** - Proxy dinamico basato su RouterMap

## Componenti Principali

### AdvancedRoutingSystem (`routing/index.js`)

```javascript
// Sistema di routing centralizzato
class AdvancedRoutingSystem {
  constructor(app, options = {}) {
    this.app = app;
    this.routerMap = new RouterMap();
    this.versionManager = new VersionManager();
    this.proxyManager = new ProxyManager();
    this.routeLogger = new RouteLogger();
  }
  
  async initialize() {
    await this.setupMiddleware();
    await this.validateConfiguration();
    await this.startHealthChecks();
  }
  
  setupMiddleware() {
    // 12 middleware in ordine ottimizzato
    this.app.use(this.createRawBodyPreservation());
    this.app.use(this.createRequestLogger());
    this.app.use(this.createRouteValidation());
    this.app.use(this.createDynamicCors());
    this.app.use(this.createBodyParsing());
    this.app.use(this.createBodyDebug());
    this.app.use(this.createDynamicRateLimit());
    this.app.use(this.createVersionResolution());
    this.app.use(this.createLegacyRedirects());
    this.app.use(this.createDiagnosticRoutes());
    this.app.use(this.createStaticRoutes());
    this.app.use(this.createDynamicProxy());
  }
}
```

### RouterMap Centralizzata (`routing/core/RouterMap.js`)

```javascript
// Configurazione centralizzata di tutti i servizi e route
class RouterMap {
  constructor() {
    this.services = {
      api: { host: 'localhost', port: 4001, protocol: 'http' },
      documents: { host: 'localhost', port: 4002, protocol: 'http' },
      auth: { host: 'localhost', port: 4001, protocol: 'http' }
    };
    
    this.versions = {
      current: 'v2',
      supported: ['v1', 'v2'],
      deprecated: ['v1'],
      default: 'v1'
    };
    
    this.routes = {
      v1: {
        '/auth/*': { target: 'api', pathRewrite: { '^/auth': '/api/v1/auth' } },
        '/users/*': { target: 'api', pathRewrite: { '^/users': '/api/v1/users' } },
        // ... altre route v1
      },
      v2: {
        '/auth/*': { target: 'api', pathRewrite: { '^/auth': '/api/v2/auth' } },
        // ... route v2
      }
    };
    
    this.legacy = {
      '/login': { redirect: '/api/v1/auth/login', permanent: false },
      '/logout': { redirect: '/api/v1/auth/logout', permanent: false },
      '/register': { redirect: '/api/v1/auth/register', permanent: false }
    };
  }
}
```

### VersionManager (`routing/core/VersionManager.js`)

```javascript
// Gestione automatica versioning API
class VersionManager {
  resolveVersion(req) {
    // Priorità: x-api-version header > path > query param > default
    const headerVersion = req.headers['x-api-version'];
    const pathVersion = this.extractVersionFromPath(req.path);
    const queryVersion = req.query.version;
    
    return headerVersion || pathVersion || queryVersion || this.defaultVersion;
  }
  
  createVersionMiddleware() {
    return (req, res, next) => {
      const resolvedVersion = this.resolveVersion(req);
      req.apiVersion = resolvedVersion;
      res.set('x-api-version', resolvedVersion);
      next();
    };
  }
}
```

### ProxyManager (`routing/core/ProxyManager.js`)

```javascript
// Gestione proxy dinamica basata su RouterMap
class ProxyManager {
  createProxyForService(serviceName, serviceConfig) {
    return createProxyMiddleware({
      target: `${serviceConfig.protocol}://${serviceConfig.host}:${serviceConfig.port}`,
      changeOrigin: true,
      pathRewrite: serviceConfig.pathRewrite || {},
      onProxyReq: this.createProxyRequestHandler(serviceName),
      onProxyRes: this.createProxyResponseHandler(serviceName),
      onError: this.createProxyErrorHandler(serviceName)
    });
  }
}
```

### RouteLogger (`routing/core/RouteLogger.js`)

```javascript
// Logging unificato con Request ID
class RouteLogger {
  createRequestLogger() {
    return (req, res, next) => {
      req.requestId = this.generateRequestId();
      const startTime = Date.now();
      
      this.logRequest(req);
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logResponse(req, res, duration);
      });
      
      next();
    };
  }
}
```

## Endpoint Diagnostici

### `/routes` - Informazioni Complete
```json
{
  "system": {
    "status": "healthy",
    "uptime": "2h 15m 30s",
    "version": "2.0.0",
    "environment": "production"
  },
  "services": {
    "api": { "status": "healthy", "responseTime": "45ms" },
    "documents": { "status": "healthy", "responseTime": "32ms" }
  },
  "routes": {
    "active": 25,
    "v1": 12,
    "v2": 8,
    "legacy": 5
  },
  "stats": {
    "totalRequests": 1547,
    "requestsPerMinute": 23.5,
    "averageResponseTime": "89ms"
  }
}
```

### `/routes/health` - Health Check Servizi
```json
{
  "api": { "status": "healthy", "responseTime": "45ms" },
  "documents": { "status": "healthy", "responseTime": "32ms" },
  "database": { "status": "healthy", "responseTime": "12ms" }
}
```

### `/routes/stats` - Statistiche Real-time
```json
{
  "requests": {
    "total": 1547,
    "perMinute": 23.5,
    "perHour": 1410
  },
  "performance": {
    "averageResponseTime": "89ms",
    "slowestEndpoint": "/api/v1/reports/generate",
    "fastestEndpoint": "/api/v1/health"
  },
  "errors": {
    "rate": "0.2%",
    "total": 3,
    "lastError": "2025-01-21T10:30:00Z"
  }
}
```

## Caratteristiche Avanzate

### 1. Rate Limiting Dinamico
- **Auth endpoints**: 5 req/15min (produzione), 20 req/15min (sviluppo)
- **API endpoints**: 50 req/15min
- **Upload endpoints**: 10 req/15min
- **General**: 100 req/15min

### 2. CORS Dinamico
- Configurazione per pattern in RouterMap
- Gestione preflight automatica
- Politiche specifiche per endpoint

### 3. Legacy Compatibility
- Redirect automatici trasparenti
- Supporto URL legacy senza breaking changes
- Preservazione SEO per route pubbliche

### 4. Performance Monitoring
- Request ID tracking end-to-end
- Timing dettagliato per ogni middleware
- Identificazione automatica richieste lente
- Statistiche aggregate real-time

## Componenti Principali

### Server Core (`proxy-server.js`)

```javascript
// Struttura principale del server
class ProxyServer {
  constructor(config) {
    this.app = express();
    this.server = null;
    this.config = config;
  }
  
  async initialize() {
    await this.setupMiddleware();
    await this.setupRoutes();
    await this.setupErrorHandling();
  }
  
  async start() {
    this.server = this.app.listen(this.config.port);
    this.setupGracefulShutdown();
  }
}
```

### Middleware Layer

#### Security Middleware (`middleware/security.js`)

```javascript
// Factory function per middleware di sicurezza
export function createSecurityMiddleware(options = {}) {
  return {
    helmet: createHelmetMiddleware(options.helmet),
    cors: createSecureCorsMiddleware(options.cors),
    rateLimiter: createSecurityRateLimiter(options.rateLimit),
    inputValidator: createInputValidationMiddleware(options.validation),
    securityLogger: createSecurityLogger(options.logging)
  };
}
```

**Caratteristiche:**
- Helmet con configurazione CSP estesa
- HSTS per HTTPS enforcement
- Rate limiting con cleanup automatico
- Validazione Content-Type e Content-Length
- Logging di richieste sospette

#### CORS Middleware (`middleware/cors.js`)

```javascript
// Configurazione CORS dinamica
export function configureCorsOptions(environment) {
  const allowedOrigins = {
    development: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173'
    ],
    production: [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL
    ].filter(Boolean)
  };
  
  return {
    origin: allowedOrigins[environment] || allowedOrigins.development,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
    maxAge: 86400 // 24 ore
  };
}
```

#### Rate Limiting (`middleware/rateLimiting.js`)

```javascript
// Sistema di rate limiting a più livelli
const rateLimiters = {
  general: createGeneralRateLimiter(),
  api: createApiRateLimiter(),
  login: createLoginRateLimiter(),
  upload: createUploadRateLimiter()
};

// Middleware intelligente che seleziona il limiter appropriato
export function smartRateLimitMiddleware(req, res, next) {
  const limiter = selectRateLimiter(req.path, req.method);
  return limiter(req, res, next);
}
```

**Livelli di Rate Limiting:**
- **Generale**: 100 req/15min
- **API**: 50 req/15min
- **Login**: 5 req/15min (produzione), 20 req/15min (sviluppo)
- **Upload**: 10 req/15min con limite di 50MB

#### Logging (`middleware/logging.js`)

```javascript
// Sistema di logging condizionale
const debuggers = {
  proxy: createDebugLogger('proxy'),
  headers: createDebugLogger('headers'),
  performance: createDebugLogger('performance'),
  auth: createDebugLogger('auth'),
  cors: createDebugLogger('cors')
};

// Middleware di logging con performance tracking
export function createPerformanceTracker() {
  return (req, res, next) => {
    const startTime = process.hrtime.bigint();
    
    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      
      if (duration > SLOW_REQUEST_THRESHOLD) {
        debuggers.performance(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
      }
    });
    
    next();
  };
}
```

#### Body Parser (`middleware/bodyParser.js`)

```javascript
// Parser intelligente basato sul tipo di richiesta
export function createSmartParser() {
  return (req, res, next) => {
    if (isBulkUpload(req)) {
      return createBulkUploadParser()(req, res, next);
    }
    
    if (isLightweightApi(req)) {
      return createLightweightParser()(req, res, next);
    }
    
    return createCombinedParser()(req, res, next);
  };
}
```

### Handler Layer

#### Health Check (`handlers/healthCheck.js`)

```javascript
// Health check completo del sistema
export async function performHealthCheck(options = {}) {
  const checks = {
    database: await checkDatabase(),
    apiServer: await checkExternalService(API_SERVER_URL),
    docsServer: await checkExternalService(DOCS_SERVER_URL),
    frontend: await checkExternalService(FRONTEND_URL),
    system: getSystemMetrics()
  };
  
  const overallStatus = determineOverallStatus(checks);
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    environment: getEnvironmentInfo(),
    responseTime: Date.now() - startTime
  };
}
```

**Endpoint Health Check:**
- `/health` - Check completo con dettagli
- `/healthz` - Check semplice (OK/Unhealthy)
- `/ready` - Readiness probe per Kubernetes

### Utility Layer

#### Graceful Shutdown (`utils/gracefulShutdown.js`)

```javascript
// Shutdown graceful unificato
export function setupGracefulShutdown(server, options = {}) {
  const { timeout = 30000, signals = ['SIGTERM', 'SIGINT'] } = options;
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, starting graceful shutdown...`);
      
      const shutdownTimer = setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, timeout);
      
      try {
        await closeServer(server);
        await cleanupResources();
        clearTimeout(shutdownTimer);
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });
}
```

#### Error Handlers (`utils/errorHandlers.js`)

```javascript
// Factory per gestori di errore
export function createAsyncErrorHandler() {
  return (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createProxyErrorHandler() {
  return (err, req, res, next) => {
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString()
      });
    }
    
    next(err);
  };
}
```

## Flusso delle Richieste

### 1. Richiesta in Ingresso

```
Client Request
     ↓
Security Headers (Helmet)
     ↓
CORS Validation
     ↓
Rate Limiting
     ↓
Logging Middleware
     ↓
Body Parsing
     ↓
Route Matching
```

### 2. Gestione delle Route

```
Route Matching
     ↓
┌─────────────────┬─────────────────┐
│   Local Routes  │  Proxy Routes   │
│                 │                 │
│ /health         │ /api/*          │
│ /healthz        │ /docs/*         │
│ /ready          │ /*              │
│ /proxy-test     │                 │
└─────────────────┴─────────────────┘
     ↓                     ↓
Local Handler         Proxy Middleware
     ↓                     ↓
Response              Target Server
```

### 3. Gestione Errori

```
Error Occurred
     ↓
Async Error Handler
     ↓
Proxy Error Handler
     ↓
Global Error Handler
     ↓
Error Response
```

## Configurazione per Ambiente

### Development

```javascript
const developmentConfig = {
  cors: {
    origins: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  },
  rateLimit: {
    general: { max: 1000, windowMs: 900000 },
    login: { max: 20, windowMs: 900000 }
  },
  logging: {
    level: 'debug',
    enableAll: true
  },
  security: {
    hsts: false,
    csp: 'development'
  }
};
```

### Production

```javascript
const productionConfig = {
  cors: {
    origins: [process.env.FRONTEND_URL],
    credentials: true
  },
  rateLimit: {
    general: { max: 100, windowMs: 900000 },
    login: { max: 5, windowMs: 900000 }
  },
  logging: {
    level: 'info',
    enableAll: false
  },
  security: {
    hsts: true,
    csp: 'strict'
  }
};
```

## Pattern di Design Utilizzati

### 1. Factory Pattern

```javascript
// Creazione di middleware configurabili
export function createRateLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    handler: rateLimitHandler,
    skip: isExemptRequest
  });
}
```

### 2. Middleware Pattern

```javascript
// Composizione di middleware
app.use(securityMiddleware);
app.use(corsMiddleware);
app.use(rateLimitMiddleware);
app.use(loggingMiddleware);
app.use(bodyParserMiddleware);
```

### 3. Strategy Pattern

```javascript
// Selezione dinamica del parser
function selectParser(req) {
  if (isBulkUpload(req)) return bulkUploadParser;
  if (isLightweightApi(req)) return lightweightParser;
  return defaultParser;
}
```

### 4. Observer Pattern

```javascript
// Event-driven logging
res.on('finish', () => {
  logRequest(req, res);
  trackPerformance(req, res);
  updateMetrics(req, res);
});
```

## Metriche e Monitoraggio

### Metriche Raccolte

- **Performance**: Tempo di risposta, throughput
- **Errors**: Tasso di errore, tipi di errore
- **Security**: Richieste bloccate, tentativi di attacco
- **Resources**: Utilizzo memoria, CPU
- **Business**: Login attempts, API usage

### Alerting

- Tempo di risposta > 5 secondi
- Tasso di errore > 5%
- Rate limiting attivato > 10 volte/minuto
- Health check fallito
- Memoria > 80%

## Scalabilità

### Horizontal Scaling

- Stateless design
- Session storage esterno
- Load balancer ready
- Health checks per auto-scaling

### Vertical Scaling

- Memory-efficient middleware
- Connection pooling
- Caching strategies
- Resource monitoring

## Sicurezza

### Threat Model

- **DDoS**: Rate limiting multi-livello
- **XSS**: CSP headers, input validation
- **CSRF**: SameSite cookies, CORS strict
- **Injection**: Input sanitization
- **MITM**: HSTS, secure headers

### Security Headers

```javascript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': cspPolicy,
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
```

## Testing Strategy

### Unit Tests
- Middleware functions
- Utility functions
- Error handlers
- Configuration logic

### Integration Tests
- Middleware composition
- Route handling
- Error propagation
- Health checks

### E2E Tests
- Complete request flows
- Authentication flows
- Error scenarios
- Performance tests

### Load Tests
- Rate limiting behavior
- Memory usage under load
- Response time degradation
- Error handling under stress

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4003
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4003/healthz || exit 1
CMD ["node", "proxy-server.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: proxy-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: proxy-server
  template:
    spec:
      containers:
      - name: proxy-server
        image: proxy-server:latest
        ports:
        - containerPort: 4003
        livenessProbe:
          httpGet:
            path: /healthz
            port: 4003
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4003
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Roadmap

### Prossime Funzionalità

1. **Caching Layer**: Redis per response caching
2. **Circuit Breaker**: Resilienza per servizi esterni
3. **Metrics Export**: Prometheus metrics endpoint
4. **Request Tracing**: Distributed tracing con OpenTelemetry
5. **API Gateway**: Trasformazione in full API Gateway

### Miglioramenti

1. **Performance**: HTTP/2 support, compression
2. **Security**: WAF integration, bot detection
3. **Observability**: Structured logging, APM integration
4. **DevOps**: Automated deployment, canary releases