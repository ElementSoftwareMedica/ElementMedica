# Proxy Server Ottimizzato

## Panoramica

Il proxy server è stato completamente ottimizzato e modularizzato per migliorare la manutenibilità, la sicurezza e le performance. Questa documentazione descrive l'architettura e il funzionamento del nuovo sistema.

## Architettura

### Struttura delle Cartelle

```
proxy/
├── middleware/           # Middleware modulari
│   ├── security.js      # Sicurezza (Helmet, CSP, HSTS)
│   ├── cors.js          # Configurazione CORS
│   ├── rateLimiting.js  # Rate limiting avanzato
│   ├── logging.js       # Logging condizionale
│   └── bodyParser.js    # Parsing del body
├── handlers/            # Handler per endpoint specifici
│   ├── healthCheck.js   # Health check avanzato
│   └── localRoutes.js   # Route locali
├── utils/               # Utilità condivise
│   ├── gracefulShutdown.js  # Shutdown graceful
│   └── errorHandlers.js     # Gestione errori
└── proxy-server.js      # Server principale
```

## Caratteristiche Principali

### 1. Sicurezza Avanzata

- **Helmet**: Configurazione completa degli header di sicurezza
- **CSP (Content Security Policy)**: Policy estese per prevenire XSS
- **HSTS**: HTTP Strict Transport Security per HTTPS
- **Rate Limiting**: Protezione contro attacchi DDoS e brute force
- **Input Validation**: Validazione rigorosa dei dati in ingresso
- **Security Logging**: Monitoraggio delle richieste sospette

### 2. CORS Configurabile

- Origini dinamiche basate sull'ambiente
- Supporto per credenziali
- Header personalizzati
- Gestione preflight ottimizzata

### 3. Rate Limiting Intelligente

- **Rate Limiting Generale**: 100 richieste/15 minuti
- **Rate Limiting API**: 50 richieste/15 minuti
- **Rate Limiting Login**: 5 tentativi/15 minuti (produzione)
- **Esenzioni Configurabili**: Health checks, OPTIONS, static files
- **Cleanup Automatico**: Rimozione delle richieste vecchie

### 4. Logging Condizionale

- Utilizzo della libreria `debug` per logging selettivo
- Flag di debug specifici per diversi componenti
- Logging strutturato per audit e compliance GDPR
- Performance tracking per richieste lente

### 5. Health Check Completo

- **Endpoint `/health`**: Check completo di sistema, database e servizi
- **Endpoint `/healthz`**: Check semplificato stile Kubernetes
- **Endpoint `/ready`**: Readiness probe per deployment
- Metriche di sistema (memoria, CPU, uptime)
- Timeout configurabili per servizi esterni

## Configurazione

### Variabili d'Ambiente

```bash
# Server Configuration
PROXY_PORT=4003
API_SERVER_URL=http://localhost:4001
DOCS_SERVER_URL=http://localhost:4002
FRONTEND_URL=http://localhost:5173

# Security
NODE_ENV=production|development
ENABLE_HTTPS=true|false
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Debug Flags
DEBUG_PROXY=true|false
DEBUG_ALL=true|false
DEBUG_HEADERS=true|false
DEBUG_PATH=true|false
DEBUG_PERFORMANCE=true|false
DEBUG_AUTH=true|false
DEBUG_CORS=true|false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minuti
RATE_LIMIT_MAX_REQUESTS=100
API_RATE_LIMIT_MAX=50
LOGIN_RATE_LIMIT_MAX=5

# Health Check
HEALTH_CHECK_TIMEOUT=5000
DB_HEALTH_CHECK_ENABLED=true
EXTERNAL_SERVICES_CHECK_ENABLED=true
```

### Debug Logging

Per abilitare il logging di debug specifico:

```bash
# Abilita tutto il debug
DEBUG_ALL=true npm run start:proxy

# Abilita solo debug del proxy
DEBUG_PROXY=true npm run start:proxy

# Abilita debug delle performance
DEBUG_PERFORMANCE=true npm run start:proxy

# Abilita debug dell'autenticazione
DEBUG_AUTH=true npm run start:proxy
```

## Middleware

### Security Middleware

```javascript
import { setupSecurity } from './middleware/security.js';

// Applica tutti i middleware di sicurezza
setupSecurity(app, {
  enableHelmet: true,
  enableCors: true,
  enableRateLimit: true,
  enableInputValidation: true,
  enableSecurityLogging: true
});
```

### CORS Middleware

