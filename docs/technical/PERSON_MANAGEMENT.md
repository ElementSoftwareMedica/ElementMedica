# Person Management System

## Overview

Il sistema di gestione delle persone è stato unificato per gestire in modo coerente dipendenti, formatori e utenti di sistema attraverso un'unica entità `Person` con ruoli multipli tramite `PersonRole`.

**IMPORTANTE**: Le entità `User`, `Employee` sono **OBSOLETE**. Usare sempre `Person` + `PersonRole`.

## Architettura

### Modello Dati

```prisma
model Person {
  id                String           @id @default(uuid())
  firstName         String           @db.VarChar(100)
  lastName          String           @db.VarChar(100)
  email             String?          @unique @db.VarChar(255)
  phone             String?          @db.VarChar(20)
  birthDate         DateTime?        @db.Date
  taxCode           String?          @unique @db.VarChar(16)
  vatNumber         String?          @db.VarChar(11)
  residenceAddress  String?          @db.VarChar(255)
  residenceCity     String?          @db.VarChar(100)
  postalCode        String?          @db.VarChar(10)
  province          String?          @db.VarChar(2)
  username          String?          @unique @db.VarChar(50)
  password          String?          @db.VarChar(255)  // bcrypt hash, salt 12
  status            PersonStatus     @default(ACTIVE)
  title             String?          @db.VarChar(100)
  hiredDate         DateTime?        @db.Date
  hourlyRate        Decimal?         @db.Decimal(10, 2)
  iban              String?          @db.VarChar(34)
  registerCode      String?          @db.VarChar(50)
  certifications    String[]
  specialties       String[]
  profileImage      String?          @db.VarChar(500)
  notes             String?
  lastLogin         DateTime?        @db.Timestamp(6)
  failedAttempts    Int              @default(0) @db.SmallInt
  lockedUntil       DateTime?        @db.Timestamp(6)
  globalRole        String?          @db.VarChar(50)
  tenantId          String           // Multi-tenancy OBBLIGATORIO
  companyId         String?
  siteId            String?
  reparto           String?          @db.VarChar(100)
  repartoId         String?
  createdAt         DateTime         @default(now()) @db.Timestamp(6)
  updatedAt         DateTime         @updatedAt @db.Timestamp(6)
  deletedAt         DateTime?        @db.Timestamp(6)  // Soft delete GDPR
  
  // GDPR Fields
  gdprConsentDate     DateTime?      @db.Timestamp(6)
  gdprConsentVersion  String?        @db.VarChar(10)
  dataRetentionUntil  DateTime?      @db.Date
  preferences         Json?          @default("{}")

  // Relations
  tenant              Tenant         @relation(fields: [tenantId], references: [id])
  company             Company?       @relation(fields: [companyId], references: [id])
  personRoles         PersonRole[]   // I ruoli dell'utente
  // ... altre relazioni
  
  @@map("persons")
}

model PersonRole {
  id                  String               @id @default(uuid())
  personId            String
  roleType            RoleType?
  customRoleId        String?              // Per ruoli personalizzati
  isActive            Boolean              @default(true)
  isPrimary           Boolean              @default(false)
  assignedAt          DateTime             @default(now()) @db.Timestamp(6)
  assignedBy          String?
  validFrom           DateTime             @default(now()) @db.Date
  validUntil          DateTime?            @db.Date
  companyId           String?
  tenantId            String               // Multi-tenancy OBBLIGATORIO
  departmentId        String?
  level               Int                  @default(0)
  parentRoleId        String?
  path                String?
  deletedAt           DateTime?            // Soft delete
  createdAt           DateTime             @default(now()) @db.Timestamp(6)
  updatedAt           DateTime             @updatedAt @db.Timestamp(6)
  
  // Relations
  person              Person               @relation(fields: [personId], references: [id], onDelete: Cascade)
  tenant              Tenant               @relation(fields: [tenantId], references: [id])
  company             Company?             @relation(fields: [companyId], references: [id], onDelete: Restrict)
  customRole          CustomRole?          @relation(fields: [customRoleId], references: [id], onDelete: Cascade)
  permissions         RolePermission[]
  advancedPermissions AdvancedPermission[]
  parentRole          PersonRole?          @relation("RoleHierarchy", fields: [parentRoleId], references: [id])
  childRoles          PersonRole[]         @relation("RoleHierarchy")

  @@unique([personId, roleType, customRoleId, companyId, tenantId])
  @@index([personId, isActive])
  @@index([roleType])
  @@index([tenantId])
  @@map("person_roles")
}

enum RoleType {
  // Ruoli dipendente/utente
  EMPLOYEE              // Dipendente base
  MANAGER               // Manager
  HR_MANAGER            // HR Manager
  DEPARTMENT_HEAD       // Capo dipartimento
  
  // Ruoli formatore
  TRAINER               // Formatore
  SENIOR_TRAINER        // Formatore senior
  TRAINER_COORDINATOR   // Coordinatore formatori
  EXTERNAL_TRAINER      // Formatore esterno
  
  // Ruoli amministrativi
  SUPER_ADMIN           // Super amministratore (tutti i tenant)
  ADMIN                 // Amministratore tenant
  COMPANY_ADMIN         // Amministratore azienda
  TENANT_ADMIN          // Amministratore tenant
  TRAINING_ADMIN        // Amministratore formazione
  CLINIC_ADMIN          // Amministratore clinica
  COMPANY_MANAGER       // Manager azienda
  
  // Ruoli limitati
  VIEWER                // Solo visualizzazione
  OPERATOR              // Operatore
  COORDINATOR           // Coordinatore
  SUPERVISOR            // Supervisore
  GUEST                 // Ospite
  CONSULTANT            // Consulente
  AUDITOR               // Auditor
}

enum PersonStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING
}
```

