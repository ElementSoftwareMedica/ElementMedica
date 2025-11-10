/**
 * Lettere Incarico Routes
 * 
 * API endpoints per la gestione delle lettere di incarico
 * con integrazione template system
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../auth/middleware.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { DocumentService } from '../services/documentService.js';

const router = express.Router();
const prisma = new PrismaClient();
const documentService = new DocumentService();

const { authenticate: authenticateToken, authorize: requirePermission } = middleware;

/**
 * GET /api/v1/lettere-incarico
 * Get all letters of engagement
 */
router.get('/', authenticateToken(), requirePermission('read:documents'), async (req, res) => {
  try {
    const { scheduleId, trainerId } = req.query;
    const tenantId = req.user.tenantId;

    const where = {
      tenantId,
      deletedAt: null
    };

    if (scheduleId) where.scheduledCourseId = scheduleId;
    if (trainerId) where.trainerId = trainerId;

    const lettere = await prisma.letteraIncarico.findMany({
      where,
      include: {
        scheduledCourse: {
          include: {
            course: true,
            companies: {
              include: { company: true }
            }
          }
        },
        trainer: true,
        template: {
          select: {
            id: true,
            name: true,
            version: true
          }
        }
      },
      orderBy: { dataGenerazione: 'desc' }
    });

    res.json(lettere);
  } catch (error) {
    logger.error('Failed to fetch lettere incarico', {
      component: 'lettere-incarico-routes',
      action: 'list',
      error: error.message,
      personId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to fetch lettere incarico' });
  }
});

/**
 * POST /api/v1/lettere-incarico/generate
 * Generate letter of engagement from template
 */
router.post('/generate',
  authenticateToken(),
  requirePermission('create:documents'),
  [
    body('scheduleId').notEmpty().withMessage('Schedule ID is required'),
    body('trainerId').notEmpty().withMessage('Trainer ID is required'),
    body('templateId').optional().isString(),
    body('sendEmail').optional().isBoolean(),
    body('email').optional().isEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation error', details: errors.array() });
      }

      const { scheduleId, trainerId, templateId, sendEmail, email } = req.body;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      // Verify schedule exists
      const schedule = await prisma.courseSchedule.findFirst({
        where: { id: scheduleId, tenantId, deletedAt: null },
        include: {
          course: true,
          companies: {
            include: { company: true }
          },
          sessions: {
            include: {
              trainer: true
            }
          }
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Verify trainer exists
      const trainer = await prisma.person.findFirst({
        where: { id: trainerId, tenantId, deletedAt: null }
      });

      if (!trainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }

      // Get template (default if not specified)
      let template;
      if (templateId) {
        template = await prisma.templateLink.findFirst({
          where: { id: templateId, tenantId, type: 'LETTER_OF_ENGAGEMENT', deletedAt: null }
        });
        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }
      } else {
        template = await prisma.templateLink.findFirst({
          where: { 
            tenantId, 
            type: 'LETTER_OF_ENGAGEMENT', 
            isDefault: true,
            isActive: true,
            deletedAt: null 
          }
        });
        if (!template) {
          return res.status(404).json({ error: 'No default template found. Please specify a template ID.' });
        }
      }

      // Generate document using template system
      const document = await documentService.generateDocument(
        template.id,
        {
          entityType: 'schedule',
          entityId: scheduleId,
          trainerId: trainerId, // Pass trainer ID for multi-trainer schedules
          options: {
            sendEmail: sendEmail || false,
            email: email || trainer.email
          }
        },
        userId,
        tenantId
      );

      // Get progressive number for this letter
      const year = new Date().getFullYear();
      const lastLettera = await prisma.letteraIncarico.findFirst({
        where: {
          tenantId,
          annoProgressivo: year,
          deletedAt: null
        },
        orderBy: { numeroProgressivo: 'desc' }
      });

      const numeroProgressivo = (lastLettera?.numeroProgressivo || 0) + 1;

      // Create or update LetteraIncarico record
      const existingLettera = await prisma.letteraIncarico.findFirst({
        where: {
          scheduledCourseId: scheduleId,
          trainerId: trainerId,
          deletedAt: null
        }
      });

      let lettera;
      if (existingLettera) {
        lettera = await prisma.letteraIncarico.update({
          where: { id: existingLettera.id },
          data: {
            templateId: template.id,
            templateVersion: template.version,
            markers: document.markers,
            generatedBy: userId,
            fileSize: document.fileSize,
            nomeFile: document.filename,
            url: document.fileUrl,
            dataGenerazione: new Date(),
            numeroProgressivo: existingLettera.numeroProgressivo, // Keep existing number
            annoProgressivo: existingLettera.annoProgressivo
          }
        });
      } else {
        lettera = await prisma.letteraIncarico.create({
          data: {
            scheduledCourseId: scheduleId,
            trainerId: trainerId,
            templateId: template.id,
            templateVersion: template.version,
            markers: document.markers,
            generatedBy: userId,
            fileSize: document.fileSize,
            nomeFile: document.filename,
            url: document.fileUrl,
            numeroProgressivo,
            annoProgressivo: year,
            tenantId
          }
        });
      }

      logger.info('Letter of engagement generated', {
        component: 'lettere-incarico-routes',
        action: 'generate',
        letteraId: lettera.id,
        documentId: document.id,
        scheduleId,
        trainerId,
        templateId: template.id,
        personId: userId
      });

      res.json({
        lettera,
        document,
        downloadUrl: document.fileUrl
      });
    } catch (error) {
      logger.error('Failed to generate letter of engagement', {
        component: 'lettere-incarico-routes',
        action: 'generate',
        error: error.message,
        stack: error.stack,
        personId: req.user?.id
      });
      res.status(500).json({ error: 'Failed to generate letter of engagement', message: error.message });
    }
  }
);

/**
 * POST /api/v1/lettere-incarico/generate-batch
 * Generate letters for multiple trainers in a schedule
 */
router.post('/generate-batch',
  authenticateToken(),
  requirePermission('create:documents'),
  [
    body('scheduleId').notEmpty().withMessage('Schedule ID is required'),
    body('trainerIds').isArray({ min: 1 }).withMessage('At least one trainer ID is required'),
    body('templateId').optional().isString(),
    body('sendEmail').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation error', details: errors.array() });
      }

      const { scheduleId, trainerIds, templateId, sendEmail } = req.body;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      // Verify schedule
      const schedule = await prisma.courseSchedule.findFirst({
        where: { id: scheduleId, tenantId, deletedAt: null }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Get template
      let template;
      if (templateId) {
        template = await prisma.templateLink.findFirst({
          where: { id: templateId, tenantId, type: 'LETTER_OF_ENGAGEMENT', deletedAt: null }
        });
      } else {
        template = await prisma.templateLink.findFirst({
          where: { 
            tenantId, 
            type: 'LETTER_OF_ENGAGEMENT', 
            isDefault: true,
            isActive: true,
            deletedAt: null 
          }
        });
      }

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Generate batch
      const batchParams = trainerIds.map(trainerId => ({
        entityType: 'schedule',
        entityId: scheduleId,
        trainerId,
        options: { sendEmail: sendEmail || false }
      }));

      const batchJob = await documentService.generateBatch(
        template.id,
        batchParams,
        userId,
        tenantId
      );

      logger.info('Batch letter generation started', {
        component: 'lettere-incarico-routes',
        action: 'generate-batch',
        batchId: batchJob.batchId,
        scheduleId,
        trainerCount: trainerIds.length,
        templateId: template.id,
        personId: userId
      });

      res.json({
        batchId: batchJob.batchId,
        status: batchJob.status,
        total: trainerIds.length,
        message: 'Batch generation started'
      });
    } catch (error) {
      logger.error('Failed to start batch letter generation', {
        component: 'lettere-incarico-routes',
        action: 'generate-batch',
        error: error.message,
        personId: req.user?.id
      });
      res.status(500).json({ error: 'Failed to start batch generation', message: error.message });
    }
  }
);

/**
 * DELETE /api/v1/lettere-incarico/:id
 * Delete letter (soft delete)
 */
router.delete('/:id', authenticateToken(), requirePermission('delete:documents'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const lettera = await prisma.letteraIncarico.findFirst({
      where: { id, tenantId }
    });

    if (!lettera) {
      return res.status(404).json({ error: 'Lettera incarico not found' });
    }

    await prisma.letteraIncarico.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info('Letter of engagement deleted', {
      component: 'lettere-incarico-routes',
      action: 'delete',
      letteraId: id,
      personId: req.user?.id
    });

    res.json({ message: 'Lettera incarico deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete letter of engagement', {
      component: 'lettere-incarico-routes',
      action: 'delete',
      error: error.message,
      personId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to delete letter of engagement' });
  }
});

/**
 * GET /api/v1/lettere-incarico/:id/download
 * Download letter PDF
 */
router.get('/:id/download', authenticateToken(), requirePermission('read:documents'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const lettera = await prisma.letteraIncarico.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!lettera) {
      return res.status(404).json({ error: 'Lettera incarico not found' });
    }

    // Redirect to document download (managed by storage service)
    res.redirect(lettera.url);
  } catch (error) {
    logger.error('Failed to download letter of engagement', {
      component: 'lettere-incarico-routes',
      action: 'download',
      error: error.message,
      personId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to download letter of engagement' });
  }
});

/**
 * ⚠️ IMPORTANTE: Questa route è posizionata DOPO tutte le route specifiche
 * per evitare che catturi path come /generate-batch come parametri ID
 * 
 * GET /api/v1/lettere-incarico/:id
 * Get single letter of engagement
 */
router.get('/:id', authenticateToken(), requirePermission('read:documents'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const lettera = await prisma.letteraIncarico.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        scheduledCourse: {
          include: {
            course: true,
            companies: {
              include: { company: true }
            },
            sessions: {
              include: {
                trainer: true
              }
            }
          }
        },
        trainer: true,
        template: true
      }
    });

    if (!lettera) {
      return res.status(404).json({ error: 'Lettera incarico not found' });
    }

    res.json(lettera);
  } catch (error) {
    logger.error('Failed to fetch lettera incarico', {
      component: 'lettere-incarico-routes',
      action: 'get',
      id: req.params.id,
      error: error.message,
      personId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to fetch lettera incarico' });
  }
});

export default router;
