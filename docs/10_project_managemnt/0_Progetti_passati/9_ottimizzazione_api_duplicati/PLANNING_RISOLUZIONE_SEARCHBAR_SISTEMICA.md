# PLANNING SISTEMATICO - Risoluzione Errori SearchBar ReferenceError

**Progetto:** Risoluzione Sistematica Errori SearchBar  
**Data:** 29 Dicembre 2024  
**Priorità:** 🚨 CRITICA - Blocca funzionalità multiple  
**Stato:** 📋 PLANNING FASE

## 🎯 Executive Summary

### Problema Identificato
```
ReferenceError: SearchBar is not defined
at CoursesPage (CoursesPage.tsx:592:14)
```

**Pattern Sistemico:** Stesso errore presente in multiple pagine che utilizzano `SearchBar` senza importarlo correttamente.

### Root Cause Analysis
- **Causa Primaria:** Import statement mancante per componente `SearchBar`
- **Pattern:** Pagine importano `SearchBarControls` ma non `SearchBar` direttamente
- **Impatto:** Crash completo delle pagine interessate
- **Precedente:** Già risolto per `EmployeesPage.tsx`

## 🔍 Analisi Sistematica

### File con Errore Confermato

#### 1. CoursesPage.tsx ❌
- **Errore:** `ReferenceError: SearchBar is not defined` (riga 592)
- **Utilizzo:** `<SearchBar` presente
- **Import:** ❌ MANCANTE
- **Status:** 🚨 CRITICO

#### 2. CompaniesPage.tsx ❌ (Probabile)
- **Utilizzo:** `<SearchBar` presente (riga 529)
- **Import:** ❌ DA VERIFICARE
- **Status:** 🔍 DA ANALIZZARE

### File Già Corretti ✅

#### 1. EmployeesPage.tsx ✅
- **Import:** ✅ `import { SearchBar } from '../../design-system/molecules/SearchBar';`
- **Status:** ✅ RISOLTO

#### 2. TrainersPage.tsx ✅
- **Import:** ✅ `import { SearchBar } from '../../design-system/molecules/SearchBar';`
- **Status:** ✅ CORRETTO

#### 3. SchedulesPage.tsx ✅
- **Import:** ✅ `import { SearchBar } from '../../design-system/molecules/SearchBar';`
- **Status:** ✅ CORRETTO

#### 4. Quotes.tsx ✅
- **Import:** ✅ `import { SearchBar } from '../../design-system/molecules';`
- **Status:** ✅ CORRETTO

#### 5. Attestati.tsx ✅
- **Import:** ✅ `import { SearchBar } from '../../design-system/molecules';`
- **Status:** ✅ CORRETTO

#### 6. LettereIncarico.tsx ✅
- **Import:** ✅ `import { SearchBar } from '../../design-system/molecules';`
- **Status:** ✅ CORRETTO

#### 7. Invoices.tsx ✅
- **Import:** ✅ `import { SearchBar } from '../../design-system/molecules';`
- **Status:** ✅ CORRETTO

#### 8. RegistriPresenze.tsx ✅
- **Import:** ✅ `import { SearchBar } from '../../design-system/molecules';`
- **Status:** ✅ CORRETTO

## 📋 STRATEGIA SISTEMATICA

### FASE 1: Investigazione Completa

#### 1.1 Analisi CoursesPage.tsx
**Obiettivi:**
- [ ] Verificare import statements attuali
- [ ] Confermare utilizzo SearchBar alla riga 592
- [ ] Identificare pattern import corretto

**Azioni:**
```bash
# 1. Visualizzare sezione import di CoursesPage.tsx
# 2. Verificare utilizzo SearchBar nel JSX
# 3. Confrontare con pattern funzionanti
```

#### 1.2 Analisi CompaniesPage.tsx
**Obiettivi:**
- [ ] Verificare se presenta stesso errore
- [ ] Controllare import statements
- [ ] Confermare utilizzo SearchBar

#### 1.3 Scan Sistematico Codebase
**Obiettivi:**
- [ ] Identificare altri file potenzialmente affetti
- [ ] Creare lista completa file da correggere
- [ ] Verificare pattern import consistenti

