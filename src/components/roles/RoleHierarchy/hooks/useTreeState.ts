/**
 * Hook: useTreeState
 * 
 * Manages tree expansion, view mode, and role selection state.
 */

import { useState } from 'react';
import type { TreeState } from '../types';

export const useTreeState = () => {
  // Inizializza con i livelli 1-5 espansi per default
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(
    new Set([1, 2, 3, 4, 5])
  );
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');

  /**
   * Toggles the expansion state of a hierarchy level
   */
  const toggleLevel = (level: number) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(level)) {
      newExpanded.delete(level);
    } else {
      newExpanded.add(level);
    }
    setExpandedLevels(newExpanded);
  };

  /**
   * Expands all hierarchy levels
   */
  const expandAll = () => {
    setExpandedLevels(new Set([0, 1, 2, 3, 4, 5]));
  };

  /**
   * Collapses all hierarchy levels
   */
  const collapseAll = () => {
    setExpandedLevels(new Set());
  };

  return {
    expandedLevels,
    selectedRole,
    viewMode,
    toggleLevel,
    expandAll,
    collapseAll,
    setSelectedRole,
    setViewMode
  };
};
