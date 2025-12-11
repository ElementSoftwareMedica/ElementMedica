# Schema Prisma - Diff Report

**Data**: 18 Novembre 2025  
**Comparazione**: backend copia vs backend  
**Obiettivo**: Identificare campi e modelli mancanti

---

## 📊 Executive Summary

### Modelli Presenti Solo in Backend Copia
1. ✅ **SEOConfig** - Configurazione SEO completa
2. ✅ **Sitemap** - Gestione sitemap XML

### Campi Mancanti in Backend (Presenti in Backend Copia)

#### ⚠️ **Course Model**
```prisma
// MANCA in backend
seoId String? @unique
seo   SEOConfig? @relation(fields: [seoId], references: [id], onDelete: SetNull)
```
**Impatto**: Impossibile collegare corsi a configurazione SEO

#### ⚠️ **form_fields Model**
```prisma
// MANCANO in backend
sectionId            String?        
entityMapping        Json?          
scoring              Json?          
enableCapacityLimit  Boolean? @default(false)
enableQuizMode       Boolean? @default(false)

// INDEX mancante
@@index([sectionId])
```
**Impatto**: 
- No sezioni organizzate nei form
- No entity mapping (Person/Company)
- No scoring per quiz/test
- No limiti capacità per opzioni

#### ⚠️ **form_templates Model**
```prisma
// MANCANO in backend
settings       Json? // Template settings (passingScore, maxScore, timeLimit)
isPublic       Boolean @default(false)
allowAnonymous Boolean @default(false)

// INDEX mancanti
@@index([isPublic])
```
**Impatto**:
- No configurazione quiz/test
- No form pubblici senza autenticazione
- No controllo submission anonime

#### ⚠️ **ContactSubmission Model**
**Campi extra in backend copia (già integrati nei progetti avanzati)**:
```prisma
templateId          String?
formSchema          Json?
formData            Json?
validationRules     Json?
conditionalFields   Json?
autoCreatePerson    Boolean? @default(false)
createdPersonId     String?
formVersion         Int? @default(1)
isTemplate          Boolean? @default(false)
templateName        String?
score               Float?
maxScore            Float?
passed              Boolean?

// INDEX mancanti
@@index([createdPersonId])
@@index([formVersion])
@@index([isTemplate])
@@index([templateName])

// RELAZIONE mancante
persons_contact_submissions_createdPersonIdTopersons Person?
```
**Impatto**: Sistema submission completo già presente in backend copia

---

## 🔧 Modifiche Necessarie

### Fase 1: Aggiunta Modelli Mancanti

#### 1.1 Aggiungere Model SEOConfig
```prisma
model SEOConfig {
  id String @id @default(uuid())

  // Entity Relations (one-to-one optional)
  pageId   String? @unique
  courseId String? @unique

  // Basic SEO
  title        String
  description  String   @db.Text
  keywords     String[]
  canonicalUrl String?
  noindex      Boolean  @default(false)
  nofollow     Boolean  @default(false)

  // Open Graph
  ogTitle       String?
  ogDescription String? @db.Text
  ogImage       String?
  ogType        String? @default("website")

  // Twitter Card
  twitterCard    String? @default("summary_large_image")
  twitterSite    String?
  twitterCreator String?
  twitterImage   String?

  // Structured Data (JSON-LD)
  structuredData Json?

  // Multi-language (hreflang)
  hreflang Json?

  // Performance hints
  preloadImages String[]

  // Audit
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  page   CMSPage? // One-to-one from CMSPage side
  course Course[]  // One-to-many con Course
  tenant Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([pageId])
  @@index([courseId])
  @@map("seo_configs")
}
```

#### 1.2 Aggiungere Model Sitemap
```prisma
model Sitemap {
  id String @id @default(uuid())

  // URL info
  url        String
  changefreq String // 'always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'
  priority   Float    @default(0.5)
  lastmod    DateTime @default(now())

  // Entity tracking
  entityType String // 'page', 'course', 'blog', etc.
  entityId   String

  // Publishing
  isPublic Boolean @default(true)

  // Audit
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([url, tenantId])
  @@index([tenantId, isPublic])
  @@index([entityType, entityId])
  @@index([lastmod])
  @@map("sitemaps")
}
```

### Fase 2: Modifica Model Course
```prisma
model Course {
  // ... campi esistenti ...
  
  // AGGIUNGERE:
  seoId String? @unique
  seo   SEOConfig? @relation(fields: [seoId], references: [id], onDelete: SetNull)
}
```

