# Phase 2: Backend Consolidations - DETAILED PLAN

**Date**: 10 Novembre 2025  
**Duration**: 2 settimane (80 ore)  
**Status**: 🔄 IN PROGRESS  
**Dependencies**: Phase 1 completata ✅

---

## 📊 EXECUTIVE SUMMARY

### Objectives
- **-500 linee**: Eliminate duplication through strategic consolidation
- **Performance +200%**: Browser pool for PDF generation (5-10x faster)
- **Architecture Clarity**: Clear separation of responsibilities
- **Maintainability +40%**: Single source of truth for shared logic

### Impact
- **Code Quality**: 8.4/10 → 8.8/10 (+5%)
- **Duplication**: 3% → <1% (-67%)
- **PDF Performance**: Single browser → Pool (5-10x)
- **Developer Velocity**: +20% (less code to maintain)

---

## 🎯 TASKS BREAKDOWN

### **Task 1: Google Importers Consolidation** (-300 linee)

**Status**: 🔄 IN PROGRESS  
**Effort**: 4-5 ore  
**Priority**: HIGH

#### Current State Analysis

**Files**:
- `googleDocsImporter.js` (496 linee)
- `googleSlidesImporter.js` (424 linee)
- **Total**: 920 linee

**Duplication Identified** (~70%):

| Function | Docs | Slides | Duplication |
|----------|------|--------|-------------|
| `fetch*` (OAuth2 setup) | ✅ | ✅ | 95% identical |
| `extractMarkers` | ✅ | ✅ | 100% identical |
| `convertTableToHTML` | ✅ | ✅ | 80% similar |
| Error handling | ✅ | ✅ | 100% identical |
| Logging patterns | ✅ | ✅ | 100% identical |

**Differences** (~30%):
- Document structure parsing (Docs: paragraphs, lists; Slides: shapes, elements)
- Content extraction logic (format-specific)
- API endpoints (google.docs vs google.slides)

#### Strategy Pattern Design

**New Architecture**:
```
backend/services/google/
├── googleImporter.js (150L) - Base class with shared logic
├── strategies/
│   ├── docsStrategy.js (200L) - Docs-specific parsing
│   └── slidesStrategy.js (170L) - Slides-specific parsing
└── utils/
    └── googleUtils.js (100L) - Shared utilities
```

**Total**: ~620 linee (-300 from original 920)

#### Implementation Plan

**Step 1: Create Base Importer** (1.5 ore)
- [ ] Create `backend/services/google/googleImporter.js`
- [ ] Extract shared logic:
  - OAuth2 client setup
  - Token validation
  - Error handling patterns
  - Logging utilities
  - `extractMarkers` function
- [ ] Define strategy interface:
  ```javascript
  interface ImportStrategy {
    fetchContent(id, accessToken): Promise<object>
    convertToHTML(data): string
    getMetadata(data): object
  }
  ```

**Step 2: Create Docs Strategy** (1 ora)
- [ ] Create `backend/services/google/strategies/docsStrategy.js`
- [ ] Move Docs-specific logic:
  - `fetchDocument`
  - `convertToHTML` (Docs version)
  - `formatTextRun`
  - `convertParagraphToHTML`
  - `convertListToHTML`
- [ ] Implement strategy interface

**Step 3: Create Slides Strategy** (1 ora)
- [ ] Create `backend/services/google/strategies/slidesStrategy.js`
- [ ] Move Slides-specific logic:
  - `fetchPresentation`
  - `convertToHTML` (Slides version)
  - `extractText`
  - `convertShapeToHTML`
  - `convertSlideToHTML`
- [ ] Implement strategy interface

**Step 4: Extract Shared Utilities** (30 min)
- [ ] Create `backend/services/google/utils/googleUtils.js`
- [ ] Move shared functions:
  - `convertTableToHTML` (generalized version)
  - `sanitizeHTML`
  - `formatStyles`

