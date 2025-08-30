# 🗑️ Fase 5: Soft-Delete & Middleware

**Durata Stimata**: 2-3 giorni  
**Stato**: Planning  
**Priorità**: Alta  
**Dipendenze**: Fase 4 completata

## 🎯 Obiettivi Fase 5

1. **Middleware Automatico**: Implementare filtro automatico `deletedAt: null`
2. **Cleanup Manuale**: Rimuovere controlli manuali ridondanti
3. **Consistency**: Standardizzare soft-delete su tutti i modelli
4. **Performance**: Ottimizzare query con soft-delete
5. **GDPR Compliance**: Gestire eliminazione definitiva per GDPR

## 📋 Task Dettagliati

### 5.1 Analisi Stato Attuale Soft-Delete

#### 5.1.1 Inventario Modelli con deletedAt

```prisma
// MODELLI CON deletedAt (da gestire con middleware)
model Company {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model Course {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model CourseSchedule {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model CourseEnrollment {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model CourseSession {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model Attestato {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model LetteraIncarico {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model RegistroPresenze {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model Preventivo {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model Fattura {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model Permission {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model TestDocument {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model RefreshToken {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model Person {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model AdvancedPermission {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model Tenant {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model TenantConfiguration {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model EnhancedUserRole {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model TenantUsage {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model CustomRole {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

model CustomRolePermission {
  deletedAt DateTime? @map("deleted_at") // ✅ Ha soft-delete
}

// MODELLI CON isActive (gestione diversa)
model PersonRole {
  isActive Boolean @default(true) // ❌ Usa isActive invece di deletedAt
}

model RolePermission {
  // ❌ Nessun soft-delete
}

// MODELLI SENZA SOFT-DELETE (da valutare)
model ActivityLog {
  // ❌ Nessun soft-delete - OK per audit
}

model GdprAuditLog {
  // ❌ Nessun soft-delete - OK per compliance
}

model ConsentRecord {
  // ❌ Nessun soft-delete - OK per GDPR
}

model PersonSession {
  isActive Boolean @default(true) // ❌ Usa isActive
}
```

#### 5.1.2 Controlli Manuali Esistenti

```javascript
// PATTERN ATTUALI DA SOSTITUIRE

// ❌ Controlli manuali ridondanti
const activePersons = await prisma.person.findMany({
  where: { 
    deletedAt: null,
    companyId: companyId 
  }
});

const activeCompanies = await prisma.company.findMany({
  where: { 
    deletedAt: null,
    tenantId: tenantId 
  }
});

// ❌ Include con filtri manuali
const personWithRoles = await prisma.person.findUnique({
  where: { id: personId },
  include: {
    personRoles: {
      where: { isActive: true } // Diverso pattern
    },
    company: {
      where: { deletedAt: null }
    }
  }
});
```

### 5.2 Implementazione Middleware Soft-Delete

#### 5.2.1 Middleware Prisma Principale

