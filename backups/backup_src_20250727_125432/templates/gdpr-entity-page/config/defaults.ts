/**
 * Default Configurations - Configurazioni predefinite per template GDPR
 * 
 * File che contiene tutte le configurazioni predefinite per il template
 * GDPR-compliant, incluse configurazioni per entità, UI, API e GDPR.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import {
  GDPREntityPageConfig,
  EntityTemplateConfig,
  UITemplateConfig,
  APITemplateConfig,
  PermissionsTemplateConfig,
  EntityValidationTemplateConfig,
  EntityDataExchangeConfig,
  AdvancedTemplateConfig
} from '../types/template.types';
import {
  GDPRConfig,
  GDPRConsentConfig,
  GDPRAuditConfig,
  GDPRDataMinimizationConfig,
  GDPRRightToBeForgottenConfig,
  GDPRDataPortabilityConfig,
  GDPRPrivacyImpactConfig
} from '../types/gdpr.types';
import {
  EntityColumn,
  EntityFilter,
  EntityAction,
  EntityPermissions,
  EntityUIConfig,
  EntityAPIConfig,
  EntityValidationConfig
} from '../types/entity.types';
import { GDPR_CONSTANTS } from '../utils/gdpr.utils';
import { VALIDATION_CONSTANTS } from '../utils/validation.utils';

/**
 * Configurazione GDPR predefinita
 */
export const DEFAULT_GDPR_CONFIG: GDPRConfig = {
  consent: {
    enabled: true,
    requiredConsents: ['data_processing', 'data_storage'],
    optionalConsents: ['marketing', 'analytics'],
    consentExpirationDays: GDPR_CONSTANTS.DEFAULT_CONSENT_EXPIRATION_DAYS,
    autoRenewal: false,
    granularConsent: true,
    consentWithdrawalEnabled: true,
    consentHistoryEnabled: true,
    explicitConsentRequired: true,
    consentVerificationRequired: false,
    defaultConsentState: false
  } as GDPRConsentConfig,
  
  audit: {
    enabled: true,
    level: 'standard',
    retentionDays: GDPR_CONSTANTS.DEFAULT_AUDIT_RETENTION_DAYS,
    includeUserAgent: true,
    includeIpAddress: true,
    includeSessionId: true,
    includeStackTrace: false,
    encryptSensitiveData: true,
    realTimeLogging: true,
    batchSize: 10,
    flushInterval: 30000,
    compressionEnabled: true,
    minimalActions: ['data_access', 'consent_granted', 'consent_revoked'],
    standardActions: [
      'data_access', 'data_creation', 'data_modification', 'data_deletion',
      'consent_granted', 'consent_revoked', 'data_export', 'data_import'
    ],
    comprehensiveActions: [
      'data_access', 'data_creation', 'data_modification', 'data_deletion',
      'consent_granted', 'consent_revoked', 'consent_updated',
      'data_export', 'data_import', 'data_anonymization',
      'user_login', 'user_logout', 'permission_change',
      'system_access', 'configuration_change'
    ]
  } as GDPRAuditConfig,
  
  dataMinimization: {
    enabled: true,
    autoApply: false,
    rules: [
      {
        field: 'email',
        condition: (value, entity) => !entity.consentMarketing,
        action: 'pseudonymize'
      },
      {
        field: 'phone',
        condition: (value, entity) => !entity.consentMarketing,
        action: 'anonymize'
      },
      {
        field: 'address',
        condition: (value, entity) => !entity.consentDataProcessing,
        action: 'remove'
      }
    ],
    retentionPeriodDays: 2555, // 7 anni
    automaticDeletion: true,
    notificationBeforeDeletion: true,
    notificationDays: 30
  } as GDPRDataMinimizationConfig,
  
  rightToBeForgotten: {
    enabled: true,
    automatedDeletion: true,
    verificationRequired: true,
    cascadeDeletion: true,
    softDelete: true,
    hardDeleteAfterDays: 90,
    notifyRelatedSystems: true,
    backupRetentionDays: 30,
    auditDeletionProcess: true,
    allowPartialDeletion: false,
    requireManagerApproval: true,
    deletionConfirmationRequired: true
  } as GDPRRightToBeForgottenConfig,
  
  dataPortability: {
    enabled: true,
    supportedFormats: ['json', 'csv', 'xml'],
    defaultFormat: 'json',
    includeMetadata: true,
    includeRelatedData: true,
    encryptExport: true,
    maxExportSize: 100 * 1024 * 1024, // 100MB
    exportExpirationHours: 24,
    notifyOnExport: true,
    auditExport: true,
    allowScheduledExports: false
  } as GDPRDataPortabilityConfig,
  
  privacyImpact: {
    enabled: true,
    riskAssessmentRequired: true,
    highRiskThreshold: 7,
    mediumRiskThreshold: 4,
    automaticAssessment: true,
    manualReviewRequired: true,
    documentationRequired: true,
    stakeholderNotification: true,
    regularReviewRequired: true,
    reviewIntervalMonths: 12
  } as GDPRPrivacyImpactConfig
};

