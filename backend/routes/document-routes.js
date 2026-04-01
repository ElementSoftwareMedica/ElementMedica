import express from 'express';
import prisma from '../config/prisma-optimization.js';
import middleware from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { getDocumentService } from '../services/documentService.js';
import storageService from '../services/storageService.js';

const documentService = getDocumentService();
import path from 'path';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();

const { authenticate: authenticateToken, requirePermission } = middleware;

// GET /api/documents/statistics - Aggregate statistics (BEFORE /:id route)
router.get('/statistics', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);

    // Use DocumentService statistics method
    const stats = await documentService.getStatistics(tenantId);

    res.json(stats);
  } catch (error) {
    logger.error('Failed to fetch document statistics', {
      component: 'document-routes',
      action: 'getStatistics',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero delle statistiche'
    });
  }
});

// GET /api/documents - List generated documents
router.get('/', authenticateToken, requirePermission('documents:read'), async (req, res) => {
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
    const tenantId = getEffectiveTenantId(req);

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
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero dei documenti'
    });
  }
});

// GET /api/documents/:id - Get single document metadata
router.get('/:id', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const document = await prisma.generatedDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        template: {
          select: { id: true, name: true, type: true, version: true },
        },
        generator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Documento non trovato',
        message: 'Il documento non esiste o è stato eliminato'
      });
    }

    res.json(document);
  } catch (error) {
    logger.error('Failed to fetch document', {
      component: 'document-routes',
      action: 'getDocument',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      documentId: req.params?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero del documento'
    });
  }
});

// GET /api/documents/:id/download - Download document file
router.get('/:id/download', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    // Get document metadata
    const document = await prisma.generatedDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Documento non trovato',
        message: 'Il documento non esiste'
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
      const uploadsRoot = path.resolve(process.cwd(), 'uploads');
      const resolvedFilePath = path.resolve(uploadsRoot, document.filepath);

      // Security hardening: prevent path traversal outside uploads directory.
      if (!resolvedFilePath.startsWith(`${uploadsRoot}${path.sep}`) && resolvedFilePath !== uploadsRoot) {
        logger.warn('Invalid document file path blocked', {
          component: 'document-routes',
          action: 'downloadDocument',
          documentId: id,
          personId: req.person?.id
        });

        return res.status(400).json({
          error: 'Percorso file non valido',
          message: 'Impossibile scaricare il documento richiesto'
        });
      }

      res.download(resolvedFilePath, document.filename);
    } else if (document.fileUrl) {
      // For S3, redirect to signed URL
      res.redirect(document.fileUrl);
    } else {
      res.status(404).json({
        error: 'File non trovato',
        message: 'Il file del documento non è disponibile'
      });
    }
  } catch (error) {
    logger.error('Failed to download document', {
      component: 'document-routes',
      action: 'downloadDocument',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      documentId: req.params?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel download del documento'
    });
  }
});

// GET /api/documents/:id/preview - Preview document inline (for pdf.js)
router.get('/:id/preview', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const document = await prisma.generatedDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Documento non trovato',
        message: 'Il documento non esiste'
      });
    }

    if (document.filepath) {
      const uploadsRoot = path.resolve(process.cwd(), 'uploads');
      const resolvedFilePath = path.resolve(uploadsRoot, document.filepath);

      if (!resolvedFilePath.startsWith(`${uploadsRoot}${path.sep}`) && resolvedFilePath !== uploadsRoot) {
        return res.status(400).json({
          error: 'Percorso file non valido',
          message: 'Impossibile visualizzare il documento richiesto'
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);
      res.sendFile(resolvedFilePath);
    } else if (document.fileUrl) {
      res.redirect(document.fileUrl);
    } else {
      res.status(404).json({
        error: 'File non trovato',
        message: 'Il file del documento non è disponibile'
      });
    }
  } catch (error) {
    logger.error('Errore preview documento', {
      component: 'document-routes',
      action: 'previewDocument',
      error: 'Operazione non riuscita',
      personId: req.person?.id,
      documentId: req.params?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel caricamento del documento'
    });
  }
});

// GET /api/documents/batch/:batchId/status - Get batch generation status
router.get('/batch/:batchId/status', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { batchId } = req.params;
    const tenantId = getEffectiveTenantId(req);

    // Get batch status from DocumentService
    const status = await documentService.getBatchStatus(batchId, tenantId);

    if (!status) {
      return res.status(404).json({
        error: 'Batch non trovato',
        message: 'Il batch non esiste'
      });
    }

    res.json(status);
  } catch (error) {
    logger.error('Failed to fetch batch status', {
      component: 'document-routes',
      action: 'getBatchStatus',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      batchId: req.params?.batchId
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero dello stato batch'
    });
  }
});

// DELETE /api/documents/:id - Soft delete document
router.delete('/:id', authenticateToken, requirePermission('documents:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);
    const { deletionReason } = req.body || {};

    if (!deletionReason || deletionReason.trim().length < 10) {
      return res.status(400).json({
        error: 'Errore di validazione',
        message: 'Motivo eliminazione obbligatorio (minimo 10 caratteri)'
      });
    }

    // Check document exists
    const document = await prisma.generatedDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Documento non trovato',
        message: 'Il documento non esiste o è stato eliminato'
      });
    }

    // Soft delete via DocumentService (handles file cleanup)
    await documentService.deleteDocument(id, tenantId);

    await prisma.gdprAuditLog.create({
      data: {
        tenantId,
        resourceType: 'GeneratedDocument',
        resourceId: id,
        action: 'DELETE',
        personId: req.person.id,
        dataAccessed: {
          filename: document.filename,
          type: document.type,
          generatedAt: document.generatedAt,
          deletionReason: deletionReason.trim()
        }
      }
    });

    logger.info('Document deleted successfully', {
      component: 'document-routes',
      action: 'deleteDocument',
      documentId: id,
      personId: req.person.id
    });

    res.json({
      message: 'Documento eliminato con successo',
      id
    });
  } catch (error) {
    logger.error('Failed to delete document', {
      component: 'document-routes',
      action: 'deleteDocument',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      documentId: req.params?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nell\'eliminazione del documento'
    });
  }
});

// POST /api/documents/:id/resend - Resend document via email
router.post('/:id/resend', authenticateToken, requirePermission('documents:send'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, subject, message } = req.body;
    const tenantId = getEffectiveTenantId(req);

    // Validate email
    if (!email) {
      return res.status(400).json({
        error: 'Errore di validazione',
        message: 'L\'indirizzo email è obbligatorio'
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
        error: 'Documento non trovato',
        message: 'Il documento non esiste'
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
      message: 'Il documento verrà inviato via email',
      documentId: id,
      sentTo: email,
    });
  } catch (error) {
    logger.error('Failed to resend document', {
      component: 'document-routes',
      action: 'resendDocument',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      documentId: req.params?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel reinvio del documento'
    });
  }
});

export default router;
