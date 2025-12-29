# 🎯 IMPLEMENTATION PLAN - Progetto 32: Pulizia e Allineamento

**Data Creazione**: 10 Novembre 2025  
**Status Attuale**: ✅ Phase 3.5 COMPLETATA (GenericImport refactored)  
**Progress Overall**: 36% (5/8 God Components complete)  
**Quality Score**: 8.1/10 → 8.8/10 (+0.7)

---

## 📊 STATUS CORRENTE

### ✅ Fasi Completate (Oggi - 10 Nov 2025)

**Phase 1: Quick Wins & Security** ✅ COMPLETE
- ✅ CSRF protection su public forms
- ✅ Rate limiting configurato (auth: 5/15min, public: 5/5min)
- ✅ Test routes production guard (403 forbidden)
- ✅ Permission checks ri-abilitati
- ✅ Dead code eliminato (2 files: PersonServiceOptimized.js, template-routes.backup.js)
- **Commits**: 2a2c8d6, 8bee061

**Phase 2.1: Prisma Indexes** ✅ COMPLETE
- ✅ Indici compound aggiunti: `@@index([tenantId, deletedAt])`
- ✅ Models ottimizzati: Company, Course, CourseSchedule, Attestato
- ✅ Performance attesa: 3-5x più veloci soft delete queries
- **Commit**: d65105a

**Phase 3: God Components Elimination** 🔄 IN PROGRESS (63% complete)

Completati (5/8):
1. ✅ **ImportPreviewTable** (987L→138L, -86%) - Commits: 2x
2. ✅ **PreventiviModal** (921L→325L, -65%) - Commits: b6240f5, be5e9a1
3. ✅ **RoleModal** (909L→231L, -75%) - Commits: 12761cd, 0c77309
4. ✅ **RoleHierarchy** (823L→221L, -73%) - Commits: 2640ca1, 2c885f6
5. ✅ **GenericImport** (748L→216L, -71%) - Commit: 4ecf574, ca41e08

Rimanenti (3/8):
6. 📋 **DocumentManager** (761L) - Target: ~250L (-67%)
7. 📋 **HierarchyTreeView** (749L) - Target: ~250L (-67%)
8. 📋 **ScheduleEventModal** (797L) - SKIP (già modulare) ✅

**TRAE Documentation** ✅ COMPLETE
- Commit: 9a00b50

**GDPR Audit + Fixes** ✅ COMPLETE
- 100% compliance verificata
- Commit: 21c6e8c

### 📈 Metriche Raggiunte

**God Components Progress**:
- Completati: 5/8 (63%)
- Linee ridotte: 4,388L → 1,131L (-3,257L, -74% avg)
- Files modulari creati: 55 files
- Avg module size: 95L per file
- Build: 100% PASSED ✅
- TypeScript: 0 errors ✅
- Breaking changes: 0 ✅

**Quality Improvement**:
- Starting: 8.1/10
- Current: 8.8/10
- Target: 9.0/10
- Progress: 78% of improvement achieved

---

## 🎯 PIANO DETTAGLIATO PROSSIME FASI

### **Phase 3.6: DocumentManager** (Prossimo - 3-5 giorni)

**Target Component**: `src/components/shared/DocumentManager.tsx` (761L)

**Analisi Preventiva** (Day 0 - 2 ore):
- [ ] Read file completo (761 linee)
- [ ] Identificare state hooks (useState, useEffect, custom hooks)
- [ ] Mappare API calls e data flow
- [ ] Identificare UI components (upload, list, preview, actions)
- [ ] Analizzare dependencies e imports
- [ ] Creare documento di extraction strategy

**Extraction Strategy** (stimata):
```
DocumentManager/
├── types.ts (150L)
│   ├── DocumentManagerProps
│   ├── DocumentState
│   ├── UploadProgress
│   └── DocumentFilters
├── hooks/
│   ├── useDocumentData.ts (120L) - Fetch, cache, invalidation
│   ├── useDocumentUpload.ts (100L) - Upload, progress, validation
│   ├── useDocumentActions.ts (90L) - Delete, download, preview
│   └── useDocumentFilters.ts (60L) - Search, filters, sorting
├── components/
│   ├── DocumentList.tsx (120L) - Table/grid view
│   ├── DocumentUploadZone.tsx (100L) - Drag-drop, file picker
│   ├── DocumentPreview.tsx (80L) - Preview modal
│   └── DocumentFilters.tsx (70L) - Search + filters UI
├── utils/
│   ├── documentHelpers.ts (80L) - Validation, formatting
│   └── uploadHelpers.ts (70L) - Chunked upload, retry
└── DocumentManager.tsx (250L) - Main orchestrator
```

**Day 1: Types + Utils** (4 ore):
- [ ] Creare types.ts con tutte le interfacce
- [ ] Estrarre documentHelpers.ts (validation, formatting, size checks)
- [ ] Estrarre uploadHelpers.ts (chunked upload, retry logic)
- [ ] Test imports, TypeScript 0 errors

**Day 2: Hooks Layer** (6 ore):
- [ ] Estrarre useDocumentData.ts (fetch, cache, invalidation)
- [ ] Estrarre useDocumentUpload.ts (upload, progress tracking)
- [ ] Estrarre useDocumentActions.ts (delete, download, preview)
- [ ] Estrarre useDocumentFilters.ts (search, filters, sorting)
- [ ] Test ogni hook in isolamento

