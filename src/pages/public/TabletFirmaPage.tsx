/**
 * TabletFirmaPage — Pagina pubblica per tablet fisso di accettazione.
 *
 * URL: /tablet?k=<stableKey>
 *
 * Questa pagina è pensata per essere caricata UNA VOLTA su un tablet fisso
 * della segreteria. La chiave `k` è stabile: stesso utente → stesso URL sempre.
 *
 * Ciclo di vita:
 *  idle          → polling ogni 5s, mostra schermata branded della struttura
 *  active        → un token consenso è disponibile → flusso firma inline
 *  signed        → firma completata → conferma + countdown 60s → idle
 *
 * @module pages/public/TabletFirmaPage
 */

import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Shield,
    CheckSquare,
    Square,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    AlertCircle,
    Clock,
    FileText,
    Pen,
    Building2,
    RefreshCw,
} from 'lucide-react';
import SignaturePad, { type SignaturePadHandle } from '../../components/ui/SignaturePad';
import { apiGet, apiPost } from '../../api/api';
import SEOHead from '../../components/seo/SEOHead';

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface TenantInfo {
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string | null;
    welcomeMessage: string;
    address: string | null;
}

interface PollResponse {
    status: 'idle' | 'active' | 'signed';
    // active
    token?: string;
    expiresAt?: string;
    appuntamento?: {
        dataOra: string | null;
        paziente: { firstName?: string; lastName?: string } | null;
        prestazione: string;
    };
    // signed
    firmatoAt?: string;
    firmatoPazienteNome?: string | null;
    firmatoConsensi?: string[];
    paziente?: { firstName?: string; lastName?: string } | null;
}

interface DocumentoConsenso {
    id: string;
    titolo: string;
    sottotitolo: string;
    obbligatorio: boolean;
    testo: string;
}

interface ConsensoData {
    tokenId: string;
    appuntamento: {
        dataOra: string;
        prestazione: string;
        paziente: { firstName?: string; lastName?: string };
    };
    documenti: DocumentoConsenso[];
    expiresAt: string;
}

// ─── Stato pagina ─────────────────────────────────────────────────────────────

