/**
 * Database Query Optimizer Module
 * Provides query analysis, optimization suggestions, and performance improvements
 */

import { getDatabaseConfig } from '../config/database-config.js';
import { logger } from '../utils/logger.js';
import EventEmitter from 'events';

/**
 * Query Optimizer Class
 * Analyzes queries and provides optimization recommendations
 */
export class QueryOptimizer extends EventEmitter {
  constructor(environment = null) {
    super();
    
    this.environment = environment || process.env.NODE_ENV || 'development';
    this.config = getDatabaseConfig(this.environment).optimization;
    this.queryCache = new Map();
    this.optimizationRules = new Map();
    this.performanceBaseline = new Map();
    this.isEnabled = this.config?.enabled || false;
    
    this.initializeOptimizationRules();
  }

  /**
   * Initialize optimization rules
   */
  initializeOptimizationRules() {
    // Rule: Detect missing indexes
    this.optimizationRules.set('missing_indexes', {
      name: 'Missing Indexes',
      description: 'Detect queries that could benefit from indexes',
      severity: 'medium',
      check: (queryInfo) => this.checkMissingIndexes(queryInfo)
    });

    // Rule: Detect N+1 queries
    this.optimizationRules.set('n_plus_one', {
      name: 'N+1 Query Pattern',
      description: 'Detect potential N+1 query patterns',
      severity: 'high',
      check: (queryInfo) => this.checkNPlusOnePattern(queryInfo)
    });

    // Rule: Detect inefficient joins
    this.optimizationRules.set('inefficient_joins', {
      name: 'Inefficient Joins',
      description: 'Detect joins that could be optimized',
      severity: 'medium',
      check: (queryInfo) => this.checkInefficientJoins(queryInfo)
    });

    // Rule: Detect large result sets
    this.optimizationRules.set('large_result_sets', {
      name: 'Large Result Sets',
      description: 'Detect queries returning large amounts of data',
      severity: 'low',
      check: (queryInfo) => this.checkLargeResultSets(queryInfo)
    });

    // Rule: Detect unnecessary data fetching
    this.optimizationRules.set('unnecessary_data', {
      name: 'Unnecessary Data Fetching',
      description: 'Detect queries fetching more data than needed',
      severity: 'medium',
      check: (queryInfo) => this.checkUnnecessaryDataFetching(queryInfo)
    });

    // Rule: Detect inefficient sorting
    this.optimizationRules.set('inefficient_sorting', {
      name: 'Inefficient Sorting',
      description: 'Detect sorting operations that could be optimized',
      severity: 'low',
      check: (queryInfo) => this.checkInefficientSorting(queryInfo)
    });

    logger.debug('Query optimization rules initialized', {
      rulesCount: this.optimizationRules.size,
      component: 'query-optimizer'
    });
  }

  /**
   * Analyze query for optimization opportunities
   * @param {object} queryInfo - Query information
   * @returns {object} Analysis results
   */
  analyzeQuery(queryInfo) {
    if (!this.isEnabled) {
      return { enabled: false };
    }

    const analysis = {
      queryId: this.generateQueryId(queryInfo),
      timestamp: new Date().toISOString(),
      query: queryInfo.query,
      model: queryInfo.model,
      action: queryInfo.action,
      duration: queryInfo.duration,
      issues: [],
      recommendations: [],
      severity: 'none',
      optimizationScore: 100
    };

    // Run all optimization rules
    for (const [ruleId, rule] of this.optimizationRules) {
      try {
        const result = rule.check(queryInfo);
        if (result && result.hasIssue) {
          analysis.issues.push({
            rule: ruleId,
            name: rule.name,
            description: rule.description,
            severity: rule.severity,
            details: result.details,
            impact: result.impact || 'unknown'
          });

          if (result.recommendations) {
            analysis.recommendations.push(...result.recommendations);
          }
        }
      } catch (error) {
        logger.error(`Error running optimization rule ${ruleId}:`, {
          error: error.message,
          queryId: analysis.queryId,
          component: 'query-optimizer'
        });
      }
    }

    // Calculate overall severity and optimization score
    analysis.severity = this.calculateOverallSeverity(analysis.issues);
    analysis.optimizationScore = this.calculateOptimizationScore(analysis.issues, queryInfo.duration);

    // Cache analysis for future reference
    this.queryCache.set(analysis.queryId, analysis);

    // Emit analysis event
    this.emit('queryAnalyzed', analysis);

    // Log significant issues
    if (analysis.issues.length > 0) {
      logger.debug('Query optimization issues detected', {
        queryId: analysis.queryId,
        issuesCount: analysis.issues.length,
        severity: analysis.severity,
        score: analysis.optimizationScore,
        component: 'query-optimizer'
      });
    }

    return analysis;
  }

