# 📊 Analisi Completa Schema Prisma - ElementMedica

## 📈 Statistiche Generali

| Metrica | Valore |
|---------|--------|
| **Totale Modelli** | 59 |
| **Linee Schema** | 2.071 |
| **Enums** | 24 |
| **Indici Definiti** | ~150+ |

---

## 🗂️ Categorizzazione Entità

### 1. **CORE BUSINESS - Formazione** (8 modelli)
| Modello | Scopo | Relazioni |
|---------|-------|-----------|
| `Course` | Catalogo corsi | → schedules, testAssignments |
| `CourseSchedule` | Programmazione corsi | → course, enrollments, sessions |
| `CourseEnrollment` | Iscrizioni partecipanti | → schedule, person |
| `CourseSession` | Sessioni (date/orari) | → schedule, trainer |
| `ScheduleCompany` | Aziende associate a schedule | → schedule, company |
| `CourseTestAssignment` | Assegnazione test a corsi | ✅ NUOVO - form templates |
| `CourseTestResult` | Risultati test partecipanti | ✅ NUOVO - tracking score |

### 2. **DOCUMENTI & TEMPLATE** (8 modelli)
| Modello | Scopo | Note |
|---------|-------|------|
| `TemplateLink` | Template documenti | Google Docs, HTML |
| `TemplateVersion` | Versioning template | Audit trail |
| `GeneratedDocument` | Documenti generati | PDF, tracking download |
| `Attestato` | Attestati partecipanti | Numerazione progressiva |
| `LetteraIncarico` | Lettere incarico formatori | Numerazione progressiva |
| `RegistroPresenze` | Registri presenze | Per sessione |
| `RegistroPresenzePartecipante` | Presenze singoli | ore, note |
| `TestDocument` | Documenti test (legacy) | ⚠️ DUPLICATO |

### 3. **BILLING & PREVENTIVI** (8 modelli)
| Modello | Scopo | Note |
|---------|-------|------|
| `Preventivo` | Preventivi clienti | Stati, sconti, numerazione |
| `Fattura` | Fatture emesse | |
| `FatturaAzienda` | Join fattura-azienda | |
| `CodiceSconto` | Codici sconto | Regole applicabilità |
| `PreventivoSconto` | Sconti applicati | Tracking |
| `CodiceAzienda` | Codici per aziende | |
| `CodicePersona` | Codici per persone | |
| `CodiceCorso` | Codici per corsi | |

### 4. **ANAGRAFICHE** (4 modelli)
| Modello | Scopo | Note |
|---------|-------|------|
| `Person` | ✅ Entità unificata | Tutti: employee, trainer, admin |
| `Company` | Aziende clienti | Multi-sede |
| `CompanySite` | Sedi aziendali | DVR, RSPP, Medico |
| `Reparto` | Reparti/Unità | Per sede |

### 5. **AUTH & RBAC** (7 modelli)
| Modello | Scopo | Note |
|---------|-------|------|
| `PersonRole` | Ruoli assegnati | Multi-ruolo, gerarchico |
| `RolePermission` | Permessi per ruolo | Granulare |
| `AdvancedPermission` | Permessi avanzati | Scope, conditions |
| `CustomRole` | Ruoli custom tenant | Flessibilità |
| `CustomRolePermission` | Permessi ruoli custom | |
| `RefreshToken` | Token refresh JWT | |
| `PersonSession` | Sessioni utente | |

### 6. **TENANT & CONFIG** (4 modelli)
| Modello | Scopo | Note |
|---------|-------|------|
| `Tenant` | Multi-tenancy | Isolamento dati |
| `TenantConfiguration` | Config per tenant | Key-value |
| `TenantUsage` | Metriche utilizzo | Billing |
| `DataRetentionPolicy` | GDPR retention | |

### 7. **GDPR & AUDIT** (4 modelli)
| Modello | Scopo | Note |
|---------|-------|------|
| `GdprAuditLog` | Audit log GDPR | |
| `ConsentRecord` | Consensi registrati | |
| `SecurityAuditLog` | Log sicurezza | |
| `ActivityLog` | Log attività utente | |

