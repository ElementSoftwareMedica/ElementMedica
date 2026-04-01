/**
 * Calendar Module - Constants
 * 
 * Costanti per il modulo calendario clinico.
 * Include dimensioni, preset orari, colori e label.
 * 
 * @module pages/clinica/agenda/constants
 */

import { StatoAppuntamento } from '../../../../services/clinicaApi';
import type { ColorScheme, TimePreset } from '../types';

// ============================================
// LAYOUT DIMENSIONS
// ============================================

/** Altezza in pixel per ogni ora nel calendario */
export const HOUR_HEIGHT = 60;

/** Altezza in pixel per ogni intervallo di 5 minuti */
export const FIVE_MIN_HEIGHT = 10;

/** Larghezza minima in pixel per ogni colonna */
export const MIN_COLUMN_WIDTH = 50;

/** Larghezza in pixel della colonna orari */
export const TIME_COLUMN_WIDTH = 56;

/** Numero massimo di colonne prima di mostrare warning */
export const MAX_RECOMMENDED_COLUMNS = 50;

/** Ora di inizio default */
export const DEFAULT_START_HOUR = 8;

/** Ora di fine default */
export const DEFAULT_END_HOUR = 13;

/** Numero massimo di colonne per overbooking */
export const MAX_OVERBOOKING_COLUMNS = 3;

// ============================================
// TIME PRESETS
// ============================================

/** Preset orari predefiniti */
export const TIME_PRESETS: Record<string, TimePreset> = {
    mattina: { start: 8, end: 13, label: 'Mattina' },
    pomeriggio: { start: 14, end: 19, label: 'Pomeriggio' },
    giornata: { start: 7, end: 21, label: 'Giornata' },
};

// ============================================
// DATE LABELS
// ============================================

/** Giorni della settimana (abbreviati) */
export const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/** Giorni della settimana (molto abbreviati) */
export const DAYS_OF_WEEK_SHORT = ['lu', 'ma', 'me', 'gi', 've', 'sa', 'do'];

/** Giorni della settimana (completi) */
export const DAYS_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

/** Mesi in italiano */
export const MONTHS_IT = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

/** Alias per MONTHS_IT */
export const MONTHS = MONTHS_IT;

// ============================================
// STATUS COLORS
// ============================================

/** Colori Tailwind per stati appuntamento */
export const STATO_COLORS: Record<StatoAppuntamento, string> = {
    PRENOTATO: 'bg-blue-500 border-blue-600',
    CONFERMATO: 'bg-green-500 border-green-600',
    IN_ATTESA: 'bg-amber-500 border-amber-600',
    IN_CORSO: 'bg-purple-500 border-purple-600',
    COMPLETATO: 'bg-gray-400 border-gray-500',
    FATTURATO: 'bg-teal-500 border-teal-600',
    ANNULLATO: 'bg-red-400 border-red-500',
    NO_SHOW: 'bg-orange-500 border-orange-600',
    RINVIATO: 'bg-yellow-500 border-yellow-600'
};

/** Label italiane per stati appuntamento */
export const STATO_LABELS: Record<StatoAppuntamento, string> = {
    PRENOTATO: 'Prenotato',
    CONFERMATO: 'Confermato',
    IN_ATTESA: 'In Attesa',
    IN_CORSO: 'In Visita',
    COMPLETATO: 'Refertato',
    FATTURATO: 'Fatturato',
    ANNULLATO: 'Annullato',
    NO_SHOW: 'Non Presentato',
    RINVIATO: 'Rinviato'
};

// ============================================
// MEDICO COLORS
// ============================================

/** Palette colori per medici (assegnazione dinamica) */
export const MEDICO_COLORS: ColorScheme[] = [
    { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800', dot: 'bg-teal-500' },
    { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', dot: 'bg-blue-500' },
    { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', dot: 'bg-purple-500' },
    { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', dot: 'bg-amber-500' },
    { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', dot: 'bg-rose-500' },
    { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-500' },
    { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', dot: 'bg-indigo-500' },
    { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', dot: 'bg-cyan-500' },
];

// ============================================
// AMBULATORIO COLORS
// ============================================

/** Palette colori per ambulatori */
export const AMBULATORIO_COLORS: ColorScheme[] = [
    { bg: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-800', dot: 'bg-sky-500' },
    { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-800', dot: 'bg-violet-500' },
    { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', dot: 'bg-pink-500' },
    { bg: 'bg-lime-100', border: 'border-lime-300', text: 'text-lime-800', dot: 'bg-lime-500' },
    { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', dot: 'bg-orange-500' },
    { bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', text: 'text-fuchsia-800', dot: 'bg-fuchsia-500' },
    { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', dot: 'bg-red-500' },
];

/** Colore grigio per slot di medici non selezionati */
export const GRAYED_COLOR: ColorScheme = {
    bg: 'bg-gray-300',
    border: 'border-gray-400',
    text: 'text-gray-600',
    dot: 'bg-gray-500'
};

// ============================================
// LOCALSTORAGE KEYS
// ============================================

/** Key localStorage per settings calendario */
export const CALENDAR_SETTINGS_KEY = 'calendario-filter-settings';