```javascript
// middleware/soft-delete.js
const SOFT_DELETE_MODELS = [
  'Company', 'Course', 'CourseSchedule', 'CourseEnrollment', 'CourseSession',
  'Attestato', 'LetteraIncarico', 'RegistroPresenze', 'Preventivo', 'Fattura',
  'Permission', 'TestDocument', 'RefreshToken', 'Person', 'AdvancedPermission',
  'Tenant', 'TenantConfiguration', 'EnhancedUserRole', 'TenantUsage',
  'CustomRole', 'CustomRolePermission'
];

const IS_ACTIVE_MODELS = [
  'PersonRole', 'PersonSession'
];

/**
 * Middleware per gestione automatica soft-delete
 * Aggiunge automaticamente filtri deletedAt: null o isActive: true
 */
function createSoftDeleteMiddleware() {
  return async (params, next) => {
    const { model, action } = params;
    
    // Skip se modello non ha soft-delete
    if (!SOFT_DELETE_MODELS.includes(model) && !IS_ACTIVE_MODELS.includes(model)) {
      return next(params);
    }
    
    // FIND OPERATIONS - Aggiungere filtri automatici
    if (['findFirst', 'findMany', 'findUnique', 'count', 'aggregate'].includes(action)) {
      return handleFindOperations(params, next);
    }
    
    // DELETE OPERATIONS - Convertire in soft-delete
    if (['delete', 'deleteMany'].includes(action)) {
      return handleDeleteOperations(params, next);
    }
    
    // UPDATE OPERATIONS - Preservare filtri
    if (['update', 'updateMany', 'upsert'].includes(action)) {
      return handleUpdateOperations(params, next);
    }
    
    return next(params);
  };
}

/**
 * Gestisce operazioni di ricerca aggiungendo filtri soft-delete
 */
function handleFindOperations(params, next) {
  const { model, args } = params;
  
  if (!args) {
    params.args = {};
  }
  
  if (!args.where) {
    params.args.where = {};
  }
  
  // Aggiungere filtro appropriato se non già presente
  if (SOFT_DELETE_MODELS.includes(model)) {
    if (!('deletedAt' in args.where)) {
      params.args.where.deletedAt = null;
    }
  } else if (IS_ACTIVE_MODELS.includes(model)) {
    if (!('isActive' in args.where)) {
      params.args.where.isActive = true;
    }
  }
  
  // Gestire include/select con soft-delete
  if (args.include) {
    params.args.include = addSoftDeleteToIncludes(args.include);
  }
  
  return next(params);
}

/**
 * Gestisce operazioni di eliminazione convertendole in soft-delete
 */
function handleDeleteOperations(params, next) {
  const { model, action, args } = params;
  
  if (SOFT_DELETE_MODELS.includes(model)) {
    // Convertire delete in update con deletedAt
    params.action = action === 'delete' ? 'update' : 'updateMany';
    params.args.data = {
      deletedAt: new Date()
    };
    
    // Aggiungere filtro per non eliminare già eliminati
    if (!args.where) {
      params.args.where = {};
    }
    params.args.where.deletedAt = null;
    
  } else if (IS_ACTIVE_MODELS.includes(model)) {
    // Convertire delete in update con isActive: false
    params.action = action === 'delete' ? 'update' : 'updateMany';
    params.args.data = {
      isActive: false
    };
    
    if (!args.where) {
      params.args.where = {};
    }
    params.args.where.isActive = true;
  }
  
  return next(params);
}

/**
 * Gestisce operazioni di aggiornamento preservando filtri soft-delete
 */
function handleUpdateOperations(params, next) {
  const { model, args } = params;
  
  if (!args.where) {
    params.args.where = {};
  }
  
  // Aggiungere filtro per aggiornare solo record attivi
  if (SOFT_DELETE_MODELS.includes(model)) {
    if (!('deletedAt' in args.where)) {
      params.args.where.deletedAt = null;
    }
  } else if (IS_ACTIVE_MODELS.includes(model)) {
    if (!('isActive' in args.where)) {
      params.args.where.isActive = true;
    }
  }
  
  return next(params);
}

/**
 * Aggiunge filtri soft-delete agli include
 */
function addSoftDeleteToIncludes(include) {
  const processedInclude = {};
  
  for (const [key, value] of Object.entries(include)) {
    if (typeof value === 'boolean' && value === true) {
      // Semplice include: true -> aggiungere where
      processedInclude[key] = {
        where: getSoftDeleteFilter(key)
      };
    } else if (typeof value === 'object') {
      // Include complesso
      processedInclude[key] = {
        ...value,
        where: {
          ...getSoftDeleteFilter(key),
          ...(value.where || {})
        }
      };
      
      // Ricorsione per include annidati
      if (value.include) {
        processedInclude[key].include = addSoftDeleteToIncludes(value.include);
      }
    } else {
      processedInclude[key] = value;
    }
  }
  
  return processedInclude;
}

/**
 * Determina il filtro soft-delete appropriato per un modello
 */
function getSoftDeleteFilter(relationName) {
  // Mapping relation name -> model name
  const relationToModel = {
    'company': 'Company',
    'person': 'Person',
    'personRoles': 'PersonRole',
    'courseSchedules': 'CourseSchedule',
    'enrollments': 'CourseEnrollment',
    'sessions': 'CourseSession',
    'attestati': 'Attestato',
    'refreshTokens': 'RefreshToken',
    'permissions': 'Permission',
    'customRole': 'CustomRole',
    'tenant': 'Tenant'
  };
  
  const modelName = relationToModel[relationName];
  
  if (SOFT_DELETE_MODELS.includes(modelName)) {
    return { deletedAt: null };
  } else if (IS_ACTIVE_MODELS.includes(modelName)) {
    return { isActive: true };
  }
  
  return {};
}

module.exports = { createSoftDeleteMiddleware };
```

