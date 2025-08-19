import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, { DataTableColumn } from './DataTable';

interface ResizableColumnProps extends DataTableColumn {
  initialWidth?: number;
  header?: string;
}

export interface ResizableDataTableProps<T = any> {
  columns: ResizableColumnProps[];
  data: T[];
  className?: string;
  tableClassName?: string;
  theadClassName?: string;
  tbodyClassName?: string;
  trClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  keyExtractor?: (row: T, index: number) => string | number;
  keyField?: string;
  pagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  stickyHeader?: boolean;
  loadingOverlay?: boolean;
  minColumnWidth?: number;
  selectable?: boolean;
  selectionMode?: boolean;
  selectedIds?: string[];
  onSelectRow?: (row: T, selected: boolean) => void;
  onSelect?: (id: any) => void;
  idExtractor?: (row: T) => string;
  renderActions?: (row: T) => React.ReactNode;
}

const ResizableDataTable = <T extends object>({
  columns,
  minColumnWidth = 50,
  ...props
}: ResizableDataTableProps<T>) => {
  const { t } = useTranslation();
  
  // Converti header in label per compatibilità
  const processedColumns = columns.map(col => ({
    ...col,
    label: col.label || col.header || col.key // Usa label se presente, altrimenti header, altrimenti key
  }));
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    processedColumns.reduce((acc, col) => {
      acc[col.key] = col.initialWidth || col.width || 150;
      return acc;
    }, {} as Record<string, number>)
  );
  
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const startPositionRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  
  // Handle start of column resize
  const handleResizeStart = useCallback((key: string, startPosition: number) => {
    setResizingColumn(key);
    startPositionRef.current = startPosition;
    startWidthRef.current = columnWidths[key];
  }, [columnWidths]);
  
  // Handle column resize
  const handleResize = useCallback((clientX: number) => {
    if (!resizingColumn) return;
    
    const deltaX = clientX - startPositionRef.current;
    const newWidth = Math.max(minColumnWidth, startWidthRef.current + deltaX);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  }, [resizingColumn, minColumnWidth]);
  
  // Handle end of column resize
  const handleResizeEnd = useCallback(() => {
    setResizingColumn(null);
  }, []);
  
  // Add event listeners for resize
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleResize(e.clientX);
    };
    
    const handleMouseUp = () => {
      handleResizeEnd();
    };
    
    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, handleResize, handleResizeEnd]);
  
  // Create resizable columns
  const resizableColumns = useMemo(() => {
    return processedColumns.map(column => {
      // Use stored width or default
      const width = columnWidths[column.key];
      
      return {
        ...column,
        width,
        renderHeader: (col: DataTableColumn<T>) => {
          return (
            <div className="flex items-center w-full select-none">
              <div className="flex-grow">
                {column.renderHeader ? column.renderHeader(col) : column.label}
              </div>
              <div
                className="w-2 h-full cursor-col-resize ml-2 flex items-center justify-center"
                onMouseDown={(e) => handleResizeStart(column.key, e.clientX)}
              >
                <div className={`w-px h-4 bg-gray-300 ${resizingColumn === column.key ? 'bg-blue-500' : ''}`} />
              </div>
            </div>
          );
        }
      };
    });
  }, [processedColumns, columnWidths, handleResizeStart, resizingColumn]);
  
  // Optional columnToggle UI could be added here
  
  return (
    <div className={`${resizingColumn ? 'cursor-col-resize select-none' : ''}`}>
      <DataTable
        columns={resizableColumns}
        {...props}
      />
    </div>
  );
};

export default ResizableDataTable; 