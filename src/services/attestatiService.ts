/**
 * Attestati Service
 * Service for certificate management with template system integration
 */

import api from './api';

/**
 * P51: Options for API calls supporting multi-tenant operations
 * Headers are used to pass X-Operate-Tenant-Id for cross-tenant admin operations
 */
export interface ApiOptions {
  headers?: Record<string, string>;
}

export interface Attestato {
  id: string;
  personId: string;
  fileName: string;
  fileUrl: string;
  generatedAt: string;
  annoProgressivo: number;
  numeroProgressivo: number;
  scheduledCourseId: string;
  templateId?: string;
  templateVersion?: number;
  markers?: Record<string, any>;
  generatedBy?: string;
  fileSize?: number;
  // Firma formatore (P65)
  firmaFormatore?: string | null;
  firmaFormatoreAt?: string | null;
  firmaFormatoreId?: string | null;
  firmaPartecipante?: string | null;
  firmaPartecipanteAt?: string | null;
  signedAt?: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    cf: string;
    email?: string;
  };
  scheduledCourse?: {
    id: string;
    course?: {
      id: string;
      title: string;
      code?: string;
      duration?: number;
    };
    trainer?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  template?: {
    id: string;
    name: string;
    version: number;
  };
}

export interface GenerateAttestatoParams {
  scheduleId: string;
  personId: string;
  templateId?: string;
  sendEmail?: boolean;
  validityYears?: number;
}

export interface BatchGenerateParams {
  scheduleId: string;
  personIds: string[];
  templateId?: string;
  sendEmail?: boolean;
  validityYears?: number;
}

export interface GenerateAttestatoResponse {
  attestato: Attestato;
  document: {
    id: string;
    type: string;
    entityId: string;
    templateId: string;
    filePath: string;
    fileUrl: string;
  };
  downloadUrl: string;
}

export interface BatchGenerateResponse {
  batchId: string;
  total: number;
  success: number;
  failed: number;
  results: Array<{
    success: boolean;
    personId: string;
    personName?: string;
    attestatoId?: string;
    downloadUrl?: string;
    error?: string;
  }>;
  errors: Array<{
    personId: string;
    personName?: string;
    error: string;
  }>;
}

export interface SendEmailParams {
  recipientEmail?: string;
  subject?: string;
  message?: string;
}

export interface ListAttestatiParams {
  scheduleId?: string;
  personId?: string;
  year?: number;
}

