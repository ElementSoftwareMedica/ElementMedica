import { useState } from 'react';
import { rolesService } from '../services/roles';

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface RolePermission {
  permissionId: string;
  entityType: string;
  action: string;
  granted: boolean;
  scope: string;
  tenantIds: number[];
  fieldRestrictions: string[];
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await rolesService.getPermissions();
      setPermissions(response);
    } catch (error) {
      console.error('Errore nel caricamento dei permessi:', error);
      setError('Errore nel caricamento dei permessi');
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleType: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await rolesService.getRolePermissions(roleType);
      // Converto string[] in RolePermission[] se necessario
      const rolePermissionsData: RolePermission[] = Array.isArray(response) 
        ? response.map((permissionId: string) => ({
            permissionId,
            entityType: '',
            action: '',
            granted: true,
            scope: 'all',
            tenantIds: [],
            fieldRestrictions: []
          }))
        : [];
      setRolePermissions(rolePermissionsData);
    } catch (error) {
      console.error('Errore nel caricamento dei permessi del ruolo:', error);
      setError('Errore nel caricamento dei permessi del ruolo');
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = (entityType: string, action: string, updates: Partial<RolePermission>) => {
    setRolePermissions(prev => {
      const updated = prev.map(perm => {
        if (perm.entityType === entityType && perm.action === action) {
          return { ...perm, ...updates } as RolePermission;
        }
        return perm;
      });
      return updated;
    });
  };

  const saveRolePermissions = async (roleType: string) => {
    try {
      // Converto i rolePermissions nel formato richiesto dal servizio
      const permissionsUpdate = {
        roleType,
        permissions: rolePermissions.reduce((acc, perm) => {
          if (!acc[perm.entityType]) {
            acc[perm.entityType] = {};
          }
          acc[perm.entityType][perm.action] = {
            granted: perm.granted,
            scope: perm.scope as 'all' | 'own',
            fields: perm.fieldRestrictions
          };
          return acc;
        }, {} as Record<string, Record<string, { granted: boolean; scope: 'all' | 'own'; fields: string[] }>>)
      };
      
      await rolesService.updateRolePermissions(roleType, permissionsUpdate);
    } catch (error) {
      console.error('Errore nel salvataggio dei permessi:', error);
      throw error;
    }
  };

  return {
    permissions,
    rolePermissions,
    loading,
    error,
    permissionsLoading: loading,
    permissionsError: error,
    loadPermissions,
    loadRolePermissions,
    updatePermission,
    saveRolePermissions
  };
};