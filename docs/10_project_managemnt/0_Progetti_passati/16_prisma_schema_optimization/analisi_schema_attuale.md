# 📊 Analisi Schema Prisma Attuale

**Data Analisi**: Dicembre 2024  
**Versione Schema**: Corrente  
**Totale Righe**: 783  

## 📈 Metriche Generali

| Metrica | Valore |
|---------|--------|
| **Modelli Totali** | 25 |
| **Enum Definiti** | 3 |
| **Relazioni Totali** | ~80 |
| **Campi da Rinominare** | 47 |
| **Indici Mancanti** | 15 |
| **@map Superflui** | 23 |
| **onDelete Non Specificati** | 12 |

## 🏗️ Inventario Modelli

### ✅ Modelli Attivi (25)
1. **Company** - Gestione aziende
2. **Course** - Gestione corsi
3. **CourseSchedule** - Programmazione corsi
4. **CourseEnrollment** - Iscrizioni corsi
5. **CourseSession** - Sessioni corsi
6. **ScheduleCompany** - Relazione schedule-company
7. **Attestato** - Certificati
8. **TemplateLink** - Template documenti
9. **LetteraIncarico** - Lettere incarico
10. **RegistroPresenze** - Registri presenze
11. **RegistroPresenzePartecipante** - Partecipanti presenze
12. **Preventivo** - Preventivi
13. **PreventivoPartecipante** - Partecipanti preventivi
14. **PreventivoAzienda** - Aziende preventivi
15. **Fattura** - Fatture
16. **FatturaAzienda** - Aziende fatture
17. **Permission** - Permessi sistema
18. **ActivityLog** - Log attività
19. **TestDocument** - Documenti test
20. **TestPartecipante** - Partecipanti test
21. **RefreshToken** - Token refresh
22. **GdprAuditLog** - Log audit GDPR
23. **ConsentRecord** - Record consensi
24. **PersonSession** - Sessioni utente
25. **Person** - Entità utente unificata

### 🔄 Modelli Sistema Ruoli (7)
26. **PersonRole** - Ruoli persona
27. **RolePermission** - Permessi ruolo
28. **AdvancedPermission** - Permessi avanzati
29. **Tenant** - Multi-tenancy
30. **TenantConfiguration** - Configurazioni tenant
31. **EnhancedUserRole** - Ruoli enhanced
32. **TenantUsage** - Utilizzo tenant
33. **CustomRole** - Ruoli custom
34. **CustomRolePermission** - Permessi ruoli custom

### ❌ Modelli Obsoleti Rimossi
- ~~User~~ → Migrato a Person ✅
- ~~Employee~~ → Migrato a Person ✅
- ~~Role~~ → Sostituito da PersonRole ✅
- ~~UserRole~~ → Sostituito da PersonRole ✅

## 🚨 Problemi Critici Identificati

### 1. Naming Conventions Inconsistenti

#### Snake_case da Convertire (47 campi)
```prisma
// Company
created_at → createdAt
updated_at → updatedAt
codice_ateco → codiceAteco
persona_riferimento → personaRiferimento
sede_azienda → sedeAzienda
subscription_plan → subscriptionPlan
is_active → isActive

// Course
created_at → createdAt
updated_at → updatedAt

// CourseSchedule
start_date → startDate
end_date → endDate
max_participants → maxParticipants
created_at → createdAt
updated_at → updatedAt
delivery_mode → deliveryMode

// CourseEnrollment
created_at → createdAt
updated_at → updatedAt

// E molti altri...
```

#### @map Superflui da Rimuovere (23)
```prisma
// Dopo conversione camelCase, questi @map diventano superflui:
@map("created_at") // se campo diventa createdAt
@map("updated_at") // se campo diventa updatedAt
@map("deleted_at") // se campo diventa deletedAt
// etc...
```

### 2. Indici Mancanti su Foreign Keys (15)

```prisma
// FK senza indici espliciti:
CourseSchedule.companyId
CourseSchedule.trainerId
CourseEnrollment.personId
CourseSession.trainerId
CourseSession.coTrainerId
ScheduleCompany.companyId
Attestato.personId
LetteraIncarico.trainerId
RegistroPresenze.formatoreId
TestDocument.trainerId
RefreshToken.personId
ActivityLog.personId
GdprAuditLog.personId
ConsentRecord.personId
PersonSession.personId
```

### 3. Relazioni senza onDelete Specificato (12)

