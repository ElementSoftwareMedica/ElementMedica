/**
 * Google Integration Service
 * API client for Google OAuth2 and import functionality
 */

import axios from 'axios';
import { API_BASE_URL } from '../../../../config/api';
import { getToken } from '../../../../services/auth';

// Create axios instance with interceptors
// Uses centralized API_BASE_URL which routes through proxy (port 4003) in development
const apiClient = axios.create({
  baseURL: API_BASE_URL
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = getToken(); // Use centralized auth service
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ConnectionStatus {
  connected: boolean;
  expiresAt: Date | null;
  scopes: string[];
}

export interface ImportResult {
  name: string;
  content: string;
  header: string;
  footer: string;
  markers: any[];
  googleDocsId?: string;
  googleSlidesId?: string;
  googleDocsUrl?: string;
  description?: string;
  lastSyncedAt?: Date;
}

/**
 * Get Google connection status
 */
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const response = await apiClient.get('/api/v1/google/status');
  const data = response.data as any;
  return {
    ...data.data,
    expiresAt: data.data.expiresAt 
      ? new Date(data.data.expiresAt) 
      : null
  };
}

/**
 * Get Google OAuth2 authorization URL
 */
export async function getAuthUrl(): Promise<string> {
  const response = await apiClient.get('/api/v1/google/auth/url');
  const data = response.data as any;
  return data.data.authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(code: string, state?: string): Promise<void> {
  await apiClient.post('/api/v1/google/auth/callback', {
    code,
    state
  });
}

/**
 * Disconnect Google account
 */
export async function disconnect(): Promise<void> {
  await apiClient.delete('/api/v1/google/disconnect');
}

/**
 * Import Google Docs document
 */
export async function importDocs(documentId: string, convertToHtml: boolean = true): Promise<ImportResult> {
  const response = await apiClient.post('/api/v1/google/import-docs', {
    documentId,
    convertToHtml
  });
  
  const data = (response.data as any).data;
  return {
    ...data,
    lastSyncedAt: data.lastSyncedAt ? new Date(data.lastSyncedAt) : undefined
  };
}

/**
 * Import Google Slides presentation
 */
export async function importSlides(presentationId: string, convertToHtml: boolean = true): Promise<ImportResult> {
  const response = await apiClient.post('/api/v1/google/import-slides', {
    presentationId,
    convertToHtml
  });
  
  const data = (response.data as any).data;
  return {
    ...data,
    lastSyncedAt: data.lastSyncedAt ? new Date(data.lastSyncedAt) : undefined
  };
}

export const googleService = {
  getConnectionStatus,
  getAuthUrl,
  exchangeCode,
  disconnect,
  importDocs,
  importSlides
};

export default googleService;
