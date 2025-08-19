/**
 * Redis Configuration and Implementation
 * Week 5 - Performance Optimization with Redis
 * 
 * This module provides Redis setup for:
 * - Session storage
 * - Query result caching
 * - Real-time features
 * - Performance monitoring
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

// Redis configuration
const redisConfig = {
  // Connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  
  // Connection pool settings
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: null,
  
  // Performance settings
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  
  // Retry strategy
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  }
};

// Cache key prefixes for organization
const CACHE_PREFIXES = {
  SESSION: 'sess:',
  QUERY: 'query:',
  USER: 'user:',
  COMPANY: 'company:',
  COURSE: 'course:',
  SCHEDULE: 'schedule:',
  EMPLOYEE: 'employee:',
  METRICS: 'metrics:',
  TEMP: 'temp:'
};

// Cache TTL settings (in seconds)
const CACHE_TTL = {
  SESSION: 24 * 60 * 60, // 24 hours
  QUERY_SHORT: 5 * 60,   // 5 minutes
  QUERY_MEDIUM: 30 * 60, // 30 minutes
  QUERY_LONG: 2 * 60 * 60, // 2 hours
  USER_DATA: 15 * 60,    // 15 minutes
  METRICS: 60,           // 1 minute
  TEMP: 10 * 60          // 10 minutes
};

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.redisEnabled = process.env.REDIS_ENABLED !== 'false';
  }
  
  // Initialize Redis connection
  async connect() {
    if (!this.redisEnabled) {
      logger.info('Redis is disabled, running without cache');
      return false;
    }
    
    try {
      this.client = new Redis(redisConfig);
      
      // Event listeners
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });
      
      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });
      
      this.client.on('error', (error) => {
        logger.error('Redis connection error', { error: error.message });
        this.isConnected = false;
      });
      
      this.client.on('end', () => {
        logger.warn('Redis connection ended');
        this.isConnected = false;
      });
      
      this.client.on('reconnecting', () => {
        this.connectionAttempts++;
        logger.info(`Redis reconnecting (attempt ${this.connectionAttempts})`);
        
        if (this.connectionAttempts > this.maxConnectionAttempts) {
          logger.error('Max Redis reconnection attempts reached');
          this.client.quit();
        }
      });
      
      // Connect to Redis
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      logger.info('Redis connection established successfully');
      
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis', { error: error.message });
      this.isConnected = false;
      return false;
    }
  }
  
  // Disconnect from Redis
  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis client disconnected');
      } catch (error) {
        logger.error('Error disconnecting Redis', { error: error.message });
      }
    }
  }
  
  // Check if Redis is available
  isAvailable() {
    return this.isConnected && this.client;
  }
  
  // Session management
  async setSession(sessionId, sessionData, ttl = CACHE_TTL.SESSION) {
    if (!this.isAvailable()) return false;
    
    try {
      const key = CACHE_PREFIXES.SESSION + sessionId;
      await this.client.setEx(key, ttl, JSON.stringify(sessionData));
      logger.debug('Session stored in Redis', { sessionId });
      return true;
    } catch (error) {
      logger.error('Failed to store session in Redis', { 
        sessionId, 
        error: error.message 
      });
      return false;
    }
  }
  
  async getSession(sessionId) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = CACHE_PREFIXES.SESSION + sessionId;
      const sessionData = await this.client.get(key);
      
      if (sessionData) {
        logger.debug('Session retrieved from Redis', { sessionId });
        return JSON.parse(sessionData);
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to retrieve session from Redis', { 
        sessionId, 
        error: error.message 
      });
      return null;
    }
  }
  
  async deleteSession(sessionId) {
    if (!this.isAvailable()) return false;
    
    try {
      const key = CACHE_PREFIXES.SESSION + sessionId;
      await this.client.del(key);
      logger.debug('Session deleted from Redis', { sessionId });
      return true;
    } catch (error) {
      logger.error('Failed to delete session from Redis', { 
        sessionId, 
        error: error.message 
      });
      return false;
    }
  }
  
  // Query result caching
  async cacheQuery(queryKey, result, ttl = CACHE_TTL.QUERY_MEDIUM) {
    if (!this.isAvailable()) return false;
    
    try {
      const key = CACHE_PREFIXES.QUERY + queryKey;
      await this.client.setEx(key, ttl, JSON.stringify(result));
      logger.debug('Query result cached', { queryKey, ttl });
      return true;
    } catch (error) {
      logger.error('Failed to cache query result', { 
        queryKey, 
        error: error.message 
      });
      return false;
    }
  }
  
  async getCachedQuery(queryKey) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = CACHE_PREFIXES.QUERY + queryKey;
      const cachedResult = await this.client.get(key);
      
      if (cachedResult) {
        logger.debug('Query result retrieved from cache', { queryKey });
        return JSON.parse(cachedResult);
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to retrieve cached query', { 
        queryKey, 
        error: error.message 
      });
      return null;
    }
  }
  
  // Cache invalidation
  async invalidateCache(pattern) {
    if (!this.isAvailable()) return false;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info('Cache invalidated', { pattern, keysDeleted: keys.length });
      }
      return true;
    } catch (error) {
      logger.error('Failed to invalidate cache', { 
        pattern, 
        error: error.message 
      });
      return false;
    }
  }
  
  // Performance metrics
  async recordMetric(metricName, value, timestamp = Date.now()) {
    if (!this.isAvailable()) return false;
    
    try {
      const key = CACHE_PREFIXES.METRICS + metricName;
      await this.client.zAdd(key, {
        score: timestamp,
        value: JSON.stringify({ value, timestamp })
      });
      
      // Keep only last 1000 entries
      await this.client.zRemRangeByRank(key, 0, -1001);
      
      return true;
    } catch (error) {
      logger.error('Failed to record metric', { 
        metricName, 
        error: error.message 
      });
      return false;
    }
  }
  
  async getMetrics(metricName, fromTime, toTime) {
    if (!this.isAvailable()) return [];
    
    try {
      const key = CACHE_PREFIXES.METRICS + metricName;
      const results = await this.client.zRangeByScore(key, fromTime, toTime);
      
      return results.map(result => JSON.parse(result));
    } catch (error) {
      logger.error('Failed to retrieve metrics', { 
        metricName, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Health check
  async healthCheck() {
    if (!this.isAvailable()) {
      return {
        status: 'unhealthy',
        message: 'Redis not connected'
      };
    }
    
    try {
      const start = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        connected: this.isConnected
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
  
  // Get Redis info
  async getInfo() {
    if (!this.isAvailable()) return null;
    
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Failed to get Redis info', { error: error.message });
      return null;
    }
  }
}

// Create singleton instance
const redisService = new RedisService();

// Cache helper functions
const cacheHelpers = {
  // Generate cache key for queries
  generateQueryKey(model, method, params) {
    const crypto = require('crypto');
    const paramsHash = crypto
      .createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
    return `${model}:${method}:${paramsHash}`;
  },
  
  // Cache wrapper for Prisma queries
  async withCache(queryKey, queryFn, ttl = CACHE_TTL.QUERY_MEDIUM) {
    // Try to get from cache first
    const cached = await redisService.getCachedQuery(queryKey);
    if (cached) {
      return cached;
    }
    
    // Execute query and cache result
    const result = await queryFn();
    await redisService.cacheQuery(queryKey, result, ttl);
    
    return result;
  },
  
  // Invalidate related caches
  async invalidateModelCache(model) {
    const pattern = CACHE_PREFIXES.QUERY + model + ':*';
    await redisService.invalidateCache(pattern);
  }
};

export {
  RedisService,
  redisService,
  cacheHelpers,
  CACHE_PREFIXES,
  CACHE_TTL,
  redisConfig
};
// Export individual helper functions for convenience
export const cacheQueryWrapper = cacheHelpers.withCache;
export const generateCacheKey = cacheHelpers.generateQueryKey;
