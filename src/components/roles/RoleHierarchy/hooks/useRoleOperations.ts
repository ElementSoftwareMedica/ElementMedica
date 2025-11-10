/**
 * Hook: useRoleOperations
 * 
 * Manages CRUD operations for roles (Create, Update, Delete, Move).
 * Handles complex permission formatting and API interactions.
 */

import { useState } from 'react';
import { 
  createRole, 
  updateRole, 
  updateSystemRolePermissions,
  deleteRole,
  moveRoleInHierarchy,
  rolesService
} from '../../../../services/roles';
import { toast } from 'react-hot-toast';
import type { RoleFormData, RoleEditData, FullPermission } from '../types';

interface UseRoleOperationsProps {
  onDataChange: () => Promise<void>;
}

export const useRoleOperations = ({ onDataChange }: UseRoleOperationsProps) => {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleEditData | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<RoleEditData | null>(null);
  const [roleToMove, setRoleToMove] = useState<RoleEditData | null>(null);

  /**
   * Opens the role modal for creating a new role
   */
  const handleCreateRole = () => {
    setEditingRole(null);
    setIsRoleModalOpen(true);
  };

  /**
   * Opens the role modal for editing an existing role
   */
  const handleEditRole = (roleType: string, hierarchy: any) => {
    if (!hierarchy || !hierarchy[roleType]) {
      toast.error("Ruolo non trovato nella gerarchia.");
      return;
    }
    const roleData = hierarchy[roleType];
    setEditingRole({ roleType, ...roleData });
    setIsRoleModalOpen(true);
  };

  /**
   * Opens the delete confirmation modal
   */
  const handleDeleteRole = (roleType: string, hierarchy: any) => {
    if (!hierarchy || !hierarchy[roleType]) {
      toast.error("Ruolo non trovato nella gerarchia.");
      return;
    }
    const roleData = hierarchy[roleType];
    setRoleToDelete({ roleType, ...roleData });
    setIsDeleteModalOpen(true);
  };

  /**
   * Opens the move role modal
   */
  const handleMoveRole = (roleType: string, hierarchy: any) => {
    if (!hierarchy || !hierarchy[roleType]) {
      toast.error("Ruolo non trovato nella gerarchia.");
      return;
    }
    const roleData = hierarchy[roleType];
    setRoleToMove({ roleType, ...roleData });
    setIsMoveModalOpen(true);
  };

  /**
   * Handles role creation or update submission
   */
  const handleRoleSubmit = async (roleData: RoleFormData) => {
    try {
      // Converte i permessi dal formato del modal al formato atteso dal backend
      let permissions: string[] = [];
      let fullPermissions: FullPermission[] = [];
      
      console.log('🔧 Original permissions from modal:', roleData.permissions);
      
      if (roleData.permissions) {
        if (Array.isArray(roleData.permissions)) {
          // Se è già un array di oggetti con il formato corretto, usalo direttamente
          if (roleData.permissions.length > 0 && typeof roleData.permissions[0] === 'object' && 'permissionId' in roleData.permissions[0]) {
            fullPermissions = roleData.permissions as unknown as FullPermission[];
            permissions = fullPermissions.filter((p) => p.granted && p.permissionId && p.permissionId.trim() !== '').map((p) => p.permissionId.trim());
          } else {
            // Se è un array di stringhe, convertilo
            permissions = roleData.permissions
              .map((perm: unknown) => {
                if (typeof perm === 'string') return perm;
                if (perm && typeof perm === 'object' && 'permissionId' in perm) {
                  return (perm as { permissionId: string }).permissionId;
                }
                return '';
              })
              .filter((p: string) => p && typeof p === 'string' && p.trim() !== '')
              .map((p: string) => p.trim());
            fullPermissions = permissions.map(permissionId => ({
              permissionId,
              granted: true,
              scope: 'all',
              tenantIds: [],
              fieldRestrictions: []
            }));
          }
        } else if (typeof roleData.permissions === 'object') {
          // Se è un oggetto Record<string, boolean>, convertilo
          permissions = Object.entries(roleData.permissions)
            .filter(([permissionId, granted]) => granted && permissionId && permissionId.trim() !== '')
            .map(([permissionId]) => permissionId.trim());
          fullPermissions = Object.entries(roleData.permissions)
            .filter(([permissionId]) => permissionId && permissionId.trim() !== '')
            .map(([permissionId, granted]) => ({
              permissionId: permissionId.trim(),
              granted: Boolean(granted),
              scope: 'all',
              tenantIds: [],
              fieldRestrictions: []
            }));
        }
      }

      console.log('🔧 Processed permissions:', permissions);
      console.log('🔧 Permissions count:', permissions.length);
      console.log('🔧 Full permissions:', fullPermissions);

      if (editingRole) {
        // Aggiorna ruolo esistente
        console.log('🔧 Updating role with data:', { ...roleData, permissions });
        
        // Per i ruoli personalizzati, aggiorna sia i dati base che i permessi
        if (editingRole.roleType.startsWith('CUSTOM_')) {
          // Estrai l'ID del ruolo personalizzato
          const customRoleId = editingRole.roleType.replace('CUSTOM_', '');
          
          // Aggiorna il ruolo personalizzato con i permessi (usa array di stringhe)
          const updateData = {
            name: roleData.name,
            description: roleData.description,
            permissions: permissions // Array di stringhe per ruoli personalizzati
          };
          
          await rolesService.updateCustomRole(customRoleId, updateData);
        } else {
          // Per i ruoli di sistema, aggiorna prima i dati base
          await updateRole(editingRole.roleType, {
            name: roleData.name,
            description: roleData.description
          });
          
          // Prepara il formato corretto per l'endpoint /permissions dei ruoli di sistema
          // Il backend si aspetta un array di oggetti con permissionId, granted, scope, etc.
          const systemRolePermissions = permissions.map(permissionId => ({
            permissionId: permissionId.trim().toUpperCase(), // Normalizza il permissionId
            granted: true,
            scope: 'all',
            tenantIds: [],
            fieldRestrictions: []
          }));
          
          console.log('🔧 Formatted permissions for backend:', systemRolePermissions);
          
          // Usa updateSystemRolePermissions che chiama l'endpoint /permissions
          await updateSystemRolePermissions(editingRole.roleType, systemRolePermissions);
        }
        
        toast.success("Il ruolo è stato aggiornato con successo.");
      } else {
        // Crea nuovo custom role (usa array di stringhe)
        const customRoleData = {
          name: roleData.name,
          description: roleData.description,
          level: roleData.level || 1,
          parentRoleType: roleData.parentRoleType || null,
          permissions: permissions
        };
        
        console.log('🔧 Creating role with data:', customRoleData);
        await createRole(customRoleData);
        toast.success("Il nuovo ruolo è stato creato con successo.");
      }
      
      // Ricarica i dati
      await onDataChange();
      setIsRoleModalOpen(false);
      setEditingRole(null);
    } catch (error: unknown) {
      console.error('❌ Error in handleRoleSubmit:', error);
      toast.error((error as Error).message || "Si è verificato un errore durante il salvataggio.");
    }
  };

  /**
   * Handles role deletion
   */
  const handleRoleDeleteConfirm = async (roleType: string) => {
    try {
      await deleteRole(roleType);
      toast.success("Il ruolo è stato eliminato con successo.");
      
      // Ricarica i dati
      await onDataChange();
      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Si è verificato un errore durante l'eliminazione.");
    }
  };

  /**
   * Handles role move to different level/parent
   */
  const handleRoleMoveConfirm = async (roleType: string, newLevel: number, parentRoleType?: string) => {
    try {
      // Usa il nuovo servizio per spostare il ruolo
      await moveRoleInHierarchy(roleType, newLevel, parentRoleType);
      
      toast.success(`Il ruolo è stato spostato con successo al livello ${newLevel}${parentRoleType ? ` sotto ${parentRoleType}` : ''}.`);
      
      // Ricarica i dati
      await onDataChange();
      setIsMoveModalOpen(false);
      setRoleToMove(null);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Si è verificato un errore durante lo spostamento.");
    }
  };

  /**
   * Closes all modals and resets state
   */
  const closeModals = () => {
    setIsRoleModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsMoveModalOpen(false);
    setEditingRole(null);
    setRoleToDelete(null);
    setRoleToMove(null);
  };

  return {
    // Modal state
    isRoleModalOpen,
    isDeleteModalOpen,
    isMoveModalOpen,
    editingRole,
    roleToDelete,
    roleToMove,
    
    // Handlers
    handleCreateRole,
    handleEditRole,
    handleDeleteRole,
    handleMoveRole,
    handleRoleSubmit,
    handleRoleDeleteConfirm,
    handleRoleMoveConfirm,
    closeModals,
    
    // State setters (for modal control)
    setIsRoleModalOpen,
    setIsDeleteModalOpen,
    setIsMoveModalOpen,
    setEditingRole,
    setRoleToDelete,
    setRoleToMove
  };
};
