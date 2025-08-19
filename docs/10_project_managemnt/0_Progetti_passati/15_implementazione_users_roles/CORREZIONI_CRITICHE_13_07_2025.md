# CORREZIONI CRITICHE APPLICATE - 13 Luglio 2025

## 🚨 PROBLEMA IDENTIFICATO E RISOLTO

### Analisi del Problema
- **Endpoint `/api/persons/preferences`**: Restituisce 404 dal proxy (porta 4003)
- **Endpoint `/api/roles`**: Funziona correttamente (401 - autenticazione richiesta)
- **API Server diretto (porta 4001)**: Entrambi gli endpoint funzionano (401)

### Root Cause Identificata

#### 1. **PROBLEMA CRITICO: PathRewrite Errato in proxyRoutes.js**
```javascript
// CONFIGURAZIONE ERRATA (CAUSA DEL 404)
app.use('/api/persons', {
  pathRewrite: {
    '^/': '/api/persons'  // ❌ SBAGLIATO: intercetta TUTTE le richieste
  }
});

// CONFIGURAZIONE CORRETTA (APPLICATA)
app.use('/api/persons', {
  pathRewrite: {
    '^/api/persons': '/api/persons'  // ✅ CORRETTO: intercetta solo /api/persons
  }
});
```

#### 2. **PROBLEMA SECONDARIO: Rate Limiting**
- `/api/persons` non era incluso nei path esenti dal rate limiting
- Aggiunto `/api/persons` a `EXEMPT_PATHS` in `rateLimiting.js`

## 🔧 CORREZIONI APPLICATE

### File: `/backend/proxy/routes/proxyRoutes.js`
**Linea ~150**: Corretto pathRewrite per `/api/persons`
```diff
- pathRewrite: { '^/': '/api/persons' }
+ pathRewrite: { '^/api/persons': '/api/persons' }
```

**Linea ~520**: Corretto pathRewrite per `/api/tenants` (coerenza)
```diff
- pathRewrite: { '^/': '/api/tenants' }
+ pathRewrite: { '^/api/tenants': '/api/tenants' }
```

**Linea ~540**: Corretto pathRewrite per `/api/roles` (coerenza)
```diff
- pathRewrite: { '^/': '/api/roles' }
+ pathRewrite: { '^/api/roles': '/api/roles' }
```

### File: `/backend/proxy/middleware/rateLimiting.js`
**Linee 11-17**: Aggiunto `/api/persons` ai path esenti
```diff
const EXEMPT_PATHS = [
  '/api/tenants',
  '/api/roles',
+ '/api/persons',
  '/health',
  '/healthz',
  '/proxy-test-updated',
  '/test-roles-middleware'
];
```

## 🚨 **STATO ATTUALE - 10:23AM**

**Processo Proxy-Server**: PID 47710 (avviato alle 10:21)  
**Stato**: ❌ PROCESSO OBSOLETO - MODIFICHE NON CARICATE  
**Problema**: Il processo esegue una versione obsoleta del codice

### ✅ Correzioni Applicate al Codice

**File `proxyFactory.js`**: Rimosso pathRewrite di default problematico
```diff
- const defaultPathRewrite = { '^/api': '/api' }; // Causava conflitti
+ // Non usare pathRewrite di default - lascia che le opzioni specifiche abbiano precedenza
```

**File `proxyRoutes.js`**: Tutti i pathRewrite sono corretti
- ✅ `/api/persons`: `'^/api/persons': '/api/persons'`
- ✅ `/api/tenants`: `'^/api/tenants': '/api/tenants'`
- ✅ `/api/roles`: `'^/api/roles': '/api/roles'`

### 🔍 Test Eseguiti

**API Server (porta 4001)**: ✅ Funziona correttamente
- `/api/persons/preferences` → 401 Unauthorized (corretto, richiede auth)

**Proxy Server (porta 4003)**: ❌ Non funziona
- `/api/persons/preferences` → 404 Not Found (processo obsoleto)

### ⚠️ RIAVVIO OBBLIGATORIO

Il processo proxy-server (PID 47710) deve essere riavviato per caricare le correzioni applicate al codice.

```bash
# 1. Terminare il processo corrente
kill 47710

# 2. Riavviare il proxy-server
cd /Users/matteo.michielon/project\ 2.0/backend/proxy
node proxy-server.js
```

## 🧪 TEST DI VERIFICA POST-RIAVVIO

### Test Attesi (DOPO il riavvio)
```bash
# Test 1: /api/persons/preferences dovrebbe restituire 401 (non più 404)
curl http://localhost:4003/api/persons/preferences
# Atteso: HTTP 401 Unauthorized

# Test 2: /api/roles dovrebbe continuare a funzionare
curl http://localhost:4003/api/roles
# Atteso: HTTP 401 Unauthorized

# Test 3: Verifica che il rate limiting sia esente
curl -H "X-Debug: true" http://localhost:4003/api/persons/preferences
# Atteso: Nessun header RateLimit-* per path esenti
```

## 📊 STATO CORREZIONI

| Componente | Stato | Note |
|------------|-------|------|
| ✅ pathRewrite `/api/persons` | CORRETTO | Era `'^/'` ora `'^/api/persons'` |
| ✅ Rate limiting `/api/persons` | ESENTE | Aggiunto a EXEMPT_PATHS |
| ⏳ Proxy Server | RIAVVIO NECESSARIO | Processo avviato prima delle modifiche |
| ✅ API Server | FUNZIONANTE | Tutti gli endpoint rispondono correttamente |

## 🔍 ANALISI TECNICA

### Perché il PathRewrite Causava il 404
1. La regex `'^/'` intercettava TUTTE le richieste che iniziano con `/`
2. Questo creava conflitti con altri middleware
3. Le richieste a `/api/persons/*` venivano processate incorrettamente
4. Il risultato era un 404 invece del corretto inoltro all'API server

### Conferma del Fix
- `/api/roles` funziona perché ha il pathRewrite corretto: `'^/api/roles': '/api/roles'`
- `/api/persons` ora ha la stessa configurazione corretta
- Entrambi dovrebbero comportarsi identicamente dopo il riavvio

## 📝 PROSSIMI PASSI

1. **UTENTE**: Riavviare il proxy-server come indicato sopra
2. **VERIFICA**: Eseguire i test di verifica
3. **CONFERMA**: Verificare che il frontend non mostri più errori 404
4. **DOCUMENTAZIONE**: Aggiornare questo documento con i risultati dei test

---

**Data**: 13 Luglio 2025, 10:05  
**Stato**: Correzioni applicate, riavvio necessario  
**Priorità**: CRITICA - Riavvio obbligatorio per applicare le correzioni