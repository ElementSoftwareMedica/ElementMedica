# 🔐 Istruzioni Login - Sistema Ottimizzato

**Versione**: 3.0 Post-Ottimizzazione Server  
**Data**: 27 Gennaio 2025  
**Sistema**: Architettura Ottimizzata GDPR-Compliant (Progetti 16-17)

## 🏗️ Architettura Sistema Ottimizzata

Il sistema utilizza un'architettura a tre server ottimizzata:
- **Proxy Server**: Porta 4003 (CORS centralizzato, Rate limiting, Security)
- **API Server**: Porta 4001 (Business logic ottimizzata, -63% codice)
- **Documents Server**: Porta 4002 (PDF generation, Templates)
- **Frontend**: Porta 5173 (React + Vite)

## 🔑 Credenziali Test Standard (OBBLIGATORIE)

### Credenziali Principali
**Per accesso amministrativo completo:**
- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Ruolo**: ADMIN (accesso completo al sistema)
- **Permessi**: Gestione completa di Person, Company, Course, Documents

⚠️ **REGOLE CRITICHE POST-OTTIMIZZAZIONE**:
- Queste credenziali sono per testing/sviluppo ESCLUSIVAMENTE
- **DIVIETO ASSOLUTO**: NON modificare senza autorizzazione esplicita del proprietario
- **ATTENZIONE MASSIMA**: Testare sempre le modifiche al sistema di autenticazione con queste credenziali
- **NUOVO**: Test health check obbligatori dopo modifiche sistema
- **NUOVO**: Validazione CORS e rate limiting se modificati
- Ogni intervento sul sistema di login deve essere autorizzato preventivamente

## 🚀 Avvio Sistema Ottimizzato

### Metodo Raccomandato (PM2)
Il sistema è gestito tramite PM2 con processi ottimizzati:

```bash
# Verifica stato sistema (PERMESSO)
pm2 list

# Monitoraggio logs (PERMESSO)
pm2 logs

# Test health check completo (OBBLIGATORIO)
curl -X GET http://localhost:4003/healthz
curl -X GET http://localhost:4001/health
```

### Test Login Ottimizzato

**NUOVO**: Login tramite Proxy Server ottimizzato:

```bash
# Test login via Proxy (RACCOMANDATO)
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'

# Test CORS (se modificato)
curl -X OPTIONS http://localhost:4003/api/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

## 🌐 Accesso Frontend

1. **URL Principale**: http://localhost:5173
2. **Proxy Health Check**: http://localhost:4003/healthz
3. **API Health Check**: http://localhost:4001/health

## 📡 Endpoint Ottimizzati Disponibili

### Tramite Proxy Server (Porta 4003) - RACCOMANDATO
- `/api/auth/login` - Login ottimizzato con CORS centralizzato
- `/api/auth/verify` - Verifica token con rate limiting
- `/api/persons` - Gestione Person (sistema unificato GDPR)
- `/api/companies` - Gestione aziende
- `/api/courses` - Gestione corsi
- `/api/documents` - Generazione documenti PDF
- `/healthz` - Health check avanzato proxy

### Diretti API Server (Porta 4001) - Solo per Debug
- `/health` - Health check API server
- `/api/v1/*` - API versione 1
- `/api/v2/*` - API versione 2 (nuovo)

## 🛠️ Ottimizzazioni Implementate (Progetti 16-17)

### ✅ Proxy Server Ottimizzato (Progetto 16)
- **CORS Centralizzato**: Eliminazione di 6+ handler OPTIONS duplicati
- **Rate Limiting Modulare**: Protezione automatica con esenzioni per admin
- **Security Headers**: Helmet.js integrato per sicurezza avanzata
- **Health Check Avanzato**: `/healthz` con controlli multipli (DB, API, memoria)
- **Graceful Shutdown**: Gestione pulita interruzioni sistema

### ✅ API Server Ottimizzato (Progetto 17)
- **Riduzione Codice**: Da 527 a 195 righe (-63%)
- **Performance**: Risolto bug middleware che causava timeout
- **Modularità**: ServiceLifecycleManager, MiddlewareManager, APIVersionManager
- **Versioning**: Supporto API v1/v2 per compatibilità
- **Monitoring**: Performance monitoring condizionale e ottimizzato

### ✅ Problemi Risolti
1. **Errore Login 401**: Risolto bug middleware performance
2. **Discrepanza Porte**: Standardizzate porte (API: 4001, Proxy: 4003)
3. **CORS Duplicati**: Centralizzazione configurazione CORS
4. **Rate Limiting**: Implementazione modulare con esenzioni

## 🔧 Troubleshooting Ottimizzato

### Test Rapidi Sistema
```bash
# Test completo sistema (OBBLIGATORIO)
curl -f http://localhost:4003/healthz && echo "✅ Proxy OK"
curl -f http://localhost:4001/health && echo "✅ API OK"

# Test login completo
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}' \
  | jq '.token' && echo "✅ Login OK"

# Test CORS (se necessario)
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:4003/api/auth/login \
  && echo "✅ CORS OK"
```

### Monitoraggio Sistema
```bash
# Stato processi (PERMESSO)
pm2 list | grep -E "(proxy|api|documents)"

# Logs in tempo reale (PERMESSO)
pm2 logs --lines 20

# Performance monitoring (PERMESSO)
pm2 monit
```

## 🚨 Regole Critiche Sistema

### ⚠️ DIVIETI ASSOLUTI
- ❌ **NON riavviare server** senza autorizzazione (`pm2 restart` VIETATO)
- ❌ **NON modificare porte** (4001/4003 FISSE)
- ❌ **NON modificare CORS** senza test completi
- ❌ **NON modificare rate limiting** senza validazione

### ✅ AZIONI PERMESSE
- ✅ Monitoraggio stato sistema (`pm2 list`, `pm2 logs`)
- ✅ Test health check (`curl` endpoint `/healthz` e `/health`)
- ✅ Test login con credenziali standard
- ✅ Verifica CORS e rate limiting se necessario

### 📞 Supporto
Per qualsiasi problema o modifica al sistema:
1. **Documentare** il problema con logs e test
2. **Richiedere autorizzazione** prima di interventi sui server
3. **Utilizzare credenziali test** standard per validazione
4. **Effettuare backup** prima di modifiche critiche

## Note operative (JWT)
- Token firmati e verificati esclusivamente dall'API Server tramite JWTService.
- Il Proxy non firma token e non richiede variabili JWT.
- Refresh token: può essere inviato via header `X-Refresh-Token` oppure nel body come `refresh_token`.
- CORS: includere `X-Refresh-Token`/`x-refresh-token` negli header consentiti.