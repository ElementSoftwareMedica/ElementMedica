/**
 * MalattieProfessionaliTab
 * Lista e gestione malattie professionali per persona
 * D.Lgs 81/08 Art. 40 - Obblighi del Medico Competente
 *
 * @module components/clinica/MalattieProfessionaliTab
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Edit2,
    Trash2,
    Loader2,
    AlertTriangle,
    FileText,
} from 'lucide-react';
import {
    malattieProfessionaliApi,
    type MalattiaProfessionale,
    type MalattiaProfessionaleCreateInput,
    type MalattiaProfessionaleUpdateInput,
    type TipologiaMalattiaProfessionale,
    type EsitoMalattiaProfessionale,
} from '@/services/clinicaApi';
import { useToast } from '@/hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';

interface MalattieProfessionaliTabProps {
    personId: string;
    companyTenantProfileId?: string;
    isReadonly?: boolean;
}

const TIPOLOGIA_LABELS: Record<TipologiaMalattiaProfessionale, string> = {
    SOSPETTA: 'Sospetta',
    ACCERTATA: 'Accertata',
};

const ESITO_LABELS: Record<EsitoMalattiaProfessionale, string> = {
    IN_ACCERTAMENTO: 'In accertamento',
    RICONOSCIUTA: 'Riconosciuta',
    NON_RICONOSCIUTA: 'Non riconosciuta',
};

const TIPOLOGIA_COLORS: Record<TipologiaMalattiaProfessionale, string> = {
    SOSPETTA: 'bg-amber-100 text-amber-700',
    ACCERTATA: 'bg-red-100 text-red-700',
};

const ESITO_COLORS: Record<EsitoMalattiaProfessionale, string> = {
    IN_ACCERTAMENTO: 'bg-gray-100 text-gray-600',
    RICONOSCIUTA: 'bg-red-100 text-red-700',
    NON_RICONOSCIUTA: 'bg-green-100 text-green-700',
};

type FormData = {
    codiceNosologico: string;
    denominazione: string;
    dataDiagnosi: string;
    dataNotificaINAIL: string;
    agenteCausale: string;
    tipologia: TipologiaMalattiaProfessionale;
    esito: EsitoMalattiaProfessionale;
    note: string;
};

const emptyForm = (): FormData => ({
    codiceNosologico: '',
    denominazione: '',
    dataDiagnosi: '',
    dataNotificaINAIL: '',
    agenteCausale: '',
    tipologia: 'SOSPETTA',
    esito: 'IN_ACCERTAMENTO',
    note: '',
});

export const MalattieProfessionaliTab: React.FC<MalattieProfessionaliTabProps> = ({
    personId,
    companyTenantProfileId,
    isReadonly = false,
}) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirm: confirmDialog } = useConfirmDialog();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>(emptyForm());

    const { data: malattie, isLoading } = useQuery({
        queryKey: ['malattie-professionali', personId],
        queryFn: () => malattieProfessionaliApi.getByPerson(personId),
        enabled: !!personId,
        staleTime: 60_000,
    });

    const createMutation = useMutation({
        mutationFn: (data: MalattiaProfessionaleCreateInput) =>
            malattieProfessionaliApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['malattie-professionali', personId] });
            showToast({ message: 'Malattia professionale registrata', type: 'success' });
            resetForm();
        },
        onError: () => {
            showToast({ message: 'Errore nella registrazione', type: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: MalattiaProfessionaleUpdateInput }) =>
            malattieProfessionaliApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['malattie-professionali', personId] });
            showToast({ message: 'Malattia professionale aggiornata', type: 'success' });
            resetForm();
        },
        onError: () => {
            showToast({ message: 'Errore nell\'aggiornamento', type: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => malattieProfessionaliApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['malattie-professionali', personId] });
            showToast({ message: 'Malattia professionale eliminata', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Errore nell\'eliminazione', type: 'error' });
        },
    });

    const resetForm = () => {
        setForm(emptyForm());
        setShowForm(false);
        setEditingId(null);
    };

    const startEdit = (mp: MalattiaProfessionale) => {
        setForm({
            codiceNosologico: mp.codiceNosologico || '',
            denominazione: mp.denominazione,
            dataDiagnosi: mp.dataDiagnosi?.split('T')[0] || '',
            dataNotificaINAIL: mp.dataNotificaINAIL?.split('T')[0] || '',
            agenteCausale: mp.agenteCausale || '',
            tipologia: mp.tipologia,
            esito: mp.esito,
            note: mp.note || '',
        });
        setEditingId(mp.id);
        setShowForm(true);
    };

    const handleSubmit = () => {
        if (!form.denominazione || !form.dataDiagnosi) {
            showToast({ message: 'Denominazione e data diagnosi sono obbligatorie', type: 'error' });
            return;
        }

        if (editingId) {
            updateMutation.mutate({
                id: editingId,
                data: {
                    codiceNosologico: form.codiceNosologico || undefined,
                    denominazione: form.denominazione,
                    dataDiagnosi: form.dataDiagnosi,
                    dataNotificaINAIL: form.dataNotificaINAIL || undefined,
                    agenteCausale: form.agenteCausale || undefined,
                    tipologia: form.tipologia,
                    esito: form.esito,
                    note: form.note || undefined,
                },
            });
        } else {
            if (!companyTenantProfileId) {
                showToast({ message: 'Profilo aziendale non disponibile', type: 'error' });
                return;
            }
            createMutation.mutate({
                personId,
                companyTenantProfileId,
                codiceNosologico: form.codiceNosologico || undefined,
                denominazione: form.denominazione,
                dataDiagnosi: form.dataDiagnosi,
                dataNotificaINAIL: form.dataNotificaINAIL || undefined,
                agenteCausale: form.agenteCausale || undefined,
                tipologia: form.tipologia,
                esito: form.esito,
                note: form.note || undefined,
            });
        }
    };

    const handleDelete = async (mp: MalattiaProfessionale) => {
        const confirmed = await confirmDialog({
            title: 'Conferma eliminazione',
            message: `Eliminare la malattia professionale "${mp.denominazione}"?`,
            variant: 'danger'
        });
        if (confirmed) {
            deleteMutation.mutate(mp.id);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
            </div>
        );
    }

    const list = malattie || [];

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Malattie Professionali ({list.length})
                </p>
                {!isReadonly && !showForm && (
                    <button
                        onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true); }}
                        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                        <Plus className="w-3 h-3" />
                        Aggiungi
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2.5">
                    <p className="text-xs font-semibold text-gray-600">
                        {editingId ? 'Modifica malattia professionale' : 'Nuova malattia professionale'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">Denominazione *</label>
                            <input
                                type="text"
                                value={form.denominazione}
                                onChange={e => setForm(f => ({ ...f, denominazione: e.target.value }))}
                                placeholder="es. Ipoacusia da rumore"
                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">Codice ICD-10</label>
                            <input
                                type="text"
                                value={form.codiceNosologico}
                                onChange={e => setForm(f => ({ ...f, codiceNosologico: e.target.value }))}
                                placeholder="es. H83.3"
                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">Data diagnosi *</label>
                            <DatePickerElegante
                                value={form.dataDiagnosi}
                                onChange={(date) => setForm(f => ({ ...f, dataDiagnosi: date ? date.toISOString().split('T')[0] : '' }))}
                                label=""
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">Data notifica INAIL</label>
                            <DatePickerElegante
                                value={form.dataNotificaINAIL}
                                onChange={(date) => setForm(f => ({ ...f, dataNotificaINAIL: date ? date.toISOString().split('T')[0] : '' }))}
                                label=""
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Agente causale</label>
                        <input
                            type="text"
                            value={form.agenteCausale}
                            onChange={e => setForm(f => ({ ...f, agenteCausale: e.target.value }))}
                            placeholder="es. Esposizione a rumore >85dB"
                            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">Tipologia</label>
                            <select
                                value={form.tipologia}
                                onChange={e => setForm(f => ({ ...f, tipologia: e.target.value as TipologiaMalattiaProfessionale }))}
                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400"
                            >
                                {Object.entries(TIPOLOGIA_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">Esito</label>
                            <select
                                value={form.esito}
                                onChange={e => setForm(f => ({ ...f, esito: e.target.value as EsitoMalattiaProfessionale }))}
                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400"
                            >
                                {Object.entries(ESITO_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Note</label>
                        <textarea
                            value={form.note}
                            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                            rows={2}
                            placeholder="Note aggiuntive..."
                            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400 resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                        >
                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                            {editingId ? 'Aggiorna' : 'Registra'}
                        </button>
                        <button
                            onClick={resetForm}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Annulla
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            {list.length === 0 && !showForm ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
                    <AlertTriangle className="w-6 h-6 opacity-25" />
                    <p className="text-xs">Nessuna malattia professionale registrata</p>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {list.map(mp => (
                        <div
                            key={mp.id}
                            className="flex items-start gap-2 p-2 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-medium text-gray-800 truncate">
                                        {mp.denominazione}
                                    </span>
                                    {mp.codiceNosologico && (
                                        <span className="text-[10px] text-gray-400 font-mono">
                                            ICD-10: {mp.codiceNosologico}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TIPOLOGIA_COLORS[mp.tipologia]}`}>
                                        {TIPOLOGIA_LABELS[mp.tipologia]}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ESITO_COLORS[mp.esito]}`}>
                                        {ESITO_LABELS[mp.esito]}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        Diagnosi: {new Date(mp.dataDiagnosi).toLocaleDateString('it-IT')}
                                    </span>
                                    {mp.dataNotificaINAIL && (
                                        <span className="text-[10px] text-gray-400">
                                            INAIL: {new Date(mp.dataNotificaINAIL).toLocaleDateString('it-IT')}
                                        </span>
                                    )}
                                </div>
                                {mp.agenteCausale && (
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                        Agente: {mp.agenteCausale}
                                    </p>
                                )}
                            </div>
                            {!isReadonly && (
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => startEdit(mp)}
                                        className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
                                        title="Modifica"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(mp)}
                                        disabled={deleteMutation.isPending}
                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                        title="Elimina"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MalattieProfessionaliTab;
