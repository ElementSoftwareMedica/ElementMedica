/**
 * AziendeRiconoscimentiSection Component
 * 
 * Sezione per la gestione delle aziende associate a una convenzione
 * e i loro riconoscimenti/premi.
 * 
 * Features:
 * - Associazione aziende a convenzione
 * - Definizione riconoscimenti (% o valore assoluto) per bundle/prestazione
 * - Tracking erogazioni per paziente
 * - Statistiche riconoscimenti
 * 
 * @module components/clinica/AziendeRiconoscimentiSection
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    Plus,
    Trash2,
    Edit2,
    ChevronDown,
    ChevronRight,
    Percent,
    Euro,
    Package,
    Activity,
    Loader2,
    Search,
    Calendar,
    User,
    Phone,
    Mail,
    Info,
    AlertCircle,
    Check,
    X,
    Save
} from 'lucide-react';
import { convenzioniApi, riconoscimentiApi, bundleApi, prestazioniApi } from '../../services/clinicaApi';
import { getCompanies } from '../../services/companies';
import type {
    ConvenzioneAzienda,
    ConvenzioneAziendaInput,
    RiconoscimentoConvenzione,
    RiconoscimentoConvenzioneInput,
    TipoRiconoscimento,
    OffertaBundle,
    Prestazione
} from '../../services/clinicaApi';
import { useToast } from '../../hooks/useToast';

// =====================================================
// TYPES
// =====================================================

interface Company {
    id: string;
    ragioneSociale: string;
    piva?: string;
    mail?: string;
    telefono?: string;
}

interface Props {
    convenzioneId: string;
    isEditing: boolean;
}

// =====================================================
// SUBCOMPONENTS
// =====================================================

interface RiconoscimentoFormProps {
    convenzioneAziendaId: string;
    onSuccess: () => void;
    onCancel: () => void;
    initialData?: RiconoscimentoConvenzione;
}

const RiconoscimentoForm: React.FC<RiconoscimentoFormProps> = ({
    convenzioneAziendaId,
    onSuccess,
    onCancel,
    initialData
}) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<{
        tipo: TipoRiconoscimento;
        valore: string;
        valoreMinimo: string;
        valoreMassimo: string;
        bundleId: string;
        prestazioneId: string;
        descrizione: string;
        dataFine: string;
    }>({
        tipo: initialData?.tipo || 'PERCENTUALE',
        valore: initialData?.valore?.toString() || '',
        valoreMinimo: initialData?.valoreMinimo?.toString() || '',
        valoreMassimo: initialData?.valoreMassimo?.toString() || '',
        bundleId: initialData?.bundleId || '',
        prestazioneId: initialData?.prestazioneId || '',
        descrizione: initialData?.descrizione || '',
        dataFine: initialData?.dataFine?.split('T')[0] || ''
    });
    const [targetType, setTargetType] = useState<'bundle' | 'prestazione'>(
        initialData?.bundleId ? 'bundle' : 'prestazione'
    );

    // Query bundles e prestazioni
    const { data: bundles = [] } = useQuery({
        queryKey: ['bundles-for-riconoscimento'],
        queryFn: async () => {
            const result = await bundleApi.getAll({ limit: 500, attivo: true });
            return result.data || [];
        }
    });

    const { data: prestazioni = [] } = useQuery({
        queryKey: ['prestazioni-for-riconoscimento'],
        queryFn: async () => {
            const result = await prestazioniApi.getAll({ limit: 500, attivo: true });
            return result.data || [];
        }
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: RiconoscimentoConvenzioneInput) => riconoscimentiApi.create(data),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Riconoscimento creato con successo' });
            onSuccess();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore nella creazione' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; payload: Partial<RiconoscimentoConvenzioneInput> }) =>
            riconoscimentiApi.update(data.id, data.payload),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Riconoscimento aggiornato con successo' });
            onSuccess();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore nell\'aggiornamento' });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload: RiconoscimentoConvenzioneInput = {
            convenzioneAziendaId,
            tipo: formData.tipo,
            valore: parseFloat(formData.valore),
            valoreMinimo: formData.valoreMinimo ? parseFloat(formData.valoreMinimo) : undefined,
            valoreMassimo: formData.valoreMassimo ? parseFloat(formData.valoreMassimo) : undefined,
            bundleId: targetType === 'bundle' ? formData.bundleId : undefined,
            prestazioneId: targetType === 'prestazione' ? formData.prestazioneId : undefined,
            descrizione: formData.descrizione || undefined,
            dataFine: formData.dataFine || undefined
        };

        if (initialData) {
            updateMutation.mutate({ id: initialData.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Euro className="w-4 h-4 text-teal-600" />
                <h4 className="font-medium text-gray-900">
                    {initialData ? 'Modifica Riconoscimento' : 'Nuovo Riconoscimento'}
                </h4>
            </div>

            {/* Target Type Selection */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => setTargetType('bundle')}
                    className={`p-3 rounded-lg border text-left transition-colors ${targetType === 'bundle'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                >
                    <Package className={`w-5 h-5 mb-1 ${targetType === 'bundle' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${targetType === 'bundle' ? 'text-purple-700' : 'text-gray-600'}`}>
                        Per Bundle
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setTargetType('prestazione')}
                    className={`p-3 rounded-lg border text-left transition-colors ${targetType === 'prestazione'
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                >
                    <Activity className={`w-5 h-5 mb-1 ${targetType === 'prestazione' ? 'text-teal-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${targetType === 'prestazione' ? 'text-teal-700' : 'text-gray-600'}`}>
                        Per Prestazione
                    </span>
                </button>
            </div>

            {/* Bundle/Prestazione Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {targetType === 'bundle' ? 'Bundle *' : 'Prestazione *'}
                </label>
                <select
                    value={targetType === 'bundle' ? formData.bundleId : formData.prestazioneId}
                    onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bundleId: targetType === 'bundle' ? e.target.value : '',
                        prestazioneId: targetType === 'prestazione' ? e.target.value : ''
                    }))}
                    className="input-clinica w-full"
                    required
                >
                    <option value="">Seleziona {targetType === 'bundle' ? 'bundle' : 'prestazione'}...</option>
                    {targetType === 'bundle'
                        ? bundles.map((b: OffertaBundle) => (
                            <option key={b.id} value={b.id}>
                                {b.nome} ({b.codice}) - €{Number(b.prezzoBundle || 0).toFixed(2)}
                            </option>
                        ))
                        : prestazioni.map((p: Prestazione) => (
                            <option key={p.id} value={p.id}>
                                {p.nome} ({p.codice}) - €{Number(p.prezzoBase || 0).toFixed(2)}
                            </option>
                        ))
                    }
                </select>
            </div>

            {/* Tipo e Valore */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo Riconoscimento *
                    </label>
                    <select
                        value={formData.tipo}
                        onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as TipoRiconoscimento }))}
                        className="input-clinica w-full"
                        required
                    >
                        <option value="PERCENTUALE">Percentuale (%)</option>
                        <option value="VALORE_ASSOLUTO">Valore Assoluto (€)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valore * {formData.tipo === 'PERCENTUALE' ? '(%)' : '(€)'}
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            step={formData.tipo === 'PERCENTUALE' ? '0.1' : '0.01'}
                            min="0"
                            max={formData.tipo === 'PERCENTUALE' ? '100' : undefined}
                            value={formData.valore}
                            onChange={(e) => setFormData(prev => ({ ...prev, valore: e.target.value }))}
                            className="input-clinica w-full pr-8"
                            placeholder={formData.tipo === 'PERCENTUALE' ? 'es. 10' : 'es. 50'}
                            required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {formData.tipo === 'PERCENTUALE' ? '%' : '€'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Limiti Min/Max (solo per percentuale) */}
            {formData.tipo === 'PERCENTUALE' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimo (€)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.valoreMinimo}
                            onChange={(e) => setFormData(prev => ({ ...prev, valoreMinimo: e.target.value }))}
                            className="input-clinica w-full"
                            placeholder="Minimo garantito"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Massimo (€)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.valoreMassimo}
                            onChange={(e) => setFormData(prev => ({ ...prev, valoreMassimo: e.target.value }))}
                            className="input-clinica w-full"
                            placeholder="Tetto massimo"
                        />
                    </div>
                </div>
            )}

            {/* Data Fine e Descrizione */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Fine (opzionale)
                    </label>
                    <input
                        type="date"
                        value={formData.dataFine}
                        onChange={(e) => setFormData(prev => ({ ...prev, dataFine: e.target.value }))}
                        className="input-clinica w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrizione
                    </label>
                    <input
                        type="text"
                        value={formData.descrizione}
                        onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                        className="input-clinica w-full"
                        placeholder="Nota descrittiva..."
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn-clinica-secondary"
                    disabled={isSubmitting}
                >
                    <X className="w-4 h-4 mr-1" />
                    Annulla
                </button>
                <button
                    type="submit"
                    className="btn-clinica"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-1" />
                    )}
                    {initialData ? 'Aggiorna' : 'Crea'}
                </button>
            </div>
        </form>
    );
};

