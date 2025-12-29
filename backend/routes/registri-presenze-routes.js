/**
 * Registri Presenze Routes
 * 
 * API endpoints per la gestione dei registri presenze
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
 * GET /api/v1/registri-presenze
 * Get all attendance registers
 */
router.get('/', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { scheduleId, sessionId, formatoreId } = req.query;
    const tenantId = req.person.tenantId;

    const where = {
      tenantId,
      deletedAt: null
    };

    if (scheduleId) where.scheduledCourseId = scheduleId;
    if (sessionId) where.sessionId = sessionId;
    if (formatoreId) where.formatoreId = formatoreId;

    const registri = await prisma.registroPresenze.findMany({
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
        session: {
          include: {
            trainer: true,
            coTrainer: true
          }
        },
        formatore: true,
        template: {
          select: {
            id: true,
            name: true,
            version: true
          }
        },
        presenti: {
          where: { deletedAt: null },
          include: {
            person: true
          }
        }
      },
      orderBy: { dataGenerazione: 'desc' }
    });

    res.json(registri);
  } catch (error) {
    logger.error('Failed to fetch registri presenze', {
      component: 'registri-presenze-routes',
      action: 'list',
      error: error.message,
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Failed to fetch registri presenze' });
  }
});

/**
 * POST /api/v1/registri-presenze/generate
 * Generate attendance register from template
 * Accepts either sessionId (CourseSession UUID) OR scheduleId + sessionIndex + sessionDate
 */
