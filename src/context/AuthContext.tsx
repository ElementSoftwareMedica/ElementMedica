import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import authService from '../services/auth';
import { AuthResponse } from '../types';
import { hasBackendPermission, convertBackendToFrontendPermissions } from '../utils/permissionMapping';

interface AuthContextType {
  user: AuthResponse['user'] | null;
  permissions: Record<string, boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Verifica lo stato di autenticazione all'avvio
  useEffect(() => {
    const verifyAuth = async () => {
      console.log('🔍 AuthContext: Verifying authentication on startup...');
      
      if (authService.isAuthenticated()) {
        console.log('🔑 AuthContext: Token found, verifying...');
        try {
          const res = await authService.verifyToken();
          console.log('📋 AuthContext: Verify response:', { valid: res.valid, hasUser: !!res.user, hasPermissions: !!res.permissions });
          
          if (res.valid && res.user) {
          // Map backend roles array to frontend single role
          const mappedUser = {
            ...res.user,
            role: res.user.roles?.includes('SUPER_ADMIN') ? 'Admin' : 
                  res.user.roles?.includes('ADMIN') ? 'Admin' : 
                  res.user.roles?.includes('COMPANY_ADMIN') ? 'Administrator' : 'User'
          };
          console.log('✅ AuthContext: User authenticated:', { id: mappedUser.id, role: mappedUser.role, roles: mappedUser.roles });
          console.log('🔐 AuthContext: Raw permissions from backend:', res.permissions);
          console.log('🔐 AuthContext: Companies permissions:', Object.keys(res.permissions || {}).filter(p => p.includes('companies')));
          
          // Verifica che i permessi siano validi
          if (res.permissions && typeof res.permissions === 'object') {
            setUser(mappedUser);
            // Converti i permessi dal formato backend al formato frontend per compatibilità
            const convertedPermissions = convertBackendToFrontendPermissions(res.permissions);
            setPermissions(convertedPermissions);
            console.log('🔐 AuthContext: Permissions set:', Object.keys(convertedPermissions).length, 'permissions');
            console.log('🔐 AuthContext: Backend permissions:', Object.keys(res.permissions).filter(p => res.permissions[p] === true));
            console.log('🔐 AuthContext: Frontend permissions:', Object.keys(convertedPermissions).filter(p => convertedPermissions[p] === true));
            
            // Test hasPermission subito dopo aver impostato i permessi
            console.log('🧪 Testing hasPermission for companies:read immediately after setting permissions...');
            const testResult = hasPermissionTest('companies', 'read', mappedUser, convertedPermissions || {});
            console.log('🧪 Test result:', testResult);
          } else {
            console.error('❌ AuthContext: Invalid permissions object:', res.permissions);
            setUser(mappedUser);
            setPermissions({});
          }
          } else {
            console.log('❌ AuthContext: Invalid token response');
            throw new Error('Invalid token response');
          }
        } catch (error) {
          console.error('❌ AuthContext: Error verifying token:', error);
          authService.removeToken();
          setUser(null);
          setPermissions({});
        }
      } else {
        console.log('🚫 AuthContext: No token found');
      }
      
      console.log('🏁 AuthContext: Setting isLoading to false');
      setIsLoading(false);
    };

    verifyAuth();
  }, []);

