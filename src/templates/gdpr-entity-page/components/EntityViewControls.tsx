import React from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { Table, Grid, Eye, EyeOff, ArrowUpDown } from 'lucide-react';

/**
 * Componente per la gestione delle colonne e modalità di visualizzazione
 * Gestisce toggle vista tabella/griglia, visibilità colonne e ordinamento
 */
export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface EntityViewControlsProps {
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  columns: ColumnConfig[];
  hiddenColumns: string[];
  onToggleColumn: (columnKey: string) => void;
  activeSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  showColumnSelector?: boolean;
}

export const EntityViewControls: React.FC<EntityViewControlsProps> = ({
  viewMode,
  onViewModeChange,
  columns,
  hiddenColumns,
  onToggleColumn,
  activeSort,
  onSortChange,
  showColumnSelector = true
}) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      {/* Toggle modalità visualizzazione */}
      <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
        <Button
          variant={viewMode === 'table' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('table')}
          className="flex items-center gap-1"
        >
          <Table className="h-4 w-4" />
          Tabella
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          className="flex items-center gap-1"
        >
          <Grid className="h-4 w-4" />
          Griglia
        </Button>
      </div>

      {/* Selettore colonne (solo per vista tabella) */}
      {showColumnSelector && viewMode === 'table' && (
        <div className="relative">
          <details className="relative">
            <summary className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
              <EyeOff className="h-4 w-4" />
              Colonne
              <span className="text-xs text-gray-500">
                ({columns.length - hiddenColumns.length}/{columns.length})
              </span>
            </summary>
            
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-48">
              <div className="p-2 space-y-1">
                {columns.map((column) => {
                  const isHidden = hiddenColumns.includes(column.key);
                  return (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={() => onToggleColumn(column.key)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm">{column.label}</span>
                      {isHidden ? (
                        <EyeOff className="h-3 w-3 text-gray-400 ml-auto" />
                      ) : (
                        <Eye className="h-3 w-3 text-gray-600 ml-auto" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Controlli ordinamento (solo per vista tabella) */}
      {viewMode === 'table' && onSortChange && (
        <div className="relative">
          <details className="relative">
            <summary className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
              <ArrowUpDown className="h-4 w-4" />
              Ordina
              {activeSort && (
                <span className="text-xs text-gray-500">
                  ({activeSort.field} {activeSort.direction === 'asc' ? '↑' : '↓'})
                </span>
              )}
            </summary>
            
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-48">
              <div className="p-2 space-y-1">
                {columns
                  .filter(col => col.sortable !== false)
                  .map((column) => (
                    <div key={column.key} className="space-y-1">
                      <button
                        onClick={() => onSortChange(column.key, 'asc')}
                        className={`w-full text-left p-2 hover:bg-gray-100 rounded text-sm flex items-center justify-between ${
                          activeSort?.field === column.key && activeSort?.direction === 'asc'
                            ? 'bg-blue-50 text-blue-700'
                            : ''
                        }`}
                      >
                        <span>{column.label} (A-Z)</span>
                        <span>↑</span>
                      </button>
                      <button
                        onClick={() => onSortChange(column.key, 'desc')}
                        className={`w-full text-left p-2 hover:bg-gray-100 rounded text-sm flex items-center justify-between ${
                          activeSort?.field === column.key && activeSort?.direction === 'desc'
                            ? 'bg-blue-50 text-blue-700'
                            : ''
                        }`}
                      >
                        <span>{column.label} (Z-A)</span>
                        <span>↓</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Reset ordinamento */}
      {activeSort && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSortChange && onSortChange('', 'asc')}
          className="text-xs"
        >
          Reset ordinamento
        </Button>
      )}
    </div>
  );
};