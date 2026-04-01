/**
 * Mini Calendar Component
 * 
 * Calendario mensile compatto per selezione date con supporto drag multi-selezione.
 * 
 * @module pages/clinica/agenda/components/panels
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { MONTHS_IT, DAYS_OF_WEEK_SHORT } from '../../constants';
import { isSameDay } from '../../utils';

// ============================================
// COMPONENT PROPS
// ============================================

export interface MiniCalendarProps {
    /** Mese corrente visualizzato */
    currentMonth: Date;
    /** Date selezionate */
    selectedDates: Date[];
    /** Handler toggle singola data */
    onDateToggle: (date: Date) => void;
    /** Handler selezione multipla date */
    onDatesSelect: (dates: Date[]) => void;
    /** Handler cambio mese */
    onMonthChange: (delta: number) => void;
}

// ============================================
// COMPONENT
// ============================================

/**
 * MiniCalendar - Calendario mensile compatto
 * 
 * Features:
 * - Vista mensile compatta
 * - Click singolo per toggle data
 * - Drag per selezione range
 * - Evidenziazione oggi e date selezionate
 * - Supporto giorni mesi adiacenti
 */
export const MiniCalendar: React.FC<MiniCalendarProps> = ({
    currentMonth,
    selectedDates,
    onDateToggle,
    onDatesSelect,
    onMonthChange
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Date | null>(null);
    const [dragEnd, setDragEnd] = useState<Date | null>(null);
    const [hasMoved, setHasMoved] = useState(false);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get first day of month
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Calculate start padding (days from previous month) - Monday = 0
    const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startPadding = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // Convert to Monday = 0

    // Calculate end padding (days from next month)
    const lastDayWeekday = lastDayOfMonth.getDay();
    const endPadding = lastDayWeekday === 0 ? 0 : 7 - lastDayWeekday; // Days needed to complete last week

    const totalDays = lastDayOfMonth.getDate();

    // Generate calendar grid with previous and next month days
    const days: Date[] = [];

    // Add days from previous month
    for (let i = startPadding; i > 0; i--) {
        const prevDate = new Date(year, month, 1 - i);
        days.push(prevDate);
    }

    // Add days from current month
    for (let i = 1; i <= totalDays; i++) {
        days.push(new Date(year, month, i));
    }

    // Add days from next month
    for (let i = 1; i <= endPadding; i++) {
        days.push(new Date(year, month + 1, i));
    }

    const isSelected = (date: Date) => {
        return selectedDates.some(d => isSameDay(d, date));
    };

    const isToday = (date: Date) => {
        return isSameDay(date, new Date());
    };

    const isCurrentMonth = (date: Date) => {
        return date.getMonth() === month;
    };

    // Check if date is in drag range
    const isInDragRange = (date: Date) => {
        if (!isDragging || !dragStart) return false;
        const end = dragEnd || dragStart;
        const start = dragStart.getTime() < end.getTime() ? dragStart : end;
        const endDate = dragStart.getTime() < end.getTime() ? end : dragStart;
        return date.getTime() >= start.getTime() && date.getTime() <= endDate.getTime();
    };

    const handleMouseDown = (date: Date) => {
        setIsDragging(true);
        setDragStart(date);
        setDragEnd(date);
        setHasMoved(false);
    };

    const handleMouseEnter = (date: Date) => {
        if (!isDragging) return;
        if (!isSameDay(date, dragStart!)) {
            setHasMoved(true);
        }
        setDragEnd(date);
    };

    const handleMouseUp = () => {
        if (isDragging && dragStart) {
            if (!hasMoved) {
                // Single click - toggle the date
                onDateToggle(dragStart);
            } else {
                // Drag - select range
                const end = dragEnd || dragStart;
                const start = dragStart.getTime() < end.getTime() ? dragStart : end;
                const endDate = dragStart.getTime() < end.getTime() ? end : dragStart;

                // Generate all dates in range
                const dates: Date[] = [];
                const current = new Date(start);
                while (current <= endDate) {
                    dates.push(new Date(current));
                    current.setDate(current.getDate() + 1);
                }
                onDatesSelect(dates);
            }
        }
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        setHasMoved(false);
    };

    return (
        <div
            className="bg-white border-b border-gray-200 select-none"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Month navigation */}
            <div className="flex items-center justify-between px-3 py-2">
                <button onClick={() => onMonthChange(-1)} className="p-1 hover:bg-gray-100 rounded">
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-gray-700">
                    {MONTHS_IT[month].toUpperCase()} {year}
                </span>
                <button onClick={() => onMonthChange(1)} className="p-1 hover:bg-gray-100 rounded">
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 px-2">
                {DAYS_OF_WEEK_SHORT.map((day, i) => (
                    <div key={i} className="text-center text-[10px] text-gray-500 py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 px-2 pb-2 gap-0.5">
                {days.map((date, i) => {
                    const inCurrentMonth = isCurrentMonth(date);
                    return (
                        <button
                            key={i}
                            onMouseDown={() => handleMouseDown(date)}
                            onMouseEnter={() => handleMouseEnter(date)}
                            className={`h-7 w-7 text-xs rounded-full flex items-center justify-center transition-colors
                                ${isInDragRange(date) ? 'bg-teal-200' : ''}
                                ${isSelected(date) && !isInDragRange(date) ? 'bg-teal-600 text-white' : ''}
                                ${isToday(date) && !isSelected(date) && !isInDragRange(date) ? 'border-2 border-teal-500 text-teal-600 font-bold' : ''}
                                ${!isSelected(date) && !isToday(date) && !isInDragRange(date) && inCurrentMonth ? 'hover:bg-gray-100 text-gray-700' : ''}
                                ${!inCurrentMonth && !isSelected(date) && !isInDragRange(date) ? 'text-gray-300 hover:bg-gray-50' : ''}`}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MiniCalendar;
