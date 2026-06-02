/**
 * Enhanced Template Management Routes
 * Features: CRUD operations with versioning, Google integration, markers
 * 
 * Part of Settings/Templates Redesign Project
 * Created: 2025-11-05
 */

import express from 'express';
import prisma from '../config/prisma-optimization.js';
import middleware from '../middleware/auth.js';
import { parseGoogleUrl, getGoogleFieldForUrl } from '../utils/google-url-parser.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();

// Middleware destructuring
const { authenticate: authenticateToken, requirePermission } = middleware;

// Helper to get authenticated user info
const getAuthUser = (req) => ({
  userId: req.person.id,
  tenantId: getEffectiveTenantId(req)
});

/**
 * GET /api/templates
 * List all templates with filters
 * Query params: type, category, isActive, search, page, limit
 */
/**
 * GET /api/v1/templates
 * List all templates with filtering and pagination
 */
router.get('/', authenticateToken, requirePermission('templates:read'), async (req, res) => {
  try {
    const { tenantId, userId } = getAuthUser(req);
    const {
      type,
      category,
      isActive,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const where = {
      tenantId,
      deletedAt: null,
      ...(type && { type }),
      ...(category && { category }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } }
        ]
      })
    };

    // Count total for pagination
    const total = await prisma.templateLink.count({ where });

    // Fetch templates with relations
    const templates = await prisma.templateLink.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        versions: {
          select: {
            id: true,
            version: true,
            changesSummary: true,
            createdAt: true
          },
          orderBy: { version: 'desc' },
          take: 1 // Only latest version
        },
        _count: {
          select: {
            versions: true,
            generatedDocs: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Error listing templates');
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dei template',
    });
  }
});

/**
 * POST /api/v1/templates/seed-defaults
 * Genera i template predefiniti per il tenant corrente
 */
router.post('/seed-defaults', authenticateToken, requirePermission('templates:create'), async (req, res) => {
  try {
    const { tenantId } = getAuthUser(req);
    const { DefaultTemplateService } = await import('../services/templates/DefaultTemplateService.js');
    const results = await DefaultTemplateService.createDefaultTemplates(tenantId);

    res.json({
      success: true,
      data: {
        created: results.created,
        skipped: results.skipped
      }
    });
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Errore generazione template predefiniti');
    res.status(500).json({
      success: false,
      error: 'Errore nella generazione dei template predefiniti'
    });
  }
});

/**
 * POST /api/v1/templates/force-update-attendance-register
 * Aggiorna il template ATTENDANCE_REGISTER DEFAULT a tutti i tenant (admin only).
 * Sovrascrive con il nuovo contenuto del Registro Presenze Default.
 */
router.post('/force-update-attendance-register', authenticateToken, requirePermission('templates:create'), async (req, res) => {
  try {
    const { default: DefaultTemplateService } = await import('../services/templates/DefaultTemplateService.js');
    const results = await DefaultTemplateService.forceUpdateAttendanceRegisterDefault();

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Errore force-update attendance register');
    res.status(500).json({
      success: false,
      error: 'Errore nell\'aggiornamento del registro presenze'
    });
  }
});

/**
 * GET /api/v1/templates/default/:type
 * Get default template for a specific type
 */
