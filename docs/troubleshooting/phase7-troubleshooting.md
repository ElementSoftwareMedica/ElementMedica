# 🔧 Phase 7 Troubleshooting Guide

**Date**: November 11, 2025  
**Version**: 1.0  
**Scope**: Phase 7.2 (Schema Cleanup) & Phase 7.3 (Testing)

---

## 📋 OVERVIEW

This guide covers common issues and solutions related to Phase 7 changes:
- Preventivo standardization (M2M removal)
- Direct relation pattern
- Test suite execution
- Schema validation

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: "Model PreventivoAzienda not found"

**Symptoms**:
```
Error: Unknown arg `aziende` in include.aziende for type Preventivo
Error: Model 'PreventivoAzienda' does not exist
```

**Cause**: Code references removed M2M models

**Solution**:
```javascript
// ❌ WRONG - M2M models were removed
const preventivo = await prisma.preventivo.findUnique({
  where: { id },
  include: {
    aziende: {  // This M2M relation no longer exists
      include: { company: true }
    }
  }
});

// ✅ CORRECT - Use direct relation
const preventivo = await prisma.preventivo.findUnique({
  where: { id },
  include: {
    azienda: true  // Direct relation
  }
});
```

**Verification**:
```bash
# Check for remaining references
grep -r "aziende.*include" backend/
grep -r "PreventivoAzienda" backend/

# Should return 0 results in production code
```

---

### Issue 2: Validation Schema Not Found

**Symptoms**:
```
Error: preventivoAziendaSchema is not defined
TypeError: Cannot read property 'validate' of undefined
```

**Cause**: Validation schemas were removed

**Solution**:
```javascript
// ❌ WRONG - These schemas no longer exist
const { 
  preventivoAziendaSchema,      // REMOVED
  preventivoPartecipanteSchema  // REMOVED
} = require('./validations');

// ✅ CORRECT - Use existing schemas
const { 
  preventivoSchema  // Still exists
} = require('./validations');

// Or create inline validation
const Joi = require('joi');
const schema = Joi.object({
  aziendaId: Joi.string().uuid().required(),
  // ... other fields
});
```

**Verification**:
```bash
# Check for remaining imports
grep -r "preventivoAziendaSchema\|preventivoPartecipanteSchema" backend/

# Should return 0 results in production code
```

---

### Issue 3: Prisma Client Out of Sync

**Symptoms**:
```
Error: Unknown field `aziende` for model Preventivo
Error: Prisma Client is out of sync with the schema
```

**Cause**: Prisma client needs regeneration after schema changes

**Solution**:
```bash
# 1. Validate schema
cd backend
npx prisma validate

# 2. Regenerate Prisma client
npx prisma generate

# 3. Restart application
pm2 restart all
# or
npm run dev
```

**Verification**:
```bash
# Check Prisma client version
npx prisma version

# Should show current schema hash matching prisma/schema.prisma
```

---

### Issue 4: Test Failures After Schema Changes

**Symptoms**:
```
Test failed: Expected model PreventivoAzienda to exist
Error: Cannot create PreventivoPartecipante (model not found)
```

**Cause**: Tests expect removed models

**Solution**:

**If test is verifying removal (intentional)**:
```javascript
// ✅ CORRECT - Test verifying models don't exist
it('should not have M2M models', () => {
  expect(prisma.preventivoAzienda).toBeUndefined();
  expect(prisma.preventivoPartecipante).toBeUndefined();
});
```

**If test needs updating**:
```javascript
// ❌ WRONG - Testing removed M2M model
it('should create preventivo with M2M azienda', async () => {
  const result = await prisma.preventivoAzienda.create({...});
});

// ✅ CORRECT - Test direct relation
it('should create preventivo with direct azienda', async () => {
  const result = await prisma.preventivo.create({
    data: {
      aziendaId: company.id,  // Direct FK
      // ... other fields
    }
  });
  expect(result.aziendaId).toBe(company.id);
});
```

**Verification**:
```bash
# Run Phase 7 tests
npm test -- preventivi-service.test.js preventivi-direct-relations.test.js

# Expected: 44/44 tests passing
```

---

### Issue 5: Performance Degradation

