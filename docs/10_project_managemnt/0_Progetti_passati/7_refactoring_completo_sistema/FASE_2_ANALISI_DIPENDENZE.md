# FASE 2: ANALISI DETTAGLIATA DELLE DIPENDENZE

## Data: 19 Dicembre 2024
## Status: IN CORSO

---

## 🎯 OBIETTIVO
Analizzare tutte le dipendenze e relazioni tra User, Employee e Person per pianificare la migrazione sicura verso un'entità Person unificata.

---

## 📊 MAPPATURA ENTITÀ ATTUALI

### 1. ENTITÀ USER
```prisma
model User {
  id                    String             @id @default(uuid())
  username              String             @unique
  email                 String             @unique
  password              String
  firstName             String?
  lastName              String?
  isActive              Boolean            @default(true)
  lastLogin             DateTime?
  profileImage          String?
  failedAttempts        Int                @default(0)
  lockedUntil           DateTime?
  companyId             String?
  tenantId              String?
  globalRole            String?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
  eliminato             Boolean            @default(false)  // ⚠️ SOFT DELETE
}
```

**Relazioni User:**
- `activityLogs: ActivityLog[]`
- `consentRecords: ConsentRecord[]`
- `gdprAuditLogs: GdprAuditLog[]`
- `company: Company?`
- `tenant: Tenant?`
- `assignedRoles: UserRole[]` (come assegnatore)
- `userRoles: UserRole[]` (come utente)
- `userSessions: UserSession[]`
- `assignedEnhancedRoles: EnhancedUserRole[]` (come assegnatore)
- `enhancedRoles: EnhancedUserRole[]`

### 2. ENTITÀ EMPLOYEE
```prisma
model Employee {
  id                           String                         @id @default(uuid())
  first_name                   String
  last_name                    String
  email                        String?
  phone                        String?
  title                        String?
  status                       String?
  hired_date                   DateTime?
  companyId                    String?
  created_at                   DateTime                       @default(now())
  updated_at                   DateTime                       @updatedAt
  birth_date                   DateTime?
  codice_fiscale               String                         @unique
  notes                        String?
  postal_code                  String?
  province                     String?
  residence_address            String?
  residence_city               String?
  photo_url                    String?
  eliminato                    Boolean                        @default(false)  // ⚠️ SOFT DELETE
}
```

**Relazioni Employee:**
- `attestati: Attestato[]`
- `enrollments: CourseEnrollment[]`
- `company: Company?`
- `preventivoPartecipante: PreventivoPartecipante[]`
- `registroPresenzePartecipante: RegistroPresenzePartecipante[]`
- `testPartecipante: TestPartecipante[]`

### 3. ENTITÀ PERSON (TARGET)
```prisma
model Person {
  id                 String           @id @default(uuid())
  firstName          String           @db.VarChar(100)
  lastName           String           @db.VarChar(100)
  email              String           @unique @db.VarChar(255)
  phone              String?          @db.VarChar(20)
  birthDate          DateTime?        @db.Date
  taxCode            String?          @unique @db.VarChar(16)
  vatNumber          String?          @db.VarChar(11)
  residenceAddress   String?          @db.VarChar(255)
  residenceCity      String?          @db.VarChar(100)
  postalCode         String?          @db.VarChar(10)
  province           String?          @db.VarChar(2)
  username           String?          @unique @db.VarChar(50)
  password           String?          @db.VarChar(255)
  isActive           Boolean          @default(true)
  status             PersonStatus     @default(ACTIVE)
  title              String?          @db.VarChar(100)
  hiredDate          DateTime?        @db.Date
  hourlyRate         Decimal?         @db.Decimal(10, 2)
  iban               String?          @db.VarChar(34)
  registerCode       String?          @db.VarChar(50)
  certifications     String[]
  specialties        String[]
  profileImage       String?          @db.VarChar(500)
  notes              String?
  lastLogin          DateTime?        @db.Timestamp(6)
  failedAttempts     Int              @default(0) @db.SmallInt
  lockedUntil        DateTime?        @db.Timestamp(6)
  globalRole         String?          @db.VarChar(50)
  tenantId           String?
  companyId          String?
  createdAt          DateTime         @default(now()) @db.Timestamp(6)
  updatedAt          DateTime         @updatedAt @db.Timestamp(6)
  deletedAt          DateTime?        @db.Timestamp(6)  // ⚠️ SOFT DELETE
  isDeleted          Boolean          @default(false)   // ⚠️ SOFT DELETE
  gdprConsentDate    DateTime?        @db.Timestamp(6)
  gdprConsentVersion String?          @db.VarChar(10)
  dataRetentionUntil DateTime?        @db.Date
}
```

