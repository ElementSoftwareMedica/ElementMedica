# Progettazione Architettura Routing Migliorata

## Data: 2024-12-19

## Obiettivi Architetturali

### 1. Centralizzazione Completa
- **RouterMap centralizzata**: Un unico file di configurazione
- **Versioning automatico**: Gestione dinamica delle versioni API
- **Configurazione unificata**: Eliminazione duplicazioni

### 2. Trasparenza e Debugging
- **Logging unificato**: Tracciamento completo delle richieste
- **Endpoint diagnostico**: `/routes` per visualizzare configurazione live
- **Header informativi**: `x-api-version`, `x-proxy-target`

### 3. Manutenibilità
- **Struttura modulare**: Separazione responsabilità
- **Configurazione dichiarativa**: Facile da modificare
- **Backward compatibility**: Supporto route legacy

## Architettura Proposta

### Struttura File
```
backend/
├── routing/
│   ├── core/
│   │   ├── RouterMap.js           # Mappa centralizzata
│   │   ├── VersionManager.js      # Gestione versioni
│   │   ├── ProxyManager.js        # Gestione proxy
│   │   └── RouteLogger.js         # Logging unificato
│   ├── config/
│   │   ├── routeConfig.js         # Configurazione route
│   │   ├── versionConfig.js       # Configurazione versioni
│   │   └── legacyConfig.js        # Route legacy
│   ├── middleware/
│   │   ├── routeMiddleware.js     # Middleware routing
│   │   ├── versionMiddleware.js   # Middleware versioning
│   │   └── diagnosticMiddleware.js # Middleware diagnostico
│   └── utils/
│       ├── pathUtils.js           # Utilità path
│       └── validationUtils.js     # Validazione route
```

### RouterMap Centralizzata

#### Struttura RouterMap
```javascript
const routerMap = {
  // Configurazione versioni
  versions: {
    current: 'v2',
    supported: ['v1', 'v2'],
    deprecated: ['v1'],
    sunset: []
  },
  
  // Servizi target
  services: {
    api: {
      host: 'localhost',
      port: 4001,
      healthCheck: '/health'
    },
    documents: {
      host: 'localhost', 
      port: 4002,
      healthCheck: '/health'
    },
    auth: {
      host: 'localhost',
      port: 4001,
      healthCheck: '/health'
    }
  },
  
  // Route per versione
  routes: {
    v1: {
      '/auth/*': {
        target: 'auth',
        pathRewrite: { '^/auth': '/api/v1/auth' },
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      },
      '/users/*': {
        target: 'api',
        pathRewrite: { '^/users': '/api/v1/users' },
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    },
    v2: {
      '/auth/*': {
        target: 'auth',
        pathRewrite: { '^/auth': '/api/v2/auth' },
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    }
  },
  
  // Route legacy (redirect)
  legacy: {
    '/login': '/api/v1/auth/login',
    '/logout': '/api/v1/auth/logout',
    '/register': '/api/v1/auth/register'
  },
  
  // Route statiche (non proxy)
  static: {
    '/health': 'local',
    '/routes': 'diagnostic',
    '/metrics': 'local'
  }
};
```

### Sistema di Versioning

#### VersionManager
```javascript
class VersionManager {
  constructor(routerMap) {
    this.routerMap = routerMap;
    this.currentVersion = routerMap.versions.current;
  }
  
  // Risolve versione da richiesta
  resolveVersion(req) {
    // 1. Header x-api-version
    // 2. Path /api/v1, /api/v2
    // 3. Query param ?version=v1
    // 4. Default alla versione corrente
  }
  
  // Genera route dinamiche
  generateDynamicRoutes() {
    // Crea route /api/:version/* automaticamente
  }
  
  // Valida compatibilità versione
  validateVersion(version) {
    // Controlla se versione è supportata
  }
}
```

### ProxyManager Migliorato

#### Funzionalità
1. **Creazione proxy dinamica**: Basata su RouterMap
2. **Gestione errori unificata**: Handler standardizzati
3. **Logging avanzato**: Tracciamento completo
4. **Health check automatici**: Monitoraggio servizi

