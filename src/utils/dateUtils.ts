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
 * Get ISO date string (YYYY-MM-DD) using LOCAL timezone
 * 
 * IMPORTANT: This uses local timezone, not UTC, to avoid
 * date shift bugs when the user is in UTC+ timezones.
 * 
 * Example: In Italy (UTC+1), new Date("2025-01-03") at midnight local
 * would become "2025-01-02" with toISOString().split('T')[0]
 * This function correctly returns "2025-01-03"
 */
export function toISODateString(date: string | Date = new Date()): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    // Use local date components to avoid timezone shift
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a date range for API calls
 * 
 * Returns start and end dates in ISO format suitable for API filtering.
 * Uses LOCAL timezone to ensure the user's selected date is respected.
 * 
 * @param start - Start date of range
 * @param end - End date of range (if null, uses start as both)
 * @returns Object with dataInizio and dataFine in YYYY-MM-DD format
 * 
 * Example: formatDateRangeForApi(new Date("2025-01-03"), new Date("2025-01-05"))
 * Returns: { dataInizio: "2025-01-03", dataFine: "2025-01-05" }
 */
export function formatDateRangeForApi(
    start: Date | null,
    end: Date | null
): { dataInizio: string | null; dataFine: string | null } {
    if (!start) {
        return { dataInizio: null, dataFine: null };
    }

    // Use the same date for both if end is not specified
    const endDate = end || start;

    return {
        dataInizio: toISODateString(start),
        dataFine: toISODateString(endDate)
    };
}

/**
 * Create a Date object set to start of day (00:00:00.000) in LOCAL timezone
 * 
 * @param date - Input date
 * @returns New Date object at start of the same local day
 */
export function toStartOfDayLocal(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Create a Date object set to end of day (23:59:59.999) in LOCAL timezone
 * 
 * @param date - Input date
 * @returns New Date object at end of the same local day
 */
export function toEndOfDayLocal(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * Format a single date for API query with start/end of day
 * 
 * For a single day filter, returns the full day range in ISO format
 * using local timezone.
 * 
 * @param date - The date to format
 * @returns Object with dateFrom and dateTo as ISO strings
 */
export function formatSingleDateForApi(date: Date): {
    dateFrom: string;
    dateTo: string;
} {
    const dateStr = toISODateString(date);
    // Return ISO date strings - backend will interpret as full day range
    return {
        dateFrom: dateStr,
        dateTo: dateStr
    };
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
    formatDuration,
    formatDateRangeForApi,
    toStartOfDayLocal,
    toEndOfDayLocal,
    formatSingleDateForApi
};
