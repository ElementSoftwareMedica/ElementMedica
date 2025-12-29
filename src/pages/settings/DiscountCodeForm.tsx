/**
 * DiscountCodeForm Component
 * 
 * Pagina dedicata per creare/modificare codici sconto
 * Supporta le rotte: /management/codici-sconto/nuovo e /management/codici-sconto/:id/modifica
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '../../services/api';
import {
    ArrowLeft,
    Save,
    Loader2,
    Tag,
    Calendar,
    Percent,
    Euro,
    Users,
    Building2,
    User,
    Heart,
    Target,
    Filter,
    ChevronDown,
    ChevronUp,
    Info,
    AlertCircle
} from 'lucide-react';

// Types
interface CodiceSconto {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string;
    tipoSconto: 'PERCENTUALE' | 'VALORE_ASSOLUTO';
    valore: number;
    dataInizio: string;
    dataFine: string;
    attivo: boolean;
    utilizzoMassimo?: number;
    utilizzoCorrente: number;
    utilizzoPerUtente?: number;
    cumulabile: boolean;
    minImporto?: number;
    maxImporto?: number;
    applicabileA: 'TUTTI' | 'AZIENDE' | 'PERSONE' | 'SPECIFICI';
    applicabileServizi: string[];
    categorieCorso: string[];
    etaMinima?: number | null;
    etaMassima?: number | null;
    genereApplicabile?: 'MALE' | 'FEMALE' | null;
    soloNuoviPazienti?: boolean;
    convenzioniIds?: string[];
    bundleIds?: string[];
    prestazioniIds?: string[];
}

// Constants
const TIPO_SCONTO_OPTIONS = [
    { value: 'PERCENTUALE', label: 'Percentuale (%)', icon: Percent, color: 'blue' },
    { value: 'VALORE_ASSOLUTO', label: 'Valore Fisso (€)', icon: Euro, color: 'green' }
];

const APPLICABILITA_OPTIONS = [
    { value: 'TUTTI', label: 'Tutti i clienti', icon: Users, description: 'Applicabile a qualsiasi cliente' },
    { value: 'AZIENDE', label: 'Solo Aziende', icon: Building2, description: 'Riservato a clienti business' },
    { value: 'PERSONE', label: 'Solo Privati', icon: User, description: 'Riservato a persone fisiche' },
    { value: 'SPECIFICI', label: 'Clienti Specifici', icon: Target, description: 'Selezione manuale clienti' }
];

const SERVIZI_OPTIONS = [
    { value: 'CORSO', label: 'Corsi di Formazione', icon: '📚' },
    { value: 'MEDICO_COMPETENTE', label: 'Medico Competente', icon: '👨‍⚕️' },
    { value: 'DVR', label: 'DVR', icon: '📋' },
    { value: 'RSPP', label: 'RSPP', icon: '🦺' },
    { value: 'VISITA', label: 'Visite Mediche', icon: '🏥' },
    { value: 'BUNDLE', label: 'Bundle/Pacchetti', icon: '📦' },
    { value: 'CONVENZIONE', label: 'Convenzioni', icon: '🤝' }
];

const GENERE_OPTIONS: { value: 'MALE' | 'FEMALE' | null, label: string, icon: string }[] = [
    { value: null, label: 'Tutti', icon: '👥' },
    { value: 'MALE', label: 'Maschi', icon: '👨' },
    { value: 'FEMALE', label: 'Femmine', icon: '👩' }
];

const DiscountCodeForm: React.FC = () => {
    const navigate = useNavigate();
    const { id: paramId } = useParams<{ id: string }>();
    const queryClient = useQueryClient();

    // Extract ID from path when useParams doesn't work (nested management routing)
    const id = React.useMemo(() => {
        if (paramId) return paramId;
        // Try to extract from path: /management/codici-sconto/:id or /management/codici-sconto/:id/modifica
        const pathMatch = window.location.pathname.match(/\/codici-sconto\/([a-f0-9-]+)/i);
        return pathMatch ? pathMatch[1] : undefined;
    }, [paramId]);

    const isEditing = Boolean(id);

    // Form state
    const [formData, setFormData] = useState({
        codice: '',
        nome: '',
        descrizione: '',
        tipoSconto: 'PERCENTUALE' as 'PERCENTUALE' | 'VALORE_ASSOLUTO',
        valore: '',
        dataInizio: new Date().toISOString().split('T')[0],
        dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        attivo: true,
        utilizzoMassimo: '',
        utilizzoPerUtente: '',
        cumulabile: false,
        minImporto: '',
        maxImporto: '',
        applicabileA: 'TUTTI' as 'TUTTI' | 'AZIENDE' | 'PERSONE' | 'SPECIFICI',
        applicabileServizi: ['CORSO'] as string[],
        categorieCorso: [] as string[],
        etaMinima: '',
        etaMassima: '',
        genereApplicabile: null as 'MALE' | 'FEMALE' | null,
        soloNuoviPazienti: false,
        convenzioniIds: [] as string[],
        bundleIds: [] as string[],
        prestazioniIds: [] as string[]
    });

    const [showAdvancedTargeting, setShowAdvancedTargeting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Query for editing
    const { data: codiceSconto, isLoading: isLoadingCode } = useQuery({
        queryKey: ['codici-sconto', id],
        queryFn: async () => {
            const response = await apiGet<{ success: boolean; data: CodiceSconto }>(`/api/v1/codici-sconto/${id}`);
            return response?.data;
        },
        enabled: isEditing,
    });

    // Populate form when editing
    useEffect(() => {
        if (codiceSconto) {
            const hasAdvancedTargeting = codiceSconto.etaMinima || codiceSconto.etaMassima ||
                codiceSconto.genereApplicabile || codiceSconto.soloNuoviPazienti;
            setShowAdvancedTargeting(!!hasAdvancedTargeting);

            setFormData({
                codice: codiceSconto.codice,
                nome: codiceSconto.nome,
                descrizione: codiceSconto.descrizione || '',
                tipoSconto: codiceSconto.tipoSconto,
                valore: codiceSconto.valore.toString(),
                dataInizio: codiceSconto.dataInizio.split('T')[0],
                dataFine: codiceSconto.dataFine.split('T')[0],
                attivo: codiceSconto.attivo,
                utilizzoMassimo: codiceSconto.utilizzoMassimo?.toString() || '',
                utilizzoPerUtente: codiceSconto.utilizzoPerUtente?.toString() || '',
                cumulabile: codiceSconto.cumulabile,
                minImporto: codiceSconto.minImporto?.toString() || '',
                maxImporto: codiceSconto.maxImporto?.toString() || '',
                applicabileA: codiceSconto.applicabileA,
                applicabileServizi: codiceSconto.applicabileServizi || ['CORSO'],
                categorieCorso: codiceSconto.categorieCorso || [],
                etaMinima: codiceSconto.etaMinima?.toString() || '',
                etaMassima: codiceSconto.etaMassima?.toString() || '',
                genereApplicabile: codiceSconto.genereApplicabile || null,
                soloNuoviPazienti: codiceSconto.soloNuoviPazienti || false,
                convenzioniIds: codiceSconto.convenzioniIds || [],
                bundleIds: codiceSconto.bundleIds || [],
                prestazioniIds: codiceSconto.prestazioniIds || []
            });
        }
    }, [codiceSconto]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiPost('/api/v1/codici-sconto', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['codici-sconto'] });
            navigate('/management/codici-sconto');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiPut(`/api/v1/codici-sconto/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['codici-sconto'] });
            navigate('/management/codici-sconto');
        },
    });

    // Validation
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.codice.trim()) {
            newErrors.codice = 'Il codice è obbligatorio';
        } else if (formData.codice.length < 3) {
            newErrors.codice = 'Il codice deve essere di almeno 3 caratteri';
        }

        if (!formData.nome.trim()) {
            newErrors.nome = 'Il nome è obbligatorio';
        }

        if (!formData.valore || parseFloat(formData.valore) <= 0) {
            newErrors.valore = 'Il valore deve essere maggiore di 0';
        }

        if (formData.tipoSconto === 'PERCENTUALE' && parseFloat(formData.valore) > 100) {
            newErrors.valore = 'La percentuale non può superare 100%';
        }

        if (!formData.dataInizio) {
            newErrors.dataInizio = 'La data inizio è obbligatoria';
        }

        if (!formData.dataFine) {
            newErrors.dataFine = 'La data fine è obbligatoria';
        }

        if (formData.dataInizio && formData.dataFine && new Date(formData.dataFine) < new Date(formData.dataInizio)) {
            newErrors.dataFine = 'La data fine deve essere successiva alla data inizio';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        const dataInizioISO = new Date(formData.dataInizio + 'T00:00:00.000Z').toISOString();
        const dataFineISO = new Date(formData.dataFine + 'T23:59:59.999Z').toISOString();

        const payload = {
            codice: formData.codice.toUpperCase(),
            nome: formData.nome,
            descrizione: formData.descrizione || undefined,
            tipoSconto: formData.tipoSconto,
            valore: parseFloat(formData.valore),
            dataInizio: dataInizioISO,
            dataFine: dataFineISO,
            attivo: formData.attivo,
            utilizzoMassimo: formData.utilizzoMassimo ? parseInt(formData.utilizzoMassimo) : null,
            utilizzoPerUtente: formData.utilizzoPerUtente ? parseInt(formData.utilizzoPerUtente) : null,
            cumulabile: formData.cumulabile,
            minImporto: formData.minImporto ? parseFloat(formData.minImporto) : null,
            maxImporto: formData.maxImporto ? parseFloat(formData.maxImporto) : null,
            applicabileA: formData.applicabileA,
            applicabileServizi: formData.applicabileServizi,
            categorieCorso: formData.categorieCorso,
            etaMinima: formData.etaMinima ? parseInt(formData.etaMinima) : null,
            etaMassima: formData.etaMassima ? parseInt(formData.etaMassima) : null,
            genereApplicabile: formData.genereApplicabile,
            soloNuoviPazienti: formData.soloNuoviPazienti,
            convenzioniIds: formData.convenzioniIds,
            bundleIds: formData.bundleIds,
            prestazioniIds: formData.prestazioniIds
        };

        if (isEditing) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;
    const error = createMutation.error || updateMutation.error;

    if (isEditing && isLoadingCode) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/management/codici-sconto')}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Torna ai Codici Sconto
                </button>

                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Tag className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEditing ? 'Modifica Codice Sconto' : 'Nuovo Codice Sconto'}
                        </h1>
                        <p className="text-gray-600">
                            {isEditing ? `Modifica le proprietà del codice "${codiceSconto?.codice}"` : 'Crea un nuovo codice promozionale'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-800">Errore</p>
                        <p className="text-red-600 text-sm">{(error as any)?.message || 'Si è verificato un errore'}</p>
                    </div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Informazioni Base */}
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-600" />
                        Informazioni Base
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Codice */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Codice <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.codice}
                                onChange={(e) => setFormData({ ...formData, codice: e.target.value.toUpperCase() })}
                                placeholder="es. SUMMER2024"
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase ${errors.codice ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    }`}
                            />
                            {errors.codice && <p className="text-red-500 text-sm mt-1">{errors.codice}</p>}
                        </div>

                        {/* Nome */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nome Descrittivo <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="es. Sconto Estivo 2024"
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.nome ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    }`}
                            />
                            {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
                        </div>

                        {/* Descrizione */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Descrizione
                            </label>
                            <textarea
                                value={formData.descrizione}
                                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                                placeholder="Descrizione opzionale del codice sconto..."
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </section>

                {/* Valore Sconto */}
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Percent className="w-5 h-5 text-green-600" />
                        Valore Sconto
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tipo Sconto */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo di Sconto <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3">
                                {TIPO_SCONTO_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, tipoSconto: option.value as any })}
                                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${formData.tipoSconto === option.value
                                                    ? `border-${option.color}-500 bg-${option.color}-50 text-${option.color}-700`
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="font-medium">{option.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Valore */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Valore <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={formData.valore}
                                    onChange={(e) => setFormData({ ...formData, valore: e.target.value })}
                                    placeholder="0"
                                    min="0"
                                    step={formData.tipoSconto === 'PERCENTUALE' ? '1' : '0.01'}
                                    max={formData.tipoSconto === 'PERCENTUALE' ? '100' : undefined}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 ${errors.valore ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                        }`}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                                    {formData.tipoSconto === 'PERCENTUALE' ? '%' : '€'}
                                </span>
                            </div>
                            {errors.valore && <p className="text-red-500 text-sm mt-1">{errors.valore}</p>}
                        </div>

                        {/* Min Importo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Importo Minimo (€)
                            </label>
                            <input
                                type="number"
                                value={formData.minImporto}
                                onChange={(e) => setFormData({ ...formData, minImporto: e.target.value })}
                                placeholder="Nessun minimo"
                                min="0"
                                step="0.01"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">L'ordine deve superare questo importo</p>
                        </div>

                        {/* Max Importo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sconto Massimo (€)
                            </label>
                            <input
                                type="number"
                                value={formData.maxImporto}
                                onChange={(e) => setFormData({ ...formData, maxImporto: e.target.value })}
                                placeholder="Nessun limite"
                                min="0"
                                step="0.01"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Tetto massimo dello sconto applicabile</p>
                        </div>
                    </div>
                </section>

                {/* Validità */}
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-600" />
                        Periodo di Validità
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Data Inizio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Data Inizio <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.dataInizio}
                                onChange={(e) => setFormData({ ...formData, dataInizio: e.target.value })}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.dataInizio ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    }`}
                            />
                            {errors.dataInizio && <p className="text-red-500 text-sm mt-1">{errors.dataInizio}</p>}
                        </div>

                        {/* Data Fine */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Data Fine <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.dataFine}
                                onChange={(e) => setFormData({ ...formData, dataFine: e.target.value })}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.dataFine ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    }`}
                            />
                            {errors.dataFine && <p className="text-red-500 text-sm mt-1">{errors.dataFine}</p>}
                        </div>

                        {/* Utilizzo Massimo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Utilizzi Massimi Totali
                            </label>
                            <input
                                type="number"
                                value={formData.utilizzoMassimo}
                                onChange={(e) => setFormData({ ...formData, utilizzoMassimo: e.target.value })}
                                placeholder="Illimitato"
                                min="1"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Utilizzo per Utente */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Utilizzi per Utente
                            </label>
                            <input
                                type="number"
                                value={formData.utilizzoPerUtente}
                                onChange={(e) => setFormData({ ...formData, utilizzoPerUtente: e.target.value })}
                                placeholder="Illimitato"
                                min="1"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </section>

                {/* Applicabilità */}
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        Applicabilità
                    </h2>

                    {/* Tipo Cliente */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Tipo Cliente
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {APPLICABILITA_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, applicabileA: option.value as any })}
                                        className={`p-4 rounded-lg border-2 transition-all text-left ${formData.applicabileA === option.value
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-gray-200 hover:border-purple-200'
                                            }`}
                                    >
                                        <Icon className={`w-6 h-6 mb-2 ${formData.applicabileA === option.value ? 'text-purple-600' : 'text-gray-400'}`} />
                                        <div className={`font-medium ${formData.applicabileA === option.value ? 'text-purple-900' : 'text-gray-900'}`}>
                                            {option.label}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Servizi Applicabili */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Servizi Applicabili
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {SERVIZI_OPTIONS.map((servizio) => (
                                <button
                                    key={servizio.value}
                                    type="button"
                                    onClick={() => {
                                        const newServizi = formData.applicabileServizi.includes(servizio.value)
                                            ? formData.applicabileServizi.filter(s => s !== servizio.value)
                                            : [...formData.applicabileServizi, servizio.value];
                                        setFormData({ ...formData, applicabileServizi: newServizi });
                                    }}
                                    className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${formData.applicabileServizi.includes(servizio.value)
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-blue-200 text-gray-600'
                                        }`}
                                >
                                    <span>{servizio.icon}</span>
                                    <span className="font-medium">{servizio.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Targeting Avanzato */}
                <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <button
                        type="button"
                        onClick={() => setShowAdvancedTargeting(!showAdvancedTargeting)}
                        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Target className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-semibold text-gray-900">Targeting Avanzato</h2>
                                <p className="text-sm text-gray-500">Criteri demografici e segmentazione</p>
                            </div>
                            {(formData.etaMinima || formData.etaMassima || formData.genereApplicabile || formData.soloNuoviPazienti) && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                    Attivo
                                </span>
                            )}
                        </div>
                        {showAdvancedTargeting ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>

                    {showAdvancedTargeting && (
                        <div className="p-6 pt-0 space-y-6 border-t border-gray-100">
                            {/* Range Età */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Range Età Paziente
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        value={formData.etaMinima}
                                        onChange={(e) => setFormData({ ...formData, etaMinima: e.target.value })}
                                        placeholder="Min"
                                        min="0"
                                        max="120"
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    <span className="text-gray-400">—</span>
                                    <input
                                        type="number"
                                        value={formData.etaMassima}
                                        onChange={(e) => setFormData({ ...formData, etaMassima: e.target.value })}
                                        placeholder="Max"
                                        min="0"
                                        max="120"
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    <span className="text-gray-500 text-sm">anni</span>
                                </div>
                            </div>

                            {/* Genere */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Genere Paziente
                                </label>
                                <div className="flex gap-3">
                                    {GENERE_OPTIONS.map((option) => (
                                        <button
                                            key={option.value || 'tutti'}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, genereApplicabile: option.value })}
                                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex flex-col items-center ${formData.genereApplicabile === option.value
                                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                    : 'border-gray-200 hover:border-purple-200 text-gray-600'
                                                }`}
                                        >
                                            <span className="text-2xl mb-1">{option.icon}</span>
                                            <span className="font-medium">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Solo Nuovi Pazienti */}
                            <label className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-purple-300 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.soloNuoviPazienti}
                                    onChange={(e) => setFormData({ ...formData, soloNuoviPazienti: e.target.checked })}
                                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Heart className="w-5 h-5 text-pink-500" />
                                        <span className="font-medium text-gray-900">Solo Nuovi Pazienti</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Il codice può essere usato solo da pazienti alla loro prima visita
                                    </p>
                                </div>
                            </label>

                            {/* Info */}
                            <div className="p-4 bg-purple-50 rounded-lg flex items-start gap-3">
                                <Filter className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-purple-700">
                                    <strong>Come funziona:</strong> I filtri vengono applicati in AND.
                                    Il paziente deve soddisfare tutti i criteri per utilizzare il codice.
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Opzioni */}
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Opzioni</h2>

                    <div className="space-y-4">
                        <label className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.attivo}
                                onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div>
                                <span className="font-medium text-gray-900">Codice Attivo</span>
                                <p className="text-sm text-gray-500">Il codice può essere utilizzato immediatamente</p>
                            </div>
                        </label>

                        <label className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.cumulabile}
                                onChange={(e) => setFormData({ ...formData, cumulabile: e.target.checked })}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div>
                                <span className="font-medium text-gray-900">Cumulabile</span>
                                <p className="text-sm text-gray-500">Può essere combinato con altri codici sconto</p>
                            </div>
                        </label>
                    </div>
                </section>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/management/codici-sconto')}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                {isEditing ? 'Aggiorna Codice' : 'Crea Codice'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DiscountCodeForm;
