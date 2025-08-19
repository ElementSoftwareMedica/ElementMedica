import { useState, useCallback, useMemo } from 'react';
import { Button } from '../../../components/ui/button';
import { Eye, Edit, Trash2, Download } from 'lucide-react';
import { GDPRPermissions } from '../types';

// Tipo generico per le entità
export type EntityRecord = Record<string, unknown>;

export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  hidden?: boolean;
  render?: (value: unknown, entity: EntityRecord) => React.ReactNode;
}

export interface ActionConfig {
  view?: boolean;
  edit?: boolean;
  delete?: boolean;
  export?: boolean;
  custom?: Array<{
    key: string;
    label: string;
    icon?: React.ReactNode;
    onClick: (entity: EntityRecord) => void;
    permission?: string;
  }>;
}

export interface ColumnState {
  columns: ColumnConfig[];
  hiddenColumns: Set<string>;
  columnOrder: string[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
}

export interface ColumnActions {
  toggleColumnVisibility: (columnKey: string) => void;
  reorderColumns: (newOrder: string[]) => void;
  setSorting: (column: string | null, direction?: 'asc' | 'desc') => void;
  resetColumns: () => void;
  getVisibleColumns: () => ColumnConfig[];
  createActionColumn: (
    actions: ActionConfig,
    permissions: GDPRPermissions,
    handlers: {
      onView?: (entity: EntityRecord) => void;
      onEdit?: (entity: EntityRecord) => void;
      onDelete?: (entity: EntityRecord) => void;
      onExport?: (entity: EntityRecord) => void;
    }
  ) => ColumnConfig;
}

/**
 * Hook per la gestione delle colonne della tabella GDPR
 * Centralizza la logica di visualizzazione, ordinamento e azioni
 */
export function useTableColumns(
  initialColumns: ColumnConfig[]
): [ColumnState, ColumnActions] {
  
  // Stati per le colonne
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    new Set(initialColumns.filter(col => col.hidden).map(col => col.key))
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(
    initialColumns.map(col => col.key)
  );
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Colonne processate con stato corrente
  const processedColumns = useMemo(() => {
    return initialColumns.map(col => ({
      ...col,
      hidden: hiddenColumns.has(col.key)
    }));
  }, [initialColumns, hiddenColumns]);

  // Toggle visibilità colonna
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  }, []);

  // Riordina colonne
  const reorderColumns = useCallback((newOrder: string[]) => {
    setColumnOrder(newOrder);
  }, []);

  // Gestione ordinamento
  const setSorting = useCallback((column: string | null, direction?: 'asc' | 'desc') => {
    if (column === null) {
      setSortColumn(null);
      setSortDirection('asc');
      return;
    }

    if (column === sortColumn) {
      // Se è la stessa colonna, cambia direzione
      const newDirection = direction || (sortDirection === 'asc' ? 'desc' : 'asc');
      setSortDirection(newDirection);
    } else {
      // Nuova colonna
      setSortColumn(column);
      setSortDirection(direction || 'asc');
    }
  }, [sortColumn, sortDirection]);

  // Reset colonne allo stato iniziale
  const resetColumns = useCallback(() => {
    setHiddenColumns(new Set(initialColumns.filter(col => col.hidden).map(col => col.key)));
    setColumnOrder(initialColumns.map(col => col.key));
    setSortColumn(null);
    setSortDirection('asc');
  }, [initialColumns]);

  // Ottieni colonne visibili nell'ordine corretto
  const getVisibleColumns = useCallback((): ColumnConfig[] => {
    const orderedColumns: ColumnConfig[] = [];
    
    for (const key of columnOrder) {
      const col = processedColumns.find(col => col.key === key);
      if (col && !hiddenColumns.has(col.key)) {
        orderedColumns.push(col);
      }
    }
    
    return orderedColumns;
  }, [columnOrder, processedColumns, hiddenColumns]);

  // Crea colonna delle azioni
  const createActionColumn = useCallback((
    actions: ActionConfig,
    permissions: GDPRPermissions,
    handlers: {
      onView?: (entity: EntityRecord) => void;
      onEdit?: (entity: EntityRecord) => void;
      onDelete?: (entity: EntityRecord) => void;
      onExport?: (entity: EntityRecord) => void;
    }
  ): ColumnConfig => {
    return {
      key: 'actions',
      label: 'Azioni',
      sortable: false,
      filterable: false,
      width: 120,
      render: (_, entity) => (
        <div className="flex items-center gap-1">
          {/* Visualizza */}
          {actions.view && permissions?.read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onView && handlers.onView(entity)}
              title="Visualizza"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          
          {/* Modifica */}
          {actions.edit && permissions?.update && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onEdit && handlers.onEdit(entity)}
              title="Modifica"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          
          {/* Elimina */}
          {actions.delete && permissions?.delete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onDelete && handlers.onDelete(entity)}
              title="Elimina"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          
          {/* Esporta */}
          {actions.export && permissions?.export && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onExport && handlers.onExport(entity)}
              title="Esporta"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          
          {/* Azioni personalizzate */}
          {actions.custom && actions.custom.map(customAction => {
             const hasPermission = customAction.permission 
               ? (permissions as Record<string, boolean>)[customAction.permission] || false
               : true;
              
            if (!hasPermission) return null;
            
            return (
              <Button
                key={customAction.key}
                variant="ghost"
                size="sm"
                onClick={() => customAction.onClick(entity)}
                title={customAction.label}
              >
                {customAction.icon || customAction.label}
              </Button>
            );
          })}
        </div>
      )
    };
  }, []);

  // Stato combinato
  const state: ColumnState = {
    columns: processedColumns,
    hiddenColumns,
    columnOrder,
    sortColumn,
    sortDirection
  };

  // Azioni combinate
  const actions: ColumnActions = {
    toggleColumnVisibility,
    reorderColumns,
    setSorting,
    resetColumns,
    getVisibleColumns,
    createActionColumn
  };

  return [state, actions];
}