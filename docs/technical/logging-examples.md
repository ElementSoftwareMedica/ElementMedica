# 📝 Esempi di Utilizzo - Sistema Logging Ottimizzato

## 🎯 Esempi Pratici

### 1. Utilizzo Base - Metriche

```typescript
import { recordApiCall, recordMetric } from '@/utils/metrics';

// ❌ PRIMA: Log per ogni chiamata (spam)
console.log('📊 API call started');
console.log('📊 API call completed:', { duration: 150 });

// ✅ DOPO: Logging intelligente
recordApiCall('/api/users', 'GET', 150, 200, { cached: true });
// Log solo se errore (status >= 400) o lento (>2s)
```

### 2. Utilizzo Base - GDPR

```typescript
import { logGdprAction } from '@/utils/gdpr';

// ❌ PRIMA: Log per ogni azione (spam)
console.log('🔒 GDPR Action: VIEW_PROFILE');
console.log('🔒 GDPR Action: UPDATE_PROFILE');

// ✅ DOPO: Logging intelligente
logGdprAction('user123', 'VIEW_PROFILE', 'person', 'profile123');
logGdprAction('user123', 'DELETE_PERSON', 'person', 'person456'); // Sempre loggato (critico)
```

### 3. Utilizzo Avanzato - Logger Condizionale

```typescript
import { createConditionalLogger } from '@/utils/logging-config';

const logger = createConditionalLogger('USER_SERVICE');

// Log normale (batch)
logger.log('User operation completed', { userId: 'user123', action: 'update' });

// Log critico (immediato)
logger.log('User deletion failed', errorData, { 
  isError: true, 
  isCritical: true,
  level: 'error'
});
```

## 🔧 Configurazione per Sviluppatori

### Scenario 1: Debug Generale
```javascript
// Console del browser
window.loggingDebug.enableAll();
// Ora tutti i log sono visibili per debug intensivo
```

### Scenario 2: Debug Solo Metriche
```javascript
// Console del browser
window.metricsDebug.enableLogging();
// Solo i log delle metriche sono visibili
```

### Scenario 3: Debug Solo GDPR
```javascript
// Console del browser
window.gdprDebug.enableLogging();
// Solo i log GDPR sono visibili
```

### Scenario 4: Produzione (Default)
```javascript
// Nessuna configurazione necessaria
// Solo errori e azioni critiche vengono loggati
```

## 📊 Output di Esempio

### Prima dell'Ottimizzazione (Spam)
```
📊 Metric recorded: { name: "api_call", value: 150, timestamp: "..." }
📊 Metric recorded: { name: "api_call", value: 200, timestamp: "..." }
📊 Metric recorded: { name: "api_call", value: 180, timestamp: "..." }
📊 Metric recorded: { name: "api_call", value: 220, timestamp: "..." }
📊 Metric recorded: { name: "api_call", value: 190, timestamp: "..." }
🔒 GDPR Action: { action: "LOGIN", userId: "user123", timestamp: "..." }
🔒 GDPR Action: { action: "VIEW_PROFILE", userId: "user123", timestamp: "..." }
🔒 GDPR Action: { action: "UPDATE_PROFILE", userId: "user123", timestamp: "..." }
💾 Cache Metric recorded: { operation: "hit", key: "users_list" }
💾 Cache Metric recorded: { operation: "hit", key: "user_profile" }
💾 Cache Metric recorded: { operation: "miss", key: "user_settings" }
```

### Dopo l'Ottimizzazione (Pulito)
```
📊 Metrics Summary: {
  totalMetrics: 50,
  apiRequests: 25,
  avgResponseTime: "185ms",
  errorRate: "2%",
  cacheHitRate: "78%"
}

🔒 GDPR Summary: {
  totalActions: 15,
  recentActions: 10,
  errorRate: "0%",
  actionTypes: ["LOGIN", "VIEW_PROFILE", "UPDATE_PROFILE"],
  lastAction: "UPDATE_PROFILE"
}

💾 Cache Metric (batch): {
  count: 20,
  operation: "hit",
  hitRate: "85%"
}
```

