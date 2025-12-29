# 🚨 REPORT PROBLEMI CRITICI - Project 2.0
**Data Analisi**: 2024-12-19
**Versione**: 1.0

## 📊 SUMMARY ESECUTIVO

### Problemi Identificati
- **2997 errori ESLint** (2861 errori + 136 warning)
- **109 test falliti** su 400 totali (72.75% successo)
- **Violazioni regole progetto** - Uso di entità obsolete
- **File hotspots** - 20 file > 700 righe

## 🔥 HOTSPOTS - FILE PIÙ GRANDI

### File Critici (>1000 righe)
1. **OptimizedPermissionManager.tsx** - 1057 righe ⚠️ CRITICO
2. **PersonImport.tsx** - 1031 righe ⚠️ CRITICO
3. **advancedPermissions.ts** - 987 righe ⚠️ CRITICO
4. **Templates.tsx** - 977 righe ⚠️ CRITICO
5. **EmployeeImport.tsx** - 965 righe ⚠️ CRITICO

### File Problematici (700-1000 righe)
6. **CompanyImport.tsx** - 954 righe
7. **Dashboard.tsx** - 913 righe
8. **api.ts** - 904 righe
9. **ImportPreviewTable.tsx** - 882 righe
10. **GDPREntityTemplate.tsx** - 871 righe

## ❌ VIOLAZIONI REGOLE PROGETTO

### 1. Entità Obsolete (VIETATE)
**Problema**: Uso di `User`, `Employee`, `UserRole` invece di `Person` e `PersonRole`

#### File con violazioni critiche:
- `src/services/employees.ts` - 28 occorrenze di "Employee"
- `src/pages/settings/UsersTab.tsx` - 45 occorrenze di "user"
- `src/components/employees/EmployeeImport.tsx` - 89 occorrenze di "employee"
- `src/pages/employees/EmployeeDetails.tsx` - 31 occorrenze di "employee"
- `src/services/roles.ts` - 2 occorrenze di "UserRole"

#### Impatto:
- **GDPR Compliance**: Violazione dell'entità unificata Person
- **Architettura**: Inconsistenza nel data model
- **Manutenibilità**: Codice legacy non allineato

### 2. Soft Delete Non Standardizzato
**Ricerca necessaria**: Verificare uso di `eliminato`, `isDeleted` vs `deletedAt`

## 🧪 PROBLEMI TEST

### Test Falliti Critici
1. **SearchBar Component** - 17 test falliti
   - Problemi con classi CSS
   - Problemi con custom className
   - Problemi con size handling

2. **Design System** - Vari componenti
   - Modal tests
   - Form field tests
   - Input tests

### Coverage Issues
- **72.75% test success rate** - Target: >95%
- **Test execution time**: 13.57s - Ottimizzabile

## 🔧 PROBLEMI ESLINT

### Categorie Principali
1. **@typescript-eslint/no-explicit-any** - 2400+ occorrenze
2. **@typescript-eslint/no-unused-vars** - 400+ occorrenze
3. **Altre violazioni** - 197 occorrenze

### File con più errori:
- `src/services/advancedPermissions.ts`
- `src/components/roles/OptimizedPermissionManager.tsx`
- `src/templates/gdpr-entity-page/GDPREntityTemplate.tsx`

## 🎯 PRIORITÀ INTERVENTI

### CRITICO (Settimana 1)
1. **Risoluzione test falliti** - Blocca CI/CD
2. **Eliminazione entità obsolete** - Violazione regole progetto
3. **Refactoring hotspots** - File >1000 righe

### ALTO (Settimana 2-3)
1. **Riduzione errori ESLint** - Qualità codice
2. **Ottimizzazione performance test**
3. **Standardizzazione soft delete**

### MEDIO (Settimana 4)
1. **Cleanup file intermedi** (700-1000 righe)
2. **Miglioramento coverage test**
3. **Documentazione aggiornata**

## 📋 PIANO AZIONE IMMEDIATA

### Step 1: Backup e Preparazione
- [x] Git tag baseline creato
- [x] Analisi problemi completata
- [ ] Branch feature per ogni categoria

### Step 2: Fix Critici
- [ ] Fix test SearchBar
- [ ] Sostituzione Employee → Person
- [ ] Sostituzione User → Person
- [ ] Sostituzione UserRole → PersonRole

### Step 3: Refactoring Hotspots
- [ ] Split OptimizedPermissionManager.tsx
- [ ] Split PersonImport.tsx
- [ ] Split advancedPermissions.ts

## 🚨 RISCHI IDENTIFICATI

### Alto Rischio
1. **Breaking Changes** - Sostituzione entità potrebbe rompere API
2. **Test Regression** - Fix test potrebbero introdurre nuovi bug
3. **Performance Impact** - Refactoring file grandi

### Mitigazioni
1. **Test incrementali** dopo ogni modifica
2. **Rollback plan** con git tag baseline
3. **Review obbligatoria** per ogni PR

## 📈 METRICHE TARGET

### Obiettivi Fase 1
- **Test success rate**: 95%+ (attuale: 72.75%)
- **ESLint errors**: <100 (attuale: 2997)
- **File >1000 righe**: 0 (attuale: 5)
- **Violazioni entità**: 0 (attuale: 200+)

### Timeline
- **Fase 1 (Critici)**: 1 settimana
- **Fase 2 (Alto)**: 2-3 settimane  
- **Fase 3 (Medio)**: 1 settimana
- **Totale**: 4-5 settimane

## 🔧 PROBLEMI RISOLTI

### ✅ Problema CMS Settings - RISOLTO (2024-12-19)
**Problema**: Admin non poteva accedere a `/settings/cms` nonostante avesse tutti i permessi
**Causa**: Discrepanza tra permessi backend (`cms:edit`, `cms:update`) e frontend (`cms:write`)
**Soluzione**: Aggiornato `PublicCMSPage.tsx` per usare `hasPermission('cms', 'edit') || hasPermission('cms', 'update')`
**File modificato**: `src/pages/settings/PublicCMSPage.tsx` (riga 231)
**Status**: ✅ RISOLTO - Admin ora può accedere alla pagina CMS

---

**Nota**: Questo report viene aggiornato ad ogni milestone per tracciare il progresso della risoluzione dei problemi.