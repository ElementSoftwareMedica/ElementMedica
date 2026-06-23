/**
 * SistemaTSPage - P97
 *
 * Dashboard di verifica integrazione SistemaTS MEF.
 * Mostra salute connessione per ente, log recenti, fatture pending.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    Shield, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
    Clock, Send, FileText, Wifi, Building2, User, Activity,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { apiGet, apiPost } from '../../../services/api';

// ─── Tipi ─────────────────────────────────────────────────────────────────────

interface EnteDashboard {
    enteId: string;
    denominazione: string;
    tipo: string;
    codiceFiscale: string;
    configurato: boolean;
    stats30giorni: {
        totale: number;
        successi: number;
        errori: number;
        warnings: number;
    };
    ultimaSync: {
        createdAt: string;
        outcome: number;
        protocol: string;
    } | null;
}

interface SistemaTSDashboardData {
    enti: EnteDashboard[];
    fatturePendingSistemaTs: number;
}

interface SistemaTSSyncLog {
    id: string;
    fatturaId: string;
    outcome: number | null;
    protocol: string | null;
    messages: string | null;
    errorMessage: string | null;
    httpStatus: number | null;
    createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const OutcomeBadge: React.FC<{ outcome: number | null }> = ({ outcome }) => {
    if (outcome === null) return <span className="text-xs text-gray-400">—</span>;
    if (outcome === 0) return (
        <span className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-100 dark:bg-teal-900/40 dark:text-teal-300 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> Accettato
        </span>
    );
    if (outcome === 2) return (
        <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-3 w-3" /> Warning
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded-full">
            <XCircle className="h-3 w-3" /> Errore
        </span>
    );
};

const formatDate = (d: string) =>
    format(new Date(d), 'd MMM yyyy HH:mm', { locale: it });

// ─── EnteStatusCard ───────────────────────────────────────────────────────────

const EnteStatusCard: React.FC<{
    ente: EnteDashboard;
    onTestConnection: (enteId: string, name: string) => Promise<void>;
    onBatchSync: (enteId: string) => Promise<void>;
}> = ({ ente, onTestConnection, onBatchSync }) => {
    const [expanded, setExpanded] = useState(false);
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [testResult, setTestResult] = useState<boolean | null>(null);
    const [logs, setLogs] = useState<SistemaTSSyncLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const handleTest = async () => {
        setTesting(true);
        try {
            await onTestConnection(ente.enteId, ente.denominazione);
            setTestResult(true);
        } catch {
            setTestResult(false);
        } finally {
            setTesting(false);
        }
    };

    const handleBatch = async () => {
        setSyncing(true);
        try {
            await onBatchSync(ente.enteId);
        } finally {
            setSyncing(false);
        }
    };

    const loadRecentLogs = async () => {
        if (logs.length > 0) {
            setExpanded(e => !e);
            return;
        }
        setExpanded(true);
        setLoadingLogs(true);
        try {
            // Get recent fatture for this ente and their logs
            const res = await apiGet(`/api/v1/billing/fatture?enteEmittenteId=${ente.enteId}&limit=5`);
            // This is a simplified approach - in production we'd have a dedicated endpoint
            setLogs([]);
        } catch {
            setLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    };

    const isHealthy = ente.configurato && ente.stats30giorni.errori === 0;
    const hasWarnings = ente.configurato && ente.stats30giorni.warnings > 0;

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-5 space-y-4 ${!ente.configurato ? 'border-gray-200 dark:border-gray-700 opacity-60' :
            isHealthy ? 'border-teal-500 dark:border-teal-600' :
                hasWarnings ? 'border-orange-400 dark:border-orange-500' :
                    'border-red-400 dark:border-red-500'
            }`}>
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${!ente.configurato ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' :
                        isHealthy ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600' :
                            'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
                        }`}>
                        {ente.tipo === 'SOCIETA' ? (
                            <Building2 className="h-5 w-5" />
                        ) : (
                            <User className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{ente.denominazione}</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{ente.codiceFiscale}</p>
                    </div>
                </div>

                {/* Stato */}
                <div className="flex items-center gap-1">
                    {!ente.configurato ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                            <XCircle className="h-3.5 w-3.5" /> Non configurato
                        </span>
                    ) : testResult === true ? (
                        <span className="inline-flex items-center gap-1 text-xs text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded-lg">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Connesso
                        </span>
                    ) : testResult === false ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">
                            <XCircle className="h-3.5 w-3.5" /> Errore
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-lg">
                            <Wifi className="h-3.5 w-3.5" /> Non testato
                        </span>
                    )}
                </div>
            </div>

            {/* Stats 30gg */}
            {ente.configurato && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                        <p className="text-xl font-bold text-teal-700 dark:text-teal-300">{ente.stats30giorni.successi}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">OK (30gg)</p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{ente.stats30giorni.warnings}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Warning</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">{ente.stats30giorni.errori}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Errori</p>
                    </div>
                </div>
            )}

            {/* Ultima sync */}
            {ente.ultimaSync && (
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Ultima sync: {formatDate(ente.ultimaSync.createdAt)}
                    </span>
                    <OutcomeBadge outcome={ente.ultimaSync.outcome} />
                </div>
            )}

            {/* Azioni */}
            {ente.configurato && (
                <div className="flex gap-2 pt-1">
                    <button
                        onClick={handleTest}
                        disabled={testing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-colors font-medium"
                    >
                        {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                        Test connessione
                    </button>
                    <button
                        onClick={handleBatch}
                        disabled={syncing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40 disabled:opacity-50 transition-colors font-medium"
                    >
                        {syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Sincronizza pending
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Componente principale ───────────────────────────────────────────────────

const SistemaTSPage: React.FC = () => {
    const { showToast } = useToast();
    const [data, setData] = useState<SistemaTSDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadDashboard = useCallback(async () => {
        try {
            const res = await apiGet<{ data: SistemaTSDashboardData }>('/api/v1/billing/sistema-ts/dashboard');
            setData(res.data ?? null);
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore caricamento dashboard SistemaTS' });
        }
    }, [showToast]);

    useEffect(() => {
        loadDashboard().finally(() => setLoading(false));
    }, [loadDashboard]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadDashboard();
        setRefreshing(false);
    };

    const handleTestConnection = async (enteId: string, nome: string) => {
        const res = await apiPost<{ ok: boolean; message: string }>('/api/v1/billing/sistema-ts/test', { enteEmittenteId: enteId });
        if (res.ok) {
            showToast({ type: 'success', message: `${nome}: connessione SistemaTS OK` });
        } else {
            showToast({ type: 'error', message: `${nome}: ${res.message}` });
            throw new Error(res.message);
        }
    };

    const handleBatchSync = async (enteId: string) => {
        try {
            const res = await apiPost<{ message: string; successi?: number; falliti?: number }>(
                '/api/v1/billing/sistema-ts/sincronizza-batch',
                // enteId vuoto → sincronizza tutte le pending del tenant
                enteId ? { enteEmittenteId: enteId } : {}
            );
            // Se ci sono fallimenti (es. credenziali mancanti), mostra warning invece di success
            const hasFailures = (res.falliti ?? 0) > 0;
            const noSuccess = (res.successi ?? 0) === 0 && hasFailures;
            showToast({
                type: noSuccess ? 'error' : hasFailures ? 'warning' : 'success',
                message: res.message,
            });
            await loadDashboard();
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore sincronizzazione batch' });
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    const entiConfigurati = data?.enti.filter(e => e.configurato).length ?? 0;
    const entiTotali = data?.enti.length ?? 0;
    const entiConErrori = data?.enti.filter(e => e.configurato && e.stats30giorni.errori > 0).length ?? 0;
    const entiMaiTestati = data?.enti.filter(e => e.configurato && e.stats30giorni.totale === 0).length ?? 0;
    // tuttiOk: ci sono enti configurati, nessun errore e almeno una sincronizzazione (non mai-testati)
    const tuttiOk = entiConfigurati > 0 && entiConErrori === 0 && entiMaiTestati === 0;
    // hasWarnings: configurati ma mai testati (errori=0, totale=0 → falso positivo)
    const hasWarnings = entiConfigurati > 0 && entiConErrori === 0 && entiMaiTestati > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-7 w-7 text-violet-600" />
                        Verifica Sistema TS
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Monitoraggio integrazione Sistema Tessera Sanitaria (MEF)
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Aggiorna
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16 text-gray-400">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
            ) : !data ? (
                <div className="text-center py-12 text-gray-400">
                    <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>Impossibile caricare i dati</p>
                </div>
            ) : (
                <>
                    {/* Summary bar */}
                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${tuttiOk
                            ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700 text-teal-800 dark:text-teal-200'
                            : hasWarnings
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-800 dark:text-orange-200'
                        }`}>
                        {tuttiOk ? (
                            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <p className="font-semibold text-sm">
                                {tuttiOk
                                    ? 'Tutti i sistemi funzionano correttamente'
                                    : hasWarnings
                                        ? `${entiMaiTestati} ent${entiMaiTestati === 1 ? 'e configurato' : 'i configurati'} senza sincronizzazioni — clicca "Test connessione" per verificare`
                                        : 'Verificare le integrazioni con errori'}
                            </p>
                            <p className="text-xs opacity-80 mt-0.5">
                                {entiConfigurati}/{entiTotali} enti configurati
                                {data.fatturePendingSistemaTs > 0 && (
                                    <> · <span className="font-semibold">{data.fatturePendingSistemaTs} fatture da sincronizzare</span></>
                                )}
                            </p>
                        </div>

                        {/* Batch globale se ci sono pending */}
                        {data.fatturePendingSistemaTs > 0 && (
                            <CRUDPrimaryButton
                                onClick={() => handleBatchSync('')}
                            >
                                <Send className="h-3.5 w-3.5" /> Sincronizza tutti ({data.fatturePendingSistemaTs})
                            </CRUDPrimaryButton>
                        )}
                    </div>

                    {/* Grid enti */}
                    {data.enti.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <Shield className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            <p className="text-gray-500 dark:text-gray-400">
                                Nessun ente con SistemaTS abilitato.
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                Abilita SistemaTS da{' '}
                                <a href="/management/billing/enti-emittenti" className="text-teal-600 hover:underline">
                                    Enti Emittenti
                                </a>.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {data.enti.map(ente => (
                                <EnteStatusCard
                                    key={ente.enteId}
                                    ente={ente}
                                    onTestConnection={handleTestConnection}
                                    onBatchSync={handleBatchSync}
                                />
                            ))}
                        </div>
                    )}

                    {/* Info */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-start gap-3">
                            <Activity className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                <p>Le spese sanitarie vengono trasmesse al Sistema Tessera Sanitaria (MEF) tramite le API AcubeAPI.</p>
                                <p>Solo le fatture per prestazioni mediche/cliniche sono soggette all'obbligo di trasmissione.</p>
                                <p>I pazienti possono esercitare il diritto di opposizione (flag_opposizione = 1): le relative fatture non vengono trasmesse.</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SistemaTSPage;
