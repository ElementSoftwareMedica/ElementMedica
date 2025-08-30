import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../hooks/auth/usePermissions';

export interface GDPRPermissionsConfig {
  entityName: string;
  entityNamePlural: string;
  readPermission: string;
  writePermission: string;
  deletePermission: string;
  exportPermission?: string;
}

export interface GDPRPermissions {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  checkPermission: (permission: string) => boolean;
}

/**
 * Hook per gestire i permessi GDPR-compliant
 * Centralizza tutta la logica di controllo permessi
 */
export function useGDPRPermissions({
  entityName,
  entityNamePlural,
  readPermission,
  writePermission,
  deletePermission,
  exportPermission
}: GDPRPermissionsConfig): GDPRPermissions {
  const { hasPermission, user } = useAuth();
  const { canCreate, canUpdate, canDelete } = usePermissions();

  // Helper function per dividere i permessi in resource e action
  const checkPermission = (permission: string): boolean => {
    if (!permission) return false;
    
    // Se il permesso contiene ":", dividilo in resource e action
    if (permission.includes(':')) {
      const [resource, action] = permission.split(':');
      return hasPermission(resource, action);
    }
    
    // Altrimenti usa il permesso come resource con action vuota
    return hasPermission(permission, '');
  };

  // Helper per verificare se l'utente è admin
  const isAdmin = (): boolean => {
    return user?.role === 'Admin' || user?.role === 'Administrator';
  };

  // Permesso di lettura
  const canRead = (): boolean => {
    if (isAdmin()) return true;
    return checkPermission(readPermission);
  };

  // Permesso di creazione
  const canCreateEntity = (): boolean => {
    if (isAdmin()) return true;
    
    return canCreate(entityName) || 
           canCreate(entityNamePlural) ||
           checkPermission(writePermission) ||
           hasPermission(entityName, 'create') ||
           hasPermission(entityNamePlural, 'create');
  };

  // Permesso di modifica
  const canUpdateEntity = (): boolean => {
    if (isAdmin()) return true;
    
    return canUpdate(entityName) || 
           canUpdate(entityNamePlural) ||
           checkPermission(writePermission) ||
           hasPermission(entityName, 'update') ||
           hasPermission(entityNamePlural, 'update') ||
           hasPermission(entityName, 'write') ||
           hasPermission(entityNamePlural, 'write');
  };

  // Permesso di eliminazione
  const canDeleteEntity = (): boolean => {
    if (isAdmin()) return true;
    
    return canDelete(entityName) || 
           canDelete(entityNamePlural) ||
           checkPermission(deletePermission) ||
           hasPermission(entityName, 'delete') ||
           hasPermission(entityNamePlural, 'delete');
  };

  // Permesso di esportazione
  const canExportEntity = (): boolean => {
    if (isAdmin()) return true;
    
    return hasPermission('export', entityName) || 
           hasPermission('export', entityNamePlural) ||
           hasPermission(entityName, 'export') ||
           hasPermission(entityNamePlural, 'export') ||
           (exportPermission ? checkPermission(exportPermission) : true);
  };

  return {
    canRead: canRead(),
    canCreate: canCreateEntity(),
    canUpdate: canUpdateEntity(),
    canDelete: canDeleteEntity(),
    canExport: canExportEntity(),
    checkPermission
  };
}