#### 5.2.2 Configurazione Prisma Client

```javascript
// lib/prisma.js
const { PrismaClient } = require('@prisma/client');
const { createSoftDeleteMiddleware } = require('../middleware/soft-delete');
const { createMultiTenantMiddleware } = require('../middleware/multi-tenant');
const { createAuditMiddleware } = require('../middleware/audit');

class ExtendedPrismaClient extends PrismaClient {
  constructor(options = {}) {
    super(options);
    
    // Registrare middleware in ordine di priorità
    this.$use(createSoftDeleteMiddleware());
    this.$use(createMultiTenantMiddleware());
    this.$use(createAuditMiddleware());
  }
  
  /**
   * Metodo per eliminazione definitiva (GDPR)
   * Bypassa il middleware soft-delete
   */
  async hardDelete(model, where) {
    const modelDelegate = this[model.toLowerCase()];
    
    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`);
    }
    
    // Usare $executeRaw per bypassare middleware
    const tableName = getTableName(model);
    const whereClause = buildWhereClause(where);
    
    return this.$executeRaw`
      DELETE FROM ${tableName} 
      WHERE ${whereClause}
    `;
  }
  
  /**
   * Metodo per recuperare record eliminati
   */
  async findDeleted(model, args = {}) {
    const modelDelegate = this[model.toLowerCase()];
    
    return modelDelegate.findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: { not: null }
      }
    });
  }
  
  /**
   * Metodo per ripristinare record eliminati
   */
  async restore(model, where) {
    const modelDelegate = this[model.toLowerCase()];
    
    return modelDelegate.updateMany({
      where: {
        ...where,
        deletedAt: { not: null }
      },
      data: {
        deletedAt: null
      }
    });
  }
}

const prisma = new ExtendedPrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Logging query per debug
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Query:', e.query);
    console.log('Params:', e.params);
    console.log('Duration:', e.duration + 'ms');
  }
});

module.exports = prisma;
```

### 5.3 Cleanup Codice Esistente

#### 5.3.1 Rimozione Controlli Manuali

```javascript
// refactor-manual-checks.js
const fs = require('fs');
const path = require('path');

/**
 * Script per rimuovere controlli manuali deletedAt: null
 */
function refactorSoftDeleteChecks() {
  const filesToProcess = [
    'backend/src/controllers',
    'backend/src/services',
    'backend/routes',
    'backend/middleware'
  ];
  
  filesToProcess.forEach(dir => {
    processDirectory(dir);
  });
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  
  files.forEach(file => {
    if (file.isDirectory()) {
      processDirectory(path.join(dirPath, file.name));
    } else if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
      processFile(path.join(dirPath, file.name));
    }
  });
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern da rimuovere
  const patterns = [
    // deletedAt: null in where clauses
    {
      pattern: /deletedAt:\s*null,?/g,
      replacement: '',
      description: 'Remove deletedAt: null'
    },
    // { deletedAt: null } standalone
    {
      pattern: /\{\s*deletedAt:\s*null\s*\}/g,
      replacement: '{}',
      description: 'Remove standalone deletedAt filter'
    },
    // isActive: true per PersonRole
    {
      pattern: /isActive:\s*true,?/g,
      replacement: '',
      description: 'Remove isActive: true for PersonRole'
    },
    // Cleanup virgole doppie
    {
      pattern: /,\s*,/g,
      replacement: ',',
      description: 'Fix double commas'
    },
    // Cleanup oggetti vuoti in where
    {
      pattern: /where:\s*\{\s*\}/g,
      replacement: '',
      description: 'Remove empty where clauses'
    }
  ];
  
  patterns.forEach(({ pattern, replacement, description }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
      console.log(`${filePath}: ${description}`);
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
  }
}

// Eseguire refactoring
refactorSoftDeleteChecks();
```

#### 5.3.2 Esempi di Refactoring

```javascript
// PRIMA - Con controlli manuali
const getActivePersons = async (companyId) => {
  return prisma.person.findMany({
    where: {
      companyId,
      deletedAt: null // ❌ Ridondante con middleware
    },
    include: {
      personRoles: {
        where: { isActive: true } // ❌ Ridondante con middleware
      },
      company: {
        where: { deletedAt: null } // ❌ Ridondante con middleware
      }
    }
  });
};

