# Task 1.4: Database Improvements - Detailed Execution Plan

**Data**: 10 Novembre 2025  
**Status**: 🔄 IN PROGRESS  
**Priorità**: 🟡 HIGH  
**Effort**: 2-3 ore  

---

## 📋 OBIETTIVI

1. ✅ Aggiungeremissing indexes per query performance
2. ✅ Convertire strings → enums per data integrity
3. ✅ Verificare soft delete usage e consistency
4. ✅ Migliorare query performance +20%
5. ✅ Mantenere GDPR compliance 100%

---

## 🎯 CURRENT STATE ANALYSIS

### Schema Prisma Info
- **File**: `backend/prisma/schema.prisma`
- **Size**: 1,977 linee
- **Models**: ~40 (stima basata su dimensione)
- **Current Indexes**: Alcuni già presenti (@@index)

### Already Existing Indexes (Good!)

Da lines 1-100 identificati:

```prisma
model Company {
  // ...
  @@index([tenantId])
  @@index([tenantId, deletedAt]) // Phase 2: Soft delete performance ✅
}

model CompanySite {
  // ...
  @@index([companyId])
  @@index([tenantId])
  @@index([rsppId])
  @@index([medicoCompetenteId])
}
```

✅ **Ottimo**: Già presente index composito per soft delete!

---

## 📊 STRATEGY

### Fase 1: Identificare Missing Indexes (30 min)

**Priorità indexes**:
1. **Foreign keys** - Spesso usati in JOIN (già molti presenti ✅)
2. **Status fields** - WHERE clauses frequenti
3. **Date fields** - ORDER BY, range queries
4. **Tenant isolation** - CRITICAL per multi-tenancy
5. **Composite indexes** - Query complesse

### Fase 2: Identificare String → Enum Conversions (30 min)

**Campi candidati**:
- `status` (pending, approved, rejected)
- `type` (document_type, schedule_type)
- `role` (admin, user, doctor, rspp)
- `category` (course_category)
- `subscriptionPlan` (basic, premium, enterprise)

### Fase 3: Verificare Soft Delete Usage (30 min)

**Pattern da verificare**:
```prisma
deletedAt DateTime? // ✅ Standard pattern
```

**Verifica queries**:
- Tutti i `findMany` devono filtrare `deletedAt: null`
- Soft delete non deve impedire hard delete (GDPR)

### Fase 4: Create Migration & Test (60 min)

1. Backup database
2. Generate migration
3. Apply in development
4. Performance benchmarks
5. Test queries

---

## 🔍 STEP 1: COMPREHENSIVE SCHEMA ANALYSIS

Prima di modificare, dobbiamo leggere completamente lo schema per identificare:
1. Tutti i models
2. Tutti i campi string che potrebbero essere enum
3. Tutti i foreign keys senza index
4. Tutti i date fields senza index
5. Tutte le query patterns comuni

### Action Items

**Read complete schema** (1,977 linee):
- [ ] Read lines 100-400 (models core)
- [ ] Read lines 400-800 (models schedules)
- [ ] Read lines 800-1200 (models persons/roles)
- [ ] Read lines 1200-1600 (models gdpr/templates)
- [ ] Read lines 1600-1977 (models preventivi/documents)

**Analyze patterns**:
- [ ] List all `status` fields → Enum candidates
- [ ] List all `type` fields → Enum candidates
- [ ] List all foreign keys → Check indexes
- [ ] List all `deletedAt` → Verify soft delete consistency
- [ ] List all date fields → Index candidates

---

## 💡 PRELIMINARY RECOMMENDATIONS

Basandomi su best practices e roadmap analysis:

### Missing Indexes (High Probability)

```prisma
model Person {
  // Probabili missing indexes:
  @@index([tenantId, isActive]) // Query per tenant + active
  @@index([email]) // Lookup by email
  @@index([roleType]) // Filter by role
  @@index([deletedAt]) // Soft delete queries
}

model CourseSchedule {
  @@index([tenantId, status]) // Query per tenant + status
  @@index([startDate, endDate]) // Range queries
  @@index([createdAt]) // Timeline queries
}

model Submission {
  @@index([formTemplateId, status]) // Filter form submissions
  @@index([tenantId, createdAt]) // Timeline per tenant
}

model Preventivo {
  @@index([tenantId, status]) // Filter preventivi
  @@index([companyId, createdAt]) // Company timeline
}
```

