/**
 * Lettere Incarico Routes
 * 
 * API endpoints per la gestione delle lettere di incarico
 * con integrazione template system
 */

import express from 'express';
import { requireFeature } from '../middleware/featureFlags.js';
import prisma from '../config/prisma-optimization.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { DocumentService } from '../services/documentService.js';
import movimentoContabileService from '../services/management/movimento-contabile-service.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { isTrainerOnlyAccess, getTrainerScheduleIds } from '../utils/trainerAccess.js';
import { signDocument, signDocumentsBulk } from '../services/documentSigningService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const documentService = new DocumentService();

const isSignedLettera = (lettera) => Boolean(
  lettera.firmaFormatore ||
  lettera.firmaFormatoreAt ||
  lettera.firmaDatoreLavoro ||
  lettera.firmaDatoreLavoroAt ||
  lettera.firmaDatoreLavoroId
);

async function auditLetteraDelete(req, lettera, tenantId, deletionReason, db = prisma) {
  if (isSignedLettera(lettera)) {
    await db.gdprAuditLog.create({
      data: {
        tenantId,
        personId: req.person.id,
        resourceType: 'LetteraIncarico',
        resourceId: lettera.id,
        action: 'DELETE',
        dataAccessed: {
          operation: 'SOFT_DELETE',
          deletionReason,
          signedDocument: true,
          scheduledCourseId: lettera.scheduledCourseId,
          trainerId: lettera.trainerId
        },
        ipAddress: req.ip || null,
        userAgent: req.get?.('user-agent') || null
      }
    });
    return;
  }

  await db.activityLog.create({
    data: {
      personId: req.person.id,
      tenantId,
      action: 'LETTERA_INCARICO_DELETE',
      category: 'DOCUMENTS',
      resource: 'LetteraIncarico',
      resourceId: lettera.id,
      details: deletionReason,
      metadata: { signedDocument: false, scheduledCourseId: lettera.scheduledCourseId, trainerId: lettera.trainerId },
      ipAddress: req.ip || null,
      userAgent: req.get?.('user-agent') || null
    }
  });
}


// Feature gate: tutte le route lettere incarico richiedono BRANCH_FORMAZIONE
router.use(authenticate, requireFeature('BRANCH_FORMAZIONE'));

/**
 * GET /api/v1/lettere-incarico
 * Get all letters of engagement
 */
