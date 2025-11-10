/**
 * useHierarchyState Hook
 * 
 * Manages parent role selection and hierarchy level filtering.
 * Prevents circular dependencies by ensuring parent level is always level - 1.
 */

import { useMemo } from 'react';
import type { HierarchyLevel } from '../types';

interface UseHierarchyStateReturn {
  availableParentRoles: [string, HierarchyLevel][];
  canHaveParent: boolean;
}

/**
 * Hook for managing role hierarchy state
 */
export const useHierarchyState = (
  currentLevel: number,
  hierarchy: Record<string, HierarchyLevel>
): UseHierarchyStateReturn => {
  // Filter parent roles based on current level
  const availableParentRoles = useMemo(() => {
    if (currentLevel <= 1) {
      return [];
    }

    return Object.entries(hierarchy).filter(
      ([, roleData]) => roleData?.level === currentLevel - 1
    );
  }, [currentLevel, hierarchy]);

  const canHaveParent = currentLevel > 1;

  return {
    availableParentRoles,
    canHaveParent
  };
};
