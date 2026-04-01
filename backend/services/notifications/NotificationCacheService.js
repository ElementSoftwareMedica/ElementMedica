/**
 * NotificationCacheService.js
 * 
 * Cache layer per notifiche con Redis.
 * Ottimizza performance con caching intelligente per:
 * - Unread count (TTL 1 minuto)
 * - Recent notifications (TTL 5 minuti)
 * - User preferences (TTL 1 ora)
 * - Group members (TTL 30 minuti)
 * 
 * @module services/notifications/NotificationCacheService
 * @requires ioredis
 * @author Project 47 - Advanced Notification System
 * @since 2026-01-06
 */

import Redis from 'ioredis';
import logger from '../../utils/logger.js';

// Redis connection - graceful fallback if not available
let redis = null;
let isRedisAvailable = false;

/**
 * Initialize Redis connection with retry logic
 */
const initRedis = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn({ times }, 'Redis connection failed, running without cache');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 100, 2000);
        return delay;
      },
      lazyConnect: true,
      enableReadyCheck: true,
      connectTimeout: 5000
    });

    redis.on('connect', () => {
      isRedisAvailable = true;
      logger.info('NotificationCacheService: Redis connected');
    });

    redis.on('error', (err) => {
      isRedisAvailable = false;
      logger.warn({ error: err.message }, 'NotificationCacheService: Redis error, cache disabled');
    });

    redis.on('close', () => {
      isRedisAvailable = false;
    });

    // Try to connect
    redis.connect().catch(() => {
      logger.info('NotificationCacheService: Running without Redis cache');
    });

  } catch (error) {
    logger.warn({ error: error.message }, 'NotificationCacheService: Failed to initialize Redis');
    isRedisAvailable = false;
  }
};

// Initialize on module load
initRedis();

/**
 * Cache TTL configuration (in seconds)
 */
const CACHE_TTL = {
  UNREAD_COUNT: 60,           // 1 minuto - cambia frequentemente
  RECENT_NOTIFICATIONS: 300,  // 5 minuti - lista recenti
  PREFERENCES: 3600,          // 1 ora - cambia raramente
  GROUPS: 1800,               // 30 minuti - membership
  ESCALATION_STATUS: 120,     // 2 minuti - stato escalation
  ANALYTICS_OVERVIEW: 600,    // 10 minuti - dati aggregati
  PERSON_FEED: 180            // 3 minuti - feed personale
};

/**
 * Cache key prefixes
 */
const KEY_PREFIX = {
  UNREAD: 'notifications:unread',
  RECENT: 'notifications:recent',
  PREFERENCES: 'notifications:prefs',
  GROUP: 'notifications:group',
  PERSON_FEED: 'notifications:feed',
  ESCALATION: 'notifications:escalation',
  ANALYTICS: 'notifications:analytics'
};

/**
 * NotificationCacheService
 * Provides caching layer for notification operations
 */
export class NotificationCacheService {

  /**
   * Check if Redis cache is available
   * @returns {boolean} True if Redis is connected
   */
  static isAvailable() {
    return isRedisAvailable && redis !== null;
  }

  // ============================================
  // UNREAD COUNT CACHE
  // ============================================

