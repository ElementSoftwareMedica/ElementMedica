# Phase 3.7: HierarchyTreeView - Extraction Strategy

**Data Analisi**: 11 Novembre 2025  
**File Analizzato**: `src/components/roles/HierarchyTreeView.tsx` (749 linee)  
**Pattern**: Proven 6x (Hooks Composition + Component Decomposition)  
**Target**: Main component <250L, modules avg <100L  

---

## 📊 ANALYSIS COMPLETE

### File Size & Complexity
- **Current Size**: 749 linee
- **Target Size**: ~250L main component (-67%)
- **Complexity**: HIGH (tree navigation, CRUD, drag-drop, permissions)

### Dependencies Identified
```typescript
// External
import React, { useState, useEffect } from 'react';
import { 
  Award, Building, ChevronDown, ChevronRight, Crown, Edit3, 
  Move, Plus, Save, Settings, Shield, Star, Trash2, UserCheck, Users, X 
} from 'lucide-react';

// Services
import { getRoleHierarchy } from '../../services/roles';
import { isAuthenticated } from '../../services/auth';

// Types
import type { RoleHierarchy as RoleHierarchyType, UserRoleHierarchy } from '../../services/roles';
import { Role } from '../../hooks/useRoles';
```

---

## 🎯 RESPONSIBILITIES IDENTIFIED

### 1. **Data Management** (~150L)
- Load hierarchy from API (`getRoleHierarchy`)
- Build tree structure from flat data
- Transform hierarchy data to TreeNode format
- Cache management

### 2. **Tree Navigation** (~100L)
- Expand/collapse nodes
- Toggle node states
- Recursive expansion
- Initial expansion (levels 0-2)

### 3. **CRUD Operations** (~180L)
- Create role (root or child)
- Edit role (inline editing)
- Delete role (with validation)
- Save role (create/update)
- Cancel editing

### 4. **Drag & Drop** (~80L)
- Drag start handler
- Drag over handler
- Drop handler with validation
- Role move/reorder

### 5. **Permissions Logic** (~120L)
- `canEditRole(roleType)` - Check if user can edit role
- `hasPermission(permission)` - Check specific permission
- Permission-based UI enablement
- Debug logging for permissions

### 6. **Form State Management** (~60L)
- Form data state (name, description, roleType, permissions, level)
- Editing state (editingNode, creatingChild)
- Form validation

### 7. **UI Rendering** (~150L)
- Tree node rendering (recursive)
- Inline editing forms
- Create child forms
- Action buttons (edit, delete, create, move)
- Loading/error states
- Empty state
- Icons per role type

---

## 🔧 EXTRACTION STRATEGY

### **types.ts** (~80L)
```typescript
// Interfaces
interface TreeNode {
  id: string;
  name: string;
  description: string;
  level: number;
  roleType: string;
  children: TreeNode[];
  permissions: string[];
  assignableRoles: string[];
  parentId?: string;
}

interface HierarchyTreeViewProps {
  hierarchy?: RoleHierarchyType;
  currentUserHierarchy: UserRoleHierarchy | null;
  onRoleCreate?: (parentId: string | null, roleData: Role) => Promise<void>;
  onRoleUpdate?: (roleId: string, roleData: Role) => Promise<void>;
  onRoleDelete?: (roleId: string) => Promise<void>;
  onRoleMove?: (roleId: string, newParentId: string | null) => Promise<void>;
}

interface RoleFormData {
  name: string;
  description: string;
  roleType: string;
  permissions: string[];
  level: number;
}

// Re-exports
export type { RoleHierarchyType, UserRoleHierarchy } from '../../services/roles';
export type { Role } from '../../hooks/useRoles';
```

---

### **hooks/** (~520L total, 4 hooks)

#### **hooks/useTreeData.ts** (~160L)
**Purpose**: Load hierarchy, build tree structure, refresh data

```typescript
export const useTreeData = (
  externalHierarchy?: RoleHierarchyType,
  onError?: (error: string) => void
) => {
  const [hierarchy, setHierarchy] = useState<RoleHierarchyType>({});
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // loadHierarchyData() - Loads from API
  // buildTreeStructure() - Converts flat to tree
  // useEffect to load on mount or when externalHierarchy changes
  
  return {
    hierarchy,
    treeData,
    loading,
    error,
    loadHierarchyData: () => Promise<void>,
  };
};
```

**Functions to extract**:
- `loadHierarchyData()` (35L)
- `buildTreeStructure()` (80L)
- `useEffect` logic (20L)

