/**
 * AmbulatorioForm
 * 
 * Form per creazione/modifica ambulatorio.
 * Allineato completamente allo schema Prisma e alla validazione backend.
 * 
 * Campi Prisma supportati:
 * - poliambulatorioId (required)
 * - sedeId (optional)
 * - nome (required)
 * - codice (required)
 * - specializzazione (optional)
 * - descrizione (optional)
 * - piano (optional)
 * - capacita (integer, default 1)
 * - stato (enum: ATTIVO, INATTIVO, MANUTENZIONE, CHIUSO)
 * - colore (optional, per calendario)
 * 
 * @module pages/poliambulatorio/struttura/AmbulatorioForm
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Stethoscope,
    Building2,
    MapPin,
    ArrowLeft,
    Save,
    Loader2,
    Users,
    Palette,
    Info
} from 'lucide-react';
import { ambulatoriApi, poliambulatoriApi, sediApi } from '../../../services/clinicaApi';
import type { Ambulatorio, Poliambulatorio, SedePoliambulatorio } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Prisma enum StatoAmbulatorio
type StatoAmbulatorio = 'ATTIVO' | 'INATTIVO' | 'MANUTENZIONE' | 'CHIUSO';

interface FormData {
    poliambulatorioId: string;
    sedeId: string;
    nome: string;
    codice: string;
    specializzazione: string;
    descrizione: string;
    piano: string;
    capacita: number;
    stato: StatoAmbulatorio;
    colore: string;
}

interface FormErrors {
    [key: string]: string;
}

// Specializzazioni comuni in ambito medico
const SPECIALIZZAZIONI = [
    'Cardiologia',
    'Dermatologia',
    'Endocrinologia',
    'Gastroenterologia',
    'Ginecologia',
    'Medicina Generale',
    'Medicina del Lavoro',
    'Neurologia',
    'Oculistica',
    'Ortopedia',
    'Otorinolaringoiatria',
    'Pediatria',
    'Pneumologia',
    'Psichiatria',
    'Radiologia',
    'Urologia',
    'Fisioterapia',
    'Odontoiatria',
    'Altro'
];

// Colori predefiniti per calendario
const COLORI_PREDEFINITI = [
    { value: '#3B82F6', label: 'Blu' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Arancione' },
    { value: '#EF4444', label: 'Rosso' },
    { value: '#8B5CF6', label: 'Viola' },
    { value: '#EC4899', label: 'Rosa' },
    { value: '#14B8A6', label: 'Teal' },
    { value: '#6B7280', label: 'Grigio' }
];

const initialFormData: FormData = {
    poliambulatorioId: '',
    sedeId: '',
    nome: '',
    codice: '',
    specializzazione: '',
    descrizione: '',
    piano: '',
    capacita: 1,
    stato: 'ATTIVO',
    colore: '#3B82F6'
};

const AmbulatorioForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmWarning } = useConfirmDialog();
    const isEditing = Boolean(id);

    // Pre-fill from query params
    const preselectedPoliambulatorio = searchParams.get('poliambulatorioId') || searchParams.get('poliambulatorio') || '';
    const preselectedSede = searchParams.get('sedeId') || '';

    const [formData, setFormData] = useState<FormData>({
        ...initialFormData,
        poliambulatorioId: preselectedPoliambulatorio,
        sedeId: preselectedSede
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isDirty, setIsDirty] = useState(false);

    // Load poliambulatori for select
    const { data: poliambulatoriData } = useQuery({
        queryKey: ['poliambulatori-list'],
        queryFn: () => poliambulatoriApi.getAll({ limit: 100 })
    });

    // Load sedi for the selected poliambulatorio
    const { data: sediData } = useQuery({
        queryKey: ['sedi-list', formData.poliambulatorioId],
        queryFn: () => sediApi.getByPoliambulatorio(formData.poliambulatorioId),
        enabled: Boolean(formData.poliambulatorioId)
    });

    // Load existing data if editing
    const { data: existingData, isLoading: isLoadingData } = useQuery({
        queryKey: ['ambulatorio', id],
        queryFn: () => ambulatoriApi.getById(id!),
        enabled: isEditing
    });

    // Update form when data loads
    useEffect(() => {
        if (existingData) {
            setFormData({
                poliambulatorioId: existingData.poliambulatorioId || '',
                sedeId: existingData.sedeId || '',
                nome: existingData.nome || '',
                codice: existingData.codice || '',
                specializzazione: existingData.specializzazione || '',
                descrizione: existingData.descrizione || '',
                piano: existingData.piano || '',
                capacita: existingData.capacita || 1,
                stato: existingData.stato || 'ATTIVO',
                colore: existingData.colore || '#3B82F6'
            });
        }
    }, [existingData]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<Ambulatorio>) => ambulatoriApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ambulatori'] });
            showToast({ type: 'success', message: 'Ambulatorio creato con successo' });
            navigate('/poliambulatorio/ambulatori');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la creazione' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Ambulatorio>) => ambulatoriApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ambulatori'] });
            queryClient.invalidateQueries({ queryKey: ['ambulatorio', id] });
            showToast({ type: 'success', message: 'Ambulatorio aggiornato con successo' });
            navigate('/poliambulatorio/ambulatori');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: "Errore durante l'aggiornamento" });
        }
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    // Validation - aligned with backend validation-clinical.js
    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        // Required fields
        if (!formData.poliambulatorioId) {
            newErrors.poliambulatorioId = 'Seleziona un poliambulatorio';
        }

        if (!formData.nome.trim()) {
            newErrors.nome = 'Il nome è obbligatorio';
        } else if (formData.nome.length < 2) {
            newErrors.nome = 'Il nome deve avere almeno 2 caratteri';
        }

        if (!formData.codice.trim()) {
            newErrors.codice = 'Il codice è obbligatorio';
        } else if (!/^[A-Z0-9_-]+$/i.test(formData.codice)) {
            newErrors.codice = 'Il codice deve contenere solo lettere, numeri, underscore e trattini';
        }

        // Validate capacita
        if (formData.capacita < 1) {
            newErrors.capacita = 'La capacità deve essere almeno 1';
        } else if (formData.capacita > 50) {
            newErrors.capacita = 'La capacità massima è 50';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        let newValue: string | number = value;
        if (type === 'number') {
            newValue = parseInt(value) || 0;
        }

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            showToast({ type: 'error', message: 'Correggi gli errori nel form' });
            return;
        }

        // Prepare data for submission
        const submitData: Partial<Ambulatorio> = {
            poliambulatorioId: formData.poliambulatorioId,
            sedeId: formData.sedeId || undefined,
            nome: formData.nome,
            codice: formData.codice.toUpperCase(),
            specializzazione: formData.specializzazione || undefined,
            descrizione: formData.descrizione || undefined,
            piano: formData.piano || undefined,
            capacita: formData.capacita,
            stato: formData.stato,
            colore: formData.colore
        };

        if (isEditing) {
            // Don't send poliambulatorioId on update
            const { poliambulatorioId, ...updateData } = submitData;
            updateMutation.mutate(updateData);
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleCancel = async () => {
        if (isDirty && !(await confirmWarning('Modifiche non salvate', 'Hai modifiche non salvate. Sei sicuro di voler uscire?'))) {
            return;
        }
        navigate('/poliambulatorio/ambulatori');
    };

    // Extract data from responses
    const poliambulatori: Poliambulatorio[] = poliambulatoriData?.data || [];

    // Handle sedi response - it can be SedePoliambulatorio[] directly or {data: SedePoliambulatorio[]}
    // @ts-expect-error Type assertion needed due to conditional query type inference
    const sedi: SedePoliambulatorio[] = Array.isArray(sediData) ? sediData : (sediData?.data || []);

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
                        {isEditing ? 'Modifica Ambulatorio' : 'Nuovo Ambulatorio'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isEditing
                            ? "Aggiorna le informazioni dell'ambulatorio"
                            : 'Inserisci i dati del nuovo ambulatorio'
                        }
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Struttura di Appartenenza */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Building2 className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Struttura di Appartenenza</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-clinica">
                                Poliambulatorio <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="poliambulatorioId"
                                value={formData.poliambulatorioId}
                                onChange={handleChange}
                                disabled={isEditing}
                                className={`input-clinica ${errors.poliambulatorioId ? 'border-red-500' : ''} ${isEditing ? 'bg-gray-100' : ''}`}
                            >
                                <option value="">-- Seleziona Poliambulatorio --</option>
                                {poliambulatori.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nome} ({p.codice})
                                    </option>
                                ))}
                            </select>
                            {errors.poliambulatorioId && (
                                <p className="text-red-500 text-sm mt-1">{errors.poliambulatorioId}</p>
                            )}
                            {isEditing && (
                                <p className="text-gray-500 text-xs mt-1">Non modificabile in modifica</p>
                            )}
                        </div>

                        <div>
                            <label className="label-clinica">Sede (opzionale)</label>
                            <select
                                name="sedeId"
                                value={formData.sedeId}
                                onChange={handleChange}
                                disabled={!formData.poliambulatorioId}
                                className={`input-clinica ${!formData.poliambulatorioId ? 'bg-gray-100' : ''}`}
                            >
                                <option value="">-- Nessuna sede specifica --</option>
                                {sedi.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nome} - {s.indirizzo}, {s.citta}
                                    </option>
                                ))}
                            </select>
                            {!formData.poliambulatorioId && (
                                <p className="text-gray-500 text-xs mt-1">Seleziona prima un poliambulatorio</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Informazioni Base */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Info className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Informazioni Ambulatorio</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-clinica">
                                Nome Ambulatorio <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nome"
                                value={formData.nome}
                                onChange={handleChange}
                                className={`input-clinica ${errors.nome ? 'border-red-500' : ''}`}
                                placeholder="Es: Ambulatorio Cardiologia 1"
                            />
                            {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
                        </div>

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
                                placeholder="Es: AMB-CARD-01"
                            />
                            {errors.codice && <p className="text-red-500 text-sm mt-1">{errors.codice}</p>}
                            <p className="text-gray-500 text-xs mt-1">Solo lettere, numeri, - e _</p>
                        </div>

                        <div>
                            <label className="label-clinica">Specializzazione</label>
                            <select
                                name="specializzazione"
                                value={formData.specializzazione}
                                onChange={handleChange}
                                className="input-clinica"
                            >
                                <option value="">-- Nessuna specializzazione --</option>
                                {SPECIALIZZAZIONI.map(spec => (
                                    <option key={spec} value={spec}>
                                        {spec}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label-clinica">Stato</label>
                            <select
                                name="stato"
                                value={formData.stato}
                                onChange={handleChange}
                                className="input-clinica"
                            >
                                <option value="ATTIVO">Attivo</option>
                                <option value="INATTIVO">Inattivo</option>
                                <option value="MANUTENZIONE">In Manutenzione</option>
                                <option value="CHIUSO">Chiuso</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="label-clinica">Descrizione</label>
                            <textarea
                                name="descrizione"
                                value={formData.descrizione}
                                onChange={handleChange}
                                rows={3}
                                className="input-clinica"
                                placeholder="Descrizione dell'ambulatorio, attrezzature disponibili, note..."
                            />
                        </div>
                    </div>
                </div>

                {/* Posizione e Capacità */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Posizione e Capacità</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="label-clinica">Piano</label>
                            <input
                                type="text"
                                name="piano"
                                value={formData.piano}
                                onChange={handleChange}
                                className="input-clinica"
                                placeholder="Es: Piano Terra, 1° Piano"
                            />
                        </div>

                        <div>
                            <label className="label-clinica">Capacità</label>
                            <input
                                type="number"
                                name="capacita"
                                value={formData.capacita}
                                onChange={handleChange}
                                min={1}
                                max={50}
                                className={`input-clinica ${errors.capacita ? 'border-red-500' : ''}`}
                            />
                            {errors.capacita && <p className="text-red-500 text-sm mt-1">{errors.capacita}</p>}
                            <p className="text-gray-500 text-xs mt-1">Pazienti contemporaneamente (1-50)</p>
                        </div>

                        <div>
                            <label className="label-clinica">Colore Calendario</label>
                            <div className="flex items-center gap-2">
                                <select
                                    name="colore"
                                    value={formData.colore}
                                    onChange={handleChange}
                                    className="input-clinica flex-1"
                                >
                                    {COLORI_PREDEFINITI.map(c => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                                <div
                                    className="w-10 h-10 rounded-lg border border-gray-300 flex-shrink-0"
                                    style={{ backgroundColor: formData.colore }}
                                />
                            </div>
                            <p className="text-gray-500 text-xs mt-1">Per identificazione nel calendario</p>
                        </div>
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
                                {isEditing ? 'Aggiorna Ambulatorio' : 'Crea Ambulatorio'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AmbulatorioForm;
