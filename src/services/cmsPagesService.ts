/**
 * CMS Pages Service
 * Client TypeScript per API gestione pagine CMS
 * 
 * Features:
 * - CRUD completo pagine
 * - Publish/Unpublish
 * - Duplicate
 * - Type-safe con TypeScript
 */

import apiClient from './apiClient';

export interface CMSPageContent {
  [key: string]: any;
}

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: CMSPageContent;
  blocks?: any[];
  layout: 'full-width' | 'boxed' | 'sidebar-left' | 'sidebar-right';
  status: 'draft' | 'published' | 'scheduled';
  isPublished: boolean;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  tenantId: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CMSPageListFilters {
  status?: 'draft' | 'published' | 'scheduled';
  search?: string;
  page?: number;
  limit?: number;
  tenantId?: string; // Filtro per brand/tenant specifico
}

export interface CMSPageListResponse {
  pages: CMSPage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateCMSPageData {
  slug: string;
  title: string;
  content?: CMSPageContent;
  blocks?: any[];
  layout?: 'full-width' | 'boxed' | 'sidebar-left' | 'sidebar-right';
  seoTitle?: string;
  seoDescription?: string;
}

export interface UpdateCMSPageData {
  slug?: string;
  title?: string;
  content?: CMSPageContent;
  blocks?: any[];
  layout?: 'full-width' | 'boxed' | 'sidebar-left' | 'sidebar-right';
  seoTitle?: string;
  seoDescription?: string;
}

class CMSPagesService {
  private baseURL = '/api/v1/cms/pages';

  /**
   * Lista tutte le pagine CMS
   */
  async listPages(filters?: CMSPageListFilters): Promise<CMSPageListResponse> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.tenantId) params.append('tenantId', filters.tenantId);

    const queryString = params.toString();
    const url = queryString ? `${this.baseURL}?${queryString}` : this.baseURL;

    const response = await apiClient.get<{ success: boolean; data: CMSPageListResponse; error?: string }>(url);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to list pages');
    }

    return response.data.data;
  }

  /**
   * Ottieni singola pagina per ID
   */
  async getPage(id: string): Promise<CMSPage> {
    const response = await apiClient.get<{ success: boolean; data: CMSPage; error?: string }>(`${this.baseURL}/${id}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get page');
    }

    return response.data.data;
  }

  /**
   * Ottieni singola pagina per slug (per frontend pubblico)
   */
  async getBySlug(slug: string): Promise<CMSPage> {
    const response = await apiClient.get<{ success: boolean; data: CMSPage; error?: string }>(`${this.baseURL}/slug/${slug}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Page not found');
    }

    return response.data.data;
  }

  /**
   * Crea nuova pagina
   */
  async createPage(data: CreateCMSPageData): Promise<CMSPage> {
    const response = await apiClient.post<{ success: boolean; data: CMSPage; error?: string }>(this.baseURL, data);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create page');
    }

    return response.data.data;
  }

  /**
   * Aggiorna pagina esistente
   */
  async updatePage(id: string, data: UpdateCMSPageData): Promise<CMSPage> {
    const response = await apiClient.patch<{ success: boolean; data: CMSPage; error?: string }>(`${this.baseURL}/${id}`, data);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update page');
    }

    return response.data.data;
  }

  /**
   * Pubblica pagina
   */
  async publishPage(id: string): Promise<CMSPage> {
    const response = await apiClient.post<{ success: boolean; data: CMSPage; error?: string }>(`${this.baseURL}/${id}/publish`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to publish page');
    }

    return response.data.data;
  }

  /**
   * Unpublish pagina
   */
  async unpublishPage(id: string): Promise<CMSPage> {
    const response = await apiClient.post<{ success: boolean; data: CMSPage; error?: string }>(`${this.baseURL}/${id}/unpublish`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to unpublish page');
    }

    return response.data.data;
  }

  /**
   * Duplica pagina
   */
  async duplicatePage(id: string): Promise<CMSPage> {
    const response = await apiClient.post<{ success: boolean; data: CMSPage; error?: string }>(`${this.baseURL}/${id}/duplicate`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to duplicate page');
    }

    return response.data.data;
  }

  /**
   * Elimina pagina (soft delete)
   */
  async deletePage(id: string): Promise<CMSPage> {
    const response = await apiClient.delete<{ success: boolean; data: CMSPage; error?: string }>(`${this.baseURL}/${id}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete page');
    }

    return response.data.data;
  }

  /**
   * Helper: genera slug da titolo
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Helper: valida slug
   */
  validateSlug(slug: string): boolean {
    return /^[a-z0-9-]+$/.test(slug);
  }
}

export default new CMSPagesService();
