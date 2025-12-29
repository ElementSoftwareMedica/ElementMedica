import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, apiDownloadWithFilename, DownloadResult } from '../../services/api';
import { useTenantFilter } from '../../context/TenantFilterContext';

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Preventivo {
  id: string;
  numero: string;
  dataEmissione: string;
  dataScadenza: string;
  stato: 'BOZZA' | 'INVIATO' | 'VISUALIZZATO' | 'ACCETTATO' | 'RIFIUTATO' | 'SCADUTO' | 'ANNULLATO' | 'FATTURATO';
  prezzoTotale: number;
  scontoTotale: number;
  imponibile: number;
  aliquotaIva: number;
  importoIva: number;
  importoFinale: number;
  tipoServizio: string;
  titoloServizio?: string;
  descrizioneServizio?: string;
  dettagliServizio?: Record<string, any>;
  note?: string;
  personaId?: string;
  aziendaId?: string;
  corsoId?: string;
  scheduledCourseId?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  persona?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  azienda?: {
    id: string;
    ragioneSociale: string;
  };
  schedule?: {
    id: string;
    startDate: string;
    endDate?: string;
    course?: {
      id: string;
      title: string;
      code?: string;
    };
  };
  sconti?: Array<{
    id: string;
    codiceTesto?: string;
    nomeCodice?: string;
    tipoSconto?: string;
    valoreSconto?: number;
    importoScontato?: number;
  }>;
}

