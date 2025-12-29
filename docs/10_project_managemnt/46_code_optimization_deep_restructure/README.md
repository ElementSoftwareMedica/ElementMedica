# 🚀 Progetto 46 - Indice Documentazione

**Ultima Modifica**: 29/12/2025 - Aggiornamento stato fasi  
**Decisione**: I nomi italiani nello schema Prisma sono ACCETTATI (app commercializzata solo in Italia)

---

## 📁 Struttura Documentazione

```
docs/10_project_managemnt/46_code_optimization_deep_restructure/
├── README.md                           # Questo file
├── PLANNING_E2E_OTTIMIZZAZIONE.md      # Piano generale 8 fasi
├── FASE_2_ENUM_STANDARDIZZAZIONE.md    # Dettaglio conversione enum (SKIPPATO - nomi IT OK)
├── FASE_3_SPLITTING_FILE_GRANDI.md     # Dettaglio splitting file
├── FASE_4_PERMESSI_ALLINEAMENTO.md     # (TODO) Standardizzazione permessi
├── FASE_5_FILE_OBSOLETI.md             # (TODO) Pulizia file
├── FASE_6_SCHEMA_CAMELCASE.md          # (SKIPPATO - nomi IT OK)
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
| 3 | Splitting clinica-routes.js | ✅ Completato | 1 giorno | 18 moduli estratti |
| 4 | Splitting altri file backend | 🔄 In corso | 1 settimana | seed.js, preventivi, etc. |
| 5 | Splitting file frontend | ⏳ Da iniziare | 1 settimana | PreventiviPage, CMSRenderer |
| 6 | Schema camelCase | ⏭️ SKIPPATO | - | **Nomi IT accettati** |
| 7 | Testing & Validazione | ⏳ Da iniziare | 3 giorni | Test dopo split |
| 8 | Documentazione | ⏳ Da iniziare | 1 giorno | Aggiornare docs |

---

## 🎯 Obiettivi Progetto (AGGIORNATI)

1. ~~Schema Prisma in camelCase~~ → **Nomi italiani accettati**
2. ~~Enum in Inglese PascalCase~~ → **Enum italiani OK per mercato IT**
3. **File Grandi Splittati** - Da 11,000+ linee a <500 ✅ clinica-routes fatto
4. **Permessi Allineati** - Formato uniforme
5. **File Obsoleti Rimossi** - 108MB+ di backup archiviati ✅
6. **Zero Errori TypeScript** - Strict mode ✅
7. **Test Coverage 80%+** - Da 75% attuale

---

## 📈 Metriche Progresso

| Metrica | Pre-Progetto | Attuale | Target | Stato |
|---------|--------------|---------|--------|-------|
| clinica-routes.js | 11,219L | 0L | <500L | ✅ 18 moduli |
| seed.js | 3,326L | 3,326L | <500L | ⏳ |
| preventivi-routes.js | 1,856L | 1,856L | <400L | ⏳ |
| File obsoleti | 108MB | ~10MB | 0 | ✅ |
| TS Errors | 0 | 0 | 0 | ✅ |
| Test Coverage | 75% | 75% | 80% | ⏳ |

---

## ⏱️ Timeline Aggiornata

```
✅ Giorno 1 (29/12): Fase 0-1 (Setup + Pulizia) - COMPLETATO
✅ Giorno 1 (29/12): Fase 3a (clinica-routes.js split) - COMPLETATO
🔄 Giorno 2-3: Fase 3b (altri file backend) - IN CORSO
⏳ Giorno 4-5: Fase 4 (Frontend splitting)
⏳ Giorno 6: Testing & Validazione
⏳ Giorno 7: Documentazione finale
```

**Durata Totale Rivista**: 1 settimana (vs 8 settimane originali)

> **NOTA**: Le fasi 2 e 6 (enum inglesi + schema camelCase) sono state SKIPPATE
> perché l'app sarà commercializzata SOLO in Italia. I nomi italiani sono accettati.

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