router.get('/', authenticate, requirePermission('documents:read'), async (req, res) => {
  try {
    const { scheduleId, trainerId } = req.query;
    const tenantId = getEffectiveTenantId(req);

    const where = {
      tenantId,
      deletedAt: null
    };

    if (scheduleId) where.scheduledCourseId = scheduleId;
    if (trainerId) where.trainerId = trainerId;

    // TRAINER-only: limita alle lettere dei propri corsi programmati
    const person = req.person;
    if (await isTrainerOnlyAccess(person.id, tenantId)) {
      const scheduleIds = await getTrainerScheduleIds(person.id, tenantId);
      if (scheduleIds.length === 0) return res.json([]);
      where.scheduledCourseId = { in: scheduleIds };
    }

    const lettere = await prisma.letteraIncarico.findMany({
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
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nel recupero delle lettere di incarico' });
  }
});

/**
 * POST /api/v1/lettere-incarico/generate
 * Generate letter of engagement from template
 */
router.post('/generate',
  authenticate,
  requirePermission('documents:create'),
  [
    body('scheduleId').notEmpty().withMessage('ID programmazione obbligatorio'),
    body('trainerId').notEmpty().withMessage('ID formatore obbligatorio'),
    body('templateId').optional().isString(),
    body('hourlyRate').optional().isNumeric().withMessage('La tariffa oraria deve essere un numero'),
    body('expenses').optional().isNumeric().withMessage('Le spese devono essere un numero'),
    body('sendEmail').optional().isBoolean(),
    body('email').optional().isEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Errore di validazione', details: errors.array() });
      }

      const { scheduleId, trainerId, templateId, hourlyRate, expenses, sendEmail, email } = req.body;
      const tenantId = getEffectiveTenantId(req);
      const userId = req.person.id;

      // Verify schedule exists
      const schedule = await prisma.courseSchedule.findFirst({
        where: { id: scheduleId, tenantId, deletedAt: null },
        include: {
          course: true,
          companies: {
            include: { companyTenantProfile: { include: { company: true } } }
          },
          sessions: {
            include: {
              trainer: true
            }
          }
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Programmazione non trovata' });
      }

      // P48: Verify trainer exists via PersonTenantProfile (Person is global, no tenantId)
      const trainer = await prisma.person.findFirst({
        where: {
          id: trainerId,
          deletedAt: null,
          tenantProfiles: { some: { tenantId, deletedAt: null } }
        },
        include: {
          tenantProfiles: {
            where: { tenantId, deletedAt: null },
            take: 1
          }
        }
      });

      if (!trainer) {
        return res.status(404).json({ error: 'Formatore non trovato' });
      }

      // P48: Extract tenant profile for email, phone, hourlyRate, etc.
      const trainerProfile = trainer.tenantProfiles?.[0] || {};

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

      // Use provided hourlyRate or trainer's default (P48: hourlyRate on PersonTenantProfile)
      const effectiveHourlyRate = hourlyRate !== undefined ? parseFloat(hourlyRate) : (parseFloat(trainerProfile.hourlyRate) || 0);

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
          return res.status(404).json({ error: 'Template non trovato' });
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
          return res.status(404).json({ error: 'Nessun template predefinito trovato. Specificare un ID template.' });
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
          trainerId: trainerId,
          tenantId
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
      // P48: ScheduleCompany → companyTenantProfile → company
      const participantCompanies = (schedule.companies || [])
        .map(sc => sc.companyTenantProfile?.company?.ragioneSociale || sc.companyTenantProfile?.company?.name)
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
            // Override trainer data with calculated values (P48: profile fields from trainerProfile)
            trainerOverride: {
              id: trainer.id,
              fullName: `${trainer.firstName} ${trainer.lastName}`,
              firstName: trainer.firstName,
              lastName: trainer.lastName,
              email: trainerProfile.email || '',
              phone: trainerProfile.phone || '',
              qualifications: '',
              certifications: (trainerProfile.certifications || []).join(', '),
              specialties: (trainerProfile.specialties || []).join(', '),
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
                email: trainerProfile.email || ''
              },
              participantCompanies: participantCompanies,
              partecipantCompanies: participantCompanies // Alias for typo in templates
            }
          },
          sendEmail: sendEmail || false,
          email: email || trainerProfile.email || ''
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
            annoProgressivo: isExistingActive ? existingLettera.annoProgressivo : year,
            // Reset firma se il documento era stato eliminato (ricreazione)
            ...(existingLettera.deletedAt ? {
              firmaFormatore: null,
              firmaFormatoreAt: null,
              firmaDatoreLavoro: null,
              firmaDatoreLavoroAt: null,
              firmaDatoreLavoroId: null,
            } : {})
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

      // Crea bozza MovimentoContabile USCITA per compenso formatore (idempotente)
      if (totalCompensation > 0) {
        try {
          const esistenteUscita = await prisma.movimentoContabile.findFirst({
            where: { courseScheduleId: scheduleId, personId: trainerId, tipo: 'COMPENSO_FORMATORE', direzione: 'USCITA', tenantId, deletedAt: null }
          });
          if (esistenteUscita) {
            await prisma.movimentoContabile.update({
              where: { id: esistenteUscita.id },
              data: {
                importoLordo: totalCompensation, importoNetto: totalCompensation, importoIva: 0, aliquotaIva: 0,
                descrizione: `Compenso formatore - ${trainer.firstName} ${trainer.lastName} - ${schedule.course?.title || 'Corso'}`,
                updatedBy: userId
              }
            });
          } else {
            await movimentoContabileService.create(tenantId, {
              direzione: 'USCITA', tipo: 'COMPENSO_FORMATORE', tipoSoggetto: 'FORMATORE', stato: 'DA_FATTURARE',
              importoLordo: totalCompensation, importoNetto: totalCompensation, importoIva: 0, aliquotaIva: 0,
              dataEsecuzione: new Date(), courseScheduleId: scheduleId,
              preventivoId: null, personId: trainerId,
              descrizione: `Compenso formatore - ${trainer.firstName} ${trainer.lastName} - ${schedule.course?.title || 'Corso'}`,
              branchType: 'MEDICA', createdBy: userId
            });
          }
          logger.info('MovimentoContabile USCITA formatore', { component: 'lettere-incarico-routes', trainerId, scheduleId, aggiornato: !!esistenteUscita });
        } catch (movErr) {
          logger.error('Errore MovimentoContabile USCITA formatore', { component: 'lettere-incarico-routes', trainerId, scheduleId, error: movErr.message });
        }
      }

      logger.info('Letter of engagement generated', {
        component: 'lettere-incarico-routes', action: 'generate',
        letteraId: lettera.id, documentId: document.id, scheduleId, trainerId,
        templateId: template.id, personId: userId
      });

      res.json({
        lettera: {
          ...lettera,
          trainerName: `${trainer.firstName} ${trainer.lastName}`,
          trainerEmail: trainerProfile.email || null
        },
        document,
        downloadUrl: document.fileUrl
      });
    } catch (error) {
      logger.error('Failed to generate letter of engagement', {
        component: 'lettere-incarico-routes',
        action: 'generate',
        error: 'Operazione non riuscita',
        stack: error.stack,
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Errore nella generazione della lettera di incarico' });
    }
  }
);

/**
 * POST /api/v1/lettere-incarico/generate-batch
 * Generate letters for multiple trainers in a schedule
 */
router.post('/generate-batch',
  authenticate,
  requirePermission('documents:create'),
  [
    body('scheduleId').notEmpty().withMessage('ID programmazione obbligatorio'),
    body('trainerIds').isArray({ min: 1 }).withMessage('Almeno un ID formatore è richiesto'),
    body('templateId').optional().isString(),
    body('sendEmail').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Errore di validazione', details: errors.array() });
      }

      const { scheduleId, trainerIds, templateId, sendEmail } = req.body;
      const tenantId = getEffectiveTenantId(req);
      const userId = req.person.id;

      // Verify schedule
      const schedule = await prisma.courseSchedule.findFirst({
        where: { id: scheduleId, tenantId, deletedAt: null }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Programmazione non trovata' });
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
        return res.status(404).json({ error: 'Template non trovato' });
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
        message: 'Generazione batch avviata'
      });
    } catch (error) {
      logger.error('Failed to start batch letter generation', {
        component: 'lettere-incarico-routes',
        action: 'generate-batch',
        error: 'Operazione non riuscita',
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Errore nella generazione batch delle lettere di incarico' });
    }
  }
);

/**
 * DELETE /api/v1/lettere-incarico/:id
 * Delete letter (soft delete)
 */
router.delete('/:id', authenticate, requirePermission('documents:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const lettera = await prisma.letteraIncarico.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!lettera) {
      return res.status(404).json({ error: 'Lettera di incarico non trovata' });
    }

    const deletionReason = req.body?.deletionReason || 'Eliminazione lettera incarico formazione';

    await prisma.$transaction(async (tx) => {
      await tx.letteraIncarico.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      await auditLetteraDelete(req, lettera, tenantId, deletionReason, tx);
    });

    // Soft-delete del MovimentoContabile USCITA collegato (se presente)
    try {
      await prisma.movimentoContabile.updateMany({
        where: {
          courseScheduleId: lettera.scheduledCourseId,
          personId: lettera.trainerId,
          tipo: 'COMPENSO_FORMATORE',
          direzione: 'USCITA',
          tenantId,
          deletedAt: null
        },
        data: { deletedAt: new Date() }
      });
    } catch (movErr) {
      logger.error('Errore eliminazione MovimentoContabile USCITA collegato', {
        component: 'lettere-incarico-routes',
        letteraId: id,
        error: movErr.message
      });
    }

    logger.info('Letter of engagement deleted', {
      component: 'lettere-incarico-routes',
      action: 'delete',
      letteraId: id,
      personId: req.person?.id
    });

    res.json({ message: 'Lettera di incarico eliminata con successo' });
  } catch (error) {
    logger.error('Failed to delete letter of engagement', {
      component: 'lettere-incarico-routes',
      action: 'delete',
      error: 'Operazione non riuscita',
      personId: req.person?.id,
      letteraId: req.params?.id
    });
    res.status(500).json({ error: 'Errore nell\'eliminazione della lettera di incarico' });
  }
});

