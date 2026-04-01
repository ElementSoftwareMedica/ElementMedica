/**
 * Clinical Hooks
 * React hooks for clinical data management
 * 
 * Provides reusable hooks for:
 * - Data fetching with loading states
 * - CRUD operations
 * - Real-time updates
 * - Caching and optimistic updates
 * 
 * @module hooks/clinica
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    clinicaApi,
    Appuntamento,
    Visita,
    Referto,
    SlotDisponibilita,
    Prestazione,
    Paziente,
    QueryOptions,
    PaginatedResponse
} from '../../services/clinicaApi';

// =====================================================
// TYPES
// =====================================================

interface UseQueryState<T> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

interface UseMutationState<T, TVariables> {
    mutate: (variables: TVariables) => Promise<T>;
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    reset: () => void;
}

interface UsePaginatedState<T> extends UseQueryState<PaginatedResponse<T>> {
    page: number;
    setPage: (page: number) => void;
    limit: number;
    setLimit: (limit: number) => void;
    totalPages: number;
    hasMore: boolean;
}

// =====================================================
// BASE HOOKS
// =====================================================

/**
 * Generic query hook
 */
function useQuery<T>(
    queryFn: () => Promise<T>,
    deps: unknown[] = []
): UseQueryState<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetch = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const result = await queryFn();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    }, deps);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, isLoading, error, refetch: fetch };
}

/**
 * Generic mutation hook
 */
function useMutation<T, TVariables>(
    mutationFn: (variables: TVariables) => Promise<T>
): UseMutationState<T, TVariables> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (variables: TVariables): Promise<T> => {
        try {
            setIsLoading(true);
            setError(null);
            const result = await mutationFn(variables);
            setData(result);
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [mutationFn]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
    }, []);

    return { mutate, data, isLoading, error, reset };
}

// =====================================================
// APPUNTAMENTI HOOKS (F3.5.1)
// =====================================================

/**
 * Hook for managing appointments
 */
export function useAppuntamenti(options?: QueryOptions) {
    const [page, setPage] = useState(options?.page || 1);
    const [limit, setLimit] = useState(options?.limit || 10);

    const queryState = useQuery<PaginatedResponse<Appuntamento>>(
        () => clinicaApi.appuntamenti.getAll({ ...options, page, limit }),
        [page, limit, JSON.stringify(options)]
    );

    const totalPages = (queryState.data as PaginatedResponse<Appuntamento> | null)?.pagination?.totalPages || 0;
    const hasMore = page < totalPages;

    return {
        ...queryState,
        page,
        setPage,
        limit,
        setLimit,
        totalPages,
        hasMore
    };
}

/**
 * Hook for single appointment
 */
export function useAppuntamento(id: string | null) {
    return useQuery(
        () => id ? clinicaApi.appuntamenti.getById(id) : Promise.resolve(null),
        [id]
    );
}

/**
 * Hook for today's appointments
 */
export function useAppuntamentiOggi() {
    return useQuery(() => clinicaApi.appuntamenti.getToday(), []);
}

/**
 * Hook for appointment mutations
 */
export function useAppuntamentoMutations() {
    const create = useMutation((data: Partial<Appuntamento>) =>
        clinicaApi.appuntamenti.create(data)
    );

    const update = useMutation(({ id, data }: { id: string; data: Partial<Appuntamento> }) =>
        clinicaApi.appuntamenti.update(id, data)
    );

    const remove = useMutation((id: string) =>
        clinicaApi.appuntamenti.delete(id)
    );

    const changeStato = useMutation(({ id, stato }: { id: string; stato: Appuntamento['stato'] }) =>
        clinicaApi.appuntamenti.changeStato(id, stato)
    );

    const accetta = useMutation((id: string) =>
        clinicaApi.appuntamenti.accetta(id)
    );

    const chiama = useMutation((id: string) =>
        clinicaApi.appuntamenti.chiama(id)
    );

    return { create, update, remove, changeStato, accetta, chiama };
}

// =====================================================
// DISPONIBILITÀ HOOKS (F3.5.2)
// =====================================================

/**
 * Hook for availability slots
 */
export function useDisponibilita(params: {
    dataInizio: string;
    dataFine: string;
    ambulatorioId?: string;
    medicoId?: string;
}) {
    return useQuery(
        () => clinicaApi.slots.getAvailability(params),
        [params.dataInizio, params.dataFine, params.ambulatorioId, params.medicoId]
    );
}

/**
 * Hook for checking slot overlap
 */
export function useCheckOverlap() {
    return useMutation((data: {
        ambulatorioId: string;
        data: string;
        oraInizio: string;
        oraFine: string;
    }) => clinicaApi.slots.checkOverlap(data));
}

/**
 * Hook for slot mutations
 */
