# 🔗 Fase 4: Relazioni & onDelete

**Durata Stimata**: 2-3 giorni  
**Stato**: Planning  
**Priorità**: Alta  
**Dipendenze**: Fase 3 completata

## 🎯 Obiettivi Fase 4

1. **Integrità Referenziale**: Definire onDelete per tutte le relazioni
2. **Business Logic Compliance**: Allineare onDelete al flusso business
3. **Cascading Strategy**: Implementare strategia cascading coerente
4. **Cleanup Relations**: Rimuovere back-relations inutilizzate
5. **Data Safety**: Prevenire eliminazioni accidentali

## 📋 Task Dettagliati

### 4.1 Analisi Relazioni Attuali

#### 4.1.1 Inventario Relazioni Critiche

**Relazioni senza onDelete (da definire):**
```prisma
// CRITICHE - Necessitano onDelete immediato
Person.company Company @relation(fields: [companyId], references: [id]) // ❌ No onDelete
PersonRole.person Person @relation(fields: [personId], references: [id]) // ❌ No onDelete
PersonRole.customRole CustomRole? @relation(fields: [customRoleId], references: [id]) // ❌ No onDelete
CourseSchedule.company Company @relation(fields: [companyId], references: [id]) // ❌ No onDelete
CourseSchedule.trainer Person @relation("TrainerSchedules", fields: [trainerId], references: [id]) // ❌ No onDelete
CourseEnrollment.person Person @relation(fields: [personId], references: [id]) // ❌ No onDelete
CourseSession.trainer Person @relation("TrainerSessions", fields: [trainerId], references: [id]) // ❌ No onDelete
CourseSession.coTrainer Person? @relation("CoTrainerSessions", fields: [coTrainerId], references: [id]) // ❌ No onDelete
Attestat.person Person @relation(fields: [personId], references: [id]) // ❌ No onDelete
LetteraIncarico.trainer Person @relation(fields: [trainerId], references: [id]) // ❌ No onDelete
RefreshToken.person Person @relation(fields: [personId], references: [id]) // ❌ No onDelete
ActivityLog.person Person? @relation(fields: [personId], references: [id]) // ❌ No onDelete
GdprAuditLog.person Person? @relation(fields: [personId], references: [id]) // ❌ No onDelete
ConsentRecord.person Person @relation(fields: [personId], references: [id]) // ❌ No onDelete
PersonSession.person Person @relation(fields: [personId], references: [id]) // ❌ No onDelete
```

**Relazioni con onDelete esistenti (da verificare):**
```prisma
// GIÀ DEFINITE - Verificare coerenza
CourseEnrollment.schedule CourseSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade) // ✅
CourseSession.schedule CourseSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade) // ✅
RolePermission.permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade) // ✅
AdvancedPermission.permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade) // ✅
TenantConfiguration.tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade) // ✅
EnhancedUserRole.tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade) // ✅
TenantUsage.tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade) // ✅
CustomRole.tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade) // ✅
CustomRolePermission.customRole CustomRole @relation(fields: [customRoleId], references: [id], onDelete: Cascade) // ✅
CustomRolePermission.permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade) // ✅
```

### 4.2 Strategia onDelete per Business Logic

#### 4.2.1 Classificazione per Tipo di Relazione

**CATEGORIA A: Cascade (Eliminazione a cascata)**
- Quando l'entità padre è eliminata, i figli devono essere eliminati
- Usare per relazioni di "ownership" forte

**CATEGORIA B: Restrict (Bloccare eliminazione)**
- Impedire eliminazione se esistono riferimenti
- Usare per relazioni critiche che richiedono cleanup manuale

**CATEGORIA C: SetNull (Impostare NULL)**
- Quando l'entità padre è eliminata, il riferimento diventa NULL
- Usare per relazioni opzionali o di "soft reference"

#### 4.2.2 Mapping Business Logic

