# 📦 Fase 8: Modularizzazione & Versioning

## 📋 Obiettivi

### Obiettivi Primari
- **Modularizzazione Schema**: Spezzare schema.prisma in file modulari
- **Versioning**: Implementare sistema di versioning per schema
- **Organizzazione**: Struttura logica e manutenibile
- **Changelog**: Tracciamento modifiche e versioni
- **Documentazione**: Auto-documentazione per ogni modulo

### Obiettivi Secondari
- **Manutenibilità**: Facilitare manutenzione e sviluppo
- **Collaborazione**: Migliorare workflow team
- **Deployment**: Gestione versioni in ambienti diversi

## 🎯 Task Dettagliati

### 8.1 Analisi Schema Attuale

#### 8.1.1 Inventario Modelli per Modularizzazione
```bash
# Analisi dimensioni e complessità schema attuale
wc -l backend/prisma/schema.prisma
grep -c "^model" backend/prisma/schema.prisma
grep -c "^enum" backend/prisma/schema.prisma
```

**Raggruppamento Logico Modelli:**

1. **Core/Base** (base.prisma)
   - `Tenant`
   - `TenantConfiguration`
   - `TenantUsage`

2. **Authentication** (auth.prisma)
   - `Person`
   - `PersonRole`
   - `PersonSession`
   - `RefreshToken`
   - `Permission`
   - `RolePermission`
   - `AdvancedPermission`
   - `CustomRole`
   - `CustomRolePermission`
   - `EnhancedUserRole`

3. **Companies** (companies.prisma)
   - `Company`
   - `ScheduleCompany`

4. **Courses** (courses.prisma)
   - `Course`
   - `CourseSchedule`
   - `CourseEnrollment`
   - `CourseSession`

5. **Attendance** (attendance.prisma)
   - `RegistroPresenze`
   - `RegistroPresenzePartecipante`

6. **Documents** (documents.prisma)
   - `Attestato`
   - `TemplateLink`
   - `LetteraIncarico`
   - `TestDocument`

7. **Financial** (financial.prisma)
   - `Preventivo`
   - `PreventivoPartecipante`
   - `PreventivoAzienda`
   - `Fattura`
   - `FatturaAzienda`

8. **Audit** (audit.prisma)
   - `ActivityLog`
   - `GdprAuditLog`
   - `ConsentRecord`

9. **Enums** (enums.prisma)
   - Tutti gli enum del sistema

#### 8.1.2 Analisi Dipendenze tra Modelli
```javascript
// Script per analizzare dipendenze
// backend/scripts/analyze-schema-dependencies.js
const fs = require('fs');
const path = require('path');

const analyzeSchemaDependendies = () => {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  const models = {};
  const relations = [];
  
  // Parse modelli e relazioni
  const modelMatches = schemaContent.match(/model\s+(\w+)\s*{[^}]+}/g);
  
  modelMatches?.forEach(modelBlock => {
    const modelName = modelBlock.match(/model\s+(\w+)/)[1];
    const relationMatches = modelBlock.match(/(\w+)\s+(\w+)\s+@relation/g);
    
    models[modelName] = {
      relations: relationMatches?.map(rel => {
        const [, fieldName, relatedModel] = rel.match(/(\w+)\s+(\w+)\s+@relation/);
        return { fieldName, relatedModel };
      }) || []
    };
  });
  
  // Genera grafo dipendenze
  Object.entries(models).forEach(([modelName, modelData]) => {
    modelData.relations.forEach(rel => {
      relations.push({
        from: modelName,
        to: rel.relatedModel,
        field: rel.fieldName
      });
    });
  });
  
  return { models, relations };
};

// Genera report dipendenze
const generateDependencyReport = () => {
  const { models, relations } = analyzeSchemaDependendies();
  
  console.log('=== DEPENDENCY ANALYSIS ===');
  console.log(`Total Models: ${Object.keys(models).length}`);
  console.log(`Total Relations: ${relations.length}`);
  
  // Modelli più connessi
  const connectionCount = {};
  relations.forEach(rel => {
    connectionCount[rel.from] = (connectionCount[rel.from] || 0) + 1;
    connectionCount[rel.to] = (connectionCount[rel.to] || 0) + 1;
  });
  
  const sortedByConnections = Object.entries(connectionCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  console.log('\nMost Connected Models:');
  sortedByConnections.forEach(([model, count]) => {
    console.log(`  ${model}: ${count} connections`);
  });
  
  return { models, relations, connectionCount };
};

module.exports = { analyzeSchemaDependendies, generateDependencyReport };
```

### 8.2 Struttura Modularizzata

#### 8.2.1 Configurazione Prisma Multi-file
```prisma
// backend/prisma/schema.prisma (file principale)
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Import di tutti i moduli
// NOTA: Prisma non supporta nativamente import, 
// useremo uno script di build per concatenare

// === SCHEMA VERSION ===
// Version: 2.0.0
// Last Updated: 2024-01-15
// Breaking Changes: Yes (Enum conversion, Multi-tenant)
// Migration Required: Yes

// === MODULES ===
// - base.prisma: Core tenant models
// - auth.prisma: Authentication and authorization
// - companies.prisma: Company management
// - courses.prisma: Course and scheduling
// - attendance.prisma: Attendance tracking
// - documents.prisma: Document management
// - financial.prisma: Financial operations
// - audit.prisma: Audit and compliance
// - enums.prisma: All system enums

// === CHANGELOG ===
// v2.0.0 (2024-01-15)
// - Converted all status fields to enums
// - Added multi-tenant support with RLS
// - Standardized naming conventions (camelCase)
// - Added soft-delete middleware support
// - Improved indexing strategy
// - Added GDPR compliance features
//
// v1.5.0 (2023-12-01)
// - Added PersonRole system
// - Deprecated User/Employee models
// - Added audit logging
//
// v1.0.0 (2023-10-01)
// - Initial schema version
```

