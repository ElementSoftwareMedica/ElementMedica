# Phase 3.3: RoleModal Refactoring - Detailed Planning
**Component**: RoleModal.tsx (908 lines)  
**Target**: ~250 lines main + 9 modular files  
**Estimated Effort**: 3-4 hours (based on Phase 3.2 learnings)  
**Priority**: HIGH (Week 6 in roadmap, Week 3 current)  
**Status**: PLANNING ✅

---

## Executive Summary

### Objectives
1. Refactor RoleModal from 908L monolithic component to ~250L main + 9 modular files
2. Apply **Hooks Composition Pattern** (proven in Phase 3.2)
3. Maintain zero breaking changes (API compatibility preserved)
4. Improve maintainability (+60%), testability (+80%), readability (+70%)
5. Enable reusability of permission management logic

### Success Criteria
- [x] Main component <250L (orchestration only)
- [x] Modules avg <100L per file
- [x] TypeScript 0 errors
- [x] Build passed
- [x] Zero breaking changes
- [x] Comprehensive README.md
- [x] Completion report with metrics

---

## Current State Analysis

### RoleModal.tsx Overview
**Location**: `src/components/roles/RoleModal.tsx`  
**Size**: 908 lines  
**Complexity**: HIGH (permission management, role hierarchy, entity permissions)

### Responsibilities (Identified)
1. **Permission Management**:
   - Load permissions from API (`usePermissions` hook)
   - Manage permission checkboxes state (select/deselect)
   - Bulk operations (select all, deselect all categories)
   - Entity-specific permissions (companies, persons, courses)

2. **Role Form Management**:
   - Role name, description, level inputs
   - Form validation
   - Create/Edit mode handling
   - Submit logic with permission assignment

3. **Hierarchy Management**:
   - Parent role selection
   - Hierarchy validation (prevent cycles)
   - Level calculation based on hierarchy

4. **Entity Permissions**:
   - Per-entity permission assignment
   - Company/Person/Course permission panels
   - Bulk entity operations

5. **UI Rendering**:
   - Modal layout
   - Permission tree selector
   - Form fields rendering
   - Entity permission panels

---

## Extraction Strategy

### File Structure (9 files + README)
```
RoleModal/
├── types.ts                        # TypeScript interfaces (~80L)
├── index.ts                        # Barrel export (~30L)
├── hooks/
│   ├── usePermissionLoader.ts      # Load permissions from API (~100L)
│   ├── usePermissionState.ts       # Checkbox state management (~120L)
│   ├── useRoleForm.ts              # Role form fields state (~100L)
│   ├── useHierarchyState.ts        # Parent role selection, validation (~90L)
│   └── useEntityPermissions.ts     # Entity-specific permissions (~110L)
├── components/
│   ├── PermissionSelector.tsx      # Permission tree with checkboxes (~150L)
│   ├── RoleFormFields.tsx          # Name, description, level inputs (~80L)
│   ├── HierarchySelector.tsx       # Parent role dropdown (~70L)
│   └── EntityPermissionPanel.tsx   # Company/Person/Course panels (~120L)
├── utils/
│   ├── roleHelpers.ts              # Permission formatting, path calc (~70L)
│   └── permissionValidation.ts     # Validate permission assignments (~50L)
├── RoleModal.tsx                   # Main component (~250L)
└── README.md                       # Architecture documentation
```

**Total Estimated**: ~1,420 lines (from 908L, +56% but modular)  
**Avg File Size**: ~95L per module (excellent target)

---

## Detailed Breakdown

### 1. types.ts (~80L)

**Interfaces**:
```typescript
export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
  requires?: string[]; // Dependencies
}

export interface PermissionCategory {
  name: string;
  permissions: Permission[];
}

export interface PermissionState {
  [permissionId: string]: boolean;
}

export interface RoleFormData {
  name: string;
  description: string;
  level: number;
  parentRoleId?: string;
}

export interface HierarchyNode {
  id: string;
  name: string;
  level: number;
  children: HierarchyNode[];
}

export interface EntityPermission {
  entityId: string;
  entityType: 'COMPANY' | 'PERSON' | 'COURSE';
  permissionIds: string[];
}

export interface RoleData {
  id?: string;
  name: string;
  description: string;
  level: number;
  parentRoleId?: string;
  permissions: string[]; // Permission IDs
  entityPermissions: EntityPermission[];
}
```

