# 📋 PLANNING DETTAGLIATO - Refactoring Completo Sistema

## 🎯 Obiettivo

Refactoring completo e sicuro del sistema per semplificare l'architettura, eliminare duplicazioni e standardizzare la gestione dati mantenendo piena conformità GDPR.

**Data Inizio**: 29 Dicembre 2024  
**Durata Stimata**: 3 settimane  
**Priorità**: CRITICA  

---

## 📊 ANALISI SCHEMA ATTUALE

### Entità Duplicate Identificate

#### 👤 Gestione Persone (CRITICO)
```prisma
// PROBLEMA: Tre entità sovrapposte
model User {           // 302-325: Autenticazione legacy
  id, username, email, password, firstName, lastName
  companyId, tenantId, globalRole
  eliminato Boolean @default(false)  // ❌ Campo soft delete
}

model Employee {       // 37-65: Dipendenti aziendali
  id, first_name, last_name, email, phone
  companyId, codice_fiscale
  eliminato Boolean @default(false)  // ❌ Campo soft delete
}

model Person {         // 475-540: Entità unificata moderna
  id, firstName, lastName, email, phone
  companyId, tenantId, taxCode
  deletedAt DateTime?              // ✅ Soft delete corretto
  isDeleted Boolean @default(false) // ❌ Duplicato
}
```

#### 🔐 Gestione Ruoli (CRITICO)
```prisma
// PROBLEMA: Due sistemi ruoli paralleli
model Role {           // 327-348: Sistema legacy
  id, name, displayName, permissions Json
  companyId, tenantId
  eliminato Boolean @default(false)  // ❌ Campo soft delete
}

model PersonRole {     // 542-567: Sistema moderno
  personId, roleType RoleType
  companyId, tenantId
  // ✅ Nessun campo soft delete (corretto)
}

enum RoleType {        // 675-698: Enum ben definito
  EMPLOYEE, MANAGER, TRAINER, ADMIN, etc.
}
```

### Campi Soft Delete Inconsistenti

| Entità | Campo Soft Delete | Tipo | Status |
|--------|------------------|------|--------|
| User | `eliminato` | Boolean | ❌ Da rimuovere |
| Employee | `eliminato` | Boolean | ❌ Da rimuovere |
| Person | `deletedAt` | DateTime? | ✅ Mantenere |
| Person | `isDeleted` | Boolean | ❌ Da rimuovere |
| Role | `eliminato` | Boolean | ❌ Da rimuovere |
| Company | `eliminato` | Boolean | ❌ Da convertire |
| Course | `eliminato` | Boolean | ❌ Da convertire |

---

## 🗺️ PIANO IMPLEMENTAZIONE

### FASE 1: PREPARAZIONE E BACKUP (Giorni 1-2)

#### Step 1.1: Backup Completo Sistema
```bash
# Backup database
pg_dump -h localhost -U postgres -d database_name > backup_pre_refactoring.sql

# Backup codice
cp -r /Users/matteo.michielon/project\ 2.0 /Users/matteo.michielon/backup_project_pre_refactoring
```

#### Step 1.2: Analisi Dipendenze
- [ ] Mappare tutte le relazioni User → altre entità
- [ ] Mappare tutte le relazioni Employee → altre entità  
- [ ] Identificare query che usano `eliminato` vs `deletedAt`
- [ ] Catalogare file che referenziano Role vs PersonRole

#### Step 1.3: Creazione Test Baseline
```bash
# Test funzionalità critiche prima del refactoring
node test_sistema_completo_baseline.cjs
```

### FASE 2: UNIFICAZIONE ENTITÀ PERSON (Giorni 3-7)

#### Step 2.1: Migrazione Dati User → Person

**Script Migrazione**:
```sql
-- Inserire User mancanti in Person
INSERT INTO persons (
  id, firstName, lastName, email, username, password,
  isActive, lastLogin, globalRole, companyId, tenantId,
  createdAt, updatedAt
)
SELECT 
  u.id, u.firstName, u.lastName, u.email, u.username, u.password,
  u.isActive, u.lastLogin, u.globalRole, u.companyId, u.tenantId,
  u.createdAt, u.updatedAt
FROM "User" u
LEFT JOIN persons p ON u.id = p.id
WHERE p.id IS NULL AND u.eliminato = false;
```

**Aggiornamento Relazioni**:
```sql
-- RefreshToken: personId già corretto ✅
-- UserRole → PersonRole (conversione)
-- UserSession → PersonSession (nuovo)
-- ActivityLog → PersonActivityLog (nuovo)
-- ConsentRecord → PersonConsentRecord (nuovo)
-- GdprAuditLog: userId → personId
```

