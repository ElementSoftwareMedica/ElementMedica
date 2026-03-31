/**
 * React Query Hooks for Movimenti Contabili
 * 
 * P59 - Sistema unificato movimenti finanziari
 * 
 * Features:
 * - useMovimentiContabili: Lista con filtri e paginazione
 * - useMovimentoContabile: Singolo movimento
 * - useCreateMovimento: Crea nuovo movimento
 * - useUpdateMovimento: Aggiorna movimento
 * - useDeleteMovimento: Soft delete (GDPR)
 * - useMarkAsPaid: Segna come pagato
 * - useDashboardStats: Statistiche dashboard
 * - useAgingReport: Report scadenze
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import movimentiContabiliService, {
    MovimentoContabile,
    MovimentiContabiliListParams,
    CreateMovimentoInput,
    UpdateMovimentoInput,
    PaginatedResponse,
    DashboardStats,
    AgingReport,
    DirezioneMovimento,
    StatoMovimento,
    BranchType,
} from '../../services/movimentiContabiliService';
import { useTenantFilter } from '../../context/TenantFilterContext';

// ============================================
// QUERY KEYS
// ============================================

export const movimentiKeys = {
    all: ['movimenti-contabili'] as const,
    lists: () => [...movimentiKeys.all, 'list'] as const,
    list: (filters?: MovimentiContabiliListParams) => [...movimentiKeys.lists(), filters] as const,
    details: () => [...movimentiKeys.all, 'detail'] as const,
    detail: (id: string) => [...movimentiKeys.details(), id] as const,
    dashboard: () => [...movimentiKeys.all, 'dashboard'] as const,
    dashboardStats: (params?: { branchType?: BranchType; dataDa?: string; dataA?: string }) =>
        [...movimentiKeys.dashboard(), 'stats', params] as const,
    reports: () => [...movimentiKeys.all, 'reports'] as const,
    aging: (params?: { direzione?: DirezioneMovimento; branchType?: BranchType }) =>
        [...movimentiKeys.reports(), 'aging', params] as const,
    scaduti: (params?: { direzione?: DirezioneMovimento; branchType?: BranchType }) =>
        [...movimentiKeys.reports(), 'scaduti', params] as const,
    inScadenza: (params?: { direzione?: DirezioneMovimento; branchType?: BranchType }) =>
        [...movimentiKeys.reports(), 'in-scadenza', params] as const,
    totali: (params?: { branchType?: BranchType; dataDa?: string; dataA?: string }) =>
        [...movimentiKeys.all, 'totali', params] as const,
    byAttivita: (tipo: string, id: string) =>
        [...movimentiKeys.all, 'attivita', tipo, id] as const,
};

// ============================================
// LIST HOOKS
// ============================================

/**
 * Hook per lista movimenti contabili con filtri e paginazione
 */
