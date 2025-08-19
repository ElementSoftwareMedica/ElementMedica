import { useState, useMemo, useCallback } from 'react';

/**
 * Hook per la gestione di filtri, ricerca e ordinamento delle entità
 * Centralizza tutta la logica di filtraggio e ordinamento
 */
export interface FilterOption {
  key: string;
  label: string;
  options: Array<{ label: string; value: string }>;
}

export interface SortOption {
  key: string;
  label: string;
}

export interface ActiveSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface UseEntityFiltersProps<T> {
  entities: T[];
  searchFields: (keyof T)[];
  filterOptions?: FilterOption[];
  sortOptions?: SortOption[];
}

export interface UseEntityFiltersReturn<T> {
  filteredEntities: T[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilters: Record<string, string>;
  setActiveFilters: (filters: Record<string, string>) => void;
  activeSort: ActiveSort | undefined;
  setActiveSort: (sort: ActiveSort | undefined) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

export const useEntityFilters = <T extends Record<string, any>>({
  entities,
  searchFields,
  filterOptions = [],
  sortOptions = []
}: UseEntityFiltersProps<T>): UseEntityFiltersReturn<T> => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [activeSort, setActiveSort] = useState<ActiveSort | undefined>(undefined);

  // Verifica se ci sono filtri attivi
  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' || 
           Object.values(activeFilters).some(value => value !== '') ||
           activeSort !== undefined;
  }, [searchQuery, activeFilters, activeSort]);

  // Applica filtri
  const applyFilters = useCallback((data: T[]): T[] => {
    let filtered = data;
    
    // Applica filtri attivi
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(entity => {
          const entityValue = entity[key];
          return entityValue === value || String(entityValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });
    
    return filtered;
  }, [activeFilters]);

  // Applica ricerca
  const applySearch = useCallback((data: T[]): T[] => {
    if (!searchQuery) return data;
    
    const searchLower = searchQuery.toLowerCase();
    return data.filter(entity => {
      return searchFields.some(field => {
        const value = entity[field];
        return value && String(value).toLowerCase().includes(searchLower);
      });
    });
  }, [searchQuery, searchFields]);

  // Applica ordinamento
  const applySort = useCallback((data: T[]): T[] => {
    if (!activeSort) return data;
    
    return [...data].sort((a, b) => {
      const valueA = a[activeSort.field];
      const valueB = b[activeSort.field];
      
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return activeSort.direction === 'asc' ? -1 : 1;
      if (valueB == null) return activeSort.direction === 'asc' ? 1 : -1;
      
      const compareValueA = typeof valueA === 'string' ? valueA.toLowerCase() : valueA;
      const compareValueB = typeof valueB === 'string' ? valueB.toLowerCase() : valueB;
      
      if (compareValueA < compareValueB) return activeSort.direction === 'asc' ? -1 : 1;
      if (compareValueA > compareValueB) return activeSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeSort]);

  // Calcola entità filtrate
  const filteredEntities = useMemo(() => {
    let result = entities;
    
    // Applica filtri in sequenza
    result = applyFilters(result);
    result = applySearch(result);
    result = applySort(result);
    
    return result;
  }, [entities, applyFilters, applySearch, applySort]);

  // Pulisce tutti i filtri
  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setActiveFilters({});
    setActiveSort(undefined);
  }, []);

  return {
    filteredEntities,
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,
    activeSort,
    setActiveSort,
    clearAllFilters,
    hasActiveFilters
  };
};