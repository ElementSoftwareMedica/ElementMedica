import React, { useState, useCallback, useMemo } from 'react';

interface UseFilterSearchResult<T> {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterActive: boolean;
  toggleFilter: () => void;
  filterItems: (items: T[]) => T[];
  resetFilters: () => void;
}

interface UseFilterSearchOptions<T> {
  searchKeys?: (keyof T)[];
  defaultSearchTerm?: string;
  defaultFilterActive?: boolean;
  customFilter?: (item: T, searchTerm: string) => boolean;
}

/**
 * A custom hook for managing search and filter functionality
 */
function useFilterSearch<T>(options?: UseFilterSearchOptions<T>): UseFilterSearchResult<T> {
  const { 
    searchKeys = [], 
    defaultSearchTerm = '', 
    defaultFilterActive = false,
    customFilter
  } = options || {};

  const [searchTerm, setSearchTerm] = useState(defaultSearchTerm);
  const [filterActive, setFilterActive] = useState(defaultFilterActive);

  const toggleFilter = useCallback(() => {
    setFilterActive(prev => !prev);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterActive(false);
  }, []);

  const filterItems = useCallback((items: T[]): T[] => {
    if (!searchTerm.trim() || !filterActive) {
      return items;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();

    return items.filter(item => {
      if (customFilter) {
        return customFilter(item, lowerSearchTerm);
      }

      // Default search implementation, searches across specified keys
      if (searchKeys.length === 0) {
        // If no keys specified, convert the whole item to string and search
        return JSON.stringify(item).toLowerCase().includes(lowerSearchTerm);
      }

      return searchKeys.some(key => {
        const value = item[key];
        if (value === undefined || value === null) return false;
        return String(value).toLowerCase().includes(lowerSearchTerm);
      });
    });
  }, [searchTerm, filterActive, customFilter, searchKeys]);

  return {
    searchTerm,
    setSearchTerm,
    filterActive,
    toggleFilter,
    filterItems,
    resetFilters
  };
}

export default useFilterSearch;