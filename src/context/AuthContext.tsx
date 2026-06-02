import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import { useLocation } from 'react-router-dom';
import authService, { IdentifyResponse, IdentifyAccount } from '../services/auth';
import { AuthResponse, Person } from '../types';
import { convertBackendToFrontendPermissions } from '../utils/permissionMapping';
const ForceChangePasswordModal = React.lazy(() => import('../components/auth/ForceChangePasswordModal'));

/**
 * Maps backend roles array to frontend display role
 * P52: Added clinical roles (MEDICO, PAZIENTE, INFERMIERE, SEGRETERIA_CLINICA)
 * 
 * Priority: SUPER_ADMIN > ADMIN > COMPANY_ADMIN/TENANT_ADMIN > MEDICO > PAZIENTE > INFERMIERE > EMPLOYEE > User
 */
const mapRolesToDisplayRole = (roles: string[] | undefined): string => {
  if (!roles || roles.length === 0) return 'User';

  // Admin roles
  if (roles.includes('SUPER_ADMIN')) return 'Admin';
  if (roles.includes('ADMIN')) return 'Admin';
  if (roles.includes('COMPANY_ADMIN')) return 'Administrator';
  if (roles.includes('TENANT_ADMIN')) return 'Administrator';

  // Clinical roles (P52)
  if (roles.includes('MEDICO_COMPETENTE')) return 'Medico Competente';
  if (roles.includes('MEDICO')) return 'Medico';
  if (roles.includes('PAZIENTE')) return 'Paziente';
  if (roles.includes('INFERMIERE')) return 'Infermiere';
  if (roles.includes('SEGRETERIA_CLINICA')) return 'Segreteria';

  // Standard roles
  if (roles.includes('MANAGER')) return 'Manager';
  if (roles.includes('TRAINER')) return 'Formatore';
  if (roles.includes('EMPLOYEE')) return 'Employee';

  // Fallback: use first role or User
  return roles[0] || 'User';
};

interface AuthContextType {
  user: AuthResponse['user'] | null;
  permissions: Record<string, boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  pendingPassword: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithPersonId: (personId: string, password: string) => Promise<void>;
  identify: (identifier: string) => Promise<IdentifyResponse>;
  logout: () => Promise<void>;
  clearMustChangePassword: () => void;
  hasPermission: (resourceOrPermission: string, action?: string) => boolean;
  refreshUser: () => Promise<void>;
  // Nessun bypass: autenticazione obbligatoria
}

