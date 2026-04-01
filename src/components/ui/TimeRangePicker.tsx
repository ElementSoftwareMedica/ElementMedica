/**
 * TimeRangePicker - Selettore elegante per range orario con dual-range slider
 * 
 * Features:
 * - Dual-range slider visivo (drag & drop)
 * - Preset rapidi (Mattina, Pomeriggio, Sera, Giornata)
 * - Clear/confirm
 * - Design compatto e user-friendly con tema teal
 * 
 * @module components/ui/TimeRangePicker
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, ChevronDown, Check } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface TimeRange {
    start: string | null; // "HH:MM" format
    end: string | null;
}

export interface TimeRangePickerProps {
    /** Range orario selezionato */
    value: TimeRange;
    /** Callback quando cambia il range */
    onChange: (range: TimeRange) => void;
    /** Placeholder quando nessun range è selezionato */
    placeholder?: string;
    /** Label sopra l'input */
    label?: string;
    /** Disabilita il picker */
    disabled?: boolean;
    /** Mostra bottone clear */
    clearable?: boolean;
    /** Classe CSS aggiuntiva */
    className?: string;
    /** Tema colore */
    theme?: 'teal' | 'blue' | 'violet';
    /** Dimensione */
    size?: 'sm' | 'md' | 'lg';
    /** Intervallo in minuti per lo slider (default: 15) */
    interval?: number;
    /** Ora minima selezionabile (default: "06:00") */
    minTime?: string;
    /** Ora massima selezionabile (default: "22:00") */
    maxTime?: string;
}

// ============================================
// CONSTANTS
// ============================================

const THEME_COLORS = {
    teal: {
        selected: 'bg-teal-600 text-white',
        hover: 'hover:bg-teal-50',
        focus: 'focus:ring-teal-500 focus:border-teal-500',
        border: 'border-teal-300',
        icon: 'text-teal-500',
        iconBg: 'bg-teal-50 group-hover:bg-teal-100',
        iconActive: 'bg-teal-100',
        slider: '#0d9488',       // teal-600
        sliderLight: '#ccfbf1',  // teal-100
        sliderMid: '#99f6e4',    // teal-200
        presetActive: 'bg-teal-50 border-teal-300 text-teal-700',
        presetHover: 'hover:bg-teal-50 hover:border-teal-200',
    },
    blue: {
        selected: 'bg-blue-600 text-white',
        hover: 'hover:bg-blue-50',
        focus: 'focus:ring-blue-500 focus:border-blue-500',
        border: 'border-blue-300',
        icon: 'text-blue-500',
        iconBg: 'bg-blue-50 group-hover:bg-blue-100',
        iconActive: 'bg-blue-100',
        slider: '#2563eb',
        sliderLight: '#dbeafe',
        sliderMid: '#bfdbfe',
        presetActive: 'bg-blue-50 border-blue-300 text-blue-700',
        presetHover: 'hover:bg-blue-50 hover:border-blue-200',
    },
    violet: {
        selected: 'bg-violet-600 text-white',
        hover: 'hover:bg-violet-50',
        focus: 'focus:ring-violet-500 focus:border-violet-500',
        border: 'border-violet-300',
        icon: 'text-violet-500',
        iconBg: 'bg-violet-50 group-hover:bg-violet-100',
        iconActive: 'bg-violet-100',
        slider: '#7c3aed',
        sliderLight: '#ede9fe',
        sliderMid: '#ddd6fe',
        presetActive: 'bg-violet-50 border-violet-300 text-violet-700',
        presetHover: 'hover:bg-violet-50 hover:border-violet-200',
    }
};

const SIZE_CLASSES = {
    sm: 'h-8 text-xs px-2',
    md: 'h-10 text-sm px-3',
    lg: 'h-12 text-base px-4'
};

