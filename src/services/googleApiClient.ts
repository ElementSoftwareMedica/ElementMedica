import { apiGet, apiPost } from './api';

/**
 * Google Docs API endpoints
 */
export const GOOGLE_API_ENDPOINTS = {
  TEMPLATES: '/api/google-docs/templates',
  GENERATE: '/api/google-docs/generate',
  ATTESTATI: '/api/google-docs/attestati',
};

/**
 * Interface for template response
 */
export interface GoogleTemplateResponse {
  success: boolean;
  template?: {
    id: string;
    name: string;
    googleDocsUrl: string;
    type: string;
    isDefault: boolean;
  };
  error?: string;
}

/**
 * Interface for document generation response
 */
export interface GenerateDocumentResponse {
  success: boolean;
  message?: string;
  fileName?: string;
  fileUrl?: string;
  fileFormat?: string;
  error?: string;
  details?: string;
}

/**
 * Interface for attestato generation response
 */
export interface AttestatiResponse extends GenerateDocumentResponse {
  employeeId?: string;
  scheduleId?: string;
}

const getErrorMessage = (error: unknown, fallback = 'Si è verificato un errore'): string => {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return fallback;
};

const getErrorDetails = (error: unknown): string | undefined => {
  if (error && typeof error === 'object' && 'details' in error) {
    const det = (error as { details?: unknown }).details;
    if (typeof det === 'string') return det;
  }
  return undefined;
};

/**
 * Google API client for document template operations
 * This client provides functionality for:
 * - Getting default templates by type
 * - Generating documents from templates
 * - Working with attestati (certificates)
 */
const googleApiClient = {
  /**
   * Get the default template for a document type
   * 
   * @param type - Document type (e.g., 'attestato', 'lettera_incarico')
   * @returns Promise with template response
   */
  async getDefaultTemplate(type: string): Promise<GoogleTemplateResponse> {
    try {
      const response = await apiGet<GoogleTemplateResponse>(
        `${GOOGLE_API_ENDPOINTS.TEMPLATES}/${type}`
      );
      return response;
    } catch (error: unknown) {
      console.error('Error getting default template:', getErrorMessage(error));
      return {
        success: false,
        error: getErrorMessage(error, 'Impossibile ottenere il template predefinito')
      };
    }
  },
  
  /**
   * Generate a document using a template
   * 
   * @param type - Document type
   * @param data - Placeholder data to replace in the template
   * @returns Promise with document generation response
   */
  async generateDocument(type: string, data: Record<string, string>): Promise<GenerateDocumentResponse> {
    try {
      const response = await apiPost<GenerateDocumentResponse>(
        GOOGLE_API_ENDPOINTS.GENERATE,
        { type, data }
      );
      return response;
    } catch (error: unknown) {
      console.error('Error generating document:', getErrorMessage(error));
      return {
        success: false,
        error: getErrorMessage(error, 'Impossibile generare il documento'),
        details: getErrorDetails(error)
      };
    }
  },
  
  /**
   * Generate an attestato (certificate) for a participant
   * 
   * @param scheduledCourseId - ID of the scheduled course 
   * @param employeeId - ID of the employee/participant
   * @returns Promise with attestato generation response
   */
  async generateAttestato(scheduledCourseId: string, employeeId: string): Promise<AttestatiResponse> {
    try {
      const response = await apiGet<AttestatiResponse>(
        `${GOOGLE_API_ENDPOINTS.ATTESTATI}/${scheduledCourseId}/${employeeId}`
      );
      return response;
    } catch (error: unknown) {
      console.error('Error generating attestato:', getErrorMessage(error));
      return {
        success: false,
        error: getErrorMessage(error, "Impossibile generare l'attestato"),
        details: getErrorDetails(error)
      };
    }
  },
  
  /**
   * Generate multiple attestati (certificates) for multiple participants
   * 
   * @param scheduledCourseId - ID of the scheduled course
   * @param employeeIds - Array of employee/participant IDs
   * @returns Promise with multiple attestato generation responses
   */
  async generateMultipleAttestati(
    scheduledCourseId: string, 
    employeeIds: string[]
  ): Promise<AttestatiResponse[]> {
    const results: AttestatiResponse[] = [];
    
    for (const employeeId of employeeIds) {
      try {
        const response = await this.generateAttestato(scheduledCourseId, employeeId);
        results.push({
          ...response,
          employeeId,
          scheduleId: scheduledCourseId
        });
      } catch (error: unknown) {
        results.push({
          success: false,
          error: `Errore per partecipante ${employeeId}: ${getErrorMessage(error)}`,
          employeeId,
          scheduleId: scheduledCourseId
        });
      }
    }
    
    return results;
  }
};

export default googleApiClient;