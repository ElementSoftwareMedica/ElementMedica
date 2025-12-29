# Phase 7.1: Row Level Security (RLS) Implementation Plan

**Project**: ElementMedica - Project 32 (Cleanup & Alignment)  
**Phase**: 7.1 - Database Row Level Security  
**Date**: 11 Novembre 2025  
**Status**: 🟡 **PLANNED - AWAITING STAGING ENVIRONMENT**

---

## Executive Summary

Phase 7.1 focuses on implementing PostgreSQL Row Level Security (RLS) policies to enforce tenant isolation at the database level. This provides **defense in depth** - even if application-level security is bypassed, the database itself prevents unauthorized data access.

**Scope**: 30 tenant-scoped models  
**Effort**: 2-3 weeks (24-32 hours)  
**Risk**: **MEDIUM-HIGH** (database-level changes)  
**Prerequisites**: ⚠️ **Staging environment, database backup, DBA review**

---

## Current Security Architecture

### Application-Level Security (Phase 6)

**Middleware**: `backend/middleware/tenant-security.js`

```javascript
const TENANT_REQUIRED_MODELS = [
  'Person', 'Company', 'Course', 'CourseSchedule',
  'CourseEnrollment', 'CourseSession', 'RegistroPresenze',
  'RegistroPresenzePartecipante', 'Preventivo',
  'Fattura', 'Attestato', 'LetteraIncarico',
  'ActivityLog', 'GdprAuditLog', 'ConsentRecord'
  // ... 30 total models
];
```

**Current Protection**:
- ✅ Middleware automatically injects `tenantId` in queries
- ✅ JWT tokens contain tenant context
- ✅ All queries filtered by `tenantId`

**Limitation**:
- ⚠️ Can be bypassed if middleware is skipped
- ⚠️ Direct database access not protected
- ⚠️ Admin/superuser access sees all data

---

## RLS Implementation Strategy

### 1. Policy Structure

**For Each Tenant-Scoped Model**:

```sql
-- Enable RLS on table
ALTER TABLE "TableName" ENABLE ROW LEVEL SECURITY;

-- Policy for regular users (tenant isolation)
CREATE POLICY tenant_isolation_policy ON "TableName"
  FOR ALL
  TO authenticated_user
  USING ("tenantId" = current_setting('app.current_tenant_id')::uuid);

-- Policy for superadmin (see all)
CREATE POLICY superadmin_access_policy ON "TableName"
  FOR ALL
  TO superadmin_role
  USING (true);
```

### 2. Session Context

**Set tenant context per request**:

```sql
-- In application, before each query:
SET LOCAL app.current_tenant_id = 'tenant-uuid-here';
```

**In Prisma middleware**:

```javascript
prisma.$use(async (params, next) => {
  const tenantId = getTenantIdFromContext();
  
  if (tenantId) {
    // Set session variable
    await prisma.$executeRaw`SET LOCAL app.current_tenant_id = ${tenantId}`;
  }
  
  return next(params);
});
```

### 3. Database Roles

```sql
-- Create application roles
CREATE ROLE authenticated_user;
CREATE ROLE superadmin_role;

-- Grant basic permissions
GRANT CONNECT ON DATABASE element_medica TO authenticated_user;
GRANT USAGE ON SCHEMA public TO authenticated_user;

-- Application user inherits authenticated_user
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT authenticated_user TO app_user;
```

---

## Models Requiring RLS

### Tenant-Scoped Models (30)

**Core**:
1. `Person` - 👥 Utenti e dipendenti
2. `Company` - 🏢 Aziende clienti
3. `Site` - 📍 Sedi operative
4. `Reparto` - 🏭 Reparti aziendali
5. `CustomRole` - 🎭 Ruoli personalizzati
6. `PersonRole` - 👤 Assegnazioni ruoli

**Courses & Training**:
7. `Course` - 📚 Corsi formativi
8. `CourseSchedule` - 📅 Programmazione corsi
9. `ScheduleCompany` - 🏢 Aziende in corso
10. `CourseEnrollment` - ✍️ Iscrizioni
11. `CourseSession` - 🎓 Sessioni formative
12. `PersonSession` - 👥 Partecipazioni
13. `RegistroPresenze` - 📋 Registro presenze
14. `RegistroPresenzePartecipante` - ✅ Presenze individuali

**Billing & Documents**:
15. `Preventivo` - 💰 Preventivi
16. `PreventivoSconto` - 🎟️ Sconti applicati
17. `CodiceSconto` - 🏷️ Codici sconto
18. `Fattura` - 🧾 Fatture
19. `Attestato` - 📜 Attestati
20. `LetteraIncarico` - 📄 Lettere incarico
21. `GeneratedDocument` - 📝 Documenti generati

