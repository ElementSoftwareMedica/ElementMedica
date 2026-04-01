/**
 * QueueSessionModal - Modal per creazione e gestione sessione coda
 * 
 * P52 Session #11: Modal completo con:
 * - Configurazione completa sessione (mode, accesso pazienti, TTS, auto-generazione)
 * - QR Code rendering con qrCodeService
 * - Condivisione link (copia, share API)
 * - Gestione coda esistente
 * 
 * @module pages/clinica/agenda/components/modals/QueueSessionModal
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Users,
    Phone,
    PhoneOff,
    Clock,
    CheckCircle,
    Plus,
    Volume2,
    VolumeX,
    RotateCcw,
    QrCode,
    Monitor,
    Smartphone,
    UserPlus,
    Loader2,
    Check,
    ExternalLink,
    Copy,
    Share2,
    Download,
    Settings,
    UserCheck,
    CalendarCheck,
    Stethoscope,
    Search,
    ChevronDown,
    ChevronUp,
    Trash2,
    Link2,
    ClipboardList,
    Tag
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { CRUDPrimaryButton, CRUDButton } from '@/components/shared/CRUDButton';
import {
    useQueueMutations,
    useQueueAudio
} from '@/hooks/clinica/useQueue';
import queueApi, {
    QueueSession,
    QueueEntry,
    QueueMode,
    getStatoLabel,
    getStatoColor,
    getPrioritaColor,
    CreateSessionInput,
    AvailableMedico
} from '@/services/queueApi';
import { prestazioniApi, modulisticaTemplatesApi, convenzioniApi, type Prestazione, type DocumentoTemplate, type Convenzione } from '@/services/clinicaApi';
import { generateQRCodeDataUrl, downloadQRCode } from '@/services/qrCodeService';
import { formatMedicoName } from '@/utils/textFormatters';
import type { CalendarEvent } from '../../types';

// =====================================================
// TYPES
// =====================================================

export interface QueueSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    slot: CalendarEvent;
    ambulatorioId: string;
    ambulatorioNome?: string;
    date: Date;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface QueueEntryRowProps {
    entry: QueueEntry;
    onCall: (id: string) => void;
    onRecall: (id: string) => void;
    onNoShow: (id: string) => void;
    onComplete: (id: string) => void;
}

const QueueEntryRow: React.FC<QueueEntryRowProps> = ({
    entry,
    onCall,
    onRecall,
    onNoShow,
    onComplete
}) => {
    const patientName = entry.personTenantProfile
        ? `${entry.personTenantProfile.person.lastName} ${entry.personTenantProfile.person.firstName}`
        : entry.walkInData
            ? `${entry.walkInData.lastName || ''} ${entry.walkInData.firstName || ''}`.trim() || 'Walk-in'
            : 'Anonimo';

    const statoColor = getStatoColor(entry.stato);
    const prioritaColor = getPrioritaColor(entry.priorita);

    return (
        <div className={`flex items-center justify-between p-2 rounded-lg border ${entry.stato === 'CHIAMATO' ? 'bg-amber-50 border-amber-200' :
            entry.stato === 'IN_VISITA' ? 'bg-teal-50 border-teal-200' :
                'bg-gray-50 border-gray-200'
            }`}>
            <div className="flex items-center gap-3">
                <span className={`text-lg font-bold px-2 py-1 rounded ${prioritaColor}`}>
                    {entry.displayNumber}
                </span>
                <div>
                    <p className="text-sm font-medium text-gray-900">{patientName}</p>
                    <p className={`text-xs ${statoColor}`}>
                        {getStatoLabel(entry.stato)}
                    </p>
                </div>
            </div>

            <div className="flex gap-1">
                {entry.stato === 'IN_ATTESA' && (
                    <button
                        onClick={() => onCall(entry.id)}
                        className="p-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded transition-colors"
                        title="Chiama"
                    >
                        <Phone className="w-4 h-4" />
                    </button>
                )}
                {entry.stato === 'CHIAMATO' && (
                    <>
                        <button
                            onClick={() => onRecall(entry.id)}
                            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
                            title="Richiama"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onComplete(entry.id)}
                            className="p-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded transition-colors"
                            title="In Visita"
                        >
                            <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onNoShow(entry.id)}
                            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                            title="Non Presentato"
                        >
                            <PhoneOff className="w-4 h-4" />
                        </button>
                    </>
                )}
                {entry.stato === 'IN_VISITA' && (
                    <button
                        onClick={() => onComplete(entry.id)}
                        className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                        title="Completa"
                    >
                        <CheckCircle className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export const QueueSessionModal: React.FC<QueueSessionModalProps> = ({
    isOpen,
    onClose,
    slot,
    ambulatorioId,
    ambulatorioNome,
    date
}) => {
    const { showToast } = useToast();
    const mutations = useQueueMutations();

    // State
    const [session, setSession] = useState<QueueSession | null>(null);
    const [entries, setEntries] = useState<QueueEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedMode, setSelectedMode] = useState<QueueMode>('DISPLAY');
    const [showQrCode, setShowQrCode] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    // Session creation config
    const [patientAccessMode, setPatientAccessMode] = useState<'BOTH' | 'ONLY_BOOKED' | 'ONLY_WALKIN'>('BOTH');
    const [autoGenerateFromAppointments, setAutoGenerateFromAppointments] = useState(true);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [orderByArrival, setOrderByArrival] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [showPatientFields, setShowPatientFields] = useState(false);

    // P69: Prestazione erogata per walk-in → appuntamento automatico
    const [selectedPrestazioneId, setSelectedPrestazioneId] = useState<string>('');
    const [durataMinutiDefault, setDurataMinutiDefault] = useState<number>(30);
    const [prestazioni, setPrestazioni] = useState<Prestazione[]>([]);
    const [isLoadingPrestazioni, setIsLoadingPrestazioni] = useState(false);

    // Searchable prestazione combobox state
    const [prestazioneSearch, setPrestazioneSearch] = useState('');
    const [showPrestazioneDropdown, setShowPrestazioneDropdown] = useState(false);
    const prestazioneDropdownRef = useRef<HTMLDivElement>(null);

    // Patient info fields configuration for walk-in
    const PATIENT_FIELD_OPTIONS = useMemo(() => [
        { key: 'lastName', label: 'Cognome', required: true },
        { key: 'firstName', label: 'Nome', required: true },
        { key: 'taxCode', label: 'Codice Fiscale', required: false },
        { key: 'birthDate', label: 'Data di Nascita', required: false },
        { key: 'birthPlace', label: 'Luogo di Nascita', required: false },
        { key: 'provinciaNascita', label: 'Provincia di Nascita', required: false },
        { key: 'phone', label: 'Telefono', required: false },
        { key: 'email', label: 'Email', required: false },
        { key: 'residenza', label: 'Residenza', required: false },
        { key: 'comuneResidenza', label: 'Comune Residenza', required: false },
    ], []);
    const [requiredPatientFields, setRequiredPatientFields] = useState<string[]>(
        ['lastName', 'firstName', 'taxCode', 'birthDate', 'birthPlace', 'provinciaNascita']
    );

    // P53: Questionario post-prenotazione
    const [questionarioTemplateId, setQuestionarioTemplateId] = useState<string>('');
    const [questionarioMode, setQuestionarioMode] = useState<'ALL' | 'SORVEGLIANZA' | 'DISABLED'>('DISABLED');
    const [questionarioTemplates, setQuestionarioTemplates] = useState<DocumentoTemplate[]>([]);
    const [isLoadingQuestionari, setIsLoadingQuestionari] = useState(false);
    const [showQuestionario, setShowQuestionario] = useState(false);

    // Convenzione / Codice Sconto per sessione coda
    const [selectedConvenzioneId, setSelectedConvenzioneId] = useState<string>('');
    const [convenzioni, setConvenzioni] = useState<Convenzione[]>([]);
    const [isLoadingConvenzioni, setIsLoadingConvenzioni] = useState(false);
    const [convenzioneSearch, setConvenzioneSearch] = useState('');
    const [showConvenzioneDropdown, setShowConvenzioneDropdown] = useState(false);
    const convenzioneDropdownRef = useRef<HTMLDivElement>(null);
    const [codiceSconto, setCodiceSconto] = useState<string>('');
    const [showConvenzione, setShowConvenzione] = useState(false);

    // Associa Medico state
    const [showAssociaMedico, setShowAssociaMedico] = useState(false);
    const [availableMedici, setAvailableMedici] = useState<AvailableMedico[]>([]);
    const [isLoadingMedici, setIsLoadingMedici] = useState(false);
    const [isAddingMedico, setIsAddingMedico] = useState<string | null>(null); // personId being added
    const [isRemovingMedico, setIsRemovingMedico] = useState<string | null>(null); // profileId being removed
    const [medicoSearchQuery, setMedicoSearchQuery] = useState('');

    // Audio hook for TTS
    const audio = useQueueAudio({ enabled: !isMuted, volume: 1 });

    // Filtered prestazioni for search combobox
    const filteredPrestazioni = useMemo(() => {
        if (!prestazioneSearch.trim()) return prestazioni;
        const q = prestazioneSearch.toLowerCase().trim();
        return prestazioni.filter(p =>
            p.nome.toLowerCase().includes(q) ||
            (p.codice && p.codice.toLowerCase().includes(q))
        );
    }, [prestazioni, prestazioneSearch]);

    // Close prestazione dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (prestazioneDropdownRef.current && !prestazioneDropdownRef.current.contains(e.target as Node)) {
                setShowPrestazioneDropdown(false);
            }
        };
        if (showPrestazioneDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPrestazioneDropdown]);

    // Filtered convenzioni for search combobox
    const filteredConvenzioni = useMemo(() => {
        if (!convenzioneSearch.trim()) return convenzioni;
        const q = convenzioneSearch.toLowerCase().trim();
        return convenzioni.filter(c =>
            c.nome.toLowerCase().includes(q) ||
            c.codice.toLowerCase().includes(q)
        );
    }, [convenzioni, convenzioneSearch]);

    // Close convenzione dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (convenzioneDropdownRef.current && !convenzioneDropdownRef.current.contains(e.target as Node)) {
                setShowConvenzioneDropdown(false);
            }
        };
        if (showConvenzioneDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showConvenzioneDropdown]);

    // Format date for API
    const dateStr = useMemo(() => {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }, [date]);

    // Sync local settings from existing session config
    useEffect(() => {
        if (session?.config) {
            const cfg = session.config as Record<string, any>;
            if (cfg.ttsEnabled !== undefined) setTtsEnabled(cfg.ttsEnabled);
            if (cfg.orderByArrival !== undefined) setOrderByArrival(cfg.orderByArrival);
            if (cfg.patientAccessMode) setPatientAccessMode(cfg.patientAccessMode);
            if (cfg.autoGenerateFromAppointments !== undefined) setAutoGenerateFromAppointments(cfg.autoGenerateFromAppointments);
            if (cfg.prestazioneId) setSelectedPrestazioneId(cfg.prestazioneId);
            if (cfg.durataMinutiDefault) setDurataMinutiDefault(cfg.durataMinutiDefault);
            if (Array.isArray(cfg.requiredPatientFields)) setRequiredPatientFields(cfg.requiredPatientFields);
            // P53: Questionario
            if (cfg.questionarioTemplateId) setQuestionarioTemplateId(cfg.questionarioTemplateId);
            if (cfg.questionarioMode) setQuestionarioMode(cfg.questionarioMode);
            if (cfg.questionarioMode && cfg.questionarioMode !== 'DISABLED') setShowQuestionario(true);
            // Convenzione / Codice Sconto
            if (cfg.convenzioneId) setSelectedConvenzioneId(cfg.convenzioneId);
            if (cfg.codiceSconto) setCodiceSconto(cfg.codiceSconto);
            if (cfg.convenzioneId || cfg.codiceSconto) setShowConvenzione(true);
        }
    }, [session?.id]);

    // Auto-fill codice sconto from convenzione condizioni
    useEffect(() => {
        if (!selectedConvenzioneId) return;
        const conv = convenzioni.find(c => c.id === selectedConvenzioneId);
        if (conv?.condizioni && typeof conv.condizioni === 'object') {
            const cond = conv.condizioni as Record<string, unknown>;
            if (cond.codiceSconto && typeof cond.codiceSconto === 'string' && !codiceSconto) {
                setCodiceSconto(String(cond.codiceSconto).toUpperCase());
            }
        }
    }, [selectedConvenzioneId, convenzioni]);

    // P69: Load prestazioni list for session settings
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setIsLoadingPrestazioni(true);
        prestazioniApi.getAll({ limit: 200 })
            .then(result => {
                if (!cancelled) {
                    const list = Array.isArray(result) ? result : (result as any)?.data || [];
                    setPrestazioni(list.filter((p: Prestazione) => p.attivo));
                }
            })
            .catch(() => { /* silent */ })
            .finally(() => { if (!cancelled) setIsLoadingPrestazioni(false); });

        // P53: Load questionario templates
        setIsLoadingQuestionari(true);
        modulisticaTemplatesApi.getAll({ isActive: true, limit: 200 })
            .then(result => {
                if (!cancelled) {
                    const list = Array.isArray(result) ? result : (result as any)?.data || [];
                    setQuestionarioTemplates(list);
                }
            })
            .catch(() => { /* silent */ })
            .finally(() => { if (!cancelled) setIsLoadingQuestionari(false); });

        // Load convenzioni attive
        setIsLoadingConvenzioni(true);
        convenzioniApi.getAll({ limit: 200 })
            .then(result => {
                if (!cancelled) {
                    const list = Array.isArray(result) ? result : (result as any)?.data || [];
                    setConvenzioni(list.filter((c: Convenzione) => c.attiva));
                }
            })
            .catch(() => { /* silent */ })
            .finally(() => { if (!cancelled) setIsLoadingConvenzioni(false); });

        return () => { cancelled = true; };
    }, [isOpen]);

    // Save session settings
    const handleSaveSettings = useCallback(async () => {
        if (!session) return;
        setIsSavingSettings(true);
        try {
            const selectedPrest = prestazioni.find(p => p.id === selectedPrestazioneId);
            const updatedConfig = {
                ...((session.config as Record<string, any>) || {}),
                ttsEnabled,
                orderByArrival,
                patientAccessMode,
                autoGenerateFromAppointments,
                // P69: Prestazione erogata
                prestazioneId: selectedPrestazioneId || null,
                prestazioneNome: selectedPrest?.nome || null,
                durataMinutiDefault: durataMinutiDefault || 30,
                // Campi anagrafica richiesti per walk-in
                requiredPatientFields,
                // P53: Questionario post-prenotazione
                questionarioTemplateId: questionarioTemplateId || null,
                questionarioTemplateNome: questionarioTemplates.find(q => q.id === questionarioTemplateId)?.nome || null,
                questionarioMode: questionarioMode,
                // Convenzione / Codice Sconto
                convenzioneId: selectedConvenzioneId || null,
                convenzioneNome: convenzioni.find(c => c.id === selectedConvenzioneId)?.nome || null,
                codiceSconto: codiceSconto || null
            };
            const updated = await queueApi.updateSession(session.id, { config: updatedConfig as any });
            setSession(updated);
            showToast({ type: 'success', message: 'Impostazioni aggiornate' });
            setShowSettings(false);
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore nel salvataggio' });
        } finally {
            setIsSavingSettings(false);
        }
    }, [session, ttsEnabled, orderByArrival, patientAccessMode, autoGenerateFromAppointments,
        selectedPrestazioneId, durataMinutiDefault, prestazioni, requiredPatientFields,
        questionarioTemplateId, questionarioMode, questionarioTemplates,
        selectedConvenzioneId, convenzioni, codiceSconto, showToast]);

    // Associa Medico: carica medici disponibili
    const loadAvailableMedici = useCallback(async () => {
        if (!session) return;
        setIsLoadingMedici(true);
        try {
            const medici = await queueApi.getAvailableMedici(session.id, dateStr);
            setAvailableMedici(medici);
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore nel caricamento medici: ' + ('') });
        } finally {
            setIsLoadingMedici(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.id, dateStr, showToast]);

    // Load available medici when "Associa Medico" panel is opened
    useEffect(() => {
        if (showAssociaMedico && session) {
            loadAvailableMedici();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAssociaMedico, session?.id, loadAvailableMedici]);

    // Associa Medico: aggiungi medico alla sessione
    const handleAddMedico = useCallback(async (medicoPersonId: string) => {
        if (!session) return;
        setIsAddingMedico(medicoPersonId);
        try {
            await queueApi.addSessionMedico(session.id, medicoPersonId);
            // Refresh session to see updated medici list
            const updated = await queueApi.getSession(session.id);
            setSession(updated);
            // Refresh available medici (remove the one just added)
            setAvailableMedici(prev => prev.filter(m => m.personId !== medicoPersonId));
            showToast({ type: 'success', message: 'Medico associato alla sessione' });
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore nell\'aggiunta del medico' });
        } finally {
            setIsAddingMedico(null);
        }
    }, [session, showToast]);

    // Associa Medico: rimuovi medico dalla sessione
    const handleRemoveMedico = useCallback(async (medicoProfileId: string) => {
        if (!session) return;
        setIsRemovingMedico(medicoProfileId);
        try {
            await queueApi.removeSessionMedico(session.id, medicoProfileId);
            // Refresh session
            const updated = await queueApi.getSession(session.id);
            setSession(updated);
            // Refresh available medici to re-include the removed one
            await loadAvailableMedici();
            showToast({ type: 'success', message: 'Medico rimosso dalla sessione' });
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore nella rimozione del medico' });
        } finally {
            setIsRemovingMedico(null);
        }
    }, [session, showToast, loadAvailableMedici]);

    // Filtered available medici for search
    const filteredAvailableMedici = useMemo(() => {
        if (!medicoSearchQuery.trim()) return availableMedici;
        const q = medicoSearchQuery.toLowerCase().trim();
        return availableMedici.filter(m =>
            `${m.lastName} ${m.firstName}`.toLowerCase().includes(q) ||
            `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
        );
    }, [availableMedici, medicoSearchQuery]);

    // Check for existing session
    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;

        const checkSession = async () => {
            setIsLoading(true);
            try {
                // P54: Check per slot disponibilità specifico
                // Check for existing DISPLAY session first, then MOBILE
                // Passa medicoPersonId per fallback multi-medico
                let result = await queueApi.checkExistingSession({
                    date: dateStr,
                    ambulatorioId,
                    mode: 'DISPLAY',
                    slotDisponibilitaId: slot.id,
                    medicoPersonId: slot.medicoId
                });

                if (!result.exists) {
                    // Try MOBILE mode
                    result = await queueApi.checkExistingSession({
                        date: dateStr,
                        ambulatorioId,
                        mode: 'MOBILE',
                        slotDisponibilitaId: slot.id,
                        medicoPersonId: slot.medicoId
                    });
                }

                if (isCancelled) return;

                if (result.exists && result.session) {
                    // Load full session data
                    const sessionData = await queueApi.getSession(result.session.id);
                    if (isCancelled) return;
                    setSession(sessionData);

                    // Load entries
                    const entriesData = await queueApi.getEntries({ sessionId: result.session.id });
                    if (isCancelled) return;
                    setEntries(entriesData);
                } else {
                    setSession(null);
                    setEntries([]);
                }
            } catch (err) {
                if (isCancelled) return;
                // Error handled silently — session will show as null
                setSession(null);
                setEntries([]);
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        checkSession();

        return () => { isCancelled = true; };
    }, [isOpen, dateStr, ambulatorioId, slot.id]);

    // Generate QR code when session with token is available
    useEffect(() => {
        if (session?.qrCodeToken) {
            const qrUrl = `${window.location.origin}/queue/${session.qrCodeToken}`;
            generateQRCodeDataUrl({
                data: qrUrl,
                size: 280,
                primaryColor: '#0d9488', // teal-600
                dotsStyle: 'rounded',
                cornersStyle: 'extra-rounded'
            }).then(dataUrl => setQrCodeDataUrl(dataUrl))
                .catch(() => { /* QR generation failed silently */ });
        }
    }, [session?.qrCodeToken]);

    // Get QR/share URL
    const shareUrl = useMemo(() => {
        if (!session?.qrCodeToken) return null;
        return `${window.location.origin}/queue/${session.qrCodeToken}`;
    }, [session?.qrCodeToken]);

    // Copy link
    const handleCopyLink = useCallback(async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setLinkCopied(true);
            showToast({ type: 'success', message: 'Link copiato negli appunti' });
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (_err) {
            showToast({ type: 'error', message: 'Errore copia link' });
        }
    }, [shareUrl, showToast]);

    // Native share
    const handleShare = useCallback(async () => {
        if (!shareUrl) return;
        try {
            await navigator.share({
                title: 'Coda Pazienti',
                text: `Prenota o registrati in coda - ${ambulatorioNome || 'Ambulatorio'}`,
                url: shareUrl
            });
        } catch (_err) {
            // Fallback to copy
            handleCopyLink();
        }
    }, [shareUrl, ambulatorioNome, handleCopyLink]);

    // Download QR code
    const handleDownloadQR = useCallback(async () => {
        if (!shareUrl) return;
        try {
            await downloadQRCode({
                data: shareUrl,
                size: 512,
                primaryColor: '#0d9488',
                dotsStyle: 'rounded',
                cornersStyle: 'extra-rounded'
            }, 'qr-coda-sessione.png');
            showToast({ type: 'success', message: 'QR code scaricato' });
        } catch (_err) {
            showToast({ type: 'error', message: 'Errore download QR code' });
        }
    }, [shareUrl, showToast]);

    // Create new session
    const handleCreateSession = useCallback(async () => {
        setIsCreating(true);
        try {
            const input: CreateSessionInput = {
                ambulatorioId,
                mode: selectedMode,
                date: dateStr,
                mediciIds: slot.medicoId ? [slot.medicoId] : undefined,
                slotDisponibilitaId: slot.id,
                config: {
                    autoCallEnabled: false,
                    callInterval: 30,
                    displayDuration: 15,
                    maxWaitTimeMinutes: 60,
                    ttsEnabled,
                    ttsVolume: 1,
                    orderByArrival,
                    patientAccessMode,
                    autoGenerateFromAppointments,
                    // P69: Prestazione erogata
                    prestazioneId: selectedPrestazioneId || undefined,
                    prestazioneNome: prestazioni.find(p => p.id === selectedPrestazioneId)?.nome || undefined,
                    durataMinutiDefault: durataMinutiDefault || 30,
                    // Campi anagrafica richiesti per il self check-in
                    requiredPatientFields,
                    // P53: Questionario post-prenotazione
                    questionarioTemplateId: questionarioTemplateId || undefined,
                    questionarioTemplateNome: questionarioTemplates.find(q => q.id === questionarioTemplateId)?.nome || undefined,
                    questionarioMode: questionarioMode,
                    // Convenzione / Codice Sconto
                    convenzioneId: selectedConvenzioneId || undefined,
                    convenzioneNome: convenzioni.find(c => c.id === selectedConvenzioneId)?.nome || undefined,
                    codiceSconto: codiceSconto || undefined
                }
            };

            const newSession = await queueApi.createSession(input);
            setSession(newSession);
            setEntries([]);

            // Se auto-generate attivo, genera i numeri dagli appuntamenti
            if (autoGenerateFromAppointments && newSession.id) {
                try {
                    const generated = await queueApi.generateFromAppointments(newSession.id);
                    if (generated) {
                        const entriesData = await queueApi.getEntries({ sessionId: newSession.id });
                        setEntries(entriesData);
                    }
                } catch (_genErr) {
                    // Non bloccare se la generazione fallisce
                }
            }

            // Se MOBILE, mostra QR automaticamente
            if (selectedMode === 'MOBILE') {
                setShowQrCode(true);
            }

            showToast({ type: 'success', message: 'Sessione coda creata' });
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore nella creazione' });
        } finally {
            setIsCreating(false);
        }
    }, [ambulatorioId, dateStr, selectedMode, slot.id, slot.medicoId, showToast,
        ttsEnabled, orderByArrival, patientAccessMode, autoGenerateFromAppointments,
        requiredPatientFields, selectedPrestazioneId, durataMinutiDefault, prestazioni,
        questionarioTemplateId, questionarioMode, questionarioTemplates,
        selectedConvenzioneId, convenzioni, codiceSconto]);

    // Call patient
    const handleCall = useCallback(async (entryId: string) => {
        try {
            const entry = entries.find(e => e.id === entryId);
            const result = await mutations.callSpecific.mutate({
                entryId,
                ambulatorioId,
                appuntamentoId: entry?.appuntamentoId
            });
            // Play audio announcement
            if (result && result.entry) {
                audio.playChime();
                setTimeout(() => {
                    const ambulatorioName = ambulatorioNome || 'ambulatorio';
                    audio.speak(`Numero ${result.entry.displayNumber}, prego recarsi presso ${ambulatorioName}`);
                }, 500);
            }
            // Refresh entries
            if (session) {
                const entriesData = await queueApi.getEntries({ sessionId: session.id });
                setEntries(entriesData);
            }
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore nella chiamata' });
        }
    }, [mutations.callSpecific, session, showToast, audio, ambulatorioNome, ambulatorioId, entries]);

    // Recall patient
    const handleRecall = useCallback(async (entryId: string) => {
        try {
            await mutations.recallEntry.mutate({ entryId });
            // Play audio announcement
            const entry = entries.find(e => e.id === entryId);
            if (entry) {
                audio.playChime();
                setTimeout(() => {
                    const ambulatorioName = ambulatorioNome || 'ambulatorio';
                    audio.speak(`Numero ${entry.displayNumber}, prego recarsi presso ${ambulatorioName}`);
                }, 500);
            }
            if (session) {
                const entriesData = await queueApi.getEntries({ sessionId: session.id });
                setEntries(entriesData);
            }
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore nella richiamata' });
        }
    }, [mutations.recallEntry, session, showToast, entries, audio, ambulatorioNome]);

    // Mark no-show
    const handleNoShow = useCallback(async (entryId: string) => {
        try {
            await mutations.updateEntryStatus.mutate({
                id: entryId,
                data: { stato: 'NON_PRESENTATO' }
            });
            if (session) {
                const entriesData = await queueApi.getEntries({ sessionId: session.id });
                setEntries(entriesData);
            }
            showToast({ type: 'info', message: 'Paziente segnato come non presentato' });
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore' });
        }
    }, [mutations.updateEntryStatus, session, showToast]);

    // Complete visit
    const handleComplete = useCallback(async (entryId: string) => {
        try {
            await mutations.completeEntry.mutate(entryId);
            if (session) {
                const entriesData = await queueApi.getEntries({ sessionId: session.id });
                setEntries(entriesData);
            }
            showToast({ type: 'success', message: 'Visita completata' });
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore' });
        }
    }, [mutations.completeEntry, session, showToast]);

    // Stats
    const stats = useMemo(() => {
        const inAttesa = entries.filter(e => e.stato === 'IN_ATTESA').length;
        const chiamati = entries.filter(e => e.stato === 'CHIAMATO').length;
        const inVisita = entries.filter(e => e.stato === 'IN_VISITA').length;
        const completati = entries.filter(e => e.stato === 'COMPLETATO').length;
        return { inAttesa, chiamati, inVisita, completati };
    }, [entries]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="w-6 h-6" />
                            <div>
                                <h2 className="text-lg font-semibold">Gestione Coda</h2>
                                <p className="text-sm opacity-90">
                                    {ambulatorioNome || 'Ambulatorio'} - {slot.medicoNome}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                        </div>
                    ) : !session ? (
                        /* No session - Create new */
                        <div className="space-y-6">
                            <div className="text-center py-4">
                                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <h3 className="text-lg font-medium text-gray-900">
                                    Nuova Sessione Coda
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Configura e avvia una sessione per gestire i pazienti
                                </p>
                            </div>

                            {/* Mode selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Modalità</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedMode('DISPLAY')}
                                        className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedMode === 'DISPLAY'
                                            ? 'border-teal-500 bg-teal-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Monitor className={`w-6 h-6 ${selectedMode === 'DISPLAY' ? 'text-teal-600' : 'text-gray-400'}`} />
                                        <div className="text-left">
                                            <span className={`text-sm font-medium block ${selectedMode === 'DISPLAY' ? 'text-teal-700' : 'text-gray-600'}`}>
                                                Display
                                            </span>
                                            <span className="text-xs text-gray-500">Numeri su monitor</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setSelectedMode('MOBILE')}
                                        className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedMode === 'MOBILE'
                                            ? 'border-teal-500 bg-teal-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Smartphone className={`w-6 h-6 ${selectedMode === 'MOBILE' ? 'text-teal-600' : 'text-gray-400'}`} />
                                        <div className="text-left">
                                            <span className={`text-sm font-medium block ${selectedMode === 'MOBILE' ? 'text-teal-700' : 'text-gray-600'}`}>
                                                Mobile
                                            </span>
                                            <span className="text-xs text-gray-500">QR Code + Link</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Patient access mode */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Accesso Pazienti</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'BOTH' as const, label: 'Tutti', desc: 'Prenotati + Walk-in', icon: Users },
                                        { value: 'ONLY_BOOKED' as const, label: 'Solo Prenotati', desc: 'Con appuntamento', icon: CalendarCheck },
                                        { value: 'ONLY_WALKIN' as const, label: 'Solo Walk-in', desc: 'Senza prenotazione', icon: UserPlus }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setPatientAccessMode(opt.value)}
                                            className={`p-2.5 rounded-lg border text-center transition-all ${patientAccessMode === opt.value
                                                ? 'border-teal-500 bg-teal-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <opt.icon className={`w-5 h-5 mx-auto mb-1 ${patientAccessMode === opt.value ? 'text-teal-600' : 'text-gray-400'}`} />
                                            <span className={`text-xs font-medium block ${patientAccessMode === opt.value ? 'text-teal-700' : 'text-gray-600'}`}>
                                                {opt.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Toggle options */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CalendarCheck className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">Genera numeri dagli appuntamenti</span>
                                    </div>
                                    <button
                                        onClick={() => setAutoGenerateFromAppointments(!autoGenerateFromAppointments)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${autoGenerateFromAppointments ? 'bg-teal-500' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoGenerateFromAppointments ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Volume2 className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">Annuncio vocale (TTS)</span>
                                    </div>
                                    <button
                                        onClick={() => setTtsEnabled(!ttsEnabled)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${ttsEnabled ? 'bg-teal-500' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${ttsEnabled ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">Ordina per arrivo</span>
                                    </div>
                                    <button
                                        onClick={() => setOrderByArrival(!orderByArrival)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${orderByArrival ? 'bg-teal-500' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${orderByArrival ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* P69: Prestazione selection in creation form */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Prestazione</label>
                                <div className="relative" ref={prestazioneDropdownRef}>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={prestazioneSearch || (selectedPrestazioneId ? prestazioni.find(p => p.id === selectedPrestazioneId)?.nome || '' : '')}
                                            onChange={(e) => {
                                                setPrestazioneSearch(e.target.value);
                                                if (!showPrestazioneDropdown) setShowPrestazioneDropdown(true);
                                                if (selectedPrestazioneId && e.target.value !== prestazioni.find(p => p.id === selectedPrestazioneId)?.nome) {
                                                    setSelectedPrestazioneId('');
                                                }
                                            }}
                                            onFocus={() => setShowPrestazioneDropdown(true)}
                                            placeholder={isLoadingPrestazioni ? 'Caricamento...' : 'Cerca prestazione...'}
                                            className="w-full px-3 py-2 pr-16 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                            {selectedPrestazioneId && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedPrestazioneId('');
                                                        setPrestazioneSearch('');
                                                        setDurataMinutiDefault(30);
                                                    }}
                                                    className="p-0.5 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setShowPrestazioneDropdown(!showPrestazioneDropdown)}
                                                className="p-0.5 text-gray-400 hover:text-gray-600"
                                            >
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    {selectedPrestazioneId && !prestazioneSearch && (
                                        <div className="mt-1.5 px-2.5 py-1.5 bg-teal-50 rounded-lg text-xs text-teal-700 flex items-center gap-1.5">
                                            <Check className="w-3 h-3" />
                                            {prestazioni.find(p => p.id === selectedPrestazioneId)?.nome}
                                            <span className="text-teal-500">
                                                ({prestazioni.find(p => p.id === selectedPrestazioneId)?.durataPrevista} min)
                                            </span>
                                        </div>
                                    )}
                                    {showPrestazioneDropdown && (
                                        <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                            {isLoadingPrestazioni ? (
                                                <div className="flex items-center justify-center py-3">
                                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                </div>
                                            ) : filteredPrestazioni.length === 0 ? (
                                                <p className="text-xs text-gray-500 py-2 px-3">Nessuna prestazione trovata</p>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPrestazioneId('');
                                                            setPrestazioneSearch('');
                                                            setDurataMinutiDefault(30);
                                                            setShowPrestazioneDropdown(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                                                    >
                                                        — Nessuna prestazione —
                                                    </button>
                                                    {filteredPrestazioni.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => {
                                                                setSelectedPrestazioneId(p.id);
                                                                setPrestazioneSearch('');
                                                                setDurataMinutiDefault(p.durataPrevista || 30);
                                                                setShowPrestazioneDropdown(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-teal-50 transition-colors flex items-center justify-between ${p.id === selectedPrestazioneId ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                                                                }`}
                                                        >
                                                            <span className="truncate">{p.nome}</span>
                                                            <span className="text-gray-400 ml-2 flex-shrink-0">
                                                                {p.durataPrevista} min
                                                                {p.prezzoBase ? ` • €${p.prezzoBase}` : ''}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {selectedPrestazioneId && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <label className="text-xs text-gray-600 whitespace-nowrap">Durata appuntamento:</label>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setDurataMinutiDefault(Math.max(5, durataMinutiDefault - 5))}
                                                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600 text-sm font-bold transition-colors"
                                            >
                                                −
                                            </button>
                                            <span className="text-sm font-medium text-gray-700 w-12 text-center">
                                                {durataMinutiDefault} min
                                            </span>
                                            <button
                                                onClick={() => setDurataMinutiDefault(Math.min(120, durataMinutiDefault + 5))}
                                                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600 text-sm font-bold transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Convenzione / Codice Sconto - Collapsible */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <button
                                    type="button"
                                    onClick={() => setShowConvenzione(!showConvenzione)}
                                    className="w-full flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-amber-600" />
                                        <span className="text-xs font-medium text-amber-800">Convenzione / Codice Sconto</span>
                                        {(selectedConvenzioneId || codiceSconto) && (
                                            <span className="bg-amber-200 text-amber-800 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                                attivo
                                            </span>
                                        )}
                                    </div>
                                    {showConvenzione ? (
                                        <ChevronUp className="w-3.5 h-3.5 text-amber-600" />
                                    ) : (
                                        <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                                    )}
                                </button>
                                {showConvenzione && (
                                    <div className="mt-2">
                                        <p className="text-[11px] text-amber-600 mb-2">
                                            Applicata automaticamente a tutti i walk-in della sessione
                                        </p>

                                        {/* Convenzione selector */}
                                        <div className="relative mb-2" ref={convenzioneDropdownRef}>
                                            <label className="text-[11px] text-amber-700 font-medium mb-1 block">Convenzione</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={convenzioneSearch || (selectedConvenzioneId ? convenzioni.find(c => c.id === selectedConvenzioneId)?.nome || '' : '')}
                                                    onChange={(e) => {
                                                        setConvenzioneSearch(e.target.value);
                                                        if (!showConvenzioneDropdown) setShowConvenzioneDropdown(true);
                                                        if (selectedConvenzioneId && e.target.value !== convenzioni.find(c => c.id === selectedConvenzioneId)?.nome) {
                                                            setSelectedConvenzioneId('');
                                                        }
                                                    }}
                                                    onFocus={() => setShowConvenzioneDropdown(true)}
                                                    placeholder={isLoadingConvenzioni ? 'Caricamento...' : 'Cerca convenzione...'}
                                                    className="w-full px-2.5 py-1.5 pr-14 border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white"
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                                    {selectedConvenzioneId && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedConvenzioneId('');
                                                                setConvenzioneSearch('');
                                                            }}
                                                            className="p-0.5 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setShowConvenzioneDropdown(!showConvenzioneDropdown)}
                                                        className="p-0.5 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {selectedConvenzioneId && !convenzioneSearch && (
                                                <div className="mt-1 px-2.5 py-1.5 bg-amber-100 rounded-lg text-xs text-amber-800 flex items-center gap-1.5">
                                                    <Check className="w-3 h-3" />
                                                    {convenzioni.find(c => c.id === selectedConvenzioneId)?.nome}
                                                    <span className="text-amber-600">
                                                        ({convenzioni.find(c => c.id === selectedConvenzioneId)?.codice})
                                                    </span>
                                                </div>
                                            )}
                                            {showConvenzioneDropdown && (
                                                <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                                    {isLoadingConvenzioni ? (
                                                        <div className="flex items-center justify-center py-3">
                                                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                        </div>
                                                    ) : filteredConvenzioni.length === 0 ? (
                                                        <p className="text-xs text-gray-500 py-2 px-3">Nessuna convenzione trovata</p>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedConvenzioneId('');
                                                                    setConvenzioneSearch('');
                                                                    setShowConvenzioneDropdown(false);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                                                            >
                                                                — Nessuna convenzione —
                                                            </button>
                                                            {filteredConvenzioni.map(c => (
                                                                <button
                                                                    key={c.id}
                                                                    onClick={() => {
                                                                        setSelectedConvenzioneId(c.id);
                                                                        setConvenzioneSearch('');
                                                                        setShowConvenzioneDropdown(false);
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors flex items-center justify-between ${c.id === selectedConvenzioneId ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700'
                                                                        }`}
                                                                >
                                                                    <span className="truncate">{c.nome}</span>
                                                                    <span className="text-gray-400 ml-2 flex-shrink-0">{c.codice}</span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Codice Sconto */}
                                        <div>
                                            <label className="text-[11px] text-amber-700 font-medium mb-1 block">Codice Sconto</label>
                                            <input
                                                type="text"
                                                value={codiceSconto}
                                                onChange={(e) => setCodiceSconto(e.target.value.toUpperCase())}
                                                placeholder="Es. SCONTO20"
                                                className="w-full px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white uppercase"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* P53: Questionario post-prenotazione */}
                            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <ClipboardList className="w-4 h-4 text-violet-600" />
                                    <span className="text-xs font-medium text-violet-800">Questionario post-prenotazione</span>
                                </div>
                                <p className="text-[11px] text-violet-600 mb-2">
                                    Presenta un questionario al paziente subito dopo la prenotazione
                                </p>

                                <select
                                    value={questionarioTemplateId}
                                    onChange={(e) => {
                                        setQuestionarioTemplateId(e.target.value);
                                        if (e.target.value) {
                                            setQuestionarioMode(prev => prev === 'DISABLED' ? 'ALL' : prev);
                                        } else {
                                            setQuestionarioMode('DISABLED');
                                        }
                                    }}
                                    className="w-full px-2.5 py-1.5 text-xs border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 bg-white"
                                >
                                    <option value="">Nessun questionario</option>
                                    {isLoadingQuestionari ? (
                                        <option disabled>Caricamento...</option>
                                    ) : (
                                        questionarioTemplates.map(q => (
                                            <option key={q.id} value={q.id}>{q.nome}</option>
                                        ))
                                    )}
                                </select>

                                {questionarioTemplateId && (
                                    <div className="mt-2">
                                        <label className="text-[11px] text-violet-700 font-medium mb-1 block">
                                            A chi presentare il questionario?
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setQuestionarioMode('ALL')}
                                                className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg border transition-colors ${questionarioMode === 'ALL'
                                                    ? 'bg-violet-600 text-white border-violet-600'
                                                    : 'bg-white text-violet-700 border-violet-200 hover:border-violet-400'
                                                    }`}
                                            >
                                                Tutti i pazienti
                                            </button>
                                            <button
                                                onClick={() => setQuestionarioMode('SORVEGLIANZA')}
                                                className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg border transition-colors ${questionarioMode === 'SORVEGLIANZA'
                                                    ? 'bg-violet-600 text-white border-violet-600'
                                                    : 'bg-white text-violet-700 border-violet-200 hover:border-violet-400'
                                                    }`}
                                            >
                                                Solo sorveglianza sanitaria
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center pt-2">
                                <CRUDPrimaryButton
                                    onClick={handleCreateSession}
                                    disabled={isCreating}
                                >
                                    {isCreating ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Plus className="w-4 h-4 mr-2" />
                                    )}
                                    Crea Sessione Coda
                                </CRUDPrimaryButton>
                            </div>
                        </div>
                    ) : (
                        /* Session exists - Show queue management */
                        <div className="space-y-4">
                            {/* Quick stats */}
                            <div className="grid grid-cols-4 gap-3">
                                <div className="bg-amber-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-amber-600">{stats.inAttesa}</p>
                                    <p className="text-xs text-amber-700">In Attesa</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-blue-600">{stats.chiamati}</p>
                                    <p className="text-xs text-blue-700">Chiamati</p>
                                </div>
                                <div className="bg-teal-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-teal-600">{stats.inVisita}</p>
                                    <p className="text-xs text-teal-700">In Visita</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-green-600">{stats.completati}</p>
                                    <p className="text-xs text-green-700">Completati</p>
                                </div>
                            </div>

                            {/* Actions bar */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${session.mode === 'MOBILE'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {session.mode}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Sessione attiva
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className={`p-2 rounded-lg transition-colors ${showSettings
                                            ? 'text-teal-600 bg-teal-50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                            }`}
                                        title="Impostazioni sessione"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                    {session.mode === 'MOBILE' && session.qrCodeToken && (
                                        <button
                                            onClick={() => setShowQrCode(!showQrCode)}
                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Mostra QR Code"
                                        >
                                            <QrCode className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsMuted(!isMuted)}
                                        className={`p-2 rounded-lg transition-colors ${isMuted
                                            ? 'text-gray-400 hover:text-gray-600'
                                            : 'text-teal-600 hover:text-teal-700 bg-teal-50'
                                            }`}
                                        title={isMuted ? 'Attiva Audio' : 'Muta Audio'}
                                    >
                                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Collapsible settings panel */}
                            {showSettings && (
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Settings className="w-4 h-4" />
                                        Impostazioni Sessione
                                    </h4>

                                    {/* Patient access mode */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Accesso Pazienti</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { value: 'BOTH' as const, label: 'Tutti' },
                                                { value: 'ONLY_BOOKED' as const, label: 'Solo Prenotati' },
                                                { value: 'ONLY_WALKIN' as const, label: 'Solo Walk-in' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setPatientAccessMode(opt.value)}
                                                    className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${patientAccessMode === opt.value
                                                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Toggle settings */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-700">Auto-genera da appuntamenti</span>
                                            <button
                                                onClick={() => setAutoGenerateFromAppointments(!autoGenerateFromAppointments)}
                                                className={`relative w-9 h-5 rounded-full transition-colors ${autoGenerateFromAppointments ? 'bg-teal-500' : 'bg-gray-300'}`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoGenerateFromAppointments ? 'translate-x-4' : ''}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-700">Annuncio vocale (TTS)</span>
                                            <button
                                                onClick={() => setTtsEnabled(!ttsEnabled)}
                                                className={`relative w-9 h-5 rounded-full transition-colors ${ttsEnabled ? 'bg-teal-500' : 'bg-gray-300'}`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${ttsEnabled ? 'translate-x-4' : ''}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-700">Ordina per arrivo</span>
                                            <button
                                                onClick={() => setOrderByArrival(!orderByArrival)}
                                                className={`relative w-9 h-5 rounded-full transition-colors ${orderByArrival ? 'bg-teal-500' : 'bg-gray-300'}`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${orderByArrival ? 'translate-x-4' : ''}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* P69: Prestazione erogata */}
                                    <div className="border-t border-gray-200 pt-3">
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                                            <Stethoscope className="w-3.5 h-3.5" />
                                            Prestazione erogata (walk-in → calendario)
                                        </label>
                                        {/* Searchable combobox for prestazione */}
                                        <div className="relative" ref={prestazioneDropdownRef}>
                                            <div
                                                className="flex items-center w-full border border-gray-300 rounded-lg bg-white focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500"
                                            >
                                                <Search className="w-3.5 h-3.5 text-gray-400 ml-2.5 flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder={selectedPrestazioneId
                                                        ? prestazioni.find(p => p.id === selectedPrestazioneId)?.nome || 'Cerca prestazione...'
                                                        : 'Cerca prestazione...'
                                                    }
                                                    value={prestazioneSearch}
                                                    onChange={(e) => {
                                                        setPrestazioneSearch(e.target.value);
                                                        setShowPrestazioneDropdown(true);
                                                    }}
                                                    onFocus={() => setShowPrestazioneDropdown(true)}
                                                    className="flex-1 px-2 py-1.5 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none"
                                                    disabled={isLoadingPrestazioni}
                                                />
                                                {selectedPrestazioneId && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPrestazioneId('');
                                                            setPrestazioneSearch('');
                                                            setDurataMinutiDefault(30);
                                                        }}
                                                        className="p-1 mr-1 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setShowPrestazioneDropdown(!showPrestazioneDropdown)}
                                                    className="p-1 mr-1 text-gray-400 hover:text-gray-600"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            {/* Selected indicator */}
                                            {selectedPrestazioneId && !prestazioneSearch && (
                                                <div className="mt-1 px-2 py-1 bg-teal-50 rounded text-xs text-teal-700 flex items-center gap-1.5">
                                                    <Check className="w-3 h-3" />
                                                    {prestazioni.find(p => p.id === selectedPrestazioneId)?.nome}
                                                    <span className="text-teal-500">
                                                        ({prestazioni.find(p => p.id === selectedPrestazioneId)?.durataPrevista} min)
                                                    </span>
                                                </div>
                                            )}
                                            {/* Dropdown */}
                                            {showPrestazioneDropdown && (
                                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                                    {isLoadingPrestazioni ? (
                                                        <div className="flex items-center justify-center py-3">
                                                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                        </div>
                                                    ) : filteredPrestazioni.length === 0 ? (
                                                        <p className="text-xs text-gray-500 py-2 px-3">Nessuna prestazione trovata</p>
                                                    ) : (
                                                        <>
                                                            {/* Option to clear selection */}
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedPrestazioneId('');
                                                                    setPrestazioneSearch('');
                                                                    setDurataMinutiDefault(30);
                                                                    setShowPrestazioneDropdown(false);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                                                            >
                                                                — Nessuna prestazione —
                                                            </button>
                                                            {filteredPrestazioni.map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => {
                                                                        setSelectedPrestazioneId(p.id);
                                                                        setPrestazioneSearch('');
                                                                        setDurataMinutiDefault(p.durataPrevista || 30);
                                                                        setShowPrestazioneDropdown(false);
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-teal-50 transition-colors flex items-center justify-between ${p.id === selectedPrestazioneId ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                                                                        }`}
                                                                >
                                                                    <span className="truncate">{p.nome}</span>
                                                                    <span className="text-gray-400 ml-2 flex-shrink-0">
                                                                        {p.durataPrevista} min
                                                                        {p.prezzoBase ? ` • €${p.prezzoBase}` : ''}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {selectedPrestazioneId && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <label className="text-xs text-gray-600 whitespace-nowrap">Durata:</label>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setDurataMinutiDefault(Math.max(5, durataMinutiDefault - 5))}
                                                        className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600 text-sm font-bold transition-colors"
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min={5}
                                                        max={240}
                                                        value={durataMinutiDefault}
                                                        onChange={(e) => setDurataMinutiDefault(Math.max(5, parseInt(e.target.value) || 5))}
                                                        className="w-14 text-center px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500"
                                                    />
                                                    <button
                                                        onClick={() => setDurataMinutiDefault(Math.min(240, durataMinutiDefault + 5))}
                                                        className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600 text-sm font-bold transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                    <span className="text-xs text-gray-500 ml-1">min</span>
                                                </div>
                                            </div>
                                        )}
                                        {!selectedPrestazioneId && (
                                            <p className="text-[10px] text-amber-600 mt-1">
                                                Seleziona una prestazione per creare appuntamenti automatici dai walk-in
                                            </p>
                                        )}
                                    </div>

                                    {/* Patient info fields configuration - Collapsible */}
                                    <div className="border-t border-gray-200 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowPatientFields(!showPatientFields)}
                                            className="w-full flex items-center justify-between text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <UserCheck className="w-3.5 h-3.5" />
                                                Campi anagrafica richiesti (walk-in)
                                                {requiredPatientFields.length > 2 && (
                                                    <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
                                                        {requiredPatientFields.length - 2} extra
                                                    </span>
                                                )}
                                            </span>
                                            {showPatientFields
                                                ? <ChevronUp className="w-3.5 h-3.5" />
                                                : <ChevronDown className="w-3.5 h-3.5" />
                                            }
                                        </button>
                                        {showPatientFields && (
                                            <>
                                                <p className="text-[10px] text-gray-500 mt-2 mb-2">
                                                    Seleziona quali informazioni richiedere al paziente non prenotato
                                                </p>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {PATIENT_FIELD_OPTIONS.map(field => {
                                                        const isSelected = requiredPatientFields.includes(field.key);
                                                        const isLocked = field.required; // lastName e firstName sempre obbligatori
                                                        return (
                                                            <button
                                                                key={field.key}
                                                                onClick={() => {
                                                                    if (isLocked) return;
                                                                    setRequiredPatientFields(prev =>
                                                                        prev.includes(field.key)
                                                                            ? prev.filter(f => f !== field.key)
                                                                            : [...prev, field.key]
                                                                    );
                                                                }}
                                                                disabled={isLocked}
                                                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] transition-colors border ${isSelected
                                                                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                                    } ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                                            >
                                                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
                                                                    }`}>
                                                                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                                </div>
                                                                <span className="truncate">{field.label}</span>
                                                                {isLocked && <span className="text-[9px] text-teal-500">*</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* ─── P53: Questionario Post-Prenotazione ─── */}
                                    <div className="border-t border-gray-100 pt-3 mt-3">
                                        <button
                                            onClick={() => setShowQuestionario(!showQuestionario)}
                                            className="flex items-center gap-2 w-full text-left text-xs font-medium text-gray-700 hover:text-violet-600 transition-colors"
                                        >
                                            <ClipboardList className="w-3.5 h-3.5" />
                                            <span>Questionario post-prenotazione</span>
                                            {questionarioTemplateId && (
                                                <span className="ml-auto bg-violet-100 text-violet-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                                    attivo
                                                </span>
                                            )}
                                            {showQuestionario ? (
                                                <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                                            )}
                                        </button>

                                        {showQuestionario && (
                                            <div className="mt-2 space-y-2">
                                                <p className="text-[10px] text-gray-500">
                                                    Presenta un questionario al paziente dopo che si è prenotato in coda
                                                </p>

                                                <select
                                                    value={questionarioTemplateId}
                                                    onChange={(e) => {
                                                        setQuestionarioTemplateId(e.target.value);
                                                        if (e.target.value) {
                                                            setQuestionarioMode(prev => prev === 'DISABLED' ? 'ALL' : prev);
                                                        } else {
                                                            setQuestionarioMode('DISABLED');
                                                        }
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-400"
                                                >
                                                    <option value="">Nessun questionario</option>
                                                    {isLoadingQuestionari ? (
                                                        <option disabled>Caricamento...</option>
                                                    ) : (
                                                        questionarioTemplates.map(q => (
                                                            <option key={q.id} value={q.id}>{q.nome}</option>
                                                        ))
                                                    )}
                                                </select>

                                                {questionarioTemplateId && (
                                                    <div>
                                                        <label className="text-[10px] text-gray-600 font-medium mb-1 block">
                                                            A chi presentare?
                                                        </label>
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                onClick={() => setQuestionarioMode('ALL')}
                                                                className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg border transition-colors ${questionarioMode === 'ALL'
                                                                    ? 'bg-violet-600 text-white border-violet-600'
                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                                                                    }`}
                                                            >
                                                                Tutti
                                                            </button>
                                                            <button
                                                                onClick={() => setQuestionarioMode('SORVEGLIANZA')}
                                                                className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg border transition-colors ${questionarioMode === 'SORVEGLIANZA'
                                                                    ? 'bg-violet-600 text-white border-violet-600'
                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                                                                    }`}
                                                            >
                                                                Solo sorv. sanitaria
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── Convenzione / Codice Sconto ─── */}
                                    <div className="border-t border-gray-100 pt-3 mt-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowConvenzione(!showConvenzione)}
                                            className="flex items-center gap-2 w-full text-left text-xs font-medium text-gray-700 hover:text-amber-600 transition-colors"
                                        >
                                            <Tag className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Convenzione / Codice Sconto</span>
                                            {(selectedConvenzioneId || codiceSconto) && (
                                                <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                                    attivo
                                                </span>
                                            )}
                                            {showConvenzione ? (
                                                <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                                            )}
                                        </button>
                                        {showConvenzione && (
                                            <div className="mt-2 space-y-2">
                                                <p className="text-[10px] text-gray-500 mb-2">
                                                    Applicata automaticamente a tutti i walk-in
                                                </p>

                                                {/* Convenzione */}
                                                <div className="relative mb-2" ref={convenzioneDropdownRef}>
                                                    <label className="text-[10px] text-gray-600 font-medium mb-1 block">Convenzione</label>
                                                    <div className="flex items-center w-full border border-gray-300 rounded-lg bg-white focus-within:ring-1 focus-within:ring-amber-400 focus-within:border-amber-400">
                                                        <Search className="w-3.5 h-3.5 text-gray-400 ml-2.5 flex-shrink-0" />
                                                        <input
                                                            type="text"
                                                            placeholder={selectedConvenzioneId
                                                                ? convenzioni.find(c => c.id === selectedConvenzioneId)?.nome || 'Cerca convenzione...'
                                                                : 'Cerca convenzione...'
                                                            }
                                                            value={convenzioneSearch}
                                                            onChange={(e) => {
                                                                setConvenzioneSearch(e.target.value);
                                                                setShowConvenzioneDropdown(true);
                                                            }}
                                                            onFocus={() => setShowConvenzioneDropdown(true)}
                                                            className="flex-1 px-2 py-1.5 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none"
                                                            disabled={isLoadingConvenzioni}
                                                        />
                                                        {selectedConvenzioneId && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedConvenzioneId('');
                                                                    setConvenzioneSearch('');
                                                                }}
                                                                className="p-1 mr-1 text-gray-400 hover:text-gray-600"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setShowConvenzioneDropdown(!showConvenzioneDropdown)}
                                                            className="p-1 mr-1 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    {selectedConvenzioneId && !convenzioneSearch && (
                                                        <div className="mt-1 px-2 py-1 bg-amber-50 rounded text-xs text-amber-700 flex items-center gap-1.5">
                                                            <Check className="w-3 h-3" />
                                                            {convenzioni.find(c => c.id === selectedConvenzioneId)?.nome}
                                                            <span className="text-amber-500">
                                                                ({convenzioni.find(c => c.id === selectedConvenzioneId)?.codice})
                                                            </span>
                                                        </div>
                                                    )}
                                                    {showConvenzioneDropdown && (
                                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                                            {isLoadingConvenzioni ? (
                                                                <div className="flex items-center justify-center py-3">
                                                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                                </div>
                                                            ) : filteredConvenzioni.length === 0 ? (
                                                                <p className="text-xs text-gray-500 py-2 px-3">Nessuna convenzione trovata</p>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedConvenzioneId('');
                                                                            setConvenzioneSearch('');
                                                                            setShowConvenzioneDropdown(false);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                                                                    >
                                                                        — Nessuna convenzione —
                                                                    </button>
                                                                    {filteredConvenzioni.map(c => (
                                                                        <button
                                                                            key={c.id}
                                                                            onClick={() => {
                                                                                setSelectedConvenzioneId(c.id);
                                                                                setConvenzioneSearch('');
                                                                                setShowConvenzioneDropdown(false);
                                                                            }}
                                                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors flex items-center justify-between ${c.id === selectedConvenzioneId ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700'
                                                                                }`}
                                                                        >
                                                                            <span className="truncate">{c.nome}</span>
                                                                            <span className="text-gray-400 ml-2 flex-shrink-0">{c.codice}</span>
                                                                        </button>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Codice Sconto */}
                                                <div>
                                                    <label className="text-[10px] text-gray-600 font-medium mb-1 block">Codice Sconto</label>
                                                    <input
                                                        type="text"
                                                        value={codiceSconto}
                                                        onChange={(e) => setCodiceSconto(e.target.value.toUpperCase())}
                                                        placeholder="Es. SCONTO20"
                                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-400 bg-white uppercase"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── Associa Medico ─── */}
                                    <div className="border-t border-gray-100 pt-3 mt-3">
                                        <button
                                            onClick={() => setShowAssociaMedico(!showAssociaMedico)}
                                            className="flex items-center gap-2 w-full text-left text-xs font-medium text-gray-700 hover:text-teal-600 transition-colors"
                                        >
                                            <Link2 className="w-3.5 h-3.5" />
                                            <span>Associa Medico</span>
                                            {session?.medici && session.medici.length > 1 && (
                                                <span className="ml-auto bg-teal-100 text-teal-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                                    {session.medici.length} medici
                                                </span>
                                            )}
                                            {showAssociaMedico ? (
                                                <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                                            )}
                                        </button>

                                        {showAssociaMedico && (
                                            <div className="mt-2 space-y-2">
                                                {/* Current medici in session */}
                                                {session?.medici && session.medici.length > 0 && (
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Medici associati</p>
                                                        {session.medici.map((sm) => (
                                                            <div key={sm.medico.personId} className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                                                                    <span className="text-xs text-teal-800 font-medium">
                                                                        {formatMedicoName({
                                                                            firstName: sm.medico.person.firstName,
                                                                            lastName: sm.medico.person.lastName,
                                                                            gender: sm.medico.person.gender as any
                                                                        })}
                                                                    </span>
                                                                </div>
                                                                {session.medici!.length > 1 && (
                                                                    <button
                                                                        onClick={() => handleRemoveMedico(sm.medico.personId || sm.medico.personId)}
                                                                        disabled={isRemovingMedico === (sm.medico.personId || sm.medico.personId)}
                                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                                        title="Rimuovi medico"
                                                                    >
                                                                        {isRemovingMedico === (sm.medico.personId) ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="w-3 h-3" />
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Search and add available medici */}
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Aggiungi medico</p>
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={medicoSearchQuery}
                                                            onChange={(e) => setMedicoSearchQuery(e.target.value)}
                                                            placeholder="Cerca medico per nome..."
                                                            className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                                        />
                                                    </div>

                                                    {isLoadingMedici ? (
                                                        <div className="flex items-center justify-center py-3">
                                                            <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                                                            <span className="ml-2 text-xs text-gray-500">Caricamento medici...</span>
                                                        </div>
                                                    ) : filteredAvailableMedici.length === 0 ? (
                                                        <p className="text-xs text-gray-400 text-center py-2">
                                                            {availableMedici.length === 0
                                                                ? 'Nessun altro medico con disponibilità in questa data'
                                                                : 'Nessun medico trovato per la ricerca'}
                                                        </p>
                                                    ) : (
                                                        <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-1">
                                                            {filteredAvailableMedici.map((m) => (
                                                                <button
                                                                    key={m.personId}
                                                                    onClick={() => handleAddMedico(m.personId)}
                                                                    disabled={isAddingMedico === m.personId}
                                                                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md hover:bg-teal-50 text-left transition-colors group disabled:opacity-50"
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-medium text-gray-700 group-hover:text-teal-700 truncate">
                                                                            {formatMedicoName({
                                                                                firstName: m.firstName,
                                                                                lastName: m.lastName,
                                                                                gender: m.gender as any
                                                                            })}
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400">
                                                                            {m.slots.length} slot · {m.slots[0]?.oraInizio}–{m.slots[m.slots.length - 1]?.oraFine}
                                                                            {m.ambulatori.length > 0 && ` · ${m.ambulatori.map(a => a.nome).join(', ')}`}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-shrink-0 ml-2">
                                                                        {isAddingMedico === m.personId ? (
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />
                                                                        ) : (
                                                                            <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-teal-600" />
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end pt-1">
                                        <button
                                            onClick={handleSaveSettings}
                                            disabled={isSavingSettings}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                        >
                                            {isSavingSettings ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                            Salva Impostazioni
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* QR Code display with sharing */}
                            {showQrCode && session.qrCodeToken && (
                                <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl p-5 text-center border border-gray-100">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                        Condividi con i Pazienti
                                    </h4>

                                    {/* QR Code Image */}
                                    {qrCodeDataUrl ? (
                                        <div className="inline-block p-3 bg-white rounded-xl shadow-sm border">
                                            <img
                                                src={qrCodeDataUrl}
                                                alt="QR Code Coda"
                                                className="w-56 h-56"
                                            />
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center justify-center w-56 h-56 bg-gray-100 rounded-xl">
                                            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                                        </div>
                                    )}

                                    {/* URL */}
                                    <div className="mt-3 flex items-center gap-2 justify-center max-w-sm mx-auto">
                                        <code className="flex-1 bg-gray-100 px-3 py-1.5 rounded text-xs break-all text-gray-600 text-left">
                                            {shareUrl}
                                        </code>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="mt-3 flex items-center gap-2 justify-center">
                                        <button
                                            onClick={handleCopyLink}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {linkCopied ? 'Copiato!' : 'Copia Link'}
                                        </button>
                                        {'share' in navigator && (
                                            <button
                                                onClick={handleShare}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <Share2 className="w-4 h-4" />
                                                Condividi
                                            </button>
                                        )}
                                        <button
                                            onClick={handleDownloadQR}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Scarica
                                        </button>
                                    </div>

                                    <p className="mt-2 text-xs text-gray-500">
                                        I pazienti possono scansionare il QR code per registrarsi in coda
                                    </p>
                                </div>
                            )}

                            {/* Entries list */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Pazienti in coda ({entries.length})
                                </h4>

                                {entries.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-500">Nessun paziente in coda</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {entries
                                            .filter(e => e.stato !== 'COMPLETATO' && e.stato !== 'NON_PRESENTATO')
                                            .map(entry => (
                                                <QueueEntryRow
                                                    key={entry.id}
                                                    entry={entry}
                                                    onCall={handleCall}
                                                    onRecall={handleRecall}
                                                    onNoShow={handleNoShow}
                                                    onComplete={handleComplete}
                                                />
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {session && (
                    <div className="px-6 py-3 bg-gray-50 border-t flex justify-between items-center">
                        <a
                            href={`/poliambulatorio/coda?sessionId=${session.id}&date=${dateStr}${slot.medicoId ? `&medicoId=${slot.medicoId}` : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Apri gestione completa
                        </a>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Chiudi
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default QueueSessionModal;
