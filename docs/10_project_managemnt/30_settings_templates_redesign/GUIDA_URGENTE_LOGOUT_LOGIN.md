# GUIDA URGENTE: Risoluzione Errori 401 e "Invalid JSON"

**Data**: 5 Novembre 2025 - 23:00  
**Problema**: Errori 401 Unauthorized e "Invalid JSON response"  
**Causa**: Token vecchio senza permessi template + possibile problema cache browser

---

## ⚠️ ERRORI RISCONTRATI

### 1. Errore 401 su /auth/verify
```
GET http://localhost:5173/api/v1/auth/verify?_t=1762379733107 401 (Unauthorized)
RequestThrottler: Failed /api/v1/auth/verify: Request failed with status code 401
```

### 2. Errore "Invalid JSON response" su /templates
```
❌ Invalid JSON response from unknown: <!doctype html>
Error fetching templates: Error: Invalid JSON response from unknown
```

### 3. Errore 401 su /google/status
```
GET http://localhost:5173/api/v1/google/status 401 (Unauthorized)
```

---

## 🔍 DIAGNOSI

### Causa Primaria: TOKEN VECCHIO
Il browser ha memorizzato un **access token ottenuto PRIMA** che il backend fosse aggiornato con i permessi template. Questo token:
- ❌ Non ha `VIEW_TEMPLATES`, `CREATE_TEMPLATES`, etc.
- ❌ Viene rifiutato dal backend con 401 Unauthorized
- ❌ Causa il fallimento di tutte le chiamate API

### Causa Secondaria: CACHE BROWSER
Il browser potrebbe aver memorizzato:
- Token in localStorage
- Permessi in AuthContext state
- Risposte API in cache HTTP

---

## ✅ SOLUZIONE DEFINITIVA (3 PASSI)

### PASSO 1: Svuota Cache e Storage Browser

1. **Apri Developer Tools**:
   - Mac: `Cmd + Option + I`
   - Windows/Linux: `F12` o `Ctrl + Shift + I`

2. **Vai su Tab "Application"** (o "Applicazione" in italiano)

3. **Elimina Storage**:
   - Click su "Local Storage" → `http://localhost:5173`
   - Click destro → "Clear"
   - Click su "Session Storage" → `http://localhost:5173`
   - Click destro → "Clear"
   - Click su "Cookies" → `http://localhost:5173`
   - Elimina tutti i cookie

4. **Svuota Cache HTTP**:
   - Click destro sulla barra degli indirizzi → Reload pagina
   - Oppure: `Cmd + Shift + R` (Mac) / `Ctrl + Shift + R` (Windows)

### PASSO 2: Chiudi e Riapri Browser Tab

1. **Chiudi completamente** la tab `http://localhost:5173`
2. **Apri nuova tab**
3. **Vai su** `http://localhost:5173`

### PASSO 3: Fai Login con Nuove Credenziali

1. **Login Page** dovrebbe apparire automaticamente (dopo aver svuotato storage)
2. **Inserisci credenziali**:
   - Email: `admin@example.com`
   - Password: `Admin123!`
3. **Click "Login"**

---

## 🧪 VERIFICA CHE FUNZIONI

### Test 1: Console Browser - Controlla Token
Apri Console (F12 → Tab "Console") e digita:

```javascript
// Verifica token presente
const token = localStorage.getItem('accessToken') || localStorage.getItem('access_token');
console.log('Token presente:', !!token);
console.log('Token primi 50 char:', token ? token.substring(0, 50) : 'MISSING');

// Verifica permessi caricati
const permissions = JSON.parse(localStorage.getItem('permissions') || '{}');
const templatePerms = Object.keys(permissions).filter(k => k.includes('template') || k.includes('TEMPLATE'));
console.log('Permessi template trovati:', templatePerms.length);
console.log('Esempi:', templatePerms.slice(0, 5));
```

**Risultato Atteso**:
```
Token presente: true
Token primi 50 char: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwZXJzb25JZ...
Permessi template trovati: 19
Esempi: ["VIEW_TEMPLATES", "CREATE_TEMPLATES", "templates:read", "templates:create", "templates:edit"]
```

### Test 2: Network Tab - Controlla API Calls

1. **Apri Network Tab** (F12 → "Network")
2. **Naviga a** `/settings/templates`
3. **Verifica chiamate**:
   - ✅ `GET /api/v1/templates` → Status **200 OK**
   - ✅ `GET /api/v1/google/status` → Status **200 OK**
   - ❌ Nessun 401 Unauthorized
   - ❌ Nessun "Invalid JSON"

### Test 3: UI - Verifica Funzionalità

1. **Pagina Templates si carica** senza errori
2. **GoogleIntegrationPanel visibile** in alto
3. **Bottone "Connetti Google Account"** presente
4. **Nessun messaggio di errore** nella pagina

---

## 🔧 TROUBLESHOOTING AVANZATO

