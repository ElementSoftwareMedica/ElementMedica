/**
 * Registri Presenze Routes
 * 
 * API endpoints per la gestione dei registri presenze
 * con integrazione template system
 */

import express from 'express';
import prisma from '../config/prisma-optimization.js';
import middleware from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { DocumentService } from '../services/documentService.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { signDocument, signDocumentsBulk } from '../services/documentSigningService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fsSync from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const documentService = new DocumentService();

const { authenticate: authenticateToken, requirePermission } = middleware;

/**
 * GET /api/v1/registri-presenze
 * Get all attendance registers
 */
router.get('/', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { scheduleId, sessionId, formatoreId } = req.query;
    const tenantId = getEffectiveTenantId(req);

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
              include: { companyTenantProfile: { include: { company: true } } }
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
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nel recupero dei registri presenze' });
  }
});

/**
 * POST /api/v1/registri-presenze/generate
 * Generate attendance register from template
 * Accepts either sessionId (CourseSession UUID) OR scheduleId + sessionIndex + sessionDate
 */
router.post('/generate',
  authenticateToken,
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
        return res.status(400).json({ error: 'Errore di validazione', details: errors.array() });
      }

      const { sessionId, scheduleId, sessionIndex, sessionDate, sessionStart, sessionEnd, formatoreId, templateId, attendanceData } = req.body;
      const tenantId = getEffectiveTenantId(req);
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
                  include: { companyTenantProfile: { include: { company: true } } }
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
          return res.status(400).json({ error: 'È richiesto un sessionId o scheduleId valido' });
        }

        schedule = await prisma.courseSchedule.findFirst({
          where: { id: effectiveScheduleId, tenantId, deletedAt: null },
          include: {
            course: true,
            companies: {
              include: { companyTenantProfile: { include: { company: true } } }
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
          return res.status(404).json({ error: 'Programmazione non trovata' });
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

      // Verify formatore exists (P48: Person is global, tenantId is on PersonTenantProfile)
      const formatore = await prisma.person.findFirst({
        where: { id: formatoreId, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } }
      });

      if (!formatore) {
        return res.status(404).json({ error: 'Formatore non trovato' });
      }

      // Get template (default if not specified)
      let template;
      if (templateId) {
        template = await prisma.templateLink.findFirst({
          where: { id: templateId, tenantId, type: 'ATTENDANCE_REGISTER', deletedAt: null }
        });
        if (!template) {
          return res.status(404).json({ error: 'Template non trovato' });
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
          return res.status(404).json({ error: 'Nessun template predefinito trovato. Specificare un ID template.' });
        }
      }

      // Get or create attendance records
      let participants = [];
      if (attendanceData && attendanceData.length > 0) {
        // Use provided attendance data - IMPORTANTE: include tenantProfiles per company
        participants = await Promise.all(
          attendanceData.map(async (data) => {
            const person = await prisma.person.findFirst({
              where: { id: data.personId, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } },
              include: {
                tenantProfiles: {
                  where: { tenantId, deletedAt: null },
                  select: {
                    companyTenantProfile: {
                      select: { company: { select: { ragioneSociale: true } } }
                    }
                  },
                  take: 1
                }
              }
            });
            return person ? {
              ...person,
              companyName: person.tenantProfiles?.[0]?.companyTenantProfile?.company?.ragioneSociale || '',
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
                tenantProfiles: {
                  where: { tenantId, deletedAt: null },
                  select: {
                    companyTenantProfile: {
                      select: { company: { select: { ragioneSociale: true } } }
                    }
                  },
                  take: 1
                }
              }
            }
          }
        });

        participants = enrollments
          .filter(e => e.person)
          .map(enrollment => ({
            ...enrollment.person,
            companyName: enrollment.person.tenantProfiles?.[0]?.companyTenantProfile?.company?.ragioneSociale || '',
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
            annoProgressivo: existingRegistro.annoProgressivo,
            // Reset firma quando il documento viene rigenerato
            firmaFormatore: null,
            firmaFormatoreAt: null,
            firmaFormatoreId: null,
            firmaFormatoreIp: null,
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
        error: 'Operazione non riuscita',
        stack: error.stack,
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Errore durante la generazione del registro presenze' });
    }
  }
);

/**
 * PUT /api/v1/registri-presenze/:id/attendance
 * Update attendance data
 */
router.put('/:id/attendance',
  authenticateToken,
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
        return res.status(400).json({ error: 'Errore di validazione', details: errors.array() });
      }

      const { id } = req.params;
      const { attendanceData } = req.body;
      const tenantId = getEffectiveTenantId(req);

      const registro = await prisma.registroPresenze.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!registro) {
        return res.status(404).json({ error: 'Registro presenze non trovato' });
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

      res.json({ message: 'Dati presenza aggiornati con successo' });
    } catch (error) {
      logger.error('Failed to update attendance data', {
        component: 'registri-presenze-routes',
        action: 'update-attendance',
        error: 'Operazione non riuscita',
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Errore nell\'aggiornamento dei dati presenza' });
    }
  }
);

/**
 * DELETE /api/v1/registri-presenze/:id
 * Delete register (soft delete)
 */
