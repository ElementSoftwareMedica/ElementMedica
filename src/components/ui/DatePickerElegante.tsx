/**
 * DatePickerElegante - Componente DatePicker moderno ed elegante
 * 
 * Sostituisce i classici <input type="date" /> con un popup calendario
 * animato e stilizzato in modo moderno.
 * 
 * Features:
 * - Design moderno con animazioni
 * - Input da tastiera in formato DD/MM/YYYY con auto-formattazione
 * - Popup calendario cliccabile
 * - Supporto range date
 * - Navigazione mese/anno fluida
 * - Today highlight
 * - Responsive e accessibile
 * 
 * @module components/ui/DatePickerElegante
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

export interface DatePickerEleganteProps {
    /** Data selezionata */
    value: Date | string | null;
    /** Callback quando cambia la data */
    onChange: (date: Date | null) => void;
    /** Placeholder quando nessuna data è selezionata */
    placeholder?: string;
    /** Label sopra l'input */
    label?: string;
    /** Disabilita il picker */
    disabled?: boolean;
    /** Mostra bottone clear */
    clearable?: boolean;
    /** Formato display personalizzato */
    formatDisplay?: (date: Date) => string;
    /** Min date selezionabile */
    minDate?: Date;
    /** Max date selezionabile */
    maxDate?: Date;
    /** Classe CSS aggiuntiva per il container */
    className?: string;
    /** Tema colore (default: teal) */
    theme?: 'teal' | 'blue' | 'violet';
    /** Dimensione */
    size?: 'sm' | 'md' | 'lg';
    /** Preset rapidi mostrati nel popup calendario */
    quickPresets?: { label: string; date: Date }[];
    /** Calendario compatto (popup più stretto, celle più piccole) — usato in spazi ridotti */
    compact?: boolean;
}

// Range date picker
export interface DateRangePickerProps {
    /** Data inizio */
    startDate: Date | string | null;
    /** Data fine */
    endDate: Date | string | null;
    /** Callback per data inizio */
    onStartChange: (date: Date | null) => void;
    /** Callback per data fine */
    onEndChange: (date: Date | null) => void;
    /** Labels */
    startLabel?: string;
    endLabel?: string;
    /** Placeholder */
    startPlaceholder?: string;
    endPlaceholder?: string;
    /** Disabilitato */
    disabled?: boolean;
    /** Classe container */
    className?: string;
    /** Tema */
    theme?: 'teal' | 'blue' | 'violet';
    /** Dimensione */
    size?: 'sm' | 'md' | 'lg';
}

// ============================================
// CONSTANTS
// ============================================

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const THEME_COLORS = {
    teal: {
        selected: 'bg-gradient-to-br from-teal-500 to-teal-600',
        today: 'bg-teal-100 text-teal-700',
        hover: 'hover:bg-teal-50',
        range: 'bg-teal-50 text-teal-700',
        button: 'text-teal-600 hover:text-teal-700',
        focusBorder: 'border-teal-400',
        border: 'border-teal-300'
    },
    blue: {
        selected: 'bg-gradient-to-br from-blue-500 to-blue-600',
        today: 'bg-blue-100 text-blue-700',
        hover: 'hover:bg-blue-50',
        range: 'bg-blue-50 text-blue-700',
        button: 'text-blue-600 hover:text-blue-700',
        focusBorder: 'border-blue-400',
        border: 'border-blue-300'
    },
    violet: {
        selected: 'bg-gradient-to-br from-violet-500 to-violet-600',
        today: 'bg-violet-100 text-violet-700',
        hover: 'hover:bg-violet-50',
        range: 'bg-violet-50 text-violet-700',
        button: 'text-violet-600 hover:text-violet-700',
        focusBorder: 'border-violet-400',
        border: 'border-violet-300'
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

const parseDate = (value: Date | string | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    // Handle YYYY-MM-DD strings as LOCAL dates at noon (not UTC midnight)
    // Using noon prevents timezone day-shift when callers do toISOString().split('T')[0]
    const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3], 12, 0, 0);
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

const formatDateDefault = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) return 'Oggi';
    if (isSameDay(date, tomorrow)) return 'Domani';
    if (isSameDay(date, yesterday)) return 'Ieri';

    const day = date.getDate();
    const month = MESI[date.getMonth()].substring(0, 3);
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
};

const formatDateShort = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

// ============================================
// CALENDAR POPUP COMPONENT
// ============================================

