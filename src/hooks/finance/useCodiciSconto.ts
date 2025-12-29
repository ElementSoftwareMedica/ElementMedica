import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api';

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CodiceSconto {
  id: string;
  codice: string;
  descrizione?: string;
  tipo: 'PERCENTUALE' | 'VALORE_ASSOLUTO';
  valore: number;
  valoreMinimo?: number;
  valoreMax?: number;
  dataInizio: string;
  dataFine: string;
  stato: 'ATTIVO' | 'DISABILITATO' | 'SCADUTO' | 'ESAURITO';
  utilizzoMax?: number;
  utilizzoCorrente: number;
  utilizzoMaxPerUtente?: number;
  cumulabile: boolean;
  tipoServizio?: string;
  tipoCliente?: string;
  corsoId?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  corso?: {
    id: string;
    nome: string;
  };
}

export interface ValidazioneCodice {
  valido: boolean;  // Mapped from backend 'valid'
  valid?: boolean;  // Backend field name
  messaggio?: string;
  codice?: {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string;
    tipoSconto: string;
    valore: number;
    cumulabile: boolean;
    tipo?: string;  // Alias for tipoSconto
  };
  calcolo?: {
    prezzoBase: number;
    importoSconto: number;
    prezzoFinale: number;
    risparmioPercentuale: string;
  };
  errors?: string[];
  limiti?: {
    utilizzoGlobale: {
      utilizzati: number;
      massimo?: number;
      disponibili?: number;
    };
    utilizzoUtente: {
      utilizzati: number;
      massimo?: number;
      disponibili?: number;
    };
  };
}

