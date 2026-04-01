/**
 * useTenantAccess Hook
 * 
 * Hook per gestire l'accesso multi-tenant per l'utente corrente.
 * Permette di ottenere la lista dei tenant accessibili e switchare tra di essi.
 * 
 * @module hooks/useTenantAccess
 * @project 43 - Tenant Roles Management System
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiGet, apiPost } from '../services/api';
import { useAuth } from '../hooks/auth/useAuth';
import { saveToken } from '../services/auth';
import { tenantHasFeature } from '../utils/tenantFeatures';

/**
 * Tenant accessibile dall'utente con info aggiuntive
 */
export interface AccessibleTenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  billingPlan: string;
  settings: Record<string, unknown> | string;
  isActive: boolean;
  accessLevel: 'FULL' | 'LIMITED' | 'READONLY';
  enabledFeatures: string[];
  isPrimary: boolean;
  isAdminAccess?: boolean;
}

/**
 * Response dell'API /my-tenants
 */
interface MyTenantsResponse {
  success: boolean;
  data: AccessibleTenant[];
  meta: {
    total: number;
    features: string[];
  };
}

/**
 * Response dell'API /switch-tenant
 */
interface SwitchTenantResponse {
  success: boolean;
  data: {
    tenant: AccessibleTenant;
    token: string;
  };
  message: string;
}

