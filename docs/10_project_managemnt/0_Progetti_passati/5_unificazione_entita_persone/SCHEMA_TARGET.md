# Schema Target: Entità Person Unificata

## 🎯 Obiettivo Schema

Creare un nuovo schema Prisma che unifichi le entità `Employee`, `Trainer` e `User` in un'unica entità `Person` con sistema di ruoli flessibile e conformità GDPR.

## 📋 Schema Prisma Completo

### 1. Entità Person Principale

```prisma
model Person {
  id                    String              @id @default(uuid())
  
  // === CAMPI BASE PERSONA ===
  firstName             String              @db.VarChar(100)
  lastName              String              @db.VarChar(100)
  email                 String              @unique @db.VarChar(255)
  phone                 String?             @db.VarChar(20)
  
  // === CAMPI ANAGRAFICI ===
  birthDate             DateTime?           @db.Date
  taxCode               String?             @unique @db.VarChar(16) // ex codice_fiscale
  vatNumber             String?             @db.VarChar(11) // per formatori con P.IVA
  
  // === INDIRIZZO ===
  residenceAddress      String?             @db.VarChar(255)
  residenceCity         String?             @db.VarChar(100)
  postalCode            String?             @db.VarChar(10)
  province              String?             @db.VarChar(2)
  
  // === CAMPI SISTEMA AUTENTICAZIONE ===
  username              String?             @unique @db.VarChar(50) // solo per utenti sistema
  password              String?             @db.VarChar(255) // hash bcrypt, solo per utenti sistema
  isActive              Boolean             @default(true)
  status                PersonStatus        @default(ACTIVE)
  
  // === CAMPI PROFESSIONALI ===
  title                 String?             @db.VarChar(100) // titolo/posizione
  hiredDate             DateTime?           @db.Date // data assunzione dipendenti
  hourlyRate            Decimal?            @db.Decimal(10,2) // tariffa oraria formatori
  iban                  String?             @db.VarChar(34) // per pagamenti formatori
  registerCode          String?             @db.VarChar(50) // codice registro formatori
  certifications        String[]            // certificazioni formatori
  specialties           String[]            // specializzazioni formatori
  
  // === CAMPI SISTEMA AVANZATI ===
  profileImage          String?             @db.VarChar(500) // URL immagine profilo
  notes                 String?             @db.Text // note generiche
  lastLogin             DateTime?           @db.Timestamp
  failedAttempts        Int                 @default(0) @db.SmallInt
  lockedUntil           DateTime?           @db.Timestamp
  globalRole            String?             @db.VarChar(50) // ruolo globale sistema (legacy)
  
  // === MULTI-TENANT ===
  tenantId              String?             @db.Uuid
  companyId             String?             @db.Uuid
  
  // === AUDIT E GDPR ===
  createdAt             DateTime            @default(now()) @db.Timestamp
  updatedAt             DateTime            @updatedAt @db.Timestamp
  deletedAt             DateTime?           @db.Timestamp // soft delete
  isDeleted             Boolean             @default(false)
  gdprConsentDate       DateTime?           @db.Timestamp // consenso GDPR
  gdprConsentVersion    String?             @db.VarChar(10) // versione consenso
  dataRetentionUntil    DateTime?           @db.Date // data limite conservazione
  
  // === RELAZIONI ===
  company               Company?            @relation(fields: [companyId], references: [id], onDelete: SetNull)
  tenant                Tenant?             @relation(fields: [tenantId], references: [id], onDelete: SetNull)
  
  // === RUOLI E PERMESSI ===
  personRoles           PersonRole[]
  
  // === RELAZIONI BUSINESS (EX EMPLOYEE) ===
  courseEnrollments     CourseEnrollment[]  @relation("PersonEnrollments")
  attestati             Attestato[]         @relation("PersonAttestati")
  registriPresenze      RegistroPresenzePartecipante[] @relation("PersonPresenze")
  preventiviPartecipante PreventivoPartecipante[] @relation("PersonPreventivi")
  testPartecipanti      TestPartecipante[]  @relation("PersonTests")
  
  // === RELAZIONI FORMATORE (EX TRAINER) ===
  courseSchedules       CourseSchedule[]    @relation("TrainerSchedules")
  courseSessions        CourseSession[]     @relation("TrainerSessions")
  lettereIncarico       LetteraIncarico[]   @relation("TrainerLettere")
  
  // === RELAZIONI SISTEMA (EX USER) ===
  activityLogs          ActivityLog[]       @relation("PersonActivityLogs")
  refreshTokens         RefreshToken[]      @relation("PersonTokens")
  gdprAuditLogs         GdprAuditLog[]      @relation("PersonGdprLogs")
  consentRecords        ConsentRecord[]     @relation("PersonConsents")
  userSessions          UserSession[]       @relation("PersonSessions")
  
  // === RELAZIONI AUDIT ===
  createdActivityLogs   ActivityLog[]       @relation("CreatedByPerson")
  updatedActivityLogs   ActivityLog[]       @relation("UpdatedByPerson")
  
  @@map("persons")
  @@index([email])
  @@index([username])
  @@index([taxCode])
  @@index([companyId])
  @@index([tenantId])
  @@index([isDeleted, isActive])
  @@index([createdAt])
}
```

