/**
 * Appuntamento Block Component
 * 
 * Blocco visuale per appuntamento paziente nel calendario.
 * Include tooltip dettagliato, supporto drag & drop, gestione overbooking.
 * 
 * @module pages/clinica/agenda/components/blocks
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    GripVertical,
    User,
    Phone,
    Clock,
    Stethoscope,
    FileText,
    Tag,
    Edit,
    Eye,
    Trash2,
    UserCheck,
    Play,
    MessageSquare,
    Volume2,
    Hash,
    ChevronDown,
    Loader2
} from 'lucide-react';

import { CalendarEvent, DragItem } from '../../types';
import { STATO_COLORS, HOUR_HEIGHT, DEFAULT_START_HOUR, DEFAULT_END_HOUR, STATO_LABELS } from '../../constants';
import type { StatoAppuntamento } from '../../../../../services/clinicaApi';
import { formatTime } from '../../../../../utils/dateUtils';

// ============================================
// COMPONENT PROPS
// ============================================

export interface AppuntamentoBlockProps {
    /** Evento appuntamento da visualizzare */
    event: CalendarEvent;
    /** Handler click sul blocco */
    onClick: () => void;
    /** Handler eliminazione appuntamento */
    onDelete?: () => void;
    /** Handler accettazione paziente (check-in) / modifica accettazione */
    onAccettazione?: () => void;
    /** P70: Handler "Accetta e Visita" — solo per appuntamenti MDL con anagrafica completa */
    onAccettaEVisita?: () => void;
    /** Handler visita paziente (stato IN_ATTESA → IN_CORSO) */
    onVisita?: () => void;
    /** P61: Handler chiama paziente nel monitor coda e poi vai a visita */
    onChiamaEVisita?: () => void;
    /** Handler per visualizzare la visita refertata (COMPLETATO/FATTURATO) */
    onViewVisita?: () => void;
    /** Handler modifica appuntamento (naviga alla pagina modifica) */
    onModifica?: () => void;
    /** Handler cambio stato appuntamento */
    onUpdateStato?: (id: string, stato: string) => Promise<void>;
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
    /** Indice colonna per overbooking */
    columnIndex?: number;
    /** Totale colonne overbooking */
    totalColumns?: number;
}

// ============================================
// CONSTANTS
// ============================================

// State label mapping
const STATO_LABEL_MAP: Record<string, string> = {
    PRENOTATO: 'Prenotato',
    CONFERMATO: 'Confermato',
    IN_ATTESA: 'In Attesa',
    IN_CORSO: 'In Visita',
    COMPLETATO: 'Refertato',
    FATTURATO: 'Fatturato',
    ANNULLATO: 'Annullato',
    NO_SHOW: 'Non Presentato',
    RINVIATO: 'Rinviato'
};

// ============================================
// COMPONENT
// ============================================

/**
 * AppuntamentoBlock - Blocco visuale per appuntamento
 * 
 * Features:
 * - Tooltip dettagliato con info paziente, medico, prestazione, prezzo
 * - Drag & drop per spostare appuntamenti
 * - Supporto overbooking con colonne multiple
 * - Colorazione basata su stato appuntamento
 * - Non permette drag per stati finali (COMPLETATO, ANNULLATO, NO_SHOW)
 */
