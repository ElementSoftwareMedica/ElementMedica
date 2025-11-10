# Fix Routing Endpoints - Invalid JSON Response

**Data**: 5 novembre 2025  
**Problema**: `Invalid JSON response from unknown: <!doctype html>`  
**Root Cause**: Chiamate API senza prefisso `/api/v1/` non intercettate da Vite proxy  

---

## 1. Analisi del Problema

### Sintomi Riportati dall'Utente

```
GET http://localhost:5173/api/v1/auth/verify 401 (Unauthorized)
Invalid JSON response from unknown: <!doctype html>
GET http://localhost:5173/api/v1/google/status 401 (Unauthorized)
```

Ma l'errore principale era:

```javascript
// Templates.tsx line 98
const response = await apiGet<any>('templates');
// Risultato: GET http://localhost:5173/templates → HTML (index.html)
```

### Root Cause Analysis

**Flusso Corretto**:
```
Browser → apiGet('/api/v1/templates') 
        → Vite Dev Server (5173) 
        → Vite Proxy Config (vite.config.ts: '/api' → '4003')
        → Proxy Server (4003)
        → API Server (4001)
        → JSON Response ✅
```

**Flusso Errato (Prima del Fix)**:
```
Browser → apiGet('templates') 
        → GET http://localhost:5173/templates
        → Vite Dev Server NON ha route /templates
        → Vite fallback: Restituisce index.html (SPA routing)
        → Frontend riceve HTML invece di JSON ❌
```

