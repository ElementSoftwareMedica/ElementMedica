/**
 * PoliambulatorioForm
 * 
 * Form per creazione/modifica poliambulatorio.
 * Supporta tutti i campi Prisma con validazione.
 * 
 * @module pages/poliambulatorio/struttura/PoliambulatorioForm
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    FileText,
    ArrowLeft,
    Save,
    Loader2
} from 'lucide-react';
import { poliambulatoriApi } from '../../../services/clinicaApi';
import type { Poliambulatorio } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Prisma enum StatoPoliambulatorio
type StatoPoliambulatorio = 'ATTIVO' | 'INATTIVO' | 'SOSPESO';

interface FormData {
    nome: string;
    codice: string;
    descrizione: string;
    indirizzo: string;
    citta: string;
    cap: string;
    provincia: string;
    telefono: string;
    email: string;
    pec: string;
    piva: string;           // Prisma: piva (not partitaIva)
    codiceFiscale: string;
    stato: StatoPoliambulatorio;  // Prisma: stato enum (not isActive)
}

const initialFormData: FormData = {
    nome: '',
    codice: '',
    descrizione: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    telefono: '',
    email: '',
    pec: '',
    piva: '',
    codiceFiscale: '',
    stato: 'ATTIVO'
};

interface FormErrors {
    [key: string]: string;
}

const PoliambulatorioForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmWarning } = useConfirmDialog();
    const isEditing = Boolean(id);

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isDirty, setIsDirty] = useState(false);

    // Load existing data if editing
    const { data: existingData, isLoading: isLoadingData } = useQuery({
        queryKey: ['poliambulatorio', id],
        queryFn: () => poliambulatoriApi.getById(id!),
        enabled: isEditing
    });

    // Update form when data loads
    useEffect(() => {
        if (existingData) {
            setFormData({
                nome: existingData.nome || '',
                codice: existingData.codice || '',
                descrizione: existingData.descrizione || '',
                indirizzo: existingData.indirizzo || '',
                citta: existingData.citta || '',
                cap: existingData.cap || '',
                provincia: existingData.provincia || '',
                telefono: existingData.telefono || '',
                email: existingData.email || '',
                pec: existingData.pec || '',
                piva: existingData.piva || '',
                codiceFiscale: existingData.codiceFiscale || '',
                stato: existingData.stato || 'ATTIVO'
            });
        }
    }, [existingData]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<Poliambulatorio>) => poliambulatoriApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['poliambulatori'] });
            showToast({ type: 'success', message: 'Poliambulatorio creato con successo' });
            navigate('/poliambulatorio/poliambulatori');
        },
        onError: (error: Error & { response?: { status?: number } }) => {
            // Check for 409 Conflict (duplicate code)
            if (error.response?.status === 409 || error.message?.includes('409') || error.message?.includes('già esistente')) {
                setErrors(prev => ({ ...prev, codice: 'Esiste già un poliambulatorio con questo codice. Inserisci un codice diverso.' }));
                showToast({ type: 'error', message: 'Codice poliambulatorio già esistente. Scegli un codice diverso.' });
            } else {
                showToast({ type: 'error', message: 'Errore durante la creazione' });
            }
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Poliambulatorio>) => poliambulatoriApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['poliambulatori'] });
            queryClient.invalidateQueries({ queryKey: ['poliambulatorio', id] });
            showToast({ type: 'success', message: 'Poliambulatorio aggiornato con successo' });
            navigate('/poliambulatorio/poliambulatori');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento' });
        }
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    // Validation - aligned with backend validation-clinical.js
    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        // Required fields (match backend Joi schema)
        if (!formData.nome.trim()) {
            newErrors.nome = 'Il nome è obbligatorio';
        } else if (formData.nome.length < 3) {
            newErrors.nome = 'Il nome deve avere almeno 3 caratteri';
        }

        if (!formData.codice.trim()) {
            newErrors.codice = 'Il codice è obbligatorio';
        } else if (formData.codice.length < 2) {
            newErrors.codice = 'Il codice deve avere almeno 2 caratteri';
        } else if (!/^[A-Z0-9_-]+$/i.test(formData.codice)) {
            newErrors.codice = 'Il codice deve contenere solo lettere, numeri, underscore e trattini';
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

        // Optional field validations
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email non valida';
        }
        if (formData.pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.pec)) {
            newErrors.pec = 'PEC non valida';
        }
        if (formData.provincia && formData.provincia.length !== 2) {
            newErrors.provincia = 'Provincia deve essere di 2 caratteri (es. MI)';
        }
        if (formData.piva && !/^\d{11}$/.test(formData.piva)) {
            newErrors.piva = 'Partita IVA deve essere di 11 cifre';
        }
        if (formData.codiceFiscale && !/^[A-Z0-9]{11,16}$/.test(formData.codiceFiscale.toUpperCase())) {
            newErrors.codiceFiscale = 'Codice fiscale non valido';
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            showToast({ type: 'error', message: 'Correggi gli errori nel form' });
            return;
        }

        const submitData = {
            ...formData,
            codiceFiscale: formData.codiceFiscale.toUpperCase()
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
        navigate('/poliambulatorio/poliambulatori');
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
                        {isEditing ? 'Modifica Poliambulatorio' : 'Nuovo Poliambulatorio'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isEditing ? 'Aggiorna le informazioni della struttura' : 'Inserisci i dati della nuova struttura'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informazioni Base */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Building2 className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Informazioni Base</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                placeholder="Nome della struttura"
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
                                placeholder="Codice univoco"
                            />
                            {errors.codice && <p className="text-red-500 text-sm mt-1">{errors.codice}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="label-clinica">Descrizione</label>
                            <textarea
                                name="descrizione"
                                value={formData.descrizione}
                                onChange={handleChange}
                                rows={3}
                                className="input-clinica"
                                placeholder="Descrizione della struttura..."
                            />
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
                                <option value="SOSPESO">Sospeso</option>
                            </select>
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
                                <label className="label-clinica">Provincia</label>
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
                    </div>
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
                                placeholder="email@example.com"
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="label-clinica">PEC</label>
                            <input
                                type="email"
                                name="pec"
                                value={formData.pec}
                                onChange={handleChange}
                                className={`input-clinica ${errors.pec ? 'border-red-500' : ''}`}
                                placeholder="pec@example.it"
                            />
                            {errors.pec && <p className="text-red-500 text-sm mt-1">{errors.pec}</p>}
                        </div>
                    </div>
                </div>

                {/* Dati Fiscali */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Dati Fiscali e Regionali</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-clinica">Partita IVA</label>
                            <input
                                type="text"
                                name="piva"
                                value={formData.piva}
                                onChange={handleChange}
                                className={`input-clinica ${errors.piva ? 'border-red-500' : ''}`}
                                placeholder="00000000000"
                                maxLength={11}
                            />
                            {errors.piva && <p className="text-red-500 text-sm mt-1">{errors.piva}</p>}
                        </div>

                        <div>
                            <label className="label-clinica">Codice Fiscale</label>
                            <input
                                type="text"
                                name="codiceFiscale"
                                value={formData.codiceFiscale}
                                onChange={handleChange}
                                className={`input-clinica ${errors.codiceFiscale ? 'border-red-500' : ''}`}
                                placeholder="Codice fiscale azienda"
                                maxLength={16}
                            />
                            {errors.codiceFiscale && <p className="text-red-500 text-sm mt-1">{errors.codiceFiscale}</p>}
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
                                {isEditing ? 'Aggiorna' : 'Crea'} Poliambulatorio
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PoliambulatorioForm;
