/**
 * Farmaco Editor Modal
 * 
 * Modal per creare/modificare farmaci con ubicazione
 * 
 * @module components/FarmacoEditorModal
 * @project P66 - Sistema Scadenze Centralizzato
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Save, MapPin, Calendar } from 'lucide-react';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';
import { useToast } from '../../../../hooks/useToast';
import {
    farmaciApi,
    type Farmaco,
    type FarmacoInput
} from '../../../../services/clinicaApi';
import { CRUDPrimaryButton } from '../../../../components/shared/CRUDButton';

interface FarmacoEditorModalProps {
    farmaco: Farmaco | null;
    onClose: () => void;
    onSaved: () => void;
}

const FarmacoEditorModal: React.FC<FarmacoEditorModalProps> = ({
    farmaco,
    onClose,
    onSaved
}) => {
    const { showToast } = useToast();
    const isEditing = Boolean(farmaco);

    // Load ubicazioni for autocomplete
    const { data: ubicazioniData } = useQuery({
        queryKey: ['farmaci-ubicazioni'],
        queryFn: () => farmaciApi.getUbicazioni()
    });
    const ubicazioni = ubicazioniData || [];

    // Form state
    const [formData, setFormData] = useState<Partial<FarmacoInput>>({
        codice: '',
        nome: '',
        principioAttivo: '',
        lottoNumero: '',
        dataScadenza: '',
        quantitaDisponibile: 1,
        quantitaMinima: 0,
        unitaMisura: 'pz',
        ubicazione: '',
        note: ''
    });

    // Load farmaco data for editing
    useEffect(() => {
        if (farmaco) {
            setFormData({
                codice: farmaco.codice || '',
                nome: farmaco.nome,
                principioAttivo: farmaco.principioAttivo || '',
                lottoNumero: farmaco.lottoNumero || '',
                dataScadenza: farmaco.dataScadenza ? farmaco.dataScadenza.split('T')[0] : '',
                quantitaDisponibile: farmaco.quantitaDisponibile,
                quantitaMinima: farmaco.quantitaMinima || 0,
                unitaMisura: farmaco.unitaMisura || 'pz',
                ubicazione: farmaco.ubicazione || '',
                note: farmaco.note || ''
            });
        }
    }, [farmaco]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: FarmacoInput) => farmaciApi.create(data),
        onSuccess: () => {
            showToast({ message: 'Farmaco creato con successo', type: 'success' });
            onSaved();
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<FarmacoInput> }) =>
            farmaciApi.update(id, data),
        onSuccess: () => {
            showToast({ message: 'Farmaco aggiornato con successo', type: 'success' });
            onSaved();
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.nome || !formData.dataScadenza || !formData.ubicazione) {
            showToast({ message: 'Compila tutti i campi obbligatori', type: 'error' });
            return;
        }

        // Auto-generate codice if not provided
        const dataToSubmit = {
            ...formData,
            codice: formData.codice || `FARM-${Date.now()}`
        };

        if (isEditing && farmaco) {
            updateMutation.mutate({
                id: farmaco.id,
                data: dataToSubmit as Partial<FarmacoInput>
            });
        } else {
            createMutation.mutate(dataToSubmit as FarmacoInput);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {isEditing ? 'Modifica Farmaco' : 'Nuovo Farmaco'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Farmaco *
                        </label>
                        <input
                            type="text"
                            value={formData.nome || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Es: Tachipirina 500mg"
                            required
                        />
                    </div>

                    {/* Principio Attivo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Principio Attivo
                        </label>
                        <input
                            type="text"
                            value={formData.principioAttivo || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, principioAttivo: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Es: Paracetamolo"
                        />
                    </div>

                    {/* Lotto */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Numero Lotto
                        </label>
                        <input
                            type="text"
                            value={formData.lottoNumero || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, lottoNumero: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono"
                            placeholder="Es: LOT2024001"
                        />
                    </div>

                    {/* Data Scadenza */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Calendar className="inline h-4 w-4 mr-1" />
                            Data Scadenza *
                        </label>
                        <DatePickerElegante
                            value={formData.dataScadenza ? new Date(formData.dataScadenza) : null}
                            onChange={(date) => {
                                if (date) {
                                    setFormData(prev => ({ ...prev, dataScadenza: date.toISOString().split('T')[0] }));
                                }
                            }}
                            placeholder="Seleziona data"
                            theme="teal"
                        />
                    </div>

                    {/* Quantità e Unità di Misura */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantità *
                            </label>
                            <input
                                type="number"
                                value={formData.quantitaDisponibile || 1}
                                onChange={(e) => setFormData(prev => ({ ...prev, quantitaDisponibile: parseInt(e.target.value) || 1 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                min="0"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unità di Misura
                            </label>
                            <select
                                value={formData.unitaMisura || 'pz'}
                                onChange={(e) => setFormData(prev => ({ ...prev, unitaMisura: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="pz">Pezzi</option>
                                <option value="conf">Confezioni</option>
                                <option value="fl">Flaconi</option>
                                <option value="ml">ml</option>
                                <option value="mg">mg</option>
                                <option value="g">grammi</option>
                            </select>
                        </div>
                    </div>

                    {/* Quantità Minima */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Scorta Minima
                        </label>
                        <input
                            type="number"
                            value={formData.quantitaMinima || 0}
                            onChange={(e) => setFormData(prev => ({ ...prev, quantitaMinima: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Riceverai un avviso quando la quantità scende sotto questo valore
                        </p>
                    </div>

                    {/* Ubicazione */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                Ubicazione
                            </div>
                        </label>
                        <input
                            type="text"
                            value={formData.ubicazione || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, ubicazione: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Es: Armadio A, Scaffale 3"
                            list="ubicazioni-list"
                        />
                        {ubicazioni.length > 0 && (
                            <datalist id="ubicazioni-list">
                                {ubicazioni.map((ub, idx) => (
                                    <option key={idx} value={ub} />
                                ))}
                            </datalist>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Indica dove si trova fisicamente il farmaco (stanza, armadio, scaffale)
                        </p>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Note
                        </label>
                        <textarea
                            value={formData.note || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            rows={2}
                            placeholder="Note aggiuntive..."
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isLoading}
                    >
                        Annulla
                    </button>
                    <CRUDPrimaryButton
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        <Save className="w-4 h-4" />
                        {isLoading ? 'Salvataggio...' : 'Salva'}
                    </CRUDPrimaryButton>
                </div>
            </div>
        </div>
    );
};

export default FarmacoEditorModal;
