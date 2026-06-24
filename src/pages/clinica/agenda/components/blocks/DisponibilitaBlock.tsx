/**
 * Disponibilita Block Component
 * 
 * Blocco visuale per slot di disponibilità medico nel calendario.
 * Include tooltip con azioni, supporto drag & drop, e rendering ottimizzato.
 * 
 * @module pages/clinica/agenda/components/blocks
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    GripVertical,
    Stethoscope,
    Clock,
    Plus,
    Edit,
    Trash2,
    Users
} from 'lucide-react';

import { CalendarEvent, DragItem, ColorScheme } from '../../types';
import { HOUR_HEIGHT, DEFAULT_START_HOUR, GRAYED_COLOR } from '../../constants';
import { formatTime } from '../../../../../utils/dateUtils';

// ============================================
// COMPONENT PROPS
// ============================================

export interface DisponibilitaBlockProps {
    /** Slot di disponibilità da visualizzare */
    slot: CalendarEvent;
    /** Schema colore del medico */
    color: ColorScheme;
    /** Handler click sul blocco (passa ora cliccata) */
    onClick: (clickedHour?: number) => void;
    /** Handler eliminazione slot */
    onDelete: () => void;
    /** Handler modifica slot (opzionale) */
    onEdit?: () => void;
    /** Handler apertura gestione coda (opzionale) */
    onOpenQueue?: () => void;
    /** Handler inizio drag */
    onDragStart?: (e: React.DragEvent, item: DragItem) => void;
    /** Flag blocco in drag */
    isDragging?: boolean;
    /** Ora inizio vista */
    viewStartHour?: number;
    /** Ora fine vista */
    viewEndHour?: number;
    /** Altezza in pixel per ogni ora */
    hourHeight?: number;
}

// ============================================
// COMPONENT
// ============================================

/**
 * DisponibilitaBlock - Blocco visuale per disponibilità medico
 * 
 * Features:
 * - Tooltip con dettagli e azioni (prenota, modifica, elimina, gestione coda)
 * - Drag & drop per spostare disponibilità
 * - Supporto per slot grigi (medico non selezionato)
 * - Clamp automatico ai confini della vista
 * - Responsive: mostra/nasconde elementi in base all'altezza
 */
