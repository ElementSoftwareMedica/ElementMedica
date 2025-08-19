import express from 'express';
import googleApiService from '../utils/googleApiService.js';
import { logger, logAudit } from '../utils/logger.js';
import middleware from '../auth/middleware.js';
import { 
  documentCacheMiddleware, 
  templateCacheMiddleware, 
  cacheInvalidationMiddleware,
  documentInvalidationPatterns,
  templateInvalidationPatterns 
} from '../middleware/cache.js';

const { authenticate: authenticateToken, authorize: requirePermission, requireSameCompany: requireCompanyAccess } = middleware;
const router = express.Router();

/**
 * @route GET /api/google-docs/files
 * @desc Ottiene la lista dei file da Google Drive
 * @access Private (documents:read)
 */
router.get('/files', 
  authenticateToken(), 
  requirePermission('documents:read'),
  documentCacheMiddleware(1800), // Cache for 30 minutes
  async (req, res) => {
    try {
      const { folderId, useCache = 'true' } = req.query;
      const personId = req.person.id;
    const userCompanyId = req.person.companyId;
      
      const files = await googleApiService.listFiles(
        folderId || null, 
        useCache === 'true'
      );
      
      logAudit('google_drive_files_listed', personId, 'google-drive', {
        userCompanyId,
        folderId: folderId || 'root',
        fileCount: files.length,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        data: {
          files,
          folderId: folderId || 'root',
          total: files.length
        }
      });
    } catch (error) {
      logger.error('Error listing Google Drive files', {
        service: 'documents-server',
        personId: req.person?.id,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve files from Google Drive',
        code: 'GOOGLE_DRIVE_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/google-docs/file/:fileId
 * @desc Ottiene i metadati di un file specifico
 * @access Private (documents:read)
 */
router.get('/file/:fileId', 
  authenticateToken(), 
  requirePermission('documents:read'),
  documentCacheMiddleware(1800), // Cache for 30 minutes
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const { useCache = 'true' } = req.query;
      const personId = req.person.id;
    const userCompanyId = req.person.companyId;
      
      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'File ID is required',
          code: 'MISSING_FILE_ID'
        });
      }
      
      const fileMetadata = await googleApiService.getFileMetadata(
        fileId, 
        useCache === 'true'
      );
      
      logAudit('google_drive_file_accessed', personId, 'google-drive', {
        userCompanyId,
        fileId,
        fileName: fileMetadata.name,
        mimeType: fileMetadata.mimeType,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        data: fileMetadata
      });
    } catch (error) {
      logger.error('Error retrieving Google Drive file metadata', {
        service: 'documents-server',
        personId: req.person?.id,
        fileId: req.params.fileId,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve file metadata from Google Drive',
        code: 'GOOGLE_DRIVE_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/google-docs/document/:documentId
 * @desc Ottiene il contenuto di un Google Doc
 * @access Private (documents:read)
 */
router.get('/document/:documentId', 
  authenticateToken(), 
  requirePermission('documents:read'),
  documentCacheMiddleware(900), // Cache for 15 minutes
  async (req, res) => {
    try {
      const { documentId } = req.params;
      const { useCache = 'true' } = req.query;
      const personId = req.person.id;
    const userCompanyId = req.person.companyId;
      
      if (!documentId) {
        return res.status(400).json({
          success: false,
          error: 'Document ID is required',
          code: 'MISSING_DOCUMENT_ID'
        });
      }
      
      const documentContent = await googleApiService.getDocumentContent(
        documentId, 
        useCache === 'true'
      );
      
      logAudit('google_doc_content_accessed', personId, 'google-docs', {
        userCompanyId,
        documentId,
        documentTitle: documentContent.title,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        data: documentContent
      });
    } catch (error) {
      logger.error('Error retrieving Google Doc content', {
        service: 'documents-server',
        personId: req.person?.id,
        documentId: req.params.documentId,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve document content from Google Docs',
        code: 'GOOGLE_DOCS_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/google-docs/template/:templateId/copy
 * @desc Crea una copia di un template Google Doc
 * @access Private (documents:create)
 */
router.post('/template/:templateId/copy', 
  authenticateToken(), 
  requirePermission('documents:create'),
  cacheInvalidationMiddleware(documentInvalidationPatterns),
  async (req, res) => {
    try {
      const { templateId } = req.params;
      const { newName, destinationFolderId } = req.body;
      const personId = req.person.id;
    const userCompanyId = req.person.companyId;
      
      if (!templateId) {
        return res.status(400).json({
          success: false,
          error: 'Template ID is required',
          code: 'MISSING_TEMPLATE_ID'
        });
      }
      
      if (!newName) {
        return res.status(400).json({
          success: false,
          error: 'New document name is required',
          code: 'MISSING_DOCUMENT_NAME'
        });
      }
      
      const newDocument = await googleApiService.copyTemplate(
        templateId,
        newName,
        destinationFolderId
      );
      
      logAudit('google_doc_template_copied', personId, 'google-docs', {
        userCompanyId,
        templateId,
        newDocumentId: newDocument.id,
        newName,
        destinationFolderId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        data: {
          id: newDocument.id,
          name: newDocument.name,
          webViewLink: `https://docs.google.com/document/d/${newDocument.id}/edit`,
          createdFrom: templateId
        }
      });
    } catch (error) {
      logger.error('Error copying Google Doc template', {
        service: 'documents-server',
        personId: req.person?.id,
        templateId: req.params.templateId,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to copy template from Google Docs',
        code: 'GOOGLE_DOCS_ERROR'
      });
    }
  }
);

/**
 * @route PUT /api/google-docs/document/:documentId
 * @desc Aggiorna il contenuto di un Google Doc
 * @access Private (documents:update)
 */
router.put('/document/:documentId', 
  authenticateToken(), 
  requirePermission('documents:update'),
  cacheInvalidationMiddleware(documentInvalidationPatterns),
  async (req, res) => {
    try {
      const { documentId } = req.params;
      const { requests } = req.body;
      const personId = req.person.id;
    const userCompanyId = req.person.companyId;
      
      if (!documentId) {
        return res.status(400).json({
          success: false,
          error: 'Document ID is required',
          code: 'MISSING_DOCUMENT_ID'
        });
      }
      
      if (!requests || !Array.isArray(requests)) {
        return res.status(400).json({
          success: false,
          error: 'Update requests array is required',
          code: 'MISSING_UPDATE_REQUESTS'
        });
      }
      
      const updateResult = await googleApiService.updateDocumentContent(
        documentId,
        requests
      );
      
      logAudit('google_doc_content_updated', personId, 'google-docs', {
        userCompanyId,
        documentId,
        requestCount: requests.length,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        data: {
          documentId,
          updatedRequests: requests.length,
          result: updateResult
        }
      });
    } catch (error) {
      logger.error('Error updating Google Doc content', {
        service: 'documents-server',
        personId: req.person?.id,
        documentId: req.params.documentId,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update document content in Google Docs',
        code: 'GOOGLE_DOCS_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/google-docs/stats
 * @desc Ottiene statistiche del servizio Google API
 * @access Private (admin only)
 */
router.get('/stats', 
  authenticateToken(), 
  requirePermission('system:admin'),
  async (req, res) => {
    try {
      const stats = googleApiService.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error retrieving Google API stats', {
        service: 'documents-server',
        personId: req.person?.id,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve Google API statistics',
        code: 'STATS_ERROR'
      });
    }
  }
);

export default router;