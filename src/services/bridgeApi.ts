/**
 * Medical Device Bridge API Service
 * 
 * Frontend service for communicating with:
 * 1. The webapp backend (for CRUD on EsameStrumentale)
 * 2. The local Bridge server (for starting exams directly)
 * 
 * @module services/bridgeApi
 * @version 1.0.0
 */

import axios from 'axios';
import { apiGet, apiPost, apiDelete, apiDeleteWithPayload, apiDownload } from './api';

// ============================================
// TYPES
// ============================================

export type TipoDispositivoMedico = 'ECG' | 'SPIROMETRO' | 'AUDIOMETRO' | 'VISIOTEST';
export type TipoEsame = 'ecg' | 'spirometria' | 'audiometria' | 'visiotest';
export type StatoEsameStrumentale = 'IN_ATTESA' | 'COMPLETATO' | 'PARZIALE' | 'ERRORE' | 'TIMEOUT';

export interface EsameStrumentale {
    id: string;
    visitaId: string;
    pazienteId: string;
    medicoId: string;
    tipoDispositivo: TipoDispositivoMedico;
    tipoEsame: string;
    stato: StatoEsameStrumentale;
    bridgeSessionId?: string;
    dataEsame?: string;
    risultati?: TestResult[];
    findings?: string[];
    pdfPath?: string;
    pdfFilename?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    medico?: {
        id: string;
        firstName: string;
        lastName: string;
        gender?: string;
    };
    paziente?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface TestResult {
    testId: string;
    testName: string;
    value: string;
    unit?: string;
    normalLow?: string;
    normalHigh?: string;
    status?: string;
    note?: string;
}

export interface BridgeDevice {
    type: string;
    displayName: string;
    gdtId: string;
    inputDir: string;
    outputDir: string;
    watching: boolean;
    available: boolean;
}

export interface BridgeStatusResponse {
    bridgeConnected: boolean;
    bridge?: {
        status: string;
        version: string;
        uptime: number;
    };
    devices?: BridgeDevice[];
    activeSessions?: number;
    message?: string;
}

export interface AvviaEsameRequest {
    visitaId: string;
    pazienteId: string;
    tipoEsame: TipoEsame;
    bridgeSessionId?: string;
}

export interface StartExamBridgeRequest {
    examType: string;
    patient: {
        patientId: string;
        lastName: string;
        firstName: string;
        dateOfBirth: string;
        gender: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
        taxCode?: string;
        heightCm?: number;
        weightKg?: number;
        ethnicity?: string;
    };
    visitaId: string;
    tenantId: string;
    callbackUrl?: string;
    metadata?: Record<string, unknown>;
}

export interface StartExamBridgeResponse {
    sessionId: string;
    examType: string;
    device: string | {
        type: string;
        displayName: string;
        launched: boolean;
    };
    status: string;
    message: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    message?: string;
}

// ============================================
// CONSTANTS
// ============================================

const CLINICA_BASE = '/api/v1/clinica';
const BRIDGE_BASE = `${CLINICA_BASE}/strumenti-bridge`;

// Bridge URL — configurable via localStorage for different workstation setups
const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:4050';

// Port candidates to try when auto-discovering the bridge.
// 4051 is reserved by the desktop callback server and must not be probed by the webapp.
const BRIDGE_PORT_CANDIDATES = [4050, 4052, 4053];

// In-memory discovery cache (not localStorage — avoids stale cross-session state)
let _discoveredBridgeUrl: string | null = null;
let _discoveryTimestamp = 0;
const DISCOVERY_CACHE_TTL = 30_000; // 30 seconds

function getBridgeLocalUrl(): string {
    try {
        return localStorage.getItem('bridge_local_url') || DEFAULT_BRIDGE_URL;
    } catch {
        return DEFAULT_BRIDGE_URL;
    }
}

/**
 * Return all URLs to probe when looking for the bridge.
 * If the user has set a manual URL, only that one is tried.
 * Otherwise, we probe the default port + r16 fallback ports.
 */
function getBridgeUrlCandidates(): string[] {
    try {
        const manual = localStorage.getItem('bridge_local_url');
        if (manual) return [manual];
    } catch { /* ignore */ }
    return BRIDGE_PORT_CANDIDATES.map(p => `http://127.0.0.1:${p}`);
}

/**
 * Return a cached discovered bridge URL (the port it is actually running on).
 * Falls back to DEFAULT_BRIDGE_URL when no bridge is reachable.
 */
async function discoverBridgeUrl(): Promise<string | null> {
    const now = Date.now();
    if (_discoveredBridgeUrl && (now - _discoveryTimestamp) < DISCOVERY_CACHE_TTL) {
        return _discoveredBridgeUrl;
    }
    for (const url of getBridgeUrlCandidates()) {
        try {
            const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) });
            if (!res.ok) continue;
            const data = await res.json().catch(() => null) as { status?: string } | null;
            if (data?.status === 'ok' || data?.status === 'setup') {
                _discoveredBridgeUrl = url;
                _discoveryTimestamp = now;
                return url;
            }
        } catch { /* try next port */ }
    }
    // Bridge not found — clear stale cache, return default (callers treat as offline)
    _discoveredBridgeUrl = null;
    return null;
}

