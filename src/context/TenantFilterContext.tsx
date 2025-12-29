/**
 * TenantFilterContext
 * 
 * Context globale per la gestione del filtro tenant nelle pagine.
 * Permette agli utenti con accesso multi-tenant di filtrare le entità
 * per uno o più tenant selezionati.
 * 
 * Logica:
 * - Utenti normali: vedono solo le entità del proprio tenant (nessun filtro UI)
 * - Utenti con più tenant: vedono dropdown multi-select per filtrare
 * - Admin globali: vedono tutti i tenant disponibili
 * 
 * @module context/TenantFilterContext
 * @project 43 - Tenant Roles Management System
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
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

            console.log('🏢 TenantFilterContext: Loading accessible tenants...');

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
            // Per utenti con accesso multi-tenant (es. ADMIN): default TUTTI i tenant
            // Per utenti singolo tenant: solo il proprio tenant
            if (!initialized) {
                if (tenants.length > 1) {
                    // Multi-tenant user: default = tutti i tenant accessibili
                    console.log('🏢 TenantFilterContext: Multi-tenant user, defaulting to ALL tenants');
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

            console.log('✅ TenantFilterContext: Loaded', tenants.length, 'tenants');
        } catch (err) {
            console.error('❌ TenantFilterContext: Error loading tenants:', err);
            setError('Errore nel caricamento dei tenant');
            setAccessibleTenants([]);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, userTenantId, initialized]);

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
        return selectedTenantIds.sort().join(',') || userTenantId || 'default';
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
        if (selectedTenantIds.length > 0) {
            return { tenantIds: selectedTenantIds };
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
