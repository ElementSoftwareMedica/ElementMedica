/**
 * ProtocolloFormModal - Form per creazione/modifica protocollo sanitario
 * 
 * Modal form per gestire protocolli sanitari con prestazioni associate.
 * Supporta suggerimento automatico basato su rischi mansione.
 * 
 * @module pages/clinica/mdl/components/ProtocolloFormModal
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 2
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    X,
    Plus,
    Trash2,
    Loader2,
    Sparkles,
    FileText,
    ClipboardCheck,
    Info
} from 'lucide-react';
import {
    clinicaApi,
    type ProtocolloSanitario,
    type ProtocolloPrestazioneInput,
    type TipoPeriodicita,
    type Prestazione
} from '../../../../services/clinicaApi';
import { getQuestionariTemplates } from '../../../../services/questionariService';
import { useToast } from '../../../../hooks/useToast';
import Modal from '../../../../design-system/molecules/Modal/Modal';

interface ProtocolloFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    protocollo?: ProtocolloSanitario | null;
}

// Periodicity options - Aligned with Prisma TipoPeriodicita enum
const PERIODICITA_OPTIONS: { value: TipoPeriodicita; label: string }[] = [
    { value: 'MESI_6', label: 'Semestrale (6 mesi)' },
    { value: 'MESI_12', label: 'Annuale (12 mesi)' },
    { value: 'MESI_24', label: 'Biennale (24 mesi)' },
    { value: 'MESI_36', label: 'Triennale (36 mesi)' },
    { value: 'MESI_60', label: 'Quinquennale (60 mesi)' },
    { value: 'SU_INDICAZIONE', label: 'Su indicazione MC' },
    { value: 'UNA_TANTUM', label: 'Una tantum' }
];

interface PrestazioneFormData {
    id?: string;
    prestazioneId: string;
    isObbligatoria: boolean;
    periodicita: TipoPeriodicita;
    condizioniApplicazione: string;
    note: string;
    // For display
    prestazioneName?: string;
}

const ProtocolloFormModal: React.FC<ProtocolloFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    protocollo
}) => {
    const { showToast } = useToast();
    const isEditing = !!protocollo;

    // Form state
    const [formData, setFormData] = useState({
        codice: '',
        denominazione: '',
        descrizione: '',
        mansioniIds: [] as string[],
        siteId: '',
        periodicitaVisiteMesi: 12,
        isAttivo: true,
        note: ''
    });

    const [prestazioni, setPrestazioni] = useState<PrestazioneFormData[]>([]);
    const [selectedQuestionariIds, setSelectedQuestionariIds] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showAddPrestazione, setShowAddPrestazione] = useState(false);
    const [newPrestazioneId, setNewPrestazioneId] = useState('');

    // Fetch sedi
    const { data: sediData } = useQuery({
        queryKey: ['sedi-select'],
        queryFn: () => clinicaApi.sedi.getAll({ limit: 100 }),
        staleTime: 5 * 60 * 1000
    });

    // Fetch mansioni
    const { data: mansioniData } = useQuery({
        queryKey: ['mansioni-select'],
        queryFn: () => clinicaApi.mansioni.getAll({ limit: 100 }),
        staleTime: 5 * 60 * 1000
    });

    // Fetch prestazioni catalog
    const { data: prestazioniData } = useQuery({
        queryKey: ['prestazioni-select'],
        queryFn: () => clinicaApi.prestazioni.getAll({ limit: 200 }),
        staleTime: 5 * 60 * 1000
    });

    // Fetch questionari catalog
    const { data: questionariData } = useQuery({
        queryKey: ['questionari-select'],
        queryFn: () => getQuestionariTemplates({ isActive: true, limit: 200 }),
        staleTime: 5 * 60 * 1000
    });

    const sedi = sediData?.data || [];
    const mansioni = mansioniData?.data || [];
    const prestazioniCatalog = prestazioniData?.data || [];
    const questionariCatalog = questionariData?.data || [];

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: typeof formData & { prestazioni: ProtocolloPrestazioneInput[] }) =>
            clinicaApi.protocolliSanitari.create(data),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Protocollo creato con successo' });
            onSuccess();
            handleClose();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la creazione' });
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: typeof formData & { prestazioni: ProtocolloPrestazioneInput[] } }) =>
            clinicaApi.protocolliSanitari.update(id, data),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Protocollo aggiornato con successo' });
            onSuccess();
            handleClose();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento' });
        }
    });

    // Suggest mutation (auto-fill from mansione risks)
    const suggestMutation = useMutation({
        mutationFn: (mansioneId: string) => clinicaApi.protocolliSanitari.suggest(mansioneId),
        onSuccess: (data) => {
            const suggerite = data?.prestazioniSuggerite;
            if (suggerite && suggerite.length > 0) {
                const newPrestazioni: PrestazioneFormData[] = suggerite.map((p: { prestazioneId: string; prestazione: { id: string; nome: string }; isObbligatoria: boolean; periodicita: string; rischiCorrelati?: string[] }) => ({
                    prestazioneId: p.prestazioneId,
                    isObbligatoria: p.isObbligatoria,
                    periodicita: p.periodicita as TipoPeriodicita,
                    condizioniApplicazione: p.rischiCorrelati?.length ? `Da rischi: ${p.rischiCorrelati.join(', ')}` : '',
                    note: '',
                    prestazioneName: p.prestazione.nome
                }));
                setPrestazioni(prev => {
                    // Merge, avoiding duplicates
                    const existingIds = prev.map(p => p.prestazioneId);
                    const toAdd = newPrestazioni.filter(p => !existingIds.includes(p.prestazioneId));
                    return [...prev, ...toAdd];
                });
                showToast({
                    type: 'success',
                    message: `${suggerite.length} prestazioni suggerite aggiunte`
                });
            } else {
                showToast({
                    type: 'info',
                    message: 'Nessuna prestazione suggerita per questa mansione'
                });
            }
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nel suggerimento' });
        }
    });

    // Populate form when editing
    useEffect(() => {
        if (protocollo) {
            // M:N mansioni: prefer mansioniAssociate, fallback to single mansioneId
            const mansioniIds = (protocollo as any).mansioniAssociate?.length
                ? (protocollo as any).mansioniAssociate.map((ma: any) => ma.mansioneId || ma.mansione?.id)
                : (protocollo.mansioneId ? [protocollo.mansioneId] : []);

            setFormData({
                codice: protocollo.codice || '',
                denominazione: protocollo.denominazione || '',
                descrizione: protocollo.descrizione || '',
                mansioniIds,
                siteId: protocollo.siteId || '',
                periodicitaVisiteMesi: protocollo.periodicitaVisiteMesi || 12,
                isAttivo: protocollo.isAttivo !== false,
                note: protocollo.note || ''
            });

            if (protocollo.prestazioni) {
                setPrestazioni(protocollo.prestazioni.map(p => ({
                    id: p.id,
                    prestazioneId: p.prestazioneId,
                    isObbligatoria: p.isObbligatoria,
                    periodicita: p.periodicita || 'MESI_12',  // Default: annuale
                    condizioniApplicazione: p.condizioniApplicazione || '',
                    note: p.note || '',
                    prestazioneName: p.prestazione?.nome
                })));
            }

            // Populate questionari from M:1 relation
            const qIds = ((protocollo as any).questionari || []).map((q: any) => q.id);
            setSelectedQuestionariIds(qIds);
        } else {
            // Reset form for new
            setFormData({
                codice: '',
                denominazione: '',
                descrizione: '',
                mansioniIds: [],
                siteId: '',
                periodicitaVisiteMesi: 12,
                isAttivo: true,
                note: ''
            });
            setPrestazioni([]);
            setSelectedQuestionariIds([]);
        }
        setErrors({});
    }, [protocollo, isOpen]);

    // Handlers
    const handleClose = useCallback(() => {
        setFormData({
            codice: '',
            denominazione: '',
            descrizione: '',
            mansioniIds: [],
            siteId: '',
            periodicitaVisiteMesi: 12,
            isAttivo: true,
            note: ''
        });
        setPrestazioni([]);
        setSelectedQuestionariIds([]);
        setErrors({});
        setShowAddPrestazione(false);
        setNewPrestazioneId('');
        onClose();
    }, [onClose]);

    const handleInputChange = useCallback((field: string, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    }, [errors]);

    // Toggle mansione in the multi-select array
    const handleToggleMansione = useCallback((mansioneId: string) => {
        setFormData(prev => {
            const isSelected = prev.mansioniIds.includes(mansioneId);
            const mansioniIds = isSelected
                ? prev.mansioniIds.filter(id => id !== mansioneId)
                : [...prev.mansioniIds, mansioneId];
            return { ...prev, mansioniIds };
        });
        // Auto-suggest prestazioni when adding a mansione (only for new protocolli)
        if (!isEditing) {
            suggestMutation.mutate(mansioneId);
        }
    }, [isEditing, suggestMutation]);

    const handleAddPrestazione = useCallback(() => {
        if (!newPrestazioneId) return;

        const prestazione = prestazioniCatalog.find(p => p.id === newPrestazioneId);
        if (!prestazione) return;

        // Check if already added
        if (prestazioni.some(p => p.prestazioneId === newPrestazioneId)) {
            showToast({ type: 'warning', message: 'Prestazione già presente nel protocollo' });
            return;
        }

        setPrestazioni(prev => [...prev, {
            prestazioneId: newPrestazioneId,
            isObbligatoria: true,
            periodicita: 'MESI_12',  // Default: annuale
            condizioniApplicazione: '',
            note: '',
            prestazioneName: prestazione.nome
        }]);

        setNewPrestazioneId('');
        setShowAddPrestazione(false);
    }, [newPrestazioneId, prestazioniCatalog, prestazioni, showToast]);

    const handleRemovePrestazione = useCallback((index: number) => {
        setPrestazioni(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handlePrestazioneChange = useCallback((index: number, field: string, value: string | boolean) => {
        setPrestazioni(prev => prev.map((p, i) =>
            i === index ? { ...p, [field]: value } : p
        ));
    }, []);

    const handleSuggest = useCallback(() => {
        if (formData.mansioniIds.length > 0) {
            // Suggest from the first selected mansione (union is done by toggle handler)
            formData.mansioniIds.forEach(mId => suggestMutation.mutate(mId));
        } else {
            showToast({ type: 'warning', message: 'Seleziona prima almeno una mansione' });
        }
    }, [formData.mansioniIds, suggestMutation, showToast]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!formData.codice.trim()) {
            newErrors.codice = 'Codice obbligatorio';
        }
        if (!formData.denominazione.trim()) {
            newErrors.denominazione = 'Denominazione obbligatoria';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        const submitData = {
            ...formData,
            questionariIds: selectedQuestionariIds,
            prestazioni: prestazioni.map(p => ({
                prestazioneId: p.prestazioneId,
                isObbligatoria: p.isObbligatoria,
                periodicita: p.periodicita,
                condizioniApplicazione: p.condizioniApplicazione || undefined,
                note: p.note || undefined
            }))
        };

        if (isEditing && protocollo) {
            updateMutation.mutate({ id: protocollo.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    }, [formData, prestazioni, selectedQuestionariIds, validate, isEditing, protocollo, createMutation, updateMutation]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={isEditing ? 'Modifica Protocollo Sanitario' : 'Nuovo Protocollo Sanitario'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Codice *
                        </label>
                        <input
                            type="text"
                            value={formData.codice}
                            onChange={(e) => handleInputChange('codice', e.target.value)}
                            placeholder="es. PS-001"
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${errors.codice ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        {errors.codice && (
                            <p className="text-red-500 text-xs mt-1">{errors.codice}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Denominazione *
                        </label>
                        <input
                            type="text"
                            value={formData.denominazione}
                            onChange={(e) => handleInputChange('denominazione', e.target.value)}
                            placeholder="Nome del protocollo sanitario"
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${errors.denominazione ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        {errors.denominazione && (
                            <p className="text-red-500 text-xs mt-1">{errors.denominazione}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrizione
                    </label>
                    <textarea
                        value={formData.descrizione}
                        onChange={(e) => handleInputChange('descrizione', e.target.value)}
                        placeholder="Descrizione del protocollo..."
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                </div>

                {/* Association */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Mansioni Associate
                    </h3>
                    {errors.association && (
                        <p className="text-red-500 text-xs mb-2">{errors.association}</p>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mansioni ({formData.mansioniIds.length} selezionate)
                        </label>
                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg bg-white p-2 space-y-1">
                            {mansioni.length === 0 && (
                                <p className="text-xs text-gray-400 p-2">Nessuna mansione disponibile</p>
                            )}
                            {mansioni.map(m => (
                                <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-teal-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.mansioniIds.includes(m.id)}
                                        onChange={() => handleToggleMansione(m.id)}
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-sm text-gray-700">{m.denominazione} <span className="text-gray-400">({m.codice})</span></span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Prestazioni */}
                <div className="border border-gray-200 rounded-lg">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Prestazioni nel Protocollo ({prestazioni.length})
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleSuggest}
                                disabled={formData.mansioniIds.length === 0 || suggestMutation.isPending}
                                className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {suggestMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                Suggerisci da Mansione
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddPrestazione(true)}
                                className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" />
                                Aggiungi
                            </button>
                        </div>
                    </div>

                    {/* Add prestazione inline */}
                    {showAddPrestazione && (
                        <div className="px-4 py-3 bg-teal-50 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <select
                                    value={newPrestazioneId}
                                    onChange={(e) => setNewPrestazioneId(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="">-- Seleziona prestazione --</option>
                                    {prestazioniCatalog.map(p => (
                                        <option key={p.id} value={p.id}>{p.nome} ({p.codice})</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleAddPrestazione}
                                    disabled={!newPrestazioneId}
                                    className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    Aggiungi
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddPrestazione(false);
                                        setNewPrestazioneId('');
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="divide-y divide-gray-200 max-h-[250px] overflow-y-auto">
                        {prestazioni.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">
                                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p>Nessuna prestazione aggiunta</p>
                                <p className="text-xs mt-1">
                                    Usa "Suggerisci da Mansione" o aggiungi manualmente
                                </p>
                            </div>
                        ) : (
                            prestazioni.map((prest, index) => (
                                <div key={index} className="px-4 py-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                                {prest.prestazioneName || 'Prestazione'}
                                            </p>
                                            <div className="mt-2 grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">
                                                        Periodicità
                                                    </label>
                                                    <select
                                                        value={prest.periodicita}
                                                        onChange={(e) => handlePrestazioneChange(index, 'periodicita', e.target.value)}
                                                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-teal-500"
                                                    >
                                                        {PERIODICITA_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex items-end">
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={prest.isObbligatoria}
                                                            onChange={(e) => handlePrestazioneChange(index, 'isObbligatoria', e.target.checked)}
                                                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                        Obbligatoria
                                                    </label>
                                                </div>
                                            </div>
                                            {prest.condizioniApplicazione && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {prest.condizioniApplicazione}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePrestazione(index)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Questionari */}
                <div className="border border-gray-200 rounded-lg">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            Questionari nel Protocollo ({selectedQuestionariIds.length})
                        </h3>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                        {questionariCatalog.length === 0 ? (
                            <p className="text-xs text-gray-400 p-3 text-center">Nessun questionario disponibile</p>
                        ) : (
                            questionariCatalog.map((q: any) => (
                                <label key={q.questionarioConfig?.id || q.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-purple-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedQuestionariIds.includes(q.questionarioConfig?.id)}
                                        onChange={() => {
                                            const configId = q.questionarioConfig?.id;
                                            if (!configId) return;
                                            setSelectedQuestionariIds(prev =>
                                                prev.includes(configId)
                                                    ? prev.filter(id => id !== configId)
                                                    : [...prev, configId]
                                            );
                                        }}
                                        disabled={!q.questionarioConfig?.id}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        {q.nome}
                                        {q.codice && <span className="text-gray-400 ml-1">({q.codice})</span>}
                                    </span>
                                    {q.questionarioConfig?.compilabileDa && (
                                        <span className="text-xs text-gray-400 ml-auto">
                                            {q.questionarioConfig.compilabileDa === 'MEDICO' ? 'Medico' : q.questionarioConfig.compilabileDa === 'PAZIENTE' ? 'Paziente' : q.questionarioConfig.compilabileDa}
                                        </span>
                                    )}
                                </label>
                            ))
                        )}
                    </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.isAttivo}
                            onChange={(e) => handleInputChange('isAttivo', e.target.checked)}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-5 w-5"
                        />
                        <span className="text-sm font-medium text-gray-700">Protocollo attivo</span>
                    </label>
                </div>

                {/* Note */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Note
                    </label>
                    <textarea
                        value={formData.note}
                        onChange={(e) => handleInputChange('note', e.target.value)}
                        placeholder="Note aggiuntive..."
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={isPending}
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isEditing ? 'Aggiorna' : 'Crea'} Protocollo
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ProtocolloFormModal;
