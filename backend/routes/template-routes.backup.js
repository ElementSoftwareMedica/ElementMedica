import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../auth/middleware.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { getMarkerResolver } from '../services/markerResolver.js';
import { getDocumentService } from '../services/documentService.js';

const documentService = getDocumentService();

const router = express.Router();
const prisma = new PrismaClient();

const { authenticate: authenticateToken, authorize: requirePermission } = middleware;

// Validation middleware for template creation/update
const validateTemplate = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn([
    'LETTER_OF_ENGAGEMENT',
    'ATTENDANCE_REGISTER',
    'CERTIFICATE',
    'INVOICE',
    'COURSE_PROGRAM',
    'CUSTOM'
  ]).withMessage('Invalid template type'),
  body('content').optional().isString(),
  body('header').optional().isString(),
  body('footer').optional().isString(),
  body('styles').optional().isObject(),
  body('layout').optional().isObject(),
  body('markers').optional().isObject(),
  body('isDefault').optional().isBoolean(),
  body('companyId').optional().isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array()
      });
    }
    next();
  }
];

// GET /api/templates/statistics - Aggregate statistics (BEFORE /:id route)
router.get('/statistics', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
  try {
    const tenantId = req.person.tenantId;

    const [
      totalTemplates,
      activeTemplates,
      totalDocuments,
      documentsByType,
      documentsByStatus,
    ] = await Promise.all([
      // Total templates
      prisma.templateLink.count({
        where: { tenantId, deletedAt: null }
      }),
      // Active templates
      prisma.templateLink.count({
        where: { tenantId, deletedAt: null, isActive: true }
      }),
      // Total documents generated
      prisma.generatedDocument.count({
        where: { tenantId, deletedAt: null }
      }),
      // Documents by type
      prisma.generatedDocument.groupBy({
        by: ['type'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
      // Documents by status
      prisma.generatedDocument.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
    ]);

    // Top templates by usage
    const topTemplates = await prisma.templateLink.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        _count: {
          select: { generatedDocs: true }
        }
      },
      orderBy: {
        generatedDocs: {
          _count: 'desc'
        }
      },
      take: 10,
    });

    res.json({
      templates: {
        total: totalTemplates,
        active: activeTemplates,
        inactive: totalTemplates - activeTemplates,
      },
      documents: {
        total: totalDocuments,
        byType: documentsByType.reduce((acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {}),
        byStatus: documentsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {}),
      },
      topTemplates: topTemplates.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        documentsGenerated: t._count.generatedDocs,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch statistics', {
      component: 'template-routes',
      action: 'getStatistics',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch statistics'
    });
  }
});

// GET /api/templates - List all templates
router.get('/', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
  try {
    const { type, isActive, isDefault, search, category, page = '1', limit = '50' } = req.query;
    const tenantId = req.person.tenantId;

    // Build where clause
    const where = {
      tenantId,
      deletedAt: null,
      ...(type && { type }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(isDefault !== undefined && { isDefault: isDefault === 'true' }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]
      }),
    };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [templates, total] = await Promise.all([
      prisma.templateLink.findMany({
        where,
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true },
          },
          company: {
            select: { id: true, name: true },
          },
          _count: {
            select: { generatedDocs: true, versions: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.templateLink.count({ where })
    ]);

    res.json({
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      }
    });
  } catch (error) {
    logger.error('Failed to fetch templates', {
      component: 'template-routes',
      action: 'getTemplates',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch templates'
    });
  }
});

