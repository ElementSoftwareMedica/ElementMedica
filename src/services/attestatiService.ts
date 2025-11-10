/**
 * Attestati Service
 * Service for certificate management with template system integration
 */

import api from './api';

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
  async list(params?: ListAttestatiParams): Promise<Attestato[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.scheduleId) queryParams.append('scheduleId', params.scheduleId);
      if (params?.personId) queryParams.append('personId', params.personId);
      if (params?.year) queryParams.append('year', params.year.toString());
      const queryString = queryParams.toString();
      const url = `/api/v1/attestati${queryString ? `?${queryString}` : ''}`;
      const response = await api.get<Attestato[]>(url);
      return response.data;
    } catch (error) {
      console.error('Error listing attestati:', error);
      throw error;
    }
  }

  async get(id: string): Promise<Attestato> {
    try {
      const response = await api.get<Attestato>(`/api/v1/attestati/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error getting attestato:', error);
      throw error;
    }
  }

  async generate(params: GenerateAttestatoParams): Promise<GenerateAttestatoResponse> {
    try {
      const response = await api.post<GenerateAttestatoResponse>('/api/v1/attestati/generate', params);
      return response.data;
    } catch (error) {
      console.error('Error generating attestato:', error);
      throw error;
    }
  }

  async generateBatch(params: BatchGenerateParams): Promise<BatchGenerateResponse> {
    try {
      const response = await api.post<BatchGenerateResponse>('/api/v1/attestati/generate-batch', params);
      return response.data;
    } catch (error) {
      console.error('Error generating batch attestati:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<{ message: string }> {
    try {
      const response = await api.delete<{ message: string }>(`/api/v1/attestati/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting attestato:', error);
      throw error;
    }
  }

  async deleteMultipleAttestati(ids: string[]): Promise<{ success: boolean; message: string; failedCount?: number }> {
    try {
      try {
        const response = await api.post<{ success: boolean; message: string; deleted?: number }>('/api/v1/attestati/delete-batch', { ids });
        return {
          success: true,
          message: response.data.message || `${response.data.deleted || ids.length} attestati eliminati`,
          failedCount: 0
        };
      } catch (batchError: any) {
        if (batchError.response?.status === 404) {
          // Fallback: sequential delete with delay to avoid rate limiting
          const results: Array<{ status: 'fulfilled' | 'rejected' }> = [];
          for (const id of ids) {
            try {
              await this.delete(id);
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
          throw new Error('Failed to delete any attestati');
        }
        throw batchError;
      }
    } catch (error) {
      console.error('Error in deleteMultipleAttestati:', error);
      throw error;
    }
  }

  async download(id: string): Promise<void> {
    try {
      const response = await api.get<Blob>(`/api/v1/attestati/${id}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attestato_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attestato:', error);
      throw error;
    }
  }

  getDownloadUrl(id: string): string {
    return `/api/v1/attestati/${id}/download`;
  }

  async downloadZipBatch(attestatoIds: string[]): Promise<void> {
    try {
      const response = await api.post<Blob>('/api/v1/attestati/download-zip-batch', { attestatoIds }, { responseType: 'blob' });
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
      console.error('Error downloading ZIP batch:', error);
      throw error;
    }
  }

  async sendEmail(id: string, params?: SendEmailParams): Promise<{ message: string; recipientEmail: string; attestatoId: string }> {
    try {
      const response = await api.post<{ message: string; recipientEmail: string; attestatoId: string }>(`/api/v1/attestati/${id}/send-email`, params || {});
      return response.data;
    } catch (error) {
      console.error('Error sending attestato email:', error);
      throw error;
    }
  }

  async getStatistics(scheduleId: string): Promise<{ total: number; generated: number; pending: number; byYear: Record<number, number> }> {
    try {
      const attestati = await this.list({ scheduleId });
      const byYear = attestati.reduce((acc, a) => {
        const year = a.annoProgressivo;
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      return { total: attestati.length, generated: attestati.length, pending: 0, byYear };
    } catch (error) {
      console.error('Error getting attestati statistics:', error);
      throw error;
    }
  }

  async exists(scheduleId: string, personId: string): Promise<boolean> {
    try {
      const attestati = await this.list({ scheduleId, personId });
      return attestati.length > 0;
    } catch (error) {
      console.error('Error checking attestato existence:', error);
      return false;
    }
  }

  async getForPersons(scheduleId: string, personIds: string[]): Promise<Map<string, Attestato | null>> {
    try {
      const attestati = await this.list({ scheduleId });
      const map = new Map<string, Attestato | null>();
      personIds.forEach((personId) => {
        const attestato = attestati.find((a) => a.personId === personId);
        map.set(personId, attestato || null);
      });
      return map;
    } catch (error) {
      console.error('Error getting attestati for persons:', error);
      throw error;
    }
  }
}

const attestatiService = new AttestatiService();
export default attestatiService;
