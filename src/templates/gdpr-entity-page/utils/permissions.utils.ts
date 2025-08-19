import { EntityPermissions, GDPRPermissions, PermissionConfig } from '../types';

/**
 * Utility per la gestione dei permessi GDPR-compliant
 */

// ============================================================================
// VERIFICA PERMESSI BASE
// ============================================================================

/**
 * Verifica se l'utente ha un permesso specifico
 */
export function hasPermission(
  userRoles: string[],
  requiredPermissions: string[],
  requireAll: boolean = false
): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  
  // Admin ha sempre tutti i permessi
  if (userRoles.includes('ADMIN')) return true;
  
  if (requireAll) {
    // Richiede TUTTI i permessi
    return requiredPermissions.every(permission => 
      userRoles.some(role => role === permission || role.includes(permission))
    );
  } else {
    // Richiede ALMENO UNO dei permessi
    return requiredPermissions.some(permission => 
      userRoles.some(role => role === permission || role.includes(permission))
    );
  }
}

/**
 * Verifica permessi per operazioni CRUD
 */
export function hasEntityPermission(
  userRoles: string[],
  permissions: EntityPermissions,
  operation: 'read' | 'create' | 'update' | 'delete' | 'export' | 'import'
): boolean {
  const requiredPermissions = permissions[operation];
  if (!requiredPermissions) return false;
  
  return hasPermission(userRoles, requiredPermissions);
}

/**
 * Verifica permessi GDPR specifici
 */
export function hasGDPRPermission(
  userRoles: string[],
  permissions: GDPRPermissions,
  operation: keyof GDPRPermissions
): boolean {
  const requiredPermissions = permissions[operation];
  if (!requiredPermissions) return false;
  
  return hasPermission(userRoles, requiredPermissions);
}

// ============================================================================
// VERIFICA PERMESSI AVANZATA
// ============================================================================

/**
 * Verifica permessi con condizioni aggiuntive
 */
export function hasConditionalPermission(
  userRoles: string[],
  config: PermissionConfig,
  context: Record<string, unknown> = {}
): boolean {
  // Verifica permesso base
  if (!hasPermission(userRoles, [config.action])) {
    return false;
  }
  
  // Verifica condizioni aggiuntive
  if (config.conditions) {
    return Object.entries(config.conditions).every(([key, expectedValue]) => {
      const actualValue = context[key];
      
      if (typeof expectedValue === 'function') {
        return expectedValue(actualValue, context);
      }
      
      return actualValue === expectedValue;
    });
  }
  
  return true;
}

/**
 * Verifica se l'utente può accedere a dati personali
 */
export function canAccessPersonalData(
  userRoles: string[],
  dataOwnerId?: string,
  currentUserId?: string
): boolean {
  // Admin può accedere a tutti i dati
  if (userRoles.includes('ADMIN')) return true;
  
  // Manager può accedere ai dati del suo team
  if (userRoles.includes('MANAGER')) return true;
  
  // L'utente può accedere solo ai propri dati
  if (dataOwnerId && currentUserId) {
    return dataOwnerId === currentUserId;
  }
  
  // HR può accedere ai dati dei dipendenti
  if (userRoles.includes('HR')) return true;
  
  return false;
}

/**
 * Verifica se l'utente può modificare dati sensibili
 */
export function canModifySensitiveData(
  userRoles: string[],
  dataType: 'personal' | 'financial' | 'health' | 'biometric'
): boolean {
  // Solo Admin e HR possono modificare dati sensibili
  if (userRoles.includes('ADMIN') || userRoles.includes('HR')) {
    return true;
  }
  
  // Permessi specifici per tipo di dato
  switch (dataType) {
    case 'financial':
      return userRoles.includes('FINANCE');
    case 'health':
      return userRoles.includes('HEALTH_OFFICER');
    case 'biometric':
      return userRoles.includes('SECURITY_OFFICER');
    default:
      return false;
  }
}

// ============================================================================
// FILTRI BASATI SUI PERMESSI
// ============================================================================

/**
 * Filtra azioni disponibili in base ai permessi
 */
export function filterActionsByPermissions<T>(
  actions: Array<T & { requiresPermission?: string[] }>,
  userRoles: string[]
): T[] {
  return actions.filter(action => {
    if (!action.requiresPermission || action.requiresPermission.length === 0) {
      return true;
    }
    
    return hasPermission(userRoles, action.requiresPermission);
  });
}

