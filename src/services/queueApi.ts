/**
 * Queue API Service
 * Centralized API client for ElementMedica Queue Calling System (P53)
 * 
 * Provides typed methods for queue management:
 * - Sessions (gestione sessioni coda giornaliere)
 * - Entries (gestione numeri in coda)
 * - Calls (chiamata pazienti)
 * - Display (stato display sala d'attesa)
 * 
 * @module services/queueApi
 */

import { apiGet, apiPost, apiPut, apiDelete, apiDownload } from './api';
import { toISODateString } from '../utils/dateUtils';

// Base URL for queue endpoints
const QUEUE_BASE = '/api/v1/clinica/queue';

// =====================================================
// TYPES
// =====================================================

// API Response wrapper type
interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    message?: string;
}

// Paginated list response type
interface ApiListResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Helper per estrarre dati dalla risposta wrapper
const extractData = <T>(response: ApiResponse<T>): T => {
    if (response && typeof response === 'object' && 'data' in response) {
        return response.data;
    }
    return response as unknown as T;
};

// =====================================================
// P70 BULK-DAY RESULT TYPE
// =====================================================

export interface BulkDayResult {
    created: number;
    skipped: number;
    errors: number;
    sessions: QueueSession[];
    message?: string;
}

// Prisma Enums
export type QueueMode = 'DISPLAY' | 'MOBILE';
export type StatoChiamata = 'IN_ATTESA' | 'CHIAMATO' | 'IN_VISITA' | 'COMPLETATO' | 'NON_PRESENTATO' | 'ANNULLATO';
export type PrioritaChiamata = 'NORMALE' | 'URGENTE' | 'EMERGENZA';

// =====================================================
// SESSION TYPES
// =====================================================

// Patient access mode for MOBILE sessions
export type PatientAccessMode = 'ONLY_BOOKED' | 'ONLY_WALKIN' | 'BOTH';

export interface QueueSessionConfig {
    autoCallEnabled?: boolean;
    callInterval?: number; // seconds
    displayDuration?: number; // seconds
    maxWaitTimeMinutes?: number;
    ttsEnabled?: boolean;
    ttsVoice?: string;
    ttsVolume?: number;
    // MOBILE mode specific options
    orderByArrival?: boolean; // Riordina coda in base all'ordine di check-in
    patientAccessMode?: PatientAccessMode; // Chi può accedere alla coda
    autoGenerateFromAppointments?: boolean;
    // P69: Prestazione erogata per walk-in → appuntamento automatico
    prestazioneId?: string;       // ID prestazione per walk-in
    prestazioneNome?: string;     // Nome prestazione (display cache)
    durataMinutiDefault?: number; // Durata default minuti (override prestazione.durataPrevista)
    /** Campi anagrafica richiesti per walk-in (es. ['cognome', 'nome', 'taxCode', 'birthDate']) */
    requiredPatientFields?: string[];
    /** P53: Questionario da presentare dopo prenotazione in coda */
    questionarioTemplateId?: string | null;
    questionarioTemplateNome?: string | null;
    /** 'ALL' = tutti i pazienti, 'SORVEGLIANZA' = solo chi ha protocollo, 'DISABLED' = nessuno */
    questionarioMode?: 'ALL' | 'SORVEGLIANZA' | 'DISABLED';
    /** Convenzione da applicare a tutti i walk-in della sessione */
    convenzioneId?: string | null;
    convenzioneNome?: string | null;
    /** Codice sconto da applicare a tutti i walk-in della sessione */
    codiceSconto?: string | null;
}

export interface QueueSession {
    id: string;
    tenantId: string;
    date: string;
    ambulatorioId?: string | null;
    mode: QueueMode;
    config: QueueSessionConfig;
    qrCodeToken?: string;
    qrCodeUrl?: string;
    isActive: boolean;
    currentNumber: number;
    startedAt?: string;
    endedAt?: string;
    createdAt: string;
    updatedAt: string;
    /** P54: ID slot disponibilità per sessioni per-slot (rinominato da disponibilitaMedicoId) */
    slotDisponibilitaId?: string | null;
    ambulatorio?: {
        id: string;
        nome: string;
        codice: string;
    };
    /** P53.2: Multi-ambulatorio */
    ambulatori?: Array<{
        ambulatorio: {
            id: string;
            codice: string;
            nome: string;
        };
    }>;
    /** P53.2: Multi-medico */
    medici?: Array<{
        medicoId: string;
        medico: {
            personId: string;
            person: {
                firstName: string;
                lastName: string;
                gender?: string;
            };
        };
    }>;
    _count?: {
        entries: number;
        calls: number;
    };
}

