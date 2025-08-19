import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { Input } from '../../../design-system/atoms/Input';
import { Dropdown } from '../../../design-system/molecules/Dropdown';
import { 
  Download,
  Filter,
  Plus,
  Search,
  Settings
} from 'lucide-react';
import { cn } from '../../../design-system/utils';

// Import dei componenti ottimizzati
import { useGDPRPermissions } from '../hooks/useGDPRPermissions';
import { useEntityState } from '../hooks/useEntityState';
import { useTableColumns } from '../hooks/useTableColumns';
import { EntityView, ViewMode } from './EntityView';
import { BatchOperations } from './BatchOperations';

export interface GDPREntityPageProps<T> {
  // Configurazione entità
  entityType: string;
  entityName: string;
  entityNamePlural: string;
  
  // API endpoints
  apiEndpoint: string;
  
  // Configurazione colonne
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    width?: number;
    render?: (value: any, entity: T) => React.ReactNode;
  }>;
  
  // Azioni personalizzate
  actions?: {
    onView?: (entity: T) => void;
    onEdit?: (entity: T) => void;
    onDelete?: (entity: T) => void;
    onExport?: (entity: T) => void;
    onCreate?: () => void;
    onImport?: () => void;
    custom?: Array<{
      label: string;
      icon?: React.ReactNode;
      onClick: (entity: T) => void;
      variant?: 'primary' | 'secondary' | 'danger';
      permission?: string;
    }>;
  };
  
  // Configurazione permessi
  permissions?: {
    read?: string;
    create?: string;
    update?: string;
    delete?: string;
    export?: string;
  };
  
  // Opzioni di visualizzazione
  defaultViewMode?: ViewMode;
  showBatchOperations?: boolean;
  showFilters?: boolean;
  showColumnSettings?: boolean;
  
  // Personalizzazione UI
  className?: string;
  headerActions?: React.ReactNode;
}

/**
 * Componente principale ottimizzato per la gestione delle entità GDPR
 * Sostituisce il monolitico GDPREntityTemplate con un approccio modulare
 */
export function GDPREntityPage<T extends { id: string; [key: string]: any }>({
  entityType,
  entityName,
  entityNamePlural,
  apiEndpoint,
  columns,
  actions = {},
  permissions = {},
  defaultViewMode = 'table',
  showBatchOperations = true,
  showFilters = true,
  showColumnSettings = true,
  className,
  headerActions
}: GDPREntityPageProps<T>) {
  
  // Stati locali per UI
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  
  // Hook personalizzati per la logica di business
  const gdprPermissions = useGDPRPermissions({
    entityName,
    entityNamePlural,
    readPermission: permissions.read || `${entityType}:read`,
    writePermission: permissions.create || `${entityType}:write`,
    deletePermission: permissions.delete || `${entityType}:delete`,
    exportPermission: permissions.export || `${entityType}:export`
  });
  
  const [entityState, entityActions] = useEntityState<T>({
    apiEndpoint,
    pageSize: 10,
    enableSearch: true,
    enablePagination: true
  });
  
  const [columnState, columnActions] = useTableColumns(columns);
  
  // Gestori di eventi
  const handleSearch = useCallback((query: string) => {
    entityActions.setSearchTerm(query);
  }, [entityActions]);
  
  const handleEntityAction = useCallback((action: string, entity: T) => {
    switch (action) {
      case 'view':
        actions.onView?.(entity);
        break;
      case 'edit':
        actions.onEdit?.(entity);
        break;
      case 'delete':
        actions.onDelete?.(entity);
        break;
      case 'export':
        actions.onExport?.(entity);
        break;
      default:
        // Gestione azioni personalizzate
        const customAction = actions.custom?.find(a => a.label === action);
        customAction?.onClick(entity);
    }
  }, [actions]);
  
  const handleBatchAction = useCallback(async (action: string, entityIds: string[]) => {
    switch (action) {
      case 'delete':
        // Elimina le entità selezionate
        entityIds.forEach(id => entityActions.removeEntity(id));
        break;
      case 'export':
        // Logica di esportazione batch
        console.log('Esportazione batch:', entityIds);
        break;
      case 'archive':
        // Logica di archiviazione batch
        console.log('Archiviazione batch:', entityIds);
        break;
    }
  }, [entityActions]);
  
  // Preparazione delle azioni del dropdown "Aggiungi" - memorizzate per evitare re-render
  const addActions = useMemo(() => [
    ...(gdprPermissions.canCreate ? [{
      label: `Nuovo ${entityName}`,
      icon: <Plus className="h-4 w-4" />,
      onClick: () => actions.onCreate?.(),
      variant: 'primary' as const
    }] : []),
    ...(gdprPermissions.canCreate ? [{
      label: `Importa ${entityNamePlural}`,
      icon: <Download className="h-4 w-4" />,
      onClick: () => actions.onImport?.(),
      variant: 'secondary' as const
    }] : [])
  ], [gdprPermissions.canCreate, entityName, entityNamePlural, actions.onCreate, actions.onImport]);
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header della pagina */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {entityNamePlural}
          </h1>
          <p className="text-gray-600">
            Gestisci {entityNamePlural.toLowerCase()} conformi al GDPR
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {headerActions}
          
          {/* Dropdown per aggiungere entità */}
          {addActions.length > 0 && (
            <Dropdown
              actions={addActions}
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
            />
          )}
        </div>
      </div>
      
      {/* Barra di ricerca e filtri */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Campo di ricerca */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={`Cerca ${entityNamePlural.toLowerCase()}...`}
            value={entityState.searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Controlli aggiuntivi */}
        <div className="flex items-center gap-2">
          {/* Filtri avanzati */}
          {showFilters && (
            <Button
              variant="outline"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={cn(showFiltersPanel && 'bg-gray-100')}
            >
              <Filter className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Filtri</span>
            </Button>
          )}
          
          {/* Impostazioni colonne */}
          {showColumnSettings && viewMode === 'table' && (
            <Button
              variant="outline"
              onClick={() => setShowColumnPanel(!showColumnPanel)}
              className={cn(showColumnPanel && 'bg-gray-100')}
            >
              <Settings className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Colonne</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Operazioni batch */}
      {showBatchOperations && entityState.selectedEntities.size > 0 && (
        <BatchOperations
          selectedEntities={entityState.selectedEntities}
          permissions={gdprPermissions}
          onClearSelection={entityActions.clearSelection}
          entityName={entityName}
          entityNamePlural={entityNamePlural}
        />
      )}
      
      {/* Visualizzazione entità */}
        <EntityView
          entities={entityState.entities}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          columns={columnActions.getVisibleColumns()}
          permissions={gdprPermissions}
          selectedEntities={entityState.selectedEntities}
          onEntitySelect={entityActions.toggleEntitySelection}
          onSelectAll={entityActions.selectAllEntities}
          onClearSelection={entityActions.clearSelection}
          onEntityAction={handleEntityAction}
          loading={entityState.loading}
          error={entityState.error}
          emptyMessage={`Nessun ${entityName.toLowerCase()} trovato`}
        />
      
      {/* Paginazione */}
        {entityState.totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={entityState.currentPage === 1}
                onClick={() => entityActions.setCurrentPage(entityState.currentPage - 1)}
              >
                Precedente
              </Button>
              
              <span className="text-sm text-gray-600">
                Pagina {entityState.currentPage} di {entityState.totalPages}
              </span>
              
              <Button
                variant="outline"
                disabled={entityState.currentPage === entityState.totalPages}
                onClick={() => entityActions.setCurrentPage(entityState.currentPage + 1)}
              >
                Successiva
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}