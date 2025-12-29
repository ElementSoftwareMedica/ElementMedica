# 🚀 Progetto 46 - Indice Documentazione

**Ultima Modifica**: 30/12/2025 - Fase 3b IN CORSO (Backend File Splitting)  
**Decisione**: I nomi italiani nello schema Prisma sono ACCETTATI (app commercializzata solo in Italia)

---

## 📁 Struttura Documentazione

```
docs/10_project_managemnt/46_code_optimization_deep_restructure/
├── README.md                           # Questo file
├── PLANNING_E2E_OTTIMIZZAZIONE.md      # Piano generale 8 fasi
├── FASE_2_ENUM_STANDARDIZZAZIONE.md    # Dettaglio conversione enum (SKIPPATO - nomi IT OK)
├── FASE_3_SPLITTING_FILE_GRANDI.md     # Dettaglio splitting file
├── FASE_6_PERMISSION_STANDARDIZATION.md # Standardizzazione permessi ✅ COMPLETATO
├── FASE_5_FILE_OBSOLETI.md             # (TODO) Pulizia file
├── FASE_7_TESTING_VALIDAZIONE.md       # (TODO) Test suite completa
└── FASE_8_DOCUMENTAZIONE.md            # (TODO) Documentazione finale
```

---

## 📊 Stato Fasi

| Fase | Nome | Stato | Durata | Note |
|------|------|-------|--------|------|
| 0 | Setup & Backup | ✅ Completato | 0.5 giorni | Tag v1.0.0-pre-optimization |
| 1 | Pulizia File Obsoleti | ✅ Completato | 2 giorni | Commit e9fb4e7 |
| 2 | Enum Standardizzazione | ⏭️ SKIPPATO | - | **Nomi IT accettati** |
| 3a | Splitting clinica-routes.js | ✅ TESTATO | 1 giorno | 18 moduli, 15/17 route OK |
| 3b | Splitting altri file backend | ✅ COMPLETATO | 1 giorno | preventivi ✅, attestati ✅ |
| 4 | Splitting file frontend | ⏳ Da iniziare | 1 settimana | PreventiviPage, CMSRenderer |
| 5 | Schema camelCase | ⏭️ SKIPPATO | - | **Nomi IT accettati** |
| 6 | Permission Standardization | ✅ COMPLETATO | 1 giorno | 6.1-6.3 + Security fixes |
| 7 | req.user → req.person | ✅ COMPLETATO | 0.5 giorni | 334+ occorrences, 46 files |
| 8 | Documentazione | ⏳ In corso | 1 giorno | Aggiornare docs |

---

## 🎯 Obiettivi Progetto (AGGIORNATI)

1. ~~Schema Prisma in camelCase~~ → **Nomi italiani accettati**
2. ~~Enum in Inglese PascalCase~~ → **Enum italiani OK per mercato IT**
3. **File Grandi Splittati** - Da 11,000+ linee a <500 ✅ clinica-routes, preventivi-routes fatto
4. **Permessi Allineati** - Formato uniforme ✅ `resource:action` ovunque
5. **File Obsoleti Rimossi** - 108MB+ di backup archiviati ✅
6. **Zero Errori TypeScript** - Strict mode ✅
7. **Test Coverage 80%+** - Da 75% attuale
8. **Backward Compat Rimosso** - req.person standard ✅ (334+ istanze)
9. **Notification Consistency** - alert() → showToast() ✅ (22 sostituzioni)

---

## 📈 Metriche Progresso

| Metrica | Pre-Progetto | Attuale | Target | Stato |
|---------|--------------|---------|--------|-------|
| clinica-routes.js | 11,219L | 0L (archiviato) | <500L | ✅ 18 moduli |
| seed.js | 3,326L | 399L | <500L | ✅ Già ottimizzato |
| preventivi-routes.js | 1,492L | 0L (archiviato) | <400L | ✅ 7 moduli |
| attestati-routes.js | 1,807L | 0L (archiviato) | <400L | ✅ 5 moduli |
| File obsoleti | 108MB | ~10MB | 0 | ✅ |
| TS Errors | 0 | 0 | 0 | ✅ |
| Test Coverage | 75% | 75% | 80% | ⏳ |
| Backward Compat (req.user) | 334+ | 0 | 0 | ✅ |
| Security Bypass | 1 CRITICAL | 0 | 0 | ✅ |
| console.log in prod | 50+ | 0 | 0 | ✅ |
| alert() native | 29 | 0 | 0 | ✅ |

---

## ⏱️ Timeline Aggiornata

```
✅ Giorno 1 (29/12): Fase 0-1 (Setup + Pulizia) - COMPLETATO
✅ Giorno 1 (29/12): Fase 3a (clinica-routes.js split) - COMPLETATO
✅ Giorno 2 (30/12): Fase 6 (Permission + Security) - COMPLETATO
✅ Giorno 2 (30/12): Fase 7 (req.user → req.person) - COMPLETATO
🔄 Giorno 3 (30/12): Fase 3b - preventivi-routes.js ✅, attestati 🔄, alert→showToast ✅
⏳ Giorno 4: Fase 3b (completare attestati + altri file)
⏳ Giorno 5-6: Fase 4 (Frontend splitting)
⏳ Giorno 7: Documentazione finale
```

