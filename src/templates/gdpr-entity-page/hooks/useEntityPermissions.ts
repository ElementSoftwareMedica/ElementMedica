import { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../hooks/auth/usePermissions';
import { useTenantModeOptional } from '../../../contexts/TenantModeContext';

/**
 * Hook per la gestione dei permessi delle entità GDPR
 * Centralizza tutta la logica di verifica permessi con supporto per formati multipli
 * 
 * INTEGRAZIONE TENANT MODE (Project 45 - Phase 8):
 * - Se l'utente è in modalità "visualizza tutti i tenant", le operazioni CRUD sono disabilitate
 * - Solo quando viewMode='single' o operateTenantId è impostato, CRUD è abilitato
 * - La lettura e l'export rimangono sempre disponibili
 */
export interface EntityPermissions {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canRead: boolean;
  /** Flag che indica se CRUD è bloccato per TenantMode */
  tenantModeRestricted?: boolean;
  /** ID tenant per le operazioni CRUD (se disponibile) */
  operateTenantId?: string | null;
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

  // Integrazione TenantMode (Project 45 - Phase 8)
  const tenantMode = useTenantModeOptional();
  const canPerformCRUDTenantMode = tenantMode?.canPerformCRUD ?? true;
  const operateTenantId = tenantMode?.operateTenantId ?? null;
  const hasMultipleTenants = tenantMode?.hasMultipleTenants ?? false;

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

  // Verifica permessi di creazione (combina RBAC + TenantMode)
  const canCreate = useCallback((): boolean => {
    // Prima verifica TenantMode - se bloccato, non serve controllare RBAC
    if (hasMultipleTenants && !canPerformCRUDTenantMode) {
      return false;
    }

    if (isAdmin()) return true;

    return canCreateHook(entityName) ||
      canCreateHook(entityNamePlural) ||
      checkPermission(writePermission) ||
      hasPermission(entityName, 'create') ||
      hasPermission(entityNamePlural, 'create');
  }, [isAdmin, canCreateHook, entityName, entityNamePlural, checkPermission, writePermission, hasPermission, hasMultipleTenants, canPerformCRUDTenantMode]);

  // Verifica permessi di modifica (combina RBAC + TenantMode)
  const canUpdate = useCallback((): boolean => {
    // Prima verifica TenantMode - se bloccato, non serve controllare RBAC
    if (hasMultipleTenants && !canPerformCRUDTenantMode) {
      return false;
    }

    if (isAdmin()) return true;

    return canUpdateHook(entityName) ||
      canUpdateHook(entityNamePlural) ||
      checkPermission(writePermission) ||
      hasPermission(entityName, 'update') ||
      hasPermission(entityNamePlural, 'update') ||
      hasPermission(entityName, 'write') ||
      hasPermission(entityNamePlural, 'write');
  }, [isAdmin, canUpdateHook, entityName, entityNamePlural, checkPermission, writePermission, hasPermission, hasMultipleTenants, canPerformCRUDTenantMode]);

  // Verifica permessi di eliminazione (combina RBAC + TenantMode)
  const canDelete = useCallback((): boolean => {
    // Prima verifica TenantMode - se bloccato, non serve controllare RBAC
    if (hasMultipleTenants && !canPerformCRUDTenantMode) {
      return false;
    }

    if (isAdmin()) return true;

    return canDeleteHook(entityName) ||
      canDeleteHook(entityNamePlural) ||
      checkPermission(deletePermission) ||
      hasPermission(entityName, 'delete') ||
      hasPermission(entityNamePlural, 'delete');
  }, [isAdmin, canDeleteHook, entityName, entityNamePlural, checkPermission, deletePermission, hasPermission, hasMultipleTenants, canPerformCRUDTenantMode]);

  // Verifica permessi di export (non bloccato da TenantMode - lettura)
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
    canExport: canExport(),
    // Info aggiuntive per TenantMode
    tenantModeRestricted: hasMultipleTenants && !canPerformCRUDTenantMode,
    operateTenantId
  };
};