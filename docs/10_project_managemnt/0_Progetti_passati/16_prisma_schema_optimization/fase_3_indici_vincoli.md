# 🚀 Fase 3: Indici & Vincoli

**Durata Stimata**: 1-2 giorni  
**Stato**: Planning  
**Priorità**: Alta  
**Dipendenze**: Fase 2 completata

## 🎯 Obiettivi Fase 3

1. **Ottimizzazione Performance**: Aggiunta indici strategici su FK
2. **Gestione Vincoli @unique**: Risoluzione problemi NULL multipli
3. **Query Optimization**: Miglioramento tempi risposta
4. **Database Integrity**: Rafforzamento vincoli referenziali

## 📋 Task Dettagliati

### 3.1 Analisi Performance Baseline

#### 3.1.1 Misurazione Query Attuali
```sql
-- Abilitare query logging per analisi
SET log_statement = 'all';
SET log_min_duration_statement = 100; -- Log query > 100ms

-- Query più comuni da ottimizzare
EXPLAIN ANALYZE SELECT * FROM persons WHERE company_id = 'uuid';
EXPLAIN ANALYZE SELECT * FROM course_schedules WHERE trainer_id = 'uuid';
EXPLAIN ANALYZE SELECT * FROM person_roles WHERE person_id = 'uuid';
```

#### 3.1.2 Identificazione Bottlenecks
- [ ] Query senza indici su FK
- [ ] Scansioni sequenziali su tabelle grandi
- [ ] Join inefficienti
- [ ] Filtri su campi non indicizzati

### 3.2 Aggiunta Indici Foreign Keys

#### 3.2.1 Indici Critici (Impatto Alto)
```prisma
model Person {
  // Indici esistenti OK:
  @@index([email])
  @@index([username])
  @@index([companyId]) // ✅ Già presente
  @@index([tenantId])  // ✅ Già presente
  @@index([deletedAt, status])
  @@index([createdAt])
  
  // NUOVI indici necessari:
  @@index([globalRole]) // Per filtri ruolo
  @@index([status, tenantId]) // Composite per multi-tenant
  @@index([companyId, status]) // Composite per company filtering
}

model PersonRole {
  // Indici esistenti OK:
  @@index([personId, isActive]) // ✅ Già presente
  @@index([roleType])
  @@index([customRoleId])
  @@index([companyId])
  @@index([tenantId])
  
  // NUOVI indici necessari:
  @@index([tenantId, roleType]) // Composite per tenant-role queries
  @@index([companyId, roleType]) // Composite per company-role queries
  @@index([isActive, roleType]) // Composite per active role filtering
}

model CourseSchedule {
  // NUOVI indici necessari:
  @@index([companyId]) // FK index
  @@index([trainerId]) // FK index
  @@index([courseId]) // FK index (se non presente)
  @@index([status]) // Per filtri status
  @@index([startDate]) // Per ordinamento date
  @@index([endDate]) // Per range queries
  @@index([tenantId, status]) // Composite multi-tenant
  @@index([companyId, startDate]) // Composite per company schedules
}

model CourseEnrollment {
  // NUOVI indici necessari:
  @@index([personId]) // FK index
  @@index([scheduleId]) // FK index (se non presente)
  @@index([status]) // Per filtri enrollment status
  @@index([personId, status]) // Composite per person enrollments
  @@index([scheduleId, status]) // Composite per schedule enrollments
}

model CourseSession {
  // NUOVI indici necessari:
  @@index([scheduleId]) // FK index (se non presente)
  @@index([trainerId]) // FK index
  @@index([coTrainerId]) // FK index
  @@index([date]) // Per ordinamento/filtri data
  @@index([scheduleId, date]) // Composite per session scheduling
}

model RefreshToken {
  // NUOVI indici necessari:
  @@index([personId]) // FK index
  @@index([expiresAt]) // Per cleanup automatico
  @@index([personId, expiresAt]) // Composite per token validation
}

model ActivityLog {
  // NUOVI indici necessari:
  @@index([personId]) // FK index
  @@index([action]) // Per filtri azione
  @@index([timestamp]) // Per ordinamento cronologico
  @@index([personId, timestamp]) // Composite per user activity
}

model GdprAuditLog {
  // NUOVI indici necessari:
  @@index([personId]) // FK index
  @@index([action]) // Per filtri azione GDPR
  @@index([resourceType]) // Per filtri tipo risorsa
  @@index([createdAt]) // Per ordinamento cronologico
  @@index([personId, createdAt]) // Composite per person audit trail
}

model ConsentRecord {
  // NUOVI indici necessari:
  @@index([personId]) // FK index (se non presente)
  @@index([consentType]) // Per filtri tipo consenso
  @@index([consentGiven]) // Per filtri consenso dato/ritirato
  @@index([givenAt]) // Per ordinamento cronologico
  @@index([personId, consentType]) // Composite per person consents
}

model PersonSession {
  // NUOVI indici necessari:
  @@index([personId]) // FK index
  @@index([isActive]) // Per filtri sessioni attive
  @@index([expiresAt]) // Per cleanup automatico
  @@index([lastActivityAt]) // Per monitoring attività
  @@index([personId, isActive]) // Composite per active sessions
}
```

