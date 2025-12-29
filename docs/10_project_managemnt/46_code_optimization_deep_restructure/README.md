# 🚀 Progetto 46 - Indice Documentazione

**Ultima Modifica**: 29/12/2025

---

## 📁 Struttura Documentazione

```
docs/10_project_managemnt/46_code_optimization_deep_restructure/
├── README.md                           # Questo file
├── PLANNING_E2E_OTTIMIZZAZIONE.md      # Piano generale 8 fasi
├── FASE_2_ENUM_STANDARDIZZAZIONE.md    # Dettaglio conversione enum
├── FASE_3_SPLITTING_FILE_GRANDI.md     # Dettaglio splitting file
├── FASE_4_PERMESSI_ALLINEAMENTO.md     # (TODO) Standardizzazione permessi
├── FASE_5_FILE_OBSOLETI.md             # (TODO) Pulizia file
├── FASE_6_SCHEMA_CAMELCASE.md          # (TODO) Naming convention schema
├── FASE_7_TESTING_VALIDAZIONE.md       # (TODO) Test suite completa
└── FASE_8_DOCUMENTAZIONE.md            # (TODO) Documentazione finale
```

---

## 📊 Stato Fasi

| Fase | Nome | Stato | Durata | Documento |
|------|------|-------|--------|-----------|
| 0 | Setup & Backup | ⏳ Da iniziare | 0.5 giorni | [PLANNING](PLANNING_E2E_OTTIMIZZAZIONE.md) |
| 1 | Pulizia File Obsoleti | ⏳ Da iniziare | 2 giorni | (Da creare) |
| 2 | Enum Standardizzazione | ✅ Pianificato | 1 settimana | [FASE_2](FASE_2_ENUM_STANDARDIZZAZIONE.md) |
| 3 | Splitting File Grandi | ✅ Pianificato | 1.5 settimane | [FASE_3](FASE_3_SPLITTING_FILE_GRANDI.md) |
| 4 | Permessi Allineamento | 📝 Da pianificare | 1 settimana | (Da creare) |
| 5 | Schema camelCase | 📝 Da pianificare | 1 settimana | (Da creare) |
| 6 | Naming Convention | 📝 Da pianificare | 3 giorni | (Da creare) |
| 7 | Testing & Validazione | 📝 Da pianificare | 1 settimana | (Da creare) |
| 8 | Documentazione | 📝 Da pianificare | 2 giorni | (Da creare) |

---

## 🎯 Obiettivi Progetto

1. **Schema Prisma in camelCase** - Tutti i nomi colonne/tabelle standardizzati
2. **Enum in Inglese PascalCase** - 35 enum italiani → inglese
3. **File Grandi Splittati** - Da 11,000+ linee a <500
4. **Permessi Allineati** - Formato uniforme
5. **File Obsoleti Rimossi** - 108MB+ di backup archiviati
6. **Zero Errori TypeScript** - Strict mode
7. **Test Coverage 80%+** - Da 75% attuale

---

## 📈 Metriche Target

| Metrica | Attuale | Target | Delta |
|---------|---------|--------|-------|
| File >1000L | 12 | 0 | -12 |
| File >500L | 45 | 0 | -45 |
| Enum Italiani | 35 | 0 | -35 |
| Backup Files | 108MB | 0 | -108MB |
| TS Errors | 0 | 0 | ✅ |
| Test Coverage | 75% | 80% | +5% |
| Schema @map | 126 | 150+ | +24 |

---

## ⏱️ Timeline Stimata

```
Settimana 1: Fase 0-1 (Setup + Pulizia)
Settimana 2: Fase 2 (Enum)
Settimana 3-4: Fase 3 (Splitting)
Settimana 5: Fase 4 (Permessi)
Settimana 6: Fase 5 (Schema)
Settimana 7: Fase 6-7 (Naming + Test)
Settimana 8: Fase 8 (Documentazione)
```

**Durata Totale**: 8 settimane

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