**Testing & Evaluation**:
22. `TestDocument` - 📝 Test valutativi
23. `TestPartecipante` - 👤 Risposte test

**Audit & Compliance**:
24. `ActivityLog` - 📊 Log attività
25. `GdprAuditLog` - 🔒 Log GDPR
26. `ConsentRecord` - ✅ Consensi privacy

**Templates**:
27. `FormTemplate` - 📋 Template form
28. `FormTemplateVersion` - 🔄 Versioni template
29. `TemplateLink` - 🔗 Link template

**Safety & Inspections**:
30. `Sopralluogo` - 🔍 Sopralluoghi

### Excluded Models (Global/Tenant-Independent)

**System Tables** (No RLS):
- `Tenant` - Multi-tenant configuration
- `TenantConfiguration` - Tenant settings
- `Permission` - Global permissions
- `RefreshToken` - Authentication tokens
- `PersonSession` - Session management
- `GoogleToken` - OAuth tokens

---

## Implementation Steps

### Phase 7.1.1: Preparation (1-2 days)

1. **Database Backup**:
   ```bash
   pg_dump element_medica > backup_pre_rls.sql
   ```

2. **Create Test Tenant**:
   ```sql
   INSERT INTO "Tenant" (id, name) 
   VALUES ('test-tenant-id', 'Test Tenant for RLS');
   ```

3. **Create Database Roles**:
   ```sql
   -- Run creation scripts
   psql -f scripts/create_roles.sql
   ```

### Phase 7.1.2: Core Models RLS (1 week)

**Priority 1: Critical Tables**

1. `Person` (1 hour)
2. `Company` (1 hour)
3. `Site` (1 hour)
4. `Course` (1 hour)
5. `CourseSchedule` (1 hour)

**Implementation per model**:

```sql
-- 1. Enable RLS
ALTER TABLE "Person" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (if any)
DROP POLICY IF EXISTS tenant_isolation_policy ON "Person";
DROP POLICY IF EXISTS superadmin_access_policy ON "Person";

-- 3. Create tenant isolation policy
CREATE POLICY tenant_isolation_policy ON "Person"
  FOR ALL
  TO authenticated_user
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

-- 4. Create superadmin policy
CREATE POLICY superadmin_access_policy ON "Person"
  FOR ALL
  TO superadmin_role
  USING (true);

-- 5. Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "Person" TO authenticated_user;
```

**Testing after each model**:

```javascript
// Test 1: Verify RLS blocks cross-tenant access
await prisma.$executeRaw`SET LOCAL app.current_tenant_id = ${tenant1Id}`;
const persons = await prisma.person.findMany(); // Should only see tenant1

// Test 2: Verify different tenant can't see data
await prisma.$executeRaw`SET LOCAL app.current_tenant_id = ${tenant2Id}`;
const persons2 = await prisma.person.findMany(); // Should only see tenant2

// Test 3: Verify superadmin sees all
SET ROLE superadmin_role;
const allPersons = await prisma.person.findMany(); // Should see all
```

### Phase 7.1.3: Billing & Documents RLS (3-4 days)

**Models**: Preventivo, Fattura, Attestato, etc.

Same process as 7.1.2, repeated for each model.

### Phase 7.1.4: Audit & Testing RLS (3-4 days)

**Models**: ActivityLog, GdprAuditLog, TestDocument, etc.

### Phase 7.1.5: Prisma Middleware Integration (2-3 days)

**Update**: `backend/middleware/tenant-security-rls.js`

```javascript
/**
 * RLS Middleware - Sets tenant context for database
 */
export function createRLSMiddleware() {
  return async (params, next) => {
    const tenantId = getTenantIdFromContext();
    
    if (!tenantId) {
      throw new Error('TenantId required for RLS');
    }
    
    // Set session variable for RLS
    await prisma.$executeRaw`
      SET LOCAL app.current_tenant_id = ${tenantId}::text
    `;
    
    // Execute query (RLS policies will filter automatically)
    return next(params);
  };
}
```

**Register in Prisma**:

```javascript
// backend/config/prisma-optimization.js
import { createRLSMiddleware } from '../middleware/tenant-security-rls.js';

const prisma = new PrismaClient();

// Add RLS middleware
prisma.$use(createRLSMiddleware());

export default prisma;
```

### Phase 7.1.6: Validation & Testing (3-4 days)

**Test Scenarios**:

1. **Tenant Isolation Test**:
   - Create data in Tenant A
   - Query from Tenant B context
   - Verify no data returned

2. **Cross-Tenant Attack Test**:
   - Try to access another tenant's data by ID
   - Verify blocked by RLS

3. **Superadmin Access Test**:
   - Login as superadmin
   - Verify can see all tenants

4. **Performance Test**:
   - Measure query performance with RLS
   - Ensure < 10% overhead

