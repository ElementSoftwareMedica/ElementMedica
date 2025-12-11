/**
 * GenerateLettereModal Component
 * 
 * Modal per generare lettere di incarico con configurazione compensi.
 * Permette di impostare tariffa oraria e rimborso spese per ogni formatore.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Euro, Clock, Calculator, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import lettereIncaricoService from '@/services/lettereIncaricoService';
import templateService from '@/services/templateService';

interface Trainer {
    id: string | number;
    firstName: string;
    lastName: string;
    email?: string;
    hourlyRate?: number;
}

interface DateEntry {
    date: string;
    start?: string;
    end?: string;
    duration?: number;
    trainerId?: string | number;
}

interface TrainerCompensation {
    hourlyRate: number;
    expenses: number;
    totalHours: number;
}

interface Template {
    id: string;
    name: string;
    type: string;
}

interface GenerateLettereModalProps {
    isOpen: boolean;
    onClose: () => void;
    scheduleId: string | number | null | undefined;
    trainers: Trainer[];
    dates: DateEntry[];
    onSuccess: () => void;
}

export const GenerateLettereModal: React.FC<GenerateLettereModalProps> = ({
    isOpen,
    onClose,
    scheduleId,
    trainers,
    dates,
    onSuccess
}) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [selectedTrainers, setSelectedTrainers] = useState<Set<string>>(new Set());
    const [compensations, setCompensations] = useState<Record<string, TrainerCompensation>>({});
    const [loading, setLoading] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Calcola le ore totali per un formatore dalle sessioni
    const calculateTrainerHours = useCallback((trainerId: string | number): number => {
        const trainerDates = dates.filter(d => String(d.trainerId) === String(trainerId));

        return trainerDates.reduce((sum, d) => {
            // Se c'è duration, usala
            if (d.duration && d.duration > 0) {
                return sum + d.duration;
            }
            // Altrimenti calcola da start e end
            if (d.start && d.end) {
                const startParts = d.start.split(':').map(Number);
                const endParts = d.end.split(':').map(Number);
                const startMinutes = (startParts[0] || 0) * 60 + (startParts[1] || 0);
                const endMinutes = (endParts[0] || 0) * 60 + (endParts[1] || 0);
                const durationHours = (endMinutes - startMinutes) / 60;
                return sum + Math.max(0, durationHours);
            }
            return sum;
        }, 0);
    }, [dates]);

    // Carica i template quando il modal si apre
    useEffect(() => {
        console.log('🔵 GenerateLettereModal: isOpen changed to', isOpen, 'trainers:', trainers.length, 'dates:', dates.length);
        if (isOpen) {
            loadTemplates();
            initializeTrainers();
        }
    }, [isOpen, trainers]);

    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const result = await templateService.list({ type: 'LETTER_OF_ENGAGEMENT' });
            const templateList = result.data || [];
            setTemplates(templateList);
            if (templateList.length > 0) {
                setSelectedTemplateId(templateList[0].id);
            }
        } catch (error) {
            console.error('Errore caricamento template:', error);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const initializeTrainers = () => {
        const newCompensations: Record<string, TrainerCompensation> = {};
        const newSelected = new Set<string>();

        console.log('🔵 initializeTrainers: trainers input:', trainers.map(t => ({
            id: t.id,
            name: `${t.firstName} ${t.lastName}`,
            hourlyRate: t.hourlyRate
        })));
        console.log('🔵 initializeTrainers: dates input:', dates.map(d => ({
            date: d.date,
            trainerId: d.trainerId,
            duration: d.duration
        })));

        trainers.forEach(trainer => {
            const trainerId = String(trainer.id);
            const hours = calculateTrainerHours(trainerId);
            newSelected.add(trainerId);
            newCompensations[trainerId] = {
                hourlyRate: trainer.hourlyRate || 0,
                expenses: 0,
                totalHours: hours
            };
            console.log(`🔵 Trainer ${trainerId}: hourlyRate=${trainer.hourlyRate || 0}, totalHours=${hours}`);
        });

        setSelectedTrainers(newSelected);
        setCompensations(newCompensations);
    };

    const handleTrainerToggle = (trainerId: string) => {
        setSelectedTrainers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(trainerId)) {
                newSet.delete(trainerId);
            } else {
                newSet.add(trainerId);
                // Inizializza compensi se non esistono
                if (!compensations[trainerId]) {
                    const trainer = trainers.find(t => String(t.id) === trainerId);
                    setCompensations(prev => ({
                        ...prev,
                        [trainerId]: {
                            hourlyRate: trainer?.hourlyRate || 0,
                            expenses: 0,
                            totalHours: calculateTrainerHours(trainerId)
                        }
                    }));
                }
            }
            return newSet;
        });
    };

    const handleHourlyRateChange = (trainerId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setCompensations(prev => ({
            ...prev,
            [trainerId]: {
                ...prev[trainerId],
                hourlyRate: numValue
            }
        }));
    };

    const handleExpensesChange = (trainerId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setCompensations(prev => ({
            ...prev,
            [trainerId]: {
                ...prev[trainerId],
                expenses: numValue
            }
        }));
    };

    const calculateTotal = (trainerId: string): number => {
        const comp = compensations[trainerId];
        if (!comp) return 0;
        return (comp.hourlyRate * comp.totalHours) + comp.expenses;
    };

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(value);
    };

    const handleGenerate = async () => {
        if (!scheduleId || selectedTrainers.size === 0) {
            setError('Seleziona almeno un formatore');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const selectedTrainerIds = Array.from(selectedTrainers);
            let successCount = 0;
            let errorCount = 0;

            for (const trainerId of selectedTrainerIds) {
                try {
                    const comp = compensations[trainerId];
                    await lettereIncaricoService.generate({
                        scheduleId: String(scheduleId),
                        trainerId,
                        templateId: selectedTemplateId || undefined,
                        hourlyRate: comp?.hourlyRate || 0,
                        expenses: comp?.expenses || 0
                    });
                    successCount++;
                } catch (err) {
                    console.error(`Errore generazione lettera per trainer ${trainerId}:`, err);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                setSuccess(true);
                setTimeout(() => {
                    onSuccess();
                    handleClose();
                }, 1500);
            }

            if (errorCount > 0) {
                setError(`${errorCount} lettere non generate. ${successCount} generate con successo.`);
            }
        } catch (err: any) {
            setError(err.message || 'Errore durante la generazione');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setError(null);
        setSuccess(false);
        onClose();
    };

    // Non renderizzare se non è aperto
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
            {/* Backdrop - higher z-index to cover parent modal */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Genera Lettere di Incarico</h2>
                            <p className="text-sm text-gray-500">Configura i compensi per ogni formatore</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Template Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            Template
                        </label>
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            disabled={loadingTemplates}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">{loadingTemplates ? "Caricamento..." : "Seleziona template"}</option>
                            {templates.map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                        </select>
                        {templates.length === 0 && !loadingTemplates && (
                            <p className="text-sm text-amber-600">
                                ⚠️ Nessun template disponibile. Verrà usato il template predefinito.
                            </p>
                        )}
                    </div>

                    {/* Trainers List */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            Formatori e Compensi
                        </label>

                        <div className="space-y-4">
                            {trainers.map(trainer => {
                                const trainerId = String(trainer.id);
                                const isSelected = selectedTrainers.has(trainerId);
                                const comp = compensations[trainerId] || { hourlyRate: 0, expenses: 0, totalHours: 0 };
                                const total = calculateTotal(trainerId);

                                return (
                                    <div
                                        key={trainerId}
                                        className={`border rounded-xl p-4 transition-all ${isSelected
                                                ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                                                : 'border-gray-200 bg-gray-50/50 opacity-60'
                                            }`}
                                    >
                                        {/* Trainer Header */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <input
                                                type="checkbox"
                                                id={`trainer-${trainerId}`}
                                                checked={isSelected}
                                                onChange={() => handleTrainerToggle(trainerId)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label
                                                htmlFor={`trainer-${trainerId}`}
                                                className="flex-1 font-medium cursor-pointer text-gray-900"
                                            >
                                                {trainer.firstName} {trainer.lastName}
                                            </label>
                                            {trainer.email && (
                                                <span className="text-xs text-gray-500">{trainer.email}</span>
                                            )}
                                        </div>

                                        {/* Compensation Fields */}
                                        {isSelected && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-gray-200">
                                                {/* Ore Totali */}
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Ore Totali
                                                    </label>
                                                    <div className="p-2 bg-gray-100 rounded-lg text-sm font-medium text-center text-gray-700">
                                                        {comp.totalHours.toFixed(1)} h
                                                    </div>
                                                </div>

                                                {/* Tariffa Oraria */}
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Euro className="w-3 h-3" />
                                                        Tariffa/Ora
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={comp.hourlyRate || ''}
                                                            onChange={(e) => handleHourlyRateChange(trainerId, e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full px-3 py-2 pr-8 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                                                    </div>
                                                </div>

                                                {/* Rimborso Spese */}
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Calculator className="w-3 h-3" />
                                                        Rimborso Spese
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={comp.expenses || ''}
                                                            onChange={(e) => handleExpensesChange(trainerId, e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full px-3 py-2 pr-8 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                                                    </div>
                                                </div>

                                                {/* Totale */}
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-500 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Compenso Totale
                                                    </label>
                                                    <div className="p-2 bg-green-100 rounded-lg text-sm font-semibold text-green-700 text-center">
                                                        {formatCurrency(total)}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {trainers.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p>Nessun formatore assegnato al corso</p>
                            </div>
                        )}
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm">Lettere generate con successo!</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || selectedTrainers.size === 0}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generazione...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4" />
                                Genera {selectedTrainers.size} Lettera{selectedTrainers.size !== 1 ? 'e' : ''}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GenerateLettereModal;
