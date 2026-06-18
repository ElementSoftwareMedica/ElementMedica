import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGDPRPermissions } from '../../hooks/useGDPRPermissions';
import { useGDPREntityData } from './hooks/useGDPREntityData';
import { useGDPREntityOperations } from '../../hooks/useGDPREntityOperations';

/** Definizione di una colonna per GDPREntityTemplate / ResizableTable */
export interface DataTableColumn<T = unknown> {
  key: string;
  label: string;
  header?: string;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  sortKey?: string;
  renderHeader?: (col: DataTableColumn<T>) => React.ReactNode;
  renderCell?: (row: T, rowIndex: number) => React.ReactNode;
  filterable?: boolean;
  filterType?: 'string' | 'number' | 'date' | 'boolean' | 'select';
  filterOptions?: { value: string; label: string }[];
}
import { Badge } from '../../design-system';
import {
  AlertCircle,
  Download,
  Edit,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  Upload,
  XCircle
} from 'lucide-react';
import { FilterPanel } from '../../design-system/organisms/FilterPanel';
import { AddEntityDropdown, ColumnSelector, BatchEditButton, ActionButton } from '../../components/ui';
import { ListPaginationFooter } from '../../components/ui/ListPaginationFooter';
import { exportToCsv } from '../../utils/csvExport';
import { useToast } from '../../hooks/useToast';

/**
 * Template GDPR-compliant unificato per la gestione di entità
 * Integra tutti i pattern e componenti delle pagine companies e courses
 * Supporta permessi avanzati, visualizzazione tabella/griglia, operazioni batch
 */

export interface GDPREntityTemplateProps<T extends Record<string, any> & { id: string }> {
  // Configurazione entità
  entityName: string;
  entityNamePlural: string;
  entityDisplayName: string;
  entityDisplayNamePlural: string;

  // Permessi
  readPermission: string;
  writePermission: string;
  deletePermission: string;
  exportPermission?: string;

  // API endpoints
  apiEndpoint: string;
  entityBasePath?: string;

  // Configurazione colonne
  columns: DataTableColumn<T>[];

  // Configurazione UI
  searchFields: (keyof T)[];
  filterOptions?: Array<{
    key: string;
    label: string;
    options: Array<{ label: string; value: string }>;
  }>;
  sortOptions?: Array<{ key: string; label: string }>;

  // Parametri di query statici per filtrare lato backend (es. roleType)
  staticQueryParams?: Record<string, string | number | boolean>;

  // Configurazione CSV
  csvHeaders: Array<{ key: string; label: string }> | Record<string, string>;
  csvTemplateData?: Record<string, any>[];

  // Handlers personalizzati
  onCreateEntity?: () => void;
  onEditEntity?: (entity: T) => void;
  onViewEntity?: (entity: T) => void;
  onDeleteEntity?: (id: string) => Promise<void>;
  onImportEntities?: (data: any[]) => Promise<void>;
  onExportEntities?: (entities: T[]) => void;

