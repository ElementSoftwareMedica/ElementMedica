/**
 * ConsensiPage — Gestione moduli consenso firma tablet
 *
 * Permette di personalizzare i testi dei consensi presentati al paziente
 * sul tablet prima della visita (GDPR, dati sanitari, prestazione, ecc.)
 *
 * Route: /poliambulatorio/impostazioni/consensi-firma
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Shield,
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
    ChevronLeft,
    Loader2,
    X,
    Save,
    CheckCircle,
    AlertCircle,
    Info,
    ToggleLeft,
    ToggleRight,
    Tag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { CRUDButton, CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { apiGet, apiPost, apiPut, apiDelete } from '@/services/api';

// ============================================================
// TYPES
// ============================================================

interface ConsensoModulo {
    id: string | null;
    codice: string;
    titolo: string;
    sottotitolo?: string | null;
    testo: string;
    obbligatorio: boolean;
    attivo: boolean;
    ordine: number;
    validitaGiorni: number | null;
    prestazioniIds: string[];
    isDefault: boolean;
}

const BASE = '/api/v1/clinica/impostazioni/consensi-moduli';

// ============================================================
// FORM MODAL
// ============================================================

interface FormProps {
    modulo: Partial<ConsensoModulo> | null;
    onClose: () => void;
    onSaved: () => void;
}

const CODICI_DEFAULT = ['gdpr', 'sanitari', 'prestazione', 'chirurgico', 'marketing', 'comunicazioni', 'fse_alimentazione', 'fse_consultazione', 'fse_pregresso', 'mdl_sorveglianza'];

const ModuloForm: React.FC<FormProps> = ({ modulo, onClose, onSaved }) => {
    const { showToast } = useToast();
    const isEdit = !!modulo?.id;

    const [form, setForm] = useState({
        codice: modulo?.codice ?? '',
        titolo: modulo?.titolo ?? '',
        sottotitolo: modulo?.sottotitolo ?? '',
        testo: modulo?.testo ?? '',
        obbligatorio: modulo?.obbligatorio ?? false,
        attivo: modulo?.attivo ?? true,
        ordine: modulo?.ordine ?? 0,
        validitaGiorni: modulo?.validitaGiorni ?? '',
        prestazioniIds: modulo?.prestazioniIds ?? [],
    });
    const [saving, setSaving] = useState(false);

    // Fetch prestazioni disponibili per associazione
    const { data: prestazioniData } = useQuery<{ data: Array<{ id: string; nome: string; tipo?: string }> }>({
        queryKey: ['prestazioni-list-consensi'],
        queryFn: () => apiGet('/api/v1/clinica/prestazioni?limit=200&attivo=true'),
    });
    const prestazioni = prestazioniData?.data ?? [];

    const togglePrestazione = (id: string) => {
        setForm(f => ({
            ...f,
            prestazioniIds: f.prestazioniIds.includes(id)
                ? f.prestazioniIds.filter(p => p !== id)
                : [...f.prestazioniIds, id],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.codice.trim() || !form.titolo.trim() || !form.testo.trim()) {
            showToast({ message: 'Compilare codice, titolo e testo.', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                validitaGiorni: form.validitaGiorni !== '' ? Number(form.validitaGiorni) : null,
            };
            if (isEdit) {
                await apiPut(`${BASE}/${modulo!.id}`, payload);
            } else {
                await apiPost(BASE, payload);
            }
            showToast({ message: isEdit ? 'Modulo aggiornato.' : 'Modulo creato.', type: 'success' });
            onSaved();
            onClose();
        } catch {
            showToast({ message: 'Impossibile salvare il modulo.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEdit ? 'Modifica Modulo Consenso' : 'Nuovo Modulo Consenso'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Codice identificativo *
                            </label>
                            <input
                                type="text"
                                value={form.codice}
                                onChange={e => setForm(f => ({ ...f, codice: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                                disabled={isEdit}
                                placeholder="es. gdpr, sanitari, personalizzato"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ordine visualizzazione
                            </label>
                            <input
                                type="number"
                                value={form.ordine}
                                onChange={e => setForm(f => ({ ...f, ordine: Number(e.target.value) }))}
                                min={0}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titolo *
                        </label>
                        <input
                            type="text"
                            value={form.titolo}
                            onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))}
                            placeholder="es. Consenso al trattamento dei dati personali"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sottotitolo (facoltativo)
                        </label>
                        <input
                            type="text"
                            value={form.sottotitolo ?? ''}
                            onChange={e => setForm(f => ({ ...f, sottotitolo: e.target.value }))}
                            placeholder="es. Artt. 13–14 del Regolamento UE 2016/679"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Testo del consenso *
                        </label>
                        <textarea
                            value={form.testo}
                            onChange={e => setForm(f => ({ ...f, testo: e.target.value }))}
                            rows={10}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Validità firma (giorni)
                            </label>
                            <input
                                type="number"
                                value={form.validitaGiorni}
                                onChange={e => setForm(f => ({ ...f, validitaGiorni: e.target.value }))}
                                placeholder="Vuoto = sempre obbligatorio"
                                min={1}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Se impostato, il consenso verrà ri-chiesto dopo N giorni dall'ultima firma.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 justify-center">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setForm(f => ({ ...f, obbligatorio: !f.obbligatorio }))}>
                                <button
                                    type="button"
                                    className="text-teal-600 hover:text-teal-700 transition-colors"
                                >
                                    {form.obbligatorio
                                        ? <ToggleRight className="h-6 w-6" />
                                        : <ToggleLeft className="h-6 w-6 text-gray-400" />
                                    }
                                </button>
                                <span className="text-sm font-medium text-gray-700">Obbligatorio</span>
                            </div>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setForm(f => ({ ...f, attivo: !f.attivo }))}>
                                <button
                                    type="button"
                                    className="text-teal-600 hover:text-teal-700 transition-colors"
                                >
                                    {form.attivo
                                        ? <ToggleRight className="h-6 w-6" />
                                        : <ToggleLeft className="h-6 w-6 text-gray-400" />
                                    }
                                </button>
                                <span className="text-sm font-medium text-gray-700">Attivo</span>
                            </div>
                        </div>
                    </div>

                    {/* Prestazioni specifiche */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-teal-600" />
                            Richiedi solo per queste prestazioni
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            Se lasciato vuoto, il modulo viene proposto per tutte le prestazioni.
                            Se si selezionano delle prestazioni, verrà aggiunto automaticamente al consenso solo per quelle specifiche.
                        </p>
                        {prestazioni.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Nessuna prestazione trovata o caricamento in corso…</p>
                        ) : (
                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                                {prestazioni.map(p => (
                                    <label key={p.id} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={form.prestazioniIds.includes(p.id)}
                                            onChange={() => togglePrestazione(p.id)}
                                            className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <span className="text-sm text-gray-700">{p.nome}</span>
                                        {p.tipo && <span className="text-xs text-gray-400">· {p.tipo}</span>}
                                    </label>
                                ))}
                            </div>
                        )}
                        {form.prestazioniIds.length > 0 && (
                            <p className="text-xs text-teal-600 mt-1.5">
                                {form.prestazioniIds.length} {form.prestazioniIds.length === 1 ? 'prestazione selezionata' : 'prestazioni selezionate'}
                            </p>
                        )}
                    </div>
                </form>

                <div className="flex items-center justify-end gap-3 p-5 border-t">
                    <CRUDButton onClick={onClose} disabled={saving}>
                        Annulla
                    </CRUDButton>
                    <CRUDPrimaryButton onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        {isEdit ? 'Salva modifiche' : 'Crea modulo'}
                    </CRUDPrimaryButton>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// MAIN PAGE