// DOPO - Middleware automatico
const getActivePersons = async (companyId) => {
  return prisma.person.findMany({
    where: {
      companyId
      // ✅ deletedAt: null aggiunto automaticamente
    },
    include: {
      personRoles: true, // ✅ isActive: true aggiunto automaticamente
      company: true // ✅ deletedAt: null aggiunto automaticamente
    }
  });
};

// PRIMA - Delete manuale
const deletePerson = async (personId) => {
  return prisma.person.update({
    where: { id: personId },
    data: { deletedAt: new Date() } // ❌ Manuale
  });
};

// DOPO - Delete automatico
const deletePerson = async (personId) => {
  return prisma.person.delete({
    where: { id: personId }
    // ✅ Convertito automaticamente in soft-delete
  });
};
```

### 5.4 Gestione Casi Speciali

#### 5.4.1 Override Middleware per Admin

```javascript
// services/admin-service.js
class AdminService {
  /**
   * Visualizzare tutti i record inclusi quelli eliminati
   */
  async getAllPersonsIncludingDeleted() {
    return prisma.person.findMany({
      where: {
        // Specificare esplicitamente per override middleware
        OR: [
          { deletedAt: null },
          { deletedAt: { not: null } }
        ]
      }
    });
  }
  
  /**
   * Eliminazione definitiva per GDPR
   */
  async hardDeletePerson(personId, reason) {
    // Log operazione critica
    await prisma.gdprAuditLog.create({
      data: {
        personId,
        action: 'HARD_DELETE',
        resourceType: 'PERSON',
        details: `Hard delete reason: ${reason}`,
        performedBy: 'ADMIN'
      }
    });
    
    // Eliminazione definitiva
    return prisma.hardDelete('Person', { id: personId });
  }
  
  /**
   * Ripristino record eliminato
   */
  async restorePerson(personId) {
    return prisma.restore('Person', { id: personId });
  }
}
```

#### 5.4.2 Gestione Multi-Tenant con Soft-Delete

```javascript
// middleware/multi-tenant-soft-delete.js
function createMultiTenantSoftDeleteMiddleware() {
  return async (params, next) => {
    const { model, action, args } = params;
    
    // Modelli multi-tenant
    const MULTI_TENANT_MODELS = [
      'Person', 'Company', 'CourseSchedule', 'CustomRole'
    ];
    
    if (!MULTI_TENANT_MODELS.includes(model)) {
      return next(params);
    }
    
    // Ottenere tenantId dal contesto
    const tenantId = getCurrentTenantId();
    
    if (!tenantId) {
      throw new Error('TenantId required for multi-tenant operations');
    }
    
    // Aggiungere tenantId a tutte le operazioni
    if (['findFirst', 'findMany', 'findUnique', 'count'].includes(action)) {
      if (!args.where) {
        params.args.where = {};
      }
      params.args.where.tenantId = tenantId;
    }
    
    if (['create', 'createMany'].includes(action)) {
      if (Array.isArray(args.data)) {
        params.args.data = args.data.map(item => ({
          ...item,
          tenantId
        }));
      } else {
        params.args.data = {
          ...args.data,
          tenantId
        };
      }
    }
    
    if (['update', 'updateMany', 'delete', 'deleteMany'].includes(action)) {
      if (!args.where) {
        params.args.where = {};
      }
      params.args.where.tenantId = tenantId;
    }
    
    return next(params);
  };
}
```

### 5.5 Performance Optimization

#### 5.5.1 Indici per Soft-Delete

```prisma
// Aggiungere indici ottimizzati per soft-delete
model Person {
  @@index([deletedAt]) // Per filtri soft-delete
  @@index([deletedAt, tenantId]) // Composite multi-tenant
  @@index([deletedAt, companyId]) // Composite company
  @@index([deletedAt, status]) // Composite status
}

model PersonRole {
  @@index([isActive]) // Per filtri active
  @@index([isActive, roleType]) // Composite role filtering
  @@index([isActive, personId]) // Composite person roles
}

model Company {
  @@index([deletedAt]) // Per filtri soft-delete
  @@index([deletedAt, tenantId]) // Composite multi-tenant
}

