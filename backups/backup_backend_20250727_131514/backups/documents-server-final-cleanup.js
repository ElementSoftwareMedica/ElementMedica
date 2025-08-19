import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import prisma from './config/prisma-optimization.js';
import multer from 'multer';
import path from 'path';
import { google } from 'googleapis';
import fs from 'fs';
import { mkdirp } from 'mkdirp';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import libre from 'libreoffice-convert';
import { promisify } from 'util';
import { initializeAuth, shutdownAuth } from './auth/index.js';
import authRoutes from './auth/routes.js';
import middleware from './auth/middleware.js';
import googleApiService from './utils/googleApiService.js';
import googleDocsRoutes from './routes/google-docs-routes.js';

// Import logging and error handling
import { logger, httpLogger, logAudit } from './utils/logger.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import cacheService from './utils/cache.js';
import { 
  documentCacheMiddleware, 
  templateCacheMiddleware, 
  cacheInvalidationMiddleware,
  documentInvalidationPatterns,
  templateInvalidationPatterns 
} from './middleware/cache.js';
const { authenticate: authenticateToken, authorize: requirePermission, requireSameCompany: requireCompanyAccess } = middleware;

dotenv.config({ path: './.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prisma client importato dalla configurazione ottimizzata
const app = express();
const PORT = 4002;

// Initialize authentication system
try {
    await initializeAuth();
    logger.info('Authentication system initialized in Documents Server', { service: 'documents-server', port: PORT });
} catch (error) {
    logger.error('Failed to initialize authentication system', { service: 'documents-server', error: error.message, stack: error.stack });
    process.exit(1);
}

// Initialize Google API Service
try {
    await googleApiService.initialize();
    logger.info('Google API Service initialized in Documents Server', { service: 'documents-server' });
} catch (error) {
    logger.warn('Google API Service initialization failed, some features may be limited', { 
        service: 'documents-server', 
        error: error.message 
    });
}

// Initialize cache service (non-blocking)
if (process.env.REDIS_ENABLED !== 'false') {
    cacheService.connect().then(() => {
        logger.info('Cache service initialized in Documents Server', { service: 'documents-server' });
    }).catch((error) => {
        logger.warn('Cache service initialization failed, continuing without cache', { 
            service: 'documents-server', 
            error: error.message 
        });
    });
} else {
    logger.info('Redis disabled, Documents Server running without cache', { service: 'documents-server' });
}

// Configurazione CORS
app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'Authorization', 'cache-control', 'x-tenant-id', 'X-Tenant-ID']
}));

// HTTP request logging
app.use(httpLogger);

// Configurazione bodyParser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Mount authentication routes
app.use('/api', authRoutes);

// Mount Google API routes
app.use('/api/google-docs', googleDocsRoutes);

// Configurazione multer per upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    if (file.fieldname === 'template') {
      uploadPath = path.join(__dirname, 'uploads', 'templates');
    } else {
      uploadPath = path.join(__dirname, 'uploads', 'attestati');
    }
    mkdirp.sync(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Promisify libreoffice-convert
const convertAsync = promisify(libre.convert);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', server: 'Documents Server', port: PORT });
});

// Funzione per generare placeholders per i documenti
function generatePlaceholders(participant, course, sessions = []) {
  const placeholders = {
    '{{nome}}': participant.firstName || '',
    '{{cognome}}': participant.lastName || '',
    '{{codiceFiscale}}': participant.fiscalCode || '',
    '{{luogoNascita}}': participant.birthPlace || '',
    '{{dataNascita}}': participant.birthDate ? new Date(participant.birthDate).toLocaleDateString('it-IT') : '',
    '{{residenza}}': participant.residence || '',
    '{{corso}}': course.title || '',
    '{{dataCorso}}': course.startDate ? new Date(course.startDate).toLocaleDateString('it-IT') : '',
    '{{durata}}': course.duration || '',
    '{{ore}}': course.hours ? course.hours.toString() : '',
    '{{validita}}': course.validityYears ? `${course.validityYears} anni` : '',
    '{{sessioni}}': sessions.map((s, i) => `${new Date(s.date).toLocaleDateString('it-IT')} ${s.start}-${s.end}`).join('; '),
  };

  return placeholders;
}