**Durata Totale Rivista**: 1 settimana (vs 8 settimane originali)

> **NOTA**: Le fasi 2 e 5 (enum inglesi + schema camelCase) sono state SKIPPATE
> perché l'app sarà commercializzata SOLO in Italia. I nomi italiani sono accettati.

---

## 🔒 Fase 6 - Security & Permission Fixes (30/12/2025)

### CRITICAL: Advanced Permissions Bypass FIX
- **Problema**: `advanced-permissions.js` aveva un BYPASS COMPLETO che permetteva TUTTE le richieste
- **Impatto**: 25 file di route usavano `checkAdvancedPermission` che era bypassato
- **Fix**: Implementato controllo corretto con `RBACService.hasPermission()` e formato `resource:action`

### Auth Pattern Standardization
| File | Istanze Fixate |
|------|----------------|
| middleware/advanced-permissions.js | 3 |
| middleware/virtualEntityMiddleware.js | 1 |
| middleware/auth.js | 1 |
| routes/companies-routes.js | 4 |
| routes/company-sites-routes.js | 5 |
| routes/reparto-routes.js | 7 |
| routes/attestati-routes.js | 1 |
| routes/dashboard-routes.js | 3 |
| routes/courses-routes.js | 1 |
| routes/sopralluogo-routes.js | 5 |
| routes/dvr-routes.js | 5 |
| routes/schedules-routes.js | 2 |
| routes/employees-routes.js | 5 |
| **TOTALE** | **31+** |

### Code Quality Improvements
- **Console.log Cleanup**: Rimossi 34 console.log/error da production code
- **Frontend Notifications**: 10 alert() → showToast() per UX consistente
- **All TS Errors**: 0

---

## 🔄 Fase 7 - Complete req.user → req.person Migration (30/12/2025)

### BREAKING CHANGE: Removed ALL Backward Compatibility
- **Problema**: `req.user = req.person` alias in auth.js creava confusione
- **Soluzione**: Migrato TUTTO il codebase a usare solo `req.person`
- **Commit**: 295abdf

### Migration Statistics
| Categoria | Files | Occorrenze |
|-----------|-------|------------|
| Routes | 28 | ~280 |
| Clinica modular routes | 3 | 3 |
| Middleware | 2 | 8 |
| Auth | 3 | 3 |
| Services | 1 | 9 |
| Utils | 1 | 5 |
| Controllers | 2 | 2 |
| Proxy | 2 | 10 |
| **TOTALE** | **46** | **334+** |

### Logging Improvements (console.log → logger)
| File | Statements Migrated |
|------|---------------------|
| routes/tenants.js | 16 |
| routes/attestati-routes.js | 2 |
| routes/template-routes.js | 10 |
| routes/template-routes-enhanced.js | 8 |
| routes/preventivi-routes.js | 10 |
| routes/public-contact-submissions-routes.js | 1 |
| **TOTALE** | **47** |

### Documentation Updated
- `.github/copilot-instructions.md`: Added section 9.1 for `req.person` standard
- Added explicit rules against `req.user` usage
- Updated all code examples

---

## 🗂️ Fase 3b - Backend File Splitting (30/12/2025)

### preventivi-routes.js → 7 moduli ✅

| Modulo | Linee | Funzionalità |
|--------|-------|--------------|
| common.js | 55 | Import condivisi e helper |
| crud.routes.js | 635 | GET/POST/PUT/DELETE preventivi |
| workflow.routes.js | 141 | PUT /:id/stato (transizioni stato) |
| sconti.routes.js | 252 | Applicazione sconti/codici |
| pdf.routes.js | 119 | Generazione PDF preventivo |
| merge.routes.js | 351 | Merge/unmerge preventivi multipli |
| index.js | 51 | Router aggregatore |

**Totale**: 1,604 linee in 7 moduli (vs 1,492L monolitico)

### attestati-routes.js → 5 moduli ✅

| Modulo | Linee | Funzionalità |
|--------|-------|--------------|
| common.js | 199 | Import condivisi e helper |
| crud.routes.js | 280 | CRUD attestati base |
| download.routes.js | 289 | PDF download, ZIP batch |
| email.routes.js | 100 | Invio email attestati |
| index.js | 451 | Router + /generate inline |

**Totale**: 1,319 linee in 5 moduli

### Altri file verificati ✅

| File | Linee Attuali | Note |
|------|---------------|------|
| seed.js | 399 | Già sotto target (<500) |
| emailService.js | 766 | Accettabile (<1000) |
| calendarService.js | 651 | Accettabile (<1000) |
| documentService.js | 2,354 | Servizio core, splitting futuro |