  // Configurazione card per vista griglia
  cardConfig?: {
    titleField: keyof T;
    subtitleField?: keyof T;
    badgeField?: keyof T;
    descriptionField?: keyof T;
    iconField?: keyof T;
    additionalFields?: Array<{
      key: keyof T;
      label: string;
      icon?: React.ReactNode;
      formatter?: (value: any) => string;
    }>;
    // Funzioni per configurazione dinamica (compatibilità con Companies/Courses)
    title?: (entity: T) => string;
    subtitle?: (entity: T) => string;
    badge?: (entity: T) => { text: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' };
    icon?: (entity: T) => React.ReactNode;
    fields?: Array<{
      label: string;
      value: (entity: T) => string;
      icon?: React.ReactNode;
    }>;
    description?: (entity: T) => string | undefined;
  };

  // Configurazione avanzata
  enableBatchOperations?: boolean;
  enableImportExport?: boolean;
  enableColumnSelector?: boolean;
  enableAdvancedFilters?: boolean;
  defaultViewMode?: 'table' | 'grid';

  // Sort di default
  defaultSort?: { field: string; direction: 'asc' | 'desc' };

  /**
   * P51: Trigger per forzare il refresh della lista
   * Quando questo valore cambia, la lista viene ricaricata automaticamente
   * Utile per refreshare dopo operazioni custom come import da modal esterni
   */
  refreshTrigger?: number | string;

  /** Icona da mostrare nell'header della pagina */
  icon?: React.ReactNode;

  /** Sottotitolo opzionale per l'header (default: 'Gestisci {entityDisplayNamePlural}') */
  pageSubtitle?: string;

  /**
   * Tema colore del brand:
   * - 'blue' → ElementSicurezza (default)
   * - 'teal' → ElementMedica / Clinica
   * - 'violet' → Management
   */
  theme?: 'blue' | 'teal' | 'violet';

  /**
   * Azioni batch aggiuntive da mostrare nel BatchEditButton insieme a
   * "Elimina selezionati" e "Esporta selezionati".
   * Il callback riceve l'array degli ID selezionati (o tutti gli ID se nessuno
   * è esplicitamente selezionato).
   */
  customBulkActions?: Array<{
    key: string;
    label: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'danger' | 'warning' | 'success';
    /** Invocato con gli ID correntemente selezionati */
    onClick: (selectedIds: string[]) => void;
  }>;
}

export function GDPREntityTemplate<T extends Record<string, any> & { id: string }>({
  entityName,
  entityNamePlural,
  entityDisplayName,
  entityDisplayNamePlural,
  readPermission,
  writePermission,
  deletePermission,
  exportPermission,
  apiEndpoint,
  entityBasePath,
  columns,
  searchFields,
  filterOptions = [],
  sortOptions = [],
  staticQueryParams,
  csvHeaders,
  csvTemplateData,
  onCreateEntity,
  onEditEntity,
  onViewEntity,
  onDeleteEntity,
  onImportEntities,
  onExportEntities,
  cardConfig,
  enableBatchOperations = true,
  enableImportExport = true,
  enableColumnSelector = true,
  enableAdvancedFilters = true,
  defaultViewMode = 'table',
  defaultSort,
  refreshTrigger,
  icon,
  pageSubtitle,
  theme = 'blue',
  customBulkActions = [],
}: GDPREntityTemplateProps<T>): JSX.Element {
  const navigate = useNavigate();
  const basePath = entityBasePath || `/${entityNamePlural}`;
  const { isLoading: authLoading, permissions: authPermissions } = useAuth();

  // Controlla se i permessi sono ancora in fase di caricamento
  const permissionsLoading = authLoading || Object.keys(authPermissions).length === 0;

  // Hook ottimizzati per GDPR
  const permissions = useGDPRPermissions({
    entityName,
    entityNamePlural,
    readPermission,
    writePermission,
    deletePermission,
    exportPermission
  });

  const { entities, loading, error, refetch, setEntities } = useGDPREntityData<T>({
    apiEndpoint,
    entityNamePlural,
    entityDisplayNamePlural,
    staticQueryParams
  });

  const operations = useGDPREntityOperations({
    entityName,
    entityNamePlural,
    entityDisplayName,
    entityDisplayNamePlural,
    onDeleteEntity,
    refetch
  });

  const toast = useToast();

  // Theme-aware classes per il brand corrente
  const themeClasses = {
    blue: {
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      accent: 'bg-blue-600',
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      emptyIcon: 'text-blue-200 dark:text-blue-800',
      emptyAccent: 'text-blue-600 dark:text-blue-400',
      filterActive: 'bg-blue-600 text-white',
    },
    teal: {
      iconBg: 'bg-teal-50 dark:bg-teal-900/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
      accent: 'bg-teal-600',
      badge: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
      emptyIcon: 'text-teal-200 dark:text-teal-800',
      emptyAccent: 'text-teal-600 dark:text-teal-400',
      filterActive: 'bg-teal-600 text-white',
    },
    violet: {
      iconBg: 'bg-violet-50 dark:bg-violet-900/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
      accent: 'bg-violet-600',
      badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
      emptyIcon: 'text-violet-200 dark:text-violet-800',
      emptyAccent: 'text-violet-600 dark:text-violet-400',
      filterActive: 'bg-violet-600 text-white',
    },
  };
  const tc = themeClasses[theme];
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Stati per ricerca e filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [activeSort, setActiveSort] = useState<{ field: string, direction: 'asc' | 'desc' } | undefined>(defaultSort);

  // Paginazione client-side
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Stati per visualizzazione
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    return (localStorage.getItem(`${entityNamePlural}ViewMode`) as 'table' | 'grid') || defaultViewMode;
  });

  // Stati per gestione colonne
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${entityNamePlural}-hidden-columns`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [columnOrder, setColumnOrder] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`${entityNamePlural}-column-order`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Funzioni di verifica permessi (per compatibilità con il codice esistente)
  const canCreateEntity = () => permissions.canCreate;
  const canUpdateEntity = () => permissions.canUpdate;
  const canDeleteEntity = () => permissions.canDelete;
  const canExportEntity = () => permissions.canExport;

  // Mostra loading mentre l'auth o i permessi si stanno caricando
  if (permissionsLoading) {
    return (
      <div className="h-64 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500">Caricamento permessi...</span>
      </div>
    );
  }

  // Controlla permessi SOLO dopo che l'auth è stato caricato
  if (!permissions.canRead) {
    return (
      <div className="h-64 flex flex-col justify-center items-center text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Accesso negato</h1>
        <p className="text-gray-600 mb-6">
          Non hai i permessi necessari per accedere a questa sezione.
        </p>
        <p className="text-sm text-gray-500">
          Risorsa richiesta: {readPermission}
        </p>
      </div>
    );
  }

  // Salvataggio preferenze visualizzazione
  useEffect(() => {
    localStorage.setItem(`${entityNamePlural}ViewMode`, viewMode);
  }, [viewMode, entityNamePlural]);

  // Gestione visibilità colonne
  const handleColumnVisibilityChange = (newHiddenColumns: string[]) => {
    setHiddenColumns(newHiddenColumns);
    localStorage.setItem(`${entityNamePlural}-hidden-columns`, JSON.stringify(newHiddenColumns));
  };

  const handleColumnOrderChange = (newColumnOrder: Record<string, number>) => {
    setColumnOrder(newColumnOrder);
    localStorage.setItem(`${entityNamePlural}-column-order`, JSON.stringify(newColumnOrder));
  };

  // Le funzioni di gestione selezione ed eliminazione sono ora gestite dagli hook ottimizzati
  const {
    selectedIds,
    selectAll,
    selectionMode,
    setSelectionMode,
    handleSelectAll,
    handleSelectEntity: handleSelect,
    handleDeleteEntity: handleDelete,
    handleBatchDelete: handleDeleteSelected,
    clearSelection
  } = operations;

  // Filtraggio e ricerca
  const filteredEntities = useMemo(() => {
    // Validazione di sicurezza per assicurarsi che entities sia un array
    if (!Array.isArray(entities)) {
      if (import.meta.env.DEV) console.error('GDPREntityTemplate: entities deve essere un array, ricevuto:', typeof entities);
      return [];
    }

    let filtered = entities;

    // Applica filtri attivi
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(entity => {
          const entityValue = entity[key];
          return entityValue === value || String(entityValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    // Applica ricerca
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(entity => {
        return searchFields.some(field => {
          const value = entity[field];
          return value && String(value).toLowerCase().includes(searchLower);
        });
      });
    }

    // Applica ordinamento
    if (activeSort) {
      filtered = [...filtered].sort((a, b) => {
        const valueA = a[activeSort.field];
        const valueB = b[activeSort.field];

        if (valueA == null && valueB == null) return 0;
        if (valueA == null) return activeSort.direction === 'asc' ? -1 : 1;
        if (valueB == null) return activeSort.direction === 'asc' ? 1 : -1;

        const compareValueA = typeof valueA === 'string' ? valueA.toLowerCase() : valueA;
        const compareValueB = typeof valueB === 'string' ? valueB.toLowerCase() : valueB;

        if (compareValueA < compareValueB) return activeSort.direction === 'asc' ? -1 : 1;
        if (compareValueA > compareValueB) return activeSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [entities, activeFilters, searchQuery, searchFields, activeSort]);

  const paginatedEntities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntities.slice(start, start + pageSize);
  }, [filteredEntities, currentPage, pageSize]);

  // Reset alla prima pagina quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters, activeSort]);

  // Sincronizzazione stato selectAll con selezione effettiva
  useEffect(() => {
    if (Array.isArray(filteredEntities) && filteredEntities.length > 0) {
      const allFilteredSelected = filteredEntities.every(entity => selectedIds.includes(entity.id));
      if (allFilteredSelected !== selectAll) {
        // Aggiorna lo stato selectAll solo se necessario per evitare loop infiniti
        operations.setSelectAll(allFilteredSelected);
      }
    } else if (selectAll && filteredEntities.length === 0) {
      // Se non ci sono entità filtrate ma selectAll è true, resettalo
      operations.setSelectAll(false);
    }
  }, [filteredEntities, selectedIds, selectAll, operations]);



  // Memoized action handlers per evitare loop infiniti
  const handleViewEntity = useCallback((entity: T) => (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`${basePath}/${entity.id}`);
  }, [navigate, basePath]);

  const handleEditEntity = useCallback((entity: T) => (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onEditEntity ? onEditEntity(entity) : navigate(`${basePath}/${entity.id}/edit`);
  }, [onEditEntity, navigate, basePath]);

  const handleDeleteEntity = useCallback((entity: T) => (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleDelete(entity.id);
  }, [handleDelete]);

  const handleExportEntity = useCallback((entity: T) => (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onExportEntities) {
      onExportEntities([entity]);
    } else {
      const headers = Array.isArray(csvHeaders) ?
        csvHeaders.reduce((acc, h) => ({ ...acc, [h.key]: h.label }), {}) :
        csvHeaders;
      exportToCsv([entity], headers, `${entityName}_${entity.id}.csv`, ';');
    }
  }, [onExportEntities, csvHeaders, entityName]);

  // Configurazione colonne con selezione
  const tableColumns: DataTableColumn<T>[] = useMemo(() => {
    const cols: DataTableColumn<T>[] = [];

    // 1. Prima colonna: Azioni (sempre presente come prima colonna)
    const hasActionsColumn = columns.some(col => col.key === 'actions');
    if (!hasActionsColumn) {
      cols.push({
        key: 'actions',
        label: 'Azioni',
        sortable: false,
        width: 120,
        renderCell: (entity: T) => (
          <ActionButton
            asPill={true}
            actions={[
              {
                label: 'Visualizza',
                icon: <Eye className="h-4 w-4" />,
                onClick: () => handleViewEntity(entity)(),
                variant: 'default',
              },
              ...(permissions.canWrite ? [{
                label: 'Modifica',
                icon: <Edit className="h-4 w-4" />,
                onClick: () => handleEditEntity(entity)(),
                variant: 'default' as const,
              }] : []),
              ...(permissions.canDelete ? [{
                label: 'Elimina',
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => handleDeleteEntity(entity)(),
                variant: 'danger' as const,
              }] : []),
              ...(enableImportExport && permissions.canExport ? [{
                label: 'Esporta',
                icon: <Download className="h-4 w-4" />,
                onClick: () => handleExportEntity(entity)(),
                variant: 'default' as const,
              }] : [])
            ]}
            className=""
          />
        )
      });
    }

    // 2. Seconda colonna: Selezione (se in modalità selezione)
    if (selectionMode && enableBatchOperations) {
      cols.push({
        key: 'select',
        label: '',
        sortable: false,
        width: 50,
        renderCell: (entity: T) => (
          <div className="flex justify-center" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selectedIds.includes(entity.id)}
              onChange={() => handleSelect(entity.id)}
              className="h-4 w-4 accent-blue-600"
            />
          </div>
        ),
        renderHeader: () => (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={() => {
                // Validazione aggiuntiva per assicurarsi che filteredEntities sia un array
                if (Array.isArray(filteredEntities)) {
                  handleSelectAll(filteredEntities);
                } else {
                  if (import.meta.env.DEV) console.error('GDPREntityTemplate: filteredEntities non è un array:', typeof filteredEntities);
                }
              }}
              className="h-4 w-4 accent-blue-600"
            />
          </div>
        )
      });
    }

    // 3. Aggiungi tutte le altre colonne (esclusa quella azioni se già presente)
    const otherColumns = columns.filter(col => col.key !== 'actions');
    cols.push(...otherColumns);

    return cols;
  }, [columns, selectionMode, enableBatchOperations, selectedIds, selectAll, permissions, handleViewEntity, handleEditEntity, handleDeleteEntity, handleExportEntity, handleSelect, handleSelectAll, filteredEntities]);

  // Opzioni dropdown aggiungi
  const addOptions = useMemo(() => {
    const options = [];

    if (permissions.canWrite) {
      options.push({
        label: `Aggiungi ${entityDisplayName.toLowerCase()}`,
        icon: <Plus className="h-4 w-4" />,
        onClick: onCreateEntity || (() => navigate(`${basePath}/create`))
      });
    }

    if (enableImportExport) {
      options.push(
        {
          label: 'Importa da CSV',
          icon: <Upload className="h-4 w-4" />,
          onClick: async () => {
            if (onImportEntities) {
              // Chiama la funzione onImportEntities fornita dal componente padre
              // P51: Dopo import, il padre deve fare refetch manualmente se necessario
              // Il template non ha modo di sapere quando l'import è completato
              // perché il padre potrebbe aprire un modal
              onImportEntities([]);
            } else {
              // Fallback per import CSV automatico
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const csv = event.target?.result as string;
                      const lines = csv.split('\n');
                      const headers = lines[0].split(';');
                      const data = lines.slice(1).filter(line => line.trim()).map(line => {
                        const values = line.split(';');
                        const obj: any = {};
                        headers.forEach((header, index) => {
                          obj[header.trim()] = values[index]?.trim() || '';
                        });
                        return obj;
                      });
                      toast.showToast({
                        message: `Importati ${data.length} record da CSV`,
                        type: 'success'
                      });
                      // Qui si potrebbe aggiungere la logica per salvare i dati
                    } catch (error) {
                      if (import.meta.env.DEV) console.error('Errore import CSV:', error);
                      toast.showToast({
                        message: 'Errore durante l\'importazione del CSV',
                        type: 'error'
                      });
                    }
                  };
                  reader.readAsText(file);
                }
              };
              input.click();
            }
          }
        },
        {
          label: 'Scarica template CSV',
          icon: <FileText className="h-4 w-4" />,
          onClick: () => {
            if (csvTemplateData) {
              const headers = Array.isArray(csvHeaders) ?
                csvHeaders.reduce((acc, h) => ({ ...acc, [h.key]: h.label }), {}) :
                csvHeaders;
              exportToCsv(csvTemplateData, headers, `template_${entityNamePlural}.csv`, ';');
            } else {
              // Fallback per template CSV generico
              const genericTemplate = [{
                id: 'esempio_id',
                name: 'Esempio Nome',
                email: 'esempio@email.com',
                status: 'ACTIVE'
              }];
              const genericHeaders = {
                id: 'ID',
                name: 'Nome',
                email: 'Email',
                status: 'Stato'
              };
              exportToCsv(genericTemplate, genericHeaders, `template_${entityNamePlural}.csv`, ';');
              toast.showToast({
                message: 'Template CSV generico scaricato',
                type: 'info'
              });
            }
          }
        }
      );
    }

    return options;
  }, [entityDisplayName, entityNamePlural, enableImportExport, onCreateEntity, csvTemplateData, csvHeaders, toast, permissions, navigate, onImportEntities, basePath]);

  // Azioni batch
  const batchActions = useMemo(() => {
    const actions = [];

    if (permissions.canDelete) {
      actions.push({
        label: 'Elimina selezionati',
        icon: <Trash2 className="h-4 w-4" />,
        onClick: handleDeleteSelected,
        variant: 'danger' as const
      });
    }

    if (enableImportExport && permissions.canExport) {
      actions.push({
        label: 'Esporta selezionati',
        icon: <Download className="h-4 w-4" />,
        onClick: () => {
          const selectedEntities = entities.filter(e => selectedIds.includes(e.id));
          if (onExportEntities) {
            onExportEntities(selectedEntities);
          } else {
            const headers = Array.isArray(csvHeaders) ?
              csvHeaders.reduce((acc, h) => ({ ...acc, [h.key]: h.label }), {}) :
              csvHeaders;
            exportToCsv(selectedEntities, headers, `${entityNamePlural}_selezionati.csv`, ';');
          }
        },
        variant: 'default' as const
      });
    }

    // Azioni custom passate dall'esterno (es. "Invia Credenziali")
    for (const ca of customBulkActions) {
      actions.push({
        label: ca.label,
        icon: ca.icon,
        onClick: () => ca.onClick(selectedIds.length > 0 ? selectedIds : entities.map(e => e.id)),
        variant: (ca.variant ?? 'default') as 'default' | 'danger' | 'warning' | 'success'
      });
    }

    // Azione per annullare selezione
    actions.push({
      label: 'Annulla selezione',
      icon: <XCircle className="h-4 w-4" />,
      onClick: () => {
        clearSelection();
      },
      variant: 'default' as const
    });

    return actions;
  }, [permissions, handleDeleteSelected, enableImportExport, entities, selectedIds, onExportEntities, csvHeaders, entityNamePlural, clearSelection, customBulkActions]);

  // Azioni memoizzate per le card della vista griglia
  const getCardActions = useCallback((entity: T) => [
    {
      label: 'Visualizza',
      icon: <Eye className="h-4 w-4" />,
      onClick: (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        navigate(`${basePath}/${entity.id}`);
      },
      variant: 'default' as const,
    },
    ...(permissions.canWrite ? [{
      label: 'Modifica',
      icon: <Edit className="h-4 w-4" />,
      onClick: (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        onEditEntity ? onEditEntity(entity) : navigate(`${basePath}/${entity.id}/edit`);
      },
      variant: 'default' as const,
    }] : []),
    ...(permissions.canDelete ? [{
      label: 'Elimina',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        handleDelete(entity.id);
      },
      variant: 'danger' as const,
    }] : []),
    ...(enableImportExport && permissions.canExport ? [{
      label: 'Esporta',
      icon: <Download className="h-4 w-4" />,
      onClick: (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (onExportEntities) {
          onExportEntities([entity]);
        } else {
          const headers = Array.isArray(csvHeaders) ?
            csvHeaders.reduce((acc, h) => ({ ...acc, [h.key]: h.label }), {}) :
            csvHeaders;
          exportToCsv([entity], headers, `${entityName}_${entity.id}.csv`, ';');
        }
      },
      variant: 'default' as const,
    }] : [])
  ], [basePath, navigate, permissions.canWrite, onEditEntity, permissions.canDelete, handleDelete, enableImportExport, permissions.canExport, onExportEntities, csvHeaders, entityName]);

  // Rendering card per vista griglia
  const renderEntityCard = (entity: T) => {
    if (!cardConfig) return null;

    // Supporta sia configurazione field-based che function-based
    const title = cardConfig.title ? cardConfig.title(entity) : entity[cardConfig.titleField];
    const subtitle = cardConfig.subtitle ? cardConfig.subtitle(entity) :
      (cardConfig.subtitleField ? entity[cardConfig.subtitleField] : undefined);
    const badgeData = cardConfig.badge ? cardConfig.badge(entity) :
      (cardConfig.badgeField ? { text: entity[cardConfig.badgeField], variant: 'default' as const } : undefined);
    const description = cardConfig.description ? cardConfig.description(entity) :
      (cardConfig.descriptionField ? entity[cardConfig.descriptionField] : undefined);
    const iconElement = cardConfig.icon ? cardConfig.icon(entity) :
      (cardConfig.iconField ? entity[cardConfig.iconField] : <FileText className="h-5 w-5 text-blue-600" />);

    return (
      <div
        key={entity.id}
        className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 overflow-hidden relative flex flex-col h-full cursor-pointer hover:shadow-md dark:hover:shadow-black/40 transition-all duration-200 border border-transparent dark:border-gray-700"
        onClick={() => {
          if (!selectionMode) {
            navigate(`${basePath}/${entity.id}`);
          }
        }}
      >
        {/* Checkbox selezione */}
        {selectionMode && (
          <div
            className={`absolute top-2 right-2 h-5 w-5 rounded border ${selectedIds.includes(entity.id) ? 'bg-blue-500 border-blue-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
              } flex items-center justify-center z-10`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleSelect(entity.id);
            }}
          >
            {selectedIds.includes(entity.id) && (
              <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center p-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            {iconElement}
          </div>

          <div className="ml-3 flex-grow min-w-0">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 whitespace-normal">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
            )}
            {badgeData && (
              <div className="mt-1">
                <Badge variant={badgeData.variant}>{badgeData.text}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Contenuto */}
        <div className="px-4 pb-3 space-y-1.5 flex-grow">
          {/* Supporta sia additionalFields che fields */}
          {cardConfig.fields?.map((field, index) => {
            const value = field.value(entity);
            if (!value || value === 'N/A') return null;

            return (
              <div key={index} className="flex items-baseline text-sm">
                <span className="flex items-center">
                  {field.icon && <span className="mr-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500">{field.icon}</span>}
                  <span className="text-gray-500 dark:text-gray-400">{field.label}:</span>
                </span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{value}</span>
              </div>
            );
          })}

          {cardConfig.additionalFields?.map(field => {
            const value = entity[field.key];
            if (!value) return null;

            return (
              <div key={String(field.key)} className="flex items-baseline text-sm">
                <span className="flex items-center">
                  {field.icon && <span className="mr-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500">{field.icon}</span>}
                  <span className="text-gray-500 dark:text-gray-400">{field.label}:</span>
                </span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {field.formatter ? field.formatter(value) : String(value)}
                </span>
              </div>
            );
          })}

          {description && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {description}
            </div>
          )}
        </div>

        {/* Footer azioni */}
        <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center mt-auto" style={{ position: 'relative', maxWidth: '100%' }}>
          <ActionButton
            actions={getCardActions(entity)}
            asPill={true}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* ── Brand accent stripe ── */}
      <div className={`h-0.5 w-full ${tc.accent} opacity-80`} />

      <div className="p-5 lg:p-6 space-y-4">
        {/* ── Header card ── */}
        <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Left: icon + title */}
            <div className="flex items-center gap-3.5 min-w-0">
              {icon && (
                <div className={`p-2.5 rounded-xl ${tc.iconBg} flex-shrink-0`}>
                  <span className={`block ${tc.iconColor}`}>{icon}</span>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                    {entityDisplayNamePlural}
                  </h1>
                  {!loading && (
                    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums flex-shrink-0 ${tc.badge}`}>
                      {filteredEntities.length !== entities.length
                        ? `${filteredEntities.length} / ${entities.length}`
                        : entities.length}
                    </span>
                  )}
                  {loading && (
                    <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {pageSubtitle || `Gestisci ${entityDisplayNamePlural.toLowerCase()}`}
                </p>
              </div>
            </div>

            {/* Right: view toggle + add button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Inline ViewModeToggle – ElementMedica style */}
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-0.5">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition-all duration-150 ${viewMode === 'table' ? `bg-white dark:bg-gray-600 shadow ${tc.iconColor}` : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  title="Visualizzazione tabella"
                  aria-label="Tabella"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all duration-150 ${viewMode === 'grid' ? `bg-white dark:bg-gray-600 shadow ${tc.iconColor}` : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  title="Visualizzazione griglia"
                  aria-label="Griglia"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
              {(canCreateEntity() || addOptions.length > 1) && (
                <AddEntityDropdown
                  label={`Aggiungi ${entityDisplayName}`}
                  options={addOptions}
                  icon={<Plus className="h-4 w-4" />}
                  variant="primary"
                  colorTheme={theme}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Toolbar — search + filters + tools ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cerca ${entityDisplayNamePlural.toLowerCase()}...`}
              className="w-full h-9 pl-9 pr-8 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500/30 dark:focus:ring-blue-400/30 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                aria-label="Cancella ricerca"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {enableAdvancedFilters && filterOptions.length > 0 && (
            <FilterPanel
              filterOptions={filterOptions.map(option => ({ value: option.key, label: option.label, options: option.options }))}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              sortOptions={sortOptions.map(option => ({ value: option.key, label: option.label }))}
              activeSort={activeSort}
              onSortChange={setActiveSort}
              theme={theme}
              className="h-9"
            />
          )}

          {enableColumnSelector && (
            <ColumnSelector
              columns={tableColumns.map(col => ({
                key: col.key,
                label: col.label,
                required: col.key === 'actions' || col.key === 'select'
              }))}
              hiddenColumns={hiddenColumns}
              onChange={handleColumnVisibilityChange}
              onOrderChange={handleColumnOrderChange}
              columnOrder={columnOrder}
              buttonClassName="h-9 flex items-center gap-2"
            />
          )}

          {enableBatchOperations && canUpdateEntity() && (
            <BatchEditButton
              selectionMode={selectionMode}
              onToggleSelectionMode={() => setSelectionMode(!selectionMode)}
              selectedCount={selectedIds.length}
              className="h-9 flex items-center gap-2"
              variant={selectionMode ? 'primary' : 'outline'}
              actions={batchActions}
            />
          )}

          {Object.keys(activeFilters).filter(k => activeFilters[k]).length > 0 && (
            <button
              onClick={() => setActiveFilters({})}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
            >
              <XCircle className="h-3.5 w-3.5" />
              Rimuovi filtri ({Object.keys(activeFilters).filter(k => activeFilters[k]).length})
            </button>
          )}
        </div>

        {/* ── Error alert ── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* ── Main content ── */}
        {loading ? (
          /* ── Skeleton loader ── */
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex gap-4">
              {[32, 20, 20, 14, 14].map((w, i) => (
                <div key={i} className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="px-5 py-3.5 flex gap-4 border-b border-gray-50 dark:border-gray-700/40 last:border-0"
                style={{ opacity: 1 - i * 0.12 }}
              >
                <div className="h-3.5 bg-gray-100 dark:bg-gray-700/60 rounded-full animate-pulse w-8 flex-shrink-0" />
                <div className="h-3.5 bg-gray-100 dark:bg-gray-700/60 rounded-full animate-pulse" style={{ width: `${30 + (i % 3) * 7}%` }} />
                <div className="h-3.5 bg-gray-100 dark:bg-gray-700/60 rounded-full animate-pulse" style={{ width: `${18 + (i % 4) * 5}%` }} />
                <div className="h-4 bg-gray-100 dark:bg-gray-700/60 rounded-full animate-pulse w-20 ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : viewMode === 'table' ? (
          filteredEntities.length === 0 ? (
            /* ── Empty state ── */
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className={`p-5 rounded-2xl ${tc.iconBg} mb-5`}>
                {icon
                  ? <span className={`block w-10 h-10 ${tc.emptyIcon}`}>{icon}</span>
                  : <FileText className={`w-10 h-10 ${tc.emptyIcon}`} />
                }
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                {searchQuery || Object.keys(activeFilters).some(k => activeFilters[k])
                  ? 'Nessun risultato trovato'
                  : `Nessun ${entityDisplayName.toLowerCase()} presente`}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                {searchQuery || Object.keys(activeFilters).some(k => activeFilters[k])
                  ? 'Prova a modificare i criteri di ricerca o a rimuovere i filtri attivi.'
                  : `I ${entityDisplayNamePlural.toLowerCase()} appariranno qui non appena verranno aggiunti.`}
              </p>
              {(searchQuery || Object.keys(activeFilters).some(k => activeFilters[k])) && (
                <button
                  onClick={() => { setSearchQuery(''); setActiveFilters({}); }}
                  className={`mt-5 text-sm font-semibold ${tc.emptyAccent} hover:underline`}
                >
                  Rimuovi tutti i filtri
                </button>
              )}
            </div>
          ) : (
            /* ── Table (native HTML, VisiteListPage style) ── */
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      {tableColumns.filter(col => !hiddenColumns.includes(col.key)).map(col => (
                        <th
                          key={col.key}
                          className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap${col.sortable ? ' cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''}`}
                          onClick={() => {
                            if (!col.sortable) return;
                            const sk = (col as unknown as Record<string, unknown>).sortKey as string || col.key;
                            if (activeSort?.field === sk) {
                              setActiveSort(activeSort.direction === 'asc' ? { field: sk, direction: 'desc' } : undefined);
                            } else {
                              setActiveSort({ field: sk, direction: 'asc' });
                            }
                          }}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.renderHeader ? col.renderHeader(col) : col.label}
                            {col.sortable && activeSort?.field === ((col as unknown as Record<string, unknown>).sortKey as string || col.key) && (
                              <span className="text-xs opacity-70">{activeSort.direction === 'asc' ? '\u2191' : '\u2193'}</span>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {paginatedEntities.map((entity, rowIndex) => (
                      <tr
                        key={entity.id}
                        className={!selectionMode
                          ? 'hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors cursor-pointer'
                          : 'hover:bg-gray-50/40 dark:hover:bg-gray-700/10 transition-colors'
                        }
                        onClick={() => {
                          if (!selectionMode) {
                            if (onViewEntity) onViewEntity(entity as T);
                            else navigate(`${basePath}/${entity.id}`);
                          }
                        }}
                      >
                        {tableColumns.filter(col => !hiddenColumns.includes(col.key)).map(col => (
                          <td key={col.key} className="px-4 py-3.5 text-sm text-gray-800 dark:text-gray-200">
                            {col.renderCell
                              ? col.renderCell(entity as T, rowIndex)
                              : String(entity[col.key as keyof T] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* ── Grid view ── */
          filteredEntities.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-20 text-center px-6">
              <div className={`p-5 rounded-2xl ${tc.iconBg} mb-5`}>
                <FileText className={`w-10 h-10 ${tc.emptyIcon}`} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Nessun {entityDisplayName.toLowerCase()} trovato
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Prova a modificare i criteri di ricerca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedEntities.map(renderEntityCard)}
            </div>
          )
        )}

        {/* ── Footer paginazione ── */}
        {!loading && filteredEntities.length > 0 && (
          <ListPaginationFooter
            page={currentPage}
            pageSize={pageSize}
            total={filteredEntities.length}
            totalPages={Math.ceil(filteredEntities.length / pageSize)}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            itemLabel={entityDisplayNamePlural.toLowerCase()}
          />
        )}
      </div>
    </div>
  );
}

export default GDPREntityTemplate;
