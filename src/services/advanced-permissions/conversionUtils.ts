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
  // Entità principali
  'persons': 'PERSONS',
  'companies': 'COMPANIES',
  'courses': 'COURSES',
  'roles': 'ROLES',
  'users': 'USERS',

  // Entità virtuali basate su Person
  'employees': 'EMPLOYEES',
  'trainers': 'TRAINERS',
  'dipendenti': 'EMPLOYEES', // Alias italiano
  'formatori': 'TRAINERS',   // Alias italiano

  // Sicurezza e compliance
  'sites': 'SITES',
  'reparti': 'REPARTI',
  'dvr': 'DVR',
  'sopralluoghi': 'SOPRALLUOGHI',
  'gdpr': 'GDPR',

  // Gestione organizzazione
  'hierarchy': 'HIERARCHY',
  'documents': 'DOCUMENTS',
  'certificates': 'CERTIFICATES',
  'equipment': 'EQUIPMENT',
  'incidents': 'INCIDENTS',
  'audits': 'AUDITS',
  'audit_logs': 'AUDIT_LOGS',
  'policies': 'POLICIES',
  'procedures': 'PROCEDURES',

  // Scheduling e pianificazione
  'trainings': 'SCHEDULES',     // trainings -> SCHEDULES nel backend
  'schedules': 'SCHEDULES',

  // Business
  'quotes': 'QUOTES',
  'invoices': 'INVOICES',
  'preventivi': 'PREVENTIVI',
  'codici_sconto': 'CODICI_SCONTO',

  // Risk management
  'risks': 'RISKS',
  'controls': 'CONTROLS',
  'assessments': 'ASSESSMENTS',

  // Sistema
  'notifications': 'NOTIFICATIONS',
  'reports': 'REPORTS',
  'analytics': 'ANALYTICS',
  'settings': 'SETTINGS',
  'logs': 'LOGS',
  'backups': 'BACKUPS',
  'integrations': 'INTEGRATIONS',
  'workflows': 'WORKFLOWS',
  'api_keys': 'API_KEYS',

  // CMS e Form
  'form_templates': 'FORM_TEMPLATES',
  'form_submissions': 'FORM_SUBMISSIONS',
  'submissions': 'SUBMISSIONS',  // Alias per form_submissions
  'public_cms': 'PUBLIC_CMS',
  'cms': 'CMS',
  'cms_pages': 'CMS_PAGES',
  'cms_media': 'CMS_MEDIA',
  'cms_navigation': 'CMS_NAVIGATION',
  'seo': 'SEO',
  'templates': 'TEMPLATES',

  // Tenant e administration
  'tenants': 'TENANTS',
  'administration': 'ADMINISTRATION',

  // P69: Clinical / Poliambulatorio
  'poliambulatori': 'POLIAMBULATORI',
  'sedi_cliniche': 'SEDI_CLINICHE',
  'ambulatori': 'AMBULATORI',
  'prestazioni': 'PRESTAZIONI',
  'medici_abilitati': 'MEDICI_ABILITATI',
  'appuntamenti': 'APPUNTAMENTI',
  'slot_disponibilita': 'SLOT_DISPONIBILITA',
  'visite': 'VISITE',
  'referti': 'REFERTI',
  'documenti_clinici': 'DOCUMENTI_CLINICI',
  'convenzioni': 'CONVENZIONI',
  'tariffari': 'TARIFFARI',
  'fatture_sanitarie': 'FATTURE_SANITARIE',
  'strumenti': 'STRUMENTI',
  'coda_pazienti': 'CODA_PAZIENTI',
  'visit_templates': 'VISIT_TEMPLATES',
  'protocolli_sanitari': 'PROTOCOLLI_SANITARI',
  'farmaci': 'FARMACI',
  'disponibilita_medici': 'DISPONIBILITA_MEDICI'
};

