/**
 * Activity Types and Categories
 * Definisce tutti i tipi di attività tracciabili nel sistema
 * 
 * GDPR Compliance:
 * - Nessun dato sensibile nelle definizioni
 * - Categorie separate per audit trail
 * - Mapping automatico action -> category
 * 
 * @module ActivityTypes
 */

/**
 * Categorie di attività
 * @readonly
 * @enum {string}
 */
export const ActivityCategory = {
  /** Operazioni di autenticazione */
  AUTH: 'AUTH',
  /** Operazioni CRUD su entità */
  CRUD: 'CRUD',
  /** Navigazione e ricerche */
  NAVIGATION: 'NAVIGATION',
  /** Operazioni su documenti */
  DOCUMENT: 'DOCUMENT',
  /** Operazioni amministrative */
  ADMIN: 'ADMIN',
  /** Operazioni di sistema */
  SYSTEM: 'SYSTEM',
  /** Operazioni cliniche (ElementMedica) */
  CLINICAL: 'CLINICAL',
  /** Operazioni formazione (ElementSicurezza) */
  TRAINING: 'TRAINING'
};

/**
 * Tipi di attività tracciabili
 * @readonly
 * @enum {string}
 */
export const ActivityType = {
  // ========================================
  // AUTH - Autenticazione e sessioni
  // ========================================
  /** Login riuscito */
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  /** Login fallito */
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  /** Logout utente */
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  /** Token refreshato */
  AUTH_TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  /** Richiesta reset password */
  AUTH_PASSWORD_RESET_REQUEST: 'AUTH_PASSWORD_RESET_REQUEST',
  /** Password resettata con successo */
  AUTH_PASSWORD_RESET_COMPLETE: 'AUTH_PASSWORD_RESET_COMPLETE',
  /** Sessione scaduta */
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  /** Login da dispositivo concorrente */
  AUTH_CONCURRENT_LOGIN: 'AUTH_CONCURRENT_LOGIN',
  /** Cambio password */
  AUTH_PASSWORD_CHANGE: 'AUTH_PASSWORD_CHANGE',
  /** Two-factor authentication abilitato */
  AUTH_2FA_ENABLED: 'AUTH_2FA_ENABLED',
  /** Two-factor authentication disabilitato */
  AUTH_2FA_DISABLED: 'AUTH_2FA_DISABLED',

  // ========================================
  // CRUD - Operazioni su entità
  // ========================================
  /** Creazione entità */
  ENTITY_CREATE: 'ENTITY_CREATE',
  /** Lettura singola entità */
  ENTITY_READ: 'ENTITY_READ',
  /** Lettura lista entità */
  ENTITY_LIST: 'ENTITY_LIST',
  /** Modifica entità */
  ENTITY_UPDATE: 'ENTITY_UPDATE',
  /** Eliminazione entità (soft delete) */
  ENTITY_DELETE: 'ENTITY_DELETE',
  /** Ripristino entità eliminata */
  ENTITY_RESTORE: 'ENTITY_RESTORE',
  /** Export dati */
  ENTITY_EXPORT: 'ENTITY_EXPORT',
  /** Import dati */
  ENTITY_IMPORT: 'ENTITY_IMPORT',
  /** Archiviazione entità */
  ENTITY_ARCHIVE: 'ENTITY_ARCHIVE',

  // ========================================
  // NAVIGATION - Navigazione e ricerche
  // ========================================
  /** Visualizzazione pagina */
  PAGE_VIEW: 'PAGE_VIEW',
  /** Ricerca effettuata */
  SEARCH_PERFORMED: 'SEARCH_PERFORMED',
  /** Filtro applicato */
  FILTER_APPLIED: 'FILTER_APPLIED',
  /** Cambio modulo (ElementMedica <-> ElementSicurezza) */
  MODULE_SWITCH: 'MODULE_SWITCH',

  // ========================================
  // DOCUMENT - Operazioni documenti
  // ========================================
  /** Generazione documento */
  DOCUMENT_GENERATE: 'DOCUMENT_GENERATE',
  /** Download documento */
  DOCUMENT_DOWNLOAD: 'DOCUMENT_DOWNLOAD',
  /** Firma documento */
  DOCUMENT_SIGN: 'DOCUMENT_SIGN',
  /** Condivisione documento */
  DOCUMENT_SHARE: 'DOCUMENT_SHARE',
  /** Visualizzazione documento */
  DOCUMENT_VIEW: 'DOCUMENT_VIEW',
  /** Annullamento documento */
  DOCUMENT_VOID: 'DOCUMENT_VOID',
  /** Invio documento via email */
  DOCUMENT_EMAIL: 'DOCUMENT_EMAIL',

  // ========================================
  // ADMIN - Operazioni amministrative
  // ========================================
  /** Permesso concesso */
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  /** Permesso revocato */
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
  /** Ruolo assegnato */
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  /** Ruolo rimosso */
  ROLE_REMOVED: 'ROLE_REMOVED',
  /** Cambio tenant */
  TENANT_SWITCH: 'TENANT_SWITCH',
  /** Modifica impostazioni */
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  /** Invito utente */
  USER_INVITED: 'USER_INVITED',
  /** Attivazione utente */
  USER_ACTIVATED: 'USER_ACTIVATED',
  /** Disattivazione utente */
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  /** Modifica profilo */
  PROFILE_UPDATED: 'PROFILE_UPDATED',

  // ========================================
  // CLINICAL - ElementMedica
  // ========================================
  /** Creazione visita */
  VISIT_CREATED: 'VISIT_CREATED',
  /** Aggiornamento visita */
  VISIT_UPDATED: 'VISIT_UPDATED',
  /** Cancellazione visita */
  VISIT_CANCELLED: 'VISIT_CANCELLED',
  /** Completamento visita */
  VISIT_COMPLETED: 'VISIT_COMPLETED',
  /** Creazione prescrizione */
  PRESCRIPTION_CREATED: 'PRESCRIPTION_CREATED',
  /** Creazione referto */
  REPORT_CREATED: 'REPORT_CREATED',
  /** Accesso cartella clinica */
  MEDICAL_RECORD_ACCESS: 'MEDICAL_RECORD_ACCESS',

  // ========================================
  // TRAINING - ElementSicurezza
  // ========================================
  /** Iscrizione corso */
  COURSE_ENROLLMENT: 'COURSE_ENROLLMENT',
  /** Completamento corso */
  COURSE_COMPLETED: 'COURSE_COMPLETED',
  /** Abbandono corso */
  COURSE_DROPPED: 'COURSE_DROPPED',
  /** Superamento test */
  TEST_PASSED: 'TEST_PASSED',
  /** Test fallito */
  TEST_FAILED: 'TEST_FAILED',
  /** Generazione attestato */
  CERTIFICATE_GENERATED: 'CERTIFICATE_GENERATED',
  /** Download attestato */
  CERTIFICATE_DOWNLOADED: 'CERTIFICATE_DOWNLOADED',

  // ========================================
  // SYSTEM - Operazioni di sistema
  // ========================================
  /** Errore di sistema */
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  /** Manutenzione schedulata */
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
  /** Backup eseguito */
  SYSTEM_BACKUP: 'SYSTEM_BACKUP',
  /** Ripristino eseguito */
  SYSTEM_RESTORE: 'SYSTEM_RESTORE'
};