export interface QueueSessionStats {
    totalEntries: number;
    inAttesa: number;
    chiamati: number;
    inVisita: number;
    completati: number;
    nonPresentati: number;
    avgWaitTime: number | null;
    currentNumber: number;
}

export interface CreateSessionInput {
    ambulatorioId: string;
    mode: QueueMode;
    date?: string;
    config?: QueueSessionConfig;
    // MOBILE mode specific
    ambulatorioIds?: string[];  // Multi-ambulatorio per MOBILE
    mediciIds?: string[];       // Multi-medico per MOBILE
    slotDisponibilitaId?: string;  // P54: rinominato
}

export interface UpdateSessionInput {
    mode?: QueueMode;
    config?: QueueSessionConfig;
    isActive?: boolean;
}

// =====================================================
// ENTRY TYPES (NumeroChiamata)
// =====================================================

export interface QueueEntry {
    id: string;
    tenantId: string;
    sessionId: string;
    appuntamentoId?: string;
    personTenantProfileId?: string;
    numero: number;
    displayNumber: string;
    siglaAmbulatorio: string;
    stato: StatoChiamata;
    priorita: PrioritaChiamata;
    walkInData?: {
        nome?: string;
        cognome?: string;
        firstName?: string;
        lastName?: string;
        displayedName?: string;
        telefono?: string;
        phone?: string;
        note?: string;
    };
    pushToken?: string;
    notifiedAt?: string;
    oraPrevista?: string;
    oraChiamata?: string;
    oraCompletamento?: string;
    stimaAttesa?: number;
    note?: string;
    createdAt: string;
    updatedAt: string;
    // P61: Patient name pre-computed by backend
    patientName?: string;
    prestazioneNome?: string;
    // Relations
    appuntamento?: {
        id: string;
        dataOra: string;
        prestazioneNome?: string;
        durataMinuti?: number;
    };
    personTenantProfile?: {
        id: string;
        email?: string | null;
        phone?: string | null;
        person: {
            id?: string;
            firstName: string;
            lastName: string;
        };
    };
    session?: QueueSession;
    lastCall?: QueueCall;
}

export interface CreateEntryInput {
    sessionId: string;
    appuntamentoId?: string;
    personTenantProfileId?: string;
    priorita?: PrioritaChiamata;
    oraPrevista?: string;
    note?: string;
    walkInData?: {
        nome?: string;
        cognome?: string;
        telefono?: string;
        note?: string;
    };
}

export interface UpdateEntryStatusInput {
    stato: StatoChiamata;
    note?: string;
}

export interface UpdateEntryPriorityInput {
    priorita: PrioritaChiamata;
    note?: string;
}

// =====================================================
// CALL TYPES
// =====================================================

export interface QueueCall {
    id: string;
    sessionId: string;
    numeroChiamataId: string;
    calledByPersonId: string;
    ambulatorioId: string;
    siglaAmbulatorio: string;
    displayedNumber: string;
    displayedMessage?: string;
    calledAt: string;
    acknowledgedAt?: string;
    createdAt: string;
    // Relations
    session?: QueueSession;
    numeroChiamata?: QueueEntry;
    calledByPerson?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    ambulatorio?: {
        id: string;
        nome: string;
        codice: string;
    };
}

export interface CallNextInput {
    sessionId: string;
    ambulatorioId: string;
    displayedMessage?: string;
}

export interface CallSpecificInput {
    entryId: string;
    ambulatorioId: string;
    displayedMessage?: string;
    skipStatusChange?: boolean;
    appuntamentoId?: string;
}

export interface DisplayState {
    session: QueueSession;
    currentCall?: QueueCall;
    recentCalls: QueueCall[];
    waitingCount: number;
    lastUpdate: string;
}

