/**
 * useDocumentActions hook
 * 
 * Manages document actions: download, delete, and batch operations.
 */

import lettereIncaricoService from '../../../../../services/lettereIncaricoService';
import registriPresenzeService from '../../../../../services/registriPresenzeService';
import attestatiService from '../../../../../services/attestatiService';
import preventiviService from '../../../../../services/preventiviService';
import { useToast } from '../../../../../hooks/useToast';

export interface UseDocumentActionsReturn {
  downloadLettera: (id: string) => Promise<void>;
  downloadRegistro: (id: string) => Promise<void>;
  downloadAttestato: (id: string) => Promise<void>;
  downloadPreventivo: (id: string) => Promise<void>;
  downloadAttestatiZip: (ids: string[]) => Promise<void>;
  downloadLettereZip: (ids: string[]) => Promise<void>;
  downloadRegistriZip: (ids: string[]) => Promise<void>;
  deleteLettera: (id: string) => Promise<void>;
  deleteRegistro: (id: string) => Promise<void>;
  deleteAttestato: (id: string) => Promise<void>;
  deletePreventivo: (id: string) => Promise<void>;
}

/**
 * Custom hook for document actions (download, delete)
 * 
 * @param onRefresh - Callback to refresh document lists after operations
 * @param scheduleId - Schedule ID for batch download operations
 */
export const useDocumentActions = (
  onRefresh: () => void,
  scheduleId?: string | number | null
): UseDocumentActionsReturn => {
  const { showToast } = useToast();

  /**
   * Download lettera di incarico
   */
  const downloadLettera = async (id: string) => {
    try {
      await lettereIncaricoService.download(id);
    } catch (error) {
      console.error('Errore download lettera:', error);
      showToast({ message: 'Errore durante il download della lettera', type: 'error' });
    }
  };

  /**
   * Download registro presenze
   */
  const downloadRegistro = async (id: string) => {
    try {
      await registriPresenzeService.download(id);
    } catch (error) {
      console.error('Errore download registro:', error);
      showToast({ message: 'Errore durante il download del registro', type: 'error' });
    }
  };

  /**
   * Download attestato
   */
  const downloadAttestato = async (id: string) => {
    try {
      await attestatiService.download(id);
    } catch (error) {
      console.error('Errore download attestato:', error);
      showToast({ message: 'Errore durante il download dell\'attestato', type: 'error' });
    }
  };

  /**
   * Download preventivo
   */
  const downloadPreventivo = async (id: string) => {
    try {
      await preventiviService.download(id);
    } catch (error) {
      console.error('Errore download preventivo:', error);
      showToast({ message: 'Errore durante il download del preventivo', type: 'error' });
    }
  };

  /**
   * Download multiple attestati as ZIP
   */
  const downloadAttestatiZip = async (ids: string[]) => {
    try {
      await attestatiService.downloadZipBatch(ids);
    } catch (error) {
      console.error('Errore download ZIP attestati:', error);
      showToast({ message: 'Errore durante il download del file ZIP attestati', type: 'error' });
    }
  };

  /**
   * Download multiple lettere di incarico as ZIP
   */
  const downloadLettereZip = async (ids: string[]) => {
    if (!scheduleId) {
      showToast({ message: 'Schedule ID non disponibile', type: 'error' });
      return;
    }
    try {
      await lettereIncaricoService.downloadZip(String(scheduleId), ids);
    } catch (error) {
      console.error('Errore download ZIP lettere:', error);
      showToast({ message: 'Errore durante il download del file ZIP lettere', type: 'error' });
    }
  };

  /**
   * Download multiple registri presenze as ZIP
   */
  const downloadRegistriZip = async (ids: string[]) => {
    if (!scheduleId) {
      showToast({ message: 'Schedule ID non disponibile', type: 'error' });
      return;
    }
    try {
      await registriPresenzeService.downloadZip(String(scheduleId), ids);
    } catch (error) {
      console.error('Errore download ZIP registri:', error);
      showToast({ message: 'Errore durante il download del file ZIP registri', type: 'error' });
    }
  };

  /**
   * Delete lettera di incarico (with confirmation)
   */
  const deleteLettera = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa lettera?')) return;

    try {
      await lettereIncaricoService.delete(id);
      onRefresh();
      showToast({ message: 'Lettera eliminata con successo', type: 'success' });
    } catch (error) {
      console.error('Errore eliminazione lettera:', error);
      showToast({ message: 'Errore durante l\'eliminazione della lettera', type: 'error' });
    }
  };

  /**
   * Delete registro presenze (with confirmation)
   */
  const deleteRegistro = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo registro?')) return;

    try {
      await registriPresenzeService.delete(id);
      onRefresh();
      showToast({ message: 'Registro eliminato con successo', type: 'success' });
    } catch (error) {
      console.error('Errore eliminazione registro:', error);
      showToast({ message: 'Errore durante l\'eliminazione del registro', type: 'error' });
    }
  };

  /**
   * Delete attestato (with confirmation)
   */
  const deleteAttestato = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo attestato?')) return;

    try {
      await attestatiService.delete(id);
      onRefresh();
      showToast({ message: 'Attestato eliminato con successo', type: 'success' });
    } catch (error) {
      console.error('Errore eliminazione attestato:', error);
      showToast({ message: 'Errore durante l\'eliminazione dell\'attestato', type: 'error' });
    }
  };

  /**
   * Delete preventivo (with confirmation)
   */
  const deletePreventivo = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo preventivo?')) return;

    try {
      await preventiviService.delete(id);
      onRefresh();
      showToast({ message: 'Preventivo eliminato con successo', type: 'success' });
    } catch (error) {
      console.error('Errore eliminazione preventivo:', error);
      showToast({ message: 'Errore durante l\'eliminazione del preventivo', type: 'error' });
    }
  };

  return {
    downloadLettera,
    downloadRegistro,
    downloadAttestato,
    downloadPreventivo,
    downloadAttestatiZip,
    downloadLettereZip,
    downloadRegistriZip,
    deleteLettera,
    deleteRegistro,
    deleteAttestato,
    deletePreventivo
  };
};
