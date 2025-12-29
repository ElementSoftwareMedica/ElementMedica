/**
 * Enhanced Template Management Routes
 * Features: CRUD operations with versioning, Google integration, markers
 * 
 * Part of Settings/Templates Redesign Project
 * Created: 2025-11-05
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../auth/middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware destructuring
const { authenticate: authenticateToken, authorize: requirePermission } = middleware;

// Helper to get authenticated user info
const getAuthUser = (req) => ({
  userId: req.person.id,
  tenantId: req.person.tenantId
});

/**
 * GET /api/templates
 * List all templates with filters
 * Query params: type, category, isActive, search, page, limit
 */
router.get('/', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
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
            lastName: true,
            email: true
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
    console.error('Error listing templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      message: error.message
    });
  }
});

/**
 * GET /api/templates/:id
 * Get single template with full details and version history
 */
router.get('/:id', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
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
            lastName: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
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
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template',
      message: error.message
    });
  }
});

/**
 * POST /api/templates
 * Create new template (auto-creates version 1)
 */
router.post('/', authenticateToken(), requirePermission('read:templates'), requirePermission('templates:write'), async (req, res) => {
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
      isDefault = false
    } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type'
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
        companyId,
        createdBy: userId,
        url: '', // Will be generated after file creation if needed
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
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
      message: error.message
    });
  }
});

/**
 * PUT /api/templates/:id
 * Update template (auto-increments version)
 */
router.put('/:id', authenticateToken(), requirePermission('read:templates'), requirePermission('templates:write'), async (req, res) => {
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
      changesSummary
    } = req.body;

    // DEBUG: Log type field
    logger.info('Template update request', {
      templateId: id,
      receivedType: type,
      bodyType: req.body.type,
      hasType: type !== undefined
    });

    // Check if template exists and belongs to tenant
    const existing = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Detect what changed
    const changes = [];
    if (content !== existing.content) changes.push('content');
    if (header !== existing.header) changes.push('header');
    if (footer !== existing.footer) changes.push('footer');
    if (JSON.stringify(styles) !== JSON.stringify(existing.styles)) changes.push('styles');
    if (JSON.stringify(layout) !== JSON.stringify(existing.layout)) changes.push('layout');
    if (JSON.stringify(markers) !== JSON.stringify(existing.markers)) changes.push('markers');

    const shouldCreateVersion = changes.length > 0;
    const newVersion = shouldCreateVersion ? existing.version + 1 : existing.version;

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
        ...(isDefault !== undefined && { isDefault }),
        ...(syncEnabled !== undefined && { syncEnabled }),
        ...(autoSync !== undefined && { autoSync }),
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
        ? `Template updated to version ${newVersion}`
        : 'Template metadata updated'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template',
      message: error.message
    });
  }
});

/**
 * DELETE /api/templates/:id
 * Soft delete template
 */
router.delete('/:id', authenticateToken(), requirePermission('read:templates'), requirePermission('templates:delete'), async (req, res) => {
  try {
    const { tenantId } = getAuthUser(req);
    const { id } = req.params;

    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Check if template is in use
    const usageCount = await prisma.generatedDocument.count({
      where: { templateId: id }
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
      message: 'Template deleted successfully',
      warning: usageCount > 0
        ? `This template has ${usageCount} generated documents`
        : null
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
      message: error.message
    });
  }
});

/**
 * POST /api/templates/:id/duplicate
 * Duplicate template with new name
 */
router.post('/:id/duplicate', authenticateToken(), requirePermission('read:templates'), requirePermission('templates:write'), async (req, res) => {
  try {
    const { tenantId, userId } = getAuthUser(req);
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'New template name is required'
      });
    }

    // Get source template
    const source = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
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
        companyId: source.companyId,
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
      message: 'Template duplicated successfully'
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate template',
      message: error.message
    });
  }
});

/**
 * GET /api/templates/:id/versions
 * Get all versions of a template
 */
router.get('/:id/versions', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
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
    console.error('Error fetching versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch versions',
      message: error.message
    });
  }
});

/**
 * POST /api/templates/:id/restore-version
 * Restore a specific version (creates new version with old content)
 */
router.post('/:id/restore-version', authenticateToken(), requirePermission('read:templates'), requirePermission('templates:write'), async (req, res) => {
  try {
    const { tenantId, userId } = getAuthUser(req);
    const { id } = req.params;
    const { versionNumber } = req.body;

    if (!versionNumber) {
      return res.status(400).json({
        success: false,
        error: 'Version number is required'
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
        error: 'Version not found'
      });
    }

    // Get current template
    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
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
      message: `Restored to version ${versionNumber} (saved as version ${newVersion})`
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore version',
      message: error.message
    });
  }
});

export default router;