export const AppuntamentoBlock: React.FC<AppuntamentoBlockProps> = ({
    event,
    onClick,
    onDelete,
    onAccettazione,
    onAccettaEVisita,
    onVisita,
    onChiamaEVisita,
    onViewVisita,
    onModifica,
    onUpdateStato,
    onDragStart,
    isDragging,
    viewStartHour = DEFAULT_START_HOUR,
    viewEndHour = DEFAULT_END_HOUR,
    hourHeight = HOUR_HEIGHT,
    columnIndex = 0,
    totalColumns = 1
}) => {
    // ============================================
    // STATE
    // ============================================

    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [showStatoDropdown, setShowStatoDropdown] = useState(false);
    const [isStatoSaving, setIsStatoSaving] = useState(false);
    const [statoDropdownDir, setStatoDropdownDir] = useState<'down' | 'up'>('down');

    // ============================================
    // REFS
    // ============================================

    const tooltipRef = useRef<HTMLDivElement>(null);
    const elementRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const statoButtonRef = useRef<HTMLButtonElement>(null);
    const statoDropdownRef = useRef<HTMLDivElement>(null);

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const eventStartHour = event.start.getHours() + event.start.getMinutes() / 60;
    const eventEndHour = event.end.getHours() + event.end.getMinutes() / 60;

    // Clamp to view boundaries
    const visibleStartHour = Math.max(eventStartHour, viewStartHour);
    const visibleEndHour = Math.min(eventEndHour, viewEndHour);

    // Don't render if completely outside view — flag set here, return null AFTER all hooks (Rules of Hooks)
    const isOutsideView = visibleStartHour >= viewEndHour || visibleEndHour <= viewStartHour;

    // Positioning
    const height = (visibleEndHour - visibleStartHour) * hourHeight;
    const top = (eventStartHour - viewStartHour) * hourHeight;
    const stateColors = STATO_COLORS[event.stato || 'PRENOTATO'];

    // Duration in minutes
    const durationMinutes = Math.round((eventEndHour - eventStartHour) * 60);

    // Width and position for overbooking columns
    // Leave 20% of column width free for clicking to add new appointments
    const usableWidth = 80; // percentage
    const columnWidthPercent = usableWidth / totalColumns;
    const leftPercent = 2 + (columnIndex * columnWidthPercent);
    const widthPercent = columnWidthPercent - 1; // gap between columns

    // Don't allow dragging completed, invoiced, or cancelled appointments
    const canDrag = !['COMPLETATO', 'FATTURATO', 'ANNULLATO', 'NO_SHOW'].includes(event.stato || '');

    // ============================================
    // HANDLERS
    // ============================================

    const handleDragStart = (e: React.DragEvent) => {
        // Close tooltip immediately
        setShowTooltip(false);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'appuntamento', eventId: event.id }));
        e.dataTransfer.effectAllowed = 'move';

        // Transparent drag image
        const dragImage = document.createElement('div');
        dragImage.style.cssText = 'width: 1px; height: 1px; opacity: 0.01; position: fixed; top: -1000px; left: -1000px;';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        setTimeout(() => document.body.removeChild(dragImage), 0);

        onDragStart?.(e, { type: 'appuntamento', event });
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
    };

    const handleMouseEnter = () => {
        // Clear pending timeouts
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
        }

        // Delay showing tooltip
        showTimeoutRef.current = setTimeout(() => {
            if (elementRef.current) {
                const rect = elementRef.current.getBoundingClientRect();
                const tooltipWidth = 350;
                const tooltipHeight = 400;
                const margin = 8;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                let x = rect.right + margin;
                let y = rect.top;

                // Prevent overflow
                if (x + tooltipWidth > viewportWidth - margin) {
                    x = rect.left - tooltipWidth - margin;
                    if (x < margin) x = margin;
                }
                if (y + tooltipHeight > viewportHeight - margin) {
                    y = Math.max(margin, viewportHeight - tooltipHeight - margin);
                }
                if (y < margin) y = margin;

                setTooltipPosition({ x, y });
            }
            setShowTooltip(true);
        }, 150);
    };

    const handleMouseLeave = () => {
        if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = null;
        }
        hideTimeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
        }, 150);
    };

    const handleTooltipMouseEnter = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setShowTooltip(true);
    };

    const handleTooltipMouseLeave = () => {
        // Don't hide tooltip while stato dropdown is open
        if (showStatoDropdown || isStatoSaving) return;
        hideTimeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
        }, 150);
    };

    // Stato dropdown: all possible states for each current state (excluding current)
    const ALL_STATI = ['PRENOTATO', 'CONFERMATO', 'IN_ATTESA', 'IN_CORSO', 'COMPLETATO', 'FATTURATO', 'ANNULLATO', 'NO_SHOW', 'RINVIATO'];

    const getAvailableStati = (currentStato: string): string[] => {
        return ALL_STATI.filter(s => s !== currentStato);
    };

    const handleStatoClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onUpdateStato) return;
        const currentStato = event.stato || 'PRENOTATO';
        const transitions = getAvailableStati(currentStato);
        if (transitions.length === 0) return;
        // Calculate dropdown direction
        if (statoButtonRef.current) {
            const rect = statoButtonRef.current.getBoundingClientRect();
            setStatoDropdownDir(rect.top > window.innerHeight / 2 ? 'up' : 'down');
        }
        setShowStatoDropdown(prev => !prev);
    }, [onUpdateStato, event.stato]);

    const handleStatoChange = useCallback(async (newStato: string) => {
        if (!onUpdateStato) return;
        setIsStatoSaving(true);
        try {
            await onUpdateStato(event.id, newStato);
            setShowStatoDropdown(false);
        } catch {
            // Error handled by parent
        } finally {
            setIsStatoSaving(false);
        }
    }, [onUpdateStato, event.id]);

    // Click outside to close stato dropdown
    useEffect(() => {
        if (!showStatoDropdown) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (statoDropdownRef.current?.contains(target)) return;
            if (target.closest?.('[data-stato-dropdown]')) return;
            if (statoButtonRef.current?.contains(target)) return;
            setShowStatoDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showStatoDropdown]);

    // Early return after all hooks — safe per Rules of Hooks
    if (isOutsideView) return null;

    // ============================================
    // RENDER
    // ============================================

    return (
        <div
            ref={elementRef}
            data-event-block="true"
            draggable={canDrag}
            onDragStart={canDrag ? handleDragStart : undefined}
            className={`absolute rounded ${stateColors} text-white 
                        ${canDrag ? 'cursor-grab' : 'cursor-pointer'}
                        transition-all hover:opacity-90 hover:shadow-md border-l-4 shadow-sm overflow-hidden group
                        ${isDragging ? 'opacity-50' : ''}`}
            style={{
                top: `${top}px`,
                height: `${height}px`,
                minHeight: '5px',
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                zIndex: 20 + columnIndex
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Content */}
            <div className="p-1 h-full flex">
                {canDrag && <GripVertical className="w-3 h-3 opacity-50 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                    {/* P61: Mostra "Paziente - Note" se ci sono note */}
                    <p className="text-xs font-medium truncate">
                        {event.paziente || 'Paziente'}
                        {event.note && <span className="opacity-80"> - {event.note}</span>}
                    </p>
                    {height > 35 && (
                        <>
                            {event.pazienteTelefono && <p className="text-[10px] opacity-90 truncate">{event.pazienteTelefono}</p>}
                            <p className="text-[10px] opacity-75 truncate">{formatTime(event.start)}</p>
                            {event.prestazione && height > 50 && <p className="text-[10px] opacity-75 truncate">{event.prestazione}</p>}
                        </>
                    )}
                </div>
            </div>

            {/* Tooltip via portal - z-index 65 (above sidebar z-50) */}
            {showTooltip && createPortal(
                <div
                    ref={tooltipRef}
                    className="fixed pointer-events-auto"
                    style={{
                        left: `${tooltipPosition.x}px`,
                        top: `${tooltipPosition.y}px`,
                        maxHeight: 'calc(100vh - 20px)',
                        overflow: 'auto',
                        zIndex: 65
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onMouseEnter={handleTooltipMouseEnter}
                    onMouseLeave={handleTooltipMouseLeave}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden min-w-[280px] max-w-[350px]">
                        {/* Header with Status - clickable dropdown */}
                        <div className={`px-4 py-2.5 ${stateColors}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {onUpdateStato && getAvailableStati(event.stato || 'PRENOTATO').length > 0 ? (
                                        <button
                                            ref={statoButtonRef}
                                            onClick={handleStatoClick}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1 text-white font-semibold text-sm hover:bg-white/20 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors select-none"
                                        >
                                            {isStatoSaving ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <>
                                                    {STATO_LABEL_MAP[event.stato || 'PRENOTATO'] || event.stato}
                                                    <ChevronDown className="w-3 h-3 opacity-70" />
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <span className="text-white font-semibold text-sm">
                                            {STATO_LABEL_MAP[event.stato || 'PRENOTATO'] || event.stato}
                                        </span>
                                    )}
                                    {event.isOverbooking && (
                                        <span className="bg-amber-200 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-medium">
                                            OVERBOOKING
                                        </span>
                                    )}
                                </div>
                                <span className="text-white/80 text-xs">
                                    {durationMinutes} min
                                </span>
                            </div>
                        </div>
                        {/* Stato dropdown via separate portal */}
                        {showStatoDropdown && statoButtonRef.current && createPortal(
                            <div
                                ref={statoDropdownRef}
                                data-stato-dropdown="true"
                                className="fixed"
                                style={{
                                    zIndex: 10001,
                                    left: `${statoButtonRef.current.getBoundingClientRect().left}px`,
                                    ...(statoDropdownDir === 'down'
                                        ? { top: `${statoButtonRef.current.getBoundingClientRect().bottom + 4}px` }
                                        : { bottom: `${window.innerHeight - statoButtonRef.current.getBoundingClientRect().top + 4}px` }
                                    )
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <div className="bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]">
                                    {getAvailableStati(event.stato || 'PRENOTATO').map((stato) => (
                                        <button
                                            key={stato}
                                            onClick={(e) => { e.stopPropagation(); handleStatoChange(stato); }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                                        >
                                            <span className={`w-2 h-2 rounded-full ${STATO_COLORS[stato as StatoAppuntamento] || 'bg-gray-400'}`} />
                                            {STATO_LABEL_MAP[stato] || stato}
                                        </button>
                                    ))}
                                </div>
                            </div>,
                            document.body
                        )}

                        {/* Body */}
                        <div className="p-4 space-y-3">
                            {/* Patient */}
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-teal-100 dark:bg-teal-900/40 rounded-lg">
                                    <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{event.paziente || 'Paziente'}</p>
                                    {event.pazienteTelefono && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {event.pazienteTelefono}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Time */}
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {formatTime(event.start)} - {formatTime(event.end)}
                                </p>
                            </div>

                            {/* Medico */}
                            {event.medicoNome && (
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                                        <Stethoscope className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{event.medicoNome}</p>
                                </div>
                            )}

                            {/* Prestazione */}
                            {event.prestazione && (
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                                        <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm">{event.prestazione}</p>
                                </div>
                            )}

                            {/* Prezzo, Convenzione e Numero Coda */}
                            {(event.prezzo !== undefined || event.displayNumberCoda) && (
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-green-100 dark:bg-green-900/40 rounded-lg">
                                        <span className="text-green-600 dark:text-green-400 font-bold text-xs">€</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            {event.prezzo !== undefined && (
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {event.convenzione ? (
                                                        <>
                                                            <span className="line-through text-gray-400 mr-2">
                                                                €{event.prezzo ? Number(event.prezzo).toFixed(2) : '0.00'}
                                                            </span>
                                                            <span className="text-green-600">
                                                                €{event.prezzoScontato ? Number(event.prezzoScontato).toFixed(2) : (event.prezzo ? Number(event.prezzo).toFixed(2) : '0.00')}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        `€${event.prezzo ? Number(event.prezzo).toFixed(2) : '0.00'}`
                                                    )}
                                                </p>
                                            )}
                                            {/* P61: Numero Coda */}
                                            {event.displayNumberCoda && (
                                                <span className="flex items-center gap-1 text-sm font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/40 px-2 py-0.5 rounded-full">
                                                    <Hash className="h-3 w-3" />
                                                    {event.displayNumberCoda}
                                                </span>
                                            )}
                                        </div>
                                        {event.convenzione && (
                                            <p className="text-xs text-green-600 flex items-center gap-1">
                                                <Tag className="h-3 w-3" />
                                                {event.convenzione}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Note Interne - Session #12b: comunicazione medico-segreteria */}
                            {event.noteInterne && (
                                <div className="flex items-start gap-3 p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700">
                                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex-shrink-0">
                                        <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Note Interne</p>
                                        <p className="text-sm text-amber-900 dark:text-amber-200 break-words whitespace-pre-wrap">{event.noteInterne}</p>
                                    </div>
                                </div>
                            )}

                            {/* P61: Note Pubbliche */}
                            {event.note && (
                                <div className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="p-1.5 bg-gray-100 dark:bg-gray-600 rounded-lg flex-shrink-0">
                                        <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Note</p>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap">{event.note}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer actions */}
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                            {/* P61: Queue buttons - for IN_ATTESA with active queue session */}
                            {event.stato === 'IN_ATTESA' && event.queueSessionId && (onVisita || onChiamaEVisita) && (
                                <div className="flex gap-2">
                                    {/* Visita Paziente - 1/3 width (skip chiamata, vai direttamente a visita) */}
                                    {onVisita && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setShowTooltip(false);
                                                onVisita();
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="w-1/3 text-xs bg-purple-500 hover:bg-purple-600 text-white py-2.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors font-medium shadow-sm"
                                        >
                                            <Play className="h-4 w-4" />
                                            Visita
                                        </button>
                                    )}
                                    {/* Chiama e Visita - 2/3 width (chiama nel monitor poi visita) */}
                                    {onChiamaEVisita && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setShowTooltip(false);
                                                onChiamaEVisita();
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="flex-1 text-xs bg-teal-500 hover:bg-teal-600 text-white py-2.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors font-medium shadow-sm"
                                        >
                                            <Volume2 className="h-4 w-4" />
                                            Chiama e Visita
                                        </button>
                                    )}
                                </div>
                            )}
                            {/* Visita Paziente - for IN_ATTESA WITHOUT queue session (standard workflow) */}
                            {event.stato === 'IN_ATTESA' && !event.queueSessionId && onVisita && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setShowTooltip(false);
                                        onVisita();
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full text-xs bg-purple-500 hover:bg-purple-600 text-white py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium shadow-sm"
                                >
                                    <Play className="h-4 w-4" />
                                    Visita Paziente
                                </button>
                            )}
                            {/* IN_CORSO - paziente già in visita, mostra pulsante per andare alla visita */}
                            {event.stato === 'IN_CORSO' && onVisita && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setShowTooltip(false);
                                        onVisita();
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full text-xs bg-green-500 hover:bg-green-600 text-white py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium shadow-sm"
                                >
                                    <Play className="h-4 w-4" />
                                    Vai alla Visita
                                </button>
                            )}
                            {/* Accetta Paziente - solo per PRENOTATO e CONFERMATO (non ancora accettato) */}
                            {onAccettazione && ['PRENOTATO', 'CONFERMATO'].includes(event.stato || '') && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setShowTooltip(false);
                                        onAccettazione();
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium shadow-sm bg-teal-500 hover:bg-teal-600 text-white"
                                >
                                    <UserCheck className="h-4 w-4" />
                                    Accetta Paziente
                                </button>
                            )}
                            {/* P70: Accetta e Visita - solo per MDL con anagrafica paziente completa */}
                            {onAccettaEVisita && ['PRENOTATO', 'CONFERMATO'].includes(event.stato || '') && event.tipoVisitaMDL && event.pazienteAnagraficaCompleta && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setShowTooltip(false);
                                        onAccettaEVisita();
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium shadow-sm bg-teal-700 hover:bg-teal-800 text-white"
                                    title="Accetta il paziente e apri direttamente la visita medica del lavoro"
                                >
                                    <Stethoscope className="h-4 w-4" />
                                    Accetta e Visita
                                </button>
                            )}
                            {/* Secondary actions row */}
                            <div className="flex gap-2">
                                {/* Modifica Appuntamento - solo se NON ancora accettato */}
                                {!['IN_ATTESA', 'IN_CORSO', 'COMPLETATO', 'FATTURATO'].includes(event.stato || '') && onModifica && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setShowTooltip(false);
                                            onModifica();
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <Edit className="h-3.5 w-3.5" />
                                        Modifica
                                    </button>
                                )}
                                {/* Modifica Accettazione - nascosto quando la visita è già refertata (usa "Visualizza visita") */}
                                {onAccettazione && (
                                    ['IN_ATTESA', 'IN_CORSO'].includes(event.stato || '') ||
                                    (['COMPLETATO', 'FATTURATO'].includes(event.stato || '') && !event.visitaId)
                                ) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setShowTooltip(false);
                                                onAccettazione();
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="flex-1 text-xs bg-teal-500 hover:bg-teal-600 text-white py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <UserCheck className="h-3.5 w-3.5" />
                                            Modifica Accettazione
                                        </button>
                                    )}
                                {/* Visualizza visita - solo per COMPLETATO/FATTURATO con visita presente */}
                                {['COMPLETATO', 'FATTURATO'].includes(event.stato || '') && event.visitaId && onViewVisita && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setShowTooltip(false);
                                            onViewVisita();
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        Visualizza visita
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setShowTooltip(false);
                                            onDelete();
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Elimina
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AppuntamentoBlock;