**Day 3: Components Layer** (6 ore):
- [ ] Estrarre DocumentList.tsx (table/grid rendering)
- [ ] Estrarre DocumentUploadZone.tsx (drag-drop interface)
- [ ] Estrarre DocumentPreview.tsx (preview modal)
- [ ] Estrarre DocumentFilters.tsx (search + filters UI)
- [ ] Test rendering components

**Day 4: Main Component Refactor** (4 ore):
- [ ] Creare DocumentManager.tsx refactored (250L target)
- [ ] Compose 4 hooks
- [ ] Render 4 components
- [ ] Test integration completa
- [ ] TypeScript compilation check
- [ ] Build test: `npm run build`

**Day 5: Validation + Commit** (4 ore):
- [ ] Test manuali (6-8 test cases):
  - Upload singolo file
  - Upload multiplo file
  - Drag & drop
  - Search e filters
  - Download documento
  - Delete documento
  - Preview documento
  - Error handling
- [ ] Verify zero breaking changes
- [ ] Create backup: DocumentManager.backup.tsx
- [ ] Replace original with refactored
- [ ] Git commit con metriche dettagliate
- [ ] Update progress_summary.md

**Success Criteria**:
- [ ] Main component: 761L → ~250L (-67%)
- [ ] Avg module size: <120L
- [ ] TypeScript: 0 errors
- [ ] Build: PASSED
- [ ] Breaking changes: 0
- [ ] Manual tests: 8/8 passed

---

### **Phase 3.7: HierarchyTreeView** (Week after 3.6 - 3-5 giorni)

**Target Component**: `src/components/roles/HierarchyTreeView.tsx` (749L)

**Nota**: Questo componente è usato da RoleHierarchy (già refactored), quindi particolare attenzione alla compatibilità.

**Analisi Preventiva** (Day 0 - 2 ore):
- [ ] Read file completo (749 linee)
- [ ] Verificare integration con RoleHierarchy.tsx (già refactored)
- [ ] Identificare tree rendering logic (recursive components)
- [ ] Mappare drag-drop functionality
- [ ] Identificare node operations (expand, collapse, select, edit)
- [ ] Creare documento di extraction strategy

**Extraction Strategy** (stimata):
```
HierarchyTreeView/
├── types.ts (120L)
│   ├── HierarchyTreeProps
│   ├── TreeNode
│   ├── DragDropState
│   └── NodeOperation
├── hooks/
│   ├── useTreeData.ts (100L) - Data loading, normalization
│   ├── useTreeState.ts (90L) - Expansion, selection state
│   ├── useDragDrop.ts (110L) - Drag-drop logic
│   └── useNodeOperations.ts (80L) - CRUD on nodes
├── components/
│   ├── TreeNode.tsx (120L) - Single node rendering (recursive)
│   ├── NodeActions.tsx (70L) - Action buttons per node
│   ├── DragPreview.tsx (60L) - Drag preview overlay
│   └── TreeContainer.tsx (80L) - Tree wrapper, scrolling
├── utils/
│   ├── treeHelpers.ts (90L) - Tree traversal, search, flatten
│   └── dragDropHelpers.ts (60L) - Drop validation, move logic
└── HierarchyTreeView.tsx (240L) - Main orchestrator
```

**Execution**: Same pattern as Phase 3.6 (5 days)

**Success Criteria**:
- [ ] Main component: 749L → ~240L (-68%)
- [ ] Compatibility con RoleHierarchy maintained ✅
- [ ] Drag-drop functionality preserved
- [ ] TypeScript: 0 errors
- [ ] Build: PASSED
- [ ] Breaking changes: 0

---

### **Phase 3.8: God Components - Completion Report** (1 giorno)

**Day 1: Final Report + Celebration** 🎉
- [ ] Creare `26_phase3_god_components_completion.md`
- [ ] Metrics completi:
  - Total lines reduced: 5,895L → 1,621L (-72.5% avg)
  - Files created: ~75 modular files
  - Avg reduction: 72.5%
  - Build success: 100%
  - Breaking changes: 0
- [ ] Before/After comparisons
- [ ] Lessons learned
- [ ] Best practices documented
- [ ] Pattern library per future components
- [ ] Update progress_summary.md (36% → 40%)
- [ ] Git commit celebration

---

## 🗂️ PHASE 4: Prisma Schema Perfection (2 settimane)

**Obiettivo**: Schema Prisma perfettamente allineato, zero inconsistenze, GDPR compliant

### **Week 1: Schema Audit & Standardization**

**Day 1-2: Comprehensive Schema Analysis** (8 ore)
- [ ] Read `backend/prisma/schema.prisma` completo (1,972 linee)
- [ ] Audit tutti i 52 models:
  - [ ] Verify relations consistency (M2M vs direct)
  - [ ] Check index usage (@@index declarations)
  - [ ] Verify soft delete implementation (`deletedAt`, `isDeleted`)
  - [ ] Check tenantId presence e index su TUTTI i models tenant-scoped
  - [ ] Verify enum usage vs string (TemplateType, PreventivoStato, etc.)
  - [ ] Check required vs optional fields consistency
  - [ ] Verify onDelete/onUpdate cascade rules
- [ ] Create `27_prisma_schema_audit.md` con findings completi

