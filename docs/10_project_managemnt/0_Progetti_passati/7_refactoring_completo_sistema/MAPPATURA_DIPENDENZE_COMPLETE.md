# MAPPATURA COMPLETA DELLE DIPENDENZE

## Data: 19 Dicembre 2024
## Status: COMPLETATA

---

## 🎯 OBIETTIVO
Mappatura completa di tutte le relazioni che devono essere migrate da User/Employee verso Person.

---

## 📊 RELAZIONI DA MIGRARE

### 1. RELAZIONI USER → PERSON

#### Tabelle con FK verso User (userId)

1. **ActivityLog**
   ```prisma
   model ActivityLog {
     userId     String
     user       User     @relation(fields: [userId], references: [id])
   }
   ```
   - **Migrazione**: `userId` → `personId`
   - **Relazione**: `user` → `person`
   - **Constraint**: ON DELETE RESTRICT

2. **UserRole** ⚠️ DA ELIMINARE
   ```prisma
   model UserRole {
     userId     String
     assignedBy String?
     user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
     assigner   User?     @relation("AssignedBy", fields: [assignedBy], references: [id])
   }
   ```
   - **Azione**: Migrare dati verso PersonRole, poi eliminare tabella

3. **GdprAuditLog**
   ```prisma
   model GdprAuditLog {
     userId       String?
     user         User?    @relation(fields: [userId], references: [id])
   }
   ```
   - **Migrazione**: `userId` → `personId`
   - **Relazione**: `user` → `person`
   - **Constraint**: ON DELETE SET NULL

4. **ConsentRecord**
   ```prisma
   model ConsentRecord {
     userId         String
     user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
   }
   ```
   - **Migrazione**: `userId` → `personId`
   - **Relazione**: `user` → `person`
   - **Constraint**: ON DELETE CASCADE

5. **UserSession**
   ```prisma
   model UserSession {
     userId       String
     user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
   }
   ```
   - **Migrazione**: `userId` → `personId`
   - **Relazione**: `user` → `person`
   - **Constraint**: ON DELETE CASCADE

6. **EnhancedUserRole** ⚠️ DA VERIFICARE
   ```prisma
   model EnhancedUserRole {
     userId         String    @map("user_id")
     assignedBy     String?   @map("assigned_by")
     user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
     assignedByUser User?     @relation("AssignedRoles", fields: [assignedBy], references: [id])
   }
   ```
   - **Migrazione**: `userId` → `personId`
   - **Relazione**: `user` → `person`
   - **Constraint**: ON DELETE CASCADE

### 2. RELAZIONI EMPLOYEE → PERSON

#### Tabelle con FK verso Employee (employeeId)

1. **CourseEnrollment**
   ```prisma
   model CourseEnrollment {
     employeeId String
     employee   Employee       @relation(fields: [employeeId], references: [id])
   }
   ```
   - **Migrazione**: `employeeId` → `personId`
   - **Relazione**: `employee` → `person`
   - **Constraint**: ON DELETE RESTRICT

2. **Attestato**
   ```prisma
   model Attestato {
     partecipanteId String  // riferisce Employee
     partecipante   Employee @relation(fields: [partecipanteId], references: [id])
   }
   ```
   - **Migrazione**: `partecipanteId` → `personId`
   - **Relazione**: `partecipante` → `person`
   - **Constraint**: ON DELETE RESTRICT

3. **RegistroPresenzePartecipante**
   ```prisma
   model RegistroPresenzePartecipante {
     partecipanteId String
     partecipante   Employee @relation(fields: [partecipanteId], references: [id])
   }
   ```
   - **Migrazione**: `partecipanteId` → `personId`
   - **Relazione**: `partecipante` → `person`
   - **Constraint**: ON DELETE RESTRICT

4. **PreventivoPartecipante**
   ```prisma
   model PreventivoPartecipante {
     partecipanteId String
     partecipante   Employee @relation(fields: [partecipanteId], references: [id])
   }
   ```
   - **Migrazione**: `partecipanteId` → `personId`
   - **Relazione**: `partecipante` → `person`
   - **Constraint**: ON DELETE RESTRICT

5. **TestPartecipante**
   ```prisma
   model TestPartecipante {
     partecipanteId String
     partecipante   Employee @relation(fields: [partecipanteId], references: [id])
   }
   ```
   - **Migrazione**: `partecipanteId` → `personId`
   - **Relazione**: `partecipante` → `person`
   - **Constraint**: ON DELETE RESTRICT

