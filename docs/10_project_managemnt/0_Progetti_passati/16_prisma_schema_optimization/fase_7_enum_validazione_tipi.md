# 🎯 Fase 7: Enum & Validazione Tipi

## 📋 Obiettivi

### Obiettivi Primari
- **Conversione String → Enum**: Trasformare campi "status", "type", "mode" in enum dedicati
- **Validazione Tipi**: Implementare validazione robusta per tutti i tipi
- **Precisione Numerica**: Uniformare tipi Decimal con scala e precision coerenti
- **Array Optimization**: Valutare conversione array stringhe in relazioni o JSON validato
- **Type Safety**: Migliorare type safety lato client e server

### Obiettivi Secondari
- **Performance**: Ottimizzare query con enum indicizzati
- **Manutenibilità**: Ridurre errori di validazione runtime
- **Documentazione**: Auto-documentazione tramite enum

## 🎯 Task Dettagliati

### 7.1 Analisi Campi String da Convertire

#### 7.1.1 Inventario Campi Status/Type/Mode
```bash
# Script per identificare campi candidati per enum
grep -n "String.*status\|String.*type\|String.*mode" backend/prisma/schema.prisma
```

**Campi identificati per conversione:**

1. **PersonStatus** (già esistente - da verificare utilizzo)
   ```prisma
   enum PersonStatus {
     ACTIVE
     INACTIVE
     SUSPENDED
   }
   ```

2. **RoleType** (già esistente - da verificare completezza)
   ```prisma
   enum RoleType {
     ADMIN
     MANAGER
     USER
     TRAINER
     STUDENT
   }
   ```

3. **CourseStatus** (da creare)
   - Campi: `Course.status`, `CourseSchedule.status`
   - Valori: DRAFT, PUBLISHED, ACTIVE, COMPLETED, CANCELLED

4. **EnrollmentStatus** (da creare)
   - Campi: `CourseEnrollment.status`
   - Valori: PENDING, CONFIRMED, COMPLETED, CANCELLED, REFUNDED

5. **DocumentType** (da creare)
   - Campi: `TestDocument.type`, `Attestato.type`
   - Valori: CERTIFICATE, DIPLOMA, TRANSCRIPT, INVOICE, CONTRACT

6. **PaymentStatus** (da creare)
   - Campi: `Fattura.status`, `Preventivo.status`
   - Valori: DRAFT, SENT, PAID, OVERDUE, CANCELLED

7. **AttendanceStatus** (da creare)
   - Campi: `RegistroPresenze.status`
   - Valori: PRESENT, ABSENT, LATE, EXCUSED

#### 7.1.2 Analisi Valori Esistenti nel Database
```sql
-- Query per analizzare valori esistenti
SELECT DISTINCT status, COUNT(*) as count 
FROM "Course" 
WHERE status IS NOT NULL 
GROUP BY status 
ORDER BY count DESC;

SELECT DISTINCT status, COUNT(*) as count 
FROM "CourseEnrollment" 
WHERE status IS NOT NULL 
GROUP BY status 
ORDER BY count DESC;

-- Verifica per altri campi candidati
SELECT DISTINCT type, COUNT(*) as count 
FROM "TestDocument" 
WHERE type IS NOT NULL 
GROUP BY type 
ORDER BY count DESC;
```

### 7.2 Implementazione Enum nel Schema