**Day 3: Preventivo Dual Relation Fix** 🔴 HIGH PRIORITY (4 ore)
- [ ] Audit Preventivo model relations:
  ```prisma
  // CURRENT: Mixed pattern
  persons Person[] // M2M via PreventivoPersons pivot
  companies Company[] // M2M via PreventivoCompanies pivot
  schedules CourseSchedule[] // Direct relation
  ```
- [ ] Decision: Standardize to ONE pattern (consigliato: M2M con pivot tables)
- [ ] Create migration script
- [ ] Update all queries in `preventivi-service.js`
- [ ] Test extensively in staging

**Day 4: Enum Standardization** (4 ore)
- [ ] Convert string types to Prisma enums:
  ```prisma
  enum TemplateType {
    EMPLOYEE
    COMPANY
    COURSE
    SCHEDULE
    // ...
  }
  
  enum PreventivoStato {
    BOZZA
    INVIATO
    APPROVATO
    RIFIUTATO
  }
  ```
- [ ] Create migration
- [ ] Update service layer per enum usage
- [ ] Test

**Day 5: Index Optimization** (4 ore)
- [ ] Add missing indexes:
  ```prisma
  // Esempio: Person model
  @@index([tenantId, deletedAt])
  @@index([tenantId, email])
  @@index([tenantId, codiceFiscale])
  @@index([companyId, tenantId])
  ```
- [ ] Verify compound indexes su tutte le query frequenti
- [ ] Create migration
- [ ] Benchmark before/after
- [ ] Deploy to staging

### **Week 2: GDPR Compliance & Data Integrity**

**Day 1: GDPR Audit Completo** (6 ore)
- [ ] Verify password field exclusion su TUTTI i models:
  ```prisma
  model User {
    password String // ⚠️ Must NEVER be in select queries
  }
  ```
- [ ] Audit deletedAt implementation:
  - [ ] All models hanno deletedAt?
  - [ ] Soft delete queries usano `where: { deletedAt: null }`?
  - [ ] Hard delete è mai usato? (dovrebbe essere RARO)
- [ ] Verify anonymization fields (Person model):
  ```prisma
  anonymized Boolean @default(false)
  anonymizedAt DateTime?
  ```
- [ ] Check audit trail completeness (AuditLog model)
- [ ] Create `28_gdpr_compliance_final_audit.md`

**Day 2: Data Anonymization Script** (4 ore)
- [ ] Create `backend/scripts/gdpr-anonymize-person.js`:
  - [ ] Anonymize PII fields (nome, cognome, email, telefono, etc.)
  - [ ] Preserve statistical data
  - [ ] Update `anonymized` flag
  - [ ] Create audit log entry
  - [ ] Test on staging data
- [ ] Document script usage in docs/technical/gdpr/

**Day 3: Cascade Rules Review** (4 ore)
- [ ] Review ALL onDelete/onUpdate rules:
  ```prisma
  // Example corrections
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  ```
- [ ] Rules:
  - Tenant deletion: `Restrict` (cannot delete tenant with data)
  - Soft deletes: Use `SetNull` or keep relation (soft delete handles it)
  - Hard deletes: Carefully design cascade behavior
- [ ] Create migration if changes needed
- [ ] Test cascade behavior thoroughly

**Day 4: Schema Documentation** (4 ore)
- [ ] Create `docs/technical/database/prisma-schema-guide.md`:
  - [ ] Model-by-model documentation
  - [ ] Relation explanations
  - [ ] Index rationale
  - [ ] GDPR compliance notes
  - [ ] Migration history
- [ ] Generate ERD diagram (prisma-erd-generator)
- [ ] Add to docs/technical/architecture/

**Day 5: Migration Safety + Deployment** (6 ore)
- [ ] Review ALL migrations created:
  - [ ] Backup strategy in place
  - [ ] Rollback plan documented
  - [ ] Data migration scripts tested
- [ ] Deploy to staging:
  - [ ] Run migrations
  - [ ] Verify data integrity
  - [ ] Run test suite
  - [ ] Manual QA critical paths
- [ ] Deploy to production (if staging OK):
  - [ ] Backup database
  - [ ] Run migrations with monitoring
  - [ ] Verify application health
  - [ ] Monitor for 24 hours
- [ ] Update progress_summary.md (40% → 45%)

---

## 📚 PHASE 5: Backend Code Alignment (2 settimane)

**Obiettivo**: Tutto il codice backend perfettamente allineato al Prisma schema

### **Week 1: Service Layer Alignment**

**Day 1-2: Query Audit Completo** (10 ore)
- [ ] Audit OGNI query Prisma nei 52 services:
  - [ ] Verify relations match schema
  - [ ] Check `include` statements align with relations
  - [ ] Verify `select` excludes password
  - [ ] Check tenantId filtering consistency
  - [ ] Verify soft delete `where: { deletedAt: null }`
  - [ ] Check enum usage (if converted in Phase 4)
- [ ] Create `29_backend_query_audit.md` con findings
- [ ] List di queries da correggere

**Day 3-4: Service Corrections** (12 ore)
- [ ] Fix queries one by one:
  - [ ] Person-related services (person/, personService.js)
  - [ ] Company services (company/, companyService.js)
  - [ ] Course services (courses.js, courseService.js)
  - [ ] Schedule services (schedules.js, scheduleService.js)
  - [ ] Document services (documentService.js)
  - [ ] GDPR services (gdprService.js)
  - [ ] Preventivi services (preventivi-service.js)
