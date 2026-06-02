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
    ATTESTATI_DOWNLOAD: 'attestati:download',

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

    MOVIMENTI_CONTABILI_READ: 'movimenti_contabili:read',
    MOVIMENTI_CONTABILI_WRITE: 'movimenti_contabili:write',
    MOVIMENTI_CONTABILI_CREATE: 'movimenti_contabili:create',
    MOVIMENTI_CONTABILI_UPDATE: 'movimenti_contabili:update',
    MOVIMENTI_CONTABILI_DELETE: 'movimenti_contabili:delete',
    MOVIMENTI_CONTABILI_MANAGE: 'movimenti_contabili:manage',

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
    SITEMAP_GENERATE: 'seo:sitemap_generate',

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
    APPUNTAMENTI_VIEW_OTHERS: 'clinica.appuntamenti:view_others', // Permesso per vedere appuntamenti di altri medici
    APPUNTAMENTI_VIEW_OTHERS_ALL: 'clinica.appuntamenti:view_others_all',
    APPUNTAMENTI_VIEW_OTHERS_SAME_BRANCH: 'clinica.appuntamenti:view_others_same_branch',
    APPUNTAMENTI_CREATE_SELF: 'clinica.appuntamenti:create_self',
    APPUNTAMENTI_CREATE_OTHERS: 'clinica.appuntamenti:create_others',
    APPUNTAMENTI_EDIT_OTHERS: 'clinica.appuntamenti:edit_others',

    VISITE_READ: 'clinica.visite:read',
    VISITE_CREATE: 'clinica.visite:create',
    VISITE_UPDATE: 'clinica.visite:update',
    VISITE_DELETE: 'clinica.visite:delete',
    VISITE_MANAGE: 'clinica.visite:manage',
    // Granular visit permissions (P67)
    VISITE_CHANGE_REFERTANTE: 'clinica.visite:change_refertante',  // Cambiare medico refertante
    VISITE_VIEW_PRICES: 'clinica.visite:view_prices',              // Vedere importi prestazioni in visita
    VISITE_MANAGE_CONVENZIONI: 'clinica.visite:manage_convenzioni', // Gestire convenzioni/sconti in visita
    VISITE_EDIT_OTHERS: 'clinica.visite:edit_others',

    REFERTI_READ: 'clinica.referti:read',
    REFERTI_CREATE: 'clinica.referti:create',
    REFERTI_UPDATE: 'clinica.referti:update',
    REFERTI_DELETE: 'clinica.referti:delete',
    REFERTI_MANAGE: 'clinica.referti:manage',

    // Firme Digitali (P65)
    SIGNATURES_READ: 'clinica.signatures:read',
    SIGNATURES_CREATE: 'clinica.signatures:create',
    SIGNATURES_DELETE: 'clinica.signatures:delete',
    SIGNATURES_VALIDATE: 'clinica.signatures:validate',
    SIGNATURES_MANAGE: 'clinica.signatures:manage',

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

    FERIE_READ: 'clinica.ferie:read',
    FERIE_CREATE: 'clinica.ferie:create',
    FERIE_UPDATE: 'clinica.ferie:update',
    FERIE_DELETE: 'clinica.ferie:delete',
    FERIE_MANAGE: 'clinica.ferie:manage',
    FERIE_APPROVE: 'clinica.ferie:approve',

    CONVENZIONI_READ: 'clinica.convenzioni:read',
    CONVENZIONI_CREATE: 'clinica.convenzioni:create',
    CONVENZIONI_UPDATE: 'clinica.convenzioni:update',
    CONVENZIONI_DELETE: 'clinica.convenzioni:delete',
    CONVENZIONI_MANAGE: 'clinica.convenzioni:manage',

    TARIFFARI_READ: 'clinica.tariffari:read',
    TARIFFARI_CREATE: 'clinica.tariffari:create',
    TARIFFARI_UPDATE: 'clinica.tariffari:update',
    TARIFFARI_DELETE: 'clinica.tariffari:delete',
    TARIFFARI_MANAGE: 'clinica.tariffari:manage',

    CARTELLA_PAZIENTE_READ: 'clinica.cartella_paziente:read',
    CARTELLA_PAZIENTE_CREATE: 'clinica.cartella_paziente:create',
    CARTELLA_PAZIENTE_UPDATE: 'clinica.cartella_paziente:update',
    CARTELLA_PAZIENTE_DELETE: 'clinica.cartella_paziente:delete',
    CARTELLA_PAZIENTE_MANAGE: 'clinica.cartella_paziente:manage',

    OFFERTE_BUNDLE_READ: 'clinica.offerte_bundle:read',
    OFFERTE_BUNDLE_CREATE: 'clinica.offerte_bundle:create',
    OFFERTE_BUNDLE_UPDATE: 'clinica.offerte_bundle:update',
    OFFERTE_BUNDLE_DELETE: 'clinica.offerte_bundle:delete',
    OFFERTE_BUNDLE_MANAGE: 'clinica.offerte_bundle:manage',

    SCONTI_READ: 'clinica.sconti:read',
    SCONTI_CREATE: 'clinica.sconti:create',
    SCONTI_UPDATE: 'clinica.sconti:update',
    SCONTI_DELETE: 'clinica.sconti:delete',
    SCONTI_MANAGE: 'clinica.sconti:manage',

    // ----------------------------------------
    // P66 - SCADENZE CENTRALIZZATE (Deadlines & Farmaci)
    // ----------------------------------------
    SCADENZE_READ: 'scadenze:read',
    SCADENZE_CREATE: 'scadenze:create',
    SCADENZE_UPDATE: 'scadenze:update',
    SCADENZE_DELETE: 'scadenze:delete',
    SCADENZE_MANAGE: 'scadenze:manage',
    // Alias comuni per RBAC middleware
    SCADENZE_WRITE: 'scadenze:write',

    FARMACI_READ: 'farmaci:read',
    FARMACI_CREATE: 'farmaci:create',
    FARMACI_UPDATE: 'farmaci:update',
    FARMACI_DELETE: 'farmaci:delete',
    FARMACI_MANAGE: 'farmaci:manage',

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

    // ----------------------------------------
    // P68 - HR MANAGEMENT
    // ----------------------------------------
    HR_READ: 'hr:read',
    HR_WRITE: 'hr:write',

    // Turni
    HR_TURNI_READ: 'hr.turni:read',
    HR_TURNI_ASSIGN: 'hr.turni:assign',
    HR_TURNI_MANAGE: 'hr.turni:manage',

    // Timbrature
    HR_TIMBRATURE_READ: 'hr.timbrature:read',
    HR_TIMBRATURE_MANAGE: 'hr.timbrature:manage',

    // Assenze
    HR_ASSENZE_READ: 'hr.assenze:read',
    HR_ASSENZE_APPROVE: 'hr.assenze:approve',
    HR_ASSENZE_MANAGE: 'hr.assenze:manage',

    // Mansioni
    HR_MANSIONI_READ: 'hr.mansioni:read',
    HR_MANSIONI_MANAGE: 'hr.mansioni:manage',

    // Cartellini
    HR_CARTELLINO_READ: 'hr.cartellino:read',
    HR_CARTELLINO_MANAGE: 'hr.cartellino:manage',

    // Report
    HR_REPORT_READ: 'hr.report:read',
    HR_REPORT_MANAGE: 'hr.report:manage',

    // ----------------------------------------
    // CROSS-TENANT
    // ----------------------------------------
    CROSS_TENANT_READ: 'cross_tenant:read',
    CROSS_TENANT_APPROVE: 'cross_tenant:approve',
    CROSS_TENANT_REJECT: 'cross_tenant:reject',
    CROSS_TENANT_MANAGE: 'cross_tenant:manage',

    // ----------------------------------------
    // CLINICA - ADDITIONAL RESOURCES
    // ----------------------------------------
    PATIENTS_READ: 'clinica.pazienti:read',
    PATIENTS_CREATE: 'clinica.pazienti:create',
    PATIENTS_UPDATE: 'clinica.pazienti:update',
    PATIENTS_DELETE: 'clinica.pazienti:delete',
    PATIENTS_MANAGE: 'clinica.pazienti:manage',

    GIUDIZI_READ: 'clinica.giudizi:read',
    GIUDIZI_CREATE: 'clinica.giudizi:create',
    GIUDIZI_UPDATE: 'clinica.giudizi:update',
    GIUDIZI_DELETE: 'clinica.giudizi:delete',
    GIUDIZI_MANAGE: 'clinica.giudizi:manage',

    FATTURE_READ: 'clinica.fatture:read',
    FATTURE_CREATE: 'clinica.fatture:create',
    FATTURE_UPDATE: 'clinica.fatture:update',
    FATTURE_DELETE: 'clinica.fatture:delete',
    FATTURE_MANAGE: 'clinica.fatture:manage',

    BILLING_READ: 'clinica.billing:read',
    BILLING_CREATE: 'clinica.billing:create',
    BILLING_MANAGE: 'clinica.billing:manage',

    CONTABILITA_READ: 'clinica.contabilita:read',
    CONTABILITA_MANAGE: 'clinica.contabilita:manage',

    IMPOSTAZIONI_READ: 'clinica.impostazioni:read',
    IMPOSTAZIONI_WRITE: 'clinica.impostazioni:update',
    IMPOSTAZIONI_MANAGE: 'clinica.impostazioni:manage',

    EMAIL_TEMPLATES_READ: 'clinica.email_templates:read',
    EMAIL_TEMPLATES_WRITE: 'clinica.email_templates:update',
    EMAIL_TEMPLATES_MANAGE: 'clinica.email_templates:manage',

    INTERNAL_DOCUMENTS_READ: 'internal_documents:read',
    INTERNAL_DOCUMENTS_WRITE: 'internal_documents:create',
    INTERNAL_DOCUMENTS_MANAGE: 'internal_documents:manage',
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
 * Permessi base condivisi da tutti i ruoli autenticati
 */
