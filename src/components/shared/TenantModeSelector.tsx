/**
 * TenantModeSelector Component
 * 
 * Componente avanzato per gestire la modalità di visualizzazione e operazione
 * in ambiente multi-tenant. Permette di:
 * - Visualizzare dati di tutti i tenant o di uno specifico
 * - Selezionare su quale tenant eseguire operazioni CRUD
 * - Mostrare avvisi quando c'è mismatch tra view e operate
 * 
 * Design: Elegante, user-friendly, con feedback visivo chiaro.
 * 
 * @module components/shared/TenantModeSelector
 * @project 45 - Tenant Restructuring Commercial (Fase 8)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    Building2,
    ChevronDown,
    Check,
    Eye,
    Edit3,
    AlertTriangle,
    Layers,
    Shield,
    Star,
    X,
} from 'lucide-react';
import {
    useTenantMode,
    useTenantModeOptional,
    type ViewMode,
} from '../../contexts/TenantModeContext';
import type { AccessibleTenant } from '../../hooks/useTenantAccess';

// ============================================
// TYPES
// ============================================

interface TenantModeSelectorProps {
    /** Classi CSS aggiuntive */
    className?: string;
    /** Modalità compatta (solo icone) */
    compact?: boolean;
    /** Mostra solo view selector */
    viewOnly?: boolean;
    /** Mostra solo operate selector */
    operateOnly?: boolean;
    /** Callback quando cambia il view mode */
    onViewModeChange?: (mode: ViewMode, tenantId?: string) => void;
    /** Callback quando cambia l'operate tenant */
    onOperateTenantChange?: (tenantId: string) => void;
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Badge per tipo di accesso tenant
 */
const TenantBadge: React.FC<{ tenant: AccessibleTenant; size?: 'sm' | 'md' }> = ({
    tenant,
    size = 'sm',
}) => {
    const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';

    if (tenant.isAdminAccess) {
        return (
            <span className={`inline-flex items-center gap-0.5 ${sizeClasses} rounded font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`}>
                <Shield className="w-3 h-3" />
                Admin
            </span>
        );
    }

    if (tenant.isPrimary) {
        return (
            <span className={`inline-flex items-center gap-0.5 ${sizeClasses} rounded font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`}>
                <Star className="w-3 h-3" />
                Primario
            </span>
        );
    }

    return null;
};

/**
 * Item del dropdown tenant
 */
const TenantItem: React.FC<{
    tenant: AccessibleTenant;
    isSelected: boolean;
    onClick: () => void;
    disabled?: boolean;
}> = ({ tenant, isSelected, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
            w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors
            ${isSelected
                ? 'bg-teal-50 dark:bg-teal-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
    >
        <div className="flex-shrink-0">
            {isSelected ? (
                <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            ) : (
                <div className="w-4 h-4" />
            )}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className={`font-medium truncate ${isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-200'}`}>
                    {tenant.name}
                </span>
                <TenantBadge tenant={tenant} />
            </div>
            {tenant.slug && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tenant.slug}
                </span>
            )}
        </div>
    </button>
);

/**
 * Warning Banner per mismatch view/operate
 */