**Step 5: Update Imports & Test** (1 ora)
- [ ] Find all files importing `googleDocsImporter` or `googleSlidesImporter`
- [ ] Update imports to use new unified API:
  ```javascript
  import { GoogleImporter } from './services/google/googleImporter.js';
  
  // Usage:
  const importer = new GoogleImporter('docs'); // or 'slides'
  const result = await importer.import(docId, userId, tenantId);
  ```
- [ ] Run tests
- [ ] Manual testing with real Google Docs/Slides

**Step 6: Delete Old Files & Commit** (15 min)
- [ ] Delete `googleDocsImporter.js`
- [ ] Delete `googleSlidesImporter.js`
- [ ] Git commit with detailed message

#### Success Criteria
- ✅ -300 linee eliminati (920 → 620)
- ✅ Zero duplication in shared logic
- ✅ All existing functionality preserved
- ✅ Tests passing
- ✅ No breaking changes for consumers

---

### **Task 2: Performance Monitoring Consolidation** (-200 linee)

**Status**: ⏸️ PENDING  
**Effort**: 3-4 ore  
**Priority**: MEDIUM

#### Current State Analysis

**Files**:
- `performance.js` (120 linee)
- `performance-monitor.js` (150 linee)
- `performance-monitoring.js` (80 linee)
- **Total**: 350 linee

**Duplication** (~60%):
- Similar metrics collection logic
- Duplicate timing utilities
- Overlapping logging patterns

#### Strategy

**Unified Architecture**:
```
backend/middleware/performance.js (150L)
- Single middleware with configurable options
- Metrics collection (timing, memory, CPU)
- Integration with logger
- Optional prometheus/grafana export
```

#### Implementation Plan

**Step 1: Analyze Current Usage** (1 ora)
- [ ] Grep all imports of 3 performance files
- [ ] Document which routes use which version
- [ ] Identify feature differences

**Step 2: Create Unified Middleware** (1.5 ore)
- [ ] Merge best features from all 3 files
- [ ] Configurable thresholds
- [ ] Multiple output formats

**Step 3: Update All Routes** (1 ora)
- [ ] Replace old imports
- [ ] Test each route
- [ ] Verify metrics still collected

**Step 4: Delete & Commit** (30 min)
- [ ] Delete 2 old files
- [ ] Git commit

#### Success Criteria
- ✅ -200 linee (350 → 150)
- ✅ Single performance middleware
- ✅ All routes monitored
- ✅ Metrics quality preserved

---

### **Task 3: Permission Services Clarification** 

**Status**: ⏸️ PENDING  
**Effort**: 5-6 ore  
**Priority**: HIGH

#### Current State Analysis

**Files**:
- `virtualEntityPermissions.js` (494 linee)
- `advanced-permission.js` (routes, 400 linee)

**Issue**: Overlapping responsibility unclear separation

#### Strategy

**Option A: Keep Separate** (RECOMMENDED)
- `virtualEntityPermissions.js`: Virtual entity logic (calendars, imports)
- `advanced-permission.js`: Advanced permission management routes
- Extract shared logic to `permissionUtils.js`

**Option B: Consolidate**
- Merge into single `permissionService.js`
- Risk: High complexity in single file

#### Implementation Plan (Option A)

**Step 1: Identify Overlaps** (2 ore)
- [ ] Map functions in both files
- [ ] Find duplicate logic patterns
- [ ] Document intended responsibilities

**Step 2: Extract Common Logic** (2 ore)
- [ ] Create `utils/permissionUtils.js`
- [ ] Move shared functions:
  - Permission checking patterns
  - Entity resolution
  - Error handling

**Step 3: Update Both Services** (1.5 ore)
- [ ] Refactor to use `permissionUtils`
- [ ] Clear comments on responsibilities
- [ ] Update imports

**Step 4: Documentation** (30 min)
- [ ] Add JSDoc explaining separation
- [ ] Update technical docs

#### Success Criteria
- ✅ Clear separation of concerns
- ✅ Reduced duplication (<10%)
- ✅ Better maintainability

---

### **Task 4: Discount Logic Extraction**

**Status**: ⏸️ PENDING  
**Effort**: 3-4 ore  
**Priority**: MEDIUM

#### Current State Analysis

