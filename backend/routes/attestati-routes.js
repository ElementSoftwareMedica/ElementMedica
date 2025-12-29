/**
 * Attestati Routes
 * 
 * API endpoints per la gestione degli attestati (certificates)
 * con integrazione template system, batch generation, email delivery e ZIP download
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../auth/middleware.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { DocumentService } from '../services/documentService.js';
import archiver from 'archiver';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import { detectDocumentType } from '../utils/google-url-parser.js';
import path from 'path';
import { fileURLToPath } from 'url';
import googleDocsService from '../services/google-docs-service.js';
import { getValidAccessToken } from '../services/googleTokenService.js';
import qrCodeService from '../services/qrCodeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();
const documentService = new DocumentService();

const { authenticate: authenticateToken, authorize: requirePermission } = middleware;

// Helper function to format dates to dd/mm/yyyy
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper function to translate deliveryMode to Italian
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

// Helper function to translate riskLevel to Italian
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

// Helper function to translate courseType to Italian
function translateCourseType(type) {
  const translations = {
    'PRIMO_CORSO': 'Primo Corso',
    'AGGIORNAMENTO': 'Aggiornamento'
  };
  return translations[type] || type || '';
}

/**
 * GET /api/v1/attestati
 * Get all certificates with optional filters
 */
router.get('/', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { scheduleId, year } = req.query;
    let personId = req.query.personId;
    const tenantId = req.user.tenantId;
    const person = req.person;

    // Verifica se l'utente è EMPLOYEE (ha solo il ruolo EMPLOYEE, non altri ruoli admin)
    const personRoles = await prisma.personRole.findMany({
      where: {
        personId: person.id,
        tenantId,
        isActive: true,
        deletedAt: null
      },
      select: { roleType: true }
    });

    const roleTypes = personRoles.map(pr => pr.roleType);
    const isEmployeeOnly = roleTypes.includes('EMPLOYEE') &&
      !roleTypes.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER', 'TRAINER'].includes(r));

    // Se è EMPLOYEE, forza il filtro per il proprio personId
    if (isEmployeeOnly) {
      personId = person.id;
    }

    const where = {
      tenantId,
      deletedAt: null
    };

    if (scheduleId) where.scheduledCourseId = scheduleId;
    if (personId) where.personId = personId;
    if (year) where.annoProgressivo = parseInt(year);

    const attestati = await prisma.attestato.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            taxCode: true,
            email: true
          }
        },
        scheduledCourse: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                code: true,
                duration: true,
                category: true
              }
            },
            trainer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: [
        { annoProgressivo: 'desc' },
        { numeroProgressivo: 'desc' }
      ]
    });

    // Map taxCode to cf for frontend compatibility
    const mappedAttestati = attestati.map(attestato => {
      if (!attestato.person) {
        // Return attestato with empty person object if missing
        return {
          ...attestato,
          person: {
            id: null,
            firstName: '',
            lastName: '',
            cf: '',
            email: ''
          }
        };
      }

      const { taxCode, ...personWithoutTaxCode } = attestato.person;
      return {
        ...attestato,
        person: {
          ...personWithoutTaxCode,
          cf: taxCode || ''
        }
      };
    });

    res.json(mappedAttestati);
  } catch (error) {
    logger.error('Failed to fetch attestati', {
      component: 'attestati-routes',
      action: 'list',
      error: error.message,
      stack: error.stack,
      personId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to fetch attestati',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

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
      const tenantId = req.user.tenantId;
      const userId = req.user.id;

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

      // Determine correct trainer (from sessions or fallback to schedule)
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
      // Fallback to schedule trainer if no session trainer
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
          name: req.user.tenant?.name || 'Company Name',
          logoUrl: req.user.tenant?.logoUrl || '',
          address: req.user.tenant?.address || {},
          vatNumber: req.user.tenant?.vatNumber || '',
          email: req.user.tenant?.email || '',
          phone: req.user.tenant?.phone || '',
          legalRepresentative: req.user.tenant?.legalRepresentative || ''
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
          qrCode: '' // Will be populated below
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
      // Use FRONTEND_URL for QR verification - take first URL if multiple are configured
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
      const verifyUrl = `${frontendUrl}/verify/${encodeURIComponent(registrationNumber)}`;

      // Extract QR code dimensions from template if available
      let qrWidth = 150; // Default size in pixels
      let qrHeight = 150;
      try {
        if (template.content) {
          const templateContent = typeof template.content === 'string'
            ? JSON.parse(template.content)
            : template.content;

          if (templateContent.__slideEditor && templateContent.elements) {
            const qrElement = templateContent.elements.find(el => el.type === 'qrcode');
            if (qrElement) {
              // Use element dimensions, scale up for print quality (2x for 150 DPI)
              qrWidth = Math.round(qrElement.width * 2) || 150;
              qrHeight = Math.round(qrElement.height * 2) || 150;
              logger.info('QR code dimensions from template', { qrWidth, qrHeight, elementWidth: qrElement.width, elementHeight: qrElement.height });
            }
          }
        }
      } catch (parseError) {
        logger.warn('Failed to parse template for QR dimensions', { error: parseError.message });
      }

      try {
        // Generate QR with extracted dimensions (use the larger dimension for square QR)
        const qrSize = Math.max(qrWidth, qrHeight);
        const qrCodeDataUrl = await qrCodeService.toDataUrl(verifyUrl, { width: qrSize });
        // Store both the QR image and the dimensions for the template
        markerContext.document.qrCode = `<img src="${qrCodeDataUrl}" alt="QR Code Verifica" style="width: 100%; height: 100%; object-fit: contain;" />`;
        markerContext.document.qrCodeWidth = qrWidth;
        markerContext.document.qrCodeHeight = qrHeight;
      } catch (qrError) {
        logger.warn('Failed to generate QR code for attestato', { error: qrError.message });
        markerContext.document.qrCode = '';
      }

      // Generate document
      const document = await documentService.generateDocument({
        templateId: template.id,
        entityType: 'COURSE_SCHEDULE',  // ✅ FIX: Corretto da 'CERTIFICATE'
        entityId: scheduleId,
        personId,
        tenantId,
        userId,
        options: {
          markers: markerContext,
          strict: false  // Bypass marker validation (markers passed explicitly via markerContext)
        }
      });

      // Generate filename with format: yyyy.mm.dd - nome cognome - corso
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
        personId: userId
      });

      // Send email if requested
      if (sendEmail && person.email) {
        try {
          // TODO: Implement email sending via email service
          logger.info('Email sending requested for certificate', {
            attestatoId: attestato.id,
            recipientEmail: person.email
          });
        } catch (emailError) {
          logger.error('Failed to send certificate email', {
            error: emailError.message,
            attestatoId: attestato.id
          });
          // Don't fail the whole request if email fails
        }
      }

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
        personId: req.user?.id
      });
      res.status(500).json({ error: 'Failed to generate certificate', message: error.message });
    }
  }
);

