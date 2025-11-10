/**
 * Costanti per il ScheduleEventModal
 * 
 * Questo file contiene tutte le costanti utilizzate nel modal di programmazione eventi,
 * estratte per migliorare la manutenibilità e la riusabilità del codice.
 */

/**
 * Modalità di erogazione dei corsi
 */
export const DELIVERY_MODES = [
  { value: 'in-person', label: 'In presenza' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Ibrido' },
  { value: 'blended', label: 'Blended' }
];

/**
 * Opzioni per i livelli di rischio
 */
export const RISK_LEVEL_OPTIONS = [
  { value: 'BASSO', label: 'Basso' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'ALTO', label: 'Alto' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
];

/**
 * Opzioni per i tipi di corso
 */
export const COURSE_TYPE_OPTIONS = [
  { value: 'PRIMO_CORSO', label: 'Primo corso' },
  { value: 'AGGIORNAMENTO', label: 'Aggiornamento' },
];

/**
 * Tipi per TypeScript
 */
export type DeliveryMode = typeof DELIVERY_MODES[number]['value'];
export type RiskLevel = typeof RISK_LEVEL_OPTIONS[number]['value'];
export type CourseType = typeof COURSE_TYPE_OPTIONS[number]['value'];

/**
 * Opzioni combinate per facilità d'uso
 */
export const SCHEDULE_MODAL_CONSTANTS = {
  DELIVERY_MODES,
  RISK_LEVEL_OPTIONS,
  COURSE_TYPE_OPTIONS
} as const;