#### **hooks/useTreeNavigation.ts** (~100L)
**Purpose**: Expand/collapse nodes, toggle states

```typescript
export const useTreeNavigation = (treeData: TreeNode[]) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // toggleNode() - Toggle single node
  // expandChildrenRecursively() - Expand all children
  // initializeExpansion() - Auto-expand levels 0-2
  
  useEffect(() => {
    // Initialize expansion on treeData change
  }, [treeData]);

  return {
    expandedNodes,
    toggleNode: (nodeId: string) => void,
    expandAll: () => void,
    collapseAll: () => void,
  };
};
```

**Functions to extract**:
- `toggleNode()` (10L)
- `expandChildrenRecursively()` (10L)
- `initializeExpansion()` (20L)

#### **hooks/useTreeActions.ts** (~180L)
**Purpose**: CRUD operations (create, edit, delete, move)

```typescript
export const useTreeActions = (
  treeData: TreeNode[],
  currentUserHierarchy: UserRoleHierarchy | null,
  callbacks: {
    onCreate?: (parentId: string | null, data: Role) => Promise<void>;
    onUpdate?: (roleId: string, data: Role) => Promise<void>;
    onDelete?: (roleId: string) => Promise<void>;
    onMove?: (roleId: string, newParentId: string | null) => Promise<void>;
    onRefresh?: () => Promise<void>;
  }
) => {
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [creatingChild, setCreatingChild] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({ ... });

  // Permission checks
  const canEditRole = (roleType: string): boolean => { ... };
  const hasPermission = (permission: string): boolean => { ... };

  // Actions
  const startEditing = (node: TreeNode) => { ... };
  const startCreating = (parentId: string | null) => { ... };
  const saveRole = async () => { ... };
  const deleteRole = async (nodeId: string) => { ... };
  const cancelEditing = () => { ... };

  return {
    editingNode,
    creatingChild,
    formData,
    setFormData,
    canEditRole,
    hasPermission,
    startEditing,
    startCreating,
    saveRole,
    deleteRole,
    cancelEditing,
  };
};
```

**Functions to extract**:
- `canEditRole()` (15L)
- `hasPermission()` (25L)
- `startEditing()` (10L)
- `startCreating()` (10L)
- `saveRole()` (30L)
- `deleteRole()` (15L)
- `cancelEditing()` (10L)

#### **hooks/useTreeDragDrop.ts** (~80L)
**Purpose**: Drag & drop functionality

```typescript
export const useTreeDragDrop = (
  currentUserHierarchy: UserRoleHierarchy | null,
  onRoleMove?: (roleId: string, newParentId: string | null) => Promise<void>,
  onRefresh?: () => Promise<void>
) => {
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const handleDragStart = (nodeId: string) => { ... };
  const handleDragOver = (e: React.DragEvent) => { ... };
  const handleDrop = async (e: React.DragEvent, targetNodeId: string | null) => { ... };

  const canDrag = currentUserHierarchy?.assignablePermissions?.includes('EDIT_HIERARCHY');

  return {
    draggedNode,
    handleDragStart,
    handleDragOver,
    handleDrop,
    canDrag,
  };
};
```

**Functions to extract**:
- `handleDragStart()` (3L)
- `handleDragOver()` (3L)
- `handleDrop()` (20L)

---

### **components/** (~400L total, 6 components)

#### **components/TreeNode.tsx** (~140L)
**Purpose**: Single tree node rendering with actions

```typescript
interface TreeNodeProps {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  isEditing: boolean;
  isCreating: boolean;
  draggedNode: string | null;
  formData: RoleFormData;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onStartCreate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onFormChange: (formData: RoleFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({ ... }) => {
  return (
    <div className="select-none">
      {/* Node content with expand button, icon, name, actions */}
      {/* Inline editing form (if editing) */}
    </div>
  );
};
```

#### **components/CreateChildForm.tsx** (~60L)
**Purpose**: Form for creating child role

```typescript
interface CreateChildFormProps {
  depth: number;
  formData: RoleFormData;
  onFormChange: (formData: RoleFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const CreateChildForm: React.FC<CreateChildFormProps> = ({ ... }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
      {/* Form fields: name, description, roleType */}
      {/* Buttons: Crea, Annulla */}
    </div>
  );
};
```

#### **components/CreateRootForm.tsx** (~60L)
**Purpose**: Form for creating root role

```typescript
// Similar to CreateChildForm but for root roles
```

#### **components/TreeNodeActions.tsx** (~80L)
**Purpose**: Action buttons (create, edit, delete, move)