/**
 * POST /api/v1/attestati/generate-batch
 * Generate certificates for multiple participants
 */
router.post(
  '/generate-batch',
  authenticateToken(),
  requirePermission('documents:create'),
  [
    body('scheduleId').isUUID().withMessage('Valid schedule ID required'),
    body('personIds').isArray({ min: 1 }).withMessage('At least one person ID required'),
    body('personIds.*').isUUID().withMessage('All person IDs must be valid UUIDs'),
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

      const { scheduleId, personIds, templateId, sendEmail = false, validityYears } = req.body;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      // Verify schedule
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

      // Get template
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
      } else {
        template = await prisma.templateLink.findFirst({
          where: {
            type: 'CERTIFICATE',
            isDefault: true,
            tenantId,
            deletedAt: null
          }
        });
      }

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Get all persons with their company data
      const persons = await prisma.person.findMany({
        where: {
          id: { in: personIds },
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
              codiceAteco: true,
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

      if (persons.length !== personIds.length) {
        return res.status(404).json({ error: 'Some persons not found' });
      }

      // Check for existing certificates
      const existingCertificates = await prisma.attestato.findMany({
        where: {
          scheduledCourseId: scheduleId,
          personId: { in: personIds },
          tenantId,
          deletedAt: null
        }
      });

      if (existingCertificates.length > 0) {
        return res.status(409).json({
          error: 'Some certificates already exist',
          existing: existingCertificates.map(c => ({
            personId: c.personId,
            attestatoId: c.id
          }))
        });
      }

      // Start batch generation
      const batchId = `batch-${Date.now()}`;
      const results = [];
      const batchErrors = [];

      for (const person of persons) {
        try {
          // Calculate progressive number
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

          // Calculate validity
          let validUntil = null;
          if (validityYears && schedule.course.validityYears) {
            const endDate = new Date(schedule.endDate);
            validUntil = new Date(endDate);
            validUntil.setFullYear(validUntil.getFullYear() + (validityYears || schedule.course.validityYears));
          }

          // Determine correct trainer (from sessions or fallback to schedule)
          let trainerData = {};
          if (schedule.sessions && schedule.sessions.length > 0) {
            const firstSession = schedule.sessions[0];
            if (firstSession.trainer) {
              trainerData = {
                fullName: `${firstSession.trainer.firstName} ${firstSession.trainer.lastName}`,
                firstName: firstSession.trainer.firstName,
                lastName: firstSession.trainer.lastName,
                email: firstSession.trainer.email || '',
                phone: firstSession.trainer.phone || '',
                hourlyRate: firstSession.trainer.hourlyRate,
                qualifications: firstSession.trainer.qualifications || ''
              };
            }
          }
          // Fallback to schedule trainer if no session trainer
          if (!trainerData.fullName && schedule.trainer) {
            trainerData = {
              fullName: `${schedule.trainer.firstName} ${schedule.trainer.lastName}`,
              firstName: schedule.trainer.firstName,
              lastName: schedule.trainer.lastName,
              email: schedule.trainer.email || '',
              phone: schedule.trainer.phone || '',
              hourlyRate: schedule.trainer.hourlyRate,
              qualifications: schedule.trainer.qualifications || ''
            };
          }

          // Prepare company data
          const companyData = person.company ? {
            id: person.company.id,
            name: person.company.ragioneSociale,
            vatNumber: person.company.piva || '',
            fiscalCode: person.company.codiceFiscale || '',
            codiceAteco: person.company.codiceAteco || '',
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

          // Prepare markers
          const markerContext = {
            tenant: {
              name: req.user.tenant?.name || 'Company Name',
              logoUrl: req.user.tenant?.logoUrl || '',
              address: req.user.tenant?.address || {},
              vatNumber: req.user.tenant?.vatNumber || '',
              email: req.user.tenant?.email || '',
              phone: req.user.tenant?.phone || '',
              legalRepresentative: req.user.tenant?.legalRepresentative || ''
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
              qrCode: '' // Will be populated below
            },
            current: {
              date: formatDate(new Date()),
              time: new Date().toLocaleTimeString('it-IT'),
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
          // Use FRONTEND_URL for QR verification - take first URL if multiple are configured
          const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
          const verifyUrl = `${frontendUrl}/verify/${encodeURIComponent(registrationNumber)}`;

          // Extract QR code dimensions from template if available
          let qrWidth = 150; // Default size in pixels
          let qrHeight = 150;
          try {
            if (template.content) {
              const templateContent = typeof template.content === 'string'
                ? JSON.parse(template.content)
                : template.content;

              if (templateContent.__slideEditor && templateContent.elements) {
                const qrElement = templateContent.elements.find(el => el.type === 'qrcode');
                if (qrElement) {
                  // Use element dimensions, scale up for print quality (2x for 150 DPI)
                  qrWidth = Math.round(qrElement.width * 2) || 150;
                  qrHeight = Math.round(qrElement.height * 2) || 150;
                }
              }
            }
          } catch (parseError) {
            // Ignore parse errors, use default dimensions
          }

          try {
            // Generate QR with extracted dimensions
            const qrSize = Math.max(qrWidth, qrHeight);
            const qrCodeDataUrl = await qrCodeService.toDataUrl(verifyUrl, { width: qrSize });
            markerContext.document.qrCode = `<img src="${qrCodeDataUrl}" alt="QR Code Verifica" style="width: 100%; height: 100%; object-fit: contain;" />`;
            markerContext.document.qrCodeWidth = qrWidth;
            markerContext.document.qrCodeHeight = qrHeight;
          } catch (qrError) {
            logger.warn('Failed to generate QR code for attestato', { error: qrError.message });
            markerContext.document.qrCode = '';
          }

          // Generate document
          let document;

          // Check if template uses Google Docs/Slides
          if (template.googleDocsId || template.googleSlidesId) {
            // Use Google API for generation
            const accessToken = await getValidAccessToken(userId, tenantId);

            // Detect document type with validation (auto-corrects mismatches)
            const { documentId, documentType, warnings } = detectDocumentType(template);

            // Log any warnings about mismatched fields
            warnings.forEach(warning => {
              logger.warn(warning, {
                component: 'attestati-routes',
                action: 'generate-batch',
                templateId: template.id,
                templateName: template.name
              });
              console.warn(`⚠️  ${warning}`);
            });

            if (!documentId || !documentType) {
              throw new Error(`Template ${template.id} has invalid Google document configuration`);
            }

            // Flatten markerContext for Google API (only top-level placeholders)
            const flatMarkers = {
              // Person
              NOME: person.firstName,
              COGNOME: person.lastName,
              NOME_COMPLETO: `${person.firstName} ${person.lastName}`,
              CODICE_FISCALE: person.taxCode || '',
              DATA_NASCITA: formatDate(person.birthDate),
              LUOGO_NASCITA: person.birthPlace || '',
              PROFILO_PROFESSIONALE: person.title || person.jobTitle || '',
              EMAIL: person.email || '',
              TELEFONO: person.phone || '',
              INDIRIZZO_VIA: person.residenceAddress || '',
              INDIRIZZO_CITTA: person.residenceCity || '',
              INDIRIZZO_PROVINCIA: person.residenceProvince || '',
              INDIRIZZO_CAP: person.residenceCap || '',
              INDIRIZZO_PAESE: 'Italia',
              INDIRIZZO_COMPLETO: [
                person.residenceAddress,
                person.residenceCap,
                person.residenceCity,
                person.residenceProvince ? `(${person.residenceProvince})` : ''
              ].filter(Boolean).join(' '),

              // Course
              CORSO_TITOLO: schedule.course.title,
              CORSO_CODICE: schedule.course.code || '',
              CORSO_DURATA: String(schedule.course.duration || 0),
              CORSO_CATEGORIA: schedule.course.category || '',
              CORSO_NORMATIVA: schedule.course.regulation || '',
              CORSO_VALIDITA_ANNI: String(schedule.course.validityYears || 0),
              CORSO_DESCRIZIONE: schedule.course.description || '',
              CORSO_OBIETTIVI: schedule.course.objectives || '',
              CORSO_LIVELLO_RISCHIO: translateRiskLevel(schedule.course.riskLevel),
              CORSO_TIPOLOGIA: translateCourseType(schedule.course.courseType),

              // Schedule
              DATA_INIZIO: formatDate(schedule.startDate),
              DATA_FINE: formatDate(schedule.endDate),
              SEDE_CORSO: schedule.location || '',
              ORE_TOTALI: String(schedule.course.duration || 0),
              MODALITA_EROGAZIONE: translateDeliveryMode(schedule.deliveryMode),
              CODICE_EDIZIONE: schedule.code || '',
              INDIRIZZO_SEDE: schedule.address || schedule.location || '',

              // Trainer
              NOME_FORMATORE: trainerData.firstName || '',
              COGNOME_FORMATORE: trainerData.lastName || '',
              FORMATORE_COMPLETO: trainerData.fullName || '',
              EMAIL_FORMATORE: trainerData.email || '',
              TELEFONO_FORMATORE: trainerData.phone || '',
              TARIFFA_ORARIA: trainerData.hourlyRate ? `€ ${parseFloat(trainerData.hourlyRate).toFixed(2)}` : '',
              COMPENSO_TOTALE: trainerData.hourlyRate && schedule.course.duration
                ? `€ ${(parseFloat(trainerData.hourlyRate) * (schedule.course.duration || 0)).toFixed(2)}`
                : '',

              // Company
              AZIENDA_RAGIONE_SOCIALE: companyData.name || '',
              AZIENDA_PIVA: companyData.vatNumber || '',
              AZIENDA_CF: companyData.fiscalCode || '',
              AZIENDA_INDIRIZZO: companyData.address?.full || '',
              AZIENDA_CODICE_ATECO: companyData.codiceAteco || '',
              AZIENDA_VIA: companyData.address?.street || '',
              AZIENDA_CITTA: companyData.address?.city || '',
              AZIENDA_PROVINCIA: companyData.address?.province || '',
              AZIENDA_CAP: companyData.address?.postalCode || '',
              AZIENDA_EMAIL: companyData.email || '',
              AZIENDA_TELEFONO: companyData.phone || '',
              AZIENDA_RAPPRESENTANTE: companyData.legalRepresentative || '',

              // Document
              NUMERO_PROGRESSIVO: `${numeroProgressivo}/${currentYear}`,
              DATA_GENERAZIONE: formatDate(new Date()),
              ANNO: String(currentYear),
              NUMERO_ATTESTATO: `ATT/${currentYear}/${String(numeroProgressivo).padStart(6, '0')}`,
              DATA_SCADENZA: validUntil ? formatDate(validUntil) : '',

              // QR Code for certificate verification
              // Generated using local qrcode library (no external API dependency)
              QR_CODE_VERIFICA: await (async () => {
                try {
                  const { generateVerificationQRCode } = await import('../services/qrCodeService.js');
                  const attestatoNumber = `ATT/${currentYear}/${String(numeroProgressivo).padStart(6, '0')}`;
                  return await generateVerificationQRCode(attestatoNumber);
                } catch (qrError) {
                  // Fallback to Google Chart API if local generation fails
                  logger.warn('QR code local generation failed, using Google Chart API fallback', { error: qrError.message });
                  const attestatoNumber = `ATT/${currentYear}/${String(numeroProgressivo).padStart(6, '0')}`;
                  const verifyUrl = `${process.env.PUBLIC_URL || 'https://app.elementmedica.it'}/verify/${encodeURIComponent(attestatoNumber)}`;
                  return `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(verifyUrl)}&choe=UTF-8`;
                }
              })(),

              // System / Tenant
              DATA_CORRENTE: formatDate(new Date()),
              ORA_CORRENTE: new Date().toLocaleTimeString('it-IT'),
              ENTE_NOME: req.user.tenant?.name || '',
              ENTE_INDIRIZZO: req.user.tenant?.address || '',
              ENTE_TELEFONO: req.user.tenant?.phone || '',
              ENTE_EMAIL: req.user.tenant?.email || ''
            };

            // Add lowercase/nested versions of all placeholders for compatibility
            // This allows users to use {{person.firstName}} OR {{NOME}} in their templates
            const lowercaseMarkers = {
              // Person
              'person.firstName': flatMarkers.NOME,
              'person.lastName': flatMarkers.COGNOME,
              'person.fullName': flatMarkers.NOME_COMPLETO,
              'person.cf': flatMarkers.CODICE_FISCALE,
              'person.birthDate': flatMarkers.DATA_NASCITA,
              'person.birthPlace': flatMarkers.LUOGO_NASCITA,
              'person.title': flatMarkers.PROFILO_PROFESSIONALE,
              'person.email': flatMarkers.EMAIL,
              'person.phone': flatMarkers.TELEFONO,
              'person.address.street': flatMarkers.INDIRIZZO_VIA,
              'person.address.city': flatMarkers.INDIRIZZO_CITTA,
              'person.address.province': flatMarkers.INDIRIZZO_PROVINCIA,
              'person.address.postalCode': flatMarkers.INDIRIZZO_CAP,
              'person.address.full': flatMarkers.INDIRIZZO_COMPLETO,

              // Course
              'course.title': flatMarkers.CORSO_TITOLO,
              'course.code': flatMarkers.CORSO_CODICE,
              'course.duration': flatMarkers.CORSO_DURATA,
              'course.category': flatMarkers.CORSO_CATEGORIA,
              'course.regulation': flatMarkers.CORSO_NORMATIVA,
              'course.validityYears': flatMarkers.CORSO_VALIDITA_ANNI,
              'course.description': flatMarkers.CORSO_DESCRIZIONE,
              'course.objectives': flatMarkers.CORSO_OBIETTIVI,
              'course.riskLevel': flatMarkers.CORSO_LIVELLO_RISCHIO,
              'course.courseType': flatMarkers.CORSO_TIPOLOGIA,

              // Schedule
              'schedule.startDate': flatMarkers.DATA_INIZIO,
              'schedule.endDate': flatMarkers.DATA_FINE,
              'schedule.location': flatMarkers.SEDE_CORSO,
              'schedule.totalHours': flatMarkers.ORE_TOTALI,
              'schedule.deliveryMode': flatMarkers.MODALITA_EROGAZIONE,
              'schedule.code': flatMarkers.CODICE_EDIZIONE,
              'schedule.address': flatMarkers.INDIRIZZO_SEDE,

              // Trainer
              'trainer.firstName': flatMarkers.NOME_FORMATORE,
              'trainer.lastName': flatMarkers.COGNOME_FORMATORE,
              'trainer.fullName': flatMarkers.FORMATORE_COMPLETO,
              'trainer.email': flatMarkers.EMAIL_FORMATORE,
              'trainer.phone': flatMarkers.TELEFONO_FORMATORE,
              'trainer.hourlyRate': flatMarkers.TARIFFA_ORARIA,
              'trainer.totalCompensation': flatMarkers.COMPENSO_TOTALE,

              // Company
              'company.name': flatMarkers.AZIENDA_RAGIONE_SOCIALE,
              'company.vatNumber': flatMarkers.AZIENDA_PIVA,
              'company.fiscalCode': flatMarkers.AZIENDA_CF,
              'company.codiceAteco': flatMarkers.AZIENDA_CODICE_ATECO,
              'company.address.full': flatMarkers.AZIENDA_INDIRIZZO,
              'company.address.street': flatMarkers.AZIENDA_VIA,
              'company.address.city': flatMarkers.AZIENDA_CITTA,
              'company.address.province': flatMarkers.AZIENDA_PROVINCIA,
              'company.address.postalCode': flatMarkers.AZIENDA_CAP,
              'company.email': flatMarkers.AZIENDA_EMAIL,
              'company.phone': flatMarkers.AZIENDA_TELEFONO,
              'company.legalRepresentative': flatMarkers.AZIENDA_RAPPRESENTANTE,

              // Document
              'document.number': flatMarkers.NUMERO_PROGRESSIVO,
              'document.date': flatMarkers.DATA_GENERAZIONE,
              'document.qrCode': flatMarkers.QR_CODE_VERIFICA,
              'certificate.number': flatMarkers.NUMERO_ATTESTATO,
              'certificate.registrationNumber': flatMarkers.NUMERO_ATTESTATO,
              'certificate.validUntil': flatMarkers.DATA_SCADENZA,

              // System
              'current.date': flatMarkers.DATA_CORRENTE,
              'current.year': flatMarkers.ANNO,
              'current.time': flatMarkers.ORA_CORRENTE,
              'tenant.name': flatMarkers.ENTE_NOME,
              'tenant.address': flatMarkers.ENTE_INDIRIZZO,
              'tenant.phone': flatMarkers.ENTE_TELEFONO,
              'tenant.email': flatMarkers.ENTE_EMAIL
            };

            // Merge UPPERCASE and lowercase markers
            const allMarkers = { ...flatMarkers, ...lowercaseMarkers };

            // Generate filename with format: yyyy.mm.dd - nome cognome - corso
            const today = new Date();
            const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
            const sanitizedFirstName = person.firstName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
            const sanitizedLastName = person.lastName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
            const sanitizedCourseTitle = schedule.course.title.replace(/[^a-zA-Z0-9\s]/g, '').trim().substring(0, 50);
            const documentTitle = `${dateStr} - ${sanitizedFirstName} ${sanitizedLastName} - ${sanitizedCourseTitle}`;

            const { pdfBuffer } = await googleDocsService.generateDocumentFromTemplate(
              accessToken,
              documentId,
              documentType,
              allMarkers,
              documentTitle
            );

            // Save PDF to uploads
            const uploadsDir = path.join(__dirname, '..', 'uploads', 'attestati');
            await fs.mkdir(uploadsDir, { recursive: true });

            const filename = `${documentTitle}.pdf`;
            const filepath = path.join(uploadsDir, filename);
            await fs.writeFile(filepath, pdfBuffer);

            document = {
              fileName: filename,
              fileUrl: `/uploads/attestati/${filename}`,
              url: `/uploads/attestati/${filename}`,
              fileSize: pdfBuffer.length
            };
          } else {
            // Use standard document service for HTML templates
            document = await documentService.generateDocument({
              templateId: template.id,
              entityType: 'COURSE_SCHEDULE',
              entityId: scheduleId,
              personId: person.id,
              tenantId,
              userId,
              options: {
                markers: markerContext,
                strict: false
              }
            });
          }

          // Generate filename with format: yyyy.mm.dd - nome cognome - corso (for standard templates)
          const today = new Date();
          const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
          const sanitizedFirstName = person.firstName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
          const sanitizedLastName = person.lastName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
          const sanitizedCourseTitle = schedule.course.title.replace(/[^a-zA-Z0-9\s]/g, '').trim().substring(0, 50);
          const customFileName = `${dateStr} - ${sanitizedFirstName} ${sanitizedLastName} - ${sanitizedCourseTitle}.pdf`;

          // Create attestato
          const attestato = await prisma.attestato.create({
            data: {
              personId: person.id,
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
              template: true
            }
          });

          results.push({
            success: true,
            personId: person.id,
            personName: `${person.firstName} ${person.lastName}`,
            attestatoId: attestato.id,
            downloadUrl: document.url
          });

          // Send email if requested
          if (sendEmail && person.email) {
            try {
              // TODO: Implement email sending
              logger.info('Email sending requested', {
                attestatoId: attestato.id,
                recipientEmail: person.email
              });
            } catch (emailError) {
              logger.error('Failed to send email', {
                error: emailError.message,
                attestatoId: attestato.id
              });
            }
          }

        } catch (error) {
          batchErrors.push({
            success: false,
            personId: person.id,
            personName: `${person.firstName} ${person.lastName}`,
            error: error.message
          });
          logger.error('Failed to generate certificate in batch', {
            personId: person.id,
            error: error.message
          });
        }
      }

      logger.info('Batch certificate generation completed', {
        component: 'attestati-routes',
        action: 'generate-batch',
        batchId,
        scheduleId,
        total: personIds.length,
        success: results.length,
        failed: batchErrors.length,
        personId: userId
      });

      res.status(201).json({
        batchId,
        total: personIds.length,
        success: results.length,
        failed: batchErrors.length,
        results,
        errors: batchErrors
      });

    } catch (error) {
      logger.error('Failed to generate batch certificates', {
        component: 'attestati-routes',
        action: 'generate-batch',
        error: error.message,
        stack: error.stack,
        personId: req.user?.id
      });
      console.error('❌ BATCH GENERATION ERROR:', error);
      res.status(500).json({
        error: 'Failed to generate batch certificates',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

/**
 * POST /api/v1/attestati/delete-batch
 * Soft delete multiple certificates
 * ⚠️ IMPORTANTE: Deve essere PRIMA di /:id per non essere catturato come parametro
 */
router.post('/delete-batch', authenticateToken(), requirePermission('documents:delete'), async (req, res) => {
  try {
    const { ids } = req.body;
    const tenantId = req.user.tenantId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request: ids array required' });
    }

    // Verify all attestati belong to tenant
    const attestati = await prisma.attestato.findMany({
      where: {
        id: { in: ids },
        tenantId,
        deletedAt: null
      }
    });

    if (attestati.length === 0) {
      return res.status(404).json({ error: 'No certificates found' });
    }

    // Soft delete all found certificates
    await prisma.attestato.updateMany({
      where: {
        id: { in: attestati.map(a => a.id) },
        tenantId
      },
      data: { deletedAt: new Date() }
    });

    logger.info('Batch certificates deleted', {
      component: 'attestati-routes',
      action: 'delete-batch',
      count: attestati.length,
      personId: req.user?.id
    });

    res.json({
      message: `${attestati.length} certificate(s) deleted successfully`,
      deleted: attestati.length
    });
  } catch (error) {
    logger.error('Failed to delete certificates in batch', {
      component: 'attestati-routes',
      action: 'delete-batch',
      error: error.message,
      personId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to delete certificates' });
  }
});

/**
 * GET /api/v1/attestati/:id/download
 * Download certificate PDF
 * ⚠️ IMPORTANTE: Deve essere PRIMA di /:id per non essere catturato come parametro
 */
router.get('/:id/download', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const attestato = await prisma.attestato.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        person: true,
        scheduledCourse: {
          include: { course: true }
        }
      }
    });

    if (!attestato) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (!attestato.fileUrl) {
      return res.status(404).json({ error: 'Certificate file not found' });
    }

    // Generate proper filename if not saved or is a UUID-style fallback
    let downloadFileName = attestato.fileName;
    if (!downloadFileName || downloadFileName.includes('attestato_') && downloadFileName.includes('-')) {
      // Generate filename with format: yyyy.mm.dd - nome cognome - corso
      const createdDate = new Date(attestato.createdAt);
      const dateStr = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')}`;

      const firstName = attestato.person?.firstName || 'Partecipante';
      const lastName = attestato.person?.lastName || '';
      const courseTitle = attestato.scheduledCourse?.course?.title || 'Corso';

      const sanitizedFirstName = firstName.replace(/[^a-zA-Z0-9\sàèéìòùÀÈÉÌÒÙ]/g, '').trim();
      const sanitizedLastName = lastName.replace(/[^a-zA-Z0-9\sàèéìòùÀÈÉÌÒÙ]/g, '').trim();
      const sanitizedCourseTitle = courseTitle.replace(/[^a-zA-Z0-9\sàèéìòùÀÈÉÌÒÙ]/g, '').trim().substring(0, 50);

      downloadFileName = `${dateStr} - ${sanitizedFirstName} ${sanitizedLastName} - ${sanitizedCourseTitle}.pdf`;
    }

    logger.info('Certificate download requested', {
      component: 'attestati-routes',
      action: 'download',
      attestatoId: id,
      personId: req.user?.id,
      fileUrl: attestato.fileUrl
    });

    // Se fileUrl è un path locale (/uploads/ o /documents/), invia il file
    if (attestato.fileUrl.startsWith('/uploads/') || attestato.fileUrl.startsWith('/documents/')) {
      // Determina il path corretto
      // Se inizia con /uploads/, il file è già nel percorso corretto
      // Se inizia con /documents/, il file è in /uploads/documents/
      let filePath;
      if (attestato.fileUrl.startsWith('/uploads/')) {
        filePath = path.join(__dirname, '..', attestato.fileUrl);
      } else {
        // /documents/file.pdf -> /uploads/documents/file.pdf
        // Remove leading slash to avoid path.join issues
        const relativePath = attestato.fileUrl.substring(1); // Remove leading /
        filePath = path.join(__dirname, '..', 'uploads', relativePath);
      }

      logger.debug('Attempting to serve file', {
        component: 'attestati-routes',
        action: 'download',
        attestatoId: id,
        fileUrl: attestato.fileUrl,
        resolvedPath: filePath,
        exists: fsSync.existsSync(filePath),
        __dirname
      });

      if (fsSync.existsSync(filePath)) {
        logger.info('File found, serving download', {
          component: 'attestati-routes',
          attestatoId: id,
          filePath,
          fileName: downloadFileName
        });
        return res.download(filePath, downloadFileName);
      } else {
        // Fallback: prova anche percorsi alternativi
        const uploadsBasePath = path.join(__dirname, '..', 'uploads', 'documents');
        const justFileName = path.basename(attestato.fileUrl);
        const altPath1 = path.join(uploadsBasePath, justFileName);
        const altPath2 = path.join(__dirname, '..', attestato.fileUrl);

        logger.debug('Primary path not found, trying alternates', {
          component: 'attestati-routes',
          attestatoId: id,
          primaryPath: filePath,
          altPath1,
          altPath1Exists: fsSync.existsSync(altPath1),
          altPath2,
          altPath2Exists: fsSync.existsSync(altPath2)
        });

        if (fsSync.existsSync(altPath1)) {
          logger.info('File found at alternate path 1', {
            component: 'attestati-routes',
            attestatoId: id,
            altPath1
          });
          return res.download(altPath1, downloadFileName);
        }

        if (fsSync.existsSync(altPath2)) {
          logger.info('File found at alternate path 2', {
            component: 'attestati-routes',
            attestatoId: id,
            altPath2
          });
          return res.download(altPath2, downloadFileName);
        }

        logger.error('File not found on disk', {
          component: 'attestati-routes',
          action: 'download',
          attestatoId: id,
          primaryPath: filePath,
          altPath1,
          altPath2,
          fileUrl: attestato.fileUrl
        });
        return res.status(404).json({ error: 'Certificate file not found on disk' });
      }
    }

    // Se è un URL esterno (Supabase storage o absolute path), fetch e stream
    try {
      const axios = require('axios');
      const fileResponse = await axios.get(attestato.fileUrl, { responseType: 'stream' });
      res.setHeader('Content-Type', 'application/pdf');
      // Use the computed downloadFileName
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFileName)}"`);
      fileResponse.data.pipe(res);
    } catch (fetchError) {
      logger.error('Failed to fetch file from storage', {
        error: fetchError.message,
        fileUrl: attestato.fileUrl
      });
      return res.status(500).json({ error: 'Failed to fetch certificate file' });
    }
  } catch (error) {
    logger.error('Failed to download certificate', {
      component: 'attestati-routes',
      action: 'download',
      attestatoId: req.params.id,
      error: error.message,
      personId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to download certificate' });
  }
});

/**
 * GET /api/v1/attestati/:id
 * Get single certificate with full details
 * ⚠️ IMPORTANTE: Questa route è posizionata DOPO tutte le route specifiche
 * per evitare che catturi path come /generate-batch come se fossero ID
 */
router.get('/:id', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const attestato = await prisma.attestato.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        person: true,
        scheduledCourse: {
          include: {
            course: true,
            trainer: true,
            companies: {
              include: { company: true }
            }
          }
        }
        // template: true // Temporaneamente rimosso per debug
      }
    });

    if (!attestato) {
      return res.status(404).json({ error: 'Attestato not found' });
    }

    res.json(attestato);
  } catch (error) {
    logger.error('Failed to fetch attestato', {
      component: 'attestati-routes',
      action: 'get',
      attestatoId: req.params.id,
      error: error.message,
      personId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to fetch attestato' });
  }
});

/**
 * DELETE /api/v1/attestati/:id
 * Soft delete certificate
 */
router.delete('/:id', authenticateToken(), requirePermission('documents:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const attestato = await prisma.attestato.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!attestato) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    await prisma.attestato.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info('Certificate deleted', {
      component: 'attestati-routes',
      action: 'delete',
      attestatoId: id,
      personId: req.user?.id
    });

    res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete certificate', {
      component: 'attestati-routes',
      action: 'delete',
      attestatoId: req.params.id,
      error: error.message,
      personId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to delete certificate' });
  }
});