/**
 * Permessi predefiniti
 */
export const DEFAULT_PERMISSIONS: PermissionsTemplateConfig = {
  required: {
    create: true,
    read: true,
    update: true,
    delete: true,
    export: false,
    import: false
  },
  optional: {
    bulkEdit: false,
    bulkDelete: false,
    advancedSearch: false,
    auditView: false,
    gdprManagement: false
  }
};

/**
 * Configurazione UI predefinita
 */
export const DEFAULT_UI_CONFIG: UITemplateConfig = {
  header: {
    showTitle: true,
    showSubtitle: true,
    showEntityCount: true,
    showLastUpdate: true,
    customActions: []
  },
  toolbar: {
    showSearch: true,
    showFilters: true,
    showSort: true,
    showExport: true,
    showImport: false,
    showBulkActions: true,
    showRefresh: true,
    showSettings: true,
    customButtons: []
  },
  table: {
    showPagination: true,
    showSelection: true,
    showRowActions: true,
    showColumnToggle: true,
    showDensityToggle: true,
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    stickyHeader: true,
    stickyColumns: [],
    resizableColumns: true,
    sortableColumns: true,
    filterableColumns: true
  },
  modals: {
    showCreateModal: true,
    showEditModal: true,
    showDeleteConfirmation: true,
    showBulkDeleteConfirmation: true,
    showGDPRConsent: true,
    showAuditLog: true,
    modalSize: 'medium'
  },
  layout: {
    sidebar: false,
    breadcrumbs: true,
    pageHeader: true,
    footer: false,
    spacing: 'normal',
    containerMaxWidth: 'xl'
  },
  theme: {
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    successColor: '#2e7d32',
    warningColor: '#ed6c02',
    errorColor: '#d32f2f',
    infoColor: '#0288d1',
    backgroundColor: '#fafafa',
    surfaceColor: '#ffffff',
    textPrimaryColor: '#212121',
    textSecondaryColor: '#757575'
  }
};

/**
 * Configurazione API predefinita
 */
export const DEFAULT_API_CONFIG: APITemplateConfig = {
  endpoints: {
    list: '/api/entities',
    create: '/api/entities',
    read: '/api/entities',
    update: '/api/entities',
    delete: '/api/entities',
    export: '/api/entities/export',
    import: '/api/entities/import'
  },
  defaultOptions: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000
  },
  caching: {
    enabled: true,
    ttl: 300000, // 5 minuti
    maxSize: 100,
    strategy: 'lru'
  },
  pagination: {
    defaultPage: 1,
    defaultPageSize: 25,
    maxPageSize: 100,
    pageSizeParam: 'pageSize',
    pageParam: 'page',
    totalCountHeader: 'X-Total-Count'
  },
  search: {
    searchParam: 'search',
    searchFields: ['name', 'description'],
    minSearchLength: 2,
    searchDelay: 300
  },
  sorting: {
    sortParam: 'sort',
    orderParam: 'order',
    defaultSort: 'createdAt',
    defaultOrder: 'desc'
  },
  filtering: {
    filterPrefix: 'filter',
    dateFormat: 'YYYY-MM-DD',
    booleanFormat: 'true/false'
  }
};

