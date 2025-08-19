import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../services/api';
import { getLoadingErrorMessage } from '../utils/errorUtils';

interface UseGDPREntityDataProps {
  apiEndpoint: string;
  entityNamePlural: string;
  entityDisplayNamePlural: string;
}

interface UseGDPREntityDataReturn<T> {
  entities: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setEntities: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useGDPREntityData<T = unknown>({
  apiEndpoint,
  entityNamePlural,
  entityDisplayNamePlural
}: UseGDPREntityDataProps): UseGDPREntityDataReturn<T> {
  const [entities, setEntities] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Costruisci i parametri di query per l'endpoint delle persone
      let apiUrl = apiEndpoint;
      if (apiEndpoint === '/api/persons' || apiEndpoint === '/api/v1/persons') {
        // Per l'endpoint delle persone, aggiungi i parametri necessari
        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('limit', '50');
        params.append('sortBy', 'lastLogin');
        params.append('sortOrder', 'desc');
        
        apiUrl = `${apiEndpoint}?${params.toString()}`;
      }
      
      const response = await apiGet<{ persons?: T[] } | T[]>(apiUrl);
      
      // Gestisci la risposta paginata per l'endpoint delle persone
      if ((apiEndpoint === '/api/persons' || apiEndpoint === '/api/v1/persons') && response && typeof response === 'object' && 'persons' in response && response.persons) {
        setEntities(response.persons);
      } else if (Array.isArray(response)) {
        setEntities(response);
      } else {
        setEntities([]);
      }
    } catch (err: unknown) {
      console.error(`❌ Errore caricamento ${entityDisplayNamePlural}:`, err);
      setError(getLoadingErrorMessage(
        (entityNamePlural as keyof typeof import('../utils/errorUtils').errorMessages.loading) || 'generic', 
        err
      ));
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, entityNamePlural, entityDisplayNamePlural]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  return {
    entities,
    loading,
    error,
    refetch: loadEntities,
    setEntities
  };
}