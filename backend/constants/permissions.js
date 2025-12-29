/**
 * Permission Constants - Formato Standardizzato E2E
 * 
 * FORMATO UNICO: resource:action
 * 
 * Convenzioni:
 * - resource: nome entità in lowercase (companies, persons, courses)
 * - action: operazione in lowercase (read, create, update, delete, manage)
 * - sub-resource: resource.subresource:action (clinica.visite:read)
 * 
 * Azioni Standard:
 * - read: Visualizzare/leggere
 * - create: Creare nuovo
 * - update: Modificare esistente
 * - delete: Eliminare
 * - manage: Tutte le operazioni + configurazione (include CRUD)
 * - export: Esportare dati
 * - import: Importare dati
 * 
 * Wildcards:
 * - resource:* - Tutte le azioni su una risorsa
 * - *:* - Tutti i permessi (solo ADMIN)
 * 
 * @module constants/permissions
 * @version 2.0.0 - E2E Migration (no backward compatibility)
 */

// ============================================
// STANDARD PERMISSIONS - FORMATO resource:action
// ============================================

export const PERMISSIONS = {
  // ----------------------------------------
  // SYSTEM & ADMIN
  // ----------------------------------------
  ADMIN_ACCESS: 'admin:access',
  SYSTEM_MANAGE: 'system:manage',
  SYSTEM_SETTINGS: 'system:settings',
  
  // ----------------------------------------
  // TENANTS
  // ----------------------------------------
  TENANTS_READ: 'tenants:read',
  TENANTS_CREATE: 'tenants:create',
  TENANTS_UPDATE: 'tenants:update',
  TENANTS_DELETE: 'tenants:delete',
  TENANTS_MANAGE: 'tenants:manage',
  
  // ----------------------------------------
  // USERS & PERSONS
  // ----------------------------------------
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE: 'users:manage',
  
  PERSONS_READ: 'persons:read',
  PERSONS_CREATE: 'persons:create',
  PERSONS_UPDATE: 'persons:update',
  PERSONS_DELETE: 'persons:delete',
  PERSONS_MANAGE: 'persons:manage',
  PERSONS_IMPORT: 'persons:import',
  PERSONS_EXPORT: 'persons:export',
  
  EMPLOYEES_READ: 'employees:read',
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_UPDATE: 'employees:update',
  EMPLOYEES_DELETE: 'employees:delete',
  EMPLOYEES_MANAGE: 'employees:manage',
  
  TRAINERS_READ: 'trainers:read',
  TRAINERS_CREATE: 'trainers:create',
  TRAINERS_UPDATE: 'trainers:update',
  TRAINERS_DELETE: 'trainers:delete',
  TRAINERS_MANAGE: 'trainers:manage',
  
  // ----------------------------------------
  // ROLES & PERMISSIONS
  // ----------------------------------------
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_MANAGE: 'roles:manage',
  ROLES_ASSIGN: 'roles:assign',
  
  // ----------------------------------------
  // COMPANIES
  // ----------------------------------------
  COMPANIES_READ: 'companies:read',
  COMPANIES_CREATE: 'companies:create',
  COMPANIES_UPDATE: 'companies:update',
  COMPANIES_DELETE: 'companies:delete',
  COMPANIES_MANAGE: 'companies:manage',
  COMPANIES_IMPORT: 'companies:import',
  COMPANIES_EXPORT: 'companies:export',
  
  // ----------------------------------------
  // COURSES & SCHEDULES
  // ----------------------------------------
  COURSES_READ: 'courses:read',
  COURSES_CREATE: 'courses:create',
  COURSES_UPDATE: 'courses:update',
  COURSES_DELETE: 'courses:delete',
  COURSES_MANAGE: 'courses:manage',
  
  SCHEDULES_READ: 'schedules:read',
  SCHEDULES_CREATE: 'schedules:create',
  SCHEDULES_UPDATE: 'schedules:update',
  SCHEDULES_DELETE: 'schedules:delete',
  SCHEDULES_MANAGE: 'schedules:manage',
  
  ENROLLMENTS_READ: 'enrollments:read',
  ENROLLMENTS_CREATE: 'enrollments:create',
  ENROLLMENTS_UPDATE: 'enrollments:update',
  ENROLLMENTS_DELETE: 'enrollments:delete',
  ENROLLMENTS_MANAGE: 'enrollments:manage',
  
  // ----------------------------------------
  // DOCUMENTS & TEMPLATES
  // ----------------------------------------
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_CREATE: 'documents:create',
  DOCUMENTS_UPDATE: 'documents:update',
  DOCUMENTS_DELETE: 'documents:delete',
  DOCUMENTS_MANAGE: 'documents:manage',
  DOCUMENTS_DOWNLOAD: 'documents:download',
  DOCUMENTS_SEND: 'documents:send',
  
  TEMPLATES_READ: 'templates:read',
  TEMPLATES_CREATE: 'templates:create',
  TEMPLATES_UPDATE: 'templates:update',
  TEMPLATES_DELETE: 'templates:delete',
  TEMPLATES_MANAGE: 'templates:manage',
  
  ATTESTATI_READ: 'attestati:read',
  ATTESTATI_CREATE: 'attestati:create',
  ATTESTATI_UPDATE: 'attestati:update',
  ATTESTATI_DELETE: 'attestati:delete',
  ATTESTATI_MANAGE: 'attestati:manage',
  ATTESTATI_GENERATE: 'attestati:generate',
  
  // ----------------------------------------
  // CMS
  // ----------------------------------------
  CMS_READ: 'cms:read',
  CMS_CREATE: 'cms:create',
  CMS_UPDATE: 'cms:update',
  CMS_DELETE: 'cms:delete',
  CMS_MANAGE: 'cms:manage',
  
  CMS_PAGES_READ: 'cms.pages:read',
  CMS_PAGES_CREATE: 'cms.pages:create',
  CMS_PAGES_UPDATE: 'cms.pages:update',
  CMS_PAGES_DELETE: 'cms.pages:delete',
  CMS_PAGES_PUBLISH: 'cms.pages:publish',
  CMS_PAGES_MANAGE: 'cms.pages:manage',
  
  CMS_MEDIA_READ: 'cms.media:read',
  CMS_MEDIA_CREATE: 'cms.media:create',
  CMS_MEDIA_UPDATE: 'cms.media:update',
  CMS_MEDIA_DELETE: 'cms.media:delete',
  CMS_MEDIA_MANAGE: 'cms.media:manage',
  
  CMS_NAVIGATION_READ: 'cms.navigation:read',
  CMS_NAVIGATION_UPDATE: 'cms.navigation:update',
  CMS_NAVIGATION_MANAGE: 'cms.navigation:manage',
  
  // ----------------------------------------
  // FORMS & SUBMISSIONS
  // ----------------------------------------
  FORMS_READ: 'forms:read',
  FORMS_CREATE: 'forms:create',
  FORMS_UPDATE: 'forms:update',
  FORMS_DELETE: 'forms:delete',
  FORMS_MANAGE: 'forms:manage',
  
  SUBMISSIONS_READ: 'submissions:read',
  SUBMISSIONS_CREATE: 'submissions:create',
  SUBMISSIONS_UPDATE: 'submissions:update',
  SUBMISSIONS_DELETE: 'submissions:delete',
  SUBMISSIONS_MANAGE: 'submissions:manage',
  SUBMISSIONS_EXPORT: 'submissions:export',
  
  // ----------------------------------------
  // PREVENTIVI & INVOICES
  // ----------------------------------------
  PREVENTIVI_READ: 'preventivi:read',
  PREVENTIVI_CREATE: 'preventivi:create',
  PREVENTIVI_UPDATE: 'preventivi:update',
  PREVENTIVI_DELETE: 'preventivi:delete',
  PREVENTIVI_MANAGE: 'preventivi:manage',
  PREVENTIVI_SEND: 'preventivi:send',
  PREVENTIVI_GENERATE_PDF: 'preventivi:generate_pdf',
  
  INVOICES_READ: 'invoices:read',
  INVOICES_CREATE: 'invoices:create',
  INVOICES_UPDATE: 'invoices:update',
  INVOICES_DELETE: 'invoices:delete',
  INVOICES_MANAGE: 'invoices:manage',
  
  CODICI_SCONTO_READ: 'codici_sconto:read',
  CODICI_SCONTO_CREATE: 'codici_sconto:create',
  CODICI_SCONTO_UPDATE: 'codici_sconto:update',
  CODICI_SCONTO_DELETE: 'codici_sconto:delete',
  CODICI_SCONTO_MANAGE: 'codici_sconto:manage',
  
  // ----------------------------------------
  // NOTIFICATIONS & SETTINGS
  // ----------------------------------------
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_CREATE: 'notifications:create',
  NOTIFICATIONS_UPDATE: 'notifications:update',
  NOTIFICATIONS_DELETE: 'notifications:delete',
  NOTIFICATIONS_MANAGE: 'notifications:manage',
  NOTIFICATIONS_SEND: 'notifications:send',
  
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_MANAGE: 'settings:manage',
  
  // ----------------------------------------
  // GDPR & AUDIT
  // ----------------------------------------
  GDPR_READ: 'gdpr:read',
  GDPR_MANAGE: 'gdpr:manage',
  GDPR_EXPORT: 'gdpr:export',
  GDPR_DELETE: 'gdpr:delete',
  CONSENTS_MANAGE: 'consents:manage',
  
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',
  AUDIT_MANAGE: 'audit:manage',
  
  // ----------------------------------------
  // SEO & SITEMAP
  // ----------------------------------------
  SEO_READ: 'seo:read',
  SEO_UPDATE: 'seo:update',
  SEO_MANAGE: 'seo:manage',
  SEO_DELETE: 'seo:delete',
  SITEMAP_GENERATE: 'sitemap:generate',
  
  // ----------------------------------------
  // API KEYS
  // ----------------------------------------
  API_KEYS_READ: 'api_keys:read',
  API_KEYS_CREATE: 'api_keys:create',
  API_KEYS_UPDATE: 'api_keys:update',
  API_KEYS_DELETE: 'api_keys:delete',
  API_KEYS_MANAGE: 'api_keys:manage',
  
  // ----------------------------------------
  // REPORTS & ANALYTICS
  // ----------------------------------------
  REPORTS_READ: 'reports:read',
  REPORTS_CREATE: 'reports:create',
  REPORTS_EXPORT: 'reports:export',
  REPORTS_MANAGE: 'reports:manage',
  
  DASHBOARD_READ: 'dashboard:read',
  DASHBOARD_MANAGE: 'dashboard:manage',
  
  // ----------------------------------------
  // HIERARCHY
  // ----------------------------------------
  HIERARCHY_READ: 'hierarchy:read',
  HIERARCHY_CREATE: 'hierarchy:create',
  HIERARCHY_UPDATE: 'hierarchy:update',
  HIERARCHY_DELETE: 'hierarchy:delete',
  HIERARCHY_MANAGE: 'hierarchy:manage',
  
  // ----------------------------------------
  // IMPORTS
  // ----------------------------------------
  IMPORTS_READ: 'imports:read',
  IMPORTS_CREATE: 'imports:create',
  IMPORTS_UPDATE: 'imports:update',
  IMPORTS_DELETE: 'imports:delete',
  IMPORTS_MANAGE: 'imports:manage',
  IMPORTS_EXECUTE: 'imports:execute',
  
  // ----------------------------------------
  // CLINICA (Element Medica)
  // ----------------------------------------
  CLINICA_READ: 'clinica:read',
  CLINICA_MANAGE: 'clinica:manage',
  
  POLIAMBULATORI_READ: 'clinica.poliambulatori:read',
  POLIAMBULATORI_CREATE: 'clinica.poliambulatori:create',
  POLIAMBULATORI_UPDATE: 'clinica.poliambulatori:update',
  POLIAMBULATORI_DELETE: 'clinica.poliambulatori:delete',
  POLIAMBULATORI_MANAGE: 'clinica.poliambulatori:manage',
  
  AMBULATORI_READ: 'clinica.ambulatori:read',
  AMBULATORI_CREATE: 'clinica.ambulatori:create',
  AMBULATORI_UPDATE: 'clinica.ambulatori:update',
  AMBULATORI_DELETE: 'clinica.ambulatori:delete',
  AMBULATORI_MANAGE: 'clinica.ambulatori:manage',
  
  PRESTAZIONI_READ: 'clinica.prestazioni:read',
  PRESTAZIONI_CREATE: 'clinica.prestazioni:create',
  PRESTAZIONI_UPDATE: 'clinica.prestazioni:update',
  PRESTAZIONI_DELETE: 'clinica.prestazioni:delete',
  PRESTAZIONI_MANAGE: 'clinica.prestazioni:manage',
  
  APPUNTAMENTI_READ: 'clinica.appuntamenti:read',
  APPUNTAMENTI_CREATE: 'clinica.appuntamenti:create',
  APPUNTAMENTI_UPDATE: 'clinica.appuntamenti:update',
  APPUNTAMENTI_DELETE: 'clinica.appuntamenti:delete',
  APPUNTAMENTI_MANAGE: 'clinica.appuntamenti:manage',
  
  VISITE_READ: 'clinica.visite:read',
  VISITE_CREATE: 'clinica.visite:create',
  VISITE_UPDATE: 'clinica.visite:update',
  VISITE_DELETE: 'clinica.visite:delete',
  VISITE_MANAGE: 'clinica.visite:manage',
  
  REFERTI_READ: 'clinica.referti:read',
  REFERTI_CREATE: 'clinica.referti:create',
  REFERTI_UPDATE: 'clinica.referti:update',
  REFERTI_DELETE: 'clinica.referti:delete',
  REFERTI_MANAGE: 'clinica.referti:manage',
  
  STRUMENTI_READ: 'clinica.strumenti:read',
  STRUMENTI_CREATE: 'clinica.strumenti:create',
  STRUMENTI_UPDATE: 'clinica.strumenti:update',
  STRUMENTI_DELETE: 'clinica.strumenti:delete',
  STRUMENTI_MANAGE: 'clinica.strumenti:manage',
  
  MANUTENZIONI_READ: 'clinica.manutenzioni:read',
  MANUTENZIONI_CREATE: 'clinica.manutenzioni:create',
  MANUTENZIONI_UPDATE: 'clinica.manutenzioni:update',
  MANUTENZIONI_DELETE: 'clinica.manutenzioni:delete',
  MANUTENZIONI_MANAGE: 'clinica.manutenzioni:manage',
  
  CONVENZIONI_READ: 'clinica.convenzioni:read',
  CONVENZIONI_CREATE: 'clinica.convenzioni:create',
  CONVENZIONI_UPDATE: 'clinica.convenzioni:update',
  CONVENZIONI_DELETE: 'clinica.convenzioni:delete',
  CONVENZIONI_MANAGE: 'clinica.convenzioni:manage',
  
  TARIFFARI_READ: 'tariffari:read',
  TARIFFARI_CREATE: 'tariffari:create',
  TARIFFARI_UPDATE: 'tariffari:update',
  TARIFFARI_DELETE: 'tariffari:delete',
  TARIFFARI_MANAGE: 'tariffari:manage',
  
  CARTELLA_PAZIENTE_READ: 'cartella_paziente:read',
  CARTELLA_PAZIENTE_CREATE: 'cartella_paziente:create',
  CARTELLA_PAZIENTE_UPDATE: 'cartella_paziente:update',
  CARTELLA_PAZIENTE_DELETE: 'cartella_paziente:delete',
  CARTELLA_PAZIENTE_MANAGE: 'cartella_paziente:manage',
  
  FATTURE_SANITARIE_READ: 'fatture_sanitarie:read',
  FATTURE_SANITARIE_CREATE: 'fatture_sanitarie:create',
  FATTURE_SANITARIE_UPDATE: 'fatture_sanitarie:update',
  FATTURE_SANITARIE_DELETE: 'fatture_sanitarie:delete',
  FATTURE_SANITARIE_MANAGE: 'fatture_sanitarie:manage',
  
  OFFERTE_BUNDLE_READ: 'offerte_bundle:read',
  OFFERTE_BUNDLE_CREATE: 'offerte_bundle:create',
  OFFERTE_BUNDLE_UPDATE: 'offerte_bundle:update',
  OFFERTE_BUNDLE_DELETE: 'offerte_bundle:delete',
  OFFERTE_BUNDLE_MANAGE: 'offerte_bundle:manage',
  
  SCONTI_READ: 'clinica.sconti:read',
  SCONTI_CREATE: 'clinica.sconti:create',
  SCONTI_UPDATE: 'clinica.sconti:update',
  SCONTI_DELETE: 'clinica.sconti:delete',
  SCONTI_MANAGE: 'clinica.sconti:manage',
  
  // ----------------------------------------
  // CALENDAR
  // ----------------------------------------
  CALENDAR_READ: 'calendar:read',
  CALENDAR_CREATE: 'calendar:create',
  CALENDAR_UPDATE: 'calendar:update',
  CALENDAR_MANAGE: 'calendar:manage',
  
  // ----------------------------------------
  // PUBLIC CONTENT
  // ----------------------------------------
  PUBLIC_CONTENT_READ: 'public_content:read',
  PUBLIC_CONTENT_MANAGE: 'public_content:manage',
};

