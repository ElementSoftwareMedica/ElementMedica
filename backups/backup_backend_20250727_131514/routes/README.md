# Sistema di Routing Avanzato

Questo modulo implementa un sistema di gestione delle rotte avanzato per l'API backend, con funzionalità di versioning, ottimizzazione delle query, documentazione automatica e monitoraggio delle performance.

## Caratteristiche Principali

### 🚀 Gestione delle Rotte (RouteManager)
- **Caricamento automatico delle rotte** dal filesystem
- **Middleware configurabili** con stack predefiniti e personalizzati
- **Metriche dettagliate** per ogni rotta e globali
- **Gestione centralizzata degli errori** con logging strutturato
- **Sistema di caching** integrato per le risposte

### 📊 Ottimizzazione delle Query (QueryOptimizer)
- **Analisi delle performance** delle query database
- **Suggerimenti automatici** di ottimizzazione
- **Query builder intelligente** con paginazione e filtri
- **Cache manager** con supporto Redis
- **Middleware di ottimizzazione** trasparente

### 🔄 Versioning API (ApiVersioning)
- **Gestione multi-versione** delle API
- **Rilevamento automatico** della versione (header, URL, query)
- **Sistema di deprecazione** con date di sunset
- **Migrazione assistita** tra versioni
- **Statistiche d'uso** per versione

### 📚 Documentazione Automatica (ApiDocumentation)
- **Generazione OpenAPI/Swagger** automatica
- **Estrazione da commenti JSDoc** nei file di route
- **Schemi CRUD standardizzati** per i modelli Prisma
- **Interfaccia Swagger UI** integrata
- **Documentazione personalizzabile** per endpoint specifici

## Struttura dei File

```
backend/routes/
├── index.js                 # RouteManager principale
├── query-optimizer.js       # Sistema di ottimizzazione query
├── api-versioning.js        # Gestione versioning API
├── api-documentation.js     # Documentazione automatica
├── example-usage.js         # Esempi di utilizzo
└── README.md               # Questa documentazione
```

## Configurazione

### Inizializzazione Base

```javascript
import { RouteManager } from './routes/index.js';

const app = express();
const routeManager = new RouteManager(app, {
  routesDirectory: './routes',
  enableMetrics: true,
  enableCaching: true,
  enableQueryOptimization: true,
  enableVersioning: true,
  enableDocumentation: true,
  logLevel: 'info'
});

await routeManager.initialize();
```

### Opzioni di Configurazione

| Opzione | Tipo | Default | Descrizione |
|---------|------|---------|-------------|
| `routesDirectory` | string | `'./routes'` | Directory contenente i file delle rotte |
| `enableMetrics` | boolean | `true` | Abilita raccolta metriche |
| `enableCaching` | boolean | `false` | Abilita sistema di caching |
| `enableQueryOptimization` | boolean | `false` | Abilita ottimizzazione query |
| `enableVersioning` | boolean | `false` | Abilita versioning API |
| `enableDocumentation` | boolean | `false` | Abilita documentazione automatica |
| `logLevel` | string | `'info'` | Livello di logging |

## Utilizzo delle Funzionalità

### 1. Gestione delle Versioni API

```javascript
// Registra una nuova versione
routeManager.registerApiVersion('v2', {
  description: 'API Version 2.0 - Enhanced features',
  changelog: ['New bulk operations', 'Improved response format'],
  breakingChanges: ['Response format changed for list endpoints']
});

// Depreca una versione
routeManager.deprecateApiVersion('v1', {
  deprecationDate: '2024-06-01',
  sunsetDate: '2024-12-01',
  migrationGuide: 'https://docs.example.com/migration'
});
```

### 2. Ottimizzazione delle Query

```javascript
// In una rotta, utilizza il query optimizer
app.get('/api/v1/persons', async (req, res) => {
  const query = req.queryOptimizer.buildQuery('person', {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    search: req.query.search,
    filters: { active: true },
    orderBy: { createdAt: 'desc' }
  });
  
  const persons = await req.queryOptimizer.executeQuery('person', 'findMany', query);
  res.json({ success: true, data: persons });
});
```

### 3. Validazione Personalizzata

```javascript
// Registra schema di validazione
routeManager.registerValidation('POST:/api/v1/persons', {
  body: {
    firstName: { required: true, type: 'string', minLength: 2 },
    lastName: { required: true, type: 'string', minLength: 2 },
    email: { required: true, type: 'email' }
  }
});
```

### 4. Middleware Personalizzati

```javascript
// Crea stack di middleware personalizzato
const adminMiddleware = [
  rateLimitMiddleware,
  adminAuthMiddleware,
  auditLogMiddleware
];

routeManager.registerMiddlewareStack('admin-enhanced', adminMiddleware);
```

