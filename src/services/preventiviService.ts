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

/**
 * Parse preventivo amounts from string to number
 */
function parsePreventivo(p: any): Preventivo {
  return {
    ...p,
    prezzoTotale: typeof p.prezzoTotale === 'string' ? parseFloat(p.prezzoTotale) || 0 : (p.prezzoTotale || 0),
    imponibile: typeof p.imponibile === 'string' ? parseFloat(p.imponibile) || 0 : (p.imponibile || 0),
    importoIva: typeof p.importoIva === 'string' ? parseFloat(p.importoIva) || 0 : (p.importoIva || 0),
    importoFinale: typeof p.importoFinale === 'string' ? parseFloat(p.importoFinale) || 0 : (p.importoFinale || 0),
    percentualeIva: typeof p.percentualeIva === 'string' ? parseFloat(p.percentualeIva) || 0 : (p.percentualeIva || 0),
    aliquotaIva: typeof p.aliquotaIva === 'string' ? parseFloat(p.aliquotaIva) || 0 : (p.aliquotaIva || 0),
  };
}

class PreventiviService {
  private basePath = '/api/v1/preventivi';

  /**
   * List preventivi with filters
   */
  async list(params?: PreventiviListParams): Promise<Preventivo[]> {
    const response = await api.get(this.basePath, { params });
    // Backend returns { success, data: { preventivi: [...], pagination... } }
    const responseData = response.data as any;
    // Handle paginated response: data.preventivi or direct data array
    let preventivi: any[] = [];
    if (responseData?.data?.preventivi) {
      preventivi = responseData.data.preventivi;
    } else if (Array.isArray(responseData?.data)) {
      preventivi = responseData.data;
    } else if (Array.isArray(responseData)) {
      preventivi = responseData;
    }
    // Parse all amounts from string to number
    return preventivi.map(parsePreventivo);
  }

  /**
   * Get preventivo by ID
   */
  async getById(id: string): Promise<Preventivo> {
    const response = await api.get(`${this.basePath}/${id}`);
    const responseData = response.data as any;
    const preventivo = responseData?.data || responseData;
    return parsePreventivo(preventivo);
  }

  /**
   * Create new preventivo
   */
  async create(data: {
    aziendaId: string;
    corsoId?: string;
    scheduleId?: string;
    tipoServizio: string;
    quantita?: number;
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
    const response = await api.put(`${this.basePath}/${id}/stato`, { nuovoStato: stato });
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
        dataSize: (response.data as Blob)?.size || 0
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
