/**
 * Person Permissions Configuration
 * 
 * Configurazione dei permessi per l'entità Person unificata,
 * con supporto per filtri gerarchici employees/trainers.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

/**
 * Permessi base per l'entità Person
 */
export const PERSON_PERMISSIONS = {
  // Permessi di lettura
  READ: 'persons:read',
  VIEW_EMPLOYEES: 'persons:view_employees',
  VIEW_TRAINERS: 'persons:view_trainers',
  VIEW_GDPR_DATA: 'persons:view_gdpr_data',
  
  // Permessi di scrittura
  WRITE: 'persons:write',
  CREATE: 'persons:create',
  CREATE_EMPLOYEES: 'persons:create_employees',
  CREATE_TRAINERS: 'persons:create_trainers',
  EDIT: 'persons:edit',
  EDIT_EMPLOYEES: 'persons:edit_employees',
  EDIT_TRAINERS: 'persons:edit_trainers',
  
  // Permessi di eliminazione
  DELETE: 'persons:delete',
  DELETE_EMPLOYEES: 'persons:delete_employees',
  DELETE_TRAINERS: 'persons:delete_trainers',
  
  // Permessi GDPR
  EXPORT: 'persons:export',
  EXPORT_GDPR_DATA: 'persons:export_gdpr_data',
  DELETE_GDPR_DATA: 'persons:delete_gdpr_data',
  MANAGE_CONSENTS: 'persons:manage_consents',
  
  // Permessi amministrativi
  MANAGE_ROLES: 'persons:manage_roles',
  VIEW_AUDIT_LOG: 'persons:view_audit_log',
  BULK_OPERATIONS: 'persons:bulk_operations'
} as const;

/**
 * Configurazione permessi per ruoli specifici
 */
export const ROLE_PERMISSIONS = {
  // Super Admin - accesso completo
  SUPER_ADMIN: [
    PERSON_PERMISSIONS.READ,
    PERSON_PERMISSIONS.VIEW_EMPLOYEES,
    PERSON_PERMISSIONS.VIEW_TRAINERS,
    PERSON_PERMISSIONS.VIEW_GDPR_DATA,
    PERSON_PERMISSIONS.WRITE,
    PERSON_PERMISSIONS.CREATE,
    PERSON_PERMISSIONS.CREATE_EMPLOYEES,
    PERSON_PERMISSIONS.CREATE_TRAINERS,
    PERSON_PERMISSIONS.EDIT,
    PERSON_PERMISSIONS.EDIT_EMPLOYEES,
    PERSON_PERMISSIONS.EDIT_TRAINERS,
    PERSON_PERMISSIONS.DELETE,
    PERSON_PERMISSIONS.DELETE_EMPLOYEES,
    PERSON_PERMISSIONS.DELETE_TRAINERS,
    PERSON_PERMISSIONS.EXPORT,
    PERSON_PERMISSIONS.EXPORT_GDPR_DATA,
    PERSON_PERMISSIONS.DELETE_GDPR_DATA,
    PERSON_PERMISSIONS.MANAGE_CONSENTS,
    PERSON_PERMISSIONS.MANAGE_ROLES,
    PERSON_PERMISSIONS.VIEW_AUDIT_LOG,
    PERSON_PERMISSIONS.BULK_OPERATIONS
  ],
  
  // HR Manager - gestione dipendenti
  HR_MANAGER: [
    PERSON_PERMISSIONS.READ,
    PERSON_PERMISSIONS.VIEW_EMPLOYEES,
    PERSON_PERMISSIONS.VIEW_GDPR_DATA,
    PERSON_PERMISSIONS.CREATE_EMPLOYEES,
    PERSON_PERMISSIONS.EDIT_EMPLOYEES,
    PERSON_PERMISSIONS.DELETE_EMPLOYEES,
    PERSON_PERMISSIONS.EXPORT,
    PERSON_PERMISSIONS.MANAGE_CONSENTS,
    PERSON_PERMISSIONS.VIEW_AUDIT_LOG
  ],
  
  // Trainer Coordinator - gestione formatori
  TRAINER_COORDINATOR: [
    PERSON_PERMISSIONS.READ,
    PERSON_PERMISSIONS.VIEW_TRAINERS,
    PERSON_PERMISSIONS.VIEW_GDPR_DATA,
    PERSON_PERMISSIONS.CREATE_TRAINERS,
    PERSON_PERMISSIONS.EDIT_TRAINERS,
    PERSON_PERMISSIONS.DELETE_TRAINERS,
    PERSON_PERMISSIONS.EXPORT,
    PERSON_PERMISSIONS.MANAGE_CONSENTS,
    PERSON_PERMISSIONS.VIEW_AUDIT_LOG
  ],
  
  // Manager - visualizzazione e gestione limitata
  MANAGER: [
    PERSON_PERMISSIONS.READ,
    PERSON_PERMISSIONS.VIEW_EMPLOYEES,
    PERSON_PERMISSIONS.EDIT_EMPLOYEES,
    PERSON_PERMISSIONS.EXPORT
  ],
  
  // Senior Trainer - visualizzazione formatori
  SENIOR_TRAINER: [
    PERSON_PERMISSIONS.READ,
    PERSON_PERMISSIONS.VIEW_TRAINERS,
    PERSON_PERMISSIONS.EDIT_TRAINERS
  ],
  
  // Employee/Trainer - solo visualizzazione propri dati
  EMPLOYEE: [
    PERSON_PERMISSIONS.READ
  ],
  
  TRAINER: [
    PERSON_PERMISSIONS.READ
  ]
} as const;

