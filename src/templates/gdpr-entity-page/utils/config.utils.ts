import { 
  ColumnConfig, 
  EntityField, 
  FilterConfig, 
  EntityAPIConfig,
  GDPREntityTemplateProps,
  BaseEntity
} from '../types';

/**
 * Utility per la configurazione del template GDPR
 */

// ============================================================================
// CONFIGURAZIONE COLONNE
// ============================================================================

/**
 * Genera configurazione colonne da campi entità
 */
export function generateColumnsFromFields(
  fields: EntityField[],
  additionalFields: EntityField[] = []
): ColumnConfig[] {
  const allFields = [...fields, ...additionalFields];
  
  return allFields.map((field, index) => ({
    key: field.key,
    label: field.label,
    sortable: field.sortable ?? true,
    filterable: field.filterable ?? true,
    formatter: field.formatter,
    visible: true,
    order: index,
    resizable: true,
    width: getDefaultColumnWidth(field.type),
    minWidth: 80,
    align: getColumnAlignment(field.type)
  }));
}

/**
 * Ottiene larghezza di default per tipo di campo
 */
function getDefaultColumnWidth(type?: string): number {
  switch (type) {
    case 'boolean':
      return 80;
    case 'date':
      return 120;
    case 'email':
      return 200;
    case 'phone':
      return 140;
    case 'number':
      return 100;
    case 'textarea':
      return 250;
    default:
      return 150;
  }
}

/**
 * Ottiene allineamento per tipo di campo
 */
function getColumnAlignment(type?: string): 'left' | 'center' | 'right' {
  switch (type) {
    case 'number':
      return 'right';
    case 'boolean':
      return 'center';
    case 'date':
      return 'center';
    default:
      return 'left';
  }
}

/**
 * Aggiunge colonne di sistema (selezione, azioni)
 */
export function addSystemColumns(
  columns: ColumnConfig[],
  options: {
    enableSelection?: boolean;
    enableActions?: boolean;
    actionsWidth?: number;
  } = {}
): ColumnConfig[] {
  const systemColumns: ColumnConfig[] = [];
  
  // Colonna selezione
  if (options.enableSelection) {
    systemColumns.push({
      key: 'select',
      label: '',
      sortable: false,
      filterable: false,
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      resizable: false,
      visible: true,
      order: -2,
      sticky: true,
      align: 'center'
    });
  }
  
  // Colonna azioni
  if (options.enableActions) {
    systemColumns.push({
      key: 'actions',
      label: 'Azioni',
      sortable: false,
      filterable: false,
      width: options.actionsWidth ?? 120,
      minWidth: 100,
      resizable: false,
      visible: true,
      order: 9999,
      sticky: true,
      align: 'center'
    });
  }
  
  return [...systemColumns, ...columns];
}

// ============================================================================
// CONFIGURAZIONE FILTRI
// ============================================================================

/**
 * Genera configurazione filtri da campi entità
 */
export function generateFiltersFromFields(
  fields: EntityField[],
  additionalFields: EntityField[] = []
): FilterConfig[] {
  const allFields = [...fields, ...additionalFields];
  
  return allFields
    .filter(field => field.filterable !== false)
    .map(field => ({
      key: field.key,
      label: field.label,
      type: mapFieldTypeToFilterType(field.type),
      options: field.options,
      placeholder: field.placeholder ?? `Filtra per ${field.label.toLowerCase()}...`
    }));
}

/**
 * Mappa tipo di campo a tipo di filtro
 */
function mapFieldTypeToFilterType(fieldType?: string): FilterConfig['type'] {
  switch (fieldType) {
    case 'select':
      return 'select';
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    default:
      return 'text';
  }
}

/**
 * Aggiunge filtri di sistema
 */
export function addSystemFilters(
  filters: FilterConfig[],
  options: {
    enableDateRange?: boolean;
    enableStatusFilter?: boolean;
    enableOwnerFilter?: boolean;
  } = {}
): FilterConfig[] {
  const systemFilters: FilterConfig[] = [];
  
  if (options.enableDateRange) {
    systemFilters.push({
      key: 'dateRange',
      label: 'Periodo',
      type: 'dateRange',
      placeholder: 'Seleziona periodo...'
    });
  }
  
  if (options.enableStatusFilter) {
    systemFilters.push({
      key: 'status',
      label: 'Stato',
      type: 'select',
      options: [
        { value: 'active', label: 'Attivo' },
        { value: 'inactive', label: 'Inattivo' },
        { value: 'deleted', label: 'Eliminato' }
      ]
    });
  }
  
  if (options.enableOwnerFilter) {
    systemFilters.push({
      key: 'owner',
      label: 'Proprietario',
      type: 'select',
      placeholder: 'Seleziona proprietario...'
    });
  }
  
  return [...systemFilters, ...filters];
}

// ============================================================================
// CONFIGURAZIONE API
// ============================================================================

/**
 * Genera configurazione API da endpoint base
 */
export function generateAPIConfig(
  baseEndpoint: string,
  options: {
    enablePagination?: boolean;
    defaultPageSize?: number;
    maxPageSize?: number;
    customEndpoints?: Partial<EntityAPIConfig['endpoints']>;
  } = {}
): EntityAPIConfig {
  const endpoints = {
    list: baseEndpoint,
    create: baseEndpoint,
    read: `${baseEndpoint}/:id`,
    update: `${baseEndpoint}/:id`,
    delete: `${baseEndpoint}/:id`,
    export: `${baseEndpoint}/export`,
    import: `${baseEndpoint}/import`,
    ...options.customEndpoints
  };
  
  return {
    endpoints,
    defaultOptions: {
      headers: {
        'Content-Type': 'application/json'
      }
    },
    pagination: options.enablePagination ? {
      enabled: true,
      defaultPageSize: options.defaultPageSize ?? 20,
      maxPageSize: options.maxPageSize ?? 100
    } : undefined
  };
}