```typescript
interface TreeNodeActionsProps {
  isEditing: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  hasChildren: boolean;
  onStartCreate: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export const TreeNodeActions: React.FC<TreeNodeActionsProps> = ({ ... }) => {
  if (isEditing) {
    return (
      <>
        <button onClick={onSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </>
    );
  }

  return (
    <>
      <button disabled={!canCreate} onClick={onStartCreate}>Plus</button>
      <button disabled={!canEdit} onClick={onStartEdit}>Edit</button>
      <button disabled={!canDelete || hasChildren} onClick={onDelete}>Delete</button>
      <button disabled={!canEdit}>Move</button>
    </>
  );
};
```

#### **components/TreeHeader.tsx** (~40L)
**Purpose**: Header with global actions

```typescript
interface TreeHeaderProps {
  canCreateRoot: boolean;
  onCreateRoot: () => void;
  onRefresh: () => void;
}

export const TreeHeader: React.FC<TreeHeaderProps> = ({ ... }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <Shield />
        <h3>Vista ad Albero della Gerarchia</h3>
      </div>
      <div className="flex items-center space-x-2">
        {canCreateRoot && <button onClick={onCreateRoot}>Nuovo Ruolo Radice</button>}
        <button onClick={onRefresh}>Aggiorna</button>
      </div>
    </div>
  );
};
```

#### **components/EmptyState.tsx** (~20L)
**Purpose**: Empty state when no roles

```typescript
interface EmptyStateProps {
  canCreate: boolean;
  onCreate: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ canCreate, onCreate }) => {
  return (
    <div className="text-center py-8 text-gray-500">
      <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p>Nessun ruolo trovato nella gerarchia.</p>
      {canCreate && <button onClick={onCreate}>Crea il primo ruolo</button>}
    </div>
  );
};
```

---

### **utils/** (~100L total)

#### **utils/treeHelpers.ts** (~80L)
**Purpose**: Pure functions for tree operations

```typescript
// findNodeById() - Navigate tree to find node (15L)
export const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
};

// getRoleIcon() - Get icon component for role (15L)
export const getRoleIcon = (level: number, roleType: string): JSX.Element => {
  if (roleType.includes('SUPER_ADMIN')) return <Crown />;
  if (roleType.includes('ADMIN')) return <Star />;
  // ... etc
};

// sortNodes() - Sort tree nodes recursively (20L)
export const sortNodes = (nodeArray: TreeNode[]): void => {
  nodeArray.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });
  nodeArray.forEach(node => sortNodes(node.children));
};
```

#### **utils/roleIcons.tsx** (~20L)
**Purpose**: Icon mapping (extracted from treeHelpers)

```typescript
import { Award, Building, Crown, Star, UserCheck, Users } from 'lucide-react';

export const getRoleIcon = (level: number, roleType: string) => {
  if (roleType.includes('SUPER_ADMIN')) return <Crown className="w-4 h-4 text-purple-600" />;
  if (roleType.includes('ADMIN')) return <Star className="w-4 h-4 text-red-600" />;
  if (roleType.includes('MANAGER')) return <Award className="w-4 h-4 text-orange-600" />;
  if (roleType.includes('TRAINER')) return <UserCheck className="w-4 h-4 text-blue-600" />;
  if (level <= 2) return <Building className="w-4 h-4 text-indigo-600" />;
  return <Users className="w-4 h-4 text-green-600" />;
};
```

---

### **Main Component: HierarchyTreeView.tsx** (~220L)
**Purpose**: Orchestration only - compose hooks, render components

