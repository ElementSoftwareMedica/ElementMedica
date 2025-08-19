# 🔐 Fase 6: Multi-tenant & Sicurezza

## 📋 Obiettivi

### Obiettivi Primari
- **Sicurezza Multi-tenant**: Rendere `tenantId` non-nullable dove necessario
- **Row-Level Security**: Implementare RLS in PostgreSQL
- **Middleware Sicurezza**: Iniettare automaticamente `tenantId` nelle query
- **Isolamento Dati**: Garantire separazione completa tra tenant
- **Conformità GDPR**: Mantenere compliance nella gestione multi-tenant

### Obiettivi Secondari
- **Performance**: Ottimizzare query multi-tenant
- **Audit Trail**: Tracciamento accessi cross-tenant
- **Backup Sicuro**: Strategie di backup per tenant

## 🎯 Task Dettagliati

### 6.1 Analisi Stato Attuale Multi-tenant

#### 6.1.1 Inventario Modelli con tenantId
```bash
# Script per identificare modelli con tenantId
grep -n "tenantId" backend/prisma/schema.prisma
```

**Modelli con tenantId identificati:**
- `Person` - tenantId nullable ❌ (da rendere required)
- `Company` - tenantId nullable ❌ (da rendere required)
- `Course` - tenantId nullable ❌ (da rendere required)
- `CourseSchedule` - tenantId nullable ❌ (da rendere required)
- `ActivityLog` - tenantId nullable ❌ (da rendere required)
- `GdprAuditLog` - tenantId nullable ❌ (da rendere required)
- `ConsentRecord` - tenantId nullable ❌ (da rendere required)
- `Tenant` - Non ha tenantId (corretto)
- `TenantConfiguration` - Non ha tenantId (corretto)

#### 6.1.2 Identificazione Modelli Senza tenantId
**Modelli che necessitano tenantId:**
- `CourseEnrollment` ❌
- `CourseSession` ❌
- `RegistroPresenze` ❌
- `RegistroPresenzePartecipante` ❌
- `Preventivo` ❌
- `PreventivoPartecipante` ❌
- `Fattura` ❌
- `Attestato` ❌
- `LetteraIncarico` ❌

**Modelli che NON necessitano tenantId:**
- `Permission` (globali)
- `RefreshToken` (gestiti a livello utente)
- `PersonSession` (gestiti a livello utente)
- `TestDocument` (temporanei)

### 6.2 Implementazione tenantId Required

#### 6.2.1 Schema Prisma Aggiornato
```prisma
// Esempio: Person model
model Person {
  id        String   @id @default(cuid())
  email     String   @unique
  firstName String
  lastName  String
  tenantId  String   // ✅ Rimosso ? per renderlo required
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relazioni
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([tenantId, email])
  @@unique([email, tenantId]) // Email unica per tenant
}

// Esempio: Company model
model Company {
  id          String   @id @default(cuid())
  name        String
  vatNumber   String?
  tenantId    String   // ✅ Required
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relazioni
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([tenantId, name])
  @@unique([vatNumber, tenantId]) // VAT unico per tenant
}

// Aggiunta tenantId ai modelli mancanti
model CourseEnrollment {
  id         String   @id @default(cuid())
  personId   String
  courseId   String
  tenantId   String   // ✅ Nuovo campo
  enrolledAt DateTime @default(now())
  deletedAt  DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relazioni
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([tenantId, personId])
  @@index([tenantId, courseId])
  @@unique([personId, courseId, tenantId])
}
```

