import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../hooks/auth/usePermissions';
import { useTenantModeOptional } from '../../../contexts/TenantModeContext';

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
  /** Flag che indica se CRUD è bloccato per TenantMode */
  tenantModeRestricted?: boolean;
  /** ID tenant per le operazioni CRUD (se disponibile) */
  operateTenantId?: string | null;
}

/**
 * Hook per gestire i permessi GDPR-compliant
 * Centralizza tutta la logica di controllo permessi
 * 
 * INTEGRAZIONE TENANT MODE (Project 45 - Phase 8):
 * - Se l'utente è in modalità "visualizza tutti i tenant", le operazioni CRUD sono disabilitate
 * - Solo quando viewMode='single' o operateTenantId è impostato, CRUD è abilitato
 * - La lettura e l'export rimangono sempre disponibili
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

  // Integrazione TenantMode (Project 45 - Phase 8)
  const tenantMode = useTenantModeOptional();
  const canPerformCRUDTenantMode = tenantMode?.canPerformCRUD ?? true;
  const operateTenantId = tenantMode?.operateTenantId ?? null;
  const hasMultipleTenants = tenantMode?.hasMultipleTenants ?? false;

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

  // Permesso di creazione (combina RBAC + TenantMode)
  const canCreateEntity = (): boolean => {
    // Prima verifica TenantMode - se bloccato, non serve controllare RBAC
    if (hasMultipleTenants && !canPerformCRUDTenantMode) {
      return false;
    }

    if (isAdmin()) return true;

    return canCreate(entityName) ||
      canCreate(entityNamePlural) ||
      checkPermission(writePermission) ||
      hasPermission(entityName, 'create') ||
      hasPermission(entityNamePlural, 'create');
  };

  // Permesso di modifica (combina RBAC + TenantMode)
  const canUpdateEntity = (): boolean => {
    // Prima verifica TenantMode - se bloccato, non serve controllare RBAC
    if (hasMultipleTenants && !canPerformCRUDTenantMode) {
      return false;
    }

    if (isAdmin()) return true;

    return canUpdate(entityName) ||
      canUpdate(entityNamePlural) ||
      checkPermission(writePermission) ||
      hasPermission(entityName, 'update') ||
      hasPermission(entityNamePlural, 'update') ||
      hasPermission(entityName, 'write') ||
      hasPermission(entityNamePlural, 'write');
  };

  // Permesso di eliminazione (combina RBAC + TenantMode)
  const canDeleteEntity = (): boolean => {
    // Prima verifica TenantMode - se bloccato, non serve controllare RBAC
    if (hasMultipleTenants && !canPerformCRUDTenantMode) {
      return false;
    }

    if (isAdmin()) return true;

    return canDelete(entityName) ||
      canDelete(entityNamePlural) ||
      checkPermission(deletePermission) ||
      hasPermission(entityName, 'delete') ||
      hasPermission(entityNamePlural, 'delete');
  };

  // Permesso di esportazione (non bloccato da TenantMode - lettura)
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
    checkPermission,
    // Info aggiuntive per TenantMode
    tenantModeRestricted: hasMultipleTenants && !canPerformCRUDTenantMode,
    operateTenantId
  };
}