#### 7.2.1 Definizione Enum Completi
```prisma
// Enum per stati dei corsi
enum CourseStatus {
  DRAFT      // Bozza, non pubblicato
  PUBLISHED  // Pubblicato ma non iniziato
  ACTIVE     // In corso
  COMPLETED  // Completato
  CANCELLED  // Cancellato
  SUSPENDED  // Sospeso temporaneamente
}

// Enum per stati delle iscrizioni
enum EnrollmentStatus {
  PENDING    // In attesa di conferma
  CONFIRMED  // Confermata
  ACTIVE     // Attiva (corso iniziato)
  COMPLETED  // Completata
  CANCELLED  // Cancellata
  REFUNDED   // Rimborsata
  EXPIRED    // Scaduta
}

// Enum per tipi di documento
enum DocumentType {
  CERTIFICATE    // Certificato
  DIPLOMA       // Diploma
  TRANSCRIPT    // Trascrizione
  INVOICE       // Fattura
  QUOTE         // Preventivo
  CONTRACT      // Contratto
  ATTENDANCE    // Registro presenze
  ASSIGNMENT    // Lettera incarico
}

// Enum per stati di pagamento
enum PaymentStatus {
  DRAFT     // Bozza
  SENT      // Inviato
  VIEWED    // Visualizzato
  ACCEPTED  // Accettato
  PAID      // Pagato
  OVERDUE   // Scaduto
  CANCELLED // Cancellato
  REFUNDED  // Rimborsato
}

// Enum per stati di presenza
enum AttendanceStatus {
  PRESENT   // Presente
  ABSENT    // Assente
  LATE      // In ritardo
  EXCUSED   // Giustificato
  PARTIAL   // Presenza parziale
}

// Enum per tipi di sessione
enum SessionType {
  LECTURE     // Lezione frontale
  WORKSHOP    // Workshop pratico
  EXAM        // Esame
  SEMINAR     // Seminario
  ONLINE      // Sessione online
  HYBRID      // Ibrida
}

// Enum per priorità
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// Enum per stati di notifica
enum NotificationStatus {
  PENDING
  SENT
  DELIVERED
  READ
  FAILED
}
```

#### 7.2.2 Aggiornamento Modelli con Enum
```prisma
// Course model aggiornato
model Course {
  id          String       @id @default(cuid())
  title       String
  description String?
  status      CourseStatus @default(DRAFT) // ✅ Enum invece di String
  startDate   DateTime?
  endDate     DateTime?
  maxStudents Int?
  price       Decimal?     @db.Decimal(10, 2)
  tenantId    String
  deletedAt   DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // Relazioni
  tenant      Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  schedules   CourseSchedule[]
  enrollments CourseEnrollment[]
  sessions    CourseSession[]
  
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, startDate])
}

// CourseEnrollment model aggiornato
model CourseEnrollment {
  id           String           @id @default(cuid())
  personId     String
  courseId     String
  status       EnrollmentStatus @default(PENDING) // ✅ Enum
  enrolledAt   DateTime         @default(now())
  completedAt  DateTime?
  grade        String?
  notes        String?
  tenantId     String
  deletedAt    DateTime?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  // Relazioni
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([tenantId, personId])
  @@index([tenantId, courseId])
  @@index([tenantId, status])
  @@unique([personId, courseId, tenantId])
}

// Fattura model aggiornato
model Fattura {
  id            String        @id @default(cuid())
  numero        String        @unique
  data          DateTime
  importo       Decimal       @db.Decimal(10, 2) // ✅ Precisione uniforme
  iva           Decimal       @db.Decimal(5, 2)  // ✅ Precisione per percentuali
  totale        Decimal       @db.Decimal(10, 2) // ✅ Precisione uniforme
  status        PaymentStatus @default(DRAFT)    // ✅ Enum
  scadenza      DateTime?
  pagataIl      DateTime?
  note          String?
  tenantId      String
  deletedAt     DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Relazioni
  tenant        Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  aziende       FatturaAzienda[]
  
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, data])
  @@index([numero])
}

// RegistroPresenze model aggiornato
model RegistroPresenze {
  id              String                            @id @default(cuid())
  courseId        String
  sessionDate     DateTime
  sessionType     SessionType                       @default(LECTURE) // ✅ Nuovo enum
  notes           String?
  tenantId        String
  deletedAt       DateTime?
  createdAt       DateTime                          @default(now())
  updatedAt       DateTime                          @updatedAt

  // Relazioni
  course          Course                            @relation(fields: [courseId], references: [id], onDelete: Cascade)
  tenant          Tenant                            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  partecipanti    RegistroPresenzePartecipante[]
  
  @@index([tenantId])
  @@index([tenantId, courseId])
  @@index([tenantId, sessionDate])
}

// RegistroPresenzePartecipante model aggiornato
model RegistroPresenzePartecipante {
  id                String           @id @default(cuid())
  registroId        String
  personId          String
  status            AttendanceStatus @default(PRESENT) // ✅ Enum
  arrivalTime       DateTime?
  departureTime     DateTime?
  notes             String?
  tenantId          String
  deletedAt         DateTime?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  // Relazioni
  registro RegistroPresenze @relation(fields: [registroId], references: [id], onDelete: Cascade)
  person   Person            @relation(fields: [personId], references: [id], onDelete: Cascade)
  tenant   Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([tenantId, registroId])
  @@index([tenantId, personId])
  @@index([tenantId, status])
  @@unique([registroId, personId, tenantId])
}
```