/**
 * Mapping action -> category
 * Determina automaticamente la categoria in base al prefisso dell'action
 * 
 * @param {string} action - L'azione da categorizzare
 * @returns {string} La categoria dell'azione
 */
export const getActivityCategory = (action) => {
  if (!action || typeof action !== 'string') {
    return ActivityCategory.SYSTEM;
  }

  if (action.startsWith('AUTH_')) return ActivityCategory.AUTH;
  if (action.startsWith('ENTITY_')) return ActivityCategory.CRUD;
  if (action.startsWith('PAGE_') || action.startsWith('SEARCH_') || action.startsWith('FILTER_') || action.startsWith('MODULE_')) {
    return ActivityCategory.NAVIGATION;
  }
  if (action.startsWith('DOCUMENT_')) return ActivityCategory.DOCUMENT;
  if (action.startsWith('PERMISSION_') || action.startsWith('ROLE_') ||
    action.startsWith('TENANT_') || action.startsWith('SETTINGS_') ||
    action.startsWith('USER_') || action.startsWith('PROFILE_')) {
    return ActivityCategory.ADMIN;
  }
  if (action.startsWith('VISIT_') || action.startsWith('PRESCRIPTION_') ||
    action.startsWith('REPORT_') || action.startsWith('MEDICAL_')) {
    return ActivityCategory.CLINICAL;
  }
  if (action.startsWith('COURSE_') || action.startsWith('TEST_') || action.startsWith('CERTIFICATE_')) {
    return ActivityCategory.TRAINING;
  }
  if (action.startsWith('SYSTEM_')) return ActivityCategory.SYSTEM;

  return ActivityCategory.SYSTEM;
};