- [ ] Test dopo ogni correzione
- [ ] Git commit incrementali per tracciare changes

**Day 5: Middleware Alignment** (4 ore)
- [ ] Verify auth middleware usa Prisma schema correttamente
- [ ] Verify RBAC middleware queries align
- [ ] Verify tenant middleware filtering align
- [ ] Test middleware stack completo

### **Week 2: Routes & Integration Testing**

**Day 1-2: Routes Alignment** (10 ore)
- [ ] Audit 32+ route files:
  - [ ] Verify request validation matches Prisma types
  - [ ] Check response shaping excludes sensitive data
  - [ ] Verify error handling consistency
- [ ] Fix route handlers
- [ ] Test con Postman/REST client

**Day 3-4: Integration Testing** (12 ore)
- [ ] Create integration tests per domain:
  - [ ] Person CRUD tests
  - [ ] Company CRUD tests
  - [ ] Course CRUD tests
  - [ ] Schedule CRUD tests
  - [ ] Document upload/download tests
  - [ ] GDPR export/deletion tests
- [ ] Target: 70%+ integration test coverage
- [ ] Run test suite: `npm test`

**Day 5: Performance Testing** (6 ore)
- [ ] Benchmark query performance:
  - [ ] Measure query times before/after index optimization
  - [ ] Identify N+1 query problems
  - [ ] Optimize slow queries
- [ ] Load testing critical endpoints
- [ ] Document performance improvements
- [ ] Update progress_summary.md (45% → 55%)

---

## 🎨 PHASE 6: Frontend Code Cleanup (1 settimana)

**Obiettivo**: Codice frontend pulito, consistente, zero duplicazioni

### **Day 1-2: Dead Code Elimination** (8 ore)
- [ ] Run ESLint con `no-unused-vars` strict
- [ ] Identify unused imports:
  ```bash
  npx ts-prune | grep -v "(used in module)"
  ```
- [ ] Remove unused components (verify with grep)
- [ ] Remove unused utilities
- [ ] Clean up console.log statements
- [ ] Remove commented code blocks
- [ ] Git commit: "chore: Remove dead code from frontend"

### **Day 3: Import Consolidation** (4 ore)
- [ ] Standardize import order (ESLint rule `import/order`)
- [ ] Use index.ts barrel exports:
  ```typescript
  // Good: components/shared/index.ts
  export * from './Button';
  export * from './Modal';
  // Then: import { Button, Modal } from '@/components/shared';
  ```
- [ ] Remove relative import hell (`../../../`)
- [ ] Use path aliases configured in tsconfig.json

**Day 4: Shared Components Organization** (6 ore)
- [ ] Restructure `components/shared/`:
  ```
  shared/
  ├── ui/          # Pure UI components (Button, Modal, Input)
  ├── business/    # Business logic components (UserCard, RoleSelector)
  ├── templates/   # Template components (DocumentTemplate, FormTemplate)
  ├── modals/      # Modal components (ImportModal, ConfirmModal)
  └── tables/      # Table components (ResizableTable, SortableTable)
  ```
- [ ] Move components to appropriate folders
- [ ] Update all imports
- [ ] Test application still works

**Day 5: Style Consistency** (4 ore)
- [ ] Audit Tailwind usage (no inline style attributes)
- [ ] Create design system tokens:
  ```typescript
  // design-system/tokens.ts
  export const colors = {
    primary: 'blue-600',
    secondary: 'gray-600',
    danger: 'red-600',
  };
  ```
- [ ] Consistent spacing (use design system)
- [ ] Consistent typography
- [ ] Update progress_summary.md (55% → 60%)

---

## 📖 PHASE 7: Documentation Complete Update (2 settimane)

**Obiettivo**: Documentazione 100% aggiornata, completa, accurata

### **Week 1: Technical Documentation**

**Day 1: Architecture Documentation** (6 ore)
- [ ] Update `docs/technical/architecture/`:
  - [ ] `system-overview.md` - High-level architecture
  - [ ] `backend-architecture.md` - Backend structure
  - [ ] `frontend-architecture.md` - Frontend structure
  - [ ] `database-schema.md` - Prisma schema docs (link to Phase 4)
  - [ ] `security-model.md` - Auth, RBAC, tenant isolation
- [ ] Generate updated diagrams (mermaid or draw.io)
- [ ] Include code examples

**Day 2: API Documentation** (6 ore)
- [ ] Update `docs/technical/api/`:
  - [ ] `authentication.md` - Auth endpoints
  - [ ] `persons.md` - Person endpoints
  - [ ] `companies.md` - Company endpoints
  - [ ] `courses.md` - Course endpoints
  - [ ] `schedules.md` - Schedule endpoints
  - [ ] `documents.md` - Document endpoints
  - [ ] `gdpr.md` - GDPR endpoints
- [ ] OpenAPI/Swagger spec (if not exists, create)
- [ ] Example requests/responses

**Day 3: Component Documentation** (6 ore)
- [ ] Create `docs/technical/components/`:
  - [ ] `component-library.md` - Catalog of all components
  - [ ] `design-system.md` - Design tokens, patterns
  - [ ] `form-components.md` - Form patterns
  - [ ] `table-components.md` - Table patterns
  - [ ] `modal-patterns.md` - Modal best practices