### 2. Enum PersonStatus

```prisma
enum PersonStatus {
  ACTIVE      // Attivo
  INACTIVE    // Inattivo
  SUSPENDED   // Sospeso
  TERMINATED  // Licenziato/Cessato
  PENDING     // In attesa di attivazione
  
  @@map("person_status")
}
```

### 3. Sistema Ruoli Avanzato

```prisma
model PersonRole {
  id              String          @id @default(uuid())
  personId        String          @db.Uuid
  roleType        RoleType
  isActive        Boolean         @default(true)
  isPrimary       Boolean         @default(false) // ruolo principale
  
  // === VALIDITÀ RUOLO ===
  assignedAt      DateTime        @default(now()) @db.Timestamp
  assignedBy      String?         @db.Uuid // chi ha assegnato il ruolo
  validFrom       DateTime        @default(now()) @db.Date
  validUntil      DateTime?       @db.Date // scadenza ruolo
  
  // === CONTESTO RUOLO ===
  companyId       String?         @db.Uuid // ruolo specifico per azienda
  tenantId        String?         @db.Uuid // ruolo specifico per tenant
  departmentId    String?         @db.Uuid // ruolo specifico per dipartimento
  
  // === PERMESSI SPECIFICI ===
  permissions     RolePermission[]
  
  // === AUDIT ===
  createdAt       DateTime        @default(now()) @db.Timestamp
  updatedAt       DateTime        @updatedAt @db.Timestamp
  
  // === RELAZIONI ===
  person          Person          @relation(fields: [personId], references: [id], onDelete: Cascade)
  assignedByPerson Person?        @relation("AssignedRoles", fields: [assignedBy], references: [id])
  company         Company?        @relation(fields: [companyId], references: [id])
  tenant          Tenant?         @relation(fields: [tenantId], references: [id])
  
  @@unique([personId, roleType, companyId, tenantId])
  @@map("person_roles")
  @@index([personId, isActive])
  @@index([roleType])
  @@index([companyId])
  @@index([tenantId])
}
```

### 4. Enum RoleType

```prisma
enum RoleType {
  // === RUOLI DIPENDENTI ===
  EMPLOYEE            // Dipendente generico
  MANAGER             // Manager/Responsabile
  HR_MANAGER          // Responsabile HR
  DEPARTMENT_HEAD     // Capo Dipartimento
  
  // === RUOLI FORMATORI ===
  TRAINER             // Formatore generico
  SENIOR_TRAINER      // Formatore senior
  TRAINER_COORDINATOR // Coordinatore formatori
  EXTERNAL_TRAINER    // Formatore esterno
  
  // === RUOLI SISTEMA ===
  SUPER_ADMIN         // Super amministratore
  ADMIN               // Amministratore
  COMPANY_ADMIN       // Amministratore aziendale
  TENANT_ADMIN        // Amministratore tenant
  
  // === RUOLI OPERATIVI ===
  VIEWER              // Solo visualizzazione
  OPERATOR            // Operatore
  COORDINATOR         // Coordinatore
  SUPERVISOR          // Supervisore
  
  // === RUOLI SPECIALI ===
  GUEST               // Ospite temporaneo
  CONSULTANT          // Consulente
  AUDITOR             // Auditor
  
  @@map("role_types")
}
```

### 5. Sistema Permessi Granulari

```prisma
model RolePermission {
  id              String          @id @default(uuid())
  personRoleId    String          @db.Uuid
  permission      Permission
  isGranted       Boolean         @default(true)
  grantedAt       DateTime        @default(now()) @db.Timestamp
  grantedBy       String?         @db.Uuid
  
  // === RELAZIONI ===
  personRole      PersonRole      @relation(fields: [personRoleId], references: [id], onDelete: Cascade)
  grantedByPerson Person?         @relation("GrantedPermissions", fields: [grantedBy], references: [id])
  
  @@unique([personRoleId, permission])
  @@map("role_permissions")
}
```