// =====================================================
// QUERY OPTIONS
// =====================================================

export interface SessionQueryOptions {
    ambulatorioId?: string;
    date?: string;
    isActive?: boolean;
    mode?: QueueMode;
    page?: number;
    limit?: number;
}

export interface EntryQueryOptions {
    sessionId?: string;
    stato?: StatoChiamata;
    priorita?: PrioritaChiamata;
    page?: number;
    limit?: number;
}

// =====================================================
// API FUNCTIONS - SESSIONS
// =====================================================

/**
 * Get all queue sessions with optional filters
 */
export const getSessions = async (options: SessionQueryOptions = {}): Promise<QueueSession[]> => {
    const params = new URLSearchParams();
    if (options.ambulatorioId) params.append('ambulatorioId', options.ambulatorioId);
    if (options.date) params.append('date', options.date);
    if (options.isActive !== undefined) params.append('isActive', String(options.isActive));
    if (options.mode) params.append('mode', options.mode);
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));

    const queryString = params.toString();
    const url = `${QUEUE_BASE}/sessions${queryString ? `?${queryString}` : ''}`;
    const response = await apiGet<ApiResponse<QueueSession[]>>(url);
    return extractData(response);
};

/**
 * Get a single session by ID
 */
export const getSession = async (id: string): Promise<QueueSession> => {
    const response = await apiGet<ApiResponse<QueueSession>>(`${QUEUE_BASE}/sessions/${id}`);
    return extractData(response);
};

/**
 * Get session by QR token (for mobile mode)
 * NOTE: Backend endpoint to be implemented
 */
export const getSessionByToken = async (token: string): Promise<QueueSession> => {
    // TODO: Implement when backend supports /sessions/token/:token endpoint
    const response = await apiGet<ApiResponse<QueueSession>>(`${QUEUE_BASE}/sessions/by-token/${token}`);
    return extractData(response);
};

/**
 * Get session statistics
 */
export const getSessionStats = async (id: string): Promise<QueueSessionStats> => {
    const response = await apiGet<ApiResponse<QueueSessionStats>>(`${QUEUE_BASE}/sessions/${id}/stats`);
    return extractData(response);
};

/**
 * Get active sessions for today (both DISPLAY and MOBILE modes)
 * Uses the /sessions endpoint with date and isActive filters
 */
export const getActiveSessionsToday = async (): Promise<QueueSession[]> => {
    // Get today's date in YYYY-MM-DD format (using toISODateString to avoid timezone issues)
    const today = toISODateString(new Date());
    return getSessionsByDate(today);
};

/**
 * Get sessions for a specific date
 * @param date - Date in YYYY-MM-DD format or Date object
 * @param options - Optional filters (isActive, limit)
 */
export const getSessionsByDate = async (
    date: string | Date,
    options: { isActive?: boolean; limit?: number } = {}
): Promise<QueueSession[]> => {
    // Convert Date to string if needed
    const dateStr = date instanceof Date ? toISODateString(date) : date;
    const { isActive = true, limit = 100 } = options;

    // Use the generic sessions endpoint with filters
    const params = new URLSearchParams({
        date: dateStr,
        ...(isActive !== undefined && { isActive: String(isActive) }),
        limit: String(limit)
    });

    const url = `${QUEUE_BASE}/sessions?${params.toString()}`;
    const response = await apiGet<ApiResponse<QueueSession[]> | ApiListResponse<QueueSession>>(url);

    // Handle both paginated response { data: [], pagination: {} } and direct array
    if ('data' in response && Array.isArray(response.data)) {
        return response.data;
    }

    // Handle direct array (API response format may vary)
    if (Array.isArray(response)) {
        return response;
    }

    return [];
};

/**
 * Check if a session already exists for given date/ambulatorio/mode
 */
export interface CheckExistingResult {
    exists: boolean;
    session: {
        id: string;
        date: string;
        mode: QueueMode;
        isActive: boolean;
        ambulatorio: { id: string; nome: string; codice: string } | null;
        currentNumber: number;
        entriesCount: number;
    } | null;
}