### 7.3 Precisione Numerica Uniforme

#### 7.3.1 Standardizzazione Tipi Decimal
```prisma
// Standardizzazione precisione numerica

// Importi monetari: Decimal(10,2) - fino a 99.999.999,99
model Fattura {
  importo    Decimal @db.Decimal(10, 2)
  totale     Decimal @db.Decimal(10, 2)
  // ...
}

model Preventivo {
  importo    Decimal @db.Decimal(10, 2)
  totale     Decimal @db.Decimal(10, 2)
  // ...
}

model Course {
  price      Decimal? @db.Decimal(10, 2)
  // ...
}

// Percentuali: Decimal(5,2) - fino a 999,99%
model Fattura {
  iva        Decimal @db.Decimal(5, 2)
  sconto     Decimal? @db.Decimal(5, 2)
  // ...
}

// Voti/Punteggi: Decimal(5,2) - fino a 999,99
model CourseEnrollment {
  finalGrade    Decimal? @db.Decimal(5, 2)
  attendance    Decimal? @db.Decimal(5, 2) // Percentuale presenza
  // ...
}

// Coordinate geografiche: Decimal(10,8)
model Company {
  latitude   Decimal? @db.Decimal(10, 8)
  longitude  Decimal? @db.Decimal(10, 8)
  // ...
}

// Durate in ore: Decimal(6,2) - fino a 9999,99 ore
model Course {
  duration   Decimal? @db.Decimal(6, 2)
  // ...
}

model CourseSession {
  duration   Decimal? @db.Decimal(6, 2)
  // ...
}
```

#### 7.3.2 Conversione Float → Decimal
```sql
-- Script di migrazione per convertire Float in Decimal
-- ATTENZIONE: Eseguire dopo backup completo

-- 1. Aggiungere nuove colonne Decimal
ALTER TABLE "Course" ADD COLUMN "price_new" DECIMAL(10,2);
ALTER TABLE "Course" ADD COLUMN "duration_new" DECIMAL(6,2);

-- 2. Copiare dati con conversione
UPDATE "Course" SET "price_new" = ROUND("price"::numeric, 2) WHERE "price" IS NOT NULL;
UPDATE "Course" SET "duration_new" = ROUND("duration"::numeric, 2) WHERE "duration" IS NOT NULL;

-- 3. Verificare integrità dati
SELECT COUNT(*) as total_records,
       COUNT("price") as price_records,
       COUNT("price_new") as price_new_records
FROM "Course";

-- 4. Rinominare colonne (dopo verifica)
ALTER TABLE "Course" DROP COLUMN "price";
ALTER TABLE "Course" RENAME COLUMN "price_new" TO "price";

ALTER TABLE "Course" DROP COLUMN "duration";
ALTER TABLE "Course" RENAME COLUMN "duration_new" TO "duration";
```

### 7.4 Gestione Array di Stringhe

#### 7.4.1 Analisi Array Esistenti
```bash
# Identificare campi array nel schema
grep -n "String\[\]" backend/prisma/schema.prisma
```

**Array identificati:**
- `Person.certifications` - Array di certificazioni
- `Person.specialties` - Array di specializzazioni
- `Course.tags` - Array di tag
- `Company.services` - Array di servizi

#### 7.4.2 Strategia di Conversione Array