// ============================================
// ALL PERMISSIONS ARRAY (per seed e validazione)
// ============================================

/**
 * Array di tutti i permessi standard
 * Usato per seeding e validazione
 */
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// ============================================
// PERMISSION GROUPS (per assegnazione ruoli)
// ============================================

/**
 * Permessi per ruolo ADMIN - tutti i permessi
 */
export const ADMIN_PERMISSIONS = ALL_PERMISSIONS;

/**
 * Permessi per ruolo USER base
 */
export const USER_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.PERSONS_READ,
  PERMISSIONS.COMPANIES_READ,
  PERMISSIONS.COURSES_READ,
  PERMISSIONS.SCHEDULES_READ,
  PERMISSIONS.DOCUMENTS_READ,
  PERMISSIONS.NOTIFICATIONS_READ,
];

/**
 * Permessi per ruolo EMPLOYEE
 */
export const EMPLOYEE_PERMISSIONS = [
  ...USER_PERMISSIONS,
  PERMISSIONS.ENROLLMENTS_READ,
  PERMISSIONS.DOCUMENTS_DOWNLOAD,
];

/**
 * Permessi per ruolo TRAINER
 */
export const TRAINER_PERMISSIONS = [
  ...USER_PERMISSIONS,
  PERMISSIONS.SCHEDULES_READ,
  PERMISSIONS.SCHEDULES_UPDATE,
  PERMISSIONS.ENROLLMENTS_READ,
  PERMISSIONS.ENROLLMENTS_UPDATE,
  PERMISSIONS.DOCUMENTS_READ,
  PERMISSIONS.DOCUMENTS_CREATE,
];

