import { validationResult } from 'express-validator';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CMSController {
  // GET /api/cms/courses
  async getCMSCourses(req, res) {
    try {
      const tenantId = req.tenantId;
      const { page = 1, limit = 20, search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        tenantId,
        deletedAt: null
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { subcategory: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          select: {
            id: true,
            title: true,
            category: true,
            subcategory: true,
            shortDescription: true,
            fullDescription: true,
            image1Url: true,
            image2Url: true,
            riskLevel: true,
            courseType: true,
            isPublic: true,
            slug: true,
            seoTitle: true,
            seoDescription: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: [
            { updatedAt: 'desc' }
          ],
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.course.count({ where })
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      logger.info('Retrieved CMS courses', {
        tenantId,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: courses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      });

    } catch (error) {
      logger.error('Error getting CMS courses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve courses',
        details: error.message
      });
    }
  }

  // GET /api/cms/courses/:id
  async getCMSCourseById(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      const course = await prisma.course.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null
        },
        select: {
          id: true,
          title: true,
          category: true,
          subcategory: true,
          shortDescription: true,
          fullDescription: true,
          image1Url: true,
          image2Url: true,
          riskLevel: true,
          courseType: true,
          isPublic: true,
          slug: true,
          seoTitle: true,
          seoDescription: true,
          duration: true,
          pricePerPerson: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          error: 'Course not found'
        });
      }

      logger.info('Retrieved CMS course by ID', { courseId: id, tenantId });

      res.json({
        success: true,
        data: course
      });

    } catch (error) {
      logger.error('Error getting CMS course by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve course',
        details: error.message
      });
    }
  }

  // PUT /api/cms/courses/:id/content
  async updateCourseContent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const tenantId = req.tenantId;
      const personId = req.person?.id;

      const {
        shortDescription,
        fullDescription,
        image1Url,
        image2Url,
        seoTitle,
        seoDescription,
        slug,
        isPublic,
        riskLevel,
        courseType,
        subcategory
      } = req.body;

      // Verifica che il corso esista e appartenga al tenant
      const existingCourse = await prisma.course.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null
        }
      });

      if (!existingCourse) {
        return res.status(404).json({
          success: false,
          error: 'Course not found'
        });
      }

      // Verifica unicità dello slug se fornito
      if (slug && slug !== existingCourse.slug) {
        const slugExists = await prisma.course.findFirst({
          where: {
            slug,
            tenantId,
            deletedAt: null,
            id: { not: id }
          }
        });

        if (slugExists) {
          return res.status(400).json({
            success: false,
            error: 'Slug already exists'
          });
        }
      }

      // Aggiorna il corso
      const updatedCourse = await prisma.course.update({
        where: { id },
        data: {
          shortDescription,
          fullDescription,
          image1Url,
          image2Url,
          seoTitle,
          seoDescription,
          slug,
          isPublic,
          riskLevel,
          courseType,
          subcategory,
          updatedAt: new Date()
        },
        select: {
          id: true,
          title: true,
          category: true,
          subcategory: true,
          shortDescription: true,
          fullDescription: true,
          image1Url: true,
          image2Url: true,
          riskLevel: true,
          courseType: true,
          isPublic: true,
          slug: true,
          seoTitle: true,
          seoDescription: true,
          updatedAt: true
        }
      });

      // Log dell'attività
      await prisma.activityLog.create({
        data: {
          tenantId,
          personId,
          action: 'UPDATE_COURSE_CONTENT',
          resourceType: 'Course',
          resourceId: id,
          details: {
            updatedFields: Object.keys(req.body),
            previousSlug: existingCourse.slug,
            newSlug: slug
          }
        }
      });

      logger.info('Updated course content', {
        courseId: id,
        tenantId,
        personId,
        updatedFields: Object.keys(req.body)
      });

      res.json({
        success: true,
        data: updatedCourse,
        message: 'Course content updated successfully'
      });

    } catch (error) {
      logger.error('Error updating course content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update course content',
        details: error.message
      });
    }
  }

  // POST /api/cms/upload/image
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const tenantId = req.tenantId;
      const personId = req.person?.id;
      const file = req.file;

      // Salva le informazioni del file nel database
      const mediaRecord = await prisma.cMSMedia.create({
        data: {
          tenantId,
          filename: file.filename,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: `/uploads/cms/${file.filename}`,
          altText: req.body.altText || '',
          uploadedBy: personId
        }
      });

      // Log dell'attività
      await prisma.activityLog.create({
        data: {
          tenantId,
          personId,
          action: 'UPLOAD_MEDIA',
          resourceType: 'CMSMedia',
          resourceId: mediaRecord.id,
          details: {
            filename: file.filename,
            originalFilename: file.originalname,
            size: file.size,
            mimeType: file.mimetype
          }
        }
      });

      logger.info('Image uploaded successfully', {
        mediaId: mediaRecord.id,
        filename: file.filename,
        tenantId,
        personId
      });

      res.json({
        success: true,
        data: {
          id: mediaRecord.id,
          url: mediaRecord.url,
          filename: mediaRecord.filename,
          originalFilename: mediaRecord.originalFilename,
          size: mediaRecord.size,
          mimeType: mediaRecord.mimeType,
          altText: mediaRecord.altText,
          createdAt: mediaRecord.createdAt
        },
        message: 'Image uploaded successfully'
      });

    } catch (error) {
      logger.error('Error uploading image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload image',
        details: error.message
      });
    }
  }

  // GET /api/cms/media
  async getMedia(req, res) {
    try {
      const tenantId = req.tenantId;
      const { page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const [media, total] = await Promise.all([
        prisma.cMSMedia.findMany({
          where: {
            tenantId,
            deletedAt: null
          },
          select: {
            id: true,
            filename: true,
            originalFilename: true,
            mimeType: true,
            size: true,
            url: true,
            altText: true,
            createdAt: true,
            uploadedBy: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.cMSMedia.count({
          where: {
            tenantId,
            deletedAt: null
          }
        })
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      logger.info('Retrieved CMS media', {
        tenantId,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: media,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      });

    } catch (error) {
      logger.error('Error getting CMS media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve media',
        details: error.message
      });
    }
  }

  // DELETE /api/cms/media/:id
  async deleteMedia(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const personId = req.person?.id;

      // Trova il media record
      const mediaRecord = await prisma.cMSMedia.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null
        }
      });

      if (!mediaRecord) {
        return res.status(404).json({
          success: false,
          error: 'Media not found'
        });
      }

      // Elimina il file fisico
      try {
        const filePath = path.join(__dirname, '..', 'uploads', 'cms', mediaRecord.filename);
        await fs.unlink(filePath);
      } catch (fileError) {
        logger.warn('Could not delete physical file:', {
          filename: mediaRecord.filename,
          error: fileError.message
        });
      }

      // Soft delete del record
      await prisma.cMSMedia.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });

      // Log dell'attività
      await prisma.activityLog.create({
        data: {
          tenantId,
          personId,
          action: 'DELETE_MEDIA',
          resourceType: 'CMSMedia',
          resourceId: id,
          details: {
            filename: mediaRecord.filename,
            originalFilename: mediaRecord.originalFilename
          }
        }
      });

      logger.info('Media deleted successfully', {
        mediaId: id,
        filename: mediaRecord.filename,
        tenantId,
        personId
      });

      res.json({
        success: true,
        message: 'Media deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete media',
        details: error.message
      });
    }
  }
}

export default new CMSController();