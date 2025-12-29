/**
 * useDocumentActions hook
 * 
 * Manages document actions: download, delete, and batch operations.
 */

import lettereIncaricoService from '../../../../../services/lettereIncaricoService';
import registriPresenzeService from '../../../../../services/registriPresenzeService';
import attestatiService from '../../../../../services/attestatiService';
import preventiviService from '../../../../../services/preventiviService';

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

  /**
   * Download lettera di incarico
   */
  const downloadLettera = async (id: string) => {
    try {
      await lettereIncaricoService.download(id);
    } catch (error) {
      console.error('Errore download lettera:', error);
      alert('❌ Errore durante il download');
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
      alert('❌ Errore durante il download');
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
      alert('❌ Errore durante il download');
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
      alert('❌ Errore durante il download');
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
      alert('❌ Errore durante il download del file ZIP');
    }
  };

  /**
   * Download multiple lettere di incarico as ZIP
   */
  const downloadLettereZip = async (ids: string[]) => {
    if (!scheduleId) {
      alert('❌ Schedule ID non disponibile');
      return;
    }
    try {
      await lettereIncaricoService.downloadZip(String(scheduleId), ids);
    } catch (error) {
      console.error('Errore download ZIP lettere:', error);
      alert('❌ Errore durante il download del file ZIP');
    }
  };

  /**
   * Download multiple registri presenze as ZIP
   */
  const downloadRegistriZip = async (ids: string[]) => {
    if (!scheduleId) {
      alert('❌ Schedule ID non disponibile');
      return;
    }
    try {
      await registriPresenzeService.downloadZip(String(scheduleId), ids);
    } catch (error) {
      console.error('Errore download ZIP registri:', error);
      alert('❌ Errore durante il download del file ZIP');
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
    } catch (error) {
      console.error('Errore eliminazione lettera:', error);
      alert('❌ Errore durante l\'eliminazione');
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
    } catch (error) {
      console.error('Errore eliminazione registro:', error);
      alert('❌ Errore durante l\'eliminazione');
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
    } catch (error) {
      console.error('Errore eliminazione attestato:', error);
      alert('❌ Errore durante l\'eliminazione');
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
    } catch (error) {
      console.error('Errore eliminazione preventivo:', error);
      alert('❌ Errore durante l\'eliminazione');
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
