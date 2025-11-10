/**
 * @file useRowSelection.ts
 * @description Hook for managing row selection and operations
 */

import { useState, useCallback, useEffect } from 'react';

interface UseRowSelectionProps {
  previewData: any[];
  onSelectedRowsChange?: (selectedIds: string[]) => void;
}

export const useRowSelection = ({
  previewData,
  onSelectedRowsChange,
}: UseRowSelectionProps) => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedRowsForImport, setSelectedRowsForImport] = useState<Set<number>>(new Set());

  /**
   * Toggle row for overwrite
   */
  const handleToggleOverwrite = useCallback((rowId: string) => {
    const newSelectedRows = selectedRows.includes(rowId) 
      ? selectedRows.filter(id => id !== rowId)
      : [...selectedRows, rowId];
    
    setSelectedRows(newSelectedRows);
    
    // Notify parent of change
    if (onSelectedRowsChange) {
      onSelectedRowsChange(newSelectedRows);
    }
  }, [selectedRows, onSelectedRowsChange]);

  /**
   * Handle row selection change for import
   */
  const handleRowSelectionChange = useCallback((selectedRows: Set<number>) => {
    setSelectedRowsForImport(selectedRows);
  }, []);

  /**
   * Initialize row selection when preview data changes
   */
  useEffect(() => {
    if (previewData && previewData.length > 0) {
      // Select all rows by default
      const allRowIndices = new Set(Array.from({ length: previewData.length }, (_, i) => i));
      setSelectedRowsForImport(allRowIndices);
    }
  }, [previewData]);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedRows([]);
    setSelectedRowsForImport(new Set());
  }, []);

  /**
   * Select all rows
   */
  const selectAll = useCallback(() => {
    if (previewData && previewData.length > 0) {
      const allRowIndices = new Set(Array.from({ length: previewData.length }, (_, i) => i));
      setSelectedRowsForImport(allRowIndices);
    }
  }, [previewData]);

  return {
    selectedRows,
    selectedRowsForImport,
    handleToggleOverwrite,
    handleRowSelectionChange,
    clearSelection,
    selectAll,
    setSelectedRows,
    setSelectedRowsForImport,
  };
};
