/**
 * API Query Optimizer Module
 * Intelligent query optimization and caching for API endpoints
 */

import { logger } from '../utils/logger.js';
import { redisClient } from '../config/redis.js';
import { createHash } from 'crypto';

/**
 * Query Optimization Strategies
 */
const OPTIMIZATION_STRATEGIES = {
  // Pagination optimization
  PAGINATION: 'pagination',
  // Field selection optimization
  FIELD_SELECTION: 'field_selection',
  // Relation loading optimization
  RELATION_LOADING: 'relation_loading',
  // Query caching
  CACHING: 'caching',
  // Index hints
  INDEX_HINTS: 'index_hints',
  // Batch loading
  BATCH_LOADING: 'batch_loading'
};

/**
 * Query Performance Analyzer
 */
export class QueryPerformanceAnalyzer {
  constructor() {
    this.queryStats = new Map();
    this.slowQueries = new Map();
    this.optimizationSuggestions = new Map();
  }
  
  /**
   * Analyze query performance
   * @param {string} queryKey - Unique query identifier
   * @param {number} executionTime - Query execution time in ms
   * @param {object} queryInfo - Query metadata
   */
  analyzeQuery(queryKey, executionTime, queryInfo = {}) {
    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastExecuted: null,
        queryInfo
      });
    }
    
    const stats = this.queryStats.get(queryKey);
    stats.count++;
    stats.totalTime += executionTime;
    stats.averageTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, executionTime);
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    stats.lastExecuted = new Date();
    
    // Track slow queries (>500ms)
    if (executionTime > 500) {
      this.slowQueries.set(queryKey, {
        ...stats,
        executionTime,
        timestamp: new Date()
      });
      
      // Generate optimization suggestions
      this.generateOptimizationSuggestions(queryKey, queryInfo, executionTime);
    }
    
    logger.debug('Query analyzed', {
      queryKey,
      executionTime,
      averageTime: stats.averageTime,
      count: stats.count,
      component: 'query-analyzer'
    });
  }
  
  /**
   * Generate optimization suggestions for slow queries
   * @param {string} queryKey - Query identifier
   * @param {object} queryInfo - Query metadata
   * @param {number} executionTime - Execution time
   */
  generateOptimizationSuggestions(queryKey, queryInfo, executionTime) {
    const suggestions = [];
    
    // Pagination suggestions
    if (queryInfo.resultCount > 100) {
      suggestions.push({
        strategy: OPTIMIZATION_STRATEGIES.PAGINATION,
        priority: 'high',
        description: 'Consider implementing pagination to reduce result set size',
        impact: 'High - Can reduce query time by 60-80%',
        implementation: 'Add limit and offset parameters to the query'
      });
    }
    
    // Field selection suggestions
    if (queryInfo.selectedFields && queryInfo.selectedFields.length > 10) {
      suggestions.push({
        strategy: OPTIMIZATION_STRATEGIES.FIELD_SELECTION,
        priority: 'medium',
        description: 'Reduce the number of selected fields to only what is needed',
        impact: 'Medium - Can reduce query time by 20-40%',
        implementation: 'Use Prisma select to specify only required fields'
      });
    }
    
    // Relation loading suggestions
    if (queryInfo.includes && queryInfo.includes.length > 3) {
      suggestions.push({
        strategy: OPTIMIZATION_STRATEGIES.RELATION_LOADING,
        priority: 'high',
        description: 'Too many relations being loaded. Consider lazy loading or separate queries',
        impact: 'High - Can reduce query time by 40-70%',
        implementation: 'Use separate queries for non-critical relations or implement lazy loading'
      });
    }
    
    // Caching suggestions
    if (queryInfo.cacheable !== false && executionTime > 200) {
      suggestions.push({
        strategy: OPTIMIZATION_STRATEGIES.CACHING,
        priority: 'medium',
        description: 'Query is cacheable and slow. Implement caching strategy',
        impact: 'High - Can reduce response time by 90%+',
        implementation: 'Add Redis caching with appropriate TTL'
      });
    }
    
    // Index hints
    if (queryInfo.whereClause && Object.keys(queryInfo.whereClause).length > 2) {
      suggestions.push({
        strategy: OPTIMIZATION_STRATEGIES.INDEX_HINTS,
        priority: 'high',
        description: 'Complex where clause detected. Ensure proper indexing',
        impact: 'High - Can reduce query time by 50-90%',
        implementation: 'Add composite indexes for frequently queried field combinations'
      });
    }
    
    this.optimizationSuggestions.set(queryKey, {
      suggestions,
      generatedAt: new Date(),
      executionTime,
      queryInfo
    });
    
    logger.warn('Slow query detected with optimization suggestions', {
      queryKey,
      executionTime,
      suggestionsCount: suggestions.length,
      component: 'query-analyzer'
    });
  }
  
  /**
   * Get optimization report
   * @returns {object} Comprehensive optimization report
   */
  getOptimizationReport() {
    const slowQueries = Array.from(this.slowQueries.entries())
      .map(([key, stats]) => ({ queryKey: key, ...stats }))
      .sort((a, b) => b.executionTime - a.executionTime);
    
    const topSuggestions = Array.from(this.optimizationSuggestions.entries())
      .map(([key, data]) => ({ queryKey: key, ...data }))
      .sort((a, b) => b.executionTime - a.executionTime);
    
    return {
      summary: {
        totalQueries: this.queryStats.size,
        slowQueries: this.slowQueries.size,
        optimizationOpportunities: this.optimizationSuggestions.size,
        averageQueryTime: this.getAverageQueryTime()
      },
      slowQueries: slowQueries.slice(0, 10),
      optimizationSuggestions: topSuggestions.slice(0, 10),
      generatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Get average query time across all queries
   * @returns {number} Average query time in ms
   */
  getAverageQueryTime() {
    if (this.queryStats.size === 0) return 0;
    
    const totalTime = Array.from(this.queryStats.values())
      .reduce((sum, stats) => sum + stats.totalTime, 0);
    
    const totalCount = Array.from(this.queryStats.values())
      .reduce((sum, stats) => sum + stats.count, 0);
    
    return totalCount > 0 ? totalTime / totalCount : 0;
  }
  
  /**
   * Reset analyzer data
   */
  reset() {
    this.queryStats.clear();
    this.slowQueries.clear();
    this.optimizationSuggestions.clear();
    
    logger.info('Query analyzer data reset', {
      component: 'query-analyzer'
    });
  }
}

/**
 * Smart Query Builder
 */
export class SmartQueryBuilder {
  constructor(prisma) {
    this.prisma = prisma;
    this.analyzer = new QueryPerformanceAnalyzer();
  }
  
  /**
   * Build optimized query based on request parameters
   * @param {string} model - Prisma model name
   * @param {object} options - Query options
   * @returns {object} Optimized query configuration
   */
  buildOptimizedQuery(model, options = {}) {
    const {
      where = {},
      select = null,
      include = null,
      orderBy = null,
      page = 1,
      limit = 10,
      search = null,
      filters = {}
    } = options;
    
    const query = {
      where: this.buildWhereClause(where, search, filters),
      ...(select && { select: this.optimizeFieldSelection(select) }),
      ...(include && { include: this.optimizeIncludes(include) }),
      ...(orderBy && { orderBy: this.optimizeOrderBy(orderBy) })
    };
    
    // Add pagination if limit is specified
    if (limit > 0) {
      query.skip = (page - 1) * limit;
      query.take = Math.min(limit, 100); // Cap at 100 items
    }
    
    return query;
  }
  
  /**
   * Build optimized where clause
   * @param {object} where - Base where clause
   * @param {string} search - Search term
   * @param {object} filters - Additional filters
   * @returns {object} Optimized where clause
   */
  buildWhereClause(where, search, filters) {
    const whereClause = { ...where };
    
    // Add search functionality
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          whereClause[key] = { in: value };
        } else if (typeof value === 'string' && value.includes(',')) {
          whereClause[key] = { in: value.split(',') };
        } else {
          whereClause[key] = value;
        }
      }
    });
    
    // Add soft delete filter
    whereClause.deletedAt = null;
    
    return whereClause;
  }
  
  /**
   * Optimize field selection
   * @param {object} select - Field selection
   * @returns {object} Optimized field selection
   */
  optimizeFieldSelection(select) {
    // Remove heavy fields by default unless explicitly requested
    const optimizedSelect = { ...select };
    
    // Always include id for consistency
    if (!optimizedSelect.id) {
      optimizedSelect.id = true;
    }
    
    return optimizedSelect;
  }
  
  /**
   * Optimize includes to prevent N+1 queries
   * @param {object} include - Include configuration
   * @returns {object} Optimized include configuration
   */
  optimizeIncludes(include) {
    const optimizedInclude = {};
    
    Object.entries(include).forEach(([key, value]) => {
      if (typeof value === 'boolean' && value) {
        // Add basic optimization for boolean includes
        optimizedInclude[key] = {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 50 // Limit related records
        };
      } else if (typeof value === 'object') {
        // Recursively optimize nested includes
        optimizedInclude[key] = {
          ...value,
          where: {
            deletedAt: null,
            ...value.where
          }
        };
      }
    });
    
    return optimizedInclude;
  }
  
  /**
   * Optimize order by clause
   * @param {object|Array} orderBy - Order by configuration
   * @returns {object|Array} Optimized order by
   */
  optimizeOrderBy(orderBy) {
    if (Array.isArray(orderBy)) {
      return orderBy.slice(0, 3); // Limit to 3 sort fields
    }
    
    return orderBy;
  }
  
  /**
   * Execute optimized query with performance tracking
   * @param {string} model - Prisma model name
   * @param {string} operation - Operation type (findMany, findUnique, etc.)
   * @param {object} query - Query configuration
   * @returns {Promise} Query result
   */
  async executeOptimizedQuery(model, operation, query) {
    const startTime = Date.now();
    const queryKey = this.generateQueryKey(model, operation, query);
    
    try {
      const result = await this.prisma[model][operation](query);
      const executionTime = Date.now() - startTime;
      
      // Analyze query performance
      this.analyzer.analyzeQuery(queryKey, executionTime, {
        model,
        operation,
        resultCount: Array.isArray(result) ? result.length : 1,
        selectedFields: query.select ? Object.keys(query.select) : null,
        includes: query.include ? Object.keys(query.include) : null,
        whereClause: query.where,
        cacheable: operation === 'findMany' || operation === 'findUnique'
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Query execution failed', {
        queryKey,
        executionTime,
        error: error.message,
        model,
        operation,
        component: 'smart-query-builder'
      });
      
      throw error;
    }
  }
  
  /**
   * Generate unique query key for caching and analysis
   * @param {string} model - Model name
   * @param {string} operation - Operation type
   * @param {object} query - Query configuration
   * @returns {string} Unique query key
   */
  generateQueryKey(model, operation, query) {
    const queryString = JSON.stringify({ model, operation, query });
    return createHash('md5').update(queryString).digest('hex');
  }
  
  /**
   * Get performance analytics
   * @returns {object} Performance analytics
   */
  getAnalytics() {
    return this.analyzer.getOptimizationReport();
  }
}