### 6. Enum Permission

```prisma
enum Permission {
  // === GESTIONE PERSONE ===
  VIEW_EMPLOYEES
  CREATE_EMPLOYEES
  EDIT_EMPLOYEES
  DELETE_EMPLOYEES
  
  VIEW_TRAINERS
  CREATE_TRAINERS
  EDIT_TRAINERS
  DELETE_TRAINERS
  
  VIEW_USERS
  CREATE_USERS
  EDIT_USERS
  DELETE_USERS
  
  // === GESTIONE CORSI ===
  VIEW_COURSES
  CREATE_COURSES
  EDIT_COURSES
  DELETE_COURSES
  MANAGE_ENROLLMENTS
  
  // === GESTIONE DOCUMENTI ===
  VIEW_DOCUMENTS
  CREATE_DOCUMENTS
  EDIT_DOCUMENTS
  DELETE_DOCUMENTS
  DOWNLOAD_DOCUMENTS
  
  // === GESTIONE SISTEMA ===
  ADMIN_PANEL
  SYSTEM_SETTINGS
  USER_MANAGEMENT
  ROLE_MANAGEMENT
  TENANT_MANAGEMENT
  
  // === GDPR ===
  VIEW_GDPR_DATA
  EXPORT_GDPR_DATA
  DELETE_GDPR_DATA
  MANAGE_CONSENTS
  
  // === REPORTING ===
  VIEW_REPORTS
  CREATE_REPORTS
  EXPORT_REPORTS
  
  @@map("permissions")
}
```

### 7. Tabella di Migrazione

```prisma
model MigrationLog {
  id              String          @id @default(uuid())
  entityType      MigrationEntity // tipo entità migrata
  oldId           String          @db.Uuid // ID originale
  newPersonId     String          @db.Uuid // Nuovo ID Person
  migrationDate   DateTime        @default(now()) @db.Timestamp
  status          MigrationStatus
  errors          String[]        // eventuali errori
  metadata        Json?           // dati aggiuntivi migrazione
  
  // === RELAZIONI ===
  person          Person          @relation("MigratedPersons", fields: [newPersonId], references: [id])
  
  @@map("migration_logs")
  @@index([entityType, status])
  @@index([migrationDate])
}

enum MigrationEntity {
  EMPLOYEE
  TRAINER
  USER
  
  @@map("migration_entities")
}

enum MigrationStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  ROLLED_BACK
  
  @@map("migration_statuses")
}
```

### 8. GDPR e Audit Migliorati

```prisma
model GdprConsentRecord {
  id                String          @id @default(uuid())
  personId          String          @db.Uuid
  consentType       ConsentType
  isGranted         Boolean
  consentDate       DateTime        @default(now()) @db.Timestamp
  consentVersion    String          @db.VarChar(10)
  ipAddress         String?         @db.VarChar(45)
  userAgent         String?         @db.Text
  withdrawnDate     DateTime?       @db.Timestamp
  withdrawnReason   String?         @db.Text
  
  // === RELAZIONI ===
  person            Person          @relation("PersonGdprConsents", fields: [personId], references: [id], onDelete: Cascade)
  
  @@map("gdpr_consent_records")
  @@index([personId, consentType])
  @@index([consentDate])
}

enum ConsentType {
  DATA_PROCESSING    // Trattamento dati personali
  MARKETING         // Marketing e comunicazioni
  PROFILING         // Profilazione
  THIRD_PARTY       // Condivisione con terze parti
  COOKIES           // Cookie non essenziali
  
  @@map("consent_types")
}

model PersonAuditLog {
  id              String          @id @default(uuid())
  personId        String          @db.Uuid
  action          AuditAction
  tableName       String          @db.VarChar(50)
  recordId        String?         @db.Uuid
  oldValues       Json?
  newValues       Json?
  changedFields   String[]
  performedBy     String?         @db.Uuid
  performedAt     DateTime        @default(now()) @db.Timestamp
  ipAddress       String?         @db.VarChar(45)
  userAgent       String?         @db.Text
  reason          String?         @db.Text
  
  // === RELAZIONI ===
  person          Person          @relation("PersonAudits", fields: [personId], references: [id], onDelete: Cascade)
  performedByPerson Person?       @relation("PerformedAudits", fields: [performedBy], references: [id])
  
  @@map("person_audit_logs")
  @@index([personId, performedAt])
  @@index([action])
  @@index([tableName, recordId])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  VIEW
  EXPORT
  LOGIN
  LOGOUT
  PASSWORD_CHANGE
  ROLE_ASSIGN
  ROLE_REVOKE
  CONSENT_GRANT
  CONSENT_WITHDRAW
  
  @@map("audit_actions")
}
```

