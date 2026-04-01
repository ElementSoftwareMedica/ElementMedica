/**
 * DateRangeCalendar - Calendario con selezione periodo (ENHANCED)
 * 
 * Un singolo calendario dove il primo click seleziona l'inizio del periodo
 * e il secondo click seleziona la fine con auto-conferma.
 * Per selezionare un giorno singolo: cliccare due volte sullo stesso giorno.
 * 
 * Features:
 * - Selezione range con due click (auto-confirm al secondo click)
 * - Input manuale date con formato DD/MM/YYYY
 * - Visualizzazione giorni mesi adiacenti (grayed out)
 * - Evidenziazione visiva del range
 * - Preset rapidi (oggi, settimana, mese)
 * - Navigazione mese fluida
 * - Design moderno e responsive
 * 
 * @module components/ui/DateRangeCalendar
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    X
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface DateRange {
    start: Date | null;
    end: Date | null;
}

export interface DateRangeCalendarProps {
    /** Range selezionato */
    value: DateRange;
    /** Callback quando cambia il range */
    onChange: (range: DateRange) => void;
    /** Placeholder quando nessun range è selezionato */
    placeholder?: string;
    /** Label sopra l'input */
    label?: string;
    /** Disabilita il picker */
    disabled?: boolean;
    /** Mostra bottone clear */
    clearable?: boolean;
    /** Min date selezionabile */
    minDate?: Date;
    /** Max date selezionabile */
    maxDate?: Date;
    /** Classe CSS aggiuntiva per il container */
    className?: string;
    /** Tema colore (default: teal) */
    theme?: 'teal' | 'blue' | 'violet' | 'orange';
    /** Dimensione */
    size?: 'sm' | 'md' | 'lg';
    /** Mostra preset rapidi */
    showPresets?: boolean;
    /** Preset personalizzati (sovrascrive quelli default) */
    customPresets?: Array<{ label: string; getRange: () => DateRange }>;
    /** Auto-conferma al secondo click (default: true) */
    autoConfirm?: boolean;
    /** Mostra giorni dei mesi adiacenti (default: true) */
    showAdjacentDays?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const THEME_COLORS = {
    teal: {
        selected: 'bg-teal-600',
        selectedHover: 'bg-teal-700',
        today: 'ring-2 ring-teal-400',
        hover: 'hover:bg-teal-50',
        range: 'bg-teal-100',
        rangeHover: 'bg-teal-200',
        button: 'text-teal-600 hover:text-teal-700 hover:bg-teal-50',
        focus: 'focus:ring-teal-500 focus:border-teal-500',
        border: 'border-teal-300',
        preset: 'border-teal-300 hover:bg-teal-50 text-teal-700',
        iconBg: 'bg-teal-50 group-hover:bg-teal-100',
        iconBgOpen: 'bg-teal-100',
        iconColor: 'text-teal-500',
        iconColorOpen: 'text-teal-600',
        ringOpen: 'ring-2 ring-teal-100',
        hoverBorder: 'hover:border-teal-400'
    },
    blue: {
        selected: 'bg-blue-600',
        selectedHover: 'bg-blue-700',
        today: 'ring-2 ring-blue-400',
        hover: 'hover:bg-blue-50',
        range: 'bg-blue-100',
        rangeHover: 'bg-blue-200',
        button: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
        focus: 'focus:ring-blue-500 focus:border-blue-500',
        border: 'border-blue-300',
        preset: 'border-blue-300 hover:bg-blue-50 text-blue-700',
        iconBg: 'bg-blue-50 group-hover:bg-blue-100',
        iconBgOpen: 'bg-blue-100',
        iconColor: 'text-blue-500',
        iconColorOpen: 'text-blue-600',
        ringOpen: 'ring-2 ring-blue-100',
        hoverBorder: 'hover:border-blue-400'
    },
    violet: {
        selected: 'bg-violet-600',
        selectedHover: 'bg-violet-700',
        today: 'ring-2 ring-violet-400',
        hover: 'hover:bg-violet-50',
        range: 'bg-violet-100',
        rangeHover: 'bg-violet-200',
        button: 'text-violet-600 hover:text-violet-700 hover:bg-violet-50',
        focus: 'focus:ring-violet-500 focus:border-violet-500',
        border: 'border-violet-300',
        preset: 'border-violet-300 hover:bg-violet-50 text-violet-700',
        iconBg: 'bg-violet-50 group-hover:bg-violet-100',
        iconBgOpen: 'bg-violet-100',
        iconColor: 'text-violet-500',
        iconColorOpen: 'text-violet-600',
        ringOpen: 'ring-2 ring-violet-100',
        hoverBorder: 'hover:border-violet-400'
    },
    orange: {
        selected: 'bg-orange-600',
        selectedHover: 'bg-orange-700',
        today: 'ring-2 ring-orange-400',
        hover: 'hover:bg-orange-50',
        range: 'bg-orange-100',
        rangeHover: 'bg-orange-200',
        button: 'text-orange-600 hover:text-orange-700 hover:bg-orange-50',
        focus: 'focus:ring-orange-500 focus:border-orange-500',
        border: 'border-orange-300',
        preset: 'border-orange-300 hover:bg-orange-50 text-orange-700',
        iconBg: 'bg-orange-50 group-hover:bg-orange-100',
        iconBgOpen: 'bg-orange-100',
        iconColor: 'text-orange-500',
        iconColorOpen: 'text-orange-600',
        ringOpen: 'ring-2 ring-orange-100',
        hoverBorder: 'hover:border-orange-400'
    }
};

