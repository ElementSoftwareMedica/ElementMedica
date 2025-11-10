/**
 * Hook: useRoleFilters
 * 
 * Manages search, filtering, and role grouping by level.
 */

import { useState, useMemo } from 'react';
import type { 
  RoleHierarchyType, 
  UserRoleHierarchy, 
  FilterState, 
  RolesByLevel 
} from '../types';

interface UseRoleFiltersProps {
  hierarchy: RoleHierarchyType;
  currentUserHierarchy: UserRoleHierarchy | null;
}

export const useRoleFilters = ({ hierarchy, currentUserHierarchy }: UseRoleFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyAssignable, setShowOnlyAssignable] = useState(false);

  /**
   * Checks if the current user can assign a specific role
   */
  const canAssignRole = (roleType: string): boolean => {
    if (!currentUserHierarchy || !currentUserHierarchy.assignableRoles) return false;
    return currentUserHierarchy.assignableRoles.includes(roleType);
  };

  /**
   * Checks if a role is one of the current user's roles
   */
  const isCurrentUserRole = (roleType: string): boolean => {
    if (!currentUserHierarchy || !currentUserHierarchy.userRoles) return false;
    return currentUserHierarchy.userRoles.includes(roleType);
  };

  /**
   * Groups roles by hierarchy level and applies filters
   */
  const getRolesByLevel = useMemo((): RolesByLevel => {
    const rolesByLevel: RolesByLevel = {};
    
    // Verifica di sicurezza per hierarchy
    if (!hierarchy || typeof hierarchy !== 'object') {
      return rolesByLevel;
    }
    
    Object.entries(hierarchy).forEach(([roleType, roleData]) => {
      const level = roleData.level;
      if (!rolesByLevel[level]) {
        rolesByLevel[level] = [];
      }
      
      // Applica filtri
      const matchesSearch = !searchTerm || 
        roleData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        roleData.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        roleType.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAssignable = !showOnlyAssignable || canAssignRole(roleType);
      
      if (matchesSearch && matchesAssignable) {
        rolesByLevel[level].push({ roleType, data: roleData });
      }
    });
    
    return rolesByLevel;
  }, [hierarchy, searchTerm, showOnlyAssignable, currentUserHierarchy]);

  /**
   * Gets sorted array of levels that have roles
   */
  const sortedLevels = useMemo(() => {
    return Object.keys(getRolesByLevel).map(Number).sort((a, b) => a - b);
  }, [getRolesByLevel]);

  return {
    searchTerm,
    showOnlyAssignable,
    setSearchTerm,
    setShowOnlyAssignable,
    canAssignRole,
    isCurrentUserRole,
    getRolesByLevel,
    sortedLevels
  };
};
