/**
 * CMS Routes
 * Endpoints per la gestione dei contenuti del frontend pubblico
 * Richiede autenticazione e permessi specifici CMS
 */

import express from 'express';
import prisma from '../config/prisma-optimization.js';
import { body, param, query, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const { authenticate } = authMiddleware;
const router = express.Router();

// Configurazione multer per upload immagini
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'cms');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `cms-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo immagini sono permesse (jpeg, jpg, png, gif, webp)'));
    }
  }
});

/**
 * GET /api/cms/courses - Ottieni tutti i corsi per gestione CMS
 */
router.get('/courses', authenticate, requirePermissions('VIEW_CMS'), [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('search').optional().isString().trim(),
  query('category').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Parametri non validi',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      search,
      category
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const tenantId = req.user.tenantId;

    // Costruisci il filtro WHERE
    const where = {
      tenantId,
      deletedAt: null
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        select: {
          id: true,
          title: true,
          category: true,
          subcategory: true,
          shortDescription: true,
          image1Url: true,
          riskLevel: true,
          courseType: true,
          isPublic: true,
          slug: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [
          { updatedAt: 'desc' }
        ],
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.course.count({ where })
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    logger.error('Errore nel recupero dei corsi CMS', {
      component: 'cms-routes',
      action: 'getCMSCourses',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId
    });

    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: 'Impossibile recuperare i corsi'
    });
  }
});

/**
 * GET /api/cms/courses/:id - Ottieni dettaglio corso per modifica CMS
 */
router.get('/courses/:id', authenticate, requirePermissions('VIEW_CMS'), [
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Parametri non validi',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const course = await prisma.course.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        category: true,
        subcategory: true,
        shortDescription: true,
        fullDescription: true,
        image1Url: true,
        image2Url: true,
        riskLevel: true,
        courseType: true,
        isPublic: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Corso non trovato'
      });
    }

    res.json({
      success: true,
      data: course
    });

  } catch (error) {
    logger.error('Errore nel recupero del corso CMS', {
      component: 'cms-routes',
      action: 'getCMSCourse',
      error: error.message,
      stack: error.stack,
      courseId: req.params.id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: 'Impossibile recuperare il corso'
    });
  }
});

/**
 * PUT /api/cms/courses/:id/content - Aggiorna contenuti pubblici del corso
 */
router.put('/courses/:id/content', authenticate, requirePermissions('CMS_EDIT_COURSES'), [
  param('id').isUUID(),
  body('shortDescription').optional().isString().trim().isLength({ max: 500 }),
  body('fullDescription').optional().isString().trim().isLength({ max: 5000 }),
  body('image1Url').optional().isURL(),
  body('image2Url').optional().isURL(),
  body('seoTitle').optional().isString().trim().isLength({ max: 100 }),
  body('seoDescription').optional().isString().trim().isLength({ max: 200 }),
  body('slug').optional().isString().trim().matches(/^[a-z0-9-]+$/),
  body('isPublic').optional().isBoolean(),
  body('riskLevel').optional().isIn(['ALTO', 'MEDIO', 'BASSO', 'A', 'B', 'C']),
  body('courseType').optional().isIn(['PRIMO_CORSO', 'AGGIORNAMENTO']),
  body('subcategory').optional().isString().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Verifica esistenza e proprietà del corso
    const existingCourse = await prisma.course.findFirst({
      where: {
        id: id,
        deletedAt: null,
        tenantId: req.user.tenantId
      }
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        error: 'Corso non trovato'
      });
    }

    // Verifica unicità dello slug se fornito
    if (updateData.slug && updateData.slug !== existingCourse.slug) {
      const slugExists = await prisma.course.findFirst({
        where: {
          slug: updateData.slug,
          deletedAt: null,
          id: { not: id }
        }
      });

      if (slugExists) {
        return res.status(409).json({
          success: false,
          error: 'Slug già in uso',
          message: 'Lo slug specificato è già utilizzato da un altro corso'
        });
      }
    }

    // Aggiorna il corso
    const updatedCourse = await prisma.course.update({
      where: { id: id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    // Log audit
    await auditLog(req.user.id, 'UPDATE', 'Course', id, {
      action: 'update_content',
      changes: updateData
    });

    res.json({
      success: true,
      data: updatedCourse,
      message: 'Contenuti del corso aggiornati con successo'
    });

  } catch (error) {
    logger.error('Errore nell\'aggiornamento contenuti corso', {
      component: 'cms-routes',
      action: 'updateCourseContent',
      error: error.message,
      stack: error.stack,
      courseId: req.params.id,
      userId: req.user?.id
    });

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Conflitto',
        message: 'Slug già esistente'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: 'Impossibile aggiornare i contenuti del corso'
    });
  }
});

/**
 * POST /api/cms/upload/image - Upload immagine per CMS
 */
router.post('/upload/image', authenticate, requirePermissions('CMS_MANAGE_MEDIA'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nessuna immagine fornita'
      });
    }

    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const file = req.file;

    // Salva le informazioni del file nel database
    const mediaRecord = await prisma.cMSMedia.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/cms/${file.filename}`,
        altText: req.body.altText || '',
        tenantId,
        uploadedBy: userId
      }
    });

    // Log audit
    await auditLog(req.user.id, 'CREATE', 'CMSMedia', mediaRecord.id, {
      action: 'upload_image',
      filename: req.file.filename,
      size: req.file.size
    });

    res.json({
      success: true,
      data: {
        id: mediaRecord.id,
        url: mediaRecord.url,
        filename: mediaRecord.filename,
        originalName: mediaRecord.originalName,
        altText: mediaRecord.altText,
        size: mediaRecord.size,
        mimeType: mediaRecord.mimeType,
        createdAt: mediaRecord.createdAt
      },
      message: 'Immagine caricata con successo'
    });

  } catch (error) {
    logger.error('Errore nell\'upload dell\'immagine', {
      component: 'cms-routes',
      action: 'uploadImage',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: 'Impossibile caricare l\'immagine'
    });
  }
});

