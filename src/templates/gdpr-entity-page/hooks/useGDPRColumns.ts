import { useState, useCallback, useEffect } from 'react';

export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  visible?: boolean;
  order?: number;
  formatter?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  className?: string;
}

export interface ColumnState {
  visible: boolean;
  width?: number;
  order: number;
}

export interface UseGDPRColumnsConfig {
  columns: ColumnConfig[];
  storageKey?: string;
  defaultVisibleColumns?: string[];
  enableReordering?: boolean;
  enableResizing?: boolean;
}

/**
 * Hook per gestire la configurazione, visibilità e ordinamento delle colonne
 * Salva le preferenze utente nel localStorage
 */
export function useGDPRColumns({
  columns,
  storageKey = 'gdpr-columns-config',
  defaultVisibleColumns,
  enableReordering = true,
  enableResizing = true
}: UseGDPRColumnsConfig) {
  
  // Stato delle colonne con configurazione salvata
  const [columnStates, setColumnStates] = useState<Record<string, ColumnState>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verifica che le colonne salvate siano ancora valide
        const validColumns = columns.reduce((acc, col) => {
          acc[col.key] = {
            visible: parsed[col.key]?.visible ?? col.visible ?? true,
            width: parsed[col.key]?.width ?? col.width,
            order: parsed[col.key]?.order ?? col.order ?? 0
          };
          return acc;
        }, {} as Record<string, ColumnState>);
        return validColumns;
      }
    } catch (error) {
      console.warn('Errore nel caricamento configurazione colonne:', error);
    }
    
    // Configurazione di default
    return columns.reduce((acc, col, index) => {
      const isVisible = defaultVisibleColumns 
        ? defaultVisibleColumns.includes(col.key)
        : col.visible ?? true;
      
      acc[col.key] = {
        visible: isVisible,
        width: col.width,
        order: col.order ?? index
      };
      return acc;
    }, {} as Record<string, ColumnState>);
  });

  // Salva la configurazione nel localStorage
  const saveConfiguration = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnStates));
    } catch (error) {
      console.warn('Errore nel salvataggio configurazione colonne:', error);
    }
  }, [storageKey, columnStates]);

  // Effetto per salvare automaticamente le modifiche
  useEffect(() => {
    saveConfiguration();
  }, [saveConfiguration]);

  // Mostra/nasconde una colonna
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setColumnStates(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        visible: !prev[columnKey]?.visible
      }
    }));
  }, []);

  // Imposta la visibilità di una colonna
  const setColumnVisibility = useCallback((columnKey: string, visible: boolean) => {
    setColumnStates(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        visible
      }
    }));
  }, []);

  // Ridimensiona una colonna
  const resizeColumn = useCallback((columnKey: string, width: number) => {
    if (!enableResizing) return;
    
    setColumnStates(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        width: Math.max(50, width) // Larghezza minima 50px
      }
    }));
  }, [enableResizing]);

  // Riordina le colonne
  const reorderColumns = useCallback((newOrder: string[]) => {
    if (!enableReordering) return;
    
    setColumnStates(prev => {
      const updated = { ...prev };
      newOrder.forEach((columnKey, index) => {
        if (updated[columnKey]) {
          updated[columnKey] = {
            ...updated[columnKey],
            order: index
          };
        }
      });
      return updated;
    });
  }, [enableReordering]);

  // Resetta la configurazione ai valori di default
  const resetConfiguration = useCallback(() => {
    const defaultStates = columns.reduce((acc, col, index) => {
      const isVisible = defaultVisibleColumns 
        ? defaultVisibleColumns.includes(col.key)
        : col.visible ?? true;
      
      acc[col.key] = {
        visible: isVisible,
        width: col.width,
        order: col.order ?? index
      };
      return acc;
    }, {} as Record<string, ColumnState>);
    
    setColumnStates(defaultStates);
  }, [columns, defaultVisibleColumns]);

  // Mostra tutte le colonne
  const showAllColumns = useCallback(() => {
    setColumnStates(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key] = { ...updated[key], visible: true };
      });
      return updated;
    });
  }, []);

  // Nasconde tutte le colonne (tranne quelle obbligatorie)
  const hideAllColumns = useCallback(() => {
    setColumnStates(prev => {
      const updated = { ...prev };
      columns.forEach(col => {
        // Non nascondere colonne obbligatorie (es. azioni, selezione)
        if (!col.key.includes('actions') && !col.key.includes('select')) {
          updated[col.key] = { ...updated[col.key], visible: false };
        }
      });
      return updated;
    });
  }, [columns]);

  // Calcola le colonne visibili ordinate
  const visibleColumns = columns
    .filter(col => columnStates[col.key]?.visible !== false)
    .map(col => ({
      ...col,
      width: columnStates[col.key]?.width ?? col.width,
      order: columnStates[col.key]?.order ?? col.order ?? 0
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Calcola le colonne nascoste
  const hiddenColumns = columns.filter(col => columnStates[col.key]?.visible === false);

  // Statistiche sulle colonne
  const columnStats = {
    total: columns.length,
    visible: visibleColumns.length,
    hidden: hiddenColumns.length,
    hasCustomOrder: visibleColumns.some((col, index) => col.order !== index),
    hasCustomWidths: visibleColumns.some(col => 
      col.width !== undefined && col.width !== columns.find(c => c.key === col.key)?.width
    )
  };

  return {
    // Configurazione colonne
    columns,
    visibleColumns,
    hiddenColumns,
    columnStates,
    columnStats,
    
    // Azioni
    toggleColumnVisibility,
    setColumnVisibility,
    resizeColumn,
    reorderColumns,
    resetConfiguration,
    showAllColumns,
    hideAllColumns,
    saveConfiguration,
    
    // Configurazione
    enableReordering,
    enableResizing,
    storageKey
  };
}