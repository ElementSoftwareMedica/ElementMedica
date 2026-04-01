/**
 * Time Column Component
 * 
 * Colonna con etichette orarie per il calendario.
 * Mostra intervalli di 5 minuti con highlight per ore e quarti d'ora.
 * 
 * @module pages/clinica/agenda/components/grid
 */

import React from 'react';
import { HOUR_HEIGHT, TIME_COLUMN_WIDTH } from '../../constants';

// ============================================
// COMPONENT PROPS
// ============================================

export interface TimeColumnProps {
    /** Ora di inizio (es. 7) */
    startHour: number;
    /** Ora di fine (es. 21) */
    endHour: number;
    /** Altezza in pixel per ogni ora (default HOUR_HEIGHT) */
    hourHeight?: number;
}

// ============================================
// COMPONENT
// ============================================

/**
 * TimeColumn - Colonna oraria del calendario
 * 
 * Features:
 * - Mostra ogni ora con etichetta completa (es. "08:00")
 * - Mostra quarti d'ora con etichetta ridotta (es. ":15")
 * - Intervalli di 5 minuti per precisione
 * - Altezza adattabile per zoom
 */
export const TimeColumn: React.FC<TimeColumnProps> = ({
    startHour,
    endHour,
    hourHeight = HOUR_HEIGHT
}) => {
    const hours = endHour - startHour;
    const fiveMinHeight = hourHeight / 12;

    return (
        <div
            className="flex-shrink-0 bg-gray-50 border-r border-gray-200"
            style={{ width: `${TIME_COLUMN_WIDTH}px` }}
        >
            {Array.from({ length: hours }, (_, i) => i + startHour).map(hour => (
                <div key={hour} className="border-b border-gray-100">
                    {/* Show each 5-minute interval */}
                    {Array.from({ length: 12 }, (_, minIdx) => {
                        const minutes = minIdx * 5;
                        const isHourMark = minutes === 0;
                        const isQuarterMark = minutes % 15 === 0 && minutes !== 0;

                        return (
                            <div
                                key={minIdx}
                                className={`pr-1 text-right text-[10px] leading-[10px] ${isHourMark ? 'text-gray-600 font-medium' : 'text-gray-400'
                                    }`}
                                style={{ height: `${fiveMinHeight}px` }}
                            >
                                {isHourMark
                                    ? `${hour.toString().padStart(2, '0')}:00`
                                    : isQuarterMark
                                        ? `:${minutes.toString().padStart(2, '0')}`
                                        : ''
                                }
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default TimeColumn;