// ============================================================================
// CONFIGURAZIONE TEMPLATE
// ============================================================================

/**
 * Genera configurazione template con valori di default
 */
export function generateTemplateConfig<T extends BaseEntity>(
  baseConfig: Partial<GDPREntityTemplateProps<T>>
): GDPREntityTemplateProps<T> {
  const defaults: Partial<GDPREntityTemplateProps<T>> = {
    enableSearch: true,
    enableFilters: true,
    enableExport: true,
    enableImport: false,
    enableBulkEdit: true,
    enableColumnSelector: true,
    enableViewModeToggle: true,
    defaultViewMode: 'table',
    defaultPageSize: 20,
    defaultSortDirection: 'desc',
    permissions: {
      read: ['USER'],
      create: ['USER'],
      update: ['USER'],
      delete: ['ADMIN'],
      export: ['USER'],
      import: ['ADMIN']
    },
    gdprConfig: {
      enableAuditLog: true,
      enableConsentTracking: true,
      dataRetentionDays: 2555, // 7 anni
      anonymizeOnDelete: true
    }
  };
  
  return {
    ...defaults,
    ...baseConfig
  } as GDPREntityTemplateProps<T>;
}

/**
 * Valida configurazione template
 */
export function validateTemplateConfig<T extends BaseEntity>(
  config: GDPREntityTemplateProps<T>
): string[] {
  const errors: string[] = [];
  
  // Validazione campi obbligatori
  if (!config.entityName) {
    errors.push('entityName è obbligatorio');
  }
  
  if (!config.entityDisplayName) {
    errors.push('entityDisplayName è obbligatorio');
  }
  
  if (!config.entityDisplayNamePlural) {
    errors.push('entityDisplayNamePlural è obbligatorio');
  }
  
  if (!config.apiEndpoint) {
    errors.push('apiEndpoint è obbligatorio');
  }
  
  if (!config.fields || config.fields.length === 0) {
    errors.push('Almeno un campo è obbligatorio');
  }
  
  // Validazione campi
  config.fields?.forEach((field, index) => {
    if (!field.key) {
      errors.push(`Campo ${index}: key è obbligatorio`);
    }
    
    if (!field.label) {
      errors.push(`Campo ${index}: label è obbligatorio`);
    }
  });
  
  // Validazione permessi
  if (config.permissions) {
    if (!config.permissions.read || config.permissions.read.length === 0) {
      errors.push('Permessi di lettura obbligatori');
    }
  }
  
  return errors;
}

// ============================================================================
// UTILITY DI SUPPORTO
// ============================================================================

/**
 * Merge configurazioni con priorità
 */
export function mergeConfigs<T>(
  defaultConfig: T,
  userConfig: Partial<T>,
  overrides: Partial<T> = {}
): T {
  return {
    ...defaultConfig,
    ...userConfig,
    ...overrides
  };
}

/**
 * Ottiene configurazione da localStorage
 */
export function getStoredConfig<T>(
  key: string,
  defaultConfig: T
): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return mergeConfigs(defaultConfig, parsed);
    }
  } catch (error) {
    console.warn(`Errore nel caricamento configurazione ${key}:`, error);
  }
  
  return defaultConfig;
}

/**
 * Salva configurazione in localStorage
 */
export function saveStoredConfig<T>(
  key: string,
  config: T
): void {
  try {
    localStorage.setItem(key, JSON.stringify(config));
  } catch (error) {
    console.warn(`Errore nel salvataggio configurazione ${key}:`, error);
  }
}

/**
 * Genera chiave di storage univoca
 */
export function generateStorageKey(
  entityName: string,
  configType: string,
  userId?: string
): string {
  const parts = ['gdpr', entityName, configType];
  if (userId) {
    parts.push(userId);
  }
  return parts.join('-');
}

// ============================================================================
// PRESET CONFIGURAZIONI
// ============================================================================

/**
 * Preset per entità Person
 */
export const PERSON_TEMPLATE_PRESET: Partial<GDPREntityTemplateProps> = {
  entityName: 'person',
  entityDisplayName: 'Persona',
  entityDisplayNamePlural: 'Persone',
  apiEndpoint: '/api/persons',
  defaultSortField: 'lastName',
  enableImport: true,
  gdprConfig: {
    enableAuditLog: true,
    enableConsentTracking: true,
    dataRetentionDays: 2555,
    anonymizeOnDelete: true
  }
};

/**
 * Preset per entità Company
 */
export const COMPANY_TEMPLATE_PRESET: Partial<GDPREntityTemplateProps> = {
  entityName: 'company',
  entityDisplayName: 'Azienda',
  entityDisplayNamePlural: 'Aziende',
  apiEndpoint: '/api/v1/companies',
  defaultSortField: 'name',
  enableImport: false,
  gdprConfig: {
    enableAuditLog: true,
    enableConsentTracking: false,
    dataRetentionDays: 3650,
    anonymizeOnDelete: false
  }
};

/**
 * Preset per entità Course
 */
export const COURSE_TEMPLATE_PRESET: Partial<GDPREntityTemplateProps> = {
  entityName: 'course',
  entityDisplayName: 'Corso',
  entityDisplayNamePlural: 'Corsi',
  apiEndpoint: '/api/courses',
  defaultSortField: 'startDate',
  enableImport: false,
  gdprConfig: {
    enableAuditLog: false,
    enableConsentTracking: false,
    dataRetentionDays: 1825,
    anonymizeOnDelete: false
  }
};