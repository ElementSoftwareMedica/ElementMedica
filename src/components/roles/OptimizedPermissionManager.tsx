import React from 'react';
import { Role } from '../../hooks/useRoles';
import { Tenant } from '../../hooks/useTenants';
import OptimizedPermissionManagerRefactored from './permission-manager/OptimizedPermissionManagerRefactored';

interface OptimizedPermissionManagerProps {
  role: Role;
  tenants: Tenant[];
  onBack: () => void;
}

/**
 * Wrapper component per il gestore permessi ottimizzato.
 * Questo file è stato refactorizzato per utilizzare una versione modulare
 * del componente originale, suddivisa in componenti più piccoli e gestibili.
 */
const OptimizedPermissionManager: React.FC<OptimizedPermissionManagerProps> = (props) => {
  return <OptimizedPermissionManagerRefactored {...props} />;
};

export default OptimizedPermissionManager;