### 9. Aggiornamento Relazioni Esistenti

```prisma
// === AGGIORNAMENTO COURSE ENROLLMENT ===
model CourseEnrollment {
  id                String          @id @default(uuid())
  courseId          String          @db.Uuid
  personId          String          @db.Uuid // era employeeId
  enrollmentDate    DateTime        @default(now()) @db.Timestamp
  status            String          @default("enrolled") @db.VarChar(20)
  completionDate    DateTime?       @db.Timestamp
  certificateIssued Boolean         @default(false)
  notes             String?         @db.Text
  createdAt         DateTime        @default(now()) @db.Timestamp
  updatedAt         DateTime        @updatedAt @db.Timestamp
  
  // === RELAZIONI AGGIORNATE ===
  course            Course          @relation(fields: [courseId], references: [id], onDelete: Cascade)
  person            Person          @relation("PersonEnrollments", fields: [personId], references: [id], onDelete: Cascade)
  
  @@unique([courseId, personId])
  @@map("course_enrollments")
}

// === AGGIORNAMENTO COURSE SCHEDULE ===
model CourseSchedule {
  id              String          @id @default(uuid())
  courseId        String          @db.Uuid
  trainerId       String          @db.Uuid // ora punta a Person
  startDate       DateTime        @db.Timestamp
  endDate         DateTime        @db.Timestamp
  location        String?         @db.VarChar(255)
  maxParticipants Int?            @db.SmallInt
  status          String          @default("scheduled") @db.VarChar(20)
  notes           String?         @db.Text
  createdAt       DateTime        @default(now()) @db.Timestamp
  updatedAt       DateTime        @updatedAt @db.Timestamp
  
  // === RELAZIONI AGGIORNATE ===
  course          Course          @relation(fields: [courseId], references: [id], onDelete: Cascade)
  trainer         Person          @relation("TrainerSchedules", fields: [trainerId], references: [id], onDelete: Restrict)
  sessions        CourseSession[]
  
  @@map("course_schedules")
}

// === AGGIORNAMENTO ATTESTATO ===
model Attestato {
  id                String          @id @default(uuid())
  personId          String          @db.Uuid // era employeeId
  courseId          String          @db.Uuid
  numeroAttestate   String          @unique @db.VarChar(50)
  dataRilascio      DateTime        @db.Date
  dataScadenza      DateTime?       @db.Date
  filePath          String?         @db.VarChar(500)
  status            String          @default("valid") @db.VarChar(20)
  note              String?         @db.Text
  createdAt         DateTime        @default(now()) @db.Timestamp
  updatedAt         DateTime        @updatedAt @db.Timestamp
  
  // === RELAZIONI AGGIORNATE ===
  person            Person          @relation("PersonAttestati", fields: [personId], references: [id], onDelete: Cascade)
  course            Course          @relation(fields: [courseId], references: [id], onDelete: Restrict)
  
  @@map("attestati")
}
```

## 📊 Mapping Campi Migrazione

### Employee → Person

| Campo Employee | Campo Person | Note |
|---|---|---|
| `id` | `id` | Nuovo UUID |
| `first_name` | `firstName` | |
| `last_name` | `lastName` | |
| `email` | `email` | |
| `phone` | `phone` | |
| `title` | `title` | |
| `status` | `status` | Enum mapping |
| `hired_date` | `hiredDate` | |
| `birth_date` | `birthDate` | |
| `codice_fiscale` | `taxCode` | |
| `notes` | `notes` | |
| `postal_code` | `postalCode` | |
| `province` | `province` | |
| `residence_address` | `residenceAddress` | |
| `residence_city` | `residenceCity` | |
| `photo_url` | `profileImage` | |
| `companyId` | `companyId` | |
| `created_at` | `createdAt` | |
| `updated_at` | `updatedAt` | |
| `eliminato` | `isDeleted` | |

### Trainer → Person

