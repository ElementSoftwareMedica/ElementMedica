# Phase 3.7: HierarchyTreeView Refactoring - Piano di Esecuzione Dettagliato

**Data Inizio**: Post Phase 1 (13-14 Novembre 2025)  
**Status**: 🔄 IN PLANNING  
**Priorità**: 🟡 HIGH  
**Durata Stimata**: 3-5 giorni  
**Effort**: 24-40 ore  

---

## 📋 EXECUTIVE SUMMARY

Phase 3.7 è il **settimo God Component** nella serie di refactoring. Completa il lavoro su 7/8 God Components identificati.

### Current State
- **File**: `src/components/hierarchy/HierarchyTreeView.tsx`
- **Size**: 749 linee
- **Complessità**: Tree navigation, CRUD operations, search, legend panel
- **Dependencies**: React, Material-UI, hierarchyService

### Target State
- **Main file**: ~250 linee (-67%)
- **Module structure**: hooks/ + components/ + types.ts + utils.ts
- **Pattern**: Composable hooks (proven 6x successful)

### Success Criteria Inherited from Phase 3.6
- ✅ Build success 100%
- ✅ TypeScript 0 errors
- ✅ Zero breaking changes
- ✅ Functionality identical
- ✅ Design unchanged
- ✅ Max file size <500L
- ✅ All tests pass

---

## 🎯 DAY 0: ANALYSIS & EXTRACTION STRATEGY

**Effort**: 2-3 ore  
**Deliverable**: Extraction strategy document

### Step 1: Read Current Implementation

```bash
# Analizzare file corrente
cat src/components/hierarchy/HierarchyTreeView.tsx | wc -l
# Expected: 749 linee

# Identificare dependencies
grep -E "^import" src/components/hierarchy/HierarchyTreeView.tsx
```

### Step 2: Identify Core Responsibilities

**Expected responsibilities** (da verificare):
1. **Tree Data Management**: Load hierarchy, cache, refresh
2. **Tree Navigation**: Expand/collapse nodes, drill-down
3. **CRUD Operations**: Add, edit, delete nodes
4. **Search & Filter**: Search by name, filter by type
5. **Legend Panel**: Show/hide legend, color coding
6. **UI State**: Modals, loading, errors

### Step 3: Identify Extractable Hooks

**Pattern from previous 6 God Components**:
- `useTreeData` (~140-180L) - Data fetching, cache, refresh
- `useTreeNavigation` (~120-150L) - Expand/collapse, drill-down logic
- `useTreeActions` (~150-180L) - CRUD operations
- `useTreeUI` (~60-80L) - Modal state, UI toggles
- `useTreeSearch` (~80-100L) - Search & filter logic (if complex)

**Total hooks**: 4-5 hooks, ~550-690 linee

### Step 4: Identify Extractable Components

**Expected components**:
- `TreeNode.tsx` (~100-120L) - Single tree node rendering
- `TreeList.tsx` (~80-100L) - List of tree nodes
- `TreeActions.tsx` (~60-80L) - Action buttons (add, edit, delete)
- `SearchBar.tsx` (~40-60L) - Search input with filters
- `LegendPanel.tsx` (~60-80L) - Color legend panel
- `TreeNodeModal.tsx` (~100-120L) - Add/edit modal (if exists)

**Total components**: 5-6 components, ~340-560 linee

### Step 5: Identify Extractable Utils

**Expected utils**:
- `treeHelpers.ts` (~120-150L)
  - `buildTreeStructure(nodes)` - Convert flat list to tree
  - `findNodeById(tree, id)` - Navigate tree
  - `getNodePath(tree, id)` - Get breadcrumb path
  - `expandToNode(tree, id)` - Auto-expand to target node
  - `flattenTree(tree)` - Convert tree to flat list
  - `sortTree(tree, sortBy)` - Sort tree nodes

- `treeValidators.ts` (~60-80L)
  - `validateNodeName(name)` - Name validation
  - `canAddChild(node)` - Business rules
  - `canDeleteNode(node)` - Prevent orphans
  - `validateHierarchyDepth(tree)` - Max depth check

**Total utils**: ~180-230 linee

### Step 6: Module Structure Planning

