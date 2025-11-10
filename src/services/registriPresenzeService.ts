/**
 * Registri Presenze Service
 * 
 * Frontend service per gestione registri presenze
 * con integrazione template system
 */

import api from './api';

export interface AttendanceData {
  personId: string;
  present: boolean;
  hours?: number;
  note?: string;
}

export interface RegistroPresenze {
  id: string;
  scheduledCourseId: string;
  sessionId: string;
  formatoreId: string;
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
  session?: {
    id: string;
    date: string;
    start: string;
    end: string;
    trainer?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    coTrainer?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  formatore?: {
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
  presenti?: Array<{
    id: string;
    personId: string;
    presente: boolean;
    ore: number;
    note?: string;
    person: {
      id: string;
      firstName: string;
      lastName: string;
      cf?: string;
    };
  }>;
}

export interface GenerateRegistroParams {
  sessionId: string;
  formatoreId: string;
  templateId?: string;
  attendanceData?: AttendanceData[];
}

export interface GenerateRegistroResponse {
  registro: RegistroPresenze;
  document: {
    id: string;
    filename: string;
    fileUrl: string;
    status: string;
  };
  downloadUrl: string;
}

class RegistriPresenzeService {
  private baseUrl = '/api/v1/registri-presenze';

  /**
   * Ottiene tutti i registri presenze
   */
  async list(params?: {
    scheduleId?: string;
    sessionId?: string;
    formatoreId?: string;
  }): Promise<RegistroPresenze[]> {
    const queryParams = new URLSearchParams();
    if (params?.scheduleId) queryParams.append('scheduleId', params.scheduleId);
    if (params?.sessionId) queryParams.append('sessionId', params.sessionId);
    if (params?.formatoreId) queryParams.append('formatoreId', params.formatoreId);

    const url = queryParams.toString() 
      ? `${this.baseUrl}?${queryParams.toString()}`
      : this.baseUrl;

    const response = await api.get<RegistroPresenze[]>(url);
    return response.data;
  }

  /**
   * Ottiene un singolo registro presenze
   */
  async get(id: string): Promise<RegistroPresenze> {
    const response = await api.get<RegistroPresenze>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Genera un nuovo registro presenze da template
   */
  async generate(params: GenerateRegistroParams): Promise<GenerateRegistroResponse> {
    const response = await api.post<GenerateRegistroResponse>(
      `${this.baseUrl}/generate`,
      params
    );
    return response.data;
  }

  /**
   * Aggiorna i dati di presenza
   */
  async updateAttendance(
    id: string,
    attendanceData: AttendanceData[]
  ): Promise<{ message: string }> {
    const response = await api.put<{ message: string }>(
      `${this.baseUrl}/${id}/attendance`,
      { attendanceData }
    );
    return response.data;
  }

  /**
   * Elimina un registro presenze (soft delete)
   */
  async delete(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Scarica il PDF di un registro
   */
  async download(id: string): Promise<void> {
    // Ottiene i dettagli del registro per il download URL
    const registro = await this.get(id);
    
    // Apre il download in una nuova finestra
    window.open(registro.url, '_blank');
  }

  /**
   * Ottiene l'URL di download diretto
   */
  getDownloadUrl(id: string): string {
    return `${this.baseUrl}/${id}/download`;
  }
}

export const registriPresenzeService = new RegistriPresenzeService();
export default registriPresenzeService;