  /**
   * Check for missing indexes
   * @param {object} queryInfo - Query information
   * @returns {object|null} Issue details or null
   */
  checkMissingIndexes(queryInfo) {
    const query = queryInfo.query?.toLowerCase() || '';
    const duration = queryInfo.duration || 0;

    // Check for WHERE clauses without indexes (simplified heuristic)
    const whereMatch = query.match(/where\s+([\w.]+)\s*[=<>]/gi);
    if (whereMatch && duration > this.config.slowQueryThreshold) {
      const fields = whereMatch.map(match => {
        const fieldMatch = match.match(/where\s+([\w.]+)/i);
        return fieldMatch ? fieldMatch[1] : null;
      }).filter(Boolean);

      return {
        hasIssue: true,
        details: `Slow query with WHERE clause on fields: ${fields.join(', ')}`,
        impact: 'high',
        recommendations: [
          `Consider adding indexes on: ${fields.join(', ')}`,
          'Analyze query execution plan to confirm index usage',
          'Use EXPLAIN ANALYZE to verify performance improvement'
        ]
      };
    }

    return null;
  }

  /**
   * Check for N+1 query patterns
   * @param {object} queryInfo - Query information
   * @returns {object|null} Issue details or null
   */
  checkNPlusOnePattern(queryInfo) {
    const queryId = this.generateQueryId(queryInfo);
    const recentQueries = Array.from(this.queryCache.values())
      .filter(q => q.timestamp > new Date(Date.now() - 60000).toISOString()) // Last minute
      .filter(q => q.queryId === queryId);

    // If same query executed many times in short period
    if (recentQueries.length > 10) {
      return {
        hasIssue: true,
        details: `Query executed ${recentQueries.length} times in the last minute`,
        impact: 'high',
        recommendations: [
          'Consider using include/select to fetch related data in single query',
          'Implement data loader pattern for batching',
          'Use eager loading instead of lazy loading',
          'Consider caching frequently accessed data'
        ]
      };
    }

    return null;
  }

  /**
   * Check for inefficient joins
   * @param {object} queryInfo - Query information
   * @returns {object|null} Issue details or null
   */
  checkInefficientJoins(queryInfo) {
    const query = queryInfo.query?.toLowerCase() || '';
    const duration = queryInfo.duration || 0;

    // Check for multiple JOINs in slow queries
    const joinCount = (query.match(/\bjoin\b/g) || []).length;
    if (joinCount > 3 && duration > this.config.slowQueryThreshold) {
      return {
        hasIssue: true,
        details: `Query with ${joinCount} JOINs taking ${duration}ms`,
        impact: 'medium',
        recommendations: [
          'Consider breaking complex joins into smaller queries',
          'Ensure proper indexes exist on join columns',
          'Consider denormalization for frequently joined data',
          'Use EXPLAIN to analyze join order and costs'
        ]
      };
    }

    return null;
  }

  /**
   * Check for large result sets
   * @param {object} queryInfo - Query information
   * @returns {object|null} Issue details or null
   */
  checkLargeResultSets(queryInfo) {
    const query = queryInfo.query?.toLowerCase() || '';
    const duration = queryInfo.duration || 0;

    // Check for SELECT * or missing LIMIT in potentially large queries
    const hasSelectStar = query.includes('select *');
    const hasLimit = query.includes('limit');
    const hasWhere = query.includes('where');

    if ((hasSelectStar || (!hasLimit && !hasWhere)) && duration > this.config.slowQueryThreshold / 2) {
      return {
        hasIssue: true,
        details: 'Query potentially returning large result set',
        impact: 'medium',
        recommendations: [
          'Add LIMIT clause to restrict result size',
          'Select only needed columns instead of SELECT *',
          'Implement pagination for large datasets',
          'Add WHERE clauses to filter results'
        ]
      };
    }

    return null;
  }

