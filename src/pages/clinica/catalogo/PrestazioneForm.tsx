/**
 * PrestazioneForm Component
 * 
 * Form per creazione/modifica prestazioni mediche.
 * Allineato completamente allo schema Prisma e alla validazione backend.
 * 
 * Campi Prisma supportati:
 * - codice (required, unique per tenant)
 * - nome (required)
 * - descrizione (optional)
 * - tipo (enum: VISITA, ESAME, TERAPIA, INTERVENTO, CONSULTO, ALTRO)
 * - durataPrevista (int, min 5, max 480, default 30)
 * - prezzoBase (required, decimal)
 * - ivaAliquota (decimal, 0-100, default 0)
 * - istruzioniPreparazione (optional)
 * - richiedeStrumento (bool, default false)
 * - strumentiRichiesti (string[], default [])
 * - attivo (bool, default true)
 * 
 * @module pages/poliambulatorio/catalogo/PrestazioneForm
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Save,
    Loader2,
    FileText,
    Clock,
    Stethoscope,
    AlertCircle,
    Info,
    Activity,
    DollarSign,
    Wrench,
    Plus,
    X,
    ChevronDown,
    Search
} from 'lucide-react';
import { prestazioniApi, strumentiApi } from '../../../services/clinicaApi';
import type { Prestazione, Strumento, TipoPrestazione } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { getAllSpecialties, addCustomSpecialty } from '../../../constants/specialties';
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

// Prisma enum TipologiaStrumento
type TipologiaStrumento =
    | 'ECOGRAFO' | 'ELETTROCARDIOGRAFO' | 'LASER' | 'CARBOSSITERAPIA'
    | 'SPIROMETRO' | 'AUDIOMETRO' | 'OFTALMOSCOPIO' | 'DERMATOSCOPIO'
    | 'HOLTER_ECG' | 'HOLTER_PRESSORIO' | 'ELETTROMIOGRAFO' | 'DENSITOMETRO'
    | 'COLPOSCOPIO' | 'ENDOSCOPIO' | 'RADIOGRAFO' | 'MAMMOGRAFO'
    | 'TAC' | 'RMN' | 'MONITOR_MULTIPARAMETRICO' | 'DEFIBRILLATORE'
    | 'ELETTROBISTURI' | 'CRIOCHIRURGIA' | 'ALTRO';

// Tipologia richiesta per il form (allineata con PrestazioneTipologiaStrumento)
interface TipologiaRichiesta {
    tipologia: TipologiaStrumento;
    obbligatorio: boolean;
}

// Extend Prestazione to include tipologieRichieste relation
interface PrestazioneWithTipologie extends Prestazione {
    tipologieRichieste?: {
        tipologia: TipologiaStrumento;
        obbligatorio: boolean;
    }[];
}

interface FormData {
    codice: string;
    nome: string;
    descrizione: string;
    tipo: TipoPrestazione;
    brancheSpecialistiche: string[]; // Array di branche
    durataPrevista: number;
    prezzoBase: string;
    ivaAliquota: string;
    istruzioniPreparazione: string;
    richiedeStrumento: boolean;
    strumentiRichiesti: string[];
    tipologieRichieste: TipologiaRichiesta[]; // NEW: Tipologie strumenti richieste
    attivo: boolean;
}

interface FormErrors {
    [key: string]: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const TIPO_OPTIONS: { value: TipoPrestazione; label: string; description: string }[] = [
    { value: 'VISITA_SPECIALISTICA', label: 'Visita Specialistica', description: 'Visita medica specialistica' },
    { value: 'VISITA_MEDICINA_LAVORO', label: 'Visita Medicina del Lavoro', description: 'Visita per medicina del lavoro' },
    { value: 'ESAME_STRUMENTALE', label: 'Esame Strumentale', description: 'Esame diagnostico con strumentazione' },
    { value: 'ESAME_LABORATORIO', label: 'Esame di Laboratorio', description: 'Analisi di laboratorio' },
    { value: 'INTERVENTO_AMBULATORIALE', label: 'Intervento Ambulatoriale', description: 'Procedura chirurgica ambulatoriale' },
    { value: 'VACCINAZIONE', label: 'Vaccinazione', description: 'Somministrazione vaccini' },
    { value: 'CERTIFICAZIONE', label: 'Certificazione', description: 'Rilascio certificati medici' },
    { value: 'CONSULENZA', label: 'Consulenza', description: 'Consulenza medica specialistica' },
];

const DURATA_PRESETS = [15, 20, 30, 45, 60, 90, 120];

// Branche specialistiche now use the centralized module
// Custom branche can be added and will be synced with medici specialties

const IVA_PRESETS = [
    { value: '0', label: 'Esente' },
    { value: '4', label: '4%' },
    { value: '10', label: '10%' },
    { value: '22', label: '22%' }
];

// Tipologie strumenti disponibili (enum TipologiaStrumento)
const TIPOLOGIE_STRUMENTO: { value: TipologiaStrumento; label: string; categoria: string }[] = [
    // Cardiologia
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
    // Medicina Lavoro
    { value: 'SPIROMETRO', label: 'Spirometro', categoria: 'Medicina Lavoro' },
    { value: 'AUDIOMETRO', label: 'Audiometro', categoria: 'Medicina Lavoro' },
    { value: 'OFTALMOSCOPIO', label: 'Oftalmoscopio', categoria: 'Medicina Lavoro' },
    // Dermatologia
    { value: 'DERMATOSCOPIO', label: 'Dermatoscopio', categoria: 'Dermatologia' },
    { value: 'LASER', label: 'Laser', categoria: 'Dermatologia' },
    { value: 'CARBOSSITERAPIA', label: 'Carbossiterapia', categoria: 'Dermatologia' },
    { value: 'CRIOCHIRURGIA', label: 'Criochirurgia', categoria: 'Dermatologia' },
    // Altri
    { value: 'ELETTROMIOGRAFO', label: 'Elettromiografo (EMG)', categoria: 'Neurologia' },
    { value: 'COLPOSCOPIO', label: 'Colposcopio', categoria: 'Ginecologia' },
    { value: 'ENDOSCOPIO', label: 'Endoscopio', categoria: 'Endoscopia' },
    { value: 'ELETTROBISTURI', label: 'Elettrobisturi', categoria: 'Chirurgia' },
    { value: 'MONITOR_MULTIPARAMETRICO', label: 'Monitor Multiparametrico', categoria: 'Monitoraggio' },
    { value: 'ALTRO', label: 'Altro', categoria: 'Altro' }
];

const INITIAL_FORM_DATA: FormData = {
    codice: '',
    nome: '',
    descrizione: '',
    tipo: 'VISITA_SPECIALISTICA',
    brancheSpecialistiche: [],
    durataPrevista: 30,
    prezzoBase: '',
    ivaAliquota: '0',
    istruzioniPreparazione: '',
    richiedeStrumento: false,
    strumentiRichiesti: [],
    tipologieRichieste: [],
    attivo: true,
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const PrestazioneForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const isEditing = Boolean(id);

    // State
    const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isDirty, setIsDirty] = useState(false);

    // Branche specialistiche multi-select state
    const [showBrancheDropdown, setShowBrancheDropdown] = useState(false);
    const [brancheSearch, setBrancheSearch] = useState('');
    const [availableBranche, setAvailableBranche] = useState<string[]>(getAllSpecialties());
    const brancheRef = useRef<HTMLDivElement>(null);

    // Refresh available branche when dropdown opens
    useEffect(() => {
        if (showBrancheDropdown) {
            setAvailableBranche(getAllSpecialties());
        }
    }, [showBrancheDropdown]);

    // Close branche dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (brancheRef.current && !brancheRef.current.contains(event.target as Node)) {
                setShowBrancheDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Query for strumenti dropdown
    const { data: strumentiResponse } = useQuery({
        queryKey: ['strumenti'],
        queryFn: () => strumentiApi.getAll()
    });

    // Extract strumenti array from PaginatedResponse
    const strumenti: Strumento[] = strumentiResponse?.data || [];

    // Query for editing - cast to extended type for tipologieRichieste
    const { data: prestazione, isLoading: isLoadingPrestazione } = useQuery<PrestazioneWithTipologie>({
        queryKey: ['prestazioni', id],
        queryFn: () => prestazioniApi.getById(id!) as Promise<PrestazioneWithTipologie>,
        enabled: isEditing,
    });

    // Populate form when editing
    useEffect(() => {
        if (prestazione) {
            // Handle both new array format and legacy single string
            const branche = prestazione.brancheSpecialistiche && prestazione.brancheSpecialistiche.length > 0
                ? prestazione.brancheSpecialistiche
                : (prestazione.brancaSpecialistica ? [prestazione.brancaSpecialistica] : []);

            // Extract tipologie from tipologieRichieste relation
            const tipologie: TipologiaRichiesta[] = (prestazione.tipologieRichieste || []).map((t: { tipologia: TipologiaStrumento; obbligatorio: boolean }) => ({
                tipologia: t.tipologia,
                obbligatorio: t.obbligatorio ?? true
            }));

            setFormData({
                codice: prestazione.codice || '',
                nome: prestazione.nome || '',
                descrizione: prestazione.descrizione || '',
                tipo: prestazione.tipo || 'VISITA_SPECIALISTICA',
                brancheSpecialistiche: branche,
                durataPrevista: prestazione.durataPrevista || 30,
                prezzoBase: prestazione.prezzoBase ? String(prestazione.prezzoBase) : '',
                ivaAliquota: prestazione.ivaAliquota ? String(prestazione.ivaAliquota) : '0',
                istruzioniPreparazione: prestazione.istruzioniPreparazione || '',
                richiedeStrumento: prestazione.richiedeStrumento ?? false,
                strumentiRichiesti: prestazione.strumentiRichiesti || [],
                tipologieRichieste: tipologie,
                attivo: prestazione.attivo ?? true,
            });
        }
    }, [prestazione]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<Prestazione>) => {
            console.log('📋 [PRESTAZIONE CREATE] Submitting data:', JSON.stringify(data, null, 2));
            return prestazioniApi.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestazioni'] });
            showToast({ type: 'success', message: 'Prestazione creata con successo' });
            navigate('/poliambulatorio/catalogo/prestazioni');
        },
        onError: (error: Error & { response?: { data?: { error?: string; message?: string } } }) => {
            console.error('📋 [PRESTAZIONE CREATE] Error:', error);

            // Extract error message from response if available
            const responseError = error.response?.data?.error || error.response?.data?.message;
            let errorMessage = responseError || error.message || 'Errore durante la creazione';

            // Handle specific error cases
            if (errorMessage.includes('già esistente') || errorMessage.includes('already exists')) {
                errorMessage = 'Il codice prestazione è già in uso. Prova con un codice diverso.';
            } else if (error.message?.includes('500') || error.message?.includes('Internal Server')) {
                errorMessage = 'Errore del server. Riprova tra qualche secondo o contatta l\'assistenza.';
            }

            showToast({ type: 'error', message: errorMessage });
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Prestazione>) => {
            console.log('📋 [PRESTAZIONE UPDATE] Submitting data:', JSON.stringify(data, null, 2));
            return prestazioniApi.update(id!, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestazioni'] });
            queryClient.invalidateQueries({ queryKey: ['prestazioni', id] });
            showToast({ type: 'success', message: 'Prestazione aggiornata con successo' });
            navigate('/poliambulatorio/catalogo/prestazioni');
        },
        onError: (error: Error & { response?: { data?: { error?: string; message?: string } } }) => {
            console.error('📋 [PRESTAZIONE UPDATE] Error:', error);

            // Extract error message from response if available
            const responseError = error.response?.data?.error || error.response?.data?.message;
            let errorMessage = responseError || error.message || 'Errore durante l\'aggiornamento';

            // Handle specific error cases
            if (errorMessage.includes('già esistente') || errorMessage.includes('already exists')) {
                errorMessage = 'Il codice prestazione è già in uso. Prova con un codice diverso.';
            } else if (errorMessage.includes('not found') || errorMessage.includes('non trovata')) {
                errorMessage = 'La prestazione non è stata trovata. Potrebbe essere stata eliminata.';
            } else if (error.message?.includes('500') || error.message?.includes('Internal Server')) {
                errorMessage = 'Errore del server. Riprova tra qualche secondo o contatta l\'assistenza.';
            }

            showToast({ type: 'error', message: errorMessage });
        }
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    // Validation - aligned with backend Joi schema
    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        // codice: required, 2-50 chars, alphanumeric + _ -
        if (!formData.codice.trim()) {
            newErrors.codice = 'Il codice è obbligatorio';
        } else if (!/^[A-Z0-9_-]+$/i.test(formData.codice)) {
            newErrors.codice = 'Il codice può contenere solo lettere, numeri, trattini e underscore';
        } else if (formData.codice.length < 2 || formData.codice.length > 50) {
            newErrors.codice = 'Il codice deve essere tra 2 e 50 caratteri';
        }

        // nome: required, 3-300 chars
        if (!formData.nome.trim()) {
            newErrors.nome = 'Il nome è obbligatorio';
        } else if (formData.nome.length < 3 || formData.nome.length > 300) {
            newErrors.nome = 'Il nome deve essere tra 3 e 300 caratteri';
        }

        // durataPrevista: 5-480
        if (formData.durataPrevista < 5 || formData.durataPrevista > 480) {
            newErrors.durataPrevista = 'La durata deve essere tra 5 e 480 minuti';
        }

        // prezzoBase: required, >= 0
        if (!formData.prezzoBase) {
            newErrors.prezzoBase = 'Il prezzo è obbligatorio';
        } else if (isNaN(parseFloat(formData.prezzoBase)) || parseFloat(formData.prezzoBase) < 0) {
            newErrors.prezzoBase = 'Il prezzo deve essere un numero positivo';
        }

        // ivaAliquota: 0-100
        const iva = parseFloat(formData.ivaAliquota);
        if (isNaN(iva) || iva < 0 || iva > 100) {
            newErrors.ivaAliquota = 'L\'aliquota IVA deve essere tra 0 e 100';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handlers
    const handleChange = (field: keyof FormData, value: string | number | boolean | string[] | TipologiaRichiesta[]) => {
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

    // Toggle branca specialistica
    const toggleBranca = (branca: string) => {
        setFormData(prev => ({
            ...prev,
            brancheSpecialistiche: prev.brancheSpecialistiche.includes(branca)
                ? prev.brancheSpecialistiche.filter(b => b !== branca)
                : [...prev.brancheSpecialistiche, branca]
        }));
        setIsDirty(true);
    };

    // Filter branche based on search
    // Filter branche based on search using centralized list
    const filteredBranche = availableBranche.filter(b =>
        b.toLowerCase().includes(brancheSearch.toLowerCase())
    );

    // Add a new custom specialty/branca
    const handleAddCustomBranca = () => {
        const trimmed = brancheSearch.trim();
        if (trimmed && !availableBranche.includes(trimmed)) {
            addCustomSpecialty(trimmed);
            setAvailableBranche(getAllSpecialties());
            toggleBranca(trimmed);
            setBrancheSearch('');
            showToast({ type: 'success', message: `Branca "${trimmed}" aggiunta` });
        }
    };

    const handleAddStrumento = (strumentoId: string) => {
        if (strumentoId && !formData.strumentiRichiesti.includes(strumentoId)) {
            handleChange('strumentiRichiesti', [...formData.strumentiRichiesti, strumentoId]);
        }
    };

    const handleRemoveStrumento = (strumentoId: string) => {
        handleChange('strumentiRichiesti', formData.strumentiRichiesti.filter(id => id !== strumentoId));
    };

    // Handler per tipologie richieste
    const handleAddTipologia = (tipologia: TipologiaStrumento) => {
        if (tipologia && !formData.tipologieRichieste.some(t => t.tipologia === tipologia)) {
            handleChange('tipologieRichieste', [
                ...formData.tipologieRichieste,
                { tipologia, obbligatorio: true }
            ]);
        }
    };

    const handleRemoveTipologia = (tipologia: TipologiaStrumento) => {
        handleChange('tipologieRichieste', formData.tipologieRichieste.filter(t => t.tipologia !== tipologia));
    };

    const handleToggleTipologiaObbligatorio = (tipologia: TipologiaStrumento) => {
        handleChange('tipologieRichieste', formData.tipologieRichieste.map(t =>
            t.tipologia === tipologia ? { ...t, obbligatorio: !t.obbligatorio } : t
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            showToast({ type: 'error', message: 'Correggi gli errori nel form' });
            return;
        }

        // Build submit data with extended tipologie support
        const submitData: Partial<PrestazioneWithTipologie> = {
            codice: formData.codice.toUpperCase().trim(),
            nome: formData.nome.trim(),
            descrizione: formData.descrizione.trim() || undefined,
            tipo: formData.tipo,
            brancheSpecialistiche: formData.brancheSpecialistiche.length > 0 ? formData.brancheSpecialistiche : undefined,
            durataPrevista: formData.durataPrevista,
            prezzoBase: parseFloat(formData.prezzoBase),
            ivaAliquota: parseFloat(formData.ivaAliquota),
            istruzioniPreparazione: formData.istruzioniPreparazione.trim() || undefined,
            richiedeStrumento: formData.richiedeStrumento,
            strumentiRichiesti: formData.strumentiRichiesti,
            // Invia tipologie richieste al backend
            tipologieRichieste: formData.tipologieRichieste.length > 0 ? formData.tipologieRichieste : undefined,
            attivo: formData.attivo,
        };

        if (isEditing) {
            updateMutation.mutate(submitData as Partial<Prestazione>);
        } else {
            createMutation.mutate(submitData as Partial<Prestazione>);
        }
    };

    const handleCancel = () => {
        if (isDirty && !confirm('Hai modifiche non salvate. Sei sicuro di voler uscire?')) {
            return;
        }
        navigate('/poliambulatorio/catalogo/prestazioni');
    };

    // Loading state
    if (isEditing && isLoadingPrestazione) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-teal-600 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Torna al catalogo
                </button>
                <h1 className="text-2xl font-semibold text-gray-900">
                    {isEditing ? 'Modifica Prestazione' : 'Nuova Prestazione'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {isEditing
                        ? 'Modifica i dati della prestazione medica'
                        : 'Inserisci i dati per creare una nuova prestazione'}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-teal-100">
                            <FileText className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Informazioni Base</h2>
                            <p className="text-sm text-gray-500">Dati identificativi della prestazione</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Codice */}
                        <div>
                            <label className="label-clinica">
                                Codice <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.codice}
                                onChange={(e) => handleChange('codice', e.target.value.toUpperCase())}
                                placeholder="es. VIS-CARD-001"
                                className={`input-clinica ${errors.codice ? 'border-red-500' : ''}`}
                            />
                            {errors.codice && (
                                <p className="mt-1 text-sm text-red-600">{errors.codice}</p>
                            )}
                        </div>

                        {/* Stato Attivo */}
                        <div className="flex items-center">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.attivo}
                                    onChange={(e) => handleChange('attivo', e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                                />
                                <div>
                                    <span className="font-medium text-gray-900">Prestazione attiva</span>
                                    <p className="text-sm text-gray-500">Se disattivata, non sarà prenotabile</p>
                                </div>
                            </label>
                        </div>

                        {/* Nome */}
                        <div className="md:col-span-2">
                            <label className="label-clinica">
                                Nome prestazione <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.nome}
                                onChange={(e) => handleChange('nome', e.target.value)}
                                placeholder="es. Visita Cardiologica"
                                className={`input-clinica ${errors.nome ? 'border-red-500' : ''}`}
                            />
                            {errors.nome && (
                                <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
                            )}
                        </div>

                        {/* Descrizione */}
                        <div className="md:col-span-2">
                            <label className="label-clinica">Descrizione</label>
                            <textarea
                                value={formData.descrizione}
                                onChange={(e) => handleChange('descrizione', e.target.value)}
                                rows={3}
                                placeholder="Descrizione della prestazione..."
                                className="input-clinica resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Type and Duration Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <Stethoscope className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Tipo e Durata</h2>
                            <p className="text-sm text-gray-500">Configurazione della tipologia</p>
                        </div>
                    </div>

                    {/* Tipo */}
                    <div className="mb-6">
                        <label className="label-clinica">
                            Tipologia <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {TIPO_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleChange('tipo', option.value)}
                                    className={`p-4 rounded-lg border-2 text-left transition-all ${formData.tipo === option.value
                                        ? 'border-teal-500 bg-teal-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <span className={`font-medium ${formData.tipo === option.value
                                        ? 'text-teal-700'
                                        : 'text-gray-900'
                                        }`}>
                                        {option.label}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {option.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Branca Specialistica - Multi-select con searchbar */}
                    <div className="mb-6" ref={brancheRef}>
                        <label className="label-clinica">
                            Branche Specialistiche
                        </label>

                        {/* Selected branche tags */}
                        {formData.brancheSpecialistiche.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.brancheSpecialistiche.map((branca, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm"
                                    >
                                        {branca}
                                        <button
                                            type="button"
                                            onClick={() => toggleBranca(branca)}
                                            className="p-0.5 hover:bg-teal-200 rounded-full transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Dropdown trigger */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowBrancheDropdown(!showBrancheDropdown)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-left flex items-center justify-between hover:border-teal-500 transition-colors"
                            >
                                <span className="text-gray-500">
                                    {formData.brancheSpecialistiche.length === 0
                                        ? 'Seleziona branche specialistiche...'
                                        : `${formData.brancheSpecialistiche.length} branca/e selezionata/e`}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showBrancheDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown menu */}
                            {showBrancheDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                                    {/* Search input */}
                                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={brancheSearch}
                                                onChange={(e) => setBrancheSearch(e.target.value)}
                                                placeholder="Cerca o crea branca specialistica..."
                                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    {/* Options with search filter */}
                                    <div className="max-h-48 overflow-y-auto">
                                        {filteredBranche.length === 0 && brancheSearch.trim() ? (
                                            <button
                                                type="button"
                                                onClick={handleAddCustomBranca}
                                                className="w-full px-3 py-2 text-left text-sm text-teal-700 hover:bg-teal-50 flex items-center gap-2"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Crea nuova branca: "{brancheSearch.trim()}"
                                            </button>
                                        ) : filteredBranche.length === 0 ? (
                                            <p className="px-3 py-2 text-sm text-gray-500 text-center">
                                                Nessuna branca trovata
                                            </p>
                                        ) : (
                                            <>
                                                {filteredBranche.map((branca) => (
                                                    <label
                                                        key={branca}
                                                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.brancheSpecialistiche.includes(branca)}
                                                            onChange={() => toggleBranca(branca)}
                                                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700">{branca}</span>
                                                    </label>
                                                ))}
                                                {/* Show "Create new" option if search text doesn't match any existing */}
                                                {brancheSearch.trim() && !availableBranche.some(b => b.toLowerCase() === brancheSearch.trim().toLowerCase()) && (
                                                    <button
                                                        type="button"
                                                        onClick={handleAddCustomBranca}
                                                        className="w-full px-3 py-2 text-left text-sm text-teal-700 hover:bg-teal-50 flex items-center gap-2 border-t border-gray-100"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Crea nuova branca: "{brancheSearch.trim()}"
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                            Le branche specialistiche definiscono quali specialità mediche sono richieste per questa prestazione. Puoi crearne di nuove digitando nel campo di ricerca.
                        </p>
                    </div>

                    {/* Durata */}
                    <div>
                        <label className="label-clinica">
                            Durata prevista (minuti) <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-4 flex-wrap">
                            <input
                                type="number"
                                value={formData.durataPrevista}
                                onChange={(e) => handleChange('durataPrevista', parseInt(e.target.value) || 0)}
                                min={5}
                                max={480}
                                className={`w-32 input-clinica ${errors.durataPrevista ? 'border-red-500' : ''}`}
                            />
                            <div className="flex items-center gap-2 flex-wrap">
                                {DURATA_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => handleChange('durataPrevista', preset)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${formData.durataPrevista === preset
                                            ? 'bg-teal-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {preset}'
                                    </button>
                                ))}
                            </div>
                        </div>
                        {errors.durataPrevista && (
                            <p className="mt-1 text-sm text-red-600">{errors.durataPrevista}</p>
                        )}
                    </div>
                </div>

                {/* Pricing Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-green-100">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Prezzo</h2>
                            <p className="text-sm text-gray-500">Configurazione del prezzo base</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Prezzo Base */}
                        <div>
                            <label className="label-clinica">
                                Prezzo base (€) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.prezzoBase}
                                onChange={(e) => handleChange('prezzoBase', e.target.value)}
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className={`input-clinica ${errors.prezzoBase ? 'border-red-500' : ''}`}
                            />
                            {errors.prezzoBase && (
                                <p className="mt-1 text-sm text-red-600">{errors.prezzoBase}</p>
                            )}
                        </div>

                        {/* IVA */}
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
                            <p className="text-xs text-gray-500 mt-1">
                                Prestazioni sanitarie: generalmente esenti IVA (0%)
                            </p>
                        </div>

                        {/* Prezzo calcolato */}
                        {formData.prezzoBase && (
                            <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Prezzo finale (IVA inclusa):</span>
                                    <span className="text-xl font-bold text-gray-900">
                                        € {(parseFloat(formData.prezzoBase) * (1 + parseFloat(formData.ivaAliquota || '0') / 100)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tipologie Strumenti Richieste Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-indigo-100">
                            <Wrench className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Tipologie Strumenti Richieste</h2>
                            <p className="text-sm text-gray-500">Tipologie di strumenti necessari (invece di strumenti specifici)</p>
                        </div>
                    </div>

                    {/* Tipologie selezionate */}
                    {formData.tipologieRichieste.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {formData.tipologieRichieste.map((tipReq) => {
                                const tipInfo = TIPOLOGIE_STRUMENTO.find(t => t.value === tipReq.tipologia);
                                return (
                                    <div key={tipReq.tipologia} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                                {tipInfo?.categoria || 'Altro'}
                                            </span>
                                            <span className="font-medium text-gray-900">
                                                {tipInfo?.label || tipReq.tipologia}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={tipReq.obbligatorio}
                                                    onChange={() => handleToggleTipologiaObbligatorio(tipReq.tipologia)}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-gray-600">Obbligatorio</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTipologia(tipReq.tipologia)}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Aggiungi tipologia - grouped by categoria */}
                    <div className="flex gap-2">
                        <select
                            className="select-clinica flex-1"
                            onChange={(e) => {
                                handleAddTipologia(e.target.value as TipologiaStrumento);
                                e.target.value = '';
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>Seleziona tipologia da aggiungere...</option>
                            {Object.entries(
                                TIPOLOGIE_STRUMENTO
                                    .filter(t => !formData.tipologieRichieste.some(tr => tr.tipologia === t.value))
                                    .reduce((acc, t) => {
                                        if (!acc[t.categoria]) acc[t.categoria] = [];
                                        acc[t.categoria].push(t);
                                        return acc;
                                    }, {} as Record<string, typeof TIPOLOGIE_STRUMENTO>)
                            ).map(([categoria, tipologie]) => (
                                <optgroup key={categoria} label={categoria}>
                                    {tipologie.map(t => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {formData.tipologieRichieste.length === 0 && (
                        <p className="text-sm text-gray-500 mt-3">
                            Nessuna tipologia di strumento richiesta. Seleziona una o più tipologie per indicare quali tipi di strumenti sono necessari per questa prestazione.
                        </p>
                    )}
                </div>

                {/* Istruzioni Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-purple-100">
                            <Info className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Istruzioni Preparazione</h2>
                            <p className="text-sm text-gray-500">Istruzioni per il paziente prima della prestazione</p>
                        </div>
                    </div>

                    <textarea
                        value={formData.istruzioniPreparazione}
                        onChange={(e) => handleChange('istruzioniPreparazione', e.target.value)}
                        rows={4}
                        placeholder="es. Presentarsi a digiuno da almeno 8 ore..."
                        className="input-clinica resize-none"
                    />
                    <div className="mt-1 flex items-start gap-2 text-xs text-gray-500">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <span>Queste istruzioni saranno mostrate al paziente durante la prenotazione</span>
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
                                {isEditing ? 'Salva Modifiche' : 'Crea Prestazione'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PrestazioneForm;
