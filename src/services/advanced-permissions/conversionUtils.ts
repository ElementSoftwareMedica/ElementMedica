import { EntityPermission } from './types';

/**
 * Mappature per la conversione tra formato backend e frontend
 */
const ACTION_MAP_TO_BACKEND: Record<string, string> = {
  'create': 'CREATE_',
  'read': 'VIEW_',
  'update': 'EDIT_',
  'delete': 'DELETE_'
};

const ACTION_MAP_FROM_BACKEND: Record<string, 'create' | 'read' | 'update' | 'delete'> = {
  'VIEW_': 'read',
  'READ_': 'read',
  'CREATE_': 'create',
  'ADD_': 'create',
  'EDIT_': 'update',
  'UPDATE_': 'update',
  'DELETE_': 'delete',
  'REMOVE_': 'delete'
};

const ENTITY_MAP_TO_BACKEND: Record<string, string> = {
  'persons': 'PERSONS',
  'companies': 'COMPANIES',
  'courses': 'COURSES',
  'roles': 'ROLES',
  'sites': 'SITES',
  'reparti': 'REPARTI',
  'dvr': 'DVR',
  'sopralluoghi': 'SOPRALLUOGHI',
  'gdpr': 'GDPR',
  'hierarchy': 'HIERARCHY',
  'documents': 'DOCUMENTS',
  'certificates': 'CERTIFICATES',
  'equipment': 'EQUIPMENT',
  'incidents': 'INCIDENTS',
  'audits': 'AUDITS',
  'policies': 'POLICIES',
  'procedures': 'PROCEDURES',
  'employees': 'EMPLOYEES',
  'trainers': 'TRAINERS',
  'dipendenti': 'EMPLOYEES', // Entità virtuale - filtro di persone
  'formatori': 'TRAINERS',   // Entità virtuale - filtro di persone
  'risks': 'RISKS',
  'controls': 'CONTROLS',
  'assessments': 'ASSESSMENTS',
  'notifications': 'NOTIFICATIONS',
  'reports': 'REPORTS',
  'analytics': 'ANALYTICS',
  'settings': 'SETTINGS',
  'logs': 'LOGS',
  'backups': 'BACKUPS',
  'integrations': 'INTEGRATIONS',
  'workflows': 'WORKFLOWS',
  'form_templates': 'FORM_TEMPLATES',
  'form_submissions': 'FORM_SUBMISSIONS',
  'public_cms': 'PUBLIC_CMS',
  'templates': 'TEMPLATES'
};

const ENTITY_MAP_FROM_BACKEND: Record<string, string> = Object.fromEntries(
  Object.entries(ENTITY_MAP_TO_BACKEND).map(([key, value]) => [value, key])
);

/**
 * Converte i permessi dal formato backend al formato frontend
 */
export function convertFromBackendFormat(backendPermissions: any[]): EntityPermission[] {
  return backendPermissions
    .map(permission => {
      // Estrae l'entità e l'azione dal nome del permesso
      const actionName = permission.permissionId || permission.action || permission.name;
      let entity = 'unknown';
      let action: 'create' | 'read' | 'update' | 'delete' = 'read';
      
      // Mappa le azioni del backend alle azioni del frontend
      for (const [backendAction, frontendAction] of Object.entries(ACTION_MAP_FROM_BACKEND)) {
        if (actionName.includes(backendAction)) {
          action = frontendAction;
          break;
        }
      }
      
      // Estrae l'entità dal nome dell'azione
      for (const [frontendEntity, backendEntity] of Object.entries(ENTITY_MAP_TO_BACKEND)) {
        if (actionName.includes(backendEntity)) {
          entity = frontendEntity;
          break;
        }
      }
      
      return {
        entity: permission.entity || entity,
        action: action,
        scope: permission.scope || 'all',
        fields: permission.fieldRestrictions || permission.fields || [],
        granted: permission.granted || false // Include lo stato del permesso
      };
    });
}

// Lista dei permessi validi dal backend (sincronizzata con VALID_PERSON_PERMISSIONS)
const VALID_BACKEND_PERMISSIONS = [
  // Permessi CRUD per entità principali
  'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
  'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
  'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
  'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
  'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
  'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
  'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
  'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
  'VIEW_QUOTES', 'CREATE_QUOTES', 'EDIT_QUOTES', 'DELETE_QUOTES',
  'VIEW_INVOICES', 'CREATE_INVOICES', 'EDIT_INVOICES', 'DELETE_INVOICES',
  'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
  'VIEW_TENANTS', 'CREATE_TENANTS', 'EDIT_TENANTS', 'DELETE_TENANTS',
  'VIEW_ADMINISTRATION', 'CREATE_ADMINISTRATION', 'EDIT_ADMINISTRATION', 'DELETE_ADMINISTRATION',
  'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR',
  'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'DELETE_REPORTS',
  'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY',
  'VIEW_CMS', 'CREATE_CMS', 'EDIT_CMS', 'DELETE_CMS',
  'VIEW_FORM_TEMPLATES', 'CREATE_FORM_TEMPLATES', 'EDIT_FORM_TEMPLATES', 'DELETE_FORM_TEMPLATES',
  'VIEW_FORM_SUBMISSIONS', 'CREATE_FORM_SUBMISSIONS', 'EDIT_FORM_SUBMISSIONS', 'DELETE_FORM_SUBMISSIONS',
  'VIEW_PUBLIC_CMS', 'CREATE_PUBLIC_CMS', 'EDIT_PUBLIC_CMS', 'DELETE_PUBLIC_CMS',
  'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES', 'DELETE_TEMPLATES',
  'VIEW_NOTIFICATIONS', 'CREATE_NOTIFICATIONS', 'EDIT_NOTIFICATIONS', 'DELETE_NOTIFICATIONS',
  'VIEW_AUDIT_LOGS', 'CREATE_AUDIT_LOGS', 'EDIT_AUDIT_LOGS', 'DELETE_AUDIT_LOGS',
  'VIEW_API_KEYS', 'CREATE_API_KEYS', 'EDIT_API_KEYS', 'DELETE_API_KEYS',
  // Permessi speciali
  'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT', 'ROLE_MANAGEMENT',
  'MANAGE_ENROLLMENTS', 'DOWNLOAD_DOCUMENTS', 'MANAGE_USERS', 'ASSIGN_ROLES',
  'REVOKE_ROLES', 'TENANT_MANAGEMENT', 'EXPORT_GDPR_DATA', 'DELETE_GDPR_DATA',
  'MANAGE_CONSENTS', 'EXPORT_REPORTS', 'MANAGE_HIERARCHY', 'HIERARCHY_MANAGEMENT',
  'MANAGE_PUBLIC_CONTENT', 'READ_PUBLIC_CONTENT', 'MANAGE_FORM_TEMPLATES',
  'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS',
  'EXPORT_FORM_SUBMISSIONS', 'MANAGE_PUBLIC_CMS', 'MANAGE_TEMPLATES',
  'MANAGE_NOTIFICATIONS', 'SEND_NOTIFICATIONS', 'MANAGE_AUDIT_LOGS',
  'EXPORT_AUDIT_LOGS', 'MANAGE_API_KEYS', 'REGENERATE_API_KEYS'
];

/**
 * Converte i permessi dal formato frontend al formato backend
 */
export function convertToBackendFormat(frontendPermissions: EntityPermission[]): any[] {
  return frontendPermissions
    .map(permission => {
      // Genera il permissionId nel formato atteso dal backend
      const actionPrefix = ACTION_MAP_TO_BACKEND[permission.action] || 'VIEW_';
      const entityName = ENTITY_MAP_TO_BACKEND[permission.entity] || permission.entity.toUpperCase();
      const permissionId = `${actionPrefix}${entityName}`;
      
      // Verifica se il permesso è valido
      if (!VALID_BACKEND_PERMISSIONS.includes(permissionId)) {
        console.warn(`Permission ${permissionId} is not in VALID_BACKEND_PERMISSIONS, skipping...`);
        return null;
      }
      
      return {
        permissionId: permissionId,
        granted: permission.granted !== false, // Usa il valore dal frontend, default true se non specificato
        scope: permission.scope || 'all',
        fieldRestrictions: permission.fields || []
      };
    })
    .filter(permission => permission !== null); // Rimuovi i permessi non validi
}

/**
 * Estrae l'entità dal nome di un permesso backend
 */
export function extractEntityFromPermissionName(permissionName: string): string {
  for (const [frontendEntity, backendEntity] of Object.entries(ENTITY_MAP_TO_BACKEND)) {
    if (permissionName.includes(backendEntity)) {
      return frontendEntity;
    }
  }
  return 'unknown';
}

/**
 * Estrae l'azione dal nome di un permesso backend
 */
export function extractActionFromPermissionName(permissionName: string): 'create' | 'read' | 'update' | 'delete' {
  for (const [backendAction, frontendAction] of Object.entries(ACTION_MAP_FROM_BACKEND)) {
    if (permissionName.includes(backendAction)) {
      return frontendAction;
    }
  }
  return 'read';
}

/**
 * Genera il nome del permesso nel formato backend
 */
export function generateBackendPermissionName(entity: string, action: string): string {
  const actionPrefix = ACTION_MAP_TO_BACKEND[action] || 'VIEW_';
  const entityName = ENTITY_MAP_TO_BACKEND[entity] || entity.toUpperCase();
  return `${actionPrefix}${entityName}`;
}