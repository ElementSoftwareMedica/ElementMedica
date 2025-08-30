import { ReactNode } from 'react';

// ============================================================================
// TIPI BASE
// ============================================================================

export interface BaseEntity {
  id: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date;
}

export interface EntityField {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'phone' | 'date' | 'boolean' | 'number' | 'select' | 'textarea';
  formatter?: (value: unknown, entity: BaseEntity) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface EntityAction {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  onClick: (entity: BaseEntity) => void | Promise<void>;
  visible?: (entity: BaseEntity) => boolean;
  disabled?: (entity: BaseEntity) => boolean;
  requiresPermission?: string[];
}

// ============================================================================
// CONFIGURAZIONE TEMPLATE GDPR
// ============================================================================

export interface GDPREntityTemplateProps<T extends BaseEntity = BaseEntity> {
  // Configurazione base
  entityName: string;
  entityDisplayName: string;
  entityDisplayNamePlural: string;
  apiEndpoint: string;
  
  // Configurazione campi
  fields: EntityField[];
  additionalFields?: EntityField[];
  
  // Configurazione azioni
  actions?: EntityAction[];
  bulkActions?: EntityAction[];
  
  // Configurazione UI
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableExport?: boolean;
  enableImport?: boolean;
  enableBulkEdit?: boolean;
  enableColumnSelector?: boolean;
  enableViewModeToggle?: boolean;
  
  // Configurazione vista
  defaultViewMode?: 'table' | 'grid';
  defaultPageSize?: number;
  defaultSortField?: string;
  defaultSortDirection?: 'asc' | 'desc';
  
  // Configurazione permessi
  permissions?: {
    read: string[];
    create: string[];
    update: string[];
    delete: string[];
    export?: string[];
    import?: string[];
  };
  
  // Configurazione GDPR
  gdprConfig?: {
    enableAuditLog?: boolean;
    enableConsentTracking?: boolean;
    dataRetentionDays?: number;
    anonymizeOnDelete?: boolean;
  };
  
  // Callback personalizzati
  onEntitySelect?: (entity: T) => void;
  onEntityCreate?: () => void;
  onEntityEdit?: (entity: T) => void;
  onEntityDelete?: (id: string) => Promise<void>;
  onEntityExport?: (entities: T[]) => void;
  onDataLoad?: (data: T[]) => void;
  
  // Configurazione avanzata
  customFilters?: FilterConfig[];
  customColumns?: ColumnConfig[];
  customToolbarActions?: ReactNode;
  customEmptyState?: ReactNode;
  customLoadingState?: ReactNode;
  customErrorState?: ReactNode;
}

// ============================================================================
// CONFIGURAZIONE FILTRI
// ============================================================================

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'boolean' | 'number' | 'dateRange';
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: unknown;
  validation?: (value: unknown) => string | null;
  dependencies?: string[]; // Altri filtri da cui dipende
}

export interface FilterState {
  [key: string]: unknown;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// CONFIGURAZIONE COLONNE
// ============================================================================

export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  visible?: boolean;
  order?: number;
  formatter?: (value: unknown, row: BaseEntity) => ReactNode;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
}

export interface ColumnState {
  visible: boolean;
  width?: number;
  order: number;
}

// ============================================================================
// CONFIGURAZIONE PERMESSI
// ============================================================================

export interface PermissionConfig {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface EntityPermissions {
  read: string[];
  create: string[];
  update: string[];
  delete: string[];
  export?: string[];
  import?: string[];
}

export interface GDPRPermissions extends EntityPermissions {
  viewAuditLog?: string[];
  manageConsents?: string[];
  anonymizeData?: string[];
  exportPersonalData?: string[];
}

// ============================================================================
// CONFIGURAZIONE OPERAZIONI
// ============================================================================

export interface EntityOperationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  operation: string;
  timestamp?: Date;
}

export interface BatchOperationResult<T> {
  success: boolean;
  processed: number;
  failed: number;
  results: EntityOperationResult<T>[];
  errors: string[];
}

export interface EntityAPIConfig {
  endpoints: {
    list: string;
    create: string;
    read: string;
    update: string;
    delete: string;
    export?: string;
    import?: string;
  };
  defaultOptions?: RequestInit;
  pagination?: {
    enabled: boolean;
    defaultPageSize: number;
    maxPageSize: number;
  };
}

// ============================================================================
// CONFIGURAZIONE GDPR
// ============================================================================

export interface GDPRConfig {
  consent?: {
    required: boolean;
    types: GDPRConsentType[];
    retentionDays: number;
  };
  audit?: {
    enabled: boolean;
    logLevel: 'basic' | 'detailed' | 'full';
    retentionDays: number;
  };
  anonymization?: {
    enabled: boolean;
    fields: string[];
    method: 'hash' | 'random' | 'remove';
  };
  dataRetention?: {
    enabled: boolean;
    defaultDays: number;
    policies: Record<string, number>;
  };
}

export type GDPRConsentType = 
  | 'data_processing'
  | 'marketing'
  | 'analytics'
  | 'cookies'
  | 'third_party_sharing'
  | 'automated_decision_making';

export interface ConsentRecord {
  id: string;
  personId: string;
  consentType: GDPRConsentType;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  purpose: string;
  legalBasis: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId?: string;
  operation: string;
  userId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ============================================================================
// CONFIGURAZIONE UI
// ============================================================================

export interface ViewModeConfig {
  mode: 'table' | 'grid';
  storageKey?: string;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  pageSizeOptions?: number[];
}

export interface SearchConfig {
  placeholder?: string;
  debounceMs?: number;
  minLength?: number;
  searchFields?: string[];
}

export interface ExportConfig {
  formats: ('csv' | 'xlsx' | 'json' | 'pdf')[];
  filename?: string;
  includeHeaders?: boolean;
  selectedOnly?: boolean;
}

export interface ImportConfig {
  formats: ('csv' | 'xlsx' | 'json')[];
  maxFileSize?: number;
  validateHeaders?: boolean;
  allowPartialImport?: boolean;
  duplicateHandling?: 'skip' | 'update' | 'error';
}

// ============================================================================
// STATI DELL'APPLICAZIONE
// ============================================================================

export interface LoadingState {
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  exporting: boolean;
  importing: boolean;
}

export interface ErrorState {
  error: string | null;
  fieldErrors: Record<string, string>;
  validationErrors: string[];
}

export interface SelectionState {
  selectedIds: string[];
  selectAll: boolean;
  selectionMode: boolean;
}

// ============================================================================
// EVENTI E CALLBACK
// ============================================================================

export interface EntityEventHandlers<T> {
  onSelect?: (entity: T) => void;
  onCreate?: () => void;
  onEdit?: (entity: T) => void;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onExport?: (entities: T[]) => void;
  onImport?: (file: File) => Promise<void>;
  onRefresh?: () => void;
  onError?: (error: Error) => void;
}

export interface FilterEventHandlers {
  onSearchChange?: (term: string) => void;
  onFilterChange?: (key: string, value: unknown) => void;
  onSortChange?: (config: SortConfig) => void;
  onFiltersReset?: () => void;
}

export interface ColumnEventHandlers {
  onColumnResize?: (key: string, width: number) => void;
  onColumnReorder?: (newOrder: string[]) => void;
  onColumnVisibilityChange?: (key: string, visible: boolean) => void;
  onColumnsReset?: () => void;
}