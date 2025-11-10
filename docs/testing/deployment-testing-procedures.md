# Testing Procedures - Deployment Validation

**Data aggiornamento**: 10 novembre 2024  
**Riferimento**: Project 32 - Cleanup & Optimization

---

## 📋 Indice

1. [Pre-Deployment Testing](#pre-deployment-testing)
2. [Post-Deployment Monitoring](#post-deployment-monitoring)
3. [Rollback Testing](#rollback-testing)
4. [Phase-Specific Tests](#phase-specific-tests)
5. [Automated Test Suites](#automated-test-suites)

---

## Pre-Deployment Testing

### Code Quality Checks

**Run before every deployment**:

```bash
cd backend

# 1. Linting
npm run lint
# Expected: 0 errors (warnings acceptable)

# 2. Type checking (if TypeScript)
npx tsc --noEmit
# Expected: 0 errors

# 3. Unit tests
npm test
# Expected: All tests passing

# 4. Integration tests
npm run test:integration
# Expected: All tests passing
```

### Security Verification

```bash
# 1. Dependency vulnerabilities
npm audit --production
# Expected: 0 critical, 0 high vulnerabilities

# 2. Rate limiting configuration
grep -r "max:" backend/config/rate-limits.js
# Verify: authLimiter max: 5, general max: 100

# 3. Environment variables
node -e "console.log(process.env.NODE_ENV)"
# Expected: 'production' in production, 'staging' in staging
```

### Database Migration Testing

**Staging environment**:

```bash
# 1. Backup database
pg_dump $STAGING_DATABASE_URL > backup_pre_migration_$(date +%Y%m%d).sql

# 2. Run migration
psql $STAGING_DATABASE_URL < backend/prisma/migrations/manual_*.sql

# 3. Verify schema
npx prisma db pull --schema=./prisma/schema.prisma
git diff prisma/schema.prisma
# Expected: No unexpected changes

# 4. Test queries
psql $STAGING_DATABASE_URL
\d+ Company  -- Verify indexes exist
```

---

## Post-Deployment Monitoring

### First Hour (Critical Window)

**Every 10 minutes for 1 hour**:

1. **Error Rate**:
   ```bash
   # Check logs for errors
   pm2 logs --lines 100 | grep -i error
   
   # Expected: < 1% of requests
   ```

2. **Response Time**:
   ```bash
   # Check average response time (if monitoring available)
   curl https://api.domain.com/health
   
   # Expected: < 200ms
   ```

3. **Database Connections**:
   ```sql
   SELECT count(*) FROM pg_stat_activity 
   WHERE datname = 'your_database';
   
   -- Expected: < 80% of max_connections
   ```

4. **Memory & CPU**:
   ```bash
   pm2 monit
   
   # Expected: CPU < 70%, Memory < 80%
   ```

### First 24 Hours

**Every 4 hours**:

1. **Performance Trends**:
   - Dashboard load time < 2s
   - List views load time < 1s
   - Form submissions < 500ms

2. **User Reports**:
   - Monitor support tickets
   - Check user feedback channels
   - Expected: No increase in issues

3. **Database Performance**:
   ```sql
   -- Slow queries (> 1s)
   SELECT query, calls, mean_exec_time 
   FROM pg_stat_statements 
   WHERE mean_exec_time > 1000 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   
   -- Expected: 0 slow queries from optimized models
   ```

4. **Error Logs Analysis**:
   ```bash
   # Backend errors
   grep -i "error" logs/api-server/*.log | wc -l
   
   # Expected: < 10 errors/hour
   ```

### First 48 Hours

**Every 8 hours**:

1. **Stability Metrics**:
   - Uptime > 99.9%
   - Error rate < 0.5%
   - Response time trend stable or improving

2. **Resource Utilization**:
   - Database CPU trend
   - Memory consumption stable
   - Disk I/O within limits

3. **Business Metrics**:
   - User activity normal
   - Transaction completion rate unchanged
   - No feature degradation reports

---

## Rollback Testing

### Pre-Deployment Rollback Preparation

**Test rollback in staging BEFORE production deployment**:

```bash
# 1. Apply migration
psql $STAGING_DATABASE_URL < migration.sql

# 2. Test application (ensure working)
npm test

# 3. Execute rollback
psql $STAGING_DATABASE_URL < rollback.sql

# 4. Verify application still works
npm test

# 5. Re-apply migration for staging use
psql $STAGING_DATABASE_URL < migration.sql
```

### Rollback Triggers (When to Rollback)

**Immediate rollback** (< 1 hour):
- [ ] Application crashes after deployment
- [ ] SQL errors in logs (> 5 in 10 minutes)
- [ ] Critical feature broken (auth, payments, data loss)
- [ ] Error rate > 5%
- [ ] Database connection pool exhausted

**24h rollback** (monitoring period):
- [ ] Performance regression > 20%
- [ ] Database CPU > 90% sustained
- [ ] Memory leak detected
- [ ] User reports of major slowness (> 10 reports)

**48h rollback** (analysis):
- [ ] Subtle bugs affecting data integrity
- [ ] Unpredicted side effects
- [ ] Business metrics degradation

### Rollback Execution Procedure

**Phase 2.1 Example (Prisma Indexes)**:

```bash
# 1. Announce rollback
# Notify team, prepare users if needed

# 2. Execute rollback SQL
psql $PRODUCTION_DATABASE_URL << EOF
DROP INDEX CONCURRENTLY IF EXISTS "Company_tenantId_deletedAt_idx";
DROP INDEX CONCURRENTLY IF EXISTS "Course_tenantId_deletedAt_idx";
DROP INDEX CONCURRENTLY IF EXISTS "CourseSchedule_tenantId_deletedAt_idx";
DROP INDEX CONCURRENTLY IF EXISTS "attestati_tenantId_deletedAt_idx";
EOF

# 3. Verify rollback
psql $PRODUCTION_DATABASE_URL
\di *deletedAt*
# Expected: Only Person and TemplateLink indexes remain

# 4. Restart application (if needed)
pm2 restart all

# 5. Verify application health
curl https://api.domain.com/health
npm run test:smoke

# 6. Monitor for 1 hour
# Check error rate, response time, database load
```

---

## Phase-Specific Tests

### Phase 1: Security Hardening

**Test Suite**:

```bash
# 1. CSRF Protection
curl -X POST https://api.domain.com/api/forms/public/submit \
  -H "Content-Type: application/json" \
  -d '{"data":"test"}'
# Expected: 403 Forbidden (missing CSRF token)

# 2. Test Routes Disabled in Production
curl https://api.domain.com/api/test/endpoint
# Expected: 404 Not Found (if NODE_ENV=production)

# 3. Rate Limiting
for i in {1..10}; do
  curl -X POST https://api.domain.com/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Expected: 429 Too Many Requests after 5 attempts

# 4. Permission Check
# Manual test: Try accessing admin route with non-admin user
# Expected: 403 Forbidden
```

### Phase 2.1: Prisma Indexes

**Performance Benchmark**:

```sql
-- Run BEFORE and AFTER migration

-- 1. Company query
EXPLAIN ANALYZE 
SELECT * FROM "Company" 
WHERE "tenantId" = 'your-tenant-id' AND "deletedAt" IS NULL;

-- BEFORE: Seq Scan, ~150ms
-- AFTER: Index Scan using Company_tenantId_deletedAt_idx, ~25ms

-- 2. Course query
EXPLAIN ANALYZE 
SELECT * FROM "Course" 
WHERE "tenantId" = 'your-tenant-id' AND "deletedAt" IS NULL;

-- BEFORE: Seq Scan, ~120ms
-- AFTER: Index Scan, ~22ms

-- 3. CourseSchedule query (largest table)
EXPLAIN ANALYZE 
SELECT * FROM "CourseSchedule" 
WHERE "tenantId" = 'your-tenant-id' AND "deletedAt" IS NULL;

-- BEFORE: Seq Scan, ~180ms
-- AFTER: Index Scan, ~28ms

-- 4. Attestato query
EXPLAIN ANALYZE 
SELECT * FROM "attestati" 
WHERE "tenantId" = 'your-tenant-id' AND "deletedAt" IS NULL;

-- BEFORE: Seq Scan, ~140ms
-- AFTER: Index Scan, ~24ms
```

**Load Test** (10 concurrent users):

```bash
# Install Apache Bench if not present
# brew install httpd (macOS)

# Test Company list endpoint
ab -n 100 -c 10 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.domain.com/api/companies

# Compare results BEFORE and AFTER:
# - Requests per second (should increase 3-5x)
# - Time per request (should decrease to ~25ms avg)
# - Failed requests (should be 0)
```

---

## Automated Test Suites

### Unit Tests

**Location**: `backend/tests/unit/`

```bash
# Run all unit tests
npm test

# Run specific test suite
npm test -- services/PersonService.test.js

# Coverage report
npm run test:coverage
# Target: > 80% coverage
```

### Integration Tests

**Location**: `backend/tests/integration/`

```bash
# Run integration tests (requires test database)
npm run test:integration

# Test API endpoints
npm run test:api

# Test database operations
npm run test:db
```

### E2E Tests (Playwright)

**Location**: `tests/`

```bash
# Run E2E tests
npm run test:e2e

# Run specific test
npx playwright test tests/auth.spec.ts

# Run with UI
npx playwright test --ui
```

### Smoke Tests (Production)

**Quick health checks** after deployment:

```bash
# 1. API Health
curl https://api.domain.com/health
# Expected: {"status":"ok"}

# 2. Authentication
curl -X POST https://api.domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'
# Expected: 200 OK with token

# 3. Database Connection
curl https://api.domain.com/api/companies \
  -H "Authorization: Bearer TOKEN"
# Expected: 200 OK with companies list

# 4. Frontend Assets
curl -I https://domain.com
# Expected: 200 OK, Content-Type: text/html
```

---

## Best Practices

### Before Every Deployment

- [ ] Code review completed (2+ reviewers)
- [ ] All tests passing (unit, integration, E2E)
- [ ] Staging deployment successful
- [ ] 48h monitoring period in staging complete
- [ ] Rollback plan documented and tested
- [ ] Team notified of deployment window
- [ ] Database backup created

### During Deployment

- [ ] Use deployment checklist (`.trae/TRAE_SYSTEM_GUIDE.md`)
- [ ] Monitor logs in real-time (`pm2 logs`)
- [ ] Keep rollback SQL ready
- [ ] Have team member on standby

### After Deployment

- [ ] Run smoke tests immediately
- [ ] Monitor for 1 hour intensively
- [ ] Check error logs every 4 hours (24h)
- [ ] Review metrics daily (48h)
- [ ] Document any issues encountered
- [ ] Update TRAE guides if lessons learned

---

## Riferimenti

- **Deployment Guide**: `docs/deployment/prisma-migrations.md`
- **TRAE System Guide**: `.trae/TRAE_SYSTEM_GUIDE.md` (Deployment Safety Checklist)
- **Backend Quality**: `docs/technical/architecture/backend-quality-report.md`
- **Phase Reports**: `docs/10_project_managemnt/32_pulizia-e-allineamento/`