/**
 * Configurazione GDPR per entità Person
 */
export const PERSON_GDPR_CONFIG = {
  // Consensi richiesti
  requiredConsents: [
    'data_processing',
    'data_storage'
  ],
  
  // Consensi opzionali
  optionalConsents: [
    'marketing_communications',
    'analytics_tracking',
    'third_party_sharing'
  ],
  
  // Campi sensibili che richiedono consenso esplicito
  sensitiveFields: [
    'fiscalCode',
    'birthDate',
    'phone',
    'address',
    'bankDetails',
    'medicalInfo'
  ],
  
  // Configurazione audit
  auditConfig: {
    level: 'comprehensive',
    retentionDays: 2555, // 7 anni
    encryptSensitiveData: true,
    realTimeLogging: true
  },
  
  // Configurazione diritto all'oblio
  rightToBeForgotten: {
    enabled: true,
    automatedDeletion: false, // Richiede approvazione manuale
    verificationRequired: true,
    cascadeDeletion: true,
    softDelete: true,
    hardDeleteAfterDays: 90,
    requireManagerApproval: true
  },
  
  // Configurazione portabilità dati
  dataPortability: {
    enabled: true,
    supportedFormats: ['json', 'csv', 'xml'],
    defaultFormat: 'json',
    includeMetadata: true,
    includeRelatedData: true,
    encryptExport: true,
    maxExportSize: 50 * 1024 * 1024 // 50MB
  }
} as const;

/**
 * Template di configurazione per employees
 */
export const EMPLOYEES_TEMPLATE_CONFIG = {
  entityType: 'employees',
  displayName: 'Dipendenti',
  permissions: {
    read: PERSON_PERMISSIONS.VIEW_EMPLOYEES,
    write: PERSON_PERMISSIONS.EDIT_EMPLOYEES,
    create: PERSON_PERMISSIONS.CREATE_EMPLOYEES,
    delete: PERSON_PERMISSIONS.DELETE_EMPLOYEES,
    export: PERSON_PERMISSIONS.EXPORT
  },
  gdprConfig: {
    ...PERSON_GDPR_CONFIG,
    auditConfig: {
      ...PERSON_GDPR_CONFIG.auditConfig,
      level: 'comprehensive' // Livello massimo per dipendenti
    }
  },
  filterConfig: {
    roleTypes: ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE'],
    defaultFilters: {
      status: 'Active',
      roleType: ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE']
    }
  }
} as const;

/**
 * Template di configurazione per trainers
 */
export const TRAINERS_TEMPLATE_CONFIG = {
  entityType: 'trainers',
  displayName: 'Formatori',
  permissions: {
    read: PERSON_PERMISSIONS.VIEW_TRAINERS,
    write: PERSON_PERMISSIONS.EDIT_TRAINERS,
    create: PERSON_PERMISSIONS.CREATE_TRAINERS,
    delete: PERSON_PERMISSIONS.DELETE_TRAINERS,
    export: PERSON_PERMISSIONS.EXPORT
  },
  gdprConfig: {
    ...PERSON_GDPR_CONFIG,
    auditConfig: {
      ...PERSON_GDPR_CONFIG.auditConfig,
      level: 'standard' // Livello standard per formatori
    }
  },
  filterConfig: {
    roleTypes: ['TRAINER_COORDINATOR', 'SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER'],
    defaultFilters: {
      status: 'Active',
      roleType: ['TRAINER_COORDINATOR', 'SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER']
    }
  }
} as const;

/**
 * Utility per verificare i permessi
 */
export class PersonPermissionChecker {
  
  /**
   * Verifica se un utente ha un permesso specifico
   */
  static hasPermission(userRole: string, permission: string): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
    return rolePermissions ? rolePermissions.includes(permission as any) : false;
  }
  
  /**
   * Ottiene tutti i permessi per un ruolo
   */
  static getPermissionsForRole(userRole: string): readonly string[] {
    return ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
  }
  
  /**
   * Verifica se un utente può accedere alla sezione employees
   */
  static canAccessEmployees(userRole: string): boolean {
    return this.hasPermission(userRole, PERSON_PERMISSIONS.VIEW_EMPLOYEES);
  }
  
  /**
   * Verifica se un utente può accedere alla sezione trainers
   */
  static canAccessTrainers(userRole: string): boolean {
    return this.hasPermission(userRole, PERSON_PERMISSIONS.VIEW_TRAINERS);
  }
  
  /**
   * Verifica se un utente può gestire i dati GDPR
   */
  static canManageGDPR(userRole: string): boolean {
    return this.hasPermission(userRole, PERSON_PERMISSIONS.VIEW_GDPR_DATA) ||
           this.hasPermission(userRole, PERSON_PERMISSIONS.MANAGE_CONSENTS);
  }
}

export default {
  PERSON_PERMISSIONS,
  ROLE_PERMISSIONS,
  PERSON_GDPR_CONFIG,
  EMPLOYEES_TEMPLATE_CONFIG,
  TRAINERS_TEMPLATE_CONFIG,
  PersonPermissionChecker
};