import { useState, useCallback, useEffect } from 'react';

/**
 * Hook per la gestione delle preferenze di visualizzazione
 * Centralizza la gestione di modalità vista, colonne nascoste e ordinamento colonne
 */
export interface UseViewPreferencesProps {
  entityNamePlural: string;
  defaultViewMode?: 'table' | 'grid';
  defaultHiddenColumns?: string[];
  defaultColumnOrder?: string[];
}

export interface UseViewPreferencesReturn {
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
  hiddenColumns: string[];
  setHiddenColumns: (columns: string[]) => void;
  columnOrder: string[];
  setColumnOrder: (order: string[]) => void;
  toggleColumnVisibility: (columnKey: string) => void;
  isColumnHidden: (columnKey: string) => boolean;
  resetToDefaults: () => void;
}

export const useViewPreferences = ({
  entityNamePlural,
  defaultViewMode = 'table',
  defaultHiddenColumns = [],
  defaultColumnOrder = []
}: UseViewPreferencesProps): UseViewPreferencesReturn => {
  // Chiavi per localStorage
  const viewModeKey = `${entityNamePlural}-view-mode`;
  const hiddenColumnsKey = `${entityNamePlural}-hidden-columns`;
  const columnOrderKey = `${entityNamePlural}-column-order`;

  // Carica le preferenze dal localStorage
  const loadFromStorage = useCallback(() => {
    const savedViewMode = localStorage.getItem(viewModeKey) as 'table' | 'grid' | null;
    const savedHiddenColumns = JSON.parse(localStorage.getItem(hiddenColumnsKey) || '[]');
    const savedColumnOrder = JSON.parse(localStorage.getItem(columnOrderKey) || '[]');

    return {
      viewMode: savedViewMode || defaultViewMode,
      hiddenColumns: savedHiddenColumns.length > 0 ? savedHiddenColumns : defaultHiddenColumns,
      columnOrder: savedColumnOrder.length > 0 ? savedColumnOrder : defaultColumnOrder
    };
  }, [viewModeKey, hiddenColumnsKey, columnOrderKey, defaultViewMode, defaultHiddenColumns, defaultColumnOrder]);

  // Stati
  const [viewMode, setViewModeState] = useState<'table' | 'grid'>(() => loadFromStorage().viewMode);
  const [hiddenColumns, setHiddenColumnsState] = useState<string[]>(() => loadFromStorage().hiddenColumns);
  const [columnOrder, setColumnOrderState] = useState<string[]>(() => loadFromStorage().columnOrder);

  // Setter con salvataggio automatico
  const setViewMode = useCallback((mode: 'table' | 'grid') => {
    setViewModeState(mode);
    localStorage.setItem(viewModeKey, mode);
  }, [viewModeKey]);

  const setHiddenColumns = useCallback((columns: string[]) => {
    setHiddenColumnsState(columns);
    localStorage.setItem(hiddenColumnsKey, JSON.stringify(columns));
  }, [hiddenColumnsKey]);

  const setColumnOrder = useCallback((order: string[]) => {
    setColumnOrderState(order);
    localStorage.setItem(columnOrderKey, JSON.stringify(order));
  }, [columnOrderKey]);

  // Toggle visibilità colonna
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setHiddenColumnsState((prev: string[]) => 
      prev.includes(columnKey) 
        ? prev.filter((col: string) => col !== columnKey)
        : [...prev, columnKey]
    );
    // Salva nel localStorage
    const newHiddenColumns = hiddenColumns.includes(columnKey) 
      ? hiddenColumns.filter(col => col !== columnKey)
      : [...hiddenColumns, columnKey];
    localStorage.setItem(hiddenColumnsKey, JSON.stringify(newHiddenColumns));
  }, [hiddenColumns, hiddenColumnsKey]);

  // Verifica se una colonna è nascosta
  const isColumnHidden = useCallback((columnKey: string): boolean => {
    return hiddenColumns.includes(columnKey);
  }, [hiddenColumns]);

  // Reset alle impostazioni di default
  const resetToDefaults = useCallback(() => {
    setViewMode(defaultViewMode);
    setHiddenColumns(defaultHiddenColumns);
    setColumnOrder(defaultColumnOrder);
  }, [defaultViewMode, defaultHiddenColumns, defaultColumnOrder, setViewMode, setHiddenColumns, setColumnOrder]);

  // Sincronizza con localStorage al mount
  useEffect(() => {
    const stored = loadFromStorage();
    setViewModeState(stored.viewMode);
    setHiddenColumnsState(stored.hiddenColumns);
    setColumnOrderState(stored.columnOrder);
  }, [loadFromStorage]);

  return {
    viewMode,
    setViewMode,
    hiddenColumns,
    setHiddenColumns,
    columnOrder,
    setColumnOrder,
    toggleColumnVisibility,
    isColumnHidden,
    resetToDefaults
  };
};