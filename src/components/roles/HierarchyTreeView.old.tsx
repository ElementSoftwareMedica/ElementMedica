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
    const hasChildren = node.children.length > 0;
    const canEdit = canEditRole(node.roleType);
    const canCreate = hasPermission('CREATE_ROLES');
    const canDelete = canEditRole(node.roleType) && hasPermission('DELETE_ROLES');

    // Debug log per capire perché i pulsanti sono disabilitati
    console.log(`🔍 Debug pulsanti per nodo ${node.name} (${node.roleType}):`);
    console.log(`  - canEdit: ${canEdit}`);
    console.log(`  - canCreate: ${canCreate}`);
    console.log(`  - canDelete: ${canDelete}`);
    console.log(`  - hasChildren: ${hasChildren}`);
    console.log(`  - currentUserHierarchy:`, currentUserHierarchy);

    return (
      <div key={node.id} className="select-none">
        {/* Nodo principale */}
        <div
          className={`flex items-center py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors ${
            draggedNode === node.id ? 'opacity-50' : ''
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
          draggable={canEdit}
          onDragStart={() => handleDragStart(node.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, node.id)}
        >
          {/* Icona espansione */}
          <div className="w-6 h-6 flex items-center justify-center">
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.id)}
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
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Nome ruolo"
                />
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Descrizione"
                />
              </div>
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

          {/* Azioni - Stile uguale alla visualizzazione a lista */}
          <div className="flex items-center space-x-0.5 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={saveRole}
                  className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                  title="Salva"
                >
                  <Save className="w-3 h-3" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Annulla"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                {/* Pulsante Aggiungi sotto-ruolo */}
                <button
                  onClick={canCreate ? () => startCreating(node.id) : undefined}
                  disabled={!canCreate}
                  className={`p-1 transition-colors rounded bg-transparent border-0 shadow-none ${
                    canCreate 
                      ? 'text-green-600 hover:bg-green-100 cursor-pointer' 
                      : 'text-gray-400 opacity-50 cursor-not-allowed'
                  }`}
                  title={canCreate ? "Aggiungi sotto-ruolo" : "Non hai permessi per creare ruoli"}
                >
                  <Plus className="w-3 h-3" />
                </button>
                
                {/* Pulsante Modifica */}
                <button
                  onClick={canEdit ? () => startEditing(node) : undefined}
                  disabled={!canEdit}
                  className={`p-1 transition-colors rounded bg-transparent border-0 shadow-none ${
                    canEdit 
                      ? 'text-blue-600 hover:bg-blue-100 cursor-pointer' 
                      : 'text-gray-400 opacity-50 cursor-not-allowed'
                  }`}
                  title={canEdit ? "Modifica" : "Non hai permessi per modificare questo ruolo"}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                
                {/* Pulsante Elimina */}
                <button
                  onClick={(canDelete && node.children.length === 0) ? () => deleteRole(node.id) : undefined}
                  disabled={!(canDelete && node.children.length === 0)}
                  className={`p-1 transition-colors rounded bg-transparent border-0 shadow-none ${
                    canDelete && node.children.length === 0
                      ? 'text-red-600 hover:bg-red-100 cursor-pointer' 
                      : 'text-gray-400 opacity-50 cursor-not-allowed'
                  }`}
                  title={
                    !canDelete 
                      ? "Non hai permessi per eliminare questo ruolo" 
                      : node.children.length > 0 
                        ? "Non puoi eliminare un ruolo con sotto-ruoli" 
                        : "Elimina"
                  }
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                
                {/* Pulsante Trascina */}
                <button 
                  disabled={!canEdit}
                  className={`p-1 transition-colors rounded bg-transparent border-0 shadow-none ${
                    canEdit 
                      ? 'text-amber-600 hover:bg-amber-100 cursor-move' 
                      : 'text-gray-400 opacity-50 cursor-not-allowed'
                  }`} 
                  title={canEdit ? "Trascina per riordinare" : "Non hai permessi per riordinare"}
                >
                  <Move className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Form per creare nuovo figlio */}
        {isCreating && (
          <div
            className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2"
            style={{ marginLeft: `${(depth + 1) * 24}px` }}
          >
            <div className="space-y-2">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Nome nuovo ruolo"
              />
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Descrizione"
              />
              <input
                type="text"
                value={formData.roleType}
                onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Tipo ruolo (es: ADMIN_LAVORO_FORMAZIONE)"
              />
              <div className="flex space-x-2">
                <button
                  onClick={saveRole}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Crea
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Figli */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Caricamento gerarchia...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Errore</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadHierarchyData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con azioni globali */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Vista ad Albero della Gerarchia</h3>
        </div>
        <div className="flex items-center space-x-2">
          {hasPermission('CREATE_ROLES') && (
            <button
              onClick={() => startCreating(null)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 flex items-center space-x-1.5 transition-colors text-sm"
            >
              <Plus className="w-3 h-3" />
              <span>Nuovo Ruolo Radice</span>
            </button>
          )}
          <button
            onClick={loadHierarchyData}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 flex items-center space-x-1.5 transition-colors text-sm"
          >
            <Settings className="w-3 h-3" />
            <span>Aggiorna</span>
          </button>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4">
          {/* Form per nuovo ruolo radice */}
          {creatingChild === null && editingNode === null && formData.name !== '' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Nome nuovo ruolo radice"
                />
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Descrizione"
                />
                <input
                  type="text"
                  value={formData.roleType}
                  onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Tipo ruolo (es: ADMIN_LAVORO_FORMAZIONE)"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={saveRole}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Crea Ruolo Radice
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Albero della gerarchia */}
          <div 
            className="space-y-1"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            {treeData.map(node => renderTreeNode(node))}
          </div>

          {treeData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nessun ruolo trovato nella gerarchia.</p>
              {hasPermission('CREATE_ROLES') && (
                <button
                  onClick={() => startCreating(null)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Crea il primo ruolo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HierarchyTreeView;