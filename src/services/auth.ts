import { apiGet, apiPost } from './api';
import { AuthResponse, AuthVerifyResponse, LoginRequest } from '../types';
import { API_BASE_URL } from '../config/api';

// Types for permissions
export interface UserPermissions {
  role: string;
  permissions: Array<{
    resource: string;
    action: string;
    scope?: string;
  }>;
}

export const login = async (identifier: string, password: string): Promise<AuthResponse> => {
  return await apiPost<AuthResponse>('/api/v1/auth/login', {
    identifier,
    password,
  });
};

export const verifyToken = async (): Promise<AuthVerifyResponse> => {
  return await apiGet<AuthVerifyResponse>('/api/v1/auth/verify', { _skipGdprCheck: true });
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  return await apiPost<{ message: string }>('/api/v1/auth/forgot-password', { email });
};

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  return await apiPost<{ message: string }>('/api/v1/auth/reset-password', { token, password });
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  return await apiPost<{ success: boolean; message: string }>('/api/v1/auth/change-password', {
    currentPassword,
    newPassword,
  });
};

/**
 * F318: Acccess token in-memory storage.
 * L'access token è volutamente in-memory (non in localStorage) per prevenire XSS.
 * In caso di reload, l'AuthContext recupera automaticamente un nuovo access token
 * tramite il refresh token (che rimane in localStorage).
 */
let _accessTokenMemory: string | null = null;

export const saveToken = (token: string): void => {
  _accessTokenMemory = token;
  // Rimuovi eventuali residui di versioni precedenti che usavano localStorage
  try { localStorage.removeItem('authToken'); } catch { /* ignore */ }
};

export const getToken = (): string | null => {
  return _accessTokenMemory;
};

export const removeToken = (): void => {
  _accessTokenMemory = null;
  try { localStorage.removeItem('authToken'); } catch { /* ignore */ }
};

// Gestione Refresh Token
export const saveRefreshToken = (refreshToken: string): void => {
  localStorage.setItem('refreshToken', refreshToken);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const removeRefreshToken = (): void => {
  localStorage.removeItem('refreshToken');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * F321: Refresh guard — previene chiamate concorrenti a /refresh.
 * React StrictMode (dev) monta gli effetti due volte; senza il guard,
 * entrambe le invocazioni chiamerebbero refreshAccess simultaneamente:
 * la prima consuma il refresh token (token rotation), la seconda ottiene 401
 * e poi chiama removeToken/removeRefreshToken azzerando la sessione.
 * Con il guard, la seconda chiamata si aggancia alla stessa Promise della prima.
 */
let _refreshPromise: Promise<string | null> | null = null;

// Refresh access token lato client usando header x-refresh-token
export const refreshAccess = async (): Promise<string | null> => {
  // Se c'è già un refresh in corso, restituisci la stessa Promise
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const currentRefresh = getRefreshToken();
      if (!currentRefresh) return null;

      // Usa fetch per evitare interferenze con interceptor ed eventuali loop
      // API_BASE_URL già include /api, quindi usiamo solo /v1/auth/refresh
      const resp = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-refresh-token': currentRefresh
        },
        credentials: 'include'
      });

      if (!resp.ok) {
        if (import.meta.env.DEV) console.warn('refreshAccess: refresh failed with status', resp.status);
        return null;
      }

      const data: any = await resp.json();
      const newAccess = data?.access_token || data?.tokens?.access_token || data?.token || null;
      const newRefresh = data?.refresh_token || data?.tokens?.refresh_token || null;

      if (newAccess) saveToken(newAccess);
      if (newRefresh) saveRefreshToken(newRefresh);

      return newAccess;
    } catch (e) {
      if (import.meta.env.DEV) console.error('refreshAccess: error while refreshing token', e);
      return null;
    } finally {
      // Rilascia il guard dopo 100ms per consentire retry veloci ma non loop
      setTimeout(() => { _refreshPromise = null; }, 100);
    }
  })();

  return _refreshPromise;
};

// Logout lato backend: revoca la sessione usando il refresh token, se disponibile
export const logout = async (refreshToken?: string): Promise<{ success: boolean } | void> => {
  try {
    const token = refreshToken || getRefreshToken();
    if (!token) {
      return { success: true };
    }
    return await apiPost<{ success: boolean }>('/api/v1/auth/logout', {}, {
      headers: {
        'x-refresh-token': token
      }
    });
  } catch (e) {
    // Non bloccare il logout se la chiamata fallisce
    return { success: false } as any;
  }
};

export const getUserPermissions = async (personId: string): Promise<UserPermissions> => {
  try {
    const response = await apiGet<{ success: boolean; data: { personId: string; role: string; permissions: Record<string, boolean> } }>(`/api/v1/auth/permissions/${personId}`);

    // Convert backend response format to frontend expected format
    const permissionsArray = Object.entries(response.data.permissions || {})
      .filter(([key, value]) => value === true) // Only include permissions that are granted
      .map(([key, value]) => {
        // Handle both formats: 'resource.action' and 'resource:action'
        const [resource, action] = key.includes('.') ? key.split('.') : key.split(':');
        return {
          resource: resource || 'unknown',
          action: action || 'unknown',
          scope: undefined
        };
      })
      .filter(p => p.resource !== 'unknown' && p.action !== 'unknown');

    return {
      role: response.data.role,
      permissions: permissionsArray
    };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error('❌ getUserPermissions: Error fetching user permissions:', {
        status: error.response?.status,
        personId
      });
    }

    // Return default EMPLOYEE role if there's an error
    if (import.meta.env.DEV) console.warn('⚠️ getUserPermissions: Returning default EMPLOYEE role due to error');
    return {
      role: 'EMPLOYEE',
      permissions: []
    };
  }
};

// ============================================
// PROGETTO 49 - Login Multi-Step
// ============================================

/**
 * Identifica se l'identifier (email/username/CF) è univoco o ha più account
 * @returns IdentifyResponse con unique=true/false e lista accounts se multipli
 */
export interface IdentifyAccount {
  personId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  hasUsername: boolean;
  hasTaxCode: boolean;
  tenants: Array<{
    tenantId: string;
    tenantName: string;
    profileId: string;
    email: string;
  }>;
}

export interface IdentifyResponse {
  success: boolean;
  unique?: boolean;
  personId?: string;
  displayName?: string;
  identifiedBy?: 'email' | 'username' | 'taxCode';
  tenantName?: string;
  accounts?: IdentifyAccount[];
  allowAlternative?: boolean;
  message?: string;
  error?: string;
}

export const identify = async (identifier: string): Promise<IdentifyResponse> => {
  return await apiPost<IdentifyResponse>('/api/v1/auth/identify', { identifier });
};

/**
 * Login con personId già identificato (Step 2 del multi-step login)
 * Usato dopo la selezione account
 */
export const loginWithPersonId = async (personId: string, password: string): Promise<AuthResponse> => {
  return await apiPost<AuthResponse>('/api/v1/auth/login', {
    personId,
    password,
  });
};

export default {
  login,
  loginWithPersonId,
  identify,
  verifyToken,
  forgotPassword,
  resetPassword,
  changePassword,
  saveToken,
  getToken,
  removeToken,
  saveRefreshToken,
  getRefreshToken,
  removeRefreshToken,
  logout,
  isAuthenticated,
  refreshAccess
};