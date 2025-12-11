# Prisma Migrations - Procedure di Deployment

**Data aggiornamento**: 10 novembre 2024  
**Riferimento**: Project 32 - Phase 2.1 Prisma Schema Optimization

---

## 📋 Indice

1. [Introduzione](#introduzione)
2. [Workflow Standard](#workflow-standard)
3. [Phase 2.1: Compound Indexes Migration](#phase-21-compound-indexes-migration)
4. [Procedure di Verifica](#procedure-di-verifica)
5. [Rollback Procedures](#rollback-procedures)
6. [Best Practices](#best-practices)

---

## Introduzione

Questo documento definisce le procedure standard per gestire le migrazioni Prisma in produzione, con particolare focus sulla **sicurezza, verificabilità e rollback**.

### Principi Chiave

- ✅ **Sempre testare in staging** prima di produzione
- ✅ **Manual migrations** per cambiamenti critici (review SQL prima del deploy)
- ✅ **Additive changes** quando possibile (no distruttive)
- ✅ **Monitoraggio post-deployment** (48h minimum)
- ✅ **Rollback plan** preparato PRIMA del deployment

---

## Workflow Standard

### 1. Development Environment

```bash
cd backend

# Modifica schema.prisma secondo necessità
# Example: Aggiunta index, nuovo campo, nuova relazione

# Genera migration
npx prisma migrate dev --name descriptive_name

# Verifica generazione client
npx prisma generate

# Test locali
npm test
```

### 2. Staging Deployment

```bash
# Push migration a staging database
npx prisma migrate deploy

# Verifica applicazione corretta
npx prisma migrate status

# Monitoring performance
# Controlla query lente, errori, utilizzo risorse
```

### 3. Production Deployment

**Pre-deployment Checklist**:
- [ ] Migration testata in staging per 48h minimum
- [ ] Performance metrics verificate (no regressioni)
- [ ] Rollback plan documentato e testato
- [ ] Backup database recente disponibile
- [ ] Finestra di manutenzione comunicata (se necessaria)
- [ ] Team on-call disponibile

```bash
# Production deployment
npx prisma migrate deploy

# Immediate verification (vedi sezione "Procedure di Verifica")
```

---

## Phase 2.1: Compound Indexes Migration

**Riferimento completo**: `docs/10_project_managemnt/32_pulizia-e-allineamento/16_prisma_deletedAt_indexes.md`

### Contesto

- **Problema**: 46 modelli con `deletedAt`, solo 2 con indexes
- **Soluzione**: Compound indexes `[tenantId, deletedAt]` per query multi-tenant soft delete
- **Impatto atteso**: 3-5x faster queries (100ms → 20-30ms)

### Schema Changes

**Modelli ottimizzati** (Phase 2.1):
1. `Company`: `@@index([tenantId, deletedAt])`
2. `Course`: `@@index([tenantId, deletedAt])`
3. `CourseSchedule`: `@@index([tenantId, deletedAt])`
4. `Attestato`: `@@index([tenantId, deletedAt])`

**Modelli già ottimizzati**:
- `Person`: `@@index([deletedAt, status])` (pre-esistente)
- `TemplateLink`: `@@index([deletedAt])` (pre-esistente)

### Manual Migration SQL

**File**: `backend/prisma/migrations/manual_add_critical_deletedAt_indexes.sql`

```sql
-- Phase 2.1: Critical deletedAt Indexes
-- Online index creation (PostgreSQL 11+, no downtime)

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Company_tenantId_deletedAt_idx" 
  ON "Company"("tenantId", "deletedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Course_tenantId_deletedAt_idx" 
  ON "Course"("tenantId", "deletedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CourseSchedule_tenantId_deletedAt_idx" 
  ON "CourseSchedule"("tenantId", "deletedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "attestati_tenantId_deletedAt_idx" 
  ON "attestati"("tenantId", "deletedAt");
```

### Deployment Procedure

**1. Staging Deployment** (10 novembre 2024):

```bash
# Connessione al database staging
psql $STAGING_DATABASE_URL

# Esegui manual migration
\i backend/prisma/migrations/manual_add_critical_deletedAt_indexes.sql

# Verifica creazione indexes
\di *deletedAt*

# Test performance (vedi sezione verifiche)
```

**2. Monitoring Staging** (48h):
- Query performance dashboard
- Database CPU/memory utilization
- Error logs analysis
- User-reported issues

**3. Production Deployment** (12 novembre 2024 - se staging OK):

```bash
# Backup pre-deployment
pg_dump $PRODUCTION_DATABASE_URL > backup_pre_phase2.1_$(date +%Y%m%d).sql

# Esegui migration
psql $PRODUCTION_DATABASE_URL < backend/prisma/migrations/manual_add_critical_deletedAt_indexes.sql

# Verifica immediata (vedi sezione verifiche)
```

---

## Procedure di Verifica

### Pre-Migration Checks

```sql
-- 1. Verifica esistenza tabelle
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Company', 'Course', 'CourseSchedule', 'attestati');

-- 2. Conta record per modello (baseline)
SELECT 'Company' as model, COUNT(*) FROM "Company";
SELECT 'Course' as model, COUNT(*) FROM "Course";
SELECT 'CourseSchedule' as model, COUNT(*) FROM "CourseSchedule";
SELECT 'Attestato' as model, COUNT(*) FROM "attestati";

-- 3. Indexes esistenti
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('Company', 'Course', 'CourseSchedule', 'attestati');
```

### Post-Migration Verification

```sql
-- 1. Verifica creazione nuovi indexes
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE '%deletedAt_idx';

-- 2. Verifica integrità dati (count deve essere identico)
SELECT 'Company' as model, COUNT(*) FROM "Company";
SELECT 'Course' as model, COUNT(*) FROM "Course";
SELECT 'CourseSchedule' as model, COUNT(*) FROM "CourseSchedule";
SELECT 'Attestato' as model, COUNT(*) FROM "attestati";

-- 3. Test query performance (EXPLAIN ANALYZE)
EXPLAIN ANALYZE 
SELECT * FROM "Company" 
WHERE "tenantId" = 'test-tenant-id' AND "deletedAt" IS NULL;

-- Expected: Index Scan using Company_tenantId_deletedAt_idx
-- Before: Seq Scan (100-500ms), After: Index Scan (20-30ms)
```

### Performance Benchmarks

**Query Pattern** (tipica soft delete query):
```sql
SELECT * FROM "Company" 
WHERE "tenantId" = ? AND "deletedAt" IS NULL;
```

**Expected Improvements**:
- **Execution time**: 100ms → 20-30ms (3-5x faster)
- **Database CPU**: -15% medio
- **Concurrent users**: Supporta 10+ utenti senza degradazione

---

## Rollback Procedures

### Scenario: Performance Regression o Errori

**Phase 2.1 Rollback** (indexes):

```sql
-- Rollback immediato: DROP indexes
DROP INDEX CONCURRENTLY IF EXISTS "Company_tenantId_deletedAt_idx";
DROP INDEX CONCURRENTLY IF EXISTS "Course_tenantId_deletedAt_idx";
DROP INDEX CONCURRENTLY IF EXISTS "CourseSchedule_tenantId_deletedAt_idx";
DROP INDEX CONCURRENTLY IF EXISTS "attestati_tenantId_deletedAt_idx";

-- Verifica rimozione
\di *deletedAt*

-- Restart applicazione (se necessario)
pm2 restart all
```

**Note**:
- `DROP INDEX CONCURRENTLY` è istantaneo (no lock)
- Nessuna perdita dati (indexes non contengono dati)
- Query tornano a Seq Scan (comportamento pre-migration)

### Rollback Triggers (quando fare rollback)

1. **Immediate rollback** (entro 1h):
   - Errori SQL post-deployment
   - Aumento errori 500 > 5%
   - Crash applicazione ricorrenti

2. **24h rollback** (monitoraggio):
   - Performance regression > 20%
   - Database CPU > 90% sostenuto
   - User reports di lentezza significativa

3. **48h rollback** (analisi):
   - Memory leaks rilevati
   - Query timeout aumentati > 30%
   - Anomalie nei logs non spiegabili

---

## Best Practices

### Manual Migrations (quando usarle)

✅ **Usa manual migrations per**:
- Index creation/deletion su tabelle grandi (> 10K rows)
- Schema changes che richiedono data transformation
- Production-critical changes che necessitano review SQL
- Situazioni dove shadow database non è disponibile

❌ **Evita manual migrations per**:
- Semplici aggiunte di campi nullable
- Nuove tabelle di lookup/configuration
- Changes reversibili automaticamente da Prisma

### PostgreSQL Online Index Creation

```sql
-- ✅ CORRETTO: CONCURRENTLY (no lock, no downtime)
CREATE INDEX CONCURRENTLY "idx_name" ON "Table"("column");

-- ❌ SBAGLIATO: Lock esclusivo (downtime in produzione)
CREATE INDEX "idx_name" ON "Table"("column");
```

### Index Naming Convention

**Pattern**: `{TableName}_{column1}_{column2}_idx`

**Examples**:
- `Company_tenantId_deletedAt_idx`
- `Person_deletedAt_status_idx`
- `TemplateLink_deletedAt_idx`

### Monitoring Post-Deployment

**First Hour** (immediate):
- [ ] Error rate < 1%
- [ ] Response time 200ms avg
- [ ] No database connection errors
- [ ] CPU/Memory dentro limiti normali

**First 24 Hours**:
- [ ] Performance metrics stable
- [ ] No user-reported issues
- [ ] Logs clean (no anomalie)
- [ ] Database backup successful

**First 48 Hours**:
- [ ] Trend performance positivo
- [ ] Resource utilization ottimale
- [ ] Integration tests passing
- [ ] Stakeholder approval

---

## Riferimenti

- **Phase 2.1 Detailed**: `docs/10_project_managemnt/32_pulizia-e-allineamento/16_prisma_deletedAt_indexes.md`
- **Prisma Docs**: https://www.prisma.io/docs/concepts/components/prisma-migrate
- **PostgreSQL Indexes**: https://www.postgresql.org/docs/current/sql-createindex.html
- **TRAE Guide**: `.trae/TRAE_SYSTEM_GUIDE.md` (Deployment Safety Checklist)
- **Project Rules**: `.trae/rules/project_rules.md` (Database Best Practices)

---

**✅ Phase 2.1 Status**: Schema ottimizzato, migration pronta per staging  
**📅 Next**: Phase 2.2 Browser Pool PDF (5-10x performance improvement)
