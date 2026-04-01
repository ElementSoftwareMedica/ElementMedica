/**
 * useRoleForm Hook
 * 
 * Manages role form fields (name, description, level, parentRoleType)
 * and form initialization for create/edit modes.
 */

import { useState, useEffect } from 'react';
import { rolesService } from '../../../../services/roles';
import { Role } from '../../../../hooks/useRoles';
import type { RoleFormData, RoleEditData } from '../types';

interface UseRoleFormReturn {
  formData: RoleFormData;
  handleInputChange: (field: string, value: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  setFormDataPermissions: (permissions: Record<string, boolean>) => void;
}

/**
 * Hook for managing role form state
 */
export const useRoleForm = (
  isOpen: boolean,
  mode: 'create' | 'edit',
  role?: Role | RoleEditData | null
): UseRoleFormReturn => {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    level: '1',
    parentRoleType: '',
    permissions: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && role) {
        setFormData({
          name: role.name || '',
          description: role.description || '',
          level: (role.level || 1).toString(),
          parentRoleType: '',
          permissions: {} // Will be loaded separately
        });
        // Load role permissions from backend
        const roleType = (role as any).type || (role as any).roleType;
        if (roleType) {
          loadRolePermissions(roleType);
        }
      } else {
        setFormData({
          name: '',
          description: '',
          level: '1',
          parentRoleType: '',
          permissions: {}
        });
      }
      setError(null);
    }
  }, [isOpen, mode, role]);

  const loadRolePermissions = async (roleType: string) => {
    try {
      
      const rolePermissions = await rolesService.getRolePermissions(roleType);
      
      // Convert array of permissions to Record<string, boolean>
      const permissionsMap: Record<string, boolean> = {};
      if (Array.isArray(rolePermissions)) {
        rolePermissions.forEach((permission: string) => {
          // Backend returns permissions already normalized (uppercase)
          // Use them directly as keys
          permissionsMap[permission] = true;
        });
      } else {
      }
      
      
      // Update form with loaded permissions
      setFormData(prev => {
        const newFormData = {
          ...prev,
          permissions: permissionsMap
        };
        return newFormData;
      });
      
    } catch (error) {
      setError('Errore nel caricamento dei permessi del ruolo');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const setFormDataPermissions = (permissions: Record<string, boolean>) => {
    setFormData(prev => ({
      ...prev,
      permissions
    }));
  };

  return {
    formData,
    handleInputChange,
    loading,
    setLoading,
    error,
    setError,
    setFormDataPermissions
  };
};