## 🚨 Gestione Errori

### Errori API (Sempre Loggati)
```typescript
recordApiCall('/api/users', 'POST', 5000, 500, { 
  error: 'Database connection failed' 
});
// Output immediato:
// 📊 API Metric (error/slow): {
//   endpoint: "/api/users",
//   status: 500,
//   duration: 5000,
//   error: "Database connection failed"
// }
```

### Errori GDPR (Sempre Loggati)
```typescript
logGdprAction('user123', 'DELETE_PERSON', 'person', 'person456', {}, false, 'Permission denied');
// Output immediato:
// 🔒 GDPR Action: {
//   action: "DELETE_PERSON",
//   success: false,
//   userId: "user123...",
//   error: "Permission denied"
// }
```

## 🎛️ Controlli Runtime

### Verifica Configurazione Attuale
```javascript
// Vedi configurazione logging
console.log(window.loggingDebug.getConfig());

// Vedi statistiche rate limiting
console.log(window.loggingDebug.getRateLimitStats());

// Vedi statistiche metriche
console.log(window.metricsDebug.getStats());

// Vedi statistiche GDPR
console.log(window.gdprDebug.getStats());
```

### Modifica Configurazione Runtime
```javascript
// Aumenta batch size per ridurre ulteriormente i log
window.loggingDebug.updateConfig({ batchSize: 20 });

// Cambia livello di log
window.loggingDebug.updateConfig({ logLevel: 'warn' });

// Disabilita persistenza localStorage
window.loggingDebug.updateConfig({ persistToLocalStorage: false });
```

### Test del Sistema
```javascript
// Test azioni GDPR
window.gdprDebug.testActions();

// Force flush dei log in batch
window.metricsDebug.logSummary();
window.gdprDebug.logSummary();
```

## 🔄 Migrazione Codice Esistente

### Da Console.log a Sistema Ottimizzato

#### Prima
```typescript
console.log('📊 Processing user data:', userData);
console.log('🔒 User consent checked:', consentResult);
```

#### Dopo
```typescript
import { createConditionalLogger } from '@/utils/logging-config';
const logger = createConditionalLogger('USER_PROCESSING');

logger.log('Processing user data', userData);
logger.log('User consent checked', consentResult);
```

### Da Log Diretti a Funzioni Specifiche

#### Prima
```typescript
console.log('📊 API call completed:', { endpoint, duration, status });
console.log('🔒 GDPR action performed:', { action, userId, entityType });
```

#### Dopo
```typescript
import { recordApiCall } from '@/utils/metrics';
import { logGdprAction } from '@/utils/gdpr';

recordApiCall(endpoint, 'GET', duration, status);
logGdprAction(userId, action, entityType, entityId);
```

## 📈 Monitoraggio Performance

### Metriche Disponibili
```javascript
// Statistiche API
const apiStats = window.metricsDebug.getStats().api;
console.log('Average response time:', apiStats.averageResponseTime);
console.log('Error rate:', apiStats.errorRate);
console.log('Cache hit rate:', apiStats.cacheHitRate);

// Statistiche GDPR
const gdprStats = window.gdprDebug.getStats();
console.log('Total GDPR actions:', gdprStats.totalActions);
console.log('Error rate:', gdprStats.errorRate);
console.log('Action types:', gdprStats.actionTypes);
```

### Export per Analisi
```javascript
// Export metriche per analisi esterna
const metricsData = window.metricsDebug.exportMetrics();
console.log('Metrics data:', JSON.parse(metricsData));

// Export log GDPR
const gdprLogs = window.gdprDebug.getLogs();
console.log('GDPR logs:', gdprLogs);
```

---

**Nota**: Questi esempi mostrano come utilizzare il nuovo sistema di logging ottimizzato per ridurre il rumore nei log mantenendo la capacità di debugging quando necessario.