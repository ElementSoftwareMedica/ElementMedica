import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
// Removed unused imports: ArrowUpDown, GripHorizontal, saveTablePreferences
import { cn } from '../../design-system/utils';

export interface ResizableTableColumn<T = Record<string, unknown> & { id?: string | number }> {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  hidden?: boolean;
  order?: number;
  renderHeader?: (col: ResizableTableColumn<T>) => React.ReactNode;
  renderCell?: (row: T, col: ResizableTableColumn<T>, rowIndex: number) => React.ReactNode;
}

export type SortDirection = 'asc' | 'desc' | null;

interface ResizableTableProps<T = Record<string, unknown> & { id?: string | number }> {
  columns: ResizableTableColumn<T>[];
  data: T[];
  tableProps?: React.TableHTMLAttributes<HTMLTableElement>;
  tbodyProps?: React.HTMLAttributes<HTMLTableSectionElement>;
  onWidthsChange?: (widths: Record<string, number>) => void;
  initialWidths?: Record<string, number>;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T, index: number) => string;
  onSort?: (key: string, direction: SortDirection) => void;
  sortKey?: string;
  sortDirection?: SortDirection;
  hiddenColumns?: string[];
  // Removed unused props: onColumnVisibilityChange, onColumnOrderChange
  columnOrder?: Record<string, number>;
  tableName?: string;
  zebra?: boolean;
}

