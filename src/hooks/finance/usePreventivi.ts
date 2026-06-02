import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, apiDeleteWithPayload, apiDownloadWithFilename, DownloadResult } from '../../services/api';
import { useTenantFilter } from '../../context/TenantFilterContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ApiResponse<T = any> {
  success: boolean;
  data: T; // Tipizzato specificamente per ogni endpoint; usa cast type-narrowing per array/oggetto
  message?: string;
  error?: string; // Messaggio di errore specifico restituito dal backend
  pagination?: {
    page?: number;
    currentPage?: number;
    totalPages?: number;
    total?: number;
    limit?: number;
  };
  // Additional response fields for specific endpoints
  mergedPreventivi?: Array<{ id: string; numero: string; stato: string }>;
  restoredPreventivi?: Array<{ id: string; numero: string }>;
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
  deletePreventivo: (id: string, deletionReason?: string, options?: { stornaMovimentiFatturati?: boolean }) => Promise<void>;
  bulkDelete: (ids: string[], deletionReason?: string, options?: { stornaMovimentiFatturati?: boolean }) => Promise<void>;
  changeStato: (id: string, nuovoStato: string) => Promise<Preventivo>;
  applySconto: (preventivoId: string, codiceSconto: string) => Promise<Preventivo>;
  removeSconto: (preventivoId: string, scontoId: string) => Promise<Preventivo>;
  generatePdf: (id: string) => Promise<DownloadResult>;
  mergePreventivi: (preventiviIds: string[]) => Promise<{ preventivo: Preventivo }>;
  unmergePreventivo: (id: string) => Promise<{ restoredPreventivi: Array<{ id: string; numero: string }> }>;
  duplicatePreventivo: (id: string) => Promise<Preventivo>;
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
        const preventiviArray = Array.isArray(response.data) ? response.data : [];
        setPreventivi(preventiviArray);

        const paginationData = response.pagination || {};
        setPagination({
          currentPage: paginationData.currentPage || paginationData.page || 1,
          totalPages: paginationData.totalPages || 1,
          totalItems: paginationData.total || 0,
          itemsPerPage: paginationData.limit || 10
        });
      } else {
        throw new Error(response.error || response.message || 'Errore nel recupero dei preventivi');
      }
    } catch (err: unknown) {
      setError('Errore nel caricamento dei preventivi');
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
        throw new Error(response.error || response.message || 'Errore nel recupero del preventivo');
      }
    } catch (err: unknown) {
      setError('Errore nel caricamento del preventivo');
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
      // Rimuovi campi null/undefined: apiPost converte undefined→null e i validatori
      // UUID del backend rifiutano null (optional() skips solo undefined, non null)
      const backendData: Record<string, unknown> = { ...data };
      for (const key of Object.keys(backendData)) {
        if (backendData[key] === null || backendData[key] === undefined) {
          delete backendData[key];
        }
      }

      const response = await apiPost<ApiResponse<Preventivo>>('/api/v1/preventivi', backendData) as ApiResponse<Preventivo>;

      if (response.success) {
        setPreventivi(prev => [response.data, ...prev]);
        return response.data;
      } else {
        throw new Error(response.error || response.message || 'Errore nella creazione del preventivo');
      }
    } catch (err: unknown) {
      setError('Errore nella creazione del preventivo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Aggiorna preventivo esistente
   * 
   * Rimuove campi null/undefined per evitare fallimenti validazione UUID.
   */
  const updatePreventivo = useCallback(async (id: string, data: Partial<Preventivo>): Promise<Preventivo> => {
    setLoading(true);
    setError(null);

    try {
      // Rimuovi campi null/undefined per evitare fallimenti validazione UUID
      const backendData: Record<string, unknown> = { ...data };
      for (const key of Object.keys(backendData)) {
        if (backendData[key] === null || backendData[key] === undefined) {
          delete backendData[key];
        }
      }

      const response = await apiPut<ApiResponse<Preventivo>>(`/api/v1/preventivi/${id}`, backendData) as ApiResponse<Preventivo>;

      if (response.success) {
        setPreventivi(prev =>
          prev.map(p => p.id === id ? { ...p, ...response.data } : p)
        );
        return response.data;
      } else {
        throw new Error(response.error || response.message || 'Errore nell\'aggiornamento del preventivo');
      }
    } catch (err: unknown) {
      setError('Errore nell\'aggiornamento del preventivo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Elimina preventivo (soft delete)
   */
  const deletePreventivo = useCallback(async (id: string, deletionReason = 'Eliminazione manuale preventivo', options?: { stornaMovimentiFatturati?: boolean }): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiDeleteWithPayload<ApiResponse>(`/api/v1/preventivi/${id}`, {
        deletionReason,
        ...(options?.stornaMovimentiFatturati !== undefined && { stornaMovimentiFatturati: options.stornaMovimentiFatturati })
      }) as ApiResponse;

      if (response.success) {
        setPreventivi(prev => prev.filter(p => p.id !== id));
      } else {
        throw new Error(response.error || response.message || 'Errore nell\'eliminazione del preventivo');
      }
    } catch (err: unknown) {
      setError('Errore nell\'eliminazione del preventivo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Elimina multipli preventivi
   */
  const bulkDelete = useCallback(async (ids: string[], deletionReason = 'Eliminazione multipla preventivi', options?: { stornaMovimentiFatturati?: boolean }): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all(ids.map(id => apiDeleteWithPayload(`/api/v1/preventivi/${id}`, {
        deletionReason,
        ...(options?.stornaMovimentiFatturati !== undefined && { stornaMovimentiFatturati: options.stornaMovimentiFatturati })
      })));
      setPreventivi(prev => prev.filter(p => !ids.includes(p.id)));
    } catch (err: unknown) {
      setError('Errore nell\'eliminazione multipla dei preventivi');
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
        const errorMsg = response.error || response.message || 'Errore nel cambio stato del preventivo';
        throw new Error(errorMsg);
      }
    } catch (err: unknown) {
      setError('Errore nel cambio stato del preventivo');
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
        throw new Error(response.error || response.message || 'Errore nell\'applicazione dello sconto');
      }
    } catch (err: unknown) {
      setError('Errore nell\'applicazione dello sconto');
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
        throw new Error(response.error || response.message || 'Errore nella rimozione dello sconto');
      }
    } catch (err: unknown) {
      setError('Errore nella rimozione dello sconto');
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
    } catch (err: unknown) {
      setError('Errore nella generazione del PDF');
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
      const response = await apiPost<ApiResponse<Preventivo>>(
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
          mergedPreventivi: response.mergedPreventivi || []
        };
      } else {
        throw new Error(response.error || 'Errore nell\'unione dei preventivi');
      }
    } catch (err: unknown) {
      const errorMsg = 'Errore nell\'unione dei preventivi';
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
      const response = await apiPost<ApiResponse<unknown>>(
        `/api/v1/preventivi/${id}/unmerge`,
        {}
      );

      if (response.success) {
        // Rimuovi il preventivo unito dalla lista e aggiungi quelli ripristinati
        // Il refresh completo verrà fatto dalla pagina chiamante
        setPreventivi(prev => prev.filter(p => p.id !== id));

        return {
          restoredPreventivi: response.restoredPreventivi || []
        };
      } else {
        throw new Error(response.error || 'Errore nella separazione del preventivo');
      }
    } catch (err: unknown) {
      const errorMsg = 'Errore nella separazione del preventivo';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Duplica un preventivo esistente creando una copia in stato BOZZA
   */
  const duplicatePreventivo = useCallback(async (id: string): Promise<Preventivo> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPost<ApiResponse<Preventivo>>(
        `/api/v1/preventivi/${id}/duplicate`,
        {}
      ) as ApiResponse<Preventivo>;

      if (response.success) {
        // Aggiungi il nuovo preventivo duplicato alla lista
        setPreventivi(prev => [response.data, ...prev]);
        return response.data;
      } else {
        throw new Error(response.error || response.message || 'Errore nella duplicazione del preventivo');
      }
    } catch (err: unknown) {
      const errorMsg = 'Errore nella duplicazione del preventivo';
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
    unmergePreventivo,
    duplicatePreventivo
  };
};