/**
 * Query Cache Manager
 */
export class QueryCacheManager {
  constructor(redisClient, defaultTTL = 300) {
    this.redis = redisClient;
    this.defaultTTL = defaultTTL;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
  
  /**
   * Get cached query result
   * @param {string} queryKey - Query cache key
   * @returns {Promise<any|null>} Cached result or null
   */
  async get(queryKey) {
    try {
      const cached = await this.redis.get(`query:${queryKey}`);
      
      if (cached) {
        this.cacheHits++;
        logger.debug('Query cache hit', {
          queryKey,
          component: 'query-cache'
        });
        return JSON.parse(cached);
      }
      
      this.cacheMisses++;
      return null;
    } catch (error) {
      logger.error('Query cache get error', {
        error: error.message,
        queryKey,
        component: 'query-cache'
      });
      return null;
    }
  }
  
  /**
   * Cache query result
   * @param {string} queryKey - Query cache key
   * @param {any} result - Query result
   * @param {number} ttl - Time to live in seconds
   */
  async set(queryKey, result, ttl = null) {
    try {
      const cacheKey = `query:${queryKey}`;
      const serialized = JSON.stringify(result);
      const cacheTTL = ttl || this.defaultTTL;
      
      await this.redis.setex(cacheKey, cacheTTL, serialized);
      
      logger.debug('Query result cached', {
        queryKey,
        ttl: cacheTTL,
        size: serialized.length,
        component: 'query-cache'
      });
    } catch (error) {
      logger.error('Query cache set error', {
        error: error.message,
        queryKey,
        component: 'query-cache'
      });
    }
  }
  
  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Cache key pattern
   */
  async invalidate(pattern) {
    try {
      const keys = await this.redis.keys(`query:${pattern}`);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        
        logger.debug('Query cache invalidated', {
          pattern,
          keysRemoved: keys.length,
          component: 'query-cache'
        });
      }
    } catch (error) {
      logger.error('Query cache invalidation error', {
        error: error.message,
        pattern,
        component: 'query-cache'
      });
    }
  }
  
  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total * 100) : 0;
    
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total,
      hitRate: parseFloat(hitRate.toFixed(2))
    };
  }
  
  /**
   * Reset cache statistics
   */
  resetStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

