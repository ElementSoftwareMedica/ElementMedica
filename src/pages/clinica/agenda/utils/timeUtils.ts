/**
 * Calendar Module - Time Utilities
 * 
 * Funzioni utility per manipolazione orari nel calendario.
 * 
 * @module pages/clinica/agenda/utils/timeUtils
 */

import { HOUR_HEIGHT, FIVE_MIN_HEIGHT } from '../constants';
import type { TimeSlot } from '../types';

/**
 * Converte un'ora e minuti in posizione Y pixel
 */
export const timeToPosition = (
    hour: number,
    minute: number,
    startHour: number
): number => {
    const hoursFromStart = hour - startHour;
    return (hoursFromStart * HOUR_HEIGHT) + (minute / 5) * FIVE_MIN_HEIGHT;
};

/**
 * Converte una posizione Y pixel in ora e minuti
 */
export const positionToTime = (
    position: number,
    startHour: number
): { hour: number; minute: number } => {
    const totalMinutes = (position / FIVE_MIN_HEIGHT) * 5;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    return {
        hour: startHour + hours,
        minute: Math.round(minutes / 5) * 5 // Arrotonda a 5 minuti
    };
};

/**
 * Formatta orario in formato HH:MM
 */
export const formatTime = (hour: number, minute: number = 0): string => {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

/**
 * Parsa una stringa orario HH:MM in ore e minuti
 */
export const parseTime = (timeString: string): { hour: number; minute: number } => {
    const [hourStr, minuteStr] = timeString.split(':');
    return {
        hour: parseInt(hourStr, 10),
        minute: parseInt(minuteStr, 10)
    };
};

/**
 * Calcola la durata in minuti tra due orari
 */
export const calculateDuration = (
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number
): number => {
    return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
};

/**
 * Calcola l'orario di fine dato inizio e durata
 */
export const calculateEndTime = (
    startHour: number,
    startMinute: number,
    durationMinutes: number
): { hour: number; minute: number } => {
    const totalMinutes = startHour * 60 + startMinute + durationMinutes;
    return {
        hour: Math.floor(totalMinutes / 60),
        minute: totalMinutes % 60
    };
};

/**
 * Genera array di TimeSlot per il calendario
 */
export const generateTimeSlots = (
    startHour: number,
    endHour: number,
    intervalMinutes: number = 60
): TimeSlot[] => {
    const slots: TimeSlot[] = [];

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
            slots.push({
                hour,
                minutes: minute,
                label: formatTime(hour, minute)
            });
        }
    }

    return slots;
};

/**
 * Verifica se un orario è dentro un range
 */
export const isTimeInRange = (
    hour: number,
    minute: number,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number
): boolean => {
    const time = hour * 60 + minute;
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    return time >= start && time < end;
};

/**
 * Arrotonda un orario al più vicino intervallo
 */
export const roundToInterval = (
    hour: number,
    minute: number,
    intervalMinutes: number = 5
): { hour: number; minute: number } => {
    const totalMinutes = hour * 60 + minute;
    const rounded = Math.round(totalMinutes / intervalMinutes) * intervalMinutes;

    return {
        hour: Math.floor(rounded / 60),
        minute: rounded % 60
    };
};

/**
 * Converte minuti totali in ore e minuti
 */
export const minutesToTime = (totalMinutes: number): { hour: number; minute: number } => {
    return {
        hour: Math.floor(totalMinutes / 60),
        minute: totalMinutes % 60
    };
};

/**
 * Converte minuti totali in stringa formato HH:MM
 * Usato per display nel calendario
 * Arrotonda i minuti per gestire errori di precisione floating-point
 */
export const minutesToTimeString = (minutes: number): string => {
    // Arrotonda per gestire errori floating-point (es: 970.0000000000114 → 970)
    const roundedMinutes = Math.round(minutes);
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Converte ore e minuti in minuti totali
 */
export const timeToMinutes = (hour: number, minute: number): number => {
    return hour * 60 + minute;
};

/**
 * Formatta durata in formato leggibile (es: "1h 30m")
 */
export const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
};

/**
 * Calcola overlap tra due intervalli temporali
 */
export const timeOverlap = (
    start1: number,
    end1: number,
    start2: number,
    end2: number
): number => {
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    return Math.max(0, overlapEnd - overlapStart);
};

/**
 * Verifica se due intervalli temporali si sovrappongono
 */
export const doTimesOverlap = (
    start1Hour: number, start1Minute: number, end1Hour: number, end1Minute: number,
    start2Hour: number, start2Minute: number, end2Hour: number, end2Minute: number
): boolean => {
    const start1 = timeToMinutes(start1Hour, start1Minute);
    const end1 = timeToMinutes(end1Hour, end1Minute);
    const start2 = timeToMinutes(start2Hour, start2Minute);
    const end2 = timeToMinutes(end2Hour, end2Minute);

    return start1 < end2 && end1 > start2;
};
