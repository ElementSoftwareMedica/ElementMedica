/**
 * Drag & Drop Preview Components
 * 
 * Componenti per visualizzare preview durante drag & drop nel calendario.
 * 
 * @module pages/clinica/agenda/components/blocks
 */

import React from 'react';
import { ColorScheme } from '../../types';
import { HOUR_HEIGHT, DEFAULT_START_HOUR } from '../../constants';
import { formatDuration } from '../../utils/timeUtils';

// ============================================
// DRAG PREVIEW
// ============================================

export interface DragPreviewProps {
    /** Ora di inizio del drag */
    startHour: number;
    /** Ora di fine del drag */
    endHour: number;
    /** Schema colore */
    color: ColorScheme;
    /** Ora inizio vista */
    viewStartHour?: number;
    /** Altezza in pixel per ogni ora */
    hourHeight?: number;
}

/**
 * DragPreview - Preview durante il drag per creare disponibilità
 * 
 * Mostra un'anteprima visiva della durata selezionata
 * durante la creazione di un nuovo slot di disponibilità.
 */
export const DragPreview: React.FC<DragPreviewProps> = ({
    startHour,
    endHour,
    color,
    viewStartHour = DEFAULT_START_HOUR,
    hourHeight = HOUR_HEIGHT
}) => {
    const height = (endHour - startHour) * hourHeight;
    const top = (startHour - viewStartHour) * hourHeight;

    return (
        <div
            className={`absolute left-0.5 right-0.5 ${color.bg} bg-opacity-40 ${color.border} border-2 border-dashed rounded pointer-events-none`}
            style={{ top: `${top}px`, height: `${height}px`, zIndex: 15 }}
        >
            <div className={`text-xs ${color.text} p-1 font-medium`}>
                {formatDuration(Math.round((endHour - startHour) * 60))}
            </div>
        </div>
    );
};

// ============================================
// DROP PREVIEW
// ============================================

export interface DropPreviewProps {
    /** Ora di inizio drop */
    startHour: number;
    /** Durata in minuti */
    durationMinutes: number;
    /** Tipo di evento (disponibilita o appuntamento) */
    type: 'disponibilita' | 'appuntamento';
    /** Ora inizio vista */
    viewStartHour?: number;
    /** Altezza in pixel per ogni ora */
    hourHeight?: number;
}

/**
 * DropPreview - Preview durante il drop di un evento esistente
 * 
 * Mostra un'anteprima della nuova posizione quando si trascina
 * un evento esistente verso una nuova posizione.
 */
export const DropPreview: React.FC<DropPreviewProps> = ({
    startHour,
    durationMinutes,
    type,
    viewStartHour = DEFAULT_START_HOUR,
    hourHeight = HOUR_HEIGHT
}) => {
    const height = (durationMinutes / 60) * hourHeight;
    const top = (startHour - viewStartHour) * hourHeight;

    // Colori diversi per tipo
    const colors = type === 'disponibilita'
        ? 'bg-teal-200 border-teal-400'
        : 'bg-blue-200 border-blue-400';

    return (
        <div
            className={`absolute left-0.5 right-0.5 ${colors} bg-opacity-60 border-2 border-dashed rounded pointer-events-none flex items-center justify-center`}
            style={{ top: `${top}px`, height: `${height}px`, zIndex: 25 }}
        >
            <div className="text-xs font-medium text-gray-700">
                Sposta qui
            </div>
        </div>
    );
};

export default { DragPreview, DropPreview };
