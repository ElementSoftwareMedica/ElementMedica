import { apiGet, apiPost, apiDelete } from './api';
import { API_ENDPOINTS } from '../config/api';

interface Template {
  id: string;
  type: string;
  url: string;
  googleDocsUrl?: string;
  isDefault?: boolean;
}

interface GenerateAttestatiResponse {
  success: boolean;
  message: string;
  attestati: any[];
  errors?: any[];
}

interface CheckExistingAttesatoResult {
  exists: boolean;
  attestatoId?: string;
  name?: string;
}

/**
 * Attestati service for managing course certificates
 */
const attestatiService = {
  /**
   * Get all attestati documents
   */
  async getAllAttestati() {
    try {
      return await apiGet(`/api${API_ENDPOINTS.ATTESTATI}`);
    } catch (error) {
      console.error('Error fetching attestati:', error);
      throw error;
    }
  },
  
  /**
   * Check if attestato exists for a specific employee and course
   */
  async checkExistingAttestato(scheduledCourseId: string, employeeId: string): Promise<CheckExistingAttesatoResult> {
    try {
      return await apiGet<CheckExistingAttesatoResult>(
        `/api/attestati/check-existing?scheduledCourseId=${scheduledCourseId}&employeeId=${employeeId}`
      );
    } catch (error) {
      console.error('Error checking for existing attestato:', error);
      return { exists: false };
    }
  },
  
  /**
   * Generate attestati for a scheduled course
   */
  async generateAttestati(scheduledCourseId: string, options: { 
    templateId?: string, 
    templateUrl?: string,
    overwriteExisting?: boolean,
    employeeIds?: string[]
  } = {}) {
    try {
      console.log("generateAttestati called with options:", {
        scheduledCourseId,
        ...options
      });
      
      // Get default template if none specified
      let templateUrl = options.templateUrl;
      let templateId = options.templateId;
      
      if (!templateUrl && !templateId) {
        // Fetch available templates
        const templates = await apiGet<Template[]>('/api/template-links');
        const attestatoTemplate = templates.find((tpl) => tpl.type === 'attestato' && tpl.isDefault);
        
        if (!attestatoTemplate) {
          throw new Error('Nessun template attestato configurato nelle impostazioni.');
        }
        
        templateUrl = attestatoTemplate.url;
        templateId = attestatoTemplate.id;
      }
      
      // Build request data
      const requestData: Record<string, any> = {
        scheduledCourseId,
        overwriteExisting: options.overwriteExisting || false
      };
      
      // Add template info
      if (templateUrl) {
        requestData.templateUrl = templateUrl;
      }
      
      if (templateId) {
        requestData.templateId = templateId;
      }
      
      // Add specific employees if provided - IMPORTANT: backend expects participantIds, not employeeIds
      if (options.employeeIds && options.employeeIds.length > 0) {
        requestData.participantIds = options.employeeIds; // Fixed parameter name
        console.log(`Converting employeeIds to participantIds for ${options.employeeIds.length} employees`);
      } else {
        console.warn("No employeeIds provided in options - server will reject request");
      }
      
      // Make API request
      console.log("Sending attestati generation request:", requestData);
      
      // Make API request using centralized service
      console.log("Sending attestati generation request:", requestData);
      
      try {
        const response = await apiPost<GenerateAttestatiResponse>(
          '/api/attestati/genera',
          requestData
        );
        
        console.log("Server responded with:", {
          success: response.success,
          message: response.message,
          attestatiCount: response.attestati?.length || 0
        });
        
        return response;
      } catch (error: any) {
        console.error('Error generating attestati:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error generating attestati:', error);
      throw error;
    }
  },
  
  /**
   * Delete an attestato
   */
  async deleteAttestato(id: string) {
    if (!id) {
      throw new Error('ID attestato non valido');
    }
    
    try {
      console.log(`Attempting to delete attestato ${id}`);
      const result = await apiDelete(`/api/attestati/${id}`);
      console.log(`Successfully deleted attestato ${id}`);
      return result;
    } catch (error: any) {
      console.error('Error deleting attestato:', error);
      throw new Error(`Errore durante l'eliminazione dell'attestato: ${error.message || error}`);
    }
  },
  
  /**
   * Delete multiple attestati at once
   */
  async deleteMultipleAttestati(ids: string[]) {
    if (!ids.length) {
      throw new Error('Nessun attestato selezionato');
    }
    
    try {
      console.log(`Deleting ${ids.length} attestati`);
      
      // Define possible endpoints - using Vite proxy
      const endpoints = [
        `/api/attestati/delete-multiple`,
        `/attestati/delete-multiple`
      ];
      
      // Define different formats for the request payload that servers might expect
      const payloadFormats = [
        { ids },
        { attestatoIds: ids },
        { id: ids }
      ];
      
      let lastError = null;
      
      // Try each endpoint with each payload format
      for (const endpoint of endpoints) {
        for (const payload of payloadFormats) {
          try {
            console.log(`Trying to delete multiple attestati with endpoint: ${endpoint} and payload:`, payload);
            const response = await apiPost(endpoint, payload);
            
            console.log(`Successfully deleted attestati with endpoint: ${endpoint}`);
            return response;
          } catch (error: any) {
            lastError = error;
            console.warn(`Error with endpoint ${endpoint}:`, error.message || error);
          }
        }
      }
      
      // If all batch endpoints failed, try deleting one by one
      console.log('All batch deletion endpoints failed, trying to delete attestati one by one');
      const results = await Promise.allSettled(ids.map(id => this.deleteAttestato(id)));
      
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (succeeded > 0) {
        console.log(`Successfully deleted ${succeeded}/${ids.length} attestati individually`);
        return { 
          success: true,
          message: `Deleted ${succeeded}/${ids.length} attestati`,
          failedCount: failed
        };
      }
      
      // Se arriviamo qui, tutti gli endpoint hanno fallito
      console.error('Error deleting multiple attestati:', lastError);
      throw lastError || new Error('Failed to delete attestati with all available endpoints');
    } catch (error) {
      console.error('Error in deleteMultipleAttestati:', error);
      throw error;
    }
  }
};

export default attestatiService;