import { useMemo } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook per la gestione ottimizzata dei permessi
 * Fornisce utility per verificare permessi specifici
 */
export const usePermissions = () => {
  const { permissions, hasPermission, user } = useAuth();

  // Memoizza le funzioni di controllo permessi
  const permissionCheckers = useMemo(() => ({
    // Permessi CRUD generici
    canCreate: (resource: string) => hasPermission(resource, 'create'),
    canRead: (resource: string) => hasPermission(resource, 'read'),
    canUpdate: (resource: string) => hasPermission(resource, 'update'),
    canDelete: (resource: string) => hasPermission(resource, 'delete'),
    
    // Permessi specifici per risorse
    canManageCompanies: () => hasPermission('companies', 'manage'),
    canManageEmployees: () => hasPermission('employees', 'manage'),
    canManageCourses: () => hasPermission('courses', 'manage'),
    canManageTrainers: () => hasPermission('trainers', 'manage'),
    canManageSchedules: () => hasPermission('schedules', 'manage'),
    
    // Permessi amministrativi
    isAdmin: () => user?.role === 'Administrator',
    isManager: () => user?.role === 'Manager' || user?.role === 'Administrator',
    isTrainer: () => user?.role === 'Trainer',
    
    // Permessi combinati
    canAccessAdminPanel: () => {
      return user?.role === 'Administrator' || hasPermission('admin', 'access');
    },
    
    canManageUsers: () => {
      return user?.role === 'Administrator' || hasPermission('users', 'manage');
    },
    
    canViewReports: () => {
      return ['Administrator', 'Manager'].includes(user?.role || '') || 
             hasPermission('reports', 'view');
    },
    
    // Permessi per azioni specifiche
    canExportData: () => hasPermission('data', 'export'),
    canImportData: () => hasPermission('data', 'import'),
    canGenerateDocuments: () => hasPermission('documents', 'generate'),
    
  }), [hasPermission, user]);

  // Memoizza i permessi raw per performance
  const memoizedPermissions = useMemo(() => permissions, [permissions]);

  return {
    permissions: memoizedPermissions,
    hasPermission,
    ...permissionCheckers
  };
};

export default usePermissions;