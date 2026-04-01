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
import prisma from '../../config/prisma-optimization.js';
import middleware from '../../middleware/auth.js';
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
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const documentService = new DocumentService();

const { authenticate: authenticateToken, requirePermission } = middleware;

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
    'IN_PERSON': 'in presenza',
    'ONLINE': 'online',
    'HYBRID': 'in modalità ibrida',
    'BLENDED': 'in modalità mista',
    'SELF_PACED': 'in autoapprendimento'
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
  authenticateToken,
  requirePermission('documents:create'),
  [
    body('scheduleId').isUUID().withMessage('ID calendario non valido'),
    body('personId').isUUID().withMessage('ID persona non valido'),
    body('templateId').optional().isUUID().withMessage('ID template non valido'),
    body('sendEmail').optional().isBoolean().withMessage('sendEmail deve essere un valore booleano'),
    body('validityYears').optional().isInt({ min: 0 }).withMessage('validityYears deve essere un intero positivo')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scheduleId, personId, templateId, sendEmail = false, validityYears } = req.body;
      const tenantId = getEffectiveTenantId(req);
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
        return res.status(404).json({ error: 'Calendario non trovato' });
      }

      // P48: Verify person exists and belongs to tenant via PersonTenantProfile
      const person = await prisma.person.findFirst({
        where: {
          id: personId,
          deletedAt: null,
          tenantProfiles: {
            some: { tenantId, deletedAt: null }
          }
        },
        include: {
          tenantProfiles: {
            where: { tenantId, deletedAt: null },
            take: 1,
            include: {
              companyTenantProfile: {
                include: {
                  company: {
                    select: {
                      id: true,
                      ragioneSociale: true,
                      piva: true,
                      codiceFiscale: true,
                      codiceAteco: true,
                      settore: true,
                      sedeLegaleIndirizzo: true,
                      sedeLegaleCitta: true,
                      sedeLegaleProvincia: true,
                      sedeLegaleCap: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!person) {
        return res.status(404).json({ error: 'Persona non trovata' });
      }

      // P48: Estrai profilo e company dal tenantProfile
      const personProfile = person.tenantProfiles[0];
      const companyTenantProfile = personProfile?.companyTenantProfile || null;
      const personCompany = companyTenantProfile?.company || null;

      // Fetch tenant data for certificate markers
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
        select: { name: true, settings: true, billingEmail: true }
      });
      const tenantSettings = (typeof tenant?.settings === 'object' && tenant?.settings !== null) ? tenant.settings : {};

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
          error: 'Attestato già esistente per questa persona e calendario',
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
          return res.status(404).json({ error: 'Template non trovato' });
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
          return res.status(404).json({ error: 'Nessun template di certificato predefinito trovato' });
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

      // Prepare company data (P48: from tenantProfile → companyTenantProfile → company)
      const companyData = personCompany ? {
        id: personCompany.id,
        name: personCompany.ragioneSociale,
        vatNumber: personCompany.piva || '',
        fiscalCode: personCompany.codiceFiscale || '',
        codiceAteco: personCompany.codiceAteco || '',
        settore: personCompany.settore || '',
        legalRepresentative: '',
        email: companyTenantProfile?.emailGenerale || '',
        phone: companyTenantProfile?.telefonoGenerale || '',
        address: {
          street: personCompany.sedeLegaleIndirizzo || '',
          city: personCompany.sedeLegaleCitta || '',
          province: personCompany.sedeLegaleProvincia || '',
          postalCode: personCompany.sedeLegaleCap || '',
          country: 'Italia',
          full: personCompany.sedeLegaleIndirizzo && personCompany.sedeLegaleCitta
            ? `${personCompany.sedeLegaleIndirizzo}, ${personCompany.sedeLegaleCap || ''} ${personCompany.sedeLegaleCitta} ${personCompany.sedeLegaleProvincia ? `(${personCompany.sedeLegaleProvincia})` : ''}`.trim()
            : ''
        }
      } : {};

      // Prepare marker context
      const markerContext = {
        tenant: {
          name: tenant?.name || 'Company Name',
          logoUrl: tenantSettings.logoUrl || tenantSettings.logo || '',
          address: tenantSettings.address || {},
          vatNumber: tenantSettings.vatNumber || '',
          email: tenantSettings.email || tenant?.billingEmail || '',
          phone: tenantSettings.phone || '',
          legalRepresentative: tenantSettings.legalRepresentative || ''
        },
        person: {
          fullName: `${person.firstName} ${person.lastName}`,
          firstName: person.firstName,
          lastName: person.lastName,
          cf: person.taxCode || '',
          birthDate: formatDate(person.birthDate),
          birthPlace: person.birthPlace || '',
          title: personProfile?.title || '',
          email: personProfile?.email || '',
          phone: personProfile?.phone || ''
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
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          location: schedule.location || '',
          totalHours: schedule.course.duration || 0,
          deliveryMode: translateDeliveryMode(schedule.deliveryMode),
          notes: schedule.notes || ''
        },
        trainer: trainerData,
        document: {
          number: `${numeroProgressivo}/${currentYear}`,
          date: new Date(),
          qrCode: ''
        },
        current: {
          date: new Date(),
          time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          year: currentYear
        },
        certificate: {
          issueDate: new Date(),
          validUntil: validUntil || '',
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

      // Auto-transition: update hasAttestati and auto-set status
      const autoStatusUpdate = { hasAttestati: true };
      if (schedule.status === 'PREVENTIVO') {
        const now = new Date();
        const lastSessionDate = schedule.sessions?.length > 0
          ? new Date(Math.max(...schedule.sessions.map(s => new Date(s.date).getTime())))
          : new Date(schedule.endDate);
        if (lastSessionDate <= now) {
          autoStatusUpdate.status = 'COMPLETATO';
        } else {
          autoStatusUpdate.status = 'ACCETTATO';
        }
      }
      await prisma.courseSchedule.update({
        where: { id: scheduleId },
        data: autoStatusUpdate
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
        error: 'Operazione non riuscita',
        stack: error.stack,
        personId: req.person?.id
      });
      return res.status(500).json({
        success: false,
        error: 'Errore interno del server',
        message: 'Errore nella generazione dell\'attestato'
      });
    }
  }
);

/**
 * POST /api/v1/attestati/generate-batch
 * Generate certificates for multiple persons in a single schedule
 */
router.post(
  '/generate-batch',
  authenticateToken,
  requirePermission('documents:create'),
  [
    body('scheduleId').isUUID().withMessage('ID calendario non valido'),
    body('personIds').isArray({ min: 1 }).withMessage('Almeno un partecipante richiesto'),
    body('personIds.*').isUUID().withMessage('ID persona non valido'),
    body('templateId').optional().isUUID().withMessage('ID template non valido'),
    body('sendEmail').optional().isBoolean().withMessage('sendEmail deve essere un valore booleano'),
    body('validityYears').optional().isInt({ min: 0 }).withMessage('validityYears deve essere un intero positivo')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scheduleId, personIds, templateId, sendEmail = false, validityYears } = req.body;
      const tenantId = getEffectiveTenantId(req);
      const userId = req.person.id;

      // Verify schedule exists and belongs to tenant
      const schedule = await prisma.courseSchedule.findFirst({
        where: { id: scheduleId, tenantId, deletedAt: null },
        include: {
          course: true,
          trainer: true,
          sessions: {
            include: { trainer: true, coTrainer: true }
          }
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Calendario non trovato' });
      }

      // Get template (specified or default)
      let template;
      if (templateId) {
        template = await prisma.templateLink.findFirst({
          where: { id: templateId, type: 'CERTIFICATE', tenantId, deletedAt: null }
        });
        if (!template) {
          return res.status(404).json({ error: 'Template non trovato' });
        }
      } else {
        template = await prisma.templateLink.findFirst({
          where: { type: 'CERTIFICATE', isDefault: true, tenantId, deletedAt: null }
        });
        if (!template) {
          return res.status(404).json({ error: 'Nessun template di certificato predefinito trovato' });
        }
      }

      // Fetch tenant data
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
        select: { name: true, settings: true, billingEmail: true }
      });
      const tenantSettings = (typeof tenant?.settings === 'object' && tenant?.settings !== null) ? tenant.settings : {};

      // Determine trainer data from sessions
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

      const currentYear = new Date().getFullYear();
      const batchId = `batch-${Date.now()}`;
      const results = [];
      const batchErrors = [];
      let successCount = 0;
      let failedCount = 0;

      // Process each person sequentially to avoid progressive number conflicts
      for (const personId of personIds) {
        try {
          // P48: Verify person exists and belongs to tenant via PersonTenantProfile
          const person = await prisma.person.findFirst({
            where: {
              id: personId,
              deletedAt: null,
              tenantProfiles: { some: { tenantId, deletedAt: null } }
            },
            include: {
              tenantProfiles: {
                where: { tenantId, deletedAt: null },
                take: 1,
                include: {
                  companyTenantProfile: {
                    include: {
                      company: {
                        select: {
                          id: true, ragioneSociale: true, piva: true, codiceFiscale: true,
                          codiceAteco: true, settore: true,
                          sedeLegaleIndirizzo: true, sedeLegaleCitta: true, sedeLegaleProvincia: true, sedeLegaleCap: true
                        }
                      }
                    }
                  }
                }
              }
            }
          });

          if (!person) {
            failedCount++;
            batchErrors.push({ personId, error: 'Persona non trovata' });
            results.push({ success: false, personId, error: 'Persona non trovata' });
            continue;
          }

          const personProfile = person.tenantProfiles[0];
          const companyTenantProfile = personProfile?.companyTenantProfile || null;
          const personCompany = companyTenantProfile?.company || null;

          // Check if certificate already exists
          const existingCertificate = await prisma.attestato.findFirst({
            where: { scheduledCourseId: scheduleId, personId, tenantId, deletedAt: null }
          });

          if (existingCertificate) {
            failedCount++;
            const personName = `${person.firstName} ${person.lastName}`;
            batchErrors.push({ personId, personName, error: 'Attestato già esistente' });
            results.push({ success: false, personId, personName, error: 'Attestato già esistente' });
            continue;
          }

          // Calculate progressive number
          const lastCertificate = await prisma.attestato.findFirst({
            where: { tenantId, annoProgressivo: currentYear, deletedAt: null },
            orderBy: { numeroProgressivo: 'desc' }
          });
          const numeroProgressivo = lastCertificate ? lastCertificate.numeroProgressivo + 1 : 1;

          // Calculate validity date
          let validUntil = null;
          if (validityYears && schedule.course.validityYears) {
            const endDate = new Date(schedule.endDate);
            validUntil = new Date(endDate);
            validUntil.setFullYear(validUntil.getFullYear() + (validityYears || schedule.course.validityYears));
          }

          // Prepare company data
          const companyData = personCompany ? {
            id: personCompany.id,
            name: personCompany.ragioneSociale,
            vatNumber: personCompany.piva || '',
            fiscalCode: personCompany.codiceFiscale || '',
            legalRepresentative: '',
            codiceAteco: personCompany.codiceAteco || '',
            settore: personCompany.settore || '',
            email: companyTenantProfile?.emailGenerale || '',
            phone: companyTenantProfile?.telefonoGenerale || '',
            address: {
              street: personCompany.sedeLegaleIndirizzo || '',
              city: personCompany.sedeLegaleCitta || '',
              province: personCompany.sedeLegaleProvincia || '',
              postalCode: personCompany.sedeLegaleCap || '',
              country: 'Italia',
              full: personCompany.sedeLegaleIndirizzo && personCompany.sedeLegaleCitta
                ? `${personCompany.sedeLegaleIndirizzo}, ${personCompany.sedeLegaleCap || ''} ${personCompany.sedeLegaleCitta} ${personCompany.sedeLegaleProvincia ? `(${personCompany.sedeLegaleProvincia})` : ''}`.trim()
                : ''
            }
          } : {};

          // Prepare marker context
          const markerContext = {
            tenant: {
              name: tenant?.name || 'Company Name',
              logoUrl: tenantSettings.logoUrl || tenantSettings.logo || '',
              address: tenantSettings.address || {},
              vatNumber: tenantSettings.vatNumber || '',
              email: tenantSettings.email || tenant?.billingEmail || '',
              phone: tenantSettings.phone || '',
              legalRepresentative: tenantSettings.legalRepresentative || ''
            },
            person: {
              fullName: `${person.firstName} ${person.lastName}`,
              firstName: person.firstName,
              lastName: person.lastName,
              cf: person.taxCode || '',
              birthDate: formatDate(person.birthDate),
              birthPlace: person.birthPlace || '',
              title: personProfile?.title || '',
              email: personProfile?.email || '',
              phone: personProfile?.phone || ''
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
              startDate: schedule.startDate,
              endDate: schedule.endDate,
              location: schedule.location || '',
              totalHours: schedule.course.duration || 0,
              deliveryMode: translateDeliveryMode(schedule.deliveryMode),
              notes: schedule.notes || ''
            },
            trainer: trainerData,
            document: {
              number: `${numeroProgressivo}/${currentYear}`,
              date: new Date(),
              qrCode: ''
            },
            current: {
              date: new Date(),
              time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
              year: currentYear
            },
            certificate: {
              issueDate: new Date(),
              validUntil: validUntil || '',
              registrationNumber: `ATT/${currentYear}/${String(numeroProgressivo).padStart(6, '0')}`
            }
          };

          // Generate QR code
          const registrationNumber = markerContext.certificate.registrationNumber;
          const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
          const verifyUrl = `${frontendUrl}/verify/${encodeURIComponent(registrationNumber)}`;

          try {
            const qrCodeDataUrl = await qrCodeService.toDataUrl(verifyUrl, { width: 150 });
            markerContext.document.qrCode = `<img src="${qrCodeDataUrl}" alt="QR Code Verifica" style="width: 100%; height: 100%; object-fit: contain;" />`;
          } catch (qrError) {
            logger.warn('Failed to generate QR code in batch', { error: qrError.message, personId });
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
            options: { markers: markerContext, strict: false }
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
            }
          });

          const personName = `${person.firstName} ${person.lastName}`;
          successCount++;
          results.push({
            success: true,
            personId,
            personName,
            attestatoId: attestato.id,
            downloadUrl: document.fileUrl
          });

          logger.info('Batch certificate generated', {
            component: 'attestati-routes',
            action: 'generate-batch-item',
            attestatoId: attestato.id,
            scheduleId,
            personId,
            number: `${numeroProgressivo}/${currentYear}`,
            userId
          });

        } catch (personError) {
          failedCount++;
          batchErrors.push({ personId, error: 'Errore nella generazione' });
          results.push({ success: false, personId, error: 'Errore nella generazione' });
          logger.error('Batch certificate generation failed for person', {
            component: 'attestati-routes',
            action: 'generate-batch-item-error',
            personId,
            error: 'Operazione non riuscita',
            scheduleId,
            userId
          });
        }
      }

      logger.info('Batch certificate generation complete', {
        component: 'attestati-routes',
        action: 'generate-batch',
        batchId,
        total: personIds.length,
        success: successCount,
        failed: failedCount,
        scheduleId,
        userId
      });

      // Auto-transition: update hasAttestati and auto-set status
      if (successCount > 0) {
        const autoStatusUpdate = { hasAttestati: true };
        if (schedule.status === 'PREVENTIVO') {
          const now = new Date();
          const lastSessionDate = schedule.sessions?.length > 0
            ? new Date(Math.max(...schedule.sessions.map(s => new Date(s.date).getTime())))
            : new Date(schedule.endDate);
          if (lastSessionDate <= now) {
            autoStatusUpdate.status = 'COMPLETATO';
          } else {
            autoStatusUpdate.status = 'ACCETTATO';
          }
        }
        await prisma.courseSchedule.update({
          where: { id: scheduleId },
          data: autoStatusUpdate
        });
      }

      res.status(successCount > 0 ? 201 : 400).json({
        batchId,
        total: personIds.length,
        success: successCount,
        failed: failedCount,
        results,
        errors: batchErrors
      });

    } catch (error) {
      logger.error('Failed to generate batch certificates', {
        component: 'attestati-routes',
        action: 'generate-batch',
        error: 'Operazione non riuscita',
        stack: error.stack,
        personId: req.person?.id
      });
      return res.status(500).json({
        success: false,
        error: 'Errore interno del server',
        message: 'Errore nella generazione batch degli attestati'
      });
    }
  }
);

export default router;