const SIZE_CLASSES = {
    sm: 'h-8 text-xs px-2',
    md: 'h-10 text-sm px-3',
    lg: 'h-12 text-base px-4'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

const isInRange = (date: Date, start: Date | null, end: Date | null): boolean => {
    if (!start || !end) return false;
    const time = date.getTime();
    return time > start.getTime() && time < end.getTime();
};

const formatRangeDisplay = (range: DateRange): string => {
    if (!range.start && !range.end) return '';

    const formatDate = (d: Date): string => {
        const day = d.getDate();
        const month = MESI[d.getMonth()].substring(0, 3);
        return `${day} ${month}`;
    };

    if (range.start && !range.end) {
        return `${formatDate(range.start)} → ...`;
    }

    if (range.start && range.end) {
        if (isSameDay(range.start, range.end)) {
            return formatDate(range.start);
        }
        return `${formatDate(range.start)} → ${formatDate(range.end)}`;
    }

    return '';
};

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getEndOfWeek = (date: Date): Date => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
};

const getStartOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
};

const getEndOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

// ============================================
// RANGE CALENDAR POPUP COMPONENT
// ============================================

interface RangeCalendarPopupProps {
    range: DateRange;
    hoverDate: Date | null;
    onDayClick: (date: Date) => void;
    onDayHover: (date: Date | null) => void;
    onClose: () => void;
    onApply: () => void;
    onPreset: (range: DateRange) => void;
    onManualDateChange: (type: 'start' | 'end', value: string) => void;
    minDate?: Date;
    maxDate?: Date;
    theme: 'teal' | 'blue' | 'violet' | 'orange';
    position: { top: number; left: number };
    showPresets: boolean;
    showAdjacentDays: boolean;
    autoConfirm: boolean;
    customPresets?: Array<{ label: string; getRange: () => DateRange }>;
}