interface UsePreventiviReturn {
  preventivi: Preventivo[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  fetchPreventivi: (params?: FetchParams) => Promise<void>;
  getPreventivo: (id: string) => Promise<Preventivo>;
  createPreventivo: (data: Partial<Preventivo>) => Promise<Preventivo>;
  updatePreventivo: (id: string, data: Partial<Preventivo>) => Promise<Preventivo>;
  deletePreventivo: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  changeStato: (id: string, nuovoStato: string) => Promise<Preventivo>;
  applySconto: (preventivoId: string, codiceSconto: string) => Promise<Preventivo>;
  removeSconto: (preventivoId: string, scontoId: string) => Promise<Preventivo>;
  generatePdf: (id: string) => Promise<DownloadResult>;
  mergePreventivi: (preventiviIds: string[]) => Promise<{ preventivo: Preventivo }>;
  unmergePreventivo: (id: string) => Promise<{ restoredPreventivi: Array<{ id: string; numero: string }> }>;
}

interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
  stato?: string;
  tipoServizio?: string;
  personaId?: string;
  aziendaId?: string;
  corsoId?: string;
  dataEmissioneMin?: string;
  dataEmissioneMax?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Custom hook per la gestione dei Preventivi
 * Integrazione con backend API /api/preventivi
 */
export const usePreventivi = (): UsePreventiviReturn => {
  // Tenant filter from global context
  const { getTenantFilterParams } = useTenantFilter();

  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  /**
   * Fetch lista preventivi con filtri e paginazione
   */
  const fetchPreventivi = useCallback(async (params: FetchParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.stato && params.stato !== 'TUTTI') queryParams.append('stato', params.stato);
      if (params.tipoServizio && params.tipoServizio !== 'TUTTI') queryParams.append('tipoServizio', params.tipoServizio);
      if (params.personaId) queryParams.append('personaId', params.personaId);
      if (params.aziendaId) queryParams.append('aziendaId', params.aziendaId);
      if (params.corsoId) queryParams.append('corsoId', params.corsoId);
      if (params.dataEmissioneMin) queryParams.append('dataEmissioneMin', params.dataEmissioneMin);
      if (params.dataEmissioneMax) queryParams.append('dataEmissioneMax', params.dataEmissioneMax);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      // Add tenant filter params
      const tenantParams = getTenantFilterParams();
      if (tenantParams.tenantIds) {
        queryParams.append('tenantIds', tenantParams.tenantIds.join(','));
      }
      if (tenantParams.allTenants) {
        queryParams.append('allTenants', 'true');
      }

      const response = await apiGet<ApiResponse>(`/api/v1/preventivi?${queryParams.toString()}`) as ApiResponse;

      if (response.success) {
        // Backend returns { success, data: [...], pagination: {...} }
        // data is the array directly, not data.preventivi
        const preventiviArray = Array.isArray(response.data) ? response.data : (response.data?.preventivi || []);
        setPreventivi(preventiviArray);

        // Pagination can be at response.pagination or response.data.pagination
        const paginationData = response.pagination || response.data?.pagination || {};
        setPagination({
          currentPage: paginationData.page || paginationData.currentPage || 1,
          totalPages: paginationData.totalPages || Math.ceil((paginationData.total || 0) / (paginationData.limit || 10)),
          totalItems: paginationData.total || 0,
          itemsPerPage: paginationData.limit || 10
        });
      } else {
        throw new Error((response as any).error || response.message || 'Errore nel recupero dei preventivi');
      }
    } catch (err: any) {
      console.error('Errore fetch preventivi:', err);
      setError(err.message || 'Errore nel caricamento dei preventivi');
      setPreventivi([]);
    } finally {
      setLoading(false);
    }
  }, [getTenantFilterParams]);

  /**
   * Get singolo preventivo
   */
  const getPreventivo = useCallback(async (id: string): Promise<Preventivo> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiGet<ApiResponse<Preventivo>>(`/api/v1/preventivi/${id}`) as ApiResponse<Preventivo>;

      if (response.success) {
        return response.data;
      } else {
        throw new Error((response as any).error || response.message || 'Errore nel recupero del preventivo');
      }
    } catch (err: any) {
      console.error('Errore get preventivo:', err);
      setError(err.message || 'Errore nel caricamento del preventivo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crea nuovo preventivo
   */
  const createPreventivo = useCallback(async (data: Partial<Preventivo>): Promise<Preventivo> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPost<ApiResponse<Preventivo>>('/api/v1/preventivi', data) as ApiResponse<Preventivo>;

      if (response.success) {
        setPreventivi(prev => [response.data, ...prev]);
        return response.data;
      } else {
        throw new Error((response as any).error || response.message || 'Errore nella creazione del preventivo');
      }
    } catch (err: any) {
      console.error('Errore creazione preventivo:', err);
      setError(err.message || 'Errore nella creazione del preventivo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Aggiorna preventivo esistente
   */
  const updatePreventivo = useCallback(async (id: string, data: Partial<Preventivo>): Promise<Preventivo> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPut<ApiResponse<Preventivo>>(`/api/v1/preventivi/${id}`, data) as ApiResponse<Preventivo>;

      if (response.success) {
        setPreventivi(prev =>
          prev.map(p => p.id === id ? { ...p, ...response.data } : p)
        );
        return response.data;
      } else {
        throw new Error((response as any).error || response.message || 'Errore nell\'aggiornamento del preventivo');
      }
    } catch (err: any) {
      console.error('Errore update preventivo:', err);
      setError(err.message || 'Errore nell\'aggiornamento del preventivo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Elimina preventivo (soft delete)
   */
  const deletePreventivo = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiDelete<ApiResponse>(`/api/v1/preventivi/${id}`) as ApiResponse;

      if (response.success) {
        setPreventivi(prev => prev.filter(p => p.id !== id));
      } else {
        throw new Error((response as any).error || response.message || 'Errore nell\'eliminazione del preventivo');
      }
    } catch (err: any) {
      console.error('Errore delete preventivo:', err);
      setError(err.message || 'Errore nell\'eliminazione del preventivo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Elimina multipli preventivi
   */
  const bulkDelete = useCallback(async (ids: string[]): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all(ids.map(id => apiDelete(`/api/v1/preventivi/${id}`)));
      setPreventivi(prev => prev.filter(p => !ids.includes(p.id)));
    } catch (err: any) {
      console.error('Errore bulk delete preventivi:', err);
      setError(err.message || 'Errore nell\'eliminazione multipla dei preventivi');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cambia stato del preventivo
   */
  const changeStato = useCallback(async (id: string, nuovoStato: string): Promise<Preventivo> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPut<ApiResponse<Preventivo>>(
        `/api/v1/preventivi/${id}/stato`,
        { nuovoStato }
      ) as ApiResponse<Preventivo>;

      if (response.success) {
        setPreventivi(prev =>
          prev.map(p => p.id === id ? { ...p, ...response.data } : p)
        );
        return response.data;
      } else {
        // Backend returns 'error' for failure messages, 'message' for success
        const errorMsg = (response as any).error || response.message || 'Errore nel cambio stato del preventivo';
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Errore cambio stato preventivo:', err);
      setError(err.message || 'Errore nel cambio stato del preventivo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Applica codice sconto al preventivo
   */
  const applySconto = useCallback(async (preventivoId: string, codiceSconto: string): Promise<Preventivo> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPost<ApiResponse<Preventivo>>(
        `/api/v1/preventivi/${preventivoId}/applica-sconto`,
        { codice: codiceSconto }
      ) as ApiResponse<Preventivo>;

      if (response.success) {
        setPreventivi(prev =>
          prev.map(p => p.id === preventivoId ? { ...p, ...response.data } : p)
        );
        return response.data;
      } else {
        throw new Error((response as any).error || response.message || 'Errore nell\'applicazione dello sconto');
      }
    } catch (err: any) {
      console.error('Errore apply sconto:', err);
      setError(err.message || 'Errore nell\'applicazione dello sconto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Rimuovi sconto dal preventivo
   */
  const removeSconto = useCallback(async (preventivoId: string, scontoId: string): Promise<Preventivo> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiDelete<ApiResponse<Preventivo>>(
        `/api/v1/preventivi/${preventivoId}/sconti/${scontoId}`
      ) as ApiResponse<Preventivo>;

      if (response.success) {
        setPreventivi(prev =>
          prev.map(p => p.id === preventivoId ? { ...p, ...response.data } : p)
        );
        return response.data;
      } else {
        throw new Error((response as any).error || response.message || 'Errore nella rimozione dello sconto');
      }
    } catch (err: any) {
      console.error('Errore remove sconto:', err);
      setError(err.message || 'Errore nella rimozione dello sconto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Genera PDF del preventivo
   * Usa apiDownloadWithFilename per gestire il file binario e il filename dal server
   */
  const generatePdf = useCallback(async (id: string): Promise<DownloadResult> => {
    setLoading(true);
    setError(null);

    try {
      // Usa apiDownloadWithFilename per ottenere anche il filename dall'header
      const result = await apiDownloadWithFilename(`/api/v1/preventivi/${id}/pdf`);
      return result;
    } catch (err: any) {
      console.error('Errore generazione PDF:', err);
      setError(err.message || 'Errore nella generazione del PDF');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Unisce più preventivi della stessa azienda in uno nuovo
   * I preventivi originali vengono archiviati e mantengono riferimento al nuovo
   */
  const mergePreventivi = useCallback(async (preventiviIds: string[]): Promise<{
    preventivo: Preventivo;
    mergedPreventivi: Array<{ id: string; numero: string; stato: string }>;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPost<ApiResponse<{
        data: Preventivo;
        mergedPreventivi: Array<{ id: string; numero: string; stato: string }>;
      }>>(
        '/api/v1/preventivi/merge',
        { preventiviIds }
      );

      if (response.success) {
        // Aggiorna la lista locale: rimuovi i preventivi archiviati e aggiungi quello nuovo
        setPreventivi(prev => {
          const filtered = prev.filter(p => !preventiviIds.includes(p.id));
          return [response.data, ...filtered];
        });

        return {
          preventivo: response.data,
          mergedPreventivi: (response as any).mergedPreventivi || []
        };
      } else {
        throw new Error((response as any).error || 'Errore nell\'unione dei preventivi');
      }
    } catch (err: any) {
      console.error('Errore merge preventivi:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Errore nell\'unione dei preventivi';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Separa un preventivo unito ripristinando gli originali
   */
  const unmergePreventivo = useCallback(async (id: string): Promise<{
    restoredPreventivi: Array<{ id: string; numero: string }>;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPost<ApiResponse<{
        restoredPreventivi: Array<{ id: string; numero: string }>;
      }>>(
        `/api/v1/preventivi/${id}/unmerge`,
        {}
      );

      if (response.success) {
        // Rimuovi il preventivo unito dalla lista e aggiungi quelli ripristinati
        // Il refresh completo verrà fatto dalla pagina chiamante
        setPreventivi(prev => prev.filter(p => p.id !== id));

        return {
          restoredPreventivi: response.restoredPreventivi || (response as any).data?.restoredPreventivi || []
        };
      } else {
        throw new Error((response as any).error || 'Errore nella separazione del preventivo');
      }
    } catch (err: any) {
      console.error('Errore unmerge preventivo:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Errore nella separazione del preventivo';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    preventivi,
    loading,
    error,
    pagination,
    fetchPreventivi,
    getPreventivo,
    createPreventivo,
    updatePreventivo,
    deletePreventivo,
    bulkDelete,
    changeStato,
    applySconto,
    removeSconto,
    generatePdf,
    mergePreventivi,
    unmergePreventivo
  };
};
