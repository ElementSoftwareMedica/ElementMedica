/**
 * Media Service - FASE 2 CMS Advanced
 * Gestisce upload, ottimizzazione e gestione media con Sharp.js
 * 
 * Conformità:
 * ✅ Multi-tenancy: Filtra sempre per tenantId
 * ✅ GDPR: Soft delete (deletedAt)
 * ✅ Type Safety: JSDoc completo, Prisma types
 * ✅ Error Handling: Logger strutturato
 * ✅ Security: Validazione mime types, size limits
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

class MediaService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads/cms';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf'
    ];
  }

  /**
   * Valida il file prima dell'upload
   * @param {Object} file - File da multer
   * @throws {Error} Se il file non è valido
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      logger.warn({ mimetype: file.mimetype }, 'Invalid file type attempted');
      throw new Error(`File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    if (file.size > this.maxFileSize) {
      logger.warn({ size: file.size, maxSize: this.maxFileSize }, 'File too large');
      throw new Error(`File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`);
    }
  }

  /**
   * Upload e ottimizza media con generazione varianti
   * @param {Object} file - File da multer (buffer)
   * @param {Object} options - { tenantId, userId, folderId?, alt?, title?, tags? }
   * @returns {Promise<Object>} Media creato con variants
   */
  async uploadAndOptimize(file, options) {
    const { tenantId, userId, folderId, alt, title, tags = [] } = options;

    // Validazione multi-tenancy
    if (!tenantId) {
      throw new Error('tenantId is required for multi-tenancy');
    }

    if (!userId) {
      throw new Error('userId is required for audit trail');
    }

    try {
      // Validazione file
      this.validateFile(file);

      // Genera paths
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      const folderPath = path.join(this.uploadDir, tenantId, folderId || 'uploads');
      await fs.mkdir(folderPath, { recursive: true });

      const filePath = path.join(folderPath, filename);
      const relativePath = path.join(tenantId, folderId || 'uploads', filename);

      // Process con Sharp (solo per immagini)
      let variants = null;
      let metadata = null;

      if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
        const image = sharp(file.buffer);
        metadata = await image.metadata();

        // Salva original
        await image.toFile(filePath);

        // Genera variants
        variants = await this.generateVariants(image, folderPath, filename);

        logger.info(
          {
            filename,
            tenantId,
            userId,
            width: metadata.width,
            height: metadata.height,
            format: metadata.format
          },
          'Image processed with variants'
        );
      } else {
        // Per PDF e SVG salva direttamente
        await fs.writeFile(filePath, file.buffer);
        logger.info({ filename, tenantId, userId, mimetype: file.mimetype }, 'Non-image file saved');
      }

      // Salva nel database con audit log
      // Note: CMSMedia DB schema only has: id, filename, originalName, mimeType, size, url, alt, tenantId, createdAt, deletedAt
      // folder_id column NOT YET in database - will be added via migration
      const media = await prisma.cMSMedia.create({
        data: {
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: `/uploads/cms/${relativePath}`,
          alt: alt || file.originalname,
          // folderId - NOT IN DB YET, will be added in future migration
          tenantId
        }
      });

      // Store additional metadata in response (not in DB)
      media.variants = variants;
      media.metadata = metadata ? {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        hasAlpha: metadata.hasAlpha
      } : null;

      logger.info(
        { mediaId: media.id, tenantId, userId, filename },
        'Media uploaded successfully'
      );

      return media;

    } catch (error) {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
          tenantId,
          userId,
          filename: file?.originalname
        },
        'Failed to upload media'
      );
      throw error;
    }
  }

  /**
   * Genera varianti responsive (thumbnail, medium, large) in JPG e WebP
   * @param {sharp.Sharp} image - Istanza Sharp
   * @param {string} folderPath - Path cartella destinazione
   * @param {string} filename - Nome file originale
   * @returns {Promise<Object>} URLs delle varianti
   */
  async generateVariants(image, folderPath, filename) {
    const baseName = path.parse(filename).name;
    const variants = {};

    const sizes = {
      thumbnail: { width: 150, height: 150, fit: 'cover' },
      medium: { width: 800, height: 600, fit: 'inside' },
      large: { width: 1920, height: 1080, fit: 'inside' }
    };

    try {
      for (const [name, size] of Object.entries(sizes)) {
        // JPEG optimized
        const jpegFilename = `${baseName}-${name}.jpg`;
        const jpegPath = path.join(folderPath, jpegFilename);
        await image
          .clone()
          .resize(size.width, size.height, { fit: size.fit })
          .jpeg({ quality: 85, progressive: true })
          .toFile(jpegPath);

        variants[`${name}_jpg`] = jpegPath.replace(/.*uploads\/cms\//, '/uploads/cms/');

        // WebP modern format (better compression)
        const webpFilename = `${baseName}-${name}.webp`;
        const webpPath = path.join(folderPath, webpFilename);
        await image
          .clone()
          .resize(size.width, size.height, { fit: size.fit })
          .webp({ quality: 80 })
          .toFile(webpPath);

        variants[`${name}_webp`] = webpPath.replace(/.*uploads\/cms\//, '/uploads/cms/');
      }

      return variants;

    } catch (error) {
      logger.error({ error: error.message, filename }, 'Failed to generate variants');
      // Non bloccare l'upload se la generazione varianti fallisce
      return null;
    }
  }

  /**
   * Lista media con filtri (multi-tenant safe)
   * @param {Object} filters - { tenantId, folderId?, mimeType?, tags?, search?, page?, limit? }
   * @returns {Promise<Object>} { media: [...], pagination: {...} }
   */
  async listMedia(filters) {
    const {
      tenantId,
      folderId,
      mimeType,
      tags,
      search,
      page = 1,
      limit = 50
    } = filters;

    // Validazione multi-tenancy OBBLIGATORIA
    if (!tenantId) {
      throw new Error('tenantId is required for multi-tenancy');
    }

    try {
      const where = {
        tenantId,
        deletedAt: null // GDPR soft delete
      };

      if (folderId) {
        where.folderId = folderId;
      }

      if (mimeType) {
        where.mimeType = { startsWith: mimeType };
      }

      // Note: tags field doesn't exist in CMSMedia model - commented out
      // if (tags?.length) {
      //   where.tags = { hasSome: tags };
      // }

      if (search) {
        where.OR = [
          { originalName: { contains: search, mode: 'insensitive' } },
          // Note: title field doesn't exist in CMSMedia model
          { alt: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [media, total] = await Promise.all([
        prisma.cMSMedia.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            // Note: creator relation doesn't exist in CMSMedia model
            folder: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        prisma.cMSMedia.count({ where })
      ]);

      logger.info(
        { tenantId, folderId, count: media.length, total },
        'Media list retrieved'
      );

      return {
        media,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error(
        { error: error.message, tenantId },
        'Failed to list media'
      );
      throw error;
    }
  }

  /**
   * Soft delete media (GDPR compliant)
   * @param {string} mediaId - ID del media
   * @param {string} tenantId - ID tenant (multi-tenancy verification)
   * @returns {Promise<Object>} Media eliminato
   */
  async deleteMedia(mediaId, tenantId) {
    if (!tenantId) {
      throw new Error('tenantId is required for multi-tenancy');
    }

    try {
      const media = await prisma.cMSMedia.update({
        where: {
          id: mediaId,
          tenantId // Multi-tenant safety check
        },
        data: {
          deletedAt: new Date() // Soft delete GDPR
        }
      });

      logger.info(
        { mediaId, tenantId },
        'Media soft deleted'
      );

      return media;

    } catch (error) {
      logger.error(
        { error: error.message, mediaId, tenantId },
        'Failed to delete media'
      );
      throw error;
    }
  }

  /**
   * Crea cartella per organizzazione media
   * @param {Object} data - { name, parentId?, tenantId }
   * @returns {Promise<Object>} Cartella creata
   */
  async createFolder(data) {
    const { name, parentId, tenantId } = data;

    if (!tenantId) {
      throw new Error('tenantId is required for multi-tenancy');
    }

    try {
      const folder = await prisma.cMSMediaFolder.create({
        data: {
          name,
          parentId,
          tenantId
        },
        include: {
          parent: {
            select: { id: true, name: true }
          }
        }
      });

      logger.info(
        { folderId: folder.id, name, tenantId },
        'Media folder created'
      );

      return folder;

    } catch (error) {
      logger.error(
        { error: error.message, name, tenantId },
        'Failed to create folder'
      );
      throw error;
    }
  }

  /**
   * Lista cartelle (multi-tenant safe)
   * @param {string} tenantId - ID tenant
   * @param {string} parentId - ID cartella parent (optional, null per root)
   * @returns {Promise<Array>} Lista cartelle
   */
  async listFolders(tenantId, parentId = null) {
    if (!tenantId) {
      throw new Error('tenantId is required for multi-tenancy');
    }

    try {
      const folders = await prisma.cms_media_folders.findMany({
        where: {
          tenant_id: tenantId,
          parent_id: parentId,
          deleted_at: null
        },
        orderBy: { name: 'asc' }
      });

      // Transform to camelCase for frontend compatibility
      return folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parent_id,
        tenantId: folder.tenant_id,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at
      }));

    } catch (error) {
      logger.error(
        { error: error.message, tenantId },
        'Failed to list folders'
      );
      throw error;
    }
  }
}

export default new MediaService();