/**
 * Configurazione validazione predefinita
 */
export const DEFAULT_VALIDATION_CONFIG: EntityValidationTemplateConfig = {
  rules: [
    {
      field: 'name',
      type: 'string',
      required: true,
      minLength: VALIDATION_CONSTANTS.LENGTHS.NAME.min,
      maxLength: VALIDATION_CONSTANTS.LENGTHS.NAME.max,
      pattern: VALIDATION_CONSTANTS.PATTERNS.LETTERS_SPACES
    },
    {
      field: 'email',
      type: 'email',
      required: false,
      maxLength: VALIDATION_CONSTANTS.LENGTHS.EMAIL.max
    },
    {
      field: 'phone',
      type: 'phone',
      required: false
    },
    {
      field: 'description',
      type: 'string',
      required: false,
      maxLength: VALIDATION_CONSTANTS.LENGTHS.DESCRIPTION.max
    }
  ],
  strictMode: false,
  allowUnknownFields: true,
  sanitizeInput: true
};

/**
 * Configurazione import/export predefinita
 */
export const DEFAULT_DATA_EXCHANGE_CONFIG: EntityDataExchangeConfig = {
  import: {
    enabled: false,
    supportedFormats: ['csv', 'xlsx'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    validateBeforeImport: true,
    allowPartialImport: true,
    duplicateHandling: 'skip',
    batchSize: 100,
    templateUrl: '/templates/template-entities.csv'
  },
  export: {
    enabled: true,
    supportedFormats: ['csv', 'xlsx', 'json'],
    defaultFormat: 'csv',
    includeHeaders: true,
    includeMetadata: false,
    maxRecords: 10000,
    filename: 'entities-export',
    gdprCompliant: true
  }
};

/**
 * Configurazioni avanzate predefinite
 */
export const DEFAULT_ADVANCED_CONFIG: AdvancedTemplateConfig = {
  performance: {
    virtualScrolling: false,
    lazyLoading: true,
    debounceMs: 300,
    throttleMs: 100,
    memoization: true,
    optimisticUpdates: false
  },
  analytics: {
    enabled: false,
    trackUserActions: false,
    trackPerformance: false,
    trackErrors: true,
    anonymizeData: true
  },
  debug: {
    enabled: false,
    logLevel: 'warn',
    showPerformanceMetrics: false,
    showStateChanges: false,
    enableDevTools: false
  },
  experimental: {
    enableNewFeatures: false,
    betaFeatures: [],
    featureFlags: {}
  }
};

/**
 * Colonne predefinite per entità base
 */
export const DEFAULT_ENTITY_COLUMNS: EntityColumn[] = [
  {
    key: 'id',
    label: 'ID',
    type: 'string',
    sortable: true,
    filterable: true,
    visible: false,
    width: 100,
    align: 'left'
  },
  {
    key: 'name',
    label: 'Nome',
    type: 'string',
    sortable: true,
    filterable: true,
    visible: true,
    width: 200,
    align: 'left',
    required: true
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    sortable: true,
    filterable: true,
    visible: true,
    width: 250,
    align: 'left'
  },
  {
    key: 'phone',
    label: 'Telefono',
    type: 'phone',
    sortable: false,
    filterable: true,
    visible: true,
    width: 150,
    align: 'left'
  },
  {
    key: 'status',
    label: 'Stato',
    type: 'select',
    sortable: true,
    filterable: true,
    visible: true,
    width: 120,
    align: 'center',
    options: [
      { value: 'active', label: 'Attivo', color: 'success' },
      { value: 'inactive', label: 'Inattivo', color: 'default' },
      { value: 'pending', label: 'In attesa', color: 'warning' },
      { value: 'suspended', label: 'Sospeso', color: 'error' }
    ]
  },
  {
    key: 'createdAt',
    label: 'Creato il',
    type: 'datetime',
    sortable: true,
    filterable: true,
    visible: true,
    width: 150,
    align: 'center'
  },
  {
    key: 'updatedAt',
    label: 'Modificato il',
    type: 'datetime',
    sortable: true,
    filterable: true,
    visible: false,
    width: 150,
    align: 'center'
  }
];

/**
 * Filtri predefiniti
 */
export const DEFAULT_ENTITY_FILTERS: EntityFilter[] = [
  {
    key: 'status',
    label: 'Stato',
    type: 'select',
    options: [
      { value: 'active', label: 'Attivo' },
      { value: 'inactive', label: 'Inattivo' },
      { value: 'pending', label: 'In attesa' },
      { value: 'suspended', label: 'Sospeso' }
    ],
    multiple: true
  },
  {
    key: 'createdAt',
    label: 'Data creazione',
    type: 'dateRange'
  },
  {
    key: 'updatedAt',
    label: 'Data modifica',
    type: 'dateRange'
  }
];

/**
 * Azioni predefinite
 */
export const DEFAULT_ENTITY_ACTIONS: EntityAction[] = [
  {
    key: 'view',
    label: 'Visualizza',
    icon: 'visibility',
    type: 'primary',
    permission: 'read'
  },
  {
    key: 'edit',
    label: 'Modifica',
    icon: 'edit',
    type: 'secondary',
    permission: 'update'
  },
  {
    key: 'delete',
    label: 'Elimina',
    icon: 'delete',
    type: 'danger',
    permission: 'delete',
    confirmationRequired: true,
    confirmationMessage: 'Sei sicuro di voler eliminare questo elemento?'
  },
  {
    key: 'audit',
    label: 'Audit Log',
    icon: 'history',
    type: 'secondary',
    permission: 'auditView'
  },
  {
    key: 'gdpr',
    label: 'GDPR',
    icon: 'security',
    type: 'secondary',
    permission: 'gdprManagement'
  }
];

/**
 * Configurazione template completa predefinita
 */
export const DEFAULT_TEMPLATE_CONFIG: Omit<GDPREntityPageConfig, 'entity'> & { entity: Omit<EntityTemplateConfig, 'name' | 'namePlural'> } = {
  entity: {
    columns: DEFAULT_ENTITY_COLUMNS,
    filters: DEFAULT_ENTITY_FILTERS,
    actions: DEFAULT_ENTITY_ACTIONS,
    searchFields: ['name', 'email', 'description'],
    defaultSort: { field: 'createdAt', direction: 'desc' },
    bulkActions: [
      {
        key: 'bulkDelete',
        label: 'Elimina selezionati',
        icon: 'delete',
        type: 'danger',
        permission: 'delete',
        confirmationRequired: true,
        confirmationMessage: 'Sei sicuro di voler eliminare gli elementi selezionati?'
      },
      {
        key: 'bulkExport',
        label: 'Esporta selezionati',
        icon: 'download',
        type: 'secondary',
        permission: 'export'
      }
    ]
  },
  
  ui: DEFAULT_UI_CONFIG,
  api: DEFAULT_API_CONFIG,
  permissions: DEFAULT_PERMISSIONS,
  validation: DEFAULT_VALIDATION_CONFIG,
  dataExchange: DEFAULT_DATA_EXCHANGE_CONFIG,
  advanced: DEFAULT_ADVANCED_CONFIG,
  gdpr: DEFAULT_GDPR_CONFIG
};

/**
 * Factory per creare configurazione personalizzata
 */
export class ConfigFactory {
  
  /**
   * Crea configurazione base per un tipo di entità
   */
  static createBaseConfig(
    entityType: string,
    title: string,
    overrides: Partial<GDPREntityPageConfig> = {}
  ): GDPREntityPageConfig {
    return {
      ...DEFAULT_TEMPLATE_CONFIG,
      entity: {
        ...DEFAULT_TEMPLATE_CONFIG.entity,
        name: entityType,
        namePlural: title,
        description: `Gestione ${title.toLowerCase()}`
      },
      ...overrides
    };
  }
  
  /**
   * Crea configurazione per entità semplice (senza GDPR complesso)
   */
  static createSimpleConfig(
    entityType: string,
    title: string,
    overrides: Partial<GDPREntityPageConfig> = {}
  ): GDPREntityPageConfig {
    const simpleGDPR: GDPRConfig = {
      ...DEFAULT_GDPR_CONFIG,
      consent: {
        ...DEFAULT_GDPR_CONFIG.consent!,
        requiredConsents: ['data_processing'],
        optionalConsents: []
      },
      audit: {
        ...DEFAULT_GDPR_CONFIG.audit!,
        level: 'minimal'
      },
      dataMinimization: {
        ...DEFAULT_GDPR_CONFIG.dataMinimization!,
        enabled: false
      }
    };
    
    return this.createBaseConfig(entityType, title, {
      gdpr: simpleGDPR,
      ...overrides
    });
  }
  
  /**
   * Crea configurazione per entità con dati sensibili
   */
  static createSensitiveDataConfig(
    entityType: string,
    title: string,
    overrides: Partial<GDPREntityPageConfig> = {}
  ): GDPREntityPageConfig {
    const sensitiveGDPR: GDPRConfig = {
      ...DEFAULT_GDPR_CONFIG,
      audit: {
        ...DEFAULT_GDPR_CONFIG.audit!,
        level: 'comprehensive',
        encryptSensitiveData: true
      },
      dataMinimization: {
        ...DEFAULT_GDPR_CONFIG.dataMinimization!,
        autoApply: true
      },
      privacyImpact: {
        ...DEFAULT_GDPR_CONFIG.privacyImpact!,
        riskAssessmentRequired: true,
        manualReviewRequired: true
      }
    };
    
    return this.createBaseConfig(entityType, title, {
      gdpr: sensitiveGDPR,
      ...overrides
    });
  }
  
  /**
   * Crea configurazione per entità di sola lettura
   */
  static createReadOnlyConfig(
    entityType: string,
    title: string,
    overrides: Partial<GDPREntityPageConfig> = {}
  ): GDPREntityPageConfig {
    const readOnlyPermissions: PermissionsTemplateConfig = {
      required: {
        create: false,
        read: true,
        update: false,
        delete: false,
        export: true,
        import: false
      },
      optional: {
        bulkEdit: false,
        bulkDelete: false,
        advancedSearch: true,
        auditView: true,
        gdprManagement: false
      }
    };
    
    const readOnlyUI: UITemplateConfig = {
      ...DEFAULT_UI_CONFIG,
      toolbar: {
        ...DEFAULT_UI_CONFIG.toolbar,
        showImport: false,
        showBulkActions: false
      },
      modals: {
        ...DEFAULT_UI_CONFIG.modals,
        showCreateModal: false,
        showEditModal: false,
        showDeleteConfirmation: false,
        showBulkDeleteConfirmation: false
      }
    };
    
    return this.createBaseConfig(entityType, title, {
      permissions: readOnlyPermissions,
      ui: readOnlyUI,
      ...overrides
    });
  }
}

export default {
  DEFAULT_GDPR_CONFIG,
  DEFAULT_PERMISSIONS,
  DEFAULT_UI_CONFIG,
  DEFAULT_API_CONFIG,
  DEFAULT_VALIDATION_CONFIG,
  DEFAULT_DATA_EXCHANGE_CONFIG,
  DEFAULT_ADVANCED_CONFIG,
  DEFAULT_ENTITY_COLUMNS,
  DEFAULT_ENTITY_FILTERS,
  DEFAULT_ENTITY_ACTIONS,
  DEFAULT_TEMPLATE_CONFIG,
  ConfigFactory
};