/**
 * Permessi per ruolo MEDICO (Element Medica)
 */
export const MEDICO_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.CLINICA_READ,
  PERMISSIONS.POLIAMBULATORI_READ,
  PERMISSIONS.AMBULATORI_READ,
  PERMISSIONS.PRESTAZIONI_READ,
  PERMISSIONS.APPUNTAMENTI_READ,
  PERMISSIONS.APPUNTAMENTI_UPDATE,
  PERMISSIONS.VISITE_READ,
  PERMISSIONS.VISITE_CREATE,
  PERMISSIONS.VISITE_UPDATE,
  PERMISSIONS.REFERTI_READ,
  PERMISSIONS.REFERTI_CREATE,
  PERMISSIONS.REFERTI_UPDATE,
  PERMISSIONS.CARTELLA_PAZIENTE_READ,
  PERMISSIONS.CARTELLA_PAZIENTE_UPDATE,
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Verifica se un permesso è valido (esiste nelle costanti)
 * @param {string} permission - Permesso da verificare
 * @returns {boolean}
 */
export function isValidPermission(permission) {
  return ALL_PERMISSIONS.includes(permission);
}

/**
 * Ottiene permessi per categoria/risorsa
 * @param {string} resource - Risorsa (es. 'clinica', 'cms', 'users')
 * @returns {string[]}
 */
