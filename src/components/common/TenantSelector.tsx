/**
 * TenantSelector Component
 * 
 * Componente globale per la selezione dei tenant.
 * Mostra un dropdown con checkbox per selezionare uno o più tenant.
 * 
 * Comportamento:
 * - Utenti con un solo tenant: il componente non viene visualizzato
 * - Utenti con più tenant: mostra dropdown per selezionare i tenant
 * - Default: solo il tenant assegnato all'utente (no bypass admin)
 * 
 * @module components/common/TenantSelector
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useRef, useEffect } from 'react';
import { Building2, Check, ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';
import { useTenantFilter } from '../../context/TenantFilterContext';
import { classNames as cn } from '../../lib/utils';

// =====================================================
// TYPES
// =====================================================

interface TenantSelectorProps {
    /** Classe CSS aggiuntiva */
    className?: string;
    /** Variante compatta per header */
    variant?: 'default' | 'compact';
    /** Disabilita il componente */
    disabled?: boolean;
    /** Callback quando la selezione cambia */
    onSelectionChange?: (tenantIds: string[]) => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const TenantSelector: React.FC<TenantSelectorProps> = ({
    className,
    variant = 'default',
    disabled = false,
    onSelectionChange,
}) => {
    const {
        accessibleTenants,
        selectedTenantIds,
        hasMultipleTenants,
        loading,
        error,
        toggleTenant,
        selectAllTenants,
        selectOnlyUserTenant,
        refreshTenants,
        userTenantId,
    } = useTenantFilter();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Chiudi dropdown quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Notifica cambio selezione
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedTenantIds);
        }
    }, [selectedTenantIds, onSelectionChange]);

    // Non mostrare se l'utente ha solo un tenant
    if (!hasMultipleTenants && !loading) {
        return null;
    }

    // Calcola il testo del bottone
    const getButtonText = (): string => {
        if (loading) return 'Caricamento...';
        if (selectedTenantIds.length === 0) return 'Seleziona tenant';
        if (selectedTenantIds.length === accessibleTenants.length) return 'Tutti i tenant';
        if (selectedTenantIds.length === 1) {
            const tenant = accessibleTenants.find(t => t.id === selectedTenantIds[0]);
            return tenant?.name || 'Tenant selezionato';
        }
        return `${selectedTenantIds.length} tenant selezionati`;
    };

    // Stile variante
    const isCompact = variant === 'compact';

    return (
        <div
            ref={dropdownRef}
            className={cn('relative inline-block', className)}
        >
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled || loading}
                className={cn(
                    'flex items-center gap-2 rounded-md border border-gray-300',
                    'bg-white text-gray-700 hover:bg-gray-50',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-all duration-150',
                    isCompact ? 'px-2 py-1 text-sm' : 'px-3 py-2 text-sm',
                )}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <Building2 className={cn('text-gray-400', isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
                <span className="truncate max-w-[180px]">{getButtonText()}</span>
                <ChevronDown
                    className={cn(
                        'text-gray-400 transition-transform duration-200',
                        isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4',
                        { 'rotate-180': isOpen }
                    )}
                />
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute z-50 mt-1 w-64 rounded-md border border-gray-200',
                        'bg-white shadow-lg ring-1 ring-black ring-opacity-5',
                        'animate-in fade-in-0 zoom-in-95 duration-100',
                    )}
                    role="listbox"
                    aria-multiselectable="true"
                >
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Filtra per Tenant
                            </span>
                            <button
                                type="button"
                                onClick={() => refreshTenants()}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                title="Ricarica tenant"
                            >
                                <RefreshCw className={cn('h-3.5 w-3.5', { 'animate-spin': loading })} />
                            </button>
                        </div>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="px-3 py-2 text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="px-3 py-2 border-b border-gray-100 flex gap-2">
                        <button
                            type="button"
                            onClick={selectAllTenants}
                            className={cn(
                                'text-xs px-2 py-1 rounded',
                                'bg-gray-100 text-gray-600 hover:bg-gray-200',
                                'transition-colors duration-150',
                                { 'bg-primary-100 text-primary-700': selectedTenantIds.length === accessibleTenants.length }
                            )}
                        >
                            Tutti
                        </button>
                        <button
                            type="button"
                            onClick={selectOnlyUserTenant}
                            className={cn(
                                'text-xs px-2 py-1 rounded',
                                'bg-gray-100 text-gray-600 hover:bg-gray-200',
                                'transition-colors duration-150',
                                { 'bg-primary-100 text-primary-700': selectedTenantIds.length === 1 && selectedTenantIds[0] === userTenantId }
                            )}
                        >
                            Solo il mio
                        </button>
                    </div>

                    {/* Tenant List */}
                    <ul className="max-h-60 overflow-auto py-1">
                        {loading && !accessibleTenants.length ? (
                            <li className="px-3 py-2 text-sm text-gray-500 text-center">
                                Caricamento tenant...
                            </li>
                        ) : (
                            accessibleTenants.map((tenant) => {
                                const isSelected = selectedTenantIds.includes(tenant.id);
                                const isPrimary = tenant.id === userTenantId;

                                return (
                                    <li
                                        key={tenant.id}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => toggleTenant(tenant.id)}
                                        className={cn(
                                            'flex items-center gap-3 px-3 py-2 cursor-pointer',
                                            'hover:bg-gray-50 transition-colors duration-150',
                                            { 'bg-primary-50': isSelected }
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <div className={cn(
                                            'flex-shrink-0 h-4 w-4 rounded border',
                                            'flex items-center justify-center',
                                            isSelected
                                                ? 'bg-primary-600 border-primary-600'
                                                : 'border-gray-300 bg-white'
                                        )}>
                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                        </div>

                                        {/* Tenant Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    'text-sm truncate',
                                                    isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'
                                                )}>
                                                    {tenant.name}
                                                </span>
                                                {isPrimary && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                                        Primario
                                                    </span>
                                                )}
                                            </div>
                                            {tenant.accessLevel && (
                                                <span className="text-xs text-gray-400">
                                                    Accesso: {tenant.accessLevel}
                                                </span>
                                            )}
                                        </div>

                                        {/* Active Status */}
                                        <div className={cn(
                                            'flex-shrink-0 h-2 w-2 rounded-full',
                                            tenant.isActive ? 'bg-green-500' : 'bg-gray-300'
                                        )}
                                            title={tenant.isActive ? 'Attivo' : 'Non attivo'}
                                        />
                                    </li>
                                );
                            })
                        )}
                    </ul>

                    {/* Footer */}
                    <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                        <span className="text-xs text-gray-500">
                            {selectedTenantIds.length} di {accessibleTenants.length} selezionati
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantSelector;
