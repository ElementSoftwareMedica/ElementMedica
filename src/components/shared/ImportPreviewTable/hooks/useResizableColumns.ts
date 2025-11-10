import { useState, useRef, useEffect } from 'react';

export interface ImportPreviewColumn {
  key: string;
  label: string;
  minWidth: number;
  width?: number;
}

interface UseResizableColumnsReturn {
  colWidths: Record<string, number>;
  handleResizeStart: (colKey: string, e: React.MouseEvent) => void;
  isResizing: boolean;
}

/**
 * Hook for managing resizable table columns
 * 
 * Handles mouse events for column resizing with minimum width constraints
 * 
 * @param columns - Array of column definitions with keys and width constraints
 * @returns Column widths and resize handlers
 */
export function useResizableColumns(columns: ImportPreviewColumn[]): UseResizableColumnsReturn {
  // Initialize column widths from column definitions
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    columns.forEach(col => {
      widths[col.key] = col.width || col.minWidth;
    });
    return widths;
  });

  // Refs for tracking resize state
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleResizing = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    
    const diff = e.clientX - startX.current;
    const col = resizingCol.current;
    const minWidth = columns.find(c => c.key === col)?.minWidth || 40;
    const newWidth = Math.max(minWidth, startWidth.current + diff);
    
    setColWidths(w => ({ ...w, [col]: newWidth }));
  };

  const handleResizeEnd = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleResizing);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeStart = (colKey: string, e: React.MouseEvent) => {
    resizingCol.current = colKey;
    startX.current = e.clientX;
    startWidth.current = colWidths[colKey];
    
    document.addEventListener('mousemove', handleResizing);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizing);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  return {
    colWidths,
    handleResizeStart,
    isResizing: resizingCol.current !== null
  };
}
