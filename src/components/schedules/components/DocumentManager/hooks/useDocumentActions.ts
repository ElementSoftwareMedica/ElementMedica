/**
 * useDocumentActions hook
 * 
 * Manages document actions: download, delete, and batch operations.
 */

import lettereIncaricoService from '../../../../../services/lettereIncaricoService';
import registriPresenzeService from '../../../../../services/registriPresenzeService';
import attestatiService from '../../../../../services/attestatiService';
import preventiviService from '../../../../../services/preventiviService';
import { apiPost } from '../../../../../api/api';
import { useToast } from '../../../../../hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useTenantMode } from '@/contexts/TenantModeContext';
import type { SignaturePlacement } from '../components/SigningWorkflowModal';

export type DocumentType = 'attestato' | 'lettera' | 'registro';

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
  signDocument: (id: string, signatureData: string, placement: SignaturePlacement, docType?: DocumentType) => Promise<void>;
  signDocumentsBulk: (ids: string[], signatureData: string, placement: SignaturePlacement, docType?: DocumentType) => Promise<{ succeeded: string[]; failed: string[] }>;
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
  const { confirmDelete } = useConfirmDialog();
  const { getOperateHeaders } = useTenantMode();

  /**
   * Download lettera di incarico
   */
  const downloadLettera = async (id: string) => {
    try {
      await lettereIncaricoService.download(id);
    } catch (error) {
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
      showToast({ message: 'Errore durante il download del file ZIP registri', type: 'error' });
    }
  };

  /**
   * Delete lettera di incarico (with confirmation)
   */
  const deleteLettera = async (id: string) => {
    if (!(await confirmDelete('lettera'))) return;

    try {
      await lettereIncaricoService.delete(id);
      onRefresh();
      showToast({ message: 'Lettera eliminata con successo', type: 'success' });
    } catch (error) {
      showToast({ message: 'Errore durante l\'eliminazione della lettera', type: 'error' });
    }
  };

  /**
   * Delete registro presenze (with confirmation)
   */
  const deleteRegistro = async (id: string) => {
    if (!(await confirmDelete('registro'))) return;

    try {
      await registriPresenzeService.delete(id);
      onRefresh();
      showToast({ message: 'Registro eliminato con successo', type: 'success' });
    } catch (error) {
      showToast({ message: 'Errore durante l\'eliminazione del registro', type: 'error' });
    }
  };

  /**
   * Delete attestato (with confirmation)
   */
  const deleteAttestato = async (id: string) => {
    if (!(await confirmDelete('attestato'))) return;

    try {
      await attestatiService.delete(id);
      onRefresh();
      showToast({ message: 'Attestato eliminato con successo', type: 'success' });
    } catch (error) {
      showToast({ message: 'Errore durante l\'eliminazione dell\'attestato', type: 'error' });
    }
  };

  /**
   * Delete preventivo (with confirmation)
   */
  const deletePreventivo = async (id: string) => {
    if (!(await confirmDelete('preventivo'))) return;

    try {
      await preventiviService.delete(id);
      onRefresh();
      showToast({ message: 'Preventivo eliminato con successo', type: 'success' });
    } catch (error) {
      showToast({ message: 'Errore durante l\'eliminazione del preventivo', type: 'error' });
    }
  };

  /**
   * Get the API base path for a document type
   */
  const getSignBasePath = (docType?: DocumentType): string => {
    switch (docType) {
      case 'attestato': return '/api/v1/attestati';
      case 'lettera': return '/api/v1/lettere-incarico';
      case 'registro': return '/api/v1/registri-presenze';
      default: return '/api/v1/attestati';
    }
  };

  /**
   * Sign a single document by ID
   */
  const signDocument = async (id: string, signatureData: string, placement: SignaturePlacement, docType?: DocumentType): Promise<void> => {
    const basePath = getSignBasePath(docType);
    await apiPost(`${basePath}/${id}/sign`, { signatureData, placement }, { headers: getOperateHeaders() });
    onRefresh();
    showToast({ message: 'Documento firmato con successo', type: 'success' });
  };

  /**
   * Sign multiple documents in bulk with the same signature
   */
  const signDocumentsBulk = async (
    ids: string[],
    signatureData: string,
    placement: SignaturePlacement,
    docType?: DocumentType
  ): Promise<{ succeeded: string[]; failed: string[] }> => {
    const basePath = getSignBasePath(docType);
    const result = await apiPost<{ succeeded: string[]; failed: string[] }>(
      `${basePath}/bulk-sign`,
      { documentIds: ids, signatureData, placement },
      { headers: getOperateHeaders() }
    );
    onRefresh();
    const succeeded = result?.succeeded ?? [];
    const failed = result?.failed ?? [];
    if (succeeded.length > 0) {
      showToast({ message: `${succeeded.length} document${succeeded.length === 1 ? 'o firmato' : 'i firmati'} con successo`, type: 'success' });
    }
    if (failed.length > 0) {
      showToast({ message: `${failed.length} document${failed.length === 1 ? 'o non firmato' : 'i non firmati'} per errore`, type: 'error' });
    }
    return { succeeded, failed };
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
    deletePreventivo,
    signDocument,
    signDocumentsBulk
  };
};
