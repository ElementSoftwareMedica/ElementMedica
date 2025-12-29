# 🔧 Progetto 46 - Ottimizzazione Profonda e Ristrutturazione Codice

**Data Creazione**: 29 dicembre 2025  
**Priorità**: ALTA  
**Durata Stimata**: 8-10 settimane  
**Rischio**: ALTO (refactoring profondo richiede test E2E continui)

---

## 📋 Executive Summary

Questo progetto mira a una ristrutturazione profonda del codebase ElementMedica per:
1. **Standardizzare convenzioni di naming** (camelCase ovunque)
2. **Consolidare file duplicati/obsoleti**
3. **Semplificare file troppo lunghi** (>500 linee)
4. **Allineare formati permessi/ruoli**
5. **Ottimizzare performance e manutenibilità**

### Analisi Stato Attuale

| Area | Stato | Criticità |
|------|-------|-----------|
| Schema Prisma | 4,019 linee, 100 modelli, 54 enum | 126 @map per backward compatibility |
| File Backend lunghi | clinica-routes.js (11,219L), seed.js (3,326L) | 15+ file >1000L |
| File Frontend lunghi | PreventiviPage.tsx (3,381L), CMSPageRenderer.tsx (3,321L) | 25+ file >1000L |
| File Backup/Obsoleti | 108MB in backup, 3.4MB migration-backups | Da archiviare |
| Enum Naming | Mix italiano/inglese (StatoVisita, CourseStatus) | Inconsistente |
| Permessi | Formato `resource:action` standardizzato | OK ma verifica allineamento |

---

## 🎯 Obiettivi di Qualità

| Metrica | Attuale | Target |
|---------|---------|--------|
| Max linee per file | 11,219 | 500 |
| Naming convention | Misto | 100% camelCase |
| Enum naming | IT/EN mix | 100% inglese |
| @map nello schema | 126 | 0 (dopo migrazione) |
| File obsoleti | 108MB | 0 (archiviati) |
| Test coverage | 75% | 85% |
| TypeScript errors | 0 | 0 (mantenuto) |

---

## 📊 Inventario Problemi

### 1. Schema Prisma - Naming Inconsistenze

#### Tabelle con @map (snake_case nel DB)
```
course_enrollments, attestati, lettere_incarico, registri_presenze,
registro_presenze_partecipanti, preventivi, fatture, fattura_aziende,
codici_sconto, preventivi_sconti, codici_aziende, codici_persone,
codici_corsi, activity_logs, refresh_tokens, person_sessions, persons
```

#### Colonne con @map
```
branch_type, employee_id, partecipante_id, nome_file, url, 
data_generazione, hours, scheduledCourseId, branch_types, user_id
```

#### Enum Mix Italiano/Inglese
**Italiani (da convertire):**
- StatoPreventivo, StatoAmbulatorio, StatoPoliambulatorio
- StatoStrumento, StatoManutenzione, StatoAppuntamento
- StatoVisita, StatoReferto, StatoFatturaSanitaria
- StatoRiconoscimento, StatoAssenza, StatoChiamata, StatoFirma
- TipoSconto, TipoCompensoMedico, TipoPrestazione
- TipoManutenzione, TipoDocumentoClinico, TipoConvenzione
- TipoRiconoscimento, TipoTariffario, TipoVoceTariffario
- TipoChiusuraSpeciale, TipoAssenza, PrioritaChiamata

**Inglesi (OK):**
- BranchType, CourseStatus, EnrollmentStatus, DeliveryMode
- TestStatus, TestType, Gender, PersonStatus, RoleType

### 2. File Backend Critici (>1000 linee)

