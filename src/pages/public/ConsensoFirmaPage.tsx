/**
 * ConsensoFirmaPage — Pagina pubblica per la firma consensi su tablet paziente.
 *
 * URL: /consenso?t=<token>
 *
 * Flusso:
 * 1. Carica i documenti dal backend tramite token
 * 2. Il paziente legge (quickview espandibile) e firma con il dito
 * 3. Alla conferma, invia firma + consensi selezionati al backend
 * 4. La segreteria in AccettazionePazienteModal vede la firma in tempo reale (polling)
 *
 * @module pages/public/ConsensoFirmaPage
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import SignaturePad, { type SignaturePadHandle } from '../../components/ui/SignaturePad';
import { apiGet, apiPost } from '../../api/api';
import SEOHead from '../../components/seo/SEOHead';

// ─── Tipi ────────────────────────────────────────────────────────────────────

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
        paziente: {
            firstName?: string;
            lastName?: string;
            birthDate?: string;
        };
    };
    documenti: DocumentoConsenso[];
    expiresAt: string;
    preSignedConsensi: string[];  // codici consensi già firmati e ancora validi
}

// ─── Formattazione data ───────────────────────────────────────────────────────

function formatData(iso: string): string {
    try {
        return new Date(iso).toLocaleString('it-IT', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

// ─── Tipi di stato ───────────────────────────────────────────────────────────

type PageState =
    | 'loading'
    | 'ready'
    | 'submitting'
    | 'done'
    | 'error_not_found'
    | 'error_expired'
    | 'error_already_used'
    | 'error_generic';

// ─── Componente ──────────────────────────────────────────────────────────────

const ConsensoFirmaPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('t');

    const [pageState, setPageState] = useState<PageState>('loading');
    const [data, setData] = useState<ConsensoData | null>(null);
    const [accepted, setAccepted] = useState<Record<string, boolean>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [step, setStep] = useState<'documenti' | 'firma'>('documenti');
    const [pazienteNome, setPazienteNome] = useState('');
    const [tutoreNome, setTutoreNome] = useState('');
    const [isMinore, setIsMinore] = useState(false);
    const [hasTutore, setHasTutore] = useState(false); // true if minor OR manually toggled for fragile patients
    const [forcedReSign, setForcedReSign] = useState<Record<string, boolean>>({});
    const sigPadRef = useRef<SignaturePadHandle>(null);
    const [signatureReady, setSignatureReady] = useState(false);
    const fetchedRef = useRef(false);

    // ── Carica dati dal backend ───────────────────────────────────────────

    useEffect(() => {
        if (!token) {
            setPageState('error_not_found');
            return;
        }
        // Guard against React StrictMode double-invoke in development
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        apiGet<ConsensoData>(`/api/v1/public/consenso-firma/${token}`)
            .then((res) => {
                setData(res);
                const preSigned = res.preSignedConsensi ?? [];
                const init: Record<string, boolean> = {};
                res.documenti.forEach((d) => { init[d.id] = preSigned.includes(d.id); });
                setAccepted(init);
                // Pre-fill patient name
                const { firstName, lastName, birthDate } = res.appuntamento.paziente;
                if (firstName || lastName) {
                    setPazienteNome(`${firstName || ''} ${lastName || ''}`.trim());
                }
                // Detect minor (< 18 years)
                if (birthDate) {
                    const birth = new Date(birthDate);
                    const today = new Date();
                    const age = today.getFullYear() - birth.getFullYear() -
                        (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
                    if (age < 18) {
                        setIsMinore(true);
                        setHasTutore(true);
                    }
                }
                setPageState('ready');
            })
            .catch((err: unknown) => {
                const status =
                    (err as { response?: { status?: number }; status?: number })?.response?.status ??
                    (err as { status?: number })?.status;
                if (status === 404) setPageState('error_not_found');
                else if (status === 410) setPageState('error_expired');
                else if (status === 409) setPageState('error_already_used');
                else setPageState('error_generic');
            });
    }, [token]);

    const allObbligatoriAccepted = data
        ? data.documenti.filter((d) => d.obbligatorio).every((d) => accepted[d.id])
        : false;

    const handleToggleAccepted = useCallback((id: string) => {
        setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const handleToggleExpand = useCallback((id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const handleProcediFirma = useCallback(() => {
        if (!allObbligatoriAccepted) return;
        setStep('firma');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [allObbligatoriAccepted]);

    const handleSubmitFirma = useCallback(async () => {
        if (!token || !sigPadRef.current) return;
        const firmaImmagine = sigPadRef.current.toDataURL();
        if (!firmaImmagine) return;
        const firmatoConsensi = Object.entries(accepted).filter(([, v]) => v).map(([k]) => k);
        // For minors/fragile subjects the signatory is the tutore/genitore
        const nomeEffettivo = hasTutore && tutoreNome ? tutoreNome : pazienteNome;
        setPageState('submitting');
        try {
            await apiPost(`/api/v1/public/consenso-firma/${token}`, {
                firmaImmagine,
                firmatoConsensi,
                firmatoPazienteNome: nomeEffettivo || undefined,
            });
            setPageState('done');
        } catch {
            setPageState('error_generic');
        }
    }, [token, accepted, pazienteNome, tutoreNome, hasTutore]);

    // ── Stato: Completato ─────────────────────────────────────────────────

    if (pageState === 'done') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-teal-100 rounded-full">
                            <CheckCircle className="h-12 w-12 text-teal-600" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">Consensi acquisiti</h1>
                    <p className="text-gray-600 mb-6">
                        Grazie! I tuoi consensi e la firma sono stati registrati.
                        Puoi restituire il tablet alla segreteria.
                    </p>
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-sm text-teal-800">
                        <p className="font-medium mb-2">Documenti firmati:</p>
                        <ul className="space-y-1 text-left">
                            {data?.documenti.map((d) =>
                                accepted[d.id] ? (
                                    <li key={d.id} className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                        <span>{d.titolo}</span>
                                    </li>
                                ) : null
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // ── Stato: Errori ─────────────────────────────────────────────────────

    if (['error_not_found', 'error_expired', 'error_already_used', 'error_generic'].includes(pageState)) {
        const msgs: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
            error_not_found: { icon: <AlertCircle className="h-10 w-10 text-red-500" />, title: 'Link non valido', desc: 'Il link non è valido. Richiedi un nuovo link alla segreteria.' },
            error_expired: { icon: <Clock className="h-10 w-10 text-amber-500" />, title: 'Link scaduto', desc: 'Il link è scaduto (2 ore). Richiedi un nuovo link alla segreteria.' },
            error_already_used: { icon: <CheckCircle className="h-10 w-10 text-teal-500" />, title: 'Già firmato', desc: 'I consensi sono già stati firmati. Nessuna azione necessaria.' },
            error_generic: { icon: <AlertCircle className="h-10 w-10 text-red-500" />, title: 'Errore', desc: 'Si è verificato un errore. Riprova o contatta la segreteria.' },
        };
        const m = msgs[pageState] ?? msgs.error_generic;
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-4">{m.icon}</div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">{m.title}</h1>
                    <p className="text-gray-500 text-sm">{m.desc}</p>
                </div>
            </div>
        );
    }

    // ── Stato: Loading ────────────────────────────────────────────────────

    if (pageState === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Caricamento documenti…</p>
                </div>
            </div>
        );
    }

    // ── Main ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50">
            <SEOHead
                title="Consensi Informativi | Firma Digitale"
                description="Pagina di firma dei consensi informativi per il paziente."
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
                        {data && (
                            <p className="text-xs text-gray-500 truncate">
                                {data.appuntamento.prestazione} · {formatData(data.appuntamento.dataOra)}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                        <span className={`px-2 py-1 rounded-full ${step === 'documenti' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-600'}`}>
                            1 Documenti
                        </span>
                        <span className="text-gray-300">›</span>
                        <span className={`px-2 py-1 rounded-full ${step === 'firma' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            2 Firma
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

                {/* ── STEP 1: Documenti ─── */}
                {step === 'documenti' && data && (
                    <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                            <strong>Istruzioni:</strong> Leggi ogni documento espandendo «Leggi testo completo».
                            Seleziona la casella per accordo. I documenti con{' '}
                            <span className="text-red-500 font-semibold">*</span> sono obbligatori.
                        </div>

                        {data.documenti.map((doc) => {
                            const isPreSigned = (data.preSignedConsensi ?? []).includes(doc.id) && !forcedReSign[doc.id];
                            return (
                                <div
                                    key={doc.id}
                                    className={`bg-white rounded-xl border-2 shadow-sm transition-all ${accepted[doc.id] ? 'border-teal-400' : 'border-gray-200'} ${isPreSigned ? 'bg-teal-50/30' : ''}`}
                                >
                                    <div className="p-4">
                                        <div className="flex items-start gap-3">
                                            <button
                                                type="button"
                                                onClick={() => !isPreSigned && handleToggleAccepted(doc.id)}
                                                className="mt-0.5 flex-shrink-0"
                                                aria-label={`${accepted[doc.id] ? 'Deseleziona' : 'Seleziona'} ${doc.titolo}`}
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
                                                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${isPreSigned ? 'bg-teal-600 text-white' : accepted[doc.id] ? 'bg-teal-100 text-teal-700' : doc.obbligatorio ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {isPreSigned ? '✓ Già valido' : accepted[doc.id] ? '✓ Accettato' : doc.obbligatorio ? 'Obbligatorio' : 'Facoltativo'}
                                                    </span>
                                                </div>
                                                {isPreSigned && (
                                                    <p className="text-xs text-teal-600 mt-1 flex items-center justify-between">
                                                        <span>Consenso già firmato e ancora valido da una visita precedente.</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setForcedReSign(prev => ({ ...prev, [doc.id]: true }));
                                                                setAccepted(prev => ({ ...prev, [doc.id]: false }));
                                                            }}
                                                            className="ml-2 text-xs text-amber-600 hover:text-amber-800 font-medium underline underline-offset-2 whitespace-nowrap"
                                                        >
                                                            Forza nuova firma
                                                        </button>
                                                    </p>
                                                )}
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
                            );
                        })}

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            {!allObbligatoriAccepted && (
                                <p className="text-xs text-red-600 mb-3 flex items-center gap-1.5">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    Seleziona tutti i documenti obbligatori (<span className="text-red-500">*</span>) per procedere.
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={handleProcediFirma}
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

                {/* ── STEP 2: Firma ─── */}
                {step === 'firma' && data && (
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

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                            {/* Patient name field */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {isMinore ? 'Nome del paziente (minore)' : 'Nome del paziente'}
                                </label>
                                <input
                                    type="text"
                                    value={pazienteNome}
                                    onChange={(e) => setPazienteNome(e.target.value)}
                                    placeholder="Es. Mario Rossi"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                                />
                            </div>

                            {/* Tutore toggle for non-minor patients */}
                            {!isMinore && (
                                <label className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-lg hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={hasTutore}
                                        onChange={(e) => setHasTutore(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-400"
                                    />
                                    <span className="text-sm text-gray-700">Firma a nome di un tutore / genitore / soggetto delegato</span>
                                </label>
                            )}

                            {/* Tutore/Genitore section — visible for minors or when manually toggled */}
                            {hasTutore && (
                                <div className="border-t border-amber-100 pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                                            {isMinore ? 'Paziente minorenne' : 'Firma per conto del paziente'}
                                        </span>
                                    </div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Nome e Cognome del genitore / tutore legale <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={tutoreNome}
                                        onChange={(e) => setTutoreNome(e.target.value)}
                                        placeholder="Es. Rossi Giovanni (padre)"
                                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                    <p className="text-xs text-amber-600 mt-1">
                                        La firma sarà apposta dal genitore/tutore in nome del paziente.
                                    </p>
                                </div>
                            )}
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
                                onClick={() => setStep('documenti')}
                                className="flex-1 py-3 rounded-xl font-medium text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                                ← Torna ai documenti
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitFirma}
                                disabled={!signatureReady || pageState === 'submitting' || (hasTutore && !tutoreNome.trim())}
                                className={`flex-[2] py-3 rounded-xl font-semibold text-sm ${signatureReady && pageState !== 'submitting' && (!hasTutore || tutoreNome.trim()) ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {pageState === 'submitting'
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

export default ConsensoFirmaPage;