// Mappa inversa: backend entity name -> frontend entity name
const ENTITY_MAP_FROM_BACKEND: Record<string, string> = {
  'PERSONS': 'persons',
  'COMPANIES': 'companies',
  'COURSES': 'courses',
  'ROLES': 'roles',
  'USERS': 'users',
  'EMPLOYEES': 'employees',
  'TRAINERS': 'trainers',
  'SITES': 'sites',
  'REPARTI': 'reparti',
  'DVR': 'dvr',
  'SOPRALLUOGHI': 'sopralluoghi',
  'GDPR': 'gdpr',
  'HIERARCHY': 'hierarchy',
  'DOCUMENTS': 'documents',
  'CERTIFICATES': 'certificates',
  'EQUIPMENT': 'equipment',
  'INCIDENTS': 'incidents',
  'AUDITS': 'audits',
  'AUDIT_LOGS': 'audit_logs',
  'POLICIES': 'policies',
  'PROCEDURES': 'procedures',
  'SCHEDULES': 'trainings', // Backend SCHEDULES -> frontend trainings
  'QUOTES': 'quotes',
  'INVOICES': 'invoices',
  'PREVENTIVI': 'preventivi',
  'CODICI_SCONTO': 'codici_sconto',
  'RISKS': 'risks',
  'CONTROLS': 'controls',
  'ASSESSMENTS': 'assessments',
  'NOTIFICATIONS': 'notifications',
  'REPORTS': 'reports',
  'ANALYTICS': 'analytics',
  'SETTINGS': 'settings',
  'LOGS': 'logs',
  'BACKUPS': 'backups',
  'INTEGRATIONS': 'integrations',
  'WORKFLOWS': 'workflows',
  'API_KEYS': 'api_keys',
  'FORM_TEMPLATES': 'form_templates',
  'FORM_SUBMISSIONS': 'form_submissions',
  'PUBLIC_CMS': 'public_cms',
  'CMS': 'public_cms',
  'CMS_PAGES': 'public_cms',
  'CMS_MEDIA': 'public_cms',
  'CMS_NAVIGATION': 'public_cms',
  'TEMPLATES': 'templates',
  'SEO': 'public_cms',
  'TENANTS': 'tenants',
  'ADMINISTRATION': 'administration',
  // Mappature aggiuntive per permessi dal backend
  'SUBMISSIONS': 'form_submissions',  // SUBMISSIONS -> form_submissions

  // P69: Clinical / Poliambulatorio
  'POLIAMBULATORI': 'poliambulatori',
  'SEDI_CLINICHE': 'sedi_cliniche',
  'AMBULATORI': 'ambulatori',
  'PRESTAZIONI': 'prestazioni',
  'MEDICI_ABILITATI': 'medici_abilitati',
  'APPUNTAMENTI': 'appuntamenti',
  'SLOT_DISPONIBILITA': 'slot_disponibilita',
  'VISITE': 'visite',
  'REFERTI': 'referti',
  'DOCUMENTI_CLINICI': 'documenti_clinici',
  'CONVENZIONI': 'convenzioni',
  'TARIFFARI': 'tariffari',
  'FATTURE_SANITARIE': 'fatture_sanitarie',
  'STRUMENTI': 'strumenti',
  'CODA_PAZIENTI': 'coda_pazienti',
  'VISIT_TEMPLATES': 'visit_templates',
  'PROTOCOLLI_SANITARI': 'protocolli_sanitari',
  'FARMACI': 'farmaci',
  'DISPONIBILITA_MEDICI': 'disponibilita_medici'
};

/**
 * Converte i permessi dal formato backend al formato frontend
 * Filtra automaticamente i permessi con entità non riconosciute
 * @version 3.0 - Added support for new entity:action format (e.g., "notifications:create")
 */
