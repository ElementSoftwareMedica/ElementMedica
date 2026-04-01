/**
 * PageFiltersBar - Componente riutilizzabile per filtri pagina
 * 
 * Barra filtri unificata e user-friendly per tutte le pagine del poliambulatorio.
 * Integra DateRangeCalendar per selezione periodo con due click.
 * 
 * Features:
 * - Selezione periodo con DateRangeCalendar
 * - Campo ricerca con debounce
 * - Dropdown stato con colori
 * - Dropdown categoria/tipo
 * - Bottone reset filtri
 * - Theme support (teal, blue, violet)
 * - Responsive design
 * 
 * @module components/ui/PageFiltersBar
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search,
    Filter,
    X,
    RefreshCw,
    ChevronDown
} from 'lucide-react';
import { DateRangeCalendar, DateRange } from './DateRangeCalendar';

// ============================================
// TYPES
// ============================================

export interface FilterOption {
    value: string;
    label: string;
    color?: string;  // Tailwind color class (es. 'bg-green-100 text-green-700')
    icon?: React.ReactNode;
}

export interface PageFiltersBarProps {
    /** Placeholder per il campo ricerca */
    searchPlaceholder?: string;
    /** Valore iniziale ricerca */
    searchValue?: string;
    /** Callback quando cambia la ricerca (debounced) */
    onSearchChange?: (value: string) => void;
    /** Delay debounce ricerca in ms (default: 300) */
    searchDebounce?: number;

    /** Range date selezionato */
    dateRange?: DateRange;
    /** Callback quando cambia il range date */
    onDateRangeChange?: (range: DateRange) => void;
    /** Mostra DateRangeCalendar */
    showDateFilter?: boolean;
    /** Label per DateRangeCalendar */
    dateLabel?: string;

    /** Opzioni per dropdown stato */
    statusOptions?: FilterOption[];
    /** Valore stato selezionato */
    statusValue?: string;
    /** Callback quando cambia lo stato */
    onStatusChange?: (value: string) => void;
    /** Label per dropdown stato */
    statusLabel?: string;
    /** Placeholder per dropdown stato */
    statusPlaceholder?: string;

    /** Opzioni per dropdown categoria */
    categoryOptions?: FilterOption[];
    /** Valore categoria selezionata */
    categoryValue?: string;
    /** Callback quando cambia la categoria */
    onCategoryChange?: (value: string) => void;
    /** Label per dropdown categoria */
    categoryLabel?: string;
    /** Placeholder per dropdown categoria */
    categoryPlaceholder?: string;

    /** Callback reset tutti i filtri */
    onReset?: () => void;
    /** Mostra bottone reset */
    showReset?: boolean;

    /** Callback refresh dati */
    onRefresh?: () => void;
    /** Mostra bottone refresh */
    showRefresh?: boolean;
    /** Loading state */
    isLoading?: boolean;

    /** Tema colore (default: teal) */
    theme?: 'teal' | 'blue' | 'violet';
    /** Classe CSS aggiuntiva */
    className?: string;
    /** Elementi custom aggiuntivi */
    children?: React.ReactNode;
}

// ============================================
// CONSTANTS
// ============================================

const THEME_COLORS = {
    teal: {
        focus: 'focus:ring-teal-500 focus:border-teal-500',
        button: 'bg-teal-600 hover:bg-teal-700 text-white',
        buttonOutline: 'border-teal-300 text-teal-700 hover:bg-teal-50',
        badge: 'bg-teal-100 text-teal-700'
    },
    blue: {
        focus: 'focus:ring-blue-500 focus:border-blue-500',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
        buttonOutline: 'border-blue-300 text-blue-700 hover:bg-blue-50',
        badge: 'bg-blue-100 text-blue-700'
    },
    violet: {
        focus: 'focus:ring-violet-500 focus:border-violet-500',
        button: 'bg-violet-600 hover:bg-violet-700 text-white',
        buttonOutline: 'border-violet-300 text-violet-700 hover:bg-violet-50',
        badge: 'bg-violet-100 text-violet-700'
    }
};

// ============================================
// DROPDOWN COMPONENT
// ============================================

interface DropdownProps {
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    theme: 'teal' | 'blue' | 'violet';
}

