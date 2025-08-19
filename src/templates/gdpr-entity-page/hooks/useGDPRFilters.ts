import { useState, useMemo, useCallback } from 'react';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'boolean' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export type FilterValue = string | number | boolean | Date | null | undefined;

export interface GDPRFiltersState {
  searchTerm: string;
  filters: Record<string, FilterValue>;
  sortConfig: SortConfig;
  showAdvancedFilters: boolean;
}

export interface GDPRFiltersActions {
  setSearchTerm: (term: string) => void;
  setFilter: (key: string, value: FilterValue) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  setSortConfig: (config: SortConfig) => void;
  toggleAdvancedFilters: () => void;
  resetFilters: () => void;
}

export interface UseGDPRFiltersConfig {
  defaultSort?: SortConfig;
  filterConfigs?: FilterConfig[];
  enableAdvancedFilters?: boolean;
}

/**
 * Hook per gestire filtri, ricerca e ordinamento delle entità
 * Centralizza la logica di filtraggio con supporto per filtri avanzati
 */
export function useGDPRFilters<T extends Record<string, unknown>>({
  defaultSort = { field: 'createdAt', direction: 'desc' },
  filterConfigs = [],
  enableAdvancedFilters = true
}: UseGDPRFiltersConfig = {}) {
  
  const [state, setState] = useState<GDPRFiltersState>({
    searchTerm: '',
    filters: {},
    sortConfig: defaultSort,
    showAdvancedFilters: false
  });

  // Azioni per gestire i filtri
  const setSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value }
    }));
  }, []);

  const clearFilter = useCallback((key: string) => {
    setState(prev => {
      const newFilters = { ...prev.filters };
      delete newFilters[key];
      return { ...prev, filters: newFilters };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchTerm: '',
      filters: {}
    }));
  }, []);

  const setSortConfig = useCallback((config: SortConfig) => {
    setState(prev => ({ ...prev, sortConfig: config }));
  }, []);

  const toggleAdvancedFilters = useCallback(() => {
    setState(prev => ({ ...prev, showAdvancedFilters: !prev.showAdvancedFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setState({
      searchTerm: '',
      filters: {},
      sortConfig: defaultSort,
      showAdvancedFilters: false
    });
  }, [defaultSort]);

  // Funzione per applicare i filtri ai dati
  const applyFilters = useCallback((data: T[]): T[] => {
    if (!data || data.length === 0) return [];

    let filteredData = [...data];

    // Applica ricerca testuale
    if (state.searchTerm) {
      const searchLower = state.searchTerm.toLowerCase();
      filteredData = filteredData.filter(item => {
        return Object.values(item).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }

    // Applica filtri specifici
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;

      filteredData = filteredData.filter(item => {
        const itemValue = item[key];
        
        if (typeof value === 'boolean') {
          return Boolean(itemValue) === value;
        }
        
        if (typeof value === 'string') {
          if (itemValue === null || itemValue === undefined) return false;
          return String(itemValue).toLowerCase().includes(value.toLowerCase());
        }
        
        if (typeof value === 'number') {
          return Number(itemValue) === value;
        }
        
        return itemValue === value;
      });
    });

    // Applica ordinamento
    if (state.sortConfig.field) {
      filteredData.sort((a, b) => {
        const aValue = a[state.sortConfig.field];
        const bValue = b[state.sortConfig.field];
        
        // Gestione valori null/undefined
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        // Ordinamento per date
        if (aValue instanceof Date || bValue instanceof Date) {
          const aDate = aValue instanceof Date ? aValue : new Date(String(aValue));
          const bDate = bValue instanceof Date ? bValue : new Date(String(bValue));
          return state.sortConfig.direction === 'asc' 
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        }
        
        // Ordinamento per stringhe
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return state.sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        // Ordinamento per numeri
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return state.sortConfig.direction === 'asc'
            ? aValue - bValue
            : bValue - aValue;
        }
        
        // Fallback per altri tipi
        const aStr = String(aValue);
        const bStr = String(bValue);
        return state.sortConfig.direction === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return filteredData;
  }, [state.searchTerm, state.filters, state.sortConfig]);

  // Statistiche sui filtri
  const filterStats = useMemo(() => {
    const activeFiltersCount = Object.keys(state.filters).filter(
      key => state.filters[key] !== null && state.filters[key] !== undefined && state.filters[key] !== ''
    ).length;
    
    return {
      hasSearchTerm: Boolean(state.searchTerm),
      activeFiltersCount,
      hasActiveFilters: activeFiltersCount > 0 || Boolean(state.searchTerm),
      isDefaultSort: state.sortConfig.field === defaultSort.field && 
                     state.sortConfig.direction === defaultSort.direction
    };
  }, [state.searchTerm, state.filters, state.sortConfig, defaultSort]);

  const actions: GDPRFiltersActions = {
    setSearchTerm,
    setFilter,
    clearFilter,
    clearAllFilters,
    setSortConfig,
    toggleAdvancedFilters,
    resetFilters
  };

  return {
    // Stato
    searchTerm: state.searchTerm,
    filters: state.filters,
    sortConfig: state.sortConfig,
    showAdvancedFilters: state.showAdvancedFilters,
    
    // Azioni
    ...actions,
    
    // Funzioni di utilità
    applyFilters,
    filterStats,
    
    // Configurazione
    filterConfigs,
    enableAdvancedFilters
  };
}