/**
 * EditDisponibilitaModal - Modal per modificare slot di disponibilità esistente
 * @module pages/clinica/agenda/components/modals/EditDisponibilitaModal
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    Clock,
    Stethoscope,
    Building2,
    RefreshCw,
    Save,
    Users
} from 'lucide-react';

import { slotsApi } from '../../../../../services/clinicaApi';
import type { SlotDisponibilita } from '../../../../../services/clinicaApi';
import { formatTime } from '../../../../../utils/dateUtils';
import { useToast } from '../../../../../hooks/useToast';
import type { EditDisponibilitaModalProps } from './types';
import { DatePickerElegante } from '../../../../../components/ui/DatePickerElegante';
import { TimePickerElegante } from '../../../../../components/ui/TimePickerElegante';

export const EditDisponibilitaModal: React.FC<EditDisponibilitaModalProps> = ({
    isOpen,
    onClose,
    slot,
    medici,
    ambulatori,
    medicoColors,
    onSuccess
}) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [selectedMedico, setSelectedMedico] = useState<string>('');
    const [selectedAmbulatorio, setSelectedAmbulatorio] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal opens with new slot
    useEffect(() => {
        if (isOpen && slot) {
            setSelectedMedico(slot.medicoId || '');
            setSelectedAmbulatorio(slot.ambulatorioId || '');
            setStartTime(formatTime(slot.start));
            setEndTime(formatTime(slot.end));
            setDate(slot.start.toISOString().split('T')[0]);
        }
    }, [isOpen, slot]);

    // Update slot mutation
    const updateSlotMutation = useMutation({
        mutationFn: (data: { id: string; data: Partial<SlotDisponibilita> }) =>
            slotsApi.update(data.id, data.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['slots-disponibilita'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['slots-calendario'], refetchType: 'all' });
            showToast({ type: 'success', message: 'Disponibilità aggiornata con successo' });
            onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                message: 'Errore durante l\'aggiornamento della disponibilità'
            });
        }
    });

    const handleSubmit = () => {
        if (!slot || !selectedMedico || !selectedAmbulatorio || !startTime || !endTime || !date) {
            showToast({ type: 'error', message: 'Compila tutti i campi obbligatori' });
            return;
        }

        setIsSubmitting(true);

        updateSlotMutation.mutate({
            id: slot.id,
            data: {
                medicoId: selectedMedico,
                ambulatorioId: selectedAmbulatorio,
                data: date,
                oraInizio: startTime,
                oraFine: endTime
            }
        }, {
            onSettled: () => setIsSubmitting(false)
        });
    };

    // Navigate to create queue session with pre-filled data
    const handleCreateQueueSession = () => {
        const params = new URLSearchParams();
        if (selectedMedico) params.append('medicoId', selectedMedico);
        if (selectedAmbulatorio) params.append('ambulatorioId', selectedAmbulatorio);
        if (date) params.append('date', date);
        if (slot?.id) params.append('disponibilitaId', slot.id);

        onClose();
        navigate(`/poliambulatorio/coda/create?${params.toString()}`);
    };

    if (!isOpen || !slot) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-amber-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900">Modifica Disponibilità</h3>
                    <p className="text-sm text-gray-600">{slot.medicoNome}</p>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            Data
                        </label>
                        <DatePickerElegante
                            value={date}
                            onChange={(d) => setDate(d ? d.toISOString().split('T')[0] : '')}
                            theme="teal"
                        />
                    </div>

                    {/* Time range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Clock className="h-4 w-4 inline mr-1" />
                                Ora Inizio
                            </label>
                            <TimePickerElegante
                                value={startTime}
                                onChange={setStartTime}
                                minuteStep={5}
                                placeholder="Ora inizio"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Clock className="h-4 w-4 inline mr-1" />
                                Ora Fine
                            </label>
                            <TimePickerElegante
                                value={endTime}
                                onChange={setEndTime}
                                minuteStep={5}
                                placeholder="Ora fine"
                            />
                        </div>
                    </div>

                    {/* Medico */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Stethoscope className="h-4 w-4 inline mr-1" />
                            Medico
                        </label>
                        <select
                            value={selectedMedico}
                            onChange={(e) => setSelectedMedico(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="">Seleziona medico...</option>
                            {medici.map(m => {
                                const firstName = m.firstName || m.nome || '';
                                const lastName = m.lastName || m.cognome || '';
                                return (
                                    <option key={m.id} value={m.id}>
                                        {firstName} {lastName} {m.specializzazione ? `(${m.specializzazione})` : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Ambulatorio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Building2 className="h-4 w-4 inline mr-1" />
                            Ambulatorio
                        </label>
                        <select
                            value={selectedAmbulatorio}
                            onChange={(e) => setSelectedAmbulatorio(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="">Seleziona ambulatorio...</option>
                            {ambulatori.map(a => (
                                <option key={a.id} value={a.id}>{a.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex flex-col gap-3">
                    {/* Queue Session Button */}
                    <button
                        onClick={handleCreateQueueSession}
                        className="w-full px-4 py-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Users className="h-4 w-4" />
                        Crea Sessione Coda per questo Slot
                    </button>

                    {/* Actions Row */}
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            disabled={isSubmitting}
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedMedico || !selectedAmbulatorio || isSubmitting}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Salva Modifiche
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditDisponibilitaModal;