/**
 * Mapping risorsa -> entity type
 * Normalizza i nomi delle risorse per il logging
 * 
 * @param {string} pathSegment - Segmento del path URL
 * @returns {string|null} Nome normalizzato della risorsa
 */
export const normalizeResourceName = (pathSegment) => {
  const resourceMap = {
    'companies': 'Company',
    'company': 'Company',
    'persons': 'Person',
    'person': 'Person',
    'employees': 'Person',  // Legacy mapping
    'courses': 'Course',
    'course': 'Course',
    'schedules': 'Schedule',
    'schedule': 'Schedule',
    'documents': 'Document',
    'document': 'Document',
    'templates': 'Template',
    'template': 'Template',
    'visits': 'Visit',
    'visit': 'Visit',
    'prescriptions': 'Prescription',
    'prescription': 'Prescription',
    'certificates': 'Certificate',
    'certificate': 'Certificate',
    'tests': 'Test',
    'test': 'Test',
    'tenants': 'Tenant',
    'tenant': 'Tenant',
    'roles': 'Role',
    'role': 'Role',
    'permissions': 'Permission',
    'permission': 'Permission',
    'sites': 'Site',
    'site': 'Site',
    'rooms': 'Room',
    'room': 'Room',
    'preventivi': 'Preventivo',
    'preventivo': 'Preventivo',
    'visite-specialistiche': 'VisitaSpecialistica',
    'specialistic-visits': 'VisitaSpecialistica'
  };

  return resourceMap[pathSegment?.toLowerCase()] || null;
};

/**
 * Azioni che richiedono log anche in caso di fallimento
 * Per audit e security
 */
export const ALWAYS_LOG_ACTIONS = [
  ActivityType.AUTH_LOGIN_FAILED,
  ActivityType.AUTH_PASSWORD_RESET_REQUEST,
  ActivityType.PERMISSION_GRANTED,
  ActivityType.PERMISSION_REVOKED,
  ActivityType.ROLE_ASSIGNED,
  ActivityType.ROLE_REMOVED,
  ActivityType.MEDICAL_RECORD_ACCESS,
  ActivityType.ENTITY_DELETE
];

/**
 * Azioni che NON devono essere loggate (privacy/performance)
 */
export const SKIP_LOG_ACTIONS = [
  'HEALTH_CHECK',
  'METRICS_FETCH',
  'STATIC_ASSET_LOAD'
];

/**
 * Retention policy per categoria (in giorni)
 * GDPR compliance
 */
export const RETENTION_DAYS = {
  [ActivityCategory.AUTH]: 730,       // 2 anni (requisito legale)
  [ActivityCategory.CRUD]: 365,       // 1 anno
  [ActivityCategory.NAVIGATION]: 90,  // 90 giorni
  [ActivityCategory.DOCUMENT]: 730,   // 2 anni
  [ActivityCategory.ADMIN]: 730,      // 2 anni
  [ActivityCategory.CLINICAL]: 3650,  // 10 anni (requisito sanitario)
  [ActivityCategory.TRAINING]: 1825,  // 5 anni (attestati sicurezza)
  [ActivityCategory.SYSTEM]: 365      // 1 anno
};

export default {
  ActivityCategory,
  ActivityType,
  getActivityCategory,
  normalizeResourceName,
  ALWAYS_LOG_ACTIONS,
  SKIP_LOG_ACTIONS,
  RETENTION_DAYS
};