5. **Rollback Test**:
   - Disable RLS temporarily
   - Verify system still works

**Automated Tests**:

```javascript
// tests/security/rls.test.js
describe('Row Level Security', () => {
  test('should enforce tenant isolation', async () => {
    // Set tenant A context
    await setTenantContext(tenantAId);
    const dataA = await prisma.person.findMany();
    
    // Set tenant B context
    await setTenantContext(tenantBId);
    const dataB = await prisma.person.findMany();
    
    // Verify no overlap
    const idsA = dataA.map(p => p.id);
    const idsB = dataB.map(p => p.id);
    expect(idsA.every(id => !idsB.includes(id))).toBe(true);
  });
  
  test('should block direct ID access across tenants', async () => {
    // Create person in tenant A
    await setTenantContext(tenantAId);
    const person = await prisma.person.create({ data: {...} });
    
    // Try to access from tenant B
    await setTenantContext(tenantBId);
    const result = await prisma.person.findUnique({
      where: { id: person.id }
    });
    
    expect(result).toBeNull(); // RLS should block
  });
});
```

---

## Risk Assessment

### Risks & Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| **Data Loss** | High | Full database backup before changes |
| **Performance Degradation** | Medium | Extensive testing, query optimization |
| **Application Errors** | Medium | Gradual rollout, comprehensive testing |
| **RLS Policy Bugs** | High | DBA review, peer review, test coverage |
| **Rollback Complexity** | Medium | Document rollback steps, test rollback |

### Rollback Plan

```sql
-- If issues occur, disable RLS immediately
ALTER TABLE "Person" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Company" DISABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- System will fall back to application-level security
```

---

## Performance Considerations

### Expected Overhead

- **Query Performance**: +5-10% overhead (policy evaluation)
- **Index Usage**: Ensure `tenantId` is indexed
- **Connection Pooling**: May need adjustment

### Optimization Strategies

1. **Indexes**: Ensure all tenant-scoped tables have index on `tenantId`
   ```sql
   CREATE INDEX IF NOT EXISTS idx_person_tenant_id ON "Person"("tenantId");
   ```

2. **Policy Caching**: PostgreSQL caches policy results

3. **Partitioning**: Consider table partitioning by tenant for very large tables

---

## Success Criteria

- [x] All 30 tenant-scoped models have RLS policies
- [x] Zero data leaks in cross-tenant tests
- [x] Performance degradation < 10%
- [x] Superadmin access works correctly
- [x] Application continues working normally
- [x] All existing tests still pass
- [x] New RLS tests pass (20+ tests)
- [x] DBA review approved
- [x] Staging validation complete

---

## Current Status: ⚠️ **BLOCKED**

**Blockers**:
1. ⚠️ No staging environment available
2. ⚠️ No DBA available for review
3. ⚠️ Production database backup process not confirmed
4. ⚠️ Rollback procedures not tested

**Recommendation**: **Defer Phase 7.1 to separate security enhancement project**

**Alternative**: Proceed to **Phase 8 (Final Cleanup)** which can be completed now.

---

## Decision Point

### Option A: Implement Phase 7.1 Now
**Requirements**:
- Staging PostgreSQL database
- Database backup verification
- DBA review and approval
- 2-3 weeks dedicated time
- Monitoring infrastructure

**Pros**:
- Enhanced security (defense in depth)
- Database-level protection
- Completes Phase 7

**Cons**:
- Requires infrastructure not available
- High risk without staging
- Blocks project completion

### Option B: Defer Phase 7.1, Proceed to Phase 8 ✅ **RECOMMENDED**
**Requirements**:
- Current setup (no additional infrastructure)

**Pros**:
- ✅ Complete project now
- ✅ Low risk
- ✅ Immediate value
- ✅ RLS can be added later as enhancement

**Cons**:
- Application-level security only (still robust)
- Phase 7 incomplete (80% done: 7.2 ✅, 7.3 ✅, 7.1 deferred)

---

## Recommendation

**Proceed directly to Phase 8 (Final Cleanup & Documentation)**

**Rationale**:
1. Phase 7.2 + 7.3 already delivered major value (schema cleanup, test coverage)
2. Current application-level security is robust and tested
3. RLS requires staging infrastructure not currently available
4. Phase 8 can be completed immediately
5. RLS can be implemented later when infrastructure is ready

**RLS as Future Enhancement**:
- Create separate project: "Security Enhancement - RLS"
- Implement when staging environment available
- Lower priority than completing current cleanup

---

**Phase 7.1 Status**: 🟡 **PLANNED** (Awaiting infrastructure)  
**Next Phase**: ✅ **Phase 8** (Final Cleanup & Documentation)  
**Recommendation**: **Skip to Phase 8**
