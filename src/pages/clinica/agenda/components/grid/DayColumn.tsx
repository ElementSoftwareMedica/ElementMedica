/**
 * Day Column Component
 * 
 * Colonna per un singolo giorno/ambulatorio nel calendario.
 * Gestisce drag & drop, rendering di disponibilità e appuntamenti.
 * 
 * @module pages/clinica/agenda/components/grid
 */

import React, { useRef, useState } from 'react';

import { CalendarEvent, DragState, DragItem, ColorScheme } from '../../types';
import { MEDICO_COLORS, HOUR_HEIGHT, DEFAULT_START_HOUR } from '../../constants';
import { isSameDay, calculateOverbookingColumns, minutesToTimeString } from '../../utils';
import { DisponibilitaBlock, AppuntamentoBlock, DragPreview, DropPreview } from '../blocks';
import { Ambulatorio } from '../../../../../services/clinicaApi';

// ============================================
// COMPONENT PROPS
// ============================================

export interface DayColumnProps {
    /** Data della colonna */
    date: Date;
    /** Ambulatorio */
    ambulatorio: Ambulatorio;
    /** Lista disponibilità per questa colonna */
    disponibilita: CalendarEvent[];
    /** Lista appuntamenti per questa colonna */
    appuntamenti: CalendarEvent[];
    /** Funzione per ottenere colore slot */
    getSlotColor: (medicoId?: string, ambulatorioId?: string) => ColorScheme;
    /** ID medico selezionato */
    selectedMedico: string | null;
    /** Handler click su slot vuoto */
    onSlotClick: (hour: number, ambulatorioId: string, date: Date) => void;
    /** Handler click su evento */
    onEventClick: (event: CalendarEvent, clickedHour?: number) => void;
    /** Handler eliminazione disponibilità (P68: hasPattern = true if slot has recurring pattern) */
    onDeleteDisponibilita: (id: string, hasPattern?: boolean) => void;
    /** Handler modifica disponibilità */
    onEditDisponibilita?: (slot: CalendarEvent) => void;
    /** Handler apertura modal coda per slot */
    onOpenQueueForSlot?: (slot: CalendarEvent) => void;
    /** Handler eliminazione appuntamento */
    onDeleteAppuntamento?: (id: string) => void;
    /** Handler accettazione paziente (check-in) */
    onAccettazioneAppuntamento?: (event: CalendarEvent) => void;
    /** P70: Handler "Accetta e Visita" per appuntamenti MDL con anagrafica completa */
    onAccettaEVisitaAppuntamento?: (event: CalendarEvent) => void;
    /** Handler visita paziente (IN_ATTESA → IN_CORSO) */
    onVisitaAppuntamento?: (event: CalendarEvent) => void;
    /** Handler chiama e visita paziente (chiama nel monitor poi naviga a visita) */
    onChiamaEVisitaAppuntamento?: (event: CalendarEvent) => void;
    /** Handler visualizza visita refertata (COMPLETATO/FATTURATO) */
    onViewVisitaAppuntamento?: (event: CalendarEvent) => void;
    /** Handler modifica appuntamento (naviga alla pagina modifica) */
    onModificaAppuntamento?: (event: CalendarEvent) => void;
    /** Handler cambio stato appuntamento (dalla tooltip) */
    onUpdateStato?: (id: string, stato: string) => Promise<void>;
    /** Handler inizio drag per creazione */
    onDragStart: (hour: number, ambulatorioId: string, date: Date) => void;
    /** Handler movimento drag */
    onDragMove: (hour: number) => void;
    /** Handler fine drag */
    onDragEnd: () => void;
    /** Ora inizio vista */
    startHour: number;
    /** Ora fine vista */
    endHour: number;
    /** Larghezza colonna in pixel */
    columnWidth: number;
    /** Altezza ora in pixel */
    hourHeight: number;
    /** Stato drag corrente */
    dragState: DragState;
    /** Evento in drag */
    draggingEvent: DragItem | null;
    /** Handler inizio drag evento esistente */
    onItemDragStart: (e: React.DragEvent, item: DragItem) => void;
    /** Handler drop evento */
    onDropEvent: (date: Date, ambulatorioId: string, hour: number, item: DragItem) => void;
    /** Mappa colori medici */
    medicoColors: Map<string, ColorScheme>;
    /** Indice ambulatorio per distinzione visiva */
    ambulatorioIndex: number;
    /** Funzione per verificare se un'ora è aperta (orari sede) */
    isHourOpen?: (date: Date, hour: number) => boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DRAG_THRESHOLD = 10; // Minimum pixels for drag

// ============================================
// COMPONENT
// ============================================

/**
 * DayColumn - Colonna giorno/ambulatorio del calendario
 * 
 * Features:
 * - Griglia oraria con intervalli 5 minuti
 * - Drag to create: trascina per creare disponibilità
 * - Click to book: click per prenotare appuntamento
 * - Drop zone: riceve eventi trascinati
 * - Hover indicator: mostra orario al passaggio mouse
 * - Supporto overbooking con colonne multiple
 */
export const DayColumn: React.FC<DayColumnProps> = ({
    date,
    ambulatorio,
    disponibilita,
    appuntamenti,
    getSlotColor,
    selectedMedico,
    onSlotClick,
    onEventClick,
    onDeleteDisponibilita,
    onEditDisponibilita,
    onOpenQueueForSlot,
    onDeleteAppuntamento,
    onAccettazioneAppuntamento,
    onAccettaEVisitaAppuntamento,
    onVisitaAppuntamento,
    onChiamaEVisitaAppuntamento,
    onViewVisitaAppuntamento,
    onModificaAppuntamento,
    onUpdateStato,
    onDragStart,
    onDragMove,
    onDragEnd,
    startHour,
    endHour,
    columnWidth,
    hourHeight,
    dragState,
    draggingEvent,
    onItemDragStart,
    onDropEvent,
    medicoColors,
    ambulatorioIndex,
    isHourOpen
}) => {
    // ============================================
    // REFS
    // ============================================

    const columnRef = useRef<HTMLDivElement>(null);
    const mouseStartPos = useRef<{ x: number; y: number; hour: number } | null>(null);
    const hasDragged = useRef<boolean>(false);

    // ============================================
    // STATE
    // ============================================

    const [isDragOver, setIsDragOver] = useState(false);
    const [dropHoverHour, setDropHoverHour] = useState<number | null>(null);
    const [hoverHour, setHoverHour] = useState<number | null>(null);

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const hourCount = endHour - startHour;
    const fiveMinHeight = hourHeight / 12;

    // Background color based on ambulatorio index
    const bgColors = ['bg-white', 'bg-slate-50/50', 'bg-gray-50/30', 'bg-zinc-50/50'];
    const bgColor = bgColors[ambulatorioIndex % bgColors.length];

    // Check if this column is in drag state
    const isDragColumn = dragState.isDragging &&
        dragState.ambulatorioId === ambulatorio.id &&
        dragState.startDay && isSameDay(dragState.startDay, date);

    // ============================================
    // HELPERS
    // ============================================

    const yToHourLocal = (y: number): number => {
        return Math.round((y / hourHeight + startHour) * 12) / 12;
    };

    const formatHourToTime = (hour: number) => {
        const h = Math.floor(hour);
        const m = Math.round((hour - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const getDraggingDuration = () => {
        if (!draggingEvent) return 0.5;
        const event = draggingEvent.event;
        return (event.end.getTime() - event.start.getTime()) / (60 * 60 * 1000);
    };

    // ============================================
    // HANDLERS
    // ============================================

    const handleMouseDown = (e: React.MouseEvent) => {
        const rect = columnRef.current?.getBoundingClientRect();
        if (!rect) return;
        const y = e.clientY - rect.top;
        const hour = yToHourLocal(y);
        mouseStartPos.current = { x: e.clientX, y: e.clientY, hour };
        hasDragged.current = false;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = columnRef.current?.getBoundingClientRect();
        if (!rect) return;
        const y = e.clientY - rect.top;
        const hour = yToHourLocal(y);

        setHoverHour(hour);

        // Check if should start dragging
        if (mouseStartPos.current && !dragState.isDragging) {
            const dx = Math.abs(e.clientX - mouseStartPos.current.x);
            const dy = Math.abs(e.clientY - mouseStartPos.current.y);
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                hasDragged.current = true;
                onDragStart(mouseStartPos.current.hour, ambulatorio.id, date);
            }
        }

        if (!dragState.isDragging || dragState.ambulatorioId !== ambulatorio.id) return;
        onDragMove(hour);
    };

    const handleMouseLeaveColumn = () => {
        setHoverHour(null);
        mouseStartPos.current = null;
        if (dragState.isDragging) {
            onDragEnd();
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        const wasMouseDown = mouseStartPos.current !== null;
        const didDrag = hasDragged.current;

        mouseStartPos.current = null;
        hasDragged.current = false;

        const target = e.target as HTMLElement;
        const isEventClick = target.closest('[data-event-block="true"]');

        if (dragState.isDragging) {
            onDragEnd();
        } else if (wasMouseDown && !didDrag && !isEventClick && !draggingEvent) {
            const rect = columnRef.current?.getBoundingClientRect();
            if (!rect) return;
            const y = e.clientY - rect.top;
            const hour = yToHourLocal(y);
            onSlotClick(hour, ambulatorio.id, date);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    // Drag & Drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);

        const rect = columnRef.current?.getBoundingClientRect();
        if (rect && draggingEvent) {
            const y = e.clientY - rect.top;
            const rawHour = y / hourHeight + startHour;
            const snappedHour = Math.round(rawHour * 12) / 12;
            setDropHoverHour(snappedHour);
        }
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
        setDropHoverHour(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        setDropHoverHour(null);
        mouseStartPos.current = null; // prevent ghost click after HTML5 drop

        if (!draggingEvent) return;

        const rect = columnRef.current?.getBoundingClientRect();
        if (!rect) return;
        const y = e.clientY - rect.top;
        const hour = yToHourLocal(y);

        onDropEvent(date, ambulatorio.id, hour, draggingEvent);
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div
            ref={columnRef}
            className={`border-r border-gray-200 relative overflow-hidden
                    ${selectedMedico ? 'cursor-crosshair' : 'cursor-pointer'}
                    ${isDragOver ? 'bg-teal-50/50 border-teal-300' : `hover:bg-gray-50/50 ${bgColor}`}`}
            style={{ height: `${hourCount * hourHeight}px`, width: `${columnWidth}px`, flexShrink: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeaveColumn}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Hour grid lines */}
            {Array.from({ length: hourCount }, (_, hourIdx) => {
                const hour = startHour + hourIdx;
                const isClosed = isHourOpen && !isHourOpen(date, hour);

                return (
                    <div
                        key={hourIdx}
                        className={`absolute w-full border-b border-gray-200 ${isClosed ? 'bg-gray-200/60' : ''}`}
                        style={{ top: `${hourIdx * hourHeight}px`, height: `${hourHeight}px` }}
                        title={isClosed ? 'Sede chiusa in questa fascia oraria' : undefined}
                    >
                        {/* Closed hour diagonal stripes pattern */}
                        {isClosed && (
                            <div
                                className="absolute inset-0 pointer-events-none opacity-30"
                                style={{
                                    backgroundImage: 'repeating-linear-gradient(45deg, #94a3b8 0px, #94a3b8 1px, transparent 1px, transparent 8px)',
                                    backgroundSize: '8px 8px'
                                }}
                            />
                        )}
                        {/* 5-minute lines */}
                        {Array.from({ length: 11 }, (_, minIdx) => {
                            const isQuarterHour = (minIdx + 1) * 5 % 15 === 0;
                            return (
                                <div
                                    key={minIdx}
                                    className={`absolute w-full border-b ${isQuarterHour ? 'border-gray-100' : 'border-gray-50/50'}`}
                                    style={{ top: `${(minIdx + 1) * fiveMinHeight}px` }}
                                />
                            );
                        })}
                    </div>
                );
            })}

            {/* Hover time indicator */}
            {hoverHour !== null && !dragState.isDragging && (
                <div
                    className="absolute left-0 right-0 pointer-events-none z-40"
                    style={{ top: `${(hoverHour - startHour) * hourHeight}px` }}
                >
                    <div className="h-px bg-teal-400/60 border-t border-dashed border-teal-500/40" />
                    <div className="absolute -top-2.5 left-0.5 bg-teal-500/90 text-white text-[9px] font-medium px-1 py-0.5 rounded-sm shadow-sm">
                        {formatHourToTime(hoverHour)}
                    </div>
                </div>
            )}

            {/* Disponibilità blocks */}
            {disponibilita.map(slot => {
                const color = getSlotColor(slot.medicoId, slot.ambulatorioId);
                return (
                    <DisponibilitaBlock
                        key={slot.id}
                        slot={slot}
                        color={color}
                        onClick={(clickedHour) => onEventClick(slot, clickedHour)}
                        onDelete={() => onDeleteDisponibilita(slot.id, !!(slot.raw as { disponibilitaMedicoId?: string })?.disponibilitaMedicoId)}
                        onEdit={onEditDisponibilita ? () => onEditDisponibilita(slot) : undefined}
                        onOpenQueue={onOpenQueueForSlot ? () => onOpenQueueForSlot(slot) : undefined}
                        onDragStart={onItemDragStart}
                        isDragging={draggingEvent?.event.id === slot.id}
                        viewStartHour={startHour}
                        viewEndHour={endHour}
                        hourHeight={hourHeight}
                    />
                );
            })}

            {/* Appuntamenti blocks with overbooking */}
            {(() => {
                const overbookingColumns = calculateOverbookingColumns(appuntamenti);
                return overbookingColumns.map(({ event, columnIndex, totalColumns }) => (
                    <AppuntamentoBlock
                        key={event.id}
                        event={event}
                        onClick={() => onEventClick(event)}
                        onDelete={onDeleteAppuntamento ? () => onDeleteAppuntamento(event.id) : undefined}
                        onAccettazione={onAccettazioneAppuntamento ? () => onAccettazioneAppuntamento(event) : undefined}
                        onAccettaEVisita={onAccettaEVisitaAppuntamento ? () => onAccettaEVisitaAppuntamento(event) : undefined}
                        onVisita={onVisitaAppuntamento ? () => onVisitaAppuntamento(event) : undefined}
                        onChiamaEVisita={onChiamaEVisitaAppuntamento ? () => onChiamaEVisitaAppuntamento(event) : undefined}
                        onViewVisita={onViewVisitaAppuntamento ? () => onViewVisitaAppuntamento(event) : undefined}
                        onModifica={onModificaAppuntamento ? () => onModificaAppuntamento(event) : undefined}
                        onUpdateStato={onUpdateStato}
                        onDragStart={onItemDragStart}
                        isDragging={draggingEvent?.event.id === event.id}
                        viewStartHour={startHour}
                        viewEndHour={endHour}
                        hourHeight={hourHeight}
                        columnIndex={columnIndex}
                        totalColumns={totalColumns}
                    />
                ));
            })()}

            {/* Drag preview */}
            {isDragColumn && dragState.startHour !== null && dragState.endHour !== null && (
                <DragPreview
                    startHour={Math.min(dragState.startHour, dragState.endHour)}
                    endHour={Math.max(dragState.startHour, dragState.endHour)}
                    color={selectedMedico
                        ? (medicoColors.get(selectedMedico) || MEDICO_COLORS[0])
                        : { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-700', dot: 'bg-emerald-500' }
                    }
                    viewStartHour={startHour}
                    hourHeight={hourHeight}
                />
            )}

            {/* Drop preview */}
            {isDragOver && dropHoverHour !== null && draggingEvent && (
                <DropPreview
                    startHour={dropHoverHour}
                    durationMinutes={getDraggingDuration() * 60}
                    type={draggingEvent.type}
                    viewStartHour={startHour}
                    hourHeight={hourHeight}
                />
            )}
        </div>
    );
};

export default DayColumn;
