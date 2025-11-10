# Database Schema - Sistema Template Management

**Data**: 4 Novembre 2025  
**Versione**: 1.0  
**Status**: ✅ SCHEMA DEFINITIVO

---

## 📋 Indice

1. [Schema Overview](#schema-overview)
2. [Enums](#enums)
3. [Core Models](#core-models)
4. [Enhanced Existing Models](#enhanced-existing-models)
5. [Relations Diagram](#relations-diagram)
6. [Indexes Strategy](#indexes-strategy)
7. [Migration Scripts](#migration-scripts)
8. [Data Migration](#data-migration)

---

## 🗂️ Schema Overview

### New Models
- `TemplateVersion` - Version history tracking
- `GeneratedDocument` - Unified document tracking

### Enhanced Models
- `TemplateLink` - Core template management (enhanced)
- `Attestato` - Certificate generation (enhanced)
- `LetteraIncarico` - Letter of engagement (enhanced)
- `RegistroPresenze` - Attendance register (enhanced)

### New Enums
- `TemplateType` - Document type classification
- `TemplateFormat` - Template file format
- `DocumentStatus` - Document lifecycle status

---

## 📊 Enums

### TemplateType

```prisma
enum TemplateType {
  LETTER_OF_ENGAGEMENT    // Lettera di Incarico
  ATTENDANCE_REGISTER     // Registro Presenze
  CERTIFICATE            // Attestato
  INVOICE                // Fattura
  COURSE_PROGRAM         // Programma Corso
  CUSTOM                 // Template personalizzato
}
```

**Usage**: Categorizza i template per tipo di documento generato

**Business Rules**:
- Un template può avere un solo tipo
- Il tipo determina i markers disponibili
- Default templates devono essere unici per tipo per tenant

### TemplateFormat

```prisma
enum TemplateFormat {
  HTML              // HTML con CSS inline
  DOCX              // Microsoft Word
  GOOGLE_DOCS       // Google Docs (import)
  GOOGLE_SLIDES     // Google Slides (import)
}
```

**Usage**: Specifica il formato sorgente del template

**Business Rules**:
- HTML è il formato primario per generation
- DOCX/GOOGLE_DOCS vengono convertiti in HTML
- La conversione è one-way (import only)

### DocumentStatus

```prisma
enum DocumentStatus {
  DRAFT             // Bozza (non ancora generato)
  GENERATED         // Generato e salvato
  SENT              // Inviato via email
  ARCHIVED          // Archiviato (dopo X anni)
}
```

**Usage**: Traccia il lifecycle del documento generato

**Business Rules**:
- DRAFT → GENERATED è automatico alla generation
- GENERATED → SENT quando inviato via email
- GENERATED → ARCHIVED dopo retention period
- Non può tornare indietro negli stati

---

## 🗄️ Core Models

### TemplateLink (Enhanced)

```prisma
model TemplateLink {
  // ============================================
  // PRIMARY FIELDS
  // ============================================
  id                String              @id @default(uuid())
  name              String              // Nome visualizzato (es: "Attestato Antincendio")
  type              TemplateType        // Tipo documento
  fileFormat        TemplateFormat?     // Formato sorgente
  
  // ============================================
  // CONTENT FIELDS
  // ============================================
  content           String?             @db.Text  // Contenuto HTML principale
  header            String?             @db.Text  // Header del documento
  footer            String?             @db.Text  // Footer del documento
  
  // ============================================
  // LAYOUT & STYLING
  // ============================================
  styles            Json?               // CSS configuration
  // Example: { "fontSize": "12px", "fontFamily": "Arial", "lineHeight": "1.5" }
  
  layout            Json?               // Page layout settings
  // Example: { 
  //   "pageSize": "A4", 
  //   "orientation": "portrait",
  //   "margins": { "top": 20, "right": 20, "bottom": 20, "left": 20 }
  // }
  
  logoImage         String?             // Logo URL/path o base64
  logoPosition      String?             // "top-left" | "top-center" | "top-right"
  
  // ============================================
  // MARKER CONFIGURATION
  // ============================================
  markers           Json?               // Available markers definition
  // Example: [
  //   { "key": "participant.fullName", "label": "Nome Completo", "type": "string" },
  //   { "key": "course.title", "label": "Titolo Corso", "type": "string" }
  // ]
  
  markerSchema      Json?               // Validation schema per markers
  // Example: {
  //   "participant.fullName": { "required": true, "maxLength": 100 },
  //   "course.duration": { "type": "number", "min": 1 }
  // }
  
  // ============================================
  // VERSIONING
  // ============================================
  version           Int                 @default(1)
  isActive          Boolean             @default(true)
  isDefault         Boolean             @default(false)
  
  // ============================================
  // GOOGLE INTEGRATION
  // ============================================
  googleDocsUrl     String?             // URL del Google Doc sorgente
  lastSyncedAt      DateTime?           // Ultimo sync con Google Docs
  syncEnabled       Boolean             @default(false)
  
  // ============================================
  // METADATA
  // ============================================
  description       String?             // Descrizione del template
  category          String?             // Categoria (es: "Sicurezza", "Amministrativo")
  tags              String[]            @default([])  // Tags per ricerca
  
  // ============================================
  // LEGACY FIELDS (mantenuti per compatibilità)
  // ============================================
  url               String?             // DEPRECATED: usare content
  
  // ============================================
  // MULTI-TENANT & AUDIT
  // ============================================
  companyId         String?             // Null = template globale per tenant
  tenantId          String
  createdBy         String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  deletedAt         DateTime?           // Soft delete
  
  // ============================================
  // RELATIONS
  // ============================================
  company           Company?            @relation(fields: [companyId], references: [id])
  tenant            Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  creator           Person?             @relation("TemplateCreator", fields: [createdBy], references: [id])
  
  // New relations
  versions          TemplateVersion[]
  generatedDocs     GeneratedDocument[]
  
  // Relations to existing document models
  attestati         Attestato[]
  lettereIncarico   LetteraIncarico[]
  registriPresenze  RegistroPresenze[]
  
  // ============================================
  // INDEXES
  // ============================================
  @@index([tenantId])
  @@index([tenantId, type])
  @@index([tenantId, type, isActive])
  @@index([companyId])
  @@index([isDefault, type])
  @@index([deletedAt])
  @@index([createdAt])
}
```

**Business Rules**:
1. `isDefault` = true può esistere solo uno per `(tenantId, type)`
2. `isActive` = false nasconde il template dalla UI ma mantiene i documenti generati
3. `version` auto-incrementa ad ogni save
4. `googleDocsUrl` + `syncEnabled` = true → sync automatico ogni 6 ore
5. `deletedAt` != null → soft delete, i documenti generati restano

### TemplateVersion

```prisma
model TemplateVersion {
  // ============================================
  // PRIMARY FIELDS
  // ============================================
  id              String        @id @default(uuid())
  templateId      String
  version         Int           // Version number (1, 2, 3, ...)
  
  // ============================================
  // CONTENT SNAPSHOT
  // ============================================
  content         String        @db.Text  // Snapshot del content
  header          String?       @db.Text  // Snapshot del header
  footer          String?       @db.Text  // Snapshot del footer
  styles          Json?         // Snapshot degli styles
  layout          Json?         // Snapshot del layout
  markers         Json?         // Snapshot dei markers
  
  // ============================================
  // CHANGE TRACKING
  // ============================================
  changesSummary  String?       // "Aggiunto header, modificati 3 markers"
  changeDetails   Json?         // Detailed diff
  // Example: {
  //   "added": ["{{participant.company.name}}"],
  //   "removed": ["{{old.marker}}"],
  //   "modified": {
  //     "header": { "from": "...", "to": "..." }
  //   }
  // }
  
  // ============================================
  // METADATA
  // ============================================
  createdBy       String
  createdAt       DateTime      @default(now())
  tenantId        String
  
  // ============================================
  // RELATIONS
  // ============================================
  template        TemplateLink  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  creator         Person        @relation("VersionCreator", fields: [createdBy], references: [id])
  tenant          Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // ============================================
  // CONSTRAINTS & INDEXES
  // ============================================
  @@unique([templateId, version])
  @@index([templateId, createdAt])
  @@index([tenantId])
}
```

**Business Rules**:
1. Version è sequenziale per template (1, 2, 3, ...)
2. Ogni save di TemplateLink crea una nuova TemplateVersion
3. `changesSummary` è auto-generato dal diff
4. Non si può cancellare una version (cascade delete solo se template cancellato)
5. Rollback = copy content da vecchia version a template + incrementa version

### GeneratedDocument

```prisma
model GeneratedDocument {
  // ============================================
  // PRIMARY FIELDS
  // ============================================
  id              String          @id @default(uuid())
  
  // ============================================
  // TEMPLATE REFERENCE
  // ============================================
  templateId      String
  templateVersion Int             // Version del template usata
  type            TemplateType    // Denormalized per query performance
  
  // ============================================
  // ENTITY REFERENCE
  // ============================================
  entityType      String          // "schedule", "person", "enrollment"
  entityId        String          // UUID dell'entità
  
  // ============================================
  // FILE INFORMATION
  // ============================================
  filename        String          // "attestato-001-2025.pdf"
  filepath        String          // "documents/2025/11/attestato-001-2025.pdf"
  fileUrl         String          // URL pubblico o signed URL
  fileSize        Int             // Bytes
  fileHash        String?         // SHA-256 per integrità
  mimeType        String          @default("application/pdf")
  
  // ============================================
  // GENERATION CONTEXT
  // ============================================
  markers         Json            // Actual data used for generation
  // Example: {
  //   "participant": { "fullName": "Mario Rossi", "fiscalCode": "RSSMRA80..." },
  //   "course": { "title": "Corso Antincendio", "duration": "16 ore" }
  // }
  
  metadata        Json?           // Additional metadata
  // Example: {
  //   "generationTime": 2.5,
  //   "pdfPages": 1,
  //   "templateName": "Attestato Antincendio"
  // }
  
  status          DocumentStatus  @default(GENERATED)
  
  // ============================================
  // BATCH REFERENCE
  // ============================================
  batchId         String?         // Null se singolo, UUID se batch
  batchSize       Int?            // Total docs in batch
  batchIndex      Int?            // Position in batch (1, 2, 3, ...)
  
  // ============================================
  // DELIVERY TRACKING
  // ============================================
  sentAt          DateTime?       // Quando inviato via email
  sentTo          String?         // Email addresses (comma-separated)
  downloadCount   Int             @default(0)
  lastDownloadAt  DateTime?
  
  // ============================================
  // AUDIT
  // ============================================
  generatedBy     String
  generatedAt     DateTime        @default(now())
  tenantId        String
  deletedAt       DateTime?
  
  // ============================================
  // RELATIONS
  // ============================================
  template        TemplateLink    @relation(fields: [templateId], references: [id])
  generator       Person          @relation("DocumentGenerator", fields: [generatedBy], references: [id])
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // ============================================
  // INDEXES
  // ============================================
  @@index([templateId])
  @@index([entityType, entityId])
  @@index([tenantId, generatedAt])
  @@index([generatedBy])
  @@index([batchId])
  @@index([status])
  @@index([type, status])
  @@index([deletedAt])
}
```

**Business Rules**:
1. `entityType` + `entityId` identifica l'entità sorgente (CourseSchedule, Person, etc.)
2. `markers` contiene i dati EFFETTIVI usati (per audit e regeneration)
3. `batchId` collega documenti generati in batch
4. `downloadCount` incrementa ad ogni download (per analytics)
5. `fileHash` usato per detect duplicates e integrità
6. `status` workflow: DRAFT → GENERATED → SENT → ARCHIVED

---

## 🔄 Enhanced Existing Models

### Attestato (Enhanced)

```prisma
model Attestato {
  // ============================================
  // EXISTING FIELDS
  // ============================================
  id                String         @id @default(uuid())
  personId          String
  scheduledCourseId String
  fileName          String
  fileUrl           String
  annoProgressivo   Int
  numeroProgressivo Int
  generatedAt       DateTime       @default(now())
  
  // ============================================
  // NEW FIELDS - Template Integration
  // ============================================
  templateId        String?         // Reference to TemplateLink
  templateVersion   Int?            // Version used for generation
  markers           Json?           // Data used for generation
  generatedBy       String?         // User who generated
  fileSize          Int?            // File size in bytes
  
  // ============================================
  // AUDIT (existing)
  // ============================================
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  deletedAt         DateTime?
  tenantId          String
  
  // ============================================
  // RELATIONS (existing)
  // ============================================
  person            Person         @relation(fields: [personId], references: [id], onDelete: Cascade)
  scheduledCourse   CourseSchedule @relation(fields: [scheduledCourseId], references: [id], onDelete: Cascade)
  tenant            Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // NEW relation
  template          TemplateLink?  @relation(fields: [templateId], references: [id])
  
  // ============================================
  // INDEXES (existing + new)
  // ============================================
  @@index([personId])
  @@index([scheduledCourseId])
  @@index([tenantId])
  @@index([templateId])          // NEW
  @@index([annoProgressivo])
  @@index([deletedAt])
}
```

**Migration Strategy**:
```sql
-- Add new columns
ALTER TABLE "Attestato" 
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "templateVersion" INTEGER,
  ADD COLUMN "markers" JSONB,
  ADD COLUMN "generatedBy" TEXT,
  ADD COLUMN "fileSize" INTEGER;

-- Set default template for existing attestati
UPDATE "Attestato"
SET "templateId" = (
  SELECT id FROM "TemplateLink" 
  WHERE type = 'CERTIFICATE' 
    AND "isDefault" = true 
    AND "tenantId" = "Attestato"."tenantId"
  LIMIT 1
)
WHERE "templateId" IS NULL;
```

### LetteraIncarico (Enhanced)

```prisma
model LetteraIncarico {
  // ============================================
  // EXISTING FIELDS
  // ============================================
  id                String         @id @default(uuid())
  scheduledCourseId String
  trainerId         String
  nomeFile          String
  url               String
  dataGenerazione   DateTime       @default(now())
  numeroProgressivo Int
  annoProgressivo   Int
  
  // ============================================
  // NEW FIELDS - Template Integration
  // ============================================
  templateId        String?
  templateVersion   Int?
  markers           Json?
  generatedBy       String?
  fileSize          Int?
  
  // ============================================
  // AUDIT (existing)
  // ============================================
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  deletedAt         DateTime?
  tenantId          String
  
  // ============================================
  // RELATIONS (existing)
  // ============================================
  scheduledCourse   CourseSchedule @relation(fields: [scheduledCourseId], references: [id], onDelete: Cascade)
  trainer           Person         @relation(fields: [trainerId], references: [id], onDelete: Cascade)
  tenant            Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // NEW relation
  template          TemplateLink?  @relation(fields: [templateId], references: [id])
  
  // ============================================
  // CONSTRAINTS & INDEXES
  // ============================================
  @@unique([scheduledCourseId, trainerId])  // One letter per trainer per schedule
  @@index([scheduledCourseId])
  @@index([trainerId])
  @@index([tenantId])
  @@index([templateId])          // NEW
  @@index([deletedAt])
}
```

**Business Rules**:
1. `@@unique([scheduledCourseId, trainerId])` previene duplicate
2. Se re-generate, old record viene soft-deleted
3. `numeroProgressivo` è sequenziale per anno

### RegistroPresenze (Enhanced)

```prisma
model RegistroPresenze {
  // ============================================
  // EXISTING FIELDS
  // ============================================
  id                String                         @id @default(uuid())
  scheduledCourseId String
  sessionId         String                         // Linked to specific session
  formatoreId       String
  nomeFile          String
  url               String
  dataGenerazione   DateTime                       @default(now())
  numeroProgressivo Int
  annoProgressivo   Int
  
  // ============================================
  // NEW FIELDS - Template Integration
  // ============================================
  templateId        String?
  templateVersion   Int?
  markers           Json?
  generatedBy       String?
  fileSize          Int?
  
  // ============================================
  // AUDIT (existing)
  // ============================================
  createdAt         DateTime                       @default(now())
  updatedAt         DateTime                       @updatedAt
  deletedAt         DateTime?
  tenantId          String
  
  // ============================================
  // RELATIONS (existing)
  // ============================================
  scheduledCourse   CourseSchedule                 @relation(fields: [scheduledCourseId], references: [id], onDelete: Cascade)
  session           CourseSession                  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  formatore         Person                         @relation(fields: [formatoreId], references: [id], onDelete: Cascade)
  tenant            Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  presenti          RegistroPresenzePartecipante[]
  
  // NEW relation
  template          TemplateLink?                  @relation(fields: [templateId], references: [id])
  
  // ============================================
  // INDEXES
  // ============================================
  @@index([scheduledCourseId])
  @@index([sessionId])
  @@index([formatoreId])
  @@index([tenantId])
  @@index([templateId])          // NEW
  @@index([deletedAt])
}
```

**Business Rules**:
1. One registro per session
2. `presenti` lista viene auto-populated da `CourseEnrollment` con status COMPLETED
3. Landscape A4 layout per default

---

## 📐 Relations Diagram

```
┌─────────────────────┐
│   TemplateLink      │
│  (Core Template)    │
└──────────┬──────────┘
           │
           │ 1:N
           ├──────────────────┐
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌─────────────────────┐
│ TemplateVersion  │  │ GeneratedDocument   │
│  (History)       │  │  (Unified Tracker)  │
└──────────────────┘  └─────────────────────┘
           │                  
           │ 1:N              
           ├──────┬──────┬─────────┐
           │      │      │         │
           ▼      ▼      ▼         ▼
    ┌──────────┐ ┌────────────┐ ┌──────────────┐
    │Attestato │ │LetteraInca │ │RegistroPres  │
    │          │ │rico        │ │enze          │
    └──────────┘ └────────────┘ └──────────────┘
           │              │              │
           │ N:1          │ N:1          │ N:1
           ▼              ▼              ▼
    ┌──────────────────────────────────────┐
    │         CourseSchedule               │
    │                                      │
    └──────────────────────────────────────┘
```

### Key Relationships

1. **TemplateLink → TemplateVersion** (1:N)
   - Ogni template ha multiple versioni
   - Cascade delete: cancellare template cancella le versioni

2. **TemplateLink → GeneratedDocument** (1:N)
   - Traccia tutti i documenti generati da un template
   - Cascade: NO (documenti restano anche se template cancellato)

3. **TemplateLink → Attestato/LetteraIncarico/RegistroPresenze** (1:N)
   - Optional relationship per backward compatibility
   - Null = documento generato prima del nuovo sistema

4. **GeneratedDocument → TemplateLink** (N:1)
   - Reference al template usato
   - Include version snapshot

---

## 🔍 Indexes Strategy

### Performance Indexes

```prisma
// TemplateLink indexes
@@index([tenantId])                      // Filter by tenant
@@index([tenantId, type])                // Filter by tenant + type
@@index([tenantId, type, isActive])      // Active templates per type
@@index([companyId])                     // Company-specific templates
@@index([isDefault, type])               // Find default templates
@@index([deletedAt])                     // Exclude soft-deleted
@@index([createdAt])                     // Sort by creation

// TemplateVersion indexes
@@index([templateId, createdAt])         // Version history chronological
@@index([tenantId])                      // Tenant isolation

// GeneratedDocument indexes
@@index([templateId])                    // Documents per template
@@index([entityType, entityId])          // Documents per entity
@@index([tenantId, generatedAt])         // Recent documents per tenant
@@index([generatedBy])                   // Documents per user
@@index([batchId])                       // Batch documents
@@index([status])                        // Documents by status
@@index([type, status])                  // Composite for analytics
@@index([deletedAt])                     // Exclude soft-deleted

// Enhanced model indexes
@@index([templateId])                    // NEW on Attestato, LetteraIncarico, RegistroPresenze
```

### Query Optimization Examples

```prisma
// Query 1: Get active templates for a type
// Uses: @@index([tenantId, type, isActive])
SELECT * FROM "TemplateLink"
WHERE "tenantId" = 'xxx'
  AND "type" = 'CERTIFICATE'
  AND "isActive" = true
  AND "deletedAt" IS NULL;

// Query 2: Get recent documents for schedule
// Uses: @@index([entityType, entityId])
SELECT * FROM "GeneratedDocument"
WHERE "entityType" = 'schedule'
  AND "entityId" = 'schedule-uuid'
ORDER BY "generatedAt" DESC;

// Query 3: Get batch documents
// Uses: @@index([batchId])
SELECT * FROM "GeneratedDocument"
WHERE "batchId" = 'batch-uuid'
ORDER BY "batchIndex";

// Query 4: Analytics: documents per template per month
// Uses: @@index([templateId, generatedAt])
SELECT "templateId", COUNT(*), DATE_TRUNC('month', "generatedAt")
FROM "GeneratedDocument"
WHERE "tenantId" = 'xxx'
GROUP BY "templateId", DATE_TRUNC('month', "generatedAt");
```

---

## 🔄 Migration Scripts

### Step 1: Create Enums

**File**: `prisma/migrations/YYYYMMDDHHMMSS_add_template_enums/migration.sql`

```sql
-- Create TemplateType enum
CREATE TYPE "TemplateType" AS ENUM (
  'LETTER_OF_ENGAGEMENT',
  'ATTENDANCE_REGISTER',
  'CERTIFICATE',
  'INVOICE',
  'COURSE_PROGRAM',
  'CUSTOM'
);

-- Create TemplateFormat enum
CREATE TYPE "TemplateFormat" AS ENUM (
  'HTML',
  'DOCX',
  'GOOGLE_DOCS',
  'GOOGLE_SLIDES'
);

-- Create DocumentStatus enum
CREATE TYPE "DocumentStatus" AS ENUM (
  'DRAFT',
  'GENERATED',
  'SENT',
  'ARCHIVED'
);
```

### Step 2: Alter TemplateLink

**File**: `prisma/migrations/YYYYMMDDHHMMSS_enhance_template_link/migration.sql`

```sql
-- Add new columns to TemplateLink
ALTER TABLE "TemplateLink"
  -- Enum conversions
  ADD COLUMN "type_new" "TemplateType",
  ADD COLUMN "fileFormat_new" "TemplateFormat",
  
  -- New fields
  ADD COLUMN "styles" JSONB,
  ADD COLUMN "layout" JSONB,
  ADD COLUMN "markers" JSONB,
  ADD COLUMN "markerSchema" JSONB,
  ADD COLUMN "version" INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN "isActive" BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
  ADD COLUMN "syncEnabled" BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "createdBy" TEXT;

-- Migrate existing type values
UPDATE "TemplateLink"
SET "type_new" = CASE 
  WHEN "type" = 'lettera_incarico' THEN 'LETTER_OF_ENGAGEMENT'::"TemplateType"
  WHEN "type" = 'attestato' OR "type" = 'attestati' THEN 'CERTIFICATE'::"TemplateType"
  WHEN "type" = 'registro_presenze' THEN 'ATTENDANCE_REGISTER'::"TemplateType"
  WHEN "type" = 'fattura' THEN 'INVOICE'::"TemplateType"
  WHEN "type" = 'programma_corso' THEN 'COURSE_PROGRAM'::"TemplateType"
  ELSE 'CUSTOM'::"TemplateType"
END;

-- Migrate fileFormat
UPDATE "TemplateLink"
SET "fileFormat_new" = CASE 
  WHEN "fileFormat" IS NULL THEN NULL
  WHEN LOWER("fileFormat") = 'html' THEN 'HTML'::"TemplateFormat"
  WHEN LOWER("fileFormat") = 'docx' THEN 'DOCX'::"TemplateFormat"
  WHEN LOWER("fileFormat") = 'google_docs' THEN 'GOOGLE_DOCS'::"TemplateFormat"
  ELSE 'HTML'::"TemplateFormat"
END;

-- Drop old columns and rename new ones
ALTER TABLE "TemplateLink"
  DROP COLUMN "type",
  DROP COLUMN "fileFormat";

ALTER TABLE "TemplateLink"
  RENAME COLUMN "type_new" TO "type";

ALTER TABLE "TemplateLink"
  RENAME COLUMN "fileFormat_new" TO "fileFormat";

-- Set NOT NULL constraint on type
ALTER TABLE "TemplateLink"
  ALTER COLUMN "type" SET NOT NULL;

-- Create indexes
CREATE INDEX "TemplateLink_tenantId_type_idx" ON "TemplateLink"("tenantId", "type");
CREATE INDEX "TemplateLink_tenantId_type_isActive_idx" ON "TemplateLink"("tenantId", "type", "isActive");
CREATE INDEX "TemplateLink_isDefault_type_idx" ON "TemplateLink"("isDefault", "type");
CREATE INDEX "TemplateLink_createdAt_idx" ON "TemplateLink"("createdAt");
```

### Step 3: Create New Models

**File**: `prisma/migrations/YYYYMMDDHHMMSS_create_template_versions/migration.sql`

```sql
-- Create TemplateVersion table
CREATE TABLE "TemplateVersion" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "header" TEXT,
  "footer" TEXT,
  "styles" JSONB,
  "layout" JSONB,
  "markers" JSONB,
  "changesSummary" TEXT,
  "changeDetails" JSONB,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT NOT NULL,
  
  CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
ALTER TABLE "TemplateVersion"
  ADD CONSTRAINT "TemplateVersion_templateId_version_key" 
  UNIQUE ("templateId", "version");

-- Create indexes
CREATE INDEX "TemplateVersion_templateId_createdAt_idx" ON "TemplateVersion"("templateId", "createdAt");
CREATE INDEX "TemplateVersion_tenantId_idx" ON "TemplateVersion"("tenantId");

-- Add foreign keys
ALTER TABLE "TemplateVersion"
  ADD CONSTRAINT "TemplateVersion_templateId_fkey" 
  FOREIGN KEY ("templateId") REFERENCES "TemplateLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TemplateVersion"
  ADD CONSTRAINT "TemplateVersion_createdBy_fkey" 
  FOREIGN KEY ("createdBy") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TemplateVersion"
  ADD CONSTRAINT "TemplateVersion_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**File**: `prisma/migrations/YYYYMMDDHHMMSS_create_generated_documents/migration.sql`

```sql
-- Create GeneratedDocument table
CREATE TABLE "GeneratedDocument" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "type" "TemplateType" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "filepath" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileHash" TEXT,
  "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
  "markers" JSONB NOT NULL,
  "metadata" JSONB,
  "status" "DocumentStatus" NOT NULL DEFAULT 'GENERATED',
  "batchId" TEXT,
  "batchSize" INTEGER,
  "batchIndex" INTEGER,
  "sentAt" TIMESTAMP(3),
  "sentTo" TEXT,
  "downloadCount" INTEGER NOT NULL DEFAULT 0,
  "lastDownloadAt" TIMESTAMP(3),
  "generatedBy" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  
  CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "GeneratedDocument_templateId_idx" ON "GeneratedDocument"("templateId");
CREATE INDEX "GeneratedDocument_entityType_entityId_idx" ON "GeneratedDocument"("entityType", "entityId");
CREATE INDEX "GeneratedDocument_tenantId_generatedAt_idx" ON "GeneratedDocument"("tenantId", "generatedAt");
CREATE INDEX "GeneratedDocument_generatedBy_idx" ON "GeneratedDocument"("generatedBy");
CREATE INDEX "GeneratedDocument_batchId_idx" ON "GeneratedDocument"("batchId");
CREATE INDEX "GeneratedDocument_status_idx" ON "GeneratedDocument"("status");
CREATE INDEX "GeneratedDocument_type_status_idx" ON "GeneratedDocument"("type", "status");
CREATE INDEX "GeneratedDocument_deletedAt_idx" ON "GeneratedDocument"("deletedAt");

-- Add foreign keys
ALTER TABLE "GeneratedDocument"
  ADD CONSTRAINT "GeneratedDocument_templateId_fkey" 
  FOREIGN KEY ("templateId") REFERENCES "TemplateLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GeneratedDocument"
  ADD CONSTRAINT "GeneratedDocument_generatedBy_fkey" 
  FOREIGN KEY ("generatedBy") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GeneratedDocument"
  ADD CONSTRAINT "GeneratedDocument_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Step 4: Enhance Existing Models

**File**: `prisma/migrations/YYYYMMDDHHMMSS_enhance_existing_document_models/migration.sql`

```sql
-- Enhance Attestato
ALTER TABLE "Attestato"
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "templateVersion" INTEGER,
  ADD COLUMN "markers" JSONB,
  ADD COLUMN "generatedBy" TEXT,
  ADD COLUMN "fileSize" INTEGER;

CREATE INDEX "Attestato_templateId_idx" ON "Attestato"("templateId");

ALTER TABLE "Attestato"
  ADD CONSTRAINT "Attestato_templateId_fkey" 
  FOREIGN KEY ("templateId") REFERENCES "TemplateLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enhance LetteraIncarico
ALTER TABLE "LetteraIncarico"
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "templateVersion" INTEGER,
  ADD COLUMN "markers" JSONB,
  ADD COLUMN "generatedBy" TEXT,
  ADD COLUMN "fileSize" INTEGER;

CREATE INDEX "LetteraIncarico_templateId_idx" ON "LetteraIncarico"("templateId");

ALTER TABLE "LetteraIncarico"
  ADD CONSTRAINT "LetteraIncarico_templateId_fkey" 
  FOREIGN KEY ("templateId") REFERENCES "TemplateLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enhance RegistroPresenze
ALTER TABLE "RegistroPresenze"
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "templateVersion" INTEGER,
  ADD COLUMN "markers" JSONB,
  ADD COLUMN "generatedBy" TEXT,
  ADD COLUMN "fileSize" INTEGER;

CREATE INDEX "RegistroPresenze_templateId_idx" ON "RegistroPresenze"("templateId");

ALTER TABLE "RegistroPresenze"
  ADD CONSTRAINT "RegistroPresenze_templateId_fkey" 
  FOREIGN KEY ("templateId") REFERENCES "TemplateLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 📊 Data Migration

### Create Default Templates

**File**: `backend/scripts/create-default-templates.js`

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDefaultTemplates() {
  const tenants = await prisma.tenant.findMany();

  for (const tenant of tenants) {
    // 1. Attestato default template
    await prisma.templateLink.upsert({
      where: {
        tenantId_type_isDefault: {
          tenantId: tenant.id,
          type: 'CERTIFICATE',
          isDefault: true,
        },
      },
      create: {
        name: 'Attestato Standard',
        type: 'CERTIFICATE',
        fileFormat: 'HTML',
        content: `
          <div style="border: 2px solid #3B82F6; padding: 40px; text-align: center;">
            <h1 style="color: #3B82F6; font-size: 32px;">ATTESTATO DI PARTECIPAZIONE</h1>
            <p style="font-size: 18px; margin-top: 30px;">
              Si attesta che <strong>{{participant.fullName}}</strong>
            </p>
            <p style="font-size: 16px;">
              nato/a a {{participant.birthPlace}} il {{participant.birthDate|date:DD/MM/YYYY}}
            </p>
            <p style="font-size: 16px;">
              C.F. {{participant.fiscalCode}}
            </p>
            <p style="font-size: 18px; margin-top: 30px;">
              ha partecipato al corso
            </p>
            <h2 style="color: #3B82F6; font-size: 24px;">{{course.title}}</h2>
            <p style="font-size: 16px;">
              della durata di {{course.duration}}, svoltosi presso {{schedule.location}}
            </p>
            <p style="font-size: 16px;">
              dal {{schedule.startDate|date:DD/MM/YYYY}} al {{schedule.endDate|date:DD/MM/YYYY}}
            </p>
            <p style="font-size: 14px; margin-top: 50px;">
              Attestato n. {{certificate.progressiveNumber}}/{{system.currentYear}}
            </p>
            <p style="font-size: 14px;">
              Data di emissione: {{system.currentDate}}
            </p>
          </div>
        `,
        isDefault: true,
        tenantId: tenant.id,
      },
      update: {},
    });

    // 2. Lettera Incarico default template
    await prisma.templateLink.upsert({
      where: {
        tenantId_type_isDefault: {
          tenantId: tenant.id,
          type: 'LETTER_OF_ENGAGEMENT',
          isDefault: true,
        },
      },
      create: {
        name: 'Lettera di Incarico Standard',
        type: 'LETTER_OF_ENGAGEMENT',
        fileFormat: 'HTML',
        content: `
          <div style="padding: 40px;">
            <p style="text-align: right;">Data: {{system.currentDate}}</p>
            
            <p style="margin-top: 40px;">
              Spett.le<br>
              <strong>{{trainer.fullName}}</strong><br>
              {{trainer.email}}
            </p>
            
            <h2 style="margin-top: 40px;">LETTERA DI INCARICO</h2>
            
            <p style="margin-top: 20px;">
              Con la presente Le confermiamo l'incarico per lo svolgimento del corso:
            </p>
            
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ccc;">
                <td style="padding: 10px; font-weight: bold;">Corso:</td>
                <td style="padding: 10px;">{{course.title}}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ccc;">
                <td style="padding: 10px; font-weight: bold;">Durata:</td>
                <td style="padding: 10px;">{{course.duration}}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ccc;">
                <td style="padding: 10px; font-weight: bold;">Sede:</td>
                <td style="padding: 10px;">{{schedule.location}}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ccc;">
                <td style="padding: 10px; font-weight: bold;">Date:</td>
                <td style="padding: 10px;">
                  dal {{schedule.startDate|date:DD/MM/YYYY}} 
                  al {{schedule.endDate|date:DD/MM/YYYY}}
                </td>
              </tr>
            </table>
            
            <p style="margin-top: 40px;">
              Cordiali saluti
            </p>
            
            <p style="margin-top: 60px;">
              _____________________<br>
              Firma per accettazione
            </p>
          </div>
        `,
        isDefault: true,
        tenantId: tenant.id,
      },
      update: {},
    });

    // 3. Registro Presenze default template
    await prisma.templateLink.upsert({
      where: {
        tenantId_type_isDefault: {
          tenantId: tenant.id,
          type: 'ATTENDANCE_REGISTER',
          isDefault: true,
        },
      },
      create: {
        name: 'Registro Presenze Standard',
        type: 'ATTENDANCE_REGISTER',
        fileFormat: 'HTML',
        layout: {
          orientation: 'landscape',
        },
        content: `
          <div style="padding: 20px;">
            <h2 style="text-align: center;">REGISTRO PRESENZE</h2>
            
            <table style="width: 100%; margin-top: 20px;">
              <tr>
                <td><strong>Corso:</strong> {{course.title}}</td>
                <td><strong>Data:</strong> {{session.date|date:DD/MM/YYYY}}</td>
              </tr>
              <tr>
                <td><strong>Orario:</strong> {{session.startTime}} - {{session.endTime}}</td>
                <td><strong>Docente:</strong> {{trainer.fullName}}</td>
              </tr>
            </table>
            
            <table style="width: 100%; margin-top: 30px; border-collapse: collapse; border: 1px solid #000;">
              <thead>
                <tr style="background-color: #f0f0f0;">
                  <th style="border: 1px solid #000; padding: 10px;">#</th>
                  <th style="border: 1px solid #000; padding: 10px;">Cognome e Nome</th>
                  <th style="border: 1px solid #000; padding: 10px;">Codice Fiscale</th>
                  <th style="border: 1px solid #000; padding: 10px;">Firma</th>
                  <th style="border: 1px solid #000; padding: 10px;">Ore</th>
                </tr>
              </thead>
              <tbody>
                {{#each participants}}
                <tr>
                  <td style="border: 1px solid #000; padding: 10px; text-align: center;">{{@index}}</td>
                  <td style="border: 1px solid #000; padding: 10px;">{{fullName}}</td>
                  <td style="border: 1px solid #000; padding: 10px;">{{fiscalCode}}</td>
                  <td style="border: 1px solid #000; padding: 10px; height: 40px;"></td>
                  <td style="border: 1px solid #000; padding: 10px; text-align: center;">{{session.hours}}</td>
                </tr>
                {{/each}}
              </tbody>
            </table>
          </div>
        `,
        isDefault: true,
        tenantId: tenant.id,
      },
      update: {},
    });

    console.log(`✅ Created default templates for tenant: ${tenant.name}`);
  }
}

createDefaultTemplates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Link Existing Documents

```javascript
// Link existing Attestati to default template
async function linkExistingAttestati() {
  const attestati = await prisma.attestato.findMany({
    where: { templateId: null },
    include: { tenant: true },
  });

  for (const attestato of attestati) {
    const defaultTemplate = await prisma.templateLink.findFirst({
      where: {
        tenantId: attestato.tenantId,
        type: 'CERTIFICATE',
        isDefault: true,
      },
    });

    if (defaultTemplate) {
      await prisma.attestato.update({
        where: { id: attestato.id },
        data: {
          templateId: defaultTemplate.id,
          templateVersion: defaultTemplate.version,
        },
      });
    }
  }

  console.log(`✅ Linked ${attestati.length} existing attestati`);
}
```

---

## ✅ Validation & Testing

### Schema Validation Checklist

- [ ] All enums created
- [ ] All new fields added with correct types
- [ ] All indexes created
- [ ] All foreign keys set up
- [ ] Cascade delete rules correct
- [ ] Default values set
- [ ] Unique constraints working
- [ ] Migration runs without errors
- [ ] Rollback script tested
- [ ] Default templates created
- [ ] Existing data migrated

### Performance Testing

```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM "TemplateLink"
WHERE "tenantId" = 'xxx'
  AND "type" = 'CERTIFICATE'
  AND "isActive" = true
  AND "deletedAt" IS NULL;

-- Should use index: TemplateLink_tenantId_type_isActive_idx
```

---

**Document Owner**: Database Engineer  
**Last Review**: 4 Novembre 2025  
**Status**: ✅ SCHEMA COMPLETO - Ready for Migration
