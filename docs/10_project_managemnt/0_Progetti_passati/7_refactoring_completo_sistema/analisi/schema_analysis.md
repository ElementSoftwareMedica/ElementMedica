# 🗄️ ANALISI SCHEMA PRISMA - Stato Attuale

## 📊 Overview Problematiche

### 🚨 PROBLEMI CRITICI IDENTIFICATI

1. **Entità Duplicate**: User, Employee, Person (3 entità sovrapposte)
2. **Soft Delete Inconsistente**: eliminato, deletedAt, isDeleted (3 approcci diversi)
3. **Sistema Ruoli Duplicato**: Role vs PersonRole/RoleType
4. **Relazioni Frammentate**: Alcune puntano a User, altre a Person

---

## 👤 ANALISI ENTITÀ PERSONE

### Model User (Linee 302-325)
```prisma
model User {
  id            String   @id @default(cuid())
  username      String   @unique
  email         String   @unique
  password      String
  firstName     String?
  lastName      String?
  isActive      Boolean  @default(true)
  lastLogin     DateTime?
  globalRole    String?
  companyId     String?
  tenantId      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  eliminato     Boolean  @default(false)  // ❌ PROBLEMA: Soft delete
  
  // Relazioni
  company       Company?     @relation(fields: [companyId], references: [id])
  tenant        Tenant?      @relation(fields: [tenantId], references: [id])
  refreshTokens RefreshToken[]
  userRoles     UserRole[]
  activityLogs  ActivityLog[]
  userSessions  UserSession[]
  consentRecords ConsentRecord[]
  gdprAuditLogs GdprAuditLog[]
}
```

**Problemi**:
- ❌ Campo `eliminato` invece di `deletedAt`
- ❌ Relazioni duplicate con Person
- ❌ `globalRole` come String invece di Enum

### Model Employee (Linee 37-65)
```prisma
model Employee {
  id                String    @id @default(cuid())
  first_name        String
  last_name         String
  email             String    @unique
  phone             String?
  birth_date        DateTime?
  codice_fiscale    String?   @unique
  residence_address String?
  residence_city    String?
  postal_code       String?
  province          String?
  title             String?
  hired_date        DateTime?
  companyId         String
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  eliminato         Boolean   @default(false)  // ❌ PROBLEMA: Soft delete
  
  // Relazioni
  company           Company   @relation(fields: [companyId], references: [id])
  enrollments       CourseEnrollment[]
  attestati         Attestato[] @relation("PartecipanteAttestato")
  preventivi        PreventivoPartecipante[]
  presenze          RegistroPresenzePartecipante[]
  tests             TestPartecipante[]
}
```

**Problemi**:
- ❌ Campo `eliminato` invece di `deletedAt`
- ❌ Naming inconsistente (`first_name` vs `firstName`)
- ❌ Sovrapposizione funzionale con Person

### Model Person (Linee 475-540) ✅ TARGET
```prisma
model Person {
  id                String     @id @default(cuid())
  firstName         String
  lastName          String
  email             String     @unique
  username          String?    @unique
  password          String?
  phone             String?
  birthDate         DateTime?
  taxCode           String?    @unique
  residenceAddress  String?
  residenceCity     String?
  postalCode        String?
  province          String?
  title             String?
  hiredDate         DateTime?
  isActive          Boolean    @default(true)
  lastLogin         DateTime?
  globalRole        String?
  companyId         String?
  tenantId          String?
  deletedAt         DateTime?  // ✅ CORRETTO: Soft delete
  isDeleted         Boolean    @default(false)  // ❌ DUPLICATO
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  
  // Relazioni ✅ CORRETTE
  company           Company?   @relation(fields: [companyId], references: [id])
  tenant            Tenant?    @relation(fields: [tenantId], references: [id])
  refreshTokens     RefreshToken[]
  personRoles       PersonRole[]
  consentRecords    ConsentRecord[]
  gdprAuditLogs     GdprAuditLog[]
}
```

**Stato**:
- ✅ Schema completo e ben strutturato
- ❌ Campo `isDeleted` ridondante (da rimuovere)
- ✅ Relazioni moderne e corrette

---

## 🔐 ANALISI SISTEMA RUOLI

### Model Role (Linee 327-348) - LEGACY
```prisma
model Role {
  id          String   @id @default(cuid())
  name        String
  displayName String?
  permissions Json?
  companyId   String?
  tenantId    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  eliminato   Boolean  @default(false)  // ❌ PROBLEMA
  
  // Relazioni LEGACY
  company     Company? @relation(fields: [companyId], references: [id])
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])
  userRoles   UserRole[]
  enhancedUserRoles EnhancedUserRole[]
}
```

### Model PersonRole (Linee 542-567) - MODERNO ✅
```prisma
model PersonRole {
  id         String   @id @default(cuid())
  personId   String
  roleType   RoleType
  companyId  String?
  tenantId   String?
  assignedAt DateTime @default(now())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  // Relazioni MODERNE ✅
  person     Person   @relation(fields: [personId], references: [id])
  company    Company? @relation(fields: [companyId], references: [id])
  tenant     Tenant?  @relation(fields: [tenantId], references: [id])
}
```

