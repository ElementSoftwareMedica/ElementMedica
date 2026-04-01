/**
 * Calendar Module - useSedeClosures Hook
 * 
 * Hook per gestione orari apertura sede e chiusure speciali.
 * Centralizza logica per determinare se un'ora/giorno è aperto.
 * 
 * @module pages/clinica/agenda/hooks/useSedeClosures
 */

import { useCallback, useMemo } from 'react';
import type { SedePoliambulatorio, ChiusuraSpecialeSede } from '../../../../services/clinicaApi';

/**
 * Range orario apertura
 */
interface OpenRange {
    start: number; // ore (es. 8.5 = 8:30)
    end: number;
}

/**
 * Risultato controllo apertura
 */
interface SedeOpeningResult {
    isOpen: boolean;
    openRanges: OpenRange[];
    chiusuraMotivo?: string;
}

interface UseSedeClosuresParams {
    /** Sede selezionata con orari e chiusure */
    selectedSede: SedePoliambulatorio | null;
}

interface UseSedeClosuresResult {
    /**
     * Ottiene gli orari di apertura per una data specifica
     * Gestisce orari settimanali e chiusure speciali (festività, ferie)
     */
    getSedeOpeningHours: (date: Date) => SedeOpeningResult;

    /**
     * Verifica se una specifica ora è aperta
     * @param date - Data da controllare
     * @param hour - Ora da controllare (es. 9, 14.5 per 14:30)
     */
    isHourOpen: (date: Date, hour: number) => boolean;

    /**
     * Ottiene info chiusura speciale per una data (se presente)
     */
    getChiusuraSpeciale: (date: Date) => ChiusuraSpecialeSede | null;

    /**
     * Se true, la sede ha orari configurati
     */
    hasOrariConfigured: boolean;
}

/**
 * Hook per gestione orari apertura sede e chiusure speciali
 * 
 * @example
 * ```tsx
 * const { isHourOpen, getChiusuraSpeciale } = useSedeClosures({ selectedSede });
 * 
 * // Verifica se un'ora è aperta
 * const open = isHourOpen(new Date(), 9); // true se 9:00 è aperto
 * 
 * // Verifica se c'è una chiusura speciale
 * const chiusura = getChiusuraSpeciale(new Date('2026-12-25'));
 * if (chiusura) console.log(chiusura.nome); // "Natale"
 * ```
 */
