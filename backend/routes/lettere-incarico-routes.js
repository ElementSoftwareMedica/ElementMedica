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
router.get('/', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
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
  requirePermission('documents:create'),
  [
    body('scheduleId').notEmpty().withMessage('Schedule ID is required'),
    body('trainerId').notEmpty().withMessage('Trainer ID is required'),
    body('templateId').optional().isString(),
    body('hourlyRate').optional().isNumeric().withMessage('Hourly rate must be a number'),
    body('expenses').optional().isNumeric().withMessage('Expenses must be a number'),
    body('sendEmail').optional().isBoolean(),
    body('email').optional().isEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation error', details: errors.array() });
      }

      const { scheduleId, trainerId, templateId, hourlyRate, expenses, sendEmail, email } = req.body;
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

      // Helper function to calculate hours from start and end time strings (e.g., "09:00", "13:00")
      const calculateSessionDuration = (start, end) => {
        if (!start || !end) return 0;
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);
        const startMinutes = (startHour || 0) * 60 + (startMin || 0);
        const endMinutes = (endHour || 0) * 60 + (endMin || 0);
        const durationMinutes = endMinutes - startMinutes;
        return durationMinutes > 0 ? durationMinutes / 60 : 0;
      };

      // Calculate trainer's hours from sessions where they are the trainer
      const trainerSessions = schedule.sessions.filter(s => s.trainerId === trainerId);
      const totalHours = trainerSessions.reduce((sum, s) => {
        // Use duration if available, otherwise calculate from start/end
        const sessionDuration = s.duration || calculateSessionDuration(s.start, s.end);
        return sum + sessionDuration;
      }, 0);

      // Debug log for session calculation
      logger.info('Session calculation debug', {
        component: 'lettere-incarico-routes',
        action: 'session-calc',
        trainerId,
        totalSessionsInSchedule: schedule.sessions?.length || 0,
        sessionsForTrainer: trainerSessions.length,
        sessionDetails: schedule.sessions?.map(s => ({
          id: s.id,
          trainerId: s.trainerId,
          start: s.start,
          end: s.end,
          duration: s.duration,
          calculatedDuration: calculateSessionDuration(s.start, s.end),
          matchesTrainer: s.trainerId === trainerId
        })),
        trainerSessionDurations: trainerSessions.map(s => s.duration || calculateSessionDuration(s.start, s.end)),
        calculatedTotalHours: totalHours
      });

      // Use provided hourlyRate or trainer's default
      const effectiveHourlyRate = hourlyRate !== undefined ? parseFloat(hourlyRate) : (parseFloat(trainer.hourlyRate) || 0);

      // Use provided expenses or 0
      const effectiveExpenses = expenses !== undefined ? parseFloat(expenses) : 0;

      // Calculate total compensation
      const totalCompensation = (effectiveHourlyRate * totalHours) + effectiveExpenses;

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

      // Get progressive number BEFORE document generation (needed for document.number marker)
      const year = new Date().getFullYear();
      const lastLettera = await prisma.letteraIncarico.findFirst({
        where: {
          tenantId,
          annoProgressivo: year,
          deletedAt: null
        },
        orderBy: { numeroProgressivo: 'desc' }
      });

      // Check if this letter already exists (including soft-deleted ones due to unique constraint)
      const existingLettera = await prisma.letteraIncarico.findFirst({
        where: {
          scheduledCourseId: scheduleId,
          trainerId: trainerId
          // NOTE: Don't filter by deletedAt here - unique constraint doesn't consider soft delete
        }
      });

      // Determine if this is a "live" record or a soft-deleted one
      const isExistingActive = existingLettera && !existingLettera.deletedAt;

      // Use existing number if regenerating an active record, otherwise get next number
      const numeroProgressivo = isExistingActive
        ? existingLettera.numeroProgressivo
        : (lastLettera?.numeroProgressivo || 0) + 1;

      // Format document number (e.g., "1/2025")
      const documentNumber = `${numeroProgressivo}/${year}`;

      // Helper function to format date as dd/mm/yyyy
      const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };

      // Build participant companies list
      // Note: Company model uses 'ragioneSociale' field, not 'name'
      const participantCompanies = (schedule.companies || [])
        .map(sc => sc.company?.ragioneSociale || sc.company?.name)
        .filter(Boolean)
        .join(', ') || 'N/A';

      logger.info('Lettere incarico generation data', {
        component: 'lettere-incarico-routes',
        action: 'generate-debug',
        trainerId,
        totalHours,
        effectiveHourlyRate,
        totalCompensation,
        participantCompanies,
        companiesCount: schedule.companies?.length || 0
      });

      // Generate document using template system
      const document = await documentService.generateDocument({
        templateId: template.id,
        entityType: 'COURSE_SCHEDULE',
        entityId: scheduleId,
        userId,
        tenantId,
        options: {
          strict: false, // Permette marker custom non standard (es. session.trainer) - NON è un bypass di sicurezza
          trainerId: trainerId, // Pass trainer ID for multi-trainer schedules
          customData: {
            // Override trainer data with calculated values
            trainerOverride: {
              id: trainer.id,
              fullName: `${trainer.firstName} ${trainer.lastName}`,
              firstName: trainer.firstName,
              lastName: trainer.lastName,
              email: trainer.email,
              phone: trainer.phone || '',
              qualifications: trainer.qualifications || '',
              certifications: trainer.certifications || '',
              specialties: trainer.specialties || '',
              hourlyRate: effectiveHourlyRate,
              totalHours: totalHours,
              expenses: effectiveExpenses,
              totalCompensation: totalCompensation,
              // Formatted values for display
              hourlyRateFormatted: `€ ${effectiveHourlyRate.toFixed(2).replace('.', ',')}`,
              totalHoursFormatted: `${totalHours}h`,
              expensesFormatted: `€ ${effectiveExpenses.toFixed(2).replace('.', ',')}`,
              totalCompensationFormatted: `€ ${totalCompensation.toFixed(2).replace('.', ',')}`
            },
            // Document metadata
            documentOverride: {
              number: documentNumber,
              date: formatDate(new Date()),
              year: year
            },
            // Schedule date overrides (formatted)
            scheduleOverride: {
              startDate: formatDate(schedule.startDate),
              endDate: formatDate(schedule.endDate),
              participantCompanies: participantCompanies,
              partecipantCompanies: participantCompanies // Alias for typo in templates
            },
            // Session alias for trainer (session.trainer = trainer)
            sessionOverride: {
              trainer: {
                fullName: `${trainer.firstName} ${trainer.lastName}`,
                firstName: trainer.firstName,
                lastName: trainer.lastName,
                email: trainer.email
              },
              participantCompanies: participantCompanies,
              partecipantCompanies: participantCompanies // Alias for typo in templates
            }
          },
          sendEmail: sendEmail || false,
          email: email || trainer.email
        }
      });

      // Create or update LetteraIncarico record
      // Handle 3 cases: active record (update), soft-deleted record (resurrect), no record (create)

      let lettera;
      if (existingLettera) {
        // Update existing record (whether active or soft-deleted - resurrect it)
        lettera = await prisma.letteraIncarico.update({
          where: { id: existingLettera.id },
          data: {
            templateId: template.id,
            templateVersion: template.version,
            markers: document.markers,
            generatedBy: userId,
            fileSize: document.fileSize,
            nomeFile: document.fileName,
            url: document.fileUrl,
            dataGenerazione: new Date(),
            deletedAt: null, // Resurrect if was soft-deleted
            // Keep existing number if active, use new number if was deleted
            numeroProgressivo: isExistingActive ? existingLettera.numeroProgressivo : numeroProgressivo,
            annoProgressivo: isExistingActive ? existingLettera.annoProgressivo : year
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
            nomeFile: document.fileName,
            url: document.fileUrl,
            numeroProgressivo,
            annoProgressivo: year,
            tenantId
          }
        });
      }

      // ====================================================================
      // COMPENSO FORMATORE - Crea/aggiorna preventivo per compensi formatore
      // ====================================================================
      let preventivoCompensazione = null;

      // Solo se c'è un compenso da tracciare (tariffa oraria o spese)
      if (totalCompensation > 0) {
        // Cerca preventivo esistente per questo formatore/schedule
        const existingPreventivo = await prisma.preventivo.findFirst({
          where: {
            scheduledCourseId: scheduleId,
            tipoServizio: 'COMPENSO_FORMATORE',
            tenantId,
            deletedAt: null,
            // Usa dettagliServizio per trovare il trainer specifico
            dettagliServizio: {
              path: ['trainerId'],
              equals: trainerId
            }
          }
        });

        // Get progressive number for preventivo
        const lastPreventivo = await prisma.preventivo.findFirst({
          where: {
            tenantId,
            annoProgressivo: year,
            deletedAt: null
          },
          orderBy: { numeroProgressivo: 'desc' }
        });
        const nextPreventivoNumber = (lastPreventivo?.numeroProgressivo || 0) + 1;

        // Prepara i dati del preventivo
        const preventivoData = {
          tipoServizio: 'COMPENSO_FORMATORE',
          tipoPrezzo: 'ORARIO',
          titoloServizio: `Compenso Formatore - ${trainer.firstName} ${trainer.lastName}`,
          descrizioneServizio: `Compenso per attività di formazione\nCorso: ${schedule.course?.title || 'N/A'}\nOre: ${totalHours}h\nTariffa: €${effectiveHourlyRate.toFixed(2)}/h\nSpese: €${effectiveExpenses.toFixed(2)}`,
          clienteType: 'PERSONA',
          personaId: trainerId,
          scheduledCourseId: scheduleId,
          corsoId: schedule.course?.id || null,
          quantita: Math.ceil(totalHours) || 1,
          prezzoUnitario: effectiveHourlyRate,
          prezzoTotale: totalCompensation,
          scontoTotale: 0,
          imponibile: totalCompensation,
          aliquotaIva: 0, // Formatori spesso con ritenuta d'acconto, no IVA
          importoIva: 0,
          importoFinale: totalCompensation,
          stato: 'BOZZA',
          dataEmissione: new Date(),
          dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni
          dettagliServizio: {
            trainerId: trainerId,
            trainerName: `${trainer.firstName} ${trainer.lastName}`,
            scheduleId: scheduleId,
            courseName: schedule.course?.title || 'N/A',
            totalHours: totalHours,
            hourlyRate: effectiveHourlyRate,
            expenses: effectiveExpenses,
            letteraIncaricoId: lettera.id
          },
          note: `Collegato a Lettera di Incarico n. ${documentNumber}`,
          tenantId,
          generatedBy: userId
        };

        if (existingPreventivo) {
          // Aggiorna preventivo esistente
          preventivoCompensazione = await prisma.preventivo.update({
            where: { id: existingPreventivo.id },
            data: {
              ...preventivoData,
              generatedBy: userId
            }
          });

          logger.info('Preventivo compenso formatore updated', {
            component: 'lettere-incarico-routes',
            action: 'update-preventivo-compenso',
            preventivoId: preventivoCompensazione.id,
            trainerId,
            totalCompensation
          });
        } else {
          // Crea nuovo preventivo
          preventivoCompensazione = await prisma.preventivo.create({
            data: {
              ...preventivoData,
              numero: `COMP-${year}-${String(nextPreventivoNumber).padStart(4, '0')}`,
              annoProgressivo: year,
              numeroProgressivo: nextPreventivoNumber
            }
          });

          logger.info('Preventivo compenso formatore created', {
            component: 'lettere-incarico-routes',
            action: 'create-preventivo-compenso',
            preventivoId: preventivoCompensazione.id,
            trainerId,
            totalCompensation
          });
        }
      }

      logger.info('Letter of engagement generated', {
        component: 'lettere-incarico-routes',
        action: 'generate',
        letteraId: lettera.id,
        documentId: document.id,
        scheduleId,
        trainerId,
        templateId: template.id,
        personId: userId,
        preventivoCompensoId: preventivoCompensazione?.id || null
      });

      res.json({
        lettera,
        document,
        downloadUrl: document.fileUrl,
        preventivoCompenso: preventivoCompensazione
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
  requirePermission('documents:create'),
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
router.delete('/:id', authenticateToken(), requirePermission('documents:delete'), async (req, res) => {
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
router.get('/:id/download', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
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
 * GET /api/v1/lettere-incarico/schedule/:scheduleId/download-zip
 * Download multiple letters as ZIP for a schedule
 */
router.get('/schedule/:scheduleId/download-zip',
  authenticateToken(),
  requirePermission('documents:read'),
  async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const { ids } = req.query;
      const tenantId = req.user.tenantId;

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

      const lettere = await prisma.letteraIncarico.findMany({
        where,
        include: {
          trainer: true
        }
      });

      if (lettere.length === 0) {
        return res.status(404).json({ error: 'No letters found for this schedule' });
      }

      // Import archiver for ZIP creation
      const archiver = (await import('archiver')).default;
      const path = await import('path');
      const fs = await import('fs');

      // Set response headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="lettere_incarico_${scheduleId}.zip"`);

      // Create archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      // Add each letter to the archive
      for (const lettera of lettere) {
        if (lettera.url) {
          try {
            // Get the file path from URL
            const filePath = lettera.url.replace(/^\/uploads\//, '');
            const fullPath = path.join(process.cwd(), 'uploads', filePath);

            if (fs.existsSync(fullPath)) {
              // Generate a friendly filename
              const trainerName = lettera.trainer
                ? `${lettera.trainer.firstName}_${lettera.trainer.lastName}`.replace(/\s+/g, '_')
                : 'trainer';
              const fileName = `lettera_incarico_${trainerName}.pdf`;

              archive.file(fullPath, { name: fileName });
            }
          } catch (fileError) {
            logger.warn('Failed to add file to ZIP', {
              letterId: lettera.id,
              error: fileError.message
            });
          }
        }
      }

      await archive.finalize();

      logger.info('Letters ZIP downloaded', {
        component: 'lettere-incarico-routes',
        action: 'download-zip',
        scheduleId,
        count: lettere.length,
        personId: req.user?.id
      });
    } catch (error) {
      logger.error('Failed to create letters ZIP', {
        component: 'lettere-incarico-routes',
        action: 'download-zip',
        error: error.message,
        personId: req.user?.id
      });
      res.status(500).json({ error: 'Failed to create ZIP file' });
    }
  }
);

/**
 * ⚠️ IMPORTANTE: Questa route è posizionata DOPO tutte le route specifiche
 * per evitare che catturi path come /generate-batch come parametri ID
 * 
 * GET /api/v1/lettere-incarico/:id
 * Get single letter of engagement
 */
router.get('/:id', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
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