export const BASE_PERMISSIONS = [
    PERMISSIONS.NOTIFICATIONS_READ,
];

/**
 * Permessi per ruolo EMPLOYEE — solo propri corsi, attestati, documenti
 */
export const EMPLOYEE_PERMISSIONS = [
    ...BASE_PERMISSIONS,
    PERMISSIONS.COURSES_READ,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.ENROLLMENTS_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    PERMISSIONS.ATTESTATI_READ,
    PERMISSIONS.ATTESTATI_DOWNLOAD,
    PERMISSIONS.COMPANIES_READ,
];

/**
 * Permessi per ruolo TRAINER — propri corsi, partecipanti, documenti
 */
export const TRAINER_PERMISSIONS = [
    ...BASE_PERMISSIONS,
    PERMISSIONS.COURSES_READ,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.SCHEDULES_UPDATE,
    PERMISSIONS.ENROLLMENTS_READ,
    PERMISSIONS.ENROLLMENTS_UPDATE,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.COMPANIES_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_CREATE,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    PERMISSIONS.ATTESTATI_READ,
    PERMISSIONS.ATTESTATI_CREATE,
    PERMISSIONS.ATTESTATI_DOWNLOAD,
    PERMISSIONS.ATTESTATI_GENERATE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.CALENDAR_READ,
];