class AttestatiService {
  /**
   * List attestati with optional filtering
   * P51: Supports optional headers for multi-tenant operations
   */
  async list(params?: ListAttestatiParams, options?: ApiOptions): Promise<Attestato[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.scheduleId) queryParams.append('scheduleId', params.scheduleId);
      if (params?.personId) queryParams.append('personId', params.personId);
      if (params?.year) queryParams.append('year', params.year.toString());
      const queryString = queryParams.toString();
      const url = `/api/v1/attestati${queryString ? `?${queryString}` : ''}`;
      const response = await api.get<Attestato[]>(url, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single attestato by ID
   * P51: Supports optional headers for multi-tenant operations
   */
  async get(id: string, options?: ApiOptions): Promise<Attestato> {
    try {
      const response = await api.get<Attestato>(`/api/v1/attestati/${id}`, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate single attestato
   * P51: Supports optional headers for multi-tenant operations
   */
  async generate(params: GenerateAttestatoParams, options?: ApiOptions): Promise<GenerateAttestatoResponse> {
    try {
      const response = await api.post<GenerateAttestatoResponse>('/api/v1/attestati/generate', params, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate batch attestati
   * P51: Supports optional headers for multi-tenant operations
   */
  async generateBatch(params: BatchGenerateParams, options?: ApiOptions): Promise<BatchGenerateResponse> {
    try {
      const response = await api.post<BatchGenerateResponse>('/api/v1/attestati/generate-batch', params, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete single attestato
   * P51: Supports optional headers for multi-tenant operations
   */
  async delete(id: string, options?: ApiOptions): Promise<{ message: string }> {
    try {
      const response = await api.delete<{ message: string }>(`/api/v1/attestati/${id}`, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete multiple attestati
   * P51: Supports optional headers for multi-tenant operations
   */
  async deleteMultipleAttestati(ids: string[], options?: ApiOptions): Promise<{ success: boolean; message: string; failedCount?: number }> {
    try {
      try {
        const response = await api.post<{ success: boolean; message: string; deleted?: number }>('/api/v1/attestati/delete-batch', { ids }, options);
        return {
          success: true,
          message: response.data.message || `${response.data.deleted || ids.length} attestati eliminati`,
          failedCount: 0
        };
      } catch (batchError: unknown) {
        if (batchError.response?.status === 404) {
          // Fallback: sequential delete with delay to avoid rate limiting
          const results: Array<{ status: 'fulfilled' | 'rejected' }> = [];
          for (const id of ids) {
            try {
              await this.delete(id, options);
              results.push({ status: 'fulfilled' });
              // Delay 500ms between requests to avoid 429
              if (ids.indexOf(id) < ids.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (err) {
              results.push({ status: 'rejected' });
            }
          }
          const succeeded = results.filter((r) => r.status === 'fulfilled').length;
          const failed = results.filter((r) => r.status === 'rejected').length;
          if (succeeded > 0) {
            return { success: true, message: `Deleted ${succeeded}/${ids.length} attestati`, failedCount: failed };
          }
          throw new Error('Errore nell\'eliminazione degli attestati');
        }
        throw batchError;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Download attestato PDF
   * P51: Supports optional headers for multi-tenant operations
   */
  async download(id: string, options?: ApiOptions): Promise<void> {
    try {
      const response = await api.get<Blob>(`/api/v1/attestati/${id}/download`, {
        responseType: 'blob',
        ...options
      });
      const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Extract filename from Content-Disposition header if present
      let filename = `attestato_${id}.pdf`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        // Parse filename from "attachment; filename="..." or filename*=UTF-8''..."
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
          // Decode URI-encoded filename
          try {
            filename = decodeURIComponent(filename);
          } catch {
            // Keep original if decoding fails
          }
        }
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw error;
    }
  }

  getDownloadUrl(id: string): string {
    return `/api/v1/attestati/${id}/download`;
  }

  /**
   * Download multiple attestati as ZIP
   * P51: Supports optional headers for multi-tenant operations
   */
  async downloadZipBatch(attestatoIds: string[], options?: ApiOptions): Promise<void> {
    try {
      const response = await api.post<Blob>('/api/v1/attestati/download-zip-batch', { attestatoIds }, {
        responseType: 'blob',
        ...options
      });
      const blob = new Blob([response.data as BlobPart], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attestati_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send attestato via email
   * P51: Supports optional headers for multi-tenant operations
   */
  async sendEmail(id: string, params?: SendEmailParams, options?: ApiOptions): Promise<{ message: string; recipientEmail: string; attestatoId: string }> {
    try {
      const response = await api.post<{ message: string; recipientEmail: string; attestatoId: string }>(`/api/v1/attestati/${id}/send-email`, params || {}, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get statistics for a schedule
   * P51: Supports optional headers for multi-tenant operations
   */
  async getStatistics(scheduleId: string, options?: ApiOptions): Promise<{ total: number; generated: number; pending: number; byYear: Record<number, number> }> {
    try {
      const attestati = await this.list({ scheduleId }, options);
      const byYear = attestati.reduce((acc, a) => {
        const year = a.annoProgressivo;
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      return { total: attestati.length, generated: attestati.length, pending: 0, byYear };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if attestato exists for schedule/person combination
   * P51: Supports optional headers for multi-tenant operations
   */
  async exists(scheduleId: string, personId: string, options?: ApiOptions): Promise<boolean> {
    try {
      const attestati = await this.list({ scheduleId, personId }, options);
      return attestati.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get attestati for multiple persons in a schedule
   * P51: Supports optional headers for multi-tenant operations
   */
  async getForPersons(scheduleId: string, personIds: string[], options?: ApiOptions): Promise<Map<string, Attestato | null>> {
    try {
      const attestati = await this.list({ scheduleId }, options);
      const map = new Map<string, Attestato | null>();
      personIds.forEach((personId) => {
        const attestato = attestati.find((a) => a.personId === personId);
        map.set(personId, attestato || null);
      });
      return map;
    } catch (error) {
      throw error;
    }
  }
}

const attestatiService = new AttestatiService();
export default attestatiService;