### Se ancora vedi 401 dopo logout/login:

#### A. Verifica Token Backend
Apri terminale e testa direttamente:

```bash
# Login e ottieni nuovo token
TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' \
  | jq -r '.tokens.access_token')

echo "Token: ${TOKEN:0:50}..."

# Testa /auth/verify
curl -s "http://localhost:4001/api/v1/auth/verify" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{valid, email: .user.email, templatePermsCount: [.permissions | to_entries[] | select(.key | contains("template")) | .key] | length}'
```

**Risultato Atteso**:
```json
{
  "valid": true,
  "email": "admin@example.com",
  "templatePermsCount": 19
}
```

Se vedi `"valid": true` e `templatePermsCount > 0`, il backend funziona. Il problema è nel frontend.

#### B. Verifica Proxy Forwarding
```bash
# Testa templates via proxy
curl -s "http://localhost:4003/api/v1/templates" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{success, count: (.data // [] | length)}'
```

**Risultato Atteso**:
```json
{
  "success": true,
  "count": 0
}
```

#### C. Verifica Vite Proxy Config

Il frontend usa il Vite dev server che proxya `/api/*` a `localhost:4003`. 

**File**: `vite.config.ts`

Dovrebbe contenere:
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:4003',
      changeOrigin: true,
      // ... altre opzioni
    }
  }
}
```

Se questo manca o è commentato, le chiamate API non vengono inoltrate correttamente.

---

## 🚨 SE NIENTE FUNZIONA: RESET COMPLETO

### Opzione Nucleare: Restart Everything

```bash
# 1. Killa tutti i processi Node
pkill -9 node

# 2. Cancella cache npm (se necessario)
rm -rf node_modules/.cache

# 3. Riavvia API Server
cd /Users/matteo.michielon/project\ 2.0\ VS/backend
NODE_ENV=development node servers/api-server.js > /tmp/api.log 2>&1 &

# 4. Aspetta 3 secondi
sleep 3

# 5. Verifica API health
curl http://localhost:4001/health

# 6. Riavvia Proxy Server (se separato)
# cd /path/to/proxy
# node proxy-server.js > /tmp/proxy.log 2>&1 &

# 7. Riavvia Frontend
cd /Users/matteo.michielon/project\ 2.0\ VS
npm run dev
```

Poi ripeti i passi 1-3 della soluzione (svuota cache, riapri browser, login).

---

## 📋 CHECKLIST FINALE

Prima di contattare supporto, verifica:

- [ ] Hai fatto **logout completo** dal browser
- [ ] Hai **svuotato Local Storage** (Application tab)
- [ ] Hai **svuotato Session Storage**
- [ ] Hai **eliminato tutti i cookie** di localhost:5173
- [ ] Hai **ricaricato con cache vuota** (Cmd+Shift+R)
- [ ] Hai **chiuso e riaperto la tab** del browser
- [ ] Hai fatto **login con credenziali corrette** (admin@example.com / Admin123!)
- [ ] Hai verificato in **Network Tab** che le chiamate API ritornano 200
- [ ] Hai verificato in **Console** che i permessi template sono presenti

---

## 🎯 RIEPILOGO VELOCE

**Il problema è che hai un token vecchio nel browser.**

**Soluzione in 30 secondi**:
1. F12 → Application → Local Storage → localhost:5173 → Clear
2. Chiudi tab, riapri
3. Login con admin@example.com / Admin123!
4. Vai su /settings/templates
5. Funziona ✅

---

## 📞 Se Ancora Non Funziona

Se dopo aver seguito TUTTI i passi continui a vedere 401:

1. **Copia l'output** di questo comando terminal:
```bash
# Test completo sistema
TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' \
  | jq -r '.tokens.access_token') && \
echo "=== TOKEN ===" && \
echo "${TOKEN:0:50}..." && \
echo "=== AUTH/VERIFY ===" && \
curl -s "http://localhost:4001/api/v1/auth/verify" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{valid, templatePerms: [.permissions | to_entries[] | select(.key | contains("TEMPLATE")) | .key] | length}' && \
echo "=== TEMPLATES ===" && \
curl -s "http://localhost:4003/api/v1/templates" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{success, count: (.data // [] | length)}'
```

2. **Fai screenshot** della Console Browser con errori

3. **Invia entrambi** per diagnosi approfondita

---

## ✅ SUCCESS CRITERIA

Dopo aver seguito la guida, dovresti vedere:

✅ **Console Browser**: Zero errori 401  
✅ **Console Browser**: Zero "Invalid JSON response"  
✅ **Network Tab**: GET /api/v1/templates → 200 OK  
✅ **Network Tab**: GET /api/v1/google/status → 200 OK  
✅ **UI**: GoogleIntegrationPanel visibile  
✅ **UI**: Lista template (anche vuota) senza errori  

**Status Atteso**: 🎉 **TUTTO FUNZIONANTE**
