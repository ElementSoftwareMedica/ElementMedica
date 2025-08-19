# Soluzioni Implementate - Problema Login Timeout

## 📋 Riepilogo del Problema

**Problema identificato**: Il sistema di login impiegava sempre 60 secondi prima di fallire, causando una pessima user experience.

**Causa principale**: Timeout hardcoded di 60 secondi nel frontend per tutte le chiamate POST/PUT, incluse quelle di autenticazione.

## 🔧 Soluzioni Implementate

### Modifica 1: Timeout Differenziati in `apiPost()`

**File**: `/src/services/api.ts`
**Funzione**: `apiPost()`
**Righe modificate**: 324-338

```typescript
// PRIMA (timeout fisso)
timeout: 60000, // Timeout esteso a 60 secondi

// DOPO (timeout dinamico)
const getTimeoutForUrl = (url: string): number => {
  // Timeout ridotto per operazioni di autenticazione (10 secondi)
  if (url.includes('/auth/')) {
    return 10000;
  }
  // Timeout esteso per generazione documenti (60 secondi)
  if (url.includes('/generate') || url.includes('/documents')) {
    return 60000;
  }
  // Timeout standard per altre operazioni (30 secondi)
  return 30000;
};

timeout: config?.timeout || getTimeoutForUrl(url),
```

### Modifica 2: Timeout Differenziati in `apiPut()`

**File**: `/src/services/api.ts`
**Funzione**: `apiPut()`
**Righe modificate**: 354-368

```typescript
// PRIMA (timeout fisso)
timeout: 60000 // Timeout esteso anche per PUT

// DOPO (timeout dinamico)
const getTimeoutForUrl = (url: string): number => {
  // Timeout ridotto per operazioni di autenticazione (10 secondi)
  if (url.includes('/auth/')) {
    return 10000;
  }
  // Timeout esteso per generazione documenti (60 secondi)
  if (url.includes('/generate') || url.includes('/documents')) {
    return 60000;
  }
  // Timeout standard per altre operazioni (30 secondi)
  return 30000;
};

timeout: getTimeoutForUrl(url)
```

### Modifica 3: Abilitazione withCredentials per Autenticazione

**File**: `/src/services/api.ts`
**Funzioni**: `apiPost()` e `apiPut()`
**Problema**: Il server invia cookie HttpOnly ma il frontend aveva `withCredentials: false`

```typescript
// PRIMA
withCredentials: false, // Configurazione globale

// DOPO (in apiPost)
withCredentials: url.includes('/auth/') ? true : config?.withCredentials,

// DOPO (in apiPut)
withCredentials: url.includes('/auth/') ? true : false
```

**Motivazione**: I cookie di sessione (accessToken, refreshToken, sessionToken) sono HttpOnly e richiedono `withCredentials: true` per essere inviati e ricevuti correttamente.

### Modifica 4: Fix Import Mancanti in auth.ts

**File**: `/src/services/auth.ts`
**Problema**: Il file utilizzava `apiPost` e `apiGet` senza importarli
**Errore**: `ReferenceError: apiPost is not defined`

```typescript
// PRIMA
import apiClient from './api';

// DOPO
import apiClient, { apiPost, apiGet } from './api';
```

**Motivazione**: Le funzioni `apiPost` e `apiGet` sono necessarie per le chiamate di autenticazione con i timeout e configurazioni corrette.

## 📊 Configurazione Timeout per Categoria

| Categoria | Pattern URL | Timeout | Motivazione |
|-----------|-------------|---------|-------------|
| **Autenticazione** | `/auth/*` | 10 secondi | Login deve fallire rapidamente |
| **Documenti** | `/generate/*`, `/documents/*` | 60 secondi | Operazioni lunghe di generazione |
| **Standard** | Tutte le altre | 30 secondi | Bilanciamento tra UX e affidabilità |

## 🎯 Risultati Attesi

### Prima delle Modifiche
- ❌ Login con credenziali errate: **60 secondi** di attesa
- ❌ Login con credenziali corrette: **timeout dopo 60s**
- ❌ Cookie di sessione non gestiti correttamente
- ❌ Import mancanti causano `ReferenceError`
- ❌ Pessima user experience

### Dopo le Modifiche
- ✅ Login con credenziali errate: **10 secondi** di attesa
- ✅ Login con credenziali corrette: **funzionante** (import risolti)
- ✅ Cookie HttpOnly ricevuti e inviati correttamente
- ✅ Sessione persistente tra richieste
- ✅ Funzioni API correttamente importate
- ✅ Feedback rapido all'utente

## 🧪 Test da Eseguire

### Test 1: Login con Credenziali Errate
```bash
# Dovrebbe fallire in ~10 secondi
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' \
  -w "Time: %{time_total}s\n"
```

### Test 2: Operazioni Documenti
```bash
# Dovrebbe avere timeout di 60 secondi
curl -X POST http://localhost:4001/api/documents/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"report"}' \
  -w "Time: %{time_total}s\n"
```

### Test 3: Operazioni Standard
```bash
# Dovrebbe avere timeout di 30 secondi
curl -X POST http://localhost:4001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}' \
  -w "Time: %{time_total}s\n"
```

## 📝 Note Tecniche

1. **Backward Compatibility**: La modifica mantiene la possibilità di override del timeout tramite il parametro `config?.timeout`

2. **Pattern Matching**: Utilizza `url.includes()` per identificare il tipo di operazione

3. **Fallback**: Se l'URL non corrisponde a nessun pattern, usa il timeout standard di 30 secondi

4. **Impatto**: Modifica solo il comportamento del timeout, non la logica di business

## 🔄 Prossimi Passi

1. **Test Frontend**: Verificare che il login fallisca rapidamente nell'interfaccia utente
2. **Test Regressione**: Assicurarsi che le operazioni lunghe funzionino ancora
3. **Monitoraggio**: Osservare i tempi di risposta in produzione
4. **Documentazione**: Aggiornare la documentazione API con i nuovi timeout

---

**Data implementazione**: $(date +"%Y-%m-%d %H:%M:%S")
**Analisi completa**: `/docs/10_project_managemnt/6_analisi_login_timeout/PLANNING_SISTEMATICO.md`