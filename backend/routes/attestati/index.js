/**
 * Attestati Routes - Index
 * 
 * Aggregatore route modulari per attestati.
 * 
 * Moduli:
 * - crud.routes.js - GET /, GET /:id, DELETE /:id, POST /delete-batch
 * - download.routes.js - GET /:id/download, POST /download-zip-batch
 * - email.routes.js - POST /:id/send-email
 * - generate.routes.js - POST /generate, POST /generate-batch (da implementare)
 * 
 * NOTE: Le route di generazione (POST /generate, POST /generate-batch) sono 
 * ancora nel file originale attestati-routes.js per la loro complessità.
 * Saranno migrate in una fase successiva.
 * 
 * @module routes/attestati
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../../auth/middleware.js';
import { body, validationResult } from 'express-validator';
import logger from '../../utils/logger.js';
import { DocumentService } from '../../services/documentService.js';
import { detectDocumentType } from '../../utils/google-url-parser.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import googleDocsService from '../../services/google-docs-service.js';
import { getValidAccessToken } from '../../services/googleTokenService.js';
import qrCodeService from '../../services/qrCodeService.js';

// Import modular routes
import crudRoutes from './crud.routes.js';
import downloadRoutes from './download.routes.js';
import emailRoutes from './email.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();
const documentService = new DocumentService();

const { authenticate: authenticateToken, authorize: requirePermission } = middleware;

// ============================================================================
// HELPER FUNCTIONS (needed for generation routes)
// ============================================================================

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function translateDeliveryMode(mode) {
  const translations = {
    'IN_PERSON': 'In presenza',
    'ONLINE': 'Online',
    'HYBRID': 'Ibrida',
    'BLENDED': 'Mista',
    'SELF_PACED': 'Autoapprendimento'
  };
  return translations[mode] || mode || '';
}

function translateRiskLevel(level) {
  const translations = {
    'ALTO': 'Alto',
    'MEDIO': 'Medio',
    'BASSO': 'Basso',
    'A': 'A',
    'B': 'B',
    'C': 'C'
  };
  return translations[level] || level || '';
}

function translateCourseType(type) {
  const translations = {
    'PRIMO_CORSO': 'Primo Corso',
    'AGGIORNAMENTO': 'Aggiornamento'
  };
  return translations[type] || type || '';
}

// ============================================================================
// ROUTE ORDER - CRITICAL!
// Specific routes FIRST, then generic /:id routes LAST
// ============================================================================

// Batch operations - MUST be before /:id routes
router.use('/', crudRoutes); // Includes POST /delete-batch first
router.use('/', downloadRoutes); // Includes POST /download-zip-batch, GET /:id/download
router.use('/', emailRoutes); // Includes POST /:id/send-email

// ============================================================================
// GENERATION ROUTES (inline until refactored)
// These are complex and will be moved to generate.routes.js in a future phase
// ============================================================================

/**
 * POST /api/v1/attestati/generate
 * Generate single certificate
 */
