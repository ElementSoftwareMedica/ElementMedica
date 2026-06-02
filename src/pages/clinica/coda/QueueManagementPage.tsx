/**
 * QueueManagementPage - Dashboard gestione code multi-ambulatorio
 *
 * Riscrittura completa con:
 * - Griglia card sessioni (multi-ambulatorio)
 * - Supporto MOBILE e DISPLAY mode per sessione
 * - Pannello dettaglio con lista pazienti e azioni
 * - Responsive + elegante
 *
 * @module pages/clinica/coda/QueueManagementPage
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Users,
    Phone,
    PhoneOff,
    Clock,
    AlertCircle,
    CheckCircle,
    Plus,
    Volume2,
    VolumeX,
    RotateCcw,
    Monitor,
    QrCode,
    Smartphone,
    ChevronRight,
    ChevronLeft,
    RefreshCw,
    Calendar,
    Stethoscope,
    PhoneForwarded,
    PhoneCall,
    FileText,
    Zap,
    X,
} from 'lucide-react';
import { toISODateString } from '@/utils/dateUtils';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { getMedicoTitle } from '@/utils/textFormatters';
import { useDateFilter } from '@/hooks/useDateFilter';
import { CRUDButton, CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { ActionButton, DatePickerElegante } from '@/components/ui';
import {
    useQueueCaller,
    useActiveSessionsToday,
    useQueueMutations
} from '@/hooks/clinica/useQueue';
import queueApi, {
    QueueSession,
    QueueEntry,
    PrioritaChiamata,
    getStatoLabel,
    getPrioritaLabel,
    getStatoColor,
    getPrioritaColor,
    formatWaitTime
} from '@/services/queueApi';

// =====================================================
// TYPES
// =====================================================

// =====================================================
// SUB-COMPONENTS
// =====================================================

/**
 * Session card — shows one ambulatorio/session in the grid
 * Supports toggle selection (click to select, click again to deselect)
 */
