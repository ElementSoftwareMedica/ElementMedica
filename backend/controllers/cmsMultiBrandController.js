/**
 * CMS Multi-Brand Controller
 * Gestisce contenuti CMS per ElementFormazione e ElementMedica
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { getAllBrands, BRAND_FEATURES, getTenantBySlug } from '../middleware/brandDetection.js';

class CMSMultiBrandController {
  /**
   * GET /api/cms/brands
   * Lista tutti i brand disponibili
   */
  async getBrands(req, res) {
    try {
      // Carica tenant dal database per ogni brand
      const brandsPromises = Object.entries(BRAND_FEATURES).map(async ([id, config]) => {
        const tenant = await getTenantBySlug(id);
        return {
          id,
          name: config.name,
          tenantId: tenant?.id || null,
          allowedFeatures: config.allowedFeatures,
        };
      });

      const brands = await Promise.all(brandsPromises);

      logger.info('Retrieved brands', { count: brands.length });

      res.json({
        success: true,
        data: brands,
      });
    } catch (error) {
      logger.error('Error getting brands:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve brands',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/cms/brands/:brandId/content
   * Recupera statistiche contenuti per un brand specifico
   */
  async getBrandContent(req, res) {
    try {
      const { brandId } = req.params;
      const brandFeatures = BRAND_FEATURES[brandId];

      if (!brandFeatures) {
        return res.status(404).json({
          success: false,
          error: 'Brand not found',
        });
      }

      const tenant = await getTenantBySlug(brandId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found for brand',
        });
      }

      const tenantId = tenant.id;

      // Statistiche contenuti per brand
      const [coursesCount, pagesCount, formsCount] = await Promise.all([
        prisma.course.count({
          where: {
            tenantId,
            deletedAt: null,
            isPublic: true,
          },
        }),
        prisma.cMSPage.count({
          where: {
            tenantId,
            deletedAt: null,
            isPublished: true,
          },
        }),
        prisma.formTemplate.count({
          where: {
            tenantId,
            deletedAt: null,
            isPublic: true,
          },
        }),
      ]);

      const stats = {
        brandId,
        brandName: brandFeatures.name,
        tenantId,
        content: {
          courses: coursesCount,
          pages: pagesCount,
          forms: formsCount,
        },
        features: brandFeatures.allowedFeatures,
      };

      logger.info('Retrieved brand content stats', { brandId, stats });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting brand content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve brand content',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/cms/brands/:brandId/courses
   * Corsi CMS per un brand specifico
   */
  async getBrandCourses(req, res) {
    try {
      const { brandId } = req.params;
      const brandConfig = BRAND_FEATURES[brandId];

      if (!brandConfig) {
        return res.status(404).json({
          success: false,
          error: 'Brand not found',
        });
      }

      // Element Medica non ha corsi (solo poliambulatorio)
      if (brandId === 'element-medica') {
        return res.json({
          success: true,
          data: {
            courses: [],
            message: 'Courses not available for Element Medica (poliambulatorio)',
          },
        });
      }

      const tenant = await getTenantBySlug(brandId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found for brand',
        });
      }
      const tenantId = tenant.id;
      const { page = 1, limit = 20, search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        tenantId,
        deletedAt: null,
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
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
            isPublic: true,
            slug: true,
            riskLevel: true,
            courseType: true,
            duration: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ updatedAt: 'desc' }],
          skip: offset,
          take: parseInt(limit),
        }),
        prisma.course.count({ where }),
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      logger.info('Retrieved brand courses', { brandId, total });

      res.json({
        success: true,
        data: {
          brandId,
          brandName: brandConfig.name,
          courses,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      });
    } catch (error) {
      logger.error('Error getting brand courses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve brand courses',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/cms/brands/:brandId/pages
   * Pagine CMS per un brand specifico
   */
  async getBrandPages(req, res) {
    try {
      const { brandId } = req.params;
      const brandConfig = BRAND_FEATURES[brandId];

      if (!brandConfig) {
        return res.status(404).json({
          success: false,
          error: 'Brand not found',
        });
      }

      const tenant = await getTenantBySlug(brandId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found for brand',
        });
      }
      const tenantId = tenant.id;
      const { page = 1, limit = 20, search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        tenantId,
        deletedAt: null,
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [pages, total] = await Promise.all([
        prisma.cMSPage.findMany({
          where,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            isPublished: true,
            seoTitle: true,
            seoDescription: true,
            createdAt: true,
            updatedAt: true,
            publishedAt: true,
          },
          orderBy: [{ updatedAt: 'desc' }],
          skip: offset,
          take: parseInt(limit),
        }),
        prisma.cMSPage.count({ where }),
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      logger.info('Retrieved brand pages', { brandId, total });

      res.json({
        success: true,
        data: {
          brandId,
          brandName: brandConfig.name,
          pages,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      });
    } catch (error) {
      logger.error('Error getting brand pages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve brand pages',
        details: error.message,
      });
    }
  }

  /**
   * POST /api/cms/brands/:brandId/pages
   * Crea una nuova pagina CMS per un brand
   */
  async createBrandPage(req, res) {
    try {
      const { brandId } = req.params;
      const brandConfig = BRAND_FEATURES[brandId];

      if (!brandConfig) {
        return res.status(404).json({
          success: false,
          error: 'Brand not found',
        });
      }

      const tenant = await getTenantBySlug(brandId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found for brand',
        });
      }
      const tenantId = tenant.id;
      const userId = req.user.id;

      const {
        title,
        slug,
        content,
        excerpt,
        featuredImageUrl,
        seoTitle,
        seoDescription,
        seoKeywords,
        isPublished = false,
      } = req.body;

      // Validazione
      if (!title || !slug || !content) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, slug, content',
        });
      }

      // Verifica slug univoco per questo tenant
      const existingPage = await prisma.cMSPage.findFirst({
        where: {
          tenantId,
          slug,
          deletedAt: null,
        },
      });

      if (existingPage) {
        return res.status(409).json({
          success: false,
          error: 'Page with this slug already exists for this brand',
        });
      }

      // Crea pagina
      const page = await prisma.cMSPage.create({
        data: {
          tenantId,
          title,
          slug,
          content,
          excerpt: excerpt || null,
          featuredImageUrl: featuredImageUrl || null,
          seoTitle: seoTitle || title,
          seoDescription: seoDescription || excerpt || null,
          seoKeywords: seoKeywords || null,
          isPublished,
          publishedAt: isPublished ? new Date() : null,
          createdBy: userId,
        },
      });

      logger.info('Created CMS page for brand', {
        brandId,
        pageId: page.id,
        tenantId,
      });

      res.status(201).json({
        success: true,
        data: {
          brandId,
          brandName: brandConfig.name,
          page,
        },
      });
    } catch (error) {
      logger.error('Error creating brand page:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create page',
        details: error.message,
      });
    }
  }

  /**
   * PUT /api/cms/brands/:brandId/pages/:pageId
   * Aggiorna una pagina CMS per un brand
   */
  async updateBrandPage(req, res) {
    try {
      const { brandId, pageId } = req.params;
      const brandConfig = BRAND_FEATURES[brandId];

      if (!brandConfig) {
        return res.status(404).json({
          success: false,
          error: 'Brand not found',
        });
      }

      const tenant = await getTenantBySlug(brandId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found for brand',
        });
      }
      const tenantId = tenant.id;

      // Verifica esistenza pagina
      const existingPage = await prisma.cMSPage.findFirst({
        where: {
          id: pageId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!existingPage) {
        return res.status(404).json({
          success: false,
          error: 'Page not found for this brand',
        });
      }

      const {
        title,
        slug,
        content,
        excerpt,
        featuredImageUrl,
        seoTitle,
        seoDescription,
        seoKeywords,
        isPublished,
      } = req.body;

      // Aggiorna
      const updatedPage = await prisma.cMSPage.update({
        where: { id: pageId },
        data: {
          ...(title && { title }),
          ...(slug && { slug }),
          ...(content && { content }),
          ...(excerpt !== undefined && { excerpt }),
          ...(featuredImageUrl !== undefined && { featuredImageUrl }),
          ...(seoTitle && { seoTitle }),
          ...(seoDescription !== undefined && { seoDescription }),
          ...(seoKeywords !== undefined && { seoKeywords }),
          ...(isPublished !== undefined && {
            isPublished,
            publishedAt: isPublished && !existingPage.publishedAt ? new Date() : existingPage.publishedAt,
          }),
        },
      });

      logger.info('Updated CMS page for brand', {
        brandId,
        pageId,
      });

      res.json({
        success: true,
        data: {
          brandId,
          brandName: brandConfig.name,
          page: updatedPage,
        },
      });
    } catch (error) {
      logger.error('Error updating brand page:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update page',
        details: error.message,
      });
    }
  }

  /**
   * DELETE /api/cms/brands/:brandId/pages/:pageId
   * Elimina (soft delete) una pagina CMS per un brand
   */
  async deleteBrandPage(req, res) {
    try {
      const { brandId, pageId } = req.params;
      const brandConfig = BRAND_FEATURES[brandId];

      if (!brandConfig) {
        return res.status(404).json({
          success: false,
          error: 'Brand not found',
        });
      }

      const tenant = await getTenantBySlug(brandId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found for brand',
        });
      }
      const tenantId = tenant.id;

      // Verifica esistenza
      const page = await prisma.cMSPage.findFirst({
        where: {
          id: pageId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!page) {
        return res.status(404).json({
          success: false,
          error: 'Page not found for this brand',
        });
      }

      // Soft delete
      await prisma.cMSPage.update({
        where: { id: pageId },
        data: {
          deletedAt: new Date(),
        },
      });

      logger.info('Deleted CMS page for brand', {
        brandId,
        pageId,
      });

      res.json({
        success: true,
        message: 'Page deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting brand page:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete page',
        details: error.message,
      });
    }
  }
}

export default new CMSMultiBrandController();
