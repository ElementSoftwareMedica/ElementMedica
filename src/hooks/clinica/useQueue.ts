/**
 * Queue Hooks
 * React hooks for Queue Calling System (P53)
 * 
 * Provides hooks for:
 * - Queue sessions management
 * - Queue entries (waiting list)
 * - Calling patients
 * - Display state for monitors
 * - Real-time updates
 * 
 * @module hooks/clinica/useQueue
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import queueApi, {
    QueueSession,
    QueueEntry,
    QueueCall,
    QueueSessionStats,
    DisplayState,
    BulkDayResult,
    CreateSessionInput,
    UpdateSessionInput,
    CreateEntryInput,
    UpdateEntryStatusInput,
    UpdateEntryPriorityInput,
    SessionQueryOptions,
    EntryQueryOptions,
    StatoChiamata
} from '../../services/queueApi';

// =====================================================
// TYPES
// =====================================================

interface UseQueryState<T> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

interface UseMutationState<TData, TVariables> {
    mutate: (variables: TVariables) => Promise<TData>;
    data: TData | null;
    isLoading: boolean;
    error: Error | null;
    reset: () => void;
}

// =====================================================
// useQueueSessions - Fetch list of sessions
// =====================================================

export interface UseQueueSessionsOptions extends SessionQueryOptions {
    enabled?: boolean;
    refetchInterval?: number;
}

export interface UseQueueSessionsReturn extends UseQueryState<QueueSession[]> {
    sessions: QueueSession[];
}

export function useQueueSessions(options: UseQueueSessionsOptions = {}): UseQueueSessionsReturn {
    const { enabled = true, refetchInterval, ...queryOptions } = options;
    const [data, setData] = useState<QueueSession[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const intervalRef = useRef<NodeJS.Timeout>();

    const fetch = useCallback(async () => {
        if (!enabled) return;
        setIsLoading(true);
        setError(null);
        try {
            const sessions = await queueApi.getSessions(queryOptions);
            setData(sessions);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
    }, [enabled, JSON.stringify(queryOptions)]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    // Polling interval
    useEffect(() => {
        if (refetchInterval && enabled) {
            intervalRef.current = setInterval(fetch, refetchInterval);
            return () => clearInterval(intervalRef.current);
        }
    }, [refetchInterval, enabled, fetch]);

    return {
        data,
        sessions: data || [],
        isLoading,
        error,
        refetch: fetch
    };
}

// =====================================================
// useQueueSession - Fetch single session with stats
// =====================================================

export interface UseQueueSessionOptions {
    enabled?: boolean;
    includeStats?: boolean;
    refetchInterval?: number;
}

export interface UseQueueSessionReturn extends UseQueryState<QueueSession> {
    session: QueueSession | null;
    stats: QueueSessionStats | null;
}

export function useQueueSession(
    sessionId: string | null,
    options: UseQueueSessionOptions = {}
): UseQueueSessionReturn {
    const { enabled = true, includeStats = true, refetchInterval } = options;
    const [session, setSession] = useState<QueueSession | null>(null);
    const [stats, setStats] = useState<QueueSessionStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const intervalRef = useRef<NodeJS.Timeout>();
    const consecutiveErrorsRef = useRef(0);

    const fetch = useCallback(async () => {
        if (!enabled || !sessionId) return;
        // Stop polling after 3 consecutive errors (e.g., persistent 404)
        if (consecutiveErrorsRef.current >= 3) return;
        setIsLoading(true);
        setError(null);
        try {
            const [sessionData, statsData] = await Promise.all([
                queueApi.getSession(sessionId),
                includeStats ? queueApi.getSessionStats(sessionId) : Promise.resolve(null)
            ]);
            setSession(sessionData);
            setStats(statsData);
            consecutiveErrorsRef.current = 0; // Reset on success
        } catch (err) {
            consecutiveErrorsRef.current += 1;
            setError(err instanceof Error ? err : new Error(String(err)));
            // Stop polling interval on persistent errors
            if (consecutiveErrorsRef.current >= 3 && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = undefined;
            }
        } finally {
            setIsLoading(false);
        }
    }, [enabled, sessionId, includeStats]);

    // Reset error counter when sessionId changes
    useEffect(() => {
        consecutiveErrorsRef.current = 0;
    }, [sessionId]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    useEffect(() => {
        if (refetchInterval && enabled && sessionId) {
            intervalRef.current = setInterval(fetch, refetchInterval);
            return () => clearInterval(intervalRef.current);
        }
    }, [refetchInterval, enabled, sessionId, fetch]);

    return {
        data: session,
        session,
        stats,
        isLoading,
        error,
        refetch: fetch
    };
}

// =====================================================
// useActiveSessionsToday - Get today's active sessions
// =====================================================

export interface UseActiveSessionsOptions {
    date?: Date | null;  // Specific date, null/undefined = today
    refetchInterval?: number;
}

export function useActiveSessionsToday(options: UseActiveSessionsOptions = {}) {
    const { date, refetchInterval = 30000 } = options; // Default 30s
    const [sessions, setSessions] = useState<QueueSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const intervalRef = useRef<NodeJS.Timeout>();

    const fetch = useCallback(async () => {
        try {
            let data: QueueSession[];
            if (date) {
                // Use specific date
                data = await queueApi.getSessionsByDate(date);
            } else {
                // Use today
                data = await queueApi.getActiveSessionsToday();
            }
            setSessions(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
    }, [date?.toISOString()]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    useEffect(() => {
        if (refetchInterval) {
            intervalRef.current = setInterval(fetch, refetchInterval);
            return () => clearInterval(intervalRef.current);
        }
    }, [refetchInterval, fetch]);

    return { sessions, isLoading, error, refetch: fetch };
}

// =====================================================
// useQueueEntries - Fetch queue entries
// =====================================================

export interface UseQueueEntriesOptions extends EntryQueryOptions {
    enabled?: boolean;
    refetchInterval?: number;
}

export interface UseQueueEntriesReturn extends UseQueryState<QueueEntry[]> {
    entries: QueueEntry[];
    waiting: QueueEntry[];
    called: QueueEntry[];
    inVisita: QueueEntry[];
    completed: QueueEntry[];
}

export function useQueueEntries(options: UseQueueEntriesOptions = {}): UseQueueEntriesReturn {
    const { enabled = true, refetchInterval, ...queryOptions } = options;
    const [data, setData] = useState<QueueEntry[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const intervalRef = useRef<NodeJS.Timeout>();

    // Don't fetch if sessionId is missing (required by backend)
    const shouldFetch = enabled && !!queryOptions.sessionId;

    const fetch = useCallback(async () => {
        if (!shouldFetch) return;
        setIsLoading(true);
        setError(null);
        try {
            const entries = await queueApi.getEntries(queryOptions);
            setData(entries);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
    }, [shouldFetch, JSON.stringify(queryOptions)]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    useEffect(() => {
        if (refetchInterval && shouldFetch) {
            intervalRef.current = setInterval(fetch, refetchInterval);
            return () => clearInterval(intervalRef.current);
        }
    }, [refetchInterval, shouldFetch, fetch]);

    // Categorized entries
    const entries = data || [];
    const waiting = entries.filter(e => e.stato === 'IN_ATTESA');
    const called = entries.filter(e => e.stato === 'CHIAMATO');
    const inVisita = entries.filter(e => e.stato === 'IN_VISITA');
    const completed = entries.filter(e => e.stato === 'COMPLETATO' || e.stato === 'NON_PRESENTATO');

    return {
        data,
        entries,
        waiting,
        called,
        inVisita,
        completed,
        isLoading,
        error,
        refetch: fetch
    };
}

// =====================================================
// useQueueDisplay - Display state for monitors
// =====================================================

export interface UseQueueDisplayOptions {
    sessionId: string;
    enabled?: boolean;
    pollingInterval?: number; // Default 3 seconds
}

export interface UseQueueDisplayReturn {
    displayState: DisplayState | null;
    currentCall: QueueCall | null;
    recentCalls: QueueCall[];
    waitingCount: number;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useQueueDisplay(options: UseQueueDisplayOptions): UseQueueDisplayReturn {
    const { sessionId, enabled = true, pollingInterval = 3000 } = options;
    const [displayState, setDisplayState] = useState<DisplayState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const intervalRef = useRef<NodeJS.Timeout>();

    const fetch = useCallback(async () => {
        if (!enabled || !sessionId) return;
        try {
            const state = await queueApi.getDisplayState(sessionId);
            setDisplayState(state);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
    }, [enabled, sessionId]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    useEffect(() => {
        if (pollingInterval && enabled && sessionId) {
            intervalRef.current = setInterval(fetch, pollingInterval);
            return () => clearInterval(intervalRef.current);
        }
    }, [pollingInterval, enabled, sessionId, fetch]);

    return {
        displayState,
        currentCall: displayState?.currentCall || null,
        recentCalls: displayState?.recentCalls || [],
        waitingCount: displayState?.waitingCount || 0,
        isLoading,
        error,
        refetch: fetch
    };
}

// =====================================================
// useQueueMutations - CRUD operations
// =====================================================

export interface UseQueueMutationsReturn {
    // Session mutations
    createSession: UseMutationState<QueueSession, CreateSessionInput>;
    updateSession: UseMutationState<QueueSession, { id: string; data: UpdateSessionInput }>;
    closeSession: UseMutationState<QueueSession, string>;
    deleteSession: UseMutationState<void, string>;
    generateFromAppointments: UseMutationState<{ created: number; entries: QueueEntry[] }, string>;
    /** P70: Genera sessioni bulk per una giornata intera */
    generateBulkDay: UseMutationState<BulkDayResult, { date: string; fascia?: 'MATTINA' | 'POMERIGGIO' | 'TUTTO' }>;
    /** P70: Scarica PDF lista pazienti sessione */
    downloadSessionPdf: UseMutationState<Blob, string>;
    // Entry mutations
    addEntry: UseMutationState<QueueEntry, CreateEntryInput>;
    updateEntryStatus: UseMutationState<QueueEntry, { id: string; data: UpdateEntryStatusInput }>;
    updateEntryPriority: UseMutationState<QueueEntry, { id: string; data: UpdateEntryPriorityInput }>;
    deleteEntry: UseMutationState<void, string>;
    // Call mutations
    callNext: UseMutationState<{ call: QueueCall; entry: QueueEntry }, { sessionId: string; ambulatorioId: string; displayedMessage?: string }>;
    callSpecific: UseMutationState<{ call: QueueCall; entry: QueueEntry }, { entryId: string; ambulatorioId: string; displayedMessage?: string; skipStatusChange?: boolean; appuntamentoId?: string }>;
    recallEntry: UseMutationState<{ call: QueueCall }, { entryId: string; message?: string }>;
    acknowledgeCall: UseMutationState<QueueCall, string>;
    markNoShow: UseMutationState<QueueEntry, string>;
    completeEntry: UseMutationState<QueueEntry, string>;
}

