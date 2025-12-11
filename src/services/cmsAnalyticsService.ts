/**
 * CMS Analytics Service
 * Frontend service per analytics pagine CMS
 * 
 * NOTA: Usa fetch nativo invece di axios per evitare problemi con interceptor
 * che possono causare errori "Cannot read properties of undefined (reading 'toUpperCase')"
 */

import { getToken } from './auth';

export interface PageViewData {
  pageId: string;
  sessionId?: string;
  duration?: number;
  referer?: string;
}

export interface PageStats {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
  views: number;
}

export interface PageAnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  totalPages: number;
}

export interface PageAnalyticsResponse {
  pages: PageStats[];
  summary: PageAnalyticsSummary;
}

export interface DeviceBreakdown {
  device: string;
  count: number;
}

export interface BrowserBreakdown {
  browser: string;
  count: number;
}

export interface RefererBreakdown {
  referer: string;
  count: number;
}

export interface ViewsOverTime {
  date: string;
  views: number;
}

export interface PageDetailedAnalytics {
  page: {
    id: string;
    slug: string;
    title: string;
    isPublished: boolean;
  };
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    avgDuration: number;
  };
  devices: DeviceBreakdown[];
  browsers: BrowserBreakdown[];
  referers: RefererBreakdown[];
  viewsOverTime: ViewsOverTime[];
}

export interface AnalyticsSummary {
  period: string;
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    viewsTrend: number;
    avgViewsPerDay: number;
  };
  topPages: PageStats[];
  devices: Record<string, number>;
  viewsOverTime?: ViewsOverTime[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

const ANALYTICS_BASE = '/api/v1/cms/analytics';

// Ottieni il brand ID per il multi-brand support
const getBrandId = (): string => {
  // In Vite, import.meta.env è disponibile
  return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BRAND_ID) || 'element-formazione';
};

// Genera session ID unico per tracciamento visitatori
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('cms_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('cms_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Traccia una visita su una pagina CMS (chiamato dalle pagine pubbliche)
 * Usa fetch nativo per evitare problemi con axios interceptor
 */
export const trackPageView = async (data: PageViewData): Promise<void> => {
  try {
    const payload = {
      ...data,
      sessionId: data.sessionId || getSessionId(),
      referer: data.referer || (typeof document !== 'undefined' ? document.referrer : '')
    };

    const token = getToken();
    const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;
    const brandId = getBrandId();

    await fetch(`${ANALYTICS_BASE}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Frontend-Id': brandId,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(tenantId ? { 'X-Tenant-ID': tenantId } : {})
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
  } catch (error) {
    // Non lanciare errori per il tracking - è non critico
    console.debug('[CMS Analytics] Failed to track page view:', error);
  }
};

/**
 * Ottiene statistiche per tutte le pagine CMS
 * Usa fetch nativo per evitare problemi con axios interceptor
 */
export const getPageAnalytics = async (params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<PageAnalyticsResponse> => {
  // Build query string con validazione
  const queryParams = new URLSearchParams();
  if (params?.startDate && typeof params.startDate === 'string') {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate && typeof params.endDate === 'string') {
    queryParams.append('endDate', params.endDate);
  }
  if (params?.limit && typeof params.limit === 'number') {
    queryParams.append('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const url = `${ANALYTICS_BASE}/pages${queryString ? '?' + queryString : ''}`;

  const token = getToken();
  const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;
  const brandId = getBrandId();

  // Headers costruiti in modo sicuro
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Frontend-Id': brandId
  };
  if (token && typeof token === 'string') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantId && typeof tenantId === 'string') {
    headers['X-Tenant-ID'] = tenantId;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json() as ApiResponse<PageAnalyticsResponse>;

  // Validazione e fallback
  return data.data || {
    pages: [],
    summary: {
      totalViews: 0,
      uniqueVisitors: 0,
      totalPages: 0
    }
  };
};

/**
 * Ottiene statistiche dettagliate per una singola pagina
 * Usa fetch nativo per evitare problemi con axios interceptor
 */
export const getPageDetailedAnalytics = async (
  pageId: string,
  params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }
): Promise<PageDetailedAnalytics> => {
  // Validazione pageId
  if (!pageId || typeof pageId !== 'string') {
    throw new Error('Invalid pageId');
  }

  // Build query string con validazione
  const queryParams = new URLSearchParams();
  if (params?.startDate && typeof params.startDate === 'string') {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate && typeof params.endDate === 'string') {
    queryParams.append('endDate', params.endDate);
  }
  if (params?.groupBy && ['day', 'week', 'month'].includes(params.groupBy)) {
    queryParams.append('groupBy', params.groupBy);
  }

  const queryString = queryParams.toString();
  const url = `${ANALYTICS_BASE}/pages/${pageId}${queryString ? '?' + queryString : ''}`;

  const token = getToken();
  const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;
  const brandId = getBrandId();

  // Headers costruiti in modo sicuro
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Frontend-Id': brandId
  };
  if (token && typeof token === 'string') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantId && typeof tenantId === 'string') {
    headers['X-Tenant-ID'] = tenantId;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json() as ApiResponse<PageDetailedAnalytics>;
  return data.data;
};

/**
 * Ottiene un riepilogo generale delle analytics
 * Usa fetch nativo per evitare problemi con axios interceptor
 */
export const getAnalyticsSummary = async (period?: '7d' | '30d' | '90d' | '1y'): Promise<AnalyticsSummary> => {
  // Validazione e default sicuro per period
  const safePeriod = period && ['7d', '30d', '90d', '1y'].includes(period) ? period : '30d';
  console.log('[CMS Analytics] 🔍 Fetching summary for period:', safePeriod);

  try {
    const url = `${ANALYTICS_BASE}/summary?period=${safePeriod}`;
    const token = getToken();
    const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;
    const brandId = getBrandId();

    // Headers costruiti in modo sicuro
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Frontend-Id': brandId
    };
    if (token && typeof token === 'string') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (tenantId && typeof tenantId === 'string') {
      headers['X-Tenant-ID'] = tenantId;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CMS Analytics] ❌ HTTP Error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json() as ApiResponse<AnalyticsSummary>;
    console.log('[CMS Analytics] 📊 Raw response:', data);

    // Validazione della risposta
    if (!data || typeof data !== 'object') {
      console.error('[CMS Analytics] ❌ Invalid response format');
      throw new Error('Invalid response format from server');
    }

    // Ritorna i dati con fallback sicuro
    const result = data.data || {
      period: safePeriod,
      summary: {
        totalViews: 0,
        uniqueVisitors: 0,
        viewsTrend: 0,
        avgViewsPerDay: 0
      },
      topPages: [],
      devices: {},
      viewsOverTime: []
    };

    console.log('[CMS Analytics] ✅ Summary data:', result);
    return result;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[CMS Analytics] ❌ Error fetching summary:', errorMsg, error);
    throw error;
  }
};

export default {
  trackPageView,
  getPageAnalytics,
  getPageDetailedAnalytics,
  getAnalyticsSummary,
  getSessionId
};
