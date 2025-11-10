# 🛣️ FASE 1.3 - Analisi Routes Backend

**Data**: 10 Novembre 2025  
**Scope**: `/backend/routes/` - 32+ files routes  
**Status**: 🔄 IN CORSO

---

## 📊 INVENTARIO ROUTES

### Structure Overview

```
routes/
├── Core Business Routes (15 files)
│   ├── companies-routes.js
│   ├── person-routes.js
│   ├── courses-routes.js
│   ├── schedules-routes.js
│   ├── attestati-routes.js
│   ├── preventivi-routes.js
│   ├── lettere-incarico-routes.js
│   ├── registri-presenze-routes.js
│   ├── employees-routes.js
│   ├── trainers.js
│   ├── company-sites-routes.js
│   ├── dvr-routes.js
│   ├── sopralluogo-routes.js
│   ├── reparto-routes.js
│   └── orari.js
│
├── Auth & Security (5 files)
│   ├── auth.js
│   ├── auth-advanced.js
│   ├── google-auth-routes.js
│   ├── roles.js
│   └── advanced-permissions.js
│
├── Document Management (4 files)
│   ├── document-routes.js
│   ├── template-routes.js
│   ├── template-routes-enhanced.js
│   └── google-docs-routes.js
│
├── Public API (3 files)
│   ├── public-courses-routes.js
│   ├── public-forms-routes.js
│   └── advanced-submissions-routes.js
│
├── Admin & Config (6 files)
│   ├── tenants.js / tenant.js
│   ├── settings-routes.js
│   ├── impostazioni.js
│   ├── config.js
│   ├── dashboard-routes.js
│   └── activity-logs-routes.js
│
├── GDPR & Compliance (2 files)
│   ├── gdpr.js
│   └── gdpr/ (folder)
│
├── CMS & Forms (3 files)
│   ├── cms-routes.js
│   ├── form-templates-routes.js
│   └── codici-sconto-routes.js
│
├── Utility & Infrastructure (5 files)
│   ├── api-documentation.js
│   ├── api-versioning.js
│   ├── query-optimizer.js
│   ├── response-handler.js
│   └── test-routes.js
│
├── Legacy/Duplicate (4 files)
│   ├── companies.js (vs companies-routes.js)
│   ├── users.js (vs users-routes.js)
│   ├── persone.js (vs person-routes.js)
│   └── template-routes.backup.js
│
└── Infrastructure Folders (8 dirs)
    ├── config/
    ├── core/
    ├── documentation/
    ├── error-handling/
    ├── optimization/
    ├── roles/
    ├── validation/
    └── versioning/
```

---

## 🚨 IMMEDIATE FINDINGS

### ⚠️ Potential Duplications (HIGH PRIORITY)

1. **companies.js vs companies-routes.js**
   - Two files, same purpose?
   - **Action**: Verificare quale è usato

2. **users.js vs users-routes.js**
   - Duplicate naming pattern
   - **Action**: Audit usage

3. **persone.js vs person-routes.js**
   - Italian vs English naming
   - **Action**: Consolidate

4. **template-routes.js vs template-routes-enhanced.js**
   - Two versions?
   - **Action**: Verificare quale attivo

5. **template-routes.backup.js**
   - Backup file in production code
   - **Action**: RIMUOVERE se non necessario

6. **tenant.js vs tenants.js**
   - Singular vs plural
   - **Action**: Consolidate

### 📁 Infrastructure Analysis

**Planning Documents Found**:
- `REFACTORING_PLAN.md`
- `ROUTE_MANAGER_REFACTORING_PLAN.md`

**Action**: Leggere per capire refactoring in corso

---

## 🔍 DETAILED ROUTE ANALYSIS

### Quick Audit Strategy

Per ogni route file verificare:
1. ✅ Autenticazione middleware presente
2. ✅ Autorizzazione (permissions) verificata
3. ✅ Input validation implementata
4. ✅ Error handling robusto
5. ✅ Tenant isolation (multi-tenant)
6. ⚠️ GDPR compliance
7. ⚠️ Rate limiting
8. ⚠️ SQL injection prevention (Prisma protegge?)
9. ⚠️ File upload security (se presente)

---

## 📋 PRIORITY ANALYSIS ORDER

### CRITICAL Routes (Security & Data)
1. auth.js, auth-advanced.js
2. person-routes.js
3. companies-routes.js
4. gdpr.js
5. advanced-permissions.js

### HIGH Priority (Business Critical)
6. courses-routes.js
7. schedules-routes.js
8. preventivi-routes.js
9. attestati-routes.js
10. document-routes.js

### MEDIUM Priority (Features)
11-25. Remaining business routes

### LOW Priority (Utilities)
26-32. Test, docs, utilities

---

## 🎯 ANALYSIS APPROACH

### Step 1: Read Planning Docs
- REFACTORING_PLAN.md
- ROUTE_MANAGER_REFACTORING_PLAN.md

### Step 2: Identify Duplicates
- Grep usage for duplicate files
- Determine active vs legacy

### Step 3: Security Audit
- Auth middleware consistency
- Permission checks
- Input validation

### Step 4: GDPR Compliance
- Data access logging
- Consent verification
- Right to be forgotten

### Step 5: Performance
- N+1 query detection
- Missing indexes
- Caching opportunities

---

## 📊 EXPECTED ISSUES

Based on backend analysis, expecting:

1. **Inconsistent Naming**: Mix IT/EN
2. **Duplicate Files**: Legacy not removed
3. **Missing Validation**: Some routes
4. **Inconsistent Auth**: Different patterns
5. **No Rate Limiting**: Performance risk
6. **GDPR Gaps**: Not all routes compliant

---

**Status**: 🔄 STARTING ANALYSIS  
**Next**: Read planning docs + audit duplicates