export const checkExistingSession = async (data: {
    date: string;
    ambulatorioId?: string;
    mode: QueueMode;
    slotDisponibilitaId?: string;  // P54: rinominato
    medicoPersonId?: string;       // Fallback multi-medico
}): Promise<CheckExistingResult> => {
    const response = await apiPost<ApiResponse<CheckExistingResult>>(`${QUEUE_BASE}/sessions/check-existing`, data);
    return extractData(response);
};

/**
 * Find sessions for the same medico on the same day (different slots)
 */
export interface SameDaySession {
    id: string;
    mode: QueueMode;
    qrCodeToken?: string;
    slotDisponibilita?: { id: string; oraInizio: string; oraFine: string } | null;
    ambulatorio?: { id: string; nome: string } | null;
    entriesCount: number;
}

export const findSameDaySessions = async (data: {
    date: string;
    medicoPersonId: string;
    excludeSlotId?: string;
}): Promise<SameDaySession[]> => {
    const response = await apiPost<ApiResponse<SameDaySession[]>>(`${QUEUE_BASE}/sessions/same-day`, data);
    return extractData(response);
};

/**
 * Link an additional slot to an existing session (merge morning/afternoon)
 */
export const linkSlotToSession = async (sessionId: string, slotDisponibilitaId: string): Promise<any> => {
    const response = await apiPost<ApiResponse<any>>(`${QUEUE_BASE}/sessions/${sessionId}/link-slot`, { slotDisponibilitaId });
    return extractData(response);
};

/**
 * Create a new queue session
 */
export const createSession = async (data: CreateSessionInput): Promise<QueueSession> => {
    const response = await apiPost<ApiResponse<QueueSession>>(`${QUEUE_BASE}/sessions`, data);
    return extractData(response);
};

/**
 * Generate session entries from scheduled appointments
 */
export const generateFromAppointments = async (id: string): Promise<{ created: number; entries: QueueEntry[] }> => {
    const response = await apiPost<ApiResponse<{ created: number; entries: QueueEntry[] }>>(`${QUEUE_BASE}/sessions/${id}/generate`, {});
    return extractData(response);
};

/**
 * Update a session
 */
export const updateSession = async (id: string, data: UpdateSessionInput): Promise<QueueSession> => {
    const response = await apiPut<ApiResponse<QueueSession>>(`${QUEUE_BASE}/sessions/${id}`, data);
    return extractData(response);
};

/**
 * Close a session
 */
export const closeSession = async (id: string): Promise<QueueSession> => {
    const response = await apiPost<ApiResponse<QueueSession>>(`${QUEUE_BASE}/sessions/${id}/close`, {});
    return extractData(response);
};

/**
 * Delete a session
 */
export const deleteSession = async (id: string): Promise<void> => {
    await apiDelete(`${QUEUE_BASE}/sessions/${id}`);
};

/**
 * P70: Genera tutte le sessioni coda di una giornata partendo dagli appuntamenti
 * @param date - Data in formato YYYY-MM-DD
 * @param fascia - Fascia oraria da processare (default: 'TUTTO')
 */
export const generateBulkDay = async (
    date: string,
    fascia: 'MATTINA' | 'POMERIGGIO' | 'TUTTO' = 'TUTTO'
): Promise<BulkDayResult> => {
    const response = await apiPost<ApiResponse<BulkDayResult>>(
        `${QUEUE_BASE}/sessions/bulk-day`,
        { date, fascia }
    );
    return extractData(response);
};

/**
 * P70: Scarica il PDF lista pazienti di una sessione coda
 * @param sessionId - ID della sessione
 * @returns Blob PDF pronto per il download
 */
export const getSessionPdf = async (sessionId: string): Promise<Blob> => {
    return apiDownload(`${QUEUE_BASE}/sessions/${sessionId}/pdf`);
};

// =====================================================
// API FUNCTIONS - SESSION MEDICI (ASSOCIA MEDICO)
// =====================================================

export interface AvailableMedico {
    personId: string;
    firstName: string;
    lastName: string;
    gender?: string;
    slots: Array<{ id: string; oraInizio: string; oraFine: string; ambulatorioId?: string }>;
    ambulatori: Array<{ id: string; nome: string; codice: string }>;
}

