/**
 * usePermissionState Hook
 * 
 * Manages permission checkbox state and bulk operations
 * (select all, select none, select group).
 */

import { useState, useCallback } from 'react';
import type { PermissionGroup, EntityGroup, Permission } from '../types';

interface UsePermissionStateReturn {
  selectedPermissions: Record<string, boolean>;
  selectedPermissionGroup: string | null;
  setSelectedPermissionGroup: (group: string | null) => void;
  handlePermissionChange: (permissionKey: string, checked: boolean) => void;
  handleSelectAllPermissions: () => void;
  handleSelectNoPermissions: () => void;
  handleSelectGroupPermissions: (groupKey: string, selectAll: boolean) => void;
  getSelectedPermissionsCount: (groupPermissions: Permission[]) => number;
  totalSelectedPermissions: number;
  setSelectedPermissions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

/**
 * Hook for managing permission selection state
 */
export const usePermissionState = (
  availablePermissions: Record<string, PermissionGroup>,
  entityGroups: EntityGroup[]
): UsePermissionStateReturn => {
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});
  const [selectedPermissionGroup, setSelectedPermissionGroup] = useState<string | null>(null);

  const handlePermissionChange = useCallback((permissionKey: string, checked: boolean) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [permissionKey]: checked
    }));
  }, []);

  const handleSelectAllPermissions = useCallback(() => {
    const allPermissions: Record<string, boolean> = {};
    
    // Select all permissions from existing categories
    Object.values(availablePermissions).forEach(group => {
      group.permissions.forEach(permission => {
        allPermissions[permission.key] = true;
      });
    });
    
    // Select all entity permissions
    entityGroups.forEach(entityGroup => {
      entityGroup.permissions.forEach(permission => {
        allPermissions[permission.key] = true;
      });
    });
    
    setSelectedPermissions(allPermissions);
  }, [availablePermissions, entityGroups]);

  const handleSelectNoPermissions = useCallback(() => {
    setSelectedPermissions({});
  }, []);

  const handleSelectGroupPermissions = useCallback((groupKey: string, selectAll: boolean) => {
    setSelectedPermissions(prev => {
      const newPermissions = { ...prev };
      
      if (groupKey.startsWith('entity_')) {
        // Handle entity groups
        const entityIndex = parseInt(groupKey.replace('entity_', ''));
        const entityGroup = entityGroups[entityIndex];
        if (entityGroup) {
          entityGroup.permissions.forEach(permission => {
            if (selectAll) {
              newPermissions[permission.key] = true;
            } else {
              delete newPermissions[permission.key];
            }
          });
        }
      } else {
        // Handle existing permission groups
        const group = availablePermissions[groupKey];
        if (group) {
          group.permissions.forEach(permission => {
            if (selectAll) {
              newPermissions[permission.key] = true;
            } else {
              delete newPermissions[permission.key];
            }
          });
        }
      }
      
      return newPermissions;
    });
  }, [availablePermissions, entityGroups]);

  const getSelectedPermissionsCount = useCallback((groupPermissions: Permission[]) => {
    return groupPermissions.filter(perm => selectedPermissions[perm.key]).length;
  }, [selectedPermissions]);

  const totalSelectedPermissions = Object.values(selectedPermissions).filter(Boolean).length;

  return {
    selectedPermissions,
    selectedPermissionGroup,
    setSelectedPermissionGroup,
    handlePermissionChange,
    handleSelectAllPermissions,
    handleSelectNoPermissions,
    handleSelectGroupPermissions,
    getSelectedPermissionsCount,
    totalSelectedPermissions,
    setSelectedPermissions
  };
};