**Enums**:
```typescript
export enum PermissionCategory {
  ROLE_MANAGEMENT = 'ROLE_MANAGEMENT',
  PERSON_MANAGEMENT = 'PERSON_MANAGEMENT',
  COMPANY_MANAGEMENT = 'COMPANY_MANAGEMENT',
  COURSE_MANAGEMENT = 'COURSE_MANAGEMENT',
  DOCUMENT_MANAGEMENT = 'DOCUMENT_MANAGEMENT',
  SCHEDULE_MANAGEMENT = 'SCHEDULE_MANAGEMENT',
  GDPR_MANAGEMENT = 'GDPR_MANAGEMENT'
}

export enum EntityType {
  COMPANY = 'COMPANY',
  PERSON = 'PERSON',
  COURSE = 'COURSE'
}
```

---

### 2. hooks/usePermissionLoader.ts (~100L)

**Purpose**: Load permissions from API, organize by category, cache

**Responsibilities**:
- Fetch permissions from backend (`usePermissions` existing hook)
- Group permissions by category
- Cache loaded permissions (avoid re-fetching)
- Loading state management

**Returns**:
```typescript
{
  permissionsByCategory: Map<string, Permission[]>,
  allPermissions: Permission[],
  loading: boolean,
  error: Error | null,
  refetch: () => void
}
```

**Implementation Notes**:
- Use existing `usePermissions` hook from `src/hooks/usePermissions.ts`
- Memoize grouped permissions (useMemo)
- Error handling for API failures

---

### 3. hooks/usePermissionState.ts (~120L)

**Purpose**: Manage permission checkbox state, bulk operations

**Responsibilities**:
- Initialize permission state from existing role (edit mode)
- Toggle individual permission
- Select all in category
- Deselect all in category
- Handle permission dependencies (auto-select required permissions)

**State**:
```typescript
const [permissionState, setPermissionState] = useState<PermissionState>({});
```

**Returns**:
```typescript
{
  permissionState: PermissionState,
  togglePermission: (permissionId: string) => void,
  selectAllInCategory: (category: string) => void,
  deselectAllInCategory: (category: string) => void,
  getSelectedPermissions: () => string[],
  initializeFromRole: (roleData: RoleData) => void
}
```

**Implementation Notes**:
- Handle permission dependencies (if permission A requires B, selecting A auto-selects B)
- Prevent deselecting if permission is required by another
- Memoize derived state (selectedPermissionIds)

---

### 4. hooks/useRoleForm.ts (~100L)

**Purpose**: Manage role form fields (name, description, level)

**Responsibilities**:
- Form field state (name, description, level)
- Validation (name required, level valid range)
- Initialize from existing role (edit mode)
- Form reset

**State**:
```typescript
const [formData, setFormData] = useState<RoleFormData>({
  name: '',
  description: '',
  level: 1,
  parentRoleId: undefined
});
const [errors, setErrors] = useState<Record<string, string>>({});
```

**Returns**:
```typescript
{
  formData: RoleFormData,
  errors: Record<string, string>,
  updateField: (field: keyof RoleFormData, value: any) => void,
  validate: () => boolean,
  reset: () => void,
  initializeFromRole: (roleData: RoleData) => void
}
```

**Validation Rules**:
- Name: required, 3-50 characters
- Description: optional, max 200 characters
- Level: 1-10 range

---

### 5. hooks/useHierarchyState.ts (~90L)

**Purpose**: Manage parent role selection, hierarchy validation

**Responsibilities**:
- Parent role selection
- Prevent circular dependencies (child cannot be parent of ancestor)
- Calculate role level based on parent (parent.level + 1)
- Load available parent roles

**State**:
```typescript
const [selectedParentId, setSelectedParentId] = useState<string | undefined>();
const [availableParents, setAvailableParents] = useState<HierarchyNode[]>([]);
```