#### 6.2.2 Script di Migrazione Dati
```sql
-- Migrazione per aggiungere tenantId ai modelli esistenti
-- ATTENZIONE: Eseguire solo dopo backup completo

-- 1. Aggiungere colonna tenantId (nullable temporaneamente)
ALTER TABLE "CourseEnrollment" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CourseSession" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RegistroPresenze" ADD COLUMN "tenantId" TEXT;
-- ... altri modelli

-- 2. Popolare tenantId basandosi su relazioni esistenti
UPDATE "CourseEnrollment" 
SET "tenantId" = (
  SELECT p."tenantId" 
  FROM "Person" p 
  WHERE p.id = "CourseEnrollment"."personId"
)
WHERE "tenantId" IS NULL;

-- 3. Rendere tenantId NOT NULL
ALTER TABLE "CourseEnrollment" ALTER COLUMN "tenantId" SET NOT NULL;

-- 4. Aggiungere foreign key constraint
ALTER TABLE "CourseEnrollment" 
ADD CONSTRAINT "CourseEnrollment_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

-- 5. Aggiungere indici
CREATE INDEX "CourseEnrollment_tenantId_idx" ON "CourseEnrollment"("tenantId");
CREATE INDEX "CourseEnrollment_tenantId_personId_idx" ON "CourseEnrollment"("tenantId", "personId");
```

### 6.3 Row-Level Security (RLS)

#### 6.3.1 Abilitazione RLS su Tabelle
```sql
-- Abilitare RLS su tutte le tabelle multi-tenant
ALTER TABLE "Person" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RegistroPresenze" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Preventivo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fattura" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attestato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GdprAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentRecord" ENABLE ROW LEVEL SECURITY;
```

#### 6.3.2 Policy RLS per Tenant Isolation
```sql
-- Policy per Person
CREATE POLICY "tenant_isolation_person" ON "Person"
  FOR ALL
  TO authenticated
  USING ("tenantId" = current_setting('jwt.claims.tenantId', true))
  WITH CHECK ("tenantId" = current_setting('jwt.claims.tenantId', true));

-- Policy per Company
CREATE POLICY "tenant_isolation_company" ON "Company"
  FOR ALL
  TO authenticated
  USING ("tenantId" = current_setting('jwt.claims.tenantId', true))
  WITH CHECK ("tenantId" = current_setting('jwt.claims.tenantId', true));

-- Policy per Course
CREATE POLICY "tenant_isolation_course" ON "Course"
  FOR ALL
  TO authenticated
  USING ("tenantId" = current_setting('jwt.claims.tenantId', true))
  WITH CHECK ("tenantId" = current_setting('jwt.claims.tenantId', true));

-- Policy generica per tutti i modelli multi-tenant
-- Script per generare policy automaticamente
DO $$
DECLARE
    table_name TEXT;
    policy_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('Tenant', 'TenantConfiguration', 'Permission', '_prisma_migrations')
    LOOP
        policy_name := 'tenant_isolation_' || lower(table_name);
        
        EXECUTE format('
            CREATE POLICY %I ON %I
            FOR ALL
            TO authenticated
            USING ("tenantId" = current_setting(''jwt.claims.tenantId'', true))
            WITH CHECK ("tenantId" = current_setting(''jwt.claims.tenantId'', true))
        ', policy_name, table_name);
    END LOOP;
END $$;
```

#### 6.3.3 Configurazione JWT Claims
```javascript
// backend/auth/jwt-advanced.js
const generateToken = (person, tenant) => {
  const payload = {
    personId: person.id,
    email: person.email,
    tenantId: tenant.id,
    roles: person.personRoles.map(pr => pr.roleType)
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'project2.0',
    audience: tenant.id
  });
};

// Middleware per impostare current_setting
const setTenantContext = async (req, res, next) => {
  if (req.user && req.user.tenantId) {
    await prisma.$executeRaw`
      SELECT set_config('jwt.claims.tenantId', ${req.user.tenantId}, true)
    `;
  }
  next();
};
```

### 6.4 Middleware Prisma Multi-tenant

