import { ActivityLog, ActivityLogFilters } from '../types';
import { apiGet, apiPost } from './api';
import { API_ENDPOINTS } from '../config/api';

export interface LogsResponse {
  logs: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface BackendLogResponse {
  data: ActivityLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Tipi di risposta supportati dal backend
type NewBackendResponse = { success: true; data: ActivityLog[]; meta?: { page?: number; limit?: number; total?: number; totalPages?: number } };
type LegacyBackendResponse = { logs: ActivityLog[]; pagination?: { total?: number; limit?: number; offset?: number } };

function isNewBackendResponse(resp: unknown): resp is NewBackendResponse {
  if (typeof resp !== 'object' || resp === null) return false;
  if (!('success' in resp) || !('data' in resp)) return false;
  const successVal = (resp as { success?: unknown }).success;
  const dataVal = (resp as { data?: unknown }).data;
  return successVal === true && Array.isArray(dataVal);
}
function isLegacyBackendResponse(resp: unknown): resp is LegacyBackendResponse {
  if (typeof resp !== 'object' || resp === null) return false;
  if (!('logs' in resp)) return false;
  const logsVal = (resp as { logs?: unknown }).logs;
  return Array.isArray(logsVal);
}

// Mock data in case the backend API fails
const MOCK_LOGS: ActivityLog[] = [
  {
    id: '1',
    userId: '1',
    user: {
      username: 'admin',
      email: 'admin@example.com'
    },
    resource: 'users',
    resourceId: '123',
    action: 'create',
    details: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    ipAddress: '192.168.1.1',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 60).toISOString()
  },
  {
    id: '2',
    userId: '1',
    user: {
      username: 'admin',
      email: 'admin@example.com'
    },
    resource: 'courses',
    resourceId: '456',
    action: 'update',
    details: JSON.stringify({ title: 'Advanced JavaScript', duration: '3 hours' }),
    ipAddress: '192.168.1.1',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: '3',
    userId: '2',
    user: {
      username: 'user',
      email: 'user@example.com'
    },
    resource: 'employees',
    resourceId: '789',
    action: 'delete',
    details: JSON.stringify({ id: '789', name: 'Former Employee' }),
    ipAddress: '192.168.1.2',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: '4',
    userId: '1',
    user: {
      username: 'admin',
      email: 'admin@example.com'
    },
    resource: 'companies',
    resourceId: '101',
    action: 'update',
    details: JSON.stringify({ name: 'Acme Corporation', updated: { address: 'New Office Location' } }),
    ipAddress: '192.168.1.1',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 60 * 3).toISOString()
  },
  {
    id: '5',
    userId: '2',
    user: {
      username: 'user',
      email: 'user@example.com'
    },
    resource: 'auth',
    action: 'login',
    ipAddress: '192.168.1.2',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 30).toISOString()
  }
];