**Opzione A: Modelli Relazionati (Raccomandato)**
```prisma
// Nuovo modello per certificazioni
model Certification {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  issuedBy    String?
  validYears  Int?     // Durata validità in anni
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relazioni
  personCertifications PersonCertification[]
}

// Tabella di collegamento Person-Certification
model PersonCertification {
  id             String        @id @default(cuid())
  personId       String
  certificationId String
  obtainedAt     DateTime      @default(now())
  expiresAt      DateTime?
  certificateUrl String?       // Link al certificato
  tenantId       String
  deletedAt      DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  // Relazioni
  person        Person        @relation(fields: [personId], references: [id], onDelete: Cascade)
  certification Certification @relation(fields: [certificationId], references: [id], onDelete: Cascade)
  tenant        Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([tenantId, personId])
  @@index([tenantId, certificationId])
  @@unique([personId, certificationId, tenantId])
}

// Nuovo modello per specializzazioni
model Specialty {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  category    String?  // Es: "Technical", "Soft Skills", "Management"
  level       String?  // Es: "Beginner", "Intermediate", "Advanced"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relazioni
  personSpecialties PersonSpecialty[]
}

// Tabella di collegamento Person-Specialty
model PersonSpecialty {
  id          String    @id @default(cuid())
  personId    String
  specialtyId String
  level       String?   // Livello di competenza
  yearsExp    Int?      // Anni di esperienza
  tenantId    String
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relazioni
  person    Person    @relation(fields: [personId], references: [id], onDelete: Cascade)
  specialty Specialty @relation(fields: [specialtyId], references: [id], onDelete: Cascade)
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([tenantId, personId])
  @@index([tenantId, specialtyId])
  @@unique([personId, specialtyId, tenantId])
}

// Aggiornamento Person model
model Person {
  id        String   @id @default(cuid())
  email     String
  firstName String
  lastName  String
  // certifications String[] // ❌ Rimosso
  // specialties    String[] // ❌ Rimosso
  tenantId  String
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Nuove relazioni
  certifications PersonCertification[] // ✅ Relazione
  specialties    PersonSpecialty[]     // ✅ Relazione
  
  // Altre relazioni esistenti...
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([tenantId, email])
  @@unique([email, tenantId])
}
```

**Opzione B: JSON Validato (Per dati semplici)**
```prisma
// Per array semplici che non necessitano relazioni
model Course {
  id          String   @id @default(cuid())
  title       String
  // tags     String[] // ❌ Rimosso
  tagsJson    Json?    // ✅ JSON validato
  // ...
}

// Validazione lato applicazione
// backend/utils/validators.js
const validateCourseTags = (tags) => {
  if (!Array.isArray(tags)) return false;
  if (tags.length > 10) return false; // Max 10 tag
  
  return tags.every(tag => 
    typeof tag === 'string' && 
    tag.length >= 2 && 
    tag.length <= 50 &&
    /^[a-zA-Z0-9\s-_]+$/.test(tag) // Solo caratteri alfanumerici
  );
};
```

### 7.5 Validazione Tipi Avanzata

#### 7.5.1 Validatori Prisma Custom
```javascript
// backend/utils/prisma-validators.js
const { z } = require('zod');

// Schema validazione per Person
const PersonCreateSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  dateOfBirth: z.date().max(new Date()).optional(),
  tenantId: z.string().cuid()
});

// Schema validazione per Course
const CourseCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
  startDate: z.date().min(new Date()).optional(),
  endDate: z.date().optional(),
  maxStudents: z.number().int().min(1).max(1000).optional(),
  price: z.number().min(0).max(999999.99).optional(),
  duration: z.number().min(0.5).max(9999.99).optional(),
  tenantId: z.string().cuid()
}).refine(data => {
  // Validazione custom: endDate deve essere dopo startDate
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

// Schema validazione per Fattura
const FatturaCreateSchema = z.object({
  numero: z.string().regex(/^[A-Z0-9-]+$/),
  data: z.date().max(new Date()),
  importo: z.number().min(0).max(99999999.99),
  iva: z.number().min(0).max(100),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'PAID', 'OVERDUE', 'CANCELLED']),
  scadenza: z.date().min(new Date()).optional(),
  tenantId: z.string().cuid()
}).refine(data => {
  // Calcolo automatico totale
  const totale = data.importo * (1 + data.iva / 100);
  return totale <= 99999999.99;
}, {
  message: "Total amount exceeds maximum allowed",
  path: ["importo"]
});

// Middleware di validazione
const validateInput = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedData = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
};

module.exports = {
  PersonCreateSchema,
  CourseCreateSchema,
  FatturaCreateSchema,
  validateInput
};
```

