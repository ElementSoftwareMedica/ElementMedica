/**
 * Webhook Dispatcher
 * 
 * Listens for DomainEvents related to CMS content changes
 * and dispatches appropriate actions:
 * 1. Triggers pre-render for changed pages
 * 2. Regenerates sitemap
 * 3. Logs events for audit trail
 * 
 * Integration point between CMS publish/unpublish and the pre-render engine.
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import prerenderService from './prerenderService.js';


// Map tenantId → brand
const TENANT_TO_BRAND = {
  '3b534ec0-95ed-487f-9763-d660ecfdf45d': 'element-sicurezza',
  '55afca4f-1d59-4f5c-8285-538dcbec10da': 'element-medica',
};

/**
 * CMS Event Types
 */
const CMS_EVENTS = {
  PAGE_PUBLISHED: 'cms.page.published',
  PAGE_UNPUBLISHED: 'cms.page.unpublished',
  PAGE_UPDATED: 'cms.page.updated',
  PAGE_DELETED: 'cms.page.deleted',
  FULL_REBUILD: 'cms.site.rebuild',
};

/**
 * Create a DomainEvent record for audit trail
 * 
 * @param {Object} params
 * @param {string} params.type - Event type from CMS_EVENTS
 * @param {string} params.aggregateId - Page ID
 * @param {Object} params.payload - Event data
 * @param {string} params.tenantId - Tenant ID
 * @returns {Promise<Object>} Created DomainEvent
 */
async function createEvent({ type, aggregateId, payload, tenantId }) {
  try {
    const event = await prisma.domainEvent.create({
      data: {
        type,
        aggregateType: 'CMSPage',
        aggregateId,
        payload,
        tenantId,
        version: 1,
        processed: false,
      },
    });

    logger.info({ eventId: event.id, type, aggregateId }, 'DomainEvent created');
    return event;
  } catch (error) {
    logger.error({ type, aggregateId, error: error.message }, 'Failed to create DomainEvent');
    // Don't throw — event creation failure shouldn't block the main operation
    return null;
  }
}

/**
 * Process a CMS event and trigger appropriate actions
 * 
 * @param {Object} params
 * @param {string} params.type - Event type
 * @param {string} params.slug - Page slug
 * @param {string} params.pageId - Page ID
 * @param {string} params.tenantId - Tenant ID
 * @param {Object} [params.metadata] - Additional event data
 * @returns {Promise<Object>} Processing result
 */
async function processEvent({ type, slug, pageId, tenantId, metadata = {} }) {
  const brand = TENANT_TO_BRAND[tenantId];
  if (!brand) {
    logger.warn({ tenantId }, 'Unknown tenant for webhook dispatch');
    return { success: false, error: 'Unknown tenant' };
  }

  logger.info({ type, slug, brand, pageId }, 'Processing CMS webhook event');

  // Create audit event
  const event = await createEvent({
    type,
    aggregateId: pageId,
    payload: { slug, action: type, ...metadata },
    tenantId,
  });

  let result = { success: true, eventId: event?.id };

  try {
    switch (type) {
      case CMS_EVENTS.PAGE_PUBLISHED:
      case CMS_EVENTS.PAGE_UPDATED: {
        // Re-render the specific page
        const renderResult = await prerenderService.renderPage(slug, brand);
        result.prerender = renderResult;

        // Mark event as processed
        if (event) {
          await prisma.domainEvent.update({
            where: { id: event.id },
            data: { processed: true, processedAt: new Date() },
          });
        }
        break;
      }

      case CMS_EVENTS.PAGE_UNPUBLISHED:
      case CMS_EVENTS.PAGE_DELETED: {
        // Remove pre-rendered file
        await prerenderService.deletePage(slug, brand);
        result.action = 'deleted';

        if (event) {
          await prisma.domainEvent.update({
            where: { id: event.id },
            data: { processed: true, processedAt: new Date() },
          });
        }
        break;
      }

      case CMS_EVENTS.FULL_REBUILD: {
        // Re-render all pages for the brand
        const renderResults = await prerenderService.renderAllPages(brand);
        result.prerender = renderResults;
        result.action = 'full_rebuild';

        if (event) {
          await prisma.domainEvent.update({
            where: { id: event.id },
            data: { processed: true, processedAt: new Date() },
          });
        }
        break;
      }

      default:
        logger.warn({ type }, 'Unknown CMS event type');
        result.success = false;
        result.error = `Unknown event type: ${type}`;
    }
  } catch (error) {
    logger.error({ type, slug, brand, error: error.message }, 'Webhook processing failed');
    result.success = false;
    result.error = 'Elaborazione webhook non riuscita';
  }

  return result;
}

/**
 * Dispatch a "page published" event
 * Called from cmsService.publishPage()
 */
async function onPagePublished(pageId, slug, tenantId) {
  return processEvent({
    type: CMS_EVENTS.PAGE_PUBLISHED,
    slug,
    pageId,
    tenantId,
  });
}

/**
 * Dispatch a "page unpublished" event
 * Called from cmsService.unpublishPage()
 */
async function onPageUnpublished(pageId, slug, tenantId) {
  return processEvent({
    type: CMS_EVENTS.PAGE_UNPUBLISHED,
    slug,
    pageId,
    tenantId,
  });
}

/**
 * Dispatch a "page updated" event
 * Called from cmsService.updatePage() when page is published
 */
async function onPageUpdated(pageId, slug, tenantId) {
  return processEvent({
    type: CMS_EVENTS.PAGE_UPDATED,
    slug,
    pageId,
    tenantId,
  });
}

/**
 * Dispatch a "page deleted" event
 */
async function onPageDeleted(pageId, slug, tenantId) {
  return processEvent({
    type: CMS_EVENTS.PAGE_DELETED,
    slug,
    pageId,
    tenantId,
  });
}

/**
 * Trigger full site rebuild for a brand
 */
async function triggerFullRebuild(tenantId) {
  return processEvent({
    type: CMS_EVENTS.FULL_REBUILD,
    slug: '*',
    pageId: 'all',
    tenantId,
  });
}

export default {
  onPagePublished,
  onPageUnpublished,
  onPageUpdated,
  onPageDeleted,
  triggerFullRebuild,
  processEvent,
  CMS_EVENTS,
};

export { CMS_EVENTS, TENANT_TO_BRAND };