const Dropdown: React.FC<DropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Seleziona...',
    theme
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const colors = THEME_COLORS[theme];

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center justify-between gap-2 w-full
                    px-3 py-2 text-sm
                    border border-gray-300 rounded-lg
                    bg-white hover:bg-gray-50
                    transition-colors
                    ${colors.focus}
                `}
            >
                {selectedOption ? (
                    <span className={`flex items-center gap-2 ${selectedOption.color || ''}`}>
                        {selectedOption.icon}
                        {selectedOption.label}
                    </span>
                ) : (
                    <span className="text-gray-400">{placeholder}</span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`
                                flex items-center gap-2 w-full px-3 py-2 text-sm text-left
                                hover:bg-gray-50 transition-colors
                                ${value === option.value ? 'bg-gray-100' : ''}
                            `}
                        >
                            {option.icon}
                            <span className={option.color || ''}>{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PageFiltersBar: React.FC<PageFiltersBarProps> = ({
    searchPlaceholder = 'Cerca...',
    searchValue: initialSearchValue = '',
    onSearchChange,
    searchDebounce = 300,

    dateRange,
    onDateRangeChange,
    showDateFilter = false,
    dateLabel = 'Periodo',

    statusOptions = [],
    statusValue = '',
    onStatusChange,
    statusLabel,
    statusPlaceholder = 'Tutti gli stati',

    categoryOptions = [],
    categoryValue = '',
    onCategoryChange,
    categoryLabel,
    categoryPlaceholder = 'Tutte le categorie',

    onReset,
    showReset = true,

    onRefresh,
    showRefresh = false,
    isLoading = false,

    theme = 'teal',
    className = '',
    children
}) => {
    const [localSearch, setLocalSearch] = useState(initialSearchValue);
    const debounceTimeout = useRef<NodeJS.Timeout>();
    const colors = THEME_COLORS[theme];

    // Sync local search with external value
    useEffect(() => {
        setLocalSearch(initialSearchValue);
    }, [initialSearchValue]);

    // Debounced search
    const handleSearchChange = useCallback((value: string) => {
        setLocalSearch(value);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            onSearchChange?.(value);
        }, searchDebounce);
    }, [onSearchChange, searchDebounce]);

    // Check if any filter is active
    const hasActiveFilters =
        localSearch.length > 0 ||
        (dateRange?.start !== null) ||
        statusValue !== '' ||
        categoryValue !== '';

    // Handle reset
    const handleReset = () => {
        setLocalSearch('');
        onSearchChange?.('');
        onDateRangeChange?.({ start: null, end: null });
        onStatusChange?.('');
        onCategoryChange?.('');
        onReset?.();
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
            <div className="flex flex-wrap items-end gap-4">
                {/* Search Input */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Ricerca
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={localSearch}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className={`
                                w-full pl-10 pr-4 py-2 text-sm
                                border border-gray-300 rounded-lg
                                placeholder:text-gray-400
                                ${colors.focus}
                            `}
                        />
                        {localSearch && (
                            <button
                                onClick={() => handleSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Date Range Filter */}
                {showDateFilter && (
                    <div className="min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            {dateLabel}
                        </label>
                        <DateRangeCalendar
                            value={dateRange || { start: null, end: null }}
                            onChange={onDateRangeChange || (() => { })}
                            theme={theme}
                            size="sm"
                            clearable
                            showPresets
                            placeholder="Seleziona periodo"
                        />
                    </div>
                )}

                {/* Status Filter */}
                {statusOptions.length > 0 && (
                    <div className="min-w-[160px]">
                        {statusLabel && (
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                {statusLabel}
                            </label>
                        )}
                        <Dropdown
                            options={[{ value: '', label: statusPlaceholder }, ...statusOptions]}
                            value={statusValue}
                            onChange={onStatusChange || (() => { })}
                            placeholder={statusPlaceholder}
                            theme={theme}
                        />
                    </div>
                )}

                {/* Category Filter */}
                {categoryOptions.length > 0 && (
                    <div className="min-w-[160px]">
                        {categoryLabel && (
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                {categoryLabel}
                            </label>
                        )}
                        <Dropdown
                            options={[{ value: '', label: categoryPlaceholder }, ...categoryOptions]}
                            value={categoryValue}
                            onChange={onCategoryChange || (() => { })}
                            placeholder={categoryPlaceholder}
                            theme={theme}
                        />
                    </div>
                )}

                {/* Custom children */}
                {children}

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Refresh Button */}
                    {showRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={isLoading}
                            className={`
                                p-2 rounded-lg border transition-colors
                                ${colors.buttonOutline}
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                            title="Aggiorna"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    )}

                    {/* Reset Button */}
                    {showReset && hasActiveFilters && (
                        <button
                            onClick={handleReset}
                            className={`
                                flex items-center gap-1 px-3 py-2 text-sm
                                rounded-lg border transition-colors
                                border-gray-300 text-gray-600 hover:bg-gray-50
                            `}
                        >
                            <X className="w-4 h-4" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Filtri attivi:</span>

                    {localSearch && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${colors.badge}`}>
                            Ricerca: "{localSearch}"
                            <button onClick={() => handleSearchChange('')} className="hover:opacity-70">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {dateRange?.start && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${colors.badge}`}>
                            {dateRange.end && dateRange.start.getTime() !== dateRange.end.getTime()
                                ? `${dateRange.start.toLocaleDateString('it-IT')} → ${dateRange.end.toLocaleDateString('it-IT')}`
                                : dateRange.start.toLocaleDateString('it-IT')
                            }
                            <button onClick={() => onDateRangeChange?.({ start: null, end: null })} className="hover:opacity-70">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {statusValue && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${colors.badge}`}>
                            {statusOptions.find(o => o.value === statusValue)?.label || statusValue}
                            <button onClick={() => onStatusChange?.('')} className="hover:opacity-70">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {categoryValue && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${colors.badge}`}>
                            {categoryOptions.find(o => o.value === categoryValue)?.label || categoryValue}
                            <button onClick={() => onCategoryChange?.('')} className="hover:opacity-70">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default PageFiltersBar;
