/**
 * QuickActionAllegato3BModal - Modal per gestione Allegato 3B da CompanyDetails
 * 
 * Modal per creare/gestire Allegato 3B - Relazione Annuale Medico Competente
 * secondo Art. 40 D.Lgs 81/08
 * 
 * @module components/companies/quick-actions/QuickActionAllegato3BModal
 * @project P59 - ElementSicurezza Enhancement
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Loader2,
    FileText,
    Calendar,
    Stethoscope,
    Info,
    CheckCircle2,
    Send,
    Users
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { apiGet, apiPost } from '../../../services/api';
import { cn } from '../../../design-system/utils';
import { useTenantMode } from '../../../contexts/TenantModeContext';

interface QuickActionAllegato3BModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyId: string;
    companyName: string;
    /** Multi-tenant operation headers (X-Operate-Tenant-Id) */
    operateHeaders?: Record<string, string>;
}

interface MedicoOption {
    id: string;
    firstName: string;
    lastName: string;
    gender?: string;
}

interface Allegato3BExisting {
    id: string;
    anno: number;
    stato: string;
    totLavoratoriSorvegliati: number;
    totVisiteEffettuate: number;
    dataInvio?: string;
}

const STATO_LABELS: Record<string, { label: string; color: string }> = {
    DA_COMPILARE: { label: 'Da compilare', color: 'bg-gray-100 text-gray-700' },
    IN_COMPILAZIONE: { label: 'In compilazione', color: 'bg-yellow-100 text-yellow-800' },
    COMPLETATO: { label: 'Completato', color: 'bg-blue-100 text-blue-700' },
    INVIATO: { label: 'Inviato', color: 'bg-green-100 text-green-700' },
    CONFERMATO: { label: 'Confermato INAIL', color: 'bg-emerald-100 text-emerald-700' },
    ERRORE_INVIO: { label: 'Errore invio', color: 'bg-red-100 text-red-700' }
};