#### Step 2.2: Migrazione Dati Employee → Person

**Script Migrazione**:
```sql
-- Inserire Employee mancanti in Person
INSERT INTO persons (
  id, firstName, lastName, email, phone, birthDate, taxCode,
  residenceAddress, residenceCity, postalCode, province,
  title, hiredDate, companyId, createdAt, updatedAt
)
SELECT 
  e.id, e.first_name, e.last_name, e.email, e.phone, e.birth_date, e.codice_fiscale,
  e.residence_address, e.residence_city, e.postal_code, e.province,
  e.title, e.hired_date, e.companyId, e.created_at, e.updated_at
FROM "Employee" e
LEFT JOIN persons p ON e.id = p.id
WHERE p.id IS NULL AND e.eliminato = false;
```

**Aggiornamento Relazioni**:
```sql
-- CourseEnrollment: employeeId → personId
-- Attestato: partecipanteId → personId
-- PreventivoPartecipante: partecipanteId → personId
-- RegistroPresenzePartecipante: partecipanteId → personId
-- TestPartecipante: partecipanteId → personId
```

#### Step 2.3: Aggiornamento Schema Prisma

**Rimuovere Entità**:
```prisma
// ❌ RIMUOVERE
model User { ... }
model Employee { ... }

// ✅ MANTENERE E AGGIORNARE
model Person {
  // Rimuovere isDeleted
  // Mantenere solo deletedAt
}
```

**Aggiornare Relazioni**:
```prisma
model CourseEnrollment {
  personId   String  // era employeeId
  person     Person  @relation(fields: [personId], references: [id])
}

model RefreshToken {
  // ✅ Già corretto con personId
}
```

#### Step 2.4: Aggiornamento Codice Backend

**File da Aggiornare**:
- [ ] `auth/middleware.js` - Sostituire User con Person
- [ ] `routes/employees-routes.js` - Sostituire Employee con Person
- [ ] `routes/users-routes.js` - Sostituire User con Person
- [ ] `services/authService.js` - Aggiornare query
- [ ] `controllers/personController.js` - Unificare logica

**Pattern Sostituzione**:
```javascript
// ❌ PRIMA
const user = await prisma.user.findUnique({
  where: { id: userId, eliminato: false }
});

// ✅ DOPO
const person = await prisma.person.findUnique({
  where: { id: personId, deletedAt: null }
});
```

### FASE 3: STANDARDIZZAZIONE SOFT DELETE (Giorni 8-10)

#### Step 3.1: Migrazione Campi Soft Delete

**Script SQL**:
```sql
-- Company: eliminato → deletedAt
ALTER TABLE "Company" ADD COLUMN "deletedAt" TIMESTAMP;
UPDATE "Company" SET "deletedAt" = NOW() WHERE "eliminato" = true;
ALTER TABLE "Company" DROP COLUMN "eliminato";

-- Course: eliminato → deletedAt  
ALTER TABLE "Course" ADD COLUMN "deletedAt" TIMESTAMP;
UPDATE "Course" SET "deletedAt" = NOW() WHERE "eliminato" = true;
ALTER TABLE "Course" DROP COLUMN "eliminato";

-- Person: rimuovere isDeleted
ALTER TABLE persons DROP COLUMN "isDeleted";
```

#### Step 3.2: Aggiornamento Query nel Codice

**Pattern Sostituzione**:
```javascript
// ❌ PRIMA
where: { eliminato: false }
where: { isDeleted: false }

// ✅ DOPO
where: { deletedAt: null }
```

**File da Aggiornare**:
- [ ] `routes/companies-routes.js`
- [ ] `routes/courses-routes.js`
- [ ] `routes/person-routes.js`
- [ ] Tutti i service files
- [ ] Tutti i controller files

### FASE 4: UNIFICAZIONE SISTEMA RUOLI (Giorni 11-14)

#### Step 4.1: Migrazione Role → PersonRole

**Analisi Mapping**:
```sql
-- Verificare Role esistenti
SELECT name, COUNT(*) FROM "Role" GROUP BY name;

-- Mappare a RoleType enum
-- ADMIN → ADMIN
-- MANAGER → MANAGER  
-- USER → EMPLOYEE
-- etc.
```

