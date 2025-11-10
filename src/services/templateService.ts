/**
 * Template Service
 * 
 * Service for template management operations.
 * Handles API calls to template endpoints following project patterns.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './api';
import type {
  Template,
  TemplateVersion,
  TemplateListParams,
  TemplateListResponse,
  TemplateCreateData,
  TemplateUpdateData,
  MarkerValidationResult,
  MarkerPreviewResult,
  DocumentGenerateParams,
  BatchGenerateParams,
  BatchGenerateResponse,
  TemplateStatistics,
  RollbackVersionResponse,
} from '../types/templates';

/**
 * Template Service Class
 */
class TemplateService {
  private readonly basePath = '/api/v1/templates';

  /**
   * Get template statistics
   */
  async getStatistics(): Promise<TemplateStatistics> {
    return await apiGet<TemplateStatistics>(`${this.basePath}/statistics`);
  }

  /**
   * List templates with pagination and filters
   */
  async list(params?: TemplateListParams): Promise<TemplateListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      if (params.page) queryParams.append('page', String(params.page));
      if (params.limit) queryParams.append('limit', String(params.limit));
      if (params.type) queryParams.append('type', params.type);
      if (params.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
      if (params.isDefault !== undefined) queryParams.append('isDefault', String(params.isDefault));
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);
    }

    const query = queryParams.toString();
    const url = query ? `${this.basePath}?${query}` : this.basePath;
    
    return await apiGet<TemplateListResponse>(url);
  }

  /**
   * Get single template by ID
   */
  async get(id: string): Promise<Template> {
    return await apiGet<Template>(`${this.basePath}/${id}`);
  }

  /**
   * Create new template
   */
  async create(data: TemplateCreateData): Promise<Template> {
    return await apiPost<Template>(this.basePath, data);
  }

  /**
   * Update template (creates new version automatically)
   */
  async update(id: string, data: TemplateUpdateData): Promise<Template> {
    return await apiPut<Template>(`${this.basePath}/${id}`, data);
  }

  /**
   * Delete template (soft delete)
   */
  async delete(id: string): Promise<void> {
    await apiDelete(`${this.basePath}/${id}`);
  }

  /**
   * Validate template markers
   */
  async validate(id: string, mockData?: Record<string, any>): Promise<MarkerValidationResult> {
    return await apiPost<MarkerValidationResult>(
      `${this.basePath}/${id}/validate`,
      { mockData: mockData || {} }
    );
  }

  /**
   * Preview template with mock data
   */
  async preview(id: string, mockData?: Record<string, any>): Promise<MarkerPreviewResult> {
    return await apiPost<MarkerPreviewResult>(
      `${this.basePath}/${id}/preview`,
      { mockData: mockData || {} }
    );
  }

  /**
   * Get template version history
   */
  async getVersions(id: string): Promise<TemplateVersion[]> {
    return await apiGet<TemplateVersion[]>(`${this.basePath}/${id}/versions`);
  }

  /**
   * Rollback template to previous version
   */
  async rollbackToVersion(id: string, version: number): Promise<RollbackVersionResponse> {
    return await apiPost<RollbackVersionResponse>(
      `${this.basePath}/${id}/versions/${version}/rollback`,
      {}
    );
  }

  /**
   * Generate single document from template
   */
  async generateDocument(id: string, params: DocumentGenerateParams): Promise<any> {
    return await apiPost<any>(`${this.basePath}/${id}/generate`, params);
  }

  /**
   * Generate batch documents (queued)
   */
  async generateBatch(id: string, params: BatchGenerateParams): Promise<BatchGenerateResponse> {
    return await apiPost<BatchGenerateResponse>(
      `${this.basePath}/${id}/generate-batch`,
      params
    );
  }

  /**
   * Helper: Get active templates only
   */
  async listActive(params?: Omit<TemplateListParams, 'isActive'>): Promise<TemplateListResponse> {
    return this.list({ ...params, isActive: true });
  }

  /**
   * Helper: Get default templates by type
   */
  async getDefaultByType(type: string): Promise<Template | null> {
    const response = await this.list({
      type: type as any,
      isDefault: true,
      limit: 1,
    });
    
    return response.data.length > 0 ? response.data[0] : null;
  }

  /**
   * Helper: Get templates by category
   */
  async listByCategory(category: string, params?: TemplateListParams): Promise<TemplateListResponse> {
    return this.list({ ...params, category });
  }

  /**
   * Helper: Search templates
   */
  async search(query: string, params?: TemplateListParams): Promise<TemplateListResponse> {
    return this.list({ ...params, search: query });
  }

  /**
   * Helper: Check if template name exists
   */
  async nameExists(name: string): Promise<boolean> {
    try {
      const response = await this.search(name, { limit: 100 });
      return response.data.some(t => t.name.toLowerCase() === name.toLowerCase());
    } catch {
      return false;
    }
  }

  /**
   * Helper: Duplicate template
   */
  async duplicate(id: string, newName?: string): Promise<Template> {
    const original = await this.get(id);
    
    const duplicateData: TemplateCreateData = {
      name: newName || `${original.name} (Copia)`,
      type: original.type,
      content: original.content,
      header: original.header,
      footer: original.footer,
      styles: original.styles,
      layout: original.layout,
      markers: original.markers,
      markerSchema: original.markerSchema,
      description: original.description,
      category: original.category,
      tags: [...(original.tags || [])],
      isDefault: false, // Never set duplicate as default
    };

    return this.create(duplicateData);
  }

  /**
   * Helper: Set template as default for its type
   */
  async setAsDefault(id: string): Promise<Template> {
    return this.update(id, { isDefault: true });
  }

  /**
   * Helper: Activate/deactivate template
   */
  async setActive(id: string, isActive: boolean): Promise<Template> {
    return this.update(id, { isActive });
  }
}

// Export singleton instance
export const templateService = new TemplateService();
export default templateService;