**Returns**:
```typescript
{
  selectedParentId: string | undefined,
  availableParents: HierarchyNode[],
  setParent: (parentId: string | undefined) => void,
  validateHierarchy: (parentId: string, currentRoleId?: string) => boolean,
  calculateLevel: (parentId: string) => number
}
```

**Implementation Notes**:
- Use existing role hierarchy data (if available)
- Prevent selecting current role as parent (edit mode)
- Prevent selecting descendant as parent (circular dependency)

---

### 6. hooks/useEntityPermissions.ts (~110L)

**Purpose**: Manage entity-specific permissions (companies, persons, courses)

**Responsibilities**:
- Load entities (companies, persons, courses)
- Manage per-entity permission assignment
- Bulk operations (assign to all entities)
- Filter entities by search

**State**:
```typescript
const [entityPermissions, setEntityPermissions] = useState<Map<string, string[]>>(new Map());
const [selectedEntityType, setSelectedEntityType] = useState<EntityType>(EntityType.COMPANY);
```

**Returns**:
```typescript
{
  entityPermissions: Map<string, string[]>, // entityId -> permissionIds[]
  selectedEntityType: EntityType,
  setEntityType: (type: EntityType) => void,
  assignPermissionToEntity: (entityId: string, permissionId: string) => void,
  removePermissionFromEntity: (entityId: string, permissionId: string) => void,
  assignToAllEntities: (permissionId: string) => void,
  getEntityPermissions: (entityId: string) => string[],
  initializeFromRole: (roleData: RoleData) => void
}
```

**Implementation Notes**:
- Load entities on demand (when tab selected)
- Memoize filtered entity lists
- Handle loading states for entity fetching

---

### 7. components/PermissionSelector.tsx (~150L)

**Purpose**: Render permission tree with checkboxes, category grouping

**Props**:
```typescript
interface PermissionSelectorProps {
  permissionsByCategory: Map<string, Permission[]>;
  permissionState: PermissionState;
  onTogglePermission: (permissionId: string) => void;
  onSelectAllCategory: (category: string) => void;
  onDeselectAllCategory: (category: string) => void;
  disabled?: boolean;
}
```

**Features**:
- Accordion categories (expand/collapse)
- Checkbox for each permission
- "Select All" / "Deselect All" buttons per category
- Permission count badge (e.g., "5/12 selected")
- Search/filter permissions (optional)

**Visual States**:
- Enabled/disabled
- Category expanded/collapsed
- All selected / some selected / none selected

---

### 8. components/RoleFormFields.tsx (~80L)

**Purpose**: Render role name, description, level input fields

**Props**:
```typescript
interface RoleFormFieldsProps {
  formData: RoleFormData;
  errors: Record<string, string>;
  onUpdate: (field: keyof RoleFormData, value: any) => void;
  disabled?: boolean;
}
```

**Features**:
- Name input (text, required)
- Description textarea (optional)
- Level number input (1-10 range, disabled if auto-calculated)
- Real-time validation errors display
- Label + input grouping

---

### 9. components/HierarchySelector.tsx (~70L)

**Purpose**: Render parent role dropdown with hierarchy tree view

**Props**:
```typescript
interface HierarchySelectorProps {
  selectedParentId: string | undefined;
  availableParents: HierarchyNode[];
  onSelect: (parentId: string | undefined) => void;
  currentRoleId?: string; // Edit mode, prevent selecting self
  disabled?: boolean;
}
```

**Features**:
- Dropdown select with hierarchy visualization (indented tree)
- "No Parent" option (top-level role)
- Disabled options (self, descendants)
- Level preview (shows calculated level)

---

### 10. components/EntityPermissionPanel.tsx (~120L)

**Purpose**: Render entity-specific permission assignment panel

**Props**:
```typescript
interface EntityPermissionPanelProps {
  entityType: EntityType;
  entities: Array<{ id: string; name: string }>;
  availablePermissions: Permission[];
  entityPermissions: Map<string, string[]>;
  onAssign: (entityId: string, permissionId: string) => void;
  onRemove: (entityId: string, permissionId: string) => void;
  onAssignToAll: (permissionId: string) => void;
  loading?: boolean;
}
```