export const getLogs = async (filters?: ActivityLogFilters, limit?: number, offset?: number): Promise<LogsResponse> => {
  // Calcolo page/limit in base a offset/limit
  const effectiveLimit = typeof limit === 'number' && limit > 0 ? limit : 100;
  const effectiveOffset = typeof offset === 'number' && offset >= 0 ? offset : 0;
  const page = Math.floor(effectiveOffset / effectiveLimit) + 1;

  // Mappatura filtri FE -> BE
  const params: Record<string, unknown> = {
    page,
    limit: effectiveLimit,
  };
  if (filters?.action) params.action = filters.action;
  if (filters?.userId) params.personId = filters.userId;
  if (filters?.startDate) params.from = filters.startDate;
  if (filters?.endDate) params.to = filters.endDate;
  // Se esiste un campo search lato FE lo inoltriamo come search
  if (filters?.search) params.search = filters.search;

  try {
    console.log('Attempting to fetch logs from backend endpoint:', API_ENDPOINTS.ACTIVITY_LOGS, params);

    // Usa apiGet per gestire baseURL/headers automaticamente
    const resp = await apiGet<unknown>(API_ENDPOINTS.ACTIVITY_LOGS, params);

    // Supporta entrambi i formati:
    // 1) BE nuovo: { success: true, data: ActivityLog[], meta: { page, limit, total, totalPages } }
    // 2) BE legacy: { logs: ActivityLog[], pagination: { total, limit, offset } }
    let logs: ActivityLog[] = [];
    let total = 0;
    let retLimit = effectiveLimit;
    let retOffset = effectiveOffset;

    if (isNewBackendResponse(resp)) {
      logs = resp.data;
      const meta = resp.meta || {};
      const pageFromResp = Number((meta as { page?: number }).page) || page;
      const limitFromResp = Number((meta as { limit?: number }).limit) || effectiveLimit;
      total = Number((meta as { total?: number }).total) || 0;
      retLimit = limitFromResp;
      retOffset = (pageFromResp - 1) * limitFromResp;
    } else if (isLegacyBackendResponse(resp)) {
      logs = resp.logs;
      const pagination = resp.pagination || {};
      total = Number((pagination as { total?: number }).total) || 0;
      retLimit = Number((pagination as { limit?: number }).limit) || effectiveLimit;
      retOffset = Number((pagination as { offset?: number }).offset) || effectiveOffset;
    } else if (Array.isArray(resp)) {
      // Fallback estremo: la risposta è direttamente un array
      logs = resp as ActivityLog[];
      total = logs.length;
      retLimit = effectiveLimit;
      retOffset = effectiveOffset;
    } else {
      console.warn('Unexpected logs response format, using mock');
      logs = MOCK_LOGS;
      total = MOCK_LOGS.length;
      retLimit = effectiveLimit;
      retOffset = effectiveOffset;
    }

    return { logs, total, limit: retLimit, offset: retOffset };
  } catch {
    console.warn('Failed to fetch logs from backend, using mock data:');
    // In caso di errore restituisce i mock
    const fallbackLogs = MOCK_LOGS.slice(0, effectiveLimit);
    return {
      logs: fallbackLogs,
      total: MOCK_LOGS.length,
      limit: effectiveLimit,
      offset: effectiveOffset,
    };
  }
};

export interface CtaEventPayload {
  resource?: string; // default: 'public'
  action?: string;   // default: 'cta_click'
  resourceId?: string;
  details?: Record<string, unknown> | string;
}

export const trackCtaEvent = async (payload: CtaEventPayload) => {
  try {
    const body = {
      resource: payload.resource || 'public',
      action: payload.action || 'cta_click',
      resourceId: payload.resourceId,
      details: typeof payload.details === 'string' ? payload.details : JSON.stringify(payload.details || {}),
      timestamp: new Date().toISOString()
    } as Record<string, unknown>;

    // Preferisci sendBeacon per non bloccare la navigazione
    let endpoint = `/api${API_ENDPOINTS.ACTIVITY_LOGS}`; // '/api/activity-logs'

    // Aggiungi tenantId come query string (sendBeacon non supporta headers custom)
    try {
      const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;
      if (tenantId && tenantId !== 'default-company') {
        const qs = `tenantId=${encodeURIComponent(tenantId)}`;
        endpoint = endpoint.includes('?') ? `${endpoint}&${qs}` : `${endpoint}?${qs}`;
      }
    } catch {
      // safe noop
    }

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      const ok = navigator.sendBeacon(endpoint, blob);
      if (ok) return true;
      // fallback se sendBeacon restituisce false
    }

    // Fallback fire-and-forget con apiPost (non bloccare errori)
    apiPost(API_ENDPOINTS.ACTIVITY_LOGS, body, { _skipGdprCheck: true }).catch(() => void 0);
    return true;
  } catch {
    // Non interrompere il flusso UI
    return false;
  }
};

export default {
  getLogs,
  trackCtaEvent
};