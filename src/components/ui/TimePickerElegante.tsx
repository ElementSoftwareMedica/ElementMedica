/**
 * TimePickerElegante - Componente TimePicker moderno ed elegante
 *
 * Sostituisce i classici <input type="time" /> con dropdown ore/minuti
 * stilizzati in modo moderno e coerente con DatePickerElegante.
 *
 * Layout adattivo:
 * - minuteStep >= 15 → spinner compatto + griglia rapida (ore:00, ore:30)
 * - minuteStep < 15 (es. 5) → 2 pannelli affiancati (ore a sx, minuti a dx)
 *
 * @module components/ui/TimePickerElegante
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronUp, ChevronDown, X, Check } from 'lucide-react';
import { cn } from '../../design-system/utils';

export interface TimePickerEleganteProps {
    /** Valore in formato "HH:MM" */
    value: string;
    /** Callback quando cambia il valore */
    onChange: (value: string) => void;
    /** Placeholder */
    placeholder?: string;
    /** Label */
    label?: string;
    /** Disabilita il picker */
    disabled?: boolean;
    /** Classe CSS aggiuntiva */
    className?: string;
    /** Intervallo minuti (default 15) */
    minuteStep?: number;
    /** Ora minima selezionabile "HH:MM" */
    minTime?: string;
    /** Ora massima selezionabile "HH:MM" */
    maxTime?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const TimePickerElegante: React.FC<TimePickerEleganteProps> = ({
    value,
    onChange,
    placeholder = 'Seleziona orario',
    label,
    disabled = false,
    className,
    minuteStep = 15,
    minTime,
    maxTime,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const hourListRef = useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const MINUTES = Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep);
    const useDetailedLayout = minuteStep < 15;

    // Parse current value
    const [selectedHour, selectedMinute] = value
        ? value.split(':').map(Number)
        : [-1, -1];

    // Parse min/max
    const minH = minTime ? parseInt(minTime.split(':')[0]) : 0;
    const minM = minTime ? parseInt(minTime.split(':')[1]) : 0;
    const maxH = maxTime ? parseInt(maxTime.split(':')[0]) : 23;
    const maxM = maxTime ? parseInt(maxTime.split(':')[1]) : 59;

    const isTimeDisabled = (h: number, m: number) => {
        const total = h * 60 + m;
        const minTotal = minH * 60 + minM;
        const maxTotal = maxH * 60 + maxM;
        return total < minTotal || total > maxTotal;
    };

    // Position dropdown
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const popupHeight = useDetailedLayout ? 320 : 280;
        const top = spaceBelow >= popupHeight ? rect.bottom + 4 : rect.top - popupHeight - 4;
        const popupWidth = useDetailedLayout ? 280 : Math.max(rect.width, 200);
        setDropdownPos({ top, left: rect.left, width: popupWidth });
    }, [useDetailedLayout]);

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen, updatePosition]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (
                popupRef.current && !popupRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // Scroll to selected hour when opening (detailed layout)
    useEffect(() => {
        if (isOpen && selectedHour >= 0 && hourListRef.current) {
            setTimeout(() => {
                hourListRef.current?.querySelector(`[data-hour="${selectedHour}"]`)?.scrollIntoView({ block: 'center' });
            }, 50);
        }
    }, [isOpen, selectedHour]);

    /** Seleziona un orario completo e CHIUDE il dropdown */
    const handleSelect = (hour: number, minute: number) => {
        if (isTimeDisabled(hour, minute)) return;
        const hStr = hour.toString().padStart(2, '0');
        const mStr = minute.toString().padStart(2, '0');
        onChange(`${hStr}:${mStr}`);
        setIsOpen(false);
    };

    /** Aggiorna il valore SENZA chiudere il dropdown (per spinner e selezione parziale) */
    const updateValue = (hour: number, minute: number) => {
        if (isTimeDisabled(hour, minute)) return;
        const hStr = hour.toString().padStart(2, '0');
        const mStr = minute.toString().padStart(2, '0');
        onChange(`${hStr}:${mStr}`);
    };

    const handleHourSelect = (h: number) => {
        const m = selectedMinute >= 0 ? selectedMinute : 0;
        if (isTimeDisabled(h, m)) return;
        updateValue(h, m);
    };

    const handleMinuteSelect = (m: number) => {
        const h = selectedHour >= 0 ? selectedHour : 8;
        if (isTimeDisabled(h, m)) return;
        if (useDetailedLayout) {
            // In 2-panel layout, selecting minute = final selection → close
            handleSelect(h, m);
        } else {
            updateValue(h, m);
        }
    };

    // Increment/decrement helpers — MAI chiudere il dropdown
    const adjustHour = (delta: number) => {
        const h = selectedHour >= 0 ? selectedHour : 8;
        const newH = (h + delta + 24) % 24;
        const m = selectedMinute >= 0 ? selectedMinute : 0;
        updateValue(newH, m);
    };

    const adjustMinute = (delta: number) => {
        const m = selectedMinute >= 0 ? selectedMinute : 0;
        const h = selectedHour >= 0 ? selectedHour : 8;
        const newM = (m + delta * minuteStep + 60) % 60;
        updateValue(h, newM);
    };

    const displayValue = value || '';

    // --- Detailed 2-panel layout (minuteStep < 15, es. 5 min) ---
    const renderDetailedLayout = () => (
        <div className="flex" style={{ height: 280 }}>
            {/* Hours column */}
            <div
                ref={hourListRef}
                className="w-16 border-r border-gray-100 dark:border-gray-700 overflow-y-auto flex-shrink-0"
            >
                <div className="py-1 px-1">
                    <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase text-center mb-1">Ore</div>
                    {HOURS.filter(h => h >= minH && h <= maxH).map(h => {
                        const isSelected = h === selectedHour;
                        return (
                            <button
                                key={h}
                                type="button"
                                data-hour={h}
                                onClick={() => handleHourSelect(h)}
                                className={cn(
                                    'w-full py-1.5 text-sm rounded-md transition-colors font-medium tabular-nums mb-0.5',
                                    isSelected
                                        ? 'bg-orange-600 text-white'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                                )}
                            >
                                {h.toString().padStart(2, '0')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Minutes grid */}
            <div className="flex-1 overflow-y-auto p-2">
                <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase text-center mb-2">
                    Minuti {selectedHour >= 0 ? `(${selectedHour.toString().padStart(2, '0')}:xx)` : ''}
                </div>
                <div className="grid grid-cols-3 gap-1">
                    {MINUTES.map(m => {
                        const h = selectedHour >= 0 ? selectedHour : 8;
                        const isDisabled = isTimeDisabled(h, m);
                        const isSelected = h === selectedHour && m === selectedMinute;
                        return (
                            <button
                                key={m}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => handleMinuteSelect(m)}
                                className={cn(
                                    'py-1.5 text-sm rounded-md transition-colors font-medium tabular-nums',
                                    isSelected
                                        ? 'bg-orange-600 text-white'
                                        : isDisabled
                                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                                )}
                            >
                                :{m.toString().padStart(2, '0')}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    // --- Compact spinner layout (minuteStep >= 15) ---
    const renderCompactLayout = () => (
        <>
            {/* Compact spinner-style selector */}
            <div className="p-3">
                <div className="flex items-center justify-center gap-1">
                    {/* Hour column */}
                    <div className="flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => adjustHour(1)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </button>
                        <div className="text-2xl font-semibold text-gray-900 dark:text-gray-50 w-12 text-center tabular-nums">
                            {selectedHour >= 0 ? selectedHour.toString().padStart(2, '0') : '--'}
                        </div>
                        <button
                            type="button"
                            onClick={() => adjustHour(-1)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>

                    <span className="text-2xl font-semibold text-gray-400 dark:text-gray-500 px-0.5">:</span>

                    {/* Minute column */}
                    <div className="flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => adjustMinute(1)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </button>
                        <div className="text-2xl font-semibold text-gray-900 dark:text-gray-50 w-12 text-center tabular-nums">
                            {selectedMinute >= 0 ? selectedMinute.toString().padStart(2, '0') : '--'}
                        </div>
                        <button
                            type="button"
                            onClick={() => adjustMinute(-1)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Confirm button */}
                    {selectedHour >= 0 && selectedMinute >= 0 && (
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="ml-2 p-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                            title="Conferma"
                        >
                            <Check className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick time grid — rispetta minuteStep */}
            <div className="border-t border-gray-100 dark:border-gray-700 p-2 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-4 gap-1">
                    {HOURS.filter(h => h >= 7 && h <= 20).map(h =>
                        MINUTES.filter(m => minuteStep <= 15 ? true : m === 0 || m === 30).map(m => {
                            const isDisabled = isTimeDisabled(h, m);
                            const isSelected = h === selectedHour && m === selectedMinute;
                            return (
                                <button
                                    key={`${h}:${m}`}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => handleSelect(h, m)}
                                    className={cn(
                                        'px-1.5 py-1 text-xs rounded-md transition-colors font-medium tabular-nums',
                                        isSelected
                                            ? 'bg-orange-600 text-white'
                                            : isDisabled
                                                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                                    )}
                                >
                                    {h.toString().padStart(2, '0')}:{m.toString().padStart(2, '0')}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );

    return (
        <div className={cn('relative', className)}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            )}
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all duration-200',
                    'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50',
                    isOpen
                        ? 'border-orange-400 ring-2 ring-orange-500/20 shadow-sm'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className={cn('flex-1 text-left', !displayValue && 'text-gray-400')}>
                    {displayValue || placeholder}
                </span>
                {value && !disabled && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onChange(''); }}
                        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </button>

            {isOpen && createPortal(
                <div
                    ref={popupRef}
                    className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
                    style={{
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                    }}
                >
                    {useDetailedLayout ? renderDetailedLayout() : renderCompactLayout()}
                </div>,
                document.body
            )}
        </div>
    );
};

export default TimePickerElegante;