router.post('/generate',
  authenticateToken(),
  requirePermission('documents:create'),
  [
    body('sessionId').optional().isString(),
    body('scheduleId').optional().isString(),
    body('sessionIndex').optional().isInt(),
    body('sessionDate').optional().isString(),
    body('sessionStart').optional().isString(),
    body('sessionEnd').optional().isString(),
    body('formatoreId').notEmpty().withMessage('Formatore ID is required'),
    body('templateId').optional().isString(),
    body('attendanceData').optional().isArray(),
    body('attendanceData.*.personId').optional().isString(),
    body('attendanceData.*.present').optional().isBoolean(),
    body('attendanceData.*.hours').optional().isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation error', details: errors.array() });
      }

      const { sessionId, scheduleId, sessionIndex, sessionDate, sessionStart, sessionEnd, formatoreId, templateId, attendanceData } = req.body;
      const tenantId = req.person.tenantId;
      const userId = req.person.id;

      let session = null;
      let schedule = null;

      // Try to find session by sessionId first (if it's a valid CourseSession UUID)
      if (sessionId && !sessionId.includes('-session-')) {
        session = await prisma.courseSession.findFirst({
          where: { id: sessionId, tenantId, deletedAt: null },
          include: {
            schedule: {
              include: {
                course: true,
                companies: {
                  include: { company: true }
                }
              }
            },
            trainer: true,
            coTrainer: true
          }
        });
      }

      // If no valid session found, try to get schedule directly
      if (!session) {
        // Extract scheduleId from composite sessionId or use provided scheduleId
        let effectiveScheduleId = scheduleId;
        if (!effectiveScheduleId && sessionId && sessionId.includes('-session-')) {
          // Parse composite sessionId: "scheduleId-session-date-index"
          effectiveScheduleId = sessionId.split('-session-')[0];
        }

        if (!effectiveScheduleId) {
          return res.status(400).json({ error: 'Either a valid sessionId or scheduleId is required' });
        }

        schedule = await prisma.courseSchedule.findFirst({
          where: { id: effectiveScheduleId, tenantId, deletedAt: null },
          include: {
            course: true,
            companies: {
              include: { company: true }
            },
            sessions: {
              where: { deletedAt: null },
              include: {
                trainer: true,
                coTrainer: true
              },
              orderBy: { date: 'asc' }
            }
          }
        });

        if (!schedule) {
          return res.status(404).json({ error: 'Schedule not found' });
        }

        // Create a virtual session object from the schedule data
        session = {
          id: sessionId || `${effectiveScheduleId}-session-${sessionIndex || 0}`,
          scheduleId: schedule.id,
          date: sessionDate ? new Date(sessionDate) : new Date(),
          start: sessionStart || '09:00',
          end: sessionEnd || '18:00',
          trainerId: formatoreId,
          schedule: schedule,
          trainer: schedule.sessions?.[sessionIndex || 0]?.trainer || null,
          coTrainer: schedule.sessions?.[sessionIndex || 0]?.coTrainer || null,
          _isVirtual: true // Flag to indicate this is not a real CourseSession
        };
      }

      // Verify formatore exists
      const formatore = await prisma.person.findFirst({
        where: { id: formatoreId, tenantId, deletedAt: null }
      });

      if (!formatore) {
        return res.status(404).json({ error: 'Formatore not found' });
      }

      // Get template (default if not specified)
      let template;
      if (templateId) {
        template = await prisma.templateLink.findFirst({
          where: { id: templateId, tenantId, type: 'ATTENDANCE_REGISTER', deletedAt: null }
        });
        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }
      } else {
        template = await prisma.templateLink.findFirst({
          where: {
            tenantId,
            type: 'ATTENDANCE_REGISTER',
            isDefault: true,
            isActive: true,
            deletedAt: null
          }
        });
        if (!template) {
          return res.status(404).json({ error: 'No default template found. Please specify a template ID.' });
        }
      }

      // Get or create attendance records
      let participants = [];
      if (attendanceData && attendanceData.length > 0) {
        // Use provided attendance data - IMPORTANTE: include company per avere companyName
        participants = await Promise.all(
          attendanceData.map(async (data) => {
            const person = await prisma.person.findFirst({
              where: { id: data.personId, tenantId, deletedAt: null },
              include: {
                company: true // Includi company per ottenere ragioneSociale/name
              }
            });
            return person ? {
              ...person,
              companyName: person.company?.ragioneSociale || person.company?.name || '',
              present: data.present || false,
              hours: data.hours || 0
            } : null;
          })
        );
        participants = participants.filter(p => p !== null);
      } else {
        // CORREZIONE: Get participants from CourseEnrollment, NOT all company employees
        // Prende solo i partecipanti effettivamente iscritti al corso
        const enrollments = await prisma.courseEnrollment.findMany({
          where: {
            scheduleId: session.schedule.id,
            tenantId,
            deletedAt: null
          },
          include: {
            person: {
              include: {
                company: true
              }
            }
          }
        });

        participants = enrollments
          .filter(e => e.person)
          .map(enrollment => ({
            ...enrollment.person,
            companyName: enrollment.person.company?.ragioneSociale || enrollment.person.company?.name || '',
            present: false,
            hours: 0
          }));
      }

      // Generate document using template system
      const document = await documentService.generateDocument({
        templateId: template.id,
        entityType: 'session',
        entityId: sessionId,
        userId,
        tenantId,
        options: {
          formatoreId: formatoreId,
          participants: participants,
          scheduleId: session.scheduleId,
          strict: false // Permetti generazione anche con marker mancanti
        }
      });

      // Get progressive number for this register
      const year = new Date().getFullYear();
      const lastRegistro = await prisma.registroPresenze.findFirst({
        where: {
          tenantId,
          annoProgressivo: year,
          deletedAt: null
        },
        orderBy: { numeroProgressivo: 'desc' }
      });

      const numeroProgressivo = (lastRegistro?.numeroProgressivo || 0) + 1;

      // Create or update RegistroPresenze record
      const existingRegistro = await prisma.registroPresenze.findFirst({
        where: {
          sessionId: sessionId,
          formatoreId: formatoreId,
          deletedAt: null
        }
      });

      let registro;
      if (existingRegistro) {
        registro = await prisma.registroPresenze.update({
          where: { id: existingRegistro.id },
          data: {
            templateId: template.id,
            templateVersion: template.version,
            markers: document.markers,
            generatedBy: userId,
            fileSize: document.fileSize,
            nomeFile: document.fileName || document.file?.filename,
            url: document.fileUrl,
            dataGenerazione: new Date(),
            numeroProgressivo: existingRegistro.numeroProgressivo,
            annoProgressivo: existingRegistro.annoProgressivo
          }
        });
      } else {
        registro = await prisma.registroPresenze.create({
          data: {
            sessionId: sessionId,
            scheduledCourseId: session.scheduleId,
            formatoreId: formatoreId,
            templateId: template.id,
            templateVersion: template.version,
            markers: document.markers,
            generatedBy: userId,
            fileSize: document.fileSize,
            nomeFile: document.fileName || document.file?.filename,
            url: document.fileUrl,
            numeroProgressivo,
            annoProgressivo: year,
            tenantId
          }
        });
      }

      // Create/update attendance records
      if (attendanceData && attendanceData.length > 0) {
        for (const data of attendanceData) {
          await prisma.registroPresenzePartecipante.upsert({
            where: {
              registroPresenzeId_personId: {
                registroPresenzeId: registro.id,
                personId: data.personId
              }
            },
            create: {
              registroPresenzeId: registro.id,
              personId: data.personId,
              presente: data.present || false,
              ore: data.hours || 0,
              note: data.note,
              tenantId
            },
            update: {
              presente: data.present || false,
              ore: data.hours || 0,
              note: data.note
            }
          });
        }
      }

      logger.info('Attendance register generated', {
        component: 'registri-presenze-routes',
        action: 'generate',
        registroId: registro.id,
        documentId: document.id,
        sessionId,
        formatoreId,
        templateId: template.id,
        personId: userId
      });

      res.json({
        registro,
        document,
        downloadUrl: document.fileUrl
      });
    } catch (error) {
      logger.error('Failed to generate attendance register', {
        component: 'registri-presenze-routes',
        action: 'generate',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Failed to generate attendance register', message: error.message });
    }
  }
);