function getBridgeApiKey(): string {
    try {
        return localStorage.getItem('bridge_api_key') || '';
    } catch {
        return '';
    }
}

/** Get common headers for Bridge direct calls */
function getBridgeHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = getBridgeApiKey();
    if (apiKey) {
        headers['X-Bridge-Api-Key'] = apiKey;
    }
    return headers;
}

// Map Italian exam types to Bridge's English exam types
const EXAM_TYPE_TO_BRIDGE: Record<TipoEsame, string> = {
    'ecg': 'ecg',
    'spirometria': 'spirometry',
    'audiometria': 'audiometry',
    'visiotest': 'vision',
};

async function extractDownloadErrorMessage(error: unknown): Promise<string> {
    const fallbackMessage = 'Impossibile scaricare il pacchetto di installazione.';

    if (!axios.isAxiosError(error)) {
        return fallbackMessage;
    }

    const responseData = error.response?.data;
    if (responseData instanceof Blob) {
        try {
            const text = await responseData.text();
            if (!text) {
                return fallbackMessage;
            }

            try {
                const parsed = JSON.parse(text) as { error?: string; message?: string };
                return parsed.error || parsed.message || fallbackMessage;
            } catch {
                return text;
            }
        } catch {
            return fallbackMessage;
        }
    }

    if (typeof responseData === 'string' && responseData.trim().length > 0) {
        return responseData;
    }

    if (typeof error.response?.data?.error === 'string') {
        return error.response.data.error;
    }

    if (typeof error.message === 'string' && error.message.trim().length > 0) {
        return error.message;
    }

    return fallbackMessage;
}

// ============================================
// WEBAPP BACKEND API (EsameStrumentale CRUD)
// ============================================