export interface SessionMedicoRecord {
    id: string;
    sessionId: string;
    medicoId: string;
    ordine: number;
    isPrimary: boolean;
    medico: {
        id: string;
        personId: string;
        person: {
            firstName: string;
            lastName: string;
            gender?: string;
        };
    };
}

/**
 * Aggiunge un medico alla sessione coda
 * @param sessionId - ID sessione
 * @param medicoId - Person.id del medico
 */
export const addSessionMedico = async (sessionId: string, medicoId: string): Promise<SessionMedicoRecord> => {
    const response = await apiPost<ApiResponse<SessionMedicoRecord>>(
        `${QUEUE_BASE}/sessions/${sessionId}/medici`,
        { medicoId }
    );
    return extractData(response);
};

/**
 * Rimuove un medico dalla sessione coda
 * @param sessionId - ID sessione
 * @param medicoId - PersonTenantProfile.id del medico
 */
export const removeSessionMedico = async (sessionId: string, medicoId: string): Promise<void> => {
    await apiDelete(`${QUEUE_BASE}/sessions/${sessionId}/medici/${medicoId}`);
};

/**
 * Recupera medici disponibili da associare alla sessione
 * @param sessionId - ID sessione
 * @param date - Data (ISO string YYYY-MM-DD)
 */
export const getAvailableMedici = async (sessionId: string, date: string): Promise<AvailableMedico[]> => {
    const response = await apiGet<ApiResponse<AvailableMedico[]>>(
        `${QUEUE_BASE}/sessions/${sessionId}/available-medici?date=${date}`
    );
    return extractData(response);
};

// =====================================================
// API FUNCTIONS - ENTRIES
// =====================================================

/**
 * Get all queue entries with optional filters
 */
export const getEntries = async (options: EntryQueryOptions = {}): Promise<QueueEntry[]> => {
    const params = new URLSearchParams();
    if (options.sessionId) params.append('sessionId', options.sessionId);
    if (options.stato) params.append('stato', options.stato);
    if (options.priorita) params.append('priorita', options.priorita);
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));

    const queryString = params.toString();
    const url = `${QUEUE_BASE}/entries${queryString ? `?${queryString}` : ''}`;
    const response = await apiGet<ApiResponse<QueueEntry[]>>(url);
    return extractData(response);
};

/**
 * Get a single entry by ID
 */
export const getEntry = async (id: string): Promise<QueueEntry> => {
    const response = await apiGet<ApiResponse<QueueEntry>>(`${QUEUE_BASE}/entries/${id}`);
    return extractData(response);
};

/**
 * Get entry position in queue
 */
export const getEntryPosition = async (id: string): Promise<{ position: number; ahead: number; estimatedWait: number | null }> => {
    const response = await apiGet<ApiResponse<{ position: number; ahead: number; estimatedWait: number | null }>>(`${QUEUE_BASE}/entries/${id}/position`);
    return extractData(response);
};

/**
 * Get next entry to call (preview)
 */
export const getNextEntry = async (sessionId: string): Promise<QueueEntry | null> => {
    const response = await apiGet<ApiResponse<QueueEntry | null>>(`${QUEUE_BASE}/entries/next?sessionId=${sessionId}`);
    return extractData(response);
};

/**
 * Add a new entry to the queue
 */
export const addEntry = async (data: CreateEntryInput): Promise<QueueEntry> => {
    const response = await apiPost<ApiResponse<QueueEntry>>(`${QUEUE_BASE}/entries`, data);
    return extractData(response);
};

/**
 * Update entry status
 */
export const updateEntryStatus = async (id: string, data: UpdateEntryStatusInput): Promise<QueueEntry> => {
    const response = await apiPut<ApiResponse<QueueEntry>>(`${QUEUE_BASE}/entries/${id}/status`, data);
    return extractData(response);
};

/**
 * Update entry priority
 */
export const updateEntryPriority = async (id: string, data: UpdateEntryPriorityInput): Promise<QueueEntry> => {
    const response = await apiPut<ApiResponse<QueueEntry>>(`${QUEUE_BASE}/entries/${id}/priority`, data);
    return extractData(response);
};

/**
 * Delete an entry
 */
export const deleteEntry = async (id: string): Promise<void> => {
    await apiDelete(`${QUEUE_BASE}/entries/${id}`);
};

