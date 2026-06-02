/**
 * CMS Media Routes - FASE 2 CMS Advanced
 * Endpoint per gestione media library (upload, list, delete, folders)
 * 
 * Conformità:
 * ✅ RBAC: requirePermissions middleware (RBACMiddleware)
 * ✅ Multi-tenancy: Verificato in ogni endpoint
 * ✅ GDPR: Soft delete implementato
 * ✅ Error Handling: Try-catch con logger
 * ✅ Security: Multer validation, file size limits
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import prisma from '../config/prisma-optimization.js';
import { requirePermissions } from '../middleware/RBACMiddleware.js';
import { authenticate } from '../middleware/auth.js';
import mediaService from '../services/mediaService.js';
import logger from '../utils/logger.js';


const router = express.Router();

// ============================================
// Multer Configuration (Memory Storage)
// ============================================

const storage = multer.memoryStorage(); // Buffer in memoria per Sharp

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Invalid file type. Allowed: images and PDF'));
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter
});

const uploadFiles = (req, res, next) => {
  upload.array('files', 10)(req, res, (error) => {
    if (!error) {
      return next();
    }

    logger.warn({
      message: error.message,
      tenantId: req.person?.tenantId,
      userId: req.person?.id
    }, 'Media upload rejected');

    return res.status(400).json({
      success: false,
      error: 'File non valido'
    });
  });
};

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /api/v1/cms/media/upload
 * Upload singolo o multiplo di media
 * Permesso: MANAGE_CMS_MEDIA
 */
router.post(
  '/upload',
  authenticate,
  requirePermissions('cms.media:manage'),
  uploadFiles,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.person;
      const { folderId, alt, title, tags } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nessun file fornito'
        });
      }

      // Parse tags se è una stringa JSON
      let parsedTags = [];
      if (tags) {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          parsedTags = tags.split(',').map(t => t.trim());
        }
      }

      // Upload tutti i files
      const uploadPromises = req.files.map(file =>
        mediaService.uploadAndOptimize(file, {
          tenantId,
          userId,
          folderId: folderId || null,
          alt: alt || file.originalname,
          title: title || file.originalname,
          tags: parsedTags
        })
      );

      const uploadedMedia = await Promise.all(uploadPromises);

      logger.info(
        {
          tenantId,
          userId,
          count: uploadedMedia.length,
          folderId
        },
        'Media files uploaded successfully'
      );

      res.json({
        success: true,
        data: uploadedMedia,
        message: `${uploadedMedia.length} file caricato/i con successo`
      });

    } catch (error) {
      const isValidationError = error.message?.includes('File type not allowed') ||
        error.message?.includes('Invalid file type') ||
        error.message?.includes('File too large');

      logger.error(
        {
          error: 'Operazione non riuscita',
          stack: error.stack,
          tenantId: req.person?.tenantId,
          userId: req.person?.id
        },
        'Media upload failed'
      );

      res.status(isValidationError ? 400 : 500).json({
        success: false,
        error: isValidationError ? 'File non valido' : 'Errore nel caricamento dei media'
      });
    }
  }
);

/**
 * GET /api/v1/cms/media
 * Lista media con filtri
 * Permesso: VIEW_CMS_MEDIA
 */
router.get(
  '/',
  authenticate,
  requirePermissions('cms.media:read'),
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const {
        folderId,
        mimeType,
        tags,
        search,
        page = 1,
        limit = 50
      } = req.query;

      const result = await mediaService.listMedia({
        tenantId,
        folderId: folderId || undefined,
        mimeType: mimeType || undefined,
        tags: tags ? tags.split(',') : undefined,
        search: search || undefined,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error(
        {
          error: 'Operazione non riuscita',
          tenantId: req.person?.tenantId
        },
        'Failed to list media'
      );

      res.status(500).json({
        success: false,
        error: 'Errore nel recupero dei media'
      });
    }
  }
);

/**
 * GET /api/v1/cms/media/:id
 * Dettaglio singolo media
 * Permesso: VIEW_CMS_MEDIA
 */
router.get(
  '/:id',
  authenticate,
  requirePermissions('cms.media:read'),
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const { id } = req.params;

      const media = await prisma.cMSMedia.findFirst({
        where: {
          id,
          tenantId, // Multi-tenant safety
          deletedAt: null
        },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          folder: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          error: 'Media non trovato'
        });
      }

      res.json({
        success: true,
        data: media
      });

    } catch (error) {
      logger.error(
        {
          error: 'Operazione non riuscita',
          mediaId: req.params.id,
          tenantId: req.person?.tenantId
        },
        'Failed to get media'
      );

      res.status(500).json({
        success: false,
        error: 'Errore nel recupero dei media'
      });
    }
  }
);

/**
 * PATCH /api/v1/cms/media/:id
 * Aggiorna metadati media (alt, title, tags, folderId)
 * Permesso: EDIT_CMS_MEDIA
 */
