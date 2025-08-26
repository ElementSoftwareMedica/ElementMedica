/**
 * Advanced Caching System with Redis
 * Week 5: Database and Performance Optimization
 */

import logger from '../utils/logger.js';

// Import ioredis for consistent Redis client
let Redis = null;
const redisEnabled = process.env.REDIS_ENABLED !== 'false';

if (redisEnabled) {
  try {
    Redis = (await import('ioredis')).default;
  } catch (error) {
    logger.warn('Redis module not available, running without cache', { error: error.message });
  }
} else {
  logger.info('Redis is disabled via REDIS_ENABLED=false', { component: 'cache-manager' });
}

/**
 * Advanced Redis Caching System for Week 5
 * Includes connection pooling, TTL management, and performance monitoring
 */

// Cache configuration
const cacheConfig = {
  // Redis connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  
  // Connection pool settings
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxLoadingTimeout: 5000,
  
  // Cluster settings (if using Redis Cluster)
  enableOfflineQueue: false,
  
  // Connection timeout
  connectTimeout: 10000,
  commandTimeout: 5000,
  
  // Reconnection settings
  lazyConnect: true,
  keepAlive: 30000
};

// Cache TTL settings (in seconds)
const TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400 // 24 hours
};

// Cache key prefixes
const CACHE_PREFIXES = {
  USER: 'user:',
  COURSE: 'course:',
  COMPANY: 'company:',
  EMPLOYEE: 'employee:',
  TRAINER: 'trainer:',
  SCHEDULE: 'schedule:',
  DOCUMENT: 'document:',
  TEMPLATE: 'template:',
  SESSION: 'session:',
  STATS: 'stats:',
  HEALTH: 'health:'
};

class AdvancedCacheManager {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectInterval = 5000;
    this.redisEnabled = redisEnabled && Redis !== null;
    