const QUICK_PRESETS = [
    { label: 'Mattina', start: '08:00', end: '13:00', icon: '🌅' },
    { label: 'Pomeriggio', start: '13:00', end: '18:00', icon: '☀️' },
    { label: 'Sera', start: '18:00', end: '21:00', icon: '🌆' },
    { label: 'Giornata', start: '08:00', end: '20:00', icon: '📅' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const minutesToTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const formatTimeDisplay = (range: TimeRange): string => {
    if (!range.start && !range.end) return '';
    if (range.start && !range.end) return `Dalle ${range.start}`;
    if (!range.start && range.end) return `Fino alle ${range.end}`;
    return `${range.start} – ${range.end}`;
};

// ============================================
// DUAL RANGE SLIDER COMPONENT
// ============================================

interface DualRangeSliderProps {
    startMinutes: number;
    endMinutes: number;
    minMinutes: number;
    maxMinutes: number;
    step: number;
    onStartChange: (val: number) => void;
    onEndChange: (val: number) => void;
    themeColor: string;
    themeLight: string;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
    startMinutes, endMinutes, minMinutes, maxMinutes, step,
    onStartChange, onEndChange, themeColor, themeLight
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

    const range = maxMinutes - minMinutes;
    const startPct = ((startMinutes - minMinutes) / range) * 100;
    const endPct = ((endMinutes - minMinutes) / range) * 100;

    const getMinutesFromMouse = useCallback((clientX: number) => {
        if (!trackRef.current) return minMinutes;
        const rect = trackRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const raw = minMinutes + pct * range;
        return Math.round(raw / step) * step;
    }, [minMinutes, range, step]);

    useEffect(() => {
        if (!dragging) return;
        const handleMouseMove = (e: MouseEvent) => {
            const val = getMinutesFromMouse(e.clientX);
            if (dragging === 'start') {
                onStartChange(Math.min(val, endMinutes - step));
            } else {
                onEndChange(Math.max(val, startMinutes + step));
            }
        };
        const handleMouseUp = () => setDragging(null);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, startMinutes, endMinutes, step, getMinutesFromMouse, onStartChange, onEndChange]);

    // Touch support
    useEffect(() => {
        if (!dragging) return;
        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            const val = getMinutesFromMouse(touch.clientX);
            if (dragging === 'start') {
                onStartChange(Math.min(val, endMinutes - step));
            } else {
                onEndChange(Math.max(val, startMinutes + step));
            }
        };
        const handleTouchEnd = () => setDragging(null);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        return () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [dragging, startMinutes, endMinutes, step, getMinutesFromMouse, onStartChange, onEndChange]);

    // Tick marks for hours
    const ticks: number[] = [];
    for (let m = minMinutes; m <= maxMinutes; m += 60) {
        ticks.push(m);
    }

    return (
        <div className="pt-2 pb-6 px-1">
            {/* Time labels */}
            <div className="flex justify-between items-center mb-4">
                <div className="text-center">
                    <span className="text-2xl font-bold" style={{ color: themeColor }}>
                        {minutesToTime(startMinutes)}
                    </span>
                </div>
                <span className="text-gray-300 text-lg font-light mx-3">—</span>
                <div className="text-center">
                    <span className="text-2xl font-bold" style={{ color: themeColor }}>
                        {minutesToTime(endMinutes)}
                    </span>
                </div>
            </div>

            {/* Slider track */}
            <div className="relative h-10 flex items-center" ref={trackRef}>
                {/* Background track */}
                <div className="absolute inset-x-0 h-2 rounded-full" style={{ backgroundColor: themeLight }} />

                {/* Active range */}
                <div
                    className="absolute h-2 rounded-full transition-[left,right] duration-75"
                    style={{
                        left: `${startPct}%`,
                        right: `${100 - endPct}%`,
                        backgroundColor: themeColor,
                    }}
                />

                {/* Start thumb */}
                <div
                    className="absolute w-6 h-6 rounded-full bg-white border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 -translate-x-1/2 z-10"
                    style={{
                        left: `${startPct}%`,
                        borderColor: themeColor,
                        boxShadow: dragging === 'start' ? `0 0 0 4px ${themeLight}` : undefined
                    }}
                    onMouseDown={(e) => { e.preventDefault(); setDragging('start'); }}
                    onTouchStart={(e) => { e.preventDefault(); setDragging('start'); }}
                />

                {/* End thumb */}
                <div
                    className="absolute w-6 h-6 rounded-full bg-white border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 -translate-x-1/2 z-10"
                    style={{
                        left: `${endPct}%`,
                        borderColor: themeColor,
                        boxShadow: dragging === 'end' ? `0 0 0 4px ${themeLight}` : undefined
                    }}
                    onMouseDown={(e) => { e.preventDefault(); setDragging('end'); }}
                    onTouchStart={(e) => { e.preventDefault(); setDragging('end'); }}
                />
            </div>

            {/* Hour tick labels */}
            <div className="relative h-4 mt-1">
                {ticks.map(m => {
                    const pct = ((m - minMinutes) / range) * 100;
                    return (
                        <span
                            key={m}
                            className="absolute text-[10px] text-gray-400 -translate-x-1/2 select-none"
                            style={{ left: `${pct}%` }}
                        >
                            {Math.floor(m / 60)}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================
// POPUP COMPONENT
// ============================================

interface TimeRangePopupProps {
    value: TimeRange;
    onChange: (range: TimeRange) => void;
    onClose: () => void;
    position: { top: number; left: number };
    theme: 'teal' | 'blue' | 'violet';
    interval: number;
    minTime: string;
    maxTime: string;
}

const TimeRangePopup: React.FC<TimeRangePopupProps> = ({
    value,
    onChange,
    onClose,
    position,
    theme,
    interval,
    minTime,
    maxTime
}) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const colors = THEME_COLORS[theme];

    const minMins = timeToMinutes(minTime);
    const maxMins = timeToMinutes(maxTime);

    const [startMins, setStartMins] = useState(value.start ? timeToMinutes(value.start) : timeToMinutes('08:00'));
    const [endMins, setEndMins] = useState(value.end ? timeToMinutes(value.end) : timeToMinutes('18:00'));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const handlePreset = (start: string, end: string) => {
        setStartMins(timeToMinutes(start));
        setEndMins(timeToMinutes(end));
        onChange({ start, end });
        onClose();
    };

    const handleSliderStartChange = (val: number) => {
        const clamped = Math.max(minMins, Math.min(val, maxMins));
        setStartMins(clamped);
        onChange({ start: minutesToTime(clamped), end: minutesToTime(endMins) });
    };

    const handleSliderEndChange = (val: number) => {
        const clamped = Math.max(minMins, Math.min(val, maxMins));
        setEndMins(clamped);
        onChange({ start: minutesToTime(startMins), end: minutesToTime(clamped) });
    };

    return createPortal(
        <div
            ref={popupRef}
            className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: position.top,
                left: position.left,
                width: '360px'
            }}
        >
            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_PRESETS.map((preset) => {
                    const isActive = value.start === preset.start && value.end === preset.end;
                    return (
                        <button
                            key={preset.label}
                            onClick={() => handlePreset(preset.start, preset.end)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${isActive
                                ? colors.presetActive
                                : `border-gray-200 text-gray-600 ${colors.presetHover}`
                                }`}
                            type="button"
                        >
                            <span>{preset.icon}</span>
                            <span>{preset.label}</span>
                            {isActive && <Check className="w-3 h-3" />}
                        </button>
                    );
                })}
            </div>

            {/* Dual Range Slider */}
            <DualRangeSlider
                startMinutes={startMins}
                endMinutes={endMins}
                minMinutes={minMins}
                maxMinutes={maxMins}
                step={interval}
                onStartChange={handleSliderStartChange}
                onEndChange={handleSliderEndChange}
                themeColor={colors.slider}
                themeLight={colors.sliderLight}
            />

            {/* Footer */}
            <div className="mt-2 pt-3 border-t border-gray-100 flex justify-between items-center">
                <button
                    onClick={() => {
                        onChange({ start: null, end: null });
                        onClose();
                    }}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    type="button"
                >
                    <X className="w-3.5 h-3.5" />
                    Rimuovi
                </button>
                <button
                    onClick={onClose}
                    className={`text-sm font-medium px-5 py-1.5 rounded-lg transition-colors ${colors.selected}`}
                    type="button"
                >
                    Conferma
                </button>
            </div>
        </div>,
        document.body
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
    value,
    onChange,
    placeholder = 'Fascia oraria',
    label,
    disabled = false,
    clearable = true,
    className = '',
    theme = 'teal',
    size = 'md',
    interval = 15,
    minTime = '06:00',
    maxTime = '22:00'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const inputRef = useRef<HTMLButtonElement>(null);
    const colors = THEME_COLORS[theme];
    const sizeClass = SIZE_CLASSES[size];

    const handleOpen = () => {
        if (disabled) return;

        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const popupHeight = 340;

            setPosition({
                top: spaceBelow > popupHeight ? rect.bottom + 8 : rect.top - popupHeight - 8,
                left: Math.min(rect.left, window.innerWidth - 380)
            });
        }
        setIsOpen(true);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange({ start: null, end: null });
    };

    const displayValue = formatTimeDisplay(value) || placeholder;
    const hasValue = value.start !== null || value.end !== null;

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <button
                ref={inputRef}
                onClick={!disabled ? handleOpen : undefined}
                type="button"
                disabled={disabled}
                className={`
                    flex items-center gap-3 group w-full
                    ${sizeClass}
                    bg-gradient-to-r from-white to-gray-50
                    border rounded-xl shadow-sm
                    ${!disabled
                        ? `border-gray-200 hover:border-teal-400 hover:shadow-md ${colors.focus}`
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }
                    focus:outline-none focus:ring-2 focus:ring-offset-1
                    transition-all duration-300 ease-out
                    ${isOpen ? `${colors.border} shadow-md ring-2 ring-teal-100` : ''}
                `}
            >
                <div className={`
                    p-1.5 rounded-lg transition-colors duration-200
                    ${isOpen ? colors.iconActive : colors.iconBg}
                `}>
                    <Clock className={`h-4 w-4 ${isOpen ? colors.icon : 'text-teal-500'}`} />
                </div>

                <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                        Fascia oraria
                    </span>
                    <span className={`font-medium truncate ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}>
                        {displayValue}
                    </span>
                </div>

                {clearable && hasValue && !disabled ? (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={handleClear}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClear(e as unknown as React.MouseEvent); }}
                        className="ml-auto p-1.5 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 group/clear cursor-pointer"
                    >
                        <X className="h-3.5 w-3.5 text-gray-400 group-hover/clear:text-red-500" />
                    </span>
                ) : (
                    <ChevronDown className={`ml-auto h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {isOpen && (
                <TimeRangePopup
                    value={value}
                    onChange={onChange}
                    onClose={() => setIsOpen(false)}
                    position={position}
                    theme={theme}
                    interval={interval}
                    minTime={minTime}
                    maxTime={maxTime}
                />
            )}
        </div>
    );
};

export default TimeRangePicker;
