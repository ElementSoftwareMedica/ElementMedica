/**
 * VisitaPage - Schermata principale per eseguire una visita
 * 
 * Gestisce il flusso completo: scheda paziente, campi dinamici,
 * timer, salvataggio, e passaggio a referto.
 * 
 * @module pages/poliambulatorio/clinica/VisitaPage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    User,
    Clock,
    Play,
    Pause,
    Square,
    Save,
    FileText,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Activity,
    Calendar,
    Stethoscope,
    History,
    RefreshCw,
    Camera,
    Paperclip
} from 'lucide-react';
import {
    visiteApi,
    appuntamentiApi,
    pazientiApi,
    prestazioniApi,
    Visita,
    Appuntamento,
    Paziente,
    Prestazione,
    TemplateCampoVisita
} from '../../../services/clinicaApi';
import { formatDate, formatTime } from '../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

type StatoVisita = 'PROGRAMMATA' | 'IN_CORSO' | 'COMPLETATA' | 'ANNULLATA';

interface CampoValore {
    templateCampoId: string;
    valore: unknown;
}

interface TimerState {
    isRunning: boolean;
    elapsedSeconds: number;
    startTime: Date | null;
}

// ============================================
// COMPONENTS
// ============================================

/**
 * Patient Info Card
 */
const PatientInfoCard: React.FC<{
    paziente: Paziente;
    appuntamento?: Appuntamento;
}> = ({ paziente, appuntamento }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                <User className="h-8 w-8 text-teal-600" />
            </div>
            <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">
                    {paziente.cognome} {paziente.nome}
                </h2>
                <p className="text-gray-500">
                    {paziente.codiceFiscale || 'CF non disponibile'}
                </p>
                {paziente.dataNascita && (
                    <p className="text-sm text-gray-400">
                        Nato/a il {formatDate(new Date(paziente.dataNascita), 'short')}
                    </p>
                )}

                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    {paziente.telefono && (
                        <span className="text-gray-600">📱 {paziente.telefono}</span>
                    )}
                    {paziente.email && (
                        <span className="text-gray-600">✉️ {paziente.email}</span>
                    )}
                </div>

                {appuntamento && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                            <strong>Prestazione:</strong> {appuntamento.prestazione?.nome || 'Visita generica'}
                        </p>
                        <p className="text-sm text-gray-600">
                            <strong>Appuntamento:</strong> {formatDate(new Date(appuntamento.dataOra), 'short')} alle {formatTime(new Date(appuntamento.dataOra))}
                        </p>
                    </div>
                )}
            </div>
        </div>
    </div>
);

/**
 * Visit Timer Component
 */