| File | Linee | Azione |
|------|-------|--------|
| routes/clinica-routes.js | 11,219 | Split in moduli |
| prisma/seed.js | 3,326 | Split per entità |
| services/documentService.js | 2,354 | Split per funzionalità |
| routes/attestati-routes.js | 1,819 | Ottimizza |
| services/markerResolver.js | 1,680 | Refactor |
| routes/preventivi-routes.js | 1,503 | Split |
| services/formsService.js | 1,393 | Split |
| services/clinical/StrumentoService.js | 1,264 | Refactor |
| routes/schedules-routes.js | 1,253 | Split |
| routes/advanced-permissions.js | 1,207 | Refactor |
| controllers/personController.js | 1,199 | Split |
| routes/cms-routes.js | 1,184 | Split |
| routes/codici-sconto-routes.js | 1,170 | Ottimizza |
| services/preventivi-service.js | 1,147 | Refactor |
| services/clinical/ListinoPrezzoService.js | 1,147 | Refactor |

### 3. File Frontend Critici (>1000 linee)

| File | Linee | Azione |
|------|-------|--------|
| pages/finance/PreventiviPage.tsx | 3,381 | Hooks Composition |
| components/cms/CMSPageRenderer.tsx | 3,321 | Componentizzare |
| components/schedules/ExpiringCoursesSection.tsx | 1,986 | Split |
| pages/clinica/personale/MedicoForm.tsx | 1,861 | Hooks Composition |
| pages/forms/FormTemplateCreate.tsx | 1,614 | Split |
| components/editor/SlideEditor.tsx | 1,508 | Componentizzare |
| pages/management/persons/PersonDetails.tsx | 1,470 | Split |
| pages/settings/TemplateEditor.tsx | 1,423 | Refactor |
| pages/clinica/catalogo/OffertaBundleDetailPage.tsx | 1,419 | Split |
| pages/clinica/catalogo/OffertaBundleForm.tsx | 1,417 | Hooks Composition |
| pages/management/users/UsersManagement.tsx | 1,390 | Split |
| pages/Dashboard.tsx | 1,385 | Componentizzare |

### 4. File Obsoleti/Backup da Archiviare

```
backend/backups/ (108MB) - Spostare in archivio esterno
backend/migration-backups/ (3.4MB) - Mantenere solo ultimi 3
backend/migration-backups/phase1-bonus-cleanup/ - Eliminare
*.backup, *.bak, *.old.* files - Eliminare dopo verifica
```

---

## 🗓️ Piano di Implementazione

### PANORAMICA MACRO-FASI

| Fase | Nome | Durata | Rischio | Dipendenze |
|------|------|--------|---------|------------|
| 0 | Setup & Backup | 1 giorno | Basso | - |
| 1 | Pulizia File Obsoleti | 2 giorni | Basso | Fase 0 |
| 2 | Schema Enum Standardizzazione | 1 settimana | Alto | Fase 1 |
| 3 | Schema Naming camelCase | 2 settimane | CRITICO | Fase 2 |
| 4 | Backend File Splitting | 2 settimane | Alto | Fase 3 |
| 5 | Frontend File Splitting | 2 settimane | Alto | Fase 4 |
| 6 | Consolidamento Permessi | 3 giorni | Medio | Fase 5 |
| 7 | Testing E2E Completo | 1 settimana | Medio | Fase 6 |
| 8 | Documentazione Finale | 2 giorni | Basso | Fase 7 |

---

## 📝 FASE 0: Setup & Backup (1 giorno)

### Task 0.1: Backup Completo
```bash
# Backup database
pg_dump -h localhost -U postgres element_medica > backup_pre_optimization.sql

# Backup codebase
git checkout -b project-46-optimization
git push origin project-46-optimization

# Tag versione pre-ottimizzazione
git tag v1.0.0-pre-optimization
```

### Task 0.2: Setup Branch Strategy
- `main` - Produzione stabile
- `project-46-optimization` - Branch di lavoro principale
- `phase-N-xxx` - Branch per ogni fase

### Task 0.3: Setup CI/CD Checks
- TypeScript check su ogni commit
- ESLint check su ogni commit
- Test suite su ogni merge

