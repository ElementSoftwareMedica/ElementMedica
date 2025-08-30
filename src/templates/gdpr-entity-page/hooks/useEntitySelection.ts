import { useState, useCallback, useEffect } from 'react';

/**
 * Hook per la gestione della selezione multipla delle entità
 * Centralizza la logica di selezione, modalità batch e operazioni multiple
 */
export interface UseEntitySelectionProps<T> {
  entities: T[];
  entityNamePlural: string;
}

export interface UseEntitySelectionReturn {
  selectedIds: string[];
  selectAll: boolean;
  selectionMode: boolean;
  setSelectionMode: (mode: boolean) => void;
  handleSelect: (id: string) => void;
  handleSelectAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
  hasSelection: boolean;
}

export const useEntitySelection = <T extends Record<string, any>>({
  entities,
  entityNamePlural
}: UseEntitySelectionProps<T>): UseEntitySelectionReturn => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  // Gestione selezione singola
  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  }, []);

  // Gestione selezione tutti
  const handleSelectAll = useCallback(() => {
    // Validazione di sicurezza per assicurarsi che entities sia un array
    if (!Array.isArray(entities)) {
      console.error('useEntitySelection: entities deve essere un array, ricevuto:', typeof entities, entities);
      return;
    }
    
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(entities.map(e => e.id));
      setSelectAll(true);
    }
  }, [selectAll, entities]);

  // Pulisce la selezione
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectAll(false);
    setSelectionMode(false);
  }, []);

  // Verifica se un elemento è selezionato
  const isSelected = useCallback((id: string): boolean => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  // Aggiorna selectAll quando cambiano le selezioni
  useEffect(() => {
    // Validazione di sicurezza per assicurarsi che entities sia un array
    if (!Array.isArray(entities)) {
      console.error('useEntitySelection: entities deve essere un array nel useEffect, ricevuto:', typeof entities, entities);
      setSelectAll(false);
      return;
    }
    
    if (entities.length === 0) {
      setSelectAll(false);
      return;
    }
    
    const allSelected = entities.every(entity => selectedIds.includes(entity.id));
    setSelectAll(allSelected);
  }, [selectedIds, entities]);

  // Pulisce la selezione quando si esce dalla modalità selezione
  useEffect(() => {
    if (!selectionMode) {
      setSelectedIds([]);
      setSelectAll(false);
    }
  }, [selectionMode]);

  // Salva le preferenze di selezione nel localStorage
  useEffect(() => {
    if (selectedIds.length > 0) {
      localStorage.setItem(`${entityNamePlural}-selected-ids`, JSON.stringify(selectedIds));
    } else {
      localStorage.removeItem(`${entityNamePlural}-selected-ids`);
    }
  }, [selectedIds, entityNamePlural]);

  return {
    selectedIds,
    selectAll,
    selectionMode,
    setSelectionMode,
    handleSelect,
    handleSelectAll,
    clearSelection,
    isSelected,
    selectedCount: selectedIds.length,
    hasSelection: selectedIds.length > 0
  };
};