const ResizableTable = <T extends Record<string, unknown> & { id?: string | number } = Record<string, unknown> & { id?: string | number }>({
  columns,
  data,
  tableProps = {},
  tbodyProps = {},
  onWidthsChange,
  initialWidths = {},
  onRowClick,
  rowClassName,
  onSort,
  sortKey,
  sortDirection,
  hiddenColumns = [],
  // Removed unused props: onColumnVisibilityChange, onColumnOrderChange
  columnOrder = {},
  tableName = 'table',
  zebra = false,
}: ResizableTableProps<T>) => {
  // Attempt to load preferences from local storage first
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return {
        loadedWidths: {},
        loadedHiddenColumns: [],
        loadedColumnOrder: {},
      };
    }
    
    try {
      return {
        loadedWidths: JSON.parse(localStorage.getItem(`${tableName}-column-widths`) || '{}'),
        loadedHiddenColumns: JSON.parse(localStorage.getItem(`${tableName}-hidden-columns`) || '[]'),
        loadedColumnOrder: JSON.parse(localStorage.getItem(`${tableName}-column-order`) || '{}'),
      };
    } catch (e) {
      console.error("Error parsing localStorage:", e);
      return {
        loadedWidths: {},
        loadedHiddenColumns: [],
        loadedColumnOrder: {},
      };
    }
  };
  
  const { loadedWidths, loadedHiddenColumns, loadedColumnOrder } = getInitialState();
  
  // Set default widths from column definitions
  const defaultWidths = Object.fromEntries(
    columns.map((col) => [col.key, col.width || 120])
  );
  
  // Initialize with saved data or defaults
  const [colWidths, setColWidths] = useState<Record<string, number>>({ 
    ...defaultWidths, 
    ...loadedWidths,
    ...initialWidths 
  });
  
  const [localHiddenColumns, setLocalHiddenColumns] = useState<string[]>(
    hiddenColumns.length > 0 ? hiddenColumns : loadedHiddenColumns
  );
  
  const [effectiveColumnOrder, setEffectiveColumnOrder] = useState(
    Object.keys(columnOrder).length > 0 ? columnOrder : loadedColumnOrder
  );
  
  // Refs for resize handling
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Removed draggingCol and dropTargetCol - drag and drop not used
  
  const minColWidth = 50; // Minimum column width
  
  // Array of visible columns (not hidden)
  const visibleColumns = useMemo(() => {
    return columns.filter(col => !localHiddenColumns.includes(col.key));
  }, [columns, localHiddenColumns]);
  
  // Check if column is the last visible one
  const isLastVisibleColumn = (col: ResizableTableColumn<T>) => {
    const lastCol = visibleColumns[visibleColumns.length - 1];
    return lastCol && lastCol.key === col.key;
  };
  
  // Sort columns by order
  const orderedColumns = [...columns].sort((a, b) => {
    const orderA = effectiveColumnOrder[a.key] ?? columns.findIndex(c => c.key === a.key);
    const orderB = effectiveColumnOrder[b.key] ?? columns.findIndex(c => c.key === b.key);
    return orderA - orderB;
  });
  
  // Filter out hidden columns
  const sortedColumns = orderedColumns.filter(col => !localHiddenColumns.includes(col.key));
  
  // Save preferences to localStorage only
  const savePreferences = (type: 'widths' | 'hiddenColumns' | 'order', data: unknown) => {
    // Only save to localStorage - no API calls
    if (typeof window === 'undefined') return;
    
    try {
      if (type === 'widths') {
        localStorage.setItem(`${tableName}-column-widths`, JSON.stringify(data));
      } else if (type === 'hiddenColumns') {
        localStorage.setItem(`${tableName}-hidden-columns`, JSON.stringify(data));
      } else if (type === 'order') {
        localStorage.setItem(`${tableName}-column-order`, JSON.stringify(data));
      }
    } catch (error) {
      // Silent error handling
      console.error('Failed to save preferences to localStorage:', error);
    }
  };
  
  // Handle column resize start with improved event handling
  const handleResizeStart = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set the active column being resized
    resizingCol.current = colKey;
    startX.current = e.clientX;
    startWidth.current = colWidths[colKey] || columns.find(c => c.key === colKey)?.width || 120;
    
    // Setup mouse move and mouse up handlers
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingCol.current) return;
      e.preventDefault();
      e.stopPropagation();
      
      // Get the current width and calculate difference
      const diff = e.clientX - startX.current;
      
      // Calculate new width with a minimum to ensure columns stay visible
      const newWidth = Math.max(startWidth.current + diff, minColWidth);
      
      // Update the width in state
      setColWidths(prev => ({
        ...prev,
        [resizingCol.current!]: newWidth
      }));
    };
    
    const handleMouseUp = () => {
      if (!resizingCol.current) return;
      
      // Create a new widths object with the updated width
      const updatedWidths = {
        ...colWidths,
        [resizingCol.current]: colWidths[resizingCol.current!] || defaultWidths[resizingCol.current!]
      };
      
      // Save the new width to localStorage
      savePreferences('widths', updatedWidths);
      
      // Notify parent if needed
      if (onWidthsChange) {
        onWidthsChange(updatedWidths);
      }
      
      // Reset the resizing column state
      resizingCol.current = null;
      document.body.style.cursor = '';
      
      // Remove the event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // Apply cursor to whole document while resizing
    document.body.style.cursor = 'col-resize';
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Handle column sort click
  const handleSortClick = (colKey: string) => {
    if (!onSort) return;
    
    let direction: SortDirection = 'asc';
    if (sortKey === colKey) {
      // Toggle between asc and desc only (eliminating null state)
      direction = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    onSort(colKey, direction);
  };
  
  // Render column header content
  const renderColumnHeader = (col: ResizableTableColumn<T>) => {
    if (col.renderHeader) {
      return col.renderHeader(col);
    }
    
    // Default rendering
    return (
      <div className="flex items-center justify-between w-full">
        <span className="font-semibold truncate">{col.label}</span>
      </div>
    );
  };

  // Removed drag and drop functions - not used in current implementation
  // Removed handleColumnVisibilityChange - not used in current implementation

  // Apply column visibility changes from external sources
  useEffect(() => {
    if (hiddenColumns.length > 0) {
      setLocalHiddenColumns(hiddenColumns);
    }
  }, [hiddenColumns]);
  
  // Apply column order changes from external sources
  useEffect(() => {
    if (Object.keys(columnOrder).length > 0) {
      setEffectiveColumnOrder(columnOrder);
    }
  }, [columnOrder]);
  
  // Apply width changes from external sources
  useEffect(() => {
    if (Object.keys(initialWidths).length > 0) {
      setColWidths(prev => ({
        ...prev,
        ...initialWidths
      }));
    }
  }, [initialWidths]);
  
  // Render table header cell with sorting and resizing
  const renderHeaderCell = (col: ResizableTableColumn<T>) => {
    // Don't render header cell for hidden columns
    if (col.hidden || localHiddenColumns.includes(col.key)) {
      return null;
    }
    
    const width = colWidths[col.key] || col.width || 200;
    const isSorted = sortKey === col.key;
    
    const onSortClick = () => {
      if (!col.sortable) return;
      handleSortClick(col.key);
    };
    
    return (
      <th 
        key={col.key}
        style={{ 
          width: `${width}px`, 
          minWidth: `${width}px`,
        }}
        className={cn(
          'relative px-4 py-3 select-none border-b border-blue-100',
          'font-medium text-left text-sm',
          isSorted ? 'bg-blue-100' : '',
        )}
      >
        <div 
          className={cn(
            'flex items-center gap-1',
            col.sortable ? 'cursor-pointer group' : ''
          )}
          onClick={col.sortable ? onSortClick : undefined}
        >
          {renderColumnHeader(col)}
          
          {col.sortable && (
            <div className={cn(
              'flex-shrink-0 h-4 w-4 opacity-0 group-hover:opacity-70',
              isSorted ? 'opacity-100 text-blue-600' : ''
            )}>
              {isSorted ? (
                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
              ) : null}
            </div>
          )}
        </div>
        
        {/* Resize handle */}
        {!isLastVisibleColumn(col) && (
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 hover:bg-blue-400 hover:opacity-50",
              "flex items-center justify-center group"
            )}
            onMouseDown={(e) => handleResizeStart(col.key, e)}
          >
            <div className="w-px h-4/5 bg-blue-200 group-hover:bg-white"></div>
          </div>
        )}
      </th>
    );
  };
  
  // Render table cell with proper content
  const renderCell = (row: T, col: ResizableTableColumn<T>, rowIndex: number) => {
    // Don't render cell for hidden columns
    if (col.hidden || localHiddenColumns.includes(col.key)) {
      return null;
    }
    
    const width = colWidths[col.key] || col.width || 200;
    const isLastColumn = isLastVisibleColumn(col);
    const isFirstColumn = col.key === 'actions';
    
    const rowBgClass = zebra && rowIndex % 2 === 1 ? 'bg-gray-50' : 'bg-white';
    
    return (
      <td 
        key={`${rowIndex}-${col.key}`}
        style={{ 
          width: `${width}px`, 
          minWidth: `${width}px`,
          maxWidth: `${width}px`,
        }}
        className={cn(
          'px-4 py-3 overflow-hidden text-sm text-gray-700 align-middle',
          isFirstColumn ? 'sticky left-0 z-20' : '',
          isLastColumn ? 'sticky right-0 z-10' : '', 
          rowBgClass
        )}
      >
        {col.renderCell ? (
          col.renderCell(row, col, rowIndex)
        ) : (
          <div className="truncate">
            {String(row[col.key as keyof T] ?? '')}
          </div>
        )}
      </td>
    );
  };
  
  // Utility function to reset column widths in localStorage
  const resetColumnWidths = useCallback(() => {
    const itemsToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('-column-widths')) {
        itemsToRemove.push(key);
      }
    }
    
    itemsToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Non ricaricare la pagina per evitare loop infiniti
    // Reimpostare solo lo stato delle larghezze
    setColWidths({...defaultWidths, ...initialWidths});
  }, [defaultWidths, initialWidths]);
  
  // Esegui il reset una sola volta all'avvio per risolvere il problema
  useEffect(() => {
    resetColumnWidths();
    // Importante: Il secondo parametro vuoto [] indica che l'effetto viene eseguito solo una volta
  }, [resetColumnWidths]);
  
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm" ref={tableContainerRef}>
      <table 
        {...tableProps} 
        className={cn(
          'w-full border-collapse border-spacing-0',
          tableProps?.className
        )}
      >
        <thead className="bg-blue-50 text-blue-900 sticky top-0 z-10">
          <tr>
            {sortedColumns.map(col => renderHeaderCell(col))}
          </tr>
        </thead>
        <tbody {...tbodyProps}>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-gray-200 last:border-0 whitespace-nowrap',
                zebra && rowIndex % 2 === 1 ? 'bg-gray-50' : 'bg-white',
                rowClassName ? rowClassName(row, rowIndex) : '',
                onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
              )}
            >
              {sortedColumns.map((col) => renderCell(row, col, rowIndex))}
            </tr>
          ))}
          
          {data.length === 0 && (
            <tr>
              <td 
                colSpan={sortedColumns.length} 
                className="p-6 text-center text-gray-500"
              >
                Nessun dato disponibile
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ResizableTable;