export const useSedeClosures = ({ selectedSede }: UseSedeClosuresParams): UseSedeClosuresResult => {
    /**
     * Ottiene orari apertura per una data specifica
     * Gestisce:
     * - Orari settimanali (OrarioSede)
     * - Chiusure speciali (ChiusuraSpecialeSede)
     * - Chiusure parziali (solo alcune ore)
     * - Chiusure ricorrenti (ogni anno)
     */
    const getSedeOpeningHours = useCallback((date: Date): SedeOpeningResult => {
        if (!selectedSede?.orariSettimanali || selectedSede.orariSettimanali.length === 0) {
            // No orari defined = always open (default behavior)
            return { isOpen: true, openRanges: [{ start: 0, end: 24 }] };
        }

        // Check for special closures (chiusure speciali) first
        if (selectedSede.chiusureSpeciali && selectedSede.chiusureSpeciali.length > 0) {
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            for (const chiusura of selectedSede.chiusureSpeciali) {
                if (!chiusura.attivo) continue;

                const chiusuraInizio = new Date(chiusura.dataInizio);
                const chiusuraFine = new Date(chiusura.dataFine);

                // Set to start of day for comparison
                chiusuraInizio.setHours(0, 0, 0, 0);
                chiusuraFine.setHours(23, 59, 59, 999);

                // Handle recurring closures (same date every year)
                let effectiveInizio = chiusuraInizio;
                let effectiveFine = chiusuraFine;

                if (chiusura.ricorrente) {
                    // Set the year to current date's year for comparison
                    effectiveInizio = new Date(date.getFullYear(), chiusuraInizio.getMonth(), chiusuraInizio.getDate());
                    effectiveFine = new Date(date.getFullYear(), chiusuraFine.getMonth(), chiusuraFine.getDate(), 23, 59, 59, 999);
                }

                // Check if date falls within closure period
                if (dateOnly >= effectiveInizio && dateOnly <= effectiveFine) {
                    if (!chiusura.isParziale) {
                        // Full day closure
                        return { isOpen: false, openRanges: [], chiusuraMotivo: chiusura.nome };
                    }
                    // Partial closure - will be handled below by filtering ranges
                }
            }
        }

        // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
        const dayOfWeek = date.getDay();

        // Find orari for this day
        const dayOrari = selectedSede.orariSettimanali.filter(o => o.giornoSettimana === dayOfWeek && !o.isChiuso);

        if (dayOrari.length === 0) {
            // No orari for this day = closed
            return { isOpen: false, openRanges: [] };
        }

        // Parse time ranges
        let openRanges: OpenRange[] = dayOrari.flatMap(o => {
            if (!o.oraInizio || !o.oraFine) {
                console.error('[useSedeClosures] Orario with missing oraInizio/oraFine skipped:', o);
                return [];
            }
            const [startH, startM] = o.oraInizio.split(':').map(Number);
            const [endH, endM] = o.oraFine.split(':').map(Number);
            return [{
                start: startH + startM / 60,
                end: endH + endM / 60
            }];
        });

        // Filter out partial closures if any
        if (selectedSede.chiusureSpeciali && selectedSede.chiusureSpeciali.length > 0) {
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            for (const chiusura of selectedSede.chiusureSpeciali) {
                if (!chiusura.attivo || !chiusura.isParziale) continue;

                const chiusuraInizio = new Date(chiusura.dataInizio);
                const chiusuraFine = new Date(chiusura.dataFine);
                chiusuraInizio.setHours(0, 0, 0, 0);
                chiusuraFine.setHours(23, 59, 59, 999);

                let effectiveInizio = chiusuraInizio;
                let effectiveFine = chiusuraFine;

                if (chiusura.ricorrente) {
                    effectiveInizio = new Date(date.getFullYear(), chiusuraInizio.getMonth(), chiusuraInizio.getDate());
                    effectiveFine = new Date(date.getFullYear(), chiusuraFine.getMonth(), chiusuraFine.getDate(), 23, 59, 59, 999);
                }

                if (dateOnly >= effectiveInizio && dateOnly <= effectiveFine && chiusura.oraInizio && chiusura.oraFine) {
                    // Parse partial closure times
                    const [closeStartH, closeStartM] = chiusura.oraInizio.split(':').map(Number);
                    const [closeEndH, closeEndM] = chiusura.oraFine.split(':').map(Number);
                    const closeStart = closeStartH + closeStartM / 60;
                    const closeEnd = closeEndH + closeEndM / 60;

                    // Filter/split ranges to exclude closed period
                    openRanges = openRanges.flatMap(range => {
                        // If no overlap, keep range as is
                        if (range.end <= closeStart || range.start >= closeEnd) {
                            return [range];
                        }
                        // If closure completely contains range, remove it
                        if (closeStart <= range.start && closeEnd >= range.end) {
                            return [];
                        }
                        // Split range if closure is in the middle
                        const result: OpenRange[] = [];
                        if (range.start < closeStart) {
                            result.push({ start: range.start, end: closeStart });
                        }
                        if (range.end > closeEnd) {
                            result.push({ start: closeEnd, end: range.end });
                        }
                        return result;
                    });
                }
            }
        }

        return { isOpen: openRanges.length > 0, openRanges };
    }, [selectedSede]);

    /**
     * Verifica se una specifica ora è aperta
     */
    const isHourOpen = useCallback((date: Date, hour: number): boolean => {
        const { isOpen, openRanges } = getSedeOpeningHours(date);
        if (!isOpen) return false;

        // Check if hour falls within any open range
        return openRanges.some(range => hour >= range.start && hour < range.end);
    }, [getSedeOpeningHours]);

    /**
     * Ottiene info chiusura speciale per una data (se presente)
     */
    const getChiusuraSpeciale = useCallback((date: Date): ChiusuraSpecialeSede | null => {
        if (!selectedSede?.chiusureSpeciali || selectedSede.chiusureSpeciali.length === 0) {
            return null;
        }

        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        for (const chiusura of selectedSede.chiusureSpeciali) {
            if (!chiusura.attivo) continue;

            const chiusuraInizio = new Date(chiusura.dataInizio);
            const chiusuraFine = new Date(chiusura.dataFine);
            chiusuraInizio.setHours(0, 0, 0, 0);
            chiusuraFine.setHours(23, 59, 59, 999);

            let effectiveInizio = chiusuraInizio;
            let effectiveFine = chiusuraFine;

            if (chiusura.ricorrente) {
                effectiveInizio = new Date(date.getFullYear(), chiusuraInizio.getMonth(), chiusuraInizio.getDate());
                effectiveFine = new Date(date.getFullYear(), chiusuraFine.getMonth(), chiusuraFine.getDate(), 23, 59, 59, 999);
            }

            if (dateOnly >= effectiveInizio && dateOnly <= effectiveFine) {
                return chiusura;
            }
        }

        return null;
    }, [selectedSede]);

    /**
     * Flag: la sede ha orari configurati
     */
    const hasOrariConfigured = useMemo(() => {
        return !!(selectedSede?.orariSettimanali && selectedSede.orariSettimanali.length > 0);
    }, [selectedSede]);

    return {
        getSedeOpeningHours,
        isHourOpen,
        getChiusuraSpeciale,
        hasOrariConfigured
    };
};

export default useSedeClosures;
