/**
 * StrumentoForm
 * 
 * Form per creazione/modifica strumento medico.
 * Allineato completamente allo schema Prisma e alla validazione backend.
 * 
 * Campi Prisma supportati:
 * - codice (required, unique per tenant)
 * - nome (required)
 * - descrizione (optional)
 * - marca (optional)
 * - modello (optional)
 * - numeroSerie (optional)
 * - ambulatorioId (optional)
 * - stato (enum: ATTIVO, IN_MANUTENZIONE, FUORI_SERVIZIO, DISMESSO, IN_TARATURA)
 * - dataAcquisto (optional)
 * - costoAcquisto (optional, decimal)
 * - dataFineAmmortamento (optional)
 * - ultimaManutenzione (optional)
 * - prossimaManutenzione (optional)
 * - intervallManutenzione (optional, int giorni)
 * - ultimaTaratura (optional)
 * - prossimaTaratura (optional)
 * 
 * @module pages/poliambulatorio/struttura/StrumentoForm
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Wrench,
    ArrowLeft,
    Save,
    Loader2,
    Calendar,
    Info,
    Settings,
    DollarSign,
    AlertTriangle
} from 'lucide-react';
import { strumentiApi, ambulatoriApi } from '../../../services/clinicaApi';
import type { Strumento, Ambulatorio } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Prisma enum StatoStrumento
type StatoStrumento = 'ATTIVO' | 'IN_MANUTENZIONE' | 'FUORI_SERVIZIO' | 'DISMESSO' | 'IN_TARATURA';

// Prisma enum TipologiaStrumento
type TipologiaStrumento =
    | 'ECOGRAFO' | 'ELETTROCARDIOGRAFO' | 'LASER' | 'CARBOSSITERAPIA'
    | 'SPIROMETRO' | 'AUDIOMETRO' | 'OFTALMOSCOPIO' | 'DERMATOSCOPIO'
    | 'HOLTER_ECG' | 'HOLTER_PRESSORIO' | 'ELETTROMIOGRAFO' | 'DENSITOMETRO'
    | 'COLPOSCOPIO' | 'ENDOSCOPIO' | 'RADIOGRAFO' | 'MAMMOGRAFO'
    | 'TAC' | 'RMN' | 'MONITOR_MULTIPARAMETRICO' | 'DEFIBRILLATORE'
    | 'ELETTROBISTURI' | 'CRIOCHIRURGIA' | 'ALTRO';

interface FormData {
    codice: string;
    nome: string;
    descrizione: string;
    tipologia: TipologiaStrumento | '';
    marca: string;
    modello: string;
    numeroSerie: string;
    ambulatorioId: string;
    stato: StatoStrumento;
    dataAcquisto: string;
    costoAcquisto: string;
    dataFineAmmortamento: string;
    ultimaManutenzione: string;
    prossimaManutenzione: string;
    intervallManutenzione: string;
    ultimaTaratura: string;
    prossimaTaratura: string;
}

interface FormErrors {
    [key: string]: string;
}

const STATI_STRUMENTO: { value: StatoStrumento; label: string; color: string }[] = [
    { value: 'ATTIVO', label: 'Attivo', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'IN_MANUTENZIONE', label: 'In Manutenzione', color: 'bg-amber-100 text-amber-700' },
    { value: 'FUORI_SERVIZIO', label: 'Fuori Servizio', color: 'bg-red-100 text-red-700' },
    { value: 'DISMESSO', label: 'Dismesso', color: 'bg-gray-100 text-gray-600' },
    { value: 'IN_TARATURA', label: 'In Taratura', color: 'bg-blue-100 text-blue-700' }
];

const TIPOLOGIE_STRUMENTO: { value: TipologiaStrumento; label: string; categoria: string }[] = [
    // Diagnostica cardiologica
    { value: 'ELETTROCARDIOGRAFO', label: 'Elettrocardiografo (ECG)', categoria: 'Cardiologia' },
    { value: 'HOLTER_ECG', label: 'Holter ECG', categoria: 'Cardiologia' },
    { value: 'HOLTER_PRESSORIO', label: 'Holter Pressorio', categoria: 'Cardiologia' },
    { value: 'DEFIBRILLATORE', label: 'Defibrillatore', categoria: 'Cardiologia' },
    // Imaging
    { value: 'ECOGRAFO', label: 'Ecografo', categoria: 'Imaging' },
    { value: 'RADIOGRAFO', label: 'Radiografo', categoria: 'Imaging' },
    { value: 'MAMMOGRAFO', label: 'Mammografo', categoria: 'Imaging' },
    { value: 'TAC', label: 'TAC', categoria: 'Imaging' },
    { value: 'RMN', label: 'Risonanza Magnetica', categoria: 'Imaging' },
    { value: 'DENSITOMETRO', label: 'Densitometro (MOC)', categoria: 'Imaging' },
    // Medicina del Lavoro
    { value: 'SPIROMETRO', label: 'Spirometro', categoria: 'Medicina Lavoro' },
    { value: 'AUDIOMETRO', label: 'Audiometro', categoria: 'Medicina Lavoro' },
    { value: 'OFTALMOSCOPIO', label: 'Oftalmoscopio', categoria: 'Medicina Lavoro' },
    // Dermatologia
    { value: 'DERMATOSCOPIO', label: 'Dermatoscopio', categoria: 'Dermatologia' },
    { value: 'LASER', label: 'Laser', categoria: 'Dermatologia' },
    { value: 'CARBOSSITERAPIA', label: 'Carbossiterapia', categoria: 'Dermatologia' },
    { value: 'CRIOCHIRURGIA', label: 'Criochirurgia', categoria: 'Dermatologia' },
    // Neurologia
    { value: 'ELETTROMIOGRAFO', label: 'Elettromiografo (EMG)', categoria: 'Neurologia' },
    // Ginecologia
    { value: 'COLPOSCOPIO', label: 'Colposcopio', categoria: 'Ginecologia' },
    // Endoscopia
    { value: 'ENDOSCOPIO', label: 'Endoscopio', categoria: 'Endoscopia' },
    // Chirurgia
    { value: 'ELETTROBISTURI', label: 'Elettrobisturi', categoria: 'Chirurgia' },
    // Monitoraggio
    { value: 'MONITOR_MULTIPARAMETRICO', label: 'Monitor Multiparametrico', categoria: 'Monitoraggio' },
    // Altro
    { value: 'ALTRO', label: 'Altro', categoria: 'Altro' }
];

const StrumentoForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmWarning } = useConfirmDialog();
    const isEditing = Boolean(id);

    // Get ambulatorioId from URL params if present
    const preselectedAmbulatorioId = searchParams.get('ambulatorioId') || '';

    const initialFormData: FormData = {
        codice: '',
        nome: '',
        descrizione: '',
        tipologia: '',
        marca: '',
        modello: '',
        numeroSerie: '',
        ambulatorioId: preselectedAmbulatorioId,
        stato: 'ATTIVO',
        dataAcquisto: '',
        costoAcquisto: '',
        dataFineAmmortamento: '',
        ultimaManutenzione: '',
        prossimaManutenzione: '',
        intervallManutenzione: '',
        ultimaTaratura: '',
        prossimaTaratura: ''
    };

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isDirty, setIsDirty] = useState(false);

    // Load ambulatori for dropdown
    const { data: ambulatoriResponse } = useQuery({
        queryKey: ['ambulatori'],
        queryFn: () => ambulatoriApi.getAll()
    });

    // Extract ambulatori array from response - handle PaginatedResponse type
    const ambulatori: Ambulatorio[] = ambulatoriResponse?.data || [];

    // Load existing data if editing
    const { data: existingData, isLoading: isLoadingData } = useQuery({
        queryKey: ['strumento', id],
        queryFn: () => strumentiApi.getById(id!),
        enabled: isEditing
    });

    // Update form when data loads
    useEffect(() => {
        if (existingData) {
            setFormData({
                codice: existingData.codice || '',
                nome: existingData.nome || '',
                descrizione: existingData.descrizione || '',
                tipologia: existingData.tipologia || '',
                marca: existingData.marca || '',
                modello: existingData.modello || '',
                numeroSerie: existingData.numeroSerie || '',
                ambulatorioId: existingData.ambulatorioId || '',
                stato: existingData.stato || 'ATTIVO',
                dataAcquisto: existingData.dataAcquisto ? existingData.dataAcquisto.split('T')[0] : '',
                costoAcquisto: existingData.costoAcquisto ? String(existingData.costoAcquisto) : '',
                dataFineAmmortamento: existingData.dataFineAmmortamento ? existingData.dataFineAmmortamento.split('T')[0] : '',
                ultimaManutenzione: existingData.ultimaManutenzione ? existingData.ultimaManutenzione.split('T')[0] : '',
                prossimaManutenzione: existingData.prossimaManutenzione ? existingData.prossimaManutenzione.split('T')[0] : '',
                intervallManutenzione: existingData.intervallManutenzione ? String(existingData.intervallManutenzione) : '',
                ultimaTaratura: existingData.ultimaTaratura ? existingData.ultimaTaratura.split('T')[0] : '',
                prossimaTaratura: existingData.prossimaTaratura ? existingData.prossimaTaratura.split('T')[0] : ''
            });
        }
    }, [existingData]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<Strumento>) => strumentiApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strumenti'] });
            showToast({ type: 'success', message: 'Strumento creato con successo' });
            navigate('/poliambulatorio/strumenti');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la creazione' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Strumento>) => strumentiApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strumenti'] });
            queryClient.invalidateQueries({ queryKey: ['strumento', id] });
            showToast({ type: 'success', message: 'Strumento aggiornato con successo' });
            navigate('/poliambulatorio/strumenti');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento' });
        }
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    // Validation - aligned with backend Joi schema
    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        // Required fields
        if (!formData.codice.trim()) {
            newErrors.codice = 'Il codice è obbligatorio';
        } else if (!/^[A-Z0-9_-]+$/i.test(formData.codice)) {
            newErrors.codice = 'Codice deve contenere solo lettere, numeri, underscore e trattini';
        } else if (formData.codice.length < 2 || formData.codice.length > 50) {
            newErrors.codice = 'Codice deve essere tra 2 e 50 caratteri';
        }

        if (!formData.nome.trim()) {
            newErrors.nome = 'Il nome è obbligatorio';
        } else if (formData.nome.length < 3 || formData.nome.length > 200) {
            newErrors.nome = 'Nome deve essere tra 3 e 200 caratteri';
        }

        // Optional number validations
        if (formData.costoAcquisto && (isNaN(parseFloat(formData.costoAcquisto)) || parseFloat(formData.costoAcquisto) < 0)) {
            newErrors.costoAcquisto = 'Costo deve essere un numero positivo';
        }

        if (formData.intervallManutenzione && (!Number.isInteger(Number(formData.intervallManutenzione)) || Number(formData.intervallManutenzione) < 1)) {
            newErrors.intervallManutenzione = 'Intervallo deve essere un numero intero positivo';
        }

        // Date validations
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (formData.dataAcquisto && new Date(formData.dataAcquisto) > today) {
            newErrors.dataAcquisto = 'La data di acquisto non può essere nel futuro';
        }

        if (formData.ultimaManutenzione && new Date(formData.ultimaManutenzione) > today) {
            newErrors.ultimaManutenzione = 'L\'ultima manutenzione non può essere nel futuro';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setFormData(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);

        // Clear error on change
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            showToast({ type: 'error', message: 'Correggi gli errori nel form' });
            return;
        }

        // Build submit data with proper types
        const submitData: Partial<Strumento> = {
            codice: formData.codice.trim(),
            nome: formData.nome.trim(),
            descrizione: formData.descrizione.trim() || undefined,
            tipologia: formData.tipologia || undefined,
            marca: formData.marca.trim() || undefined,
            modello: formData.modello.trim() || undefined,
            numeroSerie: formData.numeroSerie.trim() || undefined,
            ambulatorioId: formData.ambulatorioId || undefined,
            stato: formData.stato,
            dataAcquisto: formData.dataAcquisto || undefined,
            costoAcquisto: formData.costoAcquisto ? parseFloat(formData.costoAcquisto) : undefined,
            dataFineAmmortamento: formData.dataFineAmmortamento || undefined,
            ultimaManutenzione: formData.ultimaManutenzione || undefined,
            prossimaManutenzione: formData.prossimaManutenzione || undefined,
            intervallManutenzione: formData.intervallManutenzione ? parseInt(formData.intervallManutenzione, 10) : undefined,
            ultimaTaratura: formData.ultimaTaratura || undefined,
            prossimaTaratura: formData.prossimaTaratura || undefined
        };

        if (isEditing) {
            updateMutation.mutate(submitData);
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleCancel = async () => {
        if (isDirty && !(await confirmWarning('Modifiche non salvate', 'Hai modifiche non salvate. Sei sicuro di voler uscire?'))) {
            return;
        }
        navigate('/poliambulatorio/strumenti');
    };

    // Calculate days until next maintenance
    const getDaysUntilMaintenance = (): number | null => {
        if (!formData.prossimaManutenzione) return null;
        const nextDate = new Date(formData.prossimaManutenzione);
        const today = new Date();
        const diffTime = nextDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const daysUntilMaintenance = getDaysUntilMaintenance();

    if (isLoadingData) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={handleCancel}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditing ? 'Modifica Strumento' : 'Nuovo Strumento'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isEditing ? 'Aggiorna le informazioni dello strumento' : 'Inserisci i dati del nuovo strumento'}
                    </p>
                </div>
            </div>

            {/* Maintenance Alert */}
            {daysUntilMaintenance !== null && daysUntilMaintenance <= 30 && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${daysUntilMaintenance <= 0 ? 'bg-red-50 border border-red-200' :
                    daysUntilMaintenance <= 7 ? 'bg-amber-50 border border-amber-200' :
                        'bg-blue-50 border border-blue-200'
                    }`}>
                    <AlertTriangle className={`h-5 w-5 ${daysUntilMaintenance <= 0 ? 'text-red-600' :
                        daysUntilMaintenance <= 7 ? 'text-amber-600' :
                            'text-blue-600'
                        }`} />
                    <span className={`font-medium ${daysUntilMaintenance <= 0 ? 'text-red-700' :
                        daysUntilMaintenance <= 7 ? 'text-amber-700' :
                            'text-blue-700'
                        }`}>
                        {daysUntilMaintenance <= 0
                            ? 'Manutenzione scaduta!'
                            : `Manutenzione prevista tra ${daysUntilMaintenance} giorni`}
                    </span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informazioni Base */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Wrench className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Informazioni Base</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-clinica">
                                Codice <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="codice"
                                value={formData.codice}
                                onChange={handleChange}
                                className={`input-clinica ${errors.codice ? 'border-red-500' : ''}`}
                                placeholder="STR-001"
                            />
                            {errors.codice && <p className="text-red-500 text-sm mt-1">{errors.codice}</p>}
                        </div>

                        <div>
                            <label className="label-clinica">
                                Nome <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nome"
                                value={formData.nome}
                                onChange={handleChange}
                                className={`input-clinica ${errors.nome ? 'border-red-500' : ''}`}
                                placeholder="Nome strumento"
                            />
                            {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
                        </div>

                        <div>
                            <label className="label-clinica">Stato</label>
                            <select
                                name="stato"
                                value={formData.stato}
                                onChange={handleChange}
                                className="select-clinica w-full"
                            >
                                {STATI_STRUMENTO.map(stato => (
                                    <option key={stato.value} value={stato.value}>
                                        {stato.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label-clinica">
                                Tipologia
                                <span className="text-gray-400 text-xs ml-1">(categoria strumento)</span>
                            </label>
                            <select
                                name="tipologia"
                                value={formData.tipologia}
                                onChange={handleChange}
                                className="select-clinica w-full"
                            >
                                <option value="">-- Seleziona tipologia --</option>
                                {/* Raggruppa per categoria */}
                                {['Cardiologia', 'Imaging', 'Medicina Lavoro', 'Dermatologia', 'Neurologia', 'Ginecologia', 'Endoscopia', 'Chirurgia', 'Monitoraggio', 'Altro'].map(categoria => (
                                    <optgroup key={categoria} label={categoria}>
                                        {TIPOLOGIE_STRUMENTO.filter(t => t.categoria === categoria).map(tipo => (
                                            <option key={tipo.value} value={tipo.value}>
                                                {tipo.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <p className="text-gray-500 text-xs mt-1">
                                La tipologia viene usata per verificare i requisiti delle prestazioni
                            </p>
                        </div>

                        <div>
                            <label className="label-clinica">Ambulatorio</label>
                            <select
                                name="ambulatorioId"
                                value={formData.ambulatorioId}
                                onChange={handleChange}
                                className="select-clinica w-full"
                            >
                                <option value="">-- Nessun ambulatorio --</option>
                                {ambulatori.map((amb: Ambulatorio) => (
                                    <option key={amb.id} value={amb.id}>
                                        {amb.nome} {amb.codice ? `(${amb.codice})` : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="text-gray-500 text-xs mt-1">
                                Ambulatorio a cui è assegnato lo strumento
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="label-clinica">Descrizione</label>
                            <textarea
                                name="descrizione"
                                value={formData.descrizione}
                                onChange={handleChange}
                                rows={3}
                                className="input-clinica"
                                placeholder="Descrizione dello strumento..."
                            />
                        </div>
                    </div>
                </div>

                {/* Dettagli Tecnici */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Dettagli Tecnici</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="label-clinica">Marca</label>
                            <input
                                type="text"
                                name="marca"
                                value={formData.marca}
                                onChange={handleChange}
                                className="input-clinica"
                                placeholder="Produttore"
                            />
                        </div>

                        <div>
                            <label className="label-clinica">Modello</label>
                            <input
                                type="text"
                                name="modello"
                                value={formData.modello}
                                onChange={handleChange}
                                className="input-clinica"
                                placeholder="Modello strumento"
                            />
                        </div>

                        <div>
                            <label className="label-clinica">Numero di Serie</label>
                            <input
                                type="text"
                                name="numeroSerie"
                                value={formData.numeroSerie}
                                onChange={handleChange}
                                className="input-clinica"
                                placeholder="S/N"
                            />
                        </div>
                    </div>
                </div>

                {/* Dati Economici */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Dati Economici</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="label-clinica">Data Acquisto</label>
                            <DatePickerElegante
                                value={formData.dataAcquisto}
                                onChange={(date) => handleChange({ target: { name: 'dataAcquisto', value: date ? date.toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>)}
                                theme="teal"
                            />
                            {errors.dataAcquisto && <p className="text-red-500 text-sm mt-1">{errors.dataAcquisto}</p>}
                        </div>

                        <div>
                            <label className="label-clinica">Costo Acquisto (€)</label>
                            <input
                                type="number"
                                name="costoAcquisto"
                                value={formData.costoAcquisto}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                className={`input-clinica ${errors.costoAcquisto ? 'border-red-500' : ''}`}
                                placeholder="0.00"
                            />
                            {errors.costoAcquisto && <p className="text-red-500 text-sm mt-1">{errors.costoAcquisto}</p>}
                        </div>

                        <div>
                            <label className="label-clinica">Fine Ammortamento</label>
                            <DatePickerElegante
                                value={formData.dataFineAmmortamento}
                                onChange={(date) => handleChange({ target: { name: 'dataFineAmmortamento', value: date ? date.toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>)}
                                theme="teal"
                            />
                        </div>
                    </div>
                </div>

                {/* Manutenzioni */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Manutenzioni</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="label-clinica">Ultima Manutenzione</label>
                            <DatePickerElegante
                                value={formData.ultimaManutenzione}
                                onChange={(date) => handleChange({ target: { name: 'ultimaManutenzione', value: date ? date.toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>)}
                                theme="teal"
                            />
                            {errors.ultimaManutenzione && <p className="text-red-500 text-sm mt-1">{errors.ultimaManutenzione}</p>}
                        </div>

                        <div>
                            <label className="label-clinica">Prossima Manutenzione</label>
                            <DatePickerElegante
                                value={formData.prossimaManutenzione}
                                onChange={(date) => handleChange({ target: { name: 'prossimaManutenzione', value: date ? date.toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>)}
                                theme="teal"
                            />
                            <p className="text-gray-500 text-xs mt-1">
                                Alert automatico 30 giorni prima
                            </p>
                        </div>

                        <div>
                            <label className="label-clinica">Intervallo Manutenzione (giorni)</label>
                            <input
                                type="number"
                                name="intervallManutenzione"
                                value={formData.intervallManutenzione}
                                onChange={handleChange}
                                min="1"
                                className={`input-clinica ${errors.intervallManutenzione ? 'border-red-500' : ''}`}
                                placeholder="es. 365"
                            />
                            {errors.intervallManutenzione && <p className="text-red-500 text-sm mt-1">{errors.intervallManutenzione}</p>}
                        </div>
                    </div>
                </div>

                {/* Tarature */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Info className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Tarature</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-clinica">Ultima Taratura</label>
                            <DatePickerElegante
                                value={formData.ultimaTaratura}
                                onChange={(date) => handleChange({ target: { name: 'ultimaTaratura', value: date ? date.toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>)}
                                theme="teal"
                            />
                        </div>

                        <div>
                            <label className="label-clinica">Prossima Taratura</label>
                            <DatePickerElegante
                                value={formData.prossimaTaratura}
                                onChange={(date) => handleChange({ target: { name: 'prossimaTaratura', value: date ? date.toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>)}
                                theme="teal"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-clinica-secondary"
                        disabled={isSubmitting}
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        className="btn-clinica-primary inline-flex items-center gap-2"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                {isEditing ? 'Aggiorna' : 'Crea'} Strumento
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default StrumentoForm;