export function useSlotMutations() {
    const create = useMutation((data: Partial<SlotDisponibilita>) =>
        clinicaApi.slots.create(data)
    );

    const update = useMutation(({ id, data }: { id: string; data: Partial<SlotDisponibilita> }) =>
        clinicaApi.slots.update(id, data)
    );

    const remove = useMutation((id: string) =>
        clinicaApi.slots.delete(id)
    );

    return { create, update, remove };
}

// =====================================================
// VISITE HOOKS (F3.5.3)
// =====================================================

/**
 * Hook for managing visits
 */
export function useVisite(options?: QueryOptions) {
    const [page, setPage] = useState(options?.page || 1);
    const [limit, setLimit] = useState(options?.limit || 10);

    const queryState = useQuery<PaginatedResponse<Visita>>(
        () => clinicaApi.visite.getAll({ ...options, page, limit }),
        [page, limit, JSON.stringify(options)]
    );

    const totalPages = (queryState.data as PaginatedResponse<Visita> | null)?.pagination?.totalPages || 0;
    const hasMore = page < totalPages;

    return {
        ...queryState,
        page,
        setPage,
        limit,
        setLimit,
        totalPages,
        hasMore
    };
}

/**
 * Hook for single visit
 */
export function useVisita(id: string | null) {
    return useQuery(
        () => id ? clinicaApi.visite.getById(id) : Promise.resolve(null),
        [id]
    );
}

/**
 * Hook for visit fields
 */
export function useVisitaCampi(visitaId: string | null) {
    return useQuery(
        () => visitaId ? clinicaApi.visite.getCampi(visitaId) : Promise.resolve([]),
        [visitaId]
    );
}

/**
 * Hook for today's visits
 */
export function useVisiteOggi() {
    return useQuery(() => clinicaApi.visite.getToday(), []);
}

/**
 * Hook for visit mutations
 */
export function useVisitaMutations() {
    const create = useMutation((data: Partial<Visita>) =>
        clinicaApi.visite.create(data)
    );

    const update = useMutation(({ id, data }: { id: string; data: Partial<Visita> }) =>
        clinicaApi.visite.update(id, data)
    );

    const remove = useMutation(({ id, deletionReason }: { id: string; deletionReason: string }) =>
        clinicaApi.visite.delete(id, deletionReason)
    );

    const inizia = useMutation((id: string) =>
        clinicaApi.visite.inizia(id)
    );

    const termina = useMutation((id: string) =>
        clinicaApi.visite.termina(id)
    );

    const saveCampo = useMutation(({ visitaId, data }: {
        visitaId: string;
        data: { templateCampoId: string; valore: unknown }
    }) => clinicaApi.visite.saveCampo(visitaId, data));

    return { create, update, remove, inizia, termina, saveCampo };
}

// =====================================================
// REFERTI HOOKS (F3.5.4)
// =====================================================

/**
 * Hook for managing reports
 */
export function useReferti(options?: QueryOptions) {
    const [page, setPage] = useState(options?.page || 1);
    const [limit, setLimit] = useState(options?.limit || 10);

    const queryState = useQuery<PaginatedResponse<Referto>>(
        () => clinicaApi.referti.getAll({ ...options, page, limit }),
        [page, limit, JSON.stringify(options)]
    );

    const totalPages = (queryState.data as PaginatedResponse<Referto> | null)?.pagination?.totalPages || 0;
    const hasMore = page < totalPages;

    return {
        ...queryState,
        page,
        setPage,
        limit,
        setLimit,
        totalPages,
        hasMore
    };
}

/**
 * Hook for single report
 */
export function useReferto(id: string | null) {
    return useQuery(
        () => id ? clinicaApi.referti.getById(id) : Promise.resolve(null),
        [id]
    );
}

/**
 * Hook for reports pending signature
 */
export function useRefertiDaFirmare() {
    return useQuery(() => clinicaApi.referti.getDaFirmare(), []);
}

/**
 * Hook for report versions
 */
export function useRefertoVersioni(refertoId: string | null) {
    return useQuery(
        () => refertoId ? clinicaApi.referti.getVersioni(refertoId) : Promise.resolve([]),
        [refertoId]
    );
}

/**
 * Hook for report mutations
 */
export function useRefertoMutations() {
    const create = useMutation((data: Partial<Referto>) =>
        clinicaApi.referti.create(data)
    );

    const update = useMutation(({ id, data }: { id: string; data: Partial<Referto> }) =>
        clinicaApi.referti.update(id, data)
    );

    const remove = useMutation((id: string) =>
        clinicaApi.referti.delete(id)
    );

    const firma = useMutation((id: string) =>
        clinicaApi.referti.firma(id)
    );

    return { create, update, remove, firma };
}

// =====================================================
// PRESTAZIONI HOOKS
// =====================================================

