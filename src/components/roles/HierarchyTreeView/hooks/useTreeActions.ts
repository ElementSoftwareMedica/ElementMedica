import { useState } from 'react';
import type { TreeNode, RoleFormData, TreeActionCallbacks, UserRoleHierarchy } from '../types';
import { Role } from '../../../../hooks/useRoles';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

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
  const { confirmDelete } = useConfirmDialog();
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
    const userPersonInfo = (currentUserHierarchy as any).personRoles?.[0]?.person || currentUserHierarchy;
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

    if (!currentUserHierarchy) {
      return false;
    }

    // Se l'utente ha ALL_PERMISSIONS o è SUPER_ADMIN/ADMIN, ha tutti i permessi
    if (currentUserHierarchy.assignablePermissions?.includes('ALL_PERMISSIONS') ||
      currentUserHierarchy.userRoles?.includes('SUPER_ADMIN') ||
      currentUserHierarchy.userRoles?.includes('ADMIN')) {
      return true;
    }

    // Fallback: se l'utente ha globalRole ADMIN, permettiamo tutto
    const userPersonInfo2 = (currentUserHierarchy as any).personRoles?.[0]?.person || currentUserHierarchy;
    if (userPersonInfo2?.globalRole === 'ADMIN' || userPersonInfo2?.globalRole === 'SUPER_ADMIN') {
      return true;
    }

    const hasPermissionResult = currentUserHierarchy.assignablePermissions?.includes(permission) || false;

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
    if (!hasPermission('roles:create')) return;

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
    }
  };

  const deleteRole = async (nodeId: string) => {
    if (!canEditRole(nodeId) || !hasPermission('roles:delete')) return;

    const confirmed = await confirmDelete('ruolo');
    if (confirmed) {
      try {
        if (callbacks?.onDelete) {
          await callbacks.onDelete(nodeId);
        }
        if (onReload) {
          await onReload();
        }
      } catch (error) {
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