  /**
   * Check for unnecessary data fetching
   * @param {object} queryInfo - Query information
   * @returns {object|null} Issue details or null
   */
  checkUnnecessaryDataFetching(queryInfo) {
    const query = queryInfo.query?.toLowerCase() || '';
    
    // Check for SELECT * in Prisma queries (simplified)
    if (query.includes('select *') || (queryInfo.action === 'findMany' && !queryInfo.select)) {
      return {
        hasIssue: true,
        details: 'Query fetching all columns when specific fields might be sufficient',
        impact: 'low',
        recommendations: [
          'Use select to fetch only required fields',
          'Consider using projection to reduce data transfer',
          'Avoid fetching large text/blob fields unless necessary'
        ]
      };
    }

    return null;
  }

  /**
   * Check for inefficient sorting
   * @param {object} queryInfo - Query information
   * @returns {object|null} Issue details or null
   */
  checkInefficientSorting(queryInfo) {
    const query = queryInfo.query?.toLowerCase() || '';
    const duration = queryInfo.duration || 0;

    // Check for ORDER BY without indexes on slow queries
    const hasOrderBy = query.includes('order by');
    if (hasOrderBy && duration > this.config.slowQueryThreshold) {
      const orderByMatch = query.match(/order by\s+([\w.,\s]+)/i);
      const sortFields = orderByMatch ? orderByMatch[1].split(',').map(f => f.trim()) : [];

      return {
        hasIssue: true,
        details: `Slow query with ORDER BY on: ${sortFields.join(', ')}`,
        impact: 'medium',
        recommendations: [
          `Consider adding composite index on sort fields: ${sortFields.join(', ')}`,
          'Limit result set before sorting when possible',
          'Consider pre-computed sorted views for frequently used sorts'
        ]
      };
    }

    return null;
  }

  /**
   * Generate unique query ID
   * @param {object} queryInfo - Query information
   * @returns {string} Query ID
   */
  generateQueryId(queryInfo) {
    const querySignature = {
      model: queryInfo.model,
      action: queryInfo.action,
      // Normalize query by removing specific values
      queryPattern: queryInfo.query?.replace(/\$\d+|'[^']*'|\d+/g, '?') || 'unknown'
    };
    
    return Buffer.from(JSON.stringify(querySignature)).toString('base64').slice(0, 16);
  }

  /**
   * Calculate overall severity
   * @param {Array} issues - List of issues
   * @returns {string} Overall severity
   */
  calculateOverallSeverity(issues) {
    if (issues.length === 0) return 'none';
    
    const severityLevels = { high: 3, medium: 2, low: 1 };
    const maxSeverity = Math.max(...issues.map(issue => severityLevels[issue.severity] || 0));
    
    return Object.keys(severityLevels).find(key => severityLevels[key] === maxSeverity) || 'none';
  }