/**
 * Hook for managing procedures
 */
export function usePrestazioni(options?: QueryOptions) {
    const [page, setPage] = useState(options?.page || 1);
    const [limit, setLimit] = useState(options?.limit || 10);

    const queryState = useQuery<PaginatedResponse<Prestazione>>(
        () => clinicaApi.prestazioni.getAll({ ...options, page, limit }),
        [page, limit, JSON.stringify(options)]
    );

    const totalPages = (queryState.data as PaginatedResponse<Prestazione> | null)?.pagination?.totalPages || 0;
    const hasMore = page < totalPages;

    return {
        ...queryState,
        page,
        setPage,
        limit,
        setLimit,
        totalPages,
        hasMore
    };
}

/**
 * Hook for single procedure
 */
export function usePrestazione(id: string | null) {
    return useQuery(
        () => id ? clinicaApi.prestazioni.getById(id) : Promise.resolve(null),
        [id]
    );
}

// =====================================================
// PAZIENTI HOOKS
// =====================================================

/**
 * Hook for managing patients
 */
export function usePazienti(options?: QueryOptions) {
    const [page, setPage] = useState(options?.page || 1);
    const [limit, setLimit] = useState(options?.limit || 10);

    const queryState = useQuery<PaginatedResponse<Paziente>>(
        () => clinicaApi.pazienti.getAll({ ...options, page, limit }),
        [page, limit, JSON.stringify(options)]
    );

    const totalPages = (queryState.data as PaginatedResponse<Paziente> | null)?.pagination?.totalPages || 0;
    const hasMore = page < totalPages;

    return {
        ...queryState,
        page,
        setPage,
        limit,
        setLimit,
        totalPages,
        hasMore
    };
}

/**
 * Hook for single patient
 */
export function usePaziente(id: string | null) {
    return useQuery(
        () => id ? clinicaApi.pazienti.getById(id) : Promise.resolve(null),
        [id]
    );
}

/**
 * Hook for patient search
 */
export function usePazienteSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Paziente[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const search = useCallback(async (query: string) => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        try {
            setIsSearching(true);
            const data = await clinicaApi.pazienti.search(query);
            setResults(data);
        } catch (error) {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            search(searchTerm);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, search]);

    return { searchTerm, setSearchTerm, results, isSearching };
}

/**
 * Hook for patient history
 */
export function usePazienteStorico(pazienteId: string | null) {
    return useQuery(
        () => pazienteId ? clinicaApi.pazienti.getStorico(pazienteId) : Promise.resolve(null),
        [pazienteId]
    );
}

// =====================================================
// DASHBOARD HOOKS
// =====================================================

/**
 * Hook for dashboard statistics
 */
export function useDashboardStats() {
    return useQuery(() => clinicaApi.dashboard.getStats(), []);
}

/**
 * Hook for dashboard activities
 */
export function useDashboardActivities() {
    return useQuery(() => clinicaApi.dashboard.getRecentActivities(), []);
}

// =====================================================
// SCONTI HOOKS
// =====================================================

/**
 * Hook for discount validation
 */
export function useValidateSconto() {
    return useMutation((data: { codice: string; prezzoBase: number; prestazioneId?: string }) =>
        clinicaApi.sconti.validate(data)
    );
}

/**
 * Hook for applying discount
 */
export function useApplySconto() {
    return useMutation((data: { codice: string; prezzoBase: number; prestazioneId?: string }) =>
        clinicaApi.sconti.apply(data)
    );
}

// =====================================================
// EXPORT ALL HOOKS
// =====================================================

export const clinicaHooks = {
    // Appuntamenti
    useAppuntamenti,
    useAppuntamento,
    useAppuntamentiOggi,
    useAppuntamentoMutations,

    // Disponibilità
    useDisponibilita,
    useCheckOverlap,
    useSlotMutations,

    // Visite
    useVisite,
    useVisita,
    useVisitaCampi,
    useVisiteOggi,
    useVisitaMutations,

    // Referti
    useReferti,
    useReferto,
    useRefertiDaFirmare,
    useRefertoVersioni,
    useRefertoMutations,

    // Prestazioni
    usePrestazioni,
    usePrestazione,

    // Pazienti
    usePazienti,
    usePaziente,
    usePazienteSearch,
    usePazienteStorico,

    // Dashboard
    useDashboardStats,
    useDashboardActivities,

    // Sconti
    useValidateSconto,
    useApplySconto
};

// =====================================================
// QUEUE HOOKS RE-EXPORTS (P53)
// =====================================================

export {
    useQueueSessions,
    useQueueSession,
    useActiveSessionsToday,
    useQueueEntries,
    useQueueDisplay,
    useQueueMutations,
    useQueueAudio,
    useQueueCaller
} from './useQueue';

export default clinicaHooks;