/**
 * PUT /api/v1/registri-presenze/:id/attendance
 * Update attendance data
 */
router.put('/:id/attendance',
  authenticateToken(),
  requirePermission('documents:create'),
  [
    body('attendanceData').isArray({ min: 1 }).withMessage('Attendance data is required'),
    body('attendanceData.*.personId').notEmpty().withMessage('Person ID is required'),
    body('attendanceData.*.present').isBoolean().withMessage('Present must be boolean'),
    body('attendanceData.*.hours').optional().isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation error', details: errors.array() });
      }

      const { id } = req.params;
      const { attendanceData } = req.body;
      const tenantId = req.person.tenantId;

      const registro = await prisma.registroPresenze.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!registro) {
        return res.status(404).json({ error: 'Registro presenze not found' });
      }

      // Update attendance records
      for (const data of attendanceData) {
        await prisma.registroPresenzePartecipante.upsert({
          where: {
            registroPresenzeId_personId: {
              registroPresenzeId: id,
              personId: data.personId
            }
          },
          create: {
            registroPresenzeId: id,
            personId: data.personId,
            presente: data.present,
            ore: data.hours || 0,
            note: data.note,
            tenantId
          },
          update: {
            presente: data.present,
            ore: data.hours || 0,
            note: data.note
          }
        });
      }

      logger.info('Attendance data updated', {
        component: 'registri-presenze-routes',
        action: 'update-attendance',
        registroId: id,
        personId: req.person?.id
      });

      res.json({ message: 'Attendance data updated successfully' });
    } catch (error) {
      logger.error('Failed to update attendance data', {
        component: 'registri-presenze-routes',
        action: 'update-attendance',
        error: error.message,
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Failed to update attendance data' });
    }
  }
);

/**
 * DELETE /api/v1/registri-presenze/:id
 * Delete register (soft delete)
 */
router.delete('/:id', authenticateToken(), requirePermission('documents:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    const registro = await prisma.registroPresenze.findFirst({
      where: { id, tenantId }
    });

    if (!registro) {
      return res.status(404).json({ error: 'Registro presenze not found' });
    }

    await prisma.registroPresenze.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info('Attendance register deleted', {
      component: 'registri-presenze-routes',
      action: 'delete',
      registroId: id,
      personId: req.person?.id
    });

    res.json({ message: 'Registro presenze deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete registro presenze', {
      component: 'registri-presenze-routes',
      action: 'delete',
      error: error.message,
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Failed to delete registro presenze' });
  }
});