/**
 * Permessi per ruolo MEDICO — visite/referti/appuntamenti del proprio ambulatorio
 */
export const MEDICO_PERMISSIONS = [
    ...BASE_PERMISSIONS,
    PERMISSIONS.VISITE_READ,
    PERMISSIONS.VISITE_CREATE,
    PERMISSIONS.VISITE_UPDATE,
    PERMISSIONS.VISITE_DELETE,
    PERMISSIONS.REFERTI_READ,
    PERMISSIONS.REFERTI_CREATE,
    PERMISSIONS.REFERTI_UPDATE,
    PERMISSIONS.APPUNTAMENTI_READ,
    PERMISSIONS.APPUNTAMENTI_CREATE,
    PERMISSIONS.APPUNTAMENTI_UPDATE,
    PERMISSIONS.CARTELLA_PAZIENTE_READ,
    PERMISSIONS.CARTELLA_PAZIENTE_UPDATE,
    PERMISSIONS.POLIAMBULATORI_READ,
    PERMISSIONS.AMBULATORI_READ,
    PERMISSIONS.PRESTAZIONI_READ,
    PERMISSIONS.STRUMENTI_READ,
    PERMISSIONS.SIGNATURES_READ,
    PERMISSIONS.SIGNATURES_CREATE,
    PERMISSIONS.CONVENZIONI_READ,
    PERMISSIONS.TARIFFARI_READ,
    PERMISSIONS.FERIE_READ,
    PERMISSIONS.FERIE_CREATE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_CREATE,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.CALENDAR_READ,
    PERMISSIONS.CALENDAR_CREATE,
    PERMISSIONS.CALENDAR_UPDATE,
    PERMISSIONS.PERSONS_READ,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.SETTINGS_READ,
];

/**
 * Permessi per ruolo PAZIENTE — solo propri dati
 */
export const PAZIENTE_PERMISSIONS = [
    ...BASE_PERMISSIONS,
    PERMISSIONS.APPUNTAMENTI_READ,
    PERMISSIONS.VISITE_READ,
    PERMISSIONS.REFERTI_READ,
    PERMISSIONS.CARTELLA_PAZIENTE_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
];

/**
 * Permessi per ruolo SEGRETERIA_CLINICA — gestione pazienti, appuntamenti, calendario
 */
