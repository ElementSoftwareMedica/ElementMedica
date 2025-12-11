/**
 * useNewSubmissionsCount - Hook per contatore submissions nuove del modulo Contatti
 * 
 * Restituisce il numero di form submissions con stato "NEW" (non ancora gestite)
 * SOLO per il modulo CONTATTI (type=CONTACT).
 * Usato per mostrare il badge nel menu laterale accanto a Forms.
 * 
 * Rispetta:
 * - Multi-tenancy (tenantId dal token)
 * - GDPR (usa audit trail standard)
 * - Permission check (VIEW_FORM_SUBMISSIONS)
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface SubmissionsStats {
    total: number;
    byStatus: {
        NEW?: number;
        READ?: number;
        IN_PROGRESS?: number;
        RESOLVED?: number;
        ARCHIVED?: number;
    };
}

interface UseNewSubmissionsCountOptions {
    /** Intervallo di refresh in ms (default 5 minuti) */
    refreshInterval?: number;
    /** Abilita/disabilita il polling (default true) */
    enablePolling?: boolean;
}

interface UseNewSubmissionsCountReturn {
    /** Numero di submissions con stato NEW */
    count: number;
    /** Statistiche complete */
    stats: SubmissionsStats | null;
    /** Stato di caricamento */
    loading: boolean;
    /** Errore eventuale */
    error: string | null;
    /** Funzione per refresh manuale */
    refresh: () => Promise<void>;
}

/**
 * Hook per ottenere il contatore delle submissions nuove (non gestite)
 * del modulo CONTATTI (type=CONTACT).
 * 
 * @example
 * ```tsx
 * const { count, loading } = useNewSubmissionsCount();
 * // count = numero di submissions CONTACT con stato NEW
 * ```
 */
export function useNewSubmissionsCount(
    options: UseNewSubmissionsCountOptions = {}
): UseNewSubmissionsCountReturn {
    const {
        refreshInterval = 5 * 60 * 1000, // 5 minuti
        enablePolling = true
    } = options;

    const { hasPermission } = useAuth();

    // Verifica se l'utente ha il permesso VIEW_FORM_SUBMISSIONS
    const canViewSubmissions = hasPermission('submissions', 'view') ||
        hasPermission('form_submissions', 'view');

    const [stats, setStats] = useState<SubmissionsStats | null>(null);
    const [loading, setLoading] = useState(canViewSubmissions);
    const [error, setError] = useState<string | null>(null);

    const fetchCount = useCallback(async () => {
        // Non chiamare l'API se l'utente non ha i permessi
        if (!canViewSubmissions) {
            setLoading(false);
            return;
        }

        try {
            // Filtra solo per type=CONTACT (modulo contatti)
            const response = await apiGet<{
                success: boolean;
                data: SubmissionsStats;
            }>('/api/v1/submissions/advanced/stats?type=CONTACT');

            if (response.data) {
                setStats(response.data);
                setError(null);
            }
        } catch (err) {
            // Non loggare errori di autenticazione (utente non loggato)
            if (err instanceof Error && !err.message.includes('401')) {
                console.error('Error fetching new submissions count:', err);
                setError('Errore nel recupero delle submissions');
            }
        } finally {
            setLoading(false);
        }
    }, [canViewSubmissions]);

    // Fetch iniziale
    useEffect(() => {
        fetchCount();
    }, [fetchCount]);

    // Polling periodico (solo se ha i permessi)
    useEffect(() => {
        if (!enablePolling || !canViewSubmissions) return;

        const interval = setInterval(fetchCount, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchCount, refreshInterval, enablePolling, canViewSubmissions]);

    return {
        // Conta solo le submissions CONTACT con status NEW
        count: stats?.byStatus?.NEW ?? 0,
        stats,
        loading,
        error,
        refresh: fetchCount
    };
}

export default useNewSubmissionsCount;
