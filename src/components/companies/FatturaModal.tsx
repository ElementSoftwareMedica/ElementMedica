/**
 * FatturaModal — Emissione fattura/acconto da movimenti DA_FATTURARE
 *
 * Permette di selezionare i movimenti contabili CONFERMATI (senza fattura collegata)
 * e creare una bozza di fattura o un acconto direttamente dalla pagina aziendale.
 *
 * Usa useFatturazione per la creazione bozza e l'emissione via SDI.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    X, FileText, Send, Loader2, CheckSquare, Square,
    AlertCircle, User, Calendar, Euro,
} from 'lucide-react';
import { CRUDButton, CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import {
    useFatturazione,
    CreaBozzaInput,
} from '@/hooks/finance/useFatturazione';
import { useToast } from '@/hooks/useToast';

// ─── Tipi ─────────────────────────────────────────────────────────────────────

/** Sottoinsieme di BillingItem da CompanyBillingCard necessario per questo modal */
export interface FatturabileBillingItem {
    id: string;
    description: string;
    personName: string | null;
    siteName: string | null;
    dataEsecuzione: string;
    importoLordo: number;
    importoNetto: number;
    aliquotaIva: number;
    computedStatus: string;
}

export interface FatturaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    /** companyTenantProfileId dell'azienda */
    companyId: string;
    companyName: string;
    /** Lista completa degli item (verranno filtrati DA_FATTURARE internamente) */
    items: FatturabileBillingItem[];
}

// ─── Costanti ─────────────────────────────────────────────────────────────────

const CONDIZIONI_PAG_OPTIONS = [
    { value: 'TP02', label: 'TP02 – Pagamento completo' },
    { value: 'TP01', label: 'TP01 – Pagamento a rate' },
    { value: 'TP03', label: 'TP03 – Anticipo' },
];

