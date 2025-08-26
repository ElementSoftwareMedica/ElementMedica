/**
 * Redis Service - Gestione centralizzata connessione Redis
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

export class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000
    };
  }

  /**
   * Connette a Redis
   */
  async connect() {
    try {
      if (this.isConnected) {
        logger.warn('Redis already connected', { service: 'redis' });
        return;
      }

      this.client = new Redis(this.config);

      // Event handlers
      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully', {
          service: 'redis',
          host: this.config.host,
          port: this.config.port
        });
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis connection error', {
          service: 'redis',
          error: error.message
        });
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.info('Redis connection closed', { service: 'redis' });
      });

      // Test connessione
      await this.client.ping();
      
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        service: 'redis',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Disconnette da Redis
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        logger.info('Redis disconnected successfully', { service: 'redis' });
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis', {
        service: 'redis',
        error: error.message
      });
    }
  }

  /**
   * Verifica se Redis è connesso
   */
  isHealthy() {
    return this.isConnected && this.client !== null;
  }

  /**
   * Test di connettività
   */
  async ping() {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return await this.client.ping();
  }

  /**
   * Set con TTL
   */
  async setex(key, seconds, value) {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return await this.client.setex(key, seconds, value);
  }

  /**
   * Get valore
   */
  async get(key) {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return await this.client.get(key);
  }

  /**
   * Delete chiave
   */
  async del(key) {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return await this.client.del(key);
  }

  /**
   * Verifica esistenza chiave
   */
  async exists(key) {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return await this.client.exists(key);
  }
}

export default RedisService;