- [ ] Storybook setup (optional, future)

**Day 4: GDPR Documentation** (6 ore)
- [ ] Update `docs/technical/gdpr/`:
  - [ ] `compliance-checklist.md` - Verification checklist
  - [ ] `data-retention.md` - Retention policies
  - [ ] `anonymization.md` - Anonymization procedures
  - [ ] `export-procedures.md` - Data export process
  - [ ] `deletion-procedures.md` - Deletion process
  - [ ] `audit-trail.md` - Audit logging
- [ ] Include script documentation from Phase 4

**Day 5: Database Documentation** (6 ore)
- [ ] Update `docs/technical/database/`:
  - [ ] `prisma-schema-guide.md` (from Phase 4)
  - [ ] `migrations-guide.md` - How to create/run migrations
  - [ ] `query-optimization.md` - Best practices
  - [ ] `backup-restore.md` - Procedures
  - [ ] `seeding.md` - Test data seeding
- [ ] ERD diagram (from Phase 4)

### **Week 2: Deployment, Testing & User Docs**

**Day 1: Deployment Documentation** (6 ore)
- [ ] Update `docs/deployment/`:
  - [ ] `production-setup.md` - Production environment setup
  - [ ] `staging-setup.md` - Staging environment
  - [ ] `local-development.md` - Developer setup
  - [ ] `environment-variables.md` - Complete list
  - [ ] `docker-deployment.md` - Docker compose guide
  - [ ] `monitoring.md` - Logging, metrics, alerts
- [ ] Verify all instructions work (test on fresh environment)

**Day 2: Testing Documentation** (6 ore)
- [ ] Create `docs/testing/`:
  - [ ] `testing-strategy.md` - Overall approach
  - [ ] `unit-testing.md` - Unit test guidelines
  - [ ] `integration-testing.md` - Integration test patterns
  - [ ] `e2e-testing.md` - E2E test setup (Playwright)
  - [ ] `test-data.md` - Test data management
  - [ ] `coverage-requirements.md` - Coverage targets
- [ ] Include examples from Phase 5

**Day 3: Troubleshooting Guide** (6 ore)
- [ ] Update `docs/troubleshooting/`:
  - [ ] `common-errors.md` - FAQ solutions
  - [ ] `debugging-guide.md` - How to debug
  - [ ] `performance-issues.md` - Performance troubleshooting
  - [ ] `database-issues.md` - DB troubleshooting
  - [ ] `deployment-issues.md` - Deploy troubleshooting
  - [ ] `known-issues.md` - Known bugs/workarounds

**Day 4: User Documentation** (6 ore)
- [ ] Update `docs/user/`:
  - [ ] `getting-started.md` - Onboarding
  - [ ] `person-management.md` - How to manage persons
  - [ ] `company-management.md` - How to manage companies
  - [ ] `course-management.md` - How to manage courses
  - [ ] `schedule-management.md` - How to manage schedules
  - [ ] `document-management.md` - How to manage documents
  - [ ] `gdpr-requests.md` - How to handle GDPR requests
- [ ] Screenshots updated

**Day 5: Final Polish** (6 ore)
- [ ] Spell check all documentation
- [ ] Verify all links work (no 404s)
- [ ] Consistent formatting (Markdown linting)
- [ ] Add table of contents where needed
- [ ] PDF exports for key documents (optional)
- [ ] Update CHANGELOG.md with all changes
- [ ] Update progress_summary.md (60% → 75%)

---

## 🤖 PHASE 8: TRAE Guides Update (1 settimana)

**Obiettivo**: AI Assistant ha conoscenza perfetta e completa del progetto

### **Day 1-2: TRAE_SYSTEM_GUIDE.md Update** (12 ore)

**Section 1: Project Overview** (2 ore)
- [ ] Update architecture description
- [ ] Add refactoring achievements (God Components → modular)
- [ ] Include new folder structure
- [ ] Reference updated docs/technical/

**Section 2: Known Issues & Solutions** (3 ore)
- [ ] Document risolti HIGH issues (CSRF, rate limiting, test routes)
- [ ] Document Preventivo dual relation resolution (Phase 4)
- [ ] Document PDF browser pool implementation (Phase 2)
- [ ] Add troubleshooting per issue ricorrenti

**Section 3: Best Practices** (3 ore)
- [ ] Component size limits (max 500L, enforce ESLint rule)
- [ ] State management patterns (hooks composition)
- [ ] Prisma query patterns:
  ```typescript
  // Always exclude password
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      // password: NEVER include this
    }
  });
  
  // Always filter by tenantId
  const persons = await prisma.person.findMany({
    where: {
      tenantId,
      deletedAt: null, // Soft delete filter
    }
  });
  ```
- [ ] Error handling patterns
- [ ] Testing patterns (from Phase 5)

**Section 4: Code Examples** (2 ore)
- [ ] Refactored component example (use RoleModal or GenericImport)
- [ ] Service pattern example (use person/ modular structure)
- [ ] Prisma query examples (all patterns)
- [ ] GDPR compliance examples (anonymization, export)

**Section 5: Quick Reference** (2 ore)
- [ ] Folder structure complete
- [ ] Command cheat sheet:
  ```bash
  # Build
  npm run build
  
  # Test
  npm test
  npm run test:integration
  npm run test:e2e
  
  # Prisma
  npx prisma generate
  npx prisma migrate dev
  npx prisma studio
  
  # Linting
  npm run lint
  npm run lint:fix
  ```