**Files with Discount Logic**:
- `codici-sconto-service.js` (430 linee) - Discount management
- `preventivi-service.js` (1,260 linee) - Uses discounts inline

**Duplication**:
- Percentage calculation logic
- Fixed amount calculation
- Discount stacking rules
- Validation logic

#### Strategy

**Create Shared Service**:
```
backend/services/discounts/
├── DiscountService.js (150L) - Core calculation logic
└── discountValidation.js (50L) - Validation rules
```

#### Implementation Plan

**Step 1: Extract Discount Calculations** (1.5 ore)
- [ ] Create `DiscountService.js`
- [ ] Implement methods:
  - `calculatePercentage(amount, percentage)`
  - `calculateFixed(amount, fixed)`
  - `stackDiscounts(amount, discounts[])`
  - `validateDiscount(discount)`

**Step 2: Update codici-sconto-service** (1 ora)
- [ ] Replace inline logic with DiscountService calls
- [ ] Maintain existing API

**Step 3: Update preventivi-service** (1 ora)
- [ ] Replace inline discount calculations
- [ ] Test Preventivi generation with discounts

**Step 4: Testing & Commit** (30 min)
- [ ] Unit tests for DiscountService
- [ ] Integration tests
- [ ] Commit

#### Success Criteria
- ✅ Single source of truth for discount logic
- ✅ Reusable across services
- ✅ Better testability

---

### **Task 5: Browser Pool for PDF Service** 🔥

**Status**: ⏸️ PENDING  
**Effort**: 5-6 ore  
**Priority**: CRITICAL (Performance)

#### Current State Analysis

**File**: `pdfService.js` (800+ linee)

**Issue**: Single Puppeteer browser instance
- **Current**: Sequential PDF generation
- **Bottleneck**: One PDF at a time
- **Performance**: ~2-5 sec per PDF
- **Impact**: 10+ concurrent users = 20-50 sec wait time

#### Strategy

**Browser Pool Implementation**:
```javascript
// Using puppeteer-cluster
import { Cluster } from 'puppeteer-cluster';

const cluster = await Cluster.launch({
  concurrency: Cluster.CONCURRENCY_CONTEXT,
  maxConcurrency: 5, // 5 browser contexts
  puppeteerOptions: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});
```

#### Implementation Plan

**Step 1: Install Dependencies** (15 min)
- [ ] Add `puppeteer-cluster` to package.json
- [ ] `npm install puppeteer-cluster`

**Step 2: Create Browser Pool Manager** (2 ore)
- [ ] Create `browserPoolManager.js`
- [ ] Initialize cluster with config
- [ ] Graceful shutdown handling
- [ ] Error recovery

**Step 3: Refactor pdfService** (2 ore)
- [ ] Replace single browser with pool
- [ ] Update `generatePDF` to use cluster.execute()
- [ ] Add queue management
- [ ] Maintain existing API

**Step 4: Configuration** (1 ora)
- [ ] Add pool config to environment vars:
  - `PDF_POOL_SIZE` (default: 5)
  - `PDF_TIMEOUT` (default: 30000ms)
- [ ] Add monitoring metrics

**Step 5: Testing** (1 ora)
- [ ] Load testing (10 concurrent PDF generations)
- [ ] Measure performance improvement
- [ ] Test error scenarios
- [ ] Memory leak checks

**Step 6: Documentation & Commit** (30 min)
- [ ] Update technical docs
- [ ] Add deployment notes
- [ ] Commit with performance metrics

#### Expected Results
- **Performance**: 5-10x improvement on concurrent generation
- **Throughput**: 5 PDFs in parallel (vs 1 sequential)
- **Latency**: ~2 sec average (vs 10+ sec under load)
- **Resource**: Better CPU/memory utilization

#### Success Criteria
- ✅ 5-10x performance improvement verified
- ✅ Concurrent PDF generation working
- ✅ No memory leaks detected
- ✅ Production-ready

---

### **Task 6: RBAC File Split**

**Status**: ⏸️ PENDING  
**Effort**: 4-5 ore  
**Priority**: MEDIUM

