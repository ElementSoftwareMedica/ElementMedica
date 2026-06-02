/**
 * Create Queue Session Page
 * Page for creating new queue sessions (P53)
 * 
 * Features:
 * - Select ambulatorio(s) with location info
 * - Choose queue mode (DISPLAY/MOBILE)
 * - Select prestazioni for wait time estimation
 * - Multi-medico support
 * - Pre-creation validation (existing session check)
 * - User-friendly error handling and guidance
 * 
 * @module pages/clinica/coda/CreateSessionPage
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Monitor,
    Smartphone,
    Building2,
    Calendar,
    Settings,
    Plus,
    RefreshCw,
    AlertTriangle,
    X,
    Users,
    Stethoscope,
    MapPin,
    Clock,
    Info
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { useQueueMutations } from '@/hooks/clinica/useQueue';
import queueApi, { QueueMode, QueueSessionConfig, PatientAccessMode, CheckExistingResult } from '@/services/queueApi';
import { clinicaApi, mediciApi, prestazioniApi, slotsApi, type Medico, type Prestazione, type SlotDisponibilita } from '@/services/clinicaApi';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { getMedicoTitle, formatMedicoName as formatMedicoNameUtil } from '../../../utils/textFormatters';

// =====================================================
// TYPES
// =====================================================

interface Ambulatorio {
    id: string;
    nome: string;
    codice: string;
    specializzazione?: string;
    piano?: string;
    indicazioniPaziente?: string;
    isEsterno?: boolean;
    poliambulatorioId?: string;
    poliambulatorio?: {
        id: string;
        nome: string;
    };
}

// Use Medico and Prestazione from clinicaApi

interface ExistingSessionWarning {
    show: boolean;
    session: CheckExistingResult['session'] | null;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Formatta il nome del medico con onorifico gender-aware.
 * Usa getMedicoTitle (Dott./Dott.ssa) da textFormatters — unica fonte di verità.
 */
const formatMedicoName = (medico: Medico): string =>
    formatMedicoNameUtil({ firstName: medico.firstName, lastName: medico.lastName, gender: medico.gender });