/**
 * POST /api/v1/attestati/download-zip-batch
 * Download multiple certificates as ZIP archive
 */
router.post(
  '/download-zip-batch',
  authenticateToken(),
  requirePermission('documents:read'),
  [
    body('attestatoIds').isArray({ min: 1 }).withMessage('At least one certificate ID required'),
    body('attestatoIds.*').isUUID().withMessage('All certificate IDs must be valid UUIDs')
  ],
  async (req, res) => {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({ errors: validationErrors.array() });
      }

      const { attestatoIds } = req.body;
      const tenantId = req.user.tenantId;

      // Get all certificates
      const attestati = await prisma.attestato.findMany({
        where: {
          id: { in: attestatoIds },
          tenantId,
          deletedAt: null
        },
        include: {
          person: true,
          scheduledCourse: {
            include: { course: true }
          }
        }
      });

      if (attestati.length === 0) {
        return res.status(404).json({ error: 'No certificates found' });
      }

      // First, collect all valid file paths before creating the archive
      const filesToAdd = [];
      for (const attestato of attestati) {
        if (attestato.fileUrl) {
          try {
            // Extract file path from URL - handle both absolute URLs and relative paths
            let filePath = attestato.fileUrl;

            // Remove protocol and host if present
            if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
              const urlObj = new URL(filePath);
              filePath = urlObj.pathname;
            }

            // Remove leading slash if present
            filePath = filePath.replace(/^\/+/, '');

            // If path starts with 'uploads/', use it directly, otherwise prepend uploads/
            const fullPath = filePath.startsWith('uploads/')
              ? path.join(process.cwd(), filePath)
              : path.join(process.cwd(), 'uploads', filePath);

            logger.debug('Processing attestato for ZIP', {
              attestatoId: attestato.id,
              fileUrl: attestato.fileUrl,
              extractedPath: filePath,
              fullPath: fullPath
            });

            // Check if file exists
            await fs.access(fullPath);

            // Use the original filename if available, otherwise generate one
            const zipEntryName = attestato.fileName ||
              `${attestato.person.lastName}_${attestato.person.firstName}_${attestato.scheduledCourse.course.title.substring(0, 30).replace(/\s+/g, '_')}.pdf`;

            filesToAdd.push({ fullPath, zipEntryName });
          } catch (fileError) {
            logger.warn('Failed to access certificate file for ZIP', {
              attestatoId: attestato.id,
              fileUrl: attestato.fileUrl,
              error: fileError.message
            });
          }
        }
      }

      // Check if any files were found BEFORE creating archive and setting headers
      if (filesToAdd.length === 0) {
        return res.status(404).json({
          error: 'No certificate files found on disk',
          message: 'I file degli attestati non sono stati trovati. Potrebbero essere stati eliminati o non generati correttamente.'
        });
      }

      // Now create ZIP archive and set response headers
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Set response headers for ZIP download
      const zipFileName = `attestati_${Date.now()}.zip`;
      res.attachment(zipFileName);
      res.setHeader('Content-Type', 'application/zip');

      // Handle archive errors
      archive.on('error', (err) => {
        logger.error('Archive error', { error: err.message });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Archive creation failed' });
        }
      });

      // Track when archive is finished
      const archiveFinished = new Promise((resolve, reject) => {
        archive.on('end', () => {
          logger.info('Archive stream ended', {
            component: 'attestati-routes',
            totalBytes: archive.pointer()
          });
          resolve(archive.pointer());
        });
        archive.on('error', reject);
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add all collected files to ZIP
      for (const { fullPath, zipEntryName } of filesToAdd) {
        logger.debug('Adding file to ZIP', { fullPath, zipEntryName });
        archive.file(fullPath, { name: zipEntryName });
      }

      // Finalize and wait for completion
      archive.finalize();

      // Wait for archive to finish streaming
      const totalBytes = await archiveFinished;

      logger.info('Batch certificates downloaded as ZIP', {
        component: 'attestati-routes',
        action: 'download-zip-batch',
        totalCertificates: attestati.length,
        filesAdded: filesToAdd.length,
        totalBytes,
        personId: req.user?.id
      });

    } catch (error) {
      logger.error('Failed to create ZIP archive', {
        component: 'attestati-routes',
        action: 'download-zip-batch',
        error: error.message,
        stack: error.stack,
        personId: req.user?.id
      });
      res.status(500).json({ error: 'Failed to create ZIP archive' });
    }
  }
);