export function convertFromBackendFormat(backendPermissions: any[]): EntityPermission[] {

  return backendPermissions
    .map(permission => {
      // Estrae l'entità e l'azione dal nome del permesso
      const permissionId = permission.permissionId || permission.action || permission.name || '';
      let entity = 'unknown';
      let action = 'read';

      // P69: Check for new format "entity:action" (e.g., "notifications:create")
      const colonIndex = permissionId.indexOf(':');
      if (colonIndex > 0) {
        // New format: entity:action
        entity = permissionId.substring(0, colonIndex);
        action = permissionId.substring(colonIndex + 1);
      } else {
        // Legacy format: ACTION_ENTITY (e.g., VIEW_COMPANIES)
        // Mappa le azioni del backend alle azioni del frontend
        for (const [backendAction, frontendAction] of Object.entries(ACTION_MAP_FROM_BACKEND)) {
          if (permissionId.startsWith(backendAction) || permissionId.includes(backendAction)) {
            action = frontendAction;
            break;
          }
        }

        // Estrae l'entità dal permissionId (es. VIEW_COMPANIES -> COMPANIES -> companies)
        const parts = permissionId.split('_');
        if (parts.length >= 2) {
          // Ricostruisci il nome dell'entità (potrebbe essere composto, es. FORM_TEMPLATES)
          const entityPart = parts.slice(1).join('_');

          // Cerca prima nel mapping inverso
          if (ENTITY_MAP_FROM_BACKEND[entityPart]) {
            entity = ENTITY_MAP_FROM_BACKEND[entityPart];
          } else {
            // Fallback: converti in lowercase
            entity = entityPart.toLowerCase();
          }
        }
      }

      // Se c'è un campo entity esplicito nel permesso, usalo (ma solo se valido)
      if (permission.entity && permission.entity !== 'unknown') {
        entity = permission.entity;
      }

      return {
        entity,
        action,
        scope: permission.scope || 'all',
        // P69: Support backend 'allowedFields' in addition to 'fields' and 'fieldRestrictions'
        fields: permission.allowedFields || permission.fieldRestrictions || permission.fields || [],
        granted: permission.granted !== false // Default true se non specificato
      };
    })
    // IMPORTANTE: Filtra i permessi con entità 'unknown' per evitare errori
    .filter(permission => {
      if (permission.entity === 'unknown') {
        // Non loggare per non inquinare la console
        return false;
      }
      return true;
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
  // Alias senza prefisso FORM_
  'VIEW_SUBMISSIONS', 'CREATE_SUBMISSIONS', 'EDIT_SUBMISSIONS', 'DELETE_SUBMISSIONS',
  'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS',  // Permessi speciali per submissions
  'VIEW_PUBLIC_CMS', 'CREATE_PUBLIC_CMS', 'EDIT_PUBLIC_CMS', 'DELETE_PUBLIC_CMS',
  'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES', 'DELETE_TEMPLATES',
  'VIEW_NOTIFICATIONS', 'CREATE_NOTIFICATIONS', 'EDIT_NOTIFICATIONS', 'DELETE_NOTIFICATIONS',
  'VIEW_AUDIT_LOGS', 'CREATE_AUDIT_LOGS', 'EDIT_AUDIT_LOGS', 'DELETE_AUDIT_LOGS',
  'VIEW_API_KEYS', 'CREATE_API_KEYS', 'EDIT_API_KEYS', 'DELETE_API_KEYS',

  // Nuovi permessi CRUD per entità aggiuntive
  'VIEW_SITES', 'CREATE_SITES', 'EDIT_SITES', 'DELETE_SITES',
  'VIEW_REPARTI', 'CREATE_REPARTI', 'EDIT_REPARTI', 'DELETE_REPARTI',
  'VIEW_DVR', 'CREATE_DVR', 'EDIT_DVR', 'DELETE_DVR',
  'VIEW_SOPRALLUOGHI', 'CREATE_SOPRALLUOGHI', 'EDIT_SOPRALLUOGHI', 'DELETE_SOPRALLUOGHI',
  'VIEW_CERTIFICATES', 'CREATE_CERTIFICATES', 'EDIT_CERTIFICATES', 'DELETE_CERTIFICATES',
  'VIEW_EQUIPMENT', 'CREATE_EQUIPMENT', 'EDIT_EQUIPMENT', 'DELETE_EQUIPMENT',
  'VIEW_INCIDENTS', 'CREATE_INCIDENTS', 'EDIT_INCIDENTS', 'DELETE_INCIDENTS',
  'VIEW_AUDITS', 'CREATE_AUDITS', 'EDIT_AUDITS', 'DELETE_AUDITS',
  'VIEW_POLICIES', 'CREATE_POLICIES', 'EDIT_POLICIES', 'DELETE_POLICIES',
  'VIEW_PROCEDURES', 'CREATE_PROCEDURES', 'EDIT_PROCEDURES', 'DELETE_PROCEDURES',
  'VIEW_RISKS', 'CREATE_RISKS', 'EDIT_RISKS', 'DELETE_RISKS',
  'VIEW_CONTROLS', 'CREATE_CONTROLS', 'EDIT_CONTROLS', 'DELETE_CONTROLS',
  'VIEW_ASSESSMENTS', 'CREATE_ASSESSMENTS', 'EDIT_ASSESSMENTS', 'DELETE_ASSESSMENTS',
  'VIEW_ANALYTICS', 'CREATE_ANALYTICS', 'EDIT_ANALYTICS', 'DELETE_ANALYTICS',
  'VIEW_SETTINGS', 'CREATE_SETTINGS', 'EDIT_SETTINGS', 'DELETE_SETTINGS',
  'VIEW_LOGS', 'CREATE_LOGS', 'EDIT_LOGS', 'DELETE_LOGS',
  'VIEW_BACKUPS', 'CREATE_BACKUPS', 'EDIT_BACKUPS', 'DELETE_BACKUPS',
  'VIEW_INTEGRATIONS', 'CREATE_INTEGRATIONS', 'EDIT_INTEGRATIONS', 'DELETE_INTEGRATIONS',
  'VIEW_WORKFLOWS', 'CREATE_WORKFLOWS', 'EDIT_WORKFLOWS', 'DELETE_WORKFLOWS',
  'VIEW_PREVENTIVI', 'CREATE_PREVENTIVI', 'EDIT_PREVENTIVI', 'DELETE_PREVENTIVI',
  'VIEW_CODICI_SCONTO', 'CREATE_CODICI_SCONTO', 'EDIT_CODICI_SCONTO', 'DELETE_CODICI_SCONTO',
  'VIEW_CMS_PAGES', 'CREATE_CMS_PAGES', 'EDIT_CMS_PAGES', 'DELETE_CMS_PAGES',
  'VIEW_CMS_MEDIA', 'CREATE_CMS_MEDIA', 'EDIT_CMS_MEDIA', 'DELETE_CMS_MEDIA',
  'VIEW_CMS_NAVIGATION', 'CREATE_CMS_NAVIGATION', 'EDIT_CMS_NAVIGATION', 'DELETE_CMS_NAVIGATION',
  'VIEW_CMS_VERSIONS', 'RESTORE_CMS_VERSIONS',
  'VIEW_SEO', 'CREATE_SEO', 'EDIT_SEO', 'DELETE_SEO',

  // Permessi speciali
  'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT', 'ROLE_MANAGEMENT',
  'MANAGE_ENROLLMENTS', 'DOWNLOAD_DOCUMENTS', 'MANAGE_USERS', 'ASSIGN_ROLES',
  'REVOKE_ROLES', 'TENANT_MANAGEMENT', 'EXPORT_GDPR_DATA', 'DELETE_GDPR_DATA',
  'VIEW_GDPR_DATA', 'MANAGE_CONSENTS', 'EXPORT_REPORTS', 'MANAGE_HIERARCHY', 'HIERARCHY_MANAGEMENT',
  'MANAGE_PUBLIC_CONTENT', 'READ_PUBLIC_CONTENT', 'MANAGE_FORM_TEMPLATES',
  'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS',
  'EXPORT_FORM_SUBMISSIONS', 'MANAGE_PUBLIC_CMS', 'MANAGE_TEMPLATES',
  'MANAGE_NOTIFICATIONS', 'SEND_NOTIFICATIONS', 'MANAGE_AUDIT_LOGS',
  'EXPORT_AUDIT_LOGS', 'MANAGE_API_KEYS', 'REGENERATE_API_KEYS',
  'MANAGE_CMS_MEDIA', 'MANAGE_CMS_NAVIGATION', 'PUBLISH_CMS_PAGES',
  'GENERATE_SITEMAP', 'MANAGE_CODICI_SCONTO', 'MANAGE_PREVENTIVI',
  'GENERATE_PREVENTIVI_PDF', 'SEND_PREVENTIVI'
];

/**
 * Converte i permessi dal formato frontend al formato backend
 * Filtra automaticamente i permessi con entità non riconosciute
 * @version 2.0 - Fixed entity validation with proper filtering
 */
export function convertToBackendFormat(frontendPermissions: EntityPermission[]): any[] {

  return frontendPermissions
    .map(permission => {
      // Salta permessi con entità unknown
      if (permission.entity === 'unknown' || !permission.entity) {
        return null;
      }

      const permissionId = `${permission.entity}:${permission.action}`;

      // Verifica se il permesso è valido
      return {
        permissionId: permissionId,
        granted: permission.granted !== false, // Usa il valore dal frontend, default true se non specificato
        scope: permission.scope || 'all',
        fieldRestrictions: permission.fields || [],
        allowedFields: permission.fields || [] // P69: Include both for backend compatibility
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
  return `${entity}:${action}`;
}
