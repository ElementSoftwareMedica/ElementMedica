/**
 * Medico Formatter Utilities — Backend
 *
 * Mirror del frontend `src/utils/textFormatters.ts`.
 * Fornisce helper per la formattazione dei nomi dei medici con onorifici italiani.
 *
 * IMPORTANTE: rispettare sempre il genere del medico come da DB.
 *   - FEMALE → 'Dott.ssa'
 *   - tutto il resto (MALE, OTHER, NOT_SPECIFIED, null, undefined) → 'Dott.'
 *
 * @module utils/medicoFormatters
 */

/**
 * Restituisce l'onorifico italiano per un medico.
 *
 * @param {string|null|undefined} gender - Enum gender ('MALE'|'FEMALE'|'OTHER'|'NOT_SPECIFIED')
 * @returns {'Dott.'|'Dott.ssa'}
 */
export function getMedicoTitle(gender) {
    return gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
}

/**
 * Formatta il nome completo di un medico con onorifico gender-aware.
 *
 * @param {{ firstName?: string, lastName?: string, gender?: string }} medico
 * @returns {string}  es. "Dott. Purpura Antonio" | "Dott.ssa Bianchi Laura"
 */
export function formatMedicoName(medico) {
    const title = getMedicoTitle(medico?.gender);
    const last = medico?.lastName || '';
    const first = medico?.firstName || '';
    return `${title} ${last} ${first}`.trim();
}