export const DisponibilitaBlock: React.FC<DisponibilitaBlockProps> = ({
    slot,
    color,
    onClick,
    onDelete,
    onEdit,
    onOpenQueue,
    onDragStart,
    isDragging,
    viewStartHour = DEFAULT_START_HOUR,
    viewEndHour = 21,
    hourHeight = HOUR_HEIGHT
}) => {
    // ============================================
    // STATE
    // ============================================

    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [gripPosition, setGripPosition] = useState({ x: 0, y: 0, visible: false });

    // ============================================
    // REFS
    // ============================================

    const blockRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Tracks whether a drag just occurred to suppress the subsequent synthetic click event
    const wasDraggedRef = useRef(false);

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const slotStartHour = slot.start.getHours() + slot.start.getMinutes() / 60;
    const slotEndHour = slot.end.getHours() + slot.end.getMinutes() / 60;

    // Clamp to view boundaries
    const visibleStartHour = Math.max(slotStartHour, viewStartHour);
    const visibleEndHour = Math.min(slotEndHour, viewEndHour);

    // Positioning
    const height = (visibleEndHour - visibleStartHour) * hourHeight;
    const top = (visibleStartHour - viewStartHour) * hourHeight;

    // Use gray color for grayed slots
    const effectiveColor = slot.isGrayed ? GRAYED_COLOR : color;
    const bgOpacity = slot.isGrayed ? 'bg-opacity-30' : 'bg-opacity-40';

    // Ref to track last grip position to avoid unnecessary updates
    const lastGripPositionRef = React.useRef<{ x: number; y: number } | null>(null);

    // ============================================
    // EFFECTS
    // ============================================

    // Recompute the grip position from the block's real on-screen rect.
    // Guarded by lastGripPositionRef so re-render loops are avoided (no setState if <1px change).
    const updateGripPosition = useCallback(() => {
        if (blockRef.current) {
            const rect = blockRef.current.getBoundingClientRect();
            const newX = Math.round(rect.left + 2);
            const newY = Math.round(rect.top + 2);

            const last = lastGripPositionRef.current;
            if (!last || Math.abs(last.x - newX) > 1 || Math.abs(last.y - newY) > 1) {
                lastGripPositionRef.current = { x: newX, y: newY };
                setGripPosition({ x: newX, y: newY, visible: true });
            }
        }
    }, []);

    // Sync the grip on EVERY render, synchronously before paint.
    // This keeps the grip locked to the block when the calendar re-lays-out on a
    // day/view change (the block shifts horizontally without `top`/`height`/`slot.*`
    // changing, so a dependency-gated effect would lag behind until the next scroll).
    useLayoutEffect(() => {
        updateGripPosition();
    });

    // Re-update on scroll/resize (listeners attached once).
    useEffect(() => {
        window.addEventListener('scroll', updateGripPosition, true);
        window.addEventListener('resize', updateGripPosition);
        return () => {
            window.removeEventListener('scroll', updateGripPosition, true);
            window.removeEventListener('resize', updateGripPosition);
        };
    }, [updateGripPosition]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    // ============================================
    // HANDLERS
    // ============================================

    const handleDragStart = (e: React.DragEvent) => {
        // Mark that a drag was initiated — suppress the subsequent synthetic click.
        // Safety net: auto-reset after 500ms in case no click fires (e.g., drop outside window).
        wasDraggedRef.current = true;
        setTimeout(() => { wasDraggedRef.current = false; }, 500);

        // Close tooltip immediately when drag starts
        setShowTooltip(false);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'disponibilita', eventId: slot.id }));
        e.dataTransfer.effectAllowed = 'move';

        // Create transparent drag image
        const dragImage = document.createElement('div');
        dragImage.style.cssText = 'width: 1px; height: 1px; opacity: 0.01; position: fixed; top: -1000px; left: -1000px;';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        setTimeout(() => document.body.removeChild(dragImage), 0);

        onDragStart?.(e, { type: 'disponibilita', event: slot });
    };

    const handleBlockClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Suppress the synthetic click that browsers fire after HTML5 drag-end
        if (wasDraggedRef.current) {
            wasDraggedRef.current = false;
            return;
        }
        // Calculate clicked hour from Y position within the block
        const rect = e.currentTarget.getBoundingClientRect();
        const yInBlock = e.clientY - rect.top;
        const clickedHour = visibleStartHour + (yInBlock / hourHeight);
        // Round to nearest 5 minutes (0.0833 hours)
        const roundedHour = Math.round(clickedHour * 12) / 12;
        onClick(roundedHour);
    };

    const handleGripMouseEnter = () => {
        // Clear any pending hide timeout
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        // Calculate tooltip position
        const tooltipWidth = 220;
        const tooltipHeight = 200;
        const margin = 8;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = gripPosition.x + 24 + margin;
        let y = gripPosition.y;

        // Prevent overflow
        if (x + tooltipWidth > viewportWidth - margin) {
            x = gripPosition.x - tooltipWidth - margin;
        }
        if (x < margin) x = margin;
        if (y + tooltipHeight > viewportHeight - margin) {
            y = viewportHeight - tooltipHeight - margin;
        }
        if (y < margin) y = margin;

        setTooltipPosition({ x, y });
        setShowTooltip(true);
    };

    const handleGripMouseLeave = () => {
        hideTimeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
        }, 200);
    };

    const handleTooltipMouseEnter = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setShowTooltip(true);
    };

    const handleTooltipMouseLeave = () => {
        hideTimeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
        }, 150);
    };

    // ============================================
    // RENDER CONDITIONS
    // ============================================

    // Don't render if completely outside view
    if (visibleStartHour >= viewEndHour || visibleEndHour <= viewStartHour) {
        return null;
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div
            ref={blockRef}
            data-event-block="true"
            draggable={!slot.isGrayed}
            onDragStart={slot.isGrayed ? undefined : handleDragStart}
            className={`absolute left-0.5 right-0.5 rounded ${effectiveColor.bg} ${bgOpacity} ${effectiveColor.border} border 
                        ${slot.isGrayed ? 'cursor-not-allowed' : 'cursor-grab'}
                        transition-all ${slot.isGrayed ? '' : 'hover:bg-opacity-70 hover:shadow-md'} group overflow-hidden
                        ${isDragging ? 'opacity-50' : ''}`}
            style={{
                top: `${top}px`,
                height: `${height}px`,
                minHeight: '20px',
                zIndex: slot.isGrayed ? 3 : 5
            }}
            onClick={handleBlockClick}
        >
            <div className="h-full flex flex-col overflow-hidden">
                {/* Doctor name - rimossa X, c'è già elimina nel tooltip */}
                <div className="px-1 pt-1 flex-1 min-h-0 overflow-hidden">
                    <span
                        className={`text-[9px] font-medium ${effectiveColor.text} leading-tight block`}
                        style={{
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-all',
                            hyphens: 'auto'
                        }}
                    >
                        {slot.medicoNome}
                    </span>
                </div>

                {/* Time - show only if enough height */}
                {height > 40 && (
                    <div className="px-1 pb-0.5">
                        <span className={`text-[8px] ${effectiveColor.text} opacity-75`}>
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                        </span>
                    </div>
                )}
            </div>

            {/* Grip rendered via portal - z-index 60 (above sidebar z-50) */}
            {gripPosition.visible && createPortal(
                <div
                    className="fixed cursor-pointer p-1 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                    style={{
                        left: `${gripPosition.x}px`,
                        top: `${gripPosition.y}px`,
                        zIndex: 60,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseEnter={handleGripMouseEnter}
                    onMouseLeave={handleGripMouseLeave}
                >
                    <GripVertical className="w-3 h-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                </div>,
                document.body
            )}

            {/* Tooltip rendered via portal - z-index 65 (above sidebar z-50 and grip z-60) */}
            {showTooltip && createPortal(
                <div
                    className="fixed pointer-events-auto"
                    style={{
                        left: `${tooltipPosition.x}px`,
                        top: `${tooltipPosition.y}px`,
                        zIndex: 65
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onMouseEnter={handleTooltipMouseEnter}
                    onMouseLeave={handleTooltipMouseLeave}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[220px]">
                        {/* Header */}
                        <div className={`px-3 py-2 ${color.bg} bg-opacity-80 dark:bg-opacity-40 border-b border-gray-100 dark:border-gray-700`}>
                            <div className="flex items-center gap-2">
                                <Stethoscope className={`h-4 w-4 ${color.text}`} />
                                <span className={`font-semibold ${color.text}`}>{slot.medicoNome}</span>
                            </div>
                        </div>

                        {/* Time info */}
                        <div className="px-3 py-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                <span>{formatTime(slot.start)} - {formatTime(slot.end)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onClick(slotStartHour); }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full text-xs bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                            >
                                <Plus className="h-3 w-3" />
                                Prenota Appuntamento
                            </button>
                            {onOpenQueue && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onOpenQueue(); }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full text-xs bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 text-white py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                                >
                                    <Users className="h-3 w-3" />
                                    Gestisci Coda
                                </button>
                            )}
                            <div className="flex gap-2">
                                {onEdit && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Edit className="h-3 w-3" />
                                        Modifica
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="flex-1 text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DisponibilitaBlock;
