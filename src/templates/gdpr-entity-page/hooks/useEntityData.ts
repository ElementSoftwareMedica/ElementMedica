import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../../../services/api';
import { getLoadingErrorMessage } from '../../../utils/errorUtils';
import { useToast } from '../../../hooks/useToast';

/**
 * Hook per la gestione dei dati delle entità
 * Centralizza caricamento, errori e refresh dei dati
 */
export interface UseEntityDataProps {
  apiEndpoint: string;
  entityNamePlural: string;
  entityDisplayNamePlural: string;
}

export interface UseEntityDataReturn<T> {
  entities: T[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  setEntities: React.Dispatch<React.SetStateAction<T[]>>;
}

export const useEntityData = <T extends Record<string, any>>({
  apiEndpoint,
  entityNamePlural,
  entityDisplayNamePlural
}: UseEntityDataProps): UseEntityDataReturn<T> => {
  const [entities, setEntities] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  
  // Use ref to avoid recreating loadEntities on every showToast change
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Costruisce l'URL dell'API con parametri specifici per le persone
  const buildApiUrl = useCallback((endpoint: string): string => {
    if (endpoint === '/api/persons' || endpoint === '/api/v1/persons') {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '50');
      params.append('sortBy', 'lastLogin');
      params.append('sortOrder', 'desc');
      return `${endpoint}?${params.toString()}`;
    }
    return endpoint;
  }, []);

  // Processa la risposta dell'API
  const processApiResponse = useCallback((response: any): T[] => {
    // Gestisci la risposta paginata per l'endpoint delle persone
    if ((apiEndpoint === '/api/persons' || apiEndpoint === '/api/v1/persons') && 
        response && typeof response === 'object' && response.persons) {
      return response.persons;
    } else if (Array.isArray(response)) {
      return response;
    } else {
      return [];
    }
  }, [apiEndpoint]);

  // Caricamento dati
  const loadEntities = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = buildApiUrl(apiEndpoint);
      
      const response = await apiGet<any>(apiUrl);
      
      const processedEntities = processApiResponse(response);
      setEntities(processedEntities);
      
    } catch (err: unknown) {
      const errorMessage = getLoadingErrorMessage(
        (entityNamePlural as keyof typeof import('../../../utils/errorUtils').errorMessages.loading) || 'generic', 
        err
      );
      setError(errorMessage);
      setEntities([]);
      
      showToastRef.current({
        message: `Errore durante il caricamento dei ${entityDisplayNamePlural.toLowerCase()}: ${'Errore sconosciuto'}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, entityNamePlural, entityDisplayNamePlural, buildApiUrl, processApiResponse]);

  // Refresh dati (alias per loadEntities)
  const refreshData = useCallback(async (): Promise<void> => {
    await loadEntities();
  }, [loadEntities]);

  // Caricamento iniziale - solo loadEntities come dipendenza
  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  return {
    entities,
    loading,
    error,
    refreshData,
    setEntities
  };
};