#### 8.2.2 Modulo Base (base.prisma)
```prisma
// backend/prisma/modules/base.prisma
// === BASE MODULE ===
// Core tenant and configuration models
// Version: 2.0.0
// Dependencies: None (base module)

// === MODELS ===

model Tenant {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  domain      String?  @unique
  isActive    Boolean  @default(true)
  plan        String   @default("basic") // basic, premium, enterprise
  maxUsers    Int      @default(10)
  maxStorage  BigInt   @default(1073741824) // 1GB in bytes
  settings    Json?    // Configurazioni specifiche tenant
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relazioni verso altri moduli
  configuration TenantConfiguration?
  usage         TenantUsage[]
  persons       Person[]
  companies     Company[]
  courses       Course[]
  // ... altre relazioni definite nei rispettivi moduli
  
  @@index([slug])
  @@index([domain])
  @@index([isActive])
  @@map("tenants")
}

model TenantConfiguration {
  id                    String   @id @default(cuid())
  tenantId              String   @unique
  allowSelfRegistration Boolean  @default(false)
  requireEmailVerification Boolean @default(true)
  sessionTimeout        Int      @default(86400) // 24 ore in secondi
  maxLoginAttempts      Int      @default(5)
  passwordPolicy        Json?    // Policy password specifiche
  notificationSettings  Json?    // Impostazioni notifiche
  gdprSettings          Json?    // Impostazioni GDPR
  customBranding        Json?    // Branding personalizzato
  integrations          Json?    // Configurazioni integrazioni
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relazioni
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@map("tenant_configurations")
}

model TenantUsage {
  id            String   @id @default(cuid())
  tenantId      String
  date          DateTime @default(now()) @db.Date
  activeUsers   Int      @default(0)
  storageUsed   BigInt   @default(0) // bytes
  apiCalls      Int      @default(0)
  documentsCreated Int   @default(0)
  coursesActive Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relazioni
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([tenantId, date])
  @@unique([tenantId, date])
  @@map("tenant_usage")
}

// === CHANGELOG ===
// v2.0.0 (2024-01-15)
// - Added maxStorage and usage tracking
// - Enhanced tenant configuration options
// - Added GDPR settings
// - Improved indexing
//
// v1.0.0 (2023-10-01)
// - Initial tenant models
```

#### 8.2.3 Modulo Authentication (auth.prisma)
```prisma
// backend/prisma/modules/auth.prisma
// === AUTHENTICATION MODULE ===
// User authentication and authorization models
// Version: 2.0.0
// Dependencies: base.prisma (Tenant)

// === MODELS ===

model Person {
  id          String       @id @default(cuid())
  email       String
  firstName   String
  lastName    String
  phone       String?
  dateOfBirth DateTime?    @db.Date
  avatar      String?      // URL avatar
  bio         String?      @db.Text
  status      PersonStatus @default(ACTIVE)
  lastLoginAt DateTime?
  emailVerifiedAt DateTime?
  passwordHash String      // Hash password bcrypt
  tenantId    String
  deletedAt   DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // Relazioni
  tenant              Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  personRoles         PersonRole[]
  sessions            PersonSession[]
  refreshTokens       RefreshToken[]
  courseEnrollments   CourseEnrollment[]
  attendanceRecords   RegistroPresenzePartecipante[]
  createdDocuments    Attestato[]           @relation("CreatedBy")
  assignedDocuments   LetteraIncarico[]
  activityLogs        ActivityLog[]
  gdprAuditLogs       GdprAuditLog[]
  consentRecords      ConsentRecord[]
  certifications      PersonCertification[]
  specialties         PersonSpecialty[]
  
  @@index([tenantId])
  @@index([tenantId, email])
  @@index([tenantId, status])
  @@index([tenantId, deletedAt])
  @@index([email]) // Per ricerca globale admin
  @@unique([email, tenantId])
  @@map("persons")
}

model PersonRole {
  id         String    @id @default(cuid())
  personId   String
  roleType   RoleType
  assignedBy String?   // ID della persona che ha assegnato il ruolo
  assignedAt DateTime  @default(now())
  expiresAt  DateTime? // Ruoli temporanei
  isActive   Boolean   @default(true)
  tenantId   String
  deletedAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  // Relazioni
  person     Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  tenant     Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  assignedByPerson Person? @relation("AssignedRoles", fields: [assignedBy], references: [id])
  
  @@index([tenantId])
  @@index([tenantId, personId])
  @@index([tenantId, roleType])
  @@index([tenantId, isActive])
  @@unique([personId, roleType, tenantId])
  @@map("person_roles")
}

model PersonSession {
  id          String    @id @default(cuid())
  personId    String
  sessionToken String   @unique
  ipAddress   String?
  userAgent   String?   @db.Text
  isActive    Boolean   @default(true)
  lastActivity DateTime @default(now())
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relazioni
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  @@index([personId])
  @@index([sessionToken])
  @@index([expiresAt])
  @@index([isActive])
  @@map("person_sessions")
}

model RefreshToken {
  id        String   @id @default(cuid())
  personId  String
  token     String   @unique
  expiresAt DateTime
  isRevoked Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relazioni
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  @@index([personId])
  @@index([token])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

model Permission {
  id          String   @id @default(cuid())
  name        String   @unique // es: "courses.create", "users.delete"
  description String?
  category    String?  // es: "courses", "users", "reports"
  isSystem    Boolean  @default(false) // Permessi di sistema non modificabili
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relazioni
  rolePermissions     RolePermission[]
  advancedPermissions AdvancedPermission[]
  customRolePermissions CustomRolePermission[]
  
  @@index([category])
  @@index([isSystem])
  @@map("permissions")
}

model RolePermission {
  id           String     @id @default(cuid())
  roleType     RoleType
  permissionId String
  canCreate    Boolean    @default(false)
  canRead      Boolean    @default(false)
  canUpdate    Boolean    @default(false)
  canDelete    Boolean    @default(false)
  conditions   Json?      // Condizioni aggiuntive
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  // Relazioni
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@index([roleType])
  @@index([permissionId])
  @@unique([roleType, permissionId])
  @@map("role_permissions")
}

// === CHANGELOG ===
// v2.0.0 (2024-01-15)
// - Unified Person model (replaced User/Employee)
// - Enhanced PersonRole with expiration and assignment tracking
// - Added session management with security features
// - Improved permission system with CRUD granularity
// - Added multi-tenant support
//
// v1.5.0 (2023-12-01)
// - Added PersonRole system
// - Enhanced permission management
//
// v1.0.0 (2023-10-01)
// - Initial authentication models
```

