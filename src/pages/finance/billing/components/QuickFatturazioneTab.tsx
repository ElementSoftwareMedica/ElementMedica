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
    CheckCircle2, Clock, Send, Loader2, Brain, BookmarkCheck, Play, Pencil,
    Building2, CreditCard, Banknote, Landmark, Trash2, Printer, Mail
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
import { apiDownloadWithFilename, apiGet, apiPatch, apiPost } from '../../../../services/api';
import { useNavigate } from 'react-router-dom';
import ElegantSelect from '../../../../components/ui/ElegantSelect';

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
    appuntamentoId?: string;
    visitaId?: string;
    courseScheduleId?: string;
    nominaId?: string;
    sopralluogoId?: string;
    dvrId?: string;
    preventivoId?: string;
    /** Se sistemaTS deve essere attivato (prestazioni sanitarie) */
    sistemaTsDefault?: 0 | 1;
    /** Chiave stabile dell'appuntamento/modal per evitare bozze duplicate prima che esista la visita */
    contextKey?: string;
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
        segnaPagata,
        eliminaFattura,
        stornaERifai,
    } = useFatturazione();

    const [showModal, setShowModal] = useState(false);
    const [creatingQuick, setCreatingQuick] = useState(false);
    const [emettingId, setEmettingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [emailingId, setEmailingId] = useState<string | null>(null);
    const [creditingId, setCreditingId] = useState<string | null>(null);
    const [payingWithoutInvoice, setPayingWithoutInvoice] = useState(false);
    const [editFatturaId, setEditFatturaId] = useState<string | null>(null);
    const [fattureReady, setFattureReady] = useState(false);

    // ── Fetch params stabili — usa personaId/aziendaId come filtro primario ────
    // Priorità: personaId/aziendaId → usa filtro per paziente/azienda in modo da
    // recuperare TUTTE le fatture dell'entità. La UI poi separa quelle correlate
    // all'appuntamento dalle fatture pregresse.
    const fetchParams = useMemo((): Parameters<typeof fetchFatture>[0] => {
        if (context.tipoServizio === 'VISITA_MDL' && context.aziendaId) {
            return { limit: 100, clienteAziendaId: context.aziendaId };
        }
        if (context.personaId) return { limit: 100, clientePersonaId: context.personaId };
        if (context.aziendaId) return { limit: 100, clienteAziendaId: context.aziendaId };
        if (context.visitaId) return { limit: 100, visitaId: context.visitaId };
        if (context.courseScheduleId) return { limit: 100, courseScheduleId: context.courseScheduleId };
        if (context.nominaId) return { limit: 100, nominaId: context.nominaId };
        if (context.sopralluogoId) return { limit: 100, sopralluogoId: context.sopralluogoId };
        if (context.dvrId) return { limit: 100, dvrId: context.dvrId };
        return { limit: 100 };
    }, [context.personaId, context.aziendaId, context.visitaId, context.courseScheduleId,
    context.nominaId, context.sopralluogoId, context.dvrId, context.tipoServizio]);

    // ── Disagio psicologico (solo VISITA con personaId) ───────────────────────
    const showDisagioSetting = hasBillingFeature && context.tipoServizio === 'VISITA' && !!context.personaId;
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

    const isExactContextFattura = useCallback((f: FatturaElettronica) => {
        if (context.appuntamentoId && context.contextKey && f.note?.startsWith(context.contextKey)) return true;
        if (context.visitaId && f.visitaId === context.visitaId) return true;
        if (context.courseScheduleId) return f.courseScheduleId === context.courseScheduleId;
        if (context.nominaId) return f.nominaId === context.nominaId;
        if (context.sopralluogoId) return f.sopralluogoId === context.sopralluogoId;
        if (context.dvrId) return f.dvrId === context.dvrId;
        if (context.preventivoId) return f.preventivoId === context.preventivoId;
        if (context.contextKey) return f.note === context.contextKey;
        return false;
    }, [context.visitaId, context.appuntamentoId, context.courseScheduleId, context.nominaId, context.sopralluogoId, context.dvrId, context.preventivoId, context.contextKey]);

    const isSameSubjectFattura = useCallback((f: FatturaElettronica) => {
        if (context.personaId && f.clientePersonaId === context.personaId) return true;
        if (context.aziendaId && f.clienteAziendaId === context.aziendaId) return true;
        return false;
    }, [context.personaId, context.aziendaId]);

    const fattureCollegate = useMemo(() => fatture.filter(isExactContextFattura), [fatture, isExactContextFattura]);
    const hasClosedContextDocument = useMemo(() => (
        fattureCollegate.some(f => ['EMESSA', 'PAGATA', 'ANNULLATA', 'STORNATA'].includes(f.stato))
    ), [fattureCollegate]);

    const fattureAppuntamento = useMemo(() => {
        const byId = new Map<string, FatturaElettronica>();
        fattureCollegate
            .filter(f => !['ANNULLATA', 'STORNATA'].includes(f.stato))
            .forEach(f => byId.set(f.id, f));
        fatture
            .filter(f => ['BOZZA', 'EMESSA'].includes(f.stato) && isSameSubjectFattura(f))
            .forEach(f => byId.set(f.id, f));
        return Array.from(byId.values()).sort((a, b) => new Date(b.dataEmissione).getTime() - new Date(a.dataEmissione).getTime());
    }, [fatture, fattureCollegate, isSameSubjectFattura]);

    const fatturePregresse = useMemo(() => {
        return fatture
            .filter(f => isSameSubjectFattura(f) && !fattureAppuntamento.some(active => active.id === f.id))
            .sort((a, b) => new Date(b.dataEmissione).getTime() - new Date(a.dataEmissione).getTime());
    }, [fatture, isSameSubjectFattura, fattureAppuntamento]);

    const buildQuickDraftInput = useCallback((enteId: string): CreaBozzaInput => {
        const isMedicalService = context.tipoServizio === 'VISITA' || context.tipoServizio === 'VISITA_MDL';
        const isAesthetic = /estetic/i.test(context.descrizioneDefault || '');
        const medicalExempt = isMedicalService && !isAesthetic;
        return {
            enteEmittenteId: enteId,
            tipoDocumento: context.tipoServizio === 'ACCONTO' ? 'ACCONTO' : 'FATTURA',
            tipoServizio: context.tipoServizio,
            clienteType: context.aziendaId ? 'AZIENDA' : 'PERSONA',
            ...(context.personaId ? { clientePersonaId: context.personaId } : {}),
            ...(context.aziendaId ? { clienteAziendaId: context.aziendaId } : {}),
            ...(context.visitaId ? { visitaId: context.visitaId } : {}),
            ...(context.appuntamentoId ? { appuntamentoId: context.appuntamentoId } : {}),
            ...(context.courseScheduleId ? { courseScheduleId: context.courseScheduleId } : {}),
            ...(context.nominaId ? { nominaId: context.nominaId } : {}),
            ...(context.sopralluogoId ? { sopralluogoId: context.sopralluogoId } : {}),
            ...(context.dvrId ? { dvrId: context.dvrId } : {}),
            ...(context.preventivoId ? { preventivoId: context.preventivoId } : {}),
            sistemaTsFlagOpp: context.sistemaTsDefault ?? 0,
            note: context.contextKey,
            condizioniPagamento: 'TP02',
            modalitaPagamento: 'MP08',
            linee: [
                {
                    descrizione: context.descrizioneDefault || `${context.tipoServizio.replace('_', ' ')} - ${new Date().toLocaleDateString('it-IT')}`,
                    quantita: 1,
                    prezzoUnitario: context.prezzoDefault ?? 0,
                    aliquotaIva: medicalExempt ? 0 : 22,
                    natura: medicalExempt ? 'N4' : undefined,
                },
            ],
        };
    }, [context]);

    useEffect(() => {
        if (!hasBillingFeature) return;
        fetchEntiEmittenti();
        setFattureReady(false);
        fetchFatture(fetchParams).finally(() => setFattureReady(true));
    }, [fetchEntiEmittenti, fetchFatture, fetchParams, hasBillingFeature]);

    // Creazione rapida con valori pre-compilati (senza aprire il modal completo)
    const handleQuickCreate = useCallback(async () => {
        if (!hasBillingFeature) return;
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
            const fattura = await creaFatturaBozza(buildQuickDraftInput(enteDefault.id));
            showToast({ type: 'success', message: `Bozza n. ${fattura.numero} creata` });
            onFatturaCreata?.(fattura);
            fetchFatture(fetchParams);
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore creazione fattura rapida' });
        } finally {
            setCreatingQuick(false);
        }
    }, [entiEmittenti, context.personaId, context.aziendaId, buildQuickDraftInput, creaFatturaBozza, fetchFatture, fetchParams, hasBillingFeature, onFatturaCreata, showToast]);

    // Auto-creazione bozza al primo caricamento (se richiesto e nessuna fattura presente)
    const autoCreatedRef = useRef(false);
    const autoUpdatedDraftRef = useRef<string>('');
    useEffect(() => {
        if (!hasBillingFeature) return;
        if (!autoCreateBozza || loading || !fattureReady || autoCreatedRef.current) return;
        if (hasClosedContextDocument || fattureCollegate.length > 0 || fattureAppuntamento.length > 0 || entiEmittenti.length === 0) return;
        if (!context.personaId && !context.aziendaId) return;
        autoCreatedRef.current = true;
        handleQuickCreate();
    }, [autoCreateBozza, loading, fattureReady, hasClosedContextDocument, fattureCollegate.length, fattureAppuntamento.length, entiEmittenti.length, context.personaId, context.aziendaId, handleQuickCreate, hasBillingFeature]);

    useEffect(() => {
        if (!hasBillingFeature || !autoCreateBozza || loading) return;
        const bozza = fattureCollegate.find(f => f.stato === 'BOZZA') || fattureAppuntamento.find(f => f.stato === 'BOZZA');
        if (!bozza || !bozza.linee?.length) return;
        const expectedPrice = Number(context.prezzoDefault ?? 0);
        const currentPrice = Number(bozza.linee[0]?.prezzoUnitario ?? 0);
        const shouldUpdatePrice = Math.abs(currentPrice - expectedPrice) >= 0.01;
        const shouldLinkVisita = !!context.visitaId && bozza.visitaId !== context.visitaId;
        if (!shouldUpdatePrice && !shouldLinkVisita) return;
        const updateKey = `${bozza.id}:${expectedPrice}:${context.visitaId || ''}`;
        if (autoUpdatedDraftRef.current === updateKey) return;
        autoUpdatedDraftRef.current = updateKey;
        const linee = bozza.linee.map((linea, index) => index === 0
            ? { ...linea, prezzoUnitario: expectedPrice, prezzoTotale: expectedPrice * Number(linea.quantita || 1) }
            : linea
        );
        aggiornaBozza(bozza.id, {
            ...(shouldUpdatePrice ? { linee } : {}),
            ...(shouldLinkVisita ? { visitaId: context.visitaId } : {}),
            ...(context.contextKey && !bozza.note ? { note: context.contextKey } : {}),
        })
            .then(() => fetchFatture(fetchParams))
            .catch(() => showToast({ type: 'error', message: 'Errore aggiornamento prezzo bozza fattura' }));
    }, [hasBillingFeature, autoCreateBozza, loading, fattureCollegate, fattureAppuntamento, context.prezzoDefault, context.visitaId, context.contextKey, aggiornaBozza, fetchFatture, fetchParams, showToast]);

    const handleEmetti = useCallback(async (fattura: FatturaElettronica) => {
        const fatturaId = fattura.id;
        setEmettingId(fatturaId);
        try {
            const response = await emettiFattura(fatturaId);
            const emittedStatus = (response as any)?.data?.stato;
            if (emittedStatus !== 'PAGATA' && (fattura.modalitaPagamento === 'MP01' || fattura.modalitaPagamento === 'MP08')) {
                await segnaPagata(fatturaId);
            }
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
    }, [emettiFattura, segnaPagata, fetchFatture, fetchParams, showToast]);

    const handleDeleteBozza = useCallback(async (fatturaId: string) => {
        setDeletingId(fatturaId);
        try {
            await eliminaFattura(fatturaId, 'Eliminazione bozza da accettazione paziente');
            showToast({ type: 'success', message: 'Bozza eliminata' });
            fetchFatture(fetchParams);
        } catch {
            showToast({ type: 'error', message: 'Errore eliminazione bozza' });
        } finally {
            setDeletingId(null);
        }
    }, [eliminaFattura, fetchFatture, fetchParams, showToast]);

    const handleSegnaPagata = useCallback(async (fatturaId: string) => {
        setMarkingPaidId(fatturaId);
        try {
            await segnaPagata(fatturaId);
            showToast({ type: 'success', message: 'Pagamento registrato' });
            fetchFatture(fetchParams);
        } catch {
            showToast({ type: 'error', message: 'La fattura deve essere emessa prima di poterla segnare pagata' });
        } finally {
            setMarkingPaidId(null);
        }
    }, [fetchFatture, fetchParams, segnaPagata, showToast]);

    const handleDownloadPdf = useCallback(async (fattura: FatturaElettronica) => {
        setPrintingId(fattura.id);
        try {
            const { blob, filename } = await apiDownloadWithFilename(`/api/v1/billing/fatture/${fattura.id}/pdf`);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `fattura-${fattura.numero}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch {
            showToast({ type: 'error', message: 'Errore generazione PDF fattura' });
        } finally {
            setPrintingId(null);
        }
    }, [showToast]);

    const handleInviaEmail = useCallback(async (fattura: FatturaElettronica) => {
        setEmailingId(fattura.id);
        try {
            await apiPost(`/api/v1/billing/fatture/${fattura.id}/invia-email`, {});
            showToast({ type: 'success', message: 'Fattura inviata via email' });
        } catch {
            showToast({ type: 'error', message: 'Email destinatario non disponibile o invio non riuscito' });
        } finally {
            setEmailingId(null);
        }
    }, [showToast]);

    const handlePagamentoSenzaFattura = useCallback(async (bozzaDaEliminareId?: string) => {
        if (!context.visitaId && !context.appuntamentoId) {
            showToast({ type: 'warning', message: 'Visita o appuntamento non disponibile per registrare il pagamento' });
            return;
        }
        setPayingWithoutInvoice(true);
        try {
            let bozzaId = bozzaDaEliminareId;
            if (!bozzaId) {
                const bozzaEsistente = fattureAppuntamento.find(f => f.stato === 'BOZZA');
                bozzaId = bozzaEsistente?.id;
            }
            if (!bozzaId) {
                const enteDefault = entiEmittenti.find(e => e.isDefault && e.isActive) ?? entiEmittenti.find(e => e.isActive);
                if (!enteDefault) {
                    showToast({ type: 'error', message: 'Nessun ente emittente configurato. Vai nelle impostazioni billing.' });
                    return;
                }
                const bozza = await creaFatturaBozza(buildQuickDraftInput(enteDefault.id));
                bozzaId = bozza.id;
            }
            await apiPost('/api/v1/billing/fatture/pagata-senza-fattura', {
                visitaId: context.visitaId,
                appuntamentoId: context.appuntamentoId,
                importoRiferimento: context.prezzoDefault ?? 0,
                descrizione: context.descrizioneDefault,
                bozzaFatturaId: bozzaId,
                metodoPagamento: 'MP08'
            });
            showToast({ type: 'success', message: 'Prestazione segnata come pagata senza fattura. Documento interno e compenso medico generati.' });
            fetchFatture(fetchParams);
        } catch {
            showToast({ type: 'error', message: 'Errore registrazione pagamento senza fattura' });
        } finally {
            setPayingWithoutInvoice(false);
        }
    }, [buildQuickDraftInput, context.appuntamentoId, context.descrizioneDefault, context.prezzoDefault, context.visitaId, creaFatturaBozza, entiEmittenti, fattureAppuntamento, fetchFatture, fetchParams, showToast]);

    const handleStornaERifai = useCallback(async (fattura: FatturaElettronica) => {
        setCreditingId(fattura.id);
        try {
            await stornaERifai(fattura.id, 'Storno e rifacimento da scheda paziente/accettazione');
            showToast({
                type: 'success',
                message: fattura.stato === 'BOZZA'
                    ? 'Bozza eliminata. Puoi rifare la fattura.'
                    : 'Fattura stornata con nota di credito. Puoi rifarla correttamente.'
            });
            fetchFatture(fetchParams);
        } catch {
            showToast({ type: 'error', message: 'Errore nello storno della fattura' });
        } finally {
            setCreditingId(null);
        }
    }, [fetchFatture, fetchParams, showToast, stornaERifai]);

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
    if (!hasBillingFeature) {
        return null;
    }

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

            {/* Fatture pregresse e legate al contesto */}
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Caricamento fatture...
                </div>
            ) : (fattureAppuntamento.length === 0 && fatturePregresse.length === 0) ? (
                <div className={`text-center py-6 text-sm text-gray-400 dark:text-gray-500 ${compact ? 'py-4' : 'py-8'}`}>
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p>Nessuna bozza o fattura collegata a questo appuntamento</p>
                    <p className="text-xs mt-1">La bozza viene creata automaticamente quando il tab fatturazione è aperto.</p>
                    {(context.visitaId || context.appuntamentoId) && (
                        <button
                            type="button"
                            onClick={() => handlePagamentoSenzaFattura()}
                            disabled={payingWithoutInvoice}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                        >
                            {payingWithoutInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Pagata senza fattura
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prestazioni e pagamenti appuntamento</p>
                            <span className="text-xs font-medium text-slate-400">{fattureAppuntamento.length} documenti</span>
                        </div>
                        <p className="text-xs text-slate-500">
                            Qui trovi le prestazioni ancora in bozza, quelle già emesse e quelle pagate legate all'appuntamento aperto.
                        </p>
                    </div>
                    {fattureAppuntamento.map(f => {
                        const stato = STATO_BADGE[f.stato] ?? STATO_BADGE.BOZZA;
                        const isBozza = f.stato === 'BOZZA';
                        const isUpdating = updatingId === f.id;
                        return (
                            <div
                                key={f.id}
                                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm transition-all group"
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
                                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${f.clienteAziendaId ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'}`}>
                                                    {f.clienteAziendaId ? 'Azienda' : 'Paziente'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                {new Date(f.dataEmissione).toLocaleDateString('it-IT')}
                                                {' · '}{f.cessionarioDenominazione}
                                                {f.enteEmittente && ` · ${f.enteEmittente.denominazione}`}
                                            </div>
                                            {f.linee?.[0]?.descrizione && (
                                                <div className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                                                    {f.linee[0].descrizione}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {formatEur(Number(f.totale))}
                                        </span>
                                        {!isBozza && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleDownloadPdf(f); }}
                                                    disabled={printingId === f.id}
                                                    className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                                    title="Stampa o scarica PDF fattura"
                                                >
                                                    {printingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleInviaEmail(f); }}
                                                    disabled={emailingId === f.id}
                                                    className="p-1 rounded text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50"
                                                    title="Invia fattura via email"
                                                >
                                                    {emailingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                                                </button>
                                                {f.tipoDocumento !== 'NOTA_CREDITO' && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleStornaERifai(f); }}
                                                        disabled={creditingId === f.id}
                                                        className="p-1 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50"
                                                        title={String(f.numero || '').startsWith('SF-') ? 'Annulla pagamento senza fattura e rifai' : 'Storna e rifai fattura'}
                                                    >
                                                        {creditingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                    </button>
                                                )}
                                            </>
                                        )}
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
                                                    onClick={(e) => { e.stopPropagation(); handleEmetti(f); }}
                                                    disabled={emettingId === f.id}
                                                    className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                                                    title="Emetti fattura"
                                                >
                                                    {emettingId === f.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <Play className="h-3.5 w-3.5" />
                                                    }
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteBozza(f.id); }}
                                                    disabled={deletingId === f.id}
                                                    className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                                                    title="Elimina bozza"
                                                >
                                                    {deletingId === f.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <Trash2 className="h-3.5 w-3.5" />
                                                    }
                                                </button>
                                            </>
                                        )}
                                        {f.stato === 'EMESSA' && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleSegnaPagata(f.id); }}
                                                disabled={markingPaidId === f.id}
                                                className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                                                title="Segna come pagata"
                                            >
                                                {markingPaidId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Pagata'}
                                            </button>
                                        )}
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
                                            <div className="flex min-w-[180px] items-center gap-1.5">
                                                <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                <ElegantSelect
                                                    value={f.enteEmittenteId}
                                                    onChange={(value) => handleQuickUpdate(f.id, 'enteEmittenteId', value)}
                                                    disabled={isUpdating}
                                                    className="min-w-0 flex-1"
                                                    triggerClassName="h-7 rounded-lg px-2 text-xs"
                                                    options={activeEnti.map(ente => ({
                                                        value: ente.id,
                                                        label: ente.label || ente.denominazione,
                                                    }))}
                                                />
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
                                        {(context.visitaId || context.appuntamentoId) && (
                                            <button
                                                type="button"
                                                onClick={() => handlePagamentoSenzaFattura(f.id)}
                                                disabled={payingWithoutInvoice}
                                                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                                                title="Registra pagamento senza emettere fattura e genera compenso medico"
                                            >
                                                {payingWithoutInvoice ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                                <span className="hidden sm:inline">Pagata senza fattura</span>
                                            </button>
                                        )}

                                        {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-teal-500" />}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fatture pregresse</p>
                            <span className="text-xs font-medium text-slate-400">{fatturePregresse.length} documenti</span>
                        </div>
                        {fatturePregresse.length === 0 ? (
                            <p className="py-3 text-sm text-slate-400">Nessuna fattura precedente trovata.</p>
                        ) : (
                            <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                                {fatturePregresse.map(f => {
                                    const stato = STATO_BADGE[f.stato] ?? STATO_BADGE.BOZZA;
                                    return (
                                        <div key={f.id} className="flex items-center justify-between gap-3 py-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate text-sm font-semibold text-slate-800">{f.numero}</span>
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${stato.cls}`}>
                                                        {stato.icon}
                                                        {stato.label}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${f.clienteAziendaId ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'}`}>
                                                        {f.clienteAziendaId ? 'Azienda' : 'Paziente'}
                                                    </span>
                                                </div>
                                                <p className="truncate text-xs text-slate-400">
                                                    {new Date(f.dataEmissione).toLocaleDateString('it-IT')} · {f.cessionarioDenominazione}
                                                </p>
                                                {f.linee?.[0]?.descrizione && (
                                                    <p className="truncate text-xs font-medium text-slate-600">{f.linee[0].descrizione}</p>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <span className="text-sm font-bold text-slate-800">{formatEur(Number(f.totale))}</span>
                                                {f.stato !== 'BOZZA' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownloadPdf(f)}
                                                            disabled={printingId === f.id}
                                                            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                                            title="Stampa o scarica PDF"
                                                        >
                                                            {printingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                                                        </button>
                                                        {f.tipoDocumento !== 'NOTA_CREDITO' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStornaERifai(f)}
                                                                disabled={creditingId === f.id}
                                                                className="rounded-md p-1 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                                                                title="Storna e rifai fattura"
                                                            >
                                                                {creditingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Link a lista completa */}
            {(fattureAppuntamento.length > 0 || fatturePregresse.length > 0) && context.personaId && (
                <button
                    onClick={() => navigate(`/poliambulatorio/pazienti/${context.personaId}?tab=fatturazione`)}
                    className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                >
                    Vedi tutte le fatture
                    <ExternalLink className="h-3 w-3" />
                </button>
            )}
            {(fattureAppuntamento.length > 0 || fatturePregresse.length > 0) && !context.personaId && (
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
