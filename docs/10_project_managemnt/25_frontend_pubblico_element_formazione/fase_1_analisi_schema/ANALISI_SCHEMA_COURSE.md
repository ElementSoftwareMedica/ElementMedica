# 📊 Fase 1: Analisi Schema Course Attuale
**Progetto 25 - Frontend Pubblico Element Formazione**

## 🔍 Schema Course Corrente

### 📋 Struttura Attuale
```prisma
model Course {
  id              String           @id @default(uuid())
  title           String           // ✅ Manteniamo
  category        String?          // ✅ Manteniamo
  description     String?          // ✅ Manteniamo (descrizione interna)
  duration        String?          // ✅ Manteniamo
  certifications  String?          // ✅ Manteniamo
  code            String?          @unique // ✅ Manteniamo
  contents        String?          // ✅ Manteniamo
  maxPeople       Int?             // ✅ Manteniamo
  pricePerPerson  Float?           // ✅ Manteniamo
  regulation      String?          // ✅ Manteniamo
  renewalDuration String?          // ✅ Manteniamo
  validityYears   Int?             // ✅ Manteniamo
  tenantId        String           // ✅ Manteniamo
  status          CourseStatus?    @default(DRAFT) // ✅ Manteniamo
  createdAt       DateTime         @default(now()) // ✅ Manteniamo
  deletedAt       DateTime?        // ✅ Manteniamo (soft delete)
  updatedAt       DateTime         @default(now()) @updatedAt // ✅ Manteniamo
  
  // Relazioni esistenti
  tenant          Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  schedules       CourseSchedule[]
}
```

### 🎯 Campi da Aggiungere

#### 1. **Varianti Rischio**
```prisma
riskLevel        RiskLevel?       // ALTO, MEDIO, BASSO, A, B, C
```
- **Scopo**: Gestire varianti rischio unificate
- **Valori**: Alto/Medio/Basso oppure A/B/C
- **Nullable**: Sì (non tutti i corsi hanno varianti rischio)

#### 2. **Tipologia Corso**
```prisma
courseType       CourseType?      // PRIMO_CORSO, AGGIORNAMENTO
```
- **Scopo**: Distinguere primo corso da aggiornamento
- **Valori**: PRIMO_CORSO, AGGIORNAMENTO
- **Nullable**: Sì (alcuni corsi potrebbero non avere questa distinzione)

#### 3. **Sottocategoria**
```prisma
subcategory      String?          // Campo futuro per classificazioni aggiuntive
```
- **Scopo**: Classificazioni future più granulari
- **Tipo**: String libero
- **Nullable**: Sì (campo per uso futuro)

#### 4. **Contenuti Frontend Pubblico**
```prisma
shortDescription String?          // Descrizione breve per card corso
fullDescription  String?          // Descrizione completa per pagina dettaglio
image1Url        String?          // Prima immagine corso
image2Url        String?          // Seconda immagine corso
isPublic         Boolean          @default(false) // Visibilità frontend pubblico
```

#### 5. **SEO e Routing**
```prisma
seoTitle         String?          // Titolo SEO personalizzato
seoDescription   String?          // Meta description SEO
slug             String?          @unique // URL-friendly identifier
```

### 🔧 Nuovi Enum Necessari

#### RiskLevel Enum
```prisma
enum RiskLevel {
  ALTO
  MEDIO
  BASSO
  A
  B
  C
}
```

#### CourseType Enum
```prisma
enum CourseType {
  PRIMO_CORSO
  AGGIORNAMENTO
}
```

### 📊 Schema Course Esteso Finale