  // Login
  const login = async (identifier: string, password: string) => {
    try {
      console.log('🔐 Starting login process...');
      const response = await authService.login(identifier, password);
      console.log('📋 Login response structure:', {
        hasData: !!response,
        hasTokens: !!response.tokens,
        hasAccessToken: !!response.tokens?.access_token,
        hasUser: !!response.user,
        userRoles: response.user?.roles,
        tenantId: response.user?.tenantId
      });
      
      // La risposta del backend ha la struttura: {success, user, tokens: {access_token, refresh_token, ...}}
      if (response.tokens?.access_token) {
        console.log('💾 Saving token:', response.tokens.access_token.substring(0, 20) + '...');
        authService.saveToken(response.tokens.access_token);
        
        // Salva il tenant ID nel localStorage per le chiamate API
        if (response.user?.tenantId) {
          localStorage.setItem('tenantId', response.user.tenantId);
          console.log('🏢 Saving tenant ID:', response.user.tenantId);
        }
        
        // Verifica che il token sia stato salvato correttamente
        const savedToken = authService.getToken();
        console.log('✅ Token saved verification:', savedToken ? savedToken.substring(0, 20) + '...' : 'NO TOKEN SAVED');
        
        // Verifica nuovamente che il token sia disponibile
        const tokenAfterDelay = authService.getToken();
        console.log('🔍 Token verification after delay:', tokenAfterDelay ? tokenAfterDelay.substring(0, 20) + '...' : 'STILL NO TOKEN');
        
        if (!tokenAfterDelay) {
          console.error('🚨 CRITICAL: Token not available after delay - this will cause auth/verify to fail');
          throw new Error('Token not saved properly');
        }
        
        // Map backend roles array to frontend single role
        // Fallback mapping in case backend doesn't provide role field
        let mappedRole = 'User';
        if (response.user.roles?.includes('SUPER_ADMIN') || response.user.roles?.includes('ADMIN')) {
          mappedRole = 'Admin';
        } else if (response.user.roles?.includes('COMPANY_ADMIN')) {
          mappedRole = 'Administrator';
        }
        
        const mappedUser = {
          ...response.user,
          role: response.user.role || mappedRole // Use backend role if available, otherwise use mapped role
        };
        
        console.log('🔄 Role mapping:', {
          backendRole: response.user.role,
          mappedRole: mappedRole,
          finalRole: mappedUser.role,
          roles: response.user.roles
        });
        console.log('👤 Mapped user:', { id: mappedUser.id, role: mappedUser.role, originalRoles: mappedUser.roles });
        console.log('🔄 Setting user in AuthContext:', mappedUser);
        setUser(mappedUser);
        console.log('✅ User set in AuthContext, triggering re-render');
        
        // Log immediate state after login
        console.log('🔍 AuthContext state after login:', {
          hasUser: !!mappedUser,
          userId: mappedUser.id,
          userRole: mappedUser.role,
          userEmail: mappedUser.email
        });
        
        // Get permissions after login - con retry
        console.log('🔐 Getting permissions after login...');
        let permissionsLoaded = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!permissionsLoaded && retryCount < maxRetries) {
          try {
            console.log(`🔄 Attempting to verify token (attempt ${retryCount + 1}/${maxRetries})...`);
            const verifyRes = await authService.verifyToken();
            console.log('📋 Verify response:', {
              valid: verifyRes.valid,
              hasPermissions: !!verifyRes.permissions,
              permissionsCount: Object.keys(verifyRes.permissions || {}).length,
              companiesRead: verifyRes.permissions?.['companies:read']
            });
            
            if (verifyRes.valid && verifyRes.permissions) {
              // Converti i permessi dal formato backend al formato frontend per compatibilità
              const convertedPermissions = convertBackendToFrontendPermissions(verifyRes.permissions);
              setPermissions(convertedPermissions);
              console.log('✅ Permissions loaded successfully:', Object.keys(convertedPermissions).length, 'permissions');
              console.log('🔐 Login: Backend permissions:', Object.keys(verifyRes.permissions).filter(p => verifyRes.permissions[p] === true));
              console.log('🔐 Login: Frontend permissions:', Object.keys(convertedPermissions).filter(p => convertedPermissions[p] === true));
              permissionsLoaded = true;
            } else {
              console.warn('⚠️ Invalid verify response or no permissions');
              retryCount++;
              if (retryCount < maxRetries) {
                console.log('⏳ Retrying immediately...');
              }
            }
          } catch (error) {
            console.error(`❌ Error getting permissions (attempt ${retryCount + 1}):`, error);
            retryCount++;
            if (retryCount < maxRetries) {
              console.log('⏳ Retrying immediately...');
            }
          }
        }
        
        if (!permissionsLoaded) {
          console.error('❌ Failed to load permissions after', maxRetries, 'attempts');
          setPermissions({});
        }
        
        console.log('🎯 Login process completed');
      } else {
        throw new Error('No access token received');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // Gestione specifica per errore 429 (Rate Limiting)
      if (error.response?.status === 429) {
        const retryAfter = error.response?.data?.retryAfter || '15 minutes';
        const errorMessage = `Troppi tentativi di login. Riprova tra ${retryAfter}.`;
        console.error('🚫 Rate limit exceeded:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Gestione altri errori di rete
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
        throw new Error('Errore di connessione al server. Verifica la connessione di rete.');
      }
      
      // Re-throw dell'errore originale per altri casi
      throw error;
    }
  };

  // Logout
  const logout = () => {
    authService.removeToken();
    localStorage.removeItem('tenantId'); // Rimuovi anche il tenant ID
    setUser(null);
    setPermissions({});
    window.location.href = '/login'; // Redirect al login
  };

  // Funzione di test per hasPermission (per debug)
  const hasPermissionTest = (resource: string, action: string, testUser: any, testPermissions: Record<string, boolean>): boolean => {
    console.log(`🔐 Testing permission: ${resource}:${action}`, { 
      userRole: testUser?.role, 
      isAuthenticated: !!testUser,
      permissionsCount: Object.keys(testPermissions).length,
      hasSpecificPermission: testPermissions[`${resource}:${action}`]
    });
    
    // Se non c'è utente, nega l'accesso
    if (!testUser) {
      console.log('❌ Access denied: no user');
      return false;
    }
    
    // RIMOSSO: Admin o Administrator hanno sempre tutti i permessi
    // Ora tutti gli utenti, inclusi gli admin, devono avere permessi esplicitamente assegnati
    // Questo garantisce un controllo granulare dei permessi conforme al GDPR
    
    // Verifica permesso all:* (permesso universale)
    if (testPermissions['all:' + action] === true) {
      console.log('✅ Access granted: user has all:' + action + ' permission');
      return true;
    }
    
    // Verifica permesso resource:all (permesso per tutte le azioni sulla risorsa)
    if (testPermissions[resource + ':all'] === true) {
      console.log('✅ Access granted: user has ' + resource + ':all permission');
      return true;
    }
    
    // Verifica dei permessi specifici
    const permissionKey = `${resource}:${action}`;
    const hasSpecificPermission = testPermissions[permissionKey] === true;
    
    // Concedi accesso se c'è almeno un permesso con quel resource
    if (!hasSpecificPermission && action === 'read') {
      // For 'read' actions, check if the user has any permission for this resource
      const hasAnyPermissionForResource = Object.keys(testPermissions)
        .some(key => key.startsWith(resource + ':') && testPermissions[key] === true);
      
      if (hasAnyPermissionForResource) {
        console.log('✅ Access granted: user has some permission for ' + resource);
        return true;
      }
    }
    
    console.log(`${hasSpecificPermission ? '✅' : '❌'} Permission check result:`, hasSpecificPermission);
    return hasSpecificPermission;
  };

  // Verifica se l'utente ha un permesso specifico
  const hasPermission = (resourceOrPermission: string, action?: string): boolean => {
    // Gestisci sia il formato con un parametro (es. 'VIEW_USERS') che con due parametri (es. 'users', 'view')
    let permissionToCheck: string;
    
    if (action) {
      // Formato con due parametri: resource e action
      permissionToCheck = `${resourceOrPermission}:${action}`;
      console.log(`🔐 Checking permission (two params): ${resourceOrPermission}:${action}`);
    } else {
      // Formato con un parametro: permesso diretto
      permissionToCheck = resourceOrPermission;
      console.log(`🔐 Checking permission (single param): ${resourceOrPermission}`);
    }
    
    console.log(`🔐 Permission check details:`, { 
      userRole: user?.role, 
      isAuthenticated: !!user,
      permissionsCount: Object.keys(permissions).length,
      hasSpecificPermission: permissions[permissionToCheck],
      allPermissions: Object.keys(permissions).filter(key => permissions[key] === true)
    });
    
    // Se non c'è utente, nega l'accesso
    if (!user) {
      console.log('❌ Access denied: no user');
      return false;
    }
    
    // RIMOSSO: Admin o Administrator hanno sempre tutti i permessi
    // Ora tutti gli utenti, inclusi gli admin, devono avere permessi esplicitamente assegnati
    // Questo garantisce un controllo granulare dei permessi conforme al GDPR
    
    // Verifica permesso diretto (sia formato frontend che backend)
    if (permissions[permissionToCheck] === true) {
      console.log(`✅ Access granted: user has ${permissionToCheck} permission (direct match)`);
      return true;
    }
    
    // Se abbiamo due parametri, prova anche altri formati
    if (action) {
      // Verifica permesso all:* (permesso universale)
      if (permissions['all:' + action] === true) {
        console.log('✅ Access granted: user has all:' + action + ' permission');
        return true;
      }
      
      // Verifica permesso resource:all (permesso per tutte le azioni sulla risorsa)
      if (permissions[resourceOrPermission + ':all'] === true) {
        console.log('✅ Access granted: user has ' + resourceOrPermission + ':all permission');
        return true;
      }
      
      // Prova anche il formato backend usando hasBackendPermission
      // Questo è utile quando si passa un permesso nel formato backend direttamente
      const backendPermissionResult = hasBackendPermission(permissionToCheck, permissions);
      if (backendPermissionResult) {
        console.log(`✅ Access granted: user has ${permissionToCheck} permission (backend format match)`);
        return true;
      }
      
      // Concedi accesso se c'è almeno un permesso con quel resource
      if (action === 'read') {
        // For 'read' actions, check if the user has any permission for this resource
        const resourcePermissions = Object.keys(permissions)
          .filter(key => key.startsWith(resourceOrPermission + ':') && permissions[key] === true);
        
        console.log(`🔍 Found ${resourcePermissions.length} permissions for resource '${resourceOrPermission}':`, resourcePermissions);
        
        if (resourcePermissions.length > 0) {
          console.log('✅ Access granted: user has some permission for ' + resourceOrPermission);
          return true;
        }
      }
    } else {
      // Se è un singolo parametro, prova anche il formato backend
      const backendPermissionResult = hasBackendPermission(permissionToCheck, permissions);
      if (backendPermissionResult) {
        console.log(`✅ Access granted: user has ${permissionToCheck} permission (backend format match)`);
        return true;
      }
    }
    
    console.log(`❌ Permission check result: false for ${permissionToCheck}`);
    return false;
  };

  const value = {
    user,
    permissions,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission
  };
  
  // Debug log per monitorare lo stato
  console.log('🔄 AuthContext state:', {
    hasUser: !!user,
    userRole: user?.role,
    isAuthenticated: !!user,
    isLoading,
    permissionsCount: Object.keys(permissions).length
  });

  // Esponi l'AuthContext nel browser per il testing (solo in development)
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    (window as any).authContextForTesting = value;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export named per compatibilità Vite Fast Refresh
export { AuthContext };

// Re-export per centralizzare l'import dell'hook ottimizzato
export default useAuth;