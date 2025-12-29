import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
// Removed unused imports: ArrowUpDown, GripHorizontal, saveTablePreferences
import { cn } from '../../design-system/utils';

export interface ResizableTableColumn<T = { id?: string | number }> {
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

interface ResizableTableProps<T = { id?: string | number }> {
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

const ResizableTable = <T extends { id?: string | number } = { id?: string | number }>({
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
  // Utility helpers to prevent unnecessary state updates
  const arraysShallowEqual = (a: string[] = [], b: string[] = []) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  const objectsShallowEqual = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
    if (a === b) return true;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (a[k] !== b[k]) return false;
    }
    return true;
  };

  // Attempt to load preferences from local storage first
  const initialState = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        loadedWidths: {},
        loadedHiddenColumns: [],
        loadedColumnOrder: {},
      } as {
        loadedWidths: Record<string, number>;
        loadedHiddenColumns: string[];
        loadedColumnOrder: Record<string, number>;
      };
    }

    try {
      return {
        loadedWidths: JSON.parse(localStorage.getItem(`${tableName}-column-widths`) || '{}'),
        loadedHiddenColumns: JSON.parse(localStorage.getItem(`${tableName}-hidden-columns`) || '[]'),
        loadedColumnOrder: JSON.parse(localStorage.getItem(`${tableName}-column-order`) || '{}'),
      } as {
        loadedWidths: Record<string, number>;
        loadedHiddenColumns: string[];
        loadedColumnOrder: Record<string, number>;
      };
    } catch (e) {
      console.error("Error parsing localStorage:", e);
      return {
        loadedWidths: {},
        loadedHiddenColumns: [],
        loadedColumnOrder: {},
      } as {
        loadedWidths: Record<string, number>;
        loadedHiddenColumns: string[];
        loadedColumnOrder: Record<string, number>;
      };
    }
  }, [tableName]);
  const { loadedWidths, loadedHiddenColumns, loadedColumnOrder } = initialState;

  // Set default widths from column definitions (memoized to avoid changing on each render)
  const defaultWidths = useMemo(() => (
    Object.fromEntries(columns.map((col) => [col.key, col.width || 120]))
  ), [columns]);

  // Initialize with saved data or defaults
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    ...defaultWidths,
    ...loadedWidths,
    ...initialWidths
  });

  // Mantieni colWidths allineato quando cambia l'elenco delle colonne
  useEffect(() => {
    // Costruisci il prossimo stato mantenendo solo le colonne correnti
    const keys = columns.map(c => c.key);
    const next: Record<string, number> = {};
    let changed = false;

    for (const key of keys) {
      const target = colWidths[key] ?? defaultWidths[key] ?? 120;
      next[key] = target;
      if (colWidths[key] !== target) changed = true;
    }

    // Se il numero di chiavi è diverso, significa che sono state aggiunte/rimosse colonne
    if (Object.keys(colWidths).length !== keys.length) changed = true;

    if (changed) {
      setColWidths(next);
    }
  }, [columns, defaultWidths, colWidths]);

  // Keep latest colWidths in a ref for event handlers
  const colWidthsRef = useRef(colWidths);
  useEffect(() => {
    colWidthsRef.current = colWidths;
  }, [colWidths]);

  const [localHiddenColumns, setLocalHiddenColumns] = useState<string[]>(() => {
    // Combina colonne con hidden: true dalla definizione + hiddenColumns prop + localStorage
    const columnsWithHiddenFlag = columns.filter(col => col.hidden).map(col => col.key);
    const propsHidden = hiddenColumns.length > 0 ? hiddenColumns : loadedHiddenColumns;
    const combined = Array.from(new Set([...columnsWithHiddenFlag, ...propsHidden]));
    return combined;
  });

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
    startWidth.current = colWidthsRef.current[colKey] || columns.find(c => c.key === colKey)?.width || 120;

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

      const currentCol = resizingCol.current;
      const latest = colWidthsRef.current;
      // Create a new widths object with the updated width from the latest state
      const updatedWidths = {
        ...latest,
        [currentCol]: latest[currentCol] ?? defaultWidths[currentCol]
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
    const columnsWithHiddenFlag = columns.filter(col => col.hidden).map(col => col.key);
    const combined = Array.from(new Set([...columnsWithHiddenFlag, ...hiddenColumns]));
    setLocalHiddenColumns(prev => (arraysShallowEqual(prev, combined) ? prev : combined));
  }, [hiddenColumns, columns]);

  // Apply column order changes from external sources
  useEffect(() => {
    if (Object.keys(columnOrder).length > 0) {
      setEffectiveColumnOrder(prev => (objectsShallowEqual(prev, columnOrder as Record<string, number>) ? prev : columnOrder));
    }
  }, [columnOrder]);

  // Apply width changes from external sources (only if actually different)
  useEffect(() => {
    if (Object.keys(initialWidths).length > 0) {
      let hasDiff = false;
      for (const k of Object.keys(initialWidths)) {
        if (colWidths[k] !== initialWidths[k]!) {
          hasDiff = true;
          break;
        }
      }
      if (hasDiff) {
        setColWidths(prev => ({
          ...prev,
          ...initialWidths
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // Rimosso reset automatico delle larghezze: evita side-effect su mount che possono causare loop
  // Se necessario, esporre un controllo esplicito fuori da questo componente per pulire le preferenze

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