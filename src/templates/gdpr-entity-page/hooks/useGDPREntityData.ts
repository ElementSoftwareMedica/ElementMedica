import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../../../services/api';
import { getLoadingErrorMessage } from '../../../utils/errorUtils';
import { useToast } from '../../../hooks/useToast';
import { useTenantModeOptional } from '../../../contexts/TenantModeContext';

export interface GDPREntityDataConfig {
  apiEndpoint: string;
  entityNamePlural: string;
  entityDisplayNamePlural: string;
  // Parametri di query statici da aggiungere sempre alle richieste (es. roleType)
  staticQueryParams?: Record<string, string | number | boolean>;
  // Se true, non applica il filtro tenant (per pagine admin globali)
  skipTenantFilter?: boolean;
}

export interface GDPREntityDataState<T> {
  entities: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setEntities: React.Dispatch<React.SetStateAction<T[]>>;
}

/**
 * Hook per gestire il caricamento e la gestione dei dati delle entità
 * Centralizza la logica di fetch, loading e error handling
 * Integra automaticamente il filtro tenant globale
 */
export function useGDPREntityData<T extends Record<string, unknown>>({
  apiEndpoint,
  entityNamePlural,
  entityDisplayNamePlural,
  staticQueryParams,
  skipTenantFilter = false
}: GDPREntityDataConfig): GDPREntityDataState<T> {
  const [entities, setEntities] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // TenantMode is the single source of truth for which tenant(s) to display
  const tenantMode = useTenantModeOptional();

  // Stable key that changes when tenant view changes — triggers refetch
  const tenantViewKey = tenantMode
    ? `${tenantMode.viewMode}:${tenantMode.viewTenantIds.join(',')}`
    : 'no-tenant-mode';

  // Use ref to avoid recreating loadEntities on every showToast change
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Use ref for staticQueryParams to avoid recreating loadEntities
  const staticQueryParamsRef = useRef(staticQueryParams);
  useEffect(() => {
    staticQueryParamsRef.current = staticQueryParams;
  }, [staticQueryParams]);

  const loadEntities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build tenant query params from TenantMode (source of truth)
      const tenantQueryParams = new URLSearchParams();
      const requestHeaders: Record<string, string> = {};

      if (!skipTenantFilter && tenantMode) {
        if (tenantMode.viewMode === 'all') {
          tenantQueryParams.append('allTenants', 'true');
        } else if (tenantMode.viewTenantIds.length === 1) {
          // Single tenant: pass as tenantIds param AND as X-Operate-Tenant-Id header
          tenantQueryParams.append('tenantIds', tenantMode.viewTenantIds[0]);
          const operateHeaders = tenantMode.getOperateHeaders();
          Object.assign(requestHeaders, operateHeaders);
        } else if (tenantMode.viewTenantIds.length > 1) {
          tenantQueryParams.append('tenantIds', tenantMode.viewTenantIds.join(','));
        }
        // If viewTenantIds is empty → no filter → backend uses person.tenantId (correct for single-tenant)
      }

      // Build full URL
      let apiUrl = apiEndpoint;

      if (apiEndpoint === '/api/persons' || apiEndpoint === '/api/v1/persons') {
        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('limit', '50');

        const currentStaticParams = staticQueryParamsRef.current || {};
        const sortBy = currentStaticParams.sortBy || 'lastLogin';
        const sortOrder = currentStaticParams.sortOrder || 'desc';
        params.append('sortBy', String(sortBy));
        params.append('sortOrder', String(sortOrder));

        // Extra static query params (skip sortBy/sortOrder already added)
        if (staticQueryParamsRef.current) {
          Object.entries(staticQueryParamsRef.current).forEach(([key, value]) => {
            if (key !== 'sortBy' && key !== 'sortOrder' && value !== undefined && value !== null) {
              params.append(key, String(value));
            }
          });
        }

        // Merge tenant params
        tenantQueryParams.forEach((value, key) => params.append(key, value));

        apiUrl = `${apiEndpoint}?${params.toString()}`;
      } else {
        // For all other endpoints
        const queryString = tenantQueryParams.toString();
        if (queryString) {
          apiUrl = `${apiEndpoint}${apiEndpoint.includes('?') ? '&' : '?'}${queryString}`;
        }
      }

      const response = await apiGet<unknown>(
        apiUrl,
        {},
        Object.keys(requestHeaders).length > 0 ? { headers: requestHeaders } : undefined
      );

      if (
        (apiEndpoint === '/api/persons' || apiEndpoint === '/api/v1/persons') &&
        response && typeof response === 'object' && 'persons' in response &&
        Array.isArray((response as { persons: T[] }).persons)
      ) {
        setEntities((response as { persons: T[] }).persons);
      } else if (Array.isArray(response)) {
        setEntities(response);
      } else {
        setEntities([]);
      }
    } catch (err: unknown) {
      setError(getLoadingErrorMessage(
        (entityNamePlural as keyof typeof import('../../../utils/errorUtils').errorMessages.loading) || 'generic',
        err
      ));
      setEntities([]);
      showToastRef.current({
        message: `Errore durante il caricamento dei ${entityDisplayNamePlural.toLowerCase()}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, entityNamePlural, entityDisplayNamePlural, skipTenantFilter, tenantMode, tenantViewKey]);

  // Reload when tenant view changes
  useEffect(() => {
    loadEntities();
  }, [loadEntities, tenantViewKey]);

  return {
    entities,
    loading,
    error,
    refetch: loadEntities,
    setEntities
  };
}