#### 6.4.1 Middleware Automatico tenantId
```javascript
// backend/config/prisma-multi-tenant.js
const createMultiTenantMiddleware = () => {
  return async (params, next) => {
    const { model, action, args } = params;
    
    // Modelli che non necessitano tenantId
    const globalModels = ['Tenant', 'TenantConfiguration', 'Permission'];
    const userSpecificModels = ['RefreshToken', 'PersonSession'];
    
    if (globalModels.includes(model) || userSpecificModels.includes(model)) {
      return next(params);
    }
    
    // Ottieni tenantId dal context
    const tenantId = getTenantIdFromContext();
    
    if (!tenantId) {
      throw new Error('TenantId is required for this operation');
    }
    
    // Inietta tenantId nelle query
    if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(action)) {
      args.where = args.where || {};
      args.where.tenantId = tenantId;
    }
    
    // Inietta tenantId nelle operazioni di scrittura
    if (['create', 'createMany'].includes(action)) {
      if (action === 'create') {
        args.data.tenantId = tenantId;
      } else if (action === 'createMany') {
        args.data = args.data.map(item => ({ ...item, tenantId }));
      }
    }
    
    // Inietta tenantId nelle operazioni di aggiornamento
    if (['update', 'updateMany', 'upsert'].includes(action)) {
      args.where = args.where || {};
      args.where.tenantId = tenantId;
      
      if (action === 'upsert') {
        args.create.tenantId = tenantId;
        args.update.tenantId = tenantId;
      }
    }
    
    // Inietta tenantId nelle operazioni di cancellazione
    if (['delete', 'deleteMany'].includes(action)) {
      args.where = args.where || {};
      args.where.tenantId = tenantId;
    }
    
    return next(params);
  };
};

// Funzione per ottenere tenantId dal context
const getTenantIdFromContext = () => {
  // Implementazione basata su AsyncLocalStorage o context globale
  const store = asyncLocalStorage.getStore();
  return store?.tenantId;
};

// Configurazione Prisma Client
const prisma = new PrismaClient();
prisma.$use(createMultiTenantMiddleware());
```

#### 6.4.2 Context Manager per Tenant
```javascript
// backend/middleware/tenant-context.js
const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

const tenantContextMiddleware = (req, res, next) => {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }
  
  // Imposta context per la richiesta
  asyncLocalStorage.run({ tenantId, userId: req.user?.id }, () => {
    next();
  });
};

module.exports = {
  tenantContextMiddleware,
  asyncLocalStorage
};
```

### 6.5 Sicurezza Avanzata

#### 6.5.1 Validazione Cross-Tenant
```javascript
// backend/middleware/cross-tenant-validation.js
const validateCrossTenantAccess = async (req, res, next) => {
  const userTenantId = req.user.tenantId;
  const requestedTenantId = req.params.tenantId || req.body.tenantId;
  
  // Verifica che l'utente non stia accedendo a dati di altri tenant
  if (requestedTenantId && requestedTenantId !== userTenantId) {
    await logSecurityViolation({
      userId: req.user.id,
      userTenantId,
      requestedTenantId,
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({ 
      error: 'Cross-tenant access denied',
      code: 'CROSS_TENANT_VIOLATION'
    });
  }
  
  next();
};

const logSecurityViolation = async (violation) => {
  await prisma.gdprAuditLog.create({
    data: {
      action: 'CROSS_TENANT_VIOLATION',
      entityType: 'SECURITY',
      entityId: violation.userId,
      details: JSON.stringify(violation),
      ipAddress: violation.ip,
      userAgent: violation.userAgent,
      tenantId: violation.userTenantId
    }
  });
};
```

#### 6.5.2 Audit Trail Multi-tenant
```javascript
// backend/middleware/multi-tenant-audit.js
const auditMultiTenantAccess = async (req, res, next) => {
  const startTime = Date.now();
  
  // Intercetta la risposta
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log dell'accesso
    logTenantAccess({
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      dataSize: Buffer.byteLength(data || '', 'utf8'),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    originalSend.call(this, data);
  };
  
  next();
};

const logTenantAccess = async (accessLog) => {
  // Log solo per operazioni sensibili o lente
  if (accessLog.duration > 1000 || accessLog.statusCode >= 400) {
    await prisma.activityLog.create({
      data: {
        action: `${accessLog.method}_${accessLog.endpoint}`,
        entityType: 'API_ACCESS',
        entityId: accessLog.userId,
        details: JSON.stringify({
          statusCode: accessLog.statusCode,
          duration: accessLog.duration,
          dataSize: accessLog.dataSize
        }),
        ipAddress: accessLog.ip,
        userAgent: accessLog.userAgent,
        tenantId: accessLog.tenantId
      }
    });
  }
};
```

### 6.6 Performance Multi-tenant

