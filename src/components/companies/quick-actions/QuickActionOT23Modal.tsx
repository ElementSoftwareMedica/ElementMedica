/**
 * QuickActionOT23Modal - Modal per gestione OT23 da CompanyDetails
 * 
 * Modal per creare/gestire domanda riduzione tasso medio tariffa INAIL (OT23)
 * 
 * @module components/companies/quick-actions/QuickActionOT23Modal
 * @project P59 - ElementSicurezza Enhancement
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Loader2,
    FileText,
    Calendar,
    TrendingDown,
    Info,
    CheckCircle2,
    Euro,
    Calculator
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { ElegantSelect } from '../../ui/ElegantSelect';
import { apiGet, apiPost } from '../../../services/api';
import { cn } from '../../../design-system/utils';
import { useTenantMode } from '../../../contexts/TenantModeContext';

interface QuickActionOT23ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyId: string;
    companyName: string;
    /** Multi-tenant operation headers (X-Operate-Tenant-Id) */
    operateHeaders?: Record<string, string>;
}

interface OT23Existing {
    id: string;
    anno: number;
    stato: string;
    punteggioTotale: number;
    haRequisitiBeneficio: boolean;
}

const STATO_LABELS: Record<string, { label: string; color: string }> = {
    BOZZA: { label: 'Bozza', color: 'bg-gray-100 text-gray-700' },
    IN_COMPILAZIONE: { label: 'In compilazione', color: 'bg-yellow-100 text-yellow-800' },
    COMPLETATA: { label: 'Completata', color: 'bg-blue-100 text-blue-700' },
    INVIATA: { label: 'Inviata', color: 'bg-indigo-100 text-indigo-700' },
    APPROVATA: { label: 'Approvata', color: 'bg-green-100 text-green-700' },
    RESPINTA: { label: 'Respinta', color: 'bg-red-100 text-red-700' }
};

export const QuickActionOT23Modal: React.FC<QuickActionOT23ModalProps> = ({
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
        anno: new Date().getFullYear(),
        pat: '',
        premioAnnuale: '',
        note: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form quando si apre
    useEffect(() => {
        if (isOpen) {
            setFormData({
                anno: new Date().getFullYear(),
                pat: '',
                premioAnnuale: '',
                note: ''
            });
            setErrors({});
        }
    }, [isOpen]);

    // Fetch domande OT23 esistenti per questa azienda
    const { data: existingData, isLoading: isLoadingExisting } = useQuery({
        queryKey: ['ot23-existing', companyId],
        queryFn: async () => {
            const response = await apiGet<{ success: boolean; data: OT23Existing[] }>(
                `/api/v1/sicurezza/ot23?companyTenantProfileId=${companyId}&limit=5`
            );
            return response.data || [];
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!companyId
    });

    const existingDomande = existingData || [];

    // Check if domanda already exists for selected year
    const hasExistingForYear = existingDomande.some(d => d.anno === formData.anno);

    // Mutation per creare OT23
    const createMutation = useMutation({
        mutationFn: async () => {
            return apiPost('/api/v1/sicurezza/ot23', {
                companyTenantProfileId: companyId,
                anno: formData.anno,
                pat: formData.pat || undefined,
                premioAnnuale: formData.premioAnnuale ? parseFloat(formData.premioAnnuale) : undefined,
                note: formData.note || undefined
            }, { headers: effectiveHeaders });
        },
        onSuccess: () => {
            showToast({ type: 'success', message: 'Domanda OT23 creata con successo' });
            onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la creazione' });
        }
    });

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!formData.anno || formData.anno < 2000 || formData.anno > 2100) {
            newErrors.anno = 'Anno non valido';
        }
        if (hasExistingForYear) {
            newErrors.anno = `Esiste già una domanda OT23 per l'anno ${formData.anno}`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData.anno, hasExistingForYear]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            createMutation.mutate();
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Domanda OT23 - Riduzione Tasso INAIL"
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Info azienda */}
                <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700">
                    <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-800 text-teal-600 dark:text-teal-300">
                            <TrendingDown className="h-5 w-5" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">
                                {companyName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Modello OT23 per riduzione tasso medio di tariffa
                            </p>
                        </div>
                    </div>
                </div>

                {/* Domande esistenti */}
                {existingDomande.length > 0 && (
                    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-b dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Domande esistenti</h4>
                        </div>
                        <div className="divide-y dark:divide-gray-700">
                            {existingDomande.map((domanda) => {
                                const statoConfig = STATO_LABELS[domanda.stato] || STATO_LABELS.BOZZA;
                                return (
                                    <div key={domanda.id} className="px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium text-gray-900 dark:text-gray-100">Anno {domanda.anno}</span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-xs font-medium",
                                                statoConfig.color
                                            )}>
                                                {statoConfig.label}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <Calculator className="h-3 w-3" />
                                            {domanda.punteggioTotale} punti
                                            {domanda.haRequisitiBeneficio && (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Anno di riferimento */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        Anno di riferimento *
                    </label>
                    <ElegantSelect
                        value={String(formData.anno)}
                        onChange={(v) => setFormData(prev => ({ ...prev, anno: parseInt(v) }))}
                        options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => ({
                            value: String(year),
                            label: String(year)
                        }))}
                    />
                    {errors.anno && (
                        <p className="mt-1 text-xs text-red-600">{errors.anno}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        La domanda per l'anno X consente riduzione per l'anno X+1
                    </p>
                </div>

                {/* PAT INAIL */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <FileText className="inline h-4 w-4 mr-1" />
                        PAT (Posizione Assicurativa Territoriale)
                    </label>
                    <input
                        type="text"
                        value={formData.pat}
                        onChange={(e) => setFormData(prev => ({ ...prev, pat: e.target.value }))}
                        placeholder="Es. 12345678"
                        maxLength={20}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Codice PAT dell'azienda presso INAIL
                    </p>
                </div>

                {/* Premio Annuale */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Euro className="inline h-4 w-4 mr-1" />
                        Premio Annuale INAIL (opzionale)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">€</span>
                        <input
                            type="number"
                            value={formData.premioAnnuale}
                            onChange={(e) => setFormData(prev => ({ ...prev, premioAnnuale: e.target.value }))}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                        />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Utilizzato per calcolare il risparmio stimato
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
                        placeholder="Annotazioni, riferimenti..."
                    />
                </div>

                {/* Info */}
                <div className="flex items-start p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                    <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="ml-2 text-xs text-blue-700 dark:text-blue-300">
                        Il modello OT23 consente alle aziende di ottenere una riduzione del tasso medio
                        di tariffa INAIL se dimostrano di aver effettuato interventi di prevenzione
                        per almeno 100 punti.
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
                        disabled={createMutation.isPending || hasExistingForYear}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {createMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creazione...
                            </>
                        ) : (
                            <>
                                <TrendingDown className="h-4 w-4 mr-2" />
                                Crea Domanda OT23
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickActionOT23Modal;