#### 7.5.2 Validazione Database-Level
```sql
-- Constraint a livello database per validazione aggiuntiva

-- Validazione email format
ALTER TABLE "Person" 
ADD CONSTRAINT "Person_email_format_check" 
CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validazione range date
ALTER TABLE "Course" 
ADD CONSTRAINT "Course_date_range_check" 
CHECK ("endDate" IS NULL OR "startDate" IS NULL OR "endDate" > "startDate");

-- Validazione importi positivi
ALTER TABLE "Fattura" 
ADD CONSTRAINT "Fattura_importo_positive_check" 
CHECK ("importo" >= 0);

ALTER TABLE "Fattura" 
ADD CONSTRAINT "Fattura_iva_range_check" 
CHECK ("iva" >= 0 AND "iva" <= 100);

-- Validazione numero fattura format
ALTER TABLE "Fattura" 
ADD CONSTRAINT "Fattura_numero_format_check" 
CHECK ("numero" ~ '^[A-Z0-9-]+$');

-- Validazione maxStudents
ALTER TABLE "Course" 
ADD CONSTRAINT "Course_maxStudents_positive_check" 
CHECK ("maxStudents" IS NULL OR "maxStudents" > 0);
```

### 7.6 Migrazione Dati per Enum

#### 7.6.1 Script di Migrazione Graduale
```sql
-- Migrazione graduale per evitare downtime

-- FASE 1: Aggiungere nuove colonne enum
ALTER TABLE "Course" ADD COLUMN "status_new" "CourseStatus";
ALTER TABLE "CourseEnrollment" ADD COLUMN "status_new" "EnrollmentStatus";
ALTER TABLE "Fattura" ADD COLUMN "status_new" "PaymentStatus";

-- FASE 2: Mappare valori esistenti
UPDATE "Course" 
SET "status_new" = CASE 
  WHEN "status" = 'draft' THEN 'DRAFT'
  WHEN "status" = 'published' THEN 'PUBLISHED'
  WHEN "status" = 'active' THEN 'ACTIVE'
  WHEN "status" = 'completed' THEN 'COMPLETED'
  WHEN "status" = 'cancelled' THEN 'CANCELLED'
  ELSE 'DRAFT'
END;

UPDATE "CourseEnrollment" 
SET "status_new" = CASE 
  WHEN "status" = 'pending' THEN 'PENDING'
  WHEN "status" = 'confirmed' THEN 'CONFIRMED'
  WHEN "status" = 'active' THEN 'ACTIVE'
  WHEN "status" = 'completed' THEN 'COMPLETED'
  WHEN "status" = 'cancelled' THEN 'CANCELLED'
  ELSE 'PENDING'
END;

UPDATE "Fattura" 
SET "status_new" = CASE 
  WHEN "status" = 'draft' THEN 'DRAFT'
  WHEN "status" = 'sent' THEN 'SENT'
  WHEN "status" = 'paid' THEN 'PAID'
  WHEN "status" = 'overdue' THEN 'OVERDUE'
  WHEN "status" = 'cancelled' THEN 'CANCELLED'
  ELSE 'DRAFT'
END;

-- FASE 3: Verificare migrazione
SELECT 
  "status" as old_status,
  "status_new" as new_status,
  COUNT(*) as count
FROM "Course" 
GROUP BY "status", "status_new"
ORDER BY count DESC;

-- FASE 4: Rendere NOT NULL e impostare default
UPDATE "Course" SET "status_new" = 'DRAFT' WHERE "status_new" IS NULL;
ALTER TABLE "Course" ALTER COLUMN "status_new" SET NOT NULL;
ALTER TABLE "Course" ALTER COLUMN "status_new" SET DEFAULT 'DRAFT';

-- FASE 5: Rinominare colonne (dopo verifica completa)
ALTER TABLE "Course" DROP COLUMN "status";
ALTER TABLE "Course" RENAME COLUMN "status_new" TO "status";

-- FASE 6: Aggiungere indici
CREATE INDEX CONCURRENTLY "Course_tenantId_status_idx" ON "Course"("tenantId", "status");
CREATE INDEX CONCURRENTLY "CourseEnrollment_tenantId_status_idx" ON "CourseEnrollment"("tenantId", "status");
```

