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

/**
 * Hook per gestire l'accesso multi-tenant
 */
export const useTenantAccess = () => {
  const { isAuthenticated, user } = useAuth();
  
  const [accessibleTenants, setAccessibleTenants] = useState<AccessibleTenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  
  const loadingRef = useRef(false);
  const initialLoadRef = useRef(false);

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
      console.log('🔄 useTenantAccess: Request already in progress, skipping');
      return;
    }

    // Controlla cache se non è un refresh forzato
    if (!forceRefresh && accessibleTenantsCache && Date.now() - accessibleTenantsCache.timestamp < CACHE_DURATION) {
      console.log('📦 useTenantAccess: Using cached data');
      setAccessibleTenants(accessibleTenantsCache.data);
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      console.log('🔄 useTenantAccess: Loading accessible tenants...');
      const response = await apiGet<MyTenantsResponse>('/api/v1/person-tenant-access/my-tenants');
      
      const tenants = response.data || [];

      // Aggiorna cache
      accessibleTenantsCache = {
        data: tenants,
        timestamp: Date.now()
      };

      setAccessibleTenants(tenants);
      
      // Imposta il tenant corrente se non già impostato
      if (!currentTenantId && tenants.length > 0) {
        // Cerca il tenant primario o usa il primo
        const primaryTenant = tenants.find(t => t.isPrimary) || tenants[0];
        setCurrentTenantId(primaryTenant.id);
      }
      
      console.log('✅ useTenantAccess: Tenants loaded successfully', { count: tenants.length });
    } catch (err: unknown) {
      console.error('❌ useTenantAccess: Error loading tenants:', err);
      
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
  }, [isAuthenticated, currentTenantId]);

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

      console.log('🔄 useTenantAccess: Switching to tenant:', tenantId);
      
      const response = await apiPost<SwitchTenantResponse>(
        '/api/v1/person-tenant-access/switch-tenant',
        { tenantId }
      );

      if (response.success) {
        // Aggiorna il tenantId nel localStorage
        localStorage.setItem('tenantId', tenantId);
        
        // Se il backend fornisce un nuovo token, salvalo
        if (response.data?.token) {
          localStorage.setItem('token', response.data.token);
        }
        
        setCurrentTenantId(tenantId);
        
        console.log('✅ useTenantAccess: Switched to tenant:', targetTenant.name);
        
        // Invalida la cache per forzare un refresh
        accessibleTenantsCache = null;
        
        return true;
      } else {
        throw new Error('Switch tenant failed');
      }
    } catch (err: unknown) {
      console.error('❌ useTenantAccess: Error switching tenant:', err);
      
      const error = err as { message?: string; response?: { status?: number; data?: { error?: string } } };
      
      setError(error.response?.data?.error || 'Errore nel cambio tenant');
      return false;
    } finally {
      setSwitching(false);
    }
  }, [isAuthenticated, accessibleTenants]);

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
    return tenant.enabledFeatures.includes(feature);
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
    }
  }, [isAuthenticated, loadAccessibleTenants]);

  // Inizializza il currentTenantId dal localStorage
  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    if (storedTenantId && !currentTenantId) {
      setCurrentTenantId(storedTenantId);
    }
  }, [currentTenantId]);

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
