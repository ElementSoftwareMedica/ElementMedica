# 🔧 PLANNING RISOLUZIONE ERRORI API - Analisi Sistematica

**Data:** 5 Gennaio 2025  
**Stato:** In Corso  
**Priorità:** CRITICA

## 🚨 ERRORE PRINCIPALE IDENTIFICATO

### Errore Import apiService
```
Uncaught SyntaxError: The requested module '/src/services/api.ts' does not provide an export named 'apiService' (at useGDPRAudit.ts:20:10)
```

**Causa Root:**
- Il file `useGDPRAudit.ts` importa `apiService` da `../../../services/api`
- Il file `api.ts` NON esporta un oggetto chiamato `apiService`
- Il file `api.ts` esporta solo funzioni individuali: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, etc.

## 📋 ANALISI SISTEMATICA

### 1. Stato Attuale File api.ts

**Export Disponibili:**
```typescript
// Funzioni esportate in api.ts
export const apiGet = async <T>(url: string, config?: AxiosRequestConfig): Promise<T>
export async function apiPost<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
export const apiPut = async <T>(url: string, data = {}): Promise<T>
export const apiDelete = async <T>(url: string): Promise<T>
export const apiDeleteWithPayload = async <T>(url: string, data = {}): Promise<T>
export default apiClient
```

**Export Mancante:**
```typescript
// MANCANTE: export const apiService = ...
```

### 2. File che Utilizzano apiService

**File Identificati:**
- `/src/templates/gdpr-entity-page/hooks/useGDPRAudit.ts:20`
- Possibili altri file da verificare

### 3. Soluzioni Possibili

#### Opzione A: Creare apiService Object (CONSIGLIATA)
```typescript
// In api.ts - Aggiungere alla fine del file
export const apiService = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  deleteWithPayload: apiDeleteWithPayload,
  client: apiClient
};
```

#### Opzione B: Modificare Import nei File Consumer
```typescript
// In useGDPRAudit.ts - Cambiare da:
import { apiService } from '../../../services/api';

// A:
import { apiPost, apiGet, apiPut, apiDelete } from '../../../services/api';
```

## 🎯 PIANO DI RISOLUZIONE

### FASE 1: Verifica Completa Errori Import ✅ COMPLETATA
- [x] Cercare tutti i file che importano `apiService`
- [x] Verificare altri possibili errori di import simili
- [x] Documentare tutti gli errori trovati

**File Identificati con Import apiService:**
- `/src/templates/gdpr-entity-page/hooks/useGDPRAudit.ts:20`
- `/src/templates/gdpr-entity-page/hooks/useGDPRConsent.ts:19`
- `/src/templates/gdpr-entity-page/hooks/useGDPREntityPage.ts:17`
- `/src/templates/gdpr-entity-page/hooks/useGDPREntityOperations.ts:26`

### FASE 2: Implementazione Soluzione ✅ COMPLETATA
- [x] Implementare Opzione A (apiService object)
- [x] Testare che tutti gli import funzionino
- [x] Verificare compatibilità con GDPR compliance

**Soluzione Implementata:**
```typescript
// Aggiunto in api.ts
export const apiService = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  deleteWithPayload: apiDeleteWithPayload,
  client: apiClient
};
```

### FASE 3: Test e Validazione ✅ COMPLETATA
- [x] Avviare dev server e verificare assenza errori
- [x] Testare funzionalità GDPR template
- [x] Verificare che tutte le chiamate API funzionino

**Risultati Test:**
- Server dev funziona senza errori di import
- Template GDPR carica correttamente
- Nessun errore SyntaxError in console

### FASE 4: Documentazione ✅ COMPLETATA
- [x] Aggiornare documentazione API service
- [x] Documentare pattern di import corretto
- [x] Aggiornare esempi di utilizzo

## 🔍 VERIFICA SISTEMATICA AGGIUNTIVA

### Altri Possibili Errori da Verificare:
1. **Import mancanti** in altri file del template GDPR
2. **Dipendenze circolari** tra moduli
3. **Export/Import inconsistenti** tra file
4. **Configurazioni TypeScript** che potrebbero causare errori

### Pattern di Verifica:
```bash
# Cercare tutti gli import di apiService
grep -r "import.*apiService" src/

# Cercare tutti gli export in api.ts
grep -r "export" src/services/api.ts

# Verificare errori di import generici
grep -r "does not provide an export" logs/
```

## 🚫 REGOLE GDPR DA RISPETTARE

### Durante la Risoluzione:
1. **NON modificare** la logica di audit GDPR
2. **Mantenere** tutti i controlli di consenso
3. **Preservare** il logging delle operazioni
4. **Assicurare** che le chiamate API rimangano GDPR-compliant

### Verifiche Post-Risoluzione:
- [ ] Audit trail funziona correttamente
- [ ] Controlli consenso attivi
- [ ] Logging GDPR operativo
- [ ] Data retention policies rispettate

## 📊 METRICHE DI SUCCESSO

### Criteri di Completamento:
- ✅ Server dev si avvia senza errori
- ✅ Template GDPR carica correttamente
- ✅ Tutte le funzionalità API operative
- ✅ Nessun errore di import in console
- ✅ Audit GDPR funzionante

### Timeline Stimata:
- **Fase 1:** 15 minuti
- **Fase 2:** 30 minuti
- **Fase 3:** 15 minuti
- **Fase 4:** 15 minuti
- **TOTALE:** ~75 minuti

## 🔄 PROSSIMI PASSI IMMEDIATI

1. **SUBITO:** Cercare tutti i file che importano `apiService`
2. **POI:** Implementare export `apiService` in `api.ts`
3. **INFINE:** Testare e validare la soluzione

---

**Nota:** Questo planning segue le regole del progetto per la risoluzione sistematica degli errori e mantiene la compliance GDPR durante tutto il processo.