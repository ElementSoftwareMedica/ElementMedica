import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../services/api';
import { getLoadingErrorMessage } from '../utils/errorUtils';
import { useTenantFilter } from '../context/TenantFilterContext';

interface UseGDPREntityDataProps {
  apiEndpoint: string;
  entityNamePlural: string;
  entityDisplayNamePlural: string;
  // Parametri di query statici da aggiungere sempre alle richieste (es. roleType)
  staticQueryParams?: Record<string, string | number | boolean>;
  // Se true, non applica il filtro tenant (per pagine admin globali)
  skipTenantFilter?: boolean;
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
  entityDisplayNamePlural,
  staticQueryParams,
  skipTenantFilter = false
}: UseGDPREntityDataProps): UseGDPREntityDataReturn<T> {
  const [entities, setEntities] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get tenant filter from global context
  const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

  // Use ref for staticQueryParams to avoid recreating loadEntities
  const staticQueryParamsRef = useRef(staticQueryParams);
  useEffect(() => {
    staticQueryParamsRef.current = staticQueryParams;
  }, [staticQueryParams]);

  const loadEntities = useCallback(async () => {
    // Wait for tenant filter to be ready (unless skipped)
    if (!skipTenantFilter && !isReady) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get tenant filter params
      const tenantParams = skipTenantFilter ? {} : getTenantFilterParams();

      // Costruisci i parametri di query per l'endpoint delle persone
      let apiUrl = apiEndpoint;
      if (apiEndpoint === '/api/persons' || apiEndpoint === '/api/v1/persons') {
        // Per l'endpoint delle persone, aggiungi i parametri necessari
        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('limit', '50');

        // Usa i parametri statici se presenti, altrimenti i default
        const currentStaticParams = staticQueryParamsRef.current || {};
        const sortBy = currentStaticParams.sortBy || 'lastLogin';
        const sortOrder = currentStaticParams.sortOrder || 'desc';

        params.append('sortBy', String(sortBy));
        params.append('sortOrder', String(sortOrder));

        // Applica eventuali altri query param statici (es. roleType)
        if (staticQueryParamsRef.current) {
          Object.entries(staticQueryParamsRef.current).forEach(([key, value]) => {
            // Salta sortBy e sortOrder perché già aggiunti sopra
            if (key !== 'sortBy' && key !== 'sortOrder' && value !== undefined && value !== null) {
              params.append(key, String(value));
            }
          });
        }

        // Apply tenant filter params
        if (tenantParams.tenantIds) {
          params.append('tenantIds', tenantParams.tenantIds.join(','));
        }
        if (tenantParams.allTenants) {
          params.append('allTenants', 'true');
        }

        apiUrl = `${apiEndpoint}?${params.toString()}`;
      } else {
        // For other endpoints, add tenant filter as query params
        const params = new URLSearchParams();

        // Apply tenant filter params
        if (tenantParams.tenantIds) {
          params.append('tenantIds', tenantParams.tenantIds.join(','));
        }
        if (tenantParams.allTenants) {
          params.append('allTenants', 'true');
        }

        const queryString = params.toString();
        if (queryString) {
          apiUrl = `${apiEndpoint}${apiEndpoint.includes('?') ? '&' : '?'}${queryString}`;
        }
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
  }, [apiEndpoint, entityNamePlural, entityDisplayNamePlural, skipTenantFilter, isReady, getTenantFilterParams]);

  // Reload when tenant filter changes
  useEffect(() => {
    if (skipTenantFilter || isReady) {
      loadEntities();
    }
  }, [loadEntities, skipTenantFilter, isReady, tenantFilterKey]);

  return {
    entities,
    loading,
    error,
    refetch: loadEntities,
    setEntities
  };
}