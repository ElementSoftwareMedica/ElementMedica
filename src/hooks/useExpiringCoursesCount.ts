/**
 * useExpiringCoursesCount - Hook per contatore corsi in scadenza
 * 
 * Restituisce il numero di corsi scaduti/in scadenza che NON sono stati riprogrammati.
 * Usato per mostrare il badge rosso nel menu laterale.
 * 
 * Per gli EMPLOYEE: mostra solo i corsi a cui sono iscritti
 * 
 * Rispetta:
 * - Multi-tenancy (tenantId dal token)
 * - Role-based filtering (EMPLOYEE vede solo i propri corsi)
 * - GDPR (usa audit trail standard)
 * - Permission check (read:schedules)
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ExpiringCoursesStats {
    total: number;
    expired: number;
    expiring: number;
    alreadyScheduled: number;
    needsAction: number;
}

interface UseExpiringCoursesCountOptions {
    /** Giorni per considerare scaduto (default 30) */
    expiredDays?: number;
    /** Giorni per considerare in scadenza (default 60) */
    expiringDays?: number;
    /** Intervallo di refresh in ms (default 24 ore) */
    refreshInterval?: number;
    /** Abilita/disabilita il polling (default true) */
    enablePolling?: boolean;
}

interface UseExpiringCoursesCountReturn {
    /** Numero di corsi che richiedono azione (non riprogrammati) */
    count: number;
    /** Statistiche complete */
    stats: ExpiringCoursesStats | null;
    /** Stato di caricamento */
    loading: boolean;
    /** Errore eventuale */
    error: string | null;
    /** Funzione per refresh manuale */
    refresh: () => Promise<void>;
}

/**
 * Hook per ottenere il contatore dei corsi in scadenza non riprogrammati.
 * 
 * @example
 * ```tsx
 * const { count, loading } = useExpiringCoursesCount();
 * // count = numero di corsi da programmare (non include quelli già riprogrammati)
 * ```
 */
export function useExpiringCoursesCount(
    options: UseExpiringCoursesCountOptions = {}
): UseExpiringCoursesCountReturn {
    const {
        expiredDays = 30,
        expiringDays = 60,
        refreshInterval = 24 * 60 * 60 * 1000, // 24 ore
        enablePolling = true
    } = options;

    const { user } = useAuth();
    const [stats, setStats] = useState<ExpiringCoursesStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Determina se l'utente è EMPLOYEE (vede solo i propri corsi)
    const isEmployee = user?.roles?.includes('EMPLOYEE') &&
        !user?.roles?.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER'].includes(r));

    const fetchCount = useCallback(async () => {
        // Se l'utente non è ancora caricato, aspetta
        if (!user) {
            setLoading(true);
            return;
        }

        try {
            const params = new URLSearchParams({
                expiredDays: expiredDays.toString(),
                expiringDays: expiringDays.toString()
            });

            // Per gli EMPLOYEE, filtra per il proprio personId
            if (isEmployee && user?.id) {
                params.append('personId', user.id);
            }

            const response = await apiGet<{
                success: boolean;
                stats: ExpiringCoursesStats;
            }>(`/api/v1/schedules/expiring-courses?${params}`);

            if (response.stats) {
                setStats(response.stats);
                setError(null);
            }
        } catch (err) {
            // Non loggare errori di autenticazione (utente non loggato)
            if (err instanceof Error && !err.message.includes('401')) {
                console.error('Error fetching expiring courses count:', err);
                setError('Errore nel recupero delle scadenze');
            }
        } finally {
            setLoading(false);
        }
    }, [expiredDays, expiringDays, user, isEmployee]);

    // Fetch iniziale
    useEffect(() => {
        fetchCount();
    }, [fetchCount]);

    // Polling periodico
    useEffect(() => {
        if (!enablePolling) return;

        const interval = setInterval(fetchCount, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchCount, refreshInterval, enablePolling]);

    return {
        // needsAction = corsi NON riprogrammati (esclude quelli già schedulati)
        count: stats?.needsAction ?? 0,
        stats,
        loading,
        error,
        refresh: fetchCount
    };
}

export default useExpiringCoursesCount;