/**
 * Definizioni dei tipi di ruolo, scope e permessi default per il sistema multi-tenant
 * Modulo estratto da EnhancedRoleService per migliorare la manutenibilità
 * 
 * FORMATO PERMESSI: resource:action (unico formato supportato)
 * Nessun supporto legacy per formato SCREAMING_SNAKE
 */

/**
 * Tipi di ruolo disponibili nel sistema
 * Sincronizzati con l'enum RoleType in schema.prisma
 */
export const ROLE_TYPES = {
  // Ruoli base
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  HR_MANAGER: 'HR_MANAGER',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  // Ruoli formazione
  TRAINER: 'TRAINER',
  SENIOR_TRAINER: 'SENIOR_TRAINER',
  TRAINER_COORDINATOR: 'TRAINER_COORDINATOR',
  EXTERNAL_TRAINER: 'EXTERNAL_TRAINER',
  // Ruoli amministrativi
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  TRAINING_ADMIN: 'TRAINING_ADMIN',
  CLINIC_ADMIN: 'CLINIC_ADMIN',
  COMPANY_MANAGER: 'COMPANY_MANAGER',
  // Ruoli di accesso
  VIEWER: 'VIEWER',
  OPERATOR: 'OPERATOR',
  COORDINATOR: 'COORDINATOR',
  SUPERVISOR: 'SUPERVISOR',
  GUEST: 'GUEST',
  CONSULTANT: 'CONSULTANT',
  AUDITOR: 'AUDITOR',
  // Ruoli clinici (P52)
  MEDICO: 'MEDICO',
  PAZIENTE: 'PAZIENTE',
  INFERMIERE: 'INFERMIERE',
  SEGRETERIA_CLINICA: 'SEGRETERIA_CLINICA',
  // Ruoli sicurezza
  MEDICO_COMPETENTE: 'MEDICO_COMPETENTE',
  RSPP: 'RSPP',
  ASPP: 'ASPP',
  TECNICO_SICUREZZA: 'TECNICO_SICUREZZA',
  CONSULENTE_SICUREZZA: 'CONSULENTE_SICUREZZA'
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

// ─── Gruppi di permessi riutilizzabili per composizione ────────────────────

const NOTIFICATIONS_BASE = ['notifications:read'];

const CLINICA_READ_BASE = [
  'clinica.poliambulatori:read', 'clinica.ambulatori:read',
  'clinica.prestazioni:read', 'clinica.strumenti:read'
];

const CLINICA_VISITE_READ = [
  'clinica.visite:read', 'clinica.appuntamenti:read',
  'clinica.referti:read', 'clinica.cartella_paziente:read'
];

const CLINICA_FULL_CRUD = [
  // Poliambulatori
  'clinica.poliambulatori:read', 'clinica.poliambulatori:create', 'clinica.poliambulatori:update', 'clinica.poliambulatori:delete', 'clinica.poliambulatori:manage',
  // Ambulatori
  'clinica.ambulatori:read', 'clinica.ambulatori:create', 'clinica.ambulatori:update', 'clinica.ambulatori:delete', 'clinica.ambulatori:manage',
  // Prestazioni
  'clinica.prestazioni:read', 'clinica.prestazioni:create', 'clinica.prestazioni:update', 'clinica.prestazioni:delete', 'clinica.prestazioni:manage',
  // Appuntamenti
  'clinica.appuntamenti:read', 'clinica.appuntamenti:create', 'clinica.appuntamenti:update', 'clinica.appuntamenti:delete', 'clinica.appuntamenti:manage',
  'clinica.appuntamenti:view_others', 'clinica.appuntamenti:view_others_all', 'clinica.appuntamenti:view_others_same_branch',
  'clinica.appuntamenti:create_self', 'clinica.appuntamenti:create_others', 'clinica.appuntamenti:edit_others',
  // Visite
  'clinica.visite:read', 'clinica.visite:create', 'clinica.visite:update', 'clinica.visite:delete', 'clinica.visite:manage',
  'clinica.visite:change_refertante', 'clinica.visite:view_prices', 'clinica.visite:manage_convenzioni', 'clinica.visite:edit_others',
  // Referti
  'clinica.referti:read', 'clinica.referti:create', 'clinica.referti:update', 'clinica.referti:delete', 'clinica.referti:manage',
  // Signatures
  'clinica.signatures:read', 'clinica.signatures:create', 'clinica.signatures:delete', 'clinica.signatures:validate', 'clinica.signatures:manage',
  // Strumenti
  'clinica.strumenti:read', 'clinica.strumenti:create', 'clinica.strumenti:update', 'clinica.strumenti:delete', 'clinica.strumenti:manage',
  // Manutenzioni
  'clinica.manutenzioni:read', 'clinica.manutenzioni:create', 'clinica.manutenzioni:update', 'clinica.manutenzioni:delete', 'clinica.manutenzioni:manage',
  // Ferie
  'clinica.ferie:read', 'clinica.ferie:create', 'clinica.ferie:update', 'clinica.ferie:delete', 'clinica.ferie:manage', 'clinica.ferie:approve',
  // Convenzioni
  'clinica.convenzioni:read', 'clinica.convenzioni:create', 'clinica.convenzioni:update', 'clinica.convenzioni:delete', 'clinica.convenzioni:manage',
  // Tariffari
  'clinica.tariffari:read', 'clinica.tariffari:create', 'clinica.tariffari:update', 'clinica.tariffari:delete', 'clinica.tariffari:manage',
  // Cartella Paziente
  'clinica.cartella_paziente:read', 'clinica.cartella_paziente:update', 'clinica.cartella_paziente:export',
  // Offerte Bundle
  'clinica.offerte_bundle:read', 'clinica.offerte_bundle:create', 'clinica.offerte_bundle:update', 'clinica.offerte_bundle:delete', 'clinica.offerte_bundle:manage',
  // Sconti
  'clinica.sconti:read', 'clinica.sconti:create', 'clinica.sconti:update', 'clinica.sconti:delete', 'clinica.sconti:manage',
  // Medici (checkAdvancedPermission('medici', ...))
  'clinica.medici:read', 'clinica.medici:create', 'clinica.medici:update', 'clinica.medici:delete', 'clinica.medici:manage',
  // Agenda (checkAdvancedPermission('agenda', ...) - usato da appuntamenti routes)
  'clinica.agenda:read', 'clinica.agenda:create', 'clinica.agenda:update', 'clinica.agenda:delete', 'clinica.agenda:manage',
  // Poliambulatorio singolare (checkAdvancedPermission('poliambulatorio', ...) - usato da poliambulatori e sedi routes)
  'clinica.poliambulatorio:read', 'clinica.poliambulatorio:create', 'clinica.poliambulatorio:update', 'clinica.poliambulatorio:delete', 'clinica.poliambulatorio:manage', 'clinica.poliambulatorio:write',
  // Listini (checkAdvancedPermission('listini', ...))
  'clinica.listini:read', 'clinica.listini:create', 'clinica.listini:update', 'clinica.listini:delete', 'clinica.listini:manage',
  // Pazienti (checkAdvancedPermission('pazienti', ...))
  'clinica.pazienti:read', 'clinica.pazienti:create', 'clinica.pazienti:update', 'clinica.pazienti:delete', 'clinica.pazienti:manage',
  // Sedi (per future routes specifiche sedi)
  'clinica.sedi:read', 'clinica.sedi:create', 'clinica.sedi:update', 'clinica.sedi:delete', 'clinica.sedi:manage'
];

const FORMAZIONE_FULL = [
  'courses:read', 'courses:create', 'courses:update', 'courses:delete', 'courses:manage',
  'schedules:read', 'schedules:create', 'schedules:update', 'schedules:delete', 'schedules:manage',
  'enrollments:read', 'enrollments:create', 'enrollments:update', 'enrollments:delete', 'enrollments:manage',
  'attestati:read', 'attestati:create', 'attestati:update', 'attestati:delete', 'attestati:manage', 'attestati:generate', 'attestati:download'
];

const CMS_FULL = [
  'cms.pages:read', 'cms.pages:create', 'cms.pages:update', 'cms.pages:delete', 'cms.pages:publish',
  'cms.media:read', 'cms.media:create', 'cms.media:update', 'cms.media:delete',
  'cms.navigation:read', 'cms.navigation:update',
  'public_content:read', 'public_content:create', 'public_content:update', 'public_content:delete', 'public_content:manage'
];

const HR_FULL = [
  'hr:read', 'hr:write',
  'hr.turni:read', 'hr.turni:assign', 'hr.turni:manage',
  'hr.timbrature:read', 'hr.timbrature:manage',
  'hr.assenze:read', 'hr.assenze:manage',
  'hr.mansioni:read', 'hr.mansioni:manage',
  'hr.cartellino:read', 'hr.cartellino:manage',
  'hr.report:read', 'hr.report:manage'
];

/**
 * Matrice dei permessi di default per ruolo
 * Formato UNICO: resource:action
 * Ogni ruolo ha i permessi minimi necessari (principio del minimo privilegio)
 */
export function getDefaultPermissions(roleType) {
  const permissionMatrix = {

    // ═══════════════════════════════════════════════════════════════════
    // RUOLI AMMINISTRATIVI
    // ═══════════════════════════════════════════════════════════════════

    [ROLE_TYPES.SUPER_ADMIN]: ['*:*'],

    [ROLE_TYPES.ADMIN]: [
      // Sistema
      'admin:access', 'admin:manage', 'system:manage', 'system:settings',
      // Tenant
      'tenants:read', 'tenants:create', 'tenants:update', 'tenants:delete', 'tenants:manage',
      // Utenti & Persone
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:manage',
      'persons:read', 'persons:create', 'persons:update', 'persons:delete', 'persons:manage', 'persons:import', 'persons:export',
      // Dipendenti & Formatori
      'employees:read', 'employees:create', 'employees:update', 'employees:delete', 'employees:manage', 'employees:import', 'employees:export',
      'trainers:read', 'trainers:create', 'trainers:update', 'trainers:delete', 'trainers:manage',
      // Ruoli
      'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:manage', 'roles:assign',
      // Aziende
      'companies:read', 'companies:create', 'companies:update', 'companies:delete', 'companies:manage', 'companies:import', 'companies:export',
      // Formazione
      ...FORMAZIONE_FULL,
      // Documenti
      'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:manage', 'documents:download', 'documents:send',
      'templates:read', 'templates:create', 'templates:update', 'templates:delete', 'templates:manage',
      // CMS
      ...CMS_FULL,
      // Forms
      'forms:read', 'forms:create', 'forms:update', 'forms:delete', 'forms:manage',
      'submissions:read', 'submissions:create', 'submissions:update', 'submissions:delete', 'submissions:manage', 'submissions:export',
      // Finanza
      'preventivi:read', 'preventivi:create', 'preventivi:update', 'preventivi:delete', 'preventivi:manage', 'preventivi:send', 'preventivi:generate_pdf',
      'invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete', 'invoices:manage',
      'movimenti_contabili:read', 'movimenti_contabili:write', 'movimenti_contabili:manage',
      'codici_sconto:read', 'codici_sconto:create', 'codici_sconto:update', 'codici_sconto:delete', 'codici_sconto:manage',
      // Notifiche & Impostazioni
      'notifications:read', 'notifications:create', 'notifications:update', 'notifications:delete', 'notifications:manage', 'notifications:send',
      'settings:read', 'settings:update', 'settings:manage',
      // GDPR & Audit
      'gdpr:read', 'gdpr:create', 'gdpr:update', 'gdpr:delete', 'gdpr:manage',
      'gdpr.data:read', 'gdpr.data:export', 'gdpr.data:delete',
      'gdpr.consents:manage',
      'audit:read', 'audit:export',
      // SEO & API
      'seo:read', 'seo:update', 'seo:manage', 'seo:sitemap_generate',
      'api_keys:read', 'api_keys:create', 'api_keys:update', 'api_keys:delete', 'api_keys:manage',
      // Report & Gerarchia
      'reports:read', 'reports:create', 'reports:update', 'reports:delete', 'reports:manage', 'reports:export',
      'hierarchy:read', 'hierarchy:create', 'hierarchy:update', 'hierarchy:delete', 'hierarchy:manage',
      'imports:create', 'imports:read', 'imports:manage',
      // Clinica
      ...CLINICA_FULL_CRUD,
      // Permessi clinica aggiuntivi (usati da requirePermission in routes clinica)
      'clinica:read', 'clinica:write', 'clinica:delete', 'clinica:manage',
      'fatture:read', 'fatture:write', 'fatture:create', 'fatture:update', 'fatture:delete', 'fatture:manage',
      'giudizi:read', 'giudizi:write', 'giudizi:create', 'giudizi:update', 'giudizi:manage',
      'impostazioni:read', 'impostazioni:write', 'impostazioni:update', 'impostazioni:manage',
      'patients:read', 'patients:write', 'patients:create', 'patients:update', 'patients:delete', 'patients:manage',
      'modulistica:read', 'modulistica:write', 'modulistica:create', 'modulistica:update', 'modulistica:delete', 'modulistica:manage',
      'contabilita:read', 'contabilita:write', 'contabilita:manage',
      'movimenti_contabili:read', 'movimenti_contabili:write', 'movimenti_contabili:manage',
      'email-templates:read', 'email-templates:write', 'email-templates:create', 'email-templates:update', 'email-templates:delete', 'email-templates:manage',
      'internal-documents:read', 'internal-documents:write', 'internal-documents:create', 'internal-documents:manage',
      'notifications:analytics',
      'signatures:read', 'signatures:write', 'signatures:create', 'signatures:delete', 'signatures:validate', 'signatures:manage',
      'backup:manage',
      // Scadenze & Farmaci
      'scadenze:read', 'scadenze:create', 'scadenze:update', 'scadenze:delete', 'scadenze:manage',
      'farmaci:read', 'farmaci:create', 'farmaci:update', 'farmaci:delete', 'farmaci:manage',
      // Calendario
      'calendar:read', 'calendar:create', 'calendar:update', 'calendar:delete', 'calendar:manage',
      // HR
      ...HR_FULL,
      // Cross-tenant
      'cross_tenant:read', 'cross_tenant:approve', 'cross_tenant:reject', 'cross_tenant:manage'
    ],

    [ROLE_TYPES.TENANT_ADMIN]: [
      // Gestione tenant proprio (nome, loghi, impostazioni)
      'tenants:read', 'tenants:update',
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:manage',
      'persons:read', 'persons:create', 'persons:update', 'persons:delete', 'persons:manage', 'persons:import', 'persons:export',
      'employees:read', 'employees:create', 'employees:update', 'employees:delete', 'employees:manage', 'employees:import', 'employees:export',
      'trainers:read', 'trainers:create', 'trainers:update', 'trainers:delete', 'trainers:manage',
      'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:manage', 'roles:assign',
      'companies:read', 'companies:create', 'companies:update', 'companies:delete', 'companies:manage', 'companies:import', 'companies:export',
      ...FORMAZIONE_FULL,
      'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:manage', 'documents:download', 'documents:send',
      'templates:read', 'templates:create', 'templates:update', 'templates:delete', 'templates:manage',
      ...CMS_FULL,
      'forms:read', 'forms:create', 'forms:update', 'forms:delete', 'forms:manage',
      'submissions:read', 'submissions:create', 'submissions:update', 'submissions:delete', 'submissions:manage', 'submissions:export',
      'preventivi:read', 'preventivi:create', 'preventivi:update', 'preventivi:delete', 'preventivi:manage', 'preventivi:send', 'preventivi:generate_pdf',
      'invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete', 'invoices:manage',
      'codici_sconto:read', 'codici_sconto:create', 'codici_sconto:update', 'codici_sconto:delete', 'codici_sconto:manage',
      'notifications:read', 'notifications:create', 'notifications:update', 'notifications:delete', 'notifications:manage', 'notifications:send',
      'settings:read', 'settings:update', 'settings:manage',
      'gdpr:read', 'gdpr:create', 'gdpr:update', 'gdpr:delete', 'gdpr:manage',
      'gdpr.data:read', 'gdpr.data:export', 'gdpr.data:delete',
      'gdpr.consents:manage',
      'audit:read', 'audit:export',
      'seo:read', 'seo:update', 'seo:manage', 'seo:sitemap_generate',
      'reports:read', 'reports:create', 'reports:update', 'reports:delete', 'reports:manage', 'reports:export',
      'hierarchy:read', 'hierarchy:create', 'hierarchy:update', 'hierarchy:delete', 'hierarchy:manage',
      'system:read',
      'imports:create', 'imports:read', 'imports:manage',
      ...CLINICA_FULL_CRUD,
      // Permessi clinica aggiuntivi (usati da requirePermission in routes clinica)
      'clinica:read', 'clinica:write', 'clinica:delete', 'clinica:manage',
      'fatture:read', 'fatture:write', 'fatture:create', 'fatture:update', 'fatture:delete', 'fatture:manage',
      'giudizi:read', 'giudizi:write', 'giudizi:create', 'giudizi:update', 'giudizi:manage',
      'impostazioni:read', 'impostazioni:write', 'impostazioni:update', 'impostazioni:manage',
      'patients:read', 'patients:write', 'patients:create', 'patients:update', 'patients:delete', 'patients:manage',
      'modulistica:read', 'modulistica:write', 'modulistica:create', 'modulistica:update', 'modulistica:delete', 'modulistica:manage',
      'contabilita:read', 'contabilita:write', 'contabilita:manage',
      'email-templates:read', 'email-templates:write', 'email-templates:create', 'email-templates:update', 'email-templates:delete', 'email-templates:manage',
      'internal-documents:read', 'internal-documents:write', 'internal-documents:create', 'internal-documents:manage',
      'notifications:analytics',
      'signatures:read', 'signatures:write', 'signatures:create', 'signatures:delete', 'signatures:validate', 'signatures:manage',
      'backup:manage',
      'scadenze:read', 'scadenze:create', 'scadenze:update', 'scadenze:delete', 'scadenze:manage',
      'farmaci:read', 'farmaci:create', 'farmaci:update', 'farmaci:delete', 'farmaci:manage',
      'calendar:read', 'calendar:create', 'calendar:update', 'calendar:delete', 'calendar:manage',
      ...HR_FULL,
      'cross_tenant:read', 'cross_tenant:approve', 'cross_tenant:reject', 'cross_tenant:manage'
    ],

    [ROLE_TYPES.CLINIC_ADMIN]: [
      // Gestione completa clinica + utenti/aziende
      'users:read', 'users:create', 'users:update',
      'persons:read', 'persons:create', 'persons:update', 'persons:manage',
      'employees:read', 'employees:create', 'employees:update', 'employees:manage',
      'roles:read', 'roles:assign',
      'companies:read',
      ...CLINICA_FULL_CRUD,
      // Permessi clinica aggiuntivi (usati da requirePermission in routes clinica)
      'clinica:read', 'clinica:write', 'clinica:delete', 'clinica:manage',
      'fatture:read', 'fatture:write', 'fatture:create', 'fatture:update', 'fatture:delete', 'fatture:manage',
      'giudizi:read', 'giudizi:write', 'giudizi:create', 'giudizi:update', 'giudizi:manage',
      'impostazioni:read', 'impostazioni:write', 'impostazioni:update', 'impostazioni:manage',
      'patients:read', 'patients:write', 'patients:create', 'patients:update', 'patients:delete', 'patients:manage',
      'modulistica:read', 'modulistica:write', 'modulistica:create', 'modulistica:update', 'modulistica:delete', 'modulistica:manage',
      'contabilita:read', 'contabilita:write', 'contabilita:manage',
      'email-templates:read', 'email-templates:write', 'email-templates:create', 'email-templates:update', 'email-templates:delete', 'email-templates:manage',
      'signatures:read', 'signatures:write', 'signatures:create', 'signatures:delete', 'signatures:validate', 'signatures:manage',
      'notifications:analytics',
      'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:manage', 'documents:download', 'documents:send',
      'templates:read', 'templates:create', 'templates:update', 'templates:delete', 'templates:manage',
      'reports:read', 'reports:create', 'reports:export',
      'gdpr:read', 'gdpr.data:read', 'gdpr.data:export',
      'calendar:read', 'calendar:create', 'calendar:update', 'calendar:delete', 'calendar:manage',
      'scadenze:read', 'scadenze:create', 'scadenze:update', 'scadenze:delete', 'scadenze:manage',
      'farmaci:read', 'farmaci:create', 'farmaci:update', 'farmaci:delete', 'farmaci:manage',
      'notifications:read', 'notifications:create', 'notifications:send',
      'settings:read', 'settings:update',
      ...HR_FULL
    ],

    [ROLE_TYPES.TRAINING_ADMIN]: [
      // Gestione completa formazione
      'users:read', 'users:create', 'users:update',
      'persons:read', 'persons:create', 'persons:update', 'persons:delete', 'persons:manage', 'persons:import', 'persons:export',
      'employees:read', 'employees:create', 'employees:update', 'employees:delete', 'employees:manage', 'employees:import', 'employees:export',
      'trainers:read', 'trainers:create', 'trainers:update', 'trainers:delete', 'trainers:manage',
      'roles:read', 'roles:assign',
      'companies:read', 'companies:create', 'companies:update', 'companies:manage', 'companies:import', 'companies:export',
      ...FORMAZIONE_FULL,
      'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:manage', 'documents:download', 'documents:send',
      'templates:read', 'templates:create', 'templates:update', 'templates:delete', 'templates:manage',
      'forms:read', 'forms:create', 'forms:update', 'forms:delete', 'forms:manage',
      'submissions:read', 'submissions:create', 'submissions:update', 'submissions:manage', 'submissions:export',
      'preventivi:read', 'preventivi:create', 'preventivi:update', 'preventivi:delete', 'preventivi:manage', 'preventivi:send', 'preventivi:generate_pdf',
      'codici_sconto:read', 'codici_sconto:create', 'codici_sconto:update', 'codici_sconto:delete', 'codici_sconto:manage',
      'reports:read', 'reports:create', 'reports:export',
      'scadenze:read', 'scadenze:create', 'scadenze:update', 'scadenze:delete', 'scadenze:manage',
      'calendar:read', 'calendar:create', 'calendar:update', 'calendar:manage',
      'notifications:read', 'notifications:create', 'notifications:send',
      'settings:read',
      'imports:create', 'imports:read', 'imports:manage'
    ],

    [ROLE_TYPES.COMPANY_ADMIN]: [
      // Gestione azienda propria
      'users:read', 'users:create', 'users:update',
      'persons:read', 'persons:create', 'persons:update',
      'employees:read', 'employees:create', 'employees:update',
      'trainers:read',
      'roles:read', 'roles:assign',
      'companies:read', 'companies:update',
      ...FORMAZIONE_FULL,
      'documents:read', 'documents:create', 'documents:update', 'documents:download',
      'templates:read', 'templates:create', 'templates:update',
      'forms:read', 'forms:create',
      'submissions:read', 'submissions:create', 'submissions:manage', 'submissions:export',
      'reports:read', 'reports:export',
      'scadenze:read', 'scadenze:create', 'scadenze:update',
      'calendar:read', 'calendar:create', 'calendar:update',
      'notifications:read', 'notifications:create',
      'settings:read'
    ],

    // ═══════════════════════════════════════════════════════════════════
    // RUOLI MANAGER
    // ═══════════════════════════════════════════════════════════════════

    [ROLE_TYPES.MANAGER]: [
      'users:read',
      'persons:read',
      'employees:read', 'employees:update',
      'companies:read',
      'courses:read',
      'schedules:read', 'schedules:create', 'schedules:update',
      'enrollments:read',
      'documents:read', 'documents:download',
      'reports:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.HR_MANAGER]: [
      'users:read', 'users:create', 'users:update',
      'persons:read', 'persons:create', 'persons:update',
      'employees:read', 'employees:create', 'employees:update', 'employees:manage',
      'trainers:read',
      'companies:read',
      'courses:read',
      'schedules:read', 'schedules:create', 'schedules:update',
      'enrollments:read', 'enrollments:manage',
      'documents:read', 'documents:create', 'documents:update', 'documents:download',
      'reports:read', 'reports:create', 'reports:export',
      'gdpr:read', 'gdpr.data:read', 'gdpr.data:export',
      'calendar:read',
      ...HR_FULL,
      'notifications:read', 'notifications:create', 'notifications:send'
    ],

    [ROLE_TYPES.DEPARTMENT_HEAD]: [
      'users:read',
      'persons:read',
      'employees:read', 'employees:update',
      'companies:read',
      'courses:read',
      'schedules:read', 'schedules:create', 'schedules:update',
      'enrollments:read',
      'documents:read', 'documents:download',
      'reports:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.COMPANY_MANAGER]: [
      'users:read',
      'persons:read',
      'employees:read', 'employees:update',
      'companies:read', 'companies:update',
      'courses:read',
      'schedules:read', 'schedules:create', 'schedules:update',
      'enrollments:read',
      'documents:read', 'documents:download',
      'reports:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    // ═══════════════════════════════════════════════════════════════════
    // RUOLI FORMAZIONE
    // ═══════════════════════════════════════════════════════════════════

    [ROLE_TYPES.TRAINER]: [
      // Solo propri corsi e propri calendari
      'courses:read',
      'schedules:read', 'schedules:update',
      'enrollments:read', 'enrollments:update',
      'employees:read',
      'companies:read',
      'documents:read', 'documents:create', 'documents:download',
      'attestati:read', 'attestati:create', 'attestati:download', 'attestati:generate',
      'reports:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.SENIOR_TRAINER]: [
      'courses:read', 'courses:create', 'courses:update',
      'schedules:read', 'schedules:create', 'schedules:update',
      'enrollments:read', 'enrollments:update',
      'employees:read',
      'trainers:read',
      'companies:read',
      'documents:read', 'documents:create', 'documents:download',
      'attestati:read', 'attestati:create', 'attestati:download', 'attestati:generate',
      'reports:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.TRAINER_COORDINATOR]: [
      'courses:read', 'courses:create', 'courses:update',
      'schedules:read', 'schedules:create', 'schedules:update', 'schedules:manage',
      'enrollments:read', 'enrollments:update', 'enrollments:manage',
      'employees:read',
      'trainers:read', 'trainers:create', 'trainers:update',
      'companies:read',
      'documents:read', 'documents:create', 'documents:download',
      'attestati:read', 'attestati:create', 'attestati:download', 'attestati:generate',
      'reports:read', 'reports:export',
      'calendar:read', 'calendar:create', 'calendar:update',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.EXTERNAL_TRAINER]: [
      // Accesso minimo: solo propri corsi
      'courses:read',
      'schedules:read',
      'enrollments:read',
      'documents:read', 'documents:download',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    // ═══════════════════════════════════════════════════════════════════
    // RUOLI BASE E ACCESSO
    // ═══════════════════════════════════════════════════════════════════

    [ROLE_TYPES.EMPLOYEE]: [
      // Solo propri corsi, propri attestati, propri documenti
      'courses:read',
      'schedules:read',
      'enrollments:read',
      'documents:read', 'documents:download',
      'attestati:read', 'attestati:download',
      'companies:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.VIEWER]: [
      'companies:read',
      'courses:read',
      'schedules:read',
      'employees:read',
      'reports:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.OPERATOR]: [
      'users:read',
      'companies:read',
      'courses:read',
      'employees:read',
      'schedules:read', 'schedules:create', 'schedules:update',
      'documents:read',
      'reports:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.COORDINATOR]: [
      'users:read',
      'companies:read',
      'courses:read', 'courses:create', 'courses:update',
      'employees:read', 'employees:create', 'employees:update',
      'trainers:read',
      'schedules:read', 'schedules:create', 'schedules:update',
      'enrollments:read', 'enrollments:update',
      'documents:read', 'documents:download',
      'reports:read', 'reports:export',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.SUPERVISOR]: [
      'companies:read',
      'courses:read',
      'employees:read',
      'trainers:read',
      'schedules:read',
      'documents:read',
      'reports:read', 'reports:export',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.GUEST]: [
      'courses:read',
      'schedules:read',
      'public_content:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.CONSULTANT]: [
      'companies:read', 'companies:update',
      'employees:read', 'employees:create', 'employees:update',
      'courses:read',
      'schedules:read',
      'documents:read', 'documents:create', 'documents:update', 'documents:download',
      'reports:read', 'reports:create', 'reports:export',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.AUDITOR]: [
      'companies:read',
      'employees:read',
      'courses:read',
      'trainers:read',
      'schedules:read',
      'reports:read', 'reports:export',
      'gdpr:read', 'gdpr.data:read', 'gdpr.data:export',
      'audit:read', 'audit:export',
      ...NOTIFICATIONS_BASE
    ],

    // ═══════════════════════════════════════════════════════════════════
    // RUOLI CLINICI (P52)
    // ═══════════════════════════════════════════════════════════════════

    [ROLE_TYPES.MEDICO]: [
      // Visite e referti del proprio ambulatorio (branch-scoped, espandibile)
      'clinica.visite:read', 'clinica.visite:create', 'clinica.visite:update', 'clinica.visite:delete',
      // Referti
      'clinica.referti:read', 'clinica.referti:create', 'clinica.referti:update',
      // Appuntamenti
      'clinica.appuntamenti:read', 'clinica.appuntamenti:create', 'clinica.appuntamenti:update',
      // Agenda (usato da appuntamenti routes con checkAdvancedPermission)
      'clinica.agenda:read', 'clinica.agenda:create', 'clinica.agenda:update',
      // Cartella paziente
      'clinica.cartella_paziente:read', 'clinica.cartella_paziente:update',
      // Strutture (sola lettura)
      ...CLINICA_READ_BASE,
      // Poliambulatorio singolare (usato da routes poliambulatori/sedi)
      'clinica.poliambulatorio:read',
      // Medici, Pazienti, Sedi, Listini (sola lettura)
      'clinica.medici:read',
      'clinica.pazienti:read',
      'clinica.sedi:read',
      'clinica.listini:read',
      // Firme referti
      'clinica.signatures:read', 'clinica.signatures:create',
      // Convenzioni e tariffari (sola lettura)
      'clinica.convenzioni:read',
      'clinica.tariffari:read',
      // Compensi personali generati dai movimenti contabili
      'movimenti_contabili:read',
      // Ferie (richiesta propria)
      'clinica.ferie:read', 'clinica.ferie:create',
      // Documenti
      'documents:read', 'documents:create', 'documents:download',
      // Report
      'reports:read', 'reports:create',
      // Calendario
      'calendar:read', 'calendar:create', 'calendar:update',
      // Persone (lettura colleghi/pazienti)
      'persons:read',
      'employees:read',
      // Impostazioni (sola lettura)
      'settings:read',
      // Permessi aggiuntivi clinica (usati da requirePermission middleware/auth.js)
      'clinica:read',
      'fatture:read',
      'giudizi:read', 'giudizi:write',
      'patients:read',
      'signatures:read', 'signatures:write', 'signatures:create', 'signatures:validate',
      'modulistica:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.PAZIENTE]: [
      // Solo propri dati (data-level filtering via AdvancedPermission)
      'clinica.appuntamenti:read',
      'clinica.agenda:read',
      'clinica.visite:read',
      'clinica.referti:read',
      'clinica.cartella_paziente:read',
      'documents:read', 'documents:download',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.INFERMIERE]: [
      // Supporto visite, gestione appuntamenti, lettura pazienti
      'clinica.visite:read',
      'clinica.appuntamenti:read', 'clinica.appuntamenti:update',
      'clinica.agenda:read',
      'clinica.referti:read',
      'clinica.cartella_paziente:read',
      ...CLINICA_READ_BASE,
      'clinica.poliambulatorio:read',
      'clinica.medici:read',
      'clinica.pazienti:read',
      'clinica.sedi:read',
      'documents:read', 'documents:create',
      'persons:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.SEGRETERIA_CLINICA]: [
      // Gestione pazienti, appuntamenti, calendario
      'clinica.appuntamenti:read', 'clinica.appuntamenti:create', 'clinica.appuntamenti:update', 'clinica.appuntamenti:delete',
      'clinica.agenda:read', 'clinica.agenda:create', 'clinica.agenda:update', 'clinica.agenda:delete',
      'clinica.visite:read',
      'clinica.referti:read',
      'clinica.cartella_paziente:read',
      ...CLINICA_READ_BASE,
      'clinica.poliambulatorio:read',
      'clinica.medici:read',
      'clinica.pazienti:read', 'clinica.pazienti:create', 'clinica.pazienti:update',
      'clinica.sedi:read',
      'clinica.listini:read',
      'clinica.convenzioni:read',
      'clinica.tariffari:read',
      // Pazienti e persone
      'persons:read', 'persons:create', 'persons:update',
      'employees:read',
      'companies:read',
      'movimenti_contabili:read', 'movimenti_contabili:write',
      // Documenti
      'documents:read', 'documents:create',
      // Calendario e schedules
      'calendar:read', 'calendar:create', 'calendar:update',
      'schedules:read', 'schedules:create', 'schedules:update',
      // Report
      'reports:read',
      ...NOTIFICATIONS_BASE
    ],

    // ═══════════════════════════════════════════════════════════════════
    // RUOLI SICUREZZA
    // ═══════════════════════════════════════════════════════════════════

    [ROLE_TYPES.MEDICO_COMPETENTE]: [
      // Sorveglianza sanitaria lavoratori
      'clinica.visite:read', 'clinica.visite:create', 'clinica.visite:update',
      'clinica.referti:read', 'clinica.referti:create',
      'clinica.cartella_paziente:read', 'clinica.cartella_paziente:update',
      'employees:read',
      'companies:read',
      'documents:read', 'documents:create', 'documents:download',
      'reports:read', 'reports:create', 'reports:export',
      'scadenze:read', 'scadenze:create', 'scadenze:update',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.RSPP]: [
      // Responsabile Servizio Prevenzione e Protezione
      'scadenze:read', 'scadenze:create', 'scadenze:update', 'scadenze:delete', 'scadenze:manage',
      'companies:read',
      'employees:read',
      'documents:read', 'documents:create', 'documents:download',
      'reports:read', 'reports:create', 'reports:export',
      'courses:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.ASPP]: [
      // Addetto SPP (lettura + report)
      'scadenze:read',
      'companies:read',
      'employees:read',
      'documents:read',
      'reports:read',
      'courses:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.TECNICO_SICUREZZA]: [
      'scadenze:read', 'scadenze:create', 'scadenze:update',
      'companies:read',
      'employees:read',
      'documents:read', 'documents:create', 'documents:download',
      'reports:read', 'reports:create',
      'courses:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ],

    [ROLE_TYPES.CONSULENTE_SICUREZZA]: [
      'scadenze:read',
      'companies:read',
      'employees:read',
      'documents:read',
      'reports:read', 'reports:export',
      'courses:read',
      'calendar:read',
      ...NOTIFICATIONS_BASE
    ]
  };

  return permissionMatrix[roleType] || [];
}

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
 * Verifica se un ruolo ha un permesso specifico di default
 */
export function roleHasPermission(roleType, permission) {
  const permissions = getDefaultPermissions(roleType);
  if (permissions.includes('*:*')) return true;
  return permissions.includes(permission);
}

/**
 * Ottiene tutti i ruoli che hanno un permesso specifico
 */
export function getRolesWithPermission(permission) {
  return Object.values(ROLE_TYPES).filter(roleType =>
    roleHasPermission(roleType, permission)
  );
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
  isValidRoleType,
  isValidScope,
  getAllRoleTypes,
  getAllScopes,
  getDefaultPermissions,
  roleHasPermission,
  getRolesWithPermission,
  getPermissionCount
};