#### 6.6.1 Indici Ottimizzati per Multi-tenant
```sql
-- Indici compositi per performance multi-tenant
CREATE INDEX CONCURRENTLY "Person_tenantId_email_idx" ON "Person"("tenantId", "email");
CREATE INDEX CONCURRENTLY "Person_tenantId_deletedAt_idx" ON "Person"("tenantId", "deletedAt");
CREATE INDEX CONCURRENTLY "Company_tenantId_name_idx" ON "Company"("tenantId", "name");
CREATE INDEX CONCURRENTLY "Course_tenantId_startDate_idx" ON "Course"("tenantId", "startDate");
CREATE INDEX CONCURRENTLY "ActivityLog_tenantId_createdAt_idx" ON "ActivityLog"("tenantId", "createdAt");

-- Indici parziali per soft-delete
CREATE INDEX CONCURRENTLY "Person_tenantId_active_idx" 
ON "Person"("tenantId") WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY "Company_tenantId_active_idx" 
ON "Company"("tenantId") WHERE "deletedAt" IS NULL;
```

#### 6.6.2 Query Ottimizzate
```javascript
// Esempi di query ottimizzate per multi-tenant
const getActivePersonsByTenant = async (tenantId) => {
  return await prisma.person.findMany({
    where: {
      tenantId,
      deletedAt: null
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

// Query con join ottimizzato
const getPersonsWithRoles = async (tenantId) => {
  return await prisma.person.findMany({
    where: {
      tenantId,
      deletedAt: null
    },
    include: {
      personRoles: {
        where: {
          deletedAt: null
        },
        select: {
          roleType: true,
          assignedAt: true
        }
      }
    }
  });
};
```

## 🧪 Strategia di Testing

### 6.7 Test Multi-tenant

#### 6.7.1 Test Isolamento Tenant
```javascript
// tests/multi-tenant.test.js
describe('Multi-tenant Isolation', () => {
  let tenant1, tenant2, user1, user2;
  
  beforeEach(async () => {
    // Setup tenant separati
    tenant1 = await createTestTenant('tenant1');
    tenant2 = await createTestTenant('tenant2');
    
    user1 = await createTestUser(tenant1.id);
    user2 = await createTestUser(tenant2.id);
  });
  
  test('User cannot access other tenant data', async () => {
    const token1 = generateToken(user1, tenant1);
    
    // Tentativo di accesso a dati di tenant2
    const response = await request(app)
      .get('/api/persons')
      .set('Authorization', `Bearer ${token1}`)
      .set('X-Tenant-ID', tenant2.id);
    
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CROSS_TENANT_VIOLATION');
  });
  
  test('RLS prevents cross-tenant data access', async () => {
    // Crea dati in tenant1
    const person1 = await createPersonInTenant(tenant1.id);
    
    // Prova ad accedere con utente di tenant2
    const token2 = generateToken(user2, tenant2);
    
    const response = await request(app)
      .get(`/api/persons/${person1.id}`)
      .set('Authorization', `Bearer ${token2}`);
    
    expect(response.status).toBe(404); // RLS nasconde il record
  });
  
  test('Middleware injects tenantId automatically', async () => {
    const token1 = generateToken(user1, tenant1);
    
    const response = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
        // tenantId non specificato - deve essere iniettato
      });
    
    expect(response.status).toBe(201);
    expect(response.body.tenantId).toBe(tenant1.id);
  });
});
```

#### 6.7.2 Test Performance Multi-tenant
```javascript
// tests/multi-tenant-performance.test.js
describe('Multi-tenant Performance', () => {
  test('Query performance with tenant isolation', async () => {
    // Crea molti dati in più tenant
    await createManyPersonsInMultipleTenants(1000, 10);
    
    const startTime = Date.now();
    
    const persons = await prisma.person.findMany({
      where: {
        tenantId: 'tenant-1',
        deletedAt: null
      },
      take: 50
    });
    
    const duration = Date.now() - startTime;
    
    expect(persons.length).toBeLessThanOrEqual(50);
    expect(duration).toBeLessThan(100); // Query deve essere veloce
  });
  
  test('Index usage verification', async () => {
    const explain = await prisma.$queryRaw`
      EXPLAIN (ANALYZE, BUFFERS) 
      SELECT * FROM "Person" 
      WHERE "tenantId" = 'tenant-1' AND "deletedAt" IS NULL
      LIMIT 50
    `;
    
    const planText = explain.map(row => row['QUERY PLAN']).join('\n');
    expect(planText).toContain('Index Scan'); // Deve usare indice
    expect(planText).not.toContain('Seq Scan'); // Non deve fare scan sequenziale
  });
});
```

