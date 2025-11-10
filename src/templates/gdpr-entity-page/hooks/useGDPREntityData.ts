import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../../../services/api';
import { getLoadingErrorMessage } from '../../../utils/errorUtils';
import { useToast } from '../../../hooks/useToast';

export interface GDPREntityDataConfig {
  apiEndpoint: string;
  entityNamePlural: string;
  entityDisplayNamePlural: string;
}

export interface GDPREntityDataState<T> {
  entities: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook per gestire il caricamento e la gestione dei dati delle entità
 * Centralizza la logica di fetch, loading e error handling
 */
export function useGDPREntityData<T extends Record<string, unknown>>({
  apiEndpoint,
  entityNamePlural,
  entityDisplayNamePlural
}: GDPREntityDataConfig): GDPREntityDataState<T> {
  const [entities, setEntities] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  
  // Use ref to avoid recreating loadEntities on every showToast change
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const loadEntities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Caricamento ${entityDisplayNamePlural}...`);
      
      // Costruisci i parametri di query per l'endpoint delle persone
      let apiUrl = apiEndpoint;
      if (apiEndpoint === '/api/persons' || apiEndpoint === '/api/v1/persons') {
        // Per l'endpoint delle persone, aggiungi i parametri necessari
        const params = new URLSearchParams();
        // Non forzare roleType per mostrare tutti gli utenti
        params.append('page', '1');
        params.append('limit', '50');
        params.append('sortBy', 'lastLogin');
        params.append('sortOrder', 'desc');
        
        apiUrl = `${apiEndpoint}?${params.toString()}`;
      }
      
      console.log(`📡 Chiamata API: ${apiUrl}`);
      const response = await apiGet<unknown>(apiUrl);
      console.log(`📊 Risposta API ${entityNamePlural}:`, response);
      
      // Gestisci la risposta paginata per l'endpoint delle persone
      if ((apiEndpoint === '/api/persons' || apiEndpoint === '/api/v1/persons') && response && typeof response === 'object' && 'persons' in response && Array.isArray((response as { persons: T[] }).persons)) {
        const typedResponse = response as { persons: T[] };
        setEntities(typedResponse.persons);
        console.log(`✅ ${entityDisplayNamePlural} caricate:`, typedResponse.persons.length);
      } else if (Array.isArray(response)) {
        setEntities(response);
        console.log(`✅ ${entityDisplayNamePlural} caricate:`, response.length);
      } else {
        console.warn(`⚠️ Risposta API non è un array:`, response);
        setEntities([]);
      }
    } catch (err: unknown) {
      console.error(`❌ Errore caricamento ${entityDisplayNamePlural}:`, err);
      setError(getLoadingErrorMessage(
        (entityNamePlural as keyof typeof import('../../../utils/errorUtils').errorMessages.loading) || 'generic', 
        err
      ));
      setEntities([]);
      showToastRef.current({
        message: `Errore durante il caricamento dei ${entityDisplayNamePlural.toLowerCase()}: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, entityNamePlural, entityDisplayNamePlural]);

  // Caricamento iniziale - solo loadEntities come dipendenza
  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  return {
    entities,
    loading,
    error,
    refetch: loadEntities
  };
}