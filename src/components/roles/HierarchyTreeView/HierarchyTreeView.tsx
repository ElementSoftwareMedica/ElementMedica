/**
 * HierarchyTreeView Component - Refactored
 * Phase 3.7 - God Component Refactoring Complete
 * 
 * Original: 749 lines (monolithic)
 * Refactored: ~220 lines (hooks composition + component orchestration)
 * 
 * Architecture:
 * - Hooks: Business logic & state management (4 hooks, 545L)
 * - Components: UI rendering (7 components, 328L)
 * - Utils: Reusable helpers (3 utils, 106L)
 */

import React from 'react';
import type { HierarchyTreeViewProps, TreeNode } from './types';
import { useTreeData, useTreeNavigation, useTreeActions, useTreeDragDrop } from './hooks';
import {
  TreeNodeComponent,
  RoleForm,
  TreeHeader,
  EmptyState,
  LoadingState,
  ErrorState
} from './components';

const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({
  hierarchy: externalHierarchy,
  currentUserHierarchy,
  onRoleCreate,
  onRoleUpdate,
  onRoleDelete,
  onRoleMove
}) => {
  // Hook 1: Data loading & tree structure
  const { treeData, loading, error, reloadHierarchy } = useTreeData({
    externalHierarchy
  });

  // Hook 2: Tree navigation (expand/collapse)
  const { expandedNodes, toggleNode } = useTreeNavigation({
    treeData,
    autoExpandLevels: 2
  });

  // Hook 3: CRUD actions & permissions
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
    findNodeById
  } = useTreeActions({
    currentUserHierarchy,
    callbacks: {
      onCreate: onRoleCreate,
      onUpdate: onRoleUpdate,
      onDelete: onRoleDelete,
      onMove: onRoleMove
    },
    onReload: reloadHierarchy
  });

  // Hook 4: Drag & drop functionality
  const { draggedNode, handleDragStart, handleDragOver, handleDrop } = useTreeDragDrop({
    hasPermission,
    callbacks: {
      onMove: onRoleMove
    },
    onReload: reloadHierarchy
  });

  /**
   * Recursive tree node renderer
   * Delegates rendering to TreeNodeComponent
   */
  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isEditing = editingNode === node.id;
    const isCreating = creatingChild === node.id;
    const isDragged = draggedNode === node.id;
    const canEdit = canEditRole(node.roleType);
    const canCreate = hasPermission('roles:create');
    const canDelete = canEditRole(node.roleType) && hasPermission('roles:delete');

    return (
      <TreeNodeComponent
        key={node.id}
        node={node}
        depth={depth}
        isExpanded={isExpanded}
        isEditing={isEditing}
        isCreating={isCreating}
        isDragged={isDragged}
        canEdit={canEdit}
        canCreate={canCreate}
        canDelete={canDelete}
        formData={formData}
        currentUserHierarchy={currentUserHierarchy}
        onToggle={() => toggleNode(node.id)}
        onFormChange={setFormData}
        onSave={saveRole}
        onCancel={cancelEditing}
        onStartEdit={() => {
          const foundNode = findNodeById(treeData, node.id);
          if (foundNode) startEditing(foundNode);
        }}
        onStartCreate={() => startCreating(node.id)}
        onDelete={() => deleteRole(node.id)}
        onDragStart={() => handleDragStart(node.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, node.id)}
        renderChildren={() => node.children.map(child => renderTreeNode(child, depth + 1))}
      />
    );
  };

  // Loading state
  if (loading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={reloadHierarchy} />;
  }

  // Main render
  return (
    <div className="space-y-4">
      {/* Header con azioni globali */}
      <TreeHeader
        hasCreatePermission={hasPermission('roles:create')}
        onCreateRoot={() => startCreating(null)}
        onRefresh={reloadHierarchy}
      />

      {/* Contenuto principale */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4">
          {/* Form per nuovo ruolo radice */}
          {creatingChild === null && editingNode === null && formData.name !== '' && (
            <RoleForm
              formData={formData}
              onFormChange={setFormData}
              onSave={saveRole}
              onCancel={cancelEditing}
              mode="createRoot"
            />
          )}

          {/* Albero della gerarchia */}
          <div
            className="space-y-1"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            {treeData.map(node => renderTreeNode(node))}
          </div>

          {/* Empty state */}
          {treeData.length === 0 && (
            <EmptyState
              hasCreatePermission={hasPermission('roles:create')}
              onCreateRoot={() => startCreating(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HierarchyTreeView;