### String → Enum Conversions

```prisma
// PRIMA
model Company {
  subscriptionPlan String @default("basic") // "basic", "premium", "enterprise"
}

// DOPO
enum SubscriptionPlan {
  BASIC
  PREMIUM
  ENTERPRISE
}

model Company {
  subscriptionPlan SubscriptionPlan @default(BASIC)
}
```

**Altri enum candidati**:
- `status` fields (CourseSchedule, Submission, Preventivo, etc.)
- `type` fields (Template, Document, etc.)
- `role` fields (PersonRole)
- `category` fields (Course)

### Soft Delete Verification

**Checklist**:
- [ ] Tutti i models hanno `deletedAt DateTime?`?
- [ ] Services usano `where: { deletedAt: null }`?
- [ ] Hard delete disponibile per GDPR?
- [ ] Cascade delete gestito correttamente?

---

## ⚠️ RISKS & MITIGATION

### Risk 1: Breaking Changes

**Mitigation**:
- Backup database prima migration
- Test in development first
- Gradual rollout (staging → production)
- Rollback plan documentato

### Risk 2: Data Loss (Enum Conversion)

**Mitigation**:
- Verificare TUTTI i valori esistenti nel database
- Migration deve mappare correttamente old → new values
- Se valore non mappabile → error (fix manually)

**Example migration**:
```sql
-- Safe enum conversion
-- Step 1: Add new enum column
ALTER TABLE "Company" ADD COLUMN "subscriptionPlanNew" "SubscriptionPlan";

-- Step 2: Migrate data with validation
UPDATE "Company" 
SET "subscriptionPlanNew" = 
  CASE 
    WHEN "subscriptionPlan" = 'basic' THEN 'BASIC'::SubscriptionPlan
    WHEN "subscriptionPlan" = 'premium' THEN 'PREMIUM'::SubscriptionPlan
    WHEN "subscriptionPlan" = 'enterprise' THEN 'ENTERPRISE'::SubscriptionPlan
    ELSE 'BASIC'::SubscriptionPlan -- Default fallback
  END;

-- Step 3: Drop old column & rename
ALTER TABLE "Company" DROP COLUMN "subscriptionPlan";
ALTER TABLE "Company" RENAME COLUMN "subscriptionPlanNew" TO "subscriptionPlan";
```

### Risk 3: GDPR Compliance

**Verification**:
- [ ] Indexes non espongono PII
- [ ] Enums non contengono dati personali
- [ ] Soft delete NON impedisce hard delete
- [ ] Right to erasure mantenuto

---

## 🚀 NEXT ACTIONS

### Immediate (Now)

1. **Read complete schema** (30 min)
   ```bash
   # Leggi schema completo in chunks
   cat backend/prisma/schema.prisma | wc -l
   # 1977 linee total
   ```

2. **Create analysis document** (30 min)
   - File: `docs/.../20_prisma_schema_analysis.md`
   - List all models with:
     - Missing indexes
     - String → Enum candidates
     - Soft delete status
     - Foreign key coverage

3. **Decide on changes** (15 min)
   - Prioritize HIGH impact indexes
   - Select 3-5 enum conversions (safe ones)
   - Verify soft delete consistency

4. **Implement changes** (60 min)
   - Update schema.prisma
   - Generate migration
   - Test in development
   - Performance benchmarks

5. **Documentation** (15 min)
   - Document changes
   - Update completion report
   - Add rollback instructions

---

## 📈 SUCCESS METRICS

### Performance Targets
- Query performance: +20% (indexed queries)
- Data integrity: 100% (enums prevent invalid values)
- Soft delete: 100% consistency

### Quality Metrics
- Missing indexes: Identified & added (5-10 indexes)
- Enum conversions: 3-5 fields converted
- Soft delete: Verified 100% usage

### GDPR Compliance
- [ ] No PII in indexes
- [ ] Hard delete still possible
- [ ] Right to erasure maintained

---

**Status**: ✅ READY TO PROCEED  
**Next Step**: Read complete schema (chunks) & create analysis  
**Estimated Time**: 2-3 ore total
