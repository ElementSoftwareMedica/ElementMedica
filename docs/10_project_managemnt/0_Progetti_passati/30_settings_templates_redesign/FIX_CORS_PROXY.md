# Fix CORS e Proxy - Templates Google Integration
**Data**: 5 Novembre 2025  
**Status**: ✅ RISOLTO

---

## 🐛 Problema Rilevato

### Sintomi
```
❌ Access to XMLHttpRequest blocked by CORS policy
❌ No 'Access-Control-Allow-Origin' header
❌ GET http://localhost:4001/api/v1/google/status net::ERR_FAILED 401
❌ Invalid JSON response from unknown: <!doctype html>
```

### Causa Root
I servizi `googleService.ts` e `templateService.ts` stavano chiamando **direttamente** il backend API su porta 4001, bypassando il proxy server su porta 4003.

**Architettura Corretta:**
```
Frontend (5173) → Proxy (4003) → Backend API (4001)
```

**Architettura Sbagliata (bug):**
```
Frontend (5173) ──X──> Backend API (4001)  [CORS blocked!]
```

---

## 🔧 Soluzione Applicata

### 1. ✅ Fix googleService.ts

**Prima (SBAGLIATO):**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL
});

// Chiamate senza prefisso /api/v1
export async function getConnectionStatus() {
  const response = await apiClient.get('/google/status');  // ❌ WRONG!
}
```

**Dopo (CORRETTO):**
```typescript
import { API_BASE_URL } from '../../../../config/api';

// Uses centralized API_BASE_URL which routes through proxy (port 4003)
const apiClient = axios.create({
  baseURL: API_BASE_URL  // '' in browser, 'http://localhost:4003' in SSR
});

// Chiamate con prefisso completo /api/v1
export async function getConnectionStatus() {
  const response = await apiClient.get('/api/v1/google/status');  // ✅ CORRECT!
}
```

### 2. ✅ Fix templateService.ts

**Prima (SBAGLIATO):**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

const apiClient = axios.create({
  baseURL: API_BASE_URL
});
```

**Dopo (CORRETTO):**
```typescript
import { API_BASE_URL } from '../../../../config/api';

// Uses centralized API_BASE_URL which routes through proxy
const apiClient = axios.create({
  baseURL: API_BASE_URL
});
```

### 3. ✅ Aggiornati Tutti i Path Google

**Endpoints Corretti:**
```typescript
'/api/v1/google/status'          // ✅ (prima: '/google/status')
'/api/v1/google/auth/url'        // ✅ (prima: '/google/auth/url')
'/api/v1/google/auth/callback'   // ✅ (prima: '/google/auth/callback')
'/api/v1/google/disconnect'      // ✅ (prima: '/google/disconnect')
'/api/v1/google/import-docs'     // ✅ (prima: '/google/import-docs')
'/api/v1/google/import-slides'   // ✅ (prima: '/google/import-slides')
```

---

## 🏗️ Configurazione API Centralizzata

### src/config/api/index.ts

```typescript
export const API_BASE_URL = (() => {
  // Browser: usa baseURL vuota → requests go to same origin (frontend server)
  if (typeof window !== 'undefined') {
    return '';
  }
  // SSR/Build/Tests: usa proxy esplicito
  const envBase = (process as any)?.env?.VITE_API_BASE_URL;
  return envBase || 'http://localhost:4003';
})();
```

**Come Funziona:**

#### In Browser (Development)
```javascript
API_BASE_URL = ''
Request: apiClient.get('/api/v1/google/status')
Full URL: http://localhost:5173/api/v1/google/status

// Vite dev server proxy intercetta /api/* e forwarda a localhost:4003
→ http://localhost:4003/api/v1/google/status (Proxy Server)
→ http://localhost:4001/api/v1/google/status (API Server)
```

#### In Browser (Production)
```javascript
API_BASE_URL = ''
Request: apiClient.get('/api/v1/google/status')
Full URL: https://www.elementformazione.com/api/v1/google/status

// Nginx reverse proxy forwarda /api/* a backend
→ Backend API server
```

#### In SSR/Tests
```javascript
API_BASE_URL = 'http://localhost:4003'
Request: apiClient.get('/api/v1/google/status')
Full URL: http://localhost:4003/api/v1/google/status
→ Direttamente al proxy
```

---

## 📊 Files Modificati

### Frontend Services
```
src/pages/settings/templates/services/
├── googleService.ts         ✅ FIXED
│   - Import API_BASE_URL da config centrale
│   - Rimosso hardcoded http://localhost:4001
│   - Aggiunti prefissi /api/v1 a tutti gli endpoint
└── templateService.ts       ✅ FIXED
    - Import API_BASE_URL da config centrale
    - Rimosso hardcoded http://localhost:4001
```

### Configurazione
```
src/config/api/index.ts      ✅ UNCHANGED (già corretto)
├── API_BASE_URL: '' in browser
└── API_BASE_URL: 'http://localhost:4003' in SSR
```

---

## 🧪 Testing & Validation

