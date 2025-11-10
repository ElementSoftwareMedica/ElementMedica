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

/**
 * GET /api/v1/attestati
 * Get all certificates with optional filters
 */
router.get('/', authenticateToken(), requirePermission('read:documents'), async (req, res) => {
  try {
    const { scheduleId, personId, year } = req.query;
    const tenantId = req.user.tenantId;

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
  requirePermission('create:documents'),
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
      const schedule = await prisma.scheduledCourse.findFirst({
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
          birthPlace: person.birthPlace || ''
        },
        company: companyData,
        course: {
          title: schedule.course.title,
          code: schedule.course.code || '',
          duration: schedule.course.duration || 0,
          category: schedule.course.category || '',
          regulation: schedule.course.regulation || '',
          validityYears: schedule.course.validityYears || 0,
          description: schedule.course.description || ''
        },
        schedule: {
          startDate: formatDate(schedule.startDate),
          endDate: formatDate(schedule.endDate),
          location: schedule.location || '',
          totalHours: schedule.course.duration || 0,
          modality: schedule.deliveryMode || '',
          notes: schedule.notes || ''
        },
        trainer: trainerData,
        document: {
          number: `${numeroProgressivo}/${currentYear}`,
          date: formatDate(new Date())
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

      // Create attestato record
      const attestato = await prisma.attestato.create({
        data: {
          personId,
          scheduledCourseId: scheduleId,
          fileName: document.fileName,
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
      res.status(500).json({ error: 'Failed to generate certificate' });
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
  requirePermission('create:documents'),
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
              qualifications: schedule.trainer.qualifications || ''
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
              birthPlace: person.birthPlace || ''
            },
            company: companyData,
            course: {
              title: schedule.course.title,
              code: schedule.course.code || '',
              duration: schedule.course.duration || 0,
              category: schedule.course.category || '',
              regulation: schedule.course.regulation || '',
              validityYears: schedule.course.validityYears || 0
            },
            schedule: {
              startDate: formatDate(schedule.startDate),
              endDate: formatDate(schedule.endDate),
              location: schedule.location || '',
              totalHours: schedule.course.duration || 0,
              modality: schedule.deliveryMode || ''
            },
            trainer: trainerData,
            document: {
              number: `${numeroProgressivo}/${currentYear}`,
              date: formatDate(new Date())
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
              
              // Course
              CORSO_TITOLO: schedule.course.title,
              CORSO_CODICE: schedule.course.code || '',
              CORSO_DURATA: String(schedule.course.duration || 0),
              CORSO_CATEGORIA: schedule.course.category || '',
              
              // Schedule
              DATA_INIZIO: formatDate(schedule.startDate),
              DATA_FINE: formatDate(schedule.endDate),
              SEDE_CORSO: schedule.location || '',
              ORE_TOTALI: String(schedule.course.duration || 0),
              
              // Trainer
              NOME_FORMATORE: trainerData.firstName || '',
              COGNOME_FORMATORE: trainerData.lastName || '',
              FORMATORE_COMPLETO: trainerData.fullName || '',
              
              // Company
              AZIENDA_RAGIONE_SOCIALE: companyData.name || '',
              AZIENDA_PIVA: companyData.vatNumber || '',
              AZIENDA_CF: companyData.fiscalCode || '',
              AZIENDA_INDIRIZZO: companyData.address?.full || '',
              
              // Document
              NUMERO_PROGRESSIVO: `${numeroProgressivo}/${currentYear}`,
              DATA_GENERAZIONE: formatDate(new Date()),
              ANNO: String(currentYear),
              NUMERO_ATTESTATO: `ATT/${currentYear}/${String(numeroProgressivo).padStart(6, '0')}`
            };
            
            const documentTitle = `Attestato_${person.lastName}_${person.firstName}_${numeroProgressivo}_${currentYear}`;
            
            const { pdfBuffer } = await googleDocsService.generateDocumentFromTemplate(
              accessToken,
              documentId,
              documentType,
              flatMarkers,
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

          // Create attestato
          const attestato = await prisma.attestato.create({
            data: {
              personId: person.id,
              scheduledCourseId: scheduleId,
              fileName: document.fileName,
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
router.post('/delete-batch', authenticateToken(), requirePermission('delete:documents'), async (req, res) => {
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
 * GET /api/v1/attestati/:id
 * Get single certificate with full details
 * ⚠️ IMPORTANTE: Questa route è posizionata DOPO tutte le route specifiche
 * per evitare che catturi path come /generate-batch come se fossero ID
 */
router.get('/:id', authenticateToken(), requirePermission('read:documents'), async (req, res) => {
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
router.delete('/:id', authenticateToken(), requirePermission('delete:documents'), async (req, res) => {
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
 * GET /api/v1/attestati/:id/download
 * Download certificate PDF
 */
router.get('/:id/download', authenticateToken(), requirePermission('read:documents'), async (req, res) => {
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

    if (!attestato.fileUrl) {
      return res.status(404).json({ error: 'Certificate file not found' });
    }

    logger.info('Certificate downloaded', {
      component: 'attestati-routes',
      action: 'download',
      attestatoId: id,
      personId: req.user?.id
    });

    // Se fileUrl è un path locale, invia il file
    if (attestato.fileUrl.startsWith('/uploads/')) {
      // Path relativo alla cartella backend
      const filePath = path.join(__dirname, '..', attestato.fileUrl);
      
      logger.debug('Attempting to serve file', {
        component: 'attestati-routes',
        action: 'download',
        attestatoId: id,
        fileUrl: attestato.fileUrl,
        resolvedPath: filePath,
        exists: fsSync.existsSync(filePath)
      });
      
      if (fsSync.existsSync(filePath)) {
        return res.download(filePath, attestato.fileName);
      } else {
        logger.error('File not found on disk', {
          component: 'attestati-routes',
          action: 'download',
          attestatoId: id,
          filePath,
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
      res.setHeader('Content-Disposition', `attachment; filename="attestato_${id}.pdf"`);
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
 * POST /api/v1/attestati/download-zip-batch
 * Download multiple certificates as ZIP archive
 */
router.post(
  '/download-zip-batch',
  authenticateToken(),
  requirePermission('read:documents'),
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

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Set response headers for ZIP download
      const zipFileName = `attestati_${Date.now()}.zip`;
      res.attachment(zipFileName);
      res.setHeader('Content-Type', 'application/zip');

      // Pipe archive to response
      archive.pipe(res);

      // Add each certificate to ZIP
      for (const attestato of attestati) {
        if (attestato.fileUrl) {
          try {
            // Extract file path from URL (assuming local storage)
            const filePath = attestato.fileUrl.replace(/^https?:\/\/[^/]+/, '');
            const fullPath = path.join(process.cwd(), 'uploads', filePath);

            // Check if file exists
            await fs.access(fullPath);

            // Generate unique filename for ZIP entry
            const personName = `${attestato.person.lastName}_${attestato.person.firstName}`.replace(/\s+/g, '_');
            const courseName = attestato.scheduledCourse.course.title.substring(0, 30).replace(/\s+/g, '_');
            const zipEntryName = `${personName}_${courseName}_${attestato.numeroProgressivo}_${attestato.annoProgressivo}.pdf`;

            // Add file to archive
            archive.file(fullPath, { name: zipEntryName });
          } catch (fileError) {
            logger.warn('Failed to add certificate to ZIP', {
              attestatoId: attestato.id,
              error: fileError.message
            });
            // Continue with other files
          }
        }
      }

      // Finalize archive
      await archive.finalize();

      logger.info('Batch certificates downloaded as ZIP', {
        component: 'attestati-routes',
        action: 'download-zip-batch',
        count: attestati.length,
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
  requirePermission('create:documents'),
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