---

## 🔄 PIANO MIGRAZIONE SEQUENZIALE

### FASE 1: Preparazione
- ✅ Backup database completato
- ✅ Analisi dipendenze completata
- ⏳ Creazione script migrazione

### FASE 2: Migrazione User → Person

#### Step 2.1: Migrazione dati User
```sql
-- 1. Inserire User esistenti in Person
INSERT INTO "persons" (
  id, "firstName", "lastName", email, username, password,
  "isActive", "lastLogin", "profileImage", "failedAttempts",
  "lockedUntil", "globalRole", "companyId", "tenantId",
  "createdAt", "updatedAt", "isDeleted"
)
SELECT 
  id, "firstName", "lastName", email, username, password,
  "isActive", "lastLogin", "profileImage", "failedAttempts",
  "lockedUntil", "globalRole", "companyId", "tenantId",
  "createdAt", "updatedAt", eliminato
FROM "User"
WHERE eliminato = false;
```

#### Step 2.2: Migrazione UserRole → PersonRole
```sql
-- 2. Migrare UserRole verso PersonRole
-- NOTA: Richiede mappatura Role.name → RoleType enum
INSERT INTO "person_roles" (
  id, "personId", "roleType", "isActive", "assignedAt",
  "assignedBy", "companyId", "tenantId", "createdAt", "updatedAt"
)
SELECT 
  ur.id,
  ur."userId" as "personId",
  CASE r.name 
    WHEN 'admin' THEN 'ADMIN'::"RoleType"
    WHEN 'manager' THEN 'MANAGER'::"RoleType"
    WHEN 'employee' THEN 'EMPLOYEE'::"RoleType"
    WHEN 'trainer' THEN 'TRAINER'::"RoleType"
    ELSE 'EMPLOYEE'::"RoleType"
  END as "roleType",
  ur."isActive",
  ur."assignedAt",
  ur."assignedBy",
  u."companyId",
  u."tenantId",
  ur."createdAt",
  ur."updatedAt"
FROM "UserRole" ur
JOIN "Role" r ON ur."roleId" = r.id
JOIN "User" u ON ur."userId" = u.id
WHERE ur.eliminato = false AND u.eliminato = false;
```

#### Step 2.3: Aggiornamento FK verso User
```sql
-- 3. Aggiornare ActivityLog
ALTER TABLE "ActivityLog" RENAME COLUMN "userId" TO "personId";
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_userId_fkey";
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- 4. Aggiornare GdprAuditLog
ALTER TABLE "GdprAuditLog" RENAME COLUMN "userId" TO "personId";
ALTER TABLE "GdprAuditLog" DROP CONSTRAINT "GdprAuditLog_userId_fkey";
ALTER TABLE "GdprAuditLog" ADD CONSTRAINT "GdprAuditLog_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE SET NULL;

-- 5. Aggiornare ConsentRecord
ALTER TABLE "ConsentRecord" RENAME COLUMN "userId" TO "personId";
ALTER TABLE "ConsentRecord" DROP CONSTRAINT "ConsentRecord_userId_fkey";
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE CASCADE;

-- 6. Aggiornare UserSession
ALTER TABLE "UserSession" RENAME COLUMN "userId" TO "personId";
ALTER TABLE "UserSession" DROP CONSTRAINT "UserSession_userId_fkey";
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE CASCADE;
```

### FASE 3: Migrazione Employee → Person

#### Step 3.1: Migrazione dati Employee
```sql
-- 7. Inserire Employee esistenti in Person
INSERT INTO "persons" (
  id, "firstName", "lastName", email, phone, "birthDate",
  "taxCode", "residenceAddress", "residenceCity", "postalCode",
  "province", title, "hiredDate", "profileImage", notes,
  "companyId", "createdAt", "updatedAt", "isDeleted"
)
SELECT 
  id, first_name, last_name, email, phone, birth_date,
  codice_fiscale, residence_address, residence_city, postal_code,
  province, title, hired_date, photo_url, notes,
  "companyId", created_at, updated_at, eliminato
FROM "Employee"
WHERE eliminato = false;
```