- [ ] Common tasks guide (create component, create service, etc.)

### **Day 3-4: project_rules.md Update** (12 ore)

**Section 1: Coding Standards** (3 ore)
- [ ] TypeScript strict mode (enabled)
- [ ] ESLint rules:
  ```javascript
  // .eslintrc.js additions
  rules: {
    'max-lines': ['error', { max: 500, skipBlankLines: true }],
    'complexity': ['error', 15],
    'max-depth': ['error', 4],
    'no-console': ['warn', { allow: ['error', 'warn'] }],
  }
  ```
- [ ] Naming conventions:
  - Components: PascalCase
  - Files: kebab-case o PascalCase (components)
  - Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
- [ ] Import order standardized
- [ ] Code formatting (Prettier config)

**Section 2: Component Guidelines** (3 ore)
- [ ] Size limits (max 500L)
- [ ] Hooks composition pattern (documented with examples)
- [ ] Props naming conventions
- [ ] Event handler naming (`handleClick`, `onSubmit`)
- [ ] State management (local vs context vs global)
- [ ] Performance considerations (React.memo, useMemo, useCallback)

**Section 3: Backend Guidelines** (3 ore)
- [ ] Service structure (follow person/ modular pattern)
- [ ] Prisma query patterns (tenantId, soft delete, password exclusion)
- [ ] Error handling (use HttpException, proper status codes)
- [ ] Middleware order (auth → rbac → tenant → route)
- [ ] API response format:
  ```typescript
  {
    success: boolean,
    data?: any,
    error?: string,
    meta?: { page, total, limit }
  }
  ```

**Section 4: Security Rules** (3 ore)
- [ ] Authentication required (no bypasses)
- [ ] RBAC enforcement (permission checks mandatory)
- [ ] Tenant isolation (ALWAYS filter by tenantId)
- [ ] GDPR compliance checklist:
  - [ ] Password NEVER in responses
  - [ ] PII encrypted at rest (if applicable)
  - [ ] Audit trail for data access
  - [ ] Soft delete implemented
  - [ ] Anonymization supported
  - [ ] Export functionality
  - [ ] Deletion functionality
- [ ] Rate limiting on all public endpoints
- [ ] CSRF protection on mutation endpoints
- [ ] Input validation (Zod schemas)
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (sanitize user input)

### **Day 5: Testing & Validation** (6 ore)

**TRAE Guide Testing**:
- [ ] Test TRAE_SYSTEM_GUIDE with sample queries:
  - "How do I create a new service?"
  - "What's the Prisma query pattern for soft deletes?"
  - "How do I refactor a large component?"
  - "How do I ensure GDPR compliance?"
- [ ] Verify responses are accurate
- [ ] Update guide if gaps found

**project_rules Testing**:
- [ ] Verify ESLint rules enforce project_rules
- [ ] Test on sample code
- [ ] Create pre-commit hooks:
  ```json
  // package.json
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{md,json}": ["prettier --write"]
  }
  ```

**Final Validation**:
- [ ] All documentation cross-referenced (no broken links)
- [ ] Examples tested (copy-paste and run)
- [ ] Glossary complete (technical terms defined)
- [ ] Update progress_summary.md (75% → 85%)
- [ ] Git commit: "docs: Complete TRAE guides update (Phase 8)"

---

## ✅ PHASE 9: Final Validation & Deployment (1 settimana)

**Obiettivo**: Sistema perfetto, testato, deployato

### **Day 1: Comprehensive Testing** (8 ore)

**Unit Tests**:
- [ ] Run full test suite: `npm test`
- [ ] Verify coverage: `npm run test:coverage`
- [ ] Target: 85%+ coverage on business logic
- [ ] Fix failing tests

**Integration Tests**:
- [ ] Run integration tests: `npm run test:integration`
- [ ] Test all API endpoints
- [ ] Test database operations
- [ ] Test GDPR workflows

**E2E Tests**:
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Test critical user workflows:
  - Login/logout
  - Person CRUD
  - Company CRUD
  - Course scheduling
  - Document upload/download
  - GDPR export/deletion
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)

### **Day 2: Performance Validation** (6 ore)

**Load Testing**:
- [ ] Use k6 or Artillery for load testing
- [ ] Test critical endpoints under load:
  - Login (100 concurrent users)
  - List queries (500 concurrent)
  - Document upload (50 concurrent)
  - PDF generation (20 concurrent with browser pool)
- [ ] Verify response times within SLA

**Database Performance**:
- [ ] Query analysis with Prisma logs
- [ ] Identify slow queries (>100ms)
- [ ] Verify indexes are used (EXPLAIN ANALYZE)
- [ ] Optimize if needed

**Frontend Performance**:
- [ ] Lighthouse audit (target: 90+ score)
- [ ] Bundle size analysis: `npm run build -- --analyze`
- [ ] Verify code splitting works
- [ ] Check for large dependencies

### **Day 3: Security Audit** (6 ore)

**Automated Scanning**:
- [ ] Run npm audit: `npm audit`
- [ ] Fix high/critical vulnerabilities
- [ ] Run Snyk scan (if available)