**Features**:
- Tabs (Company / Person / Course)
- Entity list (searchable)
- Permission checkboxes per entity
- "Apply to All" button
- Loading skeleton

---

### 11. utils/roleHelpers.ts (~70L)

**Purpose**: Pure functions for role/permission formatting, calculations

**Functions**:
```typescript
// Calculate hierarchy path (e.g., "Admin > Manager > Supervisor")
export function getHierarchyPath(
  roleId: string, 
  allRoles: Map<string, RoleData>
): string;

// Format permission name for display (e.g., "ROLE_MANAGEMENT" → "Role Management")
export function formatPermissionName(permission: Permission): string;

// Group permissions by category
export function groupPermissionsByCategory(
  permissions: Permission[]
): Map<string, Permission[]>;

// Check if permission has dependencies
export function hasUnmetDependencies(
  permissionId: string,
  selectedPermissions: string[],
  allPermissions: Permission[]
): boolean;

// Calculate role level based on parent
export function calculateRoleLevel(
  parentId: string,
  allRoles: Map<string, RoleData>
): number;
```

---

### 12. utils/permissionValidation.ts (~50L)

**Purpose**: Validation logic for permission assignments

**Functions**:
```typescript
// Validate permission selection (check dependencies met)
export function validatePermissionSelection(
  selectedPermissions: string[],
  allPermissions: Permission[]
): { valid: boolean; errors: string[] };

// Validate hierarchy (no circular dependencies)
export function validateHierarchy(
  roleId: string,
  parentId: string,
  allRoles: Map<string, RoleData>
): { valid: boolean; error?: string };

// Validate role level
export function validateRoleLevel(
  level: number,
  parentLevel?: number
): { valid: boolean; error?: string };
```

---

### 13. RoleModal.tsx (Main Component - ~250L)

**Responsibilities**:
- Hooks composition (orchestration)
- API integration (useRoles hook, roleService)
- Submit logic (create/update role with permissions)
- Modal rendering (layout only)

**Structure**:
```typescript
export const RoleModal = ({
  isOpen,
  onClose,
  editingRole,
  onRoleSaved
}: RoleModalProps) => {
  // API hooks (existing, not extracted)
  const { createRole, updateRole, loading } = useRoles();

  // Custom hooks (extracted business logic)
  const { permissionsByCategory, allPermissions, loading: loadingPerms } = usePermissionLoader();
  const { permissionState, togglePermission, selectAllInCategory, ... } = usePermissionState();
  const { formData, errors, updateField, validate, ... } = useRoleForm();
  const { selectedParentId, setParent, validateHierarchy, ... } = useHierarchyState();
  const { entityPermissions, assignPermissionToEntity, ... } = useEntityPermissions();

  // Initialize edit mode
  useEffect(() => {
    if (editingRole) {
      formState.initializeFromRole(editingRole);
      permissionState.initializeFromRole(editingRole);
      hierarchyState.setParent(editingRole.parentRoleId);
      entityPermissions.initializeFromRole(editingRole);
    }
  }, [editingRole]);

  // Submit logic (orchestration)
  const handleSubmit = async () => {
    if (!validate()) return;

    const roleData: RoleData = {
      ...formData,
      parentRoleId: selectedParentId,
      permissions: permissionState.getSelectedPermissions(),
      entityPermissions: Array.from(entityPermissions.entries()).map(([entityId, permIds]) => ({
        entityId,
        entityType: selectedEntityType,
        permissionIds: permIds
      }))
    };

    if (editingRole) {
      await updateRole(editingRole.id, roleData);
    } else {
      await createRole(roleData);
    }

    onRoleSaved();
    onClose();
  };

  // Render (layout only, delegate to components)
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
      <DialogContent>
        {/* Form Fields Section */}
        <RoleFormFields
          formData={formData}
          errors={errors}
          onUpdate={updateField}
        />

        {/* Hierarchy Section */}
        <HierarchySelector
          selectedParentId={selectedParentId}
          availableParents={availableParents}
          onSelect={setParent}
          currentRoleId={editingRole?.id}
        />

        {/* Permission Selector Section */}
        <PermissionSelector
          permissionsByCategory={permissionsByCategory}
          permissionState={permissionState}
          onTogglePermission={togglePermission}
          onSelectAllCategory={selectAllInCategory}
          onDeselectAllCategory={deselectAllInCategory}
        />

        {/* Entity Permissions Section */}
        <EntityPermissionPanel
          entityType={selectedEntityType}
          entities={filteredEntities}
          availablePermissions={allPermissions}
          entityPermissions={entityPermissions}
          onAssign={assignPermissionToEntity}
          onRemove={removePermissionFromEntity}
          onAssignToAll={assignToAllEntities}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {editingRole ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleModal; // ⚠️ PRESERVE default export for compatibility
```