// Endpoint per generare attestati - Protected with authentication
app.post('/generate-attestato', 
  authenticateToken(), 
  requirePermission('documents:create'), 
  cacheInvalidationMiddleware(documentInvalidationPatterns),
  upload.single('template'), 
  async (req, res) => {
  try {
    const { participantId, courseId } = req.body;
    
    if (!participantId || !courseId) {
      return res.status(400).json({ error: 'participantId and courseId are required' });
    }

    // Recupera i dati del partecipante e del corso
    const participant = await prisma.participant.findUnique({
      where: { id: parseInt(participantId) }
    });

    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
      include: { sessions: true }
    });

    if (!participant || !course) {
      return res.status(404).json({ error: 'Participant or course not found' });
    }

    // Usa il template caricato o quello di default
    let templatePath;
    if (req.file) {
      templatePath = req.file.path;
    } else {
      // Usa un template di default se disponibile
      templatePath = path.join(__dirname, 'uploads', 'templates', 'default-template.docx');
      if (!fs.existsSync(templatePath)) {
        return res.status(400).json({ error: 'No template provided and no default template found' });
      }
    }

    // Leggi il template
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Genera i placeholders
    const placeholders = generatePlaceholders(participant, course, course.sessions);

    // Sostituisci i placeholders
    doc.setData(placeholders);

    try {
      doc.render();
    } catch (error) {
      logger.error('Error rendering document', { service: 'documents-server', error: error.message, participantId: participant.id, courseId: course.id });
      return res.status(500).json({ error: 'Error rendering document template' });
    }

    // Genera il documento
    const buf = doc.getZip().generate({ type: 'nodebuffer' });

    // Salva il documento generato
    const outputDir = path.join(__dirname, 'uploads', 'attestati');
    mkdirp.sync(outputDir);
    
    const fileName = `attestato_${participant.lastName}_${participant.firstName}_${Date.now()}.docx`;
    const outputPath = path.join(outputDir, fileName);
    
    fs.writeFileSync(outputPath, buf);

    // Converti in PDF se richiesto
    if (req.body.convertToPdf === 'true') {
      try {
        const pdfBuffer = await convertAsync(buf, '.pdf', undefined);
        const pdfFileName = fileName.replace('.docx', '.pdf');
        const pdfPath = path.join(outputDir, pdfFileName);
        
        fs.writeFileSync(pdfPath, pdfBuffer);
        
        res.json({
          success: true,
          docxFile: fileName,
          pdfFile: pdfFileName,
          docxPath: outputPath,
          pdfPath: pdfPath
        });
      } catch (pdfError) {
        logger.error('Error converting to PDF', { service: 'documents-server', error: pdfError.message, fileName });
        // Restituisci comunque il file DOCX se la conversione PDF fallisce
        res.json({
          success: true,
          docxFile: fileName,
          docxPath: outputPath,
          pdfError: 'PDF conversion failed'
        });
      }
    } else {
      res.json({
        success: true,
        docxFile: fileName,
        docxPath: outputPath
      });
    }

  } catch (error) {
    logger.error('Error generating attestato', { service: 'documents-server', error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint per scaricare attestati generati - Protected with authentication and ownership validation
app.get('/download/:filename', 
  authenticateToken(), 
  requirePermission('documents:read'), 
  documentCacheMiddleware(1800), // Cache for 30 minutes
  async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', 'attestati', filename);
    const personId = req.person.id;
    const userCompanyId = req.person.companyId;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Validate document ownership by checking if the document belongs to user's company
    try {
      const attestato = await prisma.attestato.findFirst({
        where: {
          nomeFile: filename,
          deletedAt: null,
          partecipante: {
            companyId: userCompanyId
          }
        },
        include: {
          partecipante: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              companyId: true
            }
          },
          scheduledCourse: {
            select: {
              id: true,
              companyId: true
            }
          }
        }
      });
      
      if (!attestato) {
        logAudit('document_access_denied', personId, filename, {
          userCompanyId,
          reason: 'Document not found or access denied',
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(403).json({ error: 'Access denied: Document not found or you do not have permission to access this document' });
      }
      
      // Log successful document access
      logAudit('document_downloaded', personId, filename, {
        userCompanyId,
        documentId: attestato.id,
        participantId: attestato.partecipanteId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
    } catch (dbError) {
      logger.error('Database error during ownership validation', { 
        service: 'documents-server', 
        error: dbError.message, 
        filename, 
        personId 
      });
      return res.status(500).json({ error: 'Internal server error during validation' });
    }
    
    res.download(filePath, filename);
  } catch (error) {
    logger.error('Error downloading file', { service: 'documents-server', error: error.message, filename: req.params.filename });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint per caricare template - Protected with authentication and company validation
app.post('/upload-template', 
  authenticateToken(), 
  requirePermission('documents:create'), 
  cacheInvalidationMiddleware(templateInvalidationPatterns),
  upload.single('template'), 
  async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No template file provided' });
    }
    
    const filename = req.file.filename;
    const filePath = req.file.path;
    const personId = req.person.id;
    const userCompanyId = req.person.companyId;
    
    // Validate file type and size
    const allowedTypes = ['.pdf', '.doc', '.docx', '.html', '.htm'];
    const fileExtension = path.extname(filename).toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      logAudit('template_upload_rejected', personId, filename, {
        userCompanyId,
        reason: 'Invalid file type',
        fileExtension,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({ error: 'Invalid file type. Allowed types: PDF, DOC, DOCX, HTML' });
    }
    
    // Check file size (max 10MB)
    if (req.file.size > 10 * 1024 * 1024) {
      logAudit('template_upload_rejected', personId, filename, {
        userCompanyId,
        reason: 'File too large',
        fileSize: req.file.size,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({ error: 'File too large. Maximum size: 10MB' });
    }
    
    // Log successful template upload
    logAudit('template_uploaded', personId, filename, {
      userCompanyId,
      fileSize: req.file.size,
      fileType: fileExtension,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    logger.info('Template uploaded successfully', { service: 'documents-server', filename, personId, companyId: userCompanyId });
    
    res.json({
      success: true,
      filename: req.file.filename,
      path: req.file.path
    });
  } catch (error) {
    logger.error('Error uploading template', { service: 'documents-server', error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint per ottenere lista template - Protected with authentication and company filtering
app.get('/templates', 
  authenticateToken(), 
  requirePermission('documents:read'), 
  templateCacheMiddleware(3600), // Cache for 1 hour
  async (req, res) => {
  try {
    const personId = req.person.id;
    const userCompanyId = req.person.companyId;
    
    // Get templates from database that belong to user's company
    const companyTemplates = await prisma.templateLink.findMany({
      where: {
        deletedAt: null,
        OR: [
          { companyId: req.person?.companyId },
          { isDefault: true },
          { companyId: null } // Global templates
        ]
      },
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        fileFormat: true,
        isDefault: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Also get physical template files
    const templatesDir = path.join(__dirname, 'uploads', 'templates');
    let physicalTemplates = [];
    
    if (fs.existsSync(templatesDir)) {
      const files = fs.readdirSync(templatesDir);
      physicalTemplates = files.map(file => {
        const filePath = path.join(templatesDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          type: 'physical'
        };
      });
    }
    
    logAudit('templates_listed', personId, 'templates', {
      userCompanyId,
      templateCount: companyTemplates.length + physicalTemplates.length,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({ 
      templates: companyTemplates,
      physicalTemplates,
      total: companyTemplates.length + physicalTemplates.length
    });
  } catch (error) {
    logger.error('Error listing templates', { service: 'documents-server', error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint per ottenere lista attestati - Protected with authentication and company filtering
app.get('/attestati', 
  authenticateToken(), 
  requirePermission('documents:read'), 
  documentCacheMiddleware(1800), // Cache for 30 minutes
  async (req, res) => {
  try {
    const personId = req.person.id;
    const userCompanyId = req.person.companyId;
    
    // Get attestati from database that belong to user's company
    const companyAttestati = await prisma.attestato.findMany({
      where: {
        deletedAt: null,
        partecipante: {
          companyId: userCompanyId
        }
      },
      include: {
        partecipante: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        },
        scheduledCourse: {
          select: {
            id: true,
            course: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: {
        dataGenerazione: 'desc'
      }
    });
    
    // Also check physical files and match with database records
    const attestatiDir = path.join(__dirname, 'uploads', 'attestati');
    let physicalFiles = [];
    
    if (fs.existsSync(attestatiDir)) {
      const files = fs.readdirSync(attestatiDir);
      physicalFiles = files.filter(file => {
        // Check if this file belongs to user's company by matching with database
        return companyAttestati.some(attestato => attestato.nomeFile === file);
      }).map(file => {
        const filePath = path.join(attestatiDir, file);
        const stats = fs.statSync(filePath);
        const dbRecord = companyAttestati.find(attestato => attestato.nomeFile === file);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          participant: dbRecord?.partecipante,
          course: dbRecord?.scheduledCourse?.course
        };
      });
    }
    
    logAudit('attestati_listed', personId, 'attestati', {
      userCompanyId,
      attestatiCount: companyAttestati.length,
      physicalFilesCount: physicalFiles.length,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({ 
      attestati: companyAttestati,
      physicalFiles,
      total: companyAttestati.length
    });
  } catch (error) {
    logger.error('Error listing attestati', { service: 'documents-server', error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'documents-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Avvia il server
const server = app.listen(PORT, '127.0.0.1', () => {
  logger.info('Documents Server started successfully', { service: 'documents-server', port: PORT, host: '127.0.0.1', timestamp: new Date().toISOString() });
});

server.on('error', (error) => {
  logger.error('Server failed to start', { service: 'documents-server', error: error.message, code: error.code, port: PORT });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully', { service: 'documents-server' });
  server.close(async () => {
    try {
      await shutdownAuth();
      await googleApiService.shutdown();
      await cacheService.disconnect();
      await prisma.$disconnect();
      logger.info('Documents Server shutdown complete', { service: 'documents-server' });
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { service: 'documents-server', error: error.message, stack: error.stack });
      process.exit(1);
    }
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully', { service: 'documents-server' });
  server.close(async () => {
    try {
      await shutdownAuth();
      await googleApiService.shutdown();
      await cacheService.disconnect();
      await prisma.$disconnect();
      logger.info('Documents Server shutdown complete', { service: 'documents-server' });
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { service: 'documents-server', error: error.message, stack: error.stack });
      process.exit(1);
    }
  });
});

export default app;