### File Archiviati
- `archives/deprecated-routes/preventivi-routes.js.deprecated`
- `archives/deprecated-routes/attestati-routes.js.deprecated`

### Notification Consistency ✅
- 22 istanze `alert()` → `showToast()` migrate
- Files: DisponibilitaPage, ListiniPage, TariffarioMedicoPage, PazientiPage, WorkWithUsPage, CMSManager, ContactsPage, CourseDetailPage, UnifiedCourseDetailPage

---

## 🏆 Lavoro Completato

### clinica-routes.js → 18 moduli (Commit 5500bab)

| Modulo | Linee | Funzionalità |
|--------|-------|--------------|
| index.js | ~120 | Router aggregatore |
| poliambulatori.routes.js | ~407 | CRUD poliambulatori |
| ambulatori.routes.js | ~457 | CRUD ambulatori |
| prestazioni.routes.js | ~457 | CRUD prestazioni |
| medici.routes.js | ~874 | CRUD medici + stats |
| medici-documents.routes.js | ~343 | Documenti medici |
| strumenti.routes.js | ~749 | CRUD strumenti + ROI |
| visite.routes.js | ~566 | CRUD visite + workflow |
| referti.routes.js | ~663 | CRUD referti + firma |
| sedi.routes.js | ~382 | CRUD sedi |
| bundle.routes.js | ~515 | CRUD offerte/bundle |
| convenzioni.routes.js | ~710 | CRUD convenzioni |
| manutenzioni.routes.js | ~462 | CRUD manutenzioni |
| slots.routes.js | ~680 | CRUD slot disponibilità |
| listini.routes.js | ~562 | CRUD listini prezzi |
| tariffario-medico.routes.js | ~250 | Tariffari medico |
| orari-ambulatorio.routes.js | ~550 | Orari apertura |
| template-campi.routes.js | ~450 | Campi dinamici form |
| documenti-clinici.routes.js | ~460 | Upload allegati |
| fatture.routes.js | ~230 | CRUD fatture |

**Totale**: ~10,000+ linee organizzate in 20 file modulari

---

## ✅ Test Fase 3a - Risultati (29/12/2025)

**Route Funzionanti (15/17)**:
| Route | Status | Note |
|-------|--------|------|
| /clinica/poliambulatori | ✅ OK | |
| /clinica/ambulatori | ✅ OK | |
| /clinica/prestazioni | ✅ OK | |
| /clinica/medici | ✅ OK | |
| /clinica/visite | ✅ OK | |
| /clinica/referti | ✅ OK | |
| /clinica/strumenti | ✅ OK | |
| /clinica/convenzioni | ✅ OK | |
| /clinica/listini | ✅ OK | |
| /clinica/sedi | ✅ OK | |
| /clinica/manutenzioni | ✅ OK | |
| /clinica/tariffario-medico | ✅ OK | |
| /clinica/orari-ambulatorio | ✅ OK | |
| /clinica/fatture | ✅ OK | |
| /clinica/documenti/storage-stats | ✅ OK | No GET root (by design) |
| /clinica/slots | ⚠️ Servizio | Errore Prisma pre-esistente (campo 'stato') |
| /clinica/bundle | ⚠️ Servizio | Errore Prisma pre-esistente |
| /clinica/template-campi | ⚠️ Servizio | Errore Prisma pre-esistente |

**Commit**: 
- `1d8873a` - Fix all import paths in modular clinica routes
- `7574bf6` - Archive old clinica-routes.js
- `4a41443` - First batch import fixes

---

## 🚨 Rischi Principali

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Breaking changes API | Media | Alto | @map per backward compat |
| Regressioni | Alta | Alto | Test E2E dopo ogni fase |
| Downtime | Bassa | Alto | Staging environment |
| Data loss | Minima | Critico | Backup pre-migrazione |

---

## 👥 Team

- **Lead Developer**: Matteo Michielon
- **AI Assistant**: GitHub Copilot (Claude Opus 4.5)
- **Reviewer**: (Da assegnare)

---

## 📋 Quick Start

### Iniziare Fase 0:
```bash
# 1. Backup database
pg_dump -h localhost -U postgres element_medica > backup_pre_project46.sql

# 2. Creare branch
git checkout -b project-46-optimization

# 3. Tag versione
git tag v1.0.0-pre-optimization

# 4. Verificare stato
npm test
npm run build
```

### Verificare progressi:
```bash
# Contare file grandi
find src backend -name "*.ts" -o -name "*.tsx" -o -name "*.js" | xargs wc -l | sort -n | tail -20

# Contare enum italiani
grep -c "enum Stato\|enum Tipo" backend/prisma/schema.prisma

# Verificare errori
npm run tsc -- --noEmit
```

---

## 📚 Riferimenti

- [Copilot Instructions](/.github/copilot-instructions.md)
- [Project Rules](/.trae/rules/project_rules.md)
- [System Guide](/.trae/TRAE_SYSTEM_GUIDE.md)

---

*Progetto 46 - Code Optimization & Deep Restructuring - 29/12/2025*