export function getPermissionsByResource(resource) {
  const prefix = resource.toLowerCase();
  return ALL_PERMISSIONS.filter(p => 
    p.startsWith(prefix + ':') || p.startsWith(prefix + '.')
  );
}

/**
 * Verifica se un permesso match con wildcards
 * @param {string} userPermission - Permesso dell'utente (può contenere *)
 * @param {string} requiredPermission - Permesso richiesto
 * @returns {boolean}
 */
export function matchPermission(userPermission, requiredPermission) {
  // Exact match
  if (userPermission === requiredPermission) return true;
  
  // Wildcard all
  if (userPermission === '*:*') return true;
  
  // Resource wildcard (resource:*)
  if (userPermission.endsWith(':*')) {
    const userResource = userPermission.slice(0, -2);
    const [reqResource] = requiredPermission.split(':');
    
    // Check direct match
    if (userResource === reqResource) return true;
    
    // Check sub-resource (clinica:* matches clinica.visite:read)
    if (requiredPermission.startsWith(userResource + '.')) return true;
  }
  
  return false;
}

/**
 * Verifica se un utente ha un permesso dato i suoi permessi
 * @param {string[]} userPermissions - Lista permessi utente
 * @param {string} requiredPermission - Permesso richiesto
 * @returns {boolean}
 */
export function hasPermission(userPermissions, requiredPermission) {
  return userPermissions.some(up => matchPermission(up, requiredPermission));
}

export default PERMISSIONS;
