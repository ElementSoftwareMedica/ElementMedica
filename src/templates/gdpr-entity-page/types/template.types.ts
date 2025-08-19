/**
 * Template Types - Tipi per configurazione template
 * 
 * Definisce i tipi per la configurazione del template di pagina
 * GDPR-compliant.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import { ReactNode } from 'react';
import { BaseEntity, EntityColumn, EntityFilter, EntityAction } from './entity.types';
import { GDPRConfig } from './gdpr.types';

/**
 * Configurazione principale del template
 */
export interface GDPREntityPageConfig<T extends BaseEntity = BaseEntity> {
  /** Configurazione entità */
  entity: EntityTemplateConfig<T>;
  
  /** Configurazione GDPR */
  gdpr: GDPRConfig;
  
  /** Configurazione UI */
  ui: UITemplateConfig;
  
  /** Configurazione API */
  api: APITemplateConfig;
  
  /** Configurazione permessi */
  permissions: PermissionsTemplateConfig;
  
  /** Configurazione avanzata */
  advanced?: AdvancedTemplateConfig;
}

/**
 * Configurazione entità del template
 */
export interface EntityTemplateConfig<T extends BaseEntity = BaseEntity> {
  /** Nome dell'entità (singolare) */
  name: string;
  
  /** Nome dell'entità (plurale) */
  namePlural: string;
  
  /** Descrizione dell'entità */
  description?: string;
  
  /** Icona dell'entità */
  icon?: string;
  
  /** Colonne della tabella */
  columns: EntityColumn<T>[];
  
  /** Filtri disponibili */
  filters: EntityFilter<T>[];
  
  /** Azioni disponibili */
  actions: EntityAction<T>[];
  
  /** Configurazione validazione */
  validation?: EntityValidationTemplateConfig<T>;
  
  /** Configurazione export/import */
  dataExchange?: EntityDataExchangeConfig;
}

/**
 * Configurazione UI del template
 */
export interface UITemplateConfig {
  /** Configurazione header */
  header: HeaderTemplateConfig;
  
  /** Configurazione toolbar */
  toolbar: ToolbarTemplateConfig;
  
  /** Configurazione tabella */
  table: TableTemplateConfig;
  
  /** Configurazione modali */
  modals: ModalsTemplateConfig;
  
  /** Configurazione layout */
  layout: LayoutTemplateConfig;
  
  /** Configurazione temi */
  theme?: ThemeTemplateConfig;
}

/**
 * Configurazione header della pagina
 */
export interface HeaderTemplateConfig {
  /** Titolo della pagina */
  title: string;
  
  /** Sottotitolo della pagina */
  subtitle?: string;
  
  /** Breadcrumb personalizzato */
  breadcrumb?: BreadcrumbItem[];
  
  /** Mostra contatore entità */
  showEntityCount: boolean;
  
  /** Mostra indicatori GDPR */
  showGDPRIndicators: boolean;
  
  /** Azioni header personalizzate */
  customActions?: HeaderAction[];
}

/**
 * Item breadcrumb
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
  isActive?: boolean;
}

/**
 * Azione header personalizzata
 */
export interface HeaderAction {
  id: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
  requiresPermission?: string;
}

/**
 * Configurazione toolbar
 */
export interface ToolbarTemplateConfig {
  /** Mostra barra di ricerca */
  showSearch: boolean;
  
  /** Placeholder ricerca personalizzato */
  searchPlaceholder?: string;
  
  /** Mostra filtri */
  showFilters: boolean;
  
  /** Mostra ordinamento */
  showSorting: boolean;
  
  /** Mostra selezione multipla */
  showBulkSelection: boolean;
  
  /** Mostra azioni bulk */
  showBulkActions: boolean;
  
  /** Mostra paginazione */
  showPagination: boolean;
  
  /** Mostra controlli densità */
  showDensityControls: boolean;
  
  /** Mostra controlli colonne */
  showColumnControls: boolean;
  
  /** Azioni toolbar personalizzate */
  customActions?: ToolbarAction[];
}

/**
 * Azione toolbar personalizzata
 */
export interface ToolbarAction {
  id: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  position: 'left' | 'right';
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
  requiresPermission?: string;
  requiresSelection?: boolean;
}

/**
 * Configurazione tabella
 */
export interface TableTemplateConfig {
  /** Dimensione di default */
  defaultPageSize: number;
  
  /** Opzioni dimensione pagina */
  pageSizeOptions: number[];
  
  /** Abilita ordinamento */
  enableSorting: boolean;
  
  /** Abilita ridimensionamento colonne */
  enableColumnResizing: boolean;
  
