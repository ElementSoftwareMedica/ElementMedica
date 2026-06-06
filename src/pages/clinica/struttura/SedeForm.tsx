/**
 * SedeForm
 * 
 * Form per creazione/modifica sede poliambulatorio.
 * Supporta tutti i campi Prisma con validazione allineata al backend.
 * Include gestione avanzata orari settimanali e chiusure speciali.
 * 
 * @module pages/poliambulatorio/struttura/SedeForm
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Clock,
    ArrowLeft,
    Save,
    Loader2,
    Star,
    User,
    Info,
    CalendarOff,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { clinicaApi, type SedePoliambulatorio, type SedePoliambulatorioInput, type Poliambulatorio } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import OrariAperturaEditor, { type OrarioGiornaliero } from '../../../components/clinica/OrariAperturaEditor';
import ChiusureSpecialiEditor, { type ChiusuraSpeciale } from '../../../components/clinica/ChiusureSpecialiEditor';
import ElegantSelect from '../../../components/ui/ElegantSelect';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

interface FormData {
    nome: string;
    codice: string;
    indirizzo: string;
    citta: string;
    cap: string;
    provincia: string;
    telefono: string;
    email: string;
    isPrincipale: boolean;
    isAttiva: boolean;
    oraAperturaOverride: string;
    oraChiusuraOverride: string;
    noteAccessibilita: string;
    latitudine: string;
    longitudine: string;
}

const initialFormData: FormData = {
    nome: '',
    codice: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    telefono: '',
    email: '',
    isPrincipale: false,
    isAttiva: true,
    oraAperturaOverride: '',
    oraChiusuraOverride: '',
    noteAccessibilita: '',
    latitudine: '',
    longitudine: ''
};

interface FormErrors {
    [key: string]: string;
}

const SedeForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const poliambulatorioId = searchParams.get('poliambulatorioId');
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmWarning } = useConfirmDialog();
    const isEditing = Boolean(id);

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isDirty, setIsDirty] = useState(false);

    // Stati per orari settimanali e chiusure speciali
    const [orariSettimanali, setOrariSettimanali] = useState<OrarioGiornaliero[]>([]);
    const [chiusureSpeciali, setChiusureSpeciali] = useState<ChiusuraSpeciale[]>([]);
    const [expandedSections, setExpandedSections] = useState({
        orari: true,
        chiusure: true
    });

    // Fetch poliambulatorio info (per mostrare a quale appartiene)
    const { data: poliambulatorio } = useQuery({
        queryKey: ['poliambulatorio', poliambulatorioId],
        queryFn: () => clinicaApi.poliambulatori.getById(poliambulatorioId!),
        enabled: Boolean(poliambulatorioId)
    });

    // Load existing data if editing
    const { data: existingData, isLoading: isLoadingData } = useQuery({
        queryKey: ['sede', id],
        queryFn: () => clinicaApi.sedi.getById(id!),
        enabled: isEditing
    });

    // Fetch all poliambulatori for selection if no poliambulatorioId
    const { data: poliambulatoriList } = useQuery({
        queryKey: ['poliambulatori'],
        queryFn: () => clinicaApi.poliambulatori.getAll(),
        enabled: !poliambulatorioId && !isEditing
    });

    const [selectedPoliambulatorioId, setSelectedPoliambulatorioId] = useState<string>(poliambulatorioId || '');

    // Update form when data loads
    useEffect(() => {
        if (existingData) {
            setFormData({
                nome: existingData.nome || '',
                codice: existingData.codice || '',
                indirizzo: existingData.indirizzo || '',
                citta: existingData.citta || '',
                cap: existingData.cap || '',
                provincia: existingData.provincia || '',
                telefono: existingData.telefono || '',
                email: existingData.email || '',
                isPrincipale: existingData.isPrincipale || false,
                isAttiva: existingData.isAttiva !== false,
                oraAperturaOverride: existingData.oraAperturaOverride || '',
                oraChiusuraOverride: existingData.oraChiusuraOverride || '',
                noteAccessibilita: existingData.noteAccessibilita || '',
                latitudine: existingData.latitudine?.toString() || '',
                longitudine: existingData.longitudine?.toString() || ''
            });
            if (existingData.poliambulatorioId) {
                setSelectedPoliambulatorioId(existingData.poliambulatorioId);
            }
            // Carica orari settimanali se presenti
            const existingWithOrari = existingData as { orariSettimanali?: { giornoSettimana: number; isChiuso?: boolean; fascia: number; oraInizio: string; oraFine: string; note?: string }[] };
            if (existingWithOrari.orariSettimanali && Array.isArray(existingWithOrari.orariSettimanali)) {
                // Raggruppa per giorno della settimana
                const orariPerGiorno: { [key: number]: OrarioGiornaliero } = {};
                existingWithOrari.orariSettimanali.forEach((orario) => {
                    if (!orariPerGiorno[orario.giornoSettimana]) {
                        orariPerGiorno[orario.giornoSettimana] = {
                            giornoSettimana: orario.giornoSettimana,
                            isChiuso: orario.isChiuso || false,
                            fasce: []
                        };
                    }
                    if (!orario.isChiuso) {
                        orariPerGiorno[orario.giornoSettimana].fasce.push({
                            fascia: orario.fascia,
                            oraInizio: orario.oraInizio,
                            oraFine: orario.oraFine,
                            note: orario.note
                        });
                    }
                });
                setOrariSettimanali(Object.values(orariPerGiorno));
            }
            // Carica chiusure speciali se presenti
            const existingWithChiusure = existingData as unknown as { chiusureSpeciali?: (ChiusuraSpeciale & { id: string })[] };
            if (existingWithChiusure.chiusureSpeciali && Array.isArray(existingWithChiusure.chiusureSpeciali)) {
                setChiusureSpeciali(existingWithChiusure.chiusureSpeciali.map((c) => ({
                    id: c.id,
                    tipo: c.tipo,
                    nome: c.nome,
                    descrizione: c.descrizione,
                    dataInizio: c.dataInizio?.split('T')[0] || c.dataInizio,
                    dataFine: c.dataFine?.split('T')[0] || c.dataFine,
                    oraInizio: c.oraInizio,
                    oraFine: c.oraFine,
                    isParziale: c.isParziale,
                    ricorrente: c.ricorrente,
                    annoRiferimento: c.annoRiferimento,
                    attivo: c.attivo
                })));
            }
        }
    }, [existingData]);

    // Update selected poliambulatorio when URL param changes
    useEffect(() => {
        if (poliambulatorioId) {
            setSelectedPoliambulatorioId(poliambulatorioId);
        }
    }, [poliambulatorioId]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: SedePoliambulatorioInput) =>
            clinicaApi.sedi.create(selectedPoliambulatorioId, data as Partial<SedePoliambulatorio>),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sedi'] });
            queryClient.invalidateQueries({ queryKey: ['poliambulatori'] });
            showToast({ type: 'success', message: 'Sede creata con successo' });
            navigate('/poliambulatorio/sedi');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la creazione' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: SedePoliambulatorioInput) =>
            clinicaApi.sedi.update(id!, data as Partial<SedePoliambulatorio>),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sedi'] });
            queryClient.invalidateQueries({ queryKey: ['sede', id] });
            showToast({ type: 'success', message: 'Sede aggiornata con successo' });
            navigate('/poliambulatorio/sedi');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento' });
        }
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    // Validation - aligned with Prisma schema
    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        // Required fields
        if (!selectedPoliambulatorioId && !isEditing) {
            newErrors.poliambulatorioId = 'Seleziona un poliambulatorio';
        }

        if (!formData.nome.trim()) {
            newErrors.nome = 'Il nome è obbligatorio';
        } else if (formData.nome.length < 2) {
            newErrors.nome = 'Il nome deve avere almeno 2 caratteri';
        }

        if (!formData.indirizzo.trim()) {
            newErrors.indirizzo = 'L\'indirizzo è obbligatorio';
        }

        if (!formData.citta.trim()) {
            newErrors.citta = 'La città è obbligatoria';
        }

        if (!formData.cap.trim()) {
            newErrors.cap = 'Il CAP è obbligatorio';
        } else if (!/^\d{5}$/.test(formData.cap)) {
            newErrors.cap = 'CAP deve essere di 5 cifre';
        }

        if (!formData.provincia.trim()) {
            newErrors.provincia = 'La provincia è obbligatoria';
        } else if (formData.provincia.length !== 2) {
            newErrors.provincia = 'Provincia deve essere di 2 caratteri (es. MI)';
        }

        // Optional field validations
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email non valida';
        }

        if (formData.latitudine && isNaN(parseFloat(formData.latitudine))) {
            newErrors.latitudine = 'Latitudine deve essere un numero';
        }

        if (formData.longitudine && isNaN(parseFloat(formData.longitudine))) {
            newErrors.longitudine = 'Longitudine deve essere un numero';
        }

        if (formData.oraAperturaOverride && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.oraAperturaOverride)) {
            newErrors.oraAperturaOverride = 'Formato ora non valido (HH:MM)';
        }

        if (formData.oraChiusuraOverride && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.oraChiusuraOverride)) {
            newErrors.oraChiusuraOverride = 'Formato ora non valido (HH:MM)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        setFormData(prev => ({ ...prev, [name]: newValue }));
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

    const handlePoliambulatorioSelect = (value: string) => {
        setSelectedPoliambulatorioId(value);
        setIsDirty(true);
        if (errors.poliambulatorioId) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.poliambulatorioId;
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

        // Converti orari settimanali in formato per il backend
        const orariPerBackend = orariSettimanali.flatMap(giorno => {
            if (giorno.isChiuso || giorno.fasce.length === 0) {
                // Segna il giorno come chiuso
                return [{
                    giornoSettimana: giorno.giornoSettimana,
                    fascia: 1,
                    oraInizio: '00:00',
                    oraFine: '00:00',
                    isChiuso: true
                }];
            }
            return giorno.fasce.map(fascia => ({
                giornoSettimana: giorno.giornoSettimana,
                fascia: fascia.fascia,
                oraInizio: fascia.oraInizio,
                oraFine: fascia.oraFine,
                note: fascia.note,
                isChiuso: false
            }));
        });

        // Converti chiusure speciali in formato per il backend
        const chiusurePerBackend = chiusureSpeciali.map(c => ({
            ...(c.id && !c.id.startsWith('temp-') ? { id: c.id } : {}),
            tipo: c.tipo,
            nome: c.nome,
            descrizione: c.descrizione,
            dataInizio: c.dataInizio,
            dataFine: c.dataFine,
            oraInizio: c.oraInizio,
            oraFine: c.oraFine,
            isParziale: c.isParziale,
            ricorrente: c.ricorrente,
            annoRiferimento: c.annoRiferimento,
            attivo: c.attivo
        }));

        const submitData: SedePoliambulatorioInput = {
            nome: formData.nome,
            codice: formData.codice || undefined,
            indirizzo: formData.indirizzo,
            citta: formData.citta,
            cap: formData.cap,
            provincia: formData.provincia.toUpperCase(),
            telefono: formData.telefono || undefined,
            email: formData.email || undefined,
            isPrincipale: formData.isPrincipale,
            isAttiva: formData.isAttiva,
            oraAperturaOverride: formData.oraAperturaOverride || undefined,
            oraChiusuraOverride: formData.oraChiusuraOverride || undefined,
            noteAccessibilita: formData.noteAccessibilita || undefined,
            latitudine: formData.latitudine ? parseFloat(formData.latitudine) : undefined,
            longitudine: formData.longitudine ? parseFloat(formData.longitudine) : undefined,
            orariSettimanali: orariPerBackend.length > 0 ? orariPerBackend : undefined,
            chiusureSpeciali: chiusurePerBackend.length > 0 ? chiusurePerBackend : undefined
        };

        if (isEditing) {
            updateMutation.mutate(submitData);
        } else {
            createMutation.mutate(submitData);
        }
    };

    // Toggle section expansion
    const toggleSection = (section: 'orari' | 'chiusure') => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleCancel = async () => {
        if (isDirty && !(await confirmWarning('Modifiche non salvate', 'Hai modifiche non salvate. Sei sicuro di voler uscire?'))) {
            return;
        }
        navigate('/poliambulatorio/sedi');
    };

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

    // Get list of poliambulatori for selection
    const poliambulatoriOptions = Array.isArray(poliambulatoriList)
        ? poliambulatoriList
        : poliambulatoriList?.data || [];

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
                        {isEditing ? 'Modifica Sede' : 'Nuova Sede'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isEditing
                            ? 'Aggiorna le informazioni della sede'
                            : 'Inserisci i dati della nuova sede'
                        }
                    </p>
                </div>
            </div>

            {/* Poliambulatorio Info Banner */}
            {(poliambulatorio || (isEditing && existingData?.poliambulatorio)) && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-teal-600" />
                        <div>
                            <p className="text-sm text-teal-600">Poliambulatorio</p>
                            <p className="font-semibold text-teal-800">
                                {poliambulatorio?.nome || existingData?.poliambulatorio?.nome}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Selezione Poliambulatorio (solo se non già specificato) */}
                {!poliambulatorioId && !isEditing && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="h-5 w-5 text-teal-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Poliambulatorio</h2>
                        </div>
                        <div>
                            <label className="label-clinica">
                                Seleziona Poliambulatorio <span className="text-red-500">*</span>
                            </label>
                            <ElegantSelect
                                value={selectedPoliambulatorioId}
                                onChange={handlePoliambulatorioSelect}
                                placeholder="Seleziona poliambulatorio"
                                triggerClassName={errors.poliambulatorioId ? 'border-red-500' : ''}
                                options={[
                                    { value: '', label: 'Seleziona poliambulatorio' },
                                    ...poliambulatoriOptions.map((p: Poliambulatorio) => ({ value: p.id, label: `${p.nome} (${p.codice})` }))
                                ]}
                            />
                            {errors.poliambulatorioId && (
                                <p className="text-red-500 text-sm mt-1">{errors.poliambulatorioId}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Informazioni Base */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Info className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Informazioni Base</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-clinica">
                                Nome Sede <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nome"
                                value={formData.nome}
                                onChange={handleChange}
                                className={`input-clinica ${errors.nome ? 'border-red-500' : ''}`}
                                placeholder="Es: Sede Centrale, Sede Nord..."
                            />
                            {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
                        </div>

                        <div>
                            <label className="label-clinica">Codice</label>
                            <input
                                type="text"
                                name="codice"
                                value={formData.codice}
                                onChange={handleChange}
                                className="input-clinica"
                                placeholder="Codice univoco (opzionale)"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isPrincipale"
                                    checked={formData.isPrincipale}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                />
                                <span className="flex items-center gap-1 text-gray-700">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    Sede Principale
                                </span>
                            </label>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isAttiva"
                                    checked={formData.isAttiva}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                />
                                <span className="text-gray-700">Sede Attiva</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Indirizzo */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Indirizzo</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="label-clinica">
                                Indirizzo <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="indirizzo"
                                value={formData.indirizzo}
                                onChange={handleChange}
                                className={`input-clinica ${errors.indirizzo ? 'border-red-500' : ''}`}
                                placeholder="Via/Piazza e numero civico"
                            />
                            {errors.indirizzo && <p className="text-red-500 text-sm mt-1">{errors.indirizzo}</p>}
                        </div>

                        <div>
                            <label className="label-clinica">
                                Città <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="citta"
                                value={formData.citta}
                                onChange={handleChange}
                                className={`input-clinica ${errors.citta ? 'border-red-500' : ''}`}
                                placeholder="Città"
                            />
                            {errors.citta && <p className="text-red-500 text-sm mt-1">{errors.citta}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-clinica">
                                    CAP <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="cap"
                                    value={formData.cap}
                                    onChange={handleChange}
                                    className={`input-clinica ${errors.cap ? 'border-red-500' : ''}`}
                                    placeholder="00000"
                                    maxLength={5}
                                />
                                {errors.cap && <p className="text-red-500 text-sm mt-1">{errors.cap}</p>}
                            </div>
                            <div>
                                <label className="label-clinica">
                                    Provincia <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="provincia"
                                    value={formData.provincia}
                                    onChange={handleChange}
                                    className={`input-clinica ${errors.provincia ? 'border-red-500' : ''}`}
                                    placeholder="XX"
                                    maxLength={2}
                                />
                                {errors.provincia && <p className="text-red-500 text-sm mt-1">{errors.provincia}</p>}
                            </div>
                        </div>

                        {/* Coordinate GPS */}
                        <div>
                            <label className="label-clinica">Latitudine</label>
                            <input
                                type="text"
                                name="latitudine"
                                value={formData.latitudine}
                                onChange={handleChange}
                                className={`input-clinica ${errors.latitudine ? 'border-red-500' : ''}`}
                                placeholder="45.4642"
                            />
                            {errors.latitudine && <p className="text-red-500 text-sm mt-1">{errors.latitudine}</p>}
                        </div>

                        <div>
                            <label className="label-clinica">Longitudine</label>
                            <input
                                type="text"
                                name="longitudine"
                                value={formData.longitudine}
                                onChange={handleChange}
                                className={`input-clinica ${errors.longitudine ? 'border-red-500' : ''}`}
                                placeholder="9.1900"
                            />
                            {errors.longitudine && <p className="text-red-500 text-sm mt-1">{errors.longitudine}</p>}
                        </div>
                    </div>

                    {/* Google Maps Preview */}
                    {(formData.latitudine && formData.longitudine) || (formData.indirizzo && formData.citta) ? (
                        <div className="mt-6">
                            <label className="label-clinica flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-teal-600" />
                                Anteprima Mappa
                            </label>
                            <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
                                <iframe
                                    title="Mappa sede"
                                    width="100%"
                                    height="300"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={
                                        formData.latitudine && formData.longitudine
                                            ? `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500!2d${formData.longitudine}!3d${formData.latitudine}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zM!5e0!3m2!1sit!2sit!4v1!5m2!1sit!2sit`
                                            : `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(`${formData.indirizzo}, ${formData.cap} ${formData.citta} ${formData.provincia}`)}`
                                    }
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {formData.latitudine && formData.longitudine
                                    ? `Coordinate: ${formData.latitudine}, ${formData.longitudine}`
                                    : 'Mappa basata sull\'indirizzo inserito. Inserisci le coordinate GPS per una posizione precisa.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                            <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                                Inserisci l'indirizzo o le coordinate GPS per visualizzare la mappa
                            </p>
                        </div>
                    )}
                </div>

                {/* Contatti */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Phone className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Contatti</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-clinica">Telefono</label>
                            <input
                                type="tel"
                                name="telefono"
                                value={formData.telefono}
                                onChange={handleChange}
                                className="input-clinica"
                                placeholder="+39 000 0000000"
                            />
                        </div>

                        <div>
                            <label className="label-clinica">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`input-clinica ${errors.email ? 'border-red-500' : ''}`}
                                placeholder="email@sede.com"
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>
                    </div>
                </div>

                {/* Orari Settimanali Avanzati */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => toggleSection('orari')}
                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-teal-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Orari Settimanali</h2>
                            <span className="px-2 py-0.5 text-xs bg-teal-100 text-teal-700 rounded-full">
                                Avanzato
                            </span>
                        </div>
                        {expandedSections.orari ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                    </button>

                    {expandedSections.orari && (
                        <div className="px-6 pb-6 border-t border-gray-100">
                            <p className="text-sm text-gray-500 py-4">
                                Definisci gli orari di apertura per ogni giorno della settimana con multiple fasce orarie.
                            </p>
                            <OrariAperturaEditor
                                value={orariSettimanali}
                                onChange={(newOrari) => {
                                    setOrariSettimanali(newOrari);
                                    setIsDirty(true);
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Chiusure Speciali */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => toggleSection('chiusure')}
                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <CalendarOff className="h-5 w-5 text-teal-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Chiusure Speciali</h2>
                            {chiusureSpeciali.length > 0 && (
                                <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                    {chiusureSpeciali.filter(c => c.attivo).length} attive
                                </span>
                            )}
                        </div>
                        {expandedSections.chiusure ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                    </button>

                    {expandedSections.chiusure && (
                        <div className="px-6 pb-6 border-t border-gray-100">
                            <p className="text-sm text-gray-500 py-4">
                                Gestisci festività, ponti, ferie e altre chiusure straordinarie.
                            </p>
                            <ChiusureSpecialiEditor
                                value={chiusureSpeciali}
                                onChange={(newChiusure) => {
                                    setChiusureSpeciali(newChiusure);
                                    setIsDirty(true);
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Accessibilità */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <User className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Accessibilità</h2>
                    </div>

                    <div>
                        <label className="label-clinica">Note Accessibilità</label>
                        <textarea
                            name="noteAccessibilita"
                            value={formData.noteAccessibilita}
                            onChange={handleChange}
                            rows={3}
                            className="input-clinica"
                            placeholder="Es: Accesso disabili, parcheggio, mezzi pubblici..."
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Annulla
                    </button>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {isEditing ? 'Aggiornamento...' : 'Creazione...'}
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                {isEditing ? 'Aggiorna Sede' : 'Crea Sede'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SedeForm;