interface CalendarPopupProps {
    selectedDate: Date | null;
    onSelect: (date: Date) => void;
    onClose: () => void;
    minDate?: Date;
    maxDate?: Date;
    theme: 'teal' | 'blue' | 'violet';
    position: { top: number; left: number };
    isRangeMode?: boolean;
    rangeStart?: Date | null;
    rangeEnd?: Date | null;
    quickPresets?: { label: string; date: Date }[];
    compact?: boolean;
}

const CalendarPopup: React.FC<CalendarPopupProps> = ({
    selectedDate,
    onSelect,
    onClose,
    minDate,
    maxDate,
    theme,
    position,
    isRangeMode = false,
    rangeStart,
    rangeEnd,
    quickPresets,
    compact = false
}) => {
    const initialDate = selectedDate || new Date();
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const colors = THEME_COLORS[theme];

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Close on escape key
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
        // Monday-based: Mon=0, Tue=1, ..., Sun=6
        return day === 0 ? 6 : day - 1;
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
        if (!isRangeMode) onClose();
    };

    const selectYear = (year: number) => {
        setViewYear(year);
        setShowYearPicker(false);
    };

    const selectMonth = (month: number) => {
        setViewMonth(month);
        setShowMonthPicker(false);
    };

    const isDateDisabled = (date: Date): boolean => {
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return false;
    };

    const isInRange = (day: number): boolean => {
        if (!isRangeMode || !rangeStart || !rangeEnd) return false;
        const current = new Date(viewYear, viewMonth, day);
        return current > rangeStart && current < rangeEnd;
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

    // Generate year options (20 years back and forward)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 41 }, (_, i) => currentYear - 20 + i);

    return createPortal(
        <div
            ref={popupRef}
            className={`fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200 ${compact ? 'p-3 w-[280px]' : 'p-4 w-[340px]'}`}
            style={{
                top: position.top,
                left: position.left
            }}
        >
            {/* Header */}
            <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
                <button
                    onClick={prevMonth}
                    className={`${compact ? 'p-1' : 'p-2'} hover:bg-gray-100 rounded-lg transition-colors`}
                    type="button"
                >
                    <ChevronLeft className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-gray-600`} />
                </button>

                <div className="flex items-center gap-1">
                    {/* Month selector */}
                    <button
                        onClick={() => {
                            setShowMonthPicker(!showMonthPicker);
                            setShowYearPicker(false);
                        }}
                        className={`hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors ${showMonthPicker ? 'bg-gray-100' : ''}`}
                        type="button"
                    >
                        <span className="font-semibold text-gray-900">
                            {MESI[viewMonth]}
                        </span>
                    </button>
                    {/* Year selector */}
                    <button
                        onClick={() => {
                            setShowYearPicker(!showYearPicker);
                            setShowMonthPicker(false);
                        }}
                        className={`hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors ${showYearPicker ? 'bg-gray-100' : ''}`}
                        type="button"
                    >
                        <span className="font-semibold text-gray-900">
                            {viewYear}
                        </span>
                    </button>
                </div>

                <button
                    onClick={nextMonth}
                    className={`${compact ? 'p-1' : 'p-2'} hover:bg-gray-100 rounded-lg transition-colors`}
                    type="button"
                >
                    <ChevronRight className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-gray-600`} />
                </button>
            </div>

            {/* Month Picker */}
            {showMonthPicker && (
                <div className="absolute left-0 right-0 top-14 mx-4 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-10">
                    <div className="grid grid-cols-3 gap-2">
                        {MESI.map((mese, index) => (
                            <button
                                key={mese}
                                onClick={() => selectMonth(index)}
                                className={`
                                    px-2 py-2 rounded-lg text-sm font-medium transition-all
                                    ${index === viewMonth
                                        ? `${colors.selected} text-white`
                                        : 'hover:bg-gray-100 text-gray-700'
                                    }
                                `}
                                type="button"
                            >
                                {mese.substring(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Year Picker */}
            {showYearPicker && (
                <div className="absolute left-0 right-0 top-14 mx-4 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-10 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-2">
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => selectYear(year)}
                                className={`
                                    px-2 py-1.5 rounded-lg text-sm font-medium transition-all
                                    ${year === viewYear
                                        ? `${colors.selected} text-white`
                                        : 'hover:bg-gray-100 text-gray-700'
                                    }
                                `}
                                type="button"
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
                    <div key={`empty-${i}`} className={compact ? 'h-8' : 'h-10'} />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const date = new Date(viewYear, viewMonth, day);
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    const isCurrentDay = isSameDay(date, today);
                    const disabled = isDateDisabled(date);
                    const inRange = isInRange(day);
                    const isStart = isRangeStart(day);
                    const isEnd = isRangeEnd(day);

                    return (
                        <button
                            key={day}
                            onClick={() => !disabled && onSelect(date)}
                            disabled={disabled}
                            className={`
                                ${compact ? 'h-8 text-xs' : 'h-10 text-sm'} w-full rounded-lg font-medium transition-all
                                ${disabled
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : isSelected
                                        ? `${colors.selected} text-white shadow-md`
                                        : isCurrentDay
                                            ? `${colors.today} font-bold ring-1 ${colors.border}`
                                            : inRange
                                                ? colors.range
                                                : `text-gray-700 ${colors.hover}`
                                }
                                ${isStart && 'rounded-r-none'}
                                ${isEnd && 'rounded-l-none'}
                                ${inRange && !isStart && !isEnd && 'rounded-none'}
                            `}
                            type="button"
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className={`${compact ? 'mt-3 pt-2' : 'mt-4 pt-3'} border-t border-gray-100 space-y-2`}>
                {quickPresets && quickPresets.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5">
                        {quickPresets.map(p => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => { onSelect(p.date); onClose(); }}
                                className={`text-xs font-medium px-2 py-1.5 rounded-lg border border-gray-200 hover:border-transparent ${colors.hover} ${colors.button} transition-colors`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex justify-between items-center">
                    <button
                        onClick={goToToday}
                        className={`text-sm ${colors.button} font-medium flex items-center gap-1`}
                        type="button"
                    >
                        <CalendarDays className="h-4 w-4" />
                        Oggi
                    </button>
                    <button
                        onClick={onClose}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        type="button"
                    >
                        <X className="h-4 w-4" />
                        Chiudi
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ============================================
// HELPER: Parse DD/MM/YYYY string to Date
// ============================================

const parseDateFromInput = (text: string): Date | null => {
    const cleaned = text.trim();
    // Accept DD/MM/YYYY
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    if (month < 0 || month > 11) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1900 || year > 2100) return null;
    // Use noon to prevent timezone day-shift when callers convert to ISO string
    const date = new Date(year, month, day, 12, 0, 0);
    // Verify the date is valid (e.g. no Feb 30)
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
    }
    return date;
};

// Auto-format input: add slashes as user types
const autoFormatDateInput = (raw: string): string => {
    // Strip non-digits
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

// ============================================
// MAIN DATEPICKER COMPONENT
// ============================================

export const DatePickerElegante: React.FC<DatePickerEleganteProps> = ({
    value,
    onChange,
    placeholder = 'Seleziona data',
    label,
    disabled = false,
    clearable = true,
    formatDisplay,
    minDate,
    maxDate,
    className = '',
    theme = 'teal',
    size = 'md',
    quickPresets,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const colors = THEME_COLORS[theme];
    const sizeClass = SIZE_CLASSES[size];

    const parsedValue = useMemo(() => parseDate(value), [value]);

    // Sync input text with external value when not focused
    useEffect(() => {
        if (!isFocused) {
            setInputText(parsedValue ? formatDateShort(parsedValue) : '');
        }
    }, [parsedValue, isFocused]);

    const openPopup = useCallback(() => {
        if (disabled) return;
        const el = containerRef.current;
        if (el) {
            const rect = el.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const popupHeight = 400;
            setPosition({
                top: spaceBelow > popupHeight ? rect.bottom + 8 : rect.top - popupHeight - 8,
                left: Math.min(rect.left, window.innerWidth - 350)
            });
        }
        setIsOpen(true);
    }, [disabled]);

    const handleSelect = useCallback((date: Date) => {
        // Normalize to noon to prevent timezone day-shift in toISOString()
        const noonDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
        onChange(noonDate);
        setInputText(formatDateShort(noonDate));
        setIsOpen(false);
        // Refocus the input
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [onChange]);

    const handleClear = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(null);
        setInputText('');
        inputRef.current?.focus();
    }, [onChange]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const formatted = autoFormatDateInput(raw);
        setInputText(formatted);

        // Auto-select date when fully typed (DD/MM/YYYY = 10 chars)
        if (formatted.length === 10) {
            const date = parseDateFromInput(formatted);
            if (date) {
                const isValid = (!minDate || date >= minDate) && (!maxDate || date <= maxDate);
                if (isValid) {
                    onChange(date);
                }
            }
        }
    }, [onChange, minDate, maxDate]);

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        // Don't auto-open popup on focus - let user type freely
        // Popup opens via calendar icon click or ArrowDown key
        // Select all text so user can immediately type to replace
        setTimeout(() => inputRef.current?.select(), 0);
    }, [disabled]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        // Validate on blur
        if (inputText === '') {
            // Clear if emptied
            if (parsedValue) onChange(null);
            return;
        }
        const date = parseDateFromInput(inputText);
        if (date) {
            const isValid = (!minDate || date >= minDate) && (!maxDate || date <= maxDate);
            if (isValid) {
                // Only re-emit if the date actually changed to avoid timezone round-trip loss
                if (!parsedValue || !isSameDay(date, parsedValue)) {
                    onChange(date);
                }
                setInputText(formatDateShort(date));
            } else {
                // Revert to current value
                setInputText(parsedValue ? formatDateShort(parsedValue) : '');
            }
        } else {
            // Invalid text, revert
            setInputText(parsedValue ? formatDateShort(parsedValue) : '');
        }
    }, [inputText, parsedValue, onChange, minDate, maxDate]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const date = parseDateFromInput(inputText);
            if (date) {
                const isValid = (!minDate || date >= minDate) && (!maxDate || date <= maxDate);
                if (isValid) {
                    onChange(date);
                    setIsOpen(false);
                }
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setInputText(parsedValue ? formatDateShort(parsedValue) : '');
        } else if (e.key === 'ArrowDown' && !isOpen) {
            e.preventDefault();
            openPopup();
        }
    }, [inputText, parsedValue, onChange, minDate, maxDate, isOpen, openPopup]);

    // Display value: when focused show DD/MM/YYYY text, otherwise friendly format
    const displayValue = isFocused
        ? inputText
        : (parsedValue
            ? (formatDisplay ? formatDisplay(parsedValue) : formatDateDefault(parsedValue))
            : '');

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <div
                className={`
                    w-full flex items-center gap-2
                    ${sizeClass}
                    bg-white border border-gray-300 rounded-lg
                    outline-none ring-0
                    ${!disabled ? 'hover:border-gray-400' : 'bg-gray-50 cursor-not-allowed'}
                    ${isFocused || isOpen ? colors.focusBorder : ''}
                    transition-all duration-200
                `}
            >
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={openPopup}
                    disabled={disabled}
                    className="flex-shrink-0 p-0 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity"
                    aria-label="Apri calendario"
                >
                    <Calendar className={`h-4 w-4 ${parsedValue ? 'text-gray-600' : 'text-gray-400'}`} />
                </button>

                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={displayValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    className={`
                        flex-1 min-w-0 bg-transparent border-none outline-none
                        focus:outline-none focus-visible:outline-none focus:ring-0
                        ${parsedValue || inputText ? 'text-gray-900' : 'text-gray-400'}
                        placeholder:text-gray-400
                        text-inherit
                        ${disabled ? 'cursor-not-allowed' : ''}
                    `}
                    aria-label={label || placeholder}
                />

                {clearable && parsedValue && !disabled && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={handleClear}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 cursor-pointer"
                        aria-label="Cancella data"
                    >
                        <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {isOpen && (
                <CalendarPopup
                    selectedDate={parsedValue}
                    onSelect={handleSelect}
                    onClose={() => setIsOpen(false)}
                    minDate={minDate}
                    maxDate={maxDate}
                    theme={theme}
                    position={position}
                    quickPresets={quickPresets}
                    compact={compact}
                />
            )}
        </div>
    );
};

// ============================================
// DATE RANGE PICKER COMPONENT
// ============================================

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onStartChange,
    onEndChange,
    startLabel = 'Da',
    endLabel = 'A',
    startPlaceholder = 'Data inizio',
    endPlaceholder = 'Data fine',
    disabled = false,
    className = '',
    theme = 'teal',
    size = 'md'
}) => {
    const parsedStart = parseDate(startDate);
    const parsedEnd = parseDate(endDate);

    return (
        <div className={`flex items-end gap-2 ${className}`}>
            <DatePickerElegante
                value={parsedStart}
                onChange={onStartChange}
                label={startLabel}
                placeholder={startPlaceholder}
                disabled={disabled}
                theme={theme}
                size={size}
                maxDate={parsedEnd || undefined}
                className="flex-1"
            />
            <span className="text-gray-400 pb-2.5">—</span>
            <DatePickerElegante
                value={parsedEnd}
                onChange={onEndChange}
                label={endLabel}
                placeholder={endPlaceholder}
                disabled={disabled}
                theme={theme}
                size={size}
                minDate={parsedStart || undefined}
                className="flex-1"
            />
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export default DatePickerElegante;
