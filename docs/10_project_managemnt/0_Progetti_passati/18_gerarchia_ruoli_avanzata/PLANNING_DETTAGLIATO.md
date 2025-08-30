# 🌳 PLANNING DETTAGLIATO - Gerarchia Ruoli Avanzata

## 📋 Panoramica Progetto

**Obiettivo**: Implementare una gerarchia ad albero per i ruoli PersonRole con controllo granulare dei permessi basato sulla posizione gerarchica.

**Data Inizio**: Gennaio 2025  
**Responsabile**: Assistant AI  
**Metodologia**: Approccio sistematico step-by-step con massima cautela

## 🎯 Obiettivi Specifici

### 1. **Gerarchia ad Albero PersonRole**
- Aggiungere campo `parentRoleId` per relazione self-referencing
- Implementare logica "antenato può gestire discendenti"
- Mantenere tutte le funzionalità esistenti

### 2. **Controllo Gerarchico Permessi**
- Admin può vedere tutto tranne SuperAdmin
- Ogni ruolo vede solo i ruoli subordinati
- Implementare controlli middleware

### 3. **UI Gerarchia nella Pagina Roles**
- Pulsante "Gerarchia" per vista ad albero
- Visualizzazione filtrata per ruolo utente
- Interfaccia intuitiva e responsive

### 4. **Consolidamento Sistema**
- Rimuovere EnhancedUserRole obsoleto
- Pulire cartella backend/prisma
- Mantenere solo schema principale

## 🔍 Analisi Stato Attuale

### ✅ Già Implementato
- Sistema PersonRole con RoleType enum
- Middleware di autorizzazione base
- Pagina settings/roles funzionante
- Sistema permessi granulari

### ❌ Da Implementare
- Gerarchia ad albero PersonRole
- Controlli gerarchici middleware
- Vista ad albero nella UI
- Consolidamento EnhancedUserRole

## 🚀 PIANO DI IMPLEMENTAZIONE

### FASE 1: Analisi e Preparazione ⏱️ 30 min ✅ COMPLETATA
#### 1.1 Analisi Schema Prisma Attuale
- [x] Verificare modello PersonRole corrente
- [x] Identificare EnhancedUserRole e dipendenze
- [x] Mappare tutti i file che usano questi modelli

#### 1.2 Pulizia Backend/Prisma
- [x] Spostare backup in cartella dedicata
- [x] Verificare schema principale utilizzato
- [x] Documentare stato attuale

### FASE 2: Modifica Schema Prisma ⏱️ 45 min ✅ COMPLETATA
#### 2.1 Aggiornamento PersonRole
```prisma
model PersonRole {
  // ... campi esistenti ...
  
  // === GERARCHIA ===
  parentRoleId    String?         @db.Uuid
  level           Int             @default(0)
  path            String?         // Percorso gerarchico (es: "1.2.3")
  parentRole      PersonRole?     @relation("RoleHierarchy", fields: [parentRoleId], references: [id], onDelete: Cascade)
  childRoles      PersonRole[]    @relation("RoleHierarchy")
  
  // === INDICI AGGIORNATI ===
  @@index([parentRoleId])
  @@index([level])
  @@index([path])
  @@index([tenantId, parentRoleId])
}
```

#### 2.2 Consolidamento EnhancedUserRole
- [x] Identificare tutti i riferimenti
- [x] Migrare dati verso PersonRole
- [x] Rimuovere modello obsoleto

### FASE 3: Consolidamento del Modello EnhancedUserRole ⏱️ 1 ora ✅ COMPLETATA
#### 3.1 Aggiornamento Servizi
- [x] Aggiornamento enhancedRoleService.js per usare PersonRole
- [x] Sostituzione di tutti i riferimenti a EnhancedUserRole
- [x] Mantenimento compatibilità API esistenti

#### 3.2 Rimozione Validazioni
- [x] Rimozione schemi validazione EnhancedUserRole
- [x] Aggiornamento mappa validazioni
- [x] Pulizia riferimenti obsoleti

#### 3.3 Aggiornamento Schema Database
- [x] Rimozione modello EnhancedUserRole da schema Prisma
- [x] Rimozione relazioni obsolete da Person, Tenant, Company
- [x] Applicazione modifiche al database

#### 3.4 Script di Migrazione
- [x] Creazione script migrate-enhanced-user-role.js
- [x] Backup automatico dati esistenti
- [x] Migrazione dati con calcolo campi gerarchici
- [x] Verifica integrità post-migrazione

### FASE 4: Aggiornamento Servizi Backend ⏱️ 1 ora
#### 4.1 RoleHierarchyService
- [x] Metodi per gestione gerarchia (createRoleWithHierarchy, getDescendantRoles)
- [x] Validazione cicli nella gerarchia
- [x] Query ricorsive per antenati/discendenti
- [x] Costruzione albero gerarchico (getHierarchyTree, buildTree)
- [x] Controlli permessi gerarchici (canUserManageRole)

#### 4.2 Middleware Autorizzazione
- [ ] Controlli gerarchici nei permessi
- [ ] Logica "antenato può gestire discendenti"
- [ ] Filtri basati su posizione gerarchica

### FASE 5: Frontend Gerarchia ⏱️ 1 ora
#### 4.1 Componenti Gerarchia
- [ ] TreeView component per visualizzazione
- [ ] RoleHierarchyModal per gestione
- [ ] Filtri basati su ruolo utente

#### 4.2 Aggiornamento Pagina Roles
- [ ] Pulsante "Gerarchia" nella toolbar
- [ ] Vista ad albero responsive
- [ ] Controlli CRUD gerarchici

### FASE 5: Test e Validazione ⏱️ 30 min
#### 5.1 Test Funzionali
- [ ] Test creazione gerarchia
- [ ] Test controlli permessi
- [ ] Test UI gerarchia