// Cache per evitare richieste duplicate
let accessibleTenantsCache: { data: AccessibleTenant[]; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 60 secondi
const TENANT_CHANGED_EVENT = 'tenant-access:changed';
const TENANTS_STORAGE_KEY = 'tenantAccess:accessibleTenants';

function resolveCurrentTenantId(tenants: AccessibleTenant[]): string | null {
  if (tenants.length === 0) {
    return null;
  }

  const storedTenantId = localStorage.getItem('tenantId');
  if (storedTenantId && tenants.some(t => t.id === storedTenantId)) {
    return storedTenantId;
  }

  const primaryTenant = tenants.find(t => t.isPrimary) || tenants[0];
  localStorage.setItem('tenantId', primaryTenant.id);
  return primaryTenant.id;
}

/**
 * Hook per gestire l'accesso multi-tenant
 */
export const useTenantAccess = () => {
  const { isAuthenticated, user, refreshUser } = useAuth();

  const [accessibleTenants, setAccessibleTenants] = useState<AccessibleTenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const loadingRef = useRef(false);
  const initialLoadRef = useRef(false);

  const hydrateTenantsFromStorage = useCallback((): AccessibleTenant[] => {
    try {
      const raw = localStorage.getItem(TENANTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AccessibleTenant[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  /**
   * Carica i tenant accessibili dall'utente
   */
  const loadAccessibleTenants = useCallback(async (forceRefresh = false) => {
    // Non caricare se non autenticato
    if (!isAuthenticated) {
      setAccessibleTenants([]);
      setError(null);
      return;
    }

    // Evita richieste multiple simultanee
    if (loadingRef.current && !forceRefresh) {
      return;
    }

    // Controlla cache se non è un refresh forzato
    if (!forceRefresh && accessibleTenantsCache && Date.now() - accessibleTenantsCache.timestamp < CACHE_DURATION) {
      const cachedTenants = accessibleTenantsCache.data;
      setAccessibleTenants(cachedTenants);
      setCurrentTenantId(resolveCurrentTenantId(cachedTenants));
      return;
    }

    // Mostra lo stato noto più recente mentre aspettiamo l'API
    if (!forceRefresh && !accessibleTenantsCache) {
      const storedTenants = hydrateTenantsFromStorage();
      if (storedTenants.length > 0) {
        setAccessibleTenants(storedTenants);
        setCurrentTenantId(resolveCurrentTenantId(storedTenants));
      }
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const response = await apiGet<MyTenantsResponse>('/api/v1/person-tenant-access/my-tenants');

      const tenants = response.data || [];

      // Aggiorna cache
      accessibleTenantsCache = {
        data: tenants,
        timestamp: Date.now()
      };

      try {
        localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(tenants));
      } catch {
        // Ignore storage errors
      }

      setAccessibleTenants(tenants);
      setCurrentTenantId(resolveCurrentTenantId(tenants));
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('❌ useTenantAccess: Error loading tenants:', err);

      const error = err as { message?: string; response?: { status?: number } };

      if (error.response?.status === 401) {
        setError('Sessione scaduta. Effettua nuovamente il login.');
      } else if (error.response?.status === 403) {
        setError('Non hai i permessi per accedere a questa risorsa.');
      } else {
        setError('Errore nel caricamento dei tenant accessibili');
      }

      setAccessibleTenants([]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [isAuthenticated, hydrateTenantsFromStorage]); // currentTenantId rimosso: leggiamo localStorage direttamente

  /**
   * Cambia il tenant corrente
   */
  const switchTenant = useCallback(async (tenantId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('Devi essere autenticato per cambiare tenant');
      return false;
    }

    // Verifica che il tenant sia accessibile
    const targetTenant = accessibleTenants.find(t => t.id === tenantId);
    if (!targetTenant) {
      setError('Tenant non trovato o non accessibile');
      return false;
    }

    try {
      setSwitching(true);
      setError(null);


      const response = await apiPost<SwitchTenantResponse>(
        '/api/v1/person-tenant-access/switch-tenant',
        { tenantId }
      );

      if (response.success) {
        // Aggiorna il tenantId nel localStorage
        localStorage.setItem('tenantId', tenantId);

        // Se il backend fornisce un nuovo token, salvalo usando la funzione standard
        // P57: NO localStorage.setItem('token') - usare SEMPRE saveToken per authToken
        if (response.data?.token) {
          saveToken(response.data.token);
        }

        setCurrentTenantId(tenantId);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(TENANT_CHANGED_EVENT, { detail: { tenantId } }));
        }

        // Invalida la cache per forzare un refresh
        accessibleTenantsCache = null;

        // Aggiorna ruoli e permessi nel contesto auth per il nuovo tenant
        // Questo aggiorna la sidebar e il controllo isAdmin immediatamente
        await refreshUser();

        return true;
      } else {
        throw new Error('Switch tenant failed');
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('❌ useTenantAccess: Error switching tenant:', err);

      const error = err as { message?: string; response?: { status?: number; data?: { error?: string } } };

      setError(error.response?.data?.error || 'Errore nel cambio tenant');
      return false;
    } finally {
      setSwitching(false);
    }
  }, [isAuthenticated, accessibleTenants, refreshUser]);

  /**
   * Ottiene il tenant corrente
   */
  const getCurrentTenant = useCallback((): AccessibleTenant | null => {
    if (!currentTenantId) return null;
    return accessibleTenants.find(t => t.id === currentTenantId) || null;
  }, [currentTenantId, accessibleTenants]);

  /**
   * Verifica se l'utente ha accesso a un tenant specifico
   */
  const hasAccessToTenant = useCallback((tenantId: string): boolean => {
    return accessibleTenants.some(t => t.id === tenantId);
  }, [accessibleTenants]);

  /**
   * Verifica se l'utente è admin (accesso a tutti i tenant)
   */
  const isGlobalAdmin = useCallback((): boolean => {
    return accessibleTenants.some(t => t.isAdminAccess === true);
  }, [accessibleTenants]);

  /**
   * Verifica se una feature è abilitata per il tenant corrente
   */
  const hasFeature = useCallback((feature: string): boolean => {
    const tenant = getCurrentTenant();
    if (!tenant) return false;
    return tenantHasFeature(tenant.enabledFeatures, feature);
  }, [getCurrentTenant]);

  // Carica i tenant all'avvio se autenticato
  useEffect(() => {
    if (isAuthenticated && !initialLoadRef.current) {
      initialLoadRef.current = true;
      loadAccessibleTenants();
    }

    // Reset se non autenticato
    if (!isAuthenticated) {
      initialLoadRef.current = false;
      setAccessibleTenants([]);
      setCurrentTenantId(null);
      accessibleTenantsCache = null;
      try {
        localStorage.removeItem(TENANTS_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
  }, [isAuthenticated, loadAccessibleTenants]);

  // Inizializza il currentTenantId dal localStorage (solo al mount)
  useEffect(() => {
    const storedTenants = hydrateTenantsFromStorage();
    if (storedTenants.length > 0) {
      setAccessibleTenants(prev => (prev.length > 0 ? prev : storedTenants));
    }

    const storedTenantId = localStorage.getItem('tenantId');
    if (storedTenantId) {
      setCurrentTenantId(prev => prev ?? storedTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrateTenantsFromStorage]); // Solo al mount, non quando cambia currentTenantId

  // Sincronizza tenant tra istanze diverse del hook (Header, Layout, Selector)
  useEffect(() => {
    const onStorageTenantUpdate = (event: StorageEvent) => {
      if (event.key === 'tenantId' && event.newValue) {
        setCurrentTenantId(event.newValue);
      }
    };

    const onTenantChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ tenantId?: string }>).detail;
      if (detail?.tenantId) {
        setCurrentTenantId(detail.tenantId);
      }
      void loadAccessibleTenants(true);
    };

    window.addEventListener('storage', onStorageTenantUpdate);
    window.addEventListener(TENANT_CHANGED_EVENT, onTenantChanged);

    return () => {
      window.removeEventListener('storage', onStorageTenantUpdate);
      window.removeEventListener(TENANT_CHANGED_EVENT, onTenantChanged);
    };
  }, [loadAccessibleTenants]);

  return {
    // Stato
    accessibleTenants,
    currentTenantId,
    currentTenant: getCurrentTenant(),
    loading,
    error,
    switching,

    // Computed
    hasMultipleTenants: accessibleTenants.length > 1,
    isGlobalAdmin: isGlobalAdmin(),

    // Azioni
    loadAccessibleTenants,
    switchTenant,
    hasAccessToTenant,
    hasFeature,

    // Utility
    refresh: () => loadAccessibleTenants(true),
  };
};

export default useTenantAccess;
