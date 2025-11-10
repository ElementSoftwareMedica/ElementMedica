# ✅ PROBLEMA RISOLTO: Errori 500 su /auth/verify e /auth/refresh

## 🔍 Diagnosi

**Problema principale**: Il **proxy server** (porta 4003) non era avviato, causando errori 500 su tutte le chiamate API dal frontend.

### Sintomi
```
GET http://localhost:5173/api/v1/auth/verify 500 (Internal Server Error)
POST http://localhost:5173/api/v1/auth/refresh 500 (Internal Server Error)
AuthContext.tsx:71 ❌ Cookie verify failed
AuthContext.tsx:80 ❌ Refresh failed or no refresh token available
```

### Root Cause
1. **Backend API** (4001) ✅ ATTIVO
2. **Proxy Server** (4003) ❌ **NON ATTIVO** → Questo causava i 500
3. **Frontend Vite** (5173) ✅ ATTIVO ma non poteva raggiungere il backend

Il frontend chiama `localhost:5173/api/v1/*` → Vite proxy forward a `localhost:4003` → Proxy invia a `localhost:4001`.  
Se il proxy (4003) è spento, Vite non può inoltrare e ritorna 500.

---

## ✅ Soluzione Implementata

### 1. Script di Avvio Automatico
Creato **`start-dev-environment.sh`** che:
- ✅ Libera tutte le porte (4001, 4002, 4003, 5173)
- ✅ Avvia **API Server** (4001)
- ✅ Avvia **Proxy Server** (4003) ← **CHIAVE**
- ✅ Avvia **Documents Server** (4002)
- ✅ Avvia **Frontend Vite** (5173)
- ✅ Verifica health di tutti i servizi
- ✅ Testa il proxy Vite end-to-end

### 2. Script di Test Diagnostico
Creato **`test-vite-proxy-verify.cjs`** che verifica:
1. Backend (4001) risponde ✅
2. Proxy (4003) risponde ✅
3. Vite proxy (5173) inoltra correttamente ✅

---

## 🚀 Come Usare

### Avvio Rapido (Consigliato)
```bash
cd "/Users/matteo.michielon/project 2.0 VS"
bash start-dev-environment.sh
```

Output atteso:
```
✅ Sistema avviato correttamente!

🌐 Backend Services:
   - API Server:   http://localhost:4001
   - Proxy Server: http://localhost:4003
   - Docs Server:  http://localhost:4002

🖥  Frontend:
   - Vite Dev:     http://localhost:5173

🧪 Test proxy Vite...
   ✅ Proxy Vite funzionante
```

### Avvio Manuale (Alternativo)
```bash
# Backend
cd backend
bash start-servers.sh &

# Frontend (in un altro terminale)
cd ..
npm run dev
```

### Verifica Sistema
```bash
# Test rapido
node test-vite-proxy-verify.cjs

# Output atteso:
# ✅ Backend responds correctly
# ✅ Proxy responds correctly
# ✅ Vite proxy works correctly
# ✅ All tests passed! System is healthy.
```

### Stop Tutti i Servizi
```bash
lsof -ti:4001,4002,4003,5173 | xargs kill -9
```

---

## 📋 File Creati/Modificati

### Nuovi File
1. **`start-dev-environment.sh`** - Script avvio completo ambiente
2. **`test-vite-proxy-verify.cjs`** - Test diagnostico proxy Vite
3. **`src/pages/settings/Templates.tsx`** - Pagina template ristrutturata ✅
4. **`src/pages/settings/templates/hooks/useGoogleIntegration.ts`** - Fix import Google Docs/Slides (estrazione documentId da URL) ✅

### Modifiche
- **`googleService.ts`** - Fix token key mismatch (`access_token` → `authToken`) ✅ (sessione precedente)
- Directory log create: `logs/api-server/`, `logs/proxy-server/`, `logs/documents-server/`

---

## 🎯 Stato Attuale

