/**
 * useNewPublicSubmissionsCount - Hook per contatore submissions nuove da form pubblici
 *
 * Restituisce il numero di form submissions con stato "NEW"
 * provenienti dai form pubblici del sito (type=CONTACT).
 * Usato per mostrare il badge nel menu del CMS.
 *
 * Rispetta:
 * - Multi-tenancy (tenantId dal token)
 * - Permission check (form_submissions:read)
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

interface UseNewPublicSubmissionsCountOptions {
    refreshInterval?: number;
    enablePolling?: boolean;
    /** ID tenant corrente - se cambia, il conteggio viene ricaricato */
    tenantId?: string;
}

interface UseNewPublicSubmissionsCountReturn {
    count: number;
    stats: SubmissionsStats | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useNewPublicSubmissionsCount(
    options: UseNewPublicSubmissionsCountOptions = {}
): UseNewPublicSubmissionsCountReturn {
    const {
        refreshInterval = 5 * 60 * 1000,
        enablePolling = true,
        tenantId
    } = options;

    const { hasPermission } = useAuth();

    const canViewSubmissions = hasPermission('form_submissions', 'read') ||
        hasPermission('submissions', 'view') ||
        hasPermission('form_submissions', 'view');

    const [stats, setStats] = useState<SubmissionsStats | null>(null);
    const [loading, setLoading] = useState(canViewSubmissions);
    const [error, setError] = useState<string | null>(null);

    const fetchCount = useCallback(async () => {
        if (!canViewSubmissions) {
            setLoading(false);
            return;
        }

        try {
            // Usa lo stesso endpoint del modulo contatti — le public form submissions
            // sono salvate come contact submissions con type=CONTACT
            const response = await apiGet<{
                success: boolean;
                data: SubmissionsStats;
            }>('/api/v1/submissions/advanced/stats?type=CONTACT');

            if (response.data) {
                setStats(response.data);
                setError(null);
            }
        } catch (err) {
            if (err instanceof Error && !err.message.includes('401')) {
                setError('Errore nel recupero delle submissions pubbliche');
            }
        } finally {
            setLoading(false);
        }
    }, [canViewSubmissions, tenantId]);

    useEffect(() => {
        fetchCount();
    }, [fetchCount]);

    useEffect(() => {
        if (!enablePolling || !canViewSubmissions) return;
        const interval = setInterval(fetchCount, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchCount, refreshInterval, enablePolling, canViewSubmissions]);

    return {
        count: stats?.byStatus?.NEW ?? 0,
        stats,
        loading,
        error,
        refresh: fetchCount
    };
}

export default useNewPublicSubmissionsCount;
