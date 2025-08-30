/**
 * Entity Types - Tipi per entità generiche
 * 
 * Definisce i tipi base per le entità gestite dal template GDPR.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

/**
 * Entità base con campi comuni
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
}

/**
 * Configurazione colonna entità
 */
export interface EntityColumn<T = unknown> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  required?: boolean;
  sensitive?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, entity: T) => React.ReactNode;
  className?: string;
}

/**
 * Configurazione filtro entità
 */
export interface EntityFilter<T = unknown> {
  key: keyof T | string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean' | 'multiselect';
  options?: Array<{ value: unknown; label: string }>;
  placeholder?: string;
  defaultValue?: unknown;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
}

/**
 * Configurazione azione entità
 */
export interface EntityAction<T = unknown> {
  key: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  requiresConfirm?: boolean;
  confirmMessage?: string;
  requiresPermission?: string[];
  requiresConsent?: boolean;
  disabled?: (entity: T) => boolean;
  visible?: (entity: T) => boolean;
  onClick: (entity: T) => void | Promise<void>;
}

/**
 * Configurazione permessi entità
 */
export interface EntityPermissions {
  create: string[];
  read: string[];
  update: string[];
  delete: string[];
  export: string[];
  import: string[];
  viewSensitive?: string[];
  bulkOperations?: string[];
}

/**
 * Configurazione UI entità
 */
export interface EntityUIConfig {
  hasViewModeToggle: boolean;
  hasImportExport: boolean;
  hasBatchOperations: boolean;
  hasAdvancedFilters: boolean;
  hasColumnSelector: boolean;
  hasSearch: boolean;
  defaultViewMode: 'table' | 'grid';
  pageSize: number;
  enablePagination: boolean;
  enableSorting: boolean;
  enableFiltering: boolean;
  enableSelection: boolean;
  compactMode?: boolean;
  stickyHeader?: boolean;
}

/**
 * Configurazione API endpoints
 */
export interface EntityAPIConfig {
  baseUrl: string;
  endpoints: {
    list: string;
    create: string;
    update: string;
    delete: string;
    export?: string;
    import?: string;
    bulkDelete?: string;
    bulkUpdate?: string;
  };
  headers?: Record<string, string>;
  timeout?: number;
  defaultOptions?: Record<string, unknown>;
}

/**
 * Stato di caricamento entità
 */
export interface EntityLoadingState {
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  exporting: boolean;
  importing: boolean;
  error: string | null;
  success: string | null;
}

/**
 * Stato filtri entità
 */
export interface EntityFiltersState {
  searchTerm: string;
  activeFilters: Record<string, unknown>;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
}

/**
 * Stato selezione entità
 */
export interface EntitySelectionState {
  selectedIds: string[];
  selectAll: boolean;
  selectionMode: boolean;
}

/**
 * Configurazione vista entità
 */
export interface EntityViewConfig {
  viewMode: 'table' | 'grid';
  hiddenColumns: string[];
  columnOrder: Record<string, number>;
  columnWidths: Record<string, string>;
}

/**
 * Risultato operazione entità
 */
export interface EntityOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  message?: string;
  affectedCount?: number;
  operation?: string;
}

/**
 * Parametri ricerca entità
 */
export interface EntitySearchParams {
  search?: string;
  filters?: Record<string, unknown>;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  include?: string[];
  exclude?: string[];
}

/**
 * Risposta lista entità
 */
export interface EntityListResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Metadati entità
 */
export interface EntityMetadata {
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  lastUpdated: Date;
  version: string;
}

/**
 * Configurazione validazione entità
 */
export interface EntityValidationConfig {
  required: string[];
  unique: string[];
  patterns: Record<string, RegExp>;
  customValidators: Record<string, (value: unknown) => boolean | string>;
  rules?: Record<string, unknown>;
  strictMode?: boolean;
}

/**
 * Configurazione export entità
 */
export interface EntityExportConfig {
  formats: Array<'csv' | 'xlsx' | 'pdf' | 'json'>;
  includeHeaders: boolean;
  includeMetadata: boolean;
  dateFormat: string;
  filename?: string;
  columns?: string[];
}

/**
 * Configurazione import entità
 */
export interface EntityImportConfig {
  supportedFormats: Array<'csv' | 'xlsx' | 'json'>;
  requiredColumns: string[];
  optionalColumns: string[];
  validateOnImport: boolean;
  batchSize: number;
  skipDuplicates: boolean;
  updateExisting: boolean;
}