/**
 * Filtra campi visibili in base ai permessi
 */
export function filterFieldsByPermissions<T>(
  fields: Array<T & { requiresPermission?: string[]; sensitive?: boolean }>,
  userRoles: string[]
): T[] {
  return fields.filter(field => {
    // Campi sensibili richiedono permessi speciali
    if (field.sensitive && !userRoles.includes('ADMIN') && !userRoles.includes('HR')) {
      return false;
    }
    
    if (!field.requiresPermission || field.requiresPermission.length === 0) {
      return true;
    }
    
    return hasPermission(userRoles, field.requiresPermission);
  });
}

/**
 * Filtra entità in base ai permessi di accesso
 */
export function filterEntitiesByPermissions<T extends { id: string; ownerId?: string }>(
  entities: T[],
  userRoles: string[],
  currentUserId?: string
): T[] {
  // Admin vede tutto
  if (userRoles.includes('ADMIN')) return entities;
  
  return entities.filter(entity => 
    canAccessPersonalData(userRoles, entity.ownerId, currentUserId)
  );
}

// ============================================================================
// UTILITY DI SUPPORTO
// ============================================================================

/**
 * Ottiene il livello di permesso più alto dell'utente
 */
export function getHighestPermissionLevel(userRoles: string[]): 'admin' | 'manager' | 'user' | 'guest' {
  if (userRoles.includes('ADMIN')) return 'admin';
  if (userRoles.includes('MANAGER') || userRoles.includes('HR')) return 'manager';
  if (userRoles.includes('USER') || userRoles.includes('EMPLOYEE')) return 'user';
  return 'guest';
}

/**
 * Verifica se l'utente ha ruoli amministrativi
 */
export function isAdministrator(userRoles: string[]): boolean {
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'];
  return userRoles.some(role => adminRoles.includes(role));
}

/**
 * Verifica se l'utente ha ruoli di gestione
 */
export function isManager(userRoles: string[]): boolean {
  const managerRoles = ['MANAGER', 'TEAM_LEAD', 'SUPERVISOR', 'HR'];
  return userRoles.some(role => managerRoles.includes(role));
}

/**
 * Genera messaggio di errore per permessi insufficienti
 */
export function getPermissionErrorMessage(
  operation: string,
  requiredPermissions: string[]
): string {
  return `Permessi insufficienti per l'operazione "${operation}". Richiesti: ${requiredPermissions.join(', ')}`;
}

/**
 * Valida configurazione permessi
 */
export function validatePermissionConfig(permissions: EntityPermissions): string[] {
  const errors: string[] = [];
  
  if (!permissions.read || permissions.read.length === 0) {
    errors.push('Permessi di lettura obbligatori');
  }
  
  if (!permissions.create || permissions.create.length === 0) {
    errors.push('Permessi di creazione obbligatori');
  }
  
  if (!permissions.update || permissions.update.length === 0) {
    errors.push('Permessi di modifica obbligatori');
  }
  
  if (!permissions.delete || permissions.delete.length === 0) {
    errors.push('Permessi di eliminazione obbligatori');
  }
  
  return errors;
}

// ============================================================================
// COSTANTI PERMESSI
// ============================================================================

export const PERMISSION_LEVELS = {
  ADMIN: ['ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'],
  MANAGER: ['MANAGER', 'TEAM_LEAD', 'SUPERVISOR', 'HR'],
  USER: ['USER', 'EMPLOYEE', 'MEMBER'],
  GUEST: ['GUEST', 'VISITOR']
} as const;

export const GDPR_PERMISSIONS = {
  VIEW_PERSONAL_DATA: 'gdpr:view_personal_data',
  EDIT_PERSONAL_DATA: 'gdpr:edit_personal_data',
  DELETE_PERSONAL_DATA: 'gdpr:delete_personal_data',
  EXPORT_PERSONAL_DATA: 'gdpr:export_personal_data',
  ANONYMIZE_DATA: 'gdpr:anonymize_data',
  VIEW_AUDIT_LOG: 'gdpr:view_audit_log',
  MANAGE_CONSENTS: 'gdpr:manage_consents'
} as const;

export const SENSITIVE_DATA_TYPES = {
  PERSONAL: 'personal',
  FINANCIAL: 'financial',
  HEALTH: 'health',
  BIOMETRIC: 'biometric',
  LOCATION: 'location',
  COMMUNICATION: 'communication'
} as const;