const VisitTimer: React.FC<{
    timer: TimerState;
    onStart: () => void;
    onPause: () => void;
    onStop: () => void;
}> = ({ timer, onStart, onPause, onStop }) => {
    const formatElapsed = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-gray-900 text-white rounded-xl p-6">
            <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">Durata Visita</p>
                <p className="text-4xl font-mono font-bold mb-4">
                    {formatElapsed(timer.elapsedSeconds)}
                </p>

                <div className="flex justify-center gap-3">
                    {!timer.isRunning ? (
                        <button
                            onClick={onStart}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            <Play className="h-5 w-5" />
                            {timer.elapsedSeconds > 0 ? 'Riprendi' : 'Inizia'}
                        </button>
                    ) : (
                        <button
                            onClick={onPause}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                        >
                            <Pause className="h-5 w-5" />
                            Pausa
                        </button>
                    )}

                    {timer.elapsedSeconds > 0 && (
                        <button
                            onClick={onStop}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            <Square className="h-5 w-5" />
                            Termina
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Dynamic Form Field Component
 */
const DynamicField: React.FC<{
    campo: TemplateCampoVisita;
    value: unknown;
    onChange: (value: unknown) => void;
}> = ({ campo, value, onChange }) => {
    const renderField = () => {
        switch (campo.tipo) {
            case 'TESTO':
                return (
                    <input
                        type="text"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={campo.placeholder || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                );

            case 'TEXTAREA':
                return (
                    <textarea
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={campo.placeholder || ''}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                );

            case 'NUMERO':
                return (
                    <input
                        type="number"
                        value={(value as number) || ''}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        placeholder={campo.placeholder || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                );

            case 'DECIMALE':
                return (
                    <input
                        type="number"
                        step="0.01"
                        value={(value as number) || ''}
                        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                        placeholder={campo.placeholder || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                );

            case 'DATA':
                return (
                    <input
                        type="date"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                );

            case 'DATETIME':
                return (
                    <input
                        type="datetime-local"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                );

            case 'BOOLEAN':
                return (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={(value as boolean) || false}
                            onChange={(e) => onChange(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-gray-700">Sì</span>
                    </label>
                );

            case 'SELECT':
                const options = campo.opzioni?.split(',').map(o => o.trim()) || [];
                return (
                    <select
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="">Seleziona...</option>
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );

            case 'MULTISELECT':
                const multiOptions = campo.opzioni?.split(',').map(o => o.trim()) || [];
                const selectedValues = (value as string[]) || [];
                return (
                    <div className="space-y-2">
                        {multiOptions.map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(opt)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            onChange([...selectedValues, opt]);
                                        } else {
                                            onChange(selectedValues.filter(v => v !== opt));
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="text-gray-700">{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'FILE':
                return (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Trascina un file o clicca per selezionare</p>
                        <input
                            type="file"
                            onChange={(e) => onChange(e.target.files?.[0])}
                            className="hidden"
                            id={`file-${campo.id}`}
                        />
                        <label
                            htmlFor={`file-${campo.id}`}
                            className="mt-2 inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200"
                        >
                            Seleziona File
                        </label>
                    </div>
                );

            default:
                return (
                    <input
                        type="text"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                );
        }
    };

    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
                {campo.etichetta || campo.nome}
                {campo.obbligatorio && <span className="text-red-500 ml-1">*</span>}
            </label>
            {campo.helpText && (
                <p className="text-xs text-gray-500">{campo.helpText}</p>
            )}
            {renderField()}
        </div>
    );
};

/**
 * Visit Form Section
 */
const VisitFormSection: React.FC<{
    campi: TemplateCampoVisita[];
    valori: Record<string, unknown>;
    onChange: (campoId: string, valore: unknown) => void;
}> = ({ campi, valori, onChange }) => {
    // Group fields by category if available
    const sortedCampi = useMemo(() =>
        [...campi].sort((a, b) => (a.ordine || 0) - (b.ordine || 0)),
        [campi]
    );

    return (
        <div className="space-y-6">
            {sortedCampi.map(campo => (
                <DynamicField
                    key={campo.id}
                    campo={campo}
                    value={valori[campo.id]}
                    onChange={(value) => onChange(campo.id, value)}
                />
            ))}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const VisitaPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // URL params
    const appuntamentoId = searchParams.get('appuntamento');
    const isNew = !id || id === 'nuovo';

    // State
    const [valoriCampi, setValoriCampi] = useState<Record<string, unknown>>({});
    const [note, setNote] = useState('');
    const [timer, setTimer] = useState<TimerState>({
        isRunning: false,
        elapsedSeconds: 0,
        startTime: null
    });
    const [isDirty, setIsDirty] = useState(false);

    // Queries
    const { data: visita, isLoading: loadingVisita } = useQuery({
        queryKey: ['visita', id],
        queryFn: () => visiteApi.getById(id!),
        enabled: !isNew && !!id
    });

    const { data: appuntamento } = useQuery({
        queryKey: ['appuntamento', appuntamentoId || visita?.appuntamentoId],
        queryFn: () => appuntamentiApi.getById(appuntamentoId || visita?.appuntamentoId || ''),
        enabled: !!(appuntamentoId || visita?.appuntamentoId)
    });

    const { data: paziente } = useQuery({
        queryKey: ['paziente', appuntamento?.pazienteId || visita?.pazienteId],
        queryFn: () => pazientiApi.getById(appuntamento?.pazienteId || visita?.pazienteId || ''),
        enabled: !!(appuntamento?.pazienteId || visita?.pazienteId)
    });

    const { data: prestazione } = useQuery({
        queryKey: ['prestazione', appuntamento?.prestazioneId || visita?.prestazioneId],
        queryFn: () => prestazioniApi.getById(appuntamento?.prestazioneId || visita?.prestazioneId || ''),
        enabled: !!(appuntamento?.prestazioneId || visita?.prestazioneId)
    });

    const { data: templateCampi } = useQuery({
        queryKey: ['template-campi', prestazione?.id],
        queryFn: () => prestazioniApi.getCampi(prestazione!.id),
        enabled: !!prestazione?.id
    });

    // Mutations
    const createVisitaMutation = useMutation({
        mutationFn: (data: Partial<Visita>) => visiteApi.create(data),
        onSuccess: (newVisita) => {
            queryClient.invalidateQueries({ queryKey: ['visite'] });
            navigate(`/poliambulatorio/visite/${newVisita.id}`, { replace: true });
        }
    });

    const updateVisitaMutation = useMutation({
        mutationFn: (data: Partial<Visita>) => visiteApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visita', id] });
            setIsDirty(false);
        }
    });

    const terminaVisitaMutation = useMutation({
        mutationFn: () => visiteApi.termina(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visite'] });
            navigate(`/poliambulatorio/referti/nuovo?visita=${id}`);
        }
    });

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer.isRunning) {
            interval = setInterval(() => {
                setTimer(prev => ({
                    ...prev,
                    elapsedSeconds: prev.elapsedSeconds + 1
                }));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer.isRunning]);

    // Initialize new visit
    useEffect(() => {
        if (isNew && appuntamento && paziente) {
            createVisitaMutation.mutate({
                appuntamentoId: appuntamento.id,
                pazienteId: paziente.id,
                medicoId: appuntamento.medicoId,
                prestazioneId: appuntamento.prestazioneId,
                stato: 'IN_CORSO'
            });
        }
    }, [isNew, appuntamento, paziente]);

    // Timer handlers
    const handleStartTimer = () => {
        setTimer(prev => ({
            ...prev,
            isRunning: true,
            startTime: prev.startTime || new Date()
        }));

        if (visita && visita.stato !== 'IN_CORSO') {
            visiteApi.inizia(visita.id);
        }
    };

    const handlePauseTimer = () => {
        setTimer(prev => ({ ...prev, isRunning: false }));
    };

    const handleStopTimer = () => {
        if (confirm('Terminare la visita? Potrai ancora modificare i dati prima di creare il referto.')) {
            setTimer(prev => ({ ...prev, isRunning: false }));
            terminaVisitaMutation.mutate();
        }
    };

    // Field change handler
    const handleFieldChange = (campoId: string, valore: unknown) => {
        setValoriCampi(prev => ({ ...prev, [campoId]: valore }));
        setIsDirty(true);

        // Auto-save field
        if (id && !isNew) {
            visiteApi.saveCampo(id, { templateCampoId: campoId, valore });
        }
    };

    // Save handler
    const handleSave = async () => {
        if (!id || isNew) return;

        await updateVisitaMutation.mutateAsync({
            note
        });
    };

    // Loading state
    if (loadingVisita || createVisitaMutation.isPending) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    // No patient data
    if (!paziente) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-gray-700">Dati paziente non disponibili</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-teal-600 hover:text-teal-700"
                    >
                        Torna indietro
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    Visita - {paziente.cognome} {paziente.nome}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {prestazione?.nome || 'Visita generica'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {isDirty && (
                                <span className="text-sm text-amber-600">Modifiche non salvate</span>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={!isDirty || updateVisitaMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                            >
                                <Save className="h-5 w-5" />
                                Salva
                            </button>
                            <button
                                onClick={() => navigate(`/poliambulatorio/referti/nuovo?visita=${id}`)}
                                className="flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50"
                            >
                                <FileText className="h-5 w-5" />
                                Crea Referto
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Patient Info & Timer */}
                    <div className="space-y-6">
                        <PatientInfoCard paziente={paziente} appuntamento={appuntamento} />
                        <VisitTimer
                            timer={timer}
                            onStart={handleStartTimer}
                            onPause={handlePauseTimer}
                            onStop={handleStopTimer}
                        />

                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Azioni Rapide</h3>
                            <div className="space-y-2">
                                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                                    <History className="h-5 w-5 text-gray-400" />
                                    <span className="text-gray-700">Storico Visite</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                    <span className="text-gray-700">Referti Precedenti</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                                    <Camera className="h-5 w-5 text-gray-400" />
                                    <span className="text-gray-700">Allega Immagine</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                                    <Paperclip className="h-5 w-5 text-gray-400" />
                                    <span className="text-gray-700">Allega Documento</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">
                                Dati Visita
                            </h2>

                            {templateCampi && templateCampi.length > 0 ? (
                                <VisitFormSection
                                    campi={templateCampi}
                                    valori={valoriCampi}
                                    onChange={handleFieldChange}
                                />
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Activity className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                                    <p>Nessun campo template configurato per questa prestazione</p>
                                </div>
                            )}

                            {/* Note */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Note Aggiuntive
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => { setNote(e.target.value); setIsDirty(true); }}
                                    rows={4}
                                    placeholder="Inserisci eventuali note sulla visita..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisitaPage;