**Script Migrazione**:
```sql
-- Creare PersonRole da Role esistenti
INSERT INTO person_roles (
  id, personId, roleType, companyId, tenantId, 
  assignedAt, createdAt, updatedAt
)
SELECT 
  gen_random_uuid(),
  ur.userId,
  CASE r.name
    WHEN 'ADMIN' THEN 'ADMIN'::"RoleType"
    WHEN 'MANAGER' THEN 'MANAGER'::"RoleType"
    WHEN 'USER' THEN 'EMPLOYEE'::"RoleType"
    ELSE 'EMPLOYEE'::"RoleType"
  END,
  r.companyId,
  r.tenantId,
  ur.assignedAt,
  NOW(),
  NOW()
FROM "UserRole" ur
JOIN "Role" r ON ur.roleId = r.id
WHERE ur.eliminato = false AND r.eliminato = false;
```

#### Step 4.2: Migrazione Permessi

**Mapping Permission → PersonPermission**:
```sql
-- Analizzare permessi esistenti in Role.permissions (JSON)
-- Mappare a enum PersonPermission
```

#### Step 4.3: Rimozione Entità Legacy

```prisma
// ❌ RIMUOVERE
model Role { ... }
model UserRole { ... }
model Permission { ... }
model EnhancedUserRole { ... }

// ✅ MANTENERE
model PersonRole { ... }
enum RoleType { ... }
enum PersonPermission { ... }
```

#### Step 4.4: Aggiornamento Codice Autorizzazione

**File da Aggiornare**:
- [ ] `auth/middleware.js` - Usare PersonRole
- [ ] `middleware/rbac.js` - Aggiornare logica
- [ ] `services/enhancedRoleService.js` - Sostituire con PersonRoleService

### FASE 5: PULIZIA FILE E DOCUMENTAZIONE (Giorni 15-18)

#### Step 5.1: Rimozione Test Obsoleti

**Test da Rimuovere** (mantenere solo essenziali):
```bash
# Mantenere
test_sistema_completo.cjs
test_login_final_complete.cjs
test_permissions_endpoint.cjs

# Rimuovere (150+ file)
test_login_*.cjs (eccetto finale)
test_authenticate_*.cjs (eccetto essenziali)
test_middleware_*.cjs (eccetto essenziali)
test_verify_*.cjs (eccetto essenziali)
```

#### Step 5.2: Analisi Planning Sistematici

**File da Analizzare**:
- [ ] `backend/PLANNING_SISTEMATICO.md`
- [ ] `backend/PLANNING_SISTEMATICO_RIASSUNTO.md`
- [ ] `docs/10_project_managemnt/6_analisi_login_timeout/PLANNING_SISTEMATICO.md`
- [ ] `docs/10_project_managemnt/6_analisi_login_timeout/PLANNING_SISTEMATICO_RIASSUNTO.md`

**Informazioni da Estrarre**:
- ✅ Errori risolti (authService, courses-routes, etc.)
- ✅ Problemi ricorrenti (schema mismatch, server restart)
- ✅ Best practices (test diretti, documentazione sistematica)
- ✅ Lezioni apprese (field names, relations verification)

#### Step 5.3: Aggiornamento STATO_SISTEMA_FINALE.md

**Sezioni da Aggiornare**:
```markdown
## ✅ PROBLEMI RISOLTI

### 1. 🗄️ SCHEMA PRISMA SEMPLIFICATO
- ✅ Unificazione User/Employee → Person
- ✅ Standardizzazione soft delete → deletedAt
- ✅ Unificazione Role → PersonRole/RoleType

### 2. 🧹 PULIZIA CODICE
- ✅ Rimossi 150+ test obsoleti
- ✅ Consolidata documentazione
- ✅ Aggiornate regole GDPR
```

### FASE 6: AGGIORNAMENTO DOCUMENTAZIONE (Giorni 19-21)

#### Step 6.1: Aggiornamento docs/technical/

**File da Aggiornare**:
- [ ] `docs/technical/database/schema.md` - Nuovo schema
- [ ] `docs/technical/api/api-reference.md` - Nuovi endpoint
- [ ] `docs/technical/architecture/system-overview.md` - Architettura semplificata

#### Step 6.2: Aggiornamento project_rules.md

**Sezioni da Aggiornare**:
```markdown
## 🗄️ Schema Database Standardizzato

### Entità Principale: Person
- ✅ Unica entità per utenti/dipendenti/trainer
- ✅ Soft delete con deletedAt DateTime?
- ✅ Relazioni unificate

### Sistema Ruoli: PersonRole + RoleType
- ✅ Enum RoleType per tipi ruolo
- ✅ PersonPermission per permessi granulari
- ✅ Multi-tenant e multi-company support

### Conformità GDPR
- ✅ Soft delete uniforme per diritto cancellazione
- ✅ Audit trail completo
- ✅ Gestione consensi centralizzata
```