// GET /api/templates/:id - Get single template
router.get('/:id', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        company: {
          select: { id: true, name: true },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 10,
          include: {
            creator: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        _count: {
          select: { generatedDocs: true }
        }
      },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID ${id} does not exist or has been deleted`
      });
    }

    res.json(template);
  } catch (error) {
    logger.error('Failed to fetch template', {
      component: 'template-routes',
      action: 'getTemplate',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      templateId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch template'
    });
  }
});

// POST /api/templates - Create template
router.post('/', authenticateToken(), requirePermission('create:templates'), validateTemplate, async (req, res) => {
  try {
    const {
      name,
      type,
      content,
      header,
      footer,
      styles,
      layout,
      markers,
      markerSchema,
      isDefault,
      companyId,
      description,
      category,
      tags,
      googleDocsUrl,
      syncEnabled
    } = req.body;
    
    const tenantId = req.person.tenantId;
    const userId = req.person.id;

    // If setting as default, unset other defaults of same type
    if (isDefault) {
      await prisma.templateLink.updateMany({
        where: { tenantId, type, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create template
    const template = await prisma.templateLink.create({
      data: {
        name,
        type,
        content: content || '',
        header,
        footer,
        styles,
        layout,
        markers,
        markerSchema,
        isDefault: isDefault || false,
        companyId,
        description,
        category,
        tags: tags || [],
        googleDocsUrl,
        syncEnabled: syncEnabled || false,
        tenantId,
        createdBy: userId,
        version: 1,
        isActive: true,
      },
    });

    // Create initial version snapshot
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        content: content || '',
        header,
        footer,
        styles,
        layout,
        markers,
        changesSummary: 'Initial version',
        changeDetails: {
          action: 'created',
          timestamp: new Date().toISOString(),
        },
        createdBy: userId,
        tenantId,
      },
    });

    logger.info('Template created successfully', {
      component: 'template-routes',
      action: 'createTemplate',
      templateId: template.id,
      templateName: template.name,
      templateType: template.type,
      personId: userId
    });

    res.status(201).json(template);
  } catch (error) {
    logger.error('Failed to create template', {
      component: 'template-routes',
      action: 'createTemplate',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create template'
    });
  }
});

// PUT /api/templates/:id - Update template
router.put('/:id', authenticateToken(), requirePermission('update:templates'), validateTemplate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      content,
      header,
      footer,
      styles,
      layout,
      markers,
      markerSchema,
      isDefault,
      isActive,
      description,
      category,
      tags,
      googleDocsUrl,
      syncEnabled
    } = req.body;
    
    const tenantId = req.person.tenantId;
    const userId = req.person.id;

    // Check template exists and belongs to tenant
    const existing = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID ${id} does not exist or has been deleted`
      });
    }

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await prisma.templateLink.updateMany({
        where: { tenantId, type: existing.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Increment version
    const newVersion = existing.version + 1;

    // Detect changes
    const changes = [];
    if (content !== existing.content) changes.push('content');
    if (header !== existing.header) changes.push('header');
    if (footer !== existing.footer) changes.push('footer');
    if (JSON.stringify(styles) !== JSON.stringify(existing.styles)) changes.push('styles');
    if (JSON.stringify(layout) !== JSON.stringify(existing.layout)) changes.push('layout');
    if (JSON.stringify(markers) !== JSON.stringify(existing.markers)) changes.push('markers');

    // Update template
    const updated = await prisma.templateLink.update({
      where: { id },
      data: {
        name,
        content: content || existing.content,
        header,
        footer,
        styles,
        layout,
        markers,
        markerSchema,
        isDefault,
        isActive,
        description,
        category,
        tags: tags || existing.tags,
        googleDocsUrl,
        syncEnabled,
        version: newVersion,
        updatedAt: new Date(),
      },
    });

    // Create version snapshot
    await prisma.templateVersion.create({
      data: {
        templateId: id,
        version: newVersion,
        content: content || existing.content,
        header,
        footer,
        styles,
        layout,
        markers,
        changesSummary: changes.length > 0
          ? `Updated: ${changes.join(', ')}`
          : 'Minor updates',
        changeDetails: {
          action: 'updated',
          changes,
          timestamp: new Date().toISOString(),
        },
        createdBy: userId,
        tenantId,
      },
    });

    logger.info('Template updated successfully', {
      component: 'template-routes',
      action: 'updateTemplate',
      templateId: id,
      newVersion,
      changes,
      personId: userId
    });

    res.json(updated);
  } catch (error) {
    logger.error('Failed to update template', {
      component: 'template-routes',
      action: 'updateTemplate',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      templateId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update template'
    });
  }
});