router.get('/default/:type', authenticateToken, requirePermission('templates:read'), async (req, res) => {
  try {
    const { tenantId } = getAuthUser(req);
    const { type } = req.params;

    const template = await prisma.templateLink.findFirst({
      where: {
        type,
        tenantId,
        isDefault: true,
        deletedAt: null
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Nessun template predefinito trovato per il tipo ${type}`
      });
    }

    res.json(template);
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Error getting default template');
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero del template predefinito',
    });
  }
});

/**
 * GET /api/v1/templates/:id
 * Get a single template by ID
 * IMPORTANT: This route MUST come AFTER /default/:type to avoid route conflicts
 */
router.get('/:id', authenticateToken, requirePermission('templates:read'), async (req, res) => {
  try {
    const { tenantId } = getAuthUser(req);
    const { id } = req.params;
    const { includeVersions = 'true' } = req.query;

    const template = await prisma.templateLink.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        ...(includeVersions === 'true' && {
          versions: {
            include: {
              creator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: { version: 'desc' }
          }
        }),
        _count: {
          select: {
            generatedDocs: true,
            lettereIncarico: true,
            registriPresenze: true,
            attestati: true
          }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template non trovato'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Error fetching template');
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero del template',
    });
  }
});

/**
 * POST /api/templates
 * Create new template (auto-creates version 1)
 */
/**
 * POST /api/v1/templates
 * Create a new template
 */
router.post('/', authenticateToken, requirePermission('templates:create'), async (req, res) => {
  try {
    const { tenantId, userId } = getAuthUser(req);
    const {
      name,
      type,
      content,
      header,
      footer,
      fileFormat = 'HTML',
      logoImage,
      logoPosition,
      markers,
      markerSchema,
      styles,
      layout,
      description,
      category,
      tags = [],
      companyId,
      isDefault = false,
      googleDocsUrl
    } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Campi obbligatori mancanti: name, type'
      });
    }

    // Validate fileFormat if provided
    const validFormats = ['HTML', 'DOCX', 'GOOGLE_DOCS', 'GOOGLE_SLIDES'];
    if (fileFormat && !validFormats.includes(fileFormat)) {
      return res.status(400).json({
        success: false,
        error: `Formato file non valido. Deve essere uno tra: ${validFormats.join(', ')}`
      });
    }

    // Extract Google Docs/Slides ID from URL if provided
    let googleDocsId = null;
    let googleSlidesId = null;

    if (googleDocsUrl) {
      const parsed = parseGoogleUrl(googleDocsUrl);

      if (parsed) {
        // Auto-assign to correct field based on URL type
        if (parsed.type === 'docs') {
          googleDocsId = parsed.id;
        } else if (parsed.type === 'slides') {
          googleSlidesId = parsed.id;
        }

        // Log successful parsing
        logger.info('Parsed Google URL', {
          component: 'template-routes',
          action: 'create',
          type: parsed.type,
          documentId: parsed.id
        });
      } else {
        // Invalid URL format
        return res.status(400).json({
          success: false,
          error: 'Formato URL Google Docs/Slides non valido. Formato atteso: https://docs.google.com/document/d/{id} o https://docs.google.com/presentation/d/{id}'
        });
      }
    }

    // If setting as default, unset other defaults for the same type
    if (isDefault) {
      await prisma.templateLink.updateMany({
        where: {
          type,
          tenantId,
          isDefault: true,
          deletedAt: null
        },
        data: {
          isDefault: false
        }
      });

      logger.info('Unset previous default templates', {
        component: 'template-routes',
        action: 'create',
        type,
        tenantId
      });
    }

    // Create template with first version
    const template = await prisma.templateLink.create({
      data: {
        name,
        type,
        content,
        header,
        footer,
        fileFormat,
        logoImage,
        logoPosition,
        markers,
        markerSchema,
        styles,
        layout,
        description,
        category,
        tags,
        isDefault,
        version: 1,
        isActive: true,
        tenantId,
        companyTenantProfileId: companyId || null,
        createdBy: userId,
        url: '', // Will be generated after file creation if needed
        googleDocsUrl: googleDocsUrl || null,
        googleDocsId: googleDocsId,
        googleSlidesId: googleSlidesId,
        // Create first version automatically
        versions: {
          create: {
            version: 1,
            content,
            header,
            footer,
            styles,
            layout,
            markers,
            changesSummary: 'Initial version',
            changeDetails: { action: 'CREATE', timestamp: new Date().toISOString() },
            tenantId,
            createdBy: userId
          }
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        versions: true
      }
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template creato con successo'
    });
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Error creating template');
    res.status(500).json({
      success: false,
      error: 'Errore nella creazione del template',
    });
  }
});

/**
 * PUT /api/templates/:id
 * Update template (auto-increments version)
 */
/**
 * PUT /api/v1/templates/:id
 * Update an existing template
 */
router.put('/:id', authenticateToken, requirePermission('templates:update'), async (req, res) => {
  try {
    const { tenantId, userId } = getAuthUser(req);
    const { id } = req.params;
    const {
      name,
      type,
      content,
      header,
      footer,
      fileFormat,
      logoImage,
      logoPosition,
      markers,
      markerSchema,
      styles,
      layout,
      description,
      category,
      tags,
      isActive,
      isDefault,
      syncEnabled,
      autoSync,
      changesSummary,
      googleDocsUrl
    } = req.body;

    // Check if template exists and belongs to tenant
    const existing = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template non trovato'
      });
    }

    // Validate fileFormat if provided
    const validFormats = ['HTML', 'DOCX', 'GOOGLE_DOCS', 'GOOGLE_SLIDES'];
    if (fileFormat !== undefined && !validFormats.includes(fileFormat)) {
      return res.status(400).json({
        success: false,
        error: `Formato file non valido. Deve essere uno tra: ${validFormats.join(', ')}`
      });
    }

    // Extract Google Docs/Slides ID from URL if provided
    let googleDocsId = existing.googleDocsId;
    let googleSlidesId = existing.googleSlidesId;

    if (googleDocsUrl !== undefined) {
      // Reset IDs
      googleDocsId = null;
      googleSlidesId = null;

      if (googleDocsUrl) {
        const parsed = parseGoogleUrl(googleDocsUrl);

        if (parsed) {
          // Auto-assign to correct field based on URL type
          if (parsed.type === 'docs') {
            googleDocsId = parsed.id;
          } else if (parsed.type === 'slides') {
            googleSlidesId = parsed.id;
          }

          logger.info('Parsed Google URL during update', {
            component: 'template-routes',
            action: 'update',
            templateId: id,
            type: parsed.type,
            documentId: parsed.id
          });
        } else {
          // Invalid URL format
          return res.status(400).json({
            success: false,
            error: 'Invalid Google Docs/Slides URL format. Expected format: https://docs.google.com/document/d/{id} or https://docs.google.com/presentation/d/{id}'
          });
        }
      }
    }

    // Determine the effective type for default logic
    const effectiveType = type !== undefined ? type : existing.type;

    // If changing type on a default template, reset isDefault (can't be default for old type anymore)
    let effectiveIsDefault = isDefault;
    if (type !== undefined && type !== existing.type && existing.isDefault && isDefault !== true) {
      effectiveIsDefault = false;
      logger.info('Resetting isDefault because type changed', {
        component: 'template-routes',
        action: 'update',
        templateId: id,
        oldType: existing.type,
        newType: type
      });
    }

    // If setting as default, unset other defaults for the same type
    if (effectiveIsDefault === true && !existing.isDefault) {
      await prisma.templateLink.updateMany({
        where: {
          type: effectiveType,
          tenantId,
          isDefault: true,
          deletedAt: null,
          id: { not: id } // Exclude current template
        },
        data: {
          isDefault: false
        }
      });

      logger.info('Unset previous default templates', {
        component: 'template-routes',
        action: 'update',
        type: effectiveType,
        tenantId,
        templateId: id
      });
    }

    // Detect what changed (only if field is explicitly provided)
    const changes = [];
    if (content !== undefined && content !== existing.content) changes.push('content');
    if (header !== undefined && header !== existing.header) changes.push('header');
    if (footer !== undefined && footer !== existing.footer) changes.push('footer');
    if (styles !== undefined && JSON.stringify(styles) !== JSON.stringify(existing.styles)) changes.push('styles');
    if (layout !== undefined && JSON.stringify(layout) !== JSON.stringify(existing.layout)) changes.push('layout');
    if (markers !== undefined && JSON.stringify(markers) !== JSON.stringify(existing.markers)) changes.push('markers');

    const shouldCreateVersion = changes.length > 0;
    const newVersion = shouldCreateVersion ? existing.version + 1 : existing.version;

    logger.info('Template update prepared', {
      action: 'updateTemplate',
      templateId: id,
      templateName: existing.name,
      changesSummary: changes.join(', '),
      shouldCreateVersion,
      newVersion,
      userId,
      tenantId
    });

    // Update template
    const template = await prisma.templateLink.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(content !== undefined && { content }),
        ...(header !== undefined && { header }),
        ...(footer !== undefined && { footer }),
        ...(fileFormat !== undefined && { fileFormat }),
        ...(logoImage !== undefined && { logoImage }),
        ...(logoPosition !== undefined && { logoPosition }),
        ...(markers !== undefined && { markers }),
        ...(markerSchema !== undefined && { markerSchema }),
        ...(styles !== undefined && { styles }),
        ...(layout !== undefined && { layout }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(tags !== undefined && { tags }),
        ...(isActive !== undefined && { isActive }),
        ...(effectiveIsDefault !== undefined && { isDefault: effectiveIsDefault }),
        ...(syncEnabled !== undefined && { syncEnabled }),
        ...(autoSync !== undefined && { autoSync }),
        ...(googleDocsUrl !== undefined && { googleDocsUrl: googleDocsUrl || null }),
        ...(googleDocsUrl !== undefined && { googleDocsId }),
        ...(googleDocsUrl !== undefined && { googleSlidesId }),
        ...(shouldCreateVersion && { version: newVersion }),
        // Create new version if content changed
        ...(shouldCreateVersion && {
          versions: {
            create: {
              version: newVersion,
              content: content !== undefined ? content : existing.content,
              header: header !== undefined ? header : existing.header,
              footer: footer !== undefined ? footer : existing.footer,
              styles: styles !== undefined ? styles : existing.styles,
              layout: layout !== undefined ? layout : existing.layout,
              markers: markers !== undefined ? markers : existing.markers,
              changesSummary: changesSummary || `Updated ${changes.join(', ')}`,
              changeDetails: {
                changes,
                timestamp: new Date().toISOString(),
                updatedBy: userId
              },
              tenantId,
              createdBy: userId
            }
          }
        })
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 3
        }
      }
    });

    res.json({
      success: true,
      data: template,
      message: shouldCreateVersion
        ? `Template aggiornato alla versione ${newVersion}`
        : 'Metadati template aggiornati'
    });
  } catch (error) {
    logger.error('Template update failed', {
      action: 'updateTemplate',
      templateId: id,
      error: 'Operazione non riuscita',
      errorCode: error.code,
      errorMeta: error.meta,
      stack: error.stack,
      userId,
      tenantId
    });
    logger.error({ component: 'templates', error: 'Operazione non riuscita', userId, tenantId }, 'Error updating template');
    res.status(500).json({
      success: false,
      error: 'Errore nell\'aggiornamento del template',
    });
  }
});

/**
 * PUT /api/v1/templates/:id/set-default
 * Set a template as the default for its type
 */
router.put('/:id/set-default', authenticateToken, requirePermission('templates:update'), async (req, res) => {
  try {
    const { tenantId, userId } = getAuthUser(req);
    const { id } = req.params;

    // Get the template to find its type
    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template non trovato'
      });
    }

    // Transaction: Reset all defaults of same type, then set this one
    await prisma.$transaction([
      // Reset all defaults for this type and tenant
      prisma.templateLink.updateMany({
        where: {
          type: template.type,
          tenantId,
          deletedAt: null
        },
        data: { isDefault: false }
      }),
      // Set this template as default
      prisma.templateLink.update({
        where: { id },
        data: { isDefault: true }
      })
    ]);

    res.json({
      success: true,
      message: `Template impostato come predefinito per il tipo ${template.type}`,
      data: { id, type: template.type }
    });
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Error setting default template');
    res.status(500).json({
      success: false,
      error: 'Errore nell\'impostazione del template predefinito',
    });
  }
});

/**
 * DELETE /api/v1/templates/:id
 * Soft delete a template
 */
router.delete('/:id', authenticateToken, requirePermission('templates:delete'), async (req, res) => {
  try {
    const { tenantId } = getAuthUser(req);
    const { id } = req.params;

    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template non trovato'
      });
    }

    // Check if template is in use
    const usageCount = await prisma.generatedDocument.count({
      where: { templateId: id, tenantId }
    });

    // Soft delete
    await prisma.templateLink.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    res.json({
      success: true,
      message: 'Template eliminato con successo',
      warning: usageCount > 0
        ? `This template has ${usageCount} generated documents`
        : null
    });
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Error deleting template');
    res.status(500).json({
      success: false,
      error: 'Errore nell\'eliminazione del template',
    });
  }
});

/**
 * POST /api/templates/:id/duplicate
 * Duplicate template with new name
 */
/**
 * POST /api/v1/templates/:id/duplicate
 * Duplicate an existing template
 */
router.post('/:id/duplicate', authenticateToken, requirePermission('templates:create'), async (req, res) => {
  try {
    const { tenantId, userId } = getAuthUser(req);
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nome del nuovo template obbligatorio'
      });
    }

    // Get source template
    const source = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Template non trovato'
      });
    }

    // Create duplicate
    const duplicate = await prisma.templateLink.create({
      data: {
        name,
        type: source.type,
        content: source.content,
        header: source.header,
        footer: source.footer,
        fileFormat: source.fileFormat,
        logoImage: source.logoImage,
        logoPosition: source.logoPosition,
        markers: source.markers,
        markerSchema: source.markerSchema,
        styles: source.styles,
        layout: source.layout,
        description: `Copy of ${source.name}`,
        category: source.category,
        tags: source.tags,
        version: 1,
        isActive: true,
        isDefault: false,
        tenantId,
        companyTenantProfileId: source.companyTenantProfileId || null,
        createdBy: userId,
        url: '',
        versions: {
          create: {
            version: 1,
            content: source.content,
            header: source.header,
            footer: source.footer,
            styles: source.styles,
            layout: source.layout,
            markers: source.markers,
            changesSummary: `Duplicated from ${source.name}`,
            changeDetails: {
              action: 'DUPLICATE',
              sourceId: source.id,
              timestamp: new Date().toISOString()
            },
            tenantId,
            createdBy: userId
          }
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: duplicate,
      message: 'Template duplicato con successo'
    });
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Error duplicating template');
    res.status(500).json({
      success: false,
      error: 'Errore nella duplicazione del template',
    });
  }
});

/**
 * GET /api/templates/:id/versions
 * Get all versions of a template
 */
router.get('/:id/versions', authenticateToken, requirePermission('templates:read'), async (req, res) => {
  try {
    const { tenantId } = getAuthUser(req);
    const { id } = req.params;

    const versions = await prisma.templateVersion.findMany({
      where: {
        templateId: id,
        tenantId
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { version: 'desc' }
    });

    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Error fetching versions');
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero delle versioni',
    });
  }
});

/**
 * POST /api/templates/:id/restore-version
 * Restore a specific version (creates new version with old content)
 */
router.post('/:id/restore-version', authenticateToken, requirePermission('templates:update'), async (req, res) => {
  try {
    const { tenantId, userId } = getAuthUser(req);
    const { id } = req.params;
    const { versionNumber } = req.body;

    if (!versionNumber) {
      return res.status(400).json({
        success: false,
        error: 'Numero versione obbligatorio'
      });
    }

    // Get the version to restore
    const version = await prisma.templateVersion.findFirst({
      where: {
        templateId: id,
        version: parseInt(versionNumber),
        tenantId
      }
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Versione non trovata'
      });
    }

    // Get current template
    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template non trovato'
      });
    }

    const newVersion = template.version + 1;

    // Update template with old content but new version
    const updated = await prisma.templateLink.update({
      where: { id },
      data: {
        content: version.content,
        header: version.header,
        footer: version.footer,
        styles: version.styles,
        layout: version.layout,
        markers: version.markers,
        version: newVersion,
        versions: {
          create: {
            version: newVersion,
            content: version.content,
            header: version.header,
            footer: version.footer,
            styles: version.styles,
            layout: version.layout,
            markers: version.markers,
            changesSummary: `Restored from version ${versionNumber}`,
            changeDetails: {
              action: 'RESTORE',
              fromVersion: versionNumber,
              timestamp: new Date().toISOString()
            },
            tenantId,
            createdBy: userId
          }
        }
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 5
        }
      }
    });

    res.json({
      success: true,
      data: updated,
      message: `Ripristinato alla versione ${versionNumber} (salvato come versione ${newVersion})`
    });
  } catch (error) {
    logger.error({ component: 'templates', error: error.message }, 'Error restoring version');
    res.status(500).json({
      success: false,
      error: 'Errore nel ripristino della versione',
    });
  }
});

export default router;
