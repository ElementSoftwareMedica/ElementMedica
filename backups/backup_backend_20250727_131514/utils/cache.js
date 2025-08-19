import logger from './logger.js';
import { redisService, cacheHelpers, CACHE_TTL } from '../config/redis-config.js';

// Memory cache fallback
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  set(key, value, ttl = 3600) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set value
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      ttl
    });
    this.stats.sets++;

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl * 1000);

    this.timers.set(key, timer);
    return true;
  }

  get(key) {
    const item = this.cache.get(key);
    if (item) {
      this.stats.hits++;
      return item.value;
    }
    this.stats.misses++;
    return null;
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    const deleted = this.cache.delete(key);
    if (deleted) this.stats.deletes++;
    return deleted;
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.size()
    };
  }
}

class CacheService {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.useMemoryFallback = true;
    this.isRedisConnected = false;
    this.connectionAttempted = false;
  }

  async connect() {
    if (this.connectionAttempted) {
      return this.isRedisConnected;
    }
    
    this.connectionAttempted = true;
    
    // Check if Redis is enabled
    if (process.env.REDIS_ENABLED === 'false') {
      this.useMemoryFallback = true;
      logger.info('Redis disabled, cache service using memory fallback');
      return false;
    }
    
    try {
      const connected = await redisService.connect();
      if (connected) {
        this.isRedisConnected = true;
        this.useMemoryFallback = false;
        logger.info('Cache service using Redis backend');
      } else {
        this.useMemoryFallback = true;
        logger.warn('Cache service falling back to memory cache');
      }
      return connected;
    } catch (error) {
      logger.warn('Cache service connection failed, using memory fallback', { 
        error: error.message 
      });
      this.useMemoryFallback = true;
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.isRedisConnected) {
        await redisService.disconnect();
        this.isRedisConnected = false;
      }
      this.memoryCache.clear();
      logger.info('Cache service disconnected');
    } catch (error) {
      logger.warn('Error disconnecting cache service', { error: error.message });
    }
  }

  async get(key) {
    try {
      if (this.useMemoryFallback || !this.isRedisConnected) {
        return this.memoryCache.get(key);
      }

      // Try Redis first
      const value = await redisService.getCachedQuery(key);
      if (value !== null) {
        return value;
      }
      
      // Fallback to memory cache
      return this.memoryCache.get(key);
    } catch (error) {
      logger.warn('Cache get error, falling back to memory cache', { 
        key, 
        error: error.message 
      });
      return this.memoryCache.get(key);
    }
  }

  async set(key, value, ttl = CACHE_TTL.QUERY_MEDIUM) {
    try {
      if (this.useMemoryFallback || !this.isRedisConnected) {
        this.memoryCache.set(key, value, ttl);
        logger.debug('Value stored in memory cache', { key, ttl });
        return true;
      }

      // Try Redis first
      const success = await redisService.cacheQuery(key, value, ttl);
      if (success) {
        logger.debug('Value stored in Redis cache', { key, ttl });
        return true;
      }
      
      // Fallback to memory cache
      this.memoryCache.set(key, value, ttl);
      logger.debug('Value stored in memory cache (Redis fallback)', { key, ttl });
      return true;
    } catch (error) {
      logger.warn('Cache set error, falling back to memory cache', { 
        key, 
        error: error.message 
      });
      this.memoryCache.set(key, value, ttl);
      return true;
    }
  }

  async delete(key) {
    try {
      let deleted = false;
      
      if (!this.useMemoryFallback && this.isRedisConnected) {
        // Try Redis first
        try {
          await redisService.invalidateCache(key);
          deleted = true;
        } catch (error) {
          logger.warn('Redis delete error', { key, error: error.message });
        }
      }
      
      // Also delete from memory cache
      const memoryDeleted = this.memoryCache.delete(key);
      
      logger.debug('Key deleted from cache', { key, deleted: deleted || memoryDeleted });
      return deleted || memoryDeleted;
    } catch (error) {
      logger.warn('Cache delete error', { key, error: error.message });
      return this.memoryCache.delete(key);
    }
  }

  async clear() {
    try {
      if (!this.useMemoryFallback && this.isRedisConnected) {
        await redisService.invalidateCache('*');
      }
      this.memoryCache.clear();
      logger.info('Cache cleared');
      return true;
    } catch (error) {
      logger.warn('Cache clear error', { error: error.message });
      this.memoryCache.clear();
      return true;
    }
  }

  async exists(key) {
    try {
      if (this.useMemoryFallback || !this.isRedisConnected) {
        return this.memoryCache.cache.has(key);
      }

      const value = await redisService.getCachedQuery(key);
      return value !== null;
    } catch (error) {
      logger.warn('Cache exists error, checking memory cache', { 
        key, 
        error: error.message 
      });
      return this.memoryCache.cache.has(key);
    }
  }

  async keys(pattern = '*') {
    try {
      if (this.useMemoryFallback || !this.isRedisConnected) {
        return this.memoryCache.keys();
      }

      // For Redis, we'll use the memory cache keys as Redis keys() can be expensive
      return this.memoryCache.keys();
    } catch (error) {
      logger.warn('Cache keys error', { pattern, error: error.message });
      return this.memoryCache.keys();
    }
  }

  // Session management methods
  async setSession(sessionId, sessionData, ttl = CACHE_TTL.SESSION) {
    try {
      if (!this.useMemoryFallback && this.isRedisConnected) {
        const success = await redisService.setSession(sessionId, sessionData, ttl);
        if (success) {
          return true;
        }
      }
      
      // Fallback to memory cache
      this.memoryCache.set(`session:${sessionId}`, sessionData, ttl);
      return true;
    } catch (error) {
      logger.warn('Session set error', { sessionId, error: error.message });
      this.memoryCache.set(`session:${sessionId}`, sessionData, ttl);
      return true;
    }
  }

  async getSession(sessionId) {
    try {
      if (!this.useMemoryFallback && this.isRedisConnected) {
        const session = await redisService.getSession(sessionId);
        if (session) {
          return session;
        }
      }
      
      // Fallback to memory cache
      return this.memoryCache.get(`session:${sessionId}`);
    } catch (error) {
      logger.warn('Session get error', { sessionId, error: error.message });
      return this.memoryCache.get(`session:${sessionId}`);
    }
  }

  async deleteSession(sessionId) {
    try {
      if (!this.useMemoryFallback && this.isRedisConnected) {
        await redisService.deleteSession(sessionId);
      }
      
      return this.memoryCache.delete(`session:${sessionId}`);
    } catch (error) {
      logger.warn('Session delete error', { sessionId, error: error.message });
      return this.memoryCache.delete(`session:${sessionId}`);
    }
  }

  // Cache invalidation helpers
  async invalidateModelCache(model) {
    try {
      if (!this.useMemoryFallback && this.isRedisConnected) {
        await cacheHelpers.invalidateModelCache(model);
      }
      
      // Also clear related memory cache entries
      const keys = this.memoryCache.keys();
      const modelKeys = keys.filter(key => key.includes(model));
      modelKeys.forEach(key => this.memoryCache.delete(key));
      
      logger.info('Model cache invalidated', { model, keysCleared: modelKeys.length });
    } catch (error) {
      logger.warn('Model cache invalidation error', { model, error: error.message });
    }
  }

  // Performance monitoring
  async recordMetric(metricName, value) {
    try {
      if (!this.useMemoryFallback && this.isRedisConnected) {
        await redisService.recordMetric(metricName, value);
      }
    } catch (error) {
      logger.warn('Metric recording error', { metricName, error: error.message });
    }
  }

  async invalidatePattern(pattern) {
    try {
      if (!this.useMemoryFallback && this.isRedisConnected) {
        await redisService.invalidateCache(pattern);
      }
      
      // Also clear related memory cache entries
      const keys = this.memoryCache.keys();
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const matchingKeys = keys.filter(key => regex.test(key));
      matchingKeys.forEach(key => this.memoryCache.delete(key));
      
      logger.info('Cache pattern invalidated', { pattern, keysCleared: matchingKeys.length });
      return true;
    } catch (error) {
      logger.warn('Cache pattern invalidation error', { pattern, error: error.message });
      return false;
    }
  }

  // Document-specific cache methods
  async cacheDocument(documentId, documentData, ttl = 7200) { // 2 hours for documents
    const key = `document:${documentId}`;
    return await this.set(key, documentData, ttl);
  }

  async getCachedDocument(documentId) {
    const key = `document:${documentId}`;
    return await this.get(key);
  }

  async invalidateDocument(documentId) {
    const key = `document:${documentId}`;
    return await this.del(key);
  }

  async invalidateUserDocuments(personId) {
    const pattern = `document:*:user:${personId}`;
    return await this.invalidatePattern(pattern);
  }

  async invalidateCompanyDocuments(companyId) {
    const pattern = `document:*:company:${companyId}`;
    return await this.invalidatePattern(pattern);
  }

  // Template caching
  async cacheTemplate(templateId, templateData, ttl = 86400) { // 24 hours for templates
    const key = `template:${templateId}`;
    return await this.set(key, templateData, ttl);
  }

  async getCachedTemplate(templateId) {
    const key = `template:${templateId}`;
    return await this.get(key);
  }

  async invalidateTemplate(templateId) {
    const key = `template:${templateId}`;
    return await this.del(key);
  }

  // Course data caching
  async cacheCourseData(courseId, courseData, ttl = 3600) { // 1 hour for course data
    const key = `course:${courseId}`;
    return await this.set(key, courseData, ttl);
  }

  async getCachedCourseData(courseId) {
    const key = `course:${courseId}`;
    return await this.get(key);
  }

  async invalidateCourseData(courseId) {
    const key = `course:${courseId}`;
    return await this.del(key);
  }

  getStatus() {
    return {
      isRedisConnected: this.isRedisConnected,
      useMemoryFallback: this.useMemoryFallback,
      memoryStats: this.memoryCache.getStats(),
      connectionAttempted: this.connectionAttempted
    };
  }

  // Health check
  async healthCheck() {
    const status = {
      memory: {
        status: 'healthy',
        ...this.memoryCache.getStats()
      }
    };
    
    if (!this.useMemoryFallback && this.isRedisConnected) {
      status.redis = await redisService.healthCheck();
    } else {
      status.redis = {
        status: 'unavailable',
        message: 'Using memory fallback'
      };
    }
    
    return status;
  }
}

// Create singleton instance
const cacheService = new CacheService();

export { cacheService, CacheService, cacheHelpers };
export default cacheService;