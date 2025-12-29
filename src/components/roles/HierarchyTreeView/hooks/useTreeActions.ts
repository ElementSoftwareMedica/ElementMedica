import { useState } from 'react';
import type { TreeNode, RoleFormData, TreeActionCallbacks, UserRoleHierarchy } from '../types';
import { Role } from '../../../../hooks/useRoles';

interface UseTreeActionsOptions {
  currentUserHierarchy: UserRoleHierarchy | null;
  callbacks?: TreeActionCallbacks;
  onReload?: () => Promise<void>;
}

interface UseTreeActionsReturn {
  editingNode: string | null;
  creatingChild: string | null;
  formData: RoleFormData;
  setFormData: React.Dispatch<React.SetStateAction<RoleFormData>>;
  canEditRole: (roleType: string) => boolean;
  hasPermission: (permission: string) => boolean;
  startEditing: (node: TreeNode) => void;
  startCreating: (parentId: string | null, parentNode?: TreeNode | null) => void;
  saveRole: () => Promise<void>;
  deleteRole: (nodeId: string) => Promise<void>;
  cancelEditing: () => void;
  findNodeById: (nodes: TreeNode[], id: string) => TreeNode | null;
}

/**
 * Hook per la gestione delle azioni CRUD sui ruoli
 * Gestisce editing, creazione, eliminazione e permessi
 */
export const useTreeActions = ({
  currentUserHierarchy,
  callbacks,
  onReload
}: UseTreeActionsOptions): UseTreeActionsReturn => {
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [creatingChild, setCreatingChild] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    roleType: '',
    permissions: [],
    level: 1
  });

  const canEditRole = (roleType: string): boolean => {
    if (!currentUserHierarchy) return false;

    // Se l'utente ha ALL_PERMISSIONS o è SUPER_ADMIN/ADMIN, può modificare tutto
    if (currentUserHierarchy.assignablePermissions?.includes('ALL_PERMISSIONS') ||
      currentUserHierarchy.userRoles?.includes('SUPER_ADMIN') ||
      currentUserHierarchy.userRoles?.includes('ADMIN')) {
      return true;
    }

    // Fallback: se l'utente ha globalRole ADMIN, permettiamo modifiche
    const userPersonInfo = currentUserHierarchy.personRoles?.[0]?.person || currentUserHierarchy;
    if (userPersonInfo?.globalRole === 'ADMIN' || userPersonInfo?.globalRole === 'SUPER_ADMIN') {
      return true;
    }

    // I ruoli assegnabili potrebbero essere oggetti con proprietà type/name
    return currentUserHierarchy.assignableRoles?.some((role: any) => {
      const roleTypeToCheck = typeof role === 'object' ? (role.type || role.name) : role;
      return roleTypeToCheck === roleType;
    }) || false;
  };

  const hasPermission = (permission: string): boolean => {
    console.log('🔍 Checking permission:', permission);
    console.log('📊 currentUserHierarchy:', currentUserHierarchy);

    if (!currentUserHierarchy) {
      console.log('❌ No currentUserHierarchy found');
      return false;
    }

    // Se l'utente ha ALL_PERMISSIONS o è SUPER_ADMIN/ADMIN, ha tutti i permessi
    if (currentUserHierarchy.assignablePermissions?.includes('ALL_PERMISSIONS') ||
      currentUserHierarchy.userRoles?.includes('SUPER_ADMIN') ||
      currentUserHierarchy.userRoles?.includes('ADMIN')) {
      console.log('✅ User has ALL_PERMISSIONS or SUPER_ADMIN/ADMIN role');
      return true;
    }

    // Fallback: se l'utente ha globalRole ADMIN, permettiamo tutto
    const userPersonInfo = currentUserHierarchy.personRoles?.[0]?.person || currentUserHierarchy;
    if (userPersonInfo?.globalRole === 'ADMIN' || userPersonInfo?.globalRole === 'SUPER_ADMIN') {
      console.log('✅ User has globalRole ADMIN/SUPER_ADMIN, granting permission');
      return true;
    }

    const hasPermissionResult = currentUserHierarchy.assignablePermissions?.includes(permission) || false;
    console.log(`🎯 Permission ${permission} result:`, hasPermissionResult);
    console.log('📋 Available permissions:', currentUserHierarchy.assignablePermissions);

    return hasPermissionResult;
  };

  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
    return null;
  };

  const startEditing = (node: TreeNode) => {
    if (!canEditRole(node.roleType)) return;

    setEditingNode(node.id);
    setFormData({
      name: node.name,
      description: node.description,
      roleType: node.roleType,
      permissions: node.permissions,
      level: node.level
    });
  };

  const startCreating = (parentId: string | null, parentNode?: TreeNode | null) => {
    if (!hasPermission('CREATE_ROLES')) return;

    const newLevel = parentNode ? parentNode.level + 1 : 1;

    setCreatingChild(parentId);
    setFormData({
      name: '',
      description: '',
      roleType: '',
      permissions: [],
      level: newLevel
    });
  };

  const saveRole = async () => {
    try {
      if (editingNode) {
        // Modifica ruolo esistente
        if (callbacks?.onUpdate) {
          await callbacks.onUpdate(editingNode, {
            ...formData,
            type: formData.roleType
          });
        }
      } else if (creatingChild !== null) {
        // Crea nuovo ruolo
        if (callbacks?.onCreate) {
          await callbacks.onCreate(creatingChild, {
            ...formData,
            type: formData.roleType
          });
        }
      }

      // Ricarica i dati
      if (onReload) {
        await onReload();
      }
      cancelEditing();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const deleteRole = async (nodeId: string) => {
    if (!canEditRole(nodeId) || !hasPermission('DELETE_ROLES')) return;

    if (window.confirm('Sei sicuro di voler eliminare questo ruolo? Questa azione non può essere annullata.')) {
      try {
        if (callbacks?.onDelete) {
          await callbacks.onDelete(nodeId);
        }
        if (onReload) {
          await onReload();
        }
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  const cancelEditing = () => {
    setEditingNode(null);
    setCreatingChild(null);
    setFormData({
      name: '',
      description: '',
      roleType: '',
      permissions: [],
      level: 1
    });
  };

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
    findNodeById
  };
};