// Re-export types for convenience
export type { IdentifyResponse, IdentifyAccount };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);
  // Dev bypass rimosso

  // Verifica lo stato di autenticazione all'avvio
  useEffect(() => {
    const verifyAuth = async () => {
      // Lista delle route pubbliche che NON richiedono autenticazione
      const publicRoutes = [
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/contatti',
        '/corsi',
        '/servizi',
        '/rspp',
        '/medicina-del-lavoro',
        '/lavora-con-noi',
        '/carriere',
        '/privacy-policy',
        '/cookie-policy',
        '/termini',
        '/form' // Form pubblici
      ];

      // Lista delle route protette (area riservata)
      const protectedRoutes = [
        '/dashboard',
        '/clinica', // Element Medica clinical module (legacy)
        '/poliambulatorio', // Element Medica clinical module (new)
        '/management', // Management area
        '/companies',
        '/courses',
        '/employees',
        '/trainers',
        '/persons',
        '/settings',
        '/schedules',
        '/calendar',
        '/documents',
        '/documents-corsi',
        '/quotes',
        '/invoices',
        '/preventivi',
        '/forms',
        '/test',
        '/templates',
        '/profile',
        '/users',
        '/roles',
        '/permissions',
        '/admin',
        '/gdpr',
        '/notifications',
        '/cms' // CMS Hub (pagina admin per gestione pagine CMS)
      ];

      // Verifica se è route protetta (priorità massima)
      const isProtectedRoute = protectedRoutes.some(route => location.pathname.startsWith(route));

      if (isProtectedRoute) {
        // Continua con la verifica auth
      } else {
        // Verifica se è route pubblica esplicita
        const isExplicitPublicRoute = location.pathname === '/' ||
          publicRoutes.some(route => location.pathname.startsWith(route));

        if (isExplicitPublicRoute) {
          setIsLoading(false);
          return;
        }

        // Fallback: route dinamiche CMS (es. /chi-siamo, /qualita, ecc.)
        // Solo se NON è già una route protetta
        if (location.pathname.match(/^\/[^/]+$/) && !isProtectedRoute) {
          setIsLoading(false);
          return;
        }
      }


      // Nessun bypass in dev: esegui sempre verifica standard

      try {
        let token = authService.getToken();
        if (!token) {
          // Il backend supporta SOLO Bearer token (no cookie auth).
          // Se non c'è access token in memory, si tenta direttamente il refresh.
          // Questo evita un 401 inutile dal cookie-verify che sporcherebbe la console.
          const refreshed = await authService.refreshAccess();
          if (refreshed) {
            token = refreshed;
          } else {
            // Nessun refresh token disponibile → utente non autenticato (normale per pagine pubbliche)
            setUser(null);
            setPermissions({});
            return;
          }
        }

        const performVerify = async () => {
          const res = await authService.verifyToken();

          if (res.valid && res.user) {
            // Map backend roles array to frontend single role
            // IMPORTANTE: Manteniamo roleType per il role-based filtering
            const primaryRoleType = res.user.roles?.[0] || res.user.roleType || undefined;
            const mappedUser = {
              ...res.user,
              roleType: primaryRoleType, // Per useRoleBasedData hook
              role: mapRolesToDisplayRole(res.user.roles)
            };

            setUser(mappedUser);

            // F313: Se mustChangePassword=true, mostra il modal senza caricare permessi
            if (res.mustChangePassword) {
              setMustChangePassword(true);
              setPermissions({});
              return;
            }

            // Verifica che i permessi siano validi
            if (res.permissions && typeof res.permissions === 'object') {
              // Converti i permessi dal formato backend al formato frontend per compatibilità
              const convertedPermissions = convertBackendToFrontendPermissions(res.permissions);
              setPermissions(convertedPermissions);
            } else {
              if (import.meta.env.DEV) console.error('❌ AuthContext: Invalid permissions object:', res.permissions);
              setPermissions({});
            }
          } else {
            throw new Error('Risposta token non valida');
          }
        };

        try {
          await performVerify();
        } catch (error: unknown) {
          const status = (error as any)?.response?.status;
          if (import.meta.env.DEV) console.warn('⚠️ Verify failed', { status });

          if (status === 401 || status === 403) {
            const refreshed = await authService.refreshAccess();
            if (refreshed) {
              try {
                await performVerify();
              } catch (e2) {
                if (import.meta.env.DEV) console.error('❌ Verify retry after refresh failed:', e2);
                authService.removeToken();
                authService.removeRefreshToken();
                setUser(null);
                setPermissions({});
              }
            } else {
              authService.removeToken();
              authService.removeRefreshToken();
              setUser(null);
              setPermissions({});
            }
          } else {
            if (import.meta.env.DEV) console.error('❌ AuthContext: Error verifying token:', error);
            authService.removeToken();
            setUser(null);
            setPermissions({});
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [location.pathname]); // Re-verify when navigating between public/admin routes

  // Login
  const login = async (identifier: string, password: string) => {
    try {
      const response = await authService.login(identifier, password);

      // Backend restituisce snake_case (access_token, refresh_token) come da AuthResponse
      const accessToken = response.tokens?.access_token;
      const refreshToken = response.tokens?.refresh_token;

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
          if (import.meta.env.DEV) console.error('🚨 CRITICAL: Token not available after save - this will cause auth/verify to fail');
          throw new Error('Token not saved properly');
        }

        // Map backend roles array to frontend single role using centralized function
        // P52: Includes clinical roles (MEDICO, PAZIENTE, INFERMIERE, etc.)
        const primaryRoleType = response.user.roles?.[0] || response.user.roleType || undefined;
        const mappedUser = {
          ...response.user,
          roleType: primaryRoleType, // Per useRoleBasedData hook
          role: mapRolesToDisplayRole(response.user.roles) // Use centralized role mapping
        };

        setUser(mappedUser);

        // Controlla se è richiesto il cambio password al primo accesso
        if (response.mustChangePassword) {
          setMustChangePassword(true);
          setPendingPassword(password);
          return; // Non caricare permessi - l'utente deve prima cambiare password
        }

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
        if (import.meta.env.DEV) console.warn('⚠️ No access token in login response body. Attempting cookie-based session verification...');

        // Salva il tenant ID se presente
        if (response.user?.tenantId) {
          localStorage.setItem('tenantId', response.user.tenantId);
        }

        try {
          const verifyRes = await authService.verifyToken();
          if (verifyRes.valid && verifyRes.user) {
            // Map backend roles array to frontend single role
            // IMPORTANTE: Manteniamo roleType per il role-based filtering
            const primaryRoleType = verifyRes.user.roles?.[0] || verifyRes.user.roleType || undefined;
            const mappedUser = {
              ...verifyRes.user,
              roleType: primaryRoleType, // Per useRoleBasedData hook
              role: mapRolesToDisplayRole(verifyRes.user.roles)
            };
            setUser(mappedUser);

            if (verifyRes.permissions && typeof verifyRes.permissions === 'object') {
              const convertedPermissions = convertBackendToFrontendPermissions(verifyRes.permissions);
              setPermissions(convertedPermissions);
            } else {
              setPermissions({});
            }
          } else {
            if (import.meta.env.DEV) console.error('❌ Cookie-based verify failed after login.');
            throw new Error('Login response missing access token and cookie verification failed');
          }
        } catch (e) {
          if (import.meta.env.DEV) console.error('❌ AuthContext: Cookie-based verification error:', e);
          throw e;
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('❌ AuthContext: Login error:', error);
      throw error;
    }
  };

  // PROGETTO 49: Identify - Step 1 del multi-step login
  const identify = async (identifier: string): Promise<IdentifyResponse> => {
    try {
      const response = await authService.identify(identifier);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // PROGETTO 49: Login with personId - Step 2 del multi-step login
  const loginWithPersonId = async (personId: string, password: string) => {
    try {
      const response = await authService.loginWithPersonId(personId, password);

      // Backend restituisce snake_case (access_token, refresh_token) come da AuthResponse
      const accessToken = response.tokens?.access_token;
      const refreshToken = response.tokens?.refresh_token;

      if (accessToken) {
        authService.saveToken(accessToken);
        if (refreshToken) {
          authService.saveRefreshToken(refreshToken);
        }
        if (response.user?.tenantId) {
          localStorage.setItem('tenantId', response.user.tenantId);
        }

        const savedToken = authService.getToken();
        if (!savedToken) {
          if (import.meta.env.DEV) console.error('🚨 CRITICAL: Token not available after save');
          throw new Error('Token not saved properly');
        }

        let mappedRole = 'User';
        if (response.user.roles?.includes('SUPER_ADMIN') || response.user.roles?.includes('ADMIN')) {
          mappedRole = 'Admin';
        } else if (response.user.roles?.includes('COMPANY_ADMIN')) {
          mappedRole = 'Administrator';
        }

        const primaryRoleType = response.user.roles?.[0] || response.user.roleType || undefined;
        const mappedUser = {
          ...response.user,
          roleType: primaryRoleType,
          role: response.user.role || mappedRole
        };

        setUser(mappedUser);

        // Controlla se è richiesto il cambio password al primo accesso
        if (response.mustChangePassword) {
          setMustChangePassword(true);
          setPendingPassword(password);
          return;
        }

        // Get permissions after login
        let permissionsLoaded = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!permissionsLoaded && retryCount < maxRetries) {
          try {
            const verifyRes = await authService.verifyToken();
            if (verifyRes.valid && verifyRes.permissions) {
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
        throw new Error('No access token in response');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('❌ AuthContext: Login with personId error:', error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Prova a revocare la sessione lato backend usando il refresh token
      await authService.logout();
    } catch (error) {
      if (import.meta.env.DEV) console.warn('⚠️ Logout backend failed, proceeding with client cleanup:', error);
    } finally {
      authService.removeToken();
      authService.removeRefreshToken();
      localStorage.removeItem('tenantId'); // Rimuovi anche il tenant ID
      setUser(null);
      setPermissions({});
      setMustChangePassword(false);
      setPendingPassword(null);
      window.location.href = '/login'; // Redirect al login
    }
  };

  // Ascolta eventi di errore abbonamento dal API interceptor (mid-session subscription expiry)
  useEffect(() => {
    const handleSubscriptionError = (event: Event) => {
      const detail = (event as CustomEvent).detail as { code: string; message: string };
      if (import.meta.env.DEV) console.warn('⚠️ Subscription error intercepted:', detail.code);
      // Salva il messaggio per mostrarlo nella LoginPage dopo il redirect
      sessionStorage.setItem('subscriptionError', detail.message);
      sessionStorage.setItem('subscriptionErrorCode', detail.code);
      // Cleanup locale e redirect
      authService.removeToken();
      authService.removeRefreshToken();
      localStorage.removeItem('tenantId');
      setUser(null);
      setPermissions({});
      window.location.href = '/login';
    };
    window.addEventListener('subscription-error', handleSubscriptionError);
    return () => window.removeEventListener('subscription-error', handleSubscriptionError);
  }, []);

  // Funzione di test per hasPermission (per debug)
  const hasPermissionTest = (resource: string, action: string, testUser: Person | null, testPermissions: Record<string, boolean>): boolean => {

    // Se non c'è utente, nega l'accesso
    if (!testUser) {
      return false;
    }

    // RIMOSSO: Admin o Administrator hanno sempre tutti i permessi
    // Ora tutti gli utenti, inclusi gli admin, devono avere permessi esplicitamente assegnati
    // Questo garantisce un controllo granulare dei permessi conforme al GDPR

    // Verifica permesso all:* (permesso universale)
    if (testPermissions['all:' + action] === true) {
      return true;
    }

    // Verifica permesso resource:all (permesso per tutte le azioni sulla risorsa)
    if (testPermissions[resource + ':all'] === true) {
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
        return true;
      }
    }

    return hasSpecificPermission;
  };

  // Verifica se l'utente ha un permesso specifico
  const hasPermission = (resourceOrPermission: string, action?: string): boolean => {
    // Gestisci sia il formato con un parametro (es. 'VIEW_USERS') che con due parametri (es. 'users', 'view')
    let permissionToCheck: string;

    if (action) {
      // Formato con due parametri: resource e action
      permissionToCheck = `${resourceOrPermission}:${action}`;
    } else {
      // Formato con un parametro: permesso diretto
      permissionToCheck = resourceOrPermission;
    }


    // Se non c'è utente, nega l'accesso
    if (!user) {
      return false;
    }

    // RIMOSSO: Admin o Administrator hanno sempre tutti i permessi
    // Ora tutti gli utenti, inclusi gli admin, devono avere permessi esplicitamente assegnati
    // Questo garantisce un controllo granulare dei permessi conforme al GDPR

    // Verifica permesso universale *:* o all:*
    if (permissions['*:*'] === true || permissions['all:*'] === true) {
      return true;
    }

    // Verifica permesso resource:* (tutte le azioni sulla risorsa)
    if (permissions[(resourceOrPermission + ':*')] === true) {
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
        return true;
      }
    }

    return hasSpecificPermission;
  };

  const clearMustChangePassword = () => {
    setMustChangePassword(false);
    setPendingPassword(null);
  };

  // Ricarica utente e permessi dal server per il tenant corrente (X-Tenant-ID da localStorage)
  // Chiamato dopo switchTenant() per aggiornare ruoli e permessi nella sidebar
  const refreshUser = async (): Promise<void> => {
    try {
      const res = await authService.verifyToken();
      if (res.valid && res.user) {
        const primaryRoleType = res.user.roles?.[0] || res.user.roleType || undefined;
        const mappedUser = {
          ...res.user,
          roleType: primaryRoleType,
          role: mapRolesToDisplayRole(res.user.roles)
        };
        setUser(mappedUser);
        if (res.permissions && typeof res.permissions === 'object') {
          const convertedPermissions = convertBackendToFrontendPermissions(res.permissions);
          setPermissions(convertedPermissions);
        }
      }
    } catch {
      // Fallback silenzioso: l'utente rimane con i permessi precedenti
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      permissions,
      isAuthenticated: !!user,
      isLoading,
      mustChangePassword,
      pendingPassword,
      login,
      loginWithPersonId,
      identify,
      logout,
      clearMustChangePassword,
      hasPermission,
      refreshUser
    }}>
      {children}
      {/* Mostra il modal globalmente quando mustChangePassword=true (gestisce anche il caso post-reload) */}
      {mustChangePassword && (
        <React.Suspense fallback={null}>
          <ForceChangePasswordModal
            currentPassword={pendingPassword || undefined}
            onSuccess={() => {
              clearMustChangePassword();
            }}
            onLogout={async () => {
              clearMustChangePassword();
              await logout();
            }}
          />
        </React.Suspense>
      )}
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

// Force full page reload on HMR changes to prevent stale context reference
// (avoids "useAuth must be used within an AuthProvider" during development)
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    import.meta.hot!.invalidate('AuthContext changed — full reload required to prevent stale context');
  });
}