```prisma
model Course {
  // === CAMPI ESISTENTI ===
  id              String           @id @default(uuid())
  title           String
  category        String?
  description     String?          // Descrizione interna/amministrativa
  duration        String?
  certifications  String?
  code            String?          @unique
  contents        String?
  maxPeople       Int?
  pricePerPerson  Float?
  regulation      String?
  renewalDuration String?
  validityYears   Int?
  tenantId        String
  status          CourseStatus?    @default(DRAFT)
  createdAt       DateTime         @default(now())
  deletedAt       DateTime?
  updatedAt       DateTime         @default(now()) @updatedAt
  
  // === NUOVI CAMPI ===
  // Varianti e tipologie
  riskLevel        RiskLevel?       // Alto/Medio/Basso o A/B/C
  courseType       CourseType?      // Primo corso / Aggiornamento
  subcategory      String?          // Classificazione futura
  
  // Contenuti frontend pubblico
  shortDescription String?          // Descrizione breve per card
  fullDescription  String?          // Descrizione completa per dettaglio
  image1Url        String?          // Prima immagine
  image2Url        String?          // Seconda immagine
  isPublic         Boolean          @default(false) // Visibilità pubblica
  
  // SEO e routing
  seoTitle         String?          // Titolo SEO
  seoDescription   String?          // Meta description
  slug             String?          @unique // URL-friendly
  
  // === RELAZIONI ESISTENTI ===
  tenant          Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  schedules       CourseSchedule[]

  // === INDICI ESISTENTI ===
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([status, createdAt])
  
  // === NUOVI INDICI ===
  @@index([isPublic])
  @@index([slug])
  @@index([riskLevel])
  @@index([courseType])
  @@index([category, riskLevel])
  @@index([isPublic, status])
}
```

## 🔄 Migrazione Database

### 📝 Script Migrazione
```sql
-- Aggiunta nuovi enum
CREATE TYPE "RiskLevel" AS ENUM ('ALTO', 'MEDIO', 'BASSO', 'A', 'B', 'C');
CREATE TYPE "CourseType" AS ENUM ('PRIMO_CORSO', 'AGGIORNAMENTO');

-- Aggiunta nuovi campi alla tabella Course
ALTER TABLE "Course" ADD COLUMN "riskLevel" "RiskLevel";
ALTER TABLE "Course" ADD COLUMN "courseType" "CourseType";
ALTER TABLE "Course" ADD COLUMN "subcategory" TEXT;
ALTER TABLE "Course" ADD COLUMN "shortDescription" TEXT;
ALTER TABLE "Course" ADD COLUMN "fullDescription" TEXT;
ALTER TABLE "Course" ADD COLUMN "image1Url" TEXT;
ALTER TABLE "Course" ADD COLUMN "image2Url" TEXT;
ALTER TABLE "Course" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Course" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Course" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "Course" ADD COLUMN "slug" TEXT;

-- Aggiunta constraint unique per slug
ALTER TABLE "Course" ADD CONSTRAINT "Course_slug_key" UNIQUE ("slug");

-- Creazione nuovi indici
CREATE INDEX "Course_isPublic_idx" ON "Course"("isPublic");
CREATE INDEX "Course_slug_idx" ON "Course"("slug");
CREATE INDEX "Course_riskLevel_idx" ON "Course"("riskLevel");
CREATE INDEX "Course_courseType_idx" ON "Course"("courseType");
CREATE INDEX "Course_category_riskLevel_idx" ON "Course"("category", "riskLevel");
CREATE INDEX "Course_isPublic_status_idx" ON "Course"("isPublic", "status");
```

## 🎯 Esempi di Utilizzo

### 📚 Esempi Corsi con Varianti

#### Corso Sicurezza - Varianti Rischio
```typescript
// Corso base
{
  title: "Sicurezza sui Luoghi di Lavoro",
  category: "Sicurezza",
  riskLevel: "MEDIO",
  courseType: "PRIMO_CORSO",
  duration: "8 ore",
  shortDescription: "Corso base per la sicurezza nei luoghi di lavoro",
  slug: "sicurezza-luoghi-lavoro-medio-primo"
}

// Variante aggiornamento
{
  title: "Sicurezza sui Luoghi di Lavoro - Aggiornamento",
  category: "Sicurezza", 
  riskLevel: "MEDIO",
  courseType: "AGGIORNAMENTO",
  duration: "4 ore",
  shortDescription: "Aggiornamento formazione sicurezza",
  slug: "sicurezza-luoghi-lavoro-medio-aggiornamento"
}

// Variante rischio alto
{
  title: "Sicurezza sui Luoghi di Lavoro",
  category: "Sicurezza",
  riskLevel: "ALTO", 
  courseType: "PRIMO_CORSO",
  duration: "16 ore",
  shortDescription: "Corso sicurezza per attività ad alto rischio",
  slug: "sicurezza-luoghi-lavoro-alto-primo"
}
```