```
src/components/hierarchy/
├── HierarchyTreeView/
│   ├── index.tsx                 # Main component (~250L)
│   ├── types.ts                  # TypeScript definitions (~150L)
│   ├── treeHelpers.ts            # Utility functions (~140L)
│   ├── treeValidators.ts         # Validation logic (~70L)
│   ├── hooks/
│   │   ├── useTreeData.ts        # Data management (~160L)
│   │   ├── useTreeNavigation.ts  # Navigation logic (~140L)
│   │   ├── useTreeActions.ts     # CRUD operations (~170L)
│   │   ├── useTreeUI.ts          # UI state (~70L)
│   │   └── useTreeSearch.ts      # Search & filter (~90L) [OPTIONAL]
│   └── components/
│       ├── TreeNode.tsx          # Node rendering (~110L)
│       ├── TreeList.tsx          # List rendering (~90L)
│       ├── TreeActions.tsx       # Action buttons (~70L)
│       ├── SearchBar.tsx         # Search input (~50L)
│       ├── LegendPanel.tsx       # Legend panel (~70L)
│       └── TreeNodeModal.tsx     # Add/edit modal (~110L) [IF EXISTS]
├── HierarchyTreeView.backup.tsx  # Original preserved (749L)
└── HierarchyTreeView.tsx         # Re-export wrapper (~12L)
```

**Total lines**: ~1,730 linee (from 749L)
- Main component: 250L (target)
- Supporting files: ~1,480L
- **Avg file size**: ~135L per file (11 files)
- **Max file size**: 170L (well below 500L limit)

### Step 7: Extraction Strategy Document

**Create**: `docs/10_project_managemnt/32_pulizia-e-allineamento/phase3.7_extraction_strategy.md`

```markdown
# Phase 3.7: HierarchyTreeView Extraction Strategy

## Current Analysis
- **File**: src/components/hierarchy/HierarchyTreeView.tsx
- **Lines**: 749
- **Complexity**: Tree data + navigation + CRUD + search + legend

## Extraction Plan

### Day 1: Types & Utils (Foundation)
1. Create types.ts (150L)
   - TreeNode interface
   - TreeViewProps interface
   - NavigationState, UIState, SearchState
2. Create treeHelpers.ts (140L)
   - buildTreeStructure, findNodeById, getNodePath, expandToNode
3. Create treeValidators.ts (70L)
   - validateNodeName, canAddChild, canDeleteNode
4. TypeScript check: 0 errors

### Day 2: Hooks Layer
1. Create useTreeData.ts (160L)
   - Load hierarchy, cache, refresh, invalidate
2. Create useTreeNavigation.ts (140L)
   - Expand/collapse, drill-down, breadcrumb
3. TypeScript check: 0 errors
4. Build check: PASSED

### Day 3: More Hooks + Components Start
1. Create useTreeActions.ts (170L)
   - Add, edit, delete with optimistic updates
2. Create useTreeUI.ts (70L)
   - Modal state, legend visibility, loading
3. Create TreeNode.tsx (110L)
   - Single node rendering with actions
4. TypeScript check: 0 errors

### Day 4: Components Layer
1. Create TreeList.tsx (90L)
   - List of nodes with virtualization (if needed)
2. Create TreeActions.tsx (70L)
   - Toolbar with add/delete buttons
3. Create SearchBar.tsx (50L)
   - Search input + filters
4. Create LegendPanel.tsx (70L)
   - Color legend with toggle
5. TypeScript check: 0 errors

### Day 5: Main Refactor + Testing
1. Create HierarchyTreeView/index.tsx (250L)
   - Compose all hooks
   - Render all components
   - Wire up event handlers
2. Backup original to .backup.tsx
3. Create re-export wrapper
4. Build + test
5. Zero breaking changes verification
6. Completion report

## Risk Mitigation
- Keep original file until verification complete
- Incremental testing after each hook
- Use feature flag if available
- Rollback plan: Revert to .backup.tsx

## Success Metrics
- Main file: 749L → 250L (-67%)
- Max file size: <170L (well below 500L)
- Build: PASSED
- TypeScript: 0 errors
- Breaking changes: 0
- Tests: 100% passing
```

### Checklist Day 0

- [ ] Read HierarchyTreeView.tsx completamente
- [ ] Identificare tutte le responsabilità
- [ ] Mappare hooks extractable (4-5)
- [ ] Mappare components extractable (5-6)
- [ ] Mappare utils extractable (2 files)
- [ ] Creare extraction strategy document
- [ ] Stimare effort per day (realistica)
- [ ] Identificare potenziali breaking changes
- [ ] Preparare rollback plan
- [ ] Review con team (se richiesto)

---

## 🎯 DAY 1: TYPES & UTILS (Foundation)

**Effort**: 4-6 ore  
**Deliverable**: types.ts, treeHelpers.ts, treeValidators.ts

### Task 1.1: Create types.ts

**File**: `src/components/hierarchy/HierarchyTreeView/types.ts`

