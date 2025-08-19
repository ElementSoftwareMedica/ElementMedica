import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGDPRPermissions } from '../../hooks/useGDPRPermissions';
import { useGDPREntityData } from '../../hooks/useGDPREntityData';
import { useGDPREntityOperations } from '../../hooks/useGDPREntityOperations';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { SearchBar, Badge } from '../../design-system';
import { 
  Download,
  Edit,
  Eye,
  FileText,
  Plus,
  Trash2,
  Upload,
  XCircle
} from 'lucide-react';
import { ViewModeToggle } from '../../design-system/molecules/ViewModeToggle';
import { FilterPanel } from '../../design-system/organisms/FilterPanel';
import { AddEntityDropdown, ColumnSelector, BatchEditButton, ActionButton } from '../../components/ui';
import { exportToCsv } from '../../utils/csvExport';

import ResizableTable from '../../components/shared/ResizableTable';
import EntityListLayout from '../../components/layouts/EntityListLayout';
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
  
  // Configurazione CSV
  csvHeaders: Array<{ key: string; label: string }> | Record<string, string>;
  csvTemplateData?: Record<string, any>[];
  
  // Handlers personalizzati
  onCreateEntity?: () => void;
  onEditEntity?: (entity: T) => void;
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
  columns,
  searchFields,
  filterOptions = [],
  sortOptions = [],
  csvHeaders,
  csvTemplateData,
  onCreateEntity,
  onEditEntity,
  onDeleteEntity,
  onImportEntities,
  onExportEntities,
  cardConfig,
  enableBatchOperations = true,
  enableImportExport = true,
  enableColumnSelector = true,
  enableAdvancedFilters = true,
  defaultViewMode = 'table'
}: GDPREntityTemplateProps<T>): JSX.Element {
  const navigate = useNavigate();
  
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
    readPermission
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
  
  // Stati per ricerca e filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [activeSort, setActiveSort] = useState<{ field: string, direction: 'asc' | 'desc' } | undefined>(undefined);
  
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
  
  // Verifica permessi
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
      console.error('GDPREntityTemplate: entities deve essere un array, ricevuto:', typeof entities, entities);
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
    navigate(`/${entityNamePlural}/${entity.id}`);
  }, [navigate, entityNamePlural]);

  const handleEditEntity = useCallback((entity: T) => (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onEditEntity ? onEditEntity(entity) : navigate(`/${entityNamePlural}/${entity.id}/edit`);
  }, [onEditEntity, navigate, entityNamePlural]);

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
                  console.error('GDPREntityTemplate: filteredEntities non è un array:', filteredEntities);
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
        onClick: onCreateEntity || (() => navigate(`/${entityNamePlural}/create`))
      });
    }
    
    if (enableImportExport) {
      options.push(
        {
          label: 'Importa da CSV',
          icon: <Upload className="h-4 w-4" />,
          onClick: () => {
            if (onImportEntities) {
              // Chiama la funzione onImportEntities fornita dal componente padre
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
                      console.log('CSV data imported:', data);
                      toast.showToast({
                        message: `Importati ${data.length} record da CSV`,
                        type: 'success'
                      });
                      // Qui si potrebbe aggiungere la logica per salvare i dati
                    } catch (error) {
                      console.error('Errore import CSV:', error);
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
  }, [entityDisplayName, entityNamePlural, enableImportExport, onCreateEntity, csvTemplateData, csvHeaders, toast, permissions, navigate, onImportEntities]);
  
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
  }, [permissions, handleDeleteSelected, enableImportExport, entities, selectedIds, onExportEntities, csvHeaders, entityNamePlural, clearSelection]);

  // Azioni memoizzate per le card della vista griglia
  const getCardActions = useCallback((entity: T) => [
    { 
      label: 'Visualizza', 
      icon: <Eye className="h-4 w-4" />, 
      onClick: (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        navigate(`/${entityNamePlural}/${entity.id}`);
      },
      variant: 'default' as const,
    },
    ...(permissions.canWrite ? [{
      label: 'Modifica',
      icon: <Edit className="h-4 w-4" />,
      onClick: (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        onEditEntity ? onEditEntity(entity) : navigate(`/${entityNamePlural}/${entity.id}/edit`);
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
  ], [entityNamePlural, navigate, permissions.canWrite, onEditEntity, permissions.canDelete, handleDelete, enableImportExport, permissions.canExport, onExportEntities, csvHeaders, entityName]);
  
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
        className="bg-white rounded-lg shadow overflow-hidden relative flex flex-col h-full cursor-pointer hover:shadow-md transition-all duration-200"
        onClick={() => {
          if (!selectionMode) {
            navigate(`/${entityNamePlural}/${entity.id}`);
          }
        }}
      >
        {/* Checkbox selezione */}
        {selectionMode && (
          <div 
            className={`absolute top-2 right-2 h-5 w-5 rounded border ${
              selectedIds.includes(entity.id) ? 'bg-blue-500 border-blue-600' : 'bg-white border-gray-300'
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
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            {iconElement}
          </div>
          
          <div className="ml-3 flex-grow min-w-0">
            <h3 className="text-base font-semibold text-gray-800 line-clamp-2 whitespace-normal">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
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
                  {field.icon && <span className="mr-2 h-3.5 w-3.5 text-gray-400">{field.icon}</span>}
                  <span className="text-gray-500">{field.label}:</span>
                </span>
                <span className="ml-2 text-gray-700">{value}</span>
              </div>
            );
          })}
          
          {cardConfig.additionalFields?.map(field => {
            const value = entity[field.key];
            if (!value) return null;
            
            return (
              <div key={String(field.key)} className="flex items-baseline text-sm">
                <span className="flex items-center">
                  {field.icon && <span className="mr-2 h-3.5 w-3.5 text-gray-400">{field.icon}</span>}
                  <span className="text-gray-500">{field.label}:</span>
                </span>
                <span className="ml-2 text-gray-700">
                  {field.formatter ? field.formatter(value) : String(value)}
                </span>
              </div>
            );
          })}
          
          {description && (
            <div className="mt-2 text-sm text-gray-600 line-clamp-2">
              {description}
            </div>
          )}
        </div>
        
        {/* Footer azioni */}
        <div className="px-4 py-3 bg-white border-t border-gray-200 flex justify-end items-center mt-auto" style={{position: 'relative', maxWidth: '100%'}}>
          <ActionButton
            actions={getCardActions(entity)}
            asPill={true}
          />
        </div>
      </div>
    );
  };
  
  return (
    <EntityListLayout 
      title={entityDisplayNamePlural}
      subtitle={`Gestisci ${entityDisplayNamePlural.toLowerCase()}`}
      headerContent={
        <div className="space-y-4 mb-4">
          {/* Prima riga: Descrizione con toggle switch e dropdown in linea */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-gray-500">
                Gestisci {entityDisplayNamePlural.toLowerCase()}, visualizza i dettagli e crea nuovi {entityDisplayNamePlural.toLowerCase()}.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <ViewModeToggle
                viewMode={viewMode}
                onChange={setViewMode}
                gridLabel="Griglia"
                tableLabel="Tabella"
              />
              
              {(canCreateEntity() || addOptions.length > 1) && (
                <AddEntityDropdown
                  label={`Aggiungi ${entityDisplayName}`}
                  options={addOptions}
                  icon={<Plus className="h-4 w-4" />}
                  variant="primary"
                />
              )}
            </div>
          </div>
          
          {/* Seconda riga: Search bar a sinistra e pulsanti a destra */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={`Cerca ${entityDisplayNamePlural.toLowerCase()}...`}
                className="h-10 bg-white"
                showButton={false}
                showClearButton={true}
              />
            </div>
            
            <div className="flex items-center gap-2">
              {enableAdvancedFilters && filterOptions.length > 0 && (
                <FilterPanel 
                  filterOptions={filterOptions.map(option => ({ value: option.key, label: option.label, options: option.options }))}
                  activeFilters={activeFilters}
                  onFilterChange={setActiveFilters}
                  sortOptions={sortOptions.map(option => ({ value: option.key, label: option.label }))}
                  activeSort={activeSort}
                  onSortChange={setActiveSort}
                  className="h-10"
                />
              )}
              
              {/* Pulsanti Colonne e Modifica su una sola riga */}
              <div className="flex items-center gap-2">
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
                    buttonClassName="h-10 flex items-center gap-2"
                  />
                )}
                
                {enableBatchOperations && canUpdateEntity() && (
                  <BatchEditButton
                    selectionMode={selectionMode}
                    onToggleSelectionMode={() => setSelectionMode(!selectionMode)}
                    selectedCount={selectedIds.length}
                    className="h-10 flex items-center gap-2"
                    variant={selectionMode ? "primary" : "outline"}
                    actions={batchActions}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      }
      searchBarContent={null}
    >
      <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
        {/* Messaggio errore */}
        {error && (
          <div className="mb-4 p-4 border border-red-300 bg-red-50 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Vista tabella */}
            {viewMode === 'table' ? (
              <ResizableTable<T>
                columns={tableColumns.map(col => ({
                  key: col.key,
                  label: col.label,
                  width: col.width,
                  minWidth: col.minWidth,
                  sortable: col.sortable,
                  renderHeader: col.renderHeader ? (_) => col.renderHeader!(col) : undefined,
                  renderCell: col.renderCell ? (row, _, rowIndex) => col.renderCell!(row as T, rowIndex) : undefined
                }))}
                data={filteredEntities as T[]}
                onSort={(key, direction) => {
                  setActiveSort(direction ? { field: key, direction } : undefined);
                }}
                sortKey={activeSort?.field}
                sortDirection={activeSort?.direction || null}
                hiddenColumns={hiddenColumns}
                columnOrder={columnOrder}
                tableName={entityNamePlural}
                onRowClick={(entity) => {
                  if (!selectionMode) {
                    navigate(`/${entityNamePlural}/${entity.id}`);
                  }
                }}
                rowClassName={() => selectionMode ? '' : 'cursor-pointer hover:bg-gray-50'}
                zebra={true}
                tableProps={{
                  className: "border rounded-md overflow-hidden shadow-sm"
                }}
              />
            ) : (
              /* Vista griglia */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredEntities.map(renderEntityCard)}
              </div>
            )}
          </>
        )}
      </div>
    </EntityListLayout>
  );
}

export default GDPREntityTemplate;