| Campo Trainer | Campo Person | Note |
|---|---|---|
| `id` | `id` | Nuovo UUID |
| `first_name` | `firstName` | |
| `last_name` | `lastName` | |
| `email` | `email` | |
| `phone` | `phone` | |
| `status` | `status` | Enum mapping |
| `birth_date` | `birthDate` | |
| `certifications` | `certifications` | Array |
| `iban` | `iban` | |
| `notes` | `notes` | |
| `postal_code` | `postalCode` | |
| `province` | `province` | |
| `register_code` | `registerCode` | |
| `residence_address` | `residenceAddress` | |
| `residence_city` | `residenceCity` | |
| `tax_code` | `taxCode` | |
| `vat_number` | `vatNumber` | |
| `specialties` | `specialties` | Array |
| `tariffa_oraria` | `hourlyRate` | |
| `tenantId` | `tenantId` | |
| `created_at` | `createdAt` | |
| `updated_at` | `updatedAt` | |
| `eliminato` | `isDeleted` | |

### User → Person

| Campo User | Campo Person | Note |
|---|---|---|
| `id` | `id` | Nuovo UUID |
| `username` | `username` | |
| `email` | `email` | |
| `password` | `password` | |
| `firstName` | `firstName` | |
| `lastName` | `lastName` | |
| `isActive` | `isActive` | |
| `lastLogin` | `lastLogin` | |
| `profileImage` | `profileImage` | |
| `failedAttempts` | `failedAttempts` | |
| `lockedUntil` | `lockedUntil` | |
| `companyId` | `companyId` | |
| `tenantId` | `tenantId` | |
| `globalRole` | `globalRole` | Legacy |
| `createdAt` | `createdAt` | |
| `updatedAt` | `updatedAt` | |
| `eliminato` | `isDeleted` | |

## 🔄 Mapping Ruoli

### Ruoli Automatici per Migrazione

| Entità Origine | RoleType Assegnato | Condizioni |
|---|---|---|
| Employee | `EMPLOYEE` | Sempre |
| Trainer | `TRAINER` | Sempre |
| User (admin) | `ADMIN` | Se globalRole = 'admin' |
| User (company_admin) | `COMPANY_ADMIN` | Se globalRole = 'company_admin' |
| User (manager) | `MANAGER` | Se globalRole = 'manager' |
| User (altro) | `VIEWER` | Default |

## 📋 Indici Database

### Indici Performance

```sql
-- Indici principali Person
CREATE INDEX idx_persons_email ON persons(email);
CREATE INDEX idx_persons_username ON persons(username);
CREATE INDEX idx_persons_tax_code ON persons(tax_code);
CREATE INDEX idx_persons_company_tenant ON persons(company_id, tenant_id);
CREATE INDEX idx_persons_active_deleted ON persons(is_active, is_deleted);
CREATE INDEX idx_persons_created_at ON persons(created_at);

-- Indici PersonRole
CREATE INDEX idx_person_roles_person_active ON person_roles(person_id, is_active);
CREATE INDEX idx_person_roles_type ON person_roles(role_type);
CREATE INDEX idx_person_roles_company ON person_roles(company_id);
CREATE INDEX idx_person_roles_tenant ON person_roles(tenant_id);

-- Indici GDPR
CREATE INDEX idx_gdpr_consent_person_type ON gdpr_consent_records(person_id, consent_type);
CREATE INDEX idx_person_audit_person_date ON person_audit_logs(person_id, performed_at);
```

## 🚀 Vantaggi Schema Target

### 1. Unificazione
- ✅ **Singola entità** per tutte le persone
- ✅ **Eliminazione duplicazioni** di codice
- ✅ **Gestione centralizzata** dei dati anagrafici

### 2. Flessibilità Ruoli
- ✅ **Ruoli multipli** per persona
- ✅ **Ruoli temporali** con scadenza
- ✅ **Ruoli contestuali** (per azienda/tenant)
- ✅ **Permessi granulari**

### 3. Conformità GDPR
- ✅ **Consensi tracciati** per tipo
- ✅ **Audit completo** delle operazioni
- ✅ **Soft delete** con data retention
- ✅ **Export dati** semplificato

### 4. Performance
- ✅ **Indici ottimizzati** per query comuni
- ✅ **Meno JOIN** nelle query
- ✅ **Caching migliorato**

### 5. Manutenibilità
- ✅ **Codice più pulito**
- ✅ **API unificate**
- ✅ **Test semplificati**
- ✅ **Documentazione centralizzata**

---

**Versione Schema**: 2.0
**Data Creazione**: $(date +%Y-%m-%d)
**Compatibilità**: Prisma 5.x+
**Database**: PostgreSQL 14+