## ✅ Criteri di Completamento

### Checklist Tecnica
- [ ] **tenantId Required**: Tutti i modelli multi-tenant hanno tenantId non-nullable
- [ ] **RLS Abilitato**: Row-Level Security attivo su tutte le tabelle
- [ ] **Policy RLS**: Policy di isolamento tenant implementate
- [ ] **Middleware Prisma**: Iniezione automatica tenantId nelle query
- [ ] **Context Manager**: Gestione context tenant per richieste
- [ ] **Validazione Cross-tenant**: Prevenzione accessi non autorizzati
- [ ] **Audit Trail**: Logging accessi e violazioni sicurezza
- [ ] **Indici Ottimizzati**: Indici compositi per performance multi-tenant
- [ ] **JWT Claims**: Configurazione claims per RLS
- [ ] **Migrazione Dati**: Script per aggiornare dati esistenti

### Checklist Funzionale
- [ ] **Isolamento Completo**: Nessun dato cross-tenant accessibile
- [ ] **Performance Mantenute**: Query veloci con isolamento
- [ ] **GDPR Compliance**: Audit trail e gestione consensi per tenant
- [ ] **Backup Sicuri**: Strategie backup separate per tenant
- [ ] **Monitoring**: Metriche performance per tenant

### Checklist Testing
- [ ] **Test Isolamento**: Verifica impossibilità accesso cross-tenant
- [ ] **Test RLS**: Verifica funzionamento Row-Level Security
- [ ] **Test Performance**: Benchmark query multi-tenant
- [ ] **Test Sicurezza**: Penetration test isolamento
- [ ] **Test Migrazione**: Verifica integrità dati post-migrazione

## ⚠️ Rischi e Mitigazioni

### Rischi Tecnici
1. **Performance Degradation**
   - *Rischio*: RLS e middleware possono rallentare query
   - *Mitigazione*: Indici ottimizzati e benchmark continui

2. **Complessità Migrazione**
   - *Rischio*: Migrazione dati esistenti complessa
   - *Mitigazione*: Script graduali e rollback plan

3. **RLS Bypass**
   - *Rischio*: Possibili bypass delle policy RLS
   - *Mitigazione*: Test approfonditi e audit regolari

### Rischi Business
1. **Data Breach Cross-tenant**
   - *Rischio*: Accesso non autorizzato a dati altri tenant
   - *Mitigazione*: Doppia validazione (RLS + middleware)

2. **Downtime Durante Migrazione**
   - *Rischio*: Interruzione servizio durante aggiornamenti
   - *Mitigazione*: Migrazione graduale e maintenance window

## 📊 Metriche di Successo

### Metriche Sicurezza
- **Zero Cross-tenant Access**: Nessun accesso non autorizzato
- **Audit Coverage**: 100% operazioni sensibili loggate
- **RLS Effectiveness**: 100% query filtrate correttamente

### Metriche Performance
- **Query Speed**: < 100ms per query standard multi-tenant
- **Index Usage**: > 95% query usano indici appropriati
- **Memory Usage**: Nessun aumento significativo memoria

### Metriche Compliance
- **GDPR Compliance**: 100% operazioni conformi
- **Data Retention**: Policy retention rispettate per tenant
- **Consent Management**: Gestione consensi isolata per tenant

## 🔄 Prossimi Passi

1. **Fase 7**: Enum & Validazione Tipi
2. **Fase 8**: Modularizzazione & Versioning
3. **Fase 9**: Middleware & Logging
4. **Fase 10**: Pulizia Generale

---

**Note Importanti:**
- Questa fase è critica per la sicurezza del sistema
- Richiede testing approfondito prima del deployment
- Backup completo obbligatorio prima di iniziare
- Coordinamento con team DevOps per RLS setup