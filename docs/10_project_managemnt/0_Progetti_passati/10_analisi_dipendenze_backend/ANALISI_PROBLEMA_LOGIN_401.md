# 🚨 ANALISI PROBLEMA - Login 401 Unauthorized

**Data**: 2 Luglio 2025  
**Stato**: In Analisi  
**Priorità**: CRITICA  

## 🎯 Problema Identificato

### Errore Utente
```
POST http://localhost:5173/api/v1/auth/login 401 (Unauthorized)
```

### Analisi Tecnica

#### 1. Configurazione Attuale
- **API_BASE_URL**: `''` (stringa vuota) ✅ Corretto
- **Proxy Vite**: `/api` → `http://localhost:4001` ✅ Configurato
- **Auth Service**: Usa `/api/v1/auth/login` ✅ Endpoint corretto
- **Dev Server**: Porta 5173 ✅ Attivo

#### 2. Problema Identificato
La richiesta viene effettuata a `localhost:5173` invece di essere proxata a `localhost:4001` attraverso il proxy Vite.

**Causa Probabile**: Il proxy Vite non sta intercettando correttamente le richieste `/api/*`

#### 3. Evidenze dal Codice

**File**: `/src/services/auth.ts` (riga 16)
```typescript
export const login = async (identifier: string, password: string): Promise<AuthResponse> => {
  return await apiPost<AuthResponse>('/api/v1/auth/login', {
    identifier,
    password,
  });
};
```

**File**: `/src/config/api/index.ts` (riga 7)
```typescript
export const API_BASE_URL = ''; // Corretto per proxy Vite
```

**File**: `/vite.config.ts` (righe 8-14)
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:4001',
    changeOrigin: true,
    secure: false
  }
}
```

#### 4. Flusso Atteso vs Reale

**Flusso Atteso**:
```
Client → POST /api/v1/auth/login → Vite Proxy → http://localhost:4001/api/v1/auth/login
```

**Flusso Reale**:
```
Client → POST http://localhost:5173/api/v1/auth/login → 401 Unauthorized
```

## 🔍 Possibili Cause

### 1. Proxy Vite Non Attivo
- Il dev server potrebbe non aver caricato correttamente la configurazione proxy
- Riavvio server necessario (ma vietato dalle regole)

### 2. Configurazione Axios Errata
- L'axios client potrebbe avere una configurazione che bypassa il proxy
- BaseURL potrebbe essere sovrascritto altrove

### 3. Interceptor Problematici
- Gli interceptor in `api.ts` potrebbero modificare l'URL della richiesta
- Debug logs mostrano configurazione corretta ma comportamento diverso

### 4. Cache Browser/Build
- Cache del browser potrebbe contenere configurazioni obsolete
- Build cache di Vite potrebbe essere corrotta

## 📋 Piano di Risoluzione

### FASE 1: Diagnosi Approfondita (15 min)

#### 1.1 Verifica Configurazione Runtime
- [ ] Controllare console browser per debug logs axios
- [ ] Verificare Network tab per URL effettivo delle richieste
- [ ] Analizzare headers delle richieste

#### 1.2 Test Proxy Vite
- [ ] Test manuale endpoint proxy: `curl http://localhost:5173/api/v1/auth/login`
- [ ] Verifica se proxy risponde correttamente
- [ ] Controllo logs dev server per errori proxy

#### 1.3 Analisi Interceptor
- [ ] Aggiungere debug logs negli interceptor axios
- [ ] Verificare se URL viene modificato durante il processing
- [ ] Controllare configurazione baseURL runtime

### FASE 2: Correzioni Immediate (20 min)

#### 2.1 Pulizia Cache
- [ ] Pulire cache browser (Ctrl+Shift+R)
- [ ] Pulire cache Vite (`rm -rf node_modules/.vite`)
- [ ] Verificare localStorage per configurazioni obsolete

#### 2.2 Correzione Configurazione
- [ ] Verificare import API_BASE_URL in tutti i file
- [ ] Controllare se esistono override di configurazione
- [ ] Assicurarsi che non ci siano hardcoded URLs

#### 2.3 Test Backend Diretto
- [ ] Test diretto API server: `curl http://localhost:4001/api/v1/auth/login`
- [ ] Verificare se backend risponde correttamente
- [ ] Controllare logs backend per errori

### FASE 3: Implementazione Fix (25 min)

#### 3.1 Opzione A: Fix Proxy Vite
- [ ] Modificare configurazione proxy se necessario
- [ ] Aggiungere debug logs al proxy
- [ ] Test configurazione proxy

#### 3.2 Opzione B: Fix Configurazione Axios
- [ ] Modificare baseURL se necessario
- [ ] Rimuovere interceptor problematici
- [ ] Semplificare configurazione axios

#### 3.3 Opzione C: Workaround Temporaneo
- [ ] Configurare baseURL diretto al backend
- [ ] Gestire CORS se necessario
- [ ] Documentare come soluzione temporanea

### FASE 4: Verifica e Test (10 min)

#### 4.1 Test Funzionale
- [ ] Test login con credenziali valide
- [ ] Verificare token storage
- [ ] Test navigazione post-login

#### 4.2 Test Regressione
- [ ] Verificare altre chiamate API
- [ ] Test su diverse pagine
- [ ] Controllo console per errori

#### 4.3 Documentazione
- [ ] Aggiornare documentazione con fix applicato
- [ ] Documentare lezioni apprese
- [ ] Aggiornare troubleshooting guide

## 🎯 Criteri di Successo

- ✅ Login funziona senza errori 401
- ✅ Richieste API vengono proxate correttamente
- ✅ Token viene salvato e utilizzato correttamente
- ✅ Navigazione post-login funziona
- ✅ Nessuna regressione su altre funzionalità

## 🚫 Vincoli

- **NON riavviare server** (vietato dalle regole)
- **NON modificare porte** (4001, 4002, 4003, 5173)
- **NON alterare architettura** tre server
- **Mantenere GDPR compliance**
- **Preservare configurazione proxy esistente**

## 📚 Riferimenti

- Documentazione precedente: `/docs/10_project_managemnt/6_analisi_login_timeout/`
- Configurazione API: `/src/config/api/index.ts`
- Servizio Auth: `/src/services/auth.ts`
- Configurazione Vite: `/vite.config.ts`