export const QuickActionAllegato3BModal: React.FC<QuickActionAllegato3BModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    companyId,
    companyName,
    operateHeaders
}) => {
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();
    const effectiveHeaders = operateHeaders || getOperateHeaders();

    // Form state
    const [formData, setFormData] = useState({
        medicoCompetenteId: '',
        anno: new Date().getFullYear() - 1, // Default: anno precedente
        note: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form quando si apre
    useEffect(() => {
        if (isOpen) {
            setFormData({
                medicoCompetenteId: '',
                anno: new Date().getFullYear() - 1,
                note: ''
            });
            setErrors({});
        }
    }, [isOpen]);

    // Fetch medici competenti
    const { data: mediciData, isLoading: isLoadingMedici } = useQuery({
        queryKey: ['medici-competenti', companyId],
        queryFn: async () => {
            // Cerca nomine MC attive per questa azienda
            // Endpoint: /api/v1/clinica/nomine-ruolo (singolare, con prefisso clinica)
            const response = await apiGet<{ data: MedicoOption[] }>(
                `/api/v1/clinica/nomine-ruolo?companyTenantProfileId=${companyId}&tipoRuolo=MEDICO_COMPETENTE&stato=ATTIVA&limit=50`
            );
            // Estrai le persone dalle nomine
            return (response.data || []).map((nomina: any) => nomina.person).filter(Boolean);
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!companyId
    });

    const medici = mediciData || [];

    // Fetch allegati esistenti per questa azienda
    const { data: existingData, isLoading: isLoadingExisting } = useQuery({
        queryKey: ['allegato3b-existing', companyId],
        queryFn: async () => {
            const response = await apiGet<{ success: boolean; data: Allegato3BExisting[] }>(
                `/api/v1/clinica/allegato-3b?companyTenantProfileId=${companyId}&limit=5`
            );
            return response.data || [];
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!companyId
    });

    const existingAllegati = existingData || [];

    // Check if allegato already exists for selected year
    const hasExistingForYear = existingAllegati.some(a => a.anno === formData.anno);

    // Mutation per creare Allegato 3B
    const createMutation = useMutation({
        mutationFn: async () => {
            return apiPost('/api/v1/clinica/allegato-3b', {
                companyTenantProfileId: companyId,
                medicoCompetenteId: formData.medicoCompetenteId,
                anno: formData.anno,
                note: formData.note || undefined
            }, { headers: effectiveHeaders });
        },
        onSuccess: () => {
            showToast({ type: 'success', message: 'Allegato 3B creato con successo' });
            onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la creazione' });
        }
    });

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!formData.medicoCompetenteId) {
            newErrors.medicoCompetenteId = 'Seleziona il Medico Competente';
        }
        if (!formData.anno || formData.anno < 2000 || formData.anno > 2100) {
            newErrors.anno = 'Anno non valido';
        }
        if (hasExistingForYear) {
            newErrors.anno = `Esiste già un Allegato 3B per l'anno ${formData.anno}`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData.medicoCompetenteId, formData.anno, hasExistingForYear]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            createMutation.mutate();
        }
    };

    const formatMedicoName = (medico: MedicoOption) => {
        const prefix = medico.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
        return `${prefix} ${medico.firstName} ${medico.lastName}`;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Allegato 3B - Relazione Annuale MC"
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Info azienda */}
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                {companyName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Relazione Annuale del Medico Competente (Art. 40 D.Lgs 81/08)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Allegati esistenti */}
                {existingAllegati.length > 0 && (
                    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-b dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Allegati esistenti</h4>
                        </div>
                        <div className="divide-y dark:divide-gray-700">
                            {existingAllegati.map((allegato) => {
                                const statoConfig = STATO_LABELS[allegato.stato] || STATO_LABELS.DA_COMPILARE;
                                return (
                                    <div key={allegato.id} className="px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium text-gray-900 dark:text-gray-100">Anno {allegato.anno}</span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-xs font-medium",
                                                statoConfig.color
                                            )}>
                                                {statoConfig.label}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-3">
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {allegato.totLavoratoriSorvegliati} lavoratori
                                            </span>
                                            {allegato.dataInvio && (
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <Send className="h-3 w-3" />
                                                    Inviato
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Medico Competente */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Stethoscope className="inline h-4 w-4 mr-1" />
                        Medico Competente *
                    </label>
                    {isLoadingMedici ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                    ) : medici.length === 0 ? (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                            Nessun Medico Competente nominato per questa azienda.
                            Utilizza la Quick Action "Nomina MC" per assegnarne uno.
                        </div>
                    ) : (
                        <select
                            value={formData.medicoCompetenteId}
                            onChange={(e) => setFormData(prev => ({ ...prev, medicoCompetenteId: e.target.value }))}
                            className={cn(
                                "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100",
                                errors.medicoCompetenteId ? "border-red-300 dark:border-red-700" : "border-gray-300 dark:border-gray-600"
                            )}
                        >
                            <option value="">Seleziona Medico Competente</option>
                            {medici.map((medico) => (
                                <option key={medico.id} value={medico.id}>
                                    {formatMedicoName(medico)}
                                </option>
                            ))}
                        </select>
                    )}
                    {errors.medicoCompetenteId && (
                        <p className="mt-1 text-xs text-red-600">{errors.medicoCompetenteId}</p>
                    )}
                </div>

                {/* Anno di riferimento */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        Anno di riferimento *
                    </label>
                    <select
                        value={formData.anno}
                        onChange={(e) => setFormData(prev => ({ ...prev, anno: parseInt(e.target.value) }))}
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100",
                            errors.anno ? "border-red-300 dark:border-red-700" : "border-gray-300 dark:border-gray-600"
                        )}
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 - i).map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    {errors.anno && (
                        <p className="mt-1 text-xs text-red-600">{errors.anno}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        La relazione viene compilata per l'anno precedente (scadenza 31 marzo)
                    </p>
                </div>

                {/* Note */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Note
                    </label>
                    <textarea
                        value={formData.note}
                        onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                        placeholder="Annotazioni aggiuntive..."
                    />
                </div>

                {/* Info */}
                <div className="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <Info className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        L'Allegato 3B deve essere inviato entro il 31 marzo di ogni anno
                        e riporta i dati aggregati sulla sorveglianza sanitaria dell'anno precedente.
                        I dati verranno auto-popolati dalle visite e giudizi registrati nel sistema.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                        disabled={createMutation.isPending}
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={createMutation.isPending || hasExistingForYear || medici.length === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {createMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creazione...
                            </>
                        ) : (
                            <>
                                <FileText className="h-4 w-4 mr-2" />
                                Crea Allegato 3B
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickActionAllegato3BModal;