#### 7.6.2 Script di Rollback
```sql
-- Script di rollback in caso di problemi

-- Ripristinare colonne String originali
ALTER TABLE "Course" ADD COLUMN "status_string" TEXT;

UPDATE "Course" 
SET "status_string" = CASE 
  WHEN "status" = 'DRAFT' THEN 'draft'
  WHEN "status" = 'PUBLISHED' THEN 'published'
  WHEN "status" = 'ACTIVE' THEN 'active'
  WHEN "status" = 'COMPLETED' THEN 'completed'
  WHEN "status" = 'CANCELLED' THEN 'cancelled'
  ELSE 'draft'
END;

ALTER TABLE "Course" DROP COLUMN "status";
ALTER TABLE "Course" RENAME COLUMN "status_string" TO "status";
```

## 🧪 Strategia di Testing

### 7.7 Test Enum e Validazione

#### 7.7.1 Test Enum Values
```javascript
// tests/enum-validation.test.js
describe('Enum Validation', () => {
  test('CourseStatus enum accepts valid values', async () => {
    const validStatuses = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    
    for (const status of validStatuses) {
      const course = await prisma.course.create({
        data: {
          title: `Test Course ${status}`,
          status,
          tenantId: testTenant.id
        }
      });
      
      expect(course.status).toBe(status);
    }
  });
  
  test('CourseStatus enum rejects invalid values', async () => {
    await expect(prisma.course.create({
      data: {
        title: 'Test Course',
        status: 'INVALID_STATUS',
        tenantId: testTenant.id
      }
    })).rejects.toThrow();
  });
  
  test('EnrollmentStatus transitions are valid', async () => {
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        personId: testPerson.id,
        courseId: testCourse.id,
        status: 'PENDING',
        tenantId: testTenant.id
      }
    });
    
    // Test valid transition: PENDING -> CONFIRMED
    const updated = await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'CONFIRMED' }
    });
    
    expect(updated.status).toBe('CONFIRMED');
  });
});
```

#### 7.7.2 Test Precisione Numerica
```javascript
// tests/decimal-precision.test.js
describe('Decimal Precision', () => {
  test('Fattura importo maintains precision', async () => {
    const fattura = await prisma.fattura.create({
      data: {
        numero: 'TEST-001',
        data: new Date(),
        importo: 1234.56,
        iva: 22.00,
        totale: 1506.16,
        status: 'DRAFT',
        tenantId: testTenant.id
      }
    });
    
    expect(fattura.importo.toNumber()).toBe(1234.56);
    expect(fattura.iva.toNumber()).toBe(22.00);
    expect(fattura.totale.toNumber()).toBe(1506.16);
  });
  
  test('Course price precision is maintained', async () => {
    const course = await prisma.course.create({
      data: {
        title: 'Test Course',
        price: 999.99,
        duration: 40.5,
        tenantId: testTenant.id
      }
    });
    
    expect(course.price.toNumber()).toBe(999.99);
    expect(course.duration.toNumber()).toBe(40.5);
  });
});
```

#### 7.7.3 Test Validazione Input
```javascript
// tests/input-validation.test.js
describe('Input Validation', () => {
  test('Person email validation', async () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'test+tag@example.org'
    ];
    
    for (const email of validEmails) {
      const person = await prisma.person.create({
        data: {
          email,
          firstName: 'Test',
          lastName: 'User',
          tenantId: testTenant.id
        }
      });
      
      expect(person.email).toBe(email);
    }
  });
  
  test('Person email validation rejects invalid emails', async () => {
    const invalidEmails = [
      'invalid-email',
      '@domain.com',
      'test@',
      'test..test@domain.com'
    ];
    
    for (const email of invalidEmails) {
      await expect(prisma.person.create({
        data: {
          email,
          firstName: 'Test',
          lastName: 'User',
          tenantId: testTenant.id
        }
      })).rejects.toThrow();
    }
  });
  
  test('Course date validation', async () => {
    const startDate = new Date('2024-06-01');
    const endDate = new Date('2024-06-30');
    
    const course = await prisma.course.create({
      data: {
        title: 'Test Course',
        startDate,
        endDate,
        tenantId: testTenant.id
      }
    });
    
    expect(course.startDate).toEqual(startDate);
    expect(course.endDate).toEqual(endDate);
  });
  
  test('Course date validation rejects invalid range', async () => {
    const startDate = new Date('2024-06-30');
    const endDate = new Date('2024-06-01'); // Prima della data di inizio
    
    await expect(prisma.course.create({
      data: {
        title: 'Test Course',
        startDate,
        endDate,
        tenantId: testTenant.id
      }
    })).rejects.toThrow();
  });
});
```

