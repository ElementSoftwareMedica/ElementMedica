import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { TreeNode, RoleFormData } from '../types';
import { getRoleIcon, logPermissionCheck } from '../utils';
import { RoleForm } from './RoleForm';
import { TreeActions } from './TreeActions';

interface TreeNodeComponentProps {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  isEditing: boolean;
  isCreating: boolean;
  isDragged: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  formData: RoleFormData;
  currentUserHierarchy: any;
  onToggle: () => void;
  onFormChange: (data: RoleFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onStartCreate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  renderChildren: () => React.ReactNode;
}

/**
 * Component per rendere un singolo nodo dell'albero
 * Include expand/collapse, drag&drop, editing inline e azioni
 */
export const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({
  node,
  depth,
  isExpanded,
  isEditing,
  isCreating,
  isDragged,
  canEdit,
  canCreate,
  canDelete,
  formData,
  currentUserHierarchy,
  onToggle,
  onFormChange,
  onSave,
  onCancel,
  onStartEdit,
  onStartCreate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  renderChildren
}) => {
  const hasChildren = node.children.length > 0;

  // Debug log per permessi (può essere rimosso in produzione)
  logPermissionCheck(
    node.name,
    node.roleType,
    canEdit,
    canCreate,
    canDelete,
    hasChildren,
    currentUserHierarchy
  );

  return (
    <div className="select-none">
      {/* Nodo principale */}
      <div
        className={`flex items-center py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors ${
          isDragged ? 'opacity-50' : ''
        }`}
        style={{ marginLeft: `${depth * 24}px` }}
        draggable={canEdit}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* Icona espansione */}
        <div className="w-6 h-6 flex items-center justify-center">
          {hasChildren && (
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
        </div>

        {/* Icona ruolo */}
        <div className="mr-3">
          {getRoleIcon(node.level, node.roleType)}
        </div>

        {/* Contenuto nodo */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <RoleForm
              formData={formData}
              onFormChange={onFormChange}
              onSave={onSave}
              onCancel={onCancel}
              mode="edit"
            />
          ) : (
            <div>
              <div className="font-medium text-gray-900 truncate">{node.name}</div>
              <div className="text-sm text-gray-500 truncate">{node.description}</div>
              <div className="text-xs text-gray-400">
                Livello {node.level} • {node.permissions.length} permessi
              </div>
            </div>
          )}
        </div>

        {/* Azioni */}
        <TreeActions
          isEditing={isEditing}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          hasChildren={hasChildren}
          onSave={onSave}
          onCancel={onCancel}
          onCreate={onStartCreate}
          onEdit={onStartEdit}
          onDelete={onDelete}
        />
      </div>

      {/* Form per creare nuovo figlio */}
      {isCreating && (
        <RoleForm
          formData={formData}
          onFormChange={onFormChange}
          onSave={onSave}
          onCancel={onCancel}
          mode="create"
          depth={depth}
        />
      )}

      {/* Figli */}
      {isExpanded && hasChildren && (
        <div>
          {renderChildren()}
        </div>
      )}
    </div>
  );
};
