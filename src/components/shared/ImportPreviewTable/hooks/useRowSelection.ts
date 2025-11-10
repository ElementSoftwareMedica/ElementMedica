import { useState, useCallback } from 'react';

interface UseRowSelectionReturn {
  selectedRows: Set<number>;
  selectAll: () => void;
  deselectAll: () => void;
  toggleRow: (rowIndex: number) => void;
  isRowSelected: (rowIndex: number) => boolean;
  areAllRowsSelected: boolean;
  areSomeRowsSelected: boolean;
}

/**
 * Hook for managing row selection state in import tables
 * 
 * Provides methods for selecting, deselecting, and toggling individual rows or all rows
 * 
 * @param rowCount - Total number of rows in the table
 * @param initialSelection - Optional initial set of selected row indices
 * @returns Selection state and manipulation methods
 */
export function useRowSelection(
  rowCount: number,
  initialSelection: Set<number> = new Set()
): UseRowSelectionReturn {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(initialSelection);

  const selectAll = useCallback(() => {
    setSelectedRows(new Set(Array.from({ length: rowCount }, (_, i) => i)));
  }, [rowCount]);

  const deselectAll = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const toggleRow = useCallback((rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  }, []);

  const isRowSelected = useCallback((rowIndex: number) => {
    return selectedRows.has(rowIndex);
  }, [selectedRows]);

  const areAllRowsSelected = rowCount > 0 && selectedRows.size === rowCount;
  const areSomeRowsSelected = selectedRows.size > 0 && selectedRows.size < rowCount;

  return {
    selectedRows,
    selectAll,
    deselectAll,
    toggleRow,
    isRowSelected,
    areAllRowsSelected,
    areSomeRowsSelected
  };
}
