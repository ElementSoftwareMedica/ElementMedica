import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export interface EntityState<T> {
  entities: T[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  selectedEntities: Set<string>;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export interface EntityActions<T> {
  setEntities: (entities: T[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchTerm: (term: string) => void;
  toggleEntitySelection: (id: string) => void;
  selectAllEntities: () => void;
  clearSelection: () => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  addEntity: (entity: T) => void;
  updateEntity: (id: string, updates: Partial<T>) => void;
  removeEntity: (id: string) => void;
  refreshEntities: () => Promise<void>;
}

export interface EntityConfig {
  apiEndpoint: string;
  pageSize?: number;
  enableSearch?: boolean;
  enablePagination?: boolean;
}

/**
 * Hook per la gestione dello stato delle entità GDPR
 * Centralizza la logica di stato e le operazioni CRUD
 */
export function useEntityState<T extends { id: string }>(
  config: EntityConfig
): [EntityState<T>, EntityActions<T>] {
  const {
    apiEndpoint,
    pageSize = 10,
    enableSearch = true,
    enablePagination = true
  } = config;

  // Stati principali
  const [entities, setEntities] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  
  // Stati per paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  // Funzione per caricare le entità
  const loadEntities = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (enablePagination) {
        params.append('page', currentPage.toString());
        params.append('limit', currentPageSize.toString());
      }
      
      if (enableSearch && searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${apiEndpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Errore nel caricamento: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (enablePagination && data.data) {
        setEntities(data.data);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || data.data.length);
      } else {
        setEntities(Array.isArray(data) ? data : data.data || []);
        setTotalCount(Array.isArray(data) ? data.length : data.data?.length || 0);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMessage);
      toast.error(`Errore nel caricamento delle entità: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, currentPage, currentPageSize, searchTerm, enablePagination, enableSearch]);

  // Carica le entità al mount e quando cambiano i parametri
  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // Gestione selezione entità
  const toggleEntitySelection = useCallback((id: string) => {
    setSelectedEntities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAllEntities = useCallback(() => {
    setSelectedEntities(new Set(entities.map(entity => entity.id)));
  }, [entities]);

  const clearSelection = useCallback(() => {
    setSelectedEntities(new Set());
  }, []);

  // Operazioni CRUD
  const addEntity = useCallback((entity: T) => {
    setEntities(prev => [entity, ...prev]);
    setTotalCount(prev => prev + 1);
  }, []);

  const updateEntity = useCallback((id: string, updates: Partial<T>) => {
    setEntities(prev => 
      prev.map(entity => 
        entity.id === id ? { ...entity, ...updates } : entity
      )
    );
  }, []);

  const removeEntity = useCallback((id: string) => {
    setEntities(prev => prev.filter(entity => entity.id !== id));
    setSelectedEntities(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    setTotalCount(prev => Math.max(0, prev - 1));
  }, []);

  // Gestione paginazione
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    clearSelection();
  }, [clearSelection]);

  const handlePageSizeChange = useCallback((size: number) => {
    setCurrentPageSize(size);
    setCurrentPage(1);
    clearSelection();
  }, [clearSelection]);

  // Gestione ricerca
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    clearSelection();
  }, [clearSelection]);

  // Stato combinato
  const state: EntityState<T> = {
    entities,
    loading,
    error,
    searchTerm,
    selectedEntities,
    currentPage,
    totalPages,
    totalCount,
    pageSize: currentPageSize
  };

  // Azioni combinate
  const actions: EntityActions<T> = {
    setEntities,
    setLoading,
    setError,
    setSearchTerm: handleSearchChange,
    toggleEntitySelection,
    selectAllEntities,
    clearSelection,
    setCurrentPage: handlePageChange,
    setPageSize: handlePageSizeChange,
    addEntity,
    updateEntity,
    removeEntity,
    refreshEntities: loadEntities
  };

  return [state, actions];
}