**Symptoms**:
- Queries slower after schema changes
- More database load than expected

**Unlikely Cause**: Phase 7.2 improved performance (+50%)

**Probable Causes**:
1. Not using direct relations correctly
2. Missing indexes
3. N+1 query problem

**Solution**:

**1. Verify Direct Relations**:
```javascript
// ✅ GOOD - Single query with direct relation
const preventivi = await prisma.preventivo.findMany({
  where: { tenantId },
  include: {
    azienda: true  // Direct join
  }
});

// ❌ BAD - Separate queries (N+1 problem)
const preventivi = await prisma.preventivo.findMany({
  where: { tenantId }
});
for (const prev of preventivi) {
  prev.azienda = await prisma.company.findUnique({
    where: { id: prev.aziendaId }
  });
}
```

**2. Check Query Logs**:
```bash
# Enable Prisma query logging
# In backend/prisma/schema.prisma:
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["tracing"]
}

# Set log level in code
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

# Check logs
tail -f backend/logs/*.log | grep "prisma:query"
```

**3. Add Missing Indexes** (if needed):
```prisma
model Preventivo {
  aziendaId String? @db.Uuid
  azienda   Company? @relation(...)
  
  @@index([aziendaId])  // Add index if queries are slow
}
```

---

### Issue 6: Multi-Tenancy Not Working

**Symptoms**:
- Users seeing data from other tenants
- Cross-tenant access occurring

**Cause**: Missing tenantId filter in queries

**Solution**:
```javascript
// ❌ WRONG - Missing tenantId (security risk!)
const preventivo = await prisma.preventivo.findUnique({
  where: { id }  // Missing tenantId!
});

// ✅ CORRECT - Always include tenantId
const preventivo = await prisma.preventivo.findUnique({
  where: { 
    id,
    tenantId: req.tenantId  // REQUIRED
  }
});
```

**Verification**:
```bash
# Run security tests
npm test -- middleware-security.test.js

# Expected: 7/7 tests passing
```

**Additional Check**:
```javascript
// Test cross-tenant access prevention
describe('Tenant Isolation', () => {
  it('should prevent access to other tenant data', async () => {
    const tenant1Data = await service.create(tenant1Id, data);
    const result = await service.get(tenant2Id, tenant1Data.id);
    expect(result).toBeNull();  // Should be blocked
  });
});
```

---

### Issue 7: Schema Validation Fails

**Symptoms**:
```
Error: Schema validation failed
Error: Unknown relation field `aziende`
```

**Cause**: Schema references removed models

**Solution**:
```bash
# 1. Check schema syntax
cd backend
npx prisma validate

# 2. Fix errors (should point to line numbers)
# Open prisma/schema.prisma and remove references to:
# - PreventivoAzienda
# - PreventivoPartecipante
# - Any M2M relations to these models

# 3. Validate again
npx prisma validate

# Expected: "The schema at prisma/schema.prisma is valid 🚀"
```

**Common Schema Errors**:
```prisma
// ❌ WRONG - References removed model
model Company {
  preventivi PreventivoAzienda[]  // This model doesn't exist
}

// ✅ CORRECT - Direct relation
model Company {
  preventivi Preventivo[] @relation("PreventivoToCompany")
}
```

---

## 🧪 DEBUGGING STEPS

### Step 1: Verify Schema
```bash
cd backend
npx prisma validate

# Expected output:
# ✅ "The schema at prisma/schema.prisma is valid 🚀"
# ❌ Error messages with line numbers
```

### Step 2: Check for Orphaned References
```bash
# Search for removed model references
grep -r "PreventivoAzienda\|PreventivoPartecipante" backend/**/*.{js,ts}

# Expected: 
# - 0 references in production code
# - Only test files (if verifying removal)
```

### Step 3: Regenerate Prisma Client
```bash
# Force regenerate
npx prisma generate --force

# Verify
npx prisma version

# Check that schema hash matches
```

### Step 4: Run Tests
```bash
# Run Phase 7 specific tests
npm test -- preventivi-service.test.js preventivi-direct-relations.test.js validation-layer.test.js middleware-security.test.js

# Expected: Test Suites: 4 passed, 4 total
#          Tests:       62 passed, 62 total
```