### ✅ Funzionante
- [x] Backend API (4001) attivo e risponde
- [x] Proxy Server (4003) attivo e inoltra
- [x] Documents Server (4002) attivo
- [x] Frontend Vite (5173) attivo
- [x] Proxy Vite → Proxy Express → Backend **funzionante end-to-end**
- [x] Login `/api/v1/auth/login` ritorna token ✅
- [x] Verify `/api/v1/auth/verify` con token valido ritorna 200 ✅
- [x] Import Google Docs/Slides funzionante ✅
- [x] Pagina `/settings/templates` ristrutturata con UI moderna ✅

### 📊 Test Eseguiti
```bash
✅ GET /api/v1/auth/verify (4001) → 200 OK
✅ GET /api/v1/auth/verify (4003) → 200 OK  
✅ GET /api/v1/auth/verify (5173) → 200 OK (attraverso Vite proxy)
✅ POST /api/v1/auth/login (5173) → 200 OK + token
✅ Import Google Slides → Template importato correttamente
```

---

## 🔧 Troubleshooting

### Problema: "Port already in use"
```bash
# Libera tutte le porte
lsof -ti:4001,4002,4003,5173 | xargs kill -9
sleep 2
bash start-dev-environment.sh
```

### Problema: "Proxy timeout"
```bash
# Verifica che tutti i servizi siano attivi
curl http://localhost:4001/health
curl http://localhost:4003/health

# Se manca il proxy:
cd backend
node servers/proxy-server.js &
```

### Problema: "500 Internal Server Error"
1. Verifica che **tutti e 3** i servizi backend siano attivi:
   ```bash
   lsof -i:4001  # API
   lsof -i:4003  # Proxy ← IMPORTANTE!
   lsof -i:4002  # Docs
   ```
2. Se manca uno, riavvia con lo script: `bash start-dev-environment.sh`

### Problema: Frontend non carica
```bash
# Controlla i log
tail -f logs/frontend.log

# Se errore "Port in use":
lsof -ti:5173 | xargs kill -9
npm run dev
```

---

## 📝 Note Tecniche

### Architettura Request Flow
```
Browser
  ↓
localhost:5173 (Vite Dev Server)
  ↓ [/api/* → proxy]
localhost:4003 (Proxy Express)
  ↓ [route to API]
localhost:4001 (API Server + Database)
```

### Porte Fisse (Non Negoziabili)
- **4001**: API Server
- **4002**: Documents Server  
- **4003**: Proxy Server ← **CRITICO per frontend**
- **5173**: Frontend Vite

### Variabili Ambiente Backend
```bash
export API_PORT=4001
export PROXY_PORT=4003
export DOCS_PORT=4002
```

### Configurazione Vite Proxy (`vite.config.ts`)
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:4003',  // ← Proxy Express
    changeOrigin: true,
    secure: false
  }
}
```

---

## ✅ Checklist Post-Riavvio

Prima di considerare il sistema operativo:
- [ ] Backend API (4001) risponde a `/health`
- [ ] Proxy (4003) risponde a `/health`
- [ ] Documents (4002) risponde a `/health`
- [ ] Frontend (5173) carica la homepage
- [ ] Test proxy: `node test-vite-proxy-verify.cjs` passa ✅
- [ ] Login funziona e ritorna token
- [ ] `/settings/templates` carica senza errori
- [ ] Import Google funziona

---

## 🎉 Riassunto

**Problema**: Errori 500 su auth endpoints  
**Causa**: Proxy server (4003) non avviato  
**Soluzione**: Script `start-dev-environment.sh` che avvia tutto nell'ordine corretto  
**Stato**: ✅ **RISOLTO** - Sistema completamente funzionante  

**Bonus**:
- ✅ Pagina Templates ristrutturata con UI moderna
- ✅ Google Docs/Slides import funzionante (con estrazione automatica documentId)
- ✅ Script diagnostici per debug futuro

---

**Data risoluzione**: 6 novembre 2025  
**Credenziali test**: `admin@example.com` / `Admin123!`  
**Environment**: Localhost development
