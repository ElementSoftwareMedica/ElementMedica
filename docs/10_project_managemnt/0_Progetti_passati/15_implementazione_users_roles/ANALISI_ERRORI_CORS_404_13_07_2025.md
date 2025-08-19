# Analisi Errori CORS e 404 - 13 Luglio 2025

## 🚨 PROBLEMA IDENTIFICATO

### Errori Riscontrati
1. **CORS Error**: `Access to XMLHttpRequest at 'http://localhost:4003/api/persons/preferences' from origin 'http://localhost:5173' has been blocked by CORS policy`
2. **404 Error**: `GET http://localhost:4003/api/persons/preferences net::ERR_FAILED 404 (Not Found)`
3. **500 Error**: `GET http://localhost:4003/api/roles 500 (Internal Server Error)`

### Causa Principale
**Il middleware per `/api/persons` era completamente MANCANTE nel file `proxyRoutes.js`**

## 🔍 ANALISI DETTAGLIATA

### 1. Verifica Endpoint API Server
- ✅ `/api/persons/preferences` esiste nell'API server (porta 4001)
- ✅ `/api/roles` esiste nell'API server (porta 4001)
- ✅ Entrambi restituiscono 401 Unauthorized (autenticazione richiesta)
- ✅ Le route sono registrate correttamente in `api-server.js`

### 2. Verifica Configurazione Proxy
- ❌ **MANCANTE**: Middleware per `/api/persons` in `proxyRoutes.js`
- ✅ Middleware per `/api/roles` presente in `setupTenantRolesProxyRoutes`
- ❌ **MANCANTE**: Configurazione CORS per `/api/persons`

### 3. Stato del Proxy Server
- **Ultimo riavvio**: 2025-07-13 09:09:53
- **Ultima modifica file**: 2025-07-13 09:12
- ❌ **PROBLEMA**: Server proxy esegue versione obsoleta del file

## ✅ SOLUZIONI IMPLEMENTATE

### 1. Aggiunto Middleware `/api/persons`
**File**: `backend/proxy/routes/proxyRoutes.js`

```javascript
// Proxy per /api/persons
app.use('/api/persons',
  createAuthLogger('persons'),
  createApiProxy(apiTarget, {
    pathRewrite: {
      '^/': '/api/persons'
    },
    enableLogging: true
  })
);
```

### 2. Aggiunta Configurazione CORS
**File**: `backend/proxy/routes/proxyRoutes.js`

```javascript
// Setup CORS handlers per API endpoints
setupCorsHandlers(app, {
  '/api/persons/*': {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
  },
  '/api/persons/preferences': {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});
```

### 3. Aggiornato Debug Log
```javascript
console.log('   - Routes: /api/tenant, /api/roles, /roles, /api/user, /api/persons, /api/tenants');
```

## 🔧 STATO ATTUALE

### Modifiche Completate
- ✅ Middleware `/api/persons` aggiunto
- ✅ Configurazione CORS per `/api/persons` aggiunta
- ✅ Debug log aggiornato
- ✅ PathRewrite configurato: `'^/': '/api/persons'`

### Test di Verifica
```bash
# Test diretto API server (401 - autenticazione richiesta)
curl -X GET http://localhost:4001/api/persons/preferences -H "Authorization: Bearer test-token"
curl -X GET http://localhost:4001/api/roles -H "Authorization: Bearer test-token"

# Test proxy server (404 - middleware non caricato)
curl -X GET http://localhost:4003/api/persons/preferences -H "Authorization: Bearer test-token"
curl -X GET http://localhost:4003/api/roles -H "Authorization: Bearer test-token"
```

## ⚠️ RIAVVIO RICHIESTO

**CRITICO**: Il proxy-server DEVE essere riavviato per caricare le modifiche al file `proxyRoutes.js`

### Motivo
- File modificato: `Jul 13 09:12 proxyRoutes.js`
- Ultimo avvio server: `2025-07-13 09:09:53`
- Node.js non supporta hot-reload automatico

### Verifica Post-Riavvio
1. Controllare log: `"Proxy routes setup completed"`
2. Verificare presenza middleware `/api/persons`
3. Testare endpoint: `curl http://localhost:4003/api/persons/preferences`
4. Verificare CORS headers nelle richieste OPTIONS

## 📋 CHECKLIST FINALE

- [x] Identificata causa: middleware `/api/persons` mancante
- [x] Aggiunto middleware `/api/persons` in `proxyRoutes.js`
- [x] Configurata gestione CORS per `/api/persons`
- [x] Aggiornato debug logging
- [x] Verificato che API server funziona correttamente
- [ ] **RIAVVIO PROXY-SERVER RICHIESTO**
- [ ] Test post-riavvio da completare

## 🎯 RISULTATO ATTESO

Dopo il riavvio del proxy-server:
- ✅ `/api/persons/preferences` dovrebbe rispondere correttamente
- ✅ Errori CORS risolti
- ✅ Errori 404 risolti
- ✅ Frontend dovrebbe caricare ruoli e preferenze

---

**Data**: 13 Luglio 2025  
**Ora**: 09:13  
**Status**: Modifiche implementate - Riavvio server richiesto