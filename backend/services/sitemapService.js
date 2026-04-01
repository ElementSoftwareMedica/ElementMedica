import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * Sitemap Service - Generazione e gestione sitemap XML
 * Fase 1: SEO Foundation
 */
class SitemapService {
  /**
   * Crea o aggiorna un entry sitemap
   * @param {Object} data - Dati sitemap
   */
  async upsertSitemapEntry(data) {
    try {
      const { url, entityType, entityId, tenantId, changefreq = 'weekly', priority = 0.5, isPublic = true } = data;

      // Verifica se esiste già
      const existingEntry = await prisma.sitemap.findFirst({
        where: {
          entityType,
          entityId,
          tenantId
        }
      });

      let sitemapEntry;
      if (existingEntry) {
        // Update
        sitemapEntry = await prisma.sitemap.update({
          where: { id: existingEntry.id },
          data: {
            url,
            changefreq,
            priority,
            isPublic,
            lastmod: new Date()
          }
        });
        logger.info(`Sitemap entry updated for ${entityType}:${entityId}`);
      } else {
        // Create
        sitemapEntry = await prisma.sitemap.create({
          data: {
            url,
            entityType,
            entityId,
            changefreq,
            priority,
            isPublic,
            lastmod: new Date(),
            tenantId
          }
        });
        logger.info(`Sitemap entry created for ${entityType}:${entityId}`);
      }

      return sitemapEntry;
    } catch (error) {
      logger.error('Error upserting sitemap entry:', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Elimina un entry sitemap
   * @param {string} entityType - Tipo entità
   * @param {string} entityId - ID entità
   * @param {string} tenantId - ID tenant
   */
  async deleteSitemapEntry(entityType, entityId, tenantId) {
    try {
      await prisma.sitemap.deleteMany({
        where: {
          entityType,
          entityId,
          tenantId
        }
      });
      logger.info(`Sitemap entry deleted for ${entityType}:${entityId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting sitemap entry:', { error: error.message });
      throw error;
    }
  }

  /**
   * Genera sitemap XML completo per un tenant
   * @param {string} tenantId - ID tenant
   * @param {string} baseUrl - URL base del sito
   */
  async generateSitemapXML(tenantId, baseUrl) {
    try {
      // Recupera tutte le entries pubbliche
      const entries = await prisma.sitemap.findMany({
        where: {
          tenantId,
          isPublic: true
        },
        orderBy: {
          priority: 'desc'
        }
      });

      // Genera XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      entries.forEach(entry => {
        xml += '  <url>\n';
        xml += `    <loc>${entry.url}</loc>\n`;
        xml += `    <lastmod>${entry.lastmod.toISOString().split('T')[0]}</lastmod>\n`;
        xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
        xml += `    <priority>${entry.priority}</priority>\n`;
        xml += '  </url>\n';
      });

      xml += '</urlset>';

      logger.info(`Sitemap XML generated for tenant ${tenantId} with ${entries.length} entries`);
      return xml;
    } catch (error) {
      logger.error('Error generating sitemap XML:', { error: error.message, tenantId });
      throw error;
    }
  }

  /**
   * Rigenera sitemap da tutte le pagine CMS pubbliche
   * @param {string} tenantId - ID tenant
   * @param {string} baseUrl - URL base del sito
   */
  async regenerateFromCMSPages(tenantId, baseUrl) {
    try {
      const pages = await prisma.cMSPage.findMany({
        where: {
          tenantId,
          isPublished: true,
          deletedAt: null
        }
      });

      const results = [];

      // Priority mapping for key SEO landing pages
      const highPrioritySlugs = new Set([
        'homepage', 'medica-homepage',
        'medicina-del-lavoro', 'medica-medicina-del-lavoro',
        'corsi', 'rspp',
        'medica-visite-specialistiche', 'servizi',
      ]);
      const lowPrioritySlugs = new Set([
        'privacy-policy', 'cookie-policy', 'termini', 'carriere',
      ]);

      for (const page of pages) {
        const url = `${baseUrl}/${page.slug}`;
        const entry = await this.upsertSitemapEntry({
          url,
          entityType: 'page',
          entityId: page.id,
          tenantId,
          changefreq: highPrioritySlugs.has(page.slug) ? 'weekly' : 'monthly',
          priority: page.slug === 'homepage' || page.slug === 'medica-homepage' ? 1.0
            : highPrioritySlugs.has(page.slug) ? 0.9
              : lowPrioritySlugs.has(page.slug) ? 0.4
                : 0.7,
        });
        results.push(entry);
      }

      logger.info(`Regenerated ${results.length} sitemap entries from CMS pages`);
      return results;
    } catch (error) {
      logger.error('Error regenerating sitemap from CMS pages:', { error: error.message });
      throw error;
    }
  }

  /**
   * Rigenera sitemap da tutti i corsi pubblici
   * @param {string} tenantId - ID tenant
   * @param {string} baseUrl - URL base del sito
   */
  async regenerateFromCourses(tenantId, baseUrl) {
    try {
      const courses = await prisma.course.findMany({
        where: {
          tenantId,
          isPublic: true,
          status: 'PUBLISHED',
          deletedAt: null
        }
      });

      const results = [];
      for (const course of courses) {
        const url = `${baseUrl}/corsi/${course.slug}`;
        const entry = await this.upsertSitemapEntry({
          url,
          entityType: 'course',
          entityId: course.id,
          tenantId,
          changefreq: 'monthly',
          priority: 0.7
        });
        results.push(entry);
      }

      logger.info(`Regenerated ${results.length} sitemap entries from courses`);
      return results;
    } catch (error) {
      logger.error('Error regenerating sitemap from Course:', { error: error.message });
      throw error;
    }
  }

  /**
   * Rigenera tutto il sitemap (pagine + corsi)
   * @param {string} tenantId - ID tenant
   * @param {string} baseUrl - URL base del sito
   */
  async regenerateFullSitemap(tenantId, baseUrl) {
    try {
      logger.info(`Starting full sitemap regeneration for tenant ${tenantId}`);

      const [pagesResults, coursesResults] = await Promise.all([
        this.regenerateFromCMSPages(tenantId, baseUrl),
        this.regenerateFromCourses(tenantId, baseUrl)
      ]);

      // Aggiungi pagine statiche pubbliche (non CMS) al sitemap
      const staticRoutes = [
        { path: '/prenota', priority: 0.9, changefreq: 'weekly' },
        { path: '/medici', priority: 0.8, changefreq: 'weekly' },
        { path: '/corsi', priority: 0.9, changefreq: 'weekly' },
        { path: '/gruppo-servizi', priority: 0.6, changefreq: 'monthly' },
      ];
      const staticResults = [];
      for (const route of staticRoutes) {
        const entry = await this.upsertSitemapEntry({
          url: `${baseUrl}${route.path}`,
          entityType: 'static',
          entityId: `static-${route.path}`,
          tenantId,
          changefreq: route.changefreq,
          priority: route.priority,
        });
        staticResults.push(entry);
      }

      // Aggiungi profili medici pubblici (medici con almeno uno slot visibile pubblicamente)
      const doctors = await prisma.person.findMany({
        where: {
          deletedAt: null,
          tenantProfiles: { some: { tenantId, deletedAt: null, isActive: true } },
          personRoles: { some: { tenantId, deletedAt: null, roleType: { in: ['MEDICO', 'MEDICO_COMPETENTE'] } } },
          slotDisponibilita: { some: { tenantId, deletedAt: null, visibilePubblico: true, data: { gte: new Date() } } },
        },
        select: { id: true },
      }).catch(() => []);
      const doctorResults = [];
      for (const doc of doctors) {
        const entry = await this.upsertSitemapEntry({
          url: `${baseUrl}/medici/${doc.id}`,
          entityType: 'doctor',
          entityId: doc.id,
          tenantId,
          changefreq: 'monthly',
          priority: 0.7,
        });
        doctorResults.push(entry);
      }

      const totalEntries = pagesResults.length + coursesResults.length + staticResults.length + doctorResults.length;
      logger.info(`Full sitemap regeneration complete: ${totalEntries} total entries`);

      return {
        success: true,
        pages: pagesResults.length,
        courses: coursesResults.length,
        static: staticResults.length,
        doctors: doctorResults.length,
        total: totalEntries,
      };
    } catch (error) {
      logger.error('Error regenerating full sitemap:', { error: error.message });
      throw error;
    }
  }

  /**
   * Genera robots.txt dinamico
   * @param {string} tenantId - ID tenant
   * @param {string} baseUrl - URL base del sito
   * @param {Object} options - Opzioni personalizzate
   */
  async generateRobotsTxt(tenantId, baseUrl, options = {}) {
    try {
      const {
        allowAll = true,
        disallowPaths = ['/admin', '/api', '/settings'],
        crawlDelay = null,
        customRules = []
      } = options;

      let robotsTxt = '';

      // User-agent: *
      robotsTxt += 'User-agent: *\n';

      if (allowAll) {
        robotsTxt += 'Allow: /\n';
      }

      // Disallow paths
      disallowPaths.forEach(path => {
        robotsTxt += `Disallow: ${path}\n`;
      });

      // Crawl delay
      if (crawlDelay) {
        robotsTxt += `Crawl-delay: ${crawlDelay}\n`;
      }

      // Custom rules
      if (customRules.length > 0) {
        robotsTxt += '\n';
        customRules.forEach(rule => {
          robotsTxt += `${rule}\n`;
        });
      }

      // Sitemap reference
      robotsTxt += `\nSitemap: ${baseUrl}/sitemap.xml\n`;

      logger.info(`Robots.txt generated for tenant ${tenantId}`);
      return robotsTxt;
    } catch (error) {
      logger.error('Error generating robots.txt:', { error: error.message });
      throw error;
    }
  }

  /**
   * Ottieni statistiche sitemap
   * @param {string} tenantId - ID tenant
   */
  async getSitemapStats(tenantId) {
    try {
      const [total, byEntityType, lastUpdate] = await Promise.all([
        prisma.sitemap.count({
          where: { tenantId, isPublic: true }
        }),
        prisma.sitemap.groupBy({
          by: ['entityType'],
          where: { tenantId, isPublic: true },
          _count: true
        }),
        prisma.sitemap.findFirst({
          where: { tenantId },
          orderBy: { lastmod: 'desc' },
          select: { lastmod: true }
        })
      ]);

      return {
        total,
        byEntityType: byEntityType.reduce((acc, item) => {
          acc[item.entityType] = item._count;
          return acc;
        }, {}),
        lastUpdate: lastUpdate?.lastmod
      };
    } catch (error) {
      logger.error('Error getting sitemap stats:', { error: error.message });
      throw error;
    }
  }
}

export default new SitemapService();
