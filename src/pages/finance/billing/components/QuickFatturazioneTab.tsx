/**
 * QuickFatturazioneTab — P98
 *
 * Tab di fatturazione rapida da incorporare in:
 *   - AccettazionePazienteModal (tab "Fattura")
 *   - ScheduleEventModal (tab nella sezione preventivi/certificati)
 *   - CartellaPaziente /:id (tab "Fatture")
 *   - AziendaDetailPage /:id (tab "Fatture")
 *
 * Permette di creare una bozza di fattura con pre-compilazione
 * automatica dei dati del paziente/azienda e del servizio.
 *
 * @module components/billing/QuickFatturazioneTab
 * @project P98
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    FileText, Plus, Euro, AlertTriangle, ExternalLink,
    CheckCircle2, Clock, Send, Loader2, ChevronRight, Brain, BookmarkCheck, Play, Pencil,
    Building2, CreditCard, Banknote, Landmark
} from 'lucide-react';
import { CRUDButton, CRUDPrimaryButton } from '../../../../components/ui';
import {
    useFatturazione,
    FatturaElettronica,
    StatoFattura,
    TipoServizio,
    CreaBozzaInput,
} from '../../../../hooks/finance/useFatturazione';
import { useBillingAccess } from '../../../../hooks/useBillingAccess';
import { useToast } from '../../../../hooks/useToast';
import NuovaFatturaModal, { NuovaFatturaPrecompile } from './NuovaFatturaModal';
import { apiGet, apiPatch } from '../../../../services/api';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Dati pre-compilati dalla entità sorgente */
export interface QuickFatturaContext {
    /** Tipo di servizio da pre-selezionare nella modale */
    tipoServizio: TipoServizio;
    /** ID Person del beneficiario (paziente) */
    personaId?: string;
    /** ID CompanyTenantProfile dell'azienda */
    aziendaId?: string;
    /** Prezzo pre-compilato nella prima riga */
    prezzoDefault?: number;
    /** Descrizione pre-compilata */
    descrizioneDefault?: string;
    /** ID visita/corso/nomina/sopralluogo/dvr collegata */
    visitaId?: string;
    courseScheduleId?: string;
    nominaId?: string;
    sopralluogoId?: string;
    dvrId?: string;
    preventivoId?: string;
    /** Se sistemaTS deve essere attivato (prestazioni sanitarie) */
    sistemaTsDefault?: 0 | 1;
    /** Dati destinatario pre-compilati */
    cessionarioDenominazione?: string;
    cessionarioCF?: string;
    cessionarioPIVA?: string;
    cessionarioIndirizzo?: string;
    cessionarioCAP?: string;
    cessionarioCitta?: string;
    cessionarioProvincia?: string;
}

export interface QuickFatturazioneTabProps {
    /** Contesto pre-compilato */
    context: QuickFatturaContext;
    /** Titolo della sezione */
    title?: string;
    /** Mostra più compatto (es. dentro modal) */
    compact?: boolean;
    /** Callback dopo creazione */
    onFatturaCreata?: (fattura: FatturaElettronica) => void;
    /** Se true, crea automaticamente una bozza al primo caricamento se non ne esistono già */
    autoCreateBozza?: boolean;
}

// ─── Stato badge compatto ─────────────────────────────────────────────────────

