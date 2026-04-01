/**
 * useDateFilter - Hook per gestione filtro data con persistenza giornaliera
 * 
 * Questo hook gestisce un filtro data che:
 * - Persiste la selezione in localStorage
 * - Si resetta automaticamente alla data odierna ogni nuovo giorno
 * - Supporta diverse modalità: data singola o range settimanale
 * 
 * Features:
 * - Al primo accesso del giorno, resetta alla data odierna
 * - Se l'utente cambia pagina e torna, mantiene la selezione
 * - Il giorno dopo, resetta automaticamente
 * - API semplice per componenti
 * 
 * @module hooks/useDateFilter
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfDay, isToday, parseISO, isValid, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

// ============================================
// TYPES
// ============================================

export type DateFilterMode = 'single' | 'week' | 'range';

export interface DateRange {
    start: Date;
    end: Date;
}

export interface UseDateFilterOptions {
    /** Chiave unica per localStorage (es: 'calendario', 'agenda') */
    storageKey: string;
    /** Modalità: 'single' = data singola, 'week' = settimana, 'range' = range custom */
    mode?: DateFilterMode;
    /** Data iniziale di default (se non in localStorage) - default: oggi */
    defaultDate?: Date;
    /** Se true, usa la settimana italiana (inizia Lunedì) */
    weekStartsMonday?: boolean;
}

export interface DateFilterState {
    /** Data selezionata (per mode 'single') */
    selectedDate: Date;
    /** Range selezionato (per mode 'week' o 'range') */
    dateRange: DateRange;
    /** Se è stato appena resettato (primo accesso del giorno) */
    wasReset: boolean;
}

export interface UseDateFilterReturn extends DateFilterState {
    /** Imposta una nuova data */
    setDate: (date: Date) => void;
    /** Imposta un range di date */
    setRange: (range: DateRange) => void;
    /** Vai al giorno precedente */
    goToPreviousDay: () => void;
    /** Vai al giorno successivo */
    goToNextDay: () => void;
    /** Vai alla settimana precedente */
    goToPreviousWeek: () => void;
    /** Vai alla settimana successiva */
    goToNextWeek: () => void;
    /** Torna a oggi */
    goToToday: () => void;
    /** Torna alla settimana corrente */
    goToCurrentWeek: () => void;
    /** Resetta manualmente ai default */
    reset: () => void;
    /** Data formattata per display */
    formattedDate: string;
    /** Range formattato per display */
    formattedRange: string;
    /** Se la data selezionata è oggi */
    isToday: boolean;
    /** Se la settimana selezionata è la settimana corrente */
    isCurrentWeek: boolean;
    /** Data come stringa ISO (per API) */
    isoDate: string;
    /** Range come oggetto ISO (per API) */
    isoRange: { start: string; end: string };
}

// ============================================
// STORAGE KEYS
// ============================================

const LAST_ACCESS_PREFIX = 'date-filter-last-access';
const DATE_STORAGE_PREFIX = 'date-filter-value';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getTodayString = (): string => format(new Date(), 'yyyy-MM-dd');

const getStorageKeys = (storageKey: string) => ({
    lastAccess: `${LAST_ACCESS_PREFIX}-${storageKey}`,
    value: `${DATE_STORAGE_PREFIX}-${storageKey}`
});

const getWeekRange = (date: Date, weekStartsMonday: boolean = true): DateRange => {
    const weekOptions = { weekStartsOn: weekStartsMonday ? 1 : 0 as 0 | 1 };
    return {
        start: startOfWeek(date, weekOptions),
        end: endOfWeek(date, weekOptions)
    };
};

// ============================================
// HOOK
// ============================================