router.post(
  '/generate',
  authenticateToken(),
  requirePermission('documents:create'),
  [
    body('scheduleId').isUUID().withMessage('Valid schedule ID required'),
    body('personId').isUUID().withMessage('Valid person ID required'),
    body('templateId').optional().isUUID().withMessage('Invalid template ID'),
    body('sendEmail').optional().isBoolean().withMessage('sendEmail must be boolean'),
    body('validityYears').optional().isInt({ min: 0 }).withMessage('validityYears must be positive integer')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scheduleId, personId, templateId, sendEmail = false, validityYears } = req.body;
      const tenantId = req.person.tenantId;
      const userId = req.person.id;

      // Verify schedule exists and belongs to tenant
      const schedule = await prisma.courseSchedule.findFirst({
        where: {
          id: scheduleId,
          tenantId,
          deletedAt: null
        },
        include: {
          course: true,
          trainer: true,
          sessions: {
            include: {
              trainer: true,
              coTrainer: true
            }
          }
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Verify person exists and belongs to tenant
      const person = await prisma.person.findFirst({
        where: {
          id: personId,
          tenantId,
          deletedAt: null
        },
        include: {
          company: {
            select: {
              id: true,
              ragioneSociale: true,
              piva: true,
              codiceFiscale: true,
              sedeAzienda: true,
              citta: true,
              provincia: true,
              cap: true,
              personaRiferimento: true,
              mail: true,
              telefono: true
            }
          }
        }
      });

      if (!person) {
        return res.status(404).json({ error: 'Person not found' });
      }

      // Check if certificate already exists for this person/schedule
      const existingCertificate = await prisma.attestato.findFirst({
        where: {
          scheduledCourseId: scheduleId,
          personId,
          tenantId,
          deletedAt: null
        }
      });

      if (existingCertificate) {
        return res.status(409).json({
          error: 'Certificate already exists for this person and schedule',
          attestato: existingCertificate
        });
      }

      // Get template (specified or default)
      let template;
      if (templateId) {
        template = await prisma.templateLink.findFirst({
          where: {
            id: templateId,
            type: 'CERTIFICATE',
            tenantId,
            deletedAt: null
          }
        });
        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }
      } else {
        template = await prisma.templateLink.findFirst({
          where: {
            type: 'CERTIFICATE',
            isDefault: true,
            tenantId,
            deletedAt: null
          }
        });
        if (!template) {
          return res.status(404).json({ error: 'No default certificate template found' });
        }
      }

      // Calculate progressive number for this tenant/year
      const currentYear = new Date().getFullYear();
      const lastCertificate = await prisma.attestato.findFirst({
        where: {
          tenantId,
          annoProgressivo: currentYear,
          deletedAt: null
        },
        orderBy: { numeroProgressivo: 'desc' }
      });

      const numeroProgressivo = lastCertificate ? lastCertificate.numeroProgressivo + 1 : 1;

      // Calculate validity date if specified
      let validUntil = null;
      if (validityYears && schedule.course.validityYears) {
        const endDate = new Date(schedule.endDate);
        validUntil = new Date(endDate);
        validUntil.setFullYear(validUntil.getFullYear() + (validityYears || schedule.course.validityYears));
      }

      // Determine correct trainer
      let trainerData = {};
      if (schedule.sessions && schedule.sessions.length > 0) {
        const firstSession = schedule.sessions[0];
        if (firstSession.trainer) {
          trainerData = {
            fullName: `${firstSession.trainer.firstName} ${firstSession.trainer.lastName}`,
            firstName: firstSession.trainer.firstName,
            lastName: firstSession.trainer.lastName,
            qualifications: firstSession.trainer.qualifications || '',
            cf: firstSession.trainer.cf || '',
            email: firstSession.trainer.email || ''
          };
        }
      }
      if (!trainerData.fullName && schedule.trainer) {
        trainerData = {
          fullName: `${schedule.trainer.firstName} ${schedule.trainer.lastName}`,
          firstName: schedule.trainer.firstName,
          lastName: schedule.trainer.lastName,
          qualifications: schedule.trainer.qualifications || '',
          cf: schedule.trainer.cf || '',
          email: schedule.trainer.email || ''
        };
      }

      // Prepare company data
      const companyData = person.company ? {
        id: person.company.id,
        name: person.company.ragioneSociale,
        vatNumber: person.company.piva || '',
        fiscalCode: person.company.codiceFiscale || '',
        legalRepresentative: person.company.personaRiferimento || '',
        email: person.company.mail || '',
        phone: person.company.telefono || '',
        address: {
          street: person.company.sedeAzienda || '',
          city: person.company.citta || '',
          province: person.company.provincia || '',
          postalCode: person.company.cap || '',
          country: 'Italia',
          full: person.company.sedeAzienda && person.company.citta
            ? `${person.company.sedeAzienda}, ${person.company.cap || ''} ${person.company.citta} ${person.company.provincia ? `(${person.company.provincia})` : ''}`.trim()
            : ''
        }
      } : {};

      // Prepare marker context
      const markerContext = {
        tenant: {
          name: req.person.tenant?.name || 'Company Name',
          logoUrl: req.person.tenant?.logoUrl || '',
          address: req.person.tenant?.address || {},
          vatNumber: req.person.tenant?.vatNumber || '',
          email: req.person.tenant?.email || '',
          phone: req.person.tenant?.phone || '',
          legalRepresentative: req.person.tenant?.legalRepresentative || ''
        },
        person: {
          fullName: `${person.firstName} ${person.lastName}`,
          firstName: person.firstName,
          lastName: person.lastName,
          cf: person.taxCode || '',
          birthDate: formatDate(person.birthDate),
          birthPlace: person.birthPlace || '',
          title: person.title || '',
          email: person.email || '',
          phone: person.phone || ''
        },
        company: companyData,
        course: {
          title: schedule.course.title,
          code: schedule.course.code || '',
          duration: schedule.course.duration || 0,
          category: schedule.course.category || '',
          regulation: schedule.course.regulation || '',
          validityYears: schedule.course.validityYears || 0,
          description: schedule.course.description || '',
          riskLevel: translateRiskLevel(schedule.course.riskLevel),
          courseType: translateCourseType(schedule.course.courseType)
        },
        schedule: {
          startDate: formatDate(schedule.startDate),
          endDate: formatDate(schedule.endDate),
          location: schedule.location || '',
          totalHours: schedule.course.duration || 0,
          deliveryMode: translateDeliveryMode(schedule.deliveryMode),
          notes: schedule.notes || ''
        },
        trainer: trainerData,
        document: {
          number: `${numeroProgressivo}/${currentYear}`,
          date: formatDate(new Date()),
          qrCode: ''
        },
        current: {
          date: formatDate(new Date()),
          time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          year: currentYear
        },
        certificate: {
          issueDate: formatDate(new Date()),
          validUntil: validUntil ? formatDate(validUntil) : '',
          registrationNumber: `ATT/${currentYear}/${String(numeroProgressivo).padStart(6, '0')}`
        }
      };

      // Generate QR code for verification
      const registrationNumber = markerContext.certificate.registrationNumber;
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
      const verifyUrl = `${frontendUrl}/verify/${encodeURIComponent(registrationNumber)}`;

      try {
        const qrCodeDataUrl = await qrCodeService.toDataUrl(verifyUrl, { width: 150 });
        markerContext.document.qrCode = `<img src="${qrCodeDataUrl}" alt="QR Code Verifica" style="width: 100%; height: 100%; object-fit: contain;" />`;
      } catch (qrError) {
        logger.warn('Failed to generate QR code', { error: qrError.message });
        markerContext.document.qrCode = '';
      }

      // Generate document
      const document = await documentService.generateDocument({
        templateId: template.id,
        entityType: 'COURSE_SCHEDULE',
        entityId: scheduleId,
        personId,
        tenantId,
        userId,
        options: {
          markers: markerContext,
          strict: false
        }
      });

      // Generate filename
      const today = new Date();
      const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
      const sanitizedFirstName = person.firstName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const sanitizedLastName = person.lastName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const sanitizedCourseTitle = schedule.course.title.replace(/[^a-zA-Z0-9\s]/g, '').trim().substring(0, 50);
      const customFileName = `${dateStr} - ${sanitizedFirstName} ${sanitizedLastName} - ${sanitizedCourseTitle}.pdf`;

      // Create attestato record
      const attestato = await prisma.attestato.create({
        data: {
          personId,
          scheduledCourseId: scheduleId,
          fileName: customFileName,
          fileUrl: document.fileUrl,
          numeroProgressivo,
          annoProgressivo: currentYear,
          templateId: template.id,
          templateVersion: template.version,
          markers: markerContext,
          generatedBy: userId,
          fileSize: document.fileSize,
          tenantId
        },
        include: {
          person: true,
          scheduledCourse: {
            include: { course: true }
          },
          template: true
        }
      });

      logger.info('Certificate generated', {
        component: 'attestati-routes',
        action: 'generate',
        attestatoId: attestato.id,
        scheduleId,
        personId,
        number: `${numeroProgressivo}/${currentYear}`,
        userId
      });

      res.status(201).json({
        attestato,
        document,
        downloadUrl: document.url
      });

    } catch (error) {
      logger.error('Failed to generate certificate', {
        component: 'attestati-routes',
        action: 'generate',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id
      });
      res.status(500).json({ error: 'Failed to generate certificate', message: error.message });
    }
  }
);

// TODO: Move POST /generate-batch here from original file
// For now, generate-batch is complex and will be migrated in a future phase

export default router;
