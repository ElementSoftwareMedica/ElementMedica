/**
 * DateFilterBar - Barra filtro data riutilizzabile
 * 
 * Componente per la selezione della data con:
 * - Navigazione giorno precedente/successivo
 * - Pulsante "Oggi" per tornare alla data odierna
 * - Date picker per selezione diretta
 * - Indicatore visivo se è oggi
 * 
 * Usato in: Calendario, Agenda, Appuntamenti, Accettazione, Coda, etc.
 * 
 * @module components/ui/DateFilterBar
 */

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { DatePickerElegante } from './DatePickerElegante';
import { it } from 'date-fns/locale';

export interface DateFilterBarProps {
    /** Data attualmente selezionata */
    selectedDate: Date;
    /** Callback quando la data cambia */
    onDateChange: (date: Date) => void;
    /** Vai al giorno precedente */
    onPreviousDay: () => void;
    /** Vai al giorno successivo */
    onNextDay: () => void;
    /** Torna a oggi */
    onGoToToday: () => void;
    /** Se la data selezionata è oggi */
    isToday: boolean;
    /** Label opzionale per il filtro */
    label?: string;
    /** Classe CSS aggiuntiva */
    className?: string;
    /** Se mostrare il pulsante "Oggi" */
    showTodayButton?: boolean;
    /** Se disabilitare la navigazione ai giorni futuri */
    disableFuture?: boolean;
    /** Formato data per display */
    dateFormat?: string;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
    selectedDate,
    onDateChange,
    onPreviousDay,
    onNextDay,
    onGoToToday,
    isToday,
    label = 'Data',
    className = '',
    showTodayButton = true,
    disableFuture = false,
    dateFormat = 'EEEE d MMMM yyyy'
}) => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Chiudi date picker quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
            }
        };

        if (showDatePicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDatePicker]);

    const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const parsed = parse(value, 'yyyy-MM-dd', new Date());

        if (isValid(parsed)) {
            if (disableFuture && parsed > new Date()) {
                return; // Non permettere date future
            }
            onDateChange(parsed);
            setShowDatePicker(false);
        }
    };

    const formattedDate = format(selectedDate, dateFormat, { locale: it });
    const inputValue = format(selectedDate, 'yyyy-MM-dd');

    // Verifica se il giorno successivo è nel futuro
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isNextDayFuture = disableFuture && tomorrow > new Date();

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Label opzionale */}
            {label && (
                <span className="text-sm font-medium text-gray-600 hidden sm:inline">
                    {label}:
                </span>
            )}

            {/* Pulsante giorno precedente */}
            <button
                type="button"
                onClick={onPreviousDay}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Giorno precedente"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Data selezionata con date picker */}
            <div ref={datePickerRef} className="relative">
                <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors min-w-[200px] justify-center ${isToday
                        ? 'bg-teal-50 border-teal-200 text-teal-800'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-teal-300'
                        }`}
                >
                    <Calendar className={`h-4 w-4 ${isToday ? 'text-teal-600' : 'text-gray-500'}`} />
                    <span className="font-medium capitalize">{formattedDate}</span>
                </button>

                {/* Date picker dropdown */}
                {showDatePicker && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                        <DatePickerElegante
                            value={inputValue}
                            onChange={(date) => {
                                handleDateInputChange({ target: { value: date ? date.toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>);
                            }}
                            theme="teal"
                            size="sm"
                        />
                    </div>
                )}
            </div>

            {/* Pulsante giorno successivo */}
            <button
                type="button"
                onClick={onNextDay}
                disabled={isNextDayFuture}
                className={`p-2 rounded-lg transition-colors ${isNextDayFuture
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                aria-label="Giorno successivo"
            >
                <ChevronRight className="h-5 w-5" />
            </button>

            {/* Separatore */}
            {showTodayButton && (
                <div className="w-px h-6 bg-gray-200 mx-1" />
            )}

            {/* Pulsante "Oggi" */}
            {showTodayButton && !isToday && (
                <button
                    type="button"
                    onClick={onGoToToday}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                >
                    <CalendarDays className="h-4 w-4" />
                    Oggi
                </button>
            )}

            {/* Badge "Oggi" quando è selezionato oggi */}
            {showTodayButton && isToday && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-100 rounded-lg">
                    <CalendarDays className="h-4 w-4" />
                    Oggi
                </span>
            )}
        </div>
    );
};

export default DateFilterBar;