```javascript
import { createSecureCorsMiddleware } from './middleware/cors.js';

// CORS configurabile per ambiente
const corsMiddleware = createSecureCorsMiddleware({
  development: ['http://localhost:5173', 'http://localhost:3000'],
  production: ['https://yourdomain.com']
});
```

### Rate Limiting Middleware

```javascript
import { setupRateLimiting } from './middleware/rateLimiting.js';

// Configura rate limiting per path specifici
setupRateLimiting(app, {
  '/api/auth/login': 'login',
  '/api/upload': 'upload',
  '/api/*': 'api'
});
```

## Gestione Errori

### Error Handlers

- **Async Error Handler**: Cattura errori asincroni automaticamente
- **Proxy Error Handler**: Gestisce errori di proxy con retry
- **Global Error Handler**: Gestione centralizzata degli errori
- **404 Handler**: Gestione delle route non trovate

### Graceful Shutdown

```javascript
import { setupGracefulShutdown } from './utils/gracefulShutdown.js';

// Configura shutdown graceful per SIGTERM e SIGINT
setupGracefulShutdown(server, {
  timeout: 30000,
  signals: ['SIGTERM', 'SIGINT'],
  cleanup: async () => {
    // Cleanup personalizzato
  }
});
```

## Testing

### Test End-to-End

```bash
# Esegui tutti i test E2E
npm run test:e2e

# Esegui test del proxy specifici
npm run test:proxy

# Esegui test in modalità watch
npm run test:proxy:watch
```

### Test Coverage

I test coprono:
- Health check endpoints
- Rate limiting
- CORS configuration
- Security headers
- Body parsing
- Error handling
- Performance
- Login flow completo

## Quality Assurance

### Linting e Formattazione

```bash
# Verifica qualità del codice
npm run quality

# Correggi automaticamente
npm run quality:fix

# Solo linting
npm run lint
npm run lint:fix

# Solo formattazione
npm run format
npm run format:check
```

### CI/CD Pipeline

La pipeline CI/CD include:
- ESLint per qualità del codice
- Prettier per formattazione
- Test unitari e di integrazione
- Test E2E con server reali
- Security audit
- Coverage report

## Monitoraggio

### Metriche Disponibili

- **Performance**: Tempo di risposta, richieste lente
- **Rate Limiting**: Statistiche per IP e endpoint
- **Security**: Richieste sospette, tentativi di attacco
- **Health**: Stato di sistema, database e servizi esterni
- **GDPR**: Audit trail per richieste API

### Endpoint di Monitoraggio

- `GET /health` - Health check completo
- `GET /healthz` - Health check semplice
- `GET /ready` - Readiness probe
- `GET /metrics` - Metriche Prometheus (se abilitato)

## Sicurezza e Compliance

### GDPR Compliance

- Logging strutturato per audit trail
- Anonimizzazione degli IP nei log
- Retention policy configurabile
- Consenso tracking per richieste API

### Security Best Practices

- Nessun logging di credenziali o dati sensibili
- Validazione rigorosa dell'input
- Rate limiting per prevenire abusi
- Header di sicurezza completi
- HTTPS enforcement in produzione

## Troubleshooting

### Problemi Comuni

1. **Server non si avvia**
   - Verificare che la porta non sia già in uso
   - Controllare le variabili d'ambiente
   - Verificare i certificati SSL se HTTPS è abilitato

2. **Rate limiting troppo aggressivo**
   - Aumentare i limiti nelle variabili d'ambiente
   - Aggiungere path alle esenzioni
   - Verificare la configurazione per ambiente

3. **CORS errors**
   - Verificare che l'origine sia nelle allowed origins
   - Controllare la configurazione per ambiente
   - Verificare i header delle richieste preflight

4. **Health check fallisce**
   - Verificare connessione al database
   - Controllare che i servizi esterni siano raggiungibili
   - Aumentare i timeout se necessario

### Debug

Per debug dettagliato:

```bash
# Debug completo
DEBUG_ALL=true npm run start:proxy

# Debug specifico
DEBUG_PROXY=true DEBUG_PERFORMANCE=true npm run start:proxy
```

## Migrazione

Per migrare dal vecchio proxy server:

1. Aggiornare le variabili d'ambiente
2. Installare le nuove dipendenze
3. Eseguire i test per verificare la compatibilità
4. Aggiornare la configurazione di deployment
5. Monitorare i log durante il rollout

## Contribuire

Per contribuire al proxy server:

1. Seguire le linee guida di codifica (ESLint + Prettier)
2. Scrivere test per nuove funzionalità
3. Aggiornare la documentazione
4. Verificare che tutti i test passino
5. Seguire il processo di review del codice