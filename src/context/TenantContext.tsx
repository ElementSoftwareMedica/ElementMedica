import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Company, Permission } from '../types';
import { getCurrentTenant } from '../services/tenants';
import { getUserPermissions } from '../services/auth';
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
  refreshTenant: () => Promise<void>;
}

export interface Permission {
  resource: string;
  action: string;
  scope?: string;
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
      console.log('🎭 TenantContext: AuthContext already has user role:', {
        userRole: user.role,
        userRoles: user.roles,
        shouldUseAuthRole: user.role !== 'Employee',
        authContextComplete: !!user.role
      });
    }
  }, [user?.role, user?.roles]);
  
  // Log ogni volta che user cambia
  useEffect(() => {
    console.log('🔄 TenantContext: User object changed:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      isAuthenticated,
      timestamp: new Date().toISOString()
    });
  }, [user, isAuthenticated]);
  
  // Refs per deduplication e controllo mount
  const requestRef = useRef<Promise<Company> | null>(null);
  const initializedRef = useRef(false);
  const mountedRef = useRef(true);
  const lastFetchRef = useRef<number>(0);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minuti cache

  // Funzione per verificare i permessi
  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!isAuthenticated || !user) {
      console.log('🔐 TenantContext hasPermission: Not authenticated or no user');
      return false;
    }

    // Se AuthContext ha una funzione hasPermission valida, usala
    if (authHasPermission && typeof authHasPermission === 'function') {
      console.log('🔐 TenantContext hasPermission: Using AuthContext hasPermission for', { resource, action });
      return authHasPermission(resource, action);
    }

    // Fallback: usa la logica locale del TenantContext
    // Admin, Super Admin e Company Admin hanno tutti i permessi
    if (userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'Company Admin') {
      console.log('🔑 TenantContext: Admin access granted for:', { resource, action, userRole });
      return true;
    }
    
    if (!permissions || permissions.length === 0) {
      console.log('🚫 TenantContext: No permissions found for:', { resource, action, userRole, permissionsCount: 0 });
      return false;
    }
    
    // Verifica permesso specifico
    const hasSpecificPermission = permissions.some(p => 
      p.resource === resource && 
      (p.action === action || p.action === '*')
    );
    
    console.log('🔍 TenantContext: Permission check (fallback):', {
      resource,
      action,
      userRole,
      permissionsCount: permissions.length,
      hasSpecificPermission,
      permissions: permissions.map(p => `${p.resource}:${p.action}`)
    });
    
    return hasSpecificPermission;
  }, [isAuthenticated, user, userRole, permissions, authHasPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
      console.log('📦 Using cached tenant data');
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
      console.log('🔄 Deduplicating tenant request - using existing promise');
      await logGdprAction({
        action: 'TENANT_FETCH_DEDUPLICATED',
        timestamp: new Date().toISOString(),
        userId: user.id
      });
      return requestRef.current;
    }

    console.log('🚀 Fetching tenant data...');
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
        let userPermissions: any = { permissions: [], role: 'EMPLOYEE' };
        console.log('🔍 TenantContext: User state check:', {
          hasUser: !!user,
          userId: user?.id,
          userEmail: user?.email,
          userRole: user?.role,
          userObject: user
        });
        
        if (user.id) {
          // Se AuthContext ha già un ruolo valido (non Employee), usalo direttamente
          if (user.role && user.role !== 'Employee') {
            console.log('✅ TenantContext: Using role from AuthContext directly:', {
              authRole: user.role,
              authRoles: user.roles,
              skipApiCall: true
            });
            
            // Crea un oggetto permissions compatibile usando il ruolo dall'AuthContext
            userPermissions = {
              role: user.role,
              permissions: [] // Le permissions verranno gestite dall'AuthContext
            };
          } else {
            // Fallback: chiama l'API solo se AuthContext non ha un ruolo valido
            console.log('🔍 TenantContext: AuthContext role not available, calling getUserPermissions API');
            console.log('🔍 TenantContext: User object details:', {
              id: user.id,
              email: user.email,
              role: user.role,
              roles: user.roles,
              fullUser: user
            });
            try {
              userPermissions = await getUserPermissions(user.id);
              console.log('🔍 TenantContext: getUserPermissions SUCCESS response:', {
                role: userPermissions.role,
                permissionsCount: userPermissions.permissions?.length || 0,
                permissions: userPermissions.permissions,
                fullResponse: userPermissions
              });
            } catch (error) {
              console.error('❌ TenantContext: Error getting user permissions:', {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                stack: error.stack,
                userId: user.id,
                fullError: error
              });
              console.error('❌ TenantContext: Will use default EMPLOYEE role due to error');
              
              // Se l'errore è 403, potrebbe essere un problema di autorizzazione
              if (error.response?.status === 403) {
                console.error('🚫 TenantContext: 403 Forbidden - User ID mismatch or authorization issue');
                console.error('🚫 TenantContext: Check if user.id matches authenticated user ID');
              }
            }
          }
        } else {
          console.warn('⚠️ TenantContext: No user.id available, skipping getUserPermissions call');
          console.warn('⚠️ TenantContext: User object state:', {
            user,
            hasUser: !!user,
            userKeys: user ? Object.keys(user) : 'no user'
          });
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
          'EMPLOYEE': 'Employee'
        };
        
        const mappedRole = roleMapping[userPermissions.role] || 'Employee';
        
        console.log('🎭 TenantContext: Role mapping:', {
          backendRole: userPermissions.role,
          mappedRole: mappedRole,
          permissionsCount: userPermissions.permissions?.length || 0,
          roleMapping
        });

        // Aggiorna stato solo se componente ancora montato
        if (mountedRef.current) {
          setTenant(tenantData);
          setPermissions(userPermissions.permissions || []);
          setUserRole(mappedRole);
          lastFetchRef.current = Date.now();
          console.log('✅ Tenant data loaded successfully:', tenantData.name);
        }
        
        return tenantData;
      } catch (err: any) {
        const duration = timer();
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        recordApiCall('/tenants/current', 'GET', duration, err.status || 500, { 
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
          console.error('❌ Failed to fetch tenant:', errorMessage);
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
    console.log('🔄 Refreshing tenant data...');
    setTenant(null);
    setError(null);
    lastFetchRef.current = 0; // Invalida cache
    
    try {
      await loadTenantContext(true); // Force refresh
    } catch (error) {
      // Error già gestito in loadTenantContext
      console.error('Failed to refresh tenant:', error);
    }
  }, [loadTenantContext]);

  // Inizializzazione automatica una sola volta
  useEffect(() => {
    console.log('🔍 TenantContext useEffect triggered:', {
      initializedRef: initializedRef.current,
      mountedRef: mountedRef.current,
      isAuthenticated,
      hasUserId: !!user?.id,
      userId: user?.id,
      userEmail: user?.email,
      userObject: user,
      userRole: user?.role,
      timestamp: new Date().toISOString()
    });
    
    if (!initializedRef.current && mountedRef.current && isAuthenticated && user?.id) {
      initializedRef.current = true;
      console.log('🎯 Initializing TenantContext for user:', user.id);
      console.log('🎯 TenantContext: Adding small delay to ensure token propagation...');
      
      // Piccolo delay per permettere al token di essere propagato negli interceptor Axios
      setTimeout(() => {
        if (mountedRef.current) {
          console.log('🎯 TenantContext: Starting loadTenantContext after delay...');
          loadTenantContext().then(() => {
            console.log('✅ TenantContext: loadTenantContext completed successfully');
          }).catch((error) => {
            console.error('❌ TenantContext: loadTenantContext failed:', error);
            // Error già gestito in loadTenantContext
          });
        }
      }, 100); // 100ms delay per permettere la propagazione del token
    } else {
      console.log('🚫 TenantContext: Skipping initialization:', {
        initializedRef: initializedRef.current,
        mountedRef: mountedRef.current,
        isAuthenticated,
        hasUserId: !!user?.id,
        reason: !initializedRef.current ? 'not initialized' : 
                !mountedRef.current ? 'not mounted' :
                !isAuthenticated ? 'not authenticated' :
                !user?.id ? 'no user id' : 'unknown'
      });
    }
  }, [isAuthenticated, user?.id, loadTenantContext]);

  // Reset quando l'utente cambia o si disconnette
  useEffect(() => {
    console.log('🔍 TenantContext reset useEffect triggered:', {
      isAuthenticated,
      hasUserId: !!user?.id,
      userId: user?.id,
      shouldReset: !isAuthenticated || !user?.id
    });
    
    if (!isAuthenticated || !user?.id) {
      console.log('🔄 User changed or logged out, resetting tenant context');
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