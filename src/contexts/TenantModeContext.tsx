/**
 * TenantModeContext
 * 
 * Context React per la gestione della modalità di visualizzazione e operazione
 * in ambiente multi-tenant. Separa la logica di VIEW (quali dati vedere) dalla
 * logica di OPERATE (su quale tenant eseguire operazioni CRUD).
 * 
 * SICUREZZA: Previene la creazione accidentale di dati nel tenant sbagliato
 * distinguendo esplicitamente tra:
 * - viewMode: 'all' | 'single' → cosa l'utente sta VISUALIZZANDO
 * - operateTenantId: string → su quale tenant l'utente sta OPERANDO (CRUD)
 * 
 * NOTA: Il tenant viene SEMPRE dal JWT dell'utente (req.person.tenantId).
 * Il brand (VITE_BRAND_ID) determina solo la UI (logo, colori, menu), NON i dati.
 * 
 * @module contexts/TenantModeContext
 * @project 45 - Tenant Restructuring Commercial (Fase 8)
 * @project 63 - Codebase Cleanup (removed P62 brand sync)
 * @gdpr Audit trail per cambio tenant operativo
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
    useEffect,
    useRef,
    type ReactNode,
} from 'react';
import { useTenantAccess, type AccessibleTenant } from '../hooks/useTenantAccess';
import { useAuth } from '../hooks/auth/useAuth';


// ============================================
// TYPES
// ============================================

/**
 * Modalità di visualizzazione
 */
export type ViewMode = 'all' | 'single';

/**
 * Stato del context TenantMode
 */
export interface TenantModeContextValue {
    // === View Mode (Visualizzazione) ===
    /** Modalità corrente: 'all' per tutti i tenant, 'single' per uno specifico */
    viewMode: ViewMode;

    /** Lista dei tenant attualmente visualizzati */
    viewTenantIds: string[];

    /** Tenant singolo visualizzato (se viewMode === 'single') */
    viewTenant: AccessibleTenant | null;

    // === Operate Mode (Operazioni CRUD) ===
    /** ID del tenant su cui eseguire operazioni CRUD */
    operateTenantId: string | null;

    /** Tenant su cui eseguire operazioni CRUD */
    operateTenant: AccessibleTenant | null;

    // === Computed Properties ===
    /** True se le operazioni CRUD sono abilitate (viewMode='single' e tenant corrisponde) */
    canPerformCRUD: boolean;

    /** True se l'utente ha accesso a più tenant */
    hasMultipleTenants: boolean;

    /** Messaggio di avviso se c'è mismatch tra view e operate */
    warningMessage: string | null;

    /** Lista dei tenant accessibili */
    accessibleTenants: AccessibleTenant[];

    /** Loading state */
    loading: boolean;

    // === Actions ===
    /** Imposta la modalità di visualizzazione */
    setViewMode: (mode: ViewMode, tenantId?: string) => void;

    /** Imposta il tenant per le operazioni CRUD */
    setOperateTenant: (tenantId: string) => void;

    /** Reset a modalità singola (operateTenant) */
    resetToSingleMode: () => void;

    /** Sincronizza view e operate sullo stesso tenant */
    syncViewAndOperate: () => void;

    // === API Helpers ===
    /** Ottiene i parametri query per le API GET (filtro tenant) */
    getViewQueryParams: () => { tenantIds?: string[]; tenantId?: string };

    /** Ottiene l'header per le operazioni CRUD */
    getOperateHeaders: () => Record<string, string>;

    /** Ottiene il tenantId da usare nelle operazioni CREATE */
    getCreateTenantId: () => string | null;
}

// ============================================
// CONTEXT
// ============================================

const TenantModeContext = createContext<TenantModeContextValue | null>(null);

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
    VIEW_MODE: 'tenantMode.viewMode',
    VIEW_TENANT_ID: 'tenantMode.viewTenantId',
    OPERATE_TENANT_ID: 'tenantMode.operateTenantId',
} as const;

// ============================================
// PROVIDER
// ============================================

interface TenantModeProviderProps {
    children: ReactNode;
}

/**
 * TenantModeProvider
 * 
 * Provider per il context TenantMode. Gestisce lo stato della modalità
 * di visualizzazione e operazione multi-tenant.
 * 
 * @example
 * ```tsx
 * // In App.tsx
 * <AuthProvider>
 *   <TenantModeProvider>
 *     <BranchProvider>
 *       <App />
 *     </BranchProvider>
 *   </TenantModeProvider>
 * </AuthProvider>
 * ```
 */