#### 3.2.2 Indici Documenti e Attestati
```prisma
model Attestato {
  // NUOVI indici necessari:
  @@index([personId]) // FK index
  @@index([scheduledCourseId]) // FK index
  @@index([generatedAt]) // Per ordinamento cronologico
  @@index([annoProgressivo]) // Per filtri anno
  @@index([personId, annoProgressivo]) // Composite per person certificates
}

model LetteraIncarico {
  // NUOVI indici necessari:
  @@index([trainerId]) // FK index
  @@index([scheduledCourseId]) // FK index
  @@index([dataGenerazione]) // Per ordinamento cronologico
  @@index([annoProgressivo]) // Per filtri anno
}

model RegistroPresenze {
  // NUOVI indici necessari:
  @@index([formatoreId]) // FK index
  @@index([scheduledCourseId]) // FK index
  @@index([sessionId]) // FK index
  @@index([dataGenerazione]) // Per ordinamento cronologico
  @@index([annoProgressivo]) // Per filtri anno
}

model TestDocument {
  // NUOVI indici necessari:
  @@index([trainerId]) // FK index
  @@index([scheduledCourseId]) // FK index
  @@index([stato]) // Per filtri status
  @@index([tipologia]) // Per filtri tipo test
  @@index([dataGenerazione]) // Per ordinamento cronologico
  @@index([dataTest]) // Per filtri data test
}
```

### 3.3 Gestione Campi @unique con NULL

#### 3.3.1 Problema Identificato
```prisma
// PROBLEMA: Questi campi permettono NULL multipli
Person.taxCode String? @unique // ❌ Più record con NULL
Person.username String? @unique // ❌ Più record con NULL
Company.slug String? @unique // ❌ Più record con NULL
Company.domain String? @unique // ❌ Più record con NULL
```

#### 3.3.2 Soluzioni Implementate

**Opzione A: Unique Partial Index (PostgreSQL)**
```prisma
model Person {
  taxCode String? @db.VarChar(16)
  username String? @db.VarChar(50)
  
  // Unique solo per valori non-NULL
  @@unique([taxCode], name: "unique_tax_code_not_null")
  @@unique([username], name: "unique_username_not_null")
}
```

**Opzione B: Database-Level Partial Index**
```sql
-- Creare indici parziali a livello database
CREATE UNIQUE INDEX unique_persons_tax_code 
ON persons (tax_code) 
WHERE tax_code IS NOT NULL;

CREATE UNIQUE INDEX unique_persons_username 
ON persons (username) 
WHERE username IS NOT NULL;

CREATE UNIQUE INDEX unique_companies_slug 
ON companies (slug) 
WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX unique_companies_domain 
ON companies (domain) 
WHERE domain IS NOT NULL;
```

