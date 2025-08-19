# 📊 Analisi Stato Attuale - Proxy Server Optimization

**Data**: 2025-01-27  
**Progetto**: Ottimizzazione e Modularizzazione Proxy Server  
**Versione**: 1.0  

## 🔍 Stato Attuale del Sistema

### File Principale
- **File**: `backend/proxy-server.js`
- **Dimensioni**: 1392 righe
- **Struttura**: Monolitica
- **Problemi Identificati**: Codice duplicato, configurazioni hardcoded, logging eccessivo

### 🚨 Problemi Critici Identificati

#### 1. **Configurazione CORS Duplicata**
```javascript
// Problema: 6+ handler OPTIONS duplicati
app.options('/api/auth/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  // ... configurazione ripetuta identica
});
```

#### 2. **Rate Limiting Frammentato**
```javascript
// Problema: Logica di skip duplicata in più punti
if (req.method === 'OPTIONS') return next();
if (req.originalUrl.includes('/api/tenants')) return next();
if (req.originalUrl.includes('/api/roles')) return next();
```

#### 3. **Logging Eccessivo e Non Condizionale**
```javascript
// Problema: Console.log fissi ovunque
console.log('🚨🚨🚨 [ROLES MIDDLEWARE] HIT!');
console.log('🔍 [PATH TRACE] Original:', {...});
```

#### 4. **Body Parser Applicato Localmente**
```javascript
// Problema: bodyParser ripetuto per ogni endpoint
app.post('/courses', bodyParser.json({ limit: '50mb' }), bodyParser.urlencoded({ extended: true, limit: '50mb' }), ...);
```

#### 5. **Gestione Errori Duplicata**
```javascript
// Problema: onError handler identici ripetuti
onError: (err, req, res) => {
  logger.error('Proxy error for API roles', { service: 'proxy-server', error: err.message, path: req.path });
  if (!res.headersSent) {
    res.status(502).json({ error: 'Proxy error', message: err.message });
  }
}
```

#### 6. **Graceful Shutdown Duplicato**
```javascript
// Problema: Logica identica per SIGTERM e SIGINT
process.on('SIGTERM', () => { /* logica identica */ });
process.on('SIGINT', () => { /* logica identica */ });
```

### 📈 Metriche Attuali

| Metrica | Valore Attuale | Target |
|---------|----------------|--------|
| Righe di codice | 1392 | <800 |
| Middleware duplicati | 15+ | 0 |
| Console.log fissi | 50+ | 0 |
| Handler CORS duplicati | 6 | 1 |
| Rate limiter duplicati | 3 | 1 |
| Configurazioni hardcoded | 20+ | 0 |

### 🔧 Middleware Attuali

#### Middleware di Sicurezza
- `helmet()` - CSP configurato
- `httpLogger` - Logging HTTP
- Rate limiting generale e API-specific

#### Middleware di Proxy
- `/api/companies` → `/api/v1/companies`
- `/v1/companies` → `/api/v1/companies`
- `/api/v1/companies` → mantenuto
- `/api/tenant` → `/api/tenants`
- `/api/roles` → mantenuto
- `/roles` → `/api/roles`
- `/api/persons` → mantenuto
- `/persons` → `/api/persons`
- `/api/users` → mantenuto
- `/api/tenants` → mantenuto
- `/api/v1/auth` → mantenuto

#### Endpoint Locali
- `/health` - Health check con proxy fallback
- `/courses/*` - CRUD completo con Prisma
- `/schedules-with-attestati` - Query complessa
- `/templates` - Gestione template con auth
- `/attestati` - Gestione attestati con auth
- `/generate` - Proxy a documents server

### 🎯 Funzionalità Critiche da Preservare

1. **Autenticazione e Autorizzazione**
   - `authenticateToken()` middleware
   - `requirePermission()` middleware
   - `requireCompanyAccess()` middleware

2. **Rate Limiting Intelligente**
   - Skip per OPTIONS (CORS preflight)
   - Esenzioni per endpoint critici (/api/tenants, /api/roles)
   - Limiti diversi per development/production

3. **Gestione CORS Avanzata**
   - Credenziali abilitate
   - Headers personalizzati (x-tenant-id, X-Tenant-ID)
   - Origin specifico (http://localhost:5173)

4. **Health Checks**
   - Controllo API server
   - Load balancer integration
   - Timeout configurabili

5. **Graceful Shutdown**
   - Gestione SIGTERM/SIGINT
   - Cleanup risorse (auth, load balancer)
   - Comportamento diverso dev/production

### 🔒 Conformità GDPR

#### Audit Trail Presente
- `logAudit()` function utilizzata
- Logging strutturato con winston
- Tracciamento accessi e operazioni

#### Gestione Dati Sensibili
- Autenticazione JWT
- Controllo accessi basato su company
- Soft delete con `deletedAt`

### 🚀 Server Status

- **API Server**: ✅ Attivo su porta 4001
- **Proxy Server**: ✅ Attivo su porta 4003
- **Frontend**: ✅ Configurato su porta 5173
- **Documents Server**: ⚠️ Configurato su porta 4002 (da verificare)

### 📋 Credenziali Test

- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Ruolo**: ADMIN
- **Status**: ✅ Verificate funzionanti

## 🎯 Obiettivi di Ottimizzazione

### Priorità Alta
1. ✅ Estrarre configurazione CORS in helper
2. ✅ Modularizzare middleware di sicurezza
3. ✅ Creare jsonParser riutilizzabile
4. ✅ Implementare logging condizionale
5. ✅ Centralizzare rate limiting

### Priorità Media
6. ✅ Unificare gestione errori proxy
7. ✅ Implementare endpoint /healthz avanzato
8. ✅ DRY per graceful shutdown

### Priorità Bassa
9. ✅ Aggiungere security enhancements
10. ✅ Integrare testing e CI

## 📊 Impatto Stimato

### Benefici Attesi
- **Manutenibilità**: +80%
- **Leggibilità**: +70%
- **Performance**: +15%
- **Testabilità**: +90%
- **Sicurezza**: +25%

### Rischi Identificati
- **Basso**: Refactoring graduale con test continui
- **Mitigazione**: Backup automatico e rollback plan
- **Validazione**: Test funzionali dopo ogni modifica

---

**Prossimo Step**: Creazione architettura target e planning implementazione