export function useMovimentiContabili(
    params?: MovimentiContabiliListParams,
    options?: Omit<UseQueryOptions<PaginatedResponse<MovimentoContabile>, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<PaginatedResponse<MovimentoContabile>, Error> {
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    const combinedParams = {
        ...getTenantFilterParams(),
        ...params,
    };

    return useQuery<PaginatedResponse<MovimentoContabile>, Error>({
        queryKey: [...movimentiKeys.list(combinedParams), tenantFilterKey],
        queryFn: () => movimentiContabiliService.list(combinedParams),
        enabled: isReady && (options?.enabled !== false),
        staleTime: 30000, // 30 secondi
        ...options,
    });
}

/**
 * Hook per singolo movimento contabile
 */
export function useMovimentoContabile(
    id: string | undefined,
    include?: string,
    options?: Omit<UseQueryOptions<MovimentoContabile, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<MovimentoContabile, Error> {
    const { tenantFilterKey, isReady } = useTenantFilter();

    return useQuery<MovimentoContabile, Error>({
        queryKey: [...movimentiKeys.detail(id!), tenantFilterKey],
        queryFn: () => movimentiContabiliService.getById(id!, include),
        enabled: !!id && isReady && (options?.enabled !== false),
        staleTime: 30000,
        ...options,
    });
}

/**
 * Hook per movimenti scaduti
 */
export function useMovimentiScaduti(
    params?: { direzione?: DirezioneMovimento; branchType?: BranchType; giorniScaduti?: number },
    options?: Omit<UseQueryOptions<MovimentoContabile[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<MovimentoContabile[], Error> {
    const { tenantFilterKey, isReady } = useTenantFilter();

    return useQuery<MovimentoContabile[], Error>({
        queryKey: [...movimentiKeys.scaduti(params), tenantFilterKey],
        queryFn: () => movimentiContabiliService.getScaduti(params),
        enabled: isReady && (options?.enabled !== false),
        staleTime: 60000, // 1 minuto
        ...options,
    });
}

/**
 * Hook per movimenti in scadenza
 */
export function useMovimentiInScadenza(
    params?: { direzione?: DirezioneMovimento; branchType?: BranchType; giorniProssimi?: number },
    options?: Omit<UseQueryOptions<MovimentoContabile[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<MovimentoContabile[], Error> {
    const { tenantFilterKey, isReady } = useTenantFilter();

    return useQuery<MovimentoContabile[], Error>({
        queryKey: [...movimentiKeys.inScadenza(params), tenantFilterKey],
        queryFn: () => movimentiContabiliService.getInScadenza(params),
        enabled: isReady && (options?.enabled !== false),
        staleTime: 60000,
        ...options,
    });
}

/**
 * Hook per movimenti di un'attività specifica
 */
export function useMovimentiByAttivita(
    tipo: 'visita' | 'sopralluogo' | 'dvr' | 'nomina' | 'corso',
    attivitaId: string | undefined,
    options?: Omit<UseQueryOptions<MovimentoContabile[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<MovimentoContabile[], Error> {
    const { tenantFilterKey, isReady } = useTenantFilter();

    return useQuery<MovimentoContabile[], Error>({
        queryKey: [...movimentiKeys.byAttivita(tipo, attivitaId!), tenantFilterKey],
        queryFn: () => movimentiContabiliService.getByAttivita(tipo, attivitaId!),
        enabled: !!attivitaId && isReady && (options?.enabled !== false),
        staleTime: 30000,
        ...options,
    });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook per creare movimento contabile
 */
export function useCreateMovimento() {
    const queryClient = useQueryClient();

    return useMutation<MovimentoContabile, Error, CreateMovimentoInput>({
        mutationFn: (data) => movimentiContabiliService.create(data),
        onSuccess: () => {
            // Invalida tutte le liste e dashboard
            queryClient.invalidateQueries({ queryKey: movimentiKeys.lists() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.dashboard() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.reports() });
        },
        onError: (error) => {
        },
    });
}

/**
 * Hook per creare coppia movimenti (ENTRATA + USCITA)
 */
export function useCreateMovimentoPair() {
    const queryClient = useQueryClient();

    return useMutation<
        { entrata: MovimentoContabile; uscita: MovimentoContabile },
        Error,
        { entrata: CreateMovimentoInput; uscita: CreateMovimentoInput }
    >({
        mutationFn: ({ entrata, uscita }) =>
            movimentiContabiliService.createPair(entrata, uscita),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: movimentiKeys.lists() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.dashboard() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.reports() });
        },
        onError: (error) => {
        },
    });
}

/**
 * Hook per aggiornare movimento contabile
 */
export function useUpdateMovimento() {
    const queryClient = useQueryClient();

    return useMutation<
        MovimentoContabile,
        Error,
        { id: string; data: UpdateMovimentoInput },
        { previousMovimento?: MovimentoContabile }
    >({
        mutationFn: ({ id, data }) => movimentiContabiliService.update(id, data),
        onMutate: async ({ id, data }) => {
            // Cancel ongoing queries
            await queryClient.cancelQueries({ queryKey: movimentiKeys.detail(id) });

            // Snapshot previous value
            const previousMovimento = queryClient.getQueryData<MovimentoContabile>(
                movimentiKeys.detail(id)
            );

            // Optimistic update
            if (previousMovimento) {
                queryClient.setQueryData<MovimentoContabile>(movimentiKeys.detail(id), {
                    ...previousMovimento,
                    ...data,
                    updatedAt: new Date().toISOString(),
                });
            }

            return { previousMovimento };
        },
        onSuccess: (updatedMovimento) => {
            queryClient.invalidateQueries({ queryKey: movimentiKeys.lists() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.dashboard() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.reports() });
            queryClient.setQueryData(movimentiKeys.detail(updatedMovimento.id), updatedMovimento);
        },
        onError: (error, { id }, context) => {
            // Rollback on error
            if (context?.previousMovimento) {
                queryClient.setQueryData(movimentiKeys.detail(id), context.previousMovimento);
            }
        },
    });
}

/**
 * Hook per soft delete movimento (GDPR compliant)
 */
export function useDeleteMovimento() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { id: string; deletionReason: string }>({
        mutationFn: ({ id, deletionReason }) =>
            movimentiContabiliService.delete(id, deletionReason),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: movimentiKeys.lists() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.dashboard() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.reports() });
            queryClient.removeQueries({ queryKey: movimentiKeys.detail(id) });
        },
        onError: (error) => {
        },
    });
}

/**
 * Hook per segnare movimento come pagato
 */
export function useMarkAsPaid() {
    const queryClient = useQueryClient();

    return useMutation<
        MovimentoContabile,
        Error,
        {
            id: string;
            dataPagamento: string;
            metodoPagamento?: string;
            riferimentoPagamento?: string;
        }
    >({
        mutationFn: ({ id, dataPagamento, metodoPagamento, riferimentoPagamento }) =>
            movimentiContabiliService.markAsPaid(id, dataPagamento, metodoPagamento, riferimentoPagamento),
        onSuccess: (updatedMovimento) => {
            queryClient.invalidateQueries({ queryKey: movimentiKeys.lists() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.dashboard() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.reports() });
            queryClient.setQueryData(movimentiKeys.detail(updatedMovimento.id), updatedMovimento);
        },
        onError: (error) => {
        },
    });
}

/**
 * Hook per collegare movimento a fattura
 */
export function useLinkToFattura() {
    const queryClient = useQueryClient();

    return useMutation<MovimentoContabile, Error, { id: string; fatturaId: string }>({
        mutationFn: ({ id, fatturaId }) =>
            movimentiContabiliService.linkToFattura(id, fatturaId),
        onSuccess: (updatedMovimento) => {
            queryClient.invalidateQueries({ queryKey: movimentiKeys.lists() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.dashboard() });
            queryClient.setQueryData(movimentiKeys.detail(updatedMovimento.id), updatedMovimento);
        },
        onError: (error) => {
        },
    });
}

/**
 * Hook per aggiornamento stato in bulk
 */
export function useBulkUpdateStato() {
    const queryClient = useQueryClient();

    return useMutation<number, Error, { ids: string[]; stato: StatoMovimento }>({
        mutationFn: ({ ids, stato }) =>
            movimentiContabiliService.bulkUpdateStato(ids, stato),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: movimentiKeys.lists() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.dashboard() });
            queryClient.invalidateQueries({ queryKey: movimentiKeys.reports() });
        },
        onError: (error) => {
        },
    });
}