// =====================================================
// API FUNCTIONS - CALLS
// =====================================================

/**
 * Call the next patient in queue
 */
export const callNext = async (data: CallNextInput): Promise<{ call: QueueCall; entry: QueueEntry }> => {
    const response = await apiPost<ApiResponse<{ call: QueueCall; entry: QueueEntry }>>(`${QUEUE_BASE}/call/next`, data);
    return extractData(response);
};

/**
 * Call a specific patient
 */
export const callSpecific = async (data: CallSpecificInput): Promise<{ call: QueueCall; entry: QueueEntry }> => {
    const response = await apiPost<ApiResponse<{ call: QueueCall; entry: QueueEntry }>>(`${QUEUE_BASE}/call/specific`, data);
    return extractData(response);
};

/**
 * Recall a patient (repeat the call)
 */
export const recallEntry = async (entryId: string, message?: string): Promise<{ call: QueueCall }> => {
    const response = await apiPost<ApiResponse<{ call: QueueCall }>>(`${QUEUE_BASE}/call/${entryId}/recall`, { message });
    return extractData(response);
};

/**
 * Acknowledge a call (patient arrived)
 */
export const acknowledgeCall = async (callId: string): Promise<QueueCall> => {
    const response = await apiPost<ApiResponse<QueueCall>>(`${QUEUE_BASE}/call/${callId}/acknowledge`, {});
    return extractData(response);
};

/**
 * Mark patient as no-show
 */
export const markNoShow = async (entryId: string): Promise<QueueEntry> => {
    const response = await apiPost<ApiResponse<QueueEntry>>(`${QUEUE_BASE}/entries/${entryId}/no-show`, {});
    return extractData(response);
};

/**
 * Complete entry (visit finished)
 */
export const completeEntry = async (entryId: string): Promise<QueueEntry> => {
    const response = await apiPost<ApiResponse<QueueEntry>>(`${QUEUE_BASE}/entries/${entryId}/complete`, {});
    return extractData(response);
};

// =====================================================
// API FUNCTIONS - DISPLAY
// =====================================================

/**
 * Get display state for waiting room monitor
 */
export const getDisplayState = async (sessionId: string): Promise<DisplayState> => {
    const response = await apiGet<ApiResponse<DisplayState>>(`${QUEUE_BASE}/display/${sessionId}`);
    return extractData(response);
};

/**
 * Get call history for display
 */
export const getDisplayHistory = async (sessionId: string, limit: number = 5): Promise<QueueCall[]> => {
    const response = await apiGet<ApiResponse<QueueCall[]>>(`${QUEUE_BASE}/display/${sessionId}/history?limit=${limit}`);
    return extractData(response);
};

/**
 * Get calls for a specific ambulatorio
 */