/**
 * GET /api/cms/media - Ottieni lista media caricati
 */
router.get('/media', authenticate, requirePermissions('VIEW_CMS'), [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Parametri non validi',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const tenantId = req.user.tenantId;

    const [media, total] = await Promise.all([
      prisma.cMSMedia.findMany({
        where: {
          tenantId,
          deletedAt: null
        },
        select: {
          id: true,
          filename: true,
          originalName: true,
          url: true,
          altText: true,
          size: true,
          mimeType: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.cMSMedia.count({
        where: {
          tenantId,
          deletedAt: null
        }
      })
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: media,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    logger.error('Errore nel recupero dei media', {
      component: 'cms-routes',
      action: 'getMedia',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: 'Impossibile recuperare i media'
    });
  }
});

/**
 * DELETE /api/cms/media/:id - Elimina media
 */
router.delete('/media/:id', authenticate, requirePermissions('CMS_MANAGE_MEDIA'), [
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Parametri non validi',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Trova il record media
    const mediaRecord = await prisma.cMSMedia.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!mediaRecord) {
      return res.status(404).json({
        success: false,
        error: 'Media non trovato'
      });
    }

    // Soft delete del record
    await prisma.cMSMedia.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId
      }
    });

    // Elimina il file fisico
    const filePath = path.join(process.cwd(), 'uploads', 'cms', mediaRecord.filename);
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      logger.warn('Impossibile eliminare il file fisico', {
        component: 'cms-routes',
        action: 'deleteMedia',
        filename: mediaRecord.filename,
        error: fileError.message
      });
    }

    // Log audit
    await auditLog(req.user.id, 'DELETE', 'CMSMedia', id, {
      action: 'delete_media',
      filename: mediaRecord.filename
    });

    res.json({
      success: true,
      message: 'Media eliminato con successo'
    });

  } catch (error) {
    logger.error('Errore nell\'eliminazione del media', {
      component: 'cms-routes',
      action: 'deleteMedia',
      error: error.message,
      stack: error.stack,
      mediaId: req.params.id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: 'Impossibile eliminare il media'
    });
  }
});

/**
 * GET /api/cms/public-content - Ottieni contenuto pubblico del sito
 */
