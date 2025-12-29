/**
 * useViewMode Hook
 * 
 * Hook per gestire la modalità di visualizzazione (grid/list) con persistenza in localStorage.
 * Ogni pagina può avere la propria preferenza salvata.
 * 
 * @module hooks/useViewMode
 */

import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'grid' | 'list';

export interface UseViewModeOptions {
  storageKey: string;
  defaultMode?: ViewMode;
}

export interface UseViewModeReturn {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

export function useViewMode({
  storageKey,
  defaultMode = 'grid'
}: UseViewModeOptions): UseViewModeReturn {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const savedMode = localStorage.getItem(storageKey);
      if (savedMode === 'grid' || savedMode === 'list') {
        return savedMode;
      }
    } catch {
      // localStorage non disponibile
    }
    return defaultMode;
  });

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(storageKey, mode);
    } catch {
      // localStorage non disponibile
    }
  }, [storageKey]);

  const toggleViewMode = useCallback(() => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  }, [viewMode, setViewMode]);

  return {
    viewMode,
    setViewMode,
    toggleViewMode
  };
}

export default useViewMode;