```prisma
// ===== CATEGORIA A: CASCADE =====
// Eliminazione Company -> elimina tutto il contenuto aziendale
model Person {
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  // RATIONALE: Se azienda eliminata, eliminare tutti i dipendenti
}

model CourseSchedule {
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  // RATIONALE: Se azienda eliminata, eliminare tutti i corsi aziendali
}

// Eliminazione Person -> elimina dati personali (GDPR)
model PersonRole {
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  // RATIONALE: Se persona eliminata, eliminare tutti i ruoli
}

model RefreshToken {
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  // RATIONALE: Se persona eliminata, eliminare tutti i token
}

model PersonSession {
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  // RATIONALE: Se persona eliminata, eliminare tutte le sessioni
}

model ConsentRecord {
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  // RATIONALE: Se persona eliminata, eliminare consensi (GDPR)
}

model Attestato {
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  // RATIONALE: Se persona eliminata, eliminare attestati personali
}

// Eliminazione CourseSchedule -> elimina contenuto corso
model CourseEnrollment {
  schedule CourseSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade) // ✅ Già presente
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  // RATIONALE: Se persona eliminata, eliminare iscrizioni
}

model CourseSession {
  schedule CourseSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade) // ✅ Già presente
  // RATIONALE: Se schedule eliminato, eliminare sessioni
}

// ===== CATEGORIA B: RESTRICT =====
// Proteggere eliminazioni critiche
model CourseSchedule {
  trainer Person @relation("TrainerSchedules", fields: [trainerId], references: [id], onDelete: Restrict)
  // RATIONALE: Non eliminare trainer se ha corsi assegnati
}

model CourseSession {
  trainer Person @relation("TrainerSessions", fields: [trainerId], references: [id], onDelete: Restrict)
  // RATIONALE: Non eliminare trainer se ha sessioni
}

model LetteraIncarico {
  trainer Person @relation(fields: [trainerId], references: [id], onDelete: Restrict)
  // RATIONALE: Non eliminare trainer con lettere di incarico
}

// ===== CATEGORIA C: SET NULL =====
// Riferimenti opzionali
model PersonRole {
  customRole CustomRole? @relation(fields: [customRoleId], references: [id], onDelete: SetNull)
  // RATIONALE: Se custom role eliminato, mantenere person role con ruolo standard
}

model CourseSession {
  coTrainer Person? @relation("CoTrainerSessions", fields: [coTrainerId], references: [id], onDelete: SetNull)
  // RATIONALE: Co-trainer è opzionale, può essere rimosso
}

// Audit logs - mantenere per compliance
model ActivityLog {
  person Person? @relation(fields: [personId], references: [id], onDelete: SetNull)
  // RATIONALE: Mantenere log anche se persona eliminata (audit trail)
}

model GdprAuditLog {
  person Person? @relation(fields: [personId], references: [id], onDelete: SetNull)
  // RATIONALE: Mantenere audit GDPR anche se persona eliminata
}
```

### 4.3 Implementazione Schema Aggiornato

#### 4.3.1 Schema Prisma Completo con onDelete

