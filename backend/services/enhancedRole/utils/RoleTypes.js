/**
 * Definizioni dei tipi di ruolo e scope per il sistema multi-tenant
 * Modulo estratto da EnhancedRoleService per migliorare la manutenibilità
 */

/**
 * Tipi di ruolo disponibili nel sistema
 */
export const ROLE_TYPES = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  HR_MANAGER: 'HR_MANAGER',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  TRAINER: 'TRAINER',
  SENIOR_TRAINER: 'SENIOR_TRAINER',
  TRAINER_COORDINATOR: 'TRAINER_COORDINATOR',
  EXTERNAL_TRAINER: 'EXTERNAL_TRAINER',
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  VIEWER: 'VIEWER',
  OPERATOR: 'OPERATOR',
  COORDINATOR: 'COORDINATOR',
  SUPERVISOR: 'SUPERVISOR',
  GUEST: 'GUEST',
  CONSULTANT: 'CONSULTANT',
  AUDITOR: 'AUDITOR'
};

/**
 * Scope dei ruoli nel sistema
 */
export const ROLE_SCOPES = {
  GLOBAL: 'global',
  TENANT: 'tenant',
  COMPANY: 'company',
  DEPARTMENT: 'department'
};

/**
 * Permessi disponibili nel sistema
 */
export const PERMISSIONS = {
  // User Management
  'users.create': 'Creare utenti',
  'users.read': 'Visualizzare utenti',
  'users.update': 'Modificare utenti',
  'users.delete': 'Eliminare utenti',
  'users.manage_roles': 'Gestire ruoli utenti',
  
  // Role Management
  'roles.create': 'Creare ruoli',
  'roles.read': 'Visualizzare ruoli',
  'roles.update': 'Modificare ruoli',
  'roles.delete': 'Eliminare ruoli',
  
  // Company Management
  'companies.create': 'Creare aziende',
  'companies.read': 'Visualizzare aziende',
  'companies.update': 'Modificare aziende',
  'companies.delete': 'Eliminare aziende',
  'companies.manage_settings': 'Gestire impostazioni azienda',
  
  // Course Management
  'courses.create': 'Creare corsi',
  'courses.read': 'Visualizzare corsi',
  'courses.update': 'Modificare corsi',
  'courses.delete': 'Eliminare corsi',
  'courses.assign': 'Assegnare corsi',
  
  // Training Management
  'training.create': 'Creare sessioni formative',
  'training.read': 'Visualizzare formazioni',
  'training.update': 'Modificare formazioni',
  'training.delete': 'Eliminare formazioni',
  'training.conduct': 'Condurre formazioni',
  
  // Reports and Analytics
  'reports.view': 'Visualizzare report',
  'reports.export': 'Esportare report',
  'analytics.view': 'Visualizzare analytics',
  
  // System Administration
  'system.settings': 'Gestire impostazioni sistema',
  'system.billing': 'Gestire fatturazione',
  'system.audit': 'Visualizzare audit logs',
  'system.backup': 'Gestire backup',
  
  // Form Templates Management
  'VIEW_FORM_TEMPLATES': 'Visualizzare template form',
  'CREATE_FORM_TEMPLATES': 'Creare template form',
  'EDIT_FORM_TEMPLATES': 'Modificare template form',
  'DELETE_FORM_TEMPLATES': 'Eliminare template form',
  'MANAGE_FORM_TEMPLATES': 'Gestire template form',
  
  // CMS Management
  'VIEW_CMS': 'Visualizzare CMS',
  'CREATE_CMS': 'Creare contenuti CMS',
  'EDIT_CMS': 'Modificare contenuti CMS',
  'DELETE_CMS': 'Eliminare contenuti CMS',
  'MANAGE_PUBLIC_CONTENT': 'Gestire contenuti pubblici',
  'READ_PUBLIC_CONTENT': 'Leggere contenuti pubblici',
  
  // Submissions Management
  'VIEW_SUBMISSIONS': 'Visualizzare invii form',
  'MANAGE_SUBMISSIONS': 'Gestire invii form',
  'EXPORT_SUBMISSIONS': 'Esportare invii form'
};

/**
 * Verifica se un tipo di ruolo è valido
 */
export function isValidRoleType(roleType) {
  return Object.values(ROLE_TYPES).includes(roleType);
}

/**
 * Verifica se uno scope è valido
 */
export function isValidScope(scope) {
  return Object.values(ROLE_SCOPES).includes(scope);
}

/**
 * Ottiene tutti i tipi di ruolo come array
 */
export function getAllRoleTypes() {
  return Object.values(ROLE_TYPES);
}

/**
 * Ottiene tutti gli scope come array
 */
export function getAllScopes() {
  return Object.values(ROLE_SCOPES);
}

/**
 * Ottiene tutti i permessi come array
 */
export function getAllPermissions() {
  return Object.keys(PERMISSIONS);
}

/**
 * Ottiene la descrizione di un permesso
 */
export function getPermissionDescription(permission) {
  return PERMISSIONS[permission] || 'Permesso non definito';
}

/**
 * Verifica se un permesso è valido
 */
