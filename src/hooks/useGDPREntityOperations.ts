import { useState } from 'react';
import { apiDelete } from '../services/api';
import { useToast } from './ui/useToast';
import { sanitizeErrorMessage } from '../utils/errorUtils';

interface UseGDPREntityOperationsProps {
  entityName: string;
  entityNamePlural: string;
  entityDisplayName: string;
  entityDisplayNamePlural: string;
  onDeleteEntity?: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

interface UseGDPREntityOperationsReturn {
  selectedIds: string[];
  selectAll: boolean;
  selectionMode: boolean;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectAll: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  handleSelectAll: (entities: Array<{ id: string }>) => void;
  handleSelectEntity: (id: string) => void;
  handleDeleteEntity: (id: string) => Promise<void>;
  handleBatchDelete: () => Promise<void>;
  clearSelection: () => void;
}

export function useGDPREntityOperations({
  entityName,
  entityNamePlural,
  entityDisplayName,
  entityDisplayNamePlural,
  onDeleteEntity,
  refetch
}: UseGDPREntityOperationsProps): UseGDPREntityOperationsReturn {
  const toast = useToast();
  
  // Stati per selezione e operazioni batch
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectAll(false);
    setSelectionMode(false);
  };

  const handleSelectAll = (entities: Array<{ id: string }>) => {
    // Validazione di sicurezza per assicurarsi che entities sia un array
    if (!Array.isArray(entities)) {
      console.error('handleSelectAll: entities deve essere un array, ricevuto:', typeof entities, entities);
      return;
    }
    
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(entities.map(entity => entity.id));
      setSelectAll(true);
    }
  };

  const handleSelectEntity = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        const newSelection = prev.filter(selectedId => selectedId !== id);
        if (newSelection.length === 0) {
          setSelectionMode(false);
        }
        return newSelection;
      } else {
        if (!selectionMode) {
          setSelectionMode(true);
        }
        return [...prev, id];
      }
    });
  };

  const handleDeleteEntity = async (id: string) => {
    if (!window.confirm(`Sei sicuro di voler eliminare questo ${entityDisplayName.toLowerCase()}?`)) {
      return;
    }

    try {
      if (onDeleteEntity) {
        await onDeleteEntity(id);
      } else {
        await apiDelete(`/api/v1/${entityNamePlural}/${id}`);
      }
      
      toast.success(`${entityDisplayName} eliminato con successo`);
      await refetch();
      
      // Rimuovi l'elemento dalla selezione se era selezionato
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    } catch (error: unknown) {
      console.error(`Errore eliminazione ${entityDisplayName.toLowerCase()}:`, error);
      const errorMessage = error instanceof Error ? error.message : `Errore durante l'eliminazione del ${entityDisplayName.toLowerCase()}`;
      toast.error(sanitizeErrorMessage(errorMessage));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmMessage = selectedIds.length === 1 
      ? `Sei sicuro di voler eliminare questo ${entityDisplayName.toLowerCase()}?`
      : `Sei sicuro di voler eliminare ${selectedIds.length} ${entityDisplayNamePlural.toLowerCase()}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Elimina tutti gli elementi selezionati in modo sequenziale per evitare rate limiting
      for (const id of selectedIds) {
        if (onDeleteEntity) {
          await onDeleteEntity(id);
        } else {
          await apiDelete(`/api/v1/${entityNamePlural}/${id}`);
        }
        // Piccola pausa tra le richieste per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successMessage = selectedIds.length === 1
        ? `${entityDisplayName} eliminato con successo`
        : `${selectedIds.length} ${entityDisplayNamePlural.toLowerCase()} eliminati con successo`;

      toast.success(successMessage);
      await refetch();
      clearSelection();
    } catch (error: unknown) {
      console.error(`Errore eliminazione batch ${entityDisplayNamePlural.toLowerCase()}:`, error);
      const errorMessage = error instanceof Error ? error.message : `Errore durante l'eliminazione dei ${entityDisplayNamePlural.toLowerCase()}`;
      toast.error(sanitizeErrorMessage(errorMessage));
    }
  };

  return {
    selectedIds,
    selectAll,
    selectionMode,
    setSelectedIds,
    setSelectAll,
    setSelectionMode,
    handleSelectAll,
    handleSelectEntity,
    handleDeleteEntity,
    handleBatchDelete,
    clearSelection
  };
}