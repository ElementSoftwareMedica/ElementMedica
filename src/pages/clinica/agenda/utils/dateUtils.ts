/**
 * Calendar Module - Date Utilities
 * 
 * Funzioni utility per manipolazione date nel calendario.
 * 
 * @module pages/clinica/agenda/utils/dateUtils
 */

import { DAYS_OF_WEEK, DAYS_OF_WEEK_SHORT, MONTHS_IT, DAYS_FULL } from '../constants';

/**
 * Formatta una data in formato ISO (YYYY-MM-DD)
 */
export const formatDateISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formatta una data nel formato italiano (GG/MM/YYYY)
 */
export const formatDateIT = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Ottiene il nome del giorno della settimana (abbreviato)
 */
export const getDayName = (date: Date): string => {
    const dayIndex = (date.getDay() + 6) % 7; // Lunedì = 0
    return DAYS_OF_WEEK[dayIndex];
};

/**
 * Ottiene il nome del giorno della settimana (molto abbreviato)
 */
export const getDayNameShort = (date: Date): string => {
    const dayIndex = (date.getDay() + 6) % 7;
    return DAYS_OF_WEEK_SHORT[dayIndex];
};

/**
 * Ottiene il nome del giorno completo
 */
export const getDayNameFull = (date: Date): string => {
    const dayIndex = (date.getDay() + 6) % 7;
    return DAYS_FULL[dayIndex];
};

/**
 * Ottiene il nome del mese in italiano
 */
export const getMonthName = (date: Date): string => {
    return MONTHS_IT[date.getMonth()];
};

/**
 * Ottiene il primo giorno della settimana (lunedì)
 */
export const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Ottiene l'ultimo giorno della settimana (domenica)
 */
export const getWeekEnd = (date: Date): Date => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
};

/**
 * Ottiene il primo giorno del mese
 */
export const getMonthStart = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * Ottiene l'ultimo giorno del mese
 */
export const getMonthEnd = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

/**
 * Genera array di date per la settimana
 */
export const getWeekDates = (startDate: Date): Date[] => {
    const dates: Date[] = [];
    const start = getWeekStart(startDate);

    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dates.push(d);
    }

    return dates;
};

/**
 * Genera array di date per un range
 */
export const getDateRange = (startDate: Date, endDate: Date): Date[] => {
    const dates: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
};

/**
 * Verifica se due date sono lo stesso giorno
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};

/**
 * Verifica se una data è oggi
 */
export const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date());
};

/**
 * Aggiunge giorni a una data
 */
export const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 * Sottrae giorni da una data
 */
export const subtractDays = (date: Date, days: number): Date => {
    return addDays(date, -days);
};

/**
 * Calcola differenza in giorni tra due date
 */
export const daysDifference = (date1: Date, date2: Date): number => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
};

/**
 * Formatta un date range per display
 */
export const formatDateRange = (dates: Date[]): string => {
    if (dates.length === 0) return '';
    if (dates.length === 1) {
        return formatDateIT(dates[0]);
    }

    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // Se sono date consecutive
    if (daysDifference(first, last) === sorted.length - 1) {
        return `${formatDateIT(first)} - ${formatDateIT(last)}`;
    }

    // Date non consecutive - mostra prima e ultima
    return `${formatDateIT(first)} ... ${formatDateIT(last)}`;
};

/**
 * Parsa una stringa data ISO in Date
 */
export const parseISODate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Crea una data a mezzanotte (inizio giornata)
 */
export const startOfDay = (date: Date): Date => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

/**
 * Crea una data a fine giornata
 */
export const endOfDay = (date: Date): Date => {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
};