// DELETE /api/templates/:id - Soft delete template
router.delete('/:id', authenticateToken(), requirePermission('delete:templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    // Check template exists
    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID ${id} does not exist or has been deleted`
      });
    }

    // Soft delete
    await prisma.templateLink.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        isDefault: false,
      },
    });

    logger.info('Template deleted successfully', {
      component: 'template-routes',
      action: 'deleteTemplate',
      templateId: id,
      personId: req.person.id
    });

    res.json({
      message: 'Template deleted successfully',
      id
    });
  } catch (error) {
    logger.error('Failed to delete template', {
      component: 'template-routes',
      action: 'deleteTemplate',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      templateId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete template'
    });
  }
});

// POST /api/templates/:id/validate - Validate markers
router.post('/:id/validate', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const { mockData } = req.body;
    const tenantId = req.person.tenantId;

    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID ${id} does not exist`
      });
    }

    // Use mock data or empty context
    const context = mockData || {};
    const MarkerResolver = getMarkerResolver();
    const resolver = new MarkerResolver(context);
    const validation = resolver.validate(template.content || '');

    logger.info('Template validated', {
      component: 'template-routes',
      action: 'validateTemplate',
      templateId: id,
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      personId: req.person.id
    });

    res.json(validation);
  } catch (error) {
    logger.error('Failed to validate template', {
      component: 'template-routes',
      action: 'validateTemplate',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      templateId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to validate template'
    });
  }
});

// POST /api/templates/:id/preview - Preview with mock data
router.post('/:id/preview', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const { mockData } = req.body;
    const tenantId = req.person.tenantId;

    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID ${id} does not exist`
      });
    }

    // Build HTML with header, content, footer
    const context = mockData || {};
    const MarkerResolver = getMarkerResolver();
    const resolver = new MarkerResolver(context);
    
    let html = '';
    
    // Add header
    if (template.header) {
      html += resolver.resolve(template.header);
    }
    
    // Add content
    html += resolver.resolve(template.content || '');
    
    // Add footer
    if (template.footer) {
      html += resolver.resolve(template.footer);
    }

    logger.info('Template previewed', {
      component: 'template-routes',
      action: 'previewTemplate',
      templateId: id,
      htmlLength: html.length,
      personId: req.person.id
    });

    res.json({
      html,
      markers: resolver.parseMarkers(template.content || ''),
    });
  } catch (error) {
    logger.error('Failed to preview template', {
      component: 'template-routes',
      action: 'previewTemplate',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      templateId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to preview template'
    });
  }
});

// GET /api/templates/:id/versions - Version history
router.get('/:id/versions', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    // Verify template exists and belongs to tenant
    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID ${id} does not exist`
      });
    }

    const versions = await prisma.templateVersion.findMany({
      where: { templateId: id, tenantId },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { version: 'desc' },
    });

    res.json(versions);
  } catch (error) {
    logger.error('Failed to fetch versions', {
      component: 'template-routes',
      action: 'getVersions',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      templateId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch versions'
    });
  }
});