function useMutation<TData, TVariables>(
    mutationFn: (variables: TVariables) => Promise<TData>
): UseMutationState<TData, TVariables> {
    const [data, setData] = useState<TData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await mutationFn(variables);
            setData(result);
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [mutationFn]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
    }, []);

    return { mutate, data, isLoading, error, reset };
}

export function useQueueMutations(): UseQueueMutationsReturn {
    return {
        // Session mutations
        createSession: useMutation((data: CreateSessionInput) => queueApi.createSession(data)),
        updateSession: useMutation(({ id, data }: { id: string; data: UpdateSessionInput }) =>
            queueApi.updateSession(id, data)),
        closeSession: useMutation((id: string) => queueApi.closeSession(id)),
        deleteSession: useMutation((id: string) => queueApi.deleteSession(id)),
        generateFromAppointments: useMutation((id: string) => queueApi.generateFromAppointments(id)),
        generateBulkDay: useMutation(({ date, fascia }: { date: string; fascia?: 'MATTINA' | 'POMERIGGIO' | 'TUTTO' }) =>
            queueApi.generateBulkDay(date, fascia)),
        downloadSessionPdf: useMutation((id: string) => queueApi.getSessionPdf(id)),
        // Entry mutations
        addEntry: useMutation((data: CreateEntryInput) => queueApi.addEntry(data)),
        updateEntryStatus: useMutation(({ id, data }: { id: string; data: UpdateEntryStatusInput }) =>
            queueApi.updateEntryStatus(id, data)),
        updateEntryPriority: useMutation(({ id, data }: { id: string; data: UpdateEntryPriorityInput }) =>
            queueApi.updateEntryPriority(id, data)),
        deleteEntry: useMutation((id: string) => queueApi.deleteEntry(id)),
        // Call mutations
        callNext: useMutation(({ sessionId, ambulatorioId, displayedMessage }: { sessionId: string; ambulatorioId: string; displayedMessage?: string }) =>
            queueApi.callNext({ sessionId, ambulatorioId, displayedMessage })),
        callSpecific: useMutation(({ entryId, ambulatorioId, displayedMessage, skipStatusChange, appuntamentoId }: { entryId: string; ambulatorioId: string; displayedMessage?: string; skipStatusChange?: boolean; appuntamentoId?: string }) =>
            queueApi.callSpecific({ entryId, ambulatorioId, displayedMessage, skipStatusChange, appuntamentoId })),
        recallEntry: useMutation(({ entryId, message }: { entryId: string; message?: string }) =>
            queueApi.recallEntry(entryId, message)),
        acknowledgeCall: useMutation((callId: string) => queueApi.acknowledgeCall(callId)),
        markNoShow: useMutation((entryId: string) => queueApi.markNoShow(entryId)),
        completeEntry: useMutation((entryId: string) => queueApi.completeEntry(entryId))
    };
}