export const strumentiBridgeApi = {
    /**
     * Check backend API health with authenticated request context
     */
    getBackendHealth: () =>
        apiGet<{ valid: boolean; timestamp?: string }>('/api/v1/auth/verify'),

    /**
     * Get all exams for a visit
     */
    getEsamiVisita: (visitaId: string) =>
        apiGet<ApiResponse<EsameStrumentale[]>>(`${BRIDGE_BASE}/visita/${visitaId}`)
            .then(r => r.data),

    /**
     * Get single exam details
     */
    getEsame: (id: string) =>
        apiGet<ApiResponse<EsameStrumentale>>(`${BRIDGE_BASE}/${id}`)
            .then(r => r.data),

    /**
     * Register a pending exam in the backend (before calling bridge)
     */
    avviaEsame: (data: AvviaEsameRequest) =>
        apiPost<ApiResponse<EsameStrumentale>>(`${BRIDGE_BASE}/avvia-esame`, data)
            .then(r => r.data),

    /**
     * Delete (soft) an exam with GDPR-compliant deletion reason
     */
    deleteEsame: (id: string, deletionReason: string) =>
        apiDeleteWithPayload<{ success: boolean }>(`${BRIDGE_BASE}/${id}`, { deletionReason }),

    /**
     * Check bridge status via backend proxy
     */
    getBridgeStatus: () =>
        apiGet<ApiResponse<BridgeStatusResponse>>(`${BRIDGE_BASE}/bridge/status`)
            .then(r => r.data),

    /**
     * Download installer package (ZIP) for Windows
     */
    downloadInstaller: async () => {
        try {
            const blob = await apiDownload(`${BRIDGE_BASE}/download-installer`);

            if (blob.type.includes('application/json') || blob.type.startsWith('text/')) {
                const text = await blob.text();
                try {
                    const parsed = JSON.parse(text) as { error?: string; message?: string };
                    throw new Error(parsed.error || parsed.message || 'Pacchetto di installazione non disponibile');
                } catch {
                    throw new Error(text || 'Pacchetto di installazione non disponibile');
                }
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ElementMedica-Bridge-Installer.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            const message = await extractDownloadErrorMessage(error);
            throw new Error(message);
        }
    },

    /**
     * Generate a new API key for Bridge authentication
     */
    generateApiKey: () =>
        apiPost<ApiResponse<{ apiKey: string; instructions: string }>>(`${BRIDGE_BASE}/generate-api-key`, {})
            .then(r => r.data),
};

// ============================================
// LOCAL BRIDGE DIRECT API
// ============================================

/**
 * Direct communication with the local Bridge server
 * Used when the webapp needs to start an exam on a device
 */
export const bridgeDirectApi = {
    /**
     * Start an exam on a medical device via the local Bridge
     */
    startExam: async (request: StartExamBridgeRequest): Promise<StartExamBridgeResponse> => {
        const bridgeUrl = await discoverBridgeUrl();
        if (!bridgeUrl) {
            throw new Error('Bridge locale non disponibile da questa origine.');
        }
        // Map Italian exam type to Bridge's English type
        const bridgeExamType = EXAM_TYPE_TO_BRIDGE[request.examType as TipoEsame] || request.examType;
        const bridgeRequest = { ...request, examType: bridgeExamType };
        const response = await fetch(`${bridgeUrl}/start-exam`, {
            method: 'POST',
            headers: getBridgeHeaders(),
            body: JSON.stringify(bridgeRequest),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            let errorData: { error?: string; message?: string; details?: string } = {};
            try { errorData = JSON.parse(errorText); } catch { /* not JSON */ }
            const errorMsg = errorData.error || errorData.message || `Bridge error ${response.status}`;
            console.error('[Bridge] start-exam failed:', {
                status: response.status,
                examType: bridgeRequest.examType,
                body: errorText,
            });
            throw new Error(errorMsg);
        }

        return response.json();
    },

    /**
     * Get Bridge health status directly
     */
    getHealth: async (): Promise<{ status: string; uptime: number; version: string }> => {
        const bridgeUrl = await discoverBridgeUrl();
        if (!bridgeUrl) {
            throw new Error('Bridge locale non disponibile da questa origine.');
        }
        const response = await fetch(`${bridgeUrl}/health`, {
            signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) {
            throw new Error(`Bridge health check failed: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Get rich connection state: 'operational' | 'setup' | 'offline'
     * - 'operational': Bridge running and ready for exams
     * - 'setup': Bridge running but waiting for activation code
     * - 'offline': Bridge not reachable
     *
     * Probes candidate ports (3000, 3001, 3002) so that the r16 port-fallback
     * logic in the bridge does not cause false 'offline' readings.
     */
    getConnectionState: async (): Promise<'operational' | 'setup' | 'offline'> => {
        try {
            for (const url of getBridgeUrlCandidates()) {
                try {
                    const response = await fetch(`${url}/health`, {
                        signal: AbortSignal.timeout(3000),
                    });
                    if (!response.ok) continue;
                    const data = await response.json().catch(() => null) as { status?: string } | null;
                    if (!data) continue;
                    // Cache the port we actually found the bridge on
                    _discoveredBridgeUrl = url;
                    _discoveryTimestamp = Date.now();
                    if (data.status === 'setup') return 'setup';
                    return 'operational';
                } catch { /* try next port */ }
            }
            return 'offline';
        } catch {
            return 'offline';
        }
    },

    /**
     * Check if Bridge is reachable and operational (ready for exams).
     * Probes candidate ports so the r16 port-fallback does not cause false negatives.
     */
    isConnected: async (): Promise<boolean> => {
        try {
            for (const url of getBridgeUrlCandidates()) {
                try {
                    const response = await fetch(`${url}/health`, {
                        signal: AbortSignal.timeout(3000),
                    });
                    if (!response.ok) continue;
                    const data = await response.json().catch(() => null) as { status?: string } | null;
                    if (data?.status === 'ok') {
                        // Cache the port we found the bridge on for subsequent calls
                        _discoveredBridgeUrl = url;
                        _discoveryTimestamp = Date.now();
                        return true;
                    }
                    // 'setup' mode means bridge is reachable but not yet operational
                    return false;
                } catch { /* try next port */ }
            }
            return false;
        } catch {
            return false;
        }
    },

    /**
     * Get configured devices from Bridge
     */
    getDevices: async (): Promise<BridgeDevice[]> => {
        const bridgeUrl = await discoverBridgeUrl();
        if (!bridgeUrl) {
            return [];
        }
        const response = await fetch(`${bridgeUrl}/devices`, {
            headers: getBridgeHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Bridge devices request failed: ${response.status}`);
        }
        const data = await response.json();
        return data.devices || [];
    },

    /**
     * Get active exam sessions from Bridge
     */
    getSessions: async (): Promise<unknown[]> => {
        const bridgeUrl = await discoverBridgeUrl();
        if (!bridgeUrl) {
            return [];
        }
        const response = await fetch(`${bridgeUrl}/sessions`, {
            headers: getBridgeHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Bridge sessions request failed: ${response.status}`);
        }
        const data = await response.json();
        return data.sessions || [];
    },
};

// Convenience exports
export const TIPO_ESAME_LABELS: Record<string, string> = {
    'ecg': 'Elettrocardiogramma (ECG)',
    'spirometria': 'Spirometria',
    'audiometria': 'Audiometria',
    'visiotest': 'Visiotest',
};

export const TIPO_DISPOSITIVO_LABELS: Record<TipoDispositivoMedico, string> = {
    'ECG': 'ECG',
    'SPIROMETRO': 'Spirometro',
    'AUDIOMETRO': 'Audiometro',
    'VISIOTEST': 'Visiotest',
};

export const STATO_ESAME_CONFIG: Record<StatoEsameStrumentale, { label: string; color: string; icon: string }> = {
    'IN_ATTESA': { label: 'In attesa', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
    'COMPLETATO': { label: 'Completato', color: 'bg-green-100 text-green-800', icon: '✅' },
    'PARZIALE': { label: 'Parziale', color: 'bg-orange-100 text-orange-800', icon: '⚠️' },
    'ERRORE': { label: 'Errore', color: 'bg-red-100 text-red-800', icon: '❌' },
    'TIMEOUT': { label: 'Timeout', color: 'bg-gray-100 text-gray-800', icon: '⏱️' },
};