---

## 📝 FASE 1: Pulizia File Obsoleti (2 giorni)

### Task 1.1: Archiviare Backup Vecchi
```bash
# Creare archivio esterno
mkdir -p /archives/elementmedica/backups-pre-optimization

# Spostare backup
mv backend/backups/* /archives/elementmedica/backups-pre-optimization/
mv backend/migration-backups/*.backup /archives/elementmedica/backups-pre-optimization/
```

### Task 1.2: Eliminare File .old, .bak
File da eliminare dopo verifica:
```
backend/proxy/routes/proxyRoutes.js.backup-before-routing-integration
backend/migration-backups/phase1-bonus-cleanup/advanced-permissions.js.bak
backend/migration-backups/phase1-bonus-cleanup/googleDocsImporter.old.js
backend/migration-backups/phase1-bonus-cleanup/googleSlidesImporter.old.js
backend/migration-backups/phase1-bonus-cleanup/rbac.old.js
backend/migration-backups/phase1-bonus-cleanup/DatabaseOperations.js.bak
```

### Task 1.3: Consolidare Cartelle Temporanee
- Eliminare `cleanup-temp/`
- Pulire `temp/` files >7 giorni
- Verificare `uploads/` per file orfani

### Verifica Fase 1
- [ ] `npm run build` passa
- [ ] `npm test` passa
- [ ] Health check API OK

---

## 📝 FASE 2: Schema Enum Standardizzazione (1 settimana)

### Principio: Tutti gli enum in inglese PascalCase

### Task 2.1: Mappare Enum Italiani → Inglesi

| Italiano | Inglese | Azione |
|----------|---------|--------|
| StatoPreventivo | QuoteStatus | Rename con @map |
| StatoAmbulatorio | ClinicRoomStatus | Rename con @map |
| StatoPoliambulatorio | ClinicStatus | Rename con @map |
| StatoStrumento | EquipmentStatus | Rename con @map |
| StatoManutenzione | MaintenanceStatus | Rename con @map |
| StatoAppuntamento | AppointmentStatus | Rename con @map |
| StatoVisita | VisitStatus | Rename con @map |
| StatoReferto | ReportStatus | Rename con @map |
| StatoFatturaSanitaria | MedicalInvoiceStatus | Rename con @map |
| StatoRiconoscimento | RecognitionStatus | Rename con @map |
| StatoAssenza | AbsenceStatus | Rename con @map |
| StatoChiamata | CallStatus | Rename con @map |
| StatoFirma | SignatureStatus | Rename con @map |
| TipoSconto | DiscountType | Rename con @map |
| TipoCompensoMedico | DoctorCompensationType | Rename con @map |
| TipoPrestazione | ServiceType | Rename con @map |
| TipoManutenzione | MaintenanceType | Rename con @map |
| TipoDocumentoClinico | ClinicalDocumentType | Rename con @map |
| TipoDocumentoPersonale | PersonalDocumentType | Rename con @map |
| TipoConvenzione | AgreementType | Rename con @map |
| TipoRiconoscimento | RecognitionType | Rename con @map |
| TipoTariffario | PriceListType | Rename con @map |
| TipoVoceTariffario | PriceListItemType | Rename con @map |
| TipoChiusuraSpeciale | SpecialClosureType | Rename con @map |
| TipoAssenza | AbsenceType | Rename con @map |
| TipoCorsoSconto | CourseDiscountType | Rename con @map |
| TipoServizio | ServiceCategory | Rename con @map |
| TipoPrezzo | PriceType | Rename con @map |
| TipologiaStrumento | EquipmentCategory | Rename con @map |
| ApplicabilitaSconto | DiscountApplicability | Rename con @map |
| ClienteType | CustomerType | Rename |
| FrequenzaTariffario | PriceListFrequency | Rename con @map |
| PrioritaChiamata | CallPriority | Rename con @map |