**Content structure** (esempio, da adattare):
```typescript
// types.ts (~150L)

/**
 * Core tree node structure
 */
export interface TreeNode {
  id: string;
  name: string;
  parentId: string | null;
  type: 'department' | 'role' | 'person';
  level: number;
  color?: string;
  icon?: string;
  children?: TreeNode[];
  isExpanded?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Tree view component props
 */
export interface HierarchyTreeViewProps {
  tenantId: string;
  initialNodeId?: string;
  onNodeSelect?: (node: TreeNode) => void;
  onNodeAdd?: (parentNode: TreeNode) => void;
  onNodeEdit?: (node: TreeNode) => void;
  onNodeDelete?: (node: TreeNode) => void;
  showSearch?: boolean;
  showLegend?: boolean;
  maxDepth?: number;
  readOnly?: boolean;
}

/**
 * Tree data state
 */
export interface TreeDataState {
  nodes: TreeNode[];
  rootNode: TreeNode | null;
  isLoading: boolean;
  error: Error | null;
  lastFetch: Date | null;
}

/**
 * Navigation state
 */
export interface NavigationState {
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  breadcrumb: TreeNode[];
  scrollToNodeId: string | null;
}

/**
 * Search state
 */
export interface SearchState {
  query: string;
  filterType: 'all' | 'department' | 'role' | 'person';
  results: TreeNode[];
  isSearching: boolean;
}

/**
 * UI state
 */
export interface UIState {
  showLegend: boolean;
  isAddModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteDialogOpen: boolean;
  currentNode: TreeNode | null;
}

/**
 * CRUD operation types
 */
export type TreeAction = 
  | { type: 'ADD_NODE'; payload: { parentId: string; node: Partial<TreeNode> } }
  | { type: 'UPDATE_NODE'; payload: { nodeId: string; updates: Partial<TreeNode> } }
  | { type: 'DELETE_NODE'; payload: { nodeId: string } }
  | { type: 'MOVE_NODE'; payload: { nodeId: string; newParentId: string } };

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ... altre types ...
```

**Testing**:
```bash
npm run type-check
# Expected: 0 errors related to types.ts
```

### Task 1.2: Create treeHelpers.ts

**File**: `src/components/hierarchy/HierarchyTreeView/treeHelpers.ts`

**Content structure**:
```typescript
// treeHelpers.ts (~140L)

import { TreeNode } from './types';

/**
 * Convert flat node list to tree structure
 */
export function buildTreeStructure(nodes: TreeNode[]): TreeNode | null {
  if (!nodes || nodes.length === 0) return null;
  
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];
  
  // First pass: Create map and initialize children
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });
  
  // Second pass: Build parent-child relationships
  nodes.forEach(node => {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId === null) {
      rootNodes.push(treeNode);
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(treeNode);
      }
    }
  });
  
  return rootNodes[0] || null;
}

/**
 * Find node by ID in tree
 */
export function findNodeById(tree: TreeNode | null, id: string): TreeNode | null {
  if (!tree) return null;
  if (tree.id === id) return tree;
  
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Get path from root to target node
 */
export function getNodePath(tree: TreeNode | null, targetId: string): TreeNode[] {
  if (!tree) return [];
  
  const path: TreeNode[] = [];
  
  function traverse(node: TreeNode): boolean {
    path.push(node);
    
    if (node.id === targetId) return true;
    
    if (node.children) {
      for (const child of node.children) {
        if (traverse(child)) return true;
      }
    }
    
    path.pop();
    return false;
  }
  
  traverse(tree);
  return path;
}

/**
 * Get all node IDs that should be expanded to show target node
 */
export function getExpandedNodeIds(tree: TreeNode | null, targetId: string): Set<string> {
  const path = getNodePath(tree, targetId);
  return new Set(path.map(node => node.id));
}

/**
 * Flatten tree to array
 */
export function flattenTree(tree: TreeNode | null): TreeNode[] {
  if (!tree) return [];
  
  const result: TreeNode[] = [tree];
  
  if (tree.children) {
    tree.children.forEach(child => {
      result.push(...flattenTree(child));
    });
  }
  
  return result;
}

/**
 * Sort tree nodes recursively
 */
export function sortTree(tree: TreeNode | null, sortBy: keyof TreeNode = 'name'): TreeNode | null {
  if (!tree) return null;
  
  const sorted = { ...tree };
  
  if (sorted.children) {
    sorted.children = sorted.children
      .map(child => sortTree(child, sortBy))
      .filter((child): child is TreeNode => child !== null)
      .sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue);
        }
        return 0;
      });
  }
  
  return sorted;
}

/**
 * Count total nodes in tree
 */
export function countNodes(tree: TreeNode | null): number {
  if (!tree) return 0;
  
  let count = 1;
  if (tree.children) {
    tree.children.forEach(child => {
      count += countNodes(child);
    });
  }
  
  return count;
}

/**
 * Get max depth of tree
 */
export function getTreeDepth(tree: TreeNode | null): number {
  if (!tree) return 0;
  
  if (!tree.children || tree.children.length === 0) {
    return 1;
  }
  
  const childDepths = tree.children.map(child => getTreeDepth(child));
  return 1 + Math.max(...childDepths);
}

// ... altre helper functions ...
```