---

## 🧪 PIANO TEST E VERIFICA

### Test Automatizzati per Ogni Fase

#### Fase 1: Test Baseline
```bash
node test_sistema_completo_baseline.cjs
# Verifica: Login, Courses, Companies, Permissions
```

#### Fase 2: Test Migrazione Person
```bash
node test_person_migration.cjs
# Verifica: 
# - Tutti User migrati in Person
# - Tutti Employee migrati in Person
# - Relazioni aggiornate correttamente
# - Nessun dato perso
```

#### Fase 3: Test Soft Delete
```bash
node test_soft_delete_standardization.cjs
# Verifica:
# - Tutte le query usano deletedAt
# - Nessun riferimento a eliminato/isDeleted
# - Funzionalità cancellazione GDPR
```

#### Fase 4: Test Sistema Ruoli
```bash
node test_role_system_unified.cjs
# Verifica:
# - PersonRole funzionante
# - Permessi corretti
# - Autorizzazione endpoint
```

#### Fase 5-6: Test Finale
```bash
node test_sistema_completo_finale.cjs
# Verifica completa tutte le funzionalità
```

### Checklist GDPR per Ogni Fase

- [ ] **Diritto Accesso**: Dati accessibili via API
- [ ] **Diritto Cancellazione**: Soft delete funzionante
- [ ] **Diritto Portabilità**: Export dati completo
- [ ] **Audit Trail**: Log tutte le operazioni
- [ ] **Consensi**: Gestione consensi preservata
- [ ] **Retention**: Policy retention rispettate

---

## 🚨 GESTIONE RISCHI E ROLLBACK

### Piano Rollback per Ogni Fase

#### Rollback Fase 2 (Migrazione Person)
```sql
-- Ripristinare User e Employee
CREATE TABLE "User" AS SELECT * FROM backup_user;
CREATE TABLE "Employee" AS SELECT * FROM backup_employee;

-- Ripristinare relazioni
UPDATE "RefreshToken" SET "userId" = "personId" WHERE "personId" IN (SELECT id FROM backup_user);
```

#### Rollback Fase 3 (Soft Delete)
```sql
-- Ripristinare campi eliminato
ALTER TABLE "Company" ADD COLUMN "eliminato" BOOLEAN DEFAULT false;
UPDATE "Company" SET "eliminato" = true WHERE "deletedAt" IS NOT NULL;
```

#### Rollback Fase 4 (Sistema Ruoli)
```sql
-- Ripristinare Role e UserRole
CREATE TABLE "Role" AS SELECT * FROM backup_role;
CREATE TABLE "UserRole" AS SELECT * FROM backup_user_role;
```

### Monitoraggio Continuo

```bash
# Script monitoraggio durante migrazione
watch -n 30 'psql -d database -c "SELECT COUNT(*) FROM persons; SELECT COUNT(*) FROM person_roles;"'
```

### Punti di Controllo

- [ ] **Checkpoint 1**: Backup completato
- [ ] **Checkpoint 2**: Migrazione Person completata
- [ ] **Checkpoint 3**: Soft delete standardizzato
- [ ] **Checkpoint 4**: Sistema ruoli unificato
- [ ] **Checkpoint 5**: Test finale superato

---

## 📊 METRICHE DI SUCCESSO

### Metriche Tecniche

| Metrica | Prima | Dopo | Target |
|---------|-------|------|--------|
| Entità Person | 3 (User/Employee/Person) | 1 (Person) | ✅ |
| Campi Soft Delete | 3 tipi | 1 (deletedAt) | ✅ |
| Sistema Ruoli | 2 (Role/PersonRole) | 1 (PersonRole) | ✅ |
| File Test | 150+ | <20 | ✅ |
| Documentazione Obsoleta | 50+ file | 0 | ✅ |

### Metriche Qualitative

- [ ] **Manutenibilità**: Codice più semplice e chiaro
- [ ] **Onboarding**: Sviluppatori comprendono architettura in <1 giorno
- [ ] **Performance**: Query più efficienti
- [ ] **GDPR**: Conformità al 100%
- [ ] **Stabilità**: Zero regressioni funzionali

---

## 📅 TIMELINE DETTAGLIATA