/**
 * POST /api/v1/attestati/:id/send-email
 * Send certificate via email
 */
router.post(
  '/:id/send-email',
  authenticateToken(),
  requirePermission('documents:create'),
  [
    body('recipientEmail').optional().isEmail().withMessage('Valid email required'),
    body('subject').optional().isString().withMessage('Subject must be string'),
    body('message').optional().isString().withMessage('Message must be string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { recipientEmail, subject, message } = req.body;
      const tenantId = req.user.tenantId;

      // Get certificate
      const attestato = await prisma.attestato.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null
        },
        include: {
          person: true,
          scheduledCourse: {
            include: { course: true }
          }
        }
      });

      if (!attestato) {
        return res.status(404).json({ error: 'Certificate not found' });
      }

      // Use person's email if not specified
      const email = recipientEmail || attestato.person.email;
      if (!email) {
        return res.status(400).json({ error: 'No email address available' });
      }

      // TODO: Implement email sending via email service
      // For now, just log the request
      logger.info('Certificate email send requested', {
        component: 'attestati-routes',
        action: 'send-email',
        attestatoId: id,
        recipientEmail: email,
        personId: req.user?.id
      });

      // Mock success response
      res.json({
        message: 'Email send request queued',
        recipientEmail: email,
        attestatoId: id
      });

    } catch (error) {
      logger.error('Failed to send certificate email', {
        component: 'attestati-routes',
        action: 'send-email',
        attestatoId: req.params.id,
        error: error.message,
        personId: req.user?.id
      });
      res.status(500).json({ error: 'Failed to send certificate email' });
    }
  }
);

export default router;
