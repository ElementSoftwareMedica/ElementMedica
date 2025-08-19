import { useCallback } from 'react';
import { apiDelete } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';

/**
 * Hook per la gestione delle operazioni CRUD sulle entità
 * Centralizza le operazioni di eliminazione, creazione e modifica
 */
export interface UseEntityOperationsProps {
  entityNameSingular: string;
  entityDisplayNameSingular: string;
  entityDisplayNamePlural: string;
  apiEndpoint: string;
  onDeleteEntity?: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export interface UseEntityOperationsReturn {
  handleDelete: (id: string) => Promise<void>;
  handleDeleteSelected: (selectedIds: string[]) => Promise<void>;
  confirmDelete: (id: string, entityName?: string) => Promise<boolean>;
  confirmDeleteMultiple: (count: number) => Promise<boolean>;
}

export const useEntityOperations = ({
  entityNameSingular,
  entityDisplayNameSingular,
  entityDisplayNamePlural,
  apiEndpoint,
  onDeleteEntity,
  refreshData
}: UseEntityOperationsProps): UseEntityOperationsReturn => {
  const { showToast } = useToast();

  // Conferma eliminazione singola
  const confirmDelete = useCallback(async (id: string, entityName?: string): Promise<boolean> => {
    const displayName = entityName || `${entityDisplayNameSingular} con ID ${id}`;
    return window.confirm(`Sei sicuro di voler eliminare ${displayName}?`);
  }, [entityDisplayNameSingular]);

  // Conferma eliminazione multipla
  const confirmDeleteMultiple = useCallback(async (count: number): Promise<boolean> => {
    return window.confirm(`Sei sicuro di voler eliminare ${count} ${entityDisplayNamePlural.toLowerCase()}?`);
  }, [entityDisplayNamePlural]);

  // Eliminazione singola
  const handleDelete = useCallback(async (id: string): Promise<void> => {
    try {
      console.log(`🗑️ Eliminazione ${entityDisplayNameSingular} con ID:`, id);
      
      // Conferma eliminazione
      const confirmed = await confirmDelete(id);
      if (!confirmed) return;

      // Usa il callback personalizzato se fornito
      if (onDeleteEntity) {
        await onDeleteEntity(id);
      } else {
        // Altrimenti usa l'API standard
        await apiDelete(`${apiEndpoint}/${id}`);
      }

      showToast({
        message: `${entityDisplayNameSingular} eliminato con successo`,
        type: 'success'
      });

      // Ricarica i dati
      await refreshData();
      
    } catch (error: any) {
      console.error(`❌ Errore eliminazione ${entityDisplayNameSingular}:`, error);
      showToast({
        message: `Errore durante l'eliminazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        type: 'error'
      });
    }
  }, [
    entityDisplayNameSingular, 
    confirmDelete, 
    onDeleteEntity, 
    apiEndpoint, 
    showToast, 
    refreshData
  ]);

  // Eliminazione multipla
  const handleDeleteSelected = useCallback(async (selectedIds: string[]): Promise<void> => {
    if (selectedIds.length === 0) return;

    try {
      console.log(`🗑️ Eliminazione multipla ${entityDisplayNamePlural}:`, selectedIds);
      
      // Conferma eliminazione
      const confirmed = await confirmDeleteMultiple(selectedIds.length);
      if (!confirmed) return;

      // Elimina in batch
      const deletePromises = selectedIds.map(async (id) => {
        if (onDeleteEntity) {
          await onDeleteEntity(id);
        } else {
          await apiDelete(`${apiEndpoint}/${id}`);
        }
      });

      await Promise.all(deletePromises);

      showToast({
        message: `${selectedIds.length} ${entityDisplayNamePlural.toLowerCase()} eliminati con successo`,
        type: 'success'
      });

      // Ricarica i dati
      await refreshData();
      
    } catch (error: any) {
      console.error(`❌ Errore eliminazione multipla ${entityDisplayNamePlural}:`, error);
      showToast({
        message: `Errore durante l'eliminazione multipla: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        type: 'error'
      });
    }
  }, [
    entityDisplayNamePlural, 
    confirmDeleteMultiple, 
    onDeleteEntity, 
    apiEndpoint, 
    showToast, 
    refreshData
  ]);

  return {
    handleDelete,
    handleDeleteSelected,
    confirmDelete,
    confirmDeleteMultiple
  };
};