```typescript
export const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({
  hierarchy: externalHierarchy,
  currentUserHierarchy,
  onRoleCreate,
  onRoleUpdate,
  onRoleDelete,
  onRoleMove
}) => {
  // Hooks composition
  const { 
    hierarchy, 
    treeData, 
    loading, 
    error, 
    loadHierarchyData 
  } = useTreeData(externalHierarchy);

  const { 
    expandedNodes, 
    toggleNode 
  } = useTreeNavigation(treeData);

  const {
    editingNode,
    creatingChild,
    formData,
    setFormData,
    canEditRole,
    hasPermission,
    startEditing,
    startCreating,
    saveRole,
    deleteRole,
    cancelEditing,
  } = useTreeActions(treeData, currentUserHierarchy, {
    onCreate: onRoleCreate,
    onUpdate: onRoleUpdate,
    onDelete: onRoleDelete,
    onRefresh: loadHierarchyData,
  });

  const {
    draggedNode,
    handleDragStart,
    handleDragOver,
    handleDrop,
  } = useTreeDragDrop(currentUserHierarchy, onRoleMove, loadHierarchyData);

  // Rendering (delegated to components)
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={loadHierarchyData} />;

  return (
    <div className="space-y-4">
      <TreeHeader 
        canCreateRoot={hasPermission('CREATE_ROLES')}
        onCreateRoot={() => startCreating(null)}
        onRefresh={loadHierarchyData}
      />

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4">
          {creatingChild === null && editingNode === null && formData.name !== '' && (
            <CreateRootForm 
              formData={formData}
              onFormChange={setFormData}
              onSave={saveRole}
              onCancel={cancelEditing}
            />
          )}

          <div 
            className="space-y-1"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            {treeData.map(node => (
              <TreeNodeRecursive
                key={node.id}
                node={node}
                depth={0}
                expandedNodes={expandedNodes}
                editingNode={editingNode}
                creatingChild={creatingChild}
                draggedNode={draggedNode}
                formData={formData}
                onToggle={toggleNode}
                onStartEdit={(node) => startEditing(node)}
                onStartCreate={(nodeId) => startCreating(nodeId)}
                onDelete={deleteRole}
                onDragStart={handleDragStart}
                onFormChange={setFormData}
                onSave={saveRole}
                onCancel={cancelEditing}
                canEditRole={canEditRole}
                hasPermission={hasPermission}
              />
            ))}
          </div>

          {treeData.length === 0 && (
            <EmptyState 
              canCreate={hasPermission('CREATE_ROLES')}
              onCreate={() => startCreating(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HierarchyTreeView;
```

---

## 📊 EXTRACTION SUMMARY

| Module | Lines | Purpose |
|--------|-------|---------|
| **types.ts** | 80 | Interfaces, types, re-exports |
| **hooks/useTreeData.ts** | 160 | Load data, build tree |
| **hooks/useTreeNavigation.ts** | 100 | Expand/collapse |
| **hooks/useTreeActions.ts** | 180 | CRUD operations |
| **hooks/useTreeDragDrop.ts** | 80 | Drag & drop |
| **components/TreeNode.tsx** | 140 | Single node rendering |
| **components/CreateChildForm.tsx** | 60 | Child creation form |
| **components/CreateRootForm.tsx** | 60 | Root creation form |
| **components/TreeNodeActions.tsx** | 80 | Action buttons |
| **components/TreeHeader.tsx** | 40 | Header & global actions |
| **components/EmptyState.tsx** | 20 | Empty state |
| **utils/treeHelpers.ts** | 60 | Pure functions |
| **utils/roleIcons.tsx** | 20 | Icon mapping |
| **HierarchyTreeView.tsx** | 220 | Main orchestration |
| **index.ts** | 10 | Barrel export |
| **Total** | **1,310L** | **15 files** |

**Size Comparison**:
- **Before**: 749L (1 file)
- **After**: ~1,310L (15 files) +561L (+75%)
- **Main Component**: 220L (-71% from original)
- **Avg File Size**: 87L per file ✅

**Why more lines?**:
- Explicit exports/imports (+200L)
- Type annotations (+100L)
- Component props interfaces (+150L)
- Better separation & documentation (+111L)
- **Result**: Clearer, testable, maintainable ✅

---

## ✅ QUALITY GATES

### Before Starting Day 1
- [x] File read completely (749L) ✅
- [x] Dependencies analyzed (React, lucide-react, services, hooks) ✅
- [x] Responsibilities identified (7 main areas) ✅
- [x] Extraction strategy created (15 files planned) ✅
- [ ] Backup created: `HierarchyTreeView.backup.tsx`
- [ ] Git commit: "refactor(phase3.7): Day 0 analysis complete"

### Success Criteria (Day 1-5)
- Main component <250L ✅ (target 220L)
- Avg module size <100L ✅ (target 87L)
- TypeScript 0 errors
- Build passing
- Zero breaking changes
- Default export preserved
- All functionality working

---

## 🚀 NEXT ACTIONS (Day 1 - Tomorrow)

1. **Create backup**:
   ```bash
   cp src/components/roles/HierarchyTreeView.tsx \
      src/components/roles/HierarchyTreeView.backup.tsx
   ```

2. **Create folder structure**:
   ```bash
   mkdir -p src/components/roles/HierarchyTreeView/{hooks,components,utils}
   ```

3. **Start with types.ts**: Lowest risk, high value

4. **Verify build after types**: `npm run build` → 0 errors

5. **Commit**: "refactor(phase3.7): Day 1 - types extraction"

---

**Fine Extraction Strategy**

*Pattern proven 6x. Ready for Day 1 execution with complete clarity on structure and targets.*