  /**
   * Calculate optimization score
   * @param {Array} issues - List of issues
   * @param {number} duration - Query duration
   * @returns {number} Score (0-100)
   */
  calculateOptimizationScore(issues, duration) {
    let score = 100;
    
    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 30;
          break;
        case 'medium':
          score -= 15;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });
    
    // Deduct points for slow queries
    if (duration > this.config.slowQueryThreshold) {
      const slownessPenalty = Math.min(20, (duration / this.config.slowQueryThreshold - 1) * 10);
      score -= slownessPenalty;
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Get optimization suggestions for a model
   * @param {string} modelName - Model name
   * @returns {object} Optimization suggestions
   */
  getModelOptimizations(modelName) {
    const modelQueries = Array.from(this.queryCache.values())
      .filter(q => q.model === modelName)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100); // Last 100 queries

    const issues = modelQueries.flatMap(q => q.issues);
    const groupedIssues = this.groupIssuesByType(issues);
    
    const suggestions = {
      model: modelName,
      totalQueries: modelQueries.length,
      issuesFound: issues.length,
      averageScore: modelQueries.length > 0 
        ? Math.round(modelQueries.reduce((sum, q) => sum + q.optimizationScore, 0) / modelQueries.length)
        : 100,
      commonIssues: groupedIssues,
      recommendations: this.generateModelRecommendations(groupedIssues),
      timestamp: new Date().toISOString()
    };

    return suggestions;
  }

  /**
   * Group issues by type
   * @param {Array} issues - List of issues
   * @returns {object} Grouped issues
   */
  groupIssuesByType(issues) {
    const grouped = {};
    
    issues.forEach(issue => {
      if (!grouped[issue.rule]) {
        grouped[issue.rule] = {
          name: issue.name,
          count: 0,
          severity: issue.severity,
          examples: []
        };
      }
      
      grouped[issue.rule].count++;
      if (grouped[issue.rule].examples.length < 3) {
        grouped[issue.rule].examples.push(issue.details);
      }
    });
    
    return grouped;
  }

  /**
   * Generate model-specific recommendations
   * @param {object} groupedIssues - Grouped issues
   * @returns {Array} Recommendations
   */
  generateModelRecommendations(groupedIssues) {
    const recommendations = [];
    
    Object.entries(groupedIssues).forEach(([ruleId, issueData]) => {
      switch (ruleId) {
        case 'missing_indexes':
          recommendations.push({
            type: 'index',
            priority: 'high',
            description: `Add database indexes to improve query performance (${issueData.count} occurrences)`
          });
          break;
          
        case 'n_plus_one':
          recommendations.push({
            type: 'query_optimization',
            priority: 'high',
            description: `Implement eager loading to reduce N+1 queries (${issueData.count} occurrences)`
          });
          break;
          
        case 'large_result_sets':
          recommendations.push({
            type: 'pagination',
            priority: 'medium',
            description: `Implement pagination for large datasets (${issueData.count} occurrences)`
          });
          break;
          
        case 'unnecessary_data':
          recommendations.push({
            type: 'field_selection',
            priority: 'low',
            description: `Use field selection to reduce data transfer (${issueData.count} occurrences)`
          });
          break;
      }
    });
    
    return recommendations;
  }

  /**
   * Get optimization report
   * @returns {object} Comprehensive optimization report
   */
  getOptimizationReport() {
    const allQueries = Array.from(this.queryCache.values());
    const recentQueries = allQueries.filter(
      q => new Date(q.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );

    const models = [...new Set(recentQueries.map(q => q.model).filter(Boolean))];
    const modelOptimizations = models.map(model => this.getModelOptimizations(model));

    const report = {
      summary: {
        totalQueries: recentQueries.length,
        queriesWithIssues: recentQueries.filter(q => q.issues.length > 0).length,
        averageOptimizationScore: recentQueries.length > 0
          ? Math.round(recentQueries.reduce((sum, q) => sum + q.optimizationScore, 0) / recentQueries.length)
          : 100,
        slowQueries: recentQueries.filter(q => q.duration > this.config.slowQueryThreshold).length
      },
      models: modelOptimizations,
      topIssues: this.getTopIssues(recentQueries),
      recommendations: this.getGlobalRecommendations(recentQueries),
      timestamp: new Date().toISOString()
    };

    return report;
  }

  /**
   * Get top issues across all queries
   * @param {Array} queries - List of queries
   * @returns {Array} Top issues
   */
  getTopIssues(queries) {
    const allIssues = queries.flatMap(q => q.issues);
    const groupedIssues = this.groupIssuesByType(allIssues);
    
    return Object.entries(groupedIssues)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([ruleId, issueData]) => ({
        rule: ruleId,
        ...issueData
      }));
  }

  /**
   * Get global recommendations
   * @param {Array} queries - List of queries
   * @returns {Array} Global recommendations
   */
  getGlobalRecommendations(queries) {
    const recommendations = [];
    const slowQueries = queries.filter(q => q.duration > this.config.slowQueryThreshold);
    const queriesWithIssues = queries.filter(q => q.issues.length > 0);
    
    if (slowQueries.length > queries.length * 0.1) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        description: 'High percentage of slow queries detected - consider database optimization'
      });
    }
    
    if (queriesWithIssues.length > queries.length * 0.2) {
      recommendations.push({
        type: 'code_review',
        priority: 'medium',
        description: 'Many queries have optimization opportunities - consider code review'
      });
    }
    
    return recommendations;
  }

  /**
   * Clear query cache
   */
  clearCache() {
    this.queryCache.clear();
    logger.info('Query optimizer cache cleared', {
      component: 'query-optimizer'
    });
  }

  /**
   * Get optimizer status
   * @returns {object} Optimizer status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      environment: this.environment,
      cachedQueries: this.queryCache.size,
      optimizationRules: Array.from(this.optimizationRules.keys()),
      config: this.config
    };
  }
}

/**
 * Create query optimizer instance
 * @param {string} environment - Target environment
 * @returns {QueryOptimizer} Optimizer instance
 */
export const createQueryOptimizer = (environment = null) => {
  return new QueryOptimizer(environment);
};

export default {
  QueryOptimizer,
  createQueryOptimizer
};