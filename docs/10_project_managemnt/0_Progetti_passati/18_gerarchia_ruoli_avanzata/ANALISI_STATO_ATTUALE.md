# 🔍 ANALISI STATO ATTUALE - Sistema Ruoli e Schema Prisma

## 📊 Situazione Backend/Prisma

### ✅ Schema Principale Identificato
- **File attivo**: `/backend/prisma/schema.prisma` (1061 righe)
- **Generator**: prisma-client-js
- **Database**: PostgreSQL

### 🗂️ Backup da Riorganizzare
**Backup sparsi nella root prisma (da spostare):**
- `schema.prisma.backup`
- `schema.prisma.backup-1752230981167`
- `schema.prisma.backup-naming-optimization`
- `schema.prisma.backup-phase2`
- `schema.prisma.backup-phase3`
- `schema.prisma.backup-pre-optimization`
- `schema.prisma.backup-safe-1752231024251`
- `schema_backup_20241210_094900.prisma`

**Cartella backup organizzata (✅ già presente):**
- `/backend/prisma/backups/` - Contiene backup datati e organizzati

## 📋 Modello PersonRole Attuale

### Struttura Esistente
```prisma
model PersonRole {
  id                  String               @id @default(uuid())
  personId            String
  roleType            RoleType?
  customRoleId        String?
  isActive            Boolean              @default(true)
  isPrimary           Boolean              @default(false)
  assignedAt          DateTime             @default(now()) @db.Timestamp(6)
  assignedBy          String?
  validFrom           DateTime             @default(now()) @db.Date
  validUntil          DateTime?            @db.Date
  companyId           String?
  tenantId            String
  departmentId        String?
  createdAt           DateTime             @default(now()) @db.Timestamp(6)
  updatedAt           DateTime             @updatedAt @db.Timestamp(6)
  deletedAt           DateTime?

  // Relazioni esistenti
  assignedByPerson    Person?              @relation("AssignedRoles")
  company             Company?             @relation(...)
  person              Person               @relation(...)
  tenant              Tenant?              @relation(...)
  customRole          CustomRole?          @relation(...)
  permissions         RolePermission[]
  advancedPermissions AdvancedPermission[]

  // Indici e constraint esistenti
  @@unique([personId, roleType, customRoleId, companyId, tenantId])
  @@index([personId, isActive])
  @@index([roleType])
  @@index([customRoleId])
  @@index([companyId])
  @@index([tenantId])
  @@index([assignedBy])
  @@index([personId])
  @@index([tenantId, roleType])
  @@index([companyId, roleType, isActive])
  @@map("person_roles")
}
```

### ❌ Campi Mancanti per Gerarchia
- `parentRoleId String?` - Riferimento al ruolo padre
- `level Int @default(0)` - Livello gerarchico (opzionale per performance)
- `path String?` - Path gerarchico (opzionale per query efficienti)

### ❌ Relazioni Mancanti per Gerarchia
- `parentRole PersonRole?` - Relazione al ruolo padre
- `childRoles PersonRole[]` - Relazione ai ruoli figli

## 🔧 Modello EnhancedUserRole (DA CONSOLIDARE)

### Struttura Attuale
```prisma
model EnhancedUserRole {
  id               String    @id @default(uuid())
  personId         String    @map("user_id") // Mapped for DB compatibility
  tenantId         String
  roleType         String
  roleScope        String    @default("tenant")
  permissions      Json?
  companyId        String?
  departmentId     String?
  isActive         Boolean   @default(true)
  assignedBy       String?
  assignedAt       DateTime  @default(now())
  expiresAt        DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  
  // Relazioni
  assignedByPerson Person?   @relation("EnhancedUserRole_AssignedBy")
  company          Company?  @relation(...)
  tenant           Tenant    @relation(...)
  person           Person    @relation("EnhancedUserRole_Person")

  @@unique([personId, tenantId, roleType, companyId])
  @@map("enhanced_user_roles")
}
```

### 🔄 Dipendenze EnhancedUserRole Identificate
**File Backend che lo utilizzano:**
1. `/backend/services/enhancedRoleService.js` - Servizio principale
2. `/backend/validations/modules/users.js` - Validazioni
3. `/backend/middleware/soft-delete-advanced.js` - Middleware
4. `/backend/validations/index.js` - Indice validazioni

**Relazioni nel Schema:**
- `Company.enhancedRoles`
- `Tenant.enhancedRoles`
- `Person.enhancedUserRoles`
- `Person.assignedEnhancedRoles`

## 🎯 Piano di Consolidamento

### Fase 1: Migrazione Dati EnhancedUserRole → PersonRole
```sql
-- Esempio migrazione (da implementare)
INSERT INTO person_roles (
  personId, roleType, tenantId, companyId, 
  isActive, assignedBy, assignedAt, createdAt, updatedAt
)
SELECT 
  personId, roleType, tenantId, companyId,
  isActive, assignedBy, assignedAt, createdAt, updatedAt
FROM enhanced_user_roles
WHERE deletedAt IS NULL;
```

### Fase 2: Aggiornamento Servizi
- Modificare `enhancedRoleService.js` per usare PersonRole
- Aggiornare validazioni
- Rimuovere riferimenti EnhancedUserRole

### Fase 3: Rimozione Modello
- Rimuovere modello EnhancedUserRole
- Rimuovere relazioni associate
- Aggiornare middleware

## 🌳 Implementazione Gerarchia

### Modifiche Schema Richieste
```prisma
model PersonRole {
  // ... campi esistenti ...
  
  // === GERARCHIA AGGIUNTA ===
  parentRoleId    String?         @db.Uuid
  level           Int             @default(0)
  path            String?         // es: "1.2.3.4"
  
  // === RELAZIONI GERARCHIA ===
  parentRole      PersonRole?     @relation("RoleHierarchy", fields: [parentRoleId], references: [id], onDelete: Cascade)
  childRoles      PersonRole[]    @relation("RoleHierarchy")
  
  // === INDICI AGGIORNATI ===
  @@index([parentRoleId])
  @@index([level])
  @@index([path])
  @@unique([personId, roleType, customRoleId, companyId, tenantId, parentRoleId])
}
```

## ⚠️ Rischi Identificati

### 🚨 Rischi Critici
1. **Perdita Dati**: Migrazione EnhancedUserRole non corretta
2. **Cicli Gerarchia**: Validazione obbligatoria per evitare loop
3. **Performance**: Query ricorsive su grandi dataset
4. **Rottura Servizi**: Dipendenze EnhancedUserRole non aggiornate

### 🛡️ Mitigazioni Pianificate
- Backup completo prima di ogni modifica
- Migrazione graduale con validazione
- Test completi su ogni step
- Rollback plan per ogni fase

## 📋 Checklist Pre-Implementazione

### ✅ Preparazione
- [x] Schema principale identificato
- [x] Backup esistenti mappati
- [x] Dipendenze EnhancedUserRole identificate
- [x] Struttura PersonRole analizzata

### ⏳ Da Completare
- [ ] Backup schema corrente
- [ ] Spostamento backup sparsi
- [ ] Piano migrazione EnhancedUserRole
- [ ] Test ambiente preparato

## 🎯 Prossimi Step

1. **Pulizia Prisma**: Spostare backup sparsi
2. **Backup Sicurezza**: Creare backup pre-modifica
3. **Migrazione EnhancedUserRole**: Consolidamento graduale
4. **Implementazione Gerarchia**: Modifica schema PersonRole
5. **Test Completi**: Validazione funzionalità

---

**Nota**: Analisi completata. Sistema pronto per implementazione graduale e sicura.