### Enum RoleType (Linee 675-698) ✅
```prisma
enum RoleType {
  SUPER_ADMIN
  ADMIN
  COMPANY_ADMIN
  MANAGER
  TRAINER
  EMPLOYEE
  STUDENT
  GUEST
  AUDITOR
  COMPLIANCE_OFFICER
  DATA_PROTECTION_OFFICER
  HR_MANAGER
  FINANCE_MANAGER
  COURSE_COORDINATOR
  TECHNICAL_SUPPORT
  CUSTOMER_SERVICE
  SALES_REPRESENTATIVE
  MARKETING_MANAGER
  QUALITY_ASSURANCE
  PROJECT_MANAGER
  CONSULTANT
  EXTERNAL_TRAINER
}
```

---

## 🗑️ ANALISI SOFT DELETE

### Entità con `eliminato` (DA CONVERTIRE)

| Entità | Campo | Linea | Relazioni Impattate |
|--------|-------|-------|--------------------|
| User | eliminato | 315 | RefreshToken, UserRole, ActivityLog |
| Employee | eliminato | 58 | CourseEnrollment, Attestato |
| Role | eliminato | 339 | UserRole, EnhancedUserRole |
| Company | eliminato | 25 | User, Employee, Person |
| Course | eliminato | 75 | CourseEnrollment, CourseSession |
| LetteraIncarico | eliminato | 210 | - |
| Preventivo | eliminato | 250 | PreventivoPartecipante |
| Fattura | eliminato | 290 | - |

### Entità con `deletedAt` (CORRETTE) ✅

| Entità | Campo | Linea | Status |
|--------|-------|-------|--------|
| Person | deletedAt | 510 | ✅ Corretto |
| Tenant | deletedAt | 620 | ✅ Corretto |

### Entità con `isDeleted` (DA RIMUOVERE)

| Entità | Campo | Linea | Azione |
|--------|-------|-------|--------|
| Person | isDeleted | 511 | ❌ Rimuovere (duplicato) |

---

## 🔗 ANALISI RELAZIONI CRITICHE

### Relazioni da User (DA MIGRARE)
```prisma
// RefreshToken.userId → RefreshToken.personId ✅ GIÀ FATTO
model RefreshToken {
  personId String  // ✅ Già corretto
  person   Person @relation(fields: [personId], references: [id])
}

// UserRole → PersonRole (CONVERSIONE NECESSARIA)
model UserRole {
  userId String  // ❌ Da convertire
  user   User @relation(fields: [userId], references: [id])
}

// ActivityLog.userId → ActivityLog.personId
model ActivityLog {
  userId String  // ❌ Da convertire
  user   User @relation(fields: [userId], references: [id])
}
```

### Relazioni da Employee (DA MIGRARE)
```prisma
// CourseEnrollment.employeeId → CourseEnrollment.personId
model CourseEnrollment {
  employeeId String    // ❌ Da convertire
  employee   Employee @relation(fields: [employeeId], references: [id])
}

// Attestato.partecipanteId (Employee) → Attestato.personId
model Attestato {
  partecipanteId String    // ❌ Da convertire
  partecipante   Employee @relation("PartecipanteAttestato", fields: [partecipanteId], references: [id])
}
```

### Relazioni Person (GIÀ CORRETTE) ✅
```prisma
// Tutte le relazioni Person sono già corrette
model ConsentRecord {
  personId String
  person   Person @relation(fields: [personId], references: [id])
}

model GdprAuditLog {
  personId String?
  person   Person? @relation(fields: [personId], references: [id])
}
```

---

## 📊 STATISTICHE MIGRAZIONE

### Entità da Rimuovere
- ❌ `User` (1 entità)
- ❌ `Employee` (1 entità)
- ❌ `Role` (1 entità)
- ❌ `UserRole` (1 entità)
- ❌ `Permission` (1 entità)
- ❌ `EnhancedUserRole` (1 entità)

**Totale**: 6 entità da rimuovere

### Entità da Mantenere
- ✅ `Person` (entità unificata)
- ✅ `PersonRole` (sistema ruoli moderno)
- ✅ `RoleType` (enum ben definito)
- ✅ `PersonPermission` (enum permessi)

### Campi da Convertire
- 🔄 `eliminato` → `deletedAt` (8 entità)
- ❌ `isDeleted` → rimuovere (1 campo)

### Relazioni da Aggiornare
- 🔄 `userId` → `personId` (5 relazioni)
- 🔄 `employeeId` → `personId` (4 relazioni)
- 🔄 `roleId` → `roleType` (2 relazioni)

---

## 🎯 PRIORITÀ MIGRAZIONE

### Priorità 1: CRITICA
1. **User → Person**: Impatta autenticazione
2. **Employee → Person**: Impatta corsi e attestati
3. **Role → PersonRole**: Impatta autorizzazioni

### Priorità 2: ALTA
4. **Soft Delete**: Impatta GDPR compliance
5. **Relazioni**: Integrità referenziale

### Priorità 3: MEDIA
6. **Pulizia Schema**: Rimozione entità obsolete
7. **Enum Updates**: Aggiornamento enum

---

## ⚠️ RISCHI IDENTIFICATI

### Rischi Tecnici
1. **Perdita Dati**: Durante migrazione User/Employee
2. **Rottura Relazioni**: Foreign key constraints
3. **Downtime**: Durante aggiornamento schema

### Rischi GDPR
1. **Audit Trail**: Mantenere tracciabilità
2. **Consensi**: Preservare consent records
3. **Retention**: Rispettare policy cancellazione

### Mitigazioni
1. ✅ Backup completo pre-migrazione
2. ✅ Test in ambiente sviluppo
3. ✅ Rollback plan per ogni fase
4. ✅ Verifica GDPR continua

---

**Data Analisi**: 29 Dicembre 2024  
**Prossimo Step**: Mappatura dipendenze dettagliata