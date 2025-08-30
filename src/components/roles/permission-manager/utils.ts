import { EntityPermission } from '../../../services/advancedPermissions';
import { PERMISSION_ACTIONS } from './constants';

/**
 * Trova un permesso specifico nell'array dei permessi
 */
export const getPermission = (
  permissions: EntityPermission[], 
  entity: string, 
  action: string
): EntityPermission | undefined => {
  return (Array.isArray(permissions) ? permissions : [])
    .find(p => p.entity === entity && p.action === action);
};

/**
 * Aggiorna o crea un permesso nell'array
 */
export const updatePermissionInArray = (
  permissions: EntityPermission[],
  entity: string,
  action: string,
  scope: 'all' | 'tenant' | 'own' | 'none',
  fields?: string[]
): EntityPermission[] => {
  const currentPermissions = Array.isArray(permissions) ? permissions : [];
  const newPermissions = [...currentPermissions];
  const existingIndex = newPermissions.findIndex(p => p.entity === entity && p.action === action);
  
  if (scope === 'none') {
    if (existingIndex !== -1) {
      newPermissions.splice(existingIndex, 1);
    }
  } else {
    const existingPermission = existingIndex !== -1 ? newPermissions[existingIndex] : null;
    const permission: EntityPermission = {
      entity,
      action: action as 'read' | 'create' | 'update' | 'delete',
      scope,
      fields: fields,
      // Mantieni i tenantIds esistenti se il scope è 'tenant'
      tenantIds: scope === 'tenant' ? (existingPermission?.tenantIds || []) : undefined
    };
    
    if (existingIndex !== -1) {
      newPermissions[existingIndex] = permission;
    } else {
      newPermissions.push(permission);
    }
  }
  
  return newPermissions;
};

/**
 * Aggiorna i campi di un permesso specifico
 */
export const updatePermissionFields = (
  permissions: EntityPermission[],
  entity: string,
  action: string,
  fieldId: string,
  add: boolean = true
): EntityPermission[] => {
  const currentPermissions = Array.isArray(permissions) ? permissions : [];
  const newPermissions = [...currentPermissions];
  const permissionIndex = newPermissions.findIndex(p => p.entity === entity && p.action === action);
  
  if (permissionIndex !== -1) {
    const permission = newPermissions[permissionIndex];
    const currentFields = permission.fields || [];
    
    if (add) {
      if (!currentFields.includes(fieldId)) {
        permission.fields = [...currentFields, fieldId];
      }
    } else {
      permission.fields = currentFields.filter(f => f !== fieldId);
    }
  }
  
  return newPermissions;
};

/**
 * Aggiorna i tenant di un permesso specifico
 */
export const updatePermissionTenants = (
  permissions: EntityPermission[],
  entity: string,
  action: string,
  tenantId: number,
  selected: boolean
): EntityPermission[] => {
  const currentPermissions = Array.isArray(permissions) ? permissions : [];
  const newPermissions = [...currentPermissions];
  const permissionIndex = newPermissions.findIndex(p => p.entity === entity && p.action === action);
  
  if (permissionIndex !== -1) {
    const permission = newPermissions[permissionIndex];
    const currentTenantIds = permission.tenantIds || [];
    
    if (selected) {
      // Aggiungi tenant se non già presente
      if (!currentTenantIds.includes(tenantId)) {
        permission.tenantIds = [...currentTenantIds, tenantId];
      }
    } else {
      // Rimuovi tenant
      permission.tenantIds = currentTenantIds.filter(id => id !== tenantId);
    }
  }
  
  return newPermissions;
};

/**
 * Applica operazioni bulk sui permessi
 */
export const applyBulkPermissions = (
  permissions: EntityPermission[],
  entity: string,
  selectedActions: Set<string>,
  operation: 'scope' | 'fields' | 'tenants',
  value: string | string[] | number | number[],
  add: boolean = true
): EntityPermission[] => {
  let newPermissions = [...permissions];
  
  selectedActions.forEach(action => {
    switch (operation) {
      case 'scope':
        newPermissions = updatePermissionInArray(newPermissions, entity, action, value);
        break;
        
      case 'fields':
        const fieldIds = Array.isArray(value) ? value : [value];
        fieldIds.forEach(fieldId => {
          newPermissions = updatePermissionFields(newPermissions, entity, action, fieldId, add);
        });
        break;
        
      case 'tenants':
        const tenantIds = Array.isArray(value) ? value : [value];
        tenantIds.forEach(tenantId => {
          newPermissions = updatePermissionTenants(newPermissions, entity, action, tenantId, add);
        });
        break;
    }
  });
  
  return newPermissions;
};

/**
 * Seleziona tutte le azioni disponibili
 */
export const getAllActionNames = (): Set<string> => {
  return new Set(PERMISSION_ACTIONS.map(action => action.name));
};

/**
 * Verifica se tutti i tenant sono selezionati per un permesso
 */
export const hasAllTenants = (
  permission: EntityPermission | undefined,
  allTenantIds: number[]
): boolean => {
  if (!permission?.tenantIds) return false;
  return allTenantIds.every(id => permission.tenantIds!.includes(id));
};

/**
 * Filtra le entità in base al termine di ricerca
 */
export const filterEntities = <T extends { name: string; displayName: string }>(
  entities: T[],
  searchTerm: string
): T[] => {
  if (!searchTerm.trim()) return entities;
  
  const term = searchTerm.toLowerCase();
  return entities.filter(entity =>
    entity.displayName.toLowerCase().includes(term) ||
    entity.name.toLowerCase().includes(term)
  );
};