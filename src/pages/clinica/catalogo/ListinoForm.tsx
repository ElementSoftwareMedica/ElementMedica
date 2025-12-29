/**
 * ListinoPrezzoForm Component
 * 
 * Form per creazione/modifica prezzi listino.
 * Allineato completamente allo schema Prisma ListinoPrezzo.
 * 
 * Campi Prisma supportati:
 * - prestazioneId (required)
 * - poliambulatorioId (optional)
 * - convenzioneId (optional)
 * - nome (optional, es. "Prezzo Speciale Estate")
 * - prezzo (required, decimal 0-99999.99)
 * - ivaAliquota (decimal 0-100, default 0)
 * - validoDa (datetime, default now)
 * - validoA (datetime, optional)
 * - attivo (boolean, default true)
 * 
 * @module pages/poliambulatorio/catalogo/ListinoForm
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Save,
    Loader2,
    Euro,
    Calendar,
    Building2,
    FileText,
    Info
} from 'lucide-react';
import { listiniApi, prestazioniApi, poliambulatoriApi, convenzioniApi, mediciApi } from '../../../services/clinicaApi';
import type { ListinoPrezzo, Prestazione, Poliambulatorio, Convenzione, Medico } from '../../../services/clinicaApi';
import { User } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

interface FormData {
    prestazioneId: string;
    poliambulatorioId: string;
    convenzioneId: string;
    medicoId: string;
    nome: string;
    prezzo: string;
    ivaAliquota: string;
    validoDa: string;
    validoA: string;
    attivo: boolean;
}

interface FormErrors {
    [key: string]: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const IVA_PRESETS = [
    { value: '0', label: 'Esente' },
    { value: '4', label: '4%' },
    { value: '10', label: '10%' },
    { value: '22', label: '22%' }
];

const getInitialFormData = (prestazioneId?: string): FormData => ({
    prestazioneId: prestazioneId || '',
    poliambulatorioId: '',
    convenzioneId: '',
    medicoId: '',
    nome: '',
    prezzo: '',
    ivaAliquota: '0',
    validoDa: new Date().toISOString().split('T')[0],
    validoA: '',
    attivo: true,
});

// =====================================================
// MAIN COMPONENT
// =====================================================

const ListinoForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const isEditing = Boolean(id);

    // Preselect prestazione from URL
    const preselectedPrestazioneId = searchParams.get('prestazioneId') || '';

    // State
    const [formData, setFormData] = useState<FormData>(getInitialFormData(preselectedPrestazioneId));
    const [errors, setErrors] = useState<FormErrors>({});
    const [isDirty, setIsDirty] = useState(false);

    // Queries for dropdowns
    const { data: prestazioniResponse } = useQuery({
        queryKey: ['prestazioni'],
        queryFn: () => prestazioniApi.getAll()
    });

    const { data: poliambulatoriResponse } = useQuery({
        queryKey: ['poliambulatori'],
        queryFn: () => poliambulatoriApi.getAll()
    });

    const { data: convenzioniResponse } = useQuery({
        queryKey: ['convenzioni'],
        queryFn: () => convenzioniApi.getAll()
    });

    const { data: mediciResponse } = useQuery({
        queryKey: ['medici'],
        queryFn: () => mediciApi.getAll({ limit: 500 })
    });

    // Query for editing
    const { data: listino, isLoading: isLoadingListino } = useQuery({
        queryKey: ['listini', id],
        queryFn: () => listiniApi.getById(id!),
        enabled: isEditing,
    });

    // Populate form when editing
    useEffect(() => {
        if (listino) {
            setFormData({
                prestazioneId: listino.prestazioneId || '',
                poliambulatorioId: listino.poliambulatorioId || '',
                convenzioneId: listino.convenzioneId || '',
                medicoId: listino.medicoId || '',
                nome: listino.nome || '',
                prezzo: listino.prezzo ? String(listino.prezzo) : '',
                ivaAliquota: listino.ivaAliquota ? String(listino.ivaAliquota) : '0',
                validoDa: listino.validoDa ? listino.validoDa.split('T')[0] : '',
                validoA: listino.validoA ? listino.validoA.split('T')[0] : '',
                attivo: listino.attivo ?? true,
            });
        }
    }, [listino]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<ListinoPrezzo>) => listiniApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini'] });
            showToast({ type: 'success', message: 'Prezzo listino creato con successo' });
            navigate('/poliambulatorio/catalogo/listini');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore durante la creazione' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: Partial<ListinoPrezzo>) => listiniApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini'] });
            queryClient.invalidateQueries({ queryKey: ['listini', id] });
            showToast({ type: 'success', message: 'Prezzo listino aggiornato con successo' });
            navigate('/poliambulatorio/catalogo/listini');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore durante l\'aggiornamento' });
        }
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    // Extract arrays from paginated responses
    const prestazioniList = prestazioniResponse?.data || [];
    const poliambulatoriList = poliambulatoriResponse?.data || [];
    const convenzioniList = convenzioniResponse?.data || [];
    const mediciList = mediciResponse?.data || [];

    // Get selected prestazione for preview
    const selectedPrestazione = prestazioniList.find((p: Prestazione) => p.id === formData.prestazioneId);

    // Validation - aligned with backend Joi schema
    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        // prestazioneId: required
        if (!formData.prestazioneId) {
            newErrors.prestazioneId = 'Seleziona una prestazione';
        }

        // prezzo: required, 0-99999.99
        if (!formData.prezzo) {
            newErrors.prezzo = 'Il prezzo è obbligatorio';
        } else {
            const prezzo = parseFloat(formData.prezzo);
            if (isNaN(prezzo) || prezzo < 0) {
                newErrors.prezzo = 'Il prezzo deve essere un numero positivo';
            } else if (prezzo > 99999.99) {
                newErrors.prezzo = 'Il prezzo massimo è 99.999,99 €';
            }
        }

        // ivaAliquota: 0-100
        const iva = parseFloat(formData.ivaAliquota);
        if (isNaN(iva) || iva < 0 || iva > 100) {
            newErrors.ivaAliquota = 'L\'aliquota IVA deve essere tra 0 e 100';
        }

        // validoDa: required
        if (!formData.validoDa) {
            newErrors.validoDa = 'La data inizio validità è obbligatoria';
        }

        // validoA: must be > validoDa
        if (formData.validoA && formData.validoDa && new Date(formData.validoA) <= new Date(formData.validoDa)) {
            newErrors.validoA = 'La data fine deve essere successiva alla data inizio';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handlers
    const handleChange = (field: keyof FormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);

        // Clear error on change
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            showToast({ type: 'error', message: 'Correggi gli errori nel form' });
            return;
        }

        const submitData: Partial<ListinoPrezzo> = {
            prestazioneId: formData.prestazioneId,
            poliambulatorioId: formData.poliambulatorioId || undefined,
            convenzioneId: formData.convenzioneId || undefined,
            medicoId: formData.medicoId || undefined,
            nome: formData.nome.trim() || undefined,
            prezzo: parseFloat(formData.prezzo),
            ivaAliquota: parseFloat(formData.ivaAliquota),
            validoDa: formData.validoDa,
            validoA: formData.validoA || undefined,
            attivo: formData.attivo,
        };

        if (isEditing) {
            updateMutation.mutate(submitData);
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleCancel = () => {
        if (isDirty && !confirm('Hai modifiche non salvate. Sei sicuro di voler uscire?')) {
            return;
        }
        navigate('/poliambulatorio/catalogo/listini');
    };

    // Loading state
    if (isEditing && isLoadingListino) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-teal-600 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Torna ai listini
                </button>
                <h1 className="text-2xl font-semibold text-gray-900">
                    {isEditing ? 'Modifica Prezzo Listino' : 'Nuovo Prezzo Listino'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {isEditing
                        ? 'Modifica il prezzo per la prestazione'
                        : 'Inserisci un nuovo prezzo per una prestazione'}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Prestazione Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-teal-100">
                            <FileText className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Prestazione</h2>
                            <p className="text-sm text-gray-500">Seleziona la prestazione per cui definire il prezzo</p>
                        </div>
                    </div>

                    <div>
                        <label className="label-clinica">
                            Prestazione <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.prestazioneId}
                            onChange={(e) => handleChange('prestazioneId', e.target.value)}
                            className={`select-clinica w-full ${errors.prestazioneId ? 'border-red-500' : ''}`}
                            disabled={isEditing}
                        >
                            <option value="">Seleziona una prestazione...</option>
                            {prestazioniList.map((p: Prestazione) => (
                                <option key={p.id} value={p.id}>
                                    {p.nome} ({p.codice}) - Base: €{p.prezzoBase}
                                </option>
                            ))}
                        </select>
                        {errors.prestazioneId && (
                            <p className="mt-1 text-sm text-red-600">{errors.prestazioneId}</p>
                        )}

                        {/* Prestazione preview */}
                        {selectedPrestazione && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                                <div className="font-medium text-gray-900">{selectedPrestazione.nome}</div>
                                <div className="text-gray-500 mt-1">
                                    Tipo: {selectedPrestazione.tipo} • Durata: {selectedPrestazione.durataPrevista} min •
                                    Prezzo base: €{selectedPrestazione.prezzoBase}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Nome opzionale */}
                    <div className="mt-4">
                        <label className="label-clinica">Nome/Etichetta (opzionale)</label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => handleChange('nome', e.target.value)}
                            placeholder="es. Prezzo Speciale Estate, Promo Nuovi Pazienti..."
                            className="input-clinica"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Usa un nome descrittivo se questo prezzo ha condizioni particolari
                        </p>
                    </div>
                </div>

                {/* Contesto Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Contesto Applicazione</h2>
                            <p className="text-sm text-gray-500">Dove si applica questo prezzo (opzionale)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-clinica">Poliambulatorio</label>
                            <select
                                value={formData.poliambulatorioId}
                                onChange={(e) => handleChange('poliambulatorioId', e.target.value)}
                                className="select-clinica w-full"
                            >
                                <option value="">-- Tutti --</option>
                                {poliambulatoriList.map((p: Poliambulatorio) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nome}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                Se non specificato, vale per tutti
                            </p>
                        </div>

                        <div>
                            <label className="label-clinica">Convenzione</label>
                            <select
                                value={formData.convenzioneId}
                                onChange={(e) => handleChange('convenzioneId', e.target.value)}
                                className="select-clinica w-full"
                            >
                                <option value="">-- Nessuna (Privati) --</option>
                                {convenzioniList.map((c: Convenzione) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nome} ({c.codice})
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                Se specificato, prezzo riservato ai convenzionati
                            </p>
                        </div>
                    </div>

                    {/* Medico - Tariffario Avanzato */}
                    <div className="mt-4">
                        <label className="label-clinica flex items-center gap-2">
                            <User className="w-4 h-4 text-purple-500" />
                            Medico (Tariffario Avanzato)
                        </label>
                        <select
                            value={formData.medicoId}
                            onChange={(e) => handleChange('medicoId', e.target.value)}
                            className="select-clinica w-full"
                        >
                            <option value="">-- Tutti i medici --</option>
                            {mediciList.map((m: Medico) => (
                                <option key={m.id} value={m.id}>
                                    {m.firstName || m.nome} {m.lastName || m.cognome}
                                    {m.specializzazione ? ` (${m.specializzazione})` : ''}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            Se specificato, questo prezzo sarà usato solo quando la prestazione è eseguita da questo medico
                        </p>
                    </div>
                </div>

                {/* Prezzo Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-green-100">
                            <Euro className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Prezzo</h2>
                            <p className="text-sm text-gray-500">Configura il prezzo e l'IVA</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="label-clinica">
                                Prezzo (€) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.prezzo}
                                onChange={(e) => handleChange('prezzo', e.target.value)}
                                step="0.01"
                                min="0"
                                max="99999.99"
                                placeholder="0.00"
                                className={`input-clinica ${errors.prezzo ? 'border-red-500' : ''}`}
                            />
                            {errors.prezzo && (
                                <p className="mt-1 text-sm text-red-600">{errors.prezzo}</p>
                            )}
                        </div>

                        <div>
                            <label className="label-clinica">Aliquota IVA (%)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={formData.ivaAliquota}
                                    onChange={(e) => handleChange('ivaAliquota', e.target.value)}
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className={`w-24 input-clinica ${errors.ivaAliquota ? 'border-red-500' : ''}`}
                                />
                                <div className="flex gap-2">
                                    {IVA_PRESETS.map((preset) => (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            onClick={() => handleChange('ivaAliquota', preset.value)}
                                            className={`px-3 py-1 rounded text-sm transition-colors ${formData.ivaAliquota === preset.value
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {errors.ivaAliquota && (
                                <p className="mt-1 text-sm text-red-600">{errors.ivaAliquota}</p>
                            )}
                        </div>

                        {/* Prezzo calcolato */}
                        {formData.prezzo && (
                            <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Prezzo finale (IVA inclusa):</span>
                                    <span className="text-xl font-bold text-gray-900">
                                        € {(parseFloat(formData.prezzo) * (1 + parseFloat(formData.ivaAliquota || '0') / 100)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Validità Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-amber-100">
                            <Calendar className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Validità</h2>
                            <p className="text-sm text-gray-500">Periodo di validità del prezzo</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="label-clinica">
                                Valido da <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.validoDa}
                                onChange={(e) => handleChange('validoDa', e.target.value)}
                                className={`input-clinica ${errors.validoDa ? 'border-red-500' : ''}`}
                            />
                            {errors.validoDa && (
                                <p className="mt-1 text-sm text-red-600">{errors.validoDa}</p>
                            )}
                        </div>

                        <div>
                            <label className="label-clinica">Valido fino a</label>
                            <input
                                type="date"
                                value={formData.validoA}
                                onChange={(e) => handleChange('validoA', e.target.value)}
                                className={`input-clinica ${errors.validoA ? 'border-red-500' : ''}`}
                            />
                            {errors.validoA && (
                                <p className="mt-1 text-sm text-red-600">{errors.validoA}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Lascia vuoto per validità illimitata
                            </p>
                        </div>
                    </div>

                    {/* Attivo toggle */}
                    <div className="mt-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.attivo}
                                onChange={(e) => handleChange('attivo', e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                            />
                            <div>
                                <span className="font-medium text-gray-900">Prezzo attivo</span>
                                <p className="text-sm text-gray-500">
                                    Se disattivato, non sarà applicato nelle prenotazioni
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Info Card */}
                <div className="p-4 bg-blue-50 rounded-lg flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                        <p className="font-medium">Come funziona il sistema prezzi</p>
                        <ul className="mt-1 list-disc list-inside space-y-1">
                            <li>Il prezzo più specifico ha priorità (convenzione + poliambulatorio)</li>
                            <li>Se non c'è corrispondenza, viene usato il prezzo base della prestazione</li>
                            <li>I prezzi scaduti o disattivati non vengono considerati</li>
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-clinica-secondary"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-clinica-primary flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isEditing ? 'Salva Modifiche' : 'Crea Prezzo'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ListinoForm;