export const getAmbulatoriosCalls = async (ambulatorioId: string): Promise<QueueCall[]> => {
    const response = await apiGet<ApiResponse<QueueCall[]>>(`${QUEUE_BASE}/ambulatorio/${ambulatorioId}/calls`);
    return extractData(response);
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format display number from sigla and numero
 */
export const formatDisplayNumber = (sigla: string, numero: number): string => {
    return `${sigla}-${String(numero).padStart(2, '0')}`;
};

/**
 * Parse display number into sigla and numero
 */
export const parseDisplayNumber = (displayNumber: string): { sigla: string; numero: number } | null => {
    const match = displayNumber.match(/^([A-Z0-9]+)-(\d+)$/);
    if (!match) return null;
    return {
        sigla: match[1],
        numero: parseInt(match[2], 10)
    };
};

/**
 * Get stato label in Italian
 */
export const getStatoLabel = (stato: StatoChiamata): string => {
    const labels: Record<StatoChiamata, string> = {
        'IN_ATTESA': 'In Attesa',
        'CHIAMATO': 'Chiamato',
        'IN_VISITA': 'In Visita',
        'COMPLETATO': 'Completato',
        'NON_PRESENTATO': 'Non Presentato',
        'ANNULLATO': 'Annullato'
    };
    return labels[stato] || stato;
};

/**
 * Get priorita label in Italian
 */
export const getPrioritaLabel = (priorita: PrioritaChiamata): string => {
    const labels: Record<PrioritaChiamata, string> = {
        'NORMALE': 'Normale',
        'URGENTE': 'Urgente',
        'EMERGENZA': 'Emergenza'
    };
    return labels[priorita] || priorita;
};

/**
 * Get stato color for UI
 */
export const getStatoColor = (stato: StatoChiamata): string => {
    const colors: Record<StatoChiamata, string> = {
        'IN_ATTESA': 'bg-yellow-100 text-yellow-800',
        'CHIAMATO': 'bg-blue-100 text-blue-800',
        'IN_VISITA': 'bg-green-100 text-green-800',
        'COMPLETATO': 'bg-gray-100 text-gray-800',
        'NON_PRESENTATO': 'bg-red-100 text-red-800',
        'ANNULLATO': 'bg-gray-100 text-gray-500'
    };
    return colors[stato] || 'bg-gray-100 text-gray-800';
};

/**
 * Get priorita color for UI
 */
export const getPrioritaColor = (priorita: PrioritaChiamata): string => {
    const colors: Record<PrioritaChiamata, string> = {
        'NORMALE': 'bg-gray-100 text-gray-800',
        'URGENTE': 'bg-orange-100 text-orange-800',
        'EMERGENZA': 'bg-red-100 text-red-800'
    };
    return colors[priorita] || 'bg-gray-100 text-gray-800';
};

/**
 * Format wait time in human readable format
 */
export const formatWaitTime = (minutes: number | null): string => {
    if (minutes === null || minutes === undefined) return '-';
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
};

// =====================================================
// DISPLAY MONITOR TYPES (P53.3)
// =====================================================

export interface MonitorConfig {
    theme?: 'light' | 'dark';
    fontSize?: number;
    showRecentCalls?: boolean;
    recentCallsCount?: number;
    enableAudio?: boolean;
    audioType?: 'beep' | 'tts' | 'both';
    showMarquee?: boolean;
    marqueeText?: string;
    backgroundColor?: string;
}

export interface DisplayMonitor {
    id: string;
    tenantId: string;
    nome: string;
    codice: string;
    descrizione?: string;
    poliambulatorioId?: string;
    poliambulatorio?: {
        id: string;
        nome: string;
    };
    config: MonitorConfig;
    isActive: boolean;
    accessToken?: string;
    accessUrl?: string;
    ambulatori: {
        id: string;
        nome: string;
        codice: string;
        specializzazione?: string;
        stato?: string;
        ordine: number;
    }[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateMonitorInput {
    nome: string;
    codice: string;
    descrizione?: string;
    poliambulatorioId?: string;
    config?: MonitorConfig;
    ambulatoriIds?: string[];
}

export interface UpdateMonitorInput {
    nome?: string;
    codice?: string;
    descrizione?: string;
    poliambulatorioId?: string;
    config?: MonitorConfig;
    isActive?: boolean;
    ambulatoriIds?: string[];
}

export interface MonitorDisplayState {
    monitor: DisplayMonitor;
    currentCall: QueueCall | null;
    recentCalls: QueueCall[];
    waitingCount: number;
    ambulatoriIds: string[];
}

// =====================================================
// MONITOR API FUNCTIONS
// =====================================================

/**
 * Get all display monitors
 */
export const getMonitors = async (params?: {
    poliambulatorioId?: string;
    activeOnly?: boolean
}): Promise<DisplayMonitor[]> => {
    const queryParams = new URLSearchParams();
    if (params?.poliambulatorioId) queryParams.set('poliambulatorioId', params.poliambulatorioId);
    if (params?.activeOnly !== undefined) queryParams.set('activeOnly', String(params.activeOnly));

    const query = queryParams.toString();
    const response = await apiGet<ApiResponse<DisplayMonitor[]>>(
        `${QUEUE_BASE}/monitors${query ? `?${query}` : ''}`
    );
    return extractData(response);
};

/**
 * Get a single display monitor by ID
 */
export const getMonitor = async (id: string): Promise<DisplayMonitor> => {
    const response = await apiGet<ApiResponse<DisplayMonitor>>(`${QUEUE_BASE}/monitors/${id}`);
    return extractData(response);
};

/**
 * Create a new display monitor
 */
export const createMonitor = async (data: CreateMonitorInput): Promise<DisplayMonitor> => {
    const response = await apiPost<ApiResponse<DisplayMonitor>>(`${QUEUE_BASE}/monitors`, data);
    return extractData(response);
};

/**
 * Update a display monitor
 */
export const updateMonitor = async (id: string, data: UpdateMonitorInput): Promise<DisplayMonitor> => {
    const response = await apiPut<ApiResponse<DisplayMonitor>>(`${QUEUE_BASE}/monitors/${id}`, data);
    return extractData(response);
};

/**
 * Delete a display monitor
 */
export const deleteMonitor = async (id: string): Promise<void> => {
    await apiDelete(`${QUEUE_BASE}/monitors/${id}`);
};

/**
 * Regenerate access token for a monitor
 */
export const regenerateMonitorToken = async (id: string): Promise<DisplayMonitor> => {
    const response = await apiPost<ApiResponse<DisplayMonitor>>(`${QUEUE_BASE}/monitors/${id}/regenerate-token`, {});
    return extractData(response);
};

/**
 * Get display state for a monitor
 */
export const getMonitorDisplayState = async (id: string): Promise<MonitorDisplayState> => {
    const response = await apiGet<ApiResponse<MonitorDisplayState>>(`${QUEUE_BASE}/monitors/${id}/display`);
    return extractData(response);
};

/**
 * Get recent calls for a monitor
 */
export const getMonitorCalls = async (id: string, limit?: number): Promise<QueueCall[]> => {
    const query = limit ? `?limit=${limit}` : '';
    const response = await apiGet<ApiResponse<QueueCall[]>>(`${QUEUE_BASE}/monitors/${id}/calls${query}`);
    return extractData(response);
};

/**
 * Get public monitor display state (no auth required)
 */
export const getPublicMonitorDisplay = async (accessToken: string): Promise<MonitorDisplayState> => {
    const response = await apiGet<ApiResponse<MonitorDisplayState>>(
        `/api/v1/public/queue/display/${accessToken}`
    );
    return extractData(response);
};

/**
 * Get public monitor display state (polling endpoint)
 */
export const getPublicMonitorState = async (accessToken: string): Promise<{
    currentCall: QueueCall | null;
    recentCalls: QueueCall[];
    waitingCount: number;
    timestamp: string;
}> => {
    const response = await apiGet<ApiResponse<{
        currentCall: QueueCall | null;
        recentCalls: QueueCall[];
        waitingCount: number;
        timestamp: string;
    }>>(`/api/v1/public/queue/display/${accessToken}/state`);
    return extractData(response);
};

// =====================================================
// DEFAULT EXPORT
// =====================================================

const queueApi = {
    // Sessions
    getSessions,
    getSession,
    getSessionByToken,
    getSessionStats,
    getActiveSessionsToday,
    getSessionsByDate,
    checkExistingSession,
    findSameDaySessions,
    linkSlotToSession,
    createSession,
    generateFromAppointments,
    generateBulkDay,
    updateSession,
    closeSession,
    deleteSession,
    getSessionPdf,
    // Session Medici (Associa Medico)
    addSessionMedico,
    removeSessionMedico,
    getAvailableMedici,
    // Entries
    getEntries,
    getEntry,
    getEntryPosition,
    getNextEntry,
    addEntry,
    updateEntryStatus,
    updateEntryPriority,
    deleteEntry,
    // Calls
    callNext,
    callSpecific,
    recallEntry,
    acknowledgeCall,
    markNoShow,
    completeEntry,
    // Display
    getDisplayState,
    getDisplayHistory,
    getAmbulatoriosCalls,
    // Monitors (P53.3)
    getMonitors,
    getMonitor,
    createMonitor,
    updateMonitor,
    deleteMonitor,
    regenerateMonitorToken,
    getMonitorDisplayState,
    getMonitorCalls,
    getPublicMonitorDisplay,
    getPublicMonitorState,
    // Utilities
    formatDisplayNumber,
    parseDisplayNumber,
    getStatoLabel,
    getPrioritaLabel,
    getStatoColor,
    getPrioritaColor,
    formatWaitTime
};

export default queueApi;
