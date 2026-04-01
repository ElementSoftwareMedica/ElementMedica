/**
 * WeekCalendar - Visualizzazione calendario settimanale degli slot
 * @module pages/clinica/agenda/disponibilita/components/WeekCalendar
 */

import React, { useMemo, useState, useRef, useCallback } from 'react';
import { X, Clock } from 'lucide-react';
import type { DisponibilitaMedico, SlotDisponibilita, Ambulatorio } from '../types';
import { GIORNI_SETTIMANA } from '../types';

interface WeekCalendarProps {
    disponibilita: DisponibilitaMedico[];
    slotsGiornalieri?: SlotDisponibilita[];
    ambulatori?: Ambulatorio[];
    onDeleteDisponibilita?: (id: string) => void;
    onEditDisponibilita?: (disp: DisponibilitaMedico) => void;
    onDeleteSlot?: (id: string) => void;
    readOnly?: boolean;
    onDragCreateSlot?: (giorno: number, oraInizio: string, oraFine: string) => void;
}

// Hours to show (8:00 - 20:00)
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const HOUR_HEIGHT = 48; // pixels per hour
const SNAP_MINUTES = 15; // Snap to 15-minute intervals

export const WeekCalendar: React.FC<WeekCalendarProps> = ({
    disponibilita,
    slotsGiornalieri = [],
    ambulatori = [],
    onDeleteDisponibilita,
    onEditDisponibilita,
    onDeleteSlot,
    readOnly = false,
    onDragCreateSlot
}) => {
    // Drag state for creating new slots
    const [isDragging, setIsDragging] = useState(false);
    const [dragGiorno, setDragGiorno] = useState<number | null>(null);
    const [dragStartHour, setDragStartHour] = useState<number>(0);
    const [dragEndHour, setDragEndHour] = useState<number>(0);
    const columnRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const dragThresholdRef = useRef(false);
    const startYRef = useRef(0);

    // Snap time to nearest interval
    const snapToInterval = useCallback((hour: number) => {
        const totalMinutes = hour * 60;
        const snapped = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
        return Math.max(8 * 60, Math.min(20 * 60, snapped)) / 60;
    }, []);

    // Convert Y position to hour
    const yToHour = useCallback((y: number) => {
        return snapToInterval((y / HOUR_HEIGHT) + 8);
    }, [snapToInterval]);

    // Format hour number to HH:MM string
    const formatHourToTime = useCallback((hour: number) => {
        const h = Math.floor(hour);
        const m = Math.round((hour - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }, []);

    const handleMouseDown = useCallback((giorno: number, e: React.MouseEvent) => {
        if (readOnly || !onDragCreateSlot) return;
        e.preventDefault();
        const col = columnRefs.current[giorno];
        if (!col) return;

        const rect = col.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const hour = yToHour(y);

        setDragGiorno(giorno);
        setDragStartHour(hour);
        setDragEndHour(hour);
        dragThresholdRef.current = false;
        startYRef.current = e.clientY;
    }, [readOnly, onDragCreateSlot, yToHour]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (dragGiorno === null) return;

        // Check drag threshold (10px)
        if (!dragThresholdRef.current) {
            if (Math.abs(e.clientY - startYRef.current) < 10) return;
            dragThresholdRef.current = true;
            setIsDragging(true);
        }

        const col = columnRefs.current[dragGiorno];
        if (!col) return;

        const rect = col.getBoundingClientRect();
        const y = Math.max(0, Math.min(e.clientY - rect.top, HOURS.length * HOUR_HEIGHT));
        const hour = yToHour(y);
        setDragEndHour(hour);
    }, [dragGiorno, yToHour]);

    const handleMouseUp = useCallback(() => {
        if (dragGiorno !== null && isDragging && onDragCreateSlot) {
            const start = Math.min(dragStartHour, dragEndHour);
            const end = Math.max(dragStartHour, dragEndHour);

            // Minimum 15 minutes
            if ((end - start) * 60 >= SNAP_MINUTES) {
                onDragCreateSlot(
                    dragGiorno,
                    formatHourToTime(start),
                    formatHourToTime(end)
                );
            }
        }
        setIsDragging(false);
        setDragGiorno(null);
        setDragStartHour(0);
        setDragEndHour(0);
        dragThresholdRef.current = false;
    }, [dragGiorno, isDragging, dragStartHour, dragEndHour, onDragCreateSlot, formatHourToTime]);

    // Drag preview calculation
    const dragPreviewStyle = useMemo(() => {
        if (!isDragging || dragGiorno === null) return null;
        const start = Math.min(dragStartHour, dragEndHour);
        const end = Math.max(dragStartHour, dragEndHour);
        const topMinutes = (start - 8) * 60;
        const heightMinutes = (end - start) * 60;
        return {
            top: `${(topMinutes / 60) * HOUR_HEIGHT}px`,
            height: `${Math.max((heightMinutes / 60) * HOUR_HEIGHT, 12)}px`
        };
    }, [isDragging, dragGiorno, dragStartHour, dragEndHour]);
    // Group disponibilità by day
    const slotsByDay = useMemo(() => {
        const grouped: Record<number, DisponibilitaMedico[]> = {};
        GIORNI_SETTIMANA.forEach(g => { grouped[g.value] = []; });

        disponibilita.forEach(d => {
            const day = d.giorno;
            if (grouped[day] !== undefined) {
                grouped[day].push(d);
            }
        });

        return grouped;
    }, [disponibilita]);

    // Calculate slot position
    const getSlotStyle = (oraInizio: string, oraFine: string) => {
        const [startH, startM] = oraInizio.split(':').map(Number);
        const [endH, endM] = oraFine.split(':').map(Number);

        const startMinutes = (startH - 8) * 60 + startM;
        const endMinutes = (endH - 8) * 60 + endM;
        const durationMinutes = endMinutes - startMinutes;

        return {
            top: `${(startMinutes / 60) * HOUR_HEIGHT}px`,
            height: `${Math.max((durationMinutes / 60) * HOUR_HEIGHT - 2, 24)}px`
        };
    };

    // Get color based on time of day — always teal for consistency with modal
    const getSlotColor = (_oraInizio: string) => {
        return 'bg-teal-100 text-teal-800 border-teal-200';
    };

    /**
     * Assigns side-by-side column positions to overlapping slots in a day column.
     * Returns array of { slot, left: string, right: string } for absolute positioning.
     */
    const computeSlotPositions = (slots: DisponibilitaMedico[]) => {
        if (slots.length === 0) return [];
        const sorted = [...slots].sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));
        // Assign column index using interval scheduling
        const cols: string[] = []; // cols[i] = oraFine of last slot in column i
        const colAssign: number[] = sorted.map(slot => {
            const col = cols.findIndex(endTime => endTime <= slot.oraInizio);
            const assigned = col >= 0 ? col : cols.length;
            cols[assigned] = slot.oraFine;
            return assigned;
        });
        const totalCols = cols.length;
        return sorted.map((slot, i) => {
            const col = colAssign[i];
            const widthPct = 100 / totalCols;
            const leftPct = col * widthPct;
            return {
                slot,
                left: `${leftPct.toFixed(1)}%`,
                right: `${(100 - leftPct - widthPct).toFixed(1)}%`,
            };
        });
    };

    return (
        <div
            className="bg-white rounded-xl border border-gray-200 overflow-hidden relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Header */}
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
                {/* Time column header */}
                <div className="p-2 text-center border-r border-gray-200">
                    <Clock className="h-4 w-4 text-gray-400 mx-auto" />
                </div>
                {/* Day headers */}
                {GIORNI_SETTIMANA.map(giorno => (
                    <div
                        key={giorno.value}
                        className="p-3 text-center border-r border-gray-200 last:border-r-0"
                    >
                        <p className="text-sm font-semibold text-gray-700">{giorno.short}</p>
                        <p className="text-xs text-gray-500 hidden sm:block">{giorno.label}</p>
                    </div>
                ))}
            </div>

            {/* Calendar Body */}
            <div className="grid grid-cols-8">
                {/* Time column */}
                <div className="border-r border-gray-200">
                    {HOURS.map(hour => (
                        <div
                            key={hour}
                            className="border-b border-gray-100 text-right pr-2 text-xs text-gray-400"
                            style={{ height: `${HOUR_HEIGHT}px` }}
                        >
                            <span className="relative -top-2">
                                {hour.toString().padStart(2, '0')}:00
                            </span>
                        </div>
                    ))}
                </div>

                {/* Day columns */}
                {GIORNI_SETTIMANA.map(giorno => (
                    <div
                        key={giorno.value}
                        ref={el => { columnRefs.current[giorno.value] = el; }}
                        className={`relative border-r border-gray-200 last:border-r-0 ${!readOnly && onDragCreateSlot ? 'cursor-crosshair' : ''
                            }`}
                        style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
                        onMouseDown={(e) => handleMouseDown(giorno.value, e)}
                    >
                        {/* Hour lines */}
                        {HOURS.map(hour => (
                            <div
                                key={hour}
                                className="absolute left-0 right-0 border-b border-gray-100"
                                style={{ top: `${(hour - 8) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                            />
                        ))}

                        {/* Drag preview */}
                        {isDragging && dragGiorno === giorno.value && dragPreviewStyle && (
                            <div
                                className="absolute left-1 right-1 bg-teal-200/50 border-2 border-teal-400 border-dashed rounded-md z-20 pointer-events-none flex items-center justify-center"
                                style={dragPreviewStyle}
                            >
                                <span className="text-xs font-medium text-teal-700 bg-white/80 px-1.5 py-0.5 rounded">
                                    {formatHourToTime(Math.min(dragStartHour, dragEndHour))} - {formatHourToTime(Math.max(dragStartHour, dragEndHour))}
                                </span>
                            </div>
                        )}

                        {/* Slots */}
                        {computeSlotPositions(slotsByDay[giorno.value] ?? []).map(({ slot, left, right }) => {
                            const ambulatorioNome = ambulatori?.find(a => a.id === slot.ambulatorioId)?.nome;
                            return (
                                <div
                                    key={slot.id}
                                    className={`
                                    absolute rounded-md border px-2 py-1
                                    transition-all cursor-pointer group
                                    ${getSlotColor(slot.oraInizio)}
                                    hover:shadow-md hover:z-10
                                `}
                                    style={{ ...getSlotStyle(slot.oraInizio, slot.oraFine), left, right }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!readOnly && onEditDisponibilita) onEditDisponibilita(slot);
                                    }}
                                >
                                    <div className="flex items-center justify-between h-full">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium truncate">
                                                {slot.oraInizio} - {slot.oraFine}
                                            </p>
                                            {ambulatorioNome && (
                                                <p className="text-xs opacity-75 truncate hidden sm:block">
                                                    {ambulatorioNome}
                                                </p>
                                            )}
                                        </div>
                                        {!readOnly && onDeleteDisponibilita && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteDisponibilita(slot.id);
                                                }}
                                                className="p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>

            {/* Empty State Overlay */}
            {disponibilita.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10 rounded-xl pointer-events-none">
                    <div className="text-center p-6">
                        <Clock className="h-12 w-12 text-teal-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">Nessun orario settimanale configurato</p>
                        <p className="text-sm text-gray-400 mt-1">
                            {onDragCreateSlot
                                ? 'Trascina sul calendario per creare una fascia oraria, oppure clicca "Nuovo Orario"'
                                : 'Clicca "Nuovo Orario" per definire le fasce orarie ricorrenti'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