**Manual Security Review**:
- [ ] Verify CSRF protection on all mutation endpoints
- [ ] Verify rate limiting on all public endpoints
- [ ] Verify authentication on all protected routes
- [ ] Verify RBAC checks on all sensitive operations
- [ ] Verify tenant isolation (no cross-tenant data leaks)
- [ ] Verify password handling (never logged, never in responses)
- [ ] Verify input validation (all user inputs)

**GDPR Compliance Final Check**:
- [ ] Password exclusion verified in ALL queries
- [ ] Soft delete implemented everywhere
- [ ] Audit trail complete
- [ ] Export functionality tested
- [ ] Deletion functionality tested
- [ ] Anonymization tested
- [ ] Data retention policies documented

### **Day 4: Staging Deployment** (6 ore)

**Pre-Deployment**:
- [ ] Backup production database
- [ ] Review all migrations to apply
- [ ] Create rollback plan
- [ ] Schedule deployment window

**Deployment to Staging**:
- [ ] Deploy backend:
  ```bash
  git pull origin main
  npm install
  npx prisma migrate deploy
  npm run build
  pm2 restart all
  ```
- [ ] Deploy frontend:
  ```bash
  npm install
  npm run build
  rsync -avz dist/ /var/www/html/
  ```
- [ ] Run smoke tests
- [ ] Monitor logs for errors

**Staging Validation**:
- [ ] Test all critical workflows manually
- [ ] Run automated test suite in staging
- [ ] Performance testing in staging
- [ ] Security testing in staging
- [ ] Get stakeholder approval

### **Day 5: Production Deployment** (6 ore)

**Production Deployment** (assuming staging success):
- [ ] Backup production database
- [ ] Enable maintenance mode (optional)
- [ ] Deploy backend (same steps as staging)
- [ ] Deploy frontend (same steps as staging)
- [ ] Run database migrations
- [ ] Disable maintenance mode
- [ ] Monitor application health

**Post-Deployment Monitoring**:
- [ ] Monitor error logs (24 hours)
- [ ] Monitor performance metrics
- [ ] Monitor database queries
- [ ] Monitor user reports
- [ ] Be ready to rollback if issues

**Final Celebration** 🎉:
- [ ] Update progress_summary.md (85% → 100%)
- [ ] Create final completion report: `30_project_completion_report.md`
- [ ] Team retrospective
- [ ] Celebrate success!

---

## 📊 METRICHE DI SUCCESSO

### Quality Metrics (Target vs Actual)

| Metric | Before | Target | Current | Status |
|--------|--------|--------|---------|--------|
| Overall Quality Score | 8.1/10 | 9.0/10 | 8.8/10 | 🟢 78% |
| Max File Size | 986L | 500L | 748L | 🟡 49% |
| God Components | 8 | 0 | 3 | 🟢 63% |
| Dead Code Files | 2 | 0 | 0 | ✅ 100% |
| Security Issues (HIGH) | 6 | 0 | 0 | ✅ 100% |
| Backend Score | 8.4/10 | 9.2/10 | 8.4/10 | 🔴 0% |
| Frontend Score | TBD | 8.5/10 | TBD | ⏳ |
| Test Coverage | ~60% | 85% | ~60% | 🔴 0% |

### Progress by Phase

| Phase | Status | Progress | ETA |
|-------|--------|----------|-----|
| Phase 1: Quick Wins | ✅ | 100% | Completato |
| Phase 2.1: Prisma Indexes | ✅ | 100% | Completato |
| Phase 3: God Components | 🔄 | 63% | 2 settimane |
| Phase 4: Prisma Perfection | 📋 | 0% | 2 settimane |
| Phase 5: Backend Alignment | 📋 | 0% | 2 settimane |
| Phase 6: Frontend Cleanup | 📋 | 0% | 1 settimana |
| Phase 7: Documentation | 📋 | 0% | 2 settimane |
| Phase 8: TRAE Guides | 📋 | 0% | 1 settimana |
| Phase 9: Validation | 📋 | 0% | 1 settimana |
| **TOTAL** | 🔄 | **36%** | **11 settimane rimanenti** |

---

## ⏰ TIMELINE DETTAGLIATO

### Already Completed (10 Nov 2025)
- Week 0: Phases 1, 2.1, 3.1-3.5 ✅

### Remaining Timeline
- **Week 1-2**: Phase 3.6-3.8 (DocumentManager, HierarchyTreeView, Completion)
- **Week 3-4**: Phase 4 (Prisma Schema Perfection)
- **Week 5-6**: Phase 5 (Backend Code Alignment)
- **Week 7**: Phase 6 (Frontend Cleanup)
- **Week 8-9**: Phase 7 (Documentation Complete)
- **Week 10**: Phase 8 (TRAE Guides Update)
- **Week 11**: Phase 9 (Final Validation & Deployment)

**Total Time**: 11 settimane rimanenti (fino a fine Gennaio 2026)

---

## 🎯 PROSSIMI STEP IMMEDIATI (Questa Settimana)

### Day 1 (Lunedì): Phase 3.6 Start - DocumentManager Analysis
- [ ] ☑️ Read DocumentManager.tsx completo (761L) - 2 ore
- [ ] ☑️ Creare extraction strategy document - 1 ora
- [ ] ☑️ Creare folder structure + types.ts - 2 ore
- [ ] ☑️ Iniziare utils layer - 2 ore

