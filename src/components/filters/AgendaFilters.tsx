/**
 * AgendaFilters - Componente riutilizzabile per filtri agenda
 * 
 * Features:
 * - Selettore data singola con calendario elegante
 * - Filtro range date (da/a)
 * - Filtro range ore
 * - Filtro medico
 * - Filtro stato appuntamento
 * 
 * @module components/filters/AgendaFilters
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    User,
    X,
    RefreshCw,
    CalendarDays,
    CalendarRange
} from 'lucide-react';
import { Button } from '../ui/button';
import { StatoAppuntamento } from '../../services/clinicaApi';

// ============================================
// TYPES
// ============================================

export interface DateRange {
    from: Date | null;
    to: Date | null;
}

export interface TimeRange {
    from: string; // HH:mm format
    to: string;   // HH:mm format
}

export interface MedicoOption {
    id: string;
    nome: string;
    cognome: string;
    specializzazione?: string;
}

export interface AgendaFiltersProps {
    // Date selection
    selectedDate: Date;
    onDateChange: (date: Date) => void;

    // Optional: Date range mode
    dateRange?: DateRange;
    onDateRangeChange?: (range: DateRange) => void;
    showDateRange?: boolean;

    // Optional: Time range
    timeRange?: TimeRange;
    onTimeRangeChange?: (range: TimeRange) => void;
    showTimeRange?: boolean;

    // Optional: Medico filter
    selectedMedicoId?: string | null;
    onMedicoChange?: (medicoId: string | null) => void;
    mediciOptions?: MedicoOption[];
    showMedicoFilter?: boolean;

    // Optional: Stato filter
    selectedStati?: StatoAppuntamento[];
    onStatiChange?: (stati: StatoAppuntamento[]) => void;
    showStatoFilter?: boolean;

    // Actions
    onRefresh?: () => void;
    isLoading?: boolean;

    // Compact mode (for smaller screens)
    compact?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const STATI_OPTIONS: { value: StatoAppuntamento; label: string; color: string }[] = [
    { value: 'PRENOTATO', label: 'Prenotato', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'CONFERMATO', label: 'Confermato', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'IN_ATTESA', label: 'In Attesa', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'IN_CORSO', label: 'In Corso', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'COMPLETATO', label: 'Completato', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { value: 'ANNULLATO', label: 'Annullato', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'NO_SHOW', label: 'No Show', color: 'bg-orange-100 text-orange-700 border-orange-200' },
];

const GIORNI_SETTIMANA = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDateForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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

    return `${date.getDate()} ${MESI[date.getMonth()].substring(0, 3)} ${date.getFullYear()}`;
};

// ============================================
// CALENDAR POPUP COMPONENT
// ============================================

interface CalendarPopupProps {
    selectedDate: Date;
    onSelect: (date: Date) => void;
    onClose: () => void;
    isRange?: boolean;
    rangeStart?: Date | null;
    rangeEnd?: Date | null;
}

const CalendarPopup: React.FC<CalendarPopupProps> = ({
    selectedDate,
    onSelect,
    onClose,
    isRange = false,
    rangeStart,
    rangeEnd
}) => {
    const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
    const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
    const popupRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const goToToday = () => {
        const today = new Date();
        setViewMonth(today.getMonth());
        setViewYear(today.getFullYear());
        onSelect(today);
    };

    const isInRange = (day: number): boolean => {
        if (!isRange || !rangeStart || !rangeEnd) return false;
        const current = new Date(viewYear, viewMonth, day);
        return current >= rangeStart && current <= rangeEnd;
    };

    const isRangeStart = (day: number): boolean => {
        if (!rangeStart) return false;
        const current = new Date(viewYear, viewMonth, day);
        return isSameDay(current, rangeStart);
    };

    const isRangeEnd = (day: number): boolean => {
        if (!rangeEnd) return false;
        const current = new Date(viewYear, viewMonth, day);
        return isSameDay(current, rangeEnd);
    };

    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
    const today = new Date();

    return (
        <div
            ref={popupRef}
            className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-[320px] animate-in fade-in slide-in-from-top-2 duration-200"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="text-center">
                    <span className="font-semibold text-gray-900">
                        {MESI[viewMonth]} {viewYear}
                    </span>
                </div>
                <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {GIORNI_SETTIMANA.map(giorno => (
                    <div key={giorno} className="text-center text-xs font-medium text-gray-400 py-2">
                        {giorno}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before first of month */}
                {Array.from({ length: firstDay }, (_, i) => (
                    <div key={`empty-${i}`} className="h-10" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const date = new Date(viewYear, viewMonth, day);
                    const isSelected = isSameDay(date, selectedDate);
                    const isCurrentDay = isSameDay(date, today);
                    const inRange = isInRange(day);
                    const isStart = isRangeStart(day);
                    const isEnd = isRangeEnd(day);

                    return (
                        <button
                            key={day}
                            onClick={() => onSelect(date)}
                            className={`
                                h-10 w-full rounded-lg text-sm font-medium transition-all
                                ${isSelected
                                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-md'
                                    : isCurrentDay
                                        ? 'bg-teal-100 text-teal-700 font-bold'
                                        : inRange
                                            ? 'bg-teal-50 text-teal-700'
                                            : 'text-gray-700 hover:bg-gray-100'
                                }
                                ${isStart && 'rounded-r-none'}
                                ${isEnd && 'rounded-l-none'}
                                ${inRange && !isStart && !isEnd && 'rounded-none'}
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                <button
                    onClick={goToToday}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                >
                    <CalendarDays className="h-4 w-4" />
                    Oggi
                </button>
                <button
                    onClick={onClose}
                    className="text-sm text-gray-500 hover:text-gray-700"
                >
                    Chiudi
                </button>
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AgendaFilters: React.FC<AgendaFiltersProps> = ({
    selectedDate,
    onDateChange,
    dateRange,
    onDateRangeChange,
    showDateRange = false,
    timeRange,
    onTimeRangeChange,
    showTimeRange = false,
    selectedMedicoId,
    onMedicoChange,
    mediciOptions = [],
    showMedicoFilter = false,
    selectedStati,
    onStatiChange,
    showStatoFilter = false,
    onRefresh,
    isLoading = false,
    compact = false
}) => {
    const [showCalendar, setShowCalendar] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isRangeMode, setIsRangeMode] = useState(false);
    const [rangeSelectionStep, setRangeSelectionStep] = useState<'start' | 'end'>('start');

    const isToday = isSameDay(selectedDate, new Date());

    // Navigation handlers
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

    // Handle date selection from calendar
    const handleCalendarSelect = (date: Date) => {
        if (isRangeMode && onDateRangeChange) {
            if (rangeSelectionStep === 'start') {
                onDateRangeChange({ from: date, to: null });
                setRangeSelectionStep('end');
            } else {
                const newRange = dateRange?.from && date < dateRange.from
                    ? { from: date, to: dateRange.from }
                    : { from: dateRange?.from || date, to: date };
                onDateRangeChange(newRange);
                setRangeSelectionStep('start');
                setShowCalendar(false);
            }
        } else {
            onDateChange(date);
            setShowCalendar(false);
        }
    };

    // Toggle stato filter
    const toggleStato = (stato: StatoAppuntamento) => {
        if (!onStatiChange || !selectedStati) return;
        const isSelected = selectedStati.includes(stato);
        onStatiChange(
            isSelected
                ? selectedStati.filter(s => s !== stato)
                : [...selectedStati, stato]
        );
    };

    // Count active filters
    const activeFiltersCount = [
        dateRange?.from && dateRange?.to,
        timeRange?.from !== '00:00' || timeRange?.to !== '23:59',
        selectedMedicoId,
        selectedStati && selectedStati.length > 0 && selectedStati.length < STATI_OPTIONS.length
    ].filter(Boolean).length;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Main filter bar */}
            <div className={`p-4 ${compact ? 'flex flex-wrap gap-2' : 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'}`}>
                {/* Left section: Date Navigation */}
                <div className="flex items-center gap-2">
                    {/* Previous Day */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousDay}
                        className="h-10 w-10 p-0 rounded-lg border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </Button>

                    {/* Date Display & Calendar Trigger */}
                    <div className="relative">
                        <button
                            onClick={() => setShowCalendar(!showCalendar)}
                            className={`
                                flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all
                                ${showCalendar
                                    ? 'border-teal-500 bg-teal-50 shadow-sm'
                                    : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                                }
                            `}
                        >
                            <div className={`p-2 rounded-lg ${isToday ? 'bg-teal-100' : 'bg-gray-100'}`}>
                                <Calendar className={`h-5 w-5 ${isToday ? 'text-teal-600' : 'text-gray-600'}`} />
                            </div>
                            <div className="text-left">
                                <div className="text-xs text-gray-500 font-medium">
                                    {GIORNI_SETTIMANA[selectedDate.getDay()]}
                                </div>
                                <div className="text-sm font-semibold text-gray-900">
                                    {formatDateDisplay(selectedDate)}
                                </div>
                            </div>
                            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${showCalendar ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Calendar Popup */}
                        {showCalendar && (
                            <CalendarPopup
                                selectedDate={selectedDate}
                                onSelect={handleCalendarSelect}
                                onClose={() => setShowCalendar(false)}
                                isRange={isRangeMode}
                                rangeStart={dateRange?.from}
                                rangeEnd={dateRange?.to}
                            />
                        )}
                    </div>

                    {/* Next Day */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextDay}
                        className="h-10 w-10 p-0 rounded-lg border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                    </Button>

                    {/* Today Button */}
                    {!isToday && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToToday}
                            className="h-10 px-4 rounded-lg border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 font-medium transition-all"
                        >
                            <CalendarDays className="h-4 w-4 mr-2" />
                            Oggi
                        </Button>
                    )}

                    {/* Refresh Button */}
                    {onRefresh && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="h-10 w-10 p-0 rounded-lg text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition-all"
                            title="Aggiorna dati"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    )}
                </div>

                {/* Right section: Advanced Filters */}
                {(showDateRange || showTimeRange || showMedicoFilter || showStatoFilter) && (
                    <div className="flex items-center gap-2">
                        {/* Date Range Toggle */}
                        {showDateRange && onDateRangeChange && (
                            <Button
                                variant={isRangeMode ? "primary" : "outline"}
                                size="sm"
                                onClick={() => {
                                    setIsRangeMode(!isRangeMode);
                                    if (!isRangeMode) {
                                        onDateRangeChange({ from: null, to: null });
                                    }
                                }}
                                className={`h-10 rounded-lg ${isRangeMode ? 'bg-teal-600' : ''}`}
                            >
                                <CalendarRange className="h-4 w-4 mr-2" />
                                Range
                            </Button>
                        )}

                        {/* Filters Toggle Button */}
                        <Button
                            variant={showFilters || activeFiltersCount > 0 ? "primary" : "outline"}
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`h-10 rounded-lg relative ${(showFilters || activeFiltersCount > 0) ? 'bg-teal-600' : ''}`}
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filtri
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Expanded Filters Panel */}
            {showFilters && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-xl animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Time Range Filter */}
                        {showTimeRange && onTimeRangeChange && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                    <Clock className="h-3.5 w-3.5 inline mr-1" />
                                    Fascia Oraria
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={timeRange?.from || '00:00'}
                                        onChange={(e) => onTimeRangeChange({
                                            ...timeRange || { from: '00:00', to: '23:59' },
                                            from: e.target.value
                                        })}
                                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="time"
                                        value={timeRange?.to || '23:59'}
                                        onChange={(e) => onTimeRangeChange({
                                            ...timeRange || { from: '00:00', to: '23:59' },
                                            to: e.target.value
                                        })}
                                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Medico Filter */}
                        {showMedicoFilter && onMedicoChange && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                    <User className="h-3.5 w-3.5 inline mr-1" />
                                    Medico
                                </label>
                                <select
                                    value={selectedMedicoId || ''}
                                    onChange={(e) => onMedicoChange(e.target.value || null)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                                >
                                    <option value="">Tutti i medici</option>
                                    {mediciOptions.map(m => (
                                        <option key={m.id} value={m.id}>
                                            Dott. {m.cognome} {m.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Stato Filter */}
                        {showStatoFilter && onStatiChange && selectedStati && (
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                    Stato Appuntamento
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {STATI_OPTIONS.map(stato => (
                                        <button
                                            key={stato.value}
                                            onClick={() => toggleStato(stato.value)}
                                            className={`
                                                px-2.5 py-1 text-xs font-medium rounded-lg border transition-all
                                                ${selectedStati.includes(stato.value)
                                                    ? stato.color
                                                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                                }
                                            `}
                                        >
                                            {stato.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clear Filters */}
                    {activeFiltersCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => {
                                    onDateRangeChange?.({ from: null, to: null });
                                    onTimeRangeChange?.({ from: '00:00', to: '23:59' });
                                    onMedicoChange?.(null);
                                    onStatiChange?.(STATI_OPTIONS.map(s => s.value));
                                    setIsRangeMode(false);
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                                <X className="h-4 w-4" />
                                Azzera filtri
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AgendaFilters;