// =====================================================
// useQueueAudio - TTS and audio for calls
// =====================================================

export interface UseQueueAudioOptions {
    enabled?: boolean;
    volume?: number;
    voice?: string;
}

export interface UseQueueAudioReturn {
    speak: (text: string) => void;
    playChime: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
}

export function useQueueAudio(options: UseQueueAudioOptions = {}): UseQueueAudioReturn {
    const { enabled = true, volume = 1, voice } = options;
    const [isSpeaking, setIsSpeaking] = useState(false);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const chimeRef = useRef<HTMLAudioElement | null>(null);

    // Check if TTS is supported
    const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    useEffect(() => {
        if (isSupported) {
            synthRef.current = window.speechSynthesis;
        }
        // Preload chime audio (supports WAV and MP3)
        chimeRef.current = new Audio('/sounds/queue-chime.wav');
        chimeRef.current.volume = volume;
    }, [isSupported, volume]);

    const speak = useCallback((text: string) => {
        if (!enabled || !synthRef.current) return;

        // Cancel any ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'it-IT';
        utterance.volume = volume;

        // Find Italian voice if specified or default
        const voices = synthRef.current.getVoices();
        const italianVoice = voices.find(v =>
            v.lang.startsWith('it') && (voice ? v.name.includes(voice) : true)
        );
        if (italianVoice) {
            utterance.voice = italianVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
    }, [enabled, volume, voice]);

    const playChime = useCallback(() => {
        if (!enabled || !chimeRef.current) return;
        chimeRef.current.currentTime = 0;
        chimeRef.current.play().catch(() => {
            // Ignore autoplay errors
        });
    }, [enabled]);

    return { speak, playChime, isSpeaking, isSupported };
}

// =====================================================
// useQueueCaller - Combined hook for call desk
// =====================================================

export interface UseQueueCallerOptions {
    sessionId: string;
    enableAudio?: boolean;
    audioVolume?: number;
}

export interface UseQueueCallerReturn {
    // State
    session: QueueSession | null;
    stats: QueueSessionStats | null;
    entries: QueueEntry[];
    nextEntry: QueueEntry | null;
    isLoading: boolean;
    error: Error | null;
    // Actions
    callNext: () => Promise<void>;
    callSpecific: (entryId: string, message?: string) => Promise<void>;
    recall: (entryId: string) => Promise<void>;
    markNoShow: (entryId: string) => Promise<void>;
    complete: (entryId: string) => Promise<void>;
    startVisit: (entryId: string) => Promise<void>;
    callAndVisit: (entryId: string) => Promise<void>;
    /** Call patient from IN_VISITA (creates call record, keeps IN_VISITA status) */
    callFromVisit: (entryId: string) => Promise<void>;
    /** Recall patient from IN_VISITA (patient was already called) */
    recallFromVisit: (entryId: string) => Promise<void>;
    // Audio
    announceCall: (entry: QueueEntry) => void;
    // Refetch
    refetch: () => Promise<void>;
}

export function useQueueCaller(options: UseQueueCallerOptions): UseQueueCallerReturn {
    const { sessionId, enableAudio = true, audioVolume = 1 } = options;

    // Fetch session and stats
    const { session, stats, refetch: refetchSession, isLoading: sessionLoading, error: sessionError } =
        useQueueSession(sessionId, { refetchInterval: 5000 });

    // Fetch entries
    const { entries, waiting, refetch: refetchEntries, isLoading: entriesLoading, error: entriesError } =
        useQueueEntries({ sessionId, refetchInterval: 3000 });

    // Mutations
    const mutations = useQueueMutations();

    // Audio
    const audio = useQueueAudio({ enabled: enableAudio, volume: audioVolume });

    // Next entry to call
    const nextEntry = waiting.length > 0
        ? waiting.sort((a, b) => {
            // Priority first, then numero
            const priorityOrder = { EMERGENZA: 0, URGENTE: 1, NORMALE: 2 };
            const pA = priorityOrder[a.priorita] ?? 2;
            const pB = priorityOrder[b.priorita] ?? 2;
            if (pA !== pB) return pA - pB;
            return a.numero - b.numero;
        })[0]
        : null;

    const refetch = useCallback(async () => {
        await Promise.all([refetchSession(), refetchEntries()]);
    }, [refetchSession, refetchEntries]);

    // Announce with audio
    const announceCall = useCallback((entry: QueueEntry) => {
        if (!enableAudio) return;
        audio.playChime();
        setTimeout(() => {
            const ambulatorioName = entry.session?.ambulatorio?.nome || 'ambulatorio';
            audio.speak(`Numero ${entry.displayNumber}, prego recarsi presso ${ambulatorioName}`);
        }, 500);
    }, [enableAudio, audio]);

    // Resolve ambulatorioId from session (single or multi-ambulatorio)
    const resolveAmbulatorioId = useCallback((): string | null => {
        if (session?.ambulatorioId) return session.ambulatorioId;
        if (session?.ambulatorio?.id) return session.ambulatorio.id;
        // Multi-ambulatorio: use first ambulatorio from junction table
        if (session?.ambulatori && session.ambulatori.length > 0) {
            return session.ambulatori[0].ambulatorio.id;
        }
        return null;
    }, [session]);

    // Call next
    const callNext = useCallback(async () => {
        const ambulatorioId = resolveAmbulatorioId();
        if (!ambulatorioId) {
            throw new Error('Nessun ambulatorio associato alla sessione');
        }
        const result = await mutations.callNext.mutate({ sessionId, ambulatorioId });
        announceCall(result.entry);
        await refetch();
    }, [sessionId, resolveAmbulatorioId, mutations.callNext, announceCall, refetch]);

    // Call specific
    const callSpecific = useCallback(async (entryId: string, displayedMessage?: string) => {
        const ambulatorioId = resolveAmbulatorioId();
        if (!ambulatorioId) {
            throw new Error('Nessun ambulatorio associato alla sessione');
        }
        // Pass appuntamentoId for robust fallback when entryId is stale
        const entry = entries.find(e => e.id === entryId);
        const appuntamentoId = entry?.appuntamentoId;
        const result = await mutations.callSpecific.mutate({ entryId, ambulatorioId, displayedMessage, appuntamentoId });
        announceCall(result.entry);
        await refetch();
    }, [resolveAmbulatorioId, entries, mutations.callSpecific, announceCall, refetch]);

    // Recall
    const recall = useCallback(async (entryId: string) => {
        const entry = entries.find(e => e.id === entryId);
        await mutations.recallEntry.mutate({ entryId });
        if (entry) announceCall(entry);
        await refetch();
    }, [entries, mutations.recallEntry, announceCall, refetch]);

    // Mark no show
    const markNoShow = useCallback(async (entryId: string) => {
        await mutations.markNoShow.mutate(entryId);
        await refetch();
    }, [mutations.markNoShow, refetch]);

    // Complete
    const complete = useCallback(async (entryId: string) => {
        await mutations.completeEntry.mutate(entryId);
        await refetch();
    }, [mutations.completeEntry, refetch]);

    // Start visit directly (skip calling)
    const startVisit = useCallback(async (entryId: string) => {
        await mutations.updateEntryStatus.mutate({ id: entryId, data: { stato: 'IN_VISITA' as StatoChiamata } });
        await refetch();
    }, [mutations.updateEntryStatus, refetch]);

    // Call patient and then start visit
    const callAndVisit = useCallback(async (entryId: string) => {
        const ambulatorioId = resolveAmbulatorioId();
        if (!ambulatorioId) {
            throw new Error('Nessun ambulatorio associato alla sessione');
        }
        // Pass appuntamentoId for robust fallback when entryId is stale
        const entry = entries.find(e => e.id === entryId);
        const appuntamentoId = entry?.appuntamentoId;
        const result = await mutations.callSpecific.mutate({ entryId, ambulatorioId, appuntamentoId });
        announceCall(result.entry);
        // Transition to IN_VISITA after calling - use the resolved entry ID from backend
        const resolvedEntryId = result.entry?.id || entryId;
        await mutations.updateEntryStatus.mutate({ id: resolvedEntryId, data: { stato: 'IN_VISITA' as StatoChiamata } });
        await refetch();
    }, [resolveAmbulatorioId, entries, mutations.callSpecific, mutations.updateEntryStatus, announceCall, refetch]);

    // Call patient from IN_VISITA state (creates call + audio but keeps IN_VISITA status)
    const callFromVisit = useCallback(async (entryId: string) => {
        const ambulatorioId = resolveAmbulatorioId();
        if (!ambulatorioId) {
            throw new Error('Nessun ambulatorio associato alla sessione');
        }
        // Pass appuntamentoId for robust fallback when entryId is stale
        const entry = entries.find(e => e.id === entryId);
        const appuntamentoId = entry?.appuntamentoId;
        const result = await mutations.callSpecific.mutate({ entryId, ambulatorioId, skipStatusChange: true, appuntamentoId });
        announceCall(result.entry);
        await refetch();
    }, [resolveAmbulatorioId, entries, mutations.callSpecific, announceCall, refetch]);

    // Recall patient from IN_VISITA state (patient was already called before)
    const recallFromVisit = useCallback(async (entryId: string) => {
        const entry = entries.find(e => e.id === entryId);
        await mutations.recallEntry.mutate({ entryId });
        if (entry) announceCall(entry);
        await refetch();
    }, [entries, mutations.recallEntry, announceCall, refetch]);

    return {
        session,
        stats,
        entries,
        nextEntry,
        isLoading: sessionLoading || entriesLoading,
        error: sessionError || entriesError,
        callNext,
        callSpecific,
        recall,
        markNoShow,
        complete,
        startVisit,
        callAndVisit,
        callFromVisit,
        recallFromVisit,
        announceCall,
        refetch
    };
}

// =====================================================
// EXPORTS
// =====================================================

export {
    queueApi
};
