/**
 * Preventivi Service
 * 
 * Frontend service per gestione preventivi
 */

import api from './api';

export interface Preventivo {
  id: string;
  aziendaId: string;
  corsoId?: string;
  scheduleId?: string;
  tipoServizio: string;
  prezzoTotale: number;
  imponibile: number;
  importoIva: number;
  importoFinale: number;
  percentualeIva: number;
  note?: string;
  stato: string;
  dataEmissione: string;
  dataScadenza?: string;
  numeroProgressivo?: number;
  annoProgressivo?: number;
  azienda?: {
    id: string;
    ragioneSociale: string;
  };
  corso?: {
    id: string;
    title: string;
  };
  scontoApplicato?: {
    id: string;
    codice: string;
    percentuale: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PreventiviListParams {
  scheduleId?: string;
  aziendaId?: string;
  stato?: string;
  page?: number;
  limit?: number;
}

class PreventiviService {
  private basePath = '/preventivi';

  /**
   * List preventivi with filters
   */
  async list(params?: PreventiviListParams): Promise<Preventivo[]> {
    const response = await api.get(this.basePath, { params });
    // Backend returns { success, data: [...], pagination }
    const responseData = response.data as any;
    return (responseData?.data || responseData) as Preventivo[];
  }

  /**
   * Get preventivo by ID
   */
  async getById(id: string): Promise<Preventivo> {
    const response = await api.get(`${this.basePath}/${id}`);
    const responseData = response.data as any;
    return (responseData?.data || responseData) as Preventivo;
  }

  /**
   * Create new preventivo
   */
  async create(data: {
    aziendaId: string;
    corsoId?: string;
    scheduleId?: string;
    tipoServizio: string;
    prezzoTotale: number;
    imponibile: number;
    importoIva: number;
    importoFinale: number;
    percentualeIva: number;
    note?: string;
    dataScadenza?: string;
  }): Promise<Preventivo> {
    const response = await api.post(this.basePath, data);
    const responseData = response.data as any;
    return (responseData?.data || responseData) as Preventivo;
  }

  /**
   * Update preventivo
   */
  async update(id: string, data: Partial<Preventivo>): Promise<Preventivo> {
    const response = await api.put(`${this.basePath}/${id}`, data);
    const responseData = response.data as any;
    return (responseData?.data || responseData) as Preventivo;
  }

  /**
   * Delete preventivo
   */
  async delete(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  /**
   * Update preventivo status
   */
  async updateStatus(id: string, stato: string): Promise<Preventivo> {
    const response = await api.patch(`${this.basePath}/${id}/stato`, { stato });
    const responseData = response.data as any;
    return (responseData?.data || responseData) as Preventivo;
  }

  /**
   * Apply sconto to preventivo
   */
  async applySconto(id: string, codiceSconto: string): Promise<Preventivo> {
    const response = await api.post(`${this.basePath}/${id}/applica-sconto`, { 
      codiceSconto 
    });
    const responseData = response.data as any;
    return (responseData?.data || responseData) as Preventivo;
  }

  /**
   * Remove sconto from preventivo
   */
  async removeSconto(id: string): Promise<Preventivo> {
    const response = await api.delete(`${this.basePath}/${id}/rimuovi-sconto`);
    const responseData = response.data as any;
    return (responseData?.data || responseData) as Preventivo;
  }

  /**
   * Download preventivo PDF
   */
  async download(id: string): Promise<void> {
    try {
      console.log('📄 Attempting to download preventivo PDF:', id);
      
      const response = await api.get(`${this.basePath}/${id}/pdf`, {
        responseType: 'blob'
      });
      
      console.log('📄 PDF response received:', {
        status: response.status,
        contentType: response.headers['content-type'],
        dataSize: response.data?.size || 0
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `preventivo_${id}.pdf`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match?.[1]) {
          fileName = match[1];
        }
      }
      
      console.log('📄 Downloading as:', fileName);
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Download initiated successfully');
    } catch (error: any) {
      console.error('❌ PDF Download Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Send preventivo via email
   */
  async send(id: string): Promise<{ message: string }> {
    const response = await api.post(`${this.basePath}/${id}/invia`);
    const responseData = response.data as any;
    return (responseData?.data || responseData) as { message: string };
  }

  /**
   * Accept preventivo
   */
  async accept(id: string): Promise<Preventivo> {
    const response = await api.post(`${this.basePath}/${id}/accetta`);
    const responseData = response.data as any;
    return (responseData?.data || responseData) as Preventivo;
  }

  /**
   * Reject preventivo
   */
  async reject(id: string, motivo?: string): Promise<Preventivo> {
    const response = await api.post(`${this.basePath}/${id}/rifiuta`, { motivo });
    const responseData = response.data as any;
    return (responseData?.data || responseData) as Preventivo;
  }

  /**
   * Get preventivo statistics
   */
  async getStatistics(): Promise<{
    totale: number;
    perStato: Record<string, number>;
    importoTotale: number;
  }> {
    const response = await api.get(`${this.basePath}/statistiche`);
    return response.data as {
      totale: number;
      perStato: Record<string, number>;
      importoTotale: number;
    };
  }
}

export default new PreventiviService();
