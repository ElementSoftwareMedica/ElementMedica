/**
 * FatturaForm - Form creazione/modifica fattura
 * 
 * Wizard per creazione fattura da visita o manuale.
 * 
 * @module pages/poliambulatorio/fatturazione/FatturaForm
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Receipt,
    User,
    Calendar,
    Euro,
    Percent,
    FileText,
    CheckCircle2,
    AlertCircle,
    Search,
    Loader2
} from 'lucide-react';
import {
    fattureApi,
    pazientiApi,
    visiteApi,
    Paziente,
    Visita
} from '../../../services/clinicaApi';
import { formatDate } from '../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

interface FormData {
    pazienteId: string;
    dataEmissione: string;
    imponibile: number;
    aliquotaIva: number;
    visitaId?: string;
    note?: string;
}

// ============================================
// COMPONENTS
// ============================================

/**
 * Patient Search Component
 */
const PatientSearch: React.FC<{
    value: string;
    onSelect: (paziente: Paziente) => void;
    selectedPaziente?: Paziente;
}> = ({ value, onSelect, selectedPaziente }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['pazienti-search', search],
        queryFn: () => pazientiApi.search(search),
        enabled: search.length >= 2
    });

    const pazienti: Paziente[] = data || [];

    if (selectedPaziente) {
        return (
            <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-full">
                        <User className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">
                            {selectedPaziente.cognome} {selectedPaziente.nome}
                        </p>
                        <p className="text-sm text-gray-500">
                            {selectedPaziente.codiceFiscale || selectedPaziente.email}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => onSelect(null as unknown as Paziente)}
                    className="text-sm text-teal-600 hover:text-teal-700"
                >
                    Cambia
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Cerca paziente per nome, cognome o codice fiscale..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
            </div>

            {isOpen && search.length >= 2 && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-20">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-500">
                                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                                Ricerca in corso...
                            </div>
                        ) : pazienti.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                Nessun paziente trovato
                            </div>
                        ) : (
                            pazienti.map((paziente) => (
                                <button
                                    key={paziente.id}
                                    onClick={() => {
                                        onSelect(paziente);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                                >
                                    <div className="p-2 bg-gray-100 rounded-full">
                                        <User className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {paziente.cognome} {paziente.nome}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {paziente.codiceFiscale || paziente.email}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

/**
 * Visit Selector Component
 */
const VisitSelector: React.FC<{
    pazienteId: string;
    value?: string;
    onChange: (visitaId: string | undefined, visita?: Visita) => void;
}> = ({ pazienteId, value, onChange }) => {
    // For now, just a placeholder - would need a proper API endpoint
    return (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">
                Collegamento visita opzionale. Seleziona una visita per auto-compilare i dati della fattura.
            </p>
            {/* TODO: Implement visit selection when API is available */}
        </div>
    );
};

/**
 * Amount Summary Component
 */
const AmountSummary: React.FC<{
    imponibile: number;
    aliquotaIva: number;
}> = ({ imponibile, aliquotaIva }) => {
    const importoIva = imponibile * (aliquotaIva / 100);
    const totale = imponibile + importoIva;

    return (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-gray-600">Imponibile</span>
                <span className="font-medium">€{imponibile.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA ({aliquotaIva}%)</span>
                <span className="font-medium">€{importoIva.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-medium text-gray-900">Totale</span>
                <span className="text-xl font-bold text-teal-600">€{totale.toFixed(2)}</span>
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const FatturaForm: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const visitaIdParam = searchParams.get('visitaId');

    const isEditing = Boolean(id);

    // Form state
    const [formData, setFormData] = useState<FormData>({
        pazienteId: '',
        dataEmissione: new Date().toISOString().split('T')[0],
        imponibile: 0,
        aliquotaIva: 0, // Medical services usually VAT exempt
        visitaId: visitaIdParam || undefined,
        note: ''
    });
    const [selectedPaziente, setSelectedPaziente] = useState<Paziente | undefined>();
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: FormData) => fattureApi.create({
            pazienteId: data.pazienteId,
            dataEmissione: data.dataEmissione,
            imponibile: data.imponibile,
            aliquotaIva: data.aliquotaIva,
            visitaId: data.visitaId,
            note: data.note
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fatture'] });
            navigate('/poliambulatorio/fatturazione');
        },
        onError: (error: Error) => {
            setErrors({ submit: error.message });
        }
    });

    // Validate form
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.pazienteId) {
            newErrors.pazienteId = 'Seleziona un paziente';
        }

        if (!formData.dataEmissione) {
            newErrors.dataEmissione = 'Inserisci la data di emissione';
        }

        if (formData.imponibile <= 0) {
            newErrors.imponibile = 'Inserisci un importo valido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        createMutation.mutate(formData);
    };

    // Handle patient selection
    const handlePazienteSelect = (paziente: Paziente | null) => {
        if (paziente) {
            setSelectedPaziente(paziente);
            setFormData(prev => ({ ...prev, pazienteId: paziente.id }));
        } else {
            setSelectedPaziente(undefined);
            setFormData(prev => ({ ...prev, pazienteId: '' }));
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Torna indietro
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Modifica Fattura' : 'Nuova Fattura'}
                </h1>
                <p className="text-gray-600">
                    {isEditing ? 'Modifica i dati della fattura' : 'Crea una nuova fattura sanitaria'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-teal-600" />
                        Paziente
                    </h2>

                    <PatientSearch
                        value={formData.pazienteId}
                        onSelect={handlePazienteSelect}
                        selectedPaziente={selectedPaziente}
                    />

                    {errors.pazienteId && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.pazienteId}
                        </p>
                    )}
                </div>

                {/* Invoice Details */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-teal-600" />
                        Dettagli Fattura
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data Emissione *
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={formData.dataEmissione}
                                    onChange={(e) => setFormData(prev => ({ ...prev, dataEmissione: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                            {errors.dataEmissione && (
                                <p className="mt-1 text-sm text-red-600">{errors.dataEmissione}</p>
                            )}
                        </div>

                        {/* Imponibile */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Imponibile (€) *
                            </label>
                            <div className="relative">
                                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.imponibile || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        imponibile: parseFloat(e.target.value) || 0
                                    }))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    placeholder="0.00"
                                />
                            </div>
                            {errors.imponibile && (
                                <p className="mt-1 text-sm text-red-600">{errors.imponibile}</p>
                            )}
                        </div>

                        {/* Aliquota IVA */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Aliquota IVA (%)
                            </label>
                            <div className="relative">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <select
                                    value={formData.aliquotaIva}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        aliquotaIva: parseFloat(e.target.value)
                                    }))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="0">Esente (0%)</option>
                                    <option value="4">4%</option>
                                    <option value="10">10%</option>
                                    <option value="22">22%</option>
                                </select>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Le prestazioni sanitarie sono generalmente esenti IVA
                            </p>
                        </div>

                        {/* Summary */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Riepilogo
                            </label>
                            <AmountSummary
                                imponibile={formData.imponibile}
                                aliquotaIva={formData.aliquotaIva}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Note
                        </label>
                        <textarea
                            value={formData.note || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Note aggiuntive (opzionale)..."
                        />
                    </div>
                </div>

                {/* Visit Link (Optional) */}
                {formData.pazienteId && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-teal-600" />
                            Collegamento Visita (Opzionale)
                        </h2>
                        <VisitSelector
                            pazienteId={formData.pazienteId}
                            value={formData.visitaId}
                            onChange={(visitaId, visita) => {
                                setFormData(prev => ({ ...prev, visitaId }));
                                // Auto-fill price from visit if available
                                // if (visita?.prestazione?.prezzo) {
                                //   setFormData(prev => ({ ...prev, imponibile: visita.prestazione.prezzo }));
                                // }
                            }}
                        />
                    </div>
                )}

                {/* Submit Error */}
                {errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <p className="text-red-700">{errors.submit}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                        {createMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creazione in corso...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Crea Fattura
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FatturaForm;