```prisma
// ===== PERSON & COMPANY =====
model Person {
  id String @id @default(cuid())
  email String @unique
  firstName String
  lastName String
  taxCode String? @unique
  username String? @unique
  
  // Relations with onDelete
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  companyId String
  
  // Back relations
  personRoles PersonRole[]
  refreshTokens RefreshToken[]
  personSessions PersonSession[]
  consentRecords ConsentRecord[]
  attestati Attestato[]
  activityLogs ActivityLog[]
  gdprAuditLogs GdprAuditLog[]
  
  // Trainer relations
  trainerSchedules CourseSchedule[] @relation("TrainerSchedules")
  trainerSessions CourseSession[] @relation("TrainerSessions")
  coTrainerSessions CourseSession[] @relation("CoTrainerSessions")
  lettereIncarico LetteraIncarico[]
  
  // Enrollments
  courseEnrollments CourseEnrollment[]
  
  @@index([email])
  @@index([companyId])
  @@index([tenantId])
  @@map("persons")
}

model PersonRole {
  id String @id @default(cuid())
  
  // Relations with onDelete
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  personId String
  
  customRole CustomRole? @relation(fields: [customRoleId], references: [id], onDelete: SetNull)
  customRoleId String?
  
  roleType RoleType
  isActive Boolean @default(true)
  
  @@index([personId, isActive])
  @@index([roleType])
  @@map("person_roles")
}

model CourseSchedule {
  id String @id @default(cuid())
  
  // Relations with onDelete
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  companyId String
  
  trainer Person @relation("TrainerSchedules", fields: [trainerId], references: [id], onDelete: Restrict)
  trainerId String
  
  course Course @relation(fields: [courseId], references: [id], onDelete: Restrict)
  courseId String
  
  // Back relations
  enrollments CourseEnrollment[]
  sessions CourseSession[]
  attestati Attestato[]
  lettereIncarico LetteraIncarico[]
  
  @@index([companyId])
  @@index([trainerId])
  @@index([courseId])
  @@map("course_schedules")
}

model CourseEnrollment {
  id String @id @default(cuid())
  
  // Relations with onDelete
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  personId String
  
  schedule CourseSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  scheduleId String
  
  status String
  
  @@index([personId])
  @@index([scheduleId])
  @@map("course_enrollments")
}

model CourseSession {
  id String @id @default(cuid())
  
  // Relations with onDelete
  schedule CourseSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  scheduleId String
  
  trainer Person @relation("TrainerSessions", fields: [trainerId], references: [id], onDelete: Restrict)
  trainerId String
  
  coTrainer Person? @relation("CoTrainerSessions", fields: [coTrainerId], references: [id], onDelete: SetNull)
  coTrainerId String?
  
  date DateTime
  
  @@index([scheduleId])
  @@index([trainerId])
  @@index([date])
  @@map("course_sessions")
}

model RefreshToken {
  id String @id @default(cuid())
  
  // Relations with onDelete
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  personId String
  
  token String @unique
  expiresAt DateTime
  
  @@index([personId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

model ActivityLog {
  id String @id @default(cuid())
  
  // Relations with onDelete
  person Person? @relation(fields: [personId], references: [id], onDelete: SetNull)
  personId String?
  
  action String
  timestamp DateTime @default(now())
  
  @@index([personId])
  @@index([action])
  @@index([timestamp])
  @@map("activity_logs")
}

model GdprAuditLog {
  id String @id @default(cuid())
  
  // Relations with onDelete
  person Person? @relation(fields: [personId], references: [id], onDelete: SetNull)
  personId String?
  
  action String
  resourceType String
  createdAt DateTime @default(now())
  
  @@index([personId])
  @@index([action])
  @@index([createdAt])
  @@map("gdpr_audit_logs")
}

model ConsentRecord {
  id String @id @default(cuid())
  
  // Relations with onDelete
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  personId String
  
  consentType String
  consentGiven Boolean
  givenAt DateTime?
  
  @@index([personId])
  @@index([consentType])
  @@map("consent_records")
}

model PersonSession {
  id String @id @default(cuid())
  
  // Relations with onDelete
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  personId String
  
  sessionToken String @unique
  isActive Boolean @default(true)
  expiresAt DateTime
  lastActivityAt DateTime @default(now())
  
  @@index([personId])
  @@index([isActive])
  @@index([expiresAt])
  @@map("person_sessions")
}

model Attestato {
  id String @id @default(cuid())
  
  // Relations with onDelete
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  personId String
  
  scheduledCourse CourseSchedule @relation(fields: [scheduledCourseId], references: [id], onDelete: Restrict)
  scheduledCourseId String
  
  generatedAt DateTime @default(now())
  annoProgressivo Int
  numeroProgressivo Int
  
  @@index([personId])
  @@index([scheduledCourseId])
  @@index([annoProgressivo])
  @@map("attestati")
}

model LetteraIncarico {
  id String @id @default(cuid())
  
  // Relations with onDelete
  trainer Person @relation(fields: [trainerId], references: [id], onDelete: Restrict)
  trainerId String
  
  scheduledCourse CourseSchedule @relation(fields: [scheduledCourseId], references: [id], onDelete: Restrict)
  scheduledCourseId String
  
  dataGenerazione DateTime @default(now())
  annoProgressivo Int
  numeroProgressivo Int
  
  @@index([trainerId])
  @@index([scheduledCourseId])
  @@map("lettere_incarico")
}
```

### 4.4 Cleanup Back-Relations

#### 4.4.1 Identificazione Relations Inutilizzate

```javascript
// analyze-unused-relations.js
const fs = require('fs');
const path = require('path');

// Scansione codebase per utilizzo relations
function scanForRelationUsage(relationName, modelName) {
  const searchDirs = [
    'backend/src',
    'backend/routes',
    'backend/middleware',
    'frontend/src'
  ];
  
  let usageFound = false;
  
  searchDirs.forEach(dir => {
    // Cerca pattern come: person.trainerSchedules, include: { trainerSchedules: true }
    const patterns = [
      new RegExp(`\\.${relationName}`, 'g'),
      new RegExp(`${relationName}:`, 'g'),
      new RegExp(`include.*${relationName}`, 'g')
    ];
    
    // Scansione file...
  });
  
  return usageFound;
}

// Relations da verificare
const relationsToCheck = [
  { model: 'Person', relation: 'trainerSchedules' },
  { model: 'Person', relation: 'coTrainerSessions' },
  { model: 'Person', relation: 'lettereIncarico' },
  { model: 'Company', relation: 'scheduleCompanies' },
  { model: 'Course', relation: 'templateLinks' }
];
```

#### 4.4.2 Relations da Rimuovere