### Fase 3: Modifica Model form_fields
```prisma
model form_fields {
  id             String         @id
  templateId     String
  name           String
  label          String
  type           String
  required       Boolean        @default(false)
  placeholder    String?
  helpText       String?
  options        Json?
  validation     Json?
  conditional    Json?
  
  // AGGIUNGERE:
  sectionId            String?
  entityMapping        Json?
  scoring              Json?
  enableCapacityLimit  Boolean? @default(false)
  enableQuizMode       Boolean? @default(false)
  
  order          Int            @default(0)
  isActive       Boolean        @default(true)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @default(now())
  form_templates form_templates @relation(fields: [templateId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([templateId, name])
  @@index([isActive])
  @@index([order])
  @@index([templateId])
  @@index([sectionId]) // NUOVO INDEX
}
```

### Fase 4: Modifica Model form_templates
```prisma
model form_templates {
  id                String         @id
  name              String
  description       String?
  type              SubmissionType
  schema            Json
  validationRules   Json?
  conditionalFields Json?
  
  // AGGIUNGERE:
  settings          Json?
  isPublic          Boolean @default(false)
  allowAnonymous    Boolean @default(false)
  
  isActive          Boolean        @default(true)
  version           Int            @default(1)
  tenantId          String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @default(now())
  deletedAt         DateTime?
  createdById       String?
  form_fields       form_fields[]
  persons           Person?        @relation(fields: [createdById], references: [id], onUpdate: NoAction)
  tenants           Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([tenantId, name, version])
  @@index([isActive])
  @@index([name])
  @@index([tenantId])
  @@index([type])
  @@index([isPublic]) // NUOVO INDEX
}
```

### Fase 5: Modifica Model ContactSubmission
```prisma
model ContactSubmission {
  // ... campi esistenti ...
  
  // AGGIUNGERE:
  templateId          String?
  formSchema          Json?
  formData            Json?
  validationRules     Json?
  conditionalFields   Json?
  autoCreatePerson    Boolean? @default(false)
  createdPersonId     String?
  formVersion         Int? @default(1)
  isTemplate          Boolean? @default(false)
  templateName        String?
  score               Float?
  maxScore            Float?
  passed              Boolean?
  
  // ... relazioni esistenti ...
  
  // AGGIUNGERE RELAZIONE:
  createdPerson Person? @relation("ContactSubmissionCreatedPerson", fields: [createdPersonId], references: [id])
  
  // AGGIUNGERE INDEX:
  @@index([createdPersonId])
  @@index([formVersion])
  @@index([isTemplate])
  @@index([templateName])
}
```

### Fase 6: Modifica Model Tenant (per relazioni)
```prisma
model Tenant {
  // ... campi e relazioni esistenti ...
  
  // AGGIUNGERE:
  seoConfigs SEOConfig[]
  sitemaps   Sitemap[]
}
```

---

## 📝 Strategy: CamelCase Implementation

### Approccio Consigliato
**NON modificare i nomi delle tabelle database** per mantenere backward compatibility.

### Usare `@map()` per mapping
```prisma
// ❌ SBAGLIATO - richiede migration distruttive
model FormTemplate {
  id String @id
  @@map("form_templates")
}

// ✅ CORRETTO - mantiene tabelle esistenti
model form_templates {
  id String @id
  // Prisma client genererà: prisma.form_templates
}
```

### Best Practice
1. **Mantenere nomi snake_case** per tabelle (`@@map("form_templates")`)
2. **Mantenere nomi snake_case** per colonne con dati esistenti
3. **Nuove colonne**: usare camelCase con `@map()` se necessario
4. **Relazioni Prisma**: generano automaticamente client in camelCase

---

## ⚠️ Breaking Changes: NESSUNO

Tutte le modifiche sono **additive**:
- ✅ Nessuna colonna eliminata
- ✅ Nessuna tabella rinominata
- ✅ Nessun tipo di dato modificato
- ✅ Nessuna relazione eliminata
- ✅ Solo aggiunte di campi opzionali (nullable o con default)

---

## 🚀 Migration Script Preview