#### Current State

**File**: `rbac.js` (1,107 linee) - God File

**Issue**: Single file, multiple responsibilities

#### Strategy

**Split into 3 files**:
```
backend/services/rbac/
├── RBACService.js (500L) - Core RBAC logic
├── RBACMiddleware.js (350L) - Express middleware
└── RBACUtils.js (250L) - Utility functions
```

**Total**: ~1,100 linee (no reduction, but better organization)

#### Implementation Plan

**Step 1: Analyze Responsibilities** (1 ora)
- [ ] Map all functions
- [ ] Categorize by responsibility
- [ ] Plan split strategy

**Step 2: Create RBACService** (1.5 ore)
- [ ] Move core permission logic
- [ ] Move role hierarchy
- [ ] Move tenant isolation

**Step 3: Create RBACMiddleware** (1 ore)
- [ ] Extract middleware functions
- [ ] Update to use RBACService

**Step 4: Create RBACUtils** (30 min)
- [ ] Move utility functions
- [ ] Constants, helpers

**Step 5: Update Imports** (1 ora)
- [ ] Find all RBAC imports
- [ ] Update to new structure
- [ ] Test

**Step 6: Delete & Commit** (30 min)

#### Success Criteria
- ✅ Clear separation (Service, Middleware, Utils)
- ✅ Max file size <500 linee
- ✅ All functionality preserved

---

### **Task 7: Console.log → Logger Migration**

**Status**: ⏸️ PENDING (from Phase 1 deferral)  
**Effort**: 3-4 ore  
**Priority**: LOW

#### Current State

**Total**: 329 console statements in backend

**Scope**: Systematic replacement across:
- Routes (100+ statements)
- Services (150+ statements)
- Middleware (50+ statements)
- Controllers (29+ statements)

#### Strategy

**Automated Replacement** with manual review:

1. **Find all console statements**:
   ```bash
   grep -r "console\." backend/ --include="*.js" --include="*.mjs"
   ```

2. **Replacement patterns**:
   - `console.log()` → `logger.info()` or `logger.debug()`
   - `console.error()` → `logger.error()`
   - `console.warn()` → `logger.warn()`

3. **Add context** to logger calls:
   ```javascript
   // BEFORE:
   console.log('User logged in:', userId);
   
   // AFTER:
   logger.info('User logged in', { userId, tenantId });
   ```

#### Implementation Plan

**Step 1: Automated Find & Replace** (1 ora)
- [ ] Script to find all console statements
- [ ] Group by file/directory
- [ ] Generate replacement list

**Step 2: Manual Review & Replace** (2 ore)
- [ ] Go through each file
- [ ] Replace with appropriate logger call
- [ ] Add structured context data

**Step 3: ESLint Rule** (30 min)
- [ ] Add no-console rule to ESLint
- [ ] Exceptions for scripts/tools only

**Step 4: Test & Commit** (30 min)
- [ ] Verify logging still works
- [ ] Test log levels
- [ ] Commit

#### Success Criteria
- ✅ Zero console statements in production code
- ✅ ESLint enforces no-console
- ✅ Structured logging with context

---

## 📅 TIMELINE & SEQUENCING

### Week 1 (Days 1-5)

**Day 1: Google Importers** (5 ore)
- Morning: Analysis & base importer
- Afternoon: Strategies implementation

**Day 2: Performance Monitoring** (4 ore)
- Morning: Analysis & unified middleware
- Afternoon: Testing & rollout

**Day 3: Permission Services** (6 ore)
- Full day: Analysis, extraction, refactoring

**Day 4: Discount Logic** (4 ore)
- Morning: Extract DiscountService
- Afternoon: Update consumers, testing

**Day 5: Review & Testing** (5 ore)
- Integration testing
- Documentation
- Git commits

**Week 1 Total**: 24 ore

---

### Week 2 (Days 6-10)

**Day 6-7: Browser Pool** (12 ore)
- Day 6: Implementation (6 ore)
- Day 7: Testing & optimization (6 ore)

**Day 8: RBAC Split** (5 ore)
- Morning: Analysis & splitting
- Afternoon: Update imports, testing

