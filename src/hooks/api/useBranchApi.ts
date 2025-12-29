/**
 * Branch-aware API Utilities
 * 
 * Utilities per aggiungere automaticamente branchType alle API calls.
 * Integra useBranch con il sistema API esistente.
 * 
 * @module hooks/api/useBranchApi
 * @project 45 - Tenant Restructuring Commercial (Opzione 2)
 */

import { useCallback, useMemo } from 'react';
import { useBranch, type BranchType } from '../useBranch';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../../services/api';

/**
 * Aggiunge branchType ai parametri di query
 */
function addBranchToParams<T extends Record<string, unknown>>(
    params: T,
    branchType: BranchType
): T & { branchType: BranchType } {
    return {
        ...params,
        branchType,
    };
}

/**
 * Aggiunge branchType al body della request
 */
function addBranchToBody<T extends Record<string, unknown>>(
    body: T,
    branchType: BranchType
): T & { branchType: BranchType } {
    return {
        ...body,
        branchType,
    };
}

/**
 * Hook per API calls branch-aware
 * 
 * Fornisce metodi GET, POST, PUT, PATCH, DELETE che includono
 * automaticamente il branchType corrente.
 * 
 * @example
 * ```tsx
 * function usePrestazioni() {
 *   const { branchGet, branchPost } = useBranchApiMethods();
 *   
 *   const fetchPrestazioni = async () => {
 *     // branchType viene aggiunto automaticamente ai params
 *     return branchGet('/api/v1/clinica/prestazioni', { page: 1 });
 *   };
 *   
 *   const createPrestazione = async (data) => {
 *     // branchType viene aggiunto automaticamente al body
 *     return branchPost('/api/v1/clinica/prestazioni', data);
 *   };
 * }
 * ```
 */
export function useBranchApiMethods() {
    const { currentBranch, getBranchHeader } = useBranch();

    /**
     * GET request con branchType nei params
     */
    const branchGet = useCallback(
        async <T>(
            url: string,
            params: Record<string, unknown> = {},
            options: { includeBranchInParams?: boolean } = {}
        ): Promise<T> => {
            const { includeBranchInParams = true } = options;
            const finalParams = includeBranchInParams
                ? addBranchToParams(params, currentBranch)
                : params;

            return apiGet<T>(url, finalParams);
        },
        [currentBranch]
    );

    /**
     * POST request con branchType nel body
     */
    const branchPost = useCallback(
        async <T>(
            url: string,
            body: Record<string, unknown> = {},
            options: { includeBranchInBody?: boolean } = {}
        ): Promise<T> => {
            const { includeBranchInBody = true } = options;
            const finalBody = includeBranchInBody
                ? addBranchToBody(body, currentBranch)
                : body;

            return apiPost<T>(url, finalBody);
        },
        [currentBranch]
    );

    /**
     * PUT request con branchType nel body
     */
    const branchPut = useCallback(
        async <T>(
            url: string,
            body: Record<string, unknown> = {},
            options: { includeBranchInBody?: boolean } = {}
        ): Promise<T> => {
            const { includeBranchInBody = true } = options;
            const finalBody = includeBranchInBody
                ? addBranchToBody(body, currentBranch)
                : body;

            return apiPut<T>(url, finalBody);
        },
        [currentBranch]
    );

    /**
     * PATCH request con branchType nel body
     */
    const branchPatch = useCallback(
        async <T>(
            url: string,
            body: Record<string, unknown> = {},
            options: { includeBranchInBody?: boolean } = {}
        ): Promise<T> => {
            const { includeBranchInBody = true } = options;
            const finalBody = includeBranchInBody
                ? addBranchToBody(body, currentBranch)
                : body;

            return apiPatch<T>(url, finalBody);
        },
        [currentBranch]
    );

    /**
     * DELETE request - branchType viene aggiunto come query param nell'URL
     * Nota: apiDelete accetta solo URL, quindi aggiungiamo branchType come query string
     */
    const branchDelete = useCallback(
        async <T>(
            url: string,
            options: { includeBranchInUrl?: boolean } = {}
        ): Promise<T> => {
            const { includeBranchInUrl = true } = options;

            // Aggiungi branchType come query parameter nell'URL
            const finalUrl = includeBranchInUrl
                ? `${url}${url.includes('?') ? '&' : '?'}branchType=${currentBranch}`
                : url;

            return apiDelete<T>(finalUrl);
        },
        [currentBranch]
    );

    return {
        currentBranch,
        branchGet,
        branchPost,
        branchPut,
        branchPatch,
        branchDelete,
        getBranchHeader,
    };
}

/**
 * Hook per ottenere i parametri branch per API calls manuali
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { branchParams, branchHeaders } = useBranchParams();
 *   
 *   const fetchData = async () => {
 *     const response = await fetch('/api/data?' + new URLSearchParams(branchParams));
 *   };
 * }
 * ```
 */
export function useBranchParams() {
    const { currentBranch, getBranchFilter, getBranchHeader } = useBranch();

    const branchParams = useMemo(() => getBranchFilter(), [getBranchFilter]);
    const branchHeaders = useMemo(() => getBranchHeader(), [getBranchHeader]);

    return {
        branchType: currentBranch,
        branchParams,
        branchHeaders,
    };
}

/**
 * Factory per creare API service branch-aware
 * 
 * @example
 * ```tsx
 * // In un file di servizio
 * export function usePrestazioniService() {
 *   return createBranchAwareApiService('/api/v1/clinica/prestazioni');
 * }
 * 
 * // Uso
 * const prestazioniService = usePrestazioniService();
 * const data = await prestazioniService.getAll({ page: 1 });
 * ```
 */
export function useBranchAwareApiService<T>(baseUrl: string) {
    const { branchGet, branchPost, branchPut, branchDelete, currentBranch } = useBranchApiMethods();

    const service = useMemo(() => ({
        /**
         * GET all con paginazione
         */
        getAll: (params: Record<string, unknown> = {}) =>
            branchGet<{ data: T[]; pagination: unknown }>(`${baseUrl}`, params),

        /**
         * GET by ID
         */
        getById: (id: string, params: Record<string, unknown> = {}) =>
            branchGet<{ data: T }>(`${baseUrl}/${id}`, params),

        /**
         * CREATE
         */
        create: (data: Partial<T>) =>
            branchPost<{ data: T }>(`${baseUrl}`, data as Record<string, unknown>),

        /**
         * UPDATE
         */
        update: (id: string, data: Partial<T>) =>
            branchPut<{ data: T }>(`${baseUrl}/${id}`, data as Record<string, unknown>),

        /**
         * DELETE (soft)
         */
        delete: (id: string) =>
            branchDelete<{ success: boolean }>(`${baseUrl}/${id}`),

        /**
         * Branch corrente
         */
        currentBranch,
    }), [baseUrl, branchGet, branchPost, branchPut, branchDelete, currentBranch]);

    return service;
}

export default useBranchApiMethods;