### 8. **CMS & FORMS** (9 modelli)
| Modello | Scopo | Note |
|---------|-------|------|
| `CMSPage` | Pagine CMS | Multi-brand |
| `CMSMedia` | Media library | Folder, tags |
| `cms_media_folders` | Cartelle media | |
| `cms_navigation` | Menu navigazione | |
| `cms_page_versions` | Versioning pagine | |
| `form_templates` | Template form | Test, enrollment |
| `form_fields` | Campi form | Validation, scoring |
| `ContactSubmission` | Sottomissioni form | |
| `seo_configs` | Config SEO | |
| `sitemaps` | Sitemap entries | |

### 9. **SERVIZI AGGIUNTIVI** (4 modelli)
| Modello | Scopo | Note |
|---------|-------|------|
| `DVR` | Documenti Valutazione Rischi | Per sede |
| `Sopralluogo` | Sopralluoghi | Schedulazione |
| `Permission` | Permessi legacy | ⚠️ OBSOLETO |
| `GoogleTokens` | Token Google OAuth | |

### 10. **JOIN TABLES LEGACY** (2 modelli)
| Modello | Scopo | Note |
|---------|-------|------|
| `preventivo_aziende` | Join preventivo-azienda | ⚠️ SENZA RELAZIONI |
| `preventivo_partecipanti` | Join preventivo-persona | ⚠️ SENZA RELAZIONI |

---

## 🔴 PROBLEMI IDENTIFICATI

### 1. **DUPLICAZIONI - Gestione Test**

❌ **TestDocument + TestPartecipante** (legacy)
vs
✅ **CourseTestAssignment + CourseTestResult** (nuovo)

**Problema**: Due sistemi paralleli per gestire i test:
- `TestDocument` + `TestPartecipante` = sistema vecchio (file-based)
- `CourseTestAssignment` + `CourseTestResult` = sistema nuovo (form-based)

**Raccomandazione**: 
```
MIGRARE TestDocument → CourseTestAssignment
MIGRARE TestPartecipante → CourseTestResult
POI ELIMINARE TestDocument, TestPartecipante
```

---

### 2. **TABELLE JOIN ORFANE**

❌ **preventivo_aziende** - Nessuna relazione Prisma definita
❌ **preventivo_partecipanti** - Nessuna relazione Prisma definita

**Problema**: Queste tabelle esistono nel DB ma non hanno relazioni nel modello Prisma.

**Raccomandazione**:
```prisma
// OPZIONE A: Aggiungere relazioni
model preventivo_aziende {
  preventivo Preventivo @relation(...)
  azienda    Company @relation(...)
}

// OPZIONE B: Verificare se sono usate e rimuovere se obsolete
```

---

### 3. **Permission (legacy) vs PersonPermission (enum)**

❌ **Permission** model (tabella database)
✅ **PersonPermission** enum (codice)

**Problema**: Il modello `Permission` è una tabella database che sembra non essere più usata. I permessi sono gestiti tramite l'enum `PersonPermission`.

**Raccomandazione**:
```
VERIFICARE USO di Permission nel codice
SE NON USATO → ELIMINARE modello Permission
```

---

### 4. **Naming Convention Inconsistente**

| Tipo | Esempi Buoni | Esempi Problematici |
|------|--------------|---------------------|
| PascalCase | `CourseSchedule`, `PersonRole` | ✅ OK |
| snake_case | | `form_templates`, `form_fields`, `cms_*` |
| Mixed | | `preventivo_aziende` (italiano+snake) |

**Raccomandazione**:
```
MANTENERE: PascalCase per nuovi modelli
CONSIDERARE: Rinominare gradualmente i snake_case (breaking change)
```

---

### 5. **Audit Logs Multipli**

Esistono 3 modelli per audit:
1. `GdprAuditLog` - Audit GDPR
2. `SecurityAuditLog` - Audit sicurezza  
3. `ActivityLog` - Log attività

**Problema**: Potenziale duplicazione di funzionalità.

**Raccomandazione**:
```
ANALIZZARE: Cosa viene loggato dove
CONSIDERARE: Unificare in un singolo AuditLog con "type" enum
PERÒ: Separazione può essere intenzionale per GDPR compliance
```

---

## ✅ CONSOLIDAMENTI RACCOMANDATI

### Priorità ALTA (Impatto minimo, valore alto)

1. **Eliminare TestDocument + TestPartecipante**
   - Dopo migrazione a CourseTestAssignment/CourseTestResult
   - Rischio: Basso (nuovo sistema già implementato)
   - Beneficio: Schema più pulito, meno confusione