  /**
   * Get cached unread count
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number|null>} Cached count or null if not cached
   */
  static async getUnreadCount(personId, tenantId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${KEY_PREFIX.UNREAD}:${tenantId}:${personId}`;
      const cached = await redis.get(key);

      if (cached !== null) {
        logger.debug({ personId, tenantId, count: cached }, 'Cache HIT: unread count');
        return parseInt(cached, 10);
      }

      logger.debug({ personId, tenantId }, 'Cache MISS: unread count');
      return null;
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error getting cached unread count');
      return null;
    }
  }

  /**
   * Set unread count in cache
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   * @param {number} count - Unread count
   */
  static async setUnreadCount(personId, tenantId, count) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.UNREAD}:${tenantId}:${personId}`;
      await redis.setex(key, CACHE_TTL.UNREAD_COUNT, count.toString());
      logger.debug({ personId, tenantId, count }, 'Cache SET: unread count');
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error setting cached unread count');
    }
  }

  /**
   * Increment unread count in cache
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   * @param {number} amount - Amount to increment (default 1)
   */
  static async incrementUnreadCount(personId, tenantId, amount = 1) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.UNREAD}:${tenantId}:${personId}`;
      const exists = await redis.exists(key);

      if (exists) {
        await redis.incrby(key, amount);
        logger.debug({ personId, tenantId, amount }, 'Cache INCREMENT: unread count');
      }
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error incrementing cached unread count');
    }
  }

  /**
   * Decrement unread count in cache
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   * @param {number} amount - Amount to decrement (default 1)
   */
  static async decrementUnreadCount(personId, tenantId, amount = 1) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.UNREAD}:${tenantId}:${personId}`;
      const exists = await redis.exists(key);

      if (exists) {
        await redis.decrby(key, amount);
        // Ensure count doesn't go below 0
        const newCount = await redis.get(key);
        if (parseInt(newCount, 10) < 0) {
          await redis.set(key, '0');
        }
        logger.debug({ personId, tenantId, amount }, 'Cache DECREMENT: unread count');
      }
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error decrementing cached unread count');
    }
  }

  /**
   * Invalidate unread count cache
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   */
  static async invalidateUnreadCount(personId, tenantId) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.UNREAD}:${tenantId}:${personId}`;
      await redis.del(key);
      logger.debug({ personId, tenantId }, 'Cache INVALIDATE: unread count');
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error invalidating cached unread count');
    }
  }

  // ============================================
  // RECENT NOTIFICATIONS CACHE
  // ============================================

  /**
   * Get cached recent notifications
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array|null>} Cached notifications or null
   */
  static async getRecentNotifications(personId, tenantId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${KEY_PREFIX.RECENT}:${tenantId}:${personId}`;
      const cached = await redis.get(key);

      if (cached) {
        logger.debug({ personId, tenantId }, 'Cache HIT: recent notifications');
        return JSON.parse(cached);
      }

      logger.debug({ personId, tenantId }, 'Cache MISS: recent notifications');
      return null;
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error getting cached recent notifications');
      return null;
    }
  }

  /**
   * Set recent notifications in cache
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   * @param {Array} notifications - Notifications array
   */
  static async setRecentNotifications(personId, tenantId, notifications) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.RECENT}:${tenantId}:${personId}`;
      await redis.setex(key, CACHE_TTL.RECENT_NOTIFICATIONS, JSON.stringify(notifications));
      logger.debug({ personId, tenantId, count: notifications.length }, 'Cache SET: recent notifications');
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error setting cached recent notifications');
    }
  }

  /**
   * Invalidate recent notifications cache
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   */
  static async invalidateRecentNotifications(personId, tenantId) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.RECENT}:${tenantId}:${personId}`;
      await redis.del(key);
      logger.debug({ personId, tenantId }, 'Cache INVALIDATE: recent notifications');
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error invalidating cached recent notifications');
    }
  }

  // ============================================
  // PREFERENCES CACHE
  // ============================================

  /**
   * Get cached preferences
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object|null>} Cached preferences or null
   */
  static async getPreferences(personId, tenantId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${KEY_PREFIX.PREFERENCES}:${tenantId}:${personId}`;
      const cached = await redis.get(key);

      if (cached) {
        logger.debug({ personId, tenantId }, 'Cache HIT: preferences');
        return JSON.parse(cached);
      }

      logger.debug({ personId, tenantId }, 'Cache MISS: preferences');
      return null;
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error getting cached preferences');
      return null;
    }
  }

  /**
   * Set preferences in cache
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} preferences - Preferences object
   */
  static async setPreferences(personId, tenantId, preferences) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.PREFERENCES}:${tenantId}:${personId}`;
      await redis.setex(key, CACHE_TTL.PREFERENCES, JSON.stringify(preferences));
      logger.debug({ personId, tenantId }, 'Cache SET: preferences');
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error setting cached preferences');
    }
  }

  /**
   * Invalidate preferences cache
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   */
  static async invalidatePreferences(personId, tenantId) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.PREFERENCES}:${tenantId}:${personId}`;
      await redis.del(key);
      logger.debug({ personId, tenantId }, 'Cache INVALIDATE: preferences');
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error invalidating cached preferences');
    }
  }

  // ============================================
  // GROUP MEMBERS CACHE
  // ============================================

  /**
   * Get cached group members
   * @param {string} groupId - Group ID
   * @returns {Promise<string[]|null>} Array of member IDs or null
   */
  static async getGroupMembers(groupId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${KEY_PREFIX.GROUP}:${groupId}:members`;
      const cached = await redis.smembers(key);

      if (cached && cached.length > 0) {
        logger.debug({ groupId, count: cached.length }, 'Cache HIT: group members');
        return cached;
      }

      logger.debug({ groupId }, 'Cache MISS: group members');
      return null;
    } catch (error) {
      logger.warn({ error: error.message, groupId }, 'Error getting cached group members');
      return null;
    }
  }

  /**
   * Set group members in cache
   * @param {string} groupId - Group ID
   * @param {string[]} memberIds - Array of member IDs
   */
  static async setGroupMembers(groupId, memberIds) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.GROUP}:${groupId}:members`;
      await redis.del(key);

      if (memberIds.length > 0) {
        await redis.sadd(key, ...memberIds);
        await redis.expire(key, CACHE_TTL.GROUPS);
        logger.debug({ groupId, count: memberIds.length }, 'Cache SET: group members');
      }
    } catch (error) {
      logger.warn({ error: error.message, groupId }, 'Error setting cached group members');
    }
  }

  /**
   * Invalidate group members cache
   * @param {string} groupId - Group ID
   */
  static async invalidateGroupMembers(groupId) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.GROUP}:${groupId}:members`;
      await redis.del(key);
      logger.debug({ groupId }, 'Cache INVALIDATE: group members');
    } catch (error) {
      logger.warn({ error: error.message, groupId }, 'Error invalidating cached group members');
    }
  }

  // ============================================
  // PERSON FEED CACHE (for bell dropdown)
  // ============================================

  /**
   * Get cached person notification feed
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object|null>} Cached feed data or null
   */
  static async getPersonFeed(personId, tenantId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${KEY_PREFIX.PERSON_FEED}:${tenantId}:${personId}`;
      const cached = await redis.get(key);

      if (cached) {
        logger.debug({ personId, tenantId }, 'Cache HIT: person feed');
        return JSON.parse(cached);
      }

      logger.debug({ personId, tenantId }, 'Cache MISS: person feed');
      return null;
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error getting cached person feed');
      return null;
    }
  }

  /**
   * Set person feed in cache
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} feedData - Feed data (notifications + unreadCount)
   */
  static async setPersonFeed(personId, tenantId, feedData) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.PERSON_FEED}:${tenantId}:${personId}`;
      await redis.setex(key, CACHE_TTL.PERSON_FEED, JSON.stringify(feedData));
      logger.debug({ personId, tenantId }, 'Cache SET: person feed');
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error setting cached person feed');
    }
  }

  /**
   * Invalidate person feed cache
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   */
  static async invalidatePersonFeed(personId, tenantId) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.PERSON_FEED}:${tenantId}:${personId}`;
      await redis.del(key);
      logger.debug({ personId, tenantId }, 'Cache INVALIDATE: person feed');
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error invalidating cached person feed');
    }
  }

  // ============================================
  // ANALYTICS CACHE
  // ============================================

  /**
   * Get cached analytics overview
   * @param {string} tenantId - Tenant ID
   * @param {string} dateRange - Date range key (e.g., '7d', '30d')
   * @returns {Promise<Object|null>} Cached analytics or null
   */
  static async getAnalyticsOverview(tenantId, dateRange) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${KEY_PREFIX.ANALYTICS}:${tenantId}:overview:${dateRange}`;
      const cached = await redis.get(key);

      if (cached) {
        logger.debug({ tenantId, dateRange }, 'Cache HIT: analytics overview');
        return JSON.parse(cached);
      }

      logger.debug({ tenantId, dateRange }, 'Cache MISS: analytics overview');
      return null;
    } catch (error) {
      logger.warn({ error: error.message, tenantId }, 'Error getting cached analytics');
      return null;
    }
  }

  /**
   * Set analytics overview in cache
   * @param {string} tenantId - Tenant ID
   * @param {string} dateRange - Date range key
   * @param {Object} analytics - Analytics data
   */
  static async setAnalyticsOverview(tenantId, dateRange, analytics) {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEY_PREFIX.ANALYTICS}:${tenantId}:overview:${dateRange}`;
      await redis.setex(key, CACHE_TTL.ANALYTICS_OVERVIEW, JSON.stringify(analytics));
      logger.debug({ tenantId, dateRange }, 'Cache SET: analytics overview');
    } catch (error) {
      logger.warn({ error: error.message, tenantId }, 'Error setting cached analytics');
    }
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Invalidate all cache for a user
   * @param {string} personId - Person ID
   * @param {string} tenantId - Tenant ID
   */
  static async invalidateUserCache(personId, tenantId) {
    if (!this.isAvailable()) return;

    try {
      const pattern = `notifications:*:${tenantId}:${personId}`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info({ personId, tenantId, keysDeleted: keys.length }, 'Cache INVALIDATE ALL: user cache');
      }
    } catch (error) {
      logger.warn({ error: error.message, personId }, 'Error invalidating user cache');
    }
  }

  /**
   * Invalidate all cache for a tenant
   * @param {string} tenantId - Tenant ID
   */
  static async invalidateTenantCache(tenantId) {
    if (!this.isAvailable()) return;

    try {
      const pattern = `notifications:*:${tenantId}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        // Use pipeline for bulk delete
        const pipeline = redis.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();

        logger.info({ tenantId, keysDeleted: keys.length }, 'Cache INVALIDATE ALL: tenant cache');
      }
    } catch (error) {
      logger.warn({ error: error.message, tenantId }, 'Error invalidating tenant cache');
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  static async getStats() {
    if (!this.isAvailable()) {
      return { available: false, message: 'Redis not connected' };
    }

    try {
      const info = await redis.info('memory');
      const keyCount = await redis.dbsize();

      return {
        available: true,
        connected: isRedisAvailable,
        keyCount,
        memoryInfo: info
      };
    } catch (error) {
      logger.warn({ error: error.message }, 'Error getting cache stats');
      return { available: false, error: 'Cache stats unavailable' };
    }
  }

  /**
   * Health check for Redis connection
   * @returns {Promise<boolean>} True if healthy
   */
  static async healthCheck() {
    if (!this.isAvailable()) return false;

    try {
      const pong = await redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  static async shutdown() {
    if (redis) {
      try {
        await redis.quit();
        logger.info('NotificationCacheService: Redis connection closed');
      } catch (error) {
        logger.warn({ error: error.message }, 'Error closing Redis connection');
      }
    }
  }
}

export default NotificationCacheService;
