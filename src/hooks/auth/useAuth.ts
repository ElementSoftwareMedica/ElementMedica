import { useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Hook ottimizzato per l'autenticazione
 * Separa le responsabilità e migliora le performance con memoization
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Memoizza i valori per evitare re-render inutili
  return useMemo(() => ({
    // Stato utente
    user: context.user,
    isAuthenticated: !!context.user,
    isLoading: context.isLoading,
    
    // Azioni
    login: context.login,
    logout: context.logout,
    
    // Utility
    hasPermission: context.hasPermission,
    permissions: context.permissions,
    
    // Computed values
    userRole: context.user?.role,
    userName: context.user ? `${context.user.firstName} ${context.user.lastName}` : null,
    userEmail: context.user?.email,
  }), [
    context.user,
    context.isLoading,
    context.login,
    context.logout,
    context.hasPermission,
    context.permissions
  ]);
};

export default useAuth;