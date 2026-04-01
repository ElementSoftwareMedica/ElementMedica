/**
 * Calendar Module - Color Utilities
 * 
 * Funzioni utility per gestione colori nel calendario.
 * 
 * @module pages/clinica/agenda/utils/colorUtils
 */

import type { ColorScheme } from '../types';
import {
    MEDICO_COLORS,
    AMBULATORIO_COLORS,
    GRAYED_COLOR
} from '../constants';

/** Cache per mapping medico -> colore */
const medicoColorCache = new Map<string, ColorScheme>();

/** Cache per mapping ambulatorio -> colore */
const ambulatorioColorCache = new Map<string, ColorScheme>();

/** Contatore per assegnazione colori medico */
let medicoColorIndex = 0;

/** Contatore per assegnazione colori ambulatorio */
let ambulatorioColorIndex = 0;

/**
 * Ottiene il colore per un medico (assegnazione dinamica)
 */
export const getMedicoColor = (medicoId: string): ColorScheme => {
    if (medicoColorCache.has(medicoId)) {
        return medicoColorCache.get(medicoId)!;
    }

    const color = MEDICO_COLORS[medicoColorIndex % MEDICO_COLORS.length];
    medicoColorCache.set(medicoId, color);
    medicoColorIndex++;

    return color;
};

/**
 * Ottiene il colore per un ambulatorio (assegnazione dinamica)
 */
export const getAmbulatorioColor = (ambulatorioId: string): ColorScheme => {
    if (ambulatorioColorCache.has(ambulatorioId)) {
        return ambulatorioColorCache.get(ambulatorioId)!;
    }

    const color = AMBULATORIO_COLORS[ambulatorioColorIndex % AMBULATORIO_COLORS.length];
    ambulatorioColorCache.set(ambulatorioId, color);
    ambulatorioColorIndex++;

    return color;
};

/**
 * Resetta le cache colori (utile per refresh)
 */
export const resetColorCaches = (): void => {
    medicoColorCache.clear();
    ambulatorioColorCache.clear();
    medicoColorIndex = 0;
    ambulatorioColorIndex = 0;
};

/**
 * Pre-inizializza i colori per una lista di medici
 */
export const initMedicoColors = (medicoIds: string[]): void => {
    medicoIds.forEach(id => getMedicoColor(id));
};

/**
 * Pre-inizializza i colori per una lista di ambulatori
 */
export const initAmbulatorioColors = (ambulatorioIds: string[]): void => {
    ambulatorioIds.forEach(id => getAmbulatorioColor(id));
};

/**
 * Ottiene colore grigio per elementi non selezionati
 */
export const getGrayedColor = (): ColorScheme => GRAYED_COLOR;

/**
 * Crea le classi CSS per un ColorScheme
 */
export const colorSchemeToClasses = (
    scheme: ColorScheme,
    options?: { hover?: boolean; active?: boolean }
): string => {
    const classes = [scheme.bg, scheme.border, scheme.text];

    if (options?.hover) {
        classes.push('hover:opacity-80');
    }

    if (options?.active) {
        classes.push('ring-2 ring-offset-2');
    }

    return classes.join(' ');
};

/**
 * Ottiene un colore di contrasto (bianco o nero) per un bg
 */
export const getContrastColor = (bgClass: string): string => {
    // Colori scuri necessitano testo bianco
    const darkBgs = ['500', '600', '700', '800', '900'];

    if (darkBgs.some(level => bgClass.includes(level))) {
        return 'text-white';
    }

    return 'text-gray-900';
};

/**
 * Genera colore random da palette
 */
export const getRandomMedicoColor = (): ColorScheme => {
    const index = Math.floor(Math.random() * MEDICO_COLORS.length);
    return MEDICO_COLORS[index];
};

/**
 * Genera colore random da palette ambulatori
 */
export const getRandomAmbulatorioColor = (): ColorScheme => {
    const index = Math.floor(Math.random() * AMBULATORIO_COLORS.length);
    return AMBULATORIO_COLORS[index];
};

/**
 * Map per ottenere tutti i colori attualmente assegnati ai medici
 */
export const getAllMedicoColors = (): Map<string, ColorScheme> => {
    return new Map(medicoColorCache);
};

/**
 * Map per ottenere tutti i colori attualmente assegnati agli ambulatori
 */
export const getAllAmbulatorioColors = (): Map<string, ColorScheme> => {
    return new Map(ambulatorioColorCache);
};