```prisma
// RIMUOVERE se non utilizzate nel codice:
model Person {
  // ❌ Rimuovere se non usate
  // trainerSchedules CourseSchedule[] @relation("TrainerSchedules")
  // coTrainerSessions CourseSession[] @relation("CoTrainerSessions")
  // lettereIncarico LetteraIncarico[]
  
  // ✅ Mantenere se utilizzate
  personRoles PersonRole[]
  courseEnrollments CourseEnrollment[]
  refreshTokens RefreshToken[]
}

model Company {
  // ❌ Rimuovere se non usate
  // scheduleCompanies ScheduleCompany[]
  
  // ✅ Mantenere
  persons Person[]
  courseSchedules CourseSchedule[]
}
```

### 4.5 Migration Strategy

#### 4.5.1 Backup Pre-Migration

```bash
#!/bin/bash
# backup-before-relations.sh

echo "Creating backup before relations migration..."

# Database backup
pg_dump $DATABASE_URL > "backup-relations-$(date +%Y%m%d_%H%M%S).sql"

# Schema backup
cp backend/prisma/schema.prisma "schema-backup-$(date +%Y%m%d_%H%M%S).prisma"

echo "Backup completed"
```

#### 4.5.2 Migration Graduale

```sql
-- Step 1: Aggiungere onDelete senza enforcement
ALTER TABLE person_roles 
DROP CONSTRAINT IF EXISTS person_roles_person_id_fkey;

ALTER TABLE person_roles 
ADD CONSTRAINT person_roles_person_id_fkey 
FOREIGN KEY (person_id) REFERENCES persons(id) 
ON DELETE CASCADE;

-- Step 2: Verificare integrità
SELECT 
    pr.id,
    pr.person_id,
    p.id as person_exists
FROM person_roles pr
LEFT JOIN persons p ON pr.person_id = p.id
WHERE p.id IS NULL;

-- Step 3: Applicare a tutte le tabelle...
```

#### 4.5.3 Prisma Migration

```bash
# Generare migration
npx prisma migrate dev --name "add-ondelete-constraints"

# Verificare migration
npx prisma migrate status

# Deploy in production
npx prisma migrate deploy
```

### 4.6 Testing Strategy

#### 4.6.1 Test Cascading Behavior

```javascript
// test-ondelete-behavior.test.js
describe('OnDelete Behavior', () => {
  describe('CASCADE behavior', () => {
    test('Deleting person should cascade to PersonRoles', async () => {
      // Create test data
      const person = await prisma.person.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          companyId: testCompanyId
        }
      });
      
      const personRole = await prisma.personRole.create({
        data: {
          personId: person.id,
          roleType: 'EMPLOYEE',
          isActive: true
        }
      });
      
      // Delete person
      await prisma.person.delete({ where: { id: person.id } });
      
      // Verify cascade
      const remainingRole = await prisma.personRole.findUnique({
        where: { id: personRole.id }
      });
      
      expect(remainingRole).toBeNull();
    });
    
    test('Deleting company should cascade to persons and their data', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          tenantId: testTenantId
        }
      });
      
      const person = await prisma.person.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          companyId: company.id
        }
      });
      
      const personRole = await prisma.personRole.create({
        data: {
          personId: person.id,
          roleType: 'EMPLOYEE',
          isActive: true
        }
      });
      
      // Delete company
      await prisma.company.delete({ where: { id: company.id } });
      
      // Verify cascade
      const remainingPerson = await prisma.person.findUnique({
        where: { id: person.id }
      });
      const remainingRole = await prisma.personRole.findUnique({
        where: { id: personRole.id }
      });
      
      expect(remainingPerson).toBeNull();
      expect(remainingRole).toBeNull();
    });
  });
  
  describe('RESTRICT behavior', () => {
    test('Cannot delete trainer with active schedules', async () => {
      const trainer = await prisma.person.create({
        data: {
          firstName: 'Trainer',
          lastName: 'Test',
          email: 'trainer@example.com',
          companyId: testCompanyId
        }
      });
      
      const schedule = await prisma.courseSchedule.create({
        data: {
          trainerId: trainer.id,
          companyId: testCompanyId,
          courseId: testCourseId,
          startDate: new Date(),
          endDate: new Date()
        }
      });
      
      // Attempt to delete trainer
      await expect(prisma.person.delete({ 
        where: { id: trainer.id } 
      })).rejects.toThrow();
      
      // Cleanup
      await prisma.courseSchedule.delete({ where: { id: schedule.id } });
      await prisma.person.delete({ where: { id: trainer.id } });
    });
  });
  
  describe('SET NULL behavior', () => {
    test('Deleting custom role should set PersonRole.customRoleId to null', async () => {
      const customRole = await prisma.customRole.create({
        data: {
          name: 'Test Role',
          tenantId: testTenantId
        }
      });
      
      const personRole = await prisma.personRole.create({
        data: {
          personId: testPersonId,
          roleType: 'CUSTOM',
          customRoleId: customRole.id,
          isActive: true
        }
      });
      
      // Delete custom role
      await prisma.customRole.delete({ where: { id: customRole.id } });
      
      // Verify SET NULL
      const updatedRole = await prisma.personRole.findUnique({
        where: { id: personRole.id }
      });
      
      expect(updatedRole.customRoleId).toBeNull();
      expect(updatedRole.roleType).toBe('CUSTOM'); // Should remain
    });
  });
});
```

