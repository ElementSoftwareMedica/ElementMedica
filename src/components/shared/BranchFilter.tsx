/**
 * BranchFilter Component
 * 
 * Componente per filtrare le liste di dati per branch (MEDICA / FORMAZIONE).
 * Usato nelle pagine di lista per permettere agli admin di vedere tutti i branch
 * o filtrare per un branch specifico.
 * 
 * @module components/shared/BranchFilter
 * @project 45 - Tenant Restructuring Commercial (Opzione 2)
 */

import React from 'react';
import { useBranchContext, type BranchType, BRANCH_CONFIGS } from '../../contexts/BranchContext';
import {
    Stethoscope,
    GraduationCap,
    Filter,
    X
} from 'lucide-react';

interface BranchFilterProps {
    /** Branch attualmente selezionato (null = tutti) */
    selectedBranch: BranchType | null;
    /** Callback quando si cambia branch */
    onBranchChange: (branch: BranchType | null) => void;
    /** Mostra opzione "Tutti" */
    showAllOption?: boolean;
    /** Classi CSS aggiuntive */
    className?: string;
    /** Layout del filtro */
    variant?: 'buttons' | 'dropdown' | 'pills';
    /** Dimensione */
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Icone per ogni branch
 */
const BRANCH_ICONS: Record<BranchType, React.ComponentType<{ className?: string }>> = {
    MEDICA: Stethoscope,
    FORMAZIONE: GraduationCap,
};

/**
 * BranchFilter Component
 * 
 * Permette di filtrare i dati per branch. Visibile solo per utenti
 * che hanno accesso a più branch.
 * 
 * @example
 * ```tsx
 * const [branch, setBranch] = useState<BranchType | null>(null);
 * 
 * <BranchFilter
 *   selectedBranch={branch}
 *   onBranchChange={setBranch}
 *   showAllOption
 * />
 * ```
 */
export function BranchFilter({
    selectedBranch,
    onBranchChange,
    showAllOption = true,
    className = '',
    variant = 'pills',
    size = 'md',
}: BranchFilterProps) {
    const { accessibleBranches, currentBranch } = useBranchContext();

    // Se l'utente ha accesso a un solo branch, non mostrare il filtro
    if (accessibleBranches.length <= 1) {
        return null;
    }

    const sizeClasses = {
        sm: { button: 'px-2 py-1 text-xs', icon: 'w-3 h-3' },
        md: { button: 'px-3 py-1.5 text-sm', icon: 'w-4 h-4' },
        lg: { button: 'px-4 py-2 text-base', icon: 'w-5 h-5' },
    };

    const s = sizeClasses[size];

    if (variant === 'pills') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Filter className={`${s.icon} text-gray-400`} />

                {showAllOption && (
                    <button
                        onClick={() => onBranchChange(null)}
                        className={`
              ${s.button} rounded-full font-medium transition-all duration-200
              ${selectedBranch === null
                                ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                            }
            `}
                    >
                        Tutti
                    </button>
                )}

                {accessibleBranches.map((branch) => {
                    const Icon = BRANCH_ICONS[branch];
                    const config = BRANCH_CONFIGS[branch];
                    const isSelected = selectedBranch === branch;

                    return (
                        <button
                            key={branch}
                            onClick={() => onBranchChange(branch)}
                            className={`
                ${s.button} rounded-full font-medium transition-all duration-200
                inline-flex items-center gap-1.5
                ${isSelected
                                    ? branch === 'MEDICA'
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }
              `}
                        >
                            <Icon className={s.icon} />
                            <span>{config.displayName}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    if (variant === 'buttons') {
        return (
            <div className={`inline-flex rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
                {showAllOption && (
                    <button
                        onClick={() => onBranchChange(null)}
                        className={`
              ${s.button} font-medium transition-all duration-200
              border-r border-gray-200 dark:border-gray-700
              ${selectedBranch === null
                                ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }
            `}
                    >
                        Tutti
                    </button>
                )}

                {accessibleBranches.map((branch, index) => {
                    const Icon = BRANCH_ICONS[branch];
                    const config = BRANCH_CONFIGS[branch];
                    const isSelected = selectedBranch === branch;
                    const isLast = index === accessibleBranches.length - 1;

                    return (
                        <button
                            key={branch}
                            onClick={() => onBranchChange(branch)}
                            className={`
                ${s.button} font-medium transition-all duration-200
                inline-flex items-center gap-1.5
                ${!isLast ? 'border-r border-gray-200 dark:border-gray-700' : ''}
                ${isSelected
                                    ? branch === 'MEDICA'
                                        ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                }
              `}
                        >
                            <Icon className={s.icon} />
                            <span>{config.displayName}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    // dropdown variant
    return (
        <div className={`relative inline-block ${className}`}>
            <select
                value={selectedBranch || ''}
                onChange={(e) => onBranchChange(e.target.value as BranchType || null)}
                className={`
          ${s.button} rounded-lg font-medium
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          text-gray-700 dark:text-gray-300
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          cursor-pointer
        `}
            >
                {showAllOption && <option value="">Tutti i Branch</option>}
                {accessibleBranches.map((branch) => (
                    <option key={branch} value={branch}>
                        {BRANCH_CONFIGS[branch].displayName}
                    </option>
                ))}
            </select>
        </div>
    );
}

/**
 * BranchFilterChip Component
 * 
 * Chip che mostra il filtro branch attivo con opzione di rimuoverlo.
 * 
 * @example
 * ```tsx
 * {selectedBranch && (
 *   <BranchFilterChip
 *     branch={selectedBranch}
 *     onRemove={() => setSelectedBranch(null)}
 *   />
 * )}
 * ```
 */
export function BranchFilterChip({
    branch,
    onRemove,
    className = '',
}: {
    branch: BranchType;
    onRemove: () => void;
    className?: string;
}) {
    const Icon = BRANCH_ICONS[branch];
    const config = BRANCH_CONFIGS[branch];

    return (
        <div
            className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
        text-sm font-medium
        ${branch === 'MEDICA'
                    ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                }
        ${className}
      `}
        >
            <Icon className="w-4 h-4" />
            <span>{config.displayName}</span>
            <button
                onClick={onRemove}
                className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    );
}

/**
 * useBranchFilterState Hook
 * 
 * Hook per gestire lo stato del filtro branch con supporto per URL params.
 * 
 * @example
 * ```tsx
 * const { branchFilter, setBranchFilter, branchQueryParam } = useBranchFilterState();
 * 
 * // Usa branchQueryParam nelle API calls
 * const data = await api.getEntities({ branchType: branchQueryParam });
 * ```
 */
export function useBranchFilterState(defaultBranch: BranchType | null = null) {
    const { currentBranch, accessibleBranches } = useBranchContext();
    const [selectedBranch, setSelectedBranch] = React.useState<BranchType | null>(defaultBranch);

    // Se l'utente ha accesso a un solo branch, usa sempre quello
    const effectiveBranch = accessibleBranches.length === 1
        ? accessibleBranches[0]
        : selectedBranch;

    return {
        /** Branch attualmente selezionato nel filtro */
        branchFilter: selectedBranch,
        /** Funzione per cambiare il filtro */
        setBranchFilter: setSelectedBranch,
        /** Branch effettivo da usare nelle query (null = tutti, se multi-branch) */
        branchQueryParam: effectiveBranch,
        /** Se mostrare il filtro branch */
        showBranchFilter: accessibleBranches.length > 1,
        /** Branch del frontend corrente */
        currentBranch,
        /** Lista branch accessibili */
        accessibleBranches,
    };
}

export default BranchFilter;
