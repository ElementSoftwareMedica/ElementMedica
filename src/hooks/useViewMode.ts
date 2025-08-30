import React, { useState, useEffect } from 'react';

type ViewMode = 'table' | 'grid';

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
  defaultMode = 'table' 
}: UseViewModeOptions): UseViewModeReturn {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedMode = localStorage.getItem(storageKey) as ViewMode;
    return savedMode || defaultMode;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, viewMode);
  }, [viewMode, storageKey]);

  const toggleViewMode = () => {
    setViewMode(current => current === 'table' ? 'grid' : 'table');
  };

  return {
    viewMode,
    setViewMode,
    toggleViewMode
  };
}

export default useViewMode;