### Step 5: Check Application Logs
```bash
# Check for errors
tail -f backend/logs/api-server/*.log

# Look for:
# - Prisma errors
# - Unknown model errors
# - Validation errors
```

---

## 📊 PERFORMANCE TROUBLESHOOTING

### Check Query Performance

```javascript
// Add timing to queries
const start = Date.now();
const result = await prisma.preventivo.findMany({
  where: { tenantId },
  include: { azienda: true }
});
const duration = Date.now() - start;
console.log(`Query took ${duration}ms`);

// Expected: <100ms for typical queries
// Before Phase 7.2: ~150ms (2 joins)
// After Phase 7.2: ~75ms (1 join) - 50% faster
```

### Analyze Query Plans

```sql
-- In PostgreSQL, analyze query plan
EXPLAIN ANALYZE
SELECT * FROM "Preventivo" p
LEFT JOIN "Company" c ON p."aziendaId" = c.id
WHERE p."tenantId" = 'xxx';

-- Look for:
-- ✅ Using indexes (Index Scan)
-- ✅ Low cost estimates
-- ❌ Sequential scans (Seq Scan) on large tables
-- ❌ High cost estimates
```

---

## 🔐 SECURITY TROUBLESHOOTING

### Verify Tenant Isolation

```javascript
// Test script to verify tenant isolation
const testTenantIsolation = async () => {
  const tenant1 = 'tenant-1-uuid';
  const tenant2 = 'tenant-2-uuid';
  
  // Create data for tenant 1
  const data1 = await prisma.preventivo.create({
    data: {
      tenantId: tenant1,
      // ... other fields
    }
  });
  
  // Try to access from tenant 2 (should fail)
  const attempt = await prisma.preventivo.findUnique({
    where: {
      id: data1.id,
      tenantId: tenant2  // Different tenant
    }
  });
  
  console.assert(attempt === null, 'Tenant isolation failed!');
  console.log('✅ Tenant isolation working');
};
```

### Check Middleware

```javascript
// Verify tenant middleware is active
// In backend/middleware/tenant-security.js

// Should have:
const TENANT_SCOPED_MODELS = [
  'preventivo',
  'company',
  'person',
  // ... other models
  // NOT 'preventivoAzienda' (removed)
  // NOT 'preventivoPartecipante' (removed - M2M version)
];

// Middleware should inject tenantId
prisma.$use(async (params, next) => {
  if (TENANT_SCOPED_MODELS.includes(params.model)) {
    params.args.where = {
      ...params.args.where,
      tenantId: getCurrentTenantId()
    };
  }
  return next(params);
});
```

---

## 📞 GETTING HELP

### Documentation References

1. **Migration Guide**: `docs/10_project_managemnt/32_pulizia-e-allineamento/46_migration_guide.md`
2. **Verification Report**: `docs/10_project_managemnt/32_pulizia-e-allineamento/42_pre_phase7.1_verification.md`
3. **Architecture Updates**: `docs/technical/phase7-architecture-updates.md`
4. **Deployment Notes**: `docs/deployment/phase7-deployment-notes.md`

### Test Files (Examples)

1. **Service Tests**: `backend/tests/preventivi-service.test.js`
2. **E2E Tests**: `backend/tests/preventivi-direct-relations.test.js`
3. **Security Tests**: `backend/tests/middleware-security.test.js`

### Support Channels

- Review test output for specific errors
- Check logs in `backend/logs/`
- Consult documentation in `docs/10_project_managemnt/32_pulizia-e-allineamento/`

---

## ✅ VERIFICATION CHECKLIST

Before reporting an issue, verify:

- [ ] Prisma schema is valid (`npx prisma validate`)
- [ ] Prisma client is regenerated (`npx prisma generate`)
- [ ] No references to removed models in production code
- [ ] All Phase 7 tests passing (62/62)
- [ ] Application restarted after changes
- [ ] Logs checked for specific errors
- [ ] TenantId included in all queries
- [ ] Using direct relations (not M2M)

---

**Document**: `docs/troubleshooting/phase7-troubleshooting.md`  
**Created**: November 11, 2025  
**Version**: 1.0  
**Status**: ✅ Complete
