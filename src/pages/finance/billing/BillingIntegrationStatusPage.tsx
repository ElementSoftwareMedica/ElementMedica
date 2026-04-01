/**
 * BillingIntegrationStatusPage - P97
 *
 * Pagina di verifica completa dell'integrazione billing:
 * - AcubeAPI (SDI Fatturazione Elettronica) per ogni ente emittente
 * - Sistema Tessera Sanitaria (MEF) per ogni ente abilitato
 * - Diagnostica connessioni con credenziali sandbox
 * - Statistiche e stato salute del sistema di fatturazione
 *
 * @project P97 - Fatturazione Elettronica & Sistema TS
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    Activity, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
    Wifi, WifiOff, Building2, User, Shield, FileText, Euro,
    Send, Clock, TrendingUp, Key, Eye, EyeOff, Zap, Info,
    ChevronDown, ChevronUp, ExternalLink, Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { useFatturazione, EnteEmittente } from '../../../hooks/finance/useFatturazione';
import { apiGet, apiPost } from '../../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectionStatus {
    enteId: string;
    acube: 'idle' | 'testing' | 'ok' | 'error';
    acubeMessage?: string;
    sistemaTs: 'idle' | 'testing' | 'ok' | 'error' | 'disabled';
    sistemaTsMessage?: string;
}

interface BillingSystemStats {
    totaleFatture: number;
    fattureEmesse: number;
    fatturePagate: number;
    fattureInviateSDI: number;
    totaleIncassato: number;
    totaleEmesso: number;
    fattureInErrore: number;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ConnectionStatus['acube'] | ConnectionStatus['sistemaTs']; label: string }> = ({ status, label }) => {
    const configs = {
        idle: { color: 'text-gray-500 bg-gray-100 dark:bg-gray-700/60 dark:text-gray-400', icon: <Wifi className="h-3.5 w-3.5" />, text: 'Non testata' },
        testing: { color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300', icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />, text: 'Test in corso…' },
        ok: { color: 'text-teal-700 bg-teal-100 dark:bg-teal-900/40 dark:text-teal-300', icon: <CheckCircle2 className="h-3.5 w-3.5" />, text: label },
        error: { color: 'text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300', icon: <XCircle className="h-3.5 w-3.5" />, text: 'Errore' },
        disabled: { color: 'text-gray-400 bg-gray-100 dark:bg-gray-700/60 dark:text-gray-500', icon: <WifiOff className="h-3.5 w-3.5" />, text: 'Non abilitata' },
    };
    const cfg = configs[status] ?? configs.idle;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
            {cfg.icon}
            {cfg.text}
        </span>
    );
};

// ─── Ente Integration Card ────────────────────────────────────────────────────

interface EnteIntegrationCardProps {
    ente: EnteEmittente;
    status: ConnectionStatus;
    onTestAcube: (enteId: string, email?: string, password?: string) => Promise<void>;
    onTestSistemaTS: (enteId: string) => Promise<void>;
}

const EnteIntegrationCard: React.FC<EnteIntegrationCardProps> = ({
    ente, status, onTestAcube, onTestSistemaTS,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [showCreds, setShowCreds] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);

    const tipoIcon = ente.tipo === 'SOCIETA'
        ? <Building2 className="h-5 w-5 text-violet-500" />
        : <User className="h-5 w-5 text-teal-500" />;

    const handleTestAcube = () => {
        if (showCreds && email && password) {
            onTestAcube(ente.id, email, password);
        } else {
            onTestAcube(ente.id);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        {tipoIcon}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{ente.denominazione}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ente.codiceFiscale}{ente.piva && ` · P.IVA ${ente.piva}`}
                        </p>
                    </div>
                    {ente.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                            Default
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                >
                    {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
            </div>

            {/* Status Row */}
            <div className="flex items-center gap-4 px-4 pb-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">AcubeAPI SDI:</span>
                    <StatusBadge status={status.acube} label="Connessa" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">SistemaTS:</span>
                    <StatusBadge
                        status={!ente.sistemaTsAbilitato ? 'disabled' : status.sistemaTs}
                        label="Connessa"
                    />
                </div>
                {!ente.acubeConfigurato && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> Credenziali AcubeAPI mancanti
                    </span>
                )}
            </div>

            {/* Expanded: Actions + Info */}
            {expanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-800/60">
                    {/* AcubeAPI Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Send className="h-4 w-4 text-blue-500" />
                            AcubeAPI — Fatturazione Elettronica SDI
                        </h4>

                        {!ente.acubeConfigurato && (
                            <div>
                                <button
                                    onClick={() => setShowCreds(!showCreds)}
                                    className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
                                >
                                    <Key className="h-3.5 w-3.5" />
                                    {showCreds ? 'Nascondi' : 'Inserisci credenziali sandbox per test'}
                                </button>
                                {showCreds && (
                                    <div className="mt-2 flex flex-col gap-2">
                                        <input
                                            type="email"
                                            placeholder="Email AcubeAPI"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                        <div className="relative">
                                            <input
                                                type={showPwd ? 'text' : 'password'}
                                                placeholder="Password AcubeAPI"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="w-full px-3 py-1.5 pr-10 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPwd(!showPwd)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            Le credenziali verranno salvate sull'ente se la connessione riesce.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                            <CRUDButton
                                onClick={handleTestAcube}
                                disabled={status.acube === 'testing'}
                                className="text-xs"
                            >
                                {status.acube === 'testing' ? (
                                    <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> Testing…</>
                                ) : (
                                    <><Zap className="h-3.5 w-3.5 mr-1" /> Testa Connessione</>
                                )}
                            </CRUDButton>
                            {status.acubeMessage && (
                                <span className={`text-xs ${status.acube === 'ok' ? 'text-teal-600 dark:text-teal-400' : 'text-red-500 dark:text-red-400'}`}>
                                    {status.acubeMessage}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* SistemaTS Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-teal-500" />
                            Sistema Tessera Sanitaria — MEF
                        </h4>

                        {!ente.sistemaTsAbilitato ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Sistema TS non abilitato per questo ente.
                                {' '}<a href="/management/billing/enti-emittenti" className="text-teal-600 hover:underline">Configura ente</a>
                            </p>
                        ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                                <CRUDButton
                                    onClick={() => onTestSistemaTS(ente.id)}
                                    disabled={status.sistemaTs === 'testing'}
                                    className="text-xs"
                                >
                                    {status.sistemaTs === 'testing' ? (
                                        <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> Testing…</>
                                    ) : (
                                        <><Zap className="h-3.5 w-3.5 mr-1" /> Testa Sistema TS</>
                                    )}
                                </CRUDButton>
                                {status.sistemaTsMessage && (
                                    <span className={`text-xs ${status.sistemaTs === 'ok' ? 'text-teal-600 dark:text-teal-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {status.sistemaTsMessage}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Info dett */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>Regime fiscale:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{ente.regimeFiscale || '—'}</span>
                        <span>Fatture emesse {ente.annoNumFattura}:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{ente.progressivoFatt}</span>
                        <span>IBAN:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{ente.iban || '—'}</span>
                        <span>PEC:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{ente.pec || '—'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Stats Grid ───────────────────────────────────────────────────────────────

const StatTile: React.FC<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    sub?: string;
}> = ({ label, value, icon, color, sub }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
            {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{sub}</p>}
        </div>
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const BillingIntegrationStatusPage: React.FC = () => {
    const { showToast } = useToast();
    const {
        entiEmittenti, fetchEntiEmittenti,
        testConnessioneAcube, testConnessioneSistemaTS,
        stats, fetchStats,
    } = useFatturazione();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [connStatus, setConnStatus] = useState<Record<string, ConnectionStatus>>({});
    const [systemStats, setSystemStats] = useState<BillingSystemStats | null>(null);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    // ── Load ──────────────────────────────────────────────────────────────────

    const loadAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            await Promise.all([fetchEntiEmittenti(), fetchStats()]);
            setLastChecked(new Date());
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchEntiEmittenti, fetchStats]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // Inizializza stati connessione
    useEffect(() => {
        setConnStatus(prev => {
            const next: Record<string, ConnectionStatus> = { ...prev };
            entiEmittenti.forEach(e => {
                if (!next[e.id]) {
                    next[e.id] = {
                        enteId: e.id,
                        acube: 'idle',
                        sistemaTs: e.sistemaTsAbilitato ? 'idle' : 'disabled',
                    };
                }
            });
            return next;
        });
    }, [entiEmittenti]);

    // Calcola statistiche sistema da stats hook
    useEffect(() => {
        if (!stats) return;
        setSystemStats({
            totaleFatture: (stats.contatori.bozze + stats.contatori.emesse + stats.contatori.pagate + stats.contatori.annullate + stats.contatori.stornate),
            fattureEmesse: stats.contatori.emesse,
            fatturePagate: stats.contatori.pagate,
            fattureInviateSDI: Object.entries(stats.sdi).filter(([k]) => k !== 'null' && k !== 'WAITING').reduce((s, [, v]) => s + (v as number), 0),
            totaleIncassato: Number(stats.totali.incassato),
            totaleEmesso: Number(stats.totali.emesso),
            fattureInErrore: (stats.sdi['NOT_DELIVERED'] || 0) + (stats.sdi['REJECTED'] || 0),
        });
    }, [stats]);

    // ── Test Connessioni ─────────────────────────────────────────────────────

    const handleTestAcube = useCallback(async (enteId: string, email?: string, password?: string) => {
        setConnStatus(prev => ({ ...prev, [enteId]: { ...prev[enteId], acube: 'testing', acubeMessage: undefined } }));
        try {
            const res = await testConnessioneAcube(enteId, email && password ? { email, password } : undefined);
            setConnStatus(prev => ({
                ...prev,
                [enteId]: { ...prev[enteId], acube: res.ok ? 'ok' : 'error', acubeMessage: res.message },
            }));
            if (res.ok) {
                showToast({ message: 'AcubeAPI connessa con successo', type: 'success' });
                // Ricarica enti per aggiornare acubeConfigurato
                await fetchEntiEmittenti();
            } else {
                showToast({ message: `AcubeAPI errore: ${res.message}`, type: 'error' });
            }
        } catch (err: unknown) {
            setConnStatus(prev => ({ ...prev, [enteId]: { ...prev[enteId], acube: 'error', acubeMessage: 'Errore di connessione' } }));
            showToast({ message: 'Errore test AcubeAPI', type: 'error' });
        }
    }, [testConnessioneAcube, fetchEntiEmittenti, showToast]);

    const handleTestSistemaTS = useCallback(async (enteId: string) => {
        setConnStatus(prev => ({ ...prev, [enteId]: { ...prev[enteId], sistemaTs: 'testing', sistemaTsMessage: undefined } }));
        try {
            const res = await testConnessioneSistemaTS(enteId);
            setConnStatus(prev => ({
                ...prev,
                [enteId]: { ...prev[enteId], sistemaTs: res.ok ? 'ok' : 'error', sistemaTsMessage: res.message },
            }));
            if (res.ok) {
                showToast({ message: 'Sistema TS connesso con successo', type: 'success' });
            } else {
                showToast({ message: `Sistema TS errore: ${res.message}`, type: 'error' });
            }
        } catch (err: unknown) {
            setConnStatus(prev => ({ ...prev, [enteId]: { ...prev[enteId], sistemaTs: 'error', sistemaTsMessage: 'Errore di connessione' } }));
            showToast({ message: 'Errore test Sistema TS', type: 'error' });
        }
    }, [testConnessioneSistemaTS, showToast]);

    const handleTestAllConnections = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all(entiEmittenti.map(e => handleTestAcube(e.id)));
        } finally {
            setRefreshing(false);
        }
    }, [entiEmittenti, handleTestAcube]);

    // ── Computed ─────────────────────────────────────────────────────────────

    const statusSummary = entiEmittenti.reduce(
        (acc, e) => {
            const s = connStatus[e.id];
            if (!s) return acc;
            if (s.acube === 'ok') acc.acubeOk++;
            else if (s.acube === 'error') acc.acubeErrors++;
            if (s.sistemaTs === 'ok') acc.stsOk++;
            else if (s.sistemaTs === 'error') acc.stsErrors++;
            return acc;
        },
        { acubeOk: 0, acubeErrors: 0, stsOk: 0, stsErrors: 0 }
    );

    const hasAnyError = statusSummary.acubeErrors > 0 || statusSummary.stsErrors > 0;
    const allConnected = entiEmittenti.length > 0 &&
        entiEmittenti.every(e => connStatus[e.id]?.acube === 'ok');

    const overallStatus = allConnected ? 'ok' : hasAnyError ? 'error' : 'idle';

    const formatEur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <RefreshCw className="h-8 w-8 animate-spin text-teal-500" />
                    <span>Caricamento integrazioni billing…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-5xl">

            {/* ── HEADER ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${overallStatus === 'ok' ? 'bg-teal-100 dark:bg-teal-900/40' :
                            overallStatus === 'error' ? 'bg-red-100 dark:bg-red-900/40' :
                                'bg-gray-100 dark:bg-gray-700/60'
                            }`}>
                            <Activity className={`h-6 w-6 ${overallStatus === 'ok' ? 'text-teal-600 dark:text-teal-400' :
                                overallStatus === 'error' ? 'text-red-500 dark:text-red-400' :
                                    'text-gray-500 dark:text-gray-400'
                                }`} />
                        </div>
                        Stato Integrazioni Billing
                    </h1>
                    <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                        Verifica connessioni AcubeAPI (SDI) e Sistema Tessera Sanitaria (MEF) per tutti gli enti.
                        {lastChecked && (
                            <span className="ml-2 text-gray-400 dark:text-gray-500">
                                Ultimo aggiornamento: {format(lastChecked, 'HH:mm:ss', { locale: it })}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <CRUDButton
                        onClick={handleTestAllConnections}
                        disabled={refreshing || entiEmittenti.length === 0}
                    >
                        {refreshing
                            ? <><RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> Testing…</>
                            : <><Zap className="h-4 w-4 mr-1.5" /> Testa Tutti</>
                        }
                    </CRUDButton>
                    <CRUDButton onClick={() => loadAll(true)} disabled={refreshing}>
                        <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Aggiorna
                    </CRUDButton>
                    <CRUDPrimaryButton onClick={() => window.location.href = '/management/billing/enti-emittenti'}>
                        <Building2 className="h-4 w-4 mr-1.5" />
                        Gestisci Enti
                    </CRUDPrimaryButton>
                </div>
            </div>

            {/* ── OVERALL STATUS BANNER ── */}
            {entiEmittenti.length === 0 ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Nessun ente emittente configurato</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            Prima di emettere fatture elettroniche devi configurare almeno un ente emittente.
                            {' '}
                            <a href="/management/billing/enti-emittenti" className="underline font-medium">
                                Aggiungi ente emittente →
                            </a>
                        </p>
                    </div>
                </div>
            ) : overallStatus === 'ok' ? (
                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-teal-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                        Tutte le integrazioni attive — {entiEmittenti.length} {entiEmittenti.length === 1 ? 'ente operativo' : 'enti operativi'}
                    </p>
                </div>
            ) : hasAnyError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">
                            {statusSummary.acubeErrors} {statusSummary.acubeErrors === 1 ? 'integrazione' : 'integrazioni'} con errori
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                            Verifica le credenziali degli enti in errore.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
                    <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        {entiEmittenti.length} {entiEmittenti.length === 1 ? 'ente configurato' : 'enti configurati'} — clicca "Testa Tutti" per verificare le connessioni.
                    </p>
                </div>
            )}

            {/* ── STATS GRID ── */}
            {systemStats && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                        Statistiche Sistema Fatturazione
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatTile
                            label="Totale Fatture"
                            value={systemStats.totaleFatture}
                            icon={<FileText className="h-4 w-4 text-gray-600 dark:text-gray-300" />}
                            color="bg-gray-100 dark:bg-gray-700"
                        />
                        <StatTile
                            label="Emesse / Pagate"
                            value={`${systemStats.fattureEmesse} / ${systemStats.fatturePagate}`}
                            icon={<Send className="h-4 w-4 text-blue-500" />}
                            color="bg-blue-100 dark:bg-blue-900/30"
                        />
                        <StatTile
                            label="Totale Emesso"
                            value={formatEur(systemStats.totaleEmesso)}
                            icon={<Euro className="h-4 w-4 text-teal-500" />}
                            color="bg-teal-100 dark:bg-teal-900/30"
                        />
                        <StatTile
                            label="Totale Incassato"
                            value={formatEur(systemStats.totaleIncassato)}
                            icon={<TrendingUp className="h-4 w-4 text-violet-500" />}
                            color="bg-violet-100 dark:bg-violet-900/30"
                            sub={systemStats.fattureInErrore > 0 ? `⚠ ${systemStats.fattureInErrore} in errore SDI` : undefined}
                        />
                    </div>
                </div>
            )}

            {/* ── ENTI EMITTENTI ── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        Enti Emittenti ({entiEmittenti.length})
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {statusSummary.acubeOk > 0 && (
                            <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> {statusSummary.acubeOk} AcubeAPI ok
                            </span>
                        )}
                        {statusSummary.stsOk > 0 && (
                            <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                                <Shield className="h-3.5 w-3.5" /> {statusSummary.stsOk} SistemaTS ok
                            </span>
                        )}
                    </div>
                </div>

                {entiEmittenti.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                        <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Nessun ente emittente</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entiEmittenti.map(ente => (
                            <EnteIntegrationCard
                                key={ente.id}
                                ente={ente}
                                status={connStatus[ente.id] ?? { enteId: ente.id, acube: 'idle', sistemaTs: 'idle' }}
                                onTestAcube={handleTestAcube}
                                onTestSistemaTS={handleTestSistemaTS}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── QUICK LINKS ── */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Accesso rapido</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                        { label: 'Fatture Elettroniche', href: '/management/billing/fatture', icon: <FileText className="h-4 w-4" /> },
                        { label: 'Enti Emittenti', href: '/management/billing/enti-emittenti', icon: <Building2 className="h-4 w-4" /> },
                        { label: 'Spese & Fatture SDI', href: '/management/billing/spese', icon: <Euro className="h-4 w-4" /> },
                        { label: 'Sistema TS', href: '/management/billing/sistema-ts', icon: <Shield className="h-4 w-4" /> },
                    ].map(link => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-sm text-gray-700 dark:text-gray-300 group"
                        >
                            <span className="text-teal-500 group-hover:text-teal-600">{link.icon}</span>
                            {link.label}
                            <ExternalLink className="h-3 w-3 ml-auto text-gray-300 group-hover:text-teal-400" />
                        </a>
                    ))}
                </div>
            </div>

            {/* ── INFO BOX AcubeAPI ── */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Info className="h-4 w-4" /> Note tecniche AcubeAPI
                </h3>
                <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
                    <li>Account master ElementMedica: credenziali da <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">ACUBE_EMAIL</code> / <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">ACUBE_PASSWORD</code> (env vars sul server)</li>
                    <li>Auth sandbox: <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">POST https://common-sandbox.api.acubeapi.com/login</code></li>
                    <li>Auth produzione: <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">POST https://common.api.acubeapi.com/login</code></li>
                    <li>Token JWT durata 24h — rinnovato automaticamente alla scadenza (cache invalidata ad ogni test)</li>
                    <li>API sandbox: <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">https://it-sandbox.api.acubeapi.com</code></li>
                    <li>API produzione: <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">https://it.api.acubeapi.com</code></li>
                    <li>In caso di errori: verifica le env vars <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">ACUBE_ENV</code>, <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">ACUBE_EMAIL</code>, <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">ACUBE_PASSWORD</code> sul server API</li>
                </ul>
            </div>
        </div>
    );
};

export default BillingIntegrationStatusPage;