router.patch(
  '/:id',
  authenticate,
  requirePermissions('cms.media:update'),
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const { id } = req.params;
      const { alt, title, tags, folderId } = req.body;

      const updateData = {};
      if (alt !== undefined) updateData.alt = alt;
      if (title !== undefined) updateData.title = title;
      if (tags !== undefined) updateData.tags = tags;
      if (folderId !== undefined) updateData.folderId = folderId;

      const media = await prisma.cMSMedia.update({
        where: {
          id,
          tenantId // Multi-tenant safety
        },
        data: updateData,
        include: {
          folder: {
            select: { id: true, name: true }
          }
        }
      });

      logger.info(
        { mediaId: id, tenantId, updates: Object.keys(updateData) },
        'Media metadata updated'
      );

      res.json({
        success: true,
        data: media
      });

    } catch (error) {
      logger.error(
        {
          error: 'Operazione non riuscita',
          mediaId: req.params.id,
          tenantId: req.person?.tenantId
        },
        'Failed to update media'
      );

      res.status(500).json({
        success: false,
        error: 'Errore nell\'aggiornamento dei media'
      });
    }
  }
);

/**
 * DELETE /api/v1/cms/media/:id
 * Soft delete media (GDPR compliant)
 * Permesso: DELETE_CMS_MEDIA
 */
router.delete(
  '/:id',
  authenticate,
  requirePermissions('cms.media:delete'),
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const { id } = req.params;

      const media = await mediaService.deleteMedia(id, tenantId);

      res.json({
        success: true,
        message: 'Media eliminato con successo',
        data: media
      });

    } catch (error) {
      logger.error(
        {
          error: 'Operazione non riuscita',
          mediaId: req.params.id,
          tenantId: req.person?.tenantId
        },
        'Failed to delete media'
      );

      res.status(500).json({
        success: false,
        error: 'Errore nell\'eliminazione dei media'
      });
    }
  }
);

// ============================================
// FOLDERS MANAGEMENT
// ============================================

/**
 * GET /api/v1/cms/media/folders
 * Lista cartelle
 * Permesso: VIEW_CMS_MEDIA
 */
router.get(
  '/folders/list',
  authenticate,
  requirePermissions('cms.media:read'),
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const { parentId } = req.query;

      const folders = await mediaService.listFolders(
        tenantId,
        parentId || null
      );

      res.json({
        success: true,
        data: folders
      });

    } catch (error) {
      logger.error(
        {
          error: 'Operazione non riuscita',
          tenantId: req.person?.tenantId
        },
        'Failed to list folders'
      );

      res.status(500).json({
        success: false,
        error: 'Errore nel recupero delle cartelle'
      });
    }
  }
);

/**
 * POST /api/v1/cms/media/folders
 * Crea cartella
 * Permesso: MANAGE_CMS_MEDIA
 */
router.post(
  '/folders',
  authenticate,
  requirePermissions('cms.media:manage'),
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const { name, parentId } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Nome cartella obbligatorio'
        });
      }

      const folder = await mediaService.createFolder({
        name: name.trim(),
        parentId: parentId || null,
        tenantId
      });

      res.json({
        success: true,
        data: folder,
        message: 'Cartella creata con successo'
      });

    } catch (error) {
      logger.error(
        {
          error: 'Operazione non riuscita',
          tenantId: req.person?.tenantId
        },
        'Failed to create folder'
      );

      res.status(500).json({
        success: false,
        error: 'Errore nella creazione della cartella'
      });
    }
  }
);

/**
 * DELETE /api/v1/cms/media/folders/:id
 * Soft delete cartella
 * Permesso: MANAGE_CMS_MEDIA
 */
router.delete(
  '/folders/:id',
  authenticate,
  requirePermissions('cms.media:manage'),
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const { id } = req.params;

      // Verifica che la cartella sia vuota
      const mediaCount = await prisma.cMSMedia.count({
        where: {
          folderId: id,
          tenantId,
          deletedAt: null
        }
      });

      if (mediaCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Impossibile eliminare la cartella con media all\'interno. Spostare o eliminare prima i media.'
        });
      }

      const folder = await prisma.cMSMediaFolder.update({
        where: {
          id,
          tenantId // Multi-tenant safety
        },
        data: {
          deletedAt: new Date() // Soft delete GDPR
        }
      });

      logger.info(
        { folderId: id, tenantId },
        'Media folder deleted'
      );

      res.json({
        success: true,
        message: 'Cartella eliminata con successo',
        data: folder
      });

    } catch (error) {
      logger.error(
        {
          error: 'Operazione non riuscita',
          folderId: req.params.id,
          tenantId: req.person?.tenantId
        },
        'Failed to delete folder'
      );

      res.status(500).json({
        success: false,
        error: 'Errore nell\'eliminazione della cartella'
      });
    }
  }
);

export default router;
