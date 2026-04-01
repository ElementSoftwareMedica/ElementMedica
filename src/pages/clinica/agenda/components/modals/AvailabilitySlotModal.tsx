/**
 * AvailabilitySlotModal - Modal per creare slot di disponibilità (dopo drag)
 * @module pages/clinica/agenda/components/modals/AvailabilitySlotModal
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CalendarIcon,
    Clock,
    Stethoscope,
    X,
    Check,
    AlertTriangle,
    Search,
    RefreshCw,
    Plus
} from 'lucide-react';

import { slotsApi } from '../../../../../services/clinicaApi';
import type { SlotDisponibilita, Medico } from '../../../../../services/clinicaApi';
import { formatDate } from '../../../../../utils/dateUtils';
import { minutesToTimeString } from '../../utils';
import { getDoctorTitle } from '../../../../../utils/codiceFiscale';
import { useToast } from '../../../../../hooks/useToast';
import type { AvailabilitySlotModalProps } from './types';

export const AvailabilitySlotModal: React.FC<AvailabilitySlotModalProps> = ({
    isOpen,
    onClose,
    slotInfo,
    medici,
    selectedMedicoId,
    medicoColors,
    onSuccess,
    existingDisponibilita = []
}) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [selectedMedico, setSelectedMedico] = useState<string>(selectedMedicoId || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // State for scenario 2 confirmation (same medico, different ambulatorio)
    const [showForceConfirm, setShowForceConfirm] = useState(false);
    const [forceConfirmMessage, setForceConfirmMessage] = useState('');

    // Filter medici based on search query
    const filteredMedici = useMemo(() => {
        if (!searchQuery.trim()) return medici;
        const query = searchQuery.toLowerCase();
        return medici.filter(m => {
            const fullName = `${m.firstName || m.nome || ''} ${m.lastName || m.cognome || ''}`.toLowerCase();
            const specialty = (m.specializzazione || (m.specialties?.join(' ') || '')).toLowerCase();
            return fullName.includes(query) || specialty.includes(query);
        });
    }, [medici, searchQuery]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedMedico(selectedMedicoId || (medici.length === 1 ? medici[0].id : ''));
            setSearchQuery('');
            setShowForceConfirm(false);
            setForceConfirmMessage('');
        }
    }, [isOpen, selectedMedicoId, medici]);

    // Create slot mutation
    const createSlotMutation = useMutation({
        mutationFn: (data: Partial<SlotDisponibilita> & { forceCreate?: boolean }) => slotsApi.create(data),
        onSuccess: () => {
            // Invalidate BOTH query keys to ensure calendar refreshes
            queryClient.invalidateQueries({ queryKey: ['slots-disponibilita'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['slots-calendario'], refetchType: 'all' });
            showToast({ type: 'success', message: 'Disponibilità creata con successo' });
            setShowForceConfirm(false);
            onSuccess();
            onClose();
        },
        onError: (error: Error & { response?: { status?: number; data?: { message?: string } } }) => {
            const errorMessage = error.response?.data?.message || '';

            // Check for confirmation scenarios (409 status + "Conferma" message)
            // Scenario 2: Same medico, different ambulatorio
            // Scenario 3: Different medico, same ambulatorio  
            const requiresConfirmation = error.response?.status === 409 &&
                (errorMessage.includes('Conferma') ||
                    errorMessage.includes('altro ambulatorio') ||
                    errorMessage.includes('già occupato'));

            if (requiresConfirmation) {
                setForceConfirmMessage(errorMessage);
                setShowForceConfirm(true);
                return;
            }

            // Scenario 1: Same medico, same ambulatorio - always block (no confirmation possible)
            const isScenario1 = errorMessage.toLowerCase().includes('stesso ambulatorio') ||
                errorMessage.toLowerCase().includes('nello stesso ambulatorio') ||
                errorMessage.toLowerCase().includes('modifica l\'orario');

            if (isScenario1) {
                showToast({
                    type: 'error',
                    message: 'Non è possibile creare disponibilità sovrapposte nello stesso ambulatorio.',
                    duration: 6000
                });
            } else {
                const isOverlapError = errorMessage.toLowerCase().includes('sovrappos') ||
                    errorMessage.toLowerCase().includes('overlap') ||
                    errorMessage.toLowerCase().includes('esistente') ||
                    error.response?.status === 409;

                if (isOverlapError) {
                    showToast({
                        type: 'warning',
                        message: 'Esiste già una disponibilità sovrapposta.',
                        duration: 6000
                    });
                } else {
                    showToast({ type: 'error', message: 'Errore nella creazione della disponibilità' });
                }
            }
        }
    });

    const handleSubmit = async (forceCreate = false) => {
        if (!selectedMedico || !slotInfo) {
            showToast({ type: 'error', message: 'Seleziona un medico' });
            return;
        }

        // Skip frontend checks if forceCreate (user already confirmed)
        if (!forceCreate) {
            const newStart = slotInfo.startHour;
            const newEnd = slotInfo.endHour;
            // CRITICAL FIX: Use local date parts to avoid timezone shift
            const slotYear = slotInfo.date.getFullYear();
            const slotMonth = slotInfo.date.getMonth();
            const slotDay = slotInfo.date.getDate();

            // Check for overlapping availability - same ambulatorio and date
            const overlapping = existingDisponibilita.filter(d => {
                if (d.ambulatorioId !== slotInfo.ambulatorioId) return false;
                // Compare using local date parts
                const dYear = d.start.getFullYear();
                const dMonth = d.start.getMonth();
                const dDay = d.start.getDate();
                if (dYear !== slotYear || dMonth !== slotMonth || dDay !== slotDay) return false;

                const dStart = d.start.getHours() + d.start.getMinutes() / 60;
                const dEnd = d.end.getHours() + d.end.getMinutes() / 60;

                return newStart < dEnd && newEnd > dStart;
            });

            if (overlapping.length > 0) {
                const sameMedico = overlapping.filter(d => d.medicoId === selectedMedico);
                const otherMedico = overlapping.filter(d => d.medicoId !== selectedMedico);

                if (sameMedico.length > 0) {
                    showToast({
                        type: 'error',
                        message: `Non è possibile creare: il medico selezionato ha già ${sameMedico.length} slot sovrapposto/i in questo orario.`,
                        duration: 6000
                    });
                    return;
                }

                if (otherMedico.length > 0) {
                    showToast({
                        type: 'warning',
                        message: `Attenzione: ${otherMedico.length} slot sovrapposto/i per altri medici nello stesso ambulatorio.`,
                        duration: 5000
                    });
                }
            }
        }

        setIsSubmitting(true);

        const formatHour = (hour: number) => {
            const h = Math.floor(hour);
            const m = Math.round((hour - h) * 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        try {
            // CRITICAL FIX: Use local date parts to avoid timezone shift
            // toISOString() converts to UTC which can change the date
            const year = slotInfo.date.getFullYear();
            const month = String(slotInfo.date.getMonth() + 1).padStart(2, '0');
            const day = String(slotInfo.date.getDate()).padStart(2, '0');
            const submissionDate = `${year}-${month}-${day}`;

            await createSlotMutation.mutateAsync({
                medicoId: selectedMedico,
                ambulatorioId: slotInfo.ambulatorioId,
                data: submissionDate,
                oraInizio: formatHour(slotInfo.startHour),
                oraFine: formatHour(slotInfo.endHour),
                disponibile: true,
                ...(forceCreate && { forceCreate: true })
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForceCreate = () => {
        setShowForceConfirm(false);
        handleSubmit(true);
    };

    const handleCancelForce = () => {
        setShowForceConfirm(false);
        setForceConfirmMessage('');
    };

    if (!isOpen || !slotInfo) return null;

    const showMedicoSelection = !selectedMedicoId || medici.length > 1;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-emerald-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900">Crea Disponibilità</h3>
                    <p className="text-sm text-gray-600">
                        {formatDate(slotInfo.date, 'full')} • {minutesToTimeString(slotInfo.startHour * 60)} - {minutesToTimeString(slotInfo.endHour * 60)}
                    </p>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {showMedicoSelection ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Stethoscope className="h-4 w-4 inline mr-1" />
                                Seleziona Medico *
                            </label>

                            {medici.length > 3 && (
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Cerca medico per nome o specialità..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="border border-gray-100 rounded-lg overflow-hidden">
                                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                                    {filteredMedici.length === 0 ? (
                                        <div className="p-3 text-center text-gray-500 text-sm">
                                            Nessun medico trovato per "{searchQuery}"
                                        </div>
                                    ) : filteredMedici.map(m => {
                                        const color = medicoColors.get(m.id);
                                        const isSelected = selectedMedico === m.id;
                                        const specialty = m.specializzazione || (m.specialties?.length ? m.specialties[0] : null);
                                        const firstName = m.firstName || m.nome || '';
                                        const lastName = m.lastName || m.cognome || '';
                                        const fullName = `${firstName} ${lastName}`.trim();
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => setSelectedMedico(m.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all ${isSelected
                                                    ? 'bg-teal-50'
                                                    : 'bg-white hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1 ${isSelected ? 'ring-teal-400' : 'ring-transparent'} ${color?.dot || 'bg-gray-400'}`} />
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-sm font-medium ${isSelected ? 'text-teal-700' : 'text-gray-800'}`}>
                                                            {getDoctorTitle(m.taxCode || m.codiceFiscale || null, m.gender || null)}
                                                        </span>
                                                        <span className={`text-sm ${isSelected ? 'text-teal-700' : 'text-gray-800'}`}>
                                                            {fullName}
                                                        </span>
                                                    </div>
                                                    {specialty && (
                                                        <span className="text-xs text-gray-400 block mt-0.5">{specialty}</span>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                                                        <Check className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {filteredMedici.length > 0 && medici.length > 3 && (
                                <div className="text-xs text-gray-400 mt-2">
                                    {filteredMedici.length} di {medici.length} medici
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                            <div className={`w-3 h-3 rounded-full ${medicoColors.get(selectedMedicoId!)?.dot || 'bg-gray-400'}`} />
                            <span className="font-medium text-gray-900">
                                {medici.find(m => m.id === selectedMedicoId)?.lastName ||
                                    medici.find(m => m.id === selectedMedicoId)?.cognome}
                            </span>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(slotInfo.date, 'full')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>
                                {minutesToTimeString(slotInfo.startHour * 60)} - {minutesToTimeString(slotInfo.endHour * 60)}
                                <span className="text-gray-400 ml-2">
                                    {(() => {
                                        const totalMinutes = Math.round((slotInfo.endHour - slotInfo.startHour) * 60);
                                        const hours = Math.floor(totalMinutes / 60);
                                        const minutes = totalMinutes % 60;
                                        if (hours === 0) return `(${minutes} min)`;
                                        if (minutes === 0) return `(${hours}h)`;
                                        return `(${hours}h ${minutes}min)`;
                                    })()}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Force Create Confirmation Dialog */}
                {showForceConfirm && (
                    <div className="p-4 bg-amber-50 border-t border-amber-200">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-amber-800 font-medium mb-1">Conferma creazione</p>
                                <p className="text-sm text-amber-700">{forceConfirmMessage}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-3">
                            <button
                                onClick={handleCancelForce}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                disabled={isSubmitting}
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleForceCreate}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Creazione...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Conferma e Crea
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {!showForceConfirm && (
                    <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            disabled={isSubmitting}
                        >
                            Annulla
                        </button>
                        <button
                            onClick={() => handleSubmit()}
                            disabled={!selectedMedico || isSubmitting}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    Crea Disponibilità
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AvailabilitySlotModal;