### Task 1.3: Create treeValidators.ts

**File**: `src/components/hierarchy/HierarchyTreeView/treeValidators.ts`

**Content structure**:
```typescript
// treeValidators.ts (~70L)

import { TreeNode, ValidationResult } from './types';
import { getTreeDepth, findNodeById, flattenTree } from './treeHelpers';

/**
 * Validate node name
 */
export function validateNodeName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Il nome è obbligatorio');
  }
  
  if (name.length > 100) {
    errors.push('Il nome non può superare 100 caratteri');
  }
  
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
    errors.push('Il nome contiene caratteri non validi');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if can add child to node
 */
export function canAddChild(
  tree: TreeNode | null,
  parentNode: TreeNode,
  maxDepth: number = 10
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check max depth
  const nodeDepth = parentNode.level || 0;
  if (nodeDepth >= maxDepth) {
    errors.push(`Profondità massima raggiunta (${maxDepth})`);
  }
  
  // Business rules (esempio)
  if (parentNode.type === 'person') {
    errors.push('Non puoi aggiungere figli a una persona');
  }
  
  // Warning for many children
  if (parentNode.children && parentNode.children.length >= 10) {
    warnings.push('Questo nodo ha già molti figli');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if can delete node
 */
export function canDeleteNode(
  tree: TreeNode | null,
  node: TreeNode
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Can't delete root
  if (node.parentId === null) {
    errors.push('Non puoi eliminare il nodo radice');
  }
  
  // Warn about children
  if (node.children && node.children.length > 0) {
    warnings.push(`Eliminando questo nodo, eliminerai anche ${node.children.length} figli`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate entire tree structure
 */
export function validateTreeStructure(
  tree: TreeNode | null,
  maxDepth: number = 10,
  maxNodes: number = 1000
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!tree) {
    errors.push('Albero vuoto');
    return { isValid: false, errors };
  }
  
  // Check depth
  const depth = getTreeDepth(tree);
  if (depth > maxDepth) {
    errors.push(`Profondità eccessiva: ${depth} (max ${maxDepth})`);
  }
  
  // Check total nodes
  const nodes = flattenTree(tree);
  if (nodes.length > maxNodes) {
    errors.push(`Troppi nodi: ${nodes.length} (max ${maxNodes})`);
  }
  
  // Check for duplicate IDs
  const ids = new Set<string>();
  for (const node of nodes) {
    if (ids.has(node.id)) {
      errors.push(`ID duplicato: ${node.id}`);
    }
    ids.add(node.id);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Testing Day 1

```bash
# TypeScript check
npm run type-check
# Expected: 0 errors

# Unit test helpers (se già abbiamo test framework)
npm test -- treeHelpers.test.ts
npm test -- treeValidators.test.ts
```

### Checklist Day 1

- [ ] types.ts created (150L)
- [ ] treeHelpers.ts created (140L)
- [ ] treeValidators.ts created (70L)
- [ ] TypeScript 0 errors
- [ ] All utils have JSDoc comments
- [ ] Helper functions unit tested (if test framework ready)
- [ ] Git commit: "feat(hierarchy): Add types and utils for HierarchyTreeView refactor"

---

## 🎯 DAY 2-5: CONTINUED IN NEXT DOCUMENT

Questo piano è già molto dettagliato per Day 0-1. I restanti giorni seguiranno lo stesso pattern di Phase 3.6 (DocumentManager):

- **Day 2**: Hooks layer (useTreeData, useTreeNavigation)
- **Day 3**: More hooks (useTreeActions, useTreeUI) + start components
- **Day 4**: Components layer (TreeNode, TreeList, SearchBar, LegendPanel, TreeActions)
- **Day 5**: Main refactor + testing + completion report

---

## 📊 SUCCESS METRICS (Target)

### Size Reduction
- **Before**: 749L
- **After**: 250L (main) + ~1,480L (supporting files)
- **Reduction**: -67% main file
- **Avg file size**: ~135L per file (11 files)

### Quality Metrics
- **Build**: ✅ PASSED
- **TypeScript**: 0 errors
- **Breaking changes**: 0
- **Tests passing**: 100%
- **Max file size**: <170L (well below 500L)

### Pattern Consistency
- **Hooks composition**: ✅ (proven 6x)
- **Component extraction**: ✅ (proven 6x)
- **Utils organization**: ✅ (proven 6x)
- **Types separation**: ✅ (proven 6x)

---

**Document Status**: ✅ READY FOR EXECUTION (post Phase 1)  
**Next Action**: Wait for Phase 1 completion, then start Day 0 analysis  
**Pattern**: Proven 6x successful (ImportPreviewTable, PreventiviModal, RoleModal, RoleHierarchy, GenericImport, DocumentManager)