#### Corso con Nomenclatura A/B/C
```typescript
{
  title: "Formazione Antincendio",
  category: "Antincendio",
  riskLevel: "A",
  courseType: "PRIMO_CORSO", 
  duration: "4 ore",
  shortDescription: "Formazione antincendio rischio A",
  slug: "formazione-antincendio-a-primo"
}
```

## 🔍 Query di Esempio

### 📋 Ricerca Corsi Pubblici
```typescript
// Tutti i corsi pubblici
const publicCourses = await prisma.course.findMany({
  where: {
    isPublic: true,
    status: 'PUBLISHED',
    deletedAt: null
  },
  select: {
    id: true,
    title: true,
    shortDescription: true,
    image1Url: true,
    riskLevel: true,
    courseType: true,
    duration: true,
    slug: true
  }
});

// Corsi per categoria e rischio
const coursesByRisk = await prisma.course.findMany({
  where: {
    category: 'Sicurezza',
    riskLevel: 'MEDIO',
    isPublic: true
  }
});

// Corso per slug (pagina dettaglio)
const courseDetail = await prisma.course.findUnique({
  where: { slug: 'sicurezza-luoghi-lavoro-medio-primo' },
  include: {
    schedules: {
      where: {
        startDate: { gte: new Date() },
        status: 'CONFIRMED'
      }
    }
  }
});
```

## ✅ Validazioni e Controlli

### 🔒 Business Rules
1. **Slug Unico**: Ogni corso deve avere uno slug unico
2. **Combinazioni Valide**: RiskLevel e CourseType devono essere coerenti
3. **Contenuti Pubblici**: Se isPublic=true, shortDescription è obbligatoria
4. **SEO**: Se isPublic=true, seoTitle e seoDescription raccomandati

### 🧪 Test di Validazione
```typescript
// Test combinazioni valide
describe('Course Validation', () => {
  it('should allow valid risk level combinations', () => {
    const validCombinations = [
      { riskLevel: 'ALTO', courseType: 'PRIMO_CORSO' },
      { riskLevel: 'MEDIO', courseType: 'AGGIORNAMENTO' },
      { riskLevel: 'A', courseType: 'PRIMO_CORSO' }
    ];
    // Test implementation
  });
  
  it('should require shortDescription for public courses', () => {
    const publicCourse = {
      isPublic: true,
      shortDescription: null
    };
    // Should fail validation
  });
});
```

## 📈 Impatto Performance

### 🚀 Ottimizzazioni
- **Indici Strategici**: Su campi di ricerca frequente
- **Lazy Loading**: Immagini caricate on-demand
- **Caching**: Cache query corsi pubblici
- **CDN**: Immagini servite via CDN

### 📊 Metriche Attese
- **Query Time**: < 100ms per lista corsi pubblici
- **Page Load**: < 2s per pagina dettaglio corso
- **Image Load**: < 1s per immagini ottimizzate

---

## ✅ Checklist Implementazione

- [ ] **Schema Prisma** - Aggiunta nuovi campi e enum
- [ ] **Migrazione DB** - Script migrazione testato
- [ ] **Validazioni** - Business rules implementate
- [ ] **Indici** - Performance ottimizzate
- [ ] **Test** - Copertura completa nuovi campi
- [ ] **Documentazione** - API documentation aggiornata

---

**Prossimo Step**: Implementazione modifiche schema Prisma e migrazione database