model CourseSchedule {
  @@index([deletedAt]) // Per filtri soft-delete
  @@index([deletedAt, companyId]) // Composite company
  @@index([deletedAt, status]) // Composite status
  @@index([deletedAt, startDate]) // Composite date filtering
}
```

#### 5.5.2 Query Optimization

```javascript
// benchmark-soft-delete.js
const { performance } = require('perf_hooks');

async function benchmarkSoftDeleteQueries() {
  console.log('Benchmarking soft-delete queries...');
  
  // Test 1: Simple find with middleware
  const start1 = performance.now();
  const persons1 = await prisma.person.findMany({
    where: { companyId: testCompanyId }
  });
  const duration1 = performance.now() - start1;
  console.log(`Middleware soft-delete: ${duration1.toFixed(2)}ms`);
  
  // Test 2: Manual filter (comparison)
  const start2 = performance.now();
  const persons2 = await prisma.person.findMany({
    where: { 
      companyId: testCompanyId,
      deletedAt: null 
    }
  });
  const duration2 = performance.now() - start2;
  console.log(`Manual soft-delete: ${duration2.toFixed(2)}ms`);
  
  // Test 3: Complex include with middleware
  const start3 = performance.now();
  const personsWithRoles = await prisma.person.findMany({
    where: { companyId: testCompanyId },
    include: {
      personRoles: true,
      company: true
    }
  });
  const duration3 = performance.now() - start3;
  console.log(`Complex include with middleware: ${duration3.toFixed(2)}ms`);
  
  return {
    middleware: duration1,
    manual: duration2,
    complex: duration3
  };
}
```

### 5.6 Testing Strategy

#### 5.6.1 Test Middleware Behavior

```javascript
// test-soft-delete-middleware.test.js
describe('Soft Delete Middleware', () => {
  beforeEach(async () => {
    // Setup test data
    await setupTestData();
  });
  
  describe('Automatic filtering', () => {
    test('findMany should exclude deleted records', async () => {
      // Create active and deleted persons
      const activePerson = await prisma.person.create({
        data: {
          firstName: 'Active',
          lastName: 'Person',
          email: 'active@test.com',
          companyId: testCompanyId
        }
      });
      
      const deletedPerson = await prisma.person.create({
        data: {
          firstName: 'Deleted',
          lastName: 'Person',
          email: 'deleted@test.com',
          companyId: testCompanyId,
          deletedAt: new Date()
        }
      });
      
      // Query should only return active
      const persons = await prisma.person.findMany({
        where: { companyId: testCompanyId }
      });
      
      expect(persons).toHaveLength(1);
      expect(persons[0].id).toBe(activePerson.id);
    });
    
    test('include should filter related records', async () => {
      const person = await prisma.person.create({
        data: {
          firstName: 'Test',
          lastName: 'Person',
          email: 'test@test.com',
          companyId: testCompanyId
        }
      });
      
      // Create active and inactive roles
      await prisma.personRole.create({
        data: {
          personId: person.id,
          roleType: 'EMPLOYEE',
          isActive: true
        }
      });
      
      await prisma.personRole.create({
        data: {
          personId: person.id,
          roleType: 'ADMIN',
          isActive: false
        }
      });
      
      // Query with include
      const personWithRoles = await prisma.person.findUnique({
        where: { id: person.id },
        include: { personRoles: true }
      });
      
      expect(personWithRoles.personRoles).toHaveLength(1);
      expect(personWithRoles.personRoles[0].roleType).toBe('EMPLOYEE');
    });
  });
  
  describe('Soft delete conversion', () => {
    test('delete should convert to soft delete', async () => {
      const person = await prisma.person.create({
        data: {
          firstName: 'Test',
          lastName: 'Person',
          email: 'test@test.com',
          companyId: testCompanyId
        }
      });
      
      // Delete should convert to soft delete
      await prisma.person.delete({
        where: { id: person.id }
      });
      
      // Record should still exist with deletedAt
      const deletedPerson = await prisma.person.findFirst({
        where: {
          id: person.id,
          deletedAt: { not: null }
        }
      });
      
      expect(deletedPerson).not.toBeNull();
      expect(deletedPerson.deletedAt).not.toBeNull();
    });
    
    test('PersonRole delete should set isActive false', async () => {
      const personRole = await prisma.personRole.create({
        data: {
          personId: testPersonId,
          roleType: 'EMPLOYEE',
          isActive: true
        }
      });
      
      // Delete should set isActive: false
      await prisma.personRole.delete({
        where: { id: personRole.id }
      });
      
      // Record should exist with isActive: false
      const inactiveRole = await prisma.personRole.findFirst({
        where: {
          id: personRole.id,
          isActive: false
        }
      });
      
      expect(inactiveRole).not.toBeNull();
      expect(inactiveRole.isActive).toBe(false);
    });
  });
  
  describe('Admin operations', () => {
    test('hardDelete should permanently remove record', async () => {
      const person = await prisma.person.create({
        data: {
          firstName: 'Test',
          lastName: 'Person',
          email: 'test@test.com',
          companyId: testCompanyId
        }
      });
      
      // Hard delete
      await prisma.hardDelete('Person', { id: person.id });
      
      // Record should not exist
      const deletedPerson = await prisma.person.findFirst({
        where: { id: person.id }
      });
      
      expect(deletedPerson).toBeNull();
    });
    
    test('restore should reactivate soft-deleted record', async () => {
      const person = await prisma.person.create({
        data: {
          firstName: 'Test',
          lastName: 'Person',
          email: 'test@test.com',
          companyId: testCompanyId,
          deletedAt: new Date()
        }
      });
      
      // Restore
      await prisma.restore('Person', { id: person.id });
      
      // Record should be active again
      const restoredPerson = await prisma.person.findUnique({
        where: { id: person.id }
      });
      
      expect(restoredPerson).not.toBeNull();
      expect(restoredPerson.deletedAt).toBeNull();
    });
  });
});
```

#### 5.6.2 Test Performance Impact

```javascript
// test-middleware-performance.test.js
describe('Middleware Performance', () => {
  test('middleware overhead should be minimal', async () => {
    const iterations = 100;
    
    // Benchmark with middleware
    const startWithMiddleware = performance.now();
    for (let i = 0; i < iterations; i++) {
      await prisma.person.findMany({
        where: { companyId: testCompanyId },
        take: 10
      });
    }
    const durationWithMiddleware = performance.now() - startWithMiddleware;
    
    // Benchmark manual (for comparison)
    const startManual = performance.now();
    for (let i = 0; i < iterations; i++) {
      await prisma.person.findMany({
        where: { 
          companyId: testCompanyId,
          deletedAt: null 
        },
        take: 10
      });
    }
    const durationManual = performance.now() - startManual;
    
    const overhead = ((durationWithMiddleware - durationManual) / durationManual) * 100;
    
    console.log(`Middleware overhead: ${overhead.toFixed(2)}%`);
    expect(overhead).toBeLessThan(10); // < 10% overhead
  });
});
```

## ✅ Criteri di Completamento

- [ ] Middleware soft-delete implementato e testato
- [ ] Controlli manuali rimossi dal codebase
- [ ] Performance overhead < 10%
- [ ] Test automatici passano al 100%
- [ ] Gestione GDPR con hard delete implementata
- [ ] Indici ottimizzati per soft-delete
- [ ] Documentazione middleware aggiornata
- [ ] Admin tools per gestione record eliminati

## 🚨 Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Performance degradation | Media | Medio | Benchmark continuo |
| Middleware bugs | Media | Alto | Test approfonditi |
| GDPR compliance issues | Bassa | Critico | Hard delete per compliance |
| Data inconsistency | Bassa | Alto | Transazioni atomiche |

## 📊 Metriche di Successo

| Metrica | Target | Baseline | Post-Implementazione |
|---------|--------|----------|---------------------|
| **Controlli Manuali Rimossi** | 100% | 150+ occorrenze | __ occorrenze |
| **Performance Overhead** | <10% | N/A | __ % |
| **Test Coverage** | >95% | N/A | __ % |
| **Query Consistency** | 100% | N/A | __ % |

## 📞 Prossimi Passi

Al completamento Fase 5:
1. **Verifica consistency** soft-delete
2. **Monitoring performance** continuo
3. **Preparazione Fase 6** (Multi-tenant & Sicurezza)
4. **Training team** su nuovo middleware

---

**Nota**: Il middleware soft-delete è un componente critico. Testare accuratamente tutti gli scenari prima del deploy.