/**
 * Query optimization middleware
 * @param {object} options - Optimization options
 * @returns {Function} Express middleware
 */
export const queryOptimizationMiddleware = (options = {}) => {
  const {
    enableCaching = true,
    cacheTTL = 300,
    enableAnalytics = true,
    maxLimit = 100
  } = options;
  
  const cacheManager = enableCaching ? new QueryCacheManager(redisClient, cacheTTL) : null;
  const queryBuilder = new SmartQueryBuilder();
  
  return async (req, res, next) => {
    // Add query optimization utilities to request
    req.queryOptimizer = {
      buildQuery: (model, options) => queryBuilder.buildOptimizedQuery(model, options),
      executeQuery: async (model, operation, query) => {
        const queryKey = queryBuilder.generateQueryKey(model, operation, query);
        
        // Try cache first
        if (cacheManager && (operation === 'findMany' || operation === 'findUnique')) {
          const cached = await cacheManager.get(queryKey);
          if (cached) {
            return cached;
          }
        }
        
        // Execute query
        const result = await queryBuilder.executeOptimizedQuery(model, operation, query);
        
        // Cache result
        if (cacheManager && result) {
          await cacheManager.set(queryKey, result);
        }
        
        return result;
      },
      invalidateCache: (pattern) => cacheManager?.invalidate(pattern),
      getAnalytics: () => queryBuilder.getAnalytics(),
      getCacheStats: () => cacheManager?.getStats()
    };
    
    // Validate and optimize pagination parameters
    if (req.query.limit) {
      req.query.limit = Math.min(parseInt(req.query.limit) || 10, maxLimit);
    }
    
    if (req.query.page) {
      req.query.page = Math.max(parseInt(req.query.page) || 1, 1);
    }
    
    next();
  };
};

export default {
  QueryPerformanceAnalyzer,
  SmartQueryBuilder,
  QueryCacheManager,
  queryOptimizationMiddleware,
  OPTIMIZATION_STRATEGIES
};