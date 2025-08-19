import { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../hooks/auth/usePermissions';

/**
 * Hook per la gestione dei permessi delle entità GDPR
 * Centralizza tutta la logica di verifica permessi con supporto per formati multipli
 */
export interface EntityPermissions {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canRead: boolean;
}

export interface UseEntityPermissionsProps {
  entityName: string;
  entityNamePlural: string;
  readPermission: string;
  writePermission: string;
  deletePermission: string;
  exportPermission?: string;
}

export const useEntityPermissions = ({
  entityName,
  entityNamePlural,
  readPermission,
  writePermission,
  deletePermission,
  exportPermission
}: UseEntityPermissionsProps): EntityPermissions => {
  const { hasPermission, user } = useAuth();
  const { canCreate: canCreateHook, canUpdate: canUpdateHook, canDelete: canDeleteHook } = usePermissions();

  // Helper function per dividere i permessi in resource e action
  const checkPermission = useCallback((permission: string): boolean => {
    if (!permission) return false;
    
    // Se il permesso contiene ":", dividilo in resource e action
    if (permission.includes(':')) {
      const [resource, action] = permission.split(':');
      return hasPermission(resource, action);
    }
    
    // Altrimenti usa il permesso come resource con action vuota
    return hasPermission(permission, '');
  }, [hasPermission]);

  // Helper per verificare se l'utente è admin
  const isAdmin = useCallback((): boolean => {
    return user?.role === 'Admin' || user?.role === 'Administrator';
  }, [user?.role]);

  // Verifica permessi di lettura
  const canRead = useCallback((): boolean => {
    if (isAdmin()) return true;
    return checkPermission(readPermission) || 
           hasPermission(entityName, 'read') || 
           hasPermission(entityNamePlural, 'read');
  }, [isAdmin, checkPermission, readPermission, hasPermission, entityName, entityNamePlural]);

  // Verifica permessi di creazione
  const canCreate = useCallback((): boolean => {
    if (isAdmin()) return true;
    
    return canCreateHook(entityName) || 
           canCreateHook(entityNamePlural) ||
           checkPermission(writePermission) ||
           hasPermission(entityName, 'create') ||
           hasPermission(entityNamePlural, 'create');
  }, [isAdmin, canCreateHook, entityName, entityNamePlural, checkPermission, writePermission, hasPermission]);

  // Verifica permessi di modifica
  const canUpdate = useCallback((): boolean => {
    if (isAdmin()) return true;
    
    return canUpdateHook(entityName) || 
           canUpdateHook(entityNamePlural) ||
           checkPermission(writePermission) ||
           hasPermission(entityName, 'update') ||
           hasPermission(entityNamePlural, 'update') ||
           hasPermission(entityName, 'write') ||
           hasPermission(entityNamePlural, 'write');
  }, [isAdmin, canUpdateHook, entityName, entityNamePlural, checkPermission, writePermission, hasPermission]);

  // Verifica permessi di eliminazione
  const canDelete = useCallback((): boolean => {
    if (isAdmin()) return true;
    
    return canDeleteHook(entityName) || 
           canDeleteHook(entityNamePlural) ||
           checkPermission(deletePermission) ||
           hasPermission(entityName, 'delete') ||
           hasPermission(entityNamePlural, 'delete');
  }, [isAdmin, canDeleteHook, entityName, entityNamePlural, checkPermission, deletePermission, hasPermission]);

  // Verifica permessi di export
  const canExport = useCallback((): boolean => {
    if (isAdmin()) return true;
    
    return hasPermission('export', entityName) || 
           hasPermission('export', entityNamePlural) ||
           hasPermission(entityName, 'export') ||
           hasPermission(entityNamePlural, 'export') ||
           (exportPermission ? checkPermission(exportPermission) : true);
  }, [isAdmin, hasPermission, entityName, entityNamePlural, exportPermission, checkPermission]);

  return {
    canRead: canRead(),
    canCreate: canCreate(),
    canUpdate: canUpdate(),
    canDelete: canDelete(),
    canExport: canExport()
  };
};