// POST /api/templates/:id/versions/:version/rollback - Rollback to version
router.post('/:id/versions/:version/rollback', authenticateToken(), requirePermission('update:templates'), async (req, res) => {
  try {
    const { id, version } = req.params;
    const tenantId = req.person.tenantId;
    const userId = req.person.id;

    // Get template
    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID ${id} does not exist`
      });
    }

    // Get version to rollback to
    const targetVersion = await prisma.templateVersion.findFirst({
      where: {
        templateId: id,
        version: parseInt(version),
        tenantId,
      },
    });

    if (!targetVersion) {
      return res.status(404).json({
        error: 'Version not found',
        message: `Version ${version} does not exist for this template`
      });
    }

    // Increment current version
    const newVersion = template.version + 1;

    // Update template with old version content
    const updated = await prisma.templateLink.update({
      where: { id },
      data: {
        content: targetVersion.content,
        header: targetVersion.header,
        footer: targetVersion.footer,
        styles: targetVersion.styles,
        layout: targetVersion.layout,
        markers: targetVersion.markers,
        version: newVersion,
        updatedAt: new Date(),
      },
    });

    // Create new version record
    await prisma.templateVersion.create({
      data: {
        templateId: id,
        version: newVersion,
        content: targetVersion.content,
        header: targetVersion.header,
        footer: targetVersion.footer,
        styles: targetVersion.styles,
        layout: targetVersion.layout,
        markers: targetVersion.markers,
        changesSummary: `Rolled back to version ${version}`,
        changeDetails: {
          action: 'rollback',
          fromVersion: template.version,
          toVersion: parseInt(version),
          timestamp: new Date().toISOString(),
        },
        createdBy: userId,
        tenantId,
      },
    });

    logger.info('Template rolled back', {
      component: 'template-routes',
      action: 'rollbackVersion',
      templateId: id,
      fromVersion: template.version,
      toVersion: version,
      newVersion,
      personId: userId
    });

    res.json({
      message: `Template rolled back to version ${version}`,
      template: updated,
      rolledBackFrom: template.version,
      rolledBackTo: parseInt(version),
      newVersion,
    });
  } catch (error) {
    logger.error('Failed to rollback template', {
      component: 'template-routes',
      action: 'rollbackVersion',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      templateId: req.params?.id,
      version: req.params?.version
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to rollback template'
    });
  }
});

// POST /api/templates/:id/generate - Generate single document
router.post('/:id/generate', authenticateToken(), requirePermission('generate:documents'), async (req, res) => {
  try {
    const { id } = req.params;
    const { entityType, entityId, options } = req.body;
    const tenantId = req.person.tenantId;
    const userId = req.person.id;

    // Validate required fields
    if (!entityType || !entityId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'entityType and entityId are required'
      });
    }

    // Verify template exists
    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null, isActive: true },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: 'Template does not exist or is not active'
      });
    }

    // Generate document
    const document = await documentService.generateDocument({
      templateId: id,
      entityType,
      entityId,
      userId,
      tenantId,
      options,
    });

    logger.info('Document generated from template', {
      component: 'template-routes',
      action: 'generateDocument',
      templateId: id,
      documentId: document.id,
      entityType,
      entityId,
      personId: userId
    });

    res.status(201).json(document);
  } catch (error) {
    logger.error('Failed to generate document', {
      component: 'template-routes',
      action: 'generateDocument',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      templateId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to generate document'
    });
  }
});

// POST /api/templates/:id/generate-batch - Generate batch documents
router.post('/:id/generate-batch', authenticateToken(), requirePermission('generate:documents'), async (req, res) => {
  try {
    const { id } = req.params;
    const { entityType, entityIds, options } = req.body;
    const tenantId = req.person.tenantId;
    const userId = req.person.id;

    // Validate required fields
    if (!entityType || !Array.isArray(entityIds) || entityIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'entityType and entityIds array are required'
      });
    }

    // Verify template exists
    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null, isActive: true },
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: 'Template does not exist or is not active'
      });
    }

    // Queue batch generation
    const batch = await documentService.generateBatch({
      templateId: id,
      entityType,
      entityIds,
      userId,
      tenantId,
      options,
    });

    logger.info('Batch generation queued', {
      component: 'template-routes',
      action: 'generateBatch',
      templateId: id,
      batchId: batch.batchId,
      entityType,
      totalDocuments: entityIds.length,
      personId: userId
    });

    res.status(202).json(batch);
  } catch (error) {
    logger.error('Failed to queue batch generation', {
      component: 'template-routes',
      action: 'generateBatch',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id,
      templateId: req.params?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to queue batch generation'
    });
  }
});

export default router;
