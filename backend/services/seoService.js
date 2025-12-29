import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * SEO Service - Gestione configurazioni SEO per pagine e corsi
 * Fase 1: SEO Foundation
 */
class SEOService {
  /**
   * Crea o aggiorna configurazione SEO per una entità
   * @param {Object} data - Dati SEO
   * @param {string} data.entityType - Tipo entità ('page' | 'course')
   * @param {string} data.entityId - ID dell'entità
   * @param {string} data.tenantId - ID tenant
   * @param {Object} seoData - Configurazione SEO
   */
  async upsertSEOConfig(data) {
    try {
      const { entityType, entityId, tenantId, ...seoData } = data;

      // Valida il tipo di entità
      if (!['page', 'course'].includes(entityType)) {
        throw new Error(`Invalid entity type: ${entityType}`);
      }

      // Verifica che l'entità esista
      if (entityType === 'page') {
        const page = await prisma.cMSPage.findUnique({
          where: { id: entityId }
        });
        if (!page) {
          throw new Error(`CMSPage with id ${entityId} not found`);
        }
      } else if (entityType === 'course') {
        const course = await prisma.course.findUnique({
          where: { id: entityId }
        });
        if (!course) {
          throw new Error(`Course with id ${entityId} not found`);
        }
      }

      // Prepara i dati per l'upsert
      const seoConfigData = {
        title: seoData.title,
        description: seoData.description,
        keywords: seoData.keywords || [],
        canonicalUrl: seoData.canonicalUrl,
        noindex: seoData.noindex || false,
        nofollow: seoData.nofollow || false,
        ogTitle: seoData.ogTitle,
        ogDescription: seoData.ogDescription,
        ogImage: seoData.ogImage,
        ogType: seoData.ogType || 'website',
        twitterCard: seoData.twitterCard || 'summary_large_image',
        twitterSite: seoData.twitterSite,
        twitterCreator: seoData.twitterCreator,
        twitterImage: seoData.twitterImage,
        structuredData: seoData.structuredData,
        hreflang: seoData.hreflang,
        preloadImages: seoData.preloadImages || [],
        tenantId
      };

      // Aggiungi la relazione specifica
      if (entityType === 'page') {
        seoConfigData.pageId = entityId;
      } else {
        seoConfigData.courseId = entityId;
      }

      // Verifica se esiste già una config SEO per questa entità
      const existingConfig = await prisma.seoConfig.findFirst({
        where: {
          OR: [
            { pageId: entityType === 'page' ? entityId : undefined },
            { courseId: entityType === 'course' ? entityId : undefined }
          ],
          tenantId
        }
      });

      let seoConfig;
      if (existingConfig) {
        // Update
        seoConfig = await prisma.seoConfig.update({
          where: { id: existingConfig.id },
          data: seoConfigData
        });
        logger.info(`SEO config updated for ${entityType}:${entityId}`);
      } else {
        // Create
        seoConfig = await prisma.seoConfig.create({
          data: seoConfigData
        });
        logger.info(`SEO config created for ${entityType}:${entityId}`);
      }

      return seoConfig;
    } catch (error) {
      logger.error('Error upserting SEO config:', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Recupera configurazione SEO per una entità
   * @param {string} entityType - Tipo entità ('page' | 'course')
   * @param {string} entityId - ID dell'entità
   * @param {string} tenantId - ID tenant
   */
  async getSEOConfig(entityType, entityId, tenantId) {
    try {
      const whereClause = {
        tenantId
      };

      if (entityType === 'page') {
        whereClause.pageId = entityId;
      } else if (entityType === 'course') {
        whereClause.courseId = entityId;
      } else {
        throw new Error(`Invalid entity type: ${entityType}`);
      }

      const seoConfig = await prisma.seoConfig.findFirst({
        where: whereClause,
        include: {
          page: entityType === 'page',
          course: entityType === 'course'
        }
      });

      return seoConfig;
    } catch (error) {
      logger.error('Error getting SEO config:', { error: error.message, entityType, entityId });
      throw error;
    }
  }

  /**
   * Elimina configurazione SEO
   * @param {string} seoConfigId - ID della config SEO
   */
  async deleteSEOConfig(seoConfigId) {
    try {
      await prisma.seoConfig.delete({
        where: { id: seoConfigId }
      });
      logger.info(`SEO config deleted: ${seoConfigId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting SEO config:', { error: error.message, seoConfigId });
      throw error;
    }
  }

  /**
   * Genera structured data JSON-LD per Organization
   * @param {Object} tenantData - Dati del tenant
   */
  generateOrganizationSchema(tenantData) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: tenantData.name,
      url: tenantData.domain || process.env.FRONTEND_URL,
      logo: tenantData.settings?.logo,
      description: tenantData.settings?.description,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: tenantData.settings?.phone,
        email: tenantData.settings?.email,
        contactType: 'customer service'
      },
      address: tenantData.settings?.address ? {
        '@type': 'PostalAddress',
        streetAddress: tenantData.settings.address.street,
        addressLocality: tenantData.settings.address.city,
        postalCode: tenantData.settings.address.postalCode,
        addressCountry: tenantData.settings.address.country || 'IT'
      } : undefined
    };
  }

  /**
   * Genera structured data JSON-LD per Course
   * @param {Object} courseData - Dati del corso
   */
  generateCourseSchema(courseData) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: courseData.title,
      description: courseData.description,
      provider: {
        '@type': 'Organization',
        name: courseData.tenant?.name
      },
      hasCourseInstance: courseData.schedules?.map(schedule => ({
        '@type': 'CourseInstance',
        courseMode: schedule.deliveryMode === 'ONLINE' ? 'online' : 'onsite',
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        location: schedule.deliveryMode === 'IN_PERSON' ? {
          '@type': 'Place',
          name: schedule.location
        } : undefined
      }))
    };
  }

  /**
   * Genera structured data JSON-LD per Breadcrumb
   * @param {Array} breadcrumbs - Array di breadcrumbs [{name, url}]
   */
  generateBreadcrumbSchema(breadcrumbs) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };
  }

  /**
   * Genera meta tags completi per una pagina
   * @param {Object} seoConfig - Configurazione SEO
   * @param {string} baseUrl - URL base del sito
   */
  generateMetaTags(seoConfig, baseUrl) {
    const tags = {
      // Basic meta tags
      title: seoConfig.title,
      meta: [
        { name: 'description', content: seoConfig.description },
        { name: 'keywords', content: seoConfig.keywords.join(', ') }
      ],
      link: []
    };

    // Canonical URL
    if (seoConfig.canonicalUrl) {
      tags.link.push({ rel: 'canonical', href: seoConfig.canonicalUrl });
    }

    // Robots
    if (seoConfig.noindex || seoConfig.nofollow) {
      const robotsValue = [
        seoConfig.noindex ? 'noindex' : 'index',
        seoConfig.nofollow ? 'nofollow' : 'follow'
      ].join(', ');
      tags.meta.push({ name: 'robots', content: robotsValue });
    }

    // Open Graph
    if (seoConfig.ogTitle) {
      tags.meta.push(
        { property: 'og:title', content: seoConfig.ogTitle },
        { property: 'og:description', content: seoConfig.ogDescription || seoConfig.description },
        { property: 'og:type', content: seoConfig.ogType },
        { property: 'og:url', content: seoConfig.canonicalUrl || baseUrl }
      );
      if (seoConfig.ogImage) {
        tags.meta.push({ property: 'og:image', content: seoConfig.ogImage });
      }
    }

    // Twitter Card
    if (seoConfig.twitterCard) {
      tags.meta.push(
        { name: 'twitter:card', content: seoConfig.twitterCard },
        { name: 'twitter:title', content: seoConfig.ogTitle || seoConfig.title },
        { name: 'twitter:description', content: seoConfig.ogDescription || seoConfig.description }
      );
      if (seoConfig.twitterSite) {
        tags.meta.push({ name: 'twitter:site', content: seoConfig.twitterSite });
      }
      if (seoConfig.twitterCreator) {
        tags.meta.push({ name: 'twitter:creator', content: seoConfig.twitterCreator });
      }
      if (seoConfig.twitterImage || seoConfig.ogImage) {
        tags.meta.push({ name: 'twitter:image', content: seoConfig.twitterImage || seoConfig.ogImage });
      }
    }

    // Hreflang
    if (seoConfig.hreflang) {
      Object.entries(seoConfig.hreflang).forEach(([lang, url]) => {
        tags.link.push({ rel: 'alternate', hreflang: lang, href: url });
      });
    }

    // Preload images
    if (seoConfig.preloadImages && seoConfig.preloadImages.length > 0) {
      seoConfig.preloadImages.forEach(imageUrl => {
        tags.link.push({ rel: 'preload', as: 'image', href: imageUrl });
      });
    }

    return tags;
  }

  /**
   * Valida configurazione SEO
   * @param {Object} seoData - Dati SEO da validare
   */
  validateSEOData(seoData) {
    const errors = [];

    // Title validation
    if (!seoData.title || seoData.title.trim() === '') {
      errors.push('Title is required');
    } else if (seoData.title.length > 60) {
      errors.push('Title should be less than 60 characters for optimal SEO');
    }

    // Description validation
    if (!seoData.description || seoData.description.trim() === '') {
      errors.push('Description is required');
    } else if (seoData.description.length > 160) {
      errors.push('Description should be less than 160 characters for optimal SEO');
    }

    // Keywords validation
    if (seoData.keywords && seoData.keywords.length > 10) {
      errors.push('Maximum 10 keywords recommended');
    }

    // Canonical URL validation
    if (seoData.canonicalUrl) {
      try {
        new URL(seoData.canonicalUrl);
      } catch (e) {
        errors.push('Canonical URL must be a valid URL');
      }
    }

    // Open Graph image validation
    if (seoData.ogImage) {
      try {
        new URL(seoData.ogImage);
      } catch (e) {
        errors.push('Open Graph image must be a valid URL');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default new SEOService();
