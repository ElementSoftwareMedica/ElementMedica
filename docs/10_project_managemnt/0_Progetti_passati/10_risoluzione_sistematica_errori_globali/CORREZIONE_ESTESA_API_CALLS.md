# 🔧 CORREZIONE ESTESA - API CALLS
## Sostituzione Fetch Diretti con Servizio API Centralizzato

**Data Creazione**: 2025-01-02  
**Status**: 🔄 IN CORSO  
**Priorità**: ALTA  

---

## 🎯 OBIETTIVO

Sostituire tutte le chiamate `fetch()` dirette con il servizio API centralizzato (`apiGet`, `apiPost`) per garantire:
- ✅ Autenticazione JWT automatica
- ✅ Gestione errori centralizzata
- ✅ Cache e ottimizzazioni
- ✅ Logging GDPR automatico
- ✅ Retry logic e timeout configurabili

---

## 📋 FILE DA CORREGGERE

### 🔴 PRIORITÀ ALTA (Pagine Principali)
1. **CompanyDetails.tsx** - 2 chiamate fetch
2. **EmployeeDetails.tsx** - 2 chiamate fetch
3. **EmployeeCreate.tsx** - 1 chiamata fetch
4. **TrainerEdit.tsx** - 3 chiamate fetch
5. **ScheduleDetailPage.tsx** - 6 chiamate fetch
6. **TrainerDetails.tsx** - 1 chiamata fetch
7. **TrainersPage.tsx** - 2 chiamate fetch
8. **SchedulesPage.tsx** - 7 chiamate fetch
9. **CompanyEdit.tsx** - 1 chiamata fetch
10. **EmployeeEdit.tsx** - 2 chiamate fetch

### 🟡 PRIORITÀ MEDIA (Componenti)
1. **EmployeeForm.tsx** - 2 chiamate fetch
2. **EmployeeFormNew.tsx** - 1 chiamata fetch

### 🟢 PRIORITÀ BASSA (Già Parzialmente Corretti)
1. **EmployeesPage.tsx** - 1 chiamata fetch rimanente

---

## 🔧 PATTERN DI CORREZIONE

### Import da Aggiungere
```typescript
import { apiGet, apiPost } from '../../services/api';
```

### Sostituzioni Standard

#### GET Requests
```typescript
// PRIMA (ERRATO)
const response = await fetch('/api/endpoint');
const data = await response.json();

// DOPO (CORRETTO)
const data = await apiGet<Type[]>('/api/endpoint');
```

#### POST/PUT Requests
```typescript
// PRIMA (ERRATO)
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// DOPO (CORRETTO)
const result = await apiPost('/api/endpoint', data);
```

#### DELETE Requests
```typescript
// PRIMA (ERRATO)
const response = await fetch('/api/endpoint/id', { method: 'DELETE' });

// DOPO (CORRETTO)
const result = await apiPost('/api/endpoint/id', null, { method: 'DELETE' });
```

---

## 📊 PROGRESS TRACKER

### ✅ COMPLETATI
- [x] EmployeesPage.tsx (principale + fetchCompanies)
- [x] CompanyDetails.tsx (2 chiamate fetch → apiGet)
- [x] EmployeeDetails.tsx (2 chiamate fetch → apiGet)
- [x] EmployeeCreate.tsx (1 chiamata fetch → apiGet)
- [x] EmployeeEdit.tsx (2 chiamate fetch → apiGet)
- [x] EmployeeForm.tsx (1 chiamata fetch → apiGet)
- [x] TrainerEdit.tsx (3 chiamate fetch → apiGet/apiPost/apiPut)
- [x] TrainerDetails.tsx (1 chiamata fetch → apiGet)
- [x] TrainersPage.tsx (2 chiamate fetch → apiDelete)

### 🔄 IN CORSO
- [ ] ScheduleDetailPage.tsx
- [ ] SchedulesPage.tsx
- [ ] CompanyEdit.tsx
- [ ] EmployeeFormNew.tsx

---

## 🎯 BENEFICI ATTESI

1. **Eliminazione Errori 401**: Autenticazione automatica
2. **Performance**: Cache e deduplicazione richieste
3. **Reliability**: Retry automatico e gestione errori
4. **GDPR**: Logging automatico delle chiamate API
5. **Maintainability**: Codice più pulito e consistente

---

## ⚠️ NOTE IMPORTANTI

- Mantenere la logica di business esistente
- Non modificare i tipi TypeScript
- Testare ogni correzione individualmente
- Preservare la gestione errori specifica dove presente
- Rispettare le regole GDPR esistenti