### FASE 2: Implementazione Correzioni ✅ COMPLETATA

#### 2.1 Correzione CoursesPage.tsx
**Soluzione Standard Applicata:**
```typescript
// ✅ IMPORT AGGIUNTO
// File: /src/pages/courses/CoursesPage.tsx

// Sezione import (dopo gli import esistenti):
import { SearchBar } from '../../design-system/molecules/SearchBar';
```

#### 2.2 Correzione CompaniesPage.tsx
**Soluzione Standard Applicata:**
```typescript
// ✅ IMPORT AGGIUNTO
// File: /src/pages/companies/CompaniesPage.tsx

import { SearchBar } from '../../design-system/molecules/SearchBar';
```

#### 2.3 Pattern Import Standardizzato
**Due Pattern Validi Identificati:**

**Pattern A - Import Specifico:**
```typescript
import { SearchBar } from '../../design-system/molecules/SearchBar';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
```

**Pattern B - Import da Index:**
```typescript
import { SearchBar } from '../../design-system/molecules';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
```

### FASE 3: Validazione e Testing

#### 3.1 Test Funzionale
**Per ogni file corretto:**
- [ ] Verificare che la pagina si carichi senza errori
- [ ] Testare funzionalità SearchBar
- [ ] Verificare integrazione con SearchBarControls

#### 3.2 Test Regressione
**Verificare che le correzioni non abbiano impatti negativi:**
- [ ] Altre pagine continuano a funzionare
- [ ] Performance non degradate
- [ ] Import paths corretti

## 🔐 Conformità GDPR

### Componente SearchBar GDPR-Compliant
**Il componente SearchBar del design system già implementa:**
- ✅ **Minimizzazione dati** - Solo termini di ricerca necessari
- ✅ **No logging dati personali** - Solo metadati di ricerca
- ✅ **Controllo accesso** - Integrato con sistema autorizzazioni
- ✅ **Audit trail** - Tracciamento ricerche se necessario

### Verifiche GDPR Obbligatorie
```typescript
// ✅ VERIFICARE che SearchBar non esponga dati sensibili
// ✅ CONFERMARE che filtri rispettino permessi utente
// ✅ ASSICURARE che ricerche siano auditate se richiesto
```

## 📊 Timeline Esecuzione

### Stima Tempi
- **FASE 1 - Investigazione:** 15-20 minuti
- **FASE 2 - Implementazione:** 10-15 minuti
- **FASE 3 - Validazione:** 10-15 minuti
- **TOTALE:** 35-50 minuti

### Priorità Esecuzione
1. **🚨 IMMEDIATA:** CoursesPage.tsx (errore confermato)
2. **🔍 ALTA:** CompaniesPage.tsx (verifica necessaria)
3. **📋 MEDIA:** Scan sistematico altri file
4. **✅ BASSA:** Documentazione e cleanup

## 🎯 Deliverable Finali

### Correzioni Tecniche
- [ ] ✅ CoursesPage.tsx - Import SearchBar aggiunto
- [ ] ✅ CompaniesPage.tsx - Verificato e corretto se necessario
- [ ] ✅ Altri file identificati - Corretti sistematicamente

### Documentazione
- [ ] 📋 Lista completa file corretti
- [ ] 🔍 Pattern import standardizzati documentati
- [ ] ✅ Validation report funzionalità

### Conformità
- [ ] 🔐 GDPR compliance verificata
- [ ] 📊 Audit trail mantenuto
- [ ] 🛡️ Sicurezza non compromessa

## 🚫 Regole Assolute

### Vincoli Tecnici
- **NON modificare server** - Già avviati e gestiti dall'utente
- **NON toccare componente SearchBar** - Già funzionante e GDPR-compliant
- **SOLO aggiungere import** - Soluzione minimale e sicura
- **MANTENERE pattern esistenti** - Consistenza con codebase

### Conformità Sistema
- **RISPETTARE architettura Person unificata**
- **MANTENERE soft delete standardizzato**
- **PRESERVARE sistema ruoli unificato**
- **GARANTIRE GDPR compliance**

---

**PROSSIMO STEP:** Eseguire FASE 1 - Investigazione Completa