### Configurazione Vite Proxy

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {  // ⚠️ SOLO path che iniziano con /api vengono proxati!
        target: 'http://localhost:4003',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
```

**Conclusione**: Path come `/templates`, `/google/status` NON matchano `/api` quindi non vengono proxati.

---

## 2. File Modificati

### 2.1 `src/pages/settings/Templates.tsx`

**Modifiche**: 6 chiamate API corrette

#### Fetch Templates
```typescript
// PRIMA
const response = await apiGet<any>('templates');

// DOPO
const response = await apiGet<any>('/api/v1/templates');
```

#### Create/Update Template
```typescript
// PRIMA
if (isEditing) {
  await apiPut(`templates/${id}`, data);
} else {
  await apiPost('templates', data);
}

// DOPO
if (isEditing) {
  await apiPut(`/api/v1/templates/${id}`, data);
} else {
  await apiPost('/api/v1/templates', data);
}
```

#### Set Default Template
```typescript
// PRIMA
const handleSetDefault = async (templateId: string) => {
  await apiPut(`templates/${templateId}/set-default`, {});
  toast.success('Template predefinito impostato');
};

// DOPO
const handleSetAsDefault = async (templateId: string) => {
  await apiPut(`/api/v1/templates/${templateId}/set-default`, {});
  toast({
    title: 'Successo',
    description: 'Template predefinito impostato',
    status: 'success'
  });
};
```

**Bonus Fix**: Rinominato `handleSetDefault` → `handleSetAsDefault` per match con prop `onSetAsDefault`

#### Delete Template
```typescript
// PRIMA
await apiDelete(`templates/${templateId}`);

// DOPO
await apiDelete(`/api/v1/templates/${templateId}`);
```

#### Duplicate Template
```typescript
// PRIMA
await apiPost(`templates/${template.id}/duplicate`, { name: newName.trim() });

// DOPO
await apiPost(`/api/v1/templates/${template.id}/duplicate`, { name: newName.trim() });
```

---

### 2.2 `src/pages/settings/TemplateEditor.tsx`

**Modifiche**: 5 chiamate API corrette

#### Fetch Single Template
```typescript
// PRIMA
const response = await apiGet<any>(`templates/${id}`);

// DOPO
const response = await apiGet<any>(`/api/v1/templates/${id}`);
```

#### Save Template (Create/Update)
```typescript
// PRIMA
if (id) {
  await apiPut(`templates/${id}`, templateData);
} else {
  const response = await apiPost<any>('templates', templateData);
}

// DOPO
if (id) {
  await apiPut(`/api/v1/templates/${id}`, templateData);
} else {
  const response = await apiPost<any>('/api/v1/templates', templateData);
}
```

#### Fetch All Templates (for default logic)
```typescript
// PRIMA
const allResponse = await apiGet<any>('templates');

// DOPO
const allResponse = await apiGet<any>('/api/v1/templates');
```

#### Update Template isDefault
```typescript
// PRIMA
await apiPut(`templates/${template.id}`, {
  ...template,
  isDefault: false
});

// DOPO
await apiPut(`/api/v1/templates/${template.id}`, {
  ...template,
  isDefault: false
});
```

---

### 2.3 Verifica Servizi (Già Corretti)

#### `src/pages/settings/templates/services/googleService.ts` ✅

Tutti gli endpoint già corretti:
```typescript
const response = await apiClient.get('/api/v1/google/status');
const response = await apiClient.get('/api/v1/google/auth/url');
await apiClient.post('/api/v1/google/auth/callback', { code });
await apiClient.delete('/api/v1/google/disconnect');
const response = await apiClient.post('/api/v1/google/import-docs', { documentId, name });
const response = await apiClient.post('/api/v1/google/import-slides', { presentationId, name });
```

#### `src/pages/settings/templates/services/templateService.ts` ✅

Tutti gli endpoint già corretti:
```typescript
apiClient.get<TemplateListResponse>(`/api/v1/templates?${params}`);
apiClient.get<TemplateResponse>(`/api/v1/templates/${id}`);
apiClient.post<TemplateResponse>('/api/v1/templates', data);
apiClient.put<TemplateResponse>(`/api/v1/templates/${id}`, data);
apiClient.delete(`/api/v1/templates/${id}`);
apiClient.post<TemplateResponse>(`/api/v1/templates/${id}/duplicate`, { name });
apiClient.get(`/api/v1/templates/${templateId}/versions`);
apiClient.post(`/api/v1/templates/${templateId}/restore-version`, { versionNumber });
apiClient.post(`/api/v1/templates/${templateId}/preview`, { mockData });
```

---

## 3. Testing e Verifica

### Test 1: Backend Endpoint (Via Proxy Server)
```bash
TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' \
  | jq -r '.tokens.access_token')

curl -s "http://localhost:4003/api/v1/templates" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{success, count: (.data | length)}'
```

**Risultato**: `{"success":true,"count":0}` ✅

### Test 2: Frontend Endpoint (Via Vite Proxy)
```bash
curl -s "http://localhost:5173/api/v1/templates" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{success, count: (.data | length)}'
```

**Risultato**: `{"success":true,"count":0}` ✅

### Test 3: Verifica Proxy Vite Console
```
🔍 [VITE PROXY] Proxying request: {
  method: 'GET',
  url: '/api/v1/templates',
  path: '/api/v1/templates',
  target: 'http://localhost:4003'
}
🔍 [VITE PROXY] Response received: {
  status: 200,
  url: '/api/v1/templates'
}
```

---

## 4. Riepilogo Modifiche

| File | Linee Modificate | Tipo Modifica |
|------|------------------|---------------|
| `Templates.tsx` | 98, 125, 134, 186, 201, 227 | Aggiungi `/api/v1/` prefisso |
| `Templates.tsx` | 184-194 | Fix nome funzione + toast |
| `TemplateEditor.tsx` | 82, 186, 189, 195, 204 | Aggiungi `/api/v1/` prefisso |
| **TOTALE** | **11 endpoint corretti** | **0 errori TypeScript** |

---

## 5. Perché il Problema Era Sfuggito Prima

1. **Guide precedenti** si concentravano su:
   - Permissions backend (rbac.js, auth endpoints)
   - CORS (proxy chain configuration)
   - Token refresh (logout/re-login)

2. **Questo fix** risolve un problema **ortogonale**:
   - Non era un problema di permessi (backend ok)
   - Non era un problema di CORS (proxy ok)
   - Non era un problema di token (autenticazione ok)
   - **Era un problema di routing**: Path mancante `/api/v1/`

3. **Sintomo "Invalid JSON"** era fuorviante:
   - Non era un errore JSON del backend
   - Era HTML del frontend (index.html)
   - Causato da Vite SPA fallback routing

---

## 6. Checklist Utente - Verifica Fix

### Passo 1: Clear Browser Cache
```
1. F12 → Application → Clear storage → Clear site data
2. Chiudi e riapri il browser tab
```

### Passo 2: Re-Login
```
1. Vai a http://localhost:5173
2. Login con: admin@example.com / Admin123!
3. Vai a /settings/templates
```

### Passo 3: Verifica Console (F12)
**Aspettato**: Nessun errore "Invalid JSON"

**Richieste visibili**:
```
✅ GET /api/v1/templates → 200 OK
✅ GET /api/v1/google/status → 200 OK
```

### Passo 4: Verifica Network Tab
```
1. F12 → Network
2. Filtra: XHR
3. Ricarica pagina (Cmd+R)
4. Verifica status: 200 per templates e google
```

### Passo 5: Test Funzionalità UI
```
✅ Google Integration Panel visibile
✅ Template list carica (anche se vuoto)
✅ Menu dropdown template visibile:
   - "Duplica Template"
   - "Storico Versioni"
✅ Nessun alert di errore
```

---

## 7. Prossimi Passi

### Se Ancora Vedi Errori 401

**Problema diverso**: Token permissions (vedi `GUIDA_URGENTE_LOGOUT_LOGIN.md`)

**Test backend**:
```bash
TOKEN=$(fresh_login_curl)
curl /api/v1/auth/verify -H "Authorization: Bearer $TOKEN" | jq '.permissions | keys'
```

**Aspettato**: Almeno 19 template permissions

### Se Vedi Altri Errori "Invalid JSON"

**Verifica altri file**:
```bash
grep -r "apiGet\|apiPost\|apiPut\|apiDelete" src/ | grep -v "/api/v1/" | grep -v "node_modules"
```

**Se trova match**: Applica stesso fix (aggiungi `/api/v1/`)

---

## 8. Documentazione Correlata

- **GUIDA_URGENTE_LOGOUT_LOGIN.md**: Token permissions refresh
- **FIX_PERMISSIONS_COMPLETE.md**: Backend permission setup
- **FIX_CORS_PROXY.md**: Proxy chain architecture
- **IMPROVEMENTS_COMPLETED.md**: Feature implementation details

---

## 9. Lezioni Apprese

### Debugging Multi-Layer Architecture

Quando si lavora con:
```
Frontend (React) → Vite Proxy → Express Proxy → API Server
```

**Verificare sempre**:
1. ✅ Server attivi e healthy
2. ✅ Configurazione proxy corretta
3. ✅ Path matching proxy rules
4. ✅ Token valido e con permissions
5. ✅ Backend endpoint funzionante

**Ordine di debug**:
1. Test backend diretto (curl API server)
2. Test via proxy server (curl proxy)
3. Test via Vite proxy (curl frontend)
4. Test browser (DevTools Network tab)

### URL Path Best Practices

**✅ Sempre usare path assoluti**:
```typescript
apiGet('/api/v1/templates')  // ✅ Corretto
```

**❌ Evitare path relativi**:
```typescript
apiGet('templates')  // ❌ Ambiguo, dipende da baseURL
```

**✅ Configurazione centralizzata**:
```typescript
// src/config/api/index.ts
export const API_BASE_URL = '';  // Empty in browser
export const API_ENDPOINTS = {
  TEMPLATES: '/api/v1/templates',  // Sempre con prefisso completo
};
```

---

**Status**: ✅ FIX COMPLETATO  
**Testing**: ✅ VERIFICATO (backend + frontend)  
**Errori TypeScript**: ✅ 0 errori  
**Prossima azione**: User deve fare logout/re-login e testare UI
