/**
 * useDailyReset - Hook per gestione localStorage con auto-reset giornaliero
 * 
 * Questo hook controlla se è il primo accesso del giorno e resetta
 * i valori salvati in localStorage ai default appropriati.
 * 
 * Features:
 * - Salva l'ultimo giorno di accesso
 * - Al primo accesso di ogni nuovo giorno, resetta i valori
 * - Supporta configurazione per data singola o settimana
 * 
 * @module hooks/useDailyReset
 */

import { useEffect, useCallback } from 'react';
import { toISODateString } from '../utils/dateUtils';

// ============================================
// TYPES
// ============================================

export type ResetMode = 'single-day' | 'week-start';

export interface DailyResetConfig {
    /** Chiave localStorage per la data/range */
    storageKey: string;
    /** Chiave per tracciare l'ultimo accesso */
    lastAccessKey?: string;
    /** Modalità reset: 'single-day' = data odierna, 'week-start' = inizio settimana */
    mode: ResetMode;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Ottiene l'inizio della settimana corrente (Lunedì)
 */
const getWeekStart = (date: Date = new Date()): Date => {
    const d = new Date(date);
    const day = d.getDay();
    // In Italia la settimana inizia da Lunedì (1), non Domenica (0)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Ottiene la fine della settimana corrente (Domenica)
 */
const getWeekEnd = (date: Date = new Date()): Date => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
};

// ============================================
// HOOK
// ============================================

/**
 * Hook per gestire il reset giornaliero del localStorage
 * 
 * @param config - Configurazione del reset
 * @returns Funzioni per gestire il reset
 */
export const useDailyReset = (config: DailyResetConfig) => {
    const {
        storageKey,
        lastAccessKey = `${storageKey}-last-access`,
        mode
    } = config;

    /**
     * Controlla se è il primo accesso del giorno
     */
    const isFirstAccessToday = useCallback((): boolean => {
        const today = toISODateString(new Date());
        const lastAccess = localStorage.getItem(lastAccessKey);
        return lastAccess !== today;
    }, [lastAccessKey]);

    /**
     * Marca l'accesso di oggi
     */
    const markTodayAccess = useCallback(() => {
        const today = toISODateString(new Date());
        localStorage.setItem(lastAccessKey, today);
    }, [lastAccessKey]);

    /**
     * Resetta il valore al default appropriato per la modalità
     */
    const resetToDefault = useCallback(() => {
        if (mode === 'single-day') {
            // Per AccettazionePage: imposta data odierna
            const today = new Date();
            localStorage.setItem(storageKey, today.toISOString());
            return today;
        } else if (mode === 'week-start') {
            // Per CalendarioPage: imposta settimana corrente
            const weekStart = getWeekStart();
            const weekEnd = getWeekEnd();
            const weekRange = {
                start: weekStart.toISOString(),
                end: weekEnd.toISOString()
            };
            localStorage.setItem(storageKey, JSON.stringify(weekRange));
            return weekRange;
        }
        return null;
    }, [mode, storageKey]);

    /**
     * Effettua il reset se è il primo accesso del giorno
     */
    const checkAndReset = useCallback((): boolean => {
        if (isFirstAccessToday()) {
            resetToDefault();
            markTodayAccess();
            return true; // Reset effettuato
        }
        return false; // Nessun reset
    }, [isFirstAccessToday, resetToDefault, markTodayAccess]);

    /**
     * Ottiene il valore corrente dal localStorage
     */
    const getCurrentValue = useCallback((): Date | { start: Date; end: Date } | null => {
        const saved = localStorage.getItem(storageKey);
        if (!saved) return null;

        try {
            if (mode === 'single-day') {
                const date = new Date(saved);
                return isNaN(date.getTime()) ? null : date;
            } else if (mode === 'week-start') {
                const parsed = JSON.parse(saved);
                return {
                    start: new Date(parsed.start),
                    end: new Date(parsed.end)
                };
            }
        } catch {
            return null;
        }
        return null;
    }, [mode, storageKey]);

    // Auto-check al mount
    useEffect(() => {
        checkAndReset();
    }, [checkAndReset]);

    return {
        isFirstAccessToday,
        markTodayAccess,
        resetToDefault,
        checkAndReset,
        getCurrentValue,
        getWeekStart,
        getWeekEnd
    };
};

export default useDailyReset;