2. **Sistemare preventivo_aziende/partecipanti**
   - Aggiungere relazioni Prisma o eliminare
   - Rischio: Medio (verificare uso nel codice)
   - Beneficio: Integrità referenziale

3. **Verificare modello Permission**
   - Se non usato, eliminare
   - Rischio: Basso
   - Beneficio: Schema più pulito

### Priorità MEDIA (Richiede pianificazione)

4. **Uniformare naming convention**
   - form_templates → FormTemplate
   - cms_* → CMS* (PascalCase)
   - Rischio: Alto (breaking change API/frontend)
   - Beneficio: Consistenza, manutenibilità

### Priorità BASSA (Future enhancement)

5. **Valutare unificazione audit logs**
   - Solo se ci sono problemi di performance/manutenzione
   - Rischio: Medio
   - Beneficio: Semplicità query

---

## 📊 ENTITÀ ESSENZIALI vs OPZIONALI

### ✅ ESSENZIALI (59 → 52 dopo cleanup)
- **Core**: Course, CourseSchedule, CourseEnrollment, CourseSession, ScheduleCompany
- **Test (nuovo)**: CourseTestAssignment, CourseTestResult
- **Docs**: TemplateLink, TemplateVersion, GeneratedDocument, Attestato, LetteraIncarico, RegistroPresenze, RegistroPresenzePartecipante
- **Billing**: Preventivo, Fattura, FatturaAzienda, CodiceSconto, PreventivoSconto, CodiceAzienda, CodicePersona, CodiceCorso
- **Anagrafica**: Person, Company, CompanySite, Reparto
- **Auth**: PersonRole, RolePermission, AdvancedPermission, CustomRole, CustomRolePermission, RefreshToken, PersonSession
- **Tenant**: Tenant, TenantConfiguration, TenantUsage, DataRetentionPolicy
- **GDPR**: GdprAuditLog, ConsentRecord, SecurityAuditLog, ActivityLog
- **CMS**: CMSPage, CMSMedia, cms_media_folders, cms_navigation, cms_page_versions, form_templates, form_fields, ContactSubmission, seo_configs, sitemaps
- **Servizi**: DVR, Sopralluogo, GoogleTokens

### ⚠️ DA RIMUOVERE/MIGRARE (7 modelli)
1. `TestDocument` - Sostituito da CourseTestAssignment
2. `TestPartecipante` - Sostituito da CourseTestResult
3. `Permission` - Probabilmente obsoleto (usare enum)
4. `preventivo_aziende` - Join orfana (aggiungere relazioni o rimuovere)
5. `preventivo_partecipanti` - Join orfana (aggiungere relazioni o rimuovere)

---

## 🎯 AZIONI CONSIGLIATE

### Fase 1: Cleanup Immediato (1-2 giorni)
1. [ ] Verificare uso di `Permission` model nel codice
2. [ ] Verificare uso di `preventivo_aziende` / `preventivo_partecipanti`
3. [ ] Documentare decisione su TestDocument migration

### Fase 2: Migration (1 settimana)
1. [ ] Migrare dati TestDocument → CourseTestAssignment (se esistono)
2. [ ] Migrare dati TestPartecipante → CourseTestResult (se esistono)
3. [ ] Creare migration per rimuovere modelli obsoleti

### Fase 3: Refinement (Sprint futuro)
1. [ ] Valutare rinomina modelli snake_case → PascalCase
2. [ ] Valutare unificazione audit logs
3. [ ] Ottimizzare indici basandosi su query patterns

---

## 📝 NOTE FINALI

### Database già ben strutturato:
- ✅ Multi-tenancy completo (`tenantId` ovunque)
- ✅ Soft delete (`deletedAt` su tutti i modelli)
- ✅ Indici ottimizzati (150+ definiti)
- ✅ Relazioni esplicite con `onDelete`
- ✅ Enums per type safety (24 definiti)
- ✅ Timestamp audit (`createdAt`, `updatedAt`)

### Aree di miglioramento identificate:
- ⚠️ 7 modelli potenzialmente obsoleti/duplicati
- ⚠️ Naming convention mista
- ⚠️ 2 tabelle join senza relazioni Prisma

**Risultato finale dopo cleanup**: 52 modelli ben organizzati