router.delete('/:id', authenticateToken, requirePermission('documents:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const registro = await prisma.registroPresenze.findFirst({
      where: { id, tenantId }
    });

    if (!registro) {
      return res.status(404).json({ error: 'Registro presenze non trovato' });
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

    res.json({ message: 'Registro presenze eliminato con successo' });
  } catch (error) {
    logger.error('Failed to delete registro presenze', {
      component: 'registri-presenze-routes',
      action: 'delete',
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nell\'eliminazione del registro presenze' });
  }
});

/**
 * GET /api/v1/registri-presenze/:id/download
 * Download register PDF
 */
router.get('/:id/download', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const registro = await prisma.registroPresenze.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!registro) {
      return res.status(404).json({ error: 'Registro presenze non trovato' });
    }

    // Redirect to document download
    res.redirect(registro.url);
  } catch (error) {
    logger.error('Failed to download registro presenze', {
      component: 'registri-presenze-routes',
      action: 'download',
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nel download del registro presenze' });
  }
});

/**
 * GET /api/v1/registri-presenze/schedule/:scheduleId/download-zip
 * Download multiple registers as ZIP for a schedule
 */
router.get('/schedule/:scheduleId/download-zip',
  authenticateToken,
  requirePermission('documents:read'),
  async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const { ids } = req.query;
      const tenantId = getEffectiveTenantId(req);

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
              error: 'Operazione non riuscita'
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
        error: 'Operazione non riuscita',
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Errore nella creazione del file ZIP' });
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
router.get('/:id', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const registro = await prisma.registroPresenze.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        scheduledCourse: {
          include: {
            course: true,
            companies: {
              include: { companyTenantProfile: { include: { company: true } } }
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
      return res.status(404).json({ error: 'Registro presenze non trovato' });
    }

    res.json(registro);
  } catch (error) {
    logger.error('Failed to fetch registro presenze', {
      component: 'registri-presenze-routes',
      action: 'get',
      id: req.params.id,
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nel recupero del registro presenze' });
  }
});

/**
 * GET /api/v1/registri-presenze/:id/preview
 * Serve registro PDF inline for preview (used by SigningWorkflowModal)
 */
router.get('/:id/preview', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const registro = await prisma.registroPresenze.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!registro) {
      return res.status(404).json({ error: 'Registro presenze non trovato' });
    }

    if (!registro.url) {
      return res.status(404).json({ error: 'File registro non trovato' });
    }

    const backendRoot = path.join(__dirname, '..');

    if (registro.url.startsWith('/uploads/')) {
      const filePath = path.join(backendRoot, registro.url);
      if (fsSync.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        return fsSync.createReadStream(filePath).pipe(res);
      }

      // Fallback: try just the filename in uploads/documents/
      const justFileName = path.basename(registro.url);
      const altPath = path.join(backendRoot, 'uploads', 'documents', justFileName);
      if (fsSync.existsSync(altPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        return fsSync.createReadStream(altPath).pipe(res);
      }

      return res.status(404).json({ error: 'File non trovato su disco' });
    }

    // External URL: proxy the file
    const axios = await import('axios');
    const fileResponse = await axios.default.get(registro.url, { responseType: 'stream' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    fileResponse.data.pipe(res);
  } catch (error) {
    logger.error('Failed to preview registro', {
      component: 'registri-presenze-routes',
      action: 'preview',
      registroId: req.params.id,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nel caricamento dell\'anteprima' });
  }
});

/**
 * POST /api/v1/registri-presenze/:id/sign
 * Apply signature to registro presenze
 */
router.post('/:id/sign', authenticateToken, requirePermission('documents:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);
    const { signatureData, placement } = req.body;

    if (!signatureData) {
      return res.status(400).json({ error: 'Dati firma mancanti' });
    }

    const result = await signDocument({
      documentId: id,
      signatureBase64: signatureData,
      signedById: req.person?.id,
      tenantId,
      placement
    });

    logger.info('Registro presenze signed', {
      component: 'registri-presenze-routes',
      action: 'sign',
      registroId: id,
      signerId: req.person?.id
    });

    res.json({ success: true, message: 'Firma applicata con successo', signedFileUrl: result.signedFileUrl });
  } catch (error) {
    logger.error('Failed to sign registro', {
      component: 'registri-presenze-routes',
      action: 'sign',
      registroId: req.params.id,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nell\'applicazione della firma' });
  }
});

/**
 * POST /api/v1/registri-presenze/bulk-sign
 * Apply signature to multiple registri presenze
 */
router.post('/bulk-sign', authenticateToken, requirePermission('documents:write'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { documentIds, signatureData, placement } = req.body;

    if (!signatureData || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Dati firma o ID documenti mancanti' });
    }

    const { succeeded, failed } = await signDocumentsBulk({
      documentIds,
      signatureBase64: signatureData,
      signedById: req.person?.id,
      tenantId,
      placement
    });

    logger.info('Registri presenze bulk signed', {
      component: 'registri-presenze-routes',
      action: 'bulk-sign',
      succeeded: succeeded.length,
      failed: failed.length,
      signerId: req.person?.id
    });

    res.json({ succeeded, failed });
  } catch (error) {
    logger.error('Failed to bulk sign registri', {
      component: 'registri-presenze-routes',
      action: 'bulk-sign',
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nella firma multipla' });
  }
});

export default router;