interface UseCodiciScontoReturn {
  codici: CodiceSconto[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  fetchCodici: (params?: FetchParams) => Promise<void>;
  getCodice: (id: string) => Promise<CodiceSconto>;
  createCodice: (data: Partial<CodiceSconto>) => Promise<CodiceSconto>;
  updateCodice: (id: string, data: Partial<CodiceSconto>) => Promise<CodiceSconto>;
  deleteCodice: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  validateCodice: (params: ValidazioneParams) => Promise<ValidazioneCodice>;
}

interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
  stato?: string;
  tipo?: string;
  cumulabile?: boolean;
  tipoServizio?: string;
  tipoCliente?: string;
  corsoId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ValidazioneParams {
  codice: string;
  prezzoBase: number;  // Backend expects 'prezzoBase', not 'importo'
  tipoServizio: string;  // Required by backend
  clienteId: string;  // Required by backend
  clienteType: 'azienda' | 'persona';  // Required by backend
  corsoId?: string;
  // Legacy aliases for backward compatibility
  importo?: number;  // Alias for prezzoBase
  tipoCliente?: string;
  personaId?: string;
  dataPreventivo?: string;
}

/**
 * Custom hook per la gestione dei Codici Sconto
 * Integrazione con backend API /api/codici-sconto
 */
export const useCodiciSconto = (): UseCodiciScontoReturn => {
  const [codici, setCodici] = useState<CodiceSconto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  /**
   * Fetch lista codici con filtri e paginazione
   */
  const fetchCodici = useCallback(async (params: FetchParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.stato && params.stato !== 'TUTTI') queryParams.append('stato', params.stato);
      if (params.tipo && params.tipo !== 'TUTTI') queryParams.append('tipo', params.tipo);
      if (params.cumulabile !== undefined) queryParams.append('cumulabile', params.cumulabile.toString());
      if (params.tipoServizio) queryParams.append('tipoServizio', params.tipoServizio);
      if (params.tipoCliente) queryParams.append('tipoCliente', params.tipoCliente);
      if (params.corsoId) queryParams.append('corsoId', params.corsoId);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await apiGet<ApiResponse>(`/api/v1/codici-sconto?${queryParams.toString()}`) as ApiResponse;

      if (response.success) {
        setCodici(response.data.codici || []);
        setPagination({
          currentPage: response.data.currentPage || 1,
          totalPages: response.data.totalPages || 1,
          totalItems: response.data.total || 0,
          itemsPerPage: response.data.limit || 10
        });
      } else {
        throw new Error(response.message || 'Errore nel recupero dei codici sconto');
      }
    } catch (err: any) {
      console.error('Errore fetch codici sconto:', err);
      setError(err.message || 'Errore nel caricamento dei codici sconto');
      setCodici([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get singolo codice sconto
   */
  const getCodice = useCallback(async (id: string): Promise<CodiceSconto> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiGet<ApiResponse<CodiceSconto>>(`/api/v1/codici-sconto/${id}`) as ApiResponse<CodiceSconto>;

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Errore nel recupero del codice sconto');
      }
    } catch (err: any) {
      console.error('Errore get codice sconto:', err);
      setError(err.message || 'Errore nel caricamento del codice sconto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crea nuovo codice sconto
   */
  const createCodice = useCallback(async (data: Partial<CodiceSconto>): Promise<CodiceSconto> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPost<ApiResponse<CodiceSconto>>('/api/v1/codici-sconto', data) as ApiResponse<CodiceSconto>;

      if (response.success) {
        // Aggiungi il nuovo codice alla lista locale (optimistic update)
        setCodici(prev => [response.data, ...prev]);
        return response.data;
      } else {
        throw new Error(response.message || 'Errore nella creazione del codice sconto');
      }
    } catch (err: any) {
      console.error('Errore creazione codice sconto:', err);
      setError(err.message || 'Errore nella creazione del codice sconto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Aggiorna codice sconto esistente
   */
  const updateCodice = useCallback(async (id: string, data: Partial<CodiceSconto>): Promise<CodiceSconto> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPut<ApiResponse<CodiceSconto>>(`/api/v1/codici-sconto/${id}`, data) as ApiResponse<CodiceSconto>;

      if (response.success) {
        // Aggiorna il codice nella lista locale (optimistic update)
        setCodici(prev =>
          prev.map(c => c.id === id ? { ...c, ...response.data } : c)
        );
        return response.data;
      } else {
        throw new Error(response.message || 'Errore nell\'aggiornamento del codice sconto');
      }
    } catch (err: any) {
      console.error('Errore update codice sconto:', err);
      setError(err.message || 'Errore nell\'aggiornamento del codice sconto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Elimina codice sconto (soft delete)
   */
  const deleteCodice = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiDelete<ApiResponse>(`/api/v1/codici-sconto/${id}`) as ApiResponse;

      if (response.success) {
        // Rimuovi il codice dalla lista locale (optimistic update)
        setCodici(prev => prev.filter(c => c.id !== id));
      } else {
        throw new Error(response.message || 'Errore nell\'eliminazione del codice sconto');
      }
    } catch (err: any) {
      console.error('Errore delete codice sconto:', err);
      setError(err.message || 'Errore nell\'eliminazione del codice sconto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Elimina multipli codici sconto
   */
  const bulkDelete = useCallback(async (ids: string[]): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Esegui delete per ogni ID
      await Promise.all(ids.map(id => apiDelete(`/api/v1/codici-sconto/${id}`)));

      // Rimuovi i codici dalla lista locale
      setCodici(prev => prev.filter(c => !ids.includes(c.id)));
    } catch (err: any) {
      console.error('Errore bulk delete codici sconto:', err);
      setError(err.message || 'Errore nell\'eliminazione multipla dei codici sconto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Valida applicabilità codice sconto
   */
  const validateCodice = useCallback(async (params: ValidazioneParams): Promise<ValidazioneCodice> => {
    setLoading(true);
    setError(null);

    try {
      // Backend returns: { success, valid, codice, calcolo, errors }
      // NOT wrapped in data like other endpoints
      const response = await apiPost<{
        success: boolean;
        valid: boolean;
        codice?: {
          id: string;
          codice: string;
          nome: string;
          descrizione?: string;
          tipoSconto: string;
          valore: number;
          cumulabile: boolean;
        };
        calcolo?: {
          prezzoBase: number;
          importoSconto: number;
          prezzoFinale: number;
          risparmioPercentuale: string;
        };
        errors?: string[];
        message?: string;
      }>('/api/v1/codici-sconto/valida', params);

      if (response.success) {
        // Map backend 'valid' to frontend 'valido' for compatibility
        return {
          valido: response.valid,
          valid: response.valid,
          codice: response.codice ? {
            ...response.codice,
            tipo: response.codice.tipoSconto  // Add alias
          } : undefined,
          calcolo: response.calcolo,
          errors: response.errors,
          messaggio: response.errors?.[0]
        };
      } else {
        throw new Error(response.message || 'Errore nella validazione del codice sconto');
      }
    } catch (err: any) {
      console.error('Errore validazione codice sconto:', err);
      setError(err.message || 'Errore nella validazione del codice sconto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    codici,
    loading,
    error,
    pagination,
    fetchCodici,
    getCodice,
    createCodice,
    updateCodice,
    deleteCodice,
    bulkDelete,
    validateCodice
  };
};