### 5. Documentazione API

```javascript
// Aggiungi documentazione personalizzata
routeManager.addApiDocumentation('/api/v1/analytics', 'get', {
  tags: ['Analytics'],
  summary: 'Get analytics data',
  parameters: [
    {
      name: 'period',
      in: 'query',
      schema: { type: 'string', enum: ['day', 'week', 'month'] }
    }
  ],
  responses: {
    '200': {
      description: 'Analytics data',
      content: {
        'application/json': {
          schema: { type: 'object' }
        }
      }
    }
  }
});
```

## Endpoint di Sistema

### Documentazione API
- **GET /docs** - Interfaccia Swagger UI
- **GET /docs/openapi.json** - Schema OpenAPI JSON

### Metriche e Performance
- **GET /api/metrics** - Metriche dettagliate del sistema
- **GET /api/performance** - Report delle performance
- **GET /api/health** - Stato di salute del sistema

### Versioning
- **GET /api/versions** - Lista delle versioni disponibili
- **GET /api/versions/:version** - Dettagli di una versione specifica

## Monitoraggio e Metriche

### Metriche Disponibili

```javascript
const metrics = routeManager.getMetrics();

// Panoramica generale
console.log(metrics.overview);
// {
//   totalRequests: 1250,
//   averageResponseTime: 145,
//   errorRate: 0.02,
//   slowRequestRate: 0.05
// }

// Metriche per rotta
console.log(metrics.routes);
// {
//   'GET:/api/v1/persons': {
//     count: 450,
//     averageTime: 120,
//     errorRate: 0.01,
//     slowRequestRate: 0.02
//   }
// }
```

### Report di Ottimizzazione

```javascript
const queryReport = routeManager.getQueryOptimizationReport();
const versioningReport = routeManager.getVersioningReport();

// Raccomandazioni automatiche
const recommendations = routeManager.generatePerformanceRecommendations();
recommendations.forEach(rec => {
  console.log(`${rec.priority}: ${rec.message}`);
});
```

## Esempi Pratici

Vedi il file `example-usage.js` per esempi completi di:
- Configurazione del sistema completo
- Registrazione di versioni API
- Setup di validazione personalizzata
- Creazione di middleware stack
- Monitoraggio delle performance
- Utilizzo in rotte reali

## Best Practices

### 1. Struttura delle Rotte
```
routes/
├── v1/
│   ├── persons.js
│   ├── companies.js
│   └── auth.js
├── v2/
│   ├── persons.js
│   └── analytics.js
└── common/
    ├── health.js
    └── metrics.js
```

### 2. Naming Convention
- **Versioni**: `v1`, `v2`, `v3` (non `1.0`, `2.0`)
- **Endpoint**: `/api/v{version}/{resource}`
- **Middleware Stack**: `{purpose}-{level}` (es. `auth-basic`, `admin-enhanced`)

### 3. Gestione Errori
```javascript
// Sempre utilizzare il formato standardizzato
res.status(400).json({
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    details: validationErrors
  }
});
```

### 4. Logging Strutturato
```javascript
logger.info('Operation completed', {
  userId: req.user?.id,
  operation: 'person.create',
  duration: Date.now() - startTime,
  component: 'persons-controller'
});
```

## Troubleshooting

### Problemi Comuni

1. **Rotte non caricate**
   - Verificare che i file delle rotte esportino correttamente le funzioni
   - Controllare i permessi della directory delle rotte

2. **Versioning non funziona**
   - Assicurarsi che l'header `X-API-Version` sia presente
   - Verificare che la versione sia registrata

3. **Metriche non aggiornate**
   - Controllare che `enableMetrics` sia `true`
   - Verificare che il middleware sia applicato correttamente

4. **Query lente**
   - Utilizzare il report di ottimizzazione
   - Implementare gli indici suggeriti
   - Abilitare il caching per query frequenti

### Debug Mode

```javascript
// Abilita logging dettagliato
const routeManager = new RouteManager(app, {
  logLevel: 'debug',
  enableMetrics: true
});

// Monitora le performance in tempo reale
setInterval(() => {
  const metrics = routeManager.getMetrics();
  console.log('Current metrics:', metrics.overview);
}, 10000);
```

## Contribuire

Per contribuire al sistema di routing:

1. Seguire le regole del progetto definite in `PROJECT_RULES.md`
2. Mantenere la compatibilità con le versioni esistenti
3. Aggiungere test per nuove funzionalità
4. Aggiornare la documentazione
5. Utilizzare il logging strutturato

## Licenza

Questo modulo fa parte del progetto principale e segue la stessa licenza.