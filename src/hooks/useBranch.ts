/**
 * useBranch Hook
 * 
 * Hook per gestire la logica dei branch (MEDICA / FORMAZIONE) nel frontend.
 * Si integra con useBrandConfig per determinare automaticamente il branch
 * in base al frontend corrente (dominio/VITE_BRAND_ID).
 * 
 * @module hooks/useBranch
 * @project 45 - Tenant Restructuring Commercial (Opzione 2)
 */

import { useMemo, useCallback } from 'react';
import { useBrandConfig } from './useBrandConfig';
import { useAuth } from './auth/useAuth';

/**
 * Tipi di branch supportati
 * Corrisponde all'enum BranchType nel backend Prisma
 */
export type BranchType = 'MEDICA' | 'FORMAZIONE';

/**
 * Mapping frontend ID -> branch type
 */
const FRONTEND_TO_BRANCH: Record<string, BranchType> = {
    'element-medica': 'MEDICA',
    'element-formazione': 'FORMAZIONE',
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
        color: '#06b6d4', // cyan-500
    },
    FORMAZIONE: {
        id: 'FORMAZIONE',
        name: 'formazione',
        displayName: 'Formazione',
        description: 'Corsi di formazione, sicurezza sul lavoro, attestati',
        icon: 'GraduationCap',
        color: '#0891b2', // cyan-600
    },
};

/**
 * Return type dell'hook useBranch
 */
export interface UseBranchReturn {
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
    getBranchHeader: () => { 'X-Branch-Type': BranchType };

    /** Tutti i branch disponibili nel sistema */
    allBranches: BranchType[];

    /** Configurazione di tutti i branch */
    allBranchConfigs: typeof BRANCH_CONFIGS;
}

/**
 * Hook per gestire la logica dei branch
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentBranch, isMedica, getBranchFilter } = useBranch();
 *   
 *   // currentBranch è determinato automaticamente dal frontend
 *   console.log(currentBranch); // 'MEDICA' o 'FORMAZIONE'
 *   
 *   // Usa il filtro nelle API calls
 *   const params = { ...otherParams, ...getBranchFilter() };
 * }
 * ```
 */
export function useBranch(): UseBranchReturn {
    const brandConfig = useBrandConfig();
    const { user } = useAuth();

    /**
     * Determina il branch corrente dal frontend ID
     */
    const currentBranch = useMemo<BranchType>(() => {
        const frontendId = brandConfig.id;
        return FRONTEND_TO_BRANCH[frontendId] || 'MEDICA';
    }, [brandConfig.id]);

    /**
     * Configurazione del branch corrente
     */
    const branchConfig = useMemo<BranchConfig>(() => {
        return BRANCH_CONFIGS[currentBranch];
    }, [currentBranch]);

    /**
     * Lista dei branch accessibili per l'utente
     * Derivata da PersonTenantAccess.enabledBranches o default
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
     * Verifica helper per branch MEDICA
     */
    const isMedica = useMemo(() => currentBranch === 'MEDICA', [currentBranch]);

    /**
     * Verifica helper per branch FORMAZIONE
     */
    const isFormazione = useMemo(() => currentBranch === 'FORMAZIONE', [currentBranch]);

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
     * Lista di tutti i branch disponibili nel sistema
     */
    const allBranches: BranchType[] = ['MEDICA', 'FORMAZIONE'];

    return {
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
    };
}

/**
 * Hook per verificare se una feature richiede un branch specifico
 * 
 * @example
 * ```tsx
 * function ClinicaPage() {
 *   const { isAllowed, requiredBranch } = useBranchRequired('MEDICA');
 *   
 *   if (!isAllowed) {
 *     return <Redirect to="/unauthorized" />;
 *   }
 *   
 *   return <ClinicaContent />;
 * }
 * ```
 */
export function useBranchRequired(requiredBranch: BranchType) {
    const { currentBranch, canAccessBranch } = useBranch();

    const isAllowed = useMemo(() => {
        // Il branch corrente deve corrispondere E l'utente deve avere accesso
        return currentBranch === requiredBranch && canAccessBranch(requiredBranch);
    }, [currentBranch, requiredBranch, canAccessBranch]);

    return {
        isAllowed,
        requiredBranch,
        currentBranch,
        mismatch: currentBranch !== requiredBranch,
    };
}

/**
 * Hook per ottenere la configurazione branch-specific per le API
 * Utile per passare automaticamente branchType a tutte le API calls
 * 
 * @example
 * ```tsx
 * function usePrestazioni() {
 *   const { branchParams, branchHeaders } = useBranchApi();
 *   
 *   return useQuery({
 *     queryFn: () => api.get('/clinica/prestazioni', { 
 *       params: { ...params, ...branchParams },
 *       headers: branchHeaders,
 *     }),
 *   });
 * }
 * ```
 */
export function useBranchApi() {
    const { currentBranch, getBranchFilter, getBranchHeader } = useBranch();

    return {
        branchType: currentBranch,
        branchParams: getBranchFilter(),
        branchHeaders: getBranchHeader(),
    };
}

export default useBranch;
