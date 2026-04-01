/**
 * BulkQueueCreateModal - Modal per creazione bulk sessioni coda
 * 
 * Permette di:
 * - Visualizzare tutti gli slot disponibilità della giornata
 * - Selezionare/deselezionare quali slot includere
 * - Creare sessioni coda per tutti gli ambulatori selezionati
 * 
 * @module pages/clinica/agenda/components/modals/BulkQueueCreateModal
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Users,
    Clock,
    Building2,
    Stethoscope,
    Check,
    Loader2,
    AlertCircle,
    CheckSquare,
    Square,
    Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/useToast';
import { CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { DatePickerElegante } from '@/components/ui';
import queueApi from '@/services/queueApi';
import type { CalendarEvent } from '../../types';

// =====================================================
// TYPES
// =====================================================

export interface BulkQueueCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    disponibilita: CalendarEvent[];
    ambulatori: Array<{ id: string; nome: string; codice?: string }>;
}

interface SlotSelection {
    slot: CalendarEvent;
    ambulatorioNome: string;
    medicoNome: string;
    selected: boolean;
    hasSession: boolean;  // true se esiste già sessione
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const BulkQueueCreateModal: React.FC<BulkQueueCreateModalProps> = ({
    isOpen,
    onClose,
    date,
    disponibilita,
    ambulatori
}) => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [selections, setSelections] = useState<SlotSelection[]>([]);

    // State for selected date (initialized from prop)
    const [selectedDate, setSelectedDate] = useState<Date>(date);

    // Sync with prop date when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedDate(date);
        }
    }, [isOpen, date]);

    // Format date for display and API
    const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
    const displayDate = useMemo(() => format(selectedDate, 'EEEE d MMMM yyyy', { locale: it }), [selectedDate]);

    // P61: Filter disponibilita for the selected date
    const disponibilitaForDate = useMemo(() => {
        return disponibilita.filter(slot => {
            if (!slot.start) return false;
            const slotDate = format(slot.start, 'yyyy-MM-dd');
            return slotDate === dateStr;
        });
    }, [disponibilita, dateStr]);

    // Get unique ambulatori from filtered disponibilita
    const uniqueAmbulatori = useMemo(() => {
        const map = new Map<string, { id: string; nome: string; medicoIds: Set<string>; medicoNomi: string[] }>();

        disponibilitaForDate.forEach(slot => {
            if (!slot.ambulatorioId) return;

            const existing = map.get(slot.ambulatorioId);
            if (existing) {
                if (slot.medicoId) {
                    existing.medicoIds.add(slot.medicoId);
                    if (slot.medicoNome && !existing.medicoNomi.includes(slot.medicoNome)) {
                        existing.medicoNomi.push(slot.medicoNome);
                    }
                }
            } else {
                const amb = ambulatori.find(a => a.id === slot.ambulatorioId);
                map.set(slot.ambulatorioId, {
                    id: slot.ambulatorioId,
                    nome: slot.ambulatorioNome || amb?.nome || 'Ambulatorio',
                    medicoIds: new Set(slot.medicoId ? [slot.medicoId] : []),
                    medicoNomi: slot.medicoNome ? [slot.medicoNome] : []
                });
            }
        });

        return Array.from(map.values());
    }, [disponibilitaForDate, ambulatori]);

    // Check existing sessions when modal opens
    React.useEffect(() => {
        if (!isOpen) return;

        const checkExistingSessions = async () => {
            setIsChecking(true);
            const newSelections: SlotSelection[] = [];

            for (const amb of uniqueAmbulatori) {
                try {
                    const result = await queueApi.checkExistingSession({
                        date: dateStr,
                        ambulatorioId: amb.id,
                        mode: 'DISPLAY'
                    });

                    newSelections.push({
                        slot: disponibilitaForDate.find(d => d.ambulatorioId === amb.id) || {} as CalendarEvent,
                        ambulatorioNome: amb.nome,
                        medicoNome: amb.medicoNomi.join(', '),
                        selected: !result.exists,  // Pre-select only if no session exists
                        hasSession: result.exists
                    });
                } catch {
                    // If check fails, assume no session
                    newSelections.push({
                        slot: disponibilitaForDate.find(d => d.ambulatorioId === amb.id) || {} as CalendarEvent,
                        ambulatorioNome: amb.nome,
                        medicoNome: amb.medicoNomi.join(', '),
                        selected: true,
                        hasSession: false
                    });
                }
            }

            setSelections(newSelections);
            setIsChecking(false);
        };

        checkExistingSessions();
    }, [isOpen, uniqueAmbulatori, dateStr, disponibilitaForDate]);

    // Toggle selection
    const toggleSelection = useCallback((index: number) => {
        setSelections(prev => prev.map((s, i) =>
            i === index ? { ...s, selected: !s.selected } : s
        ));
    }, []);

    // Select/deselect all
    const toggleAll = useCallback((selected: boolean) => {
        setSelections(prev => prev.map(s =>
            s.hasSession ? s : { ...s, selected }
        ));
    }, []);

    // Count selected
    const selectedCount = useMemo(() =>
        selections.filter(s => s.selected && !s.hasSession).length,
        [selections]
    );

    // Create sessions for selected ambulatori
    const handleCreate = useCallback(async () => {
        const toCreate = selections.filter(s => s.selected && !s.hasSession);

        if (toCreate.length === 0) {
            showToast({ type: 'warning', message: 'Nessun ambulatorio selezionato' });
            return;
        }

        setIsLoading(true);
        let created = 0;
        let errors = 0;

        try {
            for (const item of toCreate) {
                try {
                    await queueApi.createSession({
                        ambulatorioId: item.slot.ambulatorioId || '',
                        mode: 'DISPLAY',
                        date: dateStr,
                        config: {
                            autoCallEnabled: false,
                            callInterval: 30,
                            displayDuration: 15,
                            maxWaitTimeMinutes: 60,
                            ttsEnabled: true,
                            ttsVolume: 1
                        }
                    });
                    created++;
                } catch (err) {
                    errors++;
                }
            }

            // Show result
            if (created > 0) {
                showToast({
                    type: errors > 0 ? 'warning' : 'success',
                    message: `${created} sessioni create${errors > 0 ? `, ${errors} errori` : ''}`
                });
            } else {
                showToast({ type: 'error', message: 'Nessuna sessione creata' });
            }

            onClose();
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore nella creazione' });
        } finally {
            setIsLoading(false);
        }
    }, [selections, dateStr, showToast, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-violet-500 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="w-6 h-6" />
                            <div>
                                <h2 className="text-lg font-semibold">Crea Sessioni Coda</h2>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Date Picker Section */}
                <div className="px-6 py-4 bg-purple-50 border-b">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-purple-700">
                            <Calendar className="w-5 h-5" />
                            <span className="font-medium">Data:</span>
                        </div>
                        <DatePickerElegante
                            value={selectedDate}
                            onChange={(newDate) => newDate && setSelectedDate(newDate)}
                            minDate={new Date()}
                            placeholder="Seleziona data..."
                            className="flex-1 max-w-xs"
                        />
                        <span className="text-sm text-purple-600 capitalize">
                            {displayDate}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isChecking ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                            <span className="ml-3 text-gray-500">Verifica sessioni esistenti...</span>
                        </div>
                    ) : selections.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">
                                Nessuna disponibilità
                            </h3>
                            <p className="text-gray-500 mt-1">
                                Non ci sono slot disponibilità per questa giornata
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Select all */}
                            <div className="flex items-center justify-between pb-3 border-b">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => toggleAll(true)}
                                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                                    >
                                        Seleziona tutti
                                    </button>
                                    <button
                                        onClick={() => toggleAll(false)}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        Deseleziona tutti
                                    </button>
                                </div>
                                <span className="text-sm text-gray-500">
                                    {selectedCount} di {selections.filter(s => !s.hasSession).length} selezionati
                                </span>
                            </div>

                            {/* Selections list */}
                            <div className="space-y-2">
                                {selections.map((item, index) => (
                                    <div
                                        key={item.slot.ambulatorioId || index}
                                        onClick={() => !item.hasSession && toggleSelection(index)}
                                        className={`
                                            flex items-center gap-4 p-4 rounded-lg border transition-colors
                                            ${item.hasSession
                                                ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                                                : item.selected
                                                    ? 'bg-purple-50 border-purple-200 cursor-pointer'
                                                    : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                                            }
                                        `}
                                    >
                                        {/* Checkbox */}
                                        <div className={`
                                            w-5 h-5 rounded flex items-center justify-center
                                            ${item.hasSession
                                                ? 'bg-gray-300'
                                                : item.selected
                                                    ? 'bg-purple-500'
                                                    : 'border-2 border-gray-300'
                                            }
                                        `}>
                                            {(item.selected || item.hasSession) && (
                                                <Check className="w-3.5 h-3.5 text-white" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium text-gray-900">
                                                    {item.ambulatorioNome}
                                                </span>
                                            </div>
                                            {item.medicoNome && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-sm text-gray-500 truncate">
                                                        {item.medicoNome}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Status */}
                                        {item.hasSession && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                                Sessione attiva
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        Annulla
                    </button>
                    <CRUDPrimaryButton
                        onClick={handleCreate}
                        disabled={isLoading || isChecking || selectedCount === 0}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Users className="w-4 h-4 mr-2" />
                        )}
                        Crea {selectedCount} Sessioni
                    </CRUDPrimaryButton>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BulkQueueCreateModal;