type TabletState =
    | { mode: 'invalid_key' }
    | { mode: 'idle' }
    | { mode: 'loading_active'; token: string }
    | { mode: 'active_docs'; token: string; data: ConsensoData }
    | { mode: 'active_firma'; token: string; data: ConsensoData }
    | { mode: 'submitting'; token: string; data: ConsensoData }
    | { mode: 'signed'; pazienteNome?: string | null; firmatoConsensi: string[]; countdown: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatOra(iso: string | null): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('it-IT', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

function useCurrentTime() {
    const [time, setTime] = useState('');
    useEffect(() => {
        const tick = () =>
            setTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);
    return time;
}

// ─── Schermata Idle ───────────────────────────────────────────────────────────

const IdleScreen: React.FC<{ tenant: TenantInfo | null; loading: boolean }> = ({ tenant, loading }) => {
    const time = useCurrentTime();
    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 flex flex-col items-center justify-center p-8 select-none">
            <div className="text-center text-white space-y-6 max-w-lg">
                {/* Logo / Icona struttura */}
                {tenant?.logoUrl ? (
                    <img src={tenant.logoUrl} alt={tenant.name} className="h-20 mx-auto object-contain" />
                ) : (
                    <div className="mx-auto w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                        <Building2 className="h-12 w-12 text-white/90" />
                    </div>
                )}

                {/* Nome struttura */}
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        {loading ? '…' : (tenant?.name ?? 'Poliambulatorio')}
                    </h1>
                    {tenant?.address && (
                        <p className="text-teal-100 text-sm mt-1">{tenant.address}</p>
                    )}
                </div>

                {/* Messaggio benvenuto */}
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-8 py-6 space-y-3">
                    <p className="text-xl font-medium text-white">
                        {tenant?.welcomeMessage ?? 'Pronto per la firma consensi'}
                    </p>
                    <p className="text-teal-100 text-sm">
                        In attesa del prossimo paziente…
                    </p>
                    {loading ? (
                        <RefreshCw className="h-5 w-5 text-white/50 mx-auto animate-spin" />
                    ) : (
                        <div className="flex items-center justify-center gap-1.5 text-teal-200 text-xs">
                            <span className="inline-block h-2 w-2 rounded-full bg-teal-300 animate-pulse" />
                            Connesso
                        </div>
                    )}
                </div>

                {/* Orologio */}
                <p className="text-5xl font-light text-white/90 tabular-nums">{time}</p>
            </div>
        </div>
    );
};

// ─── Schermata Firma Acquisita ────────────────────────────────────────────────

const SignedScreen: React.FC<{
    pazienteNome: string | null | undefined;
    firmatoConsensi: string[];
    countdown: number;
}> = ({ pazienteNome, firmatoConsensi, countdown }) => (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
                <div className="p-4 bg-teal-100 rounded-full">
                    <CheckCircle className="h-14 w-14 text-teal-600" />
                </div>
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Consensi acquisiti</h1>
                {pazienteNome && (
                    <p className="text-gray-500 mt-1">Firmato da: <strong>{pazienteNome}</strong></p>
                )}
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-left">
                <p className="text-xs font-semibold text-teal-700 mb-2 uppercase tracking-wide">Documenti firmati</p>
                <ul className="space-y-1">
                    {firmatoConsensi.map((id) => (
                        <li key={id} className="flex items-center gap-2 text-sm text-teal-800">
                            <CheckCircle className="h-4 w-4 flex-shrink-0 text-teal-500" />
                            {id === 'gdpr' ? 'Consenso GDPR' :
                                id === 'sanitari' ? 'Consenso dati sanitari' :
                                    id === 'prestazione' ? 'Consenso prestazione' :
                                        id === 'chirurgico' ? 'Consenso chirurgico' :
                                            id === 'marketing' ? 'Consenso marketing' :
                                                id === 'comunicazioni' ? 'Comunicazioni di servizio' : id}
                        </li>
                    ))}
                </ul>
            </div>
            <p className="text-gray-600">Puoi restituire il tablet alla segreteria.</p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                Riprende automaticamente in <strong className="text-teal-600 ml-1">{countdown}s</strong>
            </div>
        </div>
    </div>
);

// ─── Componente principale ────────────────────────────────────────────────────

const TabletFirmaPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const tabletKey = searchParams.get('k');

    const [state, setState] = useState<TabletState>({ mode: 'idle' });
    const [tenant, setTenant] = useState<TenantInfo | null>(null);
    const [tenantLoading, setTenantLoading] = useState(true);

    // Per il flusso firma inline
    const [accepted, setAccepted] = useState<Record<string, boolean>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [pazienteNome, setPazienteNome] = useState('');
    const sigPadRef = useRef<SignaturePadHandle>(null);
    const [signatureReady, setSignatureReady] = useState(false);

    // Token attivo corrente (per evitare di ricaricare lo stesso token)
    const activeTokenRef = useRef<string | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Carica info tenant ────────────────────────────────────────────────

    useEffect(() => {
        if (!tabletKey) {
            setState({ mode: 'invalid_key' });
            setTenantLoading(false);
            return;
        }
        apiGet<TenantInfo>(`/api/v1/public/tablet/info?k=${encodeURIComponent(tabletKey)}`)
            .then((info) => {
                setTenant(info);
                setTenantLoading(false);
            })
            .catch(() => {
                setState({ mode: 'invalid_key' });
                setTenantLoading(false);
            });
    }, [tabletKey]);

    // ── Countdown dopo firma ──────────────────────────────────────────────

    const startCountdown = useCallback((seconds: number) => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        let remaining = seconds;
        setState(prev => prev.mode === 'signed' ? { ...prev, countdown: remaining } : prev);

        countdownRef.current = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                clearInterval(countdownRef.current!);
                countdownRef.current = null;
                activeTokenRef.current = null;
                setState({ mode: 'idle' });
            } else {
                setState(prev => prev.mode === 'signed' ? { ...prev, countdown: remaining } : prev);
            }
        }, 1000);
    }, []);

    useEffect(() => () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
    }, []);

    // ── Polling ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (!tabletKey || state.mode === 'invalid_key') return;
        // Non fare polling quando il paziente sta attivamente firmando
        if (['active_docs', 'active_firma', 'submitting'].includes(state.mode)) return;
        // Non fare polling durante il countdown (già firmato)
        if (state.mode === 'signed') return;

        const poll = async () => {
            try {
                const res = await apiGet<PollResponse>(
                    `/api/v1/public/tablet/poll?k=${encodeURIComponent(tabletKey)}`
                );

                if (res.status === 'active' && res.token) {
                    // Nuovo token → non è quello già mostrato
                    if (res.token !== activeTokenRef.current) {
                        activeTokenRef.current = res.token;
                        setState({ mode: 'loading_active', token: res.token });

                        // Carica i dati del documento
                        try {
                            const data = await apiGet<ConsensoData>(
                                `/api/v1/public/consenso-firma/${res.token}`
                            );
                            // Init acceptance state
                            const init: Record<string, boolean> = {};
                            data.documenti.forEach((d) => { init[d.id] = false; });
                            setAccepted(init);
                            setExpanded({});
                            // Pre-fill patient name from appointment data
                            const paz = data.appuntamento?.paziente;
                            const fullName = paz ? `${paz.lastName ?? ''} ${paz.firstName ?? ''}`.trim() : '';
                            setPazienteNome(fullName);
                            setSignatureReady(false);
                            setState({ mode: 'active_docs', token: res.token, data });
                        } catch {
                            // Token già usato o scaduto durante il caricamento → torna idle
                            activeTokenRef.current = null;
                            setState({ mode: 'idle' });
                        }
                    }
                } else if (res.status === 'signed') {
                    // Firmato da fuori (non da questa pagina) — raro ma gestito
                    if (state.mode === 'idle') {
                        setState({
                            mode: 'signed',
                            pazienteNome: res.firmatoPazienteNome,
                            firmatoConsensi: res.firmatoConsensi ?? [],
                            countdown: 60,
                        });
                        startCountdown(60);
                    }
                }
                // status === 'idle' → nessuna azione
            } catch {
                // Errore di rete transitorio → riprova al prossimo ciclo
            }
        };

        const interval = setInterval(poll, 5000);
        // Poll subito al mount / al cambio stato
        poll();
        return () => clearInterval(interval);
    }, [tabletKey, state.mode, startCountdown]);

    // ── Firma: toggling documenti ─────────────────────────────────────────

    const handleToggleAccepted = useCallback((id: string) => {
        setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const handleToggleExpand = useCallback((id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    }, []);

    // ── Submit firma ──────────────────────────────────────────────────────

    const handleSubmitFirma = useCallback(async () => {
        if (state.mode !== 'active_firma') return;
        const { token, data } = state;
        if (!sigPadRef.current) return;

        const firmaImmagine = sigPadRef.current.toDataURL();
        if (!firmaImmagine) return;

        const firmatoConsensi = Object.entries(accepted).filter(([, v]) => v).map(([k]) => k);
        setState({ mode: 'submitting', token, data });

        try {
            await apiPost(`/api/v1/public/consenso-firma/${token}`, {
                firmaImmagine,
                firmatoConsensi,
                firmatoPazienteNome: pazienteNome || undefined,
            });
            setState({
                mode: 'signed',
                pazienteNome: pazienteNome || null,
                firmatoConsensi,
                countdown: 60,
            });
            startCountdown(60);
        } catch {
            // Errore durante l'invio → torna al form firma
            setState({ mode: 'active_firma', token, data });
        }
    }, [state, accepted, pazienteNome, startCountdown]);

    // ─── Render ───────────────────────────────────────────────────────────

    if (state.mode === 'invalid_key') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
                    <h1 className="text-xl font-bold text-gray-900">Chiave tablet non valida</h1>
                    <p className="text-gray-500 text-sm">
                        Il link del tablet non è valido o è scaduto.<br />
                        Contatta la segreteria per generarne uno nuovo.
                    </p>
                </div>
            </div>
        );
    }

    if (state.mode === 'signed') {
        return (
            <SignedScreen
                pazienteNome={state.pazienteNome}
                firmatoConsensi={state.firmatoConsensi}
                countdown={state.countdown}
            />
        );
    }

    if (state.mode === 'idle' || state.mode === 'loading_active') {
        return (
            <IdleScreen
                tenant={tenant}
                loading={state.mode === 'loading_active' || tenantLoading}
            />
        );
    }

    // ── Flusso firma (active_docs, active_firma, submitting) ──────────────

    const data = state.mode === 'active_docs' || state.mode === 'active_firma' || state.mode === 'submitting'
        ? state.data
        : null;

    if (!data) return null;

    const allObbligatoriAccepted = data.documenti
        .filter((d) => d.obbligatorio)
        .every((d) => accepted[d.id]);

    return (
        <div className="min-h-screen bg-gray-50">
            <SEOHead
                title="Tablet Consensi | Firma Digitale"
                description="Postazione tablet per la firma dei consensi informativi."
                noindex={true}
                nofollow={true}
            />
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                        <Shield className="h-6 w-6 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold text-gray-900">Consensi Informativi</h1>
                        {data.appuntamento.paziente && (
                            <p className="text-sm font-medium text-teal-700">
                                {data.appuntamento.paziente.lastName} {data.appuntamento.paziente.firstName}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 truncate">
                            {data.appuntamento.prestazione}
                            {data.appuntamento.dataOra
                                ? ` · ${formatOra(data.appuntamento.dataOra)}`
                                : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                        <span className={`px-2 py-1 rounded-full ${state.mode === 'active_docs' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-600'}`}>
                            1 Documenti
                        </span>
                        <span className="text-gray-300">›</span>
                        <span className={`px-2 py-1 rounded-full ${state.mode === 'active_firma' || state.mode === 'submitting' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            2 Firma
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

                {/* ── STEP 1: Documenti ── */}
                {state.mode === 'active_docs' && (
                    <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                            <strong>Istruzioni:</strong> Leggi ogni documento espandendo «Leggi testo completo».
                            Seleziona la casella per accordo. I documenti con{' '}
                            <span className="text-red-500 font-bold">*</span> sono obbligatori.
                        </div>

                        {data.documenti.map((doc) => (
                            <div
                                key={doc.id}
                                className={`bg-white rounded-xl border-2 shadow-sm transition-all ${accepted[doc.id] ? 'border-teal-400' : 'border-gray-200'}`}
                            >
                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleAccepted(doc.id)}
                                            className="mt-0.5 flex-shrink-0"
                                        >
                                            {accepted[doc.id]
                                                ? <CheckSquare className="h-6 w-6 text-teal-600" />
                                                : <Square className="h-6 w-6 text-gray-300" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1">
                                                    <h2 className="text-sm font-semibold text-gray-900">
                                                        {doc.titolo}
                                                        {doc.obbligatorio && <span className="text-red-500 ml-1">*</span>}
                                                    </h2>
                                                    <p className="text-xs text-gray-400 mt-0.5">{doc.sottotitolo}</p>
                                                </div>
                                                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${accepted[doc.id] ? 'bg-teal-100 text-teal-700' : doc.obbligatorio ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    {accepted[doc.id] ? '✓ Accettato' : doc.obbligatorio ? 'Obbligatorio' : 'Facoltativo'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleExpand(doc.id)}
                                                className="mt-2 inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-medium"
                                            >
                                                <FileText className="h-3.5 w-3.5" />
                                                {expanded[doc.id]
                                                    ? <><ChevronUp className="h-3.5 w-3.5" /> Comprimi</>
                                                    : <><ChevronDown className="h-3.5 w-3.5" /> Leggi testo completo</>}
                                            </button>
                                        </div>
                                    </div>
                                    {expanded[doc.id] && (
                                        <div className="mt-3 ml-9 bg-gray-50 border border-gray-100 rounded-lg p-4 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                                            {doc.testo}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            {!allObbligatoriAccepted && (
                                <p className="text-xs text-red-600 mb-3 flex items-center gap-1.5">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    Seleziona tutti i documenti obbligatori (<span className="text-red-500">*</span>) per procedere.
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    if (allObbligatoriAccepted && state.mode === 'active_docs') {
                                        setState({ mode: 'active_firma', token: state.token, data: state.data });
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                                disabled={!allObbligatoriAccepted}
                                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${allObbligatoriAccepted ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Pen className="h-4 w-4" /> Procedi alla firma
                                </span>
                            </button>
                        </div>
                    </>
                )}

                {/* ── STEP 2: Firma ── */}
                {(state.mode === 'active_firma' || state.mode === 'submitting') && (
                    <>
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                            <p className="text-sm font-semibold text-teal-800 mb-2 flex items-center gap-1.5">
                                <CheckCircle className="h-4 w-4" /> Documenti selezionati
                            </p>
                            <ul className="space-y-1">
                                {data.documenti.map((d) =>
                                    accepted[d.id] ? (
                                        <li key={d.id} className="flex items-center gap-2 text-xs text-teal-700">
                                            <CheckSquare className="h-3.5 w-3.5 flex-shrink-0" />{d.titolo}
                                        </li>
                                    ) : null
                                )}
                            </ul>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Nome e Cognome del firmatario
                                <span className="font-normal text-gray-400 ml-1">(paziente, genitore o tutore)</span>
                            </label>
                            <input
                                type="text"
                                value={pazienteNome}
                                onChange={(e) => setPazienteNome(e.target.value)}
                                placeholder="Cognome Nome"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                                <Pen className="h-4 w-4 text-teal-600" /> Firma con il dito o una stilo
                            </p>
                            <SignaturePad
                                ref={sigPadRef}
                                height={200}
                                placeholder="Traccia qui la tua firma"
                                onChange={() => setSignatureReady(true)}
                            />
                            <p className="text-xs text-gray-400 mt-2">
                                La firma viene conservata in modo sicuro assieme ai consensi.
                            </p>
                        </div>

                        <div className="flex gap-3 pb-6">
                            <button
                                type="button"
                                disabled={state.mode === 'submitting'}
                                onClick={() => {
                                    if (state.mode === 'active_firma') {
                                        setState({ mode: 'active_docs', token: state.token, data: state.data });
                                    }
                                }}
                                className="flex-1 py-3 rounded-xl font-medium text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                                ← Torna ai documenti
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitFirma}
                                disabled={!signatureReady || state.mode === 'submitting'}
                                className={`flex-[2] py-3 rounded-xl font-semibold text-sm ${signatureReady && state.mode !== 'submitting' ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {state.mode === 'submitting'
                                        ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Invio in corso…</>
                                        : <><CheckCircle className="h-4 w-4" /> Conferma e firma</>}
                                </span>
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default TabletFirmaPage;