#### Implementazione
```javascript
class ProxyManager {
  constructor(routerMap, logger) {
    this.routerMap = routerMap;
    this.logger = logger;
    this.proxies = new Map();
  }
  
  // Crea proxy per servizio
  createServiceProxy(serviceName, config) {
    // Configurazione proxy con logging e error handling
  }
  
  // Middleware proxy dinamico
  createDynamicProxyMiddleware() {
    return (req, res, next) => {
      // Risolve target da RouterMap
      // Applica pathRewrite
      // Aggiunge header informativi
      // Logga richiesta
    };
  }
}
```

### Logging Unificato

#### RouteLogger
```javascript
class RouteLogger {
  constructor() {
    this.requestId = 0;
  }
  
  // Log richiesta in ingresso
  logIncomingRequest(req) {
    const requestId = ++this.requestId;
    req.requestId = requestId;
    
    console.log(`[${requestId}] ${req.method} ${req.url} -> ROUTING`);
    return requestId;
  }
  
  // Log proxy target
  logProxyTarget(req, target, rewrittenPath) {
    console.log(`[${req.requestId}] PROXY -> ${target}${rewrittenPath}`);
  }
  
  // Log risposta
  logResponse(req, res, duration) {
    console.log(`[${req.requestId}] ${res.statusCode} (${duration}ms)`);
  }
}
```

### Endpoint Diagnostico

#### /routes Endpoint
```javascript
app.get('/routes', (req, res) => {
  const diagnosticInfo = {
    timestamp: new Date().toISOString(),
    versions: routerMap.versions,
    services: Object.keys(routerMap.services).map(name => ({
      name,
      ...routerMap.services[name],
      status: 'healthy' // Da health check
    })),
    routes: {
      active: getActiveRoutes(),
      legacy: routerMap.legacy,
      static: routerMap.static
    },
    stats: {
      totalRequests: getRequestStats(),
      errorRate: getErrorRate(),
      avgResponseTime: getAvgResponseTime()
    }
  };
  
  res.json(diagnosticInfo);
});
```

## Middleware Stack Proposto

### Ordine Middleware
1. **Request Logger**: Log richiesta in ingresso
2. **Version Resolver**: Risolve versione API
3. **Legacy Redirector**: Gestisce redirect legacy
4. **Dynamic Proxy**: Routing dinamico
5. **Static Routes**: Route locali
6. **Error Handler**: Gestione errori
7. **Response Logger**: Log risposta

### Implementazione
```javascript
// Configurazione middleware stack
app.use(requestLogger);
app.use(versionResolver);
app.use(legacyRedirector);
app.use(dynamicProxy);
app.use(staticRoutes);
app.use(errorHandler);
app.use(responseLogger);
```

## Vantaggi Architettura

### 1. Centralizzazione
- ✅ Configurazione unica in RouterMap
- ✅ Eliminazione duplicazioni
- ✅ Manutenzione semplificata

### 2. Trasparenza
- ✅ Logging completo con request ID
- ✅ Endpoint diagnostico live
- ✅ Header informativi

### 3. Scalabilità
- ✅ Aggiunta versioni automatica
- ✅ Nuovi servizi facilmente integrabili
- ✅ Configurazione dichiarativa

### 4. Backward Compatibility
- ✅ Route legacy supportate
- ✅ Redirect automatici
- ✅ Versioning graduale

## Metriche di Successo

### Performance
- Latenza aggiuntiva < 5ms
- Throughput invariato
- Memory usage ottimizzato

### Manutenibilità
- Tempo debug ridotto del 70%
- Configurazione centralizzata
- Documentazione auto-generata

### Affidabilità
- Error rate invariato
- Health check automatici
- Fallback robusti

## Prossimi Passi

1. **Implementazione Core**: RouterMap e VersionManager
2. **Migrazione Graduale**: Sostituire configurazione esistente
3. **Testing Estensivo**: Validare funzionalità
4. **Documentazione**: Aggiornare guide

## Rischi e Mitigazioni

### Rischi
- **Complessità iniziale**: Nuova architettura da apprendere
- **Regressioni**: Possibili errori durante migrazione
- **Performance**: Overhead aggiuntivo

### Mitigazioni
- **Documentazione dettagliata**: Guide step-by-step
- **Testing approfondito**: Test automatizzati
- **Rollback plan**: Possibilità di tornare indietro
- **Monitoraggio**: Metriche real-time