export const SEGRETERIA_CLINICA_PERMISSIONS = [
    ...BASE_PERMISSIONS,
    PERMISSIONS.APPUNTAMENTI_READ,
    PERMISSIONS.APPUNTAMENTI_CREATE,
    PERMISSIONS.APPUNTAMENTI_UPDATE,
    PERMISSIONS.APPUNTAMENTI_DELETE,
    PERMISSIONS.VISITE_READ,
    PERMISSIONS.REFERTI_READ,
    PERMISSIONS.CARTELLA_PAZIENTE_READ,
    PERMISSIONS.POLIAMBULATORI_READ,
    PERMISSIONS.AMBULATORI_READ,
    PERMISSIONS.PRESTAZIONI_READ,
    PERMISSIONS.STRUMENTI_READ,
    PERMISSIONS.CONVENZIONI_READ,
    PERMISSIONS.TARIFFARI_READ,
    PERMISSIONS.PERSONS_READ,
    PERMISSIONS.PERSONS_CREATE,
    PERMISSIONS.PERSONS_UPDATE,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.COMPANIES_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_CREATE,
    PERMISSIONS.CALENDAR_READ,
    PERMISSIONS.CALENDAR_CREATE,
    PERMISSIONS.CALENDAR_UPDATE,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.SCHEDULES_CREATE,
    PERMISSIONS.SCHEDULES_UPDATE,
    PERMISSIONS.REPORTS_READ,
];

/**
 * Permessi per ruolo INFERMIERE — supporto visite, pazienti in lettura
 */
export const INFERMIERE_PERMISSIONS = [
    ...BASE_PERMISSIONS,
    PERMISSIONS.VISITE_READ,
    PERMISSIONS.APPUNTAMENTI_READ,
    PERMISSIONS.APPUNTAMENTI_UPDATE,
    PERMISSIONS.REFERTI_READ,
    PERMISSIONS.CARTELLA_PAZIENTE_READ,
    PERMISSIONS.POLIAMBULATORI_READ,
    PERMISSIONS.AMBULATORI_READ,
    PERMISSIONS.PRESTAZIONI_READ,
    PERMISSIONS.STRUMENTI_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_CREATE,
    PERMISSIONS.PERSONS_READ,
    PERMISSIONS.CALENDAR_READ,
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
 * Verifica se un'azione utente implica l'azione richiesta.
 * - manage → tutte le azioni
 * - write → create, update
 * - create/update → write
 * @param {string} userAction - Azione posseduta dall'utente
 * @param {string} requiredAction - Azione richiesta dalla route
 * @returns {boolean}
 */
function actionImplies(userAction, requiredAction) {
    if (userAction === requiredAction) return true;
    if (userAction === '*') return true;
    if (userAction === 'manage') return true;
    if (userAction === 'write' && (requiredAction === 'create' || requiredAction === 'update')) return true;
    if ((userAction === 'create' || userAction === 'update') && requiredAction === 'write') return true;
    return false;
}

/**
 * Verifica se un permesso match con wildcards, sub-resource e action aliases.
 *
 * Matching rules (ordine):
 * 1. Exact match: 'visite:read' === 'visite:read'
 * 2. Wildcard all: '*:*' matches everything
 * 3. Resource wildcard: 'clinica:*' matches 'clinica.visite:read'
 * 4. Action aliases: 'visite:write' matches 'visite:create' (write→create/update)
 * 5. Reverse sub-resource: user 'clinica.visite:read' matches required 'visite:read'
 * 6. Parent resource with action: 'clinica:read' matches 'clinica.visite:read'
 *
 * @param {string} userPermission - Permesso dell'utente (può contenere *)
 * @param {string} requiredPermission - Permesso richiesto
 * @returns {boolean}
 */
export function matchPermission(userPermission, requiredPermission) {
    // 1. Exact match
    if (userPermission === requiredPermission) return true;

    // 2. Wildcard all
    if (userPermission === '*:*') return true;

    const [userResource, userAction] = userPermission.split(':');
    const [reqResource, reqAction] = requiredPermission.split(':');

    // 3. Resource wildcard (resource:*)
    if (userAction === '*') {
        if (userResource === reqResource) return true;
        // clinica:* matches clinica.visite:read
        if (reqResource.startsWith(userResource + '.')) return true;
    }

    // 4. Action aliases on same resource (visite:write matches visite:create)
    if (userResource === reqResource && actionImplies(userAction, reqAction)) return true;

    // 5. Reverse sub-resource matching
    //    User has clinica.visite:read, route requires visite:read
    if (userResource.includes('.')) {
        const childResource = userResource.split('.').slice(1).join('.');
        if (childResource === reqResource && actionImplies(userAction, reqAction)) return true;
    }

    // 6. Parent resource with specific action
    //    User has clinica:read, route requires clinica.visite:read
    if (reqResource.includes('.')) {
        const parentResource = reqResource.split('.')[0];
        if (userResource === parentResource && actionImplies(userAction, reqAction)) return true;
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