### Backend Test (via Proxy)
```bash
TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' \
  | jq -r '.tokens.access_token')

# Test Google status attraverso proxy
curl -s -X GET "http://localhost:4003/api/v1/google/status" \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "success": true,
  "data": {
    "connected": false,
    "expiresAt": null,
    "scopes": []
  }
}
```

### Frontend Test (Manual)
1. ✅ Login: http://localhost:5173
2. ✅ Navigate: /settings/templates
3. ✅ Verify: No CORS errors in console
4. ✅ Verify: Google Integration Panel visible
5. ✅ Verify: Connection status loads correctly
6. ✅ Click: "Connetti Google Account"
7. ✅ Verify: OAuth2 popup opens (no CORS errors)

---

## 🎯 Risultati

### Prima (ERRORI)
```
❌ CORS policy blocked XMLHttpRequest
❌ 401 Unauthorized on http://localhost:4001
❌ Invalid JSON response (HTML document)
❌ GoogleIntegrationPanel non carica status
```

### Dopo (FUNZIONANTE)
```
✅ No CORS errors
✅ Requests go through proxy (4003 → 4001)
✅ JSON responses valid
✅ GoogleIntegrationPanel loads connection status
✅ OAuth2 flow works correctly
```

---

## 📝 Regole da Seguire

### ⚠️ DA NON FARE
```typescript
// ❌ SBAGLIATO: Hardcoded port/host
const API_BASE_URL = 'http://localhost:4001';

// ❌ SBAGLIATO: Direct import from env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

// ❌ SBAGLIATO: Path senza /api/v1
apiClient.get('/google/status');
```

### ✅ DA FARE
```typescript
// ✅ CORRETTO: Import from central config
import { API_BASE_URL } from '../../../../config/api';

// ✅ CORRETTO: Use centralized API_BASE_URL
const apiClient = axios.create({
  baseURL: API_BASE_URL
});

// ✅ CORRETTO: Full path with /api/v1
apiClient.get('/api/v1/google/status');
```

---

## 🔗 Riferimenti

### Documentazione
- `src/config/api/index.ts` - Configurazione centrale API
- `docs/technical/API_ARCHITECTURE.md` - Architettura API
- `docs/deployment/PROXY_CONFIGURATION.md` - Setup proxy

### Porte (Non Negoziabili)
```
Frontend:  5173 (Vite dev server)
Proxy:     4003 (Proxy server)
API:       4001 (Backend API server)
Documents: 4002 (Documents server)
```

### Proxy Routes
```javascript
// backend/routing/core/RouterMap.js
routes: {
  v1: {
    '/api/v1/google/*': {
      target: 'api',
      methods: ['GET', 'POST', 'DELETE'],
      description: 'Google OAuth2 and import',
      cors: true
    }
  }
}
```

---

## ✅ Checklist Verifica

### Backend
- [x] Proxy server running on port 4003
- [x] API server running on port 4001
- [x] Google endpoints respond correctly via proxy
- [x] CORS headers present in responses
- [x] Authentication tokens forwarded correctly

### Frontend
- [x] No hardcoded localhost:4001 in code
- [x] All services use API_BASE_URL from config
- [x] All Google endpoints have /api/v1 prefix
- [x] No CORS errors in browser console
- [x] GoogleIntegrationPanel loads correctly
- [x] OAuth2 popup opens without errors

### Testing
- [x] Login works (admin@example.com / Admin123!)
- [x] Templates page loads without errors
- [x] Google status endpoint returns valid JSON
- [x] Google auth URL endpoint works
- [x] No "Invalid JSON response" errors

---

## 🚀 Prossimi Passi

### Immediate
1. ✅ **Deploy fix to staging**
2. ✅ **Test OAuth2 flow end-to-end**
3. ✅ **Test import Google Docs**
4. ✅ **Test import Google Slides**

### Documentation Updates
1. [ ] Update API_ARCHITECTURE.md with proxy flow diagram
2. [ ] Update GOOGLE_INTEGRATION.md with corrected endpoints
3. [ ] Add troubleshooting guide for CORS issues

### Code Quality
1. [ ] Add ESLint rule to prevent hardcoded localhost URLs
2. [ ] Add unit tests for API path construction
3. [ ] Add integration tests for proxy forwarding

---

## 🐛 Troubleshooting

### Se vedi ancora errori CORS

**Check 1: Proxy Server Running?**
```bash
curl -s http://localhost:4003/health
# Expected: {"status":"healthy","service":"proxy-server"}
```

**Check 2: API Server Running?**
```bash
curl -s http://localhost:4001/health
# Expected: {"status":"healthy"}
```

**Check 3: Frontend Dev Server Running?**
```bash
curl -s http://localhost:5173 -I
# Expected: HTTP/1.1 200 OK
```

**Check 4: Vite Proxy Config**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4003',
        changeOrigin: true
      }
    }
  }
});
```

---

**Status Finale**: ✅ **CORS FIX COMPLETATO** - Tutte le chiamate API ora passano correttamente attraverso il proxy

**Verificato**: Login OK, Templates page OK, Google Integration OK, No CORS errors