### Task 2.2: Mappare Valori Enum

Per ogni enum, mappare anche i valori:
```prisma
enum QuoteStatus {
  DRAFT     @map("BOZZA")
  SENT      @map("INVIATO")
  ACCEPTED  @map("ACCETTATO")
  REJECTED  @map("RIFIUTATO")
  EXPIRED   @map("SCADUTO")
  
  @@map("stato_preventivo")  // Mantiene tabella legacy
}
```

### Task 2.3: Aggiornare Backend
Per ogni enum rinominato:
1. Aggiornare import nei service
2. Aggiornare controller
3. Aggiornare routes
4. Test unitario

### Task 2.4: Aggiornare Frontend
Per ogni enum rinominato:
1. Aggiornare types TypeScript
2. Aggiornare componenti
3. Aggiornare form select options
4. Aggiornare tabelle

### Task 2.5: Migrazione Database
```bash
npx prisma generate
npx prisma db push --accept-data-loss # Solo in dev!
# In produzione: migrazione manuale SQL
```

### Verifica Fase 2
- [ ] Schema Prisma valido
- [ ] TypeScript 0 errori
- [ ] Test unitari passano
- [ ] Test E2E passano

---

## 📝 FASE 3: Schema Naming camelCase (2 settimane)

### Strategia: Rimuovere tutti i @map progressivamente

Questa è la fase più critica. Approccio:
1. Per ogni tabella con @@map:
   - Creare migrazione SQL per rinominare tabella
   - Aggiornare schema Prisma (rimuovere @@map)
   - Aggiornare tutti i riferimenti nel codice
   - Test E2E

### Task 3.1: Ordine di Migrazione Tabelle

**Gruppo 1 - Tabelle Standalone (settimana 1)**
1. `activity_logs` → `ActivityLog`
2. `refresh_tokens` → `RefreshToken`
3. `person_sessions` → `PersonSession`

**Gruppo 2 - Tabelle Formazione (settimana 1)**
4. `course_enrollments` → `CourseEnrollment`
5. `attestati` → `Attestato`
6. `lettere_incarico` → `LetteraIncarico`
7. `registri_presenze` → `RegistroPresenze`
8. `registro_presenze_partecipanti` → `RegistroPresenzePartecipante`

**Gruppo 3 - Tabelle Finance (settimana 2)**
9. `preventivi` → `Preventivo`
10. `fatture` → `Fattura`
11. `fattura_aziende` → `FatturaAzienda`
12. `codici_sconto` → `CodiceSconto`
13. `preventivi_sconti` → `PreventivoSconto`
14. `codici_aziende` → `CodiceAzienda`
15. `codici_persone` → `CodicePersona`
16. `codici_corsi` → `CodiceCorso`

**Gruppo 4 - Tabelle Core (settimana 2)**
17. `persons` → `Person`

### Task 3.2: Template Migrazione per Tabella

Per ogni tabella:
```sql
-- 1. Rinomina tabella
ALTER TABLE "old_name" RENAME TO "NewName";

-- 2. Rinomina colonne (se necessario)
ALTER TABLE "NewName" RENAME COLUMN "old_column" TO "newColumn";

-- 3. Aggiorna sequenze
ALTER SEQUENCE "old_name_id_seq" RENAME TO "NewName_id_seq";

-- 4. Aggiorna indici
ALTER INDEX "old_name_pkey" RENAME TO "NewName_pkey";
```

### Task 3.3: Aggiornare Colonne con @map

Colonne da rinominare:
- `employee_id` → `personId`
- `partecipante_id` → `personId`
- `nome_file` → `fileName`
- `url` → `fileUrl`
- `data_generazione` → `generatedAt`
- `hours` → `ore` (o rimuovere mapping)
- `user_id` → `personId`
- `branch_type` → `branchType`
- `branch_types` → `branchTypes`

