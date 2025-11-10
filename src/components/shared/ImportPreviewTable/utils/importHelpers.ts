/**
 * Utility functions for import preview table
 * 
 * Pure functions for data normalization, comparison, and validation
 */

/**
 * Normalizes a key value for comparison (lowercase, trimmed)
 * 
 * @param value - Value to normalize
 * @param normalizer - Optional custom normalizer function
 * @returns Normalized string
 */
export function normalizeKey(
  value: unknown,
  normalizer?: (v: unknown) => string
): string {
  if (normalizer) {
    return normalizer(value);
  }
  return String(value ?? '').toLowerCase().trim();
}

/**
 * Deep equality check for arrays of strings
 * 
 * @param a - First array
 * @param b - Second array
 * @returns True if arrays are equal
 */
export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Shallow equality check for toggle objects
 * 
 * @param a - First object
 * @param b - Second object
 * @returns True if objects are shallowly equal
 */
export function togglesShallowEqual(
  a: { [id: string]: boolean },
  b: { [id: string]: boolean }
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Detects duplicate entries based on a unique key
 * 
 * @param preview - Preview data array
 * @param existing - Existing data array
 * @param uniqueKey - Key field to check for duplicates
 * @param normalizer - Optional normalizer function
 * @returns Map of row indices to duplicate info
 */
export function detectDuplicates<T extends Record<string, any>>(
  preview: T[],
  existing: T[],
  uniqueKey: string,
  normalizer?: (v: unknown) => string
): Map<number, { existingId?: string; existingItem?: T }> {
  const duplicates = new Map<number, { existingId?: string; existingItem?: T }>();
  
  const existingKeys = new Map<string, T>();
  existing.forEach(item => {
    const key = item[uniqueKey];
    if (key) {
      existingKeys.set(normalizeKey(key, normalizer), item);
    }
  });

  preview.forEach((item, index) => {
    const key = item[uniqueKey];
    if (key) {
      const normalized = normalizeKey(key, normalizer);
      if (existingKeys.has(normalized)) {
        const existingItem = existingKeys.get(normalized);
        duplicates.set(index, {
          existingId: existingItem?.id ? String(existingItem.id) : undefined,
          existingItem
        });
      }
    }
  });

  return duplicates;
}

/**
 * Formats a date string to dd/mm/yyyy format
 * 
 * @param dateString - Date string to format
 * @returns Formatted date string or original value if invalid
 */
export function formatDateForComparison(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return String(dateString);
  }
}

/**
 * Normalizes boolean values to 'true'/'false' strings
 * 
 * @param value - Value to normalize
 * @returns 'true', 'false', or empty string
 */
export function normalizeBoolean(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const s = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'sì', 'y'].includes(s)) return 'true';
  if (['false', '0', 'no', 'n'].includes(s)) return 'false';
  return '';
}

/**
 * Formats boolean value for display (Sì/No)
 * 
 * @param value - Boolean value
 * @returns 'Sì', 'No', or empty string
 */
export function formatBooleanForDisplay(value: unknown): string {
  const normalized = normalizeBoolean(value);
  if (normalized === 'true') return 'Sì';
  if (normalized === 'false') return 'No';
  return '';
}
