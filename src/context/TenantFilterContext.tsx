/**
 * TenantFilterContext
 * 
 * Context globale per la gestione del filtro tenant nelle pagine.
 * Permette agli utenti con accesso multi-tenant di filtrare le entità
 * per uno o più tenant selezionati.
 * 
 * INTEGRAZIONE: Questo context si sincronizza automaticamente con TenantModeContext.
 * Quando l'utente cambia il tenant nel TenantModeSelector, questo context si aggiorna.
 * 
 * Logica:
 * - Utenti normali: vedono solo le entità del proprio tenant (nessun filtro UI)
 * - Utenti con più tenant: vedono dropdown multi-select per filtrare
 * - Admin globali: vedono tutti i tenant disponibili
 * 
 * @module context/TenantFilterContext
 * @project 43 - Tenant Roles Management System
 * @updated Project 45 - TenantMode Integration
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useTenantModeOptional } from '../contexts/TenantModeContext';
import { apiGet } from '../services/api';

// =====================================================
// TYPES
// =====================================================

export interface TenantInfo {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    accessLevel?: 'FULL' | 'LIMITED' | 'READONLY';
    isPrimary?: boolean;
}

interface TenantFilterContextType {
    // Tenant dell'utente corrente (da JWT)
    userTenantId: string | null;

    // Tutti i tenant accessibili dall'utente
    accessibleTenants: TenantInfo[];

    // Tenant selezionati per il filtro (array di ID)
    selectedTenantIds: string[];

    // Se l'utente può vedere più tenant
    hasMultipleTenants: boolean;

    // Se sta caricando i tenant
    loading: boolean;

    // Se il context è pronto (inizializzazione completata)
    isReady: boolean;

    // Errore eventuale
    error: string | null;

    // Metodi
    setSelectedTenantIds: (ids: string[]) => void;
    selectAllTenants: () => void;
    selectOnlyUserTenant: () => void;
    toggleTenant: (tenantId: string) => void;
    refreshTenants: () => Promise<void>;

    // Query params per le API
    // tenantIds è un array, i consumer fanno .join(',') quando necessario
    getTenantFilterParams: () => { tenantIds?: string[]; allTenants?: boolean };

    // Stringa stabile per queryKey (evita re-render)
    tenantFilterKey: string;
}

// Default context
const defaultContext: TenantFilterContextType = {
    userTenantId: null,
    accessibleTenants: [],
    selectedTenantIds: [],
    hasMultipleTenants: false,
    loading: false,
    isReady: false,
    error: null,
    setSelectedTenantIds: () => { },
    selectAllTenants: () => { },
    selectOnlyUserTenant: () => { },
    toggleTenant: () => { },
    refreshTenants: async () => { },
    getTenantFilterParams: () => ({}),
    tenantFilterKey: '',
};

// =====================================================
// CONTEXT
// =====================================================

const TenantFilterContext = createContext<TenantFilterContextType>(defaultContext);

// =====================================================
// PROVIDER
// =====================================================

interface TenantFilterProviderProps {
    children: React.ReactNode;
}

interface MyTenantsResponse {
    success: boolean;
    data: Array<{
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
        accessLevel?: 'FULL' | 'LIMITED' | 'READONLY';
        isPrimary?: boolean;
    }>;
    meta?: {
        total: number;
        features: string[];
    };
}

export const TenantFilterProvider: React.FC<TenantFilterProviderProps> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    // Sincronizzazione con TenantModeContext
    const tenantMode = useTenantModeOptional();

    const [accessibleTenants, setAccessibleTenants] = useState<TenantInfo[]>([]);
    const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    // Tenant dell'utente dal JWT
    const userTenantId = user?.tenantId || null;

    /**
     * Carica i tenant accessibili dall'utente
     */
    const loadAccessibleTenants = useCallback(async () => {
        if (!isAuthenticated) {
            setAccessibleTenants([]);
            setSelectedTenantIds([]);
            setInitialized(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await apiGet<MyTenantsResponse>('/api/v1/person-tenant-access/my-tenants');

            const tenants: TenantInfo[] = (response.data || []).map(t => ({
                id: t.id,
                name: t.name,
                slug: t.slug,
                isActive: t.isActive,
                accessLevel: t.accessLevel,
                isPrimary: t.isPrimary,
            }));

            setAccessibleTenants(tenants);

            // Inizializza selectedTenantIds
            // PRIORITÀ: 
            // 1. Se TenantModeContext ha già viewTenantIds (es. da localStorage), usali
            // 2. Altrimenti, per multi-tenant: tutti i tenant
            // 3. Per single-tenant: solo il proprio tenant
            if (!initialized) {
                // Controlla se TenantModeContext ha già un tenant selezionato (es. reload pagina)
                const modeViewTenantIds = tenantMode?.viewTenantIds;

                if (modeViewTenantIds && modeViewTenantIds.length > 0) {
                    // Usa i tenant dal TenantModeContext (filtrati per quelli accessibili)
                    const validTenantIds = modeViewTenantIds.filter(id =>
                        tenants.some(t => t.id === id)
                    );
                    if (validTenantIds.length > 0) {
                        setSelectedTenantIds(validTenantIds);
                    } else if (tenants.length > 0) {
                        // Fallback: usa tutti i tenant accessibili
                        setSelectedTenantIds(tenants.map(t => t.id));
                    }
                } else if (tenants.length > 1) {
                    // Multi-tenant user senza selezione precedente: default = tutti i tenant accessibili
                    setSelectedTenantIds(tenants.map(t => t.id));
                } else if (userTenantId) {
                    // Single tenant user: default = proprio tenant
                    const userTenantExists = tenants.some(t => t.id === userTenantId);
                    if (userTenantExists) {
                        setSelectedTenantIds([userTenantId]);
                    } else if (tenants.length > 0) {
                        // Fallback: usa il primo tenant disponibile
                        setSelectedTenantIds([tenants[0].id]);
                    }
                }
            }

            setInitialized(true);
        } catch (err) {
            setError('Errore nel caricamento dei tenant');
            setAccessibleTenants([]);
            // P59 FIX: Anche in caso di errore, settiamo initialized=true
            // per permettere ai componenti di procedere con il fallback al tenant dell'utente
            setInitialized(true);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, userTenantId, initialized, tenantMode?.viewTenantIds]);

    // Carica tenant all'autenticazione
    useEffect(() => {
        if (isAuthenticated && !initialized) {
            loadAccessibleTenants();
        }
    }, [isAuthenticated, initialized, loadAccessibleTenants]);

    // Reset quando l'utente cambia
    useEffect(() => {
        if (!isAuthenticated) {
            setAccessibleTenants([]);
            setSelectedTenantIds([]);
            setInitialized(false);
        }
    }, [isAuthenticated]);

    // === SINCRONIZZAZIONE CON TenantModeContext ===
    // Quando l'utente cambia il tenant nel TenantModeSelector,
    // aggiorniamo selectedTenantIds per mantenere coerenza

    // Calcola la chiave stabile per viewTenantIds (evita problemi con array reference)
    const viewTenantIdsKey = tenantMode?.viewTenantIds ? [...tenantMode.viewTenantIds].sort().join(',') : '';

    useEffect(() => {
        if (!tenantMode || !initialized) {
            return;
        }

        const { viewMode, viewTenantIds: contextViewTenantIds } = tenantMode;

        // Se viewTenantIds è vuoto, non fare niente (stato transitorio)
        if (!contextViewTenantIds || contextViewTenantIds.length === 0) {
            return;
        }

        // Sincronizza sempre con viewTenantIds (funziona per entrambi 'all' e 'single')
        setSelectedTenantIds(prev => {
            const prevSorted = [...prev].sort().join(',');
            const newSorted = [...contextViewTenantIds].sort().join(',');
            // Evita aggiornamenti inutili
            if (prevSorted === newSorted) {
                return prev;
            }
            return [...contextViewTenantIds];
        });
    }, [viewTenantIdsKey, initialized]);

    /**
     * Verifica se l'utente ha accesso a più tenant
     */
    const hasMultipleTenants = useMemo(() => {
        return accessibleTenants.length > 1;
    }, [accessibleTenants]);

    /**
     * Stringa stabile per queryKey (evita re-render quando l'array cambia riferimento)
     */
    const tenantFilterKey = useMemo(() => {
        if (!initialized) return '__not_ready__';
        // Usa [...selectedTenantIds] per evitare di modificare l'array originale
        const key = [...selectedTenantIds].sort().join(',') || userTenantId || 'default';
        return key;
    }, [initialized, selectedTenantIds, userTenantId]);

    /**
     * Seleziona tutti i tenant
     */
    const selectAllTenants = useCallback(() => {
        setSelectedTenantIds(accessibleTenants.map(t => t.id));
    }, [accessibleTenants]);

    /**
     * Seleziona solo il tenant dell'utente
     */
    const selectOnlyUserTenant = useCallback(() => {
        if (userTenantId) {
            setSelectedTenantIds([userTenantId]);
        }
    }, [userTenantId]);

    /**
     * Toggle selezione di un tenant
     */
    const toggleTenant = useCallback((tenantId: string) => {
        setSelectedTenantIds(prev => {
            if (prev.includes(tenantId)) {
                // Non permettere di deselezionare tutti
                if (prev.length === 1) return prev;
                return prev.filter(id => id !== tenantId);
            } else {
                return [...prev, tenantId];
            }
        });
    }, []);

    /**
     * Refresh tenants
     */
    const refreshTenants = useCallback(async () => {
        setInitialized(false);
        await loadAccessibleTenants();
    }, [loadAccessibleTenants]);

    /**
     * Genera i parametri per le API in base alla selezione
     */
    const getTenantFilterParams = useCallback(() => {
        // Se non ha più tenant, non serve filtrare
        if (!hasMultipleTenants) {
            return {};
        }

        // Se tutti i tenant sono selezionati
        if (selectedTenantIds.length === accessibleTenants.length) {
            return { allTenants: true };
        }

        // Se solo alcuni tenant sono selezionati
        // Restituisce array - i consumer faranno .join(',') quando necessario
        if (selectedTenantIds.length > 0) {
            return { tenantIds: [...selectedTenantIds] };
        }

        // Fallback: solo il tenant dell'utente
        return {};
    }, [hasMultipleTenants, selectedTenantIds, accessibleTenants.length]);

    // Context value
    const value = useMemo<TenantFilterContextType>(() => ({
        userTenantId,
        accessibleTenants,
        selectedTenantIds,
        hasMultipleTenants,
        loading,
        isReady: initialized && !loading,
        error,
        setSelectedTenantIds,
        selectAllTenants,
        selectOnlyUserTenant,
        toggleTenant,
        refreshTenants,
        getTenantFilterParams,
        tenantFilterKey,
    }), [
        userTenantId,
        accessibleTenants,
        selectedTenantIds,
        hasMultipleTenants,
        loading,
        initialized,
        error,
        selectAllTenants,
        selectOnlyUserTenant,
        toggleTenant,
        refreshTenants,
        getTenantFilterParams,
        tenantFilterKey,
    ]);

    return (
        <TenantFilterContext.Provider value={value}>
            {children}
        </TenantFilterContext.Provider>
    );
};

// =====================================================
// HOOK
// =====================================================

/**
 * Hook per accedere al contesto del filtro tenant
 */
export const useTenantFilter = (): TenantFilterContextType => {
    const context = useContext(TenantFilterContext);
    if (!context) {
        throw new Error('useTenantFilter must be used within a TenantFilterProvider');
    }
    return context;
};

export default TenantFilterContext;
