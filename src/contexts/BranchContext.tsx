/**
 * BranchContext
 * 
 * Context React per la gestione centralizzata dei branch (MEDICA / FORMAZIONE).
 * Fornisce accesso globale allo stato del branch corrente e funzionalità correlate.
 * 
 * @module contexts/BranchContext
 * @project 45 - Tenant Restructuring Commercial (Opzione 2)
 */

import React, { createContext, useContext, useMemo, useCallback, type ReactNode } from 'react';
import { useBrandConfig } from '../hooks/useBrandConfig';
import { useAuth } from '../hooks/auth/useAuth';

/**
 * Tipi di branch supportati
 */
export type BranchType = 'MEDICA' | 'FORMAZIONE';

/**
 * Mapping frontend ID -> branch type
 */
const FRONTEND_TO_BRANCH: Record<string, BranchType> = {
    'element-medica': 'MEDICA',
    'element-sicurezza': 'FORMAZIONE',
};

/**
 * Configurazione branch
 */
export interface BranchConfig {
    id: BranchType;
    name: string;
    displayName: string;
    description: string;
    icon: string;
    color: string;
}

/**
 * Configurazione dei branch disponibili
 */
export const BRANCH_CONFIGS: Record<BranchType, BranchConfig> = {
    MEDICA: {
        id: 'MEDICA',
        name: 'medica',
        displayName: 'Medica',
        description: 'Poliambulatorio, visite specialistiche, prestazioni mediche',
        icon: 'Stethoscope',
        color: '#06b6d4',
    },
    FORMAZIONE: {
        id: 'FORMAZIONE',
        name: 'formazione',
        displayName: 'Formazione',
        description: 'Corsi di formazione, sicurezza sul lavoro, attestati',
        icon: 'GraduationCap',
        color: '#0891b2',
    },
};

/**
 * Tipo del context
 */
export interface BranchContextValue {
    /** Branch corrente determinato dal frontend */
    currentBranch: BranchType;

    /** Configurazione del branch corrente */
    branchConfig: BranchConfig;

    /** Lista dei branch accessibili per l'utente */
    accessibleBranches: BranchType[];

    /** Verifica se l'utente può accedere a un branch specifico */
    canAccessBranch: (branch: BranchType) => boolean;

    /** Verifica se il branch corrente è MEDICA */
    isMedica: boolean;

    /** Verifica se il branch corrente è FORMAZIONE */
    isFormazione: boolean;

    /** Ottiene il filtro branchType per le API calls */
    getBranchFilter: () => { branchType: BranchType };

    /** Ottiene l'header X-Branch-Type per le API calls */
    getBranchHeader: () => Record<string, string>;

    /** Tutti i branch disponibili nel sistema */
    allBranches: BranchType[];

    /** Configurazione di tutti i branch */
    allBranchConfigs: typeof BRANCH_CONFIGS;
}

/**
 * Context per i branch
 */
const BranchContext = createContext<BranchContextValue | null>(null);

/**
 * Props del provider
 */
interface BranchProviderProps {
    children: ReactNode;
    /** Override manuale del branch (per testing) */
    forceBranch?: BranchType;
}

/**
 * BranchProvider
 * 
 * Provider per il context dei branch. Wrappa l'applicazione per fornire
 * accesso globale allo stato del branch corrente.
 * 
 * @example
 * ```tsx
 * // In App.tsx
 * function App() {
 *   return (
 *     <BranchProvider>
 *       <Router>
 *         <Routes />
 *       </Router>
 *     </BranchProvider>
 *   );
 * }
 * ```
 */
export function BranchProvider({ children, forceBranch }: BranchProviderProps) {
    const brandConfig = useBrandConfig();
    const { user } = useAuth();

    /**
     * Determina il branch corrente
     */
    const currentBranch = useMemo<BranchType>(() => {
        // Override manuale (per testing)
        if (forceBranch) {
            return forceBranch;
        }

        const frontendId = brandConfig.id;
        return FRONTEND_TO_BRANCH[frontendId] || 'MEDICA';
    }, [brandConfig.id, forceBranch]);

    /**
     * Configurazione del branch corrente
     */
    const branchConfig = useMemo<BranchConfig>(() => {
        return BRANCH_CONFIGS[currentBranch];
    }, [currentBranch]);

    /**
     * Lista dei branch accessibili per l'utente
     */
    const accessibleBranches = useMemo<BranchType[]>(() => {
        // Se l'utente ha enabledBranches configurato, usalo
        // @ts-expect-error - enabledBranches potrebbe non essere nel tipo User ancora
        if (user?.enabledBranches && Array.isArray(user.enabledBranches)) {
            // @ts-expect-error - enabledBranches potrebbe non essere nel tipo User ancora
            return user.enabledBranches as BranchType[];
        }

        // Se l'utente è admin globale, ha accesso a tutti i branch
        if (user?.globalRole === 'ADMIN') {
            return ['MEDICA', 'FORMAZIONE'];
        }

        // Default: solo il branch del frontend corrente
        return [currentBranch];
    }, [user, currentBranch]);

    /**
     * Verifica se l'utente può accedere a un branch specifico
     */
    const canAccessBranch = useCallback((branch: BranchType): boolean => {
        return accessibleBranches.includes(branch);
    }, [accessibleBranches]);

    /**
     * Helper per branch MEDICA
     */
    const isMedica = currentBranch === 'MEDICA';

    /**
     * Helper per branch FORMAZIONE
     */
    const isFormazione = currentBranch === 'FORMAZIONE';

    /**
     * Ottiene il filtro branchType per le query API
     */
    const getBranchFilter = useCallback(() => ({
        branchType: currentBranch,
    }), [currentBranch]);

    /**
     * Ottiene l'header X-Branch-Type per le API calls
     */
    const getBranchHeader = useCallback(() => ({
        'X-Branch-Type': currentBranch,
    }), [currentBranch]);

    /**
     * Lista di tutti i branch disponibili
     */
    const allBranches: BranchType[] = ['MEDICA', 'FORMAZIONE'];

    /**
     * Valore del context
     */
    const contextValue = useMemo<BranchContextValue>(() => ({
        currentBranch,
        branchConfig,
        accessibleBranches,
        canAccessBranch,
        isMedica,
        isFormazione,
        getBranchFilter,
        getBranchHeader,
        allBranches,
        allBranchConfigs: BRANCH_CONFIGS,
    }), [
        currentBranch,
        branchConfig,
        accessibleBranches,
        canAccessBranch,
        isMedica,
        isFormazione,
        getBranchFilter,
        getBranchHeader,
    ]);

    return (
        <BranchContext.Provider value={contextValue}>
            {children}
        </BranchContext.Provider>
    );
}

/**
 * Hook per accedere al BranchContext
 * 
 * @throws Error se usato fuori dal BranchProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentBranch, isMedica } = useBranchContext();
 *   
 *   return (
 *     <div>
 *       Branch corrente: {currentBranch}
 *       {isMedica && <MedicaSpecificContent />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBranchContext(): BranchContextValue {
    const context = useContext(BranchContext);

    if (!context) {
        throw new Error(
            'useBranchContext must be used within a BranchProvider. ' +
            'Wrap your app with <BranchProvider> to fix this error.'
        );
    }

    return context;
}

/**
 * Hook opzionale che non lancia errore se fuori dal provider
 * Utile per componenti che possono funzionare sia dentro che fuori dal provider
 */
export function useBranchContextOptional(): BranchContextValue | null {
    return useContext(BranchContext);
}

export default BranchContext;
