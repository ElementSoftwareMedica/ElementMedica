/**
 * Calendar Module - Overbooking Utilities
 * 
 * Funzioni per gestire overbooking e calcoli colonne appuntamenti sovrapposti.
 * 
 * @module pages/clinica/agenda/utils/overbookingUtils
 */

import { CalendarEvent, OverbookingColumn } from '../types/calendar.types';
import { MAX_OVERBOOKING_COLUMNS } from '../constants';
import { minutesToTimeString } from './timeUtils';

/**
 * Calculate overbooking columns for overlapping appointments
 * Returns appointments with their column index and total columns at that position
 * 
 * @param appointments - Array of calendar events to process
 * @returns Array of OverbookingColumn with column assignments
 */
export const calculateOverbookingColumns = (appointments: CalendarEvent[]): OverbookingColumn[] => {
    if (appointments.length === 0) return [];

    // Sort by start time
    const sorted = [...appointments].sort((a, b) => a.start.getTime() - b.start.getTime());

    // Result array
    const result: OverbookingColumn[] = [];

    // Track active columns (appointments that are still ongoing at current time)
    const activeColumns: (CalendarEvent | null)[] = [];

    for (const event of sorted) {
        // Remove finished appointments from active columns
        for (let i = 0; i < activeColumns.length; i++) {
            if (activeColumns[i] && activeColumns[i]!.end <= event.start) {
                activeColumns[i] = null;
            }
        }

        // Find first available column (up to MAX_OVERBOOKING_COLUMNS)
        let columnIndex = -1;
        for (let i = 0; i < MAX_OVERBOOKING_COLUMNS; i++) {
            if (activeColumns[i] === null || activeColumns[i] === undefined) {
                columnIndex = i;
                break;
            }
        }

        // If no column available, use the last one (stacking)
        if (columnIndex === -1) {
            columnIndex = MAX_OVERBOOKING_COLUMNS - 1;
        }

        // Assign to column
        activeColumns[columnIndex] = event;

        // Count how many columns are active at this moment
        const activeCount = activeColumns.filter(c => c !== null && c !== undefined).length;

        result.push({
            event,
            columnIndex,
            totalColumns: Math.min(activeCount, MAX_OVERBOOKING_COLUMNS)
        });
    }

    // Update totalColumns for all overlapping appointments
    // We need a second pass to get accurate totalColumns for each time slot
    for (let i = 0; i < result.length; i++) {
        const curr = result[i];
        let maxOverlapping = 1;

        for (let j = 0; j < result.length; j++) {
            if (i === j) continue;
            const other = result[j];

            // Check if they overlap
            if (curr.event.start < other.event.end && curr.event.end > other.event.start) {
                maxOverlapping = Math.max(maxOverlapping, Math.max(curr.columnIndex, other.columnIndex) + 1);
            }
        }

        curr.totalColumns = Math.min(maxOverlapping, MAX_OVERBOOKING_COLUMNS);
    }

    return result;
};
