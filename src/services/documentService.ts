/**
 * Document Service
 * 
 * Service for generated document management operations.
 * Handles API calls to document endpoints.
 */

import { apiGet, apiPost, apiDelete } from './api';
import { getToken } from './auth';
import type {
  GeneratedDocument,
  DocumentListParams,
  DocumentListResponse,
  BatchStatusResponse,
  DocumentStatistics,
  ResendDocumentParams,
  ResendDocumentResponse,
} from '../types/templates';

/**
 * Document Service Class
 */
class DocumentService {
  private readonly basePath = '/api/v1/documents';

  /**
   * Get document statistics
   */
  async getStatistics(): Promise<DocumentStatistics> {
    return await apiGet<DocumentStatistics>(`${this.basePath}/statistics`);
  }

  /**
   * List generated documents with pagination and filters
   */
  async list(params?: DocumentListParams): Promise<DocumentListResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.page) queryParams.append('page', String(params.page));
      if (params.limit) queryParams.append('limit', String(params.limit));
      if (params.templateId) queryParams.append('templateId', params.templateId);
      if (params.type) queryParams.append('type', params.type);
      if (params.status) queryParams.append('status', params.status);
      if (params.entityType) queryParams.append('entityType', params.entityType);
      if (params.entityId) queryParams.append('entityId', params.entityId);
      if (params.batchId) queryParams.append('batchId', params.batchId);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
    }

    const query = queryParams.toString();
    const url = query ? `${this.basePath}?${query}` : this.basePath;

    return await apiGet<DocumentListResponse>(url);
  }

  /**
   * Get single document metadata by ID
   */
  async get(id: string): Promise<GeneratedDocument> {
    return await apiGet<GeneratedDocument>(`${this.basePath}/${id}`);
  }

  /**
   * Get document download URL
   */
  getDownloadUrl(id: string): string {
    return `${this.basePath}/${id}/download`;
  }

  /**
   * Download document (triggers browser download)
   * Note: This should be used with window.open() or <a href>
   */
  async download(id: string): Promise<void> {
    // Get auth token for download link
    const token = getToken();

    // Create temporary link and trigger download
    const url = this.getDownloadUrl(id);
    const link = document.createElement('a');
    link.href = token ? `${url}?token=${token}` : url;
    link.download = ''; // Let server set filename via Content-Disposition
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Get batch generation status
   */
  async getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    return await apiGet<BatchStatusResponse>(`${this.basePath}/batch/${batchId}/status`);
  }

  /**
   * Delete document (soft delete)
   */
  async delete(id: string): Promise<void> {
    await apiDelete(`${this.basePath}/${id}`);
  }

  /**
   * Resend document via email
   */
  async resend(id: string, params: ResendDocumentParams): Promise<ResendDocumentResponse> {
    return await apiPost<ResendDocumentResponse>(
      `${this.basePath}/${id}/resend`,
      params
    );
  }

  /**
   * Helper: Get documents by template
   */
  async listByTemplate(templateId: string, params?: DocumentListParams): Promise<DocumentListResponse> {
    return this.list({ ...params, templateId });
  }

  /**
   * Helper: Get documents by entity
   */
  async listByEntity(entityType: string, entityId: string, params?: DocumentListParams): Promise<DocumentListResponse> {
    return this.list({ ...params, entityType, entityId });
  }

  /**
   * Helper: Get documents by batch
   */
  async listByBatch(batchId: string, params?: DocumentListParams): Promise<DocumentListResponse> {
    return this.list({ ...params, batchId });
  }

  /**
   * Helper: Get documents by status
   */
  async listByStatus(status: string, params?: DocumentListParams): Promise<DocumentListResponse> {
    return this.list({ ...params, status: status as any });
  }

  /**
   * Helper: Get documents in date range
   */
  async listByDateRange(startDate: string, endDate: string, params?: DocumentListParams): Promise<DocumentListResponse> {
    return this.list({ ...params, startDate, endDate });
  }

  /**
   * Helper: Get recent documents
   */
  async listRecent(limit = 10): Promise<DocumentListResponse> {
    return this.list({ limit, page: 1 });
  }

  /**
   * Helper: Poll batch status until complete
   * Returns a Promise that resolves when batch is complete or rejects on error
   */
  async pollBatchStatus(
    batchId: string,
    options: {
      interval?: number;
      timeout?: number;
      onProgress?: (status: BatchStatusResponse) => void;
    } = {}
  ): Promise<BatchStatusResponse> {
    const {
      interval = 2000, // Check every 2 seconds
      timeout = 300000, // 5 minutes timeout
      onProgress,
    } = options;

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const check = async () => {
        try {
          // Check timeout
          if (Date.now() - startTime > timeout) {
            reject(new Error('Batch generation timeout'));
            return;
          }

          // Get current status
          const status = await this.getBatchStatus(batchId);

          // Call progress callback
          if (onProgress) {
            onProgress(status);
          }

          // Check if complete
          if (status.completed + status.failed >= status.total) {
            resolve(status);
            return;
          }

          // Schedule next check
          setTimeout(check, interval);
        } catch (error) {
          reject(error);
        }
      };

      // Start checking
      check();
    });
  }

  /**
   * Helper: Delete multiple documents
   */
  async deleteMany(ids: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await this.delete(id);
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Helper: Resend multiple documents
   */
  async resendMany(
    ids: string[],
    email: string,
    subject?: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await this.resend(id, { email, subject });
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Get documents for a patient (Cartella Sanitaria)
   * @param pazienteId - ID of the patient
   * @param params - Optional filter params
   * @returns Documents linked to the patient via metadata.pazienteId
   */
  async listByPaziente(
    pazienteId: string,
    params?: Omit<DocumentListParams, 'entityType' | 'entityId'>
  ): Promise<{
    data: GeneratedDocument[];
    paziente: { id: string; nome: string; cognome: string };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const queryParams: Record<string, string | number> = {};

    if (params?.type) queryParams.type = params.type;
    if (params?.status) queryParams.status = params.status;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;

    return await apiGet<{
      data: GeneratedDocument[];
      paziente: { id: string; nome: string; cognome: string };
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`${this.basePath}/paziente/${pazienteId}`, queryParams);
  }
}

// Export singleton instance
export const documentService = new DocumentService();
export default documentService;
