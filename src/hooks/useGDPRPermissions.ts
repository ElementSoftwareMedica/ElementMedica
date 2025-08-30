import { useAuth } from './auth/useAuth';
import { usePermissions } from './auth/usePermissions';

interface UseGDPRPermissionsProps {
  entityName: string;
  entityNamePlural: string;
  readPermission: string;
  writePermission: string;
  deletePermission: string;
  exportPermission?: string;
}

interface UseGDPRPermissionsReturn {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canExport: boolean;
  isAdmin: boolean;
  checkPermission: (permission: string) => boolean;
}

export function useGDPRPermissions({
  entityName,
  entityNamePlural,
  readPermission,
  writePermission,
  deletePermission,
  exportPermission
}: UseGDPRPermissionsProps): UseGDPRPermissionsReturn {
  const { hasPermission, user } = useAuth();
  const { canCreate: canCreateBase, canUpdate: canUpdateBase, canDelete: canDeleteBase } = usePermissions();

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

  // Verifica se l'utente è amministratore
  const isAdmin = user?.role === 'Admin' || user?.role === 'Administrator';

  // Permesso di lettura
  const canRead = isAdmin || checkPermission(readPermission);

  // Helper functions per i permessi usando usePermissions
  const canCreate = (): boolean => {
    // Admin bypass: se l'utente è Admin, ha tutti i permessi
    if (isAdmin) {
      return true;
    }
    
    // Prova diversi formati di permessi
    return canCreateBase(entityName) || 
           canCreateBase(entityNamePlural) ||
           checkPermission(writePermission) ||
           hasPermission(entityName, 'create') ||
           hasPermission(entityNamePlural, 'create');
  };
  
  const canUpdate = (): boolean => {
    // Admin bypass: se l'utente è Admin, ha tutti i permessi
    if (isAdmin) {
      return true;
    }
    
    // Prova diversi formati di permessi
    return canUpdateBase(entityName) || 
           canUpdateBase(entityNamePlural) ||
           checkPermission(writePermission) ||
           hasPermission(entityName, 'update') ||
           hasPermission(entityNamePlural, 'update') ||
           hasPermission(entityName, 'write') ||
           hasPermission(entityNamePlural, 'write');
  };
  
  const canDelete = (): boolean => {
    // Admin bypass: se l'utente è Admin, ha tutti i permessi
    if (isAdmin) {
      return true;
    }
    
    // Prova diversi formati di permessi
    return canDeleteBase(entityName) || 
           canDeleteBase(entityNamePlural) ||
           checkPermission(deletePermission) ||
           hasPermission(entityName, 'delete') ||
           hasPermission(entityNamePlural, 'delete');
  };
  
  const canExport = (): boolean => {
    // Admin bypass: se l'utente è Admin, ha tutti i permessi
    if (isAdmin) {
      return true;
    }
    
    return hasPermission('export', entityName) || 
           hasPermission('export', entityNamePlural) ||
           hasPermission(entityName, 'export') ||
           hasPermission(entityNamePlural, 'export') ||
           (exportPermission ? checkPermission(exportPermission) : true);
  };

  return {
    canRead,
    canCreate: canCreate(),
    canUpdate: canUpdate(),
    canWrite: canCreate() || canUpdate(),
    canDelete: canDelete(),
    canExport: canExport(),
    isAdmin,
    checkPermission
  };
}