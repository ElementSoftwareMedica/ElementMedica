/**
 * Contact Submissions Service
 * Gestisce l'invio di contact submissions dal frontend pubblico
 */

import { apiGet, apiPost } from './api';

export interface ContactSubmissionData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  privacyAccepted: boolean;
  marketingAccepted?: boolean;
}

export interface ContactSubmissionResponse {
  id: string;
  status: 'pending' | 'processed' | 'archived';
  submittedAt: string;
  message: string;
}

/**
 * Invia una contact submission dal frontend pubblico
 */
export const submitContactForm = async (data: ContactSubmissionData): Promise<ContactSubmissionResponse> => {
  try {
    // Usa l'endpoint pubblico per le submissions dai form pubblici
    const response = await apiPost<ContactSubmissionResponse>('/api/v1/public/contact-submissions', {
      requestType: 'info', // Default type
      ...data
    });

    return response;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error('❌ Errore invio contact form:', error);
    }

    // Type guard per errori con response
    const isAxiosError = (err: unknown): err is { response?: { status?: number; data?: { message?: string } } } => {
      return typeof err === 'object' && err !== null && 'response' in err;
    };

    if (isAxiosError(error)) {
      // Gestione specifica per rate limiting
      if (error.response?.status === 429) {
        throw new Error('Troppe richieste. Riprova tra qualche minuto.');
      }

      // Gestione per errori di validazione
      if (error.response?.status === 400) {
        const errorMessage = 'Dati non validi';
        throw new Error(errorMessage);
      }

      // Gestione per errori del server
      if (error.response?.status && error.response.status >= 500) {
        throw new Error('Errore del server. Riprova più tardi.');
      }
    }

    // Errore generico
    throw new Error('Errore nell\'invio del messaggio. Riprova più tardi.');
  }
};

export const getContactSubmissions = async (): Promise<ContactSubmissionResponse[]> => {
  try {
    const response = await apiGet<ContactSubmissionResponse[]>('/api/v1/submissions');
    return response;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Errore nel recupero delle submissions:', error);
    }
    throw error;
  }
};