// ============================================
// DASHBOARD & REPORTS HOOKS
// ============================================

/**
 * Hook per statistiche dashboard
 */
export function useDashboardStats(
    params?: { branchType?: BranchType; dataDa?: string; dataA?: string },
    options?: Omit<UseQueryOptions<DashboardStats, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<DashboardStats, Error> {
    const { tenantFilterKey, isReady } = useTenantFilter();

    return useQuery<DashboardStats, Error>({
        queryKey: [...movimentiKeys.dashboardStats(params), tenantFilterKey],
        queryFn: () => movimentiContabiliService.getDashboardStats(params),
        enabled: isReady && (options?.enabled !== false),
        staleTime: 60000, // 1 minuto - dati aggregati
        ...options,
    });
}

/**
 * Hook per aging report (scadenze)
 */
export function useAgingReport(
    params?: { direzione?: DirezioneMovimento; branchType?: BranchType; dataRiferimento?: string },
    options?: Omit<UseQueryOptions<AgingReport, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<AgingReport, Error> {
    const { tenantFilterKey, isReady } = useTenantFilter();

    return useQuery<AgingReport, Error>({
        queryKey: [...movimentiKeys.aging(params), tenantFilterKey],
        queryFn: () => movimentiContabiliService.getAgingReport(params),
        enabled: isReady && (options?.enabled !== false),
        staleTime: 60000,
        ...options,
    });
}

/**
 * Hook per totali aggregati
 */
export function useTotaliMovimenti(
    params?: { branchType?: BranchType; dataDa?: string; dataA?: string; stato?: StatoMovimento[] },
    options?: Omit<UseQueryOptions<{
        entrate: { count: number; importoLordo: number; importoNetto: number };
        uscite: { count: number; importoLordo: number; importoNetto: number };
        saldo: number;
    }, Error>, 'queryKey' | 'queryFn'>
) {
    const { tenantFilterKey, isReady } = useTenantFilter();

    return useQuery({
        queryKey: [...movimentiKeys.totali(params), tenantFilterKey],
        queryFn: () => movimentiContabiliService.getTotali(params),
        enabled: isReady && (options?.enabled !== false),
        staleTime: 60000,
        ...options,
    });
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook combinato per la pagina lista movimenti
 * Fornisce dati, paginazione, e mutations comuni
 */
export function useMovimentiContabiliPage(initialParams?: MovimentiContabiliListParams) {
    const queryClient = useQueryClient();
    const movimentiQuery = useMovimentiContabili(initialParams);
    const createMutation = useCreateMovimento();
    const updateMutation = useUpdateMovimento();
    const deleteMutation = useDeleteMovimento();
    const markAsPaidMutation = useMarkAsPaid();

    const refetch = () => {
        queryClient.invalidateQueries({ queryKey: movimentiKeys.lists() });
    };

    return {
        // Query data
        movimenti: movimentiQuery.data?.data || [],
        pagination: movimentiQuery.data?.pagination,
        isLoading: movimentiQuery.isLoading,
        isError: movimentiQuery.isError,
        error: movimentiQuery.error,
        refetch,

        // Mutations
        createMovimento: createMutation.mutateAsync,
        updateMovimento: updateMutation.mutateAsync,
        deleteMovimento: deleteMutation.mutateAsync,
        markAsPaid: markAsPaidMutation.mutateAsync,

        // Mutation states
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}

/**
 * Hook per la dashboard finanziaria
 * Combina stats, aging report e totali
 */
export function useFinancialDashboard(params?: { branchType?: BranchType; dataDa?: string; dataA?: string }) {
    const statsQuery = useDashboardStats(params);
    const agingQuery = useAgingReport({
        direzione: 'ENTRATA',
        branchType: params?.branchType
    });
    const scadutiQuery = useMovimentiScaduti({ branchType: params?.branchType });
    const inScadenzaQuery = useMovimentiInScadenza({ branchType: params?.branchType });

    return {
        stats: statsQuery.data,
        aging: agingQuery.data,
        scaduti: scadutiQuery.data || [],
        inScadenza: inScadenzaQuery.data || [],
        isLoading: statsQuery.isLoading || agingQuery.isLoading,
        isError: statsQuery.isError || agingQuery.isError,
        error: statsQuery.error || agingQuery.error,
    };
}
