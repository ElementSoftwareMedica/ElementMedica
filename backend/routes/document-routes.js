import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../auth/middleware.js';
import logger from '../utils/logger.js';
import { getDocumentService } from '../services/documentService.js';
import storageService from '../services/storageService.js';

const documentService = getDocumentService();
import path from 'path';

const router = express.Router();
const prisma = new PrismaClient();

const { authenticate: authenticateToken, authorize: requirePermission } = middleware;

// GET /api/documents/statistics - Aggregate statistics (BEFORE /:id route)
router.get('/statistics', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const tenantId = req.person.tenantId;

    // Use DocumentService statistics method
    const stats = await documentService.getStatistics(tenantId);

    res.json(stats);
  } catch (error) {
    logger.error('Failed to fetch document statistics', {
      component: 'document-routes',
      action: 'getStatistics',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch statistics'
    });
  }
});

// GET /api/documents - List generated documents
router.get('/', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const {
      templateId,
      type,
      status,
      entityType,
      entityId,
      batchId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;
    const tenantId = req.person.tenantId;

    // Build where clause
    const where = {
      tenantId,
      deletedAt: null,
      ...(templateId && { templateId }),
      ...(type && { type }),
      ...(status && { status }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(batchId && { batchId }),
      ...(startDate && endDate && {
        generatedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      }),
    };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [documents, total] = await Promise.all([
      prisma.generatedDocument.findMany({
        where,
        include: {
          template: {
            select: { id: true, name: true, type: true },
          },
          generator: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { generatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.generatedDocument.count({ where })
    ]);

    res.json({
      data: documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      }
    });
  } catch (error) {
    logger.error('Failed to fetch documents', {
      component: 'document-routes',
      action: 'getDocuments',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch documents'
    });
  }
});

// GET /api/documents/:id - Get single document metadata
router.get('/:id', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    const document = await prisma.generatedDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        template: {
          select: { id: true, name: true, type: true, version: true },
        },
        generator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: `Document with ID ${id} does not exist or has been deleted`
      });
    }

    res.json(document);
  } catch (error) {
    logger.error('Failed to fetch document', {
      component: 'document-routes',
      action: 'getDocument',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      documentId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch document'
    });
  }
});

// GET /api/documents/:id/download - Download document file
router.get('/:id/download', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    // Get document metadata
    const document = await prisma.generatedDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: `Document with ID ${id} does not exist`
      });
    }

    // Update download tracking
    await prisma.generatedDocument.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    logger.info('Document downloaded', {
      component: 'document-routes',
      action: 'downloadDocument',
      documentId: id,
      filename: document.filename,
      personId: req.person.id
    });

    // For local storage, send file
    if (document.filepath) {
      const filePath = path.join(process.cwd(), 'uploads', document.filepath);
      res.download(filePath, document.filename);
    } else if (document.fileUrl) {
      // For S3, redirect to signed URL
      res.redirect(document.fileUrl);
    } else {
      res.status(404).json({
        error: 'File not found',
        message: 'Document file is not available'
      });
    }
  } catch (error) {
    logger.error('Failed to download document', {
      component: 'document-routes',
      action: 'downloadDocument',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      documentId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to download document'
    });
  }
});

// GET /api/documents/batch/:batchId/status - Get batch generation status
router.get('/batch/:batchId/status', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { batchId } = req.params;
    const tenantId = req.person.tenantId;

    // Get batch status from DocumentService
    const status = await documentService.getBatchStatus(batchId, tenantId);

    if (!status) {
      return res.status(404).json({
        error: 'Batch not found',
        message: `Batch with ID ${batchId} does not exist`
      });
    }

    res.json(status);
  } catch (error) {
    logger.error('Failed to fetch batch status', {
      component: 'document-routes',
      action: 'getBatchStatus',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      batchId: req.params?.batchId
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch batch status'
    });
  }
});

// DELETE /api/documents/:id - Soft delete document
router.delete('/:id', authenticateToken(), requirePermission('documents:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    // Check document exists
    const document = await prisma.generatedDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: `Document with ID ${id} does not exist or has been deleted`
      });
    }

    // Soft delete via DocumentService (handles file cleanup)
    await documentService.deleteDocument(id, tenantId);

    logger.info('Document deleted successfully', {
      component: 'document-routes',
      action: 'deleteDocument',
      documentId: id,
      personId: req.person.id
    });

    res.json({
      message: 'Document deleted successfully',
      id
    });
  } catch (error) {
    logger.error('Failed to delete document', {
      component: 'document-routes',
      action: 'deleteDocument',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      documentId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete document'
    });
  }
});

// POST /api/documents/:id/resend - Resend document via email
router.post('/:id/resend', authenticateToken(), requirePermission('documents:send'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, subject, message } = req.body;
    const tenantId = req.person.tenantId;

    // Validate email
    if (!email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email address is required'
      });
    }

    // Get document
    const document = await prisma.generatedDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        template: {
          select: { name: true, type: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: `Document with ID ${id} does not exist`
      });
    }

    // Queue email sending (assuming emailQueue from queueService)
    const { emailQueue } = await import('../services/queueService.js');
    
    await emailQueue.add('send-document', {
      documentId: id,
      email,
      subject: subject || `${document.template.name}`,
      message,
      tenantId,
    });

    // Update document
    await prisma.generatedDocument.update({
      where: { id },
      data: {
        sentAt: new Date(),
        sentTo: email,
        status: 'SENT',
      },
    });

    logger.info('Document resend queued', {
      component: 'document-routes',
      action: 'resendDocument',
      documentId: id,
      email,
      personId: req.person.id
    });

    res.json({
      message: 'Document will be sent via email',
      documentId: id,
      sentTo: email,
    });
  } catch (error) {
    logger.error('Failed to resend document', {
      component: 'document-routes',
      action: 'resendDocument',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      documentId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resend document'
    });
  }
});

export default router;