export function TenantModeProvider({ children }: TenantModeProviderProps) {
    const { isAuthenticated } = useAuth();
    const {
        accessibleTenants,
        currentTenant,
        currentTenantId,
        switchTenant,
        loading: tenantsLoading,
        hasMultipleTenants,
    } = useTenantAccess();

    // === State ===
    const [viewMode, setViewModeState] = useState<ViewMode>('single');
    const [viewTenantId, setViewTenantId] = useState<string | null>(null);
    const [operateTenantId, setOperateTenantIdState] = useState<string | null>(null);

    // === Initialize from localStorage ===
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const storedViewMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE) as ViewMode;
            const storedViewTenantId = localStorage.getItem(STORAGE_KEYS.VIEW_TENANT_ID);
            const storedOperateTenantId = localStorage.getItem(STORAGE_KEYS.OPERATE_TENANT_ID);

            if (storedViewMode === 'all' || storedViewMode === 'single') {
                setViewModeState(storedViewMode);
            }
            if (storedViewTenantId) {
                setViewTenantId(storedViewTenantId);
            }
            if (storedOperateTenantId) {
                setOperateTenantIdState(storedOperateTenantId);
            }
        } catch { /* ignore localStorage errors */ }
    }, []);

    // === Sync with currentTenant when available ===
    // Usa refs per evitare il loop infinito
    const operateTenantIdRef = useRef(operateTenantId);
    const viewTenantIdRef = useRef(viewTenantId);
    const viewModeRef = useRef(viewMode);

    // Aggiorna i refs quando cambiano i valori
    useEffect(() => {
        operateTenantIdRef.current = operateTenantId;
    }, [operateTenantId]);

    useEffect(() => {
        viewTenantIdRef.current = viewTenantId;
    }, [viewTenantId]);

    useEffect(() => {
        viewModeRef.current = viewMode;
    }, [viewMode]);

    // Effetto di sincronizzazione - dipende SOLO da currentTenant
    useEffect(() => {
        if (!currentTenant) return;

        // In modalità single, operateTenantId deve seguire il tenant corrente
        // (quando l'utente cambia tenant via TenantSelector, sia operateTenantId che viewTenantId devono aggiornarsi)
        if (!operateTenantIdRef.current || (viewModeRef.current === 'single' && operateTenantIdRef.current !== currentTenant.id)) {
            setOperateTenantIdState(currentTenant.id);
            try {
                localStorage.setItem(STORAGE_KEYS.OPERATE_TENANT_ID, currentTenant.id);
            } catch { /* ignore */ }
        }

        // Se non c'è viewTenantId in modalità single, o è diverso dal tenant corrente, usa il tenant corrente
        if (viewModeRef.current === 'single' && (!viewTenantIdRef.current || viewTenantIdRef.current !== currentTenant.id)) {
            setViewTenantId(currentTenant.id);
            try {
                localStorage.setItem(STORAGE_KEYS.VIEW_TENANT_ID, currentTenant.id);
            } catch { /* ignore */ }
        }
    }, [currentTenant]); // SOLO currentTenant come dipendenza

    // === Computed Values ===

    /** Lista dei tenant IDs visualizzati */
    const viewTenantIds = useMemo(() => {
        return viewMode === 'all'
            ? accessibleTenants.map(t => t.id)
            : viewTenantId ? [viewTenantId] : [];
    }, [viewMode, viewTenantId, accessibleTenants]);

    /** Tenant singolo visualizzato */
    const viewTenant = useMemo(() => {
        if (viewMode === 'all') return null;
        return accessibleTenants.find(t => t.id === viewTenantId) || null;
    }, [viewMode, viewTenantId, accessibleTenants]);

    /** Tenant operativo */
    const operateTenant = useMemo(() => {
        return accessibleTenants.find(t => t.id === operateTenantId) || null;
    }, [operateTenantId, accessibleTenants]);

    /** Verifica se CRUD è abilitato */
    const canPerformCRUD = useMemo(() => {
        // CRUD disabilitato se:
        // 1. Non c'è operateTenantId
        // 2. viewMode è 'all' (stai visualizzando tutti i tenant)
        if (!operateTenantId) return false;
        if (viewMode === 'all') return false;

        // CRUD abilitato solo se stai visualizzando lo stesso tenant su cui operi
        return viewTenantId === operateTenantId;
    }, [operateTenantId, viewMode, viewTenantId]);

    /** Messaggio di avviso */
    const warningMessage = useMemo(() => {
        if (!hasMultipleTenants) return null;

        if (viewMode === 'all') {
            return 'Stai visualizzando tutti i tenant. Le operazioni di creazione/modifica sono disabilitate. Seleziona un tenant specifico per abilitarle.';
        }

        if (viewTenantId && operateTenantId && viewTenantId !== operateTenantId) {
            const viewName = accessibleTenants.find(t => t.id === viewTenantId)?.name || 'Sconosciuto';
            const operateName = accessibleTenants.find(t => t.id === operateTenantId)?.name || 'Sconosciuto';
            return `Attenzione: Stai visualizzando "${viewName}" ma le operazioni verranno eseguite su "${operateName}".`;
        }

        return null;
    }, [viewMode, viewTenantId, operateTenantId, hasMultipleTenants, accessibleTenants]);

    // === Actions ===

    /** Imposta modalità di visualizzazione */
    const setViewMode = useCallback((mode: ViewMode, tenantId?: string) => {
        setViewModeState(mode);

        if (mode === 'single' && tenantId) {
            setViewTenantId(tenantId);
            // Sincronizza anche l'operateTenant per comodità
            setOperateTenantIdState(tenantId);

            // Sincronizza anche il tenant auth/RBAC per aggiornare ruoli e sidebar tenant-scoped
            if (tenantId !== currentTenantId) {
                void switchTenant(tenantId);
            }

            try {
                localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
                localStorage.setItem(STORAGE_KEYS.VIEW_TENANT_ID, tenantId);
                localStorage.setItem(STORAGE_KEYS.OPERATE_TENANT_ID, tenantId);
            } catch { /* ignore */ }
        } else if (mode === 'all') {
            try {
                localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
            } catch { /* ignore */ }
        }

    }, [currentTenantId, switchTenant]);

    /** Imposta tenant operativo */
    const setOperateTenant = useCallback((tenantId: string) => {
        // Verifica che il tenant sia accessibile
        const tenant = accessibleTenants.find(t => t.id === tenantId);
        if (!tenant) return; // Tenant non accessibile, ignora silenziosamente

        setOperateTenantIdState(tenantId);

        // Aggiorna anche il tenant auth/RBAC corrente
        if (tenantId !== currentTenantId) {
            void switchTenant(tenantId);
        }

        try {
            localStorage.setItem(STORAGE_KEYS.OPERATE_TENANT_ID, tenantId);
        } catch { /* ignore */ }
    }, [accessibleTenants, currentTenantId, switchTenant]);

    /** Reset a modalità singola */
    const resetToSingleMode = useCallback(() => {
        if (operateTenantId) {
            setViewMode('single', operateTenantId);
        }
    }, [operateTenantId, setViewMode]);

    /** Sincronizza view e operate */
    const syncViewAndOperate = useCallback(() => {
        if (viewMode === 'single' && viewTenantId) {
            setOperateTenant(viewTenantId);
        }
    }, [viewMode, viewTenantId, setOperateTenant]);

    // === API Helpers ===

    /** Query params per GET */
    const getViewQueryParams = useCallback(() => {
        if (viewMode === 'all') {
            return { tenantIds: viewTenantIds };
        }
        return viewTenantId ? { tenantId: viewTenantId } : {};
    }, [viewMode, viewTenantIds, viewTenantId]);

    /** Headers per operazioni CRUD */
    const getOperateHeaders = useCallback((): Record<string, string> => {
        if (!operateTenantId) return {};
        return {
            'X-Operate-Tenant-Id': operateTenantId,
        };
    }, [operateTenantId]);

    /** TenantId per CREATE */
    const getCreateTenantId = useCallback(() => {
        return canPerformCRUD ? operateTenantId : null;
    }, [canPerformCRUD, operateTenantId]);

    // === Context Value ===

    const contextValue = useMemo<TenantModeContextValue>(() => ({
        // View Mode
        viewMode,
        viewTenantIds,
        viewTenant,

        // Operate Mode
        operateTenantId,
        operateTenant,

        // Computed
        canPerformCRUD,
        hasMultipleTenants,
        warningMessage,
        accessibleTenants,
        loading: tenantsLoading,

        // Actions
        setViewMode,
        setOperateTenant,
        resetToSingleMode,
        syncViewAndOperate,

        // API Helpers
        getViewQueryParams,
        getOperateHeaders,
        getCreateTenantId,
    }), [
        viewMode,
        viewTenantIds,
        viewTenant,
        operateTenantId,
        operateTenant,
        canPerformCRUD,
        hasMultipleTenants,
        warningMessage,
        accessibleTenants,
        tenantsLoading,
        setViewMode,
        setOperateTenant,
        resetToSingleMode,
        syncViewAndOperate,
        getViewQueryParams,
        getOperateHeaders,
        getCreateTenantId,
    ]);

    // Non renderizzare se non autenticato
    if (!isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <TenantModeContext.Provider value={contextValue}>
            {children}
        </TenantModeContext.Provider>
    );
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook per accedere al TenantModeContext
 * 
 * @throws Error se usato fuori dal TenantModeProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { 
 *     viewMode, 
 *     canPerformCRUD, 
 *     setViewMode,
 *     warningMessage 
 *   } = useTenantMode();
 *   
 *   return (
 *     <div>
 *       {warningMessage && <Alert>{warningMessage}</Alert>}
 *       <button disabled={!canPerformCRUD}>Crea Nuovo</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTenantMode(): TenantModeContextValue {
    const context = useContext(TenantModeContext);

    if (!context) {
        throw new Error(
            'useTenantMode must be used within a TenantModeProvider. ' +
            'Wrap your app with <TenantModeProvider> to fix this error.'
        );
    }

    return context;
}

/**
 * Hook opzionale che non lancia errore se fuori dal provider
 */
export function useTenantModeOptional(): TenantModeContextValue | null {
    return useContext(TenantModeContext);
}

/**
 * Hook helper per controllare se CRUD è abilitato
 */
export function useCanPerformCRUD(): boolean {
    const context = useTenantModeOptional();
    // Se non c'è il context (utente single-tenant), CRUD è sempre abilitato
    return context?.canPerformCRUD ?? true;
}

/**
 * Hook helper per ottenere il messaggio di warning
 */
export function useTenantModeWarning(): string | null {
    const context = useTenantModeOptional();
    return context?.warningMessage ?? null;
}

export default TenantModeContext;
