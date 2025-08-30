import React, { useState, useRef, useCallback, useEffect } from 'react';

interface UseResizableOptions {
  initialWidths: Record<string, number>;
  minWidth?: number;
}

interface UseResizableReturn {
  colWidths: Record<string, number>;
  handleResizeStart: (colKey: string, e: React.MouseEvent) => void;
}

/**
 * Hook per gestire il ridimensionamento delle colonne nelle tabelle
 * 
 * @param options Opzioni di configurazione
 * @returns Oggetto con le larghezze delle colonne e handler di ridimensionamento
 */
export function useResizable({ initialWidths, minWidth = 40 }: UseResizableOptions): UseResizableReturn {
  const [colWidths, setColWidths] = useState<Record<string, number>>(initialWidths);
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingCol.current) return;
    const diff = e.clientX - startX.current;
    const colKeys = Object.keys(colWidths);
    const col = resizingCol.current;
    const newWidth = Math.max(minWidth, startWidth.current + diff);
    
    setColWidths(prevWidths => {
      const delta = newWidth - prevWidths[col];
      // Distribute -delta among other columns
      const otherCols = colKeys.filter(k => k !== col);
      const newColWidths = {...prevWidths, [col]: newWidth};
      let remainingDelta = -delta;
      
      otherCols.forEach((k, i) => {
        if (i === otherCols.length - 1) {
          newColWidths[k] = Math.max(minWidth, newColWidths[k] + remainingDelta);
        } else {
          const share = remainingDelta / (otherCols.length - i);
          const applied = Math.min(newColWidths[k] - minWidth, share);
          newColWidths[k] = Math.max(minWidth, newColWidths[k] + applied);
          remainingDelta -= applied;
        }
      });
      
      return newColWidths;
    });
  }, [colWidths, minWidth]);

  const handleResizeEnd = useCallback(() => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = useCallback((colKey: string, e: React.MouseEvent) => {
    resizingCol.current = colKey;
    startX.current = e.clientX;
    startWidth.current = colWidths[colKey];
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [colWidths, handleResizeMove, handleResizeEnd]);

  // Pulizia degli event listener
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  return {
    colWidths,
    handleResizeStart
  };
}

export default useResizable;