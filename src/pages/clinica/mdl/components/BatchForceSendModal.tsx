/**
 * BatchForceSendModal — Invio sicuro forzato dei giudizi non inviati
 *
 * Permette di:
 *  - vedere tutti i giudizi validi non ancora inviati, raggruppati per azienda
 *  - selezionare/deselezionare singoli giudizi o intere aziende (select-all)
 *  - scegliere il destinatario: solo azienda, solo dipendente o entrambi
 *
 * Invio (gestito dal backend):
 *  - Dipendente: ZIP/PDF protetto da password via email + password via WhatsApp
 *  - Azienda: ZIP protetto da password via PEC + password nella PEC stessa
 */

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    X, Send, Loader2, Building2, Users, UserCheck, CheckSquare, Square
} from 'lucide-react';
import { clinicaApi, type GiudizioIdoneita } from '../../../../services/clinicaApi';
import { useToast } from '../../../../hooks/useToast';
import { CRUDPrimaryButton } from '../../../../components/shared/CRUDButton';

type RecipientType = 'both' | 'worker' | 'employer';

interface BatchForceSendModalProps {
    open: boolean;
    giudizi: GiudizioIdoneita[];
    /** Risolve il nome azienda da un giudizio (stessa logica della pagina) */
    getAzienda: (g: GiudizioIdoneita) => string;
    onClose: () => void;
    onSuccess: () => void;
}

const BatchForceSendModal: React.FC<BatchForceSendModalProps> = ({
    open, giudizi, getAzienda, onClose, onSuccess
}) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [recipientType, setRecipientType] = useState<RecipientType>('both');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Giudizi validi non completamente inviati
    const pending = useMemo(
        () => giudizi.filter(g => g.stato === 'VALIDO' && (!g.notificatoLavoratore || !g.notificatoDatoreLavoro)),
        [giudizi]
    );

    // Raggruppa per azienda
    const byAzienda = useMemo(() => {
        const groups: Record<string, GiudizioIdoneita[]> = {};
        for (const g of pending) {
            const az = getAzienda(g) || 'Senza azienda';
            (groups[az] ||= []).push(g);
        }
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [pending, getAzienda]);

    // Inizializza selezione = tutti, quando si apre
    React.useEffect(() => {
        if (open) setSelectedIds(new Set(pending.map(g => g.id)));
    }, [open, pending]);

    const allSelected = pending.length > 0 && selectedIds.size === pending.length;

    const toggleAll = () => {
        setSelectedIds(allSelected ? new Set() : new Set(pending.map(g => g.id)));
    };
    const toggleOne = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const toggleAzienda = (list: GiudizioIdoneita[]) => {
        const ids = list.map(g => g.id);
        const allOn = ids.every(id => selectedIds.has(id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => allOn ? next.delete(id) : next.add(id));
            return next;
        });
    };

    const sendMutation = useMutation({
        mutationFn: () => clinicaApi.giudiziIdoneita.batchSecureSend({
            giudizioIds: Array.from(selectedIds),
            recipientType
        }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
            showToast({
                type: 'success',
                message: `Invio completato: ${data.inviati} inviati${data.saltati ? `, ${data.saltati} saltati (no contatti)` : ''}${data.errori ? `, ${data.errori} errori` : ''}`
            });
            onSuccess();
            onClose();
        },
        onError: () => showToast({ type: 'error', message: 'Errore durante l\'invio batch' })
    });

    if (!open) return null;

    const recipientOptions: { value: RecipientType; label: string; icon: React.ReactNode }[] = [
        { value: 'both', label: 'Entrambi', icon: <Users className="h-4 w-4" /> },
        { value: 'worker', label: 'Solo dipendente', icon: <UserCheck className="h-4 w-4" /> },
        { value: 'employer', label: 'Solo azienda', icon: <Building2 className="h-4 w-4" /> },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Send className="h-5 w-5 text-teal-600" />
                            Forza invio giudizi non inviati
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Seleziona i giudizi e il destinatario. Invio protetto da password (WhatsApp al dipendente, PEC all'azienda).
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Recipient type */}
                    <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Destinatario</label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {recipientOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setRecipientType(opt.value)}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${recipientType === opt.value
                                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}
                                >
                                    {opt.icon}
                                    <span className="text-xs font-medium">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {pending.length === 0 ? (
                        <div className="text-center py-10 text-sm text-gray-500">
                            <CheckSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            Nessun giudizio da inviare: sono già stati notificati tutti.
                        </div>
                    ) : (
                        <>
                            {/* Select all */}
                            <div className="flex items-center justify-between">
                                <button onClick={toggleAll} className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {allSelected ? <CheckSquare className="h-4 w-4 text-teal-600" /> : <Square className="h-4 w-4 text-gray-400" />}
                                    Seleziona tutti
                                </button>
                                <span className="text-xs text-gray-500">{selectedIds.size} / {pending.length} selezionati</span>
                            </div>

                            {/* Lista per azienda */}
                            <div className="space-y-3">
                                {byAzienda.map(([azienda, list]) => {
                                    const allOn = list.every(g => selectedIds.has(g.id));
                                    return (
                                        <div key={azienda} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => toggleAzienda(list)}
                                                className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 text-left"
                                            >
                                                {allOn ? <CheckSquare className="h-4 w-4 text-teal-600 flex-shrink-0" /> : <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                                                <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{azienda}</span>
                                                <span className="text-[11px] text-gray-500">{list.length} giudizi</span>
                                            </button>
                                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {list.map(g => (
                                                    <label key={g.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(g.id)}
                                                            onChange={() => toggleOne(g.id)}
                                                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                                                            {g.person?.firstName} {g.person?.lastName}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span title={g.notificatoLavoratore ? 'Lavoratore già inviato' : 'Lavoratore non inviato'} className={`text-[10px] px-1.5 py-0.5 rounded ${g.notificatoLavoratore ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>Lav.</span>
                                                            <span title={g.notificatoDatoreLavoro ? 'Azienda già inviata' : 'Azienda non inviata'} className={`text-[10px] px-1.5 py-0.5 rounded ${g.notificatoDatoreLavoro ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>Az.</span>
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                    <span className="text-xs text-gray-500">{selectedIds.size} giudizi da inviare</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            Annulla
                        </button>
                        <CRUDPrimaryButton
                            onClick={() => sendMutation.mutate()}
                            disabled={selectedIds.size === 0 || sendMutation.isPending}
                        >
                            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {sendMutation.isPending ? 'Invio in corso...' : 'Invia selezionati'}
                        </CRUDPrimaryButton>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BatchForceSendModal;