const MODALITA_PAG_OPTIONS = [
    { value: 'MP05', label: 'MP05 – Bonifico' },
    { value: 'MP02', label: 'MP02 – Assegno' },
    { value: 'MP08', label: 'MP08 – Carta di pagamento' },
    { value: 'MP01', label: 'MP01 – Contanti' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatEuro = (n: number) =>
    n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ─── Component ────────────────────────────────────────────────────────────────

const FatturaModal: React.FC<FatturaModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    companyId,
    companyName,
    items,
}) => {
    const { showToast } = useToast();
    const { entiEmittenti, fetchEntiEmittenti, creaFatturaBozza, emettiFattura } = useFatturazione();

    // Solo i movimenti DA_FATTURARE (CONFERMATO senza fattura)
    const daFatturareItems = useMemo(
        () => items.filter(i => i.computedStatus === 'DA_FATTURARE'),
        [items]
    );

    // ── State form ────────────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [enteEmittenteId, setEnteEmittenteId] = useState<string>('');
    const [tipoDocumento, setTipoDocumento] = useState<'FATTURA' | 'ACCONTO'>('FATTURA');
    const [accontoImporto, setAccontoImporto] = useState<string>('');
    const [condizioniPagamento, setCondizioniPagamento] = useState<string>('TP02');
    const [modalitaPagamento, setModalitaPagamento] = useState<string>('MP08');
    const [iban, setIban] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    // Init alla apertura del modal
    useEffect(() => {
        if (!isOpen) return;
        fetchEntiEmittenti();
        setSelectedIds(new Set(daFatturareItems.map(i => i.id)));
        setTipoDocumento('FATTURA');
        setAccontoImporto('');
        setNote('');
        setIban('');
        setCondizioniPagamento('TP02');
        setModalitaPagamento('MP08');
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-select ente default
    useEffect(() => {
        if (entiEmittenti.length === 0 || enteEmittenteId) return;
        const defaultEnte =
            entiEmittenti.find(e => e.isDefault && e.isActive) ??
            entiEmittenti.find(e => e.isActive);
        if (defaultEnte) setEnteEmittenteId(defaultEnte.id);
    }, [entiEmittenti, enteEmittenteId]);

    // ── Calcoli ───────────────────────────────────────────────────────────────

    const selectedItems = useMemo(
        () => daFatturareItems.filter(i => selectedIds.has(i.id)),
        [daFatturareItems, selectedIds]
    );

    const totaleSelezionato = useMemo(
        () => selectedItems.reduce((sum, i) => sum + i.importoLordo, 0),
        [selectedItems]
    );

    const totaleNetto = useMemo(
        () => selectedItems.reduce((sum, i) => sum + i.importoNetto, 0),
        [selectedItems]
    );

    const accontoNum = parseFloat(accontoImporto) || 0;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const toggleItem = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === daFatturareItems.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(daFatturareItems.map(i => i.id)));
        }
    };

    const handleSubmit = useCallback(async (emit: boolean) => {
        if (!enteEmittenteId) {
            showToast({ type: 'error', message: 'Seleziona un ente emittente' });
            return;
        }
        if (selectedIds.size === 0) {
            showToast({ type: 'error', message: 'Seleziona almeno un movimento da fatturare' });
            return;
        }
        if (tipoDocumento === 'ACCONTO') {
            if (!accontoNum || accontoNum <= 0) {
                showToast({ type: 'error', message: 'Inserisci un importo acconto valido' });
                return;
            }
            if (accontoNum > totaleSelezionato) {
                showToast({
                    type: 'error',
                    message: `L'acconto (${formatEuro(accontoNum)}) non può superare il totale (${formatEuro(totaleSelezionato)})`,
                });
                return;
            }
        }

        setSubmitting(true);
        try {
            let linee: CreaBozzaInput['linee'];

            if (tipoDocumento === 'ACCONTO') {
                linee = [{
                    descrizione: `Acconto fatturabile – ${companyName}`,
                    quantita: 1,
                    prezzoUnitario: accontoNum,
                    aliquotaIva: 22,
                }];
            } else {
                linee = selectedItems.map(item => ({
                    descrizione: item.description,
                    quantita: 1,
                    prezzoUnitario: item.importoNetto,
                    aliquotaIva: item.aliquotaIva,
                    ...(item.aliquotaIva === 0 ? { natura: 'N4' } : {}),
                }));
            }

            const input: CreaBozzaInput = {
                enteEmittenteId,
                tipoDocumento,
                tipoServizio: 'ALTRO',
                clienteType: 'AZIENDA',
                clienteAziendaId: companyId,
                condizioniPagamento,
                modalitaPagamento,
                ...(iban ? { iban } : {}),
                ...(note ? { note } : {}),
                linee,
                // Collega i movimenti selezionati alla fattura (backend setta fatturaElettronicaId)
                // Per ACCONTO: collega tutti i movimenti — l'acconto copre parzialmente il totale
                sourceMovimentoIds: Array.from(selectedIds),
            };

            const fattura = await creaFatturaBozza(input);

            if (emit) {
                await emettiFattura(fattura.id);
                showToast({ type: 'success', message: `Fattura n. ${fattura.numero} emessa con successo` });
            } else {
                showToast({ type: 'success', message: `Bozza n. ${fattura.numero} creata con successo` });
            }

            onSuccess();
            onClose();
        } catch (err: unknown) {
            const message = 'Errore nella creazione della fattura';
            showToast({ type: 'error', message });
        } finally {
            setSubmitting(false);
        }
    }, [
        enteEmittenteId, selectedIds, tipoDocumento, accontoNum, totaleSelezionato,
        selectedItems, companyId, companyName, condizioniPagamento, modalitaPagamento,
        iban, note, creaFatturaBozza, emettiFattura, onSuccess, onClose, showToast,
    ]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Emetti Fattura</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{companyName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                        aria-label="Chiudi"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* ── Body ───────────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {daFatturareItems.length === 0 ? (
                        <div className="text-center py-10">
                            <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Nessun movimento da fatturare disponibile.
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Conferma i movimenti prima di emettere una fattura.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Ente Emittente */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Ente emittente <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={enteEmittenteId}
                                    onChange={e => setEnteEmittenteId(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Seleziona ente emittente...</option>
                                    {entiEmittenti.filter(e => e.isActive).map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.denominazione}{e.label ? ` (${e.label})` : ''}{e.isDefault ? ' ★' : ''}
                                        </option>
                                    ))}
                                </select>
                                {entiEmittenti.length === 0 && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        Nessun ente emittente configurato. Configurare in Fatturazione → Enti Emittenti.
                                    </p>
                                )}
                            </div>

                            {/* Tipo documento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Tipo documento
                                </label>
                                <div className="flex gap-2">
                                    {(['FATTURA', 'ACCONTO'] as const).map(tipo => (
                                        <button
                                            key={tipo}
                                            onClick={() => setTipoDocumento(tipo)}
                                            className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${tipoDocumento === tipo
                                                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                                                }`}
                                        >
                                            {tipo === 'FATTURA' ? '🧾 Fattura' : '💰 Acconto'}
                                        </button>
                                    ))}
                                </div>
                                {tipoDocumento === 'ACCONTO' && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                        Un acconto è un pagamento parziale anticipato. Verrà emessa una fattura di acconto separata dalle fatture definitive.
                                    </p>
                                )}
                            </div>

                            {/* Lista movimenti selezionabili */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Movimenti da includere
                                        <span className="ml-1.5 text-xs text-gray-400">
                                            ({selectedIds.size}/{daFatturareItems.length})
                                        </span>
                                    </label>
                                    <button
                                        onClick={toggleAll}
                                        className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                                    >
                                        {selectedIds.size === daFatturareItems.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                                    </button>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700/50 max-h-52 overflow-y-auto">
                                    {daFatturareItems.map(item => {
                                        const checked = selectedIds.has(item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => toggleItem(item.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${checked ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''
                                                    }`}
                                            >
                                                {checked
                                                    ? <CheckSquare className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                                                    : <Square className="h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                                }
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-sm text-gray-900 dark:text-gray-100 truncate">
                                                        {item.description}
                                                    </span>
                                                    <span className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(item.dataEsecuzione)}
                                                        {item.personName && (
                                                            <><span>·</span><User className="h-3 w-3" />{item.personName}</>
                                                        )}
                                                    </span>
                                                </span>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {formatEuro(item.importoLordo)}
                                                    </span>
                                                    {item.aliquotaIva > 0 && (
                                                        <span className="block text-xs text-gray-400 dark:text-gray-500">
                                                            {formatEuro(item.importoNetto)} + {item.aliquotaIva}%
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Riepilogo totale selezionato */}
                            {selectedItems.length > 0 && (
                                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-lg px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                                        <Euro className="h-4 w-4" />
                                        <span className="text-sm font-medium">
                                            {selectedItems.length} moviment{selectedItems.length !== 1 ? 'i' : 'o'} selezionat{selectedItems.length !== 1 ? 'i' : 'o'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-lg font-bold text-teal-700 dark:text-teal-300">
                                            {formatEuro(totaleSelezionato)}
                                        </span>
                                        {totaleNetto !== totaleSelezionato && (
                                            <span className="text-xs text-teal-500 dark:text-teal-400">
                                                Netto {formatEuro(totaleNetto)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Importo acconto (visibile solo per ACCONTO) */}
                            {tipoDocumento === 'ACCONTO' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Importo acconto (€) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        max={totaleSelezionato}
                                        value={accontoImporto}
                                        onChange={e => setAccontoImporto(e.target.value)}
                                        placeholder={`Massimo ${formatEuro(totaleSelezionato)}`}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                    {accontoNum > 0 && accontoNum <= totaleSelezionato && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Residuo dopo acconto: <strong>{formatEuro(totaleSelezionato - accontoNum)}</strong>
                                        </p>
                                    )}
                                    {accontoNum > totaleSelezionato && (
                                        <p className="text-xs text-red-500 mt-1">
                                            L'acconto supera il totale selezionato.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Dati pagamento */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                        Condizioni pagamento
                                    </label>
                                    <select
                                        value={condizioniPagamento}
                                        onChange={e => setCondizioniPagamento(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        {CONDIZIONI_PAG_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                        Modalità pagamento
                                    </label>
                                    <select
                                        value={modalitaPagamento}
                                        onChange={e => setModalitaPagamento(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        {MODALITA_PAG_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                    IBAN (opzionale)
                                </label>
                                <input
                                    type="text"
                                    value={iban}
                                    onChange={e => setIban(e.target.value.toUpperCase())}
                                    placeholder="IT60 X054 2811 1010 0000 0123 456"
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                    Note (opzionale)
                                </label>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    rows={2}
                                    placeholder="Note aggiuntive per la fattura..."
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 rounded-b-xl">
                    <CRUDButton onClick={onClose} disabled={submitting}>
                        Annulla
                    </CRUDButton>

                    {daFatturareItems.length > 0 && (
                        <div className="flex items-center gap-2">
                            <CRUDButton
                                onClick={() => handleSubmit(false)}
                                disabled={submitting || selectedIds.size === 0 || !enteEmittenteId}
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1 inline" />
                                ) : null}
                                Crea Bozza
                            </CRUDButton>
                            <CRUDPrimaryButton
                                onClick={() => handleSubmit(true)}
                                disabled={submitting || selectedIds.size === 0 || !enteEmittenteId}
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1 inline" />
                                ) : (
                                    <Send className="h-4 w-4 mr-1 inline" />
                                )}
                                Emetti Subito
                            </CRUDPrimaryButton>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FatturaModal;