### Sistema Permessi

I permessi sono gestiti a due livelli:

1. **Default Permissions**: Ogni RoleType ha permessi predefiniti in `backend/services/enhancedRole/utils/RoleTypes.js`
2. **Custom Permissions**: Salvati in `RolePermission` e `AdvancedPermission` per sovrascrivere i default

```prisma
model RolePermission {
  id           String      @id @default(uuid())
  personRoleId String
  permission   PersonPermission
  isGranted    Boolean     @default(true)
  grantedBy    String?
  grantedAt    DateTime    @default(now())
  
  personRole   PersonRole  @relation(fields: [personRoleId], references: [id], onDelete: Cascade)
  
  @@unique([personRoleId, permission])
}

enum PersonPermission {
  // Companies
  VIEW_COMPANIES
  CREATE_COMPANIES
  EDIT_COMPANIES
  DELETE_COMPANIES
  
  // Persons
  VIEW_PERSONS
  CREATE_PERSONS
  EDIT_PERSONS
  DELETE_PERSONS
  
  // Courses
  VIEW_COURSES
  CREATE_COURSES
  EDIT_COURSES
  DELETE_COURSES
  
  // Schedules
  VIEW_SCHEDULES
  CREATE_SCHEDULES
  EDIT_SCHEDULES
  DELETE_SCHEDULES
  
  // Documents
  VIEW_DOCUMENTS
  CREATE_DOCUMENTS
  EDIT_DOCUMENTS
  DELETE_DOCUMENTS
  DOWNLOAD_DOCUMENTS
  
  // Roles
  ROLE_MANAGEMENT
  VIEW_ROLES
  CREATE_ROLES
  EDIT_ROLES
  DELETE_ROLES
  ASSIGN_ROLES
  REVOKE_ROLES
  
  // ... altri permessi
}
```

## API Endpoints

### Persone (`/api/v1/persons`)

```
GET    /api/v1/persons           - Lista persone (filtro per ruolo con ?roleType=)
GET    /api/v1/persons/:id       - Dettagli persona
POST   /api/v1/persons           - Crea persona
PUT    /api/v1/persons/:id       - Aggiorna persona
DELETE /api/v1/persons/:id       - Soft delete persona
```

### Ruoli (`/api/v1/roles`)

```
GET    /api/v1/roles/:roleType/permissions      - Permessi del ruolo
PUT    /api/v1/roles/:roleType/permissions      - Aggiorna permessi ruolo
GET    /api/v1/roles/types                      - Lista tipi ruolo disponibili
```

### Route Retrocompatibili

Le route legacy continuano a funzionare per compatibilità:

- `/api/v1/employees/*` - Reindirizzate al PersonController (filtro roleType=EMPLOYEE)
- `/api/v1/trainers/*` - Reindirizzate al PersonController (filtro roleType=TRAINER)

## Multi-Tenancy

**CRITICO**: Ogni query DEVE includere `tenantId` per l'isolamento dati.

```javascript
// Pattern corretto
const persons = await prisma.person.findMany({
  where: {
    tenantId: req.user.tenantId,  // OBBLIGATORIO
    deletedAt: null               // Soft delete
  }
});

// Per EMPLOYEE, filtrare anche per personId se necessario
if (isEmployeeOnly) {
  where.id = req.user.personId;
}
```

## GDPR Compliance

### Soft Delete
- Tutte le eliminazioni usano `deletedAt` invece di DELETE fisico
- I dati rimangono per audit trail fino a `dataRetentionUntil`

### Anonymization
- Pattern per anonimizzazione: `deleted_{uuid}@anonymized.local`
- Password NEVER in logs/exports

### Consent Tracking
- `gdprConsentDate`: Data ultimo consenso
- `gdprConsentVersion`: Versione privacy policy accettata
- `ConsentRecord` per tracciare tutti i consensi

### Audit Trail
- `GdprAuditLog` per tutte le modifiche a dati PII
- Include: `personId`, `action`, `oldData`, `newData`, `performedBy`, `ipAddress`

## Sicurezza

### Autenticazione
- JWT con refresh token
- Password hash bcrypt salt 12
- Rate limiting: 5 tentativi / 15 minuti
- Account lockout dopo 5 tentativi falliti

### Autorizzazione
- Permission-based access control (PBAC)
- Check middleware: `requirePermission('VIEW_PERSONS')`
- EMPLOYEE può vedere solo propri dati

### Validazione
- Input validation con Joi/express-validator
- SQL injection protection tramite Prisma
- XSS protection tramite sanitization

## Testing

### Test Account
```
Admin: admin@example.com / Admin123!
Employee: mario.rossi@testcompany.com / Test123!
```

### Esecuzione Test
```bash
npm test                    # Tutti i test
npm test -- --grep "Person" # Solo test Person
```

## Troubleshooting

### Errori Comuni

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `P2025` | Record non trovato | Verifica ID e tenantId |
| `403 Forbidden` | Permessi insufficienti | Verifica RolePermission |
| `EMPLOYEE vede altri` | Filtro personId mancante | Aggiungere check isEmployeeOnly |

### Debug
```bash
# Log API server
tail -f /tmp/api-server.log

# Health check
curl http://localhost:4001/health
```

## Changelog

- **2025-12**: 
  - Fix permessi ruolo non salvati (GET ignorava permessi custom)
  - Fix EMPLOYEE vedeva corsi in scadenza altri dipendenti
- **2024-11**: Migrazione a sistema Person unificato
- **2024-10**: Aggiunta multi-tenancy e GDPR compliance