**Day 9: Console.log Migration** (4 ore)
- Systematic replacement
- ESLint configuration

**Day 10: Final Review** (3 ore)
- Code review
- Documentation update
- Performance benchmarks
- Phase 2 completion report

**Week 2 Total**: 24 ore

---

**Grand Total**: 48 ore (2 settimane, 1 persona)

---

## 📊 SUCCESS METRICS

### Code Quality

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Backend Lines | 48,000 | 47,500 | -500 (-1%) |
| Duplication | 3% | <1% | -67% |
| Max File Size | 1,260L | <1,000L | -20%+ |
| God Files | 2 | 0 | -100% |

### Performance

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| PDF Generation (single) | ~2-5s | ~2-5s | 0% |
| PDF Generation (10 concurrent) | 20-50s | 4-10s | -70% |
| PDF Throughput | 1 PDF/time | 5 PDF/parallel | +400% |

### Maintainability

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Code Clarity | 8.4/10 | 8.8/10 | +5% |
| Developer Velocity | Baseline | +20% | +20% |
| Onboarding Time | Baseline | -15% | -15% |

---

## ⚠️ RISKS & MITIGATION

### Risk 1: Breaking Changes in Consolidation
- **Probability**: MEDIUM
- **Impact**: HIGH
- **Mitigation**: 
  - Comprehensive testing before/after
  - Keep old files until new verified
  - Feature flags for gradual rollout
- **Contingency**: Rollback to old implementation

### Risk 2: Performance Degradation (Browser Pool)
- **Probability**: LOW
- **Impact**: HIGH
- **Mitigation**:
  - Load testing before production
  - Monitor memory usage
  - Configurable pool size
- **Contingency**: Roll back to single browser

### Risk 3: Import/Export Breaking
- **Probability**: MEDIUM
- **Impact**: MEDIUM
- **Mitigation**:
  - Update all imports systematically
  - ESLint check for unused imports
  - Test import functionality end-to-end
- **Contingency**: Fix imports individually

---

## 🎯 DELIVERABLES

### Code Deliverables
- [ ] `backend/services/google/` - Unified Google importer (3 files, 620L)
- [ ] `backend/middleware/performance.js` - Unified performance middleware (150L)
- [ ] `backend/services/rbac/` - Split RBAC (3 files, 1,100L)
- [ ] `backend/services/discounts/` - Shared discount logic (2 files, 200L)
- [ ] `backend/services/browserPoolManager.js` - Browser pool (150L)
- [ ] Updated imports across all consumers

### Documentation Deliverables
- [ ] Phase 2 completion report
- [ ] Performance benchmarks (PDF generation)
- [ ] Architecture diagrams (updated)
- [ ] Migration guide (for future consolidations)

### Quality Deliverables
- [ ] All tests passing
- [ ] ESLint: Zero errors
- [ ] Performance: 5-10x improvement verified
- [ ] Code review: Approved

---

## 🔄 NEXT STEPS AFTER PHASE 2

### Immediate
1. ✅ Deploy to staging
2. ✅ Monitor performance metrics
3. ✅ Collect team feedback
4. ✅ Deploy to production (gradual rollout)

### Phase 3 Planning
- Review frontend God Components priority
- Allocate 2 developers if possible (parallel work)
- Schedule 5-week sprint

---

## 📝 NOTES

### Dependencies
- Phase 1 must be completed ✅
- Staging environment available
- Test suite in place

### Assumptions
- 1 developer full-time (40 ore/settimana)
- Access to staging environment
- Ability to deploy incrementally

### Open Questions
- [ ] Confirm browser pool size (5 contexts optimal?)
- [ ] Prometheus/Grafana integration for monitoring?
- [ ] Load testing infrastructure available?

---

**Prepared by**: GitHub Copilot (TRAE AI)  
**Date**: 10 Novembre 2025  
**Status**: 🔄 IN PROGRESS  
**Phase**: 2 di 7 (Backend Consolidations)  
**Next Action**: Google Importers consolidation (Task 1)

