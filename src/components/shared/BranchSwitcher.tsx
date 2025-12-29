/**
 * BranchSwitcher Component
 * 
 * Componente per indicare e switchare tra branch (MEDICA / FORMAZIONE).
 * Visibile solo per admin che hanno accesso a più branch.
 * 
 * @module components/shared/BranchSwitcher
 * @project 45 - Tenant Restructuring Commercial (Opzione 2)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useBranchContext, type BranchType, BRANCH_CONFIGS } from '../../contexts/BranchContext';
import {
    Stethoscope,
    GraduationCap,
    ChevronDown,
    Check,
    Building2
} from 'lucide-react';

interface BranchSwitcherProps {
    /** Modalità collapsed (solo icona) */
    collapsed?: boolean;
    /** Classi CSS aggiuntive */
    className?: string;
    /** Mostra solo indicatore senza dropdown */
    indicatorOnly?: boolean;
}

/**
 * Icone per ogni branch
 */
const BRANCH_ICONS: Record<BranchType, React.ComponentType<{ className?: string }>> = {
    MEDICA: Stethoscope,
    FORMAZIONE: GraduationCap,
};

/**
 * Colori per ogni branch
 */
const BRANCH_COLORS: Record<BranchType, { bg: string; text: string; border: string; hover: string }> = {
    MEDICA: {
        bg: 'bg-cyan-100 dark:bg-cyan-900/30',
        text: 'text-cyan-700 dark:text-cyan-300',
        border: 'border-cyan-200 dark:border-cyan-800',
        hover: 'hover:bg-cyan-50 dark:hover:bg-cyan-900/50',
    },
    FORMAZIONE: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/50',
    },
};

/**
 * BranchSwitcher Component
 * 
 * Mostra il branch corrente e permette di switchare (se disponibile).
 * Il branch è determinato dal frontend/dominio, non dall'utente.
 * 
 * @example
 * ```tsx
 * // Nella sidebar
 * <BranchSwitcher collapsed={sidebarCollapsed} />
 * 
 * // Solo indicatore
 * <BranchSwitcher indicatorOnly />
 * ```
 */
