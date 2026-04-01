/**
 * Date Utilities for Backend
 * 
 * Utility functions for handling dates in API requests, particularly
 * for filtering by date ranges across timezones.
 * 
 * IMPORTANT: These functions help avoid timezone bugs when users in UTC+ zones
 * select dates. The frontend sends dates in YYYY-MM-DD format (local timezone),
 * and these utilities convert them to proper UTC ranges for database queries.
 * 
 * @module utils/dateUtils
 */

/**
 * Parse a date string (YYYY-MM-DD or ISO format) to start of day in UTC
 * 
 * For YYYY-MM-DD format, interprets as local date and converts to UTC start.
 * For ISO format with 'Z' suffix, uses as-is.
 * 
 * @param {string|Date} date - Date string or Date object
 * @returns {Date} Date object at start of day (00:00:00.000)
 */
export function parseToStartOfDay(date) {
    if (!date) return null;

    const d = typeof date === 'string' ? new Date(date) : new Date(date);

    if (isNaN(d.getTime())) return null;

    // If it's just a date string (YYYY-MM-DD), append midnight to ensure
    // it's interpreted correctly by Date parser
    if (typeof date === 'string' && date.length === 10 && !date.includes('T')) {
        // YYYY-MM-DD format - create date at start of this day
        const [year, month, day] = date.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    // For full ISO strings, just set to start of that day
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Parse a date string (YYYY-MM-DD or ISO format) to end of day in UTC
 * 
 * For YYYY-MM-DD format, interprets as local date and converts to UTC end.
 * For ISO format with 'Z' suffix, uses as-is.
 * 
 * @param {string|Date} date - Date string or Date object
 * @returns {Date} Date object at end of day (23:59:59.999)
 */
export function parseToEndOfDay(date) {
    if (!date) return null;

    const d = typeof date === 'string' ? new Date(date) : new Date(date);

    if (isNaN(d.getTime())) return null;

    // If it's just a date string (YYYY-MM-DD), set to end of this day
    if (typeof date === 'string' && date.length === 10 && !date.includes('T')) {
        // YYYY-MM-DD format - create date at end of this day
        const [year, month, day] = date.split('-').map(Number);
        return new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    // For full ISO strings, just set to end of that day
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Format a Date object to YYYY-MM-DD string (local timezone)
 * 
 * @param {Date} date - Date object
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function formatDateYMD(date) {
    if (!date) return null;

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same day (ignoring time)
 * 
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if same day
 */
export function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;

    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

/**
 * Get today's date at start of day (local timezone)
 * 
 * @returns {Date} Today at 00:00:00.000
 */
export function getTodayStart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

/**
 * Get today's date at end of day (local timezone)
 * 
 * @returns {Date} Today at 23:59:59.999
 */
export function getTodayEnd() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
}

export default {
    parseToStartOfDay,
    parseToEndOfDay,
    formatDateYMD,
    isSameDay,
    getTodayStart,
    getTodayEnd
};