const formatSlotHour = (value?: string | Date | null): string => {
    if (!value) return '--:--';
    if (value instanceof Date) {
        return value.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
    const time = String(value);
    if (/^\d{2}:\d{2}/.test(time)) return time.slice(0, 5);
    const parsed = new Date(time);
    return Number.isNaN(parsed.getTime())
        ? time.slice(0, 5)
        : parsed.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface ExistingSessionAlertProps {
    warning: ExistingSessionWarning;
    onDismiss: () => void;
    onGoToSession: () => void;
}

const ExistingSessionAlert: React.FC<ExistingSessionAlertProps> = ({
    warning,
    onDismiss,
    onGoToSession
}) => {
    if (!warning.show || !warning.session) return null;

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="font-semibold text-amber-800">
                        Sessione già esistente
                    </h3>
                    <p className="text-amber-700 mt-1">
                        Esiste già una sessione {warning.session.mode === 'MOBILE' ? 'Mobile' : 'Display'}
                        {' '}per questa data{warning.session.ambulatorio && ` e ambulatorio "${warning.session.ambulatorio.nome}"`}.
                    </p>
                    <div className="mt-2 text-sm text-amber-600">
                        <p>• Pazienti in coda: {warning.session.entriesCount}</p>
                        <p>• Numero attuale: {warning.session.currentNumber}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            type="button"
                            onClick={onGoToSession}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                        >
                            Vai alla sessione esistente
                        </button>
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-sm"
                        >
                            Scegli altro ambulatorio/data
                        </button>
                    </div>
                </div>
                <button
                    onClick={onDismiss}
                    className="text-amber-500 hover:text-amber-700"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const CreateSessionPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const mutations = useQueueMutations();
    const { user } = useAuth();
    const { isMedico, isMedicoCompetente } = useRoleGuard();
    const currentMedicoPersonId = isMedico && !isMedicoCompetente ? user?.id : undefined;

    // Pre-fill from query params (from EditDisponibilitaModal)
    const prefillMedicoId = searchParams.get('medicoId');
    const prefillAmbulatorioId = searchParams.get('ambulatorioId');
    const prefillDate = searchParams.get('date');
    const prefillDisponibilitaId = searchParams.get('disponibilitaId');

    // Data loading states
    const [ambulatori, setAmbulatori] = useState<Ambulatorio[]>([]);
    const [medici, setMedici] = useState<Medico[]>([]);
    const [prestazioni, setPrestazioni] = useState<Prestazione[]>([]);
    const [isLoadingAmbulatori, setIsLoadingAmbulatori] = useState(true);
    const [isLoadingMedici, setIsLoadingMedici] = useState(true);
    const [isLoadingPrestazioni, setIsLoadingPrestazioni] = useState(true);

    // Form state - initialize with prefill values if available
    const [selectedAmbulatorioId, setSelectedAmbulatorioId] = useState<string>(prefillAmbulatorioId || '');
    const [selectedAmbulatorioIds, setSelectedAmbulatorioIds] = useState<string[]>(prefillAmbulatorioId ? [prefillAmbulatorioId] : []);
    const [selectedMedicoIds, setSelectedMedicoIds] = useState<string[]>(prefillMedicoId ? [prefillMedicoId] : []);
    const [selectedPrestazioniIds, setSelectedPrestazioniIds] = useState<string[]>([]);
    const [selectedMode, setSelectedMode] = useState<QueueMode>('DISPLAY');
    const [date, setDate] = useState(prefillDate || new Date().toISOString().split('T')[0]);
    const [generateFromAppointments, setGenerateFromAppointments] = useState(true);
    const [selectedDisponibilitaId, setSelectedDisponibilitaId] = useState<string | null>(prefillDisponibilitaId);

    // Matching slots state (auto-match feature)
    const [matchingSlots, setMatchingSlots] = useState<SlotDisponibilita[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // Validation state
    const [existingSessionWarning, setExistingSessionWarning] = useState<ExistingSessionWarning>({
        show: false,
        session: null
    });
    const [isCheckingSession, setIsCheckingSession] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Config options
    const [config, setConfig] = useState<QueueSessionConfig>({
        autoCallEnabled: false,
        callInterval: 30,
        displayDuration: 15,
        maxWaitTimeMinutes: 60,
        ttsEnabled: true,
        ttsVolume: 1,
        // MOBILE mode specific
        orderByArrival: false,
        patientAccessMode: 'BOTH'
    });

    // Selected ambulatorio details
    const selectedAmbulatorio = useMemo(() =>
        ambulatori.find(a => a.id === selectedAmbulatorioId),
        [ambulatori, selectedAmbulatorioId]
    );

    // Fetch ambulatori - runs only on mount
    useEffect(() => {
        const fetchAmbulatori = async () => {
            try {
                const response = await clinicaApi.ambulatori.getAll({ limit: 100 });
                setAmbulatori(response.data || []);
            } catch (err) {
            } finally {
                setIsLoadingAmbulatori(false);
            }
        };
        fetchAmbulatori();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDisponibilitaSelect = useCallback((slot: SlotDisponibilita) => {
        setSelectedDisponibilitaId(slot.id);
        const ambulatorioId = slot.ambulatorioId;
        const medicoId = slot.medicoId;
        if (ambulatorioId) {
            setSelectedAmbulatorioId(ambulatorioId);
            setSelectedAmbulatorioIds(prev => prev.includes(ambulatorioId)
                ? prev
                : [ambulatorioId, ...prev]);
        }
        if (medicoId) {
            setSelectedMedicoIds(prev => prev.includes(medicoId)
                ? prev
                : [medicoId, ...prev]);
        }
    }, []);

    // Fetch medici - runs only on mount
    useEffect(() => {
        const fetchMedici = async () => {
            try {
                const response = await mediciApi.getAll({ limit: 100 });
                const mediciData = Array.isArray(response) ? response : (response?.data || []);
                const visibleMedici = currentMedicoPersonId
                    ? mediciData.filter(m => m.id === currentMedicoPersonId || m.personId === currentMedicoPersonId)
                    : mediciData;
                setMedici(visibleMedici);
                if (currentMedicoPersonId && visibleMedici[0]) {
                    setSelectedMedicoIds([visibleMedici[0].id]);
                }
            } catch (err) {
            } finally {
                setIsLoadingMedici(false);
            }
        };
        fetchMedici();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMedicoPersonId]);

    // Fetch prestazioni - runs only on mount
    useEffect(() => {
        const fetchPrestazioni = async () => {
            try {
                const response = await prestazioniApi.getAll({ limit: 100 });
                const prestazioniData = Array.isArray(response) ? response : (response?.data || []);
                setPrestazioni(prestazioniData);
            } catch (err) {
            } finally {
                setIsLoadingPrestazioni(false);
            }
        };
        fetchPrestazioni();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Check for existing session when ambulatorio/date/mode changes
    useEffect(() => {
        const checkExisting = async () => {
            if (!date) return;

            setIsCheckingSession(true);
            setExistingSessionWarning({ show: false, session: null });

            try {
                const result = await queueApi.checkExistingSession({
                    date,
                    ambulatorioId: selectedAmbulatorioId || undefined,
                    mode: selectedMode
                });

                if (result.exists) {
                    setExistingSessionWarning({
                        show: true,
                        session: result.session
                    });
                }
            } catch (err) {
                // Silently fail - validation will happen on submit
            } finally {
                setIsCheckingSession(false);
            }
        };

        // Debounce check
        const timeoutId = setTimeout(checkExisting, 300);
        return () => clearTimeout(timeoutId);
    }, [date, selectedAmbulatorioId, selectedMode]);

    // Auto-match: Find disponibilità slots that match selected criteria
    // This allows linking session to existing medico availability
    useEffect(() => {
        const findMatchingSlots = async () => {
            // Search if we have date and at least an ambulatorio or a medico.
            if (!date) return;
            const ambulatorioFilter = selectedAmbulatorioId || selectedAmbulatorioIds[0];
            if (!ambulatorioFilter && selectedMedicoIds.length === 0) {
                setMatchingSlots([]);
                return;
            }

            setIsLoadingSlots(true);
            try {
                const response = await slotsApi.getAll({
                    limit: 50,
                    filters: {
                        dataInizio: date,
                        dataFine: date,
                        disponibile: true,
                        ...(ambulatorioFilter && { ambulatorioId: ambulatorioFilter }),
                        ...(selectedMedicoIds.length > 0 && { medicoId: selectedMedicoIds[0] }) // Primary medico
                    }
                });

                const slots = response?.data || [];
                setMatchingSlots(slots);

                // Auto-select first matching slot if none selected
                if (slots.length === 1 && !selectedDisponibilitaId) {
                    handleDisponibilitaSelect(slots[0]);
                } else if (slots.length === 0) {
                    setSelectedDisponibilitaId(null);
                }
            } catch (err) {
                setMatchingSlots([]);
            } finally {
                setIsLoadingSlots(false);
            }
        };

        // Debounce search
        const timeoutId = setTimeout(findMatchingSlots, 500);
        return () => clearTimeout(timeoutId);
    }, [date, selectedAmbulatorioId, selectedAmbulatorioIds, selectedMedicoIds, selectedDisponibilitaId, handleDisponibilitaSelect]);

    // Handle multi-ambulatorio selection for MOBILE mode
    const handleAmbulatorioToggle = useCallback((ambulatorioId: string) => {
        setSelectedDisponibilitaId(null);
        setSelectedAmbulatorioIds(prev => {
            if (prev.includes(ambulatorioId)) {
                return prev.filter(id => id !== ambulatorioId);
            } else {
                return [...prev, ambulatorioId];
            }
        });
    }, []);

    // Handle medico selection
    const handleMedicoToggle = useCallback((medicoId: string) => {
        if (currentMedicoPersonId) return;
        setSelectedDisponibilitaId(null);
        setSelectedMedicoIds(prev => {
            if (prev.includes(medicoId)) {
                return prev.filter(id => id !== medicoId);
            } else {
                return [...prev, medicoId];
            }
        });
    }, [currentMedicoPersonId]);

    // Handle prestazione selection
    const handlePrestazioneToggle = useCallback((prestazioneId: string) => {
        setSelectedPrestazioniIds(prev => {
            if (prev.includes(prestazioneId)) {
                return prev.filter(id => id !== prestazioneId);
            } else {
                return [...prev, prestazioneId];
            }
        });
    }, []);

    // Handle submit
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (currentMedicoPersonId) {
            const ownMedico = medici[0];
            const allowedOwnIds = [ownMedico?.id, ownMedico?.personId, currentMedicoPersonId].filter(Boolean);
            if (!ownMedico || !selectedMedicoIds.every(id => allowedOwnIds.includes(id))) {
                showToast({ message: 'Puoi creare sessioni coda solo per il tuo profilo medico', type: 'error' });
                return;
            }
        }

        if (!selectedDisponibilitaId) {
            showToast({ message: 'Seleziona uno slot disponibilità medico in ambulatorio per creare la sessione coda', type: 'error' });
            return;
        }

        // Validation for DISPLAY mode
        if (selectedMode === 'DISPLAY' && !selectedAmbulatorioId) {
            showToast({ message: 'Seleziona un ambulatorio per la modalità Display', type: 'error' });
            return;
        }

        // Validation for MOBILE mode
        if (selectedMode === 'MOBILE') {
            if (selectedAmbulatorioIds.length === 0 && !selectedAmbulatorioId) {
                showToast({ message: 'Seleziona almeno un ambulatorio per la modalità Mobile', type: 'error' });
                return;
            }
            if (selectedMedicoIds.length === 0) {
                showToast({ message: 'Seleziona almeno un medico per la modalità Mobile', type: 'error' });
                return;
            }
        }

        // Block if existing session found
        if (existingSessionWarning.show) {
            showToast({
                message: 'Esiste già una sessione attiva. Scegli un altro ambulatorio o data, oppure vai alla sessione esistente.',
                type: 'warning'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Prepare config (prestazioni are used for wait time estimation only, not stored in config)
            const sessionConfig: QueueSessionConfig = {
                ...config
            };

            // Create session
            const session = await mutations.createSession.mutate({
                ambulatorioId: selectedAmbulatorioId || (selectedAmbulatorioIds[0] || ''),
                ambulatorioIds: selectedMode === 'MOBILE' ? selectedAmbulatorioIds : undefined,
                mediciIds: selectedMode === 'MOBILE' ? selectedMedicoIds : undefined,
                mode: selectedMode,
                date,
                config: sessionConfig,
                // P54: Link to slot disponibilità (rinominato da disponibilitaMedicoId)
                slotDisponibilitaId: selectedDisponibilitaId || undefined
            });

            // Generate from appointments if requested
            if (generateFromAppointments) {
                try {
                    const result = await mutations.generateFromAppointments.mutate(session.id);
                    showToast({
                        message: `Sessione creata con ${result.created} pazienti in coda`,
                        type: 'success'
                    });
                } catch (err) {
                    showToast({
                        message: 'Sessione creata, ma errore nella generazione automatica. Puoi aggiungere pazienti manualmente.',
                        type: 'warning'
                    });
                }
            } else {
                showToast({ message: 'Sessione creata con successo', type: 'success' });
            }

            // Navigate to queue management
            navigate('/poliambulatorio/coda');
        } catch (err: unknown) {
            const errorMessage = (err as any)?.response?.data?.error || (err as any)?.message || 'Errore sconosciuto';

            // Parse specific error messages for user-friendly guidance
            if (errorMessage.includes('sessione attiva')) {
                showToast({
                    message: 'Esiste già una sessione attiva per questa data e ambulatorio. Seleziona un altro ambulatorio o data.',
                    type: 'error',
                    duration: 5000
                });
            } else if (errorMessage.includes('disponibilità')) {
                showToast({
                    message: 'Nessuna disponibilità trovata per il medico selezionato in questa data. Verifica lo slot disponibilità.',
                    type: 'error',
                    duration: 5000
                });
            } else {
                showToast({
                    message: `Errore nella creazione: ${errorMessage}`,
                    type: 'error'
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [
        selectedAmbulatorioId,
        selectedAmbulatorioIds,
        selectedMedicoIds,
        selectedPrestazioniIds,
        selectedMode,
        date,
        config,
        generateFromAppointments,
        selectedDisponibilitaId,
        existingSessionWarning,
        mutations,
        navigate,
        showToast,
        currentMedicoPersonId,
        medici
    ]);

    const handleGoToExistingSession = useCallback(() => {
        if (existingSessionWarning.session?.id) {
            navigate(`/poliambulatorio/coda?sessionId=${existingSessionWarning.session.id}`);
        }
    }, [existingSessionWarning.session, navigate]);

    // Compute total estimated duration
    const totalEstimatedDuration = useMemo(() => {
        return selectedPrestazioniIds.reduce((total, id) => {
            const prestazione = prestazioni.find(p => p.id === id);
            return total + (prestazione?.durataPrevista || 15);
        }, 0);
    }, [selectedPrestazioniIds, prestazioni]);

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Nuova Sessione Coda</h1>
                        <p className="text-sm text-gray-500">Configura una nuova sessione di chiamata pazienti</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-3xl mx-auto px-6 py-8">
                {/* Pre-fill notice */}
                {prefillMedicoId && prefillAmbulatorioId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-blue-800">
                                    Sessione da Slot Disponibilità
                                </h3>
                                <p className="text-blue-700 text-sm mt-1">
                                    I dati sono stati pre-compilati dalla disponibilità selezionata.
                                    Puoi modificarli o aggiungere altri medici e ambulatori.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Existing session warning */}
                <ExistingSessionAlert
                    warning={existingSessionWarning}
                    onDismiss={() => setExistingSessionWarning({ show: false, session: null })}
                    onGoToSession={handleGoToExistingSession}
                />

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Mode selection */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-teal-600" />
                            Modalità
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            {/* DISPLAY mode */}
                            <button
                                type="button"
                                onClick={() => setSelectedMode('DISPLAY')}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${selectedMode === 'DISPLAY'
                                    ? 'border-teal-500 bg-teal-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Monitor className={`w-8 h-8 mb-2 ${selectedMode === 'DISPLAY' ? 'text-teal-600' : 'text-gray-400'
                                    }`} />
                                <h3 className="font-semibold text-gray-900">Display</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Pazienti in struttura con monitor sala d'attesa
                                </p>
                            </button>

                            {/* MOBILE mode */}
                            <button
                                type="button"
                                onClick={() => setSelectedMode('MOBILE')}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${selectedMode === 'MOBILE'
                                    ? 'border-teal-500 bg-teal-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Smartphone className={`w-8 h-8 mb-2 ${selectedMode === 'MOBILE' ? 'text-teal-600' : 'text-gray-400'
                                    }`} />
                                <h3 className="font-semibold text-gray-900">Mobile</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    QR Code per visite esterne (domiciliari, cantieri)
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-teal-600" />
                            Data
                        </h2>

                        <DatePickerElegante
                            value={date}
                            onChange={(d) => setDate(d ? d.toISOString().split('T')[0] : '')}
                            theme="teal"
                        />
                        {isCheckingSession && (
                            <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Verifica sessioni esistenti...
                            </p>
                        )}
                    </div>

                    {/* Ambulatorio selection - DISPLAY mode (single) */}
                    {selectedMode === 'DISPLAY' && (
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-teal-600" />
                                Ambulatorio
                            </h2>

                            {isLoadingAmbulatori ? (
                                <div className="animate-pulse bg-gray-200 h-10 rounded-lg" />
                            ) : (
                                <>
                                    <select
                                        value={selectedAmbulatorioId}
                                        onChange={(e) => {
                                            setSelectedAmbulatorioId(e.target.value);
                                            setSelectedAmbulatorioIds(e.target.value ? [e.target.value] : []);
                                            setSelectedDisponibilitaId(null);
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        required
                                    >
                                        <option value="">Seleziona ambulatorio...</option>
                                        {ambulatori.map((amb) => (
                                            <option key={amb.id} value={amb.id}>
                                                {amb.nome} ({amb.codice})
                                                {amb.poliambulatorio ? ` - ${amb.poliambulatorio.nome}` : ''}
                                            </option>
                                        ))}
                                    </select>

                                    {selectedAmbulatorio && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-teal-600" />
                                                {selectedAmbulatorio.nome}
                                            </h4>
                                            {selectedAmbulatorio.specializzazione && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Specializzazione: {selectedAmbulatorio.specializzazione}
                                                </p>
                                            )}
                                            {selectedAmbulatorio.piano && (
                                                <p className="text-sm text-gray-600">
                                                    Piano: {selectedAmbulatorio.piano}
                                                </p>
                                            )}
                                            {selectedAmbulatorio.indicazioniPaziente && (
                                                <p className="text-sm text-gray-600 mt-2 italic">
                                                    {selectedAmbulatorio.indicazioniPaziente}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {selectedMode === 'DISPLAY' && selectedAmbulatorioId && (
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-teal-600" />
                                Slot disponibilità medico
                                {matchingSlots.length > 0 && (
                                    <span className="text-sm font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                        {matchingSlots.length} trovati
                                    </span>
                                )}
                            </h2>

                            {isLoadingSlots ? (
                                <div className="animate-pulse space-y-2">
                                    <div className="bg-gray-200 h-12 rounded-lg" />
                                </div>
                            ) : matchingSlots.length > 0 ? (
                                <div className="space-y-2 max-h-56 overflow-y-auto">
                                    {matchingSlots.map((slot) => {
                                        const medicoInfo = medici.find(m => m.id === slot.medicoId || m.personId === slot.medicoId);
                                        const ambulatorioInfo = ambulatori.find(a => a.id === slot.ambulatorioId);
                                        return (
                                            <label
                                                key={slot.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedDisponibilitaId === slot.id
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="disponibilita"
                                                    checked={selectedDisponibilitaId === slot.id}
                                                    onChange={() => handleDisponibilitaSelect(slot)}
                                                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                                                />
                                                <div className="flex-1">
                                                    <span className="font-medium text-gray-900">
                                                        {formatSlotHour(slot.oraInizio)} - {formatSlotHour(slot.oraFine)}
                                                    </span>
                                                    <p className="text-sm text-gray-500">
                                                        {medicoInfo ? formatMedicoName(medicoInfo) : 'Medico'} • {ambulatorioInfo?.nome || 'Ambulatorio'}
                                                    </p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-amber-700 font-medium">Nessuno slot disponibilità trovato</p>
                                        <p className="text-sm text-amber-600">
                                            La sessione coda può essere creata solo partendo da una disponibilità con medico e ambulatorio.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MOBILE mode specific sections */}
                    {selectedMode === 'MOBILE' && (
                        <>
                            {/* Medici selection */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-teal-600" />
                                    Medici
                                    <span className="text-sm font-normal text-gray-500">
                                        (seleziona uno o più)
                                    </span>
                                </h2>

                                {isLoadingMedici ? (
                                    <div className="animate-pulse space-y-2">
                                        {[1, 2, 3].map(i => <div key={i} className="bg-gray-200 h-12 rounded-lg" />)}
                                    </div>
                                ) : medici.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Nessun medico disponibile</p>
                                        <p className="text-sm">Aggiungi medici dall'anagrafica per usarli nelle code mobile</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {medici.map((medico) => (
                                            <label
                                                key={medico.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedMedicoIds.includes(medico.id)
                                                    ? 'border-teal-500 bg-teal-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMedicoIds.includes(medico.id)}
                                                    disabled={!!currentMedicoPersonId}
                                                    onChange={() => handleMedicoToggle(medico.id)}
                                                    className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                <div className="flex-1">
                                                    <span className="font-medium text-gray-900">
                                                        {formatMedicoName(medico)}
                                                    </span>
                                                    {medico.specialties && medico.specialties.length > 0 && (
                                                        <p className="text-sm text-gray-500">
                                                            {medico.specialties.join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                                {selectedMedicoIds[0] === medico.id && (
                                                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">
                                                        Principale
                                                    </span>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {selectedMedicoIds.length === 0 && (
                                    <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        Seleziona almeno un medico
                                    </p>
                                )}
                            </div>

                            {/* Matching Slots - Auto-match medico availability */}
                            {(selectedMedicoIds.length > 0 || selectedAmbulatorioIds.length > 0) && (
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-teal-600" />
                                        Slot Disponibilità Medico
                                        {matchingSlots.length > 0 && (
                                            <span className="text-sm font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                {matchingSlots.length} trovati
                                            </span>
                                        )}
                                    </h2>

                                    {isLoadingSlots ? (
                                        <div className="animate-pulse space-y-2">
                                            <div className="bg-gray-200 h-12 rounded-lg" />
                                        </div>
                                    ) : matchingSlots.length > 0 ? (
                                        <>
                                            <p className="text-sm text-gray-600 mb-3">
                                                Collega questa sessione a uno slot disponibilità esistente per tracciamento completo:
                                            </p>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {matchingSlots.map((slot) => {
                                                    const startTime = formatSlotHour(slot.oraInizio);
                                                    const endTime = formatSlotHour(slot.oraFine);
                                                    const medicoInfo = medici.find(m => m.id === slot.medicoId || m.personId === slot.medicoId);
                                                    const ambulatorioInfo = ambulatori.find(a => a.id === slot.ambulatorioId);
                                                    return (
                                                        <label
                                                            key={slot.id}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedDisponibilitaId === slot.id
                                                                ? 'border-green-500 bg-green-50'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="disponibilita"
                                                                checked={selectedDisponibilitaId === slot.id}
                                                                onChange={() => handleDisponibilitaSelect(slot)}
                                                                className="w-4 h-4 text-green-600 focus:ring-green-500"
                                                            />
                                                            <div className="flex-1">
                                                                <span className="font-medium text-gray-900">
                                                                    {startTime} - {endTime}
                                                                </span>
                                                                <p className="text-sm text-gray-500">
                                                                    {medicoInfo?.firstName || ''} {medicoInfo?.lastName || 'Medico'} • {ambulatorioInfo?.nome || 'Ambulatorio'}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                                            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-amber-700 font-medium">
                                                    Nessuno slot disponibilità trovato
                                                </p>
                                                <p className="text-sm text-amber-600">
                                                    Per questa data/medico/ambulatorio non esiste uno slot nel calendario.
                                                    Crea prima una disponibilità con medico e ambulatorio, poi torna qui.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Ambulatori selection (multi) */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-teal-600" />
                                    Ambulatori
                                    <span className="text-sm font-normal text-gray-500">
                                        (seleziona uno o più)
                                    </span>
                                </h2>

                                {isLoadingAmbulatori ? (
                                    <div className="animate-pulse space-y-2">
                                        {[1, 2, 3].map(i => <div key={i} className="bg-gray-200 h-12 rounded-lg" />)}
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {ambulatori.map((amb) => (
                                            <label
                                                key={amb.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedAmbulatorioIds.includes(amb.id)
                                                    ? 'border-teal-500 bg-teal-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAmbulatorioIds.includes(amb.id)}
                                                    onChange={() => handleAmbulatorioToggle(amb.id)}
                                                    className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                <div className="flex-1">
                                                    <span className="font-medium text-gray-900">
                                                        {amb.nome} ({amb.codice})
                                                    </span>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        {amb.specializzazione && <span>{amb.specializzazione}</span>}
                                                        {amb.piano && <span>• Piano {amb.piano}</span>}
                                                        {amb.isEsterno && (
                                                            <span className="text-amber-600 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" /> Esterno
                                                            </span>
                                                        )}
                                                    </div>
                                                    {amb.indicazioniPaziente && (
                                                        <p className="text-xs text-gray-400 italic mt-1">
                                                            {amb.indicazioniPaziente}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {selectedAmbulatorioIds.length === 0 && (
                                    <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        Seleziona almeno un ambulatorio
                                    </p>
                                )}
                            </div>

                            {/* Prestazioni selection */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Stethoscope className="w-5 h-5 text-teal-600" />
                                    Prestazioni disponibili
                                    <span className="text-sm font-normal text-gray-500">
                                        (per stima tempo attesa)
                                    </span>
                                </h2>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-700">
                                        Le prestazioni selezionate saranno usate per calcolare il tempo di attesa stimato
                                        in base alla loro durata. I pazienti potranno vedere la stima sulla loro schermata.
                                    </p>
                                </div>

                                {isLoadingPrestazioni ? (
                                    <div className="animate-pulse space-y-2">
                                        {[1, 2, 3].map(i => <div key={i} className="bg-gray-200 h-12 rounded-lg" />)}
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {prestazioni.map((prest) => (
                                                <label
                                                    key={prest.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedPrestazioniIds.includes(prest.id)
                                                        ? 'border-teal-500 bg-teal-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPrestazioniIds.includes(prest.id)}
                                                        onChange={() => handlePrestazioneToggle(prest.id)}
                                                        className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="font-medium text-gray-900">
                                                            {prest.nome}
                                                        </span>
                                                        <p className="text-sm text-gray-500">
                                                            {prest.codice}
                                                            {prest.durataPrevista && (
                                                                <span className="ml-2">
                                                                    • Durata: {prest.durataPrevista} min
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>

                                        {selectedPrestazioniIds.length > 0 && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-teal-600" />
                                                <span className="text-sm text-gray-700">
                                                    Durata media stimata: <strong>{Math.round(totalEstimatedDuration / selectedPrestazioniIds.length)} min</strong> per paziente
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* Options */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-teal-600" />
                            Opzioni
                        </h2>

                        <div className="space-y-4">
                            {/* Generate from appointments */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={generateFromAppointments}
                                    onChange={(e) => setGenerateFromAppointments(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                    <span className="font-medium text-gray-900">
                                        Genera da appuntamenti
                                    </span>
                                    <p className="text-sm text-gray-500">
                                        Aggiungi automaticamente i pazienti con appuntamento per questa data
                                    </p>
                                </div>
                            </label>

                            {/* TTS */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.ttsEnabled}
                                    onChange={(e) => setConfig({ ...config, ttsEnabled: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                    <span className="font-medium text-gray-900">
                                        Annunci vocali
                                    </span>
                                    <p className="text-sm text-gray-500">
                                        Abilita sintesi vocale per le chiamate sul display
                                    </p>
                                </div>
                            </label>

                            {/* MOBILE mode specific options */}
                            {selectedMode === 'MOBILE' && (
                                <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <Smartphone className="w-4 h-4 text-teal-600" />
                                        Opzioni Mobile
                                    </h3>

                                    {/* Order by Arrival */}
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.orderByArrival || false}
                                            onChange={(e) => setConfig({ ...config, orderByArrival: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-900">
                                                Riordina per arrivo
                                            </span>
                                            <p className="text-sm text-gray-500">
                                                La coda segue l'ordine di check-in effettivo, non l'orario dell'appuntamento
                                            </p>
                                        </div>
                                    </label>

                                    {/* Patient Access Mode */}
                                    <div className="space-y-2">
                                        <label className="block font-medium text-gray-900">
                                            Modalità accesso pazienti
                                        </label>
                                        <select
                                            value={config.patientAccessMode || 'BOTH'}
                                            onChange={(e) => setConfig({ ...config, patientAccessMode: e.target.value as PatientAccessMode })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        >
                                            <option value="BOTH">Tutti (prenotati e non prenotati)</option>
                                            <option value="ONLY_BOOKED">Solo prenotati</option>
                                            <option value="ONLY_WALKIN">Solo walk-in</option>
                                        </select>
                                        <p className="text-sm text-gray-500">
                                            Definisce chi può accedere alla coda tramite QR code
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Annulla
                        </button>
                        <CRUDPrimaryButton
                            type="submit"
                            disabled={
                                isSubmitting ||
                                existingSessionWarning.show ||
                                !selectedDisponibilitaId ||
                                (selectedMode === 'DISPLAY' && !selectedAmbulatorioId) ||
                                (selectedMode === 'MOBILE' && (selectedAmbulatorioIds.length === 0 || selectedMedicoIds.length === 0))
                            }
                            className="flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Creazione...
                                </>
                            ) : existingSessionWarning.show ? (
                                <>
                                    <AlertTriangle className="w-5 h-5" />
                                    Sessione già esistente
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    Crea Sessione
                                </>
                            )}
                        </CRUDPrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSessionPage;