#### 5.2 Test Regressione
- [ ] Verificare funzionalità esistenti
- [ ] Test login e autorizzazione
- [ ] Test CRUD ruoli standard

## 📁 File da Modificare

### Backend
```
backend/prisma/schema.prisma           # Aggiornamento PersonRole
backend/services/personService.js     # Metodi gerarchia
backend/middleware/rbac.js             # Controlli gerarchici
backend/controllers/personController.js # Endpoint gerarchia
backend/routes/person-routes.js        # Route gerarchia
```

### Frontend
```
src/pages/settings/RolesTab.tsx        # Pulsante gerarchia
src/components/roles/RoleHierarchy.tsx # Componente albero (nuovo)
src/services/api/roles.ts              # API gerarchia
src/types/roles.ts                     # Tipi gerarchia
```

## 🔧 Implementazione Tecnica

### 1. Schema Prisma - Gerarchia
```prisma
model PersonRole {
  id              String          @id @default(uuid())
  personId        String          @db.Uuid
  roleType        RoleType
  isActive        Boolean         @default(true)
  isPrimary       Boolean         @default(false)
  
  // === GERARCHIA AGGIUNTA ===
  parentRoleId    String?         @db.Uuid
  level           Int             @default(0) // Livello gerarchico
  path            String?         // Path gerarchico (es: "1.2.3")
  
  // === VALIDITÀ RUOLO ===
  assignedAt      DateTime        @default(now())
  assignedBy      String?         @db.Uuid
  validFrom       DateTime        @default(now())
  validUntil      DateTime?
  
  // === CONTESTO RUOLO ===
  companyId       String?         @db.Uuid
  tenantId        String?         @db.Uuid
  departmentId    String?         @db.Uuid
  
  // === AUDIT ===
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  // === RELAZIONI ===
  person          Person          @relation(fields: [personId], references: [id], onDelete: Cascade)
  assignedByPerson Person?        @relation("AssignedRoles", fields: [assignedBy], references: [id])
  company         Company?        @relation(fields: [companyId], references: [id])
  tenant          Tenant?         @relation(fields: [tenantId], references: [id])
  
  // === GERARCHIA RELAZIONI ===
  parentRole      PersonRole?     @relation("RoleHierarchy", fields: [parentRoleId], references: [id], onDelete: Cascade)
  childRoles      PersonRole[]    @relation("RoleHierarchy")
  
  @@unique([personId, roleType, companyId, tenantId])
  @@index([personId, isActive])
  @@index([roleType])
  @@index([companyId])
  @@index([tenantId])
  @@index([parentRoleId])
  @@index([level])
  @@map("person_roles")
}
```

### 2. Servizi Gerarchia
```typescript
// Metodi da aggiungere a PersonService
async createRoleHierarchy(parentRoleId, childRoleData) {
  // Validazione cicli
  // Calcolo livello e path
  // Creazione ruolo figlio
}

async getRoleHierarchy(roleId) {
  // Query ricorsiva per albero completo
}

async getSubordinateRoles(roleId) {
  // Solo ruoli subordinati
}

async canManageRole(managerRoleId, targetRoleId) {
  // Verifica se manager può gestire target
}
```

### 3. Middleware Gerarchico
```typescript
// Aggiornamento rbac.js
const checkHierarchicalPermission = async (req, res, next) => {
  const userRole = req.user.primaryRole;
  const targetRole = req.params.roleId;
  
  const canManage = await personService.canManageRole(userRole.id, targetRole);
  
  if (!canManage) {
    return res.status(403).json({ error: 'Insufficient hierarchical permissions' });
  }
  
  next();
};
```

## 🎨 UI Gerarchia

### Componente TreeView
```tsx
interface RoleHierarchyProps {
  userRole: PersonRole;
  onRoleSelect: (role: PersonRole) => void;
}

const RoleHierarchy: React.FC<RoleHierarchyProps> = ({ userRole, onRoleSelect }) => {
  // Implementazione albero con react-tree-view o custom
  // Filtro basato su ruolo utente
  // Controlli CRUD gerarchici
};
```

## ⚠️ Rischi e Mitigazioni

### 🚨 Rischi Identificati
1. **Cicli nella Gerarchia**: Validazione obbligatoria
2. **Performance Query Ricorsive**: Ottimizzazione con path/level
3. **Rottura Funzionalità Esistenti**: Test regressione completi
4. **Complessità UI**: Interfaccia intuitiva e progressiva

### 🛡️ Mitigazioni
- Validazione cicli in creazione/aggiornamento
- Indici ottimizzati per query gerarchiche
- Test completi prima di ogni modifica
- UI progressiva con fallback

## 📋 Checklist Pre-Implementazione

- [ ] **Backup completo** database e codice
- [ ] **Analisi dipendenze** EnhancedUserRole
- [ ] **Test ambiente** funzionante
- [ ] **Credenziali test** verificate
- [ ] **Planning approvato** e dettagliato

## 🎯 Risultati Attesi

### ✅ Funzionalità Finali
1. **Gerarchia Completa**: Sistema ad albero PersonRole
2. **Controlli Granulari**: Permessi basati su gerarchia
3. **UI Intuitiva**: Vista ad albero nella pagina roles
4. **Sistema Pulito**: Consolidamento modelli obsoleti
5. **Performance Ottimale**: Query efficienti e indici

### 📊 Metriche di Successo
- Tutti i test esistenti passano
- Nuovi test gerarchia passano
- UI responsive e intuitiva
- Performance query < 100ms
- Zero regressioni funzionali

---

**Nota**: Questo planning segue rigorosamente le regole del progetto e mantiene la massima cautela nell'implementazione.