/**
 * CMS Service - FASE 2
 * Gestione completa pagine CMS con blocchi, versioning, SEO
 * 
 * Conformità:
 * ✅ Multi-tenancy: Filtra sempre per tenantId
 * ✅ GDPR: Soft delete (deletedAt)
 * ✅ RBAC: Permission checks nei controller
 * ✅ Audit: Tracked creator/updater
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

class CMSService {
  /**
   * Lista tutte le pagine CMS
   * @param {Object} filters - Filtri (tenantId, status, search, page, limit, isAdmin)
   * @returns {Promise<Object>} Pages con pagination
   */
  async listPages(filters) {
    const {
      tenantId,
      status,
      search,
      page = 1,
      limit = 20,
      isAdmin = false
    } = filters;

    // Admin can see all pages, others need tenantId
    if (!tenantId && !isAdmin) {
      throw new Error('tenantId is required');
    }

    try {
      const where = {
        deletedAt: null
      };

      // Filtro tenant:
      // - Non-admin: sempre filtrato per il proprio tenant
      // - Admin: se tenantId specificato, filtra; altrimenti vede tutti
      if (!isAdmin) {
        // Utenti normali: sempre filtro per tenant
        where.tenantId = tenantId;
      } else if (tenantId) {
        // Admin con tenantId specifico: filtra per quel tenant
        where.tenantId = tenantId;
      }
      // Admin senza tenantId: vede tutte le pagine (nessun filtro tenant)

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [pages, total] = await Promise.all([
        prisma.cMSPage.findMany({
          where,
          select: {
            id: true,
            slug: true,
            title: true,
            // Non include content per performance - troppo grande per la lista
            layout: true,
            status: true,
            isPublished: true,
            createdAt: true,
            updatedAt: true,
            seoTitle: true,
            seoDescription: true
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.cMSPage.count({ where })
      ]);

      logger.info('CMS pages listed', {
        component: 'cmsService',
        tenantId,
        count: pages.length,
        total
      });

      return {
        pages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to list CMS pages', {
        component: 'cmsService',
        error: error.message,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Ottieni singola pagina con tutti i dettagli
   * @param {string} id - Page ID
   * @param {string} tenantId - Tenant ID per multi-tenancy
   * @returns {Promise<Object>} Page completa
   */
  async getPage(id, tenantId, isGlobalAdmin = false) {
    if (!tenantId && !isGlobalAdmin) {
      throw new Error('tenantId is required');
    }

    try {
      // Gli admin globali possono vedere pagine di qualsiasi tenant
      const whereClause = {
        id,
        deletedAt: null
      };

      // Filtra per tenant solo se non è admin globale
      if (!isGlobalAdmin) {
        whereClause.tenantId = tenantId;
      }

      const page = await prisma.cMSPage.findFirst({
        where: whereClause
      });

      if (!page) {
        throw new Error('Page not found');
      }

      logger.info('CMS page retrieved', {
        component: 'cmsService',
        pageId: id,
        slug: page.slug
      });

      return page;
    } catch (error) {
      logger.error('Failed to get CMS page', {
        component: 'cmsService',
        error: error.message,
        pageId: id
      });
      throw error;
    }
  }

  /**
   * Ottieni pagina by slug (per frontend pubblico)
   * @param {string} slug - Page slug
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Page pubblicata
   */
  async getPageBySlug(slug, tenantId) {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    try {
      const page = await prisma.cMSPage.findFirst({
        where: {
          slug,
          tenantId,
          isPublished: true,
          deletedAt: null
        }
      });

      if (!page) {
        return null;
      }

      logger.info('CMS page retrieved by slug', {
        component: 'cmsService',
        slug
      });

      return page;
    } catch (error) {
      logger.error('Failed to get CMS page by slug', {
        component: 'cmsService',
        error: error.message,
        slug
      });
      throw error;
    }
  }

  /**
   * Crea nuova pagina CMS
   * @param {Object} data - Page data
   * @param {string} userId - Creator user ID
   * @returns {Promise<Object>} Created page
   */
  async createPage(data, userId) {
    const {
      slug,
      title,
      content,
      blocks,
      layout,
      seoTitle,
      seoDescription,
      tenantId
    } = data;

    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    try {
      // Verifica slug unico
      const existing = await prisma.cMSPage.findFirst({
        where: {
          slug,
          tenantId,
          deletedAt: null
        }
      });

      if (existing) {
        throw new Error('Slug already exists');
      }

      const page = await prisma.cMSPage.create({
        data: {
          slug,
          title,
          content: content || {},
          blocks: blocks || [],
          layout: layout || 'full-width',
          seoTitle,
          seoDescription,
          tenantId,
          createdBy: userId,
          status: 'draft',
          isPublished: false
        }
      });

      logger.info('CMS page created', {
        component: 'cmsService',
        pageId: page.id,
        slug: page.slug,
        userId
      });

      return page;
    } catch (error) {
      logger.error('Failed to create CMS page', {
        component: 'cmsService',
        error: error.message,
        slug
      });
      throw error;
    }
  }

  /**
   * Aggiorna pagina CMS
   * @param {string} id - Page ID
   * @param {Object} data - Update data
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated page
   */
  async updatePage(id, data, tenantId, isGlobalAdmin = false) {
    if (!tenantId && !isGlobalAdmin) {
      throw new Error('tenantId is required');
    }

    try {
      // Verifica esistenza - admin globali possono modificare qualsiasi pagina
      const whereClause = { id, deletedAt: null };
      if (!isGlobalAdmin) {
        whereClause.tenantId = tenantId;
      }

      const existing = await prisma.cMSPage.findFirst({
        where: whereClause
      });

      if (!existing) {
        throw new Error('Page not found');
      }

      // Se cambio slug, verifica unicità (nel tenant della pagina)
      if (data.slug && data.slug !== existing.slug) {
        const slugExists = await prisma.cMSPage.findFirst({
          where: {
            slug: data.slug,
            tenantId: existing.tenantId, // Usa il tenant della pagina esistente
            deletedAt: null,
            id: { not: id }
          }
        });

        if (slugExists) {
          throw new Error('Slug already exists');
        }
      }

      const page = await prisma.cMSPage.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      logger.info('CMS page updated', {
        component: 'cmsService',
        pageId: id,
        slug: page.slug
      });

      return page;
    } catch (error) {
      logger.error('Failed to update CMS page', {
        component: 'cmsService',
        error: error.message,
        pageId: id
      });
      throw error;
    }
  }

  /**
   * Pubblica pagina CMS
   * @param {string} id - Page ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Published page
   */
  async publishPage(id, tenantId) {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    try {
      const page = await prisma.cMSPage.update({
        where: {
          id,
          tenantId
        },
        data: {
          isPublished: true,
          status: 'published',
          publishedAt: new Date()
        }
      });

      logger.info('CMS page published', {
        component: 'cmsService',
        pageId: id
      });

      return page;
    } catch (error) {
      logger.error('Failed to publish CMS page', {
        component: 'cmsService',
        error: error.message,
        pageId: id
      });
      throw error;
    }
  }

  /**
   * Unpublish pagina CMS
   * @param {string} id - Page ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Unpublished page
   */
  async unpublishPage(id, tenantId) {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    try {
      const page = await prisma.cMSPage.update({
        where: {
          id,
          tenantId
        },
        data: {
          isPublished: false,
          status: 'draft'
        }
      });

      logger.info('CMS page unpublished', {
        component: 'cmsService',
        pageId: id
      });

      return page;
    } catch (error) {
      logger.error('Failed to unpublish CMS page', {
        component: 'cmsService',
        error: error.message,
        pageId: id
      });
      throw error;
    }
  }

  /**
   * Elimina pagina CMS (soft delete)
   * @param {string} id - Page ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Deleted page
   */
  async deletePage(id, tenantId) {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    try {
      const page = await prisma.cMSPage.update({
        where: {
          id,
          tenantId
        },
        data: {
          deletedAt: new Date(),
          isPublished: false
        }
      });

      logger.info('CMS page deleted (soft)', {
        component: 'cmsService',
        pageId: id
      });

      return page;
    } catch (error) {
      logger.error('Failed to delete CMS page', {
        component: 'cmsService',
        error: error.message,
        pageId: id
      });
      throw error;
    }
  }

  /**
   * Duplica pagina CMS
   * @param {string} id - Source page ID
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Duplicated page
   */
  async duplicatePage(id, tenantId, userId) {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    try {
      const source = await this.getPage(id, tenantId);

      // Genera slug unico
      let newSlug = `${source.slug}-copy`;
      let counter = 1;
      while (await prisma.cMSPage.findFirst({
        where: { slug: newSlug, tenantId, deletedAt: null }
      })) {
        newSlug = `${source.slug}-copy-${counter}`;
        counter++;
      }

      const duplicate = await prisma.cMSPage.create({
        data: {
          slug: newSlug,
          title: `${source.title} (Copy)`,
          content: source.content,
          blocks: source.blocks,
          layout: source.layout,
          seoTitle: source.seoTitle,
          seoDescription: source.seoDescription,
          tenantId,
          createdBy: userId,
          status: 'draft',
          isPublished: false
        }
      });

      logger.info('CMS page duplicated', {
        component: 'cmsService',
        sourceId: id,
        duplicateId: duplicate.id
      });

      return duplicate;
    } catch (error) {
      logger.error('Failed to duplicate CMS page', {
        component: 'cmsService',
        error: error.message,
        pageId: id
      });
      throw error;
    }
  }
}

export default new CMSService();
