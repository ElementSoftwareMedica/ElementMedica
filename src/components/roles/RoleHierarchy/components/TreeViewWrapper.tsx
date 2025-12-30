/**
 * Component: TreeViewWrapper
 * 
 * Wrapper for the HierarchyTreeView component with CRUD operations.
 */

import React from 'react';
import HierarchyTreeView from '../../HierarchyTreeView';
import { createRole, UserRoleHierarchy } from '../../../../services/roles';
import { useToast } from '../../../../hooks/useToast';
import type { RoleHierarchyType } from '../types';

interface TreeViewWrapperProps {
  hierarchy: RoleHierarchyType;
  currentUserHierarchy: UserRoleHierarchy | null;
  onRoleUpdate: (roleId: string, roleData: any) => Promise<void>;
  onRoleDelete: (roleId: string) => Promise<void>;
  onRoleMove: (roleId: string, newParentId: string | null) => Promise<void>;
  onDataChange: () => Promise<void>;
}

export const TreeViewWrapper: React.FC<TreeViewWrapperProps> = ({
  hierarchy,
  currentUserHierarchy,
  onRoleUpdate,
  onRoleDelete,
  onRoleMove,
  onDataChange
}) => {
  const { showToast } = useToast();

  const handleRoleCreate = async (parentId: string | null, roleData: any) => {
    try {
      // Prepara i dati per il backend come custom role
      const roleDataForBackend = {
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions || []
      };
      
      console.log('Creating custom role with data:', roleDataForBackend);
      await createRole(roleDataForBackend);
      
      showToast({ message: "Il nuovo ruolo è stato creato con successo.", type: 'success' });
      
      await onDataChange();
    } catch (error: unknown) {
      console.error('Error creating role:', error);
      showToast({ message: (error as Error).message || "Si è verificato un errore durante la creazione del ruolo.", type: 'error' });
    }
  };

  return (
    <HierarchyTreeView
      hierarchy={hierarchy}
      currentUserHierarchy={currentUserHierarchy}
      onRoleCreate={handleRoleCreate}
      onRoleUpdate={onRoleUpdate}
      onRoleDelete={onRoleDelete}
      onRoleMove={onRoleMove}
    />
  );
};
