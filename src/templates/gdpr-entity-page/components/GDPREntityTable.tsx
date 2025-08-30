/**
 * GDPR Entity Table - Componente tabella per visualizzare le entità
 * 
 * Componente tabella che include:
 * - Visualizzazione dati in formato tabella
 * - Ordinamento colonne
 * - Selezione righe
 * - Azioni per riga
 * - Supporto GDPR
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import React from 'react';
import { Button, Badge } from '../../../design-system';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem
} from '../../../design-system';
import { 
  ChevronUp, 
  ChevronDown, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download
} from 'lucide-react';
import { ColumnConfig, EntityAction, BaseEntity } from '../types';

/**
 * Props del componente GDPREntityTable
 */
export interface GDPREntityTableProps<T extends BaseEntity = BaseEntity> {
  /** Dati da visualizzare */
  data: T[];
  
  /** Configurazione colonne */
  columns: ColumnConfig[];
  
  /** Colonne visibili */
  visibleColumns: string[];
  
  /** Configurazione ordinamento */
  sortConfig?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  
  /** Callback per cambio ordinamento */
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  
  /** Elementi selezionati */
  selectedItems: string[];
  
  /** Callback per selezione elementi */
  onSelectionChange: (selectedIds: string[]) => void;
  
  /** Azioni disponibili per riga */
  rowActions?: EntityAction[];
  
  /** Callback per azioni riga */
  onRowAction?: (actionKey: string, entity: T) => void;
  
  /** Stato di caricamento */
  loading?: boolean;
  
  /** Messaggio stato vuoto */
  emptyMessage?: string;
  
  /** Mostra checkbox selezione */
  showSelection?: boolean;
  
  /** Mostra colonna azioni */
  showActions?: boolean;
  
  /** Classi CSS personalizzate */
  className?: string;
}

/**
 * Componente tabella per visualizzare le entità
 */
export function GDPREntityTable<T extends BaseEntity = BaseEntity>({
  data,
  columns,
  visibleColumns,
  sortConfig,
  onSort,
  selectedItems,
  onSelectionChange,
  rowActions,
  onRowAction,
  loading = false,
  emptyMessage = 'Nessun elemento trovato',
  showSelection = true,
  showActions = true,
  className
}: GDPREntityTableProps<T>) {
  
  // Filtra colonne visibili
  const displayColumns = columns.filter(col => visibleColumns.includes(col.key));
  
  // Gestione selezione
  const isAllSelected = data.length > 0 && selectedItems.length === data.length;
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < data.length;
  
  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(item => item.id));
    }
  };
  
  const handleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      onSelectionChange(selectedItems.filter(itemId => itemId !== id));
    } else {
      onSelectionChange([...selectedItems, id]);
    }
  };
  
  // Gestione ordinamento
  const handleSort = (field: string) => {
    if (!onSort) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.field === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    onSort(field, direction);
  };
  
  // Renderizza icona ordinamento
  const renderSortIcon = (field: string) => {
    if (sortConfig?.field !== field) return null;
    
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };
  
  // Renderizza valore cella
  const renderCellValue = (column: ColumnConfig, entity: T) => {
    const value = (entity as Record<string, unknown>)[column.key];
    
    if (column.formatter) {
      return column.formatter(value, entity);
    }
    
    // Formattazione di default per tipi comuni
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'secondary' : 'outline'}>
          {value ? 'Sì' : 'No'}
        </Badge>
      );
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString('it-IT');
    }
    
    if (typeof value === 'string' && value.includes('@')) {
      return <span className="font-mono text-sm">{value}</span>;
    }
    
    return String(value);
  };
  
  if (loading) {
    return (
      <div className={`gdpr-entity-table ${className || ''}`}>
        <div className="border rounded-lg">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento dati...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className={`gdpr-entity-table ${className || ''}`}>
        <div className="border rounded-lg">
          <div className="p-8 text-center">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`gdpr-entity-table ${className || ''}`}>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className="bg-muted/50">
              <tr>
                {/* Checkbox selezione */}
                {showSelection && (
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isPartiallySelected;
                      }}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                )}
                
                {/* Colonne dati */}
                {displayColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`p-4 text-left font-medium text-sm ${
                      column.sortable ? 'cursor-pointer hover:bg-muted' : ''
                    } ${column.headerClassName || ''}`}
                    onClick={() => column.sortable && handleSort(column.key)}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.sortable && renderSortIcon(column.key)}
                    </div>
                  </th>
                ))}
                
                {/* Colonna azioni */}
                {showActions && rowActions && rowActions.length > 0 && (
                  <th className="w-16 p-4 text-center">
                    <span className="text-sm font-medium">Azioni</span>
                  </th>
                )}
              </tr>
            </thead>
            
            {/* Body */}
            <tbody>
              {data.map((entity, index) => (
                <tr
                  key={entity.id}
                  className={`border-t hover:bg-muted/25 ${
                    selectedItems.includes(entity.id) ? 'bg-muted/50' : ''
                  }`}
                >
                  {/* Checkbox selezione */}
                  {showSelection && (
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(entity.id)}
                        onChange={() => handleSelectItem(entity.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                  )}
                  
                  {/* Celle dati */}
                  {displayColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`p-4 ${column.cellClassName || ''}`}
                      style={{
                        textAlign: column.align || 'left'
                      }}
                    >
                      {renderCellValue(column, entity)}
                    </td>
                  ))}
                  
                  {/* Cella azioni */}
                  {showActions && rowActions && rowActions.length > 0 && (
                    <td className="p-4 text-center">
                      {rowActions.length === 1 ? (
                        // Singola azione - pulsante diretto
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRowAction?.(rowActions[0].key, entity)}
                          disabled={
                            typeof rowActions[0].disabled === 'function' 
                              ? rowActions[0].disabled(entity) 
                              : rowActions[0].disabled
                          }
                          className="h-8 w-8 p-0"
                        >
                          {rowActions[0].icon || <Eye className="h-4 w-4" />}
                        </Button>
                      ) : (
                        // Multiple azioni - dropdown menu
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rowActions
                              .filter(action => 
                                typeof action.visible === 'function' 
                                  ? action.visible(entity) 
                                  : action.visible !== false
                              )
                              .map((action) => (
                                <DropdownMenuItem
                                  key={action.key}
                                  onClick={() => onRowAction?.(action.key, entity)}
                                  disabled={
                                    typeof action.disabled === 'function' 
                                      ? action.disabled(entity) 
                                      : action.disabled
                                  }
                                  className="flex items-center gap-2"
                                >
                                  {action.icon && <span>{action.icon}</span>}
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GDPREntityTable;