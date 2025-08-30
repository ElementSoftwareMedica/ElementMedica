import { useEffect, useMemo } from 'react';
import { useAuth } from '../auth/useAuth';
import { usePermissions } from '../auth/usePermissions';
import { useNavigation } from './useNavigation';

interface RouteGuardOptions {
  requireAuth?: boolean;
  requiredPermissions?: Array<{
    resource: string;
    action: string;
  }>;
  requiredRole?: string | string[];
  redirectTo?: string;
  onUnauthorized?: () => void;
}

/**
 * Hook per la protezione delle route
 * Gestisce autenticazione, permessi e ruoli
 */
export const useRouteGuard = (options: RouteGuardOptions = {}) => {
  const {
    requireAuth = true,
    requiredPermissions = [],
    requiredRole,
    redirectTo = '/login',
    onUnauthorized
  } = options;

  const { isAuthenticated, user, isLoading } = useAuth();
  const { hasPermission } = usePermissions();
  const { goTo } = useNavigation();

  // Verifica i permessi richiesti
  const hasRequiredPermissions = useMemo(() => {
    if (requiredPermissions.length === 0) return true;
    
    return requiredPermissions.every(({ resource, action }) => 
      hasPermission(resource, action)
    );
  }, [requiredPermissions, hasPermission]);

  // Verifica il ruolo richiesto
  const hasRequiredRole = useMemo(() => {
    if (!requiredRole) return true;
    if (!user?.role) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    
    return user.role === requiredRole;
  }, [requiredRole, user?.role]);

  // Stato di autorizzazione
  const authorizationState = useMemo(() => {
    if (isLoading) {
      return { isAuthorized: false, isLoading: true, reason: null };
    }

    if (requireAuth && !isAuthenticated) {
      return { isAuthorized: false, isLoading: false, reason: 'not_authenticated' };
    }

    if (!hasRequiredPermissions) {
      return { isAuthorized: false, isLoading: false, reason: 'insufficient_permissions' };
    }

    if (!hasRequiredRole) {
      return { isAuthorized: false, isLoading: false, reason: 'insufficient_role' };
    }

    return { isAuthorized: true, isLoading: false, reason: null };
  }, [isLoading, requireAuth, isAuthenticated, hasRequiredPermissions, hasRequiredRole]);

  // Effetto per gestire il redirect
  useEffect(() => {
    if (!authorizationState.isLoading && !authorizationState.isAuthorized) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        goTo(redirectTo);
      }
    }
  }, [authorizationState, onUnauthorized, goTo, redirectTo]);

  return authorizationState;
};

/**
 * Hook per verificare i permessi senza redirect automatico
 */
export const usePermissionCheck = (resource: string, action: string = 'read') => {
  const { hasPermission } = usePermissions();
  
  return useMemo(() => ({
    hasPermission: hasPermission(resource, action),
    checkPermission: (res?: string, act?: string) => 
      hasPermission(res || resource, act || action)
  }), [hasPermission, resource, action]);
};

/**
 * Hook per verificare i ruoli
 */
export const useRoleCheck = (requiredRole: string | string[]) => {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user?.role) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    
    return user.role === requiredRole;
  }, [user?.role, requiredRole]);
};

/**
 * Hook per componenti condizionali basati su permessi
 */
export const useConditionalRender = () => {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  
  return useMemo(() => ({
    // Render condizionale per permessi
    renderIfPermission: (resource: string, action: string = 'read') => {
      return hasPermission(resource, action);
    },
    
    // Render condizionale per ruoli
    renderIfRole: (role: string | string[]) => {
      if (!user?.role) return false;
      
      if (Array.isArray(role)) {
        return role.includes(user.role);
      }
      
      return user.role === role;
    },
    
    // Render condizionale per autenticazione
    renderIfAuthenticated: () => !!user,
    
    // Render condizionale per utente specifico
    renderIfUser: (userId: string) => user?.id === userId,
    
    // Render condizionale combinato
    renderIf: (conditions: {
      authenticated?: boolean;
      role?: string | string[];
      permission?: { resource: string; action?: string };
      userId?: string;
    }) => {
      if (conditions.authenticated !== undefined && !!user !== conditions.authenticated) {
        return false;
      }
      
      if (conditions.role && !user?.role) {
        return false;
      }
      
      if (conditions.role) {
        const hasRole = Array.isArray(conditions.role) 
          ? conditions.role.includes(user!.role)
          : user!.role === conditions.role;
        if (!hasRole) return false;
      }
      
      if (conditions.permission) {
        const { resource, action = 'read' } = conditions.permission;
        if (!hasPermission(resource, action)) return false;
      }
      
      if (conditions.userId && user?.id !== conditions.userId) {
        return false;
      }
      
      return true;
    }
    
  }), [hasPermission, user]);
};

export default useRouteGuard;