// ============================================================

const ConsensiPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { confirm } = useConfirmDialog();
    const queryClient = useQueryClient();

    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<ConsensoModulo | null>(null);

    const { data: moduli = [], isLoading, isError } = useQuery<ConsensoModulo[]>({
        queryKey: ['consensi-moduli'],
        queryFn: () =>
            apiGet<{ success: boolean; data: ConsensoModulo[] }>(BASE)
                .then(res => res.data),
    });

    const toggleAttivo = useMutation({
        mutationFn: (m: ConsensoModulo) => {
            if (!m.id) {
                // Modulo ancora solo in-memory (default): prima salvalo
                return apiPost<{ success: boolean; data: ConsensoModulo }>(BASE, { ...m, attivo: !m.attivo })
                    .then(res => res.data);
            }
            return apiPut<{ success: boolean; data: ConsensoModulo }>(`${BASE}/${m.id}`, { attivo: !m.attivo })
                .then(res => res.data);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consensi-moduli'] }),
        onError: () => showToast({ message: 'Impossibile aggiornare il modulo.', type: 'error' }),
    });

    const toggleObbligatorio = useMutation({
        mutationFn: (m: ConsensoModulo) => {
            if (!m.id) {
                return apiPost<{ success: boolean; data: ConsensoModulo }>(BASE, { ...m, obbligatorio: !m.obbligatorio })
                    .then(res => res.data);
            }
            return apiPut<{ success: boolean; data: ConsensoModulo }>(`${BASE}/${m.id}`, { obbligatorio: !m.obbligatorio })
                .then(res => res.data);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consensi-moduli'] }),
        onError: () => showToast({ message: 'Impossibile aggiornare il modulo.', type: 'error' }),
    });

    const resetDefault = useMutation({
        mutationFn: (codice: string) =>
            apiPost(`${BASE}/reset/${codice}`, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consensi-moduli'] });
            showToast({ message: 'Modulo ripristinato al testo di default.', type: 'success' });
        },
        onError: () => showToast({ message: 'Impossibile ripristinare il modulo.', type: 'error' }),
    });

    const deleteModulo = useMutation({
        mutationFn: (id: string) => apiDelete(`${BASE}/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consensi-moduli'] });
            showToast({ message: 'Modulo eliminato.', type: 'success' });
        },
        onError: () => showToast({ message: 'Impossibile eliminare il modulo.', type: 'error' }),
    });

    const handleEdit = (m: ConsensoModulo) => {
        setEditTarget(m);
        setFormOpen(true);
    };

    const handleNew = () => {
        setEditTarget(null);
        setFormOpen(true);
    };

    const handleDelete = async (m: ConsensoModulo) => {
        if (!m.id) return; // Default only in memory — nothing to delete
        const ok = await confirm({
            title: 'Elimina modulo consenso',
            message: `Eliminare il modulo "${m.titolo}"? L'operazione non può essere annullata.`,
            confirmLabel: 'Elimina',
            variant: 'danger',
        });
        if (ok) deleteModulo.mutate(m.id);
    };

    const handleReset = async (m: ConsensoModulo) => {
        const ok = await confirm({
            title: 'Ripristina testo di default',
            message: `Ripristinare il testo originale del modulo "${m.titolo}"? Le tue personalizzazioni verranno perse.`,
            confirmLabel: 'Ripristina',
            variant: 'warning',
        });
        if (ok) resetDefault.mutate(m.codice);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/poliambulatorio/impostazioni')}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Impostazioni
                </button>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="h-7 w-7 text-teal-600" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Consensi Firma Tablet</h1>
                            <p className="text-sm text-gray-500">
                                Personalizza i testi dei consensi informativi presentati al paziente sul tablet
                            </p>
                        </div>
                    </div>
                    <CRUDPrimaryButton onClick={handleNew}>
                        <Plus className="h-4 w-4 mr-1" />
                        Nuovo modulo
                    </CRUDPrimaryButton>
                </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-700">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                    I moduli senza personalizzazioni (badge <span className="font-semibold">Default</span>) usano i testi standard.
                    Modificando un modulo verrà creata una versione personalizzata per questo tenant.
                    È sempre possibile ripristinare il testo originale con il pulsante <RotateCcw className="h-3 w-3 inline" />.
                </p>
            </div>

            {/* Content */}
            {isLoading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                </div>
            )}

            {isError && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>Impossibile caricare i moduli. Verificare la connessione con il server.</p>
                </div>
            )}

            {!isLoading && !isError && (
                <div className="space-y-3">
                    {moduli.map((m) => (
                        <div
                            key={m.codice}
                            className={`bg-white rounded-lg border transition-colors p-4 ${m.attivo ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="font-medium text-gray-900">{m.titolo}</span>

                                        {m.isDefault && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                Default
                                            </span>
                                        )}
                                        {!m.isDefault && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                                                Personalizzato
                                            </span>
                                        )}
                                        {m.obbligatorio && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                                                Obbligatorio
                                            </span>
                                        )}
                                        {!m.attivo && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                                                Disattivato
                                            </span>
                                        )}
                                        {m.validitaGiorni && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                                                Valido {m.validitaGiorni} gg
                                            </span>
                                        )}
                                        {m.prestazioniIds && m.prestazioniIds.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 flex items-center gap-1">
                                                <Tag className="h-2.5 w-2.5" />
                                                {m.prestazioniIds.length} {m.prestazioniIds.length === 1 ? 'prestazione' : 'prestazioni'}
                                            </span>
                                        )}
                                    </div>
                                    {m.sottotitolo && (
                                        <p className="text-xs text-gray-400 mb-2">{m.sottotitolo}</p>
                                    )}
                                    <p className="text-sm text-gray-500 line-clamp-2 font-mono whitespace-pre-wrap">
                                        {m.testo.substring(0, 150)}{m.testo.length > 150 ? '…' : ''}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">codice: <code className="bg-gray-100 px-1 rounded">{m.codice}</code></p>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {/* Toggle obbligatorio */}
                                    <button
                                        onClick={() => toggleObbligatorio.mutate(m)}
                                        disabled={toggleObbligatorio.isPending}
                                        title={m.obbligatorio ? 'Rendi facoltativo' : 'Rendi obbligatorio'}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        {m.obbligatorio
                                            ? <CheckCircle className="h-4 w-4 text-red-500" />
                                            : <CheckCircle className="h-4 w-4" />
                                        }
                                    </button>

                                    {/* Toggle attivo */}
                                    <button
                                        onClick={() => toggleAttivo.mutate(m)}
                                        disabled={toggleAttivo.isPending}
                                        title={m.attivo ? 'Disattiva' : 'Attiva'}
                                        className="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                    >
                                        {m.attivo
                                            ? <ToggleRight className="h-4 w-4 text-teal-600" />
                                            : <ToggleLeft className="h-4 w-4" />
                                        }
                                    </button>

                                    {/* Edit */}
                                    <button
                                        onClick={() => handleEdit(m)}
                                        title="Modifica"
                                        className="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>

                                    {/* Reset to default (only for non-default that have an id) */}
                                    {!m.isDefault && m.id && ['gdpr', 'sanitari', 'prestazione', 'chirurgico'].includes(m.codice) && (
                                        <button
                                            onClick={() => handleReset(m)}
                                            title="Ripristina testo default"
                                            className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </button>
                                    )}

                                    {/* Delete (only custom non-default modules) */}
                                    {m.id && !['gdpr', 'sanitari', 'prestazione', 'chirurgico'].includes(m.codice) && (
                                        <button
                                            onClick={() => handleDelete(m)}
                                            title="Elimina"
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {moduli.length === 0 && (
                        <div className="text-center py-12">
                            <Shield className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400">Nessun modulo trovato.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Form Modal */}
            {formOpen && (
                <ModuloForm
                    modulo={editTarget}
                    onClose={() => { setFormOpen(false); setEditTarget(null); }}
                    onSaved={() => queryClient.invalidateQueries({ queryKey: ['consensi-moduli'] })}
                />
            )}
        </div>
    );
};

export default ConsensiPage;
