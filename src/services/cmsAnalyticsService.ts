/**
 * CMS Analytics Service
 * Frontend service per analytics pagine CMS
 */

import { apiGet, apiPost } from './api';

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
 */
export const trackPageView = async (data: PageViewData): Promise<void> => {
  try {
    const payload = {
      ...data,
      sessionId: data.sessionId || getSessionId(),
      referer: data.referer || (typeof document !== 'undefined' ? document.referrer : '')
    };

    await apiPost(`${ANALYTICS_BASE}/track`, payload);
  } catch (error) {
    // Non lanciare errori per il tracking - è non critico
    console.debug('[CMS Analytics] Failed to track page view:', error);
  }
};

/**
 * Ottiene statistiche per tutte le pagine CMS
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

  const data = await apiGet<ApiResponse<PageAnalyticsResponse>>(url);

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

  const data = await apiGet<ApiResponse<PageDetailedAnalytics>>(url);
  return data.data;
};

/**
 * Ottiene un riepilogo generale delle analytics
 */
export const getAnalyticsSummary = async (period?: '7d' | '30d' | '90d' | '1y'): Promise<AnalyticsSummary> => {
  // Validazione e default sicuro per period
  const safePeriod = period && ['7d', '30d', '90d', '1y'].includes(period) ? period : '30d';

  try {
    const url = `${ANALYTICS_BASE}/summary?period=${safePeriod}`;

    const data = await apiGet<ApiResponse<AnalyticsSummary>>(url);

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