**Opzione C: Application-Level Validation**
```javascript
// Middleware Prisma per validazione unique
prisma.$use(async (params, next) => {
  if (params.model === 'Person' && params.action === 'create') {
    const { taxCode, username } = params.args.data;
    
    if (taxCode) {
      const existing = await prisma.person.findFirst({
        where: { taxCode, deletedAt: null }
      });
      if (existing) {
        throw new Error('Tax code already exists');
      }
    }
    
    if (username) {
      const existing = await prisma.person.findFirst({
        where: { username, deletedAt: null }
      });
      if (existing) {
        throw new Error('Username already exists');
      }
    }
  }
  
  return next(params);
});
```

### 3.4 Ottimizzazione Query Composite

#### 3.4.1 Indici Composite Strategici
```prisma
// Multi-tenant queries optimization
model Person {
  @@index([tenantId, status]) // Tenant + status filtering
  @@index([tenantId, companyId]) // Tenant + company filtering
  @@index([companyId, status]) // Company + status filtering
  @@index([deletedAt, tenantId]) // Soft delete + tenant
}

model PersonRole {
  @@index([tenantId, roleType]) // Tenant + role queries
  @@index([companyId, roleType]) // Company + role queries
  @@index([personId, isActive, roleType]) // Person active roles
}

model CourseSchedule {
  @@index([tenantId, status]) // Tenant + status
  @@index([companyId, startDate]) // Company schedules by date
  @@index([trainerId, startDate]) // Trainer schedules
  @@index([status, startDate]) // Active schedules
}
```

#### 3.4.2 Indici per Reporting
```prisma
// Indici per query di reporting comuni
model ActivityLog {
  @@index([personId, timestamp]) // User activity timeline
  @@index([action, timestamp]) // Action-based reports
  @@index([timestamp]) // Chronological reports
}

model GdprAuditLog {
  @@index([personId, createdAt]) // Person GDPR timeline
  @@index([action, createdAt]) // GDPR action reports
  @@index([resourceType, createdAt]) // Resource access reports
}

model Attestato {
  @@index([personId, generatedAt]) // Person certificates
  @@index([scheduledCourseId, generatedAt]) // Course certificates
  @@index([annoProgressivo, numeroProgressivo]) // Progressive numbering
}
```

### 3.5 Performance Testing

#### 3.5.1 Benchmark Queries
```javascript
// benchmark-queries.js
const { performance } = require('perf_hooks');

async function benchmarkQuery(queryFn, description) {
  const start = performance.now();
  const result = await queryFn();
  const end = performance.now();
  
  console.log(`${description}: ${(end - start).toFixed(2)}ms`);
  return { result, duration: end - start };
}

// Test queries critiche
const benchmarks = [
  {
    name: 'Person by company',
    query: () => prisma.person.findMany({
      where: { companyId: 'test-company-id', deletedAt: null }
    })
  },
  {
    name: 'Active PersonRoles',
    query: () => prisma.personRole.findMany({
      where: { isActive: true, tenantId: 'test-tenant-id' }
    })
  },
  {
    name: 'CourseSchedules by trainer',
    query: () => prisma.courseSchedule.findMany({
      where: { trainerId: 'test-trainer-id' },
      orderBy: { startDate: 'desc' }
    })
  }
];
```

#### 3.5.2 Performance Monitoring
```javascript
// performance-monitor.js
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 100) { // Log slow queries
    console.log('Slow Query:', {
      query: e.query,
      duration: e.duration,
      params: e.params
    });
  }
});
```

### 3.6 Migration Strategy

