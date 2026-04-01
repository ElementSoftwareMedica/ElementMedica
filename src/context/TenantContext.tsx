import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Company, Permission } from '../types';
import { getCurrentTenant } from '../services/tenants';
import { getUserPermissions, UserPermissions } from '../services/auth';
import { useAuth } from './AuthContext';
import { logGdprAction } from '../utils/gdpr';
import { recordApiCall, startTimer } from '../utils/metrics';

// Types
export interface TenantContextType {
  tenant: Company | null;
  userRole: string;
  permissions: Permission[];
  hasPermission: (resource: string, action: string) => boolean;
  isLoading: boolean;
  error: string | null;
  loadTenant: () => Promise<void>;
  refreshTenant: () => Promise<void>;
}

// Context
const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Hook per utilizzare il context
export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// Provider component
export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Company | null>(null);
  const [userRole, setUserRole] = useState<string>('Employee');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isAuthenticated, hasPermission: authHasPermission } = useAuth();

  // Log per verificare se AuthContext ha già il ruolo corretto
  useEffect(() => {
    if (user && user.role) {
    }
  }, [user?.role, user?.roles]);

  // Log ogni volta che user cambia
  useEffect(() => {
  }, [user, isAuthenticated]);

  // Refs per deduplication e controllo mount
  const requestRef = useRef<Promise<Company> | null>(null);
  const initializedRef = useRef(false);
  const mountedRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minuti cache

  // Set mounted to true on mount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Funzione per verificare i permessi
  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!isAuthenticated || !user) {
      return false;
    }

    // Se AuthContext ha una funzione hasPermission valida, usala
    if (authHasPermission && typeof authHasPermission === 'function') {
      return authHasPermission(resource, action);
    }

    // Fallback: usa la logica locale del TenantContext
    // Admin, Super Admin e Company Admin hanno tutti i permessi
    if (userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'Company Admin') {
      return true;
    }

    if (!permissions || permissions.length === 0) {
      return false;
    }

    // Verifica permesso specifico
    const hasSpecificPermission = permissions.some(p =>
      p.resource === resource &&
      (p.action === action || p.action === '*')
    );


    return hasSpecificPermission;
  }, [isAuthenticated, user, userRole, permissions, authHasPermission]);

  // Funzione per caricare il contesto tenant con deduplication
  const loadTenantContext = useCallback(async (forceRefresh = false): Promise<Company | null> => {
    if (!isAuthenticated || !user) {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      return null;
    }

    // Check cache TTL
    const now = Date.now();
    const cacheValid = (now - lastFetchRef.current) < CACHE_TTL;

    // Se abbiamo dati cached validi e non è un refresh forzato, restituisci i dati
    if (tenant && cacheValid && !forceRefresh && !error) {
      await logGdprAction({
        action: 'TENANT_FETCH_CACHED',
        timestamp: new Date().toISOString(),
        tenantId: tenant.id,
        userId: user.id,
        metadata: { cacheAge: now - lastFetchRef.current }
      });
      return tenant;
    }

    // Deduplication: se c'è già una richiesta in corso, restituisci quella
    if (requestRef.current) {
      await logGdprAction({
        action: 'TENANT_FETCH_DEDUPLICATED',
        timestamp: new Date().toISOString(),
        userId: user.id
      });
      return requestRef.current;
    }

    const timer = startTimer();

    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    // Crea la promise e salvala nel ref per deduplication
    const fetchPromise = (async (): Promise<Company> => {
      try {
        // Carica tenant corrente
        const tenantData = await getCurrentTenant();

        // Carica permessi utente
        let userPermissions: UserPermissions = { permissions: [], role: 'EMPLOYEE' };

        if (user.id) {
          // Se AuthContext ha già un ruolo valido (non Employee), usalo direttamente
          if (user.role && user.role !== 'Employee') {

            // Crea un oggetto permissions compatibile usando il ruolo dall'AuthContext
            userPermissions = {
              role: user.role,
              permissions: [] // Le permissions verranno gestite dall'AuthContext
            };
          } else {
            // Fallback: chiama l'API solo se AuthContext non ha un ruolo valido
            try {
              userPermissions = await getUserPermissions(user.id);
            } catch (error) {
              const err = error as Error & { response?: { status?: number; statusText?: string; data?: unknown } };
              if (import.meta.env.DEV) {
                console.error('❌ TenantContext: Error getting user permissions:', {
                  status: err.response?.status,
                  statusText: err.response?.statusText,
                });
                if (err.response?.status === 403) {
                  console.error('🚫 TenantContext: 403 Forbidden - User ID mismatch or authorization issue');
                }
              }
            }
          }
        } else {
          if (import.meta.env.DEV) {
            console.warn('⚠️ TenantContext: No user.id available, skipping getUserPermissions call');
          }
        }

        const duration = timer();
        recordApiCall('/tenants/current', 'GET', duration, 200, { cached: false, deduplicated: false });

        // Log GDPR action per audit trail
        await logGdprAction({
          action: 'TENANT_FETCH_SUCCESS',
          timestamp: new Date().toISOString(),
          tenantId: tenantData?.id,
          userId: user.id,
          metadata: {
            duration,
            cached: false,
            deduplicated: false,
            permissionsCount: userPermissions.permissions?.length || 0
          }
        });

        // Map backend role to frontend role - convert backend format to frontend format
        const roleMapping: { [key: string]: string } = {
          'ADMIN': 'Admin',
          'SUPER_ADMIN': 'Super Admin',
          'COMPANY_ADMIN': 'Company Admin',
          'EMPLOYEE': 'Employee',
          // P52: Clinical roles mapping
          'MEDICO': 'Medico',
          'PAZIENTE': 'Paziente',
          'INFERMIERE': 'Infermiere',
          'PERSONALE_SEGRETERIA': 'Segreteria'
        };

        // P52 Fix: Check if role is already mapped (e.g., 'Medico' from AuthContext)
        // or if it needs to be mapped from backend format (e.g., 'MEDICO')
        const alreadyMappedRoles = Object.values(roleMapping);
        const mappedRole = alreadyMappedRoles.includes(userPermissions.role)
          ? userPermissions.role  // Already mapped by AuthContext
          : (roleMapping[userPermissions.role] || 'Employee'); // Map from backend format


        // Aggiorna stato solo se componente ancora montato
        if (mountedRef.current) {
          setTenant(tenantData);
          setPermissions(userPermissions.permissions || []);
          setUserRole(mappedRole);
          lastFetchRef.current = Date.now();
        }

        return tenantData;
      } catch (err: unknown) {
        const duration = timer();
        const errorMessage = 'Unknown error';
        const axiosErr = err as { status?: number };

        recordApiCall('/tenants/current', 'GET', duration, axiosErr.status || 500, {
          cached: false,
          deduplicated: false,
          error: errorMessage
        });

        // Log GDPR error per audit trail
        await logGdprAction({
          action: 'TENANT_FETCH_ERROR',
          timestamp: new Date().toISOString(),
          userId: user.id,
          error: errorMessage,
          metadata: {
            duration,
            errorType: err instanceof Error ? err.constructor.name : 'UnknownError'
          }
        });

        // Aggiorna stato solo se componente ancora montato
        if (mountedRef.current) {
          setError(errorMessage);
          if (import.meta.env.DEV) console.error('❌ Failed to fetch tenant:', errorMessage);
        }

        throw err;
      }
    })();

    requestRef.current = fetchPromise;

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      // Cleanup
      requestRef.current = null;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, user?.id, tenant, error]);

  // Funzione per aggiornare il tenant
  const refreshTenant = useCallback(async () => {
    setTenant(null);
    setError(null);
    lastFetchRef.current = 0; // Invalida cache

    try {
      await loadTenantContext(true); // Force refresh
    } catch (error) {
      // Error già gestito in loadTenantContext
      if (import.meta.env.DEV) console.error('Failed to refresh tenant:', error);
    }
  }, [loadTenantContext]);

  // Inizializzazione automatica una sola volta
  useEffect(() => {

    if (!initializedRef.current && mountedRef.current && isAuthenticated && user?.id) {
      initializedRef.current = true;

      // Piccolo delay per permettere al token di essere propagato negli interceptor Axios
      setTimeout(() => {
        if (mountedRef.current) {
          loadTenantContext().then(() => {
          }).catch((error) => {
            if (import.meta.env.DEV) console.error('❌ TenantContext: loadTenantContext failed:', error);
            // Error già gestito in loadTenantContext
          });
        }
      }, 100); // 100ms delay per permettere la propagazione del token
    } else {
    }
  }, [isAuthenticated, user?.id, loadTenantContext]);

  // Reset quando l'utente cambia o si disconnette
  useEffect(() => {

    if (!isAuthenticated || !user?.id) {
      setTenant(null);
      setPermissions([]);
      setUserRole('Employee');
      setError(null);
      setIsLoading(false);
      initializedRef.current = false;
      lastFetchRef.current = 0;
      requestRef.current = null;
    }
  }, [isAuthenticated, user?.id]);

  // Valore del context
  const contextValue: TenantContextType = {
    tenant,
    userRole,
    permissions,
    hasPermission,
    isLoading,
    error,
    loadTenant: refreshTenant, // Alias for backwards compatibility
    refreshTenant
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

// Export named per compatibilità Vite Fast Refresh
export { TenantContext };