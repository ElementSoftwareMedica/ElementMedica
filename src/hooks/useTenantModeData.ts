/**
 * useTenantModeData Hook
 * 
 * Hook per integrare TenantModeContext nelle pagine dati.
 * Fornisce un'API semplificata per:
 * - Ottenere parametri per le query GET (filtro per tenant)
 * - Ottenere parametri per operazioni CRUD (tenant operativo)
 * - Generare chiave stabile per invalidazione query React Query
 * 
 * Uso:
 * ```tsx
 * const {
 *   viewTenantId,           // Tenant selezionato per visualizzazione
 *   operateTenantId,        // Tenant per operazioni CRUD
 *   queryKey,               // Chiave per React Query (cambia quando cambia tenant)
 *   getQueryParams,         // Parametri per API GET
 *   getCreateTenantId,      // TenantId per CREATE
 *   getOperateHeaders,      // Headers per POST/PUT/DELETE
 *   canPerformCRUD,         // true se CRUD abilitato
 *   isMultiTenant,          // true se utente ha più tenant
 *   isReady,                // true quando context è inizializzato
 * } = useTenantModeData();
 * 
 * // In useQuery:
 * useQuery({
 *   queryKey: ['entities', queryKey, otherParams],
 *   queryFn: () => api.getAll(getQueryParams()),
 *   enabled: isReady,
 * });
 * 
 * // In create mutation:
 * const tenantId = getCreateTenantId();
 * if (!tenantId) return; // CRUD disabled
 * await api.create({ ...data, tenantId });
 * ```
 * 
 * @module hooks/useTenantModeData
 * @project 45 - Tenant Restructuring Commercial
 */

import { useMemo, useCallback } from 'react';
import { useTenantModeOptional } from '../contexts/TenantModeContext';
import { useAuth } from '../hooks/auth/useAuth';

// =====================================================
// TYPES
// =====================================================

export interface TenantModeDataResult {
    // === View State ===
    /** ID del tenant selezionato per visualizzazione (null = tutti) */
    viewTenantId: string | null;

    /** Array di tenant IDs selezionati (quando viewMode='all') */
    viewTenantIds: string[];

    /** Modalità view corrente */
    viewMode: 'all' | 'single';

    // === Operate State ===
    /** ID del tenant per operazioni CRUD */
    operateTenantId: string | null;

    /** true se le operazioni CRUD sono abilitate */
    canPerformCRUD: boolean;

    // === Meta ===
    /** true se l'utente ha accesso a più tenant */
    isMultiTenant: boolean;

    /** true quando il context è pronto */
    isReady: boolean;

    /** Loading state */
    loading: boolean;

    // === Query Helpers ===
    /** Chiave stabile per React Query - cambia quando cambia il tenant selezionato */
    queryKey: string;

    /** Genera parametri per le API GET (filtro tenant) */
    getQueryParams: () => Record<string, string | undefined>;

    /** Genera headers per operazioni CRUD */
    getOperateHeaders: () => Record<string, string>;

    /** Ottiene il tenantId per operazioni CREATE (null se CRUD disabilitato) */
    getCreateTenantId: () => string | null;

    // === Actions ===
    /** Invalida le query per forzare refresh */
    invalidateOnTenantChange: () => void;
}

// =====================================================
// HOOK
// =====================================================

export function useTenantModeData(): TenantModeDataResult {
    const tenantMode = useTenantModeOptional();
    const { user, isAuthenticated } = useAuth();

    // Fallback per utenti single-tenant (quando TenantModeProvider non è attivo o utente ha un solo tenant)
    const userTenantId = user?.tenantId || null;

    // === Computed Values ===

    const viewTenantId = useMemo(() => {
        if (!tenantMode) return userTenantId;
        if (tenantMode.viewMode === 'single') {
            return tenantMode.viewTenant?.id || userTenantId;
        }
        return null; // 'all' mode
    }, [tenantMode, userTenantId]);

    const viewTenantIds = useMemo(() => {
        if (!tenantMode) return userTenantId ? [userTenantId] : [];
        return tenantMode.viewTenantIds;
    }, [tenantMode, userTenantId]);

    const viewMode = tenantMode?.viewMode || 'single';

    const operateTenantId = useMemo(() => {
        if (!tenantMode) return userTenantId;
        return tenantMode.operateTenantId || userTenantId;
    }, [tenantMode, userTenantId]);

    const canPerformCRUD = useMemo(() => {
        if (!tenantMode) return true; // Single-tenant, sempre abilitato
        return tenantMode.canPerformCRUD;
    }, [tenantMode]);

    const isMultiTenant = tenantMode?.hasMultipleTenants || false;

    const isReady = useMemo(() => {
        if (!isAuthenticated) return false;
        if (!tenantMode) return !!userTenantId; // Single-tenant ready quando ha tenantId
        return !tenantMode.loading && tenantMode.accessibleTenants.length > 0;
    }, [isAuthenticated, tenantMode, userTenantId]);

    const loading = tenantMode?.loading || false;

    // === Query Key ===
    // Chiave stabile che cambia SOLO quando cambia la selezione tenant
    const queryKey = useMemo(() => {
        if (!tenantMode || viewMode === 'single') {
            return `tenant:${viewTenantId || 'default'}`;
        }
        // Per 'all' mode, usa tutti i tenant IDs ordinati
        return `tenants:${viewTenantIds.sort().join(',')}`;
    }, [tenantMode, viewMode, viewTenantId, viewTenantIds]);

    // === Helpers ===

    const getQueryParams = useCallback((): Record<string, string | undefined> => {
        // Se TenantMode non è attivo, usa il tenant dell'utente
        if (!tenantMode) {
            return userTenantId ? { tenantId: userTenantId } : {};
        }

        // Usa i metodi del context
        const params = tenantMode.getViewQueryParams();

        // Converti in formato stringa per query params
        if (params.tenantIds && params.tenantIds.length > 0) {
            return { tenantIds: params.tenantIds.join(',') };
        }
        if (params.tenantId) {
            return { tenantId: params.tenantId };
        }
        return {};
    }, [tenantMode, userTenantId]);

    const getOperateHeaders = useCallback((): Record<string, string> => {
        if (!tenantMode) return {};
        return tenantMode.getOperateHeaders();
    }, [tenantMode]);

    const getCreateTenantId = useCallback((): string | null => {
        if (!tenantMode) return userTenantId;
        return tenantMode.getCreateTenantId();
    }, [tenantMode, userTenantId]);

    const invalidateOnTenantChange = useCallback(() => {
        // Placeholder - sarà usato per invalidare cache
    }, []);

    return {
        viewTenantId,
        viewTenantIds,
        viewMode,
        operateTenantId,
        canPerformCRUD,
        isMultiTenant,
        isReady,
        loading,
        queryKey,
        getQueryParams,
        getOperateHeaders,
        getCreateTenantId,
        invalidateOnTenantChange,
    };
}

export default useTenantModeData;
