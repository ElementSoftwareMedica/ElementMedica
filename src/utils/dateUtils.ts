/**
 * Date Utilities
 * Utility functions for date formatting and manipulation
 * 
 * @module utils/dateUtils
 */

/**
 * Format date with various styles
 */
export function formatDate(
    date: string | Date | null | undefined,
    style: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
    if (!date) return '---';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '---';

    const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
        short: { day: '2-digit', month: '2-digit' },
        medium: { day: '2-digit', month: '2-digit', year: 'numeric' },
        long: { day: 'numeric', month: 'long', year: 'numeric' },
        full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    };

    return d.toLocaleDateString('it-IT', optionsMap[style]);
}

/**
 * Format time from date
 */
export function formatTime(
    date: string | Date | null | undefined,
    includeSeconds: boolean = false
): string {
    if (!date) return '---';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '---';

    const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds && { second: '2-digit' })
    };

    return d.toLocaleTimeString('it-IT', options);
}

/**
 * Format date and time together
 */
export function formatDateTime(
    date: string | Date | null | undefined,
    dateStyle: 'short' | 'medium' | 'long' = 'medium',
    includeSeconds: boolean = false
): string {
    if (!date) return '---';

    return `${formatDate(date, dateStyle)} ${formatTime(date, includeSeconds)}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
    if (!date) return '---';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '---';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);

    if (diffSec < 60) return 'Adesso';
    if (diffMin < 60) return `${diffMin} minut${diffMin === 1 ? 'o' : 'i'} fa`;
    if (diffHour < 24) return `${diffHour} or${diffHour === 1 ? 'a' : 'e'} fa`;
    if (diffDay < 7) return `${diffDay} giorn${diffDay === 1 ? 'o' : 'i'} fa`;
    if (diffWeek < 4) return `${diffWeek} settiman${diffWeek === 1 ? 'a' : 'e'} fa`;
    if (diffMonth < 12) return `${diffMonth} mes${diffMonth === 1 ? 'e' : 'i'} fa`;

    return formatDate(d, 'medium');
}

/**
 * Check if date is today
 */
export function isToday(date: string | Date | null | undefined): boolean {
    if (!date) return false;

    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();

    return d.toDateString() === today.toDateString();
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: string | Date | null | undefined): boolean {
    if (!date) return false;

    const d = typeof date === 'string' ? new Date(date) : date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return d.toDateString() === yesterday.toDateString();
}

/**
 * Check if date is in the past
 */
export function isPast(date: string | Date | null | undefined): boolean {
    if (!date) return false;

    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getTime() < Date.now();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: string | Date | null | undefined): boolean {
    if (!date) return false;

    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getTime() > Date.now();
}

/**
 * Get start of day
 */
export function startOfDay(date: string | Date = new Date()): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: string | Date = new Date()): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Add days to date
 */
export function addDays(date: string | Date, days: number): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

/**
 * Get ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: string | Date = new Date()): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
}

/**
 * Parse Italian date string (DD/MM/YYYY)
 */
export function parseItalianDate(dateStr: string): Date | null {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    if (isNaN(date.getTime())) return null;
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
        return null;
    }

    return date;
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) return `${hours} or${hours === 1 ? 'a' : 'e'}`;
    return `${hours}h ${mins}min`;
}

export default {
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
    isToday,
    isYesterday,
    isPast,
    isFuture,
    startOfDay,
    endOfDay,
    addDays,
    toISODateString,
    parseItalianDate,
    formatDuration
};
