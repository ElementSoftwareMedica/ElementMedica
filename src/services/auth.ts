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

// Migrazione e normalizzazione chiavi di storage
export const migrateStorageKeys = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    // Access token: supporta alias legacy 'token' e 'accessToken'
    const currentAuth = localStorage.getItem('authToken');
    const legacyToken = localStorage.getItem('token');
    const legacyAccess = localStorage.getItem('accessToken');
    if (!currentAuth) {
      const migrated = legacyToken || legacyAccess;
      if (migrated) {
        localStorage.setItem('authToken', migrated);
        // Pulisci chiavi legacy
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
      }
    } else {
      // Se presente chiave standard, elimina eventuali duplicati legacy
      if (legacyToken) localStorage.removeItem('token');
      if (legacyAccess) localStorage.removeItem('accessToken');
    }

    // Refresh token: supporta alias legacy 'refresh_token'
    const currentRefresh = localStorage.getItem('refreshToken');
    const legacyRefresh = localStorage.getItem('refresh_token');
    if (!currentRefresh && legacyRefresh) {
      localStorage.setItem('refreshToken', legacyRefresh);
      localStorage.removeItem('refresh_token');
    } else if (currentRefresh && legacyRefresh) {
      localStorage.removeItem('refresh_token');
    }

    // tenantId: normalizza eventuale 'tenantID' -> 'tenantId'
    const legacyTenantID = localStorage.getItem('tenantID');
    if (legacyTenantID && !localStorage.getItem('tenantId')) {
      localStorage.setItem('tenantId', legacyTenantID);
      localStorage.removeItem('tenantID');
    } else if (legacyTenantID) {
      localStorage.removeItem('tenantID');
    }
  } catch (_) {
    // Non bloccare in caso di errori di storage (es. Safari in Private Mode)
  }
};

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

export const saveToken = (token: string): void => {
  migrateStorageKeys();
  localStorage.setItem('authToken', token);
};

export const getToken = (): string | null => {
  migrateStorageKeys();
  return localStorage.getItem('authToken');
};

export const removeToken = (): void => {
  // Rimuovi chiavi standard e legacy
  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
  localStorage.removeItem('accessToken');
};

// Gestione Refresh Token
export const saveRefreshToken = (refreshToken: string): void => {
  migrateStorageKeys();
  localStorage.setItem('refreshToken', refreshToken);
};

export const getRefreshToken = (): string | null => {
  migrateStorageKeys();
  return localStorage.getItem('refreshToken');
};

export const removeRefreshToken = (): void => {
  // Rimuovi chiavi standard e legacy
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('refresh_token');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Refresh access token lato client usando header x-refresh-token
export const refreshAccess = async (): Promise<string | null> => {
  try {
    const currentRefresh = getRefreshToken();
    if (!currentRefresh) return null;

    // Usa fetch per evitare interferenze con interceptor ed eventuali loop
    const resp = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-refresh-token': currentRefresh
      },
      credentials: 'include'
    });

    if (!resp.ok) {
      console.warn('refreshAccess: refresh failed with status', resp.status);
      return null;
    }

    const data: any = await resp.json();
    const newAccess = data?.access_token || data?.tokens?.access_token || data?.token || null;
    const newRefresh = data?.refresh_token || data?.tokens?.refresh_token || null;

    if (newAccess) saveToken(newAccess);
    if (newRefresh) saveRefreshToken(newRefresh);

    return newAccess;
  } catch (e) {
    console.error('refreshAccess: error while refreshing token', e);
    return null;
  }
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
    console.log('🔍 getUserPermissions: Calling API for personId:', personId);
    const response = await apiGet<{ success: boolean; data: { personId: string; role: string; permissions: Record<string, boolean> } }>(`/api/v1/auth/permissions/${personId}`);
    
    console.log('🔍 getUserPermissions: Raw API response received');
    
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
    
    console.log('🔍 getUserPermissions: Converted permissions count:', permissionsArray.length);
    
    return {
      role: response.data.role,
      permissions: permissionsArray
    };
  } catch (error: any) {
    console.error('❌ getUserPermissions: Error fetching user permissions:', {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      personId
    });
    
    // Return default EMPLOYEE role if there's an error
    console.warn('⚠️ getUserPermissions: Returning default EMPLOYEE role due to error');
    return {
      role: 'EMPLOYEE',
      permissions: []
    };
  }
};

export default {
  login,
  verifyToken,
  forgotPassword,
  resetPassword,
  saveToken,
  getToken,
  removeToken,
  saveRefreshToken,
  getRefreshToken,
  removeRefreshToken,
  logout,
  isAuthenticated,
  refreshAccess,
  migrateStorageKeys
};