#### 8.2.4 Modulo Enums (enums.prisma)
```prisma
// backend/prisma/modules/enums.prisma
// === ENUMS MODULE ===
// All system enumerations
// Version: 2.0.0
// Dependencies: None (standalone enums)

// === PERSON & AUTHENTICATION ===

enum PersonStatus {
  ACTIVE      // Attivo
  INACTIVE    // Inattivo
  SUSPENDED   // Sospeso
  PENDING     // In attesa di verifica
  ARCHIVED    // Archiviato
}

enum RoleType {
  SUPER_ADMIN // Super amministratore (cross-tenant)
  ADMIN       // Amministratore tenant
  MANAGER     // Manager/Responsabile
  TRAINER     // Formatore/Docente
  STUDENT     // Studente/Partecipante
  VIEWER      // Solo visualizzazione
  GUEST       // Ospite temporaneo
}

enum PersonPermission {
  // Gestione utenti
  USERS_CREATE
  USERS_READ
  USERS_UPDATE
  USERS_DELETE
  USERS_MANAGE_ROLES
  
  // Gestione aziende
  COMPANIES_CREATE
  COMPANIES_READ
  COMPANIES_UPDATE
  COMPANIES_DELETE
  
  // Gestione corsi
  COURSES_CREATE
  COURSES_READ
  COURSES_UPDATE
  COURSES_DELETE
  COURSES_MANAGE_ENROLLMENTS
  
  // Gestione documenti
  DOCUMENTS_CREATE
  DOCUMENTS_READ
  DOCUMENTS_UPDATE
  DOCUMENTS_DELETE
  DOCUMENTS_DOWNLOAD
  
  // Gestione finanziaria
  FINANCIAL_CREATE
  FINANCIAL_READ
  FINANCIAL_UPDATE
  FINANCIAL_DELETE
  FINANCIAL_EXPORT
  
  // Amministrazione sistema
  SYSTEM_SETTINGS
  SYSTEM_LOGS
  SYSTEM_BACKUP
  SYSTEM_MAINTENANCE
  
  // GDPR e compliance
  GDPR_MANAGE
  GDPR_EXPORT
  GDPR_DELETE
  AUDIT_READ
}

// === COURSES & EDUCATION ===

enum CourseStatus {
  DRAFT       // Bozza
  PUBLISHED   // Pubblicato
  ACTIVE      // In corso
  COMPLETED   // Completato
  CANCELLED   // Cancellato
  SUSPENDED   // Sospeso
  ARCHIVED    // Archiviato
}

enum EnrollmentStatus {
  PENDING     // In attesa
  CONFIRMED   // Confermata
  ACTIVE      // Attiva
  COMPLETED   // Completata
  CANCELLED   // Cancellata
  REFUNDED    // Rimborsata
  EXPIRED     // Scaduta
  TRANSFERRED // Trasferita
}

enum SessionType {
  LECTURE     // Lezione frontale
  WORKSHOP    // Workshop pratico
  EXAM        // Esame
  SEMINAR     // Seminario
  ONLINE      // Sessione online
  HYBRID      // Modalità ibrida
  FIELD_TRIP  // Visita/Uscita didattica
  ASSESSMENT  // Valutazione
}

enum AttendanceStatus {
  PRESENT     // Presente
  ABSENT      // Assente
  LATE        // In ritardo
  EXCUSED     // Giustificato
  PARTIAL     // Presenza parziale
  REMOTE      // Partecipazione remota
}

// === DOCUMENTS & CERTIFICATES ===

enum DocumentType {
  CERTIFICATE    // Certificato
  DIPLOMA       // Diploma
  TRANSCRIPT    // Trascrizione
  INVOICE       // Fattura
  QUOTE         // Preventivo
  CONTRACT      // Contratto
  ATTENDANCE    // Registro presenze
  ASSIGNMENT    // Lettera incarico
  REPORT        // Report
  PRESENTATION  // Presentazione
}

enum DocumentStatus {
  DRAFT         // Bozza
  PENDING       // In attesa
  APPROVED      // Approvato
  REJECTED      // Rifiutato
  PUBLISHED     // Pubblicato
  ARCHIVED      // Archiviato
  EXPIRED       // Scaduto
}

// === FINANCIAL ===

enum PaymentStatus {
  DRAFT         // Bozza
  SENT          // Inviato
  VIEWED        // Visualizzato
  ACCEPTED      // Accettato
  PAID          // Pagato
  PARTIAL_PAID  // Pagato parzialmente
  OVERDUE       // Scaduto
  CANCELLED     // Cancellato
  REFUNDED      // Rimborsato
}

enum PaymentMethod {
  CASH          // Contanti
  BANK_TRANSFER // Bonifico bancario
  CREDIT_CARD   // Carta di credito
  DEBIT_CARD    // Carta di debito
  PAYPAL        // PayPal
  STRIPE        // Stripe
  CHECK         // Assegno
  OTHER         // Altro
}

enum Currency {
  EUR // Euro
  USD // Dollaro USA
  GBP // Sterlina britannica
  CHF // Franco svizzero
}

// === SYSTEM & AUDIT ===

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
  CRITICAL
}

enum NotificationStatus {
  PENDING     // In attesa
  SENT        // Inviata
  DELIVERED   // Consegnata
  READ        // Letta
  FAILED      // Fallita
  EXPIRED     // Scaduta
}

enum NotificationType {
  EMAIL       // Email
  SMS         // SMS
  PUSH        // Push notification
  IN_APP      // Notifica in-app
  WEBHOOK     // Webhook
}

enum AuditAction {
  CREATE      // Creazione
  READ        // Lettura
  UPDATE      // Aggiornamento
  DELETE      // Eliminazione
  LOGIN       // Login
  LOGOUT      // Logout
  EXPORT      // Esportazione
  IMPORT      // Importazione
  DOWNLOAD    // Download
  UPLOAD      // Upload
  APPROVE     // Approvazione
  REJECT      // Rifiuto
  ARCHIVE     // Archiviazione
  RESTORE     // Ripristino
}

enum EntityType {
  PERSON      // Persona
  COMPANY     // Azienda
  COURSE      // Corso
  ENROLLMENT  // Iscrizione
  DOCUMENT    // Documento
  INVOICE     // Fattura
  QUOTE       // Preventivo
  SESSION     // Sessione
  ATTENDANCE  // Presenza
  PERMISSION  // Permesso
  ROLE        // Ruolo
  TENANT      // Tenant
  SYSTEM      // Sistema
}

// === GDPR & COMPLIANCE ===

enum ConsentType {
  MARKETING           // Marketing
  ANALYTICS          // Analytics
  FUNCTIONAL         // Funzionale
  PERFORMANCE        // Performance
  THIRD_PARTY        // Terze parti
  DATA_PROCESSING    // Trattamento dati
  COMMUNICATION      // Comunicazioni
  PROFILING          // Profilazione
}

enum ConsentStatus {
  GIVEN      // Dato
  WITHDRAWN  // Ritirato
  EXPIRED    // Scaduto
  PENDING    // In attesa
}

enum DataRetentionPeriod {
  DAYS_30    // 30 giorni
  DAYS_90    // 90 giorni
  MONTHS_6   // 6 mesi
  YEAR_1     // 1 anno
  YEARS_2    // 2 anni
  YEARS_5    // 5 anni
  YEARS_10   // 10 anni
  PERMANENT  // Permanente
}

// === INTEGRATION & API ===

enum IntegrationType {
  GOOGLE_WORKSPACE   // Google Workspace
  MICROSOFT_365      // Microsoft 365
  ZOOM              // Zoom
  TEAMS             // Microsoft Teams
  SLACK             // Slack
  WEBHOOK           // Webhook generico
  REST_API          // REST API
  GRAPHQL           // GraphQL
  SOAP              // SOAP
}

enum ApiVersion {
  V1    // Versione 1
  V2    // Versione 2
  BETA  // Beta
  ALPHA // Alpha
}

// === CHANGELOG ===
// v2.0.0 (2024-01-15)
// - Added comprehensive enum set for all modules
// - Enhanced GDPR and compliance enums
// - Added financial and payment enums
// - Improved audit and system enums
// - Added integration and API enums
//
// v1.5.0 (2023-12-01)
// - Added PersonPermission enum
// - Enhanced RoleType enum
//
// v1.0.0 (2023-10-01)
// - Initial enum definitions
```

