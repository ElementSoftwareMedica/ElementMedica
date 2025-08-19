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
    } catch (error: any) {
      console.error('Error getting default template:', error);
      return {
        success: false,
        error: error.message || 'Impossibile ottenere il template predefinito'
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
    } catch (error: any) {
      console.error('Error generating document:', error);
      return {
        success: false,
        error: error.message || 'Impossibile generare il documento',
        details: error.details || error.message
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
    } catch (error: any) {
      console.error('Error generating attestato:', error);
      return {
        success: false,
        error: error.message || 'Impossibile generare l\'attestato',
        details: error.details || error.message
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
      } catch (error: any) {
        results.push({
          success: false,
          error: `Errore per partecipante ${employeeId}: ${error.message}`,
          employeeId,
          scheduleId: scheduledCourseId
        });
      }
    }
    
    return results;
  }
};

export default googleApiClient;