/**
 * GET /api/v1/lettere-incarico/:id/download
 * Download letter PDF
 */
router.get('/:id/download', authenticate, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const lettera = await prisma.letteraIncarico.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!lettera) {
      return res.status(404).json({ error: 'Lettera di incarico non trovata' });
    }

    if (!lettera.url) {
      return res.status(404).json({ error: 'File lettera di incarico non trovato' });
    }

    // Resolve file path from /uploads/... URL
    // __dirname is backend/routes/, so go up one level to backend/
    const backendRoot = path.join(__dirname, '..');
    const downloadFileName = lettera.nomeFile || `lettera-incarico-${id}.pdf`;

    if (lettera.url.startsWith('/uploads/')) {
      const filePath = path.join(backendRoot, lettera.url);

      if (fs.existsSync(filePath)) {
        return res.download(filePath, downloadFileName);
      }

      // Fallback: try uploads/documents/ base
      const justFileName = path.basename(lettera.url);
      const altPath = path.join(backendRoot, 'uploads', 'documents', justFileName);
      if (fs.existsSync(altPath)) {
        return res.download(altPath, downloadFileName);
      }

      logger.error('Letter file not found on disk', {
        component: 'lettere-incarico-routes',
        action: 'download',
        letteraId: id,
        primaryPath: filePath,
        altPath
      });
      return res.status(404).json({ error: 'File non trovato su disco' });
    }

    // External URL fallback
    res.redirect(lettera.url);
  } catch (error) {
    logger.error('Failed to download letter of engagement', {
      component: 'lettere-incarico-routes',
      action: 'download',
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nel download della lettera di incarico' });
  }
});

