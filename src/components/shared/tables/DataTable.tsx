import React from 'react';
// import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import SortableColumn, { SortDirection } from './SortableColumn';
// import Pagination from '../ui/Pagination'; // Componente non disponibile
import { Button } from '../../../design-system/atoms/Button';
import useSorting from '../../../hooks/useSorting';
import usePagination from '../../../hooks/usePagination';
import { FilterCondition } from '../filters/FilterBuilder';

export interface DataTableColumn<T = any> {
  key: string;
  label: string;
  header?: string; // Aggiunto per retrocompatibilità - alcuni componenti usano header invece di label
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  sortKey?: string; // Chiave usata per l'ordinamento (se diversa da 'key')
  renderHeader?: (col: DataTableColumn<T>) => React.ReactNode;
  renderCell?: (row: T, rowIndex: number) => React.ReactNode;
  filterable?: boolean;
  filterType?: 'string' | 'number' | 'date' | 'boolean' | 'select';
  filterOptions?: { value: string; label: string }[]; // For 'select' type filtering
}

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  data: T[];
  className?: string;
  tableClassName?: string;
  theadClassName?: string;
  tbodyClassName?: string;
  trClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  keyExtractor?: (row: T, index: number) => string | number;
  pagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  stickyHeader?: boolean;
  loadingOverlay?: boolean;
  selectionMode?: boolean;
  selectedIds?: string[];
  onSelectRow?: (row: T, selected: boolean) => void;
  idExtractor?: (row: T) => string;
  onFilter?: (filters: FilterCondition[]) => void;
  initialFilters?: FilterCondition[];
  customFilterElement?: React.ReactNode;
  exportOptions?: {
    show?: boolean;
    onExport?: (format: 'csv' | 'excel') => void;
  };

renderActions?: (row: T) => React.ReactNode;
}

const DataTable = <T extends object>({
  columns,
  data,
  className = '',
  tableClassName = '',
  theadClassName = '',
  tbodyClassName = '',
  trClassName = () => '',
  onRowClick,
  keyExtractor = (_, index) => index,
  pagination = true,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyMessage,
  stickyHeader = false,
  loadingOverlay = false,
  selectionMode = false,
  selectedIds = [],
  onSelectRow,
  idExtractor = (row: any) => row.id,
  onFilter,
  initialFilters,
  customFilterElement,
  exportOptions,
  renderActions,
}: DataTableProps<T>) => {
  // const { t } = useTranslation();
  
  // Default empty message
  const defaultEmptyMessage = "Nessun dato disponibile";
  
  // Use provided or default empty message
  const displayEmptyMessage = emptyMessage || defaultEmptyMessage;
  
  // Gestione ordinamento
  const { sortedData, sortKey, sortDirection, setSorting } = useSorting<T>({
    data,
  });
  
  // Gestione paginazione
  const {
    paginatedData,
    totalPages,
    currentPage,
    pageSize,
    totalItems,
    goToPage,
    setPageSize,
  } = usePagination<T>({
    data: sortedData,
    pageSize: initialPageSize,
  });
  
  // Determina i dati da visualizzare
  const displayData = pagination ? paginatedData : sortedData;
  
  // Handler per il click sull'header della colonna
  const handleSortColumn = (colKey: string, direction: SortDirection) => {
    setSorting(colKey, direction);
  };
  
  // Rendering dell'header per una colonna
  const renderColumnHeader = (column: DataTableColumn<T>) => {
    if (column.renderHeader) {
      return column.renderHeader(column);
    }
    
    // Se la label è vuota, non renderizzare nulla
    if (!column.label && !column.header) {
      return <span></span>;
    }
    
    const sortableKey = column.sortKey || column.key;
    
    if (column.sortable) {
      return (
        <SortableColumn
          label={column.label || column.header || ''}
          sortKey={sortableKey}
          currentSortKey={sortKey || undefined}
          currentDirection={sortDirection}
          onSort={handleSortColumn}
        />
      );
    }
    
    return column.label || column.header || '';
  };
  
  // Rendering di una cella
  const renderCell = (row: T, column: DataTableColumn<T>, rowIndex: number) => {
    // Special case for actions column
    if (column.key === 'actions' && renderActions) {
      return renderActions(row);
    }
    
    if (column.renderCell) {
      return column.renderCell(row, rowIndex);
    }
    
    // Fallback per accedere ai valori delle proprietà
    const value = (row as any)[column.key];
    return value !== undefined ? String(value) : '';
  };
  
  // Handler per il cambio pagina
  const handlePageChange = (page: number) => {
    goToPage(page);
  };
  
  // Handler per il cambio dimensione pagina
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  // Handler for exports
  const handleExport = (format: 'csv' | 'excel') => {
    if (exportOptions?.onExport) {
      exportOptions.onExport(format);
    }
  };
  
  return (
    <div className={`w-full relative ${className}`}>
      {/* Optional custom filter element */}
      {customFilterElement && (
        <div className="mb-4">
          {customFilterElement}
        </div>
      )}
      
      {/* Export options */}
      {exportOptions?.show && (
        <div className="flex justify-end mb-4 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExport('csv')}
          >
            Esporta CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExport('excel')}
          >
            Esporta Excel
          </Button>
        </div>
      )}
      
      {/* Loading overlay */}
      {loadingOverlay && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Tabella */}
      <div className="w-full overflow-x-auto">
        <table className={`w-full divide-y divide-gray-200 ${tableClassName}`}>
          <thead className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''} ${theadClassName}`}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {renderColumnHeader(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`bg-white divide-y divide-gray-200 ${tbodyClassName}`}>
            {displayData.length > 0 ? (
              displayData.map((row, rowIndex) => {
                const rowId = idExtractor(row);
                // Assicurati che selectedIds sia un array prima di usare includes
                const isSelected = Array.isArray(selectedIds) && selectedIds.includes(rowId);
                
                return (
                  <tr
                    key={keyExtractor(row, rowIndex)}
                    className={`hover:bg-gray-50 ${trClassName(row, rowIndex)} ${isSelected ? 'bg-blue-50' : ''}`}
                    onClick={() => onRowClick && onRowClick(row, rowIndex)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {columns.map((column) => (
                      <td
                        key={`${keyExtractor(row, rowIndex)}-${column.key}`}
                        className="px-4 py-3 whitespace-nowrap text-sm text-gray-500"
                      >
                        {renderCell(row, column, rowIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  {displayEmptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Paginazione */}
      {pagination && totalPages > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-700">
            <span>
              Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalItems)} di {totalItems} risultati
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Page size selector */}
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size} per pagina</option>
              ))}
            </select>
            
            {/* Previous button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page numbers */}
            <span className="text-sm text-gray-700">
              Pagina {currentPage} di {totalPages}
            </span>
            
            {/* Next button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export type { DataTableColumn };
export default DataTable;