/**
 * GET /api/v1/registri-presenze/:id/download
 * Download register PDF
 */
router.get('/:id/download', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    const registro = await prisma.registroPresenze.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!registro) {
      return res.status(404).json({ error: 'Registro presenze not found' });
    }

    // Redirect to document download
    res.redirect(registro.url);
  } catch (error) {
    logger.error('Failed to download registro presenze', {
      component: 'registri-presenze-routes',
      action: 'download',
      error: error.message,
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Failed to download registro presenze' });
  }
});

/**
 * GET /api/v1/registri-presenze/schedule/:scheduleId/download-zip
 * Download multiple registers as ZIP for a schedule
 */
router.get('/schedule/:scheduleId/download-zip',
  authenticateToken(),
  requirePermission('documents:read'),
  async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const { ids } = req.query;
      const tenantId = req.person.tenantId;

      // Build where clause
      const where = {
        scheduledCourseId: scheduleId,
        tenantId,
        deletedAt: null
      };

      // If specific IDs provided, filter by them
      if (ids) {
        const idList = ids.split(',').filter(Boolean);
        if (idList.length > 0) {
          where.id = { in: idList };
        }
      }

      const registri = await prisma.registroPresenze.findMany({
        where,
        include: {
          session: true
        },
        orderBy: { dataGenerazione: 'asc' }
      });

      if (registri.length === 0) {
        return res.status(404).json({ error: 'No registers found for this schedule' });
      }

      // Import archiver for ZIP creation
      const archiver = (await import('archiver')).default;
      const path = await import('path');
      const fs = await import('fs');

      // Set response headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="registri_presenze_${scheduleId}.zip"`);

      // Create archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      // Add each register to the archive
      for (const registro of registri) {
        if (registro.url) {
          try {
            // Get the file path from URL
            const filePath = registro.url.replace(/^\/uploads\//, '');
            const fullPath = path.join(process.cwd(), 'uploads', filePath);

            if (fs.existsSync(fullPath)) {
              // Generate a friendly filename based on session date
              const sessionDate = registro.session?.date
                ? new Date(registro.session.date).toISOString().split('T')[0]
                : registro.id;
              const fileName = `registro_presenze_${sessionDate}.pdf`;

              archive.file(fullPath, { name: fileName });
            }
          } catch (fileError) {
            logger.warn('Failed to add file to ZIP', {
              registroId: registro.id,
              error: fileError.message
            });
          }
        }
      }

      await archive.finalize();

      logger.info('Registers ZIP downloaded', {
        component: 'registri-presenze-routes',
        action: 'download-zip',
        scheduleId,
        count: registri.length,
        personId: req.person?.id
      });
    } catch (error) {
      logger.error('Failed to create registers ZIP', {
        component: 'registri-presenze-routes',
        action: 'download-zip',
        error: error.message,
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Failed to create ZIP file' });
    }
  }
);

/**
 * ⚠️ IMPORTANTE: Questa route è posizionata DOPO tutte le route specifiche
 * per evitare che catturi path come /generate come parametri ID
 * 
 * GET /api/v1/registri-presenze/:id
 * Get single attendance register
 */
router.get('/:id', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    const registro = await prisma.registroPresenze.findFirst({
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
                trainer: true,
                coTrainer: true
              }
            }
          }
        },
        session: {
          include: {
            trainer: true,
            coTrainer: true
          }
        },
        formatore: true,
        template: true,
        presenti: {
          where: { deletedAt: null },
          include: {
            person: true
          },
          orderBy: [
            { person: { lastName: 'asc' } },
            { person: { firstName: 'asc' } }
          ]
        }
      }
    });

    if (!registro) {
      return res.status(404).json({ error: 'Registro presenze not found' });
    }

    res.json(registro);
  } catch (error) {
    logger.error('Failed to fetch registro presenze', {
      component: 'registri-presenze-routes',
      action: 'get',
      id: req.params.id,
      error: error.message,
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Failed to fetch registro presenze' });
  }
});

export default router;