#### 3.6.1 Creazione Indici Graduale
```sql
-- Creare indici in modo non-blocking
CREATE INDEX CONCURRENTLY idx_persons_company_id ON persons(company_id);
CREATE INDEX CONCURRENTLY idx_persons_tenant_status ON persons(tenant_id, status);
CREATE INDEX CONCURRENTLY idx_person_roles_tenant_role ON person_roles(tenant_id, role_type);
CREATE INDEX CONCURRENTLY idx_course_schedules_trainer ON course_schedules(trainer_id);
CREATE INDEX CONCURRENTLY idx_course_schedules_company_date ON course_schedules(company_id, start_date);
```

#### 3.6.2 Verifica Utilizzo Indici
```sql
-- Monitorare utilizzo indici
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Identificare indici inutilizzati
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public';
```

## 🧪 Testing Strategy

### 3.7.1 Performance Tests
```javascript
// test-performance-improvements.test.js
describe('Performance Improvements', () => {
  test('Person queries by company should be fast', async () => {
    const start = performance.now();
    
    const persons = await prisma.person.findMany({
      where: { companyId: testCompanyId, deletedAt: null }
    });
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50); // < 50ms
  });
  
  test('PersonRole queries should use indices', async () => {
    const start = performance.now();
    
    const roles = await prisma.personRole.findMany({
      where: { 
        tenantId: testTenantId, 
        roleType: 'EMPLOYEE',
        isActive: true 
      }
    });
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(30); // < 30ms
  });
});
```

### 3.7.2 Unique Constraint Tests
```javascript
// test-unique-constraints.test.js
describe('Unique Constraints with NULL', () => {
  test('Multiple NULL tax codes should be allowed', async () => {
    const person1 = await prisma.person.create({
      data: { firstName: 'Test1', lastName: 'User1', email: 'test1@example.com' }
    });
    
    const person2 = await prisma.person.create({
      data: { firstName: 'Test2', lastName: 'User2', email: 'test2@example.com' }
    });
    
    expect(person1.taxCode).toBeNull();
    expect(person2.taxCode).toBeNull();
  });
  
  test('Duplicate non-NULL tax codes should be rejected', async () => {
    await prisma.person.create({
      data: { 
        firstName: 'Test1', 
        lastName: 'User1', 
        email: 'test1@example.com',
        taxCode: 'TESTCODE123'
      }
    });
    
    await expect(prisma.person.create({
      data: { 
        firstName: 'Test2', 
        lastName: 'User2', 
        email: 'test2@example.com',
        taxCode: 'TESTCODE123'
      }
    })).rejects.toThrow();
  });
});
```

## ✅ Criteri di Completamento

- [ ] Tutti gli indici FK aggiunti
- [ ] Indici composite implementati
- [ ] Gestione @unique con NULL risolta
- [ ] Performance baseline migliorata >30%
- [ ] Query lente (<100ms) eliminate
- [ ] Test performance passano
- [ ] Monitoring indici attivo
- [ ] Documentazione aggiornata

## 🚨 Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Degradazione performance | Bassa | Alto | Benchmark pre/post |
| Indici inutilizzati | Media | Basso | Monitoring utilizzo |
| Lock database durante creazione | Media | Medio | CONCURRENTLY option |
| Spazio disco insufficiente | Bassa | Alto | Monitoring spazio |

## 📊 Metriche di Successo

| Metrica | Target | Baseline | Post-Ottimizzazione |
|---------|--------|----------|--------------------|
| **Query Person by Company** | <50ms | 150ms | __ ms |
| **PersonRole Active Filter** | <30ms | 80ms | __ ms |
| **CourseSchedule by Trainer** | <40ms | 120ms | __ ms |
| **GDPR Audit Queries** | <60ms | 200ms | __ ms |
| **Spazio Indici** | <500MB | 200MB | __ MB |

## 📞 Prossimi Passi

Al completamento Fase 3:
1. **Verifica performance** miglioramenti
2. **Monitoring continuo** utilizzo indici
3. **Preparazione Fase 4** (Relazioni & onDelete)
4. **Report performance** dettagliato

---

**Nota**: Gli indici sono fondamentali per le performance. Monitorare attentamente l'utilizzo e rimuovere quelli inutilizzati.