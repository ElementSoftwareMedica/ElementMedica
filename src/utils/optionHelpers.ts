/**
 * Shared helpers for rendering campo options that can be either strings or {label, value} objects.
 * Used across modulistica, questionari, and preview components.
 *
 * @module utils/optionHelpers
 */

export type OptionItem = string | { value: string; label: string; score?: number };

/**
 * Extract a displayable label from an option that may be string or {label, value}.
 */
export function getOptionLabel(opt: OptionItem): string {
    if (typeof opt === 'string') return opt;
    if (opt && typeof opt === 'object') return opt.label || opt.value || '';
    return String(opt ?? '');
}

/**
 * Extract the value from an option that may be string or {label, value}.
 */
export function getOptionValue(opt: OptionItem): string {
    if (typeof opt === 'string') return opt;
    if (opt && typeof opt === 'object') return opt.value || opt.label || '';
    return String(opt ?? '');
}

/**
 * Normalize a single option to {value, label} format.
 */
export function normalizeOption(opt: OptionItem): { value: string; label: string; score?: number } {
    if (typeof opt === 'string') return { value: opt, label: opt };
    if (opt && typeof opt === 'object') return { value: opt.value || opt.label, label: opt.label || opt.value, score: opt.score };
    return { value: String(opt ?? ''), label: String(opt ?? '') };
}

/**
 * Normalize an array of options.
 */
export function normalizeOptions(options?: OptionItem[]): Array<{ value: string; label: string; score?: number }> {
    if (!options || !Array.isArray(options)) return [];
    return options.map(normalizeOption);
}
