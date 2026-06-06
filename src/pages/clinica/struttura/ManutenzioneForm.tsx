/**
 * ManutenzioneForm
 * 
 * Form per pianificazione e registrazione manutenzioni strumenti.
 * Gestisce manutenzioni programmate, straordinarie e completamento.
 * 
 * @module pages/poliambulatorio/struttura/ManutenzioneForm
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
    Clock,
    User,
    FileText,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Phone,
    Upload
} from 'lucide-react';
import { manutenzioniApi, strumentiApi } from '../../../services/clinicaApi';
import type { ManutenzioneStrumento, Strumento } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { ElegantSelect } from '../../../components/ui/ElegantSelect';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Types
type TipoManutenzione = 'PROGRAMMATA' | 'STRAORDINARIA' | 'CORRETTIVA' | 'PREVENTIVA';
type StatoManutenzione = 'PROGRAMMATA' | 'IN_CORSO' | 'COMPLETATA' | 'ANNULLATA';

interface FormData {
    strumentoId: string;
    tipo: TipoManutenzione;
    descrizione: string;
    dataProgrammata: string;
    dataEsecuzione: string;
    durataOre: string;
    esecutore: string;
    contattoEsecutore: string;
    costoManodopera: string;
    costoRicambi: string;
    numeroFattura: string;
    stato: StatoManutenzione;
    esitoNote: string;
    prossimaScadenza: string;
    rapportoUrl: string;
}

interface FormErrors {
    [key: string]: string;
}

const TIPI_MANUTENZIONE: { value: TipoManutenzione; label: string; description: string }[] = [
    { value: 'PROGRAMMATA', label: 'Programmata', description: 'Manutenzione pianificata regolarmente' },
    { value: 'PREVENTIVA', label: 'Preventiva', description: 'Intervento per prevenire guasti' },
    { value: 'CORRETTIVA', label: 'Correttiva', description: 'Riparazione dopo un malfunzionamento' },
    { value: 'STRAORDINARIA', label: 'Straordinaria', description: 'Intervento non previsto urgente' }
];

const STATI_MANUTENZIONE: { value: StatoManutenzione; label: string; color: string }[] = [
    { value: 'PROGRAMMATA', label: 'Programmata', color: 'bg-blue-100 text-blue-700' },
    { value: 'IN_CORSO', label: 'In Corso', color: 'bg-amber-100 text-amber-700' },
    { value: 'COMPLETATA', label: 'Completata', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'ANNULLATA', label: 'Annullata', color: 'bg-gray-100 text-gray-600' }
];

const initialFormData: FormData = {
    strumentoId: '',
    tipo: 'PROGRAMMATA',
    descrizione: '',
    dataProgrammata: '',
    dataEsecuzione: '',
    durataOre: '',
    esecutore: '',
    contattoEsecutore: '',
    costoManodopera: '',
    costoRicambi: '',
    numeroFattura: '',
    stato: 'PROGRAMMATA',
    esitoNote: '',
    prossimaScadenza: '',
    rapportoUrl: ''
};

const ManutenzioneForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const isEditing = Boolean(id);

    // Get strumentoId from URL params if present
    const preselectedStrumentoId = searchParams.get('strumentoId') || '';

    // State
    const [formData, setFormData] = useState<FormData>({
        ...initialFormData,
        strumentoId: preselectedStrumentoId
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load strumenti for dropdown
    const { data: strumentiData, isLoading: strumentiLoading } = useQuery({
        queryKey: ['strumenti-dropdown'],
        queryFn: () => strumentiApi.getAll({ limit: 200 })
    });

    // Load existing manutenzione if editing
    const { data: manutenzioneData, isLoading: manutenzioneLoading } = useQuery({
        queryKey: ['manutenzione', id],
        queryFn: () => manutenzioniApi.getById(id!),
        enabled: isEditing
    });

    // Populate form when editing
    useEffect(() => {
        if (manutenzioneData && isEditing) {
            const m = manutenzioneData;
            setFormData({
                strumentoId: m.strumentoId || '',
                tipo: m.tipo || 'PROGRAMMATA',
                descrizione: m.descrizione || '',
                dataProgrammata: m.dataProgrammata ? new Date(m.dataProgrammata).toISOString().split('T')[0] : '',
                dataEsecuzione: m.dataEsecuzione ? new Date(m.dataEsecuzione).toISOString().split('T')[0] : '',
                durataOre: m.durataOre?.toString() || '',
                esecutore: m.esecutore || '',
                contattoEsecutore: m.contattoEsecutore || '',
                costoManodopera: m.costoManodopera?.toString() || '',
                costoRicambi: m.costoRicambi?.toString() || '',
                numeroFattura: m.numeroFattura || '',
                stato: m.stato || 'PROGRAMMATA',
                esitoNote: m.esitoNote || '',
                prossimaScadenza: m.prossimaScadenza ? new Date(m.prossimaScadenza).toISOString().split('T')[0] : '',
                rapportoUrl: m.rapportoUrl || ''
            });
        }
    }, [manutenzioneData, isEditing]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<ManutenzioneStrumento>) => manutenzioniApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manutenzioni'] });
            queryClient.invalidateQueries({ queryKey: ['strumenti'] });
            showToast({ type: 'success', message: 'Manutenzione programmata con successo' });
            navigate(-1);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nella creazione' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ManutenzioneStrumento> }) =>
            manutenzioniApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manutenzioni'] });
            queryClient.invalidateQueries({ queryKey: ['strumenti'] });
            showToast({ type: 'success', message: 'Manutenzione aggiornata con successo' });
            navigate(-1);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nell\'aggiornamento' });
        }
    });

    // Validation
    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.strumentoId) {
            newErrors.strumentoId = 'Seleziona uno strumento';
        }

        if (!formData.descrizione.trim()) {
            newErrors.descrizione = 'La descrizione è obbligatoria';
        }

        if (!formData.dataProgrammata && formData.stato === 'PROGRAMMATA') {
            newErrors.dataProgrammata = 'La data programmata è obbligatoria';
        }

        if (formData.costoManodopera && isNaN(parseFloat(formData.costoManodopera))) {
            newErrors.costoManodopera = 'Inserisci un valore numerico valido';
        }

        if (formData.costoRicambi && isNaN(parseFloat(formData.costoRicambi))) {
            newErrors.costoRicambi = 'Inserisci un valore numerico valido';
        }

        if (formData.durataOre && isNaN(parseFloat(formData.durataOre))) {
            newErrors.durataOre = 'Inserisci un valore numerico valido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form change
    const handleChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);

        const submitData: Partial<ManutenzioneStrumento> = {
            strumentoId: formData.strumentoId,
            tipo: formData.tipo,
            descrizione: formData.descrizione.trim(),
            stato: formData.stato,
            ...(formData.dataProgrammata && { dataProgrammata: formData.dataProgrammata }),
            ...(formData.dataEsecuzione && { dataEsecuzione: formData.dataEsecuzione }),
            ...(formData.durataOre && { durataOre: parseFloat(formData.durataOre) }),
            ...(formData.esecutore && { esecutore: formData.esecutore }),
            ...(formData.contattoEsecutore && { contattoEsecutore: formData.contattoEsecutore }),
            ...(formData.costoManodopera && { costoManodopera: parseFloat(formData.costoManodopera) }),
            ...(formData.costoRicambi && { costoRicambi: parseFloat(formData.costoRicambi) }),
            ...(formData.numeroFattura && { numeroFattura: formData.numeroFattura }),
            ...(formData.esitoNote && { esitoNote: formData.esitoNote }),
            ...(formData.prossimaScadenza && { prossimaScadenza: formData.prossimaScadenza }),
            ...(formData.rapportoUrl && { rapportoUrl: formData.rapportoUrl })
        };

        try {
            if (isEditing && id) {
                await updateMutation.mutateAsync({ id, data: submitData });
            } else {
                await createMutation.mutateAsync(submitData);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calcola costo totale
    const costoTotale = (parseFloat(formData.costoManodopera) || 0) + (parseFloat(formData.costoRicambi) || 0);

    // Loading state
    const isLoading = strumentiLoading || (isEditing && manutenzioneLoading);
    const strumenti: Strumento[] = strumentiData?.data || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="p-6 clinica-theme">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-teal-50 rounded-xl">
                        <Wrench className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEditing ? 'Modifica Manutenzione' : 'Nuova Manutenzione'}
                        </h1>
                        <p className="text-gray-500">
                            {isEditing ? 'Aggiorna i dettagli della manutenzione' : 'Programma una nuova manutenzione'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Strumento e Tipo */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-teal-600" />
                        Strumento e Tipo Intervento
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strumento */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Strumento <span className="text-red-500">*</span>
                            </label>
                            <ElegantSelect
                                value={formData.strumentoId}
                                onChange={(value) => handleChange('strumentoId', value)}
                                placeholder="Seleziona strumento"
                                triggerClassName={errors.strumentoId ? 'border-red-300' : ''}
                                disabled={!!preselectedStrumentoId}
                                options={[
                                    { value: '', label: 'Seleziona strumento' },
                                    ...strumenti.map((s) => ({
                                        value: s.id,
                                        label: `${s.codice} - ${s.nome}${s.marca ? ` (${s.marca})` : ''}`
                                    }))
                                ]}
                            />
                            {errors.strumentoId && (
                                <p className="text-red-500 text-sm mt-1">{errors.strumentoId}</p>
                            )}
                        </div>

                        {/* Tipo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo Manutenzione
                            </label>
                            <ElegantSelect
                                value={formData.tipo}
                                onChange={(value) => handleChange('tipo', value)}
                                options={TIPI_MANUTENZIONE.map((t) => ({ value: t.value, label: t.label }))}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {TIPI_MANUTENZIONE.find(t => t.value === formData.tipo)?.description}
                            </p>
                        </div>

                        {/* Stato */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Stato
                            </label>
                            <ElegantSelect
                                value={formData.stato}
                                onChange={(value) => handleChange('stato', value)}
                                options={STATI_MANUTENZIONE.map((s) => ({ value: s.value, label: s.label }))}
                            />
                        </div>

                        {/* Descrizione */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descrizione <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={formData.descrizione}
                                onChange={(e) => handleChange('descrizione', e.target.value)}
                                className={`input-clinica w-full ${errors.descrizione ? 'border-red-300' : ''}`}
                                rows={3}
                                placeholder="Descrivi l'intervento da effettuare..."
                            />
                            {errors.descrizione && (
                                <p className="text-red-500 text-sm mt-1">{errors.descrizione}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Date e Tempi */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-teal-600" />
                        Pianificazione
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Data Programmata */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data Programmata {formData.stato === 'PROGRAMMATA' && <span className="text-red-500">*</span>}
                            </label>
                            <DatePickerElegante
                                value={formData.dataProgrammata}
                                onChange={(date) => handleChange('dataProgrammata', date ? date.toISOString().split('T')[0] : '')}
                                theme="teal"
                            />
                            {errors.dataProgrammata && (
                                <p className="text-red-500 text-sm mt-1">{errors.dataProgrammata}</p>
                            )}
                        </div>

                        {/* Data Esecuzione */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data Esecuzione
                            </label>
                            <DatePickerElegante
                                value={formData.dataEsecuzione}
                                onChange={(date) => handleChange('dataEsecuzione', date ? date.toISOString().split('T')[0] : '')}
                                theme="teal"
                            />
                        </div>

                        {/* Durata */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Durata (ore)
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={formData.durataOre}
                                    onChange={(e) => handleChange('durataOre', e.target.value)}
                                    className={`input-clinica w-full pl-10 ${errors.durataOre ? 'border-red-300' : ''}`}
                                    placeholder="2.5"
                                />
                            </div>
                            {errors.durataOre && (
                                <p className="text-red-500 text-sm mt-1">{errors.durataOre}</p>
                            )}
                        </div>

                        {/* Prossima Scadenza */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prossima Manutenzione
                            </label>
                            <DatePickerElegante
                                value={formData.prossimaScadenza}
                                onChange={(date) => handleChange('prossimaScadenza', date ? date.toISOString().split('T')[0] : '')}
                                theme="teal"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Data suggerita per la prossima manutenzione
                            </p>
                        </div>
                    </div>
                </div>

                {/* Esecutore */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-teal-600" />
                        Esecutore
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Esecutore */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome Esecutore / Azienda
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.esecutore}
                                    onChange={(e) => handleChange('esecutore', e.target.value)}
                                    className="input-clinica w-full pl-10"
                                    placeholder="Tecnico esterno / Azienda"
                                />
                            </div>
                        </div>

                        {/* Contatto */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contatto
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.contattoEsecutore}
                                    onChange={(e) => handleChange('contattoEsecutore', e.target.value)}
                                    className="input-clinica w-full pl-10"
                                    placeholder="Tel / Email"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Costi */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-teal-600" />
                        Costi
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Manodopera */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Costo Manodopera (€)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.costoManodopera}
                                onChange={(e) => handleChange('costoManodopera', e.target.value)}
                                className={`input-clinica w-full ${errors.costoManodopera ? 'border-red-300' : ''}`}
                                placeholder="0.00"
                            />
                            {errors.costoManodopera && (
                                <p className="text-red-500 text-sm mt-1">{errors.costoManodopera}</p>
                            )}
                        </div>

                        {/* Ricambi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Costo Ricambi (€)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.costoRicambi}
                                onChange={(e) => handleChange('costoRicambi', e.target.value)}
                                className={`input-clinica w-full ${errors.costoRicambi ? 'border-red-300' : ''}`}
                                placeholder="0.00"
                            />
                            {errors.costoRicambi && (
                                <p className="text-red-500 text-sm mt-1">{errors.costoRicambi}</p>
                            )}
                        </div>

                        {/* Totale */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Totale (€)
                            </label>
                            <div className="input-clinica w-full bg-gray-50 font-semibold text-teal-700">
                                € {costoTotale.toFixed(2)}
                            </div>
                        </div>

                        {/* Numero Fattura */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                N. Fattura
                            </label>
                            <input
                                type="text"
                                value={formData.numeroFattura}
                                onChange={(e) => handleChange('numeroFattura', e.target.value)}
                                className="input-clinica w-full"
                                placeholder="FAT-2024-001"
                            />
                        </div>
                    </div>
                </div>

                {/* Esito e Note */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-600" />
                        Esito e Documentazione
                    </h2>

                    <div className="space-y-4">
                        {/* Note Esito */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Note / Esito Intervento
                            </label>
                            <textarea
                                value={formData.esitoNote}
                                onChange={(e) => handleChange('esitoNote', e.target.value)}
                                className="input-clinica w-full"
                                rows={4}
                                placeholder="Descrivi l'esito dell'intervento, problemi riscontrati, raccomandazioni..."
                            />
                        </div>

                        {/* URL Rapporto */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                URL Rapporto/Documentazione
                            </label>
                            <div className="relative">
                                <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="url"
                                    value={formData.rapportoUrl}
                                    onChange={(e) => handleChange('rapportoUrl', e.target.value)}
                                    className="input-clinica w-full pl-10"
                                    placeholder="https://..."
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Link al rapporto tecnico o documentazione allegata
                            </p>
                        </div>
                    </div>
                </div>

                {/* Azioni */}
                <div className="flex items-center justify-between pt-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn-clinica-secondary"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-clinica flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isEditing ? 'Aggiorna Manutenzione' : 'Programma Manutenzione'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManutenzioneForm;