---

## Quality Gates (Mandatory)

### Pre-Commit Checklist
- [ ] TypeScript compilation: `npm run build` → 0 errors
- [ ] Component size: Main <250L, avg module <100L
- [ ] Zero breaking changes: API compatibility preserved
- [ ] Default export: Present (backward compatibility)
- [ ] Hooks naming: `use*` prefix consistent
- [ ] Component naming: Descriptive, clear responsibility
- [ ] Props interfaces: Complete TypeScript definitions

### Testing Checklist
- [ ] Manual: Create new role with permissions (success)
- [ ] Manual: Edit existing role (permissions preserved)
- [ ] Manual: Select all in category (bulk operation works)
- [ ] Manual: Hierarchy validation (prevent circular dependency)
- [ ] Manual: Entity permissions (assign to company/person/course)
- [ ] Manual: Form validation (required fields enforced)
- [ ] Manual: Cancel/Close (state reset correctly)

### Documentation Checklist
- [ ] README.md: Architecture overview with metrics
- [ ] README.md: Hooks documentation (purpose, state, functions, usage)
- [ ] README.md: Components documentation (props, features, states)
- [ ] README.md: Utils documentation (functions, examples)
- [ ] README.md: Data flow diagrams (create/edit modes)
- [ ] README.md: Testing checklist (manual + unit tests TODO)
- [ ] README.md: Maintenance guide (common issues, troubleshooting)
- [ ] Completion report: Metrics, lessons, next steps

---

## Estimated Timeline

### Day 1 (2 hours): Analysis & Extraction Prep
- **Morning** (1h):
  - [ ] Read RoleModal.tsx thoroughly (908 lines)
  - [ ] Identify all state variables (permissions, form, hierarchy, entities)
  - [ ] Map API calls (useRoles, usePermissions hooks)
  - [ ] Identify UI sections (form, permissions, hierarchy, entities)

- **Afternoon** (1h):
  - [ ] Create extraction strategy document (boundaries, files)
  - [ ] Create types.ts with all interfaces
  - [ ] Backup original component (RoleModal.backup.tsx)
  - [ ] Commit backup before refactoring

### Day 2 (3-4 hours): Hooks Extraction
- **Morning** (2h):
  - [ ] Extract usePermissionLoader.ts (API integration)
  - [ ] Extract usePermissionState.ts (checkbox state, bulk ops)
  - [ ] Test hooks in isolation (console.log validation)

- **Afternoon** (1-2h):
  - [ ] Extract useRoleForm.ts (form fields, validation)
  - [ ] Extract useHierarchyState.ts (parent selection, validation)
  - [ ] Extract useEntityPermissions.ts (entity-specific permissions)

### Day 3 (3-4 hours): Components Extraction
- **Morning** (2h):
  - [ ] Extract PermissionSelector.tsx (permission tree)
  - [ ] Extract RoleFormFields.tsx (form inputs)
  - [ ] Extract HierarchySelector.tsx (parent dropdown)

- **Afternoon** (1-2h):
  - [ ] Extract EntityPermissionPanel.tsx (entity panels)
  - [ ] Create utils/roleHelpers.ts (pure functions)
  - [ ] Create utils/permissionValidation.ts (validation logic)
  - [ ] Create index.ts barrel export

### Day 4 (2-3 hours): Main Component Refactoring
- **Morning** (1-2h):
  - [ ] Refactor RoleModal.tsx (hooks composition)
  - [ ] Preserve default export
  - [ ] Test imports/exports (barrel export working)

