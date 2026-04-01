/**
 * Text Formatters - Backend
 * 
 * Utility functions for formatting text output (emails, SMS, calendar entries).
 * Mirrors the frontend formatMedicoName() convention:
 * - "Dott." for MALE or unknown gender
 * - "Dott.ssa" for FEMALE
 * - NEVER "Dr." (English style not appropriate for Italian medical context)
 */

/**
 * Returns the correct Italian honorific prefix based on gender.
 * @param {string|undefined} gender - 'MALE', 'FEMALE', 'OTHER', or undefined
 * @returns {string} 'Dott.' or 'Dott.ssa'
 */
export function getMedicoPrefix(gender) {
  return gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
}

/**
 * Format a medico name with proper Italian honorific.
 * @param {Object} medico - Medico object with at least { lastName } and optionally { firstName, gender }
 * @returns {string} Formatted name (e.g., "Dott. Rossi" or "Dott.ssa Bianchi")
 */
export function formatMedicoName(medico) {
  if (!medico) return '';
  const prefix = getMedicoPrefix(medico.gender || medico.sesso);
  const parts = [
    prefix,
    medico.firstName || '',
    medico.lastName || '',
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * Format a medico name using just the surname (for short references).
 * @param {Object} medico - Medico object with { lastName } and optionally { gender }
 * @returns {string} E.g., "Dott. Rossi"
 */
export function formatMedicoShortName(medico) {
  if (!medico) return '';
  const prefix = getMedicoPrefix(medico.gender || medico.sesso);
  return `${prefix} ${medico.lastName || ''}`.trim();
}

export default {
  getMedicoPrefix,
  formatMedicoName,
  formatMedicoShortName,
};
