import { useState, useCallback, useRef } from 'react';
import { apiGet } from '../services/api';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Cache per evitare richieste duplicate
let tenantsCache: { data: Tenant[]; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 60 secondi (i tenant cambiano meno frequentemente)

export const useTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadTenants = useCallback(async (forceRefresh = false) => {
    // Evita richieste multiple simultanee
    if (loadingRef.current && !forceRefresh) {
      console.log('🔄 useTenants: Request already in progress, skipping');
      return;
    }

    // Controlla cache se non è un refresh forzato
    if (!forceRefresh && tenantsCache && Date.now() - tenantsCache.timestamp < CACHE_DURATION) {
      console.log('📦 useTenants: Using cached data');
      setTenants(tenantsCache.data);
      return;
    }

    // Debouncing per evitare troppe richieste
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        loadingRef.current = true;
        setLoading(true);
        setError(null);
        
        console.log('🔄 useTenants: Loading tenants...');
         const response = await apiGet<{ tenants: Tenant[] }>('/api/tenants');
         const tenantsData = response.tenants || [];
        
        // Aggiorna cache
        tenantsCache = {
          data: tenantsData,
          timestamp: Date.now()
        };
        
        setTenants(tenantsData);
        console.log('✅ useTenants: Tenants loaded successfully', { count: tenantsData.length });
      } catch (err: unknown) {
        console.error('❌ useTenants: Error loading tenants:', err);
        
        const error = err as { code?: string; message?: string; response?: { status?: number } };
        
        // Gestione errori specifica
        if (error.code === 'ERR_INSUFFICIENT_RESOURCES' || error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
          setError('Troppe richieste simultanee. Riprova tra qualche secondo.');
        } else if (error.code === 'ERR_NETWORK') {
          setError('Errore di rete. Controlla la connessione.');
        } else {
          setError('Errore nel caricamento dei tenant');
        }
        
        // In caso di errori specifici o se c'è cache, usa dati di fallback
        if (error.response?.status === 403 || error.response?.status === 404 || 
            error.response?.status === 500 || error.response?.status === 429 ||
            error.code === 'ERR_INSUFFICIENT_RESOURCES' || error.code === 'ERR_NETWORK') {
          
          // Usa cache se disponibile
          if (tenantsCache && Date.now() - tenantsCache.timestamp < CACHE_DURATION * 2) {
            console.log('📦 useTenants: Using cached data due to error');
            setTenants(tenantsCache.data);
          } else {
            // Tenant di default come fallback
            const defaultTenant = {
              id: 'default',
              name: 'Tenant Principale',
              domain: 'localhost',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setTenants([defaultTenant]);
            console.log('📦 useTenants: Using default tenant as fallback');
          }
        } else {
          setTenants([]);
        }
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    }, 150); // Debounce di 150ms (leggermente più alto per i tenant)
  }, []);

  return {
    tenants,
    loading,
    error,
    tenantsLoading: loading,
    loadTenants
  };
};