### Settimana 1: Preparazione e Migrazione Core
- **Giorni 1-2**: Backup e analisi dipendenze
- **Giorni 3-5**: Migrazione User/Employee → Person
- **Giorni 6-7**: Test e verifica migrazione

### Settimana 2: Standardizzazione e Ruoli
- **Giorni 8-10**: Standardizzazione soft delete
- **Giorni 11-14**: Unificazione sistema ruoli

### Settimana 3: Pulizia e Documentazione
- **Giorni 15-16**: Pulizia file obsoleti
- **Giorni 17-18**: Analisi planning sistematici
- **Giorni 19-21**: Aggiornamento documentazione

---

## 🎯 PROSSIMI PASSI IMMEDIATI

1. **Creare cartella analisi/** con file specifici
2. **Eseguire backup completo sistema**
3. **Creare test baseline per verifica**
4. **Iniziare analisi dipendenze dettagliata**
5. **Preparare script migrazione database**

---

## 🔄 REQUISITI AGGIUNTIVI IDENTIFICATI

### 1. 🔄 Sostituzione Riferimenti Employee → Person

**Entità da Aggiornare**:
- [ ] `Attestato`: `employeeId` → `personId`, `employee` → `person`
- [ ] `CourseEnrollment`: `employeeId` → `personId`, `employee` → `person`
- [ ] `RegistroPresenzePartecipante`: `employeeId` → `personId`, `employee` → `person`
- [ ] `PreventivoPartecipante`: `partecipanteId` → `personId`, `partecipante` → `person`
- [ ] `TestPartecipante`: `partecipanteId` → `personId`, `partecipante` → `person`
- [ ] `CourseSchedule`: `trainerId` → `personId`, `trainer` → `person`
- [ ] `CourseSession`: `trainerId` → `personId`, `coTrainerId` → `coPersonId`

**Pattern Sostituzione**:
```prisma
// ❌ PRIMA
model Attestato {
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id])
}

// ✅ DOPO
model Attestato {
  personId String
  person   Person @relation(fields: [personId], references: [id])
}
```

### 2. 📝 Rinominazione Campi Legacy

**Campi da Rinominare**:
- [ ] `eliminato` → `isDeleted` (Boolean, coerente con `deletedAt`)
- [ ] `nomeFile` → `fileName`
- [ ] `url` → `fileUrl`
- [ ] `dataGenerazione` → `generatedAt`
- [ ] `telefono` → `phone`
- [ ] `first_name` → `firstName`
- [ ] `last_name` → `lastName`
- [ ] `codice_fiscale` → `taxCode`
- [ ] `ragione_sociale` → `companyName`
- [ ] `partita_iva` → `vatNumber`

**Aggiornamento Schema**:
```prisma
// ❌ PRIMA
model TestDocument {
  nomeFile       String
  url           String
  dataGenerazione DateTime
  eliminato     Boolean @default(false)
}

// ✅ DOPO
model TestDocument {
  fileName      String    @map("nome_file")
  fileUrl       String    @map("url")
  generatedAt   DateTime  @map("data_generazione")
  isDeleted     Boolean   @default(false) @map("eliminato")
  deletedAt     DateTime? @map("deleted_at")
}
```

### 3. 🏷️ Introduzione Enum Dedicati

**Enum da Creare**:
```prisma
enum CourseStatus {
  DRAFT
  PUBLISHED
  ACTIVE
  COMPLETED
  CANCELLED
  ARCHIVED
}

enum CourseScheduleStatus {
  PLANNED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  POSTPONED
}

enum TestDocumentType {
  INITIAL_TEST
  FINAL_TEST
  INTERMEDIATE_TEST
  PRACTICAL_TEST
  THEORETICAL_TEST
}

enum TestParticipantStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  PASSED
  FAILED
  ABSENT
}

enum DocumentType {
  INVOICE
  QUOTE
  TEST_DOCUMENT
  CERTIFICATE
  ATTENDANCE_RECORD
  TRAINING_MATERIAL
}
```

**Aggiornamento Modelli**:
```prisma
// ❌ PRIMA
model Course {
  status String // Valori liberi
}

// ✅ DOPO
model Course {
  status CourseStatus @default(DRAFT)
}
```

### 4. 🗑️ Uniformazione Soft-Delete

**Strategia Unificata**:
- ✅ **Primario**: `deletedAt DateTime?` per timestamp cancellazione
- ✅ **Secondario**: `isDeleted Boolean` per compatibilità (derivato da `deletedAt`)
- ❌ **Rimuovere**: `eliminato` (sostituito da `isDeleted`)

**Implementazione**:
```prisma
model BaseEntity {
  deletedAt DateTime? @map("deleted_at")
  isDeleted Boolean   @default(false) @map("is_deleted")
  
  // Trigger database per sincronizzare isDeleted con deletedAt
  @@map("base_entity")
}
```

**Query Pattern**:
```javascript
// ✅ Query standard
const activeRecords = await prisma.entity.findMany({
  where: { deletedAt: null }
});

// ✅ Query compatibilità
const activeRecords = await prisma.entity.findMany({
  where: { isDeleted: false }
});
```

### 5. 📊 Aggiunta Indici Ottimizzazione

**Indici da Aggiungere**:
```prisma
model CourseSchedule {
  startDate DateTime @map("start_date")
  status    CourseScheduleStatus
  
  @@index([startDate, status], name: "idx_schedule_date_status")
  @@index([startDate], name: "idx_schedule_start_date")
}

model PersonRole {
  validUntil DateTime? @map("valid_until")
  isActive   Boolean   @default(true) @map("is_active")
  
  @@index([validUntil, isActive], name: "idx_role_validity")
  @@index([isActive], name: "idx_role_active")
}

model ConsentRecord {
  consentType String   @map("consent_type")
  givenAt     DateTime @map("given_at")
  
  @@index([consentType, givenAt], name: "idx_consent_type_date")
  @@index([consentType], name: "idx_consent_type")
}

model Person {
  email     String?
  taxCode   String? @map("tax_code")
  deletedAt DateTime? @map("deleted_at")
  
  @@index([email], name: "idx_person_email")
  @@index([taxCode], name: "idx_person_tax_code")
  @@index([deletedAt], name: "idx_person_deleted")
}
```

### 6. 🔗 Rafforzamento Vincoli Integrità

**FK da Rendere Obbligatorie**:
```prisma
// Valutare caso per caso
model CourseEnrollment {
  companyId String  // Rendere obbligatorio?
  tenantId  String  // Rendere obbligatorio?
  personId  String  // Già obbligatorio ✅
}

model PersonRole {
  companyId String? // Valutare se rendere obbligatorio
  tenantId  String  // Rendere obbligatorio per multi-tenancy
}

model Course {
  trainerId String? // Valutare se rendere obbligatorio
  companyId String  // Già obbligatorio ✅
}
```

**Vincoli di Integrità**:
```prisma
model PersonRole {
  @@unique([personId, roleType, companyId, tenantId], name: "unique_person_role_scope")
}

model CourseEnrollment {
  @@unique([personId, courseId], name: "unique_person_course")
}
```

### 7. 🏷️ Uniformazione Alias Relazioni

**Alias da Standardizzare**:
```prisma
// ❌ PRIMA
model CourseSession {
  trainer   Person @relation("SessionTrainer", fields: [trainerId], references: [id])
  coTrainer Person @relation("SessionCoTrainer", fields: [coTrainerId], references: [id])
}

// ✅ DOPO
model CourseSession {
  trainer   Person @relation("CourseSession_Trainer", fields: [trainerId], references: [id])
  coTrainer Person @relation("CourseSession_CoTrainer", fields: [coTrainerId], references: [id])
}

// Pattern: ModelName_RelationRole
model Course {
  trainer     Person @relation("Course_Trainer", fields: [trainerId], references: [id])
  coordinator Person @relation("Course_Coordinator", fields: [coordinatorId], references: [id])
}
```

### 8. 📄 Gestione Campi JSON

**Rimozione @default("{}") per Compatibilità**:
```prisma
// ❌ PRIMA (problemi PostgreSQL vecchie versioni)
model Role {
  permissions Json @default("{}")
}

// ✅ DOPO (gestione lato codice)
model Role {
  permissions Json?
}
```

**Gestione Lato Codice**:
```javascript
// Service layer
class PersonRoleService {
  async createRole(data) {
    return await prisma.personRole.create({
      data: {
        ...data,
        permissions: data.permissions || {} // Default lato codice
      }
    });
  }
}
```

### 9. 🐍 Coerenza snake_case Database

**Mapping Campi**:
```prisma
model Person {
  firstName     String    @map("first_name")
  lastName      String    @map("last_name")
  taxCode       String?   @map("tax_code")
  birthDate     DateTime? @map("birth_date")
  hiredDate     DateTime? @map("hired_date")
  lastLogin     DateTime? @map("last_login")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")
  
  @@map("persons")
}

model CourseSchedule {
  startDate     DateTime @map("start_date")
  endDate       DateTime @map("end_date")
  maxParticipants Int    @map("max_participants")
  
  @@map("course_schedules")
}
```

### 10. 📋 Separazione Entità Documenti

**Struttura Base con Discriminatore**:
```prisma
model Document {
  id           String      @id @default(cuid())
  documentType DocumentType @map("document_type")
  fileName     String      @map("file_name")
  fileUrl      String      @map("file_url")
  generatedAt  DateTime    @map("generated_at")
  companyId    String      @map("company_id")
  tenantId     String      @map("tenant_id")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")
  deletedAt    DateTime?   @map("deleted_at")
  
  // Relazioni specifiche per tipo
  invoice      Invoice?
  quote        Quote?
  testDocument TestDocument?
  certificate  Certificate?
  
  @@map("documents")
}

model Invoice {
  documentId String   @id @map("document_id")
  document   Document @relation(fields: [documentId], references: [id])
  
  invoiceNumber String   @map("invoice_number")
  amount        Decimal
  dueDate       DateTime @map("due_date")
  
  @@map("invoices")
}

model TestDocument {
  documentId String   @id @map("document_id")
  document   Document @relation(fields: [documentId], references: [id])
  
  testType    TestDocumentType @map("test_type")
  courseId    String           @map("course_id")
  maxScore    Int?             @map("max_score")
  passingScore Int?            @map("passing_score")
  
  @@map("test_documents")
}
```

### 11. 🔐 Gestione Permessi Avanzata

**Struttura Futura PermissionGroup**:
```prisma
model PermissionGroup {
  id          String   @id @default(cuid())
  name        String
  description String?
  permissions PersonPermission[]
  companyId   String   @map("company_id")
  tenantId    String   @map("tenant_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relazioni
  personRoles PersonRole[]
  
  @@unique([name, companyId, tenantId])
  @@map("permission_groups")
}

model PermissionTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  roleType    RoleType @map("role_type")
  permissions PersonPermission[]
  isDefault   Boolean  @default(false) @map("is_default")
  
  @@unique([name, roleType])
  @@map("permission_templates")
}
```

### 12. ⏰ Job Disattivazione Ruoli Scaduti

**Implementazione Job**:
```javascript
// jobs/deactivateExpiredRoles.js
class ExpiredRoleDeactivationJob {
  async execute() {
    const expiredRoles = await prisma.personRole.findMany({
      where: {
        validUntil: { lt: new Date() },
        isActive: true,
        deletedAt: null
      }
    });
    
    for (const role of expiredRoles) {
      await prisma.personRole.update({
        where: { id: role.id },
        data: { 
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'EXPIRED'
        }
      });
      
      // Log audit
      await this.logRoleDeactivation(role);
    }
  }
}
```

### 13. 🔒 Sicurezza Password/Email

**Esclusione Campi Sensibili**:
```javascript
// Prisma select sicuro
const safePersonSelect = {
  id: true,
  firstName: true,
  lastName: true,
  // email: false,    // ❌ Non esporre direttamente
  // password: false, // ❌ Mai esporre
  phone: true,
  isActive: true
};

// Service layer con controllo accesso
class PersonService {
  async getPersonProfile(personId, requesterId) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: {
        ...safePersonSelect,
        // Email solo se richiesta da se stesso o admin
        email: this.canAccessEmail(personId, requesterId)
      }
    });
    
    return person;
  }
}
```

### 14. 📚 Template Corsi

**Modello CourseTemplate**:
```prisma
model CourseTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  duration    Int      // Durata in ore
  category    String
  level       String   // BEGINNER, INTERMEDIATE, ADVANCED
  
  // Struttura template
  modules     CourseModule[]
  materials   CourseMaterial[]
  assessments CourseAssessment[]
  
  // Metadata
  isActive    Boolean  @default(true) @map("is_active")
  companyId   String   @map("company_id")
  tenantId    String   @map("tenant_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")
  
  // Relazione con corsi istanziati
  courses     Course[]
  
  @@map("course_templates")
}

model Course {
  // Campi esistenti...
  
  // Relazione con template
  templateId String?        @map("template_id")
  template   CourseTemplate? @relation(fields: [templateId], references: [id])
}
```

### 15. ⏱️ Uniformazione Timestamp

**Pattern Standard per Tutti i Modelli**:
```prisma
// Mixin base per tutti i modelli
model BaseTimestamps {
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
}

// Applicazione a tutti i modelli
model Person {
  // Campi specifici...
  
  // Timestamp standard
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
}

model Course {
  // Campi specifici...
  
  // Timestamp standard
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
}
```

**Verifica @default(now()) e @updatedAt**:
- ✅ Tutti i modelli devono avere `createdAt` con `@default(now())`
- ✅ Tutti i modelli devono avere `updatedAt` con `@updatedAt`
- ✅ Modelli con soft-delete devono avere `deletedAt DateTime?`

---

## 📋 CHECKLIST REQUISITI AGGIUNTIVI

### Sostituzione Employee → Person
- [ ] Aggiornare tutti i campi `employeeId` → `personId`
- [ ] Aggiornare tutte le relazioni `employee` → `person`
- [ ] Verificare CourseEnrollment, Attestato, RegistroPresenzePartecipante
- [ ] Aggiornare TestPartecipante, PreventivoPartecipante
- [ ] Testare tutte le query e relazioni

### Rinominazione Campi Legacy
- [ ] `eliminato` → `isDeleted` (mantenere coerenza con `deletedAt`)
- [ ] `nomeFile` → `fileName`
- [ ] `url` → `fileUrl`
- [ ] `dataGenerazione` → `generatedAt`
- [ ] `telefono` → `phone`
- [ ] Aggiungere `@map()` per compatibilità database

### Enum Dedicati
- [ ] Creare `CourseStatus` enum
- [ ] Creare `CourseScheduleStatus` enum
- [ ] Creare `TestDocumentType` enum
- [ ] Creare `TestParticipantStatus` enum
- [ ] Sostituire String liberi con enum

### Soft-Delete Uniforme
- [ ] Standardizzare su `deletedAt DateTime?`
- [ ] Mantenere `isDeleted Boolean` per compatibilità
- [ ] Rimuovere `eliminato` sostituendolo con `isDeleted`
- [ ] Sincronizzare `isDeleted` con `deletedAt` via trigger

### Indici Ottimizzazione
- [ ] Aggiungere indici su `CourseSchedule.startDate, status`
- [ ] Aggiungere indici su `PersonRole.validUntil, isActive`
- [ ] Aggiungere indici su `ConsentRecord.consentType, givenAt`
- [ ] Aggiungere indici su campi di ricerca frequente

### Vincoli Integrità
- [ ] Valutare FK obbligatorie (companyId, tenantId, trainerId)
- [ ] Aggiungere vincoli unique appropriati
- [ ] Verificare integrità referenziale

### Alias Relazioni
- [ ] Standardizzare pattern `ModelName_RelationRole`
- [ ] Aggiornare `@relation("SessionTrainer")` → `@relation("CourseSession_Trainer")`
- [ ] Verificare tutte le relazioni Person multiple

### Campi JSON
- [ ] Rimuovere `@default("{}")` dai campi Json
- [ ] Gestire default JSON lato codice
- [ ] Testare compatibilità PostgreSQL

### Snake_case Database
- [ ] Aggiungere `@map()` per tutti i campi camelCase
- [ ] Verificare nomi tabelle con `@@map()`
- [ ] Mantenere coerenza snake_case nel database

### Separazione Documenti
- [ ] Creare modello `Document` base
- [ ] Implementare discriminatore `documentType`
- [ ] Separare Invoice, Quote, TestDocument, Certificate
- [ ] Migrare dati esistenti

### Gestione Permessi
- [ ] Progettare `PermissionGroup` per futuro
- [ ] Progettare `PermissionTemplate` per futuro
- [ ] Evitare duplicazione permessi

### Job Ruoli Scaduti
- [ ] Implementare job disattivazione automatica
- [ ] Usare `PersonRole.validUntil` e `isActive`
- [ ] Aggiungere logging audit

### Sicurezza Password/Email
- [ ] Verificare che password non sia mai esposta
- [ ] Controllare esposizione email nelle API
- [ ] Implementare controlli accesso granulari

### Template Corsi
- [ ] Valutare necessità `CourseTemplate`
- [ ] Progettare struttura template
- [ ] Implementare se necessario

### Timestamp Uniformi
- [ ] Verificare `createdAt`, `updatedAt`, `deletedAt` su tutti i modelli
- [ ] Aggiungere `@default(now())` e `@updatedAt` dove mancanti
- [ ] Standardizzare pattern timestamp

---

**⚠️ IMPORTANTE**: Ogni step deve essere testato in ambiente di sviluppo prima dell'implementazione. La conformità GDPR deve essere verificata continuamente durante tutto il processo. I test esistenti non devono essere aggiornati in quanto verranno eliminati dopo il refactoring.