// =====================================================
// AZIENDA CARD COMPONENT
// =====================================================

interface AziendaCardProps {
    associazione: ConvenzioneAzienda;
    convenzioneId: string;
    onUpdate: () => void;
}

const AziendaCard: React.FC<AziendaCardProps> = ({ associazione, convenzioneId, onUpdate }) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showRiconoscimentoForm, setShowRiconoscimentoForm] = useState(false);
    const [editingRiconoscimento, setEditingRiconoscimento] = useState<RiconoscimentoConvenzione | null>(null);

    // Mutation per rimuovere azienda
    const removeMutation = useMutation({
        mutationFn: () => convenzioniApi.removeAzienda(convenzioneId, associazione.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['convenzione-aziende', convenzioneId] });
            showToast({ type: 'success', message: 'Azienda rimossa dalla convenzione' });
            onUpdate();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore nella rimozione' });
        }
    });

    // Mutation per eliminare riconoscimento
    const deleteRiconoscimentoMutation = useMutation({
        mutationFn: (id: string) => riconoscimentiApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['convenzione-aziende', convenzioneId] });
            showToast({ type: 'success', message: 'Riconoscimento eliminato' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore nell\'eliminazione' });
        }
    });

    const handleRemove = () => {
        if (window.confirm('Sei sicuro di voler rimuovere questa azienda dalla convenzione?')) {
            removeMutation.mutate();
        }
    };

    const handleDeleteRiconoscimento = (id: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questo riconoscimento?')) {
            deleteRiconoscimentoMutation.mutate(id);
        }
    };

    const riconoscimenti = associazione.riconoscimenti || [];

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div
                className="p-4 bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-900">
                            {associazione.azienda?.ragioneSociale || 'Azienda'}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            {associazione.azienda?.piva && (
                                <span>P.IVA: {associazione.azienda.piva}</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${associazione.attiva ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {associazione.attiva ? 'Attiva' : 'Inattiva'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-sm text-gray-500 mr-2">
                        {riconoscimenti.length} riconosciment{riconoscimenti.length === 1 ? 'o' : 'i'}
                    </span>
                    <button
                        onClick={handleRemove}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        title="Rimuovi azienda"
                        disabled={removeMutation.isPending}
                    >
                        {removeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    {/* Info Azienda */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        {associazione.referenteAziendale && (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span>{associazione.referenteAziendale}</span>
                            </div>
                        )}
                        {(associazione.emailReferente || associazione.azienda?.mail) && (
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span>{associazione.emailReferente || associazione.azienda?.mail}</span>
                            </div>
                        )}
                        {(associazione.telefonoReferente || associazione.azienda?.telefono) && (
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>{associazione.telefonoReferente || associazione.azienda?.telefono}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>Dal {new Date(associazione.dataAdesione).toLocaleDateString('it-IT')}</span>
                        </div>
                        {associazione.dataFineAdesione && (
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>Al {new Date(associazione.dataFineAdesione).toLocaleDateString('it-IT')}</span>
                            </div>
                        )}
                    </div>

                    {/* Riconoscimenti List */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900 flex items-center gap-2">
                                <Euro className="w-4 h-4 text-teal-600" />
                                Riconoscimenti
                            </h5>
                            <button
                                onClick={() => setShowRiconoscimentoForm(true)}
                                className="btn-clinica-secondary text-sm"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Aggiungi
                            </button>
                        </div>

                        {riconoscimenti.length === 0 && !showRiconoscimentoForm ? (
                            <div className="text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
                                <Euro className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Nessun riconoscimento configurato</p>
                                <button
                                    onClick={() => setShowRiconoscimentoForm(true)}
                                    className="text-sm text-teal-600 hover:text-teal-700 mt-1"
                                >
                                    Aggiungi il primo riconoscimento
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {riconoscimenti.map((ric) => (
                                    <div
                                        key={ric.id}
                                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ric.bundleId ? 'bg-purple-100' : 'bg-teal-100'
                                                }`}>
                                                {ric.bundleId ? (
                                                    <Package className="w-4 h-4 text-purple-600" />
                                                ) : (
                                                    <Activity className="w-4 h-4 text-teal-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {ric.bundle?.nome || ric.prestazione?.nome || 'Riconoscimento'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {ric.tipo === 'PERCENTUALE'
                                                        ? `${ric.valore}%`
                                                        : `€${Number(ric.valore).toFixed(2)}`
                                                    }
                                                    {ric.valoreMinimo && ` (min €${Number(ric.valoreMinimo).toFixed(2)})`}
                                                    {ric.valoreMassimo && ` (max €${Number(ric.valoreMassimo).toFixed(2)})`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${ric.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {ric.attivo ? 'Attivo' : 'Inattivo'}
                                            </span>
                                            <button
                                                onClick={() => setEditingRiconoscimento(ric)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="Modifica"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRiconoscimento(ric.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Elimina"
                                                disabled={deleteRiconoscimentoMutation.isPending}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Form per nuovo/modifica riconoscimento */}
                        {(showRiconoscimentoForm || editingRiconoscimento) && (
                            <div className="mt-3">
                                <RiconoscimentoForm
                                    convenzioneAziendaId={associazione.id}
                                    initialData={editingRiconoscimento || undefined}
                                    onSuccess={() => {
                                        setShowRiconoscimentoForm(false);
                                        setEditingRiconoscimento(null);
                                        onUpdate();
                                    }}
                                    onCancel={() => {
                                        setShowRiconoscimentoForm(false);
                                        setEditingRiconoscimento(null);
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Note */}
                    {associazione.note && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                            <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                            <p className="text-sm text-amber-800">{associazione.note}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const AziendeRiconoscimentiSection: React.FC<Props> = ({ convenzioneId, isEditing }) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [showAddAzienda, setShowAddAzienda] = useState(false);
    const [searchAzienda, setSearchAzienda] = useState('');
    const [newAziendaData, setNewAziendaData] = useState<ConvenzioneAziendaInput>({
        aziendaId: '',
        referenteAziendale: '',
        emailReferente: '',
        telefonoReferente: '',
        note: ''
    });

    // Query aziende associate
    const { data: aziendeAssociate = [], isLoading: isLoadingAziende, refetch } = useQuery({
        queryKey: ['convenzione-aziende', convenzioneId],
        queryFn: () => convenzioniApi.getAziende(convenzioneId),
        enabled: !!convenzioneId && isEditing
    });

    // Query tutte le aziende
    const { data: allCompanies = [] } = useQuery({
        queryKey: ['companies-for-convenzione'],
        queryFn: () => getCompanies()
    });

    // Filtra aziende non ancora associate
    const availableCompanies = (allCompanies as Company[]).filter(
        c => !aziendeAssociate.some(a => a.aziendaId === c.id)
    ).filter(
        c => searchAzienda === '' ||
            c.ragioneSociale.toLowerCase().includes(searchAzienda.toLowerCase()) ||
            c.piva?.includes(searchAzienda)
    );

    // Mutation per aggiungere azienda
    const addAziendaMutation = useMutation({
        mutationFn: (data: ConvenzioneAziendaInput) =>
            convenzioniApi.associateAzienda(convenzioneId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['convenzione-aziende', convenzioneId] });
            showToast({ type: 'success', message: 'Azienda associata con successo' });
            setShowAddAzienda(false);
            setNewAziendaData({
                aziendaId: '',
                referenteAziendale: '',
                emailReferente: '',
                telefonoReferente: '',
                note: ''
            });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore nell\'associazione' });
        }
    });

    const handleAddAzienda = () => {
        if (!newAziendaData.aziendaId) {
            showToast({ type: 'error', message: 'Seleziona un\'azienda' });
            return;
        }
        addAziendaMutation.mutate(newAziendaData);
    };

    if (!isEditing) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Aziende e Riconoscimenti</h3>
                </div>
                <div className="text-center py-8 text-gray-500">
                    <Info className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p>Salva la convenzione per gestire le aziende associate</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Aziende e Riconoscimenti</h3>
                        <p className="text-sm text-gray-500">
                            Gestisci le aziende in convenzione e i riconoscimenti per bundle/prestazioni
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddAzienda(true)}
                    className="btn-clinica text-sm"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Aggiungi Azienda
                </button>
            </div>

            {/* Add Azienda Form */}
            {showAddAzienda && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-blue-600" />
                        Associa Nuova Azienda
                    </h4>

                    <div className="space-y-3">
                        {/* Search and Select */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchAzienda}
                                onChange={(e) => setSearchAzienda(e.target.value)}
                                placeholder="Cerca azienda per nome o P.IVA..."
                                className="input-clinica pl-10 w-full"
                            />
                        </div>

                        <select
                            value={newAziendaData.aziendaId}
                            onChange={(e) => setNewAziendaData(prev => ({ ...prev, aziendaId: e.target.value }))}
                            className="input-clinica w-full"
                        >
                            <option value="">Seleziona azienda...</option>
                            {availableCompanies.map((c: Company) => (
                                <option key={c.id} value={c.id}>
                                    {c.ragioneSociale} {c.piva ? `(${c.piva})` : ''}
                                </option>
                            ))}
                        </select>

                        {/* Optional Fields */}
                        <div className="grid grid-cols-3 gap-3">
                            <input
                                type="text"
                                value={newAziendaData.referenteAziendale}
                                onChange={(e) => setNewAziendaData(prev => ({ ...prev, referenteAziendale: e.target.value }))}
                                placeholder="Referente aziendale"
                                className="input-clinica"
                            />
                            <input
                                type="email"
                                value={newAziendaData.emailReferente}
                                onChange={(e) => setNewAziendaData(prev => ({ ...prev, emailReferente: e.target.value }))}
                                placeholder="Email referente"
                                className="input-clinica"
                            />
                            <input
                                type="tel"
                                value={newAziendaData.telefonoReferente}
                                onChange={(e) => setNewAziendaData(prev => ({ ...prev, telefonoReferente: e.target.value }))}
                                placeholder="Telefono referente"
                                className="input-clinica"
                            />
                        </div>

                        <textarea
                            value={newAziendaData.note}
                            onChange={(e) => setNewAziendaData(prev => ({ ...prev, note: e.target.value }))}
                            placeholder="Note..."
                            rows={2}
                            className="input-clinica w-full resize-none"
                        />

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowAddAzienda(false)}
                                className="btn-clinica-secondary"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleAddAzienda}
                                className="btn-clinica"
                                disabled={addAziendaMutation.isPending || !newAziendaData.aziendaId}
                            >
                                {addAziendaMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4 mr-1" />
                                )}
                                Associa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Aziende List */}
            {isLoadingAziende ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : aziendeAssociate.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Nessuna azienda associata</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Associa aziende per configurare riconoscimenti specifici
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {aziendeAssociate.map((associazione) => (
                        <AziendaCard
                            key={associazione.id}
                            associazione={associazione}
                            convenzioneId={convenzioneId}
                            onUpdate={() => refetch()}
                        />
                    ))}
                </div>
            )}

            {/* Info Footer */}
            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                    <p className="font-medium">Come funzionano i riconoscimenti</p>
                    <ul className="mt-1 space-y-0.5 text-amber-700">
                        <li>• <strong>Percentuale</strong>: Calcola una % sul prezzo della prestazione/bundle</li>
                        <li>• <strong>Valore assoluto</strong>: Importo fisso indipendente dal prezzo</li>
                        <li>• I riconoscimenti vengono tracciati per ogni paziente dell'azienda</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AziendeRiconoscimentiSection;