  /** Abilita riordinamento colonne */
  enableColumnReordering: boolean;
  
  /** Abilita raggruppamento */
  enableGrouping: boolean;
  
  /** Abilita filtri colonna */
  enableColumnFilters: boolean;
  
  /** Mostra numeri riga */
  showRowNumbers: boolean;
  
  /** Mostra checkbox selezione */
  showSelectionCheckboxes: boolean;
  
  /** Mostra menu azioni riga */
  showRowActions: boolean;
  
  /** Densità di default */
  defaultDensity: 'compact' | 'standard' | 'comfortable';
  
  /** Configurazione virtualizzazione */
  virtualization?: {
    enabled: boolean;
    rowHeight: number;
    overscan: number;
  };
}

/**
 * Configurazione modali
 */
export interface ModalsTemplateConfig {
  /** Configurazione modale creazione */
  create: ModalTemplateConfig;
  
  /** Configurazione modale modifica */
  edit: ModalTemplateConfig;
  
  /** Configurazione modale visualizzazione */
  view: ModalTemplateConfig;
  
  /** Configurazione modale cancellazione */
  delete: ModalTemplateConfig;
  
  /** Configurazione modale consenso GDPR */
  gdprConsent: ModalTemplateConfig;
  
  /** Configurazione modale audit */
  gdprAudit: ModalTemplateConfig;
}

/**
 * Configurazione singola modale
 */
export interface ModalTemplateConfig {
  /** Dimensione modale */
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /** Chiusura con ESC */
  closeOnEscape: boolean;
  
  /** Chiusura cliccando overlay */
  closeOnOverlayClick: boolean;
  
  /** Mostra header */
  showHeader: boolean;
  
  /** Mostra footer */
  showFooter: boolean;
  
  /** Titolo personalizzato */
  customTitle?: string;
  
  /** Azioni footer personalizzate */
  customFooterActions?: ModalAction[];
}

/**
 * Azione modale personalizzata
 */
export interface ModalAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Configurazione layout
 */
export interface LayoutTemplateConfig {
  /** Tipo layout */
  type: 'standard' | 'compact' | 'wide' | 'full';
  
  /** Padding container */
  containerPadding: string;
  
  /** Gap tra sezioni */
  sectionGap: string;
  
  /** Mostra sidebar */
  showSidebar: boolean;
  
  /** Configurazione sidebar */
  sidebar?: SidebarTemplateConfig;
  
  /** Configurazione responsive */
  responsive: ResponsiveTemplateConfig;
}

/**
 * Configurazione sidebar
 */
export interface SidebarTemplateConfig {
  /** Posizione sidebar */
  position: 'left' | 'right';
  
  /** Larghezza sidebar */
  width: string;
  
  /** Collassabile */
  collapsible: boolean;
  
  /** Collassata di default */
  defaultCollapsed: boolean;
  
  /** Contenuto sidebar */
  content: ReactNode;
}

/**
 * Configurazione responsive
 */
export interface ResponsiveTemplateConfig {
  /** Breakpoint mobile */
  mobileBreakpoint: string;
  
  /** Breakpoint tablet */
  tabletBreakpoint: string;
  
  /** Breakpoint desktop */
  desktopBreakpoint: string;
  
  /** Comportamento mobile */
  mobileBehavior: {
    hideColumns?: string[];
    stackLayout?: boolean;
    collapseSidebar?: boolean;
    simplifyToolbar?: boolean;
  };
}

/**
 * Configurazione tema
 */
export interface ThemeTemplateConfig {
  /** Tema di default */
  defaultTheme: 'light' | 'dark' | 'auto';
  
  /** Colori personalizzati */
  customColors?: Record<string, string>;
  
  /** Font personalizzati */
  customFonts?: Record<string, string>;
  
  /** Spacing personalizzato */
  customSpacing?: Record<string, string>;
}

/**
 * Configurazione API del template
 */
export interface APITemplateConfig {
  /** Endpoint base */
  baseEndpoint: string;
  
  /** Configurazione endpoints */
  endpoints: {
    list: string;
    create: string;
    read: string;
    update: string;
    delete: string;
    bulkDelete?: string;
    bulkUpdate?: string;
    export?: string;
    import?: string;
    search?: string;
  };
  
  /** Configurazione cache */
  cache?: {
    enabled: boolean;
    ttl: number;
    invalidateOn: string[];
  };
  
  /** Configurazione retry */
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    backoffMs: number;
  };
}

/**
 * Configurazione permessi del template
 */