### 8.3 Sistema di Build e Concatenazione

#### 8.3.1 Script di Build Schema
```javascript
// backend/scripts/build-schema.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

class SchemaBuildError extends Error {
  constructor(message, file, line) {
    super(message);
    this.file = file;
    this.line = line;
  }
}

class SchemaBuilder {
  constructor(options = {}) {
    this.modulesDir = options.modulesDir || path.join(__dirname, '../prisma/modules');
    this.outputFile = options.outputFile || path.join(__dirname, '../prisma/schema.prisma');
    this.backupDir = options.backupDir || path.join(__dirname, '../prisma/backups');
    this.verbose = options.verbose || false;
  }

  log(message) {
    if (this.verbose) {
      console.log(`[SchemaBuilder] ${message}`);
    }
  }

  error(message, file, line) {
    throw new SchemaBuildError(message, file, line);
  }

  // Crea backup dello schema esistente
  createBackup() {
    if (!fs.existsSync(this.outputFile)) {
      this.log('No existing schema to backup');
      return;
    }

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `schema-${timestamp}.prisma`);
    
    fs.copyFileSync(this.outputFile, backupFile);
    this.log(`Backup created: ${backupFile}`);
  }

  // Legge e valida i moduli
  readModules() {
    const moduleFiles = glob.sync('*.prisma', { cwd: this.modulesDir });
    
    if (moduleFiles.length === 0) {
      this.error('No module files found', this.modulesDir);
    }

    const modules = [];
    const loadOrder = [
      'enums.prisma',      // Prima gli enum
      'base.prisma',       // Poi i modelli base
      'auth.prisma',       // Autenticazione
      'companies.prisma',  // Aziende
      'courses.prisma',    // Corsi
      'attendance.prisma', // Presenze
      'documents.prisma',  // Documenti
      'financial.prisma',  // Finanziario
      'audit.prisma'       // Audit
    ];

    // Carica moduli nell'ordine specificato
    loadOrder.forEach(fileName => {
      if (moduleFiles.includes(fileName)) {
        const filePath = path.join(this.modulesDir, fileName);
        const content = fs.readFileSync(filePath, 'utf8');
        
        modules.push({
          name: fileName,
          path: filePath,
          content: this.processModuleContent(content, fileName)
        });
        
        this.log(`Loaded module: ${fileName}`);
      }
    });

    // Carica eventuali moduli rimanenti
    moduleFiles.forEach(fileName => {
      if (!loadOrder.includes(fileName)) {
        const filePath = path.join(this.modulesDir, fileName);
        const content = fs.readFileSync(filePath, 'utf8');
        
        modules.push({
          name: fileName,
          path: filePath,
          content: this.processModuleContent(content, fileName)
        });
        
        this.log(`Loaded additional module: ${fileName}`);
      }
    });

    return modules;
  }

  // Processa il contenuto di un modulo
  processModuleContent(content, fileName) {
    // Rimuovi commenti di intestazione del modulo
    const lines = content.split('\n');
    const processedLines = [];
    let inHeader = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip header comments
      if (inHeader && (line.startsWith('//') || line.trim() === '')) {
        continue;
      }
      
      inHeader = false;
      processedLines.push(line);
    }

    return processedLines.join('\n').trim();
  }

  // Valida le dipendenze tra moduli
  validateDependencies(modules) {
    const definedModels = new Set();
    const definedEnums = new Set();
    const usedModels = new Set();
    const usedEnums = new Set();

    // Prima passata: raccogli definizioni
    modules.forEach(module => {
      const modelMatches = module.content.match(/^model\s+(\w+)/gm);
      const enumMatches = module.content.match(/^enum\s+(\w+)/gm);
      
      modelMatches?.forEach(match => {
        const modelName = match.split(/\s+/)[1];
        if (definedModels.has(modelName)) {
          this.error(`Duplicate model definition: ${modelName}`, module.path);
        }
        definedModels.add(modelName);
      });
      
      enumMatches?.forEach(match => {
        const enumName = match.split(/\s+/)[1];
        if (definedEnums.has(enumName)) {
          this.error(`Duplicate enum definition: ${enumName}`, module.path);
        }
        definedEnums.add(enumName);
      });
    });

    // Seconda passata: verifica utilizzi
    modules.forEach(module => {
      // Trova riferimenti a modelli
      const relationMatches = module.content.match(/(\w+)\s+@relation/g);
      relationMatches?.forEach(match => {
        const modelName = match.split(/\s+/)[0];
        usedModels.add(modelName);
      });
      
      // Trova riferimenti a enum
      const enumUsageMatches = module.content.match(/(\w+)\s+\w+\s*(?:@default\(\w+\))?/g);
      enumUsageMatches?.forEach(match => {
        const typeName = match.split(/\s+/)[0];
        if (definedEnums.has(typeName)) {
          usedEnums.add(typeName);
        }
      });
    });

    // Verifica dipendenze non risolte
    usedModels.forEach(modelName => {
      if (!definedModels.has(modelName)) {
        this.error(`Undefined model reference: ${modelName}`);
      }
    });

    usedEnums.forEach(enumName => {
      if (!definedEnums.has(enumName)) {
        this.error(`Undefined enum reference: ${enumName}`);
      }
    });

    this.log(`Validation passed: ${definedModels.size} models, ${definedEnums.size} enums`);
  }

  // Genera lo schema finale
  generateSchema(modules) {
    const header = this.generateHeader();
    const moduleContents = modules.map(module => {
      return `\n// === ${module.name.toUpperCase().replace('.PRISMA', '')} MODULE ===\n${module.content}`;
    }).join('\n');

    return `${header}${moduleContents}\n`;
  }

  // Genera header dello schema
  generateHeader() {
    const now = new Date().toISOString().split('T')[0];
    
    return `// === GENERATED SCHEMA ===
// This file is auto-generated from modules in prisma/modules/
// DO NOT EDIT DIRECTLY - Edit the module files instead
// Generated: ${now}
// Builder Version: 2.0.0

generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// === SCHEMA METADATA ===
// Version: 2.0.0
// Modules: ${fs.readdirSync(this.modulesDir).filter(f => f.endsWith('.prisma')).length}
// Last Build: ${new Date().toISOString()}
`;
  }

  // Build principale
  async build() {
    try {
      this.log('Starting schema build...');
      
      // Backup
      this.createBackup();
      
      // Leggi moduli
      const modules = this.readModules();
      
      // Valida dipendenze
      this.validateDependencies(modules);
      
      // Genera schema
      const schema = this.generateSchema(modules);
      
      // Scrivi file
      fs.writeFileSync(this.outputFile, schema, 'utf8');
      
      this.log(`Schema built successfully: ${this.outputFile}`);
      this.log(`Total size: ${schema.length} characters`);
      
      return {
        success: true,
        outputFile: this.outputFile,
        modules: modules.length,
        size: schema.length
      };
      
    } catch (error) {
      if (error instanceof SchemaBuildError) {
        console.error(`Build Error: ${error.message}`);
        if (error.file) console.error(`File: ${error.file}`);
        if (error.line) console.error(`Line: ${error.line}`);
      } else {
        console.error('Unexpected error:', error);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// CLI interface
if (require.main === module) {
  const builder = new SchemaBuilder({ verbose: true });
  builder.build().then(result => {
    if (result.success) {
      console.log('✅ Schema build completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Schema build failed');
      process.exit(1);
    }
  });
}

module.exports = { SchemaBuilder, SchemaBuildError };
```

#### 8.3.2 Script NPM per Build
```json
// backend/package.json (aggiunta)
{
  "scripts": {
    "schema:build": "node scripts/build-schema.js",
    "schema:validate": "node scripts/build-schema.js && npx prisma validate",
    "schema:format": "npx prisma format",
    "schema:generate": "npm run schema:build && npx prisma generate",
    "schema:deploy": "npm run schema:validate && npx prisma db push",
    "schema:migrate": "npm run schema:validate && npx prisma migrate dev",
    "schema:watch": "nodemon --watch prisma/modules --ext prisma --exec 'npm run schema:build'"
  },
  "devDependencies": {
    "glob": "^8.0.0",
    "nodemon": "^2.0.0"
  }
}
```

### 8.4 Sistema di Versioning

#### 8.4.1 Metadata di Versione
```javascript
// backend/prisma/version.js
const SCHEMA_VERSION = {
  major: 2,
  minor: 0,
  patch: 0,
  prerelease: null, // 'alpha', 'beta', 'rc'
  build: null
};

const VERSION_HISTORY = [
  {
    version: '2.0.0',
    date: '2024-01-15',
    breaking: true,
    migration: true,
    changes: [
      'Converted all status fields to enums',
      'Added multi-tenant support with RLS',
      'Standardized naming conventions (camelCase)',
      'Added soft-delete middleware support',
      'Improved indexing strategy',
      'Added GDPR compliance features',
      'Modularized schema structure'
    ],
    migrations: [
      '20240115_enum_conversion',
      '20240115_multi_tenant_setup',
      '20240115_naming_standardization',
      '20240115_index_optimization'
    ]
  },
  {
    version: '1.5.0',
    date: '2023-12-01',
    breaking: false,
    migration: true,
    changes: [
      'Added PersonRole system',
      'Deprecated User/Employee models',
      'Added audit logging',
      'Enhanced permission system'
    ],
    migrations: [
      '20231201_person_role_system',
      '20231201_audit_logging'
    ]
  },
  {
    version: '1.0.0',
    date: '2023-10-01',
    breaking: false,
    migration: false,
    changes: [
      'Initial schema version',
      'Basic models and relationships',
      'Core functionality'
    ],
    migrations: []
  }
];

const getCurrentVersion = () => {
  const { major, minor, patch, prerelease, build } = SCHEMA_VERSION;
  let version = `${major}.${minor}.${patch}`;
  
  if (prerelease) {
    version += `-${prerelease}`;
  }
  
  if (build) {
    version += `+${build}`;
  }
  
  return version;
};

const getVersionInfo = (version) => {
  return VERSION_HISTORY.find(v => v.version === version);
};

const getLatestVersion = () => {
  return VERSION_HISTORY[0];
};

const isBreakingChange = (fromVersion, toVersion) => {
  const from = getVersionInfo(fromVersion);
  const to = getVersionInfo(toVersion);
  
  if (!from || !to) return false;
  
  // Verifica se ci sono breaking changes tra le versioni
  const fromIndex = VERSION_HISTORY.findIndex(v => v.version === fromVersion);
  const toIndex = VERSION_HISTORY.findIndex(v => v.version === toVersion);
  
  if (fromIndex === -1 || toIndex === -1) return false;
  
  // Controlla tutte le versioni intermedie
  for (let i = toIndex; i < fromIndex; i++) {
    if (VERSION_HISTORY[i].breaking) {
      return true;
    }
  }
  
  return false;
};

const getMigrationPath = (fromVersion, toVersion) => {
  const fromIndex = VERSION_HISTORY.findIndex(v => v.version === fromVersion);
  const toIndex = VERSION_HISTORY.findIndex(v => v.version === toVersion);
  
  if (fromIndex === -1 || toIndex === -1) {
    throw new Error(`Invalid version range: ${fromVersion} -> ${toVersion}`);
  }
  
  const migrations = [];
  
  // Raccogli tutte le migrazioni necessarie
  for (let i = fromIndex - 1; i >= toIndex; i--) {
    migrations.push(...VERSION_HISTORY[i].migrations);
  }
  
  return migrations;
};

module.exports = {
  SCHEMA_VERSION,
  VERSION_HISTORY,
  getCurrentVersion,
  getVersionInfo,
  getLatestVersion,
  isBreakingChange,
  getMigrationPath
};
```

#### 8.4.2 Comando di Versioning
```javascript
// backend/scripts/version-schema.js
const fs = require('fs');
const path = require('path');
const { getCurrentVersion, getVersionInfo, VERSION_HISTORY } = require('../prisma/version');

class VersionManager {
  constructor() {
    this.versionFile = path.join(__dirname, '../prisma/version.js');
  }

  // Incrementa versione
  bump(type = 'patch', prerelease = null) {
    const versionPath = path.join(__dirname, '../prisma/version.js');
    let content = fs.readFileSync(versionPath, 'utf8');
    
    // Parse versione attuale
    const versionMatch = content.match(/major: (\d+),\s*minor: (\d+),\s*patch: (\d+)/);
    if (!versionMatch) {
      throw new Error('Cannot parse current version');
    }
    
    let [, major, minor, patch] = versionMatch.map(Number);
    
    // Incrementa in base al tipo
    switch (type) {
      case 'major':
        major++;
        minor = 0;
        patch = 0;
        break;
      case 'minor':
        minor++;
        patch = 0;
        break;
      case 'patch':
        patch++;
        break;
      default:
        throw new Error(`Invalid bump type: ${type}`);
    }
    
    // Aggiorna il file
    content = content.replace(
      /major: \d+,\s*minor: \d+,\s*patch: \d+/,
      `major: ${major}, minor: ${minor}, patch: ${patch}`
    );
    
    if (prerelease) {
      content = content.replace(
        /prerelease: [^,]+,/,
        `prerelease: '${prerelease}',`
      );
    }
    
    fs.writeFileSync(versionPath, content, 'utf8');
    
    const newVersion = `${major}.${minor}.${patch}${prerelease ? `-${prerelease}` : ''}`;
    console.log(`Version bumped to: ${newVersion}`);
    
    return newVersion;
  }

  // Aggiungi entry al changelog
  addChangelogEntry(version, changes, breaking = false, migration = false) {
    const entry = {
      version,
      date: new Date().toISOString().split('T')[0],
      breaking,
      migration,
      changes: Array.isArray(changes) ? changes : [changes],
      migrations: []
    };
    
    // Leggi file versione
    let content = fs.readFileSync(this.versionFile, 'utf8');
    
    // Trova l'array VERSION_HISTORY
    const historyMatch = content.match(/(const VERSION_HISTORY = \[)([\s\S]*?)(\];)/m);
    if (!historyMatch) {
      throw new Error('Cannot find VERSION_HISTORY array');
    }
    
    const [, start, historyContent, end] = historyMatch;
    
    // Aggiungi nuova entry all'inizio
    const newEntry = `  ${JSON.stringify(entry, null, 2).replace(/^/gm, '  ')},`;
    const newHistoryContent = `\n${newEntry}${historyContent}`;
    
    // Sostituisci nel contenuto
    content = content.replace(
      /(const VERSION_HISTORY = \[)([\s\S]*?)(\];)/m,
      `${start}${newHistoryContent}${end}`
    );
    
    fs.writeFileSync(this.versionFile, content, 'utf8');
    
    console.log(`Changelog entry added for version ${version}`);
  }

  // Mostra informazioni versione
  info() {
    const current = getCurrentVersion();
    const info = getVersionInfo(current);
    
    console.log(`Current Schema Version: ${current}`);
    
    if (info) {
      console.log(`Release Date: ${info.date}`);
      console.log(`Breaking Changes: ${info.breaking ? 'Yes' : 'No'}`);
      console.log(`Requires Migration: ${info.migration ? 'Yes' : 'No'}`);
      console.log('Changes:');
      info.changes.forEach(change => {
        console.log(`  - ${change}`);
      });
    }
  }

  // Lista tutte le versioni
  list() {
    console.log('Schema Version History:');
    VERSION_HISTORY.forEach(version => {
      const flags = [];
      if (version.breaking) flags.push('BREAKING');
      if (version.migration) flags.push('MIGRATION');
      
      const flagsStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
      console.log(`  ${version.version} (${version.date})${flagsStr}`);
      
      version.changes.forEach(change => {
        console.log(`    - ${change}`);
      });
    });
  }
}

// CLI interface
if (require.main === module) {
  const manager = new VersionManager();
  const [,, command, ...args] = process.argv;
  
  switch (command) {
    case 'bump':
      const [type, prerelease] = args;
      manager.bump(type || 'patch', prerelease);
      break;
      
    case 'info':
      manager.info();
      break;
      
    case 'list':
      manager.list();
      break;
      
    case 'changelog':
      const [version, ...changes] = args;
      if (!version || changes.length === 0) {
        console.error('Usage: npm run schema:changelog <version> <change1> [change2] ...');
        process.exit(1);
      }
      manager.addChangelogEntry(version, changes);
      break;
      
    default:
      console.log('Usage:');
      console.log('  npm run schema:version bump [major|minor|patch] [prerelease]');
      console.log('  npm run schema:version info');
      console.log('  npm run schema:version list');
      console.log('  npm run schema:version changelog <version> <change1> [change2] ...');
      break;
  }
}

module.exports = VersionManager;
```

## 🧪 Strategia di Testing

### 8.5 Test Modularizzazione

#### 8.5.1 Test Build Schema
```javascript
// tests/schema-build.test.js
const { SchemaBuilder } = require('../scripts/build-schema');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Schema Build System', () => {
  let testModulesDir;
  let testOutputFile;
  let builder;
  
  beforeEach(() => {
    // Setup directory temporanea per test
    testModulesDir = path.join(__dirname, 'temp/modules');
    testOutputFile = path.join(__dirname, 'temp/schema.prisma');
    
    fs.mkdirSync(testModulesDir, { recursive: true });
    
    builder = new SchemaBuilder({
      modulesDir: testModulesDir,
      outputFile: testOutputFile
    });
  });
  
  afterEach(() => {
    // Cleanup
    fs.rmSync(path.join(__dirname, 'temp'), { recursive: true, force: true });
  });
  
  test('builds schema from modules', async () => {
    // Crea moduli di test
    fs.writeFileSync(path.join(testModulesDir, 'enums.prisma'), `
enum TestStatus {
  ACTIVE
  INACTIVE
}
`);
    
    fs.writeFileSync(path.join(testModulesDir, 'base.prisma'), `
model TestModel {
  id     String     @id @default(cuid())
  status TestStatus @default(ACTIVE)
}
`);
    
    const result = await builder.build();
    
    expect(result.success).toBe(true);
    expect(fs.existsSync(testOutputFile)).toBe(true);
    
    const schema = fs.readFileSync(testOutputFile, 'utf8');
    expect(schema).toContain('enum TestStatus');
    expect(schema).toContain('model TestModel');
  });
  
  test('validates dependencies', async () => {
    // Modulo con dipendenza non risolta
    fs.writeFileSync(path.join(testModulesDir, 'invalid.prisma'), `
model TestModel {
  id       String @id @default(cuid())
  related  UndefinedModel @relation(fields: [relatedId], references: [id])
  relatedId String
}
`);
    
    const result = await builder.build();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Undefined model reference');
  });
  
  test('detects duplicate definitions', async () => {
    // Due moduli con stesso modello
    fs.writeFileSync(path.join(testModulesDir, 'module1.prisma'), `
model DuplicateModel {
  id String @id @default(cuid())
}
`);
    
    fs.writeFileSync(path.join(testModulesDir, 'module2.prisma'), `
model DuplicateModel {
  id String @id @default(cuid())
}
`);
    
    const result = await builder.build();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Duplicate model definition');
  });
  
  test('creates backup of existing schema', async () => {
    // Crea schema esistente
    fs.writeFileSync(testOutputFile, 'existing schema content');
    
    // Crea modulo valido
    fs.writeFileSync(path.join(testModulesDir, 'test.prisma'), `
model TestModel {
  id String @id @default(cuid())
}
`);
    
    await builder.build();
    
    // Verifica che il backup sia stato creato
    const backupDir = path.join(path.dirname(testOutputFile), 'backups');
    expect(fs.existsSync(backupDir)).toBe(true);
    
    const backupFiles = fs.readdirSync(backupDir);
    expect(backupFiles.length).toBeGreaterThan(0);
    expect(backupFiles[0]).toMatch(/schema-.*\.prisma/);
  });
});
```

#### 8.5.2 Test Versioning
```javascript
// tests/versioning.test.js
const VersionManager = require('../scripts/version-schema');
const { getCurrentVersion, isBreakingChange, getMigrationPath } = require('../prisma/version');

describe('Schema Versioning', () => {
  test('gets current version', () => {
    const version = getCurrentVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
  
  test('detects breaking changes', () => {
    const isBreaking = isBreakingChange('1.0.0', '2.0.0');
    expect(isBreaking).toBe(true);
    
    const isNotBreaking = isBreakingChange('1.0.0', '1.1.0');
    expect(isNotBreaking).toBe(false);
  });
  
  test('calculates migration path', () => {
    const migrations = getMigrationPath('1.0.0', '2.0.0');
    expect(Array.isArray(migrations)).toBe(true);
    expect(migrations.length).toBeGreaterThan(0);
  });
});
```

### 8.6 Integrazione CI/CD

#### 8.6.1 GitHub Actions per Schema
```yaml
# .github/workflows/schema-validation.yml
name: Schema Validation

on:
  push:
    paths:
      - 'backend/prisma/modules/**'
      - 'backend/scripts/build-schema.js'
  pull_request:
    paths:
      - 'backend/prisma/modules/**'
      - 'backend/scripts/build-schema.js'

jobs:
  validate-schema:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Build schema
      run: |
        cd backend
        npm run schema:build
    
    - name: Validate schema
      run: |
        cd backend
        npx prisma validate
    
    - name: Check for changes
      run: |
        if [ -n "$(git diff --name-only)" ]; then
          echo "Schema changes detected:"
          git diff --name-only
          git diff
          exit 1
        fi
    
    - name: Run schema tests
      run: |
        cd backend
        npm test -- tests/schema-build.test.js
        npm test -- tests/versioning.test.js
```

## ✅ Criteri di Completamento

### Checklist Tecnica
- [ ] **Moduli Creati**: Tutti i moduli schema creati e organizzati
- [ ] **Build System**: Script di build funzionante e testato
- [ ] **Validazione**: Sistema di validazione dipendenze implementato
- [ ] **Versioning**: Sistema di versioning completo
- [ ] **Backup**: Sistema di backup automatico
- [ ] **CI/CD**: Integrazione con pipeline CI/CD
- [ ] **Documentazione**: Documentazione moduli aggiornata
- [ ] **Testing**: Test completi per build e versioning
- [ ] **NPM Scripts**: Script NPM per gestione schema
- [ ] **Rollback**: Procedure di rollback testate

### Checklist Funzionale
- [ ] **Manutenibilità**: Schema più facile da mantenere
- [ ] **Collaborazione**: Workflow team migliorato
- [ ] **Deployment**: Gestione versioni in ambienti diversi
- [ ] **Performance**: Nessun impatto negativo sulle performance
- [ ] **Compatibilità**: Compatibilità con Prisma Client esistente

### Checklist Funzionale
- [ ] **Manutenibilità**: Schema più facile da mantenere
- [ ] **Collaborazione**: Workflow team migliorato
- [ ] **Deployment**: Gestione versioni in ambienti diversi
- [ ] **Organizzazione**: Struttura logica e comprensibile
- [ ] **Documentazione**: Auto-documentazione efficace

## ⚠️ Rischi e Mitigazioni

### Rischi Identificati

1. **Complessità Build Process**
   - *Rischio*: Build process troppo complesso
   - *Mitigazione*: Script semplici e ben documentati
   - *Monitoraggio*: Test automatici del build

2. **Dipendenze Circolari**
   - *Rischio*: Dipendenze circolari tra moduli
   - *Mitigazione*: Validazione automatica dipendenze
   - *Monitoraggio*: Analisi grafo dipendenze

3. **Sincronizzazione Team**
   - *Rischio*: Conflitti tra modifiche parallele
   - *Mitigazione*: Workflow Git ben definito
   - *Monitoraggio*: Review obbligatorie

4. **Performance Build**
   - *Rischio*: Build lento con molti moduli
   - *Mitigazione*: Caching e build incrementale
   - *Monitoraggio*: Metriche tempo di build

5. **Compatibilità Versioni**
   - *Rischio*: Breaking changes non gestiti
   - *Mitigazione*: Sistema versioning rigoroso
   - *Monitoraggio*: Test compatibilità automatici

## 📊 Metriche di Successo

### Metriche Tecniche
- **Tempo Build**: < 30 secondi
- **Dimensione Moduli**: < 500 righe per modulo
- **Copertura Test**: > 90%
- **Errori Build**: 0 errori in produzione
- **Tempo Validazione**: < 10 secondi

### Metriche Qualitative
- **Facilità Manutenzione**: Survey team sviluppo
- **Comprensibilità**: Tempo onboarding nuovi sviluppatori
- **Produttività**: Velocità implementazione nuove feature
- **Qualità Codice**: Riduzione bug schema-related

## 🔄 Prossimi Passi

### Immediate (Post Fase 8)
1. **Fase 9**: Middleware & Logging
2. **Fase 10**: Pulizia Generale
3. **Testing Integrazione**: Test completi sistema
4. **Documentazione**: Aggiornamento guide sviluppo

### Medio Termine
1. **Automazione Avanzata**: Build automatico su commit
2. **Metriche Avanzate**: Dashboard qualità schema
3. **Integrazione IDE**: Plugin per sviluppo moduli
4. **Template Moduli**: Template per nuovi moduli

### Lungo Termine
1. **Schema Registry**: Registry centralizzato versioni
2. **Migrazione Automatica**: Tool migrazione automatica
3. **Validazione Semantica**: Validazione business rules
4. **Performance Monitoring**: Monitoring performance schema

---

## 📝 Note Implementazione

### Ordine di Implementazione
1. **Setup Struttura**: Creazione directory e file base
2. **Moduli Base**: Implementazione moduli core
3. **Build System**: Sviluppo script di build
4. **Versioning**: Sistema di versioning
5. **Testing**: Test completi sistema
6. **CI/CD**: Integrazione pipeline
7. **Documentazione**: Guide e procedure
8. **Training**: Formazione team

### Considerazioni Speciali
- **Backup**: Backup completo prima di iniziare
- **Rollback**: Piano di rollback dettagliato
- **Comunicazione**: Comunicazione chiara al team
- **Gradualità**: Implementazione graduale per ridurre rischi

---

*Documento creato il: 2024-01-15*  
*Versione: 1.0*  
*Autore: Sistema di Ottimizzazione Schema Prisma*  
*Prossima revisione: Post-implementazione Fase 8*