#### Step 3.2: Aggiornamento FK verso Employee
```sql
-- 8. Aggiornare CourseEnrollment
ALTER TABLE "CourseEnrollment" RENAME COLUMN "employeeId" TO "personId";
ALTER TABLE "CourseEnrollment" DROP CONSTRAINT "CourseEnrollment_employeeId_fkey";
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- 9. Aggiornare Attestato
ALTER TABLE "Attestato" RENAME COLUMN "partecipanteId" TO "personId";
ALTER TABLE "Attestato" DROP CONSTRAINT "Attestato_partecipanteId_fkey";
ALTER TABLE "Attestato" ADD CONSTRAINT "Attestato_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- 10. Aggiornare RegistroPresenzePartecipante
ALTER TABLE "RegistroPresenzePartecipante" RENAME COLUMN "partecipanteId" TO "personId";
ALTER TABLE "RegistroPresenzePartecipante" DROP CONSTRAINT "RegistroPresenzePartecipante_partecipanteId_fkey";
ALTER TABLE "RegistroPresenzePartecipante" ADD CONSTRAINT "RegistroPresenzePartecipante_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- 11. Aggiornare PreventivoPartecipante
ALTER TABLE "PreventivoPartecipante" RENAME COLUMN "partecipanteId" TO "personId";
ALTER TABLE "PreventivoPartecipante" DROP CONSTRAINT "PreventivoPartecipante_partecipanteId_fkey";
ALTER TABLE "PreventivoPartecipante" ADD CONSTRAINT "PreventivoPartecipante_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;

-- 12. Aggiornare TestPartecipante
ALTER TABLE "TestPartecipante" RENAME COLUMN "partecipanteId" TO "personId";
ALTER TABLE "TestPartecipante" DROP CONSTRAINT "TestPartecipante_partecipanteId_fkey";
ALTER TABLE "TestPartecipante" ADD CONSTRAINT "TestPartecipante_personId_fkey" 
  FOREIGN KEY ("personId") REFERENCES "persons"(id) ON DELETE RESTRICT;
```

### FASE 4: Cleanup
```sql
-- 13. Eliminare tabelle obsolete
DROP TABLE "UserRole";
DROP TABLE "User";
DROP TABLE "Employee";

-- 14. Eliminare tabella Role se non più utilizzata
-- VERIFICARE PRIMA SE CI SONO ALTRE DIPENDENZE
-- DROP TABLE "Role";
```

---

## ⚠️ RISCHI E MITIGAZIONI

### 1. CONFLITTI EMAIL
- **Rischio**: User e Employee con stessa email
- **Mitigazione**: Verificare unicità prima della migrazione

### 2. MAPPATURA RUOLI
- **Rischio**: Role.name non mappabile su RoleType enum
- **Mitigazione**: Creare mappatura esplicita con fallback

### 3. PERDITA DATI
- **Rischio**: Campi non mappabili
- **Mitigazione**: Backup completo + verifica post-migrazione

### 4. CONSTRAINT VIOLATIONS
- **Rischio**: FK orfane dopo eliminazione tabelle
- **Mitigazione**: Verifica integrità referenziale step-by-step

---

## 📊 VERIFICA POST-MIGRAZIONE

```sql
-- Verifica conteggi
SELECT 'persons' as tabella, COUNT(*) as totale FROM "persons";
SELECT 'person_roles' as tabella, COUNT(*) as totale FROM "person_roles";
SELECT 'ActivityLog' as tabella, COUNT(*) as totale FROM "ActivityLog";
SELECT 'CourseEnrollment' as tabella, COUNT(*) as totale FROM "CourseEnrollment";

-- Verifica integrità referenziale
SELECT 
  'ActivityLog' as tabella,
  COUNT(*) as totale,
  COUNT(DISTINCT "personId") as persone_uniche
FROM "ActivityLog";

SELECT 
  'CourseEnrollment' as tabella,
  COUNT(*) as totale,
  COUNT(DISTINCT "personId") as persone_uniche
FROM "CourseEnrollment";
```

---

## 🎯 PROSSIMI PASSI

1. **Creare script SQL completo** - Unire tutti i comandi in un file
2. **Test su database di sviluppo** - Verificare migrazione
3. **Aggiornare schema Prisma** - Rimuovere User/Employee
4. **Aggiornare codice applicativo** - Controller, service, etc.
5. **Test funzionali completi** - Verificare tutte le funzionalità

---

**Ultimo aggiornamento**: 19 Dicembre 2024, 19:30
**Prossima fase**: Creazione script SQL migrazione