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
  logout: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  // Nessun bypass: autenticazione obbligatoria
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Dev bypass rimosso

  // Verifica lo stato di autenticazione all'avvio
  useEffect(() => {
    const verifyAuth = async () => {
      console.log('🔍 AuthContext: Verifying authentication on startup...');

      // Nessun bypass in dev: esegui sempre verifica standard

      try {
        // Migrazione chiavi storage per compatibilità con versioni legacy
        authService.migrateStorageKeys();

        let token = authService.getToken();
        if (!token) {
          // Primo tentativo: verifica basata su cookie di sessione (withCredentials)
          console.log('🚫 No access token found. Trying cookie-based verify...');
          try {
            const res = await authService.verifyToken();
            console.log('📋 Cookie verify response:', { valid: res.valid, hasUser: !!res.user, hasPermissions: !!res.permissions });
            if (res.valid && res.user) {
              // Map backend roles array to frontend single role
              const mappedUser = {
                ...res.user,
                role: res.user.roles?.includes('SUPER_ADMIN') ? 'Admin' :
                      res.user.roles?.includes('ADMIN') ? 'Admin' :
                      res.user.roles?.includes('COMPANY_ADMIN') ? 'Administrator' : 'User'
              };
              console.log('✅ AuthContext: Cookie session authenticated:', { id: mappedUser.id, role: mappedUser.role, roles: mappedUser.roles });

              if (res.permissions && typeof res.permissions === 'object') {
                setUser(mappedUser);
                const convertedPermissions = convertBackendToFrontendPermissions(res.permissions);
                setPermissions(convertedPermissions);
              } else {
                setUser(mappedUser);
                setPermissions({});
              }
              // Autenticazione valida via cookie, termina qui
              return;
            }
          } catch (e) {
            console.log('❌ Cookie verify failed. Trying refresh with refresh token...');
          }

          // Secondo tentativo: prova refresh con refresh token client-side
          const refreshed = await authService.refreshAccess();
          if (refreshed) {
            console.log('✅ Access token obtained via refresh');
            token = refreshed;
          } else {
            console.log('❌ Refresh failed or no refresh token available. Skipping verify.');
            setUser(null);
            setPermissions({});
            return;
          }
        }

        const performVerify = async () => {
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
            
            // Verifica che i permessi siano validi
            if (res.permissions && typeof res.permissions === 'object') {
              setUser(mappedUser);
              // Converti i permessi dal formato backend al formato frontend per compatibilità
              const convertedPermissions = convertBackendToFrontendPermissions(res.permissions);
              setPermissions(convertedPermissions);
              console.log('🔐 AuthContext: Permissions set:', Object.keys(convertedPermissions).length, 'permissions');
            } else {
              console.error('❌ AuthContext: Invalid permissions object:', res.permissions);
              setUser(mappedUser);
              setPermissions({});
            }
          } else {
            console.log('❌ AuthContext: Invalid token response');
            throw new Error('Invalid token response');
          }
        };

        try {
          await performVerify();
        } catch (error: any) {
          const status = error?.response?.status;
          console.warn('⚠️ Verify failed', { status, message: error?.message });

          if (status === 401 || status === 403) {
            console.log('🔄 Trying refresh then retry verify...');
            const refreshed = await authService.refreshAccess();
            if (refreshed) {
              try {
                await performVerify();
              } catch (e2) {
                console.error('❌ Verify retry after refresh failed:', e2);
                authService.removeToken();
                authService.removeRefreshToken();
                setUser(null);
                setPermissions({});
              }
            } else {
              console.log('❌ Refresh failed, clearing auth state');
              authService.removeToken();
              authService.removeRefreshToken();
              setUser(null);
              setPermissions({});
            }
          } else {
            console.error('❌ AuthContext: Error verifying token:', error);
            authService.removeToken();
            setUser(null);
            setPermissions({});
          }
        }
      } finally {
        console.log('🏁 AuthContext: Setting isLoading to false');
        setIsLoading(false);
      }
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
        hasAccessToken: !!(response as any)?.tokens && (("access_token" in (response as any).tokens) || ("accessToken" in (response as any).tokens)),
        hasUser: !!response.user,
        userRoles: response.user?.roles,
        tenantId: response.user?.tenantId
      });
      
      // Normalizza le chiavi dei token per supportare sia snake_case che camelCase dal backend
      const accessToken = (response as any)?.tokens?.access_token || (response as any)?.tokens?.accessToken;
      const refreshToken = (response as any)?.tokens?.refresh_token || (response as any)?.tokens?.refreshToken;
      
      if (accessToken) {
        authService.saveToken(accessToken);
        
        // Salva anche il refresh token se presente
        if (refreshToken) {
          authService.saveRefreshToken(refreshToken);
        }
        
        // Salva il tenant ID nel localStorage per le chiamate API
        if (response.user?.tenantId) {
          localStorage.setItem('tenantId', response.user.tenantId);
        }
        
        // Verifica che il token sia stato salvato correttamente
        const savedToken = authService.getToken();
        if (!savedToken) {
          console.error('🚨 CRITICAL: Token not available after save - this will cause auth/verify to fail');
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
        
        setUser(mappedUser);
        
        // Get permissions after login - con retry
        let permissionsLoaded = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!permissionsLoaded && retryCount < maxRetries) {
          try {
            const verifyRes = await authService.verifyToken();
            
            if (verifyRes.valid && verifyRes.permissions) {
              // Converti i permessi dal formato backend al formato frontend per compatibilità
              const convertedPermissions = convertBackendToFrontendPermissions(verifyRes.permissions);
              setPermissions(convertedPermissions);
              permissionsLoaded = true;
            } else {
              retryCount++;
            }
          } catch (e) {
            retryCount++;
          }
        }
      } else {
        // Fallback: autenticazione basata su cookie (token non presente nel body)
        console.warn('⚠️ No access token in login response body. Attempting cookie-based session verification...');

        // Salva il tenant ID se presente
        if (response.user?.tenantId) {
          localStorage.setItem('tenantId', response.user.tenantId);
        }

        try {
          const verifyRes = await authService.verifyToken();
          if (verifyRes.valid && verifyRes.user) {
            // Map backend roles array to frontend single role
            const mappedUser = {
              ...verifyRes.user,
              role: verifyRes.user.roles?.includes('SUPER_ADMIN') ? 'Admin' :
                    verifyRes.user.roles?.includes('ADMIN') ? 'Admin' :
                    verifyRes.user.roles?.includes('COMPANY_ADMIN') ? 'Administrator' : 'User'
            };
            setUser(mappedUser);

            if (verifyRes.permissions && typeof verifyRes.permissions === 'object') {
              const convertedPermissions = convertBackendToFrontendPermissions(verifyRes.permissions);
              setPermissions(convertedPermissions);
            } else {
              setPermissions({});
            }
          } else {
            console.error('❌ Cookie-based verify failed after login.');
            throw new Error('Login response missing access token and cookie verification failed');
          }
        } catch (e) {
          console.error('❌ AuthContext: Cookie-based verification error:', e);
          throw e;
        }
      }
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Prova a revocare la sessione lato backend usando il refresh token
      await authService.logout();
    } catch (error) {
      console.warn('⚠️ Logout backend failed, proceeding with client cleanup:', error);
    } finally {
      authService.removeToken();
      authService.removeRefreshToken();
      localStorage.removeItem('tenantId'); // Rimuovi anche il tenant ID
      setUser(null);
      setPermissions({});
      window.location.href = '/login'; // Redirect al login
    }
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
    
    // Verifica permesso all:* (permesso universale)
    if (permissions['all:' + (action || '')] === true) {
      console.log('✅ Access granted: user has all:' + (action || '') + ' permission');
      return true;
    }
    
    // Verifica permesso resource:all (permesso per tutte le azioni sulla risorsa)
    if (permissions[(resourceOrPermission + ':all')] === true) {
      console.log('✅ Access granted: user has ' + resourceOrPermission + ':all permission');
      return true;
    }
    
    // Verifica dei permessi specifici
    const permissionKey = action ? `${resourceOrPermission}:${action}` : resourceOrPermission;
    const hasSpecificPermission = permissions[permissionKey] === true;

    // Concedi accesso se c'è almeno un permesso con quel resource per azioni di lettura
    if (!hasSpecificPermission && action === 'read') {
      const hasAnyPermissionForResource = Object.keys(permissions)
        .some(key => key.startsWith(resourceOrPermission + ':') && permissions[key] === true);
      if (hasAnyPermissionForResource) {
        console.log('✅ Access granted: user has some permission for ' + resourceOrPermission);
        return true;
      }
    }

    console.log(`${hasSpecificPermission ? '✅' : '❌'} Permission check result:`, hasSpecificPermission);
    return hasSpecificPermission;
  };

  return (
    <AuthContext.Provider value={{
      user,
      permissions,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };

export default useAuth;