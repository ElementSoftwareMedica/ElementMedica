# 📋 Planning Tecnico - Ottimizzazione Proxy Server

## 🔍 Analisi Stato Attuale

### File Principale: `backend/proxy-server.js`
- **Dimensioni**: ~1400 righe
- **Complessità**: Alta (monolitico)
- **Problemi Identificati**:
  - CORS configurato in multipli punti
  - Console.log sparsi nel codice
  - Rate limiting duplicato
  - Middleware non modulari
  - Gestione errori inconsistente
  - Graceful shutdown duplicato

### Middleware Attuali
```javascript
// Problemi identificati:
- CORS: Configurato in ~10 punti diversi
- Rate Limiting: apiLimiter usato inconsistentemente
- Logging: console.log + logger misti
- Error Handling: Duplicato per ogni route
- Body Parser: Configurato inline
```

## 🏗️ Architettura Target Dettagliata

### 1. Modularizzazione CORS
```javascript
// middleware/proxy/cors-config.js
export const configureCorsOptions = () => ({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  credentials: true
});
```

### 2. Security Middleware
```javascript
// middleware/proxy/security.js
export const securityMiddleware = {
  helmet: configureHelmet(),
  csp: configureCSP(),
  hsts: configureHSTS()
};
```

### 3. Rate Limiting Centralizzato
```javascript
// middleware/proxy/rate-limiter.js
export const rateLimiters = {
  api: createApiLimiter(),
  login: createLoginLimiter(),
  health: createHealthLimiter()
};

export const exemptRoutes = ['/health', '/healthz'];
```

### 4. Logging Condizionale
```javascript
// utils/proxy/debug-logger.js
export const debugLog = debug('proxy:server');
export const proxyLog = debug('proxy:middleware');
export const errorLog = debug('proxy:error');
```

### 5. JSON Parser Riutilizzabile
```javascript
// middleware/proxy/json-parser.js
export const jsonParser = bodyParser.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    // Validazione sicurezza
  }
});
```

### 6. Error Handling Factory
```javascript
// middleware/proxy/error-handler.js
export const createProxyErrorHandler = (serviceName) => ({
  onError: (err, req, res) => {
    // Gestione unificata errori
  },
  onProxyReq: (proxyReq, req, res) => {
    // Logging unificato
  }
});
```

### 7. Health Check Avanzato
```javascript
// middleware/proxy/health-check.js
export const healthzEndpoint = async (req, res) => {
  const checks = {
    api: await checkApiServer(),
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: checkMemoryUsage(),
    uptime: process.uptime()
  };
  // Risposta dettagliata
};
```

### 8. Graceful Shutdown DRY
```javascript
// utils/proxy/graceful-shutdown.js
export const setupGracefulShutdown = (server, services) => {
  const shutdown = async (signal) => {
    // Logica unificata shutdown
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};
```

## 📅 Roadmap Implementazione

### Fase 1: Preparazione (30 min)
- [ ] Analisi completa proxy-server.js
- [ ] Creazione struttura cartelle
- [ ] Backup configurazione attuale
- [ ] Setup ambiente testing

### Fase 2: Modularizzazione Core (45 min)
- [ ] Estrazione configurazione CORS
- [ ] Creazione middleware security
- [ ] Implementazione rate limiter centralizzato
- [ ] Setup logging condizionale

### Fase 3: Refactoring Middleware (60 min)
- [ ] JSON parser riutilizzabile
- [ ] Error handling factory
- [ ] Health check avanzato
- [ ] Graceful shutdown unificato

### Fase 4: Integrazione (30 min)
- [ ] Aggiornamento proxy-server.js principale
- [ ] Import nuovi moduli
- [ ] Rimozione codice duplicato
- [ ] Ottimizzazione performance

### Fase 5: Testing (30 min)
- [ ] Test login con credenziali standard
- [ ] Verifica tutti gli endpoint proxy
- [ ] Test rate limiting
- [ ] Test health check
- [ ] Test graceful shutdown

### Fase 6: Documentazione (30 min)
- [ ] Aggiornamento README tecnico
- [ ] Documentazione API
- [ ] Guide configurazione
- [ ] Troubleshooting

## 🧪 Piano Testing

### Test Funzionali
```bash
# Login test
curl -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'

# Health check
curl http://localhost:4003/healthz

# Rate limiting
for i in {1..20}; do curl http://localhost:4003/api/roles; done
```

### Test Performance
- Response time < 50ms
- Memory usage monitoring
- CPU usage optimization

### Test Security
- CORS policy validation
- Rate limiting effectiveness
- CSP headers verification
- HTTPS/HSTS compliance

## 🔧 Configurazione Ambiente

### Variabili Ambiente
```bash
# Debug logging
DEBUG=proxy:*

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Security
CSP_ENABLED=true
HSTS_ENABLED=true
```

### Dependencies Aggiuntive
```json
{
  "debug": "^4.3.4",
  "helmet": "^7.1.0",
  "supertest": "^6.3.3"
}
```

## 📊 Metriche Monitoraggio

### Performance
- Request/Response time
- Memory heap usage
- CPU utilization
- Error rate

### Security
- Rate limit violations
- CORS violations
- Authentication failures
- Suspicious requests

### Availability
- Uptime percentage
- Health check status
- Service dependencies
- Graceful shutdown time

## 🚨 Risk Assessment

### Rischi Identificati
1. **Interruzione Servizio**: Mitigato con testing graduale
2. **Perdita Funzionalità**: Mitigato con backup e rollback
3. **Performance Degradation**: Mitigato con monitoring
4. **Security Vulnerabilities**: Mitigato con security review

### Piano Contingenza
- Backup proxy-server.js originale
- Rollback procedure documentata
- Monitoring real-time attivo
- Escalation path definito

## ✅ Criteri Accettazione

### Funzionalità
- [ ] Login funzionante (admin@example.com)
- [ ] Tutti endpoint proxy operativi
- [ ] Rate limiting configurabile
- [ ] Health check completo
- [ ] Graceful shutdown funzionante

### Qualità
- [ ] Codice modulare e manutenibile
- [ ] Logging pulito e configurabile
- [ ] Error handling robusto
- [ ] Performance ottimizzate
- [ ] Security enhanced

### Documentazione
- [ ] README aggiornato
- [ ] API documentation
- [ ] Configuration guide
- [ ] Troubleshooting guide

---

**Prossimo Step**: Analisi dettagliata del codice proxy-server.js attuale