**Relazioni Person:**
- `assignedRoles: PersonRole[]` (come assegnatore)
- `personRoles: PersonRole[]`
- `company: Company?`
- `tenant: Tenant?`
- `grantedPermissions: RolePermission[]`
- `schedules: CourseSchedule[]` (come trainer)
- `sessionsAsTrainer: CourseSession[]`
- `sessionsAsCoTrainer: CourseSession[]`
- `registriPresenze: RegistroPresenze[]`
- `testDocuments: TestDocument[]`
- `lettereIncarico: LetteraIncarico[]`
- `refreshTokens: RefreshToken[]`

---

## 🔗 ANALISI SISTEMA RUOLI DUPLICATO

### Sistema UserRole (da eliminare)
```prisma
model UserRole {
  id         String    @id @default(uuid())
  userId     String
  roleId     String
  assignedAt DateTime  @default(now())
  assignedBy String?
  isActive   Boolean   @default(true)
  expiresAt  DateTime?
  eliminato  Boolean   @default(false)
  assigner   User?     @relation("AssignedBy", fields: [assignedBy], references: [id])
  role       Role      @relation(fields: [roleId], references: [id], onDelete: Cascade)
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Sistema PersonRole (da mantenere)
```prisma
model PersonRole {
  id               String           @id @default(uuid())
  personId         String
  roleType         RoleType         // ⚠️ Usa enum, non relazione
  isActive         Boolean          @default(true)
  isPrimary        Boolean          @default(false)
  assignedAt       DateTime         @default(now())
  assignedBy       String?
  validFrom        DateTime         @default(now())
  validUntil       DateTime?
  companyId        String?
  tenantId         String?
  departmentId     String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  assignedByPerson Person?          @relation("AssignedRoles", fields: [assignedBy], references: [id])
  company          Company?         @relation(fields: [companyId], references: [id])
  person           Person           @relation(fields: [personId], references: [id], onDelete: Cascade)
  tenant           Tenant?          @relation(fields: [tenantId], references: [id])
  permissions      RolePermission[]
}
```

---

## ⚠️ PROBLEMI IDENTIFICATI

### 1. SOFT DELETE INCONSISTENTE
- **User**: `eliminato: Boolean`
- **Employee**: `eliminato: Boolean`
- **Person**: `deletedAt: DateTime?` + `isDeleted: Boolean`

### 2. DUPLICAZIONE CAMPI
- **Nome**: `firstName/lastName` vs `first_name/last_name`
- **Email**: tutti hanno email ma con vincoli diversi
- **Telefono**: `phone` in tutti
- **Azienda**: `companyId` in tutti
- **Tenant**: `tenantId` in User e Person

### 3. SISTEMA RUOLI DUPLICATO
- **UserRole** usa `Role` (con permissions JSON)
- **PersonRole** usa `RoleType` enum + `RolePermission`

---

## 📋 PIANO MIGRAZIONE DATI

### STEP 1: Preparazione Schema
1. ✅ Backup database completato
2. ⏳ Analisi dipendenze in corso
3. ⏳ Creazione script migrazione

### STEP 2: Migrazione User → Person
1. Mappare campi User → Person
2. Migrare UserRole → PersonRole
3. Aggiornare relazioni dipendenti
4. Verificare integrità dati

### STEP 3: Migrazione Employee → Person
1. Mappare campi Employee → Person
2. Aggiornare relazioni dipendenti
3. Verificare integrità dati

### STEP 4: Cleanup
1. Rimuovere tabelle User e Employee
2. Rimuovere UserRole
3. Aggiornare codice applicativo

---

## 🎯 PROSSIMI PASSI

1. **Analizzare relazioni dipendenti** - Mappare tutte le FK
2. **Creare script migrazione SQL** - Per trasferimento dati
3. **Pianificare aggiornamenti codice** - Controller, service, etc.
4. **Definire strategia rollback** - In caso di problemi

---

## 📊 METRICHE ATTUALI
- **User attivi**: 1
- **Employee attivi**: 0
- **Person attivi**: 6
- **PersonRole attivi**: 10
- **UserRole attivi**: 0

---

**Ultimo aggiornamento**: 19 Dicembre 2024, 19:15
**Prossima fase**: Creazione script migrazione SQL