/**
 * GET /api/v1/lettere-incarico/schedule/:scheduleId/download-zip
 * Download multiple letters as ZIP for a schedule
 */
router.get('/schedule/:scheduleId/download-zip',
  authenticate,
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

      const lettere = await prisma.letteraIncarico.findMany({
        where,
        include: {
          trainer: true
        }
      });

      if (lettere.length === 0) {
        return res.status(404).json({ error: 'Nessuna lettera trovata per questa programmazione' });
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
              error: 'Operazione non riuscita'
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
        personId: req.person?.id
      });
    } catch (error) {
      logger.error('Failed to create letters ZIP', {
        component: 'lettere-incarico-routes',
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
 * per evitare che catturi path come /generate-batch come parametri ID
 * 
 * GET /api/v1/lettere-incarico/:id
 * Get single letter of engagement
 */
router.get('/:id', authenticate, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const lettera = await prisma.letteraIncarico.findFirst({
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
      return res.status(404).json({ error: 'Lettera di incarico non trovata' });
    }

    res.json(lettera);
  } catch (error) {
    logger.error('Failed to fetch lettera incarico', {
      component: 'lettere-incarico-routes',
      action: 'get',
      id: req.params.id,
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nel recupero della lettera di incarico' });
  }
});

/**
 * GET /api/v1/lettere-incarico/:id/preview
 * Serve lettera PDF inline for preview (used by SigningWorkflowModal)
 */
router.get('/:id/preview', authenticate, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const lettera = await prisma.letteraIncarico.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!lettera) {
      return res.status(404).json({ error: 'Lettera di incarico non trovata' });
    }

    if (!lettera.url) {
      return res.status(404).json({ error: 'File lettera non trovato' });
    }

    const backendRoot = path.join(__dirname, '..');

    if (lettera.url.startsWith('/uploads/')) {
      const filePath = path.join(backendRoot, lettera.url);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        return fs.createReadStream(filePath).pipe(res);
      }

      const justFileName = path.basename(lettera.url);
      const altPath = path.join(backendRoot, 'uploads', 'documents', justFileName);
      if (fs.existsSync(altPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        return fs.createReadStream(altPath).pipe(res);
      }

      return res.status(404).json({ error: 'File non trovato su disco' });
    }

    // External URL: proxy the file
    const axios = await import('axios');
    const fileResponse = await axios.default.get(lettera.url, { responseType: 'stream' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    fileResponse.data.pipe(res);
  } catch (error) {
    logger.error('Failed to preview lettera', {
      component: 'lettere-incarico-routes',
      action: 'preview',
      letteraId: req.params.id,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nel caricamento dell\'anteprima' });
  }
});

/**
 * POST /api/v1/lettere-incarico/:id/sign
 * Apply signature to lettera di incarico
 */
router.post('/:id/sign', authenticate, requirePermission('documents:write'), async (req, res) => {
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

    logger.info('Lettera incarico signed', {
      component: 'lettere-incarico-routes',
      action: 'sign',
      letteraId: id,
      signerId: req.person?.id
    });

    res.json({ success: true, message: 'Firma applicata con successo', signedFileUrl: result.signedFileUrl });
  } catch (error) {
    logger.error('Failed to sign lettera', {
      component: 'lettere-incarico-routes',
      action: 'sign',
      letteraId: req.params.id,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nell\'applicazione della firma' });
  }
});

/**
 * POST /api/v1/lettere-incarico/bulk-sign
 * Apply signature to multiple lettere di incarico
 */
router.post('/bulk-sign', authenticate, requirePermission('documents:write'), async (req, res) => {
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

    logger.info('Lettere incarico bulk signed', {
      component: 'lettere-incarico-routes',
      action: 'bulk-sign',
      succeeded: succeeded.length,
      failed: failed.length,
      signerId: req.person?.id
    });

    res.json({ succeeded, failed });
  } catch (error) {
    logger.error('Failed to bulk sign lettere', {
      component: 'lettere-incarico-routes',
      action: 'bulk-sign',
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nella firma multipla' });
  }
});

export default router;
