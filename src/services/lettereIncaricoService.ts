/**
 * Lettere Incarico Service
 * 
 * Frontend service per gestione lettere di incarico
 * con integrazione template system
 */

import api from './api';

export interface LetteraIncarico {
  id: string;
  scheduledCourseId: string;
  trainerId: string;
  nomeFile: string;
  url: string;
  dataGenerazione: string;
  numeroProgressivo: number;
  annoProgressivo: number;
  templateId?: string;
  templateVersion?: number;
  markers?: Record<string, any>;
  generatedBy?: string;
  fileSize?: number;
  scheduledCourse?: {
    id: string;
    course: {
      id: string;
      title: string;
      code?: string;
    };
    startDate: string;
    endDate: string;
    companies?: Array<{
      company: {
        id: string;
        name: string;
      };
    }>;
  };
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  template?: {
    id: string;
    name: string;
    version: number;
  };
}

export interface GenerateLetteraParams {
  scheduleId: string;
  trainerId: string;
  templateId?: string;
  hourlyRate?: number;
  expenses?: number;
  sendEmail?: boolean;
  email?: string;
}

export interface GenerateBatchParams {
  scheduleId: string;
  trainerIds: string[];
  templateId?: string;
  /** Map di trainerId -> { hourlyRate, expenses } */
  trainerCompensation?: Record<string, { hourlyRate?: number; expenses?: number }>;
  sendEmail?: boolean;
}

export interface GenerateLetteraResponse {
  lettera: LetteraIncarico;
  document: {
    id: string;
    filename: string;
    fileUrl: string;
    status: string;
  };
  downloadUrl: string;
}

export interface BatchJobResponse {
  batchId: string;
  status: string;
  total: number;
  message: string;
}

class LettereIncaricoService {
  private baseUrl = '/api/v1/lettere-incarico';

  /**
   * Ottiene tutte le lettere di incarico
   */
  async list(params?: {
    scheduleId?: string;
    trainerId?: string;
  }): Promise<LetteraIncarico[]> {
    const queryParams = new URLSearchParams();
    if (params?.scheduleId) queryParams.append('scheduleId', params.scheduleId);
    if (params?.trainerId) queryParams.append('trainerId', params.trainerId);

    const url = queryParams.toString()
      ? `${this.baseUrl}?${queryParams.toString()}`
      : this.baseUrl;

    const response = await api.get<LetteraIncarico[]>(url);
    return response.data;
  }

  /**
   * Ottiene una singola lettera di incarico
   */
  async get(id: string): Promise<LetteraIncarico> {
    const response = await api.get<LetteraIncarico>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Genera una nuova lettera di incarico da template
   */
  async generate(params: GenerateLetteraParams): Promise<GenerateLetteraResponse> {
    const response = await api.post<GenerateLetteraResponse>(
      `${this.baseUrl}/generate`,
      params
    );
    return response.data;
  }

  /**
   * Genera lettere per più formatori in batch
   */
  async generateBatch(params: GenerateBatchParams): Promise<BatchJobResponse> {
    const response = await api.post<BatchJobResponse>(
      `${this.baseUrl}/generate-batch`,
      params
    );
    return response.data;
  }

  /**
   * Elimina una lettera di incarico (soft delete)
   */
  async delete(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Scarica il PDF di una lettera
   */
  async download(id: string): Promise<void> {
    // Ottiene i dettagli della lettera per il download URL
    const lettera = await this.get(id);

    // Forza il download invece di aprire in nuova tab
    const link = document.createElement('a');
    link.href = lettera.url;
    link.download = lettera.nomeFile || `lettera_${id}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Ottiene l'URL di download diretto
   */
  getDownloadUrl(id: string): string {
    return `${this.baseUrl}/${id}/download`;
  }

  /**
   * Scarica lettere in batch come ZIP
   */
  async downloadZip(scheduleId: string, letterIds?: string[]): Promise<void> {
    try {
      const params = letterIds?.length
        ? `?ids=${letterIds.join(',')}`
        : '';

      const response = await api.get(
        `${this.baseUrl}/schedule/${scheduleId}/download-zip${params}`,
        { responseType: 'blob' }
      );

      // Crea un link per il download
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lettere_incarico_${scheduleId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      throw error;
    }
  }
}

export const lettereIncaricoService = new LettereIncaricoService();
export default lettereIncaricoService;