```sql
-- Add SEOConfig table
CREATE TABLE "seo_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pageId" TEXT,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "keywords" TEXT[],
  "canonicalUrl" TEXT,
  "noindex" BOOLEAN NOT NULL DEFAULT false,
  "nofollow" BOOLEAN NOT NULL DEFAULT false,
  "ogTitle" TEXT,
  "ogDescription" TEXT,
  "ogImage" TEXT,
  "ogType" TEXT DEFAULT 'website',
  "twitterCard" TEXT DEFAULT 'summary_large_image',
  "twitterSite" TEXT,
  "twitterCreator" TEXT,
  "twitterImage" TEXT,
  "structuredData" JSONB,
  "hreflang" JSONB,
  "preloadImages" TEXT[],
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "seo_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "seo_configs_pageId_key" ON "seo_configs"("pageId");
CREATE UNIQUE INDEX "seo_configs_courseId_key" ON "seo_configs"("courseId");
CREATE INDEX "seo_configs_tenantId_idx" ON "seo_configs"("tenantId");
CREATE INDEX "seo_configs_pageId_idx" ON "seo_configs"("pageId");
CREATE INDEX "seo_configs_courseId_idx" ON "seo_configs"("courseId");

-- Add Sitemap table
CREATE TABLE "sitemaps" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "url" TEXT NOT NULL,
  "changefreq" TEXT NOT NULL,
  "priority" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "lastmod" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sitemaps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "sitemaps_url_tenantId_key" ON "sitemaps"("url", "tenantId");
CREATE INDEX "sitemaps_tenantId_isPublic_idx" ON "sitemaps"("tenantId", "isPublic");
CREATE INDEX "sitemaps_entityType_entityId_idx" ON "sitemaps"("entityType", "entityId");
CREATE INDEX "sitemaps_lastmod_idx" ON "sitemaps"("lastmod");

-- Add fields to courses
ALTER TABLE "courses" ADD COLUMN "seoId" TEXT;
CREATE UNIQUE INDEX "courses_seoId_key" ON "courses"("seoId");
ALTER TABLE "courses" ADD CONSTRAINT "courses_seoId_fkey" 
  FOREIGN KEY ("seoId") REFERENCES "seo_configs"("id") ON DELETE SET NULL;

-- Add fields to form_fields
ALTER TABLE "form_fields" ADD COLUMN "sectionId" TEXT;
ALTER TABLE "form_fields" ADD COLUMN "entityMapping" JSONB;
ALTER TABLE "form_fields" ADD COLUMN "scoring" JSONB;
ALTER TABLE "form_fields" ADD COLUMN "enableCapacityLimit" BOOLEAN DEFAULT false;
ALTER TABLE "form_fields" ADD COLUMN "enableQuizMode" BOOLEAN DEFAULT false;
CREATE INDEX "form_fields_sectionId_idx" ON "form_fields"("sectionId");

-- Add fields to form_templates
ALTER TABLE "form_templates" ADD COLUMN "settings" JSONB;
ALTER TABLE "form_templates" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "form_templates" ADD COLUMN "allowAnonymous" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "form_templates_isPublic_idx" ON "form_templates"("isPublic");

-- Add fields to contact_submissions
ALTER TABLE "contact_submissions" ADD COLUMN "templateId" TEXT;
ALTER TABLE "contact_submissions" ADD COLUMN "formSchema" JSONB;
ALTER TABLE "contact_submissions" ADD COLUMN "formData" JSONB;
ALTER TABLE "contact_submissions" ADD COLUMN "validationRules" JSONB;
ALTER TABLE "contact_submissions" ADD COLUMN "conditionalFields" JSONB;
ALTER TABLE "contact_submissions" ADD COLUMN "autoCreatePerson" BOOLEAN DEFAULT false;
ALTER TABLE "contact_submissions" ADD COLUMN "createdPersonId" TEXT;
ALTER TABLE "contact_submissions" ADD COLUMN "formVersion" INTEGER DEFAULT 1;
ALTER TABLE "contact_submissions" ADD COLUMN "isTemplate" BOOLEAN DEFAULT false;
ALTER TABLE "contact_submissions" ADD COLUMN "templateName" TEXT;
ALTER TABLE "contact_submissions" ADD COLUMN "score" DOUBLE PRECISION;
ALTER TABLE "contact_submissions" ADD COLUMN "maxScore" DOUBLE PRECISION;
ALTER TABLE "contact_submissions" ADD COLUMN "passed" BOOLEAN;

CREATE INDEX "contact_submissions_createdPersonId_idx" ON "contact_submissions"("createdPersonId");
CREATE INDEX "contact_submissions_formVersion_idx" ON "contact_submissions"("formVersion");
CREATE INDEX "contact_submissions_isTemplate_idx" ON "contact_submissions"("isTemplate");
CREATE INDEX "contact_submissions_templateName_idx" ON "contact_submissions"("templateName");

ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_createdPersonId_fkey"
  FOREIGN KEY ("createdPersonId") REFERENCES "persons"("id");
```

---

## ✅ Validation Checklist

Prima di eseguire migration:
- [ ] Backup database completo
- [ ] Backup schema.prisma
- [ ] Test migration in development
- [ ] Verifica nessun DROP column/table
- [ ] Verifica tutte le FK sono corrette
- [ ] Verifica tutti gli INDEX sono ottimizzati
- [ ] Test rollback script preparato

Dopo migration:
- [ ] `npx prisma generate` successful
- [ ] Backend compila senza errori
- [ ] Existing queries funzionano
- [ ] Nuove queries funzionano
- [ ] Seed.js aggiornato per nuovi campi

---

## 📊 Impatto Stimato

| Area | Impatto | Mitigazione |
|------|---------|-------------|
| **Database** | Basso | Solo aggiunte, no modifiche esistenti |
| **Backend API** | Medio | Aggiornare controllers per nuovi campi |
| **Frontend** | Medio | Aggiornare componenti per nuove features |
| **Performance** | Basso | Nuovi indici migliorano query |
| **Downtime** | Zero | Migration online-compatible |

---

**Fine Diff Report**