export interface PermissionsTemplateConfig {
  /** Permessi richiesti per operazioni */
  required: {
    view: string[];
    create: string[];
    edit: string[];
    delete: string[];
    export: string[];
    import: string[];
    bulkOperations: string[];
    gdprOperations: string[];
  };
  
  /** Permessi opzionali */
  optional?: {
    advancedFilters?: string[];
    auditLog?: string[];
    systemSettings?: string[];
  };
  
  /** Configurazione ruoli */
  roles?: {
    admin: string[];
    editor: string[];
    viewer: string[];
    gdprOfficer: string[];
  };
}

/**
 * Configurazione validazione entità
 */
export interface EntityValidationTemplateConfig<T extends BaseEntity = BaseEntity> {
  /** Regole validazione per campo */
  fieldRules: Record<keyof T, ValidationRule[]>;
  
  /** Validazione personalizzata */
  customValidation?: (entity: Partial<T>) => ValidationResult;
  
  /** Validazione asincrona */
  asyncValidation?: (entity: Partial<T>) => Promise<ValidationResult>;
  
  /** Validazione GDPR */
  gdprValidation?: {
    checkConsent: boolean;
    validateSensitiveData: boolean;
    checkRetention: boolean;
  };
}

/**
 * Regola di validazione
 */
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: unknown;
  message: string;
  validator?: (value: unknown) => boolean;
}

/**
 * Risultato validazione
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

/**
 * Configurazione scambio dati
 */
export interface EntityDataExchangeConfig {
  /** Configurazione export */
  export: {
    enabled: boolean;
    formats: Array<'csv' | 'xlsx' | 'json' | 'xml' | 'pdf'>;
    includeHeaders: boolean;
    includeMetadata: boolean;
    customFields?: string[];
    gdprCompliant: boolean;
  };
  
  /** Configurazione import */
  import: {
    enabled: boolean;
    formats: Array<'csv' | 'xlsx' | 'json' | 'xml'>;
    validateOnImport: boolean;
    allowPartialImport: boolean;
    duplicateHandling: 'skip' | 'update' | 'error';
    gdprValidation: boolean;
  };
}

/**
 * Configurazione avanzata del template
 */
export interface AdvancedTemplateConfig {
  /** Configurazione performance */
  performance?: {
    enableVirtualization: boolean;
    lazyLoading: boolean;
    debounceMs: number;
    cacheSize: number;
  };
  
  /** Configurazione analytics */
  analytics?: {
    enabled: boolean;
    trackUserActions: boolean;
    trackPerformance: boolean;
    customEvents?: string[];
  };
  
  /** Configurazione debug */
  debug?: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    showDevTools: boolean;
  };
  
  /** Configurazione sperimentale */
  experimental?: {
    features: string[];
    flags: Record<string, boolean>;
  };
}

/**
 * Contesto del template
 */
export interface GDPREntityPageContext<T extends BaseEntity = BaseEntity> {
  config: GDPREntityPageConfig<T>;
  state: TemplateState<T>;
  actions: TemplateActions<T>;
  gdpr: GDPRTemplateContext;
}

/**
 * Stato del template
 */
export interface TemplateState<T extends BaseEntity = BaseEntity> {
  entities: T[];
  loading: boolean;
  error: string | null;
  selectedEntities: T[];
  filters: Record<string, unknown>;
  sorting: { field: keyof T; direction: 'asc' | 'desc' } | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  ui: {
    density: 'compact' | 'standard' | 'comfortable';
    sidebarCollapsed: boolean;
    activeModal: string | null;
  };
}

/**
 * Azioni del template
 */
export interface TemplateActions<T extends BaseEntity = BaseEntity> {
  // Azioni entità
  loadEntities: () => Promise<void>;
  createEntity: (entity: Omit<T, 'id'>) => Promise<T>;
  updateEntity: (id: string, entity: Partial<T>) => Promise<T>;
  deleteEntity: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  
  // Azioni UI
  setFilters: (filters: Record<string, unknown>) => void;
  setSorting: (field: keyof T, direction: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSelectedEntities: (entities: T[]) => void;
  
  // Azioni modali
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;
  
  // Azioni GDPR
  requestConsent: (consentTypes: string[]) => Promise<void>;
  revokeConsent: (consentTypes: string[]) => Promise<void>;
  exportData: (format: string) => Promise<void>;
  requestDeletion: (reason: string) => Promise<void>;
}

/**
 * Contesto GDPR del template
 */
export interface GDPRTemplateContext {
  consents: Record<string, boolean>;
  auditLog: Record<string, unknown>[];
  dataRetention: {
    daysRemaining: number;
    nextCleanup: Date;
  };
  compliance: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
}