### Day 2 (Martedì): Phase 3.6 - Hooks Layer
- [ ] ☑️ Estrarre useDocumentData.ts - 2 ore
- [ ] ☑️ Estrarre useDocumentUpload.ts - 2 ore
- [ ] ☑️ Estrarre useDocumentActions.ts - 2 ore
- [ ] ☑️ Test hooks isolation - 1 ora

### Day 3 (Mercoledì): Phase 3.6 - Components Layer
- [ ] ☑️ Estrarre DocumentList.tsx - 2 ore
- [ ] ☑️ Estrarre DocumentUploadZone.tsx - 2 ore
- [ ] ☑️ Estrarre DocumentPreview.tsx - 1.5 ore
- [ ] ☑️ Estrarre DocumentFilters.tsx - 1.5 ore

### Day 4 (Giovedì): Phase 3.6 - Main Refactor + Build
- [ ] ☑️ Creare DocumentManager.tsx refactored - 2 ore
- [ ] ☑️ Integration testing - 2 ore
- [ ] ☑️ Build test + TypeScript check - 1 ora
- [ ] ☑️ Manual testing (8 test cases) - 2 ore

### Day 5 (Venerdì): Phase 3.6 - Commit + Start 3.7
- [ ] ☑️ Final validation DocumentManager - 1 ora
- [ ] ☑️ Git commit with metrics - 30 min
- [ ] ☑️ Update progress_summary.md - 30 min
- [ ] ☑️ Start HierarchyTreeView analysis - 4 ore

---

## ✅ CHECKLIST QUALITÀ

Ogni fase deve passare questi controlli prima del commit:

### Build & Compilation
- [ ] `npm run build` - PASSED ✅
- [ ] TypeScript errors: 0 ✅
- [ ] ESLint errors: 0 ✅
- [ ] Build time: <30s (or not significantly increased)

### Testing
- [ ] Unit tests: PASSED ✅
- [ ] Integration tests: PASSED ✅
- [ ] Manual test cases: ALL PASSED ✅
- [ ] Regression check: No breaking changes ✅

### Code Quality
- [ ] Max file size: <500L ✅
- [ ] Module avg size: <120L ✅
- [ ] No console.log in production code ✅
- [ ] No commented code blocks ✅
- [ ] All imports used ✅

### Documentation
- [ ] Code comments where needed ✅
- [ ] README.md created (if major component) ✅
- [ ] Types documented (JSDoc comments) ✅
- [ ] progress_summary.md updated ✅

### Git Hygiene
- [ ] Commit message descriptive ✅
- [ ] Metrics included in commit ✅
- [ ] No unrelated changes in commit ✅
- [ ] Branch up-to-date with main ✅

### GDPR & Security
- [ ] No password in responses ✅
- [ ] No PII in logs ✅
- [ ] Tenant isolation preserved ✅
- [ ] Soft delete used (not hard delete) ✅

---

## 🚨 REGOLE FONDAMENTALI (NON VIOLARE MAI)

### Security Rules 🔒
1. **GDPR Compliance**: Password field NEVER in SELECT queries
2. **Tenant Isolation**: SEMPRE filtrare per tenantId
3. **Soft Delete**: Usare deletedAt, non hard delete (tranne casi eccezionali)
4. **Authentication**: Nessun bypass dei controlli di autenticazione
5. **RBAC**: Permission checks obbligatori su operazioni sensibili
6. **Rate Limiting**: Tutti gli endpoint pubblici devono averlo
7. **CSRF Protection**: Tutti gli endpoint di mutazione devono averlo

### Code Quality Rules 📏
1. **Component Size**: Max 500 linee per file (ESLint rule enforced)
2. **Complexity**: Max complexity 15 (ESLint rule)
3. **Depth**: Max nesting depth 4 (ESLint rule)
4. **No Breaking Changes**: Ogni refactor deve essere backward compatible
5. **Test Before Refactor**: Write/run tests BEFORE refactoring
6. **Incremental Commits**: Commit often, commit small

### Process Rules 📋
1. **Analysis First**: Sempre analizzare prima di iniziare refactoring
2. **Backup Always**: Creare backup prima di modifiche significative
3. **Build Test**: Testare build DOPO ogni modifica
4. **Manual Testing**: Test manuali per workflow critici
5. **Documentation**: Documentare MENTRE si lavora, non dopo
6. **Progress Updates**: Aggiornare progress_summary.md ad ogni milestone

---

## 📞 SUPPORT & ESCALATION

### Per Domande Tecniche
- Consultare TRAE_SYSTEM_GUIDE.md (aggiornato in Phase 8)
- Consultare docs/technical/ (aggiornato in Phase 7)
- Consultare project_rules.md (aggiornato in Phase 8)

### Per Decisioni Architetturali
- Documentare la decisione in docs/technical/architecture/
- Includere rationale e alternative considerate
- Get stakeholder approval se impatto significativo

### Per Blockers
- Documentare il blocker
- Cercare workaround
- Escalate se blocca progresso

---

**Prepared by**: GitHub Copilot (TRAE AI)  
**Date**: 10 Novembre 2025  
**Version**: 1.0  
**Status**: ✅ READY FOR EXECUTION  
**Next Action**: Phase 3.6 - DocumentManager Refactoring (Start Monday)

---

*Questo piano è vivo e verrà aggiornato man mano che procediamo. Ogni fase completata sarà marcata ✅ e le metriche aggiornate.*