export const useDateFilter = (options: UseDateFilterOptions): UseDateFilterReturn => {
    const {
        storageKey,
        mode = 'single',
        defaultDate = new Date(),
        weekStartsMonday = true
    } = options;

    const { lastAccess: lastAccessKey, value: valueKey } = useMemo(
        () => getStorageKeys(storageKey),
        [storageKey]
    );

    // State
    const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(defaultDate));
    const [dateRange, setDateRange] = useState<DateRange>(() => getWeekRange(defaultDate, weekStartsMonday));
    const [wasReset, setWasReset] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Initialize from localStorage or reset if new day
    useEffect(() => {
        const today = getTodayString();
        const lastAccessDate = localStorage.getItem(lastAccessKey);
        const savedValue = localStorage.getItem(valueKey);

        // Check if first access today
        const isNewDay = lastAccessDate !== today;

        if (isNewDay) {
            // First access of the day - reset to today
            const now = new Date();
            const todayStart = startOfDay(now);
            const todayRange = getWeekRange(now, weekStartsMonday);

            if (mode === 'single') {
                setSelectedDate(todayStart);
                localStorage.setItem(valueKey, todayStart.toISOString());
            } else {
                setDateRange(todayRange);
                localStorage.setItem(valueKey, JSON.stringify({
                    start: todayRange.start.toISOString(),
                    end: todayRange.end.toISOString()
                }));
            }

            // Mark today as accessed
            localStorage.setItem(lastAccessKey, today);
            setWasReset(true);
        } else if (savedValue) {
            // Not a new day - restore from localStorage
            try {
                if (mode === 'single') {
                    const parsed = parseISO(savedValue);
                    if (isValid(parsed)) {
                        setSelectedDate(startOfDay(parsed));
                    }
                } else {
                    const parsed = JSON.parse(savedValue);
                    const start = parseISO(parsed.start);
                    const end = parseISO(parsed.end);
                    if (isValid(start) && isValid(end)) {
                        setDateRange({ start, end });
                    }
                }
            } catch {
                // Invalid stored value - use defaults
            }
            setWasReset(false);
        }

        setInitialized(true);
    }, [lastAccessKey, valueKey, mode, weekStartsMonday]);

    // Persist changes to localStorage
    const persistDate = useCallback((date: Date) => {
        localStorage.setItem(valueKey, date.toISOString());
    }, [valueKey]);

    const persistRange = useCallback((range: DateRange) => {
        localStorage.setItem(valueKey, JSON.stringify({
            start: range.start.toISOString(),
            end: range.end.toISOString()
        }));
    }, [valueKey]);

    // Actions
    const setDate = useCallback((date: Date) => {
        const normalizedDate = startOfDay(date);
        setSelectedDate(normalizedDate);
        setWasReset(false);
        persistDate(normalizedDate);

        // Also update range if in week mode
        if (mode === 'week') {
            const newRange = getWeekRange(normalizedDate, weekStartsMonday);
            setDateRange(newRange);
            persistRange(newRange);
        }
    }, [mode, weekStartsMonday, persistDate, persistRange]);

    const setRange = useCallback((range: DateRange) => {
        setDateRange(range);
        setWasReset(false);
        persistRange(range);

        // Also update single date to start of range
        setSelectedDate(startOfDay(range.start));
    }, [persistRange]);

    const goToPreviousDay = useCallback(() => {
        setDate(addDays(selectedDate, -1));
    }, [selectedDate, setDate]);

    const goToNextDay = useCallback(() => {
        setDate(addDays(selectedDate, 1));
    }, [selectedDate, setDate]);

    const goToPreviousWeek = useCallback(() => {
        const newStart = addDays(dateRange.start, -7);
        setRange(getWeekRange(newStart, weekStartsMonday));
    }, [dateRange.start, weekStartsMonday, setRange]);

    const goToNextWeek = useCallback(() => {
        const newStart = addDays(dateRange.start, 7);
        setRange(getWeekRange(newStart, weekStartsMonday));
    }, [dateRange.start, weekStartsMonday, setRange]);

    const goToToday = useCallback(() => {
        setDate(new Date());
    }, [setDate]);

    const goToCurrentWeek = useCallback(() => {
        setRange(getWeekRange(new Date(), weekStartsMonday));
    }, [weekStartsMonday, setRange]);

    const reset = useCallback(() => {
        const now = new Date();
        if (mode === 'single') {
            setDate(startOfDay(now));
        } else {
            setRange(getWeekRange(now, weekStartsMonday));
        }
        setWasReset(true);
    }, [mode, weekStartsMonday, setDate, setRange]);

    // Computed values
    const formattedDate = useMemo(() => {
        return format(selectedDate, 'EEEE d MMMM yyyy', { locale: it });
    }, [selectedDate]);

    const formattedRange = useMemo(() => {
        const startStr = format(dateRange.start, 'd MMM', { locale: it });
        const endStr = format(dateRange.end, 'd MMM yyyy', { locale: it });
        return `${startStr} - ${endStr}`;
    }, [dateRange]);

    const isTodaySelected = useMemo(() => isToday(selectedDate), [selectedDate]);

    const isCurrentWeekSelected = useMemo(() => {
        const currentWeek = getWeekRange(new Date(), weekStartsMonday);
        return (
            format(dateRange.start, 'yyyy-MM-dd') === format(currentWeek.start, 'yyyy-MM-dd') &&
            format(dateRange.end, 'yyyy-MM-dd') === format(currentWeek.end, 'yyyy-MM-dd')
        );
    }, [dateRange, weekStartsMonday]);

    const isoDate = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

    const isoRange = useMemo(() => ({
        start: format(dateRange.start, 'yyyy-MM-dd'),
        end: format(dateRange.end, 'yyyy-MM-dd')
    }), [dateRange]);

    return {
        // State
        selectedDate,
        dateRange,
        wasReset: wasReset && initialized,

        // Actions
        setDate,
        setRange,
        goToPreviousDay,
        goToNextDay,
        goToPreviousWeek,
        goToNextWeek,
        goToToday,
        goToCurrentWeek,
        reset,

        // Computed
        formattedDate,
        formattedRange,
        isToday: isTodaySelected,
        isCurrentWeek: isCurrentWeekSelected,
        isoDate,
        isoRange
    };
};

export default useDateFilter;
