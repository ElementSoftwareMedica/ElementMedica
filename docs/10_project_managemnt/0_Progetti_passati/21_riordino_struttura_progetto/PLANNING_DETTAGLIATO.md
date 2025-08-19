# 🧹 PROGETTO 21 - Riordino Struttura Progetto
**Data Inizio**: $(date +%Y-%m-%d)
**Obiettivo**: Riordinare e pulire tutte le cartelle del progetto eliminando file superflui e consolidando la struttura

## 🎯 OBIETTIVI

### Primari
1. **Eliminare file temporanei/test** dalla root del progetto
2. **Consolidare cartelle duplicate** (src vs frontend/src)
3. **Rimuovere cartelle vuote** inutili
4. **Organizzare file di configurazione** in posizioni corrette
5. **Pulire file di debug/test** sparsi nel progetto

### Secondari
- Mantenere funzionalità al 100%
- Rispettare regole del progetto
- Documentare ogni modifica

## 📊 ANALISI STATO ATTUALE

### 🚨 PROBLEMI CRITICI IDENTIFICATI

#### 1. **ROOT DIRECTORY DISORDINATA**
**File temporanei/test in root (DA RIMUOVERE):**
```
- ADMIN_PERMISSIONS_FIX.md
- PLANNING_DETTAGLIATO.md
- ROLE_FIXES_SUMMARY.md
- add-missing-permissions.sql
- fix-persons-enum.sql
- cookies.txt
- debug-*.cjs/js (25+ file)
- test-*.cjs/js (50+ file)
- check-*.cjs (10+ file)
- verify-fixes.cjs
- test_login.json
```

#### 2. **DUPLICAZIONE SRC**
**Problema**: Due cartelle src separate
- `/src/` - Frontend principale (completa)
- `/frontend/src/` - Cartella vuota/obsoleta

#### 3. **CARTELLE VUOTE**
- `/frontend/src/components/` - Vuota
- `/shared/` - Vuota

#### 4. **FILE CONFIGURAZIONE SPARSI**
- `config/` in root (2 file middleware)
- `middleware/` in root (4 file)
- Configurazioni miste in varie posizioni

### 📁 ANALISI DETTAGLIATA PER CARTELLA

#### `/src/` ✅ CORRETTA
**Stato**: Struttura frontend principale ben organizzata
**Azione**: Mantenere invariata

#### `/config/` ⚠️ DA RIORGANIZZARE
**Contenuto attuale**:
- `advanced-logger.js`
- `middleware-manager.js`

**Problema**: Middleware in root/config invece che in backend
**Azione**: Spostare in `backend/config/`

#### `/dist/` ✅ CORRETTA
**Stato**: Build artifacts, struttura corretta
**Azione**: Mantenere invariata

#### `/frontend/src/components/` ❌ DA ELIMINARE
**Stato**: Cartella vuota, duplicato obsoleto
**Azione**: Eliminare completamente `/frontend/`

#### `/logs/` ✅ CORRETTA
**Stato**: Cartelle log server (vuote ma necessarie)
**Azione**: Mantenere invariata

#### `/middleware/` ⚠️ DA SPOSTARE
**Contenuto**:
- `audit-trail.js`
- `performance-monitoring.js`
- `query-logging.js`
- `security-logging.js`

**Problema**: Middleware in root invece che in backend
**Azione**: Spostare in `backend/middleware/`

#### `/monitoring/` ✅ CORRETTA
**Stato**: Configurazioni Grafana/Prometheus
**Azione**: Mantenere invariata

#### `/public/` ✅ CORRETTA
**Stato**: Template CSV pubblici
**Azione**: Mantenere invariata

#### `/scripts/` ✅ CORRETTA
**Stato**: Script deployment e utility
**Azione**: Mantenere invariata

#### `/shared/` ❌ DA ELIMINARE
**Stato**: Cartella vuota
**Azione**: Eliminare completamente

## 🗂️ PIANO RIORGANIZZAZIONE

### FASE 1: BACKUP E PREPARAZIONE
1. **Backup completo** del progetto
2. **Test funzionalità** pre-riordino
3. **Identificazione dipendenze** critiche

### FASE 2: PULIZIA ROOT DIRECTORY
1. **Spostare file temporanei** in cartella dedicata
2. **Eliminare file debug/test** obsoleti
3. **Consolidare file configurazione**

### FASE 3: RIORGANIZZAZIONE CARTELLE
1. **Eliminare cartelle vuote** (`/frontend/`, `/shared/`)
2. **Spostare middleware** in backend
3. **Consolidare configurazioni**

### FASE 4: VALIDAZIONE E TEST
1. **Test funzionalità** complete
2. **Verifica build** frontend
3. **Test server** backend

## 📋 CHECKLIST OPERATIVA

### Pre-Esecuzione
- [ ] Backup progetto completo
- [ ] Test login funzionante
- [ ] Server in esecuzione
- [ ] Documentazione aggiornata

### Esecuzione
- [ ] **FASE 1**: Backup e test
- [ ] **FASE 2**: Pulizia root
- [ ] **FASE 3**: Riorganizzazione
- [ ] **FASE 4**: Validazione

### Post-Esecuzione
- [ ] Test completo funzionalità
- [ ] Aggiornamento documentazione
- [ ] Commit modifiche
- [ ] Verifica build production

## 🚨 REGOLE SICUREZZA

### File da NON TOCCARE
- `/.env*` - Configurazioni ambiente
- `/backend/` - Struttura backend completa
- `/src/` - Frontend principale
- `/docs/` - Documentazione
- `/.trae/` - Regole progetto
- `/package.json` - Dipendenze principali

### File SICURI da Eliminare
- File `test-*.cjs/js` in root
- File `debug-*.cjs/js` in root
- File `check-*.cjs` in root
- Cartelle vuote (`/frontend/`, `/shared/`)
- File temporanei documentazione in root

### File da SPOSTARE
- `/config/*` → `/backend/config/`
- `/middleware/*` → `/backend/middleware/`
- File temporanei → `/tmp/` o cartella dedicata

## 📊 METRICHE SUCCESSO

### Quantitative
- **File root**: Da 100+ a <20
- **Cartelle vuote**: Da 2 a 0
- **File temporanei root**: Da 50+ a 0
- **Duplicazioni**: Da 2 a 0

### Qualitative
- ✅ Struttura pulita e organizzata
- ✅ Funzionalità al 100%
- ✅ Build senza errori
- ✅ Test login funzionante

## 🔄 ROLLBACK PLAN

### In caso di problemi:
1. **Stop immediato** operazioni
2. **Ripristino backup** completo
3. **Test funzionalità** critiche
4. **Analisi causa** problema
5. **Pianificazione correzione**

---

**⚠️ IMPORTANTE**: Ogni operazione deve essere testata immediatamente. In caso di dubbi, fermarsi e chiedere conferma.