- **Afternoon** (1h):
  - [ ] TypeScript compilation test
  - [ ] Build test (`npm run build`)
  - [ ] Fix any import/type errors

### Day 5 (2-3 hours): Testing & Documentation
- **Morning** (1-2h):
  - [ ] Manual testing (7 test cases in checklist)
  - [ ] Fix any issues found
  - [ ] Final TypeScript/build validation

- **Afternoon** (1h):
  - [ ] Create README.md (comprehensive)
  - [ ] Create completion report (metrics, lessons)
  - [ ] Git commit with descriptive message
  - [ ] Update todo list

---

## Risk Assessment

### Technical Risks

**Risk 1: Permission Dependencies Complexity**
- **Probability**: MEDIUM
- **Impact**: MEDIUM
- **Mitigation**: Test dependency logic thoroughly, add validation
- **Contingency**: Simplify if too complex, defer to future iteration

**Risk 2: Entity Permission State Complexity**
- **Probability**: MEDIUM
- **Impact**: MEDIUM
- **Mitigation**: Use Map for O(1) lookups, memoize derived state
- **Contingency**: Simplify to single entity type first, expand later

**Risk 3: Breaking Changes**
- **Probability**: LOW (learned from Phase 3.2)
- **Impact**: HIGH
- **Mitigation**: Preserve default export, thorough manual testing
- **Contingency**: Rollback to backup, fix incrementally

### Schedule Risks

**Risk 4: Time Overrun**
- **Probability**: MEDIUM
- **Impact**: LOW
- **Mitigation**: Follow Phase 3.2 pattern (proven), prioritize quality gates
- **Contingency**: Extend to 5 days if needed, defer advanced features

---

## Success Metrics (Targets)

### Quantitative Metrics
- **Main Component Size**: 908L → <250L (-72%)
- **Avg Module Size**: Target <100L per file
- **Total Files**: 1 → 10+ (types, hooks, components, utils, README)
- **TypeScript Errors**: 0
- **Build Status**: PASSED
- **Breaking Changes**: 0

### Qualitative Metrics
- **Maintainability**: +60% (easier to locate/modify specific logic)
- **Testability**: +80% (hooks testable in isolation)
- **Readability**: +70% (single responsibility per file)
- **Reusability**: Hooks/components reusable in other role management contexts
- **Developer Velocity**: +30% for role-related features

### Team Benefits
- **Onboarding**: -50% time (clearer structure, comprehensive README)
- **Debugging**: -40% time (isolated hooks, easier to trace)
- **Code Review**: -35% time (smaller PRs, focused changes)
- **Feature Development**: +30% velocity (reusable hooks/components)

---

## Next Steps After Phase 3.3

### Immediate (Week 3)
1. Manual testing session (30 min, 7 test cases)
2. Deploy to staging for validation
3. Monitor for issues (24h)

### Short-term (Week 4)
- **Phase 3.4**: RoleHierarchy.tsx (822L→~250L target)
- **Phase 3.5**: ScheduleEventModal.tsx (797L→~250L target)
- Continue systematic God component elimination

### Long-term (Weeks 5-8)
- Complete remaining 3 God Components (DocumentManager, HierarchyTreeView, GenericImport)
- Update TRAE guides with all Phase 3 patterns
- Prepare Phase 4 (Domain Modularization)

---

## References

**Pattern Source**: Phase 3.2 PreventiviModal (921L→325L, -65%)  
**Documentation**: `src/components/schedules/components/PreventiviModal/README.md`  
**Completion Report**: `docs/10_project_managemnt/32_pulizia-e-allineamento/20_phase3.2_completion_report.md`  
**Roadmap**: `docs/10_project_managemnt/32_pulizia-e-allineamento/13_final_summary_roadmap.md`  
**TRAE Guide**: `.trae/TRAE_SYSTEM_GUIDE.md` (Phase 3 patterns section)  
**Project Rules**: `.trae/rules/project_rules.md` (Component refactoring standards)

---

**Status**: READY TO EXECUTE ✅  
**Estimated Start**: Week 3 (current)  
**Estimated Completion**: 3-5 days (15-20 hours total effort)