const STATO_BADGE: Record<StatoFattura, { label: string; cls: string; icon: React.ReactNode }> = {
    BOZZA: { label: 'Bozza', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', icon: <Clock className="h-3 w-3" /> },
    EMESSA: { label: 'Emessa', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: <Send className="h-3 w-3" /> },
    PAGATA: { label: 'Pagata', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300', icon: <CheckCircle2 className="h-3 w-3" /> },
    ANNULLATA: { label: 'Annullata', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: null },
    STORNATA: { label: 'Stornata', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', icon: null },
};

// ─── Component ────────────────────────────────────────────────────────────────

const QuickFatturazioneTab: React.FC<QuickFatturazioneTabProps> = ({
    context,
    title = 'Fatturazione',
    compact = false,
    onFatturaCreata,
    autoCreateBozza = false,
}) => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { hasBillingFeature } = useBillingAccess();
    const {
        fatture, loading, fetchFatture,
        entiEmittenti, fetchEntiEmittenti,
        creaFatturaBozza,
        emettiFattura,
        aggiornaBozza,
    } = useFatturazione();

    const [showModal, setShowModal] = useState(false);
    const [creatingQuick, setCreatingQuick] = useState(false);
    const [emettingId, setEmettingId] = useState<string | null>(null);
    const [editFatturaId, setEditFatturaId] = useState<string | null>(null);

    if (!hasBillingFeature) {
        return null;
    }

    // ── Fetch params stabili — usa personaId/aziendaId come filtro primario ────
    // Priorità: personaId/aziendaId → usa filtro per paziente/azienda in modo da
    // recuperare TUTTE le fatture dell'entità (incluse quelle senza visitaId).
    // Solo se non c'è un soggetto, si usa il filtro per risorsa specifica.
    // La logica OR di fattureContesto poi mostra solo quelle pertinenti al contesto.
    const fetchParams = useMemo((): Parameters<typeof fetchFatture>[0] => {
        if (context.personaId) return { limit: 50, clientePersonaId: context.personaId };
        if (context.aziendaId) return { limit: 50, clienteAziendaId: context.aziendaId };
        if (context.visitaId) return { limit: 50, visitaId: context.visitaId };
        if (context.courseScheduleId) return { limit: 50, courseScheduleId: context.courseScheduleId };
        if (context.nominaId) return { limit: 50, nominaId: context.nominaId };
        if (context.sopralluogoId) return { limit: 50, sopralluogoId: context.sopralluogoId };
        if (context.dvrId) return { limit: 50, dvrId: context.dvrId };
        return { limit: 50 };
    }, [context.personaId, context.aziendaId, context.visitaId, context.courseScheduleId,
    context.nominaId, context.sopralluogoId, context.dvrId]);

    // ── Disagio psicologico (solo VISITA con personaId) ───────────────────────
    const showDisagioSetting = context.tipoServizio === 'VISITA' && !!context.personaId;
    const [disagioPsicologico, setDisagioPsicologico] = useState(false);
    const [disagioLoading, setDisagioLoading] = useState(false);
    const [disagioSaving, setDisagioSaving] = useState(false);

    useEffect(() => {
        if (!showDisagioSetting) return;
        setDisagioLoading(true);
        apiGet(`/api/v1/persons/${context.personaId}/billing-settings`)
            .then((res: any) => {
                if (res?.success && res.data) {
                    setDisagioPsicologico(!!res.data.disagioPsicologico);
                }
            })
            .catch(() => {/* silenzioso */ })
            .finally(() => setDisagioLoading(false));
    }, [context.personaId, showDisagioSetting]);

    const handleToggleDisagio = useCallback(async (value: boolean) => {
        if (!context.personaId) return;
        setDisagioPsicologico(value);
        setDisagioSaving(true);
        try {
            await apiPatch(`/api/v1/persons/${context.personaId}/billing-settings`, { disagioPsicologico: value });
            showToast({ type: 'success', message: value ? 'Disagio psicologico attivato per questo paziente' : 'Disagio psicologico disattivato per questo paziente' });
        } catch {
            showToast({ type: 'error', message: 'Errore nel salvataggio delle impostazioni di fatturazione' });
            setDisagioPsicologico(!value); // rollback
        } finally {
            setDisagioSaving(false);
        }
    }, [context.personaId, showToast]);

    // Filtra le fatture rilevanti per questo contesto
    const fattureContesto = useMemo(() => {
        return fatture.filter(f => {
            if (context.visitaId && f.visitaId === context.visitaId) return true;
            if (context.courseScheduleId && f.courseScheduleId === context.courseScheduleId) return true;
            if (context.nominaId && f.nominaId === context.nominaId) return true;
            if (context.sopralluogoId && f.sopralluogoId === context.sopralluogoId) return true;
            if (context.dvrId && f.dvrId === context.dvrId) return true;
            if (context.preventivoId && f.preventivoId === context.preventivoId) return true;
            if (context.personaId && f.clientePersonaId === context.personaId) return true;
            if (context.aziendaId && f.clienteAziendaId === context.aziendaId) return true;
            return false;
        });
    }, [fatture, context]);

    useEffect(() => {
        fetchEntiEmittenti();
        fetchFatture(fetchParams);
    }, [fetchEntiEmittenti, fetchFatture, fetchParams]);

    // Creazione rapida con valori pre-compilati (senza aprire il modal completo)
    const handleQuickCreate = useCallback(async () => {
        const enteDefault = entiEmittenti.find(e => e.isDefault && e.isActive) ?? entiEmittenti.find(e => e.isActive);
        if (!enteDefault) {
            showToast({ type: 'error', message: 'Nessun ente emittente configurato. Vai nelle impostazioni billing.' });
            return;
        }
        if (!context.personaId && !context.aziendaId) {
            setShowModal(true);
            return;
        }

        setCreatingQuick(true);
        try {
            const input: CreaBozzaInput = {
                enteEmittenteId: enteDefault.id,
                tipoDocumento: context.tipoServizio === 'ACCONTO' ? 'ACCONTO' : 'FATTURA',
                tipoServizio: context.tipoServizio,
                clienteType: context.aziendaId ? 'AZIENDA' : 'PERSONA',
                ...(context.personaId ? { clientePersonaId: context.personaId } : {}),
                ...(context.aziendaId ? { clienteAziendaId: context.aziendaId } : {}),
                ...(context.visitaId ? { visitaId: context.visitaId } : {}),
                ...(context.courseScheduleId ? { courseScheduleId: context.courseScheduleId } : {}),
                ...(context.nominaId ? { nominaId: context.nominaId } : {}),
                ...(context.sopralluogoId ? { sopralluogoId: context.sopralluogoId } : {}),
                ...(context.dvrId ? { dvrId: context.dvrId } : {}),
                ...(context.preventivoId ? { preventivoId: context.preventivoId } : {}),
                sistemaTsFlagOpp: context.sistemaTsDefault ?? 0,
                condizioniPagamento: 'TP02',
                modalitaPagamento: 'MP08',
                linee: [
                    {
                        descrizione: context.descrizioneDefault || `${context.tipoServizio.replace('_', ' ')} – ${new Date().toLocaleDateString('it-IT')}`,
                        quantita: 1,
                        prezzoUnitario: context.prezzoDefault ?? 0,
                        aliquotaIva: context.tipoServizio === 'VISITA' ? 0 : 22,
                        natura: context.tipoServizio === 'VISITA' ? 'N4' : undefined,
                    },
                ],
            };

            const fattura = await creaFatturaBozza(input);
            showToast({ type: 'success', message: `Bozza n. ${fattura.numero} creata` });
            onFatturaCreata?.(fattura);
            fetchFatture(fetchParams);
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore creazione fattura rapida' });
        } finally {
            setCreatingQuick(false);
        }
    }, [entiEmittenti, context, creaFatturaBozza, fetchFatture, fetchParams, onFatturaCreata, showToast]);

    // Auto-creazione bozza al primo caricamento (se richiesto e nessuna fattura presente)
    const autoCreatedRef = useRef(false);
    useEffect(() => {
        if (!autoCreateBozza || loading || autoCreatedRef.current) return;
        if (fattureContesto.length > 0 || entiEmittenti.length === 0) return;
        if (!context.personaId && !context.aziendaId) return;
        autoCreatedRef.current = true;
        handleQuickCreate();
    }, [autoCreateBozza, loading, fattureContesto.length, entiEmittenti.length, context.personaId, context.aziendaId, handleQuickCreate]);

    const handleEmetti = useCallback(async (fatturaId: string) => {
        setEmettingId(fatturaId);
        try {
            await emettiFattura(fatturaId);
            showToast({ type: 'success', message: 'Fattura emessa con successo' });
            fetchFatture(fetchParams);
        } catch (err: unknown) {
            const axErr = err as { response?: { status?: number; data?: { error?: string; campiMancanti?: string[] } } };
            const data = axErr?.response?.data;
            if (axErr?.response?.status === 422 && data?.campiMancanti?.length) {
                showToast({
                    type: 'error',
                    message: `Dati incompleti:\n${data.campiMancanti.join('\n')}`,
                    duration: 8000,
                });
            } else {
                showToast({
                    type: 'error',
                    message: data?.error || 'Errore nell\'emissione della fattura. Controllare i dati.',
                });
            }
        } finally {
            setEmettingId(null);
        }
    }, [emettiFattura, fetchFatture, fetchParams, showToast]);

    // ── Quick-edit bozza (ente emittente, modalità pagamento) ─────────────────
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const activeEnti = useMemo(() => entiEmittenti.filter(e => e.isActive), [entiEmittenti]);
    const showEnteSelector = activeEnti.length > 1;

    const PAYMENT_METHODS = [
        { code: 'MP01', label: 'Contanti', icon: Banknote },
        { code: 'MP08', label: 'Carta', icon: CreditCard },
        { code: 'MP05', label: 'Bonifico', icon: Landmark },
    ] as const;

    const handleQuickUpdate = useCallback(async (fatturaId: string, field: string, value: string) => {
        setUpdatingId(fatturaId);
        try {
            await aggiornaBozza(fatturaId, { [field]: value });
            fetchFatture(fetchParams);
        } catch {
            showToast({ type: 'error', message: 'Errore nell\'aggiornamento della bozza' });
        } finally {
            setUpdatingId(null);
        }
    }, [aggiornaBozza, fetchFatture, fetchParams, showToast]);

    const formatEur = (n: number) =>
        n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className={compact ? 'space-y-3' : 'space-y-4 p-4'}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className={`font-semibold text-gray-900 dark:text-white flex items-center gap-2 ${compact ? 'text-sm' : 'text-base'}`}>
                    <Euro className={compact ? 'h-4 w-4 text-teal-600' : 'h-5 w-5 text-teal-600'} />
                    {title}
                </h3>
                <div className="flex items-center gap-2">
                    {/* Quick create — solo se c'è un pre-compilato */}
                    {(context.personaId || context.aziendaId) && (
                        <CRUDButton
                            onClick={handleQuickCreate}
                            disabled={creatingQuick || entiEmittenti.filter(e => e.isActive).length === 0}
                            title="Crea bozza rapida con dati pre-compilati"
                        >
                            {creatingQuick
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Plus className="h-3.5 w-3.5" />
                            }
                            Bozza rapida
                        </CRUDButton>
                    )}
                    <CRUDPrimaryButton onClick={() => setShowModal(true)}>
                        <Plus className="h-3.5 w-3.5" /> Nuova fattura
                    </CRUDPrimaryButton>
                </div>
            </div>

            {/* Impostazioni fatturazione paziente — solo VISITA */}
            {showDisagioSetting && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                    <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <div>
                            <div className="text-sm font-medium text-purple-900 dark:text-purple-200">Disagio psicologico</div>
                            <div className="text-xs text-purple-600 dark:text-purple-400">
                                IVA esente (art. 10 n.18 DPR 633/72) — finalità terapeutica
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {disagioLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                        ) : (
                            <>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={disagioPsicologico}
                                    disabled={disagioSaving}
                                    onClick={() => handleToggleDisagio(!disagioPsicologico)}
                                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 disabled:opacity-50 ${disagioPsicologico ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${disagioPsicologico ? 'translate-x-5' : 'translate-x-0.5'
                                            }`}
                                    />
                                </button>
                                {disagioSaving && <BookmarkCheck className="h-3.5 w-3.5 text-purple-400 animate-pulse" />}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Alert no enti */}
            {entiEmittenti.filter(e => e.isActive).length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                        Nessun ente emittente configurato.{' '}
                        <a href="/management/billing/enti-emittenti" className="font-medium underline">
                            Configurane uno →
                        </a>
                    </span>
                </div>
            )}

            {/* Fatture legate al contesto */}
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Caricamento fatture...
                </div>
            ) : fattureContesto.length === 0 ? (
                <div className={`text-center py-6 text-sm text-gray-400 dark:text-gray-500 ${compact ? 'py-4' : 'py-8'}`}>
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p>Nessuna fattura per questo {context.personaId ? 'paziente' : context.aziendaId ? 'azienda' : 'elemento'}</p>
                    <p className="text-xs mt-1">Crea una bozza per iniziare</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {fattureContesto.map(f => {
                        const stato = STATO_BADGE[f.stato] ?? STATO_BADGE.BOZZA;
                        const isBozza = f.stato === 'BOZZA';
                        const isUpdating = updatingId === f.id;
                        return (
                            <div
                                key={f.id}
                                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm transition-all group cursor-pointer"
                                onClick={() => setEditFatturaId(f.id)}
                            >
                                {/* Riga principale */}
                                <div className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-4 w-4 text-teal-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {f.numero}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${stato.cls}`}>
                                                    {stato.icon}
                                                    {stato.label}
                                                </span>
                                                {f.bolloVirtuale && (
                                                    <span className="text-xs text-amber-500" title="Bollo virtuale €2.00">🪙</span>
                                                )}
                                                {f.disagioPsicologico && (
                                                    <span className="text-xs text-purple-500" title="IVA esente: finalità terapeutica">♿</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                {new Date(f.dataEmissione).toLocaleDateString('it-IT')}
                                                {' · '}{f.cessionarioDenominazione}
                                                {f.enteEmittente && ` · ${f.enteEmittente.denominazione}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {formatEur(Number(f.totale))}
                                        </span>
                                        {isBozza && (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditFatturaId(f.id); }}
                                                    className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                    title="Modifica bozza"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEmetti(f.id); }}
                                                    disabled={emettingId === f.id}
                                                    className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                                                    title="Emetti fattura"
                                                >
                                                    {emettingId === f.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <Play className="h-3.5 w-3.5" />
                                                    }
                                                </button>
                                            </>
                                        )}
                                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
                                    </div>
                                </div>

                                {/* Quick-edit toolbar per BOZZA */}
                                {isBozza && (
                                    <div
                                        className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-0"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Ente emittente selector */}
                                        {showEnteSelector && (
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                <select
                                                    value={f.enteEmittenteId}
                                                    disabled={isUpdating}
                                                    onChange={(e) => handleQuickUpdate(f.id, 'enteEmittenteId', e.target.value)}
                                                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-md px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50"
                                                >
                                                    {activeEnti.map(ente => (
                                                        <option key={ente.id} value={ente.id}>
                                                            {ente.label || ente.denominazione}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Separatore */}
                                        {showEnteSelector && (
                                            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                                        )}

                                        {/* Modalità pagamento quick toggle */}
                                        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                                            {PAYMENT_METHODS.map(pm => {
                                                const Icon = pm.icon;
                                                const isActive = f.modalitaPagamento === pm.code;
                                                return (
                                                    <button
                                                        key={pm.code}
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() => !isActive && handleQuickUpdate(f.id, 'modalitaPagamento', pm.code)}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-50 ${isActive
                                                            ? 'bg-white dark:bg-gray-600 text-teal-700 dark:text-teal-300 shadow-sm'
                                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                            }`}
                                                        title={pm.label}
                                                    >
                                                        <Icon className="h-3 w-3" />
                                                        <span className="hidden sm:inline">{pm.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-teal-500" />}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Link a lista completa */}
            {fattureContesto.length > 0 && context.personaId && (
                <button
                    onClick={() => navigate(`/poliambulatorio/pazienti/${context.personaId}?tab=fatturazione`)}
                    className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                >
                    Vedi tutte le fatture
                    <ExternalLink className="h-3 w-3" />
                </button>
            )}
            {fattureContesto.length > 0 && !context.personaId && (
                <a
                    href="/management/billing/fatture"
                    className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                >
                    Vedi tutte le fatture
                    <ExternalLink className="h-3 w-3" />
                </a>
            )}

            {/* Modal completa */}
            {showModal && (
                <NuovaFatturaModal
                    onClose={() => setShowModal(false)}
                    onCreated={() => {
                        setShowModal(false);
                        fetchFatture(fetchParams);
                    }}
                    precompile={{
                        tipoServizio: context.tipoServizio,
                        personaId: context.personaId,
                        aziendaId: context.aziendaId,
                        visitaId: context.visitaId,
                        courseScheduleId: context.courseScheduleId,
                        nominaId: context.nominaId,
                        sopralluogoId: context.sopralluogoId,
                        dvrId: context.dvrId,
                        preventivoId: context.preventivoId,
                        prezzoDefault: context.prezzoDefault,
                        descrizioneDefault: context.descrizioneDefault,
                        sistemaTsDefault: context.sistemaTsDefault,
                        cessionarioDenominazione: context.cessionarioDenominazione,
                        cessionarioCF: context.cessionarioCF,
                        cessionarioPIVA: context.cessionarioPIVA,
                        cessionarioIndirizzo: context.cessionarioIndirizzo,
                        cessionarioCAP: context.cessionarioCAP,
                        cessionarioCitta: context.cessionarioCitta,
                        cessionarioProvincia: context.cessionarioProvincia,
                    }}
                />
            )}
            {/* Modal modifica bozza */}
            {editFatturaId && (
                <NuovaFatturaModal
                    editId={editFatturaId}
                    onClose={() => setEditFatturaId(null)}
                    onCreated={() => {
                        setEditFatturaId(null);
                        fetchFatture(fetchParams);
                    }}
                    precompile={{
                        tipoServizio: context.tipoServizio,
                        personaId: context.personaId,
                        aziendaId: context.aziendaId,
                        visitaId: context.visitaId,
                    }}
                />
            )}
        </div>
    );
};

export default QuickFatturazioneTab;