const WarningBanner: React.FC<{ message: string; onClose?: () => void }> = ({
    message,
    onClose,
}) => (
    <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 text-amber-800 dark:text-amber-200 text-sm">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="flex-1">{message}</p>
        {onClose && (
            <button onClick={onClose} className="flex-shrink-0 p-0.5 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded">
                <X className="w-3 h-3" />
            </button>
        )}
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * TenantModeSelector
 * 
 * Componente principale per la selezione della modalità tenant.
 * 
 * @example
 * ```tsx
 * // Uso completo
 * <TenantModeSelector />
 * 
 * // Modalità compatta
 * <TenantModeSelector compact />
 * 
 * // Solo visualizzazione
 * <TenantModeSelector viewOnly />
 * ```
 */
export function TenantModeSelector({
    className = '',
    compact = false,
    viewOnly = false,
    operateOnly = false,
    onViewModeChange,
    onOperateTenantChange,
}: TenantModeSelectorProps) {
    // IMPORTANTE: Tutti gli hook devono essere chiamati PRIMA di qualsiasi return condizionale
    // per rispettare le Rules of Hooks di React
    const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
    const [operateDropdownOpen, setOperateDropdownOpen] = useState(false);

    const viewDropdownRef = useRef<HTMLDivElement>(null);
    const operateDropdownRef = useRef<HTMLDivElement>(null);

    const context = useTenantModeOptional();

    // Chiudi dropdown quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
                setViewDropdownOpen(false);
            }
            if (operateDropdownRef.current && !operateDropdownRef.current.contains(event.target as Node)) {
                setOperateDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Se non c'è context, non mostrare nulla
    if (!context) {
        return null;
    }

    // Mostra il selector SOLO se l'utente ha accesso a più di un tenant
    // (senza bypass per admin - l'admin ha già i tenant assegnati dal backend)
    if (!context.hasMultipleTenants) {
        return null;
    }

    const {
        viewMode,
        viewTenant,
        operateTenant,
        accessibleTenants,
        canPerformCRUD,
        setViewMode,
        setOperateTenant,
        syncViewAndOperate,
        warningMessage,
        loading,
    } = context;

    // Handler per cambio view mode
    const handleViewModeChange = (mode: ViewMode, tenantId?: string) => {
        setViewMode(mode, tenantId);
        setViewDropdownOpen(false);
        onViewModeChange?.(mode, tenantId);
    };

    // Handler per cambio operate tenant
    const handleOperateTenantChange = (tenantId: string) => {
        setOperateTenant(tenantId);
        setOperateDropdownOpen(false);
        onOperateTenantChange?.(tenantId);
    };

    // Loading state
    if (loading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="animate-pulse flex items-center gap-2">
                    <div className="w-32 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="w-32 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-center ${className}`}>
            <div className={`flex ${compact ? 'gap-1.5' : 'gap-2'} items-center`}>
                {/* VIEW MODE SELECTOR */}
                {!operateOnly && (
                    <div ref={viewDropdownRef} className="relative">
                        {/* Trigger Button - Design raffinato */}
                        <button
                            onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
                            title={viewMode === 'all' ? 'Visualizza tutti i tenant' : `Visualizza: ${viewTenant?.name || 'Seleziona'}`}
                            className={`
                                flex items-center gap-1.5 rounded-full transition-all text-xs font-medium
                                ${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'}
                                ${viewMode === 'all'
                                    ? 'bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200/80 text-slate-700 shadow-sm dark:from-slate-700 dark:to-slate-800 dark:border-slate-600 dark:text-slate-200'
                                    : 'bg-white/80 backdrop-blur-sm border border-gray-200/80 text-gray-600 shadow-sm dark:bg-gray-800/80 dark:border-gray-600 dark:text-gray-300'
                                }
                                hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500
                                focus:outline-none focus:ring-2 focus:ring-slate-300/50
                            `}
                        >
                            <Building2 className="w-3.5 h-3.5 opacity-70" />
                            <span className="max-w-[90px] truncate">
                                {viewMode === 'all' ? 'Tutti' : (viewTenant?.name || 'Seleziona')}
                            </span>
                            <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {viewDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-64 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 overflow-hidden">
                                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <Eye className="w-3 h-3" />
                                        Visualizzazione
                                    </span>
                                </div>

                                {/* Opzione "Tutti" */}
                                <button
                                    onClick={() => handleViewModeChange('all')}
                                    className={`
                                        w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors
                                        ${viewMode === 'all'
                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }
                                    `}
                                >
                                    <div className="flex-shrink-0">
                                        {viewMode === 'all' ? (
                                            <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        ) : (
                                            <div className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-blue-500" />
                                        <span className={`font-medium ${viewMode === 'all' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>
                                            Tutti i Tenant
                                        </span>
                                    </div>
                                </button>

                                <div className="border-t border-gray-100 dark:border-gray-700" />

                                {/* Lista tenant */}
                                <div className="max-h-48 overflow-y-auto">
                                    {accessibleTenants.map((tenant) => (
                                        <TenantItem
                                            key={tenant.id}
                                            tenant={tenant}
                                            isSelected={viewMode === 'single' && viewTenant?.id === tenant.id}
                                            onClick={() => handleViewModeChange('single', tenant.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* OPERATE TENANT SELECTOR - Solo se viewMode='all' */}
                {!viewOnly && viewMode === 'all' && (
                    <div ref={operateDropdownRef} className="relative">
                        {/* Trigger Button - Design raffinato con badge */}
                        <button
                            onClick={() => setOperateDropdownOpen(!operateDropdownOpen)}
                            title={operateTenant ? `Operazioni su: ${operateTenant.name}` : 'Seleziona tenant per operazioni'}
                            className={`
                                flex items-center gap-1.5 rounded-full transition-all text-xs font-medium
                                ${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'}
                                ${canPerformCRUD
                                    ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 border border-emerald-200/80 text-emerald-700 shadow-sm dark:from-emerald-800/40 dark:to-emerald-900/40 dark:border-emerald-600/50 dark:text-emerald-300'
                                    : 'bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200/80 text-amber-700 shadow-sm dark:from-amber-800/40 dark:to-amber-900/40 dark:border-amber-600/50 dark:text-amber-300'
                                }
                                hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500
                                focus:outline-none focus:ring-2 focus:ring-emerald-300/50
                            `}
                        >
                            <Edit3 className="w-3.5 h-3.5 opacity-70" />
                            <span className="max-w-[80px] truncate">
                                {operateTenant?.name || 'Seleziona'}
                            </span>
                            <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${operateDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {operateDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-64 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 overflow-hidden">
                                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <Edit3 className="w-3 h-3" />
                                        Operazioni CRUD
                                    </span>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                        Le nuove entità verranno create qui
                                    </p>
                                </div>

                                {/* Lista tenant */}
                                <div className="max-h-48 overflow-y-auto">
                                    {accessibleTenants.map((tenant) => (
                                        <TenantItem
                                            key={tenant.id}
                                            tenant={tenant}
                                            isSelected={operateTenant?.id === tenant.id}
                                            onClick={() => handleOperateTenantChange(tenant.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * TenantModeIndicator
 * 
 * Versione compatta che mostra solo lo stato corrente senza dropdown.
 * Utile per header o sidebar in spazi ridotti.
 */
export function TenantModeIndicator({ className = '' }: { className?: string }) {
    const context = useTenantModeOptional();

    // Return anticipato ma senza hook dopo
    if (!context || !context.hasMultipleTenants) {
        return null;
    }

    const { viewMode, viewTenant, operateTenant, canPerformCRUD } = context;

    return (
        <div className={`flex items-center gap-2 text-xs ${className}`}>
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
                <Eye className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-300">
                    {viewMode === 'all' ? 'Tutti' : viewTenant?.name || '-'}
                </span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${canPerformCRUD ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Edit3 className={`w-3 h-3 ${canPerformCRUD ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className={canPerformCRUD ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500'}>
                    {operateTenant?.name || '-'}
                </span>
            </div>
        </div>
    );
}

/**
 * CRUDGuard
 * 
 * Componente wrapper che disabilita/nasconde contenuto se CRUD non è permesso.
 * 
 * @example
 * ```tsx
 * <CRUDGuard fallback={<p>Seleziona un tenant per creare</p>}>
 *   <CreateButton />
 * </CRUDGuard>
 * ```
 */
export function CRUDGuard({
    children,
    fallback = null,
    disableInsteadOfHide = false,
}: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    disableInsteadOfHide?: boolean;
}) {
    const context = useTenantModeOptional();

    // Se non c'è context (single-tenant), mostra sempre il contenuto
    if (!context) {
        return <>{children}</>;
    }

    const { canPerformCRUD } = context;

    if (!canPerformCRUD) {
        if (disableInsteadOfHide) {
            return (
                <div className="opacity-50 pointer-events-none cursor-not-allowed">
                    {children}
                </div>
            );
        }
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

export default TenantModeSelector;
