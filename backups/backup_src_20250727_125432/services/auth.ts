import { apiPost, apiGet } from './api';
import { AuthResponse, AuthVerifyResponse, LoginRequest } from '../types';

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
  return await apiGet<AuthVerifyResponse>('/api/v1/auth/verify');
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  return await apiPost<{ message: string }>('/api/v1/auth/forgot-password', { email });
};

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  return await apiPost<{ message: string }>('/api/v1/auth/reset-password', { token, password });
};

export const saveToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

export const getToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const removeToken = (): void => {
  localStorage.removeItem('authToken');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const getUserPermissions = async (personId: string): Promise<UserPermissions> => {
  try {
    console.log('🔍 getUserPermissions: Calling API for personId:', personId);
    console.log('🔍 getUserPermissions: Current token:', getToken() ? getToken()?.substring(0, 20) + '...' : 'NO TOKEN');
    const response = await apiGet<{ success: boolean; data: { personId: string; role: string; permissions: Record<string, boolean> } }>(`/api/v1/auth/permissions/${personId}`);
    
    console.log('🔍 getUserPermissions: Raw API response:', response);
    
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
    
    console.log('🔍 getUserPermissions: Converted permissions:', {
      backendPermissions: response.data.permissions,
      convertedPermissions: permissionsArray,
      role: response.data.role
    });
    
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
      personId,
      hasToken: !!getToken(),
      tokenPreview: getToken() ? getToken()?.substring(0, 20) + '...' : 'NO TOKEN',
      fullError: error
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
  isAuthenticated
};