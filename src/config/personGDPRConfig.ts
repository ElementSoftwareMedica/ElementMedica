/**
 * Person GDPR Template Configuration
 * 
 * Configurazioni GDPR specifiche per le pagine Person unificate,
 * con supporto per employees e trainers.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import { 
  PERSON_PERMISSIONS, 
  PERSON_GDPR_CONFIG
} from './personPermissions';

/**
 * Configurazione permessi base per Person
 */
export const PERSON_BASE_PERMISSIONS = {
  read: PERSON_PERMISSIONS.READ,
  write: PERSON_PERMISSIONS.WRITE,
  delete: PERSON_PERMISSIONS.DELETE,
  export: PERSON_PERMISSIONS.EXPORT
};

/**
 * Configurazione permessi per Employees
 */
export const EMPLOYEES_PERMISSIONS = {
  read: 'VIEW_EMPLOYEES',
  write: 'EDIT_EMPLOYEES',
  create: 'CREATE_EMPLOYEES',
  delete: 'DELETE_EMPLOYEES',
  export: 'EXPORT_EMPLOYEES'
};

/**
 * Configurazione permessi per Trainers
 */
export const TRAINERS_PERMISSIONS = {
  read: 'VIEW_TRAINERS',
  write: 'EDIT_TRAINERS',
  create: 'CREATE_TRAINERS',
  delete: 'DELETE_TRAINERS',
  export: 'EXPORT_TRAINERS'
};

/**
 * Configurazione GDPR semplificata per Employees
 */
export const EMPLOYEES_GDPR_SIMPLE_CONFIG = {
  entityType: 'employees',
  displayName: 'Dipendenti',
  permissions: EMPLOYEES_PERMISSIONS,
  gdprLevel: 'comprehensive', // Livello massimo per dipendenti
  auditEnabled: true,
  consentRequired: true,
  dataMinimization: true,
  rightToBeForgotten: true,
  dataPortability: true,
  sensitiveFields: PERSON_GDPR_CONFIG.sensitiveFields,
  requiredConsents: [
    'data_processing',
    'data_storage',
    'employment_data_processing'
  ],
  optionalConsents: [
    'marketing_communications',
    'analytics_tracking'
  ]
};

/**
 * Configurazione GDPR semplificata per Trainers
 */
export const TRAINERS_GDPR_SIMPLE_CONFIG = {
  entityType: 'trainers',
  displayName: 'Formatori',
  permissions: TRAINERS_PERMISSIONS,
  gdprLevel: 'standard', // Livello standard per formatori
  auditEnabled: true,
  consentRequired: true,
  dataMinimization: false, // Meno restrittivo per formatori
  rightToBeForgotten: true,
  dataPortability: true,
  sensitiveFields: PERSON_GDPR_CONFIG.sensitiveFields,
  requiredConsents: [
    'data_processing',
    'data_storage',
    'training_data_processing'
  ],
  optionalConsents: [
    'marketing_communications',
    'professional_networking',
    'certification_sharing'
  ]
};

/**
 * Configurazione GDPR semplificata per la vista unificata di tutte le persone
 */
export const ALL_PERSONS_GDPR_SIMPLE_CONFIG = {
  entityType: 'persons',
  displayName: 'Persone',
  permissions: {
    read: 'VIEW_PERSONS',
    write: 'EDIT_PERSONS',
    create: 'CREATE_PERSONS',
    delete: 'DELETE_PERSONS',
    export: 'EXPORT_PERSONS'
  },
  gdprLevel: 'comprehensive',
  auditEnabled: true,
  consentRequired: true,
  dataMinimization: true,
  rightToBeForgotten: true,
  dataPortability: true,
  sensitiveFields: PERSON_GDPR_CONFIG.sensitiveFields,
  requiredConsents: ['data_processing', 'privacy_policy'],
  optionalConsents: ['marketing', 'analytics']
};

/**
 * Factory per ottenere configurazioni GDPR
 */
export class PersonGDPRConfigFactory {
  
  /**
   * Ottiene configurazione per employees
   */
  static getEmployeesConfig() {
    return EMPLOYEES_GDPR_SIMPLE_CONFIG;
  }
  
  /**
   * Ottiene configurazione per trainers
   */
  static getTrainersConfig() {
    return TRAINERS_GDPR_SIMPLE_CONFIG;
  }
  
  /**
   * Ottiene configurazione per vista unificata
   */
  static getAllPersonsConfig() {
    return ALL_PERSONS_GDPR_SIMPLE_CONFIG;
  }
  
  /**
   * Ottiene configurazione basata sul tipo di filtro
   */
  static getConfigByFilterType(filterType: 'employees' | 'trainers' | 'all') {
    switch (filterType) {
      case 'employees':
        return this.getEmployeesConfig();
      case 'trainers':
        return this.getTrainersConfig();
      case 'all':
      default:
        return this.getAllPersonsConfig();
    }
  }
  
  /**
   * Verifica se un'operazione è permessa per un tipo di entità
   */
  static isOperationAllowed(
    filterType: 'employees' | 'trainers' | 'all',
    operation: 'read' | 'write' | 'create' | 'delete' | 'export'
  ): boolean {
    const config = this.getConfigByFilterType(filterType);
    return (config.permissions as any)[operation] !== undefined;
  }
  
  /**
   * Ottiene il livello GDPR per un tipo di entità
   */
  static getGDPRLevel(filterType: 'employees' | 'trainers' | 'all'): string {
    const config = this.getConfigByFilterType(filterType);
    return config.gdprLevel;
  }
}

/**
 * Configurazioni predefinite per export
 */
export const PERSON_GDPR_CONFIGS = {
  employees: EMPLOYEES_GDPR_SIMPLE_CONFIG,
  trainers: TRAINERS_GDPR_SIMPLE_CONFIG,
  allPersons: ALL_PERSONS_GDPR_SIMPLE_CONFIG
} as const;

export default {
  PERSON_BASE_PERMISSIONS,
  EMPLOYEES_PERMISSIONS,
  TRAINERS_PERMISSIONS,
  EMPLOYEES_GDPR_SIMPLE_CONFIG,
  TRAINERS_GDPR_SIMPLE_CONFIG,
  ALL_PERSONS_GDPR_SIMPLE_CONFIG,
  PersonGDPRConfigFactory,
  PERSON_GDPR_CONFIGS
};