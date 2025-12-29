/**
 * Template API Service
 * Settings/Templates Redesign Project
 */

import axios from 'axios';
import { API_BASE_URL } from '../../../../config/api';
import type {
  Template,
  TemplateListResponse,
  TemplateResponse,
  CreateTemplateData,
  UpdateTemplateData,
  TemplateFilters,
  TemplateVersion,
} from '../types/template.types';

// Create axios instance with default config
// Uses centralized API_BASE_URL which routes through proxy (port 4003) in development
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token interceptor with method validation
apiClient.interceptors.request.use((config) => {
  // CRITICAL FIX: Validate HTTP method FIRST for ALL requests
  try {
    if (!config.method || typeof config.method !== 'string' || config.method.trim() === '') {
      config.method = 'GET';
    } else {
      config.method = config.method.toUpperCase();
    }
  } catch {
    config.method = 'GET';
  }

  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const templateService = {
  /**
   * Get list of templates with filters and pagination
   */
  async getTemplates(
    filters?: TemplateFilters,
    page = 1,
    limit = 20
  ): Promise<TemplateListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive.toString() }),
      ...(filters?.search && { search: filters.search }),
    });

    const response = await apiClient.get<TemplateListResponse>(
      `/api/v1/templates?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get single template by ID
   */
  async getTemplate(id: string, includeVersions = true): Promise<Template> {
    const params = new URLSearchParams({
      includeVersions: includeVersions.toString(),
    });

    const response = await apiClient.get<TemplateResponse>(
      `/api/v1/templates/${id}?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Create new template
   */
  async createTemplate(data: CreateTemplateData): Promise<Template> {
    const response = await apiClient.post<TemplateResponse>(
      '/api/v1/templates',
      data
    );
    return response.data.data;
  },

  /**
   * Update existing template
   */
  async updateTemplate(id: string, data: UpdateTemplateData): Promise<Template> {
    const response = await apiClient.put<TemplateResponse>(
      `/api/v1/templates/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/templates/${id}`
    );
    return response.data;
  },

  /**
   * Duplicate template
   */
  async duplicateTemplate(id: string, newName: string): Promise<Template> {
    const response = await apiClient.post<TemplateResponse>(
      `/api/v1/templates/${id}/duplicate`,
      { name: newName }
    );
    return response.data.data;
  },

  /**
   * Get template versions
   */
  async getVersions(templateId: string): Promise<TemplateVersion[]> {
    const response = await apiClient.get<{ success: boolean; data: TemplateVersion[] }>(
      `/api/v1/templates/${templateId}/versions`
    );
    return response.data.data;
  },

  /**
   * Restore specific version
   */
  async restoreVersion(templateId: string, versionNumber: number): Promise<Template> {
    const response = await apiClient.post<TemplateResponse>(
      `/api/v1/templates/${templateId}/restore-version`,
      { versionNumber }
    );
    return response.data.data;
  },

  /**
   * Generate PDF preview
   */
  async generatePreview(
    templateId: string,
    mockData?: Record<string, any>
  ): Promise<Blob> {
    const response = await apiClient.post<Blob>(
      `/api/v1/templates/${templateId}/preview`,
      { mockData },
      { responseType: 'blob' }
    );
    return response.data as Blob;
  },
};

export default templateService;