#### 4.6.2 Test GDPR Compliance

```javascript
// test-gdpr-compliance.test.js
describe('GDPR Compliance with onDelete', () => {
  test('Person deletion should preserve audit logs with null personId', async () => {
    const person = await prisma.person.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        companyId: testCompanyId
      }
    });
    
    const auditLog = await prisma.gdprAuditLog.create({
      data: {
        personId: person.id,
        action: 'DATA_ACCESS',
        resourceType: 'PERSON',
        details: 'User accessed personal data'
      }
    });
    
    // Delete person
    await prisma.person.delete({ where: { id: person.id } });
    
    // Verify audit log preserved with null personId
    const preservedLog = await prisma.gdprAuditLog.findUnique({
      where: { id: auditLog.id }
    });
    
    expect(preservedLog).not.toBeNull();
    expect(preservedLog.personId).toBeNull();
    expect(preservedLog.action).toBe('DATA_ACCESS');
  });
});
```

### 4.7 Performance Impact Analysis

#### 4.7.1 Benchmark Cascading Operations

```javascript
// benchmark-cascade-operations.js
const { performance } = require('perf_hooks');

async function benchmarkCascadeDelete() {
  // Create test company with multiple persons and relations
  const company = await prisma.company.create({
    data: {
      name: 'Benchmark Company',
      tenantId: testTenantId
    }
  });
  
  // Create 100 persons with relations
  const persons = [];
  for (let i = 0; i < 100; i++) {
    const person = await prisma.person.create({
      data: {
        firstName: `Person${i}`,
        lastName: 'Test',
        email: `person${i}@benchmark.com`,
        companyId: company.id
      }
    });
    
    // Add relations
    await prisma.personRole.create({
      data: {
        personId: person.id,
        roleType: 'EMPLOYEE',
        isActive: true
      }
    });
    
    persons.push(person);
  }
  
  // Benchmark cascade delete
  const start = performance.now();
  await prisma.company.delete({ where: { id: company.id } });
  const duration = performance.now() - start;
  
  console.log(`Cascade delete of company with 100 persons: ${duration.toFixed(2)}ms`);
  
  return duration;
}
```

## ✅ Criteri di Completamento

- [ ] Tutte le relazioni hanno onDelete definito
- [ ] Business logic rispettata per ogni onDelete
- [ ] Back-relations inutilizzate rimosse
- [ ] Test cascading behavior passano
- [ ] Test GDPR compliance passano
- [ ] Performance impact accettabile (<500ms per operazioni complesse)
- [ ] Migration completata senza errori
- [ ] Documentazione relazioni aggiornata

## 🚨 Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Eliminazioni accidentali | Media | Critico | Backup + test approfonditi |
| Performance degradation | Bassa | Medio | Benchmark pre/post |
| Violazione GDPR | Bassa | Critico | Test compliance specifici |
| Deadlock su eliminazioni | Bassa | Medio | Transazioni ottimizzate |

## 📊 Metriche di Successo

| Metrica | Target | Baseline | Post-Ottimizzazione |
|---------|--------|----------|--------------------|
| **Relazioni con onDelete** | 100% | 60% | __ % |
| **Cascade Delete Performance** | <500ms | N/A | __ ms |
| **GDPR Compliance Tests** | 100% pass | N/A | __ % |
| **Back-relations Cleanup** | -30% | 45 relations | __ relations |

## 📞 Prossimi Passi

Al completamento Fase 4:
1. **Verifica integrità** referenziale completa
2. **Test GDPR compliance** approfonditi
3. **Preparazione Fase 5** (Soft-delete & Middleware)
4. **Documentazione** relazioni aggiornata

---

**Nota**: Le relazioni onDelete sono critiche per l'integrità dei dati. Testare accuratamente ogni scenario prima del deploy in produzione.