/**
 * Deadline Editor Modal
 * 
 * Modal per creare/modificare scadenze
 * 
 * @module components/DeadlineEditorModal
 * @project P66 - Sistema Scadenze Centralizzato
 */

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Save, Calendar } from 'lucide-react';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';
import { useToast } from '../../../../hooks/useToast';
import {
    scadenzeApi,
    type DeadlineItem,
    type DeadlineInput,
    type DeadlineCategory,
    type DeadlinePriority
} from '../../../../services/clinicaApi';
import { CRUDPrimaryButton } from '../../../../components/shared/CRUDButton';

interface DeadlineEditorModalProps {
    deadline: DeadlineItem | null;
    onClose: () => void;
    onSaved: () => void;
    categoryConfig: Record<DeadlineCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }>;
    priorityConfig: Record<DeadlinePriority, { label: string; color: string; bgColor: string }>;
}

const DeadlineEditorModal: React.FC<DeadlineEditorModalProps> = ({
    deadline,
    onClose,
    onSaved,
    categoryConfig,
    priorityConfig
}) => {
    const { showToast } = useToast();
    const isEditing = Boolean(deadline);

    // Form state
    const [formData, setFormData] = useState<Partial<DeadlineInput>>({
        titolo: '',
        descrizione: '',
        categoria: 'ALTRO',
        dataScadenza: '',
        giorniPreavviso1: 30,
        priorita: 'NORMAL'
    });

    // Load deadline data for editing
    useEffect(() => {
        if (deadline) {
            setFormData({
                titolo: deadline.titolo,
                descrizione: deadline.descrizione || '',
                categoria: deadline.categoria,
                dataScadenza: deadline.dataScadenza ? deadline.dataScadenza.split('T')[0] : '',
                giorniPreavviso1: deadline.giorniPreavviso1 || 30,
                priorita: deadline.priorita
            });
        }
    }, [deadline]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: DeadlineInput) => scadenzeApi.create(data),
        onSuccess: () => {
            showToast({ message: 'Scadenza creata con successo', type: 'success' });
            onSaved();
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<DeadlineInput> }) =>
            scadenzeApi.update(id, data),
        onSuccess: () => {
            showToast({ message: 'Scadenza aggiornata con successo', type: 'success' });
            onSaved();
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.titolo || !formData.dataScadenza || !formData.categoria) {
            showToast({ message: 'Compila tutti i campi obbligatori', type: 'error' });
            return;
        }

        if (isEditing && deadline) {
            updateMutation.mutate({
                id: deadline.id,
                data: formData as Partial<DeadlineInput>
            });
        } else {
            createMutation.mutate(formData as DeadlineInput);
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
                        {isEditing ? 'Modifica Scadenza' : 'Nuova Scadenza'}
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
                    {/* Titolo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titolo *
                        </label>
                        <input
                            type="text"
                            value={formData.titolo || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, titolo: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Es: Scadenza visita periodica"
                            required
                        />
                    </div>

                    {/* Categoria */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Categoria *
                        </label>
                        <select
                            value={formData.categoria || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value as DeadlineCategory }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            required
                        >
                            {Object.entries(categoryConfig).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
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
                            minDate={new Date()}
                            theme="teal"
                        />
                    </div>

                    {/* Preavviso */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Giorni di Preavviso
                        </label>
                        <input
                            type="number"
                            value={formData.giorniPreavviso1 || 30}
                            onChange={(e) => setFormData(prev => ({ ...prev, giorniPreavviso1: parseInt(e.target.value) || 30 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            min="0"
                            max="365"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Quanti giorni prima ricevere la notifica
                        </p>
                    </div>

                    {/* Priorità */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priorità
                        </label>
                        <select
                            value={formData.priorita || 'NORMAL'}
                            onChange={(e) => setFormData(prev => ({ ...prev, priorita: e.target.value as DeadlinePriority }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                            {Object.entries(priorityConfig).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Descrizione */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descrizione
                        </label>
                        <textarea
                            value={formData.descrizione || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            rows={4}
                            placeholder="Dettagli aggiuntivi e note..."
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

export default DeadlineEditorModal;
