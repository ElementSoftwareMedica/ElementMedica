import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  SelectionPillAction, 
  selectAllAction, 
  deselectAllAction, 
  deleteSelectedAction 
} from '../design-system/molecules/SelectionPills';

interface UseSelectionActionsOptions {
  selectedIds: string[];
  items: any[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
  extraActions?: SelectionPillAction[];
}

export function useSelectionActions({
  selectedIds,
  items,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  extraActions = []
}: UseSelectionActionsOptions): SelectionPillAction[] {
  const { t } = useTranslation();

  const handleSelectAll = useCallback(() => {
    onSelectAll();
  }, [onSelectAll]);

  const handleDeselectAll = useCallback(() => {
    onDeselectAll();
  }, [onDeselectAll]);

  const handleDeleteSelected = useCallback(() => {
    // Assicurarsi che selectedIds non sia undefined e abbia elementi
    if (!selectedIds || selectedIds.length === 0) return;
    
    if (window.confirm(`Sei sicuro di voler eliminare ${selectedIds.length} elementi selezionati?`)) {
      onDeleteSelected();
    }
  }, [selectedIds, onDeleteSelected]);

  const actions = useMemo(() => {
    const result: SelectionPillAction[] = [];
    
    // Aggiungere controlli di sicurezza
    const selectedCount = selectedIds?.length || 0;
    const itemsCount = items?.length || 0;
    
    // Solo se ci sono elementi selezionabili
    if (itemsCount > 0) {
      // Seleziona tutti (solo se non sono già tutti selezionati)
      if (selectedCount < itemsCount) {
        result.push(selectAllAction(handleSelectAll, t('selection.selectAll', 'Select All')));
      }
      
      // Deseleziona tutti (solo se ci sono elementi selezionati)
      if (selectedCount > 0) {
        result.push(deselectAllAction(handleDeselectAll, t('selection.deselectAll', 'Deselect All')));
      }
      
      // Elimina selezionati (solo se ci sono elementi selezionati)
      if (selectedCount > 0) {
        result.push(deleteSelectedAction(handleDeleteSelected, t('selection.deleteSelected', 'Delete Selected')));
      }
    }
    
    // Aggiungi eventuali azioni extra
    if (extraActions && Array.isArray(extraActions)) {
      return [...result, ...extraActions];
    }
    
    return result;
  }, [
    items, 
    selectedIds, 
    handleSelectAll, 
    handleDeselectAll, 
    handleDeleteSelected, 
    extraActions,
    t
  ]);

  return actions;
}

export default useSelectionActions;