const SessionCard: React.FC<{
    session: QueueSession;
    isSelected: boolean;
    onToggle: (session: QueueSession) => void;
    callerStats?: { inAttesa: number; chiamati: number; inVisita: number; completati: number } | null;
}> = ({ session, isSelected, onToggle, callerStats }) => {
    const entryCount = session._count?.entries || 0;
    const isMobile = session.mode === 'MOBILE';

    // Format medici display with ambulatorio info
    const mediciDisplay = useMemo(() => {
        if (!session.medici || session.medici.length === 0) return null;
        return session.medici.map(sm => {
            const p = sm.medico?.person;
            if (!p) return null;
            const title = getMedicoTitle(p.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | undefined);
            const name = `${title} ${p.lastName} ${p.firstName}`;
            // Per-medico ambulatorio resolved by backend (_ambulatorio)
            const ambName = (sm as Record<string, unknown>)?._ambulatorio
                ? ((sm as Record<string, unknown>)._ambulatorio as { nome?: string })?.nome
                : null;
            return { name, ambName };
        }).filter(Boolean) as Array<{ name: string; ambName?: string | null }>;
    }, [session.medici]);

    // Derive ambulatorio display from per-medico resolution
    const ambulatorioDisplay = useMemo(() => {
        if (mediciDisplay && mediciDisplay.length > 0) {
            const uniqueAmbs = [...new Set(mediciDisplay.map(m => m.ambName).filter(Boolean))];
            if (uniqueAmbs.length > 0) {
                return { nome: uniqueAmbs.join(' + '), codice: uniqueAmbs.length > 1 ? 'Multi' : undefined };
            }
        }
        return session.ambulatorio ? { nome: session.ambulatorio.nome, codice: session.ambulatorio.codice } : null;
    }, [mediciDisplay, session.ambulatorio]);

    return (
        <button
            onClick={() => onToggle(session)}
            className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${isSelected
                ? 'border-teal-500 bg-teal-50 shadow-md ring-1 ring-teal-200'
                : 'border-gray-200 bg-white hover:border-teal-300'
                }`}
        >
            {/* Header row */}
            <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate text-sm">
                        {ambulatorioDisplay?.nome || 'Ambulatorio'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {ambulatorioDisplay?.codice || '---'}
                    </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${isMobile
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                    }`}>
                    {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                    {isMobile ? 'Mobile' : 'Display'}
                </span>
            </div>

            {/* Medici row */}
            {mediciDisplay && mediciDisplay.length > 0 && (
                <div className="mb-2">
                    {mediciDisplay.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-xs text-teal-700">
                            <Stethoscope className="w-3 h-3 shrink-0" />
                            <span className="truncate">{entry.name}</span>
                            {entry.ambName && (
                                <span className="text-gray-400 truncate">({entry.ambName})</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Stats row */}
            {callerStats ? (
                <div className="grid grid-cols-4 gap-1.5">
                    <div className="text-center p-1.5 rounded-lg bg-yellow-50">
                        <p className="text-lg font-bold text-yellow-700">{callerStats.inAttesa}</p>
                        <p className="text-[10px] text-yellow-600">Attesa</p>
                    </div>
                    <div className="text-center p-1.5 rounded-lg bg-blue-50">
                        <p className="text-lg font-bold text-blue-700">{callerStats.chiamati}</p>
                        <p className="text-[10px] text-blue-600">Chiamati</p>
                    </div>
                    <div className="text-center p-1.5 rounded-lg bg-green-50">
                        <p className="text-lg font-bold text-green-700">{callerStats.inVisita}</p>
                        <p className="text-[10px] text-green-600">Visita</p>
                    </div>
                    <div className="text-center p-1.5 rounded-lg bg-gray-50">
                        <p className="text-lg font-bold text-gray-600">{callerStats.completati}</p>
                        <p className="text-[10px] text-gray-500">Fatto</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{entryCount} pazient{entryCount === 1 ? 'e' : 'i'}</span>
                </div>
            )}
        </button>
    );
};

/**
 * Queue entry row for the table
 */
const QueueEntryRow: React.FC<{
    entry: QueueEntry;
    onCall: (id: string) => void;
    onRecall: (id: string) => void;
    onNoShow: (id: string) => void;
    onComplete: (id: string) => void;
    onStartVisit: (id: string) => void;
    onCallAndVisit: (id: string) => void;
    onCallFromVisit: (id: string) => void;
    onRecallFromVisit: (id: string) => void;
    onChangePriority: (id: string, priority: PrioritaChiamata) => void;
}> = ({
    entry,
    onCall,
    onRecall,
    onNoShow,
    onComplete,
    onStartVisit,
    onCallAndVisit,
    onCallFromVisit,
    onRecallFromVisit,
    onChangePriority
}) => {
        const patientName = entry.patientName
            ? entry.patientName
            : entry.personTenantProfile?.person
                ? `${entry.personTenantProfile.person.lastName || ''} ${entry.personTenantProfile.person.firstName || ''}`.trim()
                : entry.walkInData
                    ? `${entry.walkInData.lastName || ''} ${entry.walkInData.firstName || ''}`.trim() || entry.walkInData.displayedName || 'Walk-in'
                    : 'Anonimo';

        const getActions = (): Array<{ label: string; icon: React.ReactNode; onClick: () => void; variant?: 'danger' }> => {
            const actions: Array<{ label: string; icon: React.ReactNode; onClick: () => void; variant?: 'danger' }> = [];
            switch (entry.stato) {
                case 'IN_ATTESA':
                    actions.push({ label: 'Chiama', icon: <Phone className="w-4 h-4" />, onClick: () => onCall(entry.id) });
                    break;
                case 'CHIAMATO':
                    actions.push({ label: 'Richiama', icon: <RotateCcw className="w-4 h-4" />, onClick: () => onRecall(entry.id) });
                    actions.push({ label: 'Non Presentato', icon: <PhoneOff className="w-4 h-4" />, onClick: () => onNoShow(entry.id), variant: 'danger' });
                    break;
                case 'IN_VISITA':
                    if (entry.oraChiamata || entry.lastCall) {
                        actions.push({ label: 'Richiama Paziente', icon: <RotateCcw className="w-4 h-4" />, onClick: () => onRecallFromVisit(entry.id) });
                    } else {
                        actions.push({ label: 'Chiama Paziente', icon: <PhoneCall className="w-4 h-4" />, onClick: () => onCallFromVisit(entry.id) });
                    }
                    actions.push({ label: 'Completa', icon: <CheckCircle className="w-4 h-4" />, onClick: () => onComplete(entry.id) });
                    break;
            }
            if (entry.stato === 'IN_ATTESA' && entry.priorita === 'NORMALE') {
                actions.push({ label: 'Urgente', icon: <AlertCircle className="w-4 h-4" />, onClick: () => onChangePriority(entry.id, 'URGENTE') });
            }
            return actions;
        };

        const actions = getActions();

        return (
            <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-lg font-bold ${entry.priorita === 'EMERGENZA' ? 'bg-red-100 text-red-800' :
                        entry.priorita === 'URGENTE' ? 'bg-orange-100 text-orange-800' :
                            'bg-teal-100 text-teal-800'
                        }`}>
                        {entry.displayNumber}
                    </span>
                </td>
                <td className="px-4 py-3">
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{patientName}</span>
                        {entry.appuntamento && (
                            <span className="text-sm text-gray-500">{entry.appuntamento.prestazioneNome}</span>
                        )}
                    </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.oraPrevista ? new Date(entry.oraPrevista).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.stimaAttesa
                        ? formatWaitTime(entry.stimaAttesa)
                        : entry.stato === 'IN_ATTESA' && entry.createdAt
                            ? formatWaitTime(Math.round((Date.now() - new Date(entry.createdAt).getTime()) / 60000))
                            : '-'}
                </td>
                <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatoColor(entry.stato)}`}>
                        {getStatoLabel(entry.stato)}
                    </span>
                </td>
                <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPrioritaColor(entry.priorita)}`}>
                        {getPrioritaLabel(entry.priorita)}
                    </span>
                </td>
                <td className="px-4 py-3 text-right">
                    {entry.stato === 'IN_ATTESA' ? (
                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={() => onStartVisit(entry.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors whitespace-nowrap"
                                title="Inizia visita senza chiamare"
                            >
                                <Stethoscope className="w-3.5 h-3.5" />
                                Visita
                            </button>
                            <button
                                onClick={() => onCallAndVisit(entry.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-colors whitespace-nowrap flex-[2]"
                                title="Chiama il paziente e inizia la visita"
                            >
                                <PhoneForwarded className="w-3.5 h-3.5" />
                                Chiama e Visita
                            </button>
                            {entry.priorita === 'NORMALE' && (
                                <button
                                    onClick={() => onChangePriority(entry.id, 'URGENTE')}
                                    className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                    title="Segna come urgente"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ) : actions.length > 0 ? (
                        <ActionButton theme="teal" actions={actions} />
                    ) : null}
                </td>
            </tr>
        );
    };

// =====================================================
// MAIN COMPONENT
// =====================================================

const QueueManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlSessionId = searchParams.get('sessionId');
    const urlDate = searchParams.get('date');
    const { showToast } = useToast();
    const { user } = useAuth();
    const { isMedico, isMedicoCompetente } = useRoleGuard();
    const currentMedicoId = isMedico && !isMedicoCompetente ? user?.id : undefined;

    // Date filter — use URL date if provided, otherwise default to today
    const dateFilter = useDateFilter({
        storageKey: 'queue-management-date-filter',
        mode: 'single',
        defaultDate: urlDate ? new Date(urlDate + 'T00:00:00') : new Date()
    });
    const selectedDate = dateFilter.selectedDate;
    const setSelectedDate = dateFilter.setDate;
    const isToday = dateFilter.isToday;

    // Set date from URL param on mount (overrides stored date)
    const urlDateAppliedRef = useRef(false);
    useEffect(() => {
        if (urlDate && !urlDateAppliedRef.current) {
            urlDateAppliedRef.current = true;
            const d = new Date(urlDate + 'T00:00:00');
            if (!isNaN(d.getTime())) {
                setSelectedDate(d);
            }
        }
    }, [urlDate, setSelectedDate]);

    // State — multi-select sessions (toggle on/off, deselect all to see all entries)
    const [selectedSessions, setSelectedSessions] = useState<QueueSession[]>([]);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [filter, setFilter] = useState<'all' | 'waiting' | 'called' | 'completed'>('all');

    // For backward compat: the "primary" selected session is the first one
    const selectedSession = selectedSessions.length > 0 ? selectedSessions[0] : null;

    // Toggle session selection (click to select, click again to deselect)
    const handleToggleSession = useCallback((session: QueueSession) => {
        setSelectedSessions(prev => {
            const isAlreadySelected = prev.some(s => s.id === session.id);
            if (isAlreadySelected) {
                // Deselect it
                return prev.filter(s => s.id !== session.id);
            } else {
                // Add to selection
                return [...prev, session];
            }
        });
    }, []);

    // Fetch all sessions for the day
    const { sessions, isLoading: sessionsLoading, refetch: refetchSessions } =
        useActiveSessionsToday({
            date: isToday ? undefined : selectedDate,
            refetchInterval: isToday ? 30000 : undefined
        });

    const visibleSessions = useMemo(() => {
        if (!currentMedicoId) return sessions;
        return sessions.filter(session =>
            (session.medici || []).some(sm => sm.medicoId === currentMedicoId || sm.medico?.personId === currentMedicoId)
        );
    }, [sessions, currentMedicoId]);

    // Queue caller for selected session (uses first selected)
    const caller = useQueueCaller({
        sessionId: selectedSession?.id || '',
        enableAudio: audioEnabled,
        audioVolume: 1
    });

    const mutations = useQueueMutations();

    // Reset selection when date changes
    useEffect(() => {
        setSelectedSessions([]);
    }, [selectedDate]);

    // Auto-select from URL or first session
    useEffect(() => {
        if (visibleSessions.length > 0 && selectedSessions.length === 0) {
            if (urlSessionId) {
                const fromUrl = visibleSessions.find(s => s.id === urlSessionId);
                if (fromUrl) { setSelectedSessions([fromUrl]); return; }
            }
            setSelectedSessions([visibleSessions[0]]);
        }
    }, [visibleSessions, selectedSessions.length, urlSessionId]);

    // Filtered entries
    const filteredEntries = useMemo(() => {
        if (!caller.entries) return [];
        switch (filter) {
            case 'waiting': return caller.entries.filter(e => e.stato === 'IN_ATTESA');
            case 'called': return caller.entries.filter(e => e.stato === 'CHIAMATO' || e.stato === 'IN_VISITA');
            case 'completed': return caller.entries.filter(e => e.stato === 'COMPLETATO' || e.stato === 'NON_PRESENTATO');
            default: return caller.entries;
        }
    }, [caller.entries, filter]);

    // ---- Handlers ----

    const handleCallNext = useCallback(async () => {
        try {
            await caller.callNext();
            showToast({ message: 'Paziente chiamato', type: 'success' });
        } catch { showToast({ message: 'Errore nella chiamata', type: 'error' }); }
    }, [caller, showToast]);

    const handleCallSpecific = useCallback(async (entryId: string) => {
        try {
            await caller.callSpecific(entryId);
            showToast({ message: 'Paziente chiamato', type: 'success' });
        } catch { showToast({ message: 'Errore nella chiamata', type: 'error' }); }
    }, [caller, showToast]);

    const handleRecall = useCallback(async (entryId: string) => {
        try {
            await caller.recall(entryId);
            showToast({ message: 'Paziente richiamato', type: 'info' });
        } catch { showToast({ message: 'Errore nella richiamata', type: 'error' }); }
    }, [caller, showToast]);

    const handleNoShow = useCallback(async (entryId: string) => {
        try {
            await caller.markNoShow(entryId);
            showToast({ message: 'Paziente segnato come non presentato', type: 'warning' });
        } catch { showToast({ message: 'Errore', type: 'error' }); }
    }, [caller, showToast]);

    const handleComplete = useCallback(async (entryId: string) => {
        try {
            await caller.complete(entryId);
            showToast({ message: 'Visita completata', type: 'success' });
        } catch { showToast({ message: 'Errore', type: 'error' }); }
    }, [caller, showToast]);

    const handleStartVisit = useCallback(async (entryId: string) => {
        try {
            await caller.startVisit(entryId);
            showToast({ message: 'Visita iniziata', type: 'success' });
        } catch { showToast({ message: 'Errore nell\'avvio visita', type: 'error' }); }
    }, [caller, showToast]);

    const handleCallAndVisit = useCallback(async (entryId: string) => {
        try {
            await caller.callAndVisit(entryId);
            showToast({ message: 'Paziente chiamato e visita iniziata', type: 'success' });
        } catch { showToast({ message: 'Errore nella chiamata', type: 'error' }); }
    }, [caller, showToast]);

    const handleCallFromVisit = useCallback(async (entryId: string) => {
        try {
            await caller.callFromVisit(entryId);
            showToast({ message: 'Paziente chiamato', type: 'success' });
        } catch { showToast({ message: 'Errore nella chiamata', type: 'error' }); }
    }, [caller, showToast]);

    const handleRecallFromVisit = useCallback(async (entryId: string) => {
        try {
            await caller.recallFromVisit(entryId);
            showToast({ message: 'Paziente richiamato', type: 'info' });
        } catch { showToast({ message: 'Errore nella richiamata', type: 'error' }); }
    }, [caller, showToast]);

    const handleChangePriority = useCallback(async (entryId: string, priority: PrioritaChiamata) => {
        try {
            await mutations.updateEntryPriority.mutate({ id: entryId, data: { priorita: priority } });
            await caller.refetch();
            showToast({ message: 'Priorità aggiornata', type: 'success' });
        } catch { showToast({ message: 'Errore', type: 'error' }); }
    }, [mutations.updateEntryPriority, caller, showToast]);

    const handleOpenDisplay = useCallback(() => {
        if (selectedSession) {
            window.open(`/poliambulatorio/coda/display/${selectedSession.id}`, '_blank');
        }
    }, [selectedSession]);

    const handleGenerateBulkDay = useCallback(async () => {
        if (currentMedicoId) {
            showToast({ message: 'Puoi creare solo sessioni coda collegate ai tuoi slot disponibilità', type: 'info' });
            return;
        }
        try {
            const dateStr = toISODateString(selectedDate);
            const result = await mutations.generateBulkDay.mutate({ date: dateStr });
            showToast({
                message: `Generazione completata: ${result.created} sessioni create, ${result.skipped} già presenti`,
                type: result.created > 0 ? 'success' : 'info'
            });
            await refetchSessions();
        } catch {
            showToast({ message: 'Errore nella generazione delle sessioni', type: 'error' });
        }
    }, [mutations.generateBulkDay, selectedDate, refetchSessions, showToast, currentMedicoId]);

    const handleDownloadSessionPdf = useCallback(async () => {
        if (!selectedSession) return;
        try {
            const blob = await mutations.downloadSessionPdf.mutate(selectedSession.id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sessione-coda-${selectedSession.id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            showToast({ message: 'Errore nel download del PDF', type: 'error' });
        }
    }, [mutations.downloadSessionPdf, selectedSession, showToast]);

    // ---- Date helpers ----

    const formatDateLabel = (date: Date) => {
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        if (date.toDateString() === today.toDateString()) return 'Oggi';
        if (date.toDateString() === yesterday.toDateString()) return 'Ieri';
        if (date.toDateString() === tomorrow.toDateString()) return 'Domani';
        return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const handlePrevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
    const handleNextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── HEADER ── */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-5">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gestione Code</h1>
                            <p className="text-sm text-gray-500">Dashboard multi-ambulatorio</p>
                        </div>

                        {/* Date navigation */}
                        <div className="flex items-center gap-1 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100 p-1">
                            <button onClick={handlePrevDay} className="p-2 rounded-lg text-teal-600 hover:bg-teal-100 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2 px-3 min-w-[180px]">
                                <Calendar className="w-4 h-4 text-teal-600" />
                                <DatePickerElegante
                                    value={selectedDate}
                                    onChange={(date) => date && setSelectedDate(date)}
                                    placeholder="Seleziona data"
                                    theme="teal"
                                    size="sm"
                                    clearable={false}
                                    className="!border-0 !bg-transparent !shadow-none"
                                    formatDisplay={(d) => formatDateLabel(d)}
                                />
                            </div>
                            <button onClick={handleNextDay} className="p-2 rounded-lg text-teal-600 hover:bg-teal-100 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            {!isToday && (
                                <button
                                    onClick={() => setSelectedDate(new Date())}
                                    className="px-3 py-1.5 ml-1 text-sm font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors"
                                >
                                    Oggi
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Global actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setAudioEnabled(!audioEnabled)}
                            className={`p-2 rounded-lg transition-colors ${audioEnabled ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}
                            title={audioEnabled ? 'Audio attivo' : 'Audio disattivato'}
                        >
                            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => { refetchSessions(); caller.refetch(); }}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Aggiorna"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <CRUDButton
                            onClick={handleGenerateBulkDay}
                            disabled={mutations.generateBulkDay.isLoading || !!currentMedicoId}
                            className="flex items-center gap-1.5"
                            title="Genera automaticamente tutte le sessioni coda per la giornata selezionata"
                        >
                            <Zap className="w-4 h-4" />
                            {mutations.generateBulkDay.isLoading ? 'Generazione...' : 'Genera Giornata'}
                        </CRUDButton>
                        <CRUDPrimaryButton onClick={() => navigate('/poliambulatorio/coda/sessioni/nuova')}>
                            <Plus className="w-4 h-4 mr-1" />
                            Nuova Sessione
                        </CRUDPrimaryButton>
                    </div>
                </div>
            </div>

            <div className="px-6 py-5 space-y-5">
                {/* ── SESSION CARDS GRID ── */}
                {sessionsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-xl" />
                        ))}
                    </div>
                ) : visibleSessions.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna sessione attiva</h3>
                        <p className="text-gray-500 mb-4">
                            Non ci sono sessioni coda per {formatDateLabel(selectedDate).toLowerCase()}.
                        </p>
                        <CRUDPrimaryButton onClick={() => navigate('/poliambulatorio/coda/sessioni/nuova')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Crea Sessione
                        </CRUDPrimaryButton>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {visibleSessions.map(session => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                isSelected={selectedSessions.some(s => s.id === session.id)}
                                onToggle={handleToggleSession}
                                callerStats={selectedSession?.id === session.id && caller.stats ? {
                                    inAttesa: caller.stats.inAttesa,
                                    chiamati: caller.stats.chiamati,
                                    inVisita: caller.stats.inVisita,
                                    completati: caller.stats.completati
                                } : null}
                            />
                        ))}
                    </div>
                )}

                {/* Multi-selection info */}
                {selectedSessions.length > 1 && (
                    <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg px-4 py-2">
                        <p className="text-sm text-teal-800 font-medium">
                            {selectedSessions.length} sessioni selezionate
                        </p>
                        <button
                            onClick={() => setSelectedSessions([])}
                            className="text-sm text-teal-700 hover:text-teal-900 underline"
                        >
                            Deseleziona tutto
                        </button>
                    </div>
                )}

                {/* ── SELECTED SESSION DETAIL ── */}
                {selectedSession && (
                    <div className="space-y-4">
                        {/* Stats row */}
                        {caller.stats && (
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                {[
                                    { label: 'In Attesa', value: caller.stats.inAttesa, icon: <Clock className="w-5 h-5" />, color: 'bg-yellow-100 text-yellow-800' },
                                    { label: 'Chiamati', value: caller.stats.chiamati, icon: <Phone className="w-5 h-5" />, color: 'bg-blue-100 text-blue-800' },
                                    { label: 'In Visita', value: caller.stats.inVisita, icon: <Users className="w-5 h-5" />, color: 'bg-green-100 text-green-800' },
                                    { label: 'Completati', value: caller.stats.completati, icon: <CheckCircle className="w-5 h-5" />, color: 'bg-gray-100 text-gray-800' },
                                    { label: 'Non Presentati', value: caller.stats.nonPresentati, icon: <PhoneOff className="w-5 h-5" />, color: 'bg-red-100 text-red-800' },
                                    { label: 'Attesa Media', value: formatWaitTime(caller.stats.avgWaitTime), icon: <Clock className="w-5 h-5" />, color: 'bg-purple-100 text-purple-800' }
                                ].map(({ label, value, icon, color }) => (
                                    <div key={label} className={`p-3 rounded-lg ${color}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium opacity-80">{label}</p>
                                                <p className="text-xl font-bold">{value}</p>
                                            </div>
                                            <div className="opacity-50">{icon}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions bar */}
                        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <CRUDPrimaryButton
                                    onClick={handleCallNext}
                                    disabled={!caller.nextEntry}
                                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 text-base"
                                >
                                    <Phone className="w-5 h-5" />
                                    Chiama Prossimo
                                    {caller.nextEntry && (
                                        <span className="ml-1 bg-white/20 px-2 py-0.5 rounded text-sm">
                                            {caller.nextEntry.displayNumber}
                                        </span>
                                    )}
                                </CRUDPrimaryButton>
                                {/* Mode-specific actions */}
                                {selectedSession.mode === 'MOBILE' && selectedSession.qrCodeToken && (
                                    <button
                                        onClick={() => window.open(`/queue/${selectedSession.qrCodeToken}`, '_blank')}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                                        title="Apri pagina paziente"
                                    >
                                        <QrCode className="w-4 h-4" />
                                        QR / Link
                                    </button>
                                )}
                                <button
                                    onClick={handleOpenDisplay}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                    title="Apri display sala d'attesa"
                                >
                                    <Monitor className="w-4 h-4" />
                                    Display
                                </button>
                                <button
                                    onClick={handleDownloadSessionPdf}
                                    disabled={mutations.downloadSessionPdf.isLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
                                    title="Scarica PDF lista pazienti"
                                >
                                    <FileText className="w-4 h-4" />
                                    {mutations.downloadSessionPdf.isLoading ? 'Generazione...' : 'PDF Lista'}
                                </button>
                            </div>

                            {/* Filter tabs */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                {([
                                    { key: 'all' as const, label: 'Tutti' },
                                    { key: 'waiting' as const, label: 'In Attesa' },
                                    { key: 'called' as const, label: 'Chiamati' },
                                    { key: 'completed' as const, label: 'Completati' }
                                ]).map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setFilter(key)}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === key
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Entry table */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N°</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paziente</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previsto</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accettato</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attesa</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priorità</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredEntries.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                                                Nessun paziente in coda
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredEntries.map(entry => (
                                            <QueueEntryRow
                                                key={entry.id}
                                                entry={entry}
                                                onCall={handleCallSpecific}
                                                onRecall={handleRecall}
                                                onNoShow={handleNoShow}
                                                onComplete={handleComplete}
                                                onStartVisit={handleStartVisit}
                                                onCallAndVisit={handleCallAndVisit}
                                                onCallFromVisit={handleCallFromVisit}
                                                onRecallFromVisit={handleRecallFromVisit}
                                                onChangePriority={handleChangePriority}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
};

export default QueueManagementPage;
