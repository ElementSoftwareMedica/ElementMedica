import { EntityPermission, PermissionsSummary } from './types';

/**
 * Valida un permesso
 */
export function validatePermission(permission: EntityPermission): boolean {
  const validActions = ['create', 'read', 'update', 'delete'];
  const validScopes = ['all', 'tenant', 'own'];

  return Boolean(
    permission.entity &&
    validActions.includes(permission.action) &&
    validScopes.includes(permission.scope)
  );
}

/**
 * Raggruppa i permessi per entità
 */
export function groupPermissionsByEntity(permissions: EntityPermission[]): Record<string, EntityPermission[]> {
  return permissions.reduce((groups, permission) => {
    if (!groups[permission.entity]) {
      groups[permission.entity] = [];
    }
    groups[permission.entity].push(permission);
    return groups;
  }, {} as Record<string, EntityPermission[]>);
}

/**
 * Ottiene un riassunto dei permessi per un ruolo
 */
export function getPermissionsSummary(permissions: EntityPermission[]): PermissionsSummary {
  const entitiesWithPermissions = new Set(permissions.map(p => p.entity)).size;
  const sensitiveFieldsAccess = permissions.filter(p => 
    p.fields && p.fields.length > 0
  ).length;

  return {
    totalPermissions: permissions.length,
    entitiesWithPermissions,
    sensitiveFieldsAccess
  };
}

/**
 * Filtra i permessi per azione
 */
export function filterPermissionsByAction(
  permissions: EntityPermission[], 
  action: 'create' | 'read' | 'update' | 'delete'
): EntityPermission[] {
  return permissions.filter(permission => permission.action === action);
}

/**
 * Filtra i permessi per entità
 */
export function filterPermissionsByEntity(
  permissions: EntityPermission[], 
  entity: string
): EntityPermission[] {
  return permissions.filter(permission => permission.entity === entity);
}

/**
 * Filtra i permessi per scope
 */
export function filterPermissionsByScope(
  permissions: EntityPermission[], 
  scope: 'all' | 'tenant' | 'own'
): EntityPermission[] {
  return permissions.filter(permission => permission.scope === scope);
}

/**
 * Verifica se un set di permessi include un permesso specifico
 */
export function hasPermission(
  permissions: EntityPermission[],
  entity: string,
  action: 'create' | 'read' | 'update' | 'delete',
  scope?: 'all' | 'tenant' | 'own'
): boolean {
  return permissions.some(permission => 
    permission.entity === entity &&
    permission.action === action &&
    permission.granted !== false &&
    (scope ? permission.scope === scope : true)
  );
}

/**
 * Ottiene tutti i permessi concessi (granted = true)
 */
export function getGrantedPermissions(permissions: EntityPermission[]): EntityPermission[] {
  return permissions.filter(permission => permission.granted !== false);
}

/**
 * Ottiene tutti i permessi negati (granted = false)
 */
export function getDeniedPermissions(permissions: EntityPermission[]): EntityPermission[] {
  return permissions.filter(permission => permission.granted === false);
}

/**
 * Combina due set di permessi, dando priorità al secondo set in caso di conflitti
 */
export function mergePermissions(
  basePermissions: EntityPermission[],
  overridePermissions: EntityPermission[]
): EntityPermission[] {
  const merged = [...basePermissions];
  
  overridePermissions.forEach(overridePermission => {
    const existingIndex = merged.findIndex(permission =>
      permission.entity === overridePermission.entity &&
      permission.action === overridePermission.action &&
      permission.scope === overridePermission.scope
    );
    
    if (existingIndex >= 0) {
      merged[existingIndex] = overridePermission;
    } else {
      merged.push(overridePermission);
    }
  });
  
  return merged;
}

/**
 * Rimuove permessi duplicati mantenendo l'ultimo
 */
export function deduplicatePermissions(permissions: EntityPermission[]): EntityPermission[] {
  const seen = new Map<string, EntityPermission>();
  
  permissions.forEach(permission => {
    const key = `${permission.entity}-${permission.action}-${permission.scope}`;
    seen.set(key, permission);
  });
  
  return Array.from(seen.values());
}

/**
 * Converte un permesso in una stringa leggibile
 */
export function permissionToString(permission: EntityPermission): string {
  const actionMap = {
    'create': 'Creare',
    'read': 'Visualizzare',
    'update': 'Modificare',
    'delete': 'Eliminare'
  };
  
  const scopeMap = {
    'all': 'tutti',
    'tenant': 'del tenant',
    'own': 'propri'
  };
  
  const action = actionMap[permission.action] || permission.action;
  const scope = scopeMap[permission.scope] || permission.scope;
  const status = permission.granted !== false ? 'Concesso' : 'Negato';
  
  return `${status}: ${action} ${permission.entity} (${scope})`;
}

/**
 * Ottiene le entità uniche da un set di permessi
 */
export function getUniqueEntities(permissions: EntityPermission[]): string[] {
  return Array.from(new Set(permissions.map(p => p.entity)));
}

/**
 * Ottiene le azioni uniche da un set di permessi
 */
export function getUniqueActions(permissions: EntityPermission[]): string[] {
  return Array.from(new Set(permissions.map(p => p.action)));
}

/**
 * Ottiene gli scope unici da un set di permessi
 */
export function getUniqueScopes(permissions: EntityPermission[]): string[] {
  return Array.from(new Set(permissions.map(p => p.scope)));
}