## ✅ Criteri di Completamento

### Checklist Tecnica
- [ ] **Enum Definiti**: Tutti gli enum necessari creati nel schema
- [ ] **Campi Convertiti**: Tutti i campi String convertiti in enum appropriati
- [ ] **Precisione Numerica**: Tutti i Decimal con precisione uniforme
- [ ] **Array Convertiti**: Array di stringhe convertiti in relazioni o JSON
- [ ] **Validazione Input**: Validatori Zod implementati
- [ ] **Constraint DB**: Constraint database per validazione aggiuntiva
- [ ] **Migrazione Dati**: Script di migrazione testati e funzionanti
- [ ] **Indici Enum**: Indici ottimizzati per campi enum
- [ ] **Rollback Plan**: Script di rollback pronti
- [ ] **Type Safety**: TypeScript types aggiornati

### Checklist Funzionale
- [ ] **Validazione Robusta**: Tutti gli input validati correttamente
- [ ] **Performance**: Query con enum più veloci
- [ ] **Manutenibilità**: Codice più leggibile e manutenibile
- [ ] **Documentazione**: Enum auto-documentati
- [ ] **Compatibilità**: Backward compatibility mantenuta

### Checklist Testing
- [ ] **Test Enum**: Tutti gli enum testati
- [ ] **Test Validazione**: Validazione input testata
- [ ] **Test Precisione**: Precisione numerica verificata
- [ ] **Test Migrazione**: Migrazione dati testata
- [ ] **Test Performance**: Performance con enum verificata

## ⚠️ Rischi e Mitigazioni

### Rischi Tecnici
1. **Perdita Dati Durante Migrazione**
   - *Rischio*: Conversione enum può causare perdita dati
   - *Mitigazione*: Backup completo e migrazione graduale

2. **Breaking Changes**
   - *Rischio*: Cambio tipi può rompere codice esistente
   - *Mitigazione*: Migrazione graduale con colonne temporanee

3. **Performance Degradation**
   - *Rischio*: Nuovi constraint possono rallentare query
   - *Mitigazione*: Indici ottimizzati e benchmark

### Rischi Business
1. **Downtime Durante Migrazione**
   - *Rischio*: Interruzione servizio durante aggiornamenti
   - *Mitigazione*: Migrazione in maintenance window

2. **Validazione Troppo Rigida**
   - *Rischio*: Validazione può bloccare operazioni legittime
   - *Mitigazione*: Test approfonditi e validazione graduale

## 📊 Metriche di Successo

### Metriche Tecniche
- **Type Safety**: 100% campi con validazione appropriata
- **Enum Coverage**: 100% campi status/type convertiti
- **Precision Consistency**: 100% campi numerici con precisione uniforme
- **Validation Coverage**: 100% input validati

### Metriche Performance
- **Query Speed**: Nessun degrado performance con enum
- **Index Usage**: > 95% query enum usano indici
- **Validation Speed**: < 10ms per validazione input

### Metriche Qualità
- **Code Maintainability**: Riduzione errori runtime del 80%
- **Documentation**: Auto-documentazione tramite enum
- **Developer Experience**: Migliore IntelliSense e type checking

## 🔄 Prossimi Passi

1. **Fase 8**: Modularizzazione & Versioning
2. **Fase 9**: Middleware & Logging
3. **Fase 10**: Pulizia Generale

---

**Note Importanti:**
- Questa fase richiede particolare attenzione alla migrazione dati
- Testing approfondito necessario prima del deployment
- Backup completo obbligatorio prima di iniziare
- Coordinamento con team frontend per aggiornamento types