export function BranchSwitcher({
    collapsed = false,
    className = '',
    indicatorOnly = false,
}: BranchSwitcherProps) {
    const { currentBranch, branchConfig, accessibleBranches, isMedica, isFormazione } = useBranchContext();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const CurrentIcon = BRANCH_ICONS[currentBranch];
    const colors = BRANCH_COLORS[currentBranch];

    // Chiudi dropdown quando si clicca fuori
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Se l'utente ha accesso a un solo branch, non mostrare nulla
    // (il branch è già determinato dal frontend)
    if (accessibleBranches.length <= 1 && indicatorOnly) {
        return null;
    }

    /**
     * Gestisce il click su un branch nel dropdown
     * Nota: Il branch è determinato dal dominio, quindi questo redirect 
     * all'altro dominio frontend
     */
    const handleBranchSelect = (branch: BranchType) => {
        setIsOpen(false);

        // Il branch è determinato dal frontend, non dallo switch
        // Redirect all'altro frontend
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const currentPort = parseInt(window.location.port, 10) || 80;

        if (branch === 'MEDICA' && isFormazione) {
            // Vai a Element Medica (porta 5174 in dev, o dominio in prod)
            const newPort = currentPort === 5173 ? 5174 : currentPort;
            window.location.href = `${protocol}//${hostname}:${newPort}/dashboard`;
        } else if (branch === 'FORMAZIONE' && isMedica) {
            // Vai a Element Formazione (porta 5173 in dev, o dominio in prod)
            const newPort = currentPort === 5174 ? 5173 : currentPort;
            window.location.href = `${protocol}//${hostname}:${newPort}/dashboard`;
        }
    };

    // Solo indicatore (senza dropdown)
    if (indicatorOnly) {
        return (
            <div
                className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
          ${colors.bg} ${colors.text} ${colors.border} border
          ${className}
        `}
                title={branchConfig.description}
            >
                <CurrentIcon className="w-4 h-4" />
                <span>{branchConfig.displayName}</span>
            </div>
        );
    }

    // Versione collapsed (solo icona)
    if (collapsed) {
        return (
            <div
                className={`
          flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer
          ${colors.bg} ${colors.text} ${colors.hover}
          transition-colors duration-200
          ${className}
        `}
                title={`Branch: ${branchConfig.displayName}`}
            >
                <CurrentIcon className="w-5 h-5" />
            </div>
        );
    }

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
          ${colors.bg} ${colors.text} ${colors.hover}
          border ${colors.border}
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500
        `}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <div className={`
          flex items-center justify-center w-8 h-8 rounded-md
          ${isMedica ? 'bg-cyan-200 dark:bg-cyan-800' : 'bg-blue-200 dark:bg-blue-800'}
        `}>
                    <CurrentIcon className="w-4 h-4" />
                </div>

                <div className="flex-1 text-left">
                    <div className="text-sm font-semibold">{branchConfig.displayName}</div>
                    <div className="text-xs opacity-75">Branch Attivo</div>
                </div>

                {accessibleBranches.length > 1 && (
                    <ChevronDown className={`
            w-4 h-4 transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
          `} />
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && accessibleBranches.length > 1 && (
                <div className="
          absolute top-full left-0 right-0 mt-1 z-50
          bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg
          py-1
          animate-in fade-in slide-in-from-top-2 duration-200
        ">
                    {accessibleBranches.map((branch) => {
                        const Icon = BRANCH_ICONS[branch];
                        const branchColors = BRANCH_COLORS[branch];
                        const config = BRANCH_CONFIGS[branch];
                        const isActive = branch === currentBranch;

                        return (
                            <button
                                key={branch}
                                onClick={() => handleBranchSelect(branch)}
                                className={`
                  w-full flex items-center gap-3 px-3 py-2
                  ${isActive ? branchColors.bg : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                  ${branchColors.text}
                  transition-colors duration-150
                `}
                                disabled={isActive}
                            >
                                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-md
                  ${isActive ? 'bg-white/50 dark:bg-black/20' : branchColors.bg}
                `}>
                                    <Icon className="w-4 h-4" />
                                </div>

                                <div className="flex-1 text-left">
                                    <div className="text-sm font-medium">{config.displayName}</div>
                                    <div className="text-xs opacity-75">{config.description}</div>
                                </div>

                                {isActive && (
                                    <Check className="w-4 h-4 text-green-500" />
                                )}
                            </button>
                        );
                    })}

                    {/* Info Footer */}
                    <div className="px-3 py-2 mt-1 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Cambiare branch ti porterà all'altro portale
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * BranchIndicator Component
 * 
 * Versione semplificata che mostra solo l'indicatore del branch corrente
 * senza funzionalità di switch.
 * 
 * @example
 * ```tsx
 * <BranchIndicator size="sm" />
 * <BranchIndicator size="lg" showLabel />
 * ```
 */
export function BranchIndicator({
    size = 'md',
    showLabel = true,
    className = '',
}: {
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}) {
    const { currentBranch, branchConfig } = useBranchContext();
    const Icon = BRANCH_ICONS[currentBranch];
    const colors = BRANCH_COLORS[currentBranch];

    const sizeClasses = {
        sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-2 py-1' },
        md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-3 py-1.5' },
        lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'px-4 py-2' },
    };

    const s = sizeClasses[size];

    return (
        <div
            className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${s.padding} ${s.text}
        ${colors.bg} ${colors.text} ${colors.border} border
        ${className}
      `}
            title={branchConfig.description}
        >
            <Icon className={s.icon} />
            {showLabel && <span>{branchConfig.displayName}</span>}
        </div>
    );
}

export default BranchSwitcher;