router.get('/public-content', authenticate, requirePermissions('VIEW_CMS'), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Cerca la pagina CMS per il contenuto pubblico
    const publicContentPage = await prisma.cMSPage.findFirst({
      where: {
        slug: 'public-content',
        tenantId,
        deletedAt: null
      }
    });

    if (!publicContentPage) {
      // Se non esiste, restituisci contenuto di default
      const defaultContent = {
        homepage: {
          heroTitle: 'Element Formazione',
          heroSubtitle: 'La tua sicurezza è la nostra priorità',
          heroDescription: 'Offriamo corsi di formazione professionale sulla sicurezza sul lavoro, consulenza specializzata e servizi completi per la gestione della sicurezza aziendale.',
          servicesTitle: 'I Nostri Servizi',
          servicesDescription: 'Soluzioni complete per la sicurezza sul lavoro',
          aboutTitle: 'Chi Siamo',
          aboutDescription: 'Element Formazione è un\'azienda specializzata nella formazione sulla sicurezza sul lavoro e nella consulenza per la gestione dei rischi aziendali.',
        },
        services: {
          heroTitle: 'I Nostri Servizi',
          heroSubtitle: 'Soluzioni complete per la sicurezza sul lavoro',
          description: 'Offriamo una gamma completa di servizi per garantire la sicurezza e la conformità normativa della tua azienda.',
          whyChooseTitle: 'Perché Scegliere Element Formazione',
          whyChooseDescription: 'La nostra esperienza e professionalità al servizio della tua sicurezza.',
        },
        contacts: {
          heroTitle: 'Contattaci',
          heroSubtitle: 'Siamo qui per aiutarti',
          address: 'Via Roma 123, 20100 Milano (MI)',
          phone: '+39 02 1234 5678',
          email: 'info@elementformazione.it',
          openingHours: 'Lun-Ven: 9:00-18:00',
        },
        careers: {
          heroTitle: 'Lavora con Noi',
          heroSubtitle: 'Unisciti al nostro team',
          whyWorkTitle: 'Perché Lavorare con Noi',
          whyWorkDescription: 'Offriamo un ambiente di lavoro stimolante e opportunità di crescita professionale.',
        },
        company: {
          name: 'Element Formazione',
          description: 'Azienda leader nella formazione sulla sicurezza sul lavoro',
          socialMedia: {
            facebook: '',
            linkedin: '',
            instagram: '',
            twitter: '',
          },
        },
      };

      return res.json({
        success: true,
        data: defaultContent
      });
    }

    res.json({
      success: true,
      data: publicContentPage.content
    });

  } catch (error) {
    logger.error('Errore nel recupero del contenuto pubblico', {
      component: 'cms-routes',
      action: 'getPublicContent',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId
    });

    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: 'Impossibile recuperare il contenuto pubblico'
    });
  }
});

/**
 * PUT /api/cms/public-content - Aggiorna contenuto pubblico del sito
 */
router.put('/public-content', authenticate, requirePermissions('EDIT_CMS'), [
  body('homepage').isObject(),
  body('services').isObject(),
  body('contacts').isObject(),
  body('careers').isObject(),
  body('company').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const contentData = req.body;

    // Cerca la pagina esistente o creane una nuova
    const existingPage = await prisma.cMSPage.findFirst({
      where: {
        slug: 'public-content',
        tenantId,
        deletedAt: null
      }
    });

    let updatedPage;

    if (existingPage) {
      // Aggiorna la pagina esistente
      updatedPage = await prisma.cMSPage.update({
        where: { id: existingPage.id },
        data: {
          content: contentData,
          updatedAt: new Date()
        }
      });
    } else {
      // Crea una nuova pagina
      updatedPage = await prisma.cMSPage.create({
        data: {
          slug: 'public-content',
          title: 'Contenuto Pubblico Sito',
          content: contentData,
          isPublished: true,
          tenantId
        }
      });
    }

    // Log audit
    await auditLog(userId, existingPage ? 'UPDATE' : 'CREATE', 'CMSPage', updatedPage.id, {
      action: 'update_public_content',
      slug: 'public-content'
    });

    res.json({
      success: true,
      data: updatedPage.content,
      message: 'Contenuto pubblico aggiornato con successo'
    });

  } catch (error) {
    logger.error('Errore nell\'aggiornamento del contenuto pubblico', {
      component: 'cms-routes',
      action: 'updatePublicContent',
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId
    });

    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: 'Impossibile aggiornare il contenuto pubblico'
    });
  }
});

export default router;