```prisma
// Relazioni critiche senza onDelete:
Company -> CourseSchedule (dovrebbe essere SetNull)
Course -> CourseSchedule (dovrebbe essere Cascade)
Person -> PersonRole (già Cascade ✅)
Tenant -> Company (dovrebbe essere Cascade)
Tenant -> Course (dovrebbe essere SetNull)
Company -> Person (dovrebbe essere SetNull)
Person -> RefreshToken (già Cascade ✅)
Person -> ActivityLog (dovrebbe essere Cascade)
Person -> GdprAuditLog (dovrebbe essere SetNull)
Person -> ConsentRecord (già Cascade ✅)
Tenant -> PersonRole (dovrebbe essere Cascade)
CustomRole -> PersonRole (dovrebbe essere SetNull)
```

### 4. Campi @unique con Gestione NULL Problematica

```prisma
// Campi che permettono NULL multipli:
Person.taxCode String? @unique // Problematico: più NULL
Person.username String? @unique // Problematico: più NULL
Company.slug String? @unique // Problematico: più NULL
Company.domain String? @unique // Problematico: più NULL
```

### 5. Multi-Tenant Inconsistencies

```prisma
// tenantId nullable dove dovrebbe essere required:
Company.tenantId String? // Dovrebbe essere String
Course.tenantId String? // Dovrebbe essere String
Person.tenantId String? // Dovrebbe essere String
```

### 6. Enum Mancanti per Campi String

```prisma
// Campi String che dovrebbero essere enum:
Course.status String? // → CourseStatus enum
CourseSchedule.status String? // → ScheduleStatus enum
CourseSchedule.delivery_mode String? // → DeliveryMode enum
CourseEnrollment.status String? // → EnrollmentStatus enum
TestDocument.stato String // → TestStatus enum
TestDocument.tipologia String // → TestType enum
TestPartecipante.status String // → ParticipantTestStatus enum
```

### 7. Precisione Numerica Inconsistente

```prisma
// Campi Decimal senza precisione specificata:
Person.hourlyRate Decimal? // Dovrebbe essere @db.Decimal(10,2)
TestDocument.punteggio Float? // Dovrebbe essere Decimal(5,2)
TestDocument.sogliaSuperamento Float? // Dovrebbe essere Decimal(5,2)
TestPartecipante.punteggio Float? // Dovrebbe essere Decimal(5,2)
```

### 8. Array di Stringhe da Valutare

```prisma
// Array che potrebbero diventare relazioni:
Person.certifications String[] // → Certification model?
Person.specialties String[] // → Specialty model?
```

## 🎯 Priorità Interventi

### 🔴 Priorità ALTA (Impatto Performance)
1. **Aggiunta Indici FK** - Impatto immediato su performance
2. **Conversione Naming** - Base per tutto il resto
3. **onDelete Policies** - Integrità referenziale

### 🟡 Priorità MEDIA (Manutenibilità)
4. **Enum Conversions** - Type safety
5. **Multi-tenant Fixes** - Sicurezza
6. **@unique NULL Handling** - Consistenza dati

### 🟢 Priorità BASSA (Nice to Have)
7. **Precisione Numerica** - Accuratezza calcoli
8. **Array → Relations** - Normalizzazione
9. **Modularizzazione** - Organizzazione codice

## 📋 Checklist Validazione

### Pre-Modifiche
- [ ] Backup database completo
- [ ] Backup schema.prisma
- [ ] Test suite funzionante
- [ ] Ambiente test configurato

### Post-Modifiche
- [ ] Tutte le query esistenti funzionanti
- [ ] Performance non degradate
- [ ] Test suite passa al 100%
- [ ] Documentazione aggiornata

## 🔧 Strumenti Necessari

- **Prisma CLI** - Per generate e migrate
- **PostgreSQL** - Database target
- **Jest** - Testing framework
- **pg_dump** - Backup utility
- **Custom Scripts** - Automazione refactoring

## 📊 Stima Impatto

| Categoria | File Impattati | Ore Stimate |
|-----------|----------------|-------------|
| **Schema Changes** | 1 | 8-12 |
| **Backend Code** | 15-20 | 12-16 |
| **Frontend Code** | 25-30 | 8-12 |
| **Testing** | 10-15 | 6-8 |
| **Documentation** | 5-10 | 4-6 |
| **TOTALE** | **56-76** | **38-54** |

---

**Conclusione**: Lo schema attuale è funzionale ma presenta significative opportunità di ottimizzazione. Il refactoring proposto migliorerà performance, manutenibilità e sicurezza senza compromettere la funzionalità esistente.