### Verifica Fase 3
- [ ] Zero @map nello schema
- [ ] Zero @@map nello schema
- [ ] Database rinominato correttamente
- [ ] Tutti i query Prisma funzionano
- [ ] Test E2E passano

---

## 📝 FASE 4: Backend File Splitting (2 settimane)

### Task 4.1: clinica-routes.js (11,219 → max 500 ciascuno)

Split in moduli:
```
backend/routes/clinica/
├── index.js           # Router principale (import/export)
├── prestazioni.js     # CRUD prestazioni
├── poliambulatori.js  # CRUD poliambulatori
├── ambulatori.js      # CRUD ambulatori
├── sedi.js            # CRUD sedi
├── strumenti.js       # CRUD strumenti
├── offerte-bundle.js  # CRUD bundle
├── convenzioni.js     # CRUD convenzioni
├── listini.js         # CRUD listini
├── disponibilita.js   # Gestione disponibilità
├── appuntamenti.js    # CRUD appuntamenti
├── visite.js          # CRUD visite
├── referti.js         # CRUD referti
└── fatturazione.js    # Fatturazione sanitaria
```

### Task 4.2: seed.js (3,326 → moduli separati)

Split in:
```
backend/prisma/seeds/
├── index.js           # Runner principale
├── tenants.js         # Seed tenant
├── permissions.js     # Seed permessi
├── persons.js         # Seed persone
├── companies.js       # Seed aziende
├── courses.js         # Seed corsi
├── clinica.js         # Seed dati clinica
└── cms.js             # Seed CMS
```

### Task 4.3: Altri File Critici

Applicare stesso pattern per:
- documentService.js → split per funzionalità
- attestati-routes.js → ottimizzare
- preventivi-routes.js → split CRUD
- formsService.js → split per entità
- schedules-routes.js → split per funzionalità

### Verifica Fase 4
- [ ] Nessun file backend >500 linee
- [ ] Import/export corretti
- [ ] API funzionanti
- [ ] Test unitari passano

---

## 📝 FASE 5: Frontend File Splitting (2 settimane)

### Pattern: Hooks Composition

Per ogni componente >500 linee:
```
src/pages/finance/PreventiviPage/
├── index.tsx              # Export principale
├── PreventiviPage.tsx     # Componente principale (<250 linee)
├── types.ts               # TypeScript types
├── hooks/
│   ├── usePreventivi.ts   # Data fetching
│   ├── useFilters.ts      # Gestione filtri
│   ├── useActions.ts      # Azioni CRUD
│   └── index.ts
├── components/
│   ├── PreventivoTable.tsx
│   ├── PreventivoForm.tsx
│   ├── PreventivoFilters.tsx
│   └── index.ts
└── utils/
    ├── formatters.ts
    └── validators.ts
```

### Task 5.1: Priorità Alta (>2000 linee)
1. PreventiviPage.tsx (3,381)
2. CMSPageRenderer.tsx (3,321)
3. ExpiringCoursesSection.tsx (1,986)
4. MedicoForm.tsx (1,861)

### Task 5.2: Priorità Media (1500-2000 linee)
5. FormTemplateCreate.tsx (1,614)
6. SlideEditor.tsx (1,508)
7. PersonDetails.tsx (1,470)
8. TemplateEditor.tsx (1,423)

### Task 5.3: Priorità Normale (1000-1500 linee)
9-25. Rimanenti file >1000 linee

### Verifica Fase 5
- [ ] Nessun file frontend >500 linee
- [ ] TypeScript 0 errori
- [ ] Componenti renderizzano correttamente
- [ ] Performance non degradata

---

## 📝 FASE 6: Consolidamento Permessi (3 giorni)

### Task 6.1: Audit Formato Permessi

Verificare che tutti i permessi usino formato `resource:action`:
- `companies:read`, `companies:write`, `companies:delete`
- `courses:read`, `courses:write`, `courses:delete`
- etc.

