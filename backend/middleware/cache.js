import cacheService from '../utils/cache.js';
import { logger } from '../utils/logger.js';

/**
 * Cache middleware for Express routes
 * @param {number} ttl - Time to live in seconds
 * @param {function} keyGenerator - Function to generate cache key from request
 * @param {function} shouldCache - Function to determine if response should be cached
 */
export const cacheMiddleware = (ttl = 3600, keyGenerator = null, shouldCache = null) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator ? keyGenerator(req) : generateDefaultKey(req);
    
    try {
      // Try to get cached response
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        logger.debug('Serving cached response', { 
          service: 'cache-middleware', 
          key: cacheKey,
          url: req.originalUrl 
        });
        return res.json(cachedResponse);
      }

      // Store original res.json method
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Check if we should cache this response
        const shouldCacheResponse = shouldCache ? shouldCache(req, res, data) : defaultShouldCache(req, res, data);
        
        if (shouldCacheResponse) {
          cacheService.set(cacheKey, data, ttl).catch(error => {
            logger.error('Failed to cache response', { 
              service: 'cache-middleware', 
              key: cacheKey, 
              error: error.message 
            });
          });
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error', { 
        service: 'cache-middleware', 
        key: cacheKey, 
        error: error.message 
      });
      next();
    }
  };
};

/**
 * Generate default cache key from request
 */
function generateDefaultKey(req) {
  const personId = req.person?.id || 'anonymous';
  const companyId = req.person?.companyId || 'no-company';
  const url = req.originalUrl;
  const query = JSON.stringify(req.query);
  
  return `route:${personId}:${companyId}:${url}:${query}`;
}

/**
 * Default function to determine if response should be cached
 */
function defaultShouldCache(req, res, data) {
  // Don't cache error responses
  if (res.statusCode >= 400) {
    return false;
  }
  
  // Don't cache empty responses
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return false;
  }
  
  return true;
}

/**
 * Document-specific cache middleware
 */
export const documentCacheMiddleware = (ttl = 7200) => {
  return cacheMiddleware(
    ttl,
    (req) => {
      const personId = req.person?.id || 'anonymous';
      const companyId = req.person?.companyId || 'no-company';
      const documentId = req.params.id || req.params.documentId;
      const action = req.route?.path || req.path;
      
      return `document:${documentId}:${action}:${personId}:${companyId}`;
    },
    (req, res, data) => {
      // Cache successful document responses
      return res.statusCode === 200 && data && !data.error;
    }
  );
};

/**
 * Template-specific cache middleware
 */
export const templateCacheMiddleware = (ttl = 86400) => {
  return cacheMiddleware(
    ttl,
    (req) => {
      const templateId = req.params.id || req.params.templateId;
      const action = req.route?.path || req.path;
      
      return `template:${templateId}:${action}`;
    },
    (req, res, data) => {
      // Cache successful template responses
      return res.statusCode === 200 && data && !data.error;
    }
  );
};

/**
 * Course-specific cache middleware
 */
export const courseCacheMiddleware = (ttl = 3600) => {
  return cacheMiddleware(
    ttl,
    (req) => {
      const personId = req.person?.id || 'anonymous';
      const companyId = req.person?.companyId || 'no-company';
      const courseId = req.params.id || req.params.courseId;
      const action = req.route?.path || req.path;
      
      return `course:${courseId}:${action}:${personId}:${companyId}`;
    },
    (req, res, data) => {
      // Cache successful course responses
      return res.statusCode === 200 && data && !data.error;
    }
  );
};

/**
 * Cache invalidation middleware for POST/PUT/DELETE operations
 */
export const cacheInvalidationMiddleware = (patterns = []) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Override response methods to invalidate cache after successful operations
    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            const resolvedPattern = typeof pattern === 'function' ? pattern(req) : pattern;
            await cacheService.invalidatePattern(resolvedPattern);
            logger.debug('Cache invalidated', { 
              service: 'cache-invalidation', 
              pattern: resolvedPattern,
              method: req.method,
              url: req.originalUrl 
            });
          }
        } catch (error) {
          logger.error('Cache invalidation error', { 
            service: 'cache-invalidation', 
            error: error.message 
          });
        }
      }
    };
    
    res.json = function(data) {
      invalidateCache();
      return originalJson.call(this, data);
    };
    
    res.send = function(data) {
      invalidateCache();
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Document invalidation patterns
 */
export const documentInvalidationPatterns = {
  userDocuments: (req) => `document:*:user:${req.person?.id}`,
  companyDocuments: (req) => `document:*:company:${req.person?.companyId}`,
  specificDocument: (req) => `document:${req.params.id || req.params.documentId}:*`,
  allDocuments: () => 'document:*'
};

/**
 * Course invalidation patterns
 */
export const courseInvalidationPatterns = {
  userCourses: (req) => `course:*:*:${req.person?.id}:*`,
  companyCourses: (req) => `course:*:*:*:${req.person?.companyId}`,
  specificCourse: (req) => `course:${req.params.id || req.params.courseId}:*`,
  allCourses: () => 'course:*'
};

/**
 * Template invalidation patterns
 */
export const templateInvalidationPatterns = {
  specificTemplate: (req) => `template:${req.params.id || req.params.templateId}:*`,
  allTemplates: () => 'template:*'
};