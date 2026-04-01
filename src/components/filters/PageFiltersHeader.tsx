/**
 * PageFiltersHeader - Header con selettore data e contatori unificati
 * 
 * Usato da: AppuntamentiPage, AccettazionePage, VisiteListPage, RefertiListPage
 * 
 * Features:
 * - Selettore data elegante con navigazione giorno
 * - Contatori statistiche dinamiche
 * - Filtri rapidi configurabili
 * - Design coerente con Dashboard
 * 
 * @module components/filters/PageFiltersHeader
 */

import React, { useMemo } from 'react';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Filter,
    Search
} from 'lucide-react';
import { Button } from '../ui/button';
import { DatePickerElegante } from '../ui/DatePickerElegante';

// ============================================
// TYPES
// ============================================

export interface StatItem {
    label: string;
    value: number;
    color: 'gray' | 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'teal';
    icon?: React.ReactNode;
}

export interface QuickFilter {
    key: string;
    label: string;
    value: string;
    isActive: boolean;
}

export interface PageFiltersHeaderProps {
    // Title & subtitle
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;

    // Date selection
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    showDateNavigation?: boolean;

    // Stats
    stats?: StatItem[];

    // Search
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;

    // Quick filters
    quickFilters?: QuickFilter[];
    onQuickFilterChange?: (key: string, value: string) => void;

    // Actions
    onRefresh?: () => void;
    isLoading?: boolean;
    showAdvancedFilters?: boolean;
    onToggleAdvancedFilters?: () => void;

    // Additional actions (right side)
    actions?: React.ReactNode;

    // Theme
    theme?: 'teal' | 'blue' | 'violet';
}

// ============================================
// CONSTANTS
// ============================================

const COLOR_CLASSES = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
};

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

// ============================================
// HELPER FUNCTIONS
// ============================================

const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

const formatDateDisplay = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) return 'Oggi';
    if (isSameDay(date, tomorrow)) return 'Domani';
    if (isSameDay(date, yesterday)) return 'Ieri';

    return `${GIORNI[date.getDay()]} ${date.getDate()} ${MESI[date.getMonth()]}`;
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PageFiltersHeader: React.FC<PageFiltersHeaderProps> = ({
    title,
    subtitle,
    icon,
    selectedDate,
    onDateChange,
    showDateNavigation = true,
    stats = [],
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Cerca...',
    quickFilters = [],
    onQuickFilterChange,
    onRefresh,
    isLoading = false,
    showAdvancedFilters,
    onToggleAdvancedFilters,
    actions,
    theme = 'teal'
}) => {
    const isToday = useMemo(() => isSameDay(selectedDate, new Date()), [selectedDate]);

    const goToPreviousDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        onDateChange(newDate);
    };

    const goToNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        onDateChange(newDate);
    };

    const goToToday = () => {
        onDateChange(new Date());
    };

    return (
        <div className="space-y-4">
            {/* Main Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Title & Date */}
                    <div className="flex items-center gap-4">
                        {/* Icon & Title */}
                        <div className="flex items-center gap-3">
                            {icon && (
                                <div className={`p-2 rounded-lg bg-${theme}-100`}>
                                    {icon}
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                                {subtitle && (
                                    <p className="text-sm text-gray-500">{subtitle}</p>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block h-10 w-px bg-gray-200" />

                        {/* Date Selector */}
                        {showDateNavigation && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goToPreviousDay}
                                    className="h-9 w-9 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <DatePickerElegante
                                    value={selectedDate}
                                    onChange={(date) => date && onDateChange(date)}
                                    placeholder="Seleziona data"
                                    theme={theme}
                                    size="md"
                                    clearable={false}
                                    formatDisplay={(d) => formatDateDisplay(d)}
                                    className="w-48"
                                />

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goToNextDay}
                                    className="h-9 w-9 p-0"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>

                                {!isToday && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={goToToday}
                                    >
                                        Oggi
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {onRefresh && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRefresh}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                        )}
                        {actions}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats.length > 0 && (
                <div className={`grid grid-cols-2 md:grid-cols-${Math.min(stats.length, 6)} gap-3`}>
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className={`rounded-lg border p-3 ${COLOR_CLASSES[stat.color]}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium opacity-80">{stat.label}</p>
                                    <p className="text-xl font-bold">{stat.value}</p>
                                </div>
                                {stat.icon && (
                                    <div className="opacity-50">
                                        {stat.icon}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters Bar */}
            {(onSearchChange || quickFilters.length > 0 || onToggleAdvancedFilters) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        {onSearchChange && (
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchValue || ''}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        )}

                        {/* Quick Filters */}
                        {quickFilters.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {quickFilters.map((filter) => (
                                    <button
                                        key={filter.key}
                                        onClick={() => onQuickFilterChange?.(filter.key, filter.value)}
                                        className={`
                                            px-3 py-1.5 text-sm font-medium rounded-full border transition-colors
                                            ${filter.isActive
                                                ? 'bg-teal-100 border-teal-300 text-teal-700'
                                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Advanced Filters Toggle */}
                        {onToggleAdvancedFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onToggleAdvancedFilters}
                                className={showAdvancedFilters ? 'bg-teal-50 border-teal-300' : ''}
                            >
                                <Filter className="h-4 w-4 mr-1" />
                                Filtri
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PageFiltersHeader;