    this.init();
  }

  async init() {
    if (!this.redisEnabled) {
      logger.info('Redis is disabled, cache manager running without Redis', {
        component: 'cache-manager'
      });
      return;
    }
    
    try {
      this.redis = new Redis(cacheConfig);
      this.setupEventListeners();
      await this.connect();
    } catch (error) {
      logger.error('Failed to initialize cache manager', {
        error: error.message,
        component: 'cache-manager'
      });
    }
  }

  setupEventListeners() {
    this.redis.on('connect', () => {
      logger.info('Redis connection established', {
        component: 'cache-manager'
      });
      this.isConnected = true;
      this.connectionAttempts = 0;
    });

    this.redis.on('ready', () => {
      logger.info('Redis is ready to receive commands', {
        component: 'cache-manager'
      });
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', {
        error: error.message,
        component: 'cache-manager'
      });
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed', {
        component: 'cache-manager'
      });
      this.isConnected = false;
      this.attemptReconnect();
    });

    this.redis.on('reconnecting', () => {
      logger.info('Attempting to reconnect to Redis', {
        component: 'cache-manager'
      });
    });
  }

  async connect() {
    try {
      await this.redis.ping();
      this.isConnected = true;
      logger.info('Cache manager connected successfully', {
        component: 'cache-manager'
      });
    } catch (error) {
      this.isConnected = false;
      logger.warn('Failed to connect to cache, running without Redis', {
        error: error.message,
        component: 'cache-manager'
      });
      // Don't throw error, allow app to continue without cache
    }
  }

  async attemptReconnect() {
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      logger.error('Max reconnection attempts reached', {
        attempts: this.connectionAttempts,
        component: 'cache-manager'
      });
      return;
    }

    this.connectionAttempts++;
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.warn('Reconnection attempt failed', {
          attempt: this.connectionAttempts,
          error: error.message,
          component: 'cache-manager'
        });
        this.attemptReconnect();
      }
    }, this.reconnectInterval);
  }

  // Generate cache key
  generateKey(prefix, identifier, suffix = '') {
    const key = `${prefix}${identifier}${suffix ? ':' + suffix : ''}`;
    return key;
  }

  // Set cache with TTL
  async set(key, value, ttl = TTL.MEDIUM) {
    if (!this.isConnected) {
      logger.warn('Cache not available, skipping set operation', {
        key,
        component: 'cache-manager'
      });
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setex(key, ttl, serializedValue);
      
      logger.debug('Cache set successfully', {
        key,
        ttl,
        component: 'cache-manager'
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to set cache', {
        key,
        error: error.message,
        component: 'cache-manager'
      });
      return false;
    }
  }

  // Get cache
  async get(key) {
    if (!this.isConnected) {
      logger.warn('Cache not available, skipping get operation', {
        key,
        component: 'cache-manager'
      });
      return null;
    }

    try {
      const value = await this.redis.get(key);
      
      if (value === null) {
        logger.debug('Cache miss', {
          key,
          component: 'cache-manager'
        });
        return null;
      }

      const parsedValue = JSON.parse(value);
      
      logger.debug('Cache hit', {
        key,
        component: 'cache-manager'
      });
      
      return parsedValue;
    } catch (error) {
      logger.error('Failed to get cache', {
        key,
        error: error.message,
        component: 'cache-manager'
      });
      return null;
    }
  }

  // Delete cache
  async del(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.del(key);
      
      logger.debug('Cache deleted', {
        key,
        deleted: result > 0,
        component: 'cache-manager'
      });
      
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete cache', {
        key,
        error: error.message,
        component: 'cache-manager'
      });
      return false;
    }
  }

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      
      logger.debug('Cache pattern deleted', {
        pattern,
        keysDeleted: result,
        component: 'cache-manager'
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to delete cache pattern', {
        pattern,
        error: error.message,
        component: 'cache-manager'
      });
      return 0;
    }
  }

  // Cache with automatic invalidation
  async cacheWithInvalidation(key, fetchFunction, ttl = TTL.MEDIUM, invalidationKeys = []) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    try {
      // Fetch fresh data
      const freshData = await fetchFunction();
      
      // Cache the fresh data
      await this.set(key, freshData, ttl);
      
      // Set up invalidation keys
      for (const invalidationKey of invalidationKeys) {
        await this.addToInvalidationSet(invalidationKey, key);
      }
      
      return freshData;
    } catch (error) {
      logger.error('Failed to cache with invalidation', {
        key,
        error: error.message,
        component: 'cache-manager'
      });
      throw error;
    }
  }

  // Add key to invalidation set
  async addToInvalidationSet(invalidationKey, cacheKey) {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.sadd(`invalidation:${invalidationKey}`, cacheKey);
      return true;
    } catch (error) {
      logger.error('Failed to add to invalidation set', {
        invalidationKey,
        cacheKey,
        error: error.message,
        component: 'cache-manager'
      });
      return false;
    }
  }

  // Invalidate by key
  async invalidate(invalidationKey) {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const cacheKeys = await this.redis.smembers(`invalidation:${invalidationKey}`);
      
      if (cacheKeys.length === 0) {
        return 0;
      }

      // Delete all cache keys
      const deletePromises = cacheKeys.map(key => this.del(key));
      await Promise.all(deletePromises);
      
      // Clear the invalidation set
      await this.redis.del(`invalidation:${invalidationKey}`);
      
      logger.info('Cache invalidated', {
        invalidationKey,
        keysInvalidated: cacheKeys.length,
        component: 'cache-manager'
      });
      
      return cacheKeys.length;
    } catch (error) {
      logger.error('Failed to invalidate cache', {
        invalidationKey,
        error: error.message,
        component: 'cache-manager'
      });
      return 0;
    }
  }

  // Health check
  async healthCheck() {
    if (!this.isConnected) {
      return { status: 'disconnected', message: 'Redis not connected' };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        message: 'Redis connection is healthy',
        responseTime: `${responseTime}ms`
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  // Get cache statistics
  async getStats() {
    if (!this.isConnected) {
      return null;
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.isConnected,
        connectionAttempts: this.connectionAttempts
      };
    } catch (error) {
      logger.error('Failed to get cache stats', {
        error: error.message,
        component: 'cache-manager'
      });
      return null;
    }
  }

  // Flush all cache
  async flushAll() {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.flushdb();
      logger.warn('All cache flushed', {
        component: 'cache-manager'
      });
      return true;
    } catch (error) {
      logger.error('Failed to flush cache', {
        error: error.message,
        component: 'cache-manager'
      });
      return false;
    }
  }

  // Graceful shutdown
  async disconnect() {
    try {
      if (this.redis) {
        await this.redis.quit();
        logger.info('Cache manager disconnected gracefully', {
          component: 'cache-manager'
        });
      }
    } catch (error) {
      logger.error('Error disconnecting cache manager', {
        error: error.message,
        component: 'cache-manager'
      });
    }
  }
}

// Create singleton instance only if Redis is enabled
let cacheManager = null;

if (redisEnabled && Redis !== null) {
  cacheManager = new AdvancedCacheManager();
} else {
  // Create a mock cache manager when Redis is disabled
  cacheManager = {
    isConnected: false,
    redisEnabled: false,
    async get() { return null; },
    async set() { return true; },
    async del() { return true; },
    async exists() { return false; },
    async expire() { return true; },
    async flushAll() { return true; },
    async getStats() { return { hits: 0, misses: 0, keys: 0 }; },
    async disconnect() { return true; }
  };
}

// Export cache manager and utilities
export default cacheManager;
export { TTL, CACHE_PREFIXES };

// Note: Graceful shutdown is handled by the main server files
// to avoid conflicts with multiple process.on listeners