### Task 6.2: Consolidare File Permessi

Unificare logica in:
```
backend/services/permissions/
├── index.js
├── PermissionService.js
├── RBACService.js
├── AdvancedPermissionService.js
└── constants.js (tutte le costanti permessi)
```

### Task 6.3: Rimuovere Duplicazioni

Eliminare file obsoleti:
- `backend/utils/permissions.js` (se duplicato)
- `backend/utils/permissionMapping.js` (se non usato)

### Verifica Fase 6
- [ ] Formato permessi uniforme
- [ ] Nessuna duplicazione logica
- [ ] RBAC funzionante

---

## 📝 FASE 7: Testing E2E Completo (1 settimana)

### Task 7.1: Test Suite Completa
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Performance tests
npm run test:perf
```

### Task 7.2: Test Manuali Critici

Checklist:
- [ ] Login/Logout tutti i ruoli
- [ ] CRUD Aziende
- [ ] CRUD Dipendenti
- [ ] CRUD Corsi
- [ ] CRUD Programmazioni
- [ ] CRUD Prestazioni
- [ ] CRUD Visite
- [ ] CRUD Preventivi
- [ ] CMS pagine pubbliche
- [ ] Forms pubblici
- [ ] Multi-tenant switching

### Task 7.3: Performance Benchmark

| Metrica | Pre | Post | Target |
|---------|-----|------|--------|
| Bundle size | ? | ? | -10% |
| First load | ? | ? | <3s |
| API response | ? | ? | <100ms |

### Verifica Fase 7
- [ ] 100% test passati
- [ ] Performance uguale o migliore
- [ ] Zero regressioni

---

## 📝 FASE 8: Documentazione Finale (2 giorni)

### Task 8.1: Aggiornare Documentazione

- README.md principale
- docs/technical/ARCHITECTURE.md
- docs/technical/DATABASE_SCHEMA.md
- docs/technical/API_REFERENCE.md

### Task 8.2: Changelog

Creare CHANGELOG.md dettagliato con tutte le modifiche.

### Task 8.3: Migration Guide

Guida per aggiornare deployment esistenti.

---

## ⚠️ Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Breaking changes API | Alta | Critico | Test E2E ad ogni fase |
| Performance degradata | Media | Alto | Benchmark continuo |
| Data loss | Bassa | Critico | Backup multipli |
| Conflitti merge | Alta | Medio | Branch strategy rigorosa |
| Timeline slippage | Media | Medio | Buffer 20% per fase |

---

## 📊 Metriche di Successo

| Metrica | Attuale | Target | Peso |
|---------|---------|--------|------|
| File >500L | 40+ | 0 | 25% |
| @map nello schema | 126 | 0 | 20% |
| Enum italiani | 35 | 0 | 15% |
| File obsoleti | 108MB | 0 | 10% |
| Test coverage | 75% | 85% | 15% |
| TypeScript errors | 0 | 0 | 15% |

**Score finale**: 100 punti = progetto completato con successo

---

## 📅 Timeline Riepilogativa

```
Settimana 1:  Fase 0-1 (Setup, Pulizia)
Settimana 2:  Fase 2 (Enum Standardizzazione)
Settimana 3-4: Fase 3 (Schema Naming)
Settimana 5-6: Fase 4 (Backend Splitting)
Settimana 7-8: Fase 5 (Frontend Splitting)
Settimana 9:  Fase 6-7 (Permessi, Testing)
Settimana 10: Fase 8 + Buffer (Documentazione)
```

---

## ✅ Checklist Pre-Avvio

- [ ] Backup database completo
- [ ] Branch Git creato
- [ ] Tag versione pre-ottimizzazione
- [ ] Team informato del freeze features
- [ ] CI/CD configurato per checks
- [ ] Ambiente staging pronto

---

*Documento creato il 29/12/2025 - Progetto 46 ElementMedica*