const RangeCalendarPopup: React.FC<RangeCalendarPopupProps> = ({
    range,
    hoverDate,
    onDayClick,
    onDayHover,
    onClose,
    onApply,
    onPreset,
    onManualDateChange,
    minDate,
    maxDate,
    theme,
    position,
    showPresets,
    showAdjacentDays,
    autoConfirm,
    customPresets
}) => {
    const today = new Date();
    const initialDate = range.start || today;
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [startInput, setStartInput] = useState(range.start ? formatDateInput(range.start) : '');
    const [endInput, setEndInput] = useState(range.end ? formatDateInput(range.end) : '');
    const [showMonthSelector, setShowMonthSelector] = useState(false);
    const [showYearSelector, setShowYearSelector] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const colors = THEME_COLORS[theme];

    // Format date for input field (DD/MM/YYYY)
    function formatDateInput(date: Date): string {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    }

    // Sync inputs when range changes
    useEffect(() => {
        setStartInput(range.start ? formatDateInput(range.start) : '');
        setEndInput(range.end ? formatDateInput(range.end) : '');
    }, [range.start, range.end]);

    // Handle manual input change
    const handleInputChange = (type: 'start' | 'end', value: string) => {
        // Allow only numbers and /
        const cleaned = value.replace(/[^\d/]/g, '');
        if (type === 'start') {
            setStartInput(cleaned);
        } else {
            setEndInput(cleaned);
        }

        // Auto-format: add / after DD and MM
        if (cleaned.length === 2 && !cleaned.includes('/')) {
            if (type === 'start') setStartInput(cleaned + '/');
            else setEndInput(cleaned + '/');
        } else if (cleaned.length === 5 && cleaned.split('/').length === 2) {
            if (type === 'start') setStartInput(cleaned + '/');
            else setEndInput(cleaned + '/');
        }

        // Parse complete date (DD/MM/YYYY)
        if (cleaned.length === 10) {
            onManualDateChange(type, cleaned);
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0 format
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

    const isDateDisabled = (date: Date): boolean => {
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return false;
    };

    // Determine visual range (including hover preview)
    const getEffectiveEnd = (): Date | null => {
        if (range.end) return range.end;
        if (range.start && hoverDate && hoverDate > range.start) return hoverDate;
        return null;
    };

    const effectiveEnd = getEffectiveEnd();

    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear);

    // Presets (custom or default)
    const activePresets = customPresets || [
        { label: 'Oggi', getRange: () => ({ start: today, end: today }) },
        { label: 'Questa settimana', getRange: () => ({ start: getStartOfWeek(today), end: getEndOfWeek(today) }) },
        { label: 'Questo mese', getRange: () => ({ start: getStartOfMonth(today), end: getEndOfMonth(today) }) },
        {
            label: 'Prossimi 7 giorni',
            getRange: () => {
                const end = new Date(today);
                end.setDate(end.getDate() + 6);
                return { start: today, end };
            }
        },
        {
            label: 'Prossimi 30 giorni',
            getRange: () => {
                const end = new Date(today);
                end.setDate(end.getDate() + 29);
                return { start: today, end };
            }
        },
        {
            label: 'Prossimi 3 mesi',
            getRange: () => {
                const end = new Date(today);
                end.setDate(end.getDate() + 89);
                return { start: today, end };
            }
        },
        {
            label: 'Prossimi 6 mesi',
            getRange: () => {
                const end = new Date(today);
                end.setDate(end.getDate() + 179);
                return { start: today, end };
            }
        },
        {
            label: '1 anno',
            getRange: () => {
                const end = new Date(today);
                end.setFullYear(end.getFullYear() + 1);
                end.setDate(end.getDate() - 1);
                return { start: today, end };
            }
        },
        {
            label: '2 anni',
            getRange: () => {
                const end = new Date(today);
                end.setFullYear(end.getFullYear() + 2);
                end.setDate(end.getDate() - 1);
                return { start: today, end };
            }
        }
    ];

    return createPortal(
        <div
            ref={popupRef}
            className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: position.top,
                left: position.left,
                width: showPresets ? '480px' : '340px'
            }}
        >
            <div className={`flex ${showPresets ? 'gap-4' : ''}`}>
                {/* Presets sidebar */}
                {showPresets && (
                    <div className="w-36 border-r border-gray-200 pr-4 space-y-1">
                        <p className="text-xs font-medium text-gray-500 mb-2">Preset</p>
                        {activePresets.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => onPreset(preset.getRange())}
                                className={`
                                    w-full text-left px-2 py-1.5 text-xs rounded-lg
                                    border ${colors.preset} transition-colors
                                `}
                                type="button"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Calendar */}
                <div className="flex-1">
                    {/* Header with clickable month/year */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={prevMonth}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            type="button"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </button>

                        <div className="flex items-center gap-1">
                            {/* Month Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowMonthSelector(!showMonthSelector);
                                        setShowYearSelector(false);
                                    }}
                                    className={`px-2 py-1 font-semibold rounded-lg transition-colors ${showMonthSelector
                                        ? 'bg-teal-100 text-teal-700'
                                        : 'text-gray-900 hover:bg-gray-100'
                                        }`}
                                    type="button"
                                >
                                    {MESI[viewMonth]}
                                </button>
                                {showMonthSelector && (
                                    <div className="absolute z-10 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-2 grid grid-cols-3 gap-1 w-48">
                                        {MESI.map((mese, idx) => (
                                            <button
                                                key={mese}
                                                onClick={() => {
                                                    setViewMonth(idx);
                                                    setShowMonthSelector(false);
                                                }}
                                                className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${idx === viewMonth
                                                    ? 'bg-teal-600 text-white'
                                                    : 'text-gray-700 hover:bg-teal-50'
                                                    }`}
                                                type="button"
                                            >
                                                {mese.substring(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Year Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowYearSelector(!showYearSelector);
                                        setShowMonthSelector(false);
                                    }}
                                    className={`px-2 py-1 font-semibold rounded-lg transition-colors ${showYearSelector
                                        ? 'bg-teal-100 text-teal-700'
                                        : 'text-gray-900 hover:bg-gray-100'
                                        }`}
                                    type="button"
                                >
                                    {viewYear}
                                </button>
                                {showYearSelector && (
                                    <div className="absolute z-10 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-2 grid grid-cols-4 gap-1 w-48 max-h-48 overflow-y-auto">
                                        {Array.from({ length: 20 }, (_, i) => today.getFullYear() - 5 + i).map((year) => (
                                            <button
                                                key={year}
                                                onClick={() => {
                                                    setViewYear(year);
                                                    setShowYearSelector(false);
                                                }}
                                                className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${year === viewYear
                                                    ? 'bg-teal-600 text-white'
                                                    : year === today.getFullYear()
                                                        ? 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                                                        : 'text-gray-700 hover:bg-teal-50'
                                                    }`}
                                                type="button"
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={nextMonth}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            type="button"
                        >
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>

                    {/* Manual input fields */}
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="block text-[10px] font-medium text-gray-500 mb-1">Da</label>
                                <input
                                    type="text"
                                    value={startInput}
                                    onChange={(e) => handleInputChange('start', e.target.value)}
                                    placeholder="GG/MM/AAAA"
                                    className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${colors.focus} focus:outline-none focus:ring-1`}
                                    maxLength={10}
                                />
                            </div>
                            <span className="text-gray-400 mt-4">→</span>
                            <div className="flex-1">
                                <label className="block text-[10px] font-medium text-gray-500 mb-1">A</label>
                                <input
                                    type="text"
                                    value={endInput}
                                    onChange={(e) => handleInputChange('end', e.target.value)}
                                    placeholder="GG/MM/AAAA"
                                    className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${colors.focus} focus:outline-none focus:ring-1`}
                                    maxLength={10}
                                />
                            </div>
                        </div>
                        {!range.start && (
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                Clicca su un giorno o digita le date
                            </p>
                        )}
                    </div>

                    {/* Days of week header */}
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {GIORNI_SETTIMANA.map(giorno => (
                            <div key={giorno} className="text-center text-xs font-medium text-gray-400 py-1">
                                {giorno}
                            </div>
                        ))}
                    </div>

                    {/* Days grid - includes adjacent month days */}
                    <div className="grid grid-cols-7 gap-0.5">
                        {(() => {
                            const days: React.ReactNode[] = [];

                            // Calculate days from previous month to show
                            const prevMonthDays = firstDay;
                            const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
                            const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
                            const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

                            // Add previous month's trailing days
                            if (showAdjacentDays && prevMonthDays > 0) {
                                for (let i = prevMonthDays - 1; i >= 0; i--) {
                                    const day = daysInPrevMonth - i;
                                    const date = new Date(prevYear, prevMonth, day);
                                    const isStart = isSameDay(date, range.start);
                                    const isEnd = isSameDay(date, range.end) || isSameDay(date, effectiveEnd);
                                    const inRange = isInRange(date, range.start, effectiveEnd);

                                    days.push(
                                        <button
                                            key={`prev-${day}`}
                                            onClick={() => onDayClick(date)}
                                            onMouseEnter={() => onDayHover(date)}
                                            onMouseLeave={() => onDayHover(null)}
                                            className={`
                                                h-9 w-full text-sm font-medium transition-all rounded-lg
                                                ${isStart || isEnd ? `${colors.selected} text-white` : ''}
                                                ${inRange && !isStart && !isEnd ? colors.range : ''}
                                                ${!isStart && !isEnd && !inRange ? 'text-gray-300 hover:bg-gray-50' : ''}
                                            `}
                                            type="button"
                                        >
                                            {day}
                                        </button>
                                    );
                                }
                            } else {
                                // Empty cells if not showing adjacent days
                                for (let i = 0; i < firstDay; i++) {
                                    days.push(<div key={`empty-${i}`} className="h-9" />);
                                }
                            }

                            // Current month days
                            for (let i = 0; i < daysInMonth; i++) {
                                const day = i + 1;
                                const date = new Date(viewYear, viewMonth, day);
                                const isStart = isSameDay(date, range.start);
                                const isEnd = isSameDay(date, range.end) || isSameDay(date, effectiveEnd);
                                const inRange = isInRange(date, range.start, effectiveEnd);
                                const isCurrentToday = isSameDay(date, today);
                                const disabled = isDateDisabled(date);
                                const isHovered = isSameDay(date, hoverDate);

                                let dayClass = 'text-gray-700 hover:bg-gray-100';
                                let bgClass = '';
                                let roundedClass = 'rounded-lg';

                                if (disabled) {
                                    dayClass = 'text-gray-300 cursor-not-allowed';
                                } else if (isStart || isEnd) {
                                    dayClass = 'text-white font-medium';
                                    bgClass = colors.selected;
                                    if (isStart && effectiveEnd && !isSameDay(range.start, effectiveEnd)) {
                                        roundedClass = 'rounded-l-lg rounded-r-none';
                                    } else if (isEnd && range.start && !isSameDay(range.start, effectiveEnd)) {
                                        roundedClass = 'rounded-r-lg rounded-l-none';
                                    }
                                } else if (inRange) {
                                    bgClass = isHovered ? colors.rangeHover : colors.range;
                                    roundedClass = 'rounded-none';
                                }

                                days.push(
                                    <button
                                        key={day}
                                        onClick={() => !disabled && onDayClick(date)}
                                        onMouseEnter={() => !disabled && onDayHover(date)}
                                        onMouseLeave={() => onDayHover(null)}
                                        disabled={disabled}
                                        className={`
                                            h-9 w-full text-sm font-medium transition-all
                                            ${bgClass} ${dayClass} ${roundedClass}
                                            ${isCurrentToday && !isStart && !isEnd ? colors.today : ''}
                                        `}
                                        type="button"
                                    >
                                        {day}
                                    </button>
                                );
                            }

                            // Calculate how many days from next month to show (fill to 42 cells = 6 weeks)
                            if (showAdjacentDays) {
                                const totalCells = 42;
                                const remainingCells = totalCells - days.length;
                                const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
                                const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

                                for (let i = 1; i <= remainingCells; i++) {
                                    const date = new Date(nextYear, nextMonth, i);
                                    const isStart = isSameDay(date, range.start);
                                    const isEnd = isSameDay(date, range.end) || isSameDay(date, effectiveEnd);
                                    const inRange = isInRange(date, range.start, effectiveEnd);

                                    days.push(
                                        <button
                                            key={`next-${i}`}
                                            onClick={() => onDayClick(date)}
                                            onMouseEnter={() => onDayHover(date)}
                                            onMouseLeave={() => onDayHover(null)}
                                            className={`
                                                h-9 w-full text-sm font-medium transition-all rounded-lg
                                                ${isStart || isEnd ? `${colors.selected} text-white` : ''}
                                                ${inRange && !isStart && !isEnd ? colors.range : ''}
                                                ${!isStart && !isEnd && !inRange ? 'text-gray-300 hover:bg-gray-50' : ''}
                                            `}
                                            type="button"
                                        >
                                            {i}
                                        </button>
                                    );
                                }
                            }

                            return days;
                        })()}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                <button
                    onClick={() => {
                        const todayDate = new Date();
                        setViewMonth(todayDate.getMonth());
                        setViewYear(todayDate.getFullYear());
                    }}
                    className={`text-sm ${colors.button} font-medium flex items-center gap-1 px-2 py-1 rounded-lg`}
                    type="button"
                >
                    <CalendarDays className="h-4 w-4" />
                    Oggi
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onClose}
                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        type="button"
                    >
                        {autoConfirm ? 'Chiudi' : 'Annulla'}
                    </button>
                    {!autoConfirm && (
                        <button
                            onClick={onApply}
                            disabled={!range.start}
                            className={`
                                text-sm font-medium px-3 py-1.5 rounded-lg transition-colors
                                flex items-center gap-1
                                ${range.start
                                    ? `${colors.selected} text-white hover:opacity-90`
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }
                            `}
                            type="button"
                        >
                            Applica
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// ============================================
// MAIN DATE RANGE CALENDAR COMPONENT
// ============================================

export const DateRangeCalendar: React.FC<DateRangeCalendarProps> = ({
    value,
    onChange,
    placeholder = 'Seleziona periodo',
    label,
    disabled = false,
    clearable = true,
    minDate,
    maxDate,
    className = '',
    theme = 'teal',
    size = 'md',
    showPresets = true,
    autoConfirm = true,
    showAdjacentDays = true,
    customPresets
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [tempRange, setTempRange] = useState<DateRange>(value);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const inputRef = useRef<HTMLButtonElement>(null);
    const colors = THEME_COLORS[theme];
    const sizeClass = SIZE_CLASSES[size];

    // Sync temp range with value when opening
    useEffect(() => {
        if (isOpen) {
            setTempRange(value);
        }
    }, [isOpen, value]);

    const handleOpen = useCallback(() => {
        if (disabled) return;

        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const popupHeight = 450;
            const popupWidth = showPresets ? 480 : 340;

            setPosition({
                top: spaceBelow > popupHeight ? rect.bottom + 8 : rect.top - popupHeight - 8,
                left: Math.min(rect.left, window.innerWidth - popupWidth - 20)
            });
        }
        setIsOpen(true);
    }, [disabled, showPresets]);

    const handleDayClick = (date: Date) => {
        if (!tempRange.start || (tempRange.start && tempRange.end)) {
            // Start new selection
            setTempRange({ start: date, end: null });
        } else {
            // Complete selection
            let finalRange: DateRange;
            if (date < tempRange.start) {
                // Clicked before start - swap
                finalRange = { start: date, end: tempRange.start };
            } else {
                finalRange = { start: tempRange.start, end: date };
            }
            setTempRange(finalRange);

            // Auto-confirm: apply immediately on second click
            if (autoConfirm) {
                onChange(finalRange);
                setIsOpen(false);
            }
        }
    };

    const handleManualDateChange = (type: 'start' | 'end', value: string) => {
        // Parse DD/MM/YYYY format
        const parts = value.split('/');
        if (parts.length !== 3) return;

        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year)) return;
        if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900) return;

        const date = new Date(year, month, day);

        // Validate the date is real (e.g., not Feb 31)
        if (date.getDate() !== day || date.getMonth() !== month) return;

        if (type === 'start') {
            const newRange = { start: date, end: tempRange.end };
            // If end is before new start, swap
            if (newRange.end && newRange.end < date) {
                newRange.end = date;
            }
            setTempRange(newRange);
            // Auto-confirm if both dates set
            if (autoConfirm && newRange.end) {
                onChange(newRange);
                setIsOpen(false);
            }
        } else {
            const newRange = { start: tempRange.start, end: date };
            // If new end is before start, swap
            if (newRange.start && date < newRange.start) {
                newRange.start = date;
            }
            setTempRange(newRange);
            // Auto-confirm if both dates set
            if (autoConfirm && newRange.start) {
                onChange(newRange);
                setIsOpen(false);
            }
        }
    };

    const handleApply = () => {
        // If only start selected, use same date as end (single day)
        const finalRange = tempRange.end
            ? tempRange
            : { start: tempRange.start, end: tempRange.start };
        onChange(finalRange);
        setIsOpen(false);
    };

    const handlePreset = (range: DateRange) => {
        setTempRange(range);
        // Auto-apply and close when preset is clicked
        onChange(range);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange({ start: null, end: null });
    };

    const displayValue = formatRangeDisplay(value) || placeholder;
    const hasValue = value.start !== null;

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <button
                ref={inputRef}
                onClick={handleOpen}
                disabled={disabled}
                type="button"
                className={`
                    flex items-center gap-3 group
                    ${sizeClass}
                    bg-gradient-to-r from-white to-gray-50
                    border rounded-xl shadow-sm
                    ${!disabled
                        ? `border-gray-200 ${colors.hoverBorder} hover:shadow-md ${colors.focus}`
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }
                    focus:outline-none focus:ring-2 focus:ring-offset-1
                    transition-all duration-300 ease-out
                    ${isOpen ? `${colors.border} shadow-md ${colors.ringOpen}` : ''}
                `}
            >
                <div className={`
                    p-1.5 rounded-lg transition-colors duration-200
                    ${isOpen ? colors.iconBgOpen : colors.iconBg}
                `}>
                    <CalendarDays className={`h-4 w-4 ${isOpen ? colors.iconColorOpen : colors.iconColor}`} />
                </div>

                <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                        Periodo
                    </span>
                    <span className={`font-medium truncate ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}>
                        {displayValue}
                    </span>
                </div>

                {clearable && hasValue && !disabled && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={handleClear}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClear(e as unknown as React.MouseEvent); }}
                        className="ml-auto p-1.5 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 group/clear cursor-pointer"
                    >
                        <X className="h-3.5 w-3.5 text-gray-400 group-hover/clear:text-red-500" />
                    </span>
                )}
            </button>

            {isOpen && (
                <RangeCalendarPopup
                    range={tempRange}
                    hoverDate={hoverDate}
                    onDayClick={handleDayClick}
                    onDayHover={setHoverDate}
                    onClose={() => setIsOpen(false)}
                    onApply={handleApply}
                    onPreset={handlePreset}
                    onManualDateChange={handleManualDateChange}
                    minDate={minDate}
                    maxDate={maxDate}
                    theme={theme}
                    position={position}
                    showPresets={showPresets}
                    showAdjacentDays={showAdjacentDays}
                    autoConfirm={autoConfirm}
                    customPresets={customPresets}
                />
            )}
        </div>
    );
};

export default DateRangeCalendar;
