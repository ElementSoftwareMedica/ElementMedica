import React, { useState, useCallback } from 'react';

interface UseSelectionResult<T extends string | number> {
  selectedIds: T[];
  isSelected: (id: T) => boolean;
  toggleSelect: (id: T) => void;
  toggleSelected: (id: T) => void;
  selectAll: (ids: T[]) => void;
  deselectAll: () => void;
  toggleSelectAll: (ids: T[]) => void;
}

/**
 * A custom hook for managing selection in lists and tables
 */
function useSelection<T extends string | number>(): UseSelectionResult<T> {
  const [selectedIds, setSelectedIds] = useState<T[]>([]);

  // Ensure we're working with an array to prevent "includes is not a function" errors
  const isSelectedArray = useCallback((id: T, arr: T[]): boolean => {
    return Array.isArray(arr) ? arr.includes(id) : false;
  }, []);
  
  const isSelected = useCallback((id: T) => isSelectedArray(id, selectedIds), [selectedIds, isSelectedArray]);

  const toggleSelect = useCallback((id: T) => {
    setSelectedIds(current => 
      isSelectedArray(id, current)
        ? current.filter(itemId => itemId !== id) 
        : [...current, id]
    );
  }, [isSelectedArray]);

  const selectAll = useCallback((ids: T[]) => {
    setSelectedIds(Array.isArray(ids) ? ids : []);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const toggleSelectAll = useCallback((ids: T[]) => {
    setSelectedIds(current => 
      Array.isArray(current) && current.length === ids.length ? [] : (Array.isArray(ids) ? ids : [])
    );
  }, []);

  return {
    selectedIds,
    isSelected,
    toggleSelect,
    toggleSelected: toggleSelect,
    selectAll,
    deselectAll,
    toggleSelectAll,
  };
}

export default useSelection;