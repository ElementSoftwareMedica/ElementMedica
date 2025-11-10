import { google } from 'googleapis';
import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Service for interacting with Google Docs and Slides APIs
 */
class GoogleDocsService {
  /**
   * Create a copy of a Google Doc or Slide
   * @param {string} accessToken - OAuth2 access token
   * @param {string} fileId - ID of the file to copy
   * @param {string} newTitle - Title for the new copy
   * @returns {Promise<string>} - ID of the copied file
   */
  async copyDocument(accessToken, fileId, newTitle) {
    try {
      // Configure OAuth2 client with access token
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken
      });
      
      const drive = google.drive({ 
        version: 'v3',
        auth: oauth2Client
      });
      
      logger.info('Copying document', {
        component: 'google-docs-service',
        action: 'copyDocument',
        fileId,
        newTitle,
        tokenPrefix: accessToken.substring(0, 20) + '...'
      });
      
      const response = await drive.files.copy({
        fileId,
        requestBody: {
          name: newTitle
        }
      });

      logger.info('Document copied successfully', {
        originalId: fileId,
        newId: response.data.id
      });

      logger.info('Document copied successfully', {
        component: 'google-docs-service',
        action: 'copyDocument',
        originalId: fileId,
        newId: response.data.id
      });

      return response.data.id;
    } catch (error) {
      // Log detailed error for debugging - ONE LINE for easy parsing
      const errorDetails = {
        errorMessage: error.message,
        errorCode: error.code,
        errorResponse: error.response?.data,
        errorStatus: error.response?.status,
        fileId,
        newTitle
      };
      logger.error('Failed to copy document', {
        component: 'google-docs-service',
        action: 'copyDocument',
        error: error.message,
        code: error.code,
        status: error.response?.status,
        fileId,
        newTitle,
        details: JSON.stringify(errorDetails)
      });
      
      logger.error('Failed to copy document', {
        component: 'google-docs-service',
        action: 'copyDocument',
        error: error.message,
        errorDetails: error.response?.data || error.stack,
        fileId,
        newTitle
      });
      throw new Error(`Failed to copy document: ${error.message}`);
    }
  }

  /**
   * Replace placeholders in a Google Doc
   * @param {string} accessToken - OAuth2 access token
   * @param {string} documentId - ID of the document
   * @param {Object} replacements - Key-value pairs for placeholder replacement
   * @returns {Promise<void>}
   */
  async replaceTextInDoc(accessToken, documentId, replacements) {
    try {
      // Configure OAuth2 client with access token
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken
      });
      
      const docs = google.docs({ 
        version: 'v1',
        auth: oauth2Client
      });
      
      // Build batch update requests
      const requests = [];
      
      for (const [placeholder, value] of Object.entries(replacements)) {
        // Support both {{PLACEHOLDER}} and {PLACEHOLDER} formats
        const patterns = [
          `{{${placeholder}}}`,
          `{${placeholder}}`,
          `{{${placeholder.toUpperCase()}}}`,
          `{${placeholder.toUpperCase()}}`
        ];
        
        for (const pattern of patterns) {
          requests.push({
            replaceAllText: {
              containsText: {
                text: pattern,
                matchCase: false
              },
              replaceText: String(value || '')
            }
          });
        }
      }

      if (requests.length > 0) {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests
          }
        });

        logger.info('Placeholders replaced in document', {
          component: 'google-docs-service',
          action: 'replaceTextInDoc',
          documentId,
          replacementsCount: Object.keys(replacements).length
        });
      }
    } catch (error) {
      logger.error('Failed to replace text in document', {
        component: 'google-docs-service',
        action: 'replaceTextInDoc',
        error: error.message
      });
      throw new Error(`Failed to replace text: ${error.message}`);
    }
  }

  /**
   * Replace placeholders in a Google Slides presentation
   * @param {string} accessToken - OAuth2 access token
   * @param {string} presentationId - ID of the presentation
   * @param {Object} replacements - Key-value pairs for placeholder replacement
   * @returns {Promise<void>}
   */
  async replaceTextInSlides(accessToken, presentationId, replacements) {
    try {
      // Configure OAuth2 client with access token
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken
      });
      
      const slides = google.slides({ 
        version: 'v1',
        auth: oauth2Client
      });
      
      // Build batch update requests
      const requests = [];
      
      for (const [placeholder, value] of Object.entries(replacements)) {
        // Support both {{PLACEHOLDER}} and {PLACEHOLDER} formats
        const patterns = [
          `{{${placeholder}}}`,
          `{${placeholder}}`,
          `{{${placeholder.toUpperCase()}}}`,
          `{${placeholder.toUpperCase()}}`
        ];
        
        for (const pattern of patterns) {
          requests.push({
            replaceAllText: {
              containsText: {
                text: pattern,
                matchCase: false
              },
              replaceText: String(value || '')
            }
          });
        }
      }

      if (requests.length > 0) {
        await slides.presentations.batchUpdate({
          presentationId,
          requestBody: {
            requests
          }
        });

        logger.info('Placeholders replaced in presentation', {
          component: 'google-docs-service',
          action: 'replaceTextInSlides',
          presentationId,
          replacementsCount: Object.keys(replacements).length
        });
      }
    } catch (error) {
      logger.error('Failed to replace text in presentation', {
        component: 'google-docs-service',
        action: 'replaceTextInSlides',
        error: error.message
      });
      throw new Error(`Failed to replace text: ${error.message}`);
    }
  }

  /**
   * Export a Google Doc or Slide as PDF
   * @param {string} accessToken - OAuth2 access token
   * @param {string} fileId - ID of the file to export
   * @param {string} mimeType - MIME type for export ('application/pdf')
   * @returns {Promise<Buffer>} - PDF file buffer
   */
  async exportAsPdf(accessToken, fileId, mimeType = 'application/pdf') {
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`;
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        responseType: 'arraybuffer'
      });

      logger.info('Document exported as PDF', {
        component: 'google-docs-service',
        action: 'exportAsPdf',
        fileId,
        size: response.data.length
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to export document as PDF', {
        component: 'google-docs-service',
        action: 'exportAsPdf',
        error: error.message
      });
      throw new Error(`Failed to export as PDF: ${error.message}`);
    }
  }

  /**
   * Delete a Google Drive file
   * @param {string} accessToken - OAuth2 access token
   * @param {string} fileId - ID of the file to delete
   * @returns {Promise<void>}
   */
  async deleteFile(accessToken, fileId) {
    try {
      // Configure OAuth2 client with access token
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken
      });
      
      const drive = google.drive({ 
        version: 'v3',
        auth: oauth2Client
      });
      
      await drive.files.delete({
        fileId
      });

      logger.info('File deleted', {
        component: 'google-docs-service',
        action: 'deleteFile',
        fileId
      });
    } catch (error) {
      logger.error('Failed to delete file', {
        component: 'google-docs-service',
        action: 'deleteFile',
        error: error.message
      });
      // Don't throw - deletion is not critical
    }
  }

  /**
   * Complete workflow: Copy template, replace placeholders, export as PDF
   * @param {string} accessToken - OAuth2 access token
   * @param {string} templateId - ID of the template file
   * @param {string} documentType - 'docs' or 'slides'
   * @param {Object} replacements - Key-value pairs for placeholder replacement
   * @param {string} title - Title for the generated document
   * @returns {Promise<{pdfBuffer: Buffer, documentId: string}>}
   */
  async generateDocumentFromTemplate(accessToken, templateId, documentType, replacements, title = 'Generated Document') {
    let copiedDocumentId = null;
    
    try {
      logger.info('Starting document generation from template', {
        component: 'google-docs-service',
        action: 'generateDocumentFromTemplate',
        templateId,
        documentType,
        title,
        replacementsCount: Object.keys(replacements || {}).length
      });
      
      // Step 1: Copy the template
      logger.info('Starting document generation', {
        component: 'google-docs-service',
        action: 'generateDocumentFromTemplate',
        templateId,
        documentType,
        title
      });

      copiedDocumentId = await this.copyDocument(accessToken, templateId, title);

      // Step 2: Replace placeholders
      if (documentType === 'docs') {
        await this.replaceTextInDoc(accessToken, copiedDocumentId, replacements);
      } else if (documentType === 'slides') {
        await this.replaceTextInSlides(accessToken, copiedDocumentId, replacements);
      }

      // Step 3: Export as PDF
      const pdfBuffer = await this.exportAsPdf(accessToken, copiedDocumentId);

      logger.info('Document generation completed', {
        component: 'google-docs-service',
        action: 'generateDocumentFromTemplate',
        templateId,
        copiedDocumentId,
        pdfSize: pdfBuffer.length
      });

      // Step 4: Clean up - delete the temporary copied document
      try {
        await this.deleteFile(accessToken, copiedDocumentId);
        logger.info('Temporary document deleted', {
          component: 'google-docs-service',
          action: 'generateDocumentFromTemplate',
          copiedDocumentId
        });
      } catch (cleanupError) {
        // Log but don't fail the entire operation if cleanup fails
        logger.warn('Failed to delete temporary document', {
          component: 'google-docs-service',
          action: 'generateDocumentFromTemplate',
          copiedDocumentId,
          error: cleanupError.message
        });
      }

      return {
        pdfBuffer,
        documentId: copiedDocumentId
      };
    } catch (error) {
      // Clean up: delete the copied document if something went wrong
      if (copiedDocumentId) {
        await this.deleteFile(accessToken, copiedDocumentId);
      }
      
      logger.error('Document generation failed', {
        component: 'google-docs-service',
        action: 'generateDocumentFromTemplate',
        error: error.message
      });
      
      throw error;
    }
  }
}

export default new GoogleDocsService();