export function isValidPermission(permission) {
  return permission in PERMISSIONS;
}

/**
 * Matrice delle permissions per ruolo
 * Restituisce i valori corretti dell'enum PersonPermission (formato ACTION_ENTITY)
 */
export function getDefaultPermissions(roleType) {
  const permissionMatrix = {
    [ROLE_TYPES.SUPER_ADMIN]: [
      // Tutti i permessi disponibili nell'enum PersonPermission
      'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
      'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
      'ROLE_MANAGEMENT', 'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
      'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES',
      'SYSTEM_SETTINGS', 'ADMIN_PANEL', 'USER_MANAGEMENT',
      'TENANT_MANAGEMENT', 'VIEW_TENANTS', 'CREATE_TENANTS', 'EDIT_TENANTS', 'DELETE_TENANTS',
      'VIEW_ADMINISTRATION', 'CREATE_ADMINISTRATION', 'EDIT_ADMINISTRATION', 'DELETE_ADMINISTRATION',
      'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR',
      'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA', 'DELETE_GDPR_DATA', 'MANAGE_CONSENTS',
      'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'DELETE_REPORTS', 'EXPORT_REPORTS',
      'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY', 'HIERARCHY_MANAGEMENT',
      // Permessi specifici per Form Templates
      'VIEW_FORM_TEMPLATES', 'CREATE_FORM_TEMPLATES', 'EDIT_FORM_TEMPLATES', 'DELETE_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES',
      // Permessi specifici per Form Submissions
      'VIEW_FORM_SUBMISSIONS', 'CREATE_FORM_SUBMISSIONS', 'EDIT_FORM_SUBMISSIONS', 'DELETE_FORM_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS', 'EXPORT_FORM_SUBMISSIONS',
      // Permessi specifici per Public CMS
      'VIEW_PUBLIC_CMS', 'CREATE_PUBLIC_CMS', 'EDIT_PUBLIC_CMS', 'DELETE_PUBLIC_CMS', 'MANAGE_PUBLIC_CMS',
      // Permessi specifici per Templates
      'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES', 'DELETE_TEMPLATES', 'MANAGE_TEMPLATES',
      // Permessi generici per compatibilità
      'VIEW_CMS', 'CREATE_CMS', 'EDIT_CMS', 'DELETE_CMS', 'MANAGE_PUBLIC_CONTENT', 'READ_PUBLIC_CONTENT',
      'VIEW_SUBMISSIONS', 'CREATE_SUBMISSIONS', 'EDIT_SUBMISSIONS', 'DELETE_SUBMISSIONS', 'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS'
    ],
    
    [ROLE_TYPES.ADMIN]: [
      // Permessi amministrativi completi
      'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
      'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
      'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
      'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
      'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR', 'MANAGE_GDPR',
      'ROLE_MANAGEMENT', 'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
      'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES',
      'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'EXPORT_REPORTS',
      'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY',
      // Permessi specifici per Form Templates
      'VIEW_FORM_TEMPLATES', 'CREATE_FORM_TEMPLATES', 'EDIT_FORM_TEMPLATES', 'DELETE_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES',
      // Permessi specifici per Form Submissions
      'VIEW_FORM_SUBMISSIONS', 'CREATE_FORM_SUBMISSIONS', 'EDIT_FORM_SUBMISSIONS', 'DELETE_FORM_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS', 'EXPORT_FORM_SUBMISSIONS',
      // Permessi specifici per Public CMS
      'VIEW_PUBLIC_CMS', 'CREATE_PUBLIC_CMS', 'EDIT_PUBLIC_CMS', 'DELETE_PUBLIC_CMS', 'MANAGE_PUBLIC_CMS',
      // Permessi specifici per Templates
      'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES', 'DELETE_TEMPLATES', 'MANAGE_TEMPLATES',
      // Permessi generici per compatibilità
      'VIEW_CMS', 'CREATE_CMS', 'EDIT_CMS', 'DELETE_CMS', 'MANAGE_PUBLIC_CONTENT', 'READ_PUBLIC_CONTENT',
      'VIEW_SUBMISSIONS', 'CREATE_SUBMISSIONS', 'EDIT_SUBMISSIONS', 'DELETE_SUBMISSIONS', 'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS'
    ],
    
    [ROLE_TYPES.COMPANY_ADMIN]: [
      'CREATE_USERS', 'VIEW_USERS', 'EDIT_USERS', 'DELETE_USERS', 'ROLE_MANAGEMENT',
      'VIEW_COMPANIES', 'EDIT_COMPANIES',
      'CREATE_COURSES', 'VIEW_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
      'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES',
      'VIEW_REPORTS', 'EXPORT_REPORTS', 'VIEW_ANALYTICS',
      // Permessi specifici per Form Templates
      'VIEW_FORM_TEMPLATES', 'CREATE_FORM_TEMPLATES', 'EDIT_FORM_TEMPLATES', 'DELETE_FORM_TEMPLATES',
      // Permessi specifici per Form Submissions
      'VIEW_FORM_SUBMISSIONS', 'CREATE_FORM_SUBMISSIONS', 'EDIT_FORM_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS', 'EXPORT_FORM_SUBMISSIONS',
      // Permessi specifici per Public CMS
      'VIEW_PUBLIC_CMS', 'CREATE_PUBLIC_CMS', 'EDIT_PUBLIC_CMS', 'MANAGE_PUBLIC_CMS',
      // Permessi specifici per Templates
      'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES',
      // Permessi generici per compatibilità
      'VIEW_CMS', 'EDIT_CMS', 'MANAGE_PUBLIC_CONTENT',
      'VIEW_SUBMISSIONS', 'CREATE_SUBMISSIONS', 'EDIT_SUBMISSIONS', 'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS'
    ],
    
    [ROLE_TYPES.TENANT_ADMIN]: [
      'CREATE_USERS', 'VIEW_USERS', 'EDIT_USERS', 'DELETE_USERS', 'ROLE_MANAGEMENT',
      'VIEW_COMPANIES', 'EDIT_COMPANIES',
      'CREATE_COURSES', 'VIEW_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
      'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES',
      'VIEW_REPORTS', 'EXPORT_REPORTS', 'VIEW_ANALYTICS',
      // Permessi specifici per Form Templates
      'VIEW_FORM_TEMPLATES', 'CREATE_FORM_TEMPLATES', 'EDIT_FORM_TEMPLATES', 'DELETE_FORM_TEMPLATES',
      // Permessi specifici per Form Submissions
      'VIEW_FORM_SUBMISSIONS', 'CREATE_FORM_SUBMISSIONS', 'EDIT_FORM_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS', 'EXPORT_FORM_SUBMISSIONS',
      // Permessi specifici per Public CMS
      'VIEW_PUBLIC_CMS', 'CREATE_PUBLIC_CMS', 'EDIT_PUBLIC_CMS', 'MANAGE_PUBLIC_CMS',
      // Permessi specifici per Templates
      'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES',
      // Permessi generici per compatibilità
      'VIEW_CMS', 'EDIT_CMS', 'MANAGE_PUBLIC_CONTENT',
      'VIEW_SUBMISSIONS', 'CREATE_SUBMISSIONS', 'EDIT_SUBMISSIONS', 'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS'
    ],
    
    [ROLE_TYPES.MANAGER]: [
      'VIEW_USERS', 'EDIT_USERS',
      'VIEW_COMPANIES',
      'VIEW_COURSES',
      'VIEW_EMPLOYEES', 'EDIT_EMPLOYEES',
      'VIEW_TRAINERS',
      'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES',
      'VIEW_REPORTS', 'VIEW_ANALYTICS'
    ],
    
    [ROLE_TYPES.HR_MANAGER]: [
      'CREATE_USERS', 'VIEW_USERS', 'EDIT_USERS', 'ROLE_MANAGEMENT',
      'VIEW_COMPANIES',
      'VIEW_COURSES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
      'VIEW_TRAINERS',
      'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES',
      'VIEW_REPORTS', 'VIEW_ANALYTICS'
    ],
    
    [ROLE_TYPES.TRAINER]: [
      'VIEW_USERS',
      'VIEW_COURSES',
      'VIEW_EMPLOYEES',
      'VIEW_SCHEDULES',
      'VIEW_REPORTS'
    ],
    
    [ROLE_TYPES.SENIOR_TRAINER]: [
      'VIEW_USERS',
      'VIEW_COURSES', 'EDIT_COURSES',
      'VIEW_EMPLOYEES',
      'VIEW_TRAINERS',
      'CREATE_SCHEDULES', 'VIEW_SCHEDULES', 'EDIT_SCHEDULES',
      'VIEW_REPORTS'
    ],
    
    [ROLE_TYPES.EMPLOYEE]: [
      'VIEW_COURSES',
      'VIEW_SCHEDULES'
    ],
    
    [ROLE_TYPES.VIEWER]: [
      'VIEW_COURSES',
      'VIEW_SCHEDULES',
      'VIEW_REPORTS'
    ]
  };

  return permissionMatrix[roleType] || [];
}

/**
 * Verifica se un ruolo ha un permesso specifico di default
 */
export function roleHasPermission(roleType, permission) {
  const permissions = getDefaultPermissions(roleType);
  return permissions.includes(permission);
}

/**
 * Ottiene tutti i ruoli che hanno un permesso specifico
 */
export function getRolesWithPermission(permission) {
  const rolesWithPermission = [];
  
  Object.values(ROLE_TYPES).forEach(roleType => {
    if (roleHasPermission(roleType, permission)) {
      rolesWithPermission.push(roleType);
    }
  });
  
  return rolesWithPermission;
}

/**
 * Ottiene il numero di permessi per ruolo
 */
export function getPermissionCount(roleType) {
  return getDefaultPermissions(roleType).length;
}

export default {
  ROLE_TYPES,
  ROLE_SCOPES,
  PERMISSIONS,
  isValidRoleType,
  isValidScope,
  getAllRoleTypes,
  getAllScopes,
  getAllPermissions,
  getPermissionDescription,
  isValidPermission,
  getDefaultPermissions,
  roleHasPermission,
  getRolesWithPermission,
  getPermissionCount
};