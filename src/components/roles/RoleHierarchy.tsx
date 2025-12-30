/**
 * Component: RoleHierarchy
 * 
 * Main component for managing and displaying the role hierarchy.
 * Provides both tree and list views, with CRUD operations.
 * 
 * Refactored from 823 lines to ~230 lines using hooks composition pattern.
 */

import React from 'react';
import type { RoleHierarchy as RoleHierarchyType, UserRoleHierarchy } from '../../services/roles';
import RoleModal from './RoleModal';
import DeleteRoleModal from './DeleteRoleModal';
import MoveRoleModal from './MoveRoleModal';

// Import modular components and hooks
import { HierarchyHeader } from './RoleHierarchy/components/HierarchyHeader';
import { RoleLevelSection } from './RoleHierarchy/components/RoleLevelSection';
import { TreeViewWrapper } from './RoleHierarchy/components/TreeViewWrapper';
import { useHierarchyData } from './RoleHierarchy/hooks/useHierarchyData';
import { useTreeState } from './RoleHierarchy/hooks/useTreeState';
import { useRoleFilters } from './RoleHierarchy/hooks/useRoleFilters';
import { useRoleOperations } from './RoleHierarchy/hooks/useRoleOperations';
import type { RoleHierarchyProps } from './RoleHierarchy/types';

const RoleHierarchy: React.FC<RoleHierarchyProps> = ({ onRoleAssignment }) => {
  // Load hierarchy data
  const { hierarchy, currentUserHierarchy, loading, error, loadHierarchyData } = useHierarchyData();
  
  // Tree expansion and view mode
  const { 
    expandedLevels, 
    selectedRole, 
    viewMode, 
    toggleLevel,
    setSelectedRole, 
    setViewMode 
  } = useTreeState();
  
  // Filtering and search
  const {
    searchTerm,
    showOnlyAssignable,
    setSearchTerm,
    setShowOnlyAssignable,
    canAssignRole,
    isCurrentUserRole,
    getRolesByLevel,
    sortedLevels
  } = useRoleFilters({ hierarchy, currentUserHierarchy });
  
  // CRUD operations
  const {
    isRoleModalOpen,
    isDeleteModalOpen,
    isMoveModalOpen,
    editingRole,
    roleToDelete,
    roleToMove,
    handleCreateRole,
    handleEditRole,
    handleDeleteRole,
    handleMoveRole,
    handleRoleSubmit,
    handleRoleDeleteConfirm,
    handleRoleMoveConfirm,
    setIsRoleModalOpen,
    setIsDeleteModalOpen,
    setIsMoveModalOpen,
    setEditingRole,
    setRoleToDelete,
    setRoleToMove
  } = useRoleOperations({ onDataChange: loadHierarchyData });

  // Loading state
  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-4 text-lg font-medium text-gray-700">Caricamento gerarchia...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isAuthError = error.includes('Accesso non autorizzato') || error.includes('login');
    
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4 text-4xl">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Errore di Accesso</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            {isAuthError ? (
              <button
                onClick={() => window.location.href = '/login'}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Vai al Login
              </button>
            ) : (
              <button
                onClick={loadHierarchyData}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Riprova
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const rolesByLevel = getRolesByLevel;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <HierarchyHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        hierarchy={hierarchy}
        currentUserHierarchy={currentUserHierarchy}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showOnlyAssignable={showOnlyAssignable}
        setShowOnlyAssignable={setShowOnlyAssignable}
        onCreateRole={handleCreateRole}
      />

      {/* Main content - Tree or List view */}
      {viewMode === 'tree' ? (
        <TreeViewWrapper
          hierarchy={hierarchy}
          currentUserHierarchy={currentUserHierarchy}
          onRoleUpdate={async (roleId: string, roleData: any) => {
            await handleRoleSubmit(roleData);
            await loadHierarchyData();
          }}
          onRoleDelete={async (roleId: string) => {
            await handleRoleDeleteConfirm(roleId);
          }}
          onRoleMove={async (roleId: string, newParentId: string | null) => {
            const newLevel = newParentId && hierarchy[newParentId] ? hierarchy[newParentId].level + 1 : 1;
            await handleRoleMoveConfirm(roleId, newLevel);
          }}
          onDataChange={loadHierarchyData}
        />
      ) : (
        <div className="space-y-3">
          {sortedLevels.map((level) => {
            const roles = rolesByLevel[level];
            return (
              <RoleLevelSection
                key={level}
                level={level}
                roles={roles}
                isExpanded={expandedLevels.has(level)}
                onToggle={() => toggleLevel(level)}
                selectedRole={selectedRole}
                onRoleSelect={setSelectedRole}
                onRoleEdit={(roleType) => handleEditRole(roleType, hierarchy)}
                onRoleDelete={(roleType) => handleDeleteRole(roleType, hierarchy)}
                onRoleMove={(roleType) => handleMoveRole(roleType, hierarchy)}
                canAssignRole={canAssignRole}
                isCurrentUserRole={isCurrentUserRole}
                onRoleAssignment={
                  onRoleAssignment 
                    ? (roleType) => onRoleAssignment('', roleType)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
      
      {/* CRUD Modals */}
      <RoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setEditingRole(null);
        }}
        onSave={handleRoleSubmit as any}
        role={editingRole}
        mode={editingRole ? 'edit' : 'create'}
        hierarchy={hierarchy as RoleHierarchyType}
      />
      
      <DeleteRoleModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setRoleToDelete(null);
        }}
        onConfirm={async () => {
          if (roleToDelete) {
            await handleRoleDeleteConfirm(roleToDelete.roleType);
          }
        }}
        role={roleToDelete}
      />
      
      <MoveRoleModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setRoleToMove(null);
        }}
        onMove={async (newLevel) => {
          if (roleToMove) {
            await handleRoleMoveConfirm(roleToMove.roleType, newLevel);
          }
        }}
        role={roleToMove}
        hierarchy={hierarchy as RoleHierarchyType}